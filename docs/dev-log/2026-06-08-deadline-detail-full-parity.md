# /deadlines detail — full visual parity with /alerts detail

Date: 2026-06-08

Yuqi wanted the deadline detail to match the alerts detail across four axes
(picked all four). Builds on the earlier header pass.

## Changes
- **Top status banner** (ObligationQueueDetailDrawer.tsx): added a thin h-7 band
  at the top of the panel, mirroring AlertDetailDrawer's status banner. Colored
  by state — overdue red `bg-[#fee4e2]`, filed/completed green
  `bg-components-badge-bg-green-soft`, else amber `bg-[#fffbeb]` — with the status
  label left and a quiet timing note (due date / "due in N days") right. Removed
  the redundant inline status-dot+label from the header row.
- **Metric cards chrome** (queue/components/panels.tsx `DeadlineTile`): the
  FILING / INTERNAL / PAYMENT cards now use the alerts fact-card chrome
  (`rounded-lg border border-divider-subtle`, uppercase eyebrow label, restrained
  inline red overdue note instead of a filled pill).
- **Spacing & surface**: header `pt-8 pb-2` → `pt-10 pb-6`; body `gap-4 pb-12` →
  `gap-6 pb-24` — the alerts detail rhythm. px-12 throughout, white surface.
- **Action placement**: moved Assign / Snooze / Mark-as-filed out of the header
  into the existing sticky footer's right side (primary = Mark as filed), with
  Last updated / Copy link as quiet left-side secondaries — mirrors the alerts
  Apply/Dismiss/Confirm footer.

## Bug fixed during verification
The banner first used the `plural()` + `i18n._()` macro pair, but `i18n` isn't in
that component's scope (`useLingui` from react/macro returns only `{ t }`). tsgo
can't see this (build-time macro expansion) but it threw `ReferenceError: i18n is
not defined` at runtime for the timing note. Rewrote with the `<Plural>`/`<Trans>`
components (no `i18n` needed); dropped the now-unused `plural` import + `i18n`
destructure.

## Verify
tsgo clean; `/deadlines` detail at 1512×861 — red overdue banner, 22px title,
FED Federal seal chip, subtle-bordered metric cards, footer with Assign/Snooze/
Mark-as-filed; renders without the i18n ReferenceError.
