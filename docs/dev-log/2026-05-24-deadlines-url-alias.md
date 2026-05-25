# 2026-05-24 - Deadlines URL alias

## What changed

- Made `/deadlines` the canonical route for the Deadlines queue.
- Made `/deadlines/calendar` the canonical Calendar sync route.
- Kept `/obligations` and `/obligations/calendar` as legacy redirects that preserve query params.
- Updated app navigation, command palette entries, keyboard shortcuts, workload/client/reminder deep links, and E2E expectations to use `/deadlines`.

## Notes

- Code identifiers, route component filenames, contracts, and database/API model names still use `obligation`.
- This is URL and navigation cleanup only; it does not rename the underlying obligation model.
