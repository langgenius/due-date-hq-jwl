# Alerts History Width Alignment

## Context

The `/alerts/history` page rendered inside the default `RulesPageShell` width, while `/alerts`
uses the wide shell with wider desktop padding. This made the history page feel narrower than the
main alerts list.

## Change

- Set `/alerts/history` to use the same wide shell cap and `md:px-16` content padding as
  `/alerts`.
- Reused the alert drawer open state so the history route also removes bottom padding when an
  inline alert detail panel is open.

## Validation

- `pnpm exec vp check --fix apps/app/src/routes/alerts.history.tsx apps/app/src/features/alerts/AlertsListPage.tsx apps/app/src/features/alerts/components/StateTilegram.tsx`
- Browser width verification at the same viewport:
  - `/alerts`: shell max width `1440px`, horizontal padding `64px`, actual rect width `1005px`
  - `/alerts/history`: shell max width `1440px`, horizontal padding `64px`, actual rect width `1005px`
