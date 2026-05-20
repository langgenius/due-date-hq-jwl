export const SOURCE_WATCH_PLACEHOLDER_RE =
  /\bofficial source registered\b|\btemplates require practice owner or manager acceptance\b/i

const MAIN_CONTAINER_RE =
  /<(main|article)\b[\s\S]*?<\/\1>|<[^>]+(?:role=(["'])main\2|(?:id|class)=(["'])[^"']*(?:main|content|faq|answer|entry)[^"']*\3)[^>]*>[\s\S]*?<\/[^>]+>/gi
const JSON_LD_SCRIPT_RE =
  /<script\b[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi
const EMPTY_LINE_RE = /\n{3,}/g

export function extractOfficialSourceText(html: string): string {
  const faqText = extractJsonLdFaqText(html)
  const candidates = extractReadableHtmlCandidates(html)
  const pageText = candidates.length > 0 ? candidates.join('\n\n') : htmlToText(html)
  return normalizeSourceText([faqText, pageText].filter(Boolean).join('\n\n'))
}

function extractReadableHtmlCandidates(html: string): string[] {
  const candidates = Array.from(html.matchAll(MAIN_CONTAINER_RE))
    .map((match) => htmlToText(match[0] ?? ''))
    .filter((value) => value.length > 0)

  return candidates.length > 0 ? candidates : [htmlToText(html)].filter(Boolean)
}

function extractJsonLdFaqText(html: string): string {
  const chunks: string[] = []
  for (const match of html.matchAll(JSON_LD_SCRIPT_RE)) {
    const raw = decodeHtmlEntities(match[2] ?? '').trim()
    if (!raw) continue
    try {
      collectJsonLdFaqChunks(JSON.parse(raw), chunks)
    } catch {
      // Malformed structured data should not block HTML extraction.
    }
  }
  return chunks.join('\n\n')
}

function collectJsonLdFaqChunks(value: unknown, chunks: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdFaqChunks(item, chunks)
    return
  }
  if (!isRecord(value)) return

  const graph = value['@graph']
  if (Array.isArray(graph)) {
    for (const item of graph) collectJsonLdFaqChunks(item, chunks)
  }

  const type = value['@type']
  const types = Array.isArray(type) ? type : [type]
  if (!types.includes('FAQPage') && !types.includes('Question')) return

  const mainEntity = value.mainEntity
  if (Array.isArray(mainEntity)) {
    for (const item of mainEntity) collectJsonLdQuestion(item, chunks)
    return
  }

  collectJsonLdQuestion(value, chunks)
}

function collectJsonLdQuestion(value: unknown, chunks: string[]): void {
  if (!isRecord(value)) return
  const name = stringValue(value.name)
  const answer = isRecord(value.acceptedAnswer) ? stringValue(value.acceptedAnswer.text) : null
  if (!name && !answer) return
  chunks.push(
    [name ? `Question: ${name}` : null, answer ? `Answer: ${htmlToText(answer)}` : null]
      .filter(Boolean)
      .join('\n'),
  )
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<(br|hr)\b[^>]*>/gi, '\n')
      .replace(/<\/(p|div|section|article|main|li|tr|h[1-6]|dt|dd|button)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
}

function normalizeSourceText(value: string): string {
  return value
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .replace(EMPTY_LINE_RE, '\n\n')
    .trim()
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
