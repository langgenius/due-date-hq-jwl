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

## Residue pass — "fix all"

Went back through the deferred residue. Two were real and are now fixed; two more
"residue" items turned out to be canon-correct (the sweep mislabeled them, again):

- **FIXED — `panels.tsx` "Calculating the tax estimate".** This fires for the
  `estimate_needed` payment state — an _awaiting-input_ state (its peers say
  "Awaiting client approval…", "Payment scheduled…"). "Calculating" implies the
  system is actively computing when nothing is — a no-fiction violation, not just a
  tone nudge. Now **"Tax estimate needed"** (status line) / **"Estimate needed"**
  (short label), matching the honest peer voice.
- **FIXED — login security messaging de-duped.** Expiry ("links expire in 10
  minutes") appeared in both the left trust strip and the form note; data-residency
  appeared in both the strip and the footer. Each fact now has one home: expiry → the
  form note (point of action), residency → the strip, "Hosted in US-East" → the
  footer (pure residency, paired with the ISO line). Dropped the now-unused
  `MailCheckIcon` import.
- **NOT A BUG — `ClientDetailWorkspace` `py-1.5`/`py-2.5` header bands.** These
  _match_ `detail-section-card`'s two canonical header variants (`min-h-8 py-1.5`
  compact / `min-h-9 py-2.5` primary). They're the canon, not off-scale jank.
  Changing them to `py-2` would _break_ the alignment. Left as-is.
- **NOT A BUG — `SuccessModal` outer `rounded-lg`.** Matches the Dialog primitive
  default (`rounded-lg`). Canon-correct. Left as-is.

### Deferred — needs a design decision (not a blind fix)

`BadgeStatusDot tone="info"` uses a raw `bg-violet-500` (the one raw-palette icon
color left). Routing it to a token isn't mechanical: the dot is used _generically_
(e.g. members' pending-invite, not only waiting-on-client), and violet now also
means `review` (`--status-review`), so a shared violet would collide two semantics.
Resolving it means picking a distinct hue/token for the info/pending dot — a real
call, parked rather than guessed. See [[project_review_color_canon]].

## Verdict

The emotional/grouping/spacing dimension is in good shape. The lasting value of
this pass is the OTP handoff refinement, two honest residue fixes (no-fiction copy +
de-duped security), and a documented record that the "obvious-looking"
spacing/grouping/radius flags here are deliberate canon, not bugs.
