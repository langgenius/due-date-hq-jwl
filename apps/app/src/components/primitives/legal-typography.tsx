import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `Citation` — typographic chrome for a legal/regulation reference like
 * `§ 199A`, `§ 6651(a)(2)`, or `IRC § 6511`. Renders inline using the mono
 * tabular-nums register so adjacent citations align and read as "this is
 * a real statutory pointer", not body prose. Call directly when the parsed
 * citation string is known, or wrap free text via `highlightCitations` to
 * surface any `§ XXXX` matches that happen to live inside summaries,
 * audit reasons, or evidence excerpts.
 *
 * Typography is intentionally quiet — color stays one notch under body so
 * the citation reads as a typographic mark, not a colored chip competing
 * with the surrounding word.
 */
export function Citation({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn('font-mono text-[0.92em] font-medium tabular-nums text-text-secondary', className)}
    >
      {children}
    </span>
  )
}

/**
 * `DeltaMark` — the Δ glyph used as a row prefix for any change event:
 * a rule edit, a status transition, a version bump, a regulation
 * amendment. The character itself is the convention regulatory diff
 * documents use, so it carries semantic weight that a generic "change"
 * icon doesn't.
 *
 * Renders aria-hidden because the surrounding event copy already names
 * the change in prose — Δ is decorative emphasis, not new information
 * for assistive tech. Stays text-tertiary so it reads as a margin mark,
 * not a foreground value.
 */
export function DeltaMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block font-mono text-[0.95em] font-medium text-text-tertiary',
        className,
      )}
    >
      Δ
    </span>
  )
}

// Match shapes seen in the seed data + the kind of citation real IRS / Treas.
// notice text tends to carry:
//   "§ 6651"             § + digits
//   "§6651(a)(1)"        § + digits + optional letter/number groups (no space)
//   "§ 199A"             § + digits with trailing letter
//   "§ 1.199A-1(b)(14)"  multi-segment treasury reg
//   "¶ 14"               pilcrow paragraph reference
//
// The pattern stays conservative on purpose: § literal + immediate digit
// (the digit anchors so we don't catch a stray "§" with no body). Bare
// "Section 199A" prose without the glyph is not wrapped — that would
// require sense-disambiguating "section" the everyday word.
const CITATION_PATTERN = /[§¶]\s?[0-9][0-9A-Za-z().\-]*/g

/**
 * `highlightCitations` — parse a free-text string and wrap every `§ XXXX`
 * (or `¶ N`) match with the `Citation` typographic chrome. Non-matching
 * text passes through verbatim. Used at every render site that displays
 * free-text payload from the audit log, alert summary, evidence excerpt,
 * timeline reason, etc. — strings where citations are inline by chance
 * rather than carried as a structured field.
 *
 * Returns the original string when the input contains no `§`/`¶` so the
 * common case is a zero-cost passthrough.
 */
export function highlightCitations(text: string | null | undefined): ReactNode {
  if (text === null || text === undefined) return null
  if (text.length === 0) return text
  if (!text.includes('§') && !text.includes('¶')) return text
  const matches = [...text.matchAll(CITATION_PATTERN)]
  if (matches.length === 0) return text
  const parts: ReactNode[] = []
  let cursor = 0
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i]!
    const start = match.index ?? 0
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(<Citation key={`citation-${i}`}>{match[0]}</Citation>)
    cursor = start + match[0].length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}
