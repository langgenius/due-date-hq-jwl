// Site-wide freshness defaults. `reviewedOn` advances ONLY when content is
// actually reviewed/changed — never a blind global bump (docs/dev-file/13 §5).
// The 2026-06-18 SEO/GEO realignment reviewed every public page, so that is the
// current site-wide reviewed date; `publishedOn` keeps the original launch date.
export const CONTENT_PUBLISHED_ON = '2026-05-20'
export const CONTENT_REVIEWED_ON = '2026-06-18'

// Per-slug freshness overrides. Key = page slug (guide / state / compare / rule
// slug) or a route key ('home' | 'pricing' | 'state-coverage' | trust slug).
// Add an entry only when a single page changes independently of a site-wide
// pass, so its JSON-LD dateModified and sitemap lastmod reflect the real edit.
const CONTENT_DATES_BY_SLUG: Record<string, { publishedOn?: string; reviewedOn?: string }> = {}

export interface ContentDates {
  publishedOn: string
  reviewedOn: string
}

export function getContentDates(slug?: string): ContentDates {
  const override = (slug ? CONTENT_DATES_BY_SLUG[slug] : undefined) ?? {}
  return {
    publishedOn: override.publishedOn ?? CONTENT_PUBLISHED_ON,
    reviewedOn: override.reviewedOn ?? CONTENT_REVIEWED_ON,
  }
}

export interface OfficialSourceLink {
  label: string
  href: string
}

export const stateOfficialSources: Record<string, OfficialSourceLink[]> = {
  california: [
    {
      label: 'California Franchise Tax Board forms and publications',
      href: 'https://www.ftb.ca.gov/forms/',
    },
  ],
  'new-york': [
    {
      label: 'New York Department of Taxation and Finance business tax resources',
      href: 'https://www.tax.ny.gov/bus/',
    },
  ],
  texas: [
    {
      label: 'Texas Comptroller franchise tax resources',
      href: 'https://comptroller.texas.gov/taxes/franchise/',
    },
  ],
  florida: [
    {
      label: 'Florida Department of Revenue corporate income tax resources',
      href: 'https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx',
    },
  ],
  washington: [
    {
      label: 'Washington Department of Revenue taxes and rates resources',
      href: 'https://dor.wa.gov/taxes-rates',
    },
  ],
  illinois: [
    {
      label: 'Illinois Department of Revenue forms and guidance',
      href: 'https://tax.illinois.gov/forms.html',
    },
  ],
  'new-jersey': [
    {
      label: 'New Jersey Division of Taxation resources',
      href: 'https://www.nj.gov/treasury/taxation/',
    },
  ],
  pennsylvania: [
    {
      label: 'Pennsylvania Department of Revenue resources',
      href: 'https://www.pa.gov/agencies/revenue.html',
    },
  ],
  georgia: [
    {
      label: 'Georgia Department of Revenue resources',
      href: 'https://dor.georgia.gov/',
    },
  ],
  massachusetts: [
    {
      label: 'Massachusetts Department of Revenue resources',
      href: 'https://www.mass.gov/orgs/massachusetts-department-of-revenue',
    },
  ],
  'north-carolina': [
    {
      label: 'North Carolina Department of Revenue resources',
      href: 'https://www.ncdor.gov/',
    },
  ],
  arizona: [
    {
      label: 'Arizona Department of Revenue resources',
      href: 'https://azdor.gov/',
    },
  ],
  colorado: [
    {
      label: 'Colorado Department of Revenue taxation resources',
      href: 'https://tax.colorado.gov/',
    },
  ],
  ohio: [
    {
      label: 'Ohio Department of Taxation resources',
      href: 'https://tax.ohio.gov/',
    },
  ],
  michigan: [
    {
      label: 'Michigan Department of Treasury tax resources',
      href: 'https://www.michigan.gov/taxes',
    },
  ],
  virginia: [
    {
      label: 'Virginia Department of Taxation — corporation income tax',
      href: 'https://www.tax.virginia.gov/corporation-income-tax',
    },
  ],
  maryland: [
    {
      label: 'Comptroller of Maryland — business tax resources',
      href: 'https://www.marylandcomptroller.gov/',
    },
  ],
  minnesota: [
    {
      label: 'Minnesota Department of Revenue — businesses',
      href: 'https://www.revenue.state.mn.us/businesses',
    },
  ],
  wisconsin: [
    {
      label: 'Wisconsin Department of Revenue — businesses',
      href: 'https://www.revenue.wi.gov/Pages/Businesses/Home.aspx',
    },
  ],
  tennessee: [
    {
      label: 'Tennessee Department of Revenue — franchise & excise tax',
      href: 'https://www.tn.gov/revenue/taxes/franchise---excise-tax.html',
    },
  ],
  missouri: [
    {
      label: 'Missouri Department of Revenue — business tax',
      href: 'https://dor.mo.gov/taxation/business/',
    },
  ],
  indiana: [
    {
      label: 'Indiana Department of Revenue — business tax',
      href: 'https://www.in.gov/dor/business-tax/',
    },
  ],
  connecticut: [
    {
      label: 'Connecticut Department of Revenue Services — corporation tax',
      href: 'https://portal.ct.gov/DRS/Corporation-Tax/Corporation-Welcome-Page',
    },
  ],
  'district-of-columbia': [
    {
      label: 'DC Office of Tax and Revenue',
      href: 'https://otr.cfo.dc.gov/',
    },
  ],
}
