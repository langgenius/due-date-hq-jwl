# Felt-state + grouping + spacing critique

> Login + onboarding through the _interfaces-that-feel_ (emotional legibility),
> _law-of-common-region_ (grouping), and _spacing-system_ lenses, plus a full-app
> systemic sweep for the same three. _2026-06-18._ Verdict up front: these flows
> are already in strong shape — the prior two audits + deliberate care covered
> most of it. This pass found **one** genuine refinement and, importantly,
> verified-and-rejected three plausible-but-wrong sweep findings.

## Login + onboarding — what already works (felt-state)

Credit where due — the emotional design is largely right:

- **Errors are blame-free + own the system.** "Couldn't send the code", "Couldn't
  verify the code" (owns it), "Enter a valid email" (directive, not accusatory).
- **The send has a confirmation state**, not a void — the form swaps to "Code sent
  to `you@firm.com`" with a Change affordance.
- **Setup defers friction.** Practice setup pre-fills everything but the name, and
  says "you can change any of this later" — anxiety lowered.
- **The win is celebrated, not absorbed.** Import success is a full modal (green
  hero, "N clients imported", live 24h-undo countdown, "you control every send")
  — not a silent toast. Textbook celebration arc.
- **Empty states are invitational** — the first-run `/today` hero + the
  clients-but-no-rules nudge (built earlier today) tell the user what belongs here.
- Copy voice is contextual, not tutorial ("what you can do", not "how to use").

## Applied: one refinement

**Login OTP — soft handoff on send.** The email field → code field was an instant
in-place swap. Added a gentle rise (`animate-in fade-in slide-in-from-bottom-1
duration-200`, reduced-motion safe) so the code screen reads as "your code is on
its way" rather than a hard cut — the one motion-with-intent gap in the flow.
(login.tsx, the `codeSent` form.)

Also folded in from the prior pass: the auth control radius (→ `rounded-xl`) and
the de-densified `ProductStory` (see `2026-06-18-login-polish`).

## Common-region + spacing on login/onboarding

Well-grouped: form fields bind to labels/errors via `FieldGroup`; the login card
regions sign-in methods (social → divider → email) cleanly; the SuccessModal
regions hero / stats / undo / next-steps with borders. Within-row form columns
(`gap-4`) are tighter than between-row (`gap-5`) — correct proximity. No action.

## Full-app sweep — verified, mostly rejected

A systemic sweep proposed several findings; on verification the three "High" ones
were false positives. Recording them so they aren't "fixed" wrongly later:

- **REJECTED — "form grid `gap-4` → `gap-5`" (claimed inverted hierarchy).** The
  opposite: `FieldGroup` is `gap-5` between rows, the grid is `gap-4` within a row,
  so row-columns are already tighter than between-row — correct proximity. Raising
  it would _break_ the grouping.
- **REJECTED — "daily-brief pending has no Generating label."** It does
  (`<Trans>Generating</Trans>`, daily-brief-card.tsx); the flagged line was the
  collapsed tab, where it's intentionally an icon-only chip.
- **REJECTED — "merged-brief skeleton `py-2.5` ≠ loaded `py-4` (reflow)."** The
  loaded `BriefTableRow` is _deliberately_ `py-2.5` (its comment explains: two-line
  stacked cells already carry height) and the skeleton correctly matches it. No
  reflow.

Residue (marginal, deferred): a couple of `py-1.5`/`py-2.5` half-steps in
`ClientDetailWorkspace` panel headers, and a "Calculating"→"Getting the tax
estimate" copy nudge in `panels.tsx`. Low-impact, gated surfaces; not worth a
churn pass.

## Verdict

The emotional/grouping/spacing dimension is in good shape. The lasting value of
this pass is the OTP handoff refinement + a documented record that the
"obvious-looking" spacing/grouping flags here are deliberate, not bugs.
