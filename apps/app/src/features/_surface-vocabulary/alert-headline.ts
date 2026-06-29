/**
 * `dedupeTitleSource` — the ONE rule for an alert HEADLINE across every surface
 * that renders one (the /alerts list row + navigator rail, the alert detail hero
 * + breadcrumb, the alert history list, and the /today "Needs attention" card).
 *
 * Alert titles in the feed conventionally LEAD with the source/authority name
 * ("NY DTF clarifies…", "IRS released…", "FL DOR corporate income-tax
 * bulletin…") — but every surface already shows that authority as a source chip
 * and a jurisdiction pill, so the prefix states the same fact a third time and
 * pushes most titles onto a second line. This strips a leading mention of the
 * alert's own `source` from the title (and cleans a trailing separator), so the
 * headline carries only the NEWS and the chip carries the WHO. The full original
 * title still lives on the element's `title` hover attribute — demote, don't
 * delete.
 *
 * Defensive by design — returns the raw title unchanged for any non-matching
 * shape, so unrelated titles are never mangled:
 *   • If `title === source` exactly (trimmed-equal), there's nothing meaningful
 *     left after stripping → return the raw title.
 *   • If the stripped remainder is pure punctuation/whitespace → raw title.
 *   • Otherwise strip the prefix + a trailing separator (":", "·", "—", "-")
 *     and re-capitalise the first letter so the headline reads as a sentence.
 *
 * One home for the rule → consistent de-duplication product-wide. Lifted out of
 * `needs-attention-card` (2026-06-29) so /alerts shares it; previously the
 * dashboard card was the only surface that de-duped.
 */
export function dedupeTitleSource(title: string, source: string): string {
  const t = title.trim()
  const s = source.trim()
  if (!s) return t
  // Edge case: source IS the entire title. Nothing meaningful after stripping;
  // fall back to the raw title.
  if (t.toLowerCase() === s.toLowerCase()) return t
  if (t.toLowerCase().startsWith(s.toLowerCase())) {
    const rest = t
      .slice(s.length)
      .trim()
      .replace(/^[-—:·]+\s*/u, '')
    // Guard against rest being non-empty but pure punctuation/whitespace —
    // render the raw title instead of an empty headline.
    if (rest.length > 0 && /[\p{L}\p{N}]/u.test(rest)) {
      // Capitalize the first letter so the stripped title still reads like a
      // proper sentence.
      return rest.charAt(0).toUpperCase() + rest.slice(1)
    }
  }
  return t
}
