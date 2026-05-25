# Inset Surface — Design System Reference

**Source of truth** for the cross-product "paper-on-a-desk" treatment introduced
on `/rules/pulse` and ready to propagate across every route.

---

## Background tokens

Defined in `packages/ui/src/styles/tokens/semantic-light.css` (+ dark variant
in `semantic-dark.css`), exposed as Tailwind utilities via `preset.css`.

| Token                  | Value (light) | Class                   | When to use                                                                                                                     |
| ---------------------- | ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `--background-inset`   | `#f4f4f4`     | `bg-background-inset`   | **SidebarInset work surface.** Every route renders on top of this gray. Change in one place to retone the whole product.        |
| `--background-default` | `#ffffff`     | `bg-background-default` | **Card surfaces.** Cards/panels/sections that should "pop" off the inset gray.                                                  |
| `--background-section` | gray-50       | `bg-background-section` | Inline framed callouts that need a quiet step-down from white. Avoid on large card surfaces — blends with `--background-inset`. |
| `--background-subtle`  | gray-100      | `bg-background-subtle`  | Small chips (kbd, status pill backgrounds). Borders carry the frame; safe even on the new inset.                                |

Change the inset tone:

```css
/* packages/ui/src/styles/tokens/semantic-light.css */
--background-inset: #f4f4f4; /* ← change here, propagates everywhere */
```

---

## Surface hierarchy

```
SidebarInset (#f4f4f4)
├─ Page header (transparent, sits on inset)
└─ Cards (bg-background-default white, border-divider-subtle, rounded-md)
   └─ Section frames inside cards (bg-background-default, rounded-md)
      └─ Inline chips (bg-background-default, rounded-sm)
      └─ Status badges (Badge primitive, rounded-full)
```

**Rule:** card-class surfaces always use `bg-background-default`. Never put a
large gray card on the inset (it blends).

---

## Radius scale

| Token                                     | Value   | Used for                                                  |
| ----------------------------------------- | ------- | --------------------------------------------------------- |
| `rounded-sm`                              | 2px     | Inline chips, state pills, change-kind tags, client pills |
| `rounded-md`                              | 6px     | Cards, panels, section frames, buttons, filter triggers   |
| `rounded-full`                            | capsule | Status badges (Badge primitive), confidence pills         |
| Asymmetric: `rounded-tr-md rounded-bl-sm` | —       | Card-corner attached chips (e.g. NEW chip)                |

---

## Card chrome

```tsx
className={cn(
  'rounded-md border p-4 transition-colors',
  active
    ? 'border-state-accent-hover-alt bg-state-accent-hover/40'
    : 'border-divider-subtle bg-background-default hover:border-divider-regular',
  dimmed && 'opacity-70 hover:opacity-100',
)}
```

- **Default:** white bg + faint border. Card pops on the gray inset.
- **Active (a sibling row is open in a panel):** faint accent tint + softer
  accent border. Toned down — not saturated.
- **Hover:** border darkens one step (`divider-subtle → divider-regular`). NO
  bg change. Reads as "interactive" without flashing the card surface.
- **Dim:** when one row in the list is active, the others fade to `opacity-70`.
  Hover restores full opacity so scanning still works.
- **Padding:** `p-4` (16px) on standard cards per the canonical spacing scale
  (see "Spacing scale" section). Internal block gap is `gap-3`. Stacked
  sibling text blocks use `gap-2`.

---

## Filter / button bar

| Element               | Class                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| Filter trigger height | `h-8` (uniform across Select / Popover triggers)                                |
| Filter trigger border | `border-divider-strong`                                                         |
| Filter trigger bg     | `bg-background-default text-text-primary hover:bg-state-base-hover`             |
| Filter trigger width  | `w-[180px]` default, `w-auto` when panel open (hug content)                     |
| Filter row container  | `flex flex-wrap items-center gap-2` default, `flex flex-nowrap` when panel open |

---

## Drawer canonical (PulseDetailDrawer + ObligationDrawer)

**Both drawers** in the product follow the same chrome. The list at the top
of this section is the source of truth — if a drawer disagrees, fix the
drawer.

### Padding

| Region                     | Class               | Pixel                            |
| -------------------------- | ------------------- | -------------------------------- |
| Header                     | `px-12 py-10`       | 48 × 40                          |
| Body (scrolling)           | `px-12 pt-10 pb-24` | 48 × (40 top / 96 bottom)        |
| Sticky footer              | `px-12 py-4`        | 48 × 16                          |
| Body inter-section gap     | `gap-4`             | 16                               |
| Inner section internal gap | `gap-3`             | 12                               |
| Sticky inner heading bleed | `-mx-12 px-12 py-3` | full-width with 48px inner inset |

**Why asymmetric body padding?** The sticky footer (`min-h-16` + `py-4` ≈
64-80px) overlays the body's bottom edge when scrolled. `pb-24` (96px) gives
~footer-height + 32px breathing room, so the last content row never hides
behind the action bar. Top stays `pt-10` (40px) — the header-to-content
rhythm is unchanged.

The `px-12 py-10` body padding makes the drawer read as a roomy paper document.
`px-12` repeats edge-to-edge on header/body/footer so the left margin is one
continuous line.

### Outer chrome

```tsx
<aside
  className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden
             border-l border-divider-subtle bg-background-default
             shadow-[-4px_0_12px_-6px_rgb(0_0_0_/_0.08)]"
>
  {/* sticky header (px-12 py-10, border-b border-divider-subtle) */}
  {/* scrolling body (flex-1 overflow-y-auto, px-12 py-10, gap-4) */}
  {/* sticky footer (min-h-16, border-t-2, bg-background-default, px-12 py-4) */}
</aside>
```

### Header structure

Stacked vertically:

1. **Kicker** — framed state pill (e.g. `[CA flag] CA California`) at
   `text-xs`, `rounded-sm` framed
2. **h1 title** — `text-2xl font-semibold leading-tight`
3. **Description** (optional) — `text-sm text-text-secondary`, `mt-2`
4. **Chip row** — `flex flex-wrap items-center gap-2 text-sm`: change-kind
   chip leads, then source / status / confidence pills

### Body structure

- Scrolling container: `flex-1 min-h-0 overflow-y-auto px-12 py-10 gap-4 flex flex-col`
- Each section: `flex flex-col gap-3`
- Section heading inside body: `text-sm font-medium text-text-secondary` (NOT a
  page-level h2 — body sections are quieter than the drawer's own h1)

### Footer two-cluster layout

```tsx
<div className="flex flex-wrap items-center justify-between gap-2">
  <div className="flex flex-wrap items-center gap-2">
    {/* LEFT: reversal / secondary (Undo, Reactivate) */}
  </div>
  <div className="flex flex-wrap items-center gap-2">
    {/* RIGHT: forward / primary (Apply, Save, Confirm) */}
  </div>
</div>
```

LEFT cluster holds reversal / destructive actions. RIGHT cluster holds the
primary forward CTA. `justify-between` pins them apart. The right cluster's
last button is the **primary** (default size + variant); siblings stay
`size="sm"`.

### Width

- PulseDetailDrawer (panel mode): `60%` of container when open. Route shell
  sets `min-w-[1440px]` so list/panel split lands at 560/864 minimum.
- ObligationDrawer (sheet mode): `min(720, 100vw - 16px)` at sm,
  `min(840, 100vw - 24px)` at md, `min(920, 100vw - 32px)` at xl.

### Visual gestures

- **Shadow** (panel mode): `shadow-[-4px_0_12px_-6px_rgb(0_0_0_/_0.08)]`
  on the left edge — gestural "paper lifted off the desk."
- **Footer divider**: `border-t-2` (heavier than the typical `border-t`) +
  white bg so the decision surface reads as decision-grade against the
  body's content.

---

## Chip / pill vocabulary

| Pattern                                                    | Shape                                                                       | When                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **State pill** (`[StateBadge xs] CA` + optional full name) | `rounded-sm` framed pill                                                    | Card, drawer kicker, FactGrid jurisdiction — **same chip pattern across three contexts** |
| **Change-kind chip** (`Deadline Shifted`)                  | `rounded-sm bg-state-accent-hover text-text-accent`                         | Inline after the title — accent-filled label for the most important fact                 |
| **Status badge** (`Open` / `Applied` / `Snoozed` …)        | Badge primitive `rounded-full`, variant-tinted                              | Workflow state                                                                           |
| **Confidence pill** (`LOW` / `MEDIUM` / `HIGH`)            | `rounded-full h-6` + `Astroid` icon                                         | Footer of card + drawer header — **same pill across both**                               |
| **NEW chip**                                               | absolute top-right, asymmetric corner, `bg-text-primary text-text-inverted` | Unread/untouched alert                                                                   |
| **Client chip**                                            | `rounded-sm` + entity icon (Building2 / UserRound)                          | Inline list of affected clients                                                          |
| **Tag / needs-attention signal**                           | `AlertCircle` icon in `text-text-warning` + Tooltip                         | Per-row attention flag — **icon does the lifting; no chip-bg color**                     |

---

## Color tone ladder (no collisions)

| Tone                  | Hue                                         | Used by                                             |
| --------------------- | ------------------------------------------- | --------------------------------------------------- |
| Green (success)       | `bg-state-success-hover text-text-success`  | Applied / Reviewed status badges (success terminal) |
| Blue (info / accent)  | `bg-state-info-hover text-text-accent`      | **HIGH confidence**, accent CTAs                    |
| Gray (neutral)        | `bg-background-section text-text-secondary` | **MEDIUM confidence**, secondary info               |
| Amber (warning)       | `bg-state-warning-hover text-text-warning`  | **LOW confidence**, needs-review attention flag     |
| Black (high-contrast) | `bg-text-primary text-text-inverted`        | NEW chip (high-contrast inverted pill)              |

**Rule:** never reuse the same tone family for two semantically different
signals in the same surface. Green is taken by Applied; HIGH confidence must
NOT be green. Amber is taken by needs-review; MEDIUM confidence must NOT be
amber.

---

## Spacing scale (canonical)

Added 2026-05-26 (Yuqi forty-third pass). Same-purpose = same value
across Today / Alerts / Deadlines.

### Gaps

| Purpose                               | Tailwind | Pixel |
| ------------------------------------- | -------- | ----- |
| Inline (icon + label, chip internals) | `gap-1`  | 4px   |
| Same-row elements (chips, badges)     | `gap-2`  | 8px   |
| Row / card internal block gap         | `gap-3`  | 12px  |
| Section internal cluster              | `gap-4`  | 16px  |
| Between major page sections           | `gap-6`  | 24px  |

### Padding

| Purpose                    | Tailwind        | Pixel   |
| -------------------------- | --------------- | ------- |
| Chip / pill internal       | `px-1.5 py-0.5` | 6×2     |
| Small button / inline card | `p-2`           | 8       |
| Row (table row, list row)  | `px-3 py-2`     | 12×8    |
| Standard card              | `p-4`           | 16      |
| Page shell outer           | `px-4 md:px-6`  | 16 / 24 |
| Drawer body (Pulse detail) | `px-12 py-10`   | 48 / 40 |

**Drop these (no canonical purpose):**

- `gap-0.5` (2px) — too tight, use border-separated rows instead
- `gap-1.5` (6px) — half-step, round to gap-1 or gap-2
- `py-2.5` (10px) — half-step, round to py-2 or py-3
- `py-5` / `py-6` for card surfaces — too tall, use p-4
- `gap-x-8` (32px) — only for definition-list column gaps where intentional

**Compact exceptions:**

- Action row's expansion panel uses asymmetric `px-4 pt-3 pb-4` for visual continuity with the row above. This is the one exception to "card = p-4."
- DL grids (`<dl>` with key/value columns) may use `gap-x-8` for column separation; this is reading-list spacing, not card padding.

---

## Typography rules

- **Mono only for actual numeric codes** (e.g. ID strings, tax-form numbers
  in some contexts). NOT for:
  - Proper nouns (county names like "Los Angeles")
  - Entity-type labels (individual / llc / s_corp / trust / sole_prop) —
    these are normalized labels, not codes
  - 2-letter state codes inside a framed state pill (the chip frame is the
    affordance; mono is redundant)
- **Title Case** for change-kind chips (`Deadline Shifted`, not
  `DEADLINE SHIFTED`).
- **Sentence case** for body copy, button labels, headers.

---

## Alert primitive

When using `<Alert>` from `@duedatehq/ui/components/ui/alert`:

- **Drop the leading icon by default** — title + description only. Icons make
  the alert read as a "notification" rather than inline page chrome.
- The primitive auto-detects the absence of an SVG child and collapses to
  single-column layout (cleaner).
- Reserve icons for actual notification-style alerts that interrupt user flow.

---

## Page layout

Every route renders inside `<SidebarInset className="bg-background-inset">`.

For routes with side panels (e.g. `/rules/pulse` with alert drawer):

```tsx
<RulesPageShell
  title={...}
  lockViewport
  contentClassName={panelOpen ? 'max-w-none min-w-[1440px] !pb-0 md:!pb-0' : undefined}
>
  {/* split flex container */}
  <div className="flex min-h-0 flex-1 gap-4">
    {/* list column — own scroll */}
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto [scrollbar-gutter:stable]">
      {/* list */}
    </div>
    {/* panel column — fixed 60%, sticks bottom */}
    {panelOpen && (
      <div className="flex min-h-0 w-[60%] shrink-0 self-stretch">
        <Drawer mode="panel" />
      </div>
    )}
  </div>
</RulesPageShell>
```

- `lockViewport`: shell becomes `h-svh overflow-hidden`. Each column scrolls
  independently.
- `min-w-[1440px]` when panel open: anchors the panel/list ratio. Narrower
  viewports horizontally scroll.
- `!pb-0` when panel open: panel column sticks to the bottom of the viewport.
- **Auto-collapse sidebar on detail open**: routes with side panels should
  call `useSidebar().toggleCollapsed()` on click to free ~200px.

---

## Global behavior

- **Scrollbars hidden globally** (`globals.css`): `scrollbar-width: none` +
  `*::-webkit-scrollbar { display: none }`. Scroll still works
  (wheel/touch/keyboard); the visible track/thumb chrome is suppressed for a
  cleaner document-y feel.

---

## Propagation checklist (per-page audit)

When porting a route to this design system:

1. ✅ Page sits inside `SidebarInset` (already global via app-shell)
2. Cards on the page surface use `bg-background-default` (white), not
   `bg-background-section` or `bg-background-subtle`. Flip if needed.
3. Section frames inside cards use `rounded-md` (not `rounded-[2px]` or
   `rounded-lg`).
4. Inline chips use `rounded-sm`; status badges use `rounded-full` (Badge
   primitive); state pills follow the **state pill pattern** above.
5. Confidence / severity uses the **color tone ladder** above — no green-
   green or amber-amber collisions.
6. Alert primitives: drop leading icons unless the alert is a true interrupt.
7. Drop `font-mono` from proper-noun chips and normalized-label chips. Keep
   mono only for numeric codes.
8. Hover states: border-only darkening preferred over bg fills.
9. Active states (in lists): faint accent tint + soft accent border, NOT
   saturated.
10. If the route has a detail panel: lockViewport + min-w-[1440px] +
    auto-collapse sidebar on open + drawer with soft left shadow.

---

## Routes already on this system

- `/rules/pulse` (Alerts list + drawer) — canonical reference
- `/rules/pulse/history` — inherits from same `PulseChangesTab`

## Routes needing per-page visual review

Spot-fix candidates (these files use gray bg tokens on large card surfaces
that would benefit from white-card-on-inset):

- `apps/app/src/features/clients/ClientDetailDrawer.tsx`
- `apps/app/src/features/clients/ClientPeekHoverCard.tsx`
- `apps/app/src/features/clients/ClientFactsWorkspace.tsx`
- `apps/app/src/features/clients/ClientSummaryStrip.tsx`
- `apps/app/src/features/dashboard/needs-attention-card.tsx`
- `apps/app/src/features/dashboard/actions-list.tsx`
- `apps/app/src/features/dashboard/needs-attention-section.tsx`
- `apps/app/src/features/opportunities/client-opportunities-card.tsx`
- `apps/app/src/features/opportunities/opportunities-page.tsx`
- `apps/app/src/features/audit/audit-event-drawer.tsx`
- `apps/app/src/features/evidence/EvidenceDrawerProvider.tsx`
- `apps/app/src/routes/obligations.tsx` (queue panel + drawer sub-cards)
- `apps/app/src/routes/rules.library.tsx`
- `apps/app/src/routes/practice.tsx`
- `apps/app/src/routes/billing.checkout.tsx`

Per file: look for `bg-background-section` / `bg-background-subtle` on
elements with `rounded-md` / `rounded-lg` and a `border` — those are likely
card surfaces. Flip to `bg-background-default`. Don't change kbd chips or
small inline pills — borders carry the frame; they stay readable.
