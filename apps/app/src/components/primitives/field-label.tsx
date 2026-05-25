import type { ReactNode } from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * Canonical field-label typography for structured-data surfaces.
 *
 * Pattern: `text-xs font-medium uppercase tracking-wide
 * text-text-tertiary`. Lives anywhere a small caps key labels a
 * value below or beside it — Pulse drawer fact grid, audit timeline
 * group titles, and (going forward) any structured-fields panel.
 *
 * Extracted 2026-05-25 (Yuqi Alerts second pass #9 — "这个 badge
 * label 有在别的地方用过吗？或者也可以在别的地方用"). Was
 * inlined as the same Tailwind string in two places; now a single
 * primitive so the rhythm stays consistent and new surfaces don't
 * drift to their own variant.
 *
 * Polymorphic via `as` so callers can match the surrounding
 * semantic shape — `<dt>` inside a `<dl>` grid, `<div>` in free
 * flow, `<span>` inline. Stays at the same Tailwind string in
 * every case; only the tag changes.
 */
export function FieldLabel({
  as: Tag = 'div',
  children,
  className,
}: {
  as?: 'div' | 'dt' | 'span' | 'label'
  children: ReactNode
  className?: string
}) {
  return (
    <Tag
      className={cn('text-xs font-medium uppercase tracking-wide text-text-tertiary', className)}
    >
      {children}
    </Tag>
  )
}
