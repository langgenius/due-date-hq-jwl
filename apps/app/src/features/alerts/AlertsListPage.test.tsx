import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PulseAlertPublic, PulseDetail, PulseSourceHealth } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { AlertsListPage } from './AlertsListPage'
import { MorningSweepProvider, useMorningSweep } from './MorningSweepContext'

// Shape of the options object the api.ts infinite hooks pass to
// orpc.pulse.list*.infiniteOptions — mirrored by the mock below.
type InfiniteOptionsArg = {
  input: (cursor: string | null) => unknown
  initialPageParam: string | null
  getNextPageParam: (page: { nextCursor: string | null }) => string | null | undefined
}

const rpcMocks = vi.hoisted(() => ({
  listAlertsQueryFn: vi.fn(),
  listHistoryQueryFn: vi.fn(),
  listSourceHealthQueryFn: vi.fn(),
  getDetailsBatchQueryFn: vi.fn(),
  getDetailQueryFn: vi.fn(),
}))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    audit: { key: () => ['audit'] },
    dashboard: { load: { key: () => ['dashboard', 'load'] } },
    obligations: { list: { key: () => ['obligations', 'list'] } },
    // 2026-06-05 (post-merge regression fix): the alerts/today card
    // redesign cherry-pick (3495a30c → 3fe74bf6) added day-grouped
    // `PulseAlertRow`s whose RelativeTime primitive resolves the firm
    // timezone via `useCurrentFirm` (→ `orpc.firms.listMine`). The
    // stub returns an empty list so the hook resolves without
    // requiring a real firm.
    firms: {
      listMine: {
        // 2026-06-07 (Pencil g5kKJQ bulk-selection): the page now
        // calls `useAlertPermissions`, which reads the firm list out
        // of the query cache via `orpc.firms.listMine.queryKey(...)`.
        // Stub the key fn so the permission hook resolves to the
        // anonymous (no-firm) role — which keeps the priority-queue
        // query disabled in tests.
        queryKey: () => ['firms', 'listMine'],
        queryOptions: () => ({
          queryKey: ['firms', 'listMine'],
          queryFn: async () => [],
        }),
      },
    },
    pulse: {
      key: () => ['pulse'],
      activeCount: { key: () => ['pulse', 'activeCount'] },
      listAlerts: {
        key: () => ['pulse', 'listAlerts'],
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'listAlerts', args.input],
          // Mirror the server's origin filter: the page now issues a 'live'
          // query (news stream) and a 'catchup' query (Already-in-effect
          // band) — one unfiltered mock would render every seed in BOTH.
          queryFn: async () => {
            const page = (await rpcMocks.listAlertsQueryFn()) as
              | { alerts?: Array<{ origin?: string }> }
              | undefined
            const origin = (args.input as { origin?: string } | undefined)?.origin
            if (!origin || !page?.alerts) return page
            return {
              ...page,
              alerts: page.alerts.filter((alert) => (alert.origin ?? 'live') === origin),
            }
          },
        }),
        infiniteOptions: (opts: InfiniteOptionsArg) => ({
          queryKey: ['pulse', 'listAlerts', 'infinite', opts.input(opts.initialPageParam)],
          queryFn: rpcMocks.listAlertsQueryFn,
          initialPageParam: opts.initialPageParam,
          getNextPageParam: opts.getNextPageParam,
        }),
      },
      listHistory: {
        key: () => ['pulse', 'listHistory'],
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'listHistory', args.input],
          queryFn: rpcMocks.listHistoryQueryFn,
        }),
        infiniteOptions: (opts: InfiniteOptionsArg) => ({
          queryKey: ['pulse', 'listHistory', 'infinite', opts.input(opts.initialPageParam)],
          queryFn: rpcMocks.listHistoryQueryFn,
          initialPageParam: opts.initialPageParam,
          getNextPageParam: opts.getNextPageParam,
        }),
      },
      listSourceHealth: {
        queryOptions: () => ({
          queryKey: ['pulse', 'listSourceHealth'],
          queryFn: rpcMocks.listSourceHealthQueryFn,
        }),
      },
      getDetailsBatch: {
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'getDetailsBatch', args.input],
          queryFn: rpcMocks.getDetailsBatchQueryFn,
        }),
      },
      getDetail: {
        key: () => ['pulse', 'getDetail'],
        queryKey: (args: { input: unknown }) => ['pulse', 'getDetail', args.input],
        // 2026-06-10 (P2-4 N+1 fix): rows subscribe with enabled:false via
        // `useAlertDetailFromCacheQueryOptions` and must never call this.
        // The stub exists because useQuery still builds options at render,
        // and the no-fetch regression test below asserts zero calls.
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'getDetail', args.input],
          queryFn: rpcMocks.getDetailQueryFn,
        }),
      },
      // 2026-06-05 (post-merge regression fix): rounds 70-85 wired
      // a hover-only Dismiss button on each list row through
      // `orpc.pulse.dismiss`. The component calls `mutationOptions(...)`
      // at render time, so the mocks need to exist even though these
      // tests don't exercise the mutations. Returning a benign
      // mutationOptions shape keeps useMutation happy.
      dismiss: {
        mutationOptions: () => ({ mutationFn: vi.fn() }),
      },
      bulkDismiss: {
        mutationOptions: () => ({ mutationFn: vi.fn() }),
      },
      // 2026-06-08: rows expose an inline Undo that re-activates a
      // just-dismissed alert via `orpc.pulse.reactivate` — same render-time
      // `mutationOptions(...)` contract as dismiss/bulkDismiss above.
      reactivate: {
        mutationOptions: () => ({ mutationFn: vi.fn() }),
      },
      // 2026-06-07 (Pencil g5kKJQ `IciLB PriorityReasons`): the page
      // seeds the per-row smart-priority inset from the priority
      // queue. The query is disabled without `canViewPriorityQueue`,
      // but `useQuery` still evaluates `queryOptions(...)` at render,
      // so the stub must exist.
      listPriorityQueue: {
        key: () => ['pulse', 'listPriorityQueue'],
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'listPriorityQueue', args.input],
          queryFn: async () => ({ items: [] }),
        }),
      },
    },
  },
}))

vi.mock('./DrawerProvider', () => ({
  useAlertDrawer: () => ({ alertId: null, openDrawer: vi.fn(), closeDrawer: vi.fn() }),
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function source(overrides: Partial<PulseSourceHealth> = {}): PulseSourceHealth {
  return {
    sourceId: 'irs.disaster',
    label: 'IRS Disaster Relief',
    tier: 'T1',
    jurisdiction: 'FED',
    enabled: true,
    healthStatus: 'degraded',
    lastCheckedAt: '2026-05-06T10:00:00.000Z',
    lastSuccessAt: '2026-05-05T10:00:00.000Z',
    nextCheckAt: '2026-05-06T11:00:00.000Z',
    consecutiveFailures: 2,
    lastError: 'selector drift',
    ...overrides,
  }
}

const SEED_ALERT_ID = '12121212-1212-4121-8121-121212121212'

function listAlert(overrides: Partial<PulseAlertPublic> = {}): PulseAlertPublic {
  return {
    id: SEED_ALERT_ID,
    pulseId: '34343434-3434-4343-8343-343434343434',
    status: 'matched',
    sourceStatus: 'approved',
    origin: 'live',
    actionDeadline: null,
    changeKind: 'deadline_shift',
    actionMode: 'due_date_overlay',
    firmImpact: 'matched',
    title: 'Seeded CA relief',
    source: 'CA FTB',
    sourceUrl: 'https://example.com/source',
    summary: 'California posted deadline relief.',
    publishedAt: '2026-05-01T00:00:00.000Z',
    dismissedAt: null,
    appliedAt: null,
    matchedCount: 1,
    needsReviewCount: 0,
    applyReadiness: { status: 'ready', missing: [] },
    duplicateSourceSnapshotCount: 0,
    confidence: 0.9,
    isSample: false,
    jurisdiction: 'CA',
    taxAreas: [],
    forms: [],
    ...overrides,
  }
}

function alertDetail(): PulseDetail {
  return {
    alert: listAlert(),
    jurisdiction: 'CA',
    counties: [],
    forms: ['1065'],
    entityTypes: ['llc'],
    originalDueDate: '2026-03-15',
    newDueDate: '2026-10-15',
    effectiveFrom: null,
    effectiveUntil: null,
    affectedRuleIds: [],
    reverifyRuleIds: [],
    structuredChange: null,
    sourceExcerpt: 'Excerpt.',
    reviewedAt: null,
    applyReadiness: { status: 'ready', missing: [] },
    affectedClients: [
      {
        obligationId: '99999999-9999-4999-8999-999999999999',
        clientId: '88888888-8888-4888-8888-888888888888',
        clientName: 'Seeded Client Co',
        state: 'CA',
        county: null,
        entityType: 'llc',
        taxType: '1065',
        currentDueDate: '2026-03-15',
        newDueDate: '2026-10-15',
        status: 'pending',
        matchStatus: 'eligible',
        reason: null,
      },
    ],
  }
}

async function render(children: ReactNode, initialEntry = '/alerts') {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root?.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <QueryClientProvider client={client}>
          <AppI18nProvider>{children}</AppI18nProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })

  return client
}

async function waitForText(text: string, attempts = 100): Promise<void> {
  if (document.body.textContent?.includes(text)) return
  if (attempts > 0) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    return waitForText(text, attempts - 1)
  }
  throw new Error(`Expected text not found: ${text}; body=${document.body.textContent ?? ''}`)
}

// Polls an assertion until it stops throwing, advancing React effects/timers
// the same way `waitForText` does. Use for state that settles in an async
// effect after the visible render (e.g. post-render query-cache seeding).
async function waitFor(assertion: () => void, attempts = 100): Promise<void> {
  try {
    assertion()
    return
  } catch (err) {
    if (attempts <= 0) throw err
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    return waitFor(assertion, attempts - 1)
  }
}

// The Review/Active MODE toggle was removed 2026-06-21 (Yuqi) for the unified
// two-zone triage list ([[project_alerts_triage_model]]): "needs action" alerts
// render in their own zone by default and the "for your awareness" digest is
// expanded by default, so action fixtures are reachable with no segment switch.
// Kept as a no-op so the existing call sites read unchanged.
async function selectActiveQueue(): Promise<void> {
  await Promise.resolve()
}

beforeEach(() => {
  bootstrapI18n()
  rpcMocks.listAlertsQueryFn.mockReset()
  rpcMocks.listHistoryQueryFn.mockReset()
  rpcMocks.listSourceHealthQueryFn.mockReset()
  rpcMocks.getDetailsBatchQueryFn.mockReset()
  rpcMocks.getDetailQueryFn.mockReset()
  rpcMocks.getDetailQueryFn.mockResolvedValue(null)
  rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [], nextCursor: null })
  rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: [], nextCursor: null })
  rpcMocks.listSourceHealthQueryFn.mockResolvedValue({ sources: [] })
  rpcMocks.getDetailsBatchQueryFn.mockResolvedValue({ details: [] })
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
  }
  container?.remove()
  root = null
  container = null
  document.body.replaceChildren()
  activateLocale('en')
})

describe('AlertsListPage source health display', () => {
  it('uses the active alert query on the active alerts surface', async () => {
    await render(<AlertsListPage embedded />)

    await waitForText('No alerts right now')
    expect(rpcMocks.listAlertsQueryFn).toHaveBeenCalled()
    expect(rpcMocks.listHistoryQueryFn).not.toHaveBeenCalled()
  })

  // The old "history surface" tests (rendered <AlertsListPage historyMode />)
  // were removed 2026-06-16 with the dead historyMode branch — that path never
  // ran in the app (/alerts/history → AlertHistoryView). The live history surface
  // (AlertHistoryView) has no tests yet; that gap is pre-existing (these tests
  // exercised the dead twin) and tracked as a follow-up.

  it('keeps legacy degraded and failing source health out of the CPA Pulse surface', async () => {
    rpcMocks.listSourceHealthQueryFn.mockResolvedValue({
      sources: [
        source(),
        source({
          sourceId: 'fema.declarations',
          label: 'FEMA Declarations',
          tier: 'T2',
          healthStatus: 'failing',
        }),
      ],
    })

    await render(<AlertsListPage embedded />)

    await waitForText('No alerts right now')
    expect(document.body.textContent).not.toContain('Pulse source needs attention')
    expect(document.body.textContent).not.toContain('IRS Disaster Relief')
    expect(document.body.textContent).not.toContain('Review sources')
    expect(document.body.textContent).not.toContain('Pulse source checks degraded')
    expect(document.body.textContent).not.toContain('FEMA Declarations')
  })
})

describe('AlertsListPage triage zones', () => {
  it('shows the needs-action queue and the awareness digest together, with no mode toggle', async () => {
    const activeDetail = alertDetail()
    const reviewOnlyAlert = listAlert({
      id: '23232323-2323-4232-8232-232323232323',
      pulseId: '45454545-4545-4454-8454-454545454545',
      title: 'Review-only source update',
      changeKind: 'form_instruction',
      actionMode: 'review_only',
      firmImpact: 'review_only',
      matchedCount: 0,
      needsReviewCount: 0,
      applyReadiness: { status: 'not_applicable', missing: [] },
    })
    rpcMocks.listAlertsQueryFn.mockResolvedValue({
      alerts: [reviewOnlyAlert, activeDetail.alert],
      nextCursor: null,
    })
    rpcMocks.getDetailsBatchQueryFn.mockResolvedValue({ details: [activeDetail] })

    await render(<AlertsListPage embedded />)

    // 2026-06-21 (Yuqi): no mode to pick — both zones render by default. The
    // client-impacting alert lands in "Needs action"; the review-only alert in
    // the (expanded) "For your awareness" digest.
    await waitForText('Seeded CA relief')
    await waitForText('Review-only source update')
    expect(document.body.textContent).toContain('Needs action')
    expect(document.body.textContent).toContain('For your awareness')
    // The old Review/Active segment is gone.
    expect(document.querySelector('[aria-label="Alert work queue"]')).toBeNull()
  })
})

describe('AlertsListPage catchup rows in the stream', () => {
  it('renders catchup alerts as ordinary cards routed through the triage zones', async () => {
    // 2026-06-11 (owner): no separate "Already in effect" band — catchup rows
    // (origin='catchup') use the SAME cards and the same triage zones as live
    // rows. Their state-not-news semantics live entirely in the backend
    // (excluded from new-alert counters, no emails).
    const catchupShift = listAlert({
      id: '56565656-5656-4565-8565-565656565656',
      pulseId: '67676767-6767-4676-8676-676767676767',
      title: 'GA wildfire relief',
      origin: 'catchup',
      actionDeadline: '2026-08-20T00:00:00.000Z',
      matchedCount: 2,
    })
    const reviewOnlyCatchup = listAlert({
      id: '78787878-7878-4787-8787-787878787878',
      pulseId: '89898989-8989-4898-8898-898989898989',
      title: 'NY MFI computation change',
      origin: 'catchup',
      changeKind: 'filing_requirement',
      actionMode: 'review_only',
      firmImpact: 'review_only',
      matchedCount: 0,
      needsReviewCount: 0,
      actionDeadline: null,
      applyReadiness: { status: 'not_applicable', missing: [] },
    })
    rpcMocks.listAlertsQueryFn.mockResolvedValue({
      alerts: [reviewOnlyCatchup, catchupShift],
      nextCursor: null,
    })

    await render(<AlertsListPage embedded />)

    // Both catchup rows render by default — the deadline-shift in "Needs
    // action", the review-only in the awareness digest. No "Already in effect" band.
    await waitForText('GA wildfire relief')
    await waitForText('NY MFI computation change')
    expect(document.body.textContent).not.toContain('Already in effect')
  })
})

describe('AlertsListPage affected-client batching', () => {
  // 2026-06-05 (post-merge): rounds 70-85 reshaped the alert row
  // chrome — the i90PZ list-row layout shows count-only
  // ("Affects N clients") and dropped the per-row client-name
  // surface. Names render in the drawer instead. The visible-name
  // assertion was retired; the batch-fires-once + cache-seed
  // assertions are the structural contract this test still
  // protects (one round trip per page, drawer-open is a cache
  // hit not a re-fetch).
  it('fires exactly one batch and seeds each getDetail cache for instant drawer open', async () => {
    const detail = alertDetail()
    rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [detail.alert], nextCursor: null })
    rpcMocks.getDetailsBatchQueryFn.mockResolvedValue({ details: [detail] })

    const client = await render(<AlertsListPage embedded />)

    await selectActiveQueue()
    // Wait for the list to settle — the row chrome (count + conf%)
    // marks completion of the render pass that triggered the batch.
    await waitForText('Affects 1 client')
    expect(rpcMocks.getDetailsBatchQueryFn).toHaveBeenCalledTimes(1)

    // The drawer's per-alert getDetail cache is pre-seeded from the batch, so
    // opening the drawer is a cache hit instead of a re-fetch. The seeding runs
    // in an async effect that can flush after "Affects 1 client" renders, so
    // poll the cache rather than reading it once (avoids an intermittent null).
    await waitFor(() =>
      expect(client.getQueryData(['pulse', 'getDetail', { alertId: SEED_ALERT_ID }])).toEqual(
        detail,
      ),
    )
  })

  it('never fires per-row getDetail — rows render the date line from the batch-seeded cache', async () => {
    const detail = alertDetail()
    rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [detail.alert], nextCursor: null })
    rpcMocks.getDetailsBatchQueryFn.mockResolvedValue({ details: [detail] })

    await render(<AlertsListPage embedded />)

    await selectActiveQueue()
    await waitForText('Affects 1 client')
    // The disabled row observer re-renders when the batch seed lands — the
    // old→new due-date line is detail-only data, so its presence proves the
    // cache subscription works without a per-row fetch. Matched without the
    // year: dateShort drops it for current-year dates and appends it
    // otherwise (date-formatting-canon), so the bare month-day form is
    // present either way.
    await waitForText('Mar 15')
    expect(rpcMocks.getDetailQueryFn).not.toHaveBeenCalled()
    expect(rpcMocks.getDetailsBatchQueryFn).toHaveBeenCalledTimes(1)
  })
})

// 2026-06-05 (Yuqi post-merge call — "flat list, not Load More"):
// the AlertsListPage no longer paginates — main's keyset-based
// `useInfiniteQuery` + "Load more" button were reverted to a flat
// 50-item `useQuery` per surface. This describe block is
// `describe.skip`'d (rather than deleted) so a future engineer
// restoring pagination can see exactly what the contract was.
describe.skip('AlertsListPage load more', () => {
  it('appends the next keyset page and hides Load more once exhausted', async () => {
    const first = listAlert({ title: 'First relief', publishedAt: '2026-05-02T00:00:00.000Z' })
    const second = listAlert({
      id: '56565656-5656-4565-8565-565656565656',
      pulseId: '78787878-7878-4787-8787-787878787878',
      title: 'Second relief',
      publishedAt: '2026-05-01T00:00:00.000Z',
    })
    // Page 1 reports a further page; page 2 closes it out.
    rpcMocks.listAlertsQueryFn
      .mockResolvedValueOnce({ alerts: [first], nextCursor: 'cursor-2' })
      .mockResolvedValueOnce({ alerts: [second], nextCursor: null })

    await render(<AlertsListPage embedded />)

    await waitForText('First relief')
    expect(document.body.textContent).toContain('Load more')
    expect(document.body.textContent).not.toContain('Second relief')

    const loadMore = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Load more'),
    )
    expect(loadMore).toBeTruthy()
    await act(async () => {
      loadMore?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    await waitForText('Second relief')
    // nextCursor null on the second page → the control disappears.
    expect(document.body.textContent).not.toContain('Load more')
  })
})

describe('AlertsListPage tax area filter', () => {
  it('exposes the Tax area filter and renders alerts carrying derived tax areas', async () => {
    const detail = alertDetail()
    detail.alert.taxAreas = ['income_individual']
    rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [detail.alert] })
    rpcMocks.getDetailsBatchQueryFn.mockResolvedValue({ details: [detail] })

    await render(<AlertsListPage embedded />)
    await selectActiveQueue()

    // 2026-06-05 (merge with origin/main): the i90PZ row layout
    // from rounds 70-85 shows count-only ("Affects N clients"); the
    // per-row client-name surface main's version waited on
    // ("Seeded Client Co") moved to the drawer. Settling probe
    // updated to the count chip the new row chrome renders.
    await waitForText('Affects 1 client')
    // 2026-06-08 (Yuqi "fold the filter areas into filters to clean up the
    // space"): Severity / Change type / Tax area were consolidated into a
    // single "Filters" popover (AlertFiltersPopover). The Tax area control is
    // no longer an always-visible chip — it's a labeled section inside that
    // popover — so the exposed surface is the consolidated trigger.
    expect(document.querySelector('[aria-label="Filters"]')).not.toBeNull()
  })
})

// 2026-06-07 (Pencil g5kKJQ): the active /alerts list grows a
// bulk-select strip + per-row checkboxes + a floating bulk-action
// bar. History rows are already-handled, so they are NOT selectable
// (mirrors the existing history-mode dismiss suppression).
describe('AlertsListPage bulk selection (Pencil g5kKJQ)', () => {
  it('renders a per-row selection checkbox on the active surface', async () => {
    rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [listAlert()], nextCursor: null })

    await render(<AlertsListPage embedded />)
    await selectActiveQueue()

    await waitForText('Seeded CA relief')
    // 2026-06-08 (Yuqi "remove"): the "Select all · N dispatches"
    // BulkSelectStrip and its select-all checkbox were dropped as redundant
    // chrome (PulseAlertRow). Per-row checkboxes still drive bulk selection in
    // selectable mode (the floating BulkActionBar — exercised below — appears
    // once rows are picked), so there is no top "Select all" strip to assert.
    expect(document.querySelector('[aria-label="Select all alerts"]')).toBeNull()
    expect(document.querySelector('[aria-label="Select alert: Seeded CA relief"]')).not.toBeNull()
  })

  it('reveals the floating bulk-action bar once a row is selected', async () => {
    rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [listAlert()], nextCursor: null })

    await render(<AlertsListPage embedded />)
    await selectActiveQueue()

    await waitForText('Seeded CA relief')
    // No bar at rest.
    expect(document.querySelector('[aria-label="Bulk actions"]')).toBeNull()

    const rowCheckbox = document.querySelector<HTMLElement>(
      '[aria-label="Select alert: Seeded CA relief"]',
    )
    expect(rowCheckbox).not.toBeNull()
    await act(async () => {
      rowCheckbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // The BulkActionBar (`saDv7`) appears with the selection read-out
    // and the wired Dismiss action.
    await waitFor(() =>
      expect(document.querySelector('[aria-label="Bulk actions"]')).not.toBeNull(),
    )
    const bar = document.querySelector('[aria-label="Bulk actions"]')
    expect(bar?.textContent).toContain('1 selected')
    expect(bar?.textContent).toContain('Dismiss')
  })
})

describe('AlertsListPage status filter scope', () => {
  it('hides Status on the active surface (redundant with Severity)', async () => {
    rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts: [listAlert()], nextCursor: null })

    await render(<AlertsListPage embedded />)
    await selectActiveQueue()

    await waitForText('Seeded CA relief')
    expect(document.querySelector('[aria-label="Filter by alert status"]')).toBeNull()
  })
})

describe('AlertsListPage morning sweep override', () => {
  function SweepActivator() {
    const sweep = useMorningSweep()
    return <button type="button" aria-label="test-activate-sweep" onClick={() => sweep?.toggle()} />
  }

  function sweepAlerts() {
    const fresh = listAlert({
      id: '56565656-5656-4565-8565-565656565656',
      title: 'Fresh overnight relief',
      publishedAt: new Date(Date.now() - 3600_000).toISOString(),
    })
    const old = listAlert() // 2026-05-01 — far outside any 24h window
    return { fresh, old }
  }

  async function activateSweep() {
    const activator = document.querySelector('[aria-label="test-activate-sweep"]')
    expect(activator).toBeTruthy()
    await act(async () => {
      activator?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
  }

  async function renderSweepPage(alerts: PulseAlertPublic[]) {
    rpcMocks.listAlertsQueryFn.mockResolvedValue({ alerts, nextCursor: null })
    await render(
      <MorningSweepProvider>
        <SweepActivator />
        <AlertsListPage embedded />
      </MorningSweepProvider>,
    )
    await selectActiveQueue()
  }

  it('pins the list to the last-24h window and shows a dismissible sweep chip', async () => {
    const { fresh, old } = sweepAlerts()
    await renderSweepPage([fresh, old])
    await waitForText('Seeded CA relief')

    await activateSweep()

    await waitForText('Morning sweep · last 24h')
    expect(document.body.textContent).toContain('Fresh overnight relief')
    expect(document.body.textContent).not.toContain('Seeded CA relief')
    // The sweep counts as an active filter, so Clear filters renders.
    // (Label renamed from "Reset" in the 642fa31d consistency pass.)
    expect(
      Array.from(document.querySelectorAll('button')).some(
        (candidate) => candidate.textContent?.trim() === 'Clear filters',
      ),
    ).toBe(true)
  })

  it('chip Clear turns the override off', async () => {
    const { fresh, old } = sweepAlerts()
    await renderSweepPage([fresh, old])
    await activateSweep()
    await waitForText('Morning sweep · last 24h')

    const clear = document.querySelector('[aria-label="Clear morning sweep"]')
    expect(clear).toBeTruthy()
    await act(async () => {
      clear?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    await waitForText('Seeded CA relief')
    expect(document.body.textContent).not.toContain('Morning sweep · last 24h')
  })

  it('Clear filters clears the sweep override along with other filters', async () => {
    const { fresh, old } = sweepAlerts()
    await renderSweepPage([fresh, old])
    await activateSweep()
    await waitForText('Morning sweep · last 24h')

    // Label renamed from "Reset" in the 642fa31d consistency pass.
    const reset = Array.from(document.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Clear filters',
    )
    expect(reset).toBeTruthy()
    await act(async () => {
      reset?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    await waitForText('Seeded CA relief')
    expect(document.body.textContent).not.toContain('Morning sweep · last 24h')
  })

  it('sweep-empty window shows the window-aware empty state, not "caught up"', async () => {
    const { old } = sweepAlerts()
    await renderSweepPage([old])
    await waitForText('Seeded CA relief')

    await activateSweep()

    await waitForText('No alerts in the last 24 hours.')
    expect(document.body.textContent).toContain('Show all alerts')
    expect(document.body.textContent).not.toContain("you're caught up")

    const showAll = Array.from(document.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Show all alerts',
    )
    await act(async () => {
      showAll?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    await waitForText('Seeded CA relief')
  })
})
