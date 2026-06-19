import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * EmptyState — the shared "nothing here yet" surface.
 *
 * Three orthogonal variants live in one component because their chrome is
 * identical (dashed-border card, centered column, optional icon, heading,
 * description, single CTA):
 *
 *  - `empty`     → the data source is genuinely empty. CTA usually unblocks
 *                  the user with a workspace action (Import / Connect / etc).
 *  - `filtered`  → data exists but the active filter excludes it. CTA is
 *                  always "Clear filters" (or equivalent reset).
 *  - `error`     → query failed. CTA is "Retry".
 *
 * Routes were previously rolling their own — dashboard had `EmptyDashboard`,
 * obligations had a private `EmptyState`, opportunities embedded one inline,
 * pulse named its `EmptyState` / `FilteredEmptyState`. This component
 * collapses them all to one chrome so future tone / typography / spacing
 * tweaks land in one place.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  footer,
  className,
  density = 'default',
  variant = 'default',
  iconTone = 'accent',
  visual = 'icon',
  fill = false,
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  cta?: ReactNode
  // Optional content below the CTA — e.g. the "what gets recorded"
  // chip strip on the /alerts/history empty state. Prominent variant only.
  footer?: ReactNode
  className?: string
  density?: 'default' | 'compact'
  // `variant="prominent"` is the full-surface
  // empty state from the canvas — a solid-border card with a tinted icon-circle,
  // a larger title, wider supporting copy, and room for one or more CTAs. Used
  // when the empty state OWNS the surface (e.g. an empty /deadlines or /alerts
  // list). `default` stays the quiet inline treatment used app-wide; `compact`
  // drops the card chrome for table-cell / drawer embeds.
  variant?: 'default' | 'prominent'
  // Prominent icon-circle tone.
  // `accent` is the blue tint (Pencil active /alerts empty — 88px #eff4ff circle,
  // #155aef icon); `neutral` is the quieter gray tint (Pencil /alerts/history
  // empty — 72px #f9fafb circle, #98a2b2 icon). Ignored outside `prominent`.
  iconTone?: 'accent' | 'neutral'
  // Prominent visual: `icon` (default) = the tinted icon-circle above; `ghost-cards`
  // = a restrained fanned deck of placeholder cards (img-055), for a list surface
  // that fills with cards/rows ("your alerts will stack here"). Implies content
  // without faking data — the cards are explicitly blank skeletons, so it honours
  // the "no fiction on canvas" rule. `icon` prop is ignored when `ghost-cards`.
  visual?: 'icon' | 'ghost-cards'
  // When true the prominent card stretches to fill its parent's
  // height and vertically centers its column — matches the canvas cards which
  // own the whole content area (fixed 600px on the canvas; `min-h` here so it
  // never collapses below the design height but can grow with the viewport).
  fill?: boolean
}) {
  const isCompact = density === 'compact'
  const isProminent = variant === 'prominent'
  const showGhostCards = isProminent && visual === 'ghost-cards'
  return (
    <div
      data-density={density}
      data-variant={variant}
      className={cn(
        'flex flex-col items-center text-center',
        isCompact && 'gap-3 px-4 py-10',
        !isCompact &&
          !isProminent &&
          'gap-3 rounded-lg border border-dashed border-divider-regular bg-background-default px-6 py-10',
        isProminent &&
          'gap-6 rounded-xl border border-divider-regular bg-background-default px-10 py-20',
        // `fill` makes the prominent card own the whole content
        // area (canvas cards are 600px tall, vertically centered). `min-h`
        // keeps the design height as a floor; `justify-center` centers the
        // column the way the canvas frame does.
        isProminent && fill && 'min-h-[600px] flex-1 justify-center',
        className,
      )}
    >
      {showGhostCards ? (
        // Fanned placeholder deck (img-055): two faint cards angled behind a
        // front card carrying three blank skeleton bars. Borders + section-tint
        // only — no shadows (restrained-shadows canon). Decorative, so aria-hidden;
        // the title/description carry the meaning to assistive tech.
        <div className="relative flex h-[76px] w-[184px] items-center justify-center" aria-hidden>
          <div className="absolute h-14 w-40 -rotate-6 rounded-lg border border-divider-subtle bg-background-section/60" />
          <div className="absolute h-14 w-40 rotate-6 rounded-lg border border-divider-subtle bg-background-section/60" />
          <div className="relative flex h-16 w-44 flex-col gap-1.5 rounded-lg border border-divider-regular bg-background-default px-3 py-3">
            <div className="h-2 w-2/3 rounded-full bg-background-section" />
            <div className="h-2 w-full rounded-full bg-background-section" />
            <div className="h-2 w-1/2 rounded-full bg-background-section" />
          </div>
        </div>
      ) : Icon ? (
        isProminent ? (
          <div
            className={cn(
              'flex items-center justify-center rounded-full',
              iconTone === 'neutral'
                ? 'size-[72px] bg-background-section'
                : 'size-[88px] bg-state-accent-hover',
            )}
          >
            <Icon
              className={cn(
                iconTone === 'neutral' ? 'size-8 text-text-muted' : 'size-9 text-text-accent',
              )}
              aria-hidden
            />
          </div>
        ) : (
          <Icon className="size-5 text-text-tertiary" aria-hidden />
        )
      ) : null}
      <p
        className={cn(
          'font-semibold text-text-primary',
          isProminent
            ? cn('tracking-tight', iconTone === 'neutral' ? 'text-surface-title' : 'text-xl')
            : 'text-sm',
        )}
      >
        {title}
      </p>
      {description ? (
        <p
          className={cn(
            'text-text-secondary',
            isProminent
              ? 'max-w-[560px] text-sm leading-relaxed'
              : 'max-w-[42ch] text-description leading-5',
          )}
        >
          {description}
        </p>
      ) : null}
      {cta ? <div className={isProminent ? 'mt-2' : 'mt-1'}>{cta}</div> : null}
      {footer && isProminent ? <div className="mt-2">{footer}</div> : null}
    </div>
  )
}
