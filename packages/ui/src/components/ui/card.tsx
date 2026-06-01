import * as React from 'react'

import { cn } from '@duedatehq/ui/lib/utils'

function Card({
  className,
  size = 'default',
  tone = 'default',
  radius = 'xl',
  ...props
}: React.ComponentProps<'div'> & {
  size?: 'default' | 'sm' | 'xs'
  tone?: 'default' | 'warning' | 'accent' | 'muted'
  radius?: 'xl' | 'md'
}) {
  // 2026-05-31 (Yuqi DS-first revision): `size="xs"` added for
  // dashboard-density cards (compact alert tiles, dense list-item
  // surfaces). Aligns the existing Card primitive with the
  // density Dashboard/Today actually needs so consumers don't
  // hand-roll their own card chrome.
  //
  // Scale, by size:
  //   default — gap-5, py-5, px-5, text-base    (marketing / content blocks)
  //   sm      — gap-4, py-4, px-4, text-sm      (settings / forms)
  //   xs      — gap-2, py-3, px-3, text-sm      (alerts / dense list items)
  //
  // 2026-06-01: `tone` and `radius` axes added so in-drawer tinted
  // panels (warning amber, muted section, accent step-frame) and
  // dense in-page surfaces (rounded-md) can use the Card primitive
  // instead of hand-rolling border+bg+rounded recipes. Tone tints the
  // border + background; `radius="md"` swaps the chrome from the
  // marketing rounded-xl down to the dense rounded-md used across
  // PulseDetailDrawer, AlertsListPage, workload, opportunities, etc.
  return (
    <div
      data-slot="card"
      data-size={size}
      data-tone={tone}
      data-radius={radius}
      className={cn(
        'group/card flex flex-col gap-5 overflow-hidden rounded-xl border border-components-card-border bg-components-card-bg py-5 text-base text-text-primary shadow-xs has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 data-[size=xs]:gap-2 data-[size=xs]:py-3 data-[size=xs]:text-sm data-[radius=md]:rounded-md data-[tone=warning]:border-warning/40 data-[tone=warning]:bg-warning/5 data-[tone=accent]:border-state-accent-active data-[tone=accent]:bg-state-accent-hover-alt data-[tone=muted]:border-divider-subtle data-[tone=muted]:bg-background-section *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-5 group-data-[size=sm]/card:px-4 group-data-[size=xs]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-5 group-data-[size=sm]/card:[.border-b]:pb-4 group-data-[size=xs]/card:[.border-b]:pb-3',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'text-base leading-snug font-semibold text-text-primary group-data-[size=sm]/card:text-sm group-data-[size=xs]/card:text-sm group-data-[size=xs]/card:font-medium',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-text-tertiary', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        'px-5 group-data-[size=sm]/card:px-4 group-data-[size=xs]/card:px-3',
        className,
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-xl px-5 group-data-[size=sm]/card:px-4 group-data-[size=xs]/card:px-3 [.border-t]:pt-5 group-data-[size=sm]/card:[.border-t]:pt-4 group-data-[size=xs]/card:[.border-t]:pt-3',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
