# Payment Due Badge Width

## Context

In the deadline drawer key-dates strip, the payment tile rendered the late badge as
`Payment 75 days late`. The filing and internal target badges rendered shorter text such
as `74 days overdue`, so they fit beside the date while the payment badge wrapped to a new
line.

## Change

- Removed the redundant `Payment` prefix from the payment tile overdue badge.
- The tile label already says `Payment due`, so the badge now reads `75 days overdue`
  and aligns with the other key-date badges.

## Verification

- Browser route to verify: `/deadlines/108697e79686/readiness`.
