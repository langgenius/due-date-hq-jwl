import { type AiTaskKind, type BillingPlan } from '@duedatehq/core/plan-entitlements'
import type { PromptName } from './prompter'

export interface AiModelRoutingEnv {
  AI_GATEWAY_MODEL_FAST_JSON?: string
  AI_GATEWAY_MODEL_QUALITY_JSON?: string
  AI_GATEWAY_MODEL_REASONING?: string
  AI_GATEWAY_QUALITY_REASONING_EFFORT?: string
  AI_GATEWAY_FAST_REASONING_EFFORT?: string
}

export type AiModelTier = 'fast-json' | 'quality-json' | 'reasoning'

export interface AiRoutingInput {
  plan?: BillingPlan
  taskKind?: AiTaskKind
  firmId?: string
  firmCreatedAt?: Date | string
  migrationOnboardingCompleted?: boolean
}

export function taskKindForPrompt(prompt: PromptName): AiTaskKind {
  if (
    prompt === 'mapper@v1' ||
    prompt === 'mapper@v2' ||
    prompt === 'normalizer-entity@v1' ||
    prompt === 'normalizer-tax-types@v1'
  ) {
    return 'migration'
  }
  if (prompt === 'brief@v1') return 'brief'
  if (prompt === 'pulse-extract@v5') return 'pulse'
  if (prompt === 'rule-concrete-draft@v1' || prompt === 'rule-concrete-draft@v2') return 'insight'
  if (prompt === 'readiness-checklist@v1') return 'readiness'
  return 'insight'
}

export function parseModelTier(value: string): AiModelTier | null {
  if (value === 'fast-json' || value === 'quality-json' || value === 'reasoning') return value
  return null
}

export function modelForPromptTier(
  env: AiModelRoutingEnv,
  tier: AiModelTier,
  // Plan-based routing was retired (single model across all plans). Param kept for call-site
  // and signature stability; billing plan still drives budget limits in index.ts, not model choice.
  _routing: Pick<AiRoutingInput, 'migrationOnboardingCompleted' | 'plan'> = {},
): string | undefined {
  if (tier === 'fast-json') return env.AI_GATEWAY_MODEL_FAST_JSON
  if (tier === 'quality-json') return env.AI_GATEWAY_MODEL_QUALITY_JSON
  return env.AI_GATEWAY_MODEL_REASONING
}

export type AiReasoningEffort = 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none'

const AI_REASONING_EFFORTS: readonly AiReasoningEffort[] = [
  'xhigh',
  'high',
  'medium',
  'low',
  'minimal',
  'none',
]

/**
 * OpenRouter reasoning effort per tier. Quality tasks (pulse/rule/brief/insights) default to
 * 'high' for accuracy; fast tasks (mapper/normalizer/readiness) default to 'low' to stay fast and
 * cheap on the interactive import path. Env vars override; an empty or unrecognized value returns
 * undefined so the caller omits provider reasoning options entirely (used by e2e/tests, and any
 * non-OpenRouter provider). gemini-3.5-flash mandates reasoning, so 'low' is the practical floor.
 */
export function reasoningEffortForTier(
  env: AiModelRoutingEnv,
  tier: AiModelTier,
): AiReasoningEffort | undefined {
  const raw =
    tier === 'quality-json'
      ? (env.AI_GATEWAY_QUALITY_REASONING_EFFORT ?? 'high')
      : tier === 'fast-json'
        ? (env.AI_GATEWAY_FAST_REASONING_EFFORT ?? 'low')
        : undefined
  const trimmed = raw?.trim()
  return AI_REASONING_EFFORTS.find((value) => value === trimmed)
}
