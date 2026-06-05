import { describe, expect, it } from 'vitest'

import { dedupeTitleSource } from './needs-attention-card'

describe('dedupeTitleSource', () => {
  it('strips a leading source prefix from the title', () => {
    expect(dedupeTitleSource('FL DOR Bulletin has very-low-confidence', 'FL DOR Bulletin')).toBe(
      'Has very-low-confidence',
    )
  })

  it('strips a trailing separator after the source prefix', () => {
    expect(dedupeTitleSource('FL DOR Bulletin: rules changed', 'FL DOR Bulletin')).toBe(
      'Rules changed',
    )
    expect(dedupeTitleSource('FL DOR Bulletin · rules changed', 'FL DOR Bulletin')).toBe(
      'Rules changed',
    )
    expect(dedupeTitleSource('FL DOR Bulletin — rules changed', 'FL DOR Bulletin')).toBe(
      'Rules changed',
    )
    expect(dedupeTitleSource('FL DOR Bulletin - rules changed', 'FL DOR Bulletin')).toBe(
      'Rules changed',
    )
  })

  it('matches case-insensitively but preserves original casing on the kept portion', () => {
    expect(dedupeTitleSource('fl dor bulletin: changed', 'FL DOR Bulletin')).toBe('Changed')
  })

  it('falls back to the raw title when source is not a prefix', () => {
    expect(dedupeTitleSource('NY DTF advisory has new rules', 'FL DOR Bulletin')).toBe(
      'NY DTF advisory has new rules',
    )
  })

  it('falls back to the raw title when source is empty', () => {
    expect(dedupeTitleSource('FL DOR Bulletin: rules changed', '')).toBe(
      'FL DOR Bulletin: rules changed',
    )
  })

  // Round 85 edge case fix: source === title would have stripped
  // everything and the original implementation fell through to raw.
  // This explicit-equality early return makes the behavior obvious
  // and prevents subtle regressions if the fall-through changes.
  it('falls back to the raw title when source IS the entire title', () => {
    expect(dedupeTitleSource('FL DOR Bulletin', 'FL DOR Bulletin')).toBe('FL DOR Bulletin')
  })

  // Round 85 edge case fix: if the stripped remainder is only
  // punctuation/whitespace, surface the raw title so an empty
  // h3 is never rendered.
  it('falls back when stripped remainder is only punctuation', () => {
    expect(dedupeTitleSource('FL DOR Bulletin · · ·', 'FL DOR Bulletin')).toBe(
      'FL DOR Bulletin · · ·',
    )
  })

  it('trims whitespace on both arguments before comparison', () => {
    expect(dedupeTitleSource('  FL DOR Bulletin: changed  ', '  FL DOR Bulletin  ')).toBe('Changed')
  })
})
