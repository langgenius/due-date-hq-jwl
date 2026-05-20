# 2026-05-20 · Client Add Facts Filing Jurisdictions Target

## Summary

Fixed the missing-facts `Add facts` action on Client detail so it targets the actual place where the
missing filing state is edited.

## Shipped

- Converted the alerts-band `Add facts` affordance from a same-page link into a local button.
- Clicking `Add facts` now opens the `Filing jurisdictions` collapsible and scrolls it into view.
- Added a warning-tinted border/background to the `Filing jurisdictions` section when the client is
  missing filing state, so the required input target is visible even before the user clicks.
- Extended the shared Client detail `DetailSection` wrapper to support controlled open state,
  section ids, and attention styling while keeping existing uncontrolled sections unchanged.
- Removed the extra read-only `No filing jurisdictions on file yet` / `Edit` layer inside
  `Filing jurisdictions`; expanding the section now shows the filing-state inputs immediately.

## Design / Docs Alignment

- This resolves the open follow-up noted in `2026-05-19-clients-detail-alerts-band-stage-3d.md`:
  the missing-facts CTA now deep-links behaviorally into `Filing jurisdictions` instead of
  navigating back to the same client page.
- No `DESIGN.md` update required; the change reuses existing warning surface tokens and the existing
  collapsible section pattern.

## Validation

- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- Playwright could not validate the authenticated page interaction because a fresh browser context
  is redirected to login and cannot reuse the current Codex in-app browser session.
