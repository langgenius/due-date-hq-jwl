# Design follow-ups: scroll-spy, auth type-fix, terminology, FieldLabel two-register canon (Yuqi)

_2026-06-16_

Follow-up batch closing several tracked design-doc items. All typecheck-clean
(0 total errors — first time this session, see auth-chrome below); `vp test run`
= 538 pass / 2 skipped.

## Fixes
- **auth-chrome `exactOptionalPropertyTypes`** — the long-standing type error
  (passing `className={markClassName}` where `markClassName` is `string |
  undefined` to BrandMark's `className?: string`) fixed with a conditional spread
  `{...(markClassName ? { className: markClassName } : {})}`. **Type errors now 0
  total.** ( /login keeps its bespoke split layout + footer but already reuses the
  shared `AuthBrandAnchor`, so no chrome duplication to dedupe.)
- **Scroll-spy sticky offset** (`ObligationQueueDetailDrawer`) — replaced the flat
  `scroll-mt-16` on all section anchors with a mode-aware `sectionScrollClass`:
  panel/page render the section nav + key-date strip ABOVE the scroll container
  (non-sticky), so sections only need `scroll-mt-4` breathing (the flat 64px was
  over-scrolling them); the legacy sheet keeps `scroll-mt-16` for its in-body
  sticky nav. Resolves all three `TODO(scroll-spy)` markers.
- **Terminology** (ui-audit-2026-05-25 §29) — `temporary-rules-tab` column header
  "Obligations" → "Deadlines"; `preview` placeholder "obligation" → "deadline".
  Nav/header already say "Deadlines." (Audit's "Filings" stays — it's an
  event-type category, "filed or e-filed", not the deadlines noun.)

## FieldLabel — canonical two-register home (section-header-style §B)
`FieldLabel` (`primitives/field-label`) now carries both Register-B tiers via a
`variant` prop:
- `field` (default, B2, 12px medium tracking-wide) — **byte-identical** to the
  prior recipe, so its 14 consumers are unchanged.
- `group` (B1, 11px semibold tracking-eyebrow-tight) — new group/column-band tier.

Both bake in `uppercase text-text-tertiary`. Documented as the enforceable home
in DESIGN.md §4.11 + section-header-style.md ("Known drift" → "Register-B home").
Migrated the pure-dedup cases (`Step2Mapping` two exact-recipe labels → FieldLabel;
zero visual change).

**Why the full ~200-label sweep is NOT done here:** it's not mechanical — 65 of
the uppercase labels carry intentional non-tertiary colors (group bands +
matrix headers use `text-text-secondary` deliberately on tinted bands; plus
warning/destructive labels), and that surfaces a real tertiary-vs-secondary
band-color question the doc doesn't settle. ~51 more labels live in the
alert/deadline detail drawers a parallel session just rebuilt. So the legacy
migration is a per-site review + one color decision + cross-session coordination
— tracked, not raced.

## Verified-resolved (stale-doc items, no code needed)
- **Obligation-drawer header de-stuffing (P0, 2026-05-21)** — already done by the
  NrQaI + banding redesigns: Path-to-Filing chevron → Workflow card in the Status
  tab; 7-chip soup → client chip + jurisdiction seal; status pill → colored
  banner; forwarding panel + 4-date matrix gone.
- **Rules-library pagination** — already implemented (client-side `visibleCount` +
  footer); catalog ~479 rules vs the 4,500 revisit threshold.
- **/deadlines summary strip** — superseded by the deliberate dismissible
  narrative banner (StatBand was scoped to 5 surfaces, /deadlines excluded). Keep.
