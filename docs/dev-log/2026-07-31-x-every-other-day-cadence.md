---
title: 'X automatic publishing every other day'
date: 2026-07-31
area: alerts
status: implemented
---

# X automatic publishing every other day

## Outcome

The normal X scheduler now leaves one empty ET calendar day after every occupied automatic publish
slot. If a Post runs today, tomorrow's 09:00 ET branch pauses and the next eligible automatic slot
is the day after tomorrow.

The 30-minute Worker Cron and 09:00 ET wall-clock window are unchanged. Cadence is derived from the
durable `social_publish_run` ledger, so deploys and Worker restarts do not reset it. An explicit
operator `publish-now` remains an exception, but its occupied date also prevents the next day's
automatic branch from publishing.

## Queue and draft review

- The read-only queue preview projects `ready` Posts two calendar days apart and reports
  `cadenceDays: 2`.
- `nextAutomaticLocalDate` identifies the earliest eligible automatic slot. After today's slot is
  occupied, this is the day after tomorrow rather than tomorrow.
- Automatic draft comments use that date as the earliest post-approval slot. The date remains a
  projection, not a reservation; drafts still require explicit approval.
- Existing approved bot comments are refreshed when a queue position or tentative date changes;
  exact matching bodies remain idempotent, and published markers remain terminal.
- A failed, unknown, or draft-only run continues to consume its date and now also creates the
  one-day automatic pause. This preserves the existing safety rule that an uncertain attempt does
  not trigger a faster replacement.

## Validation

- Scheduler coverage verifies that the previous day's occupied run pauses claim and replenishment.
- Queue preview coverage verifies two-day spacing, occupied-date cooldown, and the
  today-to-day-after-tomorrow example.
- Social Ops route and GitHub mirror coverage verify the new cadence metadata and earliest
  automatic slot copy.
