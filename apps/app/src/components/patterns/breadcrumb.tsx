import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRightIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * A breadcrumb segment. Items with `to` render as links; items without
 * `to` (typically the last one) render as plain text. We leave the choice
 * to the caller so a sub-page can render the current page label inline.
 *
 * Callers that need to replace a segment with a custom interactive control
 * (e.g. the client switcher dropdown on `/clients/[id]`) pass a `render`
 * node. The breadcrumb component uses it in place of the default Link /
 * span. `label` stays required because it's the aria fallback used by
 * screen readers and the chevron-separator key.
 */
export type BreadcrumbItem = {
  label: string
  to?: string
  render?: ReactNode
}

/**
 * Breadcrumb — eyebrow-styled wayfinding chain shown above the H1 in
 * `PageHeader`. Matches the page-header eyebrow spec (11px / 500 / 0.08em
 * uppercase, text-tertiary) so it slots into the existing visual rhythm
 * without adding new weight.
 *
 * The breadcrumb is also where we surface the back-navigation shortcut
 * (⌘[ on macOS, Ctrl+[ elsewhere): hovering the parent segment shows the
 * hint via `title`. The browser's native history back already binds
 * those keystrokes — we just make sure users discover them.
 *
 * Pages should pass at most one parent + the current page. Deeper trees
 * (`Settings › Billing › Receipts`) are supported but rare here; the IA
 * stays one level deep for nearly every surface.
 */
export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  if (items.length === 0) return null

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
  const shortcutHint = isMac ? '⌘[' : 'Ctrl+['
  const parentIndex = items.length - 2

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex flex-wrap items-center gap-1 text-caption font-medium tracking-[0.08em] text-text-tertiary uppercase',
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        let node: ReactNode
        if (item.render !== undefined) {
          node = item.render
        } else if (item.to && !isLast) {
          node = (
            <Link
              to={item.to}
              title={index === parentIndex ? `Go back · ${shortcutHint}` : undefined}
              className="rounded-sm outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              {item.label}
            </Link>
          )
        } else {
          node = (
            <span aria-current={isLast ? 'page' : undefined} className="text-text-tertiary">
              {item.label}
            </span>
          )
        }
        const itemKey = `${item.to ?? (isLast ? 'current' : 'segment')}:${item.label}`
        return (
          <Fragment key={itemKey}>
            {node}
            {!isLast ? (
              <ChevronRightIcon aria-hidden className="size-3 shrink-0 text-text-tertiary" />
            ) : null}
          </Fragment>
        )
      })}
    </nav>
  )
}
