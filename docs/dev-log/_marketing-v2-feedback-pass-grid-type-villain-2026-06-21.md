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

## Still queued (next batches)

- **Hero delicacy** (orig) — everything in the alerts panel except the alert title smaller / lighter.
- **Notice rework** (#9–#14) — beam ("bad design" / "useful?"), doc vs extract equal width, extract fields given more weight.
- **Flow polish** (#7,#8), **sources borders** (#15), **close background + full-width receipt** (#17,#18), **compare width** (#16).
- Noticed earlier, still open: security section's "Sign in with Google" copy vs the dropped-Google direction.
