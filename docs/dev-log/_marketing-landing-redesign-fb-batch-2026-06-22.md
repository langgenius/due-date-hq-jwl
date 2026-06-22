# Marketing — landing redesign pass (14-item feedback batch)

**Date:** 2026-06-22
**Scope:** `apps/marketing` home sections. Executed as a multi-agent workflow
(one agent per section, balanced bias), then verified + committed by the main loop.

## Per-section changes

- **Hero** — much bigger, more confident display headline (EN serif up to ~76px,
  `text-wrap: balance`; a `data-zh` CJK guard caps the zh headline so full-width
  glyphs don't overwhelm the column). Deliberate grouped spacing instead of an
  even loose stack. Kept the subhead, ~10-min reassure line, both CTAs, the live
  Alerts preview, the `#how` handoff.
- **Surfaces** — rebuilt from four loose cards in a clipping horizontal rail into
  **one unified product "workbench"**: a single app-window frame (titlebar + traffic
  dots + jurisdiction tabs) holding the four surfaces (Alerts / Coverage / Worklist /
  Apply & audit) as connected panels on one continuous surface. The GSAP horizontal
  **pin was removed** (`ScrollMotion.astro` keeps only the reveal logic); the section
  now joins the fade+rise reveal. No-JS- and reduced-motion-safe.
- **Notice** — refined the example-type tabs: a recessed groove track + a white
  "selected chip" active state with a hairline ring and ≤4px lift, calmer idle hover,
  `:focus-visible` ring. (#1 delicacy)
- **Sources** — full-bleed band (`min(100% − margin, 1880px)`), bottom border gone.
  The US map now reads as **all 51 jurisdictions watched live, uniformly** ("no
  'priority' states and no afterthoughts") — the misleading two-tier framing is gone
  (owner override). The monitoring feed was rebuilt as a real product surface
  (agency badges, Federal/State provenance chips, status dots, mono timestamps, a
  Live pill, honest "sample preview · not your data"). (#2,3,4,6)
- **Compare** — full-width honest matrix (Status Quo / File In Time / TaxDome /
  **DueDateHQ "The Layer"**). Positioning filled (#8): _"We're not building another
  all-in-one. We're the layer they're all missing… every one of them assumes someone
  is watching when the deadlines themselves move. No one is. That's the one thing we
  do."_ (#5,7,8)
- **Security** — more professional / evidence-first: each glass-box stat (100% sourced
  / 0 auto-applied / 24h reversible) gained a verification line; calmer data cards.
  (#11)
- **Close** — distinct-yet-cohesive finale: the headline returns to the **display
  serif** that opens the Hero (the only other place it appears), with a cyan top-edge
  + faint corner light on the navy card; the audit receipt is now a **full-width**
  strip below the card. (#12,13)

## Nav (separate, bundled here)

- Collapsed pill floats clearly below the top edge (`margin-top` 10 → 18px) — owner:
  "the nav should stay there, not to the top of the screen."

## Verified

- `pnpm --dir apps/marketing build` → 76 pages, clean.
- Live (1440, reveals un-gated): no horizontal overflow; all 10 sections render;
  Surfaces is a single cohesive window (no clip); Sources full-bleed + 51 live tiles;
  Compare full-width; Close receipt full-width. EN + zh both build.

## Notes / follow-ups

- The motion (reveals + nav morph) still needs a real-browser pass (headless can't
  scroll).
- Next: subpages depth pass, then the site-wide system pass (type/spacing/grid/color/
  motion), then a whole-site design-critique.
