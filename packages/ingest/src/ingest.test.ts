import { describe, expect, it } from 'vitest'
import { hashText } from './http'
import { runFixtureAdapter, sourceFixtureBodies } from './fixtures'
import {
  caFtbNewsroomAdapter,
  femaDeclarationsAdapter,
  irsDisasterAdapter,
  livePulseAdapters,
  nyDtfPressFixtureAdapter,
  txComptrollerRssAdapter,
} from './adapters'
import { createSourceFetcherRegistry } from './fetcher'
import { announcementItemsFromSnapshot } from './announcements'
import { parseRssItems, parsedItemsFromRss } from './rss'
import { extractLinks, pickSelector } from './selectors'
import type { IngestCtx } from './types'

const cloudflareFetch = async () => new Response('cloudflare')
const browserlessFetch = async () => new Response('browserless')

describe('@duedatehq/ingest', () => {
  it('hashes text with stable sha256 output', async () => {
    await expect(hashText('pulse')).resolves.toMatch(/^[a-f0-9]{64}$/)
    await expect(hashText('pulse')).resolves.toBe(await hashText('pulse'))
  })

  it('picks the first selector with results', () => {
    const doc = {
      querySelectorAll(selector: string) {
        return selector === 'main a' ? [{}] : []
      },
    }

    expect(pickSelector(doc, ['#missing', 'main a'])).toBe('main a')
    expect(pickSelector(doc, ['#missing'])).toBeNull()
  })

  it('extracts links against a base URL', () => {
    expect(extractLinks('<a href="/press/item">Press item</a>', 'https://tax.ny.gov')).toEqual([
      { href: 'https://tax.ny.gov/press/item', text: 'Press item' },
    ])
  })

  it('parses RSS and Atom announcement feed items into Pulse candidates', () => {
    const rssItems = parsedItemsFromRss({
      sourceId: 'az.temporary_announcements',
      jurisdiction: 'AZ',
      feedUrl: 'https://azdor.gov/news-center/feed',
      xml: `<rss><channel><item><guid>ador-1</guid><title><![CDATA[TPT Filer - Please Submit Your Return]]></title><link>/news/tpt-filer</link><pubDate>Wed, 08 Apr 2026 00:00:00 GMT</pubDate><description>Taxpayers can file now and schedule payments up until the deadline.</description></item></channel></rss>`,
    })
    const atomItems = parseRssItems(
      `<feed><entry><id>tag:tax.example,2026:1</id><title>Tax relief notice</title><link href="/notice"/><updated>2026-04-09T00:00:00Z</updated><summary>Relief applies to affected taxpayers.</summary></entry></feed>`,
      'https://tax.example/feed',
    )

    expect(rssItems[0]).toMatchObject({
      sourceId: 'az.temporary_announcements',
      jurisdiction: 'AZ',
      title: 'TPT Filer - Please Submit Your Return',
      officialSourceUrl: 'https://azdor.gov/news/tpt-filer',
    })
    expect(atomItems[0]).toMatchObject({
      title: 'Tax relief notice',
      link: 'https://tax.example/notice',
    })
  })

  it('splits official announcement list pages into tax-relevant item candidates', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'tx.temporary_announcements',
        title: 'Texas Comptroller News',
        url: 'https://comptroller.texas.gov/about/media-center/news/',
        jurisdiction: 'TX',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: '<main><a href="/about/media-center/news/20260408-deadline">April 15 is the tax filing deadline</a><a href="/about">About the agency</a></main>',
      },
    )

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      sourceId: 'tx.temporary_announcements',
      title: 'April 15 is the tax filing deadline',
      officialSourceUrl: 'https://comptroller.texas.gov/about/media-center/news/20260408-deadline',
    })
  })

  it('filters noisy agency news links before Pulse extraction', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'az.temporary_announcements',
        title: 'Arizona DOR News',
        url: 'https://azdor.gov/news-center',
        jurisdiction: 'AZ',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: [
          '<a href="/news/fraud-warning">Tax fraud warning for taxpayers</a>',
          '<a href="/news/webinar">Sales tax webinar for small businesses</a>',
          '<a href="/news/extension">Disaster relief extends filing and payment deadline</a>',
        ].join(''),
      },
    )

    expect(items.map((item) => item.title)).toEqual([
      'Disaster relief extends filing and payment deadline',
    ])
  })

  it('filters noisy RSS announcement items before Pulse extraction', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'az.temporary_announcements',
        title: 'Arizona DOR News',
        url: 'https://azdor.gov/news-center/feed',
        jurisdiction: 'AZ',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: `<rss><channel>
          <item><guid>noise-1</guid><title>Sales tax webinar for small businesses</title><link>https://azdor.gov/news/webinar</link><description>Join agency staff for education.</description></item>
          <item><guid>signal-1</guid><title>Disaster relief extends filing and payment deadline</title><link>https://azdor.gov/news/relief</link><description>Affected taxpayers have a new filing deadline.</description></item>
        </channel></rss>`,
      },
    )

    expect(items.map((item) => item.title)).toEqual([
      'Disaster relief extends filing and payment deadline',
    ])
  })

  it('runs the NY DTF fixture adapter end-to-end', async () => {
    const ctx: IngestCtx = {
      async fetch() {
        throw new Error('fixture should not fetch')
      },
      async archiveRaw({ sourceId, externalId, fetchedAt, body }) {
        return {
          r2Key: `${sourceId}/${externalId}/${fetchedAt.toISOString()}.html`,
          contentHash: await hashText(body),
        }
      },
    }

    const result = await runFixtureAdapter(nyDtfPressFixtureAdapter, ctx)

    expect(result.snapshots).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      sourceId: 'ny.dtf.press',
      title: 'NY DTF clarifies pass-through entity tax election window',
    })
  })

  it('keeps a fixture body registered for every live source adapter', () => {
    expect(Object.keys(sourceFixtureBodies).toSorted()).toEqual(
      livePulseAdapters.map((adapter) => adapter.id).toSorted(),
    )
  })

  it('parses tax-relevant TX Comptroller news releases from the official HTML page', async () => {
    const fetchedUrls: string[] = []
    const ctx: IngestCtx = {
      async fetch(input) {
        const url = String(input)
        fetchedUrls.push(url)
        if (url.endsWith('/robots.txt')) return new Response('', { status: 404 })
        if (url === 'https://comptroller.texas.gov/about/media-center/news/') {
          return new Response(
            '<nav><a href="/taxes/sales/">Sales Tax</a><a href="/taxes/franchise/">Franchise Tax</a></nav><main><a href="/about/media-center/news/20260408-texas-businesses-april-15-is-deadline-for-filing-property-tax-renditions-1775577720312">Texas businesses: April 15 is deadline for filing property tax renditions</a></main>',
            { headers: { 'content-type': 'text/html' } },
          )
        }
        throw new Error(`unexpected fetch ${url}`)
      },
      async getSourceState() {
        return { etag: '"stale-etag"', lastModified: 'Wed, 15 Apr 2026 00:00:00 GMT' }
      },
      async archiveRaw({ sourceId, externalId, fetchedAt, body }) {
        return {
          r2Key: `${sourceId}/${externalId}/${fetchedAt.toISOString()}.xml`,
          contentHash: await hashText(body),
        }
      },
    }

    const snapshots = await txComptrollerRssAdapter.fetch(ctx)
    const items = await txComptrollerRssAdapter.parse(snapshots[0]!, ctx)

    expect(fetchedUrls).toContain('https://comptroller.texas.gov/about/media-center/news/')
    expect(fetchedUrls).toEqual([
      'https://comptroller.texas.gov/robots.txt',
      'https://comptroller.texas.gov/about/media-center/news/',
    ])
    expect(fetchedUrls).not.toContain('https://public.govdelivery.com/topics/TXCOMPT_1/feed.rss')
    expect(fetchedUrls).not.toContain('https://comptroller.texas.gov/taxes/sales/')
    expect(fetchedUrls).not.toContain('https://comptroller.texas.gov/taxes/franchise/')
    expect(snapshots[0]).toMatchObject({
      sourceId: 'tx.cpa.rss',
      contentType: 'text/html',
    })
    expect(items[0]).toMatchObject({
      sourceId: 'tx.cpa.rss',
      title: 'Texas businesses: April 15 is deadline for filing property tax renditions',
      officialSourceUrl:
        'https://comptroller.texas.gov/about/media-center/news/20260408-texas-businesses-april-15-is-deadline-for-filing-property-tax-renditions-1775577720312',
    })
  })

  it('does not promote source index pages when no detail link is parsed', async () => {
    const ctx: IngestCtx = {
      async fetch() {
        throw new Error('detail fetch should not run without links')
      },
      async archiveRaw() {
        throw new Error('archive should not run in parser-only test')
      },
    }
    const fetchedAt = new Date('2026-04-30T00:00:00.000Z')

    await expect(
      caFtbNewsroomAdapter.parse(
        {
          sourceId: 'ca.ftb.newsroom',
          fetchedAt,
          contentHash: 'hash',
          r2Key: 'raw.html',
          body: '<main><h1>Newsroom</h1><p>No tax deadline links here.</p></main>',
          contentType: 'text/html',
          etag: null,
          lastModified: null,
        },
        ctx,
      ),
    ).resolves.toEqual([])
    await expect(
      irsDisasterAdapter.parse(
        {
          sourceId: 'irs.disaster',
          fetchedAt,
          contentHash: 'hash',
          r2Key: 'raw.html',
          body: '<main><h1>Tax relief in disaster situations</h1></main>',
          contentType: 'text/html',
          etag: null,
          lastModified: null,
        },
        ctx,
      ),
    ).resolves.toEqual([])
  })

  it('links FEMA declaration items to the declaration detail page', async () => {
    const items = await femaDeclarationsAdapter.parse(
      {
        sourceId: 'fema.declarations',
        fetchedAt: new Date('2026-04-30T00:00:00.000Z'),
        contentHash: 'hash',
        r2Key: 'raw.json',
        body: sourceFixtureBodies['fema.declarations'],
        contentType: 'application/json',
        etag: null,
        lastModified: null,
      },
      {
        async fetch() {
          throw new Error('FEMA parse should not fetch')
        },
        async archiveRaw() {
          throw new Error('archive should not run in parser-only test')
        },
      },
    )

    expect(items[0]).toMatchObject({
      sourceId: 'fema.declarations',
      externalId: 'fema-9999',
      officialSourceUrl: 'https://www.fema.gov/disaster/9999',
    })
  })

  it('fetches FEMA declarations from the OpenFEMA API endpoint', async () => {
    const fetchedUrls: string[] = []
    const ctx: IngestCtx = {
      async fetch(input) {
        const url = String(input)
        fetchedUrls.push(url)
        if (url.endsWith('/robots.txt')) return new Response('', { status: 404 })
        if (url.startsWith('https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries')) {
          return new Response(sourceFixtureBodies['fema.declarations'], {
            headers: { 'content-type': 'application/json' },
          })
        }
        throw new Error(`unexpected fetch ${url}`)
      },
      async archiveRaw({ sourceId, externalId, fetchedAt, body }) {
        return {
          r2Key: `${sourceId}/${externalId}/${fetchedAt.toISOString()}.json`,
          contentHash: await hashText(body),
        }
      },
    }

    const snapshots = await femaDeclarationsAdapter.fetch(ctx)
    const items = await femaDeclarationsAdapter.parse(snapshots[0]!, ctx)

    expect(fetchedUrls[0]).toBe('https://www.fema.gov/robots.txt')
    expect(fetchedUrls[1]).toMatch(
      /^https:\/\/www\.fema\.gov\/api\/open\/v2\/DisasterDeclarationsSummaries/,
    )
    expect(items[0]).toMatchObject({
      sourceId: 'fema.declarations',
      externalId: 'fema-9999',
      officialSourceUrl: 'https://www.fema.gov/disaster/9999',
    })
  })

  it('routes browserless adapters through the configured fetch implementation', async () => {
    const selectFetch = createSourceFetcherRegistry(cloudflareFetch, { browserlessFetch })

    await expect(selectFetch(caFtbNewsroomAdapter)('/').then((res) => res.text())).resolves.toBe(
      'browserless',
    )
    await expect(
      selectFetch({ ...nyDtfPressFixtureAdapter, fetcher: 'browserless' })('/'),
    ).resolves.toHaveProperty('ok', true)
    await expect(
      selectFetch({ ...nyDtfPressFixtureAdapter, fetcher: 'browserless' })('/').then((res) =>
        res.text(),
      ),
    ).resolves.toBe('browserless')
  })
})
