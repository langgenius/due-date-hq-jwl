import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// 2026-06-10 (Yuqi "怎么这么大的字？token呢"): the design system defines two
// CUSTOM font-size tokens — `text-caption` (11px) and `text-caption-xs` (10px) —
// that stock tailwind-merge doesn't know about. Without registering them, a call
// like `cn('… text-caption-xs …', cond ? 'text-text-accent' : 'text-text-tertiary')`
// made tailwind-merge treat the custom font-size and the custom text-COLOR as two
// conflicting `text-*` utilities and SILENTLY DROP the size — so the element fell
// back to the 16px browser default (e.g. the DeadlineNavigatorRail status filter
// rendered "Not started" far too large). Registering both in the `font-size`
// class group keeps the size and the color as distinct properties, so the token
// always survives the merge.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'caption-xs'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
