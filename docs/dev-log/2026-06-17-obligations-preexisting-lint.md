# Clear the two pre-existing lint errors in routes/obligations.tsx

_2026-06-17_

After the [orphan cascade](2026-06-17-obligations-orphan-cascade.md) the file was
typecheck- and dead-code-clean, but `vp check` still surfaced two **pre-existing**
issues (confirmed byte-identical on the committed HEAD baseline — not introduced by
the cascade). Cleared both so the route is error-clean.

## 1. `columns` useMemo dependency drift (was a latent stale-closure)

The big `columns` `useMemo` listed `setObligationQueueQuery` in its deps but no
longer referenced it, and used `openQueueDetail` in a cell's row-open handler
_without_ listing it. Swapped the dep array to match actual usage
(−`setObligationQueueQuery`, +`openQueueDetail`).

Behavior-neutral in practice — `openQueueDetail` is a `useCallback` whose identity
only shifts with `deadlineDetailSearch`/`activeDetailTab`/`navigate`, the same
cadence the memo already rebuilds on (`rowsById`, `statusFacetCounts`, `sort`…). But
it removes a real latent bug: if `openQueueDetail`'s identity changed without any
_other_ dep changing, the row-open closure would navigate with stale search params.

## 2. `labelOf` hoisted out of `ObligationActiveFilterChips`

`labelOf` was a pure facet-label resolver nested in the component but capturing
nothing from its scope (`unicorn(consistent-function-scoping)`). Hoisted it to
module scope as `facetLabelOf(options, value)` and pointed the five chip call sites
at it. `removeFacet` stays nested — it closes over `onPatch`.

## Left as-is (deliberate)

One `typescript(no-unsafe-type-assertion)` warning remains at the
`status as keyof typeof LIFECYCLE_V2_STATUS_SETS` cast — it is **guarded** by a
`status in LIFECYCLE_V2_STATUS_SETS` check on the line above, so the assertion is
provably safe at runtime. It is a tolerated _warning_ (not an error); rewriting the
live status-mapping narrowing to silence it would churn correct code for no behavior
change, so it stays.

Verified: typecheck 0; `vp check` → **0 errors, 1 (guarded) warning**; full suite
535 pass / 2 skipped; `/deadlines?taxType=federal_1040` renders live — filters to 3
rows, the active-filter chip resolves to "Form · Form 1040", zero console errors.
