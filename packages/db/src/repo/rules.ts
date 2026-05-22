import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm'
import type {
  PracticeRuleInput,
  PracticeRuleReviewTaskDecisionInput,
  PracticeRuleReviewTaskInput,
  RuleRegistryChangeProposalInput,
  RuleRegistryChangeProposalRow,
  RuleRegistryReconcileRunRow,
  RuleSourceTemplateInput,
  RuleTemplateInput,
  TemporaryRuleRow,
} from '@duedatehq/ports/rules'
import type { Db } from '../client'
import { firmProfile } from '../schema/firm'
import { client } from '../schema/clients'
import { obligationInstance } from '../schema/obligations'
import { exceptionRule, obligationExceptionApplication } from '../schema/overlay'
import { pulse, pulseFirmAlert } from '../schema/pulse'
import {
  practiceRule,
  practiceRuleReviewTask,
  ruleRegistryChangeProposal,
  ruleRegistryReconcileRun,
  ruleReviewDecision,
  ruleSourceTemplate,
  ruleTemplate,
  type PracticeRule,
  type PracticeRuleReviewTask,
  type RuleRegistryChangeProposal,
  type RuleRegistryReconcileRun,
  type RuleReviewDecision,
  type RuleReviewDecisionStatus,
} from '../schema/rules'

export interface RuleReviewDecisionInput {
  ruleId: string
  baseVersion: number
  status: RuleReviewDecisionStatus
  ruleJson: unknown
  reviewNote: string | null
  reviewedBy: string
  reviewedAt?: Date
}

function normalizeNote(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function latestDate(...values: Array<Date | null | undefined>): Date | null {
  const dates = values.filter((value): value is Date => value instanceof Date)
  if (dates.length === 0) return null
  return dates.reduce((latest, value) => (value.getTime() > latest.getTime() ? value : latest))
}

function toRegistryRun(row: RuleRegistryReconcileRun): RuleRegistryReconcileRunRow {
  return row
}

function toRegistryProposal(row: RuleRegistryChangeProposal): RuleRegistryChangeProposalRow {
  return {
    ...row,
    affectedRuleIds: row.affectedRuleIdsJson,
    proposedRuleIds: row.proposedRuleIdsJson,
  }
}

export function makeRulesRepo(db: Db, firmId: string) {
  return {
    firmId,

    async upsertGlobalTemplates(input: {
      sources: RuleSourceTemplateInput[]
      rules: RuleTemplateInput[]
    }): Promise<void> {
      const now = new Date()
      await Promise.all([
        ...input.sources.map((source) =>
          db
            .insert(ruleSourceTemplate)
            .values({
              id: source.id,
              jurisdiction: source.jurisdiction,
              title: source.title,
              url: source.url,
              sourceType: source.sourceType,
              acquisitionMethod: source.acquisitionMethod,
              cadence: source.cadence,
              priority: source.priority,
              healthStatus: source.healthStatus,
              isEarlyWarning: source.isEarlyWarning,
              notificationChannelsJson: source.notificationChannels,
              lastReviewedOn: source.lastReviewedOn,
              status: source.status,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: ruleSourceTemplate.id,
              set: {
                jurisdiction: source.jurisdiction,
                title: source.title,
                url: source.url,
                sourceType: source.sourceType,
                acquisitionMethod: source.acquisitionMethod,
                cadence: source.cadence,
                priority: source.priority,
                healthStatus: source.healthStatus,
                isEarlyWarning: source.isEarlyWarning,
                notificationChannelsJson: source.notificationChannels,
                lastReviewedOn: source.lastReviewedOn,
                status: source.status,
                updatedAt: now,
              },
            }),
        ),
        ...input.rules.map((rule) =>
          db
            .insert(ruleTemplate)
            .values({
              id: rule.id,
              jurisdiction: rule.jurisdiction,
              title: rule.title,
              version: rule.version,
              status: rule.status,
              ruleJson: rule.ruleJson,
              sourceIdsJson: rule.sourceIds,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: ruleTemplate.id,
              set: {
                jurisdiction: rule.jurisdiction,
                title: rule.title,
                version: rule.version,
                status: rule.status,
                ruleJson: rule.ruleJson,
                sourceIdsJson: rule.sourceIds,
                updatedAt: now,
              },
            }),
        ),
      ])
    },

    async listPracticeRules(status?: PracticeRule['status']): Promise<PracticeRule[]> {
      const filters = [eq(practiceRule.firmId, firmId)]
      if (status) filters.push(eq(practiceRule.status, status))
      return db
        .select()
        .from(practiceRule)
        .where(and(...filters))
        .orderBy(desc(practiceRule.reviewedAt))
    },

    async listActivePracticeRules(): Promise<PracticeRule[]> {
      return this.listPracticeRules('active')
    },

    async getPracticeRule(ruleId: string): Promise<PracticeRule | null> {
      const rows = await db
        .select()
        .from(practiceRule)
        .where(and(eq(practiceRule.firmId, firmId), eq(practiceRule.ruleId, ruleId)))
        .limit(1)
      return rows[0] ?? null
    },

    async upsertPracticeRule(input: PracticeRuleInput): Promise<PracticeRule> {
      const now = new Date()
      const reviewedBy = input.reviewedBy ?? null
      const reviewedAt = input.reviewedAt ?? (reviewedBy ? now : null)
      const id = crypto.randomUUID()
      await db
        .insert(practiceRule)
        .values({
          id,
          firmId,
          ruleId: input.ruleId,
          templateId: input.templateId ?? null,
          templateVersion: input.templateVersion,
          status: input.status,
          ruleJson: input.ruleJson,
          reviewNote: normalizeNote(input.reviewNote),
          reviewedBy,
          reviewedAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [practiceRule.firmId, practiceRule.ruleId],
          set: {
            templateId: input.templateId ?? null,
            templateVersion: input.templateVersion,
            status: input.status,
            ruleJson: input.ruleJson,
            reviewNote: normalizeNote(input.reviewNote),
            reviewedBy,
            reviewedAt,
            updatedAt: now,
          },
        })

      const row = await this.getPracticeRule(input.ruleId)
      if (!row) throw new Error(`Practice rule was not persisted for ${input.ruleId}`)
      return row
    },

    async ensureReviewTasks(
      inputs: PracticeRuleReviewTaskInput[],
    ): Promise<PracticeRuleReviewTask[]> {
      const uniqueInputs = Array.from(
        new Map(
          inputs.map((input) => [`${input.ruleId}:${input.templateVersion}`, input]),
        ).values(),
      )
      if (uniqueInputs.length === 0) return []

      await Promise.all(
        uniqueInputs.map((input) =>
          db
            .insert(practiceRuleReviewTask)
            .values({
              id: crypto.randomUUID(),
              firmId,
              ruleId: input.ruleId,
              templateVersion: input.templateVersion,
              reason: input.reason,
            })
            .onConflictDoNothing({
              target: [
                practiceRuleReviewTask.firmId,
                practiceRuleReviewTask.ruleId,
                practiceRuleReviewTask.templateVersion,
              ],
            }),
        ),
      )

      const keys = new Set(uniqueInputs.map((input) => `${input.ruleId}:${input.templateVersion}`))
      return (await this.listReviewTasks()).filter((task) =>
        keys.has(`${task.ruleId}:${task.templateVersion}`),
      )
    },

    async listReviewTasks(
      input: {
        status?: PracticeRuleReviewTask['status']
      } = {},
    ): Promise<PracticeRuleReviewTask[]> {
      const filters = [eq(practiceRuleReviewTask.firmId, firmId)]
      if (input.status) filters.push(eq(practiceRuleReviewTask.status, input.status))
      return db
        .select()
        .from(practiceRuleReviewTask)
        .where(and(...filters))
        .orderBy(desc(practiceRuleReviewTask.createdAt))
    },

    async getReviewTask(
      ruleId: string,
      templateVersion: number,
    ): Promise<PracticeRuleReviewTask | null> {
      const rows = await db
        .select()
        .from(practiceRuleReviewTask)
        .where(
          and(
            eq(practiceRuleReviewTask.firmId, firmId),
            eq(practiceRuleReviewTask.ruleId, ruleId),
            eq(practiceRuleReviewTask.templateVersion, templateVersion),
          ),
        )
        .limit(1)
      return rows[0] ?? null
    },

    async decideReviewTask(
      input: PracticeRuleReviewTaskDecisionInput,
    ): Promise<PracticeRuleReviewTask> {
      const reviewedAt = input.reviewedAt ?? new Date()
      await db
        .insert(practiceRuleReviewTask)
        .values({
          id: crypto.randomUUID(),
          firmId,
          ruleId: input.ruleId,
          templateVersion: input.templateVersion,
          status: input.status,
          reviewNote: normalizeNote(input.reviewNote),
          reviewedBy: input.reviewedBy,
          reviewedAt,
          updatedAt: reviewedAt,
        })
        .onConflictDoUpdate({
          target: [
            practiceRuleReviewTask.firmId,
            practiceRuleReviewTask.ruleId,
            practiceRuleReviewTask.templateVersion,
          ],
          set: {
            status: input.status,
            reviewNote: normalizeNote(input.reviewNote),
            reviewedBy: input.reviewedBy,
            reviewedAt,
            updatedAt: reviewedAt,
          },
        })

      const row = await this.getReviewTask(input.ruleId, input.templateVersion)
      if (!row) throw new Error(`Practice rule task was not persisted for ${input.ruleId}`)
      return row
    },

    async listDecisions(status?: RuleReviewDecisionStatus): Promise<RuleReviewDecision[]> {
      const filters = [eq(ruleReviewDecision.firmId, firmId)]
      if (status) filters.push(eq(ruleReviewDecision.status, status))
      return db
        .select()
        .from(ruleReviewDecision)
        .where(and(...filters))
        .orderBy(desc(ruleReviewDecision.reviewedAt))
    },

    async listVerified(): Promise<RuleReviewDecision[]> {
      return this.listDecisions('verified')
    },

    async listTemporaryRules(): Promise<TemporaryRuleRow[]> {
      const rows = await db
        .select({
          id: exceptionRule.id,
          alertId: pulseFirmAlert.id,
          sourcePulseId: exceptionRule.sourcePulseId,
          pulseSummary: pulse.aiSummary,
          sourceUrl: exceptionRule.sourceUrl,
          sourceExcerpt: exceptionRule.verbatimQuote,
          jurisdiction: exceptionRule.jurisdiction,
          counties: exceptionRule.counties,
          affectedForms: exceptionRule.affectedForms,
          affectedEntityTypes: exceptionRule.affectedEntityTypes,
          overrideType: exceptionRule.overrideType,
          overrideDueDate: exceptionRule.overrideDueDate,
          effectiveFrom: exceptionRule.effectiveFrom,
          effectiveUntil: exceptionRule.effectiveUntil,
          exceptionStatus: exceptionRule.status,
          exceptionUpdatedAt: exceptionRule.updatedAt,
          applicationId: obligationExceptionApplication.id,
          appliedAt: obligationExceptionApplication.appliedAt,
          revertedAt: obligationExceptionApplication.revertedAt,
          clientName: client.name,
          taxType: obligationInstance.taxType,
        })
        .from(exceptionRule)
        .innerJoin(
          obligationExceptionApplication,
          eq(obligationExceptionApplication.exceptionRuleId, exceptionRule.id),
        )
        .innerJoin(
          obligationInstance,
          eq(obligationExceptionApplication.obligationInstanceId, obligationInstance.id),
        )
        .innerJoin(client, eq(obligationInstance.clientId, client.id))
        .leftJoin(pulse, eq(exceptionRule.sourcePulseId, pulse.id))
        .leftJoin(
          pulseFirmAlert,
          and(
            eq(pulseFirmAlert.firmId, firmId),
            eq(pulseFirmAlert.pulseId, exceptionRule.sourcePulseId),
          ),
        )
        .where(
          and(
            eq(exceptionRule.firmId, firmId),
            eq(obligationExceptionApplication.firmId, firmId),
            eq(obligationInstance.firmId, firmId),
            eq(client.firmId, firmId),
            inArray(exceptionRule.status, ['verified', 'applied', 'retracted']),
          ),
        )
        .orderBy(desc(exceptionRule.updatedAt), desc(obligationExceptionApplication.appliedAt))

      const byRule = new Map<
        string,
        TemporaryRuleRow & { clientNames: string[]; taxTypes: string[] }
      >()

      for (const row of rows) {
        const existing = byRule.get(row.id)
        const status =
          row.exceptionStatus === 'retracted' ? 'retracted' : row.revertedAt ? 'reverted' : 'active'
        if (!existing) {
          byRule.set(row.id, {
            id: row.id,
            alertId: row.alertId,
            sourcePulseId: row.sourcePulseId,
            title: row.pulseSummary ?? `Temporary ${row.jurisdiction} exception`,
            sourceUrl: row.sourceUrl,
            sourceExcerpt: row.sourceExcerpt,
            jurisdiction: row.jurisdiction,
            counties: row.counties,
            affectedForms: row.affectedForms,
            affectedEntityTypes: row.affectedEntityTypes,
            overrideType: row.overrideType,
            overrideDueDate: row.overrideDueDate,
            effectiveFrom: row.effectiveFrom,
            effectiveUntil: row.effectiveUntil,
            status,
            appliedObligationCount: 1,
            activeObligationCount: row.revertedAt ? 0 : 1,
            revertedObligationCount: row.revertedAt ? 1 : 0,
            firstAppliedAt: row.appliedAt,
            lastActivityAt: latestDate(row.revertedAt, row.appliedAt, row.exceptionUpdatedAt)!,
            clientNames: [row.clientName],
            taxTypes: [row.taxType],
          })
          continue
        }

        existing.appliedObligationCount += 1
        if (row.revertedAt) existing.revertedObligationCount += 1
        else existing.activeObligationCount += 1
        existing.status =
          existing.status === 'retracted'
            ? 'retracted'
            : existing.activeObligationCount > 0
              ? 'active'
              : 'reverted'
        existing.firstAppliedAt =
          existing.firstAppliedAt && row.appliedAt.getTime() < existing.firstAppliedAt.getTime()
            ? row.appliedAt
            : existing.firstAppliedAt
        existing.lastActivityAt =
          latestDate(
            existing.lastActivityAt,
            row.revertedAt,
            row.appliedAt,
            row.exceptionUpdatedAt,
          ) ?? existing.lastActivityAt
        if (!existing.clientNames.includes(row.clientName))
          existing.clientNames.push(row.clientName)
        if (!existing.taxTypes.includes(row.taxType)) existing.taxTypes.push(row.taxType)
      }

      return Array.from(byRule.values())
        .map(({ clientNames: _clientNames, taxTypes: _taxTypes, ...row }) => row)
        .toSorted((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
    },

    async getDecision(ruleId: string): Promise<RuleReviewDecision | null> {
      const rows = await db
        .select()
        .from(ruleReviewDecision)
        .where(and(eq(ruleReviewDecision.firmId, firmId), eq(ruleReviewDecision.ruleId, ruleId)))
        .limit(1)
      return rows[0] ?? null
    },

    async upsertDecision(input: RuleReviewDecisionInput): Promise<RuleReviewDecision> {
      const reviewedAt = input.reviewedAt ?? new Date()
      const id = crypto.randomUUID()
      await db
        .insert(ruleReviewDecision)
        .values({
          id,
          firmId,
          ruleId: input.ruleId,
          baseVersion: input.baseVersion,
          status: input.status,
          ruleJson: input.ruleJson,
          reviewNote: normalizeNote(input.reviewNote),
          reviewedBy: input.reviewedBy,
          reviewedAt,
          updatedAt: reviewedAt,
        })
        .onConflictDoUpdate({
          target: [ruleReviewDecision.firmId, ruleReviewDecision.ruleId],
          set: {
            baseVersion: input.baseVersion,
            status: input.status,
            ruleJson: input.ruleJson,
            reviewNote: normalizeNote(input.reviewNote),
            reviewedBy: input.reviewedBy,
            reviewedAt,
            updatedAt: reviewedAt,
          },
        })

      const row = await this.getDecision(input.ruleId)
      if (!row) throw new Error(`Rule review decision was not persisted for ${input.ruleId}`)
      return row
    },
  }
}

export type RulesRepo = ReturnType<typeof makeRulesRepo>

export function makeRulesOpsRepo(db: Db) {
  async function getReconcileRunByWeek(weekKey: string): Promise<RuleRegistryReconcileRun | null> {
    const rows = await db
      .select()
      .from(ruleRegistryReconcileRun)
      .where(eq(ruleRegistryReconcileRun.weekKey, weekKey))
      .limit(1)
    return rows[0] ?? null
  }

  async function getReconcileRun(runId: string): Promise<RuleRegistryReconcileRun> {
    const rows = await db
      .select()
      .from(ruleRegistryReconcileRun)
      .where(eq(ruleRegistryReconcileRun.id, runId))
      .limit(1)
    const row = rows[0]
    if (!row) throw new Error(`Rule registry reconcile run not found: ${runId}`)
    return row
  }

  async function activeFirmIds(): Promise<string[]> {
    const rows = await db
      .select({ id: firmProfile.id })
      .from(firmProfile)
      .where(eq(firmProfile.status, 'active'))
    return rows.map((row) => row.id)
  }

  async function firmIdsWithReviewedRule(ruleId: string): Promise<string[]> {
    const [practiceRows, decisionRows] = await Promise.all([
      db
        .select({ firmId: practiceRule.firmId })
        .from(practiceRule)
        .where(eq(practiceRule.ruleId, ruleId)),
      db
        .select({ firmId: ruleReviewDecision.firmId })
        .from(ruleReviewDecision)
        .where(eq(ruleReviewDecision.ruleId, ruleId)),
    ])
    return Array.from(new Set([...practiceRows, ...decisionRows].map((row) => row.firmId)))
  }

  async function ensureReviewTasksForFirms(input: {
    firmIds: string[]
    ruleId: string
    templateVersion: number
    reason: PracticeRuleReviewTaskInput['reason']
  }): Promise<number> {
    const firmIds = Array.from(new Set(input.firmIds))
    if (firmIds.length === 0) return 0
    await Promise.all(
      firmIds.map((firmId) =>
        db
          .insert(practiceRuleReviewTask)
          .values({
            id: crypto.randomUUID(),
            firmId,
            ruleId: input.ruleId,
            templateVersion: input.templateVersion,
            reason: input.reason,
          })
          .onConflictDoNothing({
            target: [
              practiceRuleReviewTask.firmId,
              practiceRuleReviewTask.ruleId,
              practiceRuleReviewTask.templateVersion,
            ],
          }),
      ),
    )
    return firmIds.length
  }

  return {
    async listGlobalRuleTemplates(): Promise<
      Array<{ id: string; version: number; status: string; ruleJson: unknown; sourceIds: string[] }>
    > {
      const rows = await db
        .select({
          id: ruleTemplate.id,
          version: ruleTemplate.version,
          status: ruleTemplate.status,
          ruleJson: ruleTemplate.ruleJson,
          sourceIds: ruleTemplate.sourceIdsJson,
        })
        .from(ruleTemplate)
      return rows.map((row) => ({
        id: row.id,
        version: row.version,
        status: row.status,
        ruleJson: row.ruleJson,
        sourceIds: row.sourceIds ?? [],
      }))
    },

    async startWeeklyReconcileRun(input: {
      weekKey: string
      sourceCount: number
      startedAt?: Date
      triggeredBy?: string
    }): Promise<{ run: RuleRegistryReconcileRunRow; inserted: boolean }> {
      const id = crypto.randomUUID()
      const startedAt = input.startedAt ?? new Date()
      await db
        .insert(ruleRegistryReconcileRun)
        .values({
          id,
          weekKey: input.weekKey,
          status: 'running',
          triggeredBy: input.triggeredBy ?? 'weekly_cron',
          startedAt,
          sourceCount: input.sourceCount,
          updatedAt: startedAt,
        })
        .onConflictDoNothing({ target: ruleRegistryReconcileRun.weekKey })

      const row = await getReconcileRunByWeek(input.weekKey)
      if (!row) throw new Error(`Rule registry reconcile run was not persisted: ${input.weekKey}`)
      return { run: toRegistryRun(row), inserted: row.id === id }
    },

    async recordReconcileSourceOutcome(input: {
      runId: string
      changed?: boolean
      proposalCreated?: boolean
      failed?: boolean
      errorText?: string | null
    }): Promise<RuleRegistryReconcileRunRow> {
      const now = new Date()
      await db
        .update(ruleRegistryReconcileRun)
        .set({
          checkedCount: sql`${ruleRegistryReconcileRun.checkedCount} + 1`,
          ...(!input.failed && input.changed
            ? { changedCount: sql`${ruleRegistryReconcileRun.changedCount} + 1` }
            : !input.failed
              ? { unchangedCount: sql`${ruleRegistryReconcileRun.unchangedCount} + 1` }
              : {}),
          ...(input.proposalCreated
            ? { proposalCount: sql`${ruleRegistryReconcileRun.proposalCount} + 1` }
            : {}),
          ...(input.failed
            ? {
                failureCount: sql`${ruleRegistryReconcileRun.failureCount} + 1`,
                errorText: input.errorText?.slice(0, 1000) ?? null,
              }
            : {}),
          updatedAt: now,
        })
        .where(eq(ruleRegistryReconcileRun.id, input.runId))

      const row = await getReconcileRun(input.runId)
      if (row.status === 'running' && row.checkedCount >= row.sourceCount) {
        await db
          .update(ruleRegistryReconcileRun)
          .set({
            status: row.failureCount > 0 ? 'failed' : 'completed',
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(ruleRegistryReconcileRun.id, input.runId))
        return toRegistryRun(await getReconcileRun(input.runId))
      }
      return toRegistryRun(row)
    },

    async recordChangeProposal(
      input: RuleRegistryChangeProposalInput,
    ): Promise<RuleRegistryChangeProposalRow> {
      const id = crypto.randomUUID()
      await db.insert(ruleRegistryChangeProposal).values({
        id,
        runId: input.runId,
        sourceId: input.sourceId,
        sourceSnapshotId: input.sourceSnapshotId ?? null,
        contentHash: input.contentHash ?? null,
        rawR2Key: input.rawR2Key ?? null,
        proposalType: input.proposalType,
        status: input.status ?? 'open',
        affectedRuleIdsJson: input.affectedRuleIds ?? [],
        proposedRuleIdsJson: input.proposedRuleIds ?? [],
        normalizedRuleJson: input.normalizedRuleJson ?? null,
        diffSummary: normalizeNote(input.diffSummary),
        aiOutputId: input.aiOutputId ?? null,
        failureReason: normalizeNote(input.failureReason),
      })
      const rows = await db
        .select()
        .from(ruleRegistryChangeProposal)
        .where(eq(ruleRegistryChangeProposal.id, id))
        .limit(1)
      const row = rows[0]
      if (!row) throw new Error(`Rule registry proposal was not persisted: ${id}`)
      return toRegistryProposal(row)
    },

    async listOpenChangeProposals(limit = 50): Promise<RuleRegistryChangeProposalRow[]> {
      const rows = await db
        .select()
        .from(ruleRegistryChangeProposal)
        .where(eq(ruleRegistryChangeProposal.status, 'open'))
        .orderBy(desc(ruleRegistryChangeProposal.createdAt))
        .limit(Math.min(Math.max(limit, 1), 200))
      return rows.map(toRegistryProposal)
    },

    async fanoutReviewTasks(input: {
      newRules: Array<{ ruleId: string; templateVersion: number }>
      changedRules: Array<{ ruleId: string; templateVersion: number }>
    }): Promise<{ newTaskTargets: number; changedTaskTargets: number; supersededTasks: number }> {
      let newTaskTargets = 0
      let changedTaskTargets = 0
      let supersededTasks = 0
      const allActiveFirmIds = await activeFirmIds()

      const newCounts = await Promise.all(
        input.newRules.map(async (rule) => {
          await db
            .update(practiceRuleReviewTask)
            .set({ status: 'superseded', updatedAt: new Date() })
            .where(
              and(
                eq(practiceRuleReviewTask.ruleId, rule.ruleId),
                eq(practiceRuleReviewTask.status, 'open'),
                lt(practiceRuleReviewTask.templateVersion, rule.templateVersion),
              ),
            )
          return ensureReviewTasksForFirms({
            firmIds: allActiveFirmIds,
            ruleId: rule.ruleId,
            templateVersion: rule.templateVersion,
            reason: 'new_template',
          })
        }),
      )
      newTaskTargets = newCounts.reduce((sum, count) => sum + count, 0)

      const changedCounts = await Promise.all(
        input.changedRules.map(async (rule) => {
          await db
            .update(practiceRuleReviewTask)
            .set({ status: 'superseded', updatedAt: new Date() })
            .where(
              and(
                eq(practiceRuleReviewTask.ruleId, rule.ruleId),
                eq(practiceRuleReviewTask.status, 'open'),
                lt(practiceRuleReviewTask.templateVersion, rule.templateVersion),
              ),
            )
          const firmIds = await firmIdsWithReviewedRule(rule.ruleId)
          return ensureReviewTasksForFirms({
            firmIds,
            ruleId: rule.ruleId,
            templateVersion: rule.templateVersion,
            reason: 'source_changed',
          })
        }),
      )
      changedTaskTargets = changedCounts.reduce((sum, count) => sum + count, 0)
      supersededTasks = input.changedRules.length

      return { newTaskTargets, changedTaskTargets, supersededTasks }
    },
  }
}

export type RulesOpsRepo = ReturnType<typeof makeRulesOpsRepo>
