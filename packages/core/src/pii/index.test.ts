import { describe, expect, it } from 'vitest'
import {
  containsPossibleEmailAddress,
  containsPossibleSensitiveIdentifier,
  detectSsnColumns,
  looksLikeSsn,
  validateEin,
} from './index'

describe('detectSsnColumns', () => {
  it('flags columns whose header matches SSN label patterns', () => {
    const result = detectSsnColumns(
      ['name', 'SSN', 'ein', 'Taxpayer #'],
      [['Acme', '123-45-6789', '12-3456789', '987-65-4321']],
    )
    expect(result.blockedColumnIndexes).toEqual([1, 3])
    expect(result.blockedHeaders).toEqual(['SSN', 'Taxpayer #'])
  })

  it('flags columns whose values look like SSN even with bland headers', () => {
    const result = detectSsnColumns(
      ['name', 'id'],
      [
        ['Acme', '123-45-6789'],
        ['Bright', '987-65-4321'],
      ],
    )
    expect(result.blockedColumnIndexes).toEqual([1])
  })

  it('does not flag EIN-shaped values (##-#######)', () => {
    const result = detectSsnColumns(
      ['name', 'tax_id'],
      [
        ['Acme', '12-3456789'],
        ['Bright', '98-7654321'],
      ],
    )
    expect(result.blockedColumnIndexes).toEqual([])
  })

  it('returns empty arrays when input is empty', () => {
    expect(detectSsnColumns([], [])).toEqual({
      blockedColumnIndexes: [],
      blockedHeaders: [],
    })
  })

  it('matches social security headers in any case / spacing', () => {
    const result = detectSsnColumns(['Social Security Number', 'social_security'], [['', '']])
    expect(result.blockedColumnIndexes).toEqual([0, 1])
  })

  it('matches ITIN and taxpayer identification headers', () => {
    const result = detectSsnColumns(
      ['Client Name', 'ITIN', 'Taxpayer Identification Number', 'Tax ID'],
      [['Acme', '', '', '12-3456789']],
    )
    expect(result.blockedColumnIndexes).toEqual([1, 2])
    expect(result.blockedHeaders).toEqual(['ITIN', 'Taxpayer Identification Number'])
  })
})

describe('validateEin', () => {
  it('accepts the canonical EIN format', () => {
    expect(validateEin('12-3456789')).toBe(true)
  })

  it.each<string | null | undefined>([
    '',
    null,
    undefined,
    '1234567890',
    '12-345678',
    'AB-1234567',
  ])('rejects malformed value %s', (v) => {
    expect(validateEin(v)).toBe(false)
  })
})

describe('looksLikeSsn', () => {
  it.each(['123-45-6789', ' 123-45-6789 '])('matches %s', (v) => {
    expect(looksLikeSsn(v)).toBe(true)
  })
  it.each(['12-3456789', '1234-56-7890', '12 34 5678'])('rejects %s', (v) => {
    expect(looksLikeSsn(v)).toBe(false)
  })
})

describe('public-copy PII guards', () => {
  it('detects an email address across public source-derived fields', () => {
    expect(containsPossibleEmailAddress(['Deadline changed', 'Contact private@example.com'])).toBe(
      true,
    )
    expect(containsPossibleEmailAddress(['Form 1040', 'Individual'])).toBe(false)
  })

  it('detects compact and separated nine-digit identifiers', () => {
    expect(containsPossibleSensitiveIdentifier(['Reference 123456789'])).toBe(true)
    expect(containsPossibleSensitiveIdentifier(['Reference 123 45 6789'])).toBe(true)
    expect(containsPossibleSensitiveIdentifier(['Deadline 2026-10-15'])).toBe(false)
  })
})
