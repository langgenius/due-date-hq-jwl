# Onboarding practice-setup clarity + login left-alignment (2026-07-31)

Closes three deferred clarity items from the 2026-05-26 UX flows audit (step 6,
`docs/dev-log/2026-05-26-step-6-ux-flows-audit.md:84`, `:90`) and the step-7
onboarding audit's ConceptHelp proposal, all on the `/onboarding` practice-setup
step.

## What shipped

1. **Live internal-deadline-offset preview** — the offset input now shows a
   worked example under the field that recomputes as the value changes:
   "Example: a filing due Apr 15, 2027 lands on your list as due Apr 1, 2027."
   Zero-offset gets its own sentence ("stays due … on your list"); out-of-range
   values hide the preview (submit validation still owns the error). Date math
   lives in `features/onboarding/offset-preview.ts` (`exampleFederalDueDate` =
   next April 15 on/after the firm-timezone today; `workingDueDate` = ISO twin
   of core's `internalDeadlineFromBaseDueDate`), unit-tested in
   `offset-preview.test.ts`. The example is anchored on April 15 as a familiar
   reference date, phrased as an example — not a claim about any specific
   year's statutory (weekend/holiday-shifted) deadline.

2. **ConceptHelp for the offset** — new `internalDeadlineOffset` concept in
   `features/concepts/concept-help.tsx`, surfaced beside the field label via a
   new optional `help` slot on `FieldHeaderRow`. Copy verified against the
   implementation: the offset shifts `currentDueDate` (= `baseDueDate` −
   offset), which is what the list, reminder dispatch
   (`apps/server/src/jobs/reminders/dispatch.ts:411`), and urgency all key off,
   while the official date stays on record.

3. **CTA destination line** — a "Next:" line under the Create-practice button
   mirrors the submit handler's branch priority so the CTA never leads
   somewhere unannounced: social-alert intent → "the alert you came to see";
   pending source-defined-calendar states (client-side via the same
   `sourceDefinedCalendarReviewStates` source the selector's warning uses) →
   "a quick calendar review for N states, then import your client list";
   default → "import your client list — about 5 minutes" (the ~5 min figure
   matches `OnboardingSkipModal`).

4. **Login sign-in column left-aligned** (Yuqi direction, 2026-07-31) — the
   `/login` sign-in column (left) was the only centered entry surface while
   the onboarding heroes are all left-aligned. Brand lockup, heading, email
   label row, reassurance block, and residency line now left-align on the
   column axis; the stale "product story = left column" comments were fixed
   (sign-in is left, story is right). Verified at desktop and mobile widths.

## i18n

Six new messages extracted; zh-CN translated in the same pass (no placeholders,
strict compile green). "Alert" stays 「提醒」 per the existing catalog vocabulary.

## Not done here

- Per-jurisdiction rule counts on the rule-review prompt still await an
  activation-summary contract (`rule-review-prompt.tsx:19` TODO(data)).
- The measurement funnel (activation rate / time-to-activation / drop-off)
  remains open — event names are Govern-locked, so no new events were added.
- `/deadlines` and `/alerts` first-run empty states (audit gap #6) remain a
  separate surface-level task.
