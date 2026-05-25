# 2026-05-21 · Onboarding State Rule Activation

Onboarding now includes a state tile map under `Practice name`. The map starts
with every state unselected; selected states are used only during first practice
creation to bootstrap Rules Library coverage.

## What Changed

- Added an onboarding-specific state selector with the migrated tile-grid US
  layout, fixed-size state buttons, `aria-pressed`, and selected-state chips.
- Added a select-all control so practices can activate every state in one
  action.
- Made the select-all control a toggle: when every state is selected, clicking
  it clears the map back to zero selected states.
- Removed the selected-state chip strip so large selections stay visually
  quiet; each state tile now shows the full state name in a tooltip.
- Reduced the state-map tooltip delay to 100ms so the full state name appears
  quickly on hover.
- Extended the onboarding firm flow so a newly created practice activates rules
  for `FED + selected states`. Empty state selection is allowed and skips rule
  activation.
- Added `rules.activateOnboardingJurisdictions`, a dedicated bootstrap RPC that
  activates matching non-deprecated templates with concrete due-date logic and
  queues `source_defined_calendar` templates as pending due-date review before
  they can generate obligations.
- Added a post-onboarding activation prompt on `/migration/new` when selected
  jurisdictions include source-defined rules; the prompt links to Rule Library's
  pending-review rule list.
- Added a create-practice hint directly under the state map when selected states
  include `source_defined_calendar` rules, so users know they must enter the
  product and review pending rules in Rule Library before those due dates can
  generate.
- Corrected accepted concrete-draft version handling so accepting one
  source-defined rule does not re-add the older template version to the pending
  review count.
- Changed onboarding source-defined rules to remain `pending_review`; they no
  longer inflate active counts or appear production-ready before CPA acceptance.
- Added active rules to the Coverage expanded jurisdiction detail, alongside
  pending rules and watched sources, with a due-date review chip for
  source-defined rules.
- Wrote `rules.onboarding_activated` audit metadata with selected states,
  activated jurisdictions, activation count, skipped count, review-required
  count, review-required jurisdictions, and generated obligation count.

## Validation

- `pnpm --filter @duedatehq/contracts test -- --run src/contracts.test.ts`
- `pnpm --filter @duedatehq/server test -- --run src/procedures/rules/onboarding-activation.test.ts`
- `pnpm --filter @duedatehq/app test -- --run src/routes/onboarding-firm-flow.test.ts src/features/onboarding/state-rule-activation-selector.test.tsx`
- `pnpm --filter @duedatehq/app test -- --run src/features/rules/coverage-tab.test.tsx`
- `pnpm --filter @duedatehq/app exec tsc --noEmit`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm --filter @duedatehq/app test -- state-rule-activation-selector.test.tsx`
- Playwright render check against local `/rules/library` with mocked rules RPC
  data: expanded California row showed active rules, pending rules, watched
  sources, and the source-defined due-date review chip.
- `pnpm test`
- `pnpm check`
- Playwright render check against local `@duedatehq/app` dev server with mocked
  auth session: `/onboarding` showed the state map between Practice name and
  Internal deadline, and selecting California set `aria-pressed="true"`.

`pnpm check` still reports the existing non-blocking lint/type warnings in
breadcrumb, kbd, obligations, rules library, current-user helper, and
obligation-queue files.
