# 2026-06-11 — Type-scale correction + weight restraint (Yuqi: "太多 medium 和太大的字体")

Yuqi, looking at the alert detail page after the morning's "universal
type-scale lift": adjust the variables/tokens — overall too many mediums and
too-large fonts; unimportant text should be lighter weight or smaller; don't
use so many distinct text styles on one page.

## Diagnosis (measured, not guessed)

A DOM census of the alert detail panel found **13 distinct size/weight
combos**, with `14px/500` as the workhorse (×26 — breadcrumb, meta, dek,
timeline, banners all medium). Root cause was a token collision: the morning
lift edited `preset.css` assuming the old scale was Tailwind defaults, but the
canonical scale lives in `tokens/primitives.css` (xs 11 / sm 12 / base 14).
The "+1" lift therefore landed as **+2** — xs→13, sm→14 — colliding `sm` with
`base` (both 14) and leaving the live ramp `11/13/14/14/16/18`: everything
converged on 13–14px and hierarchy collapsed.

## Token fix (single source of truth)

`tokens/primitives.css` now carries the corrected small-end lift, and the
`preset.css` xs/sm overrides are REMOVED (caption stays there, 10→11):

```
caption(-xs) 11 · xs 12 · sm 13 · base 14 · lg 16 · xl 18
```

A clean 1px ramp at the small end, every token name a distinct size. This
keeps the lift's intent (small end up one notch from the original 10/11/12)
while restoring the xs<sm<base separation. Verified live via class probes.

## Weight restraint sweep (alert detail + shared card primitive)

Rule applied: **400 is the default; 500 is reserved for the data the CPA came
to read (fact values, key dates); 600 for titles only.** Demotions:

- Drawer chrome: breadcrumb (also base→sm), "N of M" pager, kbd hint labels,
  header meta strip, footer audit note — all medium→400.
- Content: summary dek, "Effective immediately", DeadlineChangeCard meta row,
  source-extract citation, timeline event titles (also base→sm) — 400.
- Links: "Open original" base/semibold → sm/medium; rail source link → 400.
- Micro labels: fact-grid CAPS labels semibold→**medium** (Register B2's
  canonical weight); provenance tier label semibold→medium.
- `DetailSectionCard` headerRight wrapper medium→400 (shared with deadline
  detail — header meta is secondary by definition; buttons passed in carry
  their own weight).

Post-sweep census: regular weight is the body of the page (13/400 ×14,
12/400 ×12), `14/500` shrank ×26→×9 (fact values only), 600 appears only on
the title ramp (22/14/13). Style families ~10, down from 13, with a legible
size logic: 22 title · 14 content · 13 chrome/secondary · 12 meta/labels ·
11 captions.

## Verified

- tsgo clean; vite compiles (one transient JSX-comment syntax error during
  the pass, fixed); no console errors.
- Live probes: text-caption 11 / xs 12 / sm 13 / base 14 / lg 16 / xl 18.

## Note

`--text-description` (13px) now coincides with `--text-sm`; kept as a
semantic alias. The global sm/xs shrink touches every surface built this
morning against the overshot 13/14 values — they inherit the correction
automatically (that's the point of fixing the token, not the screens).
