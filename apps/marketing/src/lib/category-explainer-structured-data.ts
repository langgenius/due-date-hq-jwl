/**
 * Self-contained JSON-LD for the "what is …" category-definition pages.
 *
 * Kept OUT of lib/structured-data.ts on purpose (that file is co-edited by other
 * in-flight marketing work — same reasoning as lib/stack-structured-data.ts).
 * Builds its own valid graph: WebPage + DefinedTerm + BreadcrumbList + FAQPage.
 * References the shared entity nodes by @id string only (#website, #software) so
 * the DefinedTerm resolves to DueDateHQ without importing the shared module.
 */
import { MARKETING_SITE_URL, getMarketingUrl } from './site'

type Locale = 'en' | 'zh-CN'
type JsonLdDocument = Record<string, unknown>

interface CategoryFaqItem {
  question: string
  answer: string
}

export interface CategoryStructuredDataInput {
  lang: Locale
  slug: string
  title: string
  description: string
  term: string
  definition: string
  reviewedOn: string
  faq: CategoryFaqItem[]
}

export function categoryStructuredData(input: CategoryStructuredDataInput): JsonLdDocument {
  const { lang, slug, title, description, term, definition, reviewedOn, faq } = input
  const pathname = lang === 'zh-CN' ? `/zh-CN/${slug}` : `/${slug}`
  const homePathname = lang === 'zh-CN' ? '/zh-CN' : '/'
  const url = getMarketingUrl(pathname)
  const homeLabel = lang === 'zh-CN' ? '首页' : 'Home'
  const termId = `${url}#definedterm`

  const nodes: JsonLdDocument[] = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      name: title,
      url,
      inLanguage: lang,
      description,
      isPartOf: { '@id': `${MARKETING_SITE_URL}/#website` },
      about: [{ '@id': termId }, { '@id': `${MARKETING_SITE_URL}/#software` }],
      dateModified: reviewedOn,
    },
    {
      '@type': 'DefinedTerm',
      '@id': termId,
      name: term,
      description: definition,
      inLanguage: lang,
      subjectOf: { '@id': `${url}#webpage` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { name: homeLabel, pathname: homePathname },
        { name: title, pathname },
      ].map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: getMarketingUrl(item.pathname),
      })),
    },
  ]

  if (faq.length > 0) {
    nodes.push({
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    })
  }

  return { '@context': 'https://schema.org', '@graph': nodes }
}
