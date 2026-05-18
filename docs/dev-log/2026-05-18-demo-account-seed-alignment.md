---
title: 'Demo Account Seed Alignment'
date: 2026-05-18
author: 'Codex'
area: auth
---

# Demo Account Seed Alignment

## Context

The live-demo account switcher is shown from the left-sidebar user menu only when the current
session is a `mock_user_*` demo session and `/api/e2e/demo-accounts` returns the complete account
list. After the partner role was added to the server demo account contract, `mock/demo.sql` still
seeded only the older Brightline role accounts.

## Change

- Added Priya Shah (`mock_user_partner_priya`) to the mock demo seed cleanup, user rows, and
  Brightline member rows with the `partner` role.
- Exported the server demo account contract for tests.
- Added a regression test that checks every server demo account has matching user and member rows
  in `mock/demo.sql`.
- Aligned the Pulse E2E review-request assertion with the current Partner/Manager notification copy.
- Synced Lingui catalogs and added the zh-CN translation for the new `Partner` role label.

## Docs Check

No DESIGN.md or product-design update was needed. This is a demo data integrity fix for an existing
sidebar user-menu affordance, not a production UX or product behavior change.

## Validation

- `pnpm --filter @duedatehq/server test -- src/app.test.ts`
- `pnpm --filter @duedatehq/app test -- src/components/patterns/app-shell-user-menu.test.ts`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm test:e2e e2e/tests/pulse.spec.ts --grep "E2E-PULSE-REQUEST-REVIEW"`
- `pnpm check`
- `pnpm db:seed:demo`
- `curl -sS http://127.0.0.1:8787/api/e2e/demo-accounts` returned all 8 configured demo
  accounts, including `brightline-partner`.
