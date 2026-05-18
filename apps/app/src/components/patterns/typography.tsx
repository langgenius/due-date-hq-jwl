import type { ElementType, ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * SectionLabel — the canonical uppercase eyebrow / section label / meta tag.
 *
 * One visual contract for every "small caps" string in the app:
 *   text-xs (11px) · font-medium · uppercase · tracking-[0.08em] · text-tertiary
 *
 * Before this primitive existed there were six different tracking values
 * (the default Tailwind value, the design-system 0.08em, a dramatic 0.16em
 * used elsewhere in the migration wizard, plus a couple of one-offs) all
 * doing the same job. Use this everywhere — never roll a new uppercase-meta
 * className inline.
 *
 * Defaults to <span>. Pass `as="p"` for paragraph semantics or `as="h6"` if
 * the label is genuinely a sub-section heading.
 */
export function SectionLabel({
  children,
  className,
  as: As = 'span',
}: {
  children: ReactNode
  className?: string
  as?: ElementType
}) {
  return (
    <As
      className={cn(
        'text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase',
        className,
      )}
    >
      {children}
    </As>
  )
}

/**
 * SectionTitle — the canonical "h2" within a page.
 *
 * One visual contract for every section / card title nested under a page H1:
 *   text-lg (16px) · leading-tight · font-semibold · text-primary
 *
 * Use this for card headers, drawer section titles, and the eyebrow-less
 * h2 you'd otherwise hand-roll. Don't use it for page-level H1 (those stay
 * at text-2xl) or for SectionLabel (uppercase meta — different role).
 *
 * Defaults to <h2>. Use `as="h3"` for nested sub-sections.
 */
export function SectionTitle({
  children,
  className,
  as: As = 'h2',
}: {
  children: ReactNode
  className?: string
  as?: ElementType
}) {
  return (
    <As className={cn('text-lg leading-tight font-semibold text-text-primary', className)}>
      {children}
    </As>
  )
}
