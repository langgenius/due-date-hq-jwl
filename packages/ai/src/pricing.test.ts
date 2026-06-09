import { describe, expect, it } from 'vitest'
import { computeCostUsd } from './pricing'

describe('computeCostUsd', () => {
  it('prices gemini-3.5-flash usage at $1.50/1M in + $9.00/1M out', () => {
    // 10k input + 2k output = 0.015 + 0.018 = 0.033
    expect(computeCostUsd('google/gemini-3.5-flash', { input: 10_000, output: 2_000 })).toBeCloseTo(
      0.033,
      6,
    )
  })

  it('strips the openrouter/ prefix before lookup', () => {
    expect(computeCostUsd('openrouter/google/gemini-3.5-flash', { input: 1_000_000 })).toBeCloseTo(
      1.5,
      6,
    )
  })

  it('treats missing token counts as zero', () => {
    expect(computeCostUsd('google/gemini-3.5-flash', { output: 1_000_000 })).toBeCloseTo(9, 6)
  })

  it('returns undefined for unknown models rather than guessing', () => {
    expect(computeCostUsd('some/unknown-model', { input: 100, output: 100 })).toBeUndefined()
  })

  it('returns undefined when usage is absent', () => {
    expect(computeCostUsd('google/gemini-3.5-flash', undefined)).toBeUndefined()
  })
})
