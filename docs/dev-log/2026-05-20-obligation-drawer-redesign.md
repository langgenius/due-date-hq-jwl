# 2026-05-20 · Obligation drawer redesign + type-aware tabs + source-backed deadlines

## Summary

Closes the remaining Must items from
[docs/PRD/obligation-row-PRD.md](../PRD/obligation-row-PRD.md) §7.1 in one pass, plus a major
clarity sweep of the obligation detail drawer based on a structured audit. User feedback was
"current side panel for obligation detail is really hard to understand" — the audit turned up six
specific problems; this PR closes the top five.

## Shipped

### Drawer header — read at a glance

Before: title (client name) + subtitle ("1040 · Internal deadline 2026-04-15"). No status, no
obligation type, no jurisdiction, no tax year. The CPA had to scroll to learn what kind of row
they were looking at.

After: a row of inline chips immediately under the title:

```
Bright Studio S-Corp
Form 1120-S · [FILING] [FILED] [TY 2026] NY
Internal deadline 2026-03-16 · Statutory 2026-03-15
[Open client detail ↗]
```

- **Obligation type chip** (Filing / Payment / Deposit / Information return / Client action /
  Internal review) — answers the most-asked question on a row: "what kind of thing is this?"
- **Status pill** — duplicated from the row's chip, useful when the user reaches the drawer
  via dashboard navigation and lost queue context
- **Tax year** + **jurisdiction** — drop-in metadata
- **Statutory date inline** when it diverges from the firm-internal deadline (no more `*` marker)

### Type-aware tab visibility (PRD §7.1 Must)

New helper [apps/app/src/features/obligations/obligation-type.ts](../../apps/app/src/features/obligations/obligation-type.ts) maps each
obligation type to the tabs that actually apply:

| Type              | Visible tabs                                       |
| ----------------- | -------------------------------------------------- |
| `filing`          | Readiness · Extension · Risk · Evidence · Timeline |
| `payment`         | Risk · Evidence · Timeline                         |
| `deposit`         | Evidence · Timeline                                |
| `information`     | Readiness · Evidence · Timeline                    |
| `client_action`   | Readiness · Timeline                               |
| `internal_review` | Timeline                                           |

When the URL pins a tab that's hidden for the current row's type (e.g.
`?tab=extension` on a payment row), the drawer auto-bounces to the first visible tab via
`useEffect` so the body never renders empty.

### Risk tab — surface the blocker upfront

Before: Missing-penalty-facts callout lived mid-scroll, after 7 DetailRows. CPAs would read
"$0 / not calculated" without realizing they owed an input.

After: Missing-penalty-facts callout moved to the **top of the Risk tab** as an amber-bordered
warning panel. Plus a short explainer at the top of the tab clarifying the
projected-vs-accrued distinction (one of the audit's flagged confusions):

> Projected = what could accrue over the next 90 days if no action.
> Accrued = penalties already assessed as of today.

### Readiness tab — disambiguate field vs tab

Renamed the right-sidebar `Readiness` DetailRow to `Overall readiness` so it no longer
collides with the tab name. (Audit Problem #3.)

### Evidence tab — source-backed deadline citation (PRD §7.1 Must + PDF anti-pattern #6)

Restructured the Evidence tab so the rule citation chain is the primary content, not buried
below the file list:

1. **Matched rule** card — title + rule ID (mono) + version + the defaultTip explanation
2. **AUTHORITY CITATIONS** section heading
3. Per-citation cards showing:
   - Summary line (what the citation establishes)
   - Authority role badge (`BASIS` / `CLARIFICATION` / etc.)
   - Quoted `sourceExcerpt` from the source document
   - `Source #<sourceId> · retrieved <date>`
4. **Client evidence** section below — the actual file attachments

Result: every deadline now reads back to an IRS / state publication with a quoted excerpt and a
retrieved date — the audit-trail anchor PDF anti-pattern #6 demands ("AI may assist with
extraction; the rule catalog itself must be source-backed, versioned, human-reviewed,
auditable").

When `matchedRule` is null, a dashed callout warns: "Deadlines without a source citation can't
be defended in audit — bind it before relying on the date."

### Cross-surface verification

Audited every surface that consumes obligation rows. Findings:

- **Dashboard, Reminders**: already navigate to `/obligations?obligation=<id>` to open the
  shared drawer. They auto-inherit this redesign.
- **Client Work Plan panel** (`/clients/:id` → Filings & deadlines): rows ALREADY clickable via
  `obligationDrawerHref(obligation.id)` ([apps/app/src/features/clients/ClientFactsWorkspace.tsx:1160](../../apps/app/src/features/clients/ClientFactsWorkspace.tsx)). No change needed.
- **Pulse Affected Clients table**: selection-only, no detail surface — distinct concern.
- **Migration Step 4 preview**: read-only summary, no detail surface needed.
- **Calendar, Workload**: link to queue, no row rendering.

Result: the shared `ObligationQueueDetailDrawer` is the single source of truth, so this redesign
propagates to every consumer.

### Legacy status migration (PRD §7.1 Must)

Manual one-time SQL script at
[scripts/lifecycle-v2-status-backfill.sql](../../scripts/lifecycle-v2-status-backfill.sql). NOT
auto-run via Drizzle migrations because lifecycle v2 ships behind a flag and the parallel
session uses the same local D1 — running this destructively across active branches would step
on the other session.

Mapping:

```
pending           →  pending       (already labeled "Not started" in v2)
in_progress       →  review        (preparer work in flight = "In review")
review            →  review        (no change)
waiting_on_client →  waiting_on_client (no change)
done              →  done          (already labeled "Filed" in v2)
paid              →  completed     (payment-type fold-in)
extended          →  pending       (extension is a deadline mutation, not a status)
not_applicable    →  not_applicable (suppression flag, not queue state)
```

Run when ready:

```
pnpm dlx wrangler d1 execute due-date-hq-staging --local --file=scripts/lifecycle-v2-status-backfill.sql
```

Idempotent — re-running after a clean run is a no-op.

## Files touched

- `apps/app/src/features/obligations/obligation-type.ts` _(new)_ — `tabsForObligationType`,
  `isTabVisibleForType`, `useObligationTypeLabels`
- `apps/app/src/routes/obligations.tsx` — drawer header, type-aware tabs, Risk hoist,
  Evidence tab redesign, Readiness DetailRow rename
- `scripts/lifecycle-v2-status-backfill.sql` _(new)_
- `docs/dev-log/2026-05-20-obligation-drawer-redesign.md` _(new)_

## What still isn't done (deferred)

- **Right-sidebar consolidation on Readiness + Extension tabs** — audit's Problem #2. The
  sidebars duplicate data shown in the main flow. Leaving for a future polish pass; not blocking
  the user's core flow.
- **Drawer body width** at smaller breakpoints — still fine on desktop, may need shrink at
  640–900px. Out of scope for this batch.
- **Sticky footer with secondary CTAs** — audit's Problem #7. The drawer already has
  "Open client detail" inline; a sticky footer would help but isn't urgent.
