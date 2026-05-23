import { describe, expect, it } from 'vitest'
import { listRuleSources, type RuleSource } from '@duedatehq/core/rules'
import { livePulseAdapters } from '@duedatehq/ingest/adapters'
import {
  createTemporaryAnnouncementAdapter,
  createRuleSourceAdapter,
  isRuleSourceAdapterEligible,
  isRuleSourcePulsePromoted,
  isTemporaryAnnouncementAdapterEligible,
  liveRegulatorySourceAdapters,
  ruleSourceAdapters,
  temporaryAnnouncementSourceAdapters,
} from './rule-source-adapters'

describe('rule source adapters', () => {
  it('adds adapters only for automated candidate-review rule sources without duplicating live adapters', () => {
    const liveIds = new Set(livePulseAdapters.map((adapter) => adapter.id))
    const candidateReviewSources = listRuleSources()
      .filter((source) => source.notificationChannels.includes('practice_rule_review'))
      .filter((source) => source.acquisitionMethod === 'html_watch')
      .filter((source) => !liveIds.has(source.id))
      .filter(isRuleSourceAdapterEligible)

    expect(ruleSourceAdapters.map((adapter) => adapter.id).toSorted()).toEqual(
      candidateReviewSources.map((source) => source.id).toSorted(),
    )
    expect(liveRegulatorySourceAdapters).toHaveLength(
      livePulseAdapters.length +
        candidateReviewSources.length +
        temporaryAnnouncementSourceAdapters.length,
    )
  })

  it('adds API-backed temporary announcement adapters through the aggregate feed interface', async () => {
    const sources = listRuleSources().filter(isTemporaryAnnouncementAdapterEligible)

    expect(temporaryAnnouncementSourceAdapters.map((adapter) => adapter.id).toSorted()).toEqual(
      sources.map((source) => source.id).toSorted(),
    )
    expect(sources.map((source) => source.id).toSorted()).toEqual([
      'az.temporary_announcements',
      'co.temporary_announcements',
      'ks.temporary_announcements',
      'mi.temporary_announcements',
      'nd.temporary_announcements',
      'nh.temporary_announcements',
      'ri.temporary_announcements',
    ])

    const source = sources.find((candidate) => candidate.id === 'az.temporary_announcements')!
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

  it('keeps manual-review and pdf-only sources out of the automated ingest set', () => {
    const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))
    const automatedIds = ruleSourceAdapters.map((adapter) => adapter.id)

    for (const sourceId of [
      'ca.income_tax',
      'dc.income_tax',
      'wa.capital_gains_exception_2026',
      'tx.temporary_announcements',
    ]) {
      const source = sourcesById.get(sourceId)
      if (sourceId === 'tx.temporary_announcements') {
        expect(source?.authorityRole, sourceId).toBe('watch')
      } else {
        expect(source?.acquisitionMethod, sourceId).toBe('manual_review')
      }
      expect(isRuleSourceAdapterEligible(source!), sourceId).toBe(false)
      expect(isRuleSourcePulsePromoted(source!), sourceId).toBe(false)
      expect(automatedIds, sourceId).not.toContain(sourceId)
    }

    const pdfSource = sourcesById.get('fl.income_tax')
    expect(pdfSource?.acquisitionMethod).toBe('pdf_watch')
    expect(isRuleSourceAdapterEligible(pdfSource!)).toBe(false)
  })

  it('only promotes concrete basis sources from the rules registry into the extract queue', () => {
    const sourcesById = new Map(listRuleSources().map((source) => [source.id, source]))

    for (const adapter of ruleSourceAdapters.filter(
      (candidate) => candidate.canCreatePulse !== false,
    )) {
      const source = sourcesById.get(adapter.id)
      expect(source, `${adapter.id} should map back to a rule source`).toBeDefined()
      if (!source) continue
      expect(source.sourceType, `${adapter.id} should not promote an index source`).not.toMatch(
        /^(news|subscription|early_warning)$/,
      )
    }
  })

  it('keeps lower-priority rule source adapters signal-only', () => {
    const basis = listRuleSources().find((candidate) => candidate.id === 'tx.franchise_forms_2026')
    expect(basis).toBeDefined()
    const source = {
      ...basis!,
      id: 'tx.medium_review_fixture',
      priority: 'medium',
    } satisfies RuleSource

    expect(isRuleSourceAdapterEligible(source)).toBe(true)
    expect(isRuleSourcePulsePromoted(source)).toBe(false)
    expect(createRuleSourceAdapter(source).canCreatePulse).toBe(false)
  })
})
