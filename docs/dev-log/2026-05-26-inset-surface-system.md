# Inset surface design system — refresh pass

**Date:** 2026-05-26
**Branch:** `design/inset-surface-system`
**Scope:** /rules/pulse (Alerts) + /today (Dashboard) + /deadlines (Obligations) + sidebar + app-shell

## What changed

This commit consolidates ~40 small Yuqi-driven design polishes into a single coherent system across the three primary work surfaces (Today, Alerts, Deadlines) and the global sidebar / app-shell. The through-line is the new "inset surface" pattern: gray work-area background (`--background-inset`) with white cards on top, paper-document-style detail panels, and a unified typography + spacing vocabulary.

### New design system reference

`docs/Design/inset-surface-design-system.md` — canonical doc capturing:

- Background tokens (`--background-inset`, `--background-default`)
- Surface hierarchy (inset → cards → section frames → chips)
- Radius scale (rounded-sm/md/full)
- Card chrome (white bg + faint border, hover = border-only darken)
- Filter / button bar (h-8, panel-aware widths)
- Drawer / right panel chrome
- Chip / pill vocabulary (state pill, change-kind chip, status badge, confidence pill)
- Color tone ladder with no collisions
- Typography rules (5-tier scale)
- **Spacing scale** (canonical gap-1/2/3/4/6 + p-2/3/4)
- Propagation checklist for unported routes

### Tokens (UI package)

- `packages/ui/src/styles/tokens/semantic-light.css` + `semantic-dark.css`: added `--background-inset` (`#fafafa` light / `#1a1a1d` dark). Single token retones every work surface across the product.
- `packages/ui/src/styles/preset.css`: exposed as `bg-background-inset` Tailwind utility.

### Sidebar — full overhaul

`packages/ui/src/components/ui/sidebar.tsx`:

- **Hover-expand-as-overlay**: when collapsed, hovering the rail widens an absolutely-positioned inner overlay (with soft left shadow) on top of the page content — page does NOT reflow. Outer aside footprint stays at 56px.
- **Smooth label fade**: nav labels transition `opacity` + `max-width` over 240ms with Apple's swiftOut curve (`cubic-bezier(0.32, 0.72, 0, 1)`) — coordinated with the 300ms aside-width transition.
- **Collapsed gap density**: menu-item gap `gap-0.5` → `gap-1` so 32×32 icon tiles get breathing room.
- **Removed collapse toggle button** per the Frame 137 / Frame 134 reference screenshot. Toggle now reachable via keyboard shortcut + hover-expand handles the "peek" case.

`apps/app/src/components/patterns/app-shell.tsx`:

- Footer simplified to a single row — just the user avatar / menu.
- Top section identical in expanded vs collapsed: just the firm switcher (bell moved out, see below).

`apps/app/src/components/patterns/app-shell-nav.tsx`:

- **Brand-row prominence**: firm switcher avatar `size-8` → `size-10` (32px → 40px), firm name `text-sm` → `text-base`. Matches the Frame 137 reference where the top brand-identity reads as a proper header anchor, not a slim row.

`apps/app/src/components/patterns/pulse-notifications-bell.tsx`:

- **Bell relocated out of sidebar**, now floats at `absolute right-4 top-4 z-30` of `SidebarInset`. Sidebar order is now identical in expanded vs collapsed states (no more vertical-stacking gymnastics). Dropped the sidebar-aware chrome overrides on the bell since they never fire now.

### Pulse panel — motion + chrome

`apps/app/src/features/pulse/AlertsListPage.tsx`:

- **Paper-rises motion (enter)**: panel slot opens 300ms (outer width 0→60%), inner panel content translates from `y: '100%'` → `y: 0` over 640ms with 140ms delay. Apple swiftOut curve. Reads as a sheet of paper rising from below the desk into the open slot.
- **Dissolve motion (exit)**: panel content fades opacity 1→0 over 220ms while slot closes (width 60%→0) in 280ms simultaneously. Quick, quiet, no slide-down. The user-perceived event is "panel disappears, alert rows reflow to full width."
- **No layout jump**: page shell's `max-w`/`min-w`/`padding-bottom` toggle now uses a CSS transition (`transition-[max-width,min-width,padding-bottom] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]`). The container interpolates between `max-w-page-wide / min-w-0` (closed) and `max-w-[1440px] / min-w-[1440px] / pb-0` (open) instead of snapping.
- Inter-card gap dropped `gap-4` → `gap-3` per canonical spacing.
- Empty-state cards: `px-4 py-5` → `p-4`.

`apps/app/src/features/pulse/PulseDetailDrawer.tsx`:

- **Padding spec** (per Yuqi: `padding-block: calc(var(--spacing) * 10)` / `padding-inline: calc(var(--spacing) * 12)`): header + body use `px-12 py-10` (48px × 40px) so the panel reads as a roomy paper-document. Footer uses `px-12 py-4` (compact action bar).
- **Change-kind chip in header**: lifted into the panel header chip row, leading position. Reads as "[what changed] · [where to verify] · [status] · [confidence]".
- **Body paragraph correct size**: drawer summary `text-base` → `text-sm` (canonical body).
- **Footer two-cluster layout**: reversal actions (Undo / Reactivate) split to the LEFT cluster; forward actions (Copy email / Request review / Dismiss / Snooze / Apply) stay on the RIGHT. `justify-between` separates them.

`apps/app/src/features/pulse/components/PulseAlertCard.tsx`:

- **Outer card spacing**: `p-5` → `p-4`, `gap-6` → `gap-3`, inner content col `gap-1.5` → `gap-2` per canonical.
- **Card emphasis title**: `text-xl font-semibold` → `text-base font-medium`. Card titles anchor the page (no h2 above them), but still scan as type, not as decorative chrome.

`apps/app/src/features/pulse/components/AffectedClientsTable.tsx`:

- **Visual language matches /deadlines table**: TableBody adds `[&_td]:py-2 [&_td]:text-sm` (identical to obligations queue line 2874). Client name cell renders explicit `text-sm font-medium leading-tight text-text-primary` (same classes as obligations queue ClientNameCell).

### Typography unification

Five-tier scale across Today / Alerts / Deadlines:

- Page title h1: `text-2xl font-semibold` (24px)
- Section h2: `text-lg font-semibold` (18px)
- Card emphasis title: `text-base font-medium` (16px) — alert card h3 only
- Content title (row, table cell): `text-sm font-medium` (14px)
- Body: `text-sm` (14px regular)
- Caption / meta: `text-xs` (12px)

Drift fixed:

- PulseAlertCard h3 was `text-xl`
- Obligations drawer h2 was `text-xl`
- Obligations row client name was `text-base`
- Today empty states + "… N more" caption were `text-base`

### Spacing unification

Five-tier gap scale:

- `gap-1` (4px): inline (icon + label)
- `gap-2` (8px): same-row chips
- `gap-3` (12px): card internal blocks
- `gap-4` (16px): section internal clusters
- `gap-6` (24px): between major page sections

Standardized padding:

- Chip / pill: `px-1.5 py-0.5`
- Small inline card: `p-2`
- Row (table, list): `px-3 py-2`
- Standard card: `p-4`
- Page shell: `px-4 md:px-6`
- Drawer body: `px-12 py-10`

Drift fixed across PulseAlertCard, AlertsListPage, actions-list, obligations row padding.

### Misc

- `packages/ui/src/components/ui/alert.tsx`: `AlertDescription` gets `group-has-[>svg]/alert:col-start-2` so descriptions align under the icon column when present.
- `apps/app/src/features/opportunities/client-opportunities-card.tsx`: flipped to `bg-background-default` (white card on inset gray).
- `apps/app/src/styles/globals.css`: hidden scrollbars globally (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) per Yuqi's "hide the scroll bar everywhere on the product" call.

## Why

Yuqi's repeated feedback across ~40 turns: "every page reads as a separate app." The Pulse panel work surfaced a system worth propagating — gray inset work surface, white cards, paper-document drawer, unified type + spacing — and this commit makes that system the canonical reference for every subsequent page sweep.

## Still pending

- **Drawer interior sweep** (next commit): per Yuqi, continue with deeper Pulse drawer + obligation drawer alignment.
- **Per-page propagation** (deferred): 14 files listed in `docs/Design/inset-surface-design-system.md` "Routes needing per-page visual review" — clients, dashboard sub-cards, opportunities, audit, evidence, rules.library, practice, billing. Each needs to flip gray card surfaces to white-card-on-inset.
- **Filter overflow "+N more" chip** (deferred): filter row hugs content widths and uses flex-nowrap when panel open, but the overflow chip pattern was never built.
