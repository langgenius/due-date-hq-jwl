# DueDateHQ E2E

Root-level Playwright tests cover browser-visible system behavior across the Vite SPA,
Cloudflare Worker Assets, Hono routes, and oRPC HTTP boundary.

## Commands

- `pnpm test:e2e`: build the SPA, apply local D1 migrations, start `wrangler dev --local`, and run Playwright.
- `pnpm test:e2e --ui`: run Playwright UI mode.
- `E2E_BASE_URL=https://staging.example.com pnpm test:e2e`: run against an already deployed target.
- `E2E_BASE_URL=https://staging.example.com E2E_SEED_TOKEN=... pnpm test:e2e e2e/tests/pulse.spec.ts`:
  run the staged Pulse canary with token-gated seeded auth.
- `E2E_MARKETING_BASE_URL=https://duedatehq.com pnpm test:e2e --grep E2E-BILLING-PRICING`: run marketing pricing handoff coverage against a deployed marketing target.

## Layout

- `tests/`: specs grouped by user-visible workflow.
- `fixtures/`: Playwright fixtures shared by specs.
- `pages/`: Page objects with stable locators and user actions.

Specs should keep assertions in the spec file. Page objects expose locators and small actions only.

## AC Metadata

Each spec includes `Feature`, `PRD`, and `AC` metadata comments near the top. Test titles should also
include `AC:` so humans and agents can trace a failure back to product acceptance criteria without
opening the implementation.

## Locator Rules

Prefer accessible locators in this order:

1. `getByRole`
2. `getByLabel`
3. `getByText` for stable user-facing copy
4. `getByTestId` only for dense business surfaces where accessible names are ambiguous

## Auth And Data

Real Google OAuth stays outside CI. Authenticated specs use `/api/e2e/session` to create a Better
Auth user/session/firm in D1 and inject the returned signed cookie through the `authenticatedPage`
fixture. The route is open only in local `ENV=development`; staging requires `E2E_SEED_TOKEN`;
production returns 404. The fixture supports empty, obligations, Pulse, and MFA-challenge seeds; the
MFA seed creates a signed session with `twoFactorEnabled=true` and `twoFactorVerified=false` so the
challenge route is tested through the same loader gate users hit after login.

Current specs intentionally cover shipped behavior only:

- Worker liveness through Hono `/api/health`
- unauthenticated auth gates and redirect preservation
- marketing-to-app locale handoff
- entry-page locale switching
- SPA 404 rendering
- protected Dashboard / Clients / Deadlines / Team Workload / Rules / Members / Billing /
  Practice Profile / Audit Log / Migration Step 1 surfaces with local seeded auth
- Clients facts manual creation, seeded readiness metrics, entity/state/search URL filters, filtered
  empty state, and Fact Profile sheet inspection from seeded client rows
- Team Workload paid-plan gating, server-computed owner metrics, unassigned risk, and Deadlines
  deep links
- Deadlines and Members write actions appearing in the Audit Log detail drawer
- pricing-to-billing handoff, protected billing checkout payloads, owner-only checkout, cancel recovery,
  webhook-backed success state, and Stripe Billing Portal request contracts

## Billing And Stripe

Billing e2e uses two layers:

- **Default deterministic flow tests** run in normal `pnpm test:e2e`. Local Playwright starts the app Worker
  with fake Stripe test env keys so Better Auth Stripe subscription-list routes exist, but specs intercept
  outbound Checkout / Billing Portal calls before they can reach Stripe. Assertions cover URL/query state,
  owner permissions, Better Auth payload contracts, and app-visible subscription state.
- **Webhook state simulation** uses the development-only `/api/e2e/billing/subscription` helper. It inserts a
  Better Auth `subscription` row and updates the `firm_profile` billing cache, matching the post-webhook facts
  the app depends on. Workload and Members specs also use this helper to exercise Enterprise-tier product surfaces
  without making Stripe network calls. Staging/production return 404 for all `/api/e2e/*` routes.

Do not assert Stripe-hosted Checkout DOM in the default suite. A future real Stripe test should be tagged
separately, require explicit Stripe test credentials, and assert DueDateHQ's final subscription state rather
than third-party page copy.
