// Ambient desert wind, generated (no audio file). Nothing is created until the
// visitor taps to enter, so the page is silent until then.
export class Sound {
  constructor(button) {
    this.button = button;
    this.ctx = null;
    this.on = false;
    button.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
  }

  // Must be called inside the tap handler (browser autoplay rules).
  start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { // brown-ish noise
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 420; filter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07; lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(filter.frequency);
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    src.connect(filter).connect(this.gain).connect(ctx.destination);
    src.start(); lfo.start();
    this.button.hidden = false;
    this.set(true);
  }

  set(on) {
    this.on = on;
    if (this.gain) this.gain.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.6);
    this.button.textContent = on ? 'Sound on' : 'Sound off';
    this.button.setAttribute('aria-pressed', String(on));
  }

  toggle() { if (this.ctx) this.set(!this.on); }
}
