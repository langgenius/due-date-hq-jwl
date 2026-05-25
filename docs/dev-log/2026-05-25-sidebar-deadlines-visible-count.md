---
title: 'Sidebar Deadlines visible-count alignment'
date: 2026-05-25
author: 'Codex'
---

# Sidebar Deadlines visible-count alignment

## 背景

`/deadlines` could show an empty queue while the sidebar still showed a
Deadlines badge. The badge used `FirmPublic.openObligationCount`, while the
queue joins through active clients and excludes archived clients.

The dev preview also had a direct mismatch: the Pulse mock seeds a
`Mock Practice (Dev)` firm into React Query with no deadline rows, but its
mocked `openObligationCount` was `5`.

## 做了什么

- Changed `makeFirmsRepo` open-deadline counts to join `client` and require
  `client.deletedAt is null`, matching the queue visibility scope.
- Changed the Pulse dev mock firm count to `0`, because that mock seeds alert
  examples only and does not seed the `/deadlines` queue.
- Invalidated `firms` queries after deadline status changes, manual deadline
  creation, client archive, migration apply, and migration revert so the
  sidebar badge refreshes with the surfaces that changed the count.
- Documented the sidebar contract in `docs/dev-file/05-Frontend-Architecture.md`.

## 验证

- Added DB repo SQL-shape coverage for both multi-firm and current-firm
  open-deadline count queries.
- Local D1 spot-check before the fix showed the active user firm had open
  obligations retained under archived clients while the visible queue count was
  zero, matching the UI symptom.
