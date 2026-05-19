import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * PageShell — canonical outer wrapper for a route's body content.
 *
 * Visual contract:
 *   flex flex-col · gap-6 (24px between major sections) · p-4 md:p-6
 *
 * AppShell already caps `<Outlet>` at max-w-[1080px] and centers it, so
 * pages do NOT set their own max-width or mx-auto. Pages that want a
 * narrower column (forms, single-column reading) pass `narrow` and the
 * shell drops to max-w-[880px].
 *
 * Before this primitive existed there were eight different wrappers doing
 * the same job (gap values 3/4/5/6/8, padding p-4/p-6/no-padding, dead
 * inner max-widths that were already clipped by AppShell). Use this
 * everywhere — don't roll a new outer wrapper inline.
 */
export function PageShell({
  children,
  narrow = false,
  className,
}: {
  children: ReactNode
  narrow?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 p-4 md:p-6',
        narrow && 'mx-auto w-full max-w-[880px]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * PageHeader — canonical "H1 + subtitle + actions" row at the top of a page.
 *
 * Visual contract:
 *   - Two-column flex at md+, stacked at mobile, gap-3 between rows
 *   - Title column: optional leading slot (icon/avatar) · H1 + optional
 *     subtitle
 *   - H1: text-2xl leading-tight font-semibold text-text-primary
 *   - Subtitle: text-sm leading-5 text-text-secondary, max-w-[760px]
 *   - Actions column: right-aligned, items-end so buttons baseline-align
 *     with the H1
 *
 * Use this for every list-page header. Don't roll your own.
 *
 * `leading` is for icons/avatars next to the title (e.g. Practice profile).
 * `actions` is for top-right buttons / badges / pills.
 */
export function PageHeader({
  title,
  subtitle,
  leading,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
}) {
  const titleColumn = (
    <div className="flex min-w-0 flex-col gap-1">
      <h1 className="text-2xl leading-tight font-semibold text-text-primary">{title}</h1>
      {subtitle ? (
        <p className="max-w-[760px] text-sm leading-5 text-text-secondary">{subtitle}</p>
      ) : null}
    </div>
  )

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      {leading ? (
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0">{leading}</span>
          {titleColumn}
        </div>
      ) : (
        titleColumn
      )}
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
