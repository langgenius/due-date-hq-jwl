import { describe, expect, it } from 'vitest'
import { pulseContract } from '@duedatehq/contracts'
import { router } from './index'

describe('procedure router wiring', () => {
  it('exposes every Pulse contract procedure from the root router', () => {
    expect(Object.keys(router.pulse)).toEqual(Object.keys(pulseContract))
  })
})
