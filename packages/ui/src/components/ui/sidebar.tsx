'use client'

import * as React from 'react'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@duedatehq/ui/lib/utils'
import { useIsMobile } from '@duedatehq/ui/hooks/use-mobile'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'

/**
 * AppShell sidebar primitives — hand-rolled (NOT shadcn `Sidebar`).
 *
 * Why: DESIGN.md §5.4 fixes the desktop sidebar at 220px (no collapse), and
 * `⌘K` / `⌘⇧O` already own the keyboard vocabulary, so shadcn's three
 * collapse modes / rail / cookie state / `Cmd+B` shortcut / floating-inset
 * variants are all dead code for us. See
 * `docs/dev-log/2026-04-27-app-shell-sidebar.md` for the full decision matrix.
 *
 * Surface:
 *  - <Sidebar>                         — desktop <aside> (220px) / mobile <Sheet>
 *  - <SidebarHeader / Content / Footer>— three semantic slots
 *  - <SidebarSeparator>                — full-width hairline (border/default)
 *  - <SidebarGroup / GroupLabel / GroupContent>
 *  - <SidebarMenu / MenuItem>
 *  - <SidebarMenuButton>               — cva variants + `render` prop, accepts
 *                                        a NavLink (or any element) as the
 *                                        underlying tag
 *  - <SidebarMenuBadge>                — mono tabular-nums counter pill
 *  - <SidebarTrigger>                  — mobile-only toggle (md:hidden)
 *  - <SidebarProvider> / useSidebar()  — mobile sheet open state
 *
 * The selected-nav style is **bg-only, zero accent** to keep DESIGN §1.2
 * "color only serves risk" globally enforceable. There is intentionally NO
 * `accent` variant on `SidebarMenuButton`.
 */

const SIDEBAR_WIDTH = '13.75rem' // 220px — DESIGN §Layout regions
const SIDEBAR_WIDTH_MOBILE = '17.5rem' // 280px — Sheet drawer is slightly wider

type SidebarContextValue = {
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
  isMobile: boolean
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error('useSidebar must be used within a <SidebarProvider>.')
  }
  return ctx
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const visibleOpenMobile = isMobile ? openMobile : false

  if (!isMobile && openMobile) {
    setOpenMobile(false)
  }

  // `setOpenMobile` is stable because it comes from useState; passing a
  // functional updater means callers don't need to subscribe to `openMobile`
  // to flip it (vercel-react-best-practices: rerender-functional-setstate).
  const toggleSidebar = React.useCallback(() => {
    setOpenMobile((prev) => !prev)
  }, [])

  // Memoise the value so non-Provider subscribers don't re-render on every
  // tree update (advanced-init-once).
  const value = React.useMemo<SidebarContextValue>(
    () => ({ openMobile: visibleOpenMobile, setOpenMobile, toggleSidebar, isMobile }),
    [visibleOpenMobile, toggleSidebar, isMobile],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function Sidebar({ className, children, ...props }: React.ComponentProps<'aside'>) {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-slot="sidebar"
          data-mobile="true"
          side="left"
          className="flex flex-col bg-components-panel-bg p-0 [&>button]:hidden"
          style={
            {
              '--sidebar-width-mobile': SIDEBAR_WIDTH_MOBILE,
              width: SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Primary navigation</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      data-slot="sidebar"
      data-mobile="false"
      className={cn(
        'hidden h-svh shrink-0 flex-col border-r border-divider-regular bg-components-panel-bg md:flex',
        className,
      )}
      style={{ width: SIDEBAR_WIDTH }}
      {...props}
    >
      {children}
    </aside>
  )
}

export function SidebarInset({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn('flex min-w-0 flex-1 flex-col', className)}
      {...props}
    />
  )
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('flex shrink-0 flex-col', className)}
      {...props}
    />
  )
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-2', className)}
      {...props}
    />
  )
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn('flex shrink-0 flex-col', className)}
      {...props}
    />
  )
}

export function SidebarSeparator({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { variant?: 'default' | 'subtle' }) {
  return (
    <div
      data-slot="sidebar-separator"
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        'h-px shrink-0',
        variant === 'subtle' ? 'bg-divider-subtle' : 'bg-divider-regular',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn('flex w-full min-w-0 flex-col', className)}
      {...props}
    />
  )
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        'flex h-7 shrink-0 items-center px-3 text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('w-full', className)} {...props} />
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn('flex w-full min-w-0 flex-col gap-0.5', className)}
      {...props}
    />
  )
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  )
}

const sidebarMenuButtonVariants = cva(
  cn(
    'group/menu-button peer/menu-button relative flex h-8 w-full cursor-pointer touch-manipulation items-center gap-2.5 overflow-hidden rounded-md px-3 text-left text-base font-normal text-text-secondary outline-none transition-colors',
    // Hover uses a neutral surface token; selected state below uses the
    // explicit accent tint so route wayfinding stays distinct from row hover.
    'hover:bg-background-default-hover hover:text-text-primary',
    'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-text-tertiary",
    // Active state has two valid sources: (1) react-router's NavLink renders
    // `aria-current="page"` automatically, and (2) any consumer that passes
    // `isActive` to SidebarMenuButton sets `data-active="true"`. Either flips
    // the visual; we never store a redundant React state copy.
    //
    // Background uses `accent-tint` (the DESIGN.md wayfinding token,
    // `#eff4ff` light / 14 % Dify blue dark) — calm enough to honor "color only
    // serves risk" while still visibly identifying the active route. No 2 px
    // accent border, no `accent-text` label color.
    "data-[active=true]:bg-accent-tint data-[active=true]:text-text-accent [&[data-active=true]_svg:not([class*='text-'])]:text-text-accent",
    "aria-[current=page]:bg-accent-tint aria-[current=page]:text-text-accent [&[aria-current=page]_svg:not([class*='text-'])]:text-text-accent",
    '[&>span:nth-child(2)]:flex-1 [&>span:nth-child(2)]:truncate',
  ),
  {
    variants: {
      // Intentionally no "accent" variant: selected-state uses bg-only (DESIGN
      // §4.9 + §1.2). If you find yourself wanting accent here, the answer is
      // probably to use a CTA button outside the menu instead.
      variant: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export { sidebarMenuButtonVariants }

type SidebarMenuButtonOwnProps = {
  isActive?: boolean
} & VariantProps<typeof sidebarMenuButtonVariants>

export function SidebarMenuButton({
  render,
  isActive = false,
  variant = 'default',
  className,
  ...props
}: useRender.ComponentProps<'button'> & SidebarMenuButtonOwnProps) {
  return useRender({
    defaultTagName: 'button',
    props: {
      ...props,
      'data-slot': 'sidebar-menu-button',
      'data-active': isActive ? 'true' : undefined,
      className: cn(sidebarMenuButtonVariants({ variant }), className),
    },
    render,
  })
}

export function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="sidebar-menu-badge"
      className={cn(
        // Mono numeric pill, always white (so it stands out on neutral panel
        // bg AND on accent-tint selected bg without a separate active-state
        // override). The 1px hairline keeps it readable on both surfaces.
        'pointer-events-none ml-auto inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-sm border border-divider-regular bg-background-default px-1 font-mono text-xs font-medium tabular-nums text-text-tertiary',
        'group-data-[active=true]/menu-button:text-text-secondary group-aria-[current=page]/menu-button:text-text-secondary',
        className,
      )}
      {...props}
    />
  )
}

export type SidebarTriggerProps = useRender.ComponentProps<'button'> &
  React.ComponentProps<'button'>

export function SidebarTrigger({
  render,
  onClick,
  className,
  children,
  ...props
}: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar()

  // Wrap the consumer's onClick so external handlers still fire while we
  // also flip the mobile sheet open/closed.
  const handleClick = React.useCallback<NonNullable<React.ComponentProps<'button'>['onClick']>>(
    (event) => {
      onClick?.(event)
      toggleSidebar()
    },
    [onClick, toggleSidebar],
  )

  return useRender({
    defaultTagName: 'button',
    props: {
      ...props,
      'data-slot': 'sidebar-trigger',
      type: 'button',
      'aria-label': 'Toggle navigation',
      onClick: handleClick,
      className: cn(
        'inline-flex size-7 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-divider-regular bg-background-default text-text-secondary outline-none transition-colors',
        'hover:bg-background-default-hover hover:text-text-primary',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'md:hidden',
        className,
      ),
      children,
    },
    render,
  })
}
