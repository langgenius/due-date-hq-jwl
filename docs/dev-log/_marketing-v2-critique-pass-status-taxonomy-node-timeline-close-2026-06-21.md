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
- **Coverage piano-key bar (ref 140156).** Added a **segmented progress bar** to the Sources section — 16 filled navy keys + a mono `52 / 52 jurisdictions watched` count — between the header and the source chips. Quantifies *completeness* (a distinct message from the activity map below it). Honest: FED + 50 states + DC = 52, all watched, so the bar is full.

## "Work through all" — final accounting of the priority quick-win list

Closing the loop on `design-direction-inspiration-map.md` §"Priority quick-wins" so nothing is silently dropped:

- **Shipped this session:** status/risk chip system (#2, canonical 6-state), dark callout bubbles (#3), node-timeline connector for Watch→Match→Apply (#7), receipt-scallop on the close (#8), segmented piano-key coverage bar (#6).
- **Already present before this pass:** Geist Mono on all data + navy focus-visible ring (#1, `outline: 2px var(--accent)`), faint dotted-grid behind the surfaces panel (#4), old→new value pill + delta badge in alerts/extract (#5).
- **Deliberately skipped (with reason):**
  - *Sticky scroll-spy rail* for the 4-card surfaces grid (#8) — overkill for four cards in a single row; nothing to spy-scroll.
  - *Dark inverted pill for the most-urgent worklist row* (#2 variant) — row 1 already carries a red `Blocked` chip + amber `2d late`; a third emphasis would double-highlight (violates "one emphasis per row").
  - *Callout bubbles **with tails** in the extract cards* (#3 fuller spec) — the beam already delivers the callout concept; adding tail-bubbles in the adjacent extract would over-decorate an already-rich section.
  - *Extra diagonal-grain texture* (#4 variant) — the dotted-grid already supplies depth; more texture risks over-patterning.
