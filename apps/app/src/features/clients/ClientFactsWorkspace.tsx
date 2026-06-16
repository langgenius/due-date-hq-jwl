import { type KeyboardEvent, type ReactNode, useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  flexRender,
  getCoreRowModel,
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
  ExternalLinkIcon,
  EyeIcon,
  LinkIcon,
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
import { SortableHeader } from '@/components/patterns/sortable-header'
import { StatBand, type StatBandItem } from '@/components/patterns/stat-band'
import { RowActionsMenu, type RowActionsMenuItem } from '@/components/patterns/row-actions-menu'
import { CollapsibleSearch } from '@/components/primitives/collapsible-search'
import { DueCountdownText } from '@/components/primitives/due-date-label'
import { RULE_JURISDICTION_LABELS } from '@/features/rules/rules-console-model'
import { formatDate, formatDatePretty } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { ObligationStatusReadBadge } from '@/features/obligations/status-control'

import { ClientsEmptyState } from './ClientsEmptyState'
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
  // Entity labels (LLC / S corp / Partnership / …) flow in from the
  // route so the workspace can render them in the ENTITY column without
  // depending on the route module (avoids a circular import — route
  // imports workspace).
  entityLabels: Record<ClientEntityType, string>
  isLoading: boolean
  // Search wiring. `searchQuery` is the current URL-backed `q` value;
  // the workspace surfaces it via the toolbar's search input.
  // `onSearchChange` writes back to the URL on every keystroke (the
  // route debounces if needed).
  searchQuery: string
  onSearchChange: (value: string) => void
  entityFilter: readonly ClientEntityType[]
  stateFilter: readonly string[]
  ownerFilter: readonly string[]
  alertMatchesByClient: ReadonlyMap<string, readonly ClientAlertMatch[]>
  obligationSummariesByClient: ReadonlyMap<string, ClientObligationListSummary>
  onEntityFilterChange: (value: string[]) => void
  onStateFilterChange: (value: string[]) => void
  onOwnerFilterChange: (value: string[]) => void
  // Deep-link-only filters (readiness/source/pulse) the toolbar can't otherwise
  // see — so "Clear filters" can enable + reset them. (audit 2026-06-16)
  extraFiltersActive?: boolean
  onClearAllFilters?: () => void
  onImport: () => void
  canImport: boolean
  // The prominent empty-state hero offers an "Add one manually" CTA
  // alongside Import. Optional so callers that don't wire a create flow
  // fall back to the import-only hero.
  onCreateClient?: (() => void) | undefined
  canCreate?: boolean | undefined
  // Onboarding "Load sample data" chip in the empty-state hero.
  onSampleData?: (() => void) | undefined
}

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
} as const

/**
 * `TabSection` — canonical section primitive for the client detail
 * tabs (Work / Client info / Discover / Activity). Unifies the section
 * vocabulary across all four tabs so the body reads as one surface.
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
    // 2026-06-16 (Yuqi "band EVERY section"): the section heading is a thin
    // LIGHT HEADER BAND (bg-background-subtle + hairline border + min-h-8 +
    // py-1.5) matching the DetailSectionCard band on /deadlines + /alerts. The
    // section stays FRAMELESS (no enclosing card) on purpose — its content
    // already carries its own card chrome (compliance panel, jurisdiction
    // form), so a wrapping card would double-frame ("frames in frames"). The
    // band is the header bar; the content sits below it. Outer `gap-4` is the
    // heading→body rhythm.
    <section className="flex flex-col gap-4">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-divider-subtle bg-background-subtle px-4 py-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
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
  // The relative-due label is `text-sm font-medium` (500 — "key data"
  // weight). The next-due date is the PRIMARY scannable data on the
  // directory, but COLOR (red/amber) carries the urgency, not weight:
  // red + 600 would double-highlight, which the type-weight rule bans.
  // Wording comes from the shared `DueCountdownText` — the same compact
  // "5d late" / "in 5d" / "today" vocabulary the /deadlines DUE column and
  // the dashboard rows use, so a CPA reads one signal across surfaces.
  if (days < 0) {
    return (
      <span className="whitespace-nowrap text-sm font-medium text-text-destructive tabular-nums">
        <DueCountdownText days={days} />
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="whitespace-nowrap text-sm font-medium text-text-warning">
        <DueCountdownText days={days} />
      </span>
    )
  }
  if (days <= 7) {
    return (
      <span className="whitespace-nowrap text-sm font-medium text-text-warning tabular-nums">
        <DueCountdownText days={days} />
      </span>
    )
  }
  return (
    <span className="whitespace-nowrap text-sm font-medium text-text-primary">
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
  // State codes use the canonical `Badge variant="outline"` pill the
  // entity badge uses two cells over. Each state code reads as a
  // uniform bordered pill — primary, additional, and overflow ("+N")
  // all share the same chrome so the meta-row reads as one consistent
  // identity strip.
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
 * Column-header SORT button. Wraps the label + a sort-arrow icon in a
 * single click target so the whole label is clickable
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

  // 2026-06-16 (audit): delegates to the shared SortableHeader primitive so
  // /clients and /deadlines sort headers read identically (chevron icon set +
  // faint idle dual-chevron — the directory used to render NO idle affordance,
  // looking inert until clicked).
  return (
    <SortableHeader
      label={label}
      direction={sortState}
      onToggle={onToggle}
      align={align}
      sortLabel={sortLabel}
    />
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
  stateFilter,
  ownerFilter,
  entityFilter,
  alertMatchesByClient,
  obligationSummariesByClient,
  onEntityFilterChange,
  onStateFilterChange,
  onOwnerFilterChange,
  extraFiltersActive,
  onClearAllFilters,
  onImport,
  canImport,
  onCreateClient,
  canCreate,
  onSampleData,
}: ClientFactsWorkspaceProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const currentUserName = useCurrentUserName()
  // Declared above the columns useMemo because the rowActions column
  // references this in its deps array; the deps eval order forces it
  // earlier in the closure.
  const handleOpenClientDetail = useCallback(
    (clientId: string) => {
      // Persist the currently-visible client order to sessionStorage at
      // navigation time so the detail page can offer prev/next cycling
      // across the same filter subset.
      // Uses the `clientDetailPath()` helper for the readable
      // /clients/<slug>-<id> URL. Falls back to the raw id when the
      // client isn't in the current list.
      writeClientCycleList(filteredClients.map((client) => client.id))
      const client = clients.find((candidate) => candidate.id === clientId)
      void navigate(client ? clientDetailPath(client) : `/clients/${clientId}`)
    },
    [clients, filteredClients, navigate],
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
  // Entity options for the ENTITY column filter dropdown. Counts how
  // many clients sit at each entity type so the dropdown shows
  // "S corp · 7" / "LLC · 5" etc.
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
  // Column order ("Other states" is merged into the unified States
  // column):
  //
  //   Client · States (primary + others inline) ·
  //   Next due (date + form + readiness) ·
  //   # Services · # Open · Owner (avatar)
  //
  // Source column is dropped — provenance trivia, not a reason to
  // pick a row. The filter param + filter pipeline are still wired
  // for deep links but no longer surface as a column header.
  // Readiness chip lives in the Next due composite cell — see
  // ClientsActionStrip's Needs facts banner for the actionable filter
  // entry.
  const columns = useMemo<ColumnDef<ClientPublic>[]>(
    () => [
      {
        accessorKey: 'name',
        // All four filters (Client / States / Entity / Owner) live in
        // a single ToolbarFilters row above the table, matching the
        // Alerts page rhythm. Column headers keep only the sort arrow.
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
              {/* No entity-type sub-line under the client name: entity
                  is already filterable via the column dropdown + visible
                  on the detail page header chip, so surfacing it under
                  every list row was redundant noise. The readiness chip
                  lives in this row so the page-level scan sees identity +
                  setup state together; the Next-due cell then carries
                  ONLY urgency (a single tone-coded line). */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* Client name is text-base regular: it scales above
                    the other body cells (which inherit text-sm) so it
                    reads as primary identity without dominating the row,
                    while regular weight keeps it from feeling heavy.
                    Deadlines + Rules library share this canonical title
                    scale. */}
                <span
                  className="truncate text-base text-text-primary group-hover:underline"
                  // The truncated tail is the disambiguating part of a
                  // client name — keep it recoverable on hover.
                  title={row.original.name}
                >
                  {row.original.name}
                </span>
                {row.original.isSample ? (
                  <Badge variant="secondary" className="shrink-0">
                    {t`Sample`}
                  </Badge>
                ) : null}
                {readiness?.status === 'needs_facts' ? (
                  <ClientReadinessBadge readiness={readiness} compact />
                ) : null}
                {matches && matches.length > 0 ? <ClientAlertMatchBadge matches={matches} /> : null}
              </div>
              {/* Hover-revealed peek affordance: row click still goes to
                  the full page; this opens the read-only drawer for a
                  fast "is this the right client?" glance. ⌘-click on
                  the row is also wired below for a power-user shortcut.
                  `group-focus-within` reveals the button when a sibling
                  control inside the row receives focus, not only when
                  the eye itself is focused, so keyboard navigation
                  surfaces the affordance as soon as the row enters
                  focus. */}
              <ClientPeekHoverCard clientId={row.original.id}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={t`Peek ${row.original.name} details`}
                  title={t`Peek details (without leaving the list)`}
                  className="ml-auto shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-text-primary focus-visible:opacity-100"
                >
                  <EyeIcon className="size-4" aria-hidden />
                </Button>
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
        // The state cell uses the bordered `Badge variant="outline"`
        // pill so every state code reads identically to the Entity badge
        // two cells over. Same chrome applied to additional and overflow
        // chips so the row reads as one consistent strip.
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
          // Width brings /clients column rhythm in line with
          // /deadlines' `w-[90px]` state column (slightly wider here
          // only because /clients also surfaces up to 2 additional-state
          // badges + the overflow "+N" chip on the same row).
          headerClassName: CLIENTS_COL_WIDTH.state,
          cellClassName: CLIENTS_COL_WIDTH.state,
        },
      },
      {
        // ENTITY column renders a single chip per row showing the
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
        // Entity badge matches the detail-page header chip's `text-xs`
        // shape so the same identity fact reads the same way on both
        // surfaces. No tabular-nums — entity labels aren't numeric
        // ("S corp", "LLC").
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
        // NEXT DUE is a 2-line composite cell that absorbs status:
        //   Line 1: relative urgency ("In 2 days" / "8d late").
        //   Line 2: calendar date so the CPA can read the absolute
        //           deadline without hovering.
        //   Inline: status pill next to the date — answers "Xd late, but
        //           why?" without a separate STATUS column.
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
                {/* Exact-date secondary line uses `text-text-secondary`
                    to match the /deadlines queue row treatment — one
                    tone for the same job. Uses `formatDate()` for the
                    prose date format /deadlines uses (e.g. "May 8")
                    rather than mono raw ISO (mono numbers read as
                    "code/identifier-y" when these are just dates),
                    plus `tabular-nums` for column alignment. */}
                <span className="text-caption tabular-nums text-text-secondary">
                  {formatDate(summary.nextDueDate)}
                </span>
                {summary.nextDueStatus ? (
                  // Status pill renders at the canonical
                  // ObligationStatusReadBadge default size — one status →
                  // one pill size across the product, so it matches the
                  // /deadlines queue's status pill.
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
      // Services column is hidden by default (via columnVisibility
      // below) but accessible via the column-toggle UI for the CPA who
      // actively reviews scope-of-work.
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
          // Numeric cells are left-aligned + sans-serif tabular-nums.
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
          // Numeric columns are left-aligned to match the /deadlines +
          // /rules/library family. Right-aligned numbers read as a
          // balance sheet; left-aligned matches the rest of the
          // workbench tables and the canonical TableCell default.
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
          // this client. Left-aligned numeric matches the table family.
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
          // Numeric columns are left-aligned to match the rest of the
          // workbench tables.
          headerClassName: CLIENTS_COL_WIDTH.open,
          cellClassName: CLIENTS_COL_WIDTH.open,
        },
      },
      {
        // Counts obligations whose status is done/completed (terminal
        // states). Built from the widened obligations query that
        // includes those statuses alongside the open ones — see route
        // CLIENTS_LIST_OBLIGATION_STATUSES. Plain count, no deep link
        // (we don't have a routed view for closed obligations yet; the
        // client detail's Activity tab is the right destination when
        // we add that link).
        // Labeled `Filed` (not `Filed YTD`) because this summary is
        // status-based, not a year-to-date audit timestamp filter — it
        // counts rows already in the Filed or Completed terminal states.
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
            // Left-aligned, using the `title` const above for the
            // singular/plural tooltip copy.
            return (
              <span className="tabular-nums text-text-tertiary" title={title}>
                0
              </span>
            )
          }
          // Left-aligned numeric matches the table family.
          return (
            <span className="tabular-nums text-text-secondary" title={title}>
              {count}
            </span>
          )
        },
        meta: {
          // Numeric columns are left-aligned to match the rest of the
          // workbench tables.
          headerClassName: CLIENTS_COL_WIDTH.done,
          cellClassName: CLIENTS_COL_WIDTH.done,
        },
      },
      {
        accessorKey: 'assigneeName',
        // Column label is "Assignee" to match /deadlines, and the cell
        // renders the `<AssigneeAvatar>` primitive, so header noun and
        // cell motif agree across both workbench tables. The underlying
        // RPC field stays `assigneeName`; only the header copy differs,
        // so the client-detail "Owner" treatment (alongside an editable
        // assignee pill) and the toolbar filter chip's "Owner" label
        // remain intact.
        header: () => (
          // 2026-06-10 (Yuqi "follow Deadline's table"): plain span inherits
          // the canonical TableHead eyebrow style (11/600 uppercase
          // tracking-eyebrow-tight) — matches /deadlines' Assignee header and the
          // now-uppercase sort-button labels, so the whole header row is one
          // consistent uppercase rhythm.
          <span>
            <Trans>Assignee</Trans>
          </span>
        ),
        cell: ({ row }) => {
          // The isMine accent + title construction are inlined here.
          // The unassigned branch lives inside the AssigneeAvatar
          // primitive (null name).
          const name = row.original.assigneeName
          const isMine =
            currentUserName !== null &&
            name !== null &&
            name.trim().toLowerCase() === currentUserName.toLowerCase()
          const title = name === null ? t`Unassigned` : isMine ? t`Assigned to you (${name})` : name
          return <AssigneeAvatar name={name} isMine={isMine} title={title} />
        },
        meta: {
          headerClassName: CLIENTS_COL_WIDTH.assignee,
          cellClassName: CLIENTS_COL_WIDTH.assignee,
        },
      },
      {
        // Canonical row-action menu lives at the trailing edge of every
        // row, mirroring how Stripe's Transactions table exposes per-row
        // affordances. Hidden until row-hover so the table reads clean
        // at rest;
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
            // 2026-06-16 (audit): removed the "Quick peek" item — on the
            // /clients route the drawer is suppressed (the list defers to the
            // full page), so it just raw-navigated to /clients/<uuid> (an extra
            // redirect that skipped the prev/next cycle list). The hover peek
            // card on the client name covers true "glance" use; "Open detail"
            // covers navigation.
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
      alertMatchesByClient,
      t,
    ],
  )

  // The table consumes `filteredClients` directly — URL-backed filters
  // (states / entity / owner / search) are the only narrowing controls
  // on /clients.

  // Column sort state for the sort-arrow indicators
  // (CLIENT / STATES / ENTITY / NEXT DUE / OPEN / FILED). Default sort
  // is unset so rows render in the API's `due_asc` order — clicking
  // a header opts in. Stored locally because sort feels transient (a
  // "show me by ___" gesture) rather than something to deep-link.
  const [sorting, setSorting] = useState<SortingState>([])
  // No client-side pagination: /clients renders the full filtered set in
  // one continuously-scrolling card body (sticky header), matching the
  // /deadlines queue's scroll model instead of a prev/next page footer.
  // The directory is already fully loaded client-side (listByFirm caps at
  // CLIENT_LIST_LIMIT = 500), so the whole list fits in one scroll region
  // with no fetch-on-scroll needed.
  const table = useReactTable({
    data: filteredClients,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
        // `servicesCount` stays hidden by default per its prior
        // behavior — the cell renders "—" for typical firms that
        // haven't fully populated filing profiles, but the column
        // is restored (Yuqi follow-up — "bring back services") so
        // it's available via the column-toggle UI for any CPA who
        // tracks scope-of-work here.
        servicesCount: false,
      },
    },
  })

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

      {/* Directory summary above the filter toolbar — the shared
          StatBand (Total clients · Active deadlines · At risk). Live
          counts come from the loaded clients + obligation summaries.
          Hidden on the empty-state surface (clients.length === 0). */}
      {clients.length > 0 ? (
        <ClientsKpiStrip
          isLoading={isLoading}
          totalClients={clients.length}
          statesCovered={factsModel.summary.statesCovered}
          needsFactsCount={factsModel.summary.needsFacts}
          obligationSummariesByClient={obligationSummariesByClient}
        />
      ) : null}

      {/* Toolbar filter row above the table — same rhythm as /alerts,
          where the filter dropdowns live in their own row above the
          alert list. This surfaces all four filters in one scannable
          strip (rather than inline funnel icons per column header);
          column headers keep only the sort arrow. A Reset button on the
          right clears every filter at once. */}
      <ClientsFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        stateOptions={stateOptions}
        stateFilter={stateFilter}
        onStateFilterChange={onStateFilterChange}
        entityOptions={entityOptions}
        entityFilter={entityFilter}
        onEntityFilterChange={onEntityFilterChange}
        ownerOptions={ownerOptions}
        ownerFilter={ownerFilter}
        onOwnerFilterChange={onOwnerFilterChange}
        extraFiltersActive={extraFiltersActive}
        onClearAllFilters={onClearAllFilters}
      />

      {/* Table is framed in the canonical bordered card with `flex-1
          min-h-0` rows-area + pinned pagination footer. Mirrors
          /deadlines so /clients renders identically. Outer container
          in routes/clients.tsx is height-constrained at xl so this
          flex-1 has somewhere to grow into.

          On small viewports / when there are zero clients, the empty
          state replaces the card-frame entirely so the dashed
          ClientTableEmptyRow doesn't sit inside a doubly-bordered
          shell. */}
      {clients.length === 0 && !isLoading ? (
        // The prominent full-surface hero — integration-logo strip,
        // headline, Import/Add CTAs, outcomes strip, and the
        // sample-data tour chip.
        <ClientsEmptyState
          onImport={onImport}
          canImport={canImport}
          onCreate={onCreateClient}
          canCreate={canCreate}
          onSampleData={onSampleData}
        />
      ) : (
        // Canonical workbench-table card frame. Same recipe as
        // /deadlines + /rules/library. The rounded card frame lives on
        // the outer wrapper; the inner div is the single scroll region
        // that holds the whole directory.
        <div
          // Outer card border is `divider-regular` (8% alpha) — the
          // visible-but-quiet canonical tone.
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-divider-regular"
        >
          {/* Single continuous scroll region (no pagination): the full
              filtered directory scrolls here, with the table header pinned
              via `sticky top-0` so column labels stay visible. Matches the
              /deadlines queue's scroll model. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {isLoading ? (
              <ClientTableSkeleton />
            ) : (
              // Canonical workbench-table chrome shared with
              // /rules/library + /deadlines:
              //   - Card chrome (rounded-lg + border + bg) lives on
              //     `data-slot="table-container"` via a Tailwind
              //     arbitrary-selector chain. This eliminates the
              //     nested-wrapper layer mismatch that caused rounded-
              //     corner slivers when the thead had a different bg.
              //   - TableHeader override → `!bg-background-default-dimmed`
              //     to match the same dimmed gray Deadlines + Rule
              //     library use. The primitive default
              //     (`bg-background-subtle`) reads lighter and broke
              //     the family.
              <Table
                // The table-container chrome overrides (rounded-lg +
                // border) live on the outer card wrapper, where they
                // wrap Table + Pagination together as one cohesive
                // rounded card. `table-fixed` is a table-layout concern.
                // 2026-06-10 (Yuqi "follow Deadline's table"): the header
                // recipe mirrors /deadlines' obligation-queue table
                // (routes/obligations.tsx) — h-9 section-tinted header cells
                // and UPPERCASE 11/600 tracking-eyebrow-tight sort-button labels,
                // so the two workbench tables read identically.
                className="table-fixed [&_th]:bg-background-section [&_thead_th]:h-9 [&_thead_th]:py-0 [&_th_button]:!text-column-label [&_th_button]:!font-semibold [&_th_button]:!uppercase"
              >
                {/* Sticky header — stays pinned while the rows scroll
                    under it. The `[&_th]:bg-background-section` above keeps
                    the row opaque so scrolling content doesn't bleed through. */}
                <TableHeader className="sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(header.column.columnDef.meta?.headerClassName)}
                          // 2026-06-16 (audit): expose sort state to assistive
                          // tech on the header cell (the button only carries
                          // aria-pressed). /deadlines already did this; /clients
                          // didn't — now both do.
                          aria-sort={
                            header.column.getCanSort()
                              ? header.column.getIsSorted() === 'asc'
                                ? 'ascending'
                                : header.column.getIsSorted() === 'desc'
                                  ? 'descending'
                                  : 'none'
                              : undefined
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                {/* TableBody uses the canonical /deadlines body chrome:
                      • `[&_td]:text-sm` — body text matches /deadlines'
                        sm scan-size
                      • `[&_td]:py-2` — 8px cell padding (Clients list is
                        a dense scan surface)
                      • `[&_tr]:hover:!bg-state-accent-hover` — accent-
                        tone hover so the row tints with the same color
                        the optional detail panel would use when opened
                        (one visual language for "you're about to act on
                        this row")
                    Row hairlines come from the primitive's default
                    `border-b border-divider-subtle` (TableRow,
                    packages/ui/.../table.tsx). */}
                <TableBody className="[&_td]:py-2 [&_td]:text-sm [&_tr]:hover:!bg-state-accent-hover">
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        aria-label={t`Open client detail for ${row.original.name}`}
                        // No per-row hover bg so the TableBody-level
                        // `[&_tr]:hover:!bg-state-accent-hover` wins.
                        // Focus-visible uses the base-hover tone so
                        // keyboard navigation reads as a distinct state
                        // from mouse hover. Matches /deadlines row-styling
                        // layering exactly.
                        // The selected-row pattern is `fill
                        // state-accent-hover + 2px left accent stroke`
                        // (matches the rules table + alert AffectedClients
                        // selected rows). The TableBody supplies the fill
                        // on hover; the inset 2px shadow adds the left
                        // accent bar without shifting layout (border
                        // would).
                        className="group/row h-14 cursor-pointer outline-none hover:shadow-[inset_2px_0_0_var(--color-state-accent-solid)] focus-visible:bg-state-base-hover focus-visible:shadow-[inset_2px_0_0_var(--color-state-accent-solid)] focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset"
                        onClick={(event) => {
                          // 2026-06-16 (audit): on the /clients route the peek
                          // drawer is suppressed (the list defers to the full
                          // page), so ⌘/Ctrl-click previously raw-navigated to
                          // /clients/<uuid> — an extra redirect that skipped the
                          // prev/next cycle list. Route it through the canonical
                          // handler like a plain click (canonical URL + cycle
                          // list, so the detail's prev/next arrows work).
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
          {/* No pagination footer — the directory is one continuous
              scroll region (the count lives in the page-header title
              pill + the KPI strip above, so a footer total would just
              repeat it). */}
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
 * Toolbar filter row above the /clients table. Surfaces the four
 * filters (Client / States / Entity / Owner) in one scannable strip,
 * matching the /alerts rhythm. Each filter is a toolbar-trigger
 * TableHeaderMultiFilter (wide outline button with the label inline +
 * a count chip when active). Reset on the right clears every filter at
 * once.
 */
function ClientsFilterToolbar({
  searchQuery,
  onSearchChange,
  stateOptions,
  stateFilter,
  onStateFilterChange,
  entityOptions,
  entityFilter,
  onEntityFilterChange,
  ownerOptions,
  ownerFilter,
  onOwnerFilterChange,
  extraFiltersActive = false,
  onClearAllFilters,
}: {
  searchQuery: string
  onSearchChange: (next: string) => void
  stateOptions: TableFilterOption[]
  stateFilter: readonly string[]
  onStateFilterChange: (next: string[]) => void
  entityOptions: TableFilterOption[]
  entityFilter: readonly string[]
  onEntityFilterChange: (next: string[]) => void
  ownerOptions: TableFilterOption[]
  ownerFilter: readonly string[]
  onOwnerFilterChange: (next: string[]) => void
  extraFiltersActive?: boolean | undefined
  onClearAllFilters?: (() => void) | undefined
}) {
  const { t } = useLingui()
  const filtersActive =
    searchQuery.length > 0 ||
    stateFilter.length > 0 ||
    entityFilter.length > 0 ||
    ownerFilter.length > 0 ||
    // Deep-link-only readiness/source/pulse filters (audit 2026-06-16) — so a
    // stale ?pulse= bookmark can still be cleared from here.
    extraFiltersActive

  // Toolbar layout splits into two clusters separated by a `flex-1`
  // spacer:
  //   • LEFT: filter dropdowns (Client / States / Entity / Owner) +
  //     Reset link — primary "narrow the directory" controls
  //   • RIGHT: collapsible search icon — matches the canonical
  //     "filters on the left, search on the right" reading order. The
  //     icon stays ghost-only at rest; expands into the input on click
  //     or `/` hotkey.
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* No "Client" filter dropdown here — on the clients directory the
          page IS the client list, so a multi-select of client names is
          redundant with the search box (which already does name / EIN
          lookup). The structural facets that DO narrow the directory
          stay: States / Entity / Assignee. (`?clients=` deep-links still
          filter via the route's filter pipeline; there's just no UI to
          set it from here.) */}
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
          // Clears search alongside the structural filters so the CPA
          // returns to the full directory in one click.
          // Labeled "Clear filters" (not "Reset") and shown always-but-
          // disabled — the shared model with /alerts and /rules/library.
          // "Reset" implied broader scope (density, columns, etc.) than the
          // affordance actually has, since only filters get cleared. (The
          // /deadlines queue keeps "Reset filters" inside its consolidated
          // View menu — a different control, intentionally left as-is.)
          // Prefer the route's complete reset (covers the deep-link-only
          // readiness/source/pulse params too); fall back to the visible four.
          if (onClearAllFilters) {
            onClearAllFilters()
          } else {
            onSearchChange('')
            onStateFilterChange([])
            onEntityFilterChange([])
            onOwnerFilterChange([])
          }
        }}
      >
        <Trans>Clear filters</Trans>
      </Button>
      {/* Canonical collapsing toolbar search — ghost magnifier at the
          right edge, expands on hover/click/`/`, retains focus + query.
          One control across /clients · /rules/library · /alerts. */}
      <CollapsibleSearch
        className="ml-auto"
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={t`Filter by name or EIN`}
        ariaLabel={t`Filter clients`}
        collapsedLabel={t`Filter clients`}
        hotkey="/"
        hotkeyMeta={{
          id: 'clients.focus-search',
          name: 'Filter clients',
          description: 'Focus the /clients filter input.',
          category: 'practice',
          scope: 'route',
        }}
      />
    </div>
  )
}

/**
 * The /clients directory summary — Total clients · Active deadlines ·
 * At risk. Renders the shared `StatBand` (the same "card summary" the
 * rule-library overview, /rules/sources, /alerts/history, and
 * /clients/[id] use) so all five surfaces share one borderless,
 * hairline-framed band instead of drifting bespoke cards.
 *
 * Data sourcing:
 *   - Total clients   → live (`clients.length`)
 *   - Active deadlines + jurisdiction count → live (summed from the
 *     obligation summaries + states-covered)
 *   - At risk         → live (clients with ≥1 overdue open deadline)
 *   - YTD revenue     → TODO(data): retainer/revenue is not in the
 *     ClientPublic contract. Static fallback per the canvas.
 *   - Onboarding      → TODO(data): onboarding doc counts are not in
 *     the contract. Static fallback per the canvas.
 */
function ClientsKpiStrip({
  isLoading,
  totalClients,
  statesCovered,
  needsFactsCount,
  obligationSummariesByClient,
}: {
  isLoading: boolean
  totalClients: number
  statesCovered: number
  needsFactsCount: number
  obligationSummariesByClient: ReadonlyMap<string, ClientObligationListSummary>
}) {
  const { t } = useLingui()

  const { activeObligations, atRiskCount } = useMemo(() => {
    let active = 0
    let atRisk = 0
    const now = Date.now()
    for (const summary of obligationSummariesByClient.values()) {
      active += summary.openCount
      if (summary.openCount > 0 && summary.nextDueDate && Date.parse(summary.nextDueDate) < now) {
        atRisk += 1
      }
    }
    return { activeObligations: active, atRiskCount: atRisk }
  }, [obligationSummariesByClient])

  // Only real, computed metrics are shown. YTD revenue and onboarding
  // doc counts are not in the ClientPublic / obligations contracts, so
  // those tiles were removed rather than filled with fabricated figures
  // — add them back once engagement-revenue + onboarding-status fields
  // ship and can be bound to live data.
  const stats: StatBandItem[] = [
    {
      key: 'total',
      label: t`Total clients`,
      value: totalClients,
      sub: needsFactsCount > 0 ? t`${needsFactsCount} need setup` : t`All set up`,
      subClass: needsFactsCount > 0 ? 'text-text-warning' : 'text-text-success',
    },
    {
      key: 'obligations',
      label: t`Active deadlines`,
      value: activeObligations,
      sub: t`across ${statesCovered} jurisdictions`,
    },
    {
      key: 'risk',
      label: t`At risk`,
      value: atRiskCount,
      sub: atRiskCount > 0 ? t`need attention` : t`on track`,
      subClass: atRiskCount > 0 ? 'text-text-warning' : 'text-text-tertiary',
    },
  ]

  return <StatBand stats={stats} loading={isLoading} ariaLabel={t`Clients summary`} />
}

/**
 * Top-of-page action strip for `/clients`. Replaces the older
 * four-tile configuration read-out ("Ready for rules · Needs facts ·
 * Imported · States covered") with signals that drive a same-day
 * action.
 *
 * See docs/Design/clients-list-summary-strip-redesign.md for the
 * design rationale. The strip renders nothing when there's no setup
 * gap — quiet is the reward.
 *
 * 2026-06-16 (audit): this previously documented three triage tiles
 * (At risk / Waiting on client / Alert hits) and an "Alert hits" click
 * that applied a `pulse=affected` filter. Those tiles were removed —
 * triage signals live on /today and /deadlines where dollar-exposure
 * context is present (see the body comment) — so the doc is corrected to
 * match: the strip now renders ONLY the **Needs facts** banner, shown
 * when `needsFactsCount > 0` (a pre-deadline-pressure setup gap: clients
 * missing state/entity type that the rule library is skipping).
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
  // /clients is a directory-first surface, so only the needs-facts
  // banner renders here — it's actionable setup work specific to the
  // directory itself, not a triage tile. Triage signals (at risk /
  // waiting on client / alert hits) belong on /today and /deadlines
  // where dollar-exposure context is also present.
  const hasBanner = needsFactsCount > 0
  if (isLoading) return <ClientsActionStripSkeleton />
  if (!hasBanner) return null

  // Chrome mirrors the canonical InfoBanner sibling that sits right
  // above it (the import-CSV tip): h-12 row, `bg-background-subtle`,
  // `border border-divider-subtle`, `rounded-lg`. AlertTriangle + red
  // button keep the destructive tone — this is "warning + action," not
  // "tip + dismiss."
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-divider-subtle bg-background-subtle px-3 py-2 sm:h-12 sm:flex-row sm:items-center sm:gap-3 sm:py-0"
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

// Skeleton scoped to the needs-facts banner only.
function ClientsActionStripSkeleton() {
  return <Skeleton className="h-10 w-full" aria-busy="true" />
}

function ClientTableSkeleton() {
  // Skeleton column widths track the live-table widths exactly so the
  // loading shimmer doesn't shift the layout when real rows mount.
  // Widths reference the shared `CLIENTS_COL_WIDTH` const so live +
  // skeleton can't drift.
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
  ] as const
  return (
    // Skeleton matches the live table's chrome — card frame on
    // table-container, dimmed-gray header bg.
    <Table
      className={cn(
        'table-fixed',
        '[&_[data-slot=table-container]]:overflow-hidden',
        '[&_[data-slot=table-container]]:rounded-lg',
        '[&_[data-slot=table-container]]:border',
        // Skeleton border matches the live table's canonical tone
        // (`divider-regular`).
        '[&_[data-slot=table-container]]:border-divider-regular',
        '[&_[data-slot=table-container]]:bg-background-default',
      )}
      aria-busy="true"
    >
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={cn(column.className)}>
              <Skeleton className={cn('h-3', column.header)} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className="[&_td]:py-2 [&_td]:text-sm">
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

function ClientReadinessBadge({
  readiness,
  compact,
}: {
  readiness: ClientReadiness | undefined
  compact: boolean
}) {
  // No inner `BadgeStatusDot`: the chip fill already carries the tone
  // (warning amber / success green), so a leading dot would double the
  // signal — the canonical "filled chip → no dot" rule.
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
