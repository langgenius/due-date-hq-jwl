# 2026-05-04 · Client Multi-State Filing Profiles

## Change

Implemented the first end-to-end multi-state client filing model.

- Added tenant-scoped `client_filing_profile` with one active profile per client/state and at most
  one active primary profile.
- Kept `client.state/county` as compatibility mirrors for the primary profile; clients without a
  filing state remain importable and show as needs facts.
- Added `obligation_instance.jurisdiction` and nullable `client_filing_profile_id`.
- Updated generated obligation idempotency to include jurisdiction, so federal rows dedupe while
  state rows generate per active filing profile.
- Added filing profile contracts and `clients.replaceFilingProfiles`; client public DTOs now include
  `filingProfiles`, and obligation DTOs include `jurisdiction/clientFilingProfileId`.
- Added a tenant-scoped filing profile repo and wired it through `scoped(db, firmId)`.
- Updated clients create/batch/list/get/update paths to write/read active filing profiles.
- Updated migration commit planning to accept `client.filing_states`, split multi-state lists, merge
  duplicate customer rows, create profile rows, infer tax types per filing state, and include filing
  profiles in apply/revert/single undo.
- Updated annual rollover, Pulse, Obligations, Dashboard, Calendar, Readiness, and deadline readiness to
  read obligation jurisdiction or filing profile counties instead of assuming one client state.
- Updated Clients UI to filter by any active filing state and expose a `Filing jurisdictions` panel
  with active states, counties, tax type review status, and profile source.
- Updated migration mapping labels and Step 3 matrix counts for filing states.

## Notes

Removing a filing state archives the active profile and stops future rule generation/Pulse matching
for that state. Existing obligations remain as historical rows and can be marked `not_applicable`.

The migration duplicate merge key is EIN first, then normalized name + email. Current conflict
handling keeps the existing review/error surfaces rather than adding a dedicated duplicate conflict
matrix UI.

## Validation

- Passed: `pnpm --filter @duedatehq/contracts test -- contracts`
- Passed: `pnpm --filter @duedatehq/db test -- client migration pulse obligations dashboard tenant-scope`
- Passed: `pnpm --filter @duedatehq/server test -- clients obligations migration pulse readiness penalty annual-rollover obligations`
- Passed: `pnpm --filter @duedatehq/app test -- clients migration generation-preview rules obligations dashboard calendar`
- Passed: `pnpm --filter @duedatehq/app i18n:extract`
- Passed: `pnpm --filter @duedatehq/app i18n:compile`
- Passed: `pnpm check`
- Passed: `pnpm build`
- Passed: `pnpm ready`

`pnpm build` and `pnpm ready` both reported Wrangler's sandbox-only log-file `EPERM` while running
the Worker dry-run, but the dry-run continued and both commands exited successfully.
