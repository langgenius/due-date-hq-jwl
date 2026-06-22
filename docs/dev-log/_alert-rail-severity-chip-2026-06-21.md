# Alert list rail — leading SeverityChip (baseline proximity tier)

2026-06-21 · img-113-rail-severity

`AlertListRail`'s `RailItem` badge row now leads with a `<SeverityChip>`, the
same primitive + `LEVEL_PILL` treatment the main `PulseAlertRow` carries
(urgent → critical red, high → orange). This closes a parity gap: the lean
detail-layout rail previously showed jurisdiction · form · change-kind ·
confidence but never the urgency tier, so an imminent/overdue alert read
identically to a far-out one while stepping through the detail.

## What it derives

The rail only ever knows the **baseline (Layer 1) deadline-proximity tier** —
it never receives the smart-priority queue data the main list threads via
`priorityById`. So the chip is derived the same ungated way `PulseAlertRow`
derives its fallback:

```
proximityToTier(
  deadlineProximity(alert.actionDeadline, Date.now(), thresholdsForKind(alert.changeKind)).proximity
)
```

(`../lib/urgency`). Both inputs (`actionDeadline`, `changeKind`) already ride
on `PulseAlertPublic` — no new query, no fiction.

## Calm rail

The chip renders **only for urgent/high**; `normal` resolves to `null` so the
rail isn't stamped with a pill on every far-out / no-deadline item — silence
stays the time signal, the same call the main row's baseline tier makes. The
chip lives inside the existing badge row, so it dims with the rest of the
metadata on unselected items and restores on hover/active.

No new user-facing strings (the `URGENT`/`HIGH` labels are the existing
`LEVEL_PILL` literals, untranslated on the main row too). tsgo clean.
