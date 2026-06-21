import { type LucideIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * DuotoneIcon — a soft two-tone icon chip (Yuqi refs: the blue-book / yellow-timer
 * / green-play and the AI-Agent / Podcast / Sound-Effect glyphs). A rounded tinted
 * square holds a lucide glyph in the matching strong tone, so an icon reads as a
 * little colour-coded object rather than a flat monochrome stroke.
 *
 * DELIGHT SURFACES ONLY (onboarding, empty states, success, choice cards) — NOT the
 * dense data workbench, where the restrained-monochrome icon canon keeps tables
 * calm. Distinct from EmptyState's tinted CIRCLE: this is a smaller, square,
 * inline chip you can sit beside a label.
 *
 * Optional `badge` renders a tiny corner sub-glyph (the AI-Agent ✦ / Podcast mic
 * corner accent), for "this thing is special / AI" cues.
 */
export type DuotoneTone = 'accent' | 'success' | 'warning' | 'brand' | 'violet' | 'neutral'

const TONE_CLASS: Record<DuotoneTone, string> = {
  accent: 'bg-state-accent-hover text-text-accent',
  success: 'bg-state-success-hover text-text-success',
  warning: 'bg-state-warning-hover text-text-warning',
  // brand cyan pair + review violet use arbitrary var() so they don't depend on a
  // generated utility for these specific tokens.
  brand: 'bg-[var(--color-brand-highlight-soft)] text-[var(--color-brand-highlight-ink)]',
  violet: 'bg-[color-mix(in_srgb,var(--color-status-review)_14%,transparent)] text-[var(--color-status-review)]',
  neutral: 'bg-background-section text-text-secondary',
}

const SIZE_CLASS = {
  sm: 'size-7 rounded-md [&>svg]:size-4',
  md: 'size-9 rounded-lg [&>svg]:size-5',
  lg: 'size-11 rounded-xl [&>svg]:size-6',
} as const

const BADGE_TONE_CLASS: Record<DuotoneTone, string> = {
  accent: 'bg-state-accent-solid text-text-primary-on-surface',
  success: 'bg-state-success-solid text-text-primary-on-surface',
  warning: 'bg-state-warning-solid text-text-primary-on-surface',
  brand: 'bg-[var(--color-brand-highlight)] text-white',
  violet: 'bg-[var(--color-status-review)] text-white',
  neutral: 'bg-text-secondary text-text-primary-on-surface',
}

export function DuotoneIcon({
  icon: Icon,
  tone = 'accent',
  size = 'md',
  badge: Badge,
  badgeTone,
  className,
}: {
  icon: LucideIcon
  tone?: DuotoneTone
  size?: keyof typeof SIZE_CLASS
  /** Optional corner sub-glyph (e.g. SparklesIcon for an AI-flavoured chip). */
  badge?: LucideIcon
  badgeTone?: DuotoneTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center',
        TONE_CLASS[tone],
        SIZE_CLASS[size],
        className,
      )}
    >
      <Icon aria-hidden strokeWidth={1.75} />
      {Badge ? (
        <span
          aria-hidden
          className={cn(
            'absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full ring-2 ring-background-default [&>svg]:size-2.5',
            BADGE_TONE_CLASS[badgeTone ?? tone],
          )}
        >
          <Badge />
        </span>
      ) : null}
    </span>
  )
}
