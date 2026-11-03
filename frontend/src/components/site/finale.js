// The finale: one baked video (hosted with the site, downloaded whole into memory while they play) that carries everything from the lion's tap on:
// "Welcome to my K-ingdom" (its audio), the flight into the lion's eye (Kling), and the music video
// opening out of his pupil. The lion's tap starts it (so it plays with sound); it stays hidden while
// the site's own lion roars on its "K" (FINALE.drop), and takes over from the live world at
// FINALE.reveal, on the exact frame, and holds on its last frame under the unlock card. It's vertical throughout (the music video reframed to 9:16), so a
// phone stays upright; a landscape screen shows it whole in the middle.
export const FINALE = {
  hevc: "trev-finale-hevc.mp4",   // 7.5 MB (iPhone, Mac, most Android)
  h264: "trev-finale.mp4",        // 9.8 MB (everything else)
  drop: 0.94,     // "K-ingdom" and the drums: the roar
  reveal: 1.79,   // the video takes over from the world (its first frame: the roar's frame 0.9 s on)
};
const A = "/journey/";

export function createFinale(root, { onEnd, onReveal, onPlaying, onOutro }) {
  const wrap = document.createElement("div");
  wrap.className = "tj-finale";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<video playsinline preload="auto" tabindex="-1"></video>
    <button class="tj-finaleClose" type="button" aria-label="Close the video">&times;</button>`;
  root.appendChild(wrap);
  const v = wrap.querySelector("video");
  let loading = null, blobUrl = null, active = false, shown = false, held = false, raf = 0, hideClose = 0, wantMuted = false;
  // it's "heard" once it's playing with sound (or playing at all, if they'd muted the site)
  const heard = () => { if (active && !v.paused && v.readyState >= 3 && (!v.muted || wantMuted) && onPlaying) onPlaying(); };   // (frames actually showing)

  // start downloading (at the first totem): the whole file into memory, so it starts the instant the
  // lion is tapped and never stalls; if the download fails it plays from the network instead. Only the
  // file is fetched: the video itself isn't loaded until the lion's tap (a second video loading while the
  // world is drawing is what an iPhone struggles with)
  const url = A + (v.canPlayType('video/mp4; codecs="hvc1"') ? FINALE.hevc : FINALE.h264);
  function preload() {
    if (loading) return loading;
    loading = fetch(url, { priority: "low" })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => { blobUrl = URL.createObjectURL(b); })
      .catch(() => {});   // (the lion's tap plays it from the network)
    return loading;
  }
  // true full screen where the browser allows it (Android, desktop; iPhone doesn't let a page do this),
  // asked for inside a tap. The whole page goes full screen (not just the video), so the unlock card
  // can still rise over its last frame
  const fsEl = document.documentElement;
  const fsOK = () => document.fullscreenEnabled && !document.fullscreenElement && fsEl.requestFullscreen;
  function goFull() { if (fsOK()) fsEl.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); }
  // in the lion's tap (that's what lets it play with sound)
  function start(muted) {
    if (matchMedia("(pointer: coarse)").matches) goFull();   // phones/tablets that allow it: edge to edge from the start
    if (v.error) { v.removeAttribute("src"); v.load(); }   // a failed load: start afresh
    if (!v.src) { v.src = blobUrl || url; v.preload = "auto"; v.load(); }   // from memory (or, still downloading, the network)
    preload();
    active = true; shown = false; held = false;
    wrap.classList.remove("show", "controls");
    wantMuted = !!muted; v.muted = wantMuted;
    try { v.currentTime = 0; } catch (e) { /* not loaded yet */ }
    const go = () => { if (!active) return; const p = v.play();
      if (p && p.catch) p.catch(() => { if (!v.muted) { v.muted = true; v.play().catch(() => {}); } }); };   // refused with sound: silently, rather than not at all
    go();
    v.addEventListener("canplay", go, { once: true });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  // the video's clock, read every frame: a phone only updates currentTime now and then, so between
  // updates it's carried forward by the real clock (the roar mustn't wait for the next update)
  let lastCT = -1, lastAt = 0;
  const time = () => {
    if (!(active && !v.paused && v.readyState >= 2)) return null;
    const ct = v.currentTime, now = performance.now();
    if (ct !== lastCT) { lastCT = ct; lastAt = now; return ct; }
    return ct + Math.min(0.25, (now - lastAt) / 1000);
  };
  function tick() {
    if (!active) return;
    raf = requestAnimationFrame(tick);
    const t = v.currentTime;
    if (!shown && t >= FINALE.reveal) { shown = true; wrap.classList.add("show"); wrap.setAttribute("aria-hidden", "false"); if (onReveal) onReveal(wrap); }
  }
  // the end (or their X): it holds on the frame it's on and the unlock card rises over it; the world
  // only comes back once they're done with the card (stop)
  function hold() {
    if (!active || held) return;
    held = true; v.pause(); cancelAnimationFrame(raf); clearTimeout(hideClose); wrap.classList.remove("controls"); wrap.classList.add("held");
    if (onOutro) onOutro();
  }
  function stop() {
    if (!active) return;
    active = false; held = false; cancelAnimationFrame(raf);
    wrap.classList.remove("show", "controls", "held"); wrap.setAttribute("aria-hidden", "true");
    if (document.fullscreenElement === fsEl) document.exitFullscreen().catch(() => {});
    if (!shown) v.pause();   // never shown: stop it now (a late arrival mustn't play under the world)
    // once it's faded: let the video go entirely (an iPhone keeps a loaded video's decoder and memory
    // otherwise, and the world is all images); the file stays in memory for another go
    setTimeout(() => { if (active) return; v.pause(); v.removeAttribute("src"); v.load(); wrap.querySelectorAll(".tj-finaleRings").forEach((e) => e.remove()); }, 1100);
    onEnd(shown);   // (shown: it played; not: it failed before the takeover)
  }
  v.addEventListener("ended", () => (shown ? hold() : stop()));
  v.addEventListener("playing", heard); v.addEventListener("volumechange", heard); v.addEventListener("canplay", heard);
  // a tap shows the close button for a few seconds
  wrap.addEventListener("click", (e) => {
    if (!shown || held) return;
    if (e.target.closest(".tj-finaleClose")) return hold();
    goFull();   // (desktop: a click on the video takes it full screen)
    wrap.classList.add("controls"); clearTimeout(hideClose);
    hideClose = setTimeout(() => wrap.classList.remove("controls"), 3000);
  });
  return {
    preload, start, time, stop,
    // call inside every touch/click that follows the lion's tap: on iPhone only some touches let a video
    // start with sound, so any of them that does gets it going
    kick() {
      if (!active || held) return;   // (held on its last frame: never restart it)
      if (v.muted && !wantMuted) v.muted = false;    // it had to start silently: this touch brings its sound
      if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    },
    get playing() { return active && !v.paused && v.readyState >= 2; },
    get active() { return active; },
    get held() { return held; },
    get failed() { return active && !shown && v.error != null; },
    destroy() { cancelAnimationFrame(raf); v.removeAttribute("src"); if (blobUrl) URL.revokeObjectURL(blobUrl); wrap.remove(); },
  };
}
