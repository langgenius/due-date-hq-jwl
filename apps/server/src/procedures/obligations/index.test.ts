import { call } from '@orpc/server'
import { describe, expect, it, vi } from 'vitest'
import { ObligationRuleSchema, type ObligationRule } from '@duedatehq/contracts'
import { findRuleById } from '@duedatehq/core/rules'
import type { ClientFilingProfileRow } from '@duedatehq/ports/client-filing-profiles'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ObligationCreateInput, ObligationInstanceRow } from '@duedatehq/ports/obligations'
import type { PracticeRuleRow } from '@duedatehq/ports/rules'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import type { MemberRow, MembersRepo } from '@duedatehq/ports/tenants'
import type { Env } from '../../env'
import type { RpcContext } from '../_context'
import { toPracticeContractRule } from '../rules/runtime'
import { obligationsHandlers } from './index'

const FIRM_ID = 'firm_create_from_rule'
const USER_ID = 'user_create_from_rule'
const CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const PROFILE_ID = '33333333-3333-4333-8333-333333333333'
const CREATED_OBLIGATION_IDS = [
  '44444444-4444-4444-8444-444444444441',
  '44444444-4444-4444-8444-444444444442',
  '44444444-4444-4444-8444-444444444443',
]

function makeClient(overrides: Partial<ClientRow> = {}): ClientRow {
  const now = new Date('2026-05-24T00:00:00.000Z')
  return {
    id: CLIENT_ID,
    firmId: FIRM_ID,
    name: 'Summit Events LLC',
    ein: null,
    state: 'NY',
    county: null,
    entityType: 's_corp',
    legalEntity: null,
    taxClassification: 's_corp',
    taxYearType: 'calendar',
    fiscalYearEndMonth: null,
    fiscalYearEndDay: null,
    email: null,
    notes: null,
    externalClientId: null,
    addressLine1: null,
    city: null,
    postalCode: null,
    primaryPhone: null,
    sourceStatus: null,
    assigneeId: null,
    assigneeName: null,
    ownerCount: null,
    hasForeignAccounts: false,
    hasPayroll: false,
    hasSalesTax: false,
    has1099Vendors: false,
    hasK1Activity: false,
    primaryContactName: null,
    primaryContactEmail: null,
    importanceWeight: 2,
    lateFilingCountLast12mo: 0,
    estimatedTaxLiabilityCents: 125_000,
    estimatedTaxLiabilitySource: 'manual',
    equityOwnerCount: 2,
    migrationBatchId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function makeProfile(overrides: Partial<ClientFilingProfileRow> = {}): ClientFilingProfileRow {
  const now = new Date('2026-05-24T00:00:00.000Z')
  return {
    id: PROFILE_ID,
    firmId: FIRM_ID,
    clientId: CLIENT_ID,
    state: 'NY',
    counties: [],
    taxTypes: ['federal_7004'],
    isPrimary: true,
    source: 'manual',
    migrationBatchId: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makePracticeRule(ruleId: string): PracticeRuleRow {
  const rule = findRuleById(ruleId)
  if (!rule) throw new Error(`Missing test rule ${ruleId}`)
  const now = new Date('2026-05-24T00:00:00.000Z')
  return {
    id: '55555555-5555-4555-8555-555555555555',
    firmId: FIRM_ID,
    ruleId,
    templateId: ruleId,
    templateVersion: rule.version,
    status: 'active',
    ruleJson: toPracticeContractRule(rule, 'active'),
    reviewNote: null,
    reviewedBy: USER_ID,
    reviewedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

function withPrimaryEvidenceAiOutput(rule: ObligationRule, aiOutputId: string): ObligationRule {
  const primaryEvidence = rule.evidence[0]
  if (!primaryEvidence) throw new Error(`Rule ${rule.id} has no primary evidence`)
  const evidence = [...rule.evidence]
  evidence[0] = Object.assign({}, primaryEvidence, { aiOutputId })
  return { ...rule, evidence }
}

function rowFromInput(input: ObligationCreateInput, id: string): ObligationInstanceRow {
  const now = new Date('2026-05-24T00:00:00.000Z')
  return {
    id,
    firmId: FIRM_ID,
    clientId: input.clientId,
    clientFilingProfileId: input.clientFilingProfileId ?? null,
    taxType: input.taxType,
    taxYear: input.taxYear ?? null,
    taxYearType: input.taxYearType ?? 'calendar',
    fiscalYearEndMonth: input.fiscalYearEndMonth ?? null,
    fiscalYearEndDay: input.fiscalYearEndDay ?? null,
    taxPeriodStart: input.taxPeriodStart ?? null,
    taxPeriodEnd: input.taxPeriodEnd ?? null,
    taxPeriodKind: input.taxPeriodKind ?? 'unknown',
    taxPeriodSource: input.taxPeriodSource ?? 'unknown',
    taxPeriodReviewReason: input.taxPeriodReviewReason ?? null,
    ruleId: input.ruleId ?? null,
    ruleVersion: input.ruleVersion ?? null,
    rulePeriod: input.rulePeriod ?? null,
    generationSource: input.generationSource ?? null,
    jurisdiction: input.jurisdiction ?? null,
    obligationType: input.obligationType ?? 'filing',
    formName: input.formName ?? null,
    authority: input.authority ?? null,
    filingDueDate: input.filingDueDate ?? null,
    paymentDueDate: input.paymentDueDate ?? null,
    sourceEvidenceJson: input.sourceEvidenceJson ?? null,
    recurrence: input.recurrence ?? 'once',
    riskLevel: input.riskLevel ?? 'low',
    baseDueDate: input.baseDueDate,
    currentDueDate: input.currentDueDate ?? input.baseDueDate,
    status: input.status ?? 'pending',
    blockedByObligationInstanceId: null,
    readiness: 'ready',
    extensionDecision: 'not_considered',
    extensionMemo: null,
    extensionSource: null,
    extensionExpectedDueDate: null,
    extensionDecidedAt: null,
    extensionDecidedByUserId: null,
    extensionState: input.extensionState ?? 'not_started',
    extensionFormName: input.extensionFormName ?? null,
    extensionFiledAt: null,
    extensionAcceptedAt: null,
    prepStage: input.prepStage ?? 'not_started',
    reviewStage: input.reviewStage ?? 'not_required',
    reviewerUserId: null,
    reviewCompletedAt: null,
    paymentState: input.paymentState ?? 'not_applicable',
    paymentConfirmedAt: null,
    efileState: input.efileState ?? 'not_applicable',
    efileAuthorizationForm: input.efileAuthorizationForm ?? null,
    efileSubmittedAt: null,
    efileAcceptedAt: null,
    efileRejectedAt: null,
    migrationBatchId: input.migrationBatchId ?? null,
    estimatedTaxDueCents: input.estimatedTaxDueCents ?? null,
    estimatedExposureCents: input.estimatedExposureCents ?? null,
    exposureStatus: input.exposureStatus ?? 'needs_input',
    penaltyFactsJson: input.penaltyFactsJson ?? null,
    penaltyFactsVersion: input.penaltyFactsVersion ?? null,
    penaltyBreakdownJson: input.penaltyBreakdownJson ?? [],
    penaltyFormulaVersion: input.penaltyFormulaVersion ?? null,
    missingPenaltyFactsJson: input.missingPenaltyFactsJson ?? [],
    penaltySourceRefsJson: input.penaltySourceRefsJson ?? [],
    penaltyFormulaLabel: input.penaltyFormulaLabel ?? null,
    exposureCalculatedAt: input.exposureCalculatedAt ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

function makeContext(input: {
  client?: ClientRow | null
  profiles?: ClientFilingProfileRow[]
  duplicates?: ObligationInstanceRow[]
  practiceRule?: PracticeRuleRow | null
  practiceRules?: PracticeRuleRow[]
}) {
  const rows: ObligationInstanceRow[] = []
  const createdInputs: ObligationCreateInput[] = []
  const createBatch = vi.fn(async (inputs: ObligationCreateInput[]) => {
    createdInputs.push(...inputs)
    const ids = inputs.map(
      (_, index) => CREATED_OBLIGATION_IDS[index] ?? 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    )
    rows.push(...inputs.map((row, index) => rowFromInput(row, ids[index] ?? ids[0]!)))
    return { ids }
  })
  const writeEvidenceBatch = vi.fn(
    async (evidenceRows: Parameters<ScopedRepo['evidence']['writeBatch']>[0]) => ({
      ids: evidenceRows.map((_, index) => `66666666-6666-4666-8666-66666666666${index + 1}`),
    }),
  )
  const writeAudit = vi.fn(async (_event: Parameters<ScopedRepo['audit']['write']>[0]) => ({
    id: '77777777-7777-4777-8777-777777777777',
  }))
  const reconcileDocumentChecklistItems = vi.fn(
    async (_input: Parameters<ScopedRepo['readiness']['reconcileDocumentChecklistItems']>[0]) => [],
  )

  const client = input.client === undefined ? makeClient() : input.client
  const profiles = input.profiles ?? [makeProfile()]
  const practiceRules =
    input.practiceRules ??
    (input.practiceRule !== undefined && input.practiceRule !== null ? [input.practiceRule] : [])
  const clients: ScopedRepo['clients'] = {
    firmId: FIRM_ID,
    create: null!,
    createBatch: null!,
    findById: vi.fn(async () => client ?? undefined),
    findManyByIds: null!,
    listByFirm: null!,
    listByBatch: null!,
    updatePenaltyInputs: null!,
    updateJurisdiction: null!,
    updateRiskProfile: null!,
    updateSourceDetails: null!,
    updateTaxYearProfile: null!,
    updateAssigneeMany: null!,
    softDelete: null!,
    deleteByBatch: null!,
  }
  const filingProfiles: ScopedRepo['filingProfiles'] = {
    firmId: FIRM_ID,
    createBatch: null!,
    listByClient: null!,
    listByClients: vi.fn(async () => new Map([[CLIENT_ID, profiles]])),
    replaceForClient: null!,
    deleteByBatch: null!,
  }
  const rules: ScopedRepo['rules'] = {
    firmId: FIRM_ID,
    upsertGlobalTemplates: null!,
    listPracticeRules: null!,
    listActivePracticeRules: null!,
    getPracticeRule: vi.fn(
      async (ruleId: string) => practiceRules.find((rule) => rule.ruleId === ruleId) ?? null,
    ),
    upsertPracticeRule: null!,
    ensureReviewTasks: null!,
    listReviewTasks: null!,
    getReviewTask: null!,
    decideReviewTask: null!,
    listDecisions: null!,
    listVerified: null!,
    listTemporaryRules: null!,
    getDecision: null!,
    upsertDecision: null!,
  }
  const obligations: ScopedRepo['obligations'] = {
    firmId: FIRM_ID,
    createBatch,
    findById: null!,
    findManyByIds: null!,
    listByClient: vi.fn(async () => rows),
    listByBatch: null!,
    listAnnualRolloverSeeds: null!,
    listGeneratedByClientAndTaxYears: vi.fn(async () => input.duplicates ?? []),
    updateDueDate: null!,
    updateTaxYearProfile: null!,
    updateExposure: null!,
    updateStatus: null!,
    updateExtensionDecision: null!,
    updateStatusMany: null!,
    setEfileRejected: null!,
    setBlockedBy: null!,
    setPrepStage: null!,
    setReviewStage: null!,
    unblockChildrenOf: null!,
    deleteByBatch: null!,
  }
  const evidence: ScopedRepo['evidence'] = {
    firmId: FIRM_ID,
    write: null!,
    writeBatch: writeEvidenceBatch,
    listByObligation: null!,
  }
  const audit: ScopedRepo['audit'] = {
    firmId: FIRM_ID,
    write: writeAudit,
    writeBatch: null!,
    listByFirm: null!,
    list: null!,
  }
  const readiness: ScopedRepo['readiness'] = {
    firmId: FIRM_ID,
    listDocumentChecklistByObligation: null!,
    createDocumentChecklistItems: null!,
    reconcileDocumentChecklistItems,
    updateDocumentChecklistItem: null!,
    deleteDocumentChecklistItem: null!,
    listByObligation: null!,
    createRequest: null!,
    getRequest: null!,
    markOpened: null!,
    revokeRequest: null!,
    submitResponses: null!,
    syncDocumentChecklistFromResponses: null!,
  }
  const scoped: ScopedRepo = {
    firmId: FIRM_ID,
    ai: null!,
    aiInsights: null!,
    calendar: null!,
    filingProfiles,
    clients,
    dashboard: null!,
    obligations,
    obligationQueue: null!,
    workload: null!,
    pulse: null!,
    readiness,
    rules,
    migration: null!,
    evidence,
    audit,
  }
  const env: Env = {
    DB: null!,
    CACHE: null!,
    RATE_LIMIT: null!,
    R2_PDF: null!,
    R2_MIGRATION: null!,
    R2_AUDIT: null!,
    R2_PULSE: null!,
    VECTORS: null!,
    EMAIL_QUEUE: null!,
    PULSE_QUEUE: null!,
    DASHBOARD_QUEUE: null!,
    AUDIT_QUEUE: null!,
    ASSETS: null!,
    AUTH_SECRET: '01234567890123456789012345678901',
    AUTH_URL: 'https://app.test',
    APP_URL: 'https://app.test',
    ENV: 'development',
    EMAIL_FROM: 'DueDateHQ <noreply@app.test>',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    AI_GATEWAY_ACCOUNT_ID: 'test-account',
    AI_GATEWAY_SLUG: 'test-gateway',
    AI_GATEWAY_API_KEY: 'test-key',
    AI_GATEWAY_PROVIDER: 'test-provider',
    AI_GATEWAY_PROVIDER_API_KEY: 'test-provider-key',
    AI_GATEWAY_MODEL_FAST_JSON: 'test-fast-json',
    AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING: 'test-fast-json-solo-onboarding',
    AI_GATEWAY_MODEL_FAST_JSON_SOLO: 'test-fast-json-solo',
    AI_GATEWAY_MODEL_FAST_JSON_PAID: 'test-fast-json-paid',
    AI_GATEWAY_MODEL_QUALITY_JSON: 'test-quality-json',
    AI_GATEWAY_MODEL_REASONING: 'test-reasoning',
    VAPID_PUBLIC_KEY: 'test-vapid-public',
    VAPID_PRIVATE_KEY: 'test-vapid-private',
    VAPID_SUBJECT: 'mailto:test@app.test',
    SENTRY_DSN: '',
    POSTHOG_KEY: '',
  }
  const member: MemberRow = {
    id: 'member_1',
    organizationId: FIRM_ID,
    userId: USER_ID,
    name: 'Owner',
    email: 'owner@example.com',
    image: null,
    role: 'owner',
    status: 'active',
    createdAt: new Date('2026-05-24T00:00:00.000Z'),
  }
  const findMembership: MembersRepo['findMembership'] = vi.fn(async () => member)
  const members: MembersRepo = {
    listMembers: null!,
    listInvitations: null!,
    findMembership,
    findMember: null!,
    findMemberByEmail: null!,
    findInvitation: null!,
    findPendingInvitationByEmail: null!,
    seatLimit: null!,
    seatUsage: null!,
    updateRole: null!,
    setMemberStatus: null!,
    writeAudit: null!,
  }

  const context: RpcContext = {
    env,
    request: new Request('https://app.test/rpc/obligations/createFromRule'),
    vars: {
      requestId: 'req_1',
      tenantContext: {
        firmId: FIRM_ID,
        timezone: 'America/New_York',
        plan: 'solo',
        seatLimit: 1,
        status: 'active',
        internalDeadlineOffsetDays: 14,
        ownerUserId: USER_ID,
        coordinatorCanSeeDollars: false,
      },
      userId: USER_ID,
      scoped,
      members,
    },
  }

  return {
    context,
    createdInputs,
    createBatch,
    writeEvidenceBatch,
    writeAudit,
    reconcileDocumentChecklistItems,
  }
}

describe('obligations.createFromRule', () => {
  it('creates rule-backed obligations with evidence and audit rows', async () => {
    const {
      context,
      createdInputs,
      writeEvidenceBatch,
      writeAudit,
      reconcileDocumentChecklistItems,
    } = makeContext({})

    const result = await call(
      obligationsHandlers.createFromRule,
      { clientId: CLIENT_ID, ruleId: 'fed.7004.extension.1120s.2025' },
      { context },
    )

    expect(result.duplicateCount).toBe(0)
    expect(result.obligations).toHaveLength(1)
    expect(createdInputs).toEqual([
      expect.objectContaining({
        clientId: CLIENT_ID,
        taxType: 'federal_7004',
        ruleId: 'fed.7004.extension.1120s.2025',
        generationSource: 'manual',
        baseDueDate: new Date('2026-03-16T00:00:00.000Z'),
        filingDueDate: new Date('2026-03-16T00:00:00.000Z'),
      }),
    ])
    expect(writeEvidenceBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        sourceType: 'verified_rule',
        sourceId: 'fed.7004.extension.1120s.2025',
        rawValue: 'federal_7004',
        normalizedValue: 'federal_7004',
      }),
    ])
    expect(reconcileDocumentChecklistItems).toHaveBeenCalledWith(
      expect.objectContaining({
        obligationInstanceId: CREATED_OBLIGATION_IDS[0],
        createdByUserId: USER_ID,
        template: expect.arrayContaining([
          expect.objectContaining({
            templateKey: '1120s.s_corporation_return.s_election',
          }),
        ]),
      }),
    )
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'obligation.batch_created',
        after: expect.objectContaining({
          reason: 'rules.manual_create',
          createdCount: 1,
          duplicateCount: 0,
        }),
      }),
    )
  })

  it('creates multiple selected rules in one manual batch', async () => {
    const { context, createdInputs, writeEvidenceBatch, writeAudit } = makeContext({
      practiceRules: [makePracticeRule('ny.ct3s.return.2025')],
    })

    const result = await call(
      obligationsHandlers.createFromRules,
      {
        clientId: CLIENT_ID,
        selections: [
          { ruleId: 'fed.7004.extension.1120s.2025' },
          { ruleId: 'ny.ct3s.return.2025' },
        ],
      },
      { context },
    )

    expect(result.duplicateCount).toBe(0)
    expect(result.obligations).toHaveLength(2)
    expect(createdInputs).toEqual([
      expect.objectContaining({
        clientId: CLIENT_ID,
        jurisdiction: 'FED',
        ruleId: 'fed.7004.extension.1120s.2025',
        formName: 'Form 7004',
      }),
      expect.objectContaining({
        clientId: CLIENT_ID,
        jurisdiction: 'NY',
        ruleId: 'ny.ct3s.return.2025',
        formName: 'Form CT-3-S',
      }),
    ])
    expect(writeEvidenceBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        sourceId: 'fed.7004.extension.1120s.2025',
        normalizedValue: 'federal_7004',
      }),
      expect.objectContaining({
        sourceId: 'ny.ct3s.return.2025',
        normalizedValue: 'ny_ct3s',
      }),
    ])
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'obligation.batch_created',
        after: expect.objectContaining({
          ruleIds: ['fed.7004.extension.1120s.2025', 'ny.ct3s.return.2025'],
          createdCount: 2,
        }),
      }),
    )
  })

  it('allows a state rule without an existing client filing profile', async () => {
    const { context, createdInputs } = makeContext({
      client: makeClient({ state: 'CA' }),
      profiles: [makeProfile({ state: 'CA' })],
      practiceRules: [makePracticeRule('ny.ct3s.return.2025')],
    })

    const result = await call(
      obligationsHandlers.createFromRules,
      {
        clientId: CLIENT_ID,
        selections: [{ ruleId: 'ny.ct3s.return.2025' }],
      },
      { context },
    )

    expect(result.duplicateCount).toBe(0)
    expect(result.obligations).toHaveLength(1)
    expect(createdInputs).toEqual([
      expect.objectContaining({
        clientId: CLIENT_ID,
        clientFilingProfileId: null,
        jurisdiction: 'NY',
        ruleId: 'ny.ct3s.return.2025',
        formName: 'Form CT-3-S',
      }),
    ])
  })

  it('honors a manually selected active rule even when the client entity differs', async () => {
    const { context, createdInputs } = makeContext({
      client: makeClient({ entityType: 'c_corp', taxClassification: 'c_corp', state: 'CA' }),
      profiles: [makeProfile({ state: 'CA' })],
    })

    const result = await call(
      obligationsHandlers.createFromRule,
      {
        clientId: CLIENT_ID,
        ruleId: 'fed.1040.return.2025',
      },
      { context },
    )

    expect(result.duplicateCount).toBe(0)
    expect(result.obligations).toHaveLength(1)
    expect(createdInputs).toEqual([
      expect.objectContaining({
        clientId: CLIENT_ID,
        jurisdiction: 'FED',
        taxType: 'federal_1040',
        ruleId: 'fed.1040.return.2025',
        formName: 'Form 1040',
        baseDueDate: new Date('2026-04-15T00:00:00.000Z'),
      }),
    ])
  })

  it('does not put concrete draft AI ids on manually created obligation evidence rows', async () => {
    const aiOutputId = '44444444-4444-4444-8444-444444444444'
    const practiceRule = makePracticeRule('fed.7004.extension.1120s.2025')
    const ruleJson = ObligationRuleSchema.parse(practiceRule.ruleJson)
    practiceRule.ruleJson = withPrimaryEvidenceAiOutput(ruleJson, aiOutputId)
    const { context, createdInputs, writeEvidenceBatch } = makeContext({ practiceRule })

    await call(
      obligationsHandlers.createFromRule,
      { clientId: CLIENT_ID, ruleId: 'fed.7004.extension.1120s.2025' },
      { context },
    )

    expect(createdInputs[0]?.sourceEvidenceJson).toEqual(
      expect.arrayContaining([expect.objectContaining({ aiOutputId })]),
    )
    expect(writeEvidenceBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        obligationInstanceId: CREATED_OBLIGATION_IDS[0],
        aiOutputId: null,
        sourceType: 'verified_rule',
      }),
    ])
  })

  it('skips duplicate selected-rule periods', async () => {
    const duplicate = rowFromInput(
      {
        clientId: CLIENT_ID,
        taxType: 'federal_7004',
        taxYear: 2025,
        ruleId: 'fed.7004.extension.1120s.2025',
        rulePeriod: 'tax_year',
        jurisdiction: 'FED',
        baseDueDate: new Date('2026-03-16T00:00:00.000Z'),
      },
      'existing_obligation',
    )
    const { context, createBatch } = makeContext({ duplicates: [duplicate] })

    const result = await call(
      obligationsHandlers.createFromRule,
      { clientId: CLIENT_ID, ruleId: 'fed.7004.extension.1120s.2025' },
      { context },
    )

    expect(result).toMatchObject({ obligations: [], duplicateCount: 1 })
    expect(createBatch).not.toHaveBeenCalled()
  })

  it('uses the selected tax year when a tax-year-driven rule is reused', async () => {
    const { context, createdInputs } = makeContext({})

    const result = await call(
      obligationsHandlers.createFromRule,
      {
        clientId: CLIENT_ID,
        ruleId: 'fed.7004.extension.1120s.2025',
        taxYear: 2026,
      },
      { context },
    )

    expect(result.duplicateCount).toBe(0)
    expect(createdInputs).toEqual([
      expect.objectContaining({
        taxYear: 2026,
        ruleId: 'fed.7004.extension.1120s.2025',
        baseDueDate: new Date('2027-03-15T00:00:00.000Z'),
        filingDueDate: new Date('2027-03-15T00:00:00.000Z'),
      }),
    ])
  })

  it('rejects source-defined rules before creating placeholder deadlines', async () => {
    const { context, createBatch } = makeContext({
      client: makeClient({ entityType: 'llc', taxClassification: 'partnership', state: 'CA' }),
      profiles: [makeProfile({ state: 'CA' })],
      practiceRule: makePracticeRule('ca.llc.568.return.2025'),
    })

    await expect(
      call(
        obligationsHandlers.createFromRule,
        { clientId: CLIENT_ID, ruleId: 'ca.llc.568.return.2025' },
        { context },
      ),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    expect(createBatch).not.toHaveBeenCalled()
  })
})
