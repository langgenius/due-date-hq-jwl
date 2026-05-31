import { describe, expect, it, vi } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { fetchTextSnapshot, hashText } from './http'
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
import {
  announcementItemsFromSnapshot,
  announcementItemsFromSnapshotWithPdfLinks,
} from './announcements'
import { parseRssItems, parsedItemsFromRss } from './rss'
import { extractLinks, pickSelector } from './selectors'
import type { IngestCtx } from './types'

const cloudflareFetch = async () => new Response('cloudflare')
const browserlessFetch = async () => new Response('browserless')

describe('@duedatehq/ingest', () => {
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

  it('hashes text with stable sha256 output', async () => {
    await expect(hashText('pulse')).resolves.toMatch(/^[a-f0-9]{64}$/)
    await expect(hashText('pulse')).resolves.toBe(await hashText('pulse'))
  })

  it('extracts PDF source text before archiving snapshots', async () => {
    const bytes = await createPdfBytes('April 15 filing deadline for individual income tax returns')
    const archivedBodies: string[] = []

    const snapshot = await fetchTextSnapshot(
      {
        async fetch(input) {
          const url = String(input)
          if (url.endsWith('/robots.txt')) return new Response('', { status: 404 })
          return new Response(bytes, { headers: { 'content-type': 'application/pdf' } })
        },
        async archiveRaw({ body }) {
          archivedBodies.push(body)
          return { r2Key: 'pdf-text.txt', contentHash: await hashText(body) }
        },
      },
      { sourceId: 'nm.income_tax', url: 'https://tax.example/source.pdf' },
    )

    expect(snapshot.body).toContain('April 15 filing deadline')
    expect(snapshot.contentType).toBe('text/plain; charset=utf-8')
    expect(archivedBodies[0]).toContain('individual income tax returns')
  })

  it('extracts linked PDF announcement text and deduplicates the link item', async () => {
    const bytes = await createPdfBytes('Quarterly tax update changes the filing deadline')

    const items = await announcementItemsFromSnapshotWithPdfLinks(
      {
        id: 'pa.temporary_announcements',
        title: 'Pennsylvania DOR PA Tax Update Newsletter',
        url: 'https://www.pa.gov/agencies/revenue/resources/pa-tax-update-newsletter',
        jurisdiction: 'PA',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: '<a href="/content/dam/revenue/tax-update.pdf">Tax Update PDF</a>',
      },
      {
        async fetch(input) {
          expect(String(input)).toBe('https://www.pa.gov/content/dam/revenue/tax-update.pdf')
          return new Response(bytes, { headers: { 'content-type': 'application/pdf' } })
        },
      },
    )

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      sourceId: 'pa.temporary_announcements',
      title: 'Tax Update PDF',
      officialSourceUrl: 'https://www.pa.gov/content/dam/revenue/tax-update.pdf',
      jurisdiction: 'PA',
    })
    expect(items[0]?.rawText).toContain('Quarterly tax update changes')
  })

  it('does not fall back to a link-only item when a PDF candidate cannot be read', async () => {
    const items = await announcementItemsFromSnapshotWithPdfLinks(
      {
        id: 'pa.temporary_announcements',
        title: 'Pennsylvania DOR PA Tax Update Newsletter',
        url: 'https://www.pa.gov/agencies/revenue/resources/pa-tax-update-newsletter',
        jurisdiction: 'PA',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: '<a href="/content/dam/revenue/tax-update.pdf">Tax Update PDF</a>',
      },
      {
        async fetch() {
          return new Response('not available', { status: 500 })
        },
      },
    )

    expect(items).toHaveLength(0)
  })

  it('treats content-disposition PDF downloads as linked PDF announcements', async () => {
    const bytes = await createPdfBytes('Administrative notice changes sales tax filing guidance')

    const items = await announcementItemsFromSnapshotWithPdfLinks(
      {
        id: 'nm.temporary_announcements',
        title: 'New Mexico TRD News Alerts',
        url: 'https://www.tax.newmexico.gov/news-alerts/',
        jurisdiction: 'NM',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: '<a href="/download/notice">Administrative notice PDF</a>',
      },
      {
        async fetch() {
          return new Response(bytes, {
            headers: {
              'content-type': 'application/octet-stream',
              'content-disposition': 'attachment; filename="notice.pdf"',
            },
          })
        },
      },
    )

    expect(items).toHaveLength(1)
    expect(items[0]?.rawText).toContain('sales tax filing guidance')
  })

  it('does not fetch unrelated linked PDFs', async () => {
    const fetchMock = vi.fn(async () => new Response('should not fetch'))

    const items = await announcementItemsFromSnapshotWithPdfLinks(
      {
        id: 'ak.temporary_announcements',
        title: 'Alaska Tax Division News',
        url: 'https://tax.alaska.gov/programs/whatsnew.aspx',
        jurisdiction: 'AK',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: '<a href="/forms/estate-tax-form.pdf">Estate Tax Form</a>',
      },
      { fetch: fetchMock },
    )

    expect(items).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('normalizes Google Drive PDF links while preserving the official source URL', async () => {
    const bytes = await createPdfBytes('Wyoming sales tax exemption matrix changed in March')
    const fetchedUrls: string[] = []

    const items = await announcementItemsFromSnapshotWithPdfLinks(
      {
        id: 'wy.temporary_announcements',
        title: 'Wyoming Excise Tax Division Taxing Issues',
        url: 'https://excise-tax-div.wyo.gov/newsletter-taxing-issues',
        jurisdiction: 'WY',
      },
      {
        fetchedAt: new Date('2026-06-01T00:00:00.000Z'),
        body: [
          '<a href="https://excise-tax-div.wyo.gov/salesuselodging-tax/salesuselodging-returns">Returns</a>',
          '<a href="https://drive.google.com/file/d/1VrvUS6LeG1m3g3IeGJ9DW1zwlAtkfdqU/view?usp=drive_link">03-2026 Taxing Issues</a>',
        ].join(''),
      },
      {
        async fetch(input) {
          fetchedUrls.push(String(input))
          return new Response(bytes, {
            headers: {
              'content-type': 'application/octet-stream',
              'content-disposition': 'attachment; filename="03-2026Taxing Issues.pdf"',
            },
          })
        },
      },
    )

    expect(fetchedUrls).toEqual([
      'https://drive.google.com/uc?export=download&id=1VrvUS6LeG1m3g3IeGJ9DW1zwlAtkfdqU',
    ])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      title: '03-2026 Taxing Issues',
      officialSourceUrl: 'https://drive.google.com/file/d/1VrvUS6LeG1m3g3IeGJ9DW1zwlAtkfdqU/view',
      publishedAt: new Date('2026-03-01T00:00:00.000Z'),
      jurisdiction: 'WY',
    })
    expect(items[0]?.rawText).toContain('Wyoming sales tax exemption')
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

  it('keeps tax update newsletter PDF links as policy-change candidates', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'policy-watch.pa.announcements',
        title: 'Pennsylvania DOR PA Tax Update Newsletter',
        url: 'https://www.pa.gov/agencies/revenue/resources/pa-tax-update-newsletter',
        jurisdiction: 'PA',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: [
          '<a href="/content/dam/copapwp-pagov/en/revenue/documents/tax-update/2026/pa-tax-update-march-april-2026.pdf">PA Tax Update - March/April 2026</a>',
          '<a href="/agencies/revenue/contact-us">Contact Revenue</a>',
        ].join(''),
      },
    )

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      sourceId: 'policy-watch.pa.announcements',
      title: 'PA Tax Update - March/April 2026',
      officialSourceUrl:
        'https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/tax-update/2026/pa-tax-update-march-april-2026.pdf',
      jurisdiction: 'PA',
    })
  })

  it('keeps technical guidance PDF links as policy-change candidates', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'policy-watch.nh.announcements',
        title: 'New Hampshire DRA Technical Information Releases',
        url: 'https://www.revenue.nh.gov/tirs',
        jurisdiction: 'NH',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: [
          '<a href="/sites/g/files/ehbemt736/files/documents/2026-001-technical-information-release.pdf">Technical Information Release 2026-001</a>',
          '<a href="/contact">Contact DRA</a>',
          '<a href="/sites/tax/files/documents/TB62.pdf">Technical Bulletin TB-62</a>',
        ].join(''),
      },
    )

    expect(items).toHaveLength(2)
    expect(items.map((item) => item.title)).toEqual([
      'Technical Information Release 2026-001',
      'Technical Bulletin TB-62',
    ])
    expect(items[0]).toMatchObject({
      sourceId: 'policy-watch.nh.announcements',
      jurisdiction: 'NH',
      officialSourceUrl:
        'https://www.revenue.nh.gov/sites/g/files/ehbemt736/files/documents/2026-001-technical-information-release.pdf',
    })
  })

  it('keeps official rules and regulations links as policy-change candidates', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'policy-watch.wy.announcements',
        title: 'Wyoming DOR Rules and Regulations',
        url: 'https://revenue.wyo.gov/rules-and-regulations',
        jurisdiction: 'WY',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: [
          '<a href="/division-pages/excise-tax-division/rules-and-regulations/chapter-2-effective-date">Chapter 2 effective date - Sales Tax Rules and Regulations</a>',
          '<a href="/contact">Contact the Department</a>',
        ].join(''),
      },
    )

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      sourceId: 'policy-watch.wy.announcements',
      title: 'Chapter 2 effective date - Sales Tax Rules and Regulations',
      officialSourceUrl:
        'https://revenue.wyo.gov/division-pages/excise-tax-division/rules-and-regulations/chapter-2-effective-date',
      jurisdiction: 'WY',
    })
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
