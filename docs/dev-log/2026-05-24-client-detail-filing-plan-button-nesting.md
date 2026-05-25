---
title: 'Client detail filing plan button nesting fix'
date: 2026-05-24
area: client-detail
---

# Client Detail Filing Plan Button Nesting Fix

Fixed a React DOM nesting warning on the client detail Work tab. Filing plan rows use the
form-code cell as the keyboard-open target, so that cell is a real `<button>`. The nested
`TaxCodeLabel` tooltip trigger now renders through `asChild`, matching the existing dashboard
and summary-strip pattern where a tax-code tooltip sits inside another clickable surface.

No `DESIGN.md` update required: this preserves the existing filing plan behavior and only
corrects the HTML semantics for the tooltip trigger.

## Validation

- `pnpm exec vp check apps/app/src/features/clients/ClientFactsWorkspace.tsx docs/dev-log/2026-05-24-client-detail-filing-plan-button-nesting.md`
- `git diff --check -- apps/app/src/features/clients/ClientFactsWorkspace.tsx docs/dev-log/2026-05-24-client-detail-filing-plan-button-nesting.md`
- Browser smoke on `http://localhost:5173/clients/13000000-0000-4000-8000-000000000005`:
  Pacific Trust Work tab rendered, `document.querySelectorAll('button button').length === 0`,
  the `Open Form 1041 due 2026-04-01` button opened the obligation drawer, and console
  warn/error logs were empty.

`pnpm --filter @duedatehq/app exec tsc --noEmit --pretty false` is still blocked by an
unrelated pre-existing staged test error in `ClientPeekHoverCard.test.tsx` where
`QueryClient | null` is passed to a `QueryClient` prop.
