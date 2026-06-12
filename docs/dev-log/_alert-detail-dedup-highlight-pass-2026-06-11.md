# Alert detail — de-duplication + highlight pass (2026-06-11)

Yuqi page feedback on `/alerts?alert=…3020` (protective-claim drawer):
"aren't these repetitions? also no highlights, hard to digest" + "polish the
design layout, show the information in a UX-friendly way".

## Audit findings (what repeated)

- Fact grid restated header chrome: **Authority** (= header source link =
  S&C citation = Activity "Received from"), **Published** (= header time =
  S&C citation), **Jurisdiction** (= header seal chip). Plus an empty
  "Affected forms —" cell renting a slot.
- **Two lookalike quote boxes in a row**: Extracted facts ended with the
  verbatim `sourceExcerpt` blockquote, and Source & confidence immediately
  below quoted `alert.summary` — which for most alerts IS the title, so the
  title rendered twice verbatim on one screen.
- `DeadlineChangeCard` (overlay alerts) carried a meta row (AI confidence %,
  source link, audit-ledger note) and a summary paragraph — all of which
  already have homes (S&C card, header, footer, header dek) — plus a
  hardcoded "Effective immediately" that could contradict the grid's
  computed Effective cell.
- **No highlights**: the action deadline — the one decision-critical date,
  already in the title — rendered in the same quiet 13/500 as every other
  label/value pair, buried mid-box in a second grid that visually duplicated
  the first.

## Changes

`components/AlertStructuredFields.tsx` (restructure):

- NEW action-deadline hero for protective-claim alerts — same recipe as
  `DeadlineChangeCard` (gray box, big mono date, amber accents): CalendarClock
  - ACTION DEADLINE + `formatDatePretty` date + derived countdown
    ("29 days left" amber / "N days past" destructive / "Due today"), and the
    evidence-to-gather list as a checklist sub-row under a hairline (one
    do-this-by-then block). Countdown only computed for ISO `YYYY-MM-DD`
    values (the AI field is freeform).
- ONE fact grid: protective facts (affected years / tax acts / authority
  refs) and deadline-shift facts (relief type / deadline types / opt-in)
  merge into the main hairline grid; Authority / Published / bare
  Jurisdiction cells removed (one home per fact); forms/counties cells
  render only when non-empty; "Counties" replaces the old
  "counties · jurisdiction" hybrid.
- Legal uncertainty stays a quiet soft-box prose note; threshold-advisory
  caveat unchanged; "N similar updates merged" banner unchanged.
- Source excerpt block (+ copy button) REMOVED — moved to its one home:

`AlertDetailDrawer.tsx`:

- **Source & confidence** now quotes the verbatim `detail.sourceExcerpt`
  (was `alert.summary` = title repeat) and carries the hover copy-excerpt
  affordance moved from the fact section. Gate flipped to
  `sourceExcerpt.trim().length > 0`.
- **DeadlineChangeCard** slimmed to its one job (the date diff): header
  (⚠ + title + status chip) + old→new diff row. Meta row, summary
  paragraph, and hardcoded "Effective immediately" removed (homes: S&C
  card / header dek / fact grid).
- **Bug fix** in PracticeImpactSection: `~{months} months of breathing room`
  rendered as "~ months" — `{months}` inside a `<Plural>` _string prop_ is
  never bound by the macro (the ICU placeholder stays valueless). Replaced
  with the repo's `count === 1 ? <Trans>` ternary pattern
  (ClientDetailWorkspace precedent) and switched the copy to the exact
  `{days} extra days` so it matches the hero's "+N days" (a 14-day shift
  read as "~1 months" — fiction).

Tests: `AlertStructuredFields.test.tsx` updated to the new contract (one
assertion — 'Protective claim window' — was already failing before this
pass; stale from an older layout). i18n: catalogs re-extracted; all missing
zh-CN translations filled (incl. strings from parallel copy(voice)/
copy(errors) commits that landed without extraction); `lingui compile
--strict` green.

Verified in preview on all three shapes: protective-claim (…3020),
deadline-shift overlay (…3001), low-confidence scope-change (FL DOR).
tsgo + vp lint + drawer/structured-fields tests green; zero console errors.
