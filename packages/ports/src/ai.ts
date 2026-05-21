import type { AiOutputKind } from './shared'

export interface AiTraceInput {
  promptVersion: string
  model: string | null
  latencyMs: number
  guardResult: string
  inputHash: string
  refusalCode?: string | null
  tokens?: {
    input?: number
    output?: number
  }
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

export interface AiOutputRow {
  id: string
  firmId: string | null
  userId: string | null
  kind: AiOutputKind
  promptVersion: string
  model: string | null
  inputContextRef: string | null
  inputHash: string
  outputText: string | null
  citations: unknown
  guardResult: string
  refusalCode: string | null
  generatedAt: Date
}

export interface FindSuccessfulAiRunInput {
  kind: AiOutputKind
  inputContextRef: string
  inputHash: string
  promptVersion: string
}

export interface FindSuccessfulAiRunsByContextRefsInput {
  kind: AiOutputKind
  inputContextRefs: readonly string[]
  promptVersion: string
}

export interface AiRepo {
  readonly firmId: string
  findSuccessfulRun(input: FindSuccessfulAiRunInput): Promise<AiOutputRow | null>
  findSuccessfulRunsByContextRefs(
    input: FindSuccessfulAiRunsByContextRefsInput,
  ): Promise<AiOutputRow[]>
  recordRun(input: RecordAiRunInput): Promise<{ aiOutputId: string; llmLogId: string }>
}
