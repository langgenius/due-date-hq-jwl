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

## Adoption (Yuqi: "yes")

- **SetupProgressCard header** — a brand `RocketIcon` DuotoneIcon now leads the
  card, warming the onboarding moment (pairs with the cyan→navy TickProgress + navy
  % badge). Verified live on /preview (light-cyan chip + glyph).

Audited the other candidate homes; held with reasons:

- **SuccessModal hero** — already IS the duotone treatment (a `size-14 rounded-xl`
  tinted square + green check, animated). No churn.
- **Empty-state heroes** — deliberately use a tinted CIRCLE / integration strip;
  swapping to the square chip would churn a deliberate treatment with no clear win.
- **Header StatBand on /deadlines** — skipped: the page's narrative banner ("N
  overdue — …") already carries those at-a-glance counts (one-home-per-fact).
