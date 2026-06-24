# Stone/lime bolder — warm prominent empties + lime celebration tone

**Date:** 2026-06-23
**Surfaces:**

- `apps/app/src/components/patterns/empty-state.tsx` — the primitive.
- `apps/app/src/routes/rules.library.tsx` — `OverviewCaughtUpCard`.
- `apps/app/src/routes/preview.tsx` — gallery specimens.
- Canon: `docs/Design/color-palette-2026-06-23.md` (Warm-surfaces section).

The first palette-finish pass wired stone/lime narrowly (two setup cards + the
/today all-clear disc). This "bolder" pass takes the warm half of the palette
into the canonical place playfulness belongs — empty states — via one primitive
edit, so it lands everywhere consistently instead of per-callsite.

## What changed

- **`EmptyState` `prominent` variant is now a warm stone well by default.** New
  `tone?: 'warm' | 'plain'` (default `warm`): the prominent card uses
  `bg-background-well-warm` + `border-divider-warm`. Every full-surface empty
  (a _resting / invitational_ moment) now reads warm instead of stark white;
  `tone="plain"` opts back to white for the rare clashing context. `default` /
  `compact` (dense inline) empties are unchanged.
- **New `iconTone="celebrate"`** — a lime icon-circle (`bg-highlight-celebrate`)
  with a dark glyph (`text-text-primary`, since lime can't carry a light icon),
  reserved for genuine "you cleared it" reward states — never a quiet "nothing
  yet" state, so lime stays scarce.
- **`/rules` "Review queue is clear" card** (`OverviewCaughtUpCard`) → warm well
  - lime disc (dark check), matching the /today all-clear beat so the two
    "all clear" rewards read as one language.
- **`/preview`** gains warm (default), `celebrate`, and `plain` EmptyState
  specimens so the tones are discoverable + visually documented.

## Discipline (unchanged canon)

Navy stays the only chrome accent; stone/lime are by-exception. Stone = warm
well for resting/invitational surfaces; lime = scarce celebration. White-text-on-
lime is never used.

## Verify

`tsgo` ui + app clean; `vp run @duedatehq/app#build` clean; tokens still emit
(built CSS: `background-well-warm` + `highlight-celebrate` present). Verified live
in `/preview` via computed styles: default prominent card `rgb(241,244,236)`
(#f1f4ec stone), `tone="plain"` card `rgb(255,255,255)`, celebrate disc
`rgb(230,251,163)` (#e6fba3 lime). No console errors. Built on
`claude/polish-wave-3` off canonical `origin/main`; pushed `HEAD:main`.
