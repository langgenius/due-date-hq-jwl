import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  CircleAlertIcon,
  CopyIcon,
  ExternalLinkIcon,
  LightbulbIcon,
  MailIcon,
  MessageSquareIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UsersIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { PulseFirmAlertStatus, PulseStatus } from '@duedatehq/contracts'
import type { PulseDetail } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
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
import { formatDate, formatDatePretty, formatRelativeTime } from '@/lib/utils'
import { requiredRolesLabel } from '@/lib/required-roles-label'
import { ConceptLabel } from '@/features/concepts/concept-help'
import { PermissionInlineNotice } from '@/features/permissions/permission-gate'
import { getJurisdictionName, JurisdictionLabel } from '@/components/primitives/state-badge'
import { DetailStatusBanner } from '@/components/patterns/detail-status-banner'
import { Kbd } from '@/components/patterns/kbd'
import { DetailSectionCard } from '@/components/patterns/detail-section-card'
import { AlertStatusChip } from './components/AlertStatusChip'
import { aiConfidenceTier, isLowAiConfidence } from '@/features/_surface-vocabulary/ai-confidence'

import { ActiveQueueChip } from './components/ActiveQueueChip'
import { impactBadgeFromAlert, isActiveAlert } from './components/pulse-alert-chrome'
import { AffectedClientsTable } from './components/AffectedClientsTable'
import { AlertStructuredFields } from './components/AlertStructuredFields'
import { AlertTeamNotes } from './components/AlertTeamNotes'
import { ReverifyRulesSection } from './components/ReverifyRulesSection'
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

// The drawer's window-level hotkeys (A/D, ArrowUp/ArrowDown pager) must go
// quiet while ANY modal layer is stacked above the drawer — the
// apply-verification gate, the review-request dialog, AffectedClientsTable's
// child-owned "Confirm applies" dialog, or a list-page bulk confirm in panel
// mode. Their focusable controls are <button>s (Base UI Checkbox renders a
// button), so the INPUT/TEXTAREA target guard never catches them. Base UI
// keeps Dialog/AlertDialog popups out of the DOM until open (no `keepMounted`
// in this app), so probing for a mounted popup is a reliable "is a modal up?"
// check that needs no open-state threading from child- or sibling-owned
// dialogs. The sheet drawer itself is data-slot="sheet-content", so hotkeys
// keep working when only the drawer is open.
const MODAL_LAYER_SELECTOR = '[data-slot="dialog-content"], [data-slot="alert-dialog-content"]'

function isModalLayerOpen(): boolean {
  return document.querySelector(MODAL_LAYER_SELECTOR) !== null
}

interface AlertDetailDrawerProps {
  alertId: string | null
  onClose: () => void
  /**
   * - `'sheet'` (default): floating right-side Sheet with backdrop. The
   *   off-route fallback so callers that open the drawer from outside
   *   /alerts (e.g. the dashboard NeedsAttention card) still see a usable
   *   rendering.
   * - `'panel'`: renders the same body as an inline `<aside>` that the
   *   route's layout can drop into a flex sibling column next to the
   *   alerts list. No backdrop, no viewport-fixed positioning — the panel
   *   splits the page like the obligation drawer on /deadlines.
   */
  mode?: 'sheet' | 'panel'
  /**
   * Prev/next paging through the surrounding alert list + a "N of M"
   * position read-out. Threaded from the list surface (which owns the
   * sorted order). All optional — when absent the top-bar nav simply
   * doesn't render.
   */
  onPrev?: () => void
  onNext?: () => void
  position?: { index: number; total: number }
}

// The drawer and the dashboard `NeedsAttentionCard` both call
// `alertTone(alert)` so they always agree — computing tone two different
// ways once made the same alert show green outside and red inside.

/**
 * The prominent left-accent DEADLINE CHANGE card. Eyebrow + old→new date
 * diff (with the signed day delta) + a scope-facts line. Mirrors the
 * date-diff treatment on the /alerts list row (`PulseAlertRow`) so the
 * two surfaces read as one vocabulary. Every value is real `PulseDetail`
 * data; it renders only for due-date-overlay alerts that carry both
 * dates.
 */
function formatDeadlineDate(iso: string): string {
  return formatDatePretty(iso, { alwaysShowYear: true })
}

function DeadlineChangeCard({ detail }: { detail: PulseDetail }) {
  const oldIso = detail.originalDueDate
  const newIso = detail.newDueDate
  if (detail.alert.actionMode !== 'due_date_overlay' || !oldIso || !newIso) return null
  const days = Math.round(
    (new Date(`${newIso}T00:00:00.000Z`).getTime() -
      new Date(`${oldIso}T00:00:00.000Z`).getTime()) /
      86_400_000,
  )
  // The hero does ONE thing: the date diff. One home per fact — the
  // summary lives in the header dek, AI confidence in the Source &
  // confidence card, the source link in the header meta, the audit note
  // in the footer, and the effective date in the fact grid below; the
  // rows that restated them here are gone.
  return (
    // 2026-06-12 (de-fill pass): no box — the hero sits flat in the facts
    // section; the BIG date pair + day delta carry the emphasis through
    // type alone.
    <section className="flex flex-col gap-2.5">
      {/* Header — ⚠ Deadline change · status chip. */}
      <div className="flex flex-wrap items-center gap-2">
        <TriangleAlertIcon className="size-3.5 shrink-0 text-state-warning-solid" aria-hidden />
        <span className="text-base font-semibold text-text-primary">
          <Trans>Deadline change</Trans>
        </span>
        <AlertStatusChip
          status={detail.alert.status}
          // Terminal states show WHEN they resolved (date); awaiting shows how
          // long it's been waiting (relative). dismissedAt / appliedAt come
          // from the detail query (handoff Phase 1.2).
          timestamp={
            detail.alert.status === 'dismissed' && detail.alert.dismissedAt
              ? formatDate(detail.alert.dismissedAt)
              : detail.alert.status === 'applied' && detail.alert.appliedAt
                ? formatDate(detail.alert.appliedAt)
                : formatRelativeTime(detail.alert.publishedAt)
          }
        />
      </div>

      {/* Diff row — old → new + signed delta (green when later = relief). */}
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="font-mono text-base font-medium text-text-muted line-through tabular-nums">
          {formatDeadlineDate(oldIso)}
        </span>
        <ArrowRightIcon className="size-3.5 shrink-0 self-center text-text-muted" aria-hidden />
        <span className="font-mono text-xl font-bold tracking-title text-text-primary tabular-nums">
          {formatDeadlineDate(newIso)}
        </span>
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            days >= 0 ? 'text-text-success' : 'text-text-destructive',
          )}
        >
          {days >= 0 ? `+${days}` : `${days}`} <Trans>days</Trans>
        </span>
      </div>
    </section>
  )
}

/**
 * The "What this means for your practice" tinted value band that
 * translates the raw date diff into the firm-facing consequence. Renders
 * only for an auto-applied due-date overlay that actually matched
 * clients, and only bullets we can derive honestly from the record:
 *   • Bullet A — N clients gain ~M months of breathing room (the same day
 *     delta the hero card shows, expressed in months).
 *   • Bullet B — relief is automatic for the in-scope addresses (true
 *     because `actionMode === 'due_date_overlay'` ⇒ auto-applied).
 *   • Bullet C — payments postponed / no penalties accrue. Shown only when
 *     the AI-extracted deadline-shift facts say so: the relief covers
 *     'payment' deadlines AND penaltyRelief === true. Otherwise omitted —
 *     old alerts carry no such facts, so nothing changes for them.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deadlineShiftPaymentRelief(detail: PulseDetail): boolean {
  if (detail.alert.changeKind !== 'deadline_shift') return false
  const raw = detail.structuredChange
  if (!isRecord(raw)) return false
  const record = raw
  const blockRaw = record.deadlineShift
  const block = isRecord(blockRaw) ? blockRaw : record
  const deadlineTypes = Array.isArray(block.deadlineTypes) ? block.deadlineTypes : []
  return deadlineTypes.includes('payment') && block.penaltyRelief === true
}

function PracticeImpactSection({ detail }: { detail: PulseDetail }) {
  const oldIso = detail.originalDueDate
  const newIso = detail.newDueDate
  const matchedCount = detail.alert.matchedCount
  if (detail.alert.actionMode !== 'due_date_overlay' || !oldIso || !newIso || matchedCount <= 0) {
    return null
  }
  const showPaymentsBullet = deadlineShiftPaymentRelief(detail)
  const days = Math.round(
    (new Date(`${newIso}T00:00:00.000Z`).getTime() -
      new Date(`${oldIso}T00:00:00.000Z`).getTime()) /
      86_400_000,
  )
  // Only a forward shift earns "breathing room" — a same-day / earlier
  // deadline wouldn't read honestly, so bullet A is gated to days > 0.
  const scopeArea =
    detail.counties.length > 0
      ? detail.counties.join(', ')
      : getJurisdictionName(detail.jurisdiction)

  return (
    // Flattened — no gray box / padding, since this sits inside the white
    // "The change" group card. Its Lightbulb header carries the
    // delineation.
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-1.5">
        <LightbulbIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden />
        <span className="text-sm font-semibold text-text-secondary">
          <Trans>What this means for your practice</Trans>
        </span>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {days > 0 ? (
          <div className="flex items-start gap-2.5">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-state-accent-hover text-text-accent">
              <UsersIcon className="size-3.5" aria-hidden />
            </span>
            <p className="text-base leading-relaxed text-text-secondary">
              {/* Trans ternary (the ClientDetailWorkspace pattern), not a
                  <Plural> string prop — a string prop leaves the inner
                  {days} ICU placeholder valueless and it renders blank.
                  The exact day delta matches the hero's "+N days" (one
                  number per fact; "~1 months" for a 14-day shift read as
                  fiction). */}
              {matchedCount === 1 ? (
                <Trans>1 client gains {days} extra days of breathing room</Trans>
              ) : (
                <Trans>
                  {matchedCount} clients gain {days} extra days of breathing room
                </Trans>
              )}
            </p>
          </div>
        ) : null}
        <div className="flex items-start gap-2.5">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-state-success-hover text-text-success">
            <ShieldCheckIcon className="size-3.5" aria-hidden />
          </span>
          <p className="text-base leading-relaxed text-text-secondary">
            <Trans>
              Audit-safe: relief is automatic for {scopeArea} addresses — no opt-in form needed.
            </Trans>
          </p>
        </div>
        {showPaymentsBullet ? (
          <div className="flex items-start gap-2.5">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-state-success-hover text-text-success">
              <ShieldCheckIcon className="size-3.5" aria-hidden />
            </span>
            <p className="text-base leading-relaxed text-text-secondary">
              <Trans>
                Estimated payments due {formatDeadlineDate(oldIso)} are also postponed — no
                penalties accrue.
              </Trans>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

/**
 * Lifecycle timeline. Each node is a real fact already on the record —
 * received (publishedAt + source + confidence), matched (impacted
 * obligation count + scope), reviewed (reviewedAt), and the current
 * resolution state derived from `status`. No fabricated events; a true
 * per-alert event feed would be a separate backend addition.
 */
// Mirrors the events array AlertActivityTimeline builds below — received +
// current always render; matched / reviewed only when present. Lets the
// wrapping DetailSectionCard show "N events · oldest first" in its header
// band without the timeline needing a second inner header (Yuqi #11).
function alertActivityEventCount(detail: PulseDetail): number {
  return (
    2 +
    (detail.alert.matchedCount + detail.alert.needsReviewCount > 0 ? 1 : 0) +
    (detail.reviewedAt ? 1 : 0)
  )
}

function AlertActivityTimeline({ detail }: { detail: PulseDetail }) {
  const { t } = useLingui()
  const alert = detail.alert
  const impacted = alert.matchedCount + alert.needsReviewCount
  const confPct = Math.round(alert.confidence * 100)

  type Tone = 'muted' | 'accent' | 'success' | 'warning' | 'destructive'
  const events: { id: string; tone: Tone; title: ReactNode; meta?: ReactNode }[] = []
  events.push({
    id: 'received',
    tone: 'muted',
    title: <Trans>Received from {alert.source}</Trans>,
    meta: `${formatDatePretty(alert.publishedAt, { alwaysShowYear: true })} · ${t`confidence ${confPct}%`}`,
  })
  if (impacted > 0) {
    events.push({
      id: 'matched',
      tone: 'accent',
      title: (
        <Plural
          value={impacted}
          one="Matched # open client obligation"
          other="Matched # open client obligations"
        />
      ),
      meta:
        detail.counties.length > 0
          ? `${detail.jurisdiction} · ${detail.counties.join(', ')}`
          : getJurisdictionName(detail.jurisdiction),
    })
  }
  if (detail.reviewedAt) {
    events.push({
      id: 'reviewed',
      tone: 'success',
      title: <Trans>Reviewed</Trans>,
      meta: formatRelativeTime(detail.reviewedAt),
    })
  }
  const current: { tone: Tone; title: ReactNode; meta?: ReactNode } =
    alert.status === 'applied' || alert.status === 'partially_applied'
      ? { tone: 'success', title: <Trans>Applied to clients · logged to audit ledger</Trans> }
      : alert.status === 'dismissed'
        ? { tone: 'muted', title: <Trans>Dismissed</Trans> }
        : alert.status === 'reverted'
          ? { tone: 'destructive', title: <Trans>Reverted</Trans> }
          : alert.status === 'reviewed'
            ? { tone: 'success', title: <Trans>Marked reviewed</Trans> }
            : {
                tone: 'warning',
                title: <Trans>Awaiting your decision</Trans>,
              }
  events.push({ id: 'current', ...current })

  const toneClass: Record<Tone, string> = {
    muted: 'bg-text-muted',
    accent: 'bg-state-accent-solid',
    success: 'bg-text-success',
    warning: 'bg-text-warning',
    destructive: 'bg-text-destructive',
  }

  return (
    // Yuqi #11 — no inner "Activity" header: the wrapping
    // DetailSectionCard already says "Activity & notes" and carries the
    // "N events · oldest first" meta in its header band (see
    // `alertActivityEventCount`), so a second label here read as a
    // repeated title.
    <section className="flex flex-col gap-3">
      <ol className="flex flex-col">
        {events.map((event, index) => {
          const isLast = index === events.length - 1
          return (
            <li key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'mt-1 size-2.5 shrink-0 rounded-full ring-2 ring-background-default',
                    toneClass[event.tone],
                  )}
                  aria-hidden
                />
                {!isLast ? <span className="w-px flex-1 bg-divider-subtle" aria-hidden /> : null}
              </div>
              <div className={cn('flex min-w-0 flex-col gap-0.5', isLast ? '' : 'pb-4')}>
                {/* Timeline narrative is secondary — 13/400 (the card title
                    above and the body's 14px lead content outrank it). */}
                <span className="text-sm text-text-primary">{event.title}</span>
                {event.meta ? (
                  <span className="text-xs text-text-tertiary tabular-nums">{event.meta}</span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/**
 * The colored top-of-panel status banner — amber "Pending your review",
 * red "Couldn't apply", green "Applied · undo". Exactly one renders,
 * picked from the real alert state. Right-side meta (confidence, due-in,
 * confirmed-by-N-sources) is wired to real fields; "rank #X of Y" + exact
 * undo countdown + audit-ref strings are omitted rather than fabricated.
 */
function DecisionBanners({
  detail,
  applyError,
  onRetry,
  onUndo,
}: {
  detail: PulseDetail
  applyError: boolean
  onRetry: () => void
  onUndo: () => void
}) {
  const { t } = useLingui()
  const alert = detail.alert
  const dueInDays = detail.newDueDate
    ? Math.round(
        (new Date(`${detail.newDueDate}T00:00:00.000Z`).getTime() - Date.now()) / 86_400_000,
      )
    : null

  if (applyError) {
    return (
      <DetailStatusBanner
        tone="danger"
        icon={CircleAlertIcon}
        title={<Trans>Couldn&rsquo;t apply to clients</Trans>}
        description={
          <Trans>
            The change couldn&rsquo;t be written. Your selection was kept — retry, or open the
            source to re-verify before applying.
          </Trans>
        }
        action={
          <TextLink variant="destructive" size="sm" onClick={onRetry} className="font-semibold">
            <Trans>Retry now</Trans>
          </TextLink>
        }
      />
    )
  }

  if (alert.status === 'applied' || alert.status === 'partially_applied') {
    return (
      <DetailStatusBanner
        tone="success"
        icon={ShieldCheckIcon}
        title={
          alert.matchedCount > 0 ? (
            <Plural
              value={alert.matchedCount}
              one="Applied to # client · logged to audit ledger"
              other="Applied to # clients · logged to audit ledger"
            />
          ) : (
            <Trans>Applied · logged to audit ledger</Trans>
          )
        }
        description={
          <Trans>You can undo for the next 24 hours. After that, it can't be undone.</Trans>
        }
        action={
          REVERTABLE_STATUSES.has(alert.status) ? (
            <TextLink variant="success" size="sm" onClick={onUndo} className="font-semibold">
              <Trans>Undo</Trans>
            </TextLink>
          ) : undefined
        }
      />
    )
  }

  // The pending band is a single compact row — warning icon + "Pending
  // your review" on the left, and the due meta on the right in the same
  // sans treatment the /today alert card uses. The verbose "AI extracted…"
  // sentence and the source-corroboration chip are dropped — the
  // affected-clients table below already carries the confirm/exclude flow.
  if (
    alert.status === 'matched' &&
    alert.firmImpact !== 'no_current_match' &&
    detail.applyReadiness.status !== 'ready'
  ) {
    // The compact single-line band is pinned to the Segmented size="sm"
    // track height (h-7) via DetailStatusBanner, matching the rail's
    // All/Unresolved control.
    return (
      <DetailStatusBanner
        compact
        // 2026-06-12 (Yuqi detail critique "too messy — six colored signals
        // before any scroll"): pending = quiet gray, not warning-amber. An
        // open decision isn't an alarm; the panel's ONE hot cue is the
        // action-deadline countdown in the facts card.
        tone="pending"
        icon={CircleAlertIcon}
        // "Awaiting your decision" — the SAME phrase the Activity
        // timeline's current-state node uses, so the banner and the
        // timeline speak one status vocabulary. (The header's separate
        // "Needs Action" pill was removed for restating this banner in
        // different words — one state, one phrasing.)
        title={<Trans>Awaiting your decision</Trans>}
        // The confidence % is dropped from this banner — it lives in the
        // dedicated "AI confidence" block below (which for low-confidence
        // alerts is the prominent actionable warning), so the banner
        // carries only status + the due-date timing (no duplication).
        note={
          dueInDays !== null && dueInDays >= 0 ? <span>{t`due in ${dueInDays} days`}</span> : null
        }
      />
    )
  }

  return null
}

// Alert detail drawer: AI summary + structured fields + affected clients + apply
// / dismiss / revert. Apply is the safer path because the server writes audit +
// evidence + email outbox in one transaction (see packages/db/src/repo/pulse.ts).
export function AlertDetailDrawer({
  alertId,
  onClose,
  mode = 'sheet',
  onPrev,
  onNext,
  position,
}: AlertDetailDrawerProps) {
  const { t, i18n } = useLingui()
  const queryClient = useQueryClient()
  const open = alertId !== null
  // Same pattern as the /deadlines obligation drawer (see
  // routes/obligations.tsx). When the alert drawer is open it needs
  // horizontal room — auto-collapse the sidebar while open, restore on
  // close. The user's persistent collapse preference (localStorage) is
  // untouched; closing the drawer restores whatever they last chose. If a
  // consumer renders this drawer outside SidebarProvider (e.g. the
  // off-route `AlertDrawerProvider` mounted above AppShell in
  // `_layout.tsx`), `useSidebar` would throw — gate with the safe context
  // lookup.
  const sidebar = useOptionalSidebar()
  const setAutoCollapsed = sidebar?.setAutoCollapsed
  useEffect(() => {
    if (!setAutoCollapsed) return undefined
    setAutoCollapsed(open)
    return () => {
      setAutoCollapsed(false)
    }
  }, [open, setAutoCollapsed])

  // ArrowUp / ArrowDown page prev/next through the surrounding list (the
  // left rail remains the primary click navigator). Ignored while typing
  // in a field so it never hijacks search/text input.
  useEffect(() => {
    if (!open || (!onPrev && !onNext)) return undefined
    const handler = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      if (isModalLayerOpen()) return
      if (event.key === 'ArrowUp' && onPrev) {
        event.preventDefault()
        onPrev()
      } else if (event.key === 'ArrowDown' && onNext) {
        event.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onPrev, onNext])
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

  // A review_only drift / rule-change alert lists rules to re-verify
  // (`detail.reverifyRuleIds`). The CPA must re-verify (accept) each one —
  // which bumps the firm's adopted version + clears the rule's
  // source-drift gate — BEFORE the alert can be marked reviewed.
  // Otherwise "reviewed" would close the alert while the underlying rule
  // is still stale. A reverify rule still needs work
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
  // F-041 — alert deadline-shift verification gate. Apply on a
  // `due_date_overlay` alert opens a confirmation dialog that surfaces the
  // AI-extracted dates, source excerpt, and a direct link to the official
  // source. The CPA must tick "I have verified against the source" before
  // the mutation fires. AI hallucinating a deadline shift = files late or
  // early — the highest-liability failure mode in the product — so the
  // Apply path requires one explicit acknowledgement step.
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

  // Bulk-exclude the currently-selected clients, folding each through the
  // same excludeFromSelection reducer the per-row Exclude uses (so
  // confirmed/excluded/selection stay coherent).
  const handleExcludeSelected = () => {
    let nextState = { selection, confirmedReviewIds, excludedIds }
    for (const obligationId of selection) {
      nextState = excludeFromSelection(
        nextState.selection,
        nextState.confirmedReviewIds,
        nextState.excludedIds,
        obligationId,
        true,
      )
    }
    setSelection(nextState.selection)
    setConfirmedReviewIds(nextState.confirmedReviewIds)
    setExcludedIds(nextState.excludedIds)
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
          description: t`Recorded in the audit log. Undo within 24 hours.`,
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
        // Marking reviewed RESOLVES the alert — it leaves the active queue
        // for Alert history, so the user must land somewhere deliberate
        // (Yuqi: "where does the user land?"). Triage flow: advance to the
        // next alert in the rail when there is one; otherwise close back
        // to the list. The toast names where the reviewed alert went so
        // the hand-off is legible even as the panel moves on.
        toast.success(t`Alert marked reviewed`, {
          description: t`Moved to Alert history.`,
        })
        invalidate()
        if (onNext) onNext()
        else onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't mark alert reviewed`, {
          description: i18n._(alertErrorDescriptor(err)),
        })
      },
    }),
  )

  // Dismiss — resolve the alert without applying (server writes the audit
  // entry + `dismissedAt`). Closes the drawer like apply, since dismissing
  // resolves the alert. Wires the previously-decorative `D` keyboard hint +
  // the footer Dismiss button.
  const dismissMutation = useMutation(
    orpc.pulse.dismiss.mutationOptions({
      onSuccess: () => {
        invalidate()
        toast.success(t`Alert dismissed`)
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't dismiss alert`, {
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
        invalidate()
        // Present-perfect status ("queued for…") so the toast describes
        // the ACTUAL state of the world at toast-render time — the API
        // call already completed and queued the notifications
        // server-side, so a future-tense "will be sent" would mislead.
        // Use `requiredRolesLabel` (not a hard-coded "owners and
        // managers") so the toast tracks the pulse.apply review-eligible
        // role set.
        toast.success(t`Review requested`, {
          description: t`Review request sent to ${requiredRolesLabel('pulse.apply')}.`,
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

  const applyReviewedMutation = useMutation(
    orpc.pulse.applyReviewed.mutationOptions({
      onSuccess: (result) => {
        invalidate()
        toast.success(t`Applied reviewed set to ${result.appliedCount} clients`, {
          description: t`Recorded in the audit log. Undo within 24 hours.`,
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
    reviewPriorityMutation.isPending ||
    reactivateMutation.isPending ||
    requestReviewMutation.isPending ||
    revertMutation.isPending ||
    dismissMutation.isPending

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
      toast.error(t`Complete the new date and deadlines before applying`)
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

  // Dismiss is available while the alert is still awaiting a decision — not
  // once it's resolved (applied / reviewed / reverted / dismissed) or its
  // source was revoked.
  const alertResolved =
    !detail ||
    detail.alert.status === 'dismissed' ||
    detail.alert.status === 'reviewed' ||
    detail.alert.status === 'reverted' ||
    detail.alert.status === 'applied' ||
    detail.alert.sourceStatus === 'source_revoked'
  const canDismiss = !alertResolved && canApply
  const handleDismiss = () => {
    if (!detail || !canDismiss || isMutating) return
    dismissMutation.mutate({ alertId: detail.alert.id })
  }

  // Make the footer's `A` / `D` keyboard hints real (they were decorative).
  // `D` dismisses while the alert is open; `A` fires the primary decision —
  // Apply's verification gate, or Mark reviewed for review_only alerts
  // (skipped while re-verification is incomplete, matching the footer button).
  useEffect(() => {
    if (!open || !detail) return undefined
    const handler = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isMutating) return
      if (isModalLayerOpen()) return
      const key = event.key.toLowerCase()
      if (key === 'd' && canDismiss) {
        event.preventDefault()
        handleDismiss()
      } else if (key === 'a' && !alertResolved) {
        const reviewMode =
          detail.alert.actionMode === 'review_only' ||
          detail.alert.firmImpact === 'no_current_match'
        if (reviewMode) {
          if (reverifyIncomplete) return
          event.preventDefault()
          markReviewedMutation.mutate({ alertId: detail.alert.id })
        } else {
          event.preventDefault()
          handleApply()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // handleApply / handleDismiss close over the same state these deps track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detail, isMutating, canDismiss, alertResolved, reverifyIncomplete])

  const handleCopyDraft = () => {
    if (!detail) return
    void navigator.clipboard.writeText(buildClientEmailDraft(detail, selection)).then(
      () => toast.success(t`Client email draft copied`),
      () => toast.error(t`Couldn't copy client email draft`),
    )
  }

  // The outermost render shape is conditional on `mode`, but the body
  // (header + content + footer) is shared between both modes so every
  // alert-detail surface — the floating Sheet (off-route fallback) AND the
  // inline page panel on /alerts — uses identical content. Mirrors the
  // obligation drawer pattern (see `ObligationQueueDetailDrawer` in
  // routes/obligations.tsx).
  //
  // The hero header shrinks once the body scrolls past a small threshold —
  // the big title drops to a single compact line and the summary dek +
  // roomy padding fall away, reclaiming vertical space for the content
  // below. Driven by the body scroll container's onScroll; the setter
  // bails out when the boolean doesn't change so scrolling doesn't thrash
  // renders.
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  // The "Affected clients" group card renders only when it has real
  // content — a client surface (overlay or review-only) OR an
  // apply-permission notice OR the manager-review / ready-to-apply
  // controls. Avoids an empty card on no-match / read-only alerts.
  const showClientsGroup =
    !!detail &&
    ((detail.alert.actionMode === 'due_date_overlay' &&
      detail.alert.firmImpact !== 'no_current_match') ||
      (detail.alert.actionMode === 'review_only' && detail.affectedClients.length > 0) ||
      (detail.alert.firmImpact !== 'no_current_match' && !canApply) ||
      (detail.alert.actionMode === 'due_date_overlay' && deadlineApplyReady))

  // 2026-06-12 (Yuqi: "have the tabs from the Deadline Detail panel as well,
  // but the content is a long scroll — scrolling just indicates which tab
  // you're on"): a SCROLL-SPY section nav, not real tabs. The alert detail
  // is one decide-flow document (facts + clients + source must be visible
  // together), so true tabs would hide evidence mid-decision; the spy nav
  // gives the deadline-tabs orientation while staying a table of contents.
  // Active section = the last group card whose top has crossed the pinned
  // nav line; computed in the body's existing onScroll (no extra listener).
  const sectionNavItems = detail
    ? [
        { id: 'alert-section-facts', label: <Trans>Change</Trans> },
        ...(showClientsGroup
          ? [{ id: 'alert-section-clients', label: <Trans>Clients</Trans> }]
          : []),
        { id: 'alert-section-source', label: <Trans>Source</Trans> },
        { id: 'alert-section-activity', label: <Trans>Activity</Trans> },
      ]
    : []
  const [activeSection, setActiveSection] = useState('alert-section-facts')

  const body = (
    <>
      {/* Top bar — back-to-Alerts breadcrumb on the left, "N of M"
          position + close on the right. This close is the single close
          affordance (panel mode drops its absolute X; sheet mode hides the
          primitive's). The alert RAIL on the left is the navigator, so
          there are no ▲▼ paging buttons here. The chrome border spans the
          full width (so the bar never looks cut off) but its content is
          capped to the same 760px `mx-auto` measure as the document below,
          so it sits centered over the same column the header/body/footer
          share. */}
      {/* Top bar is CHROME, so it spans the full panel width (no 760px
          document cap): the breadcrumb hugs the left edge and the close X
          hugs the top-right corner where a close affordance is expected
          (Yuqi batch 4 #13 — capped to the document column it floated
          mid-panel). px-5, not the document's px-12. */}
      <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-divider-subtle px-5">
        {/* Breadcrumb "Alerts / {title}" — 13/400 chrome. No leading
            chevron (batch 4 #14): the slash path is the navigation
            metaphor; a back-arrow on top of it was a mixed signal. The
            title leaf caps at 360px (batch 4 #12) so the crumb reads as a
            path, not a second full-width title. */}
        <nav className="flex min-w-0 items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-sm text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Alerts</Trans>
          </button>
          {detail ? (
            <>
              <span className="shrink-0 text-text-muted" aria-hidden>
                /
              </span>
              <span className="max-w-[360px] truncate text-text-secondary">
                {detail.alert.title}
              </span>
            </>
          ) : null}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          {/* Yuqi #13 — the A/D keyboard-action hints moved OUT of the
                footer (where they crowded the Mark-reviewed / Dismiss
                buttons) and UP into this top bar, beside the "N of M"
                pager read-out. Shown only on wide panels where there's
                room, and only while the alert still accepts a decision. */}
          {detail && !alertResolved ? (
            <span className="hidden items-center gap-2.5 text-text-tertiary xl:inline-flex">
              <span className="inline-flex items-center gap-1.5 text-caption">
                <Kbd>A</Kbd>
                {/* The label tracks what `A` actually fires — Mark
                      reviewed on review-only / no-match alerts, the Apply
                      gate on due-date overlays (same `noActionReview`
                      branch as the hotkey handler + footer CTA). A hint
                      that says "Apply" while the key marks-reviewed
                      teaches a falsehood on the liability path. */}
                {detail.alert.actionMode === 'review_only' ||
                detail.alert.firmImpact === 'no_current_match' ? (
                  <Trans>Review</Trans>
                ) : (
                  <Trans>Apply</Trans>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 text-caption">
                <Kbd>D</Kbd>
                <Trans>Dismiss</Trans>
              </span>
              <span className="h-3.5 w-px bg-divider-regular" aria-hidden />
            </span>
          ) : null}
          {position && position.total > 0 ? (
            <span className="text-sm text-text-muted tabular-nums">
              {t`${position.index + 1} of ${position.total}`}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={onClose}
            aria-label={t`Close alert detail`}
          >
            <XIcon className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Header padding overrides SheetHeader's primitive default
          (px-6 py-5) with `px-12` so the alert panel reads as a roomy
          paper-document surface, not a tight Sheet drawer. Header / body
          / footer all share the same `px-12` inline so the left edge is
          one continuous margin top-to-bottom. The Hero reads as the BIG
          version of the compact /alerts + /today card — same severity
          pill + state pill + source · time chrome, then title, then
          summary — so every signal sits in one consolidated meta row. */}
      {/* The colored status band sits at the very top — full-bleed, above
          the header meta + title — exactly one band for the alert's real
          state (amber Pending / red Couldn't-apply / green Applied). */}
      {detail ? (
        <DecisionBanners
          detail={detail}
          applyError={applyMutation.isError}
          onRetry={handleApply}
          onUndo={() => revertMutation.mutate({ alertId: detail.alert.id })}
        />
      ) : null}

      {/* Yuqi #1 (batch2) — the hero header is WHITE (bg-background-default),
          matching the deadline detail's white identity block. The body's gray
          wash (bg-background-subtle) begins below the header, so the tonal
          step now runs the OTHER way (white masthead → gray content), and the
          header's lightweight meta strip (source · confidence · jurisdiction ·
          last activity, per #7/#10/#11) reads as header-level metadata sitting
          on the same white surface as the title. */}
      <SheetHeader
        className={cn(
          'bg-background-default px-6 transition-all xl:px-12 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[760px]',
          headerCollapsed ? 'pt-4 pb-4' : 'pt-10 pb-6',
        )}
      >
        {detailQuery.isLoading || !detail ? (
          <DetailHeaderSkeleton />
        ) : (
          (() => {
            const severity = impactBadgeFromAlert(detail.alert)
            // Gate the impact pill to HIGH only — the same rule
            // NeedsAttentionCard / PulseAlertRow / AlertCard use.
            const showSeverityPill = severity.id === 'high'
            // Batch 4 #1/#2 — the header meta carries ONLY identity
            // (Active / High-impact / jurisdiction / change-kind) plus
            // source · time. The AI-confidence % lives in the Source &
            // confidence card (its one home), and the Needs-Action pill
            // is gone: it restated the status banner above in different
            // words, and two competing state vocabularies confused the
            // read ("Pending your review" vs "Needs Action").
            // The freshest real timestamp on the record: a terminal alert
            // shows when it resolved; an open one shows when it arrived.
            const lastActivityIso =
              detail.reviewedAt ??
              (detail.alert.status === 'dismissed' ? detail.alert.dismissedAt : null) ??
              (detail.alert.status === 'applied' ? detail.alert.appliedAt : null) ??
              detail.alert.publishedAt
            return (
              <div className="flex flex-col gap-2">
                {/* Meta row — severity (HIGH only) + state pill +
                    change-kind + source · time + action pill. The
                    change-kind label uses the SAME `changeKindLabel`
                    helper PulseAlertRow uses (not a drawer-specific
                    variant) so the exact wording matches across surfaces. */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* ACTIVE badge — flags the actionable
                      due-date-overlay queue, mirroring the row badge
                      (shared ActiveQueueChip). */}
                  {isActiveAlert(detail.alert) ? <ActiveQueueChip /> : null}
                  {/* Impact pill — the SAME chip recipe as the /alerts row
                      + /today card (token classes, not the severity
                      helper's inline hexes): one alert, one pill, every
                      surface (same-entity-same-rendering audit). */}
                  {showSeverityPill ? (
                    <span className="inline-flex h-[20px] shrink-0 items-center rounded-lg border border-state-destructive-border bg-state-destructive-hover px-1.5 text-xs font-semibold tracking-[0.3px] text-text-destructive uppercase">
                      <Trans>High impact</Trans>
                    </span>
                  ) : null}
                  {/* The shared JurisdictionLabel primitive — seal + mono
                      code + full name, identical to the deadline detail
                      header. */}
                  <JurisdictionLabel code={detail.alert.jurisdiction} />
                  <span className="inline-flex h-[22px] shrink-0 items-center rounded bg-state-accent-hover px-2 font-mono text-xs font-bold tracking-eyebrow text-text-accent uppercase">
                    {changeKindLabel(detail.alert.changeKind)}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2 text-sm text-text-tertiary">
                    {detail.alert.sourceUrl ? (
                      <a
                        href={detail.alert.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-text-tertiary underline-offset-2 hover:text-text-secondary hover:underline"
                      >
                        <span className="truncate">{detail.alert.source}</span>
                        <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
                      </a>
                    ) : (
                      <span className="truncate underline-offset-2 hover:underline">
                        {detail.alert.source}
                      </span>
                    )}
                    <span aria-hidden>·</span>
                    {/* Last activity — the freshest real timestamp, replacing
                        the standalone publish date (also surfaced verbatim in
                        the source-extract citation below). */}
                    <span className="tabular-nums">{formatRelativeTime(lastActivityIso)}</span>
                  </span>
                </div>

                {/* Title at 22px (600 weight, tight leading). The drawer
                    chrome above (top bar + meta strip) claims enough of
                    the fold that a larger title would push the Source
                    Extract below it; 22px keeps the title as the lede
                    without dominating the panel. */}
                <h2
                  className={cn(
                    // (was 1.25) — at 22px over two lines the
                    // tighter leading read cramped (batch 4 #3).
                    // Expanded state clamps at 3 lines (hostile-data pass:
                    // an unclamped 250-char title ran 4+ lines and pushed
                    // the facts below the fold); the title attr carries
                    // the full text on hover.
                    'font-semibold tracking-display text-text-primary transition-all',
                    headerCollapsed
                      ? 'line-clamp-1 text-item-title'
                      : 'line-clamp-3 text-surface-title',
                  )}
                  title={detail.alert.title}
                >
                  {detail.alert.title}
                </h2>

                {/* Summary / dek — hidden once the header collapses on scroll so
                    the masthead shrinks to title-only. */}
                {!headerCollapsed &&
                detail.alert.summary &&
                detail.alert.summary.trim() !== detail.alert.title.trim() ? (
                  // Dek is body prose, not a sub-title — 14/400.
                  <p className="text-base text-text-secondary">{detail.alert.summary}</p>
                ) : null}
              </div>
            )
          })()
        )}
      </SheetHeader>

      {/* Body shares the header's `px-12` so the whole panel reads as one
          continuous paper surface from edge to edge. The large bottom
          padding (`pb-24`, ~96px) buffers the sticky footer (≈64–80px
          tall): it overlays the body's bottom edge when scrolled, so
          without the buffer the last content row would hide behind the
          action bar. */}
      <div
        onScroll={(event) => {
          const container = event.currentTarget
          const next = container.scrollTop > 16
          setHeaderCollapsed((prev) => (prev === next ? prev : next))
          // Scroll-spy: active = the LAST section whose top has crossed the
          // pinned nav line (~64px under the container top). Scoped
          // querySelector so the spy never reads a different panel's ids.
          if (sectionNavItems.length > 0) {
            const containerTop = container.getBoundingClientRect().top
            let current = sectionNavItems[0]!.id
            for (const item of sectionNavItems) {
              const el = container.querySelector(`#${item.id}`)
              if (el && el.getBoundingClientRect().top - containerTop <= 64) current = item.id
            }
            // Bottom clamp: short documents can end before the last
            // section's top ever crosses the spy line — once the container
            // is scrolled to (within 8px of) the bottom, the last section
            // is the one being read.
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 8) {
              current = sectionNavItems[sectionNavItems.length - 1]!.id
            }
            setActiveSection((prev) => (prev === current ? prev : current))
          }
        }}
        // 2026-06-12 (Yuqi "white, gray, white, gray — so bad UI"): the body
        // is ONE WHITE SURFACE. Layering comes from hairlines + type + the
        // spacing rhythm, never from alternating fills.
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-background-default px-6 pt-6 pb-24 xl:px-12 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[760px]"
      >
        {/* Scroll-spy section nav (Yuqi — deadline-tab orientation on one
            long document). Sticky under the container top; deliberately
            LIGHTER than the deadline detail's pill tabs (text + underline)
            so it reads as a table of contents, not behavior-switching tabs. */}
        {detail ? (
          <nav
            aria-label={t`Alert sections`}
            className="sticky -top-6 z-10 -my-3 shrink-0 bg-background-default py-3"
          >
            <div className="flex items-center gap-5 border-b border-divider-subtle pb-2">
              {sectionNavItems.map((item) => {
                const sectionActive = item.id === activeSection
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(event) =>
                      event.currentTarget
                        .closest('[class*="overflow-y-auto"]')
                        ?.querySelector(`#${item.id}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className={cn(
                      'relative cursor-pointer pb-0.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                      sectionActive
                        ? 'text-text-accent'
                        : 'text-text-tertiary hover:text-text-secondary',
                    )}
                  >
                    {item.label}
                    {sectionActive ? (
                      <span
                        className="absolute right-0 -bottom-[9px] left-0 h-0.5 rounded-full bg-state-accent-solid"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </nav>
        ) : null}
        {/* Body order leads with the decision banner + key change + facts
            + affected clients, and keeps the verbatim SOURCE EXTRACT quote
            as a supporting anchor near the bottom (just before
            Provenance). */}
        {detailQuery.isError ? (
          // No leading icon, so the drawer's alert chrome stays
          // consistent — title + body only.
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Couldn't load this alert</Trans>
            </AlertTitle>
            <AlertDescription>
              {i18n._(alertErrorDescriptor(detailQuery.error))}{' '}
              {/* Canonical `<Button variant="link">` so both alert retry
                  sites match dashboard/clients/obligations. */}
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

        {/* Loading: card-shaped placeholders where the group cards will
            land, so the panel never shows a bare gray wash while the
            detail query resolves (state-completeness audit — the header
            had a skeleton, the body had nothing). */}
        {detailQuery.isLoading && !detail ? (
          <div className="flex shrink-0 flex-col gap-4" aria-hidden>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : null}

        {detail ? (
          // The body is a `gap-4` stack of up-to-four white group cards on
          // the gray-wash body (see the per-group comment below). Kept out
          // of flex-shrink so the scroll container owns the scroll height.
          <div className="flex shrink-0 flex-col gap-4">
            {/* The body is four white cards on the gray wash —
                  1. Extracted facts  (deadline shift + fact grid + impact)
                  2. Affected clients (scope table + apply/review controls)
                  3. Source & confidence (warnings + source extract + provenance)
                  4. Activity         (lifecycle timeline + team notes)
                No new section labels: each card's boundary + its existing inner
                headers carry the grouping, so the panel reads as four obvious
                blocks. Card radius 12 (canonical wrapper); white fill pops
                against the gray body. */}

            {/* GROUP 1 — Extracted facts. The group cards use the canonical
                <DetailSectionCard> chrome — a gray header band (13/600
                title) + white px-5/py-4 body. Yuqi #6/#7: the card itself
                is titled "Extracted facts" (was "The change" + a repeated
                inner "Extracted facts" section header) and the AI-parsed
                caveat rides the card header's right slot — one title, one
                caveat, no duplicate label inside the body. */}
            <DetailSectionCard
              id="alert-section-facts"
              className="scroll-mt-16"
              title={<Trans>Extracted facts</Trans>}
              headerRight={<Trans>AI parsed — verify before Apply</Trans>}
            >
              {/* Pencil `Qla5h KeyChange`: the prominent deadline-change hero. */}
              <DeadlineChangeCard detail={detail} />

              <AlertStructuredFields detail={detail} />

              {/* "What this means for your practice" — self-gates. */}
              <PracticeImpactSection detail={detail} />
            </DetailSectionCard>

            {/* Rules to re-verify — the task list that clears the
                Mark-reviewed gate (`reverifyIncomplete`, footer + 'A'
                shortcut), so the disabled CTA's "rules below" tooltip
                points at a real surface. Sits between The change and
                Affected clients — it is the action the change demands. */}
            {detail.reverifyRuleIds.length > 0 ? (
              <ReverifyRulesSection
                reverifyRuleIds={detail.reverifyRuleIds}
                onReverified={() => {
                  void queryClient.invalidateQueries({ queryKey: orpc.pulse.key() })
                }}
              />
            ) : null}

            {/* GROUP 2 — Affected clients + apply/review controls. */}
            {showClientsGroup ? (
              <DetailSectionCard
                id="alert-section-clients"
                className="scroll-mt-16"
                title={
                  <>
                    <Trans>Affected clients</Trans>
                    {detail.affectedClients.length > 0 ? (
                      <span className="ml-2 font-normal tabular-nums text-text-tertiary">
                        {detail.affectedClients.length}
                      </span>
                    ) : null}
                  </>
                }
                headerRight={
                  // Pencil `G24tQh` header: bulk Confirm / Exclude on the right
                  // (overlay + apply permission). Otherwise the read-only count.
                  detail.alert.actionMode === 'due_date_overlay' && canApply && stats ? (
                    <>
                      <button
                        type="button"
                        onClick={handleConfirmAllNeedsReview}
                        disabled={stats.needsReviewCount === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-state-accent-solid px-2 py-[3px] text-xs font-semibold text-white outline-none transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                      >
                        <CheckIcon className="size-3 shrink-0" aria-hidden />
                        {t`Confirm ${stats.needsReviewCount}`}
                      </button>
                      <button
                        type="button"
                        onClick={handleExcludeSelected}
                        disabled={stats.selectedCount === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-divider-subtle bg-background-default px-2 py-[3px] text-xs font-semibold text-text-secondary outline-none transition-colors hover:bg-state-base-hover disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                      >
                        <XIcon className="size-3 shrink-0" aria-hidden />
                        <Trans>Exclude</Trans>
                      </button>
                    </>
                  ) : stats ? (
                    <SelectionSummary stats={stats} />
                  ) : undefined
                }
              >
                {/* Due-date overlay: per-row Confirm / Exclude is the
                    confirmation surface — always renders for due-date alerts. */}
                {detail.alert.actionMode === 'due_date_overlay' &&
                detail.alert.firmImpact !== 'no_current_match' ? (
                  <section className="flex flex-col gap-2">
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
                      <p className="rounded-lg border border-divider-subtle bg-background-soft px-4 py-3 text-sm text-text-secondary">
                        <Trans>
                          No clients matched this alert's scope. You can dismiss it or wait — if a
                          new client is added that matches the scope, the alert will reopen.
                        </Trans>
                      </p>
                    )}
                  </section>
                ) : null}

                {/* Review-only (rule-change / source-drift): read-only blast
                    radius — which clients have open obligations on the rule. */}
                {detail.alert.actionMode === 'review_only' && detail.affectedClients.length > 0 ? (
                  <section className="flex flex-col gap-3">
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

                {detail.alert.firmImpact !== 'no_current_match' && !canApply ? (
                  <PermissionInlineNotice permission="pulse.apply" currentRole={permissions.role} />
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

                {/* Pencil `sbs7M ReadyToApply`: green ready-to-apply
                    affirmation + Apply-now shortcut (same verification gate as
                    the footer). Real data: selected-client count + confidence. */}
                {detail.alert.actionMode === 'due_date_overlay' && deadlineApplyReady ? (
                  <section className="flex flex-col gap-3 rounded-xl bg-components-badge-bg-green-soft px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-text-success/15 text-text-success">
                        <ShieldCheckIcon className="size-4" aria-hidden />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-base font-semibold text-text-success">
                          <Trans>Ready to apply · deadline selection confirmed</Trans>
                        </span>
                        <p className="text-sm text-text-secondary">
                          <Plural
                            value={stats?.selectedCount ?? 0}
                            one="# client confirmed and matched to the new date."
                            other="# clients confirmed and matched to the new date."
                          />{' '}
                          <Trans>
                            Every decision is captured to the audit ledger and reversible for 24
                            hours.
                          </Trans>
                        </p>
                      </div>
                      <span className="hidden shrink-0 font-mono text-xs font-bold text-text-success tabular-nums sm:inline">
                        {t`conf ${Math.round(detail.alert.confidence * 100)}%`}
                      </span>
                    </div>
                    {canApply ? (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleApply}
                          disabled={isMutating}
                          className="bg-text-success hover:bg-text-success/90"
                        >
                          <Trans>Apply now</Trans>
                          <ArrowRightIcon data-icon="inline-end" />
                        </Button>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </DetailSectionCard>
            ) : null}

            {/* GROUP 3 — Source & confidence: warnings, the verbatim source
                extract, and a single confidence row. Batch 4 #15/#17: the
                card had two inner sub-headers ("Source extract", "How
                confident we are · where this came from") plus a 2-col
                provenance grid that re-stated the source link, publish
                date, and audit note already shown elsewhere — the card
                title + header-band link now carry all of it, and the body
                is just citation → quote → confidence. */}
            <DetailSectionCard
              id="alert-section-source"
              className="scroll-mt-16"
              title={<Trans>Source &amp; confidence</Trans>}
              headerRight={
                detail.alert.sourceUrl ? (
                  <a
                    href={detail.alert.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-text-accent underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  >
                    <Trans>Open original</Trans>
                    <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
                  </a>
                ) : undefined
              }
            >
              {/* Low AI confidence — a "double-check this" cue (amber, not
                  destructive). Names the % and explains what to verify. */}
              {isLowAiConfidence(detail.alert.confidence) ? (
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

              {detail.alert.sourceStatus === 'source_revoked' ? (
                <Alert variant="destructive">
                  <AlertTitle>
                    <Trans>Source revoked</Trans>
                  </AlertTitle>
                  <AlertDescription>
                    <Trans>
                      This source is no longer trusted. The historical alert remains visible, but
                      new apply, review, dismiss, and undo actions are disabled.
                    </Trans>
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* Citation line + verbatim quote. The "Source extract"
                  sub-header is gone (the card title says it); "Open
                  original" rides the card's header band. The quote is the
                  VERBATIM `sourceExcerpt` — its one home (it used to sit
                  at the bottom of Extracted facts while this card
                  re-quoted the summary, which is usually the title — two
                  lookalike quote boxes, one of them a repeat). */}
              {detail.sourceExcerpt.trim().length > 0 ? (
                <section className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
                    <span className="font-mono">{detail.alert.source}</span>
                    {detail.alert.publishedAt ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>
                          <Trans>Published</Trans>{' '}
                          <span className="tabular-nums">
                            {formatDatePretty(detail.alert.publishedAt)}
                          </span>
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className="group/excerpt relative">
                    {/* Classic quote anatomy (de-fill pass): a left rule, not
                        a gray slab — the italic + bar say "verbatim source". */}
                    <blockquote className="break-words border-l-2 border-divider-deep py-0.5 pr-10 pl-4 text-base leading-relaxed text-text-secondary italic">
                      &ldquo;{detail.sourceExcerpt}&rdquo;
                    </blockquote>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t`Copy source excerpt`}
                            onClick={() => {
                              void navigator.clipboard.writeText(detail.sourceExcerpt).then(
                                () => toast.success(t`Source excerpt copied`),
                                () => toast.error(t`Couldn't copy source excerpt`),
                              )
                            }}
                            className={cn(
                              'absolute right-2 top-2 opacity-0 transition-opacity',
                              'group-hover/excerpt:opacity-100 focus-visible:opacity-100',
                            )}
                          >
                            <CopyIcon aria-hidden />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        <Trans>Copy source excerpt</Trans>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </section>
              ) : null}

              {/* Confidence — one hairline row: % + tier left, the
                  what-to-do-about-it guidance right. The old 2-col
                  provenance grid duplicated the source link (header band),
                  publish date (citation above), and audit note (footer). */}
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
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-divider-subtle pt-3">
                    <span className="inline-flex items-baseline gap-2">
                      <span className={cn('text-base font-semibold tabular-nums', confToneClass)}>
                        {confPct}%
                      </span>
                      <span
                        className={cn('text-xs font-medium tracking-wide uppercase', confToneClass)}
                      >
                        <Trans>{confTierLabel} confidence</Trans>
                      </span>
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {confTier === 'low' ? (
                        <Trans>
                          Verify the extract matches the official source before applying.
                        </Trans>
                      ) : confTier === 'medium' ? (
                        <Trans>Quick-confirm the extracted fields look right.</Trans>
                      ) : (
                        <Trans>Model is confident — review and apply when ready.</Trans>
                      )}
                    </span>
                  </div>
                )
              })()}
            </DetailSectionCard>

            {/* GROUP 4 — Activity & notes: lifecycle timeline + team notes.
                The "N events · oldest first" meta rides the card header
                (Yuqi #11) so the timeline body needs no second header. */}
            <DetailSectionCard
              id="alert-section-activity"
              className="scroll-mt-16"
              title={<Trans>Activity &amp; notes</Trans>}
              headerRight={
                <span className="tabular-nums">
                  <Plural value={alertActivityEventCount(detail)} one="# event" other="# events" />
                  {' · '}
                  <Trans>oldest first</Trans>
                </span>
              }
            >
              {/* Pencil `gRY5g Activity`: lifecycle timeline built from the
                  alert's real timestamps (received → matched → reviewed →
                  current) — every node is a fact already on the record. */}
              <AlertActivityTimeline detail={detail} />

              {/* Pencil Aogxu §7 "Team notes": internal discussion threaded on
                  the alert. Wired to pulse.listAlertNotes / pulse.addAlertNote. */}
              <AlertTeamNotes alertId={detail.alert.id} />
            </DetailSectionCard>
          </div>
        ) : null}
      </div>

      {/* Sticky action footer — a committed decision surface, not
          continuation chrome: `min-h-16` + white `bg-background-default`
          so it separates from the gray body. `px-12` shares the
          header/body margin so the left edge is one continuous line. A
          single `border-t border-divider-subtle` (not a heavy double
          rule) matches the deadline detail footer. It's a single row —
          the audit-ledger note on the left (revealed only on wide panels
          where there's room) and the DrawerActions cluster filling the
          rest. The `A`/`D` kbd hints live ONLY in the top bar (Yuqi #13)
          — they used to render here too, and the duplicate cluster was
          what squeezed Mark-reviewed into overlapping Dismiss. `py-4`
          (was py-3) gives the action row the extra bottom breathing room
          Yuqi asked for. */}
      <SheetFooter className="min-h-16 flex-row items-center gap-6 border-t border-divider-subtle bg-background-default px-6 py-4 sm:flex-row xl:px-12">
        {/* The footer chrome spans full width; its actions cap to the
            760px `mx-auto` document measure so the action row sits
            centered under the same column the header + body share. */}
        <div className="mx-auto flex w-full max-w-[760px] flex-row items-center gap-6">
          {detail ? (
            <span className="hidden shrink-0 items-center gap-1.5 text-xs text-text-success xl:inline-flex">
              <ShieldCheckIcon className="size-3 shrink-0" aria-hidden />
              <Trans>Every decision captured to audit ledger</Trans>
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1">
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
                canDismiss={canDismiss}
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
                onDismiss={handleDismiss}
              />
            ) : null}
          </div>
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
  // Structural notes —
  //   • `h-full min-h-0` on the aside so the inner content can scroll
  //     without growing the page (prevents a left-and-right
  //     double-scroll).
  //   • Panel mode needs an explicit close affordance (Sheet mode gets
  //     one from the primitive's `showCloseButton` automatically).
  //   • Footer (SheetFooter) has `mt-auto` from the primitive — it pins
  //     to the bottom of the flex column when middle content is short;
  //     when middle is long, the middle scrolls underneath via its own
  //     overflow-y-auto.
  if (mode === 'panel') {
    if (!open) return null
    return (
      <>
        <aside
          aria-label={t`Alert detail`}
          // No panel frame/border: the rail's own right border already
          // separates the detail column from the list, so an extra
          // hairline reads as a redundant frame, and the body's scrollbar
          // sits flush with the column's right edge instead of nested
          // inside a border. `overflow-hidden` keeps the sticky
          // header/footer from bleeding into the body's scroll surface.
          // The panel surface is WHITE — alert detail is a flat
          // calm-document on white (deadline detail = warm gray; the
          // intentional divergence). The few tinted blocks (source-extract
          // quote, "What this means…" band) stay on borderless
          // `bg-background-subtle` so they still read as distinct against
          // the white body. The panel FILLS its column (`w-full`) so the
          // surface reaches the viewport edge, while the document CONTENT
          // inside stays capped to a 760px reading measure and CENTERED via
          // the per-region `mx-auto max-w-[760px]` wrappers.
          className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background-default shadow-subtle"
        >
          {/* The only close affordance lives in the body's BackStrip top
              bar (with prev/next paging) — one close, top-right. */}
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
        showCloseButton={false}
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
  canDismiss,
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
  onDismiss,
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
  /** Dismiss is offered while the alert is still awaiting a decision. */
  canDismiss: boolean
  reviewedSetReady: boolean
  // True when this review_only alert still has rules that need
  // re-verifying (a candidate / pending_review row in listRules). Gates
  // the "Mark reviewed" button so the alert can't be closed before the
  // underlying rule changes are accepted.
  reverifyIncomplete: boolean
  isMutating: boolean
  onApply: () => void
  onMarkReviewed: () => void
  onApplyReviewed: () => void
  onRevert: () => void
  onReactivate: () => void
  onRequestReview: () => void
  onCopyDraft: () => void
  onDismiss: () => void
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
    // All actions sit as ONE right-aligned cluster — secondaries
    // (Undo / Copy draft / Dismiss) immediately left of the primary CTA.
    // The old justify-between split left a dead gap mid-footer between
    // the secondary and primary groups (Yuqi batch 4 #19); the only
    // intentional space-between in the footer is audit-note ⟷ actions,
    // owned by the SheetFooter wrapper. Never wraps; secondaries shrink.
    <div className="flex w-full flex-nowrap items-center justify-end gap-3">
      <div className="flex min-w-0 flex-nowrap items-center gap-2">
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
        {/* The button is `size="sm"` (h-8) so it matches the other footer
            action buttons rather than the taller default primary CTA on
            the right. */}
        {firmImpact !== 'no_current_match' ? (
          <Button variant="ghost" size="sm" disabled={isMutating} onClick={onCopyDraft}>
            <MailIcon data-icon="inline-start" />
            <Trans>Copy client email draft</Trans>
          </Button>
        ) : null}
        {/* Dismiss — resolve the alert without applying. Offered only while
            it's still awaiting a decision (the `D` shortcut mirrors this). */}
        {canDismiss ? (
          <Button variant="ghost" size="sm" disabled={isMutating} onClick={onDismiss}>
            <XIcon data-icon="inline-start" />
            <Trans>Dismiss</Trans>
          </Button>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canRequestReview ? (
          <Button size="sm" disabled={isMutating} onClick={onRequestReview}>
            <MessageSquareIcon data-icon="inline-start" />
            <Trans>Request review</Trans>
          </Button>
        ) : null}
        {/* Primary action uses the default size while the other footer
            buttons stay sm, so this one reads as the dominant
            call-to-action. */}
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
            // No trailing "to N deadline(s)" count — the selection
            // checkbox above already shows it. Title case reads as a
            // deliberate decision verb.
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
    // The muted Manager-review panel uses the canonical Card primitive:
    // tone="muted" + radius="md" gives the bg-background-section +
    // border-divider-subtle + rounded-lg chrome, and xs density matches
    // the original p-3.
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
 * F-041 — alert deadline-shift verification gate.
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
          {/* The deadline-shift summary panel uses the canonical Card
              primitive (tone="muted" + radius="md") — the same
              muted-section recipe as the manager review panel, at sm
              density. */}
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
                    // max-w-full + truncated inner span: the Button base is
                    // whitespace-nowrap, so a long authority name would
                    // otherwise overflow the 560px dialog horizontally
                    // (hostile-data dialog audit).
                    className="h-auto max-w-full justify-start px-0 text-sm"
                    render={
                      <a href={detail.alert.sourceUrl} target="_blank" rel="noopener noreferrer" />
                    }
                  >
                    <span className="min-w-0 truncate">{detail.alert.source}</span>
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
            <blockquote className="line-clamp-6 break-words rounded-lg border border-divider-subtle bg-background-soft px-3 py-2 text-sm italic leading-relaxed text-text-secondary">
              “{detail.sourceExcerpt}”
            </blockquote>
          </section>

          {/* The acknowledgement. Label is a real label-for binding
              so click-on-text toggles the box. Active border bumps to
              text-text-warning so the un-checked state visually says
              "you still need to confirm". */}
          <Label
            htmlFor="pulse-apply-verified"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-divider-regular bg-background-default px-3 py-3 transition-colors hover:border-text-tertiary has-[input:checked]:border-state-accent-active-alt has-[input:checked]:bg-state-accent-active-alt/5"
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
