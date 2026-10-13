# TREV — trevworld

Artist site for TREV, built by LightStorm from the Sierra Marin template (`~/sierra-marin-website`).

- `frontend/` — the site (React, CRA + Tailwind). Content lives in `frontend/src/data/site.js`.
- `prototype/` — the original vanilla hold-to-enter prototype and the asset tools
  (`prototype/tools/dissolve.py`, `person_mask.py`) used to render the entry transition.
- `vercel.json` — builds from `frontend/` (same setup as the Burnell site).

Dev server: `npm --prefix frontend start` (launch config `trev-frontend`, port 3008).
Home's entry: append `?intro` to replay it (returning visitors skip it).

## Content source
Bio, stats, highlights, festivals, booking copy, and links were pulled from the live
trevworld.com (Home, Press, Contact) on 2026-10-13.

## Pending
- About story photos: `frontend/public/trev-story-01..10` (TREV's own photos; 09 is a beach video loop). Only `trev-story-03-second-dream.jpg` is still a Kingdom-video still — no photo sent for that beat.
- EPK gallery `trev-epk-01..12`, Community background, Music "Kingdom" still: same, temporary stills.
- About "world": TREV's illustrated layers are in (`trev-world-*`, `trev-border-sedona.png`;
  originals in `prototype/source/world/`). The layers are ~9 MB together — worth compressing
  (WebP/AVIF) before launch.
- `KINGDOM_YOUTUBE_ID` in `site.js` (Music page embeds the video once set).
- Tour dates / Bandsintown link (`TOUR_DATES`, `TOUR_TICKETS_URL`).
- Favicons and the share image (og:image needs an absolute URL once the domain is live).
- iPhone tilt needs https — test on a Vercel preview.
- Production build for phone testing: `npm --prefix frontend run build`, then launch config
  `trev-build` (port 3009, serves `frontend/build`).
