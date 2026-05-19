---
title: 'Dashboard v2: NEEDS ATTENTION surface with Radar alert cards'
date: 2026-05-19
author: 'Claude'
area: dashboard
---

# Dashboard v2: NEEDS ATTENTION surface with Radar alert cards

## Context

The current dashboard rendered Pulse/Radar alerts as a thin one-line banner (`PulseAlertsBanner`) that contradicted the product's positioning — Radar is the spine of the product ("you won't be the last CPA to find out about an extension"), but visually it was a footnote.

Designer (Yuqi) pinned a mockup that promotes Radar alerts to first-class cards under a red **NEEDS ATTENTION** eyebrow, alongside a thin source-health banner when any source is unhealthy. The cards use the same visual hierarchy as the Radar page cards — pulsing dot, source label, title, confidence percent, affected-clients line, source link + Review button — just less detail (no dismiss action inline, no confidence concept label).

## Change

Behind `?dashboard=v2`. The current dashboard at `/dashboard` is unchanged when the flag is off.

### New files

- **[apps/app/src/features/dashboard/use-dashboard-v2.ts](../../apps/app/src/features/dashboard/use-dashboard-v2.ts)** — `useDashboardV2()` reads `?dashboard=v2` from the URL via `useSyncExternalStore`. Server returns false.
- **[apps/app/src/features/dashboard/needs-attention-card.tsx](../../apps/app/src/features/dashboard/needs-attention-card.tsx)** — `NeedsAttentionCard` (per-alert) + `NeedsAttentionOverflowCard` (`+N` tile). Card hierarchy mirrors `PulseAlertCard`: pulsing dot, mono source, title (2-line clamp), confidence percent in semantic tone, affected count, source link + Review CTA. The overflow card is a dashed bordered tile centered on a large `+N` count; click opens `/rules/pulse`.
- **[apps/app/src/features/dashboard/needs-attention-section.tsx](../../apps/app/src/features/dashboard/needs-attention-section.tsx)** — `NeedsAttentionSection` orchestrates: optional source-attention banner (when `sourcesNeedingAttention` returns any), then up to 2 visible alert cards + an overflow tile if more exist. Pulls from the same `usePulseListAlertsQueryOptions(5)` used by the legacy banner; opens the existing Pulse drawer on Review click.

### Header rework (flag-on only)

`apps/app/src/routes/dashboard.tsx` header swaps to a larger single-line title — **Today** in `text-3xl semibold`, the date in `font-medium text-text-tertiary` inline — per the mockup. The "Operations command" eyebrow is dropped. The "See all obligations" header action is also dropped (the queue link belongs at the queue's footer, not the dashboard's chrome).

### Alert section swap (flag-on only)

The previous `PulseAlertsBanner` + `NeedsReviewBanner` pair is replaced by `<NeedsAttentionSection />`. The `NeedsReviewBanner` is removed from v2 — the same information is reachable via the in-queue chips and the obligation drawer.

## What's not in this slice (noted honestly)

- **Affected client name chips** in the alert cards. The mockup shows "Client Name One · Client Name Two" chips inline. `PulseAlertPublic` only carries counts (`matchedCount`, `needsReviewCount`); the names live in `PulseDetail`. Fetching detail per visible alert would add 2–3 requests on dashboard load. Deferred to a follow-up slice (either backend extension or selective detail fetch).
- **The "this week / this month / long-term" tabs + table below** — per Yuqi's "ignore the table" instruction, untouched.
- **Sidebar IA changes** shown in the mockup (Practice section with Contacts / Team / Practice profile / Team workload / Payments / Billing / Audit log) — many of those routes don't exist yet. Sidebar work is a separate slice.

## Verification

- `pnpm check` — pass.
- `pnpm -F @duedatehq/app test --run` — 203/203 pass.
- Preview: `http://localhost:5175/dashboard?dashboard=v2` (current dev server checked out on this branch from the previous worktree flip).
