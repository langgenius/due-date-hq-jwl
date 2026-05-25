# 2026-05-25 — Alerts archive sub-page + sidebar entry

## Why

Genuinely-deferred ledger item **Alerts #2** — Yuqi asked to
promote the "View history" filter on `/rules/pulse` to either a
dedicated sub-page OR a sidebar entry. Greenlit "all yes" in
today's prioritization. Shipping both: a dedicated route at
`/rules/pulse/history` AND a sidebar entry under the footer
area next to Audit log.

## What changed

### New route: `/rules/pulse/history`

- File: `apps/app/src/routes/rules.pulse-history.tsx`
- Re-uses `PulseChangesTab` from
  `features/pulse/AlertsListPage.tsx`, mounted with the new
  `historyMode={true}` prop.
- Page title: "Alerts archive" (vs "Alerts" on the live page)
- `RulesPageShell` renders the same chrome as `/rules/pulse`

### `PulseChangesTab.historyMode` prop

- New optional `historyMode?: boolean` prop on
  `PulseChangesTab`. When true:
  - Initial status filter locks to `applied` (most common
    terminal state) instead of `all`
  - The "View history" cross-link in the page header is hidden
    (we're already on it)
- All other filters (impact / change kind / source /
  jurisdiction) continue to work; status filter can be switched
  to `dismissed` / `reverted` / `snoozed` via the dropdown
  for fine-grained archive browsing

### "View history" button → real link

Was: `<button onClick={() => setStatusFilter('applied')}>` — a
soft filter mutation on the current page.

Now: `<Link to="/rules/pulse/history">` — a real navigation.
Deep-linkable, bookmarkable, search-findable.

### Sidebar entry

Added to the `footer` group in `app-shell-nav.tsx`, right above
Audit log:

```tsx
{ href: '/rules/pulse/history', label: t`Alerts archive`,
  icon: HistoryIcon, end: false }
```

Footer placement is deliberate — both Audit log and Alerts
archive are retrospective surfaces (review what already
happened), not daily-driver destinations. Same IA tier.
HistoryIcon distinguishes from the live MegaphoneIcon-led
Alerts entry above.

### Routing wire-up

- New entry in `routes/route-summary.ts`:
  ```
  rulesPulseHistory: { eyebrow: msg`Operations`, title: msg`Alerts archive` }
  ```
- New lazy route in `router.tsx` at `rules/pulse/history` →
  `RulesPulseHistoryRoute`

## Files touched

- `apps/app/src/routes/rules.pulse-history.tsx` (new, 32 lines)
- `apps/app/src/features/pulse/AlertsListPage.tsx`
  (`historyMode` prop + `<Link>` swap)
- `apps/app/src/components/patterns/app-shell-nav.tsx`
  (HistoryIcon import + footer entry)
- `apps/app/src/routes/route-summary.ts`
  (rulesPulseHistory entry)
- `apps/app/src/router.tsx` (new lazy route)

## Verification

- `vp check` → 1455 files formatted, 0 lint/type errors across
  668 files
- `/rules/pulse/history` renders the same alerts list with
  status pre-filtered to terminal states
- Sidebar shows "Alerts archive" in the footer with the History
  icon
- Clicking "View history" on `/rules/pulse` navigates to the
  new route
