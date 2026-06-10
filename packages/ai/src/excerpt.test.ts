import { describe, expect, it } from 'vitest'
import {
  alignExcerptToSource,
  classifyExcerptMatch,
  snapExcerptToSource,
  sourceTextContainsExcerpt,
} from './excerpt'

// Parity cases ported from apps/server/src/procedures/rules/concrete-draft.test.ts —
// the move must not change classification behavior (the drift detector and the
// bulk-trust gate both ride on it).
describe('classifyExcerptMatch (moved-code parity)', () => {
  it('classifies a verbatim quote as exact', () => {
    expect(
      classifyExcerptMatch(
        'Sales and use tax returns are due on the 20th day of the month following the reporting period.',
        'returns are due on the 20th day of the month',
      ),
    ).toBe('exact')
  })

  it('classifies date-only support as fuzzy', () => {
    expect(
      classifyExcerptMatch(
        'Annual report deadline: April 15, 2026. See instructions for details.',
        'The filing is due April 15, 2026 under the revised schedule.',
      ),
    ).toBe('fuzzy')
  })

  it('classifies unrelated text as none', () => {
    expect(
      classifyExcerptMatch(
        'Sales and use tax returns are due monthly.',
        'Fishing licenses renew every other leap year at the county clerk.',
      ),
    ).toBe('none')
  })

  it('keeps sourceTextContainsExcerpt as a (!== none) wrapper', () => {
    const source = 'Withholding payments are due January 31, 2026 for annual filers.'
    expect(sourceTextContainsExcerpt(source, 'payments due January 31, 2026')).toBe(true)
    expect(sourceTextContainsExcerpt(source, 'Fishing licenses renew at the county clerk.')).toBe(
      false,
    )
  })
})

describe('alignExcerptToSource', () => {
  it('keeps an exact (whitespace-drifted) excerpt untouched', () => {
    const source = 'Returns must be filed until\n   October 15,\t2026 to qualify for relief.'
    const aligned = alignExcerptToSource(source, 'until October 15, 2026')
    expect(aligned.match).toBe('exact')
    expect(aligned.snappedExcerpt).toBeNull()
  })

  it('snaps a smart-quote/dash-drifted excerpt to the verbatim source span', () => {
    const source =
      'Notice 2026-14: Taxpayers in the “District of Columbia” have until October 15, 2026 — penalties waived for covered filers.'
    const excerpt =
      'Taxpayers in the "District of Columbia" have until October 15, 2026 - penalties waived'
    const aligned = alignExcerptToSource(source, excerpt)
    expect(aligned.match).toBe('fuzzy')
    expect(aligned.snappedExcerpt).toBe(
      'Taxpayers in the “District of Columbia” have until October 15, 2026 — penalties waived',
    )
    expect(source).toContain(aligned.snappedExcerpt ?? '')
  })

  it('aligns across hyphenated line breaks via token concatenation', () => {
    const source = 'All with-\nholding tax returns are due January 31, 2026 without exception.'
    const excerpt = 'withholding tax returns are due January 31, 2026'
    const aligned = alignExcerptToSource(source, excerpt)
    expect(aligned.match).toBe('fuzzy')
    expect(aligned.snappedExcerpt).not.toBeNull()
    expect(source).toContain(aligned.snappedExcerpt ?? '')
    expect(aligned.snappedExcerpt).toContain('with-\nholding')
  })

  it('aligns through soft hyphens and zero-width characters', () => {
    const source =
      'Octo\u00ADber 15 filing dead\u200Bline applies to estimated tax payments statewide.'
    const excerpt = 'October 15 filing deadline applies to estimated tax payments'
    const aligned = alignExcerptToSource(source, excerpt)
    expect(aligned.match).not.toBe('none')
    expect(aligned.snappedExcerpt).not.toBeNull()
    expect(source).toContain(aligned.snappedExcerpt ?? '')
  })

  it('keeps the model excerpt when a date-code-only fuzzy match cannot be localized', () => {
    const source =
      'Quarterly estimated payments: first installment April 15, 2026; see schedule B for amounts.'
    const excerpt =
      'Under the revised relief framework every covered participant remits the initial annual prepayment obligation no later than 4/15.'
    const aligned = alignExcerptToSource(source, excerpt)
    expect(aligned.match).toBe('fuzzy')
    expect(aligned.snappedExcerpt).toBeNull()
  })

  it('rejects a hallucinated excerpt', () => {
    const source =
      'Taxpayers in the District of Columbia have until October 15, 2026 to file individual income tax returns.'
    const aligned = alignExcerptToSource(
      source,
      'All Guam filers must remit franchise surcharges by March 1, 2027.',
    )
    expect(aligned.match).toBe('none')
    expect(aligned.snappedExcerpt).toBeNull()
  })

  it('rejects a near-miss below the fuzzy threshold', () => {
    const source = 'Sales tax returns are due monthly on the 20th.'
    const aligned = alignExcerptToSource(
      source,
      'Sales tax permits renew annually before the festival concession deadline window closes statewide.',
    )
    expect(aligned.match).toBe('none')
  })

  it('preserves the short-generic-excerpt gate', () => {
    const aligned = alignExcerptToSource(
      'Important announcement about office hours and parking validation.',
      'regarding office hours',
    )
    expect(aligned.match).toBe('none')
  })
})

describe('snapExcerptToSource', () => {
  it('returns the verbatim span for a unicode-folded exact hit', () => {
    const source = 'Filing window: “April 15, 2026” — no extensions granted.'
    expect(snapExcerptToSource(source, '"April 15, 2026" - no extensions')).toBe(
      '“April 15, 2026” — no extensions',
    )
  })

  it('returns null when nothing clears the threshold', () => {
    expect(
      snapExcerptToSource(
        'Sales tax returns are due monthly on the 20th.',
        'Fishing licenses renew every other leap year at the county clerk office.',
      ),
    ).toBeNull()
  })
})
