# 2026-06-11 — Alert finish-pass (Yuqi page-feedback batch, /alerts + detail)

Closes out the remaining items from Yuqi's two /alerts feedback batches
(viewport 1512×861). Several items from those batches had already landed in
the prior session (breadcrumb #14, kbd-hints-to-top-bar #13, white header,
header meta consolidation #7/#10/#11, medium fact-grid fonts #8,
frame-in-frame #9, rail-item dimming); this pass ships what was still open
and de-dupes one regression the earlier pass left behind.

## List page header (`alerts.tsx` / `MonitoringChip.tsx`)

- **Matched-height chip pair (Yuqi #3)** — the green LIVE `MonitoringChip` is
  pinned to `h-[22px]` (`py-0`), the exact height of the `CountPill`
  ("N active") beside it in the page-header title row. The two stay
  semantically distinct (red count = work, green LIVE = heartbeat) but now sit
  as a matched pair instead of two near-miss heights.

## List toolbar (`AlertsListPage.tsx`)

- **Two-cluster grouping (Yuqi #1/#5)** — the `flex-1` spacer moved to sit
  directly after the Search + List/Map cluster, so the row reads as
  "find + view" on the left and every narrowing control (Suggested action ·
  Filters · State · Clear · Sort) flush right.
- **Shorter toggle label (Yuqi #2)** — "Show suggested action" →
  "Suggested action"; the whole control row now holds one line at 1512px
  (verified: all controls on a single wrap row).
- **14px toolbar type (Yuqi #4)** — both `Segmented` controls
  (`[&>button]:text-base`) and the page's `FilterTrigger`s / Clear-filters
  button (`className="text-base"`) bumped from the primitives' 11–12px to
  14px, matching the checkbox label that shares the row. Page-local
  overrides only — the global primitives keep their delicate default (that
  sizing was itself a prior Yuqi ask on the rules pages).

## Detail panel (`AlertDetailDrawer.tsx`)

- **One title per card (Yuqi #6/#7)** — GROUP 1 card renamed
  "The change" → **"Extracted facts"**, and the duplicated inner
  "Extracted facts" section header was deleted; its "AI parsed — verify
  before Apply" caveat now rides the card header's right slot.
- **Activity meta to the card band (Yuqi #11)** — the timeline's inner
  "Activity · N events · oldest first" header is gone; the
  "N events · oldest first" read-out renders in the "Activity & notes"
  card header via a new `alertActivityEventCount(detail)` helper that
  mirrors the timeline's event derivation.
- **Footer de-overlap (Yuqi #13 finish)** — the prior pass moved the A/D kbd
  hints to the top bar but left a duplicate cluster in the footer; that
  duplicate (plus its separator) is removed, which is what was squeezing
  Mark-reviewed into overlapping Dismiss. The audit-ledger note stays
  (xl-only). Footer padding `py-3 → py-4` for the requested bottom
  breathing room. Verified at 1512×861: zero `<kbd>` in the footer, two in
  the top bar, no button overlap.
- **Mark reviewed lands somewhere (batch-2 #3)** — marking reviewed resolves
  the alert off the active queue (it moves to Alert history), so the panel
  no longer sits on a stale record: on success it **advances to the next
  alert in the rail** (`onNext`) or **closes back to the list** when it was
  the last one. Toast gains "Moved to Alert history." so the hand-off is
  legible. This supersedes the earlier "stay in place" comment — staying
  put left the user on an alert that had just vanished from the queue
  they were working. The `A` hotkey path inherits the same landing.

## Canonical docs

- `docs/Design/section-header-style.md` — added the "one title per card"
  rule (a DetailSectionCard band title must not be repeated by an inner
  Register-C header; secondary meta belongs in the band's right slot).

## Verified

- `tsgo --noEmit` clean; no console errors on /alerts or the open detail.
- DOM-inspected at 1512×861: chip pair both 22px; toolbar single-line, all
  controls 14px; card headers read "Extracted facts | AI parsed — verify
  before Apply" and "Activity & notes | 3 events · oldest first".
