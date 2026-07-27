# IRS disaster notices — update-banner audit + WA county completion

**Date:** 2026-07-27 · marketing data integrity

The daily IRS disaster monitor found no new declarations, so the run turned into a
verification pass over the eleven notices we publish. Two records looked wrong; on
closer reading both were right, and the reason they looked wrong is the finding.

## The gotcha: the IRS revises releases in place

The IRS edits an existing news release rather than issuing a new one, and the revision
lands in an **"Updated M/D/YY:" banner above the body**. The body prose is left alone.
So on the WA release the banner says the deadline moved to Aug. 5, 2026 while the body
below it says May 1, 2026 — twenty-three times. The page `<title>` and the URL slug also
keep the original date, and the link titles on
`/newsroom/tax-relief-in-disaster-situations` lag the same way.

Transcribing the body alone therefore yields a deadline months stale, in the direction
that matters most: it turns live relief into apparently-expired relief, or the reverse.

Both affected notices are on the current live list:

| Code       | Body prose / slug says | Banner says (correct)               |
| ---------- | ---------------------- | ----------------------------------- |
| WA-2025-03 | May 1, 2026            | **Aug. 5, 2026** (Updated 5/1/26)   |
| HI-2026-01 | July 8, 2026           | **Aug. 20, 2026** (Updated 5/12/26) |

Mid-audit both entries were briefly "corrected" to their stale body dates before the
banner was spotted. Reverted. The stored values were correct all along, and the header
comment in `disaster-notices.ts` now documents the trap so the next pass reads the banner
first.

## Real defect found: WA affected-area was incomplete

WA-2025-03's 5/1/26 update did two things — moved the deadline _and_ added counties. Our
`affectedArea` listed only the nine counties the update **added** (Asotin, Clark, Cowlitz,
Garfield, Klickitat, Pacific, Pend Oreille, Skamania, Wahkiakum) and dropped the
seventeen the original release named (Benton, Chelan, Clallam, Grays Harbor, Jefferson,
King, Kittitas, Lewis, Mason, Pierce, Samish, Skagit, Snohomish, Thurston, Wahkiakum,
Whatcom, Yakima).

Consequence: a CPA in King, Pierce, or Snohomish County — the populous ones — read our
page as **not covered** when they are. Now carries all 25 distinct counties plus the
tribal-nation count. Same fix applied to the WA row in `disaster-archive.json`, which had
the identical gap.

Also expanded HI-2026-01's `affectedReturns`, which listed only individual /
payroll-excise / estate-gift / tax-exempt. The release's section 7508A paragraph also
names corporate, S corporation, partnership, and estate & trust returns and postpones
estimated payments. IRA/HSA is genuinely absent from the HI release, so `retirement-hsa`
stays off.

## Changed

- `apps/marketing/src/lib/disaster-notices.ts` — header comment documents the
  update-banner rule; WA `affectedArea` completed; HI `affectedReturns` expanded to nine
  categories; per-entry comments record what was verified on 2026-07-27 and why.
- New optional `affectedAreaShort`, used by `getNoticeMeta` for the meta description only.
  Spelling WA's 25 counties out in full pushed its SERP description past 400 chars; the
  short form ("25 Washington counties and 25 tribal nations") brings it to 269, in line
  with its siblings, while the page body, H1, and JSON-LD keep the full county list. Every
  notice description is over ~155 chars — that is pre-existing and untouched here.
- `outreach-kit/disaster-notices.json` — same WA area + HI forms changes, kept in parity
  with the `.ts` (verified: zero deadline/label mismatches across all eleven codes).
- `apps/marketing/src/lib/disaster-archive.json` — WA-2025-03 area completed.

No deadline value changed from what was committed before this pass. All eleven notices
are live as of today; WA-2025-03 (Aug. 5) is the nearest, nine days out.

## Downstream copies still carrying the old WA area

These repeat the nine-county phrasing and are CPA-facing if reused. Not edited here —
dated artifacts, and the society/LinkedIn kits need a copy decision, not a find-replace:

- `docs/marketing/society-distribution-kit-2026-07.md` (WA §; its "release updated from
  May 1" note was correct)
- `docs/marketing/linkedin-post-kit-2026-07.md` ("nine Washington counties")
- `docs/marketing/alert-email-preview.html`, `outreach-kit/digests/digest-2026-07-16.*`
  (historical renders)

## Monitor scope note

Also worth recording for the monitor itself: WA-2025-03 was issued off **EM-3629**, an
emergency declaration with no Individuals & Households designation. IRS relief can and
does follow an EM, so "EM, therefore no IRS notice" is not a safe inference — TX EM-3649
stays a live watch item rather than a dismissed one.
