# TREV — trevworld

Artist site for TREV, built by LightStorm from the Sierra Marin template (`~/sierra-marin-website`).

- `frontend/` — the site (React, CRA + Tailwind). Content lives in `frontend/src/data/site.js`.
- `prototype/` — the original vanilla hold-to-enter prototype and the asset tools
  (`prototype/tools/dissolve.py`, `person_mask.py`) used to render the entry transition.
- `vercel.json` — builds from `frontend/` (same setup as the Burnell site).

Dev server: `npm --prefix frontend start` (launch config `trev-frontend`, port 3008).
Home's entry plays on every fresh load/refresh; it's skipped only when returning to Home via the nav in the same visit.

## Content source
Bio, stats, highlights, festivals, booking copy, and links were pulled from the live
trevworld.com (Home, Press, Contact) on 2026-10-13.

## Pending
- Files from TREV's "site files new" folder (not yet in the repo), each with a slot already wired:
  - `frontend/public/trev-kingdom-preview.mp4` — the 27 s "Kingdom official preview". Music plays 20 s, then
    "Get the full video" → Laylo. Until it exists the Laylo card shows over the poster.
  - `frontend/public/trev-epk-reel.mp4` (+ optional `trev-epk-reel.jpg` poster) — the live highlight reel
    ("copy", ~117 MB): compress to ~1080p H.264 ≤ 25 MB, e.g.
    `ffmpeg -i copy.mov -vf scale=-2:1080 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 128k -movflags +faststart trev-epk-reel.mp4`.
    The EPK block hides itself until it exists.
  - Lion symbol → `frontend/public/trev-lion.png`, then set `ABOUT_EMBLEM` in `site.js`.
  - Community background: the crowd photo with TREV on the ground (currently the house-show crowd shot,
    `trev-community-crowd.jpg`).
  - Album covers for a discography section; better photos for About beats.
- About "world": TREV's illustrated layers are in (`trev-world-*`, `trev-border-sedona.png`;
  originals in `prototype/source/world/`). The layers are ~9 MB together — worth compressing
  (WebP/AVIF) before launch.
- Tour dates / Bandsintown link (`TOUR_DATES`, `TOUR_TICKETS_URL`).
- Favicons and the share image (og:image needs an absolute URL once the domain is live).
- iPhone tilt needs https — test on a Vercel preview.
- Production build for phone testing: `npm --prefix frontend run build`, then launch config
  `trev-build` (port 3009, serves `frontend/build`).
