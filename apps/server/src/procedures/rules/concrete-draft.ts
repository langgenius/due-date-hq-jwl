import * as z from 'zod'
import { createAI } from '@duedatehq/ai'
import { expandDueDateLogic } from '@duedatehq/core/date-logic'
import {
  RuleConcreteDraftSchema,
  type ObligationRule,
  type RuleConcreteDraft,
} from '@duedatehq/contracts'
import type { AiRepo } from '@duedatehq/ports/ai'
import type { PulseSourceSignalRow, PulseSourceSnapshotRow } from '@duedatehq/ports/pulse'
import type {
  ObligationRule as CoreObligationRule,
  RuleSource as CoreRuleSource,
} from '@duedatehq/core/rules'
import type { Env } from '../../env'
import { createBrowserlessFetch } from '../../jobs/pulse/browserless'
import { extractOfficialSourceText, SOURCE_WATCH_PLACEHOLDER_RE } from './source-text'

export const RuleConcreteDraftPayloadSchema = RuleConcreteDraftSchema.omit({ aiOutputId: true })
export type RuleConcreteDraftPayload = Omit<RuleConcreteDraft, 'aiOutputId'>
export const RULE_CONCRETE_DRAFT_PROMPT = 'rule-concrete-draft@v2'
export const RETIRED_DETERMINISTIC_CONCRETE_DRAFT_MODEL = 'deterministic-source-text'
const MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS = 24_000
const OFFICIAL_SOURCE_FETCH_TIMEOUT_MS = 20_000
const OFFICIAL_SOURCE_FETCH_HEADERS: HeadersInit[] = [
  {
    accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.1',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    'user-agent': 'Mozilla/5.0 (compatible; DueDateHQSourceReview/1.0; +https://duedatehq.com)',
  },
  {
    accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.1',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    'user-agent': 'curl/8.7.1',
  },
]
const MIN_USABLE_OFFICIAL_SOURCE_TEXT_CHARS = 120
const UNUSABLE_OFFICIAL_SOURCE_TEXT_RE =
  /\b(access denied|forbidden|enable javascript|request blocked|not authorized|temporarily unavailable|page not found|not found)\b|(?:^|\b)(?:error|http|status)\s*(?:404|403)\b|page we don['’]t have/i

const nullableBoolean = z.union([z.boolean(), z.string()]).nullable().optional()
const nullableNumber = z.union([z.number(), z.string()]).nullable().optional()
const nullableString = z.string().nullable().optional()
const MONTH_NAMES: Record<string, number> = {
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
const MONTH_DAY_RE =
  /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?\b/gi
const MONTH_DAY_SINGLE_RE =
  /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?\b/i
const SLASH_DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g
const RELATIVE_DUE_DATE_RE =
  /\b(\d{1,2}(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth)\s+day\s+of\s+the\s+([a-z0-9 -]+?)\s+month\b[^.\n]*(beginning|start|end|close)/i
const RELATIVE_INSTALLMENT_MONTHS_RE =
  /\b(\d{1,2}(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth)\s+day\s+of\s+the\s+([a-z0-9,\s-]+?)\s+months?\b[^.\n]*(?:taxable|tax|fiscal|calendar)?\s*year/i

const AiPeriodSchema = z.object({
  period: nullableString,
  label: nullableString,
  name: nullableString,
  dueDate: nullableString,
  due_date: nullableString,
  due: nullableString,
  date: nullableString,
})

const AiDueDateLogicSchema = z.object({
  kind: nullableString,
  date: nullableString,
  dueDate: nullableString,
  due_date: nullableString,
  deadline: nullableString,
  filingDueDate: nullableString,
  filing_due_date: nullableString,
  returnDueDate: nullableString,
  return_due_date: nullableString,
  paymentDueDate: nullableString,
  payment_due_date: nullableString,
  monthOffset: nullableNumber,
  month_offset: nullableNumber,
  month: nullableNumber,
  day: nullableNumber,
  dayOfMonth: nullableNumber,
  day_of_month: nullableNumber,
  frequency: nullableString,
  periods: z.array(AiPeriodSchema).nullable().optional(),
  dueDates: z
    .array(z.union([z.string(), AiPeriodSchema]))
    .nullable()
    .optional(),
  due_dates: z
    .array(z.union([z.string(), AiPeriodSchema]))
    .nullable()
    .optional(),
  dates: z
    .array(z.union([z.string(), AiPeriodSchema]))
    .nullable()
    .optional(),
  holidayRollover: nullableString,
  holiday_rollover: nullableString,
  description: nullableString,
})

const AiExtensionPolicySchema = z
  .object({
    available: nullableBoolean,
    formName: nullableString,
    form_name: nullableString,
    durationMonths: nullableNumber,
    duration_months: nullableNumber,
    paymentExtended: nullableBoolean,
    payment_extended: nullableBoolean,
    notes: nullableString,
  })
  .nullable()
  .optional()

const AiQualitySchema = z
  .object({
    filingPaymentDistinguished: nullableBoolean,
    filing_payment_distinguished: nullableBoolean,
    extensionHandled: nullableBoolean,
    extension_handled: nullableBoolean,
    calendarFiscalSpecified: nullableBoolean,
    calendar_fiscal_specified: nullableBoolean,
    holidayRolloverHandled: nullableBoolean,
    holiday_rollover_handled: nullableBoolean,
    crossVerified: nullableBoolean,
    cross_verified: nullableBoolean,
    exceptionChannel: nullableBoolean,
    exception_channel: nullableBoolean,
  })
  .nullable()
  .optional()

const RuleConcreteDraftAiOutputObjectSchema = z.object({
  dueDateLogic: AiDueDateLogicSchema,
  due_date_logic: AiDueDateLogicSchema.optional(),
  extensionPolicy: AiExtensionPolicySchema,
  extension_policy: AiExtensionPolicySchema,
  coverageStatus: nullableString,
  coverage_status: nullableString,
  requiresApplicabilityReview: nullableBoolean,
  requires_applicability_review: nullableBoolean,
  quality: AiQualitySchema,
  sourceHeading: nullableString,
  source_heading: nullableString,
  sourceExcerpt: nullableString,
  source_excerpt: nullableString,
  confidence: nullableNumber,
  reasoning: nullableString,
})

export const RuleConcreteDraftAiOutputSchema = z.preprocess(
  unwrapRuleConcreteDraftAiOutput,
  RuleConcreteDraftAiOutputObjectSchema,
)

export type RuleConcreteDraftAiOutput = z.infer<typeof RuleConcreteDraftAiOutputSchema>

function unwrapRuleConcreteDraftAiOutput(value: unknown): unknown {
  if (!isRecord(value)) return value

  for (const key of ['draft', 'result', 'rule', 'concreteDraft', 'concrete_draft']) {
    const nested = value[key]
    if (isRecord(nested)) return unwrapRuleConcreteDraftAiOutput(nested)
  }

  const dueDateLogic = value.dueDateLogic ?? value.due_date_logic
  if (isRecord(dueDateLogic)) {
    return { ...value, dueDateLogic }
  }

  const dueDateArray = value.dueDates ?? value.due_dates ?? value.dates ?? value.schedule
  if (Array.isArray(dueDateArray)) {
    return {
      ...value,
      dueDateLogic: {
        kind: 'period_table',
        dueDates: dueDateArray,
      },
    }
  }

  const fixedDate =
    value.date ??
    value.dueDate ??
    value.due_date ??
    value.deadline ??
    value.filingDueDate ??
    value.filing_due_date ??
    value.paymentDueDate ??
    value.payment_due_date
  if (typeof fixedDate === 'string' && fixedDate.trim()) {
    return {
      ...value,
      dueDateLogic: {
        kind: 'fixed_date',
        date: fixedDate,
      },
    }
  }

  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export interface ConcreteDraftSourceText {
  sourceText: string
  hasSourceBackedText: boolean
}

interface ConcreteDraftAiInput {
  rule: {
    id: string
    title: string
    jurisdiction: string
    entityApplicability: readonly string[]
    taxType: string
    formName: string
    eventType: string
    isFiling: boolean
    isPayment: boolean
    taxYear: number
    applicableYear: number
    dueDateLogic: CoreObligationRule['dueDateLogic']
    extensionPolicy: CoreObligationRule['extensionPolicy']
    coverageStatus: CoreObligationRule['coverageStatus']
    requiresApplicabilityReview: boolean
    quality: CoreObligationRule['quality']
    defaultTip: string
  }
  source: {
    id: string
    title: string
    url: string
    jurisdiction: string
    sourceType: string
    acquisitionMethod: string
    lastReviewedOn: string
  }
  sourceSignal?: {
    id: string
    title: string
    officialSourceUrl: string
    publishedAt: string
    fetchedAt: string
    signalType: string
  }
  sourceText: string
}

export function ruleConcreteDraftContextRef(input: {
  ruleId: string
  ruleVersion: number
  sourceId: string
  sourceSignalId?: string | null
}): string {
  return ['rule', input.ruleId, `v${input.ruleVersion}`, input.sourceId].join(':')
}

export function cachedConcreteDraftKey(input: {
  ruleId: string
  ruleVersion: number
  sourceId: string
  sourceSignalId?: string | null | undefined
}): string {
  return ruleConcreteDraftContextRef({
    ruleId: input.ruleId,
    ruleVersion: input.ruleVersion,
    sourceId: input.sourceId,
    ...(input.sourceSignalId ? { sourceSignalId: input.sourceSignalId } : {}),
  })
}

export function parseCachedConcreteDraft(
  outputText: string | null,
): RuleConcreteDraftPayload | null {
  if (!outputText) return null
  try {
    const parsed = RuleConcreteDraftPayloadSchema.safeParse(JSON.parse(outputText))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export async function hashAiInput(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function normalizeExcerptText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function sourceTextContainsExcerpt(sourceText: string, excerpt: string): boolean {
  const normalizedSource = normalizeExcerptText(sourceText)
  const normalizedExcerpt = normalizeExcerptText(excerpt)
  if (normalizedSource.includes(normalizedExcerpt)) return true

  const sourceDateCodes = new Set(extractComparableDateCodes(normalizedSource))
  const excerptDateCodes = extractComparableDateCodes(normalizedExcerpt)
  if (excerptDateCodes.length > 0 && excerptDateCodes.every((code) => sourceDateCodes.has(code))) {
    return true
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
  if (excerptTokens.length === 0) return false

  const hasNumericExcerptToken = excerptTokens.some((token) => /\d/.test(token))
  const hasExcerptAnchor =
    /(due|deadline|return|payment|filing|tax|filer|withholding|wage|installment|due-date)/i.test(
      normalizedExcerpt,
    )
  if (excerptTokens.length < 4 && !hasNumericExcerptToken && !hasExcerptAnchor) return false

  const hitCount = excerptTokens.filter((token) => sourceTokens.has(token)).length
  const threshold = excerptTokens.length <= 3 ? 1 : 0.85
  return hitCount / excerptTokens.length >= threshold
}

function isSourceWatchTemplateExcerpt(value: string | null | undefined): boolean {
  return typeof value === 'string' && SOURCE_WATCH_PLACEHOLDER_RE.test(value)
}

function extractComparableDateCodes(value: string): string[] {
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

function validateConcreteDueDateLogic(input: {
  rule: Pick<CoreObligationRule, 'taxYear'>
  dueDateLogic: ObligationRule['dueDateLogic']
}): string | null {
  if (input.dueDateLogic.kind === 'source_defined_calendar') {
    return 'Concrete rule drafts must not use source_defined_calendar due-date logic.'
  }

  try {
    const expanded = expandDueDateLogic(input.dueDateLogic, {
      taxYearStart: `${input.rule.taxYear}-01-01`,
      taxYearEnd: `${input.rule.taxYear}-12-31`,
    })
    if (expanded.some((item) => item.dueDate !== null)) return null
    return 'Concrete due-date logic did not expand to any concrete due date.'
  } catch (error) {
    return error instanceof Error ? error.message : 'Concrete due-date logic could not be expanded.'
  }
}

export function validateConcreteRuleDraft(input: {
  rule: Pick<CoreObligationRule, 'taxYear'>
  dueDateLogic: ObligationRule['dueDateLogic']
  sourceText: string
  sourceExcerpt: string
  coverageStatus: ObligationRule['coverageStatus']
  requiresApplicabilityReview: boolean
}): string | null {
  const dueDateError = validateConcreteDueDateLogic(input)
  if (dueDateError) return dueDateError

  if (isSourceWatchTemplateExcerpt(input.sourceExcerpt)) {
    return 'AI source excerpt used source-watch metadata instead of official source text.'
  }

  if (!sourceTextContainsExcerpt(input.sourceText, input.sourceExcerpt)) {
    return 'AI source excerpt was not found in the selected official source text.'
  }

  if (
    input.coverageStatus === 'full' &&
    !input.requiresApplicabilityReview &&
    input.dueDateLogic.kind === 'source_defined_calendar'
  ) {
    return 'Full coverage without applicability review requires concrete due-date logic.'
  }

  return null
}

type OfficialSourceFetchEnv = Pick<
  Env,
  'PULSE_BROWSERLESS_URL' | 'PULSE_BROWSERLESS_TOKEN' | 'PULSE_BROWSERLESS_SOURCE_IDS'
>
type OfficialSourceFetcher = (input: string | URL, init?: RequestInit) => Promise<Response>

function parseSourceIdList(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

async function fetchOfficialSourceText(input: {
  url: string
  sourceId: string
  env: OfficialSourceFetchEnv
}): Promise<string | null> {
  const browserlessSourceIds = parseSourceIdList(input.env.PULSE_BROWSERLESS_SOURCE_IDS)
  const browserlessFetch = createBrowserlessFetch({
    ...(input.env.PULSE_BROWSERLESS_URL ? { endpoint: input.env.PULSE_BROWSERLESS_URL } : {}),
    ...(input.env.PULSE_BROWSERLESS_TOKEN ? { token: input.env.PULSE_BROWSERLESS_TOKEN } : {}),
  })
  const shouldPreferBrowserless = browserlessSourceIds.has(input.sourceId)

  if (shouldPreferBrowserless && browserlessFetch) {
    const browserlessText = await fetchOfficialSourceTextWith(input.url, browserlessFetch)
    if (browserlessText) return browserlessText
  }

  const directText = await fetchOfficialSourceTextWith(input.url, (request, init) =>
    fetch(request, init),
  )
  if (directText) return directText

  if (!shouldPreferBrowserless && browserlessFetch) {
    return fetchOfficialSourceTextWith(input.url, browserlessFetch)
  }

  return null
}

async function fetchOfficialSourceTextWith(
  url: string,
  fetcher: OfficialSourceFetcher,
): Promise<string | null> {
  const results = await Promise.all(
    OFFICIAL_SOURCE_FETCH_HEADERS.map((headers) =>
      fetchOfficialSourceTextOnce(url, fetcher, headers),
    ),
  )
  return results.find((text): text is string => Boolean(text)) ?? null
}

async function fetchOfficialSourceTextOnce(
  url: string,
  fetcher: OfficialSourceFetcher,
  headers: HeadersInit,
): Promise<string | null> {
  let response: Response
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OFFICIAL_SOURCE_FETCH_TIMEOUT_MS)
  try {
    response = await fetcher(url, {
      headers,
      signal: controller.signal,
    })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) return null
  const contentType = response.headers.get('content-type') ?? ''
  const raw = await response.text().catch(() => null)
  if (!raw) return null

  const text =
    contentType.includes('application/json') || contentType.includes('+json')
      ? extractJsonSourceText(raw)
      : contentType.includes('text/html') ||
          contentType.includes('application/xhtml+xml') ||
          contentType.includes('text/plain') ||
          contentType.length === 0
        ? extractOfficialSourceText(raw)
        : null
  return text ? text.slice(0, MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS) : null
}

function extractJsonSourceText(raw: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  const chunks: string[] = []
  const seen = new Set<unknown>()
  const visit = (value: unknown, key: string, depth: number) => {
    if (chunks.join('\n').length > MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS || depth > 8) return
    if (typeof value === 'string') {
      const text = htmlishToText(value)
      if (text && shouldKeepJsonText(key, text)) chunks.push(text)
      return
    }
    if (typeof value !== 'object' || value === null || seen.has(value)) return
    seen.add(value)
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key, depth + 1))
      return
    }
    for (const [childKey, childValue] of Object.entries(value)) {
      visit(childValue, childKey, depth + 1)
    }
  }

  visit(parsed, '', 0)
  const text = chunks
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text.length > 0 ? text : null
}

function htmlishToText(value: string): string | null {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  const text = /<[a-z][\s\S]*>/i.test(trimmed) ? extractOfficialSourceText(trimmed) : trimmed
  return text?.replace(/\s+/g, ' ').trim() || null
}

export function isUsableConcreteDraftOfficialSourceText(value: string | null | undefined): boolean {
  const text = value?.replace(/\s+/g, ' ').trim()
  if (!text) return false
  if (text.length < MIN_USABLE_OFFICIAL_SOURCE_TEXT_CHARS) return false
  return !UNUSABLE_OFFICIAL_SOURCE_TEXT_RE.test(text)
}

function shouldKeepJsonText(key: string, text: string): boolean {
  if (text.length < 20) return false
  if (/\b(script|style|nonce|hash|etag|uuid|id|guid)\b/i.test(key)) return false
  if (/\b(title|heading|content|body|excerpt|description|summary|text|rendered)\b/i.test(key)) {
    return true
  }
  return /\b(due|deadline|return|payment|installment|extension|calendar|fiscal|tax)\b/i.test(text)
}

async function readR2Text(
  env: Pick<Env, 'R2_PULSE'>,
  key: string | null | undefined,
): Promise<string | null> {
  if (!key) return null
  const raw = await env.R2_PULSE.get(key).catch(() => null)
  const text = raw ? await raw.text().catch(() => null) : null
  const trimmed = text?.trim()
  return trimmed && isUsableConcreteDraftOfficialSourceText(trimmed) ? trimmed : null
}

export async function buildConcreteDraftSourceText(input: {
  env: Pick<
    Env,
    | 'R2_PULSE'
    | 'PULSE_BROWSERLESS_URL'
    | 'PULSE_BROWSERLESS_TOKEN'
    | 'PULSE_BROWSERLESS_SOURCE_IDS'
  >
  base: CoreObligationRule
  source: CoreRuleSource
  sourceSignal: PulseSourceSignalRow | null
  latestSourceSnapshot?: PulseSourceSnapshotRow | null
}): Promise<ConcreteDraftSourceText> {
  const chunks: string[] = []
  let hasSourceBackedText = false

  const evidenceChunks = input.base.evidence
    .filter(
      (evidence) =>
        evidence.sourceId === input.source.id &&
        !isSourceWatchTemplateExcerpt(evidence.sourceExcerpt),
    )
    .map((evidence) =>
      [
        evidence.locator.heading ?? input.source.title,
        evidence.sourceUpdatedOn ? `Updated ${evidence.sourceUpdatedOn}` : null,
        evidence.sourceExcerpt,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n'),
    )
  if (evidenceChunks.length > 0) hasSourceBackedText = true

  chunks.push(
    [
      input.source.title,
      input.source.url,
      input.source.lastReviewedOn ? `Reviewed ${input.source.lastReviewedOn}` : null,
      ...evidenceChunks,
    ]
      .filter((value): value is string => Boolean(value))
      .join('\n'),
  )

  if (evidenceChunks.length === 0 && input.sourceSignal) {
    const rawText = await readR2Text(input.env, input.sourceSignal.rawR2Key)
    if (rawText) hasSourceBackedText = true
    chunks.push(
      [
        input.sourceSignal.title,
        input.sourceSignal.officialSourceUrl,
        input.sourceSignal.publishedAt.toISOString().slice(0, 10),
        rawText,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n'),
    )
  }

  if (evidenceChunks.length === 0 && input.latestSourceSnapshot) {
    const snapshotText = await readR2Text(input.env, input.latestSourceSnapshot.rawR2Key)
    if (snapshotText) {
      hasSourceBackedText = true
      chunks.push(
        [
          input.latestSourceSnapshot.title,
          input.latestSourceSnapshot.officialSourceUrl,
          `Fetched ${input.latestSourceSnapshot.fetchedAt.toISOString().slice(0, 10)}`,
          snapshotText,
        ].join('\n'),
      )
    }
  }

  const officialSourceText = hasSourceBackedText
    ? null
    : await fetchOfficialSourceText({
        url: input.source.url,
        sourceId: input.source.id,
        env: input.env,
      })
  if (officialSourceText) hasSourceBackedText = true

  if (officialSourceText) chunks.push(`Official source text\n${officialSourceText}`)

  return {
    sourceText: chunks.filter(Boolean).join('\n\n'),
    hasSourceBackedText,
  }
}

export function requireConcreteDraftSourceText(sourceContext: ConcreteDraftSourceText): string {
  if (sourceContext.hasSourceBackedText) return sourceContext.sourceText
  throw new Error('Official source text could not be fetched for the selected source.')
}

export function concreteDraftAiInput(input: {
  base: CoreObligationRule
  source: CoreRuleSource
  sourceSignal: PulseSourceSignalRow | null
  sourceText: string
}): ConcreteDraftAiInput {
  return {
    rule: {
      id: input.base.id,
      title: input.base.title,
      jurisdiction: input.base.jurisdiction,
      entityApplicability: input.base.entityApplicability,
      taxType: input.base.taxType,
      formName: input.base.formName,
      eventType: input.base.eventType,
      isFiling: input.base.isFiling,
      isPayment: input.base.isPayment,
      taxYear: input.base.taxYear,
      applicableYear: input.base.applicableYear,
      dueDateLogic: input.base.dueDateLogic,
      extensionPolicy: input.base.extensionPolicy,
      coverageStatus: input.base.coverageStatus,
      requiresApplicabilityReview: input.base.requiresApplicabilityReview,
      quality: input.base.quality,
      defaultTip: input.base.defaultTip,
    },
    source: {
      id: input.source.id,
      title: input.source.title,
      url: input.source.url,
      jurisdiction: input.source.jurisdiction,
      sourceType: input.source.sourceType,
      acquisitionMethod: input.source.acquisitionMethod,
      lastReviewedOn: input.source.lastReviewedOn,
    },
    ...(input.sourceSignal
      ? {
          sourceSignal: {
            id: input.sourceSignal.id,
            title: input.sourceSignal.title,
            officialSourceUrl: input.sourceSignal.officialSourceUrl,
            publishedAt: input.sourceSignal.publishedAt.toISOString(),
            fetchedAt: input.sourceSignal.fetchedAt.toISOString(),
            signalType: input.sourceSignal.signalType,
          },
        }
      : {}),
    sourceText: selectConcreteDraftSourceText(input.base, input.source.id, input.sourceText),
  }
}

function selectConcreteDraftSourceText(
  base: CoreObligationRule,
  sourceId: string,
  sourceText: string,
): string {
  const hasSourceBackedEvidence = base.evidence.some(
    (evidence) =>
      evidence.sourceId === sourceId && !isSourceWatchTemplateExcerpt(evidence.sourceExcerpt),
  )
  if (sourceText.length <= MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS && !hasSourceBackedEvidence) {
    return sourceText
  }

  const terms = [
    base.title,
    base.taxType,
    base.formName,
    base.eventType,
    base.jurisdiction,
    ...base.entityApplicability,
  ]
    .flatMap((value) => value.split(/[^a-z0-9]+/i))
    .map((value) => value.toLowerCase())
    .filter((value) => value.length >= 3)
  const termSet = new Set(terms)
  const lines = sourceText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const selected = new Set<number>()

  lines.forEach((line, index) => {
    const lower = line.toLowerCase()
    const score =
      (/\b(due|deadline|return|payment|installment|extension|calendar|fiscal|tax)\b/i.test(line)
        ? 3
        : 0) +
      (extractDateOnlyCandidates(line, base.applicableYear).length > 0 ? 3 : 0) +
      Array.from(termSet).filter((term) => lower.includes(term)).length
    if (score >= 4) {
      for (let offset = -2; offset <= 3; offset += 1) {
        const next = index + offset
        if (next >= 0 && next < lines.length) selected.add(next)
      }
    }
  })

  const focused = Array.from(selected)
    .toSorted((a, b) => a - b)
    .map((index) => lines[index])
    .join('\n')
    .trim()
  const prefix = sourceText.slice(0, Math.min(4_000, MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS))
  const combined = [focused, prefix].filter(Boolean).join('\n\n')
  return (combined || sourceText).slice(0, MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS)
}

function toConcreteDraft(input: {
  aiOutputId: string
  draft: RuleConcreteDraftPayload
}): RuleConcreteDraft {
  return RuleConcreteDraftSchema.parse({
    aiOutputId: input.aiOutputId,
    ...input.draft,
  })
}

async function recordConcreteDraftRun(input: {
  aiRepo: AiRepo
  scope: 'firm' | 'global'
  userId: string | null
  inputContextRef: string
  trace: Parameters<AiRepo['recordRun']>[0]['trace']
  outputText?: string | null
  citations?: unknown
  errorMsg?: string | null
}): Promise<{ aiOutputId: string; llmLogId: string }> {
  const payload = {
    userId: input.userId,
    kind: 'rule_concrete_draft' as const,
    inputContextRef: input.inputContextRef,
    trace: input.trace,
    outputText: input.outputText ?? null,
    citations: input.citations,
    errorMsg: input.errorMsg ?? null,
  }
  return input.scope === 'global'
    ? input.aiRepo.recordGlobalRun(payload)
    : input.aiRepo.recordRun(payload)
}

export async function generateConcreteDraft(input: {
  env: Env
  aiRepo: AiRepo
  scope: 'firm' | 'global'
  userId: string | null
  base: CoreObligationRule
  source: CoreRuleSource
  sourceSignal: PulseSourceSignalRow | null
  latestSourceSnapshot?: PulseSourceSnapshotRow | null
}): Promise<RuleConcreteDraft> {
  const startedAt = Date.now()
  const sourceContext = await buildConcreteDraftSourceText({
    env: input.env,
    base: input.base,
    source: input.source,
    sourceSignal: input.sourceSignal,
    latestSourceSnapshot: input.latestSourceSnapshot ?? null,
  })
  const sourceText = sourceContext.sourceText
  const aiInput = concreteDraftAiInput({
    base: input.base,
    source: input.source,
    sourceSignal: input.sourceSignal,
    sourceText,
  })
  const inputContextRef = ruleConcreteDraftContextRef({
    ruleId: input.base.id,
    ruleVersion: input.base.version,
    sourceId: input.source.id,
    sourceSignalId: input.sourceSignal?.id ?? null,
  })
  const inputHash = await hashAiInput(aiInput)
  if (!sourceContext.hasSourceBackedText) {
    await recordConcreteDraftRun({
      aiRepo: input.aiRepo,
      scope: input.scope,
      userId: input.userId,
      inputContextRef,
      trace: {
        promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
        model: null,
        latencyMs: Date.now() - startedAt,
        guardResult: 'schema_fail',
        inputHash,
        refusalCode: 'SOURCE_TEXT_UNAVAILABLE',
      },
      outputText: null,
      citations: {
        sourceId: input.source.id,
        sourceUrl: input.source.url,
        sourceSignalId: input.sourceSignal?.id ?? null,
        sourceExcerpt: null,
        sourceText: sourceText,
      },
      errorMsg: 'Official source text could not be fetched for the selected source.',
    })
    throw new Error('Official source text could not be fetched for the selected source.')
  }

  const cached =
    input.scope === 'global'
      ? await input.aiRepo.findSuccessfulGlobalRun({
          kind: 'rule_concrete_draft',
          inputContextRef,
          inputHash,
          promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
        })
      : await input.aiRepo.findSuccessfulRun({
          kind: 'rule_concrete_draft',
          inputContextRef,
          inputHash,
          promptVersion: RULE_CONCRETE_DRAFT_PROMPT,
        })
  const cachedDraft =
    cached?.model === RETIRED_DETERMINISTIC_CONCRETE_DRAFT_MODEL
      ? null
      : parseCachedConcreteDraft(cached?.outputText ?? null)
  if (cached && cachedDraft) {
    const cachedGuardError = validateConcreteRuleDraft({
      rule: input.base,
      dueDateLogic: cachedDraft.dueDateLogic,
      sourceText,
      sourceExcerpt: cachedDraft.sourceExcerpt,
      coverageStatus: cachedDraft.coverageStatus,
      requiresApplicabilityReview: cachedDraft.requiresApplicabilityReview,
    })
    if (!cachedGuardError) {
      return toConcreteDraft({
        aiOutputId: cached.id,
        draft: cachedDraft,
      })
    }
  }

  const aiResult = await runConcreteDraftPrompt(input.env, aiInput)

  const normalized = aiResult.result
    ? normalizeRuleConcreteDraftAiOutput({
        output: aiResult.result,
        applicableYear: input.base.applicableYear,
        sourceTitle: input.source.title,
        sourceText,
      })
    : { draft: null, error: null }
  let draft = normalized.draft
  let guardError = draft
    ? validateConcreteRuleDraft({
        rule: input.base,
        dueDateLogic: draft.dueDateLogic,
        sourceText,
        sourceExcerpt: draft.sourceExcerpt,
        coverageStatus: draft.coverageStatus,
        requiresApplicabilityReview: draft.requiresApplicabilityReview,
      })
    : null

  const recorded = await recordConcreteDraftRun({
    aiRepo: input.aiRepo,
    scope: input.scope,
    userId: input.userId,
    inputContextRef,
    trace: {
      ...aiResult.trace,
      model: aiResult.model ?? aiResult.trace.model,
      ...(normalized.error ? { guardResult: 'schema_fail', refusalCode: 'SCHEMA_INVALID' } : {}),
      ...(guardError ? { guardResult: 'guard_rejected', refusalCode: 'GUARD_REJECTED' } : {}),
    },
    outputText: draft ? JSON.stringify(draft) : null,
    citations: {
      sourceId: input.source.id,
      sourceUrl: input.source.url,
      sourceSignalId: input.sourceSignal?.id ?? null,
      sourceExcerpt: draft?.sourceExcerpt ?? null,
      sourceText,
    },
    errorMsg: aiResult.refusal?.message ?? normalized.error ?? guardError,
  })

  if (aiResult.refusal || !draft) {
    throw new Error(
      aiResult.refusal?.message ?? normalized.error ?? 'AI concrete draft was unavailable.',
    )
  }
  if (guardError) {
    throw new Error(guardError)
  }

  return toConcreteDraft({
    aiOutputId: recorded.aiOutputId,
    draft,
  })
}

async function runConcreteDraftPrompt(env: Env, aiInput: ConcreteDraftAiInput) {
  const run = (runEnv: Env) =>
    createAI(runEnv).runPrompt(
      RULE_CONCRETE_DRAFT_PROMPT,
      aiInput,
      RuleConcreteDraftAiOutputSchema,
      {
        taskKind: 'insight',
      },
    )
  const primary = await run(env)
  if (primary.result || primary.refusal?.code !== 'AI_GATEWAY_ERROR') return primary
  if (!env.AI_GATEWAY_MODEL_FAST_JSON) return primary
  if (env.AI_GATEWAY_MODEL_FAST_JSON === env.AI_GATEWAY_MODEL_QUALITY_JSON) return primary

  const fallback = await run({
    ...env,
    AI_GATEWAY_MODEL_QUALITY_JSON: env.AI_GATEWAY_MODEL_FAST_JSON,
  })
  return fallback.result || fallback.refusal?.code !== 'AI_GATEWAY_ERROR' ? fallback : primary
}

interface NormalizeRuleConcreteDraftInput {
  output: RuleConcreteDraftAiOutput
  applicableYear: number
  sourceTitle: string
  sourceText: string
}

export function normalizeRuleConcreteDraftAiOutput(input: NormalizeRuleConcreteDraftInput): {
  draft: RuleConcreteDraftPayload | null
  error: string | null
} {
  const sourceExcerpt =
    stringValue(input.output.sourceExcerpt ?? input.output.source_excerpt) ??
    inferSourceExcerpt(input.sourceText)
  const dueDateLogic = normalizeDueDateLogic(
    input.output.dueDateLogic,
    input.applicableYear,
    input.sourceText,
    sourceExcerpt,
  )
  const sourceHeading =
    stringValue(input.output.sourceHeading ?? input.output.source_heading) ?? input.sourceTitle

  const rawDraft = {
    dueDateLogic,
    extensionPolicy: normalizeExtensionPolicy(
      input.output.extensionPolicy ?? input.output.extension_policy,
    ),
    coverageStatus: normalizeCoverageStatus(
      input.output.coverageStatus ?? input.output.coverage_status,
    ),
    requiresApplicabilityReview:
      boolValue(
        input.output.requiresApplicabilityReview ?? input.output.requires_applicability_review,
      ) ?? false,
    quality: normalizeQuality(input.output.quality, input.sourceText),
    sourceHeading,
    sourceExcerpt,
    confidence: normalizeConfidence(input.output.confidence),
    reasoning:
      stringValue(input.output.reasoning) ??
      'Draft normalized from source-backed AI output; review the source excerpt before accepting.',
  }

  const parsed = RuleConcreteDraftPayloadSchema.safeParse(rawDraft)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.length ? `${issue.path.join('.')}: ` : ''
    return {
      draft: null,
      error: `AI concrete draft output could not be normalized: ${path}${issue?.message ?? 'invalid output'}`,
    }
  }

  return { draft: parsed.data, error: null }
}

function normalizeDueDateLogic(
  logic: RuleConcreteDraftAiOutput['dueDateLogic'],
  applicableYear: number,
  sourceText: string,
  sourceExcerpt: string | null,
): unknown {
  const kind = normalizeDueDateKindAlias(logic.kind)
  const inferredRelative = inferRelativeDueDateLogic(
    sourceExcerpt,
    stringValue(logic.description),
    kind,
    applicableYear,
  )
  if (
    inferredRelative &&
    (kind === 'nth_day_after_tax_year_begin' ||
      kind === 'nth_day_after_tax_year_end' ||
      kind === 'fixed_date' ||
      kind === 'unknown')
  ) {
    return inferredRelative
  }

  if (
    kind === 'period_table' ||
    Array.isArray(logic.periods) ||
    Array.isArray(logic.dueDates) ||
    Array.isArray(logic.due_dates) ||
    Array.isArray(logic.dates)
  ) {
    const fallbackDates = dueDateCandidatesForLogic(
      logic,
      applicableYear,
      sourceText,
      sourceExcerpt,
    )
    const rawPeriods = normalizeRawPeriods(logic)
    const periods = rawPeriods.flatMap((period, index) => {
      const periodLabel = stringValue(period.period ?? period.label ?? period.name)
      const rawDate =
        period.dueDate ?? period.due_date ?? period.due ?? period.date ?? period.period
      const dueDate = normalizeDateOnly(rawDate, applicableYear) ?? fallbackDates[index] ?? null
      if (!dueDate) return []
      return {
        period: periodLabel ?? `Period ${index + 1}`,
        dueDate,
      }
    })
    const normalizedPeriods =
      periods.length > 0
        ? periods
        : fallbackDates.map((date, index) => ({ period: `Period ${index + 1}`, dueDate: date }))

    if (normalizedPeriods.length === 1) {
      return {
        kind: 'fixed_date',
        date: normalizedPeriods[0]?.dueDate,
        holidayRollover: normalizeFixedDateHolidayRollover(
          logic.holidayRollover ?? logic.holiday_rollover,
        ),
      }
    }

    return {
      kind: 'period_table',
      frequency: normalizeFrequency(logic.frequency, normalizedPeriods.length),
      periods: normalizedPeriods,
      holidayRollover: 'source_adjusted',
    }
  }

  if (kind === 'fixed_date') {
    const rawDate =
      logic.date ??
      logic.dueDate ??
      logic.due_date ??
      logic.deadline ??
      logic.filingDueDate ??
      logic.filing_due_date ??
      logic.returnDueDate ??
      logic.return_due_date ??
      logic.paymentDueDate ??
      logic.payment_due_date ??
      logic.description ??
      sourceExcerpt
    const date = normalizeDateOnly(rawDate, applicableYear)
    const fallback = date
      ? null
      : dueDateLogicFromDateCandidates(
          dueDateCandidatesForLogic(logic, applicableYear, sourceText, sourceExcerpt),
          logic.frequency,
          logic.holidayRollover ?? logic.holiday_rollover,
        )
    if (fallback) return fallback
    return {
      kind: 'fixed_date',
      date,
      holidayRollover: normalizeFixedDateHolidayRollover(
        logic.holidayRollover ?? logic.holiday_rollover,
      ),
    }
  }

  if (kind === 'nth_day_after_tax_year_begin') {
    const monthOffset = intValue(logic.monthOffset ?? logic.month_offset ?? logic.month)
    const day = intValue(logic.day ?? logic.dayOfMonth ?? logic.day_of_month)
    if (!monthOffset || !day) {
      const fallback = dueDateLogicFromDateCandidates(
        dueDateCandidatesForLogic(logic, applicableYear, sourceText, sourceExcerpt),
        logic.frequency,
        logic.holidayRollover ?? logic.holiday_rollover,
      )
      if (fallback) return fallback
    }
    return {
      kind: 'nth_day_after_tax_year_begin',
      monthOffset,
      day,
      holidayRollover: 'next_business_day',
    }
  }

  if (kind === 'nth_day_after_tax_year_end') {
    const monthOffset = intValue(logic.monthOffset ?? logic.month_offset ?? logic.month)
    const day = intValue(logic.day ?? logic.dayOfMonth ?? logic.day_of_month)
    if (!monthOffset || !day) {
      const fallback = dueDateLogicFromDateCandidates(
        dueDateCandidatesForLogic(logic, applicableYear, sourceText, sourceExcerpt),
        logic.frequency,
        logic.holidayRollover ?? logic.holiday_rollover,
      )
      if (fallback) return fallback
    }
    return {
      kind: 'nth_day_after_tax_year_end',
      monthOffset,
      day,
      holidayRollover: 'next_business_day',
    }
  }

  const fallback = dueDateLogicFromDateCandidates(
    dueDateCandidatesForLogic(logic, applicableYear, sourceText, sourceExcerpt),
    logic.frequency,
    logic.holidayRollover ?? logic.holiday_rollover,
  )
  return fallback ?? logic
}

function normalizeDueDateKindAlias(value: string | null | undefined): string {
  const normalized = normalizeToken(value ?? '')
  if (
    normalized === 'period_table' ||
    normalized === 'periodtable' ||
    normalized.includes('installment') ||
    normalized.includes('schedule') ||
    normalized.includes('quarterly_due') ||
    normalized.includes('monthly_due') ||
    normalized.includes('estimated_tax')
  ) {
    return 'period_table'
  }
  if (
    normalized === 'fixed' ||
    normalized === 'fixed_date' ||
    normalized === 'fixeddate' ||
    normalized === 'calendar_date' ||
    normalized === 'specific_date' ||
    normalized === 'single_date' ||
    normalized === 'annual_due_date' ||
    normalized === 'return_due_date' ||
    normalized === 'payment_due_date' ||
    normalized === 'date'
  ) {
    return 'fixed_date'
  }
  if (
    normalized === 'nth_day_after_tax_year_begin' ||
    normalized === 'nthdayaftertaxyearbegin' ||
    normalized.includes('after_tax_year_begin') ||
    normalized.includes('after_beginning') ||
    normalized.includes('from_beginning')
  ) {
    return 'nth_day_after_tax_year_begin'
  }
  if (
    normalized === 'nth_day_after_tax_year_end' ||
    normalized === 'nthdayaftertaxyearend' ||
    normalized.includes('after_tax_year_end') ||
    normalized.includes('after_year_end') ||
    normalized.includes('after_close')
  ) {
    return 'nth_day_after_tax_year_end'
  }
  return normalized || 'unknown'
}

function normalizeRawPeriods(logic: RuleConcreteDraftAiOutput['dueDateLogic']) {
  const raw = logic.periods ?? logic.dueDates ?? logic.due_dates ?? logic.dates ?? []
  return raw.map((period, index): z.infer<typeof AiPeriodSchema> => {
    if (typeof period === 'string') {
      return {
        period,
        label: null,
        name: null,
        dueDate: null,
        due_date: null,
        due: null,
        date: null,
      }
    }
    return {
      period: period.period ?? period.label ?? period.name ?? `Period ${index + 1}`,
      label: period.label,
      name: period.name,
      dueDate: period.dueDate,
      due_date: period.due_date,
      due: period.due,
      date: period.date,
    }
  })
}

function dueDateCandidatesForLogic(
  logic: RuleConcreteDraftAiOutput['dueDateLogic'],
  applicableYear: number,
  sourceText: string,
  sourceExcerpt: string | null,
): string[] {
  const rawValues: (string | null | undefined)[] = [
    logic.date,
    logic.dueDate,
    logic.due_date,
    logic.deadline,
    logic.filingDueDate,
    logic.filing_due_date,
    logic.returnDueDate,
    logic.return_due_date,
    logic.paymentDueDate,
    logic.payment_due_date,
    logic.description,
    sourceExcerpt,
  ]

  for (const period of normalizeRawPeriods(logic)) {
    rawValues.push(
      period.period,
      period.label,
      period.name,
      period.dueDate,
      period.due_date,
      period.due,
      period.date,
    )
  }
  rawValues.push(sourceText)

  return rawValues
    .flatMap((value) => extractDateOnlyCandidates(value, applicableYear))
    .filter((date, index, values) => values.indexOf(date) === index)
}

function dueDateLogicFromDateCandidates(
  dates: readonly string[],
  frequency: string | null | undefined,
  rollover: string | null | undefined,
): RuleConcreteDraftPayload['dueDateLogic'] | null {
  if (dates.length === 0) return null
  if (dates.length === 1) {
    return {
      kind: 'fixed_date',
      date: dates[0]!,
      holidayRollover: normalizeFixedDateHolidayRollover(rollover),
    }
  }

  return {
    kind: 'period_table',
    frequency: normalizeFrequency(frequency, dates.length),
    periods: dates.map((date, index) => ({ period: `Period ${index + 1}`, dueDate: date })),
    holidayRollover: 'source_adjusted',
  }
}

function inferRelativeDueDateLogic(
  sourceExcerpt: string | null,
  description: string | null,
  kind: string,
  applicableYear?: number,
): RuleConcreteDraftPayload['dueDateLogic'] | null {
  const text = [sourceExcerpt, description].filter(Boolean).join('\n')
  if (!text) return null
  const installment = inferRelativeInstallmentDueDateLogic(text, applicableYear)
  if (installment) return installment

  const match = text.match(RELATIVE_DUE_DATE_RE)
  const day = match?.[1] ? ordinalValue(match[1], 31) : null
  const monthOffset = match?.[2] ? ordinalValue(match[2], 12) : null
  if (!day || !monthOffset) return null
  const anchor = normalizeToken(match?.[3] ?? '')
  const inferredKind =
    kind === 'nth_day_after_tax_year_end' || anchor === 'end' || anchor === 'close'
      ? 'nth_day_after_tax_year_end'
      : 'nth_day_after_tax_year_begin'
  return {
    kind: inferredKind,
    monthOffset,
    day,
    holidayRollover: 'next_business_day',
  }
}

function inferRelativeInstallmentDueDateLogic(
  text: string,
  applicableYear: number | undefined,
): RuleConcreteDraftPayload['dueDateLogic'] | null {
  if (!applicableYear) return null
  const match = text.match(RELATIVE_INSTALLMENT_MONTHS_RE)
  const day = match?.[1] ? ordinalValue(match[1], 31) : null
  const monthText = match?.[2]
  if (!day || !monthText) return null

  const months = ordinalValuesInText(monthText, 12)
  if (months.length < 2) return null

  return {
    kind: 'period_table',
    frequency: normalizeFrequency(null, months.length),
    periods: months.flatMap((month, index) => {
      const dueDate = formatDateParts(applicableYear, month, day)
      return dueDate ? [{ period: `Installment ${index + 1}`, dueDate }] : []
    }),
    holidayRollover: 'source_adjusted',
  }
}

function ordinalValuesInText(text: string, max: number): number[] {
  const matches = text.match(
    /\b(\d{1,2}(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth)\b/gi,
  )
  const values = (matches ?? []).flatMap((match) => {
    const parsed = ordinalValue(match, max)
    return parsed ? [parsed] : []
  })
  return values.filter((ordinal, index) => values.indexOf(ordinal) === index)
}

function ordinalValue(value: string, max = 31): number | null {
  const normalized = normalizeToken(value)
  const ordinalNumber = normalized.match(/^(\d{1,2})(?:st|nd|rd|th)?$/)
  if (ordinalNumber?.[1]) {
    const parsed = Number(ordinalNumber[1])
    return parsed >= 1 && parsed <= max ? parsed : null
  }
  const direct = Number(normalized)
  if (Number.isInteger(direct) && direct >= 1 && direct <= max) return direct
  const words: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
    eleventh: 11,
    twelfth: 12,
    thirteenth: 13,
    fourteenth: 14,
    fifteenth: 15,
    sixteenth: 16,
    seventeenth: 17,
    eighteenth: 18,
    nineteenth: 19,
    twentieth: 20,
    thirtieth: 30,
  }
  const word = words[normalized] ?? null
  return word !== null && word <= max ? word : null
}

function normalizeExtensionPolicy(
  policy: RuleConcreteDraftAiOutput['extensionPolicy'],
): RuleConcreteDraftPayload['extensionPolicy'] {
  const available = boolValue(policy?.available) ?? false
  const paymentExtended = boolValue(policy?.paymentExtended ?? policy?.payment_extended) ?? false
  const formName = stringValue(policy?.formName ?? policy?.form_name)
  const durationMonths = intValue(policy?.durationMonths ?? policy?.duration_months)

  return {
    available,
    ...(formName ? { formName } : {}),
    ...(durationMonths !== null && durationMonths > 0 && available ? { durationMonths } : {}),
    paymentExtended,
    notes:
      stringValue(policy?.notes) ??
      'No extension policy is stated in the selected official source text.',
  }
}

function normalizeQuality(
  quality: RuleConcreteDraftAiOutput['quality'],
  sourceText: string,
): RuleConcreteDraftPayload['quality'] {
  const mentionsCalendarOrFiscal = /\b(calendar|fiscal)\s+year\b/i.test(sourceText)
  const mentionsHolidayRollover = /\b(weekend|holiday|next business day)\b/i.test(sourceText)

  return {
    filingPaymentDistinguished:
      boolValue(quality?.filingPaymentDistinguished ?? quality?.filing_payment_distinguished) ??
      false,
    extensionHandled: boolValue(quality?.extensionHandled ?? quality?.extension_handled) ?? false,
    calendarFiscalSpecified:
      boolValue(quality?.calendarFiscalSpecified ?? quality?.calendar_fiscal_specified) ??
      mentionsCalendarOrFiscal,
    holidayRolloverHandled:
      boolValue(quality?.holidayRolloverHandled ?? quality?.holiday_rollover_handled) ??
      mentionsHolidayRollover,
    crossVerified: boolValue(quality?.crossVerified ?? quality?.cross_verified) ?? false,
    exceptionChannel: boolValue(quality?.exceptionChannel ?? quality?.exception_channel) ?? false,
  }
}

function normalizeCoverageStatus(
  value: string | null | undefined,
): RuleConcreteDraftPayload['coverageStatus'] {
  const normalized = normalizeToken(value ?? '')
  if (normalized === 'full' || normalized === 'manual' || normalized === 'skeleton') {
    return normalized
  }
  return 'manual'
}

function normalizeFrequency(value: string | null | undefined, periodCount: number) {
  const normalized = normalizeToken(value ?? '')
  if (
    normalized === 'semiweekly' ||
    normalized === 'monthly' ||
    normalized === 'quarterly' ||
    normalized === 'annual'
  ) {
    return normalized
  }
  if (normalized.includes('semiweekly')) return 'semiweekly'
  if (normalized.includes('month')) return 'monthly'
  if (
    normalized.includes('quarter') ||
    normalized.includes('installment') ||
    normalized.includes('estimated') ||
    normalized.includes('payment')
  ) {
    return 'quarterly'
  }
  if (normalized.includes('annual') || normalized.includes('year')) return 'annual'
  if (periodCount === 4) return 'quarterly'
  if (periodCount === 12) return 'monthly'
  if (periodCount === 1) return 'annual'
  return 'quarterly'
}

function normalizeFixedDateHolidayRollover(value: string | null | undefined) {
  const normalized = normalizeToken(value ?? '')
  return normalized.includes('source') ? 'source_adjusted' : 'next_business_day'
}

function normalizeDateOnly(
  value: string | null | undefined,
  applicableYear: number,
): string | null {
  const text = stringValue(value)
  if (!text) return null

  const iso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (iso?.[1] && iso[2] && iso[3])
    return formatDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (slash?.[1] && slash[2]) {
    const year = slash[3] ? normalizeYear(Number(slash[3]), applicableYear) : applicableYear
    return formatDateParts(year, Number(slash[1]), Number(slash[2]))
  }

  const monthName = text.match(MONTH_DAY_SINGLE_RE)
  if (monthName?.[1] && monthName[2]) {
    const month = MONTH_NAMES[monthName[1].toLowerCase()]
    if (!month) return null
    const year = monthName[3] ? Number(monthName[3]) : applicableYear
    return formatDateParts(year, month, Number(monthName[2]))
  }

  return null
}

function extractDateOnlyCandidates(
  value: string | null | undefined,
  applicableYear: number,
  options: { unique?: boolean } = {},
): string[] {
  const text = stringValue(value)
  if (!text) return []

  const dates: string[] = []
  const add = (date: string | null) => {
    if (date && (options.unique === false || !dates.includes(date))) dates.push(date)
  }

  for (const match of text.matchAll(MONTH_DAY_RE)) {
    const monthName = match[1]
    const day = match[2]
    if (!monthName || !day) continue
    const month = MONTH_NAMES[monthName.toLowerCase()]
    if (!month) continue
    add(formatDateParts(match[3] ? Number(match[3]) : applicableYear, month, Number(day)))
  }

  for (const match of text.matchAll(SLASH_DATE_RE)) {
    const month = match[1]
    const day = match[2]
    if (!month || !day) continue
    const year = match[3] ? normalizeYear(Number(match[3]), applicableYear) : applicableYear
    add(formatDateParts(year, Number(month), Number(day)))
  }

  return dates
}

function inferSourceExcerpt(sourceText: string): string | null {
  const lines = sourceText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (lines.length === 0) return null

  const calendarYearIndex = lines.findIndex(
    (line) => /\bcalendar\s+year\b/i.test(line) && /\b(due|payment|filer)/i.test(line),
  )
  if (calendarYearIndex >= 0) {
    const selected: string[] = []
    for (const line of lines.slice(calendarYearIndex, calendarYearIndex + 12)) {
      if (selected.length > 0 && /\bfiscal\s+year\b/i.test(line)) break
      if (
        selected.length === 0 ||
        /\bpayment\s*\d\b/i.test(line) ||
        extractDateOnlyCandidates(line, 2000).length > 0
      ) {
        selected.push(line)
      }
    }
    if (extractDateOnlyCandidates(selected.join('\n'), 2000).length > 0) {
      return selected.join('\n')
    }
  }

  const installmentHeaderIndex = lines.findIndex(
    (line) => /\btax(?:able)?\s+year\s+end\b/i.test(line) && /\binstallment\b/i.test(line),
  )
  if (installmentHeaderIndex >= 0) {
    const selected = [lines[installmentHeaderIndex]!]
    for (const line of lines.slice(installmentHeaderIndex + 1, installmentHeaderIndex + 4)) {
      selected.push(line)
      if (extractDateOnlyCandidates(line, 2000).length > 0) break
    }
    if (extractDateOnlyCandidates(selected.join('\n'), 2000).length > 0) {
      return selected.join('\n')
    }
  }

  const paymentLines = lines.filter(
    (line) =>
      (/\bpayment\s*\d\b/i.test(line) || /\binstallment/i.test(line)) &&
      extractDateOnlyCandidates(line, 2000).length > 0,
  )
  if (paymentLines.length > 0) return paymentLines.slice(0, 6).join('\n')

  const relativeLines = lines.filter(
    (line) => RELATIVE_DUE_DATE_RE.test(line) || /\bdue\b.*\bmonth\b.*\btaxable year\b/i.test(line),
  )
  if (relativeLines.length > 0) return relativeLines.slice(0, 6).join('\n')

  const dateLines = lines.filter((line) => extractDateOnlyCandidates(line, 2000).length > 0)
  if (dateLines.length > 0) return dateLines.slice(0, 6).join('\n')

  const operationalLines = lines.filter((line) =>
    /\b(due|deadline|return|payment|filing|tax|report|wage|withholding)\b/i.test(line),
  )
  if (operationalLines.length > 0) return operationalLines.slice(0, 6).join('\n')

  return lines.slice(0, 6).join('\n')
}

function normalizeYear(value: number, applicableYear: number): number {
  if (value >= 1000) return value
  const century = Math.floor(applicableYear / 100) * 100
  return century + value
}

function formatDateParts(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`
}

function stringValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function boolValue(value: boolean | string | null | undefined): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = normalizeToken(value)
    if (normalized === 'true' || normalized === 'yes') return true
    if (normalized === 'false' || normalized === 'no') return false
  }
  return null
}

function intValue(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null
  }
  return null
}

function normalizeConfidence(value: string | number | null | undefined): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return 0.5
  return Math.min(1, Math.max(0, parsed))
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
