# Import + onboarding critique — 5 priority fixes (2026-06-12)

Worked through all five priority recommendations from the import-flow +
onboarding critique.

## #1 Reconcile the two steppers (the headline IA fix)
Onboarding ran "STEP 1–2 OF 3" dots, then handed off to `/migration/new`
where the dots vanished and the wizard showed its own 4-step pill stepper —
so the promised "3" never resolved. `migration.new.tsx` now renders an
`OnboardingStepDots` (visual twin of onboarding's `StepDots`) reading
**"Step 3 of 3"** above the activation intro whenever `source=onboarding`,
threaded through all three `MigrationActivationIntro` call sites via a new
`showOnboardingProgress` prop. The wizard's 4 pills are now legible as the
SUB-progress of onboarding step 3, in a deliberately different indicator
style (dots = journey, pills = sub-process). The "3" is fixed even when
rule-review auto-skips, matching onboarding's own fixed 3-count model.

## #2 Stepper labels → user outcomes
`Stepper.tsx`: Intake / Mapping / Normalize / Dry run →
**Upload / Match columns / Check values / Confirm**. "Normalize" had no CPA
model and "Dry run" read as risky; the body copy was already plain
("Ready to import"), so labels now match it. "Check values" ≠ the final
"Confirm" — distinct, no overlap.

## #3 Define "source-defined calendar" once
The term leaked unglossed in `rule-review-prompt.tsx` (×2). Both now use the
plain phrasing the state-selector already used: "This state publishes its
own filing calendar — confirm it before deadlines generate." / "{codeList}
publish their own filing calendars, so they need your eyes…".

## #4 Jargon leaks (NOT the capability badge)
On closer read the Step-2 four-way capability badge (AI Mapper / Matched by
name / Import template / Manual mapping) is one-at-a-time and genuinely
informative — gutting it would violate demote-don't-delete, so it stays.
Fixed the real leaks instead:
- Step2 data-type hint "Entity type · enum" → "· category"
- Step3 chip "Default Matrix · N" → "Tax type defaults · N" (matches the
  card it summarizes)
- SuccessModal "Roll back this import…" → "Undo this import…" (matches the
  button beside it + the word used everywhere else)

## #5 State-grid tile size
`state-rule-activation-selector.tsx`: tiles 28→32px (`size-7`→`size-8`),
label 10→11px. Still below the 44px touch ideal (the geographic 11-col grid
caps tile size), but materially more readable/tappable; 11 cols × 32 + gaps
fits the onboarding card width at every breakpoint. A list fallback for
narrow/touch remains a future option, not done here.

## Verification
tsgo clean (excluding the parallel session's in-flight AlertDetailDrawer +
router WIP). All 5 edits grep-confirmed present. Catalogs regenerated;
zh-CN filled (14 strings, ~6 mine + the parallel session's). Strict compile
green. Live-verifying the onboarding stepper wasn't possible in the seeded
env — `/migration/new` redirects to /today once a firm is set up — so #1/#2
are statically verified (render path is a straightforward conditional);
eyeball on next real onboarding run.
