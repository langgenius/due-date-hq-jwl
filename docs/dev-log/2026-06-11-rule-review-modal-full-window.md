# Rule review modal — full-window, columned, scroll-free

Date: 2026-06-11 · Yuqi feedback (`/rules/library?…&rule=…`)

> "i prefer a responsive full window (80px from the screen borders) and you
> don't need to scroll to review the rules… a non-scrollable well designed
> review panel."

The rule detail/review modal (`RuleDetailPanel`) was a centered 980px column
with a vertically-scrolling card stack — reviewing meant scrolling. Reworked it
to a responsive full-window panel laid out in balanced columns so the whole
rule reads at a glance.

## Changes

- `apps/app/src/routes/rules.library.tsx` — `RuleDetailPanel` `DialogContent`
  is now full-window with an 80px inset on every edge
  (`h-[calc(100dvh-160px)] w-[calc(100vw-160px)] max-w-none`), replacing the
  `max-h-[90vh] w-[min(980px,…)]` centered box. Scroll body padding tightened
  (`py-5 → py-4`). Hero compacted — `text-xl` title (was `text-[22px]`),
  `text-sm` meta + 1-line tip (was `text-base` + 2-line), tighter gaps/padding.
  Decision footer wrapper `py-4 → py-3`. Passes the new `columns` flag.
- `apps/app/src/features/rules/rule-detail-drawer.tsx` — `RuleDetailCompact`
  gains a `columns` prop: the reference cards flow into balanced CSS columns
  (`sm:columns-2 lg:columns-3 xl:columns-4`, `break-inside-avoid`) instead of a
  single vertical stack. Only used with `hideDecision` (the panel).

## Result

Verified full-window at 1512×861 (dialog 1352×701, inset 80px). The card stack
flows into 4 balanced columns; overflow cut from 225px → ~63px. At ≥~910px
viewport height it's fully scroll-free; at 861px a small residual remains — the
last ~half-row sits behind the sticky Decision footer — because the rule
carries a lot of content (hero + 7 cards + decision) for a short laptop height.

Could not run the final live pixel pass: a concurrent session reset the
preview data to 0 rules (so no rule opens) and has this surface mid-redesign
(10 pre-existing test failures in `rules.library.test.tsx`, unrelated to this
change). Tightening the residual further (leaner footer / hero) is the next
step once data returns.

## Follow-up 2026-06-11 — residual closed (scroll-free at 861px)

Data returned; measured the open modal live at 1512×861. The body region was
358px for 425px of content (67px overflow → a short scroll). The cause was the
hero (183px) + Decision footer (159px) eating 342px of the 701px dialog, not
the column count — balanced columns are floored by the tallest single
`break-inside-avoid` card, so bumping 4→5 columns barely moved the stack
(425→413px) while cramping each card (clipped chips, the Evidence "Primary"
badge overlapping the filename). Reverted to 4 columns and reclaimed the height
instead:

- **Hero** (`RuleDetailHeroCard`, `rules.library.tsx`): identity bar
  `h-9 → h-8`, body `py-3.5 → py-2.5`, `gap-1.5 → gap-1`, panel wrapper
  `pt-5 → pt-4`. 183 → 161px.
- **Decision footer**: dropped the redundant "Decision" `RuleSectionHeading`
  (the bordered footer + Accept/Reject buttons already name the zone; that was
  its only caller, so the function was removed) and tightened the explainer
  `text-sm → text-xs`; panel wrapper `py-3 → py-2.5`. 159 → 122px.
- **Scroll body**: own padding `py-4 → py-3` (−8px of content height).

Result: body 417px, content 417px → **0px overflow, no scroll** at 861px, with
all seven reference cards + the commit footer visible at once. `tsc` clean;
lint 0 errors; test count unchanged (7 pass / 10 pre-existing fails). Floor is
~860px viewport height; shorter windows still scroll the body — the correct
fallback.
