# 2026-05-25 — PulseDetailDrawer redesign (Phase 2 of 89-item review)

## Why

Yuqi's 2026-05-25 review surfaced 17 items inside the
`PulseDetailDrawer` — by far the densest cluster of feedback in
the whole review. A single drawer was failing seven different
ways. Five themes:

1. **Title small / description duplicated** (#9, #12, #14) — the
   `text-lg` h2 read like row chrome; the SheetDescription was a
   verbatim copy of the title.
2. **Badge row competing with title** (#13) — small badges in the
   top row competed with the title for the eye.
3. **Affected clients buried** (#10) — the most important question
   ("which clients does this hit?") was the 5th section, after
   structured fields and alerts. Empty case rendered nothing at
   all — the CPA saw silence instead of "no clients matched."
4. **AI confidence shown twice** (#15, #19) — small `AI 46%` badge
   in header + `Alert "Low AI confidence"` block below = same
   concept, two surfaces. No copy explained what 46% meant.
5. **PulseStructuredFields wastes space** (#11, #20, #21, #22,
   #23) — vertical FieldRow list, eye must travel left-right
   across an 880px-wide drawer; section labels (`text-xs uppercase
tracking-wider`) blended with the body copy at the same size +
   color. And **#24** — `Copy client email draft` rendered both in
   the suggested-actions card AND the persistent footer.

Plus Yuqi explicitly asked us to **justify the right-slide panel**
(#8) — why not a full page?

## What changed

### `apps/app/src/features/pulse/PulseDetailDrawer.tsx`

**Header redesign.** Title promoted to `text-xl font-semibold`
with the pulsing dot at `mt-2 size-2.5` baselined against the
title's leading. Description renders only when it carries new
info — otherwise stays as `sr-only` for a11y. Badge row moves to
a second row below the title at `text-sm`, so badges don't fight
the headline. Comment block at the top of `SheetHeader` justifies
the right-slide-panel choice (list-driven review, parallel with
obligation drawer & client drawer).

**Body re-ordered.** Affected clients moves to the FIRST section
inside the body — same H3 + count + selection summary, then the
table or the explicit empty-state message. Then comes the
low-confidence alert (when applicable), then structured fields,
then permission / revoked alerts, then the suggested-next-step
card, then the apply-safety checklist.

**AI-confidence consolidation.** When `isVeryLowPulseConfidence`,
the alert title now names the percent ("AI confidence 46% — review
source before applying") and the `<PulseConfidenceBadge>` chip in
the header is suppressed. Same signal, one place.

**`SuggestedActionsPanel` slimmed.** Dropped the entire "Prepare
client draft" card. The Copy / Request review buttons remain
available in the persistent footer (`DrawerActions`) so the action
isn't lost — it just isn't rendered twice. The panel now shows
one contextual card whose copy + button change with selection
state (no obligations → "Select obligations"; ≥1 → "Apply to N
obligation(s)").

### `apps/app/src/features/pulse/components/PulseStructuredFields.tsx`

Rebuilt from scratch. Replaced the vertical `FieldRow` list with
two `FactCard`s (Source / Scope) + a source-excerpt card:

- Each `FactCard` has a real `text-sm font-semibold` heading with
  a divider rule below — actually reads as a section title now,
  not as row chrome (#22).
- Inside each card, facts live in a `grid-cols-1 sm:grid-cols-2
md:grid-cols-3` grid where each cell stacks a `text-xs uppercase`
  label ABOVE its `text-sm` value. The eye scans top-to-bottom
  within a column instead of zigzagging left-right across the
  drawer (#20, #21).
- The "Open official source" link button now lives at the top of
  the Source card next to the heading — discoverable without
  scrolling.
- Source excerpt and structured-change blocks moved out of inline
  flow into their own cards so the page rhythm reads in three
  beats.

### `docs/Design/pulse-vocabulary.md`

New section "PulseDetailDrawer layout" documents:

- Why a right-slide panel
- The canonical top→bottom information order
- Footer action ordering
- A pointer back to this commit's dev-log entry for the bug
  inventory.

Per `feedback_design_docs_on_change.md` memory rule.

## Verification

- `pnpm exec tsc --noEmit` clean
- `vp lint apps/app/src/features/pulse` 0/0 (29 files)
- 23/23 runnable pulse + dashboard tests pass

## Closes Yuqi review items

- Today drawer: **#9** (title bigger), **#10** (affected clients
  promoted + empty state), **#11** (structured fields wasted
  space), **#12** (title/description duplication), **#13** (badge
  row demoted), **#14** (header zone enlarged), **#15** (AI 46%
  explained), **#19** (low-confidence merged with the badge),
  **#20** + **#21** (3-column structured grid), **#22**
  (SectionLabel now reads as a heading), **#23** (FactCard
  structure), **#24** (Copy action dedup).
- Today drawer: **#8** justified via the leading comment block in
  the drawer file.

13 of 89 items closed in this phase. Combined with Phase 1's 7
items, the review is at 20 / 89.

## Follow-ups (not in scope here)

## 2026-05-25 follow-up: official-source link semantics

React DevTools reported Base UI's native-button warning in
`PulseStructuredFields`: the Source card action rendered an
external `<a>` through `Button render={...}` while keeping the
default `nativeButton=true` semantics. The action is intentionally
a link, not a form button, so it now sets `nativeButton={false}`.

Validation:

- `pnpm check`
- Browser smoke on `http://localhost:5173/rules/pulse` detail
  drawer: Source card external link still renders, and the
  relevant Base UI `nativeButton` console warning is gone.

- Yuqi flagged the **Suggested Actions** card title as
  "Suggested next step" — singular — to match the actual content
  (one card, not "actions" plural). Done in this commit as part
  of the slim-down.
- The AI confidence threshold (`isVeryLowPulseConfidence` = 0.5
  vs the doc's `LOW_THRESHOLD` = 0.7) is still split. The drawer
  uses < 0.5 for the alert block; the dashboard chip uses < 0.7.
  Resolving that lives in a separate "thresholds reconciliation"
  task — too much to bundle here.
