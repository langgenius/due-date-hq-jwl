# Pin toggle icon + audit P3 sweep

**Date:** 2026-06-23
**Surfaces:** `apps/app/src/features/obligations/PinButton.tsx`;
`features/clients/ClientDetailWorkspace.tsx`,
`features/notifications/notification-preferences-page.tsx`,
`routes/rules.library.tsx`.

## Pin placement — finished

The pin feature works (optimistic flip on the list cache, onSettled fan-out to
list / detail / dashboard / audit, audit-recorded). The defect was the **icon**:
the unpinned state rendered `PinOffIcon` (a pin with a slash), which read as
"pinning disabled here" — the orphaned/odd control in the deadline footer.

Now one pin glyph toggles **outline ⇄ filled**: hollow muted pin = unpinned
("pin this"), `fill-current` accent pin = pinned — the conventional
bookmark/star two-state. Placement is unchanged and sound: the detail footer
action cluster (canonical toggle) + the `/today` Pinned section (manage/unpin);
pinning from the list rows would add per-row chrome against the calm-on-dense
rule, so it stays a deliberate detail action. Verified live: unpinned renders
`lucide-pin` (outline), no slash.

## Audit P3 — swept to zero (actionable)

- **Copy recap** (client AI insight, `CopyRecapButton`) only flips to "Copied"
  after `clipboard.writeText` resolves; on failure (no clipboard API / denied
  permission) it shows an error toast instead of a false confirmation.
- **Create custom rule** — the server activates it immediately (can generate
  deadlines + write audit), so `onSuccess` now fans out to obligations +
  dashboard + audit, not just rules.
- **Morning-digest preview** invalidates `listMorningDigestRuns` so the queued
  run appears without a manual refetch.

Remaining P3s are **intentional by design** and left as-is: optimistic toggles
with instant local flips (checklist edit, batch docs-received, pin/unpin in the
list), idempotent undo-from-toast TextLinks (sonner can't disable mid-flight),
and page-scoped error Alerts (members settings) that are consistent within their
page.

## Verify

`tsgo` app clean; `vp run @duedatehq/app#build` clean; one new string
("Couldn't copy recap") extracted + zh-CN translated (无法复制摘要),
`i18n:compile --strict` passes (0 missing). Pushed `HEAD:main`.
