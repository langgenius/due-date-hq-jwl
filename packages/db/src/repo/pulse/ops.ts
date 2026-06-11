import {
  and,
  asc,
  count as rowCount,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  or,
} from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { CLOSED_OBLIGATION_STATUSES } from '@duedatehq/core/obligation-workflow'
import { taxAreaForTaxType } from '@duedatehq/core/tax-area'
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
  type PulseFirmAlertOrigin,
  type PulseSourceSnapshotStatus,
  type PulseStatus,
} from '../../schema/pulse'
import { listActiveOverlayDueDates } from '../overlay'
import {
  EMAIL_BATCH_SIZE,
  NOTIFICATION_BATCH_SIZE,
  OPEN_STATUSES,
  PULSE_DUPLICATE_WINDOW_MS,
  PulseRepoError,
  chunkRows,
  computePulseDedupeKey,
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

// Fallback claim years when the extract carries no source-backed `claimTaxYears`
// — the COVID disaster-period refund window (2019-2022 returns).
const PROTECTIVE_CLAIM_DEFAULT_TAX_YEARS = [2019, 2020, 2021, 2022]
export const PROTECTIVE_CLAIM_TAX_AREAS = new Set([
  'income_individual',
  'income_business',
  'payroll_withholding',
  'info_compliance',
])
// A backward-looking protective/refund claim concerns returns already filed as
// much as ones still open, so the review scan spans open and closed obligations.
// `not_applicable` is excluded — that obligation explicitly does not apply.
export const PROTECTIVE_CLAIM_REVIEW_STATUSES = [
  ...OPEN_STATUSES,
  ...CLOSED_OBLIGATION_STATUSES.filter((status) => status !== 'not_applicable'),
]

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Source-backed claim years from the extract's structuredChange, falling back to
// the COVID default window. Accepts number or numeric-string years (the AI emits
// either) and bounds them to plausible tax years.
export function protectiveClaimTaxYears(structuredChange: unknown): number[] {
  if (!isPlainRecord(structuredChange)) return PROTECTIVE_CLAIM_DEFAULT_TAX_YEARS
  const raw = structuredChange.claimTaxYears
  if (!Array.isArray(raw)) return PROTECTIVE_CLAIM_DEFAULT_TAX_YEARS
  const years = Array.from(
    new Set(
      raw
        .map((value) =>
          typeof value === 'number'
            ? value
            : typeof value === 'string'
              ? Number.parseInt(value, 10)
              : Number.NaN,
        )
        .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100),
    ),
  )
  return years.length > 0 ? years : PROTECTIVE_CLAIM_DEFAULT_TAX_YEARS
}

// Change kinds the opt-in catch-up and periodic sweep re-materialize: review_only
// protective-claim windows and unexpired due-date shifts. Both stay relevant to a
// firm long after approval (a future action deadline / postponed due date), which
// the publish-time live fan-out misses for firms that join or import clients later.
const STILL_OPEN_CATCHUP_CHANGE_KINDS = ['protective_claim_window', 'deadline_shift'] as const

// "Still actionable today", split by change kind. A review_only
// protective-claim window's actionability is governed ONLY by its
// `protectiveActionDeadline` — its underlying policy period
// (`parsedEffectiveUntil`, frequently historical, e.g. a 2020-2022 COVID period)
// must NOT expire it. Every other kind uses its due / effective dates and never
// carries an action deadline. Returned as a one-element array so callers keep
// spreading it into `and(...)`.
export function pulseNotExpiredConditions(now: Date) {
  return [
    or(
      and(
        eq(pulse.changeKind, 'protective_claim_window'),
        or(isNull(pulse.protectiveActionDeadline), gte(pulse.protectiveActionDeadline, now)),
      ),
      and(
        ne(pulse.changeKind, 'protective_claim_window'),
        or(isNull(pulse.parsedNewDueDate), gte(pulse.parsedNewDueDate, now)),
        or(isNull(pulse.parsedEffectiveUntil), gte(pulse.parsedEffectiveUntil, now)),
      ),
    ),
  ]
}

// Inverse of pulseNotExpiredConditions, same kind-aware split: the alert's
// governing deadline has already passed. listHistory uses it so a `matched`
// protective window past its actionDeadline still surfaces under "Expired"
// instead of vanishing — it is neither active nor "handled".
export function pulseExpiredCondition(now: Date) {
  return or(
    and(
      eq(pulse.changeKind, 'protective_claim_window'),
      isNotNull(pulse.protectiveActionDeadline),
      lt(pulse.protectiveActionDeadline, now),
    ),
    and(
      ne(pulse.changeKind, 'protective_claim_window'),
      or(
        and(isNotNull(pulse.parsedNewDueDate), lt(pulse.parsedNewDueDate, now)),
        and(isNotNull(pulse.parsedEffectiveUntil), lt(pulse.parsedEffectiveUntil, now)),
      ),
    ),
  )
}

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

  async function refreshFirmAlertsForPulse(
    pulseId: string,
    opts?: {
      firmIds?: string[]
      preserveStatus?: boolean
      skipZeroImpact?: boolean
      origin?: PulseFirmAlertOrigin
    },
  ): Promise<number> {
    const row = await getPulse(pulseId)
    if (!row || row.status !== 'approved') throw new PulseRepoError('not_found')

    const activeFirms = await db
      .select({ id: firmProfile.id })
      .from(firmProfile)
      .where(eq(firmProfile.status, 'active'))
    // Optional targeting: scope the fan-out to a specific firm set (e.g. only firms
    // that adopted a changed rule). Filtered in-memory to dodge D1 bound-param limits.
    const firmIdFilter = opts?.firmIds && opts.firmIds.length > 0 ? new Set(opts.firmIds) : null
    const firms = firmIdFilter
      ? activeFirms.filter((firm) => firmIdFilter.has(firm.id))
      : activeFirms
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
            isNull(obligationInstance.supersededAt),
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

    // Rule-change / source-drift alerts (review_only): per-firm impact = distinct clients
    // with an OPEN obligation backed by one of the reverify rules. Param-safe — the reverify
    // rule set is tiny, and we bucket the cross-firm result onto the in-scope firms in memory.
    const reverifyRuleIds = row.reverifyRuleIdsJson ?? []
    if (row.actionMode !== 'due_date_overlay' && reverifyRuleIds.length > 0 && firms.length > 0) {
      const distinctRows = await db
        .selectDistinct({
          firmId: obligationInstance.firmId,
          clientId: obligationInstance.clientId,
        })
        .from(obligationInstance)
        .where(
          and(
            inArray(obligationInstance.ruleId, reverifyRuleIds),
            inArray(obligationInstance.status, OPEN_STATUSES),
            isNull(obligationInstance.supersededAt),
          ),
        )
      const perFirm = new Map<string, number>()
      for (const distinct of distinctRows) {
        perFirm.set(distinct.firmId, (perFirm.get(distinct.firmId) ?? 0) + 1)
      }
      for (const firm of firms) {
        counts.set(firm.id, { matchedCount: 0, needsReviewCount: perFirm.get(firm.id) ?? 0 })
      }
    }

    if (
      row.actionMode !== 'due_date_overlay' &&
      row.changeKind === 'protective_claim_window' &&
      firms.length > 0
    ) {
      const taxYears = protectiveClaimTaxYears(row.structuredChangeJson)
      const distinctRows = await db
        .selectDistinct({
          firmId: obligationInstance.firmId,
          clientId: obligationInstance.clientId,
          taxType: obligationInstance.taxType,
        })
        .from(obligationInstance)
        .innerJoin(client, eq(obligationInstance.clientId, client.id))
        .where(
          and(
            eq(obligationInstance.jurisdiction, 'FED'),
            inArray(obligationInstance.taxYear, taxYears),
            inArray(obligationInstance.status, PROTECTIVE_CLAIM_REVIEW_STATUSES),
            isNull(client.deletedAt),
            isNull(obligationInstance.supersededAt),
          ),
        )
      const perFirmClients = new Map<string, Set<string>>()
      for (const distinct of distinctRows) {
        const taxArea = taxAreaForTaxType(distinct.taxType)
        if (!taxArea || !PROTECTIVE_CLAIM_TAX_AREAS.has(taxArea)) continue
        const clientIds = perFirmClients.get(distinct.firmId) ?? new Set<string>()
        clientIds.add(distinct.clientId)
        perFirmClients.set(distinct.firmId, clientIds)
      }
      for (const firm of firms) {
        counts.set(firm.id, {
          matchedCount: 0,
          needsReviewCount: perFirmClients.get(firm.id)?.size ?? 0,
        })
      }
    }

    let alertCount = 0
    const alertWrites = []
    for (const firm of firms) {
      const count = counts.get(firm.id) ?? { matchedCount: 0, needsReviewCount: 0 }
      // skipZeroImpact (catch-up / sweep over deadline shifts): only materialize
      // where the firm actually has a matching obligation, so an opt-in/scheduled
      // refresh never floods a firm with count-0 firm-wide rows. The default
      // (live approval fan-out) keeps firm-wide visibility regardless of count.
      if (opts?.skipZeroImpact && count.matchedCount + count.needsReviewCount === 0) continue
      alertCount += 1
      const alertRow: NewPulseFirmAlert = {
        id: crypto.randomUUID(),
        pulseId,
        firmId: firm.id,
        status: 'matched',
        matchedCount: count.matchedCount,
        needsReviewCount: count.needsReviewCount,
        origin: opts?.origin ?? 'live',
      }
      alertWrites.push(
        db
          .insert(pulseFirmAlert)
          .values(alertRow)
          .onConflictDoUpdate({
            target: [pulseFirmAlert.firmId, pulseFirmAlert.pulseId],
            // preserveStatus (catch-up / sweep): refresh the counts but never
            // reset a firm's dismissed alert back to 'matched'. `origin` is
            // deliberately absent from BOTH set branches (first-writer-wins):
            // a later sweep refreshing a 'live' row must not relabel it
            // 'catchup' (it would vanish from new-alert counters), and a
            // dup-fold re-fan-out must not flip a 'catchup' row back to 'live'
            // (it would resurface months-old news as "new").
            set: opts?.preserveStatus
              ? {
                  matchedCount: count.matchedCount,
                  needsReviewCount: count.needsReviewCount,
                }
              : {
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

  // Re-materialize firm alerts for the still-open, high-value regulatory landscape
  // (protective-claim windows + unexpired deadline shifts), reusing the live
  // fan-out so counts are real instead of zero. Scope to one firm (opt-in
  // catch-up) or all active firms (periodic sweep). `preserveStatus` keeps a
  // firm's dismissed alert from being resurrected; deadline shifts only
  // materialize where the firm has a matching obligation (`skipZeroImpact`).
  async function refreshStillOpenWindows(opts: {
    firmId?: string
    now: Date
    origin?: PulseFirmAlertOrigin
  }): Promise<number> {
    const candidates = await db
      .select({ id: pulse.id, changeKind: pulse.changeKind })
      .from(pulse)
      .where(
        and(
          eq(pulse.status, 'approved'),
          inArray(pulse.changeKind, [...STILL_OPEN_CATCHUP_CHANGE_KINDS]),
          ...pulseNotExpiredConditions(opts.now),
        ),
      )
    if (candidates.length === 0) return 0
    let materialized = 0
    for (const candidate of candidates) {
      materialized += await refreshFirmAlertsForPulse(candidate.id, {
        ...(opts.firmId ? { firmIds: [opts.firmId] } : {}),
        preserveStatus: true,
        // Both kinds skip zero-impact here (live approval fan-out stays
        // firm-wide): a protective window materializing count-0 rows for every
        // firm without a single in-scope client is the day-one noise wall in
        // n=1 form — and via the daily sweep it would even count as "new".
        skipZeroImpact: true,
        ...(opts.origin ? { origin: opts.origin } : {}),
      })
    }
    return materialized
  }

  // Shared tail for both pulse-creation paths: load the inserted row, fan out per-active-firm
  // alerts, and queue the review/digest emails.
  async function finalizePulseFanOut(
    pulseId: string,
    opts?: { firmIds?: string[]; preserveStatus?: boolean },
  ): Promise<{ pulseId: string; alertCount: number }> {
    const inserted = await getPulse(pulseId)
    if (!inserted) throw new PulseRepoError('not_found')
    const alertCount = await refreshFirmAlertsForPulse(pulseId, opts)
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
          // Deterministic (no timestamp): uq_email_outbox_external_id dedupes
          // a re-fan-out of the same pulse instead of re-emailing every firm.
          externalId: `pulse-review:${alert.firmId}:${approvedPulse.id}`,
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
      writes.push(
        db
          .insert(emailOutbox)
          .values(chunk)
          .onConflictDoNothing({ target: emailOutbox.externalId }),
      )
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
          isNull(obligationInstance.supersededAt),
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
        // Set on first insert only; onConflictDoUpdate below deliberately omits it
        // so a source's baseline mode is never reset mid-life.
        ...(input.baselineMode ? { baselineMode: input.baselineMode } : {}),
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
        .map((input) =>
          Object.assign(
            {
              sourceId: input.sourceId,
              tier: input.tier,
              jurisdiction: input.jurisdiction,
              enabled: input.enabled ?? true,
              cadenceMs: input.cadenceMs,
            },
            input.baselineMode ? { baselineMode: input.baselineMode } : {},
            {
              healthStatus: 'healthy' as const,
              nextCheckAt: now,
            },
          ),
        )

      if (newRows.length > 0) {
        // Drizzle binds 9 params per row, not the 7 explicit fields: baseline_mode's
        // .default() and updated_at's $onUpdate are bound too. 12-row chunks hit 108
        // params and threw D1's 100-param ceiling on every tick once a deploy added
        // ≥12 sources at once (the 2026-06-08 relief backfill), freezing all fetching.
        // floor(100/9) = 11; use 10 to keep headroom if a column is added later.
        const inserts = chunkRows(newRows, 10).map((chunk) =>
          db.insert(pulseSourceState).values(chunk).onConflictDoNothing({
            target: pulseSourceState.sourceId,
          }),
        )
        await db.batch(toNonEmptyBatch(inserts))
        // Re-read only the freshly inserted ids to return their canonical rows.
        // Chunks are independent point reads, so fan them out in parallel.
        const insertedIds = newRows.map((row) => row.sourceId)
        const rereadChunks = await Promise.all(
          chunkRows(insertedIds, 90).map((chunk) =>
            db.select().from(pulseSourceState).where(inArray(pulseSourceState.sourceId, chunk)),
          ),
        )
        for (const rows of rereadChunks) {
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
      // Derive the visible health from the failure streak — nothing ever wrote
      // 'degraded'/'failing' before, so months-dead sources read healthy in the
      // sources UI. At the 15-min failure retry cap, 12 failures ≈ 3 hours of
      // sustained death. recordSourceSuccess resets to healthy.
      const derivedHealth =
        current?.healthStatus === 'paused'
          ? null
          : consecutiveFailures >= 12
            ? ('failing' as const)
            : consecutiveFailures >= 3
              ? ('degraded' as const)
              : null
      await db
        .update(pulseSourceState)
        .set({
          lastCheckedAt: checkedAt,
          nextCheckAt: input.nextCheckAt,
          consecutiveFailures,
          lastError: input.error.slice(0, 500),
          ...(derivedHealth ? { healthStatus: derivedHealth } : {}),
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
        ingestMethod: input.ingestMethod ?? null,
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

    /**
     * Prior contentHashes recorded for one (sourceId, externalId) item, for the
     * dedupe-rehash migration check in the ingest jobs: "is this insert the
     * item's first dedupeText-based hash, with only legacy whole-page hashes
     * before it?". Covered by the uq_pss_source_external_hash index prefix.
     * The db layer stays agnostic of hash formats — callers inspect prefixes.
     */
    async listItemSnapshotContentHashes(input: {
      sourceId: string
      externalId: string
      excludeId?: string
    }): Promise<string[]> {
      const rows = await db
        .select({ contentHash: pulseSourceSnapshot.contentHash })
        .from(pulseSourceSnapshot)
        .where(
          and(
            eq(pulseSourceSnapshot.sourceId, input.sourceId),
            eq(pulseSourceSnapshot.externalId, input.externalId),
            ...(input.excludeId ? [ne(pulseSourceSnapshot.id, input.excludeId)] : []),
          ),
        )
        .limit(25)
      return rows.map((row) => row.contentHash)
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

    /**
     * Failed snapshots whose failure class is worth re-driving once the AI
     * pipeline is healthy again: transient classes (gateway / credit / budget)
     * plus excerpt-location guard rejections, which stopped being deterministic
     * when the guard learned fuzzy alignment. New failures are written as
     * "CODE: message" (extract.ts); the bare-message patterns cover rows
     * written before that convention. Other deterministic failures (remaining
     * guard rejections, missing source text, out-of-scope, low confidence)
     * never match, so the retry sweep converges instead of cycling them
     * forever. Oldest-touched first: a re-failed row bumps updated_at and
     * rotates to the back of the line.
     */
    async listRetryableFailedSnapshots(input: {
      limit: number
      maxAgeMs: number
      now?: Date
    }): Promise<PulseSourceSnapshotRow[]> {
      const cutoff = new Date((input.now ?? new Date()).getTime() - input.maxAgeMs)
      const limit = Math.min(Math.max(input.limit, 1), 100)
      const rows = await db
        .select()
        .from(pulseSourceSnapshot)
        .where(
          and(
            eq(pulseSourceSnapshot.parseStatus, 'failed'),
            gte(pulseSourceSnapshot.createdAt, cutoff),
            or(
              like(pulseSourceSnapshot.failureReason, 'AI_GATEWAY_ERROR%'),
              like(pulseSourceSnapshot.failureReason, 'AI_UNAVAILABLE%'),
              like(pulseSourceSnapshot.failureReason, 'AI_BUDGET_EXCEEDED%'),
              // Excerpt-grounding rejections became fuzzy-tolerant (P3 batch), so the
              // stranded exact-match-era backlog is worth one re-drive. The Pulse prefix
              // plus the phrase keeps every other guard rejection deterministic-dead
              // (rule-draft guards share the phrase but not the prefix). D1 caps LIKE
              // patterns at 50 chars (SQLITE_LIMIT_LIKE_PATTERN_LENGTH) — longer ones
              // throw "LIKE or GLOB pattern too complex" at runtime.
              like(
                pulseSourceSnapshot.failureReason,
                'GUARD_REJECTED: Pulse%could not be located%',
              ),
              // The stranded backlog itself predates the refusal-code prefix —
              // those rows start with the bare guard message ("…because source
              // excerpt could not be located…"); "source e" keeps the other
              // pulse guard class (no-change) deterministic-dead.
              like(pulseSourceSnapshot.failureReason, 'Pulse extract rejected because source e%'),
              // Legacy rows (pre code-prefix): transport-class messages only.
              like(pulseSourceSnapshot.failureReason, '%requires more credits%'),
              eq(pulseSourceSnapshot.failureReason, 'Pulse extract failed.'),
            ),
          ),
        )
        .orderBy(asc(pulseSourceSnapshot.updatedAt))
        .limit(limit)
      return rows.map(toSnapshot)
    },

    /**
     * Backfill seeding, step 1: the still-in-effect landscape that predates a
     * source's monitoring start lives in the snapshots its baseline scan
     * archived but never extracted (parse_status='ignored',
     * failureReason='monitoring_baseline_established' — see ingest.ts). Also
     * picks up rows already marked 'backfill_seed' but still pending_extract,
     * so a re-run after a partial failure re-queues instead of stranding them.
     */
    async listBackfillSeedCandidates(input: {
      sourceIds: string[]
      limit?: number
    }): Promise<PulseSourceSnapshotRow[]> {
      if (input.sourceIds.length === 0) return []
      const limit = Math.min(Math.max(input.limit ?? 100, 1), 200)
      const rows = await db
        .select()
        .from(pulseSourceSnapshot)
        .where(
          and(
            inArray(pulseSourceSnapshot.sourceId, input.sourceIds),
            or(
              and(
                eq(pulseSourceSnapshot.parseStatus, 'ignored'),
                eq(pulseSourceSnapshot.failureReason, 'monitoring_baseline_established'),
              ),
              and(
                eq(pulseSourceSnapshot.parseStatus, 'pending_extract'),
                eq(pulseSourceSnapshot.ingestMethod, 'backfill_seed'),
              ),
            ),
          ),
        )
        .orderBy(asc(pulseSourceSnapshot.publishedAt))
        .limit(limit)
      return rows.map(toSnapshot)
    },

    /**
     * Backfill seeding, step 2: flip the candidates to pending_extract and tag
     * them ingest_method='backfill_seed' so the extract pipeline routes their
     * pulses through the quiet fan-out (impact-scoped catchup rows, no digest
     * emails). Chunked to stay far below D1's 100-bind-param statement limit.
     */
    async markSnapshotsForBackfillExtract(snapshotIds: string[]): Promise<number> {
      if (snapshotIds.length === 0) return 0
      for (const chunk of chunkRows(snapshotIds, 50)) {
        await db
          .update(pulseSourceSnapshot)
          .set({
            parseStatus: 'pending_extract',
            failureReason: null,
            ingestMethod: 'backfill_seed',
          })
          .where(inArray(pulseSourceSnapshot.id, chunk))
      }
      return snapshotIds.length
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

    // Duplicate-extract re-observation of an already-approved pulse: refresh
    // counts (and reach firms created since approval) but never flip a firm's
    // dismissed/handled alert back to 'matched' — without preserveStatus a
    // re-snapshotted page reset every tenant's handled alerts.
    async refreshFirmAlertsForApprovedPulse(pulseId: string): Promise<number> {
      const row = await getPulse(pulseId)
      if (!row || row.status !== 'approved') return 0
      return refreshFirmAlertsForPulse(pulseId, { preserveStatus: true })
    },

    /**
     * Fold-merge a duplicate AI extract onto its surviving pulse (signature
     * pre-check hit or uq_pulse_dedupe_key loser). The dedupe key is
     * status-blind, so two fan-out-relevant updates can hide in a fold:
     *
     *  • Promotion: the first sighting landed 'quarantined' (< publish floor)
     *    and a later extract of the same event clears it. Without this the
     *    event is suppressed forever — refreshFirmAlertsForApprovedPulse
     *    no-ops on non-approved rows and nothing in production calls
     *    approvePulse. Only a *system*-quarantined survivor (reviewedAt NULL)
     *    is promoted; a human quarantine / reject / revoke decision is never
     *    overridden. Promotion runs the full first-publication fan-out and
     *    queues the firm review messages.
     *  • County expansion: the dated dedupe key deliberately excludes
     *    counties, so relief extended to NEW counties folds here. Union the
     *    incoming counties in — only when both sides are county-scoped (an
     *    empty survivor list means statewide, an empty incoming list is
     *    usually a parse miss; neither should change scope). The caller's
     *    counts refresh then picks the new counties up.
     *
     * Confidence rises to the strongest sighting on promotion; every other
     * extracted field (summary, quote, dates, forms, structuredChange) keeps
     * the survivor's values — they are tied to its aiOutputId / rawR2Key
     * provenance. Idempotent: re-folding the same extract is a no-op.
     */
    async applyDuplicateExtractToPulse(input: {
      pulseId: string
      incomingStatus: PulseStatus
      confidence: number
      parsedCounties: string[]
      fanOutMode?: 'live' | 'quiet'
    }): Promise<{ promoted: boolean; countiesExpanded: boolean; alertCount: number }> {
      const row = await getPulse(input.pulseId)
      if (!row) return { promoted: false, countiesExpanded: false, alertCount: 0 }

      const promoted =
        input.incomingStatus === 'approved' &&
        row.status === 'quarantined' &&
        row.reviewedAt === null

      let mergedCounties: string[] | null = null
      if (row.parsedCounties.length > 0 && input.parsedCounties.length > 0) {
        const seen = new Set(row.parsedCounties.map(normalizeCountyName))
        const added: string[] = []
        for (const county of input.parsedCounties) {
          const key = normalizeCountyName(county)
          if (seen.has(key)) continue
          seen.add(key)
          added.push(county)
        }
        if (added.length > 0) mergedCounties = [...row.parsedCounties, ...added]
      }

      if (!promoted && !mergedCounties) {
        return { promoted: false, countiesExpanded: false, alertCount: 0 }
      }

      await db
        .update(pulse)
        .set({
          ...(promoted
            ? {
                status: 'approved' as const,
                confidence: Math.max(row.confidence, input.confidence),
              }
            : {}),
          ...(mergedCounties ? { parsedCounties: mergedCounties } : {}),
        })
        .where(eq(pulse.id, input.pulseId))

      if (!promoted) return { promoted: false, countiesExpanded: true, alertCount: 0 }
      // First publication of this event: full fan-out + review messages, like
      // an extract that landed approved. preserveStatus is defense-in-depth —
      // a system-quarantined pulse has never fanned out, so there is no firm
      // alert status to reset. A quiet (backfill-seed) promotion materializes
      // impact-scoped catchup rows and skips the messages — the event is
      // months old; only firms it actually touches should see it, as state.
      if (input.fanOutMode === 'quiet') {
        const alertCount = await refreshFirmAlertsForPulse(input.pulseId, {
          preserveStatus: true,
          skipZeroImpact: true,
          origin: 'catchup',
        })
        return { promoted: true, countiesExpanded: mergedCounties !== null, alertCount }
      }
      const fanOut = await finalizePulseFanOut(input.pulseId, { preserveStatus: true })
      return {
        promoted: true,
        countiesExpanded: mergedCounties !== null,
        alertCount: fanOut.alertCount,
      }
    },

    /**
     * Opt-in catch-up: bring ONE firm up to the still-open, high-value regulatory
     * landscape it missed by joining (or importing clients) after a change was
     * approved — the live fan-out only reaches firms that exist at approval time.
     *
     * Scoped to protective-claim windows + unexpired deadline shifts and routed
     * through the live fan-out (`refreshStillOpenWindows`) so counts are real, not
     * zero. This replaces the old unscoped, count-0 backfill that surfaced ~30
     * firm-wide noise alerts on day one. Idempotent and dismiss-safe.
     *
     * Rows materialize as origin='catchup' — state, not news: the firm joined
     * after the change was published, so it must not count as "new" on
     * splash/brief, and renders in the pinned "Already in effect" band. The
     * daily all-firms sweep keeps origin='live' — a row appearing there is a
     * fresh development for an existing firm (e.g. a newly added client in a
     * relief county) and "new" is its only notification channel.
     */
    async backfillFirmAlertsForActiveLandscape(
      firmId: string,
      now: Date = new Date(),
    ): Promise<number> {
      return refreshStillOpenWindows({ firmId, now, origin: 'catchup' })
    },

    /**
     * Periodic sweep: re-fan-out every still-open, high-value window to ALL active
     * firms. Reaches firms that joined after approval and refreshes counts as
     * clients are added, without resurrecting dismissed alerts. Driven
     * daily from the cron tick.
     */
    async refreshStillOpenWindowsForAllFirms(now: Date = new Date()): Promise<number> {
      return refreshStillOpenWindows({ now })
    },

    /**
     * Count source-snapshot extraction outcomes inside a recent window, for the
     * cron health canary. `extracted` = the AI extractor produced a pulse;
     * `failed` = it errored (gateway/credits, excerpt reject, schema). A high
     * failed / (extracted + failed) ratio means the extraction pipeline is
     * degraded — the signal the 2026-06 multi-day outage silently lacked.
     */
    async countRecentExtractionOutcomes(input: { sinceMs: number; now?: Date }): Promise<{
      extracted: number
      failed: number
      total: number
    }> {
      const cutoff = new Date((input.now ?? new Date()).getTime() - input.sinceMs)
      const rows = await db
        .select({ parseStatus: pulseSourceSnapshot.parseStatus, n: rowCount() })
        .from(pulseSourceSnapshot)
        .where(gte(pulseSourceSnapshot.createdAt, cutoff))
        .groupBy(pulseSourceSnapshot.parseStatus)
      let extracted = 0
      let failed = 0
      let total = 0
      for (const row of rows) {
        total += row.n
        if (row.parseStatus === 'extracted') extracted += row.n
        if (row.parseStatus === 'failed') failed += row.n
      }
      return { extracted, failed, total }
    },

    async createPulseForFirmReviewFromExtract(
      input: PulseExtractInput,
    ): Promise<{ pulseId: string; alertCount: number; deduped: boolean }> {
      const pulseId = crypto.randomUUID()
      const changeKind = input.changeKind ?? 'deadline_shift'
      const status = input.status ?? 'approved'
      // Canonical event key only for AI extracts (input.dedupe). Deterministic
      // callers leave it NULL so they keep their snapshot-contentHash idempotency
      // and never collide on the unique index.
      const dedupeKey = input.dedupe
        ? computePulseDedupeKey({
            parsedJurisdiction: input.parsedJurisdiction,
            changeKind,
            parsedOriginalDueDate: input.parsedOriginalDueDate,
            parsedNewDueDate: input.parsedNewDueDate,
            parsedForms: input.parsedForms,
            parsedCounties: input.parsedCounties,
            structuredChange: input.structuredChange,
            publishedAt: input.publishedAt,
          })
        : null
      const pulseRow: NewPulse = {
        id: pulseId,
        source: input.source,
        sourceUrl: input.sourceUrl,
        rawR2Key: input.rawR2Key ?? null,
        publishedAt: input.publishedAt,
        changeKind,
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
        protectiveActionDeadline: input.protectiveActionDeadline ?? null,
        affectedRuleIdsJson: input.affectedRuleIds ?? [],
        reverifyRuleIdsJson: input.reverifyRuleIds ?? [],
        structuredChangeJson: input.structuredChange ?? null,
        dedupeKey,
        confidence: input.confidence,
        status,
        reviewedBy: null,
        reviewedAt: null,
        requiresHumanReview: input.requiresHumanReview ?? true,
        isSample: input.isSample ?? false,
      }
      // Race-safe insert: a sibling extraction that already created this event's
      // row wins on uq_pulse_dedupe_key and this one no-ops. Re-read by key to
      // learn who won (mirrors createSourceSnapshot's onConflict + re-select).
      await db.insert(pulse).values(pulseRow).onConflictDoNothing({ target: pulse.dedupeKey })
      if (dedupeKey) {
        const rows = await db
          .select({ id: pulse.id })
          .from(pulse)
          .where(eq(pulse.dedupeKey, dedupeKey))
          .limit(1)
        const winnerId = rows[0]?.id ?? pulseId
        if (winnerId !== pulseId) {
          await db
            .update(pulseSourceSnapshot)
            .set({
              parseStatus: 'duplicate',
              pulseId: winnerId,
              aiOutputId: input.aiOutputId ?? null,
              failureReason: null,
            })
            .where(eq(pulseSourceSnapshot.id, input.snapshotId))
          return { pulseId: winnerId, alertCount: 0, deduped: true }
        }
      }
      await db
        .update(pulseSourceSnapshot)
        .set({
          parseStatus: 'extracted',
          pulseId,
          aiOutputId: input.aiOutputId ?? null,
          failureReason: null,
        })
        .where(eq(pulseSourceSnapshot.id, input.snapshotId))
      // Quarantined (low-confidence) alerts are retained for review but never
      // fanned out to firms — refreshFirmAlertsForPulse requires 'approved'.
      if (status !== 'approved') {
        return { pulseId, alertCount: 0, deduped: false }
      }
      // Quiet fan-out (backfill seeds): a months-old announcement that is
      // still in effect must not blast digest emails / notifications to every
      // firm or read as firm-wide news — impact-scoped catchup rows only.
      if (input.fanOutMode === 'quiet') {
        const alertCount = await refreshFirmAlertsForPulse(pulseId, {
          preserveStatus: true,
          skipZeroImpact: true,
          origin: 'catchup',
        })
        return { pulseId, alertCount, deduped: false }
      }
      const fanOut = await finalizePulseFanOut(pulseId)
      return { ...fanOut, deduped: false }
    },

    /**
     * Create a rule_source_drift Alert that is NOT tied to a freshly-fetched source snapshot — used
     * by the catalog-level rule-date reconciliation (gap #5) to surface a verified rule whose literal
     * due date is stale or contradicts its cited excerpt. Same per-active-firm fan-out + review
     * messaging as the snapshot-driven path; it just skips the snapshot bookkeeping.
     */
    async createRuleSourceDriftPulse(
      input: {
        sourceId: string
        sourceUrl: string
        parsedJurisdiction: string
        // Scope of the changed rule(s) — tax-code identifiers (e.g.
        // 'federal_1065') and entity types (e.g. 'partnership'). Surfaced in
        // the alert's Scope module so CPAs see which forms / entities the
        // re-verify touches. Default empty for callers that don't scope.
        parsedForms?: string[]
        parsedEntityTypes?: string[]
        reverifyRuleIds: string[]
        aiSummary: string
        verbatimQuote: string
        publishedAt: Date
        structuredChange?: unknown
      },
      opts?: { firmIds?: string[] },
    ): Promise<{ pulseId: string; alertCount: number }> {
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
        parsedForms: input.parsedForms ?? [],
        parsedEntityTypes: input.parsedEntityTypes ?? [],
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
      return finalizePulseFanOut(pulseId, opts)
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
              // Deterministic (no timestamp): a re-approve dedupes on
              // uq_email_outbox_external_id instead of re-emailing every firm.
              externalId: `pulse-approved:${alert.firmId}:${input.pulseId}`,
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
          // onConflictDoNothing also keeps a uniqueness throw from rolling
          // back the whole atomic approval batch (audits + notifications).
          writes.push(
            db
              .insert(emailOutbox)
              .values(chunk)
              .onConflictDoNothing({ target: emailOutbox.externalId }),
          )
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
