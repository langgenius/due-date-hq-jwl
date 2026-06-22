# Marketing home — copy accuracy pass (overclaim + severity fixes)

**Date:** 2026-06-22 · `apps/marketing/src/components/home/{Hero,Sources}.astro`. Copy audit against the positioning source-of-truth (`docs/marketing/unique-selling-points.md`). For a brand whose pitch is glass-box honesty, overclaims are the worst kind of copy bug — fixed the ones the USP doc explicitly bans.

## Fixes

- **"all 50 states" overclaim → fixed.** The USP doc is explicit: live monitoring = IRS + major state tax agencies (CA/NY/TX/FL/WA/MA) + FEMA nationwide; "50 states + DC" is the _separate rule-coverage_ axis (review-gated), and you must not say "watches all 50 states." The Hero conflated them in two places:
  - Point 1: "We watch the IRS, all 50 states & FEMA" → "…the IRS, major state agencies & FEMA".
  - Subhead: "We watch every IRS and state source" → "We watch the IRS, the major state tax agencies, and FEMA — and the moment a date moves, you see exactly which clients it hits." (Also tightened to one clean benefit sentence + sharper verb "hits".)
  - (Sources already framed the two axes correctly; left it, only changed its "52/52 watched" → "covered" since the bar is the coverage axis.)
- **Invented "HIGH" severity → fixed.** The doc bans invented "critical/high"; real severities are urgent / informational / resolved. The hero Alerts mock used URGENT + HIGH + HIGH → now URGENT + INFO + INFO (disaster postponement = urgent; the FTB extension and the new TX obligation = informational). Side benefit: one calibrated red instead of a wall of red/amber reads as a more trustworthy, calibrated product.

## Verification

Build 74 pages 0 errors. Live `/`: point 1, subhead, and URGENT/INFO/INFO badges render; INFO badge is a calm neutral. The rest of the copy audit (hierarchy, CTA, marketing) is reported separately to the owner; these were the unambiguous accuracy P0s applied directly.
