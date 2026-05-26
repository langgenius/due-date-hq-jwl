import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { Astroid, MailIcon, MessageSquareIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { FirmPublic, FirmRole, PulseFirmAlertStatus, PulseStatus } from '@duedatehq/contracts'
import type { PulseDetail } from '@duedatehq/contracts'
import { hasFirmPermission } from '@duedatehq/core/permissions'
import { planHasFeature } from '@duedatehq/core/plan-entitlements'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Label } from '@duedatehq/ui/components/ui/label'
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
import { ConceptLabel } from '@/features/concepts/concept-help'
import { StateBadge, getJurisdictionName } from '@/components/primitives/state-badge'

import { AffectedClientsTable } from './components/AffectedClientsTable'
import { isVeryLowPulseConfidence } from './components/PulseConfidenceBadge'
import { PulseReasonDialog } from './components/PulseReasonDialog'
import { PulseSourceBadge } from './components/PulseSourceBadge'
import { PulseSourceStatusBadge } from './components/PulseSourceStatusBadge'
import { PulseStatusBadge } from './components/PulseStatusBadge'
import { PulseStructuredFields } from './components/PulseStructuredFields'
import {
  usePulseInvalidation,
  usePulseDetailQueryOptions,
  usePulsePriorityQueueQueryOptions,
} from './api'
import { isPulseConflict, pulseErrorDescriptor } from './lib/error-mapping'
import {
  computeSelectionStats,
  confirmAllNeedsReview,
  defaultSelection,
  excludeFromSelection,
  type SelectionStats,
} from './lib/selection'

interface PulseDetailDrawerProps {
  alertId: string | null
  onClose: () => void
  /**
   * 2026-05-25 (Yuqi /rules/pulse #9 — drawer → page panel):
   * - `'sheet'` (default): legacy floating right-side Sheet with
   *   backdrop. Used as the off-route fallback so callers that
   *   open the drawer from outside /rules/pulse (e.g. the
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

const REVERTABLE_STATUSES: ReadonlySet<PulseFirmAlertStatus> = new Set([
  'applied',
  'partially_applied',
])
const REVIEW_UNAVAILABLE_STATUSES: ReadonlySet<PulseFirmAlertStatus> = new Set([
  'dismissed',
  'reverted',
  'reviewed',
])
const SHOW_PRIORITY_REVIEW_UI = false

// 2026-05-25 (Yuqi critique B): the drawer used to compute its own
// tone via `drawerTone(status, confidence)` while the dashboard
// `NeedsAttentionCard` used a different per-impact formula — so the
// same alert showed green outside and red inside. Both sites now
// call `pulseAlertTone(alert)` so they always agree.

export function canRequestPulseReview(input: {
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

// Read RBAC from the firms cache the layout already primed. The Apply CTA stays
// disabled until we know the user is Owner / Manager (matches server permissions).
function usePulsePermissions(): {
  role: FirmRole | null
  canApply: boolean
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
      canViewPriorityQueue: false,
      canManagePriorityReview: false,
    }
  }
  const current = firms.find((firm) => firm.isCurrent) ?? firms[0]
  if (!current) {
    return {
      role: null,
      canApply: false,
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
  return {
    role: current.role,
    canApply,
    canViewPriorityQueue: priorityEnabled,
    canManagePriorityReview: priorityEnabled && canApply,
  }
}

// Pulse detail drawer: AI summary + structured fields + affected clients + apply
// / dismiss / revert. Apply is the safer path because the server writes audit +
// evidence + email outbox in one transaction (see packages/db/src/repo/pulse.ts).
export function PulseDetailDrawer({ alertId, onClose, mode = 'sheet' }: PulseDetailDrawerProps) {
  const { t, i18n } = useLingui()
  const queryClient = useQueryClient()
  const open = alertId !== null
  // 2026-05-26 (Yuqi sidebar mental-model pass): same pattern as the
  // /deadlines obligation drawer (see routes/obligations.tsx). When the
  // pulse alert drawer is open it needs horizontal room — auto-collapse
  // the sidebar while open, restore on close. The user's persistent
  // collapse preference (localStorage) is untouched; closing the drawer
  // restores whatever they last chose. If a consumer renders this
  // drawer outside SidebarProvider (e.g. the off-route
  // `PulseDrawerProvider` mounted above AppShell in `_layout.tsx`),
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
  const detailQuery = useQuery(usePulseDetailQueryOptions(alertId))
  const detail = detailQuery.data
  const permissions = usePulsePermissions()
  const canApply = permissions.canApply
  const priorityQueueQuery = useQuery(
    usePulsePriorityQueueQueryOptions(100, permissions.canViewPriorityQueue),
  )
  const priorityReview =
    priorityQueueQuery.data?.items.find((item) => item.alert.id === detail?.alert.id)?.review ??
    null
  const invalidate = usePulseInvalidation()

  const [selection, setSelection] = useState<Set<string>>(() => new Set())
  const [confirmedReviewIds, setConfirmedReviewIds] = useState<Set<string>>(() => new Set())
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set())
  const [resetKey, setResetKey] = useState<string | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  // Reason capture for destructive Pulse actions (dismiss / snooze).
  // The PDF guide flags reason-on-override as a core audit requirement.
  const [reasonAction, setReasonAction] = useState<'dismiss' | 'snooze' | 'reviewed' | null>(null)
  const [reasonText, setReasonText] = useState('')

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
    setSelection(
      priorityReview
        ? new Set(priorityReview.selectedObligationIds)
        : defaultSelection(detail.affectedClients),
    )
    setConfirmedReviewIds(new Set(priorityReview?.confirmedObligationIds ?? []))
    setExcludedIds(new Set(priorityReview?.excludedObligationIds ?? []))
    setReviewDialogOpen(false)
    setReviewNote('')
    setResetKey(nextResetKey)
  }
  if (!open && resetKey !== null) {
    setSelection(new Set())
    setConfirmedReviewIds(new Set())
    setExcludedIds(new Set())
    setReviewDialogOpen(false)
    setReviewNote('')
    setResetKey(null)
  }

  const stats = useMemo<SelectionStats | null>(
    () =>
      detail ? computeSelectionStats(detail.affectedClients, selection, confirmedReviewIds) : null,
    [detail, selection, confirmedReviewIds],
  )

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
        toast.error(t`Couldn't undo Pulse`, {
          description: i18n._(pulseErrorDescriptor(err)),
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
          description: i18n._(pulseErrorDescriptor(err)),
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
        const description = i18n._(pulseErrorDescriptor(err)) || (rpcErrorMessage(err) ?? '')
        if (isPulseConflict(err)) {
          toast.error(t`Couldn't apply Pulse`, {
            description,
            action: {
              label: t`Refresh`,
              onClick: () => void detailQuery.refetch(),
            },
          })
          return
        }
        toast.error(t`Couldn't apply Pulse`, { description })
      },
    }),
  )

  const dismissMutation = useMutation(
    orpc.pulse.dismiss.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert dismissed`)
        setReasonAction(null)
        setReasonText('')
        invalidate()
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't dismiss alert`, {
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const snoozeMutation = useMutation(
    orpc.pulse.snooze.mutationOptions({
      onSuccess: () => {
        toast.success(t`Alert snoozed`)
        setReasonAction(null)
        setReasonText('')
        invalidate()
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't snooze alert`, {
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const markReviewedMutation = useMutation(
    orpc.pulse.markReviewed.mutationOptions({
      onSuccess: () => {
        toast.success(t`Pulse marked reviewed`)
        setReasonAction(null)
        setReasonText('')
        invalidate()
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't mark Pulse reviewed`, {
          description: i18n._(pulseErrorDescriptor(err)),
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
        toast.success(t`Review requested`, {
          description: t`Owner and manager notifications and emails will be sent.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't request review`, {
          description: i18n._(pulseErrorDescriptor(err)),
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
          description: i18n._(pulseErrorDescriptor(err)),
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
          description: i18n._(pulseErrorDescriptor(err)),
        })
      },
    }),
  )

  const isMutating =
    applyReviewedMutation.isPending ||
    applyMutation.isPending ||
    dismissMutation.isPending ||
    markReviewedMutation.isPending ||
    reviewPriorityMutation.isPending ||
    reactivateMutation.isPending ||
    requestReviewMutation.isPending ||
    revertMutation.isPending ||
    snoozeMutation.isPending

  const handleApply = () => {
    if (!detail) return
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

  // 2026-05-25 (Yuqi /rules/pulse #9 — drawer → page panel):
  // outermost render shape is conditional on `mode`. The body
  // (header + content + footer) is shared between both modes so
  // every Pulse-detail surface — the floating Sheet (off-route
  // legacy) AND the inline page panel on /rules/pulse — uses
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
            Pulse panel reads as a roomy paper-document surface, not as
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
          //  - PulseConfidenceBadge dropped from this row when
          //    confidence is low — it gets absorbed into the
          //    "Low AI confidence" alert below so the same
          //    concept appears once, not twice (#19). For
          //    healthy confidence it stays here as a quiet info
          //    chip.
          (() => {
            const lowConfidence = isVeryLowPulseConfidence(detail.alert.confidence)
            // 2026-05-26 (Yuqi /rules/pulse third pass #7): drawer now
            // uses the same LOW/MEDIUM/HIGH qualitative confidence
            // badges as the PulseAlertCard, so the two surfaces match.
            // Previously the drawer header rendered the numeric
            // `AI 96%` PulseConfidenceBadge while the list card read
            // "HIGH CONFIDENCE" — same alert showed two different
            // confidence shapes side-by-side. Thresholds match the
            // card: < 0.5 LOW, 0.5–0.85 MEDIUM, ≥ 0.85 HIGH.
            const mediumConfidence = !lowConfidence && detail.alert.confidence < 0.85
            return (
              // 2026-05-26 (Yuqi /rules/pulse #3): removed the leading
              // PulsingDot. Yuqi flagged "where does this dot come
              // from?" — the dot was a tone indicator
              // (critical/warning/info) that duplicated signal
              // already carried by the PulseStatusBadge ("New"),
              // LowConfidenceBadge (when applicable), and the
              // PulseSourceStatusBadge below the title. Removing it
              // declutters the header without losing any unique
              // signal.
              <div className="flex items-start gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-col">
                    {/* 2026-05-25 (Yuqi /rules/pulse #9 — drawer →
                          panel): SheetTitle / SheetDescription
                          replaced with plain h2 + p so this same
                          body renders in both Sheet root and an
                          inline <aside> (panel mode). The
                          Sheet-wrapped render path still satisfies
                          a11y via sr-only SheetTitle +
                          SheetDescription added on the outer
                          wrapper below. */}
                    {/* 2026-05-26 (Yuqi /rules/pulse eighth pass #3):
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
                    <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-sm border border-divider-regular bg-background-default py-0.5 pl-0.5 pr-2">
                      <StateBadge code={detail.jurisdiction} size="xs" aria-hidden />
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
                    <PulseSourceBadge
                      source={detail.alert.source}
                      sourceUrl={detail.alert.sourceUrl}
                    />
                    <PulseStatusBadge status={detail.alert.status} />
                    <PulseSourceStatusBadge status={detail.alert.sourceStatus} />
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
                      mediumConfidence ? (
                        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-divider-subtle bg-background-section px-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
                          <Astroid className="size-3" aria-hidden />
                          <Trans>Medium</Trans>
                        </span>
                      ) : (
                        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-state-info-hover px-2 text-xs font-medium uppercase tracking-wide text-text-accent">
                          <Astroid className="size-3" aria-hidden />
                          <Trans>High</Trans>
                        </span>
                      )
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
              {i18n._(pulseErrorDescriptor(detailQuery.error))}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void detailQuery.refetch()}
              >
                <Trans>Retry</Trans>
              </button>
            </AlertDescription>
          </Alert>
        ) : null}

        {detail ? (
          <>
            {/* 2026-05-25 (Yuqi #10): Affected clients moved to
                  the top of the drawer body. This is THE most
                  important question the CPA brings to a Pulse alert
                  — "does this hit my clients?". Previously it was
                  buried under structured fields + low-confidence
                  alerts, forcing CPAs to scroll past 200+ pixels of
                  metadata before seeing the impact list. Empty case
                  (#10): if the alert has no affected clients, say
                  so explicitly instead of just hiding the table. */}
            {detail.alert.actionMode === 'due_date_overlay' ? (
              <section className="flex flex-col gap-3">
                <header className="flex items-baseline justify-between">
                  {/* 2026-05-25 (info-icon audit): unwrapped —
                      re-defining "Pulse" inside a Pulse drawer
                      is noise. The list page (AlertsListPage)
                      keeps the canonical pulse explainer. */}
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
                    readOnly={!canApply}
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
            {isVeryLowPulseConfidence(detail.alert.confidence) ? (
              // 2026-05-26 (Yuqi eighteenth pass): icon removed from
              // this Alert. With the icon gone the Alert primitive
              // falls back to its non-icon layout (single column),
              // so the title + description align on the same left
              // edge without the column-offset behaviour.
              <Alert variant="warning">
                <AlertTitle>
                  <ConceptLabel concept="aiConfidence">
                    <Trans>
                      AI confidence {Math.round(detail.alert.confidence * 100)}% — review source
                      before applying
                    </Trans>
                  </ConceptLabel>
                </AlertTitle>
                <AlertDescription>
                  <Trans>
                    The model extracted these fields with low confidence. Compare against the source
                    excerpt below and the structured scope before pushing changes to clients.
                  </Trans>
                </AlertDescription>
              </Alert>
            ) : null}

            <PulseStructuredFields detail={detail} />

            {!canApply ? (
              <Alert>
                <AlertTitle>
                  <Trans>Read-only view</Trans>
                </AlertTitle>
                <AlertDescription>
                  <Trans>Only owners and managers can apply Pulse changes.</Trans>
                </AlertDescription>
              </Alert>
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

            {detail.alert.actionMode === 'due_date_overlay' && permissions.canViewPriorityQueue ? (
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

            {detail.alert.actionMode === 'due_date_overlay' ? <ApplySafetyChecklist /> : null}
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
            canApply={canApply}
            canRequestReview={canRequestPulseReview({
              role: permissions.role,
              alertStatus: detail.alert.status,
              sourceStatus: detail.alert.sourceStatus,
            })}
            canApplyReviewed={permissions.canManagePriorityReview}
            reviewedSetReady={priorityReview?.status === 'reviewed'}
            isMutating={isMutating}
            onApply={handleApply}
            onMarkReviewed={() => {
              setReasonAction('reviewed')
              setReasonText('')
            }}
            onApplyReviewed={() => applyReviewedMutation.mutate({ alertId: detail.alert.id })}
            onDismiss={() => {
              setReasonAction('dismiss')
              setReasonText('')
            }}
            onSnooze={() => {
              setReasonAction('snooze')
              setReasonText('')
            }}
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
    <PulseReviewRequestDialog
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

  const reasonDialog = detail ? (
    <PulseReasonDialog
      action={reasonAction}
      reason={reasonText}
      pending={
        dismissMutation.isPending || snoozeMutation.isPending || markReviewedMutation.isPending
      }
      onChangeReason={setReasonText}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setReasonAction(null)
          setReasonText('')
        }
      }}
      onSubmit={() => {
        const trimmed = reasonText.trim()
        if (!trimmed || !reasonAction) return
        if (reasonAction === 'dismiss') {
          dismissMutation.mutate({ alertId: detail.alert.id, reason: trimmed })
        } else if (reasonAction === 'snooze') {
          snoozeMutation.mutate({
            alertId: detail.alert.id,
            until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            reason: trimmed,
          })
        } else {
          markReviewedMutation.mutate({ alertId: detail.alert.id, reason: trimmed })
        }
      }}
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
          aria-label={t`Pulse alert detail`}
          // 2026-05-26 (Yuqi /rules/pulse follow-up #2): dropped
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
        {reasonDialog}
      </>
    )
  }

  // Sheet mode — legacy floating right-side Sheet. Used as the
  // off-route fallback so callers from outside /rules/pulse still
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
        <SheetTitle className="sr-only">{detail?.alert.title ?? t`Pulse alert detail`}</SheetTitle>
        <SheetDescription className="sr-only">
          <Trans>Pulse alert review panel.</Trans>
        </SheetDescription>
        {body}
      </SheetContent>
      {reviewRequestDialog}
      {reasonDialog}
    </Sheet>
  )
}

function DrawerActions({
  alertStatus,
  sourceStatus,
  selectionCount,
  actionMode,
  canApply,
  canRequestReview,
  canApplyReviewed,
  reviewedSetReady,
  isMutating,
  onApply,
  onMarkReviewed,
  onApplyReviewed,
  onDismiss,
  onSnooze,
  onRevert,
  onReactivate,
  onRequestReview,
  onCopyDraft,
}: {
  alertStatus: PulseFirmAlertStatus
  sourceStatus: PulseStatus
  selectionCount: number
  actionMode: PulseDetail['alert']['actionMode']
  canApply: boolean
  canRequestReview: boolean
  canApplyReviewed: boolean
  reviewedSetReady: boolean
  isMutating: boolean
  onApply: () => void
  onMarkReviewed: () => void
  onApplyReviewed: () => void
  onDismiss: () => void
  onSnooze: () => void
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
  const reviewOnly = actionMode === 'review_only'
  return (
    // 2026-05-26 (Yuqi forty-fourth pass — footer two-cluster
    // layout): reversal actions (Undo / Reactivate) split out to
    // the LEFT cluster, all forward actions (Copy email, Request
    // review, Dismiss, Snooze, Apply) stay on the RIGHT.
    // `justify-between` separates the two groups across the full
    // footer width — Undo lives in the bottom-left corner, away
    // from the primary Apply CTA on the right. Standard footer
    // pattern: reversal/secondary on the left, primary action on
    // the right.
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {showRevert ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!canApply || isMutating || sourceRevoked}
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
        <Button variant="ghost" size="sm" disabled={isMutating} onClick={onCopyDraft}>
          <MailIcon data-icon="inline-start" />
          <Trans>Copy client email draft</Trans>
        </Button>
        {canRequestReview ? (
          <Button size="sm" disabled={isMutating} onClick={onRequestReview}>
            <MessageSquareIcon data-icon="inline-start" />
            <Trans>Request review</Trans>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          disabled={!canApply || isMutating || isClosed}
          onClick={onDismiss}
        >
          <Trans>Dismiss</Trans>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canApply || isMutating || isClosed}
          onClick={onSnooze}
        >
          <Trans>Snooze 24h</Trans>
        </Button>
        {/* 2026-05-25 (Yuqi Alerts second pass #12): primary action
            bumped from size="sm" to default. The other footer buttons
            stay sm so this one reads as the dominant call-to-action. */}
        <Button
          variant={canRequestReview ? 'outline' : undefined}
          disabled={!canApply || isMutating || isClosed || (!reviewOnly && selectionCount === 0)}
          onClick={reviewOnly ? onMarkReviewed : onApply}
          aria-busy={isMutating || undefined}
        >
          {reviewOnly ? (
            <Trans>Mark reviewed</Trans>
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
        {canApplyReviewed && !reviewOnly ? (
          <Button
            size="sm"
            disabled={isMutating || isClosed || !reviewedSetReady}
            onClick={onApplyReviewed}
          >
            <Trans>Apply reviewed set</Trans>
          </Button>
        ) : null}
      </div>
    </div>
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
          <h3 className="text-md font-semibold text-text-primary">
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
    </section>
  )
}

function PulseReviewRequestDialog({
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
              <Trans>Request Pulse review</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Ask an owner or manager to review and apply this Pulse. This does not change any
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
    ['evidence', <Trans key="evidence">Pulse evidence linked to each deadline</Trans>],
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
// from PulseAlertCard / AlertsListPage. Kept local-to-file
// (matches the existing duplicated-label pattern in those two
// files) so the panel header pill reads the same as the card
// pill. If this label diverges across all three sites in the
// future, promote to a shared util at
// `apps/app/src/features/pulse/components/pulse-change-kind.ts`.
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
    case 'new_obligation':
      return <Trans>New Rule Added</Trans>
    case 'other':
      return <Trans>Other Change</Trans>
  }
  return kind
}
