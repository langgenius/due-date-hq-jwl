import { type ReactNode } from 'react'
import { Link } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlarmClockIcon,
  BellIcon,
  Building2Icon,
  CalendarDaysIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CreditCardIcon,
  ScaleIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Workspace settings hub. Replaces the previous "Practice" sidebar group —
 * the routes underneath still exist at their original paths (`/practice`,
 * `/members`, `/workload`, `/billing`, `/audit`, `/reminders`,
 * `/notifications`, `/deadlines/calendar`), they're just no longer
 * surfaced in the primary nav. This page is the discovery surface for
 * those config destinations.
 *
 * Personal account settings (`/account/security`, sign-out) stay in the
 * sidebar's `UserMenuTrigger` dropdown — different conceptual level.
 */
export function SettingsRoute() {
  const { t } = useLingui()

  const sections: Array<{
    label: string
    description: string
    items: Array<{
      href: string
      label: string
      description: string
      icon: LucideIcon
    }>
  }> = [
    {
      label: t`Practice`,
      description: t`Identity, team, and capacity for this practice workspace.`,
      items: [
        {
          href: '/practice',
          label: t`Practice profile`,
          description: t`Practice name, timezone, internal deadline policy, smart priority weighting.`,
          icon: Building2Icon,
        },
        {
          href: '/members',
          label: t`Members`,
          description: t`Invite teammates and manage roles.`,
          icon: UsersIcon,
        },
        {
          href: '/workload',
          label: t`Team workload`,
          description: t`Distribution of prep work across the team.`,
          icon: ClipboardListIcon,
        },
      ],
    },
    {
      label: t`Billing`,
      description: t`Plan, seats, and invoices.`,
      items: [
        {
          href: '/billing',
          label: t`Billing`,
          description: t`Active plan, seat usage, and subscription portal.`,
          icon: CreditCardIcon,
        },
      ],
    },
    {
      label: t`Compliance`,
      description: t`Audit trail for client, rule, status, and team changes.`,
      items: [
        {
          href: '/audit',
          label: t`Audit log`,
          description: t`Timestamped event log across the workspace.`,
          icon: ScaleIcon,
        },
      ],
    },
    {
      label: t`Automation`,
      description: t`How DueDateHQ reaches your team, your clients, and your calendars.`,
      items: [
        {
          href: '/reminders',
          label: t`Reminders`,
          description: t`Outbound deadline reminders to clients and team.`,
          icon: AlarmClockIcon,
        },
        {
          href: '/notifications/preferences',
          label: t`Notification preferences`,
          description: t`Personal morning digest preferences and types.`,
          icon: BellIcon,
        },
        {
          href: '/deadlines/calendar',
          label: t`Calendar sync`,
          description: t`Subscribe to deadlines from Apple / Google calendars.`,
          icon: CalendarDaysIcon,
        },
      ],
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-6 py-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl leading-7 font-semibold text-text-primary">
              <Trans>Settings</Trans>
            </h1>
            <p className="max-w-[680px] text-[13px] leading-5 text-text-secondary">
              <Trans>
                Workspace configuration for this practice — identity, team, billing, compliance, and
                automation. Personal account settings live in the user menu in the sidebar footer.
              </Trans>
            </p>
          </header>

          {sections.map((section) => (
            <SettingsSection
              key={section.label}
              label={section.label}
              description={section.description}
            >
              {section.items.map((item) => (
                <SettingsRow
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  description={item.description}
                  Icon={item.icon}
                />
              ))}
            </SettingsSection>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingsSection({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
          {label}
        </h2>
        <p className="text-xs text-text-tertiary">{description}</p>
      </div>
      <div className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({
  href,
  label,
  description,
  Icon,
}: {
  href: string
  label: string
  description: string
  Icon: LucideIcon
}) {
  return (
    <Link
      to={href}
      className={cn(
        'group/row flex items-start gap-3 border-b border-divider-subtle px-4 py-3 transition-colors last:border-b-0',
        'hover:bg-background-default-hover focus-visible:bg-background-default-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-xs text-text-secondary">{description}</span>
      </div>
      <ChevronRightIcon
        className="mt-1 size-3.5 shrink-0 text-text-tertiary transition-transform group-hover/row:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}
