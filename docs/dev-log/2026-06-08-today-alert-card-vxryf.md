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
- **Timestamp**: relative time only, no leading icon (the `clock-3` icon was
  tried and removed per Yuqi /today feedback #4 — redundant chrome).
- **Title**: 15/600. The summary body line is **not** rendered on the outer card
  (Yuqi /today feedback #3 — "do not show details on the outside card"); the full
  summary lives in the alert detail drawer.
- **Bottom meta** (`skQVb`): top hairline divider, then "Affects N client" +
  overlapping **client-initial avatars** + `· conf {pct}%` (green) — spacer —
  **source link** (moved here from under the title) with external-link icon,
  at `text-[11px]` (feedback #5 — smaller font).

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

- VxRyF card fill is `#f9fafb` on a white page with **no border** — the hairline
  border was dropped (Yuqi "too much use of border"). The `impacted > 0` cards use
  `bg-background-section` against the white page so they read without a stroke.

## Verify

- tsgo 0; dashboard feature tests pass; `vp check` 0 errors (mine); no new i18n
  strings.
