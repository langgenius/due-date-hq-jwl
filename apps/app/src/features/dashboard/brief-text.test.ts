import { describe, expect, it } from 'vitest'

import { parseBriefText } from './brief-text'

describe('parseBriefText', () => {
  it('splits headline, numbered items (summary / Next), and footer', () => {
    const text = [
      'Address critical overdue filings immediately.',
      '1. Federal estimated tax payment was due Jun 5 and remains pending. Next: Verify if the payment was scheduled. [1]',
      '2. Federal corporate return is overdue from May 12. Next: Check the e-file status. [2] [3]',
      'Please review all pending items to ensure compliance.',
    ].join('\n')

    const parsed = parseBriefText(text)
    expect(parsed.headline).toBe('Address critical overdue filings immediately.')
    expect(parsed.items).toEqual([
      {
        text: 'Federal estimated tax payment was due Jun 5 and remains pending.',
        nextCheck: 'Verify if the payment was scheduled. [1]',
      },
      {
        text: 'Federal corporate return is overdue from May 12.',
        nextCheck: 'Check the e-file status. [2] [3]',
      },
    ])
    expect(parsed.footer).toBe('Please review all pending items to ensure compliance.')
  })

  it('strips model-added label prefixes from the headline', () => {
    expect(parseBriefText('Weekly triage brief: Two filings need attention.').headline).toBe(
      'Two filings need attention.',
    )
    expect(parseBriefText('Daily Brief — all clear today.').headline).toBe('all clear today.')
  })

  it('keeps an item whole when it has no Next separator', () => {
    const parsed = parseBriefText('Lead.\n1. Standalone action item. [1]')
    expect(parsed.items).toEqual([{ text: 'Standalone action item. [1]', nextCheck: null }])
  })

  it('returns no items for plain prose (zero-rows brief)', () => {
    const parsed = parseBriefText('No open deadline risks are currently in the Dashboard window.')
    expect(parsed.headline).toBe('No open deadline risks are currently in the Dashboard window.')
    expect(parsed.items).toEqual([])
    expect(parsed.footer).toBeNull()
  })

  it('ignores blank lines and trims whitespace', () => {
    const parsed = parseBriefText('  Lead line. \n\n 1.  Item one. Next: Step.  \n\n')
    expect(parsed.headline).toBe('Lead line.')
    expect(parsed.items).toEqual([{ text: 'Item one.', nextCheck: 'Step.' }])
  })
})
