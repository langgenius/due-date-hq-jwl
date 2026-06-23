# Marketing — re-critique (3.25/4) + final two P1 fixes

**Date:** 2026-06-22
**Scope:** focused re-critique of the remediated site + the two genuine P1s it found.

## Re-critique result

Workflow re-scored the previously-weak dimensions and verified the fix list landed:
**overall 2.5 → 3.25 / 4 (+0.75)** (copy/IA 2→3, localization 2→3, a11y 3→4,
hierarchy 3). Report: `docs/marketing/design-critique-v2-2026-06-22.md`. It confirmed
the mobile nav, v2 meta/JSON-LD, Radar/SLA purge, pricing reconcile, footer, ScrollRail
and Surfaces-link fixes — and caught **two real P1s my remediation agents had missed**
(each in a file the owning agent didn't touch):

## The two fixes (done here, by the main loop)

1. **Stale positioning still shipped in the AI-discovery feeds.** `pages/llms.txt.ts`
   and `pages/llms-full.txt.ts` still opened with "a glass-box deadline-intelligence
   workbench" + "a deadline-and-rule-change **radar**" — the exact machine-readable
   channel P0-2/P1-1 targeted, just different files than the `i18n/` catalog that got
   fixed. Rewrote both to the v2 "deadline-change monitoring … catches when a deadline
   moves and shows which clients it affects" narrative; "radar" → "monitoring layer."
   Also `lib/seo-content.ts` named "Deadline Radar" as a product surface (EN + zh) →
   "Alerts." Grep for radar/glass-box across these three files = 0.

2. **The CJK display-serif guard was a silent no-op.** It had been added _inside_
   `@layer components` in `marketing.css`; Astro's scoped component `<style>` rules are
   **unlayered** and beat any `@layer` rule regardless of specificity — so zh headlines
   still rendered the Latin Instrument Serif (no CJK glyphs) with crushing negative
   tracking. Moved the `html[lang='zh-CN']` guard OUT of `@layer` and added `!important`
   so it reliably wins over both the scoped base rules and the per-component `data-zh`
   overrides. Verified live on `/zh-CN/pricing`: `.pr__title` now resolves to the
   `Songti SC` CJK stack, letter-spacing normal, line-height 1.18 (was Instrument Serif
   / -1.52px).

## Verified

`pnpm --dir apps/marketing build` → 76 pages clean. With these two fixes, the v2
report's only two ceiling issues are resolved.
