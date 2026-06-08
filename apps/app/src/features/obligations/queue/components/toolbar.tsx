// Toolbar / chrome components for the obligation queue route (/deadlines).
// Extracted from routes/obligations.tsx.
import { nextHeaderSort } from '../helpers'
import { EmptyState } from '@/components/patterns/empty-state'
import { SearchInput } from '@/components/primitives/search-input'
import { initialsFromName } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { type MemberAssigneeOption, type ObligationQueueSort } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  CalendarDaysIcon,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  SearchIcon,
  UserRoundIcon,
  XIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode } from 'react'

export function ObligationQueueSortableHeader({
  label,
  children,
  sort,
  ascSort,
  descSort,
  firstSort,
  sortLabel,
  onSortChange,
}: {
  label: ReactNode
  children?: ReactNode
  sort: ObligationQueueSort
  ascSort: ObligationQueueSort
  descSort: ObligationQueueSort
  firstSort: ObligationQueueSort
  sortLabel: string
  onSortChange: (sort: ObligationQueueSort) => void
}) {
  const direction = sort === ascSort ? 'asc' : sort === descSort ? 'desc' : false

  // 2026-05-25 (Yuqi sort-arrow audit): the old sort indicator was a
  // ghost Button with `ArrowUpDown` / `ArrowUp` / `ArrowDown` icons —
  // bold arrow glyphs that read as navigation controls, not subtle
  // sort hints. Yuqi flagged the chrome as "出戏" — too prominent for
  // every column header.
  //
  // New shape:
  //   - Header label + chevron are now ONE clickable region (the
  //     sort pill, not a separate icon button).
  //   - The range filter trigger stays a sibling icon button. Keeping
  //     sort and filter as siblings avoids invalid nested button
  //     markup when this header renders inside a dropdown trigger.
  //   - Unsorted columns render a faint ChevronsUpDown so the
  //     "this is sortable" affordance is always visible —
  //     previously the column looked inert until you clicked,
  //     which Yuqi flagged: "column sort is honest — chevrons
  //     are faint until you sort, then show direction" (Yuqi
  //     /deadlines redesign). The faint icon sits at
  //     `text-text-tertiary/40` so it disappears against busy
  //     content but resolves into a "click me to sort" hint on
  //     scan.
  //   - Sorted columns render a small ChevronUp / ChevronDown
  //     inline in the accent color — quieter than the bold arrows
  //     and matches the chevron vocabulary used elsewhere
  //     (dropdowns, breadcrumbs, drawer triggers).
  const SortIcon = direction === 'asc' ? ChevronUp : direction === 'desc' ? ChevronDown : null

  return (
    <span className="-mx-1 inline-flex min-w-0 items-center gap-0.5">
      <button
        type="button"
        aria-label={sortLabel}
        aria-pressed={direction !== false}
        data-active={direction !== false ? true : undefined}
        onClick={() =>
          onSortChange(nextHeaderSort({ currentSort: sort, ascSort, descSort, firstSort }))
        }
        className={cn(
          'inline-flex min-w-0 items-center gap-0.5 rounded px-1 py-0.5 text-left',
          // 2026-05-26 (Yuqi /deadlines sixty-fifth pass #2/#3): sortable
          // button now matches the new TableHead canonical (text-sm
          // sentence-case font-medium text-secondary). Previously the
          // sortable header was rendering as a quieter `text-text-
          // tertiary` than the row content — Yuqi flagged it as
          // "wrong colour" because the column header read as fainter
          // than the data it labeled. Bumping to text-secondary +
          // dropping the uppercase/tracking caption treatment makes
          // sortable and non-sortable headers indistinguishable in
          // weight.
          'text-sm font-medium normal-case tracking-normal',
          'text-text-secondary hover:text-text-primary',
          'data-[active=true]:text-text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        )}
      >
        <span className="truncate">{label}</span>
        {SortIcon ? (
          <SortIcon className="size-3 shrink-0 text-text-accent" aria-hidden />
        ) : (
          <ChevronsUpDown
            className="size-3 shrink-0 text-text-tertiary/40 transition-colors group-hover:text-text-tertiary"
            aria-hidden
          />
        )}
      </button>
      {children}
    </span>
  )
}

// 2026-05-26 (Yuqi sixty-sixth pass — Unassigned `?` quick-pick):
// the dashed-outline `?` in the Owner column is now a real
// DropdownMenu trigger. Selecting a teammate calls
// `clients.bulkUpdateAssignee` with a single-id payload — the
// assignment lives on the CLIENT (not the obligation) per the
// current schema, so picking a teammate on one row assigns ALL
// of that client's deadlines to them. The footer copy spells
// that out so the scope isn't a surprise.
//
// Pattern matches the ClientFactsWorkspace H1 owner-pill picker
// (same member list, same radio-group, same stale-assignee
// handling). Kept local to obligations.tsx since the trigger
// chrome (dashed `?`) is specific to this surface.

export function AssigneeQuickPicker({
  clientName,
  currentAssigneeId,
  currentUserName,
  assignableMembers,
  disabled,
  onChange,
}: {
  clientName: string
  currentAssigneeId: string | null
  currentUserName: string | null
  assignableMembers: readonly MemberAssigneeOption[]
  disabled: boolean
  onChange: (assigneeId: string | null) => void
}) {
  const { t } = useLingui()
  const triggerLabel = t`Assign owner for ${clientName}`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={triggerLabel}
            title={triggerLabel}
            disabled={disabled}
            // stopPropagation prevents the row's onClick from
            // also firing (which would open the obligation
            // drawer behind the picker — confusing UX).
            onClick={(event) => event.stopPropagation()}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-divider-regular text-sm text-text-tertiary outline-none transition-colors hover:border-divider-strong hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50"
          >
            ?
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuRadioGroup
          value={currentAssigneeId ?? '__unassigned__'}
          onValueChange={(value) => {
            const next = value === '__unassigned__' ? null : value
            if (next === currentAssigneeId) return
            onChange(next)
          }}
        >
          {/* 2026-05-27 (Yuqi "assign是坏的" round 2): the actual
              MenuGroupContext crash on this picker was the
              DropdownMenuLabel rendered as a direct child of
              DropdownMenuContent — Base UI's MenuPrimitive.GroupLabel
              calls useMenuGroupRootContext() and throws when there
              is no <Menu.Group> / <Menu.RadioGroup> ancestor.
              bb12a8f4 moved the empty-state Item out (which Base UI
              tolerates either way) but left the Label outside the
              RadioGroup — the crash kept firing. Placing the Label
              INSIDE the RadioGroup gives it the context it needs
              and preserves the "Assign owner" header. */}
          <DropdownMenuLabel className="text-caption-xs uppercase tracking-wide text-text-tertiary">
            <Trans>Assign owner</Trans>
          </DropdownMenuLabel>
          <DropdownMenuRadioItem value="__unassigned__">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-background-subtle text-text-tertiary">
              <UserRoundIcon className="size-3" aria-hidden />
            </span>
            <span>
              <Trans>Unassigned</Trans>
            </span>
          </DropdownMenuRadioItem>
          {assignableMembers.map((member) => {
            const isCurrentUser =
              currentUserName !== null &&
              member.name.trim().toLowerCase() === currentUserName.toLowerCase()
            return (
              <DropdownMenuRadioItem key={member.assigneeId} value={member.assigneeId}>
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full text-caption-xs font-semibold uppercase tracking-tight',
                    isCurrentUser
                      ? 'bg-state-accent-hover-alt text-text-accent'
                      : 'bg-background-subtle text-text-secondary',
                  )}
                >
                  {initialsFromName(member.name)}
                </span>
                <span className="truncate">{member.name}</span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
        {assignableMembers.length === 0 ? (
          <DropdownMenuItem
            disabled
            title={t`Invite teammates from Settings → Members to assign work`}
          >
            <span className="text-text-tertiary">
              <Trans>No teammates yet — invite from Settings</Trans>
            </span>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        {/* Scope-disclosure footer. Without this the picker reads
            as "assign this row" — but the schema only carries
            assignment at the client level, so assigning here
            propagates to every deadline for {clientName}. */}
        <div className="px-2 py-1.5 text-caption-xs leading-snug text-text-tertiary">
          <Trans>Assigns every deadline for {clientName}.</Trans>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// 2026-05-24 (critique P0): terminal-state rows shouldn't surface
// lateness as live debt. Once a row is `done` ("Filed"), `paid`
// ("Filed" on payment-track rows), or `completed`, the row is
// closed — "18 days late" alongside a "Filed" / "Completed" pill
// reads as if there's still work to do. We render a muted
// "Filed N days late" / "Filed N days early" stat instead —
// quality signal, not active red. Mirrors the same three statuses
// that `features/obligations/status-control.tsx` displays as
// "Filed" / "Completed".
//
// 2026-05-29: `extended` stays out of this terminal set. The Extension
// tab saves an internal target and the detail strip still shows that
// target as active date context, so the queue cell must not collapse
// to an em dash just because the row has an extension plan.

export function ObligationQueueSearchControl({
  inputRef,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  // 2026-05-24 (re-critique): lifted from local state to a controlled
  // prop so the route's `/` hotkey can expand the collapsed control
  // before deferring focus. The button-click expand path and the
  // hotkey path now share the same setter.
  open: boolean
  onOpenChange: (next: boolean) => void
  onChange: (next: string) => void
}) {
  const { t } = useLingui()
  const isOpen = open || value.length > 0
  const setOpen = onOpenChange
  // 2026-05-24 (useEffect audit): the previous shape attached a
  // window-style focus listener to the input ref via useEffect. The
  // Input component already exposes an `onFocus` prop — moved the
  // open-on-focus signal there, removing one useEffect violation.
  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t`Filter deadlines`}
        title={t`Filter deadlines  ·  press / to focus`}
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        className="mb-1.5 size-8 shrink-0"
      >
        <SearchIcon className="size-4" aria-hidden />
      </Button>
    )
  }
  // 2026-05-26 (Yuqi cross-product search audit): expanded state now
  // delegates to the canonical SearchInput primitive. Previously the
  // expanded state hand-rolled an h-8 Input with bespoke clear button
  // + Escape logic — which drifted from /rules/library's h-9
  // SearchInput. Now both surfaces share the exact same chrome when
  // expanded; deadlines keeps the toolbar-density collapse pattern
  // because Yuqi #2 specifically designed for it (densest table
  // surface needs room).
  return (
    <div className="relative mb-1.5 w-full md:w-56 md:flex-none">
      {/* 2026-05-26 (Yuqi step-8 data-finding audit — F-X05): placeholder
          changed "Filter clients" → "Filter deadlines" to align with
          the expanded state's ariaLabel and the collapsed-state
          aria-label. The input matches client name + obligation title
          + rule name; the prior placeholder named just one of those
          axes which understated the input's reach. */}
      <SearchInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder={t`Filter deadlines`}
        ariaLabel={t`Filter deadlines`}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (value.length === 0) setOpen(false)
        }}
      />
    </div>
  )
}

// `dotTone` (optional) renders the same status indicator dot the row
// badge uses, mirroring queue colors into the tab so the user can see
// at a glance which scope corresponds to which row tint. Omitted on
// the "All" tab (it's an aggregate, not a single status).

export function ObligationQueueScopeTab({
  label,
  count,
  active,
  onClick,
  icon: Icon,
  iconColor,
  compact = false,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  // 2026-05-25 (Yuqi status icon pass): scope tabs now lead with a
  // lucide status icon when the tab maps to a lifecycle status (the
  // 6 v2 scope tabs). `icon` is the lucide component, `iconColor`
  // is the tailwind text-color class. The "All" tab passes neither
  // and renders without a leading mark.
  // 2026-05-25 (status-pill audit §4 #8): the prior `dotTone`
  // fallback (BadgeStatusDot) was removed — icon-led badges are
  // canonical per audit §3.3, and every status-mapped tab already
  // provides an icon.
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  iconColor?: string
  compact?: boolean
}) {
  // 2026-05-26 (Yuqi inset-followups G — smooth slide transition):
  // dropped the per-tab `border-b-2` and replaced it with a single
  // shared underline rendered via `layoutId="scope-tab-underline"`.
  // Framer Motion smoothly slides the underline between tabs when a
  // new one becomes active — no more jumpy "underline disappears
  // here, reappears there" feel. Inactive tabs render a transparent
  // 2px bottom border for hover state symmetry.
  const hideLabel = compact && Boolean(Icon)
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={hideLabel ? label : undefined}
      title={hideLabel ? label : undefined}
      onClick={onClick}
      // 2026-06-04 round 21 (Yuqi Pencil h4bQ2 — Deadlines): tab
      // padding shape rebuilt to match the Pencil `Row` spec —
      // `py-3` (12px vertical, no horizontal) so the inter-tab
      // gap-6 on the parent nav does the spacing work, and the
      // active text steps from `text-text-primary` to
      // `text-state-accent-solid` (blue) so Pencil's
      // "active tab in blue" pattern reads on screen. Inactive
      // tabs keep their hover-deepen-border affordance.
      className={cn(
        'relative -mb-px flex shrink-0 cursor-pointer items-center gap-1.5 py-3 text-base whitespace-nowrap transition-colors',
        active
          ? 'font-semibold text-state-accent-solid'
          : 'border-b-2 border-transparent text-text-secondary hover:border-divider-deep hover:text-text-primary',
      )}
    >
      {Icon ? <Icon className={cn('size-4', iconColor)} aria-hidden /> : null}
      {hideLabel ? null : <span>{label}</span>}
      <span className="text-sm tabular-nums text-text-tertiary">{count}</span>
      {active ? (
        <motion.span
          layoutId="scope-tab-underline"
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 bg-accent-default"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      ) : null}
    </button>
  )
}

// Quick-filter chip: ghost when off, soft-tinted when on. Used for the
// 4 CPA action filters under the scope tabs (Past due, Due this week,
// Needs evidence, Penalty input needed). Pill-shaped per T3 —
// indicator, not commit.
//
// When active, an inline × renders inside the chip as a visible
// dismissal affordance. The whole chip is still the click target
// (clicking anywhere on an active chip toggles it off) — the × is a
// visual cue so users don't have to guess that "click again to remove."

export function ObligationQueueActionChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  // 2026-05-25 (Yuqi Deadlines #2): click target was 22px tall
  // (px-2.5 py-0.5 text-xs) — too small for filter chips that are
  // primary triage affordances. Bumped to ~30px (px-3 py-1 text-sm)
  // so the hit zone matches a real button and the label reads as
  // body text instead of meta caption.
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? 'border-accent-default bg-accent-tint font-medium text-text-accent'
          : 'border-divider-regular bg-background-default text-text-secondary hover:border-divider-deep hover:text-text-primary'
      }`}
    >
      <span>{children}</span>
      {active ? <XIcon aria-hidden className="size-3.5" /> : null}
    </button>
  )
}

// K-1 dependency wiring (PDF anti-pattern #4 + §6.4). Lives in the
// Readiness tab because "what's upstream of us" is part of the
// readiness picture — if a partner's 1040 is waiting on a
// partnership's K-1, that's the binding blocker, not whether the W-2
// landed. Renders one of three states:
//   - currently blocked: shows the parent label + Clear button
//   - not blocked, candidates available: shows a Select to set one
//   - not blocked, no candidates loaded: minimal hint only
// `ObligationBlockerSection` removed 2026-05-21 — the editor lived
// inside the Readiness tab on every drawer open, even on rows that
// weren't blocked. The queue row's <BlockedByChip> still surfaces the
// state. A re-home is parked behind the design brainstorm; the
// `updateBlockedBy` RPC procedure stays on the server.

export function ObligationQueueEmptyState({
  onOpenWizard,
  canRunMigration,
  hasActiveFilters,
  onClearFilters,
}: {
  onOpenWizard: () => void
  canRunMigration: boolean
  hasActiveFilters: boolean
  onClearFilters: () => void
}) {
  // Branch on whether the user has narrowed the queue via filters.
  // With filters: "Clear filters" CTA (do NOT recommend Import — the
  // workspace may very well have data hidden by the filter).
  // Without filters: import-clients CTA (workspace is genuinely empty).
  return (
    // 2026-05-28 (Yuqi /today polish — extended to /deadlines): empty
    // state aligned with /today's Actions-this-week treatment —
    // icon at top + split title/description + outline CTA. Dify Blue
    // primary stays reserved for the one next action per surface, so
    // the empty-state CTA renders as a quieter secondary button.
    <EmptyState
      icon={CalendarDaysIcon}
      title={
        hasActiveFilters ? (
          <Trans>No deadlines match these filters.</Trans>
        ) : (
          <Trans>No deadlines yet</Trans>
        )
      }
      description={
        hasActiveFilters ? (
          <Trans>
            Try a different filter combination, or clear all filters to see the full queue.
          </Trans>
        ) : (
          <Trans>Import your client list to start tracking filing deadlines.</Trans>
        )
      }
      cta={
        hasActiveFilters ? (
          <Button size="sm" variant="outline" onClick={onClearFilters}>
            <Trans>Clear filters</Trans>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onOpenWizard} disabled={!canRunMigration}>
            <Trans>Import clients</Trans>
          </Button>
        )
      }
    />
  )
}
