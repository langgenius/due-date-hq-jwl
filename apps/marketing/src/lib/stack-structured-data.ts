/**
 * Self-contained JSON-LD for the "works with your stack" hub.
 *
 * Kept OUT of lib/structured-data.ts on purpose: that file is co-edited by other
 * in-flight marketing work, so this page owns its own small, valid graph
 * (CollectionPage + BreadcrumbList + FAQPage) built only from public helpers.
 * The date is this page's real publish date (2026-07-07); no dependency on the
 * shared content-metadata freshness map.
 */
import { MARKETING_SITE_URL, getMarketingUrl } from './site'

type Locale = 'en' | 'zh-CN'
type JsonLdDocument = Record<string, unknown>

// The page's real publish/review date — advance only on a genuine content review.
const STACK_REVIEWED_ON = '2026-07-07'

export interface StackFaqItem {
  question: string
  answer: string
}

export function stackStructuredData(
  lang: Locale,
  title: string,
  description: string,
  faq: StackFaqItem[],
): JsonLdDocument {
  const pathname = lang === 'zh-CN' ? '/zh-CN/works-with-your-stack' : '/works-with-your-stack'
  const homePathname = lang === 'zh-CN' ? '/zh-CN' : '/'
  const url = getMarketingUrl(pathname)
  const homeLabel = lang === 'zh-CN' ? '首页' : 'Home'
  const pageLabel = lang === 'zh-CN' ? '兼容你的工具栈' : 'Works with your stack'

  const nodes: JsonLdDocument[] = [
    {
      '@type': 'CollectionPage',
      '@id': `${url}#webpage`,
      name: title,
      url,
      inLanguage: lang,
      description,
      isPartOf: { '@id': `${MARKETING_SITE_URL}/#website` },
      dateModified: STACK_REVIEWED_ON,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { name: homeLabel, pathname: homePathname },
        { name: pageLabel, pathname },
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
