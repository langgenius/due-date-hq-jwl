# Alerts change-type filter: 9 kinds → 4 buckets

## Context

The `/alerts` filter row's **Change types** dropdown listed all nine
`PulseChangeKind` values plus `all` — ten radio items. That is more than a CPA
wants to scan for a triage filter, and several kinds read as near-duplicates in
this surface (`deadline_shift` vs `new_obligation`; `source_status` vs
`rule_source_drift`). The granular kinds are produced by the AI/deterministic
classifier and stored on each alert; they are right for the per-card chip, but
too fine for a filter.

## Change

Collapsed the dropdown to **4 buckets + All** (5 items). This is a _filter-layer_
grouping only — the DB enum, the contract `PulseChangeKindSchema`, the AI
classification, and the per-card affordances (`PulseChangeKindChip`,
`PulseToneIcon`) are all untouched. Granularity stays on the card; the filter
just groups.

Buckets (`apps/app/src/features/alerts/lib/alert-filters.ts`):

| Dropdown option  | Underlying kinds                                                |
| ---------------- | --------------------------------------------------------------- |
| All change types | (every kind)                                                    |
| Deadlines        | `deadline_shift`, `new_obligation`                              |
| Rules & forms    | `filing_requirement`, `applicability_scope`, `form_instruction` |
| Source updates   | `source_status`, `rule_source_drift`                            |
| Other changes    | `threshold_advisory`, `other`                                   |

- New `CHANGE_KIND_FILTER_GROUP_MEMBERS` map (`group → readonly PulseChangeKind[]`),
  constrained with `as const satisfies Record<string, readonly PulseChangeKind[]>`
  so every bucket member is a real kind.
- `CHANGE_KIND_FILTER_OPTIONS` now holds the four group keys + `all`, constrained
  with `satisfies readonly ('all' | AlertChangeKindFilterGroup)[]` so a typo in
  the option list is a compile error.
- New `matchesChangeKindFilter(changeKind, filter)` replaces the old inline
  `=== changeKindFilter` equality check in the `filteredAlerts` predicate
  (`AlertsListPage.tsx`).
- `changeKindFilterLabel` rewritten to name the four buckets; the now-unused
  per-kind `changeKindLabel` helper and its `PulseChangeKind` import were removed
  from the page.

Group keys are deliberately clean single words (`deadlines` / `rules` / `source`
/ `other`) so the existing `FilterTrigger` `valueLabel` (the Geist-Mono pill that
echoes the active key) still reads well with no extra label plumbing — same
pattern as the Severity / Status pills.

## Why this way

- **Filter-layer, not data-layer.** Grouping in the UI avoids a DB migration and
  re-classification, keeps the cards precise, and is reversible. The filter state
  is local React state with no URL/persistence, so changing the option values
  carries no migration of saved filters.
- **Mental model = timing / substance / source / misc.** A CPA triaging alerts
  asks "did _when_ change, did _what I must do_ change, or is this about the
  _source_ itself?" The four buckets map onto exactly that.
- **`threshold_advisory` → Other**, not Rules. It is the deterministic-only,
  advisory inflation-threshold pointer (no asserted amounts); folding it into the
  advisory/catch-all bucket is more honest than implying a substantive rule edit.
- **4 buckets over 3.** A tighter 3-bucket cut would fold _Source updates_ into
  _Other_. We kept it separate so the actionable "source changed — re-verify"
  signal (`rule_source_drift`) stays filterable on its own. Revisit if source-kind
  volume turns out to be negligible.

## Validation

Worktree has no `node_modules`; symlinked the main checkout's `node_modules`
(root + `apps/app`) in to run the toolchain against the actual worktree edits,
then removed the symlinks.

- `tsc -p apps/app/tsconfig.json --noEmit` — **0 errors** (the two `satisfies`
  constraints, the matcher, the removed import, and the now-exhaustive label
  switch all check).
- `vp test run` on the alerts suite — **7/7 pass**, incl. `AlertsListPage.test.tsx`
  (the page renders with the grouped filter, no runtime break) and the sibling
  `lib/impact-filter.test.ts` (the edited `alert-filters.ts` module graph imports
  clean).
- A throwaway grouping test (run, then deleted) proved: exactly 5 options; the 9
  kinds are covered by the 4 buckets with no orphan and no duplicate; `all`
  matches every kind; `deadlines` matches both `deadline_shift` and
  `new_obligation`; `source` matches only the two source kinds.
- Visual preview not used: `/alerts` is behind `protectedLoader` (Google/OTP
  login), so the component test stands in for the in-browser check.

## Follow-up

- **i18n.** This removed 8 old `<Trans>` strings and added 3 new bucket labels
  ("Deadlines", "Rules & forms", "Source updates"); "All change types" and "Other
  changes" are retained. English defaults render in dev, but non-English locales
  fall back until catalogs are refreshed. After this lands in `main`, run
  `pnpm -F @duedatehq/app i18n:extract` + `i18n:compile` to pick up the new keys
  and drop the obsolete ones.
