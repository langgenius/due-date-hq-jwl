import { ORPCError } from '@orpc/server'
import type {
  AiInsightSection,
  ClientClassificationReason,
  ClientFilingProfileInput,
} from '@duedatehq/contracts'
import { ErrorCodes } from '@duedatehq/contracts'
import { inferTaxTypes } from '@duedatehq/core/default-matrix'
import { planClientLimit, type BillingPlan } from '@duedatehq/core/plan-entitlements'
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
import { listActiveCoreRules } from '../rules'
import { generateObligationsForClientList } from '../rules/_obligation-generation'
import { runClassificationRecompute } from './_classification-recompute'
import {
  SAMPLE_CLIENTS,
  buildSampleFilingProfile,
  buildSampleObligations,
  toSampleClientInput,
} from './_sample-data'
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

/**
 * Default-matrix tax types for a bare-state filing profile — the same
 * intake inference migration commit uses (see _commit-plan buildProfileFacts),
 * so a manually created client matches the same active rules as the identical
 * imported client. Drops the bare `federal` placeholder and `_state_*`
 * pseudo-codes: non-forms with no canonical return (same filter as the
 * classification recompute).
 */
function inferredProfileTaxTypes(input: {
  entityType: Parameters<typeof inferTaxTypes>[0]
  state: string
  taxClassification?: NonNullable<Parameters<typeof inferTaxTypes>[2]>['taxClassification']
}): string[] {
  return inferTaxTypes(input.entityType, input.state, {
    taxClassification: input.taxClassification ?? null,
  }).taxTypes.filter((taxType) => taxType !== 'federal' && !taxType.startsWith('_'))
}

function buildFilingProfileRows(
  clientId: string,
  input: {
    state?: string | null | undefined
    county?: string | null | undefined
    migrationBatchId?: string | null | undefined
    filingProfiles?: ClientFilingProfileInput[] | undefined
    entityType: Parameters<typeof inferTaxTypes>[0]
    taxClassification?: NonNullable<Parameters<typeof inferTaxTypes>[2]>['taxClassification']
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
              // Bare-state quick create carries no tax types, and rule
              // generation matches on profile tax types — without this
              // inference the client would never be covered by any rule
              // (imported clients get the same matrix inference at commit).
              taxTypes: inferredProfileTaxTypes({
                entityType: input.entityType,
                state: input.state,
                taxClassification: input.taxClassification ?? null,
              }),
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

/**
 * Forward-only client cap. Blocks NEW manual client creation once the firm is
 * at its plan's clientLimit; never touches existing clients (they keep full
 * monitoring & alerts). Bulk import (createBatch) is intentionally exempt — it
 * may overflow and surface a true-up prompt instead. Mirrors the seat gate.
 */
async function assertClientCapacity(
  plan: BillingPlan,
  clients: Pick<ClientsRepo, 'countActiveClients'>,
): Promise<void> {
  const limit = planClientLimit(plan)
  if (limit === null) return
  const active = await clients.countActiveClients()
  if (active >= limit) {
    throw new ORPCError('FORBIDDEN', { message: ErrorCodes.CLIENT_LIMIT })
  }
}

/**
 * Rule-coverage cascade. Accept-time generation only covers clients that
 * exist when a rule is accepted; clients created or re-scoped afterwards
 * silently missed the "active rules keep you covered" promise. After any
 * client write that can change rule applicability (create, jurisdiction,
 * filing profiles), apply the firm's ACTIVE rules to the affected clients
 * through the same generation kernel + dedup keys the accept path uses
 * (the seen-set is seeded from existing DB rows, so re-running never
 * double-generates). Cascade-created deadlines land exactly as accept-time
 * generation would have landed them: `pending`, or `review` when the rule
 * requires CPA confirmation.
 *
 * Best-effort by design: the client rows are already committed when this
 * runs, so a generation failure logs and returns 0 instead of failing the
 * client write and stranding a half-created client.
 */
async function applyActiveRulesToClients(input: {
  scoped: ReturnType<typeof requireTenant>['scoped']
  tenant: { internalDeadlineOffsetDays: number; monitoringStartDate: string }
  userId: string
  // The generation kernel's own client type (ports ClientRow) — repo reads
  // hand these back directly, so forward the kernel's expectation instead of
  // re-declaring it against the serializer-local row shape.
  clients: Parameters<typeof generateObligationsForClientList>[0]['clients']
  /** Client action recorded as after.reason on the obligation.batch_created audit row. */
  trigger:
    | 'client.created'
    | 'client.batch_created'
    | 'client.jurisdiction.updated'
    | 'client.filing_profiles.replaced'
}): Promise<number> {
  try {
    if (input.clients.length === 0) return 0
    const rules = await listActiveCoreRules(input.scoped)
    if (rules.length === 0) return 0
    const generated = await generateObligationsForClientList({
      scoped: input.scoped,
      userId: input.userId,
      clients: input.clients,
      rules,
      internalDeadlineOffsetDays: input.tenant.internalDeadlineOffsetDays,
      monitoringStartDate: input.tenant.monitoringStartDate,
      auditReason: input.trigger,
      reason: 'Generated from active practice rules after a client change.',
    })
    if (generated.createdObligationIds.length > 0) {
      // Same staleness fix as acceptTemplateRule: approved pulses'
      // matchedCount is point-in-time and nothing recomputes it on
      // obligation creation. Best-effort — never fails the cascade.
      try {
        await input.scoped.pulse.refreshMatchedCountsForObligations(generated.createdObligationIds)
      } catch (err) {
        console.error('[clients] cascade pulse matchedCount recompute failed', {
          firmId: input.scoped.pulse.firmId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
    return generated.createdCount
  } catch (err) {
    console.error('[clients] active-rule cascade failed', {
      trigger: input.trigger,
      clientIds: input.clients.map((client) => client.id),
      error: err instanceof Error ? err.message : String(err),
    })
    return 0
  }
}

const create = os.clients.create.handler(async ({ input, context }) => {
  const { members, tenant, userId } = await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  await assertClientCapacity(tenant.plan, scoped.clients)
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

  await applyActiveRulesToClients({
    scoped,
    tenant,
    userId,
    clients: [row],
    trigger: 'client.created',
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

  await applyActiveRulesToClients({
    scoped,
    tenant,
    userId,
    // Serializer-local rows mark archivedAt optional (fixture convenience);
    // the kernel's ports row requires it — normalize instead of asserting.
    clients: rows.map((row) => ({ ...row, archivedAt: row.archivedAt ?? null })),
    trigger: 'client.batch_created',
  })

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
  const rows = await scoped.clients.listByFirm({
    ...(input?.limit ? { limit: input.limit } : {}),
    // Omitted = active only (repo default 'exclude'); 'only' backs the
    // /clients Archived view; 'all' returns both.
    ...(input?.archived ? { archived: input.archived } : {}),
  })
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
            // replaceForClient archives every prior profile, so carry the
            // curated tax types forward when the state is unchanged; a NEW
            // state gets the same default-matrix inference as intake —
            // without tax types the state change could never generate the
            // deadlines the rule library promises.
            taxTypes:
              beforeProfiles.find((profile) => profile.state === input.state?.trim().toUpperCase())
                ?.taxTypes ??
              inferredProfileTaxTypes({
                entityType: before.entityType,
                state: input.state,
                taxClassification: before.taxClassification,
              }),
            isPrimary: true,
            source: 'manual',
          },
        ]
      : [],
  )
  const [after, afterProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Updated client could not be re-read.',
    })
  }
  const recalculatedObligationCount = await applyActiveRulesToClients({
    scoped,
    tenant,
    userId,
    clients: [after],
    trigger: 'client.jurisdiction.updated',
  })

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
    const after = await scoped.clients.findById(input.id)
    if (!after) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Updated client could not be re-read.',
      })
    }
    // Newly added states/tax types may now match active rules — generate
    // their deadlines so the profile editor's promise is kept. Removals are
    // deliberately NOT auto-deleted here; deadline removal stays an explicit
    // reviewed action (see classification recompute).
    const recalculatedObligationCount = await applyActiveRulesToClients({
      scoped,
      tenant,
      userId,
      clients: [after],
      trigger: 'client.filing_profiles.replaced',
    })

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

function reclassificationReasonText(reason: ClientClassificationReason): string {
  const parts: string[] = [reason.kind === 'correction' ? 'Correction' : 'Reclassification']
  if (reason.event) parts.push(reason.event)
  if (reason.note) parts.push(reason.note)
  return parts.join(' — ')
}

// Read-only impact preview for a tax-classification change: which existing
// deadlines will be removed, and which current-tax-year removals need
// confirmation. No writes.
const previewClassificationRecompute = os.clients.previewClassificationRecompute.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
    const { scoped, userId } = requireTenant(context)
    const client = await scoped.clients.findById(input.clientId)
    if (!client) {
      throw new ORPCError('NOT_FOUND', {
        message: `Client ${input.clientId} not found in current firm.`,
      })
    }
    const outcome = await runClassificationRecompute({
      scoped,
      userId,
      client,
      candidate: input.candidate,
      now: new Date(),
      mode: 'preview',
      ...(input.effectiveFromTaxYear !== undefined
        ? { effectiveFromTaxYear: input.effectiveFromTaxYear }
        : {}),
    })
    return {
      summary: outcome.summary,
      rows: outcome.rows,
      expectedTaxTypes: outcome.expectedTaxTypes,
      existingDeadlineCount: outcome.existingDeadlineCount,
    }
  },
)

// Atomic classification write + deadline cleanup. Writes the new
// classification, supersedes all active deadlines that existed before apply,
// and audits the change. It never auto-creates replacement deadlines. This is
// the only classification write path — there is no field-only update, so a
// client can never be left with stale obligations.
const applyClassificationRecompute = os.clients.applyClassificationRecompute.handler(
  async ({ input, context }) => {
    await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
    const { scoped, tenant, userId } = requireTenant(context)
    const client = await scoped.clients.findById(input.clientId)
    if (!client) {
      throw new ORPCError('NOT_FOUND', {
        message: `Client ${input.clientId} not found in current firm.`,
      })
    }
    const outcome = await runClassificationRecompute({
      scoped,
      userId,
      client,
      candidate: input.candidate,
      now: new Date(),
      mode: 'apply',
      reason: reclassificationReasonText(input.reason),
      ...(input.effectiveFromTaxYear !== undefined
        ? { effectiveFromTaxYear: input.effectiveFromTaxYear }
        : {}),
      ...(input.confirmedOrphanObligationIds
        ? { confirmedOrphanObligationIds: input.confirmedOrphanObligationIds }
        : {}),
    })
    if (!outcome.auditId) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Reclassification did not produce an audit id.',
      })
    }

    await Promise.all([
      enqueueDashboardBriefRefresh(context.env, {
        firmId: tenant.firmId,
        reason: 'client_facts_change',
      }).catch(() => false),
      enqueueAiInsightRefresh(context.env, {
        firmId: tenant.firmId,
        kind: 'client_risk_summary',
        subjectId: input.clientId,
        reason: 'client_classification_update',
      }).catch(() => false),
    ])

    const [after, afterProfiles] = await Promise.all([
      scoped.clients.findById(input.clientId),
      scoped.filingProfiles.listByClient(input.clientId),
    ])
    if (!after) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Updated client could not be re-read.',
      })
    }
    const hideDollars = await shouldHideDollars(context)
    return {
      client: toClientPublic(after, { hideDollars, filingProfiles: afterProfiles }),
      addedCount: outcome.addedObligationIds.length,
      supersededCount: outcome.supersededObligationIds.length,
      recalculatedObligationCount:
        outcome.addedObligationIds.length + outcome.supersededObligationIds.length,
      auditId: outcome.auditId,
    }
  },
)

// 2026-06-01 (Yuqi /clients/[id] critique — IA): single-purpose
// notes write. The slide-in Notes panel that replaces the in-tab
// read-only Notes block needs a clean mutation. Single field,
// single action — keeps the audit log readable for `client.notes`
// drilldowns and prevents the audit drawer from showing irrelevant
// SourceDetails diffs when only Notes changed.
const updateNotes = os.clients.updateNotes.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.clients.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.id} not found in current firm.`,
    })
  }

  // Trim whitespace so callers can blank Notes by sending '   ' →
  // null. Empty strings become null too so the read side renders
  // the EmptyState consistently.
  const normalizedNotes =
    typeof input.notes === 'string' && input.notes.trim().length > 0 ? input.notes : null

  // Short-circuit when no change so we don't write a no-op audit
  // event. Compare both null-string equivalence.
  if (normalizedNotes === before.notes) {
    const filingProfiles = await scoped.filingProfiles.listByClient(input.id)
    const hideDollars = await shouldHideDollars(context)
    return {
      client: toClientPublic(before, { hideDollars, filingProfiles }),
      auditId: '' as string,
    }
  }

  await scoped.clients.updateNotes(input.id, normalizedNotes)
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
    action: 'client.notes.updated',
    before: { notes: before.notes },
    after: { notes: after.notes },
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  })

  // Notes are coordinator-authored context for the next preparer;
  // they don't feed the dashboard brief or the AI risk summary, so
  // no downstream refresh enqueue. If we ever pipe Notes into the
  // AI summary's "context" channel, add the enqueue here.
  void tenant

  const hideDollars = await shouldHideDollars(context)
  return {
    client: toClientPublic(after, { hideDollars, filingProfiles }),
    auditId,
  }
})

// Rename a client — the one core identity field with no UI edit path before.
// Mirrors updateNotes: role-gated, no-op short-circuit, audit-logged.
// (Originally shipped 2026-06-30 on claude/polish-wave-3 as part of the
// capability-gap P1 batch; that branch never merged, so this restores it.)
const rename = os.clients.rename.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped, userId } = requireTenant(context)
  const before = await scoped.clients.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.id} not found in current firm.`,
    })
  }
  const nextName = input.name.trim()
  const hideDollars = await shouldHideDollars(context)
  if (nextName === before.name) {
    const filingProfiles = await scoped.filingProfiles.listByClient(input.id)
    return {
      client: toClientPublic(before, { hideDollars, filingProfiles }),
      auditId: '' as string,
    }
  }
  await scoped.clients.updateName(input.id, nextName)
  const [after, filingProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Renamed client could not be re-read.',
    })
  }
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'client',
    entityId: input.id,
    action: 'client.name.updated',
    before: { name: before.name },
    after: { name: after.name },
  })
  return {
    client: toClientPublic(after, { hideDollars, filingProfiles }),
    auditId,
  }
})

// Archive — the reversible client lifecycle write. Role-gated like delete,
// idempotent (archiving an archived client is a no-op with auditId ''), and
// blocked for deleted rows (findById already filters those). The repo write
// plus the query guards added alongside it make the dialog copy true: the
// client drops out of the directory, deadline queue, Today, calendar feeds,
// reminder emails, and the plan's client count; its deadline rows and
// statuses are untouched and everything returns on restore.
const archive = os.clients.archive.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.clients.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.id} not found in current firm.`,
    })
  }
  const hideDollars = await shouldHideDollars(context)
  if (before.archivedAt) {
    const filingProfiles = await scoped.filingProfiles.listByClient(input.id)
    return {
      client: toClientPublic(before, { hideDollars, filingProfiles }),
      auditId: '' as string,
    }
  }
  await scoped.clients.archive(input.id)
  const [after, filingProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Archived client could not be re-read.',
    })
  }
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'client',
    entityId: input.id,
    action: 'client.archived',
    before: { name: before.name, archivedAt: null },
    after: { archivedAt: after.archivedAt?.toISOString() ?? null },
  })
  // Dashboard brief counts active clients/deadlines — refresh so it doesn't
  // keep quoting the archived client's numbers.
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'client_facts_change',
  }).catch(() => false)
  return {
    client: toClientPublic(after, { hideDollars, filingProfiles }),
    auditId,
  }
})

// Restore — clears archivedAt and returns the client (and its deadlines) to
// every active surface. Mirrors archive: role-gated, idempotent, audited.
const restore = os.clients.restore.handler(async ({ input, context }) => {
  await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped, tenant, userId } = requireTenant(context)
  const before = await scoped.clients.findById(input.id)
  if (!before) {
    throw new ORPCError('NOT_FOUND', {
      message: `Client ${input.id} not found in current firm.`,
    })
  }
  const hideDollars = await shouldHideDollars(context)
  if (!before.archivedAt) {
    const filingProfiles = await scoped.filingProfiles.listByClient(input.id)
    return {
      client: toClientPublic(before, { hideDollars, filingProfiles }),
      auditId: '' as string,
    }
  }
  await scoped.clients.restore(input.id)
  const [after, filingProfiles] = await Promise.all([
    scoped.clients.findById(input.id),
    scoped.filingProfiles.listByClient(input.id),
  ])
  if (!after) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Restored client could not be re-read.',
    })
  }
  const { id: auditId } = await scoped.audit.write({
    actorId: userId,
    entityType: 'client',
    entityId: input.id,
    action: 'client.restored',
    before: { name: before.name, archivedAt: before.archivedAt.toISOString() },
    after: { archivedAt: null },
  })
  await enqueueDashboardBriefRefresh(context.env, {
    firmId: tenant.firmId,
    reason: 'client_facts_change',
  }).catch(() => false)
  return {
    client: toClientPublic(after, { hideDollars, filingProfiles }),
    auditId,
  }
})

type ClientHistoryScope = ReturnType<typeof requireTenant>['scoped']

// Compact, drift-free humanization of an audit action key, e.g.
// 'obligation.extension.decided' -> 'Extension decided'.
function humanizeAuditAction(action: string): string {
  const tail = action.split('.').slice(1).join(' ').replace(/[._]/g, ' ').trim() || action
  return tail.charAt(0).toUpperCase() + tail.slice(1)
}

// Data-driven activity recap for the client History tab summary, used
// whenever there is no ready AI insight yet (or no Practice AI). Instead of
// a static "summary is pending" placeholder it surfaces the latest recorded
// changes plus where the record stands, straight from the audit log — so the
// panel always reads as real information, never filler.
async function clientHistoryFallback(
  scoped: ClientHistoryScope,
  client: ClientRow,
): Promise<AiInsightSection[]> {
  const obligations = await scoped.obligations.listByClient(client.id)
  const clientEvents = (
    await scoped.audit.list({ entityType: 'client', entityId: client.id, range: 'all', limit: 5 })
  ).rows
  const obligationEventRows = await Promise.all(
    obligations.slice(0, 3).map((obligation) =>
      scoped.audit
        .list({
          entityType: 'obligation_instance',
          entityId: obligation.id,
          range: 'all',
          limit: 3,
        })
        .then((result) => result.rows),
    ),
  )
  const events = [...clientEvents, ...obligationEventRows.flat()]
    .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3)

  const recapText =
    events.length > 0
      ? `Latest: ${events
          .map(
            (event) =>
              `${humanizeAuditAction(event.action)} (${event.createdAt.toISOString().slice(0, 10)})`,
          )
          .join('; ')}.`
      : 'No recorded changes in the recent activity window.'

  // The recap is prose a CPA reads — "Entity: c_corp" leaks the enum.
  const ENTITY_PROSE: Record<string, string> = {
    c_corp: 'C corporation',
    s_corp: 'S corporation',
    partnership: 'Partnership',
    llc: 'LLC',
    sole_prop: 'Sole proprietorship',
    individual: 'Individual',
    trust: 'Trust',
    nonprofit: 'Nonprofit',
  }
  const entity = client.entityType
    ? (ENTITY_PROSE[client.entityType] ?? client.entityType.replace(/_/g, ' '))
    : 'Unclassified'
  const lateCount = client.lateFilingCountLast12mo ?? 0
  const lateNote =
    lateCount > 0
      ? `, ${lateCount} late filing${lateCount === 1 ? '' : 's'} in the last 12 months`
      : ''
  const standingText = `${entity}${lateNote}. See the activity log below for the full record.`

  return [
    { key: 'recap', label: 'Recent activity', text: recapText, citationRefs: [] },
    { key: 'standing', label: 'Where it stands', text: standingText, citationRefs: [] },
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
    sections: insight?.output ? [] : await clientHistoryFallback(scoped, client),
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
        sections: insight?.output ? [] : await clientHistoryFallback(scoped, client),
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

const usage = os.clients.usage.handler(async ({ context }) => {
  const { scoped, tenant } = requireTenant(context)
  return {
    activeClients: await scoped.clients.countActiveClients(),
    clientLimit: planClientLimit(tenant.plan),
  }
})

// Onboarding "Load sample data": seed a few labeled (isSample) clients with
// filing profiles + believable deadlines so a fresh firm isn't empty. Sample
// clients are excluded from clientLimit and removable in one click. Idempotent.
const seedSample = os.clients.seedSample.handler(async ({ context }) => {
  const { userId } = await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped } = requireTenant(context)

  const existing = await scoped.clients.listSampleClients()
  let ids: string[]
  if (existing.length > 0) {
    ids = existing.map((c) => c.id)
  } else {
    const now = new Date()
    const created = await scoped.clients.createBatch(SAMPLE_CLIENTS.map(toSampleClientInput))
    ids = created.ids
    await scoped.filingProfiles.createBatch(
      SAMPLE_CLIENTS.map((spec, index) => buildSampleFilingProfile(spec, ids[index]!)),
    )
    const obligations = SAMPLE_CLIENTS.flatMap((spec, index) =>
      buildSampleObligations(spec, ids[index]!, now),
    )
    if (obligations.length > 0) {
      await scoped.obligations.createBatch(obligations)
    }
    await scoped.audit.write({
      actorId: userId,
      entityType: 'client_batch',
      entityId: ids[0] ?? 'sample',
      action: 'client.sample_seeded',
      after: { count: ids.length },
    })
  }

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

// One-click "Remove sample data": hard-delete sample clients (cascades to
// their obligations / filing profiles). Never touches real clients.
const removeSample = os.clients.removeSample.handler(async ({ context }) => {
  const { userId } = await requireCurrentFirmRole(context, CLIENT_WRITE_ROLES)
  const { scoped } = requireTenant(context)
  const deletedCount = await scoped.clients.deleteSampleClients()
  if (deletedCount > 0) {
    await scoped.audit.write({
      actorId: userId,
      entityType: 'client_batch',
      entityId: 'sample',
      action: 'client.sample_removed',
      after: { count: deletedCount },
    })
  }
  return { deletedCount }
})

export const clientsHandlers = {
  create,
  createBatch,
  get,
  usage,
  seedSample,
  removeSample,
  listByFirm,
  updateJurisdiction,
  updateTaxYearProfile,
  replaceFilingProfiles,
  updatePenaltyInputs,
  updateRiskProfile,
  updateSourceDetails,
  previewClassificationRecompute,
  applyClassificationRecompute,
  updateNotes,
  rename,
  archive,
  restore,
  getRiskSummary,
  requestRiskSummaryRefresh,
  bulkUpdateAssignee,
  delete: deleteClient,
}
