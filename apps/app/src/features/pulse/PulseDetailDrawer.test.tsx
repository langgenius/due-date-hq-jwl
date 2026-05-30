import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import {
  DrawerActions,
  canApplyPulseDeadline,
  canRequestPulseReview,
  hasMissingDeadlineDetails,
  isNoActionReviewAlert,
} from './PulseDetailDrawer'

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
  onDismiss = vi.fn(),
  onSnooze = vi.fn(),
  onMarkReviewed = vi.fn(),
}: {
  onDismiss?: () => void
  onSnooze?: () => void
  onMarkReviewed?: () => void
}) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(
      <AppI18nProvider>
        <DrawerActions
          alertStatus="matched"
          sourceStatus="approved"
          selectionCount={0}
          actionMode="due_date_overlay"
          firmImpact="no_current_match"
          requiresDeadlineDetails={false}
          canApply
          canRevert
          canRequestReview={false}
          canApplyReviewed={false}
          reviewedSetReady={false}
          isMutating={false}
          onApply={() => {}}
          onMarkReviewed={onMarkReviewed}
          onApplyReviewed={() => {}}
          onDismiss={onDismiss}
          onSnooze={onSnooze}
          onRevert={() => {}}
          onReactivate={() => {}}
          onRequestReview={() => {}}
          onCopyDraft={() => {}}
        />
      </AppI18nProvider>,
    )
  })
}

describe('DrawerActions direct footer actions', () => {
  it('calls dismiss, snooze, and no-action review handlers without opening a reason field', () => {
    const onDismiss = vi.fn()
    const onSnooze = vi.fn()
    const onMarkReviewed = vi.fn()

    renderDrawerActions({ onDismiss, onSnooze, onMarkReviewed })

    clickButton('Dismiss')
    clickButton('Snooze 24h')
    clickButton('Mark reviewed')

    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onSnooze).toHaveBeenCalledTimes(1)
    expect(onMarkReviewed).toHaveBeenCalledTimes(1)
    expect(document.querySelector('#pulse-reason-text')).toBeNull()
    expect(document.body.textContent).not.toContain('Reason')
  })
})

describe('canRequestPulseReview', () => {
  it('allows preparers to request review for active Pulse alerts', () => {
    expect(
      canRequestPulseReview({
        role: 'preparer',
        alertStatus: 'matched',
        sourceStatus: 'approved',
      }),
    ).toBe(true)
  })

  it('keeps coordinators and managers out of the Preparer escalation CTA', () => {
    expect(
      canRequestPulseReview({
        role: 'coordinator',
        alertStatus: 'matched',
        sourceStatus: 'approved',
      }),
    ).toBe(false)
    expect(
      canRequestPulseReview({
        role: 'manager',
        alertStatus: 'matched',
        sourceStatus: 'approved',
      }),
    ).toBe(false)
  })

  it('does not allow requests for closed or source-revoked alerts', () => {
    expect(
      canRequestPulseReview({
        role: 'preparer',
        alertStatus: 'dismissed',
        sourceStatus: 'approved',
      }),
    ).toBe(false)
    expect(
      canRequestPulseReview({
        role: 'preparer',
        alertStatus: 'reverted',
        sourceStatus: 'approved',
      }),
    ).toBe(false)
    expect(
      canRequestPulseReview({
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
    expect(canApplyPulseDeadline(detail)).toBe(false)
  })

  it('allows ready due-date overlays and treats review-only alerts as not applicable', () => {
    expect(
      canApplyPulseDeadline({
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
    expect(canApplyPulseDeadline(detail)).toBe(false)
  })
})
