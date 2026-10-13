// Stable viewport heights for scroll-driven scenes. On phones the browser's address bar collapses on
// the first scroll, which changes window.innerHeight (and fires resize) mid-gesture: anything computed
// from it jumps. These read CSS 100svh (bar shown) / 100lvh (bar hidden) instead, which don't change
// while scrolling, and only re-measure when the width changes (rotation, desktop resize).
let cache = null;
let probes = null;

function measure() {
  if (!probes) {
    probes = ["svh", "lvh"].map((u) => {
      const el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = `position:fixed;left:-9999px;top:0;width:1px;height:100${u};visibility:hidden;pointer-events:none`;
      document.body.appendChild(el);
      return el;
    });
  }
  const [s, l] = probes.map((el) => el.offsetHeight);
  const ih = window.innerHeight;
  cache = { w: window.innerWidth, small: s || ih, large: Math.max(l || ih, s || ih) };
}

export function viewport() {
  if (!cache || cache.w !== window.innerWidth) measure();
  return cache;
}
