import {
  alertSourceAdapterMetadataById,
  listAlertSourceCatalog,
} from '../pulse/rule-source-adapters'

const X_MAX_WEIGHTED_LENGTH = 280
const X_SHORT_URL_LENGTH = 23
const EXCLUDED_CHANGE_KINDS = new Set(['source_status', 'rule_source_drift', 'threshold_advisory'])

const URL_PATTERN = /https?:\/\/[^\s]+/giu
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu
const SENSITIVE_IDENTIFIER_PATTERN = /\b(?:\d[ -]?){9}\b/u
const EMOJI_GRAPHEME_PATTERN = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F)/u
const SOCIAL_REF_PATTERN = /^[A-Za-z0-9_-]{16,128}$/u

export interface SocialAlertCandidate {
  pulseId: string
  sourceId?: string
  status: string
  isSample: boolean
  agency: string
  jurisdiction: string
  forms: string[]
  entityTypes?: string[]
  changeKind: string
  sourceUrl: string
  summary: string
  originalDueDate: Date | null
  newDueDate: Date | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  actionDeadline: Date | null
  createdAt: Date
}

export interface BuiltXAlertPost {
  text: string
  targetUrl: string
  teaser: string
  agency: string
  weightedLength: number
}

export type SocialCandidateValidation = { eligible: true } | { eligible: false; reasons: string[] }

export function weightedPostLength(input: string): number {
  const text = input.normalize('NFC')
  let length = 0
  let cursor = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index
    length += weightedPlainTextLength(text.slice(cursor, index))
    length += X_SHORT_URL_LENGTH
    cursor = index + match[0].length
  }

  return length + weightedPlainTextLength(text.slice(cursor))
}

function weightedPlainTextLength(text: string): number {
  let length = 0
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

  for (const { segment } of segmenter.segment(text)) {
    if (EMOJI_GRAPHEME_PATTERN.test(segment)) {
      length += 2
      continue
    }
    for (const character of segment) {
      const codePoint = character.codePointAt(0)
      if (codePoint === undefined) continue
      length += isSingleWeightCodePoint(codePoint) ? 1 : 2
    }
  }

  return length
}

function isSingleWeightCodePoint(codePoint: number): boolean {
  return (
    codePoint <= 0x10ff ||
    (codePoint >= 0x2000 && codePoint <= 0x200d) ||
    (codePoint >= 0x2010 && codePoint <= 0x201f) ||
    (codePoint >= 0x2032 && codePoint <= 0x2037)
  )
}

export function validateSocialCandidate(
  candidate: SocialAlertCandidate,
): SocialCandidateValidation {
  const reasons: string[] = []
  if (candidate.status !== 'approved') reasons.push('pulse_not_approved')
  if (candidate.isSample) reasons.push('sample_pulse')
  if (EXCLUDED_CHANGE_KINDS.has(candidate.changeKind)) reasons.push('internal_change_kind')
  if (!resolvedPublicAgency(candidate)) reasons.push('missing_agency')
  if (!candidate.jurisdiction.trim()) reasons.push('missing_jurisdiction')
  if (!candidate.changeKind.trim()) reasons.push('missing_change_kind')
  if ([...candidate.forms, ...(candidate.entityTypes ?? [])].every((value) => !value.trim())) {
    reasons.push('missing_scope')
  }
  if (!hasRelevantDate(candidate)) reasons.push('missing_relevant_date')
  if (!isPublicHttpUrl(candidate.sourceUrl)) reasons.push('invalid_source_url')

  const publicFields = [
    candidate.agency,
    candidate.jurisdiction,
    candidate.summary,
    ...candidate.forms,
    ...(candidate.entityTypes ?? []),
  ].join(' ')
  if (EMAIL_PATTERN.test(publicFields)) reasons.push('possible_email_address')
  if (SENSITIVE_IDENTIFIER_PATTERN.test(publicFields)) reasons.push('possible_sensitive_identifier')

  return reasons.length === 0 ? { eligible: true } : { eligible: false, reasons }
}

function hasRelevantDate(candidate: SocialAlertCandidate): boolean {
  return Boolean(
    candidate.newDueDate ||
    candidate.actionDeadline ||
    candidate.effectiveUntil ||
    candidate.effectiveFrom,
  )
}

function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname)
  } catch {
    return false
  }
}

export function buildXAlertPost(
  candidate: SocialAlertCandidate,
  options: { appUrl: string; refToken: string },
): BuiltXAlertPost {
  const validation = validateSocialCandidate(candidate)
  if (!validation.eligible) {
    throw new Error(`Social alert candidate is not eligible: ${validation.reasons.join(', ')}`)
  }
  if (!SOCIAL_REF_PATTERN.test(options.refToken)) {
    throw new Error('A social alert ref token must be an opaque 16-128 character value.')
  }

  const targetUrl = socialAlertTargetUrl(candidate, options)
  const agency = truncateWeighted(resolvedPublicAgency(candidate), 36)
  const jurisdiction = truncateWeighted(normalizeCopy(candidate.jurisdiction), 22)
  const scope = truncateWeighted(candidateScope(candidate), 40)
  const change = truncateWeighted(humanizeChangeKind(candidate.changeKind), 26)
  const dateChange = formatDateChange(candidate)
  const teaser = `${scope} · ${change}: ${dateChange}.`
  const text = [
    `${agency} · ${jurisdiction} alert`,
    '',
    teaser,
    '',
    'Which client deadlines may be affected?',
    `Review the source-backed alert in DueDateHQ: ${targetUrl}`,
  ].join('\n')
  const weightedLength = weightedPostLength(text)

  if (weightedLength > X_MAX_WEIGHTED_LENGTH) {
    throw new Error(`Generated X post is ${weightedLength} weighted characters; maximum is 280.`)
  }

  return { text, targetUrl, teaser, agency, weightedLength }
}

function socialAlertTargetUrl(
  candidate: SocialAlertCandidate,
  options: { appUrl: string; refToken: string },
): string {
  const url = new URL('/alerts', options.appUrl)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('The social alert app URL must use HTTP or HTTPS.')
  }
  url.searchParams.set('ref', options.refToken)
  url.searchParams.set('utm_source', 'x')
  url.searchParams.set('utm_medium', 'organic_social')
  url.searchParams.set('utm_campaign', 'daily_alerts')
  url.searchParams.set(
    'utm_content',
    `${slug(candidate.jurisdiction)}_${slug(candidate.changeKind)}`,
  )
  return url.toString()
}

function candidateScope(candidate: SocialAlertCandidate): string {
  const scopeValues = candidate.forms.length ? candidate.forms : (candidate.entityTypes ?? [])
  const scopes = scopeValues.map(normalizeCopy).filter(Boolean)
  if (scopes.length <= 2) return scopes.join(', ')
  return `${scopes.slice(0, 2).join(', ')} +${scopes.length - 2} more`
}

function formatDateChange(candidate: SocialAlertCandidate): string {
  const target =
    candidate.newDueDate ??
    candidate.actionDeadline ??
    candidate.effectiveUntil ??
    candidate.effectiveFrom
  if (!target) throw new Error('A social alert candidate requires an actionable date.')

  if (candidate.originalDueDate && candidate.newDueDate) {
    return `${formatDate(candidate.originalDueDate)} → ${formatDate(candidate.newDueDate)}`
  }
  if (candidate.actionDeadline) return `action by ${formatDate(candidate.actionDeadline)}`
  if (candidate.effectiveFrom && candidate.effectiveUntil) {
    return `${formatDate(candidate.effectiveFrom)} → ${formatDate(candidate.effectiveUntil)}`
  }
  return `effective ${formatDate(target)}`
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value)
}

function humanizeChangeKind(value: string): string {
  const normalized = normalizeCopy(value).replaceAll('_', ' ')
  return normalized ? `${normalized[0]!.toUpperCase()}${normalized.slice(1)}` : ''
}

const SOURCE_CATALOG_AGENCY_BY_ID = new Map(
  listAlertSourceCatalog().map((entry) => [entry.id, entry.agency]),
)

function resolvedPublicAgency(candidate: SocialAlertCandidate): string {
  const sourceId = candidate.sourceId ?? candidate.agency
  const catalogAgency = SOURCE_CATALOG_AGENCY_BY_ID.get(sourceId)
  if (catalogAgency) return normalizeCopy(catalogAgency)
  const metadataLabel = alertSourceAdapterMetadataById.get(sourceId)?.label
  if (metadataLabel && metadataLabel !== sourceId) return normalizeCopy(metadataLabel)
  return fallbackPublicAgencyName(candidate.agency || sourceId, candidate.jurisdiction)
}

function fallbackPublicAgencyName(source: string, jurisdiction: string): string {
  const normalized = normalizeCopy(source)
  if (normalized.includes(' ') || !normalized.includes('.')) return normalized
  const prefix = normalized.split('.')[0]?.toLowerCase()
  if (prefix === 'irs') return 'IRS'
  if (prefix === 'fema') return 'FEMA'
  if (normalized.startsWith('fed.taxpayer_advocate')) return 'Taxpayer Advocate Service'
  return `${normalizeCopy(jurisdiction)} tax authority`
}

function normalizeCopy(value: string): string {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim()
}

function truncateWeighted(value: string, maximum: number): string {
  if (weightedPostLength(value) <= maximum) return value

  const suffix = '…'
  const suffixLength = weightedPostLength(suffix)
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
  let result = ''
  for (const { segment } of segmenter.segment(value)) {
    if (weightedPostLength(result + segment) + suffixLength > maximum) break
    result += segment
  }
  return `${result.trimEnd()}${suffix}`
}

function slug(value: string): string {
  const result = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
  return result || 'alert'
}
