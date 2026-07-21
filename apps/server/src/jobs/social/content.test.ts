import { describe, expect, it } from 'vitest'
import {
  buildXAlertPost,
  validateSocialCandidate,
  weightedPostLength,
  type SocialAlertCandidate,
} from './content'

function candidate(overrides: Partial<SocialAlertCandidate> = {}): SocialAlertCandidate {
  return {
    pulseId: 'pulse-1',
    status: 'approved',
    isSample: false,
    agency: 'Internal Revenue Service',
    jurisdiction: 'Federal',
    forms: ['Form 1040', 'Form 4868'],
    entityTypes: ['individual'],
    changeKind: 'deadline_shift',
    sourceUrl: 'https://irs.gov/news/example',
    summary: 'The filing deadline moved after a declared disaster.',
    originalDueDate: new Date('2026-04-15T00:00:00.000Z'),
    newDueDate: new Date('2026-10-15T00:00:00.000Z'),
    effectiveFrom: null,
    effectiveUntil: null,
    actionDeadline: null,
    createdAt: new Date('2026-07-21T00:00:00.000Z'),
    ...overrides,
  }
}

describe('weightedPostLength', () => {
  it('uses the X fixed length for URLs', () => {
    expect(weightedPostLength('See https://example.com/a/very/long/path')).toBe(27)
  })

  it('normalizes composed text and counts emoji graphemes as two', () => {
    expect(weightedPostLength('cafe\u0301 👨‍👩‍👧‍👦')).toBe(7)
    expect(weightedPostLength('🇺🇸 1️⃣')).toBe(5)
  })

  it('counts CJK code points with weight two', () => {
    expect(weightedPostLength('Alert 税务')).toBe(10)
  })
})

describe('validateSocialCandidate', () => {
  it('accepts a source-backed approved production alert', () => {
    expect(validateSocialCandidate(candidate())).toEqual({ eligible: true })
  })

  it('rejects samples, internal alerts, missing dates, and possible PII', () => {
    const result = validateSocialCandidate(
      candidate({
        isSample: true,
        changeKind: 'rule_source_drift',
        originalDueDate: null,
        newDueDate: null,
        summary: 'Contact taxpayer@example.com',
      }),
    )
    expect(result).toEqual({
      eligible: false,
      reasons: [
        'sample_pulse',
        'internal_change_kind',
        'missing_relevant_date',
        'possible_email_address',
      ],
    })
  })

  it('rejects early-warning sources that only ask users to review rules', () => {
    expect(
      validateSocialCandidate(
        candidate({
          sourceId: 'fema.declarations',
          agency: 'fema.declarations',
          changeKind: 'other',
          originalDueDate: null,
          newDueDate: null,
          effectiveFrom: new Date('2026-07-12T00:00:00.000Z'),
        }),
      ),
    ).toEqual({ eligible: false, reasons: ['review_only_source'] })
  })

  it('uses entity types as scope when an alert has no form', () => {
    const input = candidate({ forms: [], entityTypes: ['Partnerships', 'S corporations'] })

    expect(validateSocialCandidate(input)).toEqual({ eligible: true })
    const built = buildXAlertPost(input, {
      appUrl: 'https://app.duedatehq.com',
      refToken: 'opaque-token-entity',
    })
    expect(built.teaser).toContain('Partnerships, S corporations')
  })
})
describe('buildXAlertPost', () => {
  it('builds stable gated copy with campaign attribution', () => {
    const result = buildXAlertPost(candidate(), {
      appUrl: 'https://app.duedatehq.com',
      refToken: 'opaque-token-1234',
    })

    expect(result.text).toContain('Internal Revenue Service · Federal alert')
    expect(result.text).toContain('Form 1040, Form 4868 · Deadline shift')
    expect(result.text).toContain('Apr 15, 2026 → Oct 15, 2026')
    expect(result.text).toContain('Which client deadlines may be affected?')
    expect(result.targetUrl).toBe(
      'https://app.duedatehq.com/alerts?ref=opaque-token-1234&utm_source=x&utm_medium=organic_social&utm_campaign=daily_alerts&utm_content=federal_deadline_shift',
    )
    expect(result.weightedLength).toBeLessThanOrEqual(280)
  })

  it('bounds long public fields without losing the CTA or URL', () => {
    const result = buildXAlertPost(
      candidate({
        agency: 'Department of Revenue and Taxation for an Extremely Long Official Agency Name',
        jurisdiction: 'An Extremely Long State and Local Jurisdiction Name',
        forms: ['A'.repeat(120), 'B'.repeat(120), 'C'.repeat(120)],
      }),
      { appUrl: 'https://app.duedatehq.com', refToken: 'opaque-token-5678' },
    )

    expect(result.text).toContain('…')
    expect(result.text).toContain('Which client deadlines may be affected?')
    expect(result.weightedLength).toBeLessThanOrEqual(280)
  })

  it('turns adapter source IDs into public agency copy', () => {
    const federal = buildXAlertPost(candidate({ agency: 'irs.disaster' }), {
      appUrl: 'https://app.duedatehq.com',
      refToken: 'opaque-token-9012',
    })
    const state = buildXAlertPost(
      candidate({ agency: 'oh.temporary_announcements', jurisdiction: 'Ohio' }),
      { appUrl: 'https://app.duedatehq.com', refToken: 'opaque-token-3456' },
    )

    expect(federal.text).toContain('IRS · Federal alert')
    expect(state.text).toContain('OH tax agency · Ohio alert')
  })
})
