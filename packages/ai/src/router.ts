import { type AiTaskKind, type BillingPlan } from '@duedatehq/core/plan-entitlements'
import type { PromptName } from './prompter'

export interface AiModelRoutingEnv {
  AI_GATEWAY_MODEL_FAST_JSON?: string
  AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING?: string
  AI_GATEWAY_MODEL_FAST_JSON_SOLO?: string
  AI_GATEWAY_MODEL_FAST_JSON_PAID?: string
  AI_GATEWAY_MODEL_QUALITY_JSON?: string
  AI_GATEWAY_MODEL_REASONING?: string
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
    prompt === 'normalizer-entity@v1' ||
    prompt === 'normalizer-tax-types@v1'
  ) {
    return 'migration'
  }
  if (prompt === 'brief@v1') return 'brief'
  if (prompt === 'pulse-extract@v1') return 'pulse'
  if (prompt === 'rule-concrete-draft@v1') return 'insight'
  if (prompt === 'readiness-checklist@v1') return 'readiness'
  return 'insight'
}

export function parseModelTier(value: string): AiModelTier | null {
  if (value === 'fast-json' || value === 'quality-json' || value === 'reasoning') return value
  return null
}

function fastJsonModelForPlan(
  env: AiModelRoutingEnv,
  routing: Pick<AiRoutingInput, 'migrationOnboardingCompleted' | 'plan'>,
): string | undefined {
  const { migrationOnboardingCompleted, plan } = routing
  if (plan === 'solo') {
    if (migrationOnboardingCompleted === false) {
      return (
        env.AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING ??
        env.AI_GATEWAY_MODEL_FAST_JSON_SOLO ??
        env.AI_GATEWAY_MODEL_FAST_JSON
      )
    }
    return env.AI_GATEWAY_MODEL_FAST_JSON_SOLO ?? env.AI_GATEWAY_MODEL_FAST_JSON
  }
  if (plan === 'pro' || plan === 'team' || plan === 'firm') {
    return env.AI_GATEWAY_MODEL_FAST_JSON_PAID ?? env.AI_GATEWAY_MODEL_FAST_JSON
  }
  return env.AI_GATEWAY_MODEL_FAST_JSON
}

export function modelForPromptTier(
  env: AiModelRoutingEnv,
  tier: AiModelTier,
  routing: Pick<AiRoutingInput, 'migrationOnboardingCompleted' | 'plan'> = {},
): string | undefined {
  if (tier === 'fast-json') return fastJsonModelForPlan(env, routing)
  if (tier === 'quality-json') return env.AI_GATEWAY_MODEL_QUALITY_JSON
  return env.AI_GATEWAY_MODEL_REASONING
}
