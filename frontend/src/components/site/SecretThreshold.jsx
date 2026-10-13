import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

// A hidden interaction on the Portal: hold the wand steady over the mandala
// symbol (baked into the portal-loop footage, roughly above the "Scroll to
// Enter" text — same left-anchor as that text, offset up) and it charges a
// ring, then unlocks a hidden reveal. Charge is tracked against
// --wand-mx/--wand-my (published every frame by MagicCursor.jsx as plain
// inline styles on <html>, read directly here rather than via
// getComputedStyle to avoid forcing a style recalc every frame), compared
// with the hotspot's own getBoundingClientRect() — valid because the
// section is `position: sticky` and fully pinned during the Portal phase,
// so viewport (client) coordinates line up with it regardless of scroll
// position. `active` gates tracking to when the Portal is actually visible
// (not mid-transition into Hero), so it can't accidentally charge while
// scrolled past it. Content below is a clearly-placeholder reveal — swap
// SECRET_CONTENT for whatever she actually wants hidden here.
const HOLD_MS = 1600;
const CAPTURE_RADIUS = 62;
const DECAY_MS = HOLD_MS * 0.6;

const SECRET_CONTENT = {
  eyebrow: "You Found the Threshold",
  title: "A verse, kept for those who linger.",
  body: "Some things aren't meant to be scrolled past — only found. This is a placeholder for whatever she wants waiting here: an unreleased verse, a private thank-you, a hidden track. Swap this copy for the real thing whenever she's ready.",
  linkTo: "/new-album",
  linkLabel: "Hear What's Coming",
};

const SecretRevealModal = ({ onClose }) => (
  <div
    className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    onClick={onClose}
    data-testid="secret-threshold-modal"
  >
    <div
      className="relative w-full max-w-md rounded-2xl border border-[var(--sm-gold)]/30 bg-black/90 p-8 text-center shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 text-white/40 transition-colors hover:text-white"
        aria-label="Close"
      >
        <X size={16} />
      </button>
      <p className="font-accent text-xs uppercase tracking-[0.25em] text-[var(--sm-gold)]">{SECRET_CONTENT.eyebrow}</p>
      <p className="font-display mt-4 text-2xl text-white">{SECRET_CONTENT.title}</p>
      <p className="font-body mt-4 text-sm font-light leading-relaxed text-white/60">{SECRET_CONTENT.body}</p>
      <Link
        to={SECRET_CONTENT.linkTo}
        onClick={onClose}
        className="font-accent mt-6 inline-block text-sm uppercase tracking-[0.2em] text-[var(--sm-gold-light)] underline decoration-[var(--sm-gold)]/50 underline-offset-4 transition-colors hover:text-white"
      >
        {SECRET_CONTENT.linkLabel}
      </Link>
    </div>
  </div>
);

export const SecretThreshold = ({ active }) => {
  const hotspotRef = useRef(null);
  const ringRef = useRef(null);
  const flashRef = useRef(null);
  const chargeRef = useRef(0);
  const unlockedRef = useRef(false);
  const [showReveal, setShowReveal] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let lastTs = performance.now();
    let rafId;
    const tick = (ts) => {
      const dt = ts - lastTs;
      lastTs = ts;

      if (active && !unlockedRef.current && hotspotRef.current) {
        const mx = parseFloat(document.documentElement.style.getPropertyValue("--wand-mx")) || -9999;
        const my = parseFloat(document.documentElement.style.getPropertyValue("--wand-my")) || -9999;
        const rect = hotspotRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(mx - cx, my - cy);

        chargeRef.current =
          dist < CAPTURE_RADIUS
            ? Math.min(1, chargeRef.current + dt / HOLD_MS)
            : Math.max(0, chargeRef.current - dt / DECAY_MS);

        if (ringRef.current) {
          ringRef.current.style.setProperty("--charge", chargeRef.current.toFixed(3));
        }

        if (chargeRef.current >= 1) {
          unlockedRef.current = true;
          setUnlocked(true);
          if (flashRef.current) {
            flashRef.current.classList.add("secret-threshold-flash--active");
          }
          setTimeout(() => setShowReveal(true), 220);
        }
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  return (
    <>
      {/* Position is measured, not guessed: canvas-scanned the portal-loop
          footage for the mandala ring's own widest horizontal row of gold
          pixels (the row least distorted by the moon above / lotus below,
          since a true circle's leftmost and rightmost points sit at its own
          vertical center) — landed at 70.2%/31.0% of the viewport at
          1271x800. The ring fades out once unlocked (it used to just sit
          there frozen at full charge forever). */}
      <div
        ref={hotspotRef}
        aria-hidden
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700"
        style={{ left: "70.2%", top: "31.0%", opacity: unlocked ? 0 : 1 }}
      >
        <div ref={ringRef} className="secret-threshold-ring" />
      </div>
      <div ref={flashRef} aria-hidden className="secret-threshold-flash pointer-events-none fixed inset-0 z-[550]" />
      {showReveal && <SecretRevealModal onClose={() => setShowReveal(false)} />}
    </>
  );
};
