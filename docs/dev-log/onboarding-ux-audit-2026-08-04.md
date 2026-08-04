# Onboarding & first-run UX audit — findings, fixes, open calls (2026-08-04)

Yuqi: "audit and critique. improve ux". Scope: the `/onboarding` funnel and
everything a brand-new firm sees until it has real deadlines on screen.
Walked live against a local dev server, every claim verified in code.

---

## P0 — the default path built a practice that generated nothing

**The single worst defect in the funnel.** The state selector on step 2 is
labelled "(optional)" and defaults to zero selected. Two layers then agreed to
do nothing at all:

- `apps/server/.../rules/index.ts` — `onboardingActivationJurisdictions`
  returned `[]` for an empty selection (`states.length === 0 ? [] : ['FED', …]`)
- `apps/app/src/routes/onboarding-firm-flow.ts` — skipped the activation call
  entirely when no states were picked

So a user who accepted the defaults and clicked **Create practice** got a firm
with **zero active rules, not even federal**. They then imported their client
book and generated **zero deadlines**. The product did nothing, silently.

Worse, the on-screen copy promised the opposite: _"Add state rules alongside
federal. **Start with federal only** and add states later."_ The one sentence
explaining the field described behavior that did not exist.

This was not an unknown state — `/today` carries a dedicated `needsRules`
branch ("clients but no active rules") whose only job is to catch firms in
exactly this condition. **The symptom had been given a designed empty state
while the cause went unfixed.** Both the server helper and its test asserted
the broken behavior as intended ("derives FED plus selected states _only when
at least one state is selected_").

**Fixed.** FED is now the unconditional baseline on both layers; the selector
is about _state_ coverage, and leaving it empty means "no extra states", never
"no rules". Both tests rewritten to assert the baseline. The UI now _states_
the guarantee instead of implying it — a green baseline row reading "Federal
rules are always included. 1040, 1120, 941, and the rest apply to every
practice." — so the "0/51" counter reads as "0 of 51 states" rather than
"nothing is set up". `includes_fed` analytics is now truthfully always `true`.

**Consequence worth knowing:** a new firm now activates **24 federal rules**,
of which **3 publish their own calendars** (`fed.payroll_deposit.monthly.2026`,
`fed.1120.estimated_tax.2026`, `fed.disaster_relief.watch`). So the conditional
rule-review interstitial — "1 jurisdiction needs a quick review" — now appears
on the default path too, where previously it never did. That is the right
trade: 21 rules activate immediately and start generating deadlines, the review
screen is skippable ("Skip and import clients first"), and the 3 flagged rules
genuinely need a CPA's eyes before they generate dates. The prior default was
not "faster" — it was a firm with no rules at all.

That consequence also required fixing the **"Next:" line under the Create
practice CTA** (shipped 2026-07-31 to stop the button leading somewhere
unannounced). It counted _selected states_ only, so with FED now always
review-bearing it would have promised "import your client list" and then
delivered a review screen — the exact failure it was built to prevent. It now
counts the federal baseline too, via a new `FEDERAL_NEEDS_CALENDAR_REVIEW`
derived from the same rule catalog rather than hardcoded, and says
"jurisdiction" rather than "state" since the count includes Federal. Verified
live: 0 states → "1 jurisdiction"; all 51 → "52 jurisdictions".

---

## P1 — "Skip for now" silently cost the user a paid plan

Step 1 pairs a promo badge with a questionnaire. Claiming grants the firm the
**Team plan, 10 seats, 3 months** (`FirmsRepo.grantTeamTrial`). Skipping grants
nothing, and there is no later point in the funnel to claim it.

Two problems compounded:

1. The skip link said **"Skip for now"** — which reads as _skip the questions_,
   not _decline three months of a paid plan_. The cost was never disclosed.
2. **The gate is fake.** Every field is optional, so clicking "Claim" with
   nothing filled in grants the trial exactly as if all three were answered.
   The two buttons therefore differ _only_ in whether the user gets a paid plan
   for free — and the cheaper-looking one is the trap.

**RESOLVED in round 2.** First pass only disclosed the cost ("Continue without
the free trial"), leaving the forfeit itself as a promo-economics call. Yuqi
took it: the trial is now granted on **both** paths, so the trap is gone rather
than merely labelled. See round 2 below for the resulting copy.

---

## P2 — fixed in this pass

**Pre-filled practice name is a mangled email domain.** `derivePracticeName`
title-cases the domain root: `jane@smithcpa.com` → "Smithcpa". It lands in a
required field whose hint ("required, 2+ characters") makes it look already
answered, so users tab straight past it and ship with the junk name. Now
selected on focus, so one keystroke replaces it.

**`/splash` told established firms to import their client book.** `needsClients`
lacked an `isError` guard, so a failed probe resolved to "0 clients" and showed
the accent "Next: import your clients" strip to a firm with hundreds. `/today`
already guards the identical probe this way; splash was missed.

**The first-run tour burned itself when it could not anchor.** If the sidebar
was collapsed or the user was on mobile, `measure()` failed and the code called
`markSeen()` — permanently. Anyone who signed up on a phone lost the product's
only orientation surface forever, including on later desktop sessions.
`SEEN_KEY` is now written only on a real finish or skip.

**The tour hijacked the first-run chooser.** Mounted unconditionally, it
auto-opened 650ms after `/today` painted — dimming the "Add your first work"
cards the page had just told the user to use, and ending on "Open Rule library",
which generates nothing for a firm with no clients. Now deferred until the firm
has clients (unmounted rather than skipped, so `SEEN_KEY` stays unwritten).

**Two competing setup checklists on screen at once.** The dashboard's
`SetupProgressCard` ("You're almost set up · 50% · Continue setup") and the
sidebar's `SidebarSetupCard` ("Finish setup · 50% · Continue") render the same
two steps from the same two queries, ~200px apart, under two different names.
The rail card now yields on `/today`, where the page owns the surface.

**The sidebar dismissal contradicted its own contract.** Its comment states
"NOT a permanent dismissal — a firm that hasn't finished setup will see it
again next session". It wrote `'1'` to **localStorage** under one global,
unscoped key: one ✕ killed the nudge forever, across every firm and every
account on that browser. Now `sessionStorage`, which is what the comment
always claimed.

**"Add a deadline" was a guaranteed dead end.** `CreateChoiceCards` renders at
exactly one site — the zero-client first-run branch — and a deadline requires a
client plus a matched _active_ rule. Verified live: the dialog opens with an
empty client picker and a permanently greyed submit. The card now states the
prerequisite ("Add a client first — every deadline belongs to one") instead of
spending the user's first click on an unsubmittable form.

---

## Round 2 — the four open items, all approved by Yuqi and shipped

**Day-one "All clear" is gone.** Added the missing fourth state: clients
imported and rules active, but nothing generated. `/today` now leads with a
banner — "No deadlines generated yet · Your active rules didn't match any client
yet — usually the jurisdictions or entity types don't line up, or the matching
rules are still awaiting review" + Open Rule library. Guarded on a resolved,
non-errored dashboard so a failed load never reads as "zero deadlines".
`MergedBriefCard` gained a `nothingGeneratedYet` prop in the same family as its
existing `isLoading`/`isError` guards, so the coffee celebration doesn't fire
underneath the banner and contradict it — the queue reads "No deadlines here
yet · Nothing has generated for your clients yet — see the note above."
**Reproduced live** (empty seed + one WY LLC that matches no active rule) and
verified before/after.

**`needsRules` no longer blanks the page.** It was replacing every section,
which unmounted firm-wide regulatory alerts that don't depend on rules at all —
a real alert could land while Today showed only a setup card. `SetupProgressCard`
now renders as a banner above the normal sections. Confirmed live: the alerts
section stays mounted alongside the banner.

**The `/deadlines` contradiction is fixed.** It asserted deadlines generate
"from the rules you activated" — claiming the rules step was done — while
`/today` in the same state said to go activate them. Now stated as a condition:
"Once your filing rules are active, we generate every deadline automatically."

**Coordinators get a real state instead of a dead page.** `client.write` and
`migration.run` are both `owner|partner|manager|preparer`, so a coordinator had
no enabled control anywhere on first run. They now see "Your practice hasn't
imported its client book yet" with what to ask for and why it matters to them,
instead of three greyed cards. `SidebarSetupCard` renders only steps the member
can actually complete — gated on `pulse.apply`, which is exactly the server's
`RULE_REVIEW_ROLES`, so a preparer is no longer pointed at a 403 — and returns
null when they can complete neither.

**Vocabulary now matches the destination.** "Activate filing rules" → "Review
and accept your filing rules", and the tour's "Activate the states you file in"
→ "Accept the ones for the states you file in". `/rules/library` offers Accept /
Reject and has no "activate" control; the old wording named a gesture that isn't
there.

**The trial is now unconditional** (Yuqi's explicit call). Both paths grant the
3 months, so the copy no longer pretends otherwise: the CTA is "Continue", the
skip is "Skip these questions", and the subline reads "Your 3 months are already
included — these questions just help us build the right thing." `offerAnswers`
still rides along for analytics; it no longer decides who pays. This closes the
P1 above: there is no longer a cheaper-looking button that quietly costs money.

---

## Open — still needs a design or product call

1. **`/rules/library` blocks Accept behind a mandatory free-text audit note**,
   which nobody warns the first-run user about. The setup step now names the
   right verb, but the destination could pre-fill a default ("Accepted during
   setup") so the first-run path isn't gated on prose.

2. **Step 2's "STEP 2 OF 3" is honest but the count is soft** — the rule-review
   sub-step is conditional, and the importer's own 4-step wizard sits inside
   step 3. Currently legible via the step names; revisit only if users report
   confusion.

3. **Sample data is offered on `/clients` but not on `/today`**, which is the
   page a new user actually lands on.

4. **Edge introduced by the P0 fix, worth tightening later:** rule activation
   now runs for every new practice, so if that call fails the `.catch` shows
   "Couldn't create your practice" — while the firm actually _was_ created.
   Retrying recovers (the reuse path takes over), but the message is wrong.
   Previously only state-selecting users could hit this; now anyone can.
   Distinguishing the two failures needs the handler to track which step threw.
