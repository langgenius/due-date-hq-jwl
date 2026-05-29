# Demo-login Pulse mock scope

## Context

The Pulse dev mock contained five fixed alert rows and was installed by default
on every Vite dev load. That made the Alert/Pulse module look populated even
outside the intended demo/e2e path.

## Change

- Changed `installMockPulse` so it only seeds the fixed five-card React Query
  mock when the app URL contains `mockPulse=1`.
- Changed app bootstrap to dynamically load the Pulse mock module only for
  dev/demo URLs with `mockPulse=1`, so the fixed data is not part of normal
  app startup.
- Updated `/api/e2e/demo-login` redirects to append `mockPulse=1`, while
  preserving an explicit `mockPulse=0` if a caller passes one.
- Documented the boundary in `mock/README.md`.

## Validation

- Added focused unit coverage for the frontend mock flag and server redirect
  helper.
- Ran a headless local smoke through `localhost:5173/api/e2e/demo-login`:
  default demo-login landed on `/rules/pulse?mockPulse=1` and showed the fixed
  five-card mock; explicit `mockPulse=0` stayed on database-backed demo rows.
- Built the SPA and searched `apps/app/dist` for the fixed mock titles; none
  were present in the production output.
- No DESIGN.md update needed: this is a demo/e2e data-boundary fix, not a UI
  contract or visual design change.
