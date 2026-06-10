# Comment cleanup — features/clients, 2026-06-10

**Who/why:** Automated comment-hygiene pass — trimmed verbose dated change-history narration from source comments in `apps/app/src/features/clients/`, keeping the load-bearing WHY (constraints, footguns, cross-surface parity rationale) and dropping date/attribution/"changed-from-X" history. Comments only; no code, JSX, props, or copy changed.

## Touched files

- **`ClientFactsWorkspace.tsx`** — the only file with remaining dated comments. ~47 dated comment-lines addressed:
  - **Deleted (~6 pure-narration comments):** retired-`DetailSection` note, retired-`onAlertFilterChange` prop note, retired header-filter-open-state note, two `table sweep` "overrides REMOVED" JSX nodes, one skeleton-header "overrides dropped" JSX node, the Step-8/HEAD merge-history JSX node, and the orphaned `ClientAssigneeAvatar` shim-removal narration blocks.
  - **Trimmed (~30+ mixed comments):** stripped dates/attribution and "bumped/dropped/moved/was-previously" narration while preserving the present-tense WHY — e.g. responsive page-size rationale, row-height/`CLIENTS_COL_WIDTH` sync constraints, outline-badge identity-strip reasoning, next-due composite-cell structure, left-align numeric rationale, `Filed` vs `Filed YTD` labeling, toolbar/collapsible-search pattern, selected-row inset-shadow technique, table-container chrome footgun (rounded-corner sliver), accessible-name aria-label alignment, status-pill "filled chip → no dot" rule.

## Left untouched (out of scope / pure WHY)

- `ClientWorkPlanPanel.tsx:298` and `ClientsCreateSplitButton.tsx:36` — the only dated tokens are inside `docs/Design/*.md` filenames attached to a kept WHY (per the keep-the-doc-ref rule).
- `ClientFactsWorkspace.tsx:630` — same: `docs/Design/...-2026-05-22.md` filename attached to a kept WHY.

Formatted with `vp fmt --write`. Diff verified comments-only (242 insertions / 430 deletions, all comment text). tsgo not run per instructions; not staged/committed.
