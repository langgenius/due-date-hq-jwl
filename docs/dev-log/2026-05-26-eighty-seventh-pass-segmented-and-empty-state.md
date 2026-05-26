# 87th pass · Segmented control + empty-state primitive coverage

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Why this pass exists

When the user pushed back ("are you sure these are all?"), the re-audit
of dimensions I'd waved off found two genuine drift candidates that
the earlier mechanical scans missed because they were structural, not
className-shape:

1. A **hand-rolled segmented control** in `coverage-tab.tsx` using a
   custom `<div role="tablist">` with two `<button role="tab">`
   elements, instead of the shared `<Tabs>` primitive.
2. Two list pages rendering **empty states as inline single-line
   bordered messages** instead of using the canonical `EmptyState`
   primitive (dashed-border centered card).

## Sort indicators — confirmed CLEAN, not drift

Sortable columns are concentrated in **one surface** (`ClientFactsWorkspace.tsx`,
7 column uses). The internal `sortState={...} onToggle={...}` pattern
is consistent across all 7. Other surfaces (`/deadlines`, `/rules/library`)
are not sortable. So sort indicators don't have cross-surface drift to
sweep — they're a feature of one table.

## Empty-state coverage — partial drift surfaced

Worktree-wide scan found 11 files importing the `EmptyState` primitive
and 29 files with "no X" / "nothing" copy strings that DON'T import
it. Most of the 29 are **inline messages in dropdowns / popovers /
combobox empty-results** where a single-line `<Trans>No results</Trans>`
is the appropriate pattern, not a full empty-state card.

Two were genuine drift:

- `apps/app/src/features/workload/workload-page.tsx:162` — workload
  table's no-rows fallback was a solid-bordered single-line panel.
- `apps/app/src/features/reminders/reminders-page.tsx:389` — reminders
  table's no-rows fallback, same shape.

Both rendered as `rounded-md border p-4/p-6 text-sm text-text-secondary`
inline messages, when the canonical `EmptyState` (dashed border,
centered, title-as-headline, optional icon + description + CTA) is
specifically designed for that slot.

**Migrated** both to:

```tsx
<EmptyState title={<Trans>…</Trans>} />
```

Visual delta: solid → dashed border, single line → centered card with
optional headline weight. Matches the empty-state visual register
across the rest of the app (dashboard, opportunities, alerts, etc.
all use the same primitive).

## Segmented control — `RuleQueueModeToggle` → `<Tabs>` primitive

`apps/app/src/features/rules/coverage-tab.tsx:1942-1994` was a
hand-rolled `<div role="tablist">` containing two `<button role="tab"
aria-selected={...}>` triggers (Pending / Active). Both buttons were
byte-near-identical in their visual class strings, with conditional
active styling via a JS template literal.

Refactored to use the `<Tabs>` primitive from `@duedatehq/ui`:

```tsx
<Tabs value={mode} onValueChange={...} className="!gap-0">
  <TabsList aria-label={t`Rule queue`} className="grid w-full grid-cols-2">
    <TabsTrigger value="pending" disabled={pendingCount === 0}>…</TabsTrigger>
    <TabsTrigger value="active" disabled={activeCount === 0}>…</TabsTrigger>
  </TabsList>
</Tabs>
```

Layout notes:

- `!gap-0` overrides the Tabs primitive's default `gap-2` (which adds
  space below the TabsList for tab content). Coverage-tab renders its
  pending/active panels OUTSIDE the toggle, so the gap is unnecessary.
- `grid w-full grid-cols-2` on the TabsList preserves the original
  full-width / equal-column layout.
- Panel content stays rendered externally by the caller — Tabs.Root
  works fine as a controller-only without `<TabsContent>` (the
  original `<div role="tablist">` had no aria-controls relationship
  either, so a11y story is equivalent).

Visual delta: font goes from text-xs → text-sm (the primitive's
baseline). Active background uses `bg-components-segmented-item-bg-active`
instead of `bg-background-default`, which is the design-system
canonical for segmented controls. Both could resolve to similar light
gray tones, but the token-namespaced version is the right one going
forward.

## Files changed this pass

- `apps/app/src/features/rules/coverage-tab.tsx` — `Tabs` import + refactor
- `apps/app/src/features/workload/workload-page.tsx` — `EmptyState` import + migration
- `apps/app/src/features/reminders/reminders-page.tsx` — `EmptyState` import + migration

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app`.
- All three changes preserve component APIs (`RuleQueueModeToggle`
  callers untouched, both pages still render no-rows fallback in the
  same parent slot).

## Updated cumulative tally

| Layer addition                                             | Sites        |
| ---------------------------------------------------------- | ------------ |
| Layer B5 — `aria-busy` on fire-buttons                     | 7            |
| Layer C extension — `<Tabs>` primitive (segmented control) | 1            |
| Layer C extension — `EmptyState` primitive coverage        | 2            |
| **This pass total**                                        | **10 sites** |

Running session total: **109 sites snapped, 6 deduped blocks → 2 primitives, 3 new tokens, 2 new helpers, 1 local primitive.**
