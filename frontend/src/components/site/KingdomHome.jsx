import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HERO_BIO, HERO_CTA, HOME_TAGLINE_LINES } from "@/data/site";
import { heroLogoPlacement, LOGO_ANCHOR, LOGO_ASPECT } from "@/utils/kingdomLogo";
import { GoldFlourish } from "./GoldFlourish";
import "./kingdom.css";

// Home: "Hold to Enter" entry -> real Kingdom footage (1:59.27–2:02.10) -> TREV dissolves into
// light (AI sunrise transition, frame-matched) -> homepage hero with the logo's sun pinned to the
// real sun. Ported from the tested vanilla prototype (trevwebsite/prototype); the logic is the
// same, scoped to this component's DOM and torn down on unmount.
//
// Assets (public/): trev-entry-hero.mp4 (real clip, 74 frames @30), trev-entry-transition.mp4
// (dissolve + AI sunrise, 97 frames @24; frame 0 == hero's last frame), trev-entry-poster.jpg
// (hero frame 0), trev-entry-hero-end.jpg (transition's last frame), trev-logo.png,
// trev-entry-kingdom.m4a (song from 1:59.27).

// Where the real sun sits in the 16:9 frame (the transition's last frame). The frame is placed so
// this point lands at screen centre, and the logo's sun window is pinned to it (see .kd-logo).
const SUN = { x: 0.482, y: 0.304 };
const LAST_FRAME_T = 73 / 30;
const GRACE = 0.15; // let go in the last ~4 frames and it still enters
const PAN_USE = 0.85;
// The entry plays on every fresh page load (including a refresh). It's skipped only when you come
// back to Home within the same visit (e.g. via the nav), since this flag lives in memory.
let enteredThisLoad = false;

export const KingdomHome = () => {
  const rootRef = useRef(null);
  const [skipIntro] = useState(() => enteredThisLoad);

  useEffect(() => {
    const root = rootRef.current;
    const q = (sel) => root.querySelector(sel);
    const cleanups = [];
    const on = (el, ev, fn, opts) => {
      el.addEventListener(ev, fn, opts);
      cleanups.push(() => el.removeEventListener(ev, fn, opts));
    };
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    let alive = true;
    const raf = (fn) => alive && requestAnimationFrame(fn);

    const intro = q(".kd-intro"), hero = q("#kd-hero"), ai = q("#kd-ai");
    const hold = q(".kd-enter"), fill = q(".kd-enter-fill"), skip = q(".kd-skip");
    const song = q("#kd-song"), haptic = q(".kd-haptic"), introLogo = intro && intro.querySelector(".kd-logo");
    const canVibrate = "vibrate" in navigator; // Android Chrome; iOS Safari has no vibrate()
    const portrait = () => window.matchMedia("(max-aspect-ratio: 4/5)").matches;

    /* ---------- the frame: 16:9 box sized to cover its container, sun centred, plus pan ---------- */
    const pan = { cur: 0, drag: 0, tilt: 0 }; // drag in px, tilt -1..1; shared by entry and hero
    const panRange = () => Math.max(0, (Math.max(innerWidth, innerHeight * 16 / 9) - innerWidth) / 2) * PAN_USE;
    const panTarget = () => {
      const r = panRange();
      return Math.max(-r, Math.min(r, pan.drag + pan.tilt * r));
    };
    function placeFrame(el, W, H, panPx, extra = { x: 0, y: 0 }) {
      const bw = Math.max(W, H * 16 / 9), bh = bw * 9 / 16;
      const fy = portrait() ? 0.5 : 0.42;
      const x = Math.min(0, Math.max(W - bw, W / 2 - SUN.x * bw + panPx));
      const y = Math.min(0, Math.max(H - bh, H / 2 - fy * bh));
      const key = `${bw.toFixed(1)}|${(x + extra.x).toFixed(1)}|${(y + extra.y).toFixed(1)}`;
      if (el._kdKey === key) return; // nothing changed: don't touch the layer
      el._kdKey = key;
      el.style.width = `${bw}px`;
      el.style.height = `${bh}px`;
      el.style.transform = `translate3d(${(x + extra.x).toFixed(1)}px, ${(y + extra.y).toFixed(1)}px, 0)`;
    }
    // drag-to-pan (phones): content follows the finger
    function draggable(el, axisLock) {
      let start = null;
      on(el, "pointerdown", (e) => {
        if (!portrait() || e.target.closest(".kd-enter, a, button")) return;
        start = { x: e.clientX, y: e.clientY, drag: pan.drag, live: !axisLock };
      });
      on(el, "pointermove", (e) => {
        if (!start) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!start.live) { // on the hero, only claim clearly horizontal drags; vertical stays a scroll
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          if (Math.abs(dy) > Math.abs(dx)) { start = null; return; }
          start.live = true;
        }
        const r = panRange();
        pan.drag = Math.max(-r, Math.min(r, start.drag + dx));
      });
      ["pointerup", "pointercancel"].forEach((ev) => on(el, ev, () => { start = null; }));
    }

    /* ---------- audio: Web Audio gain so fades work on iOS (media.volume is read-only there) ---------- */
    let actx = null, gain = null, pauseTimer = 0;
    function audioInit() {
      if (actx) { if (actx.state === "suspended") actx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      gain = actx.createGain();
      gain.gain.value = 0;
      actx.createMediaElementSource(song).connect(gain).connect(actx.destination);
    }
    function fadeTo(v, secs) {
      if (!gain) { song.volume = v; return; }
      const g = gain.gain, t = actx.currentTime;
      if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
      else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
      g.linearRampToValueAtTime(v, t + secs);
    }
    function fadeOutAndPause(secs) {
      fadeTo(0, secs);
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => song.pause(), secs * 1000 + 60);
    }
    cleanups.push(() => { clearTimeout(pauseTimer); song.pause(); if (actx) actx.close().catch(() => {}); });

    /* ---------- haptics ---------- */
    function tick(ms = 10) {
      if (canVibrate) { try { navigator.vibrate(ms); } catch (e) {} return; }
      haptic.click(); // iOS 18+: toggling a native <input switch> from a touch handler fires the system tick
    }

    /* ---------- hero copy: nestled right under the logo (its sun is pinned to the real sun) ---------- */
    const copy = q(".kd-copy");
    function placeCopy() {
      const W = root.offsetWidth, H = root.offsetHeight;
      const p = heroLogoPlacement(W, H);
      const logoBottom = p.y + (p.width / LOGO_ASPECT) * (1 - LOGO_ANCHOR.y);
      const top = Math.max(0, Math.min(logoBottom - 2, H - copy.offsetHeight - 16)); // never off the bottom
      copy.style.top = `${top.toFixed(1)}px`;
    }
    placeCopy();
    on(window, "resize", placeCopy);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && placeCopy());

    /* ---------- hero (homepage) parallax / tilt ---------- */
    let heroStarted = false;
    function startHero() {
      if (heroStarted) return;
      heroStarted = true;
      later(() => root.classList.add("kd-hero-in"), 350);
      const frame = q("#kd-hero-frame");
      const W = () => root.offsetWidth, H = () => root.offsetHeight;
      const siteScale = portrait() ? 1 : 1.03; // desktop keeps 3% overscan for the mouse parallax
      q(".kd-hero-bg").style.transform = `scale(${siteScale})`;
      let tx = 0, ty = 0, cx = 0, cy = 0, base = null;
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      (function frameLoop() {
        if (portrait()) {
          pan.cur += (panTarget() - pan.cur) * 0.08;
          placeFrame(frame, W(), H(), pan.cur);
        } else {
          cx += (tx - cx) * 0.06;
          cy += (ty - cy) * 0.06;
          placeFrame(frame, W(), H(), 0, { x: cx * -16, y: cy * -10 });
        }
        raf(frameLoop);
      })();
      draggable(root, true);

      function onOrient(e) {
        if (e.gamma == null) return;
        const angle = (window.screen.orientation && window.screen.orientation.angle) || window.orientation || 0;
        let x = e.gamma, y = e.beta;
        if (angle === 90) { x = e.beta; y = -e.gamma; } else if (angle === -90 || angle === 270) { x = -e.beta; y = e.gamma; }
        if (!base) base = { x, y };
        tx = clamp((x - base.x) / 22);
        ty = clamp((y - base.y) / 22);
        pan.tilt = clamp(-(x - base.x) / 20); // tilt right -> look right
      }
      if (!window.matchMedia("(pointer: coarse)").matches) {
        on(root, "pointermove", (e) => {
          tx = clamp((e.clientX / innerWidth - 0.5) * 2);
          ty = clamp((e.clientY / innerHeight - 0.5) * 2);
        });
        return;
      }
      const needsPermission = typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function";
      if (!needsPermission) { // Android: no prompt needed
        on(window, "deviceorientation", onOrient);
        return;
      }
      // iPhone: never ask during the entry. Ask on the first tap on the homepage.
      const hint = q(".kd-tilt-hint");
      later(() => hint.classList.add("kd-show"), 1600);
      later(() => hint.classList.remove("kd-show"), 6500);
      const ask = () => {
        hint.classList.remove("kd-show");
        DeviceOrientationEvent.requestPermission()
          .then((s) => { if (s === "granted") on(window, "deviceorientation", onOrient); })
          .catch(() => {});
      };
      root.addEventListener("click", ask, { once: true, capture: true });
      cleanups.push(() => root.removeEventListener("click", ask, { capture: true }));
    }

    if (!intro) { // returning visitor: straight to the homepage
      startHero();
      return () => { alive = false; timers.forEach(clearTimeout); cleanups.forEach((f) => f()); };
    }

    /* ---------- entry state machine: idle -> holding <-> rewinding; holding -> finishing -> committed ---------- */
    let state = "idle", rewindT = 0, loopId = 0, entered = false;
    const setBar = (p) => { fill.style.transform = `scaleX(${Math.max(0, Math.min(1, p)).toFixed(4)})`; };
    const dur = () => hero.duration || 2.4667;
    document.documentElement.style.overflow = "hidden";
    cleanups.push(() => { document.documentElement.style.overflow = ""; });

    // start fetching both clips now (no source swapping: that's fragile on iOS Safari)
    const preload = (video) => { try { video.load(); } catch (e) {} };

    function loop() {
      cancelAnimationFrame(loopId);
      let last = performance.now();
      const step = (now) => {
        if (!alive) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (state === "holding" || state === "finishing") {
          setBar(hero.currentTime / dur());
        } else if (state === "rewinding") {
          // ease back: fast at first, settling softly onto the first frame
          rewindT = Math.max(0, rewindT - dt * (0.22 + rewindT * 1.7));
          if (!hero.seeking) hero.currentTime = rewindT;
          setBar(rewindT / dur());
          if (rewindT <= 0) { state = "idle"; hero.currentTime = 0; setBar(0); return; }
        } else {
          return;
        }
        loopId = requestAnimationFrame(step);
      };
      loopId = requestAnimationFrame(step);
    }
    cleanups.push(() => cancelAnimationFrame(loopId));

    function primeAI() {
      // play+pause inside the press gesture: decodes the first frame now, and unlocks later play()
      // even in iOS Low Power Mode, where muted autoplay outside a gesture is refused
      if (ai.dataset.primed) return;
      const p = ai.play();
      if (p && p.then) p.then(() => { ai.pause(); ai.currentTime = 0; ai.dataset.primed = "1"; }).catch(() => {});
    }

    function startHold() {
      if (state === "committed" || state === "finishing") return;
      state = "holding";
      hold.classList.add("kd-pressed");
      skip.classList.remove("kd-show");
      primeAI();
      audioInit();
      clearTimeout(pauseTimer);
      try { song.currentTime = hero.currentTime; } catch (e) {}
      song.play().catch(() => {});
      fadeTo(1, 0.12);
      hero.play().catch(() => {});
      loop();
    }

    function releaseHold() {
      if (state !== "holding") return;
      hold.classList.remove("kd-pressed");
      if (hero.currentTime >= dur() - GRACE) { state = "finishing"; return; } // bar is full: carry on
      state = "rewinding";
      hero.pause();
      rewindT = hero.currentTime;
      fadeOutAndPause(0.35);
      loop();
    }

    // Slow push toward the sun before/during the hold (26 s each way), then at commit an eased
    // settle to the exact framing the homepage uses, so the transition's last frame and the
    // homepage line up when the entry fades. Driven from the frame loop below, expressed around
    // the screen centre: scale s about the sun point == translate((sun - centre)(1 - s)) scale(s).
    const driftEl = q(".kd-drift");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drift = { s: 1, tx: 0, ty: 0, settle: null, t0: performance.now() };
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    function updateDrift(now) {
      if (drift.settle) {
        const { from, to, start, ms } = drift.settle;
        const k = ease(Math.min(1, (now - start) / ms));
        drift.s = from.s + (to.s - from.s) * k;
        drift.tx = from.tx + (to.tx - from.tx) * k;
        drift.ty = from.ty + (to.ty - from.ty) * k;
      } else if (!reduceMotion) {
        const ph = ((now - drift.t0) / 26000) % 2;
        drift.s = 1 + 0.09 * ease(ph < 1 ? ph : 2 - ph);
        const sunY = innerHeight * (portrait() ? 0.5 : 0.42); // the frame puts the sun here
        drift.tx = 0;
        drift.ty = (sunY - innerHeight / 2) * (1 - drift.s);
      }
      const t = `translate3d(${drift.tx.toFixed(2)}px, ${drift.ty.toFixed(2)}px, 0) scale(${drift.s.toFixed(5)})`;
      if (driftEl._kdT !== t) { driftEl._kdT = t; driftEl.style.transform = t; }
    }
    function settleDrift(secs) {
      drift.settle = {
        from: { s: drift.s, tx: drift.tx, ty: drift.ty },
        to: { s: portrait() ? 1 : 1.03, tx: 0, ty: 0 },
        start: performance.now(),
        ms: secs * 1000,
      };
    }

    function enterSite() {
      if (entered || !alive) return;
      entered = true;
      if (canVibrate && state === "committed" && !song.paused) tick(10);
      document.documentElement.style.overflow = "";
      startHero();
      intro.classList.add("kd-leaving");
      later(() => { intro.classList.add("kd-gone"); hero.pause(); ai.pause(); }, 1450);
    }

    function commit() {
      if (state === "committed") return;
      state = "committed";
      cancelAnimationFrame(loopId);
      setBar(1);
      hold.classList.remove("kd-pressed");
      if (canVibrate) tick(14);
      intro.classList.add("kd-committed");
      enteredThisLoad = true;
      settleDrift(3.6);
      // Swap on the exact frame: hero is parked on its last frame; the transition's first frame is
      // that same image. Start the transition underneath; hide the hero once it presents a frame.
      ai.currentTime = 0;
      const reveal = () => hero.classList.add("kd-hidden");
      if ("requestVideoFrameCallback" in ai) ai.requestVideoFrameCallback(reveal);
      else on(ai, "playing", reveal, { once: true });
      const p = ai.play();
      if (p && p.catch) p.catch(() => { reveal(); enterSite(); });
      // committed means committed: if anything pauses the transition (a stall, a tap), resume it
      on(ai, "pause", () => { if (!ai.ended && !entered) ai.play().catch(() => {}); });
      on(ai, "ended", enterSite, { once: true });
      // Safety net on the wall clock: even if a phone stops painting video frames, the homepage
      // arrives on schedule (clip length + a beat) instead of leaving you on a frozen frame.
      const clipMs = ((ai.duration && isFinite(ai.duration)) ? ai.duration : 4.04) * 1000;
      later(enterSite, clipMs + 900);
      const t0 = performance.now();
      const showLogo = () => {
        if (ai.currentTime >= 2.5 || performance.now() - t0 >= 2500) introLogo.classList.add("kd-show");
        else if (!entered) raf(showLogo);
      };
      showLogo();
    }

    // Commit the moment the hero *presents* its last frame so the transition's next frame lands
    // on the following vsync; 'ended' fires a frame or two later, so it's only the fallback.
    let vfc = 0;
    function watchLastFrame() {
      if (!("requestVideoFrameCallback" in hero) || !alive) return;
      if (vfc) hero.cancelVideoFrameCallback(vfc);
      vfc = hero.requestVideoFrameCallback((now, md) => {
        vfc = 0;
        if ((state === "holding" || state === "finishing") && md.mediaTime >= LAST_FRAME_T - 0.005) commit();
        else if (state !== "committed") watchLastFrame();
      });
    }
    watchLastFrame();
    on(hero, "loadeddata", watchLastFrame); // re-arm after the preloaded source swaps in
    on(hero, "ended", () => { if (state === "holding" || state === "finishing") commit(); });
    cleanups.push(() => { if (vfc) hero.cancelVideoFrameCallback(vfc); });

    // Press and hold anywhere on the entry screen (only Skip is excluded). The bar is a visual.
    on(intro, "pointerdown", (e) => {
      if (state === "committed" || state === "finishing" || e.target.closest(".kd-skip")) return;
      if (e.button !== undefined && e.button > 0) return; // primary button / touch only
      e.preventDefault();
      try { intro.setPointerCapture(e.pointerId); } catch (err) {}
      tick();
      startHold();
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => on(intro, ev, releaseHold));
    on(intro, "contextmenu", (e) => e.preventDefault());
    on(hold, "keydown", (e) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startHold(); }
    });
    on(hold, "keyup", (e) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); releaseHold(); }
    });

    // Skip stays out of the way: it appears quietly only if nobody has pressed for a few seconds
    later(() => { if (state === "idle") skip.classList.add("kd-show"); }, 5000);
    on(skip, "click", (e) => {
      e.preventDefault();
      enteredThisLoad = true;
      state = "committed";
      hero.pause();
      if (!song.paused) fadeOutAndPause(0.4);
      enterSite();
    });

    // entry frame loop
    const introFrame = q("#kd-intro-frame");
    (function introLoop(now) {
      if (intro.classList.contains("kd-gone")) return;
      updateDrift(now || performance.now());
      pan.cur += (panTarget() - pan.cur) * 0.12;
      placeFrame(introFrame, innerWidth, innerHeight, portrait() ? pan.cur : 0);
      raf(introLoop);
    })();

    on(hero, "loadeddata", () => { if (state === "idle") hero.currentTime = 0; }, { once: true });
    preload(hero);
    preload(ai);

    return () => { alive = false; timers.forEach(clearTimeout); cleanups.forEach((f) => f()); };
  }, []);

  return (
    <div ref={rootRef} className="kd-root" data-testid="kingdom-home">
      {/* ---------- homepage hero ---------- */}
      <div className="kd-hero-bg">
        <div className="kd-frame" id="kd-hero-frame">
          <div className="kd-frame-img" style={{ backgroundImage: "url(/trev-entry-hero-end.jpg)" }} />
          <img className="kd-logo" src="/trev-logo.png" alt="TREV" />
        </div>
      </div>
      <div className="kd-vignette" />
      {/* Hero copy, nestled under the logo (pinned to the sun, above): an ornate gold rule under TREV,
          the two-line tagline, short bio, "My Story" */}
      <div className="kd-copy">
        <GoldFlourish width={300} className="kd-flourish" />
        <h1 className="kd-tagline">
          {HOME_TAGLINE_LINES.map((line) => <span key={line}>{line}</span>)}
        </h1>
        <p className="kd-bio">{HERO_BIO}</p>
        <Link className="kd-btn kd-btn-gold kd-story-btn" to={HERO_CTA.to} data-testid="home-my-story">{HERO_CTA.label}</Link>
      </div>
      <p className="kd-tilt-hint">Tap, then tilt to look around</p>

      {/* ---------- entry ---------- */}
      {!skipIntro && (
        <section className="kd-intro" aria-label="Enter">
          <div className="kd-stage">
            <div className="kd-drift">
              <div className="kd-frame" id="kd-intro-frame">
                <video id="kd-ai" className="kd-layer" src="/trev-entry-transition.mp4" muted playsInline preload="auto" />
                <video id="kd-hero" className="kd-layer" src="/trev-entry-hero.mp4" poster="/trev-entry-poster.jpg" muted playsInline preload="auto" />
                <img className="kd-logo" src="/trev-logo.png" alt="" aria-hidden />
              </div>
            </div>
            <div className="kd-vignette" />
          </div>
          <button className="kd-enter" type="button" aria-label="Press and hold to enter" data-testid="hold-to-enter">
            <span className="kd-enter-label">Hold to Enter</span>
            <span className="kd-enter-bar"><span className="kd-enter-fill" /></span>
          </button>
          <button className="kd-skip" type="button">Skip</button>
          {/* iOS 18+ haptic tick: toggling a native switch from a touch handler fires the system tick */}
          <label className="kd-haptic" aria-hidden><input type="checkbox" switch="" tabIndex={-1} /></label>
        </section>
      )}
      <audio id="kd-song" src="/trev-entry-kingdom.m4a" preload="auto" />
    </div>
  );
};
