import { useEffect } from "react";

// Magnetic buttons: as the cursor nears a pill button (Join the Journey, Book TREV, Click to Enter, ...) the
// button leans a few px toward it, as if drawn in, and eases home when the cursor moves off. Mouse only, never
// with reduced motion. Uses the `translate` property, so it composes with any transform the element already has.
const SELECTOR = "a.rounded-full, button.rounded-full, .tj-enter, .tj-cta, .ab-play, [data-magnetic]";
const REACH = 70;    // px beyond the button's edge where the pull starts
const PULL = 0.28;   // share of the cursor's offset the button follows
const MAX = 12;      // px, at most

export const Magnetic = () => {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const state = new Map();   // element -> { x, y, tx, ty }
    let mx = -1e4, my = -1e4, raf = 0, list = [], listAt = 0;
    const tick = (now) => {
      raf = 0;
      if (now - listAt > 600) {
        list = Array.from(document.querySelectorAll(SELECTOR)).filter((el) => !el.closest(".print-tilt"));
        listAt = now;
      }
      let moving = false;
      for (const el of list) {
        const s = state.get(el) || { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        if (r.width < 60 || r.width > 520) { s.tx = 0; s.ty = 0; }
        else {
          const cx = r.left + r.width / 2 - s.x, cy = r.top + r.height / 2 - s.y;   // its home centre
          const dx = mx - cx, dy = my - cy;
          const ex = Math.max(0, Math.abs(dx) - r.width / 2), ey = Math.max(0, Math.abs(dy) - r.height / 2);
          const k = Math.max(0, 1 - Math.hypot(ex, ey) / REACH);
          const clamp = (v) => Math.max(-MAX, Math.min(MAX, v));
          s.tx = clamp(dx * PULL * k); s.ty = clamp(dy * PULL * k);
        }
        s.x += (s.tx - s.x) * 0.18; s.y += (s.ty - s.y) * 0.18;
        if (Math.abs(s.x) < 0.05 && Math.abs(s.y) < 0.05 && s.tx === 0 && s.ty === 0) {
          if (state.has(el)) { el.style.translate = ""; state.delete(el); }
          continue;
        }
        state.set(el, s);
        el.style.translate = `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px`;
        moving = true;
      }
      for (const el of state.keys()) if (!el.isConnected) state.delete(el);
      if (moving) raf = requestAnimationFrame(tick);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const move = (e) => { mx = e.clientX; my = e.clientY; go(); };
    const out = () => { mx = -1e4; my = -1e4; go(); };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", out);
    window.addEventListener("scroll", go, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", out);
      window.removeEventListener("scroll", go);
      cancelAnimationFrame(raf);
      for (const el of state.keys()) el.style.translate = "";
    };
  }, []);
  return null;
};

export default Magnetic;
