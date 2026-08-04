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

**Partially fixed.** The link now reads **"Continue without the free trial"**,
so the choice is disclosed. **Open for Yuqi:** the deeper question is whether a
user who skips should forfeit the trial at all, given that answering nothing
and clicking Claim earns it. Granting on both paths (and keeping the
questionnaire as genuinely optional research) would remove the trap entirely —
but that is a promo-economics decision, not a UX one, so it was not changed
unilaterally.

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

## Open — worth doing, needs a design or product call

1. **Coordinators hit a fully dead first run.** All three choice cards gate on
   `migration.run` / `client.write`; a coordinator has neither, so every control
   on the page is disabled while the sidebar simultaneously nudges "Finish
   setup". Needs a distinct "ask your firm owner to import the client book"
   state. Separately, rule activation requires `owner|partner|manager`
   server-side but the setup steps are shown ungated — preparers and
   coordinators are sent to `/rules/library` to hit a 403.

2. **Day-one "All clear".** The three-way branch misses a fourth state: clients
   imported, rules active, but zero deadlines generated (activated jurisdictions
   don't match the imported clients, or rules are still `pending_review`). Those
   firms get "All clear — nothing due or late" on day one, which is the most
   dangerous sentence this product can show a CPA who has verified nothing.

3. **`needsRules` blanks the whole page**, unmounting the alerts section — and
   firm-wide regulatory alerts don't depend on rules. `/deadlines` in the same
   state contradicts it, saying deadlines will generate "from the rules you
   activated". Better as a banner above the normal sections.

4. **"Activate filing rules" is vocabulary the destination doesn't use.** Three
   surfaces say "activate"; `/rules/library` offers **Accept / Reject** and
   blocks Accept behind a mandatory free-text audit note nobody warned the user
   about.

5. **Step 2's "STEP 2 OF 3" is honest but the count is soft** — the rule-review
   sub-step is conditional, and the importer's own 4-step wizard sits inside
   step 3. Currently legible via the step names; revisit only if users report
   confusion.

6. **Sample data is offered on `/clients` but not on `/today`**, which is the
   page a new user actually lands on.

7. **Edge introduced by the P0 fix, worth tightening later:** rule activation
   now runs for every new practice, so if that call fails the `.catch` shows
   "Couldn't create your practice" — while the firm actually _was_ created.
   Retrying recovers (the reuse path takes over), but the message is wrong.
   Previously only state-selecting users could hit this; now anyone can.
   Distinguishing the two failures needs the handler to track which step threw.
