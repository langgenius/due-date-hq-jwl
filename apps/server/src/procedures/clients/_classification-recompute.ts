import type {
  ClassificationRecomputeRow,
  ClassificationRecomputeSummary,
  ClientClassificationCandidate,
} from '@duedatehq/contracts'
import { inferTaxTypes } from '@duedatehq/core/default-matrix'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ScopedRepo } from '@duedatehq/ports/scoped'

/**
 * Deadline cleanup on a client classification change.
 *
 * Changing the entity type invalidates the active filing plan for this client.
 * The apply step therefore writes the new classification, supersedes every
 * active deadline that existed before the apply, and creates no replacement
 * deadlines. Current-tax-year removals are gated by explicit confirmation in
 * the dialog; projected removals are informational and do not block apply.
 */

type ObligationRow = Awaited<ReturnType<ScopedRepo['obligations']['listByClient']>>[number]

const SAFE_PAYMENT_STATES = new Set<string>(['not_applicable', 'estimate_needed'])
const SAFE_EXTENSION_STATES = new Set<string>(['not_started', 'not_applicable'])

/**
 * Human-readable workflow state on a deadline being removed. Empty array means
 * no visible workflow progress; non-empty strings power the dialog badges.
 */
export function orphanWorkflowFlags(o: ObligationRow): string[] {
  const flags: string[] = []
  if (o.status !== 'pending') flags.push(`status:${o.status}`)
  if (o.prepStage !== 'not_started') flags.push('prep_started')
  if (o.reviewStage !== 'not_required') flags.push('in_review')
  if (o.efileState !== 'not_applicable') flags.push('efile_in_progress')
  if (!SAFE_EXTENSION_STATES.has(o.extensionState)) flags.push('extension_in_progress')
  if (!SAFE_PAYMENT_STATES.has(o.paymentState)) flags.push('payment_in_progress')
  if (o.extensionDecision !== 'not_considered') flags.push('extension_decided')
  return flags
}

function isCurrentOrProjectedDeadline(taxYear: number | null, currentTaxYear: number): boolean {
  return taxYear === null || taxYear >= currentTaxYear
}

function requiresRemovalConfirmation(o: ObligationRow, currentTaxYear: number): boolean {
  return o.taxYear === currentTaxYear
}

function removalRow(o: ObligationRow, currentTaxYear: number): ClassificationRecomputeRow {
  const flags = orphanWorkflowFlags(o)
  return {
    disposition: requiresRemovalConfirmation(o, currentTaxYear)
      ? 'orphan_needs_confirmation'
      : 'orphan_safe',
    obligationId: o.id,
    taxType: o.taxType,
    formName: o.formName ?? null,
    jurisdiction: o.jurisdiction ?? null,
    taxYear: o.taxYear ?? null,
    dueDate: o.baseDueDate.toISOString(),
    workflowFlags: flags,
  }
}

export interface ClassificationRecomputeOutcome {
  summary: ClassificationRecomputeSummary
  rows: ClassificationRecomputeRow[]
  /**
   * Tax types the candidate classification typically files (federal + state),
   * from the default-matrix — advisory only, never auto-created (see the
   * contract field doc). Surfaced in preview; ignored on apply.
   */
  expectedTaxTypes: string[]
  /** Count of the client's current/projected existing deadlines (preview note). */
  existingDeadlineCount: number
  addedObligationIds: string[]
  supersededObligationIds: string[]
  /** classification.updated audit id in apply mode; null in preview. */
  auditId: string | null
}

export async function runClassificationRecompute(input: {
  scoped: ScopedRepo
  userId: string
  /** The client row before any classification write. */
  client: ClientRow
  candidate: ClientClassificationCandidate
  now: Date
  mode: 'preview' | 'apply'
  /** Reclassification effective year for the client tax-year history row. */
  effectiveFromTaxYear?: number
  confirmedOrphanObligationIds?: readonly string[]
  reason?: string
}): Promise<ClassificationRecomputeOutcome> {
  const { scoped, client, candidate, mode, effectiveFromTaxYear } = input

  const candidateClient: ClientRow = {
    ...client,
    entityType: candidate.entityType ?? client.entityType,
    taxClassification: candidate.taxClassification ?? client.taxClassification,
    ...(candidate.legalEntity !== undefined ? { legalEntity: candidate.legalEntity } : {}),
  }

  const existing = await scoped.obligations.listByClient(client.id)

  // The dialog's existing-deadline note should match the filing-plan horizon:
  // current tax year plus projected future years. It deliberately ignores
  // status/confirmed so closed current-year rows and unconfirmed projected rows
  // are both counted.
  const currentTaxYear = input.now.getFullYear() - 1
  const existingDeadlineCount = existing.filter((o) =>
    isCurrentOrProjectedDeadline(o.taxYear, currentTaxYear),
  ).length

  const rows = existing.map((o) => removalRow(o, currentTaxYear))
  const orphanNeedsConfirmationCount = rows.filter(
    (row) => row.disposition === 'orphan_needs_confirmation',
  ).length
  const summary: ClassificationRecomputeSummary = {
    willAddCount: 0,
    unchangedCount: 0,
    orphanSafeCount: rows.length - orphanNeedsConfirmationCount,
    orphanNeedsConfirmationCount,
  }

  // The full set of filings the NEW classification typically has — federal +
  // state, from the default-matrix (the same inference used at client intake).
  // Advisory only: reclassify never auto-creates these. We surface the complete
  // expected set for every client/entity and let the CPA reconcile the tax
  // types by hand.
  const expectedTaxTypes = inferTaxTypes(candidateClient.entityType, candidateClient.state ?? '', {
    taxClassification: candidateClient.taxClassification,
  }).taxTypes.filter(
    // Drop the bare `federal` placeholder (entity_type 'other') and the
    // `_state_*` codes inferTaxTypes emits when the client has no state — both
    // are non-forms with no canonical return.
    (taxType) => taxType !== 'federal' && !taxType.startsWith('_'),
  )

  if (mode === 'preview') {
    return {
      summary,
      rows,
      expectedTaxTypes,
      existingDeadlineCount,
      addedObligationIds: [],
      supersededObligationIds: [],
      auditId: null,
    }
  }

  // --- apply: write classification, supersede existing deadlines, audit ------
  const confirmedSet = new Set(input.confirmedOrphanObligationIds ?? [])
  const unconfirmedCurrentYear = existing.find(
    (o) => requiresRemovalConfirmation(o, currentTaxYear) && !confirmedSet.has(o.id),
  )
  if (unconfirmedCurrentYear) {
    throw new Error(
      'Current-tax-year deadlines require confirmation before reclassification apply.',
    )
  }
  const toRemove = existing

  await scoped.clients.updateClassification(client.id, {
    ...(candidate.entityType !== undefined ? { entityType: candidate.entityType } : {}),
    ...(candidate.taxClassification !== undefined
      ? { taxClassification: candidate.taxClassification }
      : {}),
    ...(candidate.legalEntity !== undefined ? { legalEntity: candidate.legalEntity } : {}),
  })

  // Reclassification (effective-dated) records a per-(client, tax year) row so
  // the change keeps an accurate historical boundary ("S corp from 2025").
  // Corrections (no effective year) just rewrite the scalar and skip this.
  if (effectiveFromTaxYear !== undefined) {
    await scoped.clientTaxYearProfiles.upsert({
      clientId: client.id,
      taxYear: effectiveFromTaxYear,
      entityType: candidateClient.entityType,
      taxClassification: candidateClient.taxClassification,
      source: 'reclassification',
    })
  }

  const { id: classificationAuditId } = await scoped.audit.write({
    actorId: input.userId,
    entityType: 'client',
    entityId: client.id,
    action: 'client.classification.updated',
    before: {
      entityType: client.entityType,
      taxClassification: client.taxClassification,
      legalEntity: client.legalEntity,
    },
    after: {
      entityType: candidateClient.entityType,
      taxClassification: candidateClient.taxClassification,
      legalEntity: candidateClient.legalEntity,
    },
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  })

  const addedObligationIds: string[] = []

  const { id: reclassifiedAuditId } = await scoped.audit.write({
    actorId: input.userId,
    entityType: 'client',
    entityId: client.id,
    action: 'client.obligations.reclassified',
    after: {
      addedCount: addedObligationIds.length,
      supersededCount: toRemove.length,
      ...(effectiveFromTaxYear !== undefined ? { effectiveFromTaxYear } : {}),
      addedObligationIds,
      supersededObligationIds: toRemove.map((o) => o.id),
    },
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  })

  const supersedeReason =
    input.reason ?? `Reclassified ${client.entityType} → ${candidateClient.entityType}`
  const { supersededIds } =
    toRemove.length > 0
      ? await scoped.obligations.supersedeByIds(
          toRemove.map((o) => o.id),
          { reason: supersedeReason, auditId: reclassifiedAuditId },
        )
      : { supersededIds: [] as string[] }

  return {
    summary,
    rows,
    expectedTaxTypes,
    existingDeadlineCount,
    addedObligationIds,
    supersededObligationIds: supersededIds,
    auditId: classificationAuditId,
  }
}
