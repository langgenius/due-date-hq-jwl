/**
 * meta-copy.ts — assembly helpers for SERP titles and descriptions.
 *
 * Written after the 2026-08-03 Search Console review, which found 264 page-one
 * impressions producing a single click. The snippets were the bottleneck: a
 * median description of 170 characters (Google renders ~155), machine-joined
 * double colons, our own "…" mid-sentence, and lower-cased form names.
 *
 * The rule these helpers enforce: a snippet is ANSWER first, differentiator
 * second, and it never gets cut by Google — because we cut it ourselves, at a
 * clause boundary, before it reaches the limit. Optional trailing clauses are
 * dropped whole rather than truncated, so a snippet always ends in a real
 * sentence. The meta-quality test locks the contract.
 */

export const TITLE_BUDGET = 60
export const DESCRIPTION_BUDGET = 158

/**
 * The lead clause of a due-date sentence — "April 15 — the 15th day of the 4th
 * month…" becomes "April 15". Keeps the answer scannable in a snippet while the
 * full sentence still renders on the page itself.
 */
export function leadClause(value: string): string {
  const trim = (s: string) => s.replace(/[\s—-]*[.;,]?\s*$/, '').trim()
  const parts = value.split(/\s+—\s+|\s+--\s+|——/)
  const first = trim(parts[0] ?? value)

  // A lead clause with no digit is a cadence word, not a date — "Quarterly" out
  // of "Quarterly — Q1 due May 10, …". Reading only that would promise an answer
  // the snippet never gives, so fall through to the dates that follow it.
  if (/\d/.test(first) || parts.length < 2) return first

  const rest = trim(parts.slice(1).join(' — '))
  if (!rest) return first
  if (rest.length <= 88) return rest
  // Clip on a list boundary, never mid-item. Sentence splitting is unsafe here:
  // the dates themselves contain "Aug." and "Feb.".
  const clipped = rest.slice(0, 88)
  const lastComma = clipped.lastIndexOf(', ')
  return trim(lastComma > 30 ? clipped.slice(0, lastComma) : clipped)
}

/**
 * Assemble `head` plus the first optional clause that still fits the budget.
 * Clauses are dropped whole — never truncated — so the result always ends in a
 * complete sentence. If `head` alone exceeds the budget it is trimmed back to a
 * word boundary and closed with a period rather than an ellipsis.
 */
export function fitMeta(head: string, tails: string[], budget = DESCRIPTION_BUDGET): string {
  const base = head.trim()
  if (base.length > budget) {
    const words = base.slice(0, budget - 1).split(' ')
    words.pop()
    return `${words.join(' ').replace(/[\s,;:—-]+$/, '')}.`
  }
  for (const tail of tails) {
    const candidate = `${base} ${tail.trim()}`.trim()
    if (candidate.length <= budget) return candidate
  }
  return base
}

/**
 * Same idea for titles: try each candidate longest-first, take the first that
 * fits, and fall back to a word-boundary trim of the shortest one.
 */
export function fitTitle(candidates: string[], budget = TITLE_BUDGET): string {
  for (const candidate of candidates) {
    const value = candidate.trim()
    if (value.length <= budget) return value
  }
  const last = (candidates.at(-1) ?? '').trim()
  const words = last.slice(0, budget).split(' ')
  if (words.length > 1) words.pop()
  return words.join(' ').replace(/[\s,;:—-]+$/, '')
}

/**
 * Lower-case a label for mid-sentence use WITHOUT destroying form names,
 * acronyms, or proper nouns — the defect that shipped "When is the fbar
 * (fincen form 114) deadline?" to Google on fifteen rule pages.
 *
 * Only leading words that are ordinary vocabulary get folded; anything that
 * looks like an identifier (contains a digit, is all-caps, or is a known
 * proper noun) keeps its casing.
 */
const KEEP_CASE = new Set([
  'FBAR',
  'FinCEN',
  'IRS',
  'FUTA',
  'HSA',
  'IRA',
  'EIN',
  'Form',
  'Forms',
  'Schedule',
  'W-2',
  'W-3',
  'K-1',
  'S',
  'C',
])

export function sentenceCaseLabel(label: string): string {
  return label
    .split(' ')
    .map((word) => {
      const bare = word.replace(/[(),]/g, '')
      if (!bare) return word
      if (KEEP_CASE.has(bare)) return word
      if (/\d/.test(bare)) return word
      if (bare === bare.toUpperCase() && bare.length > 1) return word
      return word.toLowerCase()
    })
    .join(' ')
}
