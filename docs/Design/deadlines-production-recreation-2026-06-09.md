# Deadlines — production recreation spec (2026-06-09)

Canonical layout for the `/deadlines` list, its toolbar View/Actions menu,
and the deadline detail panel, recreated from the production Pencil mocks in
`duedatehq_work.pen`:

- §`MF9jE` — list page
- §`XKiKR` — toolbar View/Actions (kebab) menu
- §`rzzww` — deadline detail panel

This is the source-of-truth for the surfaces below; it amends, but does not
replace, `deadline-status-meaning-and-journey-2026-05-23.md` and the
obligation-panel briefs.

## List page (`MF9jE`)

1. **Sync status bar** above the H1 (PageHeader eyebrow): green dot + sync
   glyph + `Synced just now · {N} deadlines tracked`. The mock's
   "≈3 hours focus today" is dropped — we don't track focus time.
2. **Narrative banner** (replaces the 3 at-a-glance tiles): eyebrow
   `{WEEKDAY MON D} · CLOSING THE WEEK`, one editorial headline derived from
   overdue/due-today counts, and a metric line `{N} active filings · across
{M} entities · {$X} penalty exposure on the line`.
3. **Toolbar — one line**: `Search client, form, or assignee` · `All Status
{N}` dropdown · `Quick filters` …… `⋯` kebab. Status filtering is a
   dropdown (not tabs); columns live inside the kebab.
4. **Table columns** (left→right): `FORM · CLIENT · TAX · STATE · INTERNAL
DUE · OFFICIAL DUE · ASSIGNEE · EXPOSURE · STATUS`.
   - FORM — form-code chip (`Form 1040`).
   - CLIENT — name + subtitle `{entity type} · {state name}` (e.g.
     "Sole Prop · California"); falls back to entity-only when the client
     has no state.
   - TAX — broad category derived from the form: `Income tax` / `Payroll`
     (94x + deposits) / `Information` (BOI / 990 / 1099).
   - STATE — filing authority token (`IRS` / `FinCEN`) + state-code badge.
   - INTERNAL DUE — flame glyph + `{N} days late` for overdue rows.
   - OFFICIAL DUE — prose date with year (`May 12, 2026`).
5. **Grouping** defaults to **urgency bands**. Band header: tone dot +
   `OVERDUE` (uppercase) + `{N} DEADLINES` + optional `{n} late` badge, with
   right-aligned meta `≈{avg}d avg · {N} of {total} deadlines`.
6. **Footer hint**: "Click any row to open the triage drawer · ↵ to jump to
   the full page · Esc to close."
7. **Add deadline** is a split button: primary opens the single-create
   dialog; caret menu = `Add one deadline` (N) / `Add several deadlines`
   (Bulk → migration wizard) + note "Pulse-generated drafts live in
   Projected." (Outline styling — not the mock's black fill, per Yuqi.)

## Toolbar View/Actions menu (`XKiKR`)

- **VIEW** — `Columns` (`{n} of {m}`, submenu = visibility checklist),
  `Group by` (submenu, current value shown), `Density` (submenu,
  `Default`/`Compact`).
- **ACTIONS** — `Export visible rows` (CSV), `Save current view`,
  `Reset filters` (destructive; disabled when nothing is filtered).

## Detail panel (`rzzww`)

Two-column Status tab:

- **Main**: deadline strip (Filing deadline / Internal target / Payment
  due) → tabs → milestone timeline → What's left → Expected refund →
  authority/stage cards → **Recent activity** (last 3 audit events: actor +
  humanized action + relative time, `View all in Timeline →`).
- **Right rail** (`lg:w-[256px]`): **Ownership** (assignee avatar + name +
  `Change`) and **Linked from** (client profile, `TY {year-1}` prior
  return).

### Deferred (not in the polish pass)

- Penalty-exposure §6651 derivation table (data-modeling feature).
- Tab rename to `Status · Materials · Record · Audit` — the 4-tab set is
  locked; revisit deliberately, not in a polish pass.

## Adapted from the mock (intentional divergences)

- Sidebar, colorful avatars, and the black Add-deadline button are **not**
  copied — the app's existing sidebar/avatar/button styling stays.
- Where demo data lacks a client state, CLIENT subtitle + STATE degrade to
  the data we have (entity-only / authority-only).
