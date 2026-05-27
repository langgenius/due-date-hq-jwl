---
title: 'Audit drain ψ — permission copy + pulse.revert wire-up'
date: 2026-05-27
author: 'Agent ψ'
area: design/permissions
---

# Audit drain ψ — ROH-D11 + ROH-D15

## Context

Two carry-over items from agent ρ's wave-3 permission-matrix audit. ρ shipped
9 mechanical drift fixes but deferred the broad copy sweep and the
`pulse.revert` enum wire-up as "too broad for one drain pass."

- **ROH-D11** — `<Trans>Only owners and X</Trans>` and `t\`Owner or manager
  access required\`` style strings drift the moment a role is added or a
  permission is rebalanced in `FIRM_PERMISSION_ROLES`. The most-missed role
  was **partner** (5 of the 9 fixes ρ shipped were this pattern, and at
  least four more sites still had `partner` silently dropped from the
  visible role list).
- **ROH-D15** — `Permission` enum has `'pulse.revert'` but no UI call site
  — the Undo button in the Pulse drawer used `pulse.apply` as a proxy gate.
  Same role set today, but the proxy left the enum dead and any future
  divergence would silently mis-gate the UI.

## Change

### New helper — `apps/app/src/lib/required-roles-label.ts`

Three exports, all driven by `requiredRolesForFirmPermission(permission)`
so the label always reflects the source of truth:

- `requiredRolesLabel(permission)` — pluralized list (`"owners, partners,
  and managers"`), suitable for "Only X can …" sentences. Uses
  `Intl.ListFormat` for proper localized conjunction handling.
- `requiredRolesLabelSingular(permission)` — capitalized singular list
  (`"Owner, Partner, Manager"`), for badge / matrix-cell contexts (matches
  the pre-existing `requiredRolesLabel` in `permission-gate.tsx`, which is
  now a thin wrapper for backwards compat).
- `roleLabelPlural(role)` — single-role plural noun for inline use.

The helper is resilient when no Lingui locale has been activated (tests +
non-React modules) — falls back to the descriptor's English source text
instead of throwing.

Tests: `apps/app/src/lib/required-roles-label.test.ts` — 8 cases including
the partner-drift regression check (`audit.read` includes partner) and
zh-CN locale switching. All 398 app tests still pass.

### ROH-D11 copy sweep — 12 sites

All hard-coded role lists in feature pages now route through
`requiredRolesLabel(permission)`:

| Site | Permission | Before | Drift? |
|------|-----------|--------|--------|
| `features/calendar/calendar-page.tsx:443` | `firm.calendar.manage` | "owners and managers" | yes — missing partner |
| `features/pulse/PulseDetailDrawer.tsx:432` (toast) | `pulse.apply` | "owners and managers" | yes — missing partner |
| `features/pulse/PulseDetailDrawer.tsx:862` | `pulse.apply` | "owners and managers" | yes — missing partner |
| `features/pulse/lib/error-mapping.ts:17-18` | `pulse.apply` | "owners and managers" | yes — missing partner |
| `features/migration/ImportHistoryDrawer.tsx:234` | `migration.revert` | "owners and managers" | yes — missing partner |
| `features/audit/audit-log-page.tsx:630` | `audit.read` | "owners, managers, and preparers" | yes — missing partner |
| `routes/billing.tsx:259` | `billing.read` | "owners and managers" | no (but future-proofed) |
| `routes/billing.tsx:423` | `billing.update` | "owners" | no (but future-proofed) |
| `routes/dashboard.tsx:181-184` | `migration.run` | "owner or manager" | yes — missing partner + preparer |
| `features/rules/temporary-rules-tab.tsx:72` | `pulse.apply` | "owner or manager" | yes — missing partner |
| `features/concepts/concept-help.tsx:116` | `pulse.apply` | "owner or manager" | yes — missing partner |
| `features/concepts/concept-help.tsx:121` | `pulse.apply` | "owner or manager" | yes — missing partner |

The pulse error-mapping case needed a small refactor — `MESSAGE_BY_CODE`
now stores `() => MessageDescriptor` factories instead of static
descriptors, so the FORBIDDEN copy can interpolate the live role list at
the time the error fires. The two FORBIDDEN codes (FIRM_FORBIDDEN +
MEMBER_FORBIDDEN) share the same descriptor and the same msgid as the
read-only-view alert in PulseDetailDrawer, so a single translation entry
covers both surfaces.

`permission-gate.tsx` now imports from the new lib and keeps its
existing `requiredRolesLabel` export as a backwards-compat wrapper that
delegates to `requiredRolesLabelSingular`. No call-site changes needed
for `PermissionGate`, `PermissionInlineNotice`, `PermissionObscuredContent`,
or the CommandPalette badge.

### ROH-D15 — `pulse.revert` wired

- `usePulsePermissions` now resolves both `pulse.apply` and `pulse.revert`
  and returns `{ canApply, canRevert }`.
- The Undo button in `DrawerActions` gates on `canRevert` instead of
  `canApply`.
- Same role set today (`['owner', 'partner', 'manager']`), so behaviour is
  identical — but the enum value now has a real UI call site, and the
  Undo button will track a future split.

## i18n

Adds 17 new English msgids and 17 zh-CN translations:

- 5 plural role nouns (`owners`, `partners`, `managers`, `preparers`,
  `coordinators`) — used by the helper itself.
- 12 sentence-level msgids (one per swept site) — each interpolates the
  role label via `{0}` so a single translation entry stays in sync as the
  role list changes.

zh-CN translations follow the project convention (所有者 = owner-plural,
合伙人 = partner, 管理员 = manager, 准备者 = preparer, 协调员 = coordinator).
Singular role labels reuse the existing `/practice` translations
(负责人 / 合伙人 / 管理员 / 经办人 / 协调员) so the singular badge surfaces
remain consistent with the rest of the app.

Total catalog: 2,764 msgids, 0 missing in zh-CN.
`pnpm i18n:compile --strict` passes.

## Validation

- `pnpm exec tsc --noEmit` — clean (apps/app).
- `pnpm test --run` — 398/398 passing, including the new
  `required-roles-label.test.ts` (8 cases) and the existing
  `error-mapping.test.ts` (4 cases — refactored MESSAGE_BY_CODE shape).
- `pnpm i18n:extract` — 0 missing translations.
- `pnpm i18n:compile --strict` — clean.

## Docs check

No design doc changes — this is a copy-sweep + helper extraction, not a
new design surface. The drift inventory it addresses is documented in the
ρ commit message (`95d6e564`) as ROH-D11 and ROH-D15.

## Out of scope (intentional)

- Not touching `packages/core/src/permissions/` — read-only per the
  handoff. No new permission enum values, no role-set changes.
- Not touching server-side strings — server FORBIDDEN messages are
  resolved through `apps/app/src/lib/i18n-error.ts` which has generic
  copy ("Your current role doesn't include this permission") that doesn't
  drift.
- Not touching dashboard top-row / clients / rules library / milestones —
  owned by other agents (ω / X2 / X3).
