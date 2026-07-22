import { useInfiniteQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { SearchXIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '@duedatehq/ui/components/ui/button'
import { useSidebar } from '@duedatehq/ui/components/ui/sidebar'

import { EmptyState } from '@/components/patterns/empty-state'
import { QueryErrorState } from '@/components/patterns/query-error-state'

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
import {
  deadlineDetailStateObligationId,
  deadlineDetailStateOrigin,
} from '@/features/obligations/queue/helpers'
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
  // The picker this detail was launched from ("/" = /today). Close returns
  // there; tab switches + prev/next paging thread it forward so the origin
  // survives every in-detail navigation (2026-07-22 critique 进出不对称).
  const detailOrigin = deadlineDetailStateOrigin(location.state)

  // 2026-06-16 (audit D1): when a deep-linked ref can't be resolved after the
  // list has fully loaded, the panel used to render a blank pane with no escape.
  // Mirror the /clients/:id "not found" gold standard: once the query has
  // settled and every page is loaded, show a recoverable empty state instead of
  // nothing. Guarded on `!hasNextPage` so we never false-positive while a ref
  // that lives on a not-yet-fetched page is still pending.
  //
  // 2026-07-02 (ux-flow audit P1): a MALFORMED ref (non-hex, wrong length —
  // normalizeDeadlineRef → null) used to skip this branch entirely (the
  // routeRef !== null guard) and fall through to the drawer with a null
  // obligationId — a blank white pane. An invalid ref can never resolve, so
  // it's not-found immediately, no list settling required.
  const invalidRef = routeRef === null && Boolean(params.obligationRef)
  // S1 (ux-flow audit 2026-07-02): a failed list query used to leave the rail
  // saying "No deadlines match." and this pane BLANK (null obligationId falls
  // through to the drawer). Failure is its own state — rail + pane both show
  // the shared error + Retry, never the empty/not-found fictions.
  const listLoadError = listQuery.isError
    ? {
        error: listQuery.error,
        onRetry: () => void listQuery.refetch(),
        retrying: listQuery.isFetching,
      }
    : null
  const detailLoadFailed = listQuery.isError && !obligationId
  const detailNotFound =
    invalidRef ||
    (routeRef !== null &&
      !obligationId &&
      listQuery.isSuccess &&
      !listQuery.isFetching &&
      !listQuery.hasNextPage)

  const handleTabChange = useCallback(
    // NonNullable — the tab is always a concrete value here; the optional
    // field type (X | undefined) tripped exactOptionalPropertyTypes when
    // forwarded into deadlineDetailHref.
    (tab: NonNullable<Parameters<typeof deadlineDetailHref>[0]['tab']>) => {
      if (!obligationId) return
      void navigate(deadlineDetailHref({ obligationId, tab, search: location.search }), {
        replace: true,
        state: { obligationId, ...(detailOrigin ? { from: detailOrigin } : {}) },
      })
    },
    [navigate, obligationId, location.search, detailOrigin],
  )

  const handleClose = useCallback(() => {
    // Origin-aware close (2026-07-22 critique 进出不对称): a detail launched
    // from /today (or any picker) closes back to that origin — closing onto
    // the full /deadlines list lost the place the user actually came from.
    if (detailOrigin) {
      void navigate(detailOrigin)
      return
    }
    // Row-highlight round trip (ux-flow audit 2026-07-02): carry the open
    // obligation back as ?row=<id> so /deadlines lands with the origin row
    // scrolled into view + the one-time arrival wash — closing the detail
    // (crumb, ✕, Esc) no longer dumps the user at the top of the queue with
    // their place lost. `cleanDeadlineDetailSearch` strips any stale `row`
    // first, so this is the only writer.
    const cleaned = cleanDeadlineDetailSearch(location.search)
    if (obligationId) {
      const closeParams = new URLSearchParams(cleaned.startsWith('?') ? cleaned.slice(1) : cleaned)
      closeParams.set('row', obligationId)
      void navigate(`/deadlines?${closeParams.toString()}`)
      return
    }
    void navigate(`/deadlines${cleaned}`)
  }, [navigate, location.search, obligationId, detailOrigin])

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
          state: { obligationId: targetId, ...(detailOrigin ? { from: detailOrigin } : {}) },
        },
      )
    },
    [navigate, activeTab, location.search, detailOrigin],
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
        loadError={listLoadError}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 2026-06-10 (Yuqi alert↔deadline parity #1): the breadcrumb +
            position read-out + close moved INTO the drawer's in-surface
            top bar (mirroring AlertDetailDrawer, which carries its own
            BackStrip inside the body). Prev/Next paging is the rail + the
            drawer's ▲▼ keyboard handler now, so the route no longer
            renders a separate crumb bar above the panel. */}
        {detailLoadFailed && listLoadError ? (
          // The list query failed and the ref can't resolve — an error pane
          // with Retry, not the blank drawer / "not found" fiction.
          <div className="flex flex-1 items-center justify-center p-8">
            <QueryErrorState
              what={<Trans>this deadline</Trans>}
              error={listLoadError.error}
              onRetry={listLoadError.onRetry}
              retrying={listLoadError.retrying}
              frameless
            />
          </div>
        ) : detailNotFound ? (
          <EmptyState
            variant="prominent"
            iconTone="neutral"
            fill
            icon={SearchXIcon}
            title={<Trans>Deadline not found</Trans>}
            description={
              <Trans>
                This deadline may have been deleted, filed, or you may not have access to it.
              </Trans>
            }
            cta={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                // Carry the cleaned current search so recovery lands on the
                // same filtered list the user came from (S3 crumb parity).
                render={<Link to={`/deadlines${cleanDeadlineDetailSearch(location.search)}`} />}
              >
                <Trans>Back to deadlines</Trans>
              </Button>
            }
          />
        ) : (
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
        )}
      </div>
    </div>
  )
}
