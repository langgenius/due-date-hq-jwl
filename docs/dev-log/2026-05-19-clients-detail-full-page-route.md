---
title: 'Clients detail — full-page route + Open full view (stage 2)'
date: 2026-05-19
area: app
---

# Clients detail — full-page route (stage 2)

Stage 1 wrapped the inline detail in a side panel. Stage 2 adds the
expandable full-page surface so users can:

- Triage in the side panel (default click on a row),
- Click **Open full view** to escalate to a full page when they need room,
- Share / bookmark a specific client via `/clients/:clientId`.

## What stage 2 does

- New route `/clients/:clientId` registered in `apps/app/src/router.tsx`,
  lazy-loaded from `apps/app/src/routes/clients.$clientId.tsx`.
- New `ClientDetailRoute` renders the existing `ClientDetailWorkspace`
  full-width inside the protected app shell, with a top
  `← Back to clients` ghost button that returns to `/clients`.
- `ClientDetailWorkspace` is now `export`ed from
  `apps/app/src/features/clients/ClientFactsWorkspace.tsx` so both the
  Sheet and the new route can render the same body component.
- The internal "Back to clients" button is **removed from the body
  itself**. In the Sheet the close X handles dismissal; on the full page
  the route renders its own back link. `onBack` was dropped from the
  component's prop surface.
- An **Open full view** outline button is added at the top of the Sheet
  content. It uses the same `Button render={<Link to=…/>}` pattern as
  other intra-app navigations.
- `routeSummaries.clientDetail` added to
  `apps/app/src/routes/route-summary.ts` so the route inherits the same
  breadcrumb / title-bar plumbing the rest of the app uses.

## What stage 2 does NOT do (intentional)

- **No content trimming.** Both the Sheet body and the full page render
  the same six sections — identity card, Work plan, Pulse impact,
  Contact chain, Activity log, Opportunities. Trimming the Sheet view
  to essentials lands in stage 3.
- **Filter preservation across back/forward is best-effort.** The back
  button on the full page navigates to `/clients` (no carried filter
  state). If the user reached the full page via the Sheet, the list URL
  it returns to is whatever was on the URL when they expanded; if they
  hard-loaded `/clients/:clientId`, they land on the filter-less list.
  Carrying filters via location state can land in stage 3 along with the
  trim.
- **No keyboard shortcut** for Open full view yet (e.g., `O` to open).
  Could be added with the other client shortcuts later.

## Files

- `apps/app/src/router.tsx` — registered `clients/:clientId` lazily.
- `apps/app/src/routes/clients.$clientId.tsx` — new route component.
- `apps/app/src/routes/clients.tsx` — exported `useEntityLabels` so the
  detail route reuses the same lingui-aware label map.
- `apps/app/src/routes/route-summary.ts` — added `clientDetail` summary.
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`:
  - `ClientDetailWorkspace` exported; `onBack` prop and internal
    "Back to clients" button removed.
  - Sheet body now renders an "Open full view" `Button` that links to
    `/clients/:clientId`.
  - Dropped the unused `ArrowLeftIcon` import.

## Validation

- `pnpm check` (579 files, 0 warnings, 0 errors)
- `pnpm --filter @duedatehq/app test -- --run` (40 files, 208 tests)
- Manual: open `http://localhost:5178/clients`, click a row → Sheet opens
  with an **Open full view** button → click → navigates to
  `/clients/:clientId` with full-width detail; `← Back to clients` returns
  to the list.

## Next stage

- **Stage 3**: content split. The Sheet keeps the essentials (identity,
  one-liner summary, top 3 obligations, Pulse teaser); the full page
  keeps the full obligations table, Activity log, Contact chain, full
  Opportunities. Also: carry list filters across the round trip, hide
  low-signal sections behind disclosures, and reorganize the full-page
  identity block to match the reference design (entity + state chips +
  alert pill on the same line as the title; one-liner summary below).
