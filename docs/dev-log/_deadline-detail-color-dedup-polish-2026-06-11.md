# Deadline detail — red/blue/status de-dup + format polish (2026-06-11)

Yuqi (/design-critique): "避免太多红色蓝色和各种status… audit every element…
polish yet clean." The page said "30 days overdue" in red FIVE times, showed two
blue primaries, and stated the status three times. New rules, applied:

## One red statement
- The status banner is the page's ONLY red. Date-card clocks → quiet gray
  (`text-text-tertiary`); the Filing card's warning tint (icon + date) removed.
- INTERNAL/PAYMENT clocks render only when their date DIFFERS from filing —
  three identical "30 days overdue" lines were pure repetition. Their
  distinguishing line (buffer / $ owed) stays.
- Stepper: active node is always accent (red `overdueActive` fill removed);
  the "PAST DEADLINE" caption under the node removed (third echo).
- Active-card headline drops the day count: "Filing was due May 12." — the
  banner owns the count.

## One blue per view
- Footer "Mark as filed" is ALWAYS outline — the active-stage card always
  carries the stage's real next-move as the single solid primary. (The old
  rule demoted it only during In Review.)
- Materials tab count pill accent → gray (counts inform; the banner alarms).

## One status statement
- The status pill is removed from the active-card eyebrow ("Stage N of 6"
  remains) — the stepper directly above already names the active stage.

## Format consistency
- Banner "Due 2026-05-12" → "Due May 12, 2026"; stepper ISO stamps → pretty
  short dates; footer "Last updated 2026-05-20 04:00:00 CDT" → "May 20, 2026"
  with the full timestamp on hover (title attr).

## Verified
tsgo 0 errors; obligations 89/89. Live DOM: "overdue" 2× (red banner + one gray
filing reference, was 5+ red); exactly one solid-blue button (the stage CTA);
no ISO dates. Panel/sheet share the same components — the de-dup applies
everywhere consistently.
