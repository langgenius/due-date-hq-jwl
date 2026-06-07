import { type ReactNode, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlarmClockIcon,
  BellIcon,
  Building2Icon,
  CalendarDaysIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  CornerDownLeftIcon,
  CreditCardIcon,
  HourglassIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  MapIcon,
  RssIcon,
  ScaleIcon,
  SettingsIcon,
  UploadCloudIcon,
  UsersIcon,
} from 'lucide-react'
import type { FirmPermission } from '@duedatehq/core/permissions'
import type { ClientPublic } from '@duedatehq/contracts'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@duedatehq/ui/components/ui/command'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { clientDetailPath } from '@/features/clients/client-url'
import { requiredRolesLabel, useFirmPermission } from '@/features/permissions/permission-gate'

import { Kbd } from '@/components/patterns/kbd'
import { COMMAND_PALETTE_HOTKEY, formatShortcutForDisplay } from './display'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Scope = the area a nav entry belongs to, so the filter pills can
// narrow Pages to "just the Deadlines pages" / "just the Rules pages"
// etc. without faking entity rows we have no backend for.
type NavScope = 'core' | 'deadlines' | 'alerts' | 'rules' | 'clients' | 'settings'

type NavEntry = {
  id: string
  label: string
  description: string
  scope: NavScope
  group: 'navigate' | 'actions'
  disabled?: boolean
  permission?: FirmPermission
  onSelect: () => void
  icon: typeof LayoutDashboardIcon
}

// Pill = a top-level scope filter shown under the input. `All` clears
// the filter; the others narrow results to one entity/area.
type PillId = 'all' | 'clients' | 'deadlines' | 'alerts' | 'rules' | 'pages'

const CLIENTS_LIST_INPUT = { limit: 500 } as const
const EMPTY_CLIENTS: readonly ClientPublic[] = []
const CLIENT_RESULT_LIMIT = 6

/**
 * MatchedText — renders `text` with the substring matching `query`
 * highlighted in the accent color (Pencil v4WcY8: the matched span of
 * each result reads in blue, the remainder in primary). Case-insensitive
 * first-match highlight; falls back to plain text when there's no match.
 */
function MatchedText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim()
  if (trimmed.length === 0) return <span className="font-medium text-text-primary">{text}</span>
  const index = text.toLowerCase().indexOf(trimmed.toLowerCase())
  if (index === -1) return <span className="font-medium text-text-primary">{text}</span>
  return (
    <span className="font-medium text-text-primary">
      {text.slice(0, index)}
      <span className="font-semibold text-text-accent">
        {text.slice(index, index + trimmed.length)}
      </span>
      {text.slice(index + trimmed.length)}
    </span>
  )
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { i18n, t } = useLingui()
  const navigate = useNavigate()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const commandShortcut = formatShortcutForDisplay(COMMAND_PALETTE_HOTKEY)

  const [pill, setPill] = useState<PillId>('all')
  const [search, setSearch] = useState('')

  // Real entity search: the active firm's clients are queryable
  // client-side via `clients.listByFirm` (the same query the title
  // switcher + cycle arrows use). We only fetch while the palette is
  // open. Deadlines / Alerts / Rules have no equivalent client-side
  // list query wired into the shell yet — those pills narrow the Pages
  // group to their area instead (see PILL_SCOPE). TODO(data): a
  // unified `search.global` endpoint indexing deadlines / alerts /
  // rules would let those pills return entity rows too.
  const clientsQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }),
    enabled: open,
  })
  const clients = clientsQuery.data ?? EMPTY_CLIENTS

  const navEntries = useMemo<NavEntry[]>(
    () => [
      {
        id: 'dashboard',
        label: t`Today`,
        description: t`Review risk and operating pressure.`,
        scope: 'core',
        group: 'navigate',
        icon: LayoutDashboardIcon,
        onSelect: () => navigate('/'),
      },
      {
        id: 'obligations',
        label: t`Deadlines`,
        description: t`Open Deadlines.`,
        scope: 'deadlines',
        group: 'navigate',
        icon: CalendarClockIcon,
        onSelect: () => navigate('/deadlines'),
      },
      {
        id: 'notifications',
        label: t`Notifications`,
        description: t`Open your personal notification inbox.`,
        scope: 'core',
        group: 'navigate',
        icon: BellIcon,
        onSelect: () => navigate('/notifications'),
      },
      {
        id: 'reminders',
        label: t`Reminders`,
        description: t`Manage deadline reminder templates and delivery status.`,
        scope: 'deadlines',
        group: 'navigate',
        icon: AlarmClockIcon,
        onSelect: () => navigate('/reminders'),
      },
      {
        id: 'workload',
        label: t`Team workload`,
        description: t`Review team capacity and risk pressure.`,
        scope: 'core',
        group: 'navigate',
        icon: ClipboardListIcon,
        onSelect: () => navigate('/workload'),
      },
      {
        id: 'clients',
        label: t`Clients`,
        description: t`Manage client facts and materials.`,
        scope: 'clients',
        group: 'navigate',
        icon: UsersIcon,
        onSelect: () => navigate('/clients'),
      },
      {
        id: 'firm',
        label: t`Practice profile`,
        description: t`Update the active practice's name and timezone.`,
        scope: 'settings',
        group: 'navigate',
        icon: Building2Icon,
        onSelect: () => navigate('/practice'),
      },
      {
        id: 'rules-coverage',
        label: t`Coverage`,
        description: t`Review per-jurisdiction rule coverage by entity.`,
        scope: 'rules',
        group: 'navigate',
        icon: MapIcon,
        onSelect: () => navigate('/rules/library?view=matrix'),
      },
      {
        id: 'rules-sources',
        label: t`Sources`,
        description: t`Inspect official sources and their watcher health.`,
        scope: 'rules',
        group: 'navigate',
        icon: RssIcon,
        onSelect: () => navigate('/rules/sources'),
      },
      {
        id: 'rules-library',
        label: t`Rule library`,
        description: t`Review coverage, sources, and pending rules.`,
        scope: 'rules',
        group: 'navigate',
        icon: LibraryIcon,
        onSelect: () => navigate('/rules/library'),
      },
      {
        id: 'rules-pulse',
        label: t`Alerts`,
        description: t`Triage source-backed government changes affecting clients.`,
        scope: 'alerts',
        group: 'navigate',
        icon: ActivityIcon,
        onSelect: () => navigate('/alerts'),
      },
      {
        id: 'rules-temporary',
        label: t`Temporary rules`,
        description: t`Review applied alert exceptions changing due dates.`,
        scope: 'rules',
        group: 'navigate',
        icon: HourglassIcon,
        onSelect: () => navigate('/rules/temporary'),
      },
      {
        id: 'members',
        label: t`Members`,
        description: t`Manage practice seats, roles, and invitations.`,
        scope: 'settings',
        group: 'navigate',
        icon: UsersIcon,
        permission: 'member.manage',
        onSelect: () => navigate('/members'),
      },
      {
        id: 'billing',
        label: t`Billing`,
        description: t`Review the active plan and billing controls.`,
        scope: 'settings',
        group: 'navigate',
        icon: CreditCardIcon,
        permission: 'billing.read',
        onSelect: () => navigate('/billing'),
      },
      {
        id: 'audit',
        label: t`Audit log`,
        description: t`Review practice-wide audit events.`,
        scope: 'settings',
        group: 'navigate',
        icon: ScaleIcon,
        permission: 'audit.read',
        onSelect: () => navigate('/audit'),
      },
      {
        id: 'settings',
        label: t`Settings`,
        description: t`Workspace configuration hub — Practice, team, billing, automation.`,
        scope: 'settings',
        group: 'navigate',
        icon: SettingsIcon,
        onSelect: () => navigate('/settings'),
      },
      {
        id: 'calendar-sync',
        label: t`Calendar sync`,
        description: t`Manage external deadline calendar feeds.`,
        scope: 'deadlines',
        group: 'actions',
        icon: CalendarDaysIcon,
        onSelect: () => navigate('/deadlines/calendar'),
      },
      {
        id: 'migration',
        label: t`Import clients`,
        description: t`Open the Migration Copilot wizard.`,
        scope: 'clients',
        group: 'actions',
        icon: UploadCloudIcon,
        permission: 'migration.run',
        onSelect: openWizard,
      },
    ],
    [navigate, openWizard, t],
  )

  const pills = useMemo(
    () =>
      [
        { id: 'all', label: t`All` },
        { id: 'clients', label: t`Clients` },
        { id: 'deadlines', label: t`Deadlines` },
        { id: 'alerts', label: t`Alerts` },
        { id: 'rules', label: t`Rules` },
        { id: 'pages', label: t`Pages` },
      ] satisfies Array<{ id: PillId; label: string }>,
    [t],
  )

  // Which nav scopes a pill reveals. `all` + `pages` show everything;
  // the entity pills narrow the Pages list to their area.
  const navScopesForPill: Record<PillId, NavScope[] | 'all'> = {
    all: 'all',
    pages: 'all',
    clients: ['clients'],
    deadlines: ['deadlines'],
    alerts: ['alerts'],
    rules: ['rules'],
  }

  function close() {
    onOpenChange(false)
  }

  function selectNav(entry: NavEntry) {
    if (entry.disabled || (entry.permission && !permission.can(entry.permission))) return
    entry.onSelect()
    close()
  }

  function selectClient(client: Pick<ClientPublic, 'id' | 'name'>) {
    void navigate(clientDetailPath(client))
    close()
  }

  // Client rows are rendered (sorted, capped) and then narrowed by
  // cmdk's own filter against each item's `value`. The clients pill
  // always shows them; on the All pill they stay hidden until the user
  // types — the palette opens as a navigator, entity rows surface once
  // a query exists (Pencil's "hudson" state). The cap keeps the list
  // bounded; once the user types, cmdk narrows what's visible within it.
  const showClients = pill === 'all' || pill === 'clients'
  const trimmedSearch = search.trim().toLowerCase()
  const hasQuery = trimmedSearch.length > 0
  const clientResults = useMemo(() => {
    if (!showClients) return EMPTY_CLIENTS
    if (pill === 'all' && !hasQuery) return EMPTY_CLIENTS
    const matched = hasQuery
      ? clients.filter((client) => client.name.toLowerCase().includes(trimmedSearch))
      : clients
    return [...matched]
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .slice(0, CLIENT_RESULT_LIMIT)
  }, [clients, hasQuery, pill, showClients, trimmedSearch])

  const scopes = navScopesForPill[pill]
  const visibleNav = useMemo(() => {
    const inScope =
      scopes === 'all' ? navEntries : navEntries.filter((entry) => scopes.includes(entry.scope))
    if (!hasQuery) return inScope
    return inScope.filter((entry) =>
      `${entry.label} ${entry.description}`.toLowerCase().includes(trimmedSearch),
    )
  }, [hasQuery, navEntries, scopes, trimmedSearch])
  const navGroups = useMemo(
    () =>
      [
        { id: 'navigate' as const, heading: t`Pages` },
        { id: 'actions' as const, heading: t`Actions` },
      ].map((group) => ({
        id: group.id,
        heading: group.heading,
        entries: visibleNav.filter((entry) => entry.group === group.id),
      })),
    [t, visibleNav],
  )

  const hints: Array<{ id: string; keys: ReactNode; label: ReactNode }> = [
    {
      id: 'navigate',
      keys: (
        <>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </>
      ),
      label: <Trans>navigate</Trans>,
    },
    { id: 'open', keys: <Kbd>↵</Kbd>, label: <Trans>open</Trans> },
    { id: 'close', keys: <Kbd>esc</Kbd>, label: <Trans>close</Trans> },
  ]

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t`Command palette`}
      description={t`Search clients and navigate.`}
    >
      {/* Filtering is owned here (shouldFilter=false) so client search
          can scan the full 500-row window before capping, and so the
          pills can scope nav + entities together. `search` drives both
          the filter and the matched-substring highlight. */}
      <Command loop disablePointerSelection shouldFilter={false}>
        <CommandInput
          autoFocus
          value={search}
          onValueChange={setSearch}
          placeholder={t`Search clients, navigate…`}
        />

        {/* Filter pills (Pencil v4WcY8). Scope the results to one
            entity / area. `Clients` is real entity search; the
            Deadlines / Alerts / Rules pills narrow the Pages list to
            their area (no entity backend wired here yet). */}
        <div className="flex flex-wrap gap-1.5 border-b border-divider-subtle px-4 py-2.5">
          {pills.map((entry) => {
            const active = pill === entry.id
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => setPill(entry.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-state-accent-hover text-text-accent'
                    : 'bg-background-subtle text-text-secondary hover:text-text-primary',
                )}
              >
                {entry.label}
              </button>
            )
          })}
        </div>

        <CommandList>
          <CommandEmpty>
            <Trans>No results found.</Trans>
          </CommandEmpty>

          {clientResults.length > 0 ? (
            <CommandGroup heading={t`Clients`}>
              {clientResults.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`client-${client.id}`}
                  onSelect={() => selectClient(client)}
                >
                  <span className="grid size-7 place-items-center rounded-full bg-state-accent-solid text-[11px] font-semibold text-text-accent-inverse">
                    {initials(client.name)}
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate text-sm">
                      <MatchedText text={client.name} query={search} />
                    </span>
                    {client.email ? (
                      <span className="truncate text-xs text-text-tertiary">{client.email}</span>
                    ) : null}
                  </span>
                  <Badge variant="secondary" size="sm">
                    <Trans>Client</Trans>
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {navGroups.map((group) =>
            group.entries.length > 0 ? (
              <CommandGroup key={group.id} heading={group.heading}>
                {group.entries.map((entry) => {
                  const Icon = entry.icon
                  const locked = Boolean(entry.permission && !permission.can(entry.permission))
                  return (
                    <CommandItem
                      key={entry.id}
                      value={`nav-${entry.id}`}
                      onSelect={() => selectNav(entry)}
                      {...(entry.disabled || locked ? { disabled: true } : {})}
                    >
                      <span className="grid size-7 place-items-center rounded-lg bg-background-subtle text-text-secondary group-data-[selected=true]/command-item:text-text-primary">
                        <Icon aria-hidden />
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <span className="truncate text-sm font-medium text-text-primary">
                          {entry.label}
                        </span>
                        <span className="truncate text-xs text-text-tertiary">
                          {entry.description}
                        </span>
                      </span>
                      {entry.disabled ? (
                        <Badge variant="outline" size="sm">
                          <Trans>Coming soon</Trans>
                        </Badge>
                      ) : locked && entry.permission ? (
                        <Badge variant="outline" size="sm">
                          {requiredRolesLabel(entry.permission, i18n)}
                        </Badge>
                      ) : (
                        <CornerDownLeftIcon
                          aria-hidden
                          className="size-3.5 text-text-tertiary opacity-0 group-data-[selected=true]/command-item:opacity-100"
                        />
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ) : null,
          )}
        </CommandList>

        {/* Footer: keyboard hints + brand (Pencil v4WcY8). */}
        <div className="flex items-center gap-4 border-t border-divider-subtle bg-background-section px-4 py-2.5 text-xs text-text-tertiary">
          <span className="flex flex-wrap items-center gap-3">
            {hints.map((hint) => (
              <span key={hint.id} className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1">{hint.keys}</span>
                <span>{hint.label}</span>
              </span>
            ))}
          </span>
          <span className="ml-auto font-medium">
            <Trans>Global search · {commandShortcut}</Trans>
          </span>
        </div>
      </Command>
    </CommandDialog>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase()
}
