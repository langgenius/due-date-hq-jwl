import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import {
  BellIcon,
  CalendarClockIcon,
  CheckIcon,
  CreditCardIcon,
  InfoIcon,
  ReceiptTextIcon,
  ShieldIcon,
  UsersIcon,
  type LucideIcon,
  XIcon,
} from 'lucide-react'

import {
  hasFirmPermission,
  isFirmRole,
  type FirmPermission,
  type FirmRole,
} from '@duedatehq/core/permissions'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'

import { PageHeader } from '@/components/patterns/page-header'
import { roleLabel, useFirmPermission } from '@/features/permissions/permission-gate'
import { SettingsShell } from '@/features/settings/settings-sub-nav'
import { orpc } from '@/lib/rpc'

// The role whose column is shown in the matrix. Owner is fixed (it has
// every permission) and is shown for reference; the other roles are the
// "managed" roles an admin would inspect.
const SELECTABLE_ROLES: readonly FirmRole[] = [
  'owner',
  'partner',
  'manager',
  'preparer',
  'coordinator',
]

// Matrix actions (columns). The backend permission model is coarser than
// a full CRUD grid, so each (scope, action) cell maps onto the single
// FirmPermission that actually governs it — or to `null` when the
// product has no distinct permission for that action (rendered as an
// inert "—" cell rather than a fabricated toggle).
//
// `'all'` marks reads that every active member has (clients, deadlines,
// rules, alerts): they're enforced by tenant membership, not by a
// FirmPermission. Mapping those cells to the nearest *write* permission
// used to render coordinators as unable to view surfaces they can open.
type MatrixAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
type MatrixCell = FirmPermission | 'all' | null

const ACTION_LABELS: Record<MatrixAction, MessageDescriptor> = {
  view: msg`View`,
  create: msg`Create`,
  edit: msg`Edit`,
  delete: msg`Delete`,
  approve: msg`Approve`,
  export: msg`Export`,
}

interface MatrixScope {
  key: string
  label: MessageDescriptor
  description: MessageDescriptor
  Icon: LucideIcon
  // permission governing each action, 'all' for membership-wide reads,
  // or null when not applicable
  cells: Record<MatrixAction, MatrixCell>
}

const SCOPES: readonly MatrixScope[] = [
  {
    key: 'clients',
    label: msg`Clients`,
    description: msg`Client records, contacts, engagement letters`,
    Icon: UsersIcon,
    cells: {
      view: 'all',
      create: 'client.write',
      edit: 'client.write',
      delete: 'client.write',
      approve: null,
      export: 'audit.export',
    },
  },
  {
    key: 'deadlines',
    label: msg`Deadlines`,
    description: msg`Obligation status, filings, internal due dates`,
    Icon: CalendarClockIcon,
    cells: {
      view: 'all',
      create: 'obligation.status.update',
      edit: 'obligation.status.update',
      delete: 'obligation.status.update',
      approve: 'obligation.status.update',
      export: 'audit.export',
    },
  },
  {
    key: 'rules',
    label: msg`Rules`,
    description: msg`Jurisdiction rules, migrations, priority weighting`,
    Icon: ShieldIcon,
    cells: {
      view: 'all',
      create: 'migration.run',
      edit: 'firm.priority.update',
      delete: 'migration.revert',
      approve: null,
      export: null,
    },
  },
  {
    key: 'alerts',
    label: msg`Alerts`,
    description: msg`Pulse alerts, reminders, calendar sync`,
    Icon: BellIcon,
    cells: {
      view: 'all',
      create: 'pulse.apply',
      edit: 'firm.calendar.manage',
      delete: 'pulse.revert',
      approve: 'pulse.apply',
      export: null,
    },
  },
  {
    key: 'billing',
    label: msg`Billing`,
    description: msg`Plan, seats, invoices, payment portal`,
    Icon: CreditCardIcon,
    cells: {
      view: 'billing.read',
      create: null,
      edit: 'billing.update',
      delete: null,
      approve: null,
      export: 'audit.export',
    },
  },
  {
    key: 'members',
    label: msg`Members`,
    description: msg`Invite teammates, change roles, suspend access`,
    Icon: UsersIcon,
    cells: {
      view: 'member.manage',
      create: 'member.manage',
      edit: 'member.manage',
      delete: 'member.manage',
      approve: null,
      export: null,
    },
  },
  {
    key: 'audit',
    label: msg`Audit log`,
    description: msg`Workspace event history and exports`,
    Icon: ReceiptTextIcon,
    cells: {
      view: 'audit.read',
      create: null,
      edit: null,
      delete: null,
      approve: null,
      export: 'audit.export',
    },
  },
]

const ACTIONS: readonly MatrixAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'export']

export function SettingsPermissionsRoute() {
  const { t, i18n } = useLingui()
  const { firm } = useFirmPermission()
  const [selectedRole, setSelectedRole] = useState<FirmRole>('preparer')

  const membersQuery = useQuery(orpc.members.listCurrent.queryOptions({ input: undefined }))

  const memberCounts = useMemo(() => {
    const counts: Partial<Record<FirmRole, number>> = {}
    for (const member of membersQuery.data?.members ?? []) {
      if (member.status !== 'active') continue
      counts[member.role] = (counts[member.role] ?? 0) + 1
    }
    return counts
  }, [membersQuery.data])

  const selectedRoleMembers = memberCounts[selectedRole] ?? 0
  const isOwner = selectedRole === 'owner'

  function can(cell: MatrixCell): 'yes' | 'no' | 'na' {
    if (cell === null) return 'na'
    if (cell === 'all') return 'yes'
    return hasFirmPermission({
      role: selectedRole,
      permission: cell,
      coordinatorCanSeeDollars: firm?.coordinatorCanSeeDollars,
    })
      ? 'yes'
      : 'no'
  }

  return (
    <SettingsShell>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Permissions` }]}
          title={<Trans>Permissions</Trans>}
          description={
            <Trans>
              Review what each role can do across the workspace. Owner permissions are fixed and
              shown for reference.
            </Trans>
          }
          actions={
            <Select
              value={selectedRole}
              onValueChange={(value) => {
                if (isFirmRole(value)) setSelectedRole(value)
              }}
            >
              <SelectTrigger className="min-w-[220px]" aria-label={t`Role`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SELECTABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabel(role, i18n)}
                    {' · '}
                    {(memberCounts[role] ?? 0) === 1 ? (
                      <Trans>1 member</Trans>
                    ) : (
                      <Trans>{memberCounts[role] ?? 0} members</Trans>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Reference notice. The backend has no per-role override store —
            FIRM_PERMISSION_ROLES is the single source of truth — so this
            surface is read-only. The owner-fixed note matches the design's
            banner intent without claiming editable overrides exist. */}
        <div className="flex items-start gap-3 rounded-xl border border-divider-regular bg-background-section px-4 py-3">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text-primary">
              {isOwner ? (
                <Trans>Owner has every permission</Trans>
              ) : (
                <Trans>{roleLabel(selectedRole, i18n)} permissions are set by the product</Trans>
              )}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {/* TODO(data): no firms.permissions.overrides RPC yet — per-role
                  overrides aren't persisted, so this matrix reflects the
                  built-in role model only. Wire to an override store + a save
                  mutation when the contract lands. */}
              <Trans>
                Roles map to a fixed permission model. Changes here would need a per-role override
                store, which isn't available yet — this view is read-only.
              </Trans>
            </p>
          </div>
        </div>

        {/* Matrix */}
        <div className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Header */}
              <div className="flex items-center bg-background-section px-5 py-4">
                <div className="w-[260px] shrink-0 pr-3">
                  <span className="text-caption font-semibold uppercase tracking-eyebrow text-text-tertiary">
                    <Trans>Scope</Trans>
                  </span>
                </div>
                {ACTIONS.map((action) => (
                  <div key={action} className="flex flex-1 justify-center">
                    <span className="text-caption font-semibold uppercase tracking-eyebrow text-text-tertiary">
                      {i18n._(ACTION_LABELS[action])}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rows */}
              {SCOPES.map((scope) => (
                <div
                  key={scope.key}
                  className="flex items-center border-t border-divider-subtle px-5"
                >
                  <div className="flex w-[260px] shrink-0 items-center gap-3 py-4 pr-3">
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-lg bg-background-section text-text-secondary"
                    >
                      <scope.Icon className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-text-primary">
                        {i18n._(scope.label)}
                      </span>
                      <span className="truncate text-caption text-text-tertiary">
                        {i18n._(scope.description)}
                      </span>
                    </span>
                  </div>
                  {ACTIONS.map((action) => (
                    <div key={action} className="flex flex-1 justify-center py-4">
                      <PermissionPill
                        state={can(scope.cells[action])}
                        actionLabel={i18n._(ACTION_LABELS[action])}
                        scopeLabel={i18n._(scope.label)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs text-text-tertiary">
            <InfoIcon className="size-3.5 shrink-0" aria-hidden />
            {selectedRoleMembers === 1 ? (
              <Trans>{roleLabel(selectedRole, i18n)} applies to 1 active member.</Trans>
            ) : (
              <Trans>
                {roleLabel(selectedRole, i18n)} applies to {selectedRoleMembers} active members.
              </Trans>
            )}
          </p>
          <div className="flex items-center gap-2">
            {/* TODO(data): editing is gated on a per-role override RPC that
                doesn't exist. Disabled until the contract lands so we don't
                ship a no-op save. */}
            <Button variant="outline" size="sm" disabled>
              <Trans>Discard</Trans>
            </Button>
            <Button size="sm" disabled>
              <CheckIcon data-icon="inline-start" />
              <Trans>Save permissions</Trans>
            </Button>
          </div>
        </div>
      </div>
    </SettingsShell>
  )
}

function PermissionPill({
  state,
  actionLabel,
  scopeLabel,
}: {
  state: 'yes' | 'no' | 'na'
  actionLabel: string
  scopeLabel: string
}) {
  const { t } = useLingui()
  if (state === 'na') {
    return (
      <span
        className="grid h-6 w-10 place-items-center rounded-lg text-text-disabled"
        aria-label={t`${actionLabel} on ${scopeLabel}: not applicable`}
      >
        <span aria-hidden className="text-xs">
          —
        </span>
      </span>
    )
  }
  if (state === 'yes') {
    return (
      <span
        className="grid h-6 w-10 place-items-center rounded-lg bg-state-success-hover text-text-success"
        aria-label={t`${actionLabel} on ${scopeLabel}: allowed`}
      >
        <CheckIcon className="size-3.5" aria-hidden />
      </span>
    )
  }
  return (
    <span
      className="grid h-6 w-10 place-items-center rounded-lg bg-background-section text-text-muted"
      aria-label={t`${actionLabel} on ${scopeLabel}: not allowed`}
    >
      <XIcon className="size-3.5" aria-hidden />
    </span>
  )
}
