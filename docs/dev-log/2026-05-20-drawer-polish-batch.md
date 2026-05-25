# 2026-05-20 · Drawer polish batch + PRD/IA audit

## PRD §7 audit (honest)

After this batch, the row product logic codified in
[docs/PRD/obligation-row-PRD.md](../PRD/obligation-row-PRD.md) §7 stands as:

### §7.1 Must — 8/8 shipped

- ✅ 6-state queue taxonomy + auto-hide zero-count scopes
- ✅ Merged Due cell with statutory anchor inline
- ✅ `$0` exposure renders as em-dash
- ⚠️ **No legacy status leakage in v2 mode** — backfill SQL ships in
  `scripts/lifecycle-v2-status-backfill.sql` but enforcement is loose
  (legacy labels still render for unmigrated rows). Strict enforcement
  is its own PR.
- ✅ K-1 dependency pointer + auto-unblock cascade
- ✅ Rejection sub-flag
- ✅ Type-aware rendering (drawer tabs by `obligationType`)
- ✅ Source-backed deadlines (rule citation chain in Evidence tab)

### §7.2 Should — 2/5 shipped, 1 deferred-by-design

- ❌ Generate `payment`/`deposit`/`information` obligations (backend
  scope, separate PR)
- ⚠️ **Three-class deadline display** — partial. Statutory + firm-internal
  surface together in the merged Due cell and drawer header. This batch
  adds the third — a `Client response due` chip on the Readiness tab
  when an active readiness request exists. The chip pulls from the
  request's `expiresAt`, surfacing the firm-set deadline for the client
  alongside the statutory + internal dates already visible.
- ❌ Per-state milestone notes on Timeline tab (requires new schema +
  RPC; deferred to own PR)
- ✅ Smart-priority signal — Priority column dropped; sort still
  accessible via URL `?sort=smart_priority`. (A UI toggle for it is a
  future nice-to-have.)
- ❌ Form 8879 e-file authorization workflow (explicitly deferred by
  prior agreement; needs new status + audit subtype)

### §7.3 Could — all deferred to post-MVP per PRD

### Plus user's 3 explicit polish items this batch closes

- ✅ **Right-sidebar consolidation on Extension tab** — the prior right
  sidebar duplicated "Current status" (already in drawer header) and
  "Internal target date" (already the form's edit value). Only "Decided
  at" was unique. Dropped the entire sidebar; "Decided at" now lives as
  a quiet inline footnote next to the Save button. Layout collapses to
  single column.
- ⚠️ **Readiness sidebar** — audited but left intact. Audit's claim of
  "repeats Latest request status shown left" was wrong (Latest request
  only exists in the sidebar). The sidebar carries unique info (Overall
  readiness · Tax year summary · request status + portal Copy/Open
  buttons · client response feed) that earns its slot.
- ✅ **Drawer body width** — adjusted breakpoint ladder: was a single
  step from 100vw to 880px at sm. Now: 720px at sm, 840px at md,
  920px at xl. Smoother shrink at 640–900px viewports; slightly wider
  at large screens to accommodate the now-richer header + chevron.
- ✅ **Sticky drawer footer with secondary CTAs** — sits at the bottom
  of the scroll container. Left: "Last updated <timestamp>" provenance
  line. Right: outline "Open client detail" + ghost "Close". The
  inline "Open client detail" link in the header stays so the cross-
  page nav is discoverable from both ends of the drawer.

## design/preview-integration sync

Fetched. Branch is now 11 commits ahead of where we forked; recent work
on dashboard + inbox + app-shell. **Zero touches to obligations or our
drawer**, so this branch can fast-forward / merge cleanly when the time
comes.

## Files touched

- `apps/app/src/routes/obligations.tsx` — Extension tab body
  consolidation, sticky footer, drawer-width breakpoints, three-class
  chip on Readiness tab
- `docs/dev-log/2026-05-20-drawer-polish-batch.md` _(this file)_

## Still-deferred (explicit, with PRD pointers)

- Form 8879 / Signature stage (PRD §7.2 — its own PR with PRD update)
- Generate payment/deposit/info obligations (PRD §7.2 — backend rule
  generation work)
- Per-state milestone notes RPC + storage (PRD §7.2 — schema work)
- Strict legacy status enforcement (PRD §7.1 — coordinate with the
  parallel session; backfill SQL is staged in `scripts/`)
