# Alerts list — clean up the date header (Pencil aUZTy)

_2026-06-15_

Yuqi pointed at Pencil **aUZTy** to clean up the day-group sections, "especially
the date header." The live header had drifted busy:
`Wednesday May 20 · 1 alert` (weekday word + mixed-case date + middot + count,
plus a sun icon on today).

## What

Matched aUZTy: the day band is now a single quiet **uppercase date eyebrow** —
`MAY 20, 2026` — `text-xs / 600 / tracking-eyebrow / text-tertiary`, CSS-uppercased,
on a faint `bg-background-subtle` band. Dropped the weekday word, the
"· N alerts" count, the sun icon, and the Today/Yesterday substitution. The date
itself is the section marker; nothing competes with the rows beneath it.

`formatDayHeader` collapsed to return just `{ label }` (`MMM D, YYYY`); removed
the now-unused `SunIcon` import, `todayKey`, and the weekday/yesterday plumbing.
The sticky-below-toolbar behavior (`top-12`) and the select-all checkbox slot
are unchanged.

## Verified

Live at 1512×: headers render "MAY 20, 2026 / MAY 16, 2026 / MAY 15, 2026 …" on
the faint band, no weekday/count/icon. tsgo + vp check clean; lingui compile
--strict 0 missing (5 unrelated pre-existing zh-CN drift strings translated to
unblock the strict build).
