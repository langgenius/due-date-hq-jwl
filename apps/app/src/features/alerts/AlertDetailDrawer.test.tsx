import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PulseAlertPublic, PulseDetail, PulseFirmAlertStatus } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { AlertDetailDrawer, DrawerActions } from './AlertDetailDrawer'

const rpcMocks = vi.hoisted(() => ({
  getDetailQueryFn: vi.fn(),
  dismissMutationFn: vi.fn(),
  applyMutationFn: vi.fn(),
  markReviewedMutationFn: vi.fn(),
}))

type MutationOpts = Record<string, unknown>

vi.mock('@/lib/rpc', () => ({
  orpc: {
    audit: { key: () => ['audit'] },
    calendar: { key: () => ['calendar'] },
    dashboard: { load: { key: () => ['dashboard', 'load'] } },
    notifications: { key: () => ['notifications'] },
    obligations: { key: () => ['obligations'] },
    reminders: { key: () => ['reminders'] },
    workload: { key: () => ['workload'] },
    firms: {
      listMine: {
        queryKey: () => ['firms', 'listMine'],
        queryOptions: () => ({
          queryKey: ['firms', 'listMine'],
          queryFn: async () => [],
        }),
      },
    },
    rules: {
      listRules: {
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['rules', 'listRules', args.input],
          queryFn: async () => [],
        }),
      },
    },
    pulse: {
      key: () => ['pulse'],
      getDetail: {
        queryKey: (args: { input: unknown }) => ['pulse', 'getDetail', args.input],
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'getDetail', args.input],
          queryFn: rpcMocks.getDetailQueryFn,
        }),
      },
      listPriorityQueue: {
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'listPriorityQueue', args.input],
          queryFn: async () => ({ items: [] }),
        }),
      },
      listAlertNotes: {
        queryKey: (args: { input: unknown }) => ['pulse', 'listAlertNotes', args.input],
        queryOptions: (args: { input: unknown }) => ({
          queryKey: ['pulse', 'listAlertNotes', args.input],
          queryFn: async () => ({ notes: [] }),
        }),
      },
      apply: {
        mutationOptions: (opts: MutationOpts) => ({
          ...opts,
          mutationFn: rpcMocks.applyMutationFn,
        }),
      },
      applyReviewed: {
        mutationOptions: (opts: MutationOpts) => ({ ...opts, mutationFn: vi.fn() }),
      },
      dismiss: {
        mutationOptions: (opts: MutationOpts) => ({
          ...opts,
          mutationFn: rpcMocks.dismissMutationFn,
        }),
      },
      markReviewed: {
        mutationOptions: (opts: MutationOpts) => ({
          ...opts,
          mutationFn: rpcMocks.markReviewedMutationFn,
        }),
      },
      reactivate: { mutationOptions: (opts: MutationOpts) => ({ ...opts, mutationFn: vi.fn() }) },
      requestReview: {
        mutationOptions: (opts: MutationOpts) => ({ ...opts, mutationFn: vi.fn() }),
      },
      revert: { mutationOptions: (opts: MutationOpts) => ({ ...opts, mutationFn: vi.fn() }) },
      reviewPriorityMatches: {
        mutationOptions: (opts: MutationOpts) => ({ ...opts, mutationFn: vi.fn() }),
      },
      addAlertNote: { mutationOptions: (opts: MutationOpts) => ({ ...opts, mutationFn: vi.fn() }) },
    },
  },
}))
import {
  canApplyAlertDeadline,
  canRequestAlertReview,
  hasMissingDeadlineDetails,
  isNoActionReviewAlert,
} from './lib/alert-permissions'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  bootstrapI18n()
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

function clickButton(label: string) {
  const button = Array.from(document.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(button).toBeTruthy()
  act(() => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function renderDrawerActions({
  onMarkReviewed = vi.fn(),
  alertStatus = 'matched',
  ...overrides
}: {
  onMarkReviewed?: () => void
  alertStatus?: PulseFirmAlertStatus
} & Partial<Parameters<typeof DrawerActions>[0]>) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <DrawerActions
          alertStatus={alertStatus}
          sourceStatus="approved"
          selectionCount={0}
          actionMode="due_date_overlay"
          firmImpact="no_current_match"
          requiresDeadlineDetails={false}
          appliedAt={null}
          canApply
          canRevert
          canRequestReview={false}
          canApplyReviewed={false}
          canDismiss={false}
          reviewedSetReady={false}
          reverifyIncomplete={false}
          isMutating={false}
          onApply={() => {}}
          onMarkReviewed={onMarkReviewed}
          onApplyReviewed={() => {}}
          onRevert={() => {}}
          onReactivate={() => {}}
          onRequestReview={() => {}}
          onCopyDraft={() => {}}
          onDismiss={() => {}}
          onClose={() => {}}
          {...overrides}
        />
      </AppI18nProvider>,
    )
  })
}

describe('DrawerActions direct footer actions', () => {
  it('fires the no-action review handler without a reason field and no longer renders Dismiss/Snooze', () => {
    const onMarkReviewed = vi.fn()

    renderDrawerActions({ onMarkReviewed })

    clickButton('Mark reviewed')

    expect(onMarkReviewed).toHaveBeenCalledTimes(1)
    const buttonLabels = Array.from(document.querySelectorAll('button')).map((button) =>
      button.textContent?.trim(),
    )
    expect(buttonLabels).not.toContain('Dismiss')
    expect(buttonLabels).not.toContain('Snooze 24h')
    expect(document.querySelector('#pulse-reason-text')).toBeNull()
    expect(document.body.textContent).not.toContain('Reason')
  })

  it('post-apply success state persists with Review next / Copy draft / Close (no auto-close)', () => {
    // 2026-07-02 UX-flow audit: apply used to auto-close the panel in ~600ms,
    // swallowing the follow-ups. The success state now stays until the user acts.
    const onReviewNext = vi.fn()
    const onClose = vi.fn()
    const onCopyDraft = vi.fn()

    renderDrawerActions({
      applied: true,
      appliedCount: 3,
      alertStatus: 'applied',
      onReviewNext,
      onClose,
      onCopyDraft,
    })

    expect(document.body.textContent).toContain('Applied to 3 clients')
    clickButton('Copy client email draft')
    expect(onCopyDraft).toHaveBeenCalledTimes(1)
    clickButton('Review next alert')
    expect(onReviewNext).toHaveBeenCalledTimes(1)
    clickButton('Close')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('post-apply success state on the last alert offers Close as the forward action', () => {
    const onClose = vi.fn()

    renderDrawerActions({
      applied: true,
      appliedCount: 1,
      alertStatus: 'applied',
      onReviewNext: null,
      onClose,
    })

    expect(document.body.textContent).toContain('Applied to 1 client')
    const labels = Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim())
    expect(labels).not.toContain('Review next alert')
    clickButton('Close')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows a disabled "Reviewed" state (not an actionable "Mark reviewed") for an already-reviewed alert', () => {
    renderDrawerActions({ alertStatus: 'reviewed' })

    const buttons = Array.from(document.querySelectorAll('button'))
    const reviewed = buttons.find((button) => button.textContent?.trim() === 'Reviewed')
    expect(reviewed).toBeTruthy()
    expect(reviewed?.disabled).toBe(true)
    // The actionable "Mark reviewed" CTA must be gone in history.
    expect(buttons.some((button) => button.textContent?.trim() === 'Mark reviewed')).toBe(false)
  })
})

describe('canRequestAlertReview', () => {
  it('allows preparers to request review for active Alerts', () => {
    expect(
      canRequestAlertReview({
        role: 'preparer',
        alertStatus: 'matched',
        sourceStatus: 'approved',
      }),
    ).toBe(true)
  })

  it('keeps coordinators and managers out of the Preparer escalation CTA', () => {
    expect(
      canRequestAlertReview({
        role: 'coordinator',
        alertStatus: 'matched',
        sourceStatus: 'approved',
      }),
    ).toBe(false)
    expect(
      canRequestAlertReview({
        role: 'manager',
        alertStatus: 'matched',
        sourceStatus: 'approved',
      }),
    ).toBe(false)
  })

  it('does not allow requests for closed or source-revoked alerts', () => {
    expect(
      canRequestAlertReview({
        role: 'preparer',
        alertStatus: 'dismissed',
        sourceStatus: 'approved',
      }),
    ).toBe(false)
    expect(
      canRequestAlertReview({
        role: 'preparer',
        alertStatus: 'reverted',
        sourceStatus: 'approved',
      }),
    ).toBe(false)
    expect(
      canRequestAlertReview({
        role: 'preparer',
        alertStatus: 'matched',
        sourceStatus: 'source_revoked',
      }),
    ).toBe(false)
  })
})

describe('Pulse due-date apply readiness helpers', () => {
  it('requires details before applying incomplete due-date overlays', () => {
    const detail = {
      alert: { actionMode: 'due_date_overlay' as const, firmImpact: 'matched' as const },
      applyReadiness: {
        status: 'needs_details' as const,
        missing: ['affected_clients' as const],
      },
    }

    expect(hasMissingDeadlineDetails(detail)).toBe(true)
    expect(canApplyAlertDeadline(detail)).toBe(false)
  })

  it('allows ready due-date overlays and treats review-only alerts as not applicable', () => {
    expect(
      canApplyAlertDeadline({
        alert: { actionMode: 'due_date_overlay', firmImpact: 'matched' },
        applyReadiness: { status: 'ready', missing: [] },
      }),
    ).toBe(true)
    expect(
      hasMissingDeadlineDetails({
        alert: { actionMode: 'review_only', firmImpact: 'review_only' },
        applyReadiness: { status: 'not_applicable', missing: [] },
      }),
    ).toBe(false)
  })

  it('treats no-current-match due-date overlays as review/no-action alerts', () => {
    const detail = {
      alert: { actionMode: 'due_date_overlay' as const, firmImpact: 'no_current_match' as const },
      applyReadiness: {
        status: 'needs_details' as const,
        missing: ['affected_clients' as const],
      },
    }

    expect(isNoActionReviewAlert(detail)).toBe(true)
    expect(hasMissingDeadlineDetails(detail)).toBe(false)
    expect(canApplyAlertDeadline(detail)).toBe(false)
  })
})

const SEED_ALERT_ID = '12121212-1212-4121-8121-121212121212'

function hotkeyAlert(): PulseAlertPublic {
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
  }
}

function hotkeyDetail(): PulseDetail {
  return {
    alert: hotkeyAlert(),
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

async function pressKey(key: string, target?: Element | null) {
  // Async act flush: mutations fire their mutationFn on a microtask after
  // `mutate()`, and Base UI state updates settle the same way.
  await act(async () => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true })
    if (target) target.dispatchEvent(event)
    else window.dispatchEvent(event)
    await Promise.resolve()
  })
}

async function renderHotkeyDrawer({
  onPrev = vi.fn(),
  onNext = vi.fn(),
}: { onPrev?: () => void; onNext?: () => void } = {}) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // useAlertPermissions reads the firm role from this cache entry; 'owner'
  // unlocks apply/dismiss so the hotkeys are live.
  client.setQueryData(
    ['firms', 'listMine'],
    [
      {
        id: 'firm-1',
        name: 'Test Firm',
        isCurrent: true,
        role: 'owner',
        plan: 'pro',
        coordinatorCanSeeDollars: false,
      },
    ],
  )

  await act(async () => {
    root?.render(
      <MemoryRouter initialEntries={['/alerts']}>
        <QueryClientProvider client={client}>
          <AppI18nProvider>
            <AlertDetailDrawer
              alertId={SEED_ALERT_ID}
              mode="panel"
              onClose={vi.fn()}
              onPrev={onPrev}
              onNext={onNext}
              position={{ index: 0, total: 3 }}
            />
          </AppI18nProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })
  await waitForText('Seeded CA relief')
  return { onPrev, onNext }
}

describe('AlertDetailDrawer hotkeys behind modal layers', () => {
  beforeEach(() => {
    rpcMocks.getDetailQueryFn.mockReset()
    rpcMocks.dismissMutationFn.mockReset()
    rpcMocks.applyMutationFn.mockReset()
    rpcMocks.markReviewedMutationFn.mockReset()
    rpcMocks.getDetailQueryFn.mockResolvedValue(hotkeyDetail())
    rpcMocks.dismissMutationFn.mockResolvedValue({})
    rpcMocks.applyMutationFn.mockResolvedValue({})
    rpcMocks.markReviewedMutationFn.mockResolvedValue({})
  })

  it('fires dismiss on D when only the drawer is open', async () => {
    await renderHotkeyDrawer()

    await pressKey('d')

    expect(rpcMocks.dismissMutationFn).toHaveBeenCalledTimes(1)
  })

  it('ignores D while the apply-verification dialog is open', async () => {
    await renderHotkeyDrawer()

    await pressKey('a')
    await waitForText('Verify the new deadline before applying')
    const dialog = document.querySelector('[data-slot="dialog-content"]')
    expect(dialog).not.toBeNull()

    // Reproduce the audit path: the event bubbles from the focusable
    // checkbox control inside the dialog (Base UI renders a span with
    // role="checkbox"; the #id sits on its hidden mirror input), which the
    // INPUT/TEXTAREA target guard never catches.
    await pressKey(
      'd',
      document.querySelector('[data-slot="dialog-content"] [data-slot="checkbox"]'),
    )

    expect(rpcMocks.dismissMutationFn).not.toHaveBeenCalled()
    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
  })

  it('keeps the verified checkbox ticked when A is pressed behind the dialog', async () => {
    await renderHotkeyDrawer()

    await pressKey('a')
    await waitForText('Verify the new deadline before applying')
    const checkbox = document.querySelector('[data-slot="dialog-content"] [data-slot="checkbox"]')
    expect(checkbox).not.toBeNull()
    await act(async () => {
      // Base UI's checkbox toggles on the keyboard path in happy-dom; a bare
      // synthetic MouseEvent lacks the pointer fields its click handler reads.
      checkbox?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      checkbox?.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }))
      await Promise.resolve()
    })
    expect(checkbox?.getAttribute('aria-checked')).toBe('true')

    await pressKey('a', checkbox)

    expect(checkbox?.getAttribute('aria-checked')).toBe('true')
    expect(document.querySelectorAll('[data-slot="dialog-content"]')).toHaveLength(1)
  })

  it('ignores ArrowUp/ArrowDown paging while a modal dialog is open', async () => {
    const { onNext } = await renderHotkeyDrawer()

    await pressKey('ArrowDown')
    expect(onNext).toHaveBeenCalledTimes(1)

    await pressKey('a')
    await waitForText('Verify the new deadline before applying')

    await pressKey('ArrowDown')
    await pressKey('ArrowUp')
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})
