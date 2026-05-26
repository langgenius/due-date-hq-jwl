# 87th pass · Layer D — behavioral / interaction patterns

Date: 2026-05-26
Branch: `design/eighty-seventh-pass-cluster`

## Goal

Layer D in the A→L audit taxonomy covers behavioral patterns:
keyboard shortcuts, focus management, click targets, hover
affordances, scroll, and motion/timing values. The audit asks: are
these consistent across surfaces, or does each callsite reach for its
own value?

## Findings

### D1 — `transition-duration` scatter — CLEAN

Worktree-wide distribution (19 total usages):

| Value          | Count |
| -------------- | ----- |
| `duration-300` | 6     |
| `duration-200` | 5     |
| `duration-150` | 3     |
| `duration-500` | 2     |
| `duration-100` | 2     |
| `duration-240` | 1     |

All standard durations match Tailwind v4 defaults. The single
`duration-240` outlier at `packages/ui/src/components/ui/sidebar.tsx:643`
is the _deliberate_ fade timing for the sidebar collapse label
animation — comment in the file documents the choice ("Was 150ms
ease-out — too fast against the 300ms aside transition, labels popped
before the rail finished moving"). Not drift; left in place.

### D2 — `onClick` on `<div>` / `<span>` — CLEAN

Worktree-wide grep returns **0 hits**. Every interactive element is
either a `<button>`, `<a>`, or has `role="button"` + Enter/Space
handler. No keyboard-trapped a11y holes here.

### D3 — Enter/Space "act-as-button" keyboard handlers — CONSISTENT

5 sites use the canonical `if (event.key === 'Enter' || event.key === ' ')`
guard on row / card click targets:

- `features/pulse/components/PulseAlertCard.tsx:164`
- `features/dashboard/actions-list.tsx:197` + `:337`
- `features/audit/audit-log-table.tsx:136`
- `features/rules/sources-tab.tsx:452`

Same form, same handler shape. Good convergence — no token needed.

### D4 — Animation classes — CLEAN

Distribution:

| Class               | Count                                   |
| ------------------- | --------------------------------------- |
| `animate-spin`      | 23                                      |
| `animate-pulse`     | 6                                       |
| `animate-none`      | 6                                       |
| `animate-ping`      | 2                                       |
| `animate-in`        | 2                                       |
| `animate-spin-slow` | 1 (token-backed: `--animate-spin-slow`) |

All map to either Tailwind defaults or the existing `--animate-spin-slow`
token in `primitives.css`. No drift.

### D5 — `cursor-pointer` on `<button>` / `<a>` — STYLE NOISE, not drift

45 explicit `cursor-pointer` uses. Tailwind v4 changed default cursor
behavior on buttons so the explicit class is sometimes load-bearing
(Tailwind v4 stripped the default-button-pointer). All packages/ui
usages are on legit interactive surfaces (Tabs trigger, Sidebar menu
button, Button primitive, etc.). Not drift — the design system
deliberately reinstates pointer semantics. Logged here for awareness.

## D-ease — `--ease-apple` token shipped this pass

The audit DID find one genuine motion-token drift: the iOS-style
`cubic-bezier(0.32, 0.72, 0, 1)` easing is repeated **5 times across
4 files** with no token backing.

Sites before:

- `packages/ui/src/components/ui/sidebar.tsx:385` — sidebar width transition
- `packages/ui/src/components/ui/sidebar.tsx:419` — sidebar inset rail
- `packages/ui/src/components/ui/sidebar.tsx:643` — sidebar label fade
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx:2971` — client-detail panel slide
- `apps/app/src/routes/rules.pulse.tsx:105` — pulse panel resize

Added to `packages/ui/src/styles/tokens/primitives.css`:

```css
--ease-apple: cubic-bezier(0.32, 0.72, 0, 1);
```

Tailwind v4 auto-generates the `ease-apple` utility from the
`--ease-{name}` namespace. All 5 sites swept from
`ease-[cubic-bezier(0.32,0.72,0,1)]` → `ease-apple`.

Both apps inherit via `@import '@duedatehq/ui/styles/preset.css'`.

The Apple curve is reserved for **full-surface containers** (sidebar
collapse, drawer slide, panel resize) where its slightly-slower
in-out feel matches iOS-style ergonomics. Shorter transitions
(buttons, hovers, tooltips) should continue to use Tailwind's
defaults (`ease-out`, `ease-in-out`) — the Apple curve would feel
sluggish under 200ms.

## Verification

- `pnpm exec tsc --noEmit` clean for `apps/app`.
- Remaining `cubic-bezier(0.32` matches in repo: only the token
  definition itself + two doc-comments explaining the curve. No
  live-code drift remains.

## Cumulative tally (Layers A → D)

| Layer            | What snapped to a token / primitive  | Sites                                                |
| ---------------- | ------------------------------------ | ---------------------------------------------------- |
| A (app)          | `tracking-eyebrow`                   | 33                                                   |
| A (ui+marketing) | `tracking-eyebrow`                   | 4                                                    |
| A-tight          | `tracking-eyebrow-tight` (new token) | 8                                                    |
| B1 (app)         | `disabled:opacity-50`                | 4                                                    |
| B1 (ui)          | `data-disabled:opacity-50`           | 1                                                    |
| B2 (app)         | `focus-visible:ring-…`               | 7                                                    |
| B2 (marketing)   | `focus-visible:ring-…`               | 16                                                   |
| C1               | `PulseConfidencePill` (extracted)    | 2 files / 5 pill blocks                              |
| D-ease           | `ease-apple` (new token)             | 5                                                    |
| **Total**        |                                      | **80 sites · 5 inline pills deduped · 2 new tokens** |
