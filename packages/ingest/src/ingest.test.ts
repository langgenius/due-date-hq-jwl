import { describe, expect, it, vi } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { fetchTextSnapshot, hashText, withFetchTimeout } from './http'
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
  linkLooksTaxAnnouncementRelevant,
} from './announcements'
import { parseRssItems, parsedItemsFromRss } from './rss'
import { extractLinks, extractLinksWithTableTitles, pickSelector } from './selectors'
import type { IngestCtx } from './types'

const cloudflareFetch = async () => new Response('cloudflare')
const browserlessFetch = async () => new Response('browserless')
const PDF_TEXT_TEST_TIMEOUT_MS = 15_000

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

  it(
    'extracts PDF source text before archiving snapshots',
    async () => {
      const bytes = await createPdfBytes(
        'April 15 filing deadline for individual income tax returns',
      )
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
    },
    PDF_TEXT_TEST_TIMEOUT_MS,
  )

  it(
    'extracts linked PDF announcement text and deduplicates the link item',
    async () => {
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
    },
    PDF_TEXT_TEST_TIMEOUT_MS,
  )

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

  it(
    'treats content-disposition PDF downloads as linked PDF announcements',
    async () => {
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
    },
    PDF_TEXT_TEST_TIMEOUT_MS,
  )

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
        body: '<a href="/forms/public-records-request.pdf">Public Records Request Form</a>',
      },
      { fetch: fetchMock },
    )

    expect(items).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it(
    'normalizes Google Drive PDF links while preserving the official source URL',
    async () => {
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
    },
    PDF_TEXT_TEST_TIMEOUT_MS,
  )

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

  it('catches state-DOR tax-notice vocabulary without admitting bare section nav', () => {
    // 2026-06-22 P0: widened TAX_ANNOUNCEMENT_RE from a data-driven audit of all 50
    // state DOR announcement pages. Real notices the disaster/deadline vocabulary
    // used to drop must now pass; bare tax-type section-nav links must still drop.
    const real = [
      'NOTICE State Construction-Related Transaction Tax',
      'NOTICE Revised Privilege License Interest Rate Factor Chart',
      'NOTICE Surety Bond Cancellation Period',
      'NOTICE Temporary Suspension of State Sales and Use Tax on Food',
      'Notices Regarding Combined Reporting',
      'Nevada Tax Notes March 2026 - Issue #206',
      'DOR releases marijuana tax and fee revenue figures for March 2026',
      'Application period to reopen for Parental Choice Tax Credit program',
      'Idaho Tax Commission to administer more auditorium districts taxes',
    ]
    for (const t of real) {
      expect(linkLooksTaxAnnouncementRelevant(t, '/news/item')).toBe(true)
    }
    // Bare tax-type / generic section-nav labels were deliberately left out so the
    // filter does not start admitting sidebar chrome on every DOR page.
    const nav = ['Income Tax', 'Property Tax', 'Newsroom', 'Forms', 'Contact Us', 'Careers']
    for (const t of nav) {
      expect(linkLooksTaxAnnouncementRelevant(t, '/individuals')).toBe(false)
    }
  })

  it('recovers the row title for table-listing links whose anchor text is a format label', () => {
    // The IL bulletins index lays each bulletin out as
    // <td>Title</td><td>[<a>HTML</a>]</td><td>[<a>PDF</a>]</td>. Plain extractLinks
    // returns text "HTML"/"English"; the title cell carries the meaning. One item
    // per row, preferring the HTML detail link over the sibling PDF.
    const html =
      '<table><tr>' +
      '<td>FY 2026-28, 2026 Illinois Remote Retailer Tax Amnesty Program</td>' +
      '<td>[<a href="/research/publications/bulletins/fy-2026-28.html">HTML</a>]</td>' +
      '<td>[<a href="/research/publications/bulletins/fy-2026-28.pdf">English</a>]</td>' +
      '</tr></table>'
    const links = extractLinksWithTableTitles(html, 'https://tax.illinois.gov/research/')
    const htmlLink = links.find((l) => l.href.endsWith('fy-2026-28.html'))
    const pdfLink = links.find((l) => l.href.endsWith('fy-2026-28.pdf'))
    expect(htmlLink?.text).toBe('FY 2026-28, 2026 Illinois Remote Retailer Tax Amnesty Program')
    // The PDF sibling keeps its bare label so the bulletin yields a single item.
    expect(pdfLink?.text).toBe('English')
  })

  it('parses an IL-style bulletins table into the amnesty item the recall eval expects', () => {
    // Regression for the 2026-06-22 alert-recall miss il.2026.remote-retailer-amnesty
    // (MISSED_NOT_PARSED): the source fetched fine but every bulletin row was dropped
    // — anchor text "HTML" matched no vocabulary, and even the recovered title needed
    // the widened tax-change words (amnesty / occupation tax / rate change).
    const items = announcementItemsFromSnapshot(
      {
        id: 'il.temporary_announcements',
        title: 'Illinois DOR News',
        url: 'https://tax.illinois.gov/research/publications/bulletins.html',
        jurisdiction: 'IL',
      },
      {
        fetchedAt: new Date('2026-06-21T00:00:00.000Z'),
        body:
          '<nav><a href="/programs/electronicservices.html">Make a Payment</a></nav>' +
          '<table>' +
          '<tr><td>FY 2026-28, 2026 Illinois Remote Retailer Tax Amnesty Program</td>' +
          '<td>[<a href="/research/publications/bulletins/fy-2026-28.html">HTML</a>]</td></tr>' +
          "<tr><td>FY 2026-12, Destination-Based Retailers' Occupation Tax Changes</td>" +
          '<td>[<a href="/research/publications/bulletins/fy-2026-12.html">HTML</a>]</td></tr>' +
          '</table>',
      },
    )
    const amnesty = items.find((item) => item.officialSourceUrl.endsWith('fy-2026-28.html'))
    expect(amnesty?.title).toContain('Remote Retailer Tax Amnesty Program')
    expect(amnesty?.enrichFromUrl).toBe(
      'https://tax.illinois.gov/research/publications/bulletins/fy-2026-28.html',
    )
    // The occupation-tax-rate row is caught by the same widened vocabulary.
    expect(items.some((item) => item.officialSourceUrl.endsWith('fy-2026-12.html'))).toBe(true)
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

  it('keeps AR tax news while excluding tax-navigation chrome and unrelated news', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'ar.temporary_announcements',
        title: 'Arkansas DFA News',
        url: 'https://www.dfa.arkansas.gov/about/news/',
        jurisdiction: 'AR',
      },
      {
        fetchedAt: new Date('2026-07-10T00:00:00.000Z'),
        body: [
          '<nav><a href="/office/taxes/excise-tax-administration/sales-use-tax/">Sales &amp; Use Tax</a></nav>',
          '<main>',
          '<a href="/news/licenses-and-state-ids-now-available-in-apple-wallet/">Licenses and State IDs now available in Apple Wallet</a>',
          '<a href="/news/disaster-tax-relief-filing-deadline/">Disaster tax relief extends filing and payment deadline</a>',
          '</main>',
        ].join(''),
      },
    )

    expect(items.map(({ title, officialSourceUrl }) => ({ title, officialSourceUrl }))).toEqual([
      {
        title: 'Disaster tax relief extends filing and payment deadline',
        officialSourceUrl: 'https://www.dfa.arkansas.gov/news/disaster-tax-relief-filing-deadline/',
      },
    ])
  })

  it('rejects cross-origin AR RSS items before relevance filtering', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'ar.temporary_announcements',
        title: 'Arkansas DFA News',
        url: 'https://www.dfa.arkansas.gov/feed/?post_type=news',
        jurisdiction: 'AR',
      },
      {
        fetchedAt: new Date('2026-07-10T00:00:00.000Z'),
        body: [
          '<rss><channel>',
          '<item><title>Disaster tax relief extends filing deadline</title>',
          '<link>https://example.com/news/disaster-tax-relief/</link></item>',
          '<item><title>Disaster tax relief extends filing and payment deadline</title>',
          '<link>https://www.dfa.arkansas.gov/news/disaster-tax-relief-filing-deadline/</link></item>',
          '</channel></rss>',
        ].join(''),
      },
    )

    expect(items.map(({ title, officialSourceUrl }) => ({ title, officialSourceUrl }))).toEqual([
      {
        title: 'Disaster tax relief extends filing and payment deadline',
        officialSourceUrl: 'https://www.dfa.arkansas.gov/news/disaster-tax-relief-filing-deadline/',
      },
    ])
  })

  it('parses a Zendesk Help Center JSON feed and keeps TN notices over portal how-tos', () => {
    // TN DOR mirrors its notices on a Zendesk Help Center (revenue.support.tn.gov)
    // because tn.gov drops datacenter fetches. The /api/v2/.../articles.json shape
    // is parsed directly; the per-source filter keeps the legal notices and drops
    // the TNTAP portal how-tos.
    const body = JSON.stringify({
      articles: [
        {
          title: 'FONCE-3 - Entity Types That May Qualify for the FONCE Exemption',
          html_url: 'https://revenue.support.tn.gov/hc/en-us/articles/360058238691-FONCE-3',
          body: '<p>Franchise and excise tax exemption details.</p>',
          updated_at: '2026-06-09T12:00:00Z',
        },
        {
          title: 'LOT-12 - Definition of Consideration',
          html_url: 'https://revenue.support.tn.gov/hc/en-us/articles/1-LOT-12',
          body: '<p>Liquor-by-the-drink tax guidance.</p>',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          title: 'TNTAP Payments-8 – Making an Online Payment in TNTAP',
          html_url: 'https://revenue.support.tn.gov/hc/en-us/articles/2-tntap-pay',
          body: '<p>How to submit a payment.</p>',
          updated_at: '2026-05-29T00:00:00Z',
        },
        {
          title: 'Logging into TNTAP',
          html_url: 'https://revenue.support.tn.gov/hc/en-us/articles/3-login',
          body: '<p>Sign-in help.</p>',
          updated_at: '2026-05-19T00:00:00Z',
        },
      ],
    })
    const items = announcementItemsFromSnapshot(
      {
        id: 'tn.temporary_announcements',
        title: 'Tennessee DOR Revenue News',
        url: 'https://revenue.support.tn.gov/hc/en-us',
        jurisdiction: 'TN',
      },
      { fetchedAt: new Date('2026-06-23T00:00:00.000Z'), body },
    )
    const titles = items.map((item) => item.title)
    expect(titles).toContain('FONCE-3 - Entity Types That May Qualify for the FONCE Exemption')
    expect(titles).toContain('LOT-12 - Definition of Consideration')
    expect(titles).not.toContain('TNTAP Payments-8 – Making an Online Payment in TNTAP')
    expect(titles).not.toContain('Logging into TNTAP')
    const fonce = items.find((item) => item.title.startsWith('FONCE-3'))
    expect(fonce?.officialSourceUrl).toContain('FONCE-3')
    // updated_at rides in the dedupe identity so a re-edited notice re-surfaces.
    expect(fonce?.dedupeText).toContain('2026-06-09T12:00:00Z')
  })

  it('parses an agency newsroom JSON feed (Montana DOR) and resolves relative links', () => {
    // mtrevenue.gov/news/ renders its list client-side from a flat JSON array, so
    // a browser render only ever captured the "Loading…" shell. We fetch
    // /news/article_source.json directly; each entry carries a site-relative link,
    // an ISO date and a teaser.
    const body = JSON.stringify([
      {
        title: 'Individual Income Tax Filing Deadline Reminder',
        link: '/news/recent-news/individual-income-tax-deadline-2026',
        summary: 'The April 15 individual income tax filing deadline is approaching.',
        teaser: '',
        author: '',
        date: '2026-06-11T00:00:00Z',
      },
      {
        title: 'Montana Sales and Use Tax Rate Update',
        link: '/news/recent-news/sales-tax-rate-update',
        summary: '',
        teaser: 'New local option tax rates take effect July 1.',
        date: '2026-05-02T00:00:00Z',
      },
    ])
    const items = announcementItemsFromSnapshot(
      {
        id: 'mt.temporary_announcements',
        title: 'Montana DOR News',
        url: 'https://revenue.mt.gov/news/',
        jurisdiction: 'MT',
      },
      { fetchedAt: new Date('2026-06-23T00:00:00.000Z'), body },
    )
    expect(items.map((item) => item.title)).toContain(
      'Individual Income Tax Filing Deadline Reminder',
    )
    const first = items.find((item) => item.title.startsWith('Individual Income Tax'))
    // A site-relative link resolves against the source origin.
    expect(first?.officialSourceUrl).toBe(
      'https://revenue.mt.gov/news/recent-news/individual-income-tax-deadline-2026',
    )
    // The ISO date becomes publishedAt and rides in the dedupe identity.
    expect(first?.publishedAt.toISOString()).toBe('2026-06-11T00:00:00.000Z')
    expect(first?.dedupeText).toContain('2026-06-11T00:00:00Z')
  })

  it('keeps item dedupeText stable across unrelated listing-page changes', () => {
    const source = {
      id: 'tx.temporary_announcements',
      title: 'Texas Comptroller News',
      url: 'https://comptroller.texas.gov/about/media-center/news/',
      jurisdiction: 'TX',
    }
    const knownLink =
      '<a href="/about/media-center/news/20260408-deadline">April 15 is the tax filing deadline</a>'
    const [firstItem] = announcementItemsFromSnapshot(source, {
      fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
      body: `<main>${knownLink}</main>`,
    })
    // Same item a day later: a new 21st announcement appeared and the footer moved.
    const laterItems = announcementItemsFromSnapshot(source, {
      fetchedAt: new Date('2026-04-09T00:00:00.000Z'),
      body: `<main>${knownLink}<a href="/about/media-center/news/20260409-relief">Disaster relief extends the filing deadline</a><footer>Updated 2026-04-09</footer></main>`,
    })
    const sameItem = laterItems.find((item) => item.externalId === firstItem?.externalId)

    expect(firstItem?.dedupeText).toBeDefined()
    expect(sameItem?.dedupeText).toBe(firstItem?.dedupeText)
    // The whole-page rawText DID change — exactly the drift dedupeText must absorb.
    expect(sameItem?.rawText).not.toBe(firstItem?.rawText)
    expect(firstItem?.dedupeText).toContain('April 15 is the tax filing deadline')
    expect(firstItem?.dedupeText).toContain(firstItem?.officialSourceUrl ?? '')
  })

  it('gives RSS items link-local identity + enrichment; fallback items keep neither', () => {
    // 2026-06-11: RSS announcement items now carry dedupeText (item-local
    // identity; the one-time rehash is absorbed by the ingest loop's
    // suppressDedupeRehashMigration) and enrichFromUrl, so genuinely new feed
    // items get their summary swapped for the detail page — same treatment as
    // HTML link items. Whole-page fallback snapshots keep legacy whole-body
    // hashing and never enrich.
    const rssItems = announcementItemsFromSnapshot(
      {
        id: 'az.temporary_announcements',
        title: 'Arizona DOR News',
        url: 'https://azdor.gov/news-center/feed',
        jurisdiction: 'AZ',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: `<rss><channel>
          <item><guid>signal-1</guid><title>Disaster relief extends filing and payment deadline</title><link>https://azdor.gov/news/relief</link><description>Affected taxpayers have a new filing deadline.</description></item>
        </channel></rss>`,
      },
    )
    expect(rssItems).toHaveLength(1)
    expect(rssItems[0]?.dedupeText).toContain('https://azdor.gov/news/relief')
    expect(rssItems[0]?.enrichFromUrl).toBe('https://azdor.gov/news/relief')

    const fallbackItems = announcementItemsFromSnapshot(
      {
        id: 'nm.temporary_announcements',
        title: 'New Mexico TRD News',
        url: 'https://www.tax.newmexico.gov/news/',
        jurisdiction: 'NM',
      },
      {
        fetchedAt: new Date('2026-04-08T00:00:00.000Z'),
        body: '<main>Plain page without any qualifying links.</main>',
      },
      { fallbackToSourceSnapshot: true },
    )
    expect(fallbackItems).toHaveLength(1)
    expect(fallbackItems[0]?.dedupeText).toBeUndefined()
  })

  // 2026-06-08 — FED rights-window sources. The generic list parser must detect
  // their link text (refund/protective-claim, IRB, AoD vocabulary); production
  // pulls full bodies for IRB/AoD via the PDF-follow path on top of these items.
  it('extracts rights-window posts from the Taxpayer Advocate Service blog list', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'fed.taxpayer_advocate_blog',
        title: 'Taxpayer Advocate Service Blog',
        url: 'https://www.taxpayeradvocate.irs.gov/taxnews-information/blogs-nta/',
        jurisdiction: 'FED',
      },
      {
        fetchedAt: new Date('2026-06-08T00:00:00.000Z'),
        body: '<main><a href="/news/protective-refund-claims-covid">Protective refund claims: preserve taxpayer rights to a COVID-era refund</a><a href="/about-tas">About TAS</a></main>',
      },
    )
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      sourceId: 'fed.taxpayer_advocate_blog',
      title: 'Protective refund claims: preserve taxpayer rights to a COVID-era refund',
    })
  })

  it('detects Internal Revenue Bulletin index links', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'fed.irs_irb',
        title: 'IRS Internal Revenue Bulletins',
        url: 'https://www.irs.gov/irb',
        jurisdiction: 'FED',
      },
      {
        fetchedAt: new Date('2026-06-08T00:00:00.000Z'),
        body: '<main><a href="/irb/2026-23_IRB">Internal Revenue Bulletin: 2026-23</a><a href="/help/telephone-assistance">Get help</a></main>',
      },
    )
    expect(items.map((item) => item.title)).toContain('Internal Revenue Bulletin: 2026-23')
  })

  it('detects Actions on Decisions index links', () => {
    const items = announcementItemsFromSnapshot(
      {
        id: 'fed.irs_actions_on_decisions',
        title: 'IRS Actions on Decisions',
        url: 'https://www.irs.gov/actions-on-decisions',
        jurisdiction: 'FED',
      },
      {
        fetchedAt: new Date('2026-06-08T00:00:00.000Z'),
        body: '<main><a href="/pub/irs-aod/aod-2026-01.pdf">Action on Decision 2026-01: acquiescence in result only</a><a href="/privacy">Privacy</a></main>',
      },
    )
    expect(items.some((item) => item.title.startsWith('Action on Decision 2026-01'))).toBe(true)
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

    await expect(
      selectFetch({ ...caFtbNewsroomAdapter, fetcher: 'browserless' })('/').then((res) =>
        res.text(),
      ),
    ).resolves.toBe('browserless')
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

describe('withFetchTimeout', () => {
  it('aborts a hung origin fetch and reports fetch_timeout', async () => {
    vi.useFakeTimers()
    try {
      const hung = (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        })
      const pending = withFetchTimeout(hung, 30_000)('https://hung.example.gov/page')
      const assertion = expect(pending).rejects.toThrow(
        'fetch_timeout: https://hung.example.gov/page exceeded 30000ms',
      )
      await vi.advanceTimersByTimeAsync(30_000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('passes the response through and clears the watchdog on success', async () => {
    const timed = withFetchTimeout(async () => new Response('ok'))
    const response = await timed('https://fast.example.gov/page')
    await expect(response.text()).resolves.toBe('ok')
  })

  it('rethrows non-timeout failures untouched', async () => {
    const timed = withFetchTimeout(async () => {
      throw new Error('boom')
    })
    await expect(timed('https://broken.example.gov/page')).rejects.toThrow('boom')
  })
})
