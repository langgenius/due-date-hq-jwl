# 2026-07-22 — Full state names in X Alert copy

## Context

The first live X Alert proved the OAuth, daily ledger, Queue, and landing-link path. Its public header
used two-letter state abbreviations. Future scheduled Posts should use full state names while keeping
official form identifiers and analytics attribution stable.

## Change

- Derived the public state-name mapping from the existing `STATE_RULE_SOURCE_SEEDS` catalog.
- Expanded state codes in the public agency and jurisdiction header fields before weighted-length
  truncation.
- Left state codes inside form identifiers and `utm_content` unchanged.
- Kept the normal live path on the existing 09:00 ET daily slot; immediate publishing remains an
  operator-only exception.
- Moved candidate draft refresh outside the 09:00 ET claim gate so the existing 30-minute Cron makes
  new drafts available for review before the next daily slot. Only `ready` Posts can still publish.

Already published X Posts are intentionally unchanged. Existing drafts are rebuilt with the current
deterministic template when an operator approves them.

Before rollout, the production outbox was checked for frozen legacy copy: it contained one
`published` Post and one `cancelled` Post, with no `draft`, `ready`, `scheduled`, or `unknown` rows.
