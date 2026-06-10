import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import {
  isParserBackedRuleSource,
  listHiddenPolicyWatchSources,
  listRuleSources,
  ruleSourceFetchUrl,
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
  politeHostForAdapterId,
  pulseManagedSourceIds,
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
    // liveRegulatorySourceAdapters is built from the visible layers only (hidden
    // policy-watch is excluded — see below) and is then deduped by id AND by
    // resolved fetch URL, so it is a subset of the visible layer: redundant
    // same-URL watchers (e.g. an explicit live adapter and a temporary-
    // announcement source pointing at the same page) collapse to one. It must
    // never exceed the visible layer.
    expect(liveRegulatorySourceAdapters.length).toBeLessThanOrEqual(
      visibleRegulatorySourceAdapters.length,
    )
    // URL dedup actually removed something — the visible layers do share URLs.
    expect(liveRegulatorySourceAdapters.length).toBeLessThan(visibleRegulatorySourceAdapters.length)
    // Ids are unique.
    expect(new Set(liveRegulatorySourceAdapters.map((adapter) => adapter.id)).size).toBe(
      liveRegulatorySourceAdapters.length,
    )
    // Every explicit hand-tuned live adapter survives dedup (highest priority).
    const liveIdSet = new Set(liveRegulatorySourceAdapters.map((adapter) => adapter.id))
    for (const adapter of livePulseAdapters) {
      expect(liveIdSet.has(adapter.id), adapter.id).toBe(true)
    }
    // No hidden policy-watch adapter is driven by cron — they are derived URL
    // mirrors of temporary-announcement sources, covered as a coverage/audit
    // concept only.
    for (const adapter of hiddenPolicyWatchAdapters) {
      expect(liveIdSet.has(adapter.id), adapter.id).toBe(false)
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

    // Resolved fetch URL per id via the SHARED resolver, locking the single
    // implementation fetchUrlForAdapterId/reconcile/checker all use.
    const urlBySourceId = new Map<string, string>()
    for (const source of listRuleSources()) {
      urlBySourceId.set(source.id, ruleSourceFetchUrl(source))
    }
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
      // Hidden policy-watch adapters are never driven by cron — each is a
      // derived URL mirror of a temporary-announcement source, kept only for
      // coverage/audit metadata (alertSourceAdapterMetadata / coverage rows).
      expect(liveIds.has(adapter.id), `${adapter.id} should not be a cron source`).toBe(false)
    }
    // No two live adapters fetch the same URL.
    expect(seenLiveUrls.size).toBe(
      liveRegulatorySourceAdapters.filter((adapter) => urlBySourceId.get(adapter.id)).length,
    )

    const source = hiddenSources.find((candidate) => candidate.jurisdiction === 'AZ')!
    // 2026-06-10: AZ's feedUrl was removed (HTML page mis-tagged as a feed);
    // the hidden mirror derives its fetch URL from `url` now.
    expect(source.url).toBe('https://azdor.gov/news-center')
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

    // PA's live policy-watch source is now an HTML newsroom (auto-promoted); no
    // registry source uses pdf_index any more, so synthesise a PDF-index variant
    // to keep the PDF-index fallback path under test.
    const paSource = hiddenSources.find((source) => source.jurisdiction === 'PA')!
    const pdfSource = {
      ...paSource,
      acquisitionMethod: 'pdf_watch' as const,
      adapterKind: 'pdf_index' as const,
    }
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
    // 2026-06-10: metadata corrected — the AZ news center is an HTML page
    // fetched via browserless, not an RSS feed.
    expect(source).toMatchObject({
      adapterKind: 'html_announcement_list',
      acquisitionMethod: 'html_watch',
      url: 'https://azdor.gov/news-center',
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
      title: 'New Hampshire DRA News and Announcements',
      url: 'https://www.revenue.nh.gov/resource-center/news-and-announcements',
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
        'rights_window_signal',
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
      rightsWindowSourceIds: expect.arrayContaining([
        'fed.taxpayer_advocate_blog',
        'fed.irs_actions_on_decisions',
        'fed.irs_irb',
      ]),
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
    // TX/WA now reach comprehensive: relief was their only missing required role
    // before a verified state disaster-relief source was registered.
    expect(byJurisdiction.get('TX')).toMatchObject({
      coverageLevel: 'comprehensive',
      parserStatus: 'web_primary',
      coveredRoles: expect.arrayContaining(['multi_agency_sources', 'relief_or_disaster_signal']),
      explicitLiveSourceIds: expect.arrayContaining(['tx.cpa.rss']),
      emailSignalSourceIds: expect.arrayContaining(['tx.temporary_announcements']),
      ruleSourceWatchIds: expect.arrayContaining(['tx.ui_wage_report_due_dates']),
      reliefOrDisasterSourceIds: expect.arrayContaining(['tx.comptroller_disaster_relief']),
    })
    expect(byJurisdiction.get('WA')).toMatchObject({
      coverageLevel: 'comprehensive',
      parserStatus: 'web_primary',
      coveredRoles: expect.arrayContaining(['multi_agency_sources', 'relief_or_disaster_signal']),
      explicitLiveSourceIds: expect.arrayContaining(['wa.dor.news', 'wa.dor.whats_new']),
      emailSignalSourceIds: expect.arrayContaining(['wa.news']),
      ruleSourceWatchIds: expect.arrayContaining(['wa.esd_quarterly_tax_wage_reports']),
      reliefOrDisasterSourceIds: expect.arrayContaining(['wa.dor_disaster_relief']),
    })
    // NY relief is covered by the dedicated N-Notice disaster watch; multi_agency
    // is still missing, so NY stays standard.
    expect(byJurisdiction.get('NY')).toMatchObject({
      missingRoles: expect.arrayContaining(['multi_agency_sources']),
      reliefOrDisasterSourceIds: expect.arrayContaining(['ny.dtf_disaster_relief']),
      emailSignalSourceIds: expect.arrayContaining(['ny.email_services']),
    })
    // FL/MA gain relief coverage but stay standard: multi_agency is still missing.
    expect(byJurisdiction.get('FL')).toMatchObject({
      coverageLevel: 'standard',
      missingRoles: expect.arrayContaining(['multi_agency_sources']),
      // 2026-06-10: the frozen Hurricane_Helene tombstone was replaced by the
      // standing emergency-information page under a NEW id.
      reliefOrDisasterSourceIds: expect.arrayContaining(['fl.dor_emergency_disaster_info']),
      emailSignalSourceIds: expect.arrayContaining(['fl.tips']),
    })
    expect(byJurisdiction.get('MA')).toMatchObject({
      coverageLevel: 'standard',
      missingRoles: expect.arrayContaining(['multi_agency_sources']),
      reliefOrDisasterSourceIds: expect.arrayContaining(['ma.dor_disaster_relief']),
      emailSignalSourceIds: expect.arrayContaining(['ma.temporary_announcements']),
    })
    expect(byJurisdiction.get('OH')).toMatchObject({
      parserStatus: 'web_primary',
      primaryWebSourceIds: expect.arrayContaining(['oh.sales_tax_rate_changes']),
      emailSignalSourceIds: expect.arrayContaining(['oh.temporary_announcements']),
    })
    // AL relief is now covered at the index level (DOR news); email_signal is
    // still missing.
    expect(byJurisdiction.get('AL')).toMatchObject({
      primaryWebSourceIds: expect.arrayContaining(['al.temporary_announcements']),
      emailSignalSourceIds: [],
      reliefOrDisasterSourceIds: expect.arrayContaining(['al.temporary_announcements']),
      missingRoles: expect.arrayContaining(['email_signal']),
    })
    expect(byJurisdiction.get('AL')?.missingRoles).not.toContain('relief_or_disaster_signal')
    expect(byJurisdiction.get('AL')?.requiredRoles).not.toContain('multi_agency_sources')
    expect(byJurisdiction.get('AL')?.requiredRoles).not.toContain('rights_window_signal')
    expect(byJurisdiction.get('NY')?.requiredRoles).toContain('multi_agency_sources')
    // 2026-06-10: the frozen per-event relief tombstones were retired; those
    // states stay covered at the index level via their news watchers (and HI
    // via the dated Tax Announcements index).
    for (const [state, indexSourceId] of [
      ['MS', 'ms.temporary_announcements'],
      ['DC', 'dc.temporary_announcements'],
      ['WV', 'wv.temporary_announcements'],
      ['HI', 'hi.dotax_tax_announcements'],
    ] as const) {
      expect(
        byJurisdiction.get(state)?.reliefOrDisasterSourceIds,
        `${state} index-level relief`,
      ).toEqual(expect.arrayContaining([indexSourceId]))
      expect(byJurisdiction.get(state)?.missingRoles).not.toContain('relief_or_disaster_signal')
    }
    expect(byJurisdiction.get('OK')?.reliefOrDisasterSourceIds).not.toContain(
      'ok.otc_disaster_relief',
    )
    expect(byJurisdiction.get('VA')?.reliefOrDisasterSourceIds).not.toContain(
      'va.tax_disaster_relief',
    )

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
    expect(byId.get('fed.taxpayer_advocate_blog')).toMatchObject({
      agency: 'IRS',
      roles: expect.arrayContaining(['rights_window_signal']),
    })
    expect(byId.get('fed.irs_actions_on_decisions')).toMatchObject({
      agency: 'IRS',
      roles: expect.arrayContaining(['rights_window_signal']),
    })
    expect(byId.get('fed.irs_irb')).toMatchObject({
      agency: 'IRS',
      roles: expect.arrayContaining(['rights_window_signal']),
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

  it('caps the AI excerpt at 6000 chars while carrying the full stripped text for drift', async () => {
    const basis = listRuleSources().find((candidate) => candidate.id === 'tx.franchise_forms_2026')!
    const adapter = createRuleSourceAdapter(basis)
    const ctx = {
      fetch: async () => new Response(''),
      async archiveRaw() {
        return { r2Key: 'unused', contentHash: 'unused' }
      },
    }
    const snapshot = (body: string) => ({
      sourceId: basis.id,
      fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
      contentHash: 'hash',
      r2Key: 'raw.html',
      contentType: 'text/html',
      etag: null,
      lastModified: null,
      body,
    })

    const [bigItem] = await adapter.parse(
      snapshot(`<html><body>${'x '.repeat(4000)}MARKER-BEYOND-CAP</body></html>`),
      ctx,
    )
    expect(bigItem!.rawText).toHaveLength(6000)
    expect(bigItem!.rawText).not.toContain('MARKER-BEYOND-CAP')
    expect(bigItem!.fullText).toContain('MARKER-BEYOND-CAP')
    expect(bigItem!.fullText!.startsWith(bigItem!.rawText)).toBe(true)

    // A page that fits inside the excerpt carries no redundant full text.
    const [smallItem] = await adapter.parse(
      snapshot('<html><body>Franchise tax forms for 2026.</body></html>'),
      ctx,
    )
    expect(smallItem!.fullText).toBeUndefined()
  })

  it('exposes the pulse-managed id set and keeps URL-deduped ids out of it', () => {
    expect(pulseManagedSourceIds.size).toBe(liveRegulatorySourceAdapters.length)
    for (const adapter of liveRegulatorySourceAdapters) {
      expect(pulseManagedSourceIds.has(adapter.id)).toBe(true)
    }
    // Registry sources whose adapter was dropped by uniqueByFetchUrl must stay
    // OUT of the set: the rules-scan is their only sourceId-keyed drift watcher.
    expect(listRuleSources().some((source) => source.id === 'ny.tax_calendar.2026')).toBe(true)
    expect(pulseManagedSourceIds.has('ny.tax_calendar.2026')).toBe(false)
    expect(pulseManagedSourceIds.has('fed.irs_disaster_relief')).toBe(false)
    // Spot-check a parser-backed basis source the pulse pipeline owns.
    expect(pulseManagedSourceIds.has('ca.ftb_business_due_dates')).toBe(true)
  })

  it('resolves a polite host for every live adapter and null for unknown ids', () => {
    for (const adapter of liveRegulatorySourceAdapters) {
      const host = politeHostForAdapterId(adapter.id)
      expect(host, `adapter ${adapter.id} must resolve a grouping host`).toBeTruthy()
      expect(host).not.toContain('/')
    }
    expect(politeHostForAdapterId('does.not.exist')).toBeNull()
  })
})
