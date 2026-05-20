import { describe, expect, it } from 'vitest'
import {
  canEditTaxYearProfileForObligation,
  getMvpRuleCoverage,
  findRuleById,
  isTaxYearDrivenRule,
  listObligationRules,
  listRuleSources,
  listSourcesByNotificationChannel,
  MVP_RULE_JURISDICTIONS,
  normalizeRuleTaxTypeCandidates,
  OBLIGATION_RULES,
  previewObligationsFromRules,
  RULE_SOURCES,
  STATE_RULE_JURISDICTIONS,
} from './index'

const LEGACY_VERIFIED_RULE_JURISDICTIONS = new Set(['FED', 'CA', 'NY', 'TX', 'FL', 'WA'])
const OFFICIAL_NON_GOV_HOSTS = new Set([
  'www.irs.gov',
  'www.fema.gov',
  'floridarevenue.com',
  'www.floridajobs.org',
  'www.laworks.net',
  'www.marylandtaxes.gov',
  'www.jobsnd.com',
  'www.revenue.state.mn.us',
  'workforcewv.org',
  'uimn.org',
])
const STATE_INCOME_CANDIDATE_TAX_TYPE_SUFFIXES = [
  '_state_individual_income_tax',
  '_state_individual_estimated_tax',
] as const
const IMPRECISE_INCOME_SOURCE_PATHS = new Set(['/', '/individuals', '/income-tax'])

function expectUnique(ids: readonly string[]) {
  expect(new Set(ids).size).toBe(ids.length)
}

function isOfficialHost(host: string): boolean {
  return (
    host === 'irs.gov' ||
    host.endsWith('.irs.gov') ||
    host.endsWith('.gov') ||
    host.endsWith('.us') ||
    OFFICIAL_NON_GOV_HOSTS.has(host)
  )
}

function isPreciseIncomeSourceUrl(url: string): boolean {
  const parsed = new URL(url)
  const pathname = parsed.pathname.toLowerCase().replace(/\/+$/, '') || '/'
  if (IMPRECISE_INCOME_SOURCE_PATHS.has(pathname)) return false
  if (pathname.endsWith('/home.aspx')) return false
  if (pathname === '/individual/pages/default.aspx') return false
  return true
}

describe('@duedatehq/core/rules', () => {
  it('keeps MVP jurisdiction scope explicit', () => {
    expect(MVP_RULE_JURISDICTIONS).toEqual(['FED', ...STATE_RULE_JURISDICTIONS])
    expect(STATE_RULE_JURISDICTIONS).toHaveLength(51)
  })

  it('stores only official source URLs in the MVP registry', () => {
    expectUnique(RULE_SOURCES.map((source) => source.id))

    for (const source of RULE_SOURCES) {
      const url = new URL(source.url)
      expect(isOfficialHost(url.host), `${source.id} uses unofficial host ${url.host}`).toBe(true)
      expect(source.id, `${source.id} is an imprecise agency-level source`).not.toMatch(
        /\.(tax_agency|employer_ui_agency)$/,
      )
      expect(['healthy', 'degraded']).toContain(source.healthStatus)
      expect(source.notificationChannels.length).toBeGreaterThan(0)
    }
  })

  it('links every rule to existing official sources', () => {
    const sourceIds = new Set<string>(RULE_SOURCES.map((source) => source.id))

    expectUnique(OBLIGATION_RULES.map((rule) => rule.id))

    for (const rule of OBLIGATION_RULES) {
      expect(rule.sourceIds.length, `${rule.id} has no sources`).toBeGreaterThan(0)
      expect(rule.evidence.length, `${rule.id} has no evidence`).toBeGreaterThan(0)

      for (const sourceId of rule.sourceIds) {
        expect(sourceIds.has(sourceId), `${rule.id} references missing source ${sourceId}`).toBe(
          true,
        )
      }

      for (const evidence of rule.evidence) {
        expect(sourceIds.has(evidence.sourceId), `${rule.id} has missing evidence source`).toBe(
          true,
        )
        expect(rule.sourceIds, `${rule.id} evidence source is not on rule.sourceIds`).toContain(
          evidence.sourceId,
        )
        expect(evidence.authorityRole, `${rule.id} evidence missing authority role`).toMatch(
          /^(basis|cross_check|watch|early_warning)$/,
        )
        expect(
          ['html', 'pdf', 'table', 'api', 'email_subscription'],
          `${rule.id} evidence missing locator kind`,
        ).toContain(evidence.locator.kind)
        expect(evidence.summary, `${rule.id} evidence missing summary`).not.toHaveLength(0)
        expect(
          evidence.sourceExcerpt,
          `${rule.id} evidence missing source excerpt`,
        ).not.toHaveLength(0)
        expect(evidence.retrievedAt, `${rule.id} evidence missing retrieval date`).toMatch(
          /^\d{4}-\d{2}-\d{2}$/,
        )
      }

      if (rule.status === 'verified') {
        expect(
          rule.evidence.some((evidence) => evidence.authorityRole === 'basis'),
          `${rule.id} has no basis evidence`,
        ).toBe(true)
      }
    }
  })

  it('routes state income-review candidates to state-specific income sources', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))
    const incomeSourceJurisdictions = new Set(
      RULE_SOURCES.filter((source) => source.id.endsWith('.income_tax')).map(
        (source) => source.jurisdiction,
      ),
    )

    for (const rule of OBLIGATION_RULES) {
      const isStateIncomeReviewRule =
        rule.status === 'candidate' &&
        STATE_INCOME_CANDIDATE_TAX_TYPE_SUFFIXES.some((suffix) => rule.taxType.endsWith(suffix))

      if (!isStateIncomeReviewRule || !incomeSourceJurisdictions.has(rule.jurisdiction)) continue

      const expectedSourceId = `${rule.jurisdiction.toLowerCase()}.income_tax`
      expect(rule.sourceIds, `${rule.id} should use a specific income source`).toEqual([
        expectedSourceId,
      ])
      expect(sourcesById.get(expectedSourceId), `${rule.id} income source is missing`).toBeDefined()
    }

    expect(findRuleById('wv.individual_income_return.candidate.2026')?.sourceIds).toEqual([
      'wv.income_tax',
    ])
    expect(sourcesById.get('wv.income_tax')?.url).toBe(
      'https://tax.wv.gov/Individuals/Pages/Individuals.aspx',
    )
    expect(sourcesById.get('wi.income_tax')?.url).toBe(
      'https://www.revenue.wi.gov/Pages/Individuals/income.aspx',
    )
  })

  it('keeps generated state income sources concrete enough for Pulse watch', () => {
    for (const source of RULE_SOURCES.filter((candidate) => candidate.id.endsWith('.income_tax'))) {
      expect(
        isPreciseIncomeSourceUrl(source.url),
        `${source.id} should not use an agency homepage or generic index URL`,
      ).toBe(true)
      expect(source.title, `${source.id} should name a tax-specific source`).toMatch(
        /income|tax|filing|deadline|resident|facts|due/i,
      )
    }
  })

  it('does not generate source-backed candidates for domains without precise sources', () => {
    const coarseCandidateTaxTypeFragments = [
      '_state_fiduciary_income_tax',
      '_state_business_income_franchise_tax',
      '_state_pte_composite_ptet',
      '_state_sales_use_tax',
      '_state_withholding_tax',
      '_state_ui_wage_report',
    ]

    for (const rule of OBLIGATION_RULES) {
      if (rule.status !== 'candidate') continue

      expect(
        coarseCandidateTaxTypeFragments.some((fragment) => rule.taxType.endsWith(fragment)),
        `${rule.id} should wait for a precise domain source before generation`,
      ).toBe(false)
    }
  })

  it('covers every US jurisdiction with official sources and safe rule states', () => {
    const coverage = getMvpRuleCoverage()

    expect(coverage).toHaveLength(MVP_RULE_JURISDICTIONS.length)

    for (const row of coverage) {
      expect(row.sourceCount, `${row.jurisdiction} has no sources`).toBeGreaterThan(0)
      expect(
        row.highPrioritySourceCount,
        `${row.jurisdiction} lacks priority sources`,
      ).toBeGreaterThan(0)
      if (LEGACY_VERIFIED_RULE_JURISDICTIONS.has(row.jurisdiction)) {
        expect(row.verifiedRuleCount, `${row.jurisdiction} has no verified rules`).toBeGreaterThan(
          0,
        )
      } else {
        expect(row.verifiedRuleCount, `${row.jurisdiction} should start review-only`).toBe(0)
        expect(row.candidateCount, `${row.jurisdiction} has no candidate rules`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps user reminders behind verified rules only', () => {
    const userReminderSources = listSourcesByNotificationChannel('user_deadline_reminder')
    const verifiedRules = listObligationRules({ status: 'verified' })
    const defaultRules = listObligationRules()
    const withCandidates = listObligationRules({ includeCandidates: true })

    expect(userReminderSources).toHaveLength(0)
    expect(verifiedRules.every((rule) => rule.status === 'verified')).toBe(true)
    expect(defaultRules.every((rule) => rule.status !== 'candidate')).toBe(true)
    expect(withCandidates.some((rule) => rule.status === 'candidate')).toBe(true)
  })

  it('keeps audited rule corrections in the structured asset', () => {
    expect(findRuleById('fed.1065.return.2025')?.requiresApplicabilityReview).toBe(true)
    expect(findRuleById('fed.1120.return.2025')?.coverageStatus).toBe('manual')
    expect(findRuleById('ca.llc.568.return.2025')?.ruleTier).toBe('applicability_review')

    expect(findRuleById('ny.ct3s.return.2025')?.dueDateLogic).toMatchObject({
      kind: 'nth_day_after_tax_year_end',
      monthOffset: 3,
      day: 15,
    })
    expect(findRuleById('ny.ptet.election.2026')?.ruleTier).toBe('applicability_review')
    expect(findRuleById('tx.franchise.extension.2026')?.requiresApplicabilityReview).toBe(true)

    expect(findRuleById('wa.excise.monthly.2026')?.dueDateLogic).toMatchObject({
      kind: 'period_table',
      periods: expect.arrayContaining([
        { period: '2026-03', dueDate: '2026-04-27' },
        { period: '2026-11', dueDate: '2026-12-28' },
      ]),
    })
    expect(findRuleById('wa.excise.quarterly.2026')?.dueDateLogic).toMatchObject({
      kind: 'period_table',
      periods: expect.arrayContaining([{ period: '2026-Q4', dueDate: '2027-02-01' }]),
    })
  })

  it('exposes source and rule filters for Rules Console reads', () => {
    expect(listRuleSources('CA').every((source) => source.jurisdiction === 'CA')).toBe(true)
    expect(
      listObligationRules({ jurisdiction: 'WA' }).every((rule) => rule.jurisdiction === 'WA'),
    ).toBe(true)
  })

  it('normalizes matrix tax types into explicit rule tax type candidates', () => {
    expect(normalizeRuleTaxTypeCandidates('ca_llc_franchise_min_800')).toContainEqual({
      inputTaxType: 'ca_llc_franchise_min_800',
      taxType: 'ca_llc_annual_tax',
      requiresReview: false,
      reviewReason: null,
    })
    expect(normalizeRuleTaxTypeCandidates('ny_ptet_optional')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taxType: 'ny_ptet_election',
          requiresReview: true,
        }),
        expect.objectContaining({
          taxType: 'ny_ptet_estimated_tax',
          requiresReview: true,
        }),
        expect.objectContaining({
          taxType: 'ny_ptet',
          requiresReview: true,
        }),
      ]),
    )
  })

  it('flags only tax-year-driven obligations as tax year profile editable by rule', () => {
    const taxYearEndRule = findRuleById('fed.1120s.return.2025')
    const taxYearBeginRule = findRuleById('ca.llc.annual_tax.2026')
    const fixedDateRule = findRuleById('fed.1040.extension.2025')

    expect(taxYearEndRule).toBeDefined()
    expect(taxYearBeginRule).toBeDefined()
    expect(fixedDateRule).toBeDefined()
    expect(taxYearEndRule ? isTaxYearDrivenRule(taxYearEndRule) : false).toBe(true)
    expect(taxYearBeginRule ? isTaxYearDrivenRule(taxYearBeginRule) : false).toBe(true)
    expect(fixedDateRule ? isTaxYearDrivenRule(fixedDateRule) : true).toBe(false)
    expect(
      canEditTaxYearProfileForObligation({
        rule: taxYearEndRule,
        taxType: '1120-S',
        taxYearType: 'calendar',
        taxPeriodKind: 'calendar',
      }),
    ).toBe(true)
    expect(
      canEditTaxYearProfileForObligation({
        rule: taxYearBeginRule,
        taxType: 'CA LLC annual tax',
        taxYearType: 'calendar',
        taxPeriodKind: 'calendar',
      }),
    ).toBe(true)
    expect(
      canEditTaxYearProfileForObligation({
        rule: fixedDateRule,
        taxType: '1040 extension',
        taxYearType: 'calendar',
        taxPeriodKind: 'calendar',
      }),
    ).toBe(false)
  })

  it('keeps legacy fiscal obligations editable when rule metadata is unavailable', () => {
    expect(
      canEditTaxYearProfileForObligation({
        rule: null,
        taxType: 'CA Form 100',
        taxYearType: 'fiscal',
        taxPeriodKind: 'fiscal',
      }),
    ).toBe(true)
    expect(
      canEditTaxYearProfileForObligation({
        rule: null,
        taxType: '1120-S return',
        taxYearType: 'calendar',
        taxPeriodKind: 'calendar',
      }),
    ).toBe(true)
    expect(
      canEditTaxYearProfileForObligation({
        rule: null,
        taxType: 'quarterly payroll deposit',
        taxYearType: 'calendar',
        taxPeriodKind: 'calendar',
      }),
    ).toBe(false)
  })

  it('generates reminder-ready previews only for verified full rules with concrete dates', () => {
    const previews = previewObligationsFromRules({
      client: {
        id: 'client_ca_llc',
        entityType: 'llc',
        state: 'CA',
        taxTypes: ['federal_1065_or_1040', 'ca_llc_franchise_min_800', 'ca_llc_fee_gross_receipts'],
        taxYearStart: '2026-01-01',
        taxYearEnd: '2025-12-31',
      },
    })

    const annualTax = previews.find((preview) => preview.ruleId === 'ca.llc.annual_tax.2026')
    const estimatedFee = previews.find((preview) => preview.ruleId === 'ca.llc.estimated_fee.2026')
    const federal1065 = previews.find((preview) => preview.ruleId === 'fed.1065.return.2025')

    expect(annualTax).toMatchObject({
      matchedTaxType: 'ca_llc_franchise_min_800',
      dueDate: '2026-04-15',
      requiresReview: false,
      reminderReady: true,
    })
    expect(estimatedFee).toMatchObject({
      matchedTaxType: 'ca_llc_fee_gross_receipts',
      dueDate: '2026-06-15',
      requiresReview: true,
      reminderReady: false,
    })
    expect(federal1065).toMatchObject({
      matchedTaxType: 'federal_1065_or_1040',
      dueDate: '2026-03-16',
      requiresReview: true,
      reminderReady: false,
    })
    expect(previews.some((preview) => preview.ruleId === 'fed.disaster_relief.watch')).toBe(false)
  })

  it('keeps federal entity return due dates and LLC tax classification paths explicit', () => {
    const sCorpPreviews = previewObligationsFromRules({
      client: {
        id: 'client_scorp',
        entityType: 's_corp',
        state: 'NY',
        taxTypes: ['federal_1120s'],
        taxYearStart: '2025-01-01',
        taxYearEnd: '2025-12-31',
      },
    })
    expect(
      sCorpPreviews.find((preview) => preview.ruleId === 'fed.1120s.return.2025'),
    ).toMatchObject({
      dueDate: '2026-03-16',
      reminderReady: true,
    })

    const llcAsSCorpPreviews = previewObligationsFromRules({
      client: {
        id: 'client_llc_scorp',
        entityType: 'llc',
        taxClassification: 's_corp',
        state: 'CA',
        taxTypes: ['federal_1120s'],
        taxYearStart: '2025-01-01',
        taxYearEnd: '2025-12-31',
      },
    })
    expect(llcAsSCorpPreviews.some((preview) => preview.ruleId === 'fed.1065.return.2025')).toBe(
      false,
    )
    expect(
      llcAsSCorpPreviews.find((preview) => preview.ruleId === 'fed.1120s.return.2025'),
    ).toMatchObject({
      dueDate: '2026-03-16',
    })
  })

  it('uses fiscal return periods for fiscal-year S corporation deadlines', () => {
    const previews = previewObligationsFromRules({
      client: {
        id: 'client_scorp_fiscal',
        entityType: 's_corp',
        state: 'NY',
        taxTypes: ['federal_1120s'],
        taxYearType: 'fiscal',
        fiscalYearEndMonth: 6,
        fiscalYearEndDay: 30,
      },
    })

    expect(previews.find((preview) => preview.ruleId === 'fed.1120s.return.2025')).toMatchObject({
      dueDate: '2026-09-15',
      taxPeriodStart: '2025-07-01',
      taxPeriodEnd: '2026-06-30',
      taxPeriodKind: 'fiscal',
      taxPeriodSource: 'client_default',
      taxPeriodReviewReason: null,
      requiresReview: false,
      reminderReady: true,
      reviewReasons: [],
      missingClientFacts: [],
    })
  })

  it('blocks fiscal-year deadlines when the fiscal year end is missing', () => {
    const previews = previewObligationsFromRules({
      client: {
        id: 'client_scorp_fiscal_missing_end',
        entityType: 's_corp',
        state: 'NY',
        taxTypes: ['federal_1120s'],
        taxYearType: 'fiscal',
      },
    })

    expect(previews.find((preview) => preview.ruleId === 'fed.1120s.return.2025')).toMatchObject({
      dueDate: null,
      taxPeriodStart: null,
      taxPeriodEnd: null,
      taxPeriodKind: 'fiscal',
      requiresReview: false,
      reminderReady: false,
      reviewReasons: [],
      missingClientFacts: ['fiscalYearEnd'],
    })
  })

  it('tracks 1040 extensions without changing payment due dates', () => {
    const returnRule = findRuleById('fed.1040.return.2025')
    const extensionRule = findRuleById('fed.1040.extension.2025')
    expect(returnRule?.extensionPolicy).toMatchObject({
      formName: 'Form 4868',
      paymentExtended: false,
    })
    expect(extensionRule?.extensionPolicy).toMatchObject({
      formName: 'Form 4868',
      paymentExtended: false,
    })

    const previews = previewObligationsFromRules({
      client: {
        id: 'client_1040',
        entityType: 'individual',
        taxClassification: 'individual',
        state: 'CA',
        taxTypes: ['federal_1040', 'federal_1040_extension', 'federal_1040_estimated_tax'],
      },
    })
    expect(previews.find((preview) => preview.ruleId === 'fed.1040.return.2025')).toMatchObject({
      dueDate: '2026-04-15',
      eventType: 'filing',
    })
    expect(previews.find((preview) => preview.ruleId === 'fed.1040.extension.2025')).toMatchObject({
      dueDate: '2026-04-15',
      eventType: 'extension',
      reminderReady: true,
    })
    expect(
      previews.filter((preview) => preview.ruleId === 'fed.1040.estimated_tax.2026'),
    ).toHaveLength(4)
  })

  it('separates payroll return, payroll deposit, information return, and FBAR workflows', () => {
    const previews = previewObligationsFromRules({
      client: {
        id: 'client_business',
        entityType: 'c_corp',
        taxClassification: 'c_corp',
        state: 'TX',
        taxTypes: [
          'federal_941',
          'federal_payroll_deposit_monthly',
          'federal_1099_nec',
          'federal_fbar',
        ],
      },
    })

    const form941 = previews.filter((preview) => preview.ruleId === 'fed.941.return.2026')
    const payrollDeposit = previews.find(
      (preview) => preview.ruleId === 'fed.payroll_deposit.monthly.2026',
    )
    const nec = previews.find((preview) => preview.ruleId === 'fed.1099_nec.2025')
    const fbar = previews.find((preview) => preview.ruleId === 'fed.fbar.automatic_extension.2025')

    expect(form941).toHaveLength(4)
    expect(form941.every((preview) => preview.eventType === 'filing')).toBe(true)
    expect(payrollDeposit).toMatchObject({
      eventType: 'deposit',
      dueDate: null,
      reminderReady: false,
    })
    expect(nec).toMatchObject({
      eventType: 'information_report',
      dueDate: '2026-02-02',
      reminderReady: false,
    })
    expect(fbar).toMatchObject({
      dueDate: '2026-10-15',
      reminderReady: false,
    })
  })

  it('keeps optional PTET generated as review-only and expands period tables', () => {
    const previews = previewObligationsFromRules({
      client: {
        id: 'client_ny_scorp',
        entityType: 's_corp',
        state: 'NY',
        taxTypes: ['federal_1120s', 'ny_ct3s', 'ny_ptet_optional'],
        taxYearStart: '2026-01-01',
        taxYearEnd: '2025-12-31',
      },
    })

    const nyCt3s = previews.find((preview) => preview.ruleId === 'ny.ct3s.return.2025')
    const ptetPayments = previews.filter(
      (preview) => preview.ruleId === 'ny.ptet.estimated_payments.2026',
    )

    expect(nyCt3s).toMatchObject({
      dueDate: '2026-03-16',
      requiresReview: false,
      reminderReady: true,
    })
    expect(ptetPayments).toHaveLength(4)
    expect(ptetPayments.every((preview) => preview.requiresReview)).toBe(true)
    expect(ptetPayments.every((preview) => !preview.reminderReady)).toBe(true)
    expect(ptetPayments.map((preview) => preview.period)).toEqual([
      '2026-Q1',
      '2026-Q2',
      '2026-Q3',
      '2026-Q4',
    ])
  })

  it('surfaces source-defined calendars as review-needed previews', () => {
    const previews = previewObligationsFromRules({
      client: {
        id: 'client_fl_c_corp',
        entityType: 'c_corp',
        state: 'FL',
        taxTypes: ['fl_f1120', 'fl_cit_estimated_tax'],
        taxYearStart: '2026-01-01',
        taxYearEnd: '2025-12-31',
      },
    })

    expect(previews.find((preview) => preview.ruleId === 'fl.f1120.return.2025')).toMatchObject({
      dueDate: null,
      period: 'source_defined',
      requiresReview: true,
      reminderReady: false,
    })
    expect(
      previews.find((preview) => preview.ruleId === 'fl.cit.estimated_tax.2026'),
    ).toMatchObject({
      dueDate: null,
      period: 'source_defined',
      requiresReview: true,
      reminderReady: false,
    })
  })
})
