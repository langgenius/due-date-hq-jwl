# 87th pass · Layer F — content / copy patterns

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Goal

Layer F covers user-facing content: date formatting, number/money
formatting, capitalization, pluralization, truncation, and ellipsis
treatment. The audit asks: do surfaces speak with one voice, or does
each page invent its own copy primitives?

## Findings

### F1 — Date formatting — MOSTLY CANONICAL

Two canonical helpers in `apps/app/src/lib/utils.ts`:

- `formatDate(value)` — ISO-shape (`YYYY-MM-DD`); used for sort keys,
  `data-*`, audit-log meta, CSV exports.
- `formatDatePretty(value, { alwaysShowYear })` — prose-shape
  ("May 6, 2026" or "May 6"); used in user-facing UI.

Coverage:

| Path                                                      | Count                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `formatDate(…)` calls                                     | 37                                                         |
| `new Date(…).getTime() / .getFullYear() / .toISOString()` | 26 (NOT formatting — math + test fixtures)                 |
| `Intl.DateTimeFormat` calls                               | 12 (mostly inside the helpers + iso-date-picker primitive) |
| `toLocaleDateString(…)`                                   | 1 (after this pass: 0)                                     |

After classifying every `new Date(...)` and `Intl.DateTimeFormat`
call, the only **real drift** was a fallback inside the in-app
notifications bell's `formatRelativeTime` helper:

```ts
// before
return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
// after
return formatDatePretty(iso)
```

Patched at
`apps/app/src/components/patterns/pulse-notifications-bell.tsx:298`.
Now uses the canonical helper, which also respects the user's locale

- time zone instead of hard-coding `en-US`.

### F1b — Feature-specific date helpers — LEGITIMATE

Three feature-specific date formatters remain. Each renders a shape
the canonical helpers don't expose; leaving them as feature-local
helpers is cleaner than over-generalizing the canonical:

- `formatFiscalYearEnd(month, day)` in `ClientCompliancePosturePanel.tsx` —
  takes numeric `(month, day)`, renders "Dec 31".
- `formatClientSince(iso)` in `ClientCompliancePosturePanel.tsx` —
  renders "Apr 2026" (month + year only).
- `formatTodayHeader(asOfDate)` in `routes/dashboard.tsx` — renders
  "May 26" (long month + day for the dashboard hero).

If a fourth caller needs any of these shapes, promote then.

### F2 — Pluralization — STRONG CANONICAL

**91 `<Plural>` macro uses** across the app. Lingui Plural is the
canonical for any count-conditioned copy. No `${n} item${n > 1 ? 's' : ''}`
ad-hoc plurals found.

### F3 — Money / currency formatting — CANONICAL FOR CENTS

`formatCents(cents)` is the canonical helper for the dominant
"obligation amount in cents" case (8 callers). It returns a locale-
respecting USD string with stripped trailing zeros.

**Deferred (not drift):** `routes/billing.checkout.tsx:65` and
`routes/billing.tsx:76` use `$\${dollars.toLocaleString('en-US')}` for
billing-plan price display. These operate on **whole dollars** (not
cents) so `formatCents` would need a `/100`-shift to apply. Also
hard-codes `'en-US'` instead of the user's locale.

If a future pass adds a `formatDollarPrice` helper, those two sites
should migrate. For now, billing is a 2-site outlier living in a flow
distinct from the daily-driver surface.

### F4 — Capitalization — CONSISTENT

| Class        | Count                                 |
| ------------ | ------------------------------------- |
| `uppercase`  | 179 (eyebrows, badges, status labels) |
| `capitalize` | 3 (deliberate per-word title-case)    |

Heavy uppercase use is intentional — the design system uses it for
eyebrows and labels. The 3 `capitalize` uses are deliberate
exceptions for proper-noun renderings.

### F5 — Truncation — CONSISTENT

| Pattern          | Count                      |
| ---------------- | -------------------------- |
| `truncate` class | 130 (single-line ellipsis) |
| `line-clamp-1`   | 2                          |
| `line-clamp-2`   | 13 (canonical multi-line)  |
| `line-clamp-3`   | 1                          |

Single-line uses `truncate`, multi-line favors `line-clamp-2`. No
mixed-pattern drift.

### F6 — `tabular-nums` — STRONG COVERAGE

219 uses. CPA numbers (counts, amounts, dates with mono digits) get
fixed-width digit treatment. No scattered alternatives found.

## What shipped this pass

One site sweep + one dev-log:

- `pulse-notifications-bell.tsx:298` — relative-time fallback now
  uses `formatDatePretty` (which respects user locale + time zone)
  instead of hard-coded `'en-US'` `toLocaleDateString`.

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app`.
- Worktree-wide `toLocaleDateString` count: 1 → 0.

## Cumulative tally (Layers A → F)

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
| E                | _(audit only — clean state confirmed)_      | 0                                                   |
| F                | `formatDatePretty` (relative-time fallback) | 1                                                   |
| **Total**        |                                             | **81 sites · 5 pill blocks deduped · 2 new tokens** |
