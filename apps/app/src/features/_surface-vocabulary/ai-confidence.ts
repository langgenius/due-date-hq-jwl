/**
 * Canonical AI confidence ladder for the whole product.
 *
 * This module is the single source of truth all surfaces should consume —
 * without it the same "AI confidence" concept fragments into several
 * divergent threshold systems (different cutoffs, different tier counts,
 * "same alert, two confidence shapes side by side").
 *
 * Ladder rationale:
 *  - 0.5 is the "I'm not sure" floor — at half, the AI is no better
 *    than a coin flip for a CPA's purposes. Below 0.5, the surface
 *    should yell at the human to verify.
 *  - 0.85 is the "I'm pretty sure" gate — above this, the AI's
 *    answer is good enough to render without a warning chip.
 *  - The 0.5–0.85 band is "I lean this way, but check" — Medium.
 *
 * Three tiers, two thresholds. Same model across Alerts, dashboard,
 * checklist generation, rule drafts. Migration + Evidence retain
 * their domain-specific ladders for now (different semantics —
 * "Confirmed by human" in Evidence is a tier above AI confidence,
 * not a higher AI confidence band).
 */

export const AI_CONFIDENCE_THRESHOLDS = {
  /** Below this, the model is so unsure the surface should warn. */
  low: 0.5,
  /** At or above this, the model is confident enough to render quietly. */
  high: 0.85,
} as const

export type AiConfidenceTier = 'low' | 'medium' | 'high'

/**
 * Canonical AI confidence tier classifier. Returns the qualitative
 * tier name for a numeric confidence score in [0, 1].
 *
 * Use this everywhere instead of inlining the threshold values.
 */
export function aiConfidenceTier(score: number): AiConfidenceTier {
  if (score < AI_CONFIDENCE_THRESHOLDS.low) return 'low'
  if (score < AI_CONFIDENCE_THRESHOLDS.high) return 'medium'
  return 'high'
}

/**
 * Convenience predicate for "the model is so unsure the surface
 * should yell at the human." Use this in card tinting + alert
 * banner triggers.
 */
export function isLowAiConfidence(score: number): boolean {
  return score < AI_CONFIDENCE_THRESHOLDS.low
}
