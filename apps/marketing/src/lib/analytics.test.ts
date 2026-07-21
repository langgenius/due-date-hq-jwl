import { describe, expect, it } from 'vitest'

import { resolveMarketingAction } from './analytics'

describe('marketing analytics action contract', () => {
  it('maps the founding-user banner Apply marker to its Amplitude event', () => {
    expect(resolveMarketingAction('marketing.founding-banner.apply')).toEqual({
      name: 'Founding User Banner Apply Clicked',
      location: 'founding_banner',
    })
  })

  it('does not turn unrelated data-event markers into action events', () => {
    expect(resolveMarketingAction('marketing.founding.submit')).toBeUndefined()
    expect(resolveMarketingAction(undefined)).toBeUndefined()
  })
})
