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
    breadcrumbNode([{ name: CRUMB_LABELS.home[lang], pathname: path }]),
  ])
}

export function pricingStructuredData(
  t: LandingCopy,
  lang: Locale,
  pathname: string,
): JsonLdDocument {
  return graph([
    ...baseNodes(t, lang),
    webPageNode(pathname, t.pricing.meta.title, t.pricing.meta.description, lang, 'pricing'),
    productNode(t.pricing, pathname),
    faqNode(t.pricing.faq),
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
