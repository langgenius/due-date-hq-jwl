# Founding-user banner Apply click analytics

**Date:** 2026-07-21 · marketing / analytics

Added a dedicated Amplitude event for the site-wide founding-user banner's Apply / 申请加入
button. The click still opens the existing lead modal; tracking runs from the marketing analytics
delegated capture listener and does not alter the form flow.

## Event contract

- Marker: `marketing.founding-banner.apply`
- Amplitude event: `Founding User Banner Apply Clicked`
- Properties: `location=founding_banner`, current `page`, rendered `locale`, and any campaign-level
  UTM attribution already retained for the marketing session
- Scope: the top banner button only. The modal's request-access submit remains a separate action and
  is not counted as an Apply click.

No PII is included in the event. In development, preview, or production without
`PUBLIC_AMPLITUDE_API_KEY`, the existing analytics guard keeps tracking a silent no-op.

## Validation

- Unit coverage verifies the marker-to-event contract and rejects unrelated markers.
- Marketing check and build verify the Astro component markup and production analytics bundle.
