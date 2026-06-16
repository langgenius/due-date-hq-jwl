import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

import { Breadcrumb, type BreadcrumbItem } from './breadcrumb'

/**
 * PageHeader — canonical route header for every protected surface.
 *
 * The AppShell no longer renders a route header strip (see app-shell.tsx),
 * so each route owns its own page header. To keep typography, padding,
 * eyebrow tracking, and action-cluster placement in lockstep across
 * Dashboard / Obligations / Clients / Coverage / Rule library / Alerts /
 * Members / Settings / Calendar / Workload / Notifications / Reminders /
 * Audit, all of them route through this single component.
 *
 * Spec (DESIGN.md §3.2 + §3.3 + §4.4):
 *  - eyebrow: 11px / 500 / 0.08em uppercase, text-tertiary
 *  - title:   text-2xl (28px) / 600 / leading-8, text-primary
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
 * The dashboard "Today" header lives outside this component (it has a
 * custom date suffix) but uses the same `text-2xl leading-7 font-semibold`
 * treatment so all page titles read at the same scale.
 */
export function PageHeader({
  eyebrow,
  eyebrowAside,
  breadcrumbs,
  title,
  titleClassName,
  metaRow,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode
  /**
   * Optional content rendered on the right side of the eyebrow /
   * breadcrumb row. Use for page-level navigation aids that are
   * distinctly NOT actions on the page subject (e.g. prev/next
   * cycling through a filtered list of clients) so they don't sit
   * cheek-to-cheek with destructive actions like "Archive" or
   * "Delete" in the right-edge action cluster.
   */
  eyebrowAside?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  title: ReactNode
  /** Override the h1 size/leading/tracking (e.g. a 36px display title on a
   *  detail page). Merged after the default `text-2xl` scale. */
  titleClassName?: string
  /**
   * Optional secondary row between the h1 and the description.
   *
   * Use for *identity metadata* about the page subject — small chips,
   * pills, or labels that describe the entity without being part of
   * its name. Routes that have crammed entity/owner/state chips into
   * the h1 (audit P0 D1 on /clients/[id]) read better with the h1
   * carrying just the title and these supporting facts living one
   * tier down at 12 px / text-secondary.
   *
   * Rendered as a `<div>` (not `<p>`) so it can host inline-block
   * children like Badge / Pill / DropdownMenu triggers. The wrapper
   * provides the typography (12 px, text-secondary, wrap-friendly
   * gaps); slot content provides its own per-chip styling.
   *
   * Distinct from `description` — description is *prose about state*
   * ("5 open · next due May 6"); metaRow is *facts about identity*
   * (LLC · Sarah K. · CA, NY · Add filing state).
   */
  metaRow?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0
  const hasEyebrowLeft = (eyebrow && !hasBreadcrumbs) || hasBreadcrumbs
  const eyebrowRow =
    hasEyebrowLeft || eyebrowAside ? (
      // Eyebrow row: left side is the back-link / breadcrumb, right
      // side is optional page-level navigation (e.g. ClientCycleArrows).
      // Wrapped in `<div>` rather than `<p>` so it can host non-inline
      // children like button groups without producing invalid HTML.
      // The uppercase tag styling only applies to plain-text
      // descendants; the navAside content provides its own visual
      // treatment.
      // Step 1-5 reaudit canonicalized `tracking-eyebrow` (0.08em) over
      // the arbitrary value main is still using.
      <div className="flex min-w-0 items-center justify-between gap-3 text-caption font-medium tracking-eyebrow text-text-tertiary uppercase">
        <div className="min-w-0 flex-1">
          {hasBreadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null}
          {eyebrow && !hasBreadcrumbs ? eyebrow : null}
        </div>
        {eyebrowAside ? <div className="shrink-0">{eyebrowAside}</div> : null}
      </div>
    ) : null
  return (
    // Main's restructure (Yuqi #29): eyebrow row sits OUTSIDE the title
    // column and spans the full header width so the `eyebrowAside`
    // (ClientCycleArrows 1/9) lands at the actual far-right of the page,
    // not at the right edge of the title's natural width.
    //
    // PR #28 addition: `metaRow` slot sits between h1 and description
    // inside the title column, hosting chip-cluster content like
    // "Owner · Entity · State" for surfaces with overgrown header
    // chrome. Renders only when metaRow is provided.
    /* Outer header vertical rhythm `gap-2` (8px) so the eyebrow row sits
       tight against the title block. */
    <header className={cn('flex flex-col gap-2', className)}>
      {eyebrowRow}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          {/* `min-w-0` so the title block can shrink when the actions
              cluster sits beside it at lg+ and the page narrows
              (e.g. right drawer opens). */}
          {/* `leading-7` (28px) is too tight for `text-2xl` (28px in this
              project's rescaled token) at Inter's actual ascender height —
              capital letters like "B" / "A" get their very top 1-2px clipped by
              the parent's intrinsic flex-row baseline. `leading-8` (32px) gives
              glyph ascenders room. */}
          <h1
            className={cn(
              'min-w-0 text-2xl leading-8 font-semibold text-text-primary',
              titleClassName,
            )}
          >
            {title}
          </h1>
          {metaRow ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs leading-5 text-text-secondary">
              {metaRow}
            </div>
          ) : null}
          {description ? (
            // Step 1-5 reaudit canonicalized `text-description` (13px)
            // to replace the arbitrary `text-base` main still uses.
            <p className="max-w-[1080px] text-description leading-5 text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          // Main's #29 actions structure — `flex shrink-0` (no flex-wrap)
          // so buttons stay on one row instead of tumbling to a 2nd line
          // inside the actions slot when a right drawer narrows the
          // viewport.
          <div className="flex shrink-0 items-center gap-2 lg:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}
