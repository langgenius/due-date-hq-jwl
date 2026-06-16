# /clients — drop the redundant Client filter + switch to continuous scroll

**Date:** 2026-06-15
**Surface:** `apps/app/src/features/clients/ClientFactsWorkspace.tsx`,
`apps/app/src/routes/clients.tsx`

Two of three page-feedback items on /clients (the third — PageHeader cohesion —
is a separate, pending design call).

## 1. Removed the "Client" filter dropdown

Feedback: "why is there a client filter dropdown on a client page?"

The directory page IS the list of clients, so a multi-select of client names was
redundant with the search box (which already does name / EIN lookup). Removed the
`Client` `TableHeaderMultiFilter` from the toolbar; the structural facets that
actually narrow the directory stay — **States / Entity / Assignee**.

Cleaned up the now-dead UI wiring: `clientOptions`, the `clientFilter` /
`onClientFilterChange` props through `ClientFactsWorkspace` → `ClientsFilterToolbar`,
the route's `handleClientFilterChange`, and the unused `normalizeClientIdFilters`
import. Left intact (dormant): the `clients` URL param parser + the
`filterClients` `clientFilters` branch, so a `?clients=id1,id2` deep-link still
narrows the list — there's just no UI to set it from this page. The
client-query-state / client-readiness tests (which exercise that layer) are
untouched and still pass.

## 2. Pagination → one continuous scroll region

Feedback: "other pages are all having infinite scroll. please do that for clients
page as well."

/clients was the only main list surface with a prev/next **pagination footer**
(+ a responsive page-size ResizeObserver that sized each page to the viewport).
/deadlines, by contrast, scrolls continuously. Since the directory is already
fully loaded client-side (`listByFirm` caps at `CLIENT_LIST_LIMIT = 500`), there's
no need for fetch-on-scroll — the whole filtered set renders in one scroll region.

Changes:

- Dropped `getPaginationRowModel`, the `computeClientsResponsivePageSize` /
  `useClientsResponsivePageSize` helpers + their constants, the
  `initialState.pagination`, and the `table.setPageSize` effect.
- The table-card's inner container is now the single scroll region
  (`overflow-y-auto`), with the `<TableHeader>` pinned via `sticky top-0 z-10`
  (the `[&_th]:bg-background-section` keeps it opaque over scrolling rows) —
  matching the /deadlines queue's scroll model.
- Removed the pagination footer entirely; the count already lives in the
  page-header title pill + the KPI strip, so a footer total would only repeat it.

## Verification

`vp check` clean on both files; `vp test clients` → 8 files / 37 tests pass.
Browser (/clients): toolbar reads States / Entity / Assignee / Clear filters (no
Client filter); no "Page X of Y" text and no prev/next buttons; `<thead>` computes
`position: sticky`; all rows render in one scroll region. No console errors.
