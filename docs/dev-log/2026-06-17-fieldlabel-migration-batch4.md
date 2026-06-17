# FieldLabel migration — batch 4 (completeness fix)

_2026-06-17_

Closes a gap in [batch 3](2026-06-17-fieldlabel-migration-batch3.md). Batch 3
declared the sweep "complete" — it wasn't. The app-wide completeness audit there
used a **tracking-specific** grep
(`tracking-eyebrow|tracking-wide|tracking-wider|tracking-[0.Npx]`), which silently
missed two whole classes of genuine Register-B label, and a classifier subagent
mis-bucketed a few more. This batch finds and migrates them, and records the
correct audit method.

## Why batch 3 missed them

- **No tracking class.** Several labels are just `uppercase` + small size + muted
  color with **no** `tracking-*` (e.g. `ManagerInsightMetric`, billing metrics,
  `ShortcutHelpDialog` group headers, `ClientTitleSwitcher` "Current"). The
  tracking grep never saw them.
- **Arbitrary tracking values.** `tracking-[0.4px]`, `tracking-[0.08em]` etc. were
  outside the grep's value list (`deadlines-at-a-glance`).
- **Subagent mis-bucketing.** `AlertStructuredFields`, `actions-list`,
  `PulseFormRevisedCard`, `deadlines-at-a-glance` were in the candidate set but got
  filed as "value" / "badge" instead of "label".

**Correct audit (now the canon):** grep by **color + size**, not tracking —
`uppercase` AND (`text-text-tertiary|secondary|muted`) AND a small size
(`text-caption-xs|text-caption|text-xs|text-micro|text-[1N px]`), minus
chips/controls/values. That set is comprehensive.

## Migrated (10 sites / 9 files)

| File                                           | Element →                | Variant |
| ---------------------------------------------- | ------------------------ | ------- |
| `obligations/deadlines-at-a-glance`            | span                     | field   |
| `obligations/detail/DeadlineNavigatorRail`     | div (sticky client band) | group   |
| `dashboard/actions-list`                       | h2 → div                 | group   |
| `alerts/components/PulseFormRevisedCard`       | span (`shrink-0`)        | field   |
| `alerts/components/AlertStructuredFields`      | span                     | group   |
| `clients/ClientTitleSwitcher`                  | span (`shrink-0`)        | group   |
| `workload/workload-page`                       | p → div                  | field   |
| `patterns/keyboard-shell/ShortcutHelpDialog`   | h3 → div                 | group   |
| `routes/billing` (×2: "Plan options" + metric) | span                     | field   |

Color preserved where non-tertiary; `shrink-0` / `sticky …` layout carried via
`className`; `<h2>`/`<h3>`/`<p>` demoted to `as="div"` per the heading-label rule.

## Left as-is (confirmed skips after the broad audit)

- **Container-typography** — `Breadcrumb` (nav landmark), `PageHeader` eyebrow,
  `ClientWorkPlanPanel` grid column-header _row_, the `iso-date-picker` weekday
  grid: caps classes style arbitrary children, not one label.
- **`DueDateHQ` wordmark** "HQ" (`auth-chrome`) — brand, not a label.
- **"Step N of M"** onboarding/migration progress eyebrows (`tracking-[1.4px]`) —
  Yuqi's call to keep the deliberate wide tracking; recorded as an explicit
  exception in `section-header-style.md`.
- jurisdiction **chip pill** (`rules.library`), `/preview` specimens,
  `tabular-nums` counts, `text-column-label`-token labels.

The broad audit now returns **only** these skip categories — no genuine
hand-rolled Register-B label remains.

## Also fixed

Batch 3's markdown (`section-header-style.md` Sweep block + the batch-3 dev-log)
was committed without a format pass (`vp check` ran before those edits), so it
carried an oxfmt formatting drift. Reformatted here so `vp check` is clean on
tracked files.

## Verification (§6 gauntlet)

- `tsgo --noEmit` → 0 errors.
- `vp fmt` (per file) + `vp check` → clean on tracked files (only the parallel
  session's untracked `docs/sharing/*.md` remain flagged — CI ignores those).
- `vp test run` → 77 files, 544 passed / 2 skipped.
- `vp run @duedatehq/app#build` → exit 0.
- i18n: extract + compile --strict → no catalog diff, idempotent.
