# `--m-display-2-size` + `.m-display-2` — secondary serif display primitive

**Date:** 2026-07-07 · marketing design-system

The "works with your stack" hub had two mid-page editorial serif headings (the
"promise" line and the CTA title) whose type was hand-sized with per-component
`clamp()` values — the one place the page freelanced sizes instead of pulling
from the marketing semantic scale.

Extracted them into a canonical primitive in `styles/marketing.css`:
- token `--m-display-2-size: clamp(26px, 3.2vw, 40px)` — one size for secondary
  serif display, a clear tier below `--m-page-title-size` (the page H1).
- class `.m-display-2` — same voice as `.m-page-title` (Instrument Serif · 400 ·
  `-0.02em` · `--m-ink`), one tier smaller. Owns type only; callers keep their
  own layout (max-width, centering, margins).

`WorksWithStackPage.astro` now uses `.m-display-2` on both headings and drops the
bespoke type CSS; the promise body also moved off a raw `clamp()` onto
`--m-text-lg` / `--m-leading-normal`. Net result: the component has zero
freelance font sizes — all type resolves through named tokens/classes, matching
the rest of the marketing site.

Reusable: any future page needing a sub-H1 serif "moment" uses `.m-display-2`
rather than a new clamp. Verified live — computed styles on both headings resolve
to Instrument Serif / 400 / `--m-display-2-size` / `--m-ink`; `astro check` clean.
