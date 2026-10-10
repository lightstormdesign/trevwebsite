// Layered Sedona scene: layout (cover + smart crop) and the scroll/pointer/tilt camera.
import { CANVAS, LAYERS, BISON, ENTRY_TOP, KEEP_LEFT, SCENE_DIR } from './config.js';

const MAX_MOUSE = Math.max(...LAYERS.map((l) => l.mouse || 0));

function pictureFor(entry, alt = '') {
  // <picture> with AVIF + WebP srcsets from the manifest written by tools/process_layers.py
  const pic = document.createElement('picture');
  const set = (ext) => entry.variants.map((v) => `${SCENE_DIR}${v.file}.${ext} ${v.w}w`).join(', ');
  const avif = document.createElement('source');
  avif.type = 'image/avif';
  avif.srcset = set('avif');
  const img = document.createElement('img');
  img.alt = alt;
  img.decoding = 'async';
  img.srcset = set('webp');
  img.src = `${SCENE_DIR}${entry.variants[0].file}.webp`;
  pic.append(avif, img);
  return { pic, img, sources: [avif] };
}

function loadOptional(base) {
  // Try base.webp then base.png; resolves to a URL or null.
  return new Promise((resolve) => {
    const exts = ['webp', 'png'];
    const next = () => {
      const ext = exts.shift();
      if (!ext) return resolve(null);
      const im = new Image();
      im.onload = () => resolve(`${base}.${ext}`);
      im.onerror = next;
      im.src = `${base}.${ext}`;
    };
    next();
  });
}

export class Scene {
  constructor(root, { manifest, reducedMotion }) {
    this.root = root;
    this.reduced = reducedMotion;
    this.layers = [];
    this.layout = null;
    this.progress = 0;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 }; // smoothed -1..1
    this.t0 = performance.now();
    this.ready = this.build(manifest);
  }

  async build(manifest) {
    const loads = [];
    for (const cfg of LAYERS) {
      const el = document.createElement('div');
      el.className = `layer ${cfg.id}`;
      el.style.transformOrigin = `${cfg.origin[0] * 100}% ${cfg.origin[1] * 100}%`;
      const layer = { cfg, el, sizedImgs: [] };

      if (cfg.optional) {
        // Bison: optional asset, wrapped for breathing + glow.
        const src = await loadOptional(cfg.src);
        if (!src) continue;
        el.style.setProperty('--feet-x', `${BISON.feet[0] * 100}%`);
        el.style.setProperty('--feet-y', `${BISON.feet[1] * 100}%`);
        const breath = document.createElement('div');
        breath.className = 'breath';
        const img = new Image();
        img.src = src; img.alt = '';
        const glow = new Image();
        glow.src = src; glow.alt = ''; glow.className = 'glow';
        breath.append(img, glow);
        el.append(breath);
      } else {
        const entry = manifest[cfg.asset];
        const { pic, img, sources } = pictureFor(entry);
        layer.sizedImgs.push(img, ...sources);
        el.append(pic);
        loads.push(img.decode ? img.decode().catch(() => {}) : Promise.resolve());
      }
      this.root.append(el);
      this.layers.push(layer);
    }
    this.resize();
    await Promise.all(loads);
  }

  // Cover the viewport with the 9:16 art. Width gets a few px of headroom for the
  // pointer/tilt shift. Horizontal crop comes off the right only (sun is on the left).
  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.max((vw + MAX_MOUSE) / CANVAS.w, vh / CANVAS.h);
    const w = CANVAS.w * scale;
    const h = CANVAS.h * scale;
    const x = KEEP_LEFT ? 0 : (vw - w) / 2;
    const overflow = Math.max(0, h - vh);
    const entry = Math.min(overflow, ENTRY_TOP * h);
    // Little vertical room (phones): the push-in carries the parallax instead.
    const dollyBoost = overflow < vh * 0.15 ? 2 : 1;
    this.layout = { vw, vh, w, h, x, overflow, entry, dollyBoost };
    Object.assign(this.root.style, { width: `${w}px`, height: `${h}px`, left: `${x}px` });
    for (const l of this.layers) for (const s of l.sizedImgs) s.sizes = `${Math.ceil(w)}px`;
    this.render(performance.now());
    return this.layout;
  }

  setProgress(p) { this.progress = Math.min(1, Math.max(0, p)); }

  setPointer(x, y) { this.pointer.tx = x; this.pointer.ty = y; }

  // Camera: all layers line up exactly at the entry frame (p = 0, matches the
  // video's last frame). Scrolling pans down; near layers travel and scale more
  // than far ones, so front layers only ever cover MORE of what's behind them.
  render(now) {
    const L = this.layout;
    if (!L) return;
    const p = this.reduced ? 0 : this.progress;
    const pt = this.pointer;
    const k = this.reduced ? 1 : 0.06;
    pt.x += (pt.tx - pt.x) * k;
    pt.y += (pt.ty - pt.y) * k;
    const t = (now - this.t0) / 1000;
    const travel = (L.overflow - L.entry) * p;

    for (const { cfg, el } of this.layers) {
      const y = -L.entry - travel * cfg.depth;
      // pointer/tilt shift is always <= 0 so the left edge (sun) is never exposed
      let x = this.reduced ? 0 : -(0.5 + 0.5 * pt.x) * (cfg.mouse || 0);
      if (cfg.drift && !this.reduced) x += Math.sin(t * 0.05) * cfg.drift - cfg.drift;
      const s = 1 + cfg.dolly * L.dollyBoost * p;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    }
  }
}
