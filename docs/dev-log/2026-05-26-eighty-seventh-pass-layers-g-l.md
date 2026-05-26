# 87th pass · Layers G–L combined audit

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Summary

This wraps the A→L design-system audit. Layers G through L are
audited as a single batch because each found the codebase already
clean of token-level drift; one cosmetic doc-fix shipped.

| Layer | Topic                                                   | Drift found                                      |
| ----- | ------------------------------------------------------- | ------------------------------------------------ |
| G     | Accessibility (ARIA, contrast, headings, motion-reduce) | None worth a sweep — see G3 deferred             |
| H     | State / data patterns (loading, error, toast)           | None                                             |
| I     | Motion / animation                                      | Already covered by Layer D's `ease-apple` work   |
| J     | Cross-surface functional parity                         | None — AI + bulk-action primitives consistent    |
| K     | Z-index ladder                                          | 1 documented escape hatch (`z-[70]`) — annotated |
| L     | Responsive behavior                                     | None                                             |

## Layer G — Accessibility

ARIA coverage worktree-wide:

| Attribute           | Count                                             |
| ------------------- | ------------------------------------------------- |
| `aria-label=`       | 226                                               |
| `aria-hidden`       | 410                                               |
| `aria-live=`        | 18                                                |
| `aria-describedby=` | 6                                                 |
| `role="button"`     | 11 (paired with Enter/Space handlers per Layer D) |
| `role="status"`     | 16 (loading + alert announcements)                |

Heading hierarchy (literal `<hN>` in source):

| Tag    | Count |
| ------ | ----- |
| `<h1>` | 8     |
| `<h2>` | 21    |
| `<h3>` | 24    |
| `<h4>` | 5     |
| `<h5>` | 0     |
| `<h6>` | 0     |

PageHeader's title slot emits the structural h1 for ~28 surfaces;
the 8 literal `<h1>` are auth/onboarding/wizard pages that don't go
through PageHeader. Pyramid is healthy: h1 → h2 → h3 → h4, no skip.

### G1 — ARIA — STRONG COVERAGE

226 explicit `aria-label`s, 410 `aria-hidden`s. Icon-only buttons in
the design system already inherit `aria-label` via the Button
primitive's `aria-label` prop, plus a fallback `title` for
non-pointer users. Live regions (`aria-live`) are reserved for
loading skeletons + toast announcements + drawer status messages.
Not drift.

### G2 — Heading hierarchy — CONSISTENT

No nested-level skips (h1 → h3 without h2). PageHeader owns the page
h1; tabs use h2 for section titles, h3 for sub-sections. Stable.

### G3 — Reduced-motion — INCOMPLETE COVERAGE (deferred)

11 sites use `motion-reduce:` modifiers; 124 `transition-*` classes
exist. The remaining 113 transitions are non-essential color/opacity
transitions (≤300ms) where reduced-motion users won't see
disorienting movement — so the gap isn't a P0 a11y violation.

The 11 sites that DO use `motion-reduce:` are the high-motion ones:
animated skeletons (pulse), the PulsingDot's `animate-ping`,
dashboard actions-list grid animation, app-shell progress bar,
sidebar collapse animation, dropdown/dialog enter/exit, dialog
backdrop fade. These are the surfaces where reduced-motion users
_would_ feel motion-sickness — covered.

A future pass could audit each remaining `transition-*` for whether
it deserves `motion-reduce:transition-none` opt-out, but the
current state is "covered where it matters."

### G4 — Form labels — CONSISTENT

20 `<Label htmlFor=...>` pairings — every form input that needs a
visible label has one. The `<Input id=...>` count is 1 because most
inputs get their `id` via the `<Field>` primitive (Base UI), which
threads the id through automatically.

## Layer H — State / data patterns

| Pattern                  | Count                 |
| ------------------------ | --------------------- |
| `<Skeleton>` instances   | 117 (across 29 files) |
| `Loader2Icon` spinner    | 19                    |
| `toast.success`          | 85                    |
| `toast.error`            | 114                   |
| `toast.info`             | 4                     |
| `isError` query handling | 11                    |

Loading: `Skeleton` is the canonical for placeholder shapes (117
instances), `Loader2Icon` is the canonical for in-flight action
buttons (19 instances). No ad-hoc spinners.

Toasts: 85 success + 114 error + 4 info — the lopsided ratio toward
error is genuine (failed mutations toast; succeeded ones often just
update the UI without a separate confirmation). Info is rare by
design — the canonical info channel is the in-app notification bell

- banner alerts, not toasts.

Error states: every query-based view uses the same `isError` ?
`<Alert variant="destructive">` pattern. No drift.

## Layer I — Motion / animation

Already audited and resolved as part of Layer D (`ease-apple` token
shipped). Remaining motion patterns (`animate-spin` × 23, `animate-pulse`
× 6, `animate-none` × 6, `animate-in` × 2, `animate-ping` × 2,
`animate-spin-slow` × 1) all converge on Tailwind defaults or the
existing `--animate-spin-slow` token. No further drift.

## Layer J — Cross-surface functional parity

### J1 — AI feature surfaces — CONVERGENT

The Astroid icon (11 sites) is the consistent visual signal for AI-
adjudicated copy across the app. `PulseConfidencePill` (extracted in
Layer C) now de-duplicates the confidence label across two of those.
The remaining 9 Astroid uses are all in Pulse surfaces — consistent.

### J2 — Bulk action bars — CONSISTENT

`FloatingActionBar` (in `apps/app/src/components/patterns/`) is used
by both /deadlines and /rules/library. No ad-hoc bulk-action chrome.

### J3 — Search / filter / sort — DEFERRED (see Layer E E3)

Filter affordance unification across list pages flagged in Layer E
as a deferred design call. No code changes shipped here.

## Layer K — Z-index ladder

Worktree-wide z-class distribution:

| Class    | Count                                            |
| -------- | ------------------------------------------------ |
| `z-50`   | 15 (Dialog / Sheet / Toast / Popover top tier)   |
| `z-10`   | 12 (sticky table headers, drawer chrome)         |
| `z-30`   | 5 (sidebar rail in collapsed mode)               |
| `z-40`   | 4 (floating action bar, command palette overlay) |
| `z-20`   | 2                                                |
| `z-0`    | 2 (explicit baseline resets)                     |
| `z-[70]` | 1 (escape hatch — annotated this pass)           |

The ladder is well-defined and tight. The one arbitrary `z-[70]` at
`apps/app/src/features/migration/Wizard.tsx:682` is the wizard's
genesis-completion overlay — it sits ABOVE the wizard's own
`z-50` dialog so the count + spinner stay visible during finalize.

**What shipped:** added an inline comment explaining the layering
choice + documenting it as an intentional one-off rather than
promoting `z-[70]` to a token for a singleton. Future passes adding
a second "above-overlay" surface should revisit this decision and
ship a `--z-confirmation` token instead.

## Layer L — Responsive behavior

Breakpoint distribution:

| Prefix | Count |
| ------ | ----- |
| `sm:`  | 59    |
| `md:`  | 144   |
| `lg:`  | 26    |
| `xl:`  | 54    |
| `2xl:` | **0** |

The `md:` dominance reflects the app's main responsive seam (sidebar
collapses at md, drawers stack on mobile). The total absence of
`2xl:` confirms the deliberate cap at xl (1280px+ uses the same
layout); content widths max out at the `--page-wide` token (1440px)
established in earlier passes.

No breakpoint-class drift.

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app`.
- One file modified this pass: `apps/app/src/features/migration/Wizard.tsx`
  (added an inline comment around the `z-[70]` escape hatch — no
  functional change).

## Cumulative tally — final (Layers A → L)

| Layer            | What snapped to a token / primitive         | Sites                                               |
| ---------------- | ------------------------------------------- | --------------------------------------------------- |
| A (app)          | `tracking-eyebrow`                          | 33                                                  |
| A (ui+marketing) | `tracking-eyebrow`                          | 4                                                   |
| A-tight          | `tracking-eyebrow-tight` (new token)        | 8                                                   |
| B1 (app)         | `disabled:opacity-50`                       | 4                                                   |
| B1 (ui)          | `data-disabled:opacity-50`                  | 1                                                   |
| B2 (app)         | `focus-visible:ring-…`                      | 7                                                   |
| B2 (marketing)   | `focus-visible:ring-…`                      | 16                                                  |
| C1               | `PulseConfidencePill` (extracted)           | 2 files / 5 pill blocks                             |
| D-ease           | `ease-apple` (new token)                    | 5                                                   |
| E                | _(audit only — clean)_                      | 0                                                   |
| F                | `formatDatePretty` (relative-time fallback) | 1                                                   |
| G                | _(audit only — clean; 1 deferred)_          | 0                                                   |
| H                | _(audit only — clean)_                      | 0                                                   |
| I                | _(covered by D-ease)_                       | 0                                                   |
| J                | _(audit only — clean)_                      | 0                                                   |
| K                | `z-[70]` escape hatch annotated             | 1 (doc)                                             |
| L                | _(audit only — clean)_                      | 0                                                   |
| **Total**        |                                             | **82 sites · 5 pill blocks deduped · 2 new tokens** |
