// Portal: the realistic Sedona plate + portrait, layered over the live illustrated scene
// (framed identically). Tap anywhere: the fractal transformation (js/transition.js)
// dissolves the plate from the tap point to reveal the scene underneath.
import { PORTAL } from './config.js';
import { fractalTransition } from './transition.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Portal {
  constructor(root, { reducedMotion }) {
    this.root = root;
    this.reduced = reducedMotion;
    this.box = root.querySelector('#portal-box');
    this.photo = root.querySelector('#portal-photo');
    this.video = root.querySelector('#portal-video');
    this.button = root.querySelector('#enter');
    document.documentElement.style.setProperty('--fade', `${PORTAL.crossfadeMs}ms`);
    this.photoReady = this.photo.decode ? this.photo.decode().catch(() => {}) : Promise.resolve();
  }

  // Frame the portal exactly like the scene's entry frame so the hand-off lines up.
  layout(l) {
    Object.assign(this.box.style, {
      width: `${l.w}px`, height: `${l.h}px`,
      transform: `translate3d(${l.x}px, ${-l.entry}px, 0)`,
    });
  }

  // Tap anywhere on the portal (or press the button with the keyboard).
  onEnter(fn) {
    const go = (e) => { e.preventDefault(); this.root.removeEventListener('click', go); fn(e); };
    this.root.addEventListener('click', go);
  }

  // Plays the transition; resolves when the live scene should be revealed.
  // `origin` = tap point (viewport px); the fractal transformation spreads from there.
  async transition(sceneReady, origin, { mobile } = {}) {
    this.root.classList.add('is-leaving');
    if (this.reduced) { await sceneReady; return this.reveal(); }

    if (PORTAL.video && await this.playVideo()) {
      await sceneReady;
      return this.reveal();
    }
    // The live scene must be rendered underneath before the photo dissolves.
    await sceneReady;
    await this.photoReady;
    const ok = await fractalTransition(this.root, origin, { mobile }).catch((e) => {
      console.warn('transition failed', e);
      return false;
    });
    if (!ok) {
      // No WebGL: simple golden bloom.
      this.root.classList.add('is-blooming');
      await wait(1500);
    }
    return this.reveal();
  }

  playVideo() {
    return new Promise((resolve) => {
      const v = this.video;
      let started = false;
      let gaveUp = false;
      const fail = () => {
        if (started || gaveUp) return;
        gaveUp = true;
        v.pause();
        resolve(false);
      };
      v.addEventListener('error', fail, { once: true });
      v.addEventListener('ended', () => resolve(true), { once: true });
      setTimeout(fail, 2500); // no video / too slow: use the code transformation
      v.src = PORTAL.video;
      v.preload = 'auto';
      v.play().then(() => {
        if (gaveUp) return v.pause();
        started = true;
        this.root.classList.add('is-playing');
      }).catch(fail);
    });
  }

  async reveal() {
    this.root.classList.add('is-gone');
    await wait(PORTAL.crossfadeMs + 40);
    this.root.hidden = true;
    this.video.removeAttribute('src');
    this.video.load();
  }
}
