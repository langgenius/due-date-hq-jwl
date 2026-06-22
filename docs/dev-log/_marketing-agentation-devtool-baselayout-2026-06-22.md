# Marketing — Agentation feedback devtool re-enabled (dev-only, site-wide)

**Date:** 2026-06-22 · `apps/marketing/src/layouts/BaseLayout.astro`. The migration into `apps/marketing` had stripped the Agentation visual-feedback devtool that lived on the old `production-v2.html` mockup; re-added it so Yuqi can leave element-level comments on the new Astro site during review.

## What

- React import map (top of `<head>`, must precede module scripts) + the agentation loader (body end), both **`import.meta.env.DEV`-gated** so they only exist in `astro dev`, never in the production build. Loader is additionally `localhost`-only and honours `?noagent`.
- Loads `agentation@3.0.2` from esm.sh with `?external=react,react-dom` sharing the import-map React (avoids the duplicate-React invalid-hook-call). Same setup that worked on production-v2.
- In `BaseLayout`, so it's on **every** page (home + long-tail, EN + zh-CN) on `localhost:4321`.

## Verification

Dev: console `[Agentation] mounted`, launcher button renders bottom-right on `/`. Production: `pnpm --dir apps/marketing build` then `grep agentation\|importmap dist` → **0 matches** — excluded from production entirely. Add `?noagent` to any localhost URL to disable.
