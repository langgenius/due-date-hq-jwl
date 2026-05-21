import { describe, expect, it } from 'vitest'
import { estimateAccruedPenalty, estimateLegacyPenaltyAmount } from './index'

describe('@duedatehq/core/penalty', () => {
  it('calculates federal owner-month legacy penalty estimate over the default 90-day horizon', () => {
    const result = estimateLegacyPenaltyAmount({
      taxType: 'federal_1065',
      entityType: 'partnership',
      dueDate: '2026-03-16',
      penaltyFactsJson: { version: 'penalty-facts-v1', facts: { partnerCount: 3 } },
    })

    expect(result.status).toBe('ready')
    expect(result.estimatedExposureCents).toBe(229_500)
    expect(result.breakdown[0]?.formula).toContain('$255 x 3 partner')
  })

  it('keeps the legacy penalty amount helper as legacy penalty estimate', () => {
    const result = estimateLegacyPenaltyAmount({
      taxType: 'federal_1065',
      dueDate: '2026-03-16',
      penaltyFactsJson: { version: 'penalty-facts-v1', facts: { partnerCount: 1 } },
    })

    expect(result.estimatedExposureCents).toBe(76_500)
  })

  it('returns zero accrued penalty when the current due date has not passed', () => {
    const result = estimateAccruedPenalty(
      {
        taxType: 'federal_1120',
        entityType: 'c_corp',
        dueDate: '2026-04-15',
        penaltyFactsJson: {
          version: 'penalty-facts-v1',
          facts: { taxDueCents: 0, paymentsAndCreditsCents: 0 },
        },
      },
      { asOfDate: '2026-04-15' },
    )

    expect(result.status).toBe('ready')
    expect(result.estimatedExposureCents).toBe(0)
  })

  it('counts one late day as one penalty month', () => {
    const result = estimateAccruedPenalty(
      {
        taxType: 'federal_1120',
        entityType: 'c_corp',
        dueDate: '2026-04-15',
        penaltyFactsJson: {
          version: 'penalty-facts-v1',
          facts: { taxDueCents: 10_000_00, paymentsAndCreditsCents: 0 },
        },
      },
      { asOfDate: '2026-04-16' },
    )

    expect(result.status).toBe('ready')
    expect(result.estimatedExposureCents).toBe(50_000)
  })

  it('calculates tax-due legacy penalty estimate with failure-to-pay offset', () => {
    const result = estimateLegacyPenaltyAmount({
      taxType: 'federal_1120',
      entityType: 'c_corp',
      dueDate: '2026-04-15',
      penaltyFactsJson: {
        version: 'penalty-facts-v1',
        facts: { taxDueCents: 10_000_00, paymentsAndCreditsCents: 0 },
      },
      horizonDays: 90,
    })

    expect(result.status).toBe('ready')
    expect(result.estimatedExposureCents).toBe(150_000)
    expect(result.breakdown.map((item) => item.key)).toEqual([
      'failure-to-file',
      'failure-to-pay-offset',
      'failure-to-pay',
    ])
  })

  it('applies the over-60-day minimum while preserving the offset total', () => {
    const result = estimateLegacyPenaltyAmount({
      taxType: 'federal_1120',
      dueDate: '2026-04-15',
      penaltyFactsJson: {
        version: 'penalty-facts-v1',
        facts: { taxDueCents: 300_00, paymentsAndCreditsCents: 0 },
      },
      horizonDays: 90,
    })

    expect(result.status).toBe('ready')
    expect(result.estimatedExposureCents).toBe(300_00)
  })

  it('adds optional tax-due exposure to federal S corporation shareholder-month penalties', () => {
    const result = estimateLegacyPenaltyAmount({
      taxType: 'federal_1120s',
      entityType: 's_corp',
      dueDate: '2026-03-16',
      penaltyFactsJson: {
        version: 'penalty-facts-v1',
        facts: {
          shareholderCount: 2,
          taxDueCents: 10_000_00,
          paymentsAndCreditsCents: 0,
        },
      },
    })

    expect(result.status).toBe('ready')
    expect(result.estimatedExposureCents).toBe(303_000)
    expect(result.breakdown.map((item) => item.key)).toContain('owner-months')
    expect(result.breakdown.map((item) => item.key)).toContain('failure-to-pay')
  })

  it('guards zero and negative inputs as missing facts once penalties could accrue', () => {
    expect(
      estimateAccruedPenalty(
        {
          taxType: 'federal_1065',
          dueDate: '2026-03-16',
          penaltyFactsJson: { version: 'penalty-facts-v1', facts: { partnerCount: 0 } },
        },
        { asOfDate: '2026-03-17' },
      ).status,
    ).toBe('needs_input')
    expect(
      estimateAccruedPenalty(
        {
          taxType: 'federal_1120',
          dueDate: '2026-04-15',
          penaltyFactsJson: {
            version: 'penalty-facts-v1',
            facts: { taxDueCents: -1, paymentsAndCreditsCents: 0 },
          },
        },
        { asOfDate: '2026-04-16' },
      ).status,
    ).toBe('needs_input')
  })

  it('returns needs input for cataloged state tax types and federal estimated-tax underpayment', () => {
    expect(
      estimateLegacyPenaltyAmount({
        taxType: 'ca_100',
        dueDate: '2026-04-15',
        estimatedTaxLiabilityCents: 10_000_00,
      }).status,
    ).toBe('needs_input')
    expect(
      estimateLegacyPenaltyAmount({
        taxType: 'federal_1120_estimated_tax',
        dueDate: '2026-04-15',
        penaltyFactsJson: { version: 'penalty-facts-v1', facts: {} },
      }).status,
    ).toBe('needs_input')
  })

  it('keeps unknown state tax types unsupported', () => {
    const result = estimateLegacyPenaltyAmount({
      taxType: 'ca_unknown_local_tax',
      dueDate: '2026-04-15',
    })

    expect(result.status).toBe('unsupported')
  })

  it('calculates source-backed explicit state tax formulas', () => {
    const ca = estimateLegacyPenaltyAmount({
      jurisdiction: 'CA',
      taxType: 'ca_100',
      dueDate: '2026-04-15',
      penaltyFactsJson: {
        version: 'penalty-facts-v1',
        facts: { taxDueCents: 10_000_00, paymentsAndCreditsCents: 0 },
      },
    })
    const ny = estimateLegacyPenaltyAmount({
      jurisdiction: 'NY',
      taxType: 'ny_ct3',
      dueDate: '2026-04-15',
      penaltyFactsJson: {
        version: 'penalty-facts-v1',
        facts: { taxDueCents: 10_000_00, paymentsAndCreditsCents: 0 },
      },
    })
    const tx = estimateLegacyPenaltyAmount({
      jurisdiction: 'TX',
      taxType: 'tx_franchise_report',
      dueDate: '2026-05-15',
      penaltyFactsJson: {
        version: 'penalty-facts-v1',
        facts: { taxDueCents: 10_000_00, paymentsAndCreditsCents: 0 },
      },
    })
    const fl = estimateLegacyPenaltyAmount({
      jurisdiction: 'FL',
      taxType: 'fl_f1120',
      dueDate: '2026-05-01',
      penaltyFactsJson: {
        version: 'penalty-facts-v1',
        facts: { taxDueCents: 10_000_00, paymentsAndCreditsCents: 0 },
      },
    })
    const wa = estimateLegacyPenaltyAmount({
      jurisdiction: 'WA',
      taxType: 'wa_combined_excise_monthly',
      dueDate: '2026-04-25',
      penaltyFactsJson: {
        version: 'penalty-facts-v1',
        facts: { waSubtotalMinusCreditsCents: 1_000_00 },
      },
    })

    expect(ca).toMatchObject({ status: 'ready', estimatedExposureCents: 215_000 })
    expect(ca.penaltySourceRefs[0]?.url).toContain('ftb.ca.gov')
    expect(ny).toMatchObject({ status: 'ready', estimatedExposureCents: 150_000 })
    expect(tx).toMatchObject({ status: 'ready', estimatedExposureCents: 105_000 })
    expect(fl).toMatchObject({ status: 'ready', estimatedExposureCents: 300_000 })
    expect(wa).toMatchObject({ status: 'ready', estimatedExposureCents: 29_000 })
  })

  it('calculates federal estimated-tax underpayment from installment facts', () => {
    const result = estimateAccruedPenalty(
      {
        taxType: 'federal_1120_estimated_tax',
        dueDate: '2026-04-15',
        penaltyFactsJson: {
          version: 'penalty-facts-v1',
          facts: {
            installments: [
              {
                dueDate: '2026-04-15',
                requiredPaymentCents: 10_000_00,
                paidCents: 4_000_00,
                annualRateBps: 800,
              },
            ],
          },
        },
      },
      { asOfDate: '2026-05-15' },
    )

    expect(result.status).toBe('ready')
    expect(result.estimatedExposureCents).toBe(3_945)
    expect(result.penaltySourceRefs[0]?.url).toContain('irs.gov')
  })
})
