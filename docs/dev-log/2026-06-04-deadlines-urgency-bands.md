# 2026-06-04 — /deadlines: urgency-band grouping + production table recreation (h4bQ2)

Yuqi: recreate the Pencil design `h4bQ2` ("/deadlines — Production recreation") 1:1 in code,
applying the Today/Alerts table + general style to the Deadlines page — especially the table.

The Deadlines queue (`apps/app/src/routes/obligations.tsx`) was on the older client-grouped table
with a different column set. The design reshapes it into an **urgency-banded** table matching the
Today/Alerts visual system.

## Change (all in `apps/app/src/routes/obligations.tsx`)

- **New `urgency` group mode, now the default.** `GROUP_OPTIONS` gains `'urgency'`; `DEFAULT_GROUP`
  → `'urgency'`. Rows cluster under band headers **Overdue / Due this week / Upcoming**, derived
  from the INTERNAL (effective) due date via the existing
  `daysUntilEffectiveInternalDueDate` helper (`<0` overdue, `0..7` this week, `>7` upcoming — same
  thresholds as the toolbar Past-due/This-week chips). New exported helpers `urgencyBandOf` +
  `URGENCY_BAND_ORDER`. The band-grouping extends the existing group-header / collapse machinery
  (`groupHeadersByFirstRowId`, `collapsedClientGroups`) — `client` and `due` modes are unchanged.
- **Band header row.** Collapse chevron + colored `BadgeStatusDot` (error/warning/normal) + 13px/600
  uppercase band label + count `Badge` (destructive/warning/outline, mirroring the Today
  `TIER_CHIP_VARIANT`) on the left; a **static** muted caption on the right for the Overdue band
  (`≈12d avg · ≈$11,840 penalty exposure`). The caption is hard-coded placeholder text —
  `estimatedExposureCents` is omitted from `ObligationQueueRow`, so there is no real penalty total
  to compute yet (noted inline). Band-header surface is `bg-background-section` (#f9fafb).
- **Columns reshaped to the design** via TanStack `columnOrder` (avoids a risky 600-line literal
  reshuffle): ☐ · **Filing** (taxType, 180) · **Client** (240) · **State** (160, default-visible
  now) · **Assignee** (90) · **Internal due date** (currentDueDate, 180, active sort) · **Official
  due date** (180, NEW — `filingDueDate`, null-guarded) · **Status** (fill). Smart-Priority +
  Evidence stay hidden (dropped from the design). `Tax type` header relabeled **Filing**.
- **Default sort → `due_asc`** (internal due ascending, most-overdue first) so the bands fall out
  contiguously and the Internal-due header shows the blue active-sort ↑.
- **Table chrome**: already inherits the canonical `table.tsx` recipe (rounded-[12px] outer card +
  `border-divider-regular`, `bg-background-section` header, no zebra, `data-[state=selected]:
  bg-state-accent-hover` = #eff4ff). No chrome change needed.

## i18n

New strings (`Filing`, `Official due date`, `Urgency`, `Expand/Collapse {bandLabel}`, the static
caption) added to `en` + `zh-CN` catalogs; band labels (`Overdue`/`Due this week`/`Upcoming`) already
existed. Also fixed a pre-existing **broken `Internal due date` zh-CN translation** (was the fuzzy
auto-suggestion "内部备注已起草" → corrected to "内部到期日"). NOTE: `i18n:compile --strict` still
fails on this branch due to a **pre-existing 110-string zh-CN backlog at HEAD** (mostly the
in-flight pulse work in this worktree) — unrelated to this change. Compiled non-strict so the new
strings render. The backlog should be drained in a dedicated i18n pass.

## Validation

- `tsc --noEmit` — clean.
- `apps/app` unit tests — 51 passed, incl. 5 new `urgency band derivation` cases (boundary days
  -1/0/7/8, extension-target banding, band order).
- Browser check on `/deadlines` (e2e `obligations` seed, 1920×1080) vs `h4bQ2`: column order +
  widths, 11px uppercase headers, 13px/600 band label, blue Internal-due ↑, Official-due dates from
  `filingDueDate`, rounded-12 bordered card — all match. (Seed clients lack `clientState` so STATE
  shows "—", and the seed is all past-due so only the Overdue band appears — demo-data limitations,
  not code.)

## Follow-up: infinite scroll replaces pagination

Yuqi: "should be an infinite scroll, not a pagination."

Replaced the client-side prev/next page window with infinite scroll, mirroring the
`/rules/library` IntersectionObserver pattern:

- The table now renders the **full `useInfiniteQuery` buffer** (`data: rows`) instead of a
  `responsivePageSize` slice. Removed `pageIndex`/`pagedRows`/`safePageIndex`/`totalLoadedPages`
  and the unused `ChevronLeftIcon` import.
- The rows-area is now an `overflow-y-auto` **scroll container** (`scrollContainerRef`), and the
  `TableHeader` is `sticky top-0 z-10` (already `bg-background-section`) so column labels stay put
  while scrolling.
- A 1px invisible **sentinel `<tr>`** at the bottom of the body, observed by an `IntersectionObserver`
  (root = the scroll container, `rootMargin: 256px`), calls `fetchNextPage()` when it nears the
  viewport — guarded by `hasNextPage && !isFetchingNextPage`.
- The prev/next footer control is replaced by a single keyboard/touch **"Load more"** fallback
  button (reuses the existing string; shown only while `hasNextPage`). A sort change scrolls the
  container back to the top.
- No new i18n strings.

Verified in-browser: no Pagination control, `overflow-y-auto` scroll container present, sticky
header (`position: sticky; top: 0; z: 10; bg #f9fafb`). (The `obligations` seed returns only 4
rows → `hasNextPage` is false, so the sentinel + Load-more correctly don't render; the fetch-on-
scroll wiring is the same proven pattern as `/rules/library`.) tsc clean; 51 unit tests pass.

See `docs/Design/table-canonical-style.md` (chrome inherited) and the Pencil node `h4bQ2`.
