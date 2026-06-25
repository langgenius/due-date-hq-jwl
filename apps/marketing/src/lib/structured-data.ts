import type { Locale } from '@duedatehq/i18n/locales'
import type {
  FaqItemCopy,
  GuidePageCopy,
  LandingCopy,
  PricingCopy,
  ResourcePageCopy,
  StateCoverageCopy,
  StatePageCopy,
} from '../i18n/types'
import { getContentDates } from './content-metadata'
import { homeFaq } from './home-faq'
import { MARKETING_SITE_URL, getMarketingUrl } from './site'
import type { TrustPageCopy } from './trust-pages'

export type JsonLdDocument = Record<string, unknown>

export const SITE = MARKETING_SITE_URL
const OFFER_AVAILABILITY = 'https://schema.org/OnlineOnly'
const OFFER_PRICE_CURRENCY = 'USD'

// Stable @id anchors so every node resolves to one shared entity in the graph.
const ORG_ID = `${SITE}/#organization`
const WEBSITE_ID = `${SITE}/#website`

// Entity sameAs — fill with the real off-repo profile URLs once they exist
// (LinkedIn / Crunchbase / G2 / Capterra). Left empty (never fabricated) so the
// Organization node never claims a profile that does not exist.
const ORG_SAME_AS: readonly string[] = []
const ORG_SUPPORT_EMAIL = 'support@duedatehq.com'

// Breadcrumb labels are localized here; leaf crumbs use page-provided copy.
const CRUMB_LABELS: Record<
  'home' | 'pricing' | 'resources' | 'stateCoverage',
  Record<Locale, string>
> = {
  home: { en: 'Home', 'zh-CN': '首页' },
  pricing: { en: 'Pricing', 'zh-CN': '价格' },
  resources: { en: 'Resources', 'zh-CN': '资源' },
  stateCoverage: { en: 'State coverage', 'zh-CN': '州覆盖' },
}

function absoluteUrl(pathname: string): string {
  return getMarketingUrl(pathname)
}

function homePath(lang: Locale): string {
  return lang === 'zh-CN' ? '/zh-CN' : '/'
}

function webPageId(pathname: string): string {
  return `${absoluteUrl(pathname)}#webpage`
}

function withoutNulls(items: Array<JsonLdDocument | null>): JsonLdDocument[] {
  return items.filter((item): item is JsonLdDocument => item !== null)
}

function graph(nodes: Array<JsonLdDocument | null>): JsonLdDocument {
  return { '@context': 'https://schema.org', '@graph': withoutNulls(nodes) }
}

function organizationNode(t: LandingCopy): JsonLdDocument {
  const node: JsonLdDocument = {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: t.geo.structuredData.organizationName,
    url: SITE,
    logo: { '@type': 'ImageObject', url: `${SITE}/favicon.svg` },
    description: t.geo.structuredData.organizationDescription,
    areaServed: 'US',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: ORG_SUPPORT_EMAIL,
      areaServed: 'US',
      availableLanguage: ['en', 'zh'],
    },
  }
  if (ORG_SAME_AS.length > 0) node.sameAs = [...ORG_SAME_AS]
  return node
}

function webSiteNode(t: LandingCopy, lang: Locale): JsonLdDocument {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: t.geo.structuredData.websiteName,
    url: SITE,
    inLanguage: lang,
    description: t.meta.description,
    publisher: { '@id': ORG_ID },
  }
}

function softwareApplicationNode(t: LandingCopy, lang: Locale): JsonLdDocument {
  return {
    '@type': 'SoftwareApplication',
    name: t.geo.structuredData.productName,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE,
    inLanguage: lang,
    description: t.geo.structuredData.productDescription,
    publisher: { '@id': ORG_ID },
    audience: {
      '@type': 'Audience',
      audienceType: t.geo.structuredData.audience,
    },
  }
}

function baseNodes(t: LandingCopy, lang: Locale): JsonLdDocument[] {
  return [organizationNode(t), webSiteNode(t, lang), softwareApplicationNode(t, lang)]
}

function webPageNode(
  pathname: string,
  title: string,
  description: string,
  lang: Locale,
  slug?: string,
): JsonLdDocument {
  return {
    '@type': 'WebPage',
    '@id': webPageId(pathname),
    name: title,
    url: absoluteUrl(pathname),
    inLanguage: lang,
    description,
    isPartOf: { '@id': WEBSITE_ID },
    dateModified: getContentDates(slug).reviewedOn,
  }
}

function breadcrumbNode(items: { name: string; pathname: string }[]): JsonLdDocument {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.pathname),
    })),
  }
}

function faqNode(faq: FaqItemCopy[]): JsonLdDocument | null {
  if (faq.length === 0) return null

  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

function planPrice(plan: PricingCopy['plans'][number]): number | null {
  const match = plan.price.match(/\d+(?:\.\d+)?/)
  if (!match) return null

  return Number(match[0])
}

function productNode(pricing: PricingCopy, pathname: string): JsonLdDocument {
  const offers: JsonLdDocument[] = pricing.plans.flatMap((plan) => {
    if (plan.priceKind === 'text') return []

    const price = planPrice(plan)
    if (price === null) return []

    return [
      {
        '@type': 'Offer',
        name: plan.name,
        url: absoluteUrl(pathname),
        price,
        priceCurrency: OFFER_PRICE_CURRENCY,
        availability: OFFER_AVAILABILITY,
        description: `${plan.description} ${plan.clients}.`,
      },
    ]
  })

  return {
    '@type': 'Product',
    name: 'DueDateHQ',
    url: absoluteUrl(pathname),
    image: `${SITE}/og/home.en.png`,
    description: pricing.meta.description,
    brand: { '@id': ORG_ID },
    offers,
  }
}

function articleNode(
  pathname: string,
  title: string,
  description: string,
  lang: Locale,
  slug?: string,
): JsonLdDocument {
  const dates = getContentDates(slug)
  return {
    '@type': 'Article',
    headline: title,
    description,
    url: absoluteUrl(pathname),
    mainEntityOfPage: { '@id': webPageId(pathname) },
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: lang,
    image: `${SITE}/og/home.${lang}.png`,
    datePublished: dates.publishedOn,
    dateModified: dates.reviewedOn,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
  }
}

export function homeStructuredData(t: LandingCopy, lang: Locale): JsonLdDocument {
  const path = homePath(lang)
  return graph([
    ...baseNodes(t, lang),
    webPageNode(path, t.meta.title, t.meta.description, lang, 'home'),
    // The landing's visible FAQ (components/home/Faq.astro) shares its copy with
    // this node via lib/home-faq.ts, so the markup always matches what renders.
    faqNode(homeFaq[lang]),
    breadcrumbNode([{ name: CRUMB_LABELS.home[lang], pathname: path }]),
  ])
}

// How-it-works HowTo copy. The four steps mirror the page's visible loop
// (Watch · Match · Rank · Apply) so the markup matches the rendered content; the
// descriptions paraphrase the on-page hero lead, not a specific worked example.
const HOW_IT_WORKS_HOWTO: Record<
  Locale,
  { name: string; description: string; steps: { name: string; text: string }[] }
> = {
  en: {
    name: 'How DueDateHQ turns a deadline change into the clients it affects',
    description:
      'DueDateHQ runs one loop around the clock: watch official sources, match each change to your clients, rank the week by risk, and apply the fix with a source on every date.',
    steps: [
      {
        name: 'Watch',
        text: 'DueDateHQ watches official IRS, state tax-agency, and FEMA sources around the clock for deadline and rule changes.',
      },
      {
        name: 'Match',
        text: 'It matches each source-backed change to the clients in your book it actually affects, using your filing profiles.',
      },
      {
        name: 'Rank',
        text: 'It ranks your week by which clients are most at risk, so the Monday triage starts with what matters most.',
      },
      {
        name: 'Apply',
        text: 'It applies the new date with the official source attached and logs the change to an inspectable audit trail.',
      },
    ],
  },
  'zh-CN': {
    name: 'DueDateHQ 如何把一次截止日变化转成受影响的客户',
    description:
      'DueDateHQ 全天候只跑一个闭环：监控官方来源、把每条变化匹配到你的客户、按风险为一周排序，并在应用时为每个日期附上来源。',
    steps: [
      {
        name: '监控',
        text: 'DueDateHQ 全天候监控官方 IRS、各州税务机关与 FEMA 来源的截止日与规则变化。',
      },
      {
        name: '匹配',
        text: '它依据你的客户申报档案，把每条带来源的变化匹配到真正受影响的客户。',
      },
      {
        name: '排序',
        text: '它按客户风险高低为你的一周排序，让周一分诊从最要紧的事开始。',
      },
      {
        name: '应用',
        text: '它在应用新日期时附上官方来源，并把变更记入可追查的审计历史。',
      },
    ],
  },
}

function howToNode(lang: Locale): JsonLdDocument {
  const copy = HOW_IT_WORKS_HOWTO[lang]
  return {
    '@type': 'HowTo',
    name: copy.name,
    description: copy.description,
    inLanguage: lang,
    step: copy.steps.map((s, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: s.name,
      text: s.text,
    })),
  }
}

export function howItWorksStructuredData(
  t: LandingCopy,
  lang: Locale,
  title: string,
  description: string,
): JsonLdDocument {
  const pathname = lang === 'zh-CN' ? '/zh-CN/how-it-works' : '/how-it-works'
  const labels: Record<Locale, string> = { en: 'How it works', 'zh-CN': '运作方式' }
  return graph([
    ...baseNodes(t, lang),
    webPageNode(pathname, title, description, lang, 'how-it-works'),
    howToNode(lang),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      { name: labels[lang], pathname },
    ]),
  ])
}

export function pricingStructuredData(
  t: LandingCopy,
  lang: Locale,
  pathname: string,
  // While plans are "coming soon" we publish neither priced Offers nor the
  // plan/beta FAQ — the markup must match the visible page (no rich-result
  // mismatch). Flips with PRICING_COMING_SOON.
  comingSoon = false,
): JsonLdDocument {
  return graph([
    ...baseNodes(t, lang),
    webPageNode(pathname, t.pricing.meta.title, t.pricing.meta.description, lang, 'pricing'),
    ...(comingSoon ? [] : [productNode(t.pricing, pathname), faqNode(t.pricing.faq)]),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      { name: CRUMB_LABELS.pricing[lang], pathname },
    ]),
  ])
}

export function resourceStructuredData(
  siteCopy: LandingCopy,
  page: ResourcePageCopy | GuidePageCopy,
  lang: Locale,
  pathname: string,
): JsonLdDocument {
  const slug = 'slug' in page ? page.slug : undefined
  return graph([
    ...baseNodes(siteCopy, lang),
    webPageNode(pathname, page.meta.title, page.meta.description, lang, slug),
    slug ? articleNode(pathname, page.meta.title, page.meta.description, lang, slug) : null,
    faqNode(page.faq),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      {
        name: CRUMB_LABELS.resources[lang],
        pathname: lang === 'zh-CN' ? '/zh-CN/rules' : '/rules',
      },
      { name: page.hero.title, pathname },
    ]),
  ])
}

export function stateCoverageStructuredData(
  siteCopy: LandingCopy,
  page: StateCoverageCopy,
  lang: Locale,
  pathname: string,
): JsonLdDocument {
  return graph([
    ...baseNodes(siteCopy, lang),
    webPageNode(pathname, page.meta.title, page.meta.description, lang, 'state-coverage'),
    faqNode(page.faq),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      { name: CRUMB_LABELS.stateCoverage[lang], pathname },
    ]),
  ])
}

export function statePageStructuredData(
  siteCopy: LandingCopy,
  page: StatePageCopy,
  lang: Locale,
  pathname: string,
): JsonLdDocument {
  return graph([
    ...baseNodes(siteCopy, lang),
    webPageNode(pathname, page.meta.title, page.meta.description, lang, page.slug),
    faqNode(page.faq),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      {
        name: CRUMB_LABELS.stateCoverage[lang],
        pathname: lang === 'zh-CN' ? '/zh-CN/state-coverage' : '/state-coverage',
      },
      { name: page.name, pathname },
    ]),
  ])
}

export function trustPageStructuredData(
  siteCopy: LandingCopy,
  page: TrustPageCopy,
  lang: Locale,
  pathname: string,
): JsonLdDocument {
  return graph([
    ...baseNodes(siteCopy, lang),
    webPageNode(pathname, page.meta.title, page.meta.description, lang, page.slug),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      { name: page.hero.title, pathname },
    ]),
  ])
}
