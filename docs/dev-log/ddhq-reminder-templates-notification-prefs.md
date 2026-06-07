# Reminder template library + editor + notification preferences (Pencil replication)

Date: 2026-06-07

Pixel replication of three Pencil screens into functional routes. No DB,
contract, or server changes — all three reuse existing reminder /
notification-preference contracts.

## Screens

- **`HMD36` → `/settings/reminders/templates`** — template library. Two-column
  card grid of reminder templates. New route.
- **`bbofq` → `/settings/reminders/templates/edit`** — dedicated template editor
  with a live email preview pane. New route (selected via `?template=<key>`).
- **`Y5UWd` → `/notifications/preferences`** — restyled the existing
  notification-preferences page to the canvas: Channels card, per-type ×
  per-channel matrix, Quiet hours card.

## Files

- `apps/app/src/features/reminders/reminder-templates-page.tsx` (new)
- `apps/app/src/routes/reminders.templates.tsx` (new)
- `apps/app/src/features/reminders/reminder-template-editor-page.tsx` (new)
- `apps/app/src/routes/reminders.templates.edit.tsx` (new)
- `apps/app/src/features/notifications/notification-preferences-page.tsx`
  (restyled to canvas)
- `apps/app/src/router.tsx` — two new lazy routes registered.
- `apps/app/src/routes/route-summary.ts` — `reminderTemplates` +
  `reminderTemplateEdit` summaries.

## Functional wiring

- Library reads `reminders.listTemplates`; each card links to the editor with
  the `templateKey` in the query string.
- Editor loads the template from `listTemplates` (no per-key contract), edits
  Subject + Body, saves via `reminders.updateTemplate`, then navigates back.
  Save is disabled until the form is dirty; live preview substitutes sample
  variables into subject/body in real time.
- Notification preferences keep their wired `getPreferences` /
  `updatePreferences` / `previewMorningDigest` mutations; restyle is visual only.

## TODO(data) gaps (contract doesn't model the canvas)

- Template **rename**, **create**, **delete** — `ReminderTemplateUpdateInput`
  only carries subject/bodyText/active. Name field is read-only; New template /
  Delete buttons are disabled.
- Template **audience tag**, **cadence**, **trigger anchor/offset**, **last
  edited by**, **audience count/avatars** — not on `ReminderTemplatePublic`.
  Chips/segmented controls are presentational (disabled) with static fallbacks
  derived from `kind` where possible.
- Body **rich-text toolbar** + **variable picker** — presentational; not wired
  to a markdown engine.
- Notification **per-type × per-channel matrix**, **push/Slack channels**,
  **quiet hours** — `NotificationPreferencePublic` only has 5 boolean flags +
  morning digest. The five real flags drive the matrix rows that map to them;
  push/Slack/quiet-hours are static disabled UI.
