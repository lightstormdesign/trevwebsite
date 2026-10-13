import { useEffect, useRef, useState } from "react";
import { viewport } from "@/utils/viewport";

// The About page's "world of TREV": TREV's illustrated Sedona layers, fixed behind the whole page.
// Scrolling the opening (`hookRef` section) moves a camera through the world: it starts zoomed in on
// the sun (clouds drifting in from the right), pans right, then descends and pulls back, each layer
// at its own pace (far layers lag, near layers lead). Every layer arrives at the same moment on the
// exact composition of TREV's reference image (the full world, sky to path), and the parallax stops
// there: the world holds still and dims, and the story begins. Layer edges are feathered so there
// are no hard lines, and positions ease toward the scroll so it glides.
//
// Layers (public/, WebP): trev-world-sky (opaque), -clouds, -rocks, -path (941x1672, pre-aligned on
// one canvas like the reference) and trev-world-foreground (2078x757 strip, the nearest).

const SCENE_ASPECT = 941 / 1672;
const FG_ASPECT = 2078 / 757;
const ROCKS_TOP = 616 / 1672; // first opaque row of the rocks layer

// lag > 1: the layer trails the camera (far); < 1: it leads (near). All arrive together at the end.
// `fade` feathers the layer's edges (fractions of the canvas height) so layers blend, never cut.
const LAYERS = [
  { key: "sky", src: "/trev-world-sky.webp", lag: 1.9, fade: null },
  { key: "clouds", src: "/trev-world-clouds.webp", lag: 1.45, fade: { bottomFrom: 0.3, bottomTo: 0.37, left: 0.16 } },
  { key: "rocks", src: "/trev-world-rocks.webp", lag: 1.12, fade: { topFrom: 0.365, topTo: 0.38, bottomFrom: 0.58, bottomTo: 0.665 } },
  { key: "path", src: "/trev-world-path.webp", lag: 0.9, fade: { topFrom: 0.26, topTo: 0.31 } },
];
const ZOOM_START = 1.5; // close in for the pan and the descent…
const DARKEN = 0.7; // how dark the world sits behind the story
const CLOUDS_START_X = 0.24; // clouds begin this far right (fraction of screen width), drifting in
// how much of the sideways pan to keep: the camera starts only part-way toward the sun, so the first
// scroll reads as a descent with a gentle drift, not a sudden slide to the side
const PAN_AMOUNT = 0.35;

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const maskFor = (fade) => {
  if (!fade) return undefined;
  const stops = [];
  if (fade.topFrom != null) stops.push(`transparent ${fade.topFrom * 100}%`, `#000 ${fade.topTo * 100}%`);
  else stops.push("#000 0%");
  if (fade.bottomFrom != null) stops.push(`#000 ${fade.bottomFrom * 100}%`, `transparent ${fade.bottomTo * 100}%`);
  else stops.push("#000 100%");
  const g = `linear-gradient(to bottom, ${stops.join(", ")})`;
  if (!fade.left) return { WebkitMaskImage: g, maskImage: g };
  // the clouds are painted right up to the art's left edge: feather it, since they start shifted right
  const h = `linear-gradient(to right, transparent 0%, #000 ${fade.left * 100}%)`;
  return { WebkitMaskImage: `${g}, ${h}`, maskImage: `${g}, ${h}`, WebkitMaskComposite: "source-in", maskComposite: "intersect" };
};

export const SedonaWorld = ({ hookRef }) => {
  const layerRefs = useRef([]);
  const fgRef = useRef(null);
  const shadeRef = useRef(null);
  // fade the world in once the sky has arrived (or after 2.5 s)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let raf = 0;
    let ys = window.scrollY; // eased scroll position: the camera glides toward the real one
    let last = performance.now();
    let lastKey = "";
    const frame = (now) => {
      raf = 0;
      const t = now || performance.now();
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const target = window.scrollY;
      ys += (target - ys) * (1 - Math.exp(-dt * 4)); // ~250 ms glide, frame-rate independent
      if (Math.abs(target - ys) < 0.3) ys = target;

      // Heights that don't change when the phone's address bar collapses: the scroll progress uses the
      // small viewport (matches the svh-sized sections), the scene is sized to the large one so it
      // always covers. Using innerHeight here made the whole world lurch on the first scroll.
      const vp = viewport();
      const W = window.innerWidth, H = vp.large;
      const hook = hookRef.current;
      const hookEnd = hook ? hook.offsetTop + hook.offsetHeight - vp.small : vp.small * 2;
      // past the opening the world is landed and still: no more parallax
      const p = clamp01(ys / Math.max(1, hookEnd));
      // three beats: pan right off the sun · descend to the red-rock horizon · pull back to the full world
      const pan = smooth(clamp01(p / 0.6));
      const down = clamp01((p - 0.04) / 0.56);
      const back = clamp01((p - 0.55) / 0.45);

      // camera: close in for the pan and the descent, then an exact cover fit on landing (phones: the
      // whole world, sky to path; wider screens: rock horizon ~42% down, plenty of sky above)
      const zoom = ZOOM_START + (1 - ZOOM_START) * smooth(back);
      const sceneW = Math.max(W, H * SCENE_ASPECT) * zoom;
      const sceneH = sceneW / SCENE_ASPECT;
      const spare = sceneH - H;
      const yDown = Math.max(0, Math.min(spare, ROCKS_TOP * sceneH - 0.25 * H)); // rock horizon near the top
      const yLand = Math.max(0, Math.min(spare, ROCKS_TOP * sceneH - 0.42 * H));
      // start a little toward the sun (left of the art), drift to centre while descending
      const x = ((W - sceneW) / 2) * (1 - PAN_AMOUNT * (1 - pan));

      const key = `${W}|${H}|${hookEnd}|${ys.toFixed(1)}`;
      if (key !== lastKey) {
        lastKey = key;
        LAYERS.forEach((L, i) => {
          const el = layerRefs.current[i];
          if (!el) return;
          // every layer runs the same beats at its own pace (lag), and all of them land together
          const d = smooth(Math.pow(down, L.lag));
          const b = smooth(Math.pow(back, L.lag));
          const dy = -(yDown * d * (1 - b) + yLand * b);
          const dx = L.key === "clouds" ? x + W * CLOUDS_START_X * (1 - smooth(clamp01(p / 0.5))) : x;
          el.style.width = `${sceneW.toFixed(1)}px`;
          el.style.height = `${sceneH.toFixed(1)}px`;
          el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        });
        // Foreground — the nearest layer and the biggest: wider than the screen, sweeping up from below
        // faster than anything behind it, and settling along the bottom as the world's final layer.
        const fg = fgRef.current;
        if (fg) {
          const fgW = Math.max(W * 1.7, H * 1.15 * FG_ASPECT) * (zoom * 0.25 + 0.75);
          const fgH = fgW / FG_ASPECT;
          const f = smooth(clamp01((p - 0.2) / 0.8));
          const top = H * (1.1 - 0.52 * f);
          fg.style.width = `${fgW.toFixed(1)}px`;
          fg.style.height = `${fgH.toFixed(1)}px`;
          fg.style.transform = `translate3d(${((W - fgW) / 2).toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
        }
        // dims as it lands — the first story slide fades in at the moment it's fully landed
        if (shadeRef.current) shadeRef.current.style.opacity = (DARKEN * smooth(clamp01((p - 0.8) / 0.2))).toFixed(3);
      }
      if (ys !== target) raf = requestAnimationFrame(frame); // keep gliding until we arrive
    };
    const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame(performance.now());
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [hookRef]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[var(--sm-black)]" data-testid="sedona-world">
      <div className="absolute inset-0" style={{ opacity: ready ? 1 : 0, transition: "opacity 1.2s ease" }}>
        {LAYERS.map((L, i) => (
          <img
            onLoad={L.key === "sky" ? () => setReady(true) : undefined}
            key={L.key}
            ref={(el) => (layerRefs.current[i] = el)}
            src={L.src}
            alt=""
            className="absolute left-0 top-0 max-w-none select-none"
            style={{ willChange: "transform", ...maskFor(L.fade) }}
            decoding="async"
            fetchpriority={i === 0 ? "high" : undefined}
          />
        ))}
        <img
          ref={fgRef}
          src="/trev-world-foreground.webp"
          alt=""
          className="absolute left-0 top-0 max-w-none select-none"
          style={{ willChange: "transform" }}
          decoding="async"
        />
      </div>
      {/* cinematic vignette (same recipe as the homepage entry) + the dimming behind the story */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 125% 95% at 50% 42%, rgba(8,9,11,0) 52%, rgba(8,9,11,.55) 100%), linear-gradient(to bottom, rgba(8,9,11,.6) 0%, rgba(8,9,11,.15) 16%, rgba(8,9,11,0) 30%, rgba(8,9,11,0) 62%, rgba(8,9,11,.4) 84%, rgba(8,9,11,.7) 100%)",
        }}
      />
      <div ref={shadeRef} className="absolute inset-0" style={{ background: "#08090b", opacity: 0 }} />
    </div>
  );
};
