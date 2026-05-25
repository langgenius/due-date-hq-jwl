'use client'

import * as React from 'react'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { PanelLeftIcon, PanelRightIcon } from 'lucide-react'

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
const SIDEBAR_WIDTH_COLLAPSED = '3.5rem' // 56px — icons-only rail
const SIDEBAR_WIDTH_MOBILE = '17.5rem' // 280px — Sheet drawer is slightly wider
const SIDEBAR_COLLAPSED_KEY = 'ddhq.sidebar.collapsed'

type SidebarContextValue = {
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
  isMobile: boolean
  /**
   * 2026-05-25 (Yuqi sidebar collapse): desktop collapse state.
   * When true, the rail narrows to 56px and shows only icons +
   * badge dots. Persisted in `localStorage[ddhq.sidebar.collapsed]`
   * so the user's preference survives reloads. Mobile mode
   * ignores this (the Sheet drawer is always full-width).
   */
  collapsed: boolean
  toggleCollapsed: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error('useSidebar must be used within a <SidebarProvider>.')
  }
  return ctx
}

function readPersistedCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState<boolean>(() => readPersistedCollapsed())
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

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore quota / disabled-storage failures; runtime state is the
        // source of truth for the current session either way
      }
      return next
    })
  }, [])

  // Memoise the value so non-Provider subscribers don't re-render on every
  // tree update (advanced-init-once).
  const value = React.useMemo<SidebarContextValue>(
    () => ({
      openMobile: visibleOpenMobile,
      setOpenMobile,
      toggleSidebar,
      isMobile,
      collapsed,
      toggleCollapsed,
    }),
    [visibleOpenMobile, toggleSidebar, isMobile, collapsed, toggleCollapsed],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function Sidebar({ className, children, ...props }: React.ComponentProps<'aside'>) {
  const { isMobile, openMobile, setOpenMobile, collapsed } = useSidebar()

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

  // 2026-05-25 (Yuqi sidebar collapse): `data-collapsed` flips the
  // descendant tree to icons-only mode via CSS group selectors —
  // labels hide, group labels hide, badges shrink to dots. The
  // `style` width animates between 220px and 56px for a smooth
  // transition that doesn't reflow the rest of the page.
  // 2026-05-26 (Yuqi sidebar hover-expand): when the sidebar is
  // collapsed AND the user hovers over it, temporarily expand to
  // full width so they can read labels without explicitly
  // un-collapsing. Same VSCode / Notion / Linear pattern. The
  // hover state is local-only; the persisted `collapsed` state
  // is untouched, so leaving the sidebar collapses it back. The
  // CSS group selectors key off `data-collapsed`, which is set
  // to the *effective* collapsed state (collapsed && !hovered)
  // so labels animate in/out cleanly with the width.
  // 2026-05-26 (Yuqi sidebar hover-expand follow-up): split
  // FOOTPRINT (the flex-layout slot) from VISUAL (the painted
  // chrome) so hover doesn't reflow the page.
  //   • Outer <aside>: `position: relative`, width follows
  //     `collapsed` only (220px / 56px) — never includes hover.
  //     Layout is stable, page content never shifts on hover.
  //   • Inner overlay <div>: `position: absolute; inset-y-0;
  //     left-0`, width follows the EFFECTIVE collapsed state
  //     (so hover widens it to 220px). When hovered while
  //     collapsed, the extra 164px overflows the 56px aside
  //     footprint and floats on top of the inset — the page
  //     content stays put underneath. Adds `shadow-md` when
  //     the overlay is wider than the footprint to read as a
  //     floating panel above the inset.
  //   • `data-collapsed` tracks the VISUAL state because the
  //     descendant CSS (label hide/show, badge dot vs digits,
  //     centered icon button, etc.) follows what the user sees,
  //     not the persisted state.
  const [hovered, setHovered] = React.useState(false)
  const effectiveCollapsed = collapsed && !hovered
  const overlayActive = collapsed && hovered
  return (
    <aside
      data-slot="sidebar"
      data-mobile="false"
      data-collapsed={effectiveCollapsed ? 'true' : 'false'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group/sidebar relative hidden h-svh shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:block',
        className,
      )}
      style={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      {...props}
    >
      {/* 2026-05-26 (Yuqi sidebar smoothness pass): both the
          footprint <aside> and the visual overlay <div> transition
          width at 300ms with Apple's "swiftOut" curve
          (cubic-bezier(0.32, 0.72, 0, 1)) — slightly slower than
          the prior 200ms ease-out and with much more pronounced
          deceleration. The label spans (in sidebarMenuButtonVariants)
          use the same curve + duration so icon-staying-put +
          label-fade-out read as one coordinated motion, not as
          two separate animations stepping on each other. */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 z-30 flex flex-col border-r border-divider-regular bg-components-panel-bg transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          overlayActive && 'shadow-[6px_0_24px_-12px_rgb(0_0_0_/_0.18)]',
        )}
        style={{ width: effectiveCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      >
        {children}
      </div>
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
    // 2026-05-25 (Yuqi sidebar collapse): in collapsed mode the
    // horizontal padding tightens (px-1.5) so icons sit centered
    // in the 56px rail.
    <div
      data-slot="sidebar-content"
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pt-4 pb-2',
        'group-data-[collapsed=true]/sidebar:px-1.5 group-data-[collapsed=true]/sidebar:gap-3',
        className,
      )}
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
  // 2026-05-25 (Yuqi sidebar collapse): group labels (e.g. "Operations",
  // "Practice") hide entirely in collapsed mode — the icons themselves
  // are the grouping affordance at 56px width.
  // 2026-05-25 (Yuqi sidebar collapse v3): "hide entirely" left all
  // icons running together in one column with no visual grouping at
  // all — looked weird without the labels carrying the separator
  // role. In collapsed mode the label slot now renders as a 1px
  // hairline divider (same `bg-divider-subtle` tone as the top rib
  // under the firm switcher). Text content + padding are hidden via
  // an aria-hidden inner wrapper so screen readers don't announce
  // empty group labels.
  return (
    <div
      data-slot="sidebar-group-label"
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        'flex h-7 shrink-0 items-center px-3 text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary',
        'group-data-[collapsed=true]/sidebar:my-1.5 group-data-[collapsed=true]/sidebar:h-px group-data-[collapsed=true]/sidebar:px-0 group-data-[collapsed=true]/sidebar:bg-divider-subtle',
        'group-data-[collapsed=true]/sidebar:[&>*]:hidden',
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
  // 2026-05-26 (Yuqi sidebar smoothness pass): in collapsed mode
  // bump menu-item gap from gap-0.5 (2px) → gap-1 (4px). At 32×32
  // icon tiles, 2px between tiles felt cramped — the rail read as
  // one continuous strip of color. 4px gives each icon a beat of
  // breathing room without losing the sense of grouping.
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn(
        'flex w-full min-w-0 flex-col gap-0.5',
        'group-data-[collapsed=true]/sidebar:gap-1',
        className,
      )}
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
    // 2026-05-26 (Yuqi sidebar smoothness pass): label span now
    // animates rather than hard-hides. Expanded → collapsed
    // transitions opacity (1 → 0) and max-width (full → 0) at
    // 240ms with the same Apple swiftOut curve the outer aside
    // uses, so the rail-width-shrink and label-fade-out feel
    // like one coordinated motion. (Was 150ms ease-out — too
    // fast against the 300ms aside transition, labels popped
    // before the rail finished moving.)
    '[&>span:nth-child(2)]:transition-[opacity,max-width] [&>span:nth-child(2)]:duration-240 [&>span:nth-child(2)]:ease-[cubic-bezier(0.32,0.72,0,1)]',
    // 2026-05-25 (Yuqi sidebar collapse): collapsed-mode tweaks —
    // center the icon at 56px width, drop the horizontal padding,
    // and hide the label span. The consumer's NavLink passes a
    // `title` attribute as the native hover tooltip.
    // 2026-05-25 (Yuqi rail alignment v2): in collapsed mode the
    // button shrinks to a centered 32×32 square (size-8 mx-auto).
    // Previously it kept w-full + h-8, so the bg-accent-tint
    // active state stretched the full 44px row width while
    // sibling icons (bell, toggle, footer items) were 32×32 —
    // the active row read as a stretched pill out of family
    // with everything else. Now active + hover both render as
    // a 32×32 tinted tile, matching the rest of the rail.
    'group-data-[collapsed=true]/sidebar:size-8 group-data-[collapsed=true]/sidebar:w-8 group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0',
    // 2026-05-26 (Yuqi sidebar smoothness pass): collapsed-mode
    // label hide swapped from `hidden` → opacity-0 + max-w-0 +
    // overflow-hidden so the label animates out (per the
    // `transition-[opacity,max-width]` rule above) instead of
    // disappearing instantly. `pointer-events-none` keeps the
    // collapsed label from intercepting clicks during the fade.
    'group-data-[collapsed=true]/sidebar:[&>span:nth-child(2)]:max-w-0 group-data-[collapsed=true]/sidebar:[&>span:nth-child(2)]:opacity-0 group-data-[collapsed=true]/sidebar:[&>span:nth-child(2)]:pointer-events-none group-data-[collapsed=true]/sidebar:[&>span:nth-child(2)]:overflow-hidden',
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
  // 2026-05-25 (Yuqi sidebar collapse): in collapsed mode the full
  // count pill doesn't fit (it would push past the 56px rail) AND
  // the count digits are unreadable at icon scale. Switched to a
  // 6×6 absolutely-positioned dot in the top-right corner of the
  // menu button — same tone, no digit. Sufficient to signal "there
  // are items here" while the user is in icons-only mode; the
  // exact count returns when they expand the rail. The
  // `group-data-[collapsed=true]/sidebar:` selectors flip these
  // styles via the data attribute on the root <aside>.
  // 2026-05-26 (Yuqi /rules/pulse #3): badge frame dropped — both
  // tones used to render as outlined pills with bg fill + border.
  // Yuqi flagged "the number still in a frame that is hugging the
  // text. just left aligned." Now both tones render as plain
  // tabular-nums text in the tone color, sitting inline next to
  // the label (ml-1 gap) rather than pushed to the row's right
  // edge with ml-auto. Reads as "Alerts 3" inline — same density
  // as Linear / Notion sidebar counts.
  // Collapsed-mode dot indicator preserved unchanged (item still
  // visible at icon scale).
  if (tone === 'inventory') {
    return (
      <span
        data-slot="sidebar-menu-badge"
        data-tone="inventory"
        className={cn(
          'pointer-events-none ml-1 inline-flex shrink-0 items-center font-mono text-xs font-medium tabular-nums text-text-tertiary',
          'group-data-[active=true]/menu-button:text-text-secondary group-aria-[current=page]/menu-button:text-text-secondary',
          'group-data-[collapsed=true]/sidebar:absolute group-data-[collapsed=true]/sidebar:right-1.5 group-data-[collapsed=true]/sidebar:top-1.5 group-data-[collapsed=true]/sidebar:ml-0 group-data-[collapsed=true]/sidebar:h-1.5 group-data-[collapsed=true]/sidebar:min-w-1.5 group-data-[collapsed=true]/sidebar:rounded-full group-data-[collapsed=true]/sidebar:bg-text-tertiary group-data-[collapsed=true]/sidebar:p-0 group-data-[collapsed=true]/sidebar:text-transparent',
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
        'pointer-events-none ml-1 inline-flex shrink-0 items-center font-mono text-xs font-medium tabular-nums text-text-warning',
        'group-data-[collapsed=true]/sidebar:absolute group-data-[collapsed=true]/sidebar:right-1.5 group-data-[collapsed=true]/sidebar:top-1.5 group-data-[collapsed=true]/sidebar:ml-0 group-data-[collapsed=true]/sidebar:h-1.5 group-data-[collapsed=true]/sidebar:min-w-1.5 group-data-[collapsed=true]/sidebar:rounded-full group-data-[collapsed=true]/sidebar:bg-state-warning-solid group-data-[collapsed=true]/sidebar:p-0 group-data-[collapsed=true]/sidebar:text-transparent',
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

/**
 * 2026-05-25 (Yuqi sidebar collapse): desktop-only toggle that
 * flips between full-width (220px) and icons-only (56px). Hidden
 * below `md` since mobile uses the `SidebarTrigger` Sheet flow.
 *
 * Originally rendered as a full-width row above the user menu —
 * Yuqi flagged that as a lonely centered chevron orphaned between
 * the footer nav divider and the user row. Now sized as a compact
 * 24px square icon button so it can sit inline with the firm
 * switcher in the top header row (right side of the row when
 * expanded; stacked vertically with switcher + bell when
 * collapsed).
 *
 * Icons follow the standard "panel" metaphor: `PanelLeftIcon`
 * when the sidebar is expanded (visual: the left panel is
 * highlighted → click to push it back), `PanelRightIcon` when
 * collapsed (visual: the right side is full → click to bring
 * the left panel back).
 */
export function SidebarCollapseToggle({ className }: { className?: string }) {
  const { collapsed, toggleCollapsed } = useSidebar()
  const Icon = collapsed ? PanelRightIcon : PanelLeftIcon
  return (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!collapsed}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      // 2026-05-25 (Yuqi rail alignment fix): size-6 → size-8
      // so the toggle matches the firm-switcher trigger and bell
      // button hit-box. All three top-row buttons now render
      // as 32×32 squares centered in the 56px rail.
      className={cn(
        'hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-tertiary outline-none transition-colors',
        'hover:bg-background-default-hover hover:text-text-secondary',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        'md:inline-flex',
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}
