import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

import { Breadcrumb, type BreadcrumbItem } from './breadcrumb'

/**
 * PageHeader — canonical route header for every protected surface.
 *
 * The AppShell no longer renders a route header strip (see app-shell.tsx),
 * so each route owns its own page header. To keep typography, padding,
 * eyebrow tracking, and action-cluster placement in lockstep across
 * Dashboard / Obligations / Clients / Coverage / Rule library / Pulse /
 * Members / Settings / Calendar / Workload / Notifications / Reminders /
 * Audit, all of them route through this single component.
 *
 * Spec (DESIGN.md §3.2 + §3.3 + §4.4):
 *  - eyebrow: 11px / 500 / 0.08em uppercase, text-tertiary
 *  - title:   text-2xl (24px) / 600 / leading-7, text-primary
 *  - subtitle: 13px / 400 / leading-5, text-secondary, max-w-[1080px]
 *  - actions cluster: right-aligned on lg+, wraps below title on small viewports
 *
 * Sub-pages with a parent in the IA pass `breadcrumbs` to surface a path
 * back. The breadcrumb renders in the eyebrow slot (same typography),
 * so `eyebrow` is the fallback for pages without a structural parent
 * (e.g. a top-level destination that wants an "AT A GLANCE" label).
 * Passing both is supported but breadcrumbs win — they always carry more
 * information.
 *
 * The dashboard hero ("Today") is intentionally larger and lives outside
 * this component — see DashboardRoute. Everything else funnels through here.
 */
export function PageHeader({
  eyebrow,
  breadcrumbs,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0
  return (
    <header
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {hasBreadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null}
        {eyebrow && !hasBreadcrumbs ? (
          <p className="text-[11px] font-medium tracking-[0.08em] text-text-tertiary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl leading-7 font-semibold text-text-primary">{title}</h1>
        {description ? (
          <p className="max-w-[1080px] text-[13px] leading-5 text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
      ) : null}
    </header>
  )
}
