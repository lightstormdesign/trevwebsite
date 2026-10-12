# trevwebsite — Sedona world

Static site, no build step. Run locally (ES modules need a server):

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Flow

1. **Portal**: the realistic Sedona photo with Trev's portrait over it. Tap anywhere to enter. Sound stays off until the tap.
2. **Transition video** (`assets/video/transition-1080.mp4` / `-720.mp4`, made in Higgsfield from
   `start-frame-plate` to `end-frame-illustrated`; master in `assets/masters/`): buffered while the
   portal is up, plays on tap. Trev's portrait dissolves into light as it starts. The last frame
   matches the live scene, so it crossfades (0.3s) straight into it. If the video can't play, the
   code transformation runs instead (`js/transition.js`: swirling fractals from the tap point). With
   reduced motion it's a plain crossfade.
3. **Scroll** drives the parallax camera: it pans down, and near layers travel and push in more
   than far ones.

## Layers

| file (masters → `assets/masters/`) | role |
|---|---|
| `00-portal-portrait.png` | Trev portrait cutout over the portal photo → `assets/portal/portrait.webp/.avif` |
| `00-portal-photo.png` | realistic Sedona photo (portal) → `assets/portal/sedona-photo.webp/.avif` |
| `01-sky.png` | opaque sky, sun, clouds |
| `02-clouds.png` | ornamental clouds (drift slowly) |
| `03-mesas.png` | mesas + valley forest |
| `04-foreground-path.png` | path, rocks, agaves, juniper |
| `assets/bison/bison.webp\|png` | *(not yet)*: full-canvas transparent bison, sits above the path |
| `strip-foreground.png` | wide foreground strip, anchored bottom-centre, covers the width |

Run `python3 tools/process_layers.py` after changing a master (needs `pillow numpy scipy`). It writes
WebP + AVIF (+ a 720px phone variant) and `manifest.json` to `assets/scene/`, plus the strip's
gold mask. Add `--report` for QA images in `tools/qa/` (git-ignored).

Tunables (depths, push-in, entry framing, star positions, bison breathing pivot) live in `js/config.js`.

## Layer check (first delivery)

- **Size**: the uploaded files arrived at **941×1672**, not 1440×2560. The chat upload probably
  downscaled them. The aspect is right and everything aligns. Drop the full-res exports into
  `assets/masters/` and re-run the script; no code changes are needed.
- **Alignment**: stacking sky → clouds → mesas → path rebuilds the full scene cleanly.
- **Alpha**: clouds and path had **no fully opaque pixels**: solid areas sat at 90–98% (just as
  suspected). Strip: 0% solid. Everything ≥ 230 (90%) is now 255.
- **Stray specks**: removed tiny islands left by the cutout tool (clouds 180 px, path 29 px, strip 1,751 px).
- **Edges/halos**: checked on white, dark and blue. Edges were mostly clean, with some warm or red
  colour bleed on the strip and path. Fixed with colour decontamination: edge pixels take the
  colour of the nearest solid pixel. Colour is also bled into transparent pixels so scaling and
  WebGL can't pull in dark fringes.
- **Gaps**: the mesa layer's bottom tree line overlaps the path by only ~3% of the canvas height in
  the centre. Parallax would open a sky-coloured seam there, so the script paints a forest band under
  the mesa layer down to the canvas bottom. It is invisible at rest (0.05% of pixels differ, only
  where the path has see-through gaps). It would be nicer painted properly in the master.
  The camera is also built so near layers only ever move *over* far ones.
- **Sun**: sits on the left edge of the art. Horizontal crops come off the **right only**; the
  sky's push-in is anchored on the sun; pointer/tilt shifts never expose the left edge.

## Effects

- **Strip** (WebGL, `js/strip.js`): wind sway on plant tips, glints travelling along the gold,
  pulsing diamond stars, cursor-brightened gold, and a light pulse on click/tap. The gold is
  picked out by colour into `strip-gold-mask.webp`. Falls back to a plain image if WebGL isn't available.
- **Cursor** (`js/fx.js`): code-drawn gold diamond with glow + flicker, a red-dust trail, and click
  bursts of red dust, sparks and light motes.
- **Bison**: static image with CSS breathing (gentle scale from the hooves) and a glow pulse until
  the Rive puppet exists.
- **Sound**: generated desert wind; it starts on the enter tap and has a toggle.
- **Mobile**: no custom cursor; lighter tap bursts, phone tilt (asks permission on iOS during the
  tap), 720px/1280px assets, capped pixel ratio.
- **Reduced motion**: no video or bloom, straight crossfade; static scene, still strip frame,
  native cursor, no particles.

## Still to come

- `assets/bison/bison.webp`: bison on the full canvas; then set `BISON.feet`
- the 16:9 desktop plate

## Deploy (Vercel)

Plain static site, no build. `vercel.json` sets caching; `.vercelignore` keeps the PNG masters and
tools out of the deploy. In Vercel: **Add New → Project → import `lightstormdesign/trevwebsite`**,
framework preset **Other**, leave build settings empty, **Deploy**. Every push to a branch gets a
preview URL; pushes to the production branch (`main` by default) update the live site.
