# 2026-05-27 · Sidebar identity and Deadline sort

## Context

Browser feedback on `/deadlines?sort=due_desc` flagged two issues:

- The sidebar top practice control still exposed a practice-switching action.
- Clicking `Internal Due` while already sorted descending cleared back to Smart Priority, which made the column sort feel broken.

## Changes

- Replaced the sidebar practice switcher trigger with a static current-practice identity row. The sidebar no longer renders the `Practices` popover, `Add practice`, chevron, or `Mod+Shift+O` switcher hotkey.
- Updated `Internal Due` header sorting to toggle directly between `due_asc` and `due_desc` instead of cycling through Smart Priority.
- Reset local pagination to page 1 when changing the queue sort.
- Added focused coverage for the new header-sort cycle.
- Updated design, architecture, billing, and user-manual docs so they describe static practice identity rather than a visible switcher.

## Validation

- `pnpm --filter @duedatehq/app test -- obligations.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check` — passes with existing warnings in unrelated files.
- Playwright localhost smoke: demo-login to `/deadlines?sort=due_desc`, verified no `Switch practice` button is present and clicking `Sort Internal Due` changes the URL to `?sort=due_asc`.
