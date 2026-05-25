---
title: 'Coverage v6 rail: rip ENTITY COVERAGE block, replace with rule-list filter chips'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage v6 rail: rip ENTITY COVERAGE block, replace with rule-list filter chips

## Context

Designer kept saying "don't like this" about the entity coverage pattern.
Last turn they sent a screenshot of the rail's `ENTITY COVERAGE` block:

```
ENTITY COVERAGE
IN    TR    LLC    PRT    S-C    C-C    SP
 ●     ●     ●      ●      ●      ●     ●
```

Three iterations of "polish the codes+dots" hadn't moved them. The
problem wasn't styling. The pattern itself reads as a spec sheet, not
as UI: cryptic codes, dots that say nothing on their own, an eyebrow
label that introduces jargon. The whole block was decoration — the
information was already in the rule list directly below.

## Change

Killed the `ENTITY COVERAGE` block in the rail entirely. Replaced
with **filter chips that double as coverage display** above the rule
list:

```
RULES BY ENTITY                                  j/k to walk
─────────────────────────────────────────────────────────────
[All 7] [LLC 3] [Partnership 0] [S-Corp 1] [C-Corp 1] [Sole prop 1]
─────────────────────────────────────────────────────────────
California LLC Form 568 return            Source ↗
California LLC annual tax payment         Source ↗
California LLC estimated fee payment      Source ↗
```

Each chip carries three things at once:

1. **Full entity name** (no codes to decode — "LLC" / "Partnership" /
   "S-Corp" instead of "S-C")
2. **Pending rule count** for that entity in this jurisdiction
3. **Tone reflecting coverage state**:
   - `active` (verified) → green-tinted outlined, filled green when selected
   - `review` → orange-tinted outlined, filled orange when selected
   - `inactive` (no rule) → muted gray
   - `neutral` (All) → border-only outline, filled neutral when selected

**Click filters the rule list** to that entity. `any_business` rules
count against every business entity (PRD §10.3 wildcard).

### Other fixes in the same pass

**Source-health microcopy (the "11 sources degraded" question).**
"Degraded" describes a watcher fingerprint state and doesn't tell a
CPA what to DO about it. Rewrote:

- `"11 sources degraded"` → `"11 sources flagged for review"` (action-oriented)
- `"X failing"` → `"X unreachable"` (plain English)
- `"Review sources"` (button) → `"Open sources"` (a less ambiguous verb;
  "Review" was overloaded against the rule-review action)
- Added `title` tooltips on both chips explaining the underlying
  watcher state for users who want to know what triggered the flag

**Stats line moved into the rail header.** The "{active} active · {pending}
pending · {sources} sources" line lived inside the (now-removed) Entity
coverage section. Promoted it under the status pill so it stays
visible at the top of the rail regardless of entity filter.

## Why this is the right move

The previous block was answering "which entity types have rules?" by
making the user decode a row of codes and dots. The new strip
answers the same question — and the next one ("which rules?") —
with one interaction. The chip _is_ the coverage indicator AND the
filter affordance. No more decoration; everything on the rail is
doing work.

It also fixes a wiring issue I'd flagged separately: entity-dot
click used to _leave_ Coverage and drill into Library. Now it
filters in place. Library stays available via the footer "View all
in Library" CTA when the user actually wants cross-jurisdiction
work.

## Files

- `apps/app/src/features/rules/coverage-rail-view.tsx`
  - `BUSINESS_ENTITIES` set for `any_business` wildcard resolution
  - `EntityFilterChip` component (name + count + tone, active/idle states)
  - `JurisdictionDetailRail`:
    - Removed the `ENTITY COVERAGE` section (eyebrow + codes + dots grid)
    - Added rail-internal `entityFilter` state
    - Computed `pendingByEntity` map for chip counts
    - Filtered rule list against the active chip
    - Promoted stats line into the rail header
  - `SourceHealthCallout` microcopy updated

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- Browser preview at `/rules/coverage-v6?jur=CA`:
  - Source-health callout reads "⚠ 11 sources flagged for review ·
    Open sources →" with hover tooltip on the count
  - Rail header shows status pill + "0 active · 7 pending · 6 sources"
  - "RULES BY ENTITY" eyebrow + 6 chips: `All 7` (neutral, selected),
    `LLC 3` (review tone), `Partnership 0` (inactive/muted), `S-Corp 1`
    (active tone), `C-Corp 1` (active tone), `Sole prop 1` (review tone)
  - All 7 rules listed by default; clicking `LLC 3` chip filters to
    the 3 LLC rules; chip turns filled orange
  - Filter respects the rule's `entityApplicability` array; rules
    tagged `any_business` count against every business entity
  - j/k keyboard nav still works within the filtered list

## Open

- **Card-level entity coverage** still has the A/B/C toggle (Summary
  default). The user's last screenshot was the rail; haven't been
  told the card treatment is wrong yet. Will revisit if they push back.
- **Personal entity group** removes Trust/Individual from the chip
  strip — confirmed via the entity-group toggle.
