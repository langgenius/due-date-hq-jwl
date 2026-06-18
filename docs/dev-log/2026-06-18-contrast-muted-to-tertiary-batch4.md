# Contrast: text-muted → text-tertiary on content text (audit batch 4)

_2026-06-18_

Batch 4 of the [full-app audit](../Design/full-app-audit-2026-06-18.md). Fixes the
dominant WCAG AA contrast issue: `text-text-muted` (gray-400 `#98A2B2`, ~2.6:1 on
white — fails AA 4.5:1) was overused for **content** text. Promoted content text to
`text-text-tertiary` (gray-500 `#676F83`, ~5.2:1).

## Scope (larger than the audit's ~32 estimate)

A full sweep of all 172 `text-text-muted` usages: **98 converted, 74 kept** across
43 files. The audit under-counted because many sites were `FieldLabel … className="text-text-muted"`
overrides — the primitive already defaults to `text-tertiary`, so each override was
pulling a _passing_ label color down to the failing one. Those were the core
regression; all converted.

**Converted** = content a user reads: names, roles, sources, dates, counts, field
labels, descriptions, empty-state body, helper copy, timestamps, nav/breadcrumb
labels (clients, alerts, rules, members, obligations, dashboard, onboarding,
migration, settings, login helpers, splash).

**Kept muted** (74) — correct as-is, NOT touched:

- `aria-hidden` / decorative separators + icons + dots (35)
- struck `line-through` "old value" runs (2)
- `placeholder:` / `disabled:` / `hover:` / `group-hover:` / `data-*` / `dark:`
  state variants (NONE converted — verified)
- the `muted` TextLink primitive variant
- semantic state-tier de-emphasis (future-step, suspended, unselected, off-state)

## Two design-call items left muted (flagged for Yuqi)

- `dashboard.tsx:286/292` — the Today header date is `text-2xl` muted _by intent_
  (recedes behind the bold anchor); at 24px it's still ~2.6:1, failing even the 3:1
  large-text bar. Kept per "paired with larger treatment," but worth a look.
- `jurisdiction-rule-table.tsx:77,773` + `generation-preview-tab.tsx:889,891` —
  de-emphasized risk/disposition tiers (LOW risk, deprecated, duplicate) carry real
  data labels at ~2.6:1. Kept as state-tier colors; a slightly darker tier may be warranted.

## Verification

- `tsgo --noEmit` → 0 errors; `vp check` clean; `@duedatehq/app#build` exit 0.
- Color-token only — no layout/logic/i18n change. Per-file revertible if any surface
  reads too heavy (review live, esp the login/marketing column).
