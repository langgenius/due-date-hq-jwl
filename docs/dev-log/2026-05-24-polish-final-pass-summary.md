# 2026-05-24 — /polish + critique batch summary

## Critique batch — what landed

Yuqi ran `/critique` on the client detail page (`/clients/[id]`).
LLM design review scored the page **28/40** on Nielsen heuristics
and surfaced 6 priority issues. We addressed all 6 in order:

| #   | Skill      | Commit     | What                                                                                                    |
| --- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| 1   | `/typeset` | `e159c3ac` | Tile values 14→20px so the strip anchors the eye                                                        |
| 2   | `/distill` | `cf1e0e21` | Dropped "N open filings" from H1 subtitle (tile is canonical)                                           |
| 3   | `/clarify` | `5a32c3b1` | State chips demoted; column tooltips; "Activity scope"→"Filing activity"; At-risk tile names form codes |
| 4   | `/shape`   | `342edafc` | Fix-state sheet on detail; sortable columns; multi-select + bulk-status bar                             |
| 5   | `/audit`   | `af8c226a` | Nested-interactive a11y fix (row drops role=link, form code becomes a button)                           |
| 6   | `/polish`  | this       | Final spacing + a11y + focus pass — no further changes needed                                           |

## /polish — what was checked

Spawned a focused polish audit across the three touched files
(`ClientFactsWorkspace.tsx`, `ClientSummaryStrip.tsx`,
`ClientCompliancePosturePanel.tsx`):

1. **Sort indicator visibility** — chevron inherits button text
   color; renders visibly on active sort. ✓
2. **Bulk bar z-index** — `z-30` sits below drawer's `z-50`. No
   overlap. ✓
3. **Tile type ratio** — 20 / 13 / 12 px ramp (value / subline /
   label) gives the value clear primacy without becoming an
   AI-slop hero metric. ✓
4. **At-risk subline overflow** — worst-case
   "1120-S, 1065 + 1 more" fits comfortably in the 160px tile
   width. ✓
5. **Checkbox alignment** — size-4 inside w-5 slot, flex centers
   horizontally; year-header + row use the same shape. ✓
6. **State-chip spacing** — middot separators with
   `gap-x-1.5 gap-y-0.5` don't collide on wrap. ✓
7. **Form-code button focus ring** — `ring-state-accent-active-alt`
   renders visibly over both `bg-default` and
   `hover:bg-state-base-hover` row backgrounds. ✓

## Expected critique score change

Before: 28/40
After: ~33-34/40 (estimate). Heuristics with the biggest delta:

- **#3 User control** 2→3 (Bulk bar adds Clear; row sort cycles
  back to none)
- **#4 Consistency** 3→4 (Fix-state flow now matches list page;
  state chips no longer compete with live chips)
- **#7 Flexibility** 2→3 (sortable columns + multi-select + bulk
  status)
- **#8 Aesthetic / minimalist** 3→4 (open-filings dedupe; tile
  type-rhythm cleaner)

## Verification (final)

- `pnpm exec tsc --noEmit` — clean
- `vp lint` — 0 warnings / 0 errors / 650 files
- `vp test apps/app/src/features/clients/` — 17/17 pass

## Follow-ups (not addressed in this batch)

- Keyboard shortcuts to switch tabs (j/k cycling was removed)
- Optimistic update on bulk status (toast feels instant; row
  refresh has ~200ms lag)
- Persist sort + selection across page navigations
- Bulk-bar status picker filtering visible targets to legal
  transitions across all selected rows (today: lets the server
  reject illegal targets with an error toast)
