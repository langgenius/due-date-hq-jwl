# /deadlines detail — header parity with /alerts detail

Date: 2026-06-08

Yuqi: the deadline detail view is "still very different to what we have on the
alerts detail page." First parity pass aligns the header's shared elements to
the alerts detail (AlertDetailDrawer) vocabulary.

## Changes (ObligationQueueDetailDrawer.tsx)

- **Dropped the mono `obligation_id`** from the status line. The alerts detail
  exposes no internal id; a raw db id in monospace was noise + a mono-restraint
  violation.
- **Title scale** `text-2xl leading-tight` → `text-[22px] font-semibold
leading-[1.25] tracking-[-0.4px]` — identical to the alerts detail H2.
- **Jurisdiction** → the canonical StateBadge treatment: seal (16px) + bold mono
  code + full jurisdiction name inline (was a plain bordered text chip with no
  seal). Same as the alerts detail header, the alert rows, and the /today card.

## Not yet aligned (larger / domain-specific — flagged for follow-up)

- The alerts detail's thin colored status banner vs the deadline's inline status
  line; the FILING/INTERNAL/PAYMENT metric cards' chrome; the status stepper
  (deadline-only). These are bigger structural calls — pending direction.

## Verify

tsgo clean; `/deadlines` detail at 1512×861 — no obligation_id, 22px title,
"FED Federal" seal chip rendering correctly.
