# 2026-05-26 — Eighty-first pass: detail page revamp + rule-library critique

## Context

Continuation of the /clients family pass. Three threads landed in
this pass:

1. **/clients/[id] detail page revamp** — full scroll mechanism +
   tab restructure + cycle arrows + tile shell + 14-item polish
   batch from Yuqi's page-feedback dump.
2. **Rule-library top progress bar** — restored after the
   seventy-second-pass scoreboard retire dropped it.
3. **Two design critique docs** + macro→micro audit for the
   /clients family + post-revamp critique on /clients/[id] +
   /critique on /rules/library scoring it against /alerts +
   /deadlines + /today.

## Detail-page revamp (the big rock)

`/clients/[id]` adopts the canonical sticky-footer + table-card +
independent-scroll mechanism that /deadlines and /alerts use.
Before: page-level scroll, PageHeader scrolled away when the user
reached row 30 of a long Filing plan. After: PageHeader +
ContactMetaRow + summary tiles + tab bar pinned above; only the
active TabsContent scrolls.

### Structural

- **Outer container** (`routes/clients.$clientId.tsx`): Regular
  variant → Sticky-footer (`gap-4`, `pb-0`, `xl:h-screen
xl:overflow-hidden`). Matches /deadlines + the post-revamp
  /clients list.
- **Workspace flex**: outer page is `flex-col` on small viewports
  and `xl:flex-row xl:items-stretch` at xl+. Left column hosts
  pinned chrome + scrollable tab content. Right rail mounts the
  obligation panel.
- **TabsContent scroll**: each tab body is now `flex min-h-0
flex-1 flex-col overflow-y-auto pt-4 pb-6`. PageHeader and
  metadata sit above the tab body; only the body scrolls.

### Page chrome polish (14-item Yuqi-feedback batch)

1. **Cycle arrows on the breadcrumb line.** `ClientCycleArrows`
   moved from the title cluster to PageHeader's `eyebrowAside`
   slot — sits next to `< Clients` with space-between.
2. **⋯ overflow button is square.** Switched from `size="sm"`
   (h-8 with horizontal padding = rectangle) to `size="icon-sm"`
   (h-8 w-8 = true square).
3. **TileShell canonical card chrome.** Dropped the raw-hex
   `bg-util-colors-gray-25` off-white + `rounded-xl` + uppercase
   kicker label in favour of `bg-background-default` +
   `border-divider-subtle` + `rounded-md` + sentence-case label
   per `inset-surface-design-system.md` §card-chrome.
4. **Entity badge unification.** No change — already matches the
   `<Badge variant="outline">` shape used by peek/drawer.
5. **Owner pill larger click area.** h-7 + size-5 avatar +
   size-3.5 chevron (was h-auto + size-4 avatar + size-3
   chevron).
6. **Tab bar transparent.** Removed `bg-background-default` from
   the TabsList; reads as a transparent row above the content.
7. **Tabs hug labels.** Overrode the primitive's `flex-1` per
   trigger so each tab takes its content width. Bumped to
   `text-base` + `px-3 py-1.5` to match /deadlines's scope-tab
   proportions.
8. **Estimated Tax column dropped from filing-plan rows.** When
   the obligation panel opens the left column squeezes to
   ~430px; with 5 cols the FORM cell got squeezed below readable
   width. The tax figure still surfaces in the obligation drawer
   Summary tab.
9. **Year section header is a real header.** Bumped from
   `text-sm font-medium` to `text-base font-semibold` + soft
   `bg-background-subtle` + `border-b border-divider-subtle`.
10. **Same as 9.**
11. **Cramped spacing fixed by sticky-footer's gap-4.**
12. **Page no longer scrolls as a whole.**
13. **TabsContent scrolls independently.**
14. **Right panel mounts at canonical 600px** — matches
    /deadlines. Plain conditional aside (no motion slide-in yet —
    AnimatePresence+motion.div animation got stuck mid-animation
    in the new flex-stretch layout; replaced with a snap mount.
    CSS-only slide-in is a follow-up.)

### Macro→micro audit fixes (carried from the earlier session)

- **Outer container** (`routes/clients.$clientId.tsx`): added
  `mx-auto max-w-page-wide`.
- **Title cluster reduced** to title + 1 conditional readiness
  chip per canonical (page-family-canonical §3). Entity / owner /
  states moved to `ClientContactMetaRow`.
- **Archive moved to ⋯ overflow** so destructive actions don't
  sit cheek-to-cheek with the primary CTA.
- **"Add filing state" badge tone** — destructive → warning.
- **5 uppercase kicker labels retired** at lines 1074, 3258,
  4560, 4568, 4612 + the "Suggested" header. Sm-semibold
  sentence-case per page-family-canonical §9.
- **Tab section-frame unified** — Work tab's year panels swap
  `rounded-xl bg-soft border-subtle` → canonical `rounded-md
bg-default border-regular`.
- **"Discover" tab → "Opportunities"** (URL key stays).
- **Client info tab dot → count chip** when missing-facts > 0.
- **`ClientCycleArrows` remounted** with j/k hotkeys.

### Conflict resolution (rebase onto main)

Main shipped a new `buildClientHeaderContactItems` helper that
pre-resolves contact / email / phone / address items, filtering
out malformed migration data. Merged: kept my
entityLabel/ownerSlot prop signature on `ClientContactMetaRow` +
adopted the builder pattern for contact items.

## Rule-library top progress bar restored

Per Yuqi: "rule library 最上面的进度条放回来吧， 不要删掉". The
72nd-pass scoreboard retire dropped it. Restored as a dedicated
`RuleReviewProgressBar` component with `loading` + `loaded`
variants. Green active-LEFT + amber needs-review-RIGHT canonical
completion-meter direction.

## Critique docs

Three new docs in `docs/Design/`:

- `clients-family-macro-micro-audit-2026-05-26.md` — macro→micro
  consistency audit of /clients + /clients/[id]. Catalog of 11
  fixes across two PRs.
- `clients-detail-critique-2026-05-26-post-revamp.md` — heuristic
  scoring of /clients/[id] after Rounds A+B landed. Score: 29.5/40
  (up from 23/40 baseline).
- `rules-library-critique-2026-05-26.md` — Rule library scored
  against /alerts + /deadlines + /today. Score: 23/40. P0 = page
  doesn't follow the canonical structure (no sticky-footer, no
  table-card, no scope tabs). 8-hour action plan documented.

Plus updates to:

- `page-family-canonical.md` — /clients moved Regular →
  Sticky-footer variant.

## Files touched

- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
  (workspace restructure + tab bar + ContactMetaRow + cycle
  arrows + filing-plan year header + Estimated Tax column drop +
  rebase conflict resolution)
- `apps/app/src/features/clients/ClientSummaryStrip.tsx` (TileShell
  canonical card chrome)
- `apps/app/src/routes/clients.$clientId.tsx` (sticky-footer outer
  container)
- `apps/app/src/routes/clients.tsx` (no changes this pass; earlier
  Phase 1 + table-card landed pre-rebase)
- `apps/app/src/routes/rules.library.tsx` (progress bar restored +
  RuleReviewProgressBar component)
- `apps/app/src/components/patterns/table-header-filter.tsx`
  (no changes this pass; earlier FilterTrigger toolbar swap)
- `.claude/launch.json` (added `app-5189` for the jolly-hopper
  worktree)
- `docs/Design/page-family-canonical.md`
- `docs/Design/clients-family-macro-micro-audit-2026-05-26.md` (new)
- `docs/Design/clients-detail-critique-2026-05-26-post-revamp.md` (new)
- `docs/Design/rules-library-critique-2026-05-26.md` (new)

## Verification

- `vp check` clean on all touched files
- Browser verification at 1920×992 viewport confirmed each of the
  14 polish items
- Right panel measured at 600px after rebase
- Cycle arrows visible on breadcrumb line
- Year section header reads as a real header
- Filing plan rows fit 4 columns when panel opens
