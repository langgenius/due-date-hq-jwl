# /alerts detail — polish batch

Date: 2026-06-08

Yuqi review of /alerts?alert=… (items 6-13; 1-5 shipped previously).

## Shared primitives
- **CountPill taller** (count-pill.tsx): 18px → fixed `h-[22px]` (was "too low in
  height" in the rail head). Reads better in both the rail head and page header.
- **DetailStatusBanner compact taller** (detail-status-banner.tsx): `h-7` (28px)
  → `h-10` (40px) — "too thin, slightly taller." Applies to both alert + deadline
  banners.

## AlertDetailDrawer
- **White surface** (#6): panel-mode aside `bg-[#fafbfc]` → `bg-background-default`
  (white) — alert detail is the white surface.
- **Footer single border** (#7): `border-t-2 border-divider-regular` →
  `border-t border-divider-subtle` (was reading as a double/heavy line).
- **DeadlineChangeCard AI indicator** (#10): added a `✧ AI-read from the alert`
  affordance to the card eyebrow (reuses the EXTRACTED-FACTS sparkle glyph). Dates
  stay mono (correct); section eyebrows stay mono for vocabulary consistency.
- **Affected-clients gap** (#11): header→table gap `gap-3` → `gap-2`.
- **Copy client email draft** (#12): confirmed shorter (ghost `size="sm"` h-8,
  matching the other secondary footer buttons) and moved to the left cluster.
- **Primary actions flush right** (#13): the right cluster now holds only the
  primary CTAs; supporting actions (Copy email, Undo) moved left.

## Verify
tsgo clean; fresh reload renders (no error boundary). Banner 40px, CountPill 22px,
detail surface white, AI indicator present, primary CTA right-aligned. 1512×861.
