# Disaster-notice page: decision-card hero + tightened copy

2026-07-28

## Why

The per-notice disaster-relief page (`/irs-disaster-relief/[slug]`) read as low-conversion: the H1
was the full IRS release title stuffed for SEO ("IRS Washington severe storms, straight-line winds,
flooding, landslides and mudslides tax relief — deadlines postponed to Aug. 5, 2026") rendered at
display size — five lines that fill the viewport with no scannable hook. Worse, the same eyebrow
("The postponed deadline"), the same title, and the same county list each appeared twice: once in
the hero prose and again in the separate key-deadline fact-table section below it. A CPA landing
from search or the WA outreach email saw a wall, then the wall repeated.

## What changed

`DisasterNoticePage.astro`:

- **Merged the hero and the key-deadline section into one decision card.** Eyebrow, title, and the
  county list now appear exactly once. The prose lead is one sentence.
- **Short human H1** (`{state}: IRS deadlines move to {deadlineLabel}` → "Washington: IRS deadlines
  move to Aug. 5, 2026", 2 lines). The keyword-stuffed phrasing stays in the `<title>`/meta and
  structured data, not the on-page H1.
- **Deadline is the headline of the card** (large mono accent) with a **client-side countdown pill**
  ("8 days left"). The count is filled from the reader's own clock (`is:inline` script) so a
  statically-built page never shows a stale number; inside 30 days it takes a warm warning tint
  (`color-mix` down from `--m-urgent`, the system's only urgency color — a near filing deadline is
  semantically a warning).
- **Affected area shows `affectedAreaShort`** ("25 Washington counties and 25 tribal nations") with a
  `<details>` "See every county" expander for the full list — no more wall of county names.

`disaster-notices.ts`:

- Tightened every `FILING_TYPE_META.whoItHits` line. Dropped the repeated "(Form NNNN)" (the card
  already shows a form badge) and the repeated "…in the window" boilerplate; each is now a distinct,
  crisp "who in your book" phrase. Shared with the app lookup, so both surfaces get the cleaner copy.

`public/_redirects`:

- Added `/r/wa` and `/r/wa-app` → the WA notice hub / app signup with UTM appended by the redirect,
  so the plain-text WA outreach email can show a clean short link (Gmail-Primary-safe) yet still
  attribute in Amplitude.

## Notes

- The live page had been serving the stale 9-county `affectedArea` (only the 5/1/26-added counties);
  the source was corrected to the full 25 on 2026-07-27 but prod is manual-deploy, so this deploy is
  what makes both the correct county list and `/r/wa` live.
- Fast-follow: propagate the decision-card + countdown primitive to `StateDetailPage`'s key-deadline
  module so the two "key deadline" surfaces don't drift; re-balance the filing-type cards now that
  their descriptions are short; mobile pass.
