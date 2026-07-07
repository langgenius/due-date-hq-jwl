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
const CONTENT_DATES_BY_SLUG: Record<string, { publishedOn?: string; reviewedOn?: string }> = {
  // Federal form rule references added 2026-06-25 (each date source-verified
  // against irs.gov); they did not exist at the 2026-06-18 site-wide review, so
  // their JSON-LD datePublished/dateModified and sitemap lastmod reflect 06-25.
  'form-1120-c-corp-deadline': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'form-1040-individual-deadline': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'form-1041-estate-trust-deadline': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'form-940-futa-deadline': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'form-w-2-filing-deadline': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'form-2553-s-corp-election-deadline': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'form-5500-benefit-plan-deadline': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  // Comparison pages added 2026-06-25 (positioning, source-checked product
  // categories), likewise post-dating the 06-18 site-wide review.
  'jetpack-workflow-deadline-operations': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'aero-workflow-deadline-operations': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'keeper-deadline-operations': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  // Payroll deadlines guide added 2026-06-25 (941/940/W-2/1099 + deposit
  // schedule, verified vs the IRS Employment Tax Due Dates page).
  'payroll-tax-deadlines': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  // QuickBooks complement guide added 2026-06-25.
  'deadline-monitoring-for-quickbooks-firms': {
    publishedOn: '2026-06-25',
    reviewedOn: '2026-06-25',
  },
  // Competitor "alternatives" roundup pages added 2026-06-25.
  'taxdome-alternatives': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'karbon-alternatives': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  'file-in-time-alternatives': { publishedOn: '2026-06-25', reviewedOn: '2026-06-25' },
  // IRS disaster-relief hub + per-notice landing pages added 2026-07-06 (each IRS
  // fact transcribed + cited from irs.gov in lib/disaster-notices.ts). The hub and
  // every notice slug share this date so their JSON-LD dateModified and sitemap
  // lastmod reflect the real publish, not the 06-18 site-wide review.
  'irs-disaster-relief': { publishedOn: '2026-07-06', reviewedOn: '2026-07-06' },
  'arizona-san-carlos-apache-tribe-severe-storms-flooding': {
    publishedOn: '2026-07-06',
    reviewedOn: '2026-07-06',
  },
  'georgia-southeast-wildfires': { publishedOn: '2026-07-06', reviewedOn: '2026-07-06' },
  'hawaii-severe-storms-flooding': { publishedOn: '2026-07-06', reviewedOn: '2026-07-06' },
  'washington-severe-storms-flooding-landslides': {
    publishedOn: '2026-07-06',
    reviewedOn: '2026-07-06',
  },
  'northern-mariana-islands-super-typhoon-sinlaku': {
    publishedOn: '2026-07-06',
    reviewedOn: '2026-07-06',
  },
  'missouri-severe-storms-tornadoes-flooding': {
    publishedOn: '2026-07-06',
    reviewedOn: '2026-07-06',
  },
  // Neutral editorial CPA response-playbook guide added 2026-07-06.
  'cpa-response-playbook': { publishedOn: '2026-07-06', reviewedOn: '2026-07-06' },
  // "Works with your stack" complement hub added 2026-07-07. Its JSON-LD
  // dateModified is set independently in lib/stack-structured-data.ts; this entry
  // aligns the sitemap lastmod to the real publish date.
  'works-with-your-stack': { publishedOn: '2026-07-07', reviewedOn: '2026-07-07' },
}

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
  alabama: [
    {
      label: 'Alabama Department of Revenue resources',
      href: 'https://www.revenue.alabama.gov/',
    },
  ],
  alaska: [
    {
      label: 'Alaska Department of Revenue resources',
      href: 'https://tax.alaska.gov/',
    },
  ],
  arkansas: [
    {
      label: 'Arkansas Department of Finance and Administration resources',
      href: 'https://www.dfa.arkansas.gov/income-tax/',
    },
  ],
  delaware: [
    {
      label: 'Delaware Division of Revenue resources',
      href: 'https://revenue.delaware.gov/',
    },
  ],
  hawaii: [
    {
      label: 'Hawaii Department of Taxation resources',
      href: 'https://tax.hawaii.gov/',
    },
  ],
  idaho: [
    {
      label: 'Idaho State Tax Commission resources',
      href: 'https://tax.idaho.gov/taxes/income-tax/business-income/',
    },
  ],
  iowa: [
    {
      label: 'Iowa Department of Revenue resources',
      href: 'https://revenue.iowa.gov/',
    },
  ],
  kansas: [
    {
      label: 'Kansas Department of Revenue resources',
      href: 'https://www.ksrevenue.gov/',
    },
  ],
  kentucky: [
    {
      label: 'Kentucky Department of Revenue resources',
      href: 'https://revenue.ky.gov/',
    },
  ],
  louisiana: [
    {
      label: 'Louisiana Department of Revenue resources',
      href: 'https://revenue.louisiana.gov/',
    },
  ],
  maine: [
    {
      label: 'Maine Revenue Services resources',
      href: 'https://www.maine.gov/revenue/',
    },
  ],
  mississippi: [
    {
      label: 'Mississippi Department of Revenue resources',
      href: 'https://www.dor.ms.gov/',
    },
  ],
  montana: [
    {
      label: 'Montana Department of Revenue resources',
      href: 'https://revenue.mt.gov/',
    },
  ],
  nebraska: [
    {
      label: 'Nebraska Department of Revenue resources',
      href: 'https://revenue.nebraska.gov/',
    },
  ],
  nevada: [
    {
      label: 'Nevada Department of Taxation resources',
      href: 'https://tax.nv.gov/',
    },
  ],
  'new-hampshire': [
    {
      label: 'New Hampshire Department of Revenue Administration resources',
      href: 'https://www.revenue.nh.gov/',
    },
  ],
  'new-mexico': [
    {
      label: 'New Mexico Taxation and Revenue Department resources',
      href: 'https://www.tax.newmexico.gov/',
    },
  ],
  'north-dakota': [
    {
      label: 'North Dakota Office of State Tax Commissioner resources',
      href: 'https://www.tax.nd.gov/business/corporate-income-tax',
    },
  ],
  oklahoma: [
    {
      label: 'Oklahoma Tax Commission resources',
      href: 'https://oklahoma.gov/tax.html',
    },
  ],
  oregon: [
    {
      label: 'Oregon Department of Revenue resources',
      href: 'https://www.oregon.gov/dor/',
    },
  ],
  'rhode-island': [
    {
      label: 'Rhode Island Division of Taxation resources',
      href: 'https://tax.ri.gov/',
    },
  ],
  'south-carolina': [
    {
      label: 'South Carolina Department of Revenue resources',
      href: 'https://dor.sc.gov/',
    },
  ],
  'south-dakota': [
    {
      label: 'South Dakota Department of Revenue resources',
      href: 'https://dor.sd.gov/',
    },
  ],
  utah: [
    {
      label: 'Utah State Tax Commission resources',
      href: 'https://tax.utah.gov/',
    },
  ],
  vermont: [
    {
      label: 'Vermont Department of Taxes resources',
      href: 'https://tax.vermont.gov/',
    },
  ],
  'west-virginia': [
    {
      label: 'West Virginia Tax Division resources',
      href: 'https://tax.wv.gov/',
    },
  ],
  wyoming: [
    {
      label: 'Wyoming Department of Revenue resources',
      href: 'https://revenue.wyo.gov/',
    },
  ],
}
