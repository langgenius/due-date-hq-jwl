# disaster-notices.ts refresh — 6 → 11 verified live notices (2026-07-14)

Refreshed the IRS disaster-relief database that powers `/irs-disaster-relief` (hub + `[slug]` pages).

- Rebuilt via 7 parallel research agents, each transcribing from the official irs.gov release
  (hard red line: nothing invented). Every entry carries a `Verified 2026-07-14` comment + `sourceHref`.
- **6 → 11 live** (deadline on/after 2026-07-14): removed expired MO-2025-03; added LA-2026-02,
  MS-2026-02, WI-2026-02, MI-2026-02, MT-2026-03 (Fort Peck), MT-2026-04 (Crow); re-verified
  AZ-2026-01 / GA-2026-03 / HI-2026-01 / WA-2025-03 / NMI-2026-01 (deadlines unchanged).
- **Bug fix:** WA-2025-03 previously under-listed affected returns as 4 types; the IRS release covers the
  full business-entity set (1120 / 1120-S / 1065 / …) — corrected and re-confirmed against the release.
- HI deadline conflict resolved: current deadline is **Aug 20, 2026** (release updated from the URL's July 8).
- `tsc` clean.

Same verified data also drives a new per-state disaster **alert email** in the outreach kit
(`send-outreach.mjs --alert`), committed on the outreach worktree branch — see
`disaster-alert-email-and-notice-db-2026-07-14.md`.
