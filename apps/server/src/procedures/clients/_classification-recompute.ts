import type {
  ClassificationRecomputeRow,
  ClassificationRecomputeSummary,
  ClientClassificationCandidate,
} from '@duedatehq/contracts'
import type { ObligationRule } from '@duedatehq/core/rules'
import type { ClientRow } from '@duedatehq/ports/clients'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import {
  computeClientGeneratedObligations,
  keyForGenerated,
  persistGeneratedObligations,
  type RuleBackedCreateInput,
} from '../rules/_obligation-generation'

/**
 * Safe-to-remove obligation recompute on a client reclassification.
 *
 * The diff is computed against TWO generations of the rule engine:
 *   - `baseline` = what the client's ORIGINAL classification generates. An
 *     existing obligation is only ever orphaned if its key is in this set, so
 *     manual / out-of-horizon / prior-year obligations are never touched.
 *   - `candidate` = what the NEW classification generates. Its keys not already
 *     present become adds.
 *
 * Orphan removal is conservative: an orphan is auto-superseded only if it is
 * pristine (no workflow progress); otherwise it is surfaced for explicit
 * confirmation and removed only if its id is in `confirmedOrphanObligationIds`.
 * Apply re-evaluates safety from fresh state, so an orphan that gained workflow
 * state after the preview is left alone unless explicitly confirmed.
 */

type ObligationRow = Awaited<ReturnType<ScopedRepo['obligations']['listByClient']>>[number]

const SAFE_PAYMENT_STATES = new Set<string>(['not_applicable', 'estimate_needed'])
const SAFE_EXTENSION_STATES = new Set<string>(['not_started', 'not_applicable'])

/**
 * Human-readable reasons an orphaned obligation is NOT pristine. Empty array =
 * safe to auto-remove. The strings power the confirmation-dialog badges.
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

function isOrphanSafe(o: ObligationRow): boolean {
  return orphanWorkflowFlags(o).length === 0
}

function withinScope(taxYear: number | null, effectiveFromTaxYear: number | undefined): boolean {
  if (effectiveFromTaxYear === undefined) return true
  return taxYear !== null && taxYear >= effectiveFromTaxYear
}

function addRow(createInput: RuleBackedCreateInput): ClassificationRecomputeRow {
  return {
    disposition: 'will_add',
    obligationId: null,
    taxType: createInput.taxType,
    formName: createInput.formName ?? null,
    jurisdiction: createInput.jurisdiction ?? null,
    taxYear: createInput.taxYear ?? null,
    dueDate: createInput.baseDueDate.toISOString(),
    workflowFlags: [],
  }
}

function orphanRow(o: ObligationRow, flags: string[]): ClassificationRecomputeRow {
  return {
    disposition: flags.length === 0 ? 'orphan_safe' : 'orphan_needs_confirmation',
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
  addedObligationIds: string[]
  supersededObligationIds: string[]
  /** classification.updated audit id in apply mode; null in preview. */
  auditId: string | null
}

export async function runClassificationRecompute(input: {
  scoped: ScopedRepo
  userId: string
  /** The client row BEFORE any classification write (the baseline source). */
  client: ClientRow
  candidate: ClientClassificationCandidate
  rules: readonly ObligationRule[]
  internalDeadlineOffsetDays: number
  monitoringStartDate?: string
  now: Date
  mode: 'preview' | 'apply'
  /** Reclassification effective year; omitted recomputes the whole horizon. */
  effectiveFromTaxYear?: number
  confirmedOrphanObligationIds?: readonly string[]
  reason?: string
}): Promise<ClassificationRecomputeOutcome> {
  const { scoped, client, candidate, rules, mode, effectiveFromTaxYear } = input

  const candidateClient: ClientRow = {
    ...client,
    entityType: candidate.entityType ?? client.entityType,
    taxClassification: candidate.taxClassification ?? client.taxClassification,
    ...(candidate.legalEntity !== undefined ? { legalEntity: candidate.legalEntity } : {}),
  }

  const [profiles, existing] = await Promise.all([
    scoped.filingProfiles.listByClient(client.id),
    scoped.obligations.listByClient(client.id),
  ])
  const existingWithKeys = existing
    .filter((o) => o.ruleId !== null && o.taxYear !== null && o.rulePeriod !== null)
    .map((o) => ({
      row: o,
      key: keyForGenerated({
        clientId: o.clientId,
        jurisdiction: o.jurisdiction,
        ruleId: o.ruleId as string,
        taxYear: o.taxYear,
        rulePeriod: o.rulePeriod as string,
      }),
    }))
  const existingByKey = new Map(existingWithKeys.map((e) => [e.key, e.row]))

  const baseConfig = {
    profiles,
    rules,
    internalDeadlineOffsetDays: input.internalDeadlineOffsetDays,
    ...(input.monitoringStartDate ? { monitoringStartDate: input.monitoringStartDate } : {}),
    now: input.now,
  }
  const baseline = computeClientGeneratedObligations({
    ...baseConfig,
    client,
    seenGeneratedKeys: new Set<string>(),
  })
  const candidateTarget = computeClientGeneratedObligations({
    ...baseConfig,
    client: candidateClient,
    seenGeneratedKeys: new Set<string>(),
  })
  const baselineKeys = new Set(baseline.items.map((i) => i.key))
  const candidateKeys = new Set(candidateTarget.items.map((i) => i.key))

  // Adds: candidate obligations not already present, within the effective scope.
  const toAdd = candidateTarget.items.filter(
    (i) =>
      !existingByKey.has(i.key) && withinScope(i.createInput.taxYear ?? null, effectiveFromTaxYear),
  )
  // Orphans: existing obligations the OLD classification justified (key in
  // baseline) but the new one does not — bounded to the generation horizon so
  // manual + prior-year obligations are never touched.
  const orphans = existingWithKeys
    .filter(
      (e) =>
        baselineKeys.has(e.key) &&
        !candidateKeys.has(e.key) &&
        withinScope(e.row.taxYear, effectiveFromTaxYear),
    )
    .map((e) => e.row)
  const unchangedCount = existingWithKeys.filter((e) => candidateKeys.has(e.key)).length

  const orphanRows = orphans.map((o) => orphanRow(o, orphanWorkflowFlags(o)))
  const rows: ClassificationRecomputeRow[] = [
    ...toAdd.map((i) => addRow(i.createInput)),
    ...orphanRows,
  ]
  const orphanSafeCount = orphans.filter((o) => isOrphanSafe(o)).length
  const summary: ClassificationRecomputeSummary = {
    willAddCount: toAdd.length,
    unchangedCount,
    orphanSafeCount,
    orphanNeedsConfirmationCount: orphans.length - orphanSafeCount,
  }

  if (mode === 'preview') {
    return { summary, rows, addedObligationIds: [], supersededObligationIds: [], auditId: null }
  }

  // --- apply: write classification, add new, supersede removed, audit --------
  const confirmedSet = new Set(input.confirmedOrphanObligationIds ?? [])
  const toRemove = orphans.filter((o) => isOrphanSafe(o) || confirmedSet.has(o.id))

  await scoped.clients.updateClassification(client.id, {
    ...(candidate.entityType !== undefined ? { entityType: candidate.entityType } : {}),
    ...(candidate.taxClassification !== undefined
      ? { taxClassification: candidate.taxClassification }
      : {}),
    ...(candidate.legalEntity !== undefined ? { legalEntity: candidate.legalEntity } : {}),
  })

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

  const { ids: addedObligationIds } = await persistGeneratedObligations({
    scoped,
    userId: input.userId,
    createInputs: toAdd.map((i) => i.createInput),
    readinessInputs: toAdd.map((i) => ({ obligation: i.createInput, client: candidateClient })),
    now: input.now,
  })

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
    addedObligationIds,
    supersededObligationIds: supersededIds,
    auditId: classificationAuditId,
  }
}
