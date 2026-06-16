import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

// `NewBadge` — the highlight tier's one VISIBLE anchor. A small pill in the
// bright brand cyan (`--color-brand-highlight` #14C5F6) with navy text (the cyan
// is too light to carry white). Scarce by design: only for genuinely new /
// unseen items, never a general accent — see the highlight note in primitives.css.
export function NewBadge({
  className,
  children = 'New',
}: {
  className?: string
  children?: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-brand-highlight px-1.5 py-px text-[10px] font-semibold uppercase leading-[1.4] tracking-[0.04em] text-brand-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}
