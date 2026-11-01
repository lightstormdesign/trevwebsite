// "Kingdom", one player for the whole site, so it keeps playing as people move between pages.
// 70% volume is baked into the file (iPhone ignores .volume). Its bass is a precomputed map (one
// byte per 1/30 s, trev-kingdom-beat.bin): no Web Audio runs, since on iPhone starting Web Audio
// froze the transition video mid-play (Burnell's site).
// Two cuts of it, their fades baked in (iPhone ignores .volume):
//  - the intro (Tap to Enter): the song from the top, faded to silence by 25.2s so "Welcome to my" is
//    never heard; then, on the very beat where its "kingdom" would land (27.47s), the song comes round
//    again from its first beat (the intro's own "kingdom", the same beat: 16 bars at 139.75 BPM) and
//    fades slowly away by ~51s
//  - the lion (his final tap): from 25.25s, rising over 2s through "Welcome to my", so "kingdom" and
//    the drums (the drop, 27.47s in the song) land LION_DROP_S after the tap: the roar
const SRC = "/journey/trev-kingdom-intro.m4a?v=1";   // bump with the file (phones cache it)
const LION_SRC = "/journey/trev-kingdom-lion.m4a?v=1", LION_FROM = 25.25;
export const LION_DROP_S = 2.218;   // into the lion cut: "kingdom", the drums, the roar
const BEAT_MAP = "/journey/trev-kingdom-beat.bin";
const BEAT_FPS = 30;
export const DROP_AT = 27.43; // seconds: the first bass note (nothing reacts to the beat before it)

let audio = null;
let started = false;
let beatMap = null;
const subs = new Set();
let beckoning = false;
let mode = "intro", userMuted = false;   // userMuted: they turned it off at the speaker

function el() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = "auto";
  audio.src = SRC;
  ["play", "pause", "ended"].forEach((t) => audio.addEventListener(t, emit));
  audio.addEventListener("ended", () => { started = false; emit(); });
  fetch(BEAT_MAP).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((b) => { beatMap = new Uint8Array(b); }).catch(() => {});
  return audio;
}
function emit() { subs.forEach((f) => f()); }

export const sound = {
  get playing() { return !!audio && !audio.paused; },
  get beckoning() { return beckoning && !this.playing; },
  subscribe(f) { subs.add(f); return () => subs.delete(f); },
  // from the very start (Tap to Enter, or the speaker before anything has played)
  start() {
    const a = el();
    started = true; userMuted = false;
    if (mode !== "intro") { mode = "intro"; a.src = SRC; }
    try { a.currentTime = 0; } catch (e) { /* not loaded yet: it starts at 0 anyway */ }
    return a.play().catch((err) => {
      // refused by the browser: it stays off. Anything else is the network (a slow connection):
      // the tap already unlocked it, so it comes in as soon as enough has loaded.
      if (err && err.name === "NotAllowedError") { started = false; emit(); return; }
      a.addEventListener("canplay", () => { if (started) a.play().catch(() => {}); }, { once: true });
    });
  },
  // Tap to Enter: always ends up playing (from the start if it never has)
  enter() {
    const a = el();
    if (!started) return this.start();
    if (a.paused) return a.play().catch(() => {});
    return Promise.resolve();
  },
  // the speaker
  toggle() {
    const a = el();
    if (!started) return this.start();
    if (a.paused) { userMuted = false; return a.play().catch(() => {}); }
    a.pause(); userMuted = true;
    return Promise.resolve();
  },
  // the lion's final tap (call it inside the tap): the song from just before "Welcome to my", so its
  // "kingdom" and the drums land on the roar. Not if they turned the sound off.
  lion() {
    if (userMuted) return;
    const a = el();
    mode = "lion"; started = true;
    a.src = LION_SRC;
    try { a.currentTime = 0; } catch (e) { /* starts at 0 anyway */ }
    a.play().catch(() => { mode = "intro"; });
  },
  // seconds into the lion cut (null when it isn't the lion cut that's playing, or sound is off)
  lionTime() { return audio && mode === "lion" && !userMuted ? audio.currentTime : null; },
  setBeckon(on) { beckoning = on; emit(); },
  // start downloading the song ahead of the tap (after the transition has its turn)
  preload() { el(); fetch(LION_SRC).catch(() => {}); },   // (the lion cut warms the cache, for an instant start)
  // 0..1: how hard the bass is hitting right now (0 before the drop, or when it isn't playing)
  beat() {
    if (!audio || audio.paused || !beatMap || mode !== "lion") return 0;   // (the intro never reaches the drop)
    const t = audio.currentTime + LION_FROM;
    if (t < DROP_AT) return 0;
    return (beatMap[Math.floor(t * BEAT_FPS)] || 0) / 255;
  },
};

// Phone tilt (Burnell's useTilt): how far the phone is tilted from the way it's being held, x and y
// each -1..1, the resting angle slowly re-centring. iPhone only gives motion after asking, from
// inside a tap: only the speaker (when turning the sound on) calls requestMotion(). Android needs no
// permission.
const RANGE_DEG = 10, RECENTER = 0.004;
export const tilt = { x: 0, y: 0, live: false };
let base = null, listening = false, asked = null;
function onOrient(e) {
  if (e.gamma == null || e.beta == null) return;
  tilt.live = true;
  if (!base) base = { g: e.gamma, b: e.beta };
  base.g += (e.gamma - base.g) * RECENTER; base.b += (e.beta - base.b) * RECENTER;
  tilt.x = Math.max(-1, Math.min(1, (e.gamma - base.g) / RANGE_DEG));
  tilt.y = Math.max(-1, Math.min(1, (e.beta - base.b) / RANGE_DEG));
}
function listen() { if (listening) return; listening = true; window.addEventListener("deviceorientation", onOrient); }
export function requestMotion() {
  const D = typeof window !== "undefined" && window.DeviceOrientationEvent;
  if (!D) return Promise.resolve(false);
  if (typeof D.requestPermission !== "function") { listen(); return Promise.resolve(true); }
  if (!asked) asked = D.requestPermission().then((r) => { if (r === "granted") listen(); return r === "granted"; }).catch(() => false);
  return asked;
}
if (typeof window !== "undefined") {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission !== "function") listen();   // Android: start right away
}
