import { ORPCError } from '@orpc/server'
import type { ClientFilingProfileInput } from '@duedatehq/contracts'
import type {
  ClientFilingProfileInput as ClientFilingProfileRepoInput,
  ClientFilingProfileReplaceInput as ClientFilingProfileRepoReplaceInput,
} from '@duedatehq/ports/client-filing-profiles'
import type { ClientsRepo } from '@duedatehq/ports/clients'
import type { MembersRepo } from '@duedatehq/ports/tenants'
import { requireTenant } from '../_context'
import { CLIENT_WRITE_ROLES, requireCurrentFirmRole } from '../_permissions'
import { requirePracticeAiWorkflow } from '../_plan-gates'
import { os } from '../_root'
import { dateInTimezone, toAiInsightPublic } from '../_ai-insights'
import { enqueueAiInsightRefresh } from '../../jobs/ai-insights/enqueue'
import { enqueueDashboardBriefRefresh } from '../../jobs/dashboard-brief/enqueue'
import {
  toClientPublic,
  type ClientCreateInputForRepo,
  type ClientFilingProfileRow,
  type ClientRow,
} from './_serializers'

/**
 * clients.* — Demo Sprint subset of the Client Domain Contract.
 *
 * Authority:
 *   - packages/contracts/src/clients.ts (frozen contract)
 *   - docs/product-design/migration-copilot/01-mvp-and-journeys.md (Step 4 commit consumer)
 *   - docs/dev-file/06 §4.1 (procedures call scoped repo only)
 *
 * Scope (Day 3): unblock Migration Step 4 commit so JHX Day 4 can flip the
 * `Import & Generate` CTA on without touching contracts again. We expose
 * create / createBatch / get / listByFirm. Obligations mutation paths
 * (status workflow / due_date update) belong to LYZ Day 3 and stay stub.
 */

export async function rereadCreatedClientBatch(
  clients: Pick<ClientsRepo, 'findManyByIds'>,
  ids: string[],
): Promise<ClientRow[]> {
  const rows = await clients.findManyByIds(ids)
  if (rows.length !== ids.length) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Created client batch could not be re-read.',
    })
  }
  return rows
}

export async function deleteClientRecord(input: {
  clients: Pick<ClientsRepo, 'findById' | 'softDelete'>
  audit: {
    write(event: {
      actorId: string
      entityType: string
      entityId: string
      action: string
      before?: unknown
      after?: unknown
      reason?: string
    }): Promise<{ id: string }>
  }
  clientId: string
  actorId: string
  deletedAt?: Date
}): Promise<{ auditId: string }> {
  const before = await input.clients.findById(input.clientId)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.clientId} not found in current firm.`,
    })
  }

  const deletedAt = input.deletedAt ?? new Date()
  await input.clients.softDelete(input.clientId)
  const { id: auditId } = await input.audit.write({
    actorId: input.actorId,
    entityType: 'client',
    entityId: input.clientId,
    action: 'client.deleted',
    before: {
      id: before.id,
      name: before.name,
      email: before.email,
      ein: before.ein,
      state: before.state,
      county: before.county,
      entityType: before.entityType,
      assigneeId: before.assigneeId,
      assigneeName: before.assigneeName,
      migrationBatchId: before.migrationBatchId,
    },
    after: {
      deletedAt: deletedAt.toISOString(),
    },
  })

  return { auditId }
}

async function shouldHideDollars(context: Parameters<typeof requireTenant>[0]): Promise<boolean> {
  const { members } = context.vars
  const { tenant, userId } = requireTenant(context)
  if (tenant.coordinatorCanSeeDollars || !members) return false
  const actor = await members.findMembership(tenant.firmId, userId)
  return actor?.role === 'coordinator'
}

function nullableText(value: string | null | undefined): string | null {
  const next = value?.trim() ?? ''
  return next ? next : null
}

function normalizeStringList(values: readonly string[] | undefined): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)),
  )
}

function buildFilingProfileRows(
  clientId: string,
  input: {
    state?: string | null | undefined
    county?: string | null | undefined
    migrationBatchId?: string | null | undefined
    filingProfiles?: ClientFilingProfileInput[] | undefined
  },
): ClientFilingProfileRepoInput[] {
  const explicit = input.filingProfiles ?? []
  const profileInputs =
    explicit.length > 0
      ? explicit
      : input.state
        ? [
            {
              state: input.state,
              counties: input.county ? [input.county] : [],
              isPrimary: true,
            },
          ]
        : []

  const byState = new Map<string, ClientFilingProfileRepoInput>()
  for (const profile of profileInputs) {
    const state = profile.state.trim().toUpperCase()
    const current = byState.get(state)
    byState.set(state, {
      clientId,
      state,
      counties: normalizeStringList([...(current?.counties ?? []), ...(profile.counties ?? [])]),
      taxTypes: normalizeStringList([...(current?.taxTypes ?? []), ...(profile.taxTypes ?? [])]),
      isPrimary: Boolean(current?.isPrimary || profile.isPrimary),
      source: profile.source ?? current?.source ?? 'manual',
      migrationBatchId:
        profile.migrationBatchId ?? current?.migrationBatchId ?? input.migrationBatchId ?? null,
    })
  }

  const rows = [...byState.values()]
  const primaryIndex = rows.findIndex((row) => row.isPrimary)
  const fallbackPrimary = primaryIndex >= 0 ? primaryIndex : 0
  return rows.map((row, index) => Object.assign(row, { isPrimary: index === fallbackPrimary }))
}

function buildReplacementProfiles(
  profiles: ClientFilingProfileInput[],
): ClientFilingProfileRepoReplaceInput[] {
  return profiles.map((profile) => ({
    state: profile.state,
    counties: normalizeStringList(profile.counties),
    taxTypes: normalizeStringList(profile.taxTypes),
    isPrimary: profile.isPrimary ?? false,
    source: profile.source ?? 'manual',
    migrationBatchId: profile.migrationBatchId ?? null,
  }))
}

function filingProfilesByClientId(
  rows: Map<string, ClientFilingProfileRow[]>,
  clientId: string,
): ClientFilingProfileRow[] {
  return rows.get(clientId) ?? []
}

async function resolveClientAssignees(
  members: MembersRepo,
  firmId: string,
  inputs: Array<{
    assigneeId?: string | null | undefined
    assigneeName?: string | null | undefined
  }>,
): Promise<Array<{ assigneeId: string | null; assigneeName: string | null }>> {
  const hasAssigneeIds = inputs.some((input) => nullableText(input.assigneeId))
  if (!hasAssigneeIds) {
    return inputs.map((input) => ({
      assigneeId: null,
      assigneeName: nullableText(input.assigneeName),
    }))
  }

  const activeMembersByUserId = new Map(
    (await members.listMembers(firmId))
      .filter((member) => member.status === 'active')
      .map((member) => [member.userId, member]),
  )

  return inputs.map((input) => {
    const assigneeId = nullableText(input.assigneeId)
    if (!assigneeId) {
      return {
        assigneeId: null,
        assigneeName: nullableText(input.assigneeName),
      }
    }

    const member = activeMembersByUserId.get(assigneeId)
    if (!member) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Selected owner must be an active team member.',
      })
    }

    return {
      assigneeId: member.userId,
      assigneeName: member.name,
    }
  })
}

const create = os.clients.create.handler(async ({ input, context }) => {
  const { members, tenant, userId } = await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  const [assignee] = await resolveClientAssignees(members, tenant.firmId, [input])
  const repoInput: ClientCreateInputForRepo = {
    name: input.name,
    ein: input.ein ?? null,
    state: input.state ?? null,
    county: input.county ?? null,
    entityType: input.entityType,
    legalEntity: input.legalEntity ?? null,
    taxClassification: input.taxClassification ?? 'unknown',
    taxYearType: input.taxYearType ?? 'calendar',
    fiscalYearEndMonth: input.fiscalYearEndMonth ?? null,
    fiscalYearEndDay: input.fiscalYearEndDay ?? null,
    ownerCount: input.ownerCount ?? null,
    hasForeignAccounts: input.hasForeignAccounts ?? false,
    hasPayroll: input.hasPayroll ?? false,
    hasSalesTax: input.hasSalesTax ?? false,
    has1099Vendors: input.has1099Vendors ?? false,
    hasK1Activity: input.hasK1Activity ?? false,
    primaryContactName: input.primaryContactName ?? null,
    primaryContactEmail: input.primaryContactEmail ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    assigneeId: assignee?.assigneeId ?? null,
    assigneeName: assignee?.assigneeName ?? null,
    importanceWeight: input.importanceWeight ?? 2,
    lateFilingCountLast12mo: input.lateFilingCountLast12mo ?? 0,
    estimatedTaxLiabilityCents: input.estimatedTaxLiabilityCents ?? null,
    estimatedTaxLiabilitySource: input.estimatedTaxLiabilitySource ?? null,
    equityOwnerCount: input.equityOwnerCount ?? null,
    migrationBatchId: input.migrationBatchId ?? null,
  }

  const { id } = await scoped.clients.create(repoInput)
  const filingProfileInputs = buildFilingProfileRows(id, input)
  if (filingProfileInputs.length > 0) {
    await scoped.filingProfiles.createBatch(filingProfileInputs)
  }
  const [row, filingProfiles] = await Promise.all([
    scoped.clients.findById(id),
    scoped.filingProfiles.listByClient(id),
  ])
  if (!row) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Created client could not be re-read.',
    })
  }

  await scoped.audit.write({
    actorId: userId,
    entityType: 'client',
    entityId: id,
    action: 'client.created',
  })

  return toClientPublic(row, { filingProfiles })
})

const createBatch = os.clients.createBatch.handler(async ({ input, context }) => {
  const { members, tenant, userId } = await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  const assignees = await resolveClientAssignees(members, tenant.firmId, input.clients)

  const repoInputs: ClientCreateInputForRepo[] = input.clients.map((c, index) => ({
    name: c.name,
    ein: c.ein ?? null,
    state: c.state ?? null,
    county: c.county ?? null,
    entityType: c.entityType,
    legalEntity: c.legalEntity ?? null,
    taxClassification: c.taxClassification ?? 'unknown',
    taxYearType: c.taxYearType ?? 'calendar',
    fiscalYearEndMonth: c.fiscalYearEndMonth ?? null,
    fiscalYearEndDay: c.fiscalYearEndDay ?? null,
    ownerCount: c.ownerCount ?? null,
    hasForeignAccounts: c.hasForeignAccounts ?? false,
    hasPayroll: c.hasPayroll ?? false,
    hasSalesTax: c.hasSalesTax ?? false,
    has1099Vendors: c.has1099Vendors ?? false,
    hasK1Activity: c.hasK1Activity ?? false,
    primaryContactName: c.primaryContactName ?? null,
    primaryContactEmail: c.primaryContactEmail ?? null,
    email: c.email ?? null,
    notes: c.notes ?? null,
    assigneeId: assignees[index]?.assigneeId ?? null,
    assigneeName: assignees[index]?.assigneeName ?? null,
    importanceWeight: c.importanceWeight ?? 2,
    lateFilingCountLast12mo: c.lateFilingCountLast12mo ?? 0,
    estimatedTaxLiabilityCents: c.estimatedTaxLiabilityCents ?? null,
    estimatedTaxLiabilitySource: c.estimatedTaxLiabilitySource ?? null,
    equityOwnerCount: c.equityOwnerCount ?? null,
    migrationBatchId: c.migrationBatchId ?? null,
  }))

  const { ids } = await scoped.clients.createBatch(repoInputs)
  const filingProfileInputs = ids.flatMap((id, index) =>
    buildFilingProfileRows(id, input.clients[index]!),
  )
  if (filingProfileInputs.length > 0) {
    await scoped.filingProfiles.createBatch(filingProfileInputs)
  }

  // Single aggregated audit row to keep the audit feed readable; per-row
  // evidence_link write is the caller's job (Migration Step 4 commit).
  await scoped.audit.write({
    actorId: userId,
    entityType: 'client_batch',
    entityId: ids[0] ?? 'empty',
    action: 'client.batch_created',
    after: { count: ids.length },
  })

  const [rows, profilesByClient] = await Promise.all([
    rereadCreatedClientBatch(scoped.clients, ids),
    scoped.filingProfiles.listByClients(ids),
  ])

  return {
    clients: rows.map((row) =>
      toClientPublic(row, { filingProfiles: filingProfilesByClientId(profilesByClient, row.id) }),
    ),
  }
})

const get = os.clients.get.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  const [row, filingProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  const hideDollars = await shouldHideDollars(context)
  return row ? toClientPublic(row, { hideDollars, filingProfiles }) : null
})

const listByFirm = os.clients.listByFirm.handler(async ({ input, context }) => {
  const { scoped } = requireTenant(context)
  const rows = await scoped.clients.listByFirm(input?.limit ? { limit: input.limit } : {})
  const profilesByClient = await scoped.filingProfiles.listByClients(rows.map((row) => row.id))
  const hideDollars = await shouldHideDollars(context)
  return rows.map((row) =>
    toClientPublic(row, {
      hideDollars,
      filingProfiles: filingProfilesByClientId(profilesByClient, row.id),
    }),
  )
})

const updateJurisdiction = os.clients.updateJurisdiction.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.clients.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.id} not found in current firm.`,
    })
  }
  const beforeProfiles = await scoped.filingProfiles.listByClient(input.id)

  await scoped.filingProfiles.replaceForClient(
    input.id,
    input.state
      ? [
          {
            state: input.state,
            counties: input.county ? [input.county] : [],
            isPrimary: true,
            source: 'manual',
          },
        ]
      : [],
  )
  const recalculatedObligationCount = 0
  const [after, afterProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated client could not be re-read.',
    })
  }

  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'client',
    entityId: input.id,
    action: 'client.jurisdiction.updated',
    before: {
      state: before.state,
      county: before.county,
      filingProfiles: beforeProfiles.map((profile) => ({
        id: profile.id,
        state: profile.state,
        counties: profile.counties,
        taxTypes: profile.taxTypes,
        isPrimary: profile.isPrimary,
      })),
    },
    after: {
      state: after.state,
      county: after.county,
      filingProfiles: afterProfiles.map((profile) => ({
        id: profile.id,
        state: profile.state,
        counties: profile.counties,
        taxTypes: profile.taxTypes,
        isPrimary: profile.isPrimary,
      })),
      recalculatedObligationCount,
    },
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  })

  await Promise.all([
    enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'client_facts_change',
    }).catch(() => false),
    enqueueAiInsightRefresh(context.env, {
      firmId: tenant.firmId,
      kind: 'client_risk_summary',
      subjectId: input.id,
      reason: 'client_jurisdiction_update',
    }).catch(() => false),
  ])

  const hideDollars = await shouldHideDollars(context)
  return {
    client: toClientPublic(after, { hideDollars, filingProfiles: afterProfiles }),
    recalculatedObligationCount,
    auditId,
  }
})

const replaceFilingProfiles = os.clients.replaceFilingProfiles.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    const before = await scoped.clients.findById(input.id)
    if (!before) {
      throw new ORPCError('NOT_FOUND', {
        message: `Client ${input.id} not found in current firm.`,
      })
    }

    const beforeProfiles = await scoped.filingProfiles.listByClient(input.id)
    const afterProfiles = await scoped.filingProfiles.replaceForClient(
      input.id,
      buildReplacementProfiles(input.profiles),
    )
    const recalculatedObligationCount = 0
    const after = await scoped.clients.findById(input.id)
    if (!after) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Updated client could not be re-read.',
      })
    }

    const { id: auditId } = await scoped.audit.write({
      actorId: userId,
      entityType: 'client',
      entityId: input.id,
      action: 'client.filing_profiles.replaced',
      before: {
        filingProfiles: beforeProfiles.map((profile) => ({
          id: profile.id,
          state: profile.state,
          counties: profile.counties,
          taxTypes: profile.taxTypes,
          isPrimary: profile.isPrimary,
        })),
      },
      after: {
        state: after.state,
        county: after.county,
        filingProfiles: afterProfiles.map((profile) => ({
          id: profile.id,
          state: profile.state,
          counties: profile.counties,
          taxTypes: profile.taxTypes,
          isPrimary: profile.isPrimary,
        })),
        recalculatedObligationCount,
      },
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
    })

    await Promise.all([
      enqueueDashboardBriefRefresh(context.env, {
        firmId: tenant.firmId,
        reason: 'client_facts_change',
      }).catch(() => false),
      enqueueAiInsightRefresh(context.env, {
        firmId: tenant.firmId,
        kind: 'client_risk_summary',
        subjectId: input.id,
        reason: 'client_jurisdiction_update',
      }).catch(() => false),
    ])

    const hideDollars = await shouldHideDollars(context)
    return {
      client: toClientPublic(after, { hideDollars, filingProfiles: afterProfiles }),
      recalculatedObligationCount,
      auditId,
    }
  },
)

const updateTaxYearProfile = os.clients.updateTaxYearProfile.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.clients.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.id} not found in current firm.`,
    })
  }

  const nextFiscalYearEndMonth = input.taxYearType === 'fiscal' ? input.fiscalYearEndMonth : null
  const nextFiscalYearEndDay = input.taxYearType === 'fiscal' ? input.fiscalYearEndDay : null
  await scoped.clients.updateTaxYearProfile(input.id, {
    taxYearType: input.taxYearType,
    fiscalYearEndMonth: nextFiscalYearEndMonth,
    fiscalYearEndDay: nextFiscalYearEndDay,
  })
  const recalculatedObligationCount = 0
  const [after, afterProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated client could not be re-read.',
    })
  }

  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'client',
    entityId: input.id,
    action: 'client.tax_year_profile.updated',
    before: {
      taxYearType: before.taxYearType,
      fiscalYearEndMonth: before.fiscalYearEndMonth,
      fiscalYearEndDay: before.fiscalYearEndDay,
    },
    after: {
      taxYearType: after.taxYearType,
      fiscalYearEndMonth: after.fiscalYearEndMonth,
      fiscalYearEndDay: after.fiscalYearEndDay,
      recalculatedObligationCount,
    },
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  })

  await Promise.all([
    enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'client_facts_change',
    }).catch(() => false),
    enqueueAiInsightRefresh(context.env, {
      firmId: tenant.firmId,
      kind: 'client_risk_summary',
      subjectId: input.id,
      reason: 'client_tax_year_profile_update',
    }).catch(() => false),
  ])

  const hideDollars = await shouldHideDollars(context)
  return {
    client: toClientPublic(after, { hideDollars, filingProfiles: afterProfiles }),
    recalculatedObligationCount,
    auditId,
  }
})

const updatePenaltyInputs = os.clients.updatePenaltyInputs.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.clients.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.id} not found in current firm.`,
    })
  }

  await scoped.clients.updatePenaltyInputs(input.id, {
    ...(input.estimatedTaxLiabilityCents !== undefined
      ? {
          estimatedTaxLiabilityCents: input.estimatedTaxLiabilityCents,
          estimatedTaxLiabilitySource:
            input.estimatedTaxLiabilityCents === null ? null : ('manual' as const),
        }
      : {}),
    ...(input.equityOwnerCount !== undefined ? { equityOwnerCount: input.equityOwnerCount } : {}),
  })
  const recalculatedObligationCount = 0
  const [after, filingProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated client could not be re-read.',
    })
  }

  const auditEvent: Parameters<typeof scoped.audit.write>[0] = {
    actorId: userId,
    entityType: 'client',
    entityId: input.id,
    action: 'penalty.override',
    before: {
      estimatedTaxLiabilityCents: before.estimatedTaxLiabilityCents,
      equityOwnerCount: before.equityOwnerCount,
    },
    after: {
      estimatedTaxLiabilityCents: after.estimatedTaxLiabilityCents,
      equityOwnerCount: after.equityOwnerCount,
    },
  }
  if (input.reason !== undefined) auditEvent.reason = input.reason
  await scoped.audit.write(auditEvent)

  const obligations = await scoped.obligations.listByClient(input.id)
  await scoped.evidence.writeBatch(
    obligations.map((obligation) => ({
      obligationInstanceId: obligation.id,
      sourceType: 'penalty_override',
      sourceId: input.id,
      rawValue: JSON.stringify({
        estimatedTaxLiabilityCents: before.estimatedTaxLiabilityCents,
        equityOwnerCount: before.equityOwnerCount,
      }),
      normalizedValue: JSON.stringify({
        estimatedTaxLiabilityCents: after.estimatedTaxLiabilityCents,
        equityOwnerCount: after.equityOwnerCount,
      }),
      confidence: 1,
      appliedBy: userId,
    })),
  )

  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'penalty_override',
  }).catch(() => false)

  const hideDollars = await shouldHideDollars(context)
  return {
    client: toClientPublic(after, { hideDollars, filingProfiles }),
    recalculatedObligationCount,
  }
})

const updateRiskProfile = os.clients.updateRiskProfile.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.clients.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.id} not found in current firm.`,
    })
  }

  await scoped.clients.updateRiskProfile(input.id, {
    ...(input.importanceWeight !== undefined ? { importanceWeight: input.importanceWeight } : {}),
    ...(input.lateFilingCountLast12mo !== undefined
      ? { lateFilingCountLast12mo: input.lateFilingCountLast12mo }
      : {}),
  })
  const [after, filingProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated client could not be re-read.',
    })
  }

  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'client',
    entityId: input.id,
    action: 'client.risk_profile.updated',
    before: {
      importanceWeight: before.importanceWeight,
      lateFilingCountLast12mo: before.lateFilingCountLast12mo,
    },
    after: {
      importanceWeight: after.importanceWeight,
      lateFilingCountLast12mo: after.lateFilingCountLast12mo,
    },
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  })

  await Promise.all([
    enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'client_facts_change',
    }).catch(() => false),
    enqueueAiInsightRefresh(context.env, {
      firmId: tenant.firmId,
      kind: 'client_risk_summary',
      subjectId: input.id,
      reason: 'client_risk_profile_update',
    }).catch(() => false),
  ])

  const hideDollars = await shouldHideDollars(context)
  return {
    client: toClientPublic(after, { hideDollars, filingProfiles }),
    auditId,
  }
})

const updateSourceDetails = os.clients.updateSourceDetails.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.clients.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.id} not found in current firm.`,
    })
  }

  await scoped.clients.updateSourceDetails(input.id, {
    ...(input.externalClientId !== undefined ? { externalClientId: input.externalClientId } : {}),
    ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
    ...(input.primaryPhone !== undefined ? { primaryPhone: input.primaryPhone } : {}),
    ...(input.sourceStatus !== undefined ? { sourceStatus: input.sourceStatus } : {}),
  })
  const [after, filingProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated client could not be re-read.',
    })
  }

  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'client',
    entityId: input.id,
    action: 'client.source_details.updated',
    before: {
      externalClientId: before.externalClientId,
      addressLine1: before.addressLine1,
      city: before.city,
      postalCode: before.postalCode,
      primaryPhone: before.primaryPhone,
      sourceStatus: before.sourceStatus,
    },
    after: {
      externalClientId: after.externalClientId,
      addressLine1: after.addressLine1,
      city: after.city,
      postalCode: after.postalCode,
      primaryPhone: after.primaryPhone,
      sourceStatus: after.sourceStatus,
    },
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  })

  await Promise.all([
    enqueueDashboardBriefRefresh(context.env, {
      firmId: tenant.firmId,
      reason: 'client_facts_change',
    }).catch(() => false),
    enqueueAiInsightRefresh(context.env, {
      firmId: tenant.firmId,
      kind: 'client_risk_summary',
      subjectId: input.id,
      reason: 'client_source_details_update',
    }).catch(() => false),
  ])

  const hideDollars = await shouldHideDollars(context)
  return {
    client: toClientPublic(after, { hideDollars, filingProfiles }),
    auditId,
  }
})

function clientRiskFallback() {
  return [
    {
      key: 'risk',
      label: 'Risk',
      text: 'Cached risk summary is pending. Review the deterministic risk inputs and open deadlines meanwhile.',
      citationRefs: [],
    },
    {
      key: 'drivers',
      label: 'Drivers',
      text: 'Smart Priority uses urgency, client importance, late filing history, and readiness signals.',
      citationRefs: [],
    },
    {
      key: 'next_step',
      label: 'Next step',
      text: 'Request a refresh after updating risk inputs.',
      citationRefs: [],
    },
  ]
}

const getRiskSummary = os.clients.getRiskSummary.handler(async ({ input, context }) => {
  const { scoped, tenant } = requireTenant(context)
  const client = await scoped.clients.findById(input.clientId)
  if (!client) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.clientId} not found in current firm.`,
    })
  }
  const asOfDate = dateInTimezone(tenant.timezone)
  const insight = await scoped.aiInsights.findLatest({
    kind: 'client_risk_summary',
    subjectType: 'client',
    subjectId: input.clientId,
    asOfDate,
  })
  return toAiInsightPublic(insight, {
    kind: 'client_risk_summary',
    subjectId: input.clientId,
    sections: clientRiskFallback(),
  })
})

const requestRiskSummaryRefresh = os.clients.requestRiskSummaryRefresh.handler(
  async ({ input, context }) => {
    const { scoped, tenant } = requireTenant(context)
    requirePracticeAiWorkflow(tenant.plan)
    const client = await scoped.clients.findById(input.clientId)
    if (!client) {
      throw new ORPCError('NOT_FOUND', {
        message: `Client ${input.clientId} not found in current firm.`,
      })
    }
    const asOfDate = dateInTimezone(tenant.timezone)
    const queued = await enqueueAiInsightRefresh(context.env, {
      firmId: tenant.firmId,
      kind: 'client_risk_summary',
      subjectId: input.clientId,
      asOfDate,
      reason: 'manual_refresh',
    })
    const insight = await scoped.aiInsights.findLatest({
      kind: 'client_risk_summary',
      subjectType: 'client',
      subjectId: input.clientId,
      asOfDate,
    })
    return {
      queued,
      insight: toAiInsightPublic(insight, {
        kind: 'client_risk_summary',
        subjectId: input.clientId,
        sections: clientRiskFallback(),
      }),
    }
  },
)

const bulkUpdateAssignee = os.clients.bulkUpdateAssignee.handler(async ({ input, context }) => {
  const { members, tenant, userId } = await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  const clientIds = [...new Set(input.clientIds)]
  const beforeRows = await scoped.clients.findManyByIds(clientIds)
  if (beforeRows.length !== clientIds.length) {
    throw new ORPCError('NOT_FOUND', {
      message: 'One or more selected clients were not found in the current firm.',
    })
  }

  const [assignee] = await resolveClientAssignees(members, tenant.firmId, [
    { assigneeId: input.assigneeId },
  ])
  const nextAssignee = {
    assigneeId: assignee?.assigneeId ?? null,
    assigneeName: assignee?.assigneeName ?? null,
  }

  await scoped.clients.updateAssigneeMany(clientIds, nextAssignee)
  const afterRows = await scoped.clients.findManyByIds(clientIds)
  const auditEvent: Parameters<typeof scoped.audit.write>[0] = {
    actorId: userId,
    entityType: 'client_batch',
    entityId: clientIds[0] ?? 'empty',
    action: 'client.assignee.updated',
    before: {
      clients: beforeRows.map((row) => ({
        id: row.id,
        assigneeId: row.assigneeId,
        assigneeName: row.assigneeName,
      })),
    },
    after: {
      count: afterRows.length,
      assigneeId: nextAssignee.assigneeId,
      assigneeName: nextAssignee.assigneeName,
      clientIds,
    },
  }
  if (input.reason !== undefined) auditEvent.reason = input.reason
  const { id: auditId } = await scoped.audit.write(auditEvent)

  return {
    updatedCount: afterRows.length,
    auditId,
  }
})

const deleteClient = os.clients.delete.handler(async ({ input, context }) => {
  const { userId } = await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  const { auditId } = await deleteClientRecord({
    clients: scoped.clients,
    audit: scoped.audit,
    clientId: input.id,
    actorId: userId,
  })

  return { deleted: true as const, auditId }
})

export const clientsHandlers = {
  create,
  createBatch,
  get,
  listByFirm,
  updateJurisdiction,
  updateTaxYearProfile,
  replaceFilingProfiles,
  updatePenaltyInputs,
  updateRiskProfile,
  updateSourceDetails,
  getRiskSummary,
  requestRiskSummaryRefresh,
  bulkUpdateAssignee,
  delete: deleteClient,
}
