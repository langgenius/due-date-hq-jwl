# /today section-title hierarchy: Alerts leads

_2026-06-21_

The `/today` dashboard had **three section titles at identical weight** —
`Alerts`, `Daily Brief`, and `Priorities`, all rendered `text-region-title
text-text-primary` (18px / 600 / ink). With no dominant title the eye had no
entry point: a von-Restorff miss flagged in the full-product audit. The audit
agent correctly **refused a half-fix**, since resolving it touches three
separate feature files and needs a call on *which* section leads.

## The call: Alerts dominates

The existing dashboard-actions design brief already documents the intended
order — **Alerts > Priorities > Brief** — because client-affecting regulatory
changes can *move* the deadlines below them, so they earn the day's lead. This
pass makes the title weights match that documented intent rather than inventing
a new hierarchy.

| Section | Before | After |
| --- | --- | --- |
| **Alerts** | `text-region-title text-text-primary` | unchanged — the one dominant section title (18px / 600 / ink) |
| **Daily Brief** | `text-region-title text-text-primary` | `text-base font-semibold text-text-secondary` (14px / 600 / slate) |
| **Priorities** | `text-region-title text-text-primary` | `text-base font-semibold text-text-secondary` (14px / 600 / slate) |

Result is a clean three-tier scan: the `Today` masthead anchors the page, the
**Alerts** title leads the body, and Brief + Priorities sit one tier down as
peer working sections (their content — the brief teaser, the priorities table —
carries the weight, not their labels).

## Files

- `apps/app/src/features/dashboard/daily-brief-card.tsx` — Daily Brief h2 demoted.
- `apps/app/src/features/dashboard/merged-brief-card.tsx` — Priorities h2 demoted (both loading + loaded states).
- `apps/app/src/features/dashboard/needs-attention-section.tsx` — Alerts h2 left as the dominant title (no change).

Verified live on `/today`: Alerts 18px / `rgb(16,24,40)`; Priorities 14px /
`rgb(53,64,82)`. Easily flipped to Priorities-leads if the product call changes.

> Closes the last deferred P1 from the 2026-06-21 full-product audit.
