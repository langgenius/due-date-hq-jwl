import { describe, expect, it } from 'vitest'
import {
  canApplyPulseDeadline,
  canRequestPulseReview,
  hasMissingDeadlineDetails,
  isNoActionReviewAlert,
} from './PulseDetailDrawer'

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
