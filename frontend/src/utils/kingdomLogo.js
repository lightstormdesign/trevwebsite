// Where the TREV logo sits on screen. On the homepage the logo's sun window is pinned to the real
// sun in the hero frame (see KingdomHome / kingdom.css); the About page puts its logo at exactly the
// same spot, so tapping "My Story" feels like the logo stays put while the world changes around it.

export const SUN = { x: 0.482, y: 0.304 }; // the real sun in the 16:9 hero frame
export const LOGO_ANCHOR = { x: 0.5015, y: 0.4418 }; // the logo's bright sun core, as a fraction of the logo
export const LOGO_ASPECT = 1280 / 667;

const isPortrait = (W, H) => W / H <= 4 / 5;

// Logo width — mirrors .kd-logo: 82vw on phones, clamp(265px, 33vw, 600px) otherwise.
export const logoWidth = (W, H) => (isPortrait(W, H) ? 0.82 * W : Math.min(600, Math.max(265, 0.33 * W)));

// Screen position of the logo's sun window on the homepage hero (pan = 0, no tilt), and its width.
export function heroLogoPlacement(W, H) {
  const portrait = isPortrait(W, H);
  const bw = Math.max(W, (H * 16) / 9), bh = (bw * 9) / 16;
  const fy = portrait ? 0.5 : 0.42;
  const x = Math.min(0, Math.max(W - bw, W / 2 - SUN.x * bw));
  const y = Math.min(0, Math.max(H - bh, H / 2 - fy * bh));
  const s = portrait ? 1 : 1.03; // the hero's desktop overscan scale (about the screen centre)
  return {
    x: W / 2 + (x + SUN.x * bw - W / 2) * s,
    y: H / 2 + (y + SUN.y * bh - H / 2) * s,
    width: logoWidth(W, H) * s,
  };
}
