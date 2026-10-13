import { useEffect, useRef } from "react";
import { makeGlowSprite } from "@/utils/glowSprite";

// A custom cursor — a twisted-root wand with a glowing, breathing tip that
// trails just slightly behind the real pointer (spring-eased, same
// rAF-chase technique used elsewhere in this codebase for the desktop
// scroll-scrub) and leaves a brief trail of drifting gold sparks as it
// moves, like it's casting light across the starfield. The tip brightens
// to a clearer white/cyan whenever it's over anything clickable, so it
// still reads as a real affordance, not just decoration. Desktop-with-a-
// real-mouse only: gated on `(hover: hover) and (pointer: fine)` so touch
// devices never even mount this. Sparks are skipped under
// prefers-reduced-motion — the wand itself still shows (it's a cursor
// replacement, not page motion), but the extra drifting-particle
// decoration is the part motion-sensitive users would want off.
const EASE = 0.78; // even snappier — was 0.55, still read as trailing
const MAX_PARTICLES = 140;
const SPARK_LIFE_MS = 750;
const MIN_SPAWN_DIST = 6; // px moved since last spawn before a new spark fires

// Wand-drawn constellation trail — recent wand positions, connected by thin
// fading lines with a small star at each vertex, same visual language as
// VirgoConstellation.jsx's edges/points. Spaced further apart than the spark
// trail (MIN_TRAIL_DIST vs MIN_SPAWN_DIST) so fast gestures read as a
// handful of distinct segments, not a solid smear.
const TRAIL_LIFE_MS = 540; // was 1800 — trail now ~30% as long, still 22px-spaced points
const MIN_TRAIL_DIST = 22;
const MAX_TRAIL_POINTS = 12; // was 24 — a 540ms life rarely holds more than this anyway
const TRAIL_OPACITY_SCALE = 0.72; // was 0.8 — another 10% down (0.8 * 0.9); sparks untouched

// Magnetic pull toward anything marked [data-magnetic] (e.g. the Tour page's
// Virgo stars) — within MAGNET_RADIUS of the raw pointer, the wand's chase
// target bends toward the nearest one, and eases in faster (MAGNET_EASE_MAX)
// the closer it gets, so approaching a star reads as a decisive snap, not a
// gentle drift. Re-scans on every frame — cheap, there are only ever a
// handful of magnetic elements on any given page.
const MAGNET_RADIUS = 110;
const MAGNET_STRENGTH = 0.75;
const MAGNET_EASE_MAX = 0.95;

// Interactive-hover detection checks DOM semantics, not computed `cursor`
// — the site-wide `cursor: none !important` this component applies (see
// .has-magic-cursor in index.css) also overrides every interactive
// element's own `cursor: pointer`, so sniffing computed cursor would
// always read "none" and this would never fire.
const INTERACTIVE_SELECTOR = "a, button, [role='button'], input, select, textarea, label, [tabindex]:not([tabindex='-1'])";
const isInteractive = (el) => !!el.closest?.(INTERACTIVE_SELECTOR);

export const MagicCursor = () => {
  const rodRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.documentElement.classList.add("has-magic-cursor");

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Pre-rendered once — see glowSprite.js for why this replaces per-shape
    // shadowBlur (the actual cause of the wand feeling laggy: up to 140
    // sparks + 24 trail points, each individually blurred, every frame).
    const goldSprite = makeGlowSprite(48, "232,207,154");
    const whiteSprite = makeGlowSprite(48, "255,255,255");

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Target = real pointer position (updated instantly on move). Eased =
    // where the wand tip actually renders, chasing target each frame.
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const eased = { ...target };
    let lastSpawn = { x: eased.x, y: eased.y };
    const particles = [];
    const trailPoints = [];
    let lastTrailPoint = { x: eased.x, y: eased.y };
    let hoverCheckPending = false;

    const onMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      // elementFromPoint is real DOM work — throttle to once per animation
      // frame rather than once per mousemove (which can fire far more
      // often than the screen repaints).
      if (!hoverCheckPending) {
        hoverCheckPending = true;
        requestAnimationFrame(() => {
          hoverCheckPending = false;
          const el = document.elementFromPoint(target.x, target.y);
          const active = el && isInteractive(el);
          rodRef.current?.classList.toggle("magic-cursor--active", !!active);
        });
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const spawnSpark = (x, y) => {
      if (reduceMotion || particles.length >= MAX_PARTICLES) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.35;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15, // slight upward drift, like rising dust
        born: performance.now(),
        size: 1 + Math.random() * 1.8,
        hue: Math.random() < 0.25 ? "255,255,255" : "232,207,154",
      });
    };

    // [data-magnetic] elements are re-scanned periodically (not every
    // frame) — a page's magnetic targets (e.g. the Tour page's 10 stars)
    // don't move on their own, only on scroll/resize, so querying the DOM
    // 60x/sec for them was pure waste. Re-queried every ~12 frames (5x/sec)
    // is still imperceptibly responsive for a snap-to-target effect.
    let magnets = document.querySelectorAll("[data-magnetic]");
    let magnetRescanCounter = 0;

    let rafId;
    const tick = () => {
      if (++magnetRescanCounter >= 12) {
        magnetRescanCounter = 0;
        magnets = document.querySelectorAll("[data-magnetic]");
      }

      // Magnetic pull: find the nearest [data-magnetic] element within
      // range of the raw pointer, and bend the effective chase target
      // toward its center — stronger, and eased in faster, the closer the
      // pointer already is.
      let effX = target.x;
      let effY = target.y;
      let ease = EASE;
      let nearest = null;
      let nearestDist = Infinity;
      for (const el of magnets) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(cx - target.x, cy - target.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = { cx, cy };
        }
      }
      if (nearest && nearestDist < MAGNET_RADIUS) {
        const pull = 1 - nearestDist / MAGNET_RADIUS;
        effX += (nearest.cx - target.x) * pull * MAGNET_STRENGTH;
        effY += (nearest.cy - target.y) * pull * MAGNET_STRENGTH;
        ease = EASE + (MAGNET_EASE_MAX - EASE) * pull;
      }

      eased.x += (effX - eased.x) * ease;
      eased.y += (effY - eased.y) * ease;

      // Published for SacredGeometryField's cursor-reveal layer — a plain
      // fixed-position mask read, not a re-render, matching the same
      // full-viewport mask technique used there (see that file's notes on
      // why this must be viewport-relative, not element-box-relative).
      document.documentElement.style.setProperty("--wand-mx", `${eased.x}px`);
      document.documentElement.style.setProperty("--wand-my", `${eased.y}px`);

      // Normalized -1..1 offset from viewport center — drives the
      // site-wide starfield parallax (.starfield::before/::after in
      // index.css), so every starfield page gets subtle cursor-depth for
      // free without each page wiring anything up itself.
      document.documentElement.style.setProperty("--wand-ndx", `${(eased.x / window.innerWidth - 0.5) * 2}`);
      document.documentElement.style.setProperty("--wand-ndy", `${(eased.y / window.innerHeight - 0.5) * 2}`);

      if (rodRef.current) {
        rodRef.current.style.transform = `translate3d(${eased.x}px, ${eased.y}px, 0)`;
      }

      const dx = eased.x - lastSpawn.x;
      const dy = eased.y - lastSpawn.y;
      if (Math.hypot(dx, dy) > MIN_SPAWN_DIST) {
        spawnSpark(eased.x, eased.y);
        lastSpawn = { x: eased.x, y: eased.y };
      }

      if (!reduceMotion) {
        const tdx = eased.x - lastTrailPoint.x;
        const tdy = eased.y - lastTrailPoint.y;
        if (Math.hypot(tdx, tdy) > MIN_TRAIL_DIST) {
          trailPoints.push({ x: eased.x, y: eased.y, born: performance.now() });
          lastTrailPoint = { x: eased.x, y: eased.y };
          if (trailPoints.length > MAX_TRAIL_POINTS) trailPoints.shift();
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();

      // Wand-drawn constellation trail — connect consecutive recent points
      // with a thin fading line plus a small star at each vertex, same
      // visual language as VirgoConstellation.jsx. Drawn before the sparks
      // so sparks (already-established, more foreground) sit on top.
      while (trailPoints.length && now - trailPoints[0].born > TRAIL_LIFE_MS) {
        trailPoints.shift();
      }
      for (let i = 0; i < trailPoints.length; i++) {
        const pt = trailPoints[i];
        const age = now - pt.born;
        const alpha = Math.max(0, 1 - age / TRAIL_LIFE_MS) * TRAIL_OPACITY_SCALE;
        if (i > 0) {
          const prev = trailPoints[i - 1];
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.strokeStyle = `rgba(232,207,154,${alpha * 0.45})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        // Glow (sprite, was shadowBlur) + a small solid core on top — the
        // core itself is a cheap plain fill (no shadow), so only the glow
        // needed the sprite swap.
        ctx.globalAlpha = alpha;
        ctx.drawImage(goldSprite, pt.x - 6, pt.y - 6, 12, 12);
        ctx.globalAlpha = alpha * 0.85;
        ctx.beginPath();
        ctx.fillStyle = "#fff";
        ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const age = now - p.born;
        if (age > SPARK_LIFE_MS) {
          particles.splice(i, 1);
          continue;
        }
        const t = age / SPARK_LIFE_MS;
        p.x += p.vx;
        p.y += p.vy;
        const alpha = 1 - t;
        const r = p.size * (1 - t * 0.4);
        const sprite = p.hue === "255,255,255" ? whiteSprite : goldSprite;
        const d = r * 6;
        ctx.globalAlpha = alpha * 0.9;
        ctx.drawImage(sprite, p.x - d / 2, p.y - d / 2, d, d);
        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
      document.documentElement.classList.remove("has-magic-cursor");
      document.documentElement.style.removeProperty("--wand-mx");
      document.documentElement.style.removeProperty("--wand-my");
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[9998]" />
      <div ref={rodRef} aria-hidden className="magic-cursor pointer-events-none fixed left-0 top-0 z-[9999]" style={{ willChange: "transform" }}>
        {/* Twisted-root branch handle — a hand-drawn, gnarled taper (not a
            straight line), running from the base up to the glowing tip at
            the wand container's own (0,0) origin. Rendered 25% larger
            (20x95, was 16x76) with the same viewBox/path coordinates — pure
            display-size scaling, no shape changes needed. Ornateness/texture
            bumped a matching amount: a third twiglet stub, three low-opacity
            wood-grain strokes following the shaft's twist, and a small knot
            — all within the original 16x76 coordinate space, so they scale
            up automatically with the rest. */}
        <svg width="20" height="95" viewBox="0 0 16 76" className="magic-cursor-rod" aria-hidden>
          <defs>
            <linearGradient id="wandWood" x1="0" y1="76" x2="0" y2="0">
              <stop offset="0%" stopColor="#3b2716" />
              <stop offset="45%" stopColor="#6b4a2c" />
              <stop offset="100%" stopColor="#8a6a3f" />
            </linearGradient>
          </defs>
          <path
            d="M8 0 C6 8,10 14,7 22 C4 28,9 34,6 42 C3 48,10 54,6 62 C3 68,9 72,5 76 L11 76 C13 70,8 64,11 58 C14 52,7 46,11 40 C14 34,6 28,11 22 C14 16,9 8,9 0 Z"
            fill="url(#wandWood)"
          />
          {/* Wood-grain texture — thin, low-opacity strokes tracing the
              shaft's twist, dark against the gradient fill. */}
          <path d="M7 9 C6 18,8 27,7 36" stroke="#2b1c10" strokeWidth="0.4" fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M10 14 C11 25,9 34,11 45" stroke="#2b1c10" strokeWidth="0.4" fill="none" strokeLinecap="round" opacity="0.4" />
          <path d="M7 51 C6 58,8 65,7 72" stroke="#2b1c10" strokeWidth="0.4" fill="none" strokeLinecap="round" opacity="0.45" />
          {/* Small knot — an organic whorl in the wood. */}
          <ellipse cx="8" cy="33" rx="1.3" ry="0.8" fill="#2b1c10" opacity="0.35" transform="rotate(20 8 33)" />
          <path d="M6 26 C2 24,-1 27,-2 24" stroke="#6b4a2c" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M9 48 C13 46,16 49,17.5 46" stroke="#8a6a3f" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M6 64 C3 66,0 63,-1.5 66" stroke="#6b4a2c" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </svg>
        <div className="magic-cursor-tip" />
      </div>
    </>
  );
};
