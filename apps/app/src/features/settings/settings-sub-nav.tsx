import { NavLink } from 'react-router'
import { useLingui } from '@lingui/react/macro'
import {
  BellIcon,
  Building2Icon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CreditCardIcon,
  MailIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Settings IA — single source of truth.
 *
 * 2026-06-08 (IA audit — "unify the two divergent Settings navs"):
 * Previously `/settings` (settings.tsx) was a card-hub linking to
 * Practice/Members/Workload/Billing/Audit/Reminders/Notifications/Calendar,
 * while this sticky rail listed a DIFFERENT, non-overlapping set
 * (Profile/Team/Permissions/Reminders/Notifications/Billing) used only by
 * /settings/profile and /settings/permissions. The two never referenced
 * each other, so a user on /settings could not reach Profile or
 * Permissions, and a user on /settings/profile could not reach Practice,
 * Workload, Audit, or Calendar.
 *
 * The fix: this module now owns the complete, grouped list of every real
 * settings destination. Both surfaces consume `SETTINGS_NAV_SECTIONS`:
 *   • the in-page rail (SettingsSubNav) renders the flat link list,
 *   • the /settings index hub (settings.tsx) renders the grouped cards.
 * They are now guaranteed to list the same destinations.
 *
 * Every `to` below is verified against router.tsx:
 *   Profile        → /settings/profile          (settings family)
 *   Permissions    → /settings/permissions      (settings family)
 *   Practice       → /practice
 *   Team / Members → /members
 *   Workload       → /workload
 *   Billing        → /billing
 *   Email Template → /reminders
 *   Notifications  → /notifications/preferences
 *   Calendar sync  → /deadlines/calendar
 *
 * Personal account settings (/account/security, sign-out) stay in the
 * sidebar's UserMenuTrigger dropdown — a different conceptual level.
 */

export type SettingsNavItem = {
  to: string
  label: string
  description: string
  Icon: LucideIcon
  /** NavLink `end` — only true for paths that prefix-match a sibling. */
  end?: boolean
}

export type SettingsNavSection = {
  label: string
  description: string
  items: SettingsNavItem[]
}

/**
 * The grouped settings destination registry. Consumed by both the rail
 * (flattened) and the /settings overview hub (grouped). Built inside a
 * hook so the lingui `t` macro can localize labels/descriptions.
 */
export function useSettingsNavSections(): SettingsNavSection[] {
  const { t } = useLingui()
  return [
    {
      label: t`Account`,
      description: t`Your personal profile and access for this practice.`,
      items: [
        {
          to: '/settings/profile',
          label: t`Profile`,
          description: t`Your name, contact details, and display preferences.`,
          Icon: UserRoundIcon,
        },
        {
          to: '/settings/permissions',
          label: t`Permissions`,
          description: t`What your role can see and do in this workspace.`,
          Icon: ShieldCheckIcon,
        },
      ],
    },
    {
      label: t`Practice`,
      description: t`Identity, team, and capacity for this practice workspace.`,
      items: [
        {
          to: '/practice',
          label: t`Practice profile`,
          description: t`Practice name, timezone, internal deadline policy, smart priority weighting.`,
          Icon: Building2Icon,
        },
        {
          to: '/members',
          label: t`Team`,
          description: t`Invite teammates and manage roles.`,
          Icon: UsersIcon,
        },
        {
          to: '/workload',
          label: t`Team workload`,
          description: t`Distribution of prep work across the team.`,
          Icon: ClipboardListIcon,
        },
      ],
    },
    {
      label: t`Billing`,
      description: t`Plan, seats, and invoices.`,
      items: [
        {
          to: '/billing',
          label: t`Billing`,
          description: t`Active plan, seat usage, and subscription portal.`,
          Icon: CreditCardIcon,
        },
      ],
    },
    {
      label: t`Automation`,
      description: t`How DueDateHQ reaches your team, your clients, and your calendars.`,
      items: [
        {
          to: '/reminders',
          label: t`Email Template`,
          description: t`Reminder email templates and recent delivery.`,
          Icon: MailIcon,
        },
        {
          to: '/notifications/preferences',
          label: t`Notifications`,
          description: t`Personal morning digest preferences and types.`,
          Icon: BellIcon,
        },
        {
          to: '/deadlines/calendar',
          label: t`Calendar sync`,
          description: t`Subscribe to deadlines from Apple / Google calendars.`,
          Icon: CalendarDaysIcon,
          // /deadlines/calendar is a prefix of nothing the rail links to,
          // but mark `end` so it never reads as active for a deeper path.
          end: true,
        },
      ],
    },
  ]
}

/**
 * SettingsSubNav — the in-page settings rail shared by the settings
 * family. Renders every destination in `useSettingsNavSections` as a flat
 * link list (group labels collapse into the rail). The active item is
 * derived from the current path via NavLink so the rail stays in sync
 * regardless of which route renders it.
 */
export function SettingsSubNav({ className }: { className?: string }) {
  const { t } = useLingui()
  const sections = useSettingsNavSections()
  const items = sections.flatMap((section) => section.items)

  return (
    <nav aria-label={t`Settings sections`} className={cn('flex flex-col gap-0.5', className)}>
      <p className="px-3 pb-2 text-xs font-bold uppercase tracking-eyebrow text-text-tertiary">
        {t`Settings`}
      </p>
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end ?? false}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              isActive
                ? 'bg-state-accent-hover text-text-accent'
                : 'text-text-secondary hover:bg-background-default-hover hover:text-text-primary',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={cn('size-4 shrink-0', isActive ? 'text-text-accent' : 'text-text-muted')}
                aria-hidden
              />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/**
 * SettingsShell — two-column scaffold (sticky rail + scrolling content)
 * used by the settings-family routes. The rail collapses above the
 * content at mobile widths.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-6 pb-10 md:flex-row md:gap-8 md:px-6 md:pt-8">
          <aside className="shrink-0 md:sticky md:top-8 md:w-56 md:self-start">
            <SettingsSubNav />
          </aside>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
