import { type ReactNode } from 'react'
import { Link } from 'react-router'
import { Trans } from '@lingui/react/macro'
import { ChevronRightIcon, type LucideIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

import { FieldLabel } from '@/components/primitives/field-label'
import { PageHeader } from '@/components/patterns/page-header'
import { SettingsShell, useSettingsNavSections } from '@/features/settings/settings-sub-nav'

/**
 * Workspace settings hub — the /settings index.
 *
 * This page renders inside `SettingsShell`, the same sticky-rail scaffold
 * used by /settings/profile and /settings/permissions, so the settings nav
 * is unified: a standalone card-hub whose destination set did NOT overlap
 * with the rail meant a user here could not reach Profile or Permissions,
 * and a user on a rail page could not reach Practice/Workload/Audit/Calendar.
 *
 * Both surfaces now consume one registry — `useSettingsNavSections` — so:
 *   • the rail (left) lists every settings destination, including Profile
 *     and Permissions, and
 *   • this overview (right) lists the same destinations grouped as cards.
 *
 * The routes underneath still live at their original paths (`/practice`,
 * `/members`, `/workload`, `/billing`, `/reminders`, `/settings/profile`,
 * `/settings/permissions`). Personal account settings (`/account/security`,
 * sign-out) stay in the sidebar's `UserMenuTrigger` dropdown.
 */
export function SettingsRoute() {
  const sections = useSettingsNavSections()

  return (
    <SettingsShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={<Trans>Settings</Trans>}
          description={
            // 2026-06-16 (audit): dropped "compliance" — the hub renders no
            // compliance/audit card (audit log is intentionally outside this
            // registry), so the description listed a section that isn't here.
            <Trans>Practice settings — account, identity, team, billing, and automation.</Trans>
          }
        />

        {sections.map((section) => (
          <SettingsSection
            key={section.label}
            label={section.label}
            description={section.description}
          >
            {section.items.map((item) => (
              <SettingsRow
                key={item.to}
                href={item.to}
                label={item.label}
                description={item.description}
                Icon={item.Icon}
              />
            ))}
          </SettingsSection>
        ))}
      </div>
    </SettingsShell>
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
        <FieldLabel as="div" variant="group">
          {label}
        </FieldLabel>
        <p className="text-xs text-text-tertiary">{description}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-divider-regular bg-background-default">
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
        'hover:bg-state-base-hover focus-visible:bg-state-base-hover',
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
