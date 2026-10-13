(() => {
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const intro = $('intro'), hero = $('hero'), ai = $('ai');
  const hold = $('hold'), fill = $('enterFill');
  const song = $('song'), haptic = $('haptic'), soundBtn = $('sound');
  const introLogo = $('introLogo');
  const canVibrate = 'vibrate' in navigator; // Android Chrome; iOS Safari has no vibrate()
  const portrait = () => matchMedia('(max-aspect-ratio: 4/5)').matches;

  // Where the real sun sits in the 16:9 frame (the transition's last frame). The frame is placed so
  // this point lands at screen centre, and the logo's sun window is pinned to it (see .logo in CSS).
  const SUN = { x: 0.482, y: 0.304 };

  /* ---------- the frame: 16:9 box sized to cover its container, sun centred, plus pan ---------- */
  const pan = { cur: 0, drag: 0, tilt: 0 }; // drag in px, tilt -1..1; shared by intro and site
  const PAN_USE = 0.85;
  const panRange = (W, H) => Math.max(0, (Math.max(W, H * 16 / 9) - W) / 2) * PAN_USE;

  function placeFrame(el, W, H, panPx, extra = { x: 0, y: 0 }) {
    const bw = Math.max(W, H * 16 / 9), bh = bw * 9 / 16;
    const fy = portrait() ? 0.5 : 0.42;
    const x = Math.min(0, Math.max(W - bw, W / 2 - SUN.x * bw + panPx));
    const y = Math.min(0, Math.max(H - bh, H / 2 - fy * bh));
    el.style.width = `${bw}px`;
    el.style.height = `${bh}px`;
    el.style.transform = `translate3d(${(x + extra.x).toFixed(1)}px, ${(y + extra.y).toFixed(1)}px, 0)`;
  }

  // drag-to-pan (phones): content follows the finger
  function draggable(el, opts = {}) {
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      if (!portrait() || (opts.ignore && e.target.closest(opts.ignore))) return;
      start = { x: e.clientX, y: e.clientY, drag: pan.drag, live: !opts.axisLock };
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.live) { // in the site, only claim clearly horizontal drags; vertical stays a scroll
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) { start = null; return; }
        start.live = true;
      }
      const r = panRange(innerWidth, innerHeight);
      pan.drag = Math.max(-r, Math.min(r, start.drag + dx));
    });
    ['pointerup', 'pointercancel'].forEach((ev) => el.addEventListener(ev, () => { start = null; }));
  }
  const panTarget = () => {
    const r = panRange(innerWidth, innerHeight);
    return Math.max(-r, Math.min(r, pan.drag + pan.tilt * r));
  };

  /* ---------- preload both clips fully, so neither can stall mid-entry ---------- */
  function preload(video) {
    const url = video.getAttribute('src');
    fetch(url).then((r) => r.blob()).then((b) => {
      if (state !== 'idle' || video.currentTime > 0 || !video.paused) return; // never swap mid-use
      video.src = URL.createObjectURL(b);
      video.load();
    }).catch(() => {});
  }

  /* ---------- audio: Web Audio gain so fades work on iOS (media.volume is read-only there) ---------- */
  let actx = null, gain = null;
  function audioInit() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
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
  let pauseTimer = 0;
  function fadeOutAndPause(secs) {
    fadeTo(0, secs);
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => song.pause(), secs * 1000 + 60);
  }

  /* ---------- haptics ---------- */
  function tick(ms = 10) {
    if (canVibrate) { try { navigator.vibrate(ms); } catch (e) {} return; }
    // iOS 18+: toggling a native <input switch> from inside a touch handler fires the system tick
    haptic.click();
  }

  /* ---------- entry state machine: idle -> holding <-> rewinding; holding -> finishing -> committed ---------- */
  let state = 'idle';
  let rewindT = 0;
  let raf = 0;
  const setBar = (p) => { fill.style.transform = `scaleX(${Math.max(0, Math.min(1, p)).toFixed(4)})`; };
  const dur = () => hero.duration || 2.4667;
  const GRACE = 0.15; // let go in the last ~4 frames and it still enters

  function loop() {
    cancelAnimationFrame(raf);
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (state === 'holding' || state === 'finishing') {
        setBar(hero.currentTime / dur());
      } else if (state === 'rewinding') {
        // ease back: fast at first, settling softly onto the first frame
        rewindT = Math.max(0, rewindT - dt * (0.22 + rewindT * 1.7));
        if (!hero.seeking) hero.currentTime = rewindT;
        setBar(rewindT / dur());
        if (rewindT <= 0) {
          state = 'idle';
          hero.currentTime = 0;
          setBar(0);
          return;
        }
      } else {
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function primeAI() {
    // play+pause inside the press gesture: decodes the first frame now, and unlocks later play() even in
    // iOS Low Power Mode, where muted autoplay outside a gesture is refused
    if (ai.dataset.primed) return;
    const p = ai.play();
    if (p && p.then) p.then(() => { ai.pause(); ai.currentTime = 0; ai.dataset.primed = '1'; }).catch(() => {});
  }

  function startHold() {
    if (state === 'committed' || state === 'finishing') return;
    state = 'holding';
    hold.classList.add('pressed');
    skip.classList.remove('show');
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
    if (state !== 'holding') return;
    hold.classList.remove('pressed');
    if (hero.currentTime >= dur() - GRACE) { // the bar is full: carry on into the transition
      state = 'finishing';
      return;
    }
    state = 'rewinding';
    hero.pause();
    rewindT = hero.currentTime;
    fadeOutAndPause(0.35);
    loop();
  }

  // At commit, ease the slow drift out to the exact framing the homepage uses, so the transition's last
  // frame and the homepage line up when the intro fades. Re-expressed around the centre (same pixels),
  // then transitioned.
  const siteScale = () => (portrait() ? 1 : 1.03); // desktop keeps 3% overscan for the mouse parallax
  function settleDrift(secs) {
    const d = $('drift');
    const cs = getComputedStyle(d);
    const m = cs.transform && cs.transform !== 'none' ? new DOMMatrix(cs.transform) : new DOMMatrix();
    const s0 = m.a;
    const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
    const tx = (ox - d.offsetWidth / 2) * (1 - s0), ty = (oy - d.offsetHeight / 2) * (1 - s0);
    d.style.animation = 'none';
    d.style.transformOrigin = '50% 50%';
    d.style.transform = `translate(${tx}px, ${ty}px) scale(${s0})`;
    void d.offsetWidth;
    d.style.transition = `transform ${secs}s cubic-bezier(.4,0,.2,1)`;
    d.style.transform = `translate(0px, 0px) scale(${siteScale()})`;
  }

  function commit() {
    if (state === 'committed') return;
    state = 'committed';
    cancelAnimationFrame(raf);
    setBar(1);
    hold.classList.remove('pressed');
    if (canVibrate) tick(14);
    intro.classList.add('committed');
    try { localStorage.setItem('trev_entered', '1'); } catch (e) {}
    settleDrift(3.6);

    // Swap on the exact frame: hero is parked on its last frame; the transition's first frame is that
    // same image. Start the transition underneath and hide the hero the moment it presents a frame.
    ai.currentTime = 0;
    const reveal = () => hero.classList.add('hidden');
    if ('requestVideoFrameCallback' in ai) ai.requestVideoFrameCallback(reveal);
    else ai.addEventListener('playing', reveal, { once: true });
    const p = ai.play();
    if (p && p.catch) p.catch(() => { reveal(); enterSite(); });
    // committed means committed: if anything pauses the transition (a stall, a tap), resume it
    ai.addEventListener('pause', () => { if (!ai.ended && !entered) ai.play().catch(() => {}); });
    ai.addEventListener('ended', enterSite, { once: true });
    setTimeout(enterSite, 9000); // safety net

    // the logo resolves as the sun crests
    const showLogo = () => {
      if (ai.currentTime >= 2.5) introLogo.classList.add('show');
      else if (!entered) requestAnimationFrame(showLogo);
    };
    showLogo();
  }

  // Commit the moment the hero *presents* its last frame (requestVideoFrameCallback) so the transition's
  // next frame lands on the following vsync. 'ended' fires a frame or two later, so it's only the fallback.
  const LAST_FRAME_T = 73 / 30;
  let vfc = 0;
  function watchLastFrame() {
    if (!('requestVideoFrameCallback' in hero)) return;
    if (vfc) hero.cancelVideoFrameCallback(vfc);
    vfc = hero.requestVideoFrameCallback((now, md) => {
      vfc = 0;
      if ((state === 'holding' || state === 'finishing') && md.mediaTime >= LAST_FRAME_T - 0.005) commit();
      else if (state !== 'committed') watchLastFrame();
    });
  }
  watchLastFrame();
  hero.addEventListener('loadeddata', watchLastFrame); // re-arm after the preloaded source swaps in
  hero.addEventListener('ended', () => { if (state === 'holding' || state === 'finishing') commit(); });

  hold.addEventListener('pointerdown', (e) => {
    if (state === 'committed' || state === 'finishing') return;
    e.preventDefault();
    try { hold.setPointerCapture(e.pointerId); } catch (err) {}
    tick();
    startHold();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => hold.addEventListener(ev, releaseHold));
  hold.addEventListener('contextmenu', (e) => e.preventDefault());
  hold.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); }
  });
  hold.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); releaseHold(); }
  });

  // Skip stays out of the way: it appears quietly only if nobody has pressed for a few seconds
  const skip = $('skip');
  setTimeout(() => { if (state === 'idle') skip.classList.add('show'); }, 5000);
  skip.addEventListener('click', (e) => {
    e.preventDefault();
    try { localStorage.setItem('trev_entered', '1'); } catch (err) {}
    state = 'committed';
    hero.pause();
    if (!song.paused) fadeOutAndPause(0.4);
    enterSite();
  });

  /* ---------- intro frame loop ---------- */
  const introFrame = $('introFrame');
  (function introLoop() {
    if (intro.classList.contains('gone')) return;
    pan.cur += (panTarget() - pan.cur) * 0.12;
    placeFrame(introFrame, innerWidth, innerHeight, portrait() ? pan.cur : 0);
    requestAnimationFrame(introLoop);
  })();
  draggable($('stage'));

  /* ---------- site ---------- */
  let entered = false;
  function enterSite() {
    if (entered) return;
    entered = true;
    if (canVibrate && state === 'committed' && !song.paused) tick(10);
    root.classList.remove('locked');
    window.scrollTo(0, 0);
    initSite();
    intro.classList.add('leaving');
    setTimeout(() => { intro.classList.add('gone'); hero.pause(); ai.pause(); }, 1450);
  }

  function setSoundUI() { soundBtn.classList.toggle('off', song.paused); soundBtn.setAttribute('aria-label', song.paused ? 'Play sound' : 'Mute'); }
  song.addEventListener('play', setSoundUI);
  song.addEventListener('pause', setSoundUI);
  song.addEventListener('ended', setSoundUI);
  soundBtn.addEventListener('click', () => {
    audioInit();
    if (song.paused) {
      clearTimeout(pauseTimer);
      if (song.ended) song.currentTime = 0;
      song.play().catch(() => {});
      fadeTo(1, 0.5);
    } else {
      fadeOutAndPause(0.4);
    }
  });

  document.querySelectorAll('[data-todo]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
  $('joinForm').addEventListener('submit', (e) => {
    e.preventDefault();
    $('joinNote').textContent = 'Prototype: sign-up isn’t connected yet.';
  });

  // the nav wordmark appears only once the hero logo has scrolled away
  const nav = $('nav');
  new IntersectionObserver(([en]) => nav.classList.toggle('solid', !en.isIntersecting), { rootMargin: '-40% 0px 0px 0px' })
    .observe($('top'));

  /* ---------- tilt / parallax (only after entry) ---------- */
  let siteInit = false;
  function initSite() {
    if (siteInit) return;
    siteInit = true;
    setSoundUI();
    const frame = $('siteFrame');
    const feature = $('top');
    $('featureBg').style.transform = `scale(${siteScale()})`;
    let tx = 0, ty = 0, cx = 0, cy = 0, base = null;
    const clamp = (v) => Math.max(-1, Math.min(1, v));

    (function frameLoop() {
      const W = feature.offsetWidth, H = feature.offsetHeight;
      if (portrait()) {
        // pan across the full landscape; the logo rides with it, pinned to the sun
        pan.cur += (panTarget() - pan.cur) * 0.08;
        placeFrame(frame, W, H, pan.cur);
      } else {
        cx += (tx - cx) * 0.06;
        cy += (ty - cy) * 0.06;
        placeFrame(frame, W, H, 0, { x: cx * -16, y: cy * -10 });
      }
      requestAnimationFrame(frameLoop);
    })();
    draggable(feature, { axisLock: true });

    function onOrient(e) {
      if (e.gamma == null) return;
      const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      let x = e.gamma, y = e.beta;
      if (angle === 90) { x = e.beta; y = -e.gamma; } else if (angle === -90 || angle === 270) { x = -e.beta; y = e.gamma; }
      if (!base) base = { x, y };
      tx = clamp((x - base.x) / 22);
      ty = clamp((y - base.y) / 22);
      pan.tilt = clamp(-(x - base.x) / 20); // tilt right -> look right
    }

    const coarse = matchMedia('(pointer: coarse)').matches;
    if (!coarse) {
      feature.addEventListener('pointermove', (e) => {
        tx = clamp((e.clientX / innerWidth - 0.5) * 2);
        ty = clamp((e.clientY / innerHeight - 0.5) * 2);
      });
      return;
    }
    const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function';
    if (!needsPermission) { // Android: no prompt needed
      addEventListener('deviceorientation', onOrient);
      return;
    }
    // iPhone: never ask during the entry. Ask on the first tap inside the site.
    const hint = $('tiltHint');
    setTimeout(() => hint.classList.add('show'), 1600);
    setTimeout(() => hint.classList.remove('show'), 6500);
    document.addEventListener('click', function ask() {
      hint.classList.remove('show');
      DeviceOrientationEvent.requestPermission()
        .then((s) => { if (s === 'granted') addEventListener('deviceorientation', onOrient); })
        .catch(() => {});
    }, { once: true, capture: true });
  }

  /* ---------- boot ---------- */
  if (root.classList.contains('skip-intro')) {
    intro.classList.add('gone');
    entered = true;
    initSite();
  } else {
    root.classList.add('locked');
    hero.addEventListener('loadeddata', () => { hero.currentTime = 0; }, { once: true });
    preload(hero);
    preload(ai);
  }
})();
