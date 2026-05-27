# 87th pass · Layer B — state-pattern matching

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Context

Layer A (88th-pass extension) added the `--tracking-eyebrow` token and snapped
33 sites to it. Layer B is the next sweep in the same A → L audit taxonomy
called out in `docs/Design/design-system-audit-2026-05-26-step-3-token-coverage.md`:
match scattered **state patterns** (hover / focus / selected / disabled) to a
single canonical shape.

This pass touches two state-pattern dimensions: `disabled:opacity` and
`focus-visible` on interactive text elements.

## B1 — `disabled:opacity` canonical = 0.5

Audit baseline (worktree-wide):

| Value                 | Sites |
| --------------------- | ----- |
| `disabled:opacity-50` | 9     |
| `disabled:opacity-60` | 3     |
| `disabled:opacity-40` | 1     |

The two outliers were arbitrary one-off picks, not a meaningful tone choice.
`opacity-50` is the canonical the Button + Input primitives already use, so
all four outliers were snapped to it.

Sites changed:

- `apps/app/src/routes/obligations.tsx:7317` (60 → 50)
- `apps/app/src/features/pulse/components/AffectedClientsTable.tsx` (60 → 50, 2 sites)
- `apps/app/src/components/patterns/pulse-notifications-bell.tsx:165` (40 → 50)

After the sweep: **13/13 sites use `disabled:opacity-50`.** No drift remaining.

## B2 — `focus-visible` parity on interactive text

A heuristic scan flagged 9 interactive elements with a `hover:` rule but no
`focus-visible:` rule — meaning keyboard users land on them invisibly.

After hand-verifying each:

- **7 sites** were real holes — inline buttons and underline-style
  `<Link>`s that lacked any focus indication.
- **2 sites** were false positives:
  - `sources-tab.tsx:466` — `TableRow` with `tabIndex={-1}` (not tabbable;
    inner `<a>` already has the canonical ring).
  - `rules.library.tsx:3533` — `<Button>` primitive owns its own
    `focus-visible:ring-…` from `packages/ui`.

Canonical pattern applied to the 7 real holes:

```
rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt
```

(Same shape Buttons + Inputs + sources-tab anchor already use.)

Sites patched:

1. `apps/app/src/features/auth/email-otp-sign-in-form.tsx:126` — "Change" email
2. `apps/app/src/features/pulse/AlertsListPage.tsx:936` — "Clear" state filter
3. `apps/app/src/features/dashboard/actions-list.tsx:772` — "All deadlines"
4. `apps/app/src/features/migration/Step1Intake.tsx:655` — "Switch preset"
5. `apps/app/src/components/patterns/pulse-notifications-bell.tsx:165` — "Mark all read"
6. `apps/app/src/components/patterns/pulse-notifications-bell.tsx:229` — "View all in Inbox"
7. `apps/app/src/routes/obligations.tsx:3118` — "Show all" columns toggle

## Out of scope this pass

- **B-other (`hover:bg-…` scatter)** — surveyed, but each value is
  semantically motivated (subtle vs base hover vs accent-tint). Not a
  drift; deferred until either Layer C or after a deliberate hover-tone
  audit.
- **B-other (`aria-pressed` / `data-state=selected`)** — primitives like
  Tabs and Toggle group already canonicalize this via Base UI; no scatter
  found outside primitives.
- Layers C–L (interactive-primitive coverage → responsive behavior) —
  scheduled separately. See the user-facing audit doc for the full plan.

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app` (the pre-existing Cloudflare
  Workers-types errors in `apps/server/src/env.ts` are unrelated).
- `pnpm exec vp lint` — pre-existing 3 warnings only; no new findings.
- Visual: each of the 7 patched elements now shows the accent ring on
  Tab-key focus and behaves identically on click / mouse-hover.

## Cumulative tally (Layers A → B)

| Layer     | What snapped to a token | Sites  |
| --------- | ----------------------- | ------ |
| A         | `tracking-eyebrow`      | 33     |
| B1        | `disabled:opacity-50`   | 4      |
| B2        | `focus-visible:ring-…`  | 7      |
| **Total** |                         | **44** |
