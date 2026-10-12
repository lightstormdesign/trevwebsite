import { SCENE_DIR, SCROLL_LENGTH_VH } from './config.js';
import { Scene } from './scene.js';
import { Strip } from './strip.js';
import { FX } from './fx.js';
import { Sound } from './sound.js';
import { Portal } from './portal.js';

const mq = (q) => window.matchMedia(q).matches;
const reducedMotion = mq('(prefers-reduced-motion: reduce)');
const finePointer = mq('(hover: hover) and (pointer: fine)');
const mobile = !finePointer;

async function boot() {
  const manifest = await fetch(`${SCENE_DIR}manifest.json`).then((r) => r.json());

  const portal = new Portal(document.getElementById('portal'), { reducedMotion });
  const scene = new Scene(document.getElementById('scene'), { manifest, reducedMotion });
  const strip = new Strip(document.getElementById('strip-gl'), document.getElementById('strip-img'),
    { manifest, reducedMotion, mobile });
  const fx = new FX(document.getElementById('fx'), { customCursor: finePointer && !reducedMotion, reducedMotion, mobile });
  const sound = new Sound(document.getElementById('sound'));

  // Reduced motion: still scene, no scroll journey.
  document.documentElement.style.setProperty('--track-h', reducedMotion ? '100vh' : `${SCROLL_LENGTH_VH}vh`);

  // ---------- layout ----------
  const relayout = () => {
    const l = scene.resize();
    portal.layout(l);
    strip.resize();
    fx.resize();
    onScroll();
  };
  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; relayout(); });
  });

  // ---------- scroll drives the parallax ----------
  let entered = false;
  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = entered && max > 0 ? window.scrollY / max : 0;
    scene.setProgress(p);
    strip.setProgress(reducedMotion ? 0 : p, scene.layout ? scene.layout.overflow : 0);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- pointer (desktop) ----------
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      fx.move(e.clientX, e.clientY);
      strip.pointerMove(e.clientX, e.clientY);
      scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { fx.hide(); strip.pointerLeave(); });
  window.addEventListener('blur', () => { fx.hide(); strip.pointerLeave(); });

  // Click / tap: particles + a pulse of light along the strip.
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#sound')) return;
    fx.burst(e.clientX, e.clientY);
    if (entered) strip.pulse(e.clientX, e.clientY);
  }, { passive: true });

  // ---------- phone tilt instead of the cursor ----------
  function enableTilt() {
    if (!mobile || reducedMotion || !('DeviceOrientationEvent' in window)) return;
    const listen = () => window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      const x = Math.max(-1, Math.min(1, e.gamma / 25));
      scene.setPointer(x, 0);
    }, { passive: true });
    // iOS asks permission, and only inside a user gesture (the enter tap).
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then((s) => { if (s === 'granted') listen(); }).catch(() => {});
    } else {
      listen();
    }
  }

  // ---------- enter ----------
  portal.onEnter(async (e) => {
    sound.start();     // sound stays off until this tap
    enableTilt();
    // Keyboard activation has no pointer position: start from the button.
    let origin = { x: e.clientX, y: e.clientY };
    if (!e.detail) {
      const r = document.getElementById('enter').getBoundingClientRect();
      origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    await portal.transition(Promise.all([scene.ready, strip.ready]), origin, { mobile });
    entered = true;
    document.body.classList.remove('is-portal');
    document.body.classList.add('is-entered');
    window.scrollTo(0, 0);
    onScroll();
  });

  // ---------- frame loop ----------
  relayout();                       // frame the portal right away
  await Promise.all([scene.ready, strip.ready]);
  relayout();
  const frame = (now) => {
    scene.render(now);
    strip.render(now);
    fx.render(now);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
