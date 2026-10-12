// Code-driven transformation: from wherever the visitor taps, swirling sacred-geometry
// fractals spread outward. The wavefront traces the real photo in gold lines, then
// dissolves it along the fractal pattern, revealing the live illustrated scene that is
// already rendered underneath the portal.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;   // snapshot of the portal: photo + portrait
uniform vec2 uRes;        // canvas size, px
uniform vec2 uOrigin;     // tap point, px (y up)
uniform float uRadius;    // wavefront radius, px
uniform float uBand;      // width of the transforming band, px
uniform float uTime;      // seconds since tap
uniform float uFade;      // 1 -> 0 as the lingering light fades out

const float PI = 3.14159265;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

// Kaleidoscopic fold (6-fold, like the flower of life) + Kali-set iteration:
// thin glowing filaments that keep branching — the fractal.
float fractal(vec2 p, float t) {
  float a = atan(p.y, p.x);
  float r = length(p);
  float seg = PI / 3.0;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  p = vec2(cos(a), sin(a)) * r;
  float acc = 0.0;
  for (int i = 0; i < 7; i++) {
    p = abs(p) / max(dot(p, p), 1e-3) - vec2(0.86 + 0.04 * sin(t * 0.7), 0.62);
    p = rot(0.55 + 0.1 * sin(t * 0.3)) * p;
    acc += exp(-abs(length(p) - 1.0) * 9.0);
  }
  return acc / 7.0;
}

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 px = vUv * uRes;
  vec2 rel = px - uOrigin;
  float d = length(rel);
  float front = uRadius - d;                 // > 0 : the wave has passed this pixel
  float k = clamp(front / uBand, 0.0, 1.0);  // 0 at the front, 1 fully transformed

  // Swirl: pixels near and inside the wave are twisted around the tap point.
  float near = exp(-abs(front) / (uBand * 0.7));
  float twist = near * 0.55 + k * 0.35;
  vec2 srel = rot(twist * (1.0 - k * 0.5)) * rel;
  vec2 suv = (uOrigin + srel) / uRes;
  vec3 photo = texture2D(uTex, suv).rgb;

  // Gold tracing of the photo's own edges (the "illustration" coming through).
  vec2 e = 1.5 / uRes;
  float gx = luma(texture2D(uTex, suv + vec2(e.x, 0.0)).rgb) - luma(texture2D(uTex, suv - vec2(e.x, 0.0)).rgb);
  float gy = luma(texture2D(uTex, suv + vec2(0.0, e.y)).rgb) - luma(texture2D(uTex, suv - vec2(0.0, e.y)).rgb);
  float edge = smoothstep(0.04, 0.22, length(vec2(gx, gy)));

  // Fractal mandala centred on the tap, scaled with the wave and spiralling.
  float scale = 2.4 / max(uRadius * 0.55 + 120.0, 1.0);
  vec2 fp = rot(log(d + 1.0) * 1.3 - uTime * 0.9) * rel * scale;
  float fr = fractal(fp, uTime);
  float fr2 = fractal(rot(0.5) * fp * 2.3, uTime * 1.3);   // finer second octave
  float lines = smoothstep(0.07, 0.32, fr) + 0.6 * smoothstep(0.1, 0.4, fr2);

  // Sacred-geometry rings riding the wavefront.
  float rings = exp(-pow(fract(d / 46.0 - uTime * 0.6) - 0.5, 2.0) * 120.0);

  // Dissolve follows the fractal: bright filaments open first.
  // (k = 1 always ends fully transparent: 1.6 - 0.6 > 0.75)
  float threshold = k * 1.6 - fr * 0.6;
  float alpha = 1.0 - smoothstep(0.35, 0.75, threshold);
  if (front < 0.0) alpha = 1.0;

  // Light: strongest at the front, lingering inside, fading at the end.
  float atFront = exp(-pow(front / (uBand * 0.35), 2.0));
  float inside = smoothstep(0.0, uBand * 0.3, front);
  vec3 gold = vec3(1.0, 0.78, 0.38);
  vec3 white = vec3(1.0, 0.96, 0.86);
  float glow = lines * (atFront * 1.4 + inside * 0.45 * uFade)
             + rings * atFront * 0.18
             + edge * (atFront * 1.2 + inside * 0.25 * uFade);
  glow *= (front > -uBand * 0.6) ? 1.0 : 0.0;
  float core = smoothstep(0.9, 1.4, lines) * atFront;

  // Photo warms toward gold as the wave reaches it.
  vec3 warmed = mix(photo, photo * vec3(1.15, 0.98, 0.7) + 0.08, clamp(near + k, 0.0, 1.0));
  vec3 light = gold * glow + white * core * 0.8 + gold * atFront * 0.25;

  // premultiplied: photo where it remains, additive light everywhere
  gl_FragColor = vec4(warmed * alpha + light, alpha);
}`;

function snapshot(root, w, h, dpr) {
  // Flatten the portal (photo + portrait) exactly as laid out on screen.
  const c = document.createElement('canvas');
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = getComputedStyle(root).backgroundColor || '#1b0f08';
  ctx.fillRect(0, 0, w, h);
  for (const img of root.querySelectorAll('#portal-photo, #portal-portrait')) {
    if (!img.complete || !img.naturalWidth) continue;
    const r = img.getBoundingClientRect();
    ctx.drawImage(img, r.left, r.top, r.width, r.height);
  }
  return c;
}

export function fractalTransition(root, origin, { mobile, duration = 2600, linger = 800 } = {}) {
  return new Promise((resolve) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
    const canvas = document.createElement('canvas');
    canvas.id = 'portal-fx';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true });
    if (!gl) return resolve(false);

    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (err) {
      console.warn('transition: shader failed', err);
      return resolve(false);
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snapshot(root, w, h, dpr));
    for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);

    const u = (n) => gl.getUniformLocation(prog, n);
    const U = { res: u('uRes'), origin: u('uOrigin'), radius: u('uRadius'), band: u('uBand'), time: u('uTime'), fade: u('uFade') };
    const ox = origin.x * dpr;
    const oy = (h - origin.y) * dpr; // GL y is up
    const W = canvas.width, H = canvas.height;
    const maxR = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));
    const band = Math.max(W, H) * 0.32;
    gl.uniform1i(u('uTex'), 0);
    gl.uniform2f(U.res, W, H);
    gl.uniform2f(U.origin, ox, oy);
    gl.uniform1f(U.band, band);
    gl.clearColor(0, 0, 0, 0);

    const t0 = performance.now();
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const draw = (now) => {
      const el = Math.max(0, now - t0);
      const p = Math.min(1, el / duration);
      const fade = el <= duration ? 1 : Math.max(0, 1 - (el - duration) / linger);
      gl.uniform1f(U.radius, ease(p) * (maxR + band * 1.3));
      gl.uniform1f(U.time, el / 1000);
      gl.uniform1f(U.fade, fade);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return fade > 0;
    };
    const frame = (now) => (draw(now) ? requestAnimationFrame(frame) : resolve(true));

    // Draw the first frame BEFORE swapping, so the photo never blinks out.
    draw(t0);
    root.append(canvas);
    root.classList.add('is-transforming');
    requestAnimationFrame(frame);
  });
}
