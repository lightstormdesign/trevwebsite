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
const IDLE_LOOP_S = 1.2, IDLE_MAX_MS = 120000;   // waiting for the tap, it runs round 0..this (all black, inside the hidden lead-in)
const SYNC_SEEK_S = 0.3;    // further than this from the song: jump to it
const SYNC_EVERY_MS = 500, SYNC_OK_S = 0.035, SYNC_NUDGE = 0.04;   // closer: within SYNC_OK_S it's on; else 4% faster/slower until it is

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
  // load the video itself, ready for the tap (once the lion has appeared: the world is drawn by then),
  // and get it running, hidden, round and round its black lead-in: an iPhone stalls the page for half
  // a second or more when a video first starts, so that's paid now, not in the lion's tap (where it
  // made the roar late). The tap then only takes it back to the start.
  let idling = false, idleTimer = 0;
  function prepare() {
    preload().then(() => {
      if (active) return;
      if (!v.src) { v.src = blobUrl || url; v.preload = "auto"; v.load(); }
      idle();
    });
  }
  function idle() {
    if (active || idling) return;
    idling = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => { stopIdle(); });   // (refused, e.g. Low Power Mode: the tap starts it instead)
    const until = performance.now() + IDLE_MAX_MS;
    idleTimer = setInterval(() => {
      if (active) return;
      if (performance.now() > until) { stopIdle(); v.pause(); return; }   // (not forever: then the tap starts it cold)
      if (!v.paused && v.currentTime > IDLE_LOOP_S) v.currentTime = 0;
    }, 150);
  }
  function stopIdle() { clearInterval(idleTimer); idling = false; }
  // true full screen where the browser allows it (Android, desktop; iPhone doesn't let a page do this),
  // asked for inside a tap. The whole page goes full screen, so the unlock card can rise over it
  const fsEl = document.documentElement;
  const fsOK = () => document.fullscreenEnabled && !document.fullscreenElement && fsEl.requestFullscreen;
  function goFull() { if (fsOK()) fsEl.requestFullscreen({ navigationUI: "hide" }).catch(() => {}); }
  const go = () => { if (active && !held && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } };
  // in the lion's tap (a tap lets it start even where a phone holds videos back)
  function start() {
    stopIdle();
    if (matchMedia("(pointer: coarse)").matches) goFull();
    if (v.error) { v.removeAttribute("src"); v.load(); }   // a failed load: start afresh
    if (!v.src) { v.src = blobUrl || url; v.preload = "auto"; v.load(); }
    active = true; shown = false; held = false; failed = false; startedAt = performance.now();
    wrap.classList.remove("show", "controls", "held");
    if (v.playbackRate !== 1) v.playbackRate = 1;
    nextCheck = 0; nextGo = 0;
    try { v.currentTime = 0; } catch (e) { /* not loaded yet */ }
    go();
    v.addEventListener("canplay", go, { once: true });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  // the song's time (or, with the sound off, the time since the tap)
  const songTime = () => { const t = clock ? clock() : null; return t != null && t > 0 ? t : (performance.now() - startedAt) / 1000; };
  // Kept on the song lightly: a phone pays for every change of a video's speed (and every play()), so
  // nothing is touched while the lion roars; it's checked twice a second, the speed only nudged
  // (to one of three settings) when it has really drifted, and a jump only when it's far off.
  let nextCheck = 0, nextGo = 0;
  function tick() {
    if (!active || held) return;
    raf = requestAnimationFrame(tick);
    const at = songTime(), now = performance.now();
    if (!v.paused && v.readyState >= 2) {
      // the takeover, once its frame is really on screen
      if (!shown && v.currentTime >= FINALE.reveal && at >= FINALE.reveal) {
        shown = true; wrap.classList.add("show"); wrap.setAttribute("aria-hidden", "false"); if (onReveal) onReveal(wrap);
      }
      if (now >= nextCheck && !v.seeking) {
        nextCheck = now + SYNC_EVERY_MS;
        const d = v.currentTime - at;
        if (Math.abs(d) > SYNC_SEEK_S) { try { v.currentTime = at + 0.15; } catch (e) { /* not seekable yet */ } }   // (a little ahead: the jump takes a moment)
        else if (shown || at > FINALE.reveal - 0.4) {   // (not while he roars)
          const rate = Math.abs(d) < SYNC_OK_S ? 1 : d > 0 ? 1 - SYNC_NUDGE : 1 + SYNC_NUDGE;
          if (v.playbackRate !== rate) v.playbackRate = rate;
        }
      }
    } else if (now >= nextGo) { nextGo = now + 300; go(); }   // (not a play() every frame)
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
    v.pause(); stopIdle();
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
    destroy() { stopIdle(); cancelAnimationFrame(raf); v.removeAttribute("src"); if (blobUrl) URL.revokeObjectURL(blobUrl); wrap.remove(); },
  };
}
