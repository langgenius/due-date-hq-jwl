import { and, asc, count, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { OPEN_OBLIGATION_STATUSES } from '@duedatehq/core/obligation-workflow'
import { rankSmartPriorities, type SmartPriorityProfile } from '@duedatehq/core/priority'
import type {
  FirmSmartPriorityPreviewInput,
  FirmSmartPriorityPreviewOutput,
} from '@duedatehq/ports/tenants'
import { createAuditWriter, type AuditEventInput } from '../audit-writer'
import type { Db } from '../client'
import { evidenceLink } from '../schema/audit'
import { member, organization, session, subscription } from '../schema/auth'
import { client } from '../schema/clients'
import { firmProfile, type FirmProfile } from '../schema/firm'
import { obligationInstance, type ObligationStatus } from '../schema/obligations'
import { listActiveOverlayInternalDeadlines } from './overlay'
import { fromSmartPriorityProfile, toSmartPriorityProfile } from './priority-profile'

export type FirmRole = 'owner' | 'partner' | 'manager' | 'preparer' | 'coordinator'

export interface FirmMembershipRow {
  id: string
  name: string
  slug: string
  plan: FirmProfile['plan']
  seatLimit: number
  timezone: string
  internalDeadlineOffsetDays: number
  monitoringStartDate: string
  status: FirmProfile['status']
  role: FirmRole
  ownerUserId: string
  coordinatorCanSeeDollars: boolean
  smartPriorityProfile: SmartPriorityProfile
  openObligationCount: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface FirmUpdateInput {
  name: string
  timezone: string
  internalDeadlineOffsetDays: number
  monitoringStartDate?: string
  coordinatorCanSeeDollars?: boolean
  smartPriorityProfile?: SmartPriorityProfile
}

export interface FirmBillingSubscriptionRow {
  id: string
  plan: string
  referenceId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: string
  periodStart: Date | null
  periodEnd: Date | null
  trialStart: Date | null
  trialEnd: Date | null
  cancelAtPeriodEnd: boolean
  cancelAt: Date | null
  canceledAt: Date | null
  endedAt: Date | null
  seats: number | null
  billingInterval: string | null
  stripeScheduleId: string | null
  createdAt: Date
  updatedAt: Date
}

function normalizeRole(value: string): FirmRole {
  switch (value) {
    case 'owner':
    case 'manager':
    case 'preparer':
    case 'coordinator':
      return value
    default:
      return 'coordinator'
  }
}

function toMembershipRow(row: {
  id: string
  name: string
  slug: string
  plan: FirmProfile['plan']
  seatLimit: number
  timezone: string
  internalDeadlineOffsetDays: number
  monitoringStartDate: string
  status: FirmProfile['status']
  role: string
  ownerUserId: string
  coordinatorCanSeeDollars: boolean
  smartPriorityProfileJson: string | null
  openObligationCount?: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}): FirmMembershipRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    seatLimit: row.seatLimit,
    timezone: row.timezone,
    internalDeadlineOffsetDays: row.internalDeadlineOffsetDays,
    monitoringStartDate: row.monitoringStartDate,
    status: row.status,
    role: normalizeRole(row.role),
    ownerUserId: row.ownerUserId,
    coordinatorCanSeeDollars: row.coordinatorCanSeeDollars,
    smartPriorityProfile: toSmartPriorityProfile(row.smartPriorityProfileJson),
    openObligationCount: row.openObligationCount ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }
}

function baseFirmSelect(db: Db) {
  return db
    .select({
      id: firmProfile.id,
      name: firmProfile.name,
      slug: organization.slug,
      plan: firmProfile.plan,
      seatLimit: firmProfile.seatLimit,
      timezone: firmProfile.timezone,
      internalDeadlineOffsetDays: firmProfile.internalDeadlineOffsetDays,
      monitoringStartDate: firmProfile.monitoringStartDate,
      status: firmProfile.status,
      role: member.role,
      ownerUserId: firmProfile.ownerUserId,
      coordinatorCanSeeDollars: firmProfile.coordinatorCanSeeDollars,
      smartPriorityProfileJson: firmProfile.smartPriorityProfileJson,
      createdAt: firmProfile.createdAt,
      updatedAt: firmProfile.updatedAt,
      deletedAt: firmProfile.deletedAt,
    })
    .from(member)
    .innerJoin(firmProfile, eq(firmProfile.id, member.organizationId))
    .innerJoin(organization, eq(organization.id, firmProfile.id))
}

const PREVIEW_MAX_READ_ROWS = 1000
const PREVIEW_EVIDENCE_BATCH_SIZE = 90

function roundScoreDelta(value: number): number {
  return Math.round(value * 10) / 10
}

export function makeFirmsRepo(db: Db) {
  const audit = createAuditWriter(db)

  async function listEvidenceCounts(
    firmId: string,
    obligationIds: string[],
  ): Promise<Map<string, number>> {
    if (obligationIds.length === 0) return new Map()
    const reads = []
    for (let i = 0; i < obligationIds.length; i += PREVIEW_EVIDENCE_BATCH_SIZE) {
      const chunk = obligationIds.slice(i, i + PREVIEW_EVIDENCE_BATCH_SIZE)
      reads.push(
        db
          .select({
            obligationInstanceId: evidenceLink.obligationInstanceId,
          })
          .from(evidenceLink)
          .where(
            and(eq(evidenceLink.firmId, firmId), inArray(evidenceLink.obligationInstanceId, chunk)),
          ),
      )
    }
    const counts = new Map<string, number>()
    for (const row of (await Promise.all(reads)).flat()) {
      if (!row.obligationInstanceId) continue
      counts.set(row.obligationInstanceId, (counts.get(row.obligationInstanceId) ?? 0) + 1)
    }
    return counts
  }

  async function loadSmartPriorityProfile(firmId: string): Promise<SmartPriorityProfile> {
    const [row] = await db
      .select({ smartPriorityProfileJson: firmProfile.smartPriorityProfileJson })
      .from(firmProfile)
      .where(eq(firmProfile.id, firmId))
      .limit(1)
    return toSmartPriorityProfile(row?.smartPriorityProfileJson)
  }

  async function countOpenObligations(firmId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(obligationInstance)
      .innerJoin(
        client,
        and(
          eq(client.id, obligationInstance.clientId),
          eq(client.firmId, obligationInstance.firmId),
        ),
      )
      .where(
        and(
          eq(obligationInstance.firmId, firmId),
          isNull(client.deletedAt),
          inArray(obligationInstance.status, [
            ...OPEN_OBLIGATION_STATUSES,
          ] satisfies ObligationStatus[]),
        ),
      )
    return row?.value ?? 0
  }

  async function listOpenObligationCounts(firmIds: string[]): Promise<Map<string, number>> {
    if (firmIds.length === 0) return new Map()
    const rows = await db
      .select({ firmId: obligationInstance.firmId, value: count() })
      .from(obligationInstance)
      .innerJoin(
        client,
        and(
          eq(client.id, obligationInstance.clientId),
          eq(client.firmId, obligationInstance.firmId),
        ),
      )
      .where(
        and(
          inArray(obligationInstance.firmId, firmIds),
          isNull(client.deletedAt),
          inArray(obligationInstance.status, [
            ...OPEN_OBLIGATION_STATUSES,
          ] satisfies ObligationStatus[]),
        ),
      )
      .groupBy(obligationInstance.firmId)
    return new Map(rows.map((row) => [row.firmId, row.value]))
  }

  return {
    async listMine(userId: string): Promise<FirmMembershipRow[]> {
      const rows = await baseFirmSelect(db)
        .where(
          and(
            eq(member.userId, userId),
            eq(member.status, 'active'),
            ne(firmProfile.status, 'deleted'),
            isNull(firmProfile.deletedAt),
          ),
        )
        .orderBy(desc(firmProfile.updatedAt), asc(firmProfile.name))
      const counts = await listOpenObligationCounts(rows.map((row) => row.id))
      return rows.map((row) =>
        toMembershipRow({ ...row, openObligationCount: counts.get(row.id) ?? 0 }),
      )
    },

    async listOwnedActive(userId: string): Promise<FirmMembershipRow[]> {
      const rows = await baseFirmSelect(db)
        .where(
          and(
            eq(member.userId, userId),
            eq(member.status, 'active'),
            eq(firmProfile.ownerUserId, userId),
            eq(firmProfile.status, 'active'),
            isNull(firmProfile.deletedAt),
          ),
        )
        .orderBy(desc(firmProfile.updatedAt), asc(firmProfile.name))
      const counts = await listOpenObligationCounts(rows.map((row) => row.id))
      return rows.map((row) =>
        toMembershipRow({ ...row, openObligationCount: counts.get(row.id) ?? 0 }),
      )
    },

    async findActiveForUser(
      userId: string,
      firmId: string,
    ): Promise<FirmMembershipRow | undefined> {
      const rows = await baseFirmSelect(db)
        .where(
          and(
            eq(member.userId, userId),
            eq(member.organizationId, firmId),
            eq(member.status, 'active'),
            eq(firmProfile.status, 'active'),
            isNull(firmProfile.deletedAt),
          ),
        )
        .limit(1)
      if (!rows[0]) return undefined
      return toMembershipRow({
        ...rows[0],
        openObligationCount: await countOpenObligations(rows[0].id),
      })
    },

    async updateProfile(firmId: string, input: FirmUpdateInput): Promise<void> {
      const now = new Date()
      const patch: Partial<typeof firmProfile.$inferInsert> = {
        name: input.name,
        timezone: input.timezone,
        internalDeadlineOffsetDays: input.internalDeadlineOffsetDays,
        updatedAt: now,
      }
      if (input.monitoringStartDate !== undefined) {
        patch.monitoringStartDate = input.monitoringStartDate
      }
      if (input.coordinatorCanSeeDollars !== undefined) {
        patch.coordinatorCanSeeDollars = input.coordinatorCanSeeDollars
      }
      if (input.smartPriorityProfile !== undefined) {
        patch.smartPriorityProfileJson = fromSmartPriorityProfile(input.smartPriorityProfile)
      }
      await Promise.all([
        db.update(firmProfile).set(patch).where(eq(firmProfile.id, firmId)),
        db.update(organization).set({ name: input.name }).where(eq(organization.id, firmId)),
      ])
    },

    async applyInternalDeadlineOffset(firmId: string, offsetDays: number): Promise<number> {
      const [countRow] = await db
        .select({ value: count() })
        .from(obligationInstance)
        .where(eq(obligationInstance.firmId, firmId))
      await db
        .update(obligationInstance)
        .set({
          currentDueDate: sql<Date>`${obligationInstance.baseDueDate} - (${offsetDays} * 86400000)`,
          updatedAt: new Date(),
        })
        .where(eq(obligationInstance.firmId, firmId))
      return countRow?.value ?? 0
    },

    async previewSmartPriorityProfile(
      firmId: string,
      input: FirmSmartPriorityPreviewInput,
    ): Promise<FirmSmartPriorityPreviewOutput> {
      const currentProfile = await loadSmartPriorityProfile(firmId)
      const previewProfile = toSmartPriorityProfile(input.smartPriorityProfile)
      const rawRows = await db
        .select({
          obligationId: obligationInstance.id,
          clientName: client.name,
          taxType: obligationInstance.taxType,
          currentDueDate: obligationInstance.currentDueDate,
          status: obligationInstance.status,
          importanceWeight: client.importanceWeight,
          lateFilingCountLast12mo: client.lateFilingCountLast12mo,
        })
        .from(obligationInstance)
        .innerJoin(client, eq(obligationInstance.clientId, client.id))
        .where(
          and(
            eq(obligationInstance.firmId, firmId),
            eq(client.firmId, firmId),
            inArray(obligationInstance.status, [
              ...OPEN_OBLIGATION_STATUSES,
            ] satisfies ObligationStatus[]),
          ),
        )
        .orderBy(asc(obligationInstance.currentDueDate), asc(obligationInstance.id))
        .limit(PREVIEW_MAX_READ_ROWS)

      const obligationIds = rawRows.map((row) => row.obligationId)
      const [overlayDueDates, evidenceCounts] = await Promise.all([
        listActiveOverlayInternalDeadlines(db, firmId, obligationIds),
        listEvidenceCounts(firmId, obligationIds),
      ])
      const priorityInputs = rawRows.map((row) =>
        Object.assign({}, row, {
          obligationId: row.obligationId,
          currentDueDate: overlayDueDates.get(row.obligationId) ?? row.currentDueDate,
          asOfDate: input.asOfDate,
          importanceWeight: row.importanceWeight ?? 2,
          lateFilingCountLast12mo: row.lateFilingCountLast12mo ?? 0,
          evidenceCount: evidenceCounts.get(row.obligationId) ?? 0,
        }),
      )

      const currentById = new Map(
        rankSmartPriorities(priorityInputs, currentProfile).map(({ row, smartPriority }) => [
          row.obligationId,
          smartPriority,
        ]),
      )
      const previewRows = rankSmartPriorities(priorityInputs, previewProfile).slice(0, input.limit)

      return {
        asOfDate: input.asOfDate,
        rows: previewRows.map(({ row, smartPriority }) => {
          const current = currentById.get(row.obligationId)
          const currentRank = current?.rank ?? null
          const previewRank = smartPriority.rank!
          return {
            obligationId: row.obligationId,
            clientName: row.clientName,
            taxType: row.taxType,
            currentDueDate: row.currentDueDate,
            currentScore: current?.score ?? 0,
            previewScore: smartPriority.score,
            scoreDelta: roundScoreDelta(smartPriority.score - (current?.score ?? 0)),
            currentRank,
            previewRank,
            rankDelta: currentRank === null ? null : currentRank - previewRank,
          }
        }),
      }
    },

    async listBillingSubscriptions(firmId: string): Promise<FirmBillingSubscriptionRow[]> {
      return db
        .select({
          id: subscription.id,
          plan: subscription.plan,
          referenceId: subscription.referenceId,
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          status: subscription.status,
          periodStart: subscription.periodStart,
          periodEnd: subscription.periodEnd,
          trialStart: subscription.trialStart,
          trialEnd: subscription.trialEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          cancelAt: subscription.cancelAt,
          canceledAt: subscription.canceledAt,
          endedAt: subscription.endedAt,
          seats: subscription.seats,
          billingInterval: subscription.billingInterval,
          stripeScheduleId: subscription.stripeScheduleId,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        })
        .from(subscription)
        .where(eq(subscription.referenceId, firmId))
        .orderBy(desc(subscription.createdAt))
    },

    async softDelete(firmId: string): Promise<void> {
      const now = new Date()
      await db
        .update(firmProfile)
        .set({ status: 'deleted', deletedAt: now, updatedAt: now })
        .where(eq(firmProfile.id, firmId))
    },

    async setActiveSession(
      sessionId: string,
      userId: string,
      firmId: string | null,
    ): Promise<void> {
      await db
        .update(session)
        .set({ activeOrganizationId: firmId, updatedAt: new Date() })
        .where(and(eq(session.id, sessionId), eq(session.userId, userId)))
    },

    async writeAudit(event: AuditEventInput): Promise<{ id: string }> {
      return audit.write(event)
    },
  }
}

export type FirmsRepo = ReturnType<typeof makeFirmsRepo>
