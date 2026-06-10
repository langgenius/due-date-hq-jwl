// Parser for the Daily Brief's STORED text format. The consumer flattens
// the AI's structured output (headline / items / footer) into plain text
// via `formatBriefText` (apps/server/src/jobs/dashboard-brief/consumer.ts):
//
//   headline\n
//   1. {summary} Next: {nextCheck} [1] [2]\n
//   2. …\n
//   footer
//
// The card used to render that whole blob in one <p>, which collapsed the
// newlines into a wall of text (Yuqi 2026-06-10: "太乱太大 — 不够清晰，
// 不够有条理"). Parsing it back into its parts lets the card render a
// scannable lead line + one compact line per item, and drop the generic
// closing sentence. Old briefs stored before this change parse the same
// way — no regeneration or storage change needed.

export interface ParsedBriefItem {
  /** The "why this matters" clause; may contain [n] citation markers. */
  text: string
  /** The "Next: …" verification step, without the label; may contain [n]. */
  nextCheck: string | null
}

export interface ParsedBrief {
  headline: string | null
  items: ParsedBriefItem[]
  /** Trailing non-item line(s). Generic AI closer — render layer drops it. */
  footer: string | null
}

const ITEM_LINE_RE = /^\d+\.\s+(.*)$/
// formatBriefText writes the literal separator " Next: " between the
// summary and the verification step.
const NEXT_SEPARATOR = ' Next: '
// Model-added label prefixes seen in stored briefs ("Weekly triage brief:
// Address…"). Presentation-only strip so EXISTING rows read clean too; the
// prompt now also forbids them at generation time.
const HEADLINE_PREFIX_RE = /^(?:weekly|daily)\s+(?:triage\s+)?brief\s*[:—-]\s*/i

export function parseBriefText(text: string): ParsedBrief {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let headline: string | null = null
  const items: ParsedBriefItem[] = []
  const footerLines: string[] = []

  for (const line of lines) {
    const itemMatch = ITEM_LINE_RE.exec(line)
    if (itemMatch) {
      const body = itemMatch[1]!.trim()
      const splitAt = body.indexOf(NEXT_SEPARATOR)
      if (splitAt === -1) {
        items.push({ text: body, nextCheck: null })
      } else {
        items.push({
          text: body.slice(0, splitAt).trim(),
          nextCheck: body.slice(splitAt + NEXT_SEPARATOR.length).trim() || null,
        })
      }
    } else if (headline === null && items.length === 0) {
      headline = line.replace(HEADLINE_PREFIX_RE, '').trim() || line
    } else {
      footerLines.push(line)
    }
  }

  return {
    headline,
    items,
    footer: footerLines.length > 0 ? footerLines.join(' ') : null,
  }
}
