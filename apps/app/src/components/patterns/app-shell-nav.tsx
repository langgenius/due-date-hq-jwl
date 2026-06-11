import { useCallback, useMemo, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { I18n } from '@lingui/core'
import {
  BookOpenIcon,
  CalendarIcon,
  MapIcon,
  MegaphoneIcon,
  SatelliteDishIcon,
  ScrollTextIcon,
  SearchIcon,
  SettingsIcon,
  SquareChartGanttIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import type { FirmPublic } from '@duedatehq/contracts'
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
import { cn } from '@duedatehq/ui/lib/utils'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { useActiveAlertCount, useAlertSourceHealthQueryOptions } from '@/features/alerts/api'
import { formatRelativeTime } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import {
  COMMAND_PALETTE_HOTKEY,
  formatShortcutForDisplay,
} from '@/components/patterns/keyboard-shell/display'
import { useNavV2 } from '@/components/patterns/use-nav-v2'
import { useKeyboardShell } from '@/components/patterns/keyboard-shell/hooks'

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

// The sidebar header does not open a practice switcher — multi-practice
// switching and the self-serve "Add practice" dialog are not in the UI
// (the `firms.switchActive` / `firms.create` procedures stay server-side;
// onboarding still drives them). The header is a STATIC workspace identity.
// It keeps the Pencil v202hj §BrandHeader box metrics — fixed h-10, rounded-xl 1px
// border, 32px monogram + practice name — minus the chevron and every
// interactive affordance (cursor, hover border, focus ring, hotkey),
// so expanded/collapsed layout behaves exactly as before: collapsing
// turns the border transparent (1px layout preserved → no shift) and
// hides the name via its own group-collapsed:hidden.
function FirmIdentityHeader({ firm }: { firm: FirmPublic }) {
  return (
    // `SidebarHeader` is a `flex
    // flex-col` wrapper with no grow constraint. `min-w-0 flex-1`
    // makes it expand to fill the header row so siblings the
    // app-shell may place beside it stay inside the sidebar
    // boundary. Collapsed mode overrides with `w-auto flex-none`
    // in the parent.
    <SidebarHeader className="min-w-0 flex-1">
      {/* Collapsed rail: the monogram stays left-aligned like the nav icons
          below — the rail width is tuned so left-aligned == centered, so
          nothing snaps during the collapse/expand animation. */}
      <div
        title={firm.name}
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl p-1 group-data-[collapsed=true]/sidebar:gap-0"
      >
        {/* The workspace monogram is `sm` (28px) — same size as the
            footer user avatar so the top + bottom of the rail bookend as a
            matched pair. Shape stays SQUARE (org) vs the user's round
            (person). Renders in both modes. */}
        <span className="flex shrink-0">
          <AssigneeAvatar
            name={firm.name}
            title={firm.name}
            type="firm"
            shape="square"
            size="sm"
            className="shrink-0"
          />
        </span>
        <span
          // 2026-06-10 (Yuqi "bigger one size up"): firm name text-sm (12px)
          // → text-base (14px) so the workspace identity anchors the rail.
          className="min-w-0 flex-1 truncate text-base font-medium text-text-primary group-data-[collapsed=true]/sidebar:hidden"
          translate="no"
        >
          {firm.name}
        </span>
      </div>
    </SidebarHeader>
  )
}

/**
 * SidebarQuickFind — the "Quick find…" search affordance under the firm
 * identity header (Pencil duedatehq_work.pen §QuickSearch).
 *
 * It is not a real input: clicking it (or pressing the ⌘K hotkey) opens
 * the global CommandPalette, which owns the actual search field, client
 * results and navigation. Rendering it as a button keeps a single source
 * of truth for search while giving the rail a visible, discoverable
 * entry point — the keyboard-only ⌘K was undiscoverable for new users.
 *
 * Collapsed rail: shrinks to a centered 32×32 icon tile (no fill, no
 * label, no shortcut) so it sits in family with the icon-only nav rows.
 */
function SidebarQuickFind() {
  const { t } = useLingui()
  const { collapsed, isMobile } = useSidebar()
  const { openCommandPalette } = useKeyboardShell()
  // Keep the space between glyphs ("⌘ K") — Yuqi wants it spaced, not
  // compacted — so the modifier and key read with a little air between
  // them rather than as one cramped token.
  const shortcut = formatShortcutForDisplay(COMMAND_PALETTE_HOTKEY)
  const collapsedRail = collapsed && !isMobile

  return (
    // Pencil §QuickSearch metrics: height 40 (h-10), padding [0,12] → px-3,
    // gap 8 → gap-2, cornerRadius 8 (rounded-lg), fill #f2f4f7
    // (bg-background-subtle). No wrapper
    // padding (the card panel's p-3 owns it) and no collapsed re-
    // centering: the metrics are identical in both modes. Collapsed only
    // drops the fill (Pencil §xiZyr QuickSearch is unfilled) and hides
    // the label + shortcut; the icon then centers via the symmetric
    // padding, exactly like the nav rows.
    <button
      type="button"
      onClick={() => openCommandPalette()}
      aria-label={t`Quick find`}
      aria-keyshortcuts="Meta+K Control+K"
      title={collapsedRail ? t`Quick find` : undefined}
      className={cn(
        // NO border on the
        // search field — the white fill alone lifts it off the #f6f8fa
        // card. Hover is a subtle bg wash (same token as the nav rows),
        // not a border darken. Collapsed drops the fill so the icon
        // centers like the nav rows.
        // transform added to the transition + active:scale-[0.98] for the
        // same tactile press as the nav rows (Yuqi "delicacy").
        'flex h-8 w-full cursor-pointer touch-manipulation items-center gap-2 rounded-lg bg-background-default px-3 text-left text-text-muted outline-none transition-[color,background-color,transform] active:scale-[0.98]',
        'hover:bg-background-sidebar-hover hover:text-text-secondary',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'group-data-[collapsed=true]/sidebar:gap-0 group-data-[collapsed=true]/sidebar:bg-transparent group-data-[collapsed=true]/sidebar:text-text-tertiary',
      )}
    >
      <SearchIcon className="size-4 shrink-0 text-text-muted" aria-hidden />
      {/* 13px placeholder — a step below the 15px nav labels so the search
          hint reads as a quiet prompt, not a heading. (Was an oversized
          16px, which made the field look clunky.) */}
      <span className="min-w-0 flex-1 truncate text-sm text-text-muted group-data-[collapsed=true]/sidebar:hidden">
        {t`Quick find…`}
      </span>
      {/* ⌘K hint — plain muted mono text (no keycap box) so the field
          carries no extra borders/lines. */}
      <span className="shrink-0 font-mono text-xs font-medium text-text-tertiary group-data-[collapsed=true]/sidebar:hidden">
        {shortcut}
      </span>
    </button>
  )
}

/**
 * SidebarSystemStatus — a quiet "is monitoring actually working?" line in the
 * footer zone (just under Audit log / Settings). Reads the canonical
 * `pulse.listSourceHealth` query (the SAME one the Sources tab uses, so the two
 * can't drift) and derives two facts: whether any enabled source is degraded /
 * failing, and when the sweep last ran.
 *
 * The DOT carries the tone (green / amber / red); the label stays neutral —
 * chromatic accent lives in the container, never the rail text. Clicking opens
 * `/rules/sources` to investigate. Renders nothing until data loads or when
 * there are no enabled sources. Collapsed rail: just the tone dot, full status
 * on hover. The dot sits in a 16px slot so it centers on the nav-icon column.
 */
function SidebarSystemStatus() {
  const { t } = useLingui()
  const healthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const enabled = useMemo(
    () => (healthQuery.data?.sources ?? []).filter((source) => source.enabled),
    [healthQuery.data],
  )

  if (healthQuery.isPending || enabled.length === 0) return null

  const failing = enabled.filter((source) => source.healthStatus === 'failing').length
  const degraded = enabled.filter((source) => source.healthStatus === 'degraded').length
  const needAttention = failing + degraded
  const sourceCount = enabled.length
  const jurisdictions = new Set(enabled.map((source) => source.jurisdiction)).size
  const lastChecked =
    enabled
      .map((source) => source.lastCheckedAt)
      .filter((value): value is string => Boolean(value))
      .toSorted()
      .at(-1) ?? null
  const relativeChecked = lastChecked ? formatRelativeTime(lastChecked) : null

  const dotToneClass =
    failing > 0 ? 'bg-text-destructive' : degraded > 0 ? 'bg-text-warning' : 'bg-text-success'

  // The DOT carries health; the line text shows the monitoring SCOPE while
  // everything's healthy ("what are we watching"), then swaps to the problem
  // the moment a source degrades/fails. The tooltip always carries both.
  const healthLabel =
    needAttention === 0 ? (
      <Trans>All sources healthy</Trans>
    ) : (
      <Plural
        value={needAttention}
        one="# source needs attention"
        other="# sources need attention"
      />
    )
  const lineLabel =
    needAttention === 0 ? (
      <Plural
        value={jurisdictions}
        one="Monitoring # jurisdiction"
        other="Monitoring # jurisdictions"
      />
    ) : (
      healthLabel
    )

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <Link
            to="/rules/sources"
            aria-label={t`Source monitoring status`}
            className={cn(
              'flex h-7 w-full items-center gap-3 rounded-lg px-[11px] text-left outline-none transition-[color,background-color] hover:bg-background-sidebar-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              'group-data-[collapsed=true]/sidebar:gap-0',
            )}
            {...props}
          >
            <span className="flex w-4 shrink-0 justify-center">
              <span className={cn('size-1.5 rounded-full', dotToneClass)} aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-text-tertiary group-data-[collapsed=true]/sidebar:hidden">
              {lineLabel}
              {relativeChecked ? (
                <span className="text-text-muted">
                  {' · '}
                  <Trans>swept {relativeChecked}</Trans>
                </span>
              ) : null}
            </span>
          </Link>
        )}
      />
      <TooltipContent>
        <div className="flex max-w-[240px] flex-col gap-1 text-left">
          <span className="font-semibold">{healthLabel}</span>
          <span>
            <Trans>
              Monitoring {sourceCount} sources across {jurisdictions} jurisdictions
            </Trans>
          </span>
          {relativeChecked ? (
            <span>
              <Trans>Last swept {relativeChecked}</Trans>
            </span>
          ) : null}
          <span className="text-components-tooltip-text/80">
            <Trans>Click to open Sources.</Trans>
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// The sidebar Alerts badge does NOT read from `notifications.unreadCount`.
// That bucket covers @-mentions, status changes, system events — anything
// that lands in the unified Inbox — while the Alerts sidebar entry and the
// Today "Alerts" strip both scope to alert-source changes. Mixing them
// would have three surfaces claiming the same word count three different
// things.
//
// The badge uses the dedicated `pulse.activeCount` endpoint — a true
// `COUNT(*)` against the same WHERE clause `listAlerts` uses. Fetching
// up to 50 rows and calling `.length` would silently truncate to "50"
// for any firm with more than 50 active alerts; the count endpoint has
// no upper bound. Today's section still uses `listAlerts(50)` because it
// needs the row contents to render the alert cards.
//
// Keep this badge scoped to the active queue. Alert history is CPA-handled
// alerts and can include applied / dismissed rows that should not inflate
// the sidebar's needs-attention count.
//
// `useActiveAlertCount` lives in `features/alerts/api` and is shared by the
// sidebar badge, the /alerts header pill, and the detail rail head — one
// authoritative count, so all three agree.

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
  // useActiveAlertCount is alert-source only (not notifications.unreadCount,
  // which mixes @-mentions and system notifications into the count). Sidebar
  // and Today share one cache entry and report the same number.
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
      // v2 IA. Alerts is a top-level
      // primary item (mirrored by the dashboard's NEEDS ATTENTION
      // surface). Coverage / Library consolidate under their own
      // group. Practice management gathers Team, Workload, Billing,
      // Audit log, Practice profile into one group instead of
      // scattering them across Clients group + Settings sub-pages.
      // Contacts and Payments aren't built yet — deferred until
      // those routes exist.
      return {
        // Three standalone items above the RULE
        // group — no "Operations" label. Order reads as the CPA's
        // morning routine: glance Today → triage Deadlines. The
        // Inbox lives behind the bell icon in the top-right utility
        // strip (AlertsNotificationsBell) — clicking it opens a
        // popover; the expand icon there promotes to the full-page
        // Inbox at /notifications. Surfacing Inbox in the sidebar
        // too created two top-level destinations for the same thing.
        // Sidebar icon set:
        //   Today        → Calendar (plain calendar grid, not the
        //                   Calendar1 day-marker variant — the open
        //                   grid reads cleaner at sidebar scale)
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
          // The monitored-source health page (/rules/sources) is
          // surfaced in the rail next to Rule library — both belong
          // to alert monitoring
          // (the system watches these sources and raises alerts when a
          // rule drifts). SatelliteDishIcon matches the Alerts feature's
          // existing Sources iconography (AlertsListPage, PulseToneIcon).
          {
            href: '/rules/sources',
            label: t`Sources`,
            icon: SatelliteDishIcon,
            end: false,
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
          // "Alerts archive" is not in the sidebar footer — it's a
          // sub-page of /alerts (review what already happened on the
          // same surface), not a peer of Audit log / Settings. It
          // lives as an "Archive" button inside the /alerts page
          // header instead. See features/alerts/AlertsListPage.tsx.
          { href: '/audit', label: t`Audit log`, icon: ScrollTextIcon, end: false },
          { href: '/settings', label: t`Settings`, icon: SettingsIcon, end: false },
        ],
      }
    }
    // Legacy (default) sidebar.
    return {
      primary: [],
      // Same four-icon set as the navV2 branch above. Legacy nav stays in
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
        {/* The CLIENTS eyebrow both labels the group and separates Clients
            from the RULE group above (Rule library + Sources) — Clients is
            its own destination, not a rule. The label's own top padding
            provides the break. */}
        <NavGroupSection label={t`Clients`}>
          {items.practice.map((item) => (
            <NavMenuItem key={item.href} item={item} />
          ))}
        </NavGroupSection>
        <NavGroupSection muted topSlot={<SidebarSystemStatus />}>
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
      <NavGroupSection muted topSlot={<SidebarSystemStatus />}>
        {items.footer.map((item) => (
          <NavMenuItem key={item.href} item={item} />
        ))}
        {/* Inbox bell sits with the rest of the footer's account-
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
  topSlot,
  className,
  children,
}: {
  // Labels stay visible only in the expanded rail; the sidebar primitive
  // hides them in icons-only mode via `data-collapsed`.
  label?: string
  muted?: boolean
  // Full-strength content rendered ABOVE the (possibly dimmed) nav items —
  // used by the muted footer group to host the system-status line above
  // Audit log / Settings.
  topSlot?: ReactNode
  className?: string
  children: ReactNode
}) {
  // `muted` groups (Audit log + Settings) get pushed to the bottom of
  // the sidebar via `mt-auto`. They're secondary nav — the eye expects
  // to find them at the bottom of the rail, not directly under the
  // primary groups; without this they sit immediately under Clients with
  // no separation.
  // The muted footer group carries a faint hairline + top padding so it
  // anchors the footer zone (the user chip below it drops its own
  // divider, so there's ONE line, not two). The dimming moves onto the
  // content so the hairline itself stays full-strength.
  // 2026-06-10 (Yuqi "delicacy"): the hairline is a center-weighted
  // gradient (transparent → divider → transparent) inset 4px from the
  // card edges, so it reads as a soft seam rather than a hard ruled line.
  return (
    <SidebarGroup className={cn(muted && 'mt-auto pt-2.5', className)}>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      {/* topSlot (e.g. the system-status line) sits ABOVE the divider, at full
          strength; the gradient hairline below then separates it from the
          dimmed nav links. With no topSlot, the hairline simply caps the
          group's top as before. */}
      {topSlot ? <div className="pb-1.5">{topSlot}</div> : null}
      {muted ? (
        <div
          aria-hidden
          className="mx-1 mb-1 h-px bg-gradient-to-r from-transparent via-divider-regular to-transparent"
        />
      ) : null}
      <SidebarGroupContent className={cn(muted && 'opacity-60')}>
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

  // On click, notify the sidebar context so the destination route's
  // auto-collapse-on-panel-mount is absorbed and the rail stays
  // expanded. The user explicitly chose to be on a new
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
  // The sidebar primitive doesn't export SidebarMenuBadgeDot.
  // The badge alone carries the
  // value + tone — the collapsed-mode dot can be reintroduced as a
  // follow-up if needed.
  return (
    <SidebarMenuBadge aria-hidden="true" tone={tone}>
      {value}
    </SidebarMenuBadge>
  )
}

export { FirmIdentityHeader, NavGroups, SidebarQuickFind, SidebarSystemStatus, roleLabel }
