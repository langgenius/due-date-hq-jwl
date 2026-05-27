# Audit drain — agent σ (sigma) — cross-route consistency

**Date:** 2026-05-27
**Branch:** `design/audit-drain-sigma-cross-route`
**Wave:** 4 (parallel with ρ permission-matrix, τ, υ)
**Authority:** drift only — no new features, no design shifts
**Findings master index:** `2026-05-27-findings-master-index.md`

## Scope

Cross-route consistency sweep — does the same concept render the same way on
every route. Yuqi flagged this as the #2 unaudited gap at the wave-3 handoff.

Concepts audited (all 10 Yuqi listed):

- Status pills
- Owner avatars
- Search affordances
- Table toolbars (bulk-selection bars)
- Empty states
- Error states
- Loading skeletons
- Retry buttons
- Page headers
- Breadcrumbs

Plus two cross-cutting concepts surfaced during the walk:

- Dialog Cancel button (X1 follow-up sweep)
- Mutation submit button (X2 follow-up sweep — bounded subset)

## Deliverables

- `docs/Design/cross-route-consistency-matrix.md` — concept × route matrix +
  drift inventory + verified-canonical inventory + deferred list.
- 13 inline drift fixes (this dev-log).
- This dev-log.

## Drift fixes shipped (13)

### Empty / loading state cluster

**D3 — Notifications preferences empty state uses raw `<p>`.**
`features/notifications/notification-preferences-page.tsx:288` was rendering
`<p className="rounded-md border …">No morning digests have run yet</p>`.
Swapped for canonical `<EmptyState>` (dashed border + centered title).
Sibling Reminders / Members / Pulse all use EmptyState — this one had stayed
custom.

**D4 — Reminders recent-delivery + suppressions empty states use raw `<p>`.**
`features/reminders/reminders-page.tsx:467, 551` had bordered `<p>` empty
states even though the Upcoming-reminders panel right above them already used
`<EmptyState>`. Module was internally inconsistent. Both swapped.

**D6 — Notifications preferences raw "Loading…" text.**
Same file, line 285 — "Loading recent digest runs…" rendered as a single-line
`<p>`. Swapped for stacked `<Skeleton className="h-14 w-full" />` rows shaped
to the eventual digest-run rows.

**D7 — Reminders four raw "Loading…" texts.**
`features/reminders/reminders-page.tsx:311, 386, 461, 545` — Templates /
Upcoming / Recent delivery / Suppressions all rendered raw "Loading … " text.
Swapped each for `<Skeleton>` row stacks shaped to the eventual table layout.
Now matches the queue / audit / opportunities loading register.

### Error / retry cluster

**D5 — Pulse alerts list retry button raw `<button className="underline">`.**
`features/pulse/AlertsListPage.tsx:381` had a hand-rolled underline button as
the Retry control inside the destructive Alert. No focus-visible ring, no
accent color. Swapped for canonical `<Button variant="link" size="sm"
className="h-auto p-0 align-baseline">` to match dashboard / clients /
obligations retry pattern.

**D8 — Pulse detail drawer retry button same.**
`features/pulse/PulseDetailDrawer.tsx:740` — twin of D5 inside the alert-detail
drawer. Same fix.

### Dialog cancel cluster (X1 follow-up sweep — 5 stragglers)

X1 in Step 6 cont migrated the major dialogs (Export / Penalty / Calendar-sync
/ Reminders template / Members invite) from `variant="outline"` to
`variant="ghost"`. Five outline stragglers were hidden in features/ +
components/patterns and weren't caught:

**D9 — obligations.tsx extended-memo dialog Cancel.**
`routes/obligations.tsx:4256` — outline → ghost. Final straggler in the queue
route file.

**D12 — app-shell-nav 2× dialog Cancels.**
`components/patterns/app-shell-nav.tsx:445, 506` — both the upgrade-prompt and
the create-firm dialogs had outline Cancels. Both swapped to ghost.

**D13 — CreateClientDialog Cancel.**
`features/clients/CreateClientDialog.tsx:510` — outline → ghost.

**D14 — CreateObligationDialog Cancel.**
`features/obligations/CreateObligationDialog.tsx:1346` — outline → ghost.

After this pass, every dialog Cancel in the app uses `variant="ghost"`. The
sole remaining outline is `FixNeedsFactsSheet`'s Close button (D15, deferred
— see matrix).

### Mutation submit cluster (X2 follow-up — bounded subset)

X2 in Step 6 cont added Loader2 + aria-busy to the major mutation buttons
(Export / Request Input / Calendar Sync / New Rule / Audit export / Reminders
save / Members invite / Calendar regenerate / Workload refresh). Two
high-traffic stragglers shipped:

**D10 — Tax-year-profile Save in obligation drawer.**
`routes/obligations.tsx:6866-6890` — had label-text feedback ("Save → Saving…")
only. Added Loader2 spinner + `aria-busy={mutation.isPending}`.

**D11 — CreateObligationDialog submit.**
`features/obligations/CreateObligationDialog.tsx:1349-1378` — `aria-busy` was
already set but Loader2 was missing. Added Loader2 alongside the existing
"Adding…" / "Loading rules…" label sequence.

The remaining ~30 mutation buttons across the long tail (less-traveled
settings + edit-in-place save buttons) are deferred to wave-5 — they need a
codemod sweep with `disabled={X.isPending}` regex.

### Avatar cluster

**D1 — Members row avatar single-initial drift.**
`features/members/members-page.tsx:921` — `member.name.slice(0, 1).toUpperCase()`
gave one initial. Every other owner-avatar surface uses `initialsFromName`
(up to 2 initials). Now imports + uses the shared helper. Same person
("Sarah Martinez") now reads as "SM" everywhere instead of "S" here / "SM"
elsewhere.

**D2 — Audit log actor avatar reimplements initials math.**
`features/audit/audit-log-table.tsx:179-186` was reimplementing
`initialsFromName` inline. Swapped for the shared helper. Single source of
truth for "how do we extract initials from a display name."

## Drift inventory — totals

- **Total drift identified:** 15
- **Shipped:** 13
- **P0:** 0
- **P1:** 2 (D5 + D8 — interactive control with no focus ring)
- **P2:** 10
- **P3:** 1 (D15 — deferred for design call)
- **Deferred to wave-5:** D15 + long-tail mutation buttons + 3 informational
  items (see matrix §4)

## Verified canonical

10 items confirmed already consistent across all relevant routes — see matrix
§3. Notable confirmations: status pills (every surface routes through `Badge`
+ semantic variant), search affordances (`SearchInput` everywhere), bulk
toolbars (only 2 surfaces ship them, both `FloatingActionBar`), page headers
(every protected route uses `PageHeader`), error block primitive (every error
uses `<Alert variant="destructive">`).

## Files touched

- `apps/app/src/components/patterns/app-shell-nav.tsx` (D12 ×2)
- `apps/app/src/features/audit/audit-log-table.tsx` (D2)
- `apps/app/src/features/clients/CreateClientDialog.tsx` (D13)
- `apps/app/src/features/members/members-page.tsx` (D1)
- `apps/app/src/features/notifications/notification-preferences-page.tsx` (D3 + D6)
- `apps/app/src/features/obligations/CreateObligationDialog.tsx` (D11 + D14)
- `apps/app/src/features/pulse/AlertsListPage.tsx` (D5)
- `apps/app/src/features/pulse/PulseDetailDrawer.tsx` (D8)
- `apps/app/src/features/reminders/reminders-page.tsx` (D4 ×2 + D7 ×4)
- `apps/app/src/routes/obligations.tsx` (D9 + D10)
- `docs/Design/cross-route-consistency-matrix.md` (new)
- `apps/app/src/i18n/locales/{en,zh-CN}/messages.{po,ts}` (5 string removals,
  no new strings)

## Gates

- `pnpm exec tsc --noEmit` — clean ✓
- `pnpm i18n:extract` — 5 unused strings dropped, no new strings added ✓
- `pnpm i18n:compile --strict` — clean ✓
- No new `git add -A` paths; commit added by-name only ✓

## What's next

The matrix is the durable artifact. The two follow-up sweeps it identifies:

1. **Mutation submit long tail.** ~30 buttons across rules / settings /
   billing / edit-in-place that ship label-text feedback only. Codemod
   candidate.
2. **FixNeedsFactsSheet EmptyState CTA register.** Should EmptyState CTAs in
   "success" register use ghost or default? Needs a design call.

Both logged in matrix §4 and findings master index.
