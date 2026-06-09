import type * as z from 'zod'
import { consumeAiBudget, type AiBudgetKv } from './budget'
import { callGateway, type GatewayRequest } from './gateway'
import {
  GuardRejection,
  verifyInsightOutput,
  verifyMapperEinHitRate,
  verifyPulseSourceExcerpt,
  verifyRuleConcreteDraft,
} from './guard'
import { redactMigrationInput } from './pii'
import { PulseExtractOutputSchema, type PulseExtractInput, type PulseExtractOutput } from './pulse'
import {
  MorningSweepOutputSchema,
  type MorningSweepInput,
  type MorningSweepOutput,
} from './morning-sweep'
import { loadPrompt, type PromptName } from './prompter'
import {
  modelForPromptTier,
  parseModelTier,
  reasoningEffortForTier,
  taskKindForPrompt,
  type AiModelRoutingEnv,
  type AiRoutingInput,
} from './router'
import { createTrace, type AiTrace } from './trace'

export interface AiEnv extends AiModelRoutingEnv {
  ENV?: 'development' | 'staging' | 'production'
  AI_GATEWAY_ACCOUNT_ID?: string
  AI_GATEWAY_SLUG?: string
  AI_GATEWAY_API_KEY?: string
  AI_GATEWAY_PROVIDER?: string
  AI_GATEWAY_PROVIDER_API_KEY?: string
  CACHE?: AiBudgetKv
  /** Global daily ceiling for system (no-firmId) AI calls; see budget.ts. */
  AI_SYSTEM_DAILY_LIMIT?: string
}

export interface AiRefusal {
  code:
    | 'AI_UNAVAILABLE'
    | 'AI_BUDGET_EXCEEDED'
    | 'GUARD_REJECTED'
    | 'SCHEMA_INVALID'
    | 'AI_GATEWAY_ERROR'
  message: string
}

export type AiRunResult<TOut> =
  | {
      result: TOut
      refusal: null
      trace: AiTrace
      model: string
      confidence: number | null
      cost: number | null
    }
  | {
      result: null
      refusal: AiRefusal
      trace: AiTrace
      model: string | null
      confidence: null
      cost: null
    }

function refusal<TOut>(
  code: AiRefusal['code'],
  message: string,
  trace: AiTrace,
  model: string | null = null,
): AiRunResult<TOut> {
  return {
    result: null,
    refusal: { code, message },
    trace,
    model,
    confidence: null,
    cost: null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function averageConfidence(value: unknown): number | null {
  if (!isRecord(value)) return null
  if (typeof value.confidence === 'number') return value.confidence
  const arrays = [value.mappings, Object.values(value)]
  const confidences = arrays
    .flatMap((items) => (Array.isArray(items) ? items : []))
    .map((item) => (isRecord(item) ? item.confidence : undefined))
    .filter((item): item is number => typeof item === 'number')

  if (confidences.length === 0) return null
  return confidences.reduce((sum, item) => sum + item, 0) / confidences.length
}

async function hashInput(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function gatewayProvider(env: AiEnv): GatewayRequest<unknown>['provider'] {
  return env.AI_GATEWAY_PROVIDER === 'openrouter' ? 'openrouter' : 'unified'
}

function shouldEnforceAiBudget(env: AiEnv): boolean {
  return env.ENV === undefined || env.ENV === 'production'
}

export function createAI(env: AiEnv = {}) {
  async function runPrompt<TOut>(
    name: PromptName,
    input: unknown,
    schema: z.ZodType<TOut>,
    routing: AiRoutingInput = {},
  ): Promise<AiRunResult<TOut>> {
    const prompt = loadPrompt(name)
    const startedAt = Date.now()
    const redacted = redactMigrationInput(input)
    const inputHash = await hashInput(redacted.input)
    const taskKind = routing.taskKind ?? taskKindForPrompt(name)
    const modelTier = parseModelTier(prompt.modelTier)
    const selectedModel = modelTier ? modelForPromptTier(env, modelTier, routing) : undefined
    const parsedSystemLimit = Number.parseInt(env.AI_SYSTEM_DAILY_LIMIT ?? '', 10)
    const systemAiDailyLimit = Number.isFinite(parsedSystemLimit) ? parsedSystemLimit : undefined

    if (
      !env.AI_GATEWAY_ACCOUNT_ID ||
      !env.AI_GATEWAY_SLUG ||
      !selectedModel ||
      (gatewayProvider(env) === 'openrouter' && !env.AI_GATEWAY_PROVIDER_API_KEY) ||
      (gatewayProvider(env) === 'unified' && !env.AI_GATEWAY_API_KEY)
    ) {
      return refusal(
        'AI_UNAVAILABLE',
        'Cloudflare AI Gateway provider is not configured for this environment.',
        createTrace({
          promptVersion: name,
          model: prompt.modelTier,
          latencyMs: 0,
          guardResult: 'ai_unavailable',
          inputHash,
          refusalCode: 'AI_UNAVAILABLE',
        }),
      )
    }

    try {
      // System (no-firmId) calls enforce a global daily ceiling in EVERY env as a
      // cost circuit-breaker; the per-firm fair-use limit only runs in production.
      const isSystemCall = !routing.firmId
      if (isSystemCall || shouldEnforceAiBudget(env)) {
        const budget = await consumeAiBudget({
          taskKind,
          ...(env.CACHE ? { kv: env.CACHE } : {}),
          ...(routing.firmId ? { firmId: routing.firmId } : {}),
          ...(routing.plan ? { plan: routing.plan } : {}),
          ...(routing.firmCreatedAt ? { firmCreatedAt: routing.firmCreatedAt } : {}),
          ...(routing.migrationOnboardingCompleted !== undefined
            ? { migrationOnboardingCompleted: routing.migrationOnboardingCompleted }
            : {}),
          ...(systemAiDailyLimit !== undefined ? { systemDailyLimit: systemAiDailyLimit } : {}),
        })
        if (!budget.allowed) {
          return refusal(
            'AI_BUDGET_EXCEEDED',
            isSystemCall
              ? 'The global system AI daily budget has been reached.'
              : 'The practice reached its AI fair-use limit for today.',
            createTrace({
              promptVersion: name,
              model: selectedModel,
              latencyMs: Date.now() - startedAt,
              guardResult: 'budget_exceeded',
              inputHash,
              refusalCode: 'AI_BUDGET_EXCEEDED',
            }),
            selectedModel,
          )
        }
      }

      const provider = gatewayProvider(env)
      const reasoningEffort =
        provider === 'openrouter' && modelTier ? reasoningEffortForTier(env, modelTier) : undefined
      const gatewayRequest = {
        accountId: env.AI_GATEWAY_ACCOUNT_ID,
        slug: env.AI_GATEWAY_SLUG,
        model: selectedModel,
        prompt: prompt.text,
        input: redacted.input,
        schema,
        provider,
        ...(name === 'rule-concrete-draft@v1' || name === 'rule-concrete-draft@v2'
          ? { timeoutMs: 25_000 }
          : {}),
        ...(reasoningEffort
          ? { providerOptions: { openrouter: { reasoning: { effort: reasoningEffort } } } }
          : {}),
        ...(env.AI_GATEWAY_API_KEY ? { gatewayApiKey: env.AI_GATEWAY_API_KEY } : {}),
        ...(provider === 'openrouter' && env.AI_GATEWAY_PROVIDER_API_KEY
          ? { providerApiKey: env.AI_GATEWAY_PROVIDER_API_KEY }
          : {}),
      } satisfies GatewayRequest<TOut>
      const gateway = await callGateway(gatewayRequest)
      const parsed = schema.safeParse(gateway.output)

      if (!parsed.success) {
        return refusal(
          'SCHEMA_INVALID',
          'AI output did not match the expected schema.',
          createTrace({
            promptVersion: name,
            model: gateway.model,
            latencyMs: Date.now() - startedAt,
            guardResult: 'schema_fail',
            inputHash,
            refusalCode: 'SCHEMA_INVALID',
            ...(gateway.tokens ? { tokens: gateway.tokens } : {}),
            ...(gateway.costUsd !== undefined ? { costUsd: gateway.costUsd } : {}),
          }),
          gateway.model,
        )
      }

      if (name === 'mapper@v1' || name === 'mapper@v2') verifyMapperEinHitRate(input, parsed.data)
      if (name === 'pulse-extract@v3') verifyPulseSourceExcerpt(input, parsed.data)
      if (name === 'rule-concrete-draft@v1' || name === 'rule-concrete-draft@v2') {
        verifyRuleConcreteDraft(input, parsed.data)
      }
      if (name === 'client-risk-summary@v1' || name === 'deadline-tip@v1') {
        verifyInsightOutput(input, parsed.data)
      }

      const trace = createTrace({
        promptVersion: name,
        model: gateway.model,
        latencyMs: Date.now() - startedAt,
        guardResult: 'ok',
        inputHash,
        ...(gateway.tokens ? { tokens: gateway.tokens } : {}),
        ...(gateway.costUsd !== undefined ? { costUsd: gateway.costUsd } : {}),
      })

      return {
        result: parsed.data,
        refusal: null,
        trace,
        model: gateway.model,
        confidence: averageConfidence(parsed.data),
        cost: gateway.costUsd ?? null,
      }
    } catch (error) {
      if (error instanceof GuardRejection) {
        return refusal(
          'GUARD_REJECTED',
          error.message,
          createTrace({
            promptVersion: name,
            model: selectedModel ?? prompt.modelTier,
            latencyMs: Date.now() - startedAt,
            guardResult: 'guard_rejected',
            inputHash,
            refusalCode: 'GUARD_REJECTED',
          }),
          selectedModel ?? prompt.modelTier,
        )
      }

      return refusal(
        'AI_GATEWAY_ERROR',
        error instanceof Error ? error.message : 'AI gateway request failed.',
        createTrace({
          promptVersion: name,
          model: selectedModel ?? prompt.modelTier,
          latencyMs: Date.now() - startedAt,
          // Gateway/transport/credit failures are not schema mismatches — keep them
          // in their own bucket so a provider outage or exhausted OpenRouter balance
          // (which rejects every request at pre-flight) is diagnosable, not masked
          // as 'schema_fail'. The actual error text rides along in the refusal message.
          guardResult: 'ai_unavailable',
          inputHash,
          refusalCode: 'AI_GATEWAY_ERROR',
        }),
        selectedModel ?? prompt.modelTier,
      )
    }
  }

  return {
    extractPulse(
      input: PulseExtractInput,
      routing: AiRoutingInput = {},
    ): Promise<AiRunResult<PulseExtractOutput>> {
      return runPrompt('pulse-extract@v3', input, PulseExtractOutputSchema, {
        ...routing,
        taskKind: routing.taskKind ?? 'pulse',
      })
    },
    /**
     * 2026-06-04 round 50 (Yuqi "continue your phase 2 and 3" —
     * morning sweep AI summary): wraps the canonical `runPrompt`
     * pipeline so callers don't need to know the prompt name or
     * schema. Returns the same `AiRunResult` discriminated union
     * as `extractPulse`; the server procedure handles the refusal
     * case by falling back to the client's template-based mock.
     */
    summarizeMorningSweep(
      input: MorningSweepInput,
      routing: AiRoutingInput = {},
    ): Promise<AiRunResult<MorningSweepOutput>> {
      return runPrompt('morning-sweep@v1', input, MorningSweepOutputSchema, {
        ...routing,
        taskKind: routing.taskKind ?? 'pulse',
      })
    },
    runPrompt,
    runStreaming: runPrompt,
  }
}

export type AI = ReturnType<typeof createAI>
export type { PulseExtractInput, PulseExtractOutput } from './pulse'
export { PulseExtractInputSchema, PulseExtractOutputSchema } from './pulse'
export type { MorningSweepAlert, MorningSweepInput, MorningSweepOutput } from './morning-sweep'
export {
  MorningSweepAlertSchema,
  MorningSweepInputSchema,
  MorningSweepOutputSchema,
} from './morning-sweep'
