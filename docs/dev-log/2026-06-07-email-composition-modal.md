# Email composition modal

Date: 2026-06-07

Pencil `W7onE` — the client-email composition modal. There was no compose
surface in the app and no email-send procedure in the contracts, so this
builds the modal shell and wires it to a real entry point, with the send
controls honestly disabled until a backend lands.

## What shipped (NO contract/DB change)

- `apps/app/src/features/clients/EmailComposeDialog.tsx` (new)
  - Two-column compose modal on the shared `Dialog` primitive. Left column:
    recipient chip · subject (live editable) · formatting toolbar · body
    (live `Textarea`). Right column: read-only context rows, optional
    readiness-portal banner, attachments list, sender footnote. Header carries
    a mail icon, "New message", optional template chip, Save-as-draft, close +
    `Esc`. Footer carries Discard / Schedule send / Send now.
  - Controlled (`open` / `onOpenChange`) + prefill props (recipient, subject,
    body, context rows, attachments). Subject + body are real draft state that
    resets on open.

- `apps/app/src/features/clients/ClientDetailWorkspace.tsx`
  - The CONTACTS rail section gains a per-contact compose button (when the
    contact has an email) that opens the modal prefilled with the recipient +
    client context (`ComposeContactButton` keeps the recipient payload
    assertion-free).

## TODO(data) — send is disabled on purpose

There is no `messages.send` / email-send procedure in the contracts. Per the
"controls with no backing handler → disabled + TODO" rule, **Send now,
Schedule send, and Save as draft are disabled** with an explanatory tooltip
("Sending isn't available yet — no email backend is wired."). The rich-text
toolbar + variable insertion are likewise visual-only (plain `Textarea`
editing works). When an email-send RPC ships, wire it into
`EmailComposeDialog` (a single `onSend` handler + enabling the footer
buttons). Flagged inline in the component header.
