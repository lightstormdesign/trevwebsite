import { useEffect, useRef, useState } from "react";

// Replaces MagicCursor.jsx — the twisted-root wand, sparkle trail, and
// constellation trail are retired (kept in that file, just unused, in case
// they're wanted again or reused on another site later). This is the
// "basically a normal mouse, subtly glowing, a little whimsical, 90%
// professional" version: the native OS cursor stays visible (no
// `cursor: none` anywhere), and a small soft glow trails it — no shape, no
// particles, no magnetism. Desktop-with-a-real-mouse only, same
// `(hover: hover) and (pointer: fine)` gate as before.
//
// Still publishes --wand-mx/--wand-my/--wand-ndx/--wand-ndy (kept under
// their original names rather than renamed, to avoid touching every
// consumer) — SacredGeometryField's reveal, WorldDim, and StardustMist all
// read these and keep working unmodified, now lit by this plain cursor
// instead of a wand.
const EASE = 0.6;
// TREV's sun is the cursor (desktop, a real mouse): it sits exactly on the pointer (its centre is the tip), turns
// slowly, opens and brightens over anything clickable, and flares on a click. The OS cursor is hidden only once the
// sun is on screen (html.sun-cursor); text fields keep their I-beam.

const INTERACTIVE_SELECTOR = "a, button, [role='button'], input, select, textarea, label, [tabindex]:not([tabindex='-1'])";
const isInteractive = (el) => !!el.closest?.(INTERACTIVE_SELECTOR);

export const GlowCursor = () => {
  const dotRef = useRef(null);
  // Computed once, not re-checked — a device's pointer capability doesn't
  // change mid-session. Gates the *render*, not just the effect: the old
  // version returned early from the effect on touch devices (so the dot's
  // position was never set via transform) but still rendered the div with
  // its default `left:0; top:0`, leaving a small glow permanently stuck in
  // the corner of the screen on every mobile device.
  const [enabled] = useState(() => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches);

  useEffect(() => {
    if (!enabled) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const eased = { ...target };
    let hoverCheckPending = false;

    const docEl = document.documentElement;
    const onMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!docEl.classList.contains("sun-cursor")) docEl.classList.add("sun-cursor");
      dotRef.current?.classList.remove("glow-cursor--gone");
      if (!hoverCheckPending) {
        hoverCheckPending = true;
        requestAnimationFrame(() => {
          hoverCheckPending = false;
          const el = document.elementFromPoint(target.x, target.y);
          const active = el && isInteractive(el);
          dotRef.current?.classList.toggle("glow-cursor--active", !!active);
        });
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    let flareT = 0;
    const onDown = () => {
      const d = dotRef.current; if (!d) return;
      d.classList.remove("glow-cursor--flare"); void d.offsetWidth; d.classList.add("glow-cursor--flare");
      clearTimeout(flareT); flareT = setTimeout(() => d.classList.remove("glow-cursor--flare"), 600);
    };
    const onOut = (e) => { if (!e.relatedTarget) dotRef.current?.classList.add("glow-cursor--gone"); };
    window.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("mouseout", onOut);

    let rafId;
    const tick = () => {
      eased.x += (target.x - eased.x) * EASE;
      eased.y += (target.y - eased.y) * EASE;

      document.documentElement.style.setProperty("--wand-mx", `${eased.x}px`);
      document.documentElement.style.setProperty("--wand-my", `${eased.y}px`);
      document.documentElement.style.setProperty("--wand-ndx", `${(eased.x / window.innerWidth - 0.5) * 2}`);
      document.documentElement.style.setProperty("--wand-ndy", `${(eased.y / window.innerHeight - 0.5) * 2}`);

      if (dotRef.current) {   // (the sun itself sits exactly on the pointer, no lag)
        dotRef.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseout", onOut);
      clearTimeout(flareT);
      docEl.classList.remove("sun-cursor");
      document.documentElement.style.removeProperty("--wand-mx");
      document.documentElement.style.removeProperty("--wand-my");
      document.documentElement.style.removeProperty("--wand-ndx");
      document.documentElement.style.removeProperty("--wand-ndy");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={dotRef} aria-hidden className="glow-cursor glow-cursor--gone pointer-events-none fixed left-0 top-0 z-[9999]" style={{ willChange: "transform" }}>
      <span className="glow-cursor__sun"><img src="/trev-sun-cursor.webp" alt="" draggable="false" /></span>
    </div>
  );
};
