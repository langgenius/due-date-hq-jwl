# Today Monitoring Scope Copy

## Context

The Today Alerts header used `Monitoring 52 jurisdictions`. The count was correct, but ambiguous:
it meant Federal + 50 states + DC, not 52 states or a raw source/adapter total.

## Change

- Updated Today and `/rules/pulse` to render `Monitoring Federal + 50 states + DC`.
- Kept the coverage source tied to `MVP_RULE_JURISDICTIONS` so the chip still disappears if the
  coverage list is unavailable.
- Updated the Pulse roadmap wording that named the old visible example.

## Design / Docs

No `DESIGN.md` token or component update is needed. This is a copy-only clarification using the
existing status pill treatment.
