# /today alert card — rebuilt to Pencil VxRyF

Date: 2026-06-08

Audit follow-up: the dashboard alert card (`needs-attention-card.tsx`) had drifted
far from Pencil `VxRyF` through many prior iterations. Rebuilt the render to match
the node exactly, using real `PulseAlertPublic` fields (no contract change).

## Fixed against VxRyF

- **Severity pill**: amber "HIGH" → red **"High impact"** (`#FEE4E2`/`#B42318` →
  `bg-state-destructive-hover` / `text-text-destructive`), high-impact only.
- **Form badge** moved back to the **top** meta row (a prior pass wrongly moved it
  to the bottom) — reuses the canonical `TaxCodeBadge`, fed by `alert.forms[0]`.
- **`DEADLINE SHIFTED`** change-kind label added (mono, accent) — was missing
  entirely; reuses the shared `changeKindLabel(alert.changeKind)` helper.
- **State pill**: bordered mono code (no motif), consistent with the form badge.
- **Timestamp**: added the `clock-3` icon prefix.
- **Title + summary**: title 15/600; added the **summary** body line
  (`alert.summary`, 13/secondary, 2-line clamp) — was missing.
- **Bottom meta** (`skQVb`): top hairline divider, then "Affects N client" +
  overlapping **client-initial avatars** + `· conf {pct}%` (green) — spacer —
  **source link** (moved here from under the title) with external-link icon.

## Reuse / new

- Reused: `TaxCodeBadge`, `changeKindLabel`, `Tooltip`, `impactBadgeFromAlert`,
  `formatRelativeTime`. Dropped the now-unused `StateBadge` import + dead
  `severityLabel`/`clientsLoading`/`hasData`.
- New: a tiny `AVATAR_TONES` token-pair array for the avatar stack (the canvas's
  pastel hexes have no token equivalent — decorative, meaning-via-initials).

## Responsive

- Left meta cluster `flex-wrap`; bottom meta `flex-wrap`; source label truncates.
  No fixed widths — reads on narrow screens.

## Surface note

- VxRyF card fill is `#f9fafb` on a white page with no border. Until the page-level
  surface-model pass lands, the card keeps its hairline border so it stays visible
  on the current lighter page wash (documented deviation).

## Verify

- tsgo 0; dashboard tests 14/15; `vp check` 0 errors; strict i18n compile passes.
