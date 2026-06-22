import { useState } from 'react'
import { ChevronsUpDownIcon, LayersIcon, LogOutIcon, PlusIcon, SettingsIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'

import { DuotoneIcon, type DuotoneTone } from '@/components/primitives/duotone-icon'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'

/**
 * WorkspaceSwitcher — the sidebar workspace / account switcher pill.
 *
 * Refs: Acme AI "Ace Studio 2.0" pill + the Mathilde / Julius account-switcher
 * popover. A rounded pill trigger carries a small duotone icon-chip
 * (DuotoneIcon) + the active workspace name + an up/down chevron. Clicking
 * opens a DropdownMenu listing the user's accounts (avatar + name + email + a
 * selected radio dot), then a divider, then "Account settings" / "Sign out"
 * rows.
 *
 * This is a /preview showcase build: self-contained demo data lives below so it
 * renders in isolation. Not wired into app-shell-nav.tsx — the real shell wires
 * its own data later. User-facing strings are plain literals here (no <Trans>)
 * to avoid running i18n:extract against a parallel session's WIP catalog.
 */

export type WorkspaceAccount = {
  id: string
  /** Workspace / org display name, e.g. "Ace Studio". */
  name: string
  /** Sign-in identity shown under the name, e.g. "mathilde@acme.ai". */
  email: string
  /** Optional avatar image; falls back to monogram initials when absent. */
  image?: string | null
  /** Optional duotone tone for the trigger icon-chip when this account is active. */
  tone?: DuotoneTone
}

export type WorkspaceSwitcherProps = {
  accounts: WorkspaceAccount[]
  /** id of the currently active account. */
  currentId: string
  /** Fired when a different account is picked. */
  onSelectAccount?: (accountId: string) => void
  /** Optional "Add workspace" affordance below the list. */
  onAddWorkspace?: () => void
  onAccountSettings?: () => void
  onSignOut?: () => void
  /** Collapse to just the icon-chip (narrow rail). */
  collapsed?: boolean
  className?: string
}

export function WorkspaceSwitcher({
  accounts,
  currentId,
  onSelectAccount,
  onAddWorkspace,
  onAccountSettings,
  onSignOut,
  collapsed = false,
  className,
}: WorkspaceSwitcherProps) {
  const current = accounts.find((a) => a.id === currentId) ?? accounts[0]
  if (!current) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Workspace: ${current.name}. Switch workspace`}
            className={cn(
              // Rounded pill chip — border + bg lift, no outer shadow (canon).
              // active:scale dip matches the nav rows; transform is in the
              // transition so the press eases and respects reduced motion.
              'inline-flex h-11 w-full min-w-0 cursor-pointer touch-manipulation items-center gap-2.5 rounded-lg border border-divider-subtle bg-background-default px-1.5 outline-none',
              'transition-[background-color,border-color,transform] motion-reduce:transition-none active:scale-[0.98]',
              'hover:bg-state-base-hover hover:border-divider-regular',
              'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              collapsed && 'w-auto justify-center gap-0',
              className,
            )}
          />
        }
      >
        <DuotoneIcon
          icon={LayersIcon}
          tone={current.tone ?? 'brand'}
          size="sm"
          className="shrink-0"
        />
        <span
          className={cn(
            'flex min-w-0 flex-1 flex-col text-left leading-tight',
            collapsed && 'hidden',
          )}
        >
          <span className="truncate text-sm font-medium text-text-primary" translate="no">
            {current.name}
          </span>
          <span className="truncate text-xs text-text-tertiary">{current.email}</span>
        </span>
        <ChevronsUpDownIcon
          aria-hidden
          className={cn('size-4 shrink-0 text-text-tertiary', collapsed && 'hidden')}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-72">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuGroup>
          {accounts.map((account) => {
            const selected = account.id === current.id
            return (
              <DropdownMenuItem
                key={account.id}
                aria-checked={selected}
                aria-label={
                  selected ? `${account.name} (current workspace)` : `Switch to ${account.name}`
                }
                className="flex items-center justify-between gap-3 py-1.5"
                onClick={() => {
                  if (selected) return
                  onSelectAccount?.(account.id)
                }}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <AssigneeAvatar
                    name={account.name}
                    title={account.name}
                    type="firm"
                    shape="square"
                    size="sm"
                    image={account.image ?? null}
                    className="shrink-0"
                  />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium text-text-primary" translate="no">
                      {account.name}
                    </span>
                    <span className="truncate text-xs text-text-tertiary">{account.email}</span>
                  </span>
                </span>
                {/* Selected = filled radio dot; unselected = hollow ring. The
                    radio reads as a single-choice cue without a heavy check. */}
                <span
                  aria-hidden
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded-full border',
                    selected ? 'border-state-accent-solid' : 'border-divider-regular',
                  )}
                >
                  {selected ? <span className="size-2 rounded-full bg-state-accent-solid" /> : null}
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>

        {onAddWorkspace ? (
          <DropdownMenuItem className="text-text-secondary" onClick={() => onAddWorkspace()}>
            <PlusIcon />
            <span>Add workspace</span>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAccountSettings?.()}>
          <SettingsIcon />
          <span>Account settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onSignOut?.()}>
          <LogOutIcon />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ------------------------------------------------------------------ *
 * Self-contained /preview demo
 * ------------------------------------------------------------------ */

const DEMO_ACCOUNTS: WorkspaceAccount[] = [
  {
    id: 'ace-studio',
    name: 'Ace Studio',
    email: 'mathilde@acme.ai',
    tone: 'brand',
  },
  {
    id: 'meridian-cpa',
    name: 'Meridian CPA Group',
    email: 'julius@meridian.com',
    tone: 'accent',
  },
  {
    id: 'northwind-tax',
    name: 'Northwind Tax',
    email: 'mathilde@northwind.co',
    tone: 'violet',
  },
]

/**
 * WorkspaceSwitcherDemo — drop into /preview. Holds local selection state so
 * the radio + trigger label update live, and constrains the width to a sidebar
 * footer slot so the pill reads at its real size.
 */
export function WorkspaceSwitcherDemo() {
  const [currentId, setCurrentId] = useState<string>('ace-studio')

  return (
    <div className="flex flex-col gap-6">
      <div className="w-64 rounded-xl border border-divider-subtle bg-background-section p-3">
        <WorkspaceSwitcher
          accounts={DEMO_ACCOUNTS}
          currentId={currentId}
          onSelectAccount={setCurrentId}
          onAddWorkspace={() => {}}
          onAccountSettings={() => {}}
          onSignOut={() => {}}
        />
      </div>

      {/* Collapsed rail variant — just the icon-chip. */}
      <div className="w-14 rounded-xl border border-divider-subtle bg-background-section p-2">
        <WorkspaceSwitcher
          accounts={DEMO_ACCOUNTS}
          currentId={currentId}
          onSelectAccount={setCurrentId}
          onAccountSettings={() => {}}
          onSignOut={() => {}}
          collapsed
        />
      </div>
    </div>
  )
}
