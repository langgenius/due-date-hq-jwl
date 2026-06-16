import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// 2026-06-10 (Yuqi "怎么这么大的字？token呢"): the design system defines CUSTOM
// font-size tokens that stock tailwind-merge doesn't know about. Without
// registering them, a call like `cn('… text-column-label …', 'text-text-tertiary')`
// makes tailwind-merge treat the custom font-size and the custom text-COLOR as two
// conflicting `text-*` utilities and SILENTLY DROP the size — so the element falls
// back to inherited/default (e.g. table headers stayed at the inherited 13px because
// `text-column-label` was stripped against the trailing `text-text-tertiary`; the
// rail status filter rendered at 16px). Registering every custom size token in the
// `font-size` class group keeps size and color as distinct properties, so the token
// always survives the merge.
//
// 2026-06-15: extended from {caption, caption-xs} to the FULL custom-size set after
// the table-header token (`text-column-label`) was found stripped in the TableHead
// `cn()` — it had only ever rendered correctly where applied via a STATIC className.
// Standard sizes (xs/sm/base/lg/xl) are already known to tailwind-merge. Keep this
// list in sync with the `--text-*` size tokens in styles/tokens/primitives.css.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            '2xs',
            'caption',
            'caption-xs',
            'micro',
            'badge',
            'chip-label',
            'column-label',
            'row-name',
            'row-anchor',
            'item-title',
            'nav',
            'description',
            'region-title',
            'section-title',
            'surface-title',
            'stat-value',
            'hero',
            'display-large',
            'display-hero',
            'md',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
