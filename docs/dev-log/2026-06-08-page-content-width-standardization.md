# Standardize page content width across list pages

Date: 2026-06-08

Yuqi: "audit and inspect the content width / section widths of each page, ensure
they make sense." Audit (measured at 1512px) found wide drift:

| page           | max-w             | h-pad | gap  |
| -------------- | ----------------- | ----- | ---- |
| /today (ref)   | 1440              | 32px  | 32px |
| /alerts        | 1440              | 64px  | 32px |
| /deadlines     | 1440              | 64px  | 32px |
| /clients       | 1440              | 24px  | 16px |
| /rules/library | (narrower, 2-col) | 32px  | 24px |

Content width swung ~290px between pages; padding ranged 24–64px; gaps 16/24/32.

## Standard (Yuqi chose: match /today)

Every list page's content wrapper: **max-w-page-expanded (1440) · px-4 md:px-8
(32px) · gap-8 (32px)**.

## Changes

- /alerts (routes/alerts.tsx) contentClassName `md:px-16` → `md:px-8`.
- /deadlines (routes/obligations.tsx) `md:px-16` → `md:px-8`.
- /clients (routes/clients.tsx) `md:px-6` → `md:px-8`, `gap-4` → `gap-8` (sticky
  footer pt-8/pb-0 preserved).
- /rules/library (routes/rules.library.tsx) `gap-6` → `gap-8`, `px-5` → `px-4`
  (its own sticky-footer wrapper; already md:px-8 + expanded). It's a TWO-COLUMN
  page (Jurisdictions rail + content) so its content column is legitimately
  narrower — same padding/gap rhythm, narrower by design.
- /rules/sources (routes/rules.sources.tsx) added `contentClassName="gap-8
md:px-8"` over the RulesPageShell defaults (shell defaults left intact for its
  other consumers — /rules/preview, /rules/temporary, /alerts/history).
- /today unchanged (reference).

## Verify

tsgo clean; re-measured — /today, /alerts, /deadlines, /clients, /rules/sources
all render 1440 max-w · 32px padding · gap-8 (identical); /rules/library matches
padding/gap with its narrower two-column content. At 1512×861.
