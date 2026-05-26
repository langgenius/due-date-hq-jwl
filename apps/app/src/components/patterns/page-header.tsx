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
 * The dashboard "Today" header lives outside this component (it has a
 * custom date suffix) but uses the same `text-2xl leading-7 font-semibold`
 * treatment so all page titles read at the same scale.
 */
export function PageHeader({
  eyebrow,
  eyebrowAside,
  breadcrumbs,
  title,
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
      <div className="flex min-w-0 items-center justify-between gap-3 text-caption font-medium tracking-eyebrow text-text-tertiary uppercase">
        <div className="min-w-0 flex-1">
          {hasBreadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null}
          {eyebrow && !hasBreadcrumbs ? eyebrow : null}
        </div>
        {eyebrowAside ? <div className="shrink-0">{eyebrowAside}</div> : null}
      </div>
    ) : null
  return (
    // 2026-05-26 (Yuqi feedback — "weird position of the client 1/9
    // changes"): restructured so the eyebrow row sits OUTSIDE the
    // title column and spans the full header width. Previously it
    // lived inside the title column (a content-sized flex child),
    // which meant the eyebrowAside (right-side nav like
    // ClientCycleArrows 1/9) only made it to the right edge of the
    // title's natural width — often only ~600px from the left,
    // visually marooned in the middle of the page when the page
    // viewport was wider. Lifting the eyebrow to its own row at the
    // header root lets `justify-between` push the aside to the
    // actual far-right of the page, aligning with the canonical
    // "breadcrumb left, page-nav far right" pattern.
    //
    // Title + actions still share a row beneath the eyebrow (the
    // inner `<div>` with `lg:flex-row lg:justify-between`), so the
    // H1 / actions cluster relationship is unchanged for every
    // surface — only consumers passing `eyebrowAside` see the
    // visual difference.
    <header className={cn('flex flex-col gap-3', className)}>
      {eyebrowRow}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          {/* 2026-05-26 (Yuqi /clients/[id] header restructure):
              `min-w-0` so the title block can shrink when the
              actions cluster sits beside it at lg+ and the page
              narrows (e.g. right drawer opens). Without it, the
              title's intrinsic width forced the parent to keep
              growing, pushing the actions cluster to wrap or
              collide. */}
          <h1 className="min-w-0 text-2xl leading-7 font-semibold text-text-primary">{title}</h1>
          {description ? (
            <p className="max-w-[1080px] text-[13px] leading-5 text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          // 2026-05-26 (Yuqi /clients/[id] feedback #4 — "flex shrink-0
          // flex-wrap items-center gap-2 lg:justify-end can wrap into the
          // second row when the right panel expands"): dropped
          // `flex-wrap`. When a route opens a right drawer the visible
          // page narrows but the viewport stays at lg+, so the outer
          // `lg:flex-row` keeps title + actions on the same row — and
          // `flex-wrap` on the actions box was letting the buttons
          // tumble onto a 2nd line inside the actions slot, dragging
          // the header height taller. Without flex-wrap, the actions
          // stay on one row; if content genuinely exceeds the row width
          // the overflow is silently clipped (parent has min-w-0 to
          // let the title shrink, so this case is rare in practice).
          <div className="flex shrink-0 items-center gap-2 lg:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}
