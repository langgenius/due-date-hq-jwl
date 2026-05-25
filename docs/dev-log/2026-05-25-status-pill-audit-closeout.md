# 2026-05-25 — Status-pill audit closeout: #2 + #8

## Why

Closes the last two items in
`docs/Design/status-pill-audit-2026-05-25.md` §4. After this
commit every recommendation in the audit is either landed or
documented as already-met.

## Shipped

### #2 — `EntityStateCell` review color confirmation

`apps/app/src/routes/rules.library.tsx:267`

The audit flagged this cell's `review` state as rendering amber
and asked for a flip to blue. By the time the audit closeout
ran, the code was already using `text-text-accent`, which
resolves to `--color-util-colors-primary-600` (`#155aef`, blue)
in both light and dark mode — the same blue token
`EntityApplicabilityCell` uses via `bg-accent-default`.

So the recommendation is already met. Added a comment block
above the function documenting this so a future reader doesn't
re-flip the token thinking the audit item is still open.

### #8 — `STATUS_DOT` retirement

The audit recommends auditing remaining `STATUS_DOT` importers
once the canonical badges went icon-led, then removing the
constant from the export surface so future surfaces can't
regress onto the legacy treatment.

State of the world before this commit:

- `ObligationStatusReadBadge` — icon-led, no `STATUS_DOT` use
- `ObligationQueueStatusControl` — icon-led, no `STATUS_DOT` use
- `actions-list.tsx` — already migrated to
  `ObligationStatusReadBadge` (earlier audit cleanup commit)
- `ObligationQueueScopeTab` — last remaining importer; passed
  `dotTone={STATUS_DOT[status]}` as a fallback to
  `BadgeStatusDot` for the case `icon` was missing — but
  every status-mapped tab also passed `icon`, so the fallback
  was already unreachable

Changes:

- **`apps/app/src/routes/obligations.tsx:178-184`** — dropped
  `STATUS_DOT` from the import block.
- **`apps/app/src/routes/obligations.tsx:2351-2375`** —
  dropped `dotTone={STATUS_DOT[status]}` from the
  `ObligationQueueScopeTab` call site.
- **`apps/app/src/routes/obligations.tsx:8929-8975`** —
  removed `dotTone` from `ObligationQueueScopeTab`'s prop
  type + body; the `BadgeStatusDot` fallback render branch is
  gone. JSDoc updated.
- **`apps/app/src/features/obligations/status-control.tsx:111-127`** —
  removed the `STATUS_DOT` declaration entirely. Replaced
  with a comment block explaining the retirement.
- **`apps/app/src/features/obligations/status-control.tsx:378-389`** —
  removed `STATUS_DOT` from the export list.

`BadgeStatusDot` itself stays — it's still the right primitive
for `outline` + dot chip families (members, invitations,
HealthBadge, TemporaryRuleStatusBadge) per the §3.3 ornament
rule.

## Files touched

- `apps/app/src/routes/rules.library.tsx`
- `apps/app/src/routes/obligations.tsx`
- `apps/app/src/features/obligations/status-control.tsx`

## Verification

- `vp check` → 0 lint/type errors across 674 files
- `grep -rn "STATUS_DOT" apps/app/src` returns no matches.

## What this closes

After this commit, every item in
`docs/Design/status-pill-audit-2026-05-25.md` §4 is closed:

- #1 dashboard `actions-list` → `ObligationStatusReadBadge` ✅
- #2 `EntityStateCell` review → blue ✅ (already met; documented)
- #3 `CoverageCell` review → blue ✅
- #4 `ClientReadinessBadge` drop inner dot ✅
- #5 members family unification ✅
- #6 `rejection-chip` → destructive variant ✅
- #7 `PulseSourceStatusBadge` → destructive ✅
- #8 `STATUS_DOT` retirement ✅
- #9 `InsightStatusBadge` Failed → destructive ✅
- #10 §3 tone ladder lifted into DESIGN.md §4.10 ✅
