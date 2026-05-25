import { describe, expect, it } from 'vitest'
import { clientVisibleFirmName, clientVisibleSenderName } from './readiness'

describe('readiness route helpers', () => {
  it('keeps ordinary firm names visible to clients', () => {
    expect(clientVisibleFirmName(' Alpine Dental Tax Advisors ')).toBe('Alpine Dental Tax Advisors')
  })

  it('hides internal plan-demo seed names from the public portal', () => {
    expect(clientVisibleFirmName('Team Plan Demo CPA')).toBe('Mock Practice CPA')
    expect(clientVisibleFirmName('Pro Plan Demo CPA')).toBe('Mock Practice CPA')
  })

  it('keeps the request sender visible to clients', () => {
    expect(clientVisibleSenderName(' Morgan Smith ')).toBe('Morgan Smith')
  })
})
