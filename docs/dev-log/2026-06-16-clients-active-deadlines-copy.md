# 2026-06-16 Clients active deadlines copy

## What changed

- Renamed the `/clients` StatBand KPI from "Active obligations" to
  "Active deadlines" so the client directory follows the product-wide
  deadline vocabulary.
- Updated the preview route's static client card example from "active
  obligations" to "active deadlines".
- Synced Lingui catalogs after extraction and filled the zh-CN strict
  compile gaps exposed by the catalog refresh.

## Verification

- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
