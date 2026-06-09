import { MoreHorizontalIcon } from 'lucide-react'
import type { ComponentType, KeyboardEvent, MouseEvent, ReactNode, SVGProps } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `RowActionsMenu` — per-row ⋯ (kebab) dropdown for table-card rows.
 *
 * Stripe Dashboard's per-row affordance: every table row exposes its
 * common actions through a single trailing ⋯ button. Mouse hovers to
 * reveal, keyboard tabs to focus, Enter / Space opens the menu, and
 * arrows navigate items. Same shape across /clients, /clients/[id]
 * filing-plan, and /rules/library rule rows.
 *
 * Why a primitive (instead of inline DropdownMenu per surface):
 *   1. `event.stopPropagation()` is wired once — every row in the app
 *      uses click-anywhere-opens-detail, so the menu trigger MUST
 *      swallow the click before it bubbles to the row.
 *   2. Hidden-until-hover behavior (`opacity-0 group-hover:opacity-100`)
 *      is centralized; surfaces only opt out via `alwaysVisible`.
 *   3. The destructive-action coloring path is declared by the item
 *      (no className typo bait at each call site).
 *   4. Keyboard activation already inherits from Base UI's dropdown —
 *      we don't re-implement it.
 *
 * Visual contract:
 *   - Trigger: `size-7 rounded-lg` ghost button, lucide
 *     `MoreHorizontalIcon` at `size-4`, hover bg `bg-state-base-hover`.
 *   - Hover-reveal default: trigger is `opacity-0 group-hover:opacity-100
 *     focus-visible:opacity-100 data-[popup-open]:opacity-100`. Rows
 *     must carry `group/row` (or override via `alwaysVisible`).
 *   - Menu width: 11rem default; per-call `menuClassName` overrides.
 *
 * Usage:
 *   <RowActionsMenu
 *     label={t`Actions for ${client.displayName}`}
 *     items={[
 *       { label: t`Open in new tab`, icon: ExternalLinkIcon, onSelect: openInNewTab },
 *       { label: t`Copy link`, icon: CopyIcon, onSelect: copyLink },
 *       { separator: true },
 *       { label: t`Archive`, icon: ArchiveIcon, destructive: true, onSelect: archive },
 *     ]}
 *   />
 *
 * 2026-05-26 (Stripe-level Phase B): canonical row-action primitive
 * per docs/Design/stripe-level-critique-2026-05-26.md §S2. Wired on
 * /clients list rows, /clients/[id] filing-plan rows, and
 * /rules/library rule rows in the same pass.
 */

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

type RowActionItem = {
  /** Visible label. Required when not a separator. */
  label: string
  /** Optional lucide icon component rendered left of the label. */
  icon?: IconComponent | undefined
  /**
   * Click / Enter handler. The event has `stopPropagation()` already
   * called; surfaces don't need to re-stop.
   */
  onSelect: () => void
  /** When true, item renders with destructive (text-state-danger) tone. */
  destructive?: boolean | undefined
  /** When true, item is rendered but not selectable. */
  disabled?: boolean | undefined
  /** Optional inline trailing element (e.g. a keyboard shortcut hint). */
  trailing?: ReactNode | undefined
}

type RowActionSeparator = { separator: true }

export type RowActionsMenuItem = RowActionItem | RowActionSeparator

type RowActionsMenuProps = {
  /** Accessible label for the trigger button (e.g. "Actions for Acme Corp"). */
  label: string
  /** Menu items, in order. Separators may be interleaved freely. */
  items: ReadonlyArray<RowActionsMenuItem>
  /**
   * When true, the trigger is always opacity-100 (default: hover-only).
   * Use for high-density tables where the affordance must be obvious.
   */
  alwaysVisible?: boolean | undefined
  /** Extra classes applied to the trigger button. */
  triggerClassName?: string | undefined
  /** Extra classes applied to the menu content (e.g. wider menu). */
  menuClassName?: string | undefined
}

function isSeparator(item: RowActionsMenuItem): item is RowActionSeparator {
  return 'separator' in item && item.separator
}

// The trigger lives inside a clickable row. Without these handlers
// a click on ⋯ would bubble up and open the row's detail view —
// never what the user means. Same defensive pattern as the
// checkbox cell in FilingPlanYearSection / ClientFactsWorkspace.
// Hoisted to module scope (consistent-function-scoping) — neither
// closure captures any local state.
function stopRowClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation()
}
function stopRowKey(event: KeyboardEvent<HTMLButtonElement>) {
  // Escape must still bubble so parent dialogs can close.
  if (event.key === 'Escape') return
  event.stopPropagation()
}

export function RowActionsMenu({
  label,
  items,
  alwaysVisible,
  triggerClassName,
  menuClassName,
}: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onClick={stopRowClick}
            onKeyDown={stopRowKey}
            className={cn(
              'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary outline-none transition-[background-color,color,opacity]',
              'hover:bg-state-base-hover hover:text-text-secondary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              'data-[popup-open]:bg-state-base-hover data-[popup-open]:text-text-secondary data-[popup-open]:opacity-100',
              alwaysVisible
                ? null
                : 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100',
              triggerClassName,
            )}
          />
        }
      >
        <MoreHorizontalIcon className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={4}
        className={cn('w-44', menuClassName)}
        // Same propagation guard so a click inside the menu (which the
        // portal renders at body root anyway, but a keyboard activation
        // could still bubble through React's synthetic chain) never
        // triggers row-open.
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item, index) => {
          if (isSeparator(item)) {
            // eslint-disable-next-line react/no-array-index-key -- separators have no stable id
            return <DropdownMenuSeparator key={`sep-${index}`} />
          }
          return (
            <DropdownMenuItem
              key={item.label}
              disabled={item.disabled}
              variant={item.destructive ? 'destructive' : 'default'}
              onClick={() => {
                item.onSelect()
              }}
            >
              {item.icon ? <item.icon className="size-4" aria-hidden /> : null}
              <span className="flex-1">{item.label}</span>
              {item.trailing}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
