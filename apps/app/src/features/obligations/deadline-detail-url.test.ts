import { describe, expect, it } from 'vitest'

import {
  cleanDeadlineDetailSearch,
  deadlineDetailHref,
  deadlineDetailPath,
  deadlineRefFromObligationId,
  findObligationIdByDeadlineRef,
  isDeadlineQueuePath,
  normalizeDeadlineDetailTab,
  normalizeDeadlineRef,
  obligationIdMatchesDeadlineRef,
} from './deadline-detail-url'

describe('deadline-detail-url', () => {
  const obligationId = '23000000-0000-4000-8000-000000000006'

  it('builds short deadline detail paths from obligation ids', () => {
    expect(deadlineRefFromObligationId(obligationId)).toBe('000000000006')
    expect(deadlineDetailPath(obligationId)).toBe('/deadlines/000000000006')
    expect(deadlineDetailPath(obligationId, 'evidence')).toBe('/deadlines/000000000006/evidence')
  })

  it('drops legacy drawer params while preserving queue filters', () => {
    expect(
      cleanDeadlineDetailSearch(
        '?status=review&row=230&id=230&drawer=obligation&tab=readiness&sort=due_desc',
      ),
    ).toBe('?status=review&sort=due_desc')
    expect(deadlineDetailHref({ obligationId, tab: 'audit', search: '?status=blocked' })).toBe(
      '/deadlines/000000000006/audit?status=blocked',
    )
  })

  it('resolves a unique short ref and rejects invalid or ambiguous refs', () => {
    const obligations = [
      { id: obligationId },
      { id: '33000000-0000-4000-8000-000000000007' },
      { id: '43000000-0000-4000-8000-000000000006' },
    ]

    expect(normalizeDeadlineRef('000000000006')).toBe('000000000006')
    expect(normalizeDeadlineRef('not-a-ref')).toBeNull()
    expect(obligationIdMatchesDeadlineRef(obligationId, '000000000006')).toBe(true)
    expect(findObligationIdByDeadlineRef(obligations.slice(0, 2), '000000000006')).toBe(
      obligationId,
    )
    expect(findObligationIdByDeadlineRef(obligations, '000000000006')).toBeNull()
  })

  it('recognizes supported detail tabs and queue paths', () => {
    expect(normalizeDeadlineDetailTab('summary')).toBe('summary')
    expect(normalizeDeadlineDetailTab('readiness')).toBe('readiness')
    expect(normalizeDeadlineDetailTab('materials')).toBeNull()
    expect(isDeadlineQueuePath('/deadlines')).toBe(true)
    expect(isDeadlineQueuePath('/deadlines/000000000006')).toBe(true)
    expect(isDeadlineQueuePath('/deadlines/calendar')).toBe(false)
  })
})
