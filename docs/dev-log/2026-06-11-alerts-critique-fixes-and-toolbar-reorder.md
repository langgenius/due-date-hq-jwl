# 2026-06-11 — Alerts critique fixes + toolbar reorder (Yuqi batch 3)

Fixes every finding from the structured design critique of the alert detail
page, plus Yuqi's third /alerts feedback batch (toolbar + row polish).

## Critique fixes (detail panel)

- **A-key hint now tells the truth** (`AlertDetailDrawer.tsx`) — the top-bar
  hint read "A Apply" on review-only / no-match alerts where `A` actually
  fires Mark reviewed. The label now tracks the same `noActionReview` branch
  as the hotkey handler + footer CTA: "A Review" vs "A Apply".
- **Fact grid de-duped + un-truncated** (`AlertStructuredFields.tsx`) — the
  generic CHANGE TYPE cell is gone (the header chip names it verbatim 60px
  above); the slot renders only when a deadline-shift alert carries a real
  AI relief type. Values `truncate` → `line-clamp-2 break-words`. A white
  filler cell pads the hairline matrix to a full row (the divider-colored
  wrapper bg showed through unfilled slots).
- **One date format** — PUBLISHED was ISO (`2026-05-20`) while every
  neighboring date was pretty; now `formatDatePretty(…, alwaysShowYear)`.
- **One micro-label register** — the protective-claim panel's mono-bold
  caption labels → the grid's B2 register (sans 12/500 CAPS tertiary);
  panel values semibold → medium (weight-restraint rule).
- **No frame-in-frame** — the soft boxes inside cards (dup-merge note,
  threshold note, protective panel, source-excerpt quote) drop their 1px
  border; borderless `bg-background-soft` like the drawer's other insets.

## Rail fixes (`AlertListRail.tsx`)

- **Time column de-stuttered** — `formatRelativeTime` falls back to "May 20"
  past one week, duplicating the date line above; the relative line renders
  only when it differs from the date.
- **Zero-match rows drop "No matching clients"** (also in `PulseAlertRow`) —
  repeated on every advisory row it was noise that buried the rows that DO
  affect clients.
- **Hover = canonical accent motif** — accent wash + left accent bar on
  hover (the 2026-06-10 hover-accent-bar follow-up this rail was owed).

## List rows (`PulseAlertRow.tsx`, batch 3 #3–#6)

- **Hover state** — gray wash → the canonical interactive-row treatment:
  `bg-state-accent-hover` + `inset 2px` left accent bar; the active row
  carries the same bar so hover→selected reads as one motif.
- **Change-kind label demoted** (#5 "too obvious") — xs/semibold/tertiary →
  caption-xs/medium/muted. Classification metadata, not a signal.
- **Title** — off-scale `text-[16px]`→`text-lg` token, secondary→primary ink
  (the title is the row's primary read).
- **ACTION chip on tokens** — hardcoded `#FFFBEB`/`#92400E` →
  `bg-state-warning-hover` + `text-text-warning`.

## Toolbar (`AlertsListPage.tsx`, batch 3 #1/#2/#7/#8)

- **Order** — narrowing controls lead: [Review/Active] [Search] [Filters]
  [State] [Clear] ‖ spacer ‖ display controls right: [Suggested action]
  [Sort] [view icons].
- **One labeled toggle per row** (#1) — List/Map is now an icon-only
  Segmented at the far end (aria-labels intact), so it reads as a view
  switcher, not a second queue toggle.
- **Filters more obvious** (#7) — `variant="saved"` gray fill at rest +
  primary ink; switches to the accent wash when filters are active.
- **"Suggested action" smaller** (#2) — text-base/medium → text-sm/400.

## Verified

- tsgo clean, no console errors. DOM-probed at 1512×861: toolbar order as
  specced; Filters chip gray-filled w/ primary ink; row hover carries accent
  - inset bar; change-kind 11/500 muted; zero "No matching clients" rows;
    detail hint reads "A Review" on a review-only alert; grid = 7 cells, no
    CHANGE TYPE, "May 20, 2026", 7 values clamped; protective labels sans
    12/500; soft boxes 0px border.
