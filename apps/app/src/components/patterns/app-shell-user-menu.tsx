import { useCallback, useTransition } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trans, useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { I18n } from '@lingui/core'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { isThemePreference, type ThemePreference } from '@duedatehq/ui/theme'
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@duedatehq/i18n'
import type { FirmPublic } from '@duedatehq/contracts'
import { useLocaleSwitch } from '@/i18n/provider'
import { signOut, type AuthUser } from '@/lib/auth'
import { resetAnalytics } from '@/lib/analytics'
import { cn } from '@duedatehq/ui/lib/utils'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { roleLabel } from './app-shell-nav'

type DemoRole = 'owner' | 'partner' | 'manager' | 'preparer' | 'coordinator'
type DemoPlan = 'solo' | 'pro' | 'team'

type DemoAccount = {
  id: string
  userId: string
  firmId: string
  name: string
  email: string
  role: DemoRole
  plan: DemoPlan
}

type DemoAccountsResponse = {
  accounts: DemoAccount[]
}

const DEMO_ACCOUNTS_QUERY_KEY = ['e2e', 'demo-accounts'] as const

function isDemoRole(value: unknown): value is DemoRole {
  return (
    value === 'owner' ||
    value === 'partner' ||
    value === 'manager' ||
    value === 'preparer' ||
    value === 'coordinator'
  )
}

function isDemoPlan(value: unknown): value is DemoPlan {
  return value === 'solo' || value === 'pro' || value === 'team'
}

function isDemoAccount(value: unknown): value is DemoAccount {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<Record<keyof DemoAccount, unknown>>
  return (
    typeof input.id === 'string' &&
    typeof input.userId === 'string' &&
    typeof input.firmId === 'string' &&
    typeof input.name === 'string' &&
    typeof input.email === 'string' &&
    isDemoRole(input.role) &&
    isDemoPlan(input.plan)
  )
}

function parseDemoAccountsResponse(value: unknown): DemoAccountsResponse {
  if (!value || typeof value !== 'object' || !('accounts' in value)) {
    return { accounts: [] }
  }
  const accounts = Reflect.get(value, 'accounts')
  return {
    accounts: Array.isArray(accounts) ? accounts.filter(isDemoAccount) : [],
  }
}

async function fetchDemoAccounts(): Promise<DemoAccountsResponse> {
  const response = await fetch('/api/e2e/demo-accounts', { credentials: 'include' })
  if (!response.ok) return { accounts: [] }
  return parseDemoAccountsResponse(await response.json())
}

export function isDemoUser(user: Pick<AuthUser, 'id'> | null | undefined): boolean {
  return typeof user?.id === 'string' && user.id.startsWith('mock_user_')
}

// Public no-signup demo visitor (server mints userId `public_demo_*`). Their
// session is server-enforced read-only; the app shows a "sign up" banner.
export function isReadOnlyDemoUser(user: Pick<AuthUser, 'id'> | null | undefined): boolean {
  return typeof user?.id === 'string' && user.id.startsWith('public_demo_')
}

export function currentPathForDemoSwitch(input: {
  pathname: string
  search: string
  hash: string
}): string {
  return `${input.pathname || '/'}${input.search}${input.hash}`
}

export function demoAccountSwitchHref(account: DemoAccount | DemoRole, redirectTo: string): string {
  const params = new URLSearchParams()
  if (typeof account === 'string') {
    params.set('role', account)
  } else {
    params.set('account', account.id)
  }
  params.set('redirectTo', redirectTo || '/')
  return `/api/e2e/demo-login?${params.toString()}`
}

const DEMO_ROLE_LABELS = {
  owner: msg`Owner`,
  partner: msg`Partner`,
  manager: msg`Manager`,
  preparer: msg`Preparer`,
  coordinator: msg`Coordinator`,
} as const
const DEMO_PLAN_LABELS = {
  solo: msg`Solo`,
  pro: msg`Pro`,
  team: msg`Team`,
} as const

function demoRoleLabel(role: DemoRole, i18n: I18n): string {
  return i18n._(DEMO_ROLE_LABELS[role])
}

function demoPlanLabel(plan: DemoPlan, i18n: I18n): string {
  return i18n._(DEMO_PLAN_LABELS[plan])
}

function UserMenuTrigger({
  user,
  firm,
  themePreference,
  switchThemePreference,
}: {
  user: AuthUser
  firm: FirmPublic
  themePreference: ThemePreference
  switchThemePreference: (next: ThemePreference) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n, t } = useLingui()
  const { locale, switchLocale } = useLocaleSwitch()
  const [isSigningOut, startSignOut] = useTransition()
  const demoEnabled = isDemoUser(user)
  const demoAccountsQuery = useQuery({
    queryKey: DEMO_ACCOUNTS_QUERY_KEY,
    queryFn: fetchDemoAccounts,
    enabled: demoEnabled,
    staleTime: 60_000,
    retry: false,
  })

  // Firm switcher. Shares the `firms.listMine` cache the layout already
  // warms, so this adds no extra request. The switcher only renders when the
  // user belongs to >1 firm — single-firm users keep the calm static
  // identity. Switching changes the active firm on the SESSION (server-side),
  // so we hard-navigate to "/" on success: every query is firm-scoped and a
  // full reload is the clean, race-free way to re-enter the new firm's
  // context (the conventional workspace-switch behaviour).
  const firmsQuery = useQuery(orpc.firms.listMine.queryOptions({ input: undefined }))
  const firms = firmsQuery.data ?? []
  const switchFirmMutation = useMutation(
    orpc.firms.switchActive.mutationOptions({
      onSuccess: () => {
        window.location.assign('/')
      },
      onError: (err) => {
        toast.error(t`Couldn't switch firm`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  const handleSignOut = useCallback(() => {
    if (isSigningOut) return
    startSignOut(async () => {
      try {
        await signOut()
        // Clear Amplitude identity + device so the next user starts clean.
        resetAnalytics()
        await navigate('/login', { replace: true })
      } catch (err) {
        toast.error(t`Sign out failed`, {
          description:
            err instanceof Error
              ? err.message
              : t`Try again in a moment. If it keeps failing, contact support.`,
        })
      }
    })
  }, [isSigningOut, navigate, t])

  const displayName = user.name || t`Signed in`
  const accountLabel = t`Account menu for ${user.name || user.email}`
  const signOutLabel = isSigningOut ? t`Signing out…` : t`Sign out`
  const demoAccounts = demoAccountsQuery.data?.accounts ?? []
  const showDemoSwitcher = demoEnabled && demoAccounts.length > 0
  const currentPath = currentPathForDemoSwitch(location)
  const role = roleLabel(firm.role, i18n)
  const roleAtFirm = t`${role} at ${firm.name}`

  return (
    <DropdownMenu>
      {/* The trigger is an avatar + name so it reads as a legible account
          chip without opening the menu. Name is truncated so a long display
          name doesn't overflow the sidebar footer. In collapsed mode the
          trigger shrinks to just the 32×32 avatar (matching the
          firm-switcher, bell, and toggle hit-box) and the name span hides, so
          nothing leaks past the 56px rail. */}
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={accountLabel}
            className={cn(
              // Keeps px-1 in both modes (avatar at 16px). No collapsed size
              // override — only the name span hides, the avatar stays put and
              // centers in the narrow card via the symmetric padding.
              // h-10 (Yuqi "profile section height is different"): match the
              // firm header's fixed h-10 (40px) so the top + bottom avatars
              // bookend at the SAME box height — `py-2.5` had made this chip
              // 48px, 8px taller than the header, which read as a displacement.
              // The two-line identity stack still fits centered in 40px.
              // active:scale-[0.98]: the chip dips on press like the nav rows
              // (transform added to the transition so the dip eases).
              // pl-[5px] left-aligns the 28px avatar for the EXPANDED chip.
              // Collapsed: center it (justify-center + pl-0) so it lands on the
              // same centerline as the now-centered nav icons + firm monogram
              // (2026-07-22 "avatar没有对齐" — the labeled rail centers its
              // tiles; the old pl-[5px] left-nudge no longer matches).
              'inline-flex h-10 w-full min-w-0 cursor-pointer touch-manipulation items-center gap-2.5 rounded-lg pr-1.5 pl-[5px] outline-none transition-[background-color,color,transform] active:scale-[0.98]',
              'group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:gap-0 group-data-[collapsed=true]/sidebar:pr-0 group-data-[collapsed=true]/sidebar:pl-0',
              'hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
            )}
          />
        }
      >
        <UserAvatar user={user} />
        {/* The chip is a two-line identity stack (display name + workspace
            name) with a chevron affordance. Both the stack and chevron hide
            in the collapsed rail, leaving just the avatar. */}
        <span className="flex min-w-0 flex-1 flex-col text-left leading-tight group-data-[collapsed=true]/sidebar:hidden">
          <span className="truncate text-base font-semibold text-text-primary">{displayName}</span>
          <span className="truncate text-xs font-medium text-text-tertiary" translate="no">
            {firm.name}
          </span>
        </span>
        <ChevronsUpDownIcon
          className="size-4 shrink-0 text-text-tertiary group-data-[collapsed=true]/sidebar:hidden"
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-64">
        {/* This block uses a plain div wrapper, NOT <DropdownMenuLabel>, which
            bakes in `text-caption-xs font-medium tracking-wider uppercase` via
            overlayLabelClassName (see packages/ui/src/lib/overlay.ts). That's
            the right primitive for section kickers like "PRACTICES" or "Map
            column to…" — short labels that head a group of items. It is NOT
            right for the user identity block, where it would force name +
            email + "Owner at …" to inherit text-transform: uppercase (emails
            especially should never render uppercase). The plain div lets the
            inner spans pick up their own type tokens without inherited
            transform. */}
        <DropdownMenuGroup>
          <div className="flex flex-col gap-0.5 px-3 pt-1.5 pb-2 text-left">
            <span className="truncate text-sm font-medium text-text-primary">{displayName}</span>
            <span className="truncate text-xs text-text-tertiary">{user.email}</span>
            <span className="mt-1 truncate text-xs text-text-tertiary">{roleAtFirm}</span>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Firm switcher — only when the user belongs to more than one
            practice (the chevron on the trigger already promised this).
            Sits above preferences: "which workspace am I in" outranks
            language/theme. */}
        {firms.length > 1 ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <Trans>Practices</Trans>
              </DropdownMenuLabel>
              <FirmSwitcherItems
                firms={firms}
                currentFirmId={firm.id}
                switching={switchFirmMutation.isPending}
                onSwitch={(firmId) => switchFirmMutation.mutate({ firmId })}
              />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <GlobeIcon />
            <span>
              <Trans>Language</Trans>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <LocaleMenuItems currentLocale={locale} onSelect={switchLocale} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <MonitorIcon />
            <span>
              <Trans>Theme</Trans>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <ThemeMenuItems currentTheme={themePreference} onSelect={switchThemePreference} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {showDemoSwitcher ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UsersIcon />
              <span>
                <Trans>Demo account</Trans>
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              <DemoAccountMenuItems
                accounts={demoAccounts}
                currentUserId={user.id}
                currentPath={currentPath}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        <DropdownMenuItem onClick={() => void navigate('/settings/profile')}>
          <ShieldCheckIcon />
          <span>
            <Trans>Security</Trans>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut} disabled={isSigningOut}>
          <LogOutIcon />
          <span>{signOutLabel}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FirmSwitcherItems({
  firms,
  currentFirmId,
  switching,
  onSwitch,
}: {
  firms: FirmPublic[]
  currentFirmId: string
  switching: boolean
  onSwitch: (firmId: string) => void
}) {
  const { i18n, t } = useLingui()
  return (
    <>
      {firms.map((f) => {
        const isCurrent = f.id === currentFirmId
        return (
          <DropdownMenuItem
            key={f.id}
            aria-checked={isCurrent}
            // Switching to the firm you're already in is a no-op; switching
            // is also blocked while another switch is in flight.
            disabled={isCurrent || switching}
            onClick={() => {
              if (isCurrent || switching) return
              onSwitch(f.id)
            }}
            className="flex items-center justify-between gap-2.5"
            aria-label={isCurrent ? t`${f.name} (current)` : t`Switch to ${f.name}`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <AssigneeAvatar
                name={f.name}
                title={f.name}
                type="firm"
                shape="square"
                size="sm"
                className="shrink-0"
              />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium text-text-primary" translate="no">
                  {f.name}
                </span>
                <span className="truncate text-xs text-text-tertiary">
                  {roleLabel(f.role, i18n)}
                </span>
              </span>
            </span>
            {isCurrent ? (
              <CheckIcon className="size-4 shrink-0 text-text-accent" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        )
      })}
    </>
  )
}

function DemoAccountMenuItems({
  accounts,
  currentUserId,
  currentPath,
}: {
  accounts: DemoAccount[]
  currentUserId: string
  currentPath: string
}) {
  const { i18n, t } = useLingui()

  return (
    <>
      {accounts.map((account) => {
        const selected = account.userId === currentUserId
        return (
          <DropdownMenuItem
            key={account.userId}
            aria-checked={selected}
            className="flex items-center justify-between gap-3"
            render={
              <a
                href={demoAccountSwitchHref(account, currentPath)}
                aria-label={t`Switch demo account to ${account.name}`}
              />
            }
          >
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-text-primary">{account.name}</span>
              <span className="truncate text-xs text-text-tertiary">
                {demoPlanLabel(account.plan, i18n)} · {demoRoleLabel(account.role, i18n)} ·{' '}
                {account.email}
              </span>
            </span>
            {selected ? (
              <CheckIcon className="size-4 shrink-0 text-text-accent" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        )
      })}
    </>
  )
}

function UserAvatar({ user }: { user: AuthUser }) {
  // The image-vs-initials fallback routes through AssigneeAvatar
  // (type='human', size='sm' = 28px). `isMine` paints the canonical
  // accent-tint bg. The primitive owns the <img>-on-load-error →
  // initials fallback path.
  return (
    <AssigneeAvatar
      name={user.name || user.email}
      title={user.name || user.email}
      size="sm"
      type="human"
      image={user.image ?? null}
      isMine
    />
  )
}

function LocaleMenuItems({
  currentLocale,
  onSelect,
}: {
  currentLocale: Locale
  onSelect: (next: Locale) => void
}) {
  return (
    <>
      {SUPPORTED_LOCALES.map((code) => (
        <DropdownMenuItem
          key={code}
          onClick={() => onSelect(code)}
          aria-checked={currentLocale === code}
          className="flex items-center justify-between"
        >
          <span>{LOCALE_LABELS[code]}</span>
          {currentLocale === code ? <CheckIcon className="size-4" aria-hidden /> : null}
        </DropdownMenuItem>
      ))}
    </>
  )
}

function ThemeMenuItems({
  currentTheme,
  onSelect,
}: {
  currentTheme: ThemePreference
  onSelect: (next: ThemePreference) => void
}) {
  const { t } = useLingui()
  const items: Array<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
    { value: 'system', label: t`System`, icon: MonitorIcon },
    { value: 'light', label: t`Light`, icon: SunIcon },
    { value: 'dark', label: t`Dark`, icon: MoonIcon },
  ]

  return (
    <DropdownMenuRadioGroup
      value={currentTheme}
      onValueChange={(next) => {
        if (isThemePreference(next)) onSelect(next)
      }}
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <DropdownMenuRadioItem key={item.value} value={item.value}>
            <Icon />
            <span>{item.label}</span>
          </DropdownMenuRadioItem>
        )
      })}
    </DropdownMenuRadioGroup>
  )
}

export { UserMenuTrigger }
