# Client detail page — IA + style refactor

Brings `/clients/[id]` into line with the rest of the app's IA and
style language. The page scored 17/40 in the audit pass — lowest of
the four surfaces. Conformance rate against canonical patterns was
27%. Both critiques (IA + style) agreed on the same fixes.

## Phase 1 — Information architecture

- **Hero swap.** The custom card-framed hero
  ([apps/app/src/features/clients/ClientFactsWorkspace.tsx:1030](../../apps/app/src/features/clients/ClientFactsWorkspace.tsx))
  is now the canonical `<PageHeader>` with `breadcrumbs`, `title`,
  `description`, and a right-aligned action cluster ("View all
  obligations" and an audit-gated "View audit log"). The route file
  no longer owns its own `<Breadcrumb>` — PageHeader carries it via
  the `breadcrumbs` prop.

- **Identity strip.** The badges that used to sit at the top of the
  custom hero (`ClientSourceBadge`, `ClientReadinessBadge`,
  `ClientRadarBadge`) now form a small horizontal flex row between
  the PageHeader and the `ClientAlertsBand`. Entity type and filing
  state chips moved here too so the client's shape reads in one
  scan.

- **ClientSummaryStrip.** New 3-tile horizontal strip between the
  AlertsBand and the Tabs — Next due / At risk / Team — modeled on
  `apps/app/src/features/dashboard/exposure-strip.tsx`. Click
  targets: Next due opens the obligation drawer; At risk and Team
  deep-link into the Obligations queue filtered by client.
  - Note: `listByClient` returns `ObligationInstancePublic` which
    does not carry `assigneeName` (that lives on the queue row
    extension). The "Team" tile and the planned primary-owner badge
    are derived from `reviewerUserId` instead, with "Unassigned"
    when none. The user spec asked for owner names; we degrade
    gracefully to the count-of-distinct-reviewers signal until the
    `listByClient` shape is extended.

- **Mailbox tab removed.** Was tagged "Phase 2" and surfacing it as
  a peer top-level tab implied parity it doesn't have. The page now
  reads cleanly as Work / Notes. The `ClientMailboxPanel` and
  `mailboxAddressForClient` helpers were deleted from this file —
  retrieve them from git history when the inbound-email
  infrastructure ships.

## Phase 2 — Style alignment

- **DetailSection** chrome rebuilt to use `SectionFrame` +
  `SectionLabel` from
  `apps/app/src/features/rules/rules-console-primitives.tsx`. All
  call sites continue to work because the wrapper signature didn't
  change.

- **Custom empty states** (`PanelEmptyState`, `ClientEmptyState`)
  deleted in favor of the canonical `<EmptyState>` from
  `apps/app/src/components/patterns/empty-state.tsx`. Five
  call-sites swapped (`detail` → `description`,
  `<ClipboardListIcon>` etc. passed as the `icon` prop directly).

- **Pseudo-links → Buttons.** The two `text-text-accent
hover:underline` ad-hoc anchors (`View on Radar`, `Add facts`)
  are now `<Button variant="ghost" size="sm">` instances. They keep
  the navigation / handler intent but inherit the canonical focus
  ring, hover state, and a11y semantics.

- **Type token normalization.** `text-[10px] / text-[11px] /
tracking-wider` overrides on non-tabular eyebrows replaced with
  the canonical `text-xs font-medium tracking-[0.08em] uppercase`
  spec (the same one `SectionLabel` encodes). The 2-letter filing
  state badges and "Current tax year" chip on filing-plan year
  groups still use `font-mono tabular-nums` per the brief
  ("numerical tabular displays legitimately use this").

## Phase 3 — Polish

- **`gap-5` → `gap-6`.** Two call sites updated:
  - [apps/app/src/routes/clients.$clientId.tsx:36](../../apps/app/src/routes/clients.$clientId.tsx)
  - [apps/app/src/features/clients/ClientFactsWorkspace.tsx:1032](../../apps/app/src/features/clients/ClientFactsWorkspace.tsx)

- **404 recovery.** The "Client not found" alert now has a "Back
  to clients" button in its description so users have an out
  instead of a dead end.

## What's preserved

- `ClientAlertsBand` (the warmth band of Pulse / extension /
  missing-facts callouts) — both critiques flagged this as the
  strongest part of the page; untouched.
- Filing-plan year grouping (`FilingPlanYearSection`) — also
  flagged as a working pattern; only its outer DetailSection chrome
  changed.
- Obligation drawer wiring (`useObligationDrawer().openDrawer`)
  preserved across the existing call sites and added to the new
  ClientSummaryStrip "Next due" tile.

## Verification

- `npx tsc --noEmit` from `apps/app/` exits 0.
- `pnpm exec vp lint` clean on the touched files (0 warnings, 0
  errors).
- Mailbox tab removed cleanly — no test or route references to it
  remain.
