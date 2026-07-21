import { describe, expect, it } from 'vitest'

import { canonicalSocialAlertIntent, socialAlertRefFromPath } from './social-alert-intent'

const REF = 'social_ref_1234567890abcdef'

describe('social Alert intent parsing', () => {
  it('accepts only the canonical protected Alerts route with a valid opaque ref', () => {
    expect(socialAlertRefFromPath(`/alerts?ref=${REF}`)).toBe(REF)
    expect(socialAlertRefFromPath(`/alerts?utm_source=x&ref=${REF}`)).toBe(REF)

    expect(socialAlertRefFromPath(`/alerts/history?ref=${REF}`)).toBeNull()
    expect(socialAlertRefFromPath(`/deadlines?ref=${REF}`)).toBeNull()
    expect(socialAlertRefFromPath('/alerts?ref=short')).toBeNull()
    expect(socialAlertRefFromPath(`//evil.example/alerts?ref=${REF}`)).toBeNull()
    expect(socialAlertRefFromPath(`https://evil.example/alerts?ref=${REF}`)).toBeNull()
  })

  it('canonicalizes the safe onboarding bypass target and strips unrelated parameters', () => {
    expect(canonicalSocialAlertIntent(`/alerts?ref=${REF}&utm_campaign=daily_alerts`)).toBe(
      `/alerts?ref=${REF}`,
    )
    expect(canonicalSocialAlertIntent('/deadlines')).toBeNull()
  })
})
