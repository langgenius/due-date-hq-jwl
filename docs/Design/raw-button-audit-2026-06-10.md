# Raw `<button>` audit (2026-06-10)

Exhaustive pass over every raw `<button>` JSX element in `apps/app/src` (4
parallel sweeps by area; tests + `.claude/worktrees` excluded). **~162 raw
buttons** total.

| Category | Count | Meaning |
| --- | --- | --- |
| **CONVERT** | ~70 | Should be `<Button>` or `<TextLink>` — replicates a canonical variant by hand |
| **CUSTOM-OK** | ~63 | Legitimately custom — keep raw |
| **ALREADY-CANONICAL** | ~29 | Already a primitive (`FilterTrigger`, `RowActionsMenu`, `DropdownMenuTrigger render`, `Button`, `TextLink`, stat-tile/band, SidebarMenuButton…) |

## CONVERT — broken into migration clusters

### Cluster A — icon-only ghost buttons (~35) → `<Button variant="ghost" size="icon-xs|icon-sm">`
The biggest, cleanest, most mechanical group: square icon buttons with
`hover:bg-state-base-hover hover:text-text-primary` + focus ring (= Button ghost
icon). Close / dismiss / peek / help / retry / copy / cycle-arrow:

- `routes/obligations.tsx`: 2427 (peek), 3691 (dismiss banner), 7149 (copy link), 7169 / 7179 (close), 13353 (remove chip ✕)
- `routes/dashboard.tsx`: 261 (sync refresh)
- `routes/rules.library.tsx`: 4478 (close), 4543 (eye)
- `features/rules/coverage-tab.tsx`: 2505 (close); `sources-tab.tsx`: 659 (retry); `rule-detail-drawer.tsx`: 1384 / 1537 (close)
- `features/alerts/AlertDetailDrawer.tsx`: 1147 (close); `MorningSweepDialog.tsx`: 280 (close); `AlertsListPage.tsx`: 772 (clear sweep ✕)
- `features/dashboard/daily-brief-card.tsx`: 129 (dismiss), 470 (regenerate)
- `features/migration/Step2Mapping.tsx`: 801 (help)
- `features/obligations/`: `ObligationQueueDetailDrawer.tsx` 1692 (close), `DeadlineCrumbBar.tsx` 48 (close), `use-obligation-queue-columns.tsx` 275 (peek), `blocked-by-chip.tsx` 47 (link icon)
- `features/clients/`: `ClientCycleArrows.tsx` 178 (prev/next), `ClientFactsWorkspace.tsx` 597 (peek), `ClientFactPanels.tsx` 44 (help)
- `components/patterns/info-banner.tsx`: 131 (dismiss); `table-header-filter.tsx`: 157 (clear search ✕)
- `features/reminders/reminder-template-editor-page.tsx`: 374 (disabled toolbar placeholder)

> Caveat: a few use `hover:bg-background-section` instead of `state-base-hover`
> (daily-brief-card, dashboard 261) — converting shifts the hover token slightly.
> Verify those visually.

### Cluster B — inline text links (~20) → `<TextLink>` (NOT Button)
These are text links; per DESIGN §4.8 they belong on `TextLink`, not a Button
`link` variant. Tones: accent / quiet / **success** / **destructive**.

- `routes/obligations.tsx`: 7194, 11907, 12980, 13124; `rules.library.tsx`: 835, 957*, 961*, 3041, 4253 (*already use a `linkClass`)
- `routes/login.tsx`: 318; `two-factor.tsx`: 138; `accept-invite.tsx`: 298; `splash.tsx`: 192, 199
- `features/alerts/`: `AlertHistoryView.tsx` 254 (accent), `AlertDetailDrawer.tsx` 556 (**success** "Undo"), `components/AlertTeamNotes.tsx` 86, `components/DecisionActions.tsx` 71
- `features/migration/SuccessModal.tsx`: 207; `features/rules/rule-detail-drawer.tsx`: 264, 720 (accent show-more)

> Needs a **`success`** TextLink variant for AlertDetailDrawer:556 (green Undo).

### Cluster C — filled / CTA / auth buttons (~8) → `<Button variant=…>`
- `routes/login.tsx`: 232, 254 (Google/Microsoft → `secondary`)
- `features/onboarding/rule-review-prompt.tsx`: 136 (Skip → `link`/`ghost`), 145 (Back → `secondary`), 153 (Review → `primary`)
- `features/clients/ClientsEmptyState.tsx`: 151 (sample-data → `accent` — but it's a `rounded-full` pill, the documented animated-exception family; confirm)
- `features/alerts/AlertDetailDrawer.tsx`: 1410 (`primary` xs), 1419 (`secondary` xs)
- `routes/dashboard.tsx`: 309 (import → `secondary` sm, but it's the rounded-full expand-pill exception)

### Cluster D — chips / pills that are really toggles or filters (~7) — DECIDE per item
Borderline: some are filter chips (FilterTrigger-family), some are toggle
internals. NOT plain Buttons. Review individually:
- `routes/obligations.tsx`: 12949 (preset → tertiary?), 13194 (filter chip)
- `routes/rules.library.tsx`: 2627 (entity filter chip)
- `features/migration/Step1Intake.tsx`: 1061 (PresetChip toggle)
- `keyboard-shell/CommandPalette.tsx`: 419 (filter pill)
- `features/onboarding/state-rule-activation-selector.tsx`: 127 (select-all → secondary)

## CUSTOM-OK — keep raw (representative, ~63 total)
Whole-row / whole-card click targets (rule rows, alert rows, brief rows,
needs-attention cards, nav rows, stat-tile/band), `DropdownMenuTrigger render={<button/>}`
+ `PopoverTrigger`/`CollapsibleTrigger` wrappers, Segmented/tab/aria-pressed
toggle internals (billing interval, status-scope pills, deadline tabs), radio
options (role="radio" cards), map/tilegram tiles (PulseAlertsMap, StateTilegram),
the dashed assignee "?" picker, checkbox/matrix cells, the file-upload drop zone,
the quick-find sidebar bar, date-picker field trigger, citation chips.

## ALREADY-CANONICAL — the primitives themselves (~29)
`filter-trigger.tsx`, `row-actions-menu.tsx`, `table-header-filter.tsx`,
`stat-tile.tsx`, `stat-band.tsx`, `kbd.tsx` (uses Button), `search-input.tsx`
clear-X, `app-shell-*` (SidebarMenuButton / DropdownMenuTrigger), combobox /
iso-date-picker (PopoverTrigger). These ARE the wrappers — do not "convert."

## Migration plan / sequencing
1. **Cluster A** (icon ghosts) — highest volume, lowest risk, do in batches by file.
2. **Cluster B** — needs a `success` TextLink variant first, then migrate.
3. **Cluster C/D** — per-item design calls (some are the documented pill
   exceptions; some are toggles).

Conflict note: several Cluster-A files (obligations.tsx, dashboard.tsx,
deadline-detail, merged-brief-card) are under active concurrent edits — migrate
those when they settle to avoid clobbering in-flight work.

## Migration status (2026-06-10)

Direction chosen by Yuqi: **snap icon buttons to the Button scale** (accept
±1-2px) + **migrate Cluster B onto TextLink** (added a `success` TextLink
variant for the green "Undo").

**Done (~29 sites, tsgo + vp check clean):**

- Cluster A icon→`<Button variant="ghost" size="icon-xs|sm">`: rule-detail-drawer
  (×2), coverage-tab, sources-tab, AlertDetailDrawer, MorningSweepDialog,
  AlertsListPage (clear-sweep), ClientCycleArrows (×2), ClientFactsWorkspace,
  ClientFactPanels, ObligationQueueDetailDrawer, DeadlineCrumbBar,
  use-obligation-queue-columns, Step2Mapping (help), info-banner,
  table-header-filter (clear-search), reminder-template-editor (placeholder).
- Cluster B text→`<TextLink>`: rule-detail-drawer (×2), rules.library (×3),
  AlertHistoryView, AlertDetailDrawer ("Undo" → `success`), AlertTeamNotes.
- Cluster C CTAs→`<Button>`: login (Google/Microsoft → secondary; "Open it now"
  → accent link; "Change" → ghost xs), two-factor, accept-invite, splash (×2),
  rule-review-prompt (Skip/Back/Review), SuccessModal, DecisionActions (→ ghost,
  hover wasn't an underline).

**Skipped (correct):** `blocked-by-chip` (bordered icon chip, not ghost).

**Hot files — now done** (second pass, tsgo clean): `obligations.tsx` — 6 icon
buttons → ghost + 2 footer text links ("Reset"/"Clear") → ghost xs; the 2
composite multi-child links (client kicker, "outstanding · check materials" row)
**left raw** — a sized Button breaks their group-hover/arrow layout (CUSTOM-OK).
`dashboard.tsx` — sync/refresh → ghost icon-sm. `daily-brief-card.tsx` — dismiss
+ both regenerate buttons (icon + labeled) → ghost. `merged-brief-card.tsx` — no
CONVERT buttons (its two are CUSTOM-OK: a segmented tab + a whole-row target).

**Left by design:** Cluster D chips (toggle/filter chips — per-item calls),
all CUSTOM-OK, all ALREADY-CANONICAL.
