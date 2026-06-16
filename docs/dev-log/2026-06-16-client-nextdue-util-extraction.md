# Extract the duplicated client next-due day-math into one util

_2026-06-16_

The "days until the next-due obligation" computation
(`Math.ceil((dueDate − (asOf ?? now)) / day)`) was hand-copied in
`ClientDetailDrawer` (NextDueLine) and `ClientPeekHoverCard` — the drift risk the
2026-05-27 clients audit flagged. Extracted it as `daysUntilDueFromAsOf(dueDate,
asOfDate)` in `features/clients/use-client-next-due.ts` (alongside
`useClientNextDue`, the existing single-source for the peek surfaces' next-due
selection). Both call sites now use it; semantics unchanged (ceil + `Date.now()`
fallback). `ClientSummaryStrip` already used the hook + a simple overdue check, so
it had no day-math copy to migrate.

## Note on the broader audit item
The same audit asked to split the 5,672-line `ClientFactsWorkspace.tsx` into list
+ detail. **That split already happened** in a prior effort —
`ClientFactsWorkspace.tsx` is now 1,634 lines (the /clients directory/list, used
by `routes/clients.tsx`) and `ClientDetailWorkspace.tsx` is a separate 2,135-line
file (the /clients/:id detail, used by `routes/clients.$clientId.tsx`). The
monolith is gone; only this nextDue dedup remained.

Typecheck 0; clients suite 34 pass; full suite 535 pass.
