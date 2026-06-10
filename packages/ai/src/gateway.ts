import { createAiGateway } from 'ai-gateway-provider'
import { createOpenRouter } from 'ai-gateway-provider/providers/openrouter'
import { createUnified } from 'ai-gateway-provider/providers/unified'
import { generateText, NoObjectGeneratedError, Output } from 'ai'
import * as z from 'zod'
import { computeCostUsd } from './pricing'

/** JSON-compatible value matching the AI SDK provider-options value type (no cast needed at the call site). */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * Default completion-token ceiling. 16k comfortably fits high-effort reasoning
 * plus the bounded JSON output of our structured tasks, while cutting the
 * OpenRouter credit reservation ~4x versus the model's 65536 default (and
 * capping a single runaway generation). Bump per-request via
 * GatewayRequest.maxOutputTokens if a task legitimately truncates.
 */
const DEFAULT_MAX_OUTPUT_TOKENS = 16384

export interface GatewayRequest<TOut> {
  accountId: string
  slug: string
  gatewayApiKey?: string
  provider: 'openrouter' | 'unified'
  providerApiKey?: string
  model: string
  prompt: string
  input: unknown
  schema: z.ZodType<TOut>
  timeoutMs?: number
  /**
   * Cap on completion tokens (reasoning + visible output). Defaults to
   * DEFAULT_MAX_OUTPUT_TOKENS. Left unset, the provider reserves the model's max
   * (65536 for gemini-3.5-flash), and OpenRouter's pre-flight requires the
   * account to afford that ceiling up front — so a low balance rejects every
   * request with "requires more credits, or fewer max_tokens". Capping shrinks
   * the reservation and bounds worst-case per-call spend.
   */
  maxOutputTokens?: number
  /** Provider-namespaced options forwarded to generateText, e.g. { openrouter: { reasoning: { effort } } }. */
  providerOptions?: Record<string, Record<string, JsonValue>>
}

export interface GatewayResponse<TOut> {
  output: TOut
  model: string
  tokens?: { input?: number; output?: number }
  costUsd?: number
}

/**
 * The model completed a billed generation but its output failed JSON/schema
 * validation (or was truncated) — distinct from transport/credit failures
 * where nothing was generated. ai@6 parses `Output.object` eagerly inside
 * `generateText` and throws before `result.usage` is ever read, so usage must
 * be salvaged off the error — otherwise every failed generation logs NULL
 * tokens/cost and a schema mismatch is indistinguishable from a provider
 * outage in llm_log.
 */
export class GatewayOutputInvalidError extends Error {
  readonly tokens?: NonNullable<GatewayResponse<unknown>['tokens']>
  readonly costUsd?: number
  readonly finishReason?: string

  constructor(
    message: string,
    options: {
      cause?: unknown
      tokens?: NonNullable<GatewayResponse<unknown>['tokens']>
      costUsd?: number
      finishReason?: string
    },
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'GatewayOutputInvalidError'
    if (options.tokens) this.tokens = options.tokens
    if (options.costUsd !== undefined) this.costUsd = options.costUsd
    if (options.finishReason !== undefined) this.finishReason = options.finishReason
  }
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readUsage(value: unknown): GatewayResponse<unknown>['tokens'] {
  if (!isRecord(value)) return undefined

  const input =
    optionalNumber(value.inputTokens) ??
    optionalNumber(value.promptTokens) ??
    optionalNumber(value.input) ??
    optionalNumber(value.prompt_tokens)
  const output =
    optionalNumber(value.outputTokens) ??
    optionalNumber(value.completionTokens) ??
    optionalNumber(value.output) ??
    optionalNumber(value.completion_tokens)

  if (input === undefined && output === undefined) return undefined

  const tokens: NonNullable<GatewayResponse<unknown>['tokens']> = {}
  if (input !== undefined) tokens.input = input
  if (output !== undefined) tokens.output = output
  return tokens
}

function modelForOpenRouter(model: string): string {
  return model.startsWith('openrouter/') ? model.slice('openrouter/'.length) : model
}

export async function callGateway<TOut>(
  request: GatewayRequest<TOut>,
): Promise<GatewayResponse<TOut>> {
  const controller = request.timeoutMs ? new AbortController() : null
  const timeout = controller ? setTimeout(() => controller.abort(), request.timeoutMs) : null
  const aiGateway = createAiGateway({
    accountId: request.accountId,
    gateway: request.slug,
    ...(request.gatewayApiKey ? { apiKey: request.gatewayApiKey } : {}),
  })
  const model =
    request.provider === 'openrouter' && request.providerApiKey
      ? createOpenRouter({ apiKey: request.providerApiKey }).chat(modelForOpenRouter(request.model))
      : createUnified()(request.model)

  let result: Awaited<ReturnType<typeof generateText>>
  try {
    result = await generateText({
      model: aiGateway(model),
      system: request.prompt,
      prompt: JSON.stringify(request.input),
      output: Output.object({ schema: request.schema }),
      temperature: 0,
      maxOutputTokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      ...(controller ? { abortSignal: controller.signal } : {}),
      // Provider-namespaced opts (e.g. OpenRouter reasoning.effort). The AI SDK forwards these to
      // the model's doGenerate; ai-gateway-provider passes them through unchanged.
      ...(request.providerOptions ? { providerOptions: request.providerOptions } : {}),
    })
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const tokens = readUsage(error.usage)
      const costUsd = computeCostUsd(request.model, tokens)
      throw new GatewayOutputInvalidError(error.message, {
        cause: error,
        ...(tokens ? { tokens } : {}),
        ...(costUsd !== undefined ? { costUsd } : {}),
        ...(error.finishReason !== undefined ? { finishReason: error.finishReason } : {}),
      })
    }
    throw error
  } finally {
    if (timeout) clearTimeout(timeout)
  }

  const tokens = readUsage(result.usage)
  // The gateway doesn't return a cost — attribute it from usage so spend lands in
  // the DB (ai_output / llm_log cost_usd) instead of only the provider dashboard.
  const costUsd = computeCostUsd(request.model, tokens)

  let output: TOut
  try {
    // Defense-in-depth re-validation (the SDK already parsed against the same
    // schema); classify a mismatch as an invalid billed generation, not a
    // gateway failure, and keep its usage.
    output = request.schema.parse(result.output)
  } catch (error) {
    throw new GatewayOutputInvalidError(
      error instanceof Error ? error.message : 'AI output failed schema validation.',
      {
        cause: error,
        ...(tokens ? { tokens } : {}),
        ...(costUsd !== undefined ? { costUsd } : {}),
        finishReason: result.finishReason,
      },
    )
  }

  const response: GatewayResponse<TOut> = { output, model: request.model }
  if (tokens) response.tokens = tokens
  if (costUsd !== undefined) response.costUsd = costUsd
  return response
}
