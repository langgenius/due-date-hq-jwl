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
import { howItWorksFaq } from './how-it-works-faq'
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

// Canonical entity facts for the Organization node. These are true descriptions
// of what the company does (not claims we can't back): slogan mirrors the footer
// tagline, knowsAbout lists the real subject areas. foundingDate / sameAs stay
// out until we have a verifiable date and real off-repo profiles — never fabricated.
const ORG_SLOGAN = 'Rule-change monitoring for US CPA practices — with a source on every date.'
const ORG_KNOWS_ABOUT: readonly string[] = [
  'CPA tax deadline management',
  'IRS filing deadlines',
  'State tax filing deadlines',
  'Tax deadline change monitoring',
  'Multi-state tax compliance',
  'Tax filing extensions',
  'Disaster relief filing postponements',
]

function organizationNode(t: LandingCopy): JsonLdDocument {
  const node: JsonLdDocument = {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: t.geo.structuredData.organizationName,
    url: SITE,
    logo: { '@type': 'ImageObject', url: `${SITE}/favicon.svg` },
    description: t.geo.structuredData.organizationDescription,
    slogan: ORG_SLOGAN,
    areaServed: 'US',
    knowsAbout: [...ORG_KNOWS_ABOUT],
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

// The product's core service, as a schema.org Service node — grounded in the
// home page's own pitch (24/7 deadline-change monitoring, FED+50+DC). Strengthens
// the entity graph for AI/answer engines; no offers/ratings (nothing to cite).
const SERVICE_COPY: Record<Locale, { name: string; serviceType: string; description: string }> = {
  en: {
    name: 'Tax deadline-change monitoring for CPA practices',
    serviceType: 'Tax deadline monitoring',
    description:
      'Around-the-clock monitoring of IRS, state tax-agency, and FEMA disaster sources for filing-deadline and rule changes, showing which clients each change affects with a source on every date — across the federal government plus all 50 states and DC.',
  },
  'zh-CN': {
    name: '面向 CPA 事务所的税务截止日变化监控',
    serviceType: '税务截止日监控',
    description:
      '全天候监控 IRS、各州税务机关与 FEMA 灾害来源的申报截止日与规则变化，标出每条变化影响到哪些客户，并为每个日期附上官方来源——覆盖联邦加全部 50 个州与 DC。',
  },
}

function serviceNode(lang: Locale): JsonLdDocument {
  const c = SERVICE_COPY[lang]
  return {
    '@type': 'Service',
    name: c.name,
    serviceType: c.serviceType,
    description: c.description,
    provider: { '@id': ORG_ID },
    areaServed: 'US',
    inLanguage: lang,
  }
}

export function homeStructuredData(t: LandingCopy, lang: Locale): JsonLdDocument {
  const path = homePath(lang)
  return graph([
    ...baseNodes(t, lang),
    webPageNode(path, t.meta.title, t.meta.description, lang, 'home'),
    serviceNode(lang),
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
    faqNode(howItWorksFaq[lang]),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      { name: labels[lang], pathname },
    ]),
  ])
}

export function resourceIndexStructuredData(
  t: LandingCopy,
  lang: Locale,
  title: string,
  description: string,
): JsonLdDocument {
  const pathname = lang === 'zh-CN' ? '/zh-CN/resources' : '/resources'
  const labels: Record<Locale, string> = { en: 'Resources', 'zh-CN': '资源' }
  return graph([
    ...baseNodes(t, lang),
    { ...webPageNode(pathname, title, description, lang, 'resources'), '@type': 'CollectionPage' },
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
    ...(comingSoon
      ? [faqNode(t.pricing.comingSoonFaq)]
      : [productNode(t.pricing, pathname), faqNode(t.pricing.faq)]),
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

// The visible jurisdiction roster as a schema.org ItemList — the states with a
// published detail page become linked ListItems (matches what renders).
function coverageItemListNode(page: StateCoverageCopy, lang: Locale): JsonLdDocument {
  const name = lang === 'zh-CN' ? '覆盖的州与辖区' : 'States and jurisdictions covered'
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: page.states.length,
    itemListElement: page.states.map((s, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: s.name,
      url: absoluteUrl(s.href),
    })),
  }
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
    coverageItemListNode(page, lang),
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

// ---- IRS disaster-relief pages (/irs-disaster-relief[/slug]) --------------
// English-only v1. These pages are built from lib/disaster-notices.ts (the ONE
// verified dataset), not from i18n copy, so the structured-data builders take
// plain title/description/faq args plus the site LandingCopy for the base graph.

export function disasterHubStructuredData(
  siteCopy: LandingCopy,
  lang: Locale,
  pathname: string,
  title: string,
  description: string,
  faq: FaqItemCopy[],
): JsonLdDocument {
  const labels: Record<Locale, string> = {
    en: 'IRS disaster relief',
    'zh-CN': 'IRS 灾害减免',
  }
  return graph([
    ...baseNodes(siteCopy, lang),
    { ...webPageNode(pathname, title, description, lang), '@type': 'CollectionPage' },
    faqNode(faq),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      { name: labels[lang], pathname },
    ]),
  ])
}

/** /widget — the free embeddable deadline-change widget + JSON feed docs page. */
export function widgetStructuredData(
  siteCopy: LandingCopy,
  lang: Locale,
  pathname: string,
  title: string,
  description: string,
  faq: FaqItemCopy[],
): JsonLdDocument {
  return graph([
    ...baseNodes(siteCopy, lang),
    webPageNode(pathname, title, description, lang),
    faqNode(faq),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      { name: 'Deadline widget', pathname },
    ]),
  ])
}

export function disasterNoticeStructuredData(
  siteCopy: LandingCopy,
  lang: Locale,
  pathname: string,
  slug: string,
  title: string,
  description: string,
  leafCrumb: string,
  faq: FaqItemCopy[],
): JsonLdDocument {
  const hubLabels: Record<Locale, string> = {
    en: 'IRS disaster relief',
    'zh-CN': 'IRS 灾害减免',
  }
  const hubPath = lang === 'zh-CN' ? '/zh-CN/irs-disaster-relief' : '/irs-disaster-relief'
  return graph([
    ...baseNodes(siteCopy, lang),
    webPageNode(pathname, title, description, lang, slug),
    articleNode(pathname, title, description, lang, slug),
    faqNode(faq),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      { name: hubLabels[lang], pathname: hubPath },
      { name: leafCrumb, pathname },
    ]),
  ])
}

// Generic HowTo node for editorial guides that supply their own steps (unlike
// the fixed how-it-works HowTo). Used by the disaster-relief CPA playbook.
function genericHowToNode(
  lang: Locale,
  name: string,
  description: string,
  steps: { name: string; text: string }[],
): JsonLdDocument {
  return {
    '@type': 'HowTo',
    name,
    description,
    inLanguage: lang,
    step: steps.map((s, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: s.name,
      text: s.text,
    })),
  }
}

// The neutral editorial playbook (/irs-disaster-relief/cpa-response-playbook):
// an Article + a HowTo (the real CPA workflow) + FAQPage + breadcrumb. Reuses
// the shared helpers; steps/faq come from the page (English-only v1).
export function disasterPlaybookStructuredData(
  siteCopy: LandingCopy,
  lang: Locale,
  pathname: string,
  slug: string,
  title: string,
  description: string,
  howToName: string,
  howToDescription: string,
  steps: { name: string; text: string }[],
  faq: FaqItemCopy[],
): JsonLdDocument {
  const hubLabels: Record<Locale, string> = {
    en: 'IRS disaster relief',
    'zh-CN': 'IRS 灾害减免',
  }
  const hubPath = lang === 'zh-CN' ? '/zh-CN/irs-disaster-relief' : '/irs-disaster-relief'
  return graph([
    ...baseNodes(siteCopy, lang),
    webPageNode(pathname, title, description, lang, slug),
    articleNode(pathname, title, description, lang, slug),
    genericHowToNode(lang, howToName, howToDescription, steps),
    faqNode(faq),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      { name: hubLabels[lang], pathname: hubPath },
      { name: 'CPA response playbook', pathname },
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
    faqNode(page.faq ?? []),
    breadcrumbNode([
      { name: CRUMB_LABELS.home[lang], pathname: homePath(lang) },
      // Short leaf crumb (the page's eyebrow label), not the full hero sentence.
      { name: page.hero.eyebrow, pathname },
    ]),
  ])
}
