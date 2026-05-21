import { ORPCError } from '@orpc/server'
import { zipSync } from 'fflate'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type {
  AuditEventPublic,
  EvidencePublic,
  ObligationQueueFacetsOutput,
  ObligationQueueListInput,
  ObligationQueueMatchedRule,
  ObligationQueueRow,
} from '@duedatehq/contracts'
import {
  canEditTaxYearProfileForObligation,
  findRuleById,
  listObligationRules,
  normalizeRuleTaxTypeCandidates,
} from '@duedatehq/core/rules'
import { toAuditEventPublic } from '../audit'
import { requireTenant } from '../_context'
import { OBLIGATION_STATUS_WRITE_ROLES, requireCurrentFirmRole } from '../_permissions'
import { os } from '../_root'
import { signReadinessPortalToken } from '../../lib/readiness-token'
import {
  toReadinessDocumentChecklistItemPublic,
  toReadinessRequestPublic,
} from '../readiness/_public'

/**
 * obligations.* — internal API namespace for the firm-wide Obligations queue.
 *
 * Mutations (status / due date) live in `obligationsContract` so each
 * entity has exactly one canonical write surface.
 */

interface RawRow {
  id: string
  firmId: string
  clientId: string
  clientFilingProfileId: string | null
  taxType: string
  taxYear: number | null
  taxYearType: ObligationQueueRow['taxYearType']
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  taxPeriodStart: Date | null
  taxPeriodEnd: Date | null
  taxPeriodKind: ObligationQueueRow['taxPeriodKind']
  taxPeriodSource: ObligationQueueRow['taxPeriodSource']
  taxPeriodReviewReason: string | null
  ruleId: string | null
  ruleVersion: number | null
  rulePeriod: string | null
  generationSource: ObligationQueueRow['generationSource']
  jurisdiction: string | null
  obligationType: ObligationQueueRow['obligationType']
  formName: string | null
  authority: string | null
  filingDueDate: Date | null
  paymentDueDate: Date | null
  sourceEvidenceJson: unknown
  recurrence: ObligationQueueRow['recurrence']
  riskLevel: ObligationQueueRow['riskLevel']
  baseDueDate: Date
  currentDueDate: Date
  status: ObligationQueueRow['status']
  blockedByObligationInstanceId: string | null
  readiness: ObligationQueueRow['readiness']
  extensionDecision: ObligationQueueRow['extensionDecision']
  extensionMemo: string | null
  extensionSource: string | null
  extensionExpectedDueDate: Date | null
  extensionDecidedAt: Date | null
  extensionDecidedByUserId: string | null
  extensionState: ObligationQueueRow['extensionState']
  extensionFormName: string | null
  extensionFiledAt: Date | null
  extensionAcceptedAt: Date | null
  prepStage: ObligationQueueRow['prepStage']
  reviewStage: ObligationQueueRow['reviewStage']
  reviewerUserId: string | null
  reviewCompletedAt: Date | null
  paymentState: ObligationQueueRow['paymentState']
  paymentConfirmedAt: Date | null
  efileState: ObligationQueueRow['efileState']
  efileAuthorizationForm: string | null
  efileSubmittedAt: Date | null
  efileAcceptedAt: Date | null
  efileRejectedAt: Date | null
  migrationBatchId: string | null
  estimatedTaxDueCents: number | null
  penaltyBreakdownJson: unknown
  missingPenaltyFactsJson: unknown
  penaltySourceRefsJson: unknown
  penaltyFormulaLabel: string | null
  penaltyFactsVersion: string | null
  accruedPenaltyCents: number | null
  accruedPenaltyStatus: ObligationQueueRow['accruedPenaltyStatus']
  accruedPenaltyBreakdown: ObligationQueueRow['accruedPenaltyBreakdown']
  penaltyAsOfDate: string
  penaltyFormulaVersion: string | null
  createdAt: Date
  updatedAt: Date
  clientName: string
  clientState: string | null
  clientCounty: string | null
  assigneeName: string | null
  daysUntilDue: number
  evidenceCount: number
  smartPriority: ObligationQueueRow['smartPriority']
}

type ObligationQueueRepoListInput = NonNullable<
  Parameters<ReturnType<typeof requireTenant>['scoped']['obligationQueue']['list']>[0]
>

const EXPORT_MAX_ROWS = 1000
const ACTIVE_EXPORT_STATUSES = [
  'pending',
  'in_progress',
  'waiting_on_client',
  'review',
  'extended',
  'blocked',
] as const satisfies readonly ObligationQueueRow['status'][]

interface SavedViewRow {
  id: string
  firmId: string
  createdByUserId: string
  name: string
  queryJson: unknown
  columnVisibilityJson: unknown
  density: 'comfortable' | 'compact'
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
}

const STATE_CODE_RE = /^[A-Z]{2}$/

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStateCode(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase()
  return normalized && STATE_CODE_RE.test(normalized) ? normalized : null
}

function normalizeNullableText(value: string | null): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function toRow(
  row: RawRow,
  opts: { hideDollars?: boolean; hideSmartPriorityFactors?: boolean } = {},
): ObligationQueueRow {
  const taxAuthorityFilingDueDate = row.filingDueDate ?? row.baseDueDate
  const taxAuthorityPaymentDueDate = row.paymentDueDate ?? row.baseDueDate
  const rule = row.ruleId ? findRuleById(row.ruleId) : null
  return {
    id: row.id,
    firmId: row.firmId,
    clientId: row.clientId,
    clientFilingProfileId: row.clientFilingProfileId,
    taxType: row.taxType,
    taxYear: row.taxYear,
    taxYearType: row.taxYearType,
    fiscalYearEndMonth: row.fiscalYearEndMonth,
    fiscalYearEndDay: row.fiscalYearEndDay,
    taxPeriodStart: row.taxPeriodStart ? toIsoDate(row.taxPeriodStart) : null,
    taxPeriodEnd: row.taxPeriodEnd ? toIsoDate(row.taxPeriodEnd) : null,
    taxPeriodKind: row.taxPeriodKind,
    taxPeriodSource: row.taxPeriodSource,
    taxPeriodReviewReason: row.taxPeriodReviewReason,
    ruleId: row.ruleId,
    ruleVersion: row.ruleVersion,
    rulePeriod: row.rulePeriod,
    generationSource: row.generationSource,
    jurisdiction: row.jurisdiction,
    obligationType: row.obligationType,
    formName: row.formName,
    authority: row.authority,
    filingDueDate: toIsoDate(taxAuthorityFilingDueDate),
    paymentDueDate: toIsoDate(taxAuthorityPaymentDueDate),
    sourceEvidence: row.sourceEvidenceJson ?? null,
    recurrence: row.recurrence,
    riskLevel: row.riskLevel,
    baseDueDate: toIsoDate(row.baseDueDate),
    currentDueDate: toIsoDate(row.currentDueDate),
    status: row.status,
    blockedByObligationInstanceId: row.blockedByObligationInstanceId,
    readiness: row.readiness,
    extensionDecision: row.extensionDecision,
    extensionMemo: row.extensionMemo,
    extensionSource: row.extensionSource,
    extensionInternalTargetDate: row.extensionExpectedDueDate
      ? toIsoDate(row.extensionExpectedDueDate)
      : null,
    extensionDecidedAt: row.extensionDecidedAt?.toISOString() ?? null,
    extensionDecidedByUserId: row.extensionDecidedByUserId,
    extensionState: row.extensionState,
    extensionFormName: row.extensionFormName,
    extensionFiledAt: row.extensionFiledAt?.toISOString() ?? null,
    extensionAcceptedAt: row.extensionAcceptedAt?.toISOString() ?? null,
    prepStage: row.prepStage,
    reviewStage: row.reviewStage,
    reviewerUserId: row.reviewerUserId,
    reviewCompletedAt: row.reviewCompletedAt?.toISOString() ?? null,
    paymentState: row.paymentState,
    paymentConfirmedAt: row.paymentConfirmedAt?.toISOString() ?? null,
    efileState: row.efileState,
    efileAuthorizationForm: row.efileAuthorizationForm,
    efileSubmittedAt: row.efileSubmittedAt?.toISOString() ?? null,
    efileAcceptedAt: row.efileAcceptedAt?.toISOString() ?? null,
    efileRejectedAt: row.efileRejectedAt?.toISOString() ?? null,
    migrationBatchId: row.migrationBatchId,
    estimatedTaxDueCents: opts.hideDollars ? null : row.estimatedTaxDueCents,
    penaltyBreakdown: opts.hideDollars ? [] : parsePenaltyBreakdown(row.penaltyBreakdownJson),
    missingPenaltyFacts: opts.hideDollars ? [] : parseStringArray(row.missingPenaltyFactsJson),
    penaltySourceRefs: opts.hideDollars ? [] : parsePenaltySourceRefs(row.penaltySourceRefsJson),
    penaltyFormulaLabel: opts.hideDollars ? null : row.penaltyFormulaLabel,
    penaltyFactsVersion: opts.hideDollars ? null : row.penaltyFactsVersion,
    accruedPenaltyCents: opts.hideDollars ? null : row.accruedPenaltyCents,
    accruedPenaltyStatus: row.accruedPenaltyStatus,
    accruedPenaltyBreakdown: opts.hideDollars ? [] : row.accruedPenaltyBreakdown,
    penaltyAsOfDate: row.penaltyAsOfDate,
    penaltyFormulaVersion: opts.hideDollars ? null : row.penaltyFormulaVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    clientName: row.clientName,
    clientState: normalizeStateCode(row.clientState),
    clientCounty: normalizeNullableText(row.clientCounty),
    assigneeName: row.assigneeName?.trim() || null,
    taxYearProfileEditable: canEditTaxYearProfileForObligation({
      rule,
      taxType: row.taxType,
      taxYearType: row.taxYearType,
      taxPeriodKind: row.taxPeriodKind,
    }),
    daysUntilDue: row.daysUntilDue,
    evidenceCount: row.evidenceCount,
    smartPriority: opts.hideSmartPriorityFactors
      ? { ...row.smartPriority, factors: [] }
      : row.smartPriority,
  }
}

interface EvidenceRow {
  id: string
  obligationInstanceId: string | null
  aiOutputId: string | null
  sourceType: string
  sourceId: string | null
  sourceUrl: string | null
  verbatimQuote: string | null
  rawValue: string | null
  normalizedValue: string | null
  confidence: number | null
  model: string | null
  appliedAt: Date
}

function toEvidencePublic(row: EvidenceRow): EvidencePublic {
  return {
    id: row.id,
    obligationInstanceId: row.obligationInstanceId,
    aiOutputId: row.aiOutputId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceUrl: row.sourceUrl,
    verbatimQuote: row.verbatimQuote,
    rawValue: row.rawValue,
    normalizedValue: row.normalizedValue,
    confidence: row.confidence,
    model: row.model,
    appliedAt: row.appliedAt.toISOString(),
  }
}

function toSavedView(row: SavedViewRow) {
  return {
    id: row.id,
    firmId: row.firmId,
    createdByUserId: row.createdByUserId,
    name: row.name,
    query: isRecord(row.queryJson) ? row.queryJson : {},
    columnVisibility: normalizeColumnVisibility(row.columnVisibilityJson),
    density: row.density,
    isPinned: row.isPinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function parsePenaltyBreakdown(value: unknown): ObligationQueueRow['penaltyBreakdown'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const key = item.key
    const label = item.label
    const amountCents = item.amountCents
    const formula = item.formula
    if (
      typeof key !== 'string' ||
      typeof label !== 'string' ||
      typeof amountCents !== 'number' ||
      typeof formula !== 'string'
    ) {
      return []
    }
    return [
      {
        key,
        label,
        amountCents,
        formula,
        inputs: parsePenaltyInputs(item.inputs),
        sourceRefs: parsePenaltySourceRefs(item.sourceRefs),
      },
    ]
  })
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function parsePenaltyInputs(
  value: unknown,
): Record<string, string | number | boolean | null> | undefined {
  if (!isRecord(value)) return undefined
  const result: Record<string, string | number | boolean | null> = {}
  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean' ||
      item === null
    ) {
      result[key] = item
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function parsePenaltySourceRefs(value: unknown): ObligationQueueRow['penaltySourceRefs'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const { label, url, sourceExcerpt, effectiveDate, lastReviewedDate } = item
    if (
      typeof label !== 'string' ||
      typeof url !== 'string' ||
      typeof sourceExcerpt !== 'string' ||
      typeof effectiveDate !== 'string' ||
      typeof lastReviewedDate !== 'string'
    ) {
      return []
    }
    return [{ label, url, sourceExcerpt, effectiveDate, lastReviewedDate }]
  })
}

function normalizeColumnVisibility(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, next]) =>
      typeof next === 'boolean' ? [[key, next]] : [],
    ),
  )
}

function dateInTimezone(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function matchedRuleForRow(row: ObligationQueueRow): ObligationQueueMatchedRule | null {
  const candidates = normalizeRuleTaxTypeCandidates(row.taxType).map(
    (candidate) => candidate.taxType,
  )
  const candidateSet = new Set([row.taxType, ...candidates])
  const rule =
    (row.ruleId ? findRuleById(row.ruleId) : undefined) ??
    listObligationRules({ includeCandidates: true }).find((item) => {
      if (!candidateSet.has(item.taxType)) return false
      if (item.jurisdiction === 'FED') return true
      return row.clientState === item.jurisdiction
    })
  if (!rule) return null
  return {
    id: rule.id,
    title: rule.title,
    defaultTip: rule.defaultTip,
    taxYearProfileEditable: canEditTaxYearProfileForObligation({
      rule,
      taxType: row.taxType,
      taxYearType: row.taxYearType,
      taxPeriodKind: row.taxPeriodKind,
    }),
    extensionPolicy: { ...rule.extensionPolicy },
    evidence: rule.evidence.map((item) => Object.assign({}, item)),
  }
}

async function readinessPortalUrl(input: {
  appUrl: string
  secret: string
  requestId: string
  expiresAt: Date
  status: string
}): Promise<string | null> {
  if (input.status === 'revoked' || input.status === 'expired') return null
  if (input.expiresAt.getTime() <= Date.now()) return null
  const token = await signReadinessPortalToken({
    secret: input.secret,
    requestId: input.requestId,
    expiresAtMs: input.expiresAt.getTime(),
  })
  return `${input.appUrl.replace(/\/$/, '')}/readiness/${encodeURIComponent(token)}`
}

function csvCell(value: unknown): string {
  let raw = ''
  if (typeof value === 'string') raw = value
  else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    raw = value.toString()
  } else if (value instanceof Date) raw = value.toISOString()
  else if (typeof value === 'object' && value !== null) raw = JSON.stringify(value)
  return `"${raw.replaceAll('"', '""')}"`
}

function rowsToCsv(rows: ObligationQueueRow[]): string {
  const body = rows.map((row) => [
    row.clientName,
    row.assigneeName ?? '',
    row.clientState ?? '',
    row.clientCounty ?? '',
    row.taxType,
    row.currentDueDate,
    row.daysUntilDue,
    row.accruedPenaltyCents === null ? '' : row.accruedPenaltyCents,
    row.accruedPenaltyStatus,
    row.status,
    row.readiness,
    row.evidenceCount,
  ])
  return [
    [
      'Client',
      'Owner',
      'State',
      'County',
      'Tax type',
      'Current due',
      'Days until due',
      'Accrued penalty cents',
      'Accrued penalty status',
      'Status',
      'Readiness',
      'Evidence count',
    ],
    ...body,
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\n')
}

function base64Bytes(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

function base64Text(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64')
}

async function buildClientPdf(clientName: string, rows: ObligationQueueRow[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  page.drawText('DueDateHQ Obligations Export', { x: 72, y: 720, font: bold, size: 16 })
  page.drawText(clientName, { x: 72, y: 692, font: bold, size: 12 })
  const lines = rows.slice(0, 24).map((row) => {
    const accrued =
      row.accruedPenaltyCents === null
        ? row.accruedPenaltyStatus
        : `$${row.accruedPenaltyCents / 100}`
    return `${row.taxType} | due ${row.currentDueDate} | ${row.status} | accrued ${accrued}`
  })
  lines.forEach((line, index) => {
    page.drawText(line.slice(0, 92), { x: 72, y: 660 - index * 20, font, size: 10 })
  })
  return pdf.save()
}

function toRepoListInput(
  input: ObligationQueueListInput,
  {
    limit,
  }: {
    limit?: number
  },
): ObligationQueueRepoListInput {
  const repoInput: ObligationQueueRepoListInput = {}
  if (input.status !== undefined) repoInput.status = input.status
  if (input.search !== undefined) repoInput.search = input.search
  if (input.obligationIds !== undefined) repoInput.obligationIds = input.obligationIds
  if (input.clientIds !== undefined) repoInput.clientIds = input.clientIds
  if (input.ruleIds !== undefined) repoInput.ruleIds = input.ruleIds
  if (input.states !== undefined) repoInput.states = input.states
  if (input.counties !== undefined) repoInput.counties = input.counties
  if (input.taxTypes !== undefined) repoInput.taxTypes = input.taxTypes
  if (input.assigneeName !== undefined) repoInput.assigneeName = input.assigneeName
  if (input.assigneeNames !== undefined) repoInput.assigneeNames = input.assigneeNames
  if (input.owner !== undefined) repoInput.owner = input.owner
  if (input.due !== undefined) repoInput.due = input.due
  if (input.dueWithinDays !== undefined) repoInput.dueWithinDays = input.dueWithinDays
  if (input.readiness !== undefined) repoInput.readiness = input.readiness
  if (input.minDaysUntilDue !== undefined) repoInput.minDaysUntilDue = input.minDaysUntilDue
  if (input.maxDaysUntilDue !== undefined) repoInput.maxDaysUntilDue = input.maxDaysUntilDue
  if (input.needsEvidence !== undefined) repoInput.needsEvidence = input.needsEvidence
  if (input.asOfDate !== undefined) repoInput.asOfDate = input.asOfDate
  if (input.sort !== undefined) repoInput.sort = input.sort
  if (input.cursor !== undefined) repoInput.cursor = input.cursor
  const outputLimit = limit ?? input.limit
  if (outputLimit !== undefined) repoInput.limit = outputLimit
  return repoInput
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r?\n/g, '\\n')
}

function toIcsDate(value: string): string {
  return value.replaceAll('-', '')
}

function rowsToIcs(rows: ObligationQueueRow[], timestamp: Date): string {
  const stamp = timestamp
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DueDateHQ//Obligations Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const row of rows) {
    const dueDate = toIcsDate(row.currentDueDate)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${row.id}@duedatehq`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dueDate}`,
      `SUMMARY:${escapeIcsText(`${row.clientName} - ${row.taxType}`)}`,
      `DESCRIPTION:${escapeIcsText(`Status: ${row.status}\nAuthority: ${row.authority ?? 'Unknown'}\nDueDateHQ obligation ${row.id}`)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

const list = os.obligations.list.handler(async ({ input, context }) => {
  const { scoped, tenant, userId } = requireTenant(context)
  const actor = await context.vars.members?.findMembership(tenant.firmId, userId)
  const hideDollars = actor?.role === 'coordinator' && !tenant.coordinatorCanSeeDollars
  const hideSmartPriorityFactors = actor?.role !== 'owner'

  const repoInput = toRepoListInput(input, {})

  const result = await scoped.obligationQueue.list(repoInput)

  return {
    rows: result.rows.map((row) => toRow(row, { hideDollars, hideSmartPriorityFactors })),
    nextCursor: result.nextCursor,
  }
})

const getDetail = os.obligations.getDetail.handler(async ({ input, context }) => {
  const { scoped, tenant, userId } = requireTenant(context)
  const actor = await context.vars.members?.findMembership(tenant.firmId, userId)
  const hideDollars = actor?.role === 'coordinator' && !tenant.coordinatorCanSeeDollars
  const hideSmartPriorityFactors = actor?.role !== 'owner'
  const rows = await scoped.obligationQueue.listByIds([input.obligationId], {
    asOfDate: input.asOfDate ?? dateInTimezone(tenant.timezone),
  })
  const rawRow = rows[0]
  if (!rawRow) {
    throw new ORPCError('NOT_FOUND', {
      message: `Obligation ${input.obligationId} not found in current firm.`,
    })
  }
  const row = toRow(rawRow, { hideDollars, hideSmartPriorityFactors })
  const [evidenceRows, auditResult, readinessRows, readinessChecklistRows] = await Promise.all([
    scoped.evidence.listByObligation(input.obligationId),
    scoped.audit.list({
      entityType: 'obligation_instance',
      entityId: input.obligationId,
      range: 'all',
      limit: 50,
    }),
    scoped.readiness.listByObligation(input.obligationId),
    scoped.readiness.listDocumentChecklistByObligation(input.obligationId),
  ])

  return {
    row,
    matchedRule: matchedRuleForRow(row),
    evidence: evidenceRows.map(toEvidencePublic),
    auditEvents: auditResult.rows.map((auditRow): AuditEventPublic => toAuditEventPublic(auditRow)),
    readinessChecklist: readinessChecklistRows.map(toReadinessDocumentChecklistItemPublic),
    readinessRequests: await Promise.all(
      readinessRows.map(async (readinessRow) =>
        toReadinessRequestPublic(
          readinessRow,
          await readinessPortalUrl({
            appUrl: context.env.APP_URL,
            secret: context.env.AUTH_SECRET,
            requestId: readinessRow.id,
            expiresAt: readinessRow.expiresAt,
            status: readinessRow.status,
          }),
        ),
      ),
    ),
  }
})

const facets = os.obligations.facets.handler(async ({ context }) => {
  const { scoped } = requireTenant(context)
  // Repo types describe the raw shape; the contract narrows state codes
  // and county strings to their schema-validated enums. The runtime
  // values are equivalent — the contract schema validates on the wire.
  return (await scoped.obligationQueue.facets()) as ObligationQueueFacetsOutput
})

const listSavedViews = os.obligations.listSavedViews.handler(async ({ context }) => {
  const { scoped } = requireTenant(context)
  return (await scoped.obligationQueue.listSavedViews()).map(toSavedView)
})

const createSavedView = os.obligations.createSavedView.handler(async ({ input, context }) => {
  const { tenant, userId } = await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  const row = await scoped.obligationQueue.createSavedView({
    name: input.name,
    createdByUserId: userId,
    queryJson: input.query,
    columnVisibilityJson: input.columnVisibility ?? {},
    density: input.density ?? 'comfortable',
    isPinned: input.isPinned ?? false,
  })
  await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_saved_view',
    entityId: row.id,
    action: 'obligations.saved_view.created',
    after: { name: row.name, firmId: tenant.firmId },
  })
  return toSavedView(row)
})

const updateSavedView = os.obligations.updateSavedView.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  const row = await scoped.obligationQueue.updateSavedView({
    id: input.id,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.query !== undefined ? { queryJson: input.query } : {}),
    ...(input.columnVisibility !== undefined
      ? { columnVisibilityJson: input.columnVisibility }
      : {}),
    ...(input.density !== undefined ? { density: input.density } : {}),
    ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
  })
  await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_saved_view',
    entityId: row.id,
    action: 'obligations.saved_view.updated',
    after: { name: row.name, isPinned: row.isPinned },
  })
  return toSavedView(row)
})

const deleteSavedView = os.obligations.deleteSavedView.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  await scoped.obligationQueue.deleteSavedView(input.id)
  await scoped.audit.write({
    actorId: userId,
    entityType: 'obligation_saved_view',
    entityId: input.id,
    action: 'obligations.saved_view.deleted',
  })
  return { id: input.id }
})

const exportSelected = os.obligations.exportSelected.handler(async ({ input, context }) => {
  const { tenant, userId } = await requireCurrentFirmRole(context, OBLIGATION_STATUS_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  const actor = await context.vars.members?.findMembership(tenant.firmId, userId)
  const hideDollars = actor?.role === 'coordinator' && !tenant.coordinatorCanSeeDollars
  const hideSmartPriorityFactors = actor?.role !== 'owner'
  let rawRows: RawRow[]
  if (input.scope === 'selected') {
    const selectedIds = [...new Set(input.ids ?? [])]
    rawRows = await scoped.obligationQueue.listByIds(selectedIds, {
      asOfDate: dateInTimezone(tenant.timezone),
    })
    if (rawRows.length !== selectedIds.length) {
      throw new ORPCError('NOT_FOUND', {
        message: 'One or more selected obligations were not found in the current firm.',
      })
    }
  } else {
    const query =
      input.scope === 'all_active'
        ? { status: [...ACTIVE_EXPORT_STATUSES], sort: 'due_asc' as const }
        : input.query
    if (!query) {
      throw new ORPCError('BAD_REQUEST', { message: 'Export scope requires a query.' })
    }
    const result = await scoped.obligationQueue.list(
      toRepoListInput(query, { limit: EXPORT_MAX_ROWS }),
    )
    rawRows = result.rows
  }
  if (rawRows.length === 0) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'No obligations matched this export.',
    })
  }
  const rows = rawRows.map((row) => toRow(row, { hideDollars, hideSmartPriorityFactors }))
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'obligations_export',
    entityId: rows[0]?.id ?? 'empty',
    action: 'obligations.exported',
    after: {
      format: input.format,
      scope: input.scope,
      rowCount: rows.length,
      clientCount: new Set(rows.map((row) => row.clientId)).size,
    },
  })

  if (input.format === 'csv') {
    return {
      fileName: `obligations-${dateInTimezone(tenant.timezone)}.csv`,
      contentType: 'text/csv',
      contentBase64: base64Text(rowsToCsv(rows)),
      auditId,
    }
  }
  if (input.format === 'ics') {
    return {
      fileName: `obligations-${dateInTimezone(tenant.timezone)}.ics`,
      contentType: 'text/calendar',
      contentBase64: base64Text(rowsToIcs(rows, new Date())),
      auditId,
    }
  }

  const rowsByClient = new Map<string, { clientName: string; rows: ObligationQueueRow[] }>()
  for (const row of rows) {
    const bucket = rowsByClient.get(row.clientId) ?? { clientName: row.clientName, rows: [] }
    bucket.rows.push(row)
    rowsByClient.set(row.clientId, bucket)
  }
  const files = Object.fromEntries(
    await Promise.all(
      Array.from(rowsByClient, async ([clientId, { clientName, rows: clientRows }]) => {
        const safeName = clientName.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') || 'client'
        return [
          `${safeName}-${clientId.slice(0, 8)}.pdf`,
          await buildClientPdf(clientName, clientRows),
        ] as const
      }),
    ),
  )
  const zip = zipSync(files, { level: 6 })
  return {
    fileName: `obligations-pdfs-${dateInTimezone(tenant.timezone)}.zip`,
    contentType: 'application/zip',
    contentBase64: base64Bytes(zip),
    auditId,
  }
})

export const obligationQueueHandlers = {
  list,
  getDetail,
  facets,
  listSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView,
  exportSelected,
}
