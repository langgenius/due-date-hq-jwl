# FieldLabel migration — batch 3 (final: drawers + app-wide stragglers)

_2026-06-17_

Finishes the Register-B label migration started in
[batch 1](2026-06-17-fieldlabel-migration-batch1.md) /
[batch 2](2026-06-17-fieldlabel-migration-batch2.md). After this batch **every
hand-rolled Register-B label is on `FieldLabel`** — the sweep is complete. Covers
the three things the [handoff guide](../Design/fieldlabel-migration-handoff.md)
deferred: the detail drawers, two primitive follow-ups, and the app-wide
straggler/skip disposition.

## 1 · Primitive (`components/primitives/field-label.tsx`)

Two open follow-ups, both closed:

- **`field` tracking reconciled** `tracking-wide` (0.025em) → **`tracking-eyebrow`
  (0.08em)**, matching the §3.3 canon. Yuqi confirmed the wider tracking. It was
  parked at `tracking-wide` only to avoid shifting consumers mid-sweep; this is the
  last batch, so the reason is gone. Net effect: every `field` label (alert fact
  grid, audit timeline, structured panels) widens slightly — and it makes the
  drawer migration below lossless, since those 12px labels were already
  `tracking-eyebrow`.
- **`htmlFor` (+ generic attr) passthrough** added so `as="label"` can carry a
  real form association. Typed as `Omit<HTMLAttributes<HTMLElement>, …> & { htmlFor? }`
  — `HTMLElement` (not a specific element) so the spread handlers stay assignable
  across the polymorphic `as`; no `ref` is forwarded. (First two type attempts —
  `ComponentProps<'label'>` then `ComponentPropsWithoutRef<'label'>` — failed: the
  label-typed `ref`/event handlers clash with `div` under the DOM lib's `align`
  quirk. `HTMLElement` is the clean base.)

## 2 · Detail drawers (36 sites)

The deferred files, now safe (the parallel session + unpushed CI commit that
churned them have both landed on `main`):

- `features/alerts/AlertDetailDrawer.tsx` — 6 (2 group / 4 field)
- `features/obligations/queue/components/panels.tsx` — 13
- `features/obligations/queue/ObligationQueueDetailDrawer.tsx` — 17

All 11px → `group`, 12px → `field`; color preserved when not tertiary; layout
classes (`flex`, `truncate`, `ml-1.5`, `text-center`, `whitespace-nowrap`,
`leading-tight`, the conditional `tracking-eyebrow-tight` on primary tiles, the
`font-mono` extension-history column heads) carried via `className`.

## 3 · App-wide stragglers (15 sites / 13 files)

Batches 1–2 swept the "safe surfaces"; the §4 app-wide grep surfaced genuine
labels still hand-rolled elsewhere:

- clients: `ClientDetailDrawer`, `ClientPeekHoverCard` ("Next due"),
  `ClientSummaryStrip` (cell labels)
- migration wizard: `SummaryMetric`, `SuccessModal`, `OnboardingSkipModal`
- `obligations/BlockerContextCard` ("Blocked by"), `obligations/CompletedKeyDates`
  ("Key dates")
- `routes/splash` ("While you were away"), `_surface-vocabulary/SurfaceSummaryStrip`
- shared patterns: `patterns/stat-band` (the summary-band eyebrow → fans to 5
  surfaces), `patterns/bulk-confirm-dialog`
- `features/audit/audit-event-drawer` ("AI trace", "What changed" — `<h3>`→`as="div"`)
- `features/rules/generation-preview-tab` — the **first real `<label htmlFor>`**
  uppercase form label, migrated to `as="label"` now that the passthrough exists.

## 4 · Deliberately NOT converted (disposition)

Per §4 of the handoff, confirmed as skips (most stay as-is):

- **Badges/pills/chips** & badge primitives (`*-badge.tsx`, `*-chip.tsx`,
  `state-badge`, `tax-code-label`, the mono data-chip pill), `<Badge variant="outline">`.
- **Controls**: `<Button>` / `<summary>` classNames (the drawer accordion toggles).
- **Container-typography** — a `<nav>`/`<div>` whose caps classes style arbitrary
  _children_ rather than one label: `patterns/breadcrumb` (nav landmark w/ aria-label),
  `patterns/page-header` (eyebrow flex container hosting breadcrumb/aside),
  `ClientWorkPlanPanel` grid column-header _row_. These are not discrete labels.
- **Sentence-case `<label htmlFor>`** form labels (`login`, `rules.library` bulk
  note) — not Register B; left untouched.
- `<DropdownMenuLabel>`, `text-sm` bands, `tabular-nums` counts, `text-column-label`
  token labels, `/preview` specimens (except `SurfaceSummaryStrip`, migrated so the
  vocabulary reference exemplifies the canon).

## Canon updated

- `Design/section-header-style.md` — Register-B home note (`field` now
  `tracking-eyebrow`), follow-ups marked CLOSED, Sweep-status block → **COMPLETE**
  with the container-typography decision.
- `Design/DueDateHQ-DESIGN.md` — §4.11 primitive index (`field` tracking; migration
  marked fully complete).

## Verification (§6 gauntlet)

- `tsgo --noEmit` → 0 errors.
- `vp fmt` (per-file) + `vp check` → clean on tracked files (only the parallel
  session's **untracked** `docs/sharing/*.md` flagged — CI never checks those out).
- `vp test run` (apps/app) → **77 files, 544 passed / 2 skipped**.
- `vp run @duedatehq/app#build` → exit 0.
- i18n: `extract` + `compile --strict` → en = zh-CN = 3832, 0 missing, **no catalog
  diff** (no new strings; idempotent across two runs).
- Live (`/preview`): `field` renders 12px/500/**0.96px** (= 0.08em ✓), `group`
  11px/600/**0.66px** (= 0.06em ✓), no console errors.
- e2e/visual-regression: not run (needs local Worker env; VR is `continue-on-error`
  with no baselines). Migration preserves tags + text, so selectors hold.
