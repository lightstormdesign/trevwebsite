// Custom cursor (code-drawn gold diamond with glow + flicker), red-dust trail and
// click/tap particles: red dust, sparks, light motes. Phones get tap bursts only.

const TAU = Math.PI * 2;

export class FX {
  constructor(canvas, { customCursor, reducedMotion, mobile }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cursorOn = customCursor;
    this.reduced = reducedMotion;
    this.mobile = mobile;
    this.p = [];
    this.pos = { x: -100, y: -100, vis: false };
    this.last = null;
    this.down = 0;
    this.resize();
    if (this.cursorOn) document.documentElement.classList.add('has-custom-cursor');
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * this.dpr);
    this.canvas.height = Math.round(window.innerHeight * this.dpr);
  }

  move(x, y) {
    const prev = this.pos.vis ? { x: this.pos.x, y: this.pos.y } : null;
    this.pos = { x, y, vis: true };
    if (!this.cursorOn || this.reduced || !prev) return;
    // red-dust trail: more grains the faster the cursor moves
    const dist = Math.hypot(x - prev.x, y - prev.y);
    const n = Math.min(4, Math.floor(dist / 9));
    for (let i = 0; i < n; i++) {
      const k = Math.random();
      this.spawn('dust', prev.x + (x - prev.x) * k, prev.y + (y - prev.y) * k, 0.4);
    }
  }

  hide() { this.pos.vis = false; }

  burst(x, y) {
    if (this.reduced) return;
    this.down = 1;
    const scale = this.mobile ? 0.55 : 1;
    const count = (n) => Math.round(n * scale);
    for (let i = 0; i < count(16); i++) this.spawn('dust', x, y, 1);
    for (let i = 0; i < count(12); i++) this.spawn('spark', x, y, 1);
    for (let i = 0; i < count(7); i++) this.spawn('mote', x, y, 1);
  }

  spawn(kind, x, y, energy) {
    if (this.p.length > 400) return;
    const a = Math.random() * TAU;
    let sp, life, size, color, g;
    if (kind === 'dust') {        // red Sedona dust: heavy, settles
      sp = (0.3 + Math.random() * 1.6) * energy;
      life = 0.8 + Math.random() * 0.9;
      size = 0.8 + Math.random() * 1.8;
      color = [[178, 64, 32], [206, 92, 46], [150, 52, 30]][(Math.random() * 3) | 0];
      g = 0.035;
    } else if (kind === 'spark') { // gold sparks: fast streaks
      sp = 2.5 + Math.random() * 4.5;
      life = 0.35 + Math.random() * 0.35;
      size = 0.9 + Math.random() * 1.1;
      color = [255, 214, 120];
      g = 0.06;
    } else {                       // light motes: float upward slowly
      sp = 0.2 + Math.random() * 0.6;
      life = 1.4 + Math.random() * 1.2;
      size = 1.5 + Math.random() * 2.2;
      color = [255, 244, 210];
      g = -0.012;
    }
    this.p.push({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'dust' ? 0.4 : 0),
      life, max: life, size, color, g, seed: Math.random() * 10 });
  }

  drawCursor(ctx, t) {
    const { x, y } = this.pos;
    const flicker = 0.85 + 0.15 * Math.sin(t * 13.1) * Math.sin(t * 7.3 + 1.1) + (Math.random() - 0.5) * 0.08;
    this.down *= 0.9;
    const r = 9 * (1 + this.down * 0.5);
    // glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    glow.addColorStop(0, `rgba(255, 220, 140, ${0.55 * flicker})`);
    glow.addColorStop(0.4, `rgba(255, 170, 70, ${0.18 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
    // four-point diamond star, slowly turning
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.6) * 0.25);
    ctx.beginPath();
    const w = r * 0.32;
    ctx.moveTo(0, -r); ctx.quadraticCurveTo(w * 0.3, -w * 0.3, r * 0.62, 0);
    ctx.quadraticCurveTo(w * 0.3, w * 0.3, 0, r); ctx.quadraticCurveTo(-w * 0.3, w * 0.3, -r * 0.62, 0);
    ctx.quadraticCurveTo(-w * 0.3, -w * 0.3, 0, -r);
    ctx.fillStyle = `rgba(255, 246, 220, ${0.95 * flicker})`;
    ctx.shadowColor = 'rgba(255, 190, 90, 0.9)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(214, 150, 50, 0.9)';
    ctx.stroke();
    ctx.restore();
  }

  render(now) {
    const ctx = this.ctx;
    const idle = !this.p.length && !(this.cursorOn && this.pos.vis);
    if (idle && this.cleared) return;
    const t = now / 1000;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.cleared = idle;

    ctx.globalCompositeOperation = 'lighter';
    const f = dt * 60;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i];
      q.life -= dt;
      if (q.life <= 0) { this.p.splice(i, 1); continue; }
      q.vx *= 0.96 ** f; q.vy = q.vy * 0.96 ** f + q.g * f;
      if (q.kind === 'mote') q.vx += Math.sin(t * 2 + q.seed) * 0.01 * f;
      q.x += q.vx * f; q.y += q.vy * f;
      const a = Math.min(1, q.life / q.max * 1.6);
      const [r, g, b] = q.color;
      if (q.kind === 'spark') {
        ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        ctx.lineWidth = q.size;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 2.2, q.y - q.vy * 2.2); ctx.stroke();
      } else {
        if (q.kind === 'dust') ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${r},${g},${b},${q.kind === 'dust' ? a * 0.85 : a * (0.6 + 0.4 * Math.sin(t * 5 + q.seed))})`;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (this.cursorOn && this.pos.vis) this.drawCursor(ctx, t);
  }
}
