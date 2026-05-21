import { and, desc, eq, isNotNull } from 'drizzle-orm'
import type { AiOutputRow, FindSuccessfulAiRunInput } from '@duedatehq/ports/ai'
import type { Db } from '../client'
import { aiOutput, llmLog } from '../schema/ai'

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
  return {
    firmId,

    async findSuccessfulRun(input: FindSuccessfulAiRunInput): Promise<AiOutputRow | null> {
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
            eq(aiOutput.firmId, firmId),
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
    },

    async recordRun(input: RecordAiRunInput): Promise<{ aiOutputId: string; llmLogId: string }> {
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
          firmId,
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
          firmId,
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
    },
  }
}

export type AiRepo = ReturnType<typeof makeAiRepo>
