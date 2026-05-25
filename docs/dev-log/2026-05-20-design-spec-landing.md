# 2026-05-20 · DESIGN.md spec landing pass

## What changed

- Landed shared primitive updates for the current DESIGN.md contract: buttons and form controls now use 36px default height, 6px radius, and 2px focus-visible rings with offset; dialogs and alert dialogs use the modal radius/shadow cap; tooltips default to 400ms.
- Repainted warning/severity-medium tokens from amber to the peach/coral warning palette in DESIGN.md and runtime semantic tokens.
- Removed the table primitive's horizontal-scroll wrapper and replaced remaining workbench table min-width patterns in Dashboard, Rules preview, Pulse, and Client facts surfaces.
- Renamed user-facing home destination copy from Dashboard to Today across sidebar, command palette, billing, onboarding activation, permission fallback, and 404 recovery.
- Added the shared export modal pattern to Obligations with What / Format / Recipient axes, plus server support for filtered/all-active export scopes and `.ics` downloads.
- Kept export email recipients visible but disabled until the backend has an email delivery job for generated exports.
- Added signed destructive-change previews for import recovery and member removal.
- Removed the remaining app `useEffect` violations from Obligations row scrolling and Rules coverage review shortcuts.
- Added global invisible-correctness CSS for selection, caret, scrollbars, link underline metrics, tap highlight, anchor margin, number inputs, and print links.

## Validation

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm design:lint`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @duedatehq/server build`
- `pnpm exec playwright screenshot --wait-for-timeout=3000 http://localhost:5173/ tmp-design-smoke-home.png`
