# Marketing — subpage coherence: shared back-nav + serif hero everywhere

**Date:** 2026-06-23. Cross-referenced every subpage hero; closed two coherence gaps.

## 1. Obvious, consistent back-nav (drill-down → parent)

Audit: only `StateDetailPage` had a back affordance; rules/guides/compare leaves had
none. Added a shared `.m-page-back` kit class — a sentence-case link with a circled
arrow at the top of the hero ("← Back to …"), one treatment everywhere.

- `marketing.css`: new `.m-page-back` + `.m-page-back__arrow` (hover → accent, arrow
  shifts, gap opens).
- `GeoResourcePage`: optional `back={{ href, label }}` prop; renders the link, composes
  "Back to {label}" / "返回{label}".
- Wired all 6 leaf pages (EN + zh): rules→/rules ("Rule library"), guides & compare→
  /how-it-works, states already → /state-coverage.
- `StateDetailPage`: migrated its bespoke back-link onto the shared class.

Note: guides & compare have no dedicated hub index, so their back-link points at
`/how-it-works`. A real `/guides` + `/compare` hub would be the cleaner parent later.

## 2. Serif hero on every subpage (one voice with the home)

Audit found a serif/sans split: home, Close, state-detail, state-coverage, pricing,
how-it-works, and trust security/about were already display serif; only the
**rules/guides/compare leaves** (`.m-page-title`) and **trust legal pages**
(`.trustpg__title`) were still sans. Flipped both to the display serif so every page
opens in the same editorial voice as the home hero.

- `.m-page-title` → `--m-font-display` 400, clamp(34→58px), lh 1.04. Verified it still
  handles long programmatic SEO titles cleanly (wraps to 3 calm lines).
- `.trustpg__title` base → serif; `--display` kept as the bigger security/about variant.

Build 76 pages clean. Verified live on a long-title rules leaf + the back-link.
View Transitions + subpage images/UI mockups follow in the next batches.
