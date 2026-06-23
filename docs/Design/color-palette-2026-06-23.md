# Color palette — 2026-06-23 (navy accent + softer status triads)

Canonical record of the retuned DueDateHQ color palette. This is a foundational
token change: the **accent** moves from a warm navy-indigo to a **true navy
blue**, the **status** families (success / warning / destructive / info) are
re-hued into softer, AA-text-capable triads, and **review** keeps its violet
semantic at a new hue/lightness. The loud cyan that used to carry "highlight"
is retired into the **info / sky** family.

Nothing here is a raw hex in a component. Every value below lives in the token
layer (`packages/ui/src/styles/tokens/*.css`) and reaches the UI through the
`@theme` re-exports in `preset.css`. Components consume the semantic tokens.

---

## The three-stop rule

Every chromatic family is expressed as a small triad. Reach for the right stop
by **role**, never by eyeball:

| Stop      | Use it for                                                          | Never                                         |
| --------- | ------------------------------------------------------------------- | --------------------------------------------- |
| **solid** | fills · dots · rings · borders-as-accent · the colored shape itself | white text on top of it (it will not pass AA) |
| **ink**   | the colored **text** token, AA ≥ 4.5:1 on white _and_ on the wash   | as a large fill (too dark, reads as chrome)   |
| **wash**  | near-white tinted **backgrounds** (banner/cell/badge soft)          | as text or a border                           |

A fourth helper stop, **border (mid)**, is the hairline used to frame a washed
container so it holds an edge on white.

Discipline:

- **Navy is the only chrome accent.** Buttons, selection, links, focus ring,
  active tabs — all navy. Status colors appear **only** on status (a deadline's
  urgency, a rule's review state, a live/monitoring signal). Do not use green/
  amber/brick/violet as decoration.
- **Solid ≠ text.** If you need colored text, use the family's **ink**. The
  solids are deliberately mid-lightness so they read on white as fills, which
  means white-on-solid fails AA for every status family (by design) — so we
  never put white text on a status solid. (Navy is the exception: it is a chrome
  accent and _does_ carry white text on primary buttons, at 8.85:1.)

---

## Accent — true navy blue

The calm default. Primary buttons, selection, links, focus.

| Role            | Hex       | Token home (light)                |
| --------------- | --------- | --------------------------------- |
| solid           | `#22488C` | `--color-util-colors-primary-600` |
| hover / wash bg | `#EAEFF7` | `--color-util-colors-primary-50`  |
| deep / pressed  | `#15315F` | `--color-util-colors-primary-800` |
| border (mid)    | `#9DB2DA` | `--color-util-colors-primary-300` |

- `--text-accent` → primary-600 `#22488C` (8.85:1 on white — navy is its own ink).
- Accent washes / state layers: `--state-accent-hover` (50), `--state-accent-hover-alt` (100),
  `--state-accent-active(-alt)` = `rgb(34 72 140 / α)` (the new navy).
- The full primary ramp was recomputed at the navy hue (~218°) so every tint is coherent.

## Status triads

### Success — softer green

| Role   | Hex       | Token home (light)              |
| ------ | --------- | ------------------------------- |
| solid  | `#3FA86A` | `--color-util-colors-green-500` |
| wash   | `#E8F5EC` | `--color-util-colors-green-50`  |
| ink    | `#1E7A47` | `--color-util-colors-green-600` |
| border | `#9CD3B0` | `--color-util-colors-green-200` |

`--text-success` → green-600 ink (5.34:1 on white / 4.76:1 on wash).

### Warning — amber / ochre (re-hued from coral)

| Role   | Hex       | Token home (light)                |
| ------ | --------- | --------------------------------- |
| solid  | `#C0883A` | `--color-util-colors-warning-500` |
| wash   | `#F4ECDE` | `--color-util-colors-warning-50`  |
| ink    | `#7A5320` | `--color-util-colors-warning-600` |
| border | `#E2C690` | `--color-util-colors-warning-200` |

`--text-warning` → warning-600 ink (6.81:1 / 5.80:1). The warning family was
previously a peach/coral; it is now a caution-gold so it never collides with
the destructive brick.

### Destructive — softer terracotta/brick

| Role   | Hex       | Token home (light)            |
| ------ | --------- | ----------------------------- |
| solid  | `#D2553F` | `--color-util-colors-red-500` |
| wash   | `#FBE9E4` | `--color-util-colors-red-50`  |
| ink    | `#B23A28` | `--color-util-colors-red-600` |
| border | `#EBA99B` | `--color-util-colors-red-200` |

`--text-destructive` → red-600 ink (5.95:1 / 5.07:1).
`--state-destructive-border` → red-200 `#EBA99B`.

### Info / live — sky (the old cyan's new home)

| Role   | Hex       | Token home (light)                   |
| ------ | --------- | ------------------------------------ |
| solid  | `#3AB3E0` | `--color-util-colors-blue-light-500` |
| wash   | `#E6F6FC` | `--color-util-colors-blue-light-50`  |
| ink    | `#0E6E92` | `--color-util-colors-blue-light-600` |
| border | `#A9DCF0` | `--color-util-colors-blue-light-200` |

This is where **live / monitoring / "New"** reads now. The loud brand cyan
(`--color-brand-highlight`, was `#14C5F6`) is re-pointed onto this same sky
hue so the `New` badge, unread dots, and the info status family are one color:

- `--color-brand-highlight` → `#3AB3E0` (info solid — fills/dots/rings)
- `--color-brand-highlight-ink` → `#0E6E92` (info ink — AA text/links, 5.73:1)
- `--color-brand-highlight-soft` → `#E6F6FC` (info wash)

### Review — retuned violet

Same semantic (`--status-review`), new hue/lightness.

| Role   | Hex       | Token home (light)               |
| ------ | --------- | -------------------------------- |
| solid  | `#7A5AF0` | `--color-util-colors-violet-500` |
| wash   | `#EEEBFD` | `--color-util-colors-violet-50`  |
| ink    | `#4B3596` | `--color-util-colors-violet-700` |
| border | `#C7BAFB` | `--color-util-colors-violet-200` |

`--status-review` → violet-600 (mid fill); `--status-review-text` → violet-700
ink `#4B3596` (9.34:1 / 7.98:1).

---

## Dark mode

The util ramps are theme-invariant, so dark mode inherits the new hues
automatically. Per the house relationship, **dark-mode tokens point one or two
stops brighter / less-saturated** than light:

| Family      | Light solid stop | Dark solid stop          | Dark text stop        |
| ----------- | ---------------- | ------------------------ | --------------------- |
| accent      | primary-600      | primary-400 `#5F80B8`    | primary-400 / -300    |
| success     | green-500        | green-400 `#54B67E`      | green-500 / -400      |
| warning     | warning-500      | warning-500 `#C0883A`    | warning-500 / -400    |
| destructive | red-500          | red-400 `#DB6E58`        | red-400               |
| info / sky  | blue-light-500   | blue-light-500 `#3AB3E0` | blue-light-500 / -400 |
| review      | violet-500       | violet-400 `#9275F3`     | violet-400            |

Alpha tint literals in the dark file (state hovers, badge halos, soft badge
backgrounds, severity tints) were re-derived from the **new** solids:

- warning `rgb(192 136 58 / α)` (was `242 95 76`)
- destructive `rgb(210 85 63 / α)` (was `240 68 56`)
- success `rgb(63 168 106 / α)` (was `23 178 106`)
- info `rgb(58 179 224 / α)` (was `11 165 236`)
- accent `rgb(34 72 140 / α)` (was `46 54 140`)
- review tint `rgb(146 117 243 / α)` (was `164 138 251`)

`--text-*` on dark stays white/neutral on dark surfaces (the
no-colored-text-on-dark rule); chromatic accent lives in containers.

---

## Contrast (verified)

All inks ≥ 4.5:1 on white **and** on their own wash:

| Ink                   | on white | on wash |
| --------------------- | -------- | ------- |
| accent navy `#22488C` | 8.85:1   | 7.66:1  |
| success `#1E7A47`     | 5.34:1   | 4.76:1  |
| warning `#7A5320`     | 6.81:1   | 5.80:1  |
| destructive `#B23A28` | 5.95:1   | 5.07:1  |
| info `#0E6E92`        | 5.73:1   | 5.17:1  |
| review `#4B3596`      | 9.34:1   | 7.98:1  |

White-on-solid is intentionally **below** AA for every status family (2.4–4.1:1)
— solids are fills, not text backgrounds. Navy is the chrome exception (8.85:1).

---

## Where it lives

- `packages/ui/src/styles/tokens/primitives.css` — the util-colors ramps
  (primary / green / warning / red / blue-light / violet) + `--color-brand-highlight*`.
- `packages/ui/src/styles/tokens/semantic-light.css` — accent washes, status
  state tokens, `--text-*`, `--status-review*`, divider-accent, legacy accent aliases.
- `packages/ui/src/styles/tokens/semantic-dark.css` — the dark mirror.
- `packages/ui/src/styles/preset.css` — `@theme` re-exports (unchanged: no new
  token names were introduced; every triad maps onto existing ramp stops).
