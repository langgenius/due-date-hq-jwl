import { ORPCError } from '@orpc/server'
import * as z from 'zod'
import type { AI, AiRunResult } from '@duedatehq/ai'
import {
  inferTaxTypes,
  isStateTaxTypeForState,
  type EntityType,
  type InferTaxTypesResult,
} from '@duedatehq/core/default-matrix'
import type { BillingPlan } from '@duedatehq/core/plan-entitlements'
import { parseTabular, type ParsedTabular, type TabularKind } from '@duedatehq/core/csv-parser'
import {
  normalizeEntityType,
  normalizeState,
  normalizeTaxTypes,
} from '@duedatehq/core/normalize-dict'
import { DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS } from '@duedatehq/core/deadlines'
import {
  listObligationRules,
  previewObligationsFromRules,
  STATE_RULE_JURISDICTIONS,
  type ObligationRule as CoreObligationRule,
  type RuleGenerationState,
} from '@duedatehq/core/rules'
import {
  DryRunSummarySchema,
  MappingRowSchema,
  NormalizationRowSchema,
  ObligationRuleSchema,
  type DryRunClientPreview,
  type DryRunSummary,
  type MapperFallback,
  type MapperRunOutput,
  type MappingRow,
  type MatrixSelection,
  type MigrationBatch,
  type MigrationError,
  type MigrationSource,
  type MigrationSourceManifest,
  type NormalizationRow,
} from '@duedatehq/contracts'
import type { ScopedRepo } from '@duedatehq/ports/scoped'
import {
  buildAllIgnoreMappings,
  buildPresetMappings,
  isPresetId,
  PRESET_VERSION,
} from './_preset-mappings'
import { buildCommitPlan } from './_commit-plan'
import { sanitizeMapperOutput, validateNormalizedRows, validateRows } from './_deterministic'
import type { DeterministicError, MappingJsonPayload, MatrixApplicationEntry } from './_types'
import { matrixApplicationModeForTaxTypes, normalizeTaxTypesFromRows } from './_tax-type-matrix'
import { toCoreRule } from '../rules/runtime'

/**
 * MigrationService — orchestrates Migration Copilot's 4-step import flow.
 *
 * Authority:
 *   - docs/dev-file/10-Demo-Sprint-7Day-Rhythm.md §3 Day 3
 *   - docs/product-design/migration-copilot/02-ux-4step-wizard.md
 *   - docs/product-design/migration-copilot/04-ai-prompts.md
 *
 * Design pattern: thin procedure handlers (`procedures/migration/index.ts`)
 * delegate to instance methods here. The service NEVER touches the DB
 * directly — every persistence call goes through `scoped.*` so tenant
 * isolation is preserved by construction.
 *
 * What the service owns:
 *   - createBatch / uploadRaw / runMapper / confirmMapping / runNormalizer /
 *     confirmNormalization / applyDefaultMatrix / dryRun / getBatch
 *   - apply (real client + obligation + evidence + audit insert)
 *   - Persisting `mapping_json` (the user-confirmed payload Step 4 reads)
 *   - Writing per-decision evidence_link rows (ai_mapper / ai_normalizer /
 *     default_inference_by_entity_state)
 *   - Writing audit rows for every confirmation step
 *
 * What the service does NOT own yet:
 *   - migration.revert / singleUndo
 *   - obligations.updateDueDate
 */

const MAX_SAMPLE_ROWS = 5
async function runtimeRulesForFirm(scoped: ScopedRepo): Promise<readonly CoreObligationRule[]> {
  await ensureRuleReviewTasks(scoped)
  return (await scoped.rules.listActivePracticeRules()).flatMap((row) => {
    const parsed = ObligationRuleSchema.safeParse(row.ruleJson)
    return parsed.success ? [toCoreRule(parsed.data)] : []
  })
}

async function ensureRuleReviewTasks(scoped: ScopedRepo): Promise<void> {
  const reviewedRows = await scoped.rules.listPracticeRules()
  const reviewedByRuleId = new Map(reviewedRows.map((row) => [row.ruleId, row]))
  const reviewTasks: Parameters<ScopedRepo['rules']['ensureReviewTasks']>[0] = []

  for (const rule of listObligationRules({ includeCandidates: true })) {
    if (rule.status === 'deprecated') continue
    const reviewed = reviewedByRuleId.get(rule.id)
    if (!reviewed) {
      reviewTasks.push({
        ruleId: rule.id,
        templateVersion: rule.version,
        reason: 'new_template',
      })
      continue
    }
    if (reviewed.status !== 'pending_review' && reviewed.templateVersion !== rule.version) {
      reviewTasks.push({
        ruleId: rule.id,
        templateVersion: rule.version,
        reason: 'source_changed',
      })
    }
  }

  await scoped.rules.ensureReviewTasks(reviewTasks)
}

const MapperOutputSchema = z.object({
  mappings: z.array(
    z.object({
      source: z.string().min(1),
      target: z.enum([
        'client.name',
        'client.ein',
        'client.external_client_id',
        'client.state',
        'client.filing_states',
        'client.county',
        'client.address_line_1',
        'client.city',
        'client.postal_code',
        'client.entity_type',
        'client.tax_types',
        'client.tax_year_type',
        'client.fiscal_year_end',
        'client.assignee_name',
        'client.primary_contact_name',
        'client.primary_contact_email',
        'client.email',
        'client.primary_phone',
        'client.source_status',
        'client.notes',
        'client.estimated_tax_liability',
        'client.equity_owner_count',
        'penalty.tax_due',
        'penalty.payments_and_credits',
        'penalty.filing_frequency',
        'penalty.period_start',
        'penalty.period_end',
        'penalty.installments',
        'penalty.member_count',
        'penalty.partner_count',
        'penalty.shareholder_count',
        'penalty.gross_receipts',
        'penalty.receipts_band',
        'penalty.annual_report_no_tax_due',
        'penalty.wa_subtotal_minus_credits',
        'penalty.tx_prior_year_franchise_tax',
        'penalty.tx_current_year_franchise_tax',
        'penalty.fl_tentative_tax',
        'penalty.ny_ptet_election_made',
        'penalty.ny_ptet_payments',
        'penalty.withholding_report_count',
        'penalty.ui_wage_report_count',
        'IGNORE',
      ]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    }),
  ),
})

const EntityNormalizerSchema = z.object({
  normalizations: z.array(
    z.object({
      raw: z.string(),
      normalized: z.enum([
        'llc',
        's_corp',
        'partnership',
        'c_corp',
        'sole_prop',
        'trust',
        'individual',
        'other',
      ]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    }),
  ),
})

const TaxTypesNormalizerSchema = z.object({
  normalizations: z.array(
    z.object({
      raw: z.string(),
      normalized: z.array(z.string()),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    }),
  ),
})

type EntityNormalizerResult = z.infer<typeof EntityNormalizerSchema>['normalizations'][number]
type TaxTypesNormalizerResult = z.infer<typeof TaxTypesNormalizerSchema>['normalizations'][number]

export interface MigrationDeps {
  scoped: ScopedRepo
  ai: AI
  userId: string
  plan?: BillingPlan
  internalDeadlineOffsetDays?: number
  monitoringStartDate?: string
  firmCreatedAt?: Date
  rawBucket?: R2Bucket
}

export interface UploadRawInput {
  batchId: string
  kind: TabularKind
  fileName?: string
  contentType?: string
  sizeBytes?: number
  /** Either utf-8 text (paste / csv / tsv) or base64-encoded bytes. */
  text?: string
  base64?: string
  rawBase64?: string
  sourceManifest?: MigrationSourceManifest
}

export class MigrationService {
  constructor(private readonly deps: MigrationDeps) {}

  private migrationOnboardingCompleted?: Promise<boolean>

  private hasCompletedMigrationOnboarding(): Promise<boolean> {
    this.migrationOnboardingCompleted ??= this.deps.scoped.migration
      .listByFirm()
      .then((batches) =>
        batches.some((batch) => batch.status === 'applied' || batch.appliedAt !== null),
      )
    return this.migrationOnboardingCompleted
  }

  private async migrationAiRouting() {
    const migrationOnboardingCompleted =
      this.deps.plan === 'solo' ? await this.hasCompletedMigrationOnboarding() : undefined

    return {
      firmId: this.deps.scoped.firmId,
      taskKind: 'migration' as const,
      ...(this.deps.plan ? { plan: this.deps.plan } : {}),
      ...(this.deps.firmCreatedAt ? { firmCreatedAt: this.deps.firmCreatedAt } : {}),
      ...(migrationOnboardingCompleted !== undefined ? { migrationOnboardingCompleted } : {}),
    }
  }

  // ---------------------------------------------------------------------
  // Step 1 — batch + raw input
  // ---------------------------------------------------------------------

  async createBatch(input: {
    source: MigrationSource
    presetUsed?: string | null
    rowCount?: number
  }): Promise<MigrationBatch> {
    const existing = await this.deps.scoped.migration.getActiveDraftBatch()
    if (existing) {
      throw new ORPCError('CONFLICT', {
        message:
          'Another import is currently in progress. Open Clients › Import history and discard the draft before starting a new one.',
      })
    }

    const { id } = await this.deps.scoped.migration.createBatch({
      userId: this.deps.userId,
      source: input.source,
      presetUsed: input.presetUsed ?? null,
      rowCount: input.rowCount ?? 0,
    })

    await this.deps.scoped.audit.write({
      actorId: this.deps.userId,
      entityType: 'migration_batch',
      entityId: id,
      action: 'migration.batch.created',
      after: { source: input.source, presetUsed: input.presetUsed ?? null },
    })

    const batch = await this.deps.scoped.migration.getBatch(id)
    if (!batch) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Batch row could not be re-read.' })
    }
    return toMigrationBatch(batch)
  }

  async uploadRaw(input: UploadRawInput): Promise<{ rawInputR2Key: string }> {
    const batch = await this.requireDraftBatch(input.batchId)

    let parsed: ParsedTabular
    const parserKind = input.kind === 'xlsx' ? 'tsv' : input.kind
    if (input.text !== undefined) {
      parsed = parseTabular(input.text, { kind: parserKind })
    } else if (input.base64 !== undefined) {
      const bytes = base64ToBytes(input.base64)
      // Decode straight to text — the parser does the same internally for
      // ArrayBuffer input, so this avoids a SharedArrayBuffer / ArrayBuffer
      // type juggle when running in Workers.
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      parsed = parseTabular(text, { kind: parserKind })
    } else {
      throw new ORPCError('BAD_REQUEST', {
        message: 'uploadRaw requires either `text` or `base64` payload.',
      })
    }

    const rawBytes =
      input.rawBase64 !== undefined
        ? base64ToBytes(input.rawBase64)
        : input.text !== undefined
          ? new TextEncoder().encode(input.text)
          : base64ToBytes(input.base64 ?? '')
    const fileName = input.fileName ?? defaultRawFileName(input.kind)
    const contentType = input.contentType ?? defaultRawContentType(input.kind)
    const sizeBytes = input.sizeBytes ?? rawBytes.byteLength
    const rawInputR2Key = await this.putRawInput({
      batchId: input.batchId,
      fileName,
      contentType,
      bytes: rawBytes,
    })

    const payload = (batch.mappingJson ?? {}) as MappingJsonPayload
    payload.rawInput = {
      kind: input.kind,
      headers: parsed.headers,
      rows: parsed.rows,
      rowCount: parsed.rowCount,
      truncated: parsed.truncated,
    }
    if (input.sourceManifest) payload.sourceManifest = input.sourceManifest

    await this.deps.scoped.migration.updateBatch(input.batchId, {
      mappingJson: payload,
      rawInputR2Key,
      rawInputFileName: fileName,
      rawInputContentType: contentType,
      rawInputSizeBytes: sizeBytes,
      rowCount: parsed.rowCount,
      status: 'mapping',
    })

    await this.deps.scoped.audit.write({
      actorId: this.deps.userId,
      entityType: 'migration_batch',
      entityId: input.batchId,
      action: 'migration.raw_uploaded',
      after: {
        rawInputR2Key,
        fileName,
        contentType,
        sizeBytes,
        kind: input.kind,
      },
    })

    return { rawInputR2Key }
  }

  // ---------------------------------------------------------------------
  // Step 2 — AI Field Mapper
  // ---------------------------------------------------------------------

  async runMapper(batchId: string): Promise<MapperRunOutput> {
    const batch = await this.requireBatch(batchId)
    const payload = (batch.mappingJson ?? {}) as MappingJsonPayload
    if (!payload.rawInput) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Step 1 raw input is missing — call uploadRaw first.',
      })
    }
    const { headers, rows } = payload.rawInput
    const sampleRows = rows.slice(0, MAX_SAMPLE_ROWS)

    let aiMappings: MappingRow[] | null = null
    let fallback: MapperFallback = null
    let aiOutputId: string | null = null

    const aiResult = await this.deps.ai.runPrompt(
      'mapper@v2',
      {
        header: headers,
        sample_rows: sampleRows,
        preset: batch.presetUsed,
        firm_id_hash: this.deps.scoped.firmId,
      },
      MapperOutputSchema,
      await this.migrationAiRouting(),
    )
    const recorded = await this.recordAiRun('migration_map', batchId, aiResult)
    aiOutputId = recorded.aiOutputId

    if (aiResult.result) {
      aiMappings = aiResult.result.mappings.map(
        (m) =>
          ({
            id: crypto.randomUUID(),
            batchId,
            sourceHeader: m.source,
            targetField: m.target,
            confidence: m.confidence,
            reasoning: m.reasoning ?? null,
            userOverridden: false,
            model: aiResult.model,
            promptVersion: 'mapper@v2',
            createdAt: new Date().toISOString(),
          }) satisfies MappingRow,
      )
    }

    if (!aiMappings) {
      if (isPresetId(batch.presetUsed)) {
        aiMappings = buildPresetMappings(batch.presetUsed, headers, batchId)
        fallback = 'preset'
      } else {
        aiMappings = buildAllIgnoreMappings(headers, batchId)
        fallback = 'all_ignore'
      }
    }

    if (!aiOutputId) {
      throw new Error(`Missing AI output trace for mapper run ${batchId}`)
    }

    const { sanitizedMappings, ssnBlockedHeaders } = sanitizeMapperOutput(
      aiMappings,
      headers,
      sampleRows,
      { batchId },
    )

    // Persist the raw AI run (or preset fallback) for audit trail.
    await this.deps.scoped.migration.createMappings(
      batchId,
      sanitizedMappings.map((m) => ({
        sourceHeader: m.sourceHeader,
        targetField: m.targetField,
        confidence: m.confidence,
        reasoning: m.reasoning,
        userOverridden: m.userOverridden,
        model: m.model,
        promptVersion: m.promptVersion,
      })),
    )

    // Per-mapping evidence (ai_mapper). Use sourceId = batchId so the
    // Evidence drawer can group by batch.
    if (sanitizedMappings.length > 0) {
      await this.deps.scoped.evidence.writeBatch(
        sanitizedMappings.map((m) => ({
          aiOutputId,
          sourceType: 'ai_mapper',
          sourceId: batchId,
          rawValue: m.sourceHeader,
          normalizedValue: m.targetField,
          confidence: m.confidence,
          model: m.model,
          appliedBy: this.deps.userId,
        })),
      )
    }

    // Stash the AI mappings (sanitized) into mappingJson so Re-run flow
    // and Step 4 commit can read them without another AI call.
    payload.aiMappings = sanitizedMappings
    payload.confirmedMappings = sanitizedMappings
    payload.mapperFallback = fallback
    payload.ssnBlockedColumns = headers
      .map((h, i) => (ssnBlockedHeaders.includes(h) ? i : -1))
      .filter((i) => i >= 0)

    await this.deps.scoped.migration.updateBatch(batchId, {
      mappingJson: payload,
    })

    return { mappings: sanitizedMappings, meta: { fallback } }
  }

  async confirmMapping(batchId: string, userMappings: MappingRow[]): Promise<MapperRunOutput> {
    const batch = await this.requireBatch(batchId)
    const payload = (batch.mappingJson ?? {}) as MappingJsonPayload
    if (!payload.rawInput) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Step 1 raw input is missing — call uploadRaw first.',
      })
    }

    // Validate user input against the contract schema once more — even
    // though oRPC already does, we want guarantees inside service tests.
    const validated = userMappings.map((m) => MappingRowSchema.parse(m))

    const { sanitizedMappings } = sanitizeMapperOutput(
      validated,
      payload.rawInput.headers,
      payload.rawInput.rows.slice(0, MAX_SAMPLE_ROWS),
      { batchId },
    )

    payload.confirmedMappings = sanitizedMappings

    // Run deterministic checks now that we know which column targets which
    // field (EIN format, empty name) and persist as migration_error rows.
    const detErrors = validateRows(
      payload.rawInput.headers,
      payload.rawInput.rows,
      sanitizedMappings,
    )
    if (detErrors.length > 0) {
      await this.persistErrors(batchId, detErrors)
    }

    await this.deps.scoped.migration.updateBatch(batchId, {
      mappingJson: payload,
      status: 'reviewing',
    })

    await this.deps.scoped.audit.write({
      actorId: this.deps.userId,
      entityType: 'migration_batch',
      entityId: batchId,
      action: 'migration.mapper.confirmed',
      after: {
        rowCount: sanitizedMappings.length,
        errorCount: detErrors.length,
      },
    })

    return { mappings: sanitizedMappings, meta: { fallback: payload.mapperFallback ?? null } }
  }

  // ---------------------------------------------------------------------
  // Step 3 — Normalize + Default Matrix
  // ---------------------------------------------------------------------

  async runNormalizer(batchId: string): Promise<{ normalizations: NormalizationRow[] }> {
    const batch = await this.requireBatch(batchId)
    const payload = (batch.mappingJson ?? {}) as MappingJsonPayload
    if (!payload.rawInput || !payload.confirmedMappings) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Mapper has not been confirmed yet — call confirmMapping first.',
      })
    }

    const valuesByField = collectValuesByField(
      payload.rawInput.headers,
      payload.rawInput.rows,
      payload.confirmedMappings,
    )

    const out: NormalizationRow[] = []
    const aiOutputByNormalizationId = new Map<string, string>()

    if (valuesByField.entityValues.length > 0) {
      const entityResult = await this.runEntityNormalizer(batchId, valuesByField.entityValues)
      out.push(...entityResult.rows)
      for (const row of entityResult.rows) {
        aiOutputByNormalizationId.set(row.id, entityResult.aiOutputId)
      }
    }
    if (valuesByField.taxTypeValues.length > 0) {
      const taxResult = await this.runTaxTypeNormalizer(batchId, valuesByField.taxTypeValues)
      out.push(...taxResult.rows)
      for (const row of taxResult.rows) {
        aiOutputByNormalizationId.set(row.id, taxResult.aiOutputId)
      }
    }
    if (valuesByField.stateValues.length > 0) {
      const stateRows = this.runStateNormalizer(batchId, valuesByField.stateValues)
      out.push(...stateRows)
      const { aiOutputId } = await this.recordLocalNormalizerRun(batchId, {
        field: 'state',
        values: valuesByField.stateValues,
      })
      for (const row of stateRows) {
        aiOutputByNormalizationId.set(row.id, aiOutputId)
      }
    }

    if (out.length > 0) {
      await this.deps.scoped.migration.createNormalizations(
        batchId,
        out.map((n) => ({
          field: n.field,
          rawValue: n.rawValue,
          normalizedValue: n.normalizedValue,
          confidence: n.confidence,
          model: n.model,
          promptVersion: n.promptVersion,
          reasoning: n.reasoning,
          userOverridden: n.userOverridden,
        })),
      )
      await this.deps.scoped.evidence.writeBatch(
        out.map((n) => {
          const aiOutputId = aiOutputByNormalizationId.get(n.id)
          if (!aiOutputId) {
            throw new Error(`Missing AI output trace for normalization ${n.id}`)
          }
          return {
            aiOutputId,
            sourceType: 'ai_normalizer',
            sourceId: batchId,
            rawValue: n.rawValue,
            normalizedValue: n.normalizedValue,
            confidence: n.confidence,
            model: n.model,
            appliedBy: this.deps.userId,
          }
        }),
      )
    }

    payload.aiNormalizations = out
    payload.confirmedNormalizations = out
    await this.deps.scoped.migration.updateBatch(batchId, { mappingJson: payload })

    return { normalizations: out }
  }

  async confirmNormalization(
    batchId: string,
    userNormalizations: NormalizationRow[],
  ): Promise<{ normalizations: NormalizationRow[] }> {
    const batch = await this.requireBatch(batchId)
    const payload = (batch.mappingJson ?? {}) as MappingJsonPayload
    if (!payload.rawInput || !payload.confirmedMappings) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Mapper has not been confirmed yet — call confirmMapping first.',
      })
    }

    const validated = userNormalizations.map((n) => NormalizationRowSchema.parse(n))
    payload.confirmedNormalizations = validated
    await this.deps.scoped.migration.updateBatch(batchId, { mappingJson: payload })

    await this.deps.scoped.audit.write({
      actorId: this.deps.userId,
      entityType: 'migration_batch',
      entityId: batchId,
      action: 'migration.normalizer.confirmed',
      after: { rowCount: validated.length },
    })

    return { normalizations: validated }
  }

  async applyDefaultMatrix(
    batchId: string,
    matrixSelections: readonly MatrixSelection[] = [],
  ): Promise<DryRunSummary> {
    const batch = await this.requireBatch(batchId)
    const payload = (batch.mappingJson ?? {}) as MappingJsonPayload
    if (!payload.rawInput || !payload.confirmedMappings) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Mapper must be confirmed before applying Default Matrix.',
      })
    }

    const matrix = computeMatrixApplication(payload, matrixSelections)
    payload.matrixSelections = [...matrixSelections]
    payload.matrixApplied = matrix

    await this.deps.scoped.migration.updateBatch(batchId, { mappingJson: payload })

    await this.deps.scoped.audit.write({
      actorId: this.deps.userId,
      entityType: 'migration_batch',
      entityId: batchId,
      action: 'migration.matrix.applied',
      after: {
        cells: matrix.length,
        enabledCells: matrix.filter((e) => e.enabled).length,
        disabledCells: matrix.filter((e) => !e.enabled).length,
        clientsAffected: matrix.reduce(
          (sum, e) => (e.enabled ? sum + e.appliedClientCount : sum),
          0,
        ),
      },
    })

    const rules = await runtimeRulesForFirm(this.deps.scoped)
    return this.composeDryRun(batchId, payload, rules)
  }

  // ---------------------------------------------------------------------
  // Step 4 — Dry-Run preview and apply
  // ---------------------------------------------------------------------

  async dryRun(batchId: string): Promise<DryRunSummary> {
    const batch = await this.requireBatch(batchId)
    const payload = (batch.mappingJson ?? {}) as MappingJsonPayload
    const rules = await runtimeRulesForFirm(this.deps.scoped)
    return this.composeDryRun(batchId, payload, rules)
  }

  async apply(batchId: string): Promise<{
    batchId: string
    clientCount: number
    obligationCount: number
    skippedCount: number
    revertibleUntil: string
  }> {
    const batch = await this.requireBatch(batchId)
    if (batch.status === 'applied') {
      throw new ORPCError('CONFLICT', { message: 'This import has already been applied.' })
    }
    if (batch.status === 'reverted') {
      throw new ORPCError('CONFLICT', { message: 'This import has already been reverted.' })
    }
    if (batch.status !== 'reviewing') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Confirm mapping and normalization before importing.',
      })
    }

    const payload = (batch.mappingJson ?? {}) as MappingJsonPayload
    const rules = await runtimeRulesForFirm(this.deps.scoped)
    const plan = buildCommitPlan({
      batchId,
      firmId: this.deps.scoped.firmId,
      userId: this.deps.userId,
      payload,
      internalDeadlineOffsetDays:
        this.deps.internalDeadlineOffsetDays ?? DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
      ...(this.deps.monitoringStartDate
        ? { monitoringStartDate: this.deps.monitoringStartDate }
        : {}),
      rules,
    })

    if (plan.clients.length === 0) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'No valid client rows are ready to import.',
      })
    }

    await this.deps.scoped.migration.commitImport(plan)

    return {
      batchId,
      clientCount: plan.clients.length,
      obligationCount: plan.obligations.length,
      skippedCount: plan.skippedCount,
      revertibleUntil: plan.revertExpiresAt.toISOString(),
    }
  }

  async discardDraft(batchId: string): Promise<{ discardedAt: string }> {
    const batch = await this.requireBatch(batchId)
    if (batch.status !== 'draft') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Only draft imports can be discarded.',
      })
    }

    const discardedAt = new Date()
    await this.deps.scoped.migration.updateBatch(batchId, { status: 'failed' })
    await this.deps.scoped.audit.write({
      actorId: this.deps.userId,
      entityType: 'migration_batch',
      entityId: batchId,
      action: 'migration.discarded',
      after: {
        previousStatus: batch.status,
        discardedAt: discardedAt.toISOString(),
      },
    })

    return { discardedAt: discardedAt.toISOString() }
  }

  async revert(batchId: string): Promise<{ revertedAt: string }> {
    const batch = await this.requireBatch(batchId)
    this.assertBatchRevertible(batch)

    const revertedAt = new Date()
    await this.deps.scoped.migration.revertImport({
      batchId,
      userId: this.deps.userId,
      revertedAt,
    })

    return { revertedAt: revertedAt.toISOString() }
  }

  async singleUndo(batchId: string, clientId: string): Promise<{ revertedAt: string }> {
    const batch = await this.requireBatch(batchId)
    this.assertBatchSingleUndoable(batch)

    const revertedAt = new Date()
    await this.deps.scoped.migration.singleUndoImport({
      batchId,
      clientId,
      userId: this.deps.userId,
      revertedAt,
    })

    return { revertedAt: revertedAt.toISOString() }
  }

  async getBatch(batchId: string): Promise<MigrationBatch | null> {
    const row = await this.deps.scoped.migration.getBatch(batchId)
    return row ? toMigrationBatch(row) : null
  }

  async listBatches(input: { limit?: number; status?: MigrationBatch['status'] } = {}): Promise<{
    batches: MigrationBatch[]
  }> {
    const rows = await this.deps.scoped.migration.listByFirm({ limit: input.limit ?? 50 })
    return {
      batches: rows
        .filter((row) => (input.status ? row.status === input.status : true))
        .map(toMigrationBatch),
    }
  }

  /**
   * Read-only list of migration_error rows for a batch, optionally filtered
   * by stage. Stage classification is heuristic on `errorCode` until each
   * deterministic check tags its origin explicitly:
   *   - mapping  : EIN_INVALID, EMPTY_NAME (Step 2 confirmMapping)
   *   - normalize: STATE_*, ENTITY_*, *_INVALID raised in normalize step
   *   - matrix   : reserved for Default Matrix application errors
   *   - all      : no filter
   */
  async listErrors(
    batchId: string,
    stage: 'mapping' | 'normalize' | 'matrix' | 'all' = 'all',
  ): Promise<MigrationError[]> {
    // requireBatch enforces firm ownership before we read anything.
    await this.requireBatch(batchId)
    const rows = await this.deps.scoped.migration.listErrors(batchId)
    const filtered =
      stage === 'all' ? rows : rows.filter((r) => classifyErrorStage(r.errorCode) === stage)
    return filtered.map((row) => toMigrationError(row))
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private async requireBatch(batchId: string) {
    const row = await this.deps.scoped.migration.getBatch(batchId)
    if (!row) {
      throw new ORPCError('NOT_FOUND', { message: `Migration batch ${batchId} not found.` })
    }
    return row
  }

  private async requireDraftBatch(batchId: string) {
    const batch = await this.requireBatch(batchId)
    if (batch.status === 'applied' || batch.status === 'reverted') {
      throw new ORPCError('BAD_REQUEST', {
        message: `Batch ${batchId} is ${batch.status}; create a new batch to import again.`,
      })
    }
    return batch
  }

  private async putRawInput(input: {
    batchId: string
    fileName: string
    contentType: string
    bytes: Uint8Array
  }): Promise<string> {
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload'
    const key = `firm/${this.deps.scoped.firmId}/migration/${input.batchId}/${safeName}`
    if (this.deps.rawBucket) {
      await this.deps.rawBucket.put(key, input.bytes, {
        httpMetadata: { contentType: input.contentType },
      })
    }
    return key
  }

  private assertBatchRevertible(batch: Awaited<ReturnType<MigrationService['requireBatch']>>) {
    if (batch.status === 'reverted') {
      throw new ORPCError('CONFLICT', { message: 'This import has already been reverted.' })
    }
    if (batch.status !== 'applied') {
      throw new ORPCError('BAD_REQUEST', { message: 'Only applied imports can be reverted.' })
    }
    if (!batch.revertExpiresAt || batch.revertExpiresAt.getTime() < Date.now()) {
      throw new ORPCError('CONFLICT', {
        message: 'The 24-hour import revert window has expired.',
      })
    }
  }

  private assertBatchSingleUndoable(batch: Awaited<ReturnType<MigrationService['requireBatch']>>) {
    if (batch.status === 'reverted') {
      throw new ORPCError('CONFLICT', { message: 'This import has already been reverted.' })
    }
    if (batch.status !== 'applied') {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Only applied imports support single-client undo.',
      })
    }
    const appliedAt = batch.appliedAt ?? batch.revertExpiresAt
    if (!appliedAt || appliedAt.getTime() + 7 * 24 * 60 * 60 * 1000 < Date.now()) {
      throw new ORPCError('CONFLICT', {
        message: 'The 7-day single-client undo window has expired.',
      })
    }
  }

  private async persistErrors(batchId: string, errors: DeterministicError[]): Promise<void> {
    await this.deps.scoped.migration.createErrors(
      batchId,
      errors.map((e) => ({
        rowIndex: e.rowIndex,
        rawRowJson: e.rawRow,
        errorCode: e.errorCode,
        errorMessage: e.errorMessage,
      })),
    )
  }

  private composeDryRun(
    batchId: string,
    payload: MappingJsonPayload,
    rules: readonly CoreObligationRule[] = [],
  ): DryRunSummary {
    const stats = computeDryRunStats(batchId, payload)
    const exactPlan =
      payload.rawInput && payload.confirmedMappings && payload.confirmedNormalizations
        ? buildCommitPlan({
            batchId,
            firmId: this.deps.scoped.firmId,
            userId: this.deps.userId,
            payload,
            internalDeadlineOffsetDays:
              this.deps.internalDeadlineOffsetDays ?? DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
            ...(this.deps.monitoringStartDate
              ? { monitoringStartDate: this.deps.monitoringStartDate }
              : {}),
            rules,
          })
        : null
    const summary: DryRunSummary = {
      batchId,
      clientsToCreate: stats.clientsToCreate,
      obligationsToCreate: exactPlan ? exactPlan.obligations.length : stats.obligationsToCreate,
      historicalDeadlinesSkipped: exactPlan ? exactPlan.historicalDeadlineSkippedCount : 0,
      rolledForwardDeadlines: exactPlan ? exactPlan.rolledForwardDeadlineCount : 0,
      skippedRows: stats.skippedRows,
      errors: stats.errors,
      ruleReviewWarnings: computeRuleReviewWarnings(payload, rules),
      ...(exactPlan ? { clientsPreview: buildClientsPreview(exactPlan) } : {}),
    }
    return DryRunSummarySchema.parse(summary)
  }

  private async recordAiRun<TOut>(
    kind: 'migration_map' | 'migration_normalize',
    batchId: string,
    aiResult: AiRunResult<TOut>,
  ): Promise<{ aiOutputId: string; llmLogId: string }> {
    return this.deps.scoped.ai.recordRun({
      userId: this.deps.userId,
      kind,
      inputContextRef: batchId,
      trace: {
        ...aiResult.trace,
        model: aiResult.model ?? aiResult.trace.model,
      },
      outputText: aiResult.result ? JSON.stringify(aiResult.result) : null,
      errorMsg: aiResult.refusal?.message ?? null,
    })
  }

  private async recordLocalNormalizerRun(
    batchId: string,
    input: { field: string; values: readonly string[] },
  ): Promise<{ aiOutputId: string; llmLogId: string }> {
    return this.deps.scoped.ai.recordRun({
      userId: this.deps.userId,
      kind: 'migration_normalize',
      inputContextRef: batchId,
      trace: {
        promptVersion: PRESET_VERSION,
        model: null,
        latencyMs: 0,
        guardResult: 'ok',
        inputHash: await hashValue(input),
      },
      outputText: JSON.stringify(input),
      errorMsg: null,
    })
  }

  private async runEntityNormalizer(
    batchId: string,
    rawValues: string[],
  ): Promise<{ rows: NormalizationRow[]; aiOutputId: string }> {
    const now = new Date().toISOString()
    const aiResult = await this.deps.ai.runPrompt(
      'normalizer-entity@v1',
      { values: rawValues },
      EntityNormalizerSchema,
      await this.migrationAiRouting(),
    )
    const { aiOutputId } = await this.recordAiRun('migration_normalize', batchId, aiResult)

    if (aiResult.result) {
      const hits = new Map<string, EntityNormalizerResult>(
        aiResult.result.normalizations.map((hit) => [hit.raw, hit]),
      )
      return {
        aiOutputId,
        rows: rawValues.map((raw) => {
          const hit = hits.get(raw)
          const normalized = resolveEntityNormalization(raw, hit ?? null)
          return {
            id: crypto.randomUUID(),
            batchId,
            field: 'entity_type',
            rawValue: raw,
            normalizedValue: normalized.value,
            confidence: normalized.confidence,
            model: aiResult.model,
            promptVersion: 'normalizer-entity@v1',
            reasoning: normalized.reasoning,
            userOverridden: false,
            createdAt: now,
          } satisfies NormalizationRow
        }),
      }
    }

    return {
      aiOutputId,
      rows: rawValues.map((raw) => {
        const normalized = resolveEntityNormalization(raw, null)
        return {
          id: crypto.randomUUID(),
          batchId,
          field: 'entity_type',
          rawValue: raw,
          normalizedValue: normalized.value,
          confidence: normalized.confidence,
          model: null,
          promptVersion: normalized.promptVersion,
          reasoning: normalized.reasoning,
          userOverridden: false,
          createdAt: now,
        } satisfies NormalizationRow
      }),
    }
  }

  private async runTaxTypeNormalizer(
    batchId: string,
    rawValues: string[],
  ): Promise<{ rows: NormalizationRow[]; aiOutputId: string }> {
    const now = new Date().toISOString()
    const aiResult = await this.deps.ai.runPrompt(
      'normalizer-tax-types@v1',
      { values: rawValues },
      TaxTypesNormalizerSchema,
      await this.migrationAiRouting(),
    )
    const { aiOutputId } = await this.recordAiRun('migration_normalize', batchId, aiResult)

    if (aiResult.result) {
      const hits = new Map<string, TaxTypesNormalizerResult>(
        aiResult.result.normalizations.map((hit) => [hit.raw, hit]),
      )
      return {
        aiOutputId,
        rows: rawValues.map((raw) => {
          const hit = hits.get(raw)
          const aiNormalized = hit?.normalized ?? []
          const dictionaryHit = aiNormalized.length === 0 ? normalizeTaxTypes(raw) : null
          const normalized =
            aiNormalized.length > 0 ? aiNormalized : (dictionaryHit?.normalized ?? [])
          return {
            id: crypto.randomUUID(),
            batchId,
            field: 'tax_types',
            rawValue: raw,
            normalizedValue: normalized.length > 0 ? JSON.stringify(normalized) : null,
            confidence:
              aiNormalized.length > 0
                ? (hit?.confidence ?? null)
                : (dictionaryHit?.confidence ?? null),
            model: aiNormalized.length > 0 ? aiResult.model : null,
            promptVersion:
              aiNormalized.length > 0
                ? 'normalizer-tax-types@v1'
                : (dictionaryHit?.promptVersion ?? 'normalizer-tax-types@v1'),
            reasoning:
              aiNormalized.length > 0
                ? (hit?.reasoning ?? null)
                : dictionaryHit
                  ? 'Deterministic tax-type lookup.'
                  : (hit?.reasoning ?? null),
            userOverridden: false,
            createdAt: now,
          } satisfies NormalizationRow
        }),
      }
    }

    // Dictionary fallback for common fixture/vendor labels. If a vendor
    // provided a tax-type column, Default Matrix will not infer over it, so
    // raw labels like "Form 1065 + CA LLC" need a deterministic path.
    return {
      aiOutputId,
      rows: rawValues.map((raw) => {
        const hit = normalizeTaxTypes(raw)
        const normalized = hit?.normalized ?? []
        return {
          id: crypto.randomUUID(),
          batchId,
          field: 'tax_types',
          rawValue: raw,
          normalizedValue: normalized.length > 0 ? JSON.stringify(normalized) : null,
          confidence: hit?.confidence ?? null,
          model: null,
          promptVersion: hit?.promptVersion ?? PRESET_VERSION,
          reasoning:
            normalized.length > 0
              ? 'Local tax-type dictionary fallback.'
              : 'No tax-type dictionary match.',
          userOverridden: false,
          createdAt: now,
        } satisfies NormalizationRow
      }),
    }
  }

  private runStateNormalizer(batchId: string, rawValues: string[]): NormalizationRow[] {
    const now = new Date().toISOString()
    return rawValues.map((raw) => {
      const hit = normalizeState(raw)
      return {
        id: crypto.randomUUID(),
        batchId,
        field: 'state',
        rawValue: raw,
        normalizedValue: hit?.normalized ?? null,
        confidence: hit?.confidence ?? null,
        model: null,
        promptVersion: hit?.promptVersion ?? PRESET_VERSION,
        reasoning: hit
          ? 'Deterministic state code lookup.'
          : 'No state match — flagged for review.',
        userOverridden: false,
        createdAt: now,
      } satisfies NormalizationRow
    })
  }
}

// ---------------------------------------------------------------------
// Pure helpers (kept outside the class for testability + tree-shake)
// ---------------------------------------------------------------------

function collectValuesByField(
  headers: string[],
  rows: string[][],
  mappings: readonly MappingRow[],
): { entityValues: string[]; stateValues: string[]; taxTypeValues: string[] } {
  const headerToIndex = new Map<string, number>()
  headers.forEach((h, i) => headerToIndex.set(h, i))

  const entityIdx = mappings.find((m) => m.targetField === 'client.entity_type')?.sourceHeader
  const stateIdx = mappings.find((m) => m.targetField === 'client.state')?.sourceHeader
  const filingStatesIdx = mappings.find(
    (m) => m.targetField === 'client.filing_states',
  )?.sourceHeader
  const taxIdx = mappings.find((m) => m.targetField === 'client.tax_types')?.sourceHeader

  return {
    entityValues: collectColumn(headerToIndex.get(entityIdx ?? ''), rows),
    stateValues: [
      ...collectColumn(headerToIndex.get(stateIdx ?? ''), rows),
      ...collectColumn(headerToIndex.get(filingStatesIdx ?? ''), rows),
    ],
    taxTypeValues: collectColumn(headerToIndex.get(taxIdx ?? ''), rows),
  }
}

function collectColumn(idx: number | undefined, rows: string[][]): string[] {
  if (idx === undefined) return []
  const out = new Set<string>()
  for (const row of rows) {
    const v = row[idx]
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed) out.add(trimmed)
    }
  }
  return Array.from(out)
}

function resolveEntityNormalization(
  raw: string,
  hit: EntityNormalizerResult | null,
): {
  value: EntityType
  confidence: number
  promptVersion: string
  reasoning: string
} {
  if (hit) {
    const normalized = canonicalizeEntityType(hit.normalized)
    if (normalized) {
      return {
        value: normalized,
        confidence: hit.confidence,
        promptVersion: 'normalizer-entity@v1',
        reasoning: hit.reasoning,
      }
    }
  }

  const dictionaryHit = normalizeEntityType(raw)
  if (dictionaryHit) {
    return {
      value: dictionaryHit.normalized,
      confidence: dictionaryHit.confidence,
      promptVersion: dictionaryHit.promptVersion,
      reasoning: hit
        ? `${hit.reasoning} Local dictionary corrected the entity type.`
        : 'Local dictionary fallback.',
    }
  }

  return {
    value: 'other',
    confidence: 0.25,
    promptVersion: hit ? 'normalizer-entity@v1' : PRESET_VERSION,
    reasoning: hit
      ? `${hit.reasoning} Marked as Other for review.`
      : 'No entity type match; marked as Other for review.',
  }
}

function canonicalizeEntityType(value: string): EntityType | null {
  if (isEntityType(value)) return value
  return normalizeEntityType(value)?.normalized ?? null
}

function base64ToBytes(b64: string): Uint8Array {
  // atob is part of the Web Standard available in Workers + browsers + Node ≥ 16.
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

async function hashValue(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

interface DryRunStats {
  clientsToCreate: number
  obligationsToCreate: number
  skippedRows: number
  errors: DryRunSummary['errors']
}

function computeDryRunStats(batchId: string, payload: MappingJsonPayload): DryRunStats {
  if (!payload.rawInput || !payload.confirmedMappings) {
    return { clientsToCreate: 0, obligationsToCreate: 0, skippedRows: 0, errors: [] }
  }
  const { headers, rows } = payload.rawInput
  const mappings = payload.confirmedMappings

  // Re-run deterministic + post-normalize validation against the user-
  // confirmed view (so dryRun is a fresh snapshot, never a stale cache).
  const detErrors = validateRows(headers, rows, mappings)

  // Count happy clients = rows without EMPTY_NAME.
  const skippedSet = new Set(
    detErrors.filter((e) => e.errorCode === 'EMPTY_NAME').map((e) => e.rowIndex),
  )
  const clientsToCreate = rows.length - skippedSet.size

  // Obligation count: per-client tax_types after merging confirmed
  // normalizations + matrix application. Default Matrix may run before or
  // after dryRun; either way matrixApplied is the source of truth here.
  const obligationsToCreate = estimateObligationCount(payload, clientsToCreate)

  // Surface deterministic errors (post-normalize) on top of EIN/EMPTY_NAME
  // so the UI banner can plural-pluck them.
  const postErrors = derivePostNormalizeErrors(payload, headers)
  const all: DeterministicError[] = [...detErrors, ...postErrors]

  const now = new Date().toISOString()
  return {
    clientsToCreate,
    obligationsToCreate,
    skippedRows: skippedSet.size,
    errors: all.map((e) => ({
      id: crypto.randomUUID(),
      batchId,
      rowIndex: e.rowIndex,
      rawRowJson: e.rawRow,
      errorCode: e.errorCode,
      errorMessage: e.errorMessage,
      createdAt: now,
    })),
  }
}

const CLIENTS_PREVIEW_CAP = 50

/**
 * Per-client dry-run preview rows. Lets Step 4 show "here's what we'll
 * create" (confirm by outcome) instead of only aggregate counts. Capped to a
 * sample; clientsToCreate on the summary carries the full total. Tax types and
 * obligation counts are joined from the exact commit plan by clientId.
 */
function buildClientsPreview(plan: ReturnType<typeof buildCommitPlan>): DryRunClientPreview[] {
  const obligationCountByClient = new Map<string, number>()
  for (const obligation of plan.obligations) {
    obligationCountByClient.set(
      obligation.clientId,
      (obligationCountByClient.get(obligation.clientId) ?? 0) + 1,
    )
  }
  const taxTypesByClient = new Map<string, Set<string>>()
  for (const profile of plan.filingProfiles) {
    let taxTypes = taxTypesByClient.get(profile.clientId)
    if (!taxTypes) {
      taxTypes = new Set<string>()
      taxTypesByClient.set(profile.clientId, taxTypes)
    }
    for (const taxType of profile.taxTypesJson) taxTypes.add(taxType)
  }
  return plan.clients.slice(0, CLIENTS_PREVIEW_CAP).map((client) => ({
    name: client.name,
    ein: client.ein ?? null,
    entityType: client.entityType ?? null,
    state: client.state ?? null,
    taxTypes: [...(taxTypesByClient.get(client.id) ?? [])],
    obligationCount: obligationCountByClient.get(client.id) ?? 0,
  }))
}

function derivePostNormalizeErrors(
  payload: MappingJsonPayload,
  headers: readonly string[],
): DeterministicError[] {
  if (!payload.rawInput || !payload.confirmedMappings || !payload.confirmedNormalizations) {
    return []
  }
  const headerToIndex = new Map<string, number>()
  headers.forEach((h, i) => headerToIndex.set(h, i))
  const entitySrc = payload.confirmedMappings.find(
    (m) => m.targetField === 'client.entity_type',
  )?.sourceHeader
  const stateSrc = payload.confirmedMappings.find(
    (m) => m.targetField === 'client.state',
  )?.sourceHeader
  const entityIdx = entitySrc ? headerToIndex.get(entitySrc) : undefined
  const stateIdx = stateSrc ? headerToIndex.get(stateSrc) : undefined

  const entityMap = new Map<string, string | null>()
  const stateMap = new Map<string, string | null>()
  for (const n of payload.confirmedNormalizations) {
    if (n.field === 'entity_type') entityMap.set(n.rawValue, n.normalizedValue ?? null)
    else if (n.field === 'state') stateMap.set(n.rawValue, n.normalizedValue ?? null)
  }

  const checks = payload.rawInput.rows.map((row, rowIndex) => {
    const rawEntity = entityIdx !== undefined ? (row[entityIdx] ?? '').trim() : ''
    const rawState = stateIdx !== undefined ? (row[stateIdx] ?? '').trim() : ''
    return {
      rowIndex,
      rawRow: rowToObject(headers, row),
      entityType: rawEntity ? (entityMap.get(rawEntity) ?? null) : null,
      state: rawState ? (stateMap.get(rawState) ?? null) : null,
    }
  })

  return validateNormalizedRows(checks)
}

function rowToObject(headers: readonly string[], row: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((h, i) => {
    out[h] = row[i] ?? ''
  })
  return out
}

function estimateObligationCount(payload: MappingJsonPayload, clientCount: number): number {
  // Demo Sprint heuristic: every client gets the (entity × state) cell
  // tax_types from the matrix. If a client lacks state we still include
  // federal_overlay, so worst case = 1 per client.
  if (!payload.matrixApplied || payload.matrixApplied.length === 0) {
    // Pre-matrix dry run: best-effort estimate so the UI counter is non-
    // zero. Two obligations per client matches the smallest CA × LLC cell.
    return clientCount * 2
  }
  return payload.matrixApplied.reduce(
    (sum, e) => (e.enabled ? sum + e.taxTypes.length * e.appliedClientCount : sum),
    0,
  )
}

function computeMatrixApplication(
  payload: MappingJsonPayload,
  matrixSelections: readonly MatrixSelection[] = [],
): MatrixApplicationEntry[] {
  if (!payload.rawInput || !payload.confirmedMappings) return []
  const { headers, rows } = payload.rawInput
  const mappings = payload.confirmedMappings
  const headerToIndex = new Map<string, number>()
  headers.forEach((h, i) => headerToIndex.set(h, i))
  const selectionByCell = new Map(
    matrixSelections.map((selection) => [
      `${selection.entityType}::${selection.state}`,
      selection.enabled,
    ]),
  )

  const entityIdx = headerToIndex.get(
    mappings.find((m) => m.targetField === 'client.entity_type')?.sourceHeader ?? '',
  )
  const stateIdx = headerToIndex.get(
    mappings.find((m) => m.targetField === 'client.state')?.sourceHeader ?? '',
  )
  const filingStatesIdx = headerToIndex.get(
    mappings.find((m) => m.targetField === 'client.filing_states')?.sourceHeader ?? '',
  )
  const taxIdx = headerToIndex.get(
    mappings.find((m) => m.targetField === 'client.tax_types')?.sourceHeader ?? '',
  )

  // Apply normalization first (dictionary or AI confirmed).
  const entityMap = new Map<string, string | null>()
  const stateMap = new Map<string, string | null>()
  for (const n of payload.confirmedNormalizations ?? []) {
    if (n.field === 'entity_type') entityMap.set(n.rawValue, n.normalizedValue ?? null)
    else if (n.field === 'state') stateMap.set(n.rawValue, n.normalizedValue ?? null)
  }

  // Group rows by (entity, state) cell to count appliedClientCount.
  const cellCounts = new Map<
    string,
    {
      entityType: string
      state: string
      count: number
      applicationMode: MatrixApplicationEntry['applicationMode']
    }
  >()
  for (const row of rows) {
    const rawTaxTypes = taxIdx !== undefined ? (row[taxIdx] ?? '').trim() : ''
    const explicitTaxTypes = normalizeTaxTypesFromRows(
      payload.confirmedNormalizations ?? [],
      rawTaxTypes,
    )

    const rawEntity = entityIdx !== undefined ? (row[entityIdx] ?? '').trim() : ''
    const rawState = stateIdx !== undefined ? (row[stateIdx] ?? '').trim() : ''
    const rawFilingStates = filingStatesIdx !== undefined ? (row[filingStatesIdx] ?? '').trim() : ''
    const entity = entityMap.get(rawEntity) ?? rawEntity.toLowerCase()
    if (!entity) continue
    const states = uniqueStrings([
      ...splitStateList(rawState, stateMap),
      ...splitStateList(rawFilingStates, stateMap),
    ])
    for (const state of states) {
      const applicationMode = matrixApplicationModeForTaxTypes(explicitTaxTypes, state)
      if (!applicationMode) continue
      const key = `${entity}::${state}`
      const cell = cellCounts.get(key)
      if (cell) {
        cell.count += 1
        if (applicationMode === 'federal_return_type_plus_state') {
          cell.applicationMode = applicationMode
        }
      } else {
        cellCounts.set(key, { entityType: entity, state, count: 1, applicationMode })
      }
    }
  }

  const out: MatrixApplicationEntry[] = []
  for (const cell of cellCounts.values()) {
    if (!isEntityType(cell.entityType)) continue
    const result: InferTaxTypesResult = inferTaxTypes(cell.entityType, cell.state)
    const key = `${cell.entityType}::${cell.state}`
    out.push({
      entityType: cell.entityType,
      state: cell.state,
      taxTypes: [...result.taxTypes],
      needsReview: result.needsReview,
      confidence: result.confidence,
      matrixVersion: result.matrixVersion,
      enabled: selectionByCell.get(key) ?? true,
      appliedClientCount: cell.count,
      applicationMode: cell.applicationMode,
    })
  }
  return out
}

function computeRuleReviewWarnings(
  payload: MappingJsonPayload,
  activeRules: readonly CoreObligationRule[],
): DryRunSummary['ruleReviewWarnings'] {
  const warnings: DryRunSummary['ruleReviewWarnings'] = []
  const catalogRules = listObligationRules({ includeCandidates: true }).filter(
    (rule) => rule.status !== 'deprecated',
  )

  for (const cell of payload.matrixApplied ?? []) {
    if (!cell.enabled || !isEntityType(cell.entityType) || !isRuleGenerationState(cell.state)) {
      continue
    }
    const missingByReason = new Map<
      DryRunSummary['ruleReviewWarnings'][number]['reason'],
      string[]
    >()
    const stateTaxTypes = cell.taxTypes.filter((taxType) =>
      isStateTaxTypeForState(taxType, cell.state),
    )

    for (const taxType of stateTaxTypes) {
      if (rulesCanGenerateTaxType(activeRules, cell.entityType, cell.state, taxType)) continue
      const reason = rulesCanGenerateTaxType(catalogRules, cell.entityType, cell.state, taxType)
        ? 'rules_pending_review'
        : 'no_matching_rule'
      missingByReason.set(reason, [...(missingByReason.get(reason) ?? []), taxType])
    }

    for (const [reason, taxTypes] of missingByReason) {
      warnings.push({
        state: cell.state,
        entityType: cell.entityType,
        affectedClientCount: cell.appliedClientCount,
        taxTypes,
        reason,
      })
    }
  }

  return warnings.toSorted(
    (a, b) =>
      a.state.localeCompare(b.state) ||
      a.entityType.localeCompare(b.entityType) ||
      a.reason.localeCompare(b.reason),
  )
}

function rulesCanGenerateTaxType(
  rules: readonly CoreObligationRule[],
  entityType: EntityType,
  state: RuleGenerationState,
  taxType: string,
): boolean {
  const reviewableRules = rules.map((rule) => ({ ...rule, status: 'verified' as const }))
  return (
    previewObligationsFromRules({
      client: {
        id: 'migration-dry-run',
        entityType,
        state,
        taxTypes: [taxType],
        taxYearType: 'calendar',
        fiscalYearEndMonth: null,
        fiscalYearEndDay: null,
      },
      rules: reviewableRules,
    }).length > 0
  )
}

function splitStateList(raw: string, normalizations: ReadonlyMap<string, string | null>): string[] {
  if (!raw) return []
  return raw
    .split(/[;,|/]/)
    .map((token) => {
      const trimmed = token.trim()
      return normalizations.get(trimmed) ?? trimmed.toUpperCase()
    })
    .filter((state) => /^[A-Z]{2}$/.test(state))
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function isEntityType(value: string): value is EntityType {
  return (
    value === 'llc' ||
    value === 's_corp' ||
    value === 'partnership' ||
    value === 'c_corp' ||
    value === 'sole_prop' ||
    value === 'trust' ||
    value === 'individual' ||
    value === 'other'
  )
}

function isRuleGenerationState(value: string): value is RuleGenerationState {
  return (STATE_RULE_JURISDICTIONS as readonly string[]).includes(value)
}

function toMigrationError(row: {
  id: string
  batchId: string
  rowIndex: number
  rawRowJson: unknown
  errorCode: string
  errorMessage: string
  createdAt: Date
}): MigrationError {
  return {
    id: row.id,
    batchId: row.batchId,
    rowIndex: row.rowIndex,
    rawRowJson: row.rawRowJson ?? null,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
  }
}

function defaultRawFileName(kind: TabularKind): string {
  return kind === 'paste' ? 'paste.txt' : `upload.${kind}`
}

function defaultRawContentType(kind: TabularKind): string {
  if (kind === 'xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  if (kind === 'paste') return 'text/plain'
  return kind === 'tsv' ? 'text/tab-separated-values' : 'text/csv'
}

// Heuristic stage classification — mirrors the deterministic checks in
// _deterministic.ts. Until each check tags its origin explicitly, the prefix
// match is the cheapest correct way to split mapping vs normalize errors so
// the wizard can show step-relevant rows without re-querying.
function classifyErrorStage(errorCode: string): 'mapping' | 'normalize' | 'matrix' | 'all' {
  const code = errorCode.toUpperCase()
  if (code === 'EIN_INVALID' || code === 'EMPTY_NAME') return 'mapping'
  if (code.startsWith('STATE_') || code.startsWith('ENTITY_')) return 'normalize'
  if (code.startsWith('MATRIX_')) return 'matrix'
  return 'all'
}

function toMigrationBatch(row: {
  id: string
  firmId: string
  userId: string
  source: MigrationSource
  rawInputR2Key: string | null
  rawInputFileName: string | null
  rawInputContentType: string | null
  rawInputSizeBytes: number | null
  mappingJson: unknown
  presetUsed: string | null
  rowCount: number
  successCount: number
  skippedCount: number
  aiGlobalConfidence: number | null
  status: MigrationBatch['status']
  appliedAt: Date | null
  revertExpiresAt: Date | null
  revertedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): MigrationBatch {
  return {
    id: row.id,
    firmId: row.firmId,
    userId: row.userId,
    source: row.source,
    rawInputR2Key: row.rawInputR2Key,
    rawInputFileName: row.rawInputFileName,
    rawInputContentType: row.rawInputContentType,
    rawInputSizeBytes: row.rawInputSizeBytes,
    mappingJson: row.mappingJson ?? null,
    presetUsed: row.presetUsed,
    rowCount: row.rowCount,
    successCount: row.successCount,
    skippedCount: row.skippedCount,
    aiGlobalConfidence: row.aiGlobalConfidence,
    status: row.status,
    appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
    revertExpiresAt: row.revertExpiresAt ? row.revertExpiresAt.toISOString() : null,
    revertedAt: row.revertedAt ? row.revertedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
