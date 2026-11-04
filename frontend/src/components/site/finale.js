// The finale: one baked video (hosted with the site) of the flight into the lion's eye (Kling) and the
// music video opening out of his pupil. It plays silently, locked to the song: the song itself is the
// lion's own cut (sound.lion, started in the lion's tap, the same clock the roar lands on). The video is
// loaded before the tap (nothing heavy starts in it), plays hidden, and takes over from the live world
// once it is actually showing FINALE.reveal (the world holds that same frame until then). It holds on
// its last frame under the unlock card. Vertical throughout, so a phone stays upright; a landscape
// screen shows it whole in the middle.
export const FINALE = {
  hevc: "trev-finale-hevc.mp4?v=2",   // 5.2 MB (iPhone, Mac, most Android)
  h264: "trev-finale.mp4?v=2",        // 6.4 MB (everything else)
  song: "/journey/trev-finale-song.m4a?v=1",   // TREV's edit's own audio (from "Welcome to my", K at 0.94 s): played as the lion's cut
  reveal: 1.8,    // the video takes over from the world (its first frame: the roar's frame 0.9 s on; black before, never shown)
  giveUp: 2.5,    // not showing this long after the reveal time: the world carries on without it
};
const A = "/journey/";
const SYNC_SEEK_S = 0.3;    // further than this from the song: jump to it
const SYNC_GAIN = 0.6, SYNC_MAX_RATE = 0.06;   // closer: speed up / slow down a touch until it's on

export function createFinale(root, { onEnd, onReveal, onOutro, clock }) {
  const wrap = document.createElement("div");
  wrap.className = "tj-finale";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<video playsinline muted preload="auto" tabindex="-1"></video>
    <button class="tj-finaleClose" type="button" aria-label="Close the video">&times;</button>`;
  root.appendChild(wrap);
  const v = wrap.querySelector("video");
  v.muted = true; v.defaultMuted = true;   // (the song is heard from the site's own player)
  let loading = null, blobUrl = null, active = false, shown = false, held = false, failed = false, raf = 0, hideClose = 0, startedAt = 0;

  // download (from the first totem): the whole file into memory, at low priority, so the world's own
  // images come first
  const url = A + (v.canPlayType('video/mp4; codecs="hvc1"') ? FINALE.hevc : FINALE.h264);
  function preload() {
    if (loading) return loading;
    loading = fetch(url, { priority: "low" })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => { blobUrl = URL.createObjectURL(b); })
      .catch(() => {});   // (it plays from the network instead)
    return loading;
  }
  // load the video itself, ready for the tap (once the lion has appeared: the world is drawn by then)
  function prepare() {
    preload().then(() => { if (!v.src) { v.src = blobUrl || url; v.preload = "auto"; v.load(); } });
  }
  // true full screen where the browser allows it (Android, desktop; iPhone doesn't let a page do this),
  // asked for inside a tap. The whole page goes full screen, so the unlock card can rise over it
  const fsEl = document.documentElement;
  const fsOK = () => document.fullscreenEnabled && !document.fullscreenElement && fsEl.requestFullscreen;
  function goFull() { if (fsOK()) fsEl.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); }
  const go = () => { if (active && !held && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } };
  // in the lion's tap (a tap lets it start even where a phone holds videos back)
  function start() {
    if (matchMedia("(pointer: coarse)").matches) goFull();
    if (v.error) { v.removeAttribute("src"); v.load(); }   // a failed load: start afresh
    if (!v.src) { v.src = blobUrl || url; v.preload = "auto"; v.load(); }
    active = true; shown = false; held = false; failed = false; startedAt = performance.now();
    wrap.classList.remove("show", "controls", "held");
    v.playbackRate = 1;
    try { v.currentTime = 0; } catch (e) { /* not loaded yet */ }
    go();
    v.addEventListener("canplay", go, { once: true });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  // the song's time (or, with the sound off, the time since the tap)
  const songTime = () => { const t = clock ? clock() : null; return t != null && t > 0 ? t : (performance.now() - startedAt) / 1000; };
  function tick() {
    if (!active || held) return;
    raf = requestAnimationFrame(tick);
    const at = songTime();
    if (!v.paused && v.readyState >= 2) {
      // keep it on the song
      const d = v.currentTime - at;
      if (v.seeking) { /* a jump under way: let it land (a new one each frame would restart it forever) */ }
      else if (Math.abs(d) > SYNC_SEEK_S) { try { v.currentTime = at + 0.15; } catch (e) { /* not seekable yet */ } }   // (a little ahead: the jump takes a moment)
      else v.playbackRate = 1 - Math.max(-SYNC_MAX_RATE, Math.min(SYNC_MAX_RATE, d * SYNC_GAIN));
      // the takeover, once its frame is really on screen
      if (!shown && v.currentTime >= FINALE.reveal && at >= FINALE.reveal) {
        shown = true; wrap.classList.add("show"); wrap.setAttribute("aria-hidden", "false"); if (onReveal) onReveal(wrap);
      }
    } else go();
    if (!shown && (at > FINALE.reveal + FINALE.giveUp || v.error)) { failed = true; stop(); }
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
    v.pause();
    // once it's faded: let the video go entirely (an iPhone keeps a loaded video's decoder and memory
    // otherwise, and the world is all images); the file stays in memory, loaded again for another go
    setTimeout(() => { if (active) return; v.removeAttribute("src"); v.load(); wrap.querySelectorAll(".tj-finaleRings").forEach((e) => e.remove()); }, 1100);
    onEnd(shown);   // (shown: it played; not: it never got going)
  }
  v.addEventListener("ended", () => (shown ? hold() : stop()));
  // a tap shows the close button for a few seconds
  wrap.addEventListener("click", (e) => {
    if (!shown || held) return;
    if (e.target.closest(".tj-finaleClose")) return hold();
    goFull();   // (desktop: a click on the video takes it full screen)
    wrap.classList.add("controls"); clearTimeout(hideClose);
    hideClose = setTimeout(() => wrap.classList.remove("controls"), 3000);
  });
  return {
    preload, prepare, start, stop,
    kick: go,   // (any touch after the tap may get a held-back video going)
    get active() { return active; },
    get shown() { return shown; },
    get held() { return held; },
    get failed() { return failed; },
    destroy() { cancelAnimationFrame(raf); v.removeAttribute("src"); if (blobUrl) URL.revokeObjectURL(blobUrl); wrap.remove(); },
  };
}
