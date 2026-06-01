import { describe, expect, it } from 'vitest'
import {
  CLOSED_OBLIGATION_STATUSES,
  OBLIGATION_STATUS_DISPLAY_KEYS,
  OPEN_OBLIGATION_STATUSES,
  allowedObligationTargets,
  deriveObligationReadiness,
  defaultReadinessForStatus,
  isClosedObligationStatus,
  isLegalEfileTransition,
  isLegalObligationTransition,
  isOpenObligationStatus,
  type ObligationStatus,
} from './index'

describe('isLegalEfileTransition (P0 signature loop)', () => {
  it('allows the signature-loop step authorization_requested → authorization_signed', () => {
    expect(isLegalEfileTransition('authorization_requested', 'authorization_signed')).toBe(true)
  })

  it('treats a same-state transition as legal (no-op)', () => {
    expect(isLegalEfileTransition('authorization_requested', 'authorization_requested')).toBe(true)
  })

  it('rejects skipping ahead from authorization_requested straight to accepted', () => {
    expect(isLegalEfileTransition('authorization_requested', 'accepted')).toBe(false)
  })

  it('treats final_package_delivered as terminal', () => {
    expect(isLegalEfileTransition('final_package_delivered', 'submitted')).toBe(false)
  })
})

describe('obligation workflow state model', () => {
  it('classifies open and closed statuses', () => {
    expect(OPEN_OBLIGATION_STATUSES).toEqual([
      'pending',
      'in_progress',
      'waiting_on_client',
      'review',
      'blocked',
    ])
    expect(CLOSED_OBLIGATION_STATUSES).toEqual([
      'done',
      'extended',
      'paid',
      'not_applicable',
      'completed',
    ])

    expect(isOpenObligationStatus('pending')).toBe(true)
    expect(isOpenObligationStatus('paid')).toBe(false)
    expect(isClosedObligationStatus('extended')).toBe(true)
    expect(isClosedObligationStatus('review')).toBe(false)
  })

  it('keeps DB wire status decoupled from display semantics', () => {
    expect(OBLIGATION_STATUS_DISPLAY_KEYS).toMatchObject({
      pending: 'not_started',
      review: 'needs_review',
      done: 'filed',
    })
  })

  it('derives default readiness without blocking corrective transitions', () => {
    const defaults: Record<ObligationStatus, ReturnType<typeof defaultReadinessForStatus>> = {
      pending: defaultReadinessForStatus('pending', undefined),
      in_progress: defaultReadinessForStatus('in_progress', 'needs_review'),
      waiting_on_client: defaultReadinessForStatus('waiting_on_client', 'ready'),
      review: defaultReadinessForStatus('review', 'ready'),
      done: defaultReadinessForStatus('done', 'waiting'),
      extended: defaultReadinessForStatus('extended', 'waiting'),
      paid: defaultReadinessForStatus('paid', 'needs_review'),
      not_applicable: defaultReadinessForStatus('not_applicable', 'needs_review'),
      blocked: defaultReadinessForStatus('blocked', 'needs_review'),
      completed: defaultReadinessForStatus('completed', 'waiting'),
    }

    expect(defaults).toEqual({
      pending: 'ready',
      in_progress: 'needs_review',
      waiting_on_client: 'waiting',
      review: 'needs_review',
      done: 'ready',
      extended: 'ready',
      paid: 'ready',
      not_applicable: 'ready',
      blocked: 'needs_review',
      completed: 'ready',
    })
  })

  it('derives readiness from status plus the latest readiness portal state', () => {
    expect(deriveObligationReadiness({ status: 'pending' })).toBe('ready')
    expect(deriveObligationReadiness({ status: 'waiting_on_client' })).toBe('waiting')
    expect(deriveObligationReadiness({ status: 'review' })).toBe('needs_review')
    expect(deriveObligationReadiness({ status: 'paid', responseStatuses: ['need_help'] })).toBe(
      'ready',
    )
    expect(deriveObligationReadiness({ status: 'in_progress', requestStatus: 'sent' })).toBe(
      'waiting',
    )
    expect(
      deriveObligationReadiness({
        status: 'in_progress',
        requestStatus: 'responded',
        responseStatuses: ['ready', 'ready'],
      }),
    ).toBe('ready')
    expect(
      deriveObligationReadiness({
        status: 'in_progress',
        requestStatus: 'responded',
        responseStatuses: ['ready', 'not_yet'],
      }),
    ).toBe('waiting')
    expect(
      deriveObligationReadiness({
        status: 'in_progress',
        requestStatus: 'responded',
        responseStatuses: ['need_help'],
      }),
    ).toBe('needs_review')
  })

  describe('lifecycle v2 transition matrix', () => {
    it('treats no-op transitions as always legal', () => {
      expect(isLegalObligationTransition('pending', 'pending')).toBe(true)
      expect(isLegalObligationTransition('completed', 'completed')).toBe(true)
    })

    it("enforces 'Filed ≠ Done' — completed only follows done or paid", () => {
      // Blocked jumps from open states straight to completed.
      expect(isLegalObligationTransition('pending', 'completed')).toBe(false)
      expect(isLegalObligationTransition('waiting_on_client', 'completed')).toBe(false)
      expect(isLegalObligationTransition('blocked', 'completed')).toBe(false)
      expect(isLegalObligationTransition('in_progress', 'completed')).toBe(false)
      expect(isLegalObligationTransition('review', 'completed')).toBe(false)
      expect(isLegalObligationTransition('extended', 'completed')).toBe(false)
      expect(isLegalObligationTransition('not_applicable', 'completed')).toBe(false)
      // Legitimate paths to completed.
      expect(isLegalObligationTransition('done', 'completed')).toBe(true)
      expect(isLegalObligationTransition('paid', 'completed')).toBe(true)
    })

    it('keeps completed as terminal (no manual transitions out)', () => {
      expect(allowedObligationTargets('completed')).toEqual([])
      expect(isLegalObligationTransition('completed', 'pending')).toBe(false)
      expect(isLegalObligationTransition('completed', 'review')).toBe(false)
    })

    it('supports rejection unwind from filed back to in-review', () => {
      expect(isLegalObligationTransition('done', 'review')).toBe(true)
      expect(isLegalObligationTransition('done', 'waiting_on_client')).toBe(true)
    })

    it('keeps legacy in_progress transitions permissive for migration', () => {
      const targets = allowedObligationTargets('in_progress')
      // Every non-completed target is reachable so legacy rows can
      // migrate forward into the v2 vocabulary.
      expect(targets).toContain('pending')
      expect(targets).toContain('review')
      expect(targets).toContain('done')
      expect(targets).not.toContain('completed')
    })
  })
})
