# Risk profile Smart Priority help

**Date:** 2026-05-26
**Branch:** `main`
**Scope:** Client detail `Client info` risk profile heading

Yuqi flagged that the `Risk profile` section needed a question-mark help affordance explaining why
the inputs matter.

## What changed

`apps/app/src/features/clients/ClientFactsWorkspace.tsx`:

- Added a reusable `titleAccessory` slot to the client-detail `TabSection` heading primitive.
- Added a question-mark tooltip next to the `Risk profile` heading.
- The hover/focus tooltip explains that Risk profile feeds Smart Priority and that importance plus
  recent late filings make this client's deadlines rank higher in work queues.

## Documentation alignment

No DESIGN.md change needed: this reuses the existing tooltip affordance and does not introduce a new
section pattern.

## Verification

- `pnpm --dir apps/app exec tsc -p tsconfig.json --noEmit`
- `git diff --check`
- Browser QA on `http://localhost:5173/clients/hanxujiang?tab=info` — the `Risk profile`
  heading now has a question-mark help trigger with the Smart Priority explanation in its title
