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
import { extractOfficialSourceText, SOURCE_WATCH_PLACEHOLDER_RE } from './source-text'

export const RuleConcreteDraftPayloadSchema = RuleConcreteDraftSchema.omit({ aiOutputId: true })
export type RuleConcreteDraftPayload = Omit<RuleConcreteDraft, 'aiOutputId'>
export const RULE_CONCRETE_DRAFT_PROMPT = 'rule-concrete-draft@v1'
const MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS = 24_000

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

const AiPeriodSchema = z.object({
  period: nullableString,
  dueDate: nullableString,
  due_date: nullableString,
  date: nullableString,
})

const AiDueDateLogicSchema = z.object({
  kind: z.string().min(1),
  date: nullableString,
  monthOffset: nullableNumber,
  month_offset: nullableNumber,
  day: nullableNumber,
  frequency: nullableString,
  periods: z.array(AiPeriodSchema).nullable().optional(),
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

export const RuleConcreteDraftAiOutputSchema = z.object({
  dueDateLogic: AiDueDateLogicSchema,
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

export type RuleConcreteDraftAiOutput = z.infer<typeof RuleConcreteDraftAiOutputSchema>

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

  const sourceTokens = new Set(normalizedSource.match(/[a-z0-9]+/g) ?? [])
  const excerptTokens = Array.from(new Set(normalizedExcerpt.match(/[a-z0-9]+/g) ?? [])).filter(
    (token) => token.length > 2,
  )
  if (excerptTokens.length < 4) return false

  const hitCount = excerptTokens.filter((token) => sourceTokens.has(token)).length
  return hitCount / excerptTokens.length >= 0.85
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

  if (SOURCE_WATCH_PLACEHOLDER_RE.test(input.sourceExcerpt)) {
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

async function fetchOfficialSourceText(url: string): Promise<string | null> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
        'user-agent': 'DueDateHQ rule review source fetcher',
      },
    })
  } catch {
    return null
  }

  if (!response.ok) return null
  const contentType = response.headers.get('content-type') ?? ''
  if (
    !contentType.includes('text/html') &&
    !contentType.includes('application/xhtml+xml') &&
    !contentType.includes('text/plain')
  ) {
    return null
  }

  const raw = await response.text().catch(() => null)
  if (!raw) return null
  const text = extractOfficialSourceText(raw)
  return text ? text.slice(0, MAX_CONCRETE_DRAFT_SOURCE_TEXT_CHARS) : null
}

async function readR2Text(
  env: Pick<Env, 'R2_PULSE'>,
  key: string | null | undefined,
): Promise<string | null> {
  if (!key) return null
  const raw = await env.R2_PULSE.get(key).catch(() => null)
  const text = raw ? await raw.text().catch(() => null) : null
  return text?.trim() ? text : null
}

export async function buildConcreteDraftSourceText(input: {
  env: Pick<Env, 'R2_PULSE'>
  base: CoreObligationRule
  source: CoreRuleSource
  sourceSignal: PulseSourceSignalRow | null
  latestSourceSnapshot?: PulseSourceSnapshotRow | null
}): Promise<ConcreteDraftSourceText> {
  const chunks: string[] = []
  let hasSourceBackedText = false

  if (input.sourceSignal) {
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

  if (input.latestSourceSnapshot) {
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

  const evidenceChunks = input.base.evidence
    .filter(
      (evidence) =>
        evidence.sourceId === input.source.id &&
        !SOURCE_WATCH_PLACEHOLDER_RE.test(evidence.sourceExcerpt),
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
  const officialSourceText = hasSourceBackedText
    ? null
    : await fetchOfficialSourceText(input.source.url)
  if (officialSourceText) hasSourceBackedText = true

  chunks.push(
    [
      input.source.title,
      input.source.url,
      input.source.lastReviewedOn ? `Reviewed ${input.source.lastReviewedOn}` : null,
      ...evidenceChunks,
      officialSourceText ? `Official source text\n${officialSourceText}` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join('\n'),
  )

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
    sourceText: input.sourceText,
  }
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
  const cachedDraft = parseCachedConcreteDraft(cached?.outputText ?? null)
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

  const ai = createAI(input.env)
  const aiResult = await ai.runPrompt(
    RULE_CONCRETE_DRAFT_PROMPT,
    aiInput,
    RuleConcreteDraftAiOutputSchema,
    {
      taskKind: 'insight',
    },
  )

  const normalized = aiResult.result
    ? normalizeRuleConcreteDraftAiOutput({
        output: aiResult.result,
        applicableYear: input.base.applicableYear,
        sourceTitle: input.source.title,
        sourceText,
      })
    : { draft: null, error: null }
  const draft = normalized.draft
  const guardError = draft
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
  const kind = normalizeToken(logic.kind)

  if (kind === 'period_table' || kind === 'periodtable' || Array.isArray(logic.periods)) {
    const fallbackDates = [
      ...extractDateOnlyCandidates(sourceExcerpt, applicableYear),
      ...extractDateOnlyCandidates(logic.description, applicableYear),
      ...extractDateOnlyCandidates(sourceText, applicableYear),
    ].filter((date, index, values) => values.indexOf(date) === index)
    const periods = (logic.periods ?? []).map((period, index) => {
      const rawDate = period.dueDate ?? period.due_date ?? period.date ?? period.period
      return {
        period: stringValue(period.period) ?? `Period ${index + 1}`,
        dueDate: normalizeDateOnly(rawDate, applicableYear) ?? fallbackDates[index] ?? null,
      }
    })

    return {
      kind: 'period_table',
      frequency: normalizeFrequency(logic.frequency, periods.length),
      periods,
      holidayRollover: 'source_adjusted',
    }
  }

  if (kind === 'fixed_date' || kind === 'fixeddate') {
    return {
      kind: 'fixed_date',
      date: normalizeDateOnly(logic.date, applicableYear),
      holidayRollover: normalizeFixedDateHolidayRollover(
        logic.holidayRollover ?? logic.holiday_rollover,
      ),
    }
  }

  if (kind === 'nth_day_after_tax_year_begin' || kind === 'nthdayaftertaxyearbegin') {
    return {
      kind: 'nth_day_after_tax_year_begin',
      monthOffset: intValue(logic.monthOffset ?? logic.month_offset),
      day: intValue(logic.day),
      holidayRollover: 'next_business_day',
    }
  }

  if (kind === 'nth_day_after_tax_year_end' || kind === 'nthdayaftertaxyearend') {
    return {
      kind: 'nth_day_after_tax_year_end',
      monthOffset: intValue(logic.monthOffset ?? logic.month_offset),
      day: intValue(logic.day),
      holidayRollover: 'next_business_day',
    }
  }

  return logic
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
    ...(durationMonths !== null && available ? { durationMonths } : {}),
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
): string[] {
  const text = stringValue(value)
  if (!text) return []

  const dates: string[] = []
  const add = (date: string | null) => {
    if (date && !dates.includes(date)) dates.push(date)
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

  const paymentLines = lines.filter(
    (line) =>
      (/\bpayment\s*\d\b/i.test(line) || /\binstallment/i.test(line)) &&
      extractDateOnlyCandidates(line, 2000).length > 0,
  )
  if (paymentLines.length > 0) return paymentLines.slice(0, 6).join('\n')

  const dateLines = lines.filter((line) => extractDateOnlyCandidates(line, 2000).length > 0)
  return dateLines.length > 0 ? dateLines.slice(0, 6).join('\n') : null
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
