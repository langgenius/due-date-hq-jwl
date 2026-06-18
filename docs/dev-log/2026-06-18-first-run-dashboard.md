# First-run /today empty state (onboarding proposal A)

_2026-06-18 · Yuqi approved · from the onboarding-design audit_

Closes the worst onboarding dead-end (audit gap #1): a fresh practice that skips
the importer landed on `/today` with three silent sections (collapsed brief,
empty Needs-attention, empty Priorities) and **no visible next action** — the
user had to already know `/clients` existed to find the import affordance.

## What changed

`routes/dashboard.tsx`: when the existing `clientsProbeQuery` (a `limit: 1` probe)
resolves to zero clients, `/today` now leads with the designed
[`ClientsEmptyState`](../../apps/app/src/features/clients/ClientsEmptyState.tsx)
hero (the same "import your clients" get-started surface `/clients` shows) instead
of the three empty sections. Primary "Import clients" CTA wired to the canonical
`openWizard` (`useMigrationWizard`), gated by `permission.can('migration.run')`.

Notes:

- **No new backend / no fiction.** The probe query already existed (kept for its
  shared cache-warming side effect); its derived flag was parked-unused with a
  comment that the import CTA was the intended follow-up — this finishes it.
- The PageHeader masthead (greeting + date) stays; only the body sections swap.
- Sample-data chip + "add manually" omitted on `/today` (audit gap #3 — the
  sample path is ambiguous; the full hero with those lives on `/clients`).
- Reused strings only → i18n extract idempotent, zero new translations.

## Verification

- `tsgo` 0; 543 app tests pass; build green; i18n idempotent.
- `ClientsEmptyState` is the proven `/clients` empty-state component (renders
  verified there); the conditional is a simple resolved-and-empty branch.
- The live `/today` first-run state needs a no-clients firm + the local Worker,
  which isn't seedable here (demo-login 502) — same limitation as the other gated
  surfaces this session. Flagged for a real-backend visual check.
