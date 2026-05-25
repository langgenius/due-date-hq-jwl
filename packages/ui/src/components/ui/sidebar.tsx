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
 * 2026-05-25 (Yuqi Today #3 — DEFERRED): Yuqi asked for a desktop
 * collapse state. That overturns DESIGN.md §5.4 and needs a real
 * design decision before implementation:
 *   - Collapsed width? (Spec it: icon-only 56px? popout-on-hover?)
 *   - Persistence layer (localStorage vs. user setting in DB)?
 *   - How do badge counts render in collapsed mode (Alerts 3, etc.)?
 *   - Trigger location (top-of-rail rail handle? topbar button?)?
 * Not a one-off CSS fix — handled as its own design-track task.
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
    // 2026-05-25 (Yuqi Today #2): pt-4 (16px) instead of py-2 (8px)
    // for the top edge. The previous 8px gap between the firm
    // switcher header and the first nav group felt cramped — the
    // switcher and the first item read as one block when they're
    // semantically separate (workspace identity vs. navigation).
    // Extra breathing room above lets the eye land on "Today" as
    // the real start of the nav rail.
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pt-4 pb-2', className)}
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

/**
 * Two tones for sidebar count badges:
 *  - `urgent` (default for back-compat): saturated warning pill — use
 *    for counts that mean "look at this" (Alerts, Rule library
 *    review backlog).
 *  - `inventory`: framed neutral pill — use for counts that are
 *    reference facts (Clients, Deadlines). CPA shouldn't read these
 *    as "do something."
 *
 * 2026-05-25 (Yuqi Today #18): both tones now share the SAME pill
 * shape (height, radius, border) so the right edge of the sidebar
 * reads as one consistent column. Yuqi flagged that "the number in
 * Deadlines isn't aligned with Alerts. it is not framed" — the
 * inventory tone used to render as a bare mono number with no
 * border, sitting visually higher and at a different x-position
 * than the framed urgent pill above. Now: same chip outline,
 * different fills (warning-hover for urgent, subtle for inventory).
 * Semantics still distinguish ("look here" vs "reference fact") via
 * fill saturation, not via wildly different shapes.
 */
export function SidebarMenuBadge({
  className,
  tone = 'urgent',
  ...props
}: React.ComponentProps<'span'> & { tone?: 'urgent' | 'inventory' }) {
  // 2026-05-25 (Yuqi sidebar badge alignment follow-up): all badges
  // now share `min-w-[32px]` with `justify-end` so single-digit (3,
  // 5), double-digit (10) and triple-digit (456) counts all occupy
  // the same footprint, with digits right-aligned inside. The right
  // edges already aligned via `ml-auto`; the new fixed min-width
  // makes the LEFT edges align too, so the rail reads as one tidy
  // column of right-justified numbers rather than a ragged-left
  // stack. 32px holds up through 3 digits with px-1 internal
  // padding; 4-digit counts (unrealistic in this app) would still
  // expand gracefully.
  if (tone === 'inventory') {
    return (
      <span
        data-slot="sidebar-menu-badge"
        data-tone="inventory"
        className={cn(
          'pointer-events-none ml-auto inline-flex h-[18px] min-w-[32px] shrink-0 items-center justify-end rounded-sm border border-divider-subtle bg-background-subtle px-1.5 font-mono text-xs font-medium tabular-nums text-text-tertiary',
          'group-data-[active=true]/menu-button:text-text-secondary group-aria-[current=page]/menu-button:text-text-secondary',
          className,
        )}
        {...props}
      />
    )
  }
  return (
    <span
      data-slot="sidebar-menu-badge"
      data-tone="urgent"
      className={cn(
        // Saturated warning pill — readable on the panel bg AND on the
        // accent-tint selected bg without needing an active-state override.
        'pointer-events-none ml-auto inline-flex h-[18px] min-w-[32px] shrink-0 items-center justify-end rounded-sm border border-state-warning-border bg-state-warning-hover px-1.5 font-mono text-xs font-medium tabular-nums text-text-warning',
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
