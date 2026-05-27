---
title: 'Mock Practice demo data restructure'
date: 2026-05-26
author: 'Codex'
area: demo-data
---

# Mock Practice demo data restructure

## Context

The local Mock Practice dev database had drifted from the canonical demo seed: a throwaway practice
created while signed in as a mock user still pointed at `mock_user_owner_sarah`, Brightline clients
only had display assignee names, and filing-profile rows were missing after reseed attempts.

## Change

- Made `mock/demo.sql` clear any firm owned by a `mock_user_*` before rebuilding the canonical demo
  firms, so local QA-created practices do not block mock-user cleanup on replay.
- Added real `assignee_id` values next to the existing assignee names for Brightline and plan-demo
  clients.
- Added explicit `client_filing_profile` rows for Brightline, Solo, Pro, and Team demo clients.
- Linked state-specific obligations back to their filing profiles while leaving Federal obligations
  unlinked so Federal remains the default non-profile jurisdiction in Add deadline flows.
- Expanded the seed reset list for newer firm/user-dependent tables such as digest runs,
  opportunity dismissals, Pulse priority reviews, and readiness checklist rows.

## Docs Check

No DESIGN.md or product-design update was needed. This is a local demo data integrity fix for the
existing Mock Practice seed and does not change production behavior or UI contracts.

## Validation

- `pnpm db:seed:demo`
- `pnpm --filter @duedatehq/db test`
- `git diff --check`
- Local D1 spot checks confirmed:
  - Brightline has the five canonical demo members only.
  - Brightline has 9 clients with assignee ids/names aligned to seeded users.
  - Filing profile counts are Brightline 8, Solo 3, Pro 4, Team 5.
  - State-specific Brightline obligations point at matching CA, NY, TX, and FL filing profiles.
  - No extra `mock_user_*`-owned practice remains outside the canonical demo firm ids.
