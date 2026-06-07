import { NavLink } from 'react-router'
import { useLingui } from '@lingui/react/macro'
import {
  BellIcon,
  CalendarClockIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * SettingsSubNav — the in-page settings rail shared by the account /
 * workspace settings family (Pencil `fuEMm` / `o8zYZ`). It mirrors the
 * design's left column: Profile, Team, Permissions, Reminders,
 * Notifications, Billing.
 *
 * Each entry points at the route that already owns that surface:
 *   Profile       → /settings/profile     (this family)
 *   Team          → /members              (existing MembersRoute)
 *   Permissions   → /settings/permissions (this family)
 *   Reminders     → /reminders            (existing)
 *   Notifications → /notifications/preferences (existing)
 *   Billing       → /billing              (existing)
 *
 * The active item is derived from the current path via NavLink so the
 * rail stays in sync regardless of which route renders it.
 */
export function SettingsSubNav({ className }: { className?: string }) {
  const { t } = useLingui()

  const items: Array<{ to: string; label: string; Icon: LucideIcon; end?: boolean }> = [
    { to: '/settings/profile', label: t`Profile`, Icon: UserRoundIcon },
    { to: '/members', label: t`Team`, Icon: UsersIcon },
    { to: '/settings/permissions', label: t`Permissions`, Icon: ShieldCheckIcon },
    { to: '/reminders', label: t`Reminders`, Icon: CalendarClockIcon },
    { to: '/notifications/preferences', label: t`Notifications`, Icon: BellIcon },
    { to: '/billing', label: t`Billing`, Icon: CreditCardIcon, end: true },
  ]

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
 * used by both settings-family routes. The rail collapses above the
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
