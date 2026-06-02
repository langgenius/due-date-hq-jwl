# Audit Log — Coverage, Clarity, and Client-Communications

## Scope

- A pass over the firm Audit Log to make it (a) cover the product's real
  operations and (b) render every change in plain language a CPA can read.
- Server write paths (procedures, jobs, webhooks, routes), the audit taxonomy
  (`packages/contracts` + `packages/db`), and the read/render surfaces
  (`apps/app/src/features/audit`).
- Anchored on the spec at `docs/Design/audit-log-surface-requirements.md` and a
  three-tier model agreed up front: **① compliance audit** (`audit_event` →
  `/audit`, for CPAs), **② provenance** (`evidence_link` / `ai_output`), **③
  operational telemetry** (Workers Logs / `llm_log`, for developers). Tier-③
  signals were deliberately kept OUT of the CPA audit table.

## Changes

### Coverage + taxonomy

- **Category bucketing fix** (`packages/db/src/repo/audit.ts`): `firm.*`,
  `readiness.*`, `penalty.*`, and `obligations.*` (plural) used to fall through
  to the `system` catch-all and were invisible to their logical category
  filter. Added the missing prefixes; routed the `ai` category by `actorType`
  (it's a provenance axis, not an action prefix); added first-class `calendar`
  and `reminder` categories. New exported `categoryForAction()` + tests lock it
  in.
- **Action taxonomy rationalized** (contracts + db schema): added typed
  Obligation / Readiness / Member / Firm / Opportunity / Calendar / Reminder
  action groups for strings that were written but undeclared; dropped the
  phantom `pulse.ingest` / `pulse.extract` (tier-③ telemetry, never written to
  the audit table); added the used-but-undeclared `auth.mfa.challenge.verified`.
- **New audit writes** for previously-silent state changes: calendar feed
  subscription create / regenerate / disable, `reminder.template.updated`,
  `readiness.checklist.regenerated`.
- **Actor correctness**: anonymous client-portal events (readiness opened /
  submitted) and the audit-package builder now write `actorType:'system'`
  instead of defaulting to `user`; the package failure path emits
  `export.audit_package.failed`.
- **AI provenance** (`actorType:'ai_assisted'` + `previousActorType:'ai'`) now
  set where a human applies an AI-produced value — migration mapper/normalizer
  confirms, AI rule-draft acceptance, and `pulse.apply` — so the "AI" filter
  actually returns rows.
- **Failed sign-ins** are emitted as structured security telemetry (tier-③) in
  the auth route, NOT the audit table: `audit_event.firm_id` is NOT NULL and a
  bad attempt usually has no firm. Successful logins remain firm-scoped audits.

### Readability (every change reads in plain English)

- **`ruleDiffPresenter`** (`audit-change-view.ts`): rule changes used to collapse
  the nested rule body to "Details updated". They now humanize the aspects a CPA
  reviews — when it's due (`humanizeDueDateLogic`), extension policy,
  jurisdiction, form, filing year — plus version/status. The audit payload
  already carried the rule body; this just renders it.
- Added field/enum labels (due-date, extension, jurisdiction, privacy mode,
  failure reason, …) and humanized the dynamic reminder `templateKey`.
- **`reminderEventPresenter`**: event-style audits (no before→after diff) render
  as a clean headline (the action label) with the failure/bounce reason as a
  note; the technical `clientId` stays hidden.

### Client reminder lifecycle (the spec's most-requested gap)

- **Plumbing** (`packages/db/src/reminder-linkage.ts`): an `email_outbox` row
  carries no client or deadline — those live on the linked `reminder` row(s).
  `reminderLinkageByOutboxId` / `markRemindersOpened` recover that linkage from
  an outbox id and stamp first-open (`clickedAt`), returning only freshly-opened
  rows for first-open-only dedup. The Resend webhook now recognizes
  `email.opened`/`clicked` (previously dropped). Migration `0062` indexes
  `reminder(email_outbox_id)`.
- **Audit writes**: `reminder.sent` / `reminder.failed` at actual dispatch
  (`jobs/email/outbox.ts`), `reminder.bounced` / `reminder.opened` from the
  delivery webhook, `reminder.unsubscribed` from the public unsubscribe link
  (new suppression only). All system-actor, entity = the obligation (deadline),
  so they land on the deadline's timeline.

### Per-entity audit surfaces

- Extracted a reusable `EntityAuditActivityPanel` (generalizing the per-client
  Activity tab) and wired it into the **rule detail** (version history) and the
  **Pulse alert drawer** (Activity tab) — both filtered by `entityType` +
  `entityId`.

## Key decisions

- **Login failures → tier-③, not the audit table.** The `firm_id` NOT NULL
  constraint makes firm-scoped login-failure events impossible for the common
  case (unknown email / pre-firm). This is why the declared `auth.login.failed`
  action was never wired; it stays reserved.
- **No audit on `afterCreateOrganization`.** `createOrganization` is only ever
  called from `firms.create`, which already writes `firm.created` — auditing the
  hook too would double-log.
- **Reminder events keyed on `obligation_instance`.** A client-detail roll-up of
  these by client is a small follow-up (`clientId` is already in the payload).
- Internal member reminders + the morning digest are intentionally NOT audited
  (not client-facing, high-noise).

## Validation

- Per-package `tsc --noEmit` across contracts / db / server / app — clean (the
  one persistent `packages/ingest/src/pdf.ts` pdfjs-dist type warning is
  pre-existing and unrelated). The full `vp check` still panics locally, so
  typecheck/test were run per-package (see dev-file notes on the env).
- `vp test`: contracts 30, db 149, server 446, app audit/clients/dashboard/rules
  91 — all passing. New tests cover category bucketing, the rule diff (humanized
  due-date/extension, no raw JSON), reminder lifecycle change views, and the
  webhook bounce/open audits with first-open dedup.
- Landed on `main` in five reviewable commits (P1/P2 coverage+clarity, per-entity
  panels, then the three client-comms stages); each ran the pre-commit
  `vp staged` hook (no `--no-verify`). `main` advanced several times mid-work
  (demo-data + a validation fix); each commit was rebased over it (no file
  overlap → conflict-free) and fast-forwarded.

## Follow-ups

- Apply migration `0062` on deploy (`pnpm db:migrate:local|remote`).
- Optional: surface reminder lifecycle events on the client-detail Activity tab
  (group by `clientId`).
- The remaining tier-③ items (Pulse source-health / ingest telemetry, AI
  generation provenance) stay in Workers Logs + `ai_output`/`llm_log` by design;
  a staff-only ops view would consolidate them without polluting `/audit`.
