# Rule Library — review-table & header polish pass

Date: 2026-06-11 · Yuqi annotated feedback on `/rules/library?jurisdiction=…`

A batch of element-level polish from a live review of the jurisdiction
detail surface (FED, Review scope). Each item below maps to one annotation.

## Changes

### Jurisdiction rule table (`features/rules/jurisdiction-rule-table.tsx`)
- **Scope-aware columns.** New `scope` prop. In the **Review** scope the
  table drops two columns that carry no information there:
  - *Status* — every row reads "Needs review", redundant with the tab.
  - *Last modified* — candidates were never re-reviewed, so it's always "—".
  These stay in Active / All / Deprecated. The empty-state `colSpan` and the
  Missing-scope `GapRow` `colSpan` are now derived (`bodyColSpan`) so they
  track the visible-column count.
- **Review/Active order flipped** — Review is the primary tab, so it's first.
- **TYPE column widened** (`160px → 188px`) so the longest tax-type
  ("Federal Disaster Relief") reads in full instead of clipping. The table is
  `table-fixed`, so the extra width is borrowed from the flexible Rule-name
  column — no horizontal overflow.
- **Trailing chevron column removed.** The `›` implied navigation, but the row
  opens a modal (same as a plain click); it pointed nowhere, so it's gone in
  every scope (header + row cell + `GapRow` trailing cell).

### Jurisdiction header (`routes/rules.library.tsx`)
- **Jurisdiction mark = `StateBadge`.** The one-off grey mono "FED" pill was
  replaced with the canonical `StateBadge` seal — the same mark the rail shows
  for the selected row, so the detail header reads as the same identity. (The
  overview *matrix* keeps its text pills on purpose: a dense list of seals
  would be noise; a single header seal is not.)
- **Header action buttons → default size.** Export / Add / Sources moved from
  `size="sm"` (h-8, `rounded-lg`) to the default size (h-9, `rounded-xl`) so
  they match the filter-dropdown `FilterTrigger` chrome (also h-9 /
  `rounded-xl`) sitting just below them.

### Jurisdiction rail (`features/rules/states-rail.tsx`)
- **Count alignment.** The trailing rule count moved into a fixed-width
  right-aligned box (`min-w-[2ch]`) inside a small flex cluster with the amber
  review dot. A 1- vs 2-digit count no longer shifts the preceding dot, so the
  counts *and* the dots now form clean vertical columns down the rail.

## Verified live (preview, 1512-wide)
Review scope → `Rule name · Type · Effective · Severity`; Active scope →
all six (`… Last modified · Status`), chevron gone in both. Header shows the
FED seal + larger buttons; rail counts/dots align. `tsc` clean.

## Rail filter — chip → Segmented (`states-rail.tsx`)
The lone "Awaiting review" `ToggleChip` read as a static label, not a control
(Yuqi). Replaced it with an **All / Needs review `Segmented`** (`size="sm"`) in
the rail head — the same chrome as the per-jurisdiction Review/Active
Segmented, so it reads unmistakably as a filter. Wiring is unchanged
(`value = reviewOnly ? 'review' : 'all'`, `onValueChange → setReviewOnly`);
verified live that the active segment switches on click. `ListFilterIcon` +
`ToggleChip` imports dropped.

Note: the filter is still a no-op against the current demo seed — *every*
jurisdiction has ≥1 pending review (footer "Showing 51 of 51 states"), so
"Needs review" keeps them all. That's a data artifact, not a control bug; it
narrows the list once jurisdictions have mixed review states.

## Review-modal scroll residual — fixed
Closed in the follow-up section of
`2026-06-11-rule-review-modal-full-window.md`: scroll-free at 861px height by
trimming the hero (183→161px) + Decision footer (159→122px) + scroll-body
padding, rather than adding columns (balanced columns are floored by the
tallest card). No concurrent session on this surface after all.

## Note: shared file with a concurrent session
`jurisdiction-rule-table.tsx` was edited in parallel by another session
(severity/status pills → `Badge` variants). The two changes merged cleanly
(their `Badge` cells inside my `showStatus`/`showLastModified` conditionals);
`tsc` + the existing test count (7 pass / 10 pre-existing fails, unchanged
from baseline) confirm no regression from this pass.
