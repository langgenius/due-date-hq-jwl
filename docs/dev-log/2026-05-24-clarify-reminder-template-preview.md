---
title: 'Reminder templates show rendered preview, not raw mustache (clarify)'
date: 2026-05-24
author: 'Claude (Yuqi pairing)'
area: reminders
---

# Templates render against sample data (critique P1 — clarify)

## Why

`/reminders` (Settings → Reminders) template table showed:

```
Client deadline reminder
{{client_name}}: {{tax_type}} due {{due_date}}      Active   0
```

A CPA reading this can't tell what the recipient will receive
without mentally rendering the template. The Usage column says `0`
for both templates and "Sent last 7 days" reads `0` — possibly
because no one could tell what they were activating. Either way,
the template body is a recipient-facing artifact; the surface
should preview it as such.

## What changed

### `reminders-page.tsx`

- New `renderReminderTemplatePreview(template)` helper at module
  scope. Replaces every `{{var_name}}` with a recognizable sample
  value (`Acme LLC`, `Form 1065`, `May 15, 2026`, `7`,
  `duedatehq.com/o/sample`, `duedatehq.com/u/sample`). Unknown
  variables fall through unchanged so authors still see "what's
  not bound" if they typo a name.
- Sample dict (`REMINDER_TEMPLATE_SAMPLE`) is module-scoped and
  comment-noted as needing to stay in sync with the canonical
  server-side variable list.
- Template table second-line subject now passes through that
  helper. The raw mustache still appears in the `<TemplateDialog>`
  Edit modal where authors need to write it.

## How to verify

`/reminders` (Settings → Reminders):

| Template name              | Was                                              | Is                                     |
| -------------------------- | ------------------------------------------------ | -------------------------------------- |
| Client deadline reminder   | `{{client_name}}: {{tax_type}} due {{due_date}}` | `Acme LLC: Form 1065 due May 15, 2026` |
| Internal deadline reminder | `{{client_name}} due in {{offset_days}} days`    | `Acme LLC due in 7 days`               |

Click **Edit** on either row — the Subject field still shows the
raw mustache, which is what an author needs to author it.

## Out of scope

- Body preview. The Body field only shows up in the Edit dialog
  right now (subject is the row's tagline). If we later surface
  body anywhere outside Edit, route it through the same helper.
- Per-template sample customization (e.g. let the author preview
  against a specific client). Cleaner once a real client picker
  has a home in the template dialog — defer until then.
- A `__test__/reminders-preview.test.ts`. The substitution is a
  one-line regex over a static dict; not worth a dedicated test
  until the variable list grows or the renderer gets smarter
  (escaping, locale, conditional sections).

## Files touched

- M `apps/app/src/features/reminders/reminders-page.tsx`
