# Eighty-seventh pass — Tidy 4a/N: dedup `KbdHint` + `EmptyState`

**Date:** 2026-05-26
**Branch:** `feat/jolly-hopper-46479d`

## What this pass does

Pass 4 phase A — first deduplication pass. Audited every same-name
top-level `function` definition across `apps/app/src/` and found 8
names defined in 2-3 files each. This commit resolves the **two
biggest collisions** (`KbdHint` 2× and `EmptyState` 3×); the remaining
6 are documented at the bottom for follow-up commits.

## Audit methodology

```
grep -rhnE "^(export )?function [A-Z][A-Za-z0-9_]*\b" apps/app/src \
  | sed -E 's/^[0-9]+:(export )?function ([A-Z][A-Za-z0-9_]*).*/\2/' \
  | sort | uniq -c | sort -rn | awk '$1 > 1'
```

Then for each duplicate name, read both definitions and classified as
one of:

- **Real duplicate** (identical or near-identical implementation) →
  merge into a single canonical version.
- **Name collision on different concepts** → rename the non-canonical
  one to what it actually does.
- **Wrapper around a primitive** → reuse the primitive (canonical's
  shape covers the wrapper's needs).

## Changes

### 1. `KbdHint` — 2× → 1× (real wrapper / drifted styling)

Two definitions:

- `apps/app/src/components/patterns/kbd.tsx` — canonical, takes
  `items: Array<{ keys: string[]; label: string }>`, renders the full
  bullet-separated hint strip.
- `apps/app/src/routes/rules.library.tsx` — local single-shortcut
  variant `{ k: string; label: string }`, hand-rolled `<kbd>` element
  with **drifted styling**: `h-4 min-w-4 rounded-sm bg-background-default`
  vs the canonical `h-[18px] min-w-[18px] rounded bg-background-subtle`.

The two consumer sites in rules.library.tsx (`RowNavHints` for the
grid toolbar, `KeyboardHints` for the batch-review modal footer)
were rebuilt to use the canonical with the `items` array form. Their
hand-rolled wrapper `<div>` (which did the bullet-separator work) is
gone — the canonical handles that internally. Side benefit:
sizing/spacing now matches every other kbd-hint surface in the app.

Net: `KbdHint` local function deleted from rules.library.tsx; added
`import { KbdHint } from '@/components/patterns/kbd'`.

### 2. `EmptyState` — 3× → 1× (one canonical, two name collisions)

Three definitions:

- `apps/app/src/components/patterns/empty-state.tsx` — canonical
  primitive with `icon/title/description/cta` props. Used by /deadlines,
  /clients, /rules/library, and others.
- `apps/app/src/routes/obligations.tsx` — **wrapper** around the
  canonical that adds business-specific empty-state copy for the
  /deadlines queue (Open Wizard CTA vs Clear Filters CTA, branching
  on `hasActiveFilters`). It was imported the canonical as
  `EmptyState as SharedEmptyState` to dodge the name collision.
- `apps/app/src/features/pulse/AlertsListPage.tsx` — actually a
  **status banner** ("All clear. We're watching N sources; new
  matches will appear here") with a `PulsingDot` accent. Not an
  empty-state slot at all — it's a positive status indicator that
  happens to render when there's nothing else to show.

Decision: the name `EmptyState` belongs to the canonical primitive.
The wrapper and the banner both got renamed:

- `obligations.tsx`: local `function EmptyState(...)` →
  `function ObligationQueueEmptyState(...)`. The `as SharedEmptyState`
  alias on the canonical import was dropped — it now imports as
  `EmptyState` like every other consumer.
- `AlertsListPage.tsx`: local `function EmptyState(...)` →
  `function AlertsAllClearBanner(...)`. Added a comment at the
  definition explaining why it's not named EmptyState (it's a status
  banner, not a pattern slot).

## Verification

```
pnpm exec tsc -p apps/app/tsconfig.json --noEmit  → clean
pnpm exec vp lint apps/app                        → 0 warnings, 0 errors
```

Re-run of the same-name-function audit confirms `EmptyState` and
`KbdHint` no longer appear:

```
=== Same-name function defs in 2+ files (apps/app/src) ===
   2 SummaryMetric
   2 SectionLabel
   2 SectionHeader
   2 MetadataRow
   2 EvidenceCard
   2 ConfidenceBadge
```

## Remaining duplicates (Pass 4 phase B candidates)

Each needs the same per-case read-both-and-classify treatment:

- **`SummaryMetric`** — `migration/Step2Mapping.tsx` +
  `migration/Step3Normalize.tsx`. Both inside the migration wizard;
  almost certainly a real duplicate that should move into a shared
  wizard helper.
- **`SectionLabel`** — `rules/rules-console-primitives.tsx` (exported)
  - `rules/rule-detail-drawer.tsx` (local). Likely the drawer should
    import from primitives.
- **`SectionHeader`** — `dashboard/actions-list.tsx` +
  `members/members-page.tsx`. Probably parallel implementations of
  the same section-heading shape; merge into a shared primitive.
- **`MetadataRow`** — `calendar/calendar-page.tsx` +
  `audit/audit-event-drawer.tsx`. Common key/value renderer pattern;
  likely a shared primitive.
- **`EvidenceCard`** — `evidence/EvidenceDrawerProvider.tsx` +
  `rules/rule-detail-drawer.tsx`. Both render evidence/citations; high
  semantic overlap; investigate before merging.
- **`ConfidenceBadge`** — `evidence/EvidenceDrawerProvider.tsx` +
  `migration/Step2Mapping.tsx`. Different domains (AI evidence vs
  CSV mapping confidence) — probably a name collision, not a real
  duplicate. Likely rename one.

Not in scope here: behavioral-pattern duplicates that don't share
the same function name (e.g., AssigneeAvatar in obligations.tsx vs
ClientAssigneeAvatar in ClientFactsWorkspace.tsx). Those are a
separate dedup question.

## Files

- Modified: `apps/app/src/routes/rules.library.tsx`
- Modified: `apps/app/src/routes/obligations.tsx`
- Modified: `apps/app/src/features/pulse/AlertsListPage.tsx`
- New: `docs/dev-log/2026-05-26-eighty-seventh-pass-tidy-4a-dedup-kbdhint-emptystate.md`
