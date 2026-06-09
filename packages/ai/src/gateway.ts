import { createAiGateway } from 'ai-gateway-provider'
import { createOpenRouter } from 'ai-gateway-provider/providers/openrouter'
import { createUnified } from 'ai-gateway-provider/providers/unified'
import { generateText, Output } from 'ai'
import * as z from 'zod'
import { computeCostUsd } from './pricing'

/** JSON-compatible value matching the AI SDK provider-options value type (no cast needed at the call site). */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

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
  /** Provider-namespaced options forwarded to generateText, e.g. { openrouter: { reasoning: { effort } } }. */
  providerOptions?: Record<string, Record<string, JsonValue>>
}

export interface GatewayResponse<TOut> {
  output: TOut
  model: string
  tokens?: { input?: number; output?: number }
  costUsd?: number
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
      ...(controller ? { abortSignal: controller.signal } : {}),
      // Provider-namespaced opts (e.g. OpenRouter reasoning.effort). The AI SDK forwards these to
      // the model's doGenerate; ai-gateway-provider passes them through unchanged.
      ...(request.providerOptions ? { providerOptions: request.providerOptions } : {}),
    })
  } finally {
    if (timeout) clearTimeout(timeout)
  }

  const response: GatewayResponse<TOut> = {
    output: request.schema.parse(result.output),
    model: request.model,
  }
  const tokens = readUsage(result.usage)
  if (tokens) response.tokens = tokens
  // The gateway doesn't return a cost — attribute it from usage so spend lands in
  // the DB (ai_output / llm_log cost_usd) instead of only the provider dashboard.
  const costUsd = computeCostUsd(request.model, tokens)
  if (costUsd !== undefined) response.costUsd = costUsd
  return response
}
