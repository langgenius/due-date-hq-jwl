# Status pills → Badge, and the shared ListRail shell

Date: 2026-06-10

Two more unifications from the "anything else?" pass.

## Status / tag pills → the `Badge` primitive

~17 hand-rolled `<span class="rounded-full bg-state-X-hover px-… text-…">label</span>`
status/tag labels (Enabled, Verified, Active, Awaiting review, Ready, "N
blocked", lateLabel, jurisdiction kickers, count chips, …) bypassed `Badge`,
which already has soft `success / warning / info / destructive / secondary`
tones. Migrated them onto `<Badge variant=…>`, preserving leading icons/dots +
`tabular-nums`/`uppercase`/`font-mono` via className. Files: accept-invite,
settings.profile, rule-review-prompt, rules.library, notification-preferences,
sources-tab, obligations, entry-brand-lockup, ClientDetailWorkspace,
AlertsListPage.

**New Badge `success-solid` + `accent-solid` variants** — Badge's register is
deliberately soft (terminal states stay quiet), but a few high-signal milestone
chips ("Accepted" ×3, "Primary", an active wizard step, a solid count chip) read
solid on purpose. Added the two solid variants so those route through the
primitive *without* softening them (use sparingly — soft is the default), and
migrated the 6 sites (AnnualRolloverDialog, rule-detail-drawer,
use-obligation-queue-columns, obligations ×2, panels).

## Shared `ListRail` shell

`AlertListRail`, `ObligationListRail`, the rules `JurisdictionRail`, and the
deadline `DeadlineNavigatorRail` each hand-rolled the SAME 380px master-list
recipe (their comments literally said "canonical list-rail recipe — identical
to…"). Built `apps/app/src/components/patterns/list-rail.tsx` — a
minimal-prescription compositional shell: `ListRail` (the `<aside>` wrapper),
`ListRailHead` + `ListRailTitle`, `ListRailSection` (bordered filter rows),
`ListRailBody` (scroll body). It owns the duplicated chrome (width, border,
padding, dividers, scroll) but not the inner content (heads genuinely differ:
title vs back-link, count pill vs filter toggle, search vs search+status
dropdown). Migrated all 4 rails onto it; `DeadlineNavigatorRail` keeps its
responsive `w-[340px] lg:flex xl:w-[380px]` via the className override (tw-merge),
`JurisdictionRail` keeps its `<nav>` body landmark.

## Verify

tsgo 0 errors (aggregate); `vp check` clean on all touched files. Live `/rules`:
`JurisdictionRail` renders via `ListRail` (380px, hairline right border) with the
"Needs review" `ToggleChip` pill + compact search + the jurisdiction list intact.

(Left untouched: the user's concurrent client-header/summary WIP — ClientSummaryStrip,
stat-band, state-badge, dashboard, sidebar.)
