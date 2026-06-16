# Migrate hand-rolled Register-B labels onto FieldLabel — batch 1

_2026-06-17_

Begins the §section-header sweep the FieldLabel canon
([section-header-style.md](../Design/section-header-style.md) Register B) flagged
as "in progress": the ~200 hand-rolled tertiary/secondary-uppercase labels (4
sizes × 2 weights × 5 trackings of the same look) migrate onto the one primitive,
`FieldLabel` (`variant='group'` = B1 11px semibold · `variant='field'` = B2 12px
medium). Per Yuqi's basis: **normalize size/weight/tracking to the register,
preserve each label's existing color**.

## Batch 1 — 16 clean labels across 4 files
- `clients/ClientCompliancePosturePanel.tsx` (2) — field labels (`dt`, `span`).
- `rules/rule-detail-drawer.tsx` (6) — group labels; the reusable `<p>` label →
  `as="div"` (a label isn't a paragraph), one `text-text-muted` color preserved.
- `audit/audit-event-drawer.tsx` (2) — the `dt` field label + the "What changed"
  grid-header row (layout classes carried on `className`).
- `notifications/notification-preferences-page.tsx` (6) — the matrix column-head
  band + digest field labels, all `text-text-secondary` preserved, layout
  (`flex-1`, `w-[150px]`, `w-[60px] text-center`) carried through.

Live-checked on `/notifications/preferences`: labels render 11px / uppercase /
weight 600 / `text-text-secondary` (rgb 53 64 82) — color preserved, register
normalized. Typecheck 0; lint clean (the one `no-underscore-dangle` warning in
rule-detail-drawer is pre-existing, confirmed on HEAD).

## What this batch deliberately did NOT touch (needs a design call or is churned)
The grep surfaces ~169 `uppercase`+tracking sites; a large share are **not** clean
field-label targets:
- **Badges / pills** (`<Badge>`, `rounded-*`, `tracking-wider` chips) — a different
  primitive; left as-is.
- **`<TableHead>` cells** — already the table column-label primitive; converting is
  a separate Table-level call.
- **`<h3>` section headings used as labels** — converting to a `div` FieldLabel
  drops heading semantics (a11y); left pending a decision.
- **13px `text-caption` grid headers** (e.g. generation-preview-tab) — normalizing
  to 11/12px is a visible size change; pending a register decision.
- **Conditional-color / `cn`-fragment labels** (weight would shift semibold→medium).
- **The alert/deadline detail drawers** (`ObligationQueueDetailDrawer`, `panels`,
  `AlertDetailDrawer`, ~43 sites) — sequenced separately per the canon AND
  currently churned by the unpushed remote CI commit + the parallel session, so
  out of bounds for now.

Remaining clean span/dt/div targets across the other safe files continue in
follow-up batches.
