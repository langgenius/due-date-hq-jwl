import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PulseFirmAlertStatus } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { DrawerActions } from './AlertDetailDrawer'
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
}: {
  onMarkReviewed?: () => void
  alertStatus?: PulseFirmAlertStatus
}) {
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
