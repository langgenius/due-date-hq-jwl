# Pulse Federal Jurisdiction Contract Fix

## Context

`pulse.listAlerts` returned HTTP 500 for active Pulse rows whose `pulse.parsed_jurisdiction`
was `FED`. The repo and product model already treat `FED + 50 states + DC` as valid
jurisdictions, and `StateBadge` has a federal glyph, but the Pulse public contract still used
`StateCodeSchema`, which only accepts two-letter state/DC codes.

## Change

- Added `PulseJurisdictionSchema` for `FED` or a state/DC code.
- Updated `PulseAlertPublicSchema` and `PulseDetailSchema` to use that schema.
- Updated affected-client rows to accept `state: 'FED'` because that field reflects the matched
  obligation jurisdiction in Pulse detail responses.
- Added contract coverage proving public Pulse alerts and affected rows can carry `FED`.
- Updated nearby Pulse row comments so the server/repo/ports vocabulary no longer describes the
  field as state-only.

## Validation

- `pnpm --filter @duedatehq/contracts test -- src/contracts.test.ts`
- `pnpm --filter @duedatehq/server test -- src/procedures/pulse/index.test.ts`
