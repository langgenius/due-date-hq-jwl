# 45-lens design-skill audit + fixes

_2026-06-22_

Ran the full **designer-skills** plugin — all 45 lenses across `design-systems`
(11), `interaction-design` (16), `ui-design` (14), `visual-critique` (4) — against
the product as a fresh pass. Method: 5 read-only audit agents (one per cluster,
each reading the real SKILL.md methodology, judging against the canon, excluding
the ~4 prior polish passes this session), then 4 worktree build agents.

The product was already heavily polished, so most lenses came back **clean** — but
running the lenses _fresh_ surfaced real **correctness / a11y / i18n bugs** the
prior visual-polish passes structurally couldn't see (they only inspected loading
and happy-path branches). **22 fixes shipped, 1 skipped, plus a deferred list.**

## Shipped — 4 batches

### Dashboard + clients (5)

- **Error lie-states (correctness):** `/today` Priorities and the client **Work tab**
  showed the green "All clear / No deadlines yet" state on a _failed_ load (queries
  fell back to `[]` with no `isError` thread). Both now render a real
  "Couldn't load … — Retry" branch before the empty/all-clear block.
- Pinned heading demoted to the secondary tier (Alerts stays the sole `/today` lead).
- ClientSummaryStrip KPI data 600 → 500 (weight reserved for titles).
- Dark-mode skyline: hardcoded `--color-brand-ink` (no dark mirror) → adaptive
  `text-text-primary` + `dark:opacity-10` so it reads in both modes.

### Deadlines / obligations (5)

- **16px filter-✕ hit target** → removed the `size-4` override (now 28px, fitts).
- **Optimistic status change** — `updateStatus` gets `onMutate` (snapshot → flip across
  every `obligations.list` page **and** `getDetail` → rollback on error → reconcile on
  settle); kills the stale-pill lag on both list and detail.
- **Optimistic pin/unpin** (both cache shapes) + spinner.
- `EvidenceArtifactStatusGrid` `warning` tone was rendering **red** → `bg-state-warning-solid`.
- Bulk-extension "Internal target date" label tied to its control (a11y).

### Forms / i18n / primitives (8)

- **Locale-aware time (i18n bug):** `formatRelativeTime` / `formatDateTime*` hardcoded
  English & `'en-US'` on live zh-CN → `Intl.RelativeTimeFormat(intlLocale())` + `intlLocale()`
  (no new catalog strings).
- 4 unlabeled selects (Entity / Importance / Language / Date-format) + invite-dialog
  autofocus (a11y).
- Rules needs-review row: third "review" hue (orange) → canonical violet `bg-status-review-tint`.
- 6px `rounded-md` → `rounded-sm` in primitives (value-diff, duotone-icon, detail-section-card).
- EmptyState: stale docstring rewritten to the real API; prominent measure `560px` → `60ch`.
- Notification toggle: real `onMutate` optimism (it previously _claimed_ optimism with none).
- StatBand proportion bar: per-segment `title` + a guaranteed accessible label.

### Alerts (4, +1 skipped)

- **Killed ~6 color+bold double-highlights** (PulseAlertRow, AlertListRail "Review N",
  AlertDetailDrawer TextLinks, AlertCard) → `font-medium`; tone carries the signal.
- Per-row **Dismiss** now disables + spins on its own row while pending (no double-fire).
- AlertDetailDrawer "Apply now": green-on-green filled primary → `secondary` (one primary per view).
- `/alerts` **J/K** route nav via `useAppHotkey` + a new `'alerts'` ShortcutCategory in `?` help.
- _Skipped_: routing the alert **A/D** shortcuts through the keyboard shell — attempted, but
  the hotkey manager needs a `HotkeysProvider` the drawer unit tests don't mount (broke 4
  tests), so the working hand-rolled keydown was kept. A/D still work; they just don't yet
  appear in `?` help. (Revisit by mounting the provider in those tests.)

## Deferred (decisions / bigger refactors — not silently dropped)

- **Brand on `login.tsx`** (parallel session's file): the hand-rolled "D" monogram → canonical
  `BrandMark` (brand book rejects the letterform); unify the four auth-H1 expressions. Brand call.
- **Marketing `production-v1.html`** serif-on-body/data misuse (static prototype; v2 is correct).
- **Refactors:** shared skeleton-layout templates (226 inline sites); a real `EmptyState
variant="error"` + migrating the divergent `QueryPanelState` / `RemindersErrorState`; file
  renames (`DeadlineRow.tsx`, `AlertStatusBadge`/`Chip`); a component-doc template + archiving
  78 dated audit docs; an illustration style guide; RTL logical-properties readiness.
- **Retry toast actions** for re-runnable mutations + preserving bulk-dismiss selection on
  failure (a broader error-recovery pattern worth doing deliberately).

## Verification

`tsgo` app + ui 0 · `i18n compile --strict` 0 (2 new error-branch strings, zh-CN translated) ·
production build green · **app tests 550 passed / 2 skipped** (baseline); the build agents also
ran their affected unit suites (utils/notification 13/13; alerts+keyboard-shell 128/1). Per-cluster
detail in `_alerts-audit-batch-2026-06-22.md` + `_forms-i18n-primitives-audit-batch-2026-06-22.md`.
