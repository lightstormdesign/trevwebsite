// Foreground strip (vines / rocks / flowers) rendered in WebGL so it can come alive:
// wind sway on the plant tips, glints travelling along the gold, slow-pulsing diamond
// stars, cursor-brightened gold and click/tap pulses. The gold areas come from the
// colour-picked mask written by tools/process_layers.py. Falls back to a plain <img>.
import { STRIP, SCENE_DIR } from './config.js';

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // y = 0 at the top of the strip
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uMask;
uniform float uTime;
uniform float uMotion;   // 0 = reduced motion (still frame)
uniform float uAspect;   // strip width / height
uniform vec3 uMouse;     // uv + strength
uniform vec4 uPulses[4]; // x, y, start time, active
uniform vec4 uStars[8];  // x, y, size, phase
uniform float uStarCount;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = vUv;

  // Wind: displacement strongest at plant tips (top of the strip), none on the ground.
  float tip = 1.0 - smoothstep(0.2, 0.6, uv.y);
  float gust = 0.65 + 0.35 * sin(uTime * 0.31) * sin(uTime * 0.17 + 1.3);
  float wave = sin(uTime * 1.25 + uv.x * 9.0) * 0.6 + sin(uTime * 2.05 + uv.x * 23.0 + uv.y * 7.0) * 0.4;
  uv.x += wave * tip * tip * 0.0042 * gust * uMotion;

  vec4 c = texture2D(uTex, uv);
  float gold = texture2D(uMask, uv).r;

  // Glints travelling along the vines: soft bands sweeping left to right.
  float glint = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float x0 = fract(uTime * (0.045 + fi * 0.017) + fi * 0.37) * 1.6 - 0.3;
    float d = (uv.x - x0 + (uv.y - 0.5) * 0.25) * uAspect;
    glint += exp(-d * d * 55.0);
  }
  glint *= uMotion;

  // Twinkle: sparse sparkles on the gold.
  vec2 cell = floor(uv * vec2(420.0, 150.0));
  float n = hash(cell);
  float twinkle = smoothstep(0.986, 1.0, n) * (0.5 + 0.5 * sin(uTime * 3.0 + n * 80.0)) * uMotion;

  // Diamond stars pulsing slowly.
  float star = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uStarCount) break;
    vec2 d = (uv - uStars[i].xy) * vec2(uAspect, 1.0);
    float r = uStars[i].z * 0.07;
    float beat = mix(0.6, 0.55 + 0.45 * sin(uTime * 0.8 + uStars[i].w), uMotion);
    star += exp(-dot(d, d) / (r * r)) * beat;
  }

  // Cursor brightens the gold nearby.
  vec2 dm = (uv - uMouse.xy) * vec2(uAspect, 1.0);
  float mouse = uMouse.z * exp(-dot(dm, dm) / 0.03);

  // Click / tap pulse travelling along the strip both ways.
  float pulse = 0.0;
  for (int i = 0; i < 4; i++) {
    float age = uTime - uPulses[i].z;
    if (uPulses[i].w > 0.5 && age > 0.0 && age < 2.6) {
      float dist = abs(uv.x - uPulses[i].x) * uAspect;
      float band = exp(-pow((dist - age * 1.5) * 5.0, 2.0));
      float flash = exp(-age * 6.0) * exp(-dist * dist * 8.0);
      pulse += (band + flash) * (1.0 - age / 2.6);
    }
  }

  float light = gold * (glint * 0.55 + star * 1.1 + mouse * 0.9 + pulse * 1.5 + twinkle * 0.9);
  vec3 rgb = c.rgb + vec3(1.0, 0.8, 0.45) * light;
  gl_FragColor = vec4(rgb * c.a, c.a);
}`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

export class Strip {
  constructor(canvas, fallbackImg, { manifest, reducedMotion, mobile }) {
    this.canvas = canvas;
    this.fallback = fallbackImg;
    this.reduced = reducedMotion;
    this.mobile = mobile;
    this.entry = manifest[STRIP.asset];
    this.box = { w: 0, h: 0, y: 0 };
    this.mouse = [0.5, 0.5, 0];
    this.mouseTarget = 0;
    this.pulses = new Float32Array(16);
    this.pulseIdx = 0;
    this.t0 = performance.now();
    this.ready = this.init();
  }

  pickVariant(widthPx) {
    // Smallest variant that's at least as wide as the drawn strip.
    const vs = [...this.entry.variants].sort((a, b) => a.w - b.w);
    return vs.find((v) => v.w >= widthPx) || vs[vs.length - 1];
  }

  async init() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2);
    const v = this.pickVariant(window.innerWidth * STRIP.spill * dpr);
    const suffix = v.file.slice(STRIP.asset.length); // '' or '-1280'
    const texSrc = `${SCENE_DIR}${v.file}.webp`;
    const maskSrc = `${SCENE_DIR}${STRIP.mask}${suffix}.webp`;
    this.fallback.src = texSrc;

    const gl = this.canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) { document.documentElement.classList.add('no-webgl'); return; }
    this.gl = gl;
    try {
      const [tex, mask] = await Promise.all([loadImage(texSrc), loadImage(maskSrc)]);
      this.setupGL(tex, mask);
    } catch (e) {
      console.warn('strip: WebGL setup failed, using image', e);
      this.gl = null;
      document.documentElement.classList.add('no-webgl');
    }
  }

  setupGL(texImg, maskImg) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const texture = (img, unit) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); // colour is bled into transparent px
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    texture(texImg, 0);
    texture(maskImg, 1);

    const u = (n) => gl.getUniformLocation(prog, n);
    this.u = {
      time: u('uTime'), motion: u('uMotion'), aspect: u('uAspect'), mouse: u('uMouse'),
      pulses: u('uPulses'), stars: u('uStars'), starCount: u('uStarCount'),
    };
    gl.uniform1i(u('uTex'), 0);
    gl.uniform1i(u('uMask'), 1);
    gl.uniform1f(this.u.motion, this.reduced ? 0 : 1);
    gl.uniform1f(this.u.aspect, this.entry.w / this.entry.h);
    const stars = new Float32Array(32);
    STRIP.stars.slice(0, 8).forEach(([x, y, s], i) => stars.set([x, y, s, i * 1.7], i * 4));
    gl.uniform4fv(this.u.stars, stars);
    gl.uniform1f(this.u.starCount, Math.min(8, STRIP.stars.length));
    gl.clearColor(0, 0, 0, 0);
    this.resize();
  }

  // Bottom-centre, covers the viewport width; extra spills off both sides.
  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.ceil(vw * STRIP.spill);
    const h = Math.round(w * (this.entry.h / this.entry.w));
    const wide = vw / vh > 1;
    this.box = { w, h, sink: wide ? h * STRIP.sinkWide : 0, wide };
    for (const el of [this.canvas, this.fallback]) {
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.marginLeft = `${-w / 2}px`;
    }
    if (this.gl) {
      const dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    this.stillDrawn = false;
  }

  // On wide screens the strip starts partly below the edge and rises as you descend.
  setProgress(p, overflow) {
    const { h, sink, wide } = this.box;
    const rise = wide && overflow > 0 && !this.reduced ? h * STRIP.rise : 0;
    const y = sink + rise * (1 - p);
    const tf = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    this.canvas.style.transform = tf;
    this.fallback.style.transform = tf;
  }

  toUv(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return [(clientX - r.left) / r.width, (clientY - r.top) / r.height];
  }

  pointerMove(clientX, clientY) {
    const [x, y] = this.toUv(clientX, clientY);
    this.mouse[0] = x; this.mouse[1] = y;
    this.mouseTarget = 1;
  }

  pointerLeave() { this.mouseTarget = 0; }

  pulse(clientX, clientY) {
    if (!this.gl || this.reduced) return;
    const [x, y] = this.toUv(clientX, clientY);
    const t = (performance.now() - this.t0) / 1000;
    this.pulses.set([x, y, t, 1], this.pulseIdx * 4);
    this.pulseIdx = (this.pulseIdx + 1) % 4;
  }

  render(now) {
    const gl = this.gl;
    if (!gl || !this.u) return;
    if (this.reduced && this.stillDrawn) return; // still version: draw once
    const t = (now - this.t0) / 1000;
    this.mouse[2] += (this.mouseTarget - this.mouse[2]) * 0.08;
    gl.uniform1f(this.u.time, this.reduced ? 2.0 : t);
    gl.uniform3fv(this.u.mouse, this.mouse);
    gl.uniform4fv(this.u.pulses, this.pulses);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.stillDrawn = true;
  }
}
