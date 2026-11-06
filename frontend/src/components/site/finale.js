// The finale: one baked video (hosted with the site) of the flight into the lion's eye (Kling) and the
// music video opening out of his pupil. It plays silently, locked to the song: the song itself is the
// lion's own cut (sound.lion, started in the lion's tap, the same clock the roar lands on). The video is
// loaded before the tap (nothing heavy starts in it), plays hidden, and takes over from the live world
// once it is actually showing FINALE.reveal (the world holds that same frame until then). It holds on
// its last frame under the unlock card. Vertical throughout, so a phone stays upright; a landscape
// screen shows it whole in the middle.
export const FINALE = {
  hevc: "trev-finale-hevc.mp4?v=4",   // 2.6 MB (iPhone, Mac, most Android): 38.6 s, 720p, its own frame timing
  h264: "trev-finale.mp4?v=4",        // 6.2 MB (everything else)
  song: "/journey/trev-finale-song.m4a?v=4",   // TREV's cut's own audio ("Welcome to my", K at 0.94 s; his jump to the second verse; his fade), 38.8 s: played as the lion's cut
  reveal: 1.79,   // the video takes over on its very first frame after the black (1.7917 s; black before, never shown)
  giveUp: 2.5,    // not showing this long after the reveal time: the world carries on without it
  w: 720, h: 1280,   // its frame (its first picture is the world's whole canvas, 941 wide, at this size)
  // the camera's move from the takeover (tracked from this cut, frame by frame, around the lion: seconds
  // after the reveal, then the scale and offset in the frame's pixels that carry the takeover frame onto
  // that frame), so the roar's rings carried over the video ride it and stay on him
  track: [[0.0,1.0,0.0,0.0],[0.067,1.0001,-0.1,-0.0],[0.133,1.0001,-0.2,0.1],[0.2,1.0001,-0.4,0.1],[0.267,1.0001,-0.5,0.2],[0.333,1.0001,-0.5,0.2],[0.4,1.0001,-0.5,0.2],[0.467,1.0001,-0.5,0.1],[0.533,1.0003,-0.6,0.0],[0.6,1.0013,-1.3,-0.9],[0.667,1.0032,-2.7,-2.4],[0.733,1.0108,-7.5,-8.8],[0.8,1.0304,-20.5,-25.1],[0.867,1.0492,-32.9,-41.0],[0.933,1.0876,-58.3,-73.3],[1.0,1.1397,-92.3,-117.0],[1.067,1.2053,-135.0,-172.3],[1.133,1.28,-184.6,-235.2],[1.2,1.3652,-240.4,-306.4],[1.267,1.4487,-294.2,-376.8],[1.333,1.5241,-344.3,-440.0],[1.4,1.5902,-387.1,-495.8],[1.467,1.6268,-411.4,-526.6],[1.533,1.674,-441.8,-566.5],[1.6,1.7225,-471.4,-608.4],[1.667,1.7505,-488.1,-632.6],[1.733,1.7703,-498.7,-650.5],[1.8,1.7858,-505.9,-664.6],[1.867,1.7956,-510.9,-673.6],[1.933,1.8049,-514.9,-682.1],[2.0,1.8078,-513.8,-685.8],[2.067,1.8113,-513.4,-689.6],[2.133,1.8119,-510.0,-691.8],[2.2,1.8128,-507.6,-693.9],[2.267,1.8131,-505.2,-695.3],[2.333,1.8134,-503.9,-696.2],[2.4,1.814,-503.3,-697.2],[2.467,1.8149,-504.0,-697.7],[2.533,1.8175,-506.4,-698.9],[2.6,1.8209,-511.1,-699.8]],
};
const A = "/journey/";
const IDLE_LOOP_S = 1.2, IDLE_MAX_MS = 120000;   // waiting for the tap, it runs round 0..this (all black, inside the hidden lead-in)
const SYNC_SEEK_S = 0.3, SYNC_JUMP_SHOWN_S = 1;    // further than this from the song: jump to it
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
  let idling = false, idleTimer = 0, idleNote = "not yet";
  function prepare() {
    preload().then(() => {
      if (active) return;
      if (!v.src) { v.src = blobUrl || url; v.preload = "auto"; v.load(); }
      idle();
    });
  }
  function idle() {
    if (active || idling) return;
    idling = true; idleNote = "starting";
    const p = v.play();
    if (p && p.then) p.then(() => { idleNote = "running"; }, (e) => { idleNote = "refused (" + (e && e.name) + ")"; stopIdle(); });   // (refused, e.g. Low Power Mode: the tap starts it instead)
    const until = performance.now() + IDLE_MAX_MS;
    idleTimer = setInterval(() => {
      if (active) return;
      if (performance.now() > until) { stopIdle(); v.pause(); idleNote = "stopped after 2 min"; return; }   // (not forever: then the tap starts it cold)
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
    active = true; shown = false; held = false; failed = false; fit = null; startedAt = performance.now();
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
    if (shown) followCamera();
    if (!v.paused && v.readyState >= 2) {
      // the takeover, once its frame is really on screen
      if (!shown && v.currentTime >= FINALE.reveal && at >= FINALE.reveal) {
        shown = true; wrap.classList.add("show"); wrap.setAttribute("aria-hidden", "false"); if (onReveal) onReveal(wrap);
      }
      if (now >= nextCheck && !v.seeking) {
        nextCheck = now + SYNC_EVERY_MS;
        const d = v.currentTime - at;
        // hidden (before the takeover) it may jump to the song; once it's on screen it never visibly
        // jumps (backwards least of all): it eases onto the song by its speed, unless it's a second out
        const jump = shown ? d > SYNC_JUMP_SHOWN_S || d < -SYNC_JUMP_SHOWN_S : Math.abs(d) > SYNC_SEEK_S;
        if (jump) { try { v.currentTime = at + 0.15; } catch (e) { /* not seekable yet */ } }   // (a little ahead: the jump takes a moment)
        else if (shown || at > FINALE.reveal - 0.4) {   // (not while he roars)
          const nudge = Math.abs(d) > 0.15 ? SYNC_NUDGE * 2 : SYNC_NUDGE;
          const rate = Math.abs(d) < SYNC_OK_S ? 1 : d > 0 ? 1 - nudge : 1 + nudge;
          if (v.playbackRate !== rate) v.playbackRate = rate;
        }
      }
    } else if (now >= nextGo) { nextGo = now + 300; go(); }   // (not a play() every frame)
    if (!shown && (at > FINALE.reveal + FINALE.giveUp || v.error)) { failed = true; stop(); }
  }
  // the carried rings (.tj-finaleRings, placed in screen pixels at the takeover, when the world sits exactly
  // on the video's frame) ride the camera's tracked move, through the way the frame is fitted to the screen
  let fit = null;
  function followCamera() {
    const layer = wrap.querySelector(".tj-finaleRings"); if (!layer) return;
    const tr = FINALE.track, t = Math.max(0, v.currentTime - FINALE.reveal);
    if (!fit) fit = api.frameFit(); if (!fit) return;
    let i = 0; while (i < tr.length - 2 && tr[i + 1][0] <= t) i++;
    const a = tr[i], b = tr[i + 1], f = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
    const sc = a[1] + (b[1] - a[1]) * f, tx = a[2] + (b[2] - a[2]) * f, ty = a[3] + (b[3] - a[3]) * f;
    const X = fit.k * tx + fit.ox * (1 - sc), Y = fit.k * ty + fit.oy * (1 - sc);
    layer.style.transform = `translate(${X.toFixed(1)}px, ${Y.toFixed(1)}px) scale(${sc.toFixed(4)})`;
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
  const api = {
    preload, prepare, start, stop,
    kick: go,   // (any touch after the tap may get a held-back video going)
    get active() { return active; },
    get shown() { return shown; },
    get held() { return held; },
    get failed() { return failed; },
    // where its frame sits on screen (as the video is fitted to it): the world lines itself up to this
    // before the takeover, so the first picture lands exactly over it
    frameFit() {
      const b = v.getBoundingClientRect(); if (!b.width || !b.height) return null;
      const k = (getComputedStyle(v).objectFit === "contain" ? Math.min : Math.max)(b.width / FINALE.w, b.height / FINALE.h);
      return { k, ox: b.left + (b.width - FINALE.w * k) / 2, oy: b.top + (b.height - FINALE.h * k) / 2 };
    },
    // (for ?debug)
    get state() { return { idle: idleNote, playing: !v.paused, t: +v.currentTime.toFixed(2), ready: v.readyState, rate: v.playbackRate, src: (v.src || "none").slice(0, 5) }; },
    get videoTime() { return v.currentTime; },
    destroy() { stopIdle(); cancelAnimationFrame(raf); v.removeAttribute("src"); if (blobUrl) URL.revokeObjectURL(blobUrl); wrap.remove(); },
  };
  return api;
}
