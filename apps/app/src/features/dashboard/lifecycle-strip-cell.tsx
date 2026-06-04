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
        // 2026-06-04 (Yuqi padding fix — "the padding you need to
        // work on"): cell horizontal padding `px-10` (40px) →
        // `px-5` (20px). The 40px Pencil spec was authored at the
        // canvas-mock scale (cells ~240px wide) — at our actual
        // render width with 6 cells sharing the strip, 40px ate
        // half the cell and left the big number floating.
        // 20px reads as comfortable inset without the float.
        'flex min-w-[140px] flex-1 flex-col items-start gap-1.5 px-5 py-3',
        // 2026-06-04 round 7 (Yuqi "design details — delicate"):
        // hover transition extended to `duration-200` (was
        // default 150ms) so the color shift feels deliberate
        // rather than snappy. The eye registers the cell as a
        // considered surface.
        'outline-none transition-colors duration-200 hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        // Pencil draws a 1px divider on every cell EXCEPT the
        // first (the first cell carries the strip's left rounded
        // corner instead). The strip's outer chrome handles the
        // outer radius.
        // 2026-06-04 round 15 (Yuqi page-feedback "no border...."):
        // between-cell divider tone bumped `divider-subtle` (4%
        // alpha — practically invisible) → `divider-deep` (14% —
        // matches the strip's outer card border). Cells now read
        // as 6 distinct cells with crisp dividers, not as a single
        // smeared row.
        !isFirst && 'border-l border-divider-deep',
        isFirst && 'rounded-l-[10px]',
        isLast && 'rounded-r-[10px]',
      )}
    >
      <Icon className={cn('size-3.5 shrink-0', iconToneClass)} aria-hidden />
      {/* 2026-06-04 round 6 (Yuqi "smaller typesize"): value
          stepped down `text-[28px]` → `text-xl` (20px) so the
          strip reads as a compact summary not a hero metric. */}
      <span className="text-xl leading-none font-semibold tabular-nums tracking-tight text-text-primary">
        {value}
      </span>
      <span className="text-xs font-medium text-text-muted">{label}</span>
    </Link>
  )
}

export { LifecycleStripCell }
