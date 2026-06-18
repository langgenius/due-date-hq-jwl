# Pass-2 P2/P3 consistency batch

_2026-06-18_

Net-new P2/P3 consistency fixes from the pass-2 per-skill audit — all mechanical
(class/attr/value/string swaps), no behavior changes.

## Search verb discipline — rail + secondary stragglers

Pass 1 renamed the page _toolbar_ search placeholders "Search …" → "Filter …", but
the same-job RAIL/secondary copies were missed. Renamed: `AlertListRail`,
`ObligationListRail`, `DeadlineNavigatorRail`, `states-rail` (placeholder+ariaLabel),
`jurisdiction-rule-table` (placeholder+ariaLabel), `AlertHistoryView` page lead.
Now every page-level list filter says "Filter".

## Motion / micro-interaction convergence

- `daily-brief-card` expanded entrance `duration-200` → `duration-150` (house tempo).
- `needs-attention-card` press `active:scale-[0.99]` → `[0.98]` (app-wide depth) + stale comment trimmed.
- `state-rule-activation-selector` nested `TooltipProvider delay={100}` → `400` (global tempo).
- `deadlines-at-a-glance` collapse transition: added the `motion-reduce:transition-none` guard its siblings carry.
- `floating-action-bar` (both bulk bars): added an `animate-in … slide-in-from-bottom-2 … motion-reduce:animate-none` entrance (was popping in).
- focus-visible hover-token straggler (pass-1 batch-7 only swept `hover:`): `alerts-notifications-bell` + `settings.tsx` `focus-visible:bg-background-default-hover` → `bg-state-base-hover`.
- PreviewCard `closeDelay` standardized to 200 (concept-help, generation-preview-tab, state-badge).

## Typography

- font-mono dropped from non-carve-out numerics (kept `tabular-nums`): `ShortcutHelpDialog`
  (mono-on-prose), `rule-detail-drawer` ×3, `generation-preview-tab` date trigger.
- `dashboard` "Today" loading placeholder: removed `italic` so loading + resolved share type style.

## A11y primitive

- `packages/ui/table.tsx` `TableHead`: default `scope={props.scope ?? 'col'}` — explicit
  column-header association for every table app-wide (caller can still override).

## Verification

- `tsgo --noEmit` 0; `vp check` clean; new "Filter …" strings translated to zh-CN
  (筛选截止事项 / 筛选辖区 / 筛选已处理提醒 / 筛选{jurisdictionLabel}规则); `compile --strict` passes.
