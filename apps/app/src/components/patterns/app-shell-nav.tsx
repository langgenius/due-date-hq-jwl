import { useCallback, useMemo, useState, type SyntheticEvent, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { I18n } from '@lingui/core'
import {
  BookOpenIcon,
  CalendarIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  MapIcon,
  MegaphoneIcon,
  PlusIcon,
  ScrollTextIcon,
  SettingsIcon,
  SquareChartGanttIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  MAX_INTERNAL_DEADLINE_OFFSET_DAYS,
  MIN_INTERNAL_DEADLINE_OFFSET_DAYS,
  type FirmPublic,
  type USFirmTimezone,
} from '@duedatehq/contracts'
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
  useSidebar,
} from '@duedatehq/ui/components/ui/sidebar'
import { AlertsNotificationsBell } from '@/components/patterns/alerts-notifications-bell'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { Card, CardContent } from '@duedatehq/ui/components/ui/card'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import { cn } from '@duedatehq/ui/lib/utils'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { resetPracticeScopedQueryCache } from '@/lib/query-cache'
import { canCreateAdditionalFirm, ownedActiveFirms } from '@/features/billing/model'
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
  badgeTooltip?: string
  /**
   * Visual tone for the badge:
   *  - `urgent`   — saturated warning pill ("look at this"). Default.
   *  - `inventory` — slim tertiary number ("reference fact"). Used
   *    for counts the CPA shouldn't read as a call to action.
   */
  badgeTone?: 'urgent' | 'inventory'
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

// 2026-06-01: `firmMonogram` removed — both call sites now route
// through AssigneeAvatar (type='firm', shape='square'), which calls
// initialsFromName internally and falls back to 'DD' for empty names.

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

function navItemTooltip(item: NavItem, disabled: boolean): string {
  if (disabled && item.disabledReason) return `${item.label}, ${item.disabledReason}`
  if (item.badgeTooltip) return `${item.label}, ${item.badgeTooltip}`
  return item.label
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
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
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
    // 2026-05-26 (Yuqi sidebar bug): `SidebarHeader` is a `flex
    // flex-col` wrapper with no grow constraint. When the app-shell
    // places `SidebarCollapseToggle` as a sibling next to this trigger
    // in a horizontal flex row, the SidebarHeader stays at its
    // content's natural width and the toggle gets pushed past the
    // sidebar's right edge into the page content area. Adding
    // `min-w-0 flex-1` makes the SidebarHeader expand to fill the row
    // so the toggle stays inside the sidebar boundary. Collapsed mode
    // overrides with `w-auto flex-none` in the parent.
    <SidebarHeader className="min-w-0 flex-1 group-data-[collapsed=true]/sidebar:w-auto group-data-[collapsed=true]/sidebar:flex-none">
      <DropdownMenu open={switcherOpen} onOpenChange={setSwitcherOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={t`Switch practice, current ${firm.name}`}
              aria-keyshortcuts="Meta+Shift+O Control+Shift+O"
              title={firm.name}
              // 2026-05-26 (Yuqi sixty-ninth pass follow-up — firm
              // switcher bug): dropped `rounded-md` + the bg-hover
              // / focus-bg states. The rounded corners made the
              // trigger read as a floating card peeking out of the
              // sidebar (especially during hover-expand on an
              // auto-collapsed rail) instead of the sidebar's
              // top section. Without the rounded corners + visible
              // bg state, the trigger now flows flush with the
              // sidebar header and the dropdown affordance comes
              // purely from the chevron + cursor (still
              // interactive via hover/focus, just without the
              // card-shaped wash). Compact (collapsed) mode keeps
              // its size-8 footprint; the visual card-ness was the
              // expanded-mode problem.
              // 2026-05-26 (Yuqi seventy-third pass — collapse
              // toggle mounted): trigger now `min-w-0 flex-1` so
              // it shares the header row with the new
              // SidebarCollapseToggle sibling. Collapsed mode
              // still snaps to size-8 since both children stack
              // vertically below xl.
              className="flex h-14 min-w-0 flex-1 cursor-pointer touch-manipulation items-center gap-2.5 px-3 text-left outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-inset group-data-[collapsed=true]/sidebar:h-8 group-data-[collapsed=true]/sidebar:w-8 group-data-[collapsed=true]/sidebar:flex-none group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0"
            />
          }
        >
          {/* 2026-05-26 (Yuqi forty-fourth pass — sidebar header
              match Frame 137 reference): avatar bumped size-8 (32px)
              → size-10 (40px) and firm name bumped text-sm → text-base
              so the brand-identity row reads as a proper header,
              not a slim row. Reference screenshot shows a clearly
              prominent logo + name pair as the rail's top anchor.
              Collapsed mode still uses size-7 (28px) inside the
              56px rail.
              2026-06-01: monogram now renders through AssigneeAvatar
              (type='firm', shape='square') so the brand tile shares
              one primitive with people avatars. The size cycle
              (size-10 expanded → size-7 collapsed) stays as a
              className override since AssigneeAvatar has no
              sidebar-context size hook. */}
          <AssigneeAvatar
            name={firm.name}
            title={firm.name}
            type="firm"
            shape="square"
            size="lg"
            className="shrink-0 group-data-[collapsed=true]/sidebar:size-7 group-data-[collapsed=true]/sidebar:text-xs"
          />
          <span
            className="min-w-0 flex-1 truncate text-base font-medium text-text-primary group-data-[collapsed=true]/sidebar:hidden"
            translate="no"
          >
            {firm.name}
          </span>
          <ChevronsUpDownIcon
            className="size-3 shrink-0 text-text-muted group-data-[collapsed=true]/sidebar:hidden"
            aria-hidden
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={6} className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-left">
              <span className="text-xs font-medium uppercase tracking-eyebrow text-text-tertiary">
                <Trans>Practices</Trans>
              </span>
            </DropdownMenuLabel>
            {firms.map((item) => {
              const selected = item.id === firm.id
              return (
                <DropdownMenuItem
                  key={item.id}
                  aria-checked={selected}
                  // 2026-05-25 (Yuqi caps fix follow-up): bumped
                  // row height (h-12) + padding (px-2 py-2) +
                  // avatar (size-7) so the dropdown row matches
                  // the trigger's brand-mark presence. Item row
                  // was h-8 / size-5 (20px) — the avatar read as
                  // a UI dot rather than the workspace identity
                  // it pairs with on the trigger (32px).
                  className="flex h-12 items-center justify-between gap-2 px-2 py-2"
                  onClick={() => handleSwitch(item.id)}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {/* 2026-06-01: dropdown-item monogram routed
                        through AssigneeAvatar (firm + square + sm).
                        Fixed 28px tile — no sidebar-context resize. */}
                    <AssigneeAvatar
                      name={item.name}
                      title={item.name}
                      type="firm"
                      shape="square"
                      size="sm"
                      className="shrink-0"
                    />
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
  const [internalDeadlineOffsetDays, setInternalDeadlineOffsetDays] = useState(
    DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  )
  const [error, setError] = useState<string | null>(null)
  const canCreate = canCreateAdditionalFirm(firms)
  const ownedFirmCount = ownedActiveFirms(firms).length
  const createMutation = useMutation(
    orpc.firms.create.mutationOptions({
      onSuccess: () => {
        setName('')
        setTimezone(DEFAULT_US_FIRM_TIMEZONE)
        setInternalDeadlineOffsetDays(DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS)
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
    if (
      internalDeadlineOffsetDays < MIN_INTERNAL_DEADLINE_OFFSET_DAYS ||
      internalDeadlineOffsetDays > MAX_INTERNAL_DEADLINE_OFFSET_DAYS
    ) {
      setError(t`Internal deadline offset must be between 0 and 365 days.`)
      return
    }
    setError(null)
    createMutation.mutate({ name: trimmed, timezone, internalDeadlineOffsetDays })
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
            {/* 2026-06-01: hand-rolled info callout collapsed onto
                Card size='sm' tone='muted' radius='md' — same border-
                subtle + background-section recipe, now from the
                primitive. Card sets py-4; CardContent adds px-4. */}
            <Card size="sm" tone="muted" radius="md">
              <CardContent>
                <p className="text-xs uppercase tracking-eyebrow text-text-tertiary">
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
              </CardContent>
            </Card>
            <DialogFooter>
              {/* 2026-05-27 (σ cross-route audit D12 — upgrade prompt):
                  Cancel was the last outline straggler from X1 in the
                  cross-cutting nav shell. Aligned with the ghost canon
                  shared by every other dialog Cancel. */}
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
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
            <div className="grid gap-1.5">
              <Label htmlFor="add-firm-internal-deadline-offset">
                <Trans>Internal deadline</Trans>
              </Label>
              <Input
                id="add-firm-internal-deadline-offset"
                type="number"
                min={MIN_INTERNAL_DEADLINE_OFFSET_DAYS}
                max={MAX_INTERNAL_DEADLINE_OFFSET_DAYS}
                step={1}
                value={internalDeadlineOffsetDays}
                onChange={(event) =>
                  setInternalDeadlineOffsetDays(Number.parseInt(event.target.value || '0', 10))
                }
                disabled={createMutation.isPending}
                className="tabular-nums"
              />
              <p className="text-xs text-text-tertiary">
                <Trans>Show work as due this many days before the statutory deadline.</Trans>
              </p>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              {/* 2026-05-27 (σ cross-route audit D12 — create-firm
                  dialog): same outline → ghost as the upgrade-prompt
                  twin above. */}
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                aria-busy={createMutation.isPending || undefined}
              >
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

// 2026-05-24 (critique P0): the sidebar Alerts badge previously read
// from `notifications.unreadCount`. That bucket covers @-mentions,
// status changes, system events — anything that lands in the unified
// Inbox — while the Alerts sidebar entry and the Today "Alerts" strip
// both scope to alert-source changes. Result: three
// surfaces claiming the same word counted three different things
// (2 sidebar, 3 Today, 4 Alerts history).
//
// 2026-05-24 (B2): the badge now uses the dedicated `pulse.activeCount`
// endpoint — a true `COUNT(*)` against the same WHERE clause
// `listAlerts` uses. The previous shape fetched up to 50 rows just to
// call `.length` on the array, so any firm with more than 50 active
// alerts saw "50" in the badge (silent truncation). The count endpoint
// has no upper bound; Today's section still uses `listAlerts(50)`
// because it needs the row contents to render the alert cards.
//
// 2026-05-29 (Alerts active/history split): keep this badge scoped to
// the active queue. Alert history is now CPA-handled alerts and can
// include snoozed / applied / dismissed rows that should not inflate
// the sidebar's needs-attention count.
function useActiveAlertCount(): number {
  const query = useQuery(orpc.pulse.activeCount.queryOptions({ input: undefined }))
  return query.data?.count ?? 0
}

function useRuleLibraryPendingCount(): number {
  // Aggregate pending-review rule count across all jurisdictions for the
  // sidebar badge next to "Rule library". Pulls from the same coverage
  // query the page uses, so no extra fetch.
  const query = useQuery(orpc.rules.coverage.queryOptions({ input: undefined }))
  const rows = query.data ?? []
  let total = 0
  for (const row of rows) total += row.pendingReviewCount ?? row.candidateCount ?? 0
  return total
}

// Total active-clients count for the sidebar badge next to "Clients".
// Shares the cache with `/clients` + `ClientTitleSwitcher` +
// `ClientCycleArrows` — all use the same `listByFirm({limit:500})`
// query, so no extra fetch when the user has visited any of those
// surfaces. On a cold load the sidebar triggers the first fetch; the
// downstream surfaces hit warm cache after that.
const CLIENTS_LIST_INPUT = { limit: 500 } as const

function useClientsCount(): number {
  const query = useQuery(orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }))
  return query.data?.length ?? 0
}

function useNavItems(firm: FirmPublic, navV2: boolean): NavConfig {
  const { t } = useLingui()
  // 2026-05-24 (critique P0): switched from notifications.unreadCount
  // (which mixed @-mentions and system notifications into the count)
  // to useActiveAlertCount (alert-source only). Sidebar and Today now
  // share one cache entry and report the same number.
  const alertCount = useActiveAlertCount()
  const alertBadge = alertCount > 0 ? String(alertCount) : undefined
  const ruleReviewCount = useRuleLibraryPendingCount()
  const ruleReviewBadge = ruleReviewCount > 0 ? String(ruleReviewCount) : undefined
  // D-2: sidebar counts. Clients = total active clients; Deadlines =
  // open visible deadlines from FirmPublic.openObligationCount (already
  // aggregated server-side, no extra query). Archived clients retain
  // their audit/deadline history, but their rows do not appear in the
  // Deadlines queue and are intentionally excluded from this badge.
  // Counts render only when > 0 to avoid `Clients (0)` ghost text on a
  // fresh workspace.
  const clientsCount = useClientsCount()
  const clientsBadge = clientsCount > 0 ? String(clientsCount) : undefined
  const obligationsBadge =
    firm.openObligationCount > 0 ? String(firm.openObligationCount) : undefined
  return useMemo<NavConfig>(() => {
    if (navV2) {
      // v2 IA per 2026-05-19 design mockup. Alerts is a top-level
      // primary item (mirrored by the dashboard's NEEDS ATTENTION
      // surface). Coverage / Library consolidate under their own
      // group. Practice management gathers Team, Workload, Billing,
      // Audit log, Practice profile into one group instead of
      // scattering them across Clients group + Settings sub-pages.
      // Contacts and Payments aren't built yet — deferred until
      // those routes exist.
      return {
        // 2026-05-20 layout: three standalone items above the RULE
        // group — no "Operations" label. Order reads as the CPA's
        // morning routine: glance Today → triage Deadlines. The
        // Inbox lives behind the bell icon in the top-right utility
        // strip (AlertsNotificationsBell) — clicking it opens a
        // popover; the expand icon there promotes to the full-page
        // Inbox at /notifications. Surfacing Inbox in the sidebar
        // too created two top-level destinations for the same thing.
        // 2026-05-25 (Yuqi Today follow-up — sidebar icon set):
        //   Today        → Calendar (plain calendar grid; Yuqi
        //                   walked back the Calendar1 day-marker
        //                   variant — the open grid reads cleaner
        //                   at sidebar scale)
        //   Alerts       → Megaphone (a literal announcement vector,
        //                   matches the alert concept of "the system
        //                   is broadcasting at you")
        //   Deadlines    → SquareChartGantt (Gantt = scheduling /
        //                   timeline view, matches the Deadlines
        //                   table's row-per-deadline cadence)
        //   Rule library → BookOpen (literal "reference manual",
        //                   replaces the more abstract Library icon)
        primary: [
          { href: '/', label: t`Today`, icon: CalendarIcon, end: true },
          {
            href: '/alerts',
            label: t`Alerts`,
            icon: MegaphoneIcon,
            end: false,
            ...(alertBadge !== undefined
              ? { badge: alertBadge, badgeTooltip: t`${alertCount} active alerts` }
              : {}),
          },
          {
            href: '/deadlines',
            label: t`Deadlines`,
            icon: SquareChartGanttIcon,
            end: false,
            ...(obligationsBadge !== undefined
              ? {
                  badge: obligationsBadge,
                  badgeTone: 'inventory' as const,
                  badgeTooltip: t`${firm.openObligationCount} open deadlines`,
                }
              : {}),
          },
        ],
        operations: [],
        clients: [],
        rules: [
          {
            href: '/rules/library',
            label: t`Rule library`,
            icon: BookOpenIcon,
            end: false,
            ...(ruleReviewBadge !== undefined
              ? { badge: ruleReviewBadge, badgeTooltip: t`${ruleReviewCount} rules pending review` }
              : {}),
          },
        ],
        coverage: [],
        // Team / Workload / Practice profile / Billing / Audit log live
        // inside `/settings` (the workspace-config hub). Surfacing them
        // here too would be duplicate chrome — sidebar keeps only the
        // daily client-facing destinations.
        practice: [
          {
            href: '/clients',
            label: t`Clients`,
            icon: UsersIcon,
            end: false,
            ...(clientsBadge !== undefined
              ? {
                  badge: clientsBadge,
                  badgeTone: 'inventory' as const,
                  badgeTooltip: t`${clientsCount} active clients`,
                }
              : {}),
          },
        ],
        footer: [
          // 2026-05-25 (Yuqi sidebar polish): "Alerts archive" was
          // promoted out of the sidebar footer — it's a sub-page
          // of /alerts (review what already happened on the same
          // surface), not a peer of Audit log / Settings.
          // Now lives as an "Archive" button inside the /alerts
          // page header instead. See features/alerts/AlertsListPage.tsx.
          { href: '/audit', label: t`Audit log`, icon: ScrollTextIcon, end: false },
          { href: '/settings', label: t`Settings`, icon: SettingsIcon, end: false },
        ],
      }
    }
    // Legacy (default) sidebar.
    return {
      primary: [],
      // 2026-05-25 (Yuqi Today follow-up — sidebar icon set): same
      // four-icon swap as the navV2 branch above. Legacy nav stays in
      // sync so the iconography reads identically regardless of flag.
      operations: [
        { href: '/', label: t`Today`, icon: CalendarIcon, end: true },
        {
          href: '/deadlines',
          label: t`Deadlines`,
          icon: SquareChartGanttIcon,
          end: false,
          ...(obligationsBadge !== undefined
            ? {
                badge: obligationsBadge,
                badgeTone: 'inventory' as const,
                badgeTooltip: t`${firm.openObligationCount} open deadlines`,
              }
            : {}),
        },
        {
          href: '/alerts',
          label: t`Alerts`,
          icon: MegaphoneIcon,
          end: false,
          ...(alertBadge !== undefined
            ? { badge: alertBadge, badgeTooltip: t`${alertCount} active alerts` }
            : {}),
        },
      ],
      clients: [
        {
          href: '/clients',
          label: t`Clients`,
          icon: UsersIcon,
          end: false,
          ...(clientsBadge !== undefined
            ? {
                badge: clientsBadge,
                badgeTone: 'inventory' as const,
                badgeTooltip: t`${clientsCount} active clients`,
              }
            : {}),
        },
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
          icon: BookOpenIcon,
          end: false,
        },
      ],
      coverage: [],
      practice: [],
      footer: [{ href: '/settings', label: t`Settings`, icon: SettingsIcon, end: false }],
    }
  }, [
    t,
    alertBadge,
    alertCount,
    ruleReviewBadge,
    ruleReviewCount,
    clientsBadge,
    clientsCount,
    obligationsBadge,
    firm.openObligationCount,
    navV2,
  ])
}

function NavGroups({ firm }: { firm: FirmPublic }) {
  const { t } = useLingui()
  const navV2 = useNavV2()
  const items = useNavItems(firm, navV2)
  if (navV2) {
    return (
      <nav aria-label={t`Primary navigation`} className="contents">
        {/* Today sits as a standalone item above OPERATIONS — no
          group label so the eye reads it as "home", separate from
          the daily-work group below. */}
        {items.primary.length > 0 ? (
          <NavGroupSection>
            {items.primary.map((item) => (
              <NavMenuItem key={item.href} item={item} />
            ))}
          </NavGroupSection>
        ) : null}
        {items.operations.length > 0 ? (
          <NavGroupSection label={t`Operations`}>
            {items.operations.map((item) => (
              <NavMenuItem key={item.href} item={item} disabled={Boolean(item.tag)} />
            ))}
          </NavGroupSection>
        ) : null}
        {items.rules.length > 0 ? (
          <NavGroupSection label={t`Rule`}>
            {items.rules.map((item) => (
              <NavMenuItem key={item.href} item={item} />
            ))}
          </NavGroupSection>
        ) : null}
        <NavGroupSection label={t`Clients`}>
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
        {/* 2026-05-28 (Yuqi /today polish — bell back in sidebar):
            Inbox bell sits with the rest of the footer's account-
            level controls (Audit log, Settings). The bell renders
            its own sidebar-styled trigger inside `AlertsNotifications-
            Bell`, so we just drop it next to its siblings inside the
            `SidebarMenuItem` envelope. */}
        <SidebarMenuItem>
          <AlertsNotificationsBell />
        </SidebarMenuItem>
      </NavGroupSection>
    </nav>
  )
}

function NavGroupSection({
  label,
  muted = false,
  children,
}: {
  // Labels stay visible only in the expanded rail; the sidebar primitive
  // hides them in icons-only mode via `data-collapsed`.
  label?: string
  muted?: boolean
  children: ReactNode
}) {
  // 2026-05-25 (Yuqi #31): `muted` groups (today: Audit log +
  // Settings) get pushed to the bottom of the sidebar via
  // `mt-auto`. They're secondary nav — the eye expects to find
  // them at the bottom of the rail, not directly under the primary
  // groups. Without this they sit immediately under Clients with no
  // separation.
  return (
    <SidebarGroup className={cn(muted && 'mt-auto opacity-55')}>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu>{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function NavMenuItem({ item, disabled = false }: { item: NavItem; disabled?: boolean }) {
  const Icon = item.icon
  const { collapsed, isMobile, notifySidebarNavigation } = useSidebar()
  const tooltip = navItemTooltip(item, disabled)
  const badgeTone = item.badgeTone ?? 'urgent'
  const tooltipDisabled = !collapsed || isMobile

  // 2026-05-26 (Yuqi sixty-ninth pass — "sidebar should stay
  // expanded when I navigate"): on click, notify the sidebar
  // context so the destination route's auto-collapse-on-panel-
  // mount is absorbed. The user explicitly chose to be on a new
  // page; landing there with the rail already collapsed would
  // contradict that intent. If they later click a row IN the new
  // page, auto-collapse fires normally — the absorber is a
  // one-shot.
  const handleSidebarNavClick = useCallback(() => {
    if (disabled) return
    notifySidebarNavigation()
  }, [disabled, notifySidebarNavigation])

  return (
    <SidebarMenuItem data-has-badge={item.badge ? 'true' : 'false'}>
      <Tooltip disabled={tooltipDisabled}>
        <TooltipTrigger
          render={
            <SidebarMenuButton
              render={
                <NavLink
                  to={item.href}
                  end={item.end ?? false}
                  aria-disabled={disabled || undefined}
                  aria-label={tooltip}
                  tabIndex={disabled ? -1 : undefined}
                  title={tooltipDisabled ? tooltip : undefined}
                  onClick={handleSidebarNavClick}
                />
              }
              data-has-badge={item.badge ? 'true' : 'false'}
              data-badge-tone={item.badge ? badgeTone : undefined}
              className={cn(disabled && 'pointer-events-none')}
              title={tooltipDisabled ? tooltip : undefined}
            >
              <Icon aria-hidden />
              <span data-slot="sidebar-menu-label">{item.label}</span>
              {item.badge ? <NavItemBadge value={item.badge} tone={badgeTone} /> : null}
              {item.tag ? (
                <span
                  data-slot="sidebar-menu-tag"
                  className="ml-auto text-xs tabular-nums text-text-muted"
                >
                  {item.tag}
                </span>
              ) : null}
            </SidebarMenuButton>
          }
        />
        <TooltipContent side="right" sideOffset={10} className="whitespace-nowrap">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </SidebarMenuItem>
  )
}

function NavItemBadge({ value, tone }: { value: string; tone: NonNullable<NavItem['badgeTone']> }) {
  // 2026-05-26 (rebase reconciliation): origin/main's sidebar primitive
  // doesn't export SidebarMenuBadgeDot. The badge alone carries the
  // value + tone — the collapsed-mode dot can be reintroduced as a
  // follow-up if needed.
  return (
    <SidebarMenuBadge aria-hidden="true" tone={tone}>
      {value}
    </SidebarMenuBadge>
  )
}

export { FirmSwitcherTrigger, NavGroups, roleLabel }
