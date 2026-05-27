# Audit Drain X1 — Dashboard Composition (D17 + D18)

Wave-7 audit-drain agent X1. Drains two of φ's journey-audit findings on `/today`:

- **D17** ("Changes since last visit" surface — J5: returned-from-vacation journey)
- **D18** (above-the-fold density — J2: Tuesday 8am, 60 clients, what's on fire?)

## D17 — "Changes since last visit"

### What

New section `ChangesSinceLastSection` rendered between the `PageHeader` and the
`NeedsAttentionSection` on `/today`. Welcomes a CPA back after a weekend / vacation with a
quiet, compact list of high-signal practice events that landed since their last visit.

### Architecture

- **File**: `apps/app/src/features/dashboard/changes-since-last-section.tsx` (new)
- **Data source**: `orpc.audit.list` with `range: '7d'`, `limit: 50`. Events are then
  client-side-filtered to `> lastSeenAt` and intersected with a `HIGH_SIGNAL_ACTIONS`
  allow-list (status changes, due-date moves, new alerts, member churn, rule edits).
- **Last-seen tracking**: localStorage at `duedatehq.dashboard.lastSeenAt.v1`.
  `lastSeenAt` is read on mount and stamped fresh on unmount, so the next visit reads
  "since the last time the dashboard was OPEN," not "since the last time the page
  rendered." First-visit fallback is 24h.
- **Collapse affordance**: localStorage at `duedatehq.dashboard.changesSince.collapsed.v1`.
  Power users who don't want the section can hide it; toggle persists per-device.
- **Entity routing**: small explicit map (`entityHref`) — obligation → `/deadlines/<id>`,
  client → `/clients/<id>`, pulse → `/rules/pulse`, member → `/settings/team`, rule →
  `/rules/library`. Unknown entity types fall back to `/audit?event=<id>` so rows
  always land somewhere meaningful.
- **Cap**: 8 visible rows. Overflow → "N more in the audit log" deep-link to `/audit`.
- **Empty state**: "Nothing's changed since {timeago(lastSeen)}" — quiet text-tertiary,
  no destructive coloring.

### Why localStorage (not server-side)

No `lastSeenAt` / `lastDashboardVisitAt` field exists today. Grepped both
`apps/app/src/lib/use-current-user-name.ts` and the contracts package — neither has the
shape. Adding the field would be a contract change (ω-territory) and is out of scope for
this drain. The localStorage fallback ships the surface now.

### Upgrade path (server-driven)

1. Add `lastDashboardVisitAt: string | null` to the protected layout loader's user
   payload (`apps/server/src/...`, contract change).
2. Add a `since: string` filter to `AuditListInputSchema` in
   `packages/contracts/src/audit.ts` so the client can request `since=lastSeenAt`
   without the 7d ceiling.
3. Replace `useState`-from-localStorage and client-side `.filter()` in
   `changes-since-last-section.tsx` with the loader value and a server-bounded query.

The localStorage version is forward-compatible: same component shape, same query
options pattern, just swap the input source.

## D18 — Above-the-fold density tightening

φ's J2: "Tuesday 8am, 60 clients, what's on fire?" The previous dashboard fold spent
too much vertical on section gaps + empty-state padding, pushing overdue rows off the
default 1440×900 viewport once the new D17 section was added on top.

### Density tweaks (5 changes — under the ≤8 cap)

All in `apps/app/src/routes/dashboard.tsx` and
`apps/app/src/features/dashboard/needs-attention-section.tsx`.

| #   | Surface                             | Before                                     | After                          | Rationale                                                                                                                                                                                                   |
| --- | ----------------------------------- | ------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Page outer container                | `gap-6` between sections                   | `gap-4`                        | 24px → 16px between header / changes-since / alerts / actions. Saves ~24px of vertical with three section boundaries above the fold.                                                                        |
| 2   | Page outer container (mobile)       | `pt-6 pb-4`                                | `pt-4 pb-3`                    | Trims 16px from the top and bottom of the page padding on phone width.                                                                                                                                      |
| 3   | Page outer container (desktop)      | `md:pt-8 md:pb-6`                          | `md:pt-6 md:pb-5`              | Trims 12px from the top + bottom on tablet/desktop so the H1 stops claiming the entire first scan band.                                                                                                     |
| 4   | `PageHeader` "Today" date pill      | `px-2 py-0.5`                              | `px-1.5` (no vertical padding) | At `text-xs` font-medium tabular-nums, the glyph cap-height anchors the chip vertically; the previous py-0.5 added a 4px buffer that read as a button slot.                                                 |
| 5   | `NeedsAttentionSection` empty-state | `gap-2.5 p-3` (same as alerts-loaded path) | `gap-2 px-3 py-2`              | When the section is calm (no live alerts) there's no destructive content to anchor the heavier padding. Compresses ~8px when nothing's on fire. Alerts-loaded path keeps its weight (p-3 + destructive bg). |

Bonus inner tweak (counts toward overall composition rhythm but minor — not in the table):

- `AlertsEmptyState` inner stack: `gap-1.5` → `gap-1` so the "no-alerts" + "monitoring N
  sources" lines read as one paragraph rather than two.

### Responsive sanity

- **1024×768 (laptop)**: outer padding is `pt-4 pb-3` here (no `md:` prefix kicks in
  yet → wait, `md:` is ≥768px, so at 1024 the desktop padding applies). At 1024 the
  page is `md:px-6 md:pt-6 md:pb-5`. Section gap is `gap-4`. Overdue rows land in the
  first viewport.
- **1440×900 (target)**: Same desktop padding. With D17 section + Alerts + first
  Actions tile, the first 3-4 visible bands are: H1 + Changes-since (~80px), Alerts
  panel (~120px), Actions summary tiles (~80px), first action row (~60px). Fits.
- **1920×1080 (large monitor)**: same desktop padding. Extra vertical → more action
  rows visible. No regression.

### Not changed (intentional)

- `actions-list.tsx` — ω's territory. The `<DashboardTopRow>` rendering owns its own
  internal density and `gap-4` rhythm; leaving it alone.
- `gap-4` on the page outer is the **whole-page** rhythm now. Individual sections keep
  their own inner gaps (alerts panel still `gap-2.5` inside; actions list still
  `gap-4` inside). The density change is between sections, not within them.

## Files

- New: `apps/app/src/features/dashboard/changes-since-last-section.tsx`
- New: `docs/dev-log/2026-05-27-audit-drain-x1-dashboard-composition.md`
- Edit: `apps/app/src/routes/dashboard.tsx`
- Edit: `apps/app/src/features/dashboard/needs-attention-section.tsx`
- Edit: `apps/app/src/i18n/locales/en/messages.po` (+ messages.ts via compile)
- Edit: `apps/app/src/i18n/locales/zh-CN/messages.po` (+ messages.ts via compile)

## Validation

- `pnpm --filter @duedatehq/app exec tsc --noEmit` — clean
- `pnpm --filter @duedatehq/app test --run src/features/dashboard` — 2/2 pass
- `pnpm --filter @duedatehq/app i18n:extract` — 0 missing in zh-CN
- `pnpm --filter @duedatehq/app i18n:compile --strict` — clean

## Needs Yuqi call

- **D18 #2 / #3** (mobile + desktop padding): the page top went from
  generous-pt-6/8 to pt-4/6. Yuqi's prior pass (2026-05-25) explicitly bumped the
  top to pt-6 md:pt-8 for "page-title breathing room." This drain reverses part of
  that — justified by D18 fold pressure but worth flagging. Easy to revert to
  pt-6 md:pt-8 if she wants the breathing room back.
- **D18 #4** (date pill `py-0` instead of `py-0.5`): saves 4px vertical on a single
  pill. The chip reads slightly tighter; if it now reads "squished against the H1
  baseline" she may want py-0.5 back.
- **D17 collapse default**: the section is OPEN by default. We could ship it
  closed-by-default to be even quieter ("opt-in welcome-back") — Yuqi to choose.
