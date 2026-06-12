# 2026-06-12 — One reminder-template editor, one variable vocabulary

From the full-app UX critique (P0 #13/#14): the product shipped TWO
editors for the same three templates with contradictory variable
vocabularies. The /reminders modal documented the send pipeline's real
variables (`client_name, tax_type, due_date, offset_days,
obligation_url / unsubscribe_url / request_url …` — verified against
`apps/server/src/jobs/reminders/dispatch.ts` and the readiness email
path). The full-page editor at /settings/reminders/templates(+/edit)
advertised an invented set (`{{deadline_date}}, {{cpa_name}},
{{firm_name}}`) the dispatcher never supplies, rendered its live
preview under a fictional firm identity ("Jules Rivera · Hawthorn CPA ·
412 Oak St"), and surrounded it with dead chrome (permanently disabled
rich-text toolbar, cadence/trigger controls, "New template", while
"Delete template" stayed enabled). Client-facing email is the highest-
stakes output in the product — a CPA editing against the wrong variable
list ships emails with raw `{{tokens}}`.

## Change

- `apps/app/src/router.tsx`: `/settings/reminders/templates` and
  `…/templates/edit` are now 301 redirects to `/reminders` (same
  alias pattern as /obligations → /deadlines), preserving query+hash.
- Deleted the fictional surface: `routes/reminders.templates{,.edit}.tsx`,
  `features/reminders/reminder-templates-page.tsx`,
  `reminder-template-editor-page.tsx` (+ their tests), and their
  route-summary entries.
- `/reminders` (modal editor, correct vocabulary, real `updateTemplate`
  save path) is the single canonical editor.

## Verify

- App vitest: 74 files / 523 pass after removal; tsgo clean (pre-existing
  in-flight errors from the parallel session's dashboard refactor aside).
- Live: `/settings/reminders/templates/edit?template=client-30-day` lands
  on `/reminders?template=client-30-day`; "Hawthorn" appears nowhere.

## Follow-ups (catalogued)

- Seed leaves `reminder.template_id` NULL so per-template Sent counts read
  0 — Phase 1e seed pass.
- A resolving live preview inside the /reminders modal (using
  `renderReminderTemplate` + registry sample values) would restore the one
  good idea the deleted page had — Phase 2/5 candidate.
