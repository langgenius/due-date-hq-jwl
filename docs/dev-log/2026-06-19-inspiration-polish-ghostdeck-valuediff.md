# Inspiration board → implementation: ghost-deck + ValueDiff

_2026-06-19 · first build pass from [inspiration-board-matches](../Design/inspiration-board-matches-2026-06-19.md)_

User picked two targets from the board: the polish pass + the before→after diff.
Verified each against the real code first (the vision agents flagged "net-new"
loosely) — most of the polish bundle turned out already-built or canon-conflicting,
so only the genuinely-additive pieces shipped.

## Verified already-done / skipped (no change)

- **Status-chip icon+text co-coloring (img-196)** — already done.
  `STATUS_ICON_COLOR_ON_PILL` (status-control.tsx) already tones the icon to the
  pill's text hue "so the chip reads as one coherent color." No change.
- **No icon-doubling in dense table (img-171)** — already true. The compact status
  control renders the `StatusRing` mark alone (no label, no second icon). No change.
- **Severity left-rail accent bar (img-058)** — **skipped, would regress canon.**
  The row's left 2px edge is already the canonical hover/active interactive accent
  bar (`shadow-[inset_2px_0_0_...]`, the TableRow treatment app-wide), and the
  design has a hard rule: _a row never wears two reds — neutral tag, red pill only._
  A severity left-bar collides with both. Not built.

## Shipped

### 1. Ghost-card deck empty-state visual (img-055)

`EmptyState` gains an opt-in `visual?: 'icon' | 'ghost-cards'` (prominent only,
default `icon` — nothing else changes). `ghost-cards` renders a restrained fanned
deck: two faint cards angled ±6° behind a front card with three blank skeleton bars.
Borders + section-tint only, **no shadows** (restrained-shadows canon). It implies
"cards will stack here" without faking rows — passes "no fiction on canvas" because
the cards are explicitly blank.

Wired into the `/alerts` empty feed (`AlertsListPage`) — the strongest semantic fit
(an empty feed fills with alert cards; copy already says "it will land here").
Dropped the now-unused `MegaphoneIcon` import. Specimen added to `/preview`.

### 2. `ValueDiff` primitive — canonical before→after (img-153)

New `primitives/value-diff.tsx`. A regulatory change is structurally a diff (a date
moves, a form is superseded), so it gets one primitive instead of per-surface spans.

- `mode="inline"` (default): old (struck/muted) → arrow → new (emphasised) + optional
  toned delta. **Pixel-identical** to the hand-rolled diff it replaces.
- `mode="compact"`: a tight `old › new` chip; full diff + delta surface on hover
  (Tooltip). For dense rows (audit-log, activity) where inline is too wide.
- Tone stays single-sourced: the caller passes `deltaClassName`
  (`DUE_DATE_DIFF_TONE_CLASS[...]`), so "sooner=red / later=green" keeps its one home
  in `due-date-tone.ts`; color encodes the delta only.

De-duped `PulseAlertRow`'s inline date-shift diff to consume it (one home; dropped
the now-unused `ArrowRightIcon`). Specimen (inline + compact) added to `/preview`.
Added to the §4.11 primitive index in DueDateHQ-DESIGN.md.

## Verification

- `tsgo` 0; build green; i18n unchanged (refactor reuses existing strings).
- Live `/preview`: ghost-deck renders (184×76, both fanned cards); ValueDiff inline
  (struck old + arrow + new + delta) and compact (2 hover chips) render; fresh load
  clean, no error boundary. (A stale `ValueDiff is not defined` lingered in the
  cumulative console buffer from the brief window before the import was added —
  gone on fresh render; build confirms the import resolves.)
