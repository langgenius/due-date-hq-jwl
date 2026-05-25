---
title: 'Coverage status v6: persistent right rail (master-detail)'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage status v6: persistent right rail (master-detail)

## Context

Designer prompt during v5 polish review:

> "the side panel should exist from the beginning? like it is a 'detail'
> display of the jurisdiction. And it is a right half of the page,
> rather than a masked background side panel. It is a part of the
> right panel, and occupies the right side of the side panel? If
> that's the case, why is not the rule library a part of the coverage
> status?"

Two related design moves bundled into one question:

1. Promote the rule-preview sheet from on-demand modal to a **persistent
   part of the page layout** — always visible, no overlay flicker.
2. If a jurisdiction detail pane lives on the same page, **Coverage
   absorbs ~80% of what Library is for** day-to-day. Library becomes
   the cross-jurisdiction catalog tool, not the daily destination.

## Change

Built v6 at `/rules/coverage-v6` as a side-by-side comparison with v5
(v5 stays untouched). The Coverage page is now master-detail:

```
┌─ left (calc(100% - 440px)) ─────────┬─ right rail (440px) ──┐
│ Business / Personal / All toggle    │ Practice summary (empty)│
│                                     │   – or –                │
│ ─── Needs your approval (4) ───     │ Jurisdiction detail     │
│ [CA card][NY card][FED card][TX]   │ (status + entity strip +│
│                                     │  pending rule list with │
│ ─── Manual verify (1) ───           │  Source ↗ chips)        │
│ [WA card]                           │   – or –                │
│                                     │ Rule detail (slim) with │
│ ─── Auto-managed (1) ───            │ "← Back to <jur>" and   │
│ [FL card]                           │  Accept / Reject + link │
│                                     │  to full audit modal    │
│ ▸ Standard queue (46)               │                         │
└─────────────────────────────────────┴─────────────────────────┘
```

### Files

- `apps/app/src/features/rules/coverage-rail-view.tsx` (new) — the view
- `apps/app/src/routes/rules.coverage-v6.tsx` (new) — the route
- `apps/app/src/router.tsx` (register lazy route)
- `apps/app/src/routes/route-summary.ts` (`rulesCoverageV6` entry)
- `apps/app/src/components/patterns/app-shell-nav.tsx` (sidebar item)

### Design decisions

**Rail width — 440px, not 50%.** Half-and-half on a 1440px laptop
gives 720px per pane, which is cramped on the left and wasteful on
the right. 440px is the Linear/Gmail/Slack-class width: enough to
show rule detail with applicability + due date + cited source +
Accept/Reject inline, while the left keeps its multi-column
section/card grid intact.

**Three rail states**, driven by two URL params:

| URL                     | Rail content                                |
| ----------------------- | ------------------------------------------- |
| no params               | Practice summary (total pending, source hp) |
| `?jur=<code>`           | Jurisdiction detail + pending rule list     |
| `?jur=<code>&rule=<id>` | Rule detail with "← back to <jur>" crumb    |

Both params are nuqs `useQueryState` with `history: 'replace'` so back
button still pops the whole page state cleanly. Deep-links work — you
can paste `/rules/coverage-v6?jur=CA&rule=ca…` and land directly on
the rule.

**Left cards drop the inline rule list.** v5 kept up to 4 pending
rules inside each rich card; v6 drops them entirely. The card only
advertises "click me for detail" — jurisdiction code, name, pending
count, status pill, entity strip. The rail does the rule work. This
is what makes the master-detail clean: rules live in one place (the
rail), not two.

**Rule detail in the rail is slim on purpose.** Not feature-parity
with the existing `RuleDetailDrawer` modal. Rail shows:

- Title + ID + version + status badge
- Applicability snapshot (jurisdiction / entity / tax type / form / year)
- Due date logic (humanized one-liner)
- Cited source link
- Practice review actions (Accept / Reject when pending)
- "Open full audit detail" → opens the existing modal `RuleDetailDrawer`

The modal still owns the deep audit footprint (Evidence list,
Verification footer, Extension fine print). Rail = decide quickly;
modal = audit deeply. Both reachable, no duplication.

**Practice summary as empty state** (no jurisdiction selected): total
pending across all jurisdictions + watched source count + degraded /
failing breakdown. Makes the rail useful before any click — a quick
read of "what's the state of this practice right now."

### Considered and rejected

- **Reusing `RuleDetailContent` from `rule-detail-drawer`.** Tried it
  first; crashes with `Cannot destructure property 'store' of
'useDialogRootContext(...)'` because `RuleDrawerHeader` uses
  `SheetTitle` / `SheetDescription` which depend on Base UI's Dialog
  context. Could refactor the header to use plain HTML, but that
  costs the modal its built-in `aria-labelledby` semantics. Built a
  parallel `RailRuleDetailBody` instead — minimal duplication, modal
  stays intact for full-audit jobs.
- **50/50 split.** Loses the left-pane card grid. Rejected for
  density reasons above.
- **Folding Library into Coverage as a tab.** Holds up for the daily
  "review pending" job, but Library still earns its keep for
  cross-jurisdiction search ("every S-Corp annual filing") and bulk
  catalog ops. Position: keep both routes; Library may eventually
  rename to "Catalog" if it shifts further into power-user territory.

## On Coverage vs Library

The user's implicit question: "If the rail shows a jurisdiction's
rules, why does Library exist?" Answer:

- **Coverage (v6)** is now the daily home: scan → select jurisdiction
  → see rules → approve/reject inline. ~80% of daily rule-review work.
- **Library** is the catalog tool: cross-jurisdiction search, bulk
  accept, version history, archive. Power-user / catalog-admin work.

The rail collapses the trip but doesn't dissolve the boundary.

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Browser preview at `/rules/coverage-v6`:
  - Empty rail state renders practice summary (123 pending, 88 sources)
  - Clicking California card → URL `?jur=CA`, rail shows California
    detail with 7 pending rules each with `Source ↗` chip
  - Clicking a rule title → URL `?jur=CA&rule=<id>`, rail shows rule
    detail with back breadcrumb, applicability, due date, source,
    Accept / Reject buttons, "Open full audit detail" CTA
  - "← Back to California" pops `?rule=` and returns to jurisdiction
    detail without losing scroll position
  - Deep-link `?jur=CA&rule=<id>` works on first load
  - Business / Personal / All toggle drives entity strips in both
    left cards and the rail jurisdiction detail
- v5 still rendered correctly at `/rules/coverage-v5`

## Files

- `apps/app/src/features/rules/coverage-rail-view.tsx` (new)
- `apps/app/src/routes/rules.coverage-v6.tsx` (new)
- `apps/app/src/features/rules/rule-detail-drawer.tsx` (unchanged in
  final state — temporary export was reverted)
- `apps/app/src/router.tsx`
- `apps/app/src/routes/route-summary.ts`
- `apps/app/src/components/patterns/app-shell-nav.tsx`
