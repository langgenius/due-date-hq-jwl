# Marketing — subpage product-UI peeks + placeholder images

**Date:** 2026-06-23. Added visuals to the text-only subpages — a product-UI peek
in the leaf heroes + labelled placeholder slots where real images/screenshots go.

## Shared primitives

- **`.m-figure`** (marketing.css) — a labelled, on-brand placeholder for a real
  image / screenshot / diagram: soft accent-tint wash, 1px border, a centered
  "what goes here" pill. `--m-figure-ratio` overrides the aspect. Swap the inner
  content for an `<img>` when ready; the frame stays.
- **`Figure.astro`** — a tiny component wrapping `.m-figure` (label + ratio + alt),
  so every placeholder is consistent across the site.

## Where applied

- **Rules / compare leaf heroes** (GeoResourcePage) — a **2-column hero** mirroring
  the home: serif text + a compact "● Watched in DueDateHQ · Preview" product peek
  built from the page's **own** first sourced date (real data — no fabricated client
  counts), with the source link + a "if this date moves, you see who it hits — the
  same day" caption.
- **Guides leaf heroes** — guides without key dates fall back to a labelled `Figure`
  placeholder so the hero still carries a visual.
- **/how-it-works (EN + zh)** — a 16/9 "Product screenshot" placeholder under the
  worked-example strip (the page's LoopDeep/SurfaceDeep already carry mini-UIs; this
  is the slot for a real app screenshot).
- **Trust signature pages** — an "Architecture diagram" slot on /security (16/7) and
  a "Team photo" slot on /about (16/9).

## Verified

Build 76 pages clean. Live: rules peek renders the real date + source; figure
measures exactly 16/9 with border + label; the 2-col hero stacks cleanly on mobile
(390px) with no horizontal overflow. Honest framing throughout (Preview / placeholder
labels) — no fabricated data on canvas.
