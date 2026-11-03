// The finale: one baked video (hosted with the site, downloaded whole into memory while they play) that carries everything from the lion's tap on:
// "Welcome to my K-ingdom" (its audio), the flight into the lion's eye (Kling), and the music video
// opening out of his pupil. The lion's tap starts it (so it plays with sound); it stays hidden while
// the site's own lion roars on its "K" (FINALE.drop), and takes over from the live world at
// FINALE.reveal, on the exact frame. It's vertical throughout (the music video reframed to 9:16), so a
// phone stays upright; a landscape screen shows it whole in the middle.
export const FINALE = {
  hevc: "trev-finale-hevc.mp4",   // 7.5 MB (iPhone, Mac, most Android)
  h264: "trev-finale.mp4",        // 9.8 MB (everything else)
  drop: 0.94,     // "K-ingdom" and the drums: the roar
  reveal: 1.79,   // the video takes over from the world (its first frame: the roar's frame 0.9 s on)
  outro: 1.6,     // the unlock card starts rising this long before the end (as the song fades out)
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
  let loading = null, blobUrl = null, active = false, shown = false, outro = false, raf = 0, hideClose = 0, wantMuted = false;
  // it's "heard" once it's playing with sound (or playing at all, if they'd muted the site)
  const heard = () => { if (active && !v.paused && v.readyState >= 3 && (!v.muted || wantMuted) && onPlaying) onPlaying(); };   // (frames actually showing)

  // start downloading (at the first totem): the whole file into memory, so it starts the instant the
  // lion is tapped and never stalls; if the download fails it plays from the network instead
  const url = A + (v.canPlayType('video/mp4; codecs="hvc1"') ? FINALE.hevc : FINALE.h264);
  function preload() {
    if (loading) return loading;
    const direct = () => { if (!v.src) { v.src = url; v.preload = "auto"; v.load(); } };
    loading = fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => { if (active && v.src) return; blobUrl = URL.createObjectURL(b); v.src = blobUrl; v.preload = "auto"; v.load(); })
      .catch(direct);
    return loading;
  }
  // true full screen where the browser allows it (Android, desktop; iPhone doesn't let a page do this),
  // asked for inside a tap
  const fsOK = () => document.fullscreenEnabled && !document.fullscreenElement && wrap.requestFullscreen;
  function goFull() { if (fsOK()) wrap.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); }
  // in the lion's tap (that's what lets it play with sound)
  function start(muted) {
    if (matchMedia("(pointer: coarse)").matches) goFull();   // phones/tablets that allow it: edge to edge from the start
    if (v.error) { v.removeAttribute("src"); v.load(); if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = null; loading = null; }   // a failed load: start afresh
    if (!v.src) { v.src = url; v.preload = "auto"; v.load(); }   // still downloading: play from the network
    preload();
    active = true; shown = false; outro = false;
    wrap.classList.remove("show", "controls");
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
    if (!outro && v.duration > 0 && t >= v.duration - FINALE.outro) { outro = true; if (onOutro) onOutro(); }
  }
  function stop() {
    if (!active) return;
    active = false; cancelAnimationFrame(raf);
    wrap.classList.remove("show", "controls"); wrap.setAttribute("aria-hidden", "true");
    if (document.fullscreenElement === wrap) document.exitFullscreen().catch(() => {});
    if (!shown) v.pause();   // never shown: stop it now (a late arrival mustn't play under the world)
    setTimeout(() => { v.pause(); wrap.querySelectorAll(".tj-finaleRings").forEach((e) => e.remove()); }, 600);
    onEnd(shown);   // (shown: it played; not: it failed before the takeover)
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
    destroy() { cancelAnimationFrame(raf); v.removeAttribute("src"); if (blobUrl) URL.revokeObjectURL(blobUrl); wrap.remove(); },
  };
}
