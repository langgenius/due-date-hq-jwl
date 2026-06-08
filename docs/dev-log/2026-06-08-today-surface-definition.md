# /today — surface definition (Yuqi "还是很粗糙，没有重点")

Date: 2026-06-08

Pulled the source of truth (Pencil `VJbaH` + sub-frames) to stop guessing. The
diagnosis: the page had lost surface definition. The app uses a **tinted page /
white card** model, but the alert cards were filled `bg-background-section`
(gray) — so the _important_ cards receded into the page wash, and with no border
and a near-white page tint there was nothing to define an edge. Everything
flattened into one gray mush → "粗糙 / 没有重点".

Pencil geometry confirmed from the canvas:

- Alert card (`VxRyF`): radius **14**, padding **18**, gap 16, fill `#f9fafb`,
  **no border** — but that works because the design's page is pure white.
- Actions table (`ErW76 > bmdxt`): radius **14**, white fill, `#10182814` 1px
  hairline.
- Main section gap: **32**.

## Changes

- **Alert cards** (`needs-attention-card.tsx`): one uniform surface that lifts off
  the page — white fill + a single 8% hairline (`border-divider-subtle` =
  `#10182814`), radius 14, padding 18. Dropped the `impacted ? gray : white`
  split (it made the cards that matter recede); impact is carried by the
  High-impact pill + "Affects N clients". Hover deepens the border + adds the
  subtle fill. Avatar ring follows the white card (`ring-background-default`).
- **Actions table** (`actions-list.tsx`): border softened `divider-regular` →
  `divider-subtle` and radius `12 → 14`, matching the design — a calm surface,
  not a boxed outline.
- **Section spacing** (`dashboard.tsx`): `gap-6 → gap-8` (24 → 32px) so the
  three surfaces read as distinct sections with real breathing room.

Net: white page-tint with three crisply-edged white surfaces (brief / alert
cards / table). Within each, the dark title is the focal point; the single
hairline + 32px rhythm give the structure the flat wash lacked.

## Note on the surface model

The design is white-page + gray-cards; the app is tinted-page + white-cards
(committed in 755d767d). Rather than flip the global surface model (high blast
radius — white cards on a white page would vanish app-wide), this matches the
design's _refinement_ (radius 14 / hairline / 32px) within the app's existing
model. A full white-page migration would be a separate, app-wide change.

## Verify

- tsgo 0; `vp check` 0 warnings/errors; dashboard tests 10/10 (+1 skip); verified
  in preview at 1512×861.
