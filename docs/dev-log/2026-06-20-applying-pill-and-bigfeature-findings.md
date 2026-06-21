# "AI is applying" pill + the big-feature reality check

_2026-06-20 · "build the big feature first"_

## The reality check (verified, with proof)

The flexible map's "bigger features" were greenlit to build — but verifying each
against the real code (not the agents' reports) found two of the headline ones are
**already built**, and built well:

- **FilterTrigger two-panel cascading popover + saved views** — already shipped as
  `ObligationFiltersPopover` (obligations.tsx:6120): one "Filter" button with an
  active-count badge → a vertical tab strip (Form · Client · State · Assignee ·
  County · Condition · Saved views) with **per-facet count badges**
  (`<ObligationFilterTab count={facetCounts[tab.key]}>`) → per-facet typeahead
  checkbox lists → staged Reset/Apply. Confirmed live (opened it on /deadlines;
  screenshot taken). Rebuilding it would have been pure duplicate work.
- **Extension date-picker** — the `IsoDatePicker` primitive already exists (with
  tests) and is already used in the obligation/extension/onboarding flows.

The grounding agents mis-flagged these as net-new because they didn't fully explore
a very mature codebase. The discipline (verify before building) is what caught it.

## Built — the one genuinely net-new piece

- **`ApplyingPill`** (`features/alerts/components/ApplyingPill.tsx`, img-043) — the
  in-progress indicator for the **one-click apply**, the product's core moment. A
  pill with a slowly-sweeping navy→cyan gradient BORDER (`--color-brand-ink` →
  `--color-brand-highlight`), white interior, no inner spinner — activity on the
  edge, calm not flashy. `animate-[spin_2.4s]` on a conic-gradient layer behind a
  1px inset fill; `motion-reduce` settles it to a static ring.
- Wired into the **real apply footer** (`AlertDetailDrawer`) — the apply button only
  went `aria-busy` before, with _no visible progress_; the pill now shows
  "Applying…" while `isMutating`. Additive (the buttons stay).
- The polymorphic `DecisionActions` primitive gained an opt-in `applyingPill` prop
  (apply-only; other decisions keep the spinner so the label stays honest).
- Specimen added to `/preview`.

## Verification

tsgo 0; build green; "Applying…" string already translated (no new i18n); pill +
sweep layer confirmed rendering on /preview; #1 confirmed live on /deadlines.

## Remaining (honest)

Of the four greenlit: #1 (filter) + #2 (date-picker) were already built; the
ApplyingPill covers the apply moment. The audit date-gutter is a calendar pattern
that fights the time-ordered audit log (poor fit); the client 2-col grid + first-run
2×2 cards are real but lower-value layout work. Net: the mature product had less
genuine net-new than the inspiration map implied — the value this round was
preventing duplicate rebuilds + shipping the one real gap (the apply indicator).
