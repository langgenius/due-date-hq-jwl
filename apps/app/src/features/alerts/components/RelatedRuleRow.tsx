import { ChevronRightIcon, FileTextIcon, type LucideIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `RelatedRuleRow` — a cross-reference row to a related rule (Pencil `G0zYC`):
 * a file tile, the rule code (mono) · short name, a one-line relationship
 * description, and a trailing chevron.
 *
 * Static when no `onClick` is given; clickable otherwise — hover lifts the
 * background and nudges the chevron +2px (the canvas "link hover" spec on
 * `b7fa5Y` §F). The icon defaults to `file-text` but a caller can swap it to
 * signal the relation kind.
 */
export function RelatedRuleRow({
  code,
  name,
  description,
  icon: Icon = FileTextIcon,
  onClick,
  className,
}: {
  code: string
  name: string
  description: string
  icon?: LucideIcon
  onClick?: () => void
  className?: string
}) {
  const body = (
    <>
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded bg-background-subtle">
        <Icon aria-hidden className="size-3.5 text-text-muted" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="font-mono text-sm font-semibold text-text-primary">{code}</span>
          <span aria-hidden className="text-sm text-text-muted">
            ·
          </span>
          <span className="truncate text-sm text-text-secondary">{name}</span>
        </span>
        <span className="text-sm font-medium leading-relaxed text-text-tertiary">{description}</span>
      </span>
      <ChevronRightIcon
        aria-hidden
        className="size-3.5 shrink-0 text-text-muted transition-transform duration-150 group-hover/related:translate-x-0.5"
      />
    </>
  )

  if (typeof onClick !== 'function') {
    return <div className={cn('flex w-full items-center gap-3 py-2.5', className)}>{body}</div>
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group/related -mx-2 flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-none transition-colors hover:bg-state-base-hover focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        className,
      )}
    >
      {body}
    </button>
  )
}
