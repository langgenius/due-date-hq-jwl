import { useCallback, useSyncExternalStore } from 'react'
import { useLoaderData, useMatches } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react/macro'
import { SMART_PRIORITY_DEFAULT_PROFILE, type FirmPublic } from '@duedatehq/contracts'

import type { ThemePreference } from '@duedatehq/ui/theme'

import { AppShell } from '@/components/patterns/app-shell'
import { KeyboardProvider } from '@/components/patterns/keyboard-shell'
import { EvidenceDrawerProvider } from '@/features/evidence/EvidenceDrawerProvider'
import { PracticeTimezoneProvider } from '@/features/firm/practice-timezone'
import { MigrationWizardProvider } from '@/features/migration/WizardProvider'
import { PulseDrawerProvider } from '@/features/pulse/DrawerProvider'
import type { AuthUser } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { getRouteSummaryMessages } from '@/routes/route-summary'
import {
  getServerThemePreference,
  getStoredThemePreference,
  subscribeToThemePreference,
  switchThemePreference as persistThemePreference,
} from '@/lib/theme-preference-store'

type ProtectedLoaderData = { user: AuthUser }

function useThemeSwitch(): {
  themePreference: ThemePreference
  switchThemePreference: (next: ThemePreference) => void
} {
  const themePreference = useSyncExternalStore(
    subscribeToThemePreference,
    getStoredThemePreference,
    getServerThemePreference,
  )

  const switchThemePreference = useCallback((next: ThemePreference) => {
    persistThemePreference(next)
  }, [])

  return { themePreference, switchThemePreference }
}

/**
 * `RootLayout` — protected route shell. Owns session + theme + migration
 * wizard state and hands them to the layout-level `<AppShell>` pattern.
 *
 * Performance contract:
 *  - rerender-derived-state-no-effect: `useLoaderData` is the single source
 *    of truth for `user`; we never copy it to React state.
 *  - rerender-functional-setstate: `useThemeSwitch` setters are stable.
 *  - bundle-analyzable-paths: AppShell is imported by exact path, not via a
 *    barrel module.
 */
export function RootLayout() {
  const { user } = useLoaderData<ProtectedLoaderData>()
  const { themePreference, switchThemePreference } = useThemeSwitch()

  return (
    <RootLayoutShell
      user={user}
      themePreference={themePreference}
      switchThemePreference={switchThemePreference}
    />
  )
}

function RootLayoutShell({
  user,
  themePreference,
  switchThemePreference,
}: {
  user: AuthUser
  themePreference: ThemePreference
  switchThemePreference: (next: ThemePreference) => void
}) {
  const { i18n } = useLingui()
  const matches = useMatches()
  const firmsQuery = useQuery(orpc.firms.listMine.queryOptions({ input: undefined }))
  const firm = pickCurrentFirm(firmsQuery.data, user)
  const routeMessages = getRouteSummaryMessages(matches)
  const route = {
    eyebrow: i18n._(routeMessages.eyebrow),
    title: i18n._(routeMessages.title),
  }

  return (
    <PracticeTimezoneProvider timezone={firm.timezone}>
      <MigrationWizardProvider>
        {/*
          KeyboardProvider must live inside MigrationWizardProvider — it reads
          the wizard `open` state to suppress global hotkeys while the wizard
          is open. AppShell sits inside KeyboardProvider so the command-palette
          / shortcut-help dialogs the keyboard shell mounts can portal over the
          whole shell.

          PulseDrawerProvider lives inside KeyboardProvider so the drawer's Sheet
          can portal cleanly over the whole layout. It exposes `usePulseDrawer`
          to the dashboard banner and Rules > Pulse Changes.
        */}
        <KeyboardProvider
          themePreference={themePreference}
          switchThemePreference={switchThemePreference}
        >
          <EvidenceDrawerProvider>
            <PulseDrawerProvider>
              <AppShell
                user={user}
                firm={firm}
                firms={firmsQuery.data ?? [firm]}
                route={route}
                themePreference={themePreference}
                switchThemePreference={switchThemePreference}
              />
            </PulseDrawerProvider>
          </EvidenceDrawerProvider>
        </KeyboardProvider>
      </MigrationWizardProvider>
    </PracticeTimezoneProvider>
  )
}

function pickCurrentFirm(firms: FirmPublic[] | undefined, user: AuthUser): FirmPublic {
  const current = firms?.find((item) => item.isCurrent) ?? firms?.[0]
  if (current) return current

  const fallbackName = user.name || 'DueDateHQ'
  return {
    id: 'pending',
    name: fallbackName,
    slug: 'pending',
    plan: 'solo',
    seatLimit: 1,
    timezone: 'America/New_York',
    internalDeadlineOffsetDays: 14,
    status: 'active',
    role: 'owner',
    ownerUserId: user.id,
    coordinatorCanSeeDollars: false,
    smartPriorityProfile: SMART_PRIORITY_DEFAULT_PROFILE,
    openObligationCount: 0,
    isCurrent: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    deletedAt: null,
  }
}

/**
 * Exported so the protected route can use it as `HydrateFallback` during the
 * initial session fetch. See `apps/app/src/router.tsx` —
 * `HydrateFallback: ShellSkeleton`.
 *
 * Renders only 1px hairline outlines — no fill, no animation. The previous
 * version used `Skeleton`, whose `state-base-hover-alt` background reads as
 * a blue flash on the white canvas. DESIGN.md is calm + hairline-first;
 * the top-of-shell `PendingBar` already carries the "system is working"
 * signal during the brief session fetch.
 */
export function ShellSkeleton() {
  return (
    <div
      aria-hidden
      className="flex min-h-screen items-center justify-center bg-background-body p-6"
    >
      <div className="flex w-full max-w-[480px] flex-col gap-3">
        <div className="h-6 w-40 rounded-md border border-divider-subtle" />
        <div className="h-4 w-64 rounded-md border border-divider-subtle" />
        <div className="h-40 w-full rounded-lg border border-divider-subtle" />
      </div>
    </div>
  )
}
