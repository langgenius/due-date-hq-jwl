# StatusRing — progress-ring status mark (prototype)

_2026-06-18 · inspiration-driven (Yuqi shared status-badge references)_

A prototype alternative to the obligation status glyph set
([obligation-status-icon-vocabulary.md](../Design/obligation-status-icon-vocabulary.md):
`Loader` / `Hourglass` / `Construction` / `MessageSquareText` / `FileCheck` /
`CircleCheck`). The references all used a **progress-ring** motif where the icon
fills as work advances — valuable here because "status is the primary key" and
CPAs scan long queues, so encoding _how far along_ a deadline is (not just _what
state_) at icon size is a real scan-speed win.

## What shipped (prototype only — NOT yet adopted app-wide)

`apps/app/src/components/primitives/status-ring.tsx` — `<StatusRing level>`:

- Happy path fills the ring: `not_started` (empty dashed) → `in_review` (50% arc)
  → `filed` (85% arc) → `completed` (solid disc + check).
- Off-path states break the ring with a distinct glyph (not "more progress"):
  `waiting` (pause bars), `blocked` (slash).
- Monochrome via `currentColor` — a drop-in for a lucide glyph; the parent's
  status tone class drives the color. Partial-ring track is the same hue at 0.25
  opacity, so each mark stays one color. Maps to the 6-state v2 collapse.

Added a side-by-side `/preview` comparison ("Status — current glyph" vs
"Status — ring (proposed)") so the two sets sit next to each other for the call.

## Verification (live, dev server /preview)

- All 6 pills render; tones inherit correctly (gray / coral-warning / red / navy /
  green / green). Arc fills measured exact: dashed `2 2.2`, in-review `18.85/37.7`
  (50%), filed `32/37.7` (85%), completed solid disc. `tsgo` 0.

## If adopted

Swap `STATUS_ICON` (status-control.tsx) to return `<StatusRing level={…}>` per
status — every surface that renders status (pills, dropdowns, filter tabs) picks
it up at once. Decision pending Yuqi's look at the live comparison; the current
glyph set stays shipped until then.
