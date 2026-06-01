import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import {
  isParserBackedRuleSource,
  listHiddenPolicyWatchSources,
  listRuleSources,
  type RuleSource,
} from '@duedatehq/core/rules'
import { livePulseAdapters } from '@duedatehq/ingest/adapters'
import {
  createPolicyWatchAdapter,
  createTemporaryAnnouncementAdapter,
  createRuleSourceAdapter,
  hiddenPolicyWatchAdapters,
  isHiddenPolicyWatchSourceId,
  isPolicyWatchAdapterEligible,
  isPolicyWatchPulsePromoted,
  isRuleSourceAdapterEligible,
  isRuleSourcePulsePromoted,
  isTemporaryAnnouncementAdapterEligible,
  listAlertSourceCatalog,
  listAlertSourceCoverage,
  liveRegulatorySourceAdapters,
  requiresReviewOnlyPulseAlert,
  ruleSourceAdapters,
  shouldForceReviewOnlyPulseAlert,
  temporaryAnnouncementSourceAdapters,
  visibleRegulatorySourceAdapters,
} from './rule-source-adapters'

describe('rule source adapters', () => {
  async function createPdfBytes(text: string): Promise<ArrayBuffer> {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([500, 160])
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    page.drawText(text, {
      x: 24,
      y: 96,
      size: 12,
      font,
    })
    const bytes = await pdf.save()
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    return buffer
  }

  it('adds adapters for parser-backed candidate-review rule sources without duplicating live adapters', () => {
    const liveIds = new Set(livePulseAdapters.map((adapter) => adapter.id))
    const candidateReviewSources = listRuleSources()
      .filter((source) => source.notificationChannels.includes('practice_rule_review'))
      .filter(isParserBackedRuleSource)
      .filter((source) => !liveIds.has(source.id))
      .filter(isRuleSourceAdapterEligible)

    expect(ruleSourceAdapters.map((adapter) => adapter.id).toSorted()).toEqual(
      candidateReviewSources.map((source) => source.id).toSorted(),
    )
    expect(visibleRegulatorySourceAdapters).toHaveLength(
      livePulseAdapters.length +
        candidateReviewSources.length +
        temporaryAnnouncementSourceAdapters.length,
    )
    // liveRegulatorySourceAdapters is deduped by id AND by resolved fetch URL, so
    // it is a subset of (visible + hidden): redundant same-URL watchers (e.g. a
    // state's temporary-announcement page also registered as a policy-watch
    // source) collapse to one. It must never grow past the id-deduped union.
    expect(liveRegulatorySourceAdapters.length).toBeLessThanOrEqual(
      visibleRegulatorySourceAdapters.length + hiddenPolicyWatchAdapters.length,
    )
    // URL dedup actually removed something — the layers do share URLs today.
    expect(liveRegulatorySourceAdapters.length).toBeLessThan(
      visibleRegulatorySourceAdapters.length + hiddenPolicyWatchAdapters.length,
    )
    // Ids are unique.
    expect(new Set(liveRegulatorySourceAdapters.map((adapter) => adapter.id)).size).toBe(
      liveRegulatorySourceAdapters.length,
    )
    // Every explicit hand-tuned live adapter survives dedup (highest priority).
    const liveIdSet = new Set(liveRegulatorySourceAdapters.map((adapter) => adapter.id))
    for (const adapter of livePulseAdapters) {
      expect(liveIdSet.has(adapter.id), adapter.id).toBe(true)
    }
  })

  it('adds hidden national policy-watch adapters without exposing them as visible sources', async () => {
    const hiddenSources = listHiddenPolicyWatchSources()
    const eligibleHiddenSources = hiddenSources.filter(isPolicyWatchAdapterEligible)
    const visibleAdapterIds = new Set(visibleRegulatorySourceAdapters.map((adapter) => adapter.id))
    const publicSourceIds = new Set(listRuleSources().map((source) => source.id))

    expect(hiddenSources).toHaveLength(52)
    expect(hiddenPolicyWatchAdapters.map((adapter) => adapter.id).toSorted()).toEqual(
      eligibleHiddenSources.map((source) => source.id).toSorted(),
    )

    // Resolved fetch URL per id, mirroring fetchUrlForAdapterId in the module:
    // registry/hidden sources fetch feedUrl ?? url with `{year}` resolved.
    const resolveYear = (url: string) =>
      url.includes('{year}') ? url.replaceAll('{year}', String(new Date().getUTCFullYear())) : url
    const urlBySourceId = new Map<string, string>()
    for (const source of listRuleSources()) {
      urlBySourceId.set(source.id, resolveYear(source.feedUrl ?? source.url))
    }
    for (const source of hiddenSources) {
      urlBySourceId.set(source.id, resolveYear(source.feedUrl ?? source.url))
    }
    // URLs already claimed by a higher-priority (visible) adapter.
    const visibleUrls = new Set(
      visibleRegulatorySourceAdapters
        .map((adapter) => urlBySourceId.get(adapter.id))
        .filter((url): url is string => Boolean(url)),
    )
    const liveIds = new Set(liveRegulatorySourceAdapters.map((candidate) => candidate.id))
    const seenLiveUrls = new Set<string>()
    for (const adapter of liveRegulatorySourceAdapters) {
      const url = urlBySourceId.get(adapter.id)
      if (url) seenLiveUrls.add(url)
    }

    for (const adapter of hiddenPolicyWatchAdapters) {
      expect(isHiddenPolicyWatchSourceId(adapter.id), adapter.id).toBe(true)
      expect(visibleAdapterIds.has(adapter.id), adapter.id).toBe(false)
      expect(publicSourceIds.has(adapter.id), adapter.id).toBe(false)
      const url = urlBySourceId.get(adapter.id)
      // A hidden policy-watch adapter is driven by cron only when no
      // higher-priority watcher already fetches the same URL; otherwise it is
      // intentionally deduped out (the visible watcher covers that page).
      if (url && visibleUrls.has(url)) {
        expect(liveIds.has(adapter.id), `${adapter.id} should be deduped out`).toBe(false)
      } else {
        expect(liveIds.has(adapter.id), `${adapter.id} should be live`).toBe(true)
      }
    }
    // No two live adapters fetch the same URL.
    expect(seenLiveUrls.size).toBe(
      liveRegulatorySourceAdapters.filter((adapter) => urlBySourceId.get(adapter.id)).length,
    )

    const source = hiddenSources.find((candidate) => candidate.jurisdiction === 'AZ')!
    expect(source.feedUrl).toBe('https://azdor.gov/news-center')
    const adapter = createPolicyWatchAdapter(source)
    expect(requiresReviewOnlyPulseAlert(adapter.id)).toBe(false)
    const ohioSource = hiddenSources.find((candidate) => candidate.jurisdiction === 'OH')!
    expect(requiresReviewOnlyPulseAlert(ohioSource.id)).toBe(false)
    const items = await adapter.parse(
      {
        sourceId: source.id,
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        contentHash: 'hash',
        r2Key: 'raw.xml',
        contentType: 'application/rss+xml',
        etag: null,
        lastModified: null,
        body: `<rss><channel><item><title>TPT Filer - Please Submit Your Return</title><link>https://azdor.gov/news/tpt-filer</link><pubDate>Wed, 08 Apr 2026 00:00:00 GMT</pubDate><description>Taxpayers can file now and schedule payments up until the deadline.</description></item></channel></rss>`,
      },
      {
        fetch: async () => new Response(''),
        async archiveRaw() {
          return { r2Key: 'unused', contentHash: 'unused' }
        },
      },
    )

    expect(items[0]).toMatchObject({
      sourceId: 'policy-watch.az.announcements',
      title: 'TPT Filer - Please Submit Your Return',
      officialSourceUrl: 'https://azdor.gov/news/tpt-filer',
      jurisdiction: 'AZ',
    })
  })

  it('keeps hidden policy-watch list noise and PDF index fallback out of extract', async () => {
    const hiddenSources = listHiddenPolicyWatchSources()
    const automatedSource = hiddenSources.find((source) => isPolicyWatchPulsePromoted(source))!
    const automatedAdapter = createPolicyWatchAdapter(automatedSource)
    const noisyItems = await automatedAdapter.parse(
      {
        sourceId: automatedSource.id,
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        contentHash: 'hash',
        r2Key: 'raw.html',
        contentType: 'text/html',
        etag: null,
        lastModified: null,
        body: '<main><a href="/news/webinar">Sales tax webinar for small businesses</a></main>',
      },
      {
        fetch: async () => new Response(''),
        async archiveRaw() {
          return { r2Key: 'unused', contentHash: 'unused' }
        },
      },
    )
    expect(automatedAdapter.allowEmptyParse).toBe(true)
    expect(noisyItems).toEqual([])

    const pdfSource = hiddenSources.find((source) => source.jurisdiction === 'PA')!
    const pdfAdapter = createPolicyWatchAdapter(pdfSource)
    expect(isPolicyWatchAdapterEligible(pdfSource), pdfSource.id).toBe(true)
    expect(isPolicyWatchPulsePromoted(pdfSource), pdfSource.id).toBe(false)
    expect(requiresReviewOnlyPulseAlert(pdfAdapter.id)).toBe(false)
    const signalItems = await pdfAdapter.parse(
      {
        sourceId: pdfSource.id,
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        contentHash: 'hash',
        r2Key: 'raw.pdf',
        contentType: 'application/pdf',
        etag: null,
        lastModified: null,
        body: 'PDF relief bulletin',
      },
      {
        fetch: async () => new Response(''),
        async archiveRaw() {
          return { r2Key: 'unused', contentHash: 'unused' }
        },
      },
    )
    expect(signalItems).toEqual([])

    const taxUpdatePdfBytes = await createPdfBytes(
      'PA Tax Update changes quarterly filing guidance',
    )
    const fetchedPdfUrls: string[] = []
    const taxUpdateItems = await pdfAdapter.parse(
      {
        sourceId: pdfSource.id,
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        contentHash: 'hash',
        r2Key: 'raw.html',
        contentType: 'text/html',
        etag: null,
        lastModified: null,
        body: '<main><a href="/content/dam/copapwp-pagov/en/revenue/documents/tax-update/2026/pa-tax-update-march-april-2026.pdf">PA Tax Update - March/April 2026</a></main>',
      },
      {
        fetch: async (input) => {
          fetchedPdfUrls.push(String(input))
          return new Response(taxUpdatePdfBytes, {
            headers: { 'content-type': 'application/pdf' },
          })
        },
        async archiveRaw() {
          return { r2Key: 'unused', contentHash: 'unused' }
        },
      },
    )
    expect(fetchedPdfUrls).toEqual([
      'https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/tax-update/2026/pa-tax-update-march-april-2026.pdf',
    ])
    expect(taxUpdateItems[0]).toMatchObject({
      sourceId: 'policy-watch.pa.announcements',
      title: 'PA Tax Update - March/April 2026',
      officialSourceUrl:
        'https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/tax-update/2026/pa-tax-update-march-april-2026.pdf',
    })
    expect(taxUpdateItems[0]?.rawText).toContain('quarterly filing guidance')
  })

  it('adds web-first temporary announcement adapters through the aggregate feed interface', async () => {
    const sources = listRuleSources().filter(isTemporaryAnnouncementAdapterEligible)
    const jurisdictions = new Set(sources.map((source) => source.jurisdiction))

    expect(temporaryAnnouncementSourceAdapters.map((adapter) => adapter.id).toSorted()).toEqual(
      sources.map((source) => source.id).toSorted(),
    )
    expect(sources.length).toBeGreaterThanOrEqual(50)
    expect(jurisdictions.has('FED')).toBe(true)
    expect(
      new Set(
        sources
          .filter((source) => source.jurisdiction !== 'FED')
          .map((source) => source.jurisdiction),
      ).size,
    ).toBe(51)
    expect(sources.map((source) => source.id)).toEqual(
      expect.arrayContaining([
        'az.temporary_announcements',
        'co.temporary_announcements',
        'nh.temporary_announcements',
        'oh.sales_tax_rate_changes',
        'pa.temporary_announcements',
        'wy.temporary_announcements',
      ]),
    )
    expect(sources.map((source) => source.id)).not.toContain('oh.temporary_announcements')

    const source = sources.find((candidate) => candidate.id === 'az.temporary_announcements')!
    expect(source).toMatchObject({
      adapterKind: 'rss_or_announcement_list',
      feedUrl: 'https://azdor.gov/news-center',
    })
    expect(
      sources.find((candidate) => candidate.id === 'ak.temporary_announcements'),
    ).toMatchObject({
      title: 'Alaska Tax Division News',
      url: 'https://tax.alaska.gov/programs/whatsnew.aspx',
    })
    expect(
      sources.find((candidate) => candidate.id === 'nh.temporary_announcements'),
    ).toMatchObject({
      title: 'New Hampshire DRA News and Media',
      url: 'https://www.revenue.nh.gov/news-and-media',
      acquisitionMethod: 'html_watch',
    })
    expect(
      sources.find((candidate) => candidate.id === 'vt.temporary_announcements'),
    ).toMatchObject({
      title: 'Vermont Department of Taxes News',
      url: 'https://tax.vermont.gov/news',
      acquisitionMethod: 'html_watch',
    })
    expect(
      sources.find((candidate) => candidate.id === 'wy.temporary_announcements'),
    ).toMatchObject({
      title: 'Wyoming Excise Tax Division Taxing Issues',
      url: 'https://excise-tax-div.wyo.gov/newsletter-taxing-issues',
      adapterKind: 'html_announcement_list',
    })
    const items = await createTemporaryAnnouncementAdapter(source).parse(
      {
        sourceId: source.id,
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        contentHash: 'hash',
        r2Key: 'raw.xml',
        contentType: 'application/rss+xml',
        etag: null,
        lastModified: null,
        body: `<rss><channel><item><title>TPT Filer - Please Submit Your Return</title><link>https://azdor.gov/news/tpt-filer</link><pubDate>Wed, 08 Apr 2026 00:00:00 GMT</pubDate><description>Taxpayers can file now and schedule payments up until the deadline.</description></item></channel></rss>`,
      },
      {
        fetch: async () => new Response(''),
        async archiveRaw() {
          return { r2Key: 'unused', contentHash: 'unused' }
        },
      },
    )

    expect(items[0]).toMatchObject({
      sourceId: 'az.temporary_announcements',
      title: 'TPT Filer - Please Submit Your Return',
      officialSourceUrl: 'https://azdor.gov/news/tpt-filer',
      jurisdiction: 'AZ',
    })
  })

  it('extracts Wyoming Taxing Issues PDF text through the temporary adapter', async () => {
    const source = listRuleSources().find(
      (candidate) => candidate.id === 'wy.temporary_announcements',
    )!
    const pdfBytes = await createPdfBytes('Wyoming sales tax due date guidance changed')
    const fetchedUrls: string[] = []

    const items = await createTemporaryAnnouncementAdapter(source).parse(
      {
        sourceId: source.id,
        fetchedAt: new Date('2026-06-01T00:00:00.000Z'),
        contentHash: 'hash',
        r2Key: 'raw.html',
        contentType: 'text/html',
        etag: null,
        lastModified: null,
        body: [
          '<a href="https://excise-tax-div.wyo.gov/salesuselodging-tax/salesuselodging-returns">Returns</a>',
          '<a href="https://drive.google.com/file/d/1VrvUS6LeG1m3g3IeGJ9DW1zwlAtkfdqU/view?usp=drive_link">03-2026 Taxing Issues</a>',
        ].join(''),
      },
      {
        async fetch(input) {
          fetchedUrls.push(String(input))
          return new Response(pdfBytes, {
            headers: {
              'content-type': 'application/octet-stream',
              'content-disposition': 'attachment; filename="03-2026Taxing Issues.pdf"',
            },
          })
        },
        async archiveRaw() {
          return { r2Key: 'unused', contentHash: 'unused' }
        },
      },
    )

    expect(fetchedUrls).toEqual([
      'https://drive.google.com/uc?export=download&id=1VrvUS6LeG1m3g3IeGJ9DW1zwlAtkfdqU',
    ])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      sourceId: 'wy.temporary_announcements',
      title: '03-2026 Taxing Issues',
      officialSourceUrl: 'https://drive.google.com/file/d/1VrvUS6LeG1m3g3IeGJ9DW1zwlAtkfdqU/view',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      jurisdiction: 'WY',
    })
    expect(items[0]?.rawText).toContain('Wyoming sales tax due date guidance')
  })

  it('promotes parser-backed manual-review and PDF sources as due-date candidate adapters', () => {
    const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))
    const automatedIds = ruleSourceAdapters.map((adapter) => adapter.id)

    for (const sourceId of [
      'ca.income_tax',
      'dc.income_tax',
      'wa.esd_quarterly_tax_wage_reports',
    ]) {
      const source = sourcesById.get(sourceId)
      expect(source?.acquisitionMethod, sourceId).toBe('manual_review')
      expect(isRuleSourceAdapterEligible(source!), sourceId).toBe(true)
      expect(isRuleSourcePulsePromoted(source!), sourceId).toBe(false)
      expect(requiresReviewOnlyPulseAlert(sourceId), sourceId).toBe(false)
      expect(automatedIds, sourceId).toContain(sourceId)
    }

    const watchSource = sourcesById.get('tx.temporary_announcements')
    expect(watchSource?.authorityRole).toBe('watch')
    expect(isRuleSourceAdapterEligible(watchSource!)).toBe(false)

    const pdfSource = sourcesById.get('fl.income_tax')
    expect(pdfSource?.acquisitionMethod).toBe('pdf_watch')
    expect(isRuleSourceAdapterEligible(pdfSource!)).toBe(true)
    expect(isRuleSourcePulsePromoted(pdfSource!)).toBe(false)
    expect(requiresReviewOnlyPulseAlert('fl.income_tax')).toBe(false)
  })

  it('keeps non-tax early-signal sources review-only', () => {
    expect(requiresReviewOnlyPulseAlert('fema.declarations')).toBe(true)
    expect(requiresReviewOnlyPulseAlert('govdelivery.inbound')).toBe(true)
    expect(requiresReviewOnlyPulseAlert('govdelivery.inbound.unmatched')).toBe(true)
    expect(requiresReviewOnlyPulseAlert('ny.email_services')).toBe(false)
    expect(
      shouldForceReviewOnlyPulseAlert({
        sourceId: 'ca.cdtfa_sales_use_filing_dates',
        changeKind: 'source_status',
      }),
    ).toBe(true)
    expect(
      shouldForceReviewOnlyPulseAlert({
        sourceId: 'ca.cdtfa_sales_use_filing_dates',
        changeKind: 'deadline_shift',
      }),
    ).toBe(false)
  })

  it('reports strict national Alert source coverage by jurisdiction instead of raw adapter totals', () => {
    const coverage = listAlertSourceCoverage()
    const byJurisdiction = new Map(coverage.map((row) => [row.jurisdiction, row]))

    expect(coverage).toHaveLength(52)
    expect(coverage.every((row) => row.status === 'covered')).toBe(true)
    expect(coverage.every((row) => row.primaryWebSourceIds.length > 0)).toBe(true)
    expect(coverage.every((row) => row.parserStatus === 'web_primary')).toBe(true)
    expect(coverage.filter((row) => row.coverageLevel === 'comprehensive').length).toBeLessThan(52)

    expect(byJurisdiction.get('FED')).toMatchObject({
      coverageLevel: 'comprehensive',
      parserStatus: 'web_primary',
      coveredRoles: expect.arrayContaining([
        'primary_web_news',
        'guidance_notice',
        'email_signal',
        'rule_source_watch',
        'tax_type_sources',
        'relief_or_disaster_signal',
        'multi_agency_sources',
      ]),
      explicitLiveSourceIds: expect.arrayContaining([
        'irs.disaster',
        'irs.newsroom',
        'irs.guidance',
        'irs.tips',
        'fema.declarations',
      ]),
      emailSignalSourceIds: expect.arrayContaining(['fed.irs_newswire']),
    })
    expect(byJurisdiction.get('CA')).toMatchObject({
      coverageLevel: 'comprehensive',
      parserStatus: 'web_primary',
      coveredRoles: expect.arrayContaining(['multi_agency_sources']),
      explicitLiveSourceIds: expect.arrayContaining([
        'ca.ftb.newsroom',
        'ca.ftb.tax_news',
        'ca.cdtfa.news',
      ]),
      emailSignalSourceIds: expect.arrayContaining(['ca.ftb_tax_news']),
      ruleSourceWatchIds: expect.arrayContaining(['ca.cdtfa_sales_use_filing_dates']),
    })
    expect(byJurisdiction.get('TX')).toMatchObject({
      coverageLevel: 'standard',
      parserStatus: 'web_primary',
      coveredRoles: expect.arrayContaining(['multi_agency_sources']),
      missingRoles: expect.arrayContaining(['relief_or_disaster_signal']),
      explicitLiveSourceIds: expect.arrayContaining(['tx.cpa.rss']),
      emailSignalSourceIds: expect.arrayContaining(['tx.temporary_announcements']),
      ruleSourceWatchIds: expect.arrayContaining(['tx.ui_wage_report_due_dates']),
      reliefOrDisasterSourceIds: [],
    })
    expect(byJurisdiction.get('WA')).toMatchObject({
      coverageLevel: 'standard',
      parserStatus: 'web_primary',
      coveredRoles: expect.arrayContaining(['multi_agency_sources']),
      missingRoles: expect.arrayContaining(['relief_or_disaster_signal']),
      explicitLiveSourceIds: expect.arrayContaining(['wa.dor.news', 'wa.dor.whats_new']),
      emailSignalSourceIds: expect.arrayContaining(['wa.news']),
      ruleSourceWatchIds: expect.arrayContaining(['wa.esd_quarterly_tax_wage_reports']),
    })
    expect(byJurisdiction.get('NY')).toMatchObject({
      missingRoles: expect.arrayContaining(['relief_or_disaster_signal', 'multi_agency_sources']),
      emailSignalSourceIds: expect.arrayContaining(['ny.email_services']),
    })
    expect(byJurisdiction.get('FL')).toMatchObject({
      missingRoles: expect.arrayContaining(['relief_or_disaster_signal', 'multi_agency_sources']),
      emailSignalSourceIds: expect.arrayContaining(['fl.tips']),
    })
    expect(byJurisdiction.get('MA')).toMatchObject({
      missingRoles: expect.arrayContaining(['relief_or_disaster_signal', 'multi_agency_sources']),
      emailSignalSourceIds: expect.arrayContaining(['ma.temporary_announcements']),
    })
    expect(byJurisdiction.get('OH')).toMatchObject({
      parserStatus: 'web_primary',
      primaryWebSourceIds: expect.arrayContaining(['oh.sales_tax_rate_changes']),
      emailSignalSourceIds: expect.arrayContaining(['oh.temporary_announcements']),
    })
    expect(byJurisdiction.get('AL')).toMatchObject({
      primaryWebSourceIds: expect.arrayContaining(['al.temporary_announcements']),
      emailSignalSourceIds: [],
      reliefOrDisasterSourceIds: [],
      missingRoles: expect.arrayContaining(['email_signal', 'relief_or_disaster_signal']),
    })
    expect(byJurisdiction.get('AL')?.requiredRoles).not.toContain('multi_agency_sources')
    expect(byJurisdiction.get('NY')?.requiredRoles).toContain('multi_agency_sources')

    const alAnnouncement = listRuleSources('AL').find(
      (source) => source.id === 'al.temporary_announcements',
    )
    expect(alAnnouncement?.inboundEmail?.verificationStatus).toBe('routing_only')
    expect(
      byJurisdiction.get('AL')?.roleDetails.find((detail) => detail.role === 'email_signal'),
    ).toMatchObject({ status: 'missing', sourceIds: [] })
  })

  it('publishes a structured source catalog with verified roles and inbound email semantics', () => {
    const catalog = listAlertSourceCatalog()
    const byId = new Map(catalog.map((source) => [source.id, source]))

    expect(catalog.length).toBeGreaterThan(52)
    expect(byId.get('al.temporary_announcements')).toMatchObject({
      jurisdiction: 'AL',
      roles: expect.arrayContaining(['primary_web_news']),
      verificationStatus: 'verified',
      inboundEmail: expect.objectContaining({
        verificationStatus: 'routing_only',
      }),
    })
    expect(byId.get('ca.ftb_tax_news')).toMatchObject({
      agency: 'California Franchise Tax Board',
      roles: expect.arrayContaining(['email_signal']),
      inboundEmail: expect.objectContaining({
        verificationStatus: 'verified_official',
      }),
    })
    expect(byId.get('tx.ui_wage_report_due_dates')).toMatchObject({
      agency: 'Texas Workforce Commission',
      roles: expect.arrayContaining(['tax_type_sources', 'multi_agency_sources']),
    })
  })

  it('keeps concrete basis sources from the rules registry in the extract queue', () => {
    const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))

    for (const adapter of ruleSourceAdapters) {
      const source = sourcesById.get(adapter.id)
      expect(source, `${adapter.id} should map back to a rule source`).toBeDefined()
      if (!source) continue
      expect(source.sourceType, `${adapter.id} should not promote an index source`).not.toMatch(
        /^(news|subscription|early_warning)$/,
      )
    }
  })

  it('does not force lower-priority rule source adapters into review-only mode', () => {
    const basis = listRuleSources().find((candidate) => candidate.id === 'tx.franchise_forms_2026')
    expect(basis).toBeDefined()
    const source = {
      ...basis!,
      id: 'tx.medium_review_fixture',
      priority: 'medium',
    } satisfies RuleSource

    expect(isRuleSourceAdapterEligible(source)).toBe(true)
    expect(isRuleSourcePulsePromoted(source)).toBe(false)
    expect(createRuleSourceAdapter(source).id).toBe('tx.medium_review_fixture')
    expect(requiresReviewOnlyPulseAlert(source.id)).toBe(false)
  })
})
