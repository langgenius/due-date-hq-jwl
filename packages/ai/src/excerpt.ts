/**
 * Shared excerpt-grounding helpers — the ONE implementation of "does this cited excerpt
 * actually appear in that source text?".
 *
 * History: `classifyExcerptMatch` and friends lived in apps/server/src/procedures/rules/
 * concrete-draft.ts while packages/ai/src/guard.ts carried a second, divergent copy. The
 * pulse-extract guard demanded an exact normalized substring while every other consumer
 * (the concrete-draft validator, the bulk-trust gate, the rule-source drift detector)
 * accepted an 85% fuzzy alignment — so ~a third of extract "failures" were the guard
 * discarding generations that were already paid for, over smart quotes, dashes and
 * hyphenation drift. Moved here verbatim (2026-06-10 alerts audit, P3 batch) so both
 * guards and the server share one accept-set, plus alignment helpers that snap a
 * fuzzy-matched excerpt back to the verbatim source span.
 */

export const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}
export const MONTH_DAY_RE =
  /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?\b/gi

/** Token-overlap share at/above which a non-verbatim excerpt is treated as supported. */
export const EXCERPT_FUZZY_MATCH_THRESHOLD = 0.85

export function normalizeExcerptText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

export type ExcerptMatch = 'exact' | 'fuzzy' | 'none'

/**
 * Classify how strongly a source page supports a cited excerpt:
 * - 'exact' — the excerpt appears verbatim in the source (whitespace/case-normalized substring)
 * - 'fuzzy' — only a loose signal matches: every date-code in the excerpt appears *somewhere* on
 *             the page, or ≥85% order-insensitive token overlap. Plausible but not verbatim.
 * - 'none'  — no meaningful support
 *
 * `sourceTextContainsExcerpt` is a thin `!== 'none'` wrapper so existing callers — including the
 * rule-source drift detector in jobs/pulse/extract.ts — keep their exact prior behavior. New
 * callers (the concrete-draft guard) can demand 'exact' and treat 'fuzzy' as low-trust.
 */
export function classifyExcerptMatch(sourceText: string, excerpt: string): ExcerptMatch {
  const normalizedSource = normalizeExcerptText(sourceText)
  const normalizedExcerpt = normalizeExcerptText(excerpt)
  if (normalizedSource.includes(normalizedExcerpt)) return 'exact'

  const sourceDateCodes = new Set(extractComparableDateCodes(normalizedSource))
  const excerptDateCodes = extractComparableDateCodes(normalizedExcerpt)
  if (excerptDateCodes.length > 0 && excerptDateCodes.every((code) => sourceDateCodes.has(code))) {
    return 'fuzzy'
  }

  const sourceTokens = new Set(
    normalizedSource
      .match(/[a-z0-9]+/g)
      ?.map((token) => token.toLowerCase())
      ?.filter((token) => token.length > 2) ?? [],
  )
  const excerptTokens = Array.from(
    new Set(
      normalizedExcerpt
        .match(/[a-z0-9]+/g)
        ?.map((token) => token.toLowerCase())
        ?.filter((token) => token.length > 1) ?? [],
    ),
  )
  if (excerptTokens.length === 0) return 'none'

  const hasNumericExcerptToken = excerptTokens.some((token) => /\d/.test(token))
  const hasExcerptAnchor =
    /(due|deadline|return|payment|filing|tax|filer|withholding|wage|installment|due-date)/i.test(
      normalizedExcerpt,
    )
  if (excerptTokens.length < 4 && !hasNumericExcerptToken && !hasExcerptAnchor) return 'none'

  const hitCount = excerptTokens.filter((token) => sourceTokens.has(token)).length
  const threshold = excerptTokens.length <= 3 ? 1 : EXCERPT_FUZZY_MATCH_THRESHOLD
  return hitCount / excerptTokens.length >= threshold ? 'fuzzy' : 'none'
}

export function sourceTextContainsExcerpt(sourceText: string, excerpt: string): boolean {
  return classifyExcerptMatch(sourceText, excerpt) !== 'none'
}

export function extractComparableDateCodes(value: string): string[] {
  const normalized = normalizeExcerptText(value)
  const codes = new Set<string>()

  for (const match of normalized.matchAll(MONTH_DAY_RE)) {
    const monthName = match[1]?.toLowerCase()
    const day = Number(match[2])
    const month = monthName ? MONTH_NAMES[monthName] : null
    if (!month || !Number.isFinite(day)) continue
    codes.add(`${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)
  }

  for (const match of normalized.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    const month = Number(match[1])
    const day = Number(match[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      codes.add(`${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)
    }
  }

  for (const match of normalized.matchAll(/\b(\d{2,4})-(\d{1,2})-(\d{1,2})\b/g)) {
    const month = Number(match[2])
    const day = Number(match[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      codes.add(`${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)
    }
  }

  return Array.from(codes)
}

/**
 * Fold the unicode variants AI models routinely substitute when quoting — curly quotes,
 * en/em dashes, ellipses — and strip the invisible characters (soft hyphen, zero-width
 * joiners, BOM) that web pages and PDFs embed mid-word. Deliberately NOT part of
 * `normalizeExcerptText`: folding inside `classifyExcerptMatch` would silently widen the
 * drift detector and the bulk-trust gate; only the align/snap paths below fold.
 */
export function foldExcerptUnicode(value: string): string {
  return value
    .replace(/[‘’‚′]/g, "'") // ‘ ’ ‚ ′
    .replace(/[“”„″]/g, '"') // “ ” „ ″
    .replace(/[‐-―−]/g, '-') // ‐ ‑ ‒ – — ― −
    .replace(/…/g, '...') // …
    .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, '') // soft hyphen, zero-widths, BOM
}

interface FoldedSourceIndex {
  /** Folded + lowercased + whitespace-collapsed text. */
  normalized: string
  /** For each char of `normalized`, the index of the original char it came from. */
  map: number[]
}

function buildFoldedSourceIndex(sourceText: string): FoldedSourceIndex {
  const chars: string[] = []
  const map: number[] = []
  let pendingSpace = false
  for (let i = 0; i < sourceText.length; i++) {
    const folded = foldExcerptUnicode(sourceText[i] ?? '')
    for (const char of folded) {
      if (/\s/.test(char)) {
        pendingSpace = chars.length > 0
        continue
      }
      if (pendingSpace) {
        chars.push(' ')
        // Attribute the collapsed space to the char that follows it so spans never
        // start or end on stripped whitespace.
        map.push(i)
        pendingSpace = false
      }
      chars.push(char.toLowerCase())
      map.push(i)
    }
  }
  return { normalized: chars.join(''), map }
}

function foldNormalizeExcerpt(excerpt: string): string {
  return normalizeExcerptText(foldExcerptUnicode(excerpt))
}

function snapExactFoldedSpan(sourceText: string, excerpt: string): string | null {
  const needle = foldNormalizeExcerpt(excerpt)
  if (!needle) return null
  const { normalized, map } = buildFoldedSourceIndex(sourceText)
  const at = normalized.indexOf(needle)
  if (at < 0) return null
  const start = map[at]
  const end = map[at + needle.length - 1]
  if (start === undefined || end === undefined) return null
  return sourceText.slice(start, end + 1)
}

interface SourceToken {
  text: string
  /** Original-text offsets of the token's first/last chars. */
  start: number
  end: number
}

function tokenizeFoldedSource(index: FoldedSourceIndex): SourceToken[] {
  const tokens: SourceToken[] = []
  for (const match of index.normalized.matchAll(/[a-z0-9]+/g)) {
    const start = index.map[match.index]
    const end = index.map[match.index + match[0].length - 1]
    if (start === undefined || end === undefined) continue
    tokens.push({ text: match[0], start, end })
  }
  return tokens
}

function snapTokenWindowSpan(sourceText: string, excerpt: string): string | null {
  const excerptTokens = foldNormalizeExcerpt(excerpt).match(/[a-z0-9]+/g) ?? []
  if (excerptTokens.length === 0) return null
  const index = buildFoldedSourceIndex(sourceText)
  const sourceTokens = tokenizeFoldedSource(index)
  if (sourceTokens.length === 0) return null

  let best: { score: number; start: number; end: number } | null = null
  const sizes = new Set(
    [
      excerptTokens.length - 1,
      excerptTokens.length,
      excerptTokens.length + 1,
      excerptTokens.length + 2,
    ]
      .filter((size) => size >= 1)
      .map((size) => Math.min(size, sourceTokens.length)),
  )
  for (const size of sizes) {
    for (let from = 0; from + size <= sourceTokens.length; from++) {
      const window = sourceTokens.slice(from, from + size)
      const present = new Set<string>()
      for (let k = 0; k < window.length; k++) {
        const token = window[k]
        if (!token) continue
        present.add(token.text)
        const next = window[k + 1]
        // A page hyphenation/line break splits one word into two source tokens
        // ("with-holding" → "with" + "holding"); let the excerpt's joined form match.
        if (next) present.add(token.text + next.text)
      }
      const hits = excerptTokens.filter((token) => present.has(token)).length
      const score = hits / excerptTokens.length
      if (score >= EXCERPT_FUZZY_MATCH_THRESHOLD && (best === null || score > best.score)) {
        const first = window[0]
        const last = window[window.length - 1]
        if (first && last) best = { score, start: first.start, end: last.end }
      }
    }
  }
  return best ? sourceText.slice(best.start, best.end + 1) : null
}

/**
 * Locate the verbatim source span that backs a (possibly drifted) excerpt, or null when no
 * span clears `EXCERPT_FUZZY_MATCH_THRESHOLD`. Tries a unicode-folded exact match first,
 * then a sliding token-window alignment sized to the excerpt.
 */
export function snapExcerptToSource(sourceText: string, excerpt: string): string | null {
  return snapExactFoldedSpan(sourceText, excerpt) ?? snapTokenWindowSpan(sourceText, excerpt)
}

/**
 * The guards' accept-and-repair contract:
 * - 'exact'  → accept, keep the model's excerpt untouched (`snappedExcerpt: null`).
 * - 'fuzzy'  → accept, and where the drifted quote can be localized, return the verbatim
 *              source span so callers can store text that IS in the source. Date-code-only
 *              fuzzy matches may not be localizable — `snappedExcerpt` stays null and the
 *              model's paraphrase is kept (same as today's rule-draft display behavior).
 * - 'none'   → one rescue attempt via the unicode-folded exact path (short smart-quoted
 *              excerpts fail `classifyExcerptMatch`'s token gates but are verbatim quotes);
 *              a hit upgrades to 'fuzzy' with the snapped span, otherwise stays 'none'.
 */
export function alignExcerptToSource(
  sourceText: string,
  excerpt: string,
): { match: ExcerptMatch; snappedExcerpt: string | null } {
  const match = classifyExcerptMatch(sourceText, excerpt)
  if (match === 'exact') return { match, snappedExcerpt: null }
  if (match === 'fuzzy') return { match, snappedExcerpt: snapExcerptToSource(sourceText, excerpt) }
  const rescued = snapExactFoldedSpan(sourceText, excerpt)
  return rescued
    ? { match: 'fuzzy', snappedExcerpt: rescued }
    : { match: 'none', snappedExcerpt: null }
}
