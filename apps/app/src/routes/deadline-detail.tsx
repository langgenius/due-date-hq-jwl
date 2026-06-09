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
import { DeadlineCrumbBar } from '@/features/obligations/detail/DeadlineCrumbBar'
import { DeadlineNavigatorRail } from '@/features/obligations/detail/DeadlineNavigatorRail'
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

  // Default-sorted list (due date ascending) — matches the table's
  // default order. Filter/sort coherence with a filtered table is a
  // follow-up (the rail shares the same query key shape so swapping in
  // the table's exact input later is a drop-in).
  const listQuery = useInfiniteQuery({
    ...orpc.obligations.list.infiniteOptions({
      // `INITIAL_CURSOR` (ObligationQueueCursor = string | null) — bare `null`
      // narrows the page-param type to the `null` literal and breaks the
      // useInfiniteQuery overload (mirrors obligations.tsx's working query).
      initialPageParam: INITIAL_CURSOR,
      input: (cursor) => ({ sort: 'due_asc' as const, limit: RAIL_PAGE_SIZE, cursor }),
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
  const currentRow = currentIndex >= 0 ? (rows[currentIndex] ?? null) : null
  const prevRow = currentIndex > 0 ? (rows[currentIndex - 1] ?? null) : null
  const nextRow =
    currentIndex >= 0 && currentIndex < rows.length - 1 ? (rows[currentIndex + 1] ?? null) : null

  const goToRow = useCallback(
    (targetId: string | null) => {
      if (!targetId) return
      void navigate(deadlineDetailHref({ obligationId: targetId, tab: activeTab }), {
        state: { obligationId: targetId },
      })
    },
    [navigate, activeTab],
  )

  return (
    <div className="flex h-full min-h-0 w-full">
      <DeadlineNavigatorRail
        rows={rows}
        activeObligationId={obligationId}
        activeTab={activeTab}
        totalCount={rows.length > 0 ? rows.length : null}
        hasMore={Boolean(listQuery.hasNextPage)}
        isLoadingMore={listQuery.isFetchingNextPage}
        onLoadMore={() => void listQuery.fetchNextPage()}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DeadlineCrumbBar
          row={currentRow}
          onPrev={() => goToRow(prevRow?.id ?? null)}
          onNext={() => goToRow(nextRow?.id ?? null)}
          prevDisabled={!prevRow}
          nextDisabled={!nextRow}
        />
        <div className="flex min-h-0 flex-1 flex-col">
          <ObligationQueueDetailDrawer
            mode="page"
            obligationId={obligationId}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onClose={handleClose}
            onNeedsInput={() => {}}
            practiceAiEnabled={false}
            blockerCandidates={rows}
          />
        </div>
      </div>
    </div>
  )
}
