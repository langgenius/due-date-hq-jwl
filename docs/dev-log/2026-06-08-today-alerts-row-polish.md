# /today + /alerts — row polish batch

Date: 2026-06-08

## /today

- **Actions status-group band smaller + thinner** (actions-list.tsx): `text-[12px]
py-2` → `text-[11px] py-1.5`.
- **NeedsAttentionCard date regular weight** (needs-attention-card.tsx): the
  relative-time ("May 18") `font-medium` → `font-normal`.

## /alerts (PulseAlertRow)

- **Day-group header matches Today's date header**: added `bg-background-subtle`
  - `text-text-secondary font-semibold` uppercase label, `py-1.5` — same band as
    the /today Actions status-group header (was transparent / lighter text).
- **High-impact badge no longer amber** (was the same colour as the ACTION pill):
  → soft destructive red (`bg-[#fef3f2] border-[#fecdca] text-text-destructive`).
  Amber stays reserved for the suggested-action pill, so the two signals differ.
- **Affects-clients darker when clients exist** (same logic as Today's card):
  `impacted > 0 ? text-text-secondary : text-text-muted`.

## Verify

tsgo clean; `/today` + `/alerts` at 1512×861 — day band gray matches Today,
HIGH IMPACT red vs amber ACTION, "Affects 2 clients" darker than "No matching
clients."
