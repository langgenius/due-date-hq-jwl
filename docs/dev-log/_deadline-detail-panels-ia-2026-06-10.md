# Deadline detail — panels IA + small redesign (5 feedback items)

Date: 2026-06-10
Surface: `/deadlines/:ref` (page mode) — page-detail panels only
File: `apps/app/src/features/obligations/queue/components/panels.tsx` (only)

Five pieces of Yuqi feedback on the standalone deadline-detail page. All changes
are visual/structural inside the page-detail components — no behavior, handler,
mutation, or conditional-state logic changed. The flat `/clients` variants
(`DeadlineTile`, etc.) are untouched. Tokens-only, `<Trans>`/`<Plural>` (no
`plural()` + `i18n._` introduced — one such call was actually REMOVED, see #5).

## #1 — `DeadlineDateCard` date value bigger

The key-date value (e.g. "May 12, 2026") was `text-caption-xs` (it had been
reduced in an earlier pass and now read too small to be the card's primary).
Bumped it to `text-sm` (`leading-none` → `leading-tight` to suit the larger
size). The label above and the clock + meta below stay smaller, so the date now
clearly owns the hierarchy of each card.

## #5 — `DeadlineDateCard` Internal-target buffer sub-line ("On the filing deadline")

The cryptic "On the filing deadline" was the Internal Target's buffer note (it
means the internal target equals the filing deadline → zero buffer), but it read
as a riddle. New copy a CPA reads at a glance:

- zero buffer → **"No buffer — same as filing"**
- positive buffer → **"N days before filing"** (`1 day before filing` /
  `N days before filing`)

Also removed the `i18n._(plural(...))` runtime footgun here: the plural is now
expressed with plain `t\`\``strings (a`buffer === 1`branch + the plural form),
which is the safe pattern for a string-context value (it can't be JSX`<Plural>` because it's passed as a prop).

## #2 — `PathToFilingSummary` stepper node smaller

The stage node indicator stepped down from `size-6` → `size-5`, and its glyph
from `size-3.5` → `size-3`, so the row of six stages reads compact/tighter.

## #3 — `PathToFilingSummary` stage labels bigger

The per-stage label (e.g. "Not started") stepped up `text-xs` → `text-sm` so the
stage names are the clear primary identifier of each column. (So #2 shrank the
node; #3 grew the label — opposite moves on different elements, as requested.)

## #4 — `ActiveStageDetailCard` IA / UX

Applied a standard hierarchy to the card header so the card has a clear
"what's the situation" anchor instead of a cramped eyebrow that jumped straight
into the steps/actions list.

**Before (header IA):** a single eyebrow row carried four competing things —
status pill + "Stage N of 6" + "· sub-status" on the left, "Accepted" badge +
"Entered DATE" on the right. The sub-status (the most descriptive datum, e.g.
"Awaiting client · 3 days so far", "E-filed — awaiting authority acceptance") was
jammed in at `text-xs` next to the pill, so the card had no prominent headline;
the eye fell to the first big block lower down (overdue banner / waiting-docs
count) or straight to the buttons.

**After (header IA):** two rows.

- Row 1 = **eyebrow only** — status pill + "Stage N of 6" (left), "Accepted"
  badge + "Entered DATE" meta (right). The "Entered" line dropped `text-sm` →
  `text-xs` so it reads as quiet meta, not a peer of the headline.
- Row 2 = **ONE prominent headline** (`text-[18px]/600`, the stage name from the
  existing `stageLabels` map) + a **concise sub-line** (`text-sm` secondary, the
  existing `subStatus`). The sub-status moved OUT of the eyebrow into this
  sub-line.

The generic headline **suppresses** when a stage already owns a dominant
headline block further down — the overdue banner ("Filing was due … N days
overdue.") or the waiting-docs glance ("N materials still outstanding.") — via a
new `showStageHeadline` derived flag, so the card never shows two competing
h-lines.

The single next action stays the visual anchor: `StageActions` already renders
the primary mutation as the one solid `Button`, secondary mutations/routing as
quiet ghost links, and manual reminders as a single tertiary text line — that
component is correct and was not touched. The de-emphasized supporting sections
("Done this stage", "Previous stages" collapsible) keep their `text-caption-xs`
eyebrows + top-border separators, so they read as secondary.

No new data, no fiction: the headline reuses `stageLabels[stageKey]`, the
sub-line reuses the already-derived `subStatus`, and the suppression flag reuses
`showOverdueBanner` + `isWaitingDocsCase`/`readinessCounts` that already existed.

## Verification

- `tsgo --noEmit -p apps/app/tsconfig.json` — clean
- obligations vitest — 7 files / 89 tests passed
- token-discipline guard — no new violations in `panels.tsx`
- `vp fmt --write`
