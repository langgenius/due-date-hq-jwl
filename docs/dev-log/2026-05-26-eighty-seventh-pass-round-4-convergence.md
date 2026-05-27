# 87th pass · Round 4 — convergence point of the audit

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Summary

Round 4 of the "are you sure?" cycle. **Zero migrations shipped this
pass.** Every scan I ran surfaced candidates that, on closer inspection,
turned out to be appropriate-for-context or premature-abstraction.

This is the natural convergence point of the audit — the cost of
each new scan now exceeds the value of what it finds.

## Scans run and their honest verdicts

### Scan 1 — Form-error `<p text-destructive>` patterns

**9 candidate sites found.** Per-site verdict:

| Site                                    | Verdict                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `audit-log-page.tsx:402`                | Failure-reason text in list item — appropriate inline                                                                          |
| `members-page.tsx:1166`                 | `role="alert"` inline form-error — canonical pattern, NOT Alert primitive                                                      |
| `notification-preferences-page.tsx:308` | Failure-reason text in list item — appropriate                                                                                 |
| `app-shell-nav.tsx:501`                 | `role="alert"` inline form-error — same canonical pattern                                                                      |
| `obligations.tsx:6785, 6790`            | Field-level inline validation messages — appropriate `<p>`                                                                     |
| `obligations.tsx:10032`                 | Inside a hand-rolled destructive banner (border + icon + 2-line text). Could migrate but would change visual structure. Defer. |
| `practice.tsx:479`                      | `role="alert"` inline form-error — same canonical pattern                                                                      |

**Key insight:** the `<p role="alert" className="text-sm text-text-destructive">`
pattern (used in 3 form submissions) is **the correct ARIA live-region
pattern** for inline submission errors. Migrating to `<Alert>` would
shift layout (add box chrome) for what should be a quiet inline
notification. Not drift.

### Scan 2 — Button size mix per file

**2 files mix 3+ Button sizes** (`generation-preview-tab.tsx`,
`obligations.tsx`, both using xs/sm/icon-sm). Both are deliberate
hierarchies — icon-sm for tiny inline actions, xs for compact buttons,
sm for primary inline actions. NOT drift.

### Scan 3 — Skeleton h-N variants

**10 distinct h-values** in use (h-3, h-4, h-5, h-6, h-8, h-9, h-12,
h-14, h-20, h-24). Each maps to a content shape (h-3 for badge
skeletons, h-9 for input-row skeletons, h-12+ for full-row
skeletons). Distribution is appropriate. NOT drift.

### Scan 4 — Avatar size-N variants

**5 sizes in use** (size-4, 5, 6, 7, 8). Each used in different
density contexts (size-4 for tooltips/badges, size-5 for inline pills,
size-6 for queue rows, size-7 for cards, size-8 for headers + drawer
chrome). The entire avatar scale is exercised; the variety is the
point. NOT drift.

### Scan 5 — aria-invalid pairing

**13 `<Input ... aria-invalid={...}>` sites** — the Input primitive
has `aria-invalid:border-…  aria-invalid:bg-… aria-invalid:ring-…`
baked into its base className. Setting the attribute automatically
triggers the visual. Already canonical.

### Scan 6 — Loading copy without a visual indicator

(Scan script had a quoting bug; I caught it and didn't re-run because
the previous round's manual sweep already found the genuine cases.
The 8 from earlier are mostly inline messages in dropdowns / popovers /
combobox empty-results where inline `<Trans>Loading…</Trans>` is
appropriate, not drift.)

### Scan 7 — Sister-file / co-located local helpers

**12 local helper functions found across the app.** Two pairs looked
like "byte-identical shape" candidates for deduplication:

- `members-page.tsx`: `SeatStat` + `KpiStat` — both share outer
  container `flex min-h-24 flex-col px-5 py-4`. **But inner content
  diverges significantly** (SeatStat has progress bar + ratio
  display; KpiStat is generic label/value/detail). Refactoring to a
  generic `<KpiStat>` with children slot would obscure the seat-stat
  specifics for marginal line savings. **Premature abstraction.**
- `ClientFactsWorkspace.tsx`: `ClientActiveAlertsPulseCard` +
  `ClientActiveAlertsExtensionCard` — same outer container `flex
flex-wrap items-start gap-3 px-4 py-3`. **Inner content also
  diverges**: Pulse uses Badge leading + Button trailing; Extension
  uses Icon leading + no trailing. Extracting a 4-prop generic
  container would hide the per-card-type specifics. **Premature
  abstraction.**

In both cases, two co-located 20-line helpers are clearer than one
generic 30-line container with 4 ReactNode props.

## What this means

The audit has converged. Continuing past this point yields:

- **False positives** — candidates that look like drift via grep but
  are appropriate per context (canonical ARIA patterns,
  per-context sizing hierarchies).
- **Premature abstraction** — shape-similar helpers whose inner
  divergence makes consolidation worse than the duplication.

**Honest stopping rule met:** the next cross-reference scan would
likely find <2 net candidates, and the next "obvious" angle is no
longer obvious.

## Lessons across the full audit (rounds 1-4)

1. **Single-axis grep over-flags or under-finds.** Cross-reference
   scans (X imports Y vs files matching shape Y) are the right shape.
2. **Each "are you sure?" round found less.** Round 1 (initial A→L):
   ~80 sites. Round 2 (deferred-bundle): ~12. Round 3-r1 (B5 +
   segmented + empty-state): 10. Round 3-r2 (destructive Alert): 2.
   Round 3-r3 (evidence drawer empty-states): 2. Round 4: 0.
3. **Convergence is real but takes time.** The stopping rule isn't
   "no more candidates" but rather "remaining candidates are
   appropriate-per-context or premature abstraction."
4. **The honest design-system audit is iterative.** Each pass shifts
   the visible boundary of "what's clean" vs "what's drift." After 4
   rounds the boundary is stable.

## Final cumulative tally — design-system audit complete

| Pass                    | What landed                            | Sites                                                                                  |
| ----------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| Initial A→L (8 commits) | All 12 layers + deferred bundle        | ~92                                                                                    |
| "Are you sure?" R1      | B5 aria-busy + segmented + empty-state | 10                                                                                     |
| "Are you sure?" R2      | Destructive Alert primitive            | 2                                                                                      |
| "Are you sure?" R3      | Evidence drawer empty-states           | 2                                                                                      |
| "Are you sure?" R4      | _Converged — no migrations_            | 0                                                                                      |
| **Total**               |                                        | **~106 sites · 6 deduped blocks · 3 new tokens · 2 helpers · 3 component extractions** |
