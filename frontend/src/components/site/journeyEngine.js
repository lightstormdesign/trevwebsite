// TREV's journey, as plain DOM so it can run frame by frame without React re-rendering:
//   hero  — the Sedona loop with TREV's real cutout on top (he leans toward the pointer / phone tilt)
//   enter — TREV dissolves (the artist is never in the AI video), then the transition video plays:
//           the camera tilts down to a rain puddle and dives into the painted world
//   world — the video ends exactly on the world's landing frame. From LANDING_AT seconds into the
//           video it blurs and dims (to exactly the world's landing veil) while the sword, the
//           headline and the bio rise in over it (Burnell's landing). Scrolling lifts the veil and
//           descends through the world, and near the end TREV's story takes over.
// mountJourney(root, { start: "hero" | "world", navigate }) builds it inside `root` and returns a cleanup.
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
//   world rather than sit on a frozen frame; and a failsafe timeout.
const A = "/journey/";

const HERO_SETS = {
  desktop: { w: 1920, h: 1740, video: "trev-hero-desktop.mp4", poster: "trev-hero-desktop-poster.jpg",
             cut: { src: "trev-hero-cutout-desktop.webp", x: 580, y: 927, w: 923, h: 813 }, headX: 966, fx: 0.5, fy: 0.8 },
  mobile:  { w: 1080, h: 1920, video: "trev-hero-mobile.mp4", poster: "trev-hero-mobile-poster.jpg",
             cut: { src: "trev-hero-cutout-mobile.webp", x: 91, y: 1023, w: 989, h: 897 }, headX: 516, fx: 0.48, fy: 0.55 },
};
const INTRO_S = 3;          // the hero background settles over this long, then never moves again
const INTRO_ZOOM = 0.05;
const INTRO_SHIFT = 22;
const HEAD_PX = 13;         // screen px TREV's head travels at full tilt (his base stays pinned)
const TILT_DEG = 9;
const MARGIN = 70;
const DISSOLVE_MS = 650;    // TREV fades out before the transition video starts
const TRANS = { hevc: "trev-transition-mobile-hevc.mp4", h264: "trev-transition-mobile.mp4", w: 1080, h: 1920 };
const LANDING_AT = 4.5;     // seconds into the transition when the landing veil + copy begin
const WARM_DELAY_MS = 800, WARM_FALLBACK_MS = 3500;
const STALL_MS = 1200, FAILSAFE_MS = 11000, FRAME_WAIT_MAX_MS = 150;

const CANVAS = { w: 941, h: 1672 };
const SUN_SKY_Y = 716, SUN_R = 26, RIDGE_Y = 357;
const DESCENT_SVH = 236, SCROLL_EASE = 5, PART_RANGE = 0.9;
const LAYERS = [
  { key: "sky",        w: 941,   x: 0,     y: -290,  from: [0, -120],  span: [0, 1] },
  { key: "mountains",  w: 941,   x: 0,     y: 5,     from: [0, 634],   span: [0, 1] },
  { key: "falls",      w: 941,   x: 0,     y: 160,   from: [0, 1094],  span: [0, 1] },
  { key: "forest",     w: 941,   x: 0,     y: 45,    from: [0, 1150],  span: [0.05, 1] },
  { key: "river",      w: 941,   x: 0,     y: 425,   from: [0, 1400],  span: [0.1, 1] },
  { key: "bison",      w: 127,   x: 406.9, y: 900.8, from: [0, 1400],  span: [0.1, 1] },
  { key: "foreground", w: 941,   x: 0,     y: 200,   from: [0, 900],   span: [0.25, 1] },
  { key: "aspens",     w: 941,   x: -80,   y: 0,     from: [-235, 0],  span: [0, 1] },
  { key: "juniper",    w: 799.9, x: 210,   y: 251,   from: [355, 0],   span: [0, 1] },
];
const CLOUDS = [ // the big one keeps the sun covered at the landing, so nothing competes with the sword
  { src: "burnell-world-cloud-medium.webp", after: "sky", w: 1061, x0: 200, y0: 300, dir: -1, op: 0.97, spd: 0.32 },
  { src: "burnell-world-cloud-large.webp", after: "sky", w: 660, x0: 720, y0: 440, dir: 1, op: 0.97, flip: true, spd: 0.15 },
  { src: "trev-cloud-d.webp", ar: 0.413, after: "mountains", w: 470, x0: 330, y0: 560, dir: -1, op: 0.97, spd: 0.54 },
  { src: "trev-cloud-b.webp", ar: 0.5, after: "mountains", w: 520, x0: 860, y0: 585, dir: 1, op: 0.9, spd: 0.37 },
  { src: "trev-cloud-a.webp", ar: 0.457, after: "foreground", w: 520, x0: 560, y0: 690, dir: 1, op: 0.95, flip: true, spd: 0.83 },
];
const RIM = { x: 194, y: 302, w: 447 };

// TREV's story (the About copy, his own words). It opens on him pulling the sword from the stone and
// closes on him in Sedona, hand on heart.
const STORY = [
  { cover: true, eyebrow: "About", title: "My Story", media: "story-08-sword.webp", pos: "50% 45%" },
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
  { title: "Rise Free", media: "story-05-rise-free.webp", body: [
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
  { title: "The Kingdom Within", media: "story-00-heart.webp", pos: "50% 55%", lead: "The Kingdom of Heaven is within." },
];
const STORY_AT = 0.88, STEP_SVH = 70, TAIL_SVH = 40;

const NAV = [["Home", "/"], ["About", "/about"], ["Music", "/music"], ["Community", "/community"], ["Tour", "/tour"],
  ["Shop", "/shop"], ["EPK", "/epk"], ["Contact", "/contact"]];

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOut3 = (t) => 1 - Math.pow(1 - clamp01(t), 3);

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

  root.classList.add("tj");
  root.innerHTML = `
    <div class="tj-track"></div>
    <div class="tj-worldStage" ${phase === "hero" ? 'style="visibility:hidden"' : ""}>
      <div class="tj-side"></div>
      <div class="tj-world"></div>
      <div class="tj-shade"></div>
      <div class="tj-story"><div class="tj-storyShade"></div></div>
    </div>
    <div class="tj-landing">
      <div class="tj-landingCol">
        <div class="tj-emblem" style="--sword:url(${sword})">
          <span class="halo" aria-hidden="true"></span>
          <img class="glow" src="${sword}" alt="" aria-hidden="true">
          <img class="face" src="${sword}" alt="TREV">
          <span class="glint" aria-hidden="true"></span>
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
    ${phase === "hero" ? `
    <div class="tj-trans"><div class="tj-transSide"></div><video class="tj-tv" muted playsinline preload="none" tabindex="-1"></video><div class="tj-keep" hidden></div></div>
    <div class="tj-hero">
      <div class="tj-box">
        <video class="tj-plate" muted loop playsinline autoplay preload="auto"></video>
        <canvas class="tj-me"></canvas>
        <img class="tj-meImg" alt="TREV" hidden>
      </div>
      <div class="tj-grade"></div>
      <button class="tj-enter" type="button" aria-label="${mouse ? "Click" : "Tap"} to enter"><span class="halo"></span><span class="glow" aria-hidden="true">${mouse ? "Click" : "Tap"} to enter</span><span class="word tj-gold" aria-hidden="true">${mouse ? "Click" : "Tap"} to enter</span></button>
    </div>` : ""}
    <header class="tj-header">
      <a class="tj-name" href="/"><img src="${A}trev-logo-new.webp" alt="TREV"></a>
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

  // no page scroll until the world; in the world no rubber-band past the ends
  const docEl = document.documentElement;
  const setScroll = (world) => {
    docEl.style.overflow = world ? "" : "hidden";
    docEl.style.overscrollBehaviorY = world ? "none" : "";
    document.body.style.overscrollBehaviorY = world ? "none" : "";
  };
  off.push(() => { docEl.style.overflow = ""; docEl.style.overscrollBehaviorY = ""; document.body.style.overscrollBehaviorY = ""; });

  // ======================================================================================
  // WORLD
  // ======================================================================================
  const worldStage = $(".tj-worldStage"), world = $(".tj-world"), track = $(".tj-track");
  const landing = $(".tj-landing"), shade = $(".tj-shade");
  let worldBuilt = false, layersLoaded = 0, layersReady = false;
  const layersWanted = LAYERS.length + CLOUDS.length + 1;
  const layerListeners = [];
  const sunsetEl = document.createElement("canvas"); sunsetEl.width = 941; sunsetEl.height = 1672;
  const sctx = sunsetEl.getContext("2d");
  const rimEl = document.createElement("img");
  const slides = [];

  function onLayer() { if (++layersLoaded >= layersWanted) layersReady = true; }
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
      L.el = img(`${A}w3-${L.key}.webp`, L.w); world.appendChild(L.el);
      if (L.key === "mountains") world.appendChild(rimEl);
      for (const c of CLOUDS) if (c.after === L.key) {
        c.el = img(A + c.src, c.w); c.el.style.opacity = c.op; world.appendChild(c.el);
      }
    }
    world.appendChild(sunsetEl);
    $(".tj-side").style.backgroundImage = `url(${A}w3-sky.webp)`;
    const storyEl = $(".tj-story");
    for (const c of STORY) {
      const el = document.createElement("section"); el.className = "tj-slide" + (c.cover ? " cover" : "");
      const m = document.createElement(c.video ? "video" : "img"); m.className = "media";
      if (c.video) { m.muted = true; m.loop = true; m.playsInline = true; m.setAttribute("playsinline", ""); m.poster = A + c.media; m.preload = "none"; m.src = A + c.video; }
      else { m.src = A + c.media; m.alt = ""; m.loading = "lazy"; m.decoding = "async"; }
      if (c.pos) m.style.objectPosition = c.pos;
      const t = document.createElement("div"); t.className = "text";
      if (c.eyebrow) t.insertAdjacentHTML("beforeend", `<span class="eyebrow">${c.eyebrow}</span>`);
      if (c.title) t.insertAdjacentHTML("beforeend", `<h2 class="${c.cover ? "tj-gold" : ""}">${c.title}</h2>`);
      if (c.lead) t.insertAdjacentHTML("beforeend", `<p class="lead">${c.lead}</p>`);
      for (const b of c.body || []) t.insertAdjacentHTML("beforeend", `<p>${b}</p>`);
      el.append(m, t); storyEl.appendChild(el);
      slides.push({ el, m, video: !!c.video });
    }
  }
  off.push(() => layerListeners.forEach((f) => f()));

  let VW = 0, VH = 0;
  function measure() { // address-bar safe: only re-measure height growth unless the width changes
    if (window.innerWidth !== VW) { VW = window.innerWidth; VH = window.innerHeight; }
    else VH = Math.max(VH, window.innerHeight);
  }
  function worldFit() {
    measure();
    const narrow = VW / VH <= 0.8;
    const colW = narrow ? VW : Math.min(VW, VH * CANVAS.w / CANVAS.h);
    const k = Math.max(colW / CANVAS.w, VH / CANVAS.h);
    return { narrow, colW, k, ox: (VW - CANVAS.w * k) / 2, oy: (VH - CANVAS.h * k) / 2 };
  }
  function worldLayout(p) {
    const { narrow, colW, k, ox, oy } = worldFit();
    $(".tj-side").style.display = narrow ? "none" : "block";
    world.style.transform = `translate(${ox}px, ${oy}px) scale(${k})`;
    world.style.clipPath = narrow ? "" : `inset(0 ${(CANVAS.w * k - colW) / 2 / k}px)`;
    const ty = (L) => L.y + L.from[1] * (1 - smooth((p - L.span[0]) / (L.span[1] - L.span[0])));
    for (const L of LAYERS) {
      const t = 1 - smooth((p - L.span[0]) / (L.span[1] - L.span[0]));
      L.el.style.transform = `translate3d(${(L.x + L.from[0] * t).toFixed(1)}px, ${(L.y + L.from[1] * t).toFixed(1)}px, 0)`;
    }
    const sunY = SUN_SKY_Y + ty(LAYERS[0]), ridgeY = RIDGE_Y + ty(LAYERS[1]);
    const hid = clamp01((sunY + SUN_R - ridgeY) / (2 * SUN_R));
    const sk = smooth((sunY + SUN_R - ridgeY) / (SUN_R + 64));
    if (sunsetEl._k !== sk.toFixed(4)) {
      sunsetEl._k = sk.toFixed(4);
      sctx.clearRect(0, 0, 941, 1672);
      if (sk > 0) { sctx.fillStyle = `rgba(10,12,22,${(0.06 * sk).toFixed(3)})`; sctx.fillRect(0, 0, 941, 1672); }
    }
    rimEl.style.transform = `translate3d(${RIM.x}px, ${(RIM.y + ty(LAYERS[1])).toFixed(1)}px, 0)`;
    rimEl.style.opacity = clamp01((hid - 0.05) / 0.5).toFixed(3);
    const now = performance.now() / 1000;
    CLOUDS.forEach((c, i) => {
      const t = Math.min(1, p / PART_RANGE), e = 1 - (1 - t) * (1 - t), kk = 1 + 0.3 * c.spd;
      const x = c.x0 - c.w / 2 + c.dir * 640 * kk * e + 8 * Math.sin(now * 0.3 + i);
      const y = c.y0 - c.w * (c.ar || 0.438) / 2 - p * 600 * kk;
      c.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${c.flip ? " scaleX(-1)" : ""}`;
    });
    // landing: blurred + dimmed under the copy (the video ends in exactly this state), clearing as you descend
    const veil = 1 - smooth(p / 0.3);
    world.style.filter = veil > 0.02 ? `blur(${(6 * veil).toFixed(1)}px)` : "none";
    shade.style.opacity = (0.5 * veil).toFixed(3);
    // the landing copy dissolves on the very first bit of scroll
    const o = 1 - Math.min(1, window.scrollY / (VH * 0.14));
    landing.style.opacity = o.toFixed(3);
    landing.style.filter = o < 0.999 ? `blur(${((1 - o) * 8).toFixed(1)}px)` : "none";
    landing.classList.toggle("is-gone", o < 0.05);
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
  function openWorld() {
    phase = "world";
    worldStage.style.visibility = "visible";
    track.style.height = `${100 + DESCENT_SVH * STORY_AT + (STORY.length - 1) * STEP_SVH + TAIL_SVH}svh`;
    setScroll(true);
    window.scrollTo(0, 0);
    worldLayout(0);
  }
  const showLanding = () => landing.classList.add("show");

  // ======================================================================================
  // HERO + TRANSITION
  // ======================================================================================
  let hero = null;
  if (phase === "hero") { setScroll(false); hero = initHero(); }
  else { buildWorld(); openWorld(); showLanding(); }

  function initHero() {
    const heroEl = $(".tj-hero"), box = $(".tj-box"), plate = $(".tj-plate");
    const canvas = $(".tj-me"), meImg = $(".tj-meImg"), enter = $(".tj-enter"), grade = $(".tj-grade");
    const trans = $(".tj-trans"), keep = $(".tj-keep");
    let tv = $(".tj-tv");
    const transUrl = A + (tv.canPlayType('video/mp4; codecs="hvc1"') ? TRANS.hevc : TRANS.h264);
    let set = null, fit = { k: 1, ox: 0, oy: 0 }, gl = null, prog = null, nIdx = 0, uOff, uBreath;
    let warm = false, blobUrl = null, fetchAbort = null, recovered = null, landingShown = false, playing = false;

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
      const ss = (a, b, x) => smooth((x - a) / (b - a));
      const data = [], idx = [];
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const u = i / N, v = j / N, fx = c.x + u * c.w, fy = c.y + v * c.h;
        const lift = Math.pow(ss(0.04, 0.85, 1 - v), 1.25);                 // 0 at his base, 1 at the head
        const pinX = ss(0, 110, fx) * ss(0, 110, set.w - fx);               // glued to the frame's sides
        const pinY = ss(0, 110, set.h - fy);                                // and to its bottom
        data.push(MARGIN + u * c.w, MARGIN + v * c.h, u, v, lift * pinX, lift * pinY);
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
    function pick() {
      const next = innerWidth / innerHeight < 0.9 ? HERO_SETS.mobile : HERO_SETS.desktop;
      if (next === set) return;
      set = next;
      box.classList.remove("ready");
      box.style.width = set.w + "px"; box.style.height = set.h + "px";
      Object.assign(plate.style, { width: set.w + "px", height: set.h + "px" });
      plate.poster = A + set.poster; plate.src = A + set.video;
      plate.play().then(() => afterFirstFrame(plate, () => later(warmUp, WARM_DELAY_MS))).catch(() => {});  // Low Power Mode: the poster stays
      let loaded = 0; const done = () => { if (++loaded === 2) box.classList.add("ready"); };
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
      img.src = A + set.cut.src;
    }
    function layout() {
      pick();
      const W = innerWidth, H = innerHeight, k = Math.max(W / set.w, H / set.h);
      fit = { k,
        ox: Math.min(0, Math.max(W - set.w * k, W / 2 - set.fx * set.w * k)),
        oy: Math.min(0, Math.max(H - set.h * k, H / 2 - set.fy * set.h * k)) };
      box.style.transform = `translate(${fit.ox}px, ${fit.oy}px) scale(${k})`;
      const nameR = $(".tj-name").getBoundingClientRect();
      const headTop = fit.oy + set.cut.y * k, mid = (nameR.bottom + headTop) / 2;
      const hx = fit.ox + set.headX * k, half = enter.offsetWidth / 2;
      enter.style.left = Math.min(W - 16 - half, Math.max(16 + half, hx)).toFixed(1) + "px";
      enter.style.top = mid.toFixed(1) + "px";
      if (phase === "trans") placeVideo(tv);
    }

    // Once the hero is up: download the transition whole into memory and load it (load only, never
    // play-and-pause it to warm it up: that froze it partway on iPhone), and start loading the world
    // (mounted underneath, not painted). If they tap before the download is done it plays from the network.
    function warmUp() {
      if (warm) return; warm = true;
      buildWorld();
      const loadIt = () => { tv.preload = "auto"; tv.load(); };
      fetchAbort = typeof AbortController !== "undefined" ? new AbortController() : null;
      fetch(transUrl, fetchAbort ? { signal: fetchAbort.signal } : undefined)
        .then((r) => (r.ok ? r.blob() : Promise.reject()))
        .then((b) => { if (phase !== "hero") return; blobUrl = URL.createObjectURL(b); tv.src = blobUrl; loadIt(); })
        .catch(() => { if (phase === "hero" && !tv.src) { tv.src = transUrl; loadIt(); } });
    }
    later(warmUp, WARM_FALLBACK_MS);
    off.push(() => { if (fetchAbort) fetchAbort.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl); });

    // input: mouse on desktop, tilt on phones, a slow drift underneath both
    let inX = 0, inY = 0, haveTilt = false, base = null;
    on(window, "pointermove", (e) => { if (e.pointerType === "mouse") { inX = e.clientX / innerWidth * 2 - 1; inY = e.clientY / innerHeight * 2 - 1; } });
    on(window, "deviceorientation", (e) => {
      if (e.beta == null || e.gamma == null) return;
      haveTilt = true;
      if (!base) base = { b: e.beta, g: e.gamma };
      base.b += (e.beta - base.b) * 0.004; base.g += (e.gamma - base.g) * 0.004;
      inX = Math.max(-1, Math.min(1, (e.gamma - base.g) / TILT_DEG)); inY = Math.max(-1, Math.min(1, (e.beta - base.b) / TILT_DEG));
    });
    const ask = () => {
      window.removeEventListener("touchstart", ask);
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === "function") D.requestPermission().catch(() => {});
    };
    on(window, "touchstart", ask, { passive: true });

    let px = 0, py = 0, vx = 0, vy = 0, t0 = null, last = 0, leaving = false;
    function heroFrame(now) {
      if (t0 === null) { t0 = now; last = now; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;
      const drift = haveTilt ? 0.18 : 0.45;
      const dX = drift * (Math.sin(t * 0.53) * 0.6 + Math.sin(t * 0.21 + 1.3) * 0.4);
      const dY = drift * (Math.sin(t * 0.37 + 0.7) * 0.6 + Math.sin(t * 0.17 + 2.1) * 0.4);
      const gx = Math.max(-1, Math.min(1, inX + dX)), gy = Math.max(-1, Math.min(1, inY + dY));
      vx += ((gx - px) * 26 - vx * 8.5) * dt; vy += ((gy - py) * 26 - vy * 8.5) * dt;
      px += vx * dt; py += vy * dt;
      const m = still ? 0 : 1, k = fit.k;
      const rest = 1 - easeOut3(t / INTRO_S);         // the background settles, then holds exactly still
      plate.style.transform = rest > 0.0001 && m
        ? `translate(${(-px * INTRO_SHIFT * rest / k).toFixed(2)}px, ${(-py * INTRO_SHIFT * 0.6 * rest / k).toFixed(2)}px) scale(${(1 + INTRO_ZOOM * rest).toFixed(4)})`
        : "none";
      if (t > INTRO_S * 0.6 && !leaving) enter.classList.add("show");
      const breath = m * 2.2 / k * (0.5 - 0.5 * Math.cos(t / 5 * 2 * Math.PI));
      drawMe(px * HEAD_PX * m / k, py * HEAD_PX * 0.75 * m / k, breath);
    }

    // ---------- the transition ----------
    // its first frame is the hero plate exactly (same crop), its last frame the world's landing
    function placeVideo(v) {
      const W = innerWidth, H = innerHeight, wf = worldFit();
      const u = v.duration ? clamp01(v.currentTime / v.duration) : 0;
      v.style.width = TRANS.w + "px"; v.style.height = TRANS.h + "px";
      if (set === HERO_SETS.mobile) {               // full screen, gliding from the hero's crop to the world's
        const k = Math.max(W / TRANS.w, H / TRANS.h);
        const hx = Math.min(0, Math.max(W - TRANS.w * k, W / 2 - set.fx * TRANS.w * k));
        const hy = Math.min(0, Math.max(H - TRANS.h * k, H / 2 - set.fy * TRANS.h * k));
        const kw = wf.k * CANVAS.w / TRANS.w, e = smooth(u);
        v.style.transform = `translate(${(hx + (wf.ox - hx) * e).toFixed(1)}px, ${(hy + (wf.oy - hy) * e).toFixed(1)}px) scale(${(k + (kw - k) * e).toFixed(5)})`;
      } else {                                       // desktop: the world's column, with its blurred sides
        const k = wf.colW / TRANS.w;
        v.style.transform = `translate(${((W - wf.colW) / 2).toFixed(1)}px, ${((H - TRANS.h * k) / 2).toFixed(1)}px) scale(${k.toFixed(5)})`;
      }
    }
    let failsafe = 0, stallIv = 0, freezeIv = 0;
    function stopWatch() { clearTimeout(failsafe); clearInterval(stallIv); clearInterval(freezeIv); }
    off.push(stopWatch);
    function beginLanding(v) {                        // from LANDING_AT: veil the video exactly like the world's landing, raise the copy
      if (landingShown) return; landingShown = true;
      v.style.transition = "filter 1.5s ease";
      v.style.filter = "blur(6px) brightness(0.5)";
      showLanding();
    }
    function enterWorld() {
      if (phase === "world") return;
      stopWatch();
      const v = recovered || tv;
      if (!landingShown) beginLanding(v);
      openWorld();
      keep.hidden = true;
      heroEl.hidden = true; plate.pause();
      // the video holds its last frame (= the veiled landing) until the layers are in, then fades out
      const fade = () => { v.style.transition = "opacity .9s ease, filter 1.2s ease"; v.style.filter = "blur(6px) brightness(0.5)"; trans.style.opacity = "0";
        later(() => { trans.hidden = true; try { v.pause(); } catch (e) { /* gone */ } }, 1000); };
      const waitLayers = () => (layersReady ? fade() : later(waitLayers, 120));
      later(fade, 6000); waitLayers();
    }
    function fallbackToWorld() {                      // the video can't play: cross-fade straight into the world
      if (phase === "world") return;
      stopWatch(); buildWorld(); openWorld(); showLanding(); landingShown = true;
      heroEl.classList.add("out"); trans.hidden = true;
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
      if (!tv.src) { tv.src = transUrl; tv.preload = "auto"; }
      placeVideo(tv);
      if (set === HERO_SETS.desktop) $(".tj-transSide").style.backgroundImage = `url(${A}w3-sky.webp)`;
      else $(".tj-transSide").style.display = "none";
      on(tv, "playing", () => afterFirstFrame(tv, () => {
        if (playing) return; playing = true;
        phase = "trans"; keep.hidden = false;
        heroEl.classList.add(set === HERO_SETS.desktop ? "out" : "lift");   // hero lifts off the identical first frame
        plate.pause(); watchStall(); watchFreeze();
      }), { once: true });
      const start = () => tv.play().catch(() => {
        if (!tv.src.startsWith("blob:")) return fallbackToWorld();
        tv.src = transUrl; tv.play().catch(fallbackToWorld);                 // in-memory copy won't play: the network copy, once
      });
      try { tv.currentTime = 0; } catch (e) { /* not loaded yet */ }
      start();
      failsafe = setTimeout(() => { if (!playing) fallbackToWorld(); else enterWorld(); }, FAILSAFE_MS);
    }
    function onEnter() {
      if (leaving) return; leaving = true;
      enter.classList.add("leave"); grade.style.opacity = 0;
      canvas.classList.add("tj-gone"); meImg.classList.add("tj-gone");     // TREV leaves first
      if (!warm) warmUp();
      later(playTransition, DISSOLVE_MS);
    }
    wire(tv);
    on(enter, "click", onEnter);
    on(tv, "error", () => { if (phase !== "world" && !playing) fallbackToWorld(); });
    on(window, "resize", layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (phase === "hero") layout(); });
    layout();
    return {
      frame(now) {
        if (phase === "hero") heroFrame(now);
        else if (phase === "trans") placeVideo(recovered || tv);
      },
    };
  }

  // ======================================================================================
  // one loop drives everything
  // ======================================================================================
  let target = 0, cur = 0, lastT = performance.now();
  const scrolled = () => Math.max(0, window.scrollY / Math.max(1, VH || innerHeight) * 100);
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (hero) hero.frame(now);
    if (phase !== "world" || !worldBuilt) { lastT = now; return; }
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    target = scrolled();
    cur += (target - cur) * (1 - Math.exp(-dt * SCROLL_EASE));
    if (Math.abs(target - cur) < 0.03) cur = target;
    worldLayout(Math.min(1, cur / DESCENT_SVH));
    storyLayout((cur - DESCENT_SVH * STORY_AT) / STEP_SVH);
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
