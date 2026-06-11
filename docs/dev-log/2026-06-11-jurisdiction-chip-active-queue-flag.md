# 2026-06-11 — JurisdictionChip primitive + ACTIVE queue flag de-dotted

**Ask (Yuqi):** close the two "Left alone" items from the form-badge /
state-pill consistency sweep (same day, earlier session): (1) jurisdiction
2-letter code chips rendered differently per surface — make them ONE
primitive; (2) the green "ACTIVE" queue flag was a filled chip WITH a dot,
which §4.10's ornament rule bans.

## 1. JurisdictionChip (new primitive, `primitives/state-badge`)

**Canon picked:** `Badge variant="outline" shape="square"` + `font-mono` +
`min-w-9` + full-jurisdiction-name `title`. Rationale:

- §4.10 tone table already ruled it: jurisdiction code = **reference tag →
  outline**, never a tone fill (so the bg-subtle / bg-section variants were
  the drifted ones, not the bordered one).
- `shape="square"` is the Badge axis whose own doc comment names
  "jurisdiction kickers" as its use case (rounded-sm + uppercase +
  semibold + tracking-wide).
- mono because codes are code-family content — matches `TaxCodeBadge` and
  the mono code inside `JurisdictionLabel`.
- `min-w-9` inherited from the rules-console `JurisdictionCode` so CA/FED
  align in tabular columns; harmless inline.
- Tooltip (native `title`) = `getJurisdictionName(code)` — free affordance
  the old spans didn't have.

**Five drifted chromes converged** (one more than the audit listed —
AlertHistoryView had its own):

- `PulseAlertRow` + `AlertListRail` — bordered `rounded-lg` h-20 semibold
  span → stock chip.
- `PulseFormRevisedCard` — Pencil tCuD7 one-off (14/700 `bg-background-
  section`, tracking 0.8) → stock chip.
- `jurisdiction-rule-table` rule-name cell — `bg-background-subtle`
  caption-xs mono span → stock chip.
- `AlertHistoryView` JURIS column — `rounded-lg bg-background-subtle`
  uppercase span → stock chip.
- `rules-console-primitives` `JurisdictionCode` (bg-subtle filled mono,
  used by sources-tab, coverage-tab, rule-detail-drawer,
  temporary-rules-tab, /preview) — now a thin **alias** for
  JurisdictionChip; call sites untouched (the drawer + table files are
  parallel-session WIP, so no extra hunks there).

**Family map** (documented on the primitive): `JurisdictionChip` =
text-only code chip · `JurisdictionLabel` = detail-header seal + code +
name · `StateBadge` = bare circular seal. The seal+code row treatments in
`AlertCard` / `needs-attention-card` are the StateBadge family and stay.

## 2. ActiveQueueChip (`alerts/components/ActiveQueueChip.tsx`)

The green "Active" flag was hand-rolled in THREE places (`PulseAlertRow`,
`AlertListRail`, `AlertDetailDrawer` header) as a green-filled bordered
chip + dot — the filled+dot redundancy §4.10 bans. Now one shared
component: `Badge variant="outline"` + `BadgeStatusDot tone="success"`
(the sanctioned outline+dot combo, same recipe as AuthStatusPill /
HealthBadge / members rows). The dot keeps the "live, actionable queue"
identity; the chip chrome goes quiet. Label is sentence-case "Active"
(stock Badge — no uppercase/tracking overrides), stock size-2 dot.

## Docs

- DESIGN §4.11 — two new rows: JurisdictionChip (with the ban on
  hand-rolled 2-letter spans) and ActiveQueueChip.
- /preview — JurisdictionCode specimen row relabeled `JurisdictionChip`;
  new `ActiveQueueChip` specimen in the alerts section.
- Prior dev-log's "Left alone" jurisdiction line cross-referenced here.

## Verification

- `tsgo --noEmit` clean; `vp fmt` applied to PulseAlertRow (only file the
  formatter touched — the other 55 `vp check` formatting complaints
  pre-date this change / belong to the parallel session).
- Eyeballed in preview: /alerts rows + rail (outline mono chip, outline
  Active w/ green dot), alert detail drawer header, /alerts history table,
  /rules/library rule-name cells + sources tab (alias), /preview specimen.

**Commit boundary note:** `jurisdiction-rule-table.tsx` was already
parallel-WIP (review-scope column work); the one-chip hunk here should be
staged selectively or ride with that session's commit, same protocol as
the earlier sweep.
