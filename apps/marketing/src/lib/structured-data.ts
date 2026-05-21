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
import { CONTENT_PUBLISHED_ON, CONTENT_REVIEWED_ON } from './content-metadata'
import { MARKETING_SITE_URL, getMarketingUrl } from './site'
import type { TrustPageCopy } from './trust-pages'

export type JsonLdDocument = Record<string, unknown>

export const SITE = MARKETING_SITE_URL
const OFFER_AVAILABILITY = 'https://schema.org/OnlineOnly'
const OFFER_PRICE_CURRENCY = 'USD'

function absoluteUrl(pathname: string): string {
  return getMarketingUrl(pathname)
}

function baseGraph(t: LandingCopy, lang: Locale): JsonLdDocument[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: t.geo.structuredData.organizationName,
      url: SITE,
      logo: `${SITE}/favicon.svg`,
      description: t.geo.structuredData.organizationDescription,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: t.geo.structuredData.websiteName,
      url: SITE,
      inLanguage: lang,
      description: t.meta.description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: t.geo.structuredData.productName,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE,
      inLanguage: lang,
      description: t.geo.structuredData.productDescription,
      audience: {
        '@type': 'Audience',
        audienceType: t.geo.structuredData.audience,
      },
    },
  ]
}

function webPageDocument(
  pathname: string,
  title: string,
  description: string,
  lang: Locale,
): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url: absoluteUrl(pathname),
    inLanguage: lang,
    description,
    dateModified: CONTENT_REVIEWED_ON,
  }
}

function breadcrumbDocument(items: { name: string; pathname: string }[]): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.pathname),
    })),
  }
}

function faqDocument(faq: FaqItemCopy[]): JsonLdDocument | null {
  if (faq.length === 0) return null

  return {
    '@context': 'https://schema.org',
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

function productDocument(pricing: PricingCopy, pathname: string): JsonLdDocument {
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
        description: `${plan.description} ${plan.aiLabel}: ${plan.aiDescription}`,
      },
    ]
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'DueDateHQ',
    url: absoluteUrl(pathname),
    description: pricing.meta.description,
    brand: {
      '@type': 'Brand',
      name: 'DueDateHQ',
    },
    offers,
  }
}

function articleDocument(
  pathname: string,
  title: string,
  description: string,
  lang: Locale,
): JsonLdDocument {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: absoluteUrl(pathname),
    inLanguage: lang,
    image: `${SITE}/og/home.${lang}.png`,
    datePublished: CONTENT_PUBLISHED_ON,
    dateModified: CONTENT_REVIEWED_ON,
    author: {
      '@type': 'Organization',
      name: 'DueDateHQ',
      url: SITE,
    },
    publisher: {
      '@type': 'Organization',
      name: 'DueDateHQ',
      url: SITE,
    },
  }
}

function withoutNulls(items: Array<JsonLdDocument | null>): JsonLdDocument[] {
  return items.filter((item): item is JsonLdDocument => item !== null)
}

export function homeStructuredData(t: LandingCopy, lang: Locale): JsonLdDocument[] {
  return [
    ...baseGraph(t, lang),
    webPageDocument('/', t.meta.title, t.meta.description, lang),
    breadcrumbDocument([{ name: 'Home', pathname: '/' }]),
  ]
}

export function pricingStructuredData(
  t: LandingCopy,
  lang: Locale,
  pathname: string,
): JsonLdDocument[] {
  return withoutNulls([
    ...baseGraph(t, lang),
    webPageDocument(pathname, t.pricing.meta.title, t.pricing.meta.description, lang),
    productDocument(t.pricing, pathname),
    faqDocument(t.pricing.faq),
    breadcrumbDocument([
      { name: 'Home', pathname: lang === 'zh-CN' ? '/zh-CN' : '/' },
      { name: 'Pricing', pathname },
    ]),
  ])
}

export function resourceStructuredData(
  siteCopy: LandingCopy,
  page: ResourcePageCopy | GuidePageCopy,
  lang: Locale,
  pathname: string,
): JsonLdDocument[] {
  return withoutNulls([
    ...baseGraph(siteCopy, lang),
    webPageDocument(pathname, page.meta.title, page.meta.description, lang),
    'slug' in page ? articleDocument(pathname, page.meta.title, page.meta.description, lang) : null,
    faqDocument(page.faq),
    breadcrumbDocument([
      { name: 'Home', pathname: lang === 'zh-CN' ? '/zh-CN' : '/' },
      { name: 'Resources', pathname: lang === 'zh-CN' ? '/zh-CN/rules' : '/rules' },
      { name: page.hero.title, pathname },
    ]),
  ])
}

export function stateCoverageStructuredData(
  siteCopy: LandingCopy,
  page: StateCoverageCopy,
  lang: Locale,
  pathname: string,
): JsonLdDocument[] {
  return withoutNulls([
    ...baseGraph(siteCopy, lang),
    webPageDocument(pathname, page.meta.title, page.meta.description, lang),
    faqDocument(page.faq),
    breadcrumbDocument([
      { name: 'Home', pathname: lang === 'zh-CN' ? '/zh-CN' : '/' },
      { name: 'State coverage', pathname },
    ]),
  ])
}

export function statePageStructuredData(
  siteCopy: LandingCopy,
  page: StatePageCopy,
  lang: Locale,
  pathname: string,
): JsonLdDocument[] {
  return withoutNulls([
    ...baseGraph(siteCopy, lang),
    webPageDocument(pathname, page.meta.title, page.meta.description, lang),
    faqDocument(page.faq),
    breadcrumbDocument([
      { name: 'Home', pathname: lang === 'zh-CN' ? '/zh-CN' : '/' },
      {
        name: 'State coverage',
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
): JsonLdDocument[] {
  return [
    ...baseGraph(siteCopy, lang),
    webPageDocument(pathname, page.meta.title, page.meta.description, lang),
    breadcrumbDocument([
      { name: 'Home', pathname: lang === 'zh-CN' ? '/zh-CN' : '/' },
      { name: page.hero.title, pathname },
    ]),
  ]
}
