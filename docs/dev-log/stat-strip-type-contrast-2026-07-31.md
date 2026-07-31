# StatSummaryStrip — Stripe-style size contrast on numerals (2026-07-31)

Yuqi shared a Stripe dashboard screenshot: "这种大大小小的字体大小搭配就很合适,
并且很容易阅读。你可以提升 duedatehq 的吗" — hierarchy carried by SIZE mixing,
not weight.

Audit of where DueDateHQ already had the grammar vs where it was flat:

- **Already Stripe-shaped, no change**: page titles (`text-2xl`/28 + muted
  date), `StatBand` (CAPS eyebrow + 24px `text-stat-value` numeral + small
  sub), `/clients` portfolio cards ("152 **days late**" big-numeral rows).
- **Flat**: `StatSummaryStrip` — the compact one-line summary used by
  `/deadlines`, `/clients`, `/rules/library`, `/workload`, and the client
  facts workspace rendered numeral and label at the same `text-sm`, split
  only by weight (`font-medium` vs tertiary color).

Change (one shared primitive, all five surfaces together): the strip numeral
is now `text-lg` (16) against the label's `text-sm` (14), baseline-aligned so
the strip keeps its one-line ~24px height — size does the hierarchy, weight
stays restrained per `feedback_type_weight_restraint`. Verified live on
`/deadlines` and `/clients` (seeded e2e firm).

Deliberately NOT changed: `text-stat-value` stays 24 (Yuqi's 2026-06-10
densify call), the strip's zero-drop and interaction contract, and the
sentence-case band grammar.
