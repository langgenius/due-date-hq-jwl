# Onboarding polish — firm setup + rule review (Phase 2), 2026-06-09

**Who/why:** Yuqi — "polish the login flow and onboarding." Phase 2 brings the
onboarding firm-setup (`E76U6Q`) and rule-review prompt (`U8eGg`) into the new
full-bleed auth language. Decisions taken via AskUserQuestion:
- Firm setup → **polish the real fields** (no fabricated data).
- Rule review → **polish + wire into the flow**.

## Firm setup (`E76U6Q`) — `routes/onboarding.tsx`

Rebuilt on the shared `CenteredAuthScreen` (brand bar + status pill + trust line
+ footer) with a `STEP 1 OF 3` dot indicator and a rounded-20 card. **Standalone
route** now (decoupled from `EntryShell`, like the auth screens).

The canvas shows *Team size* + *"What do you file most?"* — neither is in the
data model, so per the no-fiction rule the form keeps the **real engine fields**
(practice name, monitoring start date, internal deadline offset, timezone, state
rule activation) restyled into the new shell. All mutations
(`firms.create`, `rules.activateOnboardingJurisdictions`) unchanged. The card
scrolls internally (the 51-state grid is tall); chrome stays pinned.

## Rule review (`U8eGg`) — `features/onboarding/rule-review-prompt.tsx` (was orphaned)

Polished to the new language AND **wired into the flow**: after firm creation,
when `activateOnboardingJurisdictions` returns `reviewRequiredCount > 0`,
`/onboarding` now pauses on **step 2** (the rule-review prompt) before the
importer, instead of jumping straight to `/migration/new`. Both actions move
forward — "Review {codes} now" → `/rules/library`, "Skip and import clients
first" → `/migration/new?source=onboarding`.

**Honesty note:** `RuleOnboardingActivationOutput` gives the real review
jurisdictions + total activated count, but **no per-jurisdiction breakdown**.
So the canvas's "28 rules · 6 blocked · Franchise Tax Board calendar" stats are
now **optional props, omitted (not fabricated)** — the prompt shows the real
codes + names + total + a truthful "source-defined calendar, confirm before
deadlines generate" line. The rich per-jurisdiction stats await an
activation-summary contract (TODO(data) in the component).

Its chrome was harmonized with step 1 (rendered inside `CenteredAuthScreen` with
`STEP 2 OF 3` dots) rather than the canvas's separate labeled stepper, so the
two onboarding steps feel like one flow.

## Routing

`/onboarding` decoupled from `EntryShell`. `EntryShell` now wraps only
`/migration/new` and `/readiness/:token`.

## Verified (preview, demo session + temporary dev-only bypass)

- Step 1 (firm setup): new shell + restyled real fields render; chrome pinned;
  card scrolls internally.
- Step 2 (rule review): renders with real-shaped data (CA + NY), consistent
  chrome, honest detail lines, skip/review actions.
- Both previewed via a **temporary** `?preview=1` loader bypass + a
  `?reviewPreview=1` state seed, **both added and reverted** in this session
  (verified clean). All touched files typecheck clean; formatted.

## Files

- Rewritten: `routes/onboarding.tsx` (new shell + step dots + two-phase flow),
  `features/onboarding/rule-review-prompt.tsx` (polish + optional stats).
- Routing: `router.tsx` (onboarding decoupled from EntryShell).

## Next (Phase 3)

The 4-step migration import wizard (`KSJGY`/`IUWHX`, `UOKYQ`, `ni10S`, `rxWxK`,
`E6VSub`, `iAJhJ`) — the largest surface. `/migration/new` still uses EntryShell.
