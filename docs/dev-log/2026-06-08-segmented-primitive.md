# Segmented — shared flat pill-toggle primitive (Phase 3)

Date: 2026-06-08

Part of the product-wide unification: "pill should be the same if the functions
are the same." The product had the same panel-less pill toggle re-implemented
inline in several places (`BriefScopeToggle` Firm/Me, the alerts List/Map switch
written out twice, the workload 7/14/30d window picker, …), each with slightly
different height, radius, and active treatment.

## New primitive (`packages/ui/src/components/ui/segmented.tsx`)

`<Segmented value onValueChange options size ariaLabel />` — a flat segmented
control on the shared `--components-segmented-*` tokens. Active item lifts via a
white fill + hairline border (no shadow), matching the flat button language from
Phase 1. Not `Tabs`: `Tabs` is bound to content panels and carries a shadow;
these are state-only toggles.

Distinct from `Tabs` (panelled tab system) on purpose — this is for
mutually-exclusive state switches with no associated panel.

## First application (`features/workload/workload-page.tsx`)

The 7d / 14d / 30d workload-window picker (a hand-rolled `role="group"` +
`aria-pressed` cluster) → `<Segmented>`. Numeric state bridged via
`String(windowDays)` / `Number(value)`.

Remaining call-sites (brief scope, alerts List/Map) are migrated as each surface
is touched — deferred here because a concurrent session is actively editing the
/today + alerts files.

## Verify

Preview @1512×861 `/workload`: active "7d" renders as a flat white pill on the
segmented track. tsgo clean.
