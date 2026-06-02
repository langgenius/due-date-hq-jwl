import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  ExternalLinkIcon,
  MailIcon,
  MessageSquareIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { PulseFirmAlertStatus, PulseStatus } from '@duedatehq/contracts'
import type { PulseDetail } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
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

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDate } from '@/lib/utils'
import { requiredRolesLabel } from '@/lib/required-roles-label'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { EntityAuditActivityPanel } from '@/features/audit/entity-audit-activity-panel'
import { PermissionInlineNotice } from '@/features/permissions/permission-gate'
import { getJurisdictionName } from '@/components/primitives/state-badge'
import { aiConfidenceTier, isLowAiConfidence } from '@/features/_surface-vocabulary/ai-confidence'

import { AffectedClientsTable } from './components/AffectedClientsTable'
// Step 9 retired `AlertConfidencePill` in favor of the canonical
// `aiConfidenceTier` / `isLowAiConfidence` helpers imported above.
// `AlertConfidencePill` kept — still rendered in the drawer header.
import { AlertConfidencePill } from './components/AlertConfidencePill'
import { AlertDecisionStatusNotice } from './components/AlertReadinessStatus'
import { AlertSourceBadge } from './components/AlertSourceBadge'
import { AlertSourceStatusBadge } from './components/AlertSourceStatusBadge'
import { AlertStatusBadge } from './components/AlertStatusBadge'
import { AlertStructuredFields } from './components/AlertStructuredFields'
import { ReverifyRulesSection } from './components/ReverifyRulesSection'
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
      <SheetHeader className="border-b border-divider-subtle px-12 py-10">
        {detailQuery.isLoading || !detail ? (
          <DetailHeaderSkeleton />
        ) : (
          // Header redesign (Yuqi #9, #12, #13, #14, #15, #19):
          //  - Title promoted to text-2xl so it actually reads as
          //    the h1 of the drawer.
          //  - Status badges row (source + status) sits BELOW the
          //    title at text-sm — quieter chrome, not the
          //    headline.
          //  - SheetDescription was duplicating the title's text
          //    in most cases. Dropped — the title carries the
          //    message, and the AI-confidence alert below
          //    explains *why* this needs attention.
          //  - AlertConfidencePill dropped from this row when
          //    confidence is low — it gets absorbed into the
          //    "Low AI confidence" alert below so the same
          //    concept appears once, not twice (#19). For
          //    healthy confidence it stays here as a quiet info
          //    chip.
          (() => {
            // 2026-05-26 (Yuqi /alerts third pass #7): drawer now
            // uses the same LOW/MEDIUM/HIGH qualitative confidence
            // badges as the AlertCard, so the two surfaces match.
            // Previously the drawer header rendered the numeric
            // `AI 96%` AlertConfidencePill while the list card read
            // "HIGH CONFIDENCE" — same alert showed two different
            // confidence shapes side-by-side.
            // 2026-05-26 (Step 9 AI Visibility Audit F-002): tier
            // classification now goes through the canonical helper
            // so the threshold ladder is product-wide consistent.
            const tier = aiConfidenceTier(detail.alert.confidence)
            const lowConfidence = tier === 'low'
            const mediumConfidence = tier === 'medium'
            return (
              // 2026-05-26 (Yuqi /alerts #3): removed the leading
              // PulsingDot. Yuqi flagged "where does this dot come
              // from?" — the dot was a tone indicator
              // (critical/warning/info) that duplicated signal
              // already carried by the AlertStatusBadge ("New"),
              // LowConfidenceBadge (when applicable), and the
              // AlertSourceStatusBadge below the title. Removing it
              // declutters the header without losing any unique
              // signal.
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-col">
                    {/* 2026-05-25 (Yuqi /alerts #9 — drawer →
                          panel): SheetTitle / SheetDescription
                          replaced with plain h2 + p so this same
                          body renders in both Sheet root and an
                          inline <aside> (panel mode). The
                          Sheet-wrapped render path still satisfies
                          a11y via sr-only SheetTitle +
                          SheetDescription added on the outer
                          wrapper below. */}
                    {/* 2026-05-26 (Yuqi /alerts eighth pass #3):
                          drawer h1 + summary + badge row bumped up
                          one step. Yuqi flagged the header as too
                          small — at the panel's 520px+ width the
                          previous text-xl title and text-sm summary
                          read as secondary chrome. text-2xl/text-base
                          puts the title at proper h1 weight and the
                          summary at body-read scale, so the header
                          reads as the drawer's anchor. */}
                    {/* 2026-05-26 (Yuqi sixteenth pass #4): state /
                          jurisdiction badge added as a kicker above
                          the title. Yuqi flagged "where is the
                          state?" — the drawer header had no
                          jurisdiction signal even though the list
                          card leads with it. Same framed-pill
                          treatment the card uses (StateBadge + 2-letter
                          code). */}
                    {/* 2026-05-26 (Yuqi seventeenth pass #2): include
                          the full state name after the 2-letter code
                          ("CA California") so the kicker reads as a
                          complete jurisdiction tag in the drawer
                          header where there's more room than on the
                          card. */}
                    {/* 2026-05-29 (Yuqi /clients round 1 — "remove the
                        state icon everywhere"): dropped the SVG
                        StateBadge from the jurisdiction kicker. The
                        bordered pill + code + jurisdiction name
                        carries the identity on its own; the SVG was
                        adding visual weight without adding signal. */}
                    <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-sm border border-divider-regular bg-background-default px-2 py-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-text-primary">
                        {detail.jurisdiction}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {getJurisdictionName(detail.jurisdiction)}
                      </span>
                    </span>
                    <h2 className="text-2xl font-semibold leading-tight text-text-primary">
                      {detail.alert.title}
                    </h2>
                    {detail.alert.summary &&
                    detail.alert.summary.trim() !== detail.alert.title.trim() ? (
                      // 2026-05-26 (Yuqi forty-fourth pass — body
                      // unification): drawer summary paragraph dropped
                      // text-base → text-sm. Canonical body across
                      // Today / Alerts / Deadlines is text-sm; the
                      // text-base here was a one-off bump that made
                      // the drawer's intro paragraph loud against
                      // an already-prominent text-2xl title.
                      <p className="mt-2 text-sm text-text-secondary">{detail.alert.summary}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {/* 2026-05-26 (Yuqi thirty-sixth pass): change-kind
                        chip (e.g. "Deadline Shifted", "Filing Rule
                        Changed") lifted into the panel header row,
                        leading position. The card surfaces this
                        prominently next to the title — without it
                        here, the panel header drops a critical
                        signal that the row of pills is communicating
                        ("what changed?"). Sits FIRST on the row so
                        the eye reads:
                          [what changed] · [where to verify] · [status] · [confidence]
                        Same accent-tinted framed pill as the card
                        (`bg-state-accent-hover text-text-accent`) so
                        the two surfaces speak the same vocabulary. */}
                    <span className="inline-flex h-6 shrink-0 items-center rounded-sm bg-state-accent-hover px-1.5 text-xs font-semibold uppercase tracking-wide text-text-accent">
                      {drawerChangeKindLabel(detail.alert.changeKind)}
                    </span>
                    <AlertSourceBadge
                      source={detail.alert.source}
                      sourceUrl={detail.alert.sourceUrl}
                    />
                    <AlertStatusBadge status={detail.alert.status} />
                    <AlertSourceStatusBadge status={detail.alert.sourceStatus} />
                    {/* 2026-05-26 (Yuqi seventeenth pass #3): drawer
                          confidence pill matches the card exactly —
                          drop the "Confidence" word, add the Astroid
                          icon, full-radius h-6 chip. Same component
                          shape as the card so the two surfaces read
                          as one design language. Low confidence is
                          still signalled via the explicit Alert block
                          below so the chip doesn't double up. */}
                    {/* 2026-05-26 (Yuqi thirty-first pass — color
                          parity): drawer pill now uses the exact
                          same tone family as the card pill —
                          MEDIUM neutral gray (broke the warning-amber
                          collision with the needs-review client
                          chip), HIGH info blue (broke the success-green
                          collision with the Applied / Reviewed
                          status pills). */}
                    {!lowConfidence ? (
                      <AlertConfidencePill confidence={mediumConfidence ? 'medium' : 'high'} />
                    ) : null}
                  </div>
                </div>
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
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-12 pt-10 pb-24">
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
                <header className="flex items-baseline justify-between">
                  {/* 2026-05-25 (info-icon audit): unwrapped —
                      re-defining "Alerts" inside an alert drawer
                      is noise. The list page (AlertsListPage)
                      keeps the canonical alert explainer. */}
                  {/* 2026-05-26 (Yuqi drawer canonical — body section
                      heading): dropped `text-base font-semibold` →
                      `text-sm font-semibold`. Per the drawer canonical,
                      body-internal section headings sit at text-sm
                      (quieter than the drawer's h1 + the FactCard's
                      own section title). Body sections should read as
                      organized chunks, not as competing h2s. */}
                  <h3 className="text-sm font-semibold text-text-primary">
                    <Trans>Affected clients</Trans>
                    {detail.affectedClients.length > 0 ? (
                      <span className="ml-1.5 text-text-tertiary">
                        ({detail.affectedClients.length})
                      </span>
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

            <AlertStructuredFields detail={detail} />

            {detail.reverifyRuleIds.length > 0 ? (
              <ReverifyRulesSection
                reverifyRuleIds={detail.reverifyRuleIds}
                onReverified={() => {
                  void queryClient.invalidateQueries({ queryKey: orpc.pulse.key() })
                }}
              />
            ) : null}

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

            <AlertActivitySection alertId={detail.alert.id} />
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
      <SheetFooter className="min-h-16 border-t-2 border-divider-regular bg-background-default px-12 pt-4 pb-6">
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
          <button
            type="button"
            onClick={onClose}
            aria-label={t`Close alert detail`}
            className="absolute right-3 top-3 z-10 inline-flex size-7 items-center justify-center rounded-md text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
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
  isMutating: boolean
  onApply: () => void
  onMarkReviewed: () => void
  onApplyReviewed: () => void
  onRevert: () => void
  onReactivate: () => void
  onRequestReview: () => void
  onCopyDraft: () => void
}) {
  const showRevert = REVERTABLE_STATUSES.has(alertStatus)
  const showReactivate = alertStatus === 'reverted'
  const isDismissed = alertStatus === 'dismissed'
  const sourceRevoked = sourceStatus === 'source_revoked'
  const isClosed = alertStatus === 'reverted' || isDismissed || sourceRevoked
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
            (!noActionReview && (needsDeadlineDetails || selectionCount === 0))
          }
          onClick={noActionReview ? onMarkReviewed : onApply}
          aria-busy={isMutating || undefined}
        >
          {noActionReview ? (
            <Trans>Mark reviewed</Trans>
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

function AlertActivitySection({ alertId }: { alertId: string }) {
  // Per-alert audit timeline — review-requested / reviewed / dismissed /
  // snoozed / reactivated events (entityType 'pulse_firm_alert'). Closes the
  // "Pulse alert drawer → Activity" surface gap. (Per-obligation apply/revert
  // rows are keyed to pulse_application and surface in the affected-clients
  // flow, not here.)
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-primary">
        <Trans>Activity</Trans>
      </h3>
      <EntityAuditActivityPanel
        entityType="pulse_firm_alert"
        entityId={alertId}
        emptyTitle={<Trans>No audited activity yet</Trans>}
        emptyDescription={
          <Trans>Review, dismiss, snooze, and reactivate events for this alert appear here.</Trans>
        }
      />
    </section>
  )
}

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
    <section className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/5 p-4">
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
    </section>
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
    <section className="grid gap-3 rounded-md border border-divider-subtle bg-background-section p-3">
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
          Save the reviewed client set before applying when an alert has low confidence, review
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
    </section>
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
          <section className="grid gap-3 rounded-md border border-divider-subtle bg-background-section p-4">
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
          </section>

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
function drawerChangeKindLabel(kind: PulseDetail['alert']['changeKind']) {
  switch (kind) {
    case 'deadline_shift':
      return <Trans>Deadline Shifted</Trans>
    case 'filing_requirement':
      return <Trans>Filing Rule Changed</Trans>
    case 'applicability_scope':
      return <Trans>Scope Changed</Trans>
    case 'form_instruction':
      return <Trans>Form Updated</Trans>
    case 'source_status':
      return <Trans>Source Status</Trans>
    case 'rule_source_drift':
      return <Trans>Source Changed</Trans>
    case 'new_obligation':
      return <Trans>New Rule Added</Trans>
    case 'other':
      return <Trans>Other Change</Trans>
  }
  return kind
}
