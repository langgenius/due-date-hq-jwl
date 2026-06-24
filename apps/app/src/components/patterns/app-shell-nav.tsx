import { useCallback, useMemo, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { I18n } from '@lingui/core'
import {
  BookOpenIcon,
  CalendarIcon,
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
import { SidebarSetupCard } from '@/features/dashboard/sidebar-setup-card'
import { useActiveAlertCount, useAlertSourceHealthQueryOptions } from '@/features/alerts/api'
import { formatRelativeTime } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import {
  COMMAND_PALETTE_HOTKEY,
  formatShortcutForDisplay,
} from '@/components/patterns/keyboard-shell/display'
import { aggregateRuleLibraryPendingCount } from '@/components/patterns/app-shell-nav-model'
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
  /**
   * Extra active-state predicate. NavLink already flips active on an exact
   * (or prefix, when `end:false`) href match; `activeMatch` lets one nav row
   * own additional routes that share no href prefix. Settings uses this so the
   * sub-pages that live OUTSIDE `/settings/*` (/practice, /members, /workload,
   * /billing, /reminders) still light the Settings row. Returns true → the row
   * renders active (data-active), same styling as aria-current.
   */
  activeMatch?: (pathname: string) => boolean
}

type NavConfig = {
  // Standalone item(s) above the first labelled group. Today / Alerts /
  // Deadlines sit here as the CPA's morning-routine destinations —
  // visually separate from the labelled RULE group below.
  primary: NavItem[]
  // The Rule group (Rule library + Sources) — alert-monitoring
  // destinations, labelled so the eye can scan by "what kind of work
  // am I doing?". Labels are muted (uppercase 11px tracking) so they
  // read as orientation hints rather than chrome.
  rules: NavItem[]
  // The "Practice" group consolidates the daily client-facing
  // destination(s). Team / Workload / Billing / Audit log / Practice
  // profile live inside Settings sub-pages, not here.
  practice: NavItem[]
  // Bottom of the sidebar. Holds the Settings hub for workspace
  // configuration (Practice profile, Members, Billing, Audit, automation
  // settings — see `apps/app/src/routes/settings.tsx`). Personal account
  // settings live in the `UserMenuTrigger` dropdown, not here.
  footer: NavItem[]
}

// Settings sub-pages that live OUTSIDE `/settings/*` — they have their own
// top-level routes but are conceptually children of the Settings hub. Without
// this the Settings nav row goes dark when the user is on any of them.
const SETTINGS_SIBLING_PATHS = new Set([
  '/practice',
  '/members',
  '/workload',
  '/billing',
  '/reminders',
])
function matchesSettingsRow(pathname: string): boolean {
  return pathname.startsWith('/settings') || SETTINGS_SIBLING_PATHS.has(pathname)
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
        {/* pl-px nudges the 28px monogram so its center sits on the exact
            same rail centerline as the 16px nav icons below (a 28px avatar
            needs a 5px left inset vs a 16px icon's 11px to share one center). */}
        <span className="flex shrink-0 pl-px">
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
        // px-[11px] (was px-3) so the 16px search icon shares the exact rail
        // centerline (x=41) with the nav-row icons below it.
        'flex h-8 w-full cursor-pointer touch-manipulation items-center gap-2 rounded-lg bg-background-default px-[11px] text-left text-text-muted outline-none transition-[color,background-color,transform] active:scale-[0.98]',
        'hover:bg-background-sidebar-hover hover:text-text-secondary',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'group-data-[collapsed=true]/sidebar:gap-0 group-data-[collapsed=true]/sidebar:bg-transparent group-data-[collapsed=true]/sidebar:text-text-tertiary',
        // 2026-06-22 (Yuqi consistency): collapse to the same centered 32×32
        // square as the nav rows so the hover wash matches the selected tile.
        'group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:w-8 group-data-[collapsed=true]/sidebar:px-2',
      )}
    >
      <SearchIcon className="size-4 shrink-0 text-text-muted" aria-hidden />
      {/* 13px placeholder — a step below the 15px nav labels so the search
          hint reads as a quiet prompt, not a heading. (Was an oversized
          16px, which made the field look clunky.) */}
      <span className="min-w-0 flex-1 truncate text-sm text-text-tertiary group-data-[collapsed=true]/sidebar:hidden">
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
 * SidebarSystemStatus — a quiet "what are we watching" reassurance line in the
 * footer zone (just under Audit log / Settings). Reads the canonical
 * `pulse.listSourceHealth` query for the monitoring SCOPE (source + jurisdiction
 * counts, last sweep time).
 *
 * Deliberately positive-only: it never surfaces per-source failures. Which
 * government sites we scrape and whether one is throwing a bot-challenge or a
 * 5xx is an internal/dev concern a CPA firm can't act on, so the rail shows a
 * steady success-tone dot and the scope, never a red "N sources need attention".
 * Source failures are handled out-of-band (ops alerts + the weekly source-health
 * workflow). Clicking opens `/rules/sources` (coverage view). Renders nothing
 * until data loads or when there are no enabled sources. Collapsed rail: just
 * the dot, full status on hover. The dot sits in a 16px slot so it centers on
 * the nav-icon column.
 */
function SidebarSystemStatus() {
  const { t } = useLingui()
  const healthQuery = useQuery(useAlertSourceHealthQueryOptions())
  const enabled = useMemo(
    () => (healthQuery.data?.sources ?? []).filter((source) => source.enabled),
    [healthQuery.data],
  )

  if (healthQuery.isPending || enabled.length === 0) return null

  const sourceCount = enabled.length
  const jurisdictions = new Set(enabled.map((source) => source.jurisdiction)).size
  const lastChecked =
    enabled
      .map((source) => source.lastCheckedAt)
      .filter((value): value is string => Boolean(value))
      .toSorted()
      .at(-1) ?? null
  const relativeChecked = lastChecked ? formatRelativeTime(lastChecked) : null

  // Source health is an internal/dev concern — which government sites we scrape
  // and whether one is throwing a bot-challenge or a 5xx isn't something a CPA
  // firm can act on, and surfacing it as a red "N sources need attention" only
  // erodes trust. The rail pill stays a positive reassurance: a steady-tone dot
  // and the monitoring SCOPE ("what are we watching"). Failures are handled
  // out-of-band (ops alerts + the weekly source-health workflow).
  const dotToneClass = 'bg-text-success'

  const scopeLabel = (
    <Plural
      value={jurisdictions}
      one="Monitoring # jurisdiction"
      other="Monitoring # jurisdictions"
    />
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
              // 2026-06-22 (Yuqi consistency): in the collapsed rail this is just
              // the status dot — collapse to the same centered 32×32 square as the
              // nav rows (size-8 squares the h-7 row) so its hover wash matches.
              'group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:size-8 group-data-[collapsed=true]/sidebar:px-2',
            )}
            {...props}
          >
            <span className="flex w-4 shrink-0 justify-center">
              <span className={cn('size-1.5 rounded-full', dotToneClass)} aria-hidden />
            </span>
            {/* Scope only — the "swept …" freshness lives in the tooltip now.
                With the timestamp inline at text-sm the line overflowed ~190px
                and truncated mid-word ("Monitoring 52 jurisdiction…"). The
                quieter text-xs caption fits the scope cleanly and reads as
                ambient footer info sitting under the utility rows, not a peer
                nav row competing with Audit log / Settings. */}
            <span className="min-w-0 flex-1 truncate text-xs text-text-tertiary group-data-[collapsed=true]/sidebar:hidden">
              {scopeLabel}
            </span>
          </Link>
        )}
      />
      <TooltipContent>
        <div className="flex max-w-[240px] flex-col gap-1 text-left">
          <span className="font-semibold">{scopeLabel}</span>
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
  return aggregateRuleLibraryPendingCount(query.data ?? [])
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

function useNavItems(firm: FirmPublic): NavConfig {
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
      // Inbox lives behind the bell icon in the sidebar footer
      // (AlertsNotificationsBell, next to Audit log / Settings) —
      // clicking it opens a popover; the expand icon there promotes
      // to the full-page Inbox at /notifications. Surfacing Inbox in
      // the sidebar nav too created two top-level destinations for
      // the same thing.
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
            ? { badge: alertBadge, badgeTooltip: t`${alertCount} open alerts` }
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
        {
          href: '/settings',
          label: t`Settings`,
          icon: SettingsIcon,
          end: false,
          activeMatch: matchesSettingsRow,
        },
      ],
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
  ])
}

function NavGroups({ firm }: { firm: FirmPublic }) {
  const { t } = useLingui()
  const items = useNavItems(firm)
  return (
    <nav aria-label={t`Primary navigation`} className="contents">
      {/* Today / Alerts / Deadlines sit as standalone items at the top —
          no group label so the eye reads them as the daily-work "home",
          separate from the labelled RULE group below. */}
      {items.primary.length > 0 ? (
        <NavGroupSection>
          {items.primary.map((item) => (
            <NavMenuItem key={item.href} item={item} />
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
      {/* Footer slot stacks the gentle setup nudge ABOVE the ambient system-
          status caption: the card is the only one that ever asks for an
          action (and self-hides the moment both signals go true), so it reads
          as the brief "finish setup" prompt sitting over the passive
          "what we're watching" line. Both step aside in the collapsed rail. */}
      <NavGroupSection
        muted
        footerSlot={
          <div className="flex flex-col gap-2">
            <SidebarSetupCard />
            <SidebarSystemStatus />
          </div>
        }
      >
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
  footerSlot,
  className,
  children,
}: {
  // Labels stay visible only in the expanded rail; the sidebar primitive
  // hides them in icons-only mode via `data-collapsed`.
  label?: string
  muted?: boolean
  // Quiet content rendered at the FOOT of the group, below the nav items —
  // used by the muted footer group to host the system-status caption just
  // above the user chip (an ambient "what we're watching" line paired with
  // identity, rather than a full-strength row above Audit log / Settings).
  footerSlot?: ReactNode
  className?: string
  children: ReactNode
}) {
  // `muted` groups (Audit log + Settings) get pushed to the bottom of
  // the sidebar via `mt-auto`. They're secondary nav — the eye expects
  // to find them at the bottom of the rail, not directly under the
  // primary groups; without this they sit immediately under Clients with
  // no separation.
  // 2026-06-21 (Yuqi "messy and squashed" pass): the footer zone now reads
  // top-to-bottom as one tidy stack — a single hairline CAPS the zone, then
  // the crisp utility rows (Audit log, Settings), then the ambient system-
  // status caption at the foot, then the user chip below. Two changes from
  // the prior layout: (1) the hairline moved from the MIDDLE of the group
  // (between status and the nav) to the TOP, so there's one clean seam, not a
  // seam wedged mid-stack; (2) the blanket `opacity-60` on the nav rows is
  // gone — it muddied the already-tertiary icons into near-illegibility and
  // inverted the hierarchy (passive status brighter than actionable rows).
  // The rows are demoted by POSITION now, not by dimming.
  // The hairline is a center-weighted gradient (transparent → divider →
  // transparent) inset 4px from the card edges, so it reads as a soft seam
  // rather than a hard ruled line. The user chip drops its own divider, so
  // there's ONE line in the footer zone, not two.
  return (
    <SidebarGroup className={cn(muted && 'mt-auto pt-2.5', className)}>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      {/* One hairline caps the footer zone. On tall viewports the mt-auto gap
          already opens the seam; the hairline guarantees one on short
          viewports where the footer butts up against the last nav group. */}
      {muted ? (
        <div
          aria-hidden
          className="mx-1 mb-2 h-px bg-gradient-to-r from-transparent via-divider-regular to-transparent"
        />
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu>{children}</SidebarMenu>
      </SidebarGroupContent>
      {/* The system-status caption sits at the FOOT of the group, just above
          the user chip — passive "what we're watching" reassurance paired with
          identity, not a full-strength row above the utilities. */}
      {footerSlot ? <div className="mt-1.5">{footerSlot}</div> : null}
    </SidebarGroup>
  )
}

function NavMenuItem({ item, disabled = false }: { item: NavItem; disabled?: boolean }) {
  const Icon = item.icon
  const { collapsed, isMobile, notifySidebarNavigation } = useSidebar()
  const { pathname } = useLocation()
  const tooltip = navItemTooltip(item, disabled)
  const badgeTone = item.badgeTone ?? 'urgent'
  const tooltipDisabled = !collapsed || isMobile
  // NavLink owns active state for the row's own href; `activeMatch` lets a row
  // additionally claim routes that live outside its href prefix (Settings →
  // /practice, /members, /workload, /billing, /reminders). data-active flips
  // the same styling as NavLink's aria-current.
  const extraActive = item.activeMatch?.(pathname) ?? false

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
              isActive={extraActive}
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
                  className="ml-auto text-xs tabular-nums text-text-tertiary"
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
