# /today — type-scale audit + 12-item polish (Yuqi page feedback)

Date: 2026-06-08

A large feedback batch plus a type-scale audit and Actions-row tightening.

## Type scale (converged)

The surfaces were littered with ad-hoc sizes (15/13/12/11/10/8px). Converged to
one scale across the page:

- **24** page title · **16** section headers · **14** (`text-sm`) card title +
  table verb · **12** (`text-xs`) meta / body / sublines · **11** card badges
  (jurisdiction / form / change-kind / high-impact) · **10** avatar micro only.

13, 15, 8px are eliminated from the dashboard surfaces.

## Daily Brief (`daily-brief-card.tsx`)

- **Light background** (Yuqi): `bg-background-default` → `bg-background-subtle`
  (gray-100), so the brief reads as the lead summary banner, distinct from the
  white alert cards. The toggle's gray-50 track / white active pill still nests
  cleanly inside the gray card.
- **Smaller gap** (#3): `gap-2.5` → `gap-2`.

## Page header (`dashboard.tsx`)

- **#4** date "June 7" → `font-medium`, color `text-text-tertiary` →
  `text-text-muted` (lighter), sitting clearly behind the bold "Today".
- **#7** Import "+" button → `rounded-full` (circular).

## Alerts section + card

- **#2** Monitoring badge: `variant="secondary"` → `ghost` + `px-0` — removed the
  gray background ("去掉背景"), leaving the live dot + label.
- **#5** "Affects N clients": building icon + label now share ONE color.
- **#6** "No clients matched": icon + label both step to the lighter
  `text-text-muted` so noise alerts recede.
- **#8** source link glyph: `ExternalLinkIcon` → `ArrowUpRight` (a simple arrow).
- **#9** jurisdiction pill: added a tiny `MapPin` state/location graphic.
- **#10** avatars: capped named avatars now show a `+N` overflow chip so the
  stack reconciles with "Affects N clients"; each avatar's full name is on hover
  (Tooltip).
- **#11** one font family: removed every `font-mono` inside the card (jurisdiction,
  form, change-kind, conf, avatars) — the card now reads in a single typeface.

## Actions table (`actions-list.tsx`, `readiness-indicator.tsx`)

- **#1** "About Actions this week" sparkles trigger shrunk (`size-5/size-4` →
  `size-4/size-3.5`) — was too big next to the 16px header.
- **#12** status column moved one position left (now before the due column);
  the readiness **dots/circles were removed** — just "Docs N/M" remains (the
  count + its tone carry the state). Shared `ReadinessIndicator`, so /deadlines
  follows.
- Row typography tightened to the scale: verb `text-sm` (was 13), client / due
  subline `text-xs` (were 13 / 11).

## Verify

- tsgo 0; readiness tests 11/11; dashboard tests 10/10; verified in preview at
  1512 — avatars show "M +1" = 2, status sits before due, dots gone, brief tinted.
- No new i18n strings.
