# Permission State Matrix — DueDateHQ Workbench

**Drained by:** Agent ρ (rho), wave-3 audit (retry pass v2)
**Snapshot:** 2026-05-27 (off commit `00e6116f`)
**Source of truth:** `packages/core/src/permissions/index.ts`
**Runtime gate:** `apps/app/src/features/permissions/permission-gate.tsx`

---

## Roles

The canonical role enum lives in `packages/core/src/permissions/index.ts` as `FIRM_ROLES`. The handoff mentioned 7 roles per the product PDF, but the source-of-truth code has **5** as of this snapshot. This is itself a drift item (`ROH-D11`) — the product model needs to either add Partner+Coordinator-variants (today they collapse) or the docs need to update.

| Role | Slug | One-line job-to-be-done |
|---|---|---|
| Owner | `owner` | Practice account holder; billing payer; only role that can delete the practice or invite/remove members |
| Partner | `partner` | Workflow lead without billing/seat powers; full read/write on practice work |
| Manager | `manager` | Operational supervisor; reads billing; applies Pulse + migration recovery |
| Preparer | `preparer` | Hands-on filer; status updates, materials, client writes; cannot apply Pulse or manage members |
| Coordinator | `coordinator` | Client-facing read-only role; deadline readiness intentionally hidden unless `coordinatorCanSeeDollars` is enabled |

> "Admin" appears in some product docs but is **not** a role in code. The code has a single account-holder role, `owner`. See drift `ROH-D11`.

---

## Permissions catalogued (16)

From `FIRM_PERMISSION_ROLES`. The matrix below shows which roles satisfy each permission. `dollars.read` for coordinator depends on the `firm.coordinatorCanSeeDollars` flag (not shown in the static table — see `hasFirmPermission()` for the conditional path).

| Permission | Owner | Partner | Manager | Preparer | Coordinator |
|---|:-:|:-:|:-:|:-:|:-:|
| `audit.export` | y | — | — | — | — |
| `audit.read` | y | y | y | y | — |
| `billing.read` | y | — | y | — | — |
| `billing.update` | y | — | — | — | — |
| `client.write` | y | y | y | y | — |
| `dollars.read` | y | y | y | y | (toggle) |
| `firm.calendar.manage` | y | y | y | — | — |
| `firm.delete` | y | — | — | — | — |
| `firm.priority.update` | y | — | — | — | — |
| `firm.update` | y | — | — | — | — |
| `member.manage` | y | — | — | — | — |
| `migration.revert` | y | y | y | — | — |
| `migration.run` | y | y | y | y | — |
| `obligation.status.update` | y | y | y | y | — |
| `pulse.apply` | y | y | y | — | — |
| `pulse.revert` | y | y | y | — | — |

---

## Surface × Role matrix

State legend:
- `view+act` — full read + write
- `view-only` — read-only render with no controls
- `view+partial` — read + some controls disabled with explainer
- `gate` — `<PermissionGate>` redirect (full-page lock)
- `hidden` — link not rendered or surface removed entirely
- `403` — server-side denial after click (no UI gate — drift)

### Top-level surfaces

| Surface | Sidebar | Owner | Partner | Manager | Preparer | Coordinator |
|---|---|---|---|---|---|---|
| `/` Today | visible | view+act | view+act | view+act | view+act | view+partial — Import disabled w/ tooltip (canonical) |
| `/deadlines` Queue | visible | view+act | view+act | view+act | view+act | **403 on bulk Set status** — UI lets coordinator open dropdown; server 403s; **ROH-D3** |
| `/clients` directory | visible | view+act | view+act | view+act | view+act | **403 on New client** — split-button has no `canCreate` gate; **ROH-D1** |
| `/clients/:id` detail | visible | view+act | view+act | view+act | view+act | view+act mostly; Activity tab EmptyState stale copy (**ROH-D5-clients**) |
| `/rules/library` | visible | view+act | view+act | view+act | view+act (limited) | **403 on action** — Custom rule create has no UI gate; **ROH-D12 (deferred)** |
| `/rules/pulse` Pulse Alerts | visible | view+act | view+act | view+act | view-only (canApply=false, copy stale ROH-D6) | view-only |
| `/rules/sources` Sources | visible | view+act | view+act | view+act | view+act | view-only |
| `/rules/temporary` Temp rules | visible (deep) | view+act | view+act | view+act | view-only | view-only |
| `/practice` Practice settings | settings hub | view+act | view-only (PermissionInlineNotice) | view-only | view-only | view-only — Delete-practice button disabled silently; **ROH-D13** |
| `/billing` Billing | settings hub | view+act | **gate** | view+act (read-only on manage) | **gate** | **gate** |
| `/billing/checkout` Checkout | n/a | view+act | gate | view+partial (Alert "Owner required") | gate | gate |
| `/members` Members | settings hub | view+act | gate | gate | gate | gate |
| `/audit` Audit log | settings hub | view+act + export | view-only (no export, **ROH-D5 copy stale**) | view-only | view-only | **gate** |
| `/deadlines/calendar` Calendar sync | settings hub | view+act | view+act (**copy stale ROH-D4**) | view+act | view-only (obscured) | view-only (obscured) |
| `/migration/new` Migration wizard | (entry) | view+act | view+act | view+act | view+act | **inline Alert** (non-canonical fallback; **ROH-D7**) |
| `/reminders` Reminder templates | settings hub | view+act | view+act | view+act | view+act (or 403) | view+act (or 403) — **NO gate, server enforces; ROH-D14 (deferred)** |
| `/notifications` Inbox | visible | user-scoped | user-scoped | user-scoped | user-scoped | user-scoped |
| `/notifications/preferences` | settings hub | user-scoped | user-scoped | user-scoped | user-scoped | user-scoped |
| `/workload` Team workload | settings hub | view-only | view-only | view-only | view-only | view-only |
| `/opportunities` Opportunities | visible | view+act | view+act | view+act | view+act | view+act |
| `/settings` Settings hub | visible | all sections | all sections | all sections | all sections | **all sections (no row-gating)**; **ROH-D10** |

### Sidebar drift

The sidebar (`apps/app/src/components/patterns/app-shell-nav.tsx`) renders the **same nav for every role**. Members/Billing/Audit live behind PermissionGate at the destination, so it's a wayfinding/UX drift, not a security hole. **ROH-D9**, cap-deferred (high blast radius for one drain pass).

---

## Permission × Call-site map

| Permission | Call sites in `apps/app/src/` | Behavior when denied |
|---|---|---|
| `audit.export` | `features/audit/audit-log-model.ts:53` (`getAuditExportUnavailableReason`); `features/audit/audit-log-page.tsx:660` (PermissionInlineNotice) | Export button hidden; PermissionInlineNotice "Only the practice owner can export…" — canonical, correct. |
| `audit.read` | `features/audit/audit-log-page.tsx:466` (gate); `features/clients/ClientFactsWorkspace.tsx:2075` (Activity tab branch) | `/audit` → PermissionGate description **stale — partner missing, ROH-D5**; client Activity tab EmptyState same stale copy (**ROH-D5-clients**) |
| `billing.read` | `routes/billing.tsx:188`, `routes/billing.checkout.tsx:155` | Both render canonical PermissionGate — correct. |
| `billing.update` | `routes/billing.tsx:214`, `routes/billing.checkout.tsx:222` | Checkout shows red "Owner permission required" Alert; billing dashboard disables Manage CTA. Correct (single-role permission, no drift). |
| `client.write` | **no call sites in apps/app/src/** | **ROH-D1** — `ClientsCreateSplitButton` "+ New client" renders for all roles; mutation 403s. |
| `dollars.read` | only inside `hasFirmPermission()` itself | No surface checks this enum directly. The toggle is set on the firm record but no UI surface lets an owner manage it per-coordinator. **ROH-D17 (deferred — needs design)**. |
| `firm.calendar.manage` | `features/calendar/calendar-model.ts:21` (`canManageFirmCalendar`); `features/calendar/calendar-page.tsx:439` (PermissionObscuredContent) | Calendar feed enable controls hidden behind PermissionObscuredContent. **Copy stale — partner missing, ROH-D4**. |
| `firm.delete` | `routes/practice.tsx:167` | Delete-practice button disabled silently for non-owner. **No tooltip explains why; ROH-D13** |
| `firm.priority.update` | `routes/practice.tsx:162` | Smart Priority card swapped to PermissionObscuredContent — canonical. |
| `firm.update` | `routes/practice.tsx:157` | Form inputs disabled + PermissionInlineNotice — canonical. |
| `member.manage` | `features/members/members-page.tsx:99` | Whole `/members` route swapped for PermissionGate — canonical. |
| `migration.revert` | `features/migration/ImportHistoryDrawer.tsx:230` | PermissionInlineNotice; **override copy stale — partner missing, ROH-D8** |
| `migration.run` | `routes/dashboard.tsx:92`, `routes/clients.tsx:103`, `routes/migration.new.tsx:26`, `features/migration/ImportHistoryDrawer.tsx:75`, `CommandPalette.tsx:65`, `routes/obligations.tsx:991` | Import button disabled with tooltip (dashboard, canonical); split-button dropdown item disabled (clients, canonical); inline Alert (migration.new — **ROH-D7 non-canonical**) |
| `obligation.status.update` | **no call sites** | **ROH-D3** — queue bulk "Set status" dropdown not gated; click → server 403 |
| `pulse.apply` | `features/pulse/PulseDetailDrawer.tsx:153` | `canApply` flows to every mutation button. **Read-only Alert copy stale — partner missing, ROH-D6** |
| `pulse.revert` | **no call sites** | UI uses `pulse.apply` as proxy. Roles match today (both `owner|partner|manager`). Contract-level drift; documented as **ROH-D15 (deferred)**. |
| `requiredRolesLabel` / `roleLabel` | `CommandPalette.tsx:40` | Canonical helper for "owner, partner, manager" formatting — used in tooltips. Adoption is partial — the stale-copy Alerts above (`ROH-D4/D5/D6/D8`) bypass it. |

---

## Drift inventory

### P0 — security / data-loss / lockout

**None.** Server-side enforcement is in place for every mutation gap below (verified by inspection of the affected mutation handlers in `apps/server/src/contracts/*`). The UI gaps below cause **403 toasts after click**, not data loss or privilege escalation.

### P1 — bad UX / silent denial / dead-end clicks

| ID | Surface | Behavior | Expected | Severity |
|---|---|---|---|---|
| **ROH-D1** | `/clients` → "+ New client" split button | Primary button renders for coordinator; clicking opens dialog; submit 403s | Disable button + title tooltip for coordinator (mirror `/today` Import pattern) | P1 |
| **ROH-D3** | `/deadlines` queue bulk "Set status" dropdown | Coordinator can open dropdown, click a status, mutation 403s | Disable dropdown trigger + title tooltip when `!can('obligation.status.update')` | P1 |
| **ROH-D9** | Sidebar nav (`app-shell-nav.tsx`) | Audit / Members / Billing rows render for roles that can't open them | Filter nav rows by role (or grey + tooltip). Each destination's gate catches the click, so it's UX cleanup, not security. | P1 (deferred — high blast radius) |
| **ROH-D10** | `/settings` hub | All four sections render rows for everyone | Hide or grey-out rows for which the linked surface's permission resolves false. The Settings page has zero permission logic today. | P1 |
| **ROH-D11** | "Admin" / role-list copy conflation | Several copy strings use Owner-only or omit Partner | Use `requiredRolesLabel(permission, i18n)` instead of hard-coded role lists (see ROH-D4/D5/D6/D8 for specifics). | P1 (mass copy fix) |
| **ROH-D13** | `/practice` Delete-practice button | Disabled for non-owner with no tooltip — silent denial | Add `title` attribute mirroring the dashboard Import pattern | P1 |

### P2 — polish / copy

| ID | Surface | Behavior | Expected | Severity |
|---|---|---|---|---|
| **ROH-D2** | `/deadlines/:ref` drawer "Request input" | `canRequestInput = role === 'preparer'` direct string compare bypasses the permission enum (`obligations.tsx:4695`) | Use a named permission or document intentional drift (today: only preparers see the "Request input from me" affordance because that's the user model — preparers ask other preparers; document instead of refactor) | P2 (anti-pattern) |
| **ROH-D4** | `/deadlines/calendar` Calendar Sync | Notice copy: "Only owners and managers can enable…" — actual permission `firm.calendar.manage` includes **partner** | Drop the `notice` override and let `PermissionObscuredContent` derive copy from `requiredRolesForFirmPermission` | P2 |
| **ROH-D5** | `/audit` PermissionGate description | "owners, managers, and preparers" — partner missing | Reword to include partner | P2 |
| **ROH-D5-clients** | Client Activity tab EmptyState | "Owners, managers, and preparers can inspect client activity" — partner missing | Reword to include partner | P2 |
| **ROH-D6** | Pulse drawer "Read-only view" Alert | "Only owners and managers can apply Pulse changes." — partner missing | Replace ad-hoc Alert with `PermissionInlineNotice` for `pulse.apply` | P2 |
| **ROH-D7** | `/migration/new` no-permission branch | Custom inline Alert with verbatim "Owner or manager access required" — bypasses canonical PermissionGate | Swap for canonical `<PermissionGate permission="migration.run">` | P2 |
| **ROH-D8** | `ImportHistoryDrawer` PermissionInlineNotice override | Override text says "Only owners and managers can undo migration imports." — partner missing | Drop the override; let PermissionInlineNotice derive default | P2 |

### Wave-4 candidates (deferred — needs new enum value, design, or backend audit)

| ID | Surface | Reason deferred |
|---|---|---|
| **ROH-D12** | `/rules/library` custom rule create / publish controls | No `rules.write` enum exists. Server enforces but no UI gate; needs design + new Permission value. |
| **ROH-D14** | `/reminders` reminder template editor | No `reminders.write` enum. Server enforces template mutations; UI shows the dialog to all roles. Needs new enum. |
| **ROH-D15** | `pulse.revert` permission enum | UI uses `pulse.apply` as a proxy. Roles match today, so no functional drift — but if they diverge, silent bug. Contract-level fix, not UI. |
| **ROH-D16** | "Request access" affordance | No surface today offers a "Request access" CTA on a PermissionGate. The fallback recommends "Contact the practice owner" via free-text. A real CTA (mailto: owner / in-app request) would need design + new endpoint. |
| **ROH-D17** | `coordinatorCanSeeDollars` discovery | The toggle exists in code but has no UI surface for owners to enable/disable it per coordinator. Members page likely needs a per-member dollars-visibility switch. |

---

## Notes on the canonical gate API (`permission-gate.tsx`)

The module exports four primitives. Use them in this preference order:

1. **`<PermissionGate permission=… firm=… description=… secondaryAction=…>`** — full-page replacement when the whole route is unavailable to the role. Used by `/members`, `/billing`, `/audit`. Renders a centered Card with required-roles badge + return-to-Today button.
2. **`<PermissionInlineNotice permission=… currentRole=… >`** — inline Alert above a read-only form. Used by `/practice` (firm.update), `/audit` page header (audit.export). Auto-derives current role + required roles from the helper.
3. **`<PermissionObscuredContent locked permission=… currentRole=… fallback=… notice=…>`** — blur-overlay treatment for surfaces that should hint at the gated content without exposing it. Used by `/practice` Smart Priority and `/deadlines/calendar` feed controls.
4. **`useFirmPermission()`** — hook for in-line `disabled` + `title` patterns on individual controls. Used by `/today` Import button, `/clients` import dropdown item, etc.

**Anti-patterns observed:**
- Custom `<Alert>` with hard-coded "Only owners and X can…" copy (ROH-D6, ROH-D7, ROH-D8 override text). These bypass the helper and drift when the FIRM_PERMISSION_ROLES table changes.
- Direct role-string compares (`role === 'preparer'`, ROH-D2). The permission enum exists precisely to avoid this.
- Surfaces with **no** gate that 403 server-side (ROH-D1 New client, ROH-D3 status dropdown). Server enforces, but user clicks dead-end.

## Shipped in this drain pass (8 items)

| ID | File(s) touched | Fix |
|---|---|---|
| ROH-D1 | `routes/clients.tsx`, `features/clients/ClientsCreateSplitButton.tsx` | Added `canCreate` prop on split button; disabled + title when `!can('client.write')` |
| ROH-D3 | `routes/obligations.tsx` | Bulk "Set status" dropdown trigger disabled + tooltip when `!can('obligation.status.update')` |
| ROH-D4 | `features/calendar/calendar-page.tsx` | Dropped the stale `notice` override on `PermissionObscuredContent`; default now derives partners from helper |
| ROH-D5 | `features/audit/audit-log-page.tsx` | Description includes partners |
| ROH-D5-clients | `features/clients/ClientFactsWorkspace.tsx` | Activity-tab EmptyState description includes partners |
| ROH-D6 | `features/pulse/PulseDetailDrawer.tsx` | Replaced ad-hoc Alert with canonical `PermissionInlineNotice` for `pulse.apply` |
| ROH-D7 | `routes/migration.new.tsx` | Replaced custom Alert with canonical `<PermissionGate permission="migration.run">` |
| ROH-D8 | `features/migration/ImportHistoryDrawer.tsx` | Dropped stale override copy; PermissionInlineNotice now auto-derives required-role text |
| ROH-D13 | `routes/practice.tsx` | Added `title` tooltip on Delete-practice button when disabled-by-permission |

Deferred for wave-4: ROH-D2, ROH-D9, ROH-D10, ROH-D11 (mass), ROH-D12, ROH-D14, ROH-D15, ROH-D16, ROH-D17.
