import { describe, expect, it } from 'vitest'

import { ErrorCodes } from '@duedatehq/contracts'

import { isAlertConflict, isAlertNotFound, alertErrorDescriptor } from './error-mapping'

function rpcError(code: string): Error {
  const err = new Error(code)
  ;(err as Error & { code?: string }).code = code
  return err
}

describe('alertErrorDescriptor', () => {
  it('returns specific descriptors for each Pulse code', () => {
    const ids = new Set(
      [
        ErrorCodes.PULSE_NOT_FOUND,
        ErrorCodes.PULSE_APPLY_CONFLICT,
        ErrorCodes.PULSE_REVERT_EXPIRED,
        ErrorCodes.PULSE_NO_ELIGIBLE_OBLIGATIONS,
        ErrorCodes.MEMBER_FORBIDDEN,
      ].map((code) => alertErrorDescriptor(rpcError(code)).id),
    )
    expect(ids.size).toBe(5)
  })

  it('falls back to a generic descriptor for unknown errors', () => {
    expect(alertErrorDescriptor(new Error('boom')).id).toBeDefined()
    expect(alertErrorDescriptor(null).id).toBeDefined()
  })

  it('detects conflict errors specifically', () => {
    expect(isAlertConflict(rpcError(ErrorCodes.PULSE_APPLY_CONFLICT))).toBe(true)
    expect(isAlertConflict(rpcError(ErrorCodes.PULSE_NOT_FOUND))).toBe(false)
  })

  it('detects not-found errors specifically', () => {
    expect(isAlertNotFound(rpcError(ErrorCodes.PULSE_NOT_FOUND))).toBe(true)
    expect(isAlertNotFound(new Error('no'))).toBe(false)
  })
})
