# 2026-05-27 — Audit-drain agent ρ (rho), permission-state matrix

**Branch:** `design/audit-drain-rho-permission-matrix-v2` (retry pass; v1 errored on a transient Anthropic 529)
**Charter:** wave-3 audit drain. Build the surface × role permission matrix for the DueDateHQ workbench, identify drift, ship the mechanical-safe fixes inline.
**Files OWNED:** `apps/app/src/**`, `apps/app/src/i18n/locales/zh-CN/messages.po`, `docs/Design/permission-state-matrix.md`, this dev-log.
**Files NOT touched:** `packages/core/src/permissions/` (read-only), `packages/db/migrations/*`, `packages/contracts/src/*`, `apps/server/*`.

## What shipped

### Matrix doc (new)

- **`docs/Design/permission-state-matrix.md`** — the deliverable. Lists all 5 `FIRM_ROLES` (the handoff mentioned 7; source-of-truth has 5 — this is itself drift `ROH-D11`), all 16 `FirmPermission` values from `FIRM_PERMISSION_ROLES`, the 21 audited surfaces, and a 17-item drift inventory keyed `ROH-D1..D17`.

### Drift fixes (9, all UI-only mechanical)

| ID | Severity | Files touched | Fix |
|---|---|---|---|
| ROH-D1 | P1 | `routes/clients.tsx`, `features/clients/ClientsCreateSplitButton.tsx` | Added a `canCreate` prop to the split button. Wired `permission.can('client.write')` from the route. Coordinator now sees the "+ New client" primary button disabled with a `title` tooltip explaining required access, instead of a dialog that 403s on submit. |
| ROH-D3 | P1 | `routes/obligations.tsx` | Bulk "Set status" dropdown trigger in the queue toolbar is now disabled + tooltipped when `!permission.can('obligation.status.update')`. Coordinator no longer gets a 403 toast after opening the dropdown and clicking a status. |
| ROH-D4 | P2 | `features/calendar/calendar-page.tsx` | Dropped the hard-coded `notice` prop on `PermissionObscuredContent` ("Only owners and managers…" — partner missing). The default body derives required-role text from `requiredRolesForFirmPermission('firm.calendar.manage')` and stays in sync with the enum. |
| ROH-D5 | P2 | `features/audit/audit-log-page.tsx` | Added "partners" to the PermissionGate description for `/audit`. The badge below the description was already correct via `requiredRolesLabel`; only the human-readable paragraph was stale. |
| ROH-D5-clients | P2 | `features/clients/ClientFactsWorkspace.tsx` | Same drift on the client-detail Activity tab EmptyState ("Owners, managers, and preparers…" → adds partners). |
| ROH-D6 | P2 | `features/pulse/PulseDetailDrawer.tsx` | Replaced the ad-hoc `<Alert>` with hard-coded "Only owners and managers can apply Pulse changes" with the canonical `<PermissionInlineNotice permission="pulse.apply">`. Required-role text now derives from `FIRM_PERMISSION_ROLES['pulse.apply']` and includes partners. |
| ROH-D7 | P2 | `routes/migration.new.tsx` | Replaced the bespoke destructive Alert ("Owner or manager access required") with the canonical `<PermissionGate permission="migration.run">`. Dropped the now-unused `ArrowRightIcon` import. Same return-to-Today CTA pattern as `/members`, `/billing`, `/audit`. |
| ROH-D8 | P2 | `features/migration/ImportHistoryDrawer.tsx` | Dropped the stale override copy on `<PermissionInlineNotice permission="migration.revert">`. Default body uses the enum-derived required-role text and includes partners. |
| ROH-D13 | P1 | `routes/practice.tsx` | Added `title` + accessible label to the Delete-practice button when disabled by permission. Was silently disabled (no tooltip explained why) for any non-owner role. |

### Translations

- 8 new English msgids extracted via `pnpm i18n:extract`.
- All 8 added to `apps/app/src/i18n/locales/zh-CN/messages.po` with translations:
  - "Client migration changes practice data, evidence, and audit records. Contact a practice owner if you need access." → 客户迁移会修改实务数据、凭证和审计记录。如需访问权限，请联系实务所有者。
  - "Creating clients requires owner, partner, manager, or preparer access." → 创建客户需要所有者、合伙人、管理员或准备者权限。
  - "Delete practice (owner access required)" → 删除事务所（需要所有者权限）
  - "Deleting the practice requires owner access." → 删除事务所需要所有者权限。
  - "New client (requires non-coordinator access)" → 新建客户（协调员角色无权限）
  - "Owners, partners, managers, and preparers can inspect client activity." → 所有者、合伙人、管理员和准备者可查看客户活动记录。
  - "Practice-wide audit events are available to owners, partners, managers, and preparers. Contact the practice owner if you need audit access." → 事务所范围的审计事件向所有者、合伙人、管理员和准备者开放。如需审计访问权限，请联系实务所有者。
  - "Status changes require owner, partner, manager, or preparer access." → 更改状态需要所有者、合伙人、管理员或准备者权限。
- `pnpm i18n:compile --strict` passes (0 missing).

### Type safety

- `pnpm exec tsc --noEmit` from `apps/app/` exits 0.

## What was deferred (8 items, all documented in matrix doc)

- **ROH-D2** — `canRequestInput = role === 'preparer'` direct string compare in `routes/obligations.tsx:4695`. Intentional product behavior (preparers ask other preparers), but bypasses the enum. P2 anti-pattern flag — left a note in matrix doc; refactoring would either need a new `obligation.requestInput` permission or a comment justifying the string-compare exception.
- **ROH-D9** — Sidebar nav (`app-shell-nav.tsx`) renders Members / Billing / Audit rows for roles that can't open them. Each destination has a canonical gate (no security hole), but it's a dead-end click. **Deferred** — touching the sidebar nav touches every route; one drain pass is too narrow a window. Will need a dedicated wave-4 pass.
- **ROH-D10** — `/settings` hub has zero permission logic; every section row links into a destination that may gate. Same shape as ROH-D9; same deferral logic.
- **ROH-D11** — Role-list copy conflation (Owner vs Admin, missing Partner). The four specific P2 instances (D4, D5, D5-clients, D6, D8) shipped above; the broader mass-cleanup (replace all hard-coded "owners and X" copy with `requiredRolesLabel(permission, i18n)` calls) needs a translation-string sweep and is too broad for this pass.
- **ROH-D12** — `/rules/library` custom-rule create/publish has no UI gate. **Backend audit needed**: there's no `rules.write` enum value today. Needs a new `Permission` value + design for how the gate looks (read-only library? hidden Create button?). Outside the "mechanical-safe" rule.
- **ROH-D14** — Same shape as D12 but for `/reminders` reminder-template mutations. Needs `reminders.write` enum. Server enforces today; UI shows the dialog.
- **ROH-D15** — `pulse.revert` enum has no UI call site. UI uses `pulse.apply` as a proxy. Roles match today (`owner|partner|manager`), so no functional drift, but if the contract diverges, silent bug. Contract-level concern.
- **ROH-D16** — No "Request access" affordance anywhere. The `PermissionGate` fallback says "Contact the practice owner" as free text; a real CTA (mailto: owner, in-app request endpoint, member.manage notification) would need design + a new RPC.
- **ROH-D17** — `coordinatorCanSeeDollars` is a per-firm toggle in the data model but there's no UI surface for an owner to enable/disable it per coordinator. Would belong on the Members page next to the role dropdown.

## Surfaces audited (21)

`/` (Today), `/deadlines` (Queue), `/deadlines/calendar`, `/clients`, `/clients/:id`, `/rules/library`, `/rules/pulse`, `/rules/sources`, `/rules/temporary`, `/practice`, `/billing`, `/billing/checkout`, `/members`, `/audit`, `/migration/new`, `/reminders`, `/notifications`, `/notifications/preferences`, `/workload`, `/opportunities`, `/settings`.

## Roles discovered (5)

`owner`, `partner`, `manager`, `preparer`, `coordinator`. The handoff said 7; source code (`packages/core/src/permissions/index.ts:1`) has 5. This is `ROH-D11`-adjacent — likely the product PDF tracks Admin (which today collapses into Owner) and a Client-facing variant, but neither exists in the enum.

## Permissions catalogued (16)

`audit.export`, `audit.read`, `billing.read`, `billing.update`, `client.write`, `dollars.read`, `firm.calendar.manage`, `firm.delete`, `firm.priority.update`, `firm.update`, `member.manage`, `migration.revert`, `migration.run`, `obligation.status.update`, `pulse.apply`, `pulse.revert`. `dollars.read` has the special toggle-conditional branch for coordinator (see `hasFirmPermission()` body).
