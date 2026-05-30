import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useNavigate } from 'react-router'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  EyeIcon,
  LinkIcon,
  SearchIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from 'lucide-react'

import type { ClientPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { cn } from '@duedatehq/ui/lib/utils'

import {
  TableHeaderMultiFilter,
  type TableFilterOption,
} from '@/components/patterns/table-header-filter'
import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { EmptyState } from '@/components/patterns/empty-state'
import { useAppHotkey, useKeyboardShortcutsBlocked } from '@/components/patterns/keyboard-shell'
import { RowActionsMenu, type RowActionsMenuItem } from '@/components/patterns/row-actions-menu'
import { SearchInput } from '@/components/primitives/search-input'
import { RULE_JURISDICTION_LABELS } from '@/features/rules/rules-console-model'
import { formatDate, formatDatePretty } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'

import { useClientDrawer } from './ClientDrawerProvider'
import { ClientPeekHoverCard } from './ClientPeekHoverCard'
import { FixNeedsFactsSheet } from './FixNeedsFactsSheet'
import { clientDetailPath } from './client-url'

import {
  CLIENT_UNASSIGNED_OWNER_FILTER,
  getClientFilingStates,
  type ClientEntityType,
  type ClientFactsModel,
  type ClientReadiness,
} from './client-readiness'
import { writeClientCycleList } from './client-cycle'
import type { ClientObligationListSummary, ClientAlertMatch } from './client-detail-model'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string
    cellClassName?: string
  }
}

type FilterOption = TableFilterOption

type ClientFactsWorkspaceProps = {
  clients: ClientPublic[]
  filteredClients: ClientPublic[]
  factsModel: ClientFactsModel
  // 2026-05-23: entity labels (LLC / S corp / Partnership / …) flow in
  // from the route so the workspace can render them in the new ENTITY
  // column without depending on the route module (avoids a circular
  // import — route imports workspace).
  entityLabels: Record<ClientEntityType, string>
  isLoading: boolean
  // 2026-05-26 (Yuqi /clients directory pivot brief): search wiring.
  // `searchQuery` is the current URL-backed `q` value; the workspace
  // surfaces it via the toolbar's search input. `onSearchChange` writes
  // back to the URL on every keystroke (the route debounces if needed).
  searchQuery: string
  onSearchChange: (value: string) => void
  // `readinessFilter`, `sourceFilter`, `alertFilter` and their
  // `on*Change` handlers used to live here as planned-for filter inputs
  // — they were always passed by the route but never consumed in the
  // workspace body. Removed 2026-05-27 (audit P3-2). If those filter
  // surfaces come back, re-add the prop alongside the actual consumer.
  clientFilter: readonly string[]
  entityFilter: readonly ClientEntityType[]
  stateFilter: readonly string[]
  ownerFilter: readonly string[]
  alertMatchesByClient: ReadonlyMap<string, readonly ClientAlertMatch[]>
  obligationSummariesByClient: ReadonlyMap<string, ClientObligationListSummary>
  opportunityCountByClient: ReadonlyMap<string, number>
  onClientFilterChange: (value: string[]) => void
  onEntityFilterChange: (value: string[]) => void
  onStateFilterChange: (value: string[]) => void
  onOwnerFilterChange: (value: string[]) => void
  onImport: () => void
  canImport: boolean
}

// 2026-05-26 (Yuqi macro→micro audit, Fix #6 / §3.4): /clients adopts
// the /deadlines responsive page-size pattern so the table fills the
// visible viewport instead of paginating at a fixed 25 regardless of
// monitor height. Constants mirror obligations.tsx so both surfaces
// share the same row-fit math.
// 2026-05-26 (Stripe-level Phase A / §S8): row height bumped from
// h-12 (48px) to h-14 (56px) — the "premium-feeling" Stripe rhythm
// per the critique. The +8px per row gives the dense client list
// more breathing room without changing the rendered cell content.
// Constant updated in tandem so the responsive page-size math still
// accurately measures rows-that-fit (was 49 = 48 + 1px border).
const CLIENTS_ROW_HEIGHT_PX = 57 // h-14 + 1px border
const CLIENTS_PAGE_SIZE_MIN = 8
const CLIENTS_PAGE_SIZE_MAX = 50
// Inside-card chrome subtracted from the table-card's clientHeight:
//   TableHeader (≈40) + Pagination footer (≈44) + 1px borders + buffer
const CLIENTS_INSIDE_CHROME_PX = 96

// Column widths for the /clients table. Centralized so the live
// `meta.{header,cell}ClassName` blocks and the loading-skeleton
// row widths can't drift (audit P3-1). Update one value here and
// both surfaces follow.
const CLIENTS_COL_WIDTH = {
  client: 'w-[240px]',
  state: 'w-[120px]',
  entity: 'w-[110px]',
  nextDue: 'w-[200px]',
  services: 'w-[90px]',
  open: 'w-[130px]',
  done: 'w-[80px]',
  assignee: 'w-[80px]',
  opportunities: 'w-[80px]',
} as const

function computeClientsResponsivePageSize(containerHeight: number): number {
  const usable = Math.max(0, containerHeight - CLIENTS_INSIDE_CHROME_PX)
  const fit = Math.floor(usable / CLIENTS_ROW_HEIGHT_PX)
  return Math.max(
    CLIENTS_PAGE_SIZE_MIN,
    Math.min(CLIENTS_PAGE_SIZE_MAX, fit || CLIENTS_PAGE_SIZE_MIN),
  )
}

// Callback-ref shape so observation kicks in when the table-card
// mounts (even if it mounts AFTER the initial render — e.g. inside
// a loading/success ternary).
function useClientsResponsivePageSize(): [number, (element: HTMLElement | null) => void] {
  const [pageSize, setPageSize] = useState<number>(CLIENTS_PAGE_SIZE_MIN)
  const [element, setElement] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    if (!element) return () => {}
    const measure = (): void => {
      setPageSize(computeClientsResponsivePageSize(element.clientHeight))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return [pageSize, setElement]
}

/**
 * `TabSection` — canonical section primitive for the client detail
 * tabs (Work / Client info / Discover / Activity).
 *
 * 2026-05-24: introduced to unify what used to be three different
 * section vocabularies on this page:
 *   - Work tab's Filing plan rolled its own h2 + subtitle inline
 *   - Client info / Discover used `DetailSection` (collapsible
 *     disclosure with chevron, summary on the right, body hidden
 *     until expanded)
 *   - Activity tab mixed `DetailSection` with one ad-hoc
 *     `SectionFrame` for the Notes block
 *
 * The Figma reference (node 109:13725) shows the Work tab's flat
 * pattern as the canonical: h2 (text-base / semibold / primary) +
 * subtitle (text-xs / tertiary) on a single baseline, optional
 * actions cluster on the right, content rendered flat directly
 * underneath without a nested card frame.
 *
 * All four tabs now use this primitive so the four-tab body reads
 * as one consistent surface, not four design dialects stitched
 * together. Content inside a section can still introduce its own
 * card chrome where the data shape calls for it (compliance
 * panel, jurisdiction form) — but the SECTION HEADER is
 * pixel-identical across all surfaces.
 */
export function TabSection({
  title,
  titleAccessory,
  summary,
  actions,
  children,
}: {
  title: ReactNode
  titleAccessory?: ReactNode
  summary?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    // 2026-05-28 (Yuqi /clients/[id] polish — section header
    // alignment): added `pl-3` (12px) to the header row so the
    // section heading line aligns with the canonical 12px content
    // gutter used elsewhere in the workbench (sidebar menu items,
    // rule rows, etc). Actions cluster on the right pushes in by
    // the same 12px so the header stays visually balanced. Outer
    // `gap-3` between heading and children kept as the standard
    // section vertical rhythm — same value used by other sections
    // on the page so the rhythm reads consistent.
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pl-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <div className="flex min-w-0 items-center gap-1">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            {titleAccessory}
          </div>
          {summary ? <span className="text-xs text-text-tertiary">{summary}</span> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

// `DetailSection` (collapsible disclosure) retired 2026-05-24 in
// favour of the flat <TabSection> primitive above. Sections on the
// client detail page no longer collapse — the four tabs share one
// heading style so the body reads as a single consistent surface.
// Git history has the prior implementation if a future surface
// needs a disclosure pattern again (e.g. on an admin-only screen).

/**
 * Primary filing state — the marked-primary profile if present, else
 * `client.state`, else the first filing-profile state. Returns null
 * when the client has no jurisdiction facts at all (in which case
 * readiness will surface "Needs filing state").
 */
function getPrimaryFilingState(client: ClientPublic): string | null {
  const primary = client.filingProfiles.find((profile) => profile.isPrimary)
  if (primary?.state) return primary.state
  if (client.state) return client.state
  return client.filingProfiles[0]?.state ?? null
}

/**
 * Filing states the client owes filings in *beyond* the primary
 * jurisdiction. Rendered as outline badges alongside the primary
 * state in the unified `States` column (the earlier standalone
 * "Other states" column was retired per critique L-7).
 */
function getOtherFilingStates(client: ClientPublic): string[] {
  const primary = getPrimaryFilingState(client)
  return getClientFilingStates(client).filter((state) => state !== primary)
}

/**
 * Count of unique tax-type services the practice manages for this
 * client. Sums distinct tax codes across all filing profiles — a
 * single 1065 in CA + a single 1065 in NY counts as one service
 * (same form), so the number reads as scope-of-work, not row count.
 * Differs from `openCount` (in-flight obligations) on purpose: a
 * client can have 8 services and only 2 open this week.
 */
function getClientServicesCount(client: ClientPublic): number {
  const taxTypes = new Set<string>()
  for (const profile of client.filingProfiles) {
    for (const taxType of profile.taxTypes) {
      if (taxType) taxTypes.add(taxType)
    }
  }
  return taxTypes.size
}

/**
 * Single-line urgency label for the Next-due column in the clients
 * list. Replaces the previous 3-line composite cell (date + form +
 * readiness chip) flagged as "三行不友好" in the design review.
 *
 * Vocabulary:
 *   - days < 0 → "Nd late" (destructive tone)
 *   - days = 0 → "Today"   (warning tone)
 *   - 1 ≤ days ≤ 7 → "in Nd" (warning tone)
 *   - days > 7  → prose date ("May 23") in primary text
 *
 * Mirrors the obligations queue's urgency phrasing so a CPA scanning
 * either surface reads the same signal.
 */
function NextDueRelativeLabel({ iso }: { iso: string }) {
  const dueTs = Date.parse(iso)
  if (!Number.isFinite(dueTs)) {
    return <span className="text-text-tertiary">{iso}</span>
  }
  const days = Math.ceil((dueTs - Date.now()) / 86_400_000)
  // 2026-05-26 (Yuqi /clients feedback #4 — "data can be even more
  // obvious"): bumped the relative-due label to `text-sm font-semibold`
  // (was inheriting cell defaults, ~text-xs regular). The next-due
  // date is the PRIMARY scannable data on the directory — it's the
  // single most important thing a CPA reads per row. Making it the
  // row's loudest cell value matches its importance. Destructive +
  // warning tones unchanged.
  // 2026-05-26 (cross-table element unify): copy matches /deadlines
  // DUE column — verbose "# days late" / "# days" form.
  if (days < 0) {
    return (
      <span className="whitespace-nowrap text-sm font-semibold text-text-destructive tabular-nums">
        <Plural value={Math.abs(days)} one="# day late" other="# days late" />
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="whitespace-nowrap text-sm font-semibold text-text-warning">
        <Trans>Today</Trans>
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="whitespace-nowrap text-sm font-semibold text-text-warning tabular-nums">
        <Plural value={days} one="in # day" other="in # days" />
      </span>
    )
  }
  return (
    <span className="whitespace-nowrap text-sm font-semibold text-text-primary">
      {formatDatePretty(iso)}
    </span>
  )
}

export function ClientFilingStateChips({ client }: { client: ClientPublic }) {
  const states = getClientFilingStates(client)
  if (states.length === 0) return null
  const [primary, ...others] = states
  const visibleOthers = others.slice(0, 2)
  const overflow = others.length - visibleOthers.length
  // 2026-05-29 (Yuqi /clients round 1 — "ensure the state badge is in
  // the unified consistent state badge style (with a border). and
  // remove the state icon everywhere in the software"): dropped the
  // SVG StateBadge glyph and switched to the canonical
  // `Badge variant="outline"` pill the entity badge uses two cells
  // over. Each state code now reads as a uniform bordered pill —
  // primary, additional, and overflow ("+N") all share the same
  // chrome so the meta-row reads as one consistent identity strip
  // instead of "framed primary + bare flag motifs."
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      title={
        states.length === 1 ? `Filing state: ${states[0]}` : `Filing states: ${states.join(', ')}`
      }
    >
      <Badge variant="outline" className="text-xs font-normal tabular-nums">
        {primary}
      </Badge>
      {visibleOthers.map((state) => (
        <Badge key={state} variant="outline" className="text-xs font-normal tabular-nums">
          {state}
        </Badge>
      ))}
      {overflow > 0 ? (
        <Badge
          variant="outline"
          className="text-xs font-normal tabular-nums text-text-tertiary"
          title={others.slice(2).join(', ')}
        >
          +{overflow}
        </Badge>
      ) : null}
    </div>
  )
}

/**
 * 2026-05-23: column-header SORT button. Wraps the label + a sort-
 * arrow icon in a single click target so the whole label is clickable
 * to cycle sort (asc → desc → cleared). Visually distinct from the
 * separate filter funnel icon (`tableHeaderFilterIconTrigger`) that
 * sits beside it — sort and filter are two controls, two clicks, no
 * accidental triggering.
 *
 * The arrow has three states matching TanStack's column.getIsSorted():
 *   - false (idle)  → muted up/down chevron pair (sortable affordance)
 *   - 'asc'         → solid up arrow (active ascending)
 *   - 'desc'        → solid down arrow (active descending)
 */
function ColumnSortHeader({
  label,
  sortState,
  onToggle,
  align = 'left',
  description,
}: {
  label: string
  sortState: false | 'asc' | 'desc'
  onToggle: () => void
  align?: 'left' | 'right'
  description?: string
}) {
  const sortLabel = description ? `Sort by ${label}. ${description}` : `Sort by ${label}`

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={sortLabel}
      title={sortLabel}
      data-active={sortState !== false ? true : undefined}
      className={cn(
        // 2026-05-26 (Yuqi macro→micro audit, Fix #7 / §3.3): retired
        // uppercase + tracking-wider kicker style; family canonical
        // (page-family-canonical §6) specifies sortable headers use
        // sm + normal-case + text-secondary so they read as labels,
        // not eyebrows. Matches /deadlines + /alerts table headers.
        '-mx-1 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1 text-sm font-medium whitespace-nowrap text-text-secondary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt data-[active=true]:text-text-primary',
        align === 'right' && 'justify-end',
      )}
    >
      <span className="truncate">{label}</span>
      {/* 2026-05-26 (Yuqi /clients feedback #2 — "remove the sort by
          icon"): idle (sortState=false) no longer renders the
          ArrowUpDownIcon. The header itself still functions as a
          click-to-sort button (cursor-pointer + hover bg), but the
          dual-chevron icon was visual noise on a directory where the
          user rarely re-sorts. Active states still render the up/down
          arrow so the user always sees WHICH column is sorted + in
          which direction. */}
      {sortState === 'asc' ? (
        <ArrowUpIcon className="size-3 shrink-0" aria-hidden />
      ) : sortState === 'desc' ? (
        <ArrowDownIcon className="size-3 shrink-0" aria-hidden />
      ) : null}
    </button>
  )
}

export function ClientFactsWorkspace({
  clients,
  filteredClients,
  factsModel,
  entityLabels,
  isLoading,
  searchQuery,
  onSearchChange,
  clientFilter,
  stateFilter,
  ownerFilter,
  entityFilter,
  alertMatchesByClient,
  obligationSummariesByClient,
  opportunityCountByClient,
  onClientFilterChange,
  onEntityFilterChange,
  onStateFilterChange,
  onOwnerFilterChange,
  // 2026-05-26 (Yuqi /clients directory pivot brief): retired
  // `onAlertFilterChange` consumer (was driving the alert hits
  // StatTile click). Prop still typed for caller stability; will
  // be removed end-to-end in a follow-up cleanup pass when the
  // route's `handleAlertFilterChange` retires too.
  onImport,
  canImport,
}: ClientFactsWorkspaceProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const currentUserName = useCurrentUserName()
  const { openDrawer: openClientDrawer } = useClientDrawer()
  // 2026-05-26 (Stripe Phase B per-row ⋯): hoisted above the columns
  // useMemo because the rowActions column declares this in its deps
  // array. Previously declared further down (after the React Table
  // hook), but the deps eval order forces it earlier in the closure.
  const handleOpenClientDetail = useCallback(
    (clientId: string) => {
      // 2026-05-24 (useEffect audit): persist the currently-visible
      // client order to sessionStorage at navigation time so the
      // detail page can offer prev/next cycling across the same
      // filter subset.
      // 2026-05-24 (merge): adopted the `clientDetailPath()` helper
      // for the readable /clients/<slug>-<id> URL. Falls back to the
      // raw id when the client isn't in the current list.
      writeClientCycleList(filteredClients.map((client) => client.id))
      const client = clients.find((candidate) => candidate.id === clientId)
      void navigate(client ? clientDetailPath(client) : `/clients/${clientId}`)
    },
    [clients, filteredClients, navigate],
  )
  // 2026-05-25 (Yuqi /clients #8): header-filter open-state retired
  // with the move of all filter dropdowns into the ClientsFilterToolbar
  // strip above the table. Each toolbar trigger now manages its own
  // uncontrolled open state, so we no longer need to coordinate
  // mutual-exclusion at the table level.
  const clientOptions = useMemo<FilterOption[]>(
    () =>
      clients
        .map((client) => ({ value: client.id, label: client.name }))
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [clients],
  )
  const stateOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>()
    for (const client of clients) {
      for (const state of getClientFilingStates(client)) {
        counts.set(state, (counts.get(state) ?? 0) + 1)
      }
    }
    return factsModel.stateOptions.map((state) => ({
      value: state,
      label: RULE_JURISDICTION_LABELS[state] ?? state,
      count: counts.get(state) ?? 0,
    }))
  }, [clients, factsModel.stateOptions])
  // 2026-05-23: entity options for the new ENTITY column filter
  // dropdown. Counts how many clients sit at each entity type so the
  // dropdown shows "S corp · 7" / "LLC · 5" etc.
  const entityOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<ClientEntityType, number>()
    for (const client of clients) {
      counts.set(client.entityType, (counts.get(client.entityType) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: entityLabels[value], count }))
      .toSorted((a, b) => a.label.localeCompare(b.label))
  }, [clients, entityLabels])
  const ownerOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>()
    const labels = new Map<string, string>()
    for (const client of clients) {
      const value = client.assigneeName ?? CLIENT_UNASSIGNED_OWNER_FILTER
      counts.set(value, (counts.get(value) ?? 0) + 1)
      labels.set(value, client.assigneeName ?? t`Unassigned`)
    }
    return [...counts.entries()]
      .map(([value, count]) => ({
        value,
        label: labels.get(value) ?? value,
        count,
      }))
      .toSorted((a, b) => {
        if (a.value === CLIENT_UNASSIGNED_OWNER_FILTER) return -1
        if (b.value === CLIENT_UNASSIGNED_OWNER_FILTER) return 1
        return a.label.localeCompare(b.label)
      })
  }, [clients, t])
  // Column order per the 2026-05-21 product review (with L-7
  // "Other states" merged into the unified States column 2026-05-22):
  //
  //   Client · States (primary + others inline) ·
  //   Next due (date + form + readiness) ·
  //   # Services · # Open · Owner (avatar) · Opportunities
  //
  // Source column was dropped — provenance trivia, not a reason to
  // pick a row. The filter param + filter pipeline are still wired
  // for deep links but no longer surface as a column header.
  // Readiness chip moves from a standalone column into the Next due
  // composite cell — see ClientsActionStrip's Needs facts banner for
  // the actionable filter entry.
  const columns = useMemo<ColumnDef<ClientPublic>[]>(
    () => [
      {
        accessorKey: 'name',
        // 2026-05-25 (Yuqi /clients #8): filter funnel removed from
        // the column header — was an icon-only TableHeaderMultiFilter
        // sitting on the right edge of every filterable column. All
        // four filters (Client / States / Entity / Owner) now live in
        // a single ToolbarFilters row above the table, matching the
        // Alerts page rhythm. Column header keeps only the sort
        // arrow.
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Client`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => {
          const matches = alertMatchesByClient.get(row.original.id)
          const readiness = factsModel.readinessById.get(row.original.id)
          return (
            <div className="flex min-w-0 items-center gap-2">
              {/* L-6 (2026-05-22): dropped the entity-type sub-line that
                  lived under the client name. Entity is already
                  filterable via the column header dropdown + visible on
                  the detail page header chip; surfacing it under every
                  list row was redundant noise.
                  L-5 (2026-05-23): readiness chip moves into this row so
                  the page-level scan sees identity + setup state
                  together. The Next-due cell then carries ONLY urgency
                  (a single tone-coded line). */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* 2026-05-26 (Yuqi follow-up — "client name is so
                    big"): bumped back down from text-lg → text-base.
                    The text-lg bump landed earlier in the day and
                    immediately read as too loud on the list grid.
                    text-base still scales above the other body cells
                    (which inherit text-sm) so it reads as primary
                    identity without dominating the row.
                    2026-05-26 (Yuqi cross-table unify — "Deadlines
                    text-sm · Clients text-base · Rules library text-sm.
                    maybe have clients text-base size as regular
                    weight"): dropped `font-medium`. The medium weight
                    was making text-base feel heavy; regular weight at
                    text-base reads as primary identity (larger than
                    text-sm meta) without shouting. Same treatment now
                    applied to Deadlines + Rules library so all three
                    workbench tables share one canonical title scale. */}
                <span className="truncate text-base text-text-primary group-hover:underline">
                  {row.original.name}
                </span>
                {readiness?.status === 'needs_facts' ? (
                  <ClientReadinessBadge readiness={readiness} compact />
                ) : null}
                {matches && matches.length > 0 ? <ClientAlertMatchBadge matches={matches} /> : null}
              </div>
              {/* Hover-revealed peek affordance: row click still goes to
                  the full page; this opens the read-only drawer for a
                  fast "is this the right client?" glance. ⌘-click on
                  the row is also wired below for a power-user shortcut.
                  2026-05-28 (audit P3-5): added `group-focus-within`
                  so the button reveals when a sibling control inside
                  the row receives focus, not only when the eye itself
                  is focused. Keyboard navigation now surfaces the
                  affordance as soon as the row enters focus. */}
              <ClientPeekHoverCard clientId={row.original.id}>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={t`Peek ${row.original.name} details`}
                  title={t`Peek details (without leaving the list)`}
                  className="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md text-text-tertiary opacity-0 outline-none transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-state-base-hover hover:text-text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  <EyeIcon className="size-4" aria-hidden />
                </button>
              </ClientPeekHoverCard>
            </div>
          )
        },
        meta: {
          headerClassName: CLIENTS_COL_WIDTH.client,
          cellClassName: CLIENTS_COL_WIDTH.client,
        },
      },
      {
        accessorKey: 'state',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`States`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        // Render primary state and any additional filing states inline:
        // primary state = filled secondary badge, additional states =
        // outline badges. Replaces the earlier `otherStates` column —
        // primary + others are the same scan signal ("which states does
        // this client file in?") and splitting them across two columns
        // duplicated header space + forced the user's eye to track both.
        // See `docs/Design/clients-list-and-detail-critique-2026-05-22.md`
        // L-7 for the rationale.
        // 2026-05-27 (Yuqi /clients ↔ /deadlines parity refactor): the
        // state cell used to render `<StateBadge>` SVG glyphs +
        // 2-letter code text.
        // 2026-05-29 (Yuqi /clients round 1 — "remove the state icon
        // everywhere"): swept to the bordered `Badge variant="outline"`
        // pill so every state code reads identically to the Entity
        // badge two cells over. The SVG decorative flag is gone; the
        // pill is the identity. Same chrome applied to additional and
        // overflow chips so the row reads as one consistent strip.
        cell: ({ row }) => {
          const primary = getPrimaryFilingState(row.original)
          if (!primary) {
            return <span className="text-text-tertiary">—</span>
          }
          const others = getOtherFilingStates(row.original)
          const visibleOthers = others.slice(0, 2)
          const overflow = others.length - visibleOthers.length
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-xs font-normal tabular-nums">
                {primary}
              </Badge>
              {visibleOthers.map((state) => (
                <Badge key={state} variant="outline" className="text-xs font-normal tabular-nums">
                  {state}
                </Badge>
              ))}
              {overflow > 0 ? (
                <Badge
                  variant="outline"
                  className="text-xs font-normal tabular-nums text-text-tertiary"
                  title={others.slice(2).join(', ')}
                >
                  +{overflow}
                </Badge>
              ) : null}
            </div>
          )
        },
        meta: {
          // 2026-05-27 (Yuqi /clients ↔ /deadlines parity refactor):
          // tightened 220px → 120px now that the cell is
          // `[StateBadge] [2-letter code]` instead of a full-name pill.
          // Brings /clients column rhythm in line with /deadlines'
          // `w-[90px]` state column (slightly wider here only because
          // /clients also surfaces up to 2 additional-state SVG
          // badges + the overflow "+N" chip on the same row).
          headerClassName: CLIENTS_COL_WIDTH.state,
          cellClassName: CLIENTS_COL_WIDTH.state,
        },
      },
      {
        // 2026-05-23: ENTITY column returns as its own column per the
        // design mock. Was previously a sub-line under the client name
        // (L-6 retired it), then a header-only filter with no body
        // rendering. Now it gets a single chip per row showing the
        // entity type (LLC / S corp / Partnership / …) so the CPA can
        // scan "what kind of return am I looking at?" without opening
        // the client.
        accessorKey: 'entityType',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Entity`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        // 2026-05-25 (Yuqi /clients #6): entity badge unified with
        // the detail-page header chip (line ~1893). Was `rounded-sm
        // font-normal tabular-nums`, now matches detail's `text-xs`
        // shape so the same identity fact reads the same way on both
        // surfaces. tabular-nums dropped — entity labels aren't
        // numeric ("S corp", "LLC"), the tabular-nums override was a
        // copy-paste artifact from the dot column next door.
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs font-normal">
            {entityLabels[row.original.entityType]}
          </Badge>
        ),
        meta: {
          headerClassName: CLIENTS_COL_WIDTH.entity,
          cellClassName: CLIENTS_COL_WIDTH.entity,
        },
      },
      {
        // 2026-05-23 design pass: NEXT DUE cell becomes a 2-line composite
        // and absorbs the standalone STATUS column.
        //   Line 1: relative urgency ("In 2 days" / "8d late") with the
        //           same tone semantics as before.
        //   Line 2: ISO calendar date (YYYY-MM-DD) so the CPA can read
        //           the absolute deadline without hovering.
        //   Inline: status pill next to the date — answers "Xd late, but
        //           why?" without a separate column.
        // The standalone STATUS column (added 2026-05-23, retired same
        // day) is gone; the inline pill is its replacement.
        id: 'nextDue',
        accessorFn: (client) =>
          obligationSummariesByClient.get(client.id)?.nextDueDate ?? undefined,
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Next due`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        sortingFn: 'text',
        sortDescFirst: false,
        sortUndefined: 'last',
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          if (!summary?.nextDueDate) {
            return <EmptyCellMark label={t`No upcoming deadline`} />
          }
          return (
            <div className="flex min-w-0 flex-col gap-0.5">
              <NextDueRelativeLabel iso={summary.nextDueDate} />
              <div className="flex flex-wrap items-center gap-1.5">
                {/* 2026-05-26 (Yuqi cross-table audit): exact-date
                    secondary line bumped `text-text-tertiary`
                    → `text-text-secondary` to match the /deadlines
                    queue row treatment. One tone for the same job.
                    2026-05-26 (Yuqi cross-table element unify): dropped
                    `font-mono` + raw ISO. Same reasoning as the drawer
                    DeadlineTile fix — mono numbers read as "code/
                    identifier-y" when these are just dates. Now uses
                    `formatDate()` for the same prose date format
                    /deadlines uses (e.g. "May 8") + `tabular-nums` for
                    column alignment without the mono treatment. */}
                <span className="text-caption tabular-nums text-text-secondary">
                  {formatDate(summary.nextDueDate)}
                </span>
                {summary.nextDueStatus ? (
                  // 2026-05-26 (Yuqi cross-table element unify): status
                  // pill renders at the canonical ObligationStatusReadBadge
                  // default size. Previously this site shrank it to
                  // `px-1.5 py-0 text-caption-xs font-normal` — same
                  // semantic chip as /deadlines, but visibly smaller
                  // than the queue's status pill. One status → one
                  // pill size across the product.
                  <ObligationStatusReadBadge status={summary.nextDueStatus} />
                ) : null}
              </div>
            </div>
          )
        },
        meta: {
          headerClassName: CLIENTS_COL_WIDTH.nextDue,
          cellClassName: CLIENTS_COL_WIDTH.nextDue,
        },
      },
      // 2026-05-26 (Yuqi follow-up — "bring back services"): the
      // brief had retired this column; Yuqi reversed that call.
      // Column restored to its prior shape — hidden by default
      // (via columnVisibility below), accessible via the column-
      // toggle UI for the CPA who actively reviews scope-of-work.
      {
        id: 'servicesCount',
        header: () => <span>{t`Services`}</span>,
        cell: ({ row }) => {
          const count = getClientServicesCount(row.original)
          if (count === 0) {
            return <EmptyCellMark label={t`No tax-type services tracked`} />
          }
          // Plain count — sum of unique tax types across filing
          // profiles. No deep-link here because the destination is
          // ambiguous (rules library? filing plan tab?); the row's
          // own click handler opens the client detail, which is the
          // right place to see services in context.
          // 2026-05-26 (Yuqi /clients feedback #3 — "left align"):
          // dropped `block text-right` + `font-mono`. Numeric cells
          // are now left-aligned + sans-serif tabular-nums.
          return (
            <span
              className="tabular-nums text-text-primary"
              title={t`${count} tax-type services managed for this client`}
            >
              {count}
            </span>
          )
        },
        meta: {
          // 2026-05-26 (Yuqi /clients feedback #3 — "left align"):
          // numeric columns left-aligned to match /deadlines + /rules/
          // library family. Right-aligned numbers read as a balance
          // sheet; left-aligned matches the rest of the workbench
          // tables and the canonical TableCell default.
          headerClassName: CLIENTS_COL_WIDTH.services,
          cellClassName: CLIENTS_COL_WIDTH.services,
        },
      },
      {
        id: 'openObligations',
        accessorFn: (client) => obligationSummariesByClient.get(client.id)?.openCount ?? 0,
        header: ({ column }) => (
          <ColumnSortHeader
            label={t({
              id: 'clients.openDeadlinesColumn',
              message: 'Open deadlines',
              comment: 'Column header for the count of unfinished deadline rows on a client.',
            })}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
            description={t({
              id: 'clients.openDeadlinesColumnDescription',
              message: `Counts deadlines still in pending, in progress, extended, waiting on client, or review.`,
              comment: 'Tooltip for the Open deadlines column header on the clients table.',
            })}
          />
        ),
        sortingFn: 'basic',
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          const count = summary?.openCount ?? 0
          if (count === 0) {
            // Open=0 renders as em-dash — Stripe-style quiet treatment
            // that mutes the "nothing happening" row so the eye glides
            // past it to clients who actually have work pending.
            return <EmptyCellMark label={t`No open deadlines`} />
          }
          // Count becomes a deep link into the queue pre-filtered to
          // this client. 2026-05-26 (Yuqi feedback #3): dropped
          // `block text-right` — left-aligned numeric matches the
          // table family.
          return (
            <Link
              to={`/deadlines?client=${row.original.id}`}
              onClick={(event) => event.stopPropagation()}
              className="rounded-sm tabular-nums text-text-primary outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              aria-label={t`View ${count} open deadlines for this client`}
            >
              {count}
            </Link>
          )
        },
        meta: {
          // 2026-05-26 (Yuqi /clients feedback #3 — "left align"):
          // numeric columns left-aligned to match the rest of the
          // workbench tables.
          headerClassName: CLIENTS_COL_WIDTH.open,
          cellClassName: CLIENTS_COL_WIDTH.open,
        },
      },
      {
        // 2026-05-23: DONE column added per design mock. Counts
        // obligations whose status is done/completed (terminal states).
        // Built from the widened obligations query that now includes
        // those statuses alongside the open ones — see route
        // CLIENTS_LIST_OBLIGATION_STATUSES. Plain count, no deep link
        // (we don't have a routed view for closed obligations yet; the
        // client detail's Activity tab is the right destination when
        // we add that link).
        // 2026-05-26 (browser comment): renamed `Filed YTD` →
        // `Filed` because this summary is status-based, not a true
        // year-to-date audit timestamp filter. It counts rows already
        // in the user-facing Filed or Completed terminal states.
        id: 'doneObligations',
        header: ({ column }) => (
          <ColumnSortHeader
            label={t`Filed`}
            description={t`Counts this client's deadlines that are already Filed or Completed.`}
            sortState={column.getIsSorted()}
            onToggle={() => column.toggleSorting()}
          />
        ),
        sortingFn: (rowA, rowB) => {
          const a = obligationSummariesByClient.get(rowA.original.id)?.doneCount ?? 0
          const b = obligationSummariesByClient.get(rowB.original.id)?.doneCount ?? 0
          return a - b
        },
        cell: ({ row }) => {
          const summary = obligationSummariesByClient.get(row.original.id)
          const count = summary?.doneCount ?? 0
          const title =
            count === 1
              ? t`1 filed or completed deadline for this client`
              : t`${count} filed or completed deadlines for this client`
          if (count === 0) {
            // 2026-05-26 (merge with main): keep left-aligned (our
            // Yuqi feedback #3) but adopt main's `title` const above
            // for the singular/plural tooltip copy.
            return (
              <span className="tabular-nums text-text-tertiary" title={title}>
                0
              </span>
            )
          }
          // 2026-05-26 (Yuqi feedback #3): left-aligned numeric matches
          // the table family.
          return (
            <span className="tabular-nums text-text-secondary" title={title}>
              {count}
            </span>
          )
        },
        meta: {
          // 2026-05-26 (Yuqi /clients feedback #3 — "left align"):
          // numeric columns left-aligned to match the rest of the
          // workbench tables.
          headerClassName: CLIENTS_COL_WIDTH.done,
          cellClassName: CLIENTS_COL_WIDTH.done,
        },
      },
      {
        accessorKey: 'assigneeName',
        // 2026-05-27 (Yuqi /clients ↔ /deadlines parity refactor):
        // column label realigned to /deadlines' "Assignee" (route
        // obligations.tsx line ~2022 — `header: () => <span>{t`Assignee`}</span>`).
        // The cell already renders an `<AssigneeAvatar>`-shaped
        // primitive (`<ClientAssigneeAvatar>`), so the header noun
        // and the cell motif now agree across both workbench tables.
        // Note: the underlying RPC field stays `assigneeName`; only
        // the header copy changed, so the existing client-detail
        // "Owner" treatment (which sits alongside an editable
        // assignee pill) and the toolbar filter chip's "Owner" label
        // remain intact — those surfaces aren't part of this
        // cross-table column comparison.
        header: () => (
          <span className="text-sm font-medium text-text-secondary">
            <Trans>Assignee</Trans>
          </span>
        ),
        cell: ({ row }) => (
          <ClientAssigneeAvatar
            name={row.original.assigneeName}
            currentUserName={currentUserName}
          />
        ),
        meta: {
          headerClassName: CLIENTS_COL_WIDTH.assignee,
          cellClassName: CLIENTS_COL_WIDTH.assignee,
        },
      },
      {
        // 2026-05-23: abbreviated header from "Opportunities" → "Opp."
        // per design mock. Full label preserved in the cell's tooltip
        // (via ClientOpportunityCountBadge) and the column-toggle UI.
        // Tighter header frees room for the new ENTITY + DONE columns
        // without overflowing the 1100px page cap.
        id: 'opportunities',
        header: t`Opp.`,
        cell: ({ row }) => {
          const count = opportunityCountByClient.get(row.original.id) ?? 0
          if (count === 0) {
            return <EmptyCellMark label={t`No opportunities tracked`} />
          }
          return <ClientOpportunityCountBadge count={count} />
        },
        meta: {
          headerClassName: CLIENTS_COL_WIDTH.opportunities,
          cellClassName: CLIENTS_COL_WIDTH.opportunities,
        },
      },
      {
        // 2026-05-26 (Stripe Phase B — per-row ⋯): canonical row-action
        // menu lives at the trailing edge of every row, mirroring how
        // Stripe's Transactions table exposes per-row affordances.
        // Hidden until row-hover so the table reads clean at rest;
        // becomes visible (and tab-focusable) the moment the user
        // gestures at the row. Stops propagation to the row's
        // open-detail click handler so the ⋯ surface is its own
        // unambiguous interaction.
        id: 'rowActions',
        header: () => <span className="sr-only">{t`Row actions`}</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const client = row.original
          const detailPath = clientDetailPath(client)
          const items: RowActionsMenuItem[] = [
            {
              label: t`Open detail`,
              icon: ExternalLinkIcon,
              onSelect: () => handleOpenClientDetail(client.id),
            },
            {
              label: t`Quick peek`,
              icon: EyeIcon,
              onSelect: () => openClientDrawer(client.id),
            },
            {
              label: t`Copy link`,
              icon: LinkIcon,
              onSelect: () => {
                if (typeof window === 'undefined') return
                try {
                  const url = `${window.location.origin}${detailPath}`
                  void window.navigator.clipboard?.writeText(url)
                } catch {
                  // Clipboard can throw in sandboxed iframes. Silent
                  // fail is acceptable here — the action is non-critical
                  // and the user can fall back to the address bar.
                }
              },
            },
          ]
          return <RowActionsMenu label={t`Actions for ${client.name}`} items={items} />
        },
        meta: {
          headerClassName: 'w-10',
          cellClassName: 'w-10 text-right',
        },
      },
    ],
    [
      currentUserName,
      entityLabels,
      factsModel.readinessById,
      handleOpenClientDetail,
      obligationSummariesByClient,
      openClientDrawer,
      opportunityCountByClient,
      alertMatchesByClient,
      t,
    ],
  )

  // 2026-05-26 (Yuqi /clients directory pivot brief): the local
  // `atRiskActive`/`waitingActive` state + the `visibleClients`
  // narrowing memo were driven by the StatTile strip toggle. The
  // strip retired (triage signals belong on /today + /deadlines);
  // the local narrowing it powered also retires. The table now
  // consumes `filteredClients` directly — URL-backed filters
  // (states / entity / owner / search) are the only narrowing
  // controls on /clients.

  // 2026-05-23: column sort state for the new sort-arrow indicators
  // (CLIENT / STATES / ENTITY / NEXT DUE / OPEN / FILED). Default sort
  // is unset so rows render in the API's `due_asc` order — clicking
  // a header opts in. Stored locally because sort feels transient (a
  // "show me by ___" gesture) rather than something to deep-link.
  const [sorting, setSorting] = useState<SortingState>([])
  // 2026-05-26 (Yuqi macro→micro audit, Fix #6 / §3.4): responsive
  // page-size — the table-card observes its own clientHeight via
  // ResizeObserver, then `table.setPageSize` consumes the result on
  // every change so the page-count UI stays accurate as the viewport
  // changes. Mirrors the /deadlines hook + setter pair.
  const [responsivePageSize, setTableCardElement] = useClientsResponsivePageSize()
  const table = useReactTable({
    data: filteredClients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (client) => client.id,
    // Lower-frequency columns start hidden and stay available through
    // the column-toggle UI. The default directory view should stay
    // focused on find-and-open plus live work state.
    initialState: {
      columnVisibility: {
        // Browser follow-up: this is a useful historical count, but
        // not a default directory scan dimension. Keep it available
        // for CPAs who opt into filed/completed volume review.
        doneObligations: false,
        // 2026-05-26 (Yuqi /clients directory pivot brief): `Opp.`
        // demoted to hidden-by-default. The directory's primary job
        // is find-and-open; an opportunity count earns its visual
        // weight only when surfaced via the column-toggle UI for
        // the rare CPA who actively triages opportunities here.
        opportunities: false,
        // `servicesCount` stays hidden by default per its prior
        // behavior — the cell renders "—" for typical firms that
        // haven't fully populated filing profiles, but the column
        // is restored (Yuqi follow-up — "bring back services") so
        // it's available via the column-toggle UI for any CPA who
        // tracks scope-of-work here.
        servicesCount: false,
      },
      pagination: {
        // 2026-05-26: pageSize seeded from the responsive-page-size
        // hook's floor (CLIENTS_PAGE_SIZE_MIN). The hook overrides on
        // mount via useEffect below once the table-card measures its
        // own clientHeight.
        pageIndex: 0,
        pageSize: CLIENTS_PAGE_SIZE_MIN,
      },
    },
  })
  // Sync the responsive measurement into the table's pagination
  // state. table.setPageSize is the official React-Table API for
  // this; doing it from an effect keeps the table source-of-truth
  // for state while letting the hook own measurement.
  useEffect(() => {
    table.setPageSize(responsivePageSize)
  }, [responsivePageSize, table])

  // L-2: Fix-now banner now opens an inline batch sheet
  // (FixNeedsFactsSheet) instead of narrowing the table to a
  // needs-facts filter. Filter-then-drill was the previous behavior —
  // CPA still had to open every row, drill, edit, save, back. Batch
  // sheet skips that loop.
  const [fixNeedsFactsOpen, setFixNeedsFactsOpen] = useState(false)

  return (
    <>
      <ClientsActionStrip
        isLoading={isLoading}
        needsFactsCount={factsModel.summary.needsFacts}
        onFixNeedsFacts={() => setFixNeedsFactsOpen(true)}
      />

      <FixNeedsFactsSheet
        open={fixNeedsFactsOpen}
        onOpenChange={setFixNeedsFactsOpen}
        clients={clients}
      />

      {/* 2026-05-25 (Yuqi /clients #8): toolbar filter row above the
          table — same rhythm as /alerts, where the filter
          dropdowns live in their own row above the alert list. Was
          previously inline funnel icons on each column header (one
          per filter), which read as random table chrome rather than
          a deliberate filter band. The toolbar version surfaces all
          four filters in one scannable strip; column headers keep
          only the sort arrow. A Reset button on the right clears
          every filter at once. */}
      <ClientsFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        clientOptions={clientOptions}
        clientFilter={clientFilter}
        onClientFilterChange={onClientFilterChange}
        stateOptions={stateOptions}
        stateFilter={stateFilter}
        onStateFilterChange={onStateFilterChange}
        entityOptions={entityOptions}
        entityFilter={entityFilter}
        onEntityFilterChange={onEntityFilterChange}
        ownerOptions={ownerOptions}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={onOwnerFilterChange}
      />

      {/* 2026-05-26 (Yuqi macro→micro audit, Fix #6 / §3.4): table
          re-framed in the canonical bordered card with `flex-1
          min-h-0` rows-area + pinned pagination footer. Mirrors
          /deadlines so /clients renders identically. Outer container
          in routes/clients.tsx is height-constrained at xl so this
          flex-1 has somewhere to grow into.

          On small viewports / when there are zero clients, the empty
          state replaces the card-frame entirely so the dashed
          ClientTableEmptyRow doesn't sit inside a doubly-bordered
          shell. */}
      {clients.length === 0 && !isLoading ? (
        <EmptyState
          icon={UsersRoundIcon}
          title={<Trans>No clients yet</Trans>}
          description={<Trans>Import a CSV or create the first manual client record.</Trans>}
          cta={
            <Button size="sm" onClick={onImport} disabled={!canImport}>
              <Trans>Import clients</Trans>
            </Button>
          }
        />
      ) : (
        // 2026-05-26 (Yuqi cross-table chrome unify): canonical
        // workbench-table card frame. Same recipe as /deadlines +
        // /rules/library — `rounded-md border border-divider-subtle
        // overflow-hidden bg-background-default/50`. The inner div
        // is just for the flex split between the Table block and
        // the Pagination footer; the rounded card frame lives here
        // on the outer wrapper so it spans both.
        <div
          ref={setTableCardElement}
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-divider-subtle"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {isLoading ? (
              <ClientTableSkeleton />
            ) : (
              // 2026-05-26 (Yuqi cross-page audit — align /clients to
              // the canonical workbench-table chrome shared with
              // /rules/library + /deadlines):
              //   - Card chrome (rounded-md + border + bg) moved DOWN
              //     to `data-slot="table-container"` via Tailwind
              //     arbitrary-selector chain. Eliminates the nested-
              //     wrapper layer mismatch that caused rounded-corner
              //     slivers when the thead had a different bg.
              //   - TableHeader override → `!bg-background-default-dimmed`
              //     to match the same dimmed gray Deadlines + Rule
              //     library use. The primitive default
              //     (`bg-background-subtle`) reads lighter and broke
              //     the family.
              <Table
                // 2026-05-26 (Yuqi cross-table chrome unify): the
                // table-container chrome overrides (rounded-md +
                // border) moved UP to the outer card wrapper, where
                // they wrap Table + Pagination together as one
                // cohesive rounded card. Only `table-fixed` stays
                // here as a table-layout concern.
                className="table-fixed"
              >
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    // 2026-05-27 (Yuqi /clients ↔ /deadlines parity
                    // refactor): header row drops the primitive's
                    // default `hover:bg-state-base-hover` — header
                    // is a non-interactive band, hover affordance
                    // belongs on data rows. Matches /deadlines
                    // (route obligations.tsx ~line 3648).
                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                      {headerGroup.headers.map((header) => (
                        // 2026-05-27 (Yuqi /clients ↔ /deadlines parity
                        // refactor): apply the canonical column-header
                        // typography (`text-sm font-medium normal-case
                        // tracking-normal text-text-secondary`) on EVERY
                        // TableHead so non-sortable columns ("Assignee",
                        // "Opp.", "Row actions" sr-only) inherit the same
                        // family as the ColumnSortHeader buttons. Mirrors
                        // /deadlines (obligations.tsx ~line 3667).
                        <TableHead
                          key={header.id}
                          className={cn(
                            'text-sm font-medium normal-case tracking-normal text-text-secondary',
                            header.column.columnDef.meta?.headerClassName,
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                {/* 2026-05-27 (Yuqi /clients ↔ /deadlines parity refactor):
                    TableBody adopts the canonical /deadlines body chrome:
                      • `bg-background-default` — solid white body so the
                        primitive's `bg-background-default/50` alpha that
                        the OUTER card paints doesn't bleed through row
                        content
                      • `[&_td]:text-sm` — body text matches /deadlines'
                        sm scan-size
                      • `[&_td]:py-2` — same 8px cell padding (kept from
                        the previous /clients density pass)
                      • `[&_tr]:hover:!bg-state-accent-hover` — accent-
                        tone hover so the row tints with the same color
                        the optional detail panel would use when opened
                        (one visual language for "you're about to act on
                        this row")
                    The previously-applied `[&_tr]:border-b-0` is removed
                    so the primitive's default `border-b border-divider-
                    subtle` (TableRow, packages/ui/.../table.tsx) restores
                    the row hairlines /deadlines has been shipping. This
                    is the structural change Yuqi flagged in the brief
                    ("Missing row dividers between client rows"). */}
                <TableBody className="bg-background-default [&_td]:py-2 [&_td]:text-sm [&_tr]:hover:!bg-state-accent-hover">
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        aria-label={t`Open client detail for ${row.original.name}`}
                        // 2026-05-27 (Yuqi /clients ↔ /deadlines parity
                        // refactor): dropped the per-row
                        // `hover:bg-state-base-hover` so the TableBody-
                        // level `[&_tr]:hover:!bg-state-accent-hover`
                        // wins. Focus-visible still uses the base-hover
                        // tone so keyboard navigation reads as a
                        // distinct state from mouse hover. Matches
                        // /deadlines row-styling layering exactly
                        // (obligations.tsx ~line 3780-3810).
                        className="group/row h-14 cursor-pointer outline-none focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset"
                        onClick={(event) => {
                          // ⌘-click (macOS) / Ctrl-click (Win/Linux) opens
                          // the read-only drawer for a quick glance without
                          // leaving the list — power-user shortcut that
                          // mirrors browsers' "open in new tab" muscle
                          // memory. Plain click commits to the full page.
                          if (event.metaKey || event.ctrlKey) {
                            event.preventDefault()
                            openClientDrawer(row.original.id)
                            return
                          }
                          handleOpenClientDetail(row.original.id)
                        }}
                        onKeyDown={(event) =>
                          handleClientRowKeyDown(event, row.original.id, handleOpenClientDetail)
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cell.column.columnDef.meta?.cellClassName}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <ClientTableEmptyRow colSpan={table.getAllLeafColumns().length} />
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          {/* Pagination footer inside the card frame, separated by a
              top border. Always rendered when there's >1 page; the
              flex-shrink-0 keeps it pinned at the bottom of the card
              while the rows-area scrolls.
              2026-05-26 (Yuqi feedback — "polish everything in
              table-container"): aligned padding to canonical (§6
              `--space-pagination-y` = py-6, `--space-cell-x` = px-2)
              so /clients matches /deadlines exactly. Was `px-3 py-2`
              (slim toolbar feel); now `px-2 py-6` (deliberate card
              footer with breathing room). */}
          {table.getPageCount() > 1 ? (
            <div className="flex shrink-0 items-center justify-between border-t border-divider-subtle bg-background-default px-2 py-6 text-xs text-text-tertiary">
              <span>
                <Plural
                  value={table.getFilteredRowModel().rows.length}
                  one="# client"
                  other="# clients"
                />
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t`Previous page`}
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeftIcon className="size-4" aria-hidden />
                </Button>
                <span className="px-2 tabular-nums">
                  <Trans>
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </Trans>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t`Next page`}
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  <ChevronRightIcon className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}

function handleClientRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  clientId: string,
  onOpenDetail: (clientId: string) => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  onOpenDetail(clientId)
}

/**
 * 2026-05-25 (Yuqi /clients #8): toolbar filter row above the
 * /clients table. Lifts the four column-header funnel filters
 * (Client / States / Entity / Owner) into one scannable strip,
 * matching the /alerts rhythm. Each filter is a toolbar-
 * trigger TableHeaderMultiFilter (wide outline button with the
 * label inline + a count chip when active). Reset on the right
 * clears every filter at once.
 */
function ClientsFilterToolbar({
  searchQuery,
  onSearchChange,
  clientOptions,
  clientFilter,
  onClientFilterChange,
  stateOptions,
  stateFilter,
  onStateFilterChange,
  entityOptions,
  entityFilter,
  onEntityFilterChange,
  ownerOptions,
  ownerFilter,
  onOwnerFilterChange,
}: {
  searchQuery: string
  onSearchChange: (next: string) => void
  clientOptions: TableFilterOption[]
  clientFilter: readonly string[]
  onClientFilterChange: (next: string[]) => void
  stateOptions: TableFilterOption[]
  stateFilter: readonly string[]
  onStateFilterChange: (next: string[]) => void
  entityOptions: TableFilterOption[]
  entityFilter: readonly string[]
  onEntityFilterChange: (next: string[]) => void
  ownerOptions: TableFilterOption[]
  ownerFilter: readonly string[]
  onOwnerFilterChange: (next: string[]) => void
}) {
  const { t } = useLingui()
  const filtersActive =
    searchQuery.length > 0 ||
    clientFilter.length > 0 ||
    stateFilter.length > 0 ||
    entityFilter.length > 0 ||
    ownerFilter.length > 0

  // 2026-05-26 (cross-table drift #5 + Step 8 F-X02/F-X03):
  // /clients now uses the canonical collapsible-search pattern shared
  // with /deadlines and /rules/library. Ghost-icon at rest, expands
  // inline into the canonical `SearchInput` primitive on click OR on
  // `/` hotkey. Step 8 migrated FROM hand-rolled `<Input type="search">`
  // + bespoke XIcon clear + raw window keydown TO the SearchInput
  // primitive; HEAD then wrapped the primitive in a collapsible
  // `ClientsSearchControl` so the icon-only rest state matches
  // Yuqi's later directive. Both fixes preserved.
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  // 2026-05-26 (Yuqi /clients feedback #1 — "search at the right
  // end"): toolbar layout split into two clusters separated by
  // `flex-1` spacer.
  //   • LEFT: filter dropdowns (Client / States / Entity / Owner) +
  //     Reset link — primary "narrow the directory" controls
  //   • RIGHT: collapsible search icon — moved here from the left to
  //     match the canonical "filters on the left, search on the right"
  //     reading order. The icon stays ghost-only at rest; expands
  //     into the input on click or `/` hotkey.
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Step 8 added an inline-always SearchInput at the toolbar start;
          HEAD's collapsible icon pattern (ClientsSearchControl, rendered
          later in the toolbar) is the newer design Yuqi requested.
          Dropped Step 8's inline duplicate — the SearchInput primitive
          IS used, just wrapped in the collapsible affordance. */}
      <TableHeaderMultiFilter
        trigger="toolbar"
        label={t`Client`}
        options={clientOptions}
        selected={clientFilter}
        emptyLabel={t`No clients`}
        searchable
        searchPlaceholder={t`Search clients`}
        onSelectedChange={onClientFilterChange}
      />
      <TableHeaderMultiFilter
        trigger="toolbar"
        label={t`States`}
        options={stateOptions}
        selected={stateFilter}
        emptyLabel={t`No states`}
        searchable
        searchPlaceholder={t`Search states`}
        onSelectedChange={onStateFilterChange}
      />
      <TableHeaderMultiFilter
        trigger="toolbar"
        label={t`Entity`}
        options={entityOptions}
        selected={entityFilter}
        emptyLabel={t`No entities`}
        onSelectedChange={onEntityFilterChange}
      />
      <TableHeaderMultiFilter
        trigger="toolbar"
        label={t`Assignee`}
        options={ownerOptions}
        selected={ownerFilter}
        emptyLabel={t`No assignees`}
        searchable
        searchPlaceholder={t`Search assignees`}
        onSelectedChange={onOwnerFilterChange}
      />
      <Button
        variant="ghost"
        size="sm"
        disabled={!filtersActive}
        onClick={() => {
          // 2026-05-26 (Yuqi /clients directory pivot brief): Reset
          // clears search alongside the structural filters so the
          // CPA returns to the full directory in one click.
          // 2026-05-26 (Yuqi step-8 data-finding audit — F-X01/F-X12):
          // label changed from "Reset" to "Clear filters" to align
          // with /deadlines, /alerts, and /rules/library. "Reset"
          // implied broader scope (density, columns, etc.) than the
          // affordance actually has — only filters get cleared.
          onSearchChange('')
          onClientFilterChange([])
          onStateFilterChange([])
          onEntityFilterChange([])
          onOwnerFilterChange([])
        }}
      >
        <Trans>Clear filters</Trans>
      </Button>
      {/* Spacer pushes the search affordance to the right edge. */}
      <div className="ml-auto">
        <ClientsSearchControl
          inputRef={searchInputRef}
          value={searchQuery}
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onChange={onSearchChange}
        />
      </div>
    </div>
  )
}

// 2026-05-26 (Yuqi cross-table drift #5 — "fix search affordances"):
// collapsible search control for `/clients`. Renders as a ghost icon
// button at rest; expands inline into the canonical `SearchInput` on
// click or `/` hotkey. Open state is lifted to the parent so the `/`
// hotkey can expand → focus in one gesture. Mirrors /deadlines
// `ObligationQueueSearchControl` and /rules/library `RuleSearchControl`
// — three surfaces, one pattern.
function ClientsSearchControl({
  inputRef,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  open: boolean
  onOpenChange: (next: boolean) => void
  onChange: (next: string) => void
}) {
  const { t } = useLingui()
  // Stay open while a query is present — collapsing would hide
  // active filter state from the user.
  const isOpen = open || value.length > 0
  // `/` hotkey expands the collapsed control AND focuses the input
  // in one gesture. SearchInput's own `hotkey` prop can't drive this
  // path because when collapsed the input isn't mounted yet.
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  useAppHotkey(
    '/',
    () => {
      onOpenChange(true)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    },
    {
      enabled: !shortcutsBlocked,
      meta: {
        id: 'clients.focus-search',
        name: 'Filter clients',
        description: 'Focus the /clients filter input.',
        category: 'practice',
        scope: 'route',
      },
    },
  )
  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t`Filter clients`}
        title={t`Filter clients  ·  press / to focus`}
        onClick={() => {
          onOpenChange(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        className="shrink-0"
      >
        <SearchIcon className="size-4" aria-hidden />
      </Button>
    )
  }
  return (
    <div className="relative w-full md:w-56 md:flex-none">
      {/* 2026-05-27 (Yuqi step-8 data-finding audit — F-X05 sibling
          on /clients): collapsed magnifier announces "Filter clients"
          via aria-label above, but the expanded input previously
          said "Search clients" — same accessible-name drift the
          /deadlines fix (F-X05) corrected. Aligning to "Filter
          clients" so screen-reader users hear one control name
          regardless of collapsed/expanded state. Placeholder still
          carries the field hint ("name or EIN") for sighted users. */}
      <SearchInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder={t`Filter by name or EIN`}
        ariaLabel={t`Filter clients`}
        onFocus={() => onOpenChange(true)}
        onBlur={() => {
          if (value.length === 0) onOpenChange(false)
        }}
      />
    </div>
  )
}

/**
 * Top-of-page action strip for `/clients`. Replaces the older
 * four-tile configuration read-out ("Ready for rules · Needs facts ·
 * Imported · States covered") with signals that drive a same-day
 * action.
 *
 * See docs/Design/clients-list-summary-strip-redesign.md for the
 * design rationale. The strip renders nothing when every signal is
 * zero — quiet is the reward.
 *
 * Tiles render only when their count is > 0:
 *   - **At risk** — clients with ≥1 overdue obligation (destructive
 *     tone). Click -> `/deadlines?status=blocked` so the CPA lands
 *     on the actionable queue, not a filtered client list.
 *   - **Waiting on client** — clients with ≥1 `waiting_on_client`
 *     obligation (warning tone). Click -> `/deadlines?status=waiting_on_client`.
 *   - **Alert hits** — clients matched by a recent Alert
 *     (review tone). Click → applies the `pulse=affected` filter on
 *     the current list so the CPA can triage which of *their*
 *     clients are touched by the new source change.
 *
 * The **Needs facts** banner sits above the tiles and renders only
 * when `needsFactsCount > 0` — it's a pre-deadline-pressure setup
 * gap, not an in-flight workload signal, so it earns a distinct
 * treatment.
 */
function ClientsActionStrip({
  isLoading,
  needsFactsCount,
  onFixNeedsFacts,
}: {
  isLoading: boolean
  needsFactsCount: number
  onFixNeedsFacts: () => void
}) {
  // 2026-05-26 (Yuqi /clients directory pivot brief): the 3-tile
  // StatTile strip (At risk / Waiting on client / Alert hits) is
  // retired. /clients is now a directory-first surface; the
  // triage signals belong on /today and /deadlines where
  // dollar-exposure context is also present. The needs-facts
  // banner stays — it's actionable setup work specific to the
  // directory itself, not a triage tile.
  const hasBanner = needsFactsCount > 0
  if (isLoading) return <ClientsActionStripSkeleton />
  if (!hasBanner) return null

  // Chrome mirrors the canonical InfoBanner sibling that sits right
  // above it (the import-CSV tip): h-12 row, `bg-background-subtle`,
  // `border border-divider-subtle`, `rounded-md`. AlertTriangle + red
  // button keep the destructive tone — this is "warning + action," not
  // "tip + dismiss."
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-md border border-divider-subtle bg-background-subtle px-3 py-2 sm:h-12 sm:flex-row sm:items-center sm:gap-3 sm:py-0"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <AlertTriangleIcon className="size-4 shrink-0 text-text-warning" aria-hidden />
        <p className="min-w-0 text-sm text-text-secondary">
          <Plural
            value={needsFactsCount}
            one="# client is missing state or entity type — the rule library is skipping it."
            other="# clients are missing state or entity type — the rule library is skipping them."
          />
        </p>
      </div>
      <Button type="button" size="sm" variant="destructive-primary" onClick={onFixNeedsFacts}>
        <Trans>Fix now</Trans>
      </Button>
    </div>
  )
}

// 2026-05-26 (Yuqi /clients directory pivot brief): skeleton scoped
// to the needs-facts banner only. The 3-tile skeleton retired with
// the StatTile strip. `ClientsStatTile` + `ClientsStatTileSkeleton`
// also retired — they were only used by the strip.
function ClientsActionStripSkeleton() {
  return <Skeleton className="h-10 w-full" aria-busy="true" />
}

function ClientTableSkeleton() {
  // 2026-05-27 (Yuqi /clients ↔ /deadlines parity refactor): skeleton
  // column widths track the live-table widths exactly so the loading
  // shimmer doesn't shift the layout when real rows mount.
  // 2026-05-28 (audit P3-1): widths now reference the shared
  // `CLIENTS_COL_WIDTH` const so live + skeleton can't drift.
  const columns = [
    { id: 'client', className: CLIENTS_COL_WIDTH.client, header: 'w-14', cell: 'w-32' },
    { id: 'states', className: CLIENTS_COL_WIDTH.state, header: 'w-14', cell: 'w-16' },
    { id: 'entity', className: CLIENTS_COL_WIDTH.entity, header: 'w-12', cell: 'w-14' },
    { id: 'nextDue', className: CLIENTS_COL_WIDTH.nextDue, header: 'w-16', cell: 'w-28' },
    { id: 'open', className: CLIENTS_COL_WIDTH.open, header: 'w-28', cell: 'w-4' },
    { id: 'done', className: CLIENTS_COL_WIDTH.done, header: 'w-10', cell: 'w-4' },
    {
      id: 'owner',
      className: CLIENTS_COL_WIDTH.assignee,
      header: 'w-12',
      cell: 'w-6 rounded-full',
    },
    { id: 'opp', className: CLIENTS_COL_WIDTH.opportunities, header: 'w-10', cell: 'w-8' },
  ] as const
  return (
    // 2026-05-26 (Yuqi cross-page audit): skeleton matches the live
    // table's chrome — card frame on table-container, dimmed-gray
    // header bg.
    <Table
      className={cn(
        'table-fixed',
        '[&_[data-slot=table-container]]:overflow-hidden',
        '[&_[data-slot=table-container]]:rounded-md',
        '[&_[data-slot=table-container]]:border',
        '[&_[data-slot=table-container]]:border-divider-subtle',
        '[&_[data-slot=table-container]]:bg-background-default',
      )}
      aria-busy="true"
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((column) => (
            <TableHead
              key={column.id}
              className={cn(
                'text-sm font-medium normal-case tracking-normal text-text-secondary',
                column.className,
              )}
            >
              <Skeleton className={cn('h-3', column.header)} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      {/* 2026-05-27 (Yuqi /clients ↔ /deadlines parity refactor):
          dropped `[&_tr]:border-b-0` so skeleton rows show the same
          hairlines the live table renders — loading state previews
          the real structure rather than dissolving the rows. */}
      <TableBody className="bg-background-default [&_td]:py-2 [&_td]:text-sm">
        {[0, 1, 2, 3, 4].map((row) => (
          <TableRow key={row}>
            {columns.map((column) => (
              <TableCell key={column.id} className={column.className}>
                <Skeleton className={cn('h-5', column.cell)} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ClientTableEmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center gap-1 text-xs">
          <span className="font-medium text-text-primary">
            <Trans>No clients match these filters</Trans>
          </span>
          <span className="text-text-tertiary">
            <Trans>Clear search or filters to return to the full practice directory.</Trans>
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}
/**
 * Owner avatar for the client table. Delegates the assigned-name case
 * to the canonical `AssigneeAvatar` shared with /deadlines so the two
 * surfaces stay shape-locked; the null-name silhouette is local because
 * /clients shows a muted person icon while /deadlines opens an inline
 * picker (different IA per surface).
 */
function ClientAssigneeAvatar({
  name,
  currentUserName,
}: {
  name: string | null
  currentUserName: string | null
}) {
  const { t } = useLingui()
  if (!name) {
    return (
      <span
        aria-label={t`Unassigned`}
        title={t`Unassigned`}
        className="inline-flex size-8 items-center justify-center rounded-full bg-background-subtle text-text-tertiary"
      >
        <UserRoundIcon className="size-3.5" aria-hidden />
      </span>
    )
  }
  const isMine =
    currentUserName !== null && name.trim().toLowerCase() === currentUserName.toLowerCase()
  const title = isMine ? t`Assigned to you (${name})` : name
  return <AssigneeAvatar name={name} isMine={isMine} title={title} />
}
// 2026-05-26 (Yuqi cross-table drift #10 — "Owner/Assignee avatar
// size + initials hash consistency"): the ASSIGNEE_TINTS palette + FNV
// hash that used to live inline here moved to `@/lib/assignee-tint` so
// /deadlines AssigneeAvatar can resolve the same per-name tint. Same
// person, same color, on every surface.

function ClientReadinessBadge({
  readiness,
  compact,
}: {
  readiness: ClientReadiness | undefined
  compact: boolean
}) {
  // 2026-05-25 (status-pill audit #4): dropped the inner
  // `BadgeStatusDot`. Chip fill already carries the tone (warning
  // amber / success green); the leading dot doubled the signal
  // and broke the canonical "filled chip → no dot" rule from the
  // status-pill audit §3.3.
  if (readiness?.status === 'needs_facts') {
    return (
      <Badge variant="warning" className="text-xs">
        {compact ? <Trans>Needs facts</Trans> : <MissingFactsLabel readiness={readiness} />}
      </Badge>
    )
  }

  return (
    <Badge variant="success" className="text-xs">
      <Trans>Ready for rules</Trans>
    </Badge>
  )
}

function MissingFactsLabel({ readiness }: { readiness: ClientReadiness }) {
  if (readiness.missingRequiredFacts.includes('state')) {
    return <Trans>Needs filing state</Trans>
  }
  return <Trans>Needs facts</Trans>
}
function ClientOpportunityCountBadge({ count }: { count: number }) {
  const { t } = useLingui()
  return (
    <Badge variant="secondary" className="text-xs" aria-label={t`${count} opportunity match(es)`}>
      <SparklesIcon data-icon="inline-start" aria-hidden />
      {count}
    </Badge>
  )
}

function ClientAlertMatchBadge({ matches }: { matches: readonly ClientAlertMatch[] }) {
  const { t } = useLingui()
  const count = matches.length
  const titles = matches
    .slice(0, 3)
    .map((match) => match.title)
    .join('\n')
  const tooltip = count > 3 ? `${titles}\n+${count - 3} more` : titles
  const label =
    count > 1
      ? t`Alerts · ${count}`
      : matches[0]?.taxType
        ? t`Alerts · ${formatTaxCode(matches[0].taxType)}`
        : t`Alerts`
  return (
    <Badge variant="warning" className="shrink-0" title={tooltip} aria-label={t`Alert: ${tooltip}`}>
      <ActivityIcon data-icon="inline-start" aria-hidden />
      {label}
    </Badge>
  )
}
// Mailbox tab — and its supporting ClientMailboxPanel /
// mailboxAddressForClient — were removed when the tab itself was
// dropped. The Phase 2 forwarding-address widget will return once the
// inbound-email infrastructure ships; see git history for the prior
// implementation.
