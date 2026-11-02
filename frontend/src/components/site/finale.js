// The finale: one baked video (Cloudflare Stream) that carries everything from the lion's tap on:
// "Welcome to my K-ingdom" (its audio), the flight into the lion's eye (Kling), and the music video
// opening out of his pupil. The lion's tap starts it (so it plays with sound); it stays hidden while
// the site's own lion roars on its "K" (FINALE.drop), and takes over from the live world at
// FINALE.reveal, on the exact frame. From FINALE.wide the music video fills the frame, turned
// sideways (its bottom to the right): a phone turned clockwise reads it upright; a landscape screen
// (desktop, or a phone with rotation unlocked) turns it back.
export const FINALE = {
  id: "12f78bf1b2189445e54f7eec90a4b5a5",
  drop: 0.92,     // "K-ingdom" and the drums: the roar
  reveal: 1.82,   // the video takes over from the world (the roar's frame 0.9 s on)
  wide: 10.77,    // the music video fills the frame
};
const HLS_URL = `https://videodelivery.net/${FINALE.id}/manifest/video.m3u8`;

export function createFinale(root, { onEnd, onReveal }) {
  const wrap = document.createElement("div");
  wrap.className = "tj-finale";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<video playsinline preload="auto" tabindex="-1"></video>
    <div class="tj-finaleTurn" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="16" y="6" width="16" height="30" rx="3"/><path d="M38 20a14 14 0 0 1-6 20"/><path d="M30 37l2.5 3.5L36 38"/></svg></div>
    <button class="tj-finaleClose" type="button" aria-label="Close the video">&times;</button>`;
  root.appendChild(wrap);
  const v = wrap.querySelector("video");
  let hls = null, loading = null, active = false, shown = false, wide = false, raf = 0, hideClose = 0;

  // start fetching (when the lion appears): native HLS on Apple devices, hls.js elsewhere
  function preload() {
    if (loading) return loading;
    if (v.canPlayType("application/vnd.apple.mpegurl")) { v.src = HLS_URL; v.load(); return (loading = Promise.resolve()); }
    loading = import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) { v.src = HLS_URL; return; }
      hls = new Hls({ maxBufferLength: 20, startLevel: -1 });
      hls.loadSource(HLS_URL); hls.attachMedia(v);
    }).catch(() => { v.src = HLS_URL; });
    return loading;
  }
  // in the lion's tap (that's what lets it play with sound)
  function start(muted) {
    preload();
    active = true; shown = false; wide = false;
    wrap.classList.remove("show", "wide", "turn", "controls");
    v.muted = !!muted;
    try { v.currentTime = 0; } catch (e) { /* not loaded yet */ }
    const p = v.play();
    if (p && p.catch) p.catch(() => { if (!v.muted) { v.muted = true; v.play().catch(() => {}); } });   // refused with sound: silently, rather than not at all
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  const time = () => (active && !v.paused && v.readyState >= 2 ? v.currentTime : null);
  function tick() {
    if (!active) return;
    raf = requestAnimationFrame(tick);
    const t = v.currentTime;
    if (!shown && t >= FINALE.reveal) { shown = true; wrap.classList.add("show"); wrap.setAttribute("aria-hidden", "false"); if (onReveal) onReveal(wrap); }
    if (!wide && t >= FINALE.wide) {
      wide = true; wrap.classList.add("wide");
      if (matchMedia("(orientation: portrait)").matches) { wrap.classList.add("turn"); setTimeout(() => wrap.classList.remove("turn"), 2800); }
    }
  }
  function stop() {
    if (!active) return;
    active = false; cancelAnimationFrame(raf);
    wrap.classList.remove("show", "wide", "turn", "controls"); wrap.setAttribute("aria-hidden", "true");
    setTimeout(() => { v.pause(); wrap.querySelectorAll(".tj-finaleRings").forEach((e) => e.remove()); }, 600);
    onEnd();
  }
  v.addEventListener("ended", stop);
  // a tap shows the close button for a few seconds
  wrap.addEventListener("click", (e) => {
    if (!shown) return;
    if (e.target.closest(".tj-finaleClose")) return stop();
    wrap.classList.add("controls"); clearTimeout(hideClose);
    hideClose = setTimeout(() => wrap.classList.remove("controls"), 3000);
  });
  return {
    preload, start, time, stop,
    get active() { return active; },
    get failed() { return active && !shown && v.error != null; },
    destroy() { cancelAnimationFrame(raf); if (hls) hls.destroy(); v.removeAttribute("src"); wrap.remove(); },
  };
}
