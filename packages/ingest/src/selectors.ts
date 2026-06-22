export interface ParsedDocument {
  querySelectorAll(selector: string): readonly unknown[]
}

export function pickSelector(doc: ParsedDocument, chain: readonly string[]): string | null {
  for (const selector of chain) {
    if (doc.querySelectorAll(selector).length > 0) return selector
  }
  return null
}

export function extractLinks(html: string, baseUrl: string): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = []
  const re = /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(re)) {
    const href = match[2]
    const text = stripHtml(match[3] ?? '')
    if (!href || !text) continue
    try {
      links.push({ href: new URL(href, baseUrl).toString(), text })
    } catch {
      // Ignore malformed source links.
    }
  }
  return links
}

// Anchor text that is a pure format/affordance label ("HTML", "[PDF]", "English",
// "View") carries no announcement meaning — on table-listing pages the real title
// sits in a sibling cell. Used to decide when to recover a row title instead.
const GENERIC_LINK_LABEL_RE =
  /^[[(]?\s*(?:html|pdf|web ?page|web|word|docx?|rtf|te?xt|xlsx?|excel|csv|view|read(?: more)?|more|details?|download|open|link|here|english|español|espanol)\s*[\])]?$/i

export function isGenericLinkLabel(text: string): boolean {
  return GENERIC_LINK_LABEL_RE.test(text.trim())
}

// The title cell of a table row: the longest non-label cell text. Format-label
// cells (the ones holding "[HTML]"/"[PDF]" links) and tiny cells (dates, counts)
// are skipped, leaving the descriptive bulletin title.
function rowTitleFromCells(cells: readonly string[]): string | null {
  let best: string | null = null
  for (const cell of cells) {
    const text = stripHtml(cell)
    if (text.length < 8 || isGenericLinkLabel(text)) continue
    if (!best || text.length > best.length) best = text
  }
  return best
}

// Map resolved-href → row title, for the ONE detail link per <tr> whose own anchor
// text is just a format label. Prefers the HTML detail link over a sibling PDF so a
// bulletin yields a single (enrichable) item, not an HTML + PDF duplicate.
function tableRowTitlesByHref(html: string, baseUrl: string): Map<string, string> {
  const map = new Map<string, string>()
  const anchorRe = /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1] ?? ''
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1] ?? '')
    const title = rowTitleFromCells(cells)
    if (!title) continue
    const labelAnchors = [...row.matchAll(anchorRe)]
      .map((m) => ({ rawHref: m[2] ?? '', text: stripHtml(m[3] ?? '') }))
      .filter((a) => a.rawHref && isGenericLinkLabel(a.text))
    if (labelAnchors.length === 0) continue
    const chosen = labelAnchors.find((a) => !/\.pdf(?:[?#]|$)/i.test(a.rawHref)) ?? labelAnchors[0]!
    try {
      map.set(new URL(chosen.rawHref, baseUrl).toString(), title)
    } catch {
      // Ignore malformed source links.
    }
  }
  return map
}

// Like extractLinks, but recovers the row title for table-listing links whose
// anchor text is only a format label. Pages laid out as
// `<tr><td>Title</td><td>[<a>HTML</a>]</td><td>[<a>PDF</a>]</td></tr>` otherwise
// parse to nothing — the link text "HTML" matches no announcement vocabulary, so
// every bulletin row is silently dropped (the 2026-06-22 IL recall miss).
export function extractLinksWithTableTitles(
  html: string,
  baseUrl: string,
): Array<{ href: string; text: string }> {
  const links = extractLinks(html, baseUrl)
  if (!/<table\b/i.test(html)) return links
  const rowTitles = tableRowTitlesByHref(html, baseUrl)
  if (rowTitles.size === 0) return links
  return links.map((link) => {
    const rowTitle = isGenericLinkLabel(link.text) ? rowTitles.get(link.href) : undefined
    return rowTitle ? { href: link.href, text: rowTitle } : link
  })
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
