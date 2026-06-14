# 2026-06-14 — Alert detail: rank the body (critique action plan #1–#4)

Yuqi: "/critique … flat, my eyes don't know where to go" → "start with #1 and
work your way through." The four-step plan, executed.

## #1 Value-first, reference quiet (layout)
- "What this means for your practice" (PracticeImpactSection) now LEADS the
  Change section — moved above the fact grid — with one accent anchor (left
  rule + accent header). It's the plain-language read the CPA needs; the raw
  fact grid follows as supporting reference.
- Source & confidence + Activity & notes demoted to `tone="reference"`.

## #2 Header contrast (typeset)
- `DetailSectionCard` flat variant gains `tone: 'action' | 'reference'`.
  Action = 18/600 primary (Change, Clients); reference = 14/600 secondary
  (Source, Activity). One clean step of contrast so the eye reads the action
  zones first and treats the rest as look-up. (card variant unchanged.)

## #3 Clarify labels (clarify)
- Footer "Apply Deadline Exception" → "Apply to N clients" (names its target;
  distinct from the per-row Confirm/Exclude that build the selection).
- APPLY MODE "Auto-applied" → "Adjusts due dates" (the app never auto-applies;
  the old label described the IRS relief and read as "we did it for you").

## #4 List: urgent rows carry weight (layout)
- Client-affecting rows render "Affects N clients" in present primary/medium
  ink (heavier in the scan); no-impact advisories stay muted and recede. The
  weight differential is the cue — no extra color (accent stays on the verb).

## Verify
tsgo clean. Live on 5173: "What this means" precedes the grid, accent header
rgb(21,90,239) + left rule; Change header 16px vs Source header 14px/secondary;
APPLY MODE "Adjusts due dates"; footer "Apply to 1 client"; lifecycle strip +
value lead give the detail a clear top-to-bottom eye path.

Note: a fuller list urgency model (deadline-proximity + impact-tier weighting)
is available as a follow-up; #4 here is the safe, data-backed first step.
