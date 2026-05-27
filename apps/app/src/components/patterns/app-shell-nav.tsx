import { useCallback, useMemo, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { I18n } from '@lingui/core'
import {
  BookOpenIcon,
  CalendarIcon,
  MapIcon,
  MegaphoneIcon,
  ScrollTextIcon,
  SettingsIcon,
  SparklesIcon,
  SquareChartGanttIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import { type FirmPublic } from '@duedatehq/contracts'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'
import { initialsFromName } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { useNavV2 } from '@/components/patterns/use-nav-v2'

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

function roleLabel(role: FirmPublic['role'], i18n: I18n): string {
  return i18n._(NAV_ROLE_LABELS[role])
}

function navItemTooltip(item: NavItem, disabled: boolean): string {
  if (disabled && item.disabledReason) return `${item.label}, ${item.disabledReason}`
  if (item.badgeTooltip) return `${item.label}, ${item.badgeTooltip}`
  return item.label
}

function FirmSwitcherTrigger({ firm }: { firm: FirmPublic; firms: FirmPublic[] }) {
  const currentMonogram = firmMonogram(firm.name)

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
      {/* 2026-05-27 (browser feedback #1): hide the practice
          switching operation from the sidebar. The current practice
          remains visible as static identity, without a dropdown,
          chevron, add-practice action, or switcher hotkey. */}
      <div
        className="flex h-14 min-w-0 flex-1 items-center gap-2.5 px-3 text-left group-data-[collapsed=true]/sidebar:h-8 group-data-[collapsed=true]/sidebar:w-8 group-data-[collapsed=true]/sidebar:flex-none group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0"
        title={firm.name}
      >
        {/* 2026-05-26 (Yuqi forty-fourth pass — sidebar header
            match Frame 137 reference): avatar bumped size-8 (32px)
            → size-10 (40px) and firm name bumped text-sm → text-base
            so the brand-identity row reads as a proper header,
            not a slim row. Reference screenshot shows a clearly
            prominent logo + name pair as the rail's top anchor.
            Collapsed mode still uses size-7 (28px) inside the
            56px rail. */}
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-primary text-base font-semibold text-text-inverted group-data-[collapsed=true]/sidebar:size-7 group-data-[collapsed=true]/sidebar:text-xs"
          translate="no"
        >
          {currentMonogram}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-base font-medium text-text-primary group-data-[collapsed=true]/sidebar:hidden"
          translate="no"
        >
          {firm.name}
        </span>
      </div>
    </SidebarHeader>
  )
}

// 2026-05-24 (critique P0): the sidebar Alerts badge previously read
// from `notifications.unreadCount`. That bucket covers @-mentions,
// status changes, system events — anything that lands in the unified
// Inbox — while the Alerts sidebar entry and the Today "Alerts" strip
// both scope to *Pulse* (statutory-source changes). Result: three
// surfaces claiming the same word counted three different things
// (2 sidebar, 3 Today, 4 Pulse-page history).
//
// 2026-05-26 (Yuqi feedback — "why is it 3 besides Alert, where
// there are 4 alerts?"): the sidebar previously used the dedicated
// `pulse.activeCount` endpoint (active/open alerts only), while
// /rules/pulse renders `pulse.listHistory` (all alerts including
// Applied + Dismissed). When a CPA has, say, 3 open + 1 dismissed
// alerts visible on the page, the sidebar said "3" but the page
// showed 4 items — confusing. Switched the sidebar to use the same
// `listHistory.length` count the page chip uses so the two numbers
// always agree. The semantic is now "alerts in your queue" (including
// dismissed/applied that remain visible on the page) rather than
// "alerts you still need to act on."
//
// 2026-05-24 (B2): the badge now uses the dedicated `pulse.activeCount`
// endpoint — a true `COUNT(*)` against the same WHERE clause
// `listAlerts` uses. The previous shape fetched up to 50 rows just to
// call `.length` on the array, so any firm with more than 50 active
// alerts saw "50" in the badge (silent truncation). The count endpoint
// has no upper bound; Today's section still uses `listAlerts(50)`
// because it needs the row contents to render the alert cards.
function useActivePulseAlertCount(): number {
  // Source-of-truth count for the sidebar badge. Matches what
  // /rules/pulse shows in its page-header chip (which renders all
  // alerts from listHistory, including dismissed/applied). Limit
  // 50 mirrors the /rules/pulse fetch cap; the page itself displays
  // alerts.length so we count the same array.
  const query = useQuery(orpc.pulse.listHistory.queryOptions({ input: { limit: 50 } }))
  return query.data?.alerts.length ?? 0
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

// 2026-05-24 (B2): retired `SIDEBAR_PULSE_LIMIT = 50`. The sidebar
// badge now goes through `pulse.activeCount` (true COUNT(*) with no
// upper bound) instead of slicing `pulse.listAlerts`. See the comment
// on `useActivePulseAlertCount` above for the full history.

function useClientsCount(): number {
  const query = useQuery(orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }))
  return query.data?.length ?? 0
}

function useNavItems(firm: FirmPublic, navV2: boolean): NavConfig {
  const { t } = useLingui()
  // 2026-05-24 (critique P0): switched from notifications.unreadCount
  // (which mixed @-mentions and system notifications into the count)
  // to useActivePulseAlertCount (Pulse-only). Sidebar and Today now
  // share one cache entry and report the same number.
  const pulseCount = useActivePulseAlertCount()
  const pulseBadge = pulseCount > 0 ? String(pulseCount) : undefined
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
      // v2 IA per 2026-05-19 design mockup. Radar disappears from the
      // sidebar — it lives as the NEEDS ATTENTION surface on the
      // dashboard. Coverage / Library consolidate under their own
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
        // strip (PulseNotificationsBell) — clicking it opens a
        // popover; the expand icon there promotes to the full-page
        // Inbox at /notifications. Surfacing Inbox in the sidebar
        // too created two top-level destinations for the same thing.
        // 2026-05-25 (Yuqi Today follow-up — sidebar icon set):
        //   Today        → Calendar (plain calendar grid; Yuqi
        //                   walked back the Calendar1 day-marker
        //                   variant — the open grid reads cleaner
        //                   at sidebar scale)
        //   Alerts       → Megaphone (a literal announcement vector,
        //                   matches the Pulse concept of "the system
        //                   is broadcasting at you")
        //   Deadlines    → SquareChartGantt (Gantt = scheduling /
        //                   timeline view, matches the Deadlines
        //                   table's row-per-deadline cadence)
        //   Rule library → BookOpen (literal "reference manual",
        //                   replaces the more abstract Library icon)
        primary: [
          { href: '/', label: t`Today`, icon: CalendarIcon, end: true },
          {
            href: '/rules/pulse',
            label: t`Alerts`,
            icon: MegaphoneIcon,
            end: false,
            ...(pulseBadge !== undefined
              ? { badge: pulseBadge, badgeTooltip: t`${pulseCount} active alerts` }
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
          {
            href: '/opportunities',
            label: t`Opportunities`,
            icon: SparklesIcon,
            end: false,
          },
        ],
        footer: [
          // 2026-05-25 (Yuqi sidebar polish): "Alerts archive" was
          // promoted out of the sidebar footer — it's a sub-page
          // of /alerts (review what already happened on the same
          // surface), not a peer of Audit log / Settings.
          // Now lives as an "Archive" button inside the /alerts
          // page header instead. See features/pulse/AlertsListPage.tsx.
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
          href: '/rules/pulse',
          label: t`Pulse`,
          icon: MegaphoneIcon,
          end: false,
          ...(pulseBadge !== undefined
            ? { badge: pulseBadge, badgeTooltip: t`${pulseCount} active alerts` }
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
    pulseBadge,
    pulseCount,
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
