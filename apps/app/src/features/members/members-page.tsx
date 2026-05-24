import { useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, EllipsisIcon, PlusIcon, ShieldCheckIcon } from 'lucide-react'
import type {
  MemberInvitationPublic,
  MemberManagedRole,
  MemberPublic,
  MembersListOutput,
} from '@duedatehq/contracts'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { cn } from '@duedatehq/ui/lib/utils'

import { DestructiveChangePreview } from '@/components/patterns/destructive-change-preview'
import { PageHeader } from '@/components/patterns/page-header'
import { formatShortcutForDisplay } from '@/components/patterns/keyboard-shell/display'
import {
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell/hooks'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { PermissionGate, useFirmPermission } from '@/features/permissions/permission-gate'
import { RelativeTime } from '@/components/primitives/relative-time'
import { orpc } from '@/lib/rpc'
import {
  formatInvitationDate,
  invitationDescription,
  inviterName,
  isManagedRole,
  MANAGED_ROLES,
  roleLabel,
} from './member-model'

type MemberActionTarget = {
  id: string
  name: string
}

const INVITE_MEMBER_HOTKEY = 'Mod+I'
const INVITE_MEMBER_ARIA_SHORTCUTS = 'Meta+I Control+I'

export function MembersPageRoute() {
  const permission = useFirmPermission()
  const canManageMembers = permission.can('member.manage')
  const membersQuery = useQuery({
    ...orpc.members.listCurrent.queryOptions({ input: undefined }),
    enabled: canManageMembers,
  })

  if (permission.isLoading || !canManageMembers) {
    return (
      <PermissionGate
        permission="member.manage"
        firm={permission.firm}
        loading={permission.isLoading}
        description={
          <Trans>
            Members are managed by the practice owner. Contact the owner if you need to invite
            teammates or change roles.
          </Trans>
        }
        secondaryAction={{ label: <Trans>Open Obligations</Trans>, to: '/obligations' }}
      >
        <MembersSkeleton />
      </PermissionGate>
    )
  }

  if (membersQuery.isLoading) {
    return <MembersSkeleton />
  }

  if (membersQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-[1172px] flex-col gap-4 px-4 py-6 md:px-6">
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>
            <Trans>Members couldn't load</Trans>
          </AlertTitle>
          <AlertDescription>{membersQuery.error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!membersQuery.data) return null

  return (
    <MembersPage
      data={membersQuery.data}
      firmTimezone={resolveUSFirmTimezone(permission.firm?.timezone)}
    />
  )
}

function MembersPage({ data, firmTimezone }: { data: MembersListOutput; firmTimezone: string }) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<MemberActionTarget | null>(null)
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  const inviteShortcutLabel = formatShortcutForDisplay(INVITE_MEMBER_HOTKEY)
  const activeMembers = data.members.filter((member) => member.status === 'active')
  const suspendedMembers = data.members.filter((member) => member.status === 'suspended')
  const ownerCount = data.members.filter((member) => member.role === 'owner').length
  const managedCount = activeMembers.filter((member) => member.role !== 'owner').length
  const pendingCount = data.invitations.filter(
    (invitation) => invitation.status === 'pending',
  ).length
  const expiredCount = data.invitations.filter(
    (invitation) => invitation.status === 'expired',
  ).length
  const seatsFull = data.availableSeats <= 0
  const membersKey = orpc.members.key()

  const updateRoleMutation = useMutation(
    orpc.members.updateRole.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
      },
    }),
  )
  const suspendMutation = useMutation(
    orpc.members.suspend.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
      },
    }),
  )
  const reactivateMutation = useMutation(
    orpc.members.reactivate.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
      },
    }),
  )
  const removeMutation = useMutation(
    orpc.members.remove.mutationOptions({
      onSuccess: (next) => {
        setPendingRemoval(null)
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
      },
    }),
  )
  const resendMutation = useMutation(
    orpc.members.resendInvitation.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
      },
    }),
  )
  const cancelMutation = useMutation(
    orpc.members.cancelInvitation.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
      },
    }),
  )

  const mutationError =
    updateRoleMutation.error ??
    suspendMutation.error ??
    reactivateMutation.error ??
    removeMutation.error ??
    resendMutation.error ??
    cancelMutation.error

  useAppHotkey(INVITE_MEMBER_HOTKEY, () => setInviteOpen(true), {
    enabled: !shortcutsBlocked && !inviteOpen && pendingRemoval === null,
    ignoreInputs: true,
    requireReset: true,
    meta: {
      id: 'members.invite.open',
      name: 'Invite member',
      description: 'Open the member invite dialog.',
      category: 'practice',
      scope: 'route',
      displayKeys: inviteShortcutLabel,
    },
  })

  return (
    <div className="mx-auto flex w-full max-w-[1172px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Members` }]}
        title={<Trans>Members</Trans>}
        actions={
          <>
            <Button variant="outline" size="sm" render={<Link to="/audit" />}>
              <Trans>View audit log</Trans>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInviteOpen(true)}
              aria-describedby={seatsFull ? 'members-seat-limit-note' : undefined}
              aria-keyshortcuts={INVITE_MEMBER_ARIA_SHORTCUTS}
            >
              <PlusIcon className="size-3.5" aria-hidden />
              <Trans>Invite member</Trans>
              <span className="ml-1 font-mono text-[10px] opacity-70">{inviteShortcutLabel}</span>
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
        <div className="grid divide-y divide-divider-subtle md:grid-cols-4 md:divide-x md:divide-y-0">
          <SeatStat data={data} />
          <KpiStat
            label={t`Active members`}
            value={activeMembers.length}
            detail={t`${ownerCount} owner · ${managedCount} managed`}
          />
          <KpiStat
            label={t`Pending invites`}
            value={pendingCount}
            detail={t`${expiredCount} expired needs resend`}
          />
          <KpiStat
            label={t`Suspended`}
            value={suspendedMembers.length}
            detail={t`access revoked, history kept`}
          />
        </div>
      </section>

      {mutationError ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>
            <Trans>Member action failed</Trans>
          </AlertTitle>
          <AlertDescription>{mutationError.message}</AlertDescription>
        </Alert>
      ) : null}

      {seatsFull ? <SeatLimitBanner /> : null}

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={t`Active members`}
          count={data.members.length}
          note={t`owner read-only · self read-only`}
          action={t`Click more to change role, suspend, or remove`}
        />
        <ActiveMembersTable
          members={data.members}
          firmTimezone={firmTimezone}
          onRoleChange={(memberId, role) => updateRoleMutation.mutate({ memberId, role })}
          onSuspend={(member) => suspendMutation.mutate({ memberId: member.id })}
          onReactivate={(member) => reactivateMutation.mutate({ memberId: member.id })}
          onRemove={setPendingRemoval}
          busy={
            updateRoleMutation.isPending ||
            suspendMutation.isPending ||
            reactivateMutation.isPending ||
            removeMutation.isPending
          }
        />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={t`Pending invitations`}
          count={data.invitations.length}
          note={t`${pendingCount} pending · ${expiredCount} expired · magic link, 7-day expiry`}
        />
        <PendingInvitationsTable
          invitations={data.invitations}
          members={data.members}
          firmTimezone={firmTimezone}
          onResend={(invitation) => resendMutation.mutate({ invitationId: invitation.id })}
          onCancel={(invitation) => cancelMutation.mutate({ invitationId: invitation.id })}
          busy={resendMutation.isPending || cancelMutation.isPending}
        />
      </section>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        seatsFull={seatsFull}
        membersKey={membersKey}
      />

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Remove member?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval
                ? t`${pendingRemoval.name} will lose access to this practice. Audit history stays retained.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRemoval ? (
            <DestructiveChangePreview
              title={<Trans>Removing this member will commit these changes</Trans>}
              lines={[
                {
                  tone: 'remove',
                  label: <Trans>Removes</Trans>,
                  detail: t`Practice access for ${pendingRemoval.name}`,
                },
                {
                  tone: 'add',
                  label: <Trans>Adds</Trans>,
                  detail: <Trans>No replacement assignments or records</Trans>,
                },
                {
                  tone: 'keep',
                  label: <Trans>Keeps</Trans>,
                  detail: <Trans>Audit history and existing client work</Trans>,
                },
              ]}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={removeMutation.isPending || !pendingRemoval}
              onClick={() => {
                if (pendingRemoval) removeMutation.mutate({ memberId: pendingRemoval.id })
              }}
            >
              <Trans>Remove from practice (1)</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SeatStat({ data }: { data: MembersListOutput }) {
  const usedRatio = data.seatLimit > 0 ? Math.min(data.usedSeats / data.seatLimit, 1) : 0
  return (
    <div className="flex min-h-24 flex-col px-5 py-4">
      <p className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">
        <Trans>Seats used</Trans>
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl leading-[30px] font-bold text-text-primary tabular-nums">
          {data.usedSeats}
        </span>
        <span className="text-sm font-medium text-text-muted">/ {data.seatLimit}</span>
      </div>
      <p className="mt-auto text-xs leading-[18px] text-text-muted">
        <Trans>{data.availableSeats} available seats</Trans>
      </p>
      <div className="mt-2 h-0.5 rounded-full bg-divider-subtle">
        <div
          className="h-full rounded-full bg-state-accent-solid"
          style={{ width: `${Math.round(usedRatio * 100)}%` }}
        />
      </div>
    </div>
  )
}

function KpiStat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="flex min-h-24 flex-col px-5 py-4">
      <p className="text-xs font-medium tracking-[0.08em] text-text-tertiary uppercase">{label}</p>
      <span className="mt-1 text-2xl leading-[30px] font-bold text-text-primary tabular-nums">
        {value}
      </span>
      <p className="mt-auto text-xs leading-[18px] text-text-muted">{detail}</p>
    </div>
  )
}

function SeatLimitBanner() {
  return (
    <section className="flex min-h-14 items-center gap-3 rounded-md border border-state-warning-border bg-state-warning-hover px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center text-text-warning">
        <AlertTriangleIcon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-text-primary">
          <Trans>Seat limit reached.</Trans>
        </p>
        <p className="text-base text-text-secondary">
          <Trans>
            All seats are in use. Upgrade to invite more, or suspend an active member to free a
            seat.
          </Trans>
        </p>
      </div>
      <Button variant="outline" render={<Link to="/billing" />}>
        <Trans>Upgrade plan</Trans>
      </Button>
    </section>
  )
}

function SectionHeader({
  title,
  count,
  note,
  action,
}: {
  title: string
  count: number
  note: string
  action?: string
}) {
  return (
    <div className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
      <h2 className="font-medium tracking-[0.08em] uppercase">{title}</h2>
      <span className="inline-flex h-[18px] min-w-[19px] items-center justify-center rounded-sm border border-divider-subtle bg-background-subtle px-1.5 font-medium tabular-nums">
        {count}
      </span>
      <span>{note}</span>
      {action ? <span className="ml-auto hidden md:inline">{action}</span> : null}
    </div>
  )
}

function ActiveMembersTable({
  members,
  firmTimezone,
  onRoleChange,
  onSuspend,
  onReactivate,
  onRemove,
  busy,
}: {
  members: MemberPublic[]
  firmTimezone: string
  onRoleChange: (memberId: string, role: MemberManagedRole) => void
  onSuspend: (member: MemberPublic) => void
  onReactivate: (member: MemberPublic) => void
  onRemove: (member: MemberActionTarget) => void
  busy: boolean
}) {
  return (
    <div className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
      <Table>
        <TableHeader>
          <TableRow className="h-9 hover:bg-transparent">
            <TableHead className="w-[304px] px-4">Name</TableHead>
            <TableHead className="w-[280px]">Email</TableHead>
            <TableHead className="w-44">Role</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-44">Joined</TableHead>
            {/* 2026-05-24 (critique /polish): "Last active" column
                used to render "Not recorded" on every row because
                the server isn't tracking last-active yet. A column
                of "Not recorded" eats horizontal real estate to
                tell the user nothing. Hide it until real data lands;
                restore the <TableHead className="w-28">Last active
                </TableHead> + matching cell when the backend grows
                a `lastActiveAt` field. */}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
          {members.map((member) => {
            const mutable = member.role !== 'owner' && !member.isCurrentUser
            return (
              <TableRow key={member.id} className="h-9">
                <TableCell className="px-4 py-1.5">
                  <MemberIdentity member={member} />
                </TableCell>
                <TableCell className="py-1.5 font-mono text-xs text-text-secondary">
                  {member.email}
                </TableCell>
                <TableCell className="py-1.5">
                  <RoleControl
                    role={member.role}
                    disabled={!mutable || busy}
                    onChange={(role) => onRoleChange(member.id, role)}
                  />
                </TableCell>
                <TableCell className="py-1.5">
                  <MemberStatusPill status={member.status} />
                </TableCell>
                {/* 2026-05-24 (critique P2 — clarify): JOINED used
                    to read `2026-05-01 01:10:00 PDT` — engineering-
                    precise but unparseable at a glance. Use relative
                    time ("3 weeks ago"); exact value lives on the
                    tooltip via <RelativeTime>. Drop font-mono — this
                    column reads as recency, not as data. */}
                <TableCell className="py-1.5 text-xs whitespace-nowrap text-text-muted">
                  <RelativeTime value={member.createdAt} timeZone={firmTimezone} />
                </TableCell>
                <TableCell className="py-1.5 pr-2">
                  <MemberActionsMenu
                    member={member}
                    disabled={!mutable || busy}
                    onSuspend={onSuspend}
                    onReactivate={onReactivate}
                    onRemove={onRemove}
                    onRoleChange={onRoleChange}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function PendingInvitationsTable({
  invitations,
  members,
  firmTimezone,
  onResend,
  onCancel,
  busy,
}: {
  invitations: MemberInvitationPublic[]
  members: MemberPublic[]
  firmTimezone: string
  onResend: (invitation: MemberInvitationPublic) => void
  onCancel: (invitation: MemberInvitationPublic) => void
  busy: boolean
}) {
  return (
    <div className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
      <Table>
        <TableHeader>
          <TableRow className="h-9 hover:bg-transparent">
            <TableHead className="w-[444px] px-4">Email</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-44">Role</TableHead>
            <TableHead className="w-32">Invited by</TableHead>
            <TableHead className="w-44">Sent · Expires</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
          {invitations.map((invitation) => (
            <TableRow key={invitation.id} className="h-14">
              <TableCell className="px-4 py-2">
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-medium text-text-primary">
                    {invitation.email}
                  </span>
                  <span className="text-xs text-text-muted">
                    {invitationDescription(invitation)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-2">
                <InvitationStatusPill status={invitation.status} />
              </TableCell>
              <TableCell className="py-2">
                <RoleDisplay role={invitation.role} />
              </TableCell>
              <TableCell className="py-2 text-xs text-text-secondary">
                {inviterName(members, invitation.inviterId)}
              </TableCell>
              <TableCell className="py-2 font-mono text-xs leading-4">
                <span className="block text-text-secondary">
                  <Trans>Sent {formatInvitationDate(invitation.createdAt, firmTimezone)}</Trans>
                </span>
                <span
                  className={cn(
                    'block',
                    invitation.status === 'expired' ? 'text-text-warning' : 'text-text-muted',
                  )}
                >
                  {invitation.status === 'expired' ? (
                    <Trans>
                      Expired {formatInvitationDate(invitation.expiresAt, firmTimezone)}
                    </Trans>
                  ) : (
                    <Trans>
                      Expires {formatInvitationDate(invitation.expiresAt, firmTimezone)}
                    </Trans>
                  )}
                </span>
              </TableCell>
              <TableCell className="py-2">
                <div className="flex flex-col items-start gap-0.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onResend(invitation)}
                    className="text-xs font-medium text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:text-text-disabled"
                  >
                    <Trans>Resend</Trans>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onCancel(invitation)}
                    className="text-xs font-medium text-text-secondary outline-none hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:text-text-disabled"
                  >
                    <Trans>Cancel</Trans>
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MemberIdentity({ member }: { member: MemberPublic }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {/* 2026-05-24 (critique P2 — audit): the member's full name
          renders in the sibling block, so the avatar is decorative
          for screen readers — `aria-hidden` on the wrapper makes
          that explicit and stops the single-letter initial from
          being announced as a separate sentence ("S, Sarah
          Martinez"). Empty alt on the image variant stays correct
          for the same reason. */}
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-background-subtle font-semibold text-text-secondary"
      >
        {member.image ? (
          <img src={member.image} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-xs">{member.name.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      <span
        className={cn(
          'truncate text-xs font-medium',
          member.status === 'suspended' ? 'text-text-muted' : 'text-text-primary',
        )}
      >
        {member.name}
      </span>
      {member.isCurrentUser ? (
        <Badge variant="secondary" className="h-4 rounded-sm px-1.5 font-mono text-[10px]">
          <Trans>You</Trans>
        </Badge>
      ) : null}
    </div>
  )
}

function RoleControl({
  role,
  disabled,
  onChange,
}: {
  role: MemberPublic['role']
  disabled: boolean
  onChange: (role: MemberManagedRole) => void
}) {
  if (role === 'owner') return <RoleDisplay role={role} />
  return (
    <Select
      value={role}
      disabled={disabled}
      onValueChange={(value) => {
        if (isManagedRole(value) && value !== role) onChange(value)
      }}
    >
      <SelectTrigger size="sm" className="h-6 w-[140px] rounded-sm bg-transparent px-2 text-xs">
        <SelectValue>{roleLabel(role)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          {MANAGED_ROLES.map((item) => (
            <SelectItem key={item} value={item}>
              {roleLabel(item)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function RoleDisplay({ role }: { role: MemberPublic['role'] | MemberManagedRole }) {
  return (
    <span className="inline-flex h-6 w-[140px] items-center rounded-sm px-2 text-xs font-medium text-text-primary">
      {roleLabel(role)}
    </span>
  )
}

function MemberStatusPill({ status }: { status: MemberPublic['status'] }) {
  const suspended = status === 'suspended'
  return (
    <Badge
      variant={suspended ? 'secondary' : 'outline'}
      className="h-5 rounded-sm px-2 text-xs text-text-secondary"
    >
      <BadgeStatusDot tone={suspended ? 'disabled' : 'warning'} className="size-1.5" />
      {suspended ? <Trans>Suspended</Trans> : <Trans>Active</Trans>}
    </Badge>
  )
}

function InvitationStatusPill({ status }: { status: MemberInvitationPublic['status'] }) {
  const expired = status === 'expired'
  return (
    <Badge variant={expired ? 'warning' : 'success'} className="h-5 rounded-sm px-2 text-xs">
      <BadgeStatusDot tone={expired ? 'warning' : 'success'} className="size-1.5" />
      {expired ? <Trans>Expired</Trans> : <Trans>Pending</Trans>}
    </Badge>
  )
}

function MemberActionsMenu({
  member,
  disabled,
  onSuspend,
  onReactivate,
  onRemove,
  onRoleChange,
}: {
  member: MemberPublic
  disabled: boolean
  onSuspend: (member: MemberPublic) => void
  onReactivate: (member: MemberPublic) => void
  onRemove: (member: MemberActionTarget) => void
  onRoleChange: (memberId: string, role: MemberManagedRole) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="inline-flex size-7 items-center justify-center rounded-md text-text-muted outline-none hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:text-text-disabled"
      >
        <EllipsisIcon className="size-4" aria-hidden />
        <span className="sr-only">
          <Trans>Open member actions</Trans>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Trans>Change role</Trans>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-[180px]">
            {MANAGED_ROLES.map((role) => (
              <DropdownMenuItem key={role} onClick={() => onRoleChange(member.id, role)}>
                {roleLabel(role)}
                {member.role === role ? (
                  <ShieldCheckIcon className="ml-auto size-3.5 text-text-accent" aria-hidden />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {member.status === 'suspended' ? (
          <DropdownMenuItem onClick={() => onReactivate(member)}>
            <Trans>Reactivate access</Trans>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onSuspend(member)}>
            <Trans>Suspend access</Trans>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onRemove({ id: member.id, name: member.name })}
        >
          <Trans>Remove from practice</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function InviteMemberDialog({
  open,
  onOpenChange,
  seatsFull,
  membersKey,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  seatsFull: boolean
  membersKey: readonly unknown[]
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberManagedRole>('manager')
  const inviteMutation = useMutation(
    orpc.members.invite.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
        void queryClient.invalidateQueries({ queryKey: membersKey })
        setEmail('')
        setRole('manager')
        onOpenChange(false)
      },
    }),
  )

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    inviteMutation.mutate({ email, role })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] rounded-md p-5" showCloseButton={false}>
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base">
            <Trans>Invite member</Trans>
          </DialogTitle>
          <DialogDescription className="text-xs">
            <Trans>Send a 7-day magic link to add a member to this practice.</Trans>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">
              <Trans>Work email</Trans>
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t`member@example.com`}
              autoComplete="email"
              disabled={seatsFull || inviteMutation.isPending}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-role">
              <Trans>Role</Trans>
            </Label>
            <Select
              value={role}
              disabled={seatsFull || inviteMutation.isPending}
              onValueChange={(value) => {
                if (isManagedRole(value)) setRole(value)
              }}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue>{roleLabel(role)}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {MANAGED_ROLES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {roleLabel(item)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-text-tertiary">
              <Trans>
                Owner stays read-only. Managers can review work; preparers and coordinators have
                scoped access.
              </Trans>
            </p>
          </div>
          {inviteMutation.isError ? (
            <p role="alert" className="text-sm text-text-destructive">
              {inviteMutation.error.message}
            </p>
          ) : null}
          {seatsFull ? (
            <p id="members-seat-limit-note" role="alert" className="text-sm text-text-warning">
              <Trans>No seats are available. Upgrade or suspend a member before inviting.</Trans>
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" variant="accent" disabled={seatsFull || inviteMutation.isPending}>
              {inviteMutation.isPending ? <Trans>Sending…</Trans> : <Trans>Send invite</Trans>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MembersSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1172px] flex-col gap-6 px-4 py-6 md:px-6">
      <div className="flex min-h-20 justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-80" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
