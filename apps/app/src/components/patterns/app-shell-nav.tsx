import { useCallback, useMemo, useState, type SyntheticEvent, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { I18n } from '@lingui/core'
import {
  ActivityIcon,
  BuildingIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  MapIcon,
  PlusIcon,
  ScrollTextIcon,
  SettingsIcon,
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
import { canCreateAdditionalFirm, ownedActiveFirms } from '@/features/billing/model'
import { usePulseListAlertsQueryOptions } from '@/features/pulse/api'
import { DEFAULT_US_FIRM_TIMEZONE } from '@/features/firm/timezone-model'
import { FirmTimezoneSelect } from '@/features/firm/timezone-select'
import { FIRM_SWITCHER_HOTKEY } from '@/components/patterns/keyboard-shell/display'
import { useNavV2 } from '@/components/patterns/use-nav-v2'
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

type NavConfig = {
  // v2-only: standalone item(s) above the first labelled group.
  // Dashboard sits here as the "home" surface — visually separate
  // from OPERATIONS (which is the daily-work group).
  primary: NavItem[]
  // Primary daily / weekly destinations, split into small labeled groups so
  // the eye can scan by "what kind of work am I doing?". Each group is
  // 1–3 items — labels are muted (uppercase 11px tracking) so they read
  // as orientation hints rather than chrome.
  operations: NavItem[]
  clients: NavItem[]
  rules: NavItem[]
  // v2-only: a "Practice" group consolidates workspace management
  // destinations (Team, Workload, Billing, Audit log, Practice
  // profile) that today are scattered between Clients group and
  // Settings sub-pages. Empty in legacy mode.
  practice: NavItem[]
  // v2-only: Coverage replaces the legacy Rules group label. The
  // legacy `rules` array stays populated in v1 mode for back-compat.
  coverage: NavItem[]
  // Bottom of the sidebar. Holds the Settings hub for workspace
  // configuration (Practice profile, Members, Billing, Audit, automation
  // settings — see `apps/app/src/routes/settings.tsx`). Personal account
  // settings live in the `UserMenuTrigger` dropdown, not here.
  footer: NavItem[]
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
          <span
            className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary"
            translate="no"
          >
            {firm.name}
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

function useNavItems(_firm: FirmPublic, navV2: boolean): NavConfig {
  const { t } = useLingui()
  const pulseCount = usePulseAlertCount()
  const pulseBadge = pulseCount > 0 ? String(pulseCount) : undefined
  return useMemo<NavConfig>(() => {
    if (navV2) {
      // v2 IA per 2026-05-19 design mockup. Radar disappears from the
      // sidebar — it lives as the NEEDS ATTENTION surface on the
      // dashboard. Coverage / Library consolidate under their own
      // group. Practice management gathers Team, Workload, Billing,
      // Audit log, Practice profile into one group instead of
      // scattering them across Clients group + Settings sub-pages.
      // Contacts and Payments aren't built yet — deferred until
      // those routes exist.
      return {
        // Dashboard sits above the OPERATIONS group as a standalone
        // "home" link — not part of any group label, so the eye reads
        // it as the surface you keep returning to rather than another
        // daily-work destination.
        primary: [{ href: '/', label: t`Dashboard`, icon: LayoutDashboardIcon, end: true }],
        // Daily-work surfaces. Coverage moves here from its own group
        // because reviewing pending rules is part of the daily flow,
        // not a separate "area of the app".
        operations: [
          {
            href: '/obligations',
            label: t`Obligations`,
            icon: CalendarClockIcon,
            end: false,
          },
          {
            href: '/rules/coverage',
            label: t`Coverage`,
            icon: MapIcon,
            end: false,
          },
          {
            href: '/rules/library',
            label: t`Rule library`,
            icon: LibraryIcon,
            end: false,
          },
        ],
        clients: [],
        rules: [],
        coverage: [],
        practice: [
          { href: '/clients', label: t`Clients`, icon: UsersIcon, end: false },
          {
            href: '/opportunities',
            label: t`Opportunities`,
            icon: SparklesIcon,
            end: false,
          },
          { href: '/members', label: t`Team`, icon: UsersIcon, end: false },
          { href: '/workload', label: t`Workload`, icon: GaugeIcon, end: false },
          {
            href: '/practice',
            label: t`Practice profile`,
            icon: BuildingIcon,
            end: false,
          },
          { href: '/billing', label: t`Billing`, icon: CreditCardIcon, end: false },
          { href: '/audit', label: t`Audit log`, icon: ScrollTextIcon, end: false },
        ],
        footer: [{ href: '/settings', label: t`Settings`, icon: SettingsIcon, end: false }],
      }
    }
    // Legacy (default) sidebar.
    return {
      primary: [],
      operations: [
        { href: '/', label: t`Dashboard`, icon: LayoutDashboardIcon, end: true },
        {
          href: '/obligations',
          label: t`Obligations`,
          icon: CalendarClockIcon,
          end: false,
        },
        // Radar is the spine of the product (per the canonical product
        // spec — "you won't be the last CPA in your state to find out about
        // a filing extension"). Direct entry, not buried under Rules: it's
        // operational/real-time work, not governance. The sidebar badge
        // counts incoming alerts only. Internal product name "Pulse" is
        // preserved in code (component names, database tables, ORPC
        // routes); only the user-facing label is "Radar".
        {
          href: '/rules/pulse',
          label: t`Radar`,
          icon: ActivityIcon,
          end: false,
          ...(pulseBadge !== undefined ? { badge: pulseBadge } : {}),
        },
      ],
      clients: [
        { href: '/clients', label: t`Clients`, icon: UsersIcon, end: false },
        { href: '/opportunities', label: t`Opportunities`, icon: SparklesIcon, end: false },
      ],
      // Preview-integration adjustment: surface Coverage alongside
      // Rule library in the legacy nav so the Coverage rebuild is
      // reachable without the navV2 flag. (Their original v1 rules
      // group treated Coverage as a section inside Library; the
      // merged tree wants both as first-class destinations.)
      rules: [
        {
          href: '/rules/coverage',
          label: t`Coverage`,
          icon: MapIcon,
          end: false,
        },
        {
          href: '/rules/library',
          label: t`Rule library`,
          icon: LibraryIcon,
          end: false,
        },
      ],
      coverage: [],
      practice: [],
      footer: [{ href: '/settings', label: t`Settings`, icon: SettingsIcon, end: false }],
    }
  }, [t, pulseBadge, navV2])
}

function NavGroups({ firm }: { firm: FirmPublic }) {
  const { t } = useLingui()
  const navV2 = useNavV2()
  const items = useNavItems(firm, navV2)
  if (navV2) {
    return (
      <nav aria-label={t`Primary navigation`} className="contents">
        {/* Dashboard sits as a standalone item above OPERATIONS — no
          group label so the eye reads it as "home", separate from
          the daily-work group below. */}
        {items.primary.length > 0 ? (
          <NavGroupSection>
            {items.primary.map((item) => (
              <NavMenuItem key={item.href} item={item} />
            ))}
          </NavGroupSection>
        ) : null}
        <NavGroupSection label={t`Operations`}>
          {items.operations.map((item) => (
            <NavMenuItem key={item.href} item={item} disabled={Boolean(item.tag)} />
          ))}
        </NavGroupSection>
        {items.coverage.length > 0 ? (
          <NavGroupSection label={t`Coverage`}>
            {items.coverage.map((item) => (
              <NavMenuItem key={item.href} item={item} />
            ))}
          </NavGroupSection>
        ) : null}
        <NavGroupSection label={t`Practice`}>
          {items.practice.map((item) => (
            <NavMenuItem key={item.href} item={item} />
          ))}
        </NavGroupSection>
        <NavGroupSection muted>
          {items.footer.map((item) => (
            <NavMenuItem key={item.href} item={item} />
          ))}
        </NavGroupSection>
      </nav>
    )
  }
  return (
    <nav aria-label={t`Primary navigation`} className="contents">
      <NavGroupSection label={t`Operations`}>
        {items.operations.map((item) => (
          <NavMenuItem key={item.href} item={item} disabled={Boolean(item.tag)} />
        ))}
      </NavGroupSection>
      <NavGroupSection label={t`Clients`}>
        {items.clients.map((item) => (
          <NavMenuItem key={item.href} item={item} />
        ))}
      </NavGroupSection>
      <NavGroupSection label={t`Rules`}>
        {items.rules.map((item) => (
          <NavMenuItem key={item.href} item={item} />
        ))}
      </NavGroupSection>
      <NavGroupSection muted>
        {items.footer.map((item) => (
          <NavMenuItem key={item.href} item={item} />
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
  // Labels are intentionally omitted at the call site for the current sidebar
  // shape — at 6 entries split into 3 groups of 1–3, headers were adding
  // visual weight without information. Kept optional so denser future
  // structures can re-label without changing this component.
  label?: string
  muted?: boolean
  children: ReactNode
}) {
  return (
    <SidebarGroup className={muted ? 'opacity-55' : undefined}>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
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

export { FirmSwitcherTrigger, NavGroups, roleLabel }
