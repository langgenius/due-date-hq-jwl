# Alerts rename (Pulse → Alerts, app layer) + Dismiss/Snooze/Archive removal

## Context

`Pulse` / `Pulse Changes` / `Radar` / `Pulse updates` were the same feature under
different names across surfaces — a long-standing source of confusion that
`docs/Design/pulse-vocabulary.md` itself documented. We collapsed the user-facing
and frontend vocabulary to a single word, **Alerts**, and trimmed two low-value
queue actions.

Scope decision (Tier 2): the app layer is renamed; the **engine keeps `pulse`** at
the boundary the user never sees — DB tables (`pulse_*`), contract schemas
(`Pulse*`, `PulseAlertPublic`, …), the `orpc.pulse` RPC namespace, ports, and
server jobs. No database migration. Frontend code still imports `pulse`-named
contract types and calls `orpc.pulse.*`; that is intentional.

## Change

### Rename (app layer → Alerts)

- `apps/app/src/features/pulse/` → `apps/app/src/features/alerts/`; component / hook
  / type renames (`PulseAlertCard`→`AlertCard`, `PulseDetailDrawer`→`AlertDetailDrawer`,
  `usePulseDrawer`→`useAlertDrawer`, `pulseAlertTone`→`alertTone`, etc.).
  `PulsingDot` is kept — it names a generic pulsing animation, not the product.
- Route moved out of the Rules subtree: `/rules/pulse[/history]` → `/alerts[/history]`.
  `router.tsx` mounts the new paths and redirects the legacy paths via
  `alertsAliasLoader` / `alertsHistoryAliasLoader` (reusing
  `redirectToPathPreservingRequest`), preserving `?alert=<id>` deep links + hash.
  Sidebar nav, command palette, dashboard, client detail, and `route-summary`
  updated; `?tab=pulse` legacy compatibility key retained (now points to `/alerts`).
- User-facing copy: every live Lingui string (`t`, `Trans`, `msg`) saying "Pulse"
  became "Alert(s)" (audit labels, drawer/list copy, notification prefs, billing,
  concept help). Ran `i18n:extract` + `i18n:compile --strict`; 43 zh-CN strings
  added (Alert/Alerts → 提醒).
- Kept as `pulse` (engine): audit-action keys (`pulse.apply` → `pulseApply` label key),
  `ErrorCodes.PULSE_*`, the `pulseId` field, `MESSAGE_BY_RAW` keys (match raw server
  error text), and the `?mockPulse=1` dev flag.

### Action trim (frontend only)

- Removed **Dismiss**, **Snooze 24h**, and **Archive** from the Alerts UI — the list
  card kebab menu is gone entirely, and the detail drawer footer drops both buttons.
  Deleted the now-unused `PulseReasonDialog`.
- `Mark reviewed` is now the single "clear without applying" path; terminal alerts can
  no longer be hidden from the list (accepted trade-off).
- Backend untouched (`orpc.pulse.dismiss/snooze` endpoints, contracts, repo remain);
  historical `dismissed`/`snoozed` records still render in history.

## Validation

- `pnpm exec vp check` — 0 errors across 734 files (8 pre-existing warnings).
- `pnpm --filter @duedatehq/app test` — 66 files / 443 tests pass.
- `pnpm --filter @duedatehq/app i18n:extract && i18n:compile` — strict compile clean.
- e2e specs updated (`pulse.spec.ts`, `rbac-permissions.spec.ts`): `/alerts` URLs,
  new aria-labels (`Alert detail`, `Alert: …`, `Open Alert details: …`), removed the
  Dismiss/Snooze disabled assertions, added a `/rules/pulse → /alerts` redirect test.
- Browser smoke (no backend auth): `/rules/pulse?alert=abc123` redirects to
  `/alerts?alert=abc123` (alias loader + query preservation confirmed at runtime);
  no routing console errors.

## Follow-up cleanup — visible Pulse remnants

After the rename, a second pass removed remaining visible Pulse vocabulary while keeping the
engine boundary intact:

- Live app copy: manager-review drawer text and temporary-rule empty-state text now say
  `alert` instead of `Pulse`; Lingui catalogs were extracted, zh-CN translations were filled,
  and `i18n:compile --strict` passed.
- Current guidance and external copy: `DESIGN.md`, `docs/Design/pulse-vocabulary.md`,
  README project summaries, marketing page copy, and `llms.txt` guidance now use Alerts /
  alert wording.
- Developer comments: app-layer comments that referred to the old product name were updated to
  Alerts / alert drawer where they were describing the frontend surface. Contract types,
  `orpc.pulse`, permission keys, DB/job naming, raw engine errors, legacy redirects, and
  historical docs intentionally remain `pulse`.
