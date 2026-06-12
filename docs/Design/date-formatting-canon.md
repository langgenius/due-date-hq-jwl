# Date & time formatting canon

**Date:** 2026-06-11 (Yuqi: "/alerts 抽屉里 'May 16' 和 '2026-05-16' 两种日期
格式同屏 — 需要一个全局日期格式字典"). Full inventory in the session dev-log;
helpers live in `apps/app/src/lib/utils.ts`.

One semantic datum = one format tier. Pick by ROLE, never ad-hoc:

| Tier                 | Shape                                                 | Helper                                                            | Use for                                                                                                                     |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **dateShort**        | `May 16` (year auto-appends outside the current year) | `formatDatePretty(v)`                                             | inline dates in lists/rails, dense table columns, day groupings                                                             |
| **dateFull**         | `May 16, 2026`                                        | `formatDatePretty(v, { alwaysShowYear: true })`                   | deadlines, key milestones, detail heroes, fact grids — anywhere ambiguity costs money                                       |
| **dateISO**          | `2026-05-16`                                          | `formatDate(v)`                                                   | MACHINE contexts only: sort keys, `data-*` attrs, CSV export, audit metadata. **Never as the primary human-facing render.** |
| **dateTimeAbsolute** | `2026-05-16 14:32:00 PDT`                             | `formatDateTimeWithTimezone(v, tz)`                               | audit-log rows, security/session events, tooltips behind relative times                                                     |
| **relative**         | `2h ago` → `May 16` past 7d                           | `formatRelativeTime(v)` (+ absolute tooltip via `<RelativeTime>`) | recency scanning: published-at, last-active, generated-at                                                                   |

Rules:

- **Same datum, same screen, same tier.** The bug class this kills: the alert
  drawer showed published-at as `2026-05-16` (facts grid + activity event) and
  `May 16, 2026` (source card) simultaneously.
- Ad-hoc `Intl.DateTimeFormat` in components is a violation — delegate to the
  helpers (PulseAlertRow's `formatMonthDay` and AlertDetailDrawer's
  `formatDeadlineDate` are now thin delegates and the pattern to follow).
- `formatRelativeTime` is en-US hard-coded — known gap; add a locale param
  when multi-language ships (lingui's `intlLocale()` already feeds
  `formatDatePretty`).

Fixed in the 2026-06-11 sweep: alert drawer Received event + facts-grid
Effective field → dateFull; /deadlines queue due columns ISO → dateShort;
the two ad-hoc formatters → delegates.
