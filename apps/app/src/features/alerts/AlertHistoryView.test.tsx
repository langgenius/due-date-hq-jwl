import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PulseAlertPublic, PulseFirmAlertStatus } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { AlertHistoryView } from './AlertHistoryView'

// History view reads ONE list (orpc.pulse.listHistory) plus the firm
// (orpc.firms.listMine, via useCurrentFirm → timezone). Everything else it
// renders is pure UI.
const rpcMocks = vi.hoisted(() => ({ listHistoryQueryFn: vi.fn() }))

vi.mock('@/lib/rpc', () => ({
  orpc: {
    firms: {
      listMine: {
        queryKey: () => ['firms', 'listMine'],
        queryOptions: () => ({ queryKey: ['firms', 'listMine'], queryFn: async () => [] }),
      },
    },
    pulse: {
      listHistory: {
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'listHistory', args?.input],
          queryFn: rpcMocks.listHistoryQueryFn,
        }),
      },
    },
  },
}))

// The drawer is rendered inline by the view but its behavior is covered by
// AlertDetailDrawer.test.tsx — stub it so these tests stay focused on the
// history view's own logic (stats / tabs / grouping / selection / search).
vi.mock('./AlertDetailDrawer', () => ({ AlertDetailDrawer: () => null }))

// DrawerProvider supplies the open/close handlers — hoist the spies so the
// row-open assertion can read them.
const drawerMocks = vi.hoisted(() => ({
  openDrawer: vi.fn(),
  closeDrawer: vi.fn(),
}))
vi.mock('./DrawerProvider', () => ({
  useAlertDrawer: () => ({
    alertId: null,
    openDrawer: drawerMocks.openDrawer,
    closeDrawer: drawerMocks.closeDrawer,
  }),
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function historyAlert(overrides: Partial<PulseAlertPublic> = {}): PulseAlertPublic {
  return {
    id: '12121212-1212-4121-8121-121212121212',
    pulseId: '34343434-3434-4343-8343-343434343434',
    status: 'applied',
    sourceStatus: 'approved',
    origin: 'live',
    actionDeadline: null,
    changeKind: 'deadline_shift',
    actionMode: 'due_date_overlay',
    firmImpact: 'matched',
    title: 'Handled CA relief',
    source: 'CA FTB',
    sourceUrl: 'https://example.com/source',
    summary: 'California posted deadline relief.',
    // Old enough to land in a month band (not "this week").
    publishedAt: '2026-03-10T00:00:00.000Z',
    dismissedAt: null,
    appliedAt: '2026-03-11T00:00:00.000Z',
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

// One alert per outcome bucket, with distinct titles so tab filtering is
// observable. `reviewed` counts only toward Handled (no dedicated tab/stat).
function mixedHistory(): PulseAlertPublic[] {
  const make = (n: number, status: PulseFirmAlertStatus, title: string): PulseAlertPublic =>
    historyAlert({
      id: `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}`,
      status,
      title,
    })
  return [
    make(1, 'applied', 'Applied form change'),
    make(2, 'partially_applied', 'Partly applied shift'),
    make(3, 'dismissed', 'Dismissed noise'),
    make(4, 'reverted', 'Reverted by mistake'),
    make(5, 'matched', 'Expired deadline pass'),
    make(6, 'reviewed', 'Reviewed only update'),
  ]
}

async function renderView(children: ReactNode, initialEntry = '/alerts/history') {
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

function tabButton(label: string): HTMLButtonElement | undefined {
  const group = document.querySelector('[aria-label="Filter handled alerts"]')
  return Array.from(group?.querySelectorAll('button') ?? []).find((b) =>
    b.textContent?.startsWith(label),
  )
}

async function clickTab(label: string): Promise<void> {
  const button = tabButton(label)
  expect(button, `tab "${label}" should exist`).toBeTruthy()
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
  })
}

async function typeSearch(value: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>(
    'input[placeholder="Filter handled alerts"]',
  )
  expect(input).toBeTruthy()
  // React overrides the input's value setter to track controlled state, so
  // assigning `input.value` directly won't fire onChange — reach the native
  // prototype setter and invoke it, then dispatch the input event React listens
  // for. Invoked inline (not stored) to avoid an unbound-method reference.
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
  await act(async () => {
    descriptor?.set?.call(input, value)
    input?.dispatchEvent(new Event('input', { bubbles: true }))
    await Promise.resolve()
  })
}

beforeEach(() => {
  bootstrapI18n()
  drawerMocks.openDrawer.mockReset()
  drawerMocks.closeDrawer.mockReset()
  rpcMocks.listHistoryQueryFn.mockReset()
  rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: [], nextCursor: null })
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

describe('AlertHistoryView stats + tab counts', () => {
  it('derives the StatBand and per-tab counts from the loaded history', async () => {
    rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: mixedHistory(), nextCursor: null })

    await renderView(<AlertHistoryView />)
    await waitForText('Applied form change')

    // StatBand renders off the real list (no faked aggregate).
    const band = document.querySelector('[aria-label="Handled alerts summary"]')
    expect(band?.textContent).toContain('Handled')

    // Counts ride each tab (Segmented `count`): applied + partially_applied → 2,
    // matched → Expired 1, reviewed only swells the All total (6).
    expect(tabButton('All')?.textContent).toContain('6')
    expect(tabButton('Applied')?.textContent).toContain('2')
    expect(tabButton('Dismissed')?.textContent).toContain('1')
    expect(tabButton('Reverted')?.textContent).toContain('1')
    expect(tabButton('Expired')?.textContent).toContain('1')
  })
})

describe('AlertHistoryView tab filtering', () => {
  it('shows applied + partially_applied under the Applied tab', async () => {
    rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: mixedHistory(), nextCursor: null })

    await renderView(<AlertHistoryView />)
    await waitForText('Applied form change')

    await clickTab('Applied')

    await waitFor(() => {
      expect(document.body.textContent).toContain('Applied form change')
      expect(document.body.textContent).toContain('Partly applied shift')
      expect(document.body.textContent).not.toContain('Dismissed noise')
      expect(document.body.textContent).not.toContain('Reverted by mistake')
      expect(document.body.textContent).not.toContain('Expired deadline pass')
    })
  })

  it('maps the Expired tab to aged-out matched alerts', async () => {
    rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: mixedHistory(), nextCursor: null })

    await renderView(<AlertHistoryView />)
    await waitForText('Applied form change')

    await clickTab('Expired')

    await waitFor(() => {
      expect(document.body.textContent).toContain('Expired deadline pass')
      expect(document.body.textContent).not.toContain('Applied form change')
      expect(document.body.textContent).not.toContain('Dismissed noise')
    })
  })
})

describe('AlertHistoryView search', () => {
  it('filters rows by title / source substring', async () => {
    rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: mixedHistory(), nextCursor: null })

    await renderView(<AlertHistoryView />)
    await waitForText('Applied form change')

    await typeSearch('dismissed')

    await waitFor(() => {
      expect(document.body.textContent).toContain('Dismissed noise')
      expect(document.body.textContent).not.toContain('Applied form change')
      expect(document.body.textContent).not.toContain('Reverted by mistake')
    })
  })
})

describe('AlertHistoryView grouping', () => {
  it('buckets rows into a THIS WEEK band and a month band', async () => {
    // Bands bucket by the HANDLED date (appliedAt here), not publishedAt — a
    // just-handled alert files under THIS WEEK even when the underlying
    // change was published months ago.
    const recent = historyAlert({
      id: '99999999-9999-4999-8999-999999999999',
      title: 'Fresh handled alert',
      // Published months ago, applied ~2 days ago — must land in THIS WEEK.
      publishedAt: '2026-03-10T00:00:00.000Z',
      appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const old = historyAlert({
      id: '88888888-8888-4888-8888-888888888888',
      title: 'Old handled alert',
      publishedAt: '2026-01-10T00:00:00.000Z',
      appliedAt: '2026-01-15T00:00:00.000Z',
    })
    rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: [recent, old], nextCursor: null })

    await renderView(<AlertHistoryView />)
    await waitForText('Fresh handled alert')

    expect(document.body.textContent).toContain('THIS WEEK')
    // Month band is the uppercased firm-local month/year of the old alert.
    expect(document.body.textContent).toContain('JANUARY 2026')
    expect(document.body.textContent).toContain('Old handled alert')
  })
})

describe('AlertHistoryView empty + loading states', () => {
  it('shows the empty state when nothing matches', async () => {
    rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: [], nextCursor: null })

    await renderView(<AlertHistoryView />)

    await waitForText('No handled alerts match this view.')
  })

  it('shows the loading state while history is in flight', async () => {
    // Never resolves → query stays in `isLoading`.
    rpcMocks.listHistoryQueryFn.mockReturnValue(new Promise(() => {}))

    await renderView(<AlertHistoryView />)

    await waitForText('Loading handled alerts')
  })
})

describe('AlertHistoryView row interactions', () => {
  it('opens the detail drawer when a row is clicked', async () => {
    const alert = historyAlert({ id: '77777777-7777-4777-8777-777777777777', title: 'Click me' })
    rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: [alert], nextCursor: null })

    await renderView(<AlertHistoryView />)
    await waitForText('Click me')

    const row = document.querySelector<HTMLElement>('[aria-label="Alert: Click me"]')
    expect(row).toBeTruthy()
    await act(async () => {
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(drawerMocks.openDrawer).toHaveBeenCalledWith('77777777-7777-4777-8777-777777777777')
  })

  it('renders no selection checkboxes or bulk bar (removed dead chrome)', async () => {
    // 2026-07-02 audit: the selection column + "N selected" bulk bar shipped
    // with ZERO bulk actions, so the whole selection layer was removed —
    // honest UI over dead chrome. Guard against it re-appearing without
    // actions attached.
    const alert = historyAlert({ id: '66666666-6666-4666-8666-666666666666', title: 'Pick me' })
    rpcMocks.listHistoryQueryFn.mockResolvedValue({ alerts: [alert], nextCursor: null })

    await renderView(<AlertHistoryView />)
    await waitForText('Pick me')

    expect(document.querySelector('[aria-label="Select alert: Pick me"]')).toBeNull()
    expect(document.querySelector('[aria-label="Select all"]')).toBeNull()
    expect(document.body.textContent).not.toContain('alert selected')
  })
})
