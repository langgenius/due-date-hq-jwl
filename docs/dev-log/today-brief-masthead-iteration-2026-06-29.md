# /today Daily Brief masthead iteration

**Date:** 2026-06-29
**Files:** `apps/app/src/features/dashboard/daily-brief-card.tsx`

## Why
Yuqi iterating on the Daily Brief.

## What changed
- Icon → "DAILY BRIEF" gap `gap-1.5` → `gap-2` (was too close).
- Freshness: removed the green/amber status dot; keep just the concise
  uppercase time. The amber "Outdated" text still signals the stale state.
- Failure description ("Brief unavailable — we'll retry shortly.")
  `text-caption` → `text-sm leading-relaxed` (was squashed/tiny).
