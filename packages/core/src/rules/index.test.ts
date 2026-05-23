import { describe, expect, it } from 'vitest'
import {
  canEditTaxYearProfileForObligation,
  getMvpRuleCoverage,
  findRuleById,
  isTaxYearDrivenRule,
  isCoveredTemporaryAnnouncementSource,
  listObligationRules,
  listRequiredSourceCoverage,
  listRuleSources,
  listSourceCoverageGaps,
  listSourcesByNotificationChannel,
  listTemporaryAnnouncementSourceCoverage,
  MVP_RULE_JURISDICTIONS,
  normalizeRuleTaxTypeCandidates,
  OBLIGATION_RULES,
  previewObligationsFromRules,
  RULE_SOURCES,
  sourceCoversRuleDomain,
  STATE_RULE_JURISDICTIONS,
} from './index'

const LEGACY_VERIFIED_RULE_JURISDICTIONS = new Set(['FED', 'CA', 'NY', 'TX', 'FL', 'WA'])
const COMPLETED_SOURCE_PACK_JURISDICTIONS = new Set([
  'AL',
  'CA',
  'NY',
  'TX',
  'FL',
  'WA',
  'GA',
  'IL',
  'MA',
  'NJ',
  'PA',
  'NC',
  'VA',
  'AZ',
  'CO',
  'MI',
  'OH',
  'OR',
  'SC',
  'TN',
  'UT',
  'WI',
  'AK',
  'AR',
  'CT',
  'DE',
  'DC',
  'HI',
  'ID',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NM',
  'ND',
  'OK',
  'RI',
  'SD',
  'VT',
  'WV',
  'WY',
])
const OFFICIAL_NON_GOV_HOSTS = new Set([
  'www.irs.gov',
  'www.fema.gov',
  'adol.alabama.gov',
  'floridarevenue.com',
  'www.floridajobs.org',
  'www.laworks.net',
  'www.marylandtaxes.gov',
  'www.jobsnd.com',
  'www.revenue.state.mn.us',
  'www.uimn.org',
  'workforcewv.org',
  'uimn.org',
  'www2.laworks.net',
])
const STATE_INCOME_CANDIDATE_TAX_TYPE_SUFFIXES = ['_state_individual_income_tax'] as const
const STATE_BUSINESS_CANDIDATE_TAX_TYPE_SUFFIXES = [
  '_state_business_income_tax',
  '_state_business_estimated_tax',
  '_state_pte_composite_ptet',
  '_state_franchise_or_entity_tax',
  '_state_sales_use_tax',
  '_state_withholding_tax',
  '_state_ui_wage_report',
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
      expect(source.healthStatus).toBe('healthy')
      expect(source.notificationChannels.length).toBeGreaterThan(0)
      expect(source.domains.length, `${source.id} has no source domains`).toBeGreaterThan(0)
      expect(
        source.entityApplicability.length,
        `${source.id} has no entity applicability`,
      ).toBeGreaterThan(0)
      expect(source.authorityRole, `${source.id} has no authority role`).toMatch(
        /^(basis|cross_check|watch|early_warning)$/,
      )
    }
  })

  it('keeps internal temporary announcement source coverage complete and machine-watchable', () => {
    const coverage = listTemporaryAnnouncementSourceCoverage()
    expect(coverage).toHaveLength(52)
    expect(coverage.map((cell) => cell.jurisdiction)).toEqual(MVP_RULE_JURISDICTIONS)
    expect(coverage.filter((cell) => cell.status === 'covered')).toHaveLength(52)

    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))
    for (const cell of coverage) {
      expect(
        cell.sourceIds.length,
        `${cell.jurisdiction} has no temporary announcement source`,
      ).toBeGreaterThan(0)
      for (const sourceId of cell.sourceIds) {
        const source = sourcesById.get(sourceId)
        expect(source, `${sourceId} should map to a registered source`).toBeDefined()
        if (!source) continue
        expect(isCoveredTemporaryAnnouncementSource(source), sourceId).toBe(true)
        expect(source.authorityRole, sourceId).toBe('watch')
        expect(['html_watch', 'pdf_watch', 'api_watch'], sourceId).toContain(
          source.acquisitionMethod,
        )
        if (source.acquisitionMethod === 'api_watch') {
          expect(source.adapterKind, sourceId).toBe('rss_or_announcement_list')
          expect(source.feedUrl, sourceId).toMatch(/^https:\/\//)
        }
        expect(['emergency_relief', 'news'], sourceId).toContain(source.sourceType)
      }
    }
  })

  it('does not let temporary watch sources satisfy baseline source coverage', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))
    for (const cell of listRequiredSourceCoverage()) {
      for (const sourceId of cell.sourceIds) {
        expect(sourcesById.get(sourceId)?.authorityRole, sourceId).toBe('basis')
      }
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

      const expectedSourceId =
        rule.jurisdiction === 'KS'
          ? 'ks.tax_calendar'
          : `${rule.jurisdiction.toLowerCase()}.income_tax`
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
      'https://www.revenue.wi.gov/Pages/FAQS/pcs-late.aspx',
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
      '_state_pte_composite_ptet',
      '_state_sales_use_tax',
      '_state_withholding_tax',
      '_state_ui_wage_report',
    ]

    for (const rule of OBLIGATION_RULES) {
      if (rule.status !== 'candidate') continue

      if (COMPLETED_SOURCE_PACK_JURISDICTIONS.has(rule.jurisdiction)) continue
      expect(
        coarseCandidateTaxTypeFragments.some((fragment) => rule.taxType.endsWith(fragment)),
        `${rule.id} should wait for a precise domain source before generation`,
      ).toBe(false)
    }
  })

  it('keeps personal and business source-backed candidates separated by source domain', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))
    const businessCandidates = OBLIGATION_RULES.filter(
      (rule) =>
        rule.status === 'candidate' &&
        STATE_BUSINESS_CANDIDATE_TAX_TYPE_SUFFIXES.some((suffix) => rule.taxType.endsWith(suffix)),
    )
    const personalCandidates = OBLIGATION_RULES.filter(
      (rule) =>
        rule.status === 'candidate' &&
        STATE_INCOME_CANDIDATE_TAX_TYPE_SUFFIXES.some((suffix) => rule.taxType.endsWith(suffix)),
    )

    expect(personalCandidates.length).toBeGreaterThan(0)
    expect(businessCandidates.length).toBeGreaterThan(0)
    expect(
      personalCandidates.every((rule) =>
        rule.entityApplicability.every(
          (entity) => entity === 'individual' || entity === 'sole_prop',
        ),
      ),
    ).toBe(true)
    expect(
      businessCandidates.every((rule) =>
        rule.entityApplicability.every(
          (entity) =>
            entity === 'llc' ||
            entity === 'partnership' ||
            entity === 's_corp' ||
            entity === 'c_corp' ||
            entity === 'sole_prop',
        ),
      ),
    ).toBe(true)

    expect(findRuleById('ca.business_income_return.candidate.2026')?.sourceIds).toEqual([
      'ca.ftb_business_due_dates',
    ])
    expect(findRuleById('tx.franchise_or_entity_tax.candidate.2026')?.sourceIds).toEqual([
      'tx.franchise_home',
    ])
    expect(findRuleById('ca.pass_through_entity_return.candidate.2026')?.sourceIds).toEqual([
      'ca.ftb_business_due_dates',
    ])
    expect(findRuleById('ny.pass_through_entity_return.candidate.2026')?.sourceIds).toEqual([
      'ny.tax_calendar.2026',
    ])
    expect(findRuleById('tx.sales_use_tax.candidate.2026')?.sourceIds).toEqual(['tx.sales_use_tax'])
    expect(findRuleById('fl.business_income_return.candidate.2026')?.entityApplicability).toEqual([
      'c_corp',
    ])
    expect(findRuleById('wa.sales_use_tax.candidate.2026')?.sourceIds).toEqual([
      'wa.excise_due_dates_2026',
    ])
    expect(findRuleById('ga.franchise_or_entity_tax.candidate.2026')).toMatchObject({
      sourceIds: ['ga.corporate_income_net_worth_tax'],
      entityApplicability: ['s_corp', 'c_corp'],
    })
    expect(findRuleById('il.franchise_or_entity_tax.candidate.2026')?.sourceIds).toEqual([
      'il.business_income_tax_forms',
    ])
    expect(sourcesById.get('il.business_income_tax_forms')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://tax.illinois.gov/localgovernments/personal-property-replacement-tax.html',
    })
    expect(findRuleById('ma.business_income_return.candidate.2026')?.sourceIds).toEqual([
      'ma.dor_tax_due_dates_extensions',
    ])
    expect(findRuleById('ma.franchise_or_entity_tax.candidate.2026')).toMatchObject({
      sourceIds: ['ma.corporate_excise_tax_guide'],
      entityApplicability: ['s_corp', 'c_corp'],
    })
    expect(findRuleById('nj.sales_use_tax.candidate.2026')?.sourceIds).toEqual([
      'nj.tax_calendar_2026',
    ])
    expect(findRuleById('pa.franchise_or_entity_tax.candidate.2026')).toBeUndefined()
    expect(findRuleById('nc.franchise_or_entity_tax.candidate.2026')).toMatchObject({
      sourceIds: ['nc.corporate_income_franchise_filing'],
      entityApplicability: ['s_corp', 'c_corp'],
    })
    expect(findRuleById('va.franchise_or_entity_tax.candidate.2026')).toBeUndefined()
    expect(findRuleById('az.franchise_or_entity_tax.candidate.2026')).toBeUndefined()
    expect(findRuleById('co.franchise_or_entity_tax.candidate.2026')).toBeUndefined()
    expect(findRuleById('mi.franchise_or_entity_tax.candidate.2026')).toBeUndefined()
    expect(findRuleById('oh.franchise_or_entity_tax.candidate.2026')?.sourceIds).toEqual([
      'oh.commercial_activity_tax',
    ])
    expect(findRuleById('or.sales_use_tax.candidate.2026')).toBeUndefined()
    expect(findRuleById('sc.franchise_or_entity_tax.candidate.2026')).toMatchObject({
      sourceIds: ['sc.corporate_income_tax'],
      entityApplicability: ['c_corp'],
    })
    expect(findRuleById('tn.individual_income_return.candidate.2026')).toBeUndefined()
    expect(findRuleById('tn.franchise_or_entity_tax.candidate.2026')?.sourceIds).toEqual([
      'tn.franchise_excise_tax',
    ])
    expect(findRuleById('ut.individual_estimated_tax.candidate.2026')).toBeUndefined()
    expect(findRuleById('ut.franchise_or_entity_tax.candidate.2026')).toMatchObject({
      sourceIds: ['ut.corporate_franchise_income_tax'],
      entityApplicability: ['c_corp'],
    })
    expect(findRuleById('wi.franchise_or_entity_tax.candidate.2026')).toMatchObject({
      sourceIds: ['wi.corporation_franchise_income_tax'],
      entityApplicability: ['c_corp'],
    })
  })

  it('pins schema-invalid concrete draft repairs to precise due-date excerpts', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('ia.income_tax')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://revenue.iowa.gov/taxes/frequently-asked-questions/individual-income',
    })
    expect(
      findRuleById('ia.individual_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('April 30')

    expect(sourcesById.get('ms.ui_wage_report')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://mdes.ms.gov/employers/unemployment-tax/reporting-and-filing/quarterly-report-and-tax-due-dates/',
    })
    expect(findRuleById('ms.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      '1st Quarter Due April 30th',
    )

    expect(sourcesById.get('nm.income_tax')).toMatchObject({
      sourceType: 'publication',
      url: 'https://www.tax.newmexico.gov/wp-content/uploads/2026/03/20260315_Reminder-Income-tax-returns-due-April-15.pdf',
    })
    expect(
      findRuleById('nm.individual_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('Wednesday, April 15')

    expect(sourcesById.get('sc.income_tax')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://dor.sc.gov/news/scdor-statement-income-tax-conformity-april-15-filing-deadline-extended-sc-returns',
    })
    expect(
      findRuleById('sc.individual_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('October 15, 2026')

    expect(sourcesById.get('wy.sales_use_tax')).toMatchObject({
      sourceType: 'publication',
      url: 'https://wyoleg.gov/statutes/compress/title39.pdf',
    })
    expect(findRuleById('wy.sales_use_tax.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'last day of each month',
    )
  })

  it('pins gateway-error concrete draft repairs to short deterministic source text', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('ky.ui_wage_report')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://kcc.ky.gov/Documents/KUIP%20Delimited%20File%20Format%20Reference%20Guide.pdf',
    })
    expect(findRuleById('ky.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'Q1 is due April 30, 2026',
    )

    expect(sourcesById.get('la.ui_wage_report')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://www2.laworks.net/FAQs/FAQ_UI_EmployerTaxes.asp',
    })
    expect(findRuleById('la.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'Quarter end date of 03/31/__ Due date 04/30/__',
    )

    expect(sourcesById.get('nc.pass_through_entity_return')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://www.ncdor.gov/tax-forms/2025-d-403a-partnership-tax-return-instructions/open',
    })
    expect(
      findRuleById('nc.pass_through_entity_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('15th day of the 4th month')

    expect(sourcesById.get('ok.ui_wage_report')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://oklahoma.gov/oesc/employers/tax/wage-reporting.html',
    })
    expect(findRuleById('ok.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'last day of the month following the calendar quarter',
    )

    expect(sourcesById.get('tn.franchise_excise_tax')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://www.tn.gov/revenue/taxes/franchise---excise-tax/due-dates-and-tax-rates.html',
    })
    expect(
      findRuleById('tn.business_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('15th day of the fourth month')

    expect(sourcesById.get('wv.ui_wage_report')).toMatchObject({
      sourceType: 'due_dates',
      url: 'https://workforcewv.org/businesses/unemployment-tax-information/tax-filing-reporting/',
    })
    expect(findRuleById('wv.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'Quarter ending March 31 is due April 30',
    )
  })

  it('tracks Alabama source coverage separately from active rule coverage', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))
    const individualSource = sourcesById.get('al.income_tax')
    const dueDatesSource = sourcesById.get('al.due_dates')
    const businessRule = findRuleById('al.business_income_return.candidate.2026')
    const franchiseRule = findRuleById('al.franchise_or_entity_tax.candidate.2026')
    const individualRule = findRuleById('al.individual_income_return.candidate.2026')

    expect(individualSource?.domains).toEqual(['individual_income_return'])
    expect(individualSource?.entityApplicability).toEqual(['individual'])
    expect(dueDatesSource?.domains).toContain('business_income_return')
    expect(dueDatesSource?.domains).not.toContain('individual_income_return')
    expect(individualRule?.sourceIds).toEqual(['al.income_tax'])
    expect(businessRule?.sourceIds).toEqual(['al.due_dates'])
    expect(franchiseRule?.sourceIds).toEqual(['al.due_dates'])
    expect(franchiseRule?.evidence[0]?.sourceExcerpt).toContain('Business Privilege Tax')
    expect(franchiseRule?.evidence[0]?.sourceExcerpt).toContain('S-Corporation Due no later')
    expect(franchiseRule?.evidence[0]?.sourceExcerpt).not.toMatch(
      /official source registered|templates require practice owner or manager acceptance/i,
    )
    expect(
      individualSource && businessRule
        ? sourceCoversRuleDomain(individualSource, businessRule)
        : false,
    ).toBe(false)
    expect(
      dueDatesSource && individualRule
        ? sourceCoversRuleDomain(dueDatesSource, individualRule)
        : false,
    ).toBe(false)
    expect(
      dueDatesSource && businessRule ? sourceCoversRuleDomain(dueDatesSource, businessRule) : false,
    ).toBe(true)

    const alGaps = listSourceCoverageGaps('AL')
    expect(alGaps).toEqual([])

    const alCoverage = listRequiredSourceCoverage('AL')
    expect(
      alCoverage.find(
        (cell) => cell.domain === 'fiduciary_income_return' && cell.entity === 'trust',
      )?.status,
    ).toBe('source_verified')
    expect(
      alCoverage.find((cell) => cell.domain === 'withholding' && cell.entity === 'llc')?.status,
    ).toBe('source_verified')
    expect(findRuleById('al.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'al.ui_wage_report',
    ])
  })

  it('uses source-backed excerpts for DC candidate rules whose index pages are sparse', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))
    const filingDeadlinesSource = sourcesById.get('dc.tax_filing_deadlines')
    const uiWageSource = sourcesById.get('dc.ui_wage_report')
    const businessRule = findRuleById('dc.business_income_return.candidate.2026')
    const salesRule = findRuleById('dc.sales_use_tax.candidate.2026')
    const uiWageRule = findRuleById('dc.ui_wage_report.candidate.2026')

    expect(filingDeadlinesSource?.domains).toContain('business_income_return')
    expect(filingDeadlinesSource?.domains).toContain('sales_use_tax')
    expect(uiWageSource?.url).toBe('https://does.dc.gov/service/reporting-questions')
    expect(businessRule?.evidence[0]?.sourceExcerpt).toContain('April 15, 2026')
    expect(salesRule?.evidence[0]?.sourceExcerpt).toContain('FR-800M')
    expect(uiWageRule?.evidence[0]?.sourceExcerpt).toContain('Form UC-30')
    expect(uiWageRule?.evidence[0]?.sourceExcerpt).not.toMatch(
      /official source registered|templates require practice owner or manager acceptance/i,
    )
  })

  it('tracks the current Georgia fiduciary booklet as a PDF source', () => {
    const source = RULE_SOURCES.find((item) => item.id === 'ga.fiduciary_income_tax_booklet')
    const rule = findRuleById('ga.fiduciary_income_return.candidate.2026')

    expect(source).toMatchObject({
      acquisitionMethod: 'pdf_watch',
      sourceType: 'instructions',
      domains: ['fiduciary_income_return'],
    })
    expect(source?.url).toContain('2025-501-and-501x-fiduciary-income-tax-instruction-booklet')
    expect(rule?.sourceIds).toEqual(['ga.fiduciary_income_tax_booklet'])
  })

  it('uses current official Hawaii and Idaho source URLs for concrete draft candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('hi.income_tax')).toMatchObject({
      url: 'https://tax.hawaii.gov/tax-year-information/',
      domains: ['individual_income_return'],
    })
    expect(sourcesById.get('hi.individual_estimated_tax')).toMatchObject({
      url: 'https://files.hawaii.gov/tax/legal/taxfacts/tf2019-3.pdf',
      acquisitionMethod: 'pdf_watch',
      domains: ['individual_estimated_tax'],
    })
    expect(sourcesById.get('id.ui_wage_report')).toMatchObject({
      url: 'https://labor.idaho.gov/wp-content/uploads/publications/UI_TAX_Information-1.pdf',
      acquisitionMethod: 'pdf_watch',
      domains: ['ui_wage_report'],
    })

    expect(findRuleById('hi.individual_income_return.candidate.2026')?.sourceIds).toEqual([
      'hi.income_tax',
    ])
    expect(findRuleById('hi.individual_estimated_tax.candidate.2026')?.sourceIds).toEqual([
      'hi.individual_estimated_tax',
    ])
    expect(findRuleById('id.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'id.ui_wage_report',
    ])
  })

  it('uses current official Maine due-date URLs for income and unemployment candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))
    const dueDatesUrl = 'https://www.maine.gov/revenue/tax-return-forms/due-dates'

    expect(sourcesById.get('me.income_tax')).toMatchObject({
      url: dueDatesUrl,
      domains: ['individual_income_return', 'individual_estimated_tax'],
    })
    expect(sourcesById.get('me.ui_wage_report')).toMatchObject({
      url: dueDatesUrl,
      sourceType: 'due_dates',
      domains: ['ui_wage_report'],
    })
    expect(findRuleById('me.individual_estimated_tax.candidate.2026')?.sourceIds).toEqual([
      'me.income_tax',
    ])
    expect(findRuleById('me.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'me.ui_wage_report',
    ])
    expect(
      findRuleById('me.individual_estimated_tax.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('1040ES-ME')
    expect(findRuleById('me.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'ME UC-1',
    )
  })

  it('uses the Kansas tax calendar and unemployment sources', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('ks.tax_calendar')).toMatchObject({
      url: 'https://www.ksrevenue.gov/pub1515.html',
      sourceType: 'calendar',
      domains: expect.arrayContaining(['individual_income_return', 'individual_estimated_tax']),
      entityApplicability: expect.arrayContaining(['individual', 'sole_prop']),
    })
    expect(findRuleById('ks.individual_income_return.candidate.2026')?.sourceIds).toEqual([
      'ks.tax_calendar',
    ])
    expect(findRuleById('ks.individual_estimated_tax.candidate.2026')?.sourceIds).toEqual([
      'ks.tax_calendar',
    ])
    expect(sourcesById.get('ks.ui_wage_report')?.domains).toEqual(['ui_wage_report'])
    expect(
      findRuleById('ks.individual_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('Form K-40')
    expect(
      findRuleById('ks.individual_estimated_tax.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('Form K-40ES')
    expect(findRuleById('ks.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'ks.ui_wage_report',
    ])
    expect(findRuleById('ks.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'quarterly wage reports',
    )
  })

  it('uses focused Kentucky tax calendar excerpts for concrete draft candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('ky.tax_calendar_2026')).toMatchObject({
      title: 'Kentucky DOR 2026 Tax Calendar',
      url: 'https://revenue.ky.gov/News/Pages/Calendars.aspx',
      sourceType: 'calendar',
      domains: expect.arrayContaining(['franchise_or_entity_tax', 'sales_use_tax', 'withholding']),
    })
    expect(findRuleById('ky.franchise_or_entity_tax.candidate.2026')?.sourceIds).toEqual([
      'ky.tax_calendar_2026',
    ])
    expect(findRuleById('ky.sales_use_tax.candidate.2026')?.sourceIds).toEqual([
      'ky.tax_calendar_2026',
    ])
    expect(findRuleById('ky.withholding.candidate.2026')?.sourceIds).toEqual([
      'ky.tax_calendar_2026',
    ])
    expect(
      findRuleById('ky.franchise_or_entity_tax.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('Corporation Income Tax/LLET')
    expect(findRuleById('ky.sales_use_tax.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'Sales Tax (Monthly, Quarterly)',
    )
    expect(findRuleById('ky.withholding.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'Quarterly Income Tax Withholding Return',
    )
  })

  it('uses focused Louisiana filing-date excerpts for concrete draft candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('la.tax_calendar')).toMatchObject({
      title: 'Louisiana Department of Revenue Tax Calendar',
      url: 'https://revenue.louisiana.gov/calendar/2026/',
      sourceType: 'calendar',
      domains: expect.arrayContaining([
        'fiduciary_income_return',
        'business_income_return',
        'business_estimated_tax',
        'pass_through_entity_return',
        'franchise_or_entity_tax',
        'sales_use_tax',
        'withholding',
      ]),
    })
    expect(findRuleById('la.business_income_return.candidate.2026')?.sourceIds).toEqual([
      'la.tax_calendar',
    ])
    expect(findRuleById('la.franchise_or_entity_tax.candidate.2026')?.sourceIds).toEqual([
      'la.tax_calendar',
    ])
    expect(findRuleById('la.sales_use_tax.candidate.2026')?.sourceIds).toEqual(['la.tax_calendar'])
    expect(findRuleById('la.withholding.candidate.2026')?.sourceIds).toEqual(['la.tax_calendar'])
    expect(
      findRuleById('la.business_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('Annual Corporation and Franchise Return')
    expect(
      findRuleById('la.business_estimated_tax.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('April 15, 2026')
    expect(
      findRuleById('la.pass_through_entity_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('May 15th of the following year')
    expect(findRuleById('la.sales_use_tax.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'monthly sales and use tax returns',
    )
    expect(findRuleById('la.withholding.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'L-1 Return',
    )
  })

  it('uses focused Maryland deadline and PTE sources for concrete draft candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('md.tax_deadlines')).toMatchObject({
      url: 'https://www.marylandtaxes.gov/pros/deadlines-and-duedates.php',
      sourceType: 'due_dates',
      domains: expect.arrayContaining(['sales_use_tax', 'withholding']),
    })
    expect(sourcesById.get('md.tax_deadlines')?.domains).not.toContain('pass_through_entity_return')
    expect(sourcesById.get('md.pass_through_entity_tax')).toMatchObject({
      url: 'https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/instructions/2025/pte-booklet-510.pdf',
      acquisitionMethod: 'pdf_watch',
      domains: ['pass_through_entity_return'],
    })
    expect(findRuleById('md.pass_through_entity_return.candidate.2026')?.sourceIds).toEqual([
      'md.pass_through_entity_tax',
    ])
    expect(findRuleById('md.sales_use_tax.candidate.2026')?.sourceIds).toEqual(['md.tax_deadlines'])
    expect(findRuleById('md.withholding.candidate.2026')?.sourceIds).toEqual(['md.tax_deadlines'])
    expect(
      findRuleById('md.pass_through_entity_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('15th day of the 4th month')
    expect(findRuleById('md.sales_use_tax.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      '1st Quarter due April 20',
    )
    expect(findRuleById('md.withholding.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'quarterly income tax withholding returns',
    )
  })

  it('uses the North Carolina sales tax due-date page excerpt', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('nc.sales_use_due_dates')).toMatchObject({
      url: 'https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-filing-requirements-payment-options/filing-frequency-and-due-dates',
      sourceType: 'due_dates',
      domains: ['sales_use_tax'],
    })
    expect(findRuleById('nc.sales_use_tax.candidate.2026')?.sourceIds).toEqual([
      'nc.sales_use_due_dates',
    ])
    expect(findRuleById('nc.sales_use_tax.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      '20th day of each month',
    )
  })

  it('uses current official Mississippi sources for fiduciary and pass-through candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('ms.fiduciary_income_tax')).toMatchObject({
      url: 'https://www.dor.ms.gov/sites/default/files/tax-forms/individual/81100251%201.pdf',
      acquisitionMethod: 'pdf_watch',
      domains: ['fiduciary_income_return'],
    })
    expect(sourcesById.get('ms.pass_through_entity_tax')).toMatchObject({
      url: 'https://www.dor.ms.gov/business/business-tax-frequently-asked-questions#corporate-income-and-franchise-tax',
      sourceType: 'due_dates',
      domains: ['pass_through_entity_return'],
    })
    expect(sourcesById.get('ms.sales_withholding_tax')?.domains).toEqual(['sales_use_tax'])
    expect(sourcesById.get('ms.withholding_tax')).toMatchObject({
      url: 'https://www.dor.ms.gov/business/withholding-tax',
      sourceType: 'due_dates',
      domains: ['withholding'],
    })
    expect(findRuleById('ms.fiduciary_income_return.candidate.2026')?.sourceIds).toEqual([
      'ms.fiduciary_income_tax',
    ])
    expect(findRuleById('ms.pass_through_entity_return.candidate.2026')?.sourceIds).toEqual([
      'ms.pass_through_entity_tax',
    ])
    expect(findRuleById('ms.withholding.candidate.2026')?.sourceIds).toEqual(['ms.withholding_tax'])
    expect(
      findRuleById('ms.fiduciary_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('April 15')
    expect(
      findRuleById('ms.pass_through_entity_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('15th day of the 3rd month')
    expect(findRuleById('ms.withholding.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      '15th day of the month following the period',
    )
  })

  it('uses current official Montana URLs after the tax due dates page moved', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('mt.income_tax')).toMatchObject({
      url: 'https://revenue.mt.gov/taxes/individual-income-tax/',
      domains: ['individual_income_return', 'individual_estimated_tax'],
    })
    expect(sourcesById.get('mt.tax_due_dates')).toMatchObject({
      url: 'https://revenue.mt.gov/taxes/corporate-income-tax',
      domains: ['business_income_return', 'business_estimated_tax'],
    })
    expect(sourcesById.get('mt.fiduciary_income_tax')).toMatchObject({
      url: 'https://revenue.mt.gov/taxes/fiduciaries/estate-and-trust-filing-requirements',
      domains: ['fiduciary_income_return'],
    })
    expect(sourcesById.get('mt.pass_through_entity_tax')).toMatchObject({
      url: 'https://revenue.mt.gov/taxes/pass-through-entities/',
      domains: ['pass_through_entity_return'],
    })
    expect(sourcesById.get('mt.withholding_due_dates')).toMatchObject({
      url: 'https://revenue.mt.gov/taxes/withholding-tax/wage-withholding-returns-and-payments',
      domains: ['withholding'],
    })

    expect(findRuleById('mt.fiduciary_income_return.candidate.2026')?.sourceIds).toEqual([
      'mt.fiduciary_income_tax',
    ])
    expect(findRuleById('mt.business_income_return.candidate.2026')?.sourceIds).toEqual([
      'mt.tax_due_dates',
    ])
    expect(findRuleById('mt.pass_through_entity_return.candidate.2026')?.sourceIds).toEqual([
      'mt.pass_through_entity_tax',
    ])
    expect(findRuleById('mt.withholding.candidate.2026')?.sourceIds).toEqual([
      'mt.withholding_due_dates',
    ])
    expect(
      findRuleById('mt.business_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('May 15')
    expect(findRuleById('mt.withholding.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'January 31',
    )
  })

  it('keeps current official New Hampshire sources registered for business and UI candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('nh.business_tax')).toMatchObject({
      url: 'https://www.revenue.nh.gov/sites/g/files/ehbemt736/files/documents/bt-summary-instructions-2024.pdf',
      acquisitionMethod: 'manual_review',
      domains: [
        'business_income_return',
        'business_estimated_tax',
        'pass_through_entity_return',
        'franchise_or_entity_tax',
      ],
    })
    expect(sourcesById.get('nh.ui_wage_report')).toMatchObject({
      url: 'https://www2.nhes.nh.gov/webtax/File_Employer_Quarterly_Tax_Wage_Report.pdf',
      acquisitionMethod: 'manual_review',
      domains: ['ui_wage_report'],
    })
    expect(findRuleById('nh.business_income_return.candidate.2026')?.sourceIds).toEqual([
      'nh.business_tax',
    ])
    expect(findRuleById('nh.pass_through_entity_return.candidate.2026')?.sourceIds).toEqual([
      'nh.business_tax',
    ])
    expect(findRuleById('nh.franchise_or_entity_tax.candidate.2026')?.sourceIds).toEqual([
      'nh.business_tax',
    ])
    expect(findRuleById('nh.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'nh.ui_wage_report',
    ])
    expect(
      findRuleById('nh.business_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('April 15')
    expect(findRuleById('nh.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'July 31',
    )
  })

  it('uses focused North Dakota deadline pages and excerpts for concrete draft candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('nd.income_tax')).toMatchObject({
      url: 'https://www.tax.nd.gov/news/resources/tax-deadlines/individual-income-tax-deadlines',
      domains: ['individual_income_return', 'individual_estimated_tax'],
    })
    expect(sourcesById.get('nd.fiduciary_tax')).toMatchObject({
      url: 'https://www.tax.nd.gov/business/fiduciary-tax',
      domains: ['fiduciary_income_return'],
    })
    expect(sourcesById.get('nd.s_corp_partnership_tax_deadlines')).toMatchObject({
      url: 'https://www.tax.nd.gov/s-corp-and-partnership-tax-deadlines',
      domains: ['pass_through_entity_return'],
    })
    expect(sourcesById.get('nd.sales_use_tax')).toMatchObject({
      url: 'https://www.tax.nd.gov/sales-and-use-tax-deadlines',
      sourceType: 'due_dates',
    })
    expect(sourcesById.get('nd.withholding_tax')).toMatchObject({
      url: 'https://www.tax.nd.gov/news/resources/tax-deadlines/income-tax-withholding-deadlines',
      sourceType: 'due_dates',
    })

    expect(findRuleById('nd.individual_income_return.candidate.2026')?.sourceIds).toEqual([
      'nd.income_tax',
    ])
    expect(findRuleById('nd.fiduciary_income_return.candidate.2026')?.sourceIds).toEqual([
      'nd.fiduciary_tax',
    ])
    expect(findRuleById('nd.pass_through_entity_return.candidate.2026')?.sourceIds).toEqual([
      'nd.s_corp_partnership_tax_deadlines',
    ])
    expect(
      findRuleById('nd.individual_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('Form ND-1')
    expect(
      findRuleById('nd.business_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('Form 40')
    expect(
      findRuleById('nd.pass_through_entity_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('Form 60')
  })

  it('uses current official Minnesota and Missouri unemployment due-date sources', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('mn.ui_wage_report')).toMatchObject({
      title: 'Minnesota Employer Handbook Reports and Payments Due Dates',
      url: 'https://www.uimn.org/employers/publications/emp-hbook/due-date.jsp',
      sourceType: 'due_dates',
    })
    expect(sourcesById.get('mo.ui_wage_report')).toMatchObject({
      title: 'Missouri Labor Quarterly Reports',
      url: 'https://labor.mo.gov/des/employers/quarterly-reports',
      sourceType: 'due_dates',
    })
  })

  it('uses the California EDD payroll tax calendar for withholding and UI wage candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('ca.edd_required_filings_due_dates')).toMatchObject({
      title: 'California EDD Payroll Tax Calendar',
      url: 'https://edd.ca.gov/en/payroll_taxes/Due_Dates_Calendar/',
      sourceType: 'calendar',
      domains: ['withholding', 'ui_wage_report'],
    })
    expect(findRuleById('ca.withholding.candidate.2026')?.sourceIds).toEqual([
      'ca.edd_required_filings_due_dates',
    ])
    expect(findRuleById('ca.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'ca.edd_required_filings_due_dates',
    ])
    expect(findRuleById('ca.withholding.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'DE 88 (Quarterly)',
    )
    expect(findRuleById('ca.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'DE 9 and DE 9C due April 30, 2026',
    )
  })

  it('uses focused Utah quarterly calendar excerpts for sales and withholding candidates', () => {
    expect(findRuleById('ut.sales_use_tax.candidate.2026')?.sourceIds).toEqual([
      'ut.sales_withholding_due_dates',
    ])
    expect(findRuleById('ut.withholding.candidate.2026')?.sourceIds).toEqual([
      'ut.sales_withholding_due_dates',
    ])
    expect(findRuleById('ut.sales_use_tax.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'Sales and Use (STC)',
    )
    expect(findRuleById('ut.withholding.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'Employer Withholding (WTH)',
    )
  })

  it('uses focused Michigan due-date pages and excerpts for concrete draft candidates', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('mi.income_tax')).toMatchObject({
      title: 'Michigan Treasury 2026 Individual Income Tax Filing Season',
      url: 'https://www.michigan.gov/treasury/news/2026/01/26/individual-income-tax-filing-season-begins-today',
      sourceType: 'due_dates',
      domains: ['individual_income_return'],
    })
    expect(sourcesById.get('mi.individual_estimated_tax')).toMatchObject({
      title: 'Michigan Treasury Quarterly Estimated Tax Payments',
      url: 'https://www.michigan.gov/taxes/questions/iit/accordion/estimate/when-are-the-quarterly-estimated-tax-payments-due-1',
      sourceType: 'due_dates',
      domains: ['individual_estimated_tax'],
    })
    expect(sourcesById.get('mi.corporate_income_tax')).toMatchObject({
      title: 'Michigan Treasury Corporate Income Tax Filing Requirements',
      url: 'https://www.michigan.gov/taxes/business-taxes/cit/detail/michigan-corporate-income-tax-cit/filing-requirements',
      sourceType: 'due_dates',
    })
    expect(sourcesById.get('mi.flow_through_entity_tax')).toMatchObject({
      title: 'Michigan Treasury Flow-Through Entity Tax Due Dates',
      url: 'https://www.michigan.gov/taxes/business-taxes/flowthrough-entity-tax',
      sourceType: 'due_dates',
    })

    expect(findRuleById('mi.individual_income_return.candidate.2026')?.sourceIds).toEqual([
      'mi.income_tax',
    ])
    expect(findRuleById('mi.individual_estimated_tax.candidate.2026')?.sourceIds).toEqual([
      'mi.individual_estimated_tax',
    ])
    expect(findRuleById('mi.business_income_return.candidate.2026')?.sourceIds).toEqual([
      'mi.corporate_income_tax',
    ])
    expect(findRuleById('mi.pass_through_entity_return.candidate.2026')?.sourceIds).toEqual([
      'mi.flow_through_entity_tax',
    ])
    expect(findRuleById('mi.sales_use_tax.candidate.2026')?.sourceIds).toEqual(['mi.sales_use_tax'])
    expect(findRuleById('mi.withholding.candidate.2026')?.sourceIds).toEqual([
      'mi.withholding_due_dates',
    ])
    expect(findRuleById('mi.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'mi.ui_wage_report',
    ])
    expect(
      findRuleById('mi.individual_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('April 15, 2026')
    expect(
      findRuleById('mi.business_estimated_tax.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('July 15')
    expect(
      findRuleById('mi.business_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('April 30, 2026')
    expect(
      findRuleById('mi.pass_through_entity_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('March 31')
    expect(findRuleById('mi.sales_use_tax.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'April 20',
    )
    expect(findRuleById('mi.withholding.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'February 28',
    )
    expect(findRuleById('mi.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'April 25',
    )
  })

  it('uses repaired Vermont, Rhode Island, Pennsylvania, and Ohio source links', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('pa.income_tax')).toMatchObject({
      title: 'Pennsylvania Personal Income Tax Filing Requirements',
      url: 'https://www.pa.gov/agencies/revenue/forms-and-publications/pa-personal-income-tax-guide/brief-overview-and-filing-requirements',
      sourceType: 'due_dates',
    })
    expect(sourcesById.get('oh.income_tax')).toMatchObject({
      title: 'Ohio 2025 Individual Income Tax IT 1040 and SD 100 Instructions',
      url: 'https://dam.assets.ohio.gov/image/upload/v1735920104/tax.ohio.gov/forms/ohio_individual/individual/2025/it1040-booklet.pdf',
      acquisitionMethod: 'pdf_watch',
    })
    expect(sourcesById.get('vt.individual_estimated_tax')).toMatchObject({
      url: 'https://tax.vermont.gov/sites/tax/files/documents/IN-114-Instr-2025.pdf',
      domains: ['individual_estimated_tax'],
    })
    expect(sourcesById.get('vt.corporate_income_tax')).toMatchObject({
      url: 'https://tax.vermont.gov/sites/tax/files/documents/CO-411-Instr.pdf',
      domains: ['business_income_return', 'business_estimated_tax'],
      entityApplicability: ['llc', 'partnership', 's_corp', 'c_corp'],
    })
    expect(sourcesById.get('ri.fiduciary_income_tax')).toMatchObject({
      url: 'https://tax.ri.gov/tax-sections/personal-income-tax/fiduciary-tax-filing-requirements',
      domains: ['fiduciary_income_return'],
      sourceType: 'due_dates',
    })

    expect(findRuleById('vt.individual_estimated_tax.candidate.2026')?.sourceIds).toEqual([
      'vt.individual_estimated_tax',
    ])
    expect(findRuleById('vt.fiduciary_income_return.candidate.2026')?.sourceIds).toEqual([
      'vt.fiduciary_income_tax',
    ])
    expect(findRuleById('vt.business_income_return.candidate.2026')?.sourceIds).toEqual([
      'vt.corporate_income_tax',
    ])
    expect(findRuleById('vt.pass_through_entity_return.candidate.2026')?.sourceIds).toEqual([
      'vt.pass_through_entity_tax',
    ])
    expect(findRuleById('ri.fiduciary_income_return.candidate.2026')?.sourceIds).toEqual([
      'ri.fiduciary_income_tax',
    ])

    expect(
      findRuleById('pa.individual_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('April 15')
    expect(
      findRuleById('oh.individual_estimated_tax.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('January 15, 2027')
    expect(
      findRuleById('ri.business_income_return.candidate.2026')?.evidence[0]?.sourceExcerpt,
    ).toContain('fifteenth day of the fourth month')
    expect(findRuleById('vt.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'April 30',
    )
  })

  it('uses the Tennessee UI delinquent-cycle page only for its embedded due-date rule', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('tn.ui_wage_report')).toMatchObject({
      title: 'Tennessee Unemployment Quarterly Report Due Date and Delinquent Cycle',
      url: 'https://lwdsupport.tn.gov/hc/en-us/articles/360001003928-What-is-delinquent-cycle',
      sourceType: 'due_dates',
      domains: ['ui_wage_report'],
    })
    expect(findRuleById('tn.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'tn.ui_wage_report',
    ])
    expect(findRuleById('tn.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'quarterly unemployment report becomes due at the end of the next month',
    )
  })

  it('uses repaired Nebraska and Nevada unemployment due-date sources', () => {
    const sourcesById = new Map(RULE_SOURCES.map((source) => [source.id, source]))

    expect(sourcesById.get('ne.ui_wage_report')).toMatchObject({
      title: 'Nebraska Employer Tax Services User Guide Tax and Wage Reports',
      url: 'https://dol.nebraska.gov/webdocs/Resources/Items/1_Employers_Services_User_Guide%20Edited%20Version.pdf',
      sourceType: 'due_dates',
      domains: ['ui_wage_report'],
    })
    expect(sourcesById.get('nv.ui_wage_report')).toMatchObject({
      title: 'Nevada DETR Quarterly Reporting Information',
      url: 'https://detr.nv.gov/Page/NUI_View_Quarterly_Reporting_Info',
      sourceType: 'due_dates',
      domains: ['ui_wage_report'],
    })
    expect(findRuleById('ne.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'ne.ui_wage_report',
    ])
    expect(findRuleById('nv.ui_wage_report.candidate.2026')?.sourceIds).toEqual([
      'nv.ui_wage_report',
    ])
    expect(findRuleById('ne.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'due by the end of the month following each quarter end date',
    )
    expect(findRuleById('nv.ui_wage_report.candidate.2026')?.evidence[0]?.sourceExcerpt).toContain(
      'April 30, 2026',
    )
  })

  it('treats no-tax source matrix cells as not applicable for completed source packs', () => {
    for (const jurisdiction of [
      'CA',
      'NY',
      'TX',
      'FL',
      'WA',
      'GA',
      'IL',
      'MA',
      'NJ',
      'PA',
      'NC',
      'VA',
      'AZ',
      'CO',
      'MI',
      'OH',
      'OR',
      'SC',
      'TN',
      'UT',
      'WI',
      'AK',
      'AR',
      'CT',
      'DE',
      'DC',
      'HI',
      'ID',
      'IN',
      'IA',
      'KS',
      'KY',
      'LA',
      'ME',
      'MD',
      'MN',
      'MS',
      'MO',
      'MT',
      'NE',
      'NV',
      'NH',
      'NM',
      'ND',
      'OK',
      'RI',
      'SD',
      'VT',
      'WV',
      'WY',
    ] as const) {
      expect(listSourceCoverageGaps(jurisdiction), `${jurisdiction} should have no gaps`).toEqual(
        [],
      )
    }

    const txCoverage = listRequiredSourceCoverage('TX')
    expect(
      txCoverage.find(
        (cell) => cell.domain === 'individual_income_return' && cell.entity === 'individual',
      )?.status,
    ).toBe('not_applicable')
    expect(
      txCoverage.find((cell) => cell.domain === 'withholding' && cell.entity === 'llc')?.status,
    ).toBe('not_applicable')
    expect(
      txCoverage.find((cell) => cell.domain === 'sales_use_tax' && cell.entity === 'llc')?.status,
    ).toBe('source_verified')
    expect(
      txCoverage.find((cell) => cell.domain === 'ui_wage_report' && cell.entity === 'llc')?.status,
    ).toBe('source_registered')

    expect(findRuleById('tx.individual_income_return.candidate.2026')).toBeUndefined()
    expect(findRuleById('tx.withholding.candidate.2026')).toBeUndefined()
    expect(findRuleById('fl.franchise_or_entity_tax.candidate.2026')).toBeUndefined()
    expect(findRuleById('wa.business_income_return.candidate.2026')).toBeUndefined()

    const paCoverage = listRequiredSourceCoverage('PA')
    expect(
      paCoverage.find((cell) => cell.domain === 'franchise_or_entity_tax' && cell.entity === 'llc')
        ?.status,
    ).toBe('not_applicable')
    const vaCoverage = listRequiredSourceCoverage('VA')
    expect(
      vaCoverage.find(
        (cell) => cell.domain === 'business_income_return' && cell.entity === 's_corp',
      )?.status,
    ).toBe('not_applicable')
    const azCoverage = listRequiredSourceCoverage('AZ')
    expect(
      azCoverage.find(
        (cell) => cell.domain === 'business_estimated_tax' && cell.entity === 's_corp',
      )?.status,
    ).toBe('not_applicable')

    const coCoverage = listRequiredSourceCoverage('CO')
    expect(
      coCoverage.find((cell) => cell.domain === 'franchise_or_entity_tax' && cell.entity === 'llc')
        ?.status,
    ).toBe('not_applicable')
    const ohCoverage = listRequiredSourceCoverage('OH')
    expect(
      ohCoverage.find(
        (cell) => cell.domain === 'business_income_return' && cell.entity === 'c_corp',
      )?.status,
    ).toBe('not_applicable')
    const orCoverage = listRequiredSourceCoverage('OR')
    expect(
      orCoverage.find((cell) => cell.domain === 'sales_use_tax' && cell.entity === 'llc')?.status,
    ).toBe('not_applicable')
    const tnCoverage = listRequiredSourceCoverage('TN')
    expect(
      tnCoverage.find((cell) => cell.domain === 'withholding' && cell.entity === 'llc')?.status,
    ).toBe('not_applicable')
    const utCoverage = listRequiredSourceCoverage('UT')
    expect(
      utCoverage.find(
        (cell) => cell.domain === 'individual_estimated_tax' && cell.entity === 'individual',
      )?.status,
    ).toBe('not_applicable')
    expect(
      utCoverage.find(
        (cell) => cell.domain === 'franchise_or_entity_tax' && cell.entity === 's_corp',
      )?.status,
    ).toBe('not_applicable')
    const wiCoverage = listRequiredSourceCoverage('WI')
    expect(
      wiCoverage.find(
        (cell) => cell.domain === 'business_estimated_tax' && cell.entity === 's_corp',
      )?.status,
    ).toBe('not_applicable')

    const akCoverage = listRequiredSourceCoverage('AK')
    expect(
      akCoverage.find(
        (cell) => cell.domain === 'individual_estimated_tax' && cell.entity === 'individual',
      )?.status,
    ).toBe('not_applicable')
    expect(
      akCoverage.find((cell) => cell.domain === 'sales_use_tax' && cell.entity === 'llc')?.status,
    ).toBe('not_applicable')
    expect(findRuleById('ak.individual_income_return.candidate.2026')).toBeUndefined()
    expect(findRuleById('ak.sales_use_tax.candidate.2026')).toBeUndefined()
    expect(findRuleById('ak.business_income_return.candidate.2026')).toMatchObject({
      sourceIds: ['ak.corporate_income_tax'],
      entityApplicability: ['c_corp'],
    })

    const deCoverage = listRequiredSourceCoverage('DE')
    expect(
      deCoverage.find((cell) => cell.domain === 'sales_use_tax' && cell.entity === 'llc')?.status,
    ).toBe('not_applicable')
    expect(findRuleById('de.sales_use_tax.candidate.2026')).toBeUndefined()

    const nvCoverage = listRequiredSourceCoverage('NV')
    expect(
      nvCoverage.find(
        (cell) => cell.domain === 'business_income_return' && cell.entity === 'c_corp',
      )?.status,
    ).toBe('not_applicable')
    expect(findRuleById('nv.business_income_return.candidate.2026')).toBeUndefined()
    expect(findRuleById('nv.franchise_or_entity_tax.candidate.2026')?.sourceIds).toEqual([
      'nv.commerce_tax',
    ])

    const nhCoverage = listRequiredSourceCoverage('NH')
    expect(
      nhCoverage.find((cell) => cell.domain === 'sales_use_tax' && cell.entity === 'llc')?.status,
    ).toBe('not_applicable')
    expect(findRuleById('nh.sales_use_tax.candidate.2026')).toBeUndefined()

    const okCoverage = listRequiredSourceCoverage('OK')
    expect(
      okCoverage.find((cell) => cell.domain === 'franchise_or_entity_tax' && cell.entity === 'llc')
        ?.status,
    ).toBe('not_applicable')
    expect(findRuleById('ok.franchise_or_entity_tax.candidate.2026')).toBeUndefined()

    const wyCoverage = listRequiredSourceCoverage('WY')
    expect(
      wyCoverage.find((cell) => cell.domain === 'withholding' && cell.entity === 'llc')?.status,
    ).toBe('not_applicable')
    expect(findRuleById('wy.withholding.candidate.2026')).toBeUndefined()
    expect(findRuleById('wy.franchise_or_entity_tax.candidate.2026')?.sourceIds).toEqual([
      'wy.annual_license_tax',
    ])
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
    expect(normalizeRuleTaxTypeCandidates('ma_state_business_income_franchise_tax')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taxType: 'ma_state_business_income_tax',
          requiresReview: true,
        }),
        expect.objectContaining({
          taxType: 'ma_state_franchise_or_entity_tax',
          requiresReview: true,
        }),
      ]),
    )
    expect(normalizeRuleTaxTypeCandidates('ca_100_franchise')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ taxType: 'ca_100' }),
        expect.objectContaining({ taxType: 'ca_state_business_income_tax' }),
        expect.objectContaining({ taxType: 'ca_state_franchise_or_entity_tax' }),
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
    const payrollDepositRule = findRuleById('fed.payroll_deposit.monthly.2026')
    expect(payrollDepositRule?.sourceIds).toEqual(['fed.irs_pub_15_2026', 'fed.irs_pub_509_2026'])
    expect(payrollDepositRule?.evidence[0]).toMatchObject({
      sourceId: 'fed.irs_pub_15_2026',
      sourceExcerpt: expect.stringContaining('January wages are due February 17'),
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

  it('uses Florida corporate due-date PDF as the primary concrete-draft source', () => {
    const returnRule = findRuleById('fl.f1120.return.2025')
    const estimatedRule = findRuleById('fl.cit.estimated_tax.2026')

    expect(returnRule?.sourceIds).toEqual(['fl.cit_due_dates_2026', 'fl.cit'])
    expect(returnRule?.evidence[0]).toMatchObject({
      sourceId: 'fl.cit_due_dates_2026',
      sourceExcerpt: expect.stringContaining('12/31/25 05/01/26'),
    })
    expect(estimatedRule?.sourceIds).toEqual(['fl.cit_due_dates_2026', 'fl.cit'])
    expect(estimatedRule?.evidence[0]).toMatchObject({
      sourceId: 'fl.cit_due_dates_2026',
      sourceExcerpt: expect.stringContaining('12/31/26 06/01/26 06/30/26 09/30/26 12/31/26'),
    })
  })
})
