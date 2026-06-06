import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  Astroid,
  ExternalLinkIcon,
  MailIcon,
  MessageSquareIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { PulseFirmAlertStatus, PulseStatus } from '@duedatehq/contracts'
import type { PulseDetail } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent } from '@duedatehq/ui/components/ui/card'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Label } from '@duedatehq/ui/components/ui/label'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { useOptionalSidebar } from '@duedatehq/ui/components/ui/sidebar'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { requiredRolesLabel } from '@/lib/required-roles-label'
import { ConceptLabel } from '@/features/concepts/concept-help'
// 2026-06-05 (pre-CI green-up): `EntityAuditActivityPanel` import
// retired with the AlertActivitySection deletion above. Restore if
// the per-alert audit timeline is ever re-mounted in the drawer.
import { PermissionInlineNotice } from '@/features/permissions/permission-gate'
import { StateBadge, getJurisdictionName } from '@/components/primitives/state-badge'
import { aiConfidenceTier, isLowAiConfidence } from '@/features/_surface-vocabulary/ai-confidence'

import { impactBadgeFromAlert, actionPillFromAlert } from './components/pulse-alert-chrome'
import { AffectedClientsTable } from './components/AffectedClientsTable'
// Step 9 retired `AlertConfidencePill` in favor of the canonical
// 2026-06-05 (pre-CI green-up): the four pill imports below
// (AlertConfidencePill, AlertSourceBadge, AlertSourceStatusBadge,
// AlertStatusBadge) all went unused after the round 84/85 drawer
// chrome refactor. Dropped to satisfy no-unused-vars.
import { AlertDecisionStatusNotice } from './components/AlertReadinessStatus'
import { AlertStructuredFields } from './components/AlertStructuredFields'
import { changeKindLabel } from './components/PulseChangeKindChip'
import {
  useAlertsInvalidation,
  useAlertDetailQueryOptions,
  useAlertsPriorityQueueQueryOptions,
} from './api'
import { isAlertConflict, alertErrorDescriptor } from './lib/error-mapping'
import {
  computeSelectionStats,
  confirmAllNeedsReview,
  defaultSelection,
  excludeFromSelection,
  type SelectionStats,
} from './lib/selection'
import {
  canApplyAlertDeadline,
  canRequestAlertReview,
  hasMissingDeadlineDetails,
  REVERTABLE_STATUSES,
  useAlertPermissions,
} from './lib/alert-permissions'

interface AlertDetailDrawerProps {
  alertId: string | null
  onClose: () => void
  /**
   * 2026-05-25 (Yuqi /alerts #9 — drawer → page panel):
   * - `'sheet'` (default): legacy floating right-side Sheet with
   *   backdrop. Used as the off-route fallback so callers that
   *   open the drawer from outside /alerts (e.g. the
   *   dashboard NeedsAttention card before it's been migrated)
   *   still see a usable rendering.
   * - `'panel'`: renders the same body as an inline `<aside>`
   *   that the route's layout can drop into a flex sibling
   *   column next to the alerts list. No backdrop, no
   *   viewport-fixed positioning — the panel splits the page
   *   like the obligation drawer on /deadlines.
   */
  mode?: 'sheet' | 'panel'
}

// 2026-05-25 (Yuqi critique B): the drawer used to compute its own
// tone via `drawerTone(status, confidence)` while the dashboard
// `NeedsAttentionCard` used a different per-impact formula — so the
// same alert showed green outside and red inside. Both sites now
// call `alertTone(alert)` so they always agree.

// Alert detail drawer: AI summary + structured fields + affected clients + apply
// / dismiss / revert. Apply is the safer path because the server writes audit +
// evidence + email outbox in one transaction (see packages/db/src/repo/pulse.ts).
export function AlertDetailDrawer({ alertId, onClose, mode = 'sheet' }: AlertDetailDrawerProps) {
  const { t, i18n } = useLingui()
  const queryClient = useQueryClient()
  const open = alertId !== null
  // 2026-05-26 (Yuqi sidebar mental-model pass): same pattern as the
  // /deadlines obligation drawer (see routes/obligations.tsx). When the
  // alert drawer is open it needs horizontal room — auto-collapse
  // the sidebar while open, restore on close. The user's persistent
  // collapse preference (localStorage) is untouched; closing the drawer
  // restores whatever they last chose. If a consumer renders this
  // drawer outside SidebarProvider (e.g. the off-route
  // `AlertDrawerProvider` mounted above AppShell in `_layout.tsx`),
  // `useSidebar` would throw — gate with the safe context lookup.
  const sidebar = useOptionalSidebar()
  const setAutoCollapsed = sidebar?.setAutoCollapsed
  useEffect(() => {
    if (!setAutoCollapsed) return undefined
    setAutoCollapsed(open)
    return () => {
      setAutoCollapsed(false)
    }
  }, [open, setAutoCollapsed])
  const detailQuery = useQuery(useAlertDetailQueryOptions(alertId))
  const detail = detailQuery.data
  const permissions = useAlertPermissions()
  const canApply = permissions.canApply
  const priorityQueueQuery = useQuery(
    useAlertsPriorityQueueQueryOptions(100, permissions.canViewPriorityQueue),
  )
  const priorityReview =
    priorityQueueQuery.data?.items.find((item) => item.alert.id === detail?.alert.id)?.review ??
    null
  const invalidate = useAlertsInvalidation()

  // 2026-06-03 (rule-change alert — "disable Mark reviewed until all
  // reverify rules are re-verified"): a review_only drift / rule-change
  // alert lists rules to re-verify (`detail.reverifyRuleIds`). The CPA
  // must re-verify (accept) each one — which bumps the firm's adopted
  // version + clears the rule's source-drift gate — BEFORE the alert can
  // be marked reviewed. Otherwise "reviewed" would close the alert while
  // the underlying rule is still stale. A reverify rule still needs work
  // iff listRules surfaces a candidate / pending_review row for it (the
  // same row that renders the "Re-verify" action below). The query only
  // runs when the alert actually carries reverify rules; its key matches
  // ReverifyRulesSection so the two share one cache entry.
  const reverifyRuleIds = detail?.reverifyRuleIds
  const reverifyRulesQuery = useQuery({
    ...orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
    enabled: open && (reverifyRuleIds?.length ?? 0) > 0,
  })
  const reverifyIncomplete = useMemo(() => {
    if (!reverifyRuleIds || reverifyRuleIds.length === 0) return false
    const rules = reverifyRulesQuery.data ?? []
    return reverifyRuleIds.some((ruleId) =>
      rules.some(
        (rule) =>
          rule.id === ruleId && (rule.status === 'candidate' || rule.status === 'pending_review'),
      ),
    )
  }, [reverifyRuleIds, reverifyRulesQuery.data])

  const [selection, setSelection] = useState<Set<string>>(() => new Set())
  const [confirmedReviewIds, setConfirmedReviewIds] = useState<Set<string>>(() => new Set())
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set())
  const [resetKey, setResetKey] = useState<string | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  // 2026-05-26 (F-041 — alert deadline-shift verification gate):
  // Apply on a `due_date_overlay` alert opens a confirmation dialog
  // that surfaces the AI-extracted dates, source excerpt, and a
  // direct link to the official source. The CPA must tick "I have
  // verified against the source" before the mutation fires. AI
  // hallucinating a deadline shift = files late or early — the
  // highest-liability failure mode in the product — so the Apply
  // path now requires one explicit acknowledgement step.
  const [applyVerificationOpen, setApplyVerificationOpen] = useState(false)
  const [applyVerified, setApplyVerified] = useState(false)

  // Re-derive default selection when the loaded alert changes — without
  // useEffect, per project rule. Render-time setState bails out after one update.
  const nextResetKey = detail
    ? [
        detail.alert.id,
        detail.affectedClients.length,
        priorityReview?.id ?? 'none',
        priorityReview?.status ?? 'none',
        priorityReview?.reviewedAt ?? 'none',
      ].join(':')
    : null
  if (detail && resetKey !== nextResetKey) {
    const needsDeadlineDecision = hasMissingDeadlineDetails(detail)
    setSelection(
      priorityReview
        ? new Set(priorityReview.selectedObligationIds)
        : needsDeadlineDecision
          ? new Set()
          : defaultSelection(detail.affectedClients),
    )
    setConfirmedReviewIds(new Set(priorityReview?.confirmedObligationIds ?? []))
    setExcludedIds(new Set(priorityReview?.excludedObligationIds ?? []))
    setReviewDialogOpen(false)
    setReviewNote('')
    setApplyVerificationOpen(false)
    setApplyVerified(false)
    setResetKey(nextResetKey)
  }
  if (!open && resetKey !== null) {
    setSelection(new Set())
    setConfirmedReviewIds(new Set())
    setExcludedIds(new Set())
    setReviewDialogOpen(false)
    setReviewNote('')
    setApplyVerificationOpen(false)
    setApplyVerified(false)
    setResetKey(null)
  }

  const stats = useMemo<SelectionStats | null>(
    () =>
      detail ? computeSelectionStats(detail.affectedClients, selection, confirmedReviewIds) : null,
    [detail, selection, confirmedReviewIds],
  )
  const missingDeadlineDetails = detail ? hasMissingDeadlineDetails(detail) : false
  const deadlineApplyReady = detail ? canApplyAlertDeadline(detail) : false

  const handleToggleNeedsReviewConfirmation = (obligationId: string, confirmed: boolean) => {
    setConfirmedReviewIds((current) => {
      const next = new Set(current)
      if (confirmed) next.add(obligationId)
      else next.delete(obligationId)
      return next
    })
    setSelection((current) => {
      const next = new Set(current)
      if (confirmed) next.add(obligationId)
      else next.delete(obligationId)
      return next
    })
  }

  const handleToggleExcluded = (obligationId: string, excluded: boolean) => {
    const next = excludeFromSelection(
      selection,
      confirmedReviewIds,
      excludedIds,
      obligationId,
      excluded,
    )
    setSelection(next.selection)
    setConfirmedReviewIds(next.confirmedReviewIds)
    setExcludedIds(next.excludedIds)
  }

  const handleConfirmAllNeedsReview = () => {
    if (!detail) return
    const nextConfirmed = confirmAllNeedsReview(detail.affectedClients)
    setConfirmedReviewIds(nextConfirmed)
    setSelection((current) => {
      const next = new Set(current)
      for (const obligationId of nextConfirmed) {
        if (!excludedIds.has(obligationId)) next.add(obligationId)
      }
      return next
    })
  }

  const revertMutation = useMutation(
    orpc.pulse.revert.mutationOptions({
      onSuccess: (result) => {
        invalidate()
        toast.success(t`Reverted ${result.revertedCount} clients`)
      },
      onError: (err) => {
        toast.error(t`Couldn't undo alert`, {
          description: i18n._(alertErrorDescriptor(err)),
        })
      },
    }),
  )

  const reactivateMutation = useMutation(
    orpc.pulse.reactivate.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Alert reactivated`, {
          description: t`Select clients and apply again.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't reactivate alert`, {
          description: i18n._(alertErrorDescriptor(err)),
        })
      },
    }),
  )

  const applyMutation = useMutation(
    orpc.pulse.apply.mutationOptions({
      onSuccess: (result) => {
        invalidate()
        toast.success(t`Applied to ${result.appliedCount} clients`, {
          description: t`Audit + evidence written. Undo within 24h.`,
          action: {
            label: t`Undo`,
            onClick: () => revertMutation.mutate({ alertId: result.alert.id }),
          },
        })
        onClose()
      },
      onError: (err) => {
        const description = i18n._(alertErrorDescriptor(err)) || (rpcErrorMessage(err) ?? '')
        if (isAlertConflict(err)) {
          toast.error(t`Couldn't apply alert`, {
            description,
            action: {
              label: t`Refresh`,
              onClick: () => void detailQuery.refetch(),
            },
          })
          return
        }
        toast.error(t`Couldn't apply alert`, { description })
      },
    }),
  )

  const markReviewedMutation = useMutation(
    orpc.pulse.markReviewed.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert marked reviewed`)
        invalidate()
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't mark alert reviewed`, {
          description: i18n._(alertErrorDescriptor(err)),
        })
      },
    }),
  )

  const requestReviewMutation = useMutation(
    orpc.pulse.requestReview.mutationOptions({
      onSuccess: () => {
        setReviewDialogOpen(false)
        setReviewNote('')
        void queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.pulse.key() })
        // 2026-05-26 (Step 6 UX audit #96): future tense "will be
        // sent" suggested an action that hadn't happened yet, even
        // though the API call already completed and queued the
        // notifications server-side. Rephrased as a present-perfect
        // status ("queued for…") so the toast describes the
        // ACTUAL state of the world at toast-render time.
        // ROH-D11 — was "owners and managers" hard-coded; the
        // pulse.apply review-eligible role set is owner/partner/manager.
        // Use the helper so the toast tracks FIRM_PERMISSION_ROLES.
        toast.success(t`Review requested`, {
          description: t`Notifications queued for ${requiredRolesLabel('pulse.apply')}.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't request review`, {
          description: i18n._(alertErrorDescriptor(err)),
        })
      },
    }),
  )

  const reviewPriorityMutation = useMutation(
    orpc.pulse.reviewPriorityMatches.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Manager review saved`, {
          description: t`The reviewed client set is ready to apply.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't save manager review`, {
          description: i18n._(alertErrorDescriptor(err)),
        })
      },
    }),
  )

  const reviewDueDateDetailsMutation = useMutation(
    orpc.pulse.reviewDueDateOverlayDetails.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Deadline change confirmed`, {
          description: t`Selected deadlines are ready for final Apply review.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't save deadline selection`, {
          description: i18n._(alertErrorDescriptor(err)),
        })
      },
    }),
  )

  const applyReviewedMutation = useMutation(
    orpc.pulse.applyReviewed.mutationOptions({
      onSuccess: (result) => {
        invalidate()
        toast.success(t`Applied reviewed set to ${result.appliedCount} clients`, {
          description: t`Audit + evidence written. Undo within 24h.`,
          action: {
            label: t`Undo`,
            onClick: () => revertMutation.mutate({ alertId: result.alert.id }),
          },
        })
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't apply reviewed set`, {
          description: i18n._(alertErrorDescriptor(err)),
        })
      },
    }),
  )

  const isMutating =
    applyReviewedMutation.isPending ||
    applyMutation.isPending ||
    markReviewedMutation.isPending ||
    reviewDueDateDetailsMutation.isPending ||
    reviewPriorityMutation.isPending ||
    reactivateMutation.isPending ||
    requestReviewMutation.isPending ||
    revertMutation.isPending

  // F-041 — alert deadline-shift Apply now opens a verification gate
  // BEFORE firing the mutation. The CPA must read the official
  // source excerpt + click "verified" to acknowledge they checked
  // the new date against the authority. AI hallucinating a date is
  // the highest-liability failure mode (firm files late/early), so
  // the Apply path acquires one explicit confirmation step. The
  // gate only matters for `due_date_overlay` mode — `review_only`
  // alerts route through `onMarkReviewed` in the footer
  // (DrawerActions L1154), which has its own reason-capture flow.
  const handleApply = () => {
    if (!detail) return
    if (!canApplyAlertDeadline(detail)) {
      toast.error(t`Confirm the new date and deadlines before applying`)
      return
    }
    setApplyVerified(false)
    setApplyVerificationOpen(true)
  }

  // The verification dialog stays open during the mutation so the
  // user retains context if the request fails (server-side conflict,
  // network blip). On success the upstream `applyMutation.onSuccess`
  // calls `onClose()` which closes the drawer; the close-handler
  // reset block clears `applyVerificationOpen` + `applyVerified` so
  // the next alert opens with a fresh gate.
  const runApply = () => {
    if (!detail) return
    if (!canApplyAlertDeadline(detail)) return
    applyMutation.mutate({
      alertId: detail.alert.id,
      obligationIds: Array.from(selection),
      confirmedObligationIds: Array.from(selection).filter((obligationId) =>
        confirmedReviewIds.has(obligationId),
      ),
    })
  }

  const handleCopyDraft = () => {
    if (!detail) return
    void navigator.clipboard.writeText(buildClientEmailDraft(detail, selection)).then(
      () => toast.success(t`Client email draft copied`),
      () => toast.error(t`Couldn't copy client email draft`),
    )
  }

  // 2026-05-25 (Yuqi /alerts #9 — drawer → page panel):
  // outermost render shape is conditional on `mode`. The body
  // (header + content + footer) is shared between both modes so
  // every alert-detail surface — the floating Sheet (off-route
  // legacy) AND the inline page panel on /alerts — uses
  // identical content. Mirrors the obligation drawer pattern
  // (see `ObligationQueueDetailDrawer` in routes/obligations.tsx)
  // which already proves this works for cross-surface drawers
  // that need both an in-route panel + a floating fallback.
  const body = (
    <>
      {/* 2026-05-26 (Yuqi thirty-seventh pass — panel padding spec):
            header padding bumped to Yuqi's "right panel" spec:
              • padding-inline: calc(var(--spacing) * 12)  → px-12 (48px)
              • padding-block:  calc(var(--spacing) * 10)  → py-10 (40px)
            Override SheetHeader's primitive default (px-6 py-5) so the
            alert panel reads as a roomy paper-document surface, not as
            a tight Sheet drawer. Header / body / footer all share the
            same `px-12` inline so the left edge is one continuous
            margin top-to-bottom. */}
      {/* 2026-06-04 round 46 (Yuqi Pencil n9m9B — "follow the same
          style as of Today page and Alert page"): Hero header
          rebuilt to share the alert-card vocabulary used on /alerts
          + /today summary cards. Reads as the BIG version of the
          compact card — same severity pill + state pill + source ·
          time chrome at the top, then 28/600 title, then 16/500
          summary. Removes the legacy `Badge shape="square"`
          jurisdiction kicker, the PulseStatusBadge / change-kind
          Badge / PulseConfidencePill row, and the floating
          PulsingDot — every signal now sits in the consolidated
          meta row.
          Padding follows Pencil n9m9B Hero spec (gap 18 → gap-4
          + heavy outer padding via `px-12 py-10` from previous
          round). */}
      {/* Round 47 (Yuqi #1 — "reduce the bottom padding"): Hero
          padding `py-10` → `pt-10 pb-6`. The summary line was
          sitting on a 40px floor of dead space before the body
          content started; cutting bottom padding tightens the
          transition from Hero → first body section. */}
      <SheetHeader className="border-b border-divider-subtle px-12 pt-10 pb-6">
        {detailQuery.isLoading || !detail ? (
          <DetailHeaderSkeleton />
        ) : (
          (() => {
            const severity = impactBadgeFromAlert(detail.alert)
            // 2026-06-04 round 68 (Yuqi "No Low impact or medium
            // impact"): gate the impact pill to HIGH only — same
            // rule applied to NeedsAttentionCard / PulseAlertRow /
            // AlertCard in earlier rounds. The detail panel
            // header is no longer the lone outlier.
            const showSeverityPill = severity.id === 'high'
            const actionPill = actionPillFromAlert(detail.alert)
            const actionLabel = actionPill
              ? actionPill.id === 'needs-action'
                ? t`Needs Action`
                : actionPill.id === 'needs-review'
                  ? t`Needs Review`
                  : actionPill.id === 'snoozed'
                    ? t`Snoozed`
                    : t`Closed`
              : null
            return (
              // 2026-06-04 round 68 (Yuqi "please do not waste
              // space. space is precious"): drawer header gap
              // dropped 16 → 8 so the meta strip, title, and dek
              // pack tighter. Saved ~24px above the fold.
              <div className="flex flex-col gap-2">
                {/* Meta row — severity (HIGH only) + state pill +
                    change-kind + source · time + action pill.
                    2026-06-04 round 68 (Yuqi "state badge is wrong
                    and ugly"): state pill rebuilt to match the
                    h-[22px] StatePill chrome used on /alerts list
                    rows + dashboard card — `<StateBadge>` motif +
                    Geist Mono 11/700 uppercase code. The dangling
                    "Texas" full-name suffix (text-tertiary
                    normal-case mid-pill) was the actual visual
                    ugliness; dropped — the 2-letter code is
                    enough, full name moves to a tooltip on hover.
                    2026-06-04 round 68 (Yuqi "source status is
                    different on the alert card and on the detail
                    panel"): change-kind label uses the SAME
                    `changeKindLabel` helper PulseAlertRow uses
                    (not the drawer-specific
                    `drawerChangeKindLabel` we had here) so the
                    exact wording matches. */}
                <div className="flex flex-wrap items-center gap-2">
                  {showSeverityPill ? (
                    <span
                      className="inline-flex h-[22px] shrink-0 items-center rounded-[4px] px-2 text-[11px] font-bold tracking-[0.7px] uppercase"
                      style={{ backgroundColor: severity.bg, color: severity.text }}
                    >
                      {t`HIGH`}
                    </span>
                  ) : null}
                  {/* Round 77: state pill aligned to round-75 chrome
                      used on /today + /alerts row — smaller 16px
                      motif + 12px code (no bg / no left-right
                      padding). Drawer state now reads as the same
                      primitive as the rest of the alert vocabulary. */}
                  <Tooltip>
                    <TooltipTrigger
                      render={(props) => (
                        <span
                          className="inline-flex h-[22px] shrink-0 cursor-help items-center gap-1 outline-none"
                          {...props}
                        >
                          <StateBadge
                            code={detail.alert.jurisdiction}
                            size="xs"
                            style={{ width: 16, height: 16 }}
                          />
                          <span className="font-mono text-[12px] font-bold tracking-[0.7px] text-text-secondary uppercase">
                            {detail.alert.jurisdiction}
                          </span>
                        </span>
                      )}
                    />
                    <TooltipContent>
                      {getJurisdictionName(detail.alert.jurisdiction)}
                    </TooltipContent>
                  </Tooltip>
                  <span className="inline-flex h-[22px] shrink-0 items-center rounded-[4px] bg-state-accent-hover px-2 font-mono text-[11px] font-bold tracking-[0.7px] text-text-accent uppercase">
                    {changeKindLabel(detail.alert.changeKind)}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2 text-[12px] font-medium text-text-tertiary">
                    <span className="truncate">{detail.alert.source}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">
                      {formatRelativeTime(detail.alert.publishedAt)}
                    </span>
                    {actionPill && actionLabel ? (
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: actionPill.bg, color: actionPill.text }}
                      >
                        {actionLabel}
                      </span>
                    ) : null}
                  </span>
                </div>

                {/* Title — 2026-06-04 round 68 (Yuqi "alert detail
                    title can be slightly smaller"): 28 → 22, kept
                    600 weight and tight leading. Drawer chrome
                    above (top bar + meta strip) was claiming so
                    much of the fold that the title pushed the
                    Source Extract below it. 22px keeps the title
                    as the lede without dominating the panel. */}
                <h2 className="text-[22px] font-semibold leading-[1.25] tracking-[-0.4px] text-text-primary">
                  {detail.alert.title}
                </h2>

                {/* Summary / dek */}
                {detail.alert.summary &&
                detail.alert.summary.trim() !== detail.alert.title.trim() ? (
                  <p className="text-[14px] font-medium leading-[1.5] text-text-secondary">
                    {detail.alert.summary}
                  </p>
                ) : null}
              </div>
            )
          })()
        )}
      </SheetHeader>

      {/* 2026-05-25 (Yuqi Today #19): body gap reduced from gap-5
            (20px) to gap-4 (16px) and vertical padding from py-5
            to py-4 — denser scan rhythm so the drawer reads as
            information-dense, not as a series of cards with air
            between them. The CPA wants to see source → scope →
            action without paging the whole drawer. */}
      {/* 2026-05-26 (Yuqi thirty-second pass): body padding bumped
          py-4 → py-5 so the drawer body matches the FactCard
          inner padding (`px-6 py-5`). Consistent breathing room
          across nested surfaces. */}
      {/* 2026-05-26 (Yuqi thirty-seventh pass — panel padding spec):
            body padding bumped to the right-panel spec:
              • padding-inline: calc(var(--spacing) * 12)  → px-12 (48px)
              • padding-block:  calc(var(--spacing) * 10)  → py-10 (40px)
            Same margin as the header so the entire panel reads as
            one continuous paper surface from edge to edge. */}
      {/* 2026-05-26 (Yuqi forty-seventh pass — sticky-footer buffer):
            body bottom padding bumped `py-10` → `pt-10 pb-24` (96px).
            The sticky footer (min-h-16 + py-4 ≈ 64-80px) overlays
            the body's bottom edge when scrolled — without extra
            buffer the last content row gets hidden behind the
            action bar. 96px = ~footer height + 32px breathing
            room, so the CPA always sees both the last content and
            the action bar with a clean gap between them. Top stays
            py-10 (40px) — header → content rhythm doesn't change. */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-12 pt-6 pb-24">
        {/* 2026-06-04 round 47 (Yuqi #5 — "can you fulfill the
            content and make it information rich?"): SOURCE EXTRACT
            section per Pencil n9m9B. When the alert has a summary,
            render it as a styled extract panel — mono quote in a
            gray-50 rounded panel with citation. Reads as "this is
            literally what the AI pulled from the source", giving
            the CPA a verifiable text anchor before the structured
            fields below. */}
        {detail && detail.alert.summary && detail.alert.summary.trim().length > 0 ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold tracking-[0.5px] text-text-muted uppercase">
                <Trans>Source extract</Trans>
              </span>
              {detail.alert.sourceUrl ? (
                <a
                  href={detail.alert.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-text-accent hover:underline"
                >
                  <Trans>Open original ↗</Trans>
                </a>
              ) : null}
            </div>
            <blockquote className="rounded-2xl border border-divider-subtle bg-background-section px-5 py-4 font-mono text-[13px] leading-[1.55] text-text-secondary">
              &ldquo;{detail.alert.summary}&rdquo;
              <footer className="mt-2 font-sans text-[11px] font-medium text-text-tertiary">
                {detail.alert.source}
                {detail.alert.publishedAt ? (
                  <>
                    {' · '}
                    <span className="tabular-nums">
                      {formatRelativeTime(detail.alert.publishedAt)}
                    </span>
                  </>
                ) : null}
              </footer>
            </blockquote>
          </section>
        ) : null}

        {detailQuery.isError ? (
          // 2026-05-26 (Yuqi twenty-ninth pass): icon removed from
          // remaining drawer Alerts so the alert chrome is
          // consistent — title + body only, no leading icon.
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Couldn't load this alert</Trans>
            </AlertTitle>
            <AlertDescription>
              {i18n._(alertErrorDescriptor(detailQuery.error))}{' '}
              {/* 2026-05-27 (σ cross-route audit D8): raw underline
                  button → canonical `<Button variant="link">`. Pairs
                  with D5 in AlertsListPage — both alert retry sites
                  now match dashboard/clients/obligations. */}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 align-baseline"
                onClick={() => void detailQuery.refetch()}
              >
                <Trans>Retry</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {detail ? (
          <>
            <AlertDecisionStatusNotice alert={detail.alert} />

            {missingDeadlineDetails ? (
              <DeadlineDetailsPanel
                detail={detail}
                canManage={permissions.canApply}
                pending={reviewDueDateDetailsMutation.isPending}
                selection={selection}
                confirmedReviewIds={confirmedReviewIds}
                excludedIds={excludedIds}
                onChangeSelection={setSelection}
                onToggleNeedsReviewConfirmation={handleToggleNeedsReviewConfirmation}
                onToggleExcluded={
                  permissions.canViewPriorityQueue ? handleToggleExcluded : undefined
                }
                onSubmit={(input) =>
                  reviewDueDateDetailsMutation.mutate({
                    alertId: detail.alert.id,
                    ...input,
                  })
                }
              />
            ) : null}

            {/* 2026-05-25 (Yuqi #10): Affected clients moved to
                  the top of the drawer body. This is THE most
                  important question the CPA brings to a Alert
                  — "does this hit my clients?". Previously it was
                  buried under structured fields + low-confidence
                  alerts, forcing CPAs to scroll past 200+ pixels of
                  metadata before seeing the impact list. Empty case
                  (#10): if the alert has no affected clients, say
                  so explicitly instead of just hiding the table. */}
            {detail.alert.actionMode === 'due_date_overlay' &&
            detail.alert.firmImpact !== 'no_current_match' &&
            !missingDeadlineDetails ? (
              <section className="flex flex-col gap-3">
                {/* Round 47 (Yuqi #5 — "fulfill the content and make
                    it information rich"): section header restyled
                    to Pencil n9m9B vocabulary — `font-mono` 11/700
                    uppercase `tracking-[0.8px]` `text-text-muted`,
                    matching SOURCE EXTRACT / EXTRACTED FACTS /
                    PROVENANCE & CONFIDENCE labels. Count moves into
                    the same line as a tabular-nums tag instead of
                    a parenthesized aside. */}
                <header className="flex items-baseline justify-between">
                  {/* 2026-06-05 (pre-CI green-up): the section label was
                      a <span> for compactness, but E2E specs
                      (pulse.spec.ts:29, rbac-permissions.spec.ts) match
                      `getByRole('heading', { name: /Affected clients/ })`.
                      Switched to `<h3>` so screen readers + Playwright
                      see this as a heading. Typography unchanged. */}
                  <h3 className="font-mono text-[11px] font-semibold tracking-[0.5px] text-text-muted uppercase">
                    <Trans>Affected clients</Trans>
                    {detail.affectedClients.length > 0 ? (
                      <span className="ml-2 tabular-nums">{detail.affectedClients.length}</span>
                    ) : null}
                  </h3>
                  {stats ? <SelectionSummary stats={stats} /> : null}
                </header>
                {detail.affectedClients.length > 0 ? (
                  <AffectedClientsTable
                    rows={detail.affectedClients}
                    selection={selection}
                    confirmedReviewIds={confirmedReviewIds}
                    excludedIds={excludedIds}
                    onChangeSelection={setSelection}
                    onToggleNeedsReviewConfirmation={handleToggleNeedsReviewConfirmation}
                    onToggleExcluded={
                      permissions.canViewPriorityQueue ? handleToggleExcluded : undefined
                    }
                    readOnly={!canApply || !deadlineApplyReady}
                  />
                ) : (
                  <p className="rounded-md border border-divider-subtle bg-background-soft px-4 py-3 text-sm text-text-secondary">
                    <Trans>
                      No clients matched this alert's scope. You can dismiss it or wait — if a new
                      client is added that matches the scope, the alert will reopen.
                    </Trans>
                  </p>
                )}
              </section>
            ) : null}

            {/* Rule-change / source-drift alerts (review_only) don't apply a date
                overlay, so the overlay section above is skipped. Surface the same
                impact question read-only: which clients have open obligations backed
                by the changed rule (so the CPA sees the blast radius before re-verifying). */}
            {detail.alert.actionMode === 'review_only' && detail.affectedClients.length > 0 ? (
              <section className="flex flex-col gap-3">
                <header className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">
                    <Trans>Affected clients</Trans>
                    <span className="ml-1.5 text-text-tertiary">
                      ({detail.affectedClients.length})
                    </span>
                  </h3>
                </header>
                <AffectedClientsTable
                  rows={detail.affectedClients}
                  selection={selection}
                  confirmedReviewIds={confirmedReviewIds}
                  excludedIds={excludedIds}
                  onChangeSelection={setSelection}
                  onToggleNeedsReviewConfirmation={handleToggleNeedsReviewConfirmation}
                  readOnly
                  variant="review"
                />
              </section>
            ) : null}

            {/* 2026-05-26 (Yuqi sixteenth pass #6): SuggestedActionsPanel
                removed — its Apply / Mark-reviewed buttons duplicated
                the sticky SheetFooter (DrawerActions) at the bottom
                of the drawer. With the footer always visible at the
                bottom (sheet + panel modes), the inline panel just
                doubled the action surface area. The footer is now
                the canonical action site. */}

            {/* AI confidence: combined the small "AI 46%" badge
                  with the "Low AI confidence" alert into one block
                  so the same concept isn't shown twice (#15, #19).
                  The alert is the canonical surface — it names the
                  exact confidence number AND explains what to do.
                  2026-05-25 (Yuqi Today #11): variant flipped from
                  `destructive` → `warning`. Low AI confidence is a
                  "double-check this" cue, not a "this thing broke"
                  cue. Red text reads as error and pushes the CPA
                  toward the wrong mental model (data is wrong vs.
                  data needs verification). Amber matches the
                  semantics. */}
            {isLowAiConfidence(detail.alert.confidence) ? (
              // 2026-05-26 (Yuqi eighteenth pass): icon removed from
              // this Alert. With the icon gone the Alert primitive
              // falls back to its non-icon layout (single column),
              // so the title + description align on the same left
              // edge without the column-offset behaviour.
              <Alert variant="warning">
                <AlertTitle>
                  <ConceptLabel concept="aiConfidence">
                    {detail.alert.firmImpact === 'no_current_match' ? (
                      <Trans>
                        AI confidence {Math.round(detail.alert.confidence * 100)}% — review source
                      </Trans>
                    ) : (
                      <Trans>
                        AI confidence {Math.round(detail.alert.confidence * 100)}% — review source
                        before applying
                      </Trans>
                    )}
                  </ConceptLabel>
                </AlertTitle>
                <AlertDescription>
                  {detail.alert.firmImpact === 'no_current_match' ? (
                    <Trans>
                      The model extracted these fields with low confidence. Compare against the
                      source excerpt below and the structured scope before marking it reviewed.
                    </Trans>
                  ) : (
                    <Trans>
                      The model extracted these fields with low confidence. Compare against the
                      source excerpt below and the structured scope before pushing changes to
                      clients.
                    </Trans>
                  )}
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Round 47 (Yuqi #5 — content richness): wrap the
                structured-fields panel with an EXTRACTED FACTS
                section header so it reads as a named block, not
                as floating chrome. The PulseStructuredFields
                primitive owns its internal layout (Source / Scope
                fact cards); this just adds the canonical n9m9B
                label above it. */}
            {/* 2026-06-04 round 68 (Yuqi "The fields below are an AI
                extraction… can be in an AI icon besides Extracted
                FACTS title"): the inline blue/soft caveat banner
                that used to live inside `<PulseStructuredFields>`
                now collapses to a tooltip-revealed `<Astroid>` AI
                icon next to this section's eyebrow. The right-side
                "AI-extracted · verify before applying" caption is
                also dropped — duplicate signal. Net: a single 14px
                icon carries the entire "this is AI, verify it"
                semantic without claiming a row + chrome. */}
            <section className="flex flex-col gap-3">
              <header className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-semibold tracking-[0.5px] text-text-muted uppercase">
                  <Trans>Extracted facts</Trans>
                </span>
                <Tooltip>
                  <TooltipTrigger
                    render={(props) => (
                      <span
                        className="inline-flex cursor-help items-center text-text-tertiary outline-none"
                        {...props}
                      >
                        <Astroid className="size-3.5" aria-hidden />
                      </span>
                    )}
                  />
                  <TooltipContent>
                    <div className="max-w-[260px] text-left">
                      <Trans>
                        The fields below are an AI extraction of the source bulletin. Open the
                        official source to verify before applying changes to clients.
                      </Trans>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </header>
              <AlertStructuredFields detail={detail} />
            </section>

            {detail.alert.firmImpact !== 'no_current_match' && !canApply ? (
              // ρ ROH-D6: canonical PermissionInlineNotice derives the
              // required-role text from the enum. ψ ROH-D11's hand-rolled
              // Alert+helper alternative was already redundant here.
              <PermissionInlineNotice permission="pulse.apply" currentRole={permissions.role} />
            ) : null}

            {detail.alert.sourceStatus === 'source_revoked' ? (
              <Alert variant="destructive">
                <AlertTitle>
                  <Trans>Source revoked</Trans>
                </AlertTitle>
                <AlertDescription>
                  <Trans>
                    This source is no longer trusted. The historical alert remains visible, but new
                    apply, dismiss, snooze, and undo actions are disabled.
                  </Trans>
                </AlertDescription>
              </Alert>
            ) : null}

            {detail.alert.actionMode === 'due_date_overlay' &&
            permissions.canViewPriorityQueue &&
            deadlineApplyReady ? (
              <ManagerReviewPanel
                canManage={permissions.canManagePriorityReview}
                reviewStatus={priorityReview?.status ?? null}
                selectedCount={stats?.selectedCount ?? 0}
                excludedCount={excludedIds.size}
                needsReviewCount={stats?.needsReviewCount ?? 0}
                isMutating={isMutating}
                onConfirmAll={handleConfirmAllNeedsReview}
                onSave={() =>
                  reviewPriorityMutation.mutate({
                    alertId: detail.alert.id,
                    selectedObligationIds: Array.from(selection),
                    confirmedObligationIds: Array.from(confirmedReviewIds),
                    excludedObligationIds: Array.from(excludedIds),
                  })
                }
              />
            ) : null}

            {detail.alert.actionMode === 'due_date_overlay' && deadlineApplyReady ? (
              <ApplySafetyChecklist />
            ) : null}

            {/* Round 47 (Yuqi #5 — "fulfill the content and make it
                information rich"): PROVENANCE & CONFIDENCE section
                per Pencil n9m9B. The Hero meta row carries
                source · time as a quick caption; this section
                expands provenance into a verifiable surface:
                  • Confidence — AI N% + tier label, color-coded
                  • Source verification — link to original + relative
                    fetch timestamp + sourceStatus tag
                  • Audit ledger note — captures the canonical
                    "every decision recorded" cue from n9m9B's
                    action shelf left cluster.
                Sits at the tail of the body so the CPA's eye lands
                on it just before the sticky action shelf. */}
            {(() => {
              const confPct = Math.round(detail.alert.confidence * 100)
              const confTier = aiConfidenceTier(detail.alert.confidence)
              const confToneClass =
                confTier === 'high'
                  ? 'text-text-success'
                  : confTier === 'medium'
                    ? 'text-text-tertiary'
                    : 'text-text-destructive'
              const confTierLabel =
                confTier === 'high' ? t`HIGH` : confTier === 'medium' ? t`MEDIUM` : t`LOW`
              return (
                <section className="flex flex-col gap-3">
                  <header className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] font-semibold tracking-[0.5px] text-text-muted uppercase">
                      <Trans>Provenance &amp; confidence</Trans>
                    </span>
                  </header>
                  <div className="grid grid-cols-[1fr_1fr] gap-3 rounded-2xl border border-divider-subtle bg-background-default px-6 py-5">
                    {/* Confidence cell */}
                    <div className="flex flex-col gap-1.5 border-r border-divider-subtle pr-6">
                      <span className="font-mono text-[11px] font-semibold tracking-[0.5px] text-text-muted uppercase">
                        <Trans>AI confidence</Trans>
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className={cn('text-2xl font-semibold tabular-nums', confToneClass)}>
                          {confPct}%
                        </span>
                        <span
                          className={cn(
                            'text-xs font-semibold tracking-wide uppercase',
                            confToneClass,
                          )}
                        >
                          {confTierLabel}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary">
                        {confTier === 'low' ? (
                          <Trans>
                            Verify the extract panel matches the official source before applying.
                          </Trans>
                        ) : confTier === 'medium' ? (
                          <Trans>Quick-confirm the extracted fields look right.</Trans>
                        ) : (
                          <Trans>Model is confident — review and apply when ready.</Trans>
                        )}
                      </p>
                    </div>
                    {/* Source / tags cell */}
                    <div className="flex flex-col gap-1.5 pl-2">
                      <span className="font-mono text-[11px] font-semibold tracking-[0.5px] text-text-muted uppercase">
                        <Trans>Source &amp; audit</Trans>
                      </span>
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-text-secondary">
                          <Trans>From</Trans>{' '}
                          {detail.alert.sourceUrl ? (
                            <a
                              href={detail.alert.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-text-accent hover:underline"
                            >
                              {detail.alert.source} ↗
                            </a>
                          ) : (
                            <span className="font-medium text-text-primary">
                              {detail.alert.source}
                            </span>
                          )}
                        </span>
                        <span className="text-text-tertiary">
                          <Trans>Published</Trans>{' '}
                          <span className="tabular-nums">
                            {formatRelativeTime(detail.alert.publishedAt)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              )
            })()}
          </>
        ) : null}
      </div>

      {/* 2026-05-25 (Yuqi Alerts second pass #12): action bar
            promoted from a hairline-bordered footer to a real
            committed surface — stronger top border, panel-section bg,
            and the primary Apply button bumped to default size (was
            sm). Reads as "this is where the decision happens" rather
            than as continuation chrome. */}
      {/* 2026-05-26 (Yuqi twentieth pass): footer made taller +
          more prominent so the sticky action surface reads as
          decision-grade chrome. `min-h-16` (was ~h-12 default) +
          stronger top border + brighter `bg-background-default`
          (white) so it visually separates from the gray
          background-section the body content sat on. */}
      {/* 2026-05-26 (Yuqi thirty-seventh pass — panel padding spec):
            footer inline padding aligned with header/body (px-12, 48px)
            so the left margin is one continuous line top-to-bottom.
            Vertical stays compact (py-4) — the footer is a sticky
            action bar, not a content surface, so 40px would balloon
            it. */}
      {/* 2026-05-26 (Yuqi feedback — "more bottom padding. also
          apply universally to this kind of element/component"):
          `py-4` → `pt-4 pb-6`. Mirrors the `SheetFooter` primitive
          bump and the obligation drawer panel-mode footer so every
          sticky action-strip across the app shares the same 16/24
          vertical rhythm. */}
      {/* 2026-06-04 round 48 (Yuqi push further — action shelf
          rebuild per Pencil n9m9B): left cluster shows three
          keyboard hints (`A` Apply / `S` Snooze / `D` Dismiss) +
          divider + ledger note ("Every decision captured to audit
          ledger") with a shield-check tone, mirroring n9m9B's
          left "qCySM" frame. Right cluster keeps the canonical
          `<DrawerActions>` button set so all the existing
          permission-gated / mutation-state logic stays put. The
          shelf grows to two rows of content + `pt-3 pb-5` so the
          kbd row + buttons don't crowd vertically. */}
      <SheetFooter className="min-h-20 flex-col items-stretch gap-3 border-t-2 border-divider-regular bg-background-default px-12 pt-3 pb-5 sm:flex-col">
        {detail ? (
          <div className="flex flex-wrap items-center gap-3.5 text-text-tertiary">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-divider-regular bg-background-section px-1 font-mono text-[10px] font-semibold text-text-secondary">
                A
              </kbd>
              <Trans>Apply</Trans>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-divider-regular bg-background-section px-1 font-mono text-[10px] font-semibold text-text-secondary">
                S
              </kbd>
              <Trans>Snooze</Trans>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
              <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-divider-regular bg-background-section px-1 font-mono text-[10px] font-semibold text-text-secondary">
                D
              </kbd>
              <Trans>Dismiss</Trans>
            </span>
            <span className="h-3.5 w-px bg-divider-regular" aria-hidden />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-success">
              <ShieldCheckIcon className="size-3 shrink-0" aria-hidden />
              <Trans>Every decision captured to audit ledger</Trans>
            </span>
          </div>
        ) : null}
        <div className="flex w-full">
          {detail ? (
            <DrawerActions
              alertStatus={detail.alert.status}
              sourceStatus={detail.alert.sourceStatus}
              selectionCount={stats?.selectedCount ?? 0}
              actionMode={detail.alert.actionMode}
              firmImpact={detail.alert.firmImpact}
              requiresDeadlineDetails={missingDeadlineDetails}
              canApply={canApply}
              // ROH-D15 — Undo button now gates on `pulse.revert` instead
              // of the `pulse.apply` proxy.
              canRevert={permissions.canRevert}
              canRequestReview={canRequestAlertReview({
                role: permissions.role,
                alertStatus: detail.alert.status,
                sourceStatus: detail.alert.sourceStatus,
              })}
              canApplyReviewed={permissions.canManagePriorityReview}
              reviewedSetReady={deadlineApplyReady && priorityReview?.status === 'reviewed'}
              reverifyIncomplete={reverifyIncomplete}
              isMutating={isMutating}
              onApply={handleApply}
              onMarkReviewed={() => markReviewedMutation.mutate({ alertId: detail.alert.id })}
              onApplyReviewed={() => applyReviewedMutation.mutate({ alertId: detail.alert.id })}
              onRevert={() => revertMutation.mutate({ alertId: detail.alert.id })}
              onReactivate={() => reactivateMutation.mutate({ alertId: detail.alert.id })}
              onRequestReview={() => setReviewDialogOpen(true)}
              onCopyDraft={handleCopyDraft}
            />
          ) : null}
        </div>
      </SheetFooter>
    </>
  )

  const reviewRequestDialog = detail ? (
    <AlertReviewRequestDialog
      open={reviewDialogOpen}
      note={reviewNote}
      pending={requestReviewMutation.isPending}
      onOpenChange={setReviewDialogOpen}
      onChangeNote={setReviewNote}
      onSubmit={() =>
        requestReviewMutation.mutate({
          alertId: detail.alert.id,
          ...(reviewNote.trim() ? { note: reviewNote } : {}),
        })
      }
    />
  ) : null

  // F-041 — verification gate. Surfaces the AI-extracted dates +
  // verbatim source excerpt + a direct link to the official source,
  // and requires the CPA to tick a "verified" checkbox before the
  // Apply mutation can fire. Mounted in both panel and sheet modes
  // so the gate is consistent across the off-route Sheet drawer
  // and the inline /alerts panel.
  const applyVerificationDialog = detail ? (
    <AlertApplyVerificationDialog
      open={applyVerificationOpen}
      detail={detail}
      verified={applyVerified}
      pending={applyMutation.isPending}
      selectedCount={stats?.selectedCount ?? 0}
      onChangeVerified={setApplyVerified}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setApplyVerificationOpen(false)
          setApplyVerified(false)
        }
      }}
      onConfirm={runApply}
    />
  ) : null

  // Panel mode — inline page-column aside. No backdrop, no
  // viewport-fixed positioning, no Sheet/SheetContent wrappers.
  // The h2 inside the body satisfies a11y. The dialogs still
  // render as siblings since they're separate modal overlays.
  //
  // 2026-05-25 (Yuqi panel polish): structural fixes —
  //   • `h-full min-h-0` on the aside so the inner content can
  //     scroll without growing the page (prevents the
  //     left-and-right double-scroll Yuqi flagged).
  //   • Close button (X) pinned top-right of the aside in
  //     panel mode. Sheet mode gets one from the Sheet
  //     primitive's `showCloseButton` automatically; panel
  //     mode needs an explicit one so the close affordance is
  //     obvious.
  //   • Footer (SheetFooter) already has `mt-auto` from the
  //     primitive — it pins to the bottom of the flex column
  //     when middle content is short; when middle is long, the
  //     middle scrolls underneath via its own overflow-y-auto.
  if (mode === 'panel') {
    if (!open) return null
    return (
      <>
        <aside
          aria-label={t`Alert detail`}
          // 2026-05-26 (Yuqi /alerts follow-up #2): dropped
          // the `rounded-lg border` panel chrome. With the frame,
          // the inner body's vertical scrollbar appeared INSIDE
          // the panel border — visually nested chrome that read
          // as "a card with its own scrollbar" rather than a
          // page column. Without the frame the panel reads as a
          // sibling column to the alerts list, and its scrollbar
          // sits flush with the column's right edge. A single
          // left border keeps the visual divider against the
          // list column. `overflow-hidden` retained on the aside
          // so the sticky header/footer don't bleed into the
          // body's scroll surface.
          className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-divider-subtle bg-background-default shadow-subtle"
        >
          {/* 2026-06-01: drawer close button migrated from a hand-
              rolled size-7 ghost-button frame to the canonical
              Button primitive (variant=ghost, size=icon-xs). Same
              28px footprint, same hover+focus chrome, and
              aria-label is preserved verbatim. */}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label={t`Close alert detail`}
            className="absolute right-3 top-3 z-10"
          >
            <XIcon aria-hidden />
          </Button>
          {body}
        </aside>
        {reviewRequestDialog}
        {applyVerificationDialog}
      </>
    )
  }

  // Sheet mode — legacy floating right-side Sheet. Used as the
  // off-route fallback so callers from outside /alerts still
  // see a usable drawer. Sheet provides backdrop + focus trap +
  // Esc + a11y title context for the body's visible h2.
  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <SheetContent
        side="right"
        className="data-[side=right]:top-5 data-[side=right]:right-5 data-[side=right]:bottom-5 data-[side=right]:h-auto data-[side=right]:w-full data-[side=right]:max-w-[100vw] data-[side=right]:rounded-lg sm:data-[side=right]:w-[calc(100vw-2.5rem)] sm:data-[side=right]:max-w-[calc(100vw-2.5rem)] md:data-[side=right]:w-[min(820px,calc(100vw-2.5rem))] md:data-[side=right]:max-w-[min(820px,calc(100vw-2.5rem))] xl:data-[side=right]:w-[min(880px,calc(100vw-2.5rem))] xl:data-[side=right]:max-w-[min(880px,calc(100vw-2.5rem))]"
      >
        {/* sr-only Sheet title + description satisfy Radix Dialog
            a11y requirement (the visible heading is the h2 inside
            `body`). */}
        <SheetTitle className="sr-only">{detail?.alert.title ?? t`Alert detail`}</SheetTitle>
        <SheetDescription className="sr-only">
          <Trans>Alert review panel.</Trans>
        </SheetDescription>
        {body}
      </SheetContent>
      {reviewRequestDialog}
      {applyVerificationDialog}
    </Sheet>
  )
}

export function DrawerActions({
  alertStatus,
  sourceStatus,
  selectionCount,
  actionMode,
  firmImpact,
  requiresDeadlineDetails,
  canApply,
  canRevert,
  canRequestReview,
  canApplyReviewed,
  reviewedSetReady,
  reverifyIncomplete,
  isMutating,
  onApply,
  onMarkReviewed,
  onApplyReviewed,
  onRevert,
  onReactivate,
  onRequestReview,
  onCopyDraft,
}: {
  alertStatus: PulseFirmAlertStatus
  sourceStatus: PulseStatus
  selectionCount: number
  actionMode: PulseDetail['alert']['actionMode']
  firmImpact: PulseDetail['alert']['firmImpact']
  requiresDeadlineDetails: boolean
  canApply: boolean
  // ROH-D15 — gate the Undo button on the dedicated `pulse.revert`
  // permission instead of borrowing `canApply`. Same role set today,
  // but tracks the source-of-truth when the matrix changes.
  canRevert: boolean
  canRequestReview: boolean
  canApplyReviewed: boolean
  reviewedSetReady: boolean
  // 2026-06-03 — true when this review_only alert still has rules that
  // need re-verifying (a candidate / pending_review row in listRules).
  // Gates the "Mark reviewed" button so the alert can't be closed before
  // the underlying rule changes are accepted.
  reverifyIncomplete: boolean
  isMutating: boolean
  onApply: () => void
  onMarkReviewed: () => void
  onApplyReviewed: () => void
  onRevert: () => void
  onReactivate: () => void
  onRequestReview: () => void
  onCopyDraft: () => void
}) {
  const { t } = useLingui()
  const showRevert = REVERTABLE_STATUSES.has(alertStatus)
  const showReactivate = alertStatus === 'reverted'
  const isDismissed = alertStatus === 'dismissed'
  const sourceRevoked = sourceStatus === 'source_revoked'
  // `reviewed` is terminal for a review_only alert — once marked reviewed it
  // sits in history with no further action, so the primary button must not
  // re-fire markReviewed. (due_date_overlay alerts can never reach
  // 'reviewed' — the server rejects markReviewed for them.)
  const isReviewed = alertStatus === 'reviewed'
  const isClosed = alertStatus === 'reverted' || isReviewed || isDismissed || sourceRevoked
  const noActionReview = actionMode === 'review_only' || firmImpact === 'no_current_match'
  const needsDeadlineDetails =
    actionMode === 'due_date_overlay' &&
    firmImpact !== 'no_current_match' &&
    requiresDeadlineDetails
  return (
    // Footer two-cluster layout: reversal actions (Undo / Reactivate)
    // split out to the LEFT cluster, forward actions (Copy email,
    // Request review, Apply) stay on the RIGHT. `justify-between`
    // separates the two groups across the full footer width — Undo
    // lives in the bottom-left corner, away from the primary Apply
    // CTA on the right. Standard footer pattern: reversal/secondary on
    // the left, primary action on the right.
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {showRevert ? (
          <Button
            variant="outline"
            size="sm"
            // ROH-D15 — was `disabled={!canApply || …}` (proxy gate via
            // pulse.apply). Now gates on `canRevert` (pulse.revert) so
            // the permission enum has a real UI call site.
            disabled={!canRevert || isMutating || sourceRevoked}
            onClick={onRevert}
          >
            <RotateCcwIcon data-icon="inline-start" />
            <Trans>Undo (24h)</Trans>
          </Button>
        ) : null}
        {showReactivate ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!canApply || isMutating || sourceRevoked}
            onClick={onReactivate}
          >
            <RotateCcwIcon data-icon="inline-start" />
            <Trans>Reactivate / Re-apply</Trans>
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {firmImpact !== 'no_current_match' ? (
          <Button variant="ghost" size="sm" disabled={isMutating} onClick={onCopyDraft}>
            <MailIcon data-icon="inline-start" />
            <Trans>Copy client email draft</Trans>
          </Button>
        ) : null}
        {canRequestReview ? (
          <Button size="sm" disabled={isMutating} onClick={onRequestReview}>
            <MessageSquareIcon data-icon="inline-start" />
            <Trans>Request review</Trans>
          </Button>
        ) : null}
        {/* 2026-05-25 (Yuqi Alerts second pass #12): primary action
            bumped from size="sm" to default. The other footer buttons
            stay sm so this one reads as the dominant call-to-action. */}
        <Button
          variant={canRequestReview ? 'outline' : undefined}
          disabled={
            !canApply ||
            isMutating ||
            isClosed ||
            // review_only: block "Mark reviewed" until every rule the
            // changed source implicated has been re-verified (accepted).
            (noActionReview && reverifyIncomplete) ||
            (!noActionReview && (needsDeadlineDetails || selectionCount === 0))
          }
          title={
            noActionReview && reverifyIncomplete
              ? t`Re-verify all rules below before marking this alert reviewed.`
              : undefined
          }
          onClick={noActionReview ? onMarkReviewed : onApply}
          aria-busy={isMutating || undefined}
        >
          {noActionReview ? (
            isReviewed ? (
              <Trans>Reviewed</Trans>
            ) : (
              <Trans>Mark reviewed</Trans>
            )
          ) : needsDeadlineDetails ? (
            <Trans>Confirm date and deadlines</Trans>
          ) : selectionCount === 0 ? (
            <Trans>Select deadlines to apply</Trans>
          ) : (
            // 2026-05-26 (Yuqi thirty-second pass): button text
            // simplified to "Apply Deadline Exception" — drop the
            // trailing "to N deadline(s)" count since the selection
            // checkbox above already shows the count. Title case
            // reads as a deliberate decision verb.
            <Trans>Apply Deadline Exception</Trans>
          )}
        </Button>
        {canApplyReviewed && !noActionReview ? (
          <Button
            size="sm"
            disabled={isMutating || isClosed || needsDeadlineDetails || !reviewedSetReady}
            onClick={onApplyReviewed}
          >
            <Trans>Apply reviewed set</Trans>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

type DeadlineDetailsSubmitInput = {
  newDueDate: string
  selectedObligationIds: string[]
  confirmedObligationIds: string[]
  excludedObligationIds: string[]
  note?: string
}

function MissingDetailBadgeLabel({
  field,
}: {
  field: PulseDetail['applyReadiness']['missing'][number]
}) {
  switch (field) {
    case 'original_due_date':
      return <Trans>Original due date</Trans>
    case 'new_due_date':
      return <Trans>New due date</Trans>
    case 'forms':
      return <Trans>Forms</Trans>
    case 'entity_types':
      return <Trans>Entity types</Trans>
    case 'affected_clients':
      return <Trans>Selected deadlines</Trans>
  }
  return null
}

function openNativeDatePicker(event: MouseEvent<HTMLInputElement>) {
  const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void }
  input.focus()
  try {
    input.showPicker?.()
  } catch {
    // Some browsers throw if the picker is unavailable; focus still keeps the field usable.
  }
}

// 2026-06-05 (pre-CI green-up): `AlertActivitySection` was
// declared but never mounted. Deleted to satisfy no-unused-vars;
// the per-alert audit timeline still lives in EntityAuditActivityPanel
// — re-mount it here if a future drawer revision wants the Activity
// section back.

function DeadlineDetailsPanel({
  detail,
  canManage,
  pending,
  selection,
  confirmedReviewIds,
  excludedIds,
  onChangeSelection,
  onToggleNeedsReviewConfirmation,
  onToggleExcluded,
  onSubmit,
}: {
  detail: PulseDetail
  canManage: boolean
  pending: boolean
  selection: ReadonlySet<string>
  confirmedReviewIds: ReadonlySet<string>
  excludedIds: ReadonlySet<string>
  onChangeSelection: (next: Set<string>) => void
  onToggleNeedsReviewConfirmation: (obligationId: string, confirmed: boolean) => void
  onToggleExcluded?: ((obligationId: string, excluded: boolean) => void) | undefined
  onSubmit: (input: DeadlineDetailsSubmitInput) => void
}) {
  const [newDueDate, setNewDueDate] = useState(detail.newDueDate ?? '')
  const [note, setNote] = useState('')
  const deadlineRows = detail.affectedClients.map((row) => ({
    ...row,
    newDueDate: newDueDate || row.newDueDate,
  }))
  const stats = computeSelectionStats(deadlineRows, selection, confirmedReviewIds)
  const selectedObligationIds = Array.from(selection).filter((obligationId) =>
    deadlineRows.some((row) => row.obligationId === obligationId),
  )
  const canSave = canManage && !pending && Boolean(newDueDate) && stats.selectedCount > 0

  return (
    // 2026-06-01: hand-rolled warning panel swapped to the canonical
    // Card primitive (size="sm" tone="warning" radius="md"). The
    // amber border + bg tint, rounded-md chrome, and dense py-4
    // density are now carried by Card's tone + radius axes — no
    // per-call border/bg overrides. Content wrapped in CardContent
    // for the matching px-4 inset. (Card is a `<div>` primitive,
    // so the element changes from <section> to <div>; the existing
    // CardContent + h3 + form scopes the landmark equivalently.)
    <Card size="sm" tone="warning" radius="md">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-text-primary">
            <Trans>Confirm deadline change</Trans>
          </h3>
          <p className="text-sm text-text-secondary">
            <Trans>
              Confirm the new due date and choose the existing deadlines that should receive it.
            </Trans>
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {detail.applyReadiness.missing.map((field) => (
              <Badge key={field} variant="outline" className="bg-background-default">
                <MissingDetailBadgeLabel field={field} />
              </Badge>
            ))}
          </div>
        </div>

        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canSave) return
            onSubmit({
              newDueDate,
              selectedObligationIds,
              confirmedObligationIds: Array.from(confirmedReviewIds).filter((obligationId) =>
                selection.has(obligationId),
              ),
              excludedObligationIds: Array.from(excludedIds),
              ...(note.trim() ? { note: note.trim() } : {}),
            })
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pulse-new-due-date">
              <Trans>New due date</Trans>
            </Label>
            <Input
              id="pulse-new-due-date"
              type="date"
              className="cursor-pointer"
              value={newDueDate}
              disabled={!canManage || pending}
              onClick={openNativeDatePicker}
              onChange={(event) => setNewDueDate(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label>
                <Trans>Choose deadlines to apply this date to</Trans>
              </Label>
              <span className="text-xs text-text-tertiary">
                <Trans>{stats.selectedCount} selected</Trans>
              </span>
            </div>
            {deadlineRows.length > 0 ? (
              <AffectedClientsTable
                rows={deadlineRows}
                selection={selection}
                confirmedReviewIds={confirmedReviewIds}
                excludedIds={excludedIds}
                onChangeSelection={onChangeSelection}
                onToggleNeedsReviewConfirmation={onToggleNeedsReviewConfirmation}
                onToggleExcluded={onToggleExcluded}
                readOnly={!canManage || pending}
              />
            ) : (
              <p className="rounded-md border border-divider-subtle bg-background-default px-4 py-3 text-sm text-text-secondary">
                <Trans>
                  No open deadlines are available for this alert's jurisdiction. Add or reopen a
                  deadline before applying this change.
                </Trans>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pulse-detail-note">
              <Trans>Review note</Trans>
            </Label>
            <Textarea
              id="pulse-detail-note"
              value={note}
              disabled={!canManage || pending}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            {!canManage ? (
              <p className="text-sm text-text-secondary">
                <Trans>Only authorized reviewers can confirm deadline changes.</Trans>
              </p>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={!canSave}>
              {pending ? <Trans>Saving…</Trans> : <Trans>Save deadline selection</Trans>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ManagerReviewPanel({
  canManage,
  reviewStatus,
  selectedCount,
  excludedCount,
  needsReviewCount,
  isMutating,
  onConfirmAll,
  onSave,
}: {
  canManage: boolean
  reviewStatus: string | null
  selectedCount: number
  excludedCount: number
  needsReviewCount: number
  isMutating: boolean
  onConfirmAll: () => void
  onSave: () => void
}) {
  return (
    // 2026-06-01: muted Manager-review panel swapped to the canonical
    // Card primitive (size="xs" tone="muted" radius="md"). The
    // bg-background-section + border-divider-subtle + rounded-md
    // chrome is now Card's tone="muted" + radius="md"; xs density
    // matches the original p-3.
    <Card size="xs" tone="muted" radius="md">
      <CardContent className="grid gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-text-primary">
              <Trans>Manager review</Trans>
            </h3>
            {reviewStatus ? (
              <Badge variant={reviewStatus === 'reviewed' ? 'success' : 'secondary'}>
                {reviewStatus === 'reviewed' ? <Trans>Reviewed</Trans> : <Trans>Open</Trans>}
              </Badge>
            ) : null}
          </div>
          <span className="text-xs tabular-nums text-text-tertiary">
            <Trans>
              {selectedCount} selected · {excludedCount} excluded
            </Trans>
          </span>
        </header>
        <p className="text-sm text-text-secondary">
          <Trans>
            Save the reviewed client set before applying when a Pulse has low confidence, review
            flags, or a preparer escalation.
          </Trans>
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canManage || isMutating || needsReviewCount === 0}
            onClick={onConfirmAll}
          >
            <Trans>Confirm all review-needed</Trans>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canManage || isMutating || selectedCount === 0}
            onClick={onSave}
          >
            <Trans>Save manager review</Trans>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AlertReviewRequestDialog({
  open,
  note,
  pending,
  onOpenChange,
  onChangeNote,
  onSubmit,
}: {
  open: boolean
  note: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onChangeNote: (note: string) => void
  onSubmit: () => void
}) {
  const { t } = useLingui()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              <Trans>Request alert review</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Ask an owner or manager to review and apply this alert. This does not change any
                deadlines.
              </Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="pulse-review-note">
              <Trans>Optional note</Trans>
            </Label>
            <Textarea
              id="pulse-review-note"
              value={note}
              maxLength={500}
              disabled={pending}
              placeholder={t`Add context for the reviewer`}
              onChange={(event) => onChangeNote(event.target.value)}
            />
            <p className="text-xs text-text-tertiary">
              <Trans>{note.length}/500 characters</Trans>
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Trans>Sending…</Trans> : <Trans>Send request</Trans>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 2026-05-26 (F-041 — alert deadline-shift verification gate).
 *
 * Confirmation dialog that intercepts the Apply mutation on a
 * `due_date_overlay` alert. Surfaces the three artifacts the CPA
 * needs to verify the AI was right:
 *   1. The deadline shift the AI proposes (old → new, warning tone).
 *   2. The verbatim source excerpt the AI extracted from.
 *   3. A direct link to the official source authority page so the
 *      CPA can open it in a new tab and read the original notice.
 *
 * The Apply button stays `disabled` until the checkbox is ticked.
 * The label is intentionally verbose — "I read the official source
 * and verified the new deadline date" is a specific claim, not a
 * generic "I understand". This is the language we want to repeat
 * back if there's ever an audit-log review for a wrong filing.
 *
 * Liability framing from the Step-9 audit: a wrong AI date
 * extraction here = the firm files late or early — the highest-
 * stakes single failure mode in the product. One explicit gate
 * is cheap insurance against a class of fundamentally non-
 * undoable mistakes.
 */
function AlertApplyVerificationDialog({
  open,
  detail,
  verified,
  pending,
  selectedCount,
  onChangeVerified,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  detail: PulseDetail
  verified: boolean
  pending: boolean
  selectedCount: number
  onChangeVerified: (next: boolean) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const { t } = useLingui()
  const originalDate = detail.originalDueDate ? formatDate(detail.originalDueDate) : t`Unknown`
  const newDate = detail.newDueDate ? formatDate(detail.newDueDate) : t`Unknown`
  const issued = formatDate(detail.alert.publishedAt)
  const canApply = verified && !pending && selectedCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canApply) return
            onConfirm()
          }}
        >
          <DialogHeader>
            <DialogTitle>
              <Trans>Verify the new deadline before applying</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                The dates below were extracted by AI from the source notice. Open the official
                source and confirm the new date before applying. A wrong date here can cause a late
                or early filing.
              </Trans>
            </DialogDescription>
          </DialogHeader>

          {/* Deadline shift — the consequential fact, displayed
              with the same warning-amber tone as AlertStructuredFields
              so the eye recognizes the same pattern across surfaces. */}
          {/* 2026-06-01: deadline-shift summary panel swapped to the
              canonical Card primitive (size="sm" tone="muted"
              radius="md"). Same muted-section recipe as the manager
              review panel at sm density (p-4 instead of p-3) — the
              bg-background-section + border-divider-subtle chrome is
              now Card's tone="muted" axis. */}
          <Card size="sm" tone="muted" radius="md">
            <CardContent className="grid gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-eyebrow text-text-tertiary">
                  <Trans>Deadline shift</Trans>
                </span>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-base tabular-nums text-text-tertiary line-through decoration-text-tertiary/40">
                    {originalDate}
                  </span>
                  <ArrowRightIcon className="size-4 shrink-0 text-text-warning" aria-hidden />
                  <span className="font-mono text-base font-semibold tabular-nums text-text-warning">
                    {newDate}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-eyebrow text-text-tertiary">
                    <Trans>Authority</Trans>
                  </span>
                  <Button
                    nativeButton={false}
                    variant="link"
                    size="sm"
                    className="h-auto justify-start px-0 text-sm"
                    render={
                      <a href={detail.alert.sourceUrl} target="_blank" rel="noopener noreferrer" />
                    }
                  >
                    {detail.alert.source}
                    <ExternalLinkIcon data-icon="inline-end" />
                  </Button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-eyebrow text-text-tertiary">
                    <Trans>Issued</Trans>
                  </span>
                  <span className="font-mono text-sm tabular-nums text-text-primary">{issued}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verbatim source excerpt — same blockquote treatment as
              AlertStructuredFields so the CPA recognizes "this is the
              raw text the AI extracted from". Cap at 6 lines via
              line-clamp so the dialog stays scannable even when the
              source notice is verbose. */}
          <section className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-eyebrow text-text-tertiary">
              <Trans>Source excerpt</Trans>
            </span>
            <blockquote className="line-clamp-6 break-words rounded-md border border-divider-subtle bg-background-soft px-3 py-2 text-sm italic leading-relaxed text-text-secondary">
              “{detail.sourceExcerpt}”
            </blockquote>
          </section>

          {/* The acknowledgement. Label is a real label-for binding
              so click-on-text toggles the box. Active border bumps to
              text-text-warning so the un-checked state visually says
              "you still need to confirm". */}
          <Label
            htmlFor="pulse-apply-verified"
            className="flex cursor-pointer items-start gap-3 rounded-md border border-divider-regular bg-background-default px-3 py-3 transition-colors hover:border-text-tertiary has-[input:checked]:border-state-accent-active-alt has-[input:checked]:bg-state-accent-active-alt/5"
          >
            <Checkbox
              id="pulse-apply-verified"
              checked={verified}
              disabled={pending}
              onCheckedChange={(next) => onChangeVerified(next)}
              className="mt-0.5"
            />
            <span className="text-sm text-text-primary">
              <Trans>I have read the official source and verified the new deadline date.</Trans>
            </span>
          </Label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={!canApply} aria-busy={pending}>
              {pending ? <Trans>Applying…</Trans> : <Trans>Apply deadline shift</Trans>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function buildClientEmailDraft(detail: PulseDetail, selection: ReadonlySet<string>): string {
  const affectedClients = detail.affectedClients
    .filter((row) => selection.has(row.obligationId))
    .map((row) => `- ${row.clientName}: ${row.currentDueDate} -> ${row.newDueDate ?? 'review'}`)
  return [
    `Subject: ${detail.alert.actionMode === 'review_only' ? 'Tax source review' : 'Deadline update'}: ${detail.alert.title}`,
    '',
    'Hi,',
    '',
    detail.alert.summary,
    '',
    ...(detail.alert.actionMode === 'due_date_overlay'
      ? [`Original due date: ${detail.originalDueDate}`, `New due date: ${detail.newDueDate}`]
      : ['Action: Review official source change.']),
    '',
    'Affected client deadlines:',
    ...(affectedClients.length > 0
      ? affectedClients
      : ['- No client-specific deadline is selected yet.']),
    '',
    `Source: ${detail.alert.sourceUrl}`,
    '',
    'This is a draft. Please review before sending.',
  ].join('\n')
}

function SelectionSummary({ stats }: { stats: SelectionStats }) {
  return (
    <span className="text-sm text-text-tertiary">
      <Trans>
        {stats.selectedCount} selected · {stats.selectableCount} eligible · {stats.needsReviewCount}{' '}
        need review
      </Trans>
    </span>
  )
}

function ApplySafetyChecklist() {
  const items: Array<[string, React.ReactNode]> = [
    ['audit', <Trans key="audit">Logged to audit trail</Trans>],
    ['evidence', <Trans key="evidence">Alert evidence linked to each deadline</Trans>],
    [
      'email',
      <Trans key="email">Owner and manager digest will be sent when email is available</Trans>,
    ],
    ['undo', <Trans key="undo">Undo available for 24 hours</Trans>],
  ]
  return (
    <ul className="grid gap-1 rounded-lg border border-dashed border-divider-regular bg-background-section p-3 text-sm text-text-secondary">
      {items.map(([key, node]) => (
        <li key={key} className="flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-text-success" />
          {node}
        </li>
      ))}
    </ul>
  )
}

function DetailHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
    </div>
  )
}

// 2026-05-26 (Yuqi thirty-sixth pass): mirror of `changeKindLabel`
// from AlertCard / AlertsListPage. Kept local-to-file
// (matches the existing duplicated-label pattern in those two
// files) so the panel header pill reads the same as the card
// pill. If this label diverges across all three sites in the
// future, promote to a shared util at
// `apps/app/src/features/alerts/components/alert-change-kind.ts`.
// 2026-06-05 (pre-CI green-up): `drawerChangeKindLabel` was a
// drawer-local duplicate of the canonical `changeKindLabel` exported
// from `components/PulseChangeKindChip.ts`. Deleted to satisfy
// no-unused-vars; consumers reuse the canonical helper.
