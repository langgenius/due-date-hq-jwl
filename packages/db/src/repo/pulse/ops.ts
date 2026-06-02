import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../../client'
import { auditEvent, type NewAuditEvent } from '../../schema/audit'
import { member, user } from '../../schema/auth'
import { client, clientFilingProfile } from '../../schema/clients'
import { firmProfile } from '../../schema/firm'
import {
  emailOutbox,
  inAppNotification,
  notificationPreference,
  type NewEmailOutbox,
  type NewInAppNotification,
} from '../../schema/notifications'
import { obligationInstance } from '../../schema/obligations'
import {
  pulse,
  pulseFirmAlert,
  pulseSourceState,
  pulseSourceSnapshot,
  ruleSourceDriftState,
  type NewPulse,
  type NewPulseFirmAlert,
  type NewPulseSourceState,
  type NewPulseSourceSnapshot,
  type NewRuleSourceDriftState,
  type Pulse,
  type PulseSourceSnapshotStatus,
} from '../../schema/pulse'
import { listActiveOverlayDueDates } from '../overlay'
import {
  EMAIL_BATCH_SIZE,
  NOTIFICATION_BATCH_SIZE,
  OPEN_STATUSES,
  PULSE_DUPLICATE_WINDOW_MS,
  PulseRepoError,
  chunkRows,
  displayCounty,
  normalizeCountyName,
  pulseAlertHasFirmImpact,
  rowMatchesCounty,
  rowMatchesPulseDuplicateScope,
  sameTimestamp,
  toClientEntityTypes,
  toDateOnly,
  toDateOnlyOrNull,
  toNonEmptyBatch,
  toSnapshot,
  toSourceState,
} from './shared'
import type {
  AlertRecipientRow,
  AllFirmCandidateRow,
  PulseDigestObligationRow,
  PulseExtractDuplicateInput,
  PulseExtractInput,
  PulseNotificationRecipientRow,
  PulseReviewRow,
  PulseSourceSnapshotInput,
  PulseSourceSnapshotRow,
  PulseSourceStateInput,
  PulseSourceStateRow,
} from './shared'
export function makePulseOpsRepo(db: Db) {
  async function getPulse(pulseId: string) {
    const rows = await db.select().from(pulse).where(eq(pulse.id, pulseId)).limit(1)
    return rows[0]
  }

  async function existingUserId(actorId: string | null | undefined): Promise<string | null> {
    if (!actorId) return null
    const rows = await db.select({ id: user.id }).from(user).where(eq(user.id, actorId)).limit(1)
    return rows[0]?.id ?? null
  }

  async function refreshFirmAlertsForPulse(pulseId: string): Promise<number> {
    const row = await getPulse(pulseId)
    if (!row || row.status !== 'approved') throw new PulseRepoError('not_found')

    const firms = await db
      .select({ id: firmProfile.id })
      .from(firmProfile)
      .where(eq(firmProfile.status, 'active'))
    const counts = new Map(firms.map((firm) => [firm.id, { matchedCount: 0, needsReviewCount: 0 }]))

    const forms = row.parsedForms
    const entityTypes = toClientEntityTypes(row.parsedEntityTypes)
    if (
      row.actionMode === 'due_date_overlay' &&
      forms.length > 0 &&
      entityTypes.length > 0 &&
      row.parsedOriginalDueDate
    ) {
      const candidates = await db
        .select({
          firmId: obligationInstance.firmId,
          obligationId: obligationInstance.id,
          currentDueDate: obligationInstance.currentDueDate,
          county: client.county,
          counties: clientFilingProfile.countiesJson,
        })
        .from(obligationInstance)
        .innerJoin(client, eq(obligationInstance.clientId, client.id))
        .leftJoin(
          clientFilingProfile,
          eq(obligationInstance.clientFilingProfileId, clientFilingProfile.id),
        )
        .where(
          and(
            eq(obligationInstance.jurisdiction, row.parsedJurisdiction),
            inArray(client.entityType, entityTypes),
            inArray(obligationInstance.taxType, forms),
            inArray(obligationInstance.status, OPEN_STATUSES),
            isNull(client.deletedAt),
          ),
        )

      const counties = new Set(row.parsedCounties.map(normalizeCountyName))
      const candidatesByFirm = new Map<string, AllFirmCandidateRow[]>()
      for (const candidate of candidates as AllFirmCandidateRow[]) {
        const group = candidatesByFirm.get(candidate.firmId) ?? []
        group.push(candidate)
        candidatesByFirm.set(candidate.firmId, group)
      }
      const firmCountEntries = await Promise.all(
        Array.from(candidatesByFirm.entries()).map(async ([candidateFirmId, firmCandidates]) => {
          const count = { matchedCount: 0, needsReviewCount: 0 }
          const overlays = await listActiveOverlayDueDates(
            db,
            candidateFirmId,
            firmCandidates.map((candidate) => candidate.obligationId),
          )
          for (const candidate of firmCandidates) {
            const currentDueDate = overlays.get(candidate.obligationId) ?? candidate.currentDueDate
            if (!sameTimestamp(currentDueDate, row.parsedOriginalDueDate)) continue
            if (counties.size > 0) {
              const countyMatch = rowMatchesCounty(candidate, counties)
              if (countyMatch === 'missing') count.needsReviewCount += 1
              else if (countyMatch === 'match') count.matchedCount += 1
            } else {
              count.matchedCount += 1
            }
          }
          return [candidateFirmId, count] as const
        }),
      )
      for (const [candidateFirmId, count] of firmCountEntries) {
        if (counts.has(candidateFirmId)) counts.set(candidateFirmId, count)
      }
    }

    let alertCount = 0
    const alertWrites = []
    for (const firm of firms) {
      const count = counts.get(firm.id) ?? { matchedCount: 0, needsReviewCount: 0 }
      alertCount += 1
      const alertRow: NewPulseFirmAlert = {
        id: crypto.randomUUID(),
        pulseId,
        firmId: firm.id,
        status: 'matched',
        matchedCount: count.matchedCount,
        needsReviewCount: count.needsReviewCount,
      }
      alertWrites.push(
        db
          .insert(pulseFirmAlert)
          .values(alertRow)
          .onConflictDoUpdate({
            target: [pulseFirmAlert.firmId, pulseFirmAlert.pulseId],
            set: {
              status: 'matched',
              matchedCount: count.matchedCount,
              needsReviewCount: count.needsReviewCount,
            },
          }),
      )
    }
    await Promise.all(alertWrites)
    return alertCount
  }

  // Shared tail for both pulse-creation paths: load the inserted row, fan out per-active-firm
  // alerts, and queue the review/digest emails.
  async function finalizePulseFanOut(
    pulseId: string,
  ): Promise<{ pulseId: string; alertCount: number }> {
    const inserted = await getPulse(pulseId)
    if (!inserted) throw new PulseRepoError('not_found')
    const alertCount = await refreshFirmAlertsForPulse(pulseId)
    const alerts = await db
      .select({
        id: pulseFirmAlert.id,
        firmId: pulseFirmAlert.firmId,
        matchedCount: pulseFirmAlert.matchedCount,
        needsReviewCount: pulseFirmAlert.needsReviewCount,
      })
      .from(pulseFirmAlert)
      .where(eq(pulseFirmAlert.pulseId, pulseId))
    await queueFirmPulseReviewMessages(inserted, alerts, new Date())
    return { pulseId, alertCount }
  }

  async function getSourceStateRow(sourceId: string): Promise<PulseSourceStateRow | undefined> {
    const rows = await db
      .select()
      .from(pulseSourceState)
      .where(eq(pulseSourceState.sourceId, sourceId))
      .limit(1)
    const row = rows[0]
    return row ? toSourceState(row) : undefined
  }

  async function listFirmPulseDigestRecipients(firmId: string): Promise<string[]> {
    const rows = await db
      .select({ email: user.email })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, firmId),
          eq(member.status, 'active'),
          inArray(member.role, ['owner', 'partner', 'manager']),
        ),
      )
      .orderBy(asc(user.email))

    return Array.from(new Set((rows as AlertRecipientRow[]).map((row) => row.email)))
  }

  async function listFirmPulseNotificationRecipients(
    firmId: string,
  ): Promise<PulseNotificationRecipientRow[]> {
    const rows = await db
      .select({
        userId: member.userId,
        email: user.email,
        inAppEnabled: notificationPreference.inAppEnabled,
        pulseEnabled: notificationPreference.pulseEnabled,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .leftJoin(
        notificationPreference,
        and(
          eq(notificationPreference.firmId, firmId),
          eq(notificationPreference.userId, member.userId),
        ),
      )
      .where(
        and(
          eq(member.organizationId, firmId),
          eq(member.status, 'active'),
          inArray(member.role, ['owner', 'partner', 'manager']),
        ),
      )
      .orderBy(asc(user.email))

    return Array.from(
      new Map(
        (rows as PulseNotificationRecipientRow[])
          .filter((row) => (row.inAppEnabled ?? true) && (row.pulseEnabled ?? true))
          .map((row) => [row.userId, row]),
      ).values(),
    )
  }

  async function buildPulseAlertNotifications(
    approvedPulse: Pulse,
    alerts: readonly {
      id: string
      firmId: string
      matchedCount: number
      needsReviewCount: number
    }[],
    now: Date,
  ): Promise<NewInAppNotification[]> {
    const impactedAlerts = alerts.filter((alert) => pulseAlertHasFirmImpact(alert))
    const alertIds = impactedAlerts.map((alert) => alert.id)
    if (alertIds.length === 0) return []

    const existing = await db
      .select({
        userId: inAppNotification.userId,
        entityId: inAppNotification.entityId,
      })
      .from(inAppNotification)
      .where(
        and(
          eq(inAppNotification.entityType, 'pulse_firm_alert'),
          inArray(inAppNotification.entityId, alertIds),
        ),
      )
    const existingKeys = new Set(existing.map((row) => `${row.entityId}:${row.userId}`))
    const recipientEntries = await Promise.all(
      impactedAlerts.map(async (alert) => ({
        alert,
        recipients: await listFirmPulseNotificationRecipients(alert.firmId),
      })),
    )

    return recipientEntries.flatMap(({ alert, recipients }) => {
      const impactedCount = alert.matchedCount + alert.needsReviewCount
      const title = `New Pulse alert: ${approvedPulse.source}`
      const body =
        impactedCount > 0
          ? `${approvedPulse.aiSummary} ${impactedCount} client${impactedCount === 1 ? '' : 's'} may be affected.`
          : approvedPulse.aiSummary

      return recipients
        .filter((recipient) => !existingKeys.has(`${alert.id}:${recipient.userId}`))
        .map(
          (recipient): NewInAppNotification => ({
            id: crypto.randomUUID(),
            firmId: alert.firmId,
            userId: recipient.userId,
            type: 'pulse_alert',
            entityType: 'pulse_firm_alert',
            entityId: alert.id,
            title,
            body,
            href: `/alerts?alert=${encodeURIComponent(alert.id)}`,
            metadataJson: {
              pulseId: approvedPulse.id,
              source: approvedPulse.source,
              sourceUrl: approvedPulse.sourceUrl,
              matchedCount: alert.matchedCount,
              needsReviewCount: alert.needsReviewCount,
              approvedAt: now.toISOString(),
            },
          }),
        )
    })
  }

  async function queueFirmPulseReviewMessages(
    approvedPulse: Pulse,
    alerts: readonly {
      id: string
      firmId: string
      matchedCount: number
      needsReviewCount: number
    }[],
    now: Date,
  ): Promise<void> {
    const impactedAlerts = alerts.filter((alert) => pulseAlertHasFirmImpact(alert))
    if (impactedAlerts.length === 0) return

    const reviewEmails = await Promise.all(
      impactedAlerts.map(
        async (alert): Promise<NewEmailOutbox> => ({
          id: crypto.randomUUID(),
          firmId: alert.firmId,
          externalId: `pulse-review:${alert.firmId}:${approvedPulse.id}:${now.getTime()}`,
          type: 'pulse_digest',
          status: 'pending',
          payloadJson: {
            event: 'pulse_ready_for_firm_review',
            recipients: await listFirmPulseDigestRecipients(alert.firmId),
            alertId: alert.id,
            pulseId: approvedPulse.id,
            source: approvedPulse.source,
            sourceUrl: approvedPulse.sourceUrl,
            summary: approvedPulse.aiSummary,
            readyAt: now.toISOString(),
            matchedCount: alert.matchedCount,
            needsReviewCount: alert.needsReviewCount,
            obligations: (await listApprovedDigestObligations(approvedPulse, alert.firmId)).map(
              (obligation) => ({
                obligationId: obligation.obligationId,
                clientId: obligation.clientId,
                clientName: obligation.clientName,
                state: obligation.state,
                county: obligation.county,
                currentDueDate: toDateOnly(obligation.currentDueDate),
                newDueDate: toDateOnlyOrNull(approvedPulse.parsedNewDueDate),
                taxType: obligation.taxType,
                matchStatus: obligation.matchStatus,
                reason: obligation.reason,
              }),
            ),
          },
        }),
      ),
    )
    const reviewNotifications = await buildPulseAlertNotifications(
      approvedPulse,
      impactedAlerts,
      now,
    )
    const writes: BatchItem<'sqlite'>[] = []
    for (const chunk of chunkRows(reviewEmails, EMAIL_BATCH_SIZE)) {
      writes.push(db.insert(emailOutbox).values(chunk))
    }
    for (const chunk of chunkRows(reviewNotifications, NOTIFICATION_BATCH_SIZE)) {
      writes.push(db.insert(inAppNotification).values(chunk))
    }
    if (writes.length > 0) await db.batch(toNonEmptyBatch(writes))
  }

  async function listApprovedDigestObligations(
    row: Pulse,
    firmId: string,
  ): Promise<PulseDigestObligationRow[]> {
    const forms = row.parsedForms
    const entityTypes = toClientEntityTypes(row.parsedEntityTypes)
    if (forms.length === 0 || entityTypes.length === 0) return []

    const candidates = await db
      .select({
        obligationId: obligationInstance.id,
        clientId: client.id,
        clientName: client.name,
        state: obligationInstance.jurisdiction,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
        taxType: obligationInstance.taxType,
        currentDueDate: obligationInstance.currentDueDate,
      })
      .from(obligationInstance)
      .innerJoin(client, eq(obligationInstance.clientId, client.id))
      .leftJoin(
        clientFilingProfile,
        eq(obligationInstance.clientFilingProfileId, clientFilingProfile.id),
      )
      .where(
        and(
          eq(obligationInstance.firmId, firmId),
          eq(client.firmId, firmId),
          eq(obligationInstance.jurisdiction, row.parsedJurisdiction),
          inArray(client.entityType, entityTypes),
          inArray(obligationInstance.taxType, forms),
          inArray(obligationInstance.status, OPEN_STATUSES),
          isNull(client.deletedAt),
        ),
      )
      .orderBy(asc(obligationInstance.currentDueDate), asc(client.name))

    const overlays = await listActiveOverlayDueDates(
      db,
      firmId,
      candidates.map((candidate) => candidate.obligationId),
    )
    const counties = new Set(row.parsedCounties.map(normalizeCountyName))
    return candidates
      .map((candidate): PulseDigestObligationRow | null => {
        const currentDueDate = overlays.get(candidate.obligationId) ?? candidate.currentDueDate
        if (!sameTimestamp(currentDueDate, row.parsedOriginalDueDate)) return null
        if (counties.size > 0) {
          const countyMatch = rowMatchesCounty(candidate, counties)
          if (countyMatch === 'missing') {
            return {
              obligationId: candidate.obligationId,
              clientId: candidate.clientId,
              clientName: candidate.clientName,
              state: candidate.state,
              county: displayCounty(candidate),
              counties: candidate.counties,
              taxType: candidate.taxType,
              currentDueDate,
              matchStatus: 'needs_review',
              reason: 'Client county is missing; confirm county applicability before applying.',
            }
          }
          if (countyMatch === 'miss') return null
        }

        return {
          obligationId: candidate.obligationId,
          clientId: candidate.clientId,
          clientName: candidate.clientName,
          state: candidate.state,
          county: displayCounty(candidate),
          counties: candidate.counties,
          taxType: candidate.taxType,
          currentDueDate,
          matchStatus: 'eligible',
          reason: null,
        }
      })
      .filter((candidate): candidate is PulseDigestObligationRow => candidate !== null)
  }

  async function writePulseAlertAuditForOps(input: {
    pulseId: string
    actorId: string | null
    opsActorId?: string | null
    action: 'pulse.reject' | 'pulse.quarantine' | 'pulse.source_revoked'
    beforeStatus: string
    afterStatus: string
    reason?: string | null
  }): Promise<void> {
    const alerts = await db
      .select({
        id: pulseFirmAlert.id,
        firmId: pulseFirmAlert.firmId,
        status: pulseFirmAlert.status,
        matchedCount: pulseFirmAlert.matchedCount,
        needsReviewCount: pulseFirmAlert.needsReviewCount,
      })
      .from(pulseFirmAlert)
      .where(eq(pulseFirmAlert.pulseId, input.pulseId))
    if (alerts.length === 0) return

    await db.insert(auditEvent).values(
      alerts.map((alert) => ({
        id: crypto.randomUUID(),
        firmId: alert.firmId,
        actorId: input.actorId,
        entityType: 'pulse_firm_alert',
        entityId: alert.id,
        action: input.action,
        beforeJson: {
          pulseId: input.pulseId,
          pulseStatus: input.beforeStatus,
          alertStatus: alert.status,
          matchedCount: alert.matchedCount,
          needsReviewCount: alert.needsReviewCount,
        },
        afterJson: {
          pulseId: input.pulseId,
          pulseStatus: input.afterStatus,
          alertStatus: alert.status,
          ...(input.opsActorId ? { opsActorId: input.opsActorId } : {}),
        },
        reason: input.reason ?? null,
        ipHash: null,
        userAgentHash: null,
      })),
    )
  }

  return {
    async ensureSourceState(input: PulseSourceStateInput): Promise<PulseSourceStateRow> {
      const now = input.now ?? new Date()
      const row: NewPulseSourceState = {
        sourceId: input.sourceId,
        tier: input.tier,
        jurisdiction: input.jurisdiction,
        enabled: input.enabled ?? true,
        cadenceMs: input.cadenceMs,
        healthStatus: 'healthy',
        nextCheckAt: now,
      }
      await db
        .insert(pulseSourceState)
        .values(row)
        .onConflictDoUpdate({
          target: pulseSourceState.sourceId,
          set: {
            tier: input.tier,
            jurisdiction: input.jurisdiction,
            cadenceMs: input.cadenceMs,
            ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          },
        })
      const state = await getSourceStateRow(input.sourceId)
      if (!state) throw new PulseRepoError('not_found')
      return state
    },

    async getSourceState(sourceId: string): Promise<PulseSourceStateRow | undefined> {
      return getSourceStateRow(sourceId)
    },

    async listSourceStates(): Promise<PulseSourceStateRow[]> {
      const rows = await db.select().from(pulseSourceState).orderBy(asc(pulseSourceState.sourceId))
      return rows.map(toSourceState)
    },

    /**
     * Batched counterpart to `ensureSourceState` for the cron fan-out.
     *
     * The scheduled() handler calls ensureSourceState once per source across
     * hundreds of sources; each call is 2 D1 round-trips (upsert + read-back),
     * so a tick did ~1500 serial round-trips and blew the 15-minute Worker
     * wall-clock limit (`exceededCpu`), killing ingest before any fetch ran.
     *
     * This collapses that to: one bulk read of all existing rows, one batched
     * insert (onConflictDoNothing) of only the *new* sources, and an in-memory
     * merge. tier/jurisdiction/cadenceMs are derived from the static source
     * registry and only change on deploy, so they are not re-written per tick.
     * The one mutable config field, `enabled` (a source can be paused), IS
     * reconciled: rows whose desired enabled differs from the DB are
     * batch-updated — normally zero rows. Returns every requested source's
     * current state.
     */
    async ensureSourceStates(
      inputs: readonly PulseSourceStateInput[],
      now: Date = new Date(),
    ): Promise<Map<string, PulseSourceStateRow>> {
      if (inputs.length === 0) return new Map()

      const byId = new Map<string, PulseSourceStateRow>(
        (await db.select().from(pulseSourceState)).map((row) => [row.sourceId, toSourceState(row)]),
      )

      const newRows: NewPulseSourceState[] = inputs
        .filter((input) => !byId.has(input.sourceId))
        .map((input) => ({
          sourceId: input.sourceId,
          tier: input.tier,
          jurisdiction: input.jurisdiction,
          enabled: input.enabled ?? true,
          cadenceMs: input.cadenceMs,
          healthStatus: 'healthy' as const,
          nextCheckAt: now,
        }))

      if (newRows.length > 0) {
        // 7 columns per row; stay well under D1's bound-parameter ceiling.
        const inserts = chunkRows(newRows, 12).map((chunk) =>
          db.insert(pulseSourceState).values(chunk).onConflictDoNothing({
            target: pulseSourceState.sourceId,
          }),
        )
        await db.batch(toNonEmptyBatch(inserts))
        // Re-read only the freshly inserted ids to return their canonical rows.
        const insertedIds = newRows.map((row) => row.sourceId)
        for (const chunk of chunkRows(insertedIds, 90)) {
          const rows = await db
            .select()
            .from(pulseSourceState)
            .where(inArray(pulseSourceState.sourceId, chunk))
          for (const row of rows) byId.set(row.sourceId, toSourceState(row))
        }
      }

      // Reconcile the only mutable config field — `enabled` — for existing rows
      // whose desired value drifted (e.g. a source was paused in the registry).
      // Normally a no-op; pause/resume is rare and cheap to batch when it happens.
      const enableUpdates = inputs.flatMap((input) => {
        if (input.enabled === undefined) return []
        const state = byId.get(input.sourceId)
        if (!state || state.enabled === input.enabled) return []
        return [{ sourceId: input.sourceId, enabled: input.enabled }]
      })
      if (enableUpdates.length > 0) {
        await db.batch(
          toNonEmptyBatch(
            enableUpdates.map((update) =>
              db
                .update(pulseSourceState)
                .set({ enabled: update.enabled })
                .where(eq(pulseSourceState.sourceId, update.sourceId)),
            ),
          ),
        )
        for (const update of enableUpdates) {
          const state = byId.get(update.sourceId)
          if (state) byId.set(update.sourceId, { ...state, enabled: update.enabled })
        }
      }

      return new Map(
        inputs.flatMap((input) => {
          const state = byId.get(input.sourceId)
          return state ? [[input.sourceId, state] as const] : []
        }),
      )
    },

    async establishSourceBaseline(input: {
      sourceId: string
      baselineAt?: Date
      baselineMode?: 'establish_on_first_seen' | 'active' | 'backfill'
    }): Promise<PulseSourceStateRow> {
      const baselineAt = input.baselineAt ?? new Date()
      await db
        .update(pulseSourceState)
        .set({
          monitoringBaselineAt: baselineAt,
          baselineMode: input.baselineMode ?? 'active',
        })
        .where(
          and(
            eq(pulseSourceState.sourceId, input.sourceId),
            isNull(pulseSourceState.monitoringBaselineAt),
          ),
        )
      const state = await getSourceStateRow(input.sourceId)
      if (!state) throw new PulseRepoError('not_found')
      return state
    },

    async recordSourceSuccess(input: {
      sourceId: string
      checkedAt?: Date
      nextCheckAt: Date
      changed: boolean
      etag?: string | null
      lastModified?: string | null
    }): Promise<void> {
      const checkedAt = input.checkedAt ?? new Date()
      await db
        .update(pulseSourceState)
        .set({
          healthStatus: 'healthy',
          lastCheckedAt: checkedAt,
          lastSuccessAt: checkedAt,
          ...(input.changed ? { lastChangeDetectedAt: checkedAt } : {}),
          nextCheckAt: input.nextCheckAt,
          consecutiveFailures: 0,
          lastError: null,
          ...(input.etag !== undefined ? { etag: input.etag } : {}),
          ...(input.lastModified !== undefined ? { lastModified: input.lastModified } : {}),
        })
        .where(eq(pulseSourceState.sourceId, input.sourceId))
    },

    async recordSourceFailure(input: {
      sourceId: string
      checkedAt?: Date
      nextCheckAt: Date
      error: string
    }): Promise<void> {
      const checkedAt = input.checkedAt ?? new Date()
      const current = await getSourceStateRow(input.sourceId)
      const consecutiveFailures = (current?.consecutiveFailures ?? 0) + 1
      await db
        .update(pulseSourceState)
        .set({
          lastCheckedAt: checkedAt,
          nextCheckAt: input.nextCheckAt,
          consecutiveFailures,
          lastError: input.error.slice(0, 500),
        })
        .where(eq(pulseSourceState.sourceId, input.sourceId))
    },

    async createSourceSnapshot(input: PulseSourceSnapshotInput): Promise<{
      snapshot: PulseSourceSnapshotRow
      inserted: boolean
    }> {
      const id = input.id ?? crypto.randomUUID()
      const row: NewPulseSourceSnapshot = {
        id,
        sourceId: input.sourceId,
        externalId: input.externalId,
        title: input.title,
        officialSourceUrl: input.officialSourceUrl,
        publishedAt: input.publishedAt,
        fetchedAt: input.fetchedAt,
        contentHash: input.contentHash,
        rawR2Key: input.rawR2Key,
        parseStatus: 'pending_extract',
      }

      await db
        .insert(pulseSourceSnapshot)
        .values(row)
        .onConflictDoNothing({
          target: [
            pulseSourceSnapshot.sourceId,
            pulseSourceSnapshot.externalId,
            pulseSourceSnapshot.contentHash,
          ],
        })

      const rows = await db
        .select()
        .from(pulseSourceSnapshot)
        .where(
          and(
            eq(pulseSourceSnapshot.sourceId, input.sourceId),
            eq(pulseSourceSnapshot.externalId, input.externalId),
            eq(pulseSourceSnapshot.contentHash, input.contentHash),
          ),
        )
        .limit(1)
      const snapshot = rows[0]
      if (!snapshot) throw new PulseRepoError('not_found')
      return { snapshot: toSnapshot(snapshot), inserted: snapshot.id === id }
    },

    async getLatestSourceSnapshotBySourceId(
      sourceId: string,
    ): Promise<PulseSourceSnapshotRow | null> {
      const rows = await db
        .select()
        .from(pulseSourceSnapshot)
        .where(eq(pulseSourceSnapshot.sourceId, sourceId))
        .orderBy(desc(pulseSourceSnapshot.fetchedAt), desc(pulseSourceSnapshot.createdAt))
        .limit(1)
      return rows[0] ? toSnapshot(rows[0]) : null
    },

    async setSourceEnabled(input: {
      sourceId: string
      enabled: boolean
      now?: Date
    }): Promise<void> {
      const now = input.now ?? new Date()
      await db
        .update(pulseSourceState)
        .set({
          enabled: input.enabled,
          healthStatus: input.enabled ? 'healthy' : 'paused',
          nextCheckAt: input.enabled ? now : null,
          ...(input.enabled ? { lastError: null } : {}),
        })
        .where(eq(pulseSourceState.sourceId, input.sourceId))
    },

    async revokeSourcePulses(input: {
      sourceId: string
      actorId: string
      reason?: string | null
      now?: Date
    }): Promise<{ revokedCount: number }> {
      const actorUserId = await existingUserId(input.actorId)
      const rows = await db
        .select({ id: pulse.id, status: pulse.status })
        .from(pulse)
        .where(
          and(
            eq(pulse.source, input.sourceId),
            inArray(pulse.status, ['pending_review', 'approved', 'quarantined']),
          ),
        )
      await db
        .update(pulse)
        .set({
          status: 'source_revoked',
          reviewedBy: actorUserId,
          reviewedAt: input.now ?? new Date(),
        })
        .where(
          and(
            eq(pulse.source, input.sourceId),
            inArray(pulse.status, ['pending_review', 'approved', 'quarantined']),
          ),
        )
      await Promise.all(
        rows.map((row) =>
          writePulseAlertAuditForOps({
            pulseId: row.id,
            actorId: actorUserId,
            opsActorId: actorUserId ? null : input.actorId,
            action: 'pulse.source_revoked',
            beforeStatus: row.status,
            afterStatus: 'source_revoked',
            reason: input.reason ?? null,
          }),
        ),
      )
      return { revokedCount: rows.length }
    },

    async getSourceSnapshot(snapshotId: string): Promise<PulseSourceSnapshotRow | undefined> {
      const rows = await db
        .select()
        .from(pulseSourceSnapshot)
        .where(eq(pulseSourceSnapshot.id, snapshotId))
        .limit(1)
      const row = rows[0]
      return row ? toSnapshot(row) : undefined
    },

    async listFailedSourceSnapshots(
      opts: { limit?: number } = {},
    ): Promise<PulseSourceSnapshotRow[]> {
      const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100)
      const rows = await db
        .select()
        .from(pulseSourceSnapshot)
        .where(eq(pulseSourceSnapshot.parseStatus, 'failed'))
        .orderBy(desc(pulseSourceSnapshot.updatedAt), desc(pulseSourceSnapshot.createdAt))
        .limit(limit)
      return rows.map(toSnapshot)
    },

    async updateSourceSnapshotStatus(
      snapshotId: string,
      patch: {
        parseStatus: PulseSourceSnapshotStatus
        pulseId?: string | null
        aiOutputId?: string | null
        failureReason?: string | null
      },
    ): Promise<void> {
      await db
        .update(pulseSourceSnapshot)
        .set({
          parseStatus: patch.parseStatus,
          ...(patch.pulseId !== undefined ? { pulseId: patch.pulseId } : {}),
          ...(patch.aiOutputId !== undefined ? { aiOutputId: patch.aiOutputId } : {}),
          ...(patch.failureReason !== undefined ? { failureReason: patch.failureReason } : {}),
        })
        .where(eq(pulseSourceSnapshot.id, snapshotId))
    },

    async findDuplicatePulseForExtract(input: PulseExtractDuplicateInput): Promise<string | null> {
      const windowMs =
        (input.windowDays ?? PULSE_DUPLICATE_WINDOW_MS / 24 / 60 / 60 / 1000) * 24 * 60 * 60 * 1000
      const earliest = new Date(input.publishedAt.getTime() - windowMs)
      const latest = new Date(input.publishedAt.getTime() + windowMs)
      const rows = await db
        .select({
          id: pulse.id,
          sourceUrl: pulse.sourceUrl,
          parsedCounties: pulse.parsedCounties,
          parsedForms: pulse.parsedForms,
          parsedEntityTypes: pulse.parsedEntityTypes,
        })
        .from(pulse)
        .where(
          and(
            inArray(pulse.status, ['pending_review', 'approved', 'quarantined']),
            eq(pulse.parsedJurisdiction, input.parsedJurisdiction),
            eq(pulse.changeKind, input.changeKind ?? 'deadline_shift'),
            eq(pulse.actionMode, input.actionMode ?? 'due_date_overlay'),
            input.parsedOriginalDueDate
              ? eq(pulse.parsedOriginalDueDate, input.parsedOriginalDueDate)
              : isNull(pulse.parsedOriginalDueDate),
            input.parsedNewDueDate
              ? eq(pulse.parsedNewDueDate, input.parsedNewDueDate)
              : isNull(pulse.parsedNewDueDate),
            gte(pulse.publishedAt, earliest),
            lte(pulse.publishedAt, latest),
          ),
        )
        .orderBy(desc(pulse.publishedAt))
        .limit(20)
      const duplicate = rows.find((row) => rowMatchesPulseDuplicateScope(row, input))
      return duplicate?.id ?? null
    },

    async refreshFirmAlertsForApprovedPulse(pulseId: string): Promise<number> {
      const row = await getPulse(pulseId)
      if (!row || row.status !== 'approved') return 0
      return refreshFirmAlertsForPulse(pulseId)
    },

    /**
     * Catch a newly-registered firm up to the *currently-actionable* regulatory
     * landscape, so it does not silently miss policy changes published before it
     * joined. The live fan-out only reaches firms that exist at approval time;
     * this materializes the same firm-wide alerts for a firm that arrives later.
     *
     * Relevance = approved AND not expired (the deadline has not passed and the
     * effective window has not ended). The extract-time pre-2026 date floor
     * already strips the historical backlog, so this stays bounded to the live
     * landscape. `matchedCount` starts at 0 — a brand-new firm has no obligations
     * yet, and (exactly like the live fan-out) the count is point-in-time;
     * firm-wide visibility surfaces the change regardless of count, and the count
     * naturally respects `monitoringStartDate` via the obligations it later
     * generates. `onConflictDoNothing` so an existing alert's real count is never
     * clobbered, making the call idempotent.
     */
    async backfillFirmAlertsForActiveLandscape(
      firmId: string,
      now: Date = new Date(),
    ): Promise<number> {
      const candidates = await db
        .select({ id: pulse.id })
        .from(pulse)
        .where(
          and(
            eq(pulse.status, 'approved'),
            or(isNull(pulse.parsedNewDueDate), gte(pulse.parsedNewDueDate, now)),
            or(isNull(pulse.parsedEffectiveUntil), gte(pulse.parsedEffectiveUntil, now)),
          ),
        )
      if (candidates.length === 0) return 0
      const rows: NewPulseFirmAlert[] = candidates.map((candidate) => ({
        id: crypto.randomUUID(),
        pulseId: candidate.id,
        firmId,
        status: 'matched',
        matchedCount: 0,
        needsReviewCount: 0,
      }))
      const inserts = chunkRows(rows, 16).map((chunk) =>
        db
          .insert(pulseFirmAlert)
          .values(chunk)
          .onConflictDoNothing({ target: [pulseFirmAlert.firmId, pulseFirmAlert.pulseId] }),
      )
      await db.batch(toNonEmptyBatch(inserts))
      return candidates.length
    },

    async createPulseForFirmReviewFromExtract(
      input: PulseExtractInput,
    ): Promise<{ pulseId: string; alertCount: number }> {
      const pulseId = crypto.randomUUID()
      const pulseRow: NewPulse = {
        id: pulseId,
        source: input.source,
        sourceUrl: input.sourceUrl,
        rawR2Key: input.rawR2Key ?? null,
        publishedAt: input.publishedAt,
        changeKind: input.changeKind ?? 'deadline_shift',
        actionMode: input.actionMode ?? 'due_date_overlay',
        aiSummary: input.aiSummary,
        verbatimQuote: input.verbatimQuote,
        parsedJurisdiction: input.parsedJurisdiction,
        parsedCounties: input.parsedCounties,
        parsedForms: input.parsedForms,
        parsedEntityTypes: input.parsedEntityTypes,
        parsedOriginalDueDate: input.parsedOriginalDueDate,
        parsedNewDueDate: input.parsedNewDueDate,
        parsedEffectiveFrom: input.parsedEffectiveFrom ?? null,
        parsedEffectiveUntil: input.parsedEffectiveUntil ?? null,
        affectedRuleIdsJson: input.affectedRuleIds ?? [],
        reverifyRuleIdsJson: input.reverifyRuleIds ?? [],
        structuredChangeJson: input.structuredChange ?? null,
        confidence: input.confidence,
        status: 'approved',
        reviewedBy: null,
        reviewedAt: null,
        requiresHumanReview: input.requiresHumanReview ?? true,
        isSample: input.isSample ?? false,
      }
      await db.batch([
        db.insert(pulse).values(pulseRow),
        db
          .update(pulseSourceSnapshot)
          .set({
            parseStatus: 'extracted',
            pulseId,
            aiOutputId: input.aiOutputId ?? null,
            failureReason: null,
          })
          .where(eq(pulseSourceSnapshot.id, input.snapshotId)),
      ])
      return finalizePulseFanOut(pulseId)
    },

    /**
     * Create a rule_source_drift Alert that is NOT tied to a freshly-fetched source snapshot — used
     * by the catalog-level rule-date reconciliation (gap #5) to surface a verified rule whose literal
     * due date is stale or contradicts its cited excerpt. Same per-active-firm fan-out + review
     * messaging as the snapshot-driven path; it just skips the snapshot bookkeeping.
     */
    async createRuleSourceDriftPulse(input: {
      sourceId: string
      sourceUrl: string
      parsedJurisdiction: string
      reverifyRuleIds: string[]
      aiSummary: string
      verbatimQuote: string
      publishedAt: Date
      structuredChange?: unknown
    }): Promise<{ pulseId: string; alertCount: number }> {
      const pulseId = crypto.randomUUID()
      const pulseRow: NewPulse = {
        id: pulseId,
        source: input.sourceId,
        sourceUrl: input.sourceUrl,
        rawR2Key: null,
        publishedAt: input.publishedAt,
        changeKind: 'rule_source_drift',
        actionMode: 'review_only',
        aiSummary: input.aiSummary,
        verbatimQuote: input.verbatimQuote,
        parsedJurisdiction: input.parsedJurisdiction,
        parsedCounties: [],
        parsedForms: [],
        parsedEntityTypes: [],
        parsedOriginalDueDate: null,
        parsedNewDueDate: null,
        parsedEffectiveFrom: null,
        parsedEffectiveUntil: null,
        affectedRuleIdsJson: [],
        reverifyRuleIdsJson: input.reverifyRuleIds,
        structuredChangeJson: input.structuredChange ?? null,
        confidence: 1,
        status: 'approved',
        reviewedBy: null,
        reviewedAt: null,
        requiresHumanReview: true,
        isSample: false,
      }
      await db.insert(pulse).values(pulseRow)
      return finalizePulseFanOut(pulseId)
    },

    /**
     * Union new reverify rule ids into an existing pulse — used when a source
     * change dedupes onto a prior regulatory alert but still implicates rules
     * that should be re-verified.
     */
    async mergeReverifyRuleIdsIntoPulse(pulseId: string, ruleIds: string[]): Promise<void> {
      if (ruleIds.length === 0) return
      const row = await getPulse(pulseId)
      if (!row) return
      const merged = Array.from(new Set([...(row.reverifyRuleIdsJson ?? []), ...ruleIds]))
      if (merged.length === (row.reverifyRuleIdsJson ?? []).length) return
      await db.update(pulse).set({ reverifyRuleIdsJson: merged }).where(eq(pulse.id, pulseId))
    },

    /**
     * Record (or re-open) the durable "this rule's source drifted since it was
     * last verified" signal. Keyed by (ruleId, sourceId); a fresh change resets
     * clearedAt so the rule accept/verify gate blocks again.
     */
    async upsertRuleSourceDriftState(input: {
      ruleId: string
      sourceId: string
      snapshotId?: string | null
      pulseId?: string | null
      contentHash: string
      excerptMatched: boolean
      detectedAt: Date
    }): Promise<void> {
      const row: NewRuleSourceDriftState = {
        id: crypto.randomUUID(),
        ruleId: input.ruleId,
        sourceId: input.sourceId,
        snapshotId: input.snapshotId ?? null,
        pulseId: input.pulseId ?? null,
        contentHash: input.contentHash,
        excerptMatched: input.excerptMatched,
        detectedAt: input.detectedAt,
      }
      await db
        .insert(ruleSourceDriftState)
        .values(row)
        .onConflictDoUpdate({
          target: [ruleSourceDriftState.ruleId, ruleSourceDriftState.sourceId],
          set: {
            snapshotId: row.snapshotId,
            pulseId: row.pulseId,
            contentHash: row.contentHash,
            excerptMatched: row.excerptMatched,
            detectedAt: row.detectedAt,
            clearedAt: null,
            clearedBy: null,
          },
        })
    },

    /**
     * Rules (from the given candidate set) that currently carry an uncleared
     * source-drift signal. The rule accept/verify gate calls this so a firm
     * adopting the rule later is still blocked until the drift is reviewed.
     */
    async listUnclearedDriftRuleIds(ruleIds: string[]): Promise<string[]> {
      if (ruleIds.length === 0) return []
      const rows = await db
        .selectDistinct({ ruleId: ruleSourceDriftState.ruleId })
        .from(ruleSourceDriftState)
        .where(
          and(
            inArray(ruleSourceDriftState.ruleId, ruleIds),
            isNull(ruleSourceDriftState.clearedAt),
          ),
        )
      return rows.map((r) => r.ruleId)
    },

    /**
     * Clear every uncleared drift row for a rule — called when a human
     * re-verifies / re-accepts the rule (the source has been looked at).
     */
    async clearRuleSourceDriftForRule(input: {
      ruleId: string
      clearedBy?: string | null
      clearedAt?: Date
    }): Promise<void> {
      await db
        .update(ruleSourceDriftState)
        .set({
          clearedAt: input.clearedAt ?? new Date(),
          clearedBy: (await existingUserId(input.clearedBy)) ?? null,
        })
        .where(
          and(
            eq(ruleSourceDriftState.ruleId, input.ruleId),
            isNull(ruleSourceDriftState.clearedAt),
          ),
        )
    },

    async listPendingPulses(opts: { limit?: number } = {}): Promise<PulseReviewRow[]> {
      const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100)
      const rows = await db
        .select()
        .from(pulse)
        .where(eq(pulse.status, 'pending_review'))
        .orderBy(desc(pulse.publishedAt), desc(pulse.createdAt))
        .limit(limit)
      return rows.map((row) => ({
        pulseId: row.id,
        source: row.source,
        sourceUrl: row.sourceUrl,
        rawR2Key: row.rawR2Key,
        publishedAt: row.publishedAt,
        summary: row.aiSummary,
        sourceExcerpt: row.verbatimQuote,
        jurisdiction: row.parsedJurisdiction,
        counties: row.parsedCounties,
        forms: row.parsedForms,
        entityTypes: row.parsedEntityTypes,
        originalDueDate: row.parsedOriginalDueDate,
        newDueDate: row.parsedNewDueDate,
        effectiveFrom: row.parsedEffectiveFrom,
        effectiveUntil: row.parsedEffectiveUntil,
        affectedRuleIds: row.affectedRuleIdsJson,
        structuredChange: row.structuredChangeJson,
        confidence: row.confidence,
        status: row.status,
        requiresHumanReview: row.requiresHumanReview,
        createdAt: row.createdAt,
      }))
    },

    async getPulseReview(pulseId: string): Promise<PulseReviewRow | undefined> {
      const rows = await db.select().from(pulse).where(eq(pulse.id, pulseId)).limit(1)
      const row = rows[0]
      if (!row) return undefined
      return {
        pulseId: row.id,
        source: row.source,
        sourceUrl: row.sourceUrl,
        rawR2Key: row.rawR2Key,
        publishedAt: row.publishedAt,
        summary: row.aiSummary,
        sourceExcerpt: row.verbatimQuote,
        jurisdiction: row.parsedJurisdiction,
        counties: row.parsedCounties,
        forms: row.parsedForms,
        entityTypes: row.parsedEntityTypes,
        originalDueDate: row.parsedOriginalDueDate,
        newDueDate: row.parsedNewDueDate,
        effectiveFrom: row.parsedEffectiveFrom,
        effectiveUntil: row.parsedEffectiveUntil,
        affectedRuleIds: row.affectedRuleIdsJson,
        structuredChange: row.structuredChangeJson,
        confidence: row.confidence,
        status: row.status,
        requiresHumanReview: row.requiresHumanReview,
        createdAt: row.createdAt,
      }
    },

    async approvePulse(input: {
      pulseId: string
      reviewedBy: string
      now?: Date
    }): Promise<{ alertCount: number }> {
      const now = input.now ?? new Date()
      const reviewedByUserId = await existingUserId(input.reviewedBy)
      await db
        .update(pulse)
        .set({
          status: 'approved',
          reviewedBy: reviewedByUserId,
          reviewedAt: now,
          requiresHumanReview: false,
        })
        .where(eq(pulse.id, input.pulseId))
      const pulseRows = await db.select().from(pulse).where(eq(pulse.id, input.pulseId)).limit(1)
      const approvedPulse = pulseRows[0]
      if (!approvedPulse) throw new PulseRepoError('not_found')
      const alertCount = await refreshFirmAlertsForPulse(input.pulseId)
      const alerts = await db
        .select({
          id: pulseFirmAlert.id,
          firmId: pulseFirmAlert.firmId,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
        })
        .from(pulseFirmAlert)
        .where(eq(pulseFirmAlert.pulseId, input.pulseId))
      if (alerts.length > 0) {
        const impactedAlerts = alerts.filter((alert) => pulseAlertHasFirmImpact(alert))
        const audits: NewAuditEvent[] = alerts.map((alert) => ({
          id: crypto.randomUUID(),
          firmId: alert.firmId,
          actorId: reviewedByUserId,
          entityType: 'pulse_firm_alert',
          entityId: alert.id,
          action: 'pulse.approve',
          beforeJson: { pulseId: input.pulseId, status: 'pending_review' },
          afterJson: {
            pulseId: input.pulseId,
            status: 'matched',
            matchedCount: alert.matchedCount,
            needsReviewCount: alert.needsReviewCount,
            ...(reviewedByUserId ? {} : { opsActorId: input.reviewedBy }),
          },
          reason: null,
          ipHash: null,
          userAgentHash: null,
        }))
        const approvedEmails = await Promise.all(
          impactedAlerts.map(
            async (alert): Promise<NewEmailOutbox> => ({
              id: crypto.randomUUID(),
              firmId: alert.firmId,
              externalId: `pulse-approved:${alert.firmId}:${input.pulseId}:${now.getTime()}`,
              type: 'pulse_digest',
              status: 'pending',
              payloadJson: {
                event: 'pulse_approved',
                recipients: await listFirmPulseDigestRecipients(alert.firmId),
                alertId: alert.id,
                pulseId: input.pulseId,
                source: approvedPulse.source,
                sourceUrl: approvedPulse.sourceUrl,
                summary: approvedPulse.aiSummary,
                approvedAt: now.toISOString(),
                approvedBy: input.reviewedBy,
                matchedCount: alert.matchedCount,
                needsReviewCount: alert.needsReviewCount,
                obligations: (await listApprovedDigestObligations(approvedPulse, alert.firmId)).map(
                  (obligation) => ({
                    obligationId: obligation.obligationId,
                    clientId: obligation.clientId,
                    clientName: obligation.clientName,
                    state: obligation.state,
                    county: obligation.county,
                    currentDueDate: toDateOnly(obligation.currentDueDate),
                    newDueDate: toDateOnlyOrNull(approvedPulse.parsedNewDueDate),
                    taxType: obligation.taxType,
                    matchStatus: obligation.matchStatus,
                    reason: obligation.reason,
                  }),
                ),
              },
            }),
          ),
        )
        const approvedNotifications = await buildPulseAlertNotifications(
          approvedPulse,
          impactedAlerts,
          now,
        )
        const writes: BatchItem<'sqlite'>[] = [db.insert(auditEvent).values(audits)]
        for (const chunk of chunkRows(approvedEmails, EMAIL_BATCH_SIZE)) {
          writes.push(db.insert(emailOutbox).values(chunk))
        }
        for (const chunk of chunkRows(approvedNotifications, NOTIFICATION_BATCH_SIZE)) {
          writes.push(db.insert(inAppNotification).values(chunk))
        }
        await db.batch(toNonEmptyBatch(writes))
      }
      return { alertCount }
    },

    async rejectPulse(input: {
      pulseId: string
      reviewedBy: string
      reason?: string | null
      now?: Date
    }): Promise<void> {
      const rows = await db.select().from(pulse).where(eq(pulse.id, input.pulseId)).limit(1)
      const current = rows[0]
      if (!current) throw new PulseRepoError('not_found')
      const reviewedByUserId = await existingUserId(input.reviewedBy)
      await db
        .update(pulse)
        .set({
          status: 'rejected',
          reviewedBy: reviewedByUserId,
          reviewedAt: input.now ?? new Date(),
        })
        .where(eq(pulse.id, input.pulseId))
      await writePulseAlertAuditForOps({
        pulseId: input.pulseId,
        actorId: reviewedByUserId,
        opsActorId: reviewedByUserId ? null : input.reviewedBy,
        action: 'pulse.reject',
        beforeStatus: current.status,
        afterStatus: 'rejected',
        reason: input.reason ?? null,
      })
    },

    async quarantinePulse(input: {
      pulseId: string
      actorId: string
      reason?: string | null
      now?: Date
    }): Promise<void> {
      const rows = await db.select().from(pulse).where(eq(pulse.id, input.pulseId)).limit(1)
      const current = rows[0]
      if (!current) throw new PulseRepoError('not_found')
      const actorUserId = await existingUserId(input.actorId)
      await db
        .update(pulse)
        .set({
          status: 'quarantined',
          reviewedBy: actorUserId,
          reviewedAt: input.now ?? new Date(),
        })
        .where(eq(pulse.id, input.pulseId))
      await writePulseAlertAuditForOps({
        pulseId: input.pulseId,
        actorId: actorUserId,
        opsActorId: actorUserId ? null : input.actorId,
        action: 'pulse.quarantine',
        beforeStatus: current.status,
        afterStatus: 'quarantined',
        reason: input.reason ?? null,
      })
    },
  }
}

export type PulseOpsRepo = ReturnType<typeof makePulseOpsRepo>
