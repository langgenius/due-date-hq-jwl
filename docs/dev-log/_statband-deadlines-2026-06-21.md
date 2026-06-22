# StatBand on /deadlines (alongside the narrative banner)

2026-06-21

## What

Added the shared `StatBand` "card summary" to `/deadlines`
(`apps/app/src/routes/obligations.tsx`), the same primitive that already
drives `/clients`, `/clients/[id]`, `/rules/sources`, `/rules/library`, and
`/alerts/history`. It sits directly under the `PageHeader` and above the
existing narrative banner — both render; the band is NOT a replacement.

Five sentence-case stat cells:

- **Total tracked** — `scopeTotal` (every tracked deadline; anchor stat,
  stays neutral per the StatBand color budget).
- **Overdue** — `deadlinesNarrative.overdue` (destructive sub only when > 0).
- **Due this week** — new `deadlinesNarrative.dueThisWeek`, non-terminal rows
  in the 0–7 day window, the same semantics as `urgencyBandOf` and the
  toolbar's "Due this week" chip (warning sub only when > 0).
- **In review** — sum of `statusFacetCounts` over
  `LIFECYCLE_V2_STATUS_SETS.review` (`in_progress` + `review` + `extended`),
  so a merged stage counts its full raw-status set.
- **Filed** — sum over `LIFECYCLE_V2_STATUS_SETS.done` (`done` + `paid`).

## Why this split (band vs banner)

The narrative banner is ONE editorial sentence ("N overdue, M filing today —
clear the urgent set…"). The band breaks the portfolio into the CPA's triage
dimensions as multi-dimensional cells. No wording is duplicated between them.

## Data honesty

Every cell traces to a real aggregate already on the page: `scopeTotal`,
`deadlinesNarrative` (glance rows + `daysUntilEffectiveInternalDueDate`), and
the status facets (`facetsQuery.data.statuses`) that drive the scope tabs. No
new endpoint, no fiction. The band skeletons while `glanceQuery` /
`facetsQuery` are loading.

## Canon

- Reused the canonical `StatBand` primitive (no hand-roll).
- Color budget honored: anchor "Total" neutral; conditional tone (destructive
  / warning) only when the count is > 0; In review / Filed neutral.
- i18n: 9 new strings extracted + zh-CN translated + compiled `--strict`.
- `tsgo --noEmit` passes (rc 0).
