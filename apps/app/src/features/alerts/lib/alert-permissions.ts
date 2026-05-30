// Pure alert-permission logic extracted from AlertDetailDrawer.tsx: status
// constants, the apply/review readiness predicates (unit-tested), and the
// RBAC hook that reads the firms cache. No JSX — keeps the drawer component
// focused on rendering.
import { useQueryClient } from '@tanstack/react-query'
import type {
  FirmPublic,
  FirmRole,
  PulseDetail,
  PulseFirmAlertStatus,
  PulseStatus,
} from '@duedatehq/contracts'
import { hasFirmPermission } from '@duedatehq/core/permissions'
import { planHasFeature } from '@duedatehq/core/plan-entitlements'
import { orpc } from '@/lib/rpc'

export const REVERTABLE_STATUSES: ReadonlySet<PulseFirmAlertStatus> = new Set([
  'applied',
  'partially_applied',
])
export const REVIEW_UNAVAILABLE_STATUSES: ReadonlySet<PulseFirmAlertStatus> = new Set([
  'dismissed',
  'reverted',
  'reviewed',
])
export const SHOW_PRIORITY_REVIEW_UI = false

export function canRequestAlertReview(input: {
  role: FirmRole | null | undefined
  alertStatus: PulseFirmAlertStatus
  sourceStatus: PulseStatus
}): boolean {
  return (
    input.role === 'preparer' &&
    input.sourceStatus !== 'source_revoked' &&
    !REVIEW_UNAVAILABLE_STATUSES.has(input.alertStatus)
  )
}

export type PulseDeadlineReadinessInput = {
  alert: Pick<PulseDetail['alert'], 'actionMode' | 'firmImpact'>
  applyReadiness: PulseDetail['applyReadiness']
}

export function isNoActionReviewAlert(detail: PulseDeadlineReadinessInput): boolean {
  return detail.alert.actionMode === 'review_only' || detail.alert.firmImpact === 'no_current_match'
}

export function hasMissingDeadlineDetails(detail: PulseDeadlineReadinessInput): boolean {
  return (
    detail.alert.actionMode === 'due_date_overlay' &&
    detail.alert.firmImpact !== 'no_current_match' &&
    detail.applyReadiness.status === 'needs_details'
  )
}

export function canApplyAlertDeadline(detail: PulseDeadlineReadinessInput): boolean {
  if (detail.alert.firmImpact === 'no_current_match') return false
  return detail.alert.actionMode !== 'due_date_overlay' || detail.applyReadiness.status === 'ready'
}

// Read RBAC from the firms cache the layout already primed. The Apply CTA stays
// disabled until we know the user is Owner / Partner / Manager (matches server
// permissions).
//
// ROH-D15 — the Undo button used to share `canApply` (`pulse.apply`) as a
// proxy gate, which left the `pulse.revert` Permission enum value with no UI
// call site. Both permissions share the same role set today
// (owner/partner/manager), so the gating behaviour is identical, but the
// explicit `pulse.revert` lookup keeps the UI and source-of-truth aligned —
// if a future change splits revert into a smaller (or larger) role set, the
// Undo button will track it without another code edit.
export function useAlertPermissions(): {
  role: FirmRole | null
  canApply: boolean
  canRevert: boolean
  canViewPriorityQueue: boolean
  canManagePriorityReview: boolean
} {
  const queryClient = useQueryClient()
  const firms = queryClient.getQueryData<FirmPublic[]>(
    orpc.firms.listMine.queryKey({ input: undefined }),
  )
  if (!firms) {
    return {
      role: null,
      canApply: false,
      canRevert: false,
      canViewPriorityQueue: false,
      canManagePriorityReview: false,
    }
  }
  const current = firms.find((firm) => firm.isCurrent) ?? firms[0]
  if (!current) {
    return {
      role: null,
      canApply: false,
      canRevert: false,
      canViewPriorityQueue: false,
      canManagePriorityReview: false,
    }
  }
  const priorityEnabled =
    SHOW_PRIORITY_REVIEW_UI && planHasFeature(current.plan, 'priorityPulseMatching')
  const canApply = hasFirmPermission({
    role: current.role,
    permission: 'pulse.apply',
    coordinatorCanSeeDollars: current.coordinatorCanSeeDollars,
  })
  const canRevert = hasFirmPermission({
    role: current.role,
    permission: 'pulse.revert',
    coordinatorCanSeeDollars: current.coordinatorCanSeeDollars,
  })
  return {
    role: current.role,
    canApply,
    canRevert,
    canViewPriorityQueue: priorityEnabled,
    canManagePriorityReview: priorityEnabled && canApply,
  }
}
