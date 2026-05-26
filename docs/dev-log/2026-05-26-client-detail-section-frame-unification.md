---
title: 'Client detail: section-frame audit across tab bodies'
date: 2026-05-26
author: 'Yuqi pairing with Claude'
area: ux
---

# Client detail — section frames snapped to canonical

Critique sources:

- `docs/Design/clients-family-macro-micro-audit-2026-05-26.md` §3.5
  ("tab body section-frame inconsistency — mixed (AI summary in a
  frame; notes + log flat) — pick ONE pattern")
- `docs/Design/page-family-canonical.md` §9 (section frame)

## Canonical shape

```
rounded-md border-divider-regular bg-background-default p-4
```

## Audit

| Tab | Section | Before | After |
| --- | --- | --- | --- |
| Work | Filing plan year panels | canonical | canonical (no change, comment refreshed) |
| Info | Compliance posture | panel owns frame | unchanged |
| Info | Filing jurisdictions | canonical | unchanged |
| Info | Risk profile | canonical | unchanged |
| Info | Onboarding state | canonical | unchanged |
| Info | Import source / contact | canonical | unchanged |
| Opportunities | Suggested forms | **double-framed** (outer wrapper + panel's own frame, panel border was `-subtle`) | dropped outer wrapper, panel border snapped to `-regular`, skeleton border snapped to `-regular` |
| Opportunities | Future business cues | `ClientOpportunitiesCard` lives in `features/opportunities/` (out of scope) | unchanged |
| Activity | Client summary (AI) | canonical | unchanged |
| Activity | Notes | canonical (content) + EmptyState (empty) | unchanged from Task 2 |
| Activity | Activity log | **per-row cards on transparent section** (third visual dialect) | one outer canonical frame, `divide-y` rows |

## Why divide-y instead of per-row cards for the audit log

The audit log used to render each event as a `rounded-md
bg-background-section` card with `gap-2` between them — a "list of
chips" treatment. That was the third visual dialect on the
Activity tab (AI summary used the canonical outer frame; Notes
also used the canonical outer frame). The audit recommendation
was to pick one pattern. Canonical wins — it's the system-level
rule and matches what the other two sections on the same tab
already do.

Trade-off: rows are slightly denser without the per-card padding.
That's fine for audit events — they're scannable strings, not
content cards.

## Carry-over

`ClientOpportunitiesCard` (in `features/opportunities/`) renders
its own `<Card>` chrome and is wrapped on this page as
"`<ClientOpportunitiesCard>` stands alone." Its internal frame
treatment wasn't touched (file out of scope for this commit).
