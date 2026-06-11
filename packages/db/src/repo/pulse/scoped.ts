import {
  and,
  asc,
  count as sqlCount,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
} from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Db } from '../../client'
import {
  auditEvent,
  evidenceLink,
  type NewAuditEvent,
  type NewEvidenceLink,
} from '../../schema/audit'
import { member, user } from '../../schema/auth'
import { client, clientFilingProfile } from '../../schema/clients'
import { emailOutbox, type NewEmailOutbox } from '../../schema/notifications'
import { obligationInstance } from '../../schema/obligations'
import {
  exceptionRule,
  obligationExceptionApplication,
  type NewExceptionRule,
  type NewObligationExceptionApplication,
} from '../../schema/overlay'
import {
  pulse,
  pulseAlertNote,
  pulseApplication,
  pulseFirmAlert,
  pulsePriorityReview,
  pulseSourceState,
  type NewPulse,
  type NewPulseAlertNote,
  type NewPulseApplication,
  type NewPulseFirmAlert,
  type NewPulsePriorityReview,
  type PulseFirmAlertStatus,
  type PulsePriorityReviewStatus,
} from '../../schema/pulse'
import { listActiveOverlayDueDates } from '../overlay'
import { isOpenObligationStatus } from '@duedatehq/core/obligation-workflow'
import {
  APPLICATION_BATCH_SIZE,
  AUDIT_BATCH_SIZE,
  EMAIL_BATCH_SIZE,
  EVIDENCE_BATCH_SIZE,
  EXCEPTION_APPLICATION_BATCH_SIZE,
  EXCEPTION_RULE_BATCH_SIZE,
  ID_FILTER_BATCH_SIZE,
  OPEN_STATUSES,
  PULSE_DISMISS_DEFAULT_AUDIT_REASON,
  PULSE_HANDLED_ALERT_STATUSES,
  PULSE_MARK_REVIEWED_DEFAULT_AUDIT_REASON,
  PulseRepoError,
  REVERT_WINDOW_MS,
  applicationStatus,
  applyReadinessForAlert,
  chunkRows,
  compareAffected,
  deadlineSelectionReviewFromStructuredChange,
  deadlineSelectionSnapshotsById,
  displayCounty,
  duplicateSourceSnapshotCountForPulse,
  firstAppliedAtForPulse,
  hasCompleteStructuredDueDateScope,
  isDueDateOverlayAlert,
  isHandledFirmAlertStatus,
  normalizeCountyName,
  normalizePriorityNote,
  rowMatchesCounty,
  sameTimestamp,
  scorePulsePriority,
  toAlert,
  toClientEntityTypes,
  toDateOnly,
  toDateOnlyOrNull,
  toNonEmptyBatch,
  toPriorityReview,
  toSourceState,
  uniqueStrings,
  withDeadlineSelectionReview,
} from './shared'
import { taxAreaForTaxType } from '@duedatehq/core/tax-area'
import {
  makePulseOpsRepo,
  PROTECTIVE_CLAIM_REVIEW_STATUSES,
  PROTECTIVE_CLAIM_TAX_AREAS,
  protectiveClaimTaxYears,
  pulseExpiredCondition,
  pulseNotExpiredConditions,
} from './ops'
import type {
  AlertJoinedRow,
  AlertRecipientRow,
  ApplicationRow,
  PulseAddAlertNoteInput,
  PulseAlertNoteRow,
  CandidateRow,
  DeadlineSelectionReviewSnapshot,
  EffectiveCandidateRow,
  PriorityReviewJoinedRow,
  PulseAffectedClientRow,
  PulseAlertRow,
  PulseApplyResult,
  PulseDetailRow,
  PulseDismissResult,
  PulseDueDateOverlayDetailsReviewInput,
  PulseHandledFirmAlertStatus,
  PulsePriorityQueueItemRow,
  PulsePriorityReviewRow,
  PulseRevertResult,
  PulseRuleMatchRow,
  PulseSeedInput,
  PulseSourceSnapshotRow,
  PulseSourceStateRow,
} from './shared'

// Keyset cursor for the active + history alert lists. Both order by
// (pulse.publishedAt DESC, pulseFirmAlert.id DESC) — publishedAt is an
// immutable `timestamp_ms` so the cursor is stable across the 60s poll
// (unlike pulseFirmAlert.updatedAt, which mutates and would skip/duplicate
// rows mid-pagination — the same reason obligation-queue disables cursors
// for its `updated_desc` sort). `id` is the unique tiebreaker so same-ms
// publishedAt rows page deterministically. Encoded opaque (base64url) so
// callers can't construct positions — mirrors notifications/audit repos.
interface PulseAlertCursor {
  publishedAt: Date
  id: string
}

function encodePulseAlertCursor(row: PulseAlertCursor): string {
  return Buffer.from(`${row.publishedAt.toISOString()}|${row.id}`, 'utf8').toString('base64url')
}

function decodePulseAlertCursor(cursor: string): PulseAlertCursor | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const separator = raw.indexOf('|')
    if (separator === -1) return null
    const iso = raw.slice(0, separator)
    const id = raw.slice(separator + 1)
    if (!iso || !id) return null
    const publishedAt = new Date(iso)
    if (Number.isNaN(publishedAt.getTime())) return null
    return { publishedAt, id }
  } catch {
    return null
  }
}

// The denormalized card counts as a pure function of a freshly-built detail:
// matched = applyable eligible rows, needs-review = rows pending county
// confirmation — gated on apply-readiness so a not-yet-scoped overlay reads 0,
// matching the drawer (which can't apply yet). Extracted so the mutation-time
// refresh and the read-time reconcile (getDetail) share ONE definition and
// can't diverge. review_only / protective alerts are never apply-ready, so
// this returns 0 for them — only call it for due_date_overlay alerts.
function liveAlertCounts(
  detail: PulseDetailRow,
  alert: AlertJoinedRow,
): { matchedCount: number; needsReviewCount: number } {
  const countable = detail.applyReadiness.status === 'ready' || alert.alertStatus === 'applied'
  return {
    matchedCount: countable
      ? detail.affectedClients.filter((row) => row.matchStatus === 'eligible').length
      : 0,
    needsReviewCount: countable
      ? detail.affectedClients.filter((row) => row.matchStatus === 'needs_review').length
      : 0,
  }
}

export function makePulseRepo(db: Db, firmId: string) {
  async function getAlert(
    alertId: string,
    opts: { includeSourceRevoked?: boolean } = {},
  ): Promise<AlertJoinedRow> {
    const rows = await db
      .select({
        alertId: pulseFirmAlert.id,
        pulseId: pulse.id,
        alertStatus: pulseFirmAlert.status,
        matchedCount: pulseFirmAlert.matchedCount,
        needsReviewCount: pulseFirmAlert.needsReviewCount,
        source: pulse.source,
        sourceUrl: pulse.sourceUrl,
        publishedAt: pulse.publishedAt,
        changeKind: pulse.changeKind,
        actionMode: pulse.actionMode,
        aiSummary: pulse.aiSummary,
        verbatimQuote: pulse.verbatimQuote,
        parsedJurisdiction: pulse.parsedJurisdiction,
        parsedCounties: pulse.parsedCounties,
        parsedForms: pulse.parsedForms,
        parsedEntityTypes: pulse.parsedEntityTypes,
        parsedOriginalDueDate: pulse.parsedOriginalDueDate,
        parsedNewDueDate: pulse.parsedNewDueDate,
        parsedEffectiveFrom: pulse.parsedEffectiveFrom,
        parsedEffectiveUntil: pulse.parsedEffectiveUntil,
        affectedRuleIds: pulse.affectedRuleIdsJson,
        reverifyRuleIds: pulse.reverifyRuleIdsJson,
        structuredChange: pulse.structuredChangeJson,
        confidence: pulse.confidence,
        pulseStatus: pulse.status,
        reviewedBy: pulse.reviewedBy,
        reviewedAt: pulse.reviewedAt,
        isSample: pulse.isSample,
        duplicateSourceSnapshotCount: duplicateSourceSnapshotCountForPulse(),
        // Lifecycle timestamps for the status chip suffix — detail only.
        dismissedAt: pulseFirmAlert.dismissedAt,
        appliedAt: firstAppliedAtForPulse(firmId),
      })
      .from(pulseFirmAlert)
      .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
      .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, alertId)))
      .limit(1)

    const row = rows[0]
    const allowed =
      row?.pulseStatus === 'approved' ||
      (opts.includeSourceRevoked === true && row?.pulseStatus === 'source_revoked')
    if (!row || !allowed) throw new PulseRepoError('not_found')
    return row
  }

  async function withEffectiveDueDates<T extends CandidateRow>(
    rows: readonly T[],
  ): Promise<Array<T & EffectiveCandidateRow>> {
    const overlays = await listActiveOverlayDueDates(
      db,
      firmId,
      rows.map((row) => row.obligationId),
    )
    return rows.map((row) => ({
      ...row,
      baseCurrentDueDate: row.currentDueDate,
      currentDueDate: overlays.get(row.obligationId) ?? row.currentDueDate,
    }))
  }

  function rowHasRelevantDueDate(row: EffectiveCandidateRow, alert: AlertJoinedRow): boolean {
    return (
      sameTimestamp(row.currentDueDate, alert.parsedOriginalDueDate) ||
      sameTimestamp(row.baseCurrentDueDate, alert.parsedOriginalDueDate) ||
      sameTimestamp(row.currentDueDate, alert.parsedNewDueDate)
    )
  }

  function rowAlreadyHasOverlay(row: EffectiveCandidateRow, alert: AlertJoinedRow): boolean {
    return (
      !sameTimestamp(row.currentDueDate, alert.parsedOriginalDueDate) &&
      (sameTimestamp(row.baseCurrentDueDate, alert.parsedOriginalDueDate) ||
        sameTimestamp(row.currentDueDate, alert.parsedNewDueDate))
    )
  }

  async function listCandidateRows(alert: AlertJoinedRow): Promise<PulseAffectedClientRow[]> {
    if (!isDueDateOverlayAlert(alert)) return []
    const forms = alert.parsedForms
    const entityTypes = toClientEntityTypes(alert.parsedEntityTypes)
    if (
      forms.length === 0 ||
      entityTypes.length === 0 ||
      !alert.parsedOriginalDueDate ||
      !alert.parsedNewDueDate
    ) {
      return []
    }

    const rows = await db
      .select({
        obligationId: obligationInstance.id,
        clientId: client.id,
        clientName: client.name,
        state: obligationInstance.jurisdiction,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
        entityType: client.entityType,
        taxType: obligationInstance.taxType,
        currentDueDate: obligationInstance.currentDueDate,
        status: obligationInstance.status,
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
          eq(obligationInstance.jurisdiction, alert.parsedJurisdiction),
          inArray(client.entityType, entityTypes),
          inArray(obligationInstance.taxType, forms),
          inArray(obligationInstance.status, OPEN_STATUSES),
          // A soft-deleted client is no longer "affected" by a regulatory change.
          // Mirror the rest of the app (queue/dashboard/calendar all filter
          // `deletedAt`): without this, a deleted client's still-open obligation
          // lingers in the alert's affected list and could even be applied.
          isNull(client.deletedAt),
          isNull(obligationInstance.supersededAt),
        ),
      )
      .orderBy(asc(obligationInstance.currentDueDate), asc(client.name))

    const counties = new Set(alert.parsedCounties.map(normalizeCountyName))
    const effectiveRows = await withEffectiveDueDates(rows as CandidateRow[])
    return effectiveRows
      .map((row): PulseAffectedClientRow | null => {
        if (!rowHasRelevantDueDate(row, alert)) return null
        if (rowAlreadyHasOverlay(row, alert)) {
          return {
            obligationId: row.obligationId,
            clientId: row.clientId,
            clientName: row.clientName,
            state: row.state,
            county: displayCounty(row),
            entityType: row.entityType,
            taxType: row.taxType,
            currentDueDate: row.currentDueDate,
            status: row.status,
            newDueDate: alert.parsedNewDueDate,
            matchStatus: 'already_applied',
            reason: 'This obligation already has an active due-date overlay.',
          }
        }
        if (counties.size > 0) {
          const countyMatch = rowMatchesCounty(row, counties)
          if (countyMatch === 'missing') {
            return {
              obligationId: row.obligationId,
              clientId: row.clientId,
              clientName: row.clientName,
              state: row.state,
              county: displayCounty(row),
              entityType: row.entityType,
              taxType: row.taxType,
              currentDueDate: row.currentDueDate,
              status: row.status,
              newDueDate: alert.parsedNewDueDate,
              matchStatus: 'needs_review',
              reason: 'Client county is missing; confirm county applicability before applying.',
            }
          }
          if (countyMatch === 'miss') return null
        }

        return {
          obligationId: row.obligationId,
          clientId: row.clientId,
          clientName: row.clientName,
          state: row.state,
          county: displayCounty(row),
          entityType: row.entityType,
          taxType: row.taxType,
          currentDueDate: row.currentDueDate,
          status: row.status,
          newDueDate: alert.parsedNewDueDate,
          matchStatus: 'eligible',
          reason: null,
        }
      })
      .filter((row): row is PulseAffectedClientRow => row !== null)
  }

  // Rule-change / source-drift alerts: the "affected clients" are those with an OPEN
  // obligation backed by one of the reverify rules. Flagged needs_review (re-verify the
  // rule), not a date overlay — review_only alerts never shift dates.
  async function listReverifyRuleAffectedRows(
    alert: AlertJoinedRow,
  ): Promise<PulseAffectedClientRow[]> {
    const ruleIds = alert.reverifyRuleIds
    if (ruleIds.length === 0) return []

    // Chunked: reverifyRuleIds is merged cumulatively into the pulse with no
    // cap, so the id list is unbounded.
    const rowGroups = await Promise.all(
      chunkRows(ruleIds, ID_FILTER_BATCH_SIZE).map((chunk) =>
        db
          .select({
            obligationId: obligationInstance.id,
            clientId: client.id,
            clientName: client.name,
            state: obligationInstance.jurisdiction,
            county: client.county,
            counties: clientFilingProfile.countiesJson,
            entityType: client.entityType,
            taxType: obligationInstance.taxType,
            currentDueDate: obligationInstance.currentDueDate,
            status: obligationInstance.status,
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
              inArray(obligationInstance.ruleId, chunk),
              inArray(obligationInstance.status, OPEN_STATUSES),
              // Exclude soft-deleted clients (see listCandidateRows).
              isNull(client.deletedAt),
              isNull(obligationInstance.supersededAt),
            ),
          )
          .orderBy(asc(obligationInstance.currentDueDate), asc(client.name)),
      ),
    )
    const rows = rowGroups.flat()

    return (rows as CandidateRow[]).map((row) => ({
      obligationId: row.obligationId,
      clientId: row.clientId,
      clientName: row.clientName,
      state: row.state,
      county: displayCounty(row),
      entityType: row.entityType,
      taxType: row.taxType,
      currentDueDate: row.currentDueDate,
      status: row.status,
      newDueDate: null,
      matchStatus: 'needs_review',
      reason: 'This rule changed in the library — re-verify before relying on it.',
    }))
  }

  // Review-only protective-claim windows: surface this firm's clients whose
  // covered-year FED obligations (income / payroll / info) make them candidates
  // for a protective refund claim. Mirrors the rough scan that computes the
  // alert's needsReviewCount in the live fan-out (repo/pulse/ops), so the detail
  // list and the count stay consistent. All are 'needs_review' — protective
  // claims are advisory, never auto-applied.
  async function listProtectiveClaimAffectedRows(
    alert: AlertJoinedRow,
  ): Promise<PulseAffectedClientRow[]> {
    const taxYears = protectiveClaimTaxYears(alert.structuredChange)
    if (taxYears.length === 0) return []
    const rows = await db
      .select({
        obligationId: obligationInstance.id,
        clientId: client.id,
        clientName: client.name,
        state: obligationInstance.jurisdiction,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
        entityType: client.entityType,
        taxType: obligationInstance.taxType,
        currentDueDate: obligationInstance.currentDueDate,
        status: obligationInstance.status,
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
          eq(obligationInstance.jurisdiction, 'FED'),
          inArray(obligationInstance.taxYear, taxYears),
          inArray(obligationInstance.status, PROTECTIVE_CLAIM_REVIEW_STATUSES),
          isNull(client.deletedAt),
          isNull(obligationInstance.supersededAt),
        ),
      )
      .orderBy(asc(client.name), asc(obligationInstance.taxType))

    return (rows as CandidateRow[])
      .filter((row) => {
        const taxArea = taxAreaForTaxType(row.taxType)
        return taxArea != null && PROTECTIVE_CLAIM_TAX_AREAS.has(taxArea)
      })
      .map((row) => ({
        obligationId: row.obligationId,
        clientId: row.clientId,
        clientName: row.clientName,
        state: row.state,
        county: displayCounty(row),
        entityType: row.entityType,
        taxType: row.taxType,
        currentDueDate: row.currentDueDate,
        status: row.status,
        newDueDate: null,
        matchStatus: 'needs_review',
        reason:
          'Filed in a covered year — review whether a protective claim is needed by the deadline.',
      }))
  }

  async function listDeadlineSelectionCandidateRows(
    alert: AlertJoinedRow,
  ): Promise<PulseAffectedClientRow[]> {
    if (!isDueDateOverlayAlert(alert)) return []

    const rows = await db
      .select({
        obligationId: obligationInstance.id,
        clientId: client.id,
        clientName: client.name,
        state: obligationInstance.jurisdiction,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
        entityType: client.entityType,
        taxType: obligationInstance.taxType,
        currentDueDate: obligationInstance.currentDueDate,
        status: obligationInstance.status,
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
          eq(obligationInstance.jurisdiction, alert.parsedJurisdiction),
          inArray(obligationInstance.status, OPEN_STATUSES),
          isNull(client.deletedAt),
          isNull(obligationInstance.supersededAt),
        ),
      )
      .orderBy(asc(obligationInstance.currentDueDate), asc(client.name))

    const activeApplicationIds = await listActiveApplicationIds(
      alert.pulseId,
      rows.map((row) => row.obligationId),
    )
    const forms = new Set(alert.parsedForms)
    const entityTypes = new Set(toClientEntityTypes(alert.parsedEntityTypes))
    const counties = new Set(alert.parsedCounties.map(normalizeCountyName))
    const effectiveRows = await withEffectiveDueDates(rows as CandidateRow[])
    return effectiveRows
      .filter((row) => !activeApplicationIds.has(row.obligationId))
      .map((row): PulseAffectedClientRow & { rank: number } => {
        let rank = 0
        if (forms.has(row.taxType)) rank += 4
        if (entityTypes.has(row.entityType)) rank += 3
        if (sameTimestamp(row.currentDueDate, alert.parsedOriginalDueDate)) rank += 2
        if (counties.size > 0 && rowMatchesCounty(row, counties) === 'match') rank += 1
        return {
          obligationId: row.obligationId,
          clientId: row.clientId,
          clientName: row.clientName,
          state: row.state,
          county: displayCounty(row),
          entityType: row.entityType,
          taxType: row.taxType,
          currentDueDate: row.currentDueDate,
          status: row.status,
          newDueDate: alert.parsedNewDueDate,
          matchStatus: 'eligible',
          reason: null,
          rank,
        }
      })
      .toSorted((left, right) => {
        const rankDelta = right.rank - left.rank
        if (rankDelta !== 0) return rankDelta
        return compareAffected(left, right)
      })
  }

  async function listSelectedDeadlineRows(
    alert: AlertJoinedRow,
    selectedObligationIds: readonly string[],
  ): Promise<PulseAffectedClientRow[]> {
    if (!isDueDateOverlayAlert(alert) || selectedObligationIds.length === 0) return []

    const rows = await withEffectiveDueDates(await listSelectedRows(selectedObligationIds))
    const activeApplicationIds = await listActiveApplicationIds(
      alert.pulseId,
      selectedObligationIds,
    )
    const snapshots = deadlineSelectionSnapshotsById(
      deadlineSelectionReviewFromStructuredChange(alert.structuredChange),
    )
    return rows
      .filter((row) => {
        if (row.state !== alert.parsedJurisdiction) return false
        if (!isOpenObligationStatus(row.status)) return false
        if (activeApplicationIds.has(row.obligationId)) return false
        const snapshot = snapshots.get(row.obligationId)
        if (snapshot && snapshot.currentDueDate !== toDateOnly(row.currentDueDate)) return false
        return true
      })
      .map(
        (row): PulseAffectedClientRow => ({
          obligationId: row.obligationId,
          clientId: row.clientId,
          clientName: row.clientName,
          state: row.state,
          county: displayCounty(row),
          entityType: row.entityType,
          taxType: row.taxType,
          currentDueDate: row.currentDueDate,
          status: row.status,
          newDueDate: alert.parsedNewDueDate,
          matchStatus: 'eligible',
          reason: null,
        }),
      )
      .toSorted(compareAffected)
  }

  async function listApplicationRows(pulseId: string): Promise<PulseAffectedClientRow[]> {
    const rows = await db
      .select({
        id: pulseApplication.id,
        obligationId: pulseApplication.obligationInstanceId,
        clientId: pulseApplication.clientId,
        clientName: client.name,
        state: obligationInstance.jurisdiction,
        county: client.county,
        counties: clientFilingProfile.countiesJson,
        entityType: client.entityType,
        taxType: obligationInstance.taxType,
        currentDueDate: obligationInstance.currentDueDate,
        status: obligationInstance.status,
        appliedAt: pulseApplication.appliedAt,
        revertedAt: pulseApplication.revertedAt,
        beforeDueDate: pulseApplication.beforeDueDate,
        afterDueDate: pulseApplication.afterDueDate,
      })
      .from(pulseApplication)
      .innerJoin(
        obligationInstance,
        eq(pulseApplication.obligationInstanceId, obligationInstance.id),
      )
      .innerJoin(client, eq(pulseApplication.clientId, client.id))
      .leftJoin(
        clientFilingProfile,
        eq(obligationInstance.clientFilingProfileId, clientFilingProfile.id),
      )
      .where(and(eq(pulseApplication.firmId, firmId), eq(pulseApplication.pulseId, pulseId)))
      .orderBy(asc(client.name), asc(pulseApplication.appliedAt))

    const overlays = await listActiveOverlayDueDates(
      db,
      firmId,
      rows.map((row) => row.obligationId),
    )

    return rows.map((row: ApplicationRow) => ({
      obligationId: row.obligationId,
      clientId: row.clientId,
      clientName: row.clientName,
      state: row.state,
      county: displayCounty(row),
      entityType: row.entityType,
      taxType: row.taxType,
      currentDueDate: overlays.get(row.obligationId) ?? row.currentDueDate,
      newDueDate: row.afterDueDate,
      status: row.status,
      matchStatus: applicationStatus(row),
      reason: row.revertedAt ? 'This Pulse application has been reverted.' : 'Already applied.',
    }))
  }

  async function listSelectedRows(obligationIds: readonly string[]): Promise<CandidateRow[]> {
    if (obligationIds.length === 0) return []

    // Chunked: the contract allows 100 selected obligations, and N ids + the
    // scalar binds would exceed D1's 100-bound-param ceiling in one statement.
    const chunks = await Promise.all(
      chunkRows(obligationIds, ID_FILTER_BATCH_SIZE).map((chunk) =>
        db
          .select({
            obligationId: obligationInstance.id,
            clientId: client.id,
            clientName: client.name,
            state: obligationInstance.jurisdiction,
            county: client.county,
            counties: clientFilingProfile.countiesJson,
            entityType: client.entityType,
            taxType: obligationInstance.taxType,
            currentDueDate: obligationInstance.currentDueDate,
            status: obligationInstance.status,
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
              inArray(obligationInstance.id, chunk),
              // Exclude soft-deleted clients (see listCandidateRows). At apply time
              // `listFreshEligibleRows` treats a now-missing row as a conflict, so a
              // client deleted after selection surfaces the standard "list changed,
              // refresh" guard instead of silently applying to a dead client. A
              // superseded obligation drops out the same way — it must not be
              // applyable once a reclassification soft-removed it.
              isNull(client.deletedAt),
              isNull(obligationInstance.supersededAt),
            ),
          )
          .orderBy(asc(obligationInstance.currentDueDate), asc(client.name)),
      ),
    )
    // Per-chunk ORDER BY is no longer a global order — restore it in JS.
    return chunks
      .flat()
      .toSorted(
        (a, b) =>
          a.currentDueDate.getTime() - b.currentDueDate.getTime() ||
          a.clientName.localeCompare(b.clientName),
      )
  }

  async function listActiveApplicationIds(
    pulseId: string,
    obligationIds: readonly string[],
  ): Promise<Set<string>> {
    if (obligationIds.length === 0) return new Set()

    // Chunked: one caller passes ALL open obligations in the alert's
    // jurisdiction, which is unbounded.
    const rowGroups = await Promise.all(
      chunkRows(obligationIds, ID_FILTER_BATCH_SIZE).map((chunk) =>
        db
          .select({ obligationId: pulseApplication.obligationInstanceId })
          .from(pulseApplication)
          .where(
            and(
              eq(pulseApplication.firmId, firmId),
              eq(pulseApplication.pulseId, pulseId),
              inArray(pulseApplication.obligationInstanceId, chunk),
              isNull(pulseApplication.revertedAt),
            ),
          )
          .orderBy(asc(pulseApplication.appliedAt)),
      ),
    )

    return new Set(rowGroups.flat().map((row) => row.obligationId))
  }

  async function listRevertedApplicationIds(
    pulseId: string,
    obligationIds: readonly string[],
  ): Promise<Map<string, string>> {
    if (obligationIds.length === 0) return new Map()

    // Chunks partition the id list, so all rows for one obligation arrive in
    // one chunk and the intra-chunk appliedAt-ordered last-write-wins Map
    // semantics are preserved.
    const rowGroups = await Promise.all(
      chunkRows(obligationIds, ID_FILTER_BATCH_SIZE).map((chunk) =>
        db
          .select({
            id: pulseApplication.id,
            obligationId: pulseApplication.obligationInstanceId,
          })
          .from(pulseApplication)
          .where(
            and(
              eq(pulseApplication.firmId, firmId),
              eq(pulseApplication.pulseId, pulseId),
              inArray(pulseApplication.obligationInstanceId, chunk),
              isNotNull(pulseApplication.revertedAt),
            ),
          )
          .orderBy(asc(pulseApplication.appliedAt)),
      ),
    )

    return new Map(rowGroups.flat().map((row) => [row.obligationId, row.id]))
  }

  async function listFreshEligibleRows(
    alert: AlertJoinedRow,
    obligationIds: readonly string[],
  ): Promise<PulseAffectedClientRow[]> {
    if (obligationIds.length === 0) throw new PulseRepoError('no_eligible')

    const rows = await withEffectiveDueDates(await listSelectedRows(obligationIds))
    const rowsById = new Map(rows.map((row) => [row.obligationId, row]))
    if (rowsById.size !== obligationIds.length) throw new PulseRepoError('conflict')

    const activeApplicationIds = await listActiveApplicationIds(alert.pulseId, obligationIds)
    const snapshots = deadlineSelectionSnapshotsById(
      deadlineSelectionReviewFromStructuredChange(alert.structuredChange),
    )

    return obligationIds.map((obligationId) => {
      const row = rowsById.get(obligationId)
      if (!row) throw new PulseRepoError('conflict')
      if (activeApplicationIds.has(row.obligationId)) throw new PulseRepoError('conflict')
      if (row.state !== alert.parsedJurisdiction) throw new PulseRepoError('conflict')
      if (!isOpenObligationStatus(row.status)) throw new PulseRepoError('conflict')
      const snapshot = snapshots.get(row.obligationId)
      if (snapshot && snapshot.currentDueDate !== toDateOnly(row.currentDueDate)) {
        throw new PulseRepoError('conflict')
      }

      return {
        obligationId: row.obligationId,
        clientId: row.clientId,
        clientName: row.clientName,
        state: row.state,
        county: displayCounty(row),
        entityType: row.entityType,
        taxType: row.taxType,
        currentDueDate: row.currentDueDate,
        status: row.status,
        newDueDate: alert.parsedNewDueDate,
        matchStatus: 'eligible',
        reason: null,
      }
    })
  }

  async function buildDetail(alert: AlertJoinedRow): Promise<PulseDetailRow> {
    const affected = new Map<string, PulseAffectedClientRow>()
    let affectedDeadlinesConfirmed = false
    const deadlineSelectionReview = deadlineSelectionReviewFromStructuredChange(
      alert.structuredChange,
    )
    if (deadlineSelectionReview && deadlineSelectionReview.selectedObligationIds.length > 0) {
      const selectedRows = await listSelectedDeadlineRows(
        alert,
        deadlineSelectionReview.selectedObligationIds,
      )
      affectedDeadlinesConfirmed = selectedRows.length > 0
      for (const row of selectedRows) affected.set(row.obligationId, row)
    } else {
      const structuredRows = await listCandidateRows(alert)
      affectedDeadlinesConfirmed =
        structuredRows.length > 0 && hasCompleteStructuredDueDateScope(alert)
      for (const row of structuredRows) affected.set(row.obligationId, row)
      if (structuredRows.length === 0 && isDueDateOverlayAlert(alert)) {
        for (const row of await listDeadlineSelectionCandidateRows(alert)) {
          affected.set(row.obligationId, row)
        }
      }
    }
    for (const row of await listApplicationRows(alert.pulseId)) {
      if (alert.alertStatus === 'reverted' || row.matchStatus !== 'reverted') {
        affected.set(row.obligationId, row)
      }
    }
    // Review-only rule-change / source-drift alerts: surface the clients whose open
    // obligations are backed by the changed rule(s). Structured/application rows win.
    if (!isDueDateOverlayAlert(alert) && alert.reverifyRuleIds.length > 0) {
      for (const row of await listReverifyRuleAffectedRows(alert)) {
        if (!affected.has(row.obligationId)) affected.set(row.obligationId, row)
      }
    }
    // Protective-claim windows carry no forms/rules to match on; their affected
    // clients come from the covered-year FED obligation scan instead.
    if (alert.changeKind === 'protective_claim_window') {
      for (const row of await listProtectiveClaimAffectedRows(alert)) {
        if (!affected.has(row.obligationId)) affected.set(row.obligationId, row)
      }
    }
    const affectedClients = Array.from(affected.values()).toSorted(compareAffected)
    const applyReadiness = applyReadinessForAlert(alert, affectedClients, {
      affectedDeadlinesConfirmed,
    })

    return {
      alert: {
        ...toAlert(alert),
        applyReadiness,
      },
      jurisdiction: alert.parsedJurisdiction,
      counties: alert.parsedCounties,
      forms: alert.parsedForms,
      entityTypes: toClientEntityTypes(alert.parsedEntityTypes),
      originalDueDate: alert.parsedOriginalDueDate,
      newDueDate: alert.parsedNewDueDate,
      effectiveFrom: alert.parsedEffectiveFrom,
      effectiveUntil: alert.parsedEffectiveUntil,
      affectedRuleIds: alert.affectedRuleIds,
      reverifyRuleIds: alert.reverifyRuleIds,
      structuredChange: alert.structuredChange,
      sourceExcerpt: alert.verbatimQuote,
      reviewedAt: alert.reviewedAt,
      applyReadiness,
      affectedClients,
    }
  }

  async function persistAlertCounts(
    alertId: string,
    counts: { matchedCount: number; needsReviewCount: number },
  ): Promise<void> {
    await db
      .update(pulseFirmAlert)
      .set(counts)
      .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, alertId)))
  }

  async function refreshAlertCounts(
    alertId: string,
    alert: AlertJoinedRow,
  ): Promise<{ matchedCount: number; needsReviewCount: number }> {
    const counts = liveAlertCounts(await buildDetail(alert), alert)
    await persistAlertCounts(alertId, counts)
    return counts
  }

  async function listPulseDigestRecipients(): Promise<string[]> {
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

  async function getPriorityReview(alertId: string): Promise<PulsePriorityReviewRow | null> {
    const rows = await db
      .select({
        id: pulsePriorityReview.id,
        alertId: pulsePriorityReview.alertId,
        pulseId: pulsePriorityReview.pulseId,
        status: pulsePriorityReview.status,
        priorityScore: pulsePriorityReview.priorityScore,
        priorityReasonsJson: pulsePriorityReview.priorityReasonsJson,
        selectedObligationIdsJson: pulsePriorityReview.selectedObligationIdsJson,
        confirmedObligationIdsJson: pulsePriorityReview.confirmedObligationIdsJson,
        excludedObligationIdsJson: pulsePriorityReview.excludedObligationIdsJson,
        note: pulsePriorityReview.note,
        requestedBy: pulsePriorityReview.requestedBy,
        reviewedBy: pulsePriorityReview.reviewedBy,
        reviewedAt: pulsePriorityReview.reviewedAt,
      })
      .from(pulsePriorityReview)
      .where(and(eq(pulsePriorityReview.firmId, firmId), eq(pulsePriorityReview.alertId, alertId)))
      .limit(1)

    return rows[0] ? toPriorityReview(rows[0] as PriorityReviewJoinedRow) : null
  }

  function assertPriorityReviewableAlert(alert: AlertJoinedRow): void {
    if (
      alert.pulseStatus === 'source_revoked' ||
      alert.alertStatus === 'applied' ||
      alert.alertStatus === 'dismissed' ||
      alert.alertStatus === 'reverted'
    ) {
      throw new PulseRepoError('conflict')
    }
  }

  async function upsertPriorityReview(
    alert: AlertJoinedRow,
    input: {
      status: PulsePriorityReviewStatus
      selectedObligationIds?: string[]
      confirmedObligationIds?: string[]
      excludedObligationIds?: string[]
      note?: string | null
      requestedBy?: string | null
      reviewedBy?: string | null
      reviewedAt?: Date | null
      preparerRequested?: boolean
      now?: Date
    },
  ): Promise<PulsePriorityReviewRow> {
    const now = input.now ?? new Date()
    const score = scorePulsePriority({
      matchedCount: alert.matchedCount,
      needsReviewCount: alert.needsReviewCount,
      confidence: alert.confidence,
      changeKind: alert.changeKind,
      structuredChange: alert.structuredChange,
      sourceId: alert.source,
      now,
      ...(input.preparerRequested !== undefined
        ? { preparerRequested: input.preparerRequested }
        : {}),
    })
    const row: NewPulsePriorityReview = {
      id: crypto.randomUUID(),
      firmId,
      alertId: alert.alertId,
      pulseId: alert.pulseId,
      status: input.status,
      priorityScore: score.score,
      priorityReasonsJson: score.reasons,
      selectedObligationIdsJson: input.selectedObligationIds ?? [],
      confirmedObligationIdsJson: input.confirmedObligationIds ?? [],
      excludedObligationIdsJson: input.excludedObligationIds ?? [],
      note: normalizePriorityNote(input.note),
      requestedBy: input.requestedBy ?? null,
      reviewedBy: input.reviewedBy ?? null,
      reviewedAt: input.reviewedAt ?? null,
      createdAt: now,
      updatedAt: now,
    }

    await db
      .insert(pulsePriorityReview)
      .values(row)
      .onConflictDoUpdate({
        target: [pulsePriorityReview.firmId, pulsePriorityReview.alertId],
        set: {
          status: input.status,
          priorityScore: score.score,
          priorityReasonsJson: score.reasons,
          selectedObligationIdsJson: input.selectedObligationIds ?? [],
          confirmedObligationIdsJson: input.confirmedObligationIds ?? [],
          excludedObligationIdsJson: input.excludedObligationIds ?? [],
          note: normalizePriorityNote(input.note),
          ...(input.requestedBy !== undefined ? { requestedBy: input.requestedBy } : {}),
          ...(input.reviewedBy !== undefined ? { reviewedBy: input.reviewedBy } : {}),
          ...(input.reviewedAt !== undefined ? { reviewedAt: input.reviewedAt } : {}),
          updatedAt: now,
        },
      })

    const review = await getPriorityReview(alert.alertId)
    if (!review) throw new PulseRepoError('not_found')
    return review
  }

  function validatePrioritySelection(
    detail: PulseDetailRow,
    input: {
      selectedObligationIds: readonly string[]
      confirmedObligationIds?: readonly string[]
      excludedObligationIds?: readonly string[]
    },
  ): {
    selectedObligationIds: string[]
    confirmedObligationIds: string[]
    excludedObligationIds: string[]
  } {
    const selectedObligationIds = uniqueStrings(input.selectedObligationIds)
    const confirmedObligationIds = uniqueStrings(input.confirmedObligationIds)
    const excludedObligationIds = uniqueStrings(input.excludedObligationIds)
    if (selectedObligationIds.length === 0) throw new PulseRepoError('no_eligible')

    const affectedById = new Map(detail.affectedClients.map((row) => [row.obligationId, row]))
    const selectedSet = new Set(selectedObligationIds)
    for (const obligationId of excludedObligationIds) {
      if (!affectedById.has(obligationId) || selectedSet.has(obligationId)) {
        throw new PulseRepoError('conflict')
      }
    }
    for (const obligationId of confirmedObligationIds) {
      const row = affectedById.get(obligationId)
      if (!row || !selectedSet.has(obligationId) || row.matchStatus !== 'needs_review') {
        throw new PulseRepoError('conflict')
      }
    }

    const confirmedSet = new Set(confirmedObligationIds)
    for (const obligationId of selectedObligationIds) {
      const row = affectedById.get(obligationId)
      if (!row || (row.matchStatus !== 'eligible' && row.matchStatus !== 'needs_review')) {
        throw new PulseRepoError('conflict')
      }
      if (row.matchStatus === 'needs_review' && !confirmedSet.has(obligationId)) {
        throw new PulseRepoError('conflict')
      }
    }

    return { selectedObligationIds, confirmedObligationIds, excludedObligationIds }
  }

  return {
    firmId,

    async createSeedAlert(input: PulseSeedInput): Promise<{ pulseId: string; alertId: string }> {
      const pulseId = input.pulseId ?? crypto.randomUUID()
      const alertId = input.alertId ?? crypto.randomUUID()
      const reviewedAt = input.reviewedAt ?? input.publishedAt

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
        structuredChangeJson: input.structuredChange ?? null,
        confidence: input.confidence,
        status: 'approved',
        reviewedBy: input.reviewedBy ?? null,
        reviewedAt,
        requiresHumanReview: input.requiresHumanReview ?? true,
        isSample: input.isSample ?? true,
      }
      const alertRow: NewPulseFirmAlert = {
        id: alertId,
        pulseId,
        firmId,
        status: 'matched',
        matchedCount: input.matchedCount ?? 0,
        needsReviewCount: input.needsReviewCount ?? 0,
      }

      await db.batch([
        db.insert(pulse).values(pulseRow),
        db.insert(pulseFirmAlert).values(alertRow),
      ])
      const alert = await getAlert(alertId)
      await refreshAlertCounts(alertId, alert)
      return { pulseId, alertId }
    },

    async listAlerts(
      opts: { limit?: number; cursor?: string | null } = {},
    ): Promise<{ alerts: PulseAlertRow[]; nextCursor: string | null }> {
      const limit = Math.min(Math.max(opts.limit ?? 5, 1), 50)
      const now = new Date()
      const cursor = opts.cursor ? decodePulseAlertCursor(opts.cursor) : null
      const rows = await db
        .select({
          alertId: pulseFirmAlert.id,
          pulseId: pulse.id,
          alertStatus: pulseFirmAlert.status,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
          source: pulse.source,
          sourceUrl: pulse.sourceUrl,
          publishedAt: pulse.publishedAt,
          changeKind: pulse.changeKind,
          actionMode: pulse.actionMode,
          aiSummary: pulse.aiSummary,
          verbatimQuote: pulse.verbatimQuote,
          parsedJurisdiction: pulse.parsedJurisdiction,
          parsedCounties: pulse.parsedCounties,
          parsedForms: pulse.parsedForms,
          parsedEntityTypes: pulse.parsedEntityTypes,
          parsedOriginalDueDate: pulse.parsedOriginalDueDate,
          parsedNewDueDate: pulse.parsedNewDueDate,
          parsedEffectiveFrom: pulse.parsedEffectiveFrom,
          parsedEffectiveUntil: pulse.parsedEffectiveUntil,
          affectedRuleIds: pulse.affectedRuleIdsJson,
          reverifyRuleIds: pulse.reverifyRuleIdsJson,
          structuredChange: pulse.structuredChangeJson,
          confidence: pulse.confidence,
          pulseStatus: pulse.status,
          reviewedBy: pulse.reviewedBy,
          reviewedAt: pulse.reviewedAt,
          isSample: pulse.isSample,
          duplicateSourceSnapshotCount: duplicateSourceSnapshotCountForPulse(),
        })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            eq(pulse.status, 'approved'),
            inArray(pulseFirmAlert.status, ['matched', 'partially_applied']),
            // Hide alerts whose actionable deadline has already passed (review_only
            // protective windows by actionDeadline; deadline shifts by new-due /
            // effective date), matching catch-up/sweep relevance so the active queue
            // no longer shows stale, no-longer-actionable windows. review_only alerts
            // left parsedNewDueDate/parsedEffectiveUntil NULL, so before the
            // protectiveActionDeadline column they were treated as never-expiring.
            ...pulseNotExpiredConditions(now),
            // Keyset: rows strictly "after" the cursor in (publishedAt DESC,
            // id DESC) order. `and(...)` drops the `undefined` when no cursor.
            cursor
              ? or(
                  lt(pulse.publishedAt, cursor.publishedAt),
                  and(eq(pulse.publishedAt, cursor.publishedAt), lt(pulseFirmAlert.id, cursor.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(pulse.publishedAt), desc(pulseFirmAlert.id))
        // Over-fetch one row to know whether a further page exists without a
        // second COUNT query.
        .limit(limit + 1)

      const hasMore = rows.length > limit
      const page = hasMore ? rows.slice(0, limit) : rows
      const lastRow = page[page.length - 1]
      const nextCursor =
        hasMore && lastRow
          ? encodePulseAlertCursor({ publishedAt: lastRow.publishedAt, id: lastRow.alertId })
          : null
      return { alerts: page.map((row) => toAlert(row)), nextCursor }
    },

    /**
     * Recompute matchedCount/needsReviewCount for this firm's active
     * due-date-overlay alerts whose jurisdiction matches a set of
     * just-created obligations. Called after a rule is accepted and its
     * deadlines are generated: a firm that activated a state AFTER a pulse
     * was approved had matchedCount stuck at the point-in-time (0) value,
     * because nothing recomputes on obligation creation. This re-runs the
     * same firm-scoped match used on the alert detail view so the alert
     * correctly reflects the new deadlines. It does NOT apply any overlay —
     * applying stays the manual, human-in-the-loop action.
     */
    async refreshMatchedCountsForObligations(obligationIds: string[]): Promise<void> {
      if (obligationIds.length === 0) return
      // Chunked: rule-accept passes every freshly created obligation id —
      // unbounded, and the caller's try/catch used to swallow the D1
      // too-many-variables throw, leaving counts silently stale.
      const obligationGroups = await Promise.all(
        chunkRows(obligationIds, ID_FILTER_BATCH_SIZE).map((chunk) =>
          db
            .select({ jurisdiction: obligationInstance.jurisdiction })
            .from(obligationInstance)
            .where(
              and(
                eq(obligationInstance.firmId, firmId),
                inArray(obligationInstance.id, chunk),
                isNull(obligationInstance.supersededAt),
              ),
            ),
        ),
      )
      const jurisdictions = [
        ...new Set(obligationGroups.flat().map((row) => row.jurisdiction)),
      ].filter((value): value is string => value !== null)
      if (jurisdictions.length === 0) return
      const alertIdRows = await db
        .select({ id: pulseFirmAlert.id })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            eq(pulse.status, 'approved'),
            eq(pulse.actionMode, 'due_date_overlay'),
            inArray(pulse.parsedJurisdiction, jurisdictions),
            // `reviewed` is included so a no-match overlay alert that was
            // acknowledged BEFORE the firm activated the matching rule can be
            // re-awakened below once accept creates the matching obligations.
            inArray(pulseFirmAlert.status, ['matched', 'partially_applied', 'reviewed']),
          ),
        )
      await Promise.all(
        alertIdRows.map(async ({ id }) => {
          const alert = await getAlert(id)
          const { matchedCount, needsReviewCount } = await refreshAlertCounts(id, alert)
          // Re-awaken a previously-reviewed no-match overlay: accepting the rule
          // created obligations that now match this pulse, so the alert must
          // return to the active list (and the rule-review drawer banner) for the
          // CPA to apply the new date. Reviewing was the right call when there was
          // nothing to apply; it must not permanently bury a pulse that later
          // becomes relevant. Applying the overlay stays the manual action.
          // (markReviewed only allows reviewing no-match overlays, so any
          // `reviewed` overlay reaching here was acknowledged at count 0.)
          if (alert.alertStatus === 'reviewed' && matchedCount + needsReviewCount > 0) {
            await db
              .update(pulseFirmAlert)
              .set({ status: 'matched' })
              .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, id)))
          }
        }),
      )
    },

    async listAlertsForRule(input: {
      ruleId: string
      jurisdiction: string
      taxType: string
      formName?: string | null
    }): Promise<PulseRuleMatchRow[]> {
      const alertIdRows = await db
        .select({ id: pulseFirmAlert.id })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            eq(pulse.status, 'approved'),
            eq(pulse.parsedJurisdiction, input.jurisdiction),
            inArray(pulseFirmAlert.status, ['matched', 'partially_applied']),
          ),
        )
        .orderBy(desc(pulse.publishedAt))

      const rows = await Promise.all(alertIdRows.map(({ id }) => getAlert(id)))
      const matches: PulseRuleMatchRow[] = []
      for (const row of rows) {
        const affected = row.affectedRuleIds ?? []
        const reverify = row.reverifyRuleIds ?? []
        const forms = row.parsedForms ?? []
        const matchReason: PulseRuleMatchRow['matchReason'] | null = affected.includes(input.ruleId)
          ? 'affected_rule'
          : reverify.includes(input.ruleId)
            ? 'reverify_rule'
            : forms.includes(input.taxType) ||
                (input.formName != null && forms.includes(input.formName))
              ? 'scope'
              : null
        if (!matchReason) continue
        matches.push({
          alert: toAlert(row),
          originalDueDate: row.parsedOriginalDueDate,
          newDueDate: row.parsedNewDueDate,
          effectiveFrom: row.parsedEffectiveFrom,
          effectiveUntil: row.parsedEffectiveUntil,
          sourceExcerpt: row.verbatimQuote,
          matchReason,
        })
      }
      return matches
    },

    /**
     * Count of currently-active (matched / partially_applied) Pulse alerts
     * for this firm. Used by the sidebar nav badge
     * — the badge only needs a number, not the alert rows themselves, so
     * a dedicated COUNT(*) query avoids fetching N rows just to call
     * `.length` on the array.
     *
     * Matches the WHERE clause of `listAlerts()` exactly so the sidebar
     * count never disagrees with what `listAlerts()` would return.
     *
     * Returns the true count with no upper bound — the old `listAlerts`
     * clamp of 50 meant a firm with 73 active alerts showed "50" in the
     * sidebar. Now the badge always reads the real number.
     */
    async countActiveAlerts(): Promise<number> {
      const now = new Date()
      const [row] = await db
        .select({ value: sqlCount() })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            eq(pulse.status, 'approved'),
            inArray(pulseFirmAlert.status, ['matched', 'partially_applied']),
            // Mirror listAlerts: the sidebar badge must not count expired windows
            // the active list hides.
            ...pulseNotExpiredConditions(now),
          ),
        )
      return row?.value ?? 0
    },

    async listHistory(
      opts: {
        limit?: number
        status?: PulseHandledFirmAlertStatus
        cursor?: string | null
        historyWindowDays?: number | null
      } = {},
    ): Promise<{ alerts: PulseAlertRow[]; nextCursor: string | null }> {
      const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100)
      const cursor = opts.cursor ? decodePulseAlertCursor(opts.cursor) : null
      const now = new Date()
      // Free tier sees only a recent window of resolved history (full history is
      // a paid feature). Filters on updatedAt (the resolved-time proxy). ACTIVE
      // alerts live in listAlerts and are NEVER windowed — no coverage trap.
      const historyWindowMs =
        opts.historyWindowDays != null ? opts.historyWindowDays * 24 * 60 * 60 * 1000 : null
      const windowCondition =
        historyWindowMs != null
          ? gte(pulseFirmAlert.updatedAt, new Date(now.getTime() - historyWindowMs))
          : undefined
      const statusFilter = opts.status
        ? eq(pulseFirmAlert.status, opts.status)
        : or(
            inArray(pulseFirmAlert.status, PULSE_HANDLED_ALERT_STATUSES),
            // A 'matched' alert that aged out of the active queue (its deadline
            // passed, so listAlerts now hides it) is not "handled" and would
            // otherwise vanish — surface it in history next to dismissed/applied.
            and(eq(pulseFirmAlert.status, 'matched'), pulseExpiredCondition(now)),
          )
      const rows = await db
        .select({
          alertId: pulseFirmAlert.id,
          pulseId: pulse.id,
          alertStatus: pulseFirmAlert.status,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
          source: pulse.source,
          sourceUrl: pulse.sourceUrl,
          publishedAt: pulse.publishedAt,
          changeKind: pulse.changeKind,
          actionMode: pulse.actionMode,
          aiSummary: pulse.aiSummary,
          verbatimQuote: pulse.verbatimQuote,
          parsedJurisdiction: pulse.parsedJurisdiction,
          parsedCounties: pulse.parsedCounties,
          parsedForms: pulse.parsedForms,
          parsedEntityTypes: pulse.parsedEntityTypes,
          parsedOriginalDueDate: pulse.parsedOriginalDueDate,
          parsedNewDueDate: pulse.parsedNewDueDate,
          parsedEffectiveFrom: pulse.parsedEffectiveFrom,
          parsedEffectiveUntil: pulse.parsedEffectiveUntil,
          affectedRuleIds: pulse.affectedRuleIdsJson,
          reverifyRuleIds: pulse.reverifyRuleIdsJson,
          structuredChange: pulse.structuredChangeJson,
          confidence: pulse.confidence,
          pulseStatus: pulse.status,
          reviewedBy: pulse.reviewedBy,
          reviewedAt: pulse.reviewedAt,
          isSample: pulse.isSample,
          duplicateSourceSnapshotCount: duplicateSourceSnapshotCountForPulse(),
        })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            inArray(pulse.status, ['approved', 'source_revoked']),
            statusFilter,
            windowCondition,
            cursor
              ? or(
                  lt(pulse.publishedAt, cursor.publishedAt),
                  and(eq(pulse.publishedAt, cursor.publishedAt), lt(pulseFirmAlert.id, cursor.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(pulse.publishedAt), desc(pulseFirmAlert.id))
        .limit(limit + 1)

      // SQL restricts to handled statuses plus 'matched' rows that expired out of
      // the active queue; keep both so this guard never drops a row, which keeps
      // the slice/hasMore math below correct.
      const handled = rows.filter(
        (row) => isHandledFirmAlertStatus(row.alertStatus) || row.alertStatus === 'matched',
      )
      const hasMore = handled.length > limit
      const page = hasMore ? handled.slice(0, limit) : handled
      const lastRow = page[page.length - 1]
      const nextCursor =
        hasMore && lastRow
          ? encodePulseAlertCursor({ publishedAt: lastRow.publishedAt, id: lastRow.alertId })
          : null
      return { alerts: page.map((row) => toAlert(row)), nextCursor }
    },

    async listSourceStates(): Promise<PulseSourceStateRow[]> {
      const rows = await db.select().from(pulseSourceState).orderBy(asc(pulseSourceState.sourceId))
      return rows.map(toSourceState)
    },

    async getLatestSourceSnapshotBySourceId(
      sourceId: string,
    ): Promise<PulseSourceSnapshotRow | null> {
      const ops = makePulseOpsRepo(db)
      return ops.getLatestSourceSnapshotBySourceId(sourceId)
    },

    // Opt-in catch-up for THIS firm: materialize the still-open, high-value
    // regulatory windows (protective-claim windows + unexpired deadline shifts)
    // it missed by joining — or importing clients — after a change was approved.
    // Delegates to the unscoped ops fan-out, pinned to this firm; dismiss-safe.
    async catchUpStillOpenWindows(now: Date = new Date()): Promise<number> {
      return makePulseOpsRepo(db).backfillFirmAlertsForActiveLandscape(firmId, now)
    },

    // Onboarding trigger for the catch-up above: runs it exactly when the
    // obligations just created are the firm's FIRST (total == createdCount).
    // Later additions (a new client in a relief county, a second import) must
    // NOT route through here — the daily sweep reaches them with origin='live',
    // and "new alert" is their only notification channel. Decoupled from how
    // clients enter (CSV import, manual + rule accept, rule catalog) so every
    // first-materialization path gets the same day-one landscape.
    async catchUpStillOpenWindowsOnFirstObligations(
      createdCount: number,
      now: Date = new Date(),
    ): Promise<number> {
      if (createdCount <= 0) return 0
      const rows = await db
        .select({ value: sqlCount() })
        .from(obligationInstance)
        .where(eq(obligationInstance.firmId, firmId))
      const total = rows[0]?.value ?? 0
      if (total !== createdCount) return 0
      return makePulseOpsRepo(db).backfillFirmAlertsForActiveLandscape(firmId, now)
    },

    async getDetail(alertId: string): Promise<PulseDetailRow> {
      const alert = await getAlert(alertId, { includeSourceRevoked: true })
      const detail = await buildDetail(alert)
      // Self-heal the denormalized card counts against this live detail. The
      // alerts-list card reads pulseFirmAlert.matchedCount/needsReviewCount — a
      // point-in-time tally written at fan-out that silently drifts as
      // obligations, clients, counties, or applied overlays change beneath it
      // (nothing re-tallies on those edits, which is how the card ended up
      // claiming "2 affected" while the drawer resolved 1). Both the drawer and
      // the list reach this method (getDetailsBatch fans out to getDetail), so
      // reconciling at this one read point keeps the card from disagreeing with
      // the drawer; the list's poll/mutation refetch re-reads the fixed count.
      // Overlay-only: review_only / protective counts use a different
      // (affected-client) definition the apply-readiness gate would wrongly zero.
      if (alert.actionMode === 'due_date_overlay') {
        const counts = liveAlertCounts(detail, alert)
        if (
          counts.matchedCount !== alert.matchedCount ||
          counts.needsReviewCount !== alert.needsReviewCount
        ) {
          await persistAlertCounts(alertId, counts)
          return { ...detail, alert: { ...detail.alert, ...counts } }
        }
      }
      return detail
    },

    async listPriorityQueue(opts: { limit?: number } = {}): Promise<PulsePriorityQueueItemRow[]> {
      const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100)
      const rows = await db
        .select({
          alertId: pulseFirmAlert.id,
          pulseId: pulse.id,
          alertStatus: pulseFirmAlert.status,
          matchedCount: pulseFirmAlert.matchedCount,
          needsReviewCount: pulseFirmAlert.needsReviewCount,
          source: pulse.source,
          sourceUrl: pulse.sourceUrl,
          publishedAt: pulse.publishedAt,
          changeKind: pulse.changeKind,
          actionMode: pulse.actionMode,
          aiSummary: pulse.aiSummary,
          verbatimQuote: pulse.verbatimQuote,
          parsedJurisdiction: pulse.parsedJurisdiction,
          parsedCounties: pulse.parsedCounties,
          parsedForms: pulse.parsedForms,
          parsedEntityTypes: pulse.parsedEntityTypes,
          parsedOriginalDueDate: pulse.parsedOriginalDueDate,
          parsedNewDueDate: pulse.parsedNewDueDate,
          parsedEffectiveFrom: pulse.parsedEffectiveFrom,
          parsedEffectiveUntil: pulse.parsedEffectiveUntil,
          affectedRuleIds: pulse.affectedRuleIdsJson,
          reverifyRuleIds: pulse.reverifyRuleIdsJson,
          structuredChange: pulse.structuredChangeJson,
          confidence: pulse.confidence,
          pulseStatus: pulse.status,
          reviewedBy: pulse.reviewedBy,
          reviewedAt: pulse.reviewedAt,
          isSample: pulse.isSample,
          duplicateSourceSnapshotCount: duplicateSourceSnapshotCountForPulse(),
          sourceHealthStatus: pulseSourceState.healthStatus,
          reviewId: pulsePriorityReview.id,
          reviewStatus: pulsePriorityReview.status,
          reviewPriorityScore: pulsePriorityReview.priorityScore,
          reviewPriorityReasonsJson: pulsePriorityReview.priorityReasonsJson,
          reviewSelectedObligationIdsJson: pulsePriorityReview.selectedObligationIdsJson,
          reviewConfirmedObligationIdsJson: pulsePriorityReview.confirmedObligationIdsJson,
          reviewExcludedObligationIdsJson: pulsePriorityReview.excludedObligationIdsJson,
          reviewNote: pulsePriorityReview.note,
          reviewRequestedBy: pulsePriorityReview.requestedBy,
          reviewReviewedBy: pulsePriorityReview.reviewedBy,
          reviewReviewedAt: pulsePriorityReview.reviewedAt,
        })
        .from(pulseFirmAlert)
        .innerJoin(pulse, eq(pulseFirmAlert.pulseId, pulse.id))
        .leftJoin(pulseSourceState, eq(pulse.source, pulseSourceState.sourceId))
        .leftJoin(
          pulsePriorityReview,
          and(
            eq(pulsePriorityReview.firmId, firmId),
            eq(pulsePriorityReview.alertId, pulseFirmAlert.id),
          ),
        )
        .where(
          and(
            eq(pulseFirmAlert.firmId, firmId),
            eq(pulse.status, 'approved'),
            inArray(pulseFirmAlert.status, ['matched', 'partially_applied']),
          ),
        )
        .orderBy(desc(pulseFirmAlert.updatedAt), desc(pulse.publishedAt))
        .limit(100)

      return rows
        .map((row): PulsePriorityQueueItemRow | null => {
          const alertRow: AlertJoinedRow = {
            alertId: row.alertId,
            pulseId: row.pulseId,
            alertStatus: row.alertStatus,
            matchedCount: row.matchedCount,
            needsReviewCount: row.needsReviewCount,
            source: row.source,
            sourceUrl: row.sourceUrl,
            publishedAt: row.publishedAt,
            changeKind: row.changeKind,
            actionMode: row.actionMode,
            aiSummary: row.aiSummary,
            verbatimQuote: row.verbatimQuote,
            parsedJurisdiction: row.parsedJurisdiction,
            parsedCounties: row.parsedCounties,
            parsedForms: row.parsedForms,
            parsedEntityTypes: row.parsedEntityTypes,
            parsedOriginalDueDate: row.parsedOriginalDueDate,
            parsedNewDueDate: row.parsedNewDueDate,
            parsedEffectiveFrom: row.parsedEffectiveFrom,
            parsedEffectiveUntil: row.parsedEffectiveUntil,
            affectedRuleIds: row.affectedRuleIds,
            reverifyRuleIds: row.reverifyRuleIds,
            structuredChange: row.structuredChange,
            confidence: row.confidence,
            pulseStatus: row.pulseStatus,
            reviewedBy: row.reviewedBy,
            reviewedAt: row.reviewedAt,
            isSample: row.isSample,
            duplicateSourceSnapshotCount: row.duplicateSourceSnapshotCount,
          }
          const review =
            row.reviewId === null
              ? null
              : toPriorityReview({
                  id: row.reviewId,
                  alertId: row.alertId,
                  pulseId: row.pulseId,
                  status: row.reviewStatus!,
                  priorityScore: row.reviewPriorityScore!,
                  priorityReasonsJson: row.reviewPriorityReasonsJson,
                  selectedObligationIdsJson: row.reviewSelectedObligationIdsJson,
                  confirmedObligationIdsJson: row.reviewConfirmedObligationIdsJson,
                  excludedObligationIdsJson: row.reviewExcludedObligationIdsJson,
                  note: row.reviewNote,
                  requestedBy: row.reviewRequestedBy,
                  reviewedBy: row.reviewReviewedBy,
                  reviewedAt: row.reviewReviewedAt,
                })
          const score = scorePulsePriority({
            matchedCount: row.matchedCount,
            needsReviewCount: row.needsReviewCount,
            confidence: row.confidence,
            preparerRequested: review?.requestedBy !== null && review?.requestedBy !== undefined,
            changeKind: row.changeKind,
            structuredChange: row.structuredChange,
            sourceId: row.source,
          })
          if (score.score <= 0 && !review) return null
          return {
            alert: toAlert(alertRow),
            level: score.level,
            priorityScore: score.score,
            priorityReasons: score.reasons,
            review,
          }
        })
        .filter((row): row is PulsePriorityQueueItemRow => row !== null)
        .toSorted((left, right) => {
          const scoreDelta = right.priorityScore - left.priorityScore
          if (scoreDelta !== 0) return scoreDelta
          return right.alert.publishedAt.getTime() - left.alert.publishedAt.getTime()
        })
        .slice(0, limit)
    },

    async requestPriorityReview(input: {
      alertId: string
      userId: string
      now?: Date
    }): Promise<PulsePriorityReviewRow> {
      const alert = await getAlert(input.alertId)
      assertPriorityReviewableAlert(alert)
      const current = await getPriorityReview(input.alertId)
      return upsertPriorityReview(alert, {
        status: 'open',
        requestedBy: input.userId,
        reviewedBy: null,
        reviewedAt: null,
        preparerRequested: true,
        ...(current
          ? {
              selectedObligationIds: current.selectedObligationIds,
              confirmedObligationIds: current.confirmedObligationIds,
              excludedObligationIds: current.excludedObligationIds,
              note: current.note,
            }
          : {}),
        ...(input.now !== undefined ? { now: input.now } : {}),
      })
    },

    async reviewPriorityMatches(input: {
      alertId: string
      selectedObligationIds: string[]
      confirmedObligationIds?: string[]
      excludedObligationIds?: string[]
      note?: string | null
      userId: string
      now?: Date
    }): Promise<PulsePriorityReviewRow> {
      const alert = await getAlert(input.alertId)
      assertPriorityReviewableAlert(alert)
      const detail = await buildDetail(alert)
      const selection = validatePrioritySelection(detail, input)
      const current = await getPriorityReview(input.alertId)
      return upsertPriorityReview(alert, {
        status: 'reviewed',
        ...selection,
        reviewedBy: input.userId,
        reviewedAt: input.now ?? new Date(),
        preparerRequested: current?.requestedBy !== null && current?.requestedBy !== undefined,
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.now !== undefined ? { now: input.now } : {}),
      })
    },

    async reviewDueDateOverlayDetails(
      input: PulseDueDateOverlayDetailsReviewInput,
    ): Promise<PulseDetailRow> {
      const alert = await getAlert(input.alertId)
      assertPriorityReviewableAlert(alert)
      if (!isDueDateOverlayAlert(alert)) throw new PulseRepoError('review_only')

      const now = input.now ?? new Date()
      const selectedObligationIds = uniqueStrings(input.selectedObligationIds)
      const confirmedObligationIds =
        input.confirmedObligationIds === undefined
          ? selectedObligationIds
          : uniqueStrings(input.confirmedObligationIds)
      const excludedObligationIds = uniqueStrings(input.excludedObligationIds)
      if (selectedObligationIds.length === 0) throw new PulseRepoError('no_eligible')
      const selectedSet = new Set(selectedObligationIds)
      if (confirmedObligationIds.some((obligationId) => !selectedSet.has(obligationId))) {
        throw new PulseRepoError('conflict')
      }
      if (excludedObligationIds.some((obligationId) => selectedSet.has(obligationId))) {
        throw new PulseRepoError('conflict')
      }

      const selectedRows = await listSelectedDeadlineRows(alert, selectedObligationIds)
      if (selectedRows.length !== selectedObligationIds.length) throw new PulseRepoError('conflict')
      const selectionReview: DeadlineSelectionReviewSnapshot = {
        selectedObligationIds,
        snapshots: selectedRows.map((row) => ({
          obligationId: row.obligationId,
          currentDueDate: toDateOnly(row.currentDueDate),
        })),
      }
      const auditId = crypto.randomUUID()

      await db.batch([
        db
          .update(pulse)
          .set({
            parsedNewDueDate: input.newDueDate,
            structuredChangeJson: withDeadlineSelectionReview(
              alert.structuredChange,
              selectionReview,
            ),
            reviewedBy: input.userId,
            reviewedAt: now,
          })
          .where(eq(pulse.id, alert.pulseId)),
        db.insert(auditEvent).values({
          id: auditId,
          firmId,
          actorId: input.userId,
          entityType: 'pulse_firm_alert',
          entityId: input.alertId,
          action: 'pulse.reviewed',
          beforeJson: {
            pulseId: alert.pulseId,
            newDueDate: toDateOnlyOrNull(alert.parsedNewDueDate),
            selectedObligationIds:
              deadlineSelectionReviewFromStructuredChange(alert.structuredChange)
                ?.selectedObligationIds ?? [],
          },
          afterJson: {
            pulseId: alert.pulseId,
            newDueDate: toDateOnly(input.newDueDate),
            selectedObligationIds,
          },
          reason: normalizePriorityNote(input.note),
          ipHash: null,
          userAgentHash: null,
        }),
      ])
      await upsertPriorityReview(alert, {
        status: 'reviewed',
        selectedObligationIds,
        confirmedObligationIds,
        excludedObligationIds,
        reviewedBy: input.userId,
        reviewedAt: now,
        ...(input.note !== undefined ? { note: input.note } : {}),
        now,
      })

      const updated = await getAlert(input.alertId)
      const detail = await buildDetail(updated)
      const matchedCount = detail.affectedClients.filter(
        (row) => row.matchStatus === 'eligible',
      ).length
      const needsReviewCount = detail.affectedClients.filter(
        (row) => row.matchStatus === 'needs_review',
      ).length
      await db
        .update(pulseFirmAlert)
        .set({ matchedCount, needsReviewCount })
        .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId)))
      return {
        ...detail,
        alert: {
          ...detail.alert,
          matchedCount,
          needsReviewCount,
        },
      }
    },

    async applyReviewed(input: {
      alertId: string
      userId: string
      now?: Date
    }): Promise<PulseApplyResult> {
      const review = await getPriorityReview(input.alertId)
      if (!review || review.status !== 'reviewed') throw new PulseRepoError('conflict')
      const result = await this.apply({
        alertId: input.alertId,
        obligationIds: review.selectedObligationIds,
        confirmedObligationIds: review.confirmedObligationIds,
        userId: input.userId,
        ...(input.now !== undefined ? { now: input.now } : {}),
      })
      await db
        .update(pulsePriorityReview)
        .set({ status: 'applied', updatedAt: input.now ?? new Date() })
        .where(
          and(
            eq(pulsePriorityReview.firmId, firmId),
            eq(pulsePriorityReview.alertId, input.alertId),
          ),
        )
      return result
    },

    async apply(input: {
      alertId: string
      obligationIds: string[]
      confirmedObligationIds?: string[]
      userId: string
      now?: Date
    }): Promise<PulseApplyResult> {
      const alert = await getAlert(input.alertId)
      if (!isDueDateOverlayAlert(alert)) throw new PulseRepoError('review_only')
      if (!alert.parsedNewDueDate) throw new PulseRepoError('needs_details')
      const newDueDate = alert.parsedNewDueDate
      const now = input.now ?? new Date()
      const detail = await buildDetail(alert)
      const requestedIds = Array.from(new Set(input.obligationIds))
      const confirmedReviewIds = new Set(input.confirmedObligationIds ?? [])
      const affectedById = new Map(detail.affectedClients.map((row) => [row.obligationId, row]))
      for (const obligationId of requestedIds) {
        const row = affectedById.get(obligationId)
        if (
          row &&
          row.matchStatus !== 'eligible' &&
          !(row.matchStatus === 'needs_review' && confirmedReviewIds.has(obligationId))
        ) {
          throw new PulseRepoError('conflict')
        }
      }
      if (detail.applyReadiness.status !== 'ready') throw new PulseRepoError('needs_details')
      const selectedApplicableCount = requestedIds.filter((obligationId) => {
        const row = affectedById.get(obligationId)
        return (
          row?.matchStatus === 'eligible' ||
          (row?.matchStatus === 'needs_review' && confirmedReviewIds.has(obligationId))
        )
      }).length
      if (selectedApplicableCount === 0) {
        const selectedConflict = requestedIds.some((obligationId) => affectedById.has(obligationId))
        throw new PulseRepoError(selectedConflict ? 'conflict' : 'no_eligible')
      }
      for (const obligationId of requestedIds) {
        const row = affectedById.get(obligationId)
        if (!row) throw new PulseRepoError('conflict')
        if (
          row.matchStatus !== 'eligible' &&
          !(row.matchStatus === 'needs_review' && confirmedReviewIds.has(obligationId))
        ) {
          throw new PulseRepoError('conflict')
        }
      }
      const eligible = await listFreshEligibleRows(alert, requestedIds)
      const reactivatedApplicationIds = await listRevertedApplicationIds(
        alert.pulseId,
        eligible.map((row) => row.obligationId),
      )

      const revertExpiresAt = new Date(now.getTime() + REVERT_WINDOW_MS)
      const exceptionRuleId = crypto.randomUUID()
      const affectedForms = uniqueStrings(eligible.map((row) => row.taxType))
      const affectedEntityTypes = Array.from(new Set(eligible.map((row) => row.entityType)))
      const originalDatesByObligation = Object.fromEntries(
        eligible.map((row) => [row.obligationId, toDateOnly(row.currentDueDate)]),
      )
      const uniqueOriginalDates = uniqueStrings(Object.values(originalDatesByObligation))
      const exception: NewExceptionRule = {
        id: exceptionRuleId,
        firmId,
        sourcePulseId: alert.pulseId,
        jurisdiction: alert.parsedJurisdiction,
        counties: alert.parsedCounties,
        affectedForms,
        affectedEntityTypes,
        overrideType: 'extend_due_date',
        overrideValueJson: {
          originalDueDate: uniqueOriginalDates.length === 1 ? uniqueOriginalDates[0] : null,
          originalDueDatesByObligation: originalDatesByObligation,
          newDueDate: toDateOnly(newDueDate),
        },
        overrideDueDate: newDueDate,
        effectiveFrom: alert.parsedEffectiveFrom,
        // Persist the source's relief-window end so the rule library can mark
        // this temporary rule "expired" once the window closes. Display metadata
        // only — the per-obligation override stays applied (the due-date change
        // is a permanent fact for that tax year, never auto-reverted).
        effectiveUntil: alert.parsedEffectiveUntil,
        status: 'applied',
        sourceUrl: alert.sourceUrl,
        verbatimQuote: alert.verbatimQuote,
      }
      const applications: NewPulseApplication[] = eligible.map((row) => ({
        id: reactivatedApplicationIds.get(row.obligationId) ?? crypto.randomUUID(),
        pulseId: alert.pulseId,
        obligationInstanceId: row.obligationId,
        clientId: row.clientId,
        firmId,
        appliedBy: input.userId,
        appliedAt: now,
        beforeDueDate: row.currentDueDate,
        afterDueDate: newDueDate,
      }))
      const newApplications = applications.filter(
        (row) => !reactivatedApplicationIds.has(row.obligationInstanceId),
      )
      const exceptionApplications: NewObligationExceptionApplication[] = eligible.map((row) => ({
        id: crypto.randomUUID(),
        firmId,
        obligationInstanceId: row.obligationId,
        exceptionRuleId,
        appliedAt: now,
        appliedByUserId: input.userId,
        revertedAt: null,
        revertedByUserId: null,
      }))
      const evidence: NewEvidenceLink[] = eligible.map((row) => ({
        id: crypto.randomUUID(),
        firmId,
        obligationInstanceId: row.obligationId,
        aiOutputId: null,
        sourceType: 'pulse_apply',
        sourceId: alert.pulseId,
        sourceUrl: alert.sourceUrl,
        verbatimQuote: alert.verbatimQuote,
        rawValue: toDateOnly(row.currentDueDate),
        normalizedValue: toDateOnly(newDueDate),
        confidence: alert.confidence,
        model: null,
        matrixVersion: null,
        verifiedAt: alert.reviewedAt,
        verifiedBy: alert.reviewedBy,
        appliedAt: now,
        appliedBy: input.userId,
      }))
      const audits: NewAuditEvent[] = eligible.map((row, index) => ({
        id: crypto.randomUUID(),
        firmId,
        actorId: input.userId,
        // Human pressed apply, but the regulatory change + new due date came
        // from the AI-classified Pulse alert → ai_assisted provenance.
        actorType: 'ai_assisted',
        previousActorType: 'ai',
        entityType: 'pulse_application',
        entityId: applications[index]!.id,
        action: 'pulse.apply',
        beforeJson: {
          obligationId: row.obligationId,
          currentDueDate: toDateOnly(row.currentDueDate),
        },
        afterJson: {
          pulseId: alert.pulseId,
          obligationId: row.obligationId,
          currentDueDate: toDateOnly(newDueDate),
        },
        reason: null,
        ipHash: null,
        userAgentHash: null,
      }))
      const recipients = await listPulseDigestRecipients()
      const emailId = crypto.randomUUID()
      const email: NewEmailOutbox = {
        id: emailId,
        firmId,
        externalId: `pulse:${firmId}:${alert.pulseId}:${now.getTime()}`,
        type: 'pulse_digest',
        status: 'pending',
        payloadJson: {
          event: 'pulse_applied',
          recipients,
          pulseId: alert.pulseId,
          alertId: alert.alertId,
          source: alert.source,
          sourceUrl: alert.sourceUrl,
          summary: alert.aiSummary,
          appliedAt: now.toISOString(),
          appliedBy: input.userId,
          revertExpiresAt: revertExpiresAt.toISOString(),
          obligations: eligible.map((row) => ({
            obligationId: row.obligationId,
            clientId: row.clientId,
            clientName: row.clientName,
            beforeDueDate: toDateOnly(row.currentDueDate),
            afterDueDate: toDateOnly(newDueDate),
            taxType: row.taxType,
          })),
        },
      }

      const totalEligibleBefore = detail.affectedClients.filter(
        (row) => row.matchStatus === 'eligible',
      ).length
      const selectedEligibleCount = requestedIds.filter(
        (obligationId) => affectedById.get(obligationId)?.matchStatus === 'eligible',
      ).length
      const selectedNeedsReviewCount = requestedIds.filter(
        (obligationId) => affectedById.get(obligationId)?.matchStatus === 'needs_review',
      ).length
      const remainingMatchedCount = Math.max(totalEligibleBefore - selectedEligibleCount, 0)
      const remainingNeedsReviewCount = Math.max(
        alert.needsReviewCount - selectedNeedsReviewCount,
        0,
      )
      const nextStatus: PulseFirmAlertStatus =
        remainingMatchedCount + remainingNeedsReviewCount > 0 ? 'partially_applied' : 'applied'
      const queries: BatchItem<'sqlite'>[] = []
      for (const chunk of chunkRows([exception], EXCEPTION_RULE_BATCH_SIZE)) {
        queries.push(db.insert(exceptionRule).values(chunk))
      }
      for (const chunk of chunkRows(exceptionApplications, EXCEPTION_APPLICATION_BATCH_SIZE)) {
        queries.push(db.insert(obligationExceptionApplication).values(chunk))
      }
      for (const chunk of chunkRows(newApplications, APPLICATION_BATCH_SIZE)) {
        queries.push(db.insert(pulseApplication).values(chunk))
      }
      for (const row of eligible) {
        const reactivatedApplicationId = reactivatedApplicationIds.get(row.obligationId)
        if (!reactivatedApplicationId) continue
        queries.push(
          db
            .update(pulseApplication)
            .set({
              appliedBy: input.userId,
              appliedAt: now,
              revertedBy: null,
              revertedAt: null,
              beforeDueDate: row.currentDueDate,
              afterDueDate: newDueDate,
            })
            .where(
              and(
                eq(pulseApplication.firmId, firmId),
                eq(pulseApplication.pulseId, alert.pulseId),
                eq(pulseApplication.id, reactivatedApplicationId),
                isNotNull(pulseApplication.revertedAt),
              ),
            ),
        )
      }
      for (const chunk of chunkRows(evidence, EVIDENCE_BATCH_SIZE)) {
        queries.push(db.insert(evidenceLink).values(chunk))
      }
      for (const chunk of chunkRows(audits, AUDIT_BATCH_SIZE)) {
        queries.push(db.insert(auditEvent).values(chunk))
      }
      for (const chunk of chunkRows([email], EMAIL_BATCH_SIZE)) {
        queries.push(db.insert(emailOutbox).values(chunk))
      }
      queries.push(
        db
          .update(pulseFirmAlert)
          .set({
            status: nextStatus,
            matchedCount: remainingMatchedCount,
            needsReviewCount: remainingNeedsReviewCount,
          })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
      )

      await db.batch(toNonEmptyBatch(queries))
      const updatedAlert = await getAlert(input.alertId)
      return {
        alert: toAlert(updatedAlert),
        appliedCount: eligible.length,
        auditIds: audits.map((row) => row.id),
        evidenceIds: evidence.map((row) => row.id),
        applicationIds: applications.map((row) => row.id),
        emailOutboxId: emailId,
        revertExpiresAt,
      }
    },

    async dismiss(input: {
      alertId: string
      userId: string
      reason?: string
      now?: Date
    }): Promise<PulseDismissResult> {
      const alert = await getAlert(input.alertId)
      const now = input.now ?? new Date()
      const auditId = crypto.randomUUID()
      await db.batch([
        db
          .update(pulseFirmAlert)
          .set({
            status: 'dismissed',
            dismissedBy: input.userId,
            dismissedAt: now,
          })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
        db.insert(auditEvent).values({
          id: auditId,
          firmId,
          actorId: input.userId,
          entityType: 'pulse_firm_alert',
          entityId: input.alertId,
          action: 'pulse.dismiss',
          beforeJson: { status: alert.alertStatus },
          afterJson: { status: 'dismissed', pulseId: alert.pulseId },
          reason: input.reason ?? PULSE_DISMISS_DEFAULT_AUDIT_REASON,
          ipHash: null,
          userAgentHash: null,
        }),
      ])
      const updated = await getAlert(input.alertId)
      return { alert: toAlert(updated), auditId }
    },

    async markReviewed(input: {
      alertId: string
      userId: string
      reason?: string
      now?: Date
    }): Promise<PulseDismissResult> {
      const alert = await getAlert(input.alertId)
      // A `due_date_overlay` alert can be acknowledged ("mark reviewed" → moves
      // to history) ONLY when it has no current match: there is nothing to apply,
      // so reviewing is the terminal action that clears it from the active list.
      // While the overlay still has live matches, reviewing is the wrong action
      // (apply or dismiss those instead) so it stays blocked. This is the Part-2
      // scenario — a pulse approved before the firm activated the matching rule.
      // (firmImpact === 'no_current_match' ⟺ matchedCount === 0 && needsReviewCount === 0.)
      if (isDueDateOverlayAlert(alert) && (alert.matchedCount > 0 || alert.needsReviewCount > 0)) {
        throw new PulseRepoError('conflict')
      }
      const now = input.now ?? new Date()
      const auditId = crypto.randomUUID()
      await db.batch([
        db
          .update(pulseFirmAlert)
          .set({
            status: 'reviewed',
            dismissedBy: input.userId,
            dismissedAt: now,
          })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
        db.insert(auditEvent).values({
          id: auditId,
          firmId,
          actorId: input.userId,
          entityType: 'pulse_firm_alert',
          entityId: input.alertId,
          action: 'pulse.reviewed',
          beforeJson: { status: alert.alertStatus },
          afterJson: { status: 'reviewed', pulseId: alert.pulseId },
          reason: input.reason ?? PULSE_MARK_REVIEWED_DEFAULT_AUDIT_REASON,
          ipHash: null,
          userAgentHash: null,
        }),
      ])
      const updated = await getAlert(input.alertId)
      return { alert: toAlert(updated), auditId }
    },

    async revert(input: {
      alertId: string
      userId: string
      now?: Date
    }): Promise<PulseRevertResult> {
      const alert = await getAlert(input.alertId)
      const now = input.now ?? new Date()
      const applications = await db
        .select({
          id: pulseApplication.id,
          obligationId: pulseApplication.obligationInstanceId,
          clientId: pulseApplication.clientId,
          appliedAt: pulseApplication.appliedAt,
          beforeDueDate: pulseApplication.beforeDueDate,
          afterDueDate: pulseApplication.afterDueDate,
          currentDueDate: obligationInstance.currentDueDate,
        })
        .from(pulseApplication)
        .innerJoin(
          obligationInstance,
          eq(pulseApplication.obligationInstanceId, obligationInstance.id),
        )
        .where(
          and(
            eq(pulseApplication.firmId, firmId),
            eq(obligationInstance.firmId, firmId),
            eq(pulseApplication.pulseId, alert.pulseId),
            isNull(pulseApplication.revertedAt),
          ),
        )
        .orderBy(asc(pulseApplication.appliedAt))

      if (applications.length === 0) throw new PulseRepoError('no_eligible')
      const firstAppliedAt = applications[0]!.appliedAt
      if (now.getTime() > firstAppliedAt.getTime() + REVERT_WINDOW_MS) {
        throw new PulseRepoError('revert_expired')
      }
      // Chunked: applications accumulate across partial applies, so the id
      // list is unbounded — an un-chunked select made a pulse with ~97+
      // active applications permanently un-revertible (D1 param ceiling).
      // Chunks partition by obligation id, so per-obligation last-write-wins
      // (appliedAt order within a chunk) is preserved.
      const exceptionRowGroups = await Promise.all(
        chunkRows(
          applications.map((row) => row.obligationId),
          ID_FILTER_BATCH_SIZE,
        ).map((chunk) =>
          db
            .select({
              id: obligationExceptionApplication.id,
              obligationId: obligationExceptionApplication.obligationInstanceId,
              exceptionRuleId: obligationExceptionApplication.exceptionRuleId,
              overrideDueDate: exceptionRule.overrideDueDate,
            })
            .from(obligationExceptionApplication)
            .innerJoin(
              exceptionRule,
              eq(obligationExceptionApplication.exceptionRuleId, exceptionRule.id),
            )
            .where(
              and(
                eq(obligationExceptionApplication.firmId, firmId),
                inArray(obligationExceptionApplication.obligationInstanceId, chunk),
                isNull(obligationExceptionApplication.revertedAt),
                eq(exceptionRule.sourcePulseId, alert.pulseId),
                inArray(exceptionRule.status, ['verified', 'applied']),
              ),
            )
            .orderBy(asc(obligationExceptionApplication.appliedAt)),
        ),
      )
      const exceptionRows = exceptionRowGroups.flat()
      const exceptionByObligation = new Map(exceptionRows.map((row) => [row.obligationId, row]))
      if (
        applications.some((row) => {
          const activeException = exceptionByObligation.get(row.obligationId)
          return (
            !activeException?.overrideDueDate ||
            !sameTimestamp(activeException.overrideDueDate, row.afterDueDate)
          )
        })
      ) {
        throw new PulseRepoError('conflict')
      }

      const evidence: NewEvidenceLink[] = applications.map((row) => ({
        id: crypto.randomUUID(),
        firmId,
        obligationInstanceId: row.obligationId,
        aiOutputId: null,
        sourceType: 'pulse_revert',
        sourceId: alert.pulseId,
        sourceUrl: alert.sourceUrl,
        verbatimQuote: alert.verbatimQuote,
        rawValue: toDateOnly(row.afterDueDate),
        normalizedValue: toDateOnly(row.beforeDueDate),
        confidence: alert.confidence,
        model: null,
        matrixVersion: null,
        verifiedAt: alert.reviewedAt,
        verifiedBy: alert.reviewedBy,
        appliedAt: now,
        appliedBy: input.userId,
      }))
      const audits: NewAuditEvent[] = applications.map((row) => ({
        id: crypto.randomUUID(),
        firmId,
        actorId: input.userId,
        entityType: 'pulse_application',
        entityId: row.id,
        action: 'pulse.revert',
        beforeJson: {
          pulseId: alert.pulseId,
          obligationId: row.obligationId,
          currentDueDate: toDateOnly(row.afterDueDate),
        },
        afterJson: {
          pulseId: alert.pulseId,
          obligationId: row.obligationId,
          currentDueDate: toDateOnly(row.beforeDueDate),
        },
        reason: null,
        ipHash: null,
        userAgentHash: null,
      }))

      const queries: BatchItem<'sqlite'>[] = []
      queries.push(
        db
          .update(pulseApplication)
          .set({ revertedAt: now, revertedBy: input.userId })
          .where(
            and(
              eq(pulseApplication.firmId, firmId),
              eq(pulseApplication.pulseId, alert.pulseId),
              isNull(pulseApplication.revertedAt),
            ),
          ),
      )
      // Chunked updates stay inside the single atomic db.batch below, so the
      // revert remains all-or-nothing.
      for (const chunk of chunkRows(
        exceptionRows.map((row) => row.id),
        ID_FILTER_BATCH_SIZE,
      )) {
        queries.push(
          db
            .update(obligationExceptionApplication)
            .set({ revertedAt: now, revertedByUserId: input.userId })
            .where(
              and(
                eq(obligationExceptionApplication.firmId, firmId),
                inArray(obligationExceptionApplication.id, chunk),
                isNull(obligationExceptionApplication.revertedAt),
              ),
            ),
        )
      }
      for (const chunk of chunkRows(
        Array.from(new Set(exceptionRows.map((row) => row.exceptionRuleId))),
        ID_FILTER_BATCH_SIZE,
      )) {
        queries.push(
          db
            .update(exceptionRule)
            .set({ status: 'retracted' })
            .where(
              and(
                eq(exceptionRule.firmId, firmId),
                inArray(exceptionRule.id, chunk),
                eq(exceptionRule.sourcePulseId, alert.pulseId),
              ),
            ),
        )
      }
      for (const chunk of chunkRows(evidence, EVIDENCE_BATCH_SIZE)) {
        queries.push(db.insert(evidenceLink).values(chunk))
      }
      for (const chunk of chunkRows(audits, AUDIT_BATCH_SIZE)) {
        queries.push(db.insert(auditEvent).values(chunk))
      }
      queries.push(
        db
          .update(pulseFirmAlert)
          .set({ status: 'matched' })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
      )

      await db.batch(toNonEmptyBatch(queries))
      let updated = await getAlert(input.alertId)
      const counts = await refreshAlertCounts(input.alertId, updated)
      updated = { ...updated, ...counts }
      return {
        alert: toAlert(updated),
        revertedCount: applications.length,
        auditIds: audits.map((row) => row.id),
        evidenceIds: evidence.map((row) => row.id),
      }
    },

    async reactivate(input: {
      alertId: string
      userId: string
      now?: Date
    }): Promise<PulseDismissResult> {
      const alert = await getAlert(input.alertId)
      const now = input.now ?? new Date()
      if (alert.alertStatus !== 'reverted') throw new PulseRepoError('conflict')

      const auditId = crypto.randomUUID()
      await db.batch([
        db
          .update(pulseFirmAlert)
          .set({
            status: 'matched',
            dismissedBy: null,
            dismissedAt: null,
          })
          .where(and(eq(pulseFirmAlert.firmId, firmId), eq(pulseFirmAlert.id, input.alertId))),
        db.insert(auditEvent).values({
          id: auditId,
          firmId,
          actorId: input.userId,
          entityType: 'pulse_firm_alert',
          entityId: input.alertId,
          action: 'pulse.reactivate',
          beforeJson: { status: alert.alertStatus },
          afterJson: {
            status: 'matched',
            pulseId: alert.pulseId,
            reactivatedAt: now.toISOString(),
          },
          reason: null,
          ipHash: null,
          userAgentHash: null,
        }),
      ])

      let updated = await getAlert(input.alertId)
      const counts = await refreshAlertCounts(input.alertId, updated)
      updated = { ...updated, ...counts }
      return { alert: toAlert(updated), auditId }
    },

    // Internal team notes on an alert (Pencil Aogxu §7). Firm-scoped by the
    // closure firmId; ordered oldest → newest, joined to the author's display
    // name (user.name) so the UI renders without a second lookup — mirrors the
    // member/user join used by listPulseDigestRecipients.
    async listAlertNotes(alertId: string): Promise<PulseAlertNoteRow[]> {
      const rows = await db
        .select({
          id: pulseAlertNote.id,
          alertId: pulseAlertNote.alertId,
          authorId: pulseAlertNote.authorId,
          authorName: user.name,
          body: pulseAlertNote.body,
          parentNoteId: pulseAlertNote.parentNoteId,
          createdAt: pulseAlertNote.createdAt,
        })
        .from(pulseAlertNote)
        .leftJoin(user, eq(pulseAlertNote.authorId, user.id))
        .where(and(eq(pulseAlertNote.firmId, firmId), eq(pulseAlertNote.alertId, alertId)))
        .orderBy(asc(pulseAlertNote.createdAt), asc(pulseAlertNote.id))

      return rows.map((row) => ({
        id: row.id,
        alertId: row.alertId,
        authorId: row.authorId,
        // `leftJoin` so a note authored by a since-removed user still renders.
        authorName: row.authorName ?? 'Unknown',
        body: row.body,
        parentNoteId: row.parentNoteId,
        createdAt: row.createdAt,
      }))
    },

    async addAlertNote(input: PulseAddAlertNoteInput): Promise<PulseAlertNoteRow> {
      // Verify the alert belongs to this firm before writing — getAlert throws
      // PulseRepoError('not_found') for a missing / cross-firm / non-approved
      // alert, so a note can't be attached to another firm's alert.
      const alert = await getAlert(input.alertId, { includeSourceRevoked: true })
      const now = input.now ?? new Date()
      const row: NewPulseAlertNote = {
        id: crypto.randomUUID(),
        firmId,
        alertId: alert.alertId,
        authorId: input.userId,
        body: input.body,
        parentNoteId: input.parentNoteId ?? null,
        createdAt: now,
        updatedAt: now,
      }
      await db.insert(pulseAlertNote).values(row)

      const [name] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, input.userId))
        .limit(1)

      return {
        id: row.id,
        alertId: alert.alertId,
        authorId: input.userId,
        authorName: name?.name ?? 'Unknown',
        body: input.body,
        parentNoteId: input.parentNoteId ?? null,
        createdAt: now,
      }
    },
  }
}

export type PulseRepo = ReturnType<typeof makePulseRepo>
