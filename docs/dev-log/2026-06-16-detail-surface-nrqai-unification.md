# Detail panels → one NrQaI surface system: gray body + white cards (Yuqi)

_2026-06-16_

Yuqi: "alert and deadline detail panels are having different colour, still differ
and divert a LOT. use borders, use coloured backgrounds if need to. avoid being
too WHITE." Plus 5 specific fixes. The reference is Pencil NrQaI (white hero +
very-light-gray body + white bordered section cards + colored bands).

This **reverses** the earlier all-white/flat direction — a conscious change per
Yuqi's new direction + the NrQaI reference they chose.

## The unified surface (both panels now identical)

- **Body → `bg-background-subtle`** (very-light warm gray). Hero, top bar, and
  footer stay white (NrQaI keeps the hero white).
- **`DetailSectionCard` flat variant → a white bordered card** (`rounded-xl
border-divider-subtle bg-background-default p-5`; dropped the border-t divider).
  Shared primitive → every flat section on BOTH panels is now a white card on the
  gray body. Header styling (action 16/600, reference eyebrow, data-chip) kept.
- **Frames-in-frames removed** so the section card is the only frame: alert Source
  block + meta grid + Activity timeline de-framed (→ dividers/plain); the alert
  `AlertStructuredFields` fact grid lost its outer box (cell hairlines kept). Hero
  metric/fact cards + the inner tinted blocks (quote, "evidence to gather",
  active-stage) kept — those are NrQaI's "tinted card inside" pattern, not frames.
- **Deadline Status workspace re-carded** — the WorkflowMilestoneCard (flattened
  earlier for the white body) is a white card again, matching the section cards.

## The 5 specific fixes

- **#3 status banner** (`detail-status-banner`): colored tones (danger/warning/
  success) drop the `border-b` — the colored fill is its own edge; deadline
  overdue banner now passes `danger` without `subtle` → red band, no border.
- **#2 SearchInput**: compact/rail variant zeroed its padding (`py-0` + existing
  `px-0`/transparent) — clean borderless search line, no hover/focus fill.
- **#1 rail sort**: `DeadlineNavigatorRail` now shows a canonical `FilterTrigger`
  "Sort by │ {key} ⌄" pill (re-rankable, mirrors the /deadlines table) + a
  one-line "{ranking} first" note so the user knows how it's ordered.
- **#4 body gray** + **#5 section dividers** — resolved by the gray body + white
  section cards (the card borders separate sections).

## Execution + review

Mechanical multi-file application by a focused sub-agent against this exact spec;
I reviewed + finished two things it left: de-framed `AlertStructuredFields` (it
was outside the agent's allowed file list) and re-carded the deadline Status
workspace. Verified live (localhost:5173): both panels read identical — body
`rgb(242,244,247)`, white bordered cards, red banner (border-bottom 0), rail sort
pill + note, clean search. tsgo + vp clean on all 7 files.

Single-session files only; the parallel session's auth-chrome.tsx tsgo error +
its uncommitted obligations.tsx/catalogs are NOT staged here.
