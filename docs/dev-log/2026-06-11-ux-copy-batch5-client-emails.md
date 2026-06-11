# UX copy batch 5 — client-facing email copy (2026-06-11)

**Reference:** docs/Design/ux-copy-audit-2026-06-11.md, §2.13.

These emails go out under the firm's own name — they must read like something a CPA would proudly send, not a subscription service. None of this copy renders in React (no lingui catalogs involved).

## Default reminder templates (`packages/db/src/repo/reminders.ts`)

- **Team reminder** — subject "Action needed in {{offset_days}} days: …" → "{{client_name}}: {{tax_type}} due in {{offset_days}} days"; body drops "client-materials or review blockers" (engineering vocabulary) and the nonsense clock "before the countdown reaches the due date" → "clear pending client materials and review items before the due date".
- **30-day client reminder** — "Our office is tracking your upcoming {{tax_type}} deadline…" (subscription-service voice) → "Your {{tax_type}} is due {{due_date}} — 30 days from now." with the secure-request expectation kept.
- **7-day client reminder** — conditional courtesy ("If you have received a secure materials request… as soon as practical") → direct: "Complete any outstanding requests from our office now so we can finish review and file on time."
- **Materials request** — "Items we have already received:" → "Already received:"; closing paragraph de-passived.
- Subjects standardize on "due in N days" (the noun "deadline" stays for the tracked object; "due" is the date relationship).

## Signature reminder (`packages/core/src/email-template/index.ts`)

- Subject "Reminder: please sign Form 8879…" → "Signature needed: Form 8879 for your {{tax_year}} {{form}} return".
- Body drops the banned apologetic lead "This is a friendly reminder…" → "Your {{tax_year}} {{form}} return needs your signature on Form 8879 (the e-file authorization). We can't file electronically until we have it."

## Morning digest + ICS

- Digest subject "DueDateHQ morning digest - {{date}}" → "Deadline digest — {{date}}"; body header now leads with the firm name; "Pulse changes" (internal brand) → "Alerts".
- ICS feed description: "External calendar reminders are best-effort" (SRE vocabulary) → "Calendar reminders are informational — DueDateHQ email and in-app reminders are authoritative."

Deliberately NOT changed: the EN invitation subject "Join {organizationName} on DueDateHQ" (clear and standard; the zh equivalent was aligned to it in batch 3), and the outbox fallback subject "DueDateHQ notification" (a generic fail-open should not claim to be a deadline alert).

Tests updated alongside (email-template, reminders defaults) — all pass. Existing firms keep their seeded copies; new seeds get the new defaults.
