import { describe, expect, it } from 'vitest'
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
  liveRegulatorySourceAdapters,
  requiresReviewOnlyPulseAlert,
  ruleSourceAdapters,
  temporaryAnnouncementSourceAdapters,
  visibleRegulatorySourceAdapters,
} from './rule-source-adapters'

describe('rule source adapters', () => {
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
    expect(liveRegulatorySourceAdapters).toHaveLength(
      visibleRegulatorySourceAdapters.length + hiddenPolicyWatchAdapters.length,
    )
    expect(new Set(liveRegulatorySourceAdapters.map((adapter) => adapter.id)).size).toBe(
      liveRegulatorySourceAdapters.length,
    )
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

    for (const adapter of hiddenPolicyWatchAdapters) {
      expect(isHiddenPolicyWatchSourceId(adapter.id), adapter.id).toBe(true)
      expect(visibleAdapterIds.has(adapter.id), adapter.id).toBe(false)
      expect(publicSourceIds.has(adapter.id), adapter.id).toBe(false)
      expect(
        liveRegulatorySourceAdapters.map((candidate) => candidate.id),
        adapter.id,
      ).toContain(adapter.id)
    }

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
        fetch: async () => new Response(''),
        async archiveRaw() {
          return { r2Key: 'unused', contentHash: 'unused' }
        },
      },
    )
    expect(taxUpdateItems[0]).toMatchObject({
      sourceId: 'policy-watch.pa.announcements',
      title: 'PA Tax Update - March/April 2026',
      officialSourceUrl:
        'https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/tax-update/2026/pa-tax-update-march-april-2026.pdf',
    })
  })

  it('adds API-backed temporary announcement adapters through the aggregate feed interface', async () => {
    const sources = listRuleSources().filter(isTemporaryAnnouncementAdapterEligible)

    expect(temporaryAnnouncementSourceAdapters.map((adapter) => adapter.id).toSorted()).toEqual(
      sources.map((source) => source.id).toSorted(),
    )
    expect(sources.map((source) => source.id).toSorted()).toEqual([
      'az.temporary_announcements',
      'ks.temporary_announcements',
      'mi.temporary_announcements',
      'mo.temporary_announcements',
      'nd.temporary_announcements',
      'nv.temporary_announcements',
      'ri.temporary_announcements',
    ])

    const source = sources.find((candidate) => candidate.id === 'az.temporary_announcements')!
    expect(source).toMatchObject({
      adapterKind: 'rss_or_announcement_list',
      feedUrl: 'https://azdor.gov/news-center',
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
