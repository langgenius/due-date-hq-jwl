# Full-app audit + a11y/P0 fixes (batch 1)

_2026-06-18_

Ran an 8-lens full-application audit (a11y, color/contrast, hierarchy/type,
spacing/responsive, interaction-states, motion, nav/search/cognitive-load,
design-system) as parallel evidence-grounded passes. Findings + prioritized fix
plan: [`docs/Design/full-app-audit-2026-06-18.md`](../Design/full-app-audit-2026-06-18.md).
Headline: the app is in strong shape (prior audits closed the big veins) — 1 P0,
~16 P1, ~23 P2, ~18 P3, mostly polish + reconciling drift to shipped decisions.

This commit is **batch 1** — the P0 + accessibility form-wiring (clear-cut, no
design call needed).

## Fixes

- **P0 — notification preferences hung on error.** `notification-preferences-page.tsx`
  gated on `isLoading || !preferences`; on a query error the skeleton hung forever
  (no `throwOnError`, so failures only set `isError`). Added an `isError` branch
  (EmptyState + Try-again refetch).
- **a11y — login inline errors** (`login.tsx`, both OTP + email forms): bare `<p>`
  errors → `role="alert"` + `id`, with the input linked via `aria-describedby`
  (gated on `error`).
- **a11y — notification matrix cell** had no accessible name (only an `aria-hidden`
  check icon). Wired `aria-labelledby` to the existing visible column-head + row-name
  elements (gold-standard matrix pattern — no new strings, no fake table).
- **a11y — `field.tsx` FieldDescription:** `tone="warning"` static helper no longer
  renders `role="alert"` (assertive on mount); only `destructive` (an error event) is.
- **a11y — digest day chip** `aria-label={day.key}` ("mon") → `{day.label}` ("Mon").
- **feedback — `updatePreferences`** had no `onError`: a rejected optimistic toggle
  diverged silently. Added an error toast + resync invalidate.

Deferred (noted in the audit doc): generic `aria-describedby` auto-wiring in the
`field.tsx` primitive needs a `Field.Control` context refactor — the shared
`FieldError` already emits `role="alert"` (announces on insert), so this is a
follow-up, not urgent.

## Verification

- `tsgo --noEmit` → 0 errors.
- `vp fmt` + `vp check` → clean on tracked files.
- i18n: 3 new strings translated to zh-CN (无法加载你的偏好设置 / 无法保存你的偏好设置 /
  获取通知设置时出错。); `compile --strict` passes; extract+compile idempotent.
