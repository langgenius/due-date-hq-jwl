# Marketing v2 — feedback pass (grid follow-through, type consistency, villain, hero delicacy)

**Date:** 2026-06-21 · `docs/marketing/design-explorations/production-v2.html`. Driven by a screenshot + 18 Agentation comments + `/impeccable` `/type-system` `/tokenize` lenses. Worked in committed batches.

## Batch 1 — container width, villain rework, type rhythm

- **Wider container (#2)** — `--maxw` 1140 → **1240**; the whole page (still on the shared 12-col grid) breathes wider. The earlier narrowing felt cramped.
- **Villain → a navy accent band (#3/#4/#5)**:
  - Full-bleed **`background: var(--accent)`** with white text — a dark beat between the two light sections. (`.dim` clause at 50% white, the bolded line solid white. Caught + removed a pre-existing duplicate `.villain .body .dim/strong` rule that was overriding the new white colors with `--ink`/`--muted`.)
  - **6 / 6** columns (was 5/7) — "half half".
  - Restructured so **"Sound familiar?" is a full-width eyebrow** above the grid, and the headline (left) + body (right) **top-align** to the same line.
- **Type rhythm (orig ask, #6)** — introduced **`--eyebrow-gap: 16px`** owned by `.eyebrow { margin-bottom }`, and **deleted the ad-hoc inline `margin-top` on every `<h2>`** (they ranged 10 / 14 / 18px). Every eyebrow→title gap is now one value.
- **Removed the resting underline on the ghost link (#1)** ("See how it works") — underline only on hover now.

Verified desktop (1280) + mobile (390): villain stacks to one column, all text readable; hero is 1240 wide; ghost link has no resting underline.

## Batch 2 — hero alerts panel made delicate

"Everything except the alert title smaller / more delicate." Kept `.ar__title` at **14px** (the anchor) and quieted everything around it so it stands clearly apart:
- panel header `.ap__title` 13 → **12px**, `--ink` → `--ink-2`
- filter chips `.ap__chip` 12 → **11px**, padding tightened
- `.ar__affect` ("Affects N clients") 13 → **12px**, weight 500 → **400**, `--ink` → `--ink-2`
- ready·review `.split` 12 → **11px**, weight 500 → **400**, `--muted` → `--faint`

The row now has one solid element (the title) and a quiet field of metadata, rather than five competing weights.

## Batch 3 — notice rework + nav over the dark band

- **Notice (#9–14)** — dropped the scan-chip + Reads/Classifies/Matches bubbles + vertical SVG line. Replaced with a **minimal connector** (dot · dashed line · → arrow, matching the workflow-diagram reference the user shared), going vertical on mobile. The document and the extracted fields are now **equal width** (12-col: clip 5 / connector 2 / extract 5), which elevates the extract from its old smaller column. "Don't waste space" honored — no chrome, just the connector.
- **Nav over the dark section** — the navy villain band broke the transparent nav (dark logo + navy CTA both invisible on navy). Added a **`nav--on-dark`** state (white logo incl. overriding the hardcoded SVG fills, translucent-white BETA pill + nav pill, white nav links, **white CTA with navy text**) toggled by a scroll handler that detects when the nav's midline sits over any `.villain` band. Transitions smoothly; reverts over light sections.

## Still queued (next batches)
- **Left scroll-spy rail** (new ref — Canopy) — a sticky left sidebar listing the page sections with the active one highlighted, so the reader knows where they are. Likely scoped to the product-surfaces / "see it work" scroll region.
- **Content de-dup audit** (`/critique`) — check sections aren't repeating the same claims (the "watches IRS + 50 states + FEMA" line recurs in hero / how-it-works / sources; the value prop is restated several times).

- **Hero delicacy** (orig) — everything in the alerts panel except the alert title smaller / lighter.
- **Notice rework** (#9–#14) — beam ("bad design" / "useful?"), doc vs extract equal width, extract fields given more weight.
- **Flow polish** (#7,#8), **sources borders** (#15), **close background + full-width receipt** (#17,#18), **compare width** (#16).
- Noticed earlier, still open: security section's "Sign in with Google" copy vs the dropped-Google direction.
