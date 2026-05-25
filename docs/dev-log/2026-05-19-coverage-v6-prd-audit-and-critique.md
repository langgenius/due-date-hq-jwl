---
title: 'Coverage status v6: PRD audit + UX critique fixes'
date: 2026-05-19
author: 'Claude'
area: rules
---

# Coverage status v6: PRD audit + UX critique fixes

## Context

After v6 (master-detail rail) shipped, did a two-pass review:

1. **PRD audit** against `06-prd-coverage-status-page.md` — checked
   every §13 acceptance criterion + §3 surface architecture against
   the v6 implementation. Found 5 gaps where v6 had dropped or moved
   information from the canonical spec.
2. **/critique** — Nielsen heuristics + AI-slop scan + persona walks.
   Deterministic scanner came back clean (`[]`); LLM review surfaced
   5 priority issues across safety, clarity, efficiency, and visual
   weight.

Scope: fix every gap from both passes (P1 → P3), keep v6 as the
working surface.

## Changes

### PRD audit fixes (information completeness)

**1. SourceHealthCallout at top of page (PRD §3.1)**
The "are the documents backing them watched?" half of the PRD job
was buried inside the empty-state rail. Promoted it to a
top-of-page callout above the jurisdiction grid. Two states:

- Incident (`degraded > 0 || failing > 0`): bordered pill with
  warning-tone counts + "Review sources" → `/rules/sources?health=degraded`
- Healthy: muted "All N watched sources are healthy →" → `/rules/sources`

**2. ACTIVE / SOURCES counts on every card (PRD §3.2)**
Added a stats footer to each `JurisdictionCard` reading
`{active} active · {sourceCount} sources` in 10px tertiary-tone text.
Mirrors the canonical table's ACTIVE and SOURCES columns; previously
those numbers only appeared in the rail and only after selection.

**3. TX-specific status label "Approve all N pending" (PRD §3.4)**
`statusLabelForApproval(row)` now special-cases `TX` with the
stronger "Approve all N pending" wording because every rule in
Texas is awaiting review. Other jurisdictions still read
"Approve N pending."

**4. Entity-dot drill to Library (PRD §4)**
Entity dots in the card strip are now buttons that fire
`onEntityDrillIn(jurisdiction, entity, state)` and navigate to
`/rules/library?library={active|pending_review}&jur={code}&entity={entity}&from=coverage`.
`from=coverage` so the OriginBreadcrumb on Library resolves.
Dots with `state === 'none'` stay plain `<span>` (per PRD §3.3).
Inside the card, dot clicks `event.stopPropagation()` so they don't
also trigger the card-body select.

**5. Page description matches PRD intent**
v6's description was "Master-detail: jurisdiction grid on the left,
persistent detail rail…" — that explains the _how_, not the _what_.
Replaced with the PRD §1 page job verbatim:
"Do we have rules where clients file? Pending counts and source
documents are clickable. Every count traces back to the official
federal, state, or DC document."

### /critique fixes (UX polish)

**[P1] Accept/Reject confirmation step**
Catalog-level mutations (Accept rule, Reject rule) used to fire on
the first click. A misclick on the rail would activate a rule in
production, generating client obligations. Now two-step:

- First click on Accept → reveals an `alertdialog` strip:
  "Activate this rule? It'll start generating client obligations."
  with `[Cancel]` and `[Confirm accept]`.
- First click on Reject → same shape with rejection copy.
- Second click confirms; Cancel restores the original buttons.
  Local `pending` state, no modal. Single mutation per confirmed click.

**[P1] Empty rail replaced with Next best action**
The prior `PracticeSummaryRail` showed two read-only stat cards
(Pending 123, Watched sources 88) — both duplicated by the top
callout. Replaced with `NextBestActionRail`: top 5 jurisdictions
in the `needs_approval` lane sorted by pending count, each rendered
as a numbered clickable row that selects the jurisdiction. Earns the
440px of rail real estate by being directly actionable on first
paint. Caught-up state when there are none.

**[P2] Entity column code legend on hover**
Column headers (IN / TR / LLC / PRT / S-C / C-C / SP) now carry
`title` and `aria-label` with the full label (Individual, Trust,
LLC, Partnership, S-Corp, C-Corp, Sole prop). Dotted-underline +
`cursor-help` styling tells the user the label is hover-revealing.
Applied to both the card entity strip and the rail's jurisdiction-
detail entity strip.

**[P2] j/k keyboard nav in rail rule list**
Added an `onKeyDown` handler on the rule list `<ul>` that intercepts
`j` (next) and `k` (previous) keys and moves focus among
`button[aria-label^="Open rule:"]` elements. Wrap-around at both
ends. Native Tab still cycles globally; j/k is the scoped power-
user accelerator. A small "j/k to walk" hint shows next to the
"Pending rules" eyebrow.

**[P3] Reduced entity-dot opacity to 80%**
~30 orange dots per page paint was crowding the attention budget
and competing with the source-health callout for the primary
signal slot. `opacity-80` on every entity dot (both inert `<span>`
and interactive `<button>` variants); interactive variants restore
to `opacity-100` on hover. Source-health callout's orange triangle
now wins the eye.

## Files

- `apps/app/src/features/rules/coverage-rail-view.tsx`
- `apps/app/src/routes/rules.coverage-v6.tsx`

## Verified

- `pnpm exec tsc -p apps/app/tsconfig.json --noEmit` → exit 0
- `npx impeccable --json` on `coverage-rail-view.tsx` + `rules.coverage-v6.tsx`
  → `[]` (no AI-slop patterns)
- Browser preview at `/rules/coverage-v6`:
  - Top callout reads "⚠ 11 sources degraded · Review sources →"
  - Each card shows status pill + entity strip + "N active · N sources"
  - TX card reads "Approve all 4 pending"
  - Entity-dot click drills to `/rules/library?library=pending_review&jur=CA&entity=llc&from=coverage`
  - Hover entity code shows full label via tooltip
  - Empty rail shows "NEXT BEST ACTION — 123 rules need your approval"
    with FED 14 / NY 9 / CA 7 / TX 4 ranked clickable rows
  - Accept rule click reveals confirm strip; Cancel restores buttons;
    Confirm fires the mutation
  - j/k cycles focus through 7 rules in the CA rail (verified via DOM
    activeElement after dispatching KeyboardEvent)
  - Entity dots render at 80% opacity; interactive dots hit 100% on hover

## Heuristics scores before / after

| #         | Heuristic                       | Before    | After     | Change        |
| --------- | ------------------------------- | --------- | --------- | ------------- |
| 1         | Visibility of System Status     | 3         | 3         | –             |
| 2         | Match System / Real World       | 3         | 3         | –             |
| 3         | User Control and Freedom        | 3         | 3         | –             |
| 4         | Consistency and Standards       | 3         | 4         | +1            |
| 5         | Error Prevention                | 2         | 4         | +2            |
| 6         | Recognition Rather Than Recall  | 3         | 4         | +1            |
| 7         | Flexibility and Efficiency      | 2         | 3         | +1            |
| 8         | Aesthetic and Minimalist Design | 3         | 4         | +1            |
| 9         | Error Recovery                  | 2         | 2         | –             |
| 10        | Help and Documentation          | 2         | 3         | +1            |
| **Total** |                                 | **26/40** | **33/40** | **+7** — Good |

Heuristic 9 (error recovery) stayed at 2 because Accept/Reject still
toasts on error with "try again" but doesn't preserve the in-progress
state across re-mount. Worth revisiting if the rail becomes the
canonical surface — for now the two-step confirm covers the
larger error-prevention gap.

## Open items

- **`/rules/coverage` (v1) is still the canonical PRD route.** v6 is
  positioned for promotion but hasn't been swapped yet. Decision
  point: rename current `/rules/coverage` → `/rules/coverage-table`
  (or archive) and move v6 to `/rules/coverage` once we've sat with
  it for a few sessions.
- **Bulk-accept across the needs_approval lane** stayed out of scope
  (Casey persona red flag). Would need a multi-select pattern in
  either the cards or the rail.
- **Practice summary** lost its slot in the rail. If we miss the
  top-level catalog read after a few weeks, it could move into the
  page header instead of competing with the rail.
