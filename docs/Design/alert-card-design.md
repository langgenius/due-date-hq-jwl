# Alert card design — canonical spec

> Source of truth for the alert card on `/rules/pulse` (the list-row
> `PulseAlertCard`) and on `/today` (the summary tile
> `NeedsAttentionCard`). Both surfaces serve the same alert data
> (`PulseAlertPublic`) and must share the meta-row vocabulary so a CPA
> who learns one card reads the other instantly.
>
> Companion: [pulse-vocabulary.md](./pulse-vocabulary.md) — the noun /
> verb / nav-label spec for the Pulse engine surface labels.

## 1. Canonical structure

Both cards open with the **same top meta row**, then diverge below
based on the surface's role (list row vs summary tile).

```
┌──────────────────────────────────────────────────────────────┐
│ ▢ HIGH IMPACT  FL DOR Bulletin · 1mo ago    ▢ Needs Action │   ← top meta
│                                                              │
│ ▢ FL flag│FL   Title text — alert headline here     Open   │   ← title row
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ WHAT CHANGED      AFFECTING       PUBLISHED         │ │   ← facts panel
│ │ Deadline shifted  Form 1065 2 more    2026-05-28    │ │   (alerts-only)
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ 👥 4 clients · 1 federal_1065 affected  [Review→]   [snz][arch][dsm] │
│                                  hover-revealed   hover-revealed     │
└──────────────────────────────────────────────────────────────┘
```

### Top meta row

- **Severity pill** — `inline-flex h-6 rounded-[4px] px-1.5 text-[11px]
font-semibold tracking-[0.8px]`. Color fill from
  `severityFromConfidence()` in `pulse-alert-chrome.ts`:
  - `high` → `#FEE4E2` bg / `#9F1239` text
  - `medium` → `#FEF3C7` bg / `#92400E` text
  - `low` → `#D1FADF` bg / `#054F31` text
- **Source caption** — `text-[13px] font-medium text-text-secondary`
  on /alerts; same 13px on /today via `PulseSourceMeta`.
- **Timestamp** — `text-sm font-medium text-text-tertiary` via
  `formatRelativeTime()`.
- **Action pill** — `rounded-full px-3 py-1.5 text-xs font-medium`,
  color from `actionPillFromAlert()` (Needs Action = destructive red,
  Needs Review / Closed / Snoozed = neutral gray).

### Title row — encapsulated state pill + title + Open

The state pill wraps **both** the StateBadge SVG flag AND the
two-letter code in a single container. Yuqi feedback (2026-06-04 round
39): _"state badge 和 State abbreviation 是 encapsulated 在一个 badge
里满的"_.

```jsx
<span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-[4px] bg-background-section px-1.5">
  <StateBadge code={alert.jurisdiction} size="xs" />
  <span className="text-[10px] font-semibold tracking-[0.4px] text-text-secondary uppercase">
    {alert.jurisdiction}
  </span>
</span>
```

The pill has no border — visual weight comes from the `bg-background-section`
(gray-50) fill, equal-weight to the colored severity pill alongside.

The h3 title is `text-[18px] leading-[1.25] font-semibold tracking-[-0.2px]
text-text-primary line-clamp-1`. The muted "Open"/"Snoozed" status sits
**inline after the title** (not pushed to the far right) — a `flex-1`
spacer follows so the right-edge tail of the card stays empty at rest.

### Facts panel (alerts-only)

The 3-column grid panel (Pencil **R2kul**) lives between the title row
and the impact row on `/alerts` only. `/today` summary tiles omit it
because they're 3-column densely-packed dashboard cards.

```
grid grid-cols-[5fr_5fr_3fr] rounded-[8px] bg-background-section
```

Each cell: `px-3 py-2` with a `text-[10px] font-semibold tracking-[0.6px]
text-text-muted uppercase` label + `text-xs font-medium text-text-secondary`
value. The three cells: **What changed** → `changeKindLabel`; **Affecting**
→ the first parsed form (human label via `formatTaxCode`) + an `N more` overflow,
falling back to `—` when the alert carries no form scope; **Published** →
the source bulletin's publish date (absolute `formatDate(publishedAt)`; the
meta row above carries the relative "Nmo ago"). 2026-06-05: `forms` now rides
on `PulseAlertPublic`, so Affecting renders from the list payload; the former
First Application + Transition placeholder cells were dropped.

### Impact row

`pt-1 pb-0.5` (tight top padding — `pt-1` per Yuqi 2026-06-04 round 36
closing-c). Layout:

```
[👥 N clients · Form] [Review→]              [PulseAlertActionsRow]
                       ↑                                  ↑
              hover-revealed                     hover-revealed
              follows clients line               flex-1 spacer pushes right
```

The Review button uses `text-xs font-semibold text-text-accent
hover:underline`. The actions row (Snooze / Archive / Dismiss) uses
ghost-variant icon buttons (`variant="ghost" size-7`, icon `size-3`,
ghost text/bg tints) — no border chrome, no fill at rest.

## 2. Card chrome

```
outer:    rounded-2xl px-5 py-3  bg-background-default  cursor-pointer
resting:  bg #ffffff white
hover:    +ring-1 ring-inset ring-divider-regular  (subtle 8%-alpha gray edge)
active:   bg-state-accent-hover #eff4ff + shadow-[inset_0_0_0_1px_state-accent-active-alt]
focus:    ring-2 ring-state-accent-active-alt
```

- **No border** — Pencil ZkXFr disables stroke; the card defines its
  edge against the gray page wash via the white fill.
- **No shadow** — Yuqi: _"remove shadow. hate them"_.
- **Hover never changes bg color**. Three earlier attempts at hover-bg
  tints all failed: `bg-background-subtle` (gray-100) was 2 RGB units
  off the page wash (invisible); `bg-state-accent-hover` (light blue)
  read as a "click-state preview" (loud). Final answer: an inset ring
  appears as a subtle edge cue, the bg stays white.
- **Active uses a deeper blue tint + accent ring** to signal "this row
  is open in the panel" — the ring is the primary cue, the bg-tint is
  a quiet wash behind it.

## 3. Surface-specific behaviors

### `PulseAlertCard` (`/rules/pulse` list rows)

- Renders the full structure including facts panel.
- Hover-reveals Review + PulseAlertActionsRow on the impact row.
- Active state when `alert.id === openAlertId`.
- Inter-card gap on the list: `gap-2` (8px).

### `NeedsAttentionCard` (`/today` summary tiles)

- Omits the facts panel and the impact row (no clients-affected line,
  no actions row, no Review button).
- Replaces the title-row trailing "Open" status with an Eye icon at
  the far right of the meta row (the affordance is "view this alert's
  details in the drawer", not "navigate forward").
- Renders in a 1/2/3-column grid driven by the parent
  `NeedsAttentionSection` based on alert count + viewport.
- Card padding `p-4` (vs `/alerts` `px-5 py-3`) because the dashboard
  tile is a less-dense scan surface.

## 4. Cross-surface consistency rules

These MUST stay aligned across `/today` and `/alerts`:

| Token                     | Spec                                                                  |
| ------------------------- | --------------------------------------------------------------------- |
| Severity pill chrome      | `h-6 rounded-[4px] px-1.5 text-[11px] font-semibold tracking-[0.8px]` |
| State pill chrome         | `h-6 rounded-[4px] gap-1 px-1.5 bg-background-section`                |
| State pill contents       | `<StateBadge size="xs">` + 2-letter code `text-[10px]` uppercase      |
| Source size               | `text-[13px]`                                                         |
| Card resting bg           | `bg-background-default` (white)                                       |
| Card hover behavior       | inset gray ring, no bg color change                                   |
| Card corner               | `rounded-2xl`                                                         |
| StateBadge size for cards | `xs` (20px)                                                           |

When changing any of these, change BOTH cards together.

## 5. Page-level chrome (for context)

- `/today` and `/alerts` both use the canonical `<PageHeader>` primitive.
- Both pages: `md:px-16` horizontal padding, `gap-8` (32px) between
  top-level sections.
- Both action clusters use `<Button variant="outline" size="sm">`.
- Headers differ in title composition (intentional): `/today` has the
  date inline; `/alerts` has the monitoring chip + N urgent + PulsingDot.

## 6. Deferred (not yet shipped)

- **Pencil tgX5T** — when the right-side detail panel is open, the
  left-side `PulseAlertCard` collapses to compact mode: title +
  impact + time + state + Open/Snoozed only (no severity pill, no
  source, no facts panel, no actions row).
- **Pencil n9m9B** — right-side detail panel exact recreation.
