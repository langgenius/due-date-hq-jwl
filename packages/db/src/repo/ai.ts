import { and, count, desc, eq, gte, inArray, isNotNull, isNull, ne } from 'drizzle-orm'
import type {
  AiOutputRow,
  FindSuccessfulAiRunInput,
  FindSuccessfulAiRunsByContextRefsInput,
} from '@duedatehq/ports/ai'
import type { Db } from '../client'
import { aiOutput, llmLog } from '../schema/ai'

const SUCCESSFUL_RUN_CONTEXT_REF_BATCH_SIZE = 90

export type AiOutputKind =
  | 'brief'
  | 'tip'
  | 'summary'
  | 'ask_answer'
  | 'pulse_extract'
  | 'rule_concrete_draft'
  | 'migration_map'
  | 'migration_normalize'
  | 'readiness_checklist'

export interface AiTraceInput {
  promptVersion: string
  model: string | null
  latencyMs: number
  guardResult: string
  inputHash: string
  refusalCode?: string | null
  tokens?: { input?: number; output?: number }
  costUsd?: number
}

export interface RecordAiRunInput {
  userId: string | null
  kind: AiOutputKind
  inputContextRef: string
  trace: AiTraceInput
  outputText?: string | null
  citations?: unknown
  errorMsg?: string | null
}

export function makeAiRepo(db: Db, firmId: string) {
  function firmScopeFilter(scope: 'firm' | 'global') {
    return scope === 'global' ? isNull(aiOutput.firmId) : eq(aiOutput.firmId, firmId)
  }

  async function findSuccessfulRunForScope(
    scope: 'firm' | 'global',
    input: FindSuccessfulAiRunInput,
  ): Promise<AiOutputRow | null> {
    const [row] = await db
      .select({
        id: aiOutput.id,
        firmId: aiOutput.firmId,
        userId: aiOutput.userId,
        kind: aiOutput.kind,
        promptVersion: aiOutput.promptVersion,
        model: aiOutput.model,
        inputContextRef: aiOutput.inputContextRef,
        inputHash: aiOutput.inputHash,
        outputText: aiOutput.outputText,
        citations: aiOutput.citationsJson,
        guardResult: aiOutput.guardResult,
        refusalCode: aiOutput.refusalCode,
        generatedAt: aiOutput.generatedAt,
      })
      .from(aiOutput)
      .where(
        and(
          firmScopeFilter(scope),
          eq(aiOutput.kind, input.kind),
          eq(aiOutput.inputContextRef, input.inputContextRef),
          eq(aiOutput.inputHash, input.inputHash),
          eq(aiOutput.promptVersion, input.promptVersion),
          eq(aiOutput.guardResult, 'ok'),
          isNotNull(aiOutput.outputText),
        ),
      )
      .orderBy(desc(aiOutput.generatedAt))
      .limit(1)

    return row ?? null
  }

  async function findSuccessfulRunsByContextRefsForScope(
    scope: 'firm' | 'global',
    input: FindSuccessfulAiRunsByContextRefsInput,
  ): Promise<AiOutputRow[]> {
    const inputContextRefs = Array.from(new Set(input.inputContextRefs))
    if (inputContextRefs.length === 0) return []

    const batches: string[][] = []
    for (
      let start = 0;
      start < inputContextRefs.length;
      start += SUCCESSFUL_RUN_CONTEXT_REF_BATCH_SIZE
    ) {
      batches.push(inputContextRefs.slice(start, start + SUCCESSFUL_RUN_CONTEXT_REF_BATCH_SIZE))
    }

    const rows = (
      await Promise.all(
        batches.map((batch) =>
          db
            .select({
              id: aiOutput.id,
              firmId: aiOutput.firmId,
              userId: aiOutput.userId,
              kind: aiOutput.kind,
              promptVersion: aiOutput.promptVersion,
              model: aiOutput.model,
              inputContextRef: aiOutput.inputContextRef,
              inputHash: aiOutput.inputHash,
              outputText: aiOutput.outputText,
              citations: aiOutput.citationsJson,
              guardResult: aiOutput.guardResult,
              refusalCode: aiOutput.refusalCode,
              generatedAt: aiOutput.generatedAt,
            })
            .from(aiOutput)
            .where(
              and(
                firmScopeFilter(scope),
                eq(aiOutput.kind, input.kind),
                inArray(aiOutput.inputContextRef, batch),
                eq(aiOutput.promptVersion, input.promptVersion),
                eq(aiOutput.guardResult, 'ok'),
                isNotNull(aiOutput.outputText),
              ),
            )
            .orderBy(desc(aiOutput.generatedAt)),
        ),
      )
    ).flat()

    rows.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())

    const latestByContext = new Map<string, AiOutputRow>()
    for (const row of rows) {
      if (!row.inputContextRef || latestByContext.has(row.inputContextRef)) continue
      latestByContext.set(row.inputContextRef, row)
    }
    return Array.from(latestByContext.values())
  }

  async function recordRunForFirm(
    targetFirmId: string | null,
    input: RecordAiRunInput,
  ): Promise<{ aiOutputId: string; llmLogId: string }> {
    const aiOutputId = crypto.randomUUID()
    const llmLogId = crypto.randomUUID()
    const success = input.trace.guardResult === 'ok'
    const tokensIn = input.trace.tokens?.input ?? null
    const tokensOut = input.trace.tokens?.output ?? null
    const costUsd = input.trace.costUsd ?? null
    const refusalCode = input.trace.refusalCode ?? null

    await Promise.all([
      db.insert(aiOutput).values({
        id: aiOutputId,
        firmId: targetFirmId,
        userId: input.userId,
        kind: input.kind,
        promptVersion: input.trace.promptVersion,
        model: input.trace.model,
        inputContextRef: input.inputContextRef,
        inputHash: input.trace.inputHash,
        outputText: input.outputText ?? null,
        citationsJson: input.citations ?? null,
        guardResult: input.trace.guardResult,
        refusalCode,
        tokensIn,
        tokensOut,
        latencyMs: input.trace.latencyMs,
        costUsd,
      }),
      db.insert(llmLog).values({
        id: llmLogId,
        firmId: targetFirmId,
        userId: input.userId,
        promptVersion: input.trace.promptVersion,
        model: input.trace.model,
        inputHash: input.trace.inputHash,
        inputTokens: tokensIn,
        outputTokens: tokensOut,
        latencyMs: input.trace.latencyMs,
        costUsd,
        guardResult: input.trace.guardResult,
        refusalCode,
        success,
        errorMsg: input.errorMsg ?? null,
      }),
    ])

    return { aiOutputId, llmLogId }
  }

  return {
    firmId,

    async findSuccessfulRun(input: FindSuccessfulAiRunInput): Promise<AiOutputRow | null> {
      return findSuccessfulRunForScope('firm', input)
    },

    async findSuccessfulGlobalRun(input: FindSuccessfulAiRunInput): Promise<AiOutputRow | null> {
      return findSuccessfulRunForScope('global', input)
    },

    async findSuccessfulRunsByContextRefs(
      input: FindSuccessfulAiRunsByContextRefsInput,
    ): Promise<AiOutputRow[]> {
      return findSuccessfulRunsByContextRefsForScope('firm', input)
    },

    async findSuccessfulGlobalRunsByContextRefs(
      input: FindSuccessfulAiRunsByContextRefsInput,
    ): Promise<AiOutputRow[]> {
      return findSuccessfulRunsByContextRefsForScope('global', input)
    },

    /**
     * Context refs (global scope) with at least `minFailures` non-'ok' runs since
     * `since`. Lets an enqueuer abandon work that keeps failing (e.g. the AI
     * provider is down) instead of re-enqueuing it every tick — the loop that
     * drained the AI budget. Budget-blocked attempts record guardResult
     * 'budget_exceeded', so they count here too. The window means abandonment is
     * temporary: failures age out and the work retries once the provider recovers.
     */
    async findGlobalContextRefsWithRecentFailures(
      input: FindSuccessfulAiRunsByContextRefsInput & { minFailures: number; since: Date },
    ): Promise<Set<string>> {
      const inputContextRefs = Array.from(new Set(input.inputContextRefs))
      if (inputContextRefs.length === 0 || input.minFailures <= 0) return new Set()
      const batches: string[][] = []
      for (
        let start = 0;
        start < inputContextRefs.length;
        start += SUCCESSFUL_RUN_CONTEXT_REF_BATCH_SIZE
      ) {
        batches.push(inputContextRefs.slice(start, start + SUCCESSFUL_RUN_CONTEXT_REF_BATCH_SIZE))
      }
      const counts = (
        await Promise.all(
          batches.map((batch) =>
            db
              .select({ inputContextRef: aiOutput.inputContextRef, failures: count() })
              .from(aiOutput)
              .where(
                and(
                  isNull(aiOutput.firmId),
                  eq(aiOutput.kind, input.kind),
                  inArray(aiOutput.inputContextRef, batch),
                  eq(aiOutput.promptVersion, input.promptVersion),
                  ne(aiOutput.guardResult, 'ok'),
                  gte(aiOutput.generatedAt, input.since),
                ),
              )
              .groupBy(aiOutput.inputContextRef),
          ),
        )
      ).flat()
      const abandoned = new Set<string>()
      for (const row of counts) {
        if (row.inputContextRef && row.failures >= input.minFailures) {
          abandoned.add(row.inputContextRef)
        }
      }
      return abandoned
    },

    async recordRun(input: RecordAiRunInput): Promise<{ aiOutputId: string; llmLogId: string }> {
      return recordRunForFirm(firmId, input)
    },

    async recordGlobalRun(
      input: RecordAiRunInput,
    ): Promise<{ aiOutputId: string; llmLogId: string }> {
      return recordRunForFirm(null, { ...input, userId: null })
    },
  }
}

export type AiRepo = ReturnType<typeof makeAiRepo>
