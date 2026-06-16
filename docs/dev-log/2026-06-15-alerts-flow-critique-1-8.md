# Alerts flow critique — findings #1–#8 (list-row + rail)

_2026-06-15_

Implemented the first eight findings from the full /alerts-flow design
critique. All changes live in `PulseAlertRow.tsx` (+ `PulseAlertList`) and
`AlertListRail.tsx`; no contract or data changes (no fiction).

## #1 + #3 — one confidence threshold across list / rail / detail

The row + rail confidence flag fired on `aiConfidenceTier(c) !== 'high'`, i.e.
the whole non-high band, so a **58% (Medium)** alert wore a "Low confidence"
pill in the list while its detail Source card calmly read "58% Medium" — same
record, two words. Both surfaces now fire on `isLowAiConfidence(c)` (**< 0.5**,
the canonical floor) — the **same** predicate the detail's low-confidence
banner uses. So: low (<0.5) warns everywhere (list pill + rail pill + banner);
medium/high stay quiet everywhere; the detail Source card remains the one place
the exact tier (High/Medium/Low) is spelled out. NY-58% now shows no pill;
FL-46% keeps it. Single source of truth = `ai-confidence.ts` (unchanged).

## #2 + #4 — impact lexicon + accent restraint

Two pill systems overlapped: the **priority tier** pill (URGENT red / HIGH
amber / NORMAL neutral — the urgency axis) and the **High impact** badge
(client-reach axis), which was _also_ destructive-red. A row could carry two
reds reading as one alarm. The "High impact" badge is now a **neutral gray**
chip (weight, not colour). Red is reserved for the single URGENT priority pill;
the two axes now look as different as they are. (The critique's "different per
tab" was a red herring — URGENT vs HIGH is data-driven per alert via the shared
`LEVEL_PILL`, not per tab; the real fix was the colour collision.)

## #5 — the suggested-action pill stops being a wall of blue

The wand action was a filled accent pill on **every** row; when everything is
accented, nothing is. Dropped the fill/padding/radius → quiet accent **text +
wand icon**. Still scannable as "the next step", weightless enough that a
genuinely accented control (the detail CTA) keeps its meaning.

## #6 — source moves into the left identity cluster

`AlertSourceLink` was pinned far-right, leaving a wide dead gap between the
title and "where this came from" — a long horizontal eye-sweep on every row. It
now sits beside the change-kind ("what kind of change, from where" as one
phrase) and shrinks/truncates. The right edge now carries only the time-to-act
("25d left").

## #7 — drop the repeated "No client impact"

"No client impact" was muted on every no-impact row — absence taking a line.
Now impacted rows answer triage-question-#1 in the loud form (icon + primary
ink); no-impact rows stay **silent** (the line's presence is the signal,
matching the Active tab's positive-only form). The detail still states impact
explicitly, so the decision info isn't lost — this is the "quiet form / one
home" reading of _demote-don't-delete_, not clean-by-deletion. Same change in
the rail.

Side effect handled: removing the line exposed that the bottom shelf was sized
for content (the hover Dismiss/Review cluster reserved height), leaving an empty
strip + big inter-row gaps. The hover cluster is now **absolute**, floated into
the row's empty right gutter (the title is width-capped) and vertically centred,
so it reserves no height and never shifts the rows below. The impact shelf (with
its hairline) renders only when `impacted > 0`.

## #8 — checkboxes hover-reveal

Always-on per-row + per-day checkboxes fronted a read-first triage list with a
column of empty boxes. The checkbox slot always reserves its width (revealing
the box never shifts the row), but the box itself is now hover-revealed
(`group-hover/row`, `group-hover/band`) unless the row is ticked or a selection
is already underway (`selectionActive` = ≥1 row selected, threaded from
`PulseAlertList`). Gmail-style: hover to reveal, sticky once selecting.

## Verification

- `npx tsgo --noEmit -p apps/app` — clean.
- `npx vp check` on both files — pass.
- `AlertsListPage.test.tsx` — pass (integration coverage for the list rows).
- Live at 1512×861: Review + Active tabs, hover-reveal of checkbox + floating
  actions, NY-58% pill dropped / FL-46% kept, no horizontal overflow.
- Pre-existing failures in `AlertStructuredFields.test.tsx` +
  `AffectedClientsTable.test.tsx` confirmed failing WITHOUT these changes
  (stash-and-retest) — unrelated to this work.

## Not done here (from the same critique, out of this batch)

#9 confidence-number-shown-3× (detail), #10 "Scroll to read all 3 sections"
caption, #11 eyebrow/lifecycle redundancy, #12 section numbering-vs-weight, and
the dead-alert-id not-found state.
