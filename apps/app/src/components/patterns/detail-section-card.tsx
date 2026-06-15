import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `DetailSectionCard` — the canonical section card for the master-detail pages
 * (alert detail + deadline detail), matching Pencil `BbQAK`/`Y8xrR`.
 *
 * Anatomy (2026-06-12 — Yuqi "white, gray, white, gray backgrounds is so bad
 * UI"; layering by LINE, not fill):
 *   • Card: `rounded-xl` (12) white fill, 1px `divider-subtle` hairline, clipped.
 *   • Header: NO gray band — a `13/600 text-primary` title (NOT uppercase) over
 *     a bottom hairline, optional right-aligned meta/action cluster. The line
 *     does the separating; the fill is gone.
 *   • Body: white, `px-5 py-4` by default. Pass `flush` for edge-to-edge content
 *     (tables, fact grids) that own their own padding + row hairlines.
 *
 * Sits on a WHITE page body; the hairline outline + spacing rhythm carry the
 * grouping (no alternating washes, no shadows).
 */
export function DetailSectionCard({
  title,
  headerRight,
  children,
  flush = false,
  bodyClassName,
  className,
  id,
  variant = 'card',
  tone = 'action',
  index,
  caption,
}: {
  title: ReactNode
  /** Right-aligned header meta or actions (e.g. "Verify before apply", a count,
   *  Confirm/Exclude buttons). Pushed to the far end of the header band. */
  headerRight?: ReactNode
  children: ReactNode
  /** Edge-to-edge body with no padding (for tables / fact grids). */
  flush?: boolean
  bodyClassName?: string
  className?: string
  /** Anchor id — lets a section nav (scroll-spy) target the card. */
  id?: string
  /**
   * 2026-06-15 (Pencil MASYz): a numbered section badge (1/2/3) rendered as a
   * small rounded chip left of the title — turns the flat document into a
   * legible, ordered "read this in sequence" outline. Flat variant only.
   */
  index?: number
  /**
   * 2026-06-15 (Pencil MASYz): a quiet caption after the title ("what changed
   * and what to verify") that tells the reader what the section is for. Flat
   * variant only.
   */
  caption?: ReactNode
  /**
   * 2026-06-12 (Yuqi "hate frames in frames in just lines — hard to
   * distinguish sections"): `flat` drops the outline entirely — the section
   * is a DOCUMENT region whose boundary is its strong header + the parent's
   * generous inter-section whitespace, not a box. Inner content that is
   * semantically a table keeps its own frame. `card` keeps the outlined
   * chrome (deadline detail).
   */
  variant?: 'card' | 'flat'
  /**
   * 2026-06-14 (Yuqi critique — "eyes don't know where to go"): flat sections
   * are ranked. `action` = the decision-critical sections (Change, Clients):
   * 18/600 primary header. `reference` = supporting depth (Source, Activity):
   * a quieter 14/600 secondary header, so the eye reads the action zones
   * first and treats the rest as look-up. Flat variant only.
   */
  tone?: 'action' | 'reference'
}) {
  if (variant === 'flat') {
    return (
      <section id={id} className={cn('flex flex-col gap-4', className)}>
        {/* items-center (Yuqi 2026-06-15 "没有vertically居中") so the numbered
            badge, title, caption, and any header-right cluster all sit on one
            centered line instead of drifting off the text baseline. */}
        <header className="flex items-center gap-2">
          {/* Numbered badge (Pencil MASYz) — a small rounded chip ahead of the
              title so the three sections read as an ordered 1·2·3 outline. */}
          {typeof index === 'number' ? (
            <span
              className="inline-flex size-6 shrink-0 items-center justify-center self-center rounded-lg bg-background-subtle text-sm font-semibold text-text-tertiary tabular-nums"
              aria-hidden
            >
              {index}
            </span>
          ) : null}
          {/* Section header = the hierarchy carrier in the flat document. The
              `tone` ranks action sections (18/600 primary) above reference
              sections (14/600 secondary) — no band, no rule. */}
          <h3
            className={cn(
              'font-semibold',
              tone === 'reference' ? 'text-sm text-text-secondary' : 'text-base text-text-primary',
            )}
          >
            {title}
          </h3>
          {/* Caption (Pencil MASYz) — quiet purpose line after the title. */}
          {caption ? <span className="text-sm text-text-tertiary">{caption}</span> : null}
          {headerRight ? (
            <>
              <span className="flex-1" />
              <span className="flex items-center gap-2 text-xs text-text-tertiary">
                {headerRight}
              </span>
            </>
          ) : null}
        </header>
        <div className={cn(flush ? '' : 'flex flex-col gap-4', bodyClassName)}>{children}</div>
      </section>
    )
  }
  return (
    <section
      id={id}
      className={cn(
        'overflow-hidden rounded-xl border border-divider-subtle bg-background-default',
        className,
      )}
    >
      <header className="flex min-h-9 items-center gap-2 border-b border-divider-subtle px-5 py-2.5">
        {/* <h3> (not a span) so each section is a real heading — accessible and
            satisfies getByRole('heading', …) specs. */}
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {headerRight ? (
          <>
            <span className="flex-1" />
            {/* THE universal band-meta size: 12/400 tertiary — visibly a
                caption next to the 14/600 title, one size across every
                detail card (alert + deadline). Action buttons passed in
                here carry their own size/weight classes. */}
            <span className="flex items-center gap-2 text-xs text-text-tertiary">
              {headerRight}
            </span>
          </>
        ) : null}
      </header>
      <div className={cn(flush ? '' : 'flex flex-col gap-4 px-5 py-4', bodyClassName)}>
        {children}
      </div>
    </section>
  )
}
