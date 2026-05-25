---
title: 'Client detail: obligation drawer becomes an in-route page panel'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: clients
---

# Client page obligation panel

## Context

Clicking an obligation inside the filing plan on `/clients/[id]`
used to open the canonical `ObligationQueueDetailDrawer` as a
**modal Sheet overlay** on top of the client page. ~720px wide,
backdrop behind, focus trap. Per the 2026-05-22 review: the overlay
covered exactly the work the CPA came to see — compliance posture,
filing plan, alerts band — and turned a single-context page into a
modal interruption.

The queue route already has a non-modal alternative: the drawer
supports `mode="panel"` (a regular in-route `<aside>`, no backdrop,
no scroll lock). `/obligations` mounts it as a sibling of the queue
table in a 2-column layout. The fix: do the same on `/clients/[id]`.

## Change

### 1. `ObligationDrawerProvider` — extend context and add client-detail deference

[`apps/app/src/features/obligations/ObligationDrawerProvider.tsx`](apps/app/src/features/obligations/ObligationDrawerProvider.tsx)

- `ObligationDrawerContextValue` now exposes `activeTab` +
  `setActiveTab` so routes that own their own panel mount drive the
  same tab state. The queue and the new client-detail panel read
  from this shared state.
- New `routeOwnsPanel` check covers both `/obligations` and
  `/clients/...`. When on either, the provider skips its own Sheet
  mount — the route is responsible for placing the panel in its
  layout. Dashboard, Pulse, Cmd+K, etc. continue to use the
  provider's Sheet as before.

### 2. `ClientDetailWorkspace` — 2-column layout with the panel on the right

[`apps/app/src/features/clients/ClientFactsWorkspace.tsx`](apps/app/src/features/clients/ClientFactsWorkspace.tsx)

- New `useObligationDrawer()` read at the top of
  `ClientDetailWorkspace` for `obligationId`, `activeTab`,
  `setActiveTab`, `closeDrawer`.
- Page structure changes from:
  ```
  <section flex-col>
    <PageHeader />
    <identity strip />
    <ClientAlertsBand />
    <ClientSummaryStrip />
    <Tabs />
  </section>
  ```
  to:
  ```
  <div flex-col>
    <PageHeader />                       ← always full-width
    <div flex-row at xl, flex-col below>
      <section flex-1>
        <identity strip />
        <ClientAlertsBand />
        <ClientSummaryStrip />
        <Tabs />
      </section>
      {obligationId ? (
        <aside w-[480px] xl:shrink-0>
          <ObligationQueueDetailDrawer mode="panel" ... />
        </aside>
      ) : null}
    </div>
  </div>
  ```
- The PageHeader stays full-width above the split so the prev/next
  arrows, breadcrumb switcher, and action cluster remain anchored
  regardless of panel state.
- At < xl viewports the panel stacks below the client content
  (responsive fallback — desktop CPAs get the split; laptops just
  shifted to vertical).
- Panel width: **480px** at xl+. Narrower than the queue's 600px
  because the client column carries denser composite content and
  the panel doesn't host the K-1 picker / penalty dialog on this
  surface — so it can afford to be slimmer.

## What stays the same

- Row click on `/clients` → full page (unchanged).
- Peek icon on `/clients` rows → drawer (the SLIM client drawer)
  (unchanged).
- Cross-surface obligation drawer state — same singleton provider,
  same content, same J/K hotkeys in the panel.
- Dashboard, Pulse, Cmd+K openings of obligations → Sheet overlay
  (unchanged for now). Their surfaces don't have the layout space
  to host a permanent panel; converting them is a separate decision.
- The penalty-input dialog flow stays route-local to `/obligations`.
  Captured in the panel mount's `onNeedsInput` comment.

## Trade-offs and what we didn't do

- **Inconsistency across surfaces.** Dashboard's obligation
  click still produces a Sheet overlay; client detail produces an
  inline panel. The pattern fragmentation is real but deliberate:
  the dashboard's action rows are short, the obligation drawer
  fits as overlay, and converting dashboard to a 2-column layout
  needs its own design pass. Flagging here so it doesn't slip.
- **Panel width is fixed 480px, not user-resizable.** A drag-handle
  resizer is feasible but doesn't earn its weight yet — the panel's
  content is content-driven, not table-driven, so the user rarely
  needs more than ~480px of horizontal real estate.
- **No persisted-open state.** Refreshing the page closes the
  panel (the provider state is in-memory). Adding URL state
  (`?obligation=ID`) would make the panel deep-linkable but creates
  cross-route coupling — the same URL on `/obligations` already
  drives the queue's drawer; a separate query param keeps them
  independent. Skip for now.
- **`blockerCandidates` is empty on this surface.** The K-1 picker
  inside the panel won't see candidates outside this client's
  obligations. Acceptable — CPAs who need cross-client blocker
  picking are already deep-link-routing through `/obligations`.

## Verification

- `pnpm check` — 1 error / 15 warnings on branch. **None in any
  file I touched.** Lone error is the other session's
  `rules.library-v2.tsx` `as LibraryView` cast.
- The route deference catches `/clients/...` via
  `location.pathname.startsWith('/clients/')`. The list route
  `/clients` (no trailing id) keeps the provider's Sheet (its
  `useObligationDrawer` consumer is the cross-surface peek path).

## Try it

1. Visit `/clients/<any client id>`.
2. Scroll to the Work tab → Filing plan.
3. Click any obligation row.
4. The obligation panel appears as an `<aside>` on the right of the
   page (480px wide at xl+, stacked below at narrower viewports).
   No backdrop, no scroll lock — you can still scroll the client
   content and click any of its controls.
5. Click X / press Esc to close. The client content reclaims the
   full width.
6. While the panel is open, the prev/next arrows in the PageHeader
   still cycle clients; the cycle keeps the obligation drawer open
   (clientId changes, obligationId remains until closed).

## Files

- `apps/app/src/features/obligations/ObligationDrawerProvider.tsx`
  — context shape + `routeOwnsPanel` check.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
  context read + 2-column layout + panel mount.
- `docs/dev-log/2026-05-22-client-page-obligation-panel.md` — this
  entry.

## Follow-up

- Convert `/dashboard` action-list clicks to the panel pattern (or
  decide to keep them as Sheet because the layout doesn't fit a
  permanent right rail).
- Persist `?obligation=ID` on `/clients/[id]` for shareability.
- E2E: assert the panel mounts on filing-plan click and is NOT a
  Sheet (no backdrop role in the DOM).
