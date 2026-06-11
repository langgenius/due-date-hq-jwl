# Deferred-cleanup batch (search family, text-links, button audit dispositions)

Date: 2026-06-10

Knocking out the items previously deferred from the search / text-link / button
audits.

## 1. CommandInput family aligned

The ⌘K command palette, the faceted-filter popover typeahead, and the combobox
all share `CommandInput` (`packages/ui/src/components/ui/command.tsx`). It's a
distinct modal/typeahead pattern (h-14 / in-popover), so it stays structurally
different from the page-level `SearchInput` — but its **placeholder color was
`text-text-placeholder`** while every page/rail search uses `text-text-secondary`.
Aligned it to `text-text-secondary` so the whole search family reads the same.
(Icon was already `text-text-tertiary`, matching SearchInput.)

## 2. TextLink — two new variants + 7 migrations

Added the variants the leftover inline links needed:

- `quiet` — `text-text-tertiary` at rest, `hover:text-text-accent hover:underline`.
  The "looks like body text until hover" affordance.
- `destructive` — `text-text-destructive` + underline-on-hover.

Migrated the 7 remaining hand-rolled links:

- `coverage-tab.tsx` ×3 — the active-count drill-in button + two cited-source
  `<a>` links → `<TextLink variant="quiet">` (render-prop for the anchors). The 2
  that were `text-secondary`-at-rest unify to the `quiet` tertiary rest.
- `Step1Intake.tsx` ×3 — "Paste a list instead", "Remove file", "Remove" →
  `<TextLink variant="quiet" size="sm">`.
- `AlertDetailDrawer.tsx` ×1 — the red "Retry now" → `<TextLink variant="destructive" size="sm">`.

There are now **zero** hand-rolled `text-text-accent/destructive … hover:underline`
inline links left.

## 3. /deadlines per-row assignee picker — reviewed, left as-is

The `size-8` dashed-circle "?" trigger (`obligations/queue/components/toolbar.tsx`)
is the unassigned affordance; its `size-8` matches the assigned avatar, so rows
don't jump, and the dashed-circle-to-assign pattern is intentional + consistent.
The only open item is the "?" glyph vs a user-plus icon — a design preference,
left for Yuqi's call. No code change.

## 4. Button-audit leftovers — dispositions

- **`outline` → `secondary` rename: NOT done, deliberately.** `variant="outline"`
  is on **75 `<Badge>`** vs 50 `<Button>` — a blind rename corrupts every Badge,
  and the Button alias is zero-visual-change. Multi-line JSX makes a Button-scoped
  codemod unsafe to automate. Keeping the stable alias; new code uses `secondary`.
- **The two `rounded-full` animated pills** (dashboard "+", ClientsEmptyState):
  intentional circle→pill expand affordances, already documented as sanctioned
  exceptions in their dev-logs. No change.
- **Alerts "Apply all"** (bulk-bar): a disabled, unwired placeholder pending
  F-041. A proper Button migration needs an `inverted-solid` variant for the dark
  bar (over-engineering for a placeholder). Left bespoke + documented.
- **~130 raw icon/row-action buttons**: not blind-migrated — many are legit
  custom (table cells, row triggers, toggles already handled). Needs a triage
  pass (categorize convertible-to-`<Button>` vs intentional-custom) before any
  migration; flagged as a separate scoped follow-up rather than a risky sweep.

## Verify

tsgo: 0 errors. `vp check`: clean on touched files.
