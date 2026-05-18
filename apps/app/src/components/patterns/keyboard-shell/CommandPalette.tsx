import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlarmClockIcon,
  BellIcon,
  BotIcon,
  Building2Icon,
  CalendarDaysIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  CreditCardIcon,
  HourglassIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  MapIcon,
  RssIcon,
  ScaleIcon,
  SettingsIcon,
  SparklesIcon,
  UploadCloudIcon,
  UsersIcon,
} from 'lucide-react'
import type { FirmPermission } from '@duedatehq/core/permissions'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@duedatehq/ui/components/ui/command'
import { Badge } from '@duedatehq/ui/components/ui/badge'

import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { requiredRolesLabel, useFirmPermission } from '@/features/permissions/permission-gate'
import { COMMAND_PALETTE_HOTKEY, formatShortcutForDisplay } from './display'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CommandEntry = {
  id: string
  label: string
  description: string
  group: 'navigate' | 'actions' | 'ask'
  disabled?: boolean
  permission?: FirmPermission
  onSelect: () => void
  icon: typeof LayoutDashboardIcon
}

type CommandGroupId = CommandEntry['group']

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { i18n, t } = useLingui()
  const navigate = useNavigate()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const commandShortcut = formatShortcutForDisplay(COMMAND_PALETTE_HOTKEY)

  const entries = useMemo<CommandEntry[]>(
    () => [
      {
        id: 'dashboard',
        label: t`Dashboard`,
        description: t`Review risk and operating pressure.`,
        group: 'navigate',
        icon: LayoutDashboardIcon,
        onSelect: () => navigate('/'),
      },
      {
        id: 'obligations',
        label: t`Obligations`,
        description: t`Open Obligations.`,
        group: 'navigate',
        icon: CalendarClockIcon,
        onSelect: () => navigate('/obligations'),
      },
      {
        id: 'notifications',
        label: t`Notifications`,
        description: t`Open your personal notification inbox.`,
        group: 'navigate',
        icon: BellIcon,
        onSelect: () => navigate('/notifications'),
      },
      {
        id: 'reminders',
        label: t`Reminders`,
        description: t`Manage deadline reminder templates and delivery status.`,
        group: 'navigate',
        icon: AlarmClockIcon,
        onSelect: () => navigate('/reminders'),
      },
      {
        id: 'workload',
        label: t`Team workload`,
        description: t`Review team capacity and risk pressure.`,
        group: 'navigate',
        icon: ClipboardListIcon,
        onSelect: () => navigate('/workload'),
      },
      {
        id: 'clients',
        label: t`Clients`,
        description: t`Manage client facts and readiness.`,
        group: 'navigate',
        icon: UsersIcon,
        onSelect: () => navigate('/clients'),
      },
      {
        id: 'opportunities',
        label: t`Opportunities`,
        description: t`Review lightweight client business cues.`,
        group: 'navigate',
        icon: SparklesIcon,
        onSelect: () => navigate('/opportunities'),
      },
      {
        id: 'firm',
        label: t`Practice profile`,
        description: t`Update the active practice's name and timezone.`,
        group: 'navigate',
        icon: Building2Icon,
        onSelect: () => navigate('/practice'),
      },
      {
        id: 'rules-coverage',
        label: t`Coverage`,
        description: t`Review per-jurisdiction rule coverage by entity.`,
        group: 'navigate',
        icon: MapIcon,
        onSelect: () => navigate('/rules/coverage'),
      },
      {
        id: 'rules-sources',
        label: t`Sources`,
        description: t`Inspect official sources and their watcher health.`,
        group: 'navigate',
        icon: RssIcon,
        onSelect: () => navigate('/rules/sources'),
      },
      {
        id: 'rules-library',
        label: t`Rule library`,
        description: t`Browse pending, active, rejected, and archived rules.`,
        group: 'navigate',
        icon: LibraryIcon,
        onSelect: () => navigate('/rules/library'),
      },
      {
        id: 'rules-pulse',
        label: t`Pulse changes`,
        description: t`Triage source-backed government changes affecting clients.`,
        group: 'navigate',
        icon: ActivityIcon,
        onSelect: () => navigate('/rules/pulse'),
      },
      {
        id: 'rules-temporary',
        label: t`Temporary rules`,
        description: t`Review applied Pulse exceptions changing due dates.`,
        group: 'navigate',
        icon: HourglassIcon,
        onSelect: () => navigate('/rules/temporary'),
      },
      // Obligation preview (/rules/preview) is intentionally not listed
      // in the Command Palette navigate group. See app-shell-nav.tsx for
      // the rationale — it's a sandbox, not a day-to-day surface. The
      // route stays accessible by direct URL.
      {
        id: 'members',
        label: t`Members`,
        description: t`Manage practice seats, roles, and invitations.`,
        group: 'navigate',
        icon: UsersIcon,
        permission: 'member.manage',
        onSelect: () => navigate('/members'),
      },
      {
        id: 'billing',
        label: t`Billing`,
        description: t`Review the active plan and billing controls.`,
        group: 'navigate',
        icon: CreditCardIcon,
        permission: 'billing.read',
        onSelect: () => navigate('/billing'),
      },
      {
        id: 'audit',
        label: t`Audit log`,
        description: t`Review practice-wide audit events.`,
        group: 'navigate',
        icon: ScaleIcon,
        permission: 'audit.read',
        onSelect: () => navigate('/audit'),
      },
      {
        id: 'settings',
        label: t`Settings`,
        description: t`Workspace configuration hub — Practice, team, billing, automation.`,
        group: 'navigate',
        icon: SettingsIcon,
        onSelect: () => navigate('/settings'),
      },
      {
        id: 'calendar-sync',
        label: t`Calendar sync`,
        description: t`Manage external deadline calendar feeds.`,
        group: 'actions',
        icon: CalendarDaysIcon,
        onSelect: () => navigate('/obligations/calendar'),
      },
      {
        id: 'migration',
        label: t`Import clients`,
        description: t`Open the Migration Copilot wizard.`,
        group: 'actions',
        icon: UploadCloudIcon,
        permission: 'migration.run',
        onSelect: openWizard,
      },
      {
        id: 'ask',
        label: t`Ask DueDateHQ`,
        description: t`Coming soon`,
        group: 'ask',
        icon: BotIcon,
        disabled: true,
        onSelect: () => undefined,
      },
    ],
    [navigate, openWizard, t],
  )

  const groups = useMemo(
    () =>
      [
        { id: 'navigate', heading: t`Navigate` },
        { id: 'actions', heading: t`Actions` },
        { id: 'ask', heading: t`Ask` },
      ] satisfies Array<{ id: CommandGroupId; heading: string }>,
    [t],
  )

  function selectEntry(entry: CommandEntry) {
    if (entry.disabled || (entry.permission && !permission.can(entry.permission))) return
    entry.onSelect()
    onOpenChange(false)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t`Command palette`}
      description={t`Search, ask, or navigate.`}
    >
      <Command loop disablePointerSelection>
        <CommandInput autoFocus placeholder={t`Search, ask, or navigate...`} />
        <CommandList>
          <CommandEmpty>
            <Trans>No commands found.</Trans>
          </CommandEmpty>
          {groups.map((group, index) => {
            const groupEntries = entries.filter((entry) => entry.group === group.id)
            if (groupEntries.length === 0) return null
            return (
              <CommandGroup key={group.id} heading={group.heading}>
                {groupEntries.map((entry) => {
                  const Icon = entry.icon
                  const locked = Boolean(entry.permission && !permission.can(entry.permission))
                  return (
                    <CommandItem
                      key={entry.id}
                      value={`${entry.label} ${entry.description} ${group.heading}`}
                      onSelect={() => selectEntry(entry)}
                      {...(entry.disabled || locked ? { disabled: true } : {})}
                    >
                      <span className="grid size-8 place-items-center rounded-md bg-background-subtle text-text-secondary group-data-[selected=true]/command-item:text-text-primary">
                        <Icon aria-hidden />
                      </span>
                      <span className="grid gap-0.5">
                        <span className="text-sm font-medium text-text-primary">{entry.label}</span>
                        <span className="text-xs text-text-tertiary">{entry.description}</span>
                      </span>
                      {entry.disabled ? (
                        <Badge variant="outline">
                          <Trans>Coming soon</Trans>
                        </Badge>
                      ) : locked && entry.permission ? (
                        <Badge variant="outline">
                          {requiredRolesLabel(entry.permission, i18n)}
                        </Badge>
                      ) : (
                        <CommandShortcut>{group.heading}</CommandShortcut>
                      )}
                    </CommandItem>
                  )
                })}
                {index < groups.length - 1 ? <CommandSeparator /> : null}
              </CommandGroup>
            )
          })}
        </CommandList>
        <div className="flex items-center justify-between border-t border-divider-subtle px-4 py-2 text-xs text-text-tertiary">
          <span>
            <Trans>Enter execute · Esc close · {commandShortcut} toggle</Trans>
          </span>
        </div>
      </Command>
    </CommandDialog>
  )
}
