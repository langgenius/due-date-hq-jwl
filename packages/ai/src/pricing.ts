// Per-token USD pricing for the models we route through Cloudflare AI Gateway /
// OpenRouter. The gateway response does not return a cost, so we attribute it
// from token usage × these rates and persist it on every run (ai_output.cost_usd
// / llm_log.cost_usd) — without this, spend is invisible in the DB and only
// readable from the provider dashboard.
//
// Keep in sync with the provider's published prices. Unknown models return
// `undefined` (a null cost is better than a confidently-wrong one).

interface ModelPrice {
  /** USD per input/prompt token. */
  inputPerToken: number
  /** USD per output/completion token. */
  outputPerToken: number
}

// google/gemini-3.5-flash (OpenRouter): $1.50 / 1M input, $9.00 / 1M output.
const MODEL_PRICING: Record<string, ModelPrice> = {
  'google/gemini-3.5-flash': { inputPerToken: 1.5e-6, outputPerToken: 9e-6 },
}

function normalizeModel(model: string): string {
  return model.startsWith('openrouter/') ? model.slice('openrouter/'.length) : model
}

export function computeCostUsd(
  model: string,
  tokens: { input?: number; output?: number } | undefined,
): number | undefined {
  if (!tokens) return undefined
  const price = MODEL_PRICING[normalizeModel(model)]
  if (!price) return undefined
  return (tokens.input ?? 0) * price.inputPerToken + (tokens.output ?? 0) * price.outputPerToken
}
