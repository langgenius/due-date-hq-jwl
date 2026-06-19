import { useEffect, useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { msg } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import type { I18n } from '@lingui/core'
import { TriangleAlertIcon, EllipsisIcon, Loader2, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
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
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Field, FieldDescription, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
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
import { StatBand } from '@/components/patterns/stat-band'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { formatShortcutForDisplay } from '@/components/patterns/keyboard-shell/display'
import {
  useAppHotkey,
  useKeyboardShortcutsBlocked,
} from '@/components/patterns/keyboard-shell/hooks'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { PermissionGate, useFirmPermission } from '@/features/permissions/permission-gate'
import { RelativeTime } from '@/components/primitives/relative-time'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import {
  formatInvitationDate,
  invitationDescription,
  inviterName,
  isManagedRole,
  isRoleDowngrade,
  MANAGED_ROLES,
  roleDowngradeImpact,
  roleLabel,
} from './member-model'

type MemberActionTarget = {
  id: string
  name: string
}

const INVITE_MEMBER_HOTKEY = 'Mod+I'
const INVITE_MEMBER_ARIA_SHORTCUTS = 'Meta+I Control+I'

// Per-role scope summary used inside the invite-role <SelectItem>.
// CPA-vocabulary: Partner = principal authority; Manager = review + sign-off;
// Preparer = assigned client work; Coordinator = scheduling + intake but no
// preparation.
// Uses `msg` + `i18n._` so the catalog extractor picks up every
// variant (parameterized `t` inside a helper bypasses extraction).
function inviteRoleDescription(role: MemberManagedRole, i18n: I18n): string {
  if (role === 'partner')
    return i18n._(msg`Principal authority — final review, approvals, and full sign-off.`)
  if (role === 'manager') return i18n._(msg`Reviews work and signs off on prepared filings.`)
  if (role === 'preparer') return i18n._(msg`Works assigned client deadlines and prepares filings.`)
  return i18n._(msg`Schedules work and handles client intake — no preparation rights.`)
}

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
        secondaryAction={{ label: <Trans>Open deadlines</Trans>, to: '/deadlines' }}
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
      <div className="mx-auto flex w-full max-w-page-wide flex-col gap-4 px-4 pt-8 pb-12 md:px-6">
        <Alert variant="destructive">
          <TriangleAlertIcon />
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
  const { t, i18n } = useLingui()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<MemberActionTarget | null>(null)
  // Gate downgrades behind an AlertDialog confirm (following the pendingRemoval
  // pattern) — applying a role change instantly on dropdown pick means a
  // misclick could drop a partner to coordinator with no recovery, since
  // downgrades silently strip sign-off, member admin, billing access. Upgrades
  // and sideways moves apply directly.
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    member: MemberActionTarget
    fromRole: MemberPublic['role']
    toRole: MemberManagedRole
  } | null>(null)
  // Gate cancel-invitation behind a small confirm so an accidental click on
  // the table-cell-sized link doesn't pull the rug out from under a recipient
  // who may be checking their inbox right now — there's no preview or undo.
  const [pendingInvitationCancel, setPendingInvitationCancel] = useState<{
    invitationId: string
    inviteeLabel: string
  } | null>(null)
  // Suspend is reversible (Reactivate is right next to it in the menu) but the
  // suspended member is silently locked out until they hit the login screen
  // and see an error — wrong-person suspends turn into Saturday-morning panic
  // calls, so it gets a confirm. Reactivate stays direct (additive, no harm).
  const [pendingSuspend, setPendingSuspend] = useState<MemberPublic | null>(null)
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

  useEffect(() => {
    track(ANALYTICS_EVENTS.membersViewed, { member_count: data.members.length })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateRoleMutation = useMutation(
    orpc.members.updateRole.mutationOptions({
      onSuccess: (next) => {
        setPendingRoleChange(null)
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
        track(ANALYTICS_EVENTS.memberRevoked, {})
      },
    }),
  )
  const resendMutation = useMutation(
    orpc.members.resendInvitation.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
        track(ANALYTICS_EVENTS.memberInviteResent, {})
        // 2026-06-16 (audit): Resend succeeded silently — nothing on the row
        // changes, so the user got zero confirmation. Close the loop.
        toast.success(t`Invitation re-sent`)
      },
    }),
  )
  const cancelMutation = useMutation(
    orpc.members.cancelInvitation.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
        toast.success(t`Invitation cancelled`)
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
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-8 pb-12 md:px-6">
      <PageHeader
        breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Members` }]}
        title={<Trans>Members</Trans>}
        actions={
          <>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/audit" />}>
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
              <span className="ml-1 font-mono text-caption-xs opacity-70">
                {inviteShortcutLabel}
              </span>
            </Button>
          </>
        }
      />

      {/* 2026-06-16 (audit): converged off bespoke bordered StatTiles onto the
          shared borderless StatBand so the members summary reads the same as
          /clients, /rules, /workload. The seat ratio (used / limit) + the
          "N available" caption carry the capacity signal that the old hairline
          Progress bar did. */}
      <StatBand
        ariaLabel={t`Members summary`}
        stats={[
          {
            key: 'seats',
            label: t`Seats used`,
            value: (
              <span className="flex items-baseline gap-1.5">
                <span>{data.usedSeats}</span>
                <span className="text-sm font-medium text-text-tertiary">/ {data.seatLimit}</span>
              </span>
            ),
            sub: (
              <>
                <Plural value={activeMembers.length} one="# member" other="# members" />
                {' + '}
                <Plural value={data.invitations.length} one="# invite" other="# invites" />
                {' · '}
                <Trans>{data.availableSeats} available</Trans>
              </>
            ),
          },
          {
            key: 'active',
            label: t`Active members`,
            value: activeMembers.length,
            sub: (
              <>
                <Plural value={ownerCount} one="# owner" other="# owners" />
                {' · '}
                <Plural value={managedCount} one="# managed" other="# managed" />
              </>
            ),
          },
          {
            key: 'pending',
            label: t`Pending invites`,
            value: data.invitations.length,
            sub: (
              <Trans>
                {pendingCount} active · {expiredCount} expired
              </Trans>
            ),
          },
          {
            key: 'suspended',
            label: t`Suspended`,
            value: suspendedMembers.length,
            sub: t`access revoked, history kept`,
          },
        ]}
      />

      {mutationError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>
            <Trans>Member action failed</Trans>
          </AlertTitle>
          <AlertDescription>{mutationError.message}</AlertDescription>
        </Alert>
      ) : null}

      {seatsFull ? <SeatLimitBanner /> : null}

      <section className="flex flex-col gap-3">
        <MembersSectionHeader
          title={t`Active members`}
          count={data.members.length}
          note={t`You can't change the owner's role or your own.`}
          action={t`Use Role to change access; more to suspend or remove`}
        />
        <ActiveMembersTable
          members={data.members}
          firmTimezone={firmTimezone}
          onRoleChange={(memberId, role) => {
            // Downgrades go through a confirm dialog; upgrades + sideways
            // apply directly.
            const member = data.members.find((candidate) => candidate.id === memberId)
            if (!member) return
            if (isRoleDowngrade(member.role, role)) {
              setPendingRoleChange({
                member: { id: member.id, name: member.name },
                fromRole: member.role,
                toRole: role,
              })
              return
            }
            const fromRole = member.role
            updateRoleMutation.mutate(
              { memberId, role },
              {
                onSuccess: () => {
                  track(ANALYTICS_EVENTS.memberRoleChanged, {
                    from_role: fromRole,
                    to_role: role,
                  })
                },
              },
            )
          }}
          onSuspend={(member) => setPendingSuspend(member)}
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
        <MembersSectionHeader
          title={t`Pending invitations`}
          count={data.invitations.length}
          note={t`${pendingCount} active · ${expiredCount} expired · invitation link, 7-day expiry`}
        />
        <PendingInvitationsTable
          invitations={data.invitations}
          members={data.members}
          firmTimezone={firmTimezone}
          onResend={(invitation) => resendMutation.mutate({ invitationId: invitation.id })}
          onCancel={(invitation) =>
            setPendingInvitationCancel({
              invitationId: invitation.id,
              inviteeLabel: invitation.email,
            })
          }
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
              {removeMutation.isPending ? (
                <Trans>Removing…</Trans>
              ) : (
                <Trans>Remove from practice</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Downgrade confirm. Mirrors the Remove dialog above — same
          DestructiveChangePreview, same destructive-primary CTA. Upgrades skip
          this gate entirely (instant apply via the dropdown). */}
      <AlertDialog
        open={pendingRoleChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRoleChange(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Downgrade member?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRoleChange
                ? t`${pendingRoleChange.member.name} will drop from ${roleLabel(pendingRoleChange.fromRole)} to ${roleLabel(pendingRoleChange.toRole)}.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRoleChange
            ? (() => {
                const impact = roleDowngradeImpact(
                  pendingRoleChange.fromRole,
                  pendingRoleChange.toRole,
                  i18n,
                )
                return (
                  <DestructiveChangePreview
                    title={<Trans>This downgrade commits the following changes</Trans>}
                    lines={[
                      {
                        tone: 'remove',
                        label: <Trans>Removes</Trans>,
                        detail: impact.removes,
                      },
                      {
                        tone: 'keep',
                        label: <Trans>Keeps</Trans>,
                        detail: impact.keeps,
                      },
                    ]}
                  />
                )
              })()
            : null}
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={updateRoleMutation.isPending || !pendingRoleChange}
              onClick={() => {
                if (pendingRoleChange) {
                  const { fromRole, toRole } = pendingRoleChange
                  updateRoleMutation.mutate(
                    {
                      memberId: pendingRoleChange.member.id,
                      role: toRole,
                    },
                    {
                      onSuccess: () => {
                        track(ANALYTICS_EVENTS.memberRoleChanged, {
                          from_role: fromRole,
                          to_role: toRole,
                        })
                      },
                    },
                  )
                }
              }}
            >
              {updateRoleMutation.isPending ? (
                <Trans>Downgrading…</Trans>
              ) : (
                <Trans>Downgrade role</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend-access confirm. Reactivate is right next to it in the
          dropdown so the action is fully reversible, but the suspended member
          learns about it from a confusing login error — naming them in the
          dialog forces the admin to check the right row. */}
      <AlertDialog
        open={pendingSuspend !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSuspend(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Suspend access?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSuspend
                ? t`${pendingSuspend.name} will lose login access immediately. Their assignments and audit history stay intact — Reactivate access from this menu brings them back.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={suspendMutation.isPending || !pendingSuspend}
              onClick={() => {
                if (pendingSuspend) {
                  suspendMutation.mutate(
                    { memberId: pendingSuspend.id },
                    {
                      onSettled: () => setPendingSuspend(null),
                    },
                  )
                }
              }}
            >
              {suspendMutation.isPending ? (
                <Trans>Suspending…</Trans>
              ) : (
                <Trans>Suspend access</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Small confirm before cancelling an invitation. Uses a plain
          description instead of the heavy DestructiveChangePreview —
          cancel-invite isn't on the same severity tier as Remove / Downgrade,
          but a confirm prevents accidental misclicks on the inline
          text-button. */}
      <AlertDialog
        open={pendingInvitationCancel !== null}
        onOpenChange={(open) => {
          if (!open) setPendingInvitationCancel(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Cancel this invitation?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingInvitationCancel
                ? t`The invitation link sent to ${pendingInvitationCancel.inviteeLabel} will stop working. You can re-invite them later, but the original link can't be revived.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Keep invitation</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={cancelMutation.isPending || !pendingInvitationCancel}
              onClick={() => {
                if (pendingInvitationCancel) {
                  cancelMutation.mutate(
                    { invitationId: pendingInvitationCancel.invitationId },
                    {
                      onSettled: () => setPendingInvitationCancel(null),
                    },
                  )
                }
              }}
            >
              {cancelMutation.isPending ? (
                <Trans>Cancelling…</Trans>
              ) : (
                <Trans>Cancel invitation</Trans>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SeatLimitBanner() {
  return (
    <section className="flex min-h-14 items-center gap-3 rounded-lg border border-state-warning-hover-alt bg-state-warning-hover px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center text-text-warning">
        <TriangleAlertIcon className="size-4" aria-hidden />
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
      <Button variant="outline" nativeButton={false} render={<Link to="/billing" />}>
        <Trans>Upgrade plan</Trans>
      </Button>
    </section>
  )
}

function MembersSectionHeader({
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
    // The heading is a `text-sm font-medium text-text-secondary` sentence-case
    // sub-section label (uppercase kickers are deprecated). Outer text-xs is
    // for the right-side metadata that follows (count chip + descriptor).
    <div className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
      <h2 className="text-sm font-medium text-text-secondary">{title}</h2>
      {/* Count chip — Badge primitive matching the tab-count / provenance chip
          recipe. */}
      <Badge variant="outline" shape="square" size="sm" className="tabular-nums">
        {count}
      </Badge>
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
    <div className="overflow-hidden rounded-lg border border-divider-regular bg-background-default">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="h-9 hover:bg-transparent">
              <TableHead className="w-[304px] px-4">
                <Trans>Name</Trans>
              </TableHead>
              <TableHead className="w-[280px]">
                <Trans>Email</Trans>
              </TableHead>
              <TableHead className="w-44">
                <Trans>Role</Trans>
              </TableHead>
              <TableHead className="w-32">
                <Trans>Status</Trans>
              </TableHead>
              <TableHead className="w-44">
                <Trans>Joined</Trans>
              </TableHead>
              {/* "Last active" column is hidden until real data lands — the
                server isn't tracking last-active yet, and a column of "Not
                recorded" eats horizontal real estate to tell the user nothing.
                Restore the <TableHead className="w-28">Last active</TableHead>
                + matching cell when the backend grows a `lastActiveAt`
                field. */}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:py-3">
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
                  {/* JOINED uses relative time ("3 weeks ago") — an
                    engineering-precise timestamp is unparseable at a glance.
                    The exact value lives on the tooltip via <RelativeTime>. No
                    font-mono — this column reads as recency, not as data. */}
                  <TableCell className="py-1.5 text-xs whitespace-nowrap text-text-tertiary">
                    <RelativeTime value={member.createdAt} timeZone={firmTimezone} />
                  </TableCell>
                  <TableCell className="py-1.5 pr-2">
                    <MemberActionsMenu
                      member={member}
                      disabled={!mutable || busy}
                      onSuspend={onSuspend}
                      onReactivate={onReactivate}
                      onRemove={onRemove}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
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
    <div className="overflow-hidden rounded-lg border border-divider-regular bg-background-default">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="h-9 hover:bg-transparent">
              <TableHead className="w-[444px] px-4">
                <Trans>Email</Trans>
              </TableHead>
              <TableHead className="w-[140px]">
                <Trans>Status</Trans>
              </TableHead>
              <TableHead className="w-44">
                <Trans>Role</Trans>
              </TableHead>
              <TableHead className="w-32">
                <Trans>Invited by</Trans>
              </TableHead>
              <TableHead className="w-44">
                <Trans>Sent · Expires</Trans>
              </TableHead>
              <TableHead className="w-24">
                <Trans>Actions</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:py-3">
            {invitations.map((invitation) => (
              <TableRow key={invitation.id} className="h-14">
                <TableCell className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-medium text-text-primary">
                      {invitation.email}
                    </span>
                    <span className="text-xs text-text-tertiary">
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
                      invitation.status === 'expired' ? 'text-text-warning' : 'text-text-tertiary',
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
                  {/* Resend = accent variant (the affirmative re-action),
                    Cancel = muted secondary (the quiet backup affordance).
                    Both keep the disabled-while-busy semantics through the
                    underlying Base UI primitive. */}
                  <div className="flex flex-col items-start gap-0.5">
                    <TextLink
                      variant="accent"
                      disabled={busy}
                      onClick={() => onResend(invitation)}
                      className="disabled:text-text-disabled"
                    >
                      <Trans>Resend</Trans>
                    </TextLink>
                    <TextLink
                      variant="secondary"
                      disabled={busy}
                      onClick={() => onCancel(invitation)}
                      className="disabled:text-text-disabled"
                    >
                      <Trans>Cancel</Trans>
                    </TextLink>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function MemberIdentity({ member }: { member: MemberPublic }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {/* AssigneeAvatar primitive at size-6 ('sm'). The shared
          initialsFromName helper is wired through the primitive so "S vs SM"
          initials drift can't come back. `title` carries the name for the
          tooltip; aria metadata lives on the avatar so the sibling text-name
          reads naturally and the avatar stays decorative. */}
      <AssigneeAvatar name={member.name} image={member.image} size="sm" title={member.name} />
      <span
        className={cn(
          'truncate text-xs font-medium',
          member.status === 'suspended' ? 'text-text-muted' : 'text-text-primary',
        )}
      >
        {member.name}
      </span>
      {member.isCurrentUser ? (
        <Badge variant="secondary" className="h-4 rounded-sm px-1.5 font-mono text-caption-xs">
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

// MemberStatusPill and the invitation pill coexist in the same table, so they
// share one shape — `outline` chip + tone-colored dot (a filled chip + dot is
// redundant) — to avoid looking like different families. Tones follow the
// ladder: success = healthy, info = active work, warning = external pause,
// disabled = dormant. Stock Badge chrome (pill radius, default size) so the
// state pill reads the same here as on every other surface.
function MemberStatusPill({ status }: { status: MemberPublic['status'] }) {
  const suspended = status === 'suspended'
  return (
    <Badge variant="outline" className="text-text-secondary">
      <BadgeStatusDot tone={suspended ? 'disabled' : 'success'} className="size-1.5" />
      {suspended ? <Trans>Suspended</Trans> : <Trans>Active</Trans>}
    </Badge>
  )
}

function InvitationStatusPill({ status }: { status: MemberInvitationPublic['status'] }) {
  const expired = status === 'expired'
  return (
    <Badge variant="outline" className="text-text-secondary">
      <BadgeStatusDot tone={expired ? 'warning' : 'info'} className="size-1.5" />
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
}: {
  member: MemberPublic
  disabled: boolean
  onSuspend: (member: MemberPublic) => void
  onReactivate: (member: MemberPublic) => void
  onRemove: (member: MemberActionTarget) => void
}) {
  return (
    <DropdownMenu>
      {/* RowActionsMenu doesn't yet support this mixed action menu shape, so
          the ellipsis chrome stays inline on the shared Button primitive
          (`variant='ghost' size='icon-xs'`). */}
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-xs" disabled={disabled}>
            <EllipsisIcon className="size-4" aria-hidden />
            <span className="sr-only">
              <Trans>Open member actions</Trans>
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[220px]">
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
  const { t, i18n } = useLingui()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberManagedRole>('manager')
  const inviteMutation = useMutation(
    orpc.members.invite.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(orpc.members.listCurrent.queryKey({ input: undefined }), next)
        void queryClient.invalidateQueries({ queryKey: membersKey })
        track(ANALYTICS_EVENTS.memberInvited, { role })
        // toast.success names the invitee so the action lands — closing the
        // dialog silently leaves the user no confirmation the invite went out.
        const sentTo = email.trim()
        toast.success(t`Invite sent to ${sentTo}`)
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
    <Dialog protectInput open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] rounded-lg p-5" showCloseButton={false}>
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base">
            <Trans>Invite member</Trans>
          </DialogTitle>
          <DialogDescription className="text-xs">
            <Trans>Send a 7-day invitation link to add a member to this practice.</Trans>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Field + FieldLabel primitives for the form rows. The role row
              also picks up FieldDescription so the "Owner stays read-only…"
              helper text formally associates with the role select. */}
          <Field>
            <FieldLabel htmlFor="invite-email">
              <Trans>Work email</Trans>
            </FieldLabel>
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
          </Field>
          <Field>
            <FieldLabel htmlFor="invite-role">
              <Trans>Role</Trans>
            </FieldLabel>
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
              {/* Each role item carries a one-line scope summary so the user
                  choosing the role sees WHICH role does WHAT inline. */}
              <SelectContent align="start">
                <SelectGroup>
                  {MANAGED_ROLES.map((item) => (
                    <SelectItem key={item} value={item}>
                      <span className="flex flex-col items-start gap-0.5 py-0.5">
                        <span className="text-sm font-medium text-text-primary">
                          {roleLabel(item)}
                        </span>
                        <span className="text-xs leading-4 text-text-tertiary">
                          {inviteRoleDescription(item, i18n)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              <Trans>Owner stays read-only and can't be invited from here.</Trans>
            </FieldDescription>
          </Field>
          {inviteMutation.isError ? (
            // Message routed through rpcErrorMessage so the user gets a
            // readable string instead of a raw RPC error code.
            <Alert variant="destructive">
              <AlertTitle>
                <Trans>Couldn't send invite</Trans>
              </AlertTitle>
              <AlertDescription>
                {rpcErrorMessage(inviteMutation.error) ??
                  t`Try again in a moment. If it keeps failing, contact support.`}
              </AlertDescription>
            </Alert>
          ) : null}
          {seatsFull ? (
            // Alert primitive at `variant='warning'`. Keeps the id targeting
            // (the Invite trigger aria-describedby's this node) and lands in
            // the same chrome as the sibling invite-error Alert above so the
            // dialog reads as one consistent surface.
            <Alert id="members-seat-limit-note" variant="warning" className="text-sm">
              <AlertDescription>
                <Trans>No seats are available. Upgrade or suspend a member before inviting.</Trans>
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            {/* Send-invite announces aria-busy + shows a Loader2 spinner while
                pending. */}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={seatsFull || inviteMutation.isPending}
              aria-busy={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : null}
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
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-8 pb-12 md:px-6">
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
