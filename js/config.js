// Scene configuration. All positions are fractions of the 9:16 art canvas
// (0..1), so swapping in the full-resolution 1440x2560 exports needs no code change.

export const CANVAS = { w: 1440, h: 2560 }; // design canvas (aspect is what matters)

export const SCENE_DIR = 'assets/scene/'; // manifest.json + variants written by tools/process_layers.py

// Back to front. `depth` 0..1: how strongly the layer follows the scroll camera
// (1 = moves with the front of the scene, lower = farther away, lags behind).
// `dolly` = extra scale at the end of the scroll (push-in), `origin` = scale anchor.
// Near layers always move/scale MORE than far ones, so overlaps only grow and no
// seam can open while scrolling forward from the entry frame.
export const LAYERS = [
  { id: 'sky', asset: '01-sky', depth: 0.45, dolly: 0.03, origin: [0.06, 0.29], mouse: 4 },   // origin on the sun: it never scales off the left edge
  { id: 'clouds', asset: '02-clouds', depth: 0.55, dolly: 0.04, origin: [0.5, 0.2], mouse: 7, drift: 10 },
  { id: 'mesas', asset: '03-mesas', depth: 0.8, dolly: 0.05, origin: [0.5, 1], mouse: 10 },
  { id: 'path', asset: '04-foreground-path', depth: 1, dolly: 0.08, origin: [0.5, 1], mouse: 16 },
  // Bison: transparent PNG/WebP cut from the transition video's last frame, on the same
  // full canvas. Sits on the path's depth so it stays planted. Hidden until the file exists.
  { id: 'bison', src: 'assets/bison/bison' /* .webp or .png */, depth: 1, dolly: 0.08, origin: [0.5, 1], mouse: 16, optional: true },
];

// Bison breathing pivot (where the hooves touch the ground) — tune once the PNG exists.
export const BISON = { feet: [0.55, 0.78] };

// Foreground strip: anchored bottom-centre, covers the viewport width, extra spills off the sides.
export const STRIP = {
  asset: 'strip-foreground',
  mask: 'strip-gold-mask',            // greyscale, same size; `-1280` variant for phones
  spill: 1.06,                        // width = viewport width x spill (extra falls off the sides)
  sinkWide: 0.1,                      // on wide screens, sink this share of the strip below the edge
  rise: 0.35,                         // share of strip height it rises during the scroll (wide screens)
  // Diamond stars (fractions of the strip image) — they pulse slowly.
  stars: [
    [0.501, 0.81, 1.0],  // centre star (x, y, size)
    [0.072, 0.37, 0.7],  // left agave diamond
    [0.958, 0.4, 0.7],   // right agave diamond
    [0.073, 0.62, 0.6],  // left rock
    [0.295, 0.71, 0.55], // rock
    [0.573, 0.63, 0.55], // rock
    [0.915, 0.66, 0.55], // right rock
  ],
};

// Entry framing on wide screens: top of the viewport at this fraction of the art,
// so the sun (upper left) and the mesas are in view after the transition.
export const ENTRY_TOP = 0.2;

// Horizontal crop: when the art is wider than the screen, crop from the RIGHT only —
// the sun sits on the left edge of the art and must never be cut off.
export const KEEP_LEFT = true;

// Portal (realistic photo) and transition video. The video is optional: until it
// exists a placeholder transition plays.
export const PORTAL = {
  photo: 'assets/portal/sedona-photo',   // .webp/.avif; placeholder is used if missing
  placeholder: 'assets/portal/portal-placeholder.webp',
  video: 'assets/video/transition.mp4',
  crossfadeMs: 300,
};

export const SCROLL_LENGTH_VH = 260; // how long the parallax scroll runs
