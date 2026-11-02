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

export function createFinale(root, { onEnd, onReveal, onPlaying }) {
  const wrap = document.createElement("div");
  wrap.className = "tj-finale";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<video playsinline preload="auto" tabindex="-1"></video>
    <div class="tj-finaleTurn" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="16" y="6" width="16" height="30" rx="3"/><path d="M38 20a14 14 0 0 1-6 20"/><path d="M30 37l2.5 3.5L36 38"/></svg></div>
    <button class="tj-finaleClose" type="button" aria-label="Close the video">&times;</button>`;
  root.appendChild(wrap);
  const v = wrap.querySelector("video");
  let hls = null, loading = null, active = false, shown = false, wide = false, raf = 0, hideClose = 0, wantMuted = false;
  // it's "heard" once it's playing with sound (or playing at all, if they'd muted the site)
  const heard = () => { if (active && !v.paused && v.readyState >= 3 && (!v.muted || wantMuted) && onPlaying) onPlaying(); };   // (frames actually showing)

  // start fetching (when the lion appears): native HLS on Apple devices, hls.js elsewhere
  function preload() {
    if (loading) return loading;
    if (v.canPlayType("application/vnd.apple.mpegurl")) { v.src = HLS_URL; v.load(); return (loading = Promise.resolve()); }
    loading = import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) { v.src = HLS_URL; return; }
      hls = new Hls({ maxBufferLength: 20, startLevel: -1 });
      hls.on(Hls.Events.ERROR, (e, d) => { if (d && d.fatal) { hls.destroy(); hls = null; loading = null; } });   // (the lion's tap tries again)
      hls.loadSource(HLS_URL); hls.attachMedia(v);
    }).catch(() => { v.src = HLS_URL; });
    return loading;
  }
  // true full screen where the browser allows it (Android, desktop; iPhone doesn't let a page do this),
  // asked for inside a tap
  const fsOK = () => document.fullscreenEnabled && !document.fullscreenElement && wrap.requestFullscreen;
  function goFull() { if (fsOK()) wrap.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); }
  // in the lion's tap (that's what lets it play with sound)
  function start(muted) {
    if (matchMedia("(pointer: coarse)").matches) goFull();   // phones/tablets that allow it: edge to edge from the start
    if (v.error && !hls) { v.removeAttribute("src"); v.load(); loading = null; }   // a failed early load: start afresh
    preload();
    active = true; shown = false; wide = false;
    wrap.classList.remove("show", "wide", "turn", "controls");
    wantMuted = !!muted; v.muted = wantMuted;
    try { v.currentTime = 0; } catch (e) { /* not loaded yet */ }
    const go = () => { if (!active) return; const p = v.play();
      if (p && p.catch) p.catch(() => { if (!v.muted) { v.muted = true; v.play().catch(() => {}); } }); };   // refused with sound: silently, rather than not at all
    go();
    if (loading) loading.then(go);
    v.addEventListener("canplay", go, { once: true });
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
    if (document.fullscreenElement === wrap) document.exitFullscreen().catch(() => {});
    if (!shown) v.pause();   // never shown: stop it now (a late arrival mustn't play under the world)
    setTimeout(() => { v.pause(); wrap.querySelectorAll(".tj-finaleRings").forEach((e) => e.remove()); }, 600);
    onEnd();
  }
  v.addEventListener("ended", stop);
  v.addEventListener("playing", heard); v.addEventListener("volumechange", heard); v.addEventListener("canplay", heard);
  // a tap shows the close button for a few seconds
  wrap.addEventListener("click", (e) => {
    if (!shown) return;
    if (e.target.closest(".tj-finaleClose")) return stop();
    goFull();   // (desktop: a click on the video takes it full screen)
    wrap.classList.add("controls"); clearTimeout(hideClose);
    hideClose = setTimeout(() => wrap.classList.remove("controls"), 3000);
  });
  return {
    preload, start, time, stop,
    // call inside every touch/click that follows the lion's tap: on iPhone only some touches let a video
    // start with sound, so any of them that does gets it going
    kick() {
      if (!active) return;
      if (v.muted && !wantMuted) v.muted = false;    // it had to start silently: this touch brings its sound
      if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    },
    get playing() { return active && !v.paused && v.readyState >= 2; },
    get active() { return active; },
    get failed() { return active && !shown && v.error != null; },
    destroy() { cancelAnimationFrame(raf); if (hls) hls.destroy(); v.removeAttribute("src"); wrap.remove(); },
  };
}
