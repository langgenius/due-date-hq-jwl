# Marketing v2 — critique pass: canonical status taxonomy, node timeline, stronger close, fixed stat

**Date:** 2026-06-21 · `docs/marketing/design-explorations/production-v2.html` only.

A `/design-critique` against two klea references (a pricing calculator + workflow cards). The refs were mined for **craft only** — DueDateHQ is beta with no pricing and no fabricated metrics, so the pricing/vanity-metric content was deliberately skipped. Four reference-validated, on-brand changes shipped.

## 1. Canonical status taxonomy (the user's correction: "there are 6 status tho")

The risk-ranked worklist table was using **non-canonical labels** ("Needs review", "Ready to file") that don't exist in the product. Verified the real taxonomy against `apps/app/src/features/obligations/status-control.tsx` (`useLifecycleV2StatusLabels`) — the 6 user-facing states are **Not started · Waiting on client · Blocked · In review · Filed · Completed**.

- **Worklist table** (4 rows) recanonicalised, risk-coherent: `Blocked` (red) → `In review` (navy) → `Waiting on client` (outline) → `Not started` (gray). Shows 4 of the 6; Filed/Completed are terminal and correctly never appear on an active worklist.
- **Worklist mini-UI** (surfaces card) gained matching status chips (Blocked / In review / Waiting).
- Chip colors map the real semantics onto the page's register: Blocked reuses the page's existing severity red (`#d92d20`/`#fef3f2`); In review = `--accent` navy; `waiting_on_client` = the product's intentional **uncoloured outline** pill ("paused, on them"); Not started = soft gray.

## 2. Node timeline on Watch → Match → Apply (ref: klea workflow card)

The how-it-works steps were three cards joined by bare `→` glyphs. Now a **dashed connector spine** threads them at icon height with a circular **node marker** (chevron) sitting on the line in each gap — the three steps read as one connected pipeline instead of isolated cards. Cards sit above the spine (opaque bg hides it, so the dashes only show in the gaps).

## 3. Stronger final CTA (ref: klea pricing-card footer + receipt edge 139930)

The close was thin — centered text restating the pitch with no proof at the decision point. Added:

- a **checkmark-trio** trust line (Free during the beta · No card required · Data stays in your practice), replacing the plain muted sentence;
- a compact **audit "receipt"** proof object with a **scalloped (receipt-tear) bottom edge** via a CSS mask — mono header, the applied change, and three itemised audit facts (sourced / reversible 24h / recorded). Left-aligned to the content column. An audit log *is* a receipt, so the metaphor fits the product honestly.

## 4. Fixed the "Audited" stat

The glass-box stat triplet read `100% · 0 · Audited` — a word masquerading as a number (and missing the `mono` class the other two had). Now a true numeric triplet **100% Sourced · 0 Auto-applied · 24h Reversible**, with the audit claim folded into the 24h supporting line. All three are real product facts.

## Notes

- File still embeds the **Agentation devtool** (localhost-gated, `?noagent` escape); strip before wiring into `apps/marketing`.
- `vp fmt --write` + `--check` clean (the file is prettier-managed on `origin/main`).
- All four verified live at `:4599` by section isolation + screenshot.

## Follow-up (same day)

- **Notice beam — dark callout bubbles (ref 166001).** Replaced the busy stacked-caps `Reads · Classifies · Matches` run-on with three small near-black (`--ink`) **callout-bubble pills** strung on the beam's dashed line — the engine's three steps read as discrete callouts on the pipeline (white-on-dark, depth without the caps clutter). Goes horizontal on mobile.
- **Data-consistency fix.** The worklist **mini** led with "Hudson & Marsh" while the full table's #1 is "Hill Country Partners" — same list, different top client. Aligned the mini to the table (`Hill Country Partners`, Blocked, 2d late); the mini's three rows now mirror the table's top three exactly.
