import { describe, expect, it } from 'vitest'
import { canContinueNormalization } from './continue-rules'

describe('canContinueNormalization', () => {
  it('allows continuing because normalization values are read-only fallbacks', () => {
    expect(canContinueNormalization()).toBe(true)
  })
})
