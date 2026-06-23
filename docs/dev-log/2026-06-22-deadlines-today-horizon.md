# /deadlines "more deadline" pass — Today horizon + heat re-ramp

_2026-06-22_

Feedback #4 ("make the table more 'deadline'", + keep it distinct from /alerts).
Three directions were requested; two were already strongly implemented, so this
pass adds the genuinely-missing one and refines the heat.

## Time-horizon banding — new "Today" band (the net-new)

The urgency bands were `Overdue · This week · Upcoming`. Split **Today** out of
this_week: `urgencyBandOf` now returns `today` for `days === 0`, giving the
time-forward ladder **Overdue · Today · This week · Upcoming**. "Due today" is a
different decision than "due later this week," and a deadline product should say so.
Type-safe (the `UrgencyBand` union + `URGENCY_BAND_ORDER` + `urgencyBandLabels`
record all updated; tsgo enforced the rest). Verified live: the band renders with
the 7 due-today filings split into their own horizon.

## Urgency heat — re-ramp onto the act-now bands

The band lane-wash + tone-dot gave amber to `this_week`. Now **Today** owns the
amber act-now lane (wash + dot); `this_week` + `upcoming` stay neutral. Combined
with the existing left-stripe rail (deep red >7d late, amber overdue/imminent), the
heat now concentrates on the two horizons that need action _today_ — fewer colored
things, so they stand out more (von-Restorff).

## Countdown emphasis — already implemented (no change)

The INTERNAL DUE column already shows only the relative countdown as the loud line
(`41d late` / `in 3d` / `today`, urgency-tinted, 14px for overdue vs 12px baseline),
with the absolute date in a separate OFFICIAL DUE column. The canon forbids
red+bold, so size already carries it. Left as-is rather than gild.

## Distinct from /alerts

Deadlines groups by **time horizons** (overdue/today/week/upcoming) with countdown +
urgency heat; alerts groups by **needs-action status** with change-cards + apply
gates. No shared row grammar — the two read as different tools.

## Verification

tsgo 0 · build green · app tests 550/2 (updated the urgency-band derivation tests for
the new Today band). No new i18n strings ("Today" already in the catalog).
