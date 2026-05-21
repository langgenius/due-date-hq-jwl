import { describe, expect, it } from 'vitest'
import { generateReadinessDocumentChecklist } from './index'

describe('readiness document checklist templates', () => {
  it('generates individual return documents from 1040 tax types', () => {
    const checklist = generateReadinessDocumentChecklist({ taxType: 'federal_1040' })

    expect(checklist.map((item) => item.id)).toEqual([
      'income-forms',
      'brokerage-statements',
      'deduction-support',
      'schedule-c-records',
      'k1-packages',
    ])
  })

  it('distinguishes 1120-S from 1120 before corporate matching', () => {
    const sCorp = generateReadinessDocumentChecklist({ taxType: 'federal_1120s' })
    const cCorp = generateReadinessDocumentChecklist({ taxType: 'federal_1120' })

    expect(sCorp.map((item) => item.id)).toContain('shareholder-basis-ownership')
    expect(cCorp.map((item) => item.id)).toContain('balance-sheet-support')
  })

  it('covers information and foreign reporting filings', () => {
    expect(
      generateReadinessDocumentChecklist({ taxType: 'federal_1099_nec' }).map((item) => item.id),
    ).toContain('w9-tin-support')
    expect(
      generateReadinessDocumentChecklist({ taxType: 'federal_fbar' }).map((item) => item.id),
    ).toContain('foreign-account-list')
  })

  it('falls back to a generic document list for unknown tax types', () => {
    const checklist = generateReadinessDocumentChecklist({ taxType: 'custom_local_return' })

    expect(checklist.map((item) => item.id)).toEqual([
      'source-documents',
      'bookkeeping-export',
      'client-confirmations',
    ])
  })
})
