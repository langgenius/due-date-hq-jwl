import { alignExcerptToSource } from './excerpt'

export class GuardRejection extends Error {
  constructor(
    message: string,
    readonly code:
      | 'EIN_HIT_RATE_LOW'
      | 'SCHEMA_INVALID'
      | 'SOURCE_EXCERPT_NOT_FOUND'
      | 'EMPTY_RETRIEVAL'
      | 'CITATION_OUT_OF_BOUNDS'
      | 'UNCITED_SECTION'
      | 'BANNED_TAX_ADVICE'
      | 'UNREPLACED_PLACEHOLDER',
  ) {
    super(message)
  }
}

const EIN_PATTERN = /^\d{2}-\d{7}$/
const BANNED_TAX_ADVICE_RE =
  /\b(guaranteed|no penalty will apply|qualifies for relief|you should file|do not file|tax advice|legal advice|safe harbor applies)\b/i
const PLACEHOLDER_RE = /{{[^}]+}}|<[^>\n]+>/
const SOURCE_WATCH_PLACEHOLDER_RE =
  /\bofficial source registered\b|\btemplates require practice owner or manager acceptance\b/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function verifyMapperEinHitRate(input: unknown, output: unknown): void {
  if (!isRecord(input) || !isRecord(output)) return

  const mappings = output.mappings
  if (!Array.isArray(mappings)) return

  const einMapping = mappings.find(
    (mapping): mapping is { source: string } =>
      isRecord(mapping) && mapping.target === 'client.ein' && typeof mapping.source === 'string',
  )
  if (!einMapping) return

  const header = input.header
  const sampleRows = input.sample_rows
  if (!Array.isArray(header) || !Array.isArray(sampleRows)) return

  const columnIndex = header.findIndex((value) => value === einMapping.source)
  if (columnIndex < 0) return

  const values = sampleRows
    .map((row) => (Array.isArray(row) ? row[columnIndex] : undefined))
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (values.length === 0) return

  const hitRate = values.filter((value) => EIN_PATTERN.test(value.trim())).length / values.length
  if (hitRate < 0.8) {
    throw new GuardRejection(
      'EIN mapping rejected because regex hit rate is below 80%',
      'EIN_HIT_RATE_LOW',
    )
  }
}

export function verifyPulseSourceExcerpt(input: unknown, output: unknown): void {
  if (!isRecord(input) || !isRecord(output)) return
  if (output.classification === 'no_regulatory_change') {
    if (
      output.changeKind !== null ||
      output.actionMode !== null ||
      output.originalDueDate !== null ||
      output.newDueDate !== null
    ) {
      throw new GuardRejection(
        'Pulse extract rejected because no-change output included actionable fields.',
        'SCHEMA_INVALID',
      )
    }
  }
  const rawText = input.rawText
  const sourceExcerpt = output.sourceExcerpt
  if (typeof rawText !== 'string' || typeof sourceExcerpt !== 'string') return

  const aligned = alignExcerptToSource(rawText, sourceExcerpt)
  if (aligned.match === 'none') {
    throw new GuardRejection(
      'Pulse extract rejected because source excerpt could not be located in raw text.',
      'SOURCE_EXCERPT_NOT_FOUND',
    )
  }
  // Repair contract: guards receive the live parsed.data object that runPrompt returns,
  // so when the model's quote drifted from the source (smart quotes, dashes, hyphenation)
  // we snap it in place to the verbatim source span — downstream (citationsJson,
  // pulse.verbatimQuote) then stores text that IS in the source.
  if (aligned.snappedExcerpt) {
    output.sourceExcerpt = aligned.snappedExcerpt
  }
}

export function verifyRuleConcreteDraft(input: unknown, output: unknown): void {
  if (!isRecord(input) || !isRecord(output)) return
  const sourceText = input.sourceText
  const sourceExcerpt = output.sourceExcerpt
  if (typeof sourceText !== 'string' || typeof sourceExcerpt !== 'string') return

  if (SOURCE_WATCH_PLACEHOLDER_RE.test(sourceExcerpt)) {
    throw new GuardRejection(
      'Rule draft rejected because source excerpt used source-watch metadata instead of official source text.',
      'SOURCE_EXCERPT_NOT_FOUND',
    )
  }

  const aligned = alignExcerptToSource(sourceText, sourceExcerpt)
  if (aligned.match === 'none') {
    throw new GuardRejection(
      'Rule draft rejected because source excerpt could not be located in source text.',
      'SOURCE_EXCERPT_NOT_FOUND',
    )
  }
  // Same repair contract as verifyPulseSourceExcerpt above.
  if (aligned.snappedExcerpt) {
    output.sourceExcerpt = aligned.snappedExcerpt
  }
}

export function verifyInsightOutput(input: unknown, output: unknown): void {
  if (!isRecord(input) || !isRecord(output)) return
  const sources = input.sources
  const sections = output.sections
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new GuardRejection(
      'Insight rejected because retrieval returned no sources.',
      'EMPTY_RETRIEVAL',
    )
  }
  if (!Array.isArray(sections)) return

  const sourceRefs = new Set(
    sources
      .map((source) => (isRecord(source) ? source.ref : undefined))
      .filter((ref): ref is number => typeof ref === 'number'),
  )

  for (const section of sections) {
    if (!isRecord(section)) continue
    const label = typeof section.label === 'string' ? section.label : ''
    const text = typeof section.text === 'string' ? section.text : ''
    const citationRefs = section.citationRefs
    if (!Array.isArray(citationRefs) || citationRefs.length === 0) {
      throw new GuardRejection('Insight rejected because a section is uncited.', 'UNCITED_SECTION')
    }
    if (!citationRefs.every((ref) => typeof ref === 'number' && sourceRefs.has(ref))) {
      throw new GuardRejection(
        'Insight rejected because a citation ref was not in the retrieval set.',
        'CITATION_OUT_OF_BOUNDS',
      )
    }
    if (BANNED_TAX_ADVICE_RE.test(label) || BANNED_TAX_ADVICE_RE.test(text)) {
      throw new GuardRejection(
        'Insight rejected because it used banned tax-advice language.',
        'BANNED_TAX_ADVICE',
      )
    }
    if (PLACEHOLDER_RE.test(label) || PLACEHOLDER_RE.test(text)) {
      throw new GuardRejection(
        'Insight rejected because a placeholder was not replaced.',
        'UNREPLACED_PLACEHOLDER',
      )
    }
  }
}
