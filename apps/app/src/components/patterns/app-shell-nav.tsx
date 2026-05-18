import { useCallback, useMemo, useState, type SyntheticEvent, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { I18n } from '@lingui/core'
import {
  ActivityIcon,
  Building2Icon,
  AlarmClockIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ClipboardListIcon,
  CreditCardIcon,
  FileCheck2Icon,
  HourglassIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  MapIcon,
  PlusIcon,
  RssIcon,
  ScaleIcon,
  SparklesIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { FirmPublic, USFirmTimezone } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@duedatehq/ui/components/ui/sidebar'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import { cn } from '@duedatehq/ui/lib/utils'
import { initialsFromName } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { resetPracticeScopedQueryCache } from '@/lib/query-cache'
import { canCreateAdditionalFirm, ownedActiveFirms, paidPlanActive } from '@/features/billing/model'
import { usePulseListAlertsQueryOptions } from '@/features/pulse/api'
import { DEFAULT_US_FIRM_TIMEZONE } from '@/features/firm/timezone-model'
import { FirmTimezoneSelect } from '@/features/firm/timezone-select'
import { FIRM_SWITCHER_HOTKEY } from '@/components/patterns/keyboard-shell/display'
import {
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell/hooks'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: string
  tag?: string
  disabledReason?: string
}

type NavGroupItem = NavItem & {
  // When present this item renders as a collapsible parent: clicking the row
  // toggles a chevron and reveals the children indented underneath. The
  // parent itself is not a destination — its `href` is only used as the
  // "default" target when the group is auto-expanded from a child route.
  children?: NavItem[]
}

type NavConfig = {
  operations: NavGroupItem[]
  clients: NavItem[]
  practice: NavItem[]
}

function firmMonogram(name: string): string {
  return initialsFromName(name).slice(0, 2).toUpperCase() || 'DD'
}

const NAV_ROLE_LABELS = {
  owner: msg`Owner`,
  partner: msg`Partner`,
  manager: msg`Manager`,
  preparer: msg`Preparer`,
  coordinator: msg`Coordinator`,
} as const

const NAV_PLAN_LABELS = {
  firm: msg`Enterprise`,
  team: msg`Team`,
  pro: msg`Pro`,
  solo: msg`Solo`,
} as const

function roleLabel(role: FirmPublic['role'], i18n: I18n): string {
  return i18n._(NAV_ROLE_LABELS[role])
}

function planLabel(plan: FirmPublic['plan'], i18n: I18n): string {
  return i18n._(NAV_PLAN_LABELS[plan])
}

function firmMeta(firm: FirmPublic, i18n: I18n): string {
  const role = roleLabel(firm.role, i18n)
  const plan = planLabel(firm.plan, i18n)
  return firm.seatLimit === 1
    ? i18n._(msg`${role} · ${plan} · ${firm.seatLimit} seat`)
    : i18n._(msg`${role} · ${plan} · ${firm.seatLimit} seats`)
}

function FirmSwitcherTrigger({ firm, firms }: { firm: FirmPublic; firms: FirmPublic[] }) {
  const { i18n, t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const switchMutation = useMutation(
    orpc.firms.switchActive.mutationOptions({
      onSuccess: () => {
        setSwitcherOpen(false)
        void resetPracticeScopedQueryCache(queryClient)
        void navigate('/', { replace: true })
      },
      onError: (err) => {
        toast.error(t`Couldn't switch practice`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )
  const currentMonogram = firmMonogram(firm.name)
  const currentMeta = firmMeta(firm, i18n)

  const handleSwitch = useCallback(
    (firmId: string) => {
      if (firmId === firm.id || switchMutation.isPending) return
      switchMutation.mutate({ firmId })
    },
    [firm.id, switchMutation],
  )

  useAppHotkey(FIRM_SWITCHER_HOTKEY, () => setSwitcherOpen(true), {
    enabled: !shortcutsBlocked && !addOpen,
    requireReset: true,
    meta: {
      id: 'firm.switch',
      name: 'Switch practice',
      description: 'Open the practice switcher.',
      category: 'global',
      scope: 'global',
    },
  })

  return (
    <SidebarHeader>
      <DropdownMenu open={switcherOpen} onOpenChange={setSwitcherOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={t`Switch practice, current ${firm.name}`}
              aria-keyshortcuts="Meta+Shift+O Control+Shift+O"
              className="flex h-14 w-full cursor-pointer touch-manipulation items-center gap-2.5 px-3 text-left outline-none transition-colors hover:bg-background-default-hover focus-visible:bg-background-default-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            />
          }
        >
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-primary text-xs font-semibold text-text-inverted"
            translate="no"
          >
            {currentMonogram}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-text-primary" translate="no">
              {firm.name}
            </span>
            <span className="truncate text-xs text-text-muted">{currentMeta}</span>
          </span>
          <ChevronsUpDownIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={6} className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-left">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
                <Trans>Practices</Trans>
              </span>
            </DropdownMenuLabel>
            {firms.map((item) => {
              const selected = item.id === firm.id
              return (
                <DropdownMenuItem
                  key={item.id}
                  aria-checked={selected}
                  className="flex items-center justify-between"
                  onClick={() => handleSwitch(item.id)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="grid size-5 shrink-0 place-items-center rounded-sm bg-brand-primary text-[10px] font-semibold text-text-inverted"
                      translate="no"
                    >
                      {firmMonogram(item.name)}
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span
                        className="truncate text-sm font-medium text-text-primary"
                        translate="no"
                      >
                        {item.name}
                      </span>
                      <span className="truncate text-xs text-text-tertiary">
                        {firmMeta(item, i18n)}
                      </span>
                    </span>
                  </span>
                  {selected ? (
                    <CheckIcon className="size-4 shrink-0 text-text-accent" aria-hidden />
                  ) : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setSwitcherOpen(false)
                setAddOpen(true)
              }}
            >
              <PlusIcon />
              <span>
                <Trans>Add practice</Trans>
              </span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddFirmDialog open={addOpen} onOpenChange={setAddOpen} firms={firms} />
    </SidebarHeader>
  )
}

function AddFirmDialog({
  open,
  onOpenChange,
  firms,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  firms: FirmPublic[]
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState<USFirmTimezone>(DEFAULT_US_FIRM_TIMEZONE)
  const [error, setError] = useState<string | null>(null)
  const canCreate = canCreateAdditionalFirm(firms)
  const ownedFirmCount = ownedActiveFirms(firms).length
  const createMutation = useMutation(
    orpc.firms.create.mutationOptions({
      onSuccess: () => {
        setName('')
        setTimezone(DEFAULT_US_FIRM_TIMEZONE)
        setError(null)
        onOpenChange(false)
        void resetPracticeScopedQueryCache(queryClient)
        void navigate('/', { replace: true })
      },
      onError: (err) => {
        setError(rpcErrorMessage(err) ?? t`Couldn't create practice`)
      },
    }),
  )

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreate) return
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError(t`Please enter at least 2 characters.`)
      return
    }
    setError(null)
    createMutation.mutate({ name: trimmed, timezone })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Add practice</Trans>
          </DialogTitle>
          {canCreate ? (
            <DialogDescription>
              <Trans>
                Create a separate practice with its own clients, deadlines, audit trail, and
                settings.
              </Trans>
            </DialogDescription>
          ) : (
            <DialogDescription>
              <Trans>
                Your current plan includes one active practice. Additional practices are available
                on the Enterprise plan.
              </Trans>
            </DialogDescription>
          )}
        </DialogHeader>
        {!canCreate ? (
          <div className="grid gap-4">
            <div className="rounded-md border border-divider-regular bg-background-subtle p-4">
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-text-tertiary">
                <Trans>Practice workspaces</Trans>
              </p>
              <p className="mt-2 text-sm font-medium text-text-primary">
                <Trans>{ownedFirmCount} of 1 included</Trans>
              </p>
              <p className="mt-1 text-sm leading-5 text-text-secondary">
                <Trans>
                  Solo, Pro, and Team include one active practice workspace. Contact sales for
                  multiple practices, offices, or demo/production separation.
                </Trans>
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                <Trans>Cancel</Trans>
              </Button>
              <Button render={<Link to="/billing" onClick={() => onOpenChange(false)} />}>
                <Trans>Review plans</Trans>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="add-firm-name">
                <Trans>Practice name</Trans>
              </Label>
              <Input
                id="add-firm-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="organization"
                aria-invalid={error ? true : undefined}
                placeholder={t`e.g. Bright CPA Practice`}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-firm-timezone">
                <Trans>Timezone</Trans>
              </Label>
              <FirmTimezoneSelect
                id="add-firm-timezone"
                value={timezone}
                onValueChange={setTimezone}
                disabled={createMutation.isPending}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                <Trans>Cancel</Trans>
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Trans>Creating…</Trans>
                ) : (
                  <Trans>Create practice</Trans>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function usePulseAlertCount(): number {
  // Surface the real Pulse alert count next to the nav entry. Uses the
  // shared cache primed by the dashboard banner so we don't double-fetch.
  const query = useQuery(usePulseListAlertsQueryOptions(5))
  return query.data?.alerts.length ?? 0
}

function useNavItems(firm: FirmPublic): NavConfig {
  const { t } = useLingui()
  const pulseCount = usePulseAlertCount()
  const pulseBadge = pulseCount > 0 ? String(pulseCount) : undefined
  const workloadPaid = paidPlanActive(firm)
  return useMemo<NavConfig>(
    () => ({
      operations: [
        { href: '/', label: t`Dashboard`, icon: LayoutDashboardIcon, end: true },
        {
          href: '/obligations',
          label: t`Obligations`,
          icon: CalendarClockIcon,
          end: false,
        },
        {
          // Collapsible parent — the Rules workspace expands inline to reveal
          // its six dedicated pages. `href` points at the default landing
          // route used when a child auto-expands the group.
          href: '/rules/coverage',
          label: t`Rules`,
          icon: FileCheck2Icon,
          end: false,
          ...(pulseBadge !== undefined ? { badge: pulseBadge } : {}),
          children: [
            { href: '/rules/coverage', label: t`Coverage`, icon: MapIcon, end: false },
            { href: '/rules/sources', label: t`Sources`, icon: RssIcon, end: false },
            { href: '/rules/library', label: t`Rule library`, icon: LibraryIcon, end: false },
            {
              href: '/rules/pulse',
              label: t`Pulse changes`,
              icon: ActivityIcon,
              end: false,
              ...(pulseBadge !== undefined ? { badge: pulseBadge } : {}),
            },
            {
              href: '/rules/temporary',
              label: t`Temporary rules`,
              icon: HourglassIcon,
              end: false,
            },
            // Obligation preview (/rules/preview) is intentionally not
            // surfaced in the sidebar. It's a dry-run sandbox that tests
            // what the rules engine would generate for a given client
            // and tax year — closer to client onboarding / admin tooling
            // than to the day-to-day rule governance workflow. Route
            // stays alive for direct links and engineering use.
          ],
        },
        {
          href: '/reminders',
          label: t`Reminders`,
          icon: AlarmClockIcon,
          end: false,
        },
      ],
      clients: [
        { href: '/clients', label: t`Clients`, icon: UsersIcon, end: false },
        { href: '/opportunities', label: t`Opportunities`, icon: SparklesIcon, end: false },
      ],
      practice: [
        { href: '/practice', label: t`Practice profile`, icon: Building2Icon, end: false },
        {
          href: '/workload',
          label: t`Team workload`,
          icon: ClipboardListIcon,
          end: false,
          ...(workloadPaid
            ? {}
            : {
                tag: t`Pro`,
                disabledReason: t`Team workload is available on Pro, Team, and Enterprise plans.`,
              }),
        },
        { href: '/members', label: t`Members`, icon: UsersIcon, end: false },
        { href: '/billing', label: t`Billing`, icon: CreditCardIcon, end: false },
        { href: '/audit', label: t`Audit log`, icon: ScaleIcon, end: false },
      ],
    }),
    [t, pulseBadge, workloadPaid],
  )
}

function NavGroups({ firm }: { firm: FirmPublic }) {
  const { t } = useLingui()
  const items = useNavItems(firm)
  return (
    <nav aria-label={t`Primary navigation`} className="contents">
      <NavGroupSection label={t`Operations`}>
        {items.operations.map((item) =>
          item.children ? (
            <NavMenuCollapsibleItem key={item.href} item={item} />
          ) : (
            <NavMenuItem key={item.href} item={item} disabled={Boolean(item.tag)} />
          ),
        )}
      </NavGroupSection>
      <NavGroupSection label={t`Clients`}>
        {items.clients.map((item) => (
          <NavMenuItem key={item.href} item={item} />
        ))}
      </NavGroupSection>
      <NavGroupSection label={t`Practice`}>
        {items.practice.map((item) => (
          <NavMenuItem key={item.href} item={item} disabled={Boolean(item.tag)} />
        ))}
      </NavGroupSection>
    </nav>
  )
}

function NavGroupSection({
  label,
  muted = false,
  children,
}: {
  label: string
  muted?: boolean
  children: ReactNode
}) {
  return (
    <SidebarGroup className={muted ? 'opacity-55' : undefined}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function NavMenuItem({ item, disabled = false }: { item: NavItem; disabled?: boolean }) {
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <NavLink
            to={item.href}
            end={item.end ?? false}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : undefined}
            title={disabled ? item.disabledReason : undefined}
          />
        }
        className={cn(disabled && 'pointer-events-none')}
        title={disabled ? item.disabledReason : undefined}
      >
        <Icon aria-hidden />
        <span>{item.label}</span>
        {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
        {item.tag ? (
          <span className="ml-auto font-mono text-xs tabular-nums text-text-muted">{item.tag}</span>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function NavMenuCollapsibleItem({ item }: { item: NavGroupItem }) {
  const Icon = item.icon
  const children = item.children ?? []
  const location = useLocation()
  // Treat any descendant match as "active" so the parent stays highlighted
  // and the group auto-expands when navigating directly to a child URL.
  const parentPrefix = item.href.replace(/\/[^/]+$/, '') || item.href
  const matchesChild = children.some((child) => pathMatchesPrefix(location.pathname, child.href))
  const matchesParentPrefix = pathMatchesPrefix(location.pathname, parentPrefix)
  const isActiveBranch = matchesChild || matchesParentPrefix
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const open = manualOpen ?? isActiveBranch
  const toggle = useCallback(() => {
    setManualOpen((current) => !(current ?? isActiveBranch))
  }, [isActiveBranch])

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          render={
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`nav-children-${item.href}`}
              onClick={toggle}
            />
          }
          data-active={isActiveBranch || undefined}
        >
          <Icon aria-hidden />
          <span>{item.label}</span>
          {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
          <ChevronRightIcon
            aria-hidden
            className={cn(
              'ml-auto size-3.5 shrink-0 text-text-muted transition-transform duration-150',
              open && 'rotate-90',
            )}
          />
        </SidebarMenuButton>
      </SidebarMenuItem>
      {open ? (
        <ul
          id={`nav-children-${item.href}`}
          className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-divider-subtle pl-2"
        >
          {children.map((child) => (
            <NavMenuItem key={child.href} item={child} />
          ))}
        </ul>
      ) : null}
    </>
  )
}

export { FirmSwitcherTrigger, NavGroups }
