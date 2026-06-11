# /deadlines detail page — date strip joins the white header zone

2026-06-10 · Yuqi · page mode (`isPageMode`) only — `/clients` panel + sheet
modes untouched.

## Why

After the recent passes (white-hero / gray-content, then the 3 date cards
flattened to bare columns), the date strip read as the first thing in the gray
tab-content rather than as part of the identity block. Yuqi's 5 items:

1. 好奇怪的 top padding in the header/hero top.
2. The "Open {client}" chip in the meta row was 太小.
3. The flattened date cards lost their frame — too bare.
4. (key) Should the date strip be part of the header? Yes.
5. The header/date-strip region must be on the white surface.

Target: a clean 3-zone result — **white header** (status banner · title + meta ·
framed key-date columns) → **gray tab content**.

## What changed

Two files only: `ObligationQueueDetailDrawer.tsx` and `components/panels.tsx`.
All changes gated to page mode.

### #4 + #5 — date strip into the white header

- The page-mode `<header>` switched from `bg-background-subtle` (gray) to
  `bg-background-default` (white). It now reads as the white identity block,
  contiguous with the crumb bar + status banner above it (both sit on the white
  aside root).
- `PrimaryDeadlineStrip` (variant `cards`, the "Key deadlines" strip) is now
  rendered INSIDE `<header>` as its third line, after the title/meta. It stays
  visible even when the hero collapses on scroll (the anchor dates are the
  headline context the collapsed hero keeps).
- The body's date-strip block is now wrapped in `{!isPageMode ? … : null}` —
  panel/sheet modes keep it as the leading body block (sticky in the panel rail,
  a plain spacer in the sheet) exactly as before.
- The gray wash (`bg-background-subtle`) now begins at the tab content: the
  sticky tab bar is the first gray element under the white header, so the
  white→gray seam lands cleanly at the tab bar.

### #3 — frame back on the date cards

- `DeadlineDateCard` (the `cards` variant column) regained a subtle outline:
  `rounded-lg border border-divider-subtle px-3 py-2.5`. Kept FLAT — no filled
  `bg-background-subtle`, no shadow. Frame for definition, not a heavy tile.
  Overdue state stays a text-colour cue on the icon + date.

### #1 — top padding

- The page-mode hero leads the surface (the thin status banner + crumb bar carry
  no top gap), so the canonical `pt-10` doubled the visual top inset. Page mode
  now uses `pt-6`; panel/sheet keep `pt-10`. Refactored the header pt classes so
  each mode picks its own non-collapsed top padding cleanly.

### #2 — client link size

- The "Open {client}" chip went from `text-caption` + `px-2.5 py-1` to `text-sm`,
  an `h-7` chip height, `px-3` hit area, and a `size-4` icon — it now reads as a
  proper tappable chip consistent with the `h-6` status/flag chips beside it.

## Verification

- `tsgo --noEmit` on the app package: clean (exit 0).
- `vp test -- obligations`: 7 files, 89 tests passing.
- `check:tokens`: no new violations from these files (only pre-existing baseline
  debt in unrelated files).
- `vp fmt --write` on both files.

## Notes

This intentionally diverges from the strict alert-parity surface model (which had
the header on the gray-wash document). Per Yuqi #4/#5, the header + key dates
belong on the white surface; the gray wash starts at the tab content. The
sticky-tab-bar opaque fill and the header collapse-on-scroll behavior are
preserved.
