# Loading-states audit — gap fixes across 8 surfaces

**Date:** 2026-06-14
**Surface:** app-wide (settings, audit, notifications, migration, splash, obligations, practice, accept-invite)

## Change

Ran a full-app audit of loading states (~178 data-loading sites across 6 areas).
Coverage was already strong — layout-matched `Skeleton`s, `isPending` button
states, `placeholderData` to avoid filter-flicker, infinite-list gating. Fixed
the 8 confirmed gaps (all secondary surfaces / polish; no primary surface was
rendering blank).

1. **settings.permissions** — `membersQuery` had no loading branch, so the
   footer asserted a false "0 active members" and the role-dropdown counts read
   0 until load. The matrix pills themselves are static (built-in role model)
   and were never blank. Now the count copy shows a skeleton / is suppressed
   while loading. Footer changed from `<p>` to `<div>` so the block `Skeleton`
   is valid DOM.
2. **audit export dialog** — `packagesQuery` had no skeleton; `latest` fell back
   to null so it briefly read "No export packages yet" and offered "Request
   export" before the lookup resolved. Added a skeleton row + a disabled
   "Loading…" action while the query is in flight.
3. **notifications "Load more"** — added a `Loader2` spinner to the already-
   present "Loading…" button text, matching the audit-log / mutation-button
   convention.
4. **Step 4 dry-run preview** — on a dedup-toggle re-run the count grid kept old
   values silently. It now dims + pulses + sets `aria-busy` while
   `isUpdatingPreview`, so the stale numbers read as refreshing.
5. **splash** — the username popped into the greeting ~half a second after it
   first rendered name-less. Reserved the name with an inline skeleton span
   (phrasing content, valid inside `<h1>`) so it loads in sync with the recap
   skeletons below.
6. **obligation detail drawer** — replaced the text-only "Loading…" with a
   shape-matched skeleton (hero strip + tab bar + body sections) so the detail
   paints in place instead of jolting when tabs land.
7. **practice** — the "Calculate preview" and "Save Smart Priority" buttons
   disabled on pending but showed no spinner. Added `Loader2` spinners to match
   the billing-button convention.
8. **accept-invite** — the invite context row popped in (no placeholder), so the
   card jumped when it landed. Added a shape-matched skeleton row to hold its
   space while `inviteQuery` loads.

## Filtered (not real loading gaps)

- `alerts/AffectedClientsTable` — takes data via props, no query.
- `migration.new` — loading skeleton is present; the flagged issue is a missing
  error boundary (separate concern).
- `login` manual verify — a double-submit/error-handling concern, not loading.
- `rules/rule-year-diff` and `dashboard/changes-since-last-section` — silent /
  minimal by documented design; left as-is.

## Docs Alignment

No `DESIGN.md` / `docs/Design/` change — all fixes reuse the existing `Skeleton`
primitive, `info`/`destructive` Alert variants, and `Loader2` spinner-button
pattern already canon across the app.

## Validation

- App typecheck (`tsgo --noEmit`) clean; `pnpm check` (whole-repo) clean.
- Verified live in the preview: caught and fixed two self-inflicted
  invalid-nesting hydration errors during verification — `Skeleton` (a block
  `<div>`) nested inside a `<p>` (settings footer) and an `<h1>` (splash). Both
  resolved (footer → `<div>`; splash → inline `<span>` skeleton). Confirmed the
  settings footer now renders as a `<div>` in the live DOM.
- The unrelated `AlertStructuredFields.tsx` vite reload errors in the console are
  another session's in-progress edit, not part of this change.
