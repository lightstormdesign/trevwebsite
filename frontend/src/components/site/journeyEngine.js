// TREV's journey, as plain DOM so it can run frame by frame without React re-rendering:
//   hero  — the Sedona loop (birds from the first second; the background itself never moves) with
//           TREV's real cutout on top, leaning toward the pointer / phone tilt for the depth
//   enter — a tap anywhere: the song starts (from 0.0 unless it's already playing) and the
//           transition plays at once: the camera tilts down to a rain puddle and dives into the
//           painted world, while TREV's real photo fades out over it (the artist is never in the AI
//           video itself). iPhone's motion access is only ever asked by the speaker, never here.
//   world — the video ends exactly on the world's landing frame. From LANDING_AT (6s) into the 8s
//           video it blurs and dims (to exactly the world's landing veil) while the sword, the
//           headline and the bio rise in over it (Burnell's landing). Scrolling lifts the veil and
//           descends through the world, which leans with the phone's tilt (Burnell's), and near the
//           end TREV's story takes over. After the song's drop, the sword and a soft light follow the bass.
// mountJourney(root, { start: "hero" | "world", navigate }) builds it inside `root` and returns a cleanup.
// The song and the speaker live outside it (utils/sound.js, SoundButton.jsx), so they carry across pages.
//
// iPhone lessons carried over from Burnell's site (WorldHome.jsx):
// - the transition is downloaded whole into memory once the hero is up, and only load()ed, never
//   played-and-paused to warm it up (that froze its picture partway on iOS);
// - it sits visible underneath the hero, which only lifts once a frame is actually on screen
//   (an invisible video isn't drawn on iOS, so it never reports its first frame);
// - an all-but-invisible layer sits over it while it plays (a bare full-screen video can go to a
//   direct display path that sometimes stops updating);
// - the world is mounted and loading underneath but not painted until the video ends (painted under
//   the video it starved it of memory and froze it); the video holds its last frame, blurred and
//   dimmed like the landing, until the layers are in, then fades out over the identical picture;
// - stall + frozen-picture watchdogs: resume, kick once, swap in a fresh player, else go on to the
//   world rather than sit on a frozen frame; and a failsafe timeout;
// - the beat is a precomputed map (no Web Audio), and it only moves opacity/transform: no filters
//   or blend modes change per frame.
// And from Soleil's (SoleilWorld.jsx): the page itself never scrolls. The world scrolls inside its
// own fixed frame, so Safari's toolbars never collapse and nothing jumps on the first scroll; the
// stages are max(100lvh, 100vh) tall and are measured by their own size, never the live window
// height; the copy sits in 100svh (what's visible with the toolbars showing); the vignette.
import { sound, tilt } from "@/utils/sound";
import { LAYLO_URL } from "@/data/site";

const A = "/journey/";
// Cache-buster for re-encoded media (Burnell's MEDIA_V): bump it whenever a video, the song or the
// hero stills are replaced, or phones keep showing the old files.
const MV = "?v=4";

const HERO_SETS = {
  desktop: { w: 1920, h: 1740, video: "trev-hero-desktop.mp4", poster: "trev-hero-desktop-poster.jpg",
             cut: { src: "trev-hero-cutout-desktop.webp", x: 580, y: 927, w: 923, h: 813 }, headX: 966, fx: 0.5, fy: 0.8,
             face: [930, 1255, 190, 280] },   // his face (with beard): centre and radii, in the frame's pixels
  mobile:  { w: 1080, h: 1920, video: "trev-hero-mobile.mp4", poster: "trev-hero-mobile-poster.jpg",
             cut: { src: "trev-hero-cutout-mobile.webp", x: 91, y: 1023, w: 989, h: 897 }, headX: 516, fx: 0.48, fy: 0.55,
             face: [470, 1380, 215, 320] },
};
const ENTER_AFTER_MS = 1800;   // "Tap to enter" rises this long after the portal is up
const ME_PX = 12;           // screen px TREV (the whole cutout, rigid: never stretched or scaled) shifts at full tilt;
                            // the background never moves, so he reads in front of it
const MARGIN = 70;
const FADE_ME_MS = 500;     // TREV's real photo fades out over the playing transition
// phones get 720p (Burnell's phone size): HEVC 0.9MB where it plays, else H.264 1MB; computers 1080p H.264
const TRANS = { hevc: "trev-transition-720-hevc.mp4", h264Phone: "trev-transition-720.mp4", h264: "trev-transition-mobile.mp4", w: 1080, h: 1920 };
const LANDING_AT = 6.0;     // seconds into the transition when the veil + copy begin (all in by the 8s end)
const WARM_DELAY_MS = 800, WARM_FALLBACK_MS = 3500;
const STALL_MS = 1200, FAILSAFE_MS = 11000, FRAME_WAIT_MAX_MS = 150;
const DESK_GROW_S = 1.2;      // desktop: the phone video grows from the hero's framing to full screen over this long
const ENTER_WAIT_MS = 4000;  // on a slow connection, how long a tap waits for the transition to be in memory

const CANVAS = { w: 941, h: 1672 };
const SUN_SKY_Y = 716, SUN_R = 26, RIDGE_Y = 357;
const DESCENT_SVH = 236, SCROLL_EASE = 5, PART_RANGE = 0.9;
// Burnell's tilt (WorldHome.jsx): canvas px of shift at full tilt; far layers slide one way and
// near ones the other, around the middle distance. The sword leans a little less than his emblem.
const TILT_X = 95, TILT_Y = 62, TILT_EASE = 0.12, CLOUD_TILT = 0.6, SWORD_TILT = 0.7;
const LAYERS = [
  { key: "sky",        w: 941,   x: 0,     y: -290,  from: [0, -120],  span: [0, 1],    depth: 0.04 },
  { key: "mountains",  w: 941,   x: 0,     y: 5,     from: [0, 634],   span: [0, 1],    depth: 0.1 },
  { key: "falls",      w: 941,   x: 0,     y: 160,   from: [0, 1094],  span: [0, 1],    depth: 0.18 },
  { key: "forest",     w: 941,   x: 0,     y: 45,    from: [0, 1150],  span: [0.05, 1], depth: 0.28 },
  { key: "river",      w: 941,   x: 0,     y: 425,   from: [0, 1400],  span: [0.1, 1],  depth: 0.4 },
  { key: "bison",      w: 127,   x: 406.9, y: 900.8, from: [0, 1400],  span: [0.1, 1],  depth: 0.4 },
  { key: "foreground", w: 941,   x: 0,     y: 200,   from: [0, 900],   span: [0.25, 1], depth: 0.7 },
  { key: "aspens",     w: 941,   x: -40,   y: 0,     from: [-275, 0],  span: [0, 1],    depth: 0.7 },
  { key: "juniper",    w: 799.9, x: 210,   y: 251,   from: [355, 0],   span: [0, 1],    depth: 0.7 },
];
const CLOUDS = [ // the big one keeps the sun covered at the landing, so nothing competes with the sword
  { src: "burnell-world-cloud-medium.webp", after: "sky", w: 1061, x0: 200, y0: 300, dir: -1, op: 0.97, spd: 0.32, depth: 0.25 },
  { src: "burnell-world-cloud-large.webp", after: "sky", w: 660, x0: 720, y0: 440, dir: 1, op: 0.97, flip: true, spd: 0.15, depth: 0.5 },
  { src: "trev-cloud-d.webp", ar: 0.413, after: "mountains", w: 470, x0: 330, y0: 560, dir: -1, op: 0.97, spd: 0.54, depth: 0.35 },
  // (in the transition's last frame, so it's there at the handoff; it fades out once the world is in)
  { src: "trev-cloud-b.webp", ar: 0.5, after: "mountains", w: 520, x0: 860, y0: 585, dir: 1, op: 0.9, spd: 0.37, depth: 0.35, leaves: true },
  { src: "trev-cloud-a.webp", ar: 0.457, after: "foreground", w: 520, x0: 560, y0: 690, dir: 1, op: 0.95, flip: true, spd: 0.83, depth: 1 },
];
const RIM = { x: 194, y: 302, w: 447 };
const CLOUD_LEAVE_S = [1.5, 3];
const VIG_LANDED = 0.85, VIG_BOTTOM = 0.15;   // the leaving cloud starts to go this long after the world opens, over this long
const wrap = (v, lo, hi) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

// Alive (as on Burnell's world): Burnell's swallows (his far flock, a second group, a near pair),
// then TREV's doves; a bluebird still on the juniper's lower limb until it's tapped (then it flies
// off, and is back a while later); Burnell's butterfly
// wandering over the flowers, one landed on the cactus flower (tap: it flutters about) and a small
// one far off; Burnell's golden aspen leaves tumbling down (once the trees are in); the falls running, mist breathing at their feet, glints on the pool and motes of
// light drifting up through the sun. Each lives in the coordinates
// of the layer it's part of (so it rides with that layer through the descent and the tilt), or, for
// `free` ones, in the canvas at its own depth. pose(t, p): where it is at time t (s) and descent p,
// or null when it's off stage. Kept light: small images moved and turned only; the flapping,
// fluttering, flowing, breathing and twinkling are CSS animations.
const FAR_FLOCK = [[0, 0], [-56, -22], [-56, 24], [-112, -42], [-110, 46]];   // Burnell's, exactly
const SECOND_FLOCK = [[0, 0], [-56, -22], [-56, 24], [-112, -42]];
const NEAR_FLOCK = [[0, 0], [95, -34]];
// TREV's white doves: a third flock, first crossing ~12s after the world opens (after Burnell's
// swallows have been through), then every 36s
const DOVE_FLOCK = [[0, 0], [-62, -26], [-70, 30]];
const DOVES_AT_S = 12, DOVES_EVERY_S = 45, DOVES_CROSS_S = 14;
// flap pairs (two frames drawn eye on eye) and their sizes
const FLYER = { swallow: [1, 0.75], dove: [260, 213], bluebird: [240, 218] };
// Burnell's falling aspen leaves, exactly (his LEAVES: leaf, layer it falls behind, depth, width, x,
// start offset, phase); his meadow / forest-far are TREV's foreground / forest
const LEAVES = [
  [4, "foreground", 1, 120, 180, 0, 0], [2, "foreground", 1, 105, 760, 1100, 2.1],
  [1, "forest", 0.6, 78, 560, 400, 4.2], [3, "forest", 0.6, 70, 250, 1500, 1.3],
  [4, "mountains", 0.35, 46, 700, 900, 3.3], [3, "mountains", 0.35, 42, 330, 200, 5.1],
];
const OWL = { x: 166, y: 482, w: 71 };   // on the aspens' branch, halfway up the grove (aspens layer coordinates)
const PERCH = { x: 572, y: 384, w: 106 }; // the bluebird, up on the juniper's high branch
// The lolo (the Madagascan sunset moth, a totem): it begins as a cocoon hanging from the juniper's
// upper branch; tapped, the cocoon pulses gold and splits, the moth unfolds its wings as light sweeps
// across them, then settles on the branch (juniper coordinates). After that a tap sends it fluttering.
const COCOON_AT = [541, 661], COCOON_W = 120;   // hanging from the juniper's lower limb
const BUTTERFLY_FLY_S = 9, HATCH_S = [1.3, 2.4];   // [unfolding, gliding down to the water]
// where Burnell's big butterfly used to wander, over the water (juniper coordinates), and its rest
// on the cactus flower once the lion forms (the roar sends it up from there)
const mothWander = (t) => ({ x: 135 + 1.2 * (60 * Math.sin(t * 0.55) + 18 * Math.sin(t * 1.7)), y: 1074 + 38 * Math.sin(t * 0.85), rot: 10 * Math.cos(t * 0.55) });
const MOTH_REST = [600, 1232];
const OWL_LOOK_MS = 600, OWL_HOLD_MS = 4200;
// One beat at a time, on the world's clock (T, seconds since the world opened), every 15s: the near
// flock crosses (every other beat).
const BEAT_S = 15, FLOCK_S = [0, 11], PUSHUP_S = [12, 13.2];
const inBeat = (T, [a, b]) => { const s = ((T % BEAT_S) + BEAT_S) % BEAT_S; return s >= a && s < b; };
// The salmon (a totem): once every SALMON_EVERY_S, when the near flock isn't crossing, a glint on the
// pool, then it leaps (rising, peak, diving poses) and is swallowed back under; tap it mid-leap to
// catch it. It's drawn in a window whose bottom edge is the water's surface (river coordinates).
const POOL = { x: 180, y: 560, w: 520, h: 270 }, SALMON_AT = 19, SALMON_EVERY_S = 30, SALMON_LEAP_S = 1.6;
const SALMON_X = [110, 300], SALMON_DEPTH = 40, SALMON_RISE = 640, SALMON_W = 150;
const SALMON_SURF_U = (1 - Math.sqrt(1 - 4 * SALMON_DEPTH / SALMON_RISE)) / 2;
const salmonU = (T) => { const s = ((T % SALMON_EVERY_S) + SALMON_EVERY_S) % SALMON_EVERY_S; return (s - SALMON_AT) / SALMON_LEAP_S; };
// the bison's abundance: flowers that bloom in the grass around its hooves when it's called
// ([x %, y % of the ground ring, size, delay s, petal colour])
const BLOOMS = [[0, 64, 1, .35, "#fff6e6"], [14, 26, .8, .5, "#ffe2a8"], [30, 84, 1.1, .2, "#fff6e6"], [46, 14, .75, .65, "#ffd9e4"],
  [60, 90, 1, .3, "#fff6e6"], [76, 28, .9, .55, "#ffe2a8"], [92, 74, 1.05, .25, "#ffd9e4"], [106, 42, .8, .7, "#fff6e6"],
  [-16, 36, .75, .8, "#ffe2a8"], [118, 70, .75, .75, "#fff6e6"], [22, 56, .7, .9, "#ffd9e4"], [72, 60, .75, .95, "#ffe2a8"],
  [-26, 74, .65, 1, "#fff6e6"], [128, 30, .65, 1.05, "#ffd9e4"]];
const BLOOM_SVG = '<svg viewBox="-12 -12 24 24"><g>' + Array.from({ length: 5 }, (_, i) =>
  `<ellipse rx="3.4" ry="6" cy="-5.6" transform="rotate(${i * 72})" fill="var(--c)" stroke="rgba(214,170,90,.7)" stroke-width=".5"/>`).join("")
  + '</g><circle r="2.6" fill="#f2b84a"/><circle r="1.2" fill="#fff3c4"/></svg>';
const FLOWER_TILE = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-30 -26 60 52\"><g fill=\"none\" stroke=\"#ffd27a\" stroke-width=\".6\"><circle r=\"10\"/><circle r=\"10\" cx=\"10\"/><circle r=\"10\" cx=\"-10\"/><circle r=\"10\" cx=\"5\" cy=\"8.66\"/><circle r=\"10\" cx=\"-5\" cy=\"8.66\"/><circle r=\"10\" cx=\"5\" cy=\"-8.66\"/><circle r=\"10\" cx=\"-5\" cy=\"-8.66\"/></g></svg>";   // the owl's sight: a tiling Flower of Life
const GLINTS = [[300, 865], [450, 875], [600, 865], [420, 1035]];
const CREATURES = [
  // Burnell's far flock, exactly as on his world
  ...FAR_FLOCK.map(([dx, dy], i) => ({ kind: "bird", bird: "swallow", layer: "mountains", w: 44, flap: 0.3 + i * 0.035,
    pose: (t) => { const u = (t / 34 + 0.12) % 1; return { x: -140 + u * 1240 + dx, y: 250 + dy + 7 * Math.sin(t * 1.1 + i) }; } })),
  // the second group: enters the sky as the world opens, a little lower
  ...SECOND_FLOCK.map(([dx, dy], i) => ({ kind: "bird", bird: "swallow", layer: "mountains", w: 40, flap: 0.32 + i * 0.035,
    pose: (t, p, c, T) => { const u = (T / 42.5 + 0.1) % 1; return { x: -140 + u * 1240 + dx, y: 340 + dy + 7 * Math.sin(t * 1.2 + i) }; } })),
  ...NEAR_FLOCK.map(([dx, dy], i) => ({ kind: "bird", bird: "swallow", flip: true, layer: "forest", w: 84, flap: 0.26 + i * 0.04,
    pose: (t, p, c, T) => { const u = ((T % (2 * BEAT_S)) - FLOCK_S[0]) / (FLOCK_S[1] - FLOCK_S[0]); if (u < 0 || u > 1) return null;
      return { x: 1150 - u * 1500 + dx, y: 300 + dy + 10 * Math.sin(t * 1.5 + i) }; } })),
  ...DOVE_FLOCK.map(([dx, dy], i) => ({ kind: "bird", bird: "dove", layer: "mountains", w: 56, flap: 0.42 + i * 0.04,
    pose: (t, p, c) => {
      if (!c.t0) c.t0 = t;   // the world's own clock
      const s = t - c.t0 - DOVES_AT_S; if (s < 0) return null;
      const u = (s % DOVES_EVERY_S) / DOVES_CROSS_S; if (u > 1) return null;
      return { x: -160 + u * 1260 + dx, y: 390 + dy - 60 * u + 8 * Math.sin(t * 1.2 + i) };
    } })),
  { kind: "falls", layer: "falls", x: 318, y: 440, w: 297, h: 372, pose: () => ({ x: 318, y: 440 }) },
  ...[[455, 565, 170, 0], [535, 805, 210, 2.2], [335, 748, 90, 4.1]].map(([x, y, w, d]) =>
    ({ kind: "mist", layer: "falls", w, delay: d, pose: () => ({ x, y }) })),
  ...GLINTS.map(([x, y], i) => ({ kind: "glint", layer: "river", w: 16 + (i % 3) * 5, delay: (i * 0.77) % 3.4, pose: () => ({ x, y }) })),
  { kind: "butterfly", layer: "forest", w: 30, pose: (t) => ({ x: 650 + 70 * Math.sin(t * 0.55 + 2.1) + 20 * Math.sin(t * 1.7 + 2.1),
    y: 1000 + 30 * Math.sin(t * 0.85 + 4.2), rot: 10 * Math.cos(t * 0.55 + 2.1) }) },
  { kind: "cocoon", layer: "juniper", w: COCOON_W, pose: (t, p, c) => (c.gone ? null : { x: COCOON_AT[0], y: COCOON_AT[1] }) },
  { kind: "butterfly", landed: true, layer: "juniper", w: 100, pose: (t, p, c) => {
    if (!c.emerged) {
      if (!c.hatchAt) return null;
      const d = t - c.hatchAt;
      if (d < HATCH_S[0]) return { x: COCOON_AT[0], y: COCOON_AT[1] + 4, scale: 0.55 + 0.45 * smooth(d / HATCH_S[0]), flying: false };
      const u = (d - HATCH_S[0]) / HATCH_S[1], e = smooth(u), w = mothWander(t);
      if (u >= 1) { c.emerged = true; c.el.classList.remove("unfolding"); return { ...w, flying: true }; }
      return { x: COCOON_AT[0] + (w.x - COCOON_AT[0]) * e, y: COCOON_AT[1] + 4 + (w.y - COCOON_AT[1] - 4) * e - 60 * Math.sin(Math.PI * e),
        rot: w.rot * e, flying: u > 0 };
    }
    // free, it drifts over the water; once the lion forms it comes to rest on the cactus flower
    const base = c.home ? { x: MOTH_REST[0], y: MOTH_REST[1], rot: 0 } : mothWander(t);
    if (c.returnAt) {
      const u = (t - c.returnAt) / RETURN_S;
      if (u >= 1 || u < 0) c.returnAt = 0;
      else { const e = smooth(u); return { x: base.x + c.fromDx * (1 - e), y: base.y + c.fromDy * (1 - e), flying: true }; }
    }
    const d = c.flyAt ? t - c.flyAt : -1;
    if (d < 0 || d > BUTTERFLY_FLY_S) { c.flyAt = 0; return { ...base, flying: !c.home }; }
    const e = smooth(d / 1.2) * smooth((BUTTERFLY_FLY_S - d) / 1.5);   // lifts off, loops wide, comes back down
    return { x: base.x + e * (-150 + 150 * Math.cos(d * 0.8) + 40 * Math.sin(d * 2.3)),
      y: base.y - e * (130 + 60 * Math.sin(d * 1.3)), rot: base.rot + e * 12 * Math.cos(d * 0.9), flying: true };
  } },
  ...LEAVES.map(([n, after, depth, w, x0, off, ph]) => ({ kind: "leaf", src: `trev-world-bleaf-${n}.webp`, after, depth, w,
    pose: (t, p) => ({
      x: x0 + 70 * Math.sin(t * 0.5 + ph) + 25 * Math.sin(t * 1.3 + ph * 2),
      y: wrap(off + t * (45 + 95 * depth) - p * (250 + 650 * depth), -220, 1890),
      rot: 30 * Math.sin(t * 0.7 + ph) + ph * 40,
      flip: Math.cos(t * (1.1 + 0.4 * depth) + ph),
      op: (depth < 0.5 ? 0.85 : 1) * smooth((p - 0.45) / 0.2),   // only once the trees have come in
    }) })),
  { kind: "perch", layer: "juniper", w: PERCH.w, pose: (t, p, c) => {
    if (c.returnAt) {   // called home (the lion's moment): flies in from the right onto its branch
      const u = (t - c.returnAt) / RETURN_S;
      if (u >= 1 || u < 0) c.returnAt = 0;
      else { const e = smooth(u); return { x: PERCH.x + 430 * (1 - e), y: PERCH.y - 170 * (1 - e) - 40 * Math.sin(Math.PI * e), flying: true, face: -1 }; }
    }
    const d = c.flyAt ? t - c.flyAt : -1;
    if (d < 0) return { x: PERCH.x, y: PERCH.y, flying: false };
    if (d < 2.6) { const e = Math.pow(d / 2.6, 1.5);
      return { x: PERCH.x - 760 * e, y: PERCH.y - 420 * e + 22 * Math.sin(d * 9) * (1 - e), flying: true, face: -1 }; }
    if (d < 18) return null;
    if (d > 19) c.flyAt = 0;                              // back on its branch
    return { x: PERCH.x, y: PERCH.y, flying: false, op: Math.min(1, d - 18) };
  } },
  { kind: "owl", layer: "aspens", w: OWL.w, pose: () => ({ x: OWL.x, y: OWL.y }) },
  { kind: "aspen", layer: "aspens", w: 230, pose: () => ({ x: 120, y: 800 }) },
  { kind: "salmon", layer: "river", w: POOL.w, pose: (t, p, c, T) => {
    const u = salmonU(T);
    if (u < -0.55 || u > 1) return null;
    return { x: POOL.x, y: POOL.y, u };
  } },
  // the glint before it breaks the surface, and the splash where it goes in and comes out
  ...[[-0.5, SALMON_X[0]], [SALMON_SURF_U, SALMON_X[0] + (SALMON_X[1] - SALMON_X[0]) * SALMON_SURF_U],
    [1 - SALMON_SURF_U, SALMON_X[0] + (SALMON_X[1] - SALMON_X[0]) * (1 - SALMON_SURF_U)]].map(([at, x], i) =>
    ({ kind: "splash", layer: "river", w: i ? 120 : 70, glint: !i, pose: (t, p, c, T) => {
      const r = (salmonU(T) - at) * SALMON_LEAP_S / (i ? 1.1 : 0.7);
      if (r < 0 || r > 1) return null;
      return { x: POOL.x + x, y: POOL.y + POOL.h, scale: i ? 0.25 + 0.95 * r : 0.6 + 0.6 * Math.sin(Math.PI * r), op: i ? (1 - r) * 0.9 : Math.sin(Math.PI * r) };
    } })),
  { kind: "roarwave", layer: "bison", w: 150, pose: () => ({ x: 110, y: -2 }) },                // behind the lion
  { kind: "lion", layer: "bison", w: 156.5, pose: () => ({ x: 66, y: 54 }) },
  { kind: "roarwave", layer: "bison", top: true, over: true, w: 150, pose: () => ({ x: 110, y: -2 }) },   // faint, over him
  { kind: "rainbow", layer: "falls", w: 760, pose: () => ({ x: 470, y: 470 }) },
  ...[[330, 880], [470, 900], [600, 870], [400, 1030], [540, 960]].map(([x, y], i) =>
    ({ kind: "ripple", layer: "river", w: 70, delay: i * 0.45, pose: () => ({ x, y }) })),
  ...Array.from({ length: 9 }, (_, i) => ({ kind: "firefly", after: "foreground", depth: 0.7, w: 9, delay: i * 0.7,
    pose: (t) => ({ x: 120 + ((i * 271) % 700) + 40 * Math.sin(t * 0.37 + i * 1.7), y: 900 + ((i * 193) % 520) + 30 * Math.sin(t * 0.53 + i) }) })),
  ...Array.from({ length: 5 }, (_, i) => ({ kind: "mote", after: "foreground", depth: 0.7, w: 7 + (i % 3) * 3, delay: i * 0.6,
    pose: (t, p) => ({ x: 120 + ((i * 263) % 700) + 22 * Math.sin(t * 0.4 + i), y: wrap(1500 - ((i * 397) % 1300) - t * 14 - p * 500, 150, 1650) }) })),
];
const BISON_TAP_S = 4;      // a tap lights the bison's aura this long (Burnell's deer: TAP_S)
// Flower of Life centres: a hexagonal lattice of circles out to three rings (as on Burnell's deer)
const FLOWER = (() => {
  const pts = [];
  for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) {
    if (Math.abs(q + r) > 3) continue;
    pts.push([10 * (q + r / 2), 10 * r * Math.sin(Math.PI / 3)]);
  }
  return pts;
})();

// TREV's story (the About copy, his own words). It opens on him in Sedona, hand on heart, and closes
// on him pulling the sword from the stone. It only starts once the whole world is in view and you've
// had a moment with it (STORY_HOLD_SVH past the end of the descent).
const STORY = [
  { cover: true, eyebrow: "About", title: "My Story", media: "story-00-heart.webp", pos: "50% 55%" },
  { lead: "This whole thing started the day I quit music.", media: "story-01-quit-music.webp" },
  { title: "The First Dream", media: "story-02-first-dream.webp", body: [
    "Basketball was my religion and Michael Jordan was God. Then I didn't make the high school team. The coach was the bishop, and every kid he picked was from his church.",
    "My first lesson on the “Kingdom of Heaven”: it was an exclusive club, and I wasn't chosen."] },
  { title: "The Second Dream", media: "story-03-the-room.webp", body: [
    "If I couldn't find God in basketball, I'd find it through hip-hop. I locked myself in my room to meditate and write until I became the best rapper in the world.",
    "But I was caught in cycles of addiction, and I wasn't building anything."] },
  { title: "The Leap", media: "story-04-the-leap.webp", body: [
    "Years later, a few videos took off: over a million views, opening for artists I idolized. Believing “if you jump, the net will appear,” we took a one-way flight to Costa Rica.",
    "The net was a mirage. And maybe I was too."] },
  { title: "Rise Free", media: "story-05-kingdom-sign.webp", pos: "50% 30%", body: [
    "I gave up on music and ended up in my mom's basement, working night shifts at the post office. My dream was dead for a second time.",
    "In that basement I finally understood: no label, no manager, no miracle was coming. I was the one I'd been waiting for.",
    "So I wrote my way out."] },
  { title: "Making It", media: "story-06-the-crowd.webp", body: [
    "I started to build. I saved post office checks for my first tour and did every job myself.",
    "After that tour, I wasn't trying to “make it” anymore. I WAS making it."] },
  { title: "Create Who I Am", media: "story-11-within.webp", body: [
    "I finally understood The Lion King. The mission wasn't just to remember who I am. It was to CREATE who I am."] },
  { title: "My Own Kingdom", media: "story-09-the-reward.webp", video: "story-09-the-reward.mp4", body: [
    "I stopped seeking a kingdom and started building my own. Now I tour internationally and live from my music."] },
  { title: "My Name Is TREV", media: "story-10-my-name.webp", body: [
    "I come with the infinite power of the spoken word. Every song is medicine made from my journey, a prayerformance for the man I needed during my own dark night of the soul."] },
  { title: "The Kingdom Within", media: "story-08-sword.webp", pos: "50% 45%", lead: "The Kingdom of Heaven is within.",
    cta: "Get High-Vibe Texts", ctaNote: "Unreleased music, new shows and messages from TREV, first." },
];
const BUBBLE_AFTER_MS = 10000;
const ROAR_MS = 3200;
// the climax: everything settles (FOCUS_MS) before the lion may roar; the finale clip would start
// FINALE_AFTER_MS into the roar, once the shake and the ripples have settled on the still frame
const FOCUS_MS = 120, FINALE_AFTER_MS = 2000, CHARGE_MS = 380, SETTLE_MS = 450, RETURN_S = 1.6;
// simple line icons of each totem's face, drawn in gold
const TOTEM_ICON = Object.fromEntries(Object.entries({"bison": "<path d=\"M7 7.2C5 7.2 3.4 5.6 3.6 3.4M17 7.2c2 0 3.6-1.6 3.4-3.8\"/><path d=\"M7 7.2c1.5-.9 3-1.3 5-1.3s3.5.4 5 1.3c.8 2.5.5 5.1-1 7.5l-1.5 3.1c-.6 1.2-1.5 1.8-2.5 1.8s-1.9-.6-2.5-1.8L8 14.7C6.5 12.3 6.2 9.7 7 7.2z\"/><circle cx=\"9.6\" cy=\"10.6\" r=\".6\" fill=\"currentColor\"/><circle cx=\"14.4\" cy=\"10.6\" r=\".6\" fill=\"currentColor\"/><path d=\"M10.6 17.2h2.8\"/>", "bluebird": "<path d=\"M4.5 14c2-4 6-6 9.8-5 1.9.5 3 1.9 3.5 3.3L21 12l-3.1 1.6c-.6 2.9-3.1 4.9-6.6 4.9-3.4 0-5.6-1.7-6.8-4.5z\"/><path d=\"M8.8 13.4c2-1.2 4.2-1.2 6 .1\"/><path d=\"M4.5 14l-2.3 2.4\"/><circle cx=\"16\" cy=\"11\" r=\".6\" fill=\"currentColor\"/>", "butterfly": "<path d=\"M12 8v10\"/><path d=\"M12 9.5C9.3 4.6 4.2 4.6 4.2 8.2c0 3 4 4.6 7.8 3.2\"/><path d=\"M12 9.5c2.7-4.9 7.8-4.9 7.8-1.3 0 3-4 4.6-7.8 3.2\"/><path d=\"M12 12.4c-2.8.7-5.5 2.6-4.8 5.1.7 2.4 3.6-.7 4.8-3.4\"/><path d=\"M12 12.4c2.8.7 5.5 2.6 4.8 5.1-.7 2.4-3.6-.7-4.8-3.4\"/><path d=\"M11.6 8.2L10 5.4M12.4 8.2L14 5.4\"/>", "owl": "<path d=\"M6.2 5.2l1.9 2.9M17.8 5.2l-1.9 2.9\"/><path d=\"M6 8.3c0-.8 2.6-1.7 6-1.7s6 .9 6 1.7v6c0 4-2.7 7-6 7s-6-3-6-7z\"/><circle cx=\"9.3\" cy=\"11.3\" r=\"2.1\"/><circle cx=\"14.7\" cy=\"11.3\" r=\"2.1\"/><path d=\"M12 13.4l-.8 1.2h1.6z\"/>", "lion": "<path d=\"M12 2.8c.9 1 1.3 2 1.2 3M12 2.8c-.9 1-1.3 2-1.2 3M9.3 4.2c.4 1.2 1.1 2 2 2.4M14.7 4.2c-.4 1.2-1.1 2-2 2.4\"/><path d=\"M9 5.6C6.6 6 4.8 8 4.6 10.6c-.2 2.4.8 4.6 2.6 6.1l1.8 1.6L12 21.4l3-3.1 1.8-1.6c1.8-1.5 2.8-3.7 2.6-6.1C19.2 8 17.4 6 15 5.6\"/><path d=\"M8.4 9.2c1-1.1 2.2-1.6 3.6-1.6s2.6.5 3.6 1.6v3.2c0 2-1.6 3.8-3.6 3.8s-3.6-1.8-3.6-3.8z\"/><circle cx=\"12\" cy=\"9.3\" r=\".9\"/><path d=\"M9.7 11.3l1.2.3M14.3 11.3l-1.2.3\"/><path d=\"M11.1 13.2h1.8l-.9 1z\"/><path d=\"M12 14.2v.7M11 15.4c.3.3.6.4 1 .4s.7-.1 1-.4\"/>", "salmon": "<path d=\"M3.5 12c2.4-3.4 6-5.2 10-5.2 2.8 0 4.9 1.4 6.5 3.2-1.6 1.8-3.7 3.2-6.5 3.2-1 0-2-.1-2.9-.4\"/><path d=\"M3.5 12c2.4 3.4 6 5.2 10 5.2 2.8 0 4.9-1.4 6.5-3.2\"/><path d=\"M3.5 12l-1.8-2.6M3.5 12l-1.8 2.6\"/><circle cx=\"16.6\" cy=\"10.8\" r=\".6\" fill=\"currentColor\"/><path d=\"M11 7.4l1.6-2.1M10 16.6l1.4 1.8\"/>"}).map(([k, d]) =>
  [k, `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`]));
const RAIN_MS = 6500, RAINBOW_MS = 9000, NIGHT_AFTER_MS = 2500;
const PROGRESS_IDLE_MS = 2200, MOUSE_LEAN = 0.6;
const STORY_HOLD_SVH = 65, STEP_SVH = 70, TAIL_SVH = 40;
const STORY_START_SVH = DESCENT_SVH + STORY_HOLD_SVH;

const NAV = [["Home", "/"], ["About", "/about"], ["Music", "/music"], ["Community", "/community"], ["Tour", "/tour"],
  ["Shop", "/shop"], ["EPK", "/epk"], ["Contact", "/contact"]];

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };

// A video stays invisible until it's actually playing, so iPhone's play button (shown when autoplay is
// held back, e.g. Low Power Mode) never appears; the still under it shows instead.
function showWhenPlaying(v) {
  v.addEventListener("playing", () => afterFirstFrame(v, () => v.classList.remove("tj-hidden")), { once: true });
}

// Run cb once the video has actually put a frame on screen: a presented frame, playback moving
// past zero, or a short timeout, whichever comes first (iOS doesn't always report frames).
function afterFirstFrame(v, cb) {
  let done = false;
  const go = () => { if (done) return; done = true; v.removeEventListener("timeupdate", onTime); clearTimeout(t); cb(); };
  const onTime = () => v.currentTime > 0 && go();
  v.addEventListener("timeupdate", onTime);
  const t = setTimeout(go, FRAME_WAIT_MAX_MS);
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(go);
}

export function mountJourney(root, { start = "hero", navigate } = {}) {
  const off = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); off.push(() => target.removeEventListener(type, fn, opts)); };
  const timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mouse = matchMedia("(hover: hover)").matches;
  let raf = 0, phase = start === "world" ? "world" : "hero";
  const sword = `${A}trev-sword.webp`;
  const enterLabel = `${mouse ? "Click" : "Tap"} to enter`;

  root.classList.add("tj");
  root.innerHTML = `
    <div class="tj-scroller"><div class="tj-track"></div></div>
    <div class="tj-svh" aria-hidden="true"></div>
    <div class="tj-worldStage" ${phase === "hero" ? 'style="visibility:hidden"' : ""}>
      <div class="tj-side"></div>
      <div class="tj-world"></div>
      <div class="tj-shade"></div>
      <div class="tj-night" aria-hidden="true"><i class="tint"></i><i class="stars"></i><i class="stars b"></i></div>
      <div class="tj-dawn" aria-hidden="true"></div>
      <div class="tj-sight" aria-hidden="true" style="background-image:url('data:image/svg+xml;utf8,${encodeURIComponent(FLOWER_TILE)}')"></div>
      <div class="tj-rain" aria-hidden="true"><i class="dark"></i><i class="drops" style="background-image:url(${A}trev-world-rain.webp)"></i><i class="drops b" style="background-image:url(${A}trev-world-rain.webp)"></i></div>
    </div>
    ${phase === "hero" ? `
    <div class="tj-trans"><div class="tj-transSide"></div><video class="tj-tv" muted playsinline preload="none" tabindex="-1"></video><div class="tj-keep" hidden></div></div>
    <div class="tj-hero">
      <div class="tj-box">
        <img class="tj-plate tj-plateStill" alt="">
        <video class="tj-plate tj-hidden" muted loop playsinline autoplay preload="auto"></video>
        <canvas class="tj-me"></canvas>
        <img class="tj-meImg" alt="TREV" hidden>
      </div>
      <div class="tj-grade"></div>
    </div>` : ""}
    <div class="tj-vignette" aria-hidden="true"><div class="sides"></div><div class="top"></div></div>
    <div class="tj-lionFocus" aria-hidden="true"></div>
    <div class="tj-story"><div class="tj-storyShade"></div></div>
    <div class="tj-landing">
      <div class="tj-landingCol">
        <div class="tj-emblem" style="--sword:url(${sword})">
          <span class="halo" aria-hidden="true"></span>
          <div class="tj-swordTilt">
            <img class="glow" src="${sword}" alt="" aria-hidden="true">
            <img class="beat" src="${sword}" alt="" aria-hidden="true">
            <img class="face" src="${sword}" alt="TREV">
            <span class="glint" aria-hidden="true"></span>
          </div>
        </div>
        <div class="tj-landingText">
          <h1>Music for the<br><span class="tj-gold">Kingdom Within</span></h1>
          <span class="sub">Conscious Hip-Hop</span>
          <p>TREV makes music from the heart, using masterful lyricism and the power of the spoken word to inspire authenticity and the courage to stand in the knowing of all that we are.</p>
        </div>
      </div>
      <div class="tj-cue">
        <div class="tj-cueInner">
          <span class="pool" aria-hidden="true"></span>
          <span class="label">Scroll to Explore</span>
          <span class="capsule" aria-hidden="true"><span class="drop"></span></span>
          <span class="chevrons" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation-delay:.25s"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
      </div>
    </div>
    ${phase === "hero" ? `<div class="tj-enterLayer"><button class="tj-enter" type="button" aria-label="${enterLabel}"><span class="halo"></span><span class="glow" aria-hidden="true">${enterLabel}</span><span class="word tj-gold" aria-hidden="true">${enterLabel}</span></button></div>` : ""}
    <a class="tj-bubble" href="${LAYLO_URL}" target="_blank" rel="noopener noreferrer" aria-label="Get high-vibe texts from TREV">
      <span class="tj-bubbleIcon" aria-hidden="true">✦</span>
      <span class="tj-bubbleText"><b>High-vibe texts from TREV</b><span>Unreleased music &amp; new shows, first</span></span>
      <button class="tj-bubbleClose" type="button" aria-label="Close">&times;</button>
    </a>
    <div class="tj-progress" aria-hidden="true"><div class="tj-progressHint"><span>Keep scrolling</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div>
      <div class="tj-progressLine"><i class="tj-progressFill"></i><i class="tj-progressDrop"></i></div></div>
    <div class="tj-totems">${["bison", "bluebird", "butterfly", "owl", "salmon"].map((k) => `<span class="tj-totem" data-k="${k}">${TOTEM_ICON[k]}</span>`).join("")}
      <button class="tj-totem tj-lionTotem" type="button" aria-label="The white lion">${TOTEM_ICON.lion}</button></div>
    <div class="tj-awaken" aria-hidden="true"><i class="sweep"></i><p>The Kingdom is <span class="tj-gold">awake</span><small>The white lion rises</small></p></div>
    <div class="tj-dust" aria-hidden="true"></div>
    <header class="tj-header">
      <div class="tj-headLeft">
        <span class="tj-soundSlot" aria-hidden="true"></span>
        <a class="tj-name" href="/"><img src="${A}trev-logo-letters.webp" alt="TREV"></a>
      </div>
      <button class="tj-menuBtn" type="button" aria-label="Open menu"><span></span><span></span><span></span></button>
    </header>
    <nav class="tj-menu" hidden>
      <button class="tj-menuClose" type="button" aria-label="Close menu">&times;</button>
      ${NAV.map(([l, h]) => `<a href="${h}">${l}</a>`).join("")}
    </nav>`;
  const $ = (s) => root.querySelector(s);

  // ---------- header + menu (client-side navigation) ----------
  const menu = $(".tj-menu");
  const go = (e, to) => { e.preventDefault(); menu.hidden = true; if (navigate) navigate(to); else window.location.href = to; };
  on($(".tj-menuBtn"), "click", () => { menu.hidden = false; });
  on($(".tj-menuClose"), "click", () => { menu.hidden = true; });
  on(menu, "click", (e) => { const a = e.target.closest("a"); if (a) go(e, a.getAttribute("href")); });
  on($(".tj-name"), "click", (e) => go(e, "/"));

  // once the landing is fully in, a muted speaker glows gold and rises a touch to invite a press
  const beckon = () => sound.setBeckon(true);
  off.push(() => sound.setBeckon(false));

  // ---------- Soleil's: the page never scrolls, the world scrolls inside its own fixed frame ----------
  const docEl = document.documentElement;
  const scroller = $(".tj-scroller"), track = $(".tj-track"), svhEl = $(".tj-svh");
  docEl.style.overflow = "hidden"; docEl.style.overscrollBehaviorY = "none"; document.body.style.overscrollBehaviorY = "none";
  off.push(() => { docEl.style.overflow = ""; docEl.style.overscrollBehaviorY = ""; document.body.style.overscrollBehaviorY = ""; });
  const Hs = () => svhEl.clientHeight || innerHeight;   // the visible screen with Safari's toolbars showing
  off.push(() => docEl.classList.remove("tj-bison-hover"));

  // ======================================================================================
  // WORLD
  // ======================================================================================
  const worldStage = $(".tj-worldStage"), world = $(".tj-world");
  const landing = $(".tj-landing"), shade = $(".tj-shade");
  const swordTilt = $(".tj-swordTilt"), swordBeat = $(".tj-emblem .beat"), vignette = $(".tj-vignette");
  const storyEl = $(".tj-story");
  let worldBuilt = false, layersLoaded = 0, layersReady = false;
  const layersWanted = LAYERS.length + CLOUDS.length + 1;
  const sunsetEl = document.createElement("canvas"); sunsetEl.width = 941; sunsetEl.height = 1672;
  const sctx = sunsetEl.getContext("2d");
  const rimEl = document.createElement("img");
  const slides = [];

  function onLayer() { if (++layersLoaded >= layersWanted) layersReady = true; }
  // The white bison, with Burnell's deer treatment in gold and white: a slow golden glow and a faint
  // open Flower of Life turning behind it, a fine gold outline and a soft shadow just behind its
  // silhouette (masked copies, not filters, so scrolling stays smooth), and its outline pulsing out
  // into the world. Hover (or a tap, for BISON_TAP_S) brightens it all and widens the aura.
  // the golden aura + Flower of Life behind a sacred animal (the bison, the bluebird): each turns
  // slowly, and swells a little above its resting glow and back every 5s, so it reads as tappable
  const sacredAura = () => `<div class="aura" aria-hidden="true"><div class="glow"><i></i></div><div class="geo">`
    + `<svg viewBox="-60 -60 120 120" preserveAspectRatio="xMidYMid meet"><g fill="none" stroke="rgba(255,236,190,1)" stroke-width="0.3">`
    + FLOWER.map(([x, y]) => `<circle r="10" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}"/>`).join("") + `</g></svg></div></div>`;
  let bison = null;
  function bisonRig(L) {
    const src = `${A}w3-bison-body.webp`, tail = `${A}w3-bison-tail.webp`;
    const rig = document.createElement("div");
    rig.className = "tj-bison"; rig.style.width = L.w + "px";
    rig.style.setProperty("--sil", `url("${src}")`); rig.style.setProperty("--tail", `url("${tail}")`);
    rig.style.setProperty("--silAway", `url("${A}w3-bison-away.webp")`);
    rig.innerHTML = `
      ${sacredAura()}
      <div class="pulse" aria-hidden="true"></div><div class="pulse" aria-hidden="true" style="animation-delay:2s"></div>
      <div class="groundRing" aria-hidden="true"><i></i><i></i><div class="flat">${Array.from({ length: 9 }, (_, i) => `<b style="--a:${i * 40}deg;--d:${(0.15 + (i % 3) * 0.12).toFixed(2)}s"></b>`).join("")}</div>
        ${BLOOMS.map(([x, y, s, d, c]) => `<u style="left:${x}%;top:${y}%;--s:${s};--d:${d}s;--c:${c}">${BLOOM_SVG}</u>`).join("")}</div>
      <div class="shadow" aria-hidden="true"></div><div class="outline" aria-hidden="true"></div>
      <div class="tail" aria-hidden="true"><div class="tailOutline"></div><img class="tailImg" src="${tail}" alt="" decoding="async"></div>
      <img class="body" alt="The white bison" decoding="async">
      <img class="awayImg" src="${A}w3-bison-away.webp" alt="" decoding="async">`;
    const body = rig.querySelector(".body");
    body.addEventListener("load", onLayer, { once: true }); body.addEventListener("error", onLayer, { once: true });
    body.src = src;
    bison = rig;
    return rig;
  }
  // Everything visual sits above the scroller and lets touches through, so the page listens and
  // checks the bison's box (with a margin: it's small on a phone). Touch and pointer both, as
  // iPhone doesn't always send pointer events.
  let bisonTapAt = -1e9, bisonHover = false, bisonOnTimer = 0;
  const overBison = (x, y, margin) => {
    if (!bison || phase !== "world") return false;
    if (lionMode) return overLion(x, y);
    const r = bison.getBoundingClientRect(); if (!r.width) return false;
    const pad = Math.max(margin, r.width * 0.25);
    return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
  };
  // Once every totem is awake the world lights up, the totems leave the row, the bison transforms into
  // the white lion and the lion alone takes the row, twice the size. Tap the lion (in the world or in
  // the row): it roars to the sky, the world shakes and the sky flares gold, and (once it's made) the
  // finale into the lion's eye begins.
  let lion = null, lionMode = false, roaring = false;
  const overLion = (x, y) => {
    if (!lion || !lionMode) return false;
    const r = lion.el.firstChild.getBoundingClientRect(); if (!r.width) return false;
    return x > r.left && x < r.right && y > r.top + r.height * 0.1 && y < r.bottom;
  };
  function transform() {
    if (lionMode) return;
    lionMode = true; bison.classList.add("is-on");   // the bison turns to you, aura blazing, then...
    root.classList.add("transforming");
    callHome();   // the bluebird, butterfly and owl come back to their places as the lion forms
    later(() => root.classList.add("lion"), 900);
    later(() => root.classList.remove("transforming"), 1900);
  }
  // The focus: every animal settles in a fixed place (so the finale's first frame always matches),
  // the birds and leaves leave the sky, the page glides to the bottom of the world and holds, the
  // tilt eases to centre, and everything but the lion goes muted and soft as the vignette closes in.
  let frozen = false, focusAt = 0, chargeAt = 0;
  // (all of this starts at the lion tap; until then the world carries on as ever)
  // The roar sets the world off: the bluebird takes flight, the butterfly lifts from its flower, the
  // owl turns and opens its eyes, and a burst of leaves falls from the aspens. Each one runs on a fixed
  // path timed from the roar, so the frame FINALE_AFTER_MS in is the same every time (the finale's
  // first frame).
  function scatter() {
    const now = performance.now() / 1000;
    // every looping animation in the world (wing beats, spinning auras, the falls) restarts with the
    // roar, so nothing on its own clock changes that frame
    try { world.getAnimations({ subtree: true }).forEach((an) => { an.currentTime = 0; }); } catch (e) { /* older browsers */ }
    if (perch) { perch.returnAt = 0; perch.flyAt = now + 0.15; perch.el.classList.remove("is-on"); }
    if (butterfly && butterfly.emerged) { butterfly.returnAt = 0; butterfly.flyAt = now; butterfly.el.classList.remove("is-on"); }
    if (owl) { owl.classList.add("look"); later(() => owl.classList.add("open"), 450); }
    const ref = layerOf.aspens.el.nextSibling;
    for (let i = 0; i < 10; i++) {
      const lx = 120 + (i * 53) % 150, ly = 300 + (i * 137) % 520;
      const c = { kind: "leaf", src: `trev-world-bleaf-${1 + (i % 4)}.webp`, layer: "aspens", w: 30 + (i * 7) % 28, born: now + 0.1 + i * 0.05,
        dx: 40 + (i * 37) % 140, ph: i * 1.3, burst: true };
      c.pose = (t) => {
        const d = t - c.born; if (d < 0) return null;
        if (d > 7) { c.dead = true; return null; }
        return { x: lx + c.dx * Math.min(1, d * 1.4) + 24 * Math.sin(d * 1.6 + c.ph), y: ly + 16 * d * d + 60 * d,
          rot: 40 * Math.sin(d * 1.1 + c.ph) + c.ph * 30, flip: Math.cos(d * 2.2 + c.ph), op: d > 6 ? 7 - d : 1 };
      };
      c.el = creatureEl(c); world.insertBefore(c.el, ref); CREATURES.push(c);
    }
  }
  function callHome() {
    const now = performance.now() / 1000;
    for (const c of CREATURES) {
      c.pushUntil = 0;
      if (c === butterfly && c.emerged && !c.home) {   // the moth leaves the water for its flower
        const q = c.pose(now, 1, c); c.home = true; c.flyAt = 0; c.fromDx = q.x - MOTH_REST[0]; c.fromDy = q.y - MOTH_REST[1]; c.returnAt = now; continue;
      }
      if (!c.flyAt) continue;
      if (c.kind === "butterfly") { const q = c.pose(now, 1, c); if (!q) { c.flyAt = 0; continue; } c.fromDx = q.x - MOTH_REST[0]; c.fromDy = q.y - MOTH_REST[1]; }
      c.flyAt = 0; c.returnAt = now;
    }
    if (owl) owl.classList.remove("look", "open");
  }
  function focus() {
    if (frozen) return;
    frozen = true; focusAt = performance.now();
    callHome();   // (they're normally home already, since the lion formed)
    const H = Hs(), top = DESCENT_SVH / 100 * H;
    scroller.scrollTo({ top, behavior: Math.abs(scroller.scrollTop - top) > 4 ? "smooth" : "auto" });
    later(() => scroller.classList.add("locked"), 650);
    aimFocus(); root.classList.add("frozen", "focus");
    later(aimFocus, 700);   // again once the page has settled at the bottom
  }
  // the focus vignette closes in around the lion
  function aimFocus() {
    if (!lion) return;
    const r = lion.el.firstChild.getBoundingClientRect();
    const f = $(".tj-lionFocus");
    f.style.setProperty("--lx", `${(r.left + r.width / 2).toFixed(0)}px`);
    f.style.setProperty("--ly", `${(r.top + r.height * 0.45).toFixed(0)}px`);
  }
  // a buzz: Android vibrates; on iPhone (no vibration for websites) a hidden switch toggle gives the
  // light haptic tick iOS 18+ plays for switches
  let hapticSwitch = null;
  function haptic(pattern) {
    try {
      if (navigator.vibrate) { navigator.vibrate(pattern); return; }
      if (!hapticSwitch) {
        hapticSwitch = document.createElement("label");
        hapticSwitch.setAttribute("aria-hidden", "true");
        hapticSwitch.style.cssText = "position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
        hapticSwitch.innerHTML = `<input type="checkbox" switch tabindex="-1">`;
        root.appendChild(hapticSwitch);
      }
      const ticks = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
      for (let i = 0; i < ticks; i++) later(() => hapticSwitch.click(), i * 70);
    } catch (e) { /* no haptics here */ }
  }
  function roar() {
    if (roaring) return;
    if (!frozen) { focus(); return later(roar, FOCUS_MS); }
    const wait = FOCUS_MS - (performance.now() - focusAt);
    if (wait > 0) return later(roar, wait);
    // the charge: the vignette drops hard around the lion at once, then he roars
    if (!root.classList.contains("charging")) {
      aimFocus(); root.classList.add("charging"); haptic(25); chargeAt = performance.now();
      return later(roar, CHARGE_MS);
    }
    if (performance.now() - chargeAt < CHARGE_MS - 40) return;   // a second tap mid-charge waits for it
    roaring = true; root.classList.add("roaring"); root.classList.remove("focus", "charging");
    haptic([70, 30, 90, 30, 120, 40, 180]);
    scatter();
    // the roar sound plays here, and FINALE_AFTER_MS later (once made) the clip into the lion's eye
    later(() => {
      root.classList.remove("roaring"); roaring = false;
      // no finale clip yet: give the world back its life
      root.classList.remove("frozen"); scroller.classList.remove("locked"); frozen = false;
    }, ROAR_MS);
  }
  let bisonCallAt = -1e9;
  const lightBison = () => {
    const now = performance.now();
    if (now - bisonCallAt < 350) return;   // one tap sends both a touch and a pointer event
    bisonCallAt = now;
    if (lionMode) return roar();
    if (now - bisonTapAt < BISON_TAP_S * 1000) return;
    bisonTapAt = now; bison.classList.add("is-on"); wake("bison");
    // its gift: a ring of gold light across the ground from its hooves, flowers glinting along it
    bison.classList.remove("blessing"); void bison.offsetWidth; bison.classList.add("blessing");
    later(() => bison.classList.remove("blessing"), 4600);
    clearTimeout(bisonOnTimer);
    bisonOnTimer = later(() => { if (!bisonHover) bison.classList.remove("is-on"); }, BISON_TAP_S * 1000);
  };
  on(window, "pointerdown", (e) => { if (overBison(e.clientX, e.clientY, 30)) lightBison(); }, { passive: true, capture: true });
  on(window, "touchstart", (e) => { const t = e.touches[0]; if (t && overBison(t.clientX, t.clientY, 30)) lightBison(); }, { passive: true, capture: true });
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) on(window, "mousemove", (e) => {
    const h = overBison(e.clientX, e.clientY, 10);
    if (h === bisonHover) return;
    bisonHover = h; bison.classList.toggle("is-on", h || performance.now() - bisonTapAt < BISON_TAP_S * 1000);
    docEl.classList.toggle("tj-bison-hover", h);
  }, { passive: true });
  // The owl: a tap (or hover) turns its head to you, then it opens its eyes; a while later it
  // closes them and looks back out over the world.
  let owl = null, owlBusy = false, owlHover = false, perch = null, butterfly = null, salmon = null, homeward = null, cocoon = null;
  // the lolo's cocoon: tapped, it pulses gold and splits, and the moth unfolds into the light
  const overCocoon = (x, y) => {
    if (!cocoon || cocoon.gone || cocoon.hatching || phase !== "world") return false;
    const r = cocoon.el.firstChild.getBoundingClientRect(), pad = 18;
    return r.width && x > r.left + r.width * 0.25 - pad && x < r.right - r.width * 0.25 + pad && y > r.top + r.height * 0.15 && y < r.bottom + pad;
  };
  function hatch() {
    cocoon.hatching = true; cocoon.el.classList.add("hatching"); haptic(30);
    later(() => {
      butterfly.hatchAt = performance.now() / 1000; butterfly.el.classList.add("unfolding"); wake("butterfly");
      later(() => { cocoon.gone = true; }, 900);
    }, 650);
  }
  // a moving target: the leaping salmon is hit-tested where it is right now (with some forgiveness)
  const overSalmon = (x, y) => {
    if (!salmon || phase !== "world" || salmon.el.style.opacity === "0" || salmon.fish.style.opacity === "0") return false;
    const r = salmon.fish.getBoundingClientRect(), pad = 34;
    return r.width && x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
  };
  const catchSalmon = () => {
    if (salmon.el.classList.contains("caught")) return;
    salmon.el.classList.add("caught"); wake("salmon"); haptic(40);
    homeward.classList.remove("run"); void homeward.getBoundingClientRect(); homeward.classList.add("run");
    later(() => homeward.classList.remove("run"), 3600);
    later(() => salmon.el.classList.remove("caught"), 1400);
  };
  // the bluebird and the landed butterfly: a tap sends it flying (hover on desktop lights it a touch)
  const overFlier = (c, x, y) => {
    if (!c || c.flyAt || phase !== "world" || c.el.style.opacity === "0" || (c === butterfly && !c.emerged)) return false;
    const r = c.el.firstChild.getBoundingClientRect(); if (!r.width) return false;
    const pad = Math.max(22, r.width * 0.4);
    return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
  };
  const fly = (c) => {
    c.flyAt = performance.now() / 1000; c.el.classList.remove("is-on"); wake(c === perch ? "bluebird" : "butterfly");
    if (c === perch) dawn(c);
  };
  // the bluebird's gift: a breath of dawn over the world, and a song of gold motes rising from it
  function dawn(c) {
    root.classList.remove("dawning"); void root.offsetWidth; root.classList.add("dawning");
    later(() => root.classList.remove("dawning"), 2800);
    const now = performance.now() / 1000, ref = c.el.nextSibling;
    for (let i = 0; i < 7; i++) {
      const m = { kind: "note", layer: "juniper", w: 9 + (i % 3) * 3, born: now + i * 0.11, burst: true, ph: i * 1.7 };
      m.pose = (t) => {
        const d = t - m.born; if (d < 0) return null;
        if (d > 2.4) { m.dead = true; return null; }
        return { x: PERCH.x - 10 + 18 * Math.sin(d * 3 + m.ph) - 30 * d, y: PERCH.y - 40 - 70 * d, op: Math.sin(Math.PI * d / 2.4) };
      };
      m.el = creatureEl(m); world.insertBefore(m.el, ref); CREATURES.push(m);
    }
  }
  const fliers = () => [perch, butterfly];
  // one finger fires touchstart and pointerdown: the second must not fall through to the sky behind
  let lastTap = { t: -1e9, x: 0, y: 0 };
  const tapFliers = (x, y) => {
    const now = performance.now();
    if (now - lastTap.t < 400 && Math.abs(x - lastTap.x) < 30 && Math.abs(y - lastTap.y) < 30) return;
    lastTap = { t: now, x, y };
    if (overCocoon(x, y)) return hatch();
    for (const c of fliers()) if (overFlier(c, x, y)) return fly(c);
    if (overSalmon(x, y)) return catchSalmon();
    if (overBison(x, y, 30)) return;
    if (tapAspens(x, y)) return;
    tapClouds(x, y);
  };
  const hovering = new Set();
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) on(window, "mousemove", (e) => {
    for (const c of fliers()) {
      if (!c) continue;
      const h = overFlier(c, e.clientX, e.clientY);
      if (h === hovering.has(c)) continue;
      if (h) hovering.add(c); else hovering.delete(c);
      c.el.classList.toggle("is-on", h);
    }
    docEl.classList.toggle("tj-flier-hover", hovering.size > 0);
  }, { passive: true });
  off.push(() => docEl.classList.remove("tj-flier-hover"));
  on(window, "pointerdown", (e) => tapFliers(e.clientX, e.clientY), { passive: true, capture: true });
  on(window, "touchstart", (e) => { const t = e.touches[0]; if (t) tapFliers(t.clientX, t.clientY); }, { passive: true, capture: true });
  const overOwl = (x, y, margin) => {
    if (!owl || phase !== "world" || owl.style.opacity === "0") return false;
    const r = owl.firstChild.getBoundingClientRect(); if (!r.width) return false;
    const pad = Math.max(margin, r.width * 0.3);
    return x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
  };
  const owlLook = () => {
    if (owlBusy) return; owlBusy = true; wake("owl");
    later(() => { root.classList.add("owlsight"); later(() => root.classList.remove("owlsight"), 3200); }, OWL_LOOK_MS);
    owl.classList.add("look");
    later(() => owl.classList.add("open"), OWL_LOOK_MS);
    const rest = () => {
      if (owlHover) return later(rest, 500);
      owl.classList.remove("open");
      later(() => { owl.classList.remove("look"); later(() => { owlBusy = false; }, 600); }, 350);
    };
    later(rest, OWL_LOOK_MS + OWL_HOLD_MS);
  };
  on(window, "pointerdown", (e) => { if (overOwl(e.clientX, e.clientY, 24)) owlLook(); }, { passive: true, capture: true });
  on(window, "touchstart", (e) => { const t = e.touches[0]; if (t && overOwl(t.clientX, t.clientY, 24)) owlLook(); }, { passive: true, capture: true });
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) on(window, "mousemove", (e) => {
    const h = overOwl(e.clientX, e.clientY, 6);
    if (h === owlHover) return;
    owlHover = h; if (h) owlLook();
    docEl.classList.toggle("tj-owl-hover", h);
  }, { passive: true });
  off.push(() => docEl.classList.remove("tj-owl-hover"));
  function creatureEl(c) {
    const el = document.createElement("div");
    c.t0 = 0;
    el.className = `tj-cr tj-cr-${c.kind}${c.over ? " over" : ""}${c.glint ? " glint" : ""}`; el.style.opacity = "0"; el.setAttribute("aria-hidden", "true");
    const body = document.createElement("div"); body.className = "tj-crBody"; body.style.width = c.w + "px";
    if (c.delay) body.style.setProperty("--delay", `-${c.delay}s`);
    if (c.kind === "aspen") body.innerHTML = sacredAura();
    else if (c.kind === "salmon") {
      body.style.height = POOL.h + "px";
      body.innerHTML = `<div class="fish" style="width:${SALMON_W}px">` + ["rise", "peak", "dive"].map((k) =>
        `<img class="${k}" src="${A}trev-world-salmon-${k}.webp" alt="">`).join("") + `</div>`;
      salmon = c; c.fish = body.firstChild; c.imgs = [...c.fish.children];
      c.update = (pose) => {
        const u = pose.u, ok = u >= 0;
        c.fish.style.opacity = ok ? "1" : "0";
        if (!ok) return;
        const x = SALMON_X[0] + (SALMON_X[1] - SALMON_X[0]) * u, y = POOL.h + SALMON_DEPTH - SALMON_RISE * u * (1 - u);
        c.fish.style.transform = `translate3d(${(x - SALMON_W / 2).toFixed(1)}px, ${(y - SALMON_W / 2).toFixed(1)}px, 0) rotate(${(-8 + 16 * u).toFixed(1)}deg)`;
        const k = u < 0.36 ? 0 : u < 0.64 ? 1 : 2;
        if (k !== c.stage) { c.stage = k; c.imgs.forEach((im, i) => { im.style.opacity = i === k ? "1" : "0"; }); }
      };
    }
    else if (c.kind === "splash") body.innerHTML = c.glint ? "<span></span>" : "<span></span><span></span>";
    else if (c.kind === "lion") {
      body.innerHTML = sacredAura() + `<i class="burst"></i><img class="stand" src="${A}trev-world-lion.webp" alt="The white lion">`
        + `<img class="roar" src="${A}trev-world-lion-roar.webp" alt="">`;
      lion = c;
    }
    else if (c.kind === "rainbow") body.innerHTML = `<i></i>`;
    else if (c.kind === "roarwave") body.innerHTML = [0, 1, 2, 3].map((i) => `<div class="wave" style="--i:${i}">${sacredAura()}</div>`).join("");
    else if (c.kind === "bird") body.innerHTML = `<div class="frames" style="--flap:${c.flap}s;aspect-ratio:${FLYER[c.bird].join(" / ")}${c.flip ? ";transform:scaleX(-1)" : ""}">`
      + (c.bird === "swallow"   // Burnell's two frames, each centred
        ? `<img class="up mid" src="${A}trev-world-swallow-up.webp" alt=""><img class="down mid" src="${A}trev-world-swallow-down.webp" alt=""></div>`
        : `<img class="up" src="${A}trev-world-${c.bird}-a.webp" alt=""><img class="down" src="${A}trev-world-${c.bird}-b.webp" alt=""></div>`);
    else if (c.kind === "perch") {
      body.innerHTML = sacredAura() + `<img class="sit" src="${A}trev-world-bluebird-perched.webp" alt="">`
        + `<div class="frames"><img class="up" src="${A}trev-world-bluebird-a.webp" alt=""><img class="down" src="${A}trev-world-bluebird-b.webp" alt=""></div>`;
      c.flyAt = 0; c.flying = false; perch = c;
    }
    else if (c.kind === "lizard") body.innerHTML = `<div class="frames"><img class="rest" src="${A}trev-world-lizard-a.webp" alt=""><img class="up" src="${A}trev-world-lizard-b.webp" alt=""></div>`;
    else if (c.kind === "owl") {
      body.innerHTML = `<div class="aura"><div class="glow"></div><svg class="geo" viewBox="-60 -60 120 120"><g fill="none" stroke="rgba(255,236,190,1)" stroke-width="0.3">`
        + FLOWER.map(([x, y]) => `<circle r="10" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}"/>`).join("") + `</g></svg></div>`
        + ["away", "closed", "open"].map((k) => `<img class="${k}" src="${A}trev-world-owl-${k}.webp" alt="">`).join("");
      owl = el;
    }
    else if (c.kind === "cocoon") { body.innerHTML = sacredAura() + `<img class="pod" src="${A}trev-world-lolo-cocoon.webp" alt="A glowing cocoon"><i class="flash"></i>`; cocoon = c; }
    else if (c.kind === "butterfly") {
      body.innerHTML = c.landed
        ? sacredAura() + `<div class="moth"><img class="open" src="${A}trev-world-lolo-open.webp" alt="The lolo"><img class="raised" src="${A}trev-world-lolo-raised.webp" alt=""><i class="sweep" style="-webkit-mask-image:url(${A}trev-world-lolo-open.webp);mask-image:url(${A}trev-world-lolo-open.webp)"></i></div>`
        : `<img class="wings" src="${A}trev-world-butterfly.webp" alt="">`;
      if (c.landed) { el.classList.add("landed"); c.flyAt = 0; c.flying = false; butterfly = c; }
    }
    else if (c.kind === "leaf") body.innerHTML = `<img src="${A + c.src}" alt="">`;
    else if (c.kind === "falls") {   // streaks running down, seen only through the falls' own water
      body.style.height = c.h + "px";
      body.style.setProperty("--water", `url("${A}trev-world-falls-mask.webp")`);
      body.innerHTML = `<div class="flow" style="background-image:url(${A}trev-world-falls-streaks.webp)"></div>`;
    } else body.innerHTML = "<span></span>";
    el.appendChild(body);
    return el;
  }
  function buildWorld() {
    if (worldBuilt) return; worldBuilt = true;
    const img = (src, w) => {
      const el = document.createElement("img");
      el.alt = ""; el.decoding = "async"; el.style.width = w + "px";
      el.addEventListener("load", onLayer, { once: true }); el.addEventListener("error", onLayer, { once: true });
      el.src = src; return el;
    };
    rimEl.alt = ""; Object.assign(rimEl.style, { width: RIM.w + "px", mixBlendMode: "screen", opacity: 0 });
    rimEl.addEventListener("load", onLayer, { once: true }); rimEl.addEventListener("error", onLayer, { once: true });
    rimEl.src = A + "w3-rim.webp";
    for (const L of LAYERS) {
      L.el = L.key === "bison" ? bisonRig(L) : img(`${A}w3-${L.key}.webp`, L.w); world.appendChild(L.el);
      if (L.key === "mountains") world.appendChild(rimEl);
      for (const c of CLOUDS) if (c.after === L.key) {
        c.el = img(A + c.src, c.w); c.el.style.opacity = c.op; world.appendChild(c.el);
      }
      for (const c of CREATURES) if (!c.top && (c.layer || c.after) === L.key) { c.el = creatureEl(c); world.appendChild(c.el); }
    }
    world.appendChild(sunsetEl);
    // the salmon's way home, drawn in canvas coordinates (pool -> cascades -> the falls)
    world.insertAdjacentHTML("beforeend", `<svg class="tj-homeward" viewBox="0 0 941 1672" aria-hidden="true">`
      + `<path pathLength="1" d="M300 1252 C 340 1215 380 1185 392 1150 S 470 1060 530 1000 S 520 900 488 820 S 462 700 458 640 S 456 590 456 575"/>`
      + `<path class="core" pathLength="1" d="M300 1252 C 340 1215 380 1185 392 1150 S 470 1060 530 1000 S 520 900 488 820 S 462 700 458 640 S 456 590 456 575"/></svg>`);
    homeward = world.lastChild;
    for (const c of CREATURES) if (c.top) { c.el = creatureEl(c); world.appendChild(c.el); }
    $(".tj-side").style.backgroundImage = `url(${A}w3-sky.webp)`;
    for (const c of STORY) {
      const el = document.createElement("section"); el.className = "tj-slide" + (c.cover ? " cover" : "");
      let m;
      if (c.video) {   // its still underneath, the video over it only once it's playing (never a play button)
        m = document.createElement("div"); m.className = "media media-v";
        m.innerHTML = `<img src="${A + c.media}" alt="" loading="lazy" decoding="async"><video class="tj-hidden" muted loop playsinline preload="none" src="${A + c.video + MV}"></video>`;
        const v = m.querySelector("video"); v.muted = true; showWhenPlaying(v);
        if (c.pos) m.querySelectorAll("img, video").forEach((e) => { e.style.objectPosition = c.pos; });
        m.play = () => v.play(); Object.defineProperty(m, "paused", { get: () => v.paused }); m.pause = () => v.pause();
      } else {
        m = document.createElement("img"); m.className = "media";
        m.src = A + c.media; m.alt = ""; m.loading = "lazy"; m.decoding = "async";
        if (c.pos) m.style.objectPosition = c.pos;
      }
      const t = document.createElement("div"); t.className = "text";
      if (c.eyebrow) t.insertAdjacentHTML("beforeend", `<span class="eyebrow">${c.eyebrow}</span>`);
      if (c.title) t.insertAdjacentHTML("beforeend", `<h2 class="${c.cover ? "tj-gold" : ""}">${c.title}</h2>`);
      if (c.lead) t.insertAdjacentHTML("beforeend", `<p class="lead">${c.lead}</p>`);
      for (const b of c.body || []) t.insertAdjacentHTML("beforeend", `<p>${b}</p>`);
      if (c.cta) t.insertAdjacentHTML("beforeend", `<a class="tj-cta" href="${LAYLO_URL}" target="_blank" rel="noopener noreferrer">${c.cta}</a>`
        + (c.ctaNote ? `<span class="tj-ctaNote">${c.ctaNote}</span>` : ""));
      el.append(m, t); storyEl.appendChild(el);
      slides.push({ el, m, video: !!c.video });
    }
  }

  // Sized by the stage itself (max(100lvh, 100vh): it doesn't change as Safari's toolbars come and
  // go), never by the live window height.
  function worldFit() {
    const W = worldStage.clientWidth || innerWidth, H = worldStage.clientHeight || innerHeight;
    const narrow = W / H <= 0.8;
    const colW = narrow ? W : Math.min(W, H * CANVAS.w / CANVAS.h);
    const k = Math.max(colW / CANVAS.w, H / CANVAS.h);
    return { W, H, narrow, colW, k, ox: (W - CANVAS.w * k) / 2, oy: (H - CANVAS.h * k) / 2 };
  }
  let tx = 0, ty = 0;   // the eased phone tilt (Burnell's: it glides rather than jitters)
  function worldLayout(p) {
    const { H, narrow, colW, k, ox, oy: oy0 } = worldFit();
    // the stage runs under Safari's bottom toolbar; over the second half of the descent the world
    // rises by that much, so at the bottom the whole painting is in view above the toolbar
    const oy = oy0 - Math.max(0, H - Hs()) * smooth((p - 0.5) / 0.5);
    setVignette(VIG_LANDED - (VIG_LANDED - VIG_BOTTOM) * clamp01(p));   // 85% on the landing to 15% at the bottom
    $(".tj-side").style.display = narrow ? "none" : "block";
    world.style.transform = `translate(${ox}px, ${oy}px) scale(${k})`;
    world.style.clipPath = narrow ? "" : `inset(0 ${(CANVAS.w * k - colW) / 2 / k}px)`;
    const ty0 = (L) => L.y + L.from[1] * (1 - smooth((p - L.span[0]) / (L.span[1] - L.span[0])));
    const gx = (L) => tx * (L.depth - 0.3) * TILT_X, gy = (L) => ty * Math.max(0, L.depth - 0.1) * TILT_Y;
    for (const L of LAYERS) {
      const t = 1 - smooth((p - L.span[0]) / (L.span[1] - L.span[0]));
      L.cx = L.x + L.from[0] * t + gx(L); L.cy = L.y + L.from[1] * t + gy(L);
      L.el.style.transform = `translate3d(${L.cx.toFixed(1)}px, ${L.cy.toFixed(1)}px, 0)`;
    }
    const sunY = SUN_SKY_Y + ty0(LAYERS[0]), ridgeY = RIDGE_Y + ty0(LAYERS[1]);
    const hid = clamp01((sunY + SUN_R - ridgeY) / (2 * SUN_R));
    const sk = smooth((sunY + SUN_R - ridgeY) / (SUN_R + 64));
    if (sunsetEl._k !== sk.toFixed(4)) {
      sunsetEl._k = sk.toFixed(4);
      sctx.clearRect(0, 0, 941, 1672);
      if (sk > 0) { sctx.fillStyle = `rgba(10,12,22,${(0.06 * sk).toFixed(3)})`; sctx.fillRect(0, 0, 941, 1672); }
    }
    const mt = LAYERS[1];
    rimEl.style.transform = `translate3d(${(RIM.x + gx(mt)).toFixed(1)}px, ${(RIM.y + ty0(mt) + gy(mt)).toFixed(1)}px, 0)`;
    rimEl.style.opacity = clamp01((hid - 0.05) / 0.5).toFixed(3);
    const now = performance.now() / 1000;
    CLOUDS.forEach((c, i) => {
      const t = Math.min(1, p / PART_RANGE), e = 1 - (1 - t) * (1 - t), kk = 1 + 0.3 * c.spd;
      const x = c.x0 - c.w / 2 + c.dir * 640 * kk * e + 8 * Math.sin(now * 0.3 + i) * (frozen ? clamp01(1 - (performance.now() - focusAt) / SETTLE_MS) : 1) + tx * TILT_X * CLOUD_TILT * c.depth;
      const y = c.y0 - c.w * (c.ar || 0.438) / 2 - p * 600 * kk + ty * TILT_Y * CLOUD_TILT * c.depth;
      c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${c.flip ? " scaleX(-1)" : ""}`;
      if (c.leaves && worldAt && !c.gone) {
        const o = c.op * (1 - smooth((now - worldAt - CLOUD_LEAVE_S[0]) / CLOUD_LEAVE_S[1]));
        c.el.style.opacity = o.toFixed(3); if (o <= 0) c.gone = true;
      }
    });
    if (!still) placeCreatures(now, p);
    // landing: blurred + dimmed under the copy (the video ends in exactly this state), clearing as you descend
    const veil = 1 - smooth(p / 0.3);
    world.style.filter = veil > 0.02 ? `blur(${(6 * veil).toFixed(1)}px)` : "none";
    shade.style.opacity = (0.5 * veil).toFixed(3);
    // the landing copy dissolves on the very first bit of scroll
    const o = 1 - Math.min(1, scroller.scrollTop / (Hs() * 0.14));
    landing.style.opacity = o.toFixed(3);
    landing.style.filter = o < 0.999 ? `blur(${((1 - o) * 8).toFixed(1)}px)` : "none";
    landing.classList.toggle("is-gone", o < 0.05);
  }
  const layerOf = Object.fromEntries(LAYERS.map((L) => [L.key, L]));
  const GONE_WHEN_FROZEN = new Set(["bird", "leaf", "mote", "ripple", "firefly", "salmon", "splash"]);
  function placeCreatures(t, p) {
    // the lion's moment: over SETTLE_MS the animals that roam fade out (the leaves quickest) while the
    // rest come home, then every pose holds at one fixed moment (the finale's first frame)
    const k = frozen ? clamp01((performance.now() - focusAt) / SETTLE_MS) : 0, settled = k >= 1;
    for (let i = CREATURES.length - 1; i >= 0; i--) if (CREATURES[i].dead || (settled && CREATURES[i].born && !CREATURES[i].burst)) { CREATURES[i].el.remove(); CREATURES.splice(i, 1); }
    for (const c of CREATURES) {
      const roams = !c.burst && (GONE_WHEN_FROZEN.has(c.kind) || (c.kind === "butterfly" && !c.landed) || c.born);
      if (settled && roams) { if (c.el.style.opacity !== "0") c.el.style.opacity = "0"; continue; }
      const fade = roams && frozen ? clamp01(1 - k * (c.kind === "leaf" ? 2.5 : 1.2)) : 1;
      const live = c.burst || c.flyAt || c.returnAt;   // the roar's movers and anyone flying home keep real time
      const T = settled && !live ? 0 : t - worldAt, tt = settled && !live ? 0 : t;
      const pose = c.pose(tt, p, c, T), el = c.el;
      if (pose && pose.pushing !== undefined && pose.pushing !== c.pushing) { c.pushing = pose.pushing; el.classList.toggle("pushing", pose.pushing); }
      if (pose && pose.flying !== undefined && pose.flying !== c.flying) { c.flying = pose.flying; el.classList.toggle("flying", pose.flying); }
      if (!pose) { if (el.style.opacity !== "0") el.style.opacity = "0"; continue; }
      let x = pose.x, y = pose.y;
      if (c.layer) { const L = layerOf[c.layer]; x += L.cx; y += L.cy; }
      else { x += tx * TILT_X * CLOUD_TILT * c.depth; y += ty * TILT_Y * CLOUD_TILT * c.depth; }
      const op = ((pose.op ?? 1) * fade).toFixed(2);
      if (el.style.opacity !== op) el.style.opacity = op;
      if (c.update) c.update(pose);
      const sx = pose.flip != null ? pose.flip : pose.face;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${pose.rot ? ` rotate(${pose.rot.toFixed(1)}deg)` : ""}${sx != null ? ` scaleX(${sx.toFixed(3)})` : ""}${pose.scale ? ` scale(${pose.scale.toFixed(3)})` : ""}`;
    }
  }
  function storyLayout(s) {
    $(".tj-storyShade").style.opacity = (0.82 * clamp01((s + 0.7) / 0.7)).toFixed(3);
    slides.forEach((sl, i) => {
      const d = s - i, o = clamp01(1 - Math.abs(d) * 1.7);
      sl.el.style.opacity = o.toFixed(3);
      sl.el.style.transform = `translateY(${(-d * 22).toFixed(1)}px)`;
      sl.el.style.visibility = o > 0 ? "visible" : "hidden";
      if (sl.video) { if (o > 0.2) sl.m.play().catch(() => {}); else if (!sl.m.paused) sl.m.pause(); }
    });
  }
  // the vignette: full on the portal, 15% lighter by the end of the transition (following the video's
  // clock), then down to 15% through the descent, coming back as you scroll up; one opacity, set only
  // when it changes
  let vigShown = -1;
  const setVignette = (o) => { if (Math.abs(o - vigShown) > 0.004) { vigShown = o; vignette.style.opacity = o.toFixed(3); } };
  let worldAt = 0;   // when the world opened (s)
  // the text-list bubble: rises in BUBBLE_AFTER_MS after the world opens; closed, it stays closed this visit
  const bubble = $(".tj-bubble");
  let bubbleClosed = false;
  try { bubbleClosed = sessionStorage.getItem("tj-bubble-closed") === "1"; } catch (e) { /* private mode */ }
  on($(".tj-bubbleClose"), "click", (e) => {
    e.preventDefault(); e.stopPropagation(); bubble.classList.remove("show"); bubbleClosed = true;
    try { sessionStorage.setItem("tj-bubble-closed", "1"); } catch (err) { /* private mode */ }
  });
  // ---------- the living world: totems, aspens, clouds and rain, night ----------
  // Every sacred thing is a totem: waking one fills its gold icon in the row at the top. Wake them all
  // and the Kingdom awakens (for now a gold flare; the lion, the roar and the eye come next).
  // (the aspens and the sky answer a tap too, but they aren't totems: the totems are the animals)
  const TOTEMS = ["bison", "bluebird", "butterfly", "owl", "salmon"];
  const totemRow = $(".tj-totems");
  let awake = new Set(), climaxed = false;
  try { awake = new Set(JSON.parse(localStorage.getItem("tj-totems") || "[]")); climaxed = localStorage.getItem("tj-awake") === "1"; } catch (e) { /* private mode */ }
  const paintTotems = () => TOTEMS.forEach((k) => totemRow.querySelector(`[data-k="${k}"]`).classList.toggle("on", awake.has(k)));
  paintTotems();
  function wake(k) {
    if (!TOTEMS.includes(k) || awake.has(k)) return;
    awake.add(k); paintTotems();
    const icon = totemRow.querySelector(`[data-k="${k}"]`); icon.classList.add("pop"); later(() => icon.classList.remove("pop"), 1200);
    try { localStorage.setItem("tj-totems", JSON.stringify([...awake])); } catch (e) { /* private mode */ }
    if (TOTEMS.every((t) => awake.has(t)) && !climaxed) later(awaken, 900);
  }
  function awaken() {
    climaxed = true; root.classList.add("awakening");
    try { localStorage.setItem("tj-awake", "1"); } catch (e) { /* private mode */ }
    later(() => totemRow.classList.add("lion"), 1600);      // the totems leave; the lion takes the row
    later(transform, 2200);                                  // ...as the bison becomes the lion (the world stays alive)
    later(() => root.classList.remove("awakening"), 4800);
  }
  on($(".tj-lionTotem"), "click", () => { if (lionMode) roar(); });
  // the screen point -> a layer's own coordinates
  const toLayer = (x, y, key) => {
    const r = world.getBoundingClientRect(), k = r.width / CANVAS.w, L = layerOf[key];
    return [(x - r.left) / k - L.cx, (y - r.top) / k - L.cy];
  };
  // a tapped aspen sheds a burst of leaves from where you touched it
  let aspenAt = -1e9;
  function tapAspens(x, y) {
    if (phase !== "world" || !worldBuilt) return false;
    const [lx, ly] = toLayer(x, y, "aspens");
    if (lx < 0 || lx > 270 || ly < 0 || ly > 1150) return false;
    if (overOwl(x, y, 20)) return true;   // the owl answers its own tap
    const now = performance.now() / 1000;
    if (now - aspenAt < 1.2) return true;
    aspenAt = now;
    const asp = CREATURES.find((c) => c.kind === "aspen"); asp.el.classList.add("is-on"); later(() => asp.el.classList.remove("is-on"), 2500);
    const ref = layerOf.aspens.el.nextSibling;
    for (let i = 0; i < 9; i++) {
      const c = { kind: "leaf", src: `trev-world-bleaf-${1 + (i % 4)}.webp`, layer: "aspens", w: 34 + (i * 7) % 30, born: now + i * 0.06,
        dx: (i % 2 ? 1 : -1) * (30 + (i * 37) % 120), ph: i * 1.3 };
      c.pose = (t) => {
        const d = t - c.born; if (d < 0) return null;
        if (d > 7) { c.dead = true; return null; }
        return { x: lx + c.dx * Math.min(1, d) + 26 * Math.sin(d * 1.6 + c.ph), y: ly + 18 * d * d + 70 * d,
          rot: 40 * Math.sin(d * 1.1 + c.ph) + c.ph * 30, flip: Math.cos(d * 2.2 + c.ph), op: d > 6 ? 7 - d : 1 };
      };
      c.el = creatureEl(c); world.insertBefore(c.el, ref); CREATURES.push(c);
    }
    return true;
  }
  // a tapped sky: the world darkens, it rains (and the pool ripples), it clears into a rainbow
  let raining = false;
  function tapClouds(x, y) {
    if (phase !== "world" || raining || !landing.classList.contains("is-gone")) return;
    // the clouds are painted into the sky, so the whole sky above the ridge answers (below the header)
    const [, my] = toLayer(x, y, "mountains");
    if (y < 110 || my > RIDGE_Y - 40) return;
    raining = true;
    root.classList.add("raining");
    later(() => { root.classList.remove("raining"); root.classList.add("rainbow"); }, RAIN_MS);
    later(() => { root.classList.remove("rainbow"); raining = false; }, RAIN_MS + RAINBOW_MS);
  }
  // night: after sunset in the visitor's own time zone (or ?night), the world drifts into moonlight
  const isNight = (() => {
    const q = new URLSearchParams(location.search);
    if (q.has("night")) return true;
    if (q.has("day")) return false;
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    const sunset = [17.2, 17.8, 18.4, 19.9, 20.4, 20.9, 21, 20.6, 19.8, 18.9, 17.3, 16.9][d.getMonth()];
    return h >= sunset + 0.5 || h < 6;
  })();

  function openWorld() {
    phase = "world"; worldAt = performance.now() / 1000;
    if (awake.has("butterfly") && butterfly && cocoon) { butterfly.emerged = true; cocoon.gone = true; }
    if (climaxed && butterfly) butterfly.home = true;
    if (climaxed) { totemRow.classList.add("lion"); lionMode = true; root.classList.add("lion"); }   // already awake
    if (isNight) later(() => root.classList.add("night"), NIGHT_AFTER_MS);
    if (!bubbleClosed) later(() => { if (!bubbleClosed) bubble.classList.add("show"); }, BUBBLE_AFTER_MS);
    for (const c of CLOUDS) c.gone = false;
    worldStage.style.visibility = "visible";
    track.style.height = `${100 + STORY_START_SVH + (STORY.length - 1) * STEP_SVH + TAIL_SVH}svh`;
    scroller.classList.add("live");
    scroller.scrollTop = 0;
    worldLayout(0);
  }
  const showLanding = () => landing.classList.add("show");

  // ======================================================================================
  // HERO + TRANSITION
  // ======================================================================================
  let hero = null;
  if (phase === "hero") hero = initHero();
  else { buildWorld(); openWorld(); showLanding(); later(beckon, 2400); }

  function initHero() {
    const heroEl = $(".tj-hero"), box = $(".tj-box"), plate = $("video.tj-plate"), plateStill = $(".tj-plateStill");
    const canvas = $(".tj-me"), meImg = $(".tj-meImg"), grade = $(".tj-grade");
    const enter = $(".tj-enter"), enterLayer = $(".tj-enterLayer");
    let readyAt = 0;
    const trans = $(".tj-trans"), keep = $(".tj-keep");
    const tv = $(".tj-tv");
    // HEVC (smaller) for phones; desktop browsers get H.264, which every one of them plays smoothly
    const phone = matchMedia("(pointer: coarse)").matches;
    const transUrl = A + (phone ? (tv.canPlayType('video/mp4; codecs="hvc1"') ? TRANS.hevc : TRANS.h264Phone) : TRANS.h264) + MV;
    let set = null, fit = { k: 1, ox: 0, oy: 0 }, gl = null, prog = null, nIdx = 0, uOff, uBreath;
    docEl.classList.add("tj-face-grain");
    off.push(() => { docEl.classList.remove("tj-face-grain"); docEl.style.removeProperty("--tj-face"); });
    let warm = false, blobUrl = null, fetchAbort = null, recovered = null, landingShown = false, playing = false, started = false;

    function initGL() {
      gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true });
      if (!gl) return false;
      const vs = `attribute vec2 p; attribute vec2 uv; attribute vec2 w; uniform vec2 off; uniform float breath; uniform vec2 size;
        varying vec2 v; void main(){ vec2 q = p + off * w + vec2(0.0, -breath * w.y);
        gl_Position = vec4(q.x / size.x * 2.0 - 1.0, 1.0 - q.y / size.y * 2.0, 0.0, 1.0); v = uv; }`;
      const fs = `precision mediump float; varying vec2 v; uniform sampler2D t; void main(){ gl_FragColor = texture2D(t, v); }`;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
      gl.useProgram(prog);
      uOff = gl.getUniformLocation(prog, "off"); uBreath = gl.getUniformLocation(prog, "breath");
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      return true;
    }
    function buildMesh(img) {
      const c = set.cut, N = 48, CW = c.w + 2 * MARGIN, CH = c.h + MARGIN;
      canvas.width = CW; canvas.height = CH;
      Object.assign(canvas.style, { left: c.x - MARGIN + "px", top: c.y - MARGIN + "px", width: CW + "px", height: CH + "px" });
      gl.viewport(0, 0, CW, CH);
      gl.uniform2f(gl.getUniformLocation(prog, "size"), CW, CH);
      const data = [], idx = [];
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const u = i / N, v = j / N, fx = c.x + u * c.w, fy = c.y + v * c.h;
        data.push(MARGIN + u * c.w, MARGIN + v * c.h, u, v, 1, 1);         // every point moves together
      }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i; idx.push(a, a + 1, a + N + 1, a + 1, a + N + 2, a + N + 1);
      }
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      nIdx = idx.length;
      const at = (name, n, o) => { const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 24, o); };
      at("p", 2, 0); at("uv", 2, 8); at("w", 2, 16);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
        gl.texParameteri(gl.TEXTURE_2D, p, v);
    }
    function drawMe(x, y, breath) {
      if (!gl) return;
      gl.uniform2f(uOff, x, y); gl.uniform1f(uBreath, breath);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0);
    }
    // the hero is the same height as the world's stage, so its first frame and the video's line up
    const heroW = () => heroEl.clientWidth || innerWidth, heroH = () => heroEl.clientHeight || innerHeight;
    function pick() {
      const next = heroW() / heroH() < 0.9 ? HERO_SETS.mobile : HERO_SETS.desktop;
      if (next === set) return;
      set = next;
      box.classList.remove("ready");
      box.style.width = set.w + "px"; box.style.height = set.h + "px";
      Object.assign(plate.style, { width: set.w + "px", height: set.h + "px" });
      plateStill.src = A + set.poster + MV; plate.src = A + set.video + MV; showWhenPlaying(plate);
      Object.assign(plateStill.style, { width: set.w + "px", height: set.h + "px" });
      plate.play().then(() => afterFirstFrame(plate, () => later(warmUp, WARM_DELAY_MS))).catch(() => {});  // Low Power Mode: the poster stays
      let loaded = 0; const done = () => { if (++loaded === 2) { box.classList.add("ready"); readyAt = readyAt || performance.now(); } };
      const p = new Image(); p.onload = done; p.onerror = done; p.src = A + set.poster;
      const img = new Image();
      img.onload = () => {
        if (gl || initGL()) { buildMesh(img); canvas.hidden = false; meImg.hidden = true; }
        else {
          canvas.hidden = true; meImg.hidden = false; meImg.src = img.src;
          Object.assign(meImg.style, { left: set.cut.x + "px", top: set.cut.y + "px", width: set.cut.w + "px", height: set.cut.h + "px" });
        }
        done();
      };
      img.src = A + set.cut.src + MV;
    }
    function layout() {
      pick();
      // framed in the visible screen (above Safari's bottom toolbar), so TREV is never cut off by it
      const W = heroW(), H = Math.min(heroH(), Hs()), k = Math.max(W / set.w, H / set.h);
      fit = { k,
        ox: Math.min(0, Math.max(W - set.w * k, W / 2 - set.fx * set.w * k)),
        oy: Math.min(0, Math.max(H - set.h * k, H / 2 - set.fy * set.h * k)) };
      box.style.transform = `translate(${fit.ox}px, ${fit.oy}px) scale(${k})`;
      // where his face is on screen: the film grain is at half strength there (FilmGrain.jsx)
      const [fx, fy, rx, ry] = set.face;
      docEl.style.setProperty("--tj-face", `${(rx * k).toFixed(0)}px ${(ry * k).toFixed(0)}px at ${(fit.ox + fx * k).toFixed(0)}px ${(fit.oy + fy * k).toFixed(0)}px`);
      const nameR = $(".tj-name").getBoundingClientRect();
      const headTop = fit.oy + set.cut.y * k, mid = (nameR.bottom + headTop) / 2;
      const hx = fit.ox + set.headX * k, half = enter.offsetWidth / 2;
      enter.style.left = Math.min(W - 16 - half, Math.max(16 + half, hx)).toFixed(1) + "px";
      enter.style.top = mid.toFixed(1) + "px";
      if (phase === "trans") placeVideo(recovered || tv);
    }

    // Once the hero is up: download the transition whole into memory and load it (load only, never
    // play-and-pause it to warm it up: that froze it partway on iPhone), and start loading the world
    // (mounted underneath, not painted). If they tap before the download is done it plays from the network.
    function warmUp() {
      if (warm) return; warm = true;
      buildWorld();
      const loadIt = () => { tv.preload = "auto"; tv.load(); };
      fetchAbort = typeof AbortController !== "undefined" ? new AbortController() : null;
      fetching = true;
      fetch(transUrl, fetchAbort ? { signal: fetchAbort.signal } : undefined)
        .then((r) => (r.ok ? r.blob() : Promise.reject()))
        .then((b) => { if (phase !== "hero" || started) return; blobUrl = URL.createObjectURL(b); tv.src = blobUrl; loadIt(); inMemory = true; })
        .catch(() => { if (phase === "hero" && !started && !tv.src) { tv.src = transUrl; loadIt(); } })
        .finally(() => { fetching = false; sound.preload(); });   // then the song (the transition gets the line first)
    }
    later(warmUp, WARM_FALLBACK_MS);
    off.push(() => { if (fetchAbort) fetchAbort.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl); });

    // input: mouse on desktop; on phones the shared tilt (asked for at the speaker or at Enter);
    // a slow drift underneath both
    let inX = 0, inY = 0;
    on(window, "pointermove", (e) => { if (e.pointerType === "mouse") { inX = e.clientX / innerWidth * 2 - 1; inY = e.clientY / innerHeight * 2 - 1; } });

    let px = 0, py = 0, vx = 0, vy = 0, t0 = null, last = 0, leaving = false;
    function heroFrame(now) {
      if (t0 === null) { t0 = now; last = now; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;
      if (tilt.live) { inX = tilt.x; inY = tilt.y; }
      const drift = tilt.live ? 0.18 : 0.6;
      const dX = drift * (Math.sin(t * 0.53) * 0.6 + Math.sin(t * 0.21 + 1.3) * 0.4);
      const dY = drift * (Math.sin(t * 0.37 + 0.7) * 0.6 + Math.sin(t * 0.17 + 2.1) * 0.4);
      const gx = Math.max(-1, Math.min(1, inX + dX)), gy = Math.max(-1, Math.min(1, inY + dY));
      vx += ((gx - px) * 26 - vx * 8.5) * dt; vy += ((gy - py) * 26 - vy * 8.5) * dt;
      px += vx * dt; py += vy * dt;
      const m = still ? 0 : 1, k = fit.k;
      if (readyAt && now - readyAt > (still ? 0 : ENTER_AFTER_MS) && !leaving) enter.classList.add("show");
      drawMe(px * ME_PX * m / k, py * ME_PX * 0.75 * m / k, 0);
    }

    // ---------- the transition ----------
    // its first frame is the hero plate exactly (same crop), its last frame the world's landing
    function placeVideo(v) {
      const wf = worldFit(), W = wf.W, H = wf.H, H0 = Math.min(H, Hs());
      const u = v.duration ? clamp01(v.currentTime / v.duration) : 0;
      v.style.width = TRANS.w + "px"; v.style.height = TRANS.h + "px";
      if (set === HERO_SETS.mobile) {               // full screen, gliding from the hero's crop to the world's
        const k = Math.max(W / TRANS.w, H0 / TRANS.h);
        const hx = Math.min(0, Math.max(W - TRANS.w * k, W / 2 - set.fx * TRANS.w * k));
        const hy = Math.min(0, Math.max(H0 - TRANS.h * k, H0 / 2 - set.fy * TRANS.h * k));
        const kw = wf.k * CANVAS.w / TRANS.w, e = smooth(u);
        v.style.transform = `translate(${(hx + (wf.ox - hx) * e).toFixed(1)}px, ${(hy + (wf.oy - hy) * e).toFixed(1)}px) scale(${(k + (kw - k) * e).toFixed(5)})`;
      } else {
        // Desktop (until there's a 16:9 transition): the phone video starts exactly over the hero (its
        // first frame is the phone plate, mapped onto the desktop plate through TREV's cutout), grows to
        // fill the screen over DESK_GROW_S while a still of the hero around it fades, holds full-screen,
        // and over the last stretch settles into the world's column, its landing frame.
        const mob = HERO_SETS.mobile.cut, desk = set.cut, r = mob.w / desk.w;
        const A = { k: fit.k / r, x: fit.ox + (desk.x - mob.x / r) * fit.k, y: fit.oy + (desk.y - mob.y / r) * fit.k };
        const kc = Math.max(W / TRANS.w, H0 / TRANS.h);
        const C = { k: kc, x: (W - TRANS.w * kc) / 2, y: Math.min(0, Math.max(H0 - TRANS.h * kc, H0 / 2 - HERO_SETS.mobile.fy * TRANS.h * kc)) };
        const Wd = { k: wf.k * CANVAS.w / TRANS.w, x: wf.ox, y: wf.oy };
        const g = smooth((v.currentTime || 0) / DESK_GROW_S), e = smooth((u - 0.55) / 0.45);
        const lerp = (a, b, t) => a + (b - a) * t;
        const P = { k: lerp(A.k, C.k, g), x: lerp(A.x, C.x, g), y: lerp(A.y, C.y, g) };
        v.style.transform = `translate(${lerp(P.x, Wd.x, e).toFixed(1)}px, ${lerp(P.y, Wd.y, e).toFixed(1)}px) scale(${lerp(P.k, Wd.k, e).toFixed(5)})`;
        if (snap) snap.style.opacity = (1 - g).toFixed(3);
      }
    }
    let failsafe = 0, stallIv = 0, freezeIv = 0, snap = null;
    function stopWatch() { clearTimeout(failsafe); clearInterval(stallIv); clearInterval(freezeIv); }
    off.push(stopWatch);
    function beginLanding(v) {                        // from LANDING_AT: veil the video exactly like the world's landing, raise the copy
      if (landingShown) return; landingShown = true;
      v.style.transition = "filter 2s ease";
      v.style.filter = "blur(6px) brightness(0.5)";
      showLanding();
    }
    function enterWorld() {
      if (phase === "world") return;
      stopWatch();
      const v = recovered || tv;
      if (!landingShown) beginLanding(v);
      openWorld();
      later(beckon, 400);                                // the landing is fully in at the video's end
      keep.hidden = true;
      heroEl.hidden = true; enterLayer.hidden = true; plate.pause();
      // the video holds its last frame (= the veiled landing) until the layers are in, then fades out
      let faded = false;
      const fade = () => { if (faded) return; faded = true;
        v.style.transition = "opacity .9s ease, filter 1.2s ease"; v.style.filter = "blur(6px) brightness(0.5)"; trans.style.opacity = "0";
        later(() => { trans.hidden = true; try { v.pause(); } catch (e) { /* gone */ } }, 1000); };
      // ...and only once every layer is decoded and the (now visible) world has actually been painted
      // underneath it a couple of frames: fading over a world that's still being drawn showed a quick
      // black flash (the whole stage, or a single layer)
      const whenPainted = () => {
        const decodes = [...world.querySelectorAll("img")].map((i) => (i.decode ? i.decode().catch(() => {}) : null));
        Promise.all(decodes).then(() => requestAnimationFrame(() => requestAnimationFrame(() => later(fade, 60))));
      };
      const waitLayers = () => (layersReady ? whenPainted() : later(waitLayers, 120));
      later(fade, 6000); waitLayers();
    }
    function fallbackToWorld() {                      // the video can't play: cross-fade straight into the world
      if (phase === "world") return;
      stopWatch(); buildWorld(); openWorld(); showLanding(); landingShown = true; later(beckon, 2400);
      docEl.classList.remove("tj-face-grain");
      heroEl.classList.add("out"); enterLayer.hidden = true; trans.hidden = true;
      later(() => { heroEl.hidden = true; plate.pause(); }, 800);
    }
    function wire(v) {
      on(v, "timeupdate", () => { if (v.currentTime >= LANDING_AT) beginLanding(v); });
      on(v, "ended", enterWorld);
    }
    // Keeps it moving: resume if paused, re-seek once if the clock sticks, then give up and go on.
    function watchStall() {
      let lastT = -1, lastMove = performance.now(), kicks = 0;
      stallIv = setInterval(() => {
        const v = recovered || tv;
        if (v.ended) return clearInterval(stallIv);
        const now = performance.now();
        if (v.paused) v.play().catch(() => {});
        if (v.currentTime !== lastT) { lastT = v.currentTime; lastMove = now; }
        if (now - lastMove < STALL_MS) return;
        if (kicks++ < 1) { lastMove = now; try { v.currentTime += 0.001; } catch (e) { /* ignore */ } v.play().catch(() => {}); }
        else enterWorld();
      }, 250);
    }
    // iPhone can keep the clock running while the picture stops: compare a 24x24 sample every 300ms;
    // frozen for 0.6s -> a fresh player over it from the same spot; frozen again -> on to the world.
    function watchFreeze() {
      const c = document.createElement("canvas"); c.width = c.height = 24;
      const ctx = c.getContext("2d", { willReadFrequently: true }); if (!ctx) return;
      let prev = null, sameSince = 0;
      freezeIv = setInterval(() => {
        const v = recovered || tv;
        if (v.readyState < 2 || v.paused || v.ended) return;
        let px;
        try { ctx.drawImage(v, 0, 0, 24, 24); px = ctx.getImageData(0, 0, 24, 24).data; } catch (e) { return clearInterval(freezeIv); }
        let diff = Infinity;
        if (prev) { diff = 0; for (let i = 0; i < px.length; i += 4) diff += Math.abs(px[i] - prev[i]) + Math.abs(px[i + 1] - prev[i + 1]); }
        prev = px;
        const now = performance.now();
        if (diff > 24) { sameSince = 0; return; }
        if (!sameSince) sameSince = now;
        if (now - sameSince < 600) return;
        if (!recovered) { sameSince = 0; prev = null; recover(v); } else enterWorld();
      }, 300);
    }
    function recover(v) {
      const t = v.currentTime;
      const nv = document.createElement("video");
      nv.muted = true; nv.playsInline = true; nv.setAttribute("playsinline", ""); nv.preload = "auto";
      nv.className = v.className; nv.style.cssText = v.style.cssText; nv.style.opacity = "0"; nv.src = v.src;
      nv.addEventListener("loadedmetadata", () => { try { nv.currentTime = t; } catch (e) { /* ignore */ } nv.play().catch(enterWorld); }, { once: true });
      nv.addEventListener("playing", () => afterFirstFrame(nv, () => { nv.style.opacity = "1"; v.pause(); v.style.visibility = "hidden"; }), { once: true });
      wire(nv);
      v.parentNode.insertBefore(nv, v.nextSibling);
      recovered = nv;
      clearTimeout(failsafe); failsafe = setTimeout(enterWorld, FAILSAFE_MS);
    }
    function playTransition() {
      started = true;
      if (!tv.src) { tv.src = transUrl; tv.preload = "auto"; }
      placeVideo(tv);
      if (set === HERO_SETS.desktop) $(".tj-transSide").style.backgroundImage = `url(${A}w3-sky.webp)`;
      else $(".tj-transSide").style.display = "none";
      on(tv, "playing", () => afterFirstFrame(tv, () => {
        if (playing) return; playing = true;
        phase = "trans"; keep.hidden = false;
        if (!fadeFrom) fadeFrom = performance.now();   // from the network: TREV fades once it's actually playing
        // the plate lifts off the identical first frame; TREV's real photo stays over the playing
        // video, fading (see fadeMe) — the artist is never in the AI video itself
        if (set === HERO_SETS.desktop) {   // a still of the hero's current frame, under the growing video
          snap = document.createElement("canvas"); snap.className = "tj-snap"; snap.width = set.w; snap.height = set.h;
          try { snap.getContext("2d").drawImage(plate.readyState >= 2 ? plate : plateStill, 0, 0, set.w, set.h); } catch (err) { /* poster only */ }
          snap.style.transform = `translate(${fit.ox}px, ${fit.oy}px) scale(${fit.k})`;
          tv.parentNode.insertBefore(snap, tv);
        }
        heroEl.classList.add("thru");
        plate.pause(); watchStall(); watchFreeze();
      }), { once: true });
      const begin = () => tv.play().catch(() => {
        if (!tv.src.startsWith("blob:")) return fallbackToWorld();
        tv.src = transUrl; tv.play().catch(fallbackToWorld);                 // in-memory copy won't play: the network copy, once
      });
      try { tv.currentTime = 0; } catch (e) { /* not loaded yet */ }
      begin();
      failsafe = setTimeout(() => { if (!playing) fallbackToWorld(); else enterWorld(); }, FAILSAFE_MS);
    }
    // The tap: the song starts (inside the tap, so phones allow it) and, when the transition is in
    // memory, it plays at once with TREV fading over it. On a slow connection it isn't yet: TREV and
    // the portal stay up and "Tap to enter" breathes while the one download finishes (never a second,
    // competing one) for up to ENTER_WAIT_MS; then it plays from the network (the stall watchdog and failsafe still cover a dead connection). If the
    // download failed outright, it plays from the network and TREV fades once a frame is on screen.
    let inMemory = false, fetching = false;
    function onEnter() {
      if (leaving) return; leaving = true;
      sound.enter();
      if (!warm) warmUp();
      const go = (fadeNow) => {
        enter.classList.remove("waiting"); enter.classList.add("leave"); grade.style.opacity = 0;
        if (fadeNow) fadeFrom = performance.now();
        playTransition();
      };
      if (inMemory) return go(true);
      enter.classList.add("waiting");
      const t0 = performance.now();
      const check = () => {
        if (inMemory) return go(true);
        if (!fetching) return go(false);                            // the download failed: from the network
        if (performance.now() - t0 > ENTER_WAIT_MS) return go(false);   // play it from the network (TREV fades once it's up)
        later(check, 100);
      };
      check();
    }
    wire(tv);
    on(enterLayer, "click", onEnter);   // anywhere on the hero, not just the words
    on(tv, "error", () => { if (phase !== "world" && !playing) fallbackToWorld(); });
    on(window, "resize", layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (phase === "hero") layout(); });
    layout();
    // TREV fades out over FADE_ME_MS from the moment the video starts, set frame by frame (a CSS
    // transition on the WebGL canvas didn't show on iPhone: it held, then cut)
    let fadeFrom = 0, faded = false;
    function fadeMe(now) {
      if (!fadeFrom || faded) return;
      const o = Math.max(0, 1 - (now - fadeFrom) / FADE_ME_MS);
      canvas.style.opacity = meImg.style.opacity = o.toFixed(3);
      if (o < 0.5) docEl.classList.remove("tj-face-grain");
      if (o === 0 && playing) { faded = true; heroEl.hidden = true; }
    }
    return {
      frame(now) {
        fadeMe(now);
        if (phase === "hero") heroFrame(now);
        else if (phase === "trans") {
          const vv = recovered || tv;
          if (vv.duration) setVignette(1 - (1 - VIG_LANDED) * clamp01(vv.currentTime / vv.duration));
          const v = recovered || tv;
          placeVideo(v);
          if (v.currentTime >= LANDING_AT) beginLanding(v);   // checked every frame, so it starts right on 6.0s
        }
      },
    };
  }

  // ======================================================================================
  // one loop drives everything
  // ======================================================================================
  let target = 0, cur = 0, lastT = performance.now(), beatSm = 0, beatShown = -1, mouseX = 0, mouseY = 0;
  // About opens straight on the first chapter of the story (the world is still there above it)
  if (start === "world") { scroller.scrollTop = STORY_START_SVH / 100 * Hs(); target = cur = Math.max(0, scroller.scrollTop / Math.max(1, Hs()) * 100); }
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    // and a faint trail of gold dust follows the pointer, now and then a Flower of Life drifting off
    // it, and a click sends one thin gold ripple out (desktop's answer to Burnell's water cursor)
    const dust = $(".tj-dust");
    const bloom = `<svg viewBox="-30 -30 60 60"><g fill="none" stroke="#f3d48e" stroke-width=".8">`
      + [[0, 0], ...Array.from({ length: 6 }, (_, i) => [10 * Math.cos(i * Math.PI / 3), 10 * Math.sin(i * Math.PI / 3)])]
        .map(([x, y]) => `<circle r="10" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}"/>`).join("") + `<circle r="20"/></g></svg>`;
    let dustAt = 0, dustN = 0;
    const spawn = (cls, x, y, html) => {
      const d = document.createElement(cls === "bloom" ? "b" : "i");
      if (cls !== "dust") d.className = cls;
      d.style.left = x + "px"; d.style.top = y + "px";
      d.style.setProperty("--dx", `${(Math.random() * 24 - 12).toFixed(0)}px`);
      if (html) d.innerHTML = html;
      d.addEventListener("animationend", () => d.remove(), { once: true });
      dust.appendChild(d);
    };
    on(window, "mousemove", (e) => {
      mouseX = e.clientX / innerWidth * 2 - 1; mouseY = e.clientY / innerHeight * 2 - 1;
      const now = performance.now();
      if (still || now - dustAt < 70 || dust.childElementCount > 16) return;
      dustAt = now;
      spawn("dust", e.clientX, e.clientY);
      if (++dustN % 14 === 0) spawn("bloom", e.clientX, e.clientY, bloom);
    }, { passive: true });
    on(window, "pointerdown", (e) => { if (!still && e.pointerType === "mouse") spawn("ring", e.clientX, e.clientY); }, { passive: true });
  }

  // Burnell's scroll guide: a thin line along the bottom fills as you go, a glowing drop riding its
  // edge; stop partway and "Keep scrolling" rises above it
  const prog = $(".tj-progress"), progFill = $(".tj-progressFill"), progDrop = $(".tj-progressDrop"), progHint = $(".tj-progressHint");
  let progShown = -1, idleT = 0;
  on(scroller, "scroll", () => {
    progHint.classList.remove("show"); clearTimeout(idleT);
    const max = scroller.scrollHeight - scroller.clientHeight, p = max > 0 ? scroller.scrollTop / max : 0;
    if (p > 0.02 && p < 0.97) idleT = later(() => progHint.classList.add("show"), PROGRESS_IDLE_MS);
  }, { passive: true });
  function progress() {
    const max = scroller.scrollHeight - scroller.clientHeight;
    const p = max > 0 ? clamp01(scroller.scrollTop / max) : 0;
    if (Math.abs(p - progShown) < 0.0005) return;
    progShown = p;
    progFill.style.transform = `scaleX(${p.toFixed(4)})`;
    progDrop.style.transform = `translate3d(${(p * prog.clientWidth).toFixed(1)}px, 0, 0)`;
  }
  const scrolled = () => Math.max(0, scroller.scrollTop / Math.max(1, Hs()) * 100);
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (hero) hero.frame(now);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    // the tilt, eased so it glides (Burnell's)
    // on a computer the mouse leans the world instead (Burnell's desktop), easing in over the first
    // part of the descent so nothing shifts at the hand-off from the video
    const mlean = tilt.live ? 1 : MOUSE_LEAN * smooth(cur / DESCENT_SVH / 0.12);
    const aimX = frozen ? 0 : tilt.live ? tilt.x : mouseX * mlean, aimY = frozen ? 0 : tilt.live ? tilt.y : mouseY * mlean;
    tx += (aimX - tx) * TILT_EASE; ty += (aimY - ty) * TILT_EASE;
    // The bass, from the drop on: only the emblem answers it (its glow, and a touch of lift).
    // Opacity and transform only, on one small layer.
    beatSm = Math.max(sound.beat(), beatSm * Math.exp(-dt * 7));
    if (Math.abs(beatSm - beatShown) > 0.004) {
      beatShown = beatSm < 0.005 ? 0 : beatSm;
      swordBeat.style.opacity = (0.75 * beatShown).toFixed(3);
    }
    // the sword leans with the tilt like the world, a little less, and lifts a touch on each hit
    if (landing.classList.contains("show") && !landing.classList.contains("is-gone"))
      swordTilt.style.transform = still ? `scale(${(1 + 0.025 * beatShown).toFixed(4)})`
        : `rotateY(${(tx * 27 * SWORD_TILT).toFixed(2)}deg) rotateX(${(ty * -20 * SWORD_TILT).toFixed(2)}deg) scale(${(1 + 0.025 * beatShown).toFixed(4)})`;
    if (phase !== "world" || !worldBuilt) return;
    if (!prog.classList.contains("on")) prog.classList.add("on");
    if (!totemRow.classList.contains("show") && landing.classList.contains("is-gone")) totemRow.classList.add("show");
    progress();
    target = scrolled();
    cur += (target - cur) * (1 - Math.exp(-dt * SCROLL_EASE));
    if (Math.abs(target - cur) < 0.03) cur = target;
    const s = (cur - STORY_START_SVH) / STEP_SVH;
    if (s < 0.35) worldLayout(Math.min(1, cur / DESCENT_SVH));   // once a chapter covers it, the world holds still
    storyLayout(s);
  }
  raf = requestAnimationFrame(loop);
  on(window, "resize", () => { if (phase === "world") worldLayout(Math.min(1, cur / DESCENT_SVH)); });

  return () => {
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    off.forEach((f) => f());
    root.querySelectorAll("video").forEach((v) => { try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) { /* gone */ } });
    root.innerHTML = "";
    root.classList.remove("tj");
  };
}
