# /today accent budget + primitive audit (2026-06-12, round 4)

Yuqi: "are you missing anything? also bring in accent colours if you need
to." Self-audit found three genuine misses — two were existing-spec
violations, not new design:

## 1. Section links were hand-rolled, not `<TextLink>` (vocabulary violation)

"View all N" (`needs-attention-section.tsx`) and "See all deadlines"
(`merged-brief-card.tsx`) were inline `<Link className=…>` recreations of
exactly the pattern `<TextLink>` exists for — and `section-header-style.md`
already prescribed TextLink for Register-A headers. Both now
`<TextLink variant="accent" render={<Link …/>}>` with the arrow-nudge glyph
kept. Accent makes the page's two go-to-the-full-list affordances read as
links instead of gray meta.

## 2. `DueDateLabel` "today" rendered gray, violating its own contract

The component's header comment always specified "Live tone: destructive for
past, **accent for today**, secondary for future" — the implementation
lumped today into future-gray. Now `days === 0` → `text-text-accent`.
App-wide (every dashboard/queue/filing-plan row), spec-true. On /today a
due-today row now shows a big accent "today" (16/600 via the round-3 size
step), distinct from red "Nd late".

## 3. Smart Priority sparkle was gray at rest

`today-actions-table-style.md` says accent belongs on exactly the Smart
Priority marks — but the Priorities header sparkle was `text-text-tertiary`
with accent only on hover. Now accent at rest (`hover:text-text-accent-secondary`).

## Resulting color story (measured)

- **Red** = lateness only: the 16/600 "Nd late" countdowns.
- **Accent** = navigation + intelligence + today: View all / See all
  TextLinks (12/500 accent), sparkle, due-today countdown, plus the
  pre-existing In-review pill, scope toggle, citation chips.
- **Green** = LIVE monitoring chip.
- Everything else neutral, repeated anchors at 500.

Honest caveats: due-today accent not exercised by current demo data (all
visible rows are late); verified by code + the today-branch tone class.
Class-only changes — no catalog regen. tsgo + console clean.

## Still open (named, not forgotten)

- Brief → right insight panel + folder tab (the structural move; needs its
  own design pass).
- Sidebar "9 active alerts" vs /today "View all 4" scope drift
  (data-consistency contract; cross-surface, not a /today-local fix).
