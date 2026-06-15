# Recovery — restore the alerts/DS stack dropped by a hard reset

_2026-06-15_

## What happened

Local `main` carried ~39 commits (both sessions') on top of an **older**
`origin/main`. Meanwhile `origin/main` advanced independently (penalty-UI
removal, Amplitude, migration fixtures, rules dashboard, deadlines sort,
clients rework). A `git reset --hard origin/main` adopted the 16 remote
commits and **discarded the ~39 local ones** — taking most of this
session's alerts + design-system work with it.

## Recovery method

The dropped tip was preserved on `recovery/pre-reset-86e8a8e4` (also in the
reflog). Rather than replay 39 commits (catalog + cross-surface conflicts at
every step), recovery was done file-level, which is deterministic:

- `git cherry` showed **5 commits already patch-equivalent on origin**
  (the parallel session's rules-dashboard work) — skipped.
- **35 files were mine-only** (origin never touched them since the merge
  base) — restored wholesale: the entire `features/alerts/*` tree,
  `lib/urgency`, `AlertDetailDrawer`, `AlertsListPage`, `PulseAlertRow`,
  `AlertListRail`, `AlertSourceLink`, `AlertStructuredFields`,
  `AffectedClientsTable`, `needs-attention-panel`, `segmented`,
  `preset.css`, the today `add-menu`, and all the dev-logs/eng-briefs.
- **`detail-section-card.tsx`** overlapped, but my version is a clean
  superset (origin's formatting collapse + my MASYz `index`/`caption`
  props the drawer depends on) — took mine.
- **`filter-trigger.tsx` and `cn()` font-size tokens** were identical /
  superset on origin — kept origin.
- **Parallel-domain overlaps** (clients, rules, dashboard, obligations,
  migration, onboarding) were left at origin's newer versions — my older
  cross-surface token edits there are superseded; not reverting their work.
- **i18n catalogs** were regenerated (`extract` + `msgmerge` from the
  recovery branch to refill zh-CN, 2 brand-new strings translated) so the
  strict compile passes with 0 missing.

## Verified

`tsgo` clean · urgency tests 22/22 · `lingui compile --strict` 0 missing ·
`vp check` clean · live preview at 1512×861: list left-edge fix + inline
day-band counts; detail drawer shows the MASYz structure (numbered Change,
"Scroll to read all N sections", Source/Activity, affected-clients table).

The full original commit history remains on `recovery/pre-reset-86e8a8e4`
for reference.
