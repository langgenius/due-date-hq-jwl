import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PulseDetail } from '@duedatehq/contracts'

import { bootstrapI18n } from '@/i18n/bootstrap'
import { activateLocale } from '@/i18n/i18n'
import { AppI18nProvider } from '@/i18n/provider'

import { AlertStructuredFields } from './AlertStructuredFields'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function render(children: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  act(() => {
    root?.render(<AppI18nProvider>{children}</AppI18nProvider>)
  })
}

function reviewOnlyDetail(overrides: Partial<PulseDetail> = {}): PulseDetail {
  return {
    alert: {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      pulseId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      status: 'dismissed',
      sourceStatus: 'approved',
      changeKind: 'form_instruction',
      actionMode: 'review_only',
      firmImpact: 'review_only',
      title: 'NY DTF clarifies pass-through entity tax election window',
      source: 'NY DTF',
      sourceUrl: 'https://www.tax.ny.gov/notice-mock-pte-2026',
      summary: 'No matching clients in this practice - informational notice only.',
      publishedAt: '2026-05-24T12:00:00.000Z',
      matchedCount: 0,
      needsReviewCount: 0,
      applyReadiness: { status: 'not_applicable', missing: [] },
      duplicateSourceSnapshotCount: 0,
      confidence: 0.58,
      isSample: true,
      jurisdiction: 'NY',
      taxAreas: ['income_business'],
      forms: ['IT-204', 'CT-3'],
    },
    jurisdiction: 'NY',
    counties: [],
    forms: ['IT-204', 'CT-3'],
    entityTypes: ['partnership', 'c_corp'],
    originalDueDate: null,
    newDueDate: null,
    effectiveFrom: null,
    effectiveUntil: null,
    affectedRuleIds: [],
    reverifyRuleIds: [],
    structuredChange: {
      note: 'PTET election reminder only.',
    },
    sourceExcerpt:
      'The Department of Taxation and Finance reminds taxpayers that the PTET election for tax year 2026 must be made by March 15, 2026.',
    reviewedAt: null,
    applyReadiness: { status: 'not_applicable', missing: [] },
    affectedClients: [],
    ...overrides,
  }
}

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

describe('AlertStructuredFields', () => {
  it('keeps internal structured change JSON out of the CPA drawer', () => {
    render(<AlertStructuredFields detail={reviewOnlyDetail()} />)

    expect(document.body.textContent).toContain('Review only')
    expect(document.body.textContent).toContain('PTET election for tax year 2026')
    expect(document.body.textContent).not.toContain('Structured change')
    expect(document.body.textContent).not.toContain('"note"')
    expect(document.body.textContent).not.toContain('PTET election reminder only')
  })

  it('shows a Revenue-Procedure pointer caveat (not the AI-extraction caveat) for threshold advisories', () => {
    render(
      <AlertStructuredFields
        detail={reviewOnlyDetail({
          alert: { ...reviewOnlyDetail().alert, changeKind: 'threshold_advisory' },
        })}
      />,
    )

    expect(document.body.textContent).toContain('official IRS Revenue Procedure')
    expect(document.body.textContent).toContain('asserts no specific')
    // The AI-extraction caveat must NOT appear — these advisories are
    // deterministic and assert no figures.
    expect(document.body.textContent).not.toContain('AI extraction of the source bulletin')
  })

  it('shows duplicate source updates as an aggregated count only', () => {
    render(
      <AlertStructuredFields
        detail={reviewOnlyDetail({
          alert: {
            ...reviewOnlyDetail().alert,
            duplicateSourceSnapshotCount: 2,
          },
        })}
      />,
    )

    expect(document.body.textContent).toContain(
      '2 similar source updates were merged into this alert.',
    )
    expect(document.body.textContent).not.toContain('policy-watch')
  })

  it('renders protective claim window facts without exposing raw structured JSON', () => {
    render(
      <AlertStructuredFields
        detail={reviewOnlyDetail({
          alert: {
            ...reviewOnlyDetail().alert,
            changeKind: 'protective_claim_window',
            source: 'Taxpayer Advocate Service Blog',
            sourceUrl: 'https://www.taxpayeradvocate.irs.gov/taxnews-information/blogs-nta/',
          },
          structuredChange: {
            kind: 'protective_claim_window',
            actionDeadline: '2026-07-10',
            claimTaxYears: ['2019', '2020', '2021', '2022'],
            affectedTaxActs: ['COVID disaster period refund claims'],
            evidenceNeeded: ['filed return dates', 'claim support'],
            legalUncertainty: 'CPA must review whether action is needed.',
            authorityRefs: ['Taxpayer Advocate Service'],
          },
          sourceExcerpt: 'taxpayers should review protective claims before July 10, 2026.',
        })}
      />,
    )

    expect(document.body.textContent).toContain('Protective claim window')
    expect(document.body.textContent).toContain('Action deadline')
    expect(document.body.textContent).toContain('Jul 10, 2026')
    expect(document.body.textContent).toContain('2019 · 2020 · 2021 · 2022')
    expect(document.body.textContent).toContain('filed return dates · claim support')
    expect(document.body.textContent).toContain('CPA must review whether action is needed.')
    expect(document.body.textContent).not.toContain('"actionDeadline"')
  })
})
