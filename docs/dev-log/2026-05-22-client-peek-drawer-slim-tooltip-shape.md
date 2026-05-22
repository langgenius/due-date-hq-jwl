---
title: 'ClientDetailDrawer: redesigned as a brief identification peek (was a drawer-shaped detail page)'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: clients
---

# ClientDetailDrawer: slim peek shape

## What changed

`ClientDetailDrawer` (the drawer triggered by the eye icon on the
Obligations queue / Dashboard / Pulse rows) used to render the full
client profile body — `ClientSummaryStrip` (3 tiles), `ClientAlertsBand`
(Pulse + extension + missing-facts), `ClientCompliancePosturePanel`
(EIN, tax year, owners, activity-scope chips). At 640px width that
content was over-rendering, and on the Obligations row peek context
the layout broke visibly:

- The Next-due tile's form name wrapped mid-string ("Form 1120-" /
  "-1" / "S" across three lines).
- The 4-column compliance-posture header wrapped inconsistently
  (FEDERAL EIN + CLIENT SINCE broke to 2 lines, TAX YEAR + OWNERS
  stayed single-line).
- "1 late filings in 12mo" had the wrong plural form.
- The activity-scope chips' `−` prefix read like "remove" actions but
  were status indicators.

The drawer's actual job in this context is **identification**:
"which client is this row from? what entity / state? what's next due?"
Anything richer belongs on the full page.

## New shape

The drawer now renders:

1. **Name** (truncated, 18px)
2. **Caption**: "Sole prop · 1 open obligation"
3. **Identity chips**: entity / state / readiness (color-coded)
4. **Next due box**: form name + days-late/until on one line
5. **Action cluster**: `Open full page →` / `View all obligations`

Width shrunk from `min(640px, ...)` to `min(400px, ...)`. Total
content height: ~180px versus ~500px before.

Code shrunk too — from 222 lines to 195, with 4 fewer query calls
(dropped Pulse history + pulse detail fan-out + work-plan
summarizer) and 3 fewer component imports (`ClientSummaryStrip`,
`ClientAlertsBand`, `ClientCompliancePosturePanel`).

## What stayed the same

- The drawer is still triggered by `useClientDrawer().openDrawer(id)`,
  same provider, same routes (Obligations / Dashboard / Pulse).
- The `/clients` list route still navigates to the full page on row
  click rather than opening the drawer (unchanged in
  `ClientDrawerProvider`).
- The `/clients/[id]` full page renders the rich body
  (SummaryStrip + AlertsBand + CompliancePosturePanel) unchanged.
- `ClientSummaryStrip` and `ClientCompliancePosturePanel` are still
  used on the full page — only their use _inside the drawer_ was
  removed.

## Implementation notes

- **TaxCodeLabel**: the next-due form name renders via
  `<TaxCodeLabel code={nextDue.taxType} />` so raw codes like
  `federal_1040` show as friendly "Form 1040" with the standard
  hover tooltip (consistent with every other surface).
- **Days math**: inline `Math.ceil((dueTs - Date.now()) / 86_400_000)`
  matches what `ClientSummaryStrip` does on the full page.
- **TERMINAL_STATUSES**: same set as ClientSummaryStrip (`done`,
  `paid`, `completed`, `filed`, `not_applicable`) — the peek's
  "next due" matches the full-page tile's "next due."
- **No DOM nesting issues**: the drawer body is a regular `<div>`,
  not a `<button>` like TileShell, so `TaxCodeLabel` can render its
  default `TooltipTrigger` button without the asChild dance.

## Test plan

- Open `/obligations`, click the eye icon on a row → drawer opens
  showing name + entity/state/readiness chips + one-line next-due +
  two action buttons. Form names render readable (e.g. "Form 1040").
- Click `Open full page →` → navigates to `/clients/[id]` with the
  full body rendered.
- Click `View all obligations` → navigates to the filtered queue.
- Esc closes; X closes.
- On narrow viewports (mobile ~375px), the drawer takes full width
  (was already responsive — unchanged).
