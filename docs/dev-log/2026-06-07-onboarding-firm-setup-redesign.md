# Onboarding firm setup — full redesign (Pencil E76U6Q)

Date: 2026-06-07

Implements the multi-step onboarding redesign (`E76U6Q`) that the
`2026-06-07-cluster6-rollover-onboarding` log had deferred to design review.
The user has since explicitly approved superseding the documented single-page
400px form with the new ~680px stepped layout. This replaces the structure and
visuals only — all submit/mutation wiring, validation, and the
`StateRuleActivationSelector` sub-component are preserved.

## Shipped

### `apps/app/src/routes/onboarding.tsx` — restructured

- Container widened from `max-w-[400px]` to `max-w-[680px]`, matching the design's
  680px form frame.
- **Header row**: `DDHQ` logo chip (`size-8`, `rounded-lg`, `bg-text-primary`,
  white mono label) + `DueDateHQ` brand, with a right-aligned **step indicator**
  (`StepIndicator`, Practice → Rules → Clients). Step 1 is active (accent-solid
  numbered dot); steps 2/3 are muted with `divider-regular` borders and 24px
  connector lines. Steps 2/3 reflect the real continuation: `handleSubmit` already
  navigates to `/migration/new` (the importer) after firm creation.
- **Centered heading block**: "Set up your practice" (28px/600, -0.5px tracking)
  + tertiary subtitle, per the canvas copy.
- **Form card**: white `rounded-[14px]` surface, `border-divider-subtle`, responsive
  padding (`p-5 sm:px-7 sm:py-[22px]`), `gap-4`. Each field uses a new `FieldHeaderRow`
  (label 13px/600 on the lead edge, muted 11px hint on the trailing edge) mirroring
  the design's label/helper split.
- Field order matches the design: Practice name → two-column row
  (Monitoring start date | Internal deadline offset, `grid-cols-1 sm:grid-cols-2`)
  → Time zone → Jurisdictions (the `StateRuleActivationSelector`, reused unchanged).
- **Footer row**: muted terms/explainer text + solid accent submit button
  "Create practice · activate jurisdictions" with trailing `arrow-right`
  (was "Continue" with a chevron). Loading + disabled/aria-busy behavior preserved.

### Timezone field — now wired (was hardcoded)

- The design surfaces a Time zone field; the old form hardcoded
  `America/New_York`. Wired the existing `FirmTimezoneSelect`
  (`apps/app/src/features/firm/timezone-select.tsx`) + `resolveUSFirmTimezone`,
  driven by the real `USFirmTimezone` contract enum. `monitoringStartDate`'s
  "today" floor now follows the selected timezone.
- `routes/onboarding-firm-flow.ts`: `activateOrCreateOnboardingFirm` gained an
  optional `timezone?: USFirmTimezone | undefined` param (defaults to
  `America/New_York` when omitted), passed through to `gateway.create`. No
  contract/server change — `FirmCreateInput.timezone` already existed.

## Preserved logic (unchanged behavior)

- `handleSubmit` validation (name length, offset range, future-date guard),
  mutation wiring (`switchActive` / `create` / `activateOnboardingJurisdictions`),
  query invalidation, `postOnboardingTarget` redirect, toast on failure.
- `StateRuleActivationSelector` reused as-is (its own tests cover it).
- Loader (`onboardingLoader`) and routing untouched.

## Notes / compromises

- The canvas mode ("Verdant" green/cream) is canvas-only; mapped onto existing
  light/dark tokens (`state-accent-solid`, `text-primary`, `divider-*`,
  `background-default`) per project rules. Card body uses `bg-background-default`
  rather than a literal `#ffffff`.
- The selector keeps its own internal header ("State rule coverage (optional)")
  and `mt-5` top margin since it must be reused unchanged; the design's separate
  "Jurisdictions to monitor" label/summary line is therefore served by the
  selector's existing copy rather than a duplicated header.

## Verification

- `npx tsgo --noEmit -p apps/app` → 0 errors.
- Tests: `state-rule-activation-selector` + `onboarding-firm-flow` + `router` →
  68 passed. No dedicated `onboarding.tsx` DOM test exists, so none needed updating.
- `npx vp check` → 0 errors (file contributes 0 warnings).
