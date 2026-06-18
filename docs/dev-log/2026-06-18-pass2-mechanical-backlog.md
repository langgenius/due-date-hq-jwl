# Pass-2 mechanical P2/P3 backlog

_2026-06-18_

Cleared the no-design-call P2/P3 backlog from the
[pass-2 audit](../Design/full-app-audit-2026-06-18-pass2.md). All mechanical.

## Feedback — silent copy actions → toast

`rules.library` (both RowActionsMenus: Copy rule ID + Copy link) and
`ClientFactsWorkspace` Copy link now `toast.success` on copy / `toast.error` on
catch, matching the four canonical copy helpers.

## Navigation

- `notification-preferences-page` breadcrumb parent: dead-end `/settings` → `/notifications` (real parent).
- `workload-page` PageHeader: added the missing `Settings › Team workload` breadcrumb.
- `app-shell-nav`: Settings sidebar row now lights for its 5 out-of-`/settings`
  sub-pages (`/practice`, `/members`, `/workload`, `/billing`, `/reminders`) via an
  `activeMatch` predicate sourced from the same set the breadcrumbs use.
- `breadcrumb` nav landmark `aria-label` localized (`t\`Breadcrumb\``).
- `ObligationQueueDetailDrawer` panel crumb separator `›` → `/` (matches `DeadlineCrumbBar`).

## Loading / perceived-quality (skeleton fidelity)

- `AlertHistoryView` text loader → 6 shape-matched skeleton rows (+ sr-only label).
- `stat-band` loading skeleton: solid block → band-chrome skeleton (border-y + per-column
  label/value bars) so the frame doesn't pop on paint — fans to 8 StatBand consumers.
- `workload-page` first-load skeleton wrapped in the loaded shell (no paint shift).
- `calendar-page` single block → `cards.length` card-shaped skeletons in the same grid.

## Misc

- `search-input` clear-button label `Clear search` → verb-neutral `Clear` (the inputs
  now say "Filter …").
- `reminders-page` "Recent delivery" empty state: added icon + description.
- `CreateClientDialog` + `CreateObligationDialog` FieldGroup `gap-4` → `gap-5` so
  between-row spacing exceeds the within-row column gap (proximity grouping).

## Verification

- `tsgo --noEmit` 0; `vp check` clean; 544 app tests pass; 6 new strings translated to
  zh-CN (已复制规则 ID / 无法复制 / 无法复制链接 / 面包屑导航 / 提醒邮件发送后会显示在这里。; "Link copied" already
  in catalog); `compile --strict` passes.

## Still open — design calls (in the pass-2 doc)

review-color token (navy vs violet), severity-chip primitive, form-control height/radius
cohesion, auth H1 size canon, /clients+/members table overflow, page-rhythm canon,
/today distill, FieldLabel name collision, upgrade-cta + splash dark theming.
