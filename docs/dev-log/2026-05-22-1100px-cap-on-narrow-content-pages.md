---
title: 'Apply 1100px max-width cap on narrow content pages (Clients, Opportunities, Audit, Settings)'
date: 2026-05-22
author: 'Claude (Yuqi pairing)'
area: layout
---

# 1100px max-width on narrow content pages

## Change

Four routes get a `max-w-[1100px] mx-auto w-full` page container so
their content centers on wide monitors instead of stretching edge-to-edge:

- `apps/app/src/routes/clients.tsx:299` — Clients list
- `apps/app/src/features/opportunities/opportunities-page.tsx:40` — Opportunities
- `apps/app/src/features/audit/audit-log-page.tsx:550, 576` — Audit log
  (both the loading skeleton and the main render)
- `apps/app/src/routes/settings.tsx:120` — Settings (was already capped
  at 1080px; bumped to 1100 for parity with the other narrow pages)

## Why

Today (`/dashboard`) was already at `max-w-[1100px]` from the dashboard
redesign pass. The other content-shape routes (Clients, Opportunities,
Audit, Settings) were running full-width — fine on 13" laptops, but
on 4K monitors the page header floats out into pasture and the action
cluster on the far right edge becomes a long arm reach. Capping at
1100px gives the same comfortable column width Today already uses.

## Scope

Intentionally **not** capped:

- **Obligations queue** (`/obligations`) — the table needs every pixel.
- **Rule library** (`/rules/library`) — coverage matrix dots + tier
  sparkline span wide on purpose.
- **Alerts** (`/rules/pulse`) — left for a follow-up commit once a
  parallel session lands its current edits in that area.

## Test plan

- Open each capped route on a wide monitor (>1100px viewport). Verify
  content centers with whitespace gutters on either side.
- Narrow viewport (~900px). Verify content fills the available width
  (the `w-full` + `mx-auto` combo keeps it fluid below the cap).
- Confirm action clusters in PageHeader stay anchored to the right edge
  of the 1100px container, not the viewport edge.
