# Google Ads — disaster-intent search test (2026-07)

**Goal:** buy the exact searches our SEO pages target ("IRS [state] disaster relief deadline"),
land them on the matching state page (which now carries the free-alert opt-in), and measure whether
paid high-intent traffic converts. Small-budget validation test, not scale.

**What I can't do from here:** create the campaign — needs your Google Ads account + billing.
Everything below is ready to paste into the Ads UI.

## Campaign

- **Type:** Search only (no Display/Search-partners for the test)
- **Name:** `disaster-intent-2026-07`
- **Geo:** United States (searches come from CPAs anywhere, not only the disaster state)
- **Budget:** $10–15/day · **Bidding:** Maximize clicks with a $6 CPC cap for week 1, then switch to
  Maximize conversions once ≥15 conversions are tagged
- **Test window:** 2 weeks, then kill/keep per the criteria at the bottom
- **Final URL suffix (campaign level):**
  `utm_source=google&utm_medium=cpc&utm_campaign=disaster_intent_2026_07&utm_content={campaign}_{adgroup}`

## Ad groups (one per live-relief state, priority order)

| Ad group         | Landing page (final URL)                                            | Keyword theme       |
| ---------------- | ------------------------------------------------------------------- | ------------------- |
| LA — TS Arthur   | `/irs-disaster-relief/louisiana-tropical-storm-arthur`              | freshest (Jul 13)   |
| WA — storms      | `/irs-disaster-relief/washington-severe-storms-flooding-landslides` | most urgent (Aug 5) |
| GA — wildfires   | `/irs-disaster-relief/georgia-southeast-wildfires`                  | Aug 20              |
| MS — storms      | `/irs-disaster-relief/mississippi-severe-storms-tornadoes-flooding` | new Jul 13          |
| WI / MI — storms | matching state pages                                                | new Jul 13          |
| Generic          | `/irs-disaster-relief` (hub)                                        | catch-all           |

## Keywords (phrase + exact; swap the state per ad group)

```
"irs louisiana disaster relief"
"louisiana tax deadline extension 2026"
"irs disaster relief louisiana deadline"
"tropical storm arthur tax relief"        ← event terms convert best; use each state's event
"la-2026-02"                              ← relief-code searches = pure CPA intent
[irs louisiana deadline postponed]
```

Generic group: `"irs disaster relief deadlines"`, `"irs disaster tax relief 2026"`,
`"which irs deadlines are postponed"`.

**Negatives (campaign level):** `fema assistance`, `fema application`, `grant`, `sba loan`,
`unemployment`, `refund status`, `where is my refund`, `jobs`, `individual assistance`, `claim`.

## Responsive search ad copy (LA example — swap state/event/date per group; all within limits)

Headlines (≤30):

- `IRS Louisiana Tax Relief 2026`
- `New Deadline: Nov. 2, 2026`
- `See The Affected Parishes`
- `Verified Against IRS.gov`
- `Free Deadline-Change Alerts`
- `Which Clients Are Affected?`

Descriptions (≤90):

- `The IRS postponed Louisiana deadlines after Tropical Storm Arthur. See what's covered.`
- `County-level detail, covered returns, and the official notice — sourced to irs.gov.`
- `Get a free email when a filing deadline moves in your states. No account needed.`

## Conversions to tag (both already emit analytics events)

1. **Alert opt-in submit** — `data-event="marketing.disaster.alert-optin"` (primary; this is the
   cheap conversion the test lives on)
2. **Start free click** — the state-page CTA (secondary)
   Import from GA4/Amplitude or add a thank-you-page/gtag trigger when the form endpoint is wired.

## Kill / keep criteria (2 weeks)

- **Keep + scale state groups:** opt-ins ≤ ~$25 each, or any app signup
- **Rewrite:** CTR < 2% (intent mismatch) or CPC > $6 sustained
- **Kill:** spend > $150 with 0 opt-ins → the problem is the landing conversion, not the traffic;
  fix the page before buying more

Prereq: wire `PUBLIC_ALERT_FORM_ACTION` first — buying clicks into a placeholder form wastes the test.
