# 87th pass · Layer B5 — `aria-busy` on fire-buttons

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Why this exists

The Layer B audit covered hover, focus-visible, disabled-opacity, and
reduced-motion. **Loading state** (aria-busy) was the dimension I
skipped on first pass because a naive count of "isPending without
aria-busy" returned 34 false-flag candidates — most are sibling
buttons disabled during another button's mutation. Sibling buttons
shouldn't announce themselves as busy.

Per WAI-ARIA: `aria-busy="true"` belongs on **the element that is
being modified or whose state is in flight**, not on every disabled
element nearby. The codebase already had 7 sites following the right
convention (auth flows, onboarding, pulse drawer's primary "Apply"
button, login OAuth buttons, wizard containers).

## Method

A smarter scan looked for Buttons that are **probably the fire-button**:
both (a) `disabled={…isPending…}` referencing the firing mutation,
and (b) either `type="submit"` (the natural fire) or `onClick={…mutate(…)}`.

That returned exactly **7 real holes** — all form-submit buttons
across dialog + page chrome.

## Sites patched

Each adds `aria-busy={…samePendingExpression || undefined}` matching
the existing 5 conventions in the codebase:

- `apps/app/src/features/clients/CreateClientDialog.tsx:508` — Create client form submit
- `apps/app/src/features/members/members-page.tsx:1179` — Invite member form submit
- `apps/app/src/features/obligations/CreateObligationDialog.tsx:1349` — Create obligation form submit
- `apps/app/src/features/reminders/reminders-page.tsx:658` — Save reminder template
- `apps/app/src/components/patterns/app-shell-nav.tsx:509` — Create practice form
- `apps/app/src/routes/two-factor.tsx:75` — 2FA verify form
- `apps/app/src/routes/practice.tsx:484` — Practice settings save

Net effect: screen readers will now announce "busy" on each of these
buttons while their mutation is in flight, matching the pattern
already established at email-otp-sign-in-form, login, onboarding,
PulseDetailDrawer (Apply), WizardShell (container), and rule-detail-drawer.

## Why not the other 27 candidates?

The remaining 27 buttons that match `isPending + disabled` are
**sibling buttons** — they get disabled while a _peer_ button's
mutation is in flight (e.g., PulseDetailDrawer footer has 9 buttons
all sharing `disabled={isMutating}`, but only the "Apply" button is
the one firing, and it already has `aria-busy={isMutating}`). Setting
aria-busy on the siblings would announce every disabled element as
busy — semantically wrong and noisy to screen readers.

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app`.
- Worktree-wide `aria-busy` count: 16 → 23.
- Existing 16 sites followed the same `expression || undefined` form,
  which yields a clean `aria-busy="true"` attribute when busy and
  _no attribute at all_ when idle (cleaner than `aria-busy="false"`
  which some screen readers handle inconsistently).

## Updated B-layer tally

| Sub-layer         | Drift fixed                | Sites        |
| ----------------- | -------------------------- | ------------ |
| B1 (app)          | `disabled:opacity-50`      | 4            |
| B1 (ui)           | `data-disabled:opacity-50` | 1            |
| B2 (app)          | `focus-visible:ring-…`     | 7            |
| B2 (marketing)    | `focus-visible:ring-…`     | 16           |
| B5 (this pass)    | `aria-busy={…}`            | 7            |
| **Layer B total** |                            | **35 sites** |
