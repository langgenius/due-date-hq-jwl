import { describe, expect, it } from 'vitest'
import { DICT_VERSION, normalizeEntityType, normalizeState } from './index'

describe('normalizeEntityType', () => {
  it.each([
    ['LLC', 'llc'],
    ['L.L.C.', 'llc'],
    ['Limited Liability Company', 'llc'],
    ['S-Corp', 's_corp'],
    ['S-Corporation', 's_corp'],
    ['S Corp', 's_corp'],
    ['1120S', 's_corp'],
    ['1120-S', 's_corp'],
    ['s corporation', 's_corp'],
    ['Corp (S)', 's_corp'],
    ['1120', 'c_corp'],
    ['C Corp', 'c_corp'],
    ['C-Corporation', 'c_corp'],
    ['1065', 'partnership'],
    ['LP', 'partnership'],
    ['Ptnr', 'partnership'],
    ['Sole Proprietor', 'sole_prop'],
    ['Sole Prop', 'sole_prop'],
    ['sole-prop', 'sole_prop'],
    ['Schedule C Filer', 'sole_prop'],
    ['1041', 'trust'],
    ['Trust', 'trust'],
    ['Individual', 'individual'],
  ])('normalizes %s', (raw, expected) => {
    const hit = normalizeEntityType(raw)
    expect(hit).not.toBeNull()
    expect(hit!.normalized).toBe(expected)
    expect(hit!.promptVersion).toBe(DICT_VERSION)
  })

  it('returns null for unknown values so the service can mark needs_review', () => {
    expect(normalizeEntityType('weird-thing')).toBeNull()
    expect(normalizeEntityType('')).toBeNull()
  })
})

describe('normalizeState', () => {
  it('passes through valid 2-letter codes with confidence 1.0', () => {
    const hit = normalizeState('NY')
    expect(hit).toEqual({ normalized: 'NY', confidence: 1.0, promptVersion: DICT_VERSION })
  })

  it.each([
    ['california', 'CA'],
    ['Calif', 'CA'],
    ['New York', 'NY'],
    ['District of Columbia', 'DC'],
    ['washington dc', 'DC'],
  ])('maps %s → %s', (raw, expected) => {
    const hit = normalizeState(raw)
    expect(hit).not.toBeNull()
    expect(hit!.normalized).toBe(expected)
  })

  it('returns null for unknown states', () => {
    expect(normalizeState('Atlantis')).toBeNull()
    expect(normalizeState('XX')).toBeNull()
  })
})
