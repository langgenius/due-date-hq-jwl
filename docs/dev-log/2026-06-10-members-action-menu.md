# Members action menu

- Removed the duplicate `Change role` submenu from each member row's `...` menu; role changes stay in the dedicated Role column control.
- Updated the Active members helper copy to point users to Role for access changes and `...` for suspend/remove actions.
- Added a members page test that opens a mutable member's action menu and asserts `Suspend access` / `Remove from practice` remain while `Change role` is absent.

Validation:

- `pnpm --filter @duedatehq/app test -- --run src/features/members/members-page.test.tsx`
- `pnpm --filter @duedatehq/app exec tsc --noEmit --pretty false`
- `pnpm --filter @duedatehq/app i18n:compile` still fails on existing `zh-CN` catalog gaps, now 174 missing after this change's new string was translated.
