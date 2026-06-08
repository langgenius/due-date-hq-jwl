# Alert detail drawer — fewer frames, light background, cohesive cleanup

Date: 2026-06-08

Feedback: _"the Alert detail is looking ugly! avoid using too many frames."_
A cohesive cleanup pass across `AlertDetailDrawer`, `AlertListRail`, and
`AlertStructuredFields`.

## Structure / surface

- **Light background (#13)**: the panel `<aside>` sits on a soft `#fafbfc`
  wash instead of stark white. The white SheetHeader/SheetFooter chrome
  frames the top/bottom against it.
- **Remove the big frame (#12)**: the sections no longer live in a bordered
  white card-within-a-card (the `rounded-[12px] border` "Aogxu" wrapper).
  They're a flat `divide-y` stack flush with the body's `px-12` margin, on
  the light wash — one calm document instead of nested cards. DeadlineChange
  card dropped its own white fill too.

## Top bar / navigation

- **Height-matched to the rail (#2)**: the back-strip is `h-[52px]`, aligned
  to the rail's "Alerts · N active" header.
- **Removed ▲▼ paging buttons (#5)** and wired **ArrowUp/ArrowDown** to
  prev/next instead (#4) — the left rail stays the primary click navigator;
  arrow keys are ignored while typing in a field. Keeps the "N of M" read-out.

## Decision banner (#3, #7, #8)

- Now a single compact row: warning icon + "Pending your review" left, the
  confidence/due meta right. Dropped the verbose "AI extracted…" sentence
  (#7) and the source-corroboration chip. The meta uses the **/today card's
  sans `conf 94% · due in 8 days`** treatment (was bold mono "Confidence 94")
  (#8).

## Badges

- **Header jurisdiction (#10)**: generic `FlagIcon` → canonical circular
  `StateBadge` motif + code + name.
- **Rail item (#9, #14)**: added the circular `StateBadge` to the
  jurisdiction chip; change-kind restyled to the /today card's sans
  `font-semibold tracking-[0.4px] text-tertiary`.

## Content

- **DeadlineChangeCard (#11, #15)**: the new date drops 18px → 15px so the
  old→new pair reads as one tidy line, not an oversized headline.
- **Removed the redundant source link (#16)** above the EXTRACTED FACTS grid
  — the source is already in the header, Provenance, and the Authority cell.

## Footer (#18)

- Single row: keyboard hints + audit-ledger note on the left (revealed on
  `xl+` where there's room), the DrawerActions cluster filling the rest —
  no more two-row stack.

## Not done

- **#6 ("what is the responsive rule for this?")** is a question — answered
  inline to Yuqi (the detail pane is `flex-1`, filling the width left of the
  fixed 380px rail; there's no narrow-screen breakpoint yet).
- **#17 ("remove")** — couldn't unambiguously identify which element from
  the selector; left for Yuqi to point at directly.
- **#1** (Filters consolidation) landed in a prior pass.

## Preview note

The shared `:5177` dev server is intermittently serving a stale build (the
`ddhq-deadlines-parity` worktree's `deadlines-at-a-glance.tsx` keeps
breaking Vite), so this was verified by typecheck + lint + source review.
