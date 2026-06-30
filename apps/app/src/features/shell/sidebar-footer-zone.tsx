import { useState } from 'react'
import {
  AlertTriangleIcon,
  BellIcon,
  EllipsisIcon,
  RocketIcon,
  SettingsIcon,
  UserPlusIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { DuotoneIcon } from '@/components/primitives/duotone-icon'

/**
 * SidebarFooterZone — the bottom stack of the navigation rail (Pencil refs:
 * the "Upgrade to PRO" setup card + the live-feed footer with a peeking
 * "Orders Import failed" toast, Notifications(3), Invite teammates, Settings,
 * and a profile chip with a kebab).
 *
 * Stacked top-to-bottom:
 *   1. an OPTIONAL dismissible promo / setup card (icon + title + small desc
 *      + a primary CTA). Closing it just hides it (showcase-local state).
 *   2. a Notifications utility row carrying a red count badge, with a PEEKING
 *      toast card sitting just above it (a soft micro-shadow lift so it reads
 *      as a transient surface floating over the rail).
 *   3. Invite teammates + Settings utility rows.
 *   4. a profile chip (avatar + name/role + kebab dropdown).
 *
 * This is a /preview SHOWCASE component: it owns demo data and never reads the
 * live nav store, so it renders in isolation. The strings are kept as plain
 * literals (not i18n macros) to AVOID running i18n:extract, which would pull a
 * parallel session's WIP catalog — they would be wrapped in <Trans>/t`` when
 * this graduates into app-shell-nav.
 *
 * Tokens follow the rail vocabulary: bg-background-sidebar-card surfaces,
 * bg-background-sidebar-hover row hover, semantic text tokens, fixed radius
 * scale (12px wrapper / 8px rows+buttons / 999 pill+avatar), restrained
 * shadows (border + bg lift; the only blur is a micro-shadow on the peeking
 * toast, well under the blur<=4 affordance ceiling).
 */

type DemoToast = {
  id: string
  /** Container tone — chroma lives in the icon chip, never in text on the row. */
  tone: 'warning' | 'accent' | 'success'
  icon: LucideIcon
  title: string
  meta: string
}

type DemoProfile = {
  name: string
  role: string
}

type PromoCard = {
  icon: LucideIcon
  title: string
  desc: string
  cta: string
}

const DEMO_PROMO: PromoCard = {
  icon: RocketIcon,
  title: 'Upgrade to Team',
  desc: 'Unlock 24/7 monitoring, shared queues, and unlimited alert rules.',
  cta: 'See plans',
}

const DEMO_TOAST: DemoToast = {
  id: 'orders-import',
  tone: 'warning',
  icon: AlertTriangleIcon,
  title: 'Orders import failed',
  meta: 'Hudson LLC · 2m ago',
}

const DEMO_PROFILE: DemoProfile = {
  name: 'Avery Chen',
  role: 'Partner',
}

const NOTIFICATION_COUNT = 3

/**
 * One footer utility row — an icon + label, with an optional trailing slot
 * (count badge). Mirrors the nav-row anatomy from app-shell-nav (h-8, gap-2,
 * rounded-lg, hover bg wash, pressed scale) so the footer reads in family with
 * the nav rows above it without importing the SidebarMenuButton primitive
 * (which is bound to the live sidebar context).
 */
function FooterRow({
  icon: Icon,
  label,
  trailing,
  onClick,
}: {
  icon: LucideIcon
  label: string
  trailing?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 w-full cursor-pointer touch-manipulation items-center gap-2 rounded-lg px-3 text-left text-text-secondary outline-none',
        'transition-[color,background-color,transform] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        'hover:bg-background-sidebar-hover hover:text-text-primary',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
      )}
    >
      <Icon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      {trailing}
    </button>
  )
}

export function SidebarFooterZone({
  showPromo: showPromoInitial = true,
  showToast = true,
}: {
  showPromo?: boolean
  showToast?: boolean
}) {
  const [showPromo, setShowPromo] = useState(showPromoInitial)
  const PromoIcon = DEMO_PROMO.icon

  return (
    // Wrapper = the sidebar card surface. 12px radius (wrapper tier), border +
    // bg contrast does the lift — no outer shadow (restrained-shadows canon).
    <div className="flex w-[260px] flex-col gap-2 rounded-xl border border-divider-subtle bg-background-sidebar-card p-2">
      {/* 1 — Promo / setup card. Dismissible: the ✕ just hides it locally. */}
      {showPromo ? (
        <div className="relative rounded-lg border border-divider-subtle bg-background-default p-3">
          <button
            type="button"
            onClick={() => setShowPromo(false)}
            aria-label="Dismiss"
            className={cn(
              'absolute top-2 right-2 grid size-6 place-items-center rounded-md text-text-tertiary outline-none',
              'transition-colors hover:bg-background-sidebar-hover hover:text-text-secondary',
              'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
            )}
          >
            <XIcon className="size-3.5" aria-hidden />
          </button>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <DuotoneIcon icon={PromoIcon} tone="brand" size="sm" />
              <p className="text-sm font-semibold text-text-primary">{DEMO_PROMO.title}</p>
            </div>
            {/* Small desc — quiet caption, leaves room for the ✕ on line one. */}
            <p className="text-xs leading-snug text-text-tertiary">{DEMO_PROMO.desc}</p>
            <Button variant="primary" size="sm" className="w-full">
              {DEMO_PROMO.cta}
            </Button>
          </div>
        </div>
      ) : null}

      {/* 2 — Notifications row with a PEEKING toast card sitting just above it.
          The toast is a transient surface, so it gets the zone's only shadow —
          a micro blur (shadow-sm ≈ 2px) to lift it off the rail, well under the
          affordance ceiling. The relative wrapper lets the toast hug the row. */}
      <div className="flex flex-col gap-1.5">
        {showToast ? (
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-lg border border-divider-subtle bg-background-default p-2.5 shadow-sm',
              'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-reduce:animate-none',
            )}
          >
            <DuotoneIcon icon={DEMO_TOAST.icon} tone={DEMO_TOAST.tone} size="sm" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {/* Title stays neutral text — chroma is carried by the icon chip,
                  not coloured text (no-coloured-text canon). */}
              <p className="truncate text-sm font-medium text-text-primary">{DEMO_TOAST.title}</p>
              <p className="truncate text-xs text-text-tertiary">{DEMO_TOAST.meta}</p>
            </div>
          </div>
        ) : null}

        <FooterRow
          icon={BellIcon}
          label="Notifications"
          trailing={
            NOTIFICATION_COUNT > 0 ? (
              <Badge variant="destructive" size="sm" className="tabular-nums" aria-hidden>
                {NOTIFICATION_COUNT}
              </Badge>
            ) : undefined
          }
        />
      </div>

      {/* 3 — Invite teammates + Settings utility rows. */}
      <div className="flex flex-col">
        <FooterRow icon={UserPlusIcon} label="Invite teammates" />
        <FooterRow icon={SettingsIcon} label="Settings" />
      </div>

      {/* One hairline caps the profile chip from the utility rows above —
          center-weighted gradient seam (matches app-shell-nav's footer seam),
          inset from the card edges so it reads soft, not ruled. */}
      <div
        aria-hidden
        className="mx-1 h-px bg-gradient-to-r from-transparent via-divider-regular to-transparent"
      />

      {/* 4 — Profile chip: avatar + name/role + kebab dropdown. */}
      <div className="flex items-center gap-2 rounded-lg px-1 py-1">
        <AssigneeAvatar
          name={DEMO_PROFILE.name}
          title={DEMO_PROFILE.name}
          size="sm"
          className="shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-text-primary" translate="no">
            {DEMO_PROFILE.name}
          </span>
          <span className="truncate text-xs text-text-tertiary">{DEMO_PROFILE.role}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Account menu"
                className="shrink-0 text-text-tertiary"
              >
                <EllipsisIcon className="size-4" aria-hidden />
              </Button>
            }
          />
          <DropdownMenuContent align="end" side="top" className="min-w-[180px]">
            <DropdownMenuItem>Account settings</DropdownMenuItem>
            <DropdownMenuItem>Switch workspace</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
