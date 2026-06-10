# Deadline row — interaction spec

**Date:** 2026-06-10
**Status:** Design source-of-truth, code-grounded
**Applies to:** Every obligation row in the app (clients detail · deadlines list · today dashboard · alerts detail · audit log)
**Pencil refs:** `tZ0BB` clients table, `PFkmy` inline expansion alt, `m9FwQ` example row, `Y8xrR` / `kWbdW` deadline detail page
**Codebase entry points:** `apps/app/src/routes/obligations.tsx`, `apps/app/src/routes/deadline-detail.tsx`

---

## ⚠ Engineering constraint

**This is a FRONTEND-ONLY design spec.** Do not change backend code (no schema migrations, no contract changes, no new mutations unless explicitly listed in §11). All interaction described here uses the existing data model and existing tRPC procedures. Where a feature would require backend work, it is called out in §11 — defer those to a separate ticket.

---

## 1. Existing code we build on (read this FIRST)

Before touching any code, read these:

### 1.1 Data model — `obligation` (the deadline)

The "deadline" entity is called `obligation` in this codebase. Schema:

| What | Where |
|---|---|
| DB schema | `packages/db/src/schema/obligations.ts:189-206` |
| Public contract | `packages/contracts/src/obligations.ts` (re-exports from `obligation-instance.ts`) |
| Queue row schema | `packages/contracts/src/obligation-queue.ts:96-100` (`ObligationQueueRowSchema`) |

### 1.2 Status enum (10 values — verbatim from `obligations.ts:441-454`)

```ts
export const OBLIGATION_STATUSES = [
  'pending',
  'in_progress',
  'done',
  'extended',
  'paid',
  'waiting_on_client',
  'review',
  'not_applicable',
  'blocked',
  'completed',
] as const
```

**Important:** the design canvas occasionally uses canonical-design names (`not_started`, `in_review`, `filed`). Map them to the existing enum before rendering — do NOT change the enum:

| Canonical design label | Backend `OBLIGATION_STATUSES` value |
|---|---|
| Not started | `pending` |
| In progress | `in_progress` |
| Waiting on client | `waiting_on_client` |
| Blocked | `blocked` |
| In review | `review` |
| Filed | `done` (or `paid` when payment matters) |
| Completed | `completed` |
| Extended | `extended` |
| Not applicable | `not_applicable` |

### 1.3 Routes — Tanstack Router, NOT Next.js

| Route | File | Behavior |
|---|---|---|
| `/deadlines` (queue list) | `apps/app/src/routes/obligations.tsx` | TanStack Table list with filter/sort/multi-select |
| `/deadlines/:obligationRef` | `apps/app/src/routes/deadline-detail.tsx:34-100` | Master-detail page (list pane + detail) |
| `/deadlines/:obligationRef/:tab` | same | Deep-linked detail tabs |
| `/clients/:clientId` | `apps/app/src/routes/clients.$clientId.tsx` | Client detail; renders `ClientDetailWorkspace` |
| `/dashboard` | `apps/app/src/routes/dashboard.tsx` | Today dashboard |
| `/alerts` | `apps/app/src/routes/alerts.tsx` | Alerts feed |

### 1.4 Detail tabs (verbatim from `obligation-queue.ts ObligationQueueDetailTabSchema`)

```ts
'summary' | 'readiness' | 'extension' | 'risk' | 'evidence' | 'audit'
```

**Default tab on click** = `'summary'`. Use `deadlineDetailPath()` helper at `apps/app/src/features/obligations/deadline-detail-url.ts:51-57` to build the URL. Do not hand-assemble paths.

### 1.5 URL state — `nuqs` (NOT `useSearchParams`)

This project uses `nuqs` adapted for Tanstack Router. See `apps/app/src/routes/obligations.tsx:80-82` for the import pattern:

```ts
import { parseAsArrayOf, parseAsBoolean, parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
```

All filter / sort / multi-select state is `useQueryStates`-driven so URL is the source of truth. New URL params introduced by this spec (e.g. `?expanded=`) MUST go through `useQueryStates` — never `window.location` or local state.

### 1.6 Reusable primitives already in the codebase

| Component | File | Use for |
|---|---|---|
| `AssigneeAvatar` | `apps/app/src/components/AssigneeAvatar.tsx:75-177` | Owner avatar (32px default) — has `size · type · name · isMine` props |
| `DueDaysPill` | `apps/app/src/features/obligations/queue/components/primitives.tsx:43-135` | "9d / Today / 3d late" with urgency tone |
| `status-control` | `apps/app/src/features/obligations/status-control.tsx` | Status → icon + label + tone mapping |
| `getAssigneeTint(name)` | `AssigneeAvatar.tsx` helper | Stable per-name color (use for the brand-color avatar tiles in design) |
| `initialsFromName()` | same | Initials |
| `deadlineDetailHref()` | `deadline-detail-url.ts` | Build the detail URL |
| `deadlineDetailPath()` | `deadline-detail-url.ts:51-57` | Path-only variant |
| `cleanDeadlineDetailSearch()` | `deadline-detail-url.ts:59-78` | Preserves parent table filters on navigation |

### 1.7 Existing row implementation

There is NO `<DeadlineRow>` component today. The queue is built directly via TanStack Table columns at `apps/app/src/routes/obligations.tsx` (column definitions live in `use-obligation-queue-columns.tsx`). **This spec creates a new shared `<DeadlineRow>` component** that wraps the column rendering so the same row markup can be reused on `/clients/:clientId`, `/today`, and `/alerts/:alertId`.

**Important constraint:** the new component must render identically to the existing queue table when used at `/deadlines`. Do not break the existing queue.

### 1.8 Existing row click behavior

In `obligations.tsx`, row click navigates via:

```ts
deadlineDetailHref({ obligationId: row.id, tab: activeTab })
```

See `obligations.tsx:7823-7825`. Today there are two existing modes:

1. **Drawer mode** — right-side sheet overlay within `/deadlines` (no route change)
2. **Master-detail mode** — full route change to `/deadlines/:ref`

This spec adds a third mode: **inline-expand** (used only on `/clients/:clientId`).

---

## 2. Click target matrix (the 7 click targets in any row)

| # | Target | DOM element | Action | Destination | Affordance |
|---|---|---|---|---|---|
| 1 | **Row body** (default chrome — not a link/pill) | `<article>` wrapping the row | Mode-dependent (see §3) | Inline expand · navigate · drawer | Cursor `pointer`; hover bg `var(--ddhq-bg-subtle)` |
| 2 | **Deadline title** | `<Link>` element | Navigate | `deadlineDetailHref({ obligationId, tab: 'summary' })` | Accent text · underline on hover |
| 3 | **Form-tag tile** (e.g. `1099`) | `<button>` | Navigate (same as title) | `deadlineDetailHref({ obligationId, tab: 'summary' })` | Outline ring on hover |
| 4 | **Status pill** | `<button>` | Filter same page | URL param `?status=` updated via `useQueryStates` | Box-shadow ring on hover |
| 5 | **Owner avatar + name** | `<button>` | Filter same page | URL param `?assigneeNames=` updated via `useQueryStates` | Underline on name hover · `aria-label="Filter by {name}"` |
| 6 | **Chevron-right** (inline-expand mode only) | `<button>` | Toggle accordion | Local state + URL `?expanded=` | Rotates 90° on expand · 200ms transition |
| 7 | **Cmd/Ctrl + click on title** | Browser default | New tab | Same URL | Standard browser behavior — do NOT `preventDefault()` on link |

### 2.1 NOT clickable (pure information)

- Internal due countdown (`9d`)
- Official due date (`Mar 19, 2026`)
- Form sub-text (`State · California`)
- Tax type label

Do NOT add hover states to these — it implies false interactivity.

### 2.2 Click target precedence (when nested)

Status pill click must NOT bubble to row body click. Use `event.stopPropagation()` on every nested button:

```tsx
<button
  onClick={(e) => {
    e.stopPropagation()
    onFilterByStatus(deadline.status)
  }}
>
```

---

## 3. Mode-specific behavior (the most important rule)

The **same** `<DeadlineRow>` component renders in 5 surfaces. Behavior differs by `mode` prop.

| Surface | `mode` prop value | Row body click behavior | Why |
|---|---|---|---|
| `/clients/:clientId` | `'inline-expand'` | Expand accordion below the row | Single-client browse mode — peek without context loss |
| `/deadlines` (queue list) | `'navigate'` or `'drawer'` (user preference) | Navigate to detail OR open drawer | Multi-client list — user is processing |
| `/dashboard` (`/today`) | `'navigate'` | Navigate to `/deadlines/:ref/summary` | Action-oriented surface |
| `/alerts/:alertId` (AffectedClients table) | `'drawer'` | Open right-side sheet | Keep alert context |
| `/audit-log` (when row references a deadline) | `'navigate-to-audit'` | Navigate to `/deadlines/:ref/audit` directly | User came here for audit context |

### 3.1 Component prop signature

```ts
// apps/app/src/features/obligations/queue/components/DeadlineRow.tsx (NEW)

import type { ObligationQueueRow } from '@/contracts/obligation-queue'

export type DeadlineRowMode =
  | 'navigate'              // Default — click navigates to detail
  | 'inline-expand'         // /clients — click expands inline
  | 'drawer'                // /alerts — click opens drawer
  | 'navigate-to-audit'     // /audit-log — click navigates to /deadlines/:ref/audit

export interface DeadlineRowProps {
  /** The obligation row data — matches ObligationQueueRowSchema */
  deadline: ObligationQueueRow

  /** How the row should respond to body clicks */
  mode: DeadlineRowMode

  /** Whether this row is currently expanded (only relevant in inline-expand mode) */
  isExpanded?: boolean

  /** Whether this row is currently selected via checkbox */
  isSelected?: boolean

  /** Whether the parent list is in multi-select mode (checkbox visible) */
  multiSelectMode?: boolean

  /** Whether the current user has edit permission on this deadline */
  canEdit?: boolean

  /** Whether to highlight as the currently active/selected row (accent bar + bg-subtle) */
  isActive?: boolean

  // Callbacks — all optional. Parent decides what to do.
  onExpand?: (obligationId: string) => void
  onCollapse?: (obligationId: string) => void
  onSelect?: (obligationId: string, selected: boolean) => void
  onFilterByStatus?: (status: ObligationStatus) => void
  onFilterByAssignee?: (assigneeId: string, assigneeName: string) => void
  onOpenDrawer?: (obligationId: string) => void
}
```

### 3.2 Internal click handler logic

```tsx
const handleRowClick = (event: React.MouseEvent) => {
  // 1. If we're in multi-select mode, click toggles selection — do NOT expand or navigate
  if (multiSelectMode) {
    onSelect?.(deadline.id, !isSelected)
    return
  }

  // 2. Mode-specific behavior
  switch (mode) {
    case 'inline-expand':
      isExpanded ? onCollapse?.(deadline.id) : onExpand?.(deadline.id)
      break
    case 'navigate':
      navigate({
        to: deadlineDetailHref({ obligationId: deadline.id, tab: 'summary' }),
      })
      break
    case 'drawer':
      onOpenDrawer?.(deadline.id)
      break
    case 'navigate-to-audit':
      navigate({
        to: deadlineDetailHref({ obligationId: deadline.id, tab: 'audit' }),
      })
      break
  }
}
```

### 3.3 Title link MUST always navigate, regardless of mode

Even in `inline-expand` mode, clicking the title navigates to `/deadlines/:ref/summary`. This is the consistent escape hatch — users always have a one-click path to the full page. Use `<Link>` from Tanstack Router so Cmd+Click opens in a new tab natively.

---

## 4. Inline expansion content spec (`mode='inline-expand'` only)

This is the most novel piece. When `isExpanded === true`, render an expansion body BENEATH the row.

### 4.1 Container chrome

```tsx
<div
  role="region"
  aria-labelledby={`deadline-title-${deadline.id}`}
  className={cn(
    'w-full',
    'px-[20px] py-[16px]',
    'bg-[var(--ddhq-bg-subtle)]',  // soft tint to nest visually inside the row
    'border-t border-[var(--ddhq-divider-subtle)]',
    'flex flex-col gap-[14px]',
  )}
>
```

### 4.2 Layout — 5 sections in vertical stack, gap 14px

```
┌─────────────────────────────────────────────────────────────────┐
│  Section A — Workflow journey (compact horizontal strip)        │
│  ───────────────────────────────────────────────────────────── │
│  Section B — Recent activity (last 2 events only)               │
│  ───────────────────────────────────────────────────────────── │
│  Section C — What's left (up to 3 todos)                        │
│  ───────────────────────────────────────────────────────────── │
│  Section D — Action buttons (Mark filed / Reassign / Snooze)    │
│  ───────────────────────────────────────────────────────────── │
│  Section E — Right-aligned "Open full deadline →" link          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Section A — Workflow journey

A horizontal strip of 6 stages from `OBLIGATION_STATUSES`, condensed to: `pending → waiting_on_client → blocked → review → done → completed`.

```tsx
<div className="flex items-center gap-[8px] overflow-x-auto">
  {WORKFLOW_STAGES.map((stage, idx) => {
    const isActive = stage.key === deadline.status
    const isPast = WORKFLOW_STAGES.findIndex(s => s.key === deadline.status) > idx

    return (
      <Fragment key={stage.key}>
        <div className="flex items-center gap-[6px]">
          <div
            className={cn(
              'rounded-full transition-all',
              isActive ? 'w-[12px] h-[12px] bg-[var(--ddhq-state-warning-hover)] ring-2 ring-[var(--ddhq-state-warning-solid)]'
                : isPast ? 'w-[8px] h-[8px] bg-[var(--ddhq-state-success-solid)]'
                : 'w-[8px] h-[8px] bg-[var(--ddhq-divider-regular)]',
            )}
          />
          <span
            className={cn(
              'text-[11px] font-medium whitespace-nowrap',
              isActive ? 'text-[var(--ddhq-state-warning-text)] font-semibold'
                : isPast ? 'text-[var(--ddhq-text-tertiary)]'
                : 'text-[var(--ddhq-text-muted)] opacity-60',
            )}
          >
            {stage.label}
          </span>
        </div>
        {idx < WORKFLOW_STAGES.length - 1 && (
          <div className="w-[16px] h-px bg-[var(--ddhq-divider-subtle)]" />
        )}
      </Fragment>
    )
  })}
</div>
```

Where:

```ts
// Place this constant in apps/app/src/features/obligations/queue/components/DeadlineRow.tsx
const WORKFLOW_STAGES = [
  { key: 'pending', label: 'Not started' },
  { key: 'waiting_on_client', label: 'Waiting on client' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'review', label: 'In review' },
  { key: 'done', label: 'Filed' },
  { key: 'completed', label: 'Completed' },
] as const satisfies ReadonlyArray<{ key: ObligationStatus, label: string }>
```

### 4.4 Section B — Recent activity (last 2 events)

Use the activity feed shape that already exists in `apps/app/src/features/obligations/detail/` (find via `rg 'activity' apps/app/src/features/obligations/detail/`). The simplified inline version:

```tsx
<div className="flex flex-col gap-[8px]">
  {events.slice(0, 2).map(event => (
    <div key={event.id} className="flex items-start gap-[10px]">
      <div className={cn(
        'w-[8px] h-[8px] rounded-full mt-[6px]',
        toneClass(event.tone),  // 'accent' | 'warning' | 'success' | 'muted'
      )} />
      <div className="flex-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[var(--ddhq-text-primary)]">
          {event.title}
        </span>
        <span className="text-[11px] text-[var(--ddhq-text-muted)]">
          {event.actorName} · {formatRelative(event.timestamp)}
        </span>
      </div>
    </div>
  ))}
</div>
```

Where `events` comes from `trpc.obligations.getRecentActivity.useQuery({ obligationId, limit: 2 })`. **CHECK FIRST** whether this procedure exists at `apps/app/src/server/routers/obligations.ts` — if not, see §11 "Backend dependencies."

### 4.5 Section C — What's left (up to 3 todos)

```tsx
<div className="flex items-center gap-[12px] flex-wrap">
  {todos.slice(0, 3).map(todo => (
    <div key={todo.id} className="flex items-center gap-[6px]">
      {todo.done
        ? <SquareCheck size={16} className="text-[var(--ddhq-state-success-solid)]" />
        : <Square size={16} className="text-[var(--ddhq-divider-regular)]" />
      }
      <span className={cn(
        'text-[12px] font-medium',
        todo.done
          ? 'text-[var(--ddhq-text-tertiary)] line-through'
          : 'text-[var(--ddhq-text-primary)]',
      )}>
        {todo.label}
      </span>
    </div>
  ))}
  {todos.length > 3 && (
    <span className="text-[12px] text-[var(--ddhq-text-tertiary)]">
      +{todos.length - 3} more
    </span>
  )}
</div>
```

`todos` may not exist as a separate entity. If `prepStage` / `reviewStage` from `ObligationInstancePublicSchema` are used as the source, derive todos from those. See §11.

### 4.6 Section D — Action buttons

```tsx
<div className="flex items-center gap-[8px]">
  <Button
    variant="primary"
    size="sm"
    disabled={!canEdit || deadline.status === 'done' || deadline.status === 'completed'}
    onClick={handleMarkFiled}
  >
    <Check size={14} />
    Mark filed
  </Button>

  <Button
    variant="outline"
    size="sm"
    disabled={!canEdit}
    onClick={handleReassign}
  >
    <UserRoundCog size={14} />
    Reassign
  </Button>

  <Button
    variant="ghost"
    size="sm"
    disabled={!canEdit}
    onClick={handleSnooze}
  >
    <AlarmClock size={14} />
    Snooze
  </Button>
</div>
```

Each handler calls an existing mutation:

- `handleMarkFiled` → `trpc.obligations.updateStatus.useMutation({ obligationId, status: 'done' })`
- `handleReassign` → opens a popover with assignee picker; on select calls `trpc.obligations.assign.useMutation({ obligationId, assigneeId })`
- `handleSnooze` → opens a date picker; on select calls `trpc.obligations.snooze.useMutation({ obligationId, snoozedUntil: ms })`

**VERIFY** these mutations exist in `apps/app/src/server/routers/obligations.ts`. If snooze doesn't exist, see §11.

### 4.7 Section E — Open full link

```tsx
<div className="flex justify-end pt-[8px] border-t border-[var(--ddhq-divider-subtle)]">
  <Link
    to={deadlineDetailHref({ obligationId: deadline.id, tab: 'summary' })}
    className="flex items-center gap-[5px] text-[12px] font-semibold text-[var(--ddhq-state-accent-solid)] hover:underline"
  >
    Open full deadline
    <ArrowUpRight size={12} />
  </Link>
</div>
```

### 4.8 What is NOT in the expansion (explicitly excluded)

The inline expansion is **deliberately less than the full page**. Do NOT include:

- Penalty exposure card (full page only)
- Materials tab content
- Record tab content
- Audit tab content (linked to via Open full)
- Full activity timeline (limited to last 2 events)
- Notes / comments
- Related rules

**Principle:** inline expansion answers *"what's going on"*; full page answers *"how do I work on it"*.

---

## 5. URL state contract

All interactive state lives in URL search params via `nuqs`.

### 5.1 URL params introduced/used by this spec

| Param | Type | Example | Effect |
|---|---|---|---|
| `expanded` | `string` (obligation ID) | `?expanded=ob_abc123` | Auto-expand this row on load (only in `inline-expand` mode) |
| `status` | `string[]` (existing) | `?status=waiting_on_client,blocked` | Queue filters by status; updated when user clicks a status pill |
| `assigneeNames` | `string[]` (existing) | `?assigneeNames=Mira+Robinson` | Queue filters by assignee; updated when user clicks an owner |
| `sort` | enum (existing) | `?sort=smart_priority` | Sort order; existing param, do not change |

**Implementation in clients route:**

```tsx
// apps/app/src/routes/clients.$clientId.tsx
import { parseAsString, parseAsArrayOf, useQueryStates } from 'nuqs'

const [filters, setFilters] = useQueryStates({
  expanded: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString).withDefault([]),
  assigneeNames: parseAsArrayOf(parseAsString).withDefault([]),
})

const handleExpand = (id: string) => setFilters({ expanded: id })
const handleCollapse = () => setFilters({ expanded: '' })
const handleFilterByStatus = (status: string) =>
  setFilters({ status: filters.status.includes(status) ? filters.status.filter(s => s !== status) : [...filters.status, status] })
```

### 5.2 Accordion default

Only ONE row is expanded at a time. Opening row B closes row A. This is enforced because `expanded` is a single string (not array). To allow multi-expand later, change to `parseAsArrayOf(parseAsString)` — defer that to v1.1.

### 5.3 Navigation contract

```
USER: at /clients/hudson-wells?tab=deadlines
USER: clicks Form 1065 title
  → router.navigate({
       to: deadlineDetailHref({ obligationId, tab: 'summary' }),
     })
URL: /deadlines/form-1065-hw-2026/summary
BREADCRUMB on detail page: should show return path
  → Read referrer from React Router state, OR check document.referrer,
    OR pass via navigate({ state: { from: '/clients/...' } })

USER: clicks browser back
URL: /clients/hudson-wells?tab=deadlines (state preserved by nuqs)
SCROLL: preserved by Tanstack Router's default scroll restoration
EXPANSION: if URL had ?expanded=, restored
```

### 5.4 Breadcrumb on `/deadlines/:ref` — show the return path

The detail page breadcrumb should read:

- If came from `/clients/:id`: `Clients / {Client Name} / {Form Title}`
- If came from `/deadlines`: `Deadlines / {Form Title}`
- If came from `/dashboard`: `Today / {Form Title}`

**Implementation:** pass referrer hint via `navigate({ state: { from: 'client', clientId } })` in the click handler. Read in `deadline-detail.tsx` via `useLocation().state`. If `state.from` is `'client'`, render the client crumb.

---

## 6. Keyboard interaction (full a11y contract)

### 6.1 Tab order within a row

```
1. Row body (focus on <article tabIndex={0}>)
2. Title link
3. Form-tag tile
4. Status pill
5. Owner avatar/name
6. Chevron toggle (inline-expand mode only)
```

### 6.2 Key bindings

| Key | Where | Behavior |
|---|---|---|
| `Tab` / `Shift+Tab` | global | Move focus between rows / between targets within row |
| `Enter` | row focused | Navigate to `/deadlines/:ref/summary` |
| `Space` | row focused | Mode-dependent: `inline-expand` toggles accordion; other modes navigate |
| `Escape` | row expanded | Collapse, return focus to row body |
| `↑` / `↓` | row focused | Focus previous/next row |
| `→` | row focused | Expand (only in inline-expand mode) |
| `←` | row focused, expanded | Collapse |
| `Cmd+Enter` (Mac) / `Ctrl+Enter` (Win) | row focused | Open in new tab |

### 6.3 Implementation skeleton

```tsx
const handleKeyDown = (event: React.KeyboardEvent) => {
  if (event.target !== event.currentTarget) return  // bubbled from child; ignore

  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      if (event.metaKey || event.ctrlKey) {
        window.open(deadlineDetailHref({ obligationId: deadline.id, tab: 'summary' }), '_blank')
      } else {
        navigate({ to: deadlineDetailHref({ obligationId: deadline.id, tab: 'summary' }) })
      }
      break
    case ' ':
    case 'Spacebar':
      event.preventDefault()
      if (mode === 'inline-expand') {
        isExpanded ? onCollapse?.(deadline.id) : onExpand?.(deadline.id)
      } else {
        navigate({ to: deadlineDetailHref({ obligationId: deadline.id, tab: 'summary' }) })
      }
      break
    case 'ArrowRight':
      if (mode === 'inline-expand' && !isExpanded) {
        event.preventDefault()
        onExpand?.(deadline.id)
      }
      break
    case 'ArrowLeft':
      if (mode === 'inline-expand' && isExpanded) {
        event.preventDefault()
        onCollapse?.(deadline.id)
      }
      break
    case 'Escape':
      if (mode === 'inline-expand' && isExpanded) {
        event.preventDefault()
        onCollapse?.(deadline.id)
      }
      break
    case 'ArrowDown':
    case 'ArrowUp':
      // Let parent handle focus management
      // (Parent uses React's onFocus to track current focused row index)
      break
  }
}
```

### 6.4 Focus ring (CSS)

```css
.deadline-row {
  outline: 2px solid transparent;
  outline-offset: -2px;
}
.deadline-row:focus-visible {
  outline-color: var(--ddhq-state-accent-solid);
}
```

### 6.5 ARIA contract (exact attributes)

```tsx
<article
  role="article"
  aria-expanded={mode === 'inline-expand' ? isExpanded : undefined}
  aria-labelledby={`deadline-title-${deadline.id}`}
  aria-describedby={`deadline-meta-${deadline.id}`}
  tabIndex={0}
>
  <button
    id={`deadline-title-${deadline.id}`}
    aria-label={`Open ${deadline.formCode} ${deadline.taxType} for ${deadline.clientName} detail page`}
  >
    {deadline.title}
  </button>

  <span id={`deadline-meta-${deadline.id}`} className="sr-only">
    Status: {statusLabel}. Owned by {assigneeName ?? 'unassigned'}.
    Due {formatRelative(deadline.currentDueDate)}.
  </span>

  <StatusChip
    aria-label={`Filter by status: ${statusLabel}`}
    role="button"
  />

  <AssigneeAvatar
    aria-label={`Filter by ${assigneeName ?? 'unassigned'}`}
    role="button"
  />

  {isExpanded && (
    <section
      role="region"
      aria-labelledby={`deadline-title-${deadline.id}`}
    >
      {/* expansion content */}
    </section>
  )}
</article>
```

### 6.6 Screen reader announcements

On Tab to row: `"Form 1099-NEC for Hudson Wells. Status Waiting on client. Owned by Mira Robinson. Due Mar 19, in 12 days. Press Enter to open detail, Space to expand."`

On expand: `"Expanded. Workflow stage: Waiting on client. Last activity: Reminder sent to client, yesterday."`

---

## 7. Edge cases — state-specific behavior

For each of the 10 backend statuses, this is the row appearance + expansion + click destination.

| Backend status | Row chrome | Status pill | Expansion shows | Title click → tab |
|---|---|---|---|---|
| `pending` | default `bg-default` | "Not started" — `bg-subtle` + `text-tertiary` | Empty workflow strip; 0 events; `Start working →` CTA | `summary` |
| `in_progress` | default | "In progress" — `state-accent-hover` + `text-accent-solid` | Workflow active at "Not started" or "In progress" branch (custom); 2 events | `summary` |
| `waiting_on_client` | default | "Waiting on client" — `state-warning-hover` + `text-warning` | Active stage = waiting; last reminder shown; `Send another reminder` action | `summary` |
| `review` | default | "In review" — `state-accent-hover` + `text-accent-solid` | Active stage = In review; reviewer name shown | `summary` |
| `blocked` | default | "Blocked" — `state-destructive-hover` + `text-destructive` | Active stage = Blocked; blocking-items list inline; `Unblock` action | `summary` |
| `done` | dim (opacity 0.85) | "Filed" — `state-success-hover` + `text-success` | Filing confirmation #; `Undo (7d)` action **only if** within 7 days of `updatedAt` | `summary` |
| `paid` | dim | "Paid" — `state-success-hover` + `text-success` | Payment confirmation; similar to `done` | `summary` |
| `extended` | default | "Extended" — `state-warning-hover` + `text-warning` | Extension details + new due date | `extension` |
| `not_applicable` | dim, dashed border | "N/A" — `bg-subtle` + `text-muted` | Explanation: "Activate this obligation from the rule library" | `summary` |
| `completed` | dim (opacity 0.7) | "Completed" — `state-success-hover` + `text-success` | Activity summary only; no actions | `summary` |

### 7.1 Overdue overlay (orthogonal to status)

Computed from `deadline.currentDueDate < now()` and `status !in ['done', 'paid', 'completed', 'not_applicable']`. When overdue:

- Add `border-left: 3px solid var(--ddhq-state-destructive-solid)` to the row
- Add a `<AlertTriangle>` icon to the left of the form tag
- In expansion, surface penalty exposure inline (otherwise hidden): `deadline.estimatedExposureCents` rendered as currency

### 7.2 Permission cases (use `canEdit` prop)

| `canEdit` value | Behavior |
|---|---|
| `true` | All actions in expansion available |
| `false` | `Mark filed`, `Reassign`, `Snooze`, `Send reminder` buttons hidden. Expansion is read-only. Title still navigates. |

Derive `canEdit` from existing role check helper — likely at `apps/app/src/features/auth/usePermissions.ts` or similar. **Verify location** before assuming.

### 7.3 Multi-select mode

When the parent list has `multiSelectMode={true}`:

- A checkbox renders at the left of each row (use existing checkbox from TanStack Table)
- Row body click TOGGLES selection (does not expand or navigate)
- Title click STILL navigates (escape hatch)
- Chevron click STILL toggles expansion (only in inline-expand mode)
- Shift+Click on row body extends range selection

---

## 8. Context-specific implementation (the 5 surfaces)

### 8.1 `/clients/:clientId` (Deadlines tab)

**File to edit:** `apps/app/src/routes/clients.$clientId.tsx` (or wherever `ClientDetailWorkspace` renders the deadlines tab).

**Implementation:**

```tsx
const [filters, setFilters] = useQueryStates({
  expanded: parseAsString.withDefault(''),
  status: parseAsArrayOf(parseAsString).withDefault([]),
  assigneeNames: parseAsArrayOf(parseAsString).withDefault([]),
})

const { data: deadlines } = trpc.obligations.queueList.useQuery({
  filters: {
    clientIds: [params.clientId],
    status: filters.status.length ? filters.status : undefined,
    assigneeNames: filters.assigneeNames.length ? filters.assigneeNames : undefined,
  },
})

return (
  <div className="flex flex-col">
    {deadlines.map(d => (
      <DeadlineRow
        key={d.id}
        deadline={d}
        mode="inline-expand"
        isExpanded={filters.expanded === d.id}
        canEdit={canEdit}
        onExpand={(id) => setFilters({ expanded: id })}
        onCollapse={() => setFilters({ expanded: '' })}
        onFilterByStatus={(status) =>
          setFilters({
            status: filters.status.includes(status)
              ? filters.status.filter(s => s !== status)
              : [...filters.status, status],
          })
        }
        onFilterByAssignee={(_id, name) =>
          setFilters({
            assigneeNames: filters.assigneeNames.includes(name)
              ? filters.assigneeNames.filter(n => n !== name)
              : [...filters.assigneeNames, name],
          })
        }
      />
    ))}
  </div>
)
```

### 8.2 `/deadlines` (queue list)

**File to edit:** `apps/app/src/routes/obligations.tsx`

**Refactor:** swap the inline column rendering for `<DeadlineRow mode="navigate">`. Preserve existing TanStack Table sorting/filtering/multi-select via the same callbacks.

**Important:** this is the largest refactor. Do it last (after `/clients` works). It's a pure migration — no behavior change for the user.

### 8.3 `/dashboard` (`/today`)

**File to edit:** `apps/app/src/routes/dashboard.tsx`

**Implementation:** wherever upcoming deadlines render (find via `rg 'obligations' apps/app/src/routes/dashboard.tsx`), replace with:

```tsx
<DeadlineRow
  deadline={d}
  mode="navigate"
  canEdit={canEdit}
  onFilterByStatus={...}
  onFilterByAssignee={...}
/>
```

### 8.4 `/alerts/:alertId` (AffectedClients table)

**File to edit:** `apps/app/src/features/alerts/components/AffectedClientsTable.tsx`

**Note:** Today's alerts table doesn't reference deadline rows. This spec ADDS that linkage. Defer to v1.1 — not blocking for the current spec.

### 8.5 `/audit-log`

**File to edit:** when an audit entry references an obligation, the link should use:

```tsx
<DeadlineRow
  deadline={d}
  mode="navigate-to-audit"
  // ...
/>
```

OR a simpler `<Link>` directly. The full `<DeadlineRow>` may be overkill for an audit timeline; consider just rendering form code + title with a `<Link>` to `deadlineDetailHref({ obligationId, tab: 'audit' })`.

---

## 9. Anti-patterns (refuse these in code review)

1. **Multiple rows expanded simultaneously by default** — accordion is canonical. Multi-expand requires explicit Shift+Click in v1.1.
2. **Click row body = always navigate (no inline expand option)** — on `/clients/:clientId`, this breaks the browse model. Use the `mode` prop.
3. **Status pill or assignee avatar is read-only** — they are lateral filter affordances.
4. **Inline expansion duplicates the full page** — expansion answers "what's going on"; full page answers "how do I work on it."
5. **No keyboard support** — every click target must have a keyboard equivalent. See §6.2.
6. **No URL state** — `?expanded=`, `?status=`, `?assigneeNames=` must be deep-linkable. Use `nuqs`.
7. **Hand-built URLs** — always use `deadlineDetailHref()` from `deadline-detail-url.ts`. Never assemble paths inline.
8. **Backend mutations from the row that don't already exist** — see §11 for the list of allowed mutations. If a needed mutation is missing, surface it in §11 and defer.
9. **Wrapping `<DeadlineRow>` in `<Link>`** — Link breaks the click handler's mode-aware logic. Use the internal `navigate` call, not a wrapping link.
10. **Mutating state via `window.location` or `history.pushState`** — always use the router and `nuqs`.

---

## 10. Smoke test recipes (manual QA before PR merge)

### 10.1 Inline expand on `/clients`

```
SETUP: Seed a client with ≥3 deadlines in different statuses.

1. Navigate to /clients/{seed-client-id}?tab=deadlines
   EXPECT: deadline list renders, no row expanded

2. Click row 1 body
   EXPECT: row 1 expands inline (workflow strip + 2 events + 3 todos + actions + Open full link)
   EXPECT: URL becomes /clients/{id}?tab=deadlines&expanded={row1-id}

3. Click row 2 body
   EXPECT: row 1 collapses, row 2 expands
   EXPECT: URL becomes /clients/{id}?tab=deadlines&expanded={row2-id}

4. Browser back
   EXPECT: row 1 re-expanded, row 2 collapsed
   EXPECT: URL reverts

5. Refresh page (Cmd+R) while row 2 expanded
   EXPECT: page reloads with row 2 still expanded

6. Click "Open full deadline →" link
   EXPECT: navigates to /deadlines/{row2-id}/summary
   EXPECT: breadcrumb shows "Clients / {Client Name} / {Form Title}"

7. Browser back from detail page
   EXPECT: returns to /clients/{id}?tab=deadlines&expanded={row2-id}
   EXPECT: row 2 still expanded
```

### 10.2 Filter by status pill click

```
1. On /clients/{id}?tab=deadlines, click a "Waiting on client" status pill on any row
   EXPECT: URL becomes /clients/{id}?tab=deadlines&status=waiting_on_client
   EXPECT: queue refilters to show only Waiting on client deadlines

2. Click the same pill again on a visible row
   EXPECT: filter removed, URL becomes /clients/{id}?tab=deadlines
   EXPECT: queue shows all again

3. Click a "Blocked" pill
   EXPECT: URL: status=blocked
4. Click a "Waiting on client" pill
   EXPECT: URL: status=blocked,waiting_on_client (additive)
   EXPECT: queue shows both
```

### 10.3 Filter by assignee click

```
1. Click Mira Robinson's avatar/name on row 3
   EXPECT: URL: ?assigneeNames=Mira+Robinson
   EXPECT: queue refilters
```

### 10.4 Keyboard navigation

```
1. Tab into the deadline list
   EXPECT: first row gets focus ring (accent outline)
2. Press Space
   EXPECT: row expands inline (URL updates)
3. Press Esc
   EXPECT: row collapses, URL updates
4. Tab to next focusable
   EXPECT: focus moves to title link of row 1
5. Press Enter
   EXPECT: navigates to /deadlines/{id}/summary
6. Browser back, focus on row 1
7. Press Cmd+Enter (Mac)
   EXPECT: opens detail in new tab
```

### 10.5 Cross-surface consistency

```
1. Visit /deadlines (queue list)
   EXPECT: rows render via <DeadlineRow mode="navigate">
   EXPECT: click row body → navigates to /deadlines/:ref/summary (existing behavior preserved)

2. Visit /dashboard
   EXPECT: upcoming deadlines render via <DeadlineRow mode="navigate">
   EXPECT: click → navigates to detail

3. Visit /clients/{id}?tab=deadlines
   EXPECT: rows render via <DeadlineRow mode="inline-expand">
   EXPECT: click → expands inline
```

### 10.6 Visual regression — pixel diff vs Pencil

```
1. Open Pencil node m9FwQ (Federal Form 1099-NEC row)
2. Take screenshot
3. Render the same row in the app under /clients/{id}?tab=deadlines (use seed data matching)
4. Take screenshot
5. Diff — EXPECT pixel-equivalent layout (paddings · token colors · gap · status pill chrome)
```

---

## 11. Backend dependencies (DEFER if missing — do NOT add)

This spec assumes the following tRPC procedures already exist. **Before implementing each section, verify their existence with `rg` in `apps/app/src/server/routers/obligations.ts`.** If missing, ADD A NOTE to the dev-log entry and DEFER that section. Do not add new mutations.

| Procedure | Used for | If missing |
|---|---|---|
| `obligations.queueList` | Fetching deadlines on `/clients` and `/today` | Required — should exist; spec depends on it |
| `obligations.updateStatus` | Mark filed action | Required for inline action; if missing, hide Mark filed button |
| `obligations.assign` | Reassign action | Required; if missing, hide Reassign button |
| `obligations.snooze` | Snooze action | OPTIONAL; if missing, hide Snooze button (do NOT add new mutation) |
| `obligations.getRecentActivity` | Section B inline expansion | If missing, OPTIONAL — render "Activity available on full page →" link in expansion instead |
| `obligations.getTodos` | Section C inline expansion | If missing, OPTIONAL — derive from `prepStage` / `reviewStage` on the obligation, OR skip the section |

### 11.1 Allowed contract usage

You may READ:

- `ObligationInstancePublicSchema` (all fields)
- `ObligationQueueRowSchema` (all fields)
- `ObligationQueueListInputSchema` (filter input)

You may NOT:

- Add new fields to any schema
- Add new mutations
- Modify existing input schemas
- Change `OBLIGATION_STATUSES` enum

### 11.2 If a feature requires backend work

Add a TODO comment with reference to this spec section, e.g.:

```tsx
// TODO(deadline-row-interaction §4.5): Snooze action requires
// obligations.snooze mutation. Currently hidden because mutation doesn't exist.
// See docs/Design/deadline-row-interaction.md §11.
```

Open a separate ticket. Do not add backend code.

---

## 12. File-by-file implementation order

Phased to minimize merge risk. Each phase is a separate PR.

### Phase 1 — Create the shared component (no behavior change yet)

**Files:**
- `apps/app/src/features/obligations/queue/components/DeadlineRow.tsx` (NEW)
- `apps/app/src/features/obligations/queue/components/DeadlineRowExpansion.tsx` (NEW)
- `apps/app/src/features/obligations/queue/components/__tests__/DeadlineRow.test.tsx` (NEW)

**Behavior:** component exists, can render rows, all modes implemented. Not used anywhere yet.

**Done-when:**
- [ ] Component renders all 5 modes correctly in Storybook (if available) OR manual smoke
- [ ] All 7 click targets work (no console errors)
- [ ] Keyboard nav works per §6
- [ ] ARIA attributes pass `axe-core` audit
- [ ] All 10 status enum values render correctly
- [ ] Overdue overlay renders when applicable
- [ ] Inline expansion includes all 5 sections (or marks deferred ones with TODO)

### Phase 2 — Use it on `/clients/:clientId` (NEW surface — lowest risk)

**Files:**
- `apps/app/src/routes/clients.$clientId.tsx` (or `ClientDetailWorkspace.tsx`)

**Behavior:** deadlines tab on client detail uses `<DeadlineRow mode="inline-expand">`. URL state via `nuqs`.

**Done-when:**
- [ ] All smoke tests in §10.1, §10.2, §10.3 pass
- [ ] No regression on rest of client detail page

### Phase 3 — Use it on `/dashboard` (Today)

**Files:**
- `apps/app/src/routes/dashboard.tsx`

**Behavior:** upcoming-deadlines list uses `<DeadlineRow mode="navigate">`.

**Done-when:**
- [ ] Dashboard still renders all existing widgets
- [ ] Click on row navigates to detail
- [ ] Smoke test §10.5 step 2 passes

### Phase 4 — Migrate `/deadlines` queue (RISKY — do last)

**Files:**
- `apps/app/src/routes/obligations.tsx`
- `apps/app/src/features/obligations/queue/components/use-obligation-queue-columns.tsx`

**Behavior:** swap column-based row rendering for `<DeadlineRow mode="navigate">` or `<DeadlineRow mode="drawer">` per user preference.

**Done-when:**
- [ ] All existing queue functionality preserved (sorting, filtering, multi-select, bulk actions)
- [ ] Visual diff vs production: zero regression
- [ ] All existing smoke tests on `/deadlines` pass
- [ ] Smoke test §10.5 step 1 passes

### Phase 5 — Polish + edge cases

**Files:** various.

**Behavior:** wire up filter pills, sort affordance polish, overdue overlay tweaks per §7.

---

## 13. Open product decisions (defaults in place)

| Question | Default | Owner | Confirmed? |
|---|---|---|---|
| Should Shift+Click enable multi-expand or strict accordion? | Strict accordion (single string in URL) | Product | ⚠️ |
| Snooze default duration when picker opens? | 3 days | Product | ⚠️ |
| Inline reassign popover or modal? | Popover (lighter weight) | Confirmed | ✅ |
| Should overdue rows auto-expand on page load? | No (too aggressive) | Confirmed | ✅ |
| Form-tag tile click — filter or navigate? | Navigate (paired with title) | Confirmed | ✅ |
| Show penalty exposure inline on non-overdue rows? | No (overdue only) | Confirmed | ✅ |
| Allow Undo (7d) on `done`/`paid` status from inline expansion? | Yes — calls `obligations.updateStatus` with previous status | Engineering check needed | ⚠️ |

---

## 14. Component prop reference (copy-paste ready)

```ts
import type { ObligationQueueRow } from '@/contracts/obligation-queue'
import type { ObligationStatus } from '@/contracts/obligations'

export type DeadlineRowMode =
  | 'navigate'
  | 'inline-expand'
  | 'drawer'
  | 'navigate-to-audit'

export interface DeadlineRowProps {
  deadline: ObligationQueueRow
  mode: DeadlineRowMode
  isExpanded?: boolean
  isSelected?: boolean
  isActive?: boolean
  multiSelectMode?: boolean
  canEdit?: boolean
  onExpand?: (obligationId: string) => void
  onCollapse?: (obligationId: string) => void
  onSelect?: (obligationId: string, selected: boolean) => void
  onFilterByStatus?: (status: ObligationStatus) => void
  onFilterByAssignee?: (assigneeId: string, assigneeName: string) => void
  onOpenDrawer?: (obligationId: string) => void
}
```

---

## 15. Cross-references

- `docs/Design/rule-library-review-flow.md` — uses similar master-detail + row-click patterns
- `docs/dev-log/2026-06-10-design-handoff-index.md` — handoff index with React scaffolding patterns
- `docs/dev-log/2026-06-09-alert-deadline-rule-detail-amendments.md` — execution brief for the deadline detail page
- `packages/db/src/schema/obligations.ts:189-206` — source of truth for status enum
- `packages/contracts/src/obligation-queue.ts:96-100` — `ObligationQueueRow` row shape
- `apps/app/src/features/obligations/deadline-detail-url.ts:51-78` — URL helpers (USE THESE)
- `apps/app/src/components/AssigneeAvatar.tsx:75-177` — owner avatar primitive
- `apps/app/src/features/obligations/queue/components/primitives.tsx:43-135` — due-date pill primitive
- `apps/app/src/features/obligations/status-control.tsx` — status → label + icon mapping

---

## 16. Definition of done (whole spec)

When ALL of these are true:

- [ ] `<DeadlineRow>` component exists at `apps/app/src/features/obligations/queue/components/DeadlineRow.tsx`
- [ ] Component supports all 4 modes (`navigate`, `inline-expand`, `drawer`, `navigate-to-audit`)
- [ ] All 7 click targets in §2 work
- [ ] All 6 keyboard interactions in §6.2 work
- [ ] All 10 `OBLIGATION_STATUSES` enum values render correctly per §7
- [ ] URL state via `nuqs` for `?expanded=`, `?status=`, `?assigneeNames=` on `/clients/:clientId`
- [ ] `/clients/:clientId?tab=deadlines` uses `mode='inline-expand'`
- [ ] `/dashboard` uses `mode='navigate'`
- [ ] `/deadlines` queue list migrated to `<DeadlineRow mode='navigate'>` with zero behavior regression
- [ ] All §10 smoke tests pass
- [ ] No new backend mutations added
- [ ] No `OBLIGATION_STATUSES` enum changes
- [ ] No new fields in `ObligationInstancePublicSchema`
- [ ] All open product decisions in §13 resolved or explicitly deferred
- [ ] Dev-log entry written per project convention
- [ ] PR description lists Pencil node IDs referenced + cross-doc links
- [ ] Visual diff vs Pencil `m9FwQ` is pixel-equivalent in row chrome
- [ ] `axe-core` accessibility audit passes for the component

If any of these is false, the spec is NOT done — surface the gap in the dev-log entry.
