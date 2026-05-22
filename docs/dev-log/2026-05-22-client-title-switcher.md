---
title: 'Move client switcher from breadcrumb to title; eyebrow becomes plain ← Clients link'
date: 2026-05-22
author: 'Yuqi pairing with Claude'
area: ux
---

# Client switcher — title position, not breadcrumb position

Iteration on top of commit `dc1a8ba` (D-1). That commit split the
single breadcrumb trigger into Link + chevron pair, which fixed the
2-click-back bug but still felt cramped — the eyebrow was doing two
jobs at once.

This commit moves the switcher chevron **next to the H1 title** and
turns the eyebrow into a plain `← Clients` back link.

## The new shape

```
← Clients

Riverbend Draft Client ▾                ‹ 1/9 ›   …actions…
1 open filing · next due May 6 · 1 late
```

- **Eyebrow row:** single `← Clients` link in eyebrow type (11px /
  500 / tracking-0.08em → but the `normal-case tracking-normal`
  override on the Link makes "Clients" read as a friendly back-link
  rather than as the uppercase eyebrow tag pattern). Click navigates
  to `/clients`. One hit target, one job.
- **Title row:** `Riverbend Draft Client` at H1 scale, immediately
  followed by a chevron-down button that opens the searchable client
  switcher popover.

This matches the mental model:

- The eyebrow tells you **where you came from**.
- The title tells you **which client you're on** — and the chevron
  is the natural place to ask "switch to which?".

## Why

User feedback after the previous commit: cramming the back-link and
the switcher into a single breadcrumb segment made it ambiguous what
clicking the eyebrow meant. Splitting them visually (eyebrow ←→ title
row) makes both intentions obvious.

It also lifts the visual weight of the client name. Until now the
H1 was a static text node sandwiched between an eyebrow and a
subtitle; now it carries the page's most useful affordance.

## What changed

- `ClientBreadcrumbSwitcher.tsx` renamed → `ClientTitleSwitcher.tsx`
  (preserves git history via `git mv`)
- New component signature: `<ClientTitleSwitcher client={...} />`
  — takes the client object directly so it can render the name at
  H1 scale. Chevron button is `size-7` for a generous hit target
  inside the title row.
- `ClientFactsWorkspace` swaps from `breadcrumbs={[...]}` to
  `eyebrow={<Link to="/clients" …>← Clients</Link>}` +
  `title={<ClientTitleSwitcher client={client} />}`.
- Popover keeps the search + per-client navigate behavior. Dropped
  the "Back to client list" item from the popover — redundant now
  that the eyebrow does it.
- i18n catalog re-extracted (`pnpm i18n:extract`) — file paths
  changed for the renamed component. Added 3 zh-CN translations
  (`Switch to another client` and two earlier-missed strings that
  the extract surfaced).

## Verification

- `npx tsc --noEmit -p apps/app/tsconfig.json` → clean
- `pnpm --filter @duedatehq/app i18n:compile --strict` → clean
- Manual: open any client →
  - Eyebrow reads `← Clients`; clicking returns to /clients
  - Title row: name in H1 scale + chevron immediately after; click
    chevron → search popover; pick another client → navigates
  - No breadcrumb stack above the title anymore

## Files

- R `apps/app/src/features/clients/ClientBreadcrumbSwitcher.tsx` →
  `apps/app/src/features/clients/ClientTitleSwitcher.tsx` (renamed
  - rewritten)
- M `apps/app/src/features/clients/ClientFactsWorkspace.tsx` —
  swap breadcrumbs for eyebrow + title nodes
- M en + zh-CN message catalogs (po + compiled ts)
- A this dev-log entry

## What's next

Commit 2 (still pending from the sequencing doc): list header trim
(L-1 split button + L-7 STATES merge + L-8 summary card → strip).
