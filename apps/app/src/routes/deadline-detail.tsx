import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useSidebar } from '@duedatehq/ui/components/ui/sidebar'

import {
  cleanDeadlineDetailSearch,
  deadlineDetailHref,
  findObligationIdByDeadlineRef,
  normalizeDeadlineDetailTab,
  normalizeDeadlineRef,
} from '@/features/obligations/deadline-detail-url'
import { DeadlineNavigatorRail } from '@/features/obligations/detail/DeadlineNavigatorRail'
import { railListInputFromSearch } from '@/features/obligations/rail-list-input'
import { ObligationQueueDetailDrawer } from '@/features/obligations/queue/ObligationQueueDetailDrawer'
import { INITIAL_CURSOR } from '@/features/obligations/queue/constants'
import { deadlineDetailStateObligationId } from '@/features/obligations/queue/helpers'
import { orpc } from '@/lib/rpc'

const RAIL_PAGE_SIZE = 50

/**
 * `/deadlines/:obligationRef[/:detailTab]` — the master-detail page
 * (Pencil node rzzww). A 380px navigator rail on the left + the detail
 * on the right. The plain `/deadlines` (no ref) keeps the full table
 * route (`ObligationQueueRoute`).
 *
 * The rail and the table read the same `obligations.list` query so the
 * rail order matches what the user was just looking at, and TanStack
 * serves it from cache on navigation. Tab changes deep-link to
 * `/deadlines/:ref/:tab`; the detail content + all of its mutations are
 * reused wholesale from `ObligationQueueDetailDrawer` (panel mode).
 */
export function DeadlineDetailRoute() {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { setAutoCollapsed } = useSidebar()

  // The master-detail page wants the 56px app rail collapsed (the
  // navigator rail is the in-context list now).
  useEffect(() => {
    setAutoCollapsed(true)
    return () => setAutoCollapsed(false)
  }, [setAutoCollapsed])

  const routeRef = normalizeDeadlineRef(params.obligationRef ?? null)
  const activeTab = normalizeDeadlineDetailTab(params.detailTab ?? null) ?? 'summary'

  // The rail mirrors the TABLE's active sort + filters: we parse the same
  // URL search params the /deadlines table reads (via the shared parser map)
  // and feed the identical `obligations.list` input. So the rail order and
  // membership match exactly what the user was just looking at, and — because
  // the query key is the same shape — TanStack serves it straight from cache
  // on navigation. With no relevant params present this resolves to the
  // historical `due_asc` baseline, so a bare `/deadlines/:ref` is unchanged.
  const railListInput = useMemo(
    () => railListInputFromSearch(location.search, RAIL_PAGE_SIZE),
    [location.search],
  )
  const listQuery = useInfiniteQuery({
    ...orpc.obligations.list.infiniteOptions({
      // `INITIAL_CURSOR` (ObligationQueueCursor = string | null) — bare `null`
      // narrows the page-param type to the `null` literal and breaks the
      // useInfiniteQuery overload (mirrors obligations.tsx's working query).
      initialPageParam: INITIAL_CURSOR,
      input: (cursor) => ({ ...railListInput, cursor }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
    placeholderData: (previous) => previous,
  })

  const rows = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.rows) ?? [],
    [listQuery.data],
  )

  // Resolve the ref → obligation id. Prefer the navigation-state
  // fast-path (set when navigating from the table/rail) so the detail
  // renders before the list resolves; fall back to matching against the
  // loaded rows.
  const obligationId =
    deadlineDetailStateObligationId(location.state, routeRef) ??
    findObligationIdByDeadlineRef(rows, routeRef)

  const handleTabChange = useCallback(
    // NonNullable — the tab is always a concrete value here; the optional
    // field type (X | undefined) tripped exactOptionalPropertyTypes when
    // forwarded into deadlineDetailHref.
    (tab: NonNullable<Parameters<typeof deadlineDetailHref>[0]['tab']>) => {
      if (!obligationId) return
      void navigate(deadlineDetailHref({ obligationId, tab, search: location.search }), {
        replace: true,
        state: { obligationId },
      })
    },
    [navigate, obligationId, location.search],
  )

  const handleClose = useCallback(() => {
    void navigate(`/deadlines${cleanDeadlineDetailSearch(location.search)}`)
  }, [navigate, location.search])

  // Prev/Next navigation across the loaded rows, in the same order the
  // rail shows. Clamped at the ends.
  const currentIndex = obligationId ? rows.findIndex((row) => row.id === obligationId) : -1
  const prevRow = currentIndex > 0 ? (rows[currentIndex - 1] ?? null) : null
  const nextRow =
    currentIndex >= 0 && currentIndex < rows.length - 1 ? (rows[currentIndex + 1] ?? null) : null

  const goToRow = useCallback(
    (targetId: string | null) => {
      if (!targetId) return
      // 2026-06-16 (Yuqi "点了一个status进到detail就无法切换回去 — 有bug"): thread
      // `search` so prev/next paging keeps the active status filter; without it
      // a hop dropped ?status, so the rail expanded to all rows and Close
      // returned to the unfiltered list.
      void navigate(
        deadlineDetailHref({ obligationId: targetId, tab: activeTab, search: location.search }),
        {
          state: { obligationId: targetId },
        },
      )
    },
    [navigate, activeTab, location.search],
  )

  return (
    <div className="flex h-full min-h-0 w-full">
      <DeadlineNavigatorRail
        rows={rows}
        routeSearch={location.search}
        activeObligationId={obligationId}
        activeTab={activeTab}
        totalCount={rows.length > 0 ? rows.length : null}
        hasMore={listQuery.hasNextPage}
        isLoadingMore={listQuery.isFetchingNextPage}
        onLoadMore={() => void listQuery.fetchNextPage()}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 2026-06-10 (Yuqi alert↔deadline parity #1): the breadcrumb +
            position read-out + close moved INTO the drawer's in-surface
            top bar (mirroring AlertDetailDrawer, which carries its own
            BackStrip inside the body). Prev/Next paging is the rail + the
            drawer's ▲▼ keyboard handler now, so the route no longer
            renders a separate crumb bar above the panel. */}
        <ObligationQueueDetailDrawer
          mode="page"
          obligationId={obligationId}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onClose={handleClose}
          onNeedsInput={() => {}}
          practiceAiEnabled={false}
          blockerCandidates={rows}
          onPrev={prevRow ? () => goToRow(prevRow.id) : undefined}
          onNext={nextRow ? () => goToRow(nextRow.id) : undefined}
          position={
            currentIndex >= 0 && rows.length > 0
              ? { index: currentIndex, total: rows.length }
              : null
          }
        />
      </div>
    </div>
  )
}
