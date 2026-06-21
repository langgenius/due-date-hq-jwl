# DuotoneIcon — two-tone delight glyph chip (prototype on /preview)

_2026-06-21 · Yuqi refs: "this style of icon is awesome" (blue book / yellow timer
/ green play) + the AI-Agent / Podcast / Sound-Effect glyphs_

`DuotoneIcon` (`components/primitives/duotone-icon.tsx`) — a rounded tinted square
holding a lucide glyph in the matching strong tone, so an icon reads as a little
colour-coded object rather than a flat monochrome stroke. Tones: accent / success /
warning / brand (cyan) / violet / neutral; sizes sm/md/lg; optional corner `badge`
sub-glyph for an AI / "special" accent (the AI-Agent ✦ corner).

## Scope discipline
DELIGHT SURFACES ONLY — onboarding, empty states, success, choice cards. **Not**
the dense data workbench, where the restrained-monochrome icon canon
([[reference_icon_vocabulary]]) keeps tables calm. Distinct from EmptyState's
tinted CIRCLE (this is a smaller, square, inline chip beside a label).

Shipped as a **/preview prototype** (per the agreed plan: prototype before
app-wide) so Yuqi can react to the aesthetic before it's adopted on real surfaces.
Verified live on /preview: 10 chips, correct tone pairs (e.g. accent navy on
#eef0fb, brand cyan-ink on #e3f6fd, violet on a 14% review wash), 3 sizes, badge.

## On-canon notes
- Brand + violet tones use arbitrary `var()` values (not generated utilities) so
  they don't depend on a @theme re-export for those specific tokens
  ([[reference_button_token_theme_mapping]]).
- No new i18n strings (purely visual).

## Next (app-wide adoption — after Yuqi's nod)
Candidate homes: SetupProgressCard / first-run empty-state heroes / SuccessModal /
the create-choice cards. Held until the aesthetic is approved on /preview.
