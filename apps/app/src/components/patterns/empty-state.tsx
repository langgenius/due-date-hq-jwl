import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

import { DuotoneIcon, type DuotoneTone } from '@/components/primitives/duotone-icon'

/**
 * EmptyState — the shared "nothing here yet" surface.
 *
 * One component, two axes of sizing plus an optional visual treatment. The
 * caller picks the SEMANTICS (empty vs. filtered vs. error) by choosing the
 * `title` / `description` / `cta` copy; the props below only control chrome:
 *
 *  - `variant`: `'default'` (quiet inline dashed-border card, used app-wide) |
 *    `'prominent'` (full-surface card with a tinted icon-circle, larger title,
 *    wider copy, room for one or more CTAs — for when the empty state OWNS the
 *    surface, e.g. an empty /deadlines or /alerts list).
 *  - `density`: `'default'` | `'compact'` (drops the card chrome for
 *    table-cell / drawer embeds).
 *  - `visual` (prominent only): `'icon'` (tinted icon-circle, default) |
 *    `'ghost-cards'` (a restrained fanned deck of blank placeholder cards) |
 *    `'duotone'` (a soft two-tone icon chip for warm first-run empties).
 *  - `iconTone` / `duotoneTone`: tint selection for the icon-circle / duotone
 *    chip. `cta` + optional `footer` sit below the copy.
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
  tone = 'warm',
  visual = 'icon',
  duotoneTone = 'accent',
  fill = false,
  frameless = false,
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
  // `accent` is the navy tint (88px wash circle, accent icon); `neutral` is the
  // quieter gray tint (72px gray circle, muted icon); `celebrate` is the LIME
  // reward tint (88px `--highlight-celebrate` circle, dark glyph) — reserved for
  // genuine "you cleared it" moments (queue clear, all done), never for a quiet
  // "nothing yet" state. Ignored outside `prominent`.
  iconTone?: 'accent' | 'neutral' | 'celebrate'
  // Card warmth (palette finish). `warm` (default) gives the PROMINENT card a
  // soft stone well (`--background-well-warm` + warm hairline) — full-surface
  // empties are resting / invitational moments where the warm half of the
  // palette belongs. `plain` keeps the white card for the rare context where
  // warm would clash. No effect on `default`/`compact` (dense inline) empties.
  tone?: 'warm' | 'plain'
  // Prominent visual: `icon` (default) = the tinted icon-circle above; `ghost-cards`
  // = a restrained fanned deck of placeholder cards (img-055), for a list surface
  // that fills with cards/rows ("your alerts will stack here"). Implies content
  // without faking data — the cards are explicitly blank skeletons, so it honours
  // the "no fiction on canvas" rule. `icon` prop is ignored when `ghost-cards`.
  // `duotone` = a soft two-tone icon chip (rounded tinted square + accent glyph)
  // instead of the tinted circle — the Yuqi delight-glyph aesthetic, for warm
  // onboarding / first-run empties. Uses the `icon` prop; pick the tint with
  // `duotoneTone`. Works in both prominent and default sizes.
  visual?: 'icon' | 'ghost-cards' | 'duotone'
  // Tint for `visual="duotone"`.
  duotoneTone?: DuotoneTone
  // When true the prominent card stretches to fill its parent's
  // height and vertically centers its column — matches the canvas cards which
  // own the whole content area (fixed 600px on the canvas; `min-h` here so it
  // never collapses below the design height but can grow with the viewport).
  fill?: boolean
  // Drops the card frame (border + fill) while keeping the variant's sizing /
  // icon / copy. For an empty state that sits INSIDE an already-bordered
  // container (e.g. a table cell, a drawer body) where the card-in-card frame
  // double-boxes — let it rest on the host surface instead (per "no frames in
  // frames"). No effect on `compact`, which is already frameless.
  frameless?: boolean
}) {
  const isCompact = density === 'compact'
  const isProminent = variant === 'prominent'
  const showGhostCards = isProminent && visual === 'ghost-cards'
  const showDuotone = visual === 'duotone' && Boolean(Icon)
  return (
    <div
      data-density={density}
      data-variant={variant}
      className={cn(
        'flex flex-col items-center text-center',
        isCompact && 'gap-3 px-4 py-10',
        // Sizing/spacing (always) is kept separate from the card frame
        // (border + fill) so `frameless` can drop the box without losing layout.
        !isCompact && !isProminent && 'gap-3 rounded-lg px-6 py-10',
        !isCompact &&
          !isProminent &&
          !frameless &&
          'border border-dashed border-divider-regular bg-background-default',
        isProminent && 'gap-6 rounded-xl px-10 py-20',
        // Palette finish: a full-surface empty is a resting/invitational
        // moment, so the prominent card wears the warm stone well by default.
        // `tone="plain"` opts back to the white card. Dropped when `frameless`.
        isProminent &&
          !frameless &&
          (tone === 'warm'
            ? 'border border-divider-warm bg-background-well-warm'
            : 'border border-divider-regular bg-background-default'),
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
        <div
          className="relative flex h-[76px] w-[184px] items-center justify-center animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"
          aria-hidden
        >
          <div className="absolute h-14 w-40 -rotate-6 rounded-lg border border-divider-subtle bg-background-section/60" />
          <div className="absolute h-14 w-40 rotate-6 rounded-lg border border-divider-subtle bg-background-section/60" />
          <div className="relative flex h-16 w-44 flex-col gap-1.5 rounded-lg border border-divider-regular bg-background-default px-3 py-3">
            <div className="h-2 w-2/3 rounded-full bg-background-section" />
            <div className="h-2 w-full rounded-full bg-background-section" />
            <div className="h-2 w-1/2 rounded-full bg-background-section" />
          </div>
        </div>
      ) : showDuotone && Icon ? (
        // Two-tone delight chip (Yuqi duotone aesthetic) — a warmer alternative
        // to the tinted icon-circle for onboarding / first-run empties.
        <DuotoneIcon icon={Icon} tone={duotoneTone} size={isProminent ? 'lg' : 'md'} />
      ) : Icon ? (
        isProminent ? (
          <div
            className={cn(
              'flex items-center justify-center rounded-full',
              iconTone === 'neutral'
                ? 'size-[72px] bg-background-section'
                : iconTone === 'celebrate'
                  ? 'size-[88px] bg-highlight-celebrate'
                  : 'size-[88px] bg-state-accent-hover',
            )}
          >
            <Icon
              className={cn(
                iconTone === 'neutral'
                  ? 'size-8 text-text-muted'
                  : iconTone === 'celebrate'
                    ? // Dark glyph on the light lime fill (lime can't carry a
                      // light icon) — the reward "you cleared it" beat.
                      'size-9 text-text-primary'
                    : 'size-9 text-text-accent',
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
              ? 'max-w-[60ch] text-sm leading-relaxed'
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
