import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import { Link } from 'react-router'

import { cn } from '@duedatehq/ui/lib/utils'

// Single cell of the /today dashboard's 6-column status-lifecycle
// strip. Per Pencil node VmcdD (row-B `Y12FTm`):
//
//   • Cell vertical-stack, gap 6
//   • Cell padding [12, 40] (12px vertical, 40px horizontal)
//   • Top row: tone-coded icon (14px) + value (28/600 leading-none,
//     letterSpacing -0.5)
//   • Bottom: label (12/500 text-text-muted)
//   • Right divider stroke (subtle) between cells
//
// The strip parent enforces the overall radius (10) + height (120) +
// flex-row layout; cells just supply their own content. Each cell is
// a `<Link>` so the user can drill into `/deadlines?status=<key>`.
function LifecycleStripCell({
  href,
  icon: Icon,
  iconToneClass,
  value,
  label,
  isFirst = false,
  isLast = false,
  ariaLabel,
}: {
  href: string
  icon: ComponentType<LucideProps>
  iconToneClass: string
  value: number
  label: string
  isFirst?: boolean
  isLast?: boolean
  ariaLabel: string
}) {
  return (
    <Link
      to={href}
      aria-label={ariaLabel}
      className={cn(
        // 20px horizontal inset reads as comfortable without the big
        // number floating (the Pencil 40px spec was authored at the
        // canvas-mock scale with much wider cells).
        'flex min-w-[140px] flex-1 flex-col items-start gap-1.5 px-5 py-3',
        // Hover transition at `duration-200` so the color shift feels
        // deliberate rather than snappy.
        'outline-none transition-colors duration-200 hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        // A 1px divider on every cell EXCEPT the first (the first cell
        // carries the strip's left rounded corner instead). The
        // `divider-deep` tone matches the strip's outer card border so
        // cells read as 6 distinct cells, not a single smeared row.
        !isFirst && 'border-l border-divider-deep',
        isFirst && 'rounded-l-xl',
        isLast && 'rounded-r-xl',
      )}
    >
      <Icon className={cn('size-3.5 shrink-0', iconToneClass)} aria-hidden />
      {/* Value at text-xl (20px) so the strip reads as a compact
          summary, not a hero metric. */}
      <span className="text-xl leading-none font-semibold tabular-nums tracking-tight text-text-primary">
        {value}
      </span>
      <span className="text-xs font-medium text-text-muted">{label}</span>
    </Link>
  )
}

export { LifecycleStripCell }
