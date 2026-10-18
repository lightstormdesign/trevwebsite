# Hosting on Cloudflare Pages

The site currently deploys on Vercel (`vercel.json` at the repo root builds
`frontend/`). It builds as-is for Cloudflare Pages, so both can run side by
side until the switch.

## Pages project settings

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Root directory | `frontend` |
| Build command | `CI=false npm run build` |
| Build output directory | `build` |
| Environment variables | none needed |

- `CI=false`: Cloudflare's build sets `CI=true`, and Create React App then
  fails the build on any lint warning. It builds cleanly today; this just
  matches Vercel's setup so a future warning can't block a deploy.
- Deep links (`/about`, `/music`, …): Cloudflare serves `index.html` for any
  path because the build has no `404.html`, which replaces Vercel's
  catch-all rewrite. Don't add a `404.html` to `public/`.
- Every file is under Cloudflare's 25 MiB per-file limit (the whole build
  is about 16 MB).
- `prototype/` (the original hold-to-enter prototype and asset tools) is
  outside `frontend/` and isn't part of the deploy.

## Switching over, step by step

1. Workers & Pages → Create → Pages → Connect to Git → this repo, with the
   settings above. Production branch: `main`.
2. Open the `*.pages.dev` address and check every page (Home with its
   entry, About, EPK, Contact, Music, Tour, Community, Shop), refreshing on
   an inner page to confirm deep links work. It's https, so iPhone tilt can
   be tested there too.
3. Only then add the custom domain under the project's **Custom domains**
   tab and follow Cloudflare's DNS steps.
4. Check the live domain the same way.
5. Keep the Vercel project until the domain has served correctly for a few
   days, then remove it.
