import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  Loader2Icon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react'

import type {
  PulseAlertPublic,
  PulsePriorityLevel,
  PulsePriorityReason,
} from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { JurisdictionChip } from '@/components/primitives/state-badge'
import { SeverityChip, type SeverityLevel } from '@/components/primitives/severity-chip'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { ValueDiff } from '@/components/primitives/value-diff'
import { isLowAiConfidence } from '@/features/_surface-vocabulary/ai-confidence'
import {
  dueDateDiffTone,
  DUE_DATE_DIFF_TONE_CLASS,
} from '@/features/_surface-vocabulary/due-date-tone'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { fadeMotion } from '@/lib/motion'
import { formatDatePretty, formatRelativeTime } from '@/lib/utils'

import { useAlertDetailFromCacheQueryOptions } from '../api'
import { AlertSourceLink } from './AlertSourceLink'
import {
  deadlineProximity,
  effectiveTier,
  proximityTimeTag,
  proximityToTier,
  thresholdsForKind,
} from '../lib/urgency'
import { ChangeKindIcon, changeKindLabel } from './PulseChangeKindChip'

/**
 * `PulseAlertRow` — list-row rendering of an alert, replacing the
 * older AlertCard (née `PulseAlertCard`) for the /alerts main list.
 *
 * A flat white row with bottom-border separator, 100px time rail on the
 * left, and a stacked head/title/key-change/bottom main column on the
 * right. Pencil reference: `ZkXFr Alert Card` (reusable instance used 4×
 * inside i90PZ).
 *
 * Layout (snapshot_layout dimensions):
 *   - Row: 1512×214, padding 18, white bg, bottom border 1px subtle
 *   - Time rail RZfzU: 100×40, gap 6
 *   - Main QEMxv: 1366×178, gap 6
 *     - HeadRow o1cLe: ×22
 *     - Subject IVBgx: ×44 (title + dek, gap 3)
 *     - KeyChange hKGFX: ×70 (gray inset, padding 10, gap 6)
 *     - Bottom vracc: ×24 (border-top, padding-top 8)
 *
 * Data wiring (every field on the row maps to a `PulseAlertPublic`
 * or `PulseDetail` field; nothing is hardcoded):
 *   - "14:32"   → `alert.publishedAt` formatted to HH:mm in the
 *                 firm's timezone
 *   - "2h ago"  → `formatRelativeTime(alert.publishedAt)`
 *   - HIGH/MED/LOW → `impactBadgeFromAlert(alert)` (real client
 *                    impact: matchedCount + needsReviewCount)
 *   - State pill   → `alert.jurisdiction` (kept the encapsulated
 *                    StateBadge style per the user's earlier ask)
 *   - Type tag     → `changeKindLabel(alert.changeKind)` + icon
 *   - Source name  → `alert.source`
 *   - Title        → `alert.title`
 *   - Dek          → `alert.summary`
 *   - Old → New    → `detail.originalDueDate` / `detail.newDueDate`
 *   - "N days …"   → derived from the date diff
 *   - "Effective"  → `detail.effectiveFrom` (immediate if past/today)
 *   - "Form X"     → `detail.forms[0]`
 *   - "Affects N"  → `alert.matchedCount + alert.needsReviewCount`
 *   - "conf N%"    → `alert.confidence`
 *
 * Fields the contract doesn't carry today (Pencil placeholders):
 *   - Source bulletin code "TSB-M-24(3)I" — would need a publication
 *     identifier on the source. Omitted; the source-meta sub-line
 *     falls back to the changeKind label when no bulletin id is
 *     available.
 *   - "ALBANY" city name — Pencil disabled this sub-element on the
 *     state pill anyway, so the row uses the canonical two-letter
 *     code only.
 *   - Generic "ACTION" call-to-action text — derived from the
 *     changeKind enum.
 */

/**
 * The leading meta pill is the smart-priority TIER (urgent/high/normal) from the
 * priority queue — not client-impact. 2026-06-18: routed through the shared
 * <SeverityChip> (soft-tint `--severity-*` ramp), replacing the inline-style
 * `--state-*` chips so alert priority, dashboard severity, and rule risk all read
 * as one family. urgent → critical (red), high → high (orange), normal → neutral.
 */
const LEVEL_PILL: Record<PulsePriorityLevel, { label: string; level: SeverityLevel }> = {
  urgent: { label: 'URGENT', level: 'critical' },
  high: { label: 'HIGH', level: 'high' },
  normal: { label: 'NORMAL', level: 'neutral' },
}

// ZkXFr's HeadRow carries no per-kind lucide icon; the change kind
// reads as text inside the source/sub right cluster (`changeKindLabel`)
// in mono uppercase.

/**
 * Mapping change-kind → derived action call-to-action text.
 * Pencil shows "Re-attest within new window" for a DEADLINE SHIFT
 * row; the rest follow the same template ("verb + scope object").
 * Not perfect — the proper fix is a structured `actionText` field
 * on PulseDetail.
 */
function deriveActionText(kind: PulseAlertPublic['changeKind']): string {
  switch (kind) {
    case 'deadline_shift':
      return 'Re-attest within new window'
    case 'filing_requirement':
      return 'Verify filing requirement applies'
    case 'applicability_scope':
      return 'Re-confirm client scope'
    case 'form_instruction':
      return 'Re-issue revised form'
    case 'source_status':
      return 'Review source change'
    case 'rule_source_drift':
      return 'Re-verify source against rule'
    case 'new_obligation':
      return 'Register new obligation'
    case 'protective_claim_window':
      return 'Review protective claim window'
    case 'threshold_advisory':
      return 'Review adjusted thresholds'
    case 'other':
      return 'Review change'
  }
  return 'Review change'
}

// Delegates to the canonical dictionary (docs/Design/date-formatting-canon.md):
// dateShort — "May 18" in the current year, year appended otherwise.
function formatMonthDay(iso: string | null): string | null {
  if (!iso) return null
  return formatDatePretty(iso)
}

/**
 * The time rail stacks three lines — date ("May 18"), wall-clock time
 * ("02:30"), and a duration-relative line ("18 days ago"). This returns
 * the signed whole-day
 * delta from now (positive = in the past) that the component formats
 * into line 3. Unlike `formatRelativeTime` (which switches to an
 * absolute date past one week), the rail keeps the duration form
 * because the absolute date already sits on line 1.
 */
function wholeDaysAgo(iso: string, now: Date): number {
  const diffMs = now.getTime() - new Date(iso).getTime()
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

function daysBetweenIso(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  const aMs = new Date(`${a}T00:00:00.000Z`).getTime()
  const bMs = new Date(`${b}T00:00:00.000Z`).getTime()
  return Math.round((bMs - aMs) / (24 * 60 * 60 * 1000))
}

/**
 * The smart-priority inset (`IciLB PriorityReasons`) — "Why this is
 * urgent · priority N" with a chip per scoring signal. Sourced from the real priority
 * queue (`PulsePriorityQueueItem.priorityScore` + `priorityReasons`),
 * not hardcoded; the row only renders it when the firm can view the
 * priority queue AND the alert is in the queue with at least one
 * reason.
 */
export interface AlertPriorityInfo {
  /** Priority tier (urgent/high/normal) driving the leading level pill
   *  (Pencil g5kKJQ `Rrafe`). */
  level: PulsePriorityLevel
  score: number
  reasons: readonly PulsePriorityReason[]
}

function PulseAlertRow({
  alert,
  active,
  onReview,
  onDismiss,
  dismissing = false,
  compact = false,
  selectable = false,
  selected = false,
  selectionActive: _selectionActive = false,
  onToggleSelected,
  priority,
  highImpact = false,
  showAction = true,
  showRailDate = true,
  narrow = false,
}: {
  alert: PulseAlertPublic
  active: boolean
  onReview: () => void
  /** Real dismiss/archive handler — opens the reason dialog
   *  which fires `orpc.pulse.dismiss` on confirm. */
  onDismiss?: () => void
  /**
   * True while THIS row's dismiss mutation is in flight. Disables the
   * Dismiss button + swaps its icon for a spinner so a CPA on a slow
   * link can't double-fire the same dismiss (2026-06-22 audit).
   */
  dismissing?: boolean
  /**
   * Bulk-selection affordance. When `selectable`, the 18px leading
   * checkbox (Pencil `gT3zO chk`)
   * renders ahead of the time rail; toggling it feeds the parent's
   * selection set + the floating bulk-action bar.
   */
  selectable?: boolean
  selected?: boolean
  /**
   * 2026-06-15 (critique #8): true when a bulk selection is already in
   * progress (≥1 row ticked anywhere in the list). While active, every row's
   * checkbox stays visible; otherwise the checkbox is hover-revealed so the
   * read-first triage list isn't fronted by a column of empty boxes.
   */
  selectionActive?: boolean
  onToggleSelected?: (next: boolean) => void
  /** Smart-priority inset data (Pencil `IciLB`). Undefined hides the
   *  inset + the "Why?" toggle entirely. */
  priority?: AlertPriorityInfo | undefined
  /**
   * `compact` collapses the row to its main column only — the
   * 100px time-rail on the left is dropped. PulseAlertList
   * threads `compact={openAlertId !== null}` so every row goes
   * compact whenever the detail panel is up. The relative time
   * stays accessible via the head-row right cluster (rendered
   * only in compact mode so the time/date info isn't lost
   * entirely — just relocated to a quieter slot).
   */
  compact?: boolean
  /**
   * This alert ranks in the top 3 by client impact; render the "High
   * impact" badge in the head-row meta cluster.
   */
  highImpact?: boolean
  /**
   * When false, the ACTION suggestion line is hidden. Default true.
   */
  showAction?: boolean
  /**
   * 2026-06-12 (Yuqi /alerts #6 "do we show the date again? we have the
   * date in the header already"): when the list renders day-group bands,
   * the band owns the date — the time rail shows only the wall-clock.
   * Flat (ungrouped) lists keep date + time. Default true (flat).
   */
  showRailDate?: boolean
  /**
   * 2026-06-23: true ONLY for the map view's narrow (~460px) navigator
   * rail. Trims the head row to the essentials a CPA needs to triage in
   * a tight column — the urgency tier pill + the due/lateness tag stay,
   * but the secondary meta (High-impact chip, form code, change-kind
   * text, low-confidence pill, source link) drops off line one so the
   * title + status signal aren't crammed and clipped. Demote-not-delete:
   * every trimmed fact is still one click away in the detail drawer (and
   * the source/change-kind also live on the wide list). The wide list
   * (`narrow=false`) is untouched. Distinct from `compact` (which is
   * also true on the panel-open wide list, where the visible rail is
   * AlertListRail, not this row).
   */
  narrow?: boolean
}) {
  const { t } = useLingui()
  // Cache-only subscription — the date-diff / form fields fill in when the
  // page's getDetailsBatch seed (or the open drawer's refetch) lands. The
  // row itself never issues a `pulse.getDetail` request.
  const detailQuery = useQuery(useAlertDetailFromCacheQueryOptions(alert.id))
  const detail = detailQuery.data

  // The smart-priority inset is collapsed by default; the "Why?" pill
  // in the meta strip expands it. Only meaningful when `priority` data
  // is present.
  const [whyOpen, setWhyOpen] = useState(false)
  const showPriority = !!priority && priority.reasons.length > 0

  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const publishedDate = new Date(alert.publishedAt)
  const absoluteTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: firmTimezone,
  }).format(publishedDate)
  // Line 1 of the time rail — "May 18" (month + day in firm tz).
  const railDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: firmTimezone,
  }).format(publishedDate)
  const relativeTime = formatRelativeTime(alert.publishedAt)
  // Line 3 of the rail — duration-relative ("18 days ago").
  const daysAgo = wholeDaysAgo(alert.publishedAt, new Date())
  const railRelative =
    daysAgo <= 0 ? relativeTime : daysAgo === 1 ? t`yesterday` : t`${daysAgo} days ago`

  // Leading pill = urgency tier (see lib/urgency.ts + the 2026-06-14 eng
  // brief). Two layers:
  //   • Layer 2 (smart priority): when the firm can view the priority queue
  //     AND this alert is in it, `priority.level` wins — the richer signal.
  //   • Layer 1 (deadline proximity): the ungated fallback, derived from the
  //     alert's own `actionDeadline`, so firms WITHOUT the queue permission
  //     still see imminent/overdue rows light up.
  // We still never paint a misleading NORMAL pill on every baseline row: a
  // baseline tier only renders when it's urgent/high (a real time signal).
  // A smart-priority NORMAL is kept (it's a deliberate queue placement).
  const nowMs = Date.now()
  // Per-kind horizon: protective-claim windows surface from 60 days out (a hard
  // legal cutoff), everything else from 14 (see lib/urgency thresholdsForKind).
  const proximity = deadlineProximity(
    alert.actionDeadline,
    nowMs,
    thresholdsForKind(alert.changeKind),
  )
  const baselineTier = proximityToTier(proximity.proximity)
  const tier: PulsePriorityLevel | null = priority
    ? effectiveTier(alert, nowMs, priority.level)
    : baselineTier === 'normal'
      ? null
      : baselineTier
  const levelPill = tier ? LEVEL_PILL[tier] : null
  // Quiet supporting cue (Phase 3): the deadline tag explains WHY the pill is
  // urgent ("2d left") without a second red — the pill owns the only red on the
  // row (Yuqi 2026-06-14: neutral tag, red pill only). Null for far-out /
  // no-deadline alerts, so silence stays the signal.
  const timeTag = proximityTimeTag(proximity)

  // Confidence flag (Pencil aUZTy) — surfaced ONLY when the extraction is
  // genuinely low-confidence (< 0.5, the canonical `isLowAiConfidence` floor),
  // the SAME threshold the detail's low-confidence banner fires on — so the list
  // pill, the rail pill, and the detail banner always agree (2026-06-15 critique
  // #1/#3: the row used to flag the whole non-high band, stamping a 58% alert
  // "Low confidence" while its detail calmly said "Medium" — same record, two
  // words). Medium/high now show nothing here; the absence is the all-clear and
  // the detail Source card still states the exact tier. Amber-family, never red
  // (the row's single red stays on the urgent deadline pill).
  const showLowConfidence = isLowAiConfidence(alert.confidence)

  // Unread/needs-attention dot (aUZTy) — true while the alert is still awaiting
  // a decision (not yet applied / dismissed / reviewed / reverted). Drives the
  // small accent dot leading the time rail; handled alerts (history) lose it.
  const unread = alert.status === 'matched' || alert.status === 'partially_applied'

  const impacted = alert.matchedCount + alert.needsReviewCount

  // Pencil `jclC5` date row — only renders if BOTH dates exist on
  // the detail payload. The diff badge ("N DAYS SOONER" red /
  // "N DAYS LATER" amber) follows the sign of the day count.
  const oldDateLabel = formatMonthDay(detail?.originalDueDate ?? null)
  const newDateLabel = formatMonthDay(detail?.newDueDate ?? null)
  const daysDiff = daysBetweenIso(detail?.originalDueDate ?? null, detail?.newDueDate ?? null)
  const showDateRow = oldDateLabel && newDateLabel

  // `effectiveLabel` lets the facts row render "Effective immediately"
  // / "Effective MMM D" alongside the form-revised line, in ZkXFr's
  // horizontal time-rail + main-column architecture.
  const isEffectiveNow = (() => {
    if (!detail?.effectiveFrom) return false
    const eff = new Date(`${detail.effectiveFrom}T00:00:00.000Z`).getTime()
    return eff <= Date.now()
  })()
  const effectiveLabel = detail?.effectiveFrom
    ? isEffectiveNow
      ? t`Effective immediately`
      : t`Effective ${formatMonthDay(detail.effectiveFrom)}`
    : null
  const formLabel = detail?.forms?.[0] ?? null
  // Hidden when the list's "Show suggested action" toggle is off.
  // Nulling it here also drops it from `showKeyChange` so the KeyChange
  // row collapses cleanly when nothing else fills it.
  const actionText = showAction ? deriveActionText(alert.changeKind) : null
  const showKeyChange = !!(showDateRow || effectiveLabel || formLabel || actionText)

  // 2026-06-16 (Yuqi "dim anything besides the alert title when not selected"):
  // on rows that AREN'T the open one, everything but the headline recedes — the
  // metadata cluster (jurisdiction/form/change-kind/source/time), the time rail,
  // and the KeyChange/action all drop to a quiet tier so the list scans as a
  // clean column of titles. Hovering a row, or opening it (`active`), lifts its
  // detail back to full. The title <h3> never recedes.
  const recede = active
    ? undefined
    : 'opacity-60 transition-opacity duration-150 group-hover/row:opacity-100'

  return (
    <article
      role="button"
      tabIndex={0}
      // The row reads as "Alert: <title>" to both screen readers and the
      // test locators — E2E specs (pulse.spec.ts:248,
      // rbac-permissions.spec.ts:123) match /Alert: …/.
      aria-label={t`Alert: ${alert.title}`}
      aria-pressed={active}
      onClick={onReview}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onReview()
        }
      }}
      className={cn(
        // Row padding aligned to ActionsTable's TableCell rhythm —
        // `px-5 py-3` so /alerts rows share the same density as /today
        // table rows. Time rail still owns the left 100px when not
        // compact.
        // Rows are a FLAT uniform white surface (no zebra striping by
        // impact): client impact is already carried by the "Affects N
        // clients" meta + the High-impact pill, so a receding fill would
        // be redundant signal. Hover/active use the canonical interactive
        // -row motif (accent wash + 2px inset left accent bar — the
        // clients-list treatment baked into TableRow, applied here
        // directly since this row doesn't use the table primitive; see
        // dev-log 2026-06-10-hover-accent-bar-rows).
        'group/row relative flex cursor-pointer gap-[10px] border-b border-divider-subtle px-5 py-3 outline-none transition-[color,box-shadow]',
        'focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        active
          ? 'bg-state-accent-hover shadow-[inset_2px_0_0_var(--color-state-accent-solid)]'
          : 'bg-background-default hover:bg-state-accent-hover hover:shadow-[inset_2px_0_0_var(--color-state-accent-solid)]',
      )}
    >
      {/* Bulk-select checkbox (Pencil g5kKJQ `gT3zO chk`, 18px).
          Sits ahead of the time rail. Click is isolated with
          stopPropagation so ticking a row doesn't also open the
          drawer. Aligned to the top of the row (the metaRow / title)
          rather than centered, matching the design. */}
      {selectable ? (
        <div
          className={cn(
            // 2026-06-15 critique #8: the slot ALWAYS reserves its width (revealing
            // the box never shifts the row), but the box itself is hover-revealed
            // unless this row is ticked or a selection is already underway — so a
            // read-first triage list isn't led by a column of empty checkboxes.
            // Always visible (Yuqi 2026-06-23: "alert list should have the
            // checkbox always showing"). The unchecked box is a quiet outline,
            // so a persistent column stays subtle without hover-gating.
            'flex shrink-0 items-start pt-0.5',
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(next) => onToggleSelected?.(next)}
            aria-label={t`Select alert: ${alert.title}`}
            className="size-4 rounded"
          />
        </div>
      ) : null}

      {/* Time rail (Pencil g5kKJQ `y3rBWp`, 90px). Three stacked
          lines: date "May 18" (Geist 13/500 text-primary), wall-clock
          "02:30" (Geist 11/500 text-tertiary, -0.1px tracking), and a
          duration-relative "18 days ago" (Geist 11/normal text-muted).
          The rail is unmounted in `compact` mode; the relative time
          relocates to the head-row right cluster. */}
      {!compact ? (
        showRailDate ? (
          <div className={cn('flex w-[90px] shrink-0 flex-col gap-1', recede)}>
            {/* The third rail line (railRelative) is dropped — hovering
                the date surfaces "N days ago" instead, so the rail is just
                date + wall-clock at rest. */}
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    className="w-fit cursor-help text-base font-medium text-text-primary outline-none"
                    {...props}
                  >
                    {railDate}
                  </span>
                )}
              />
              <TooltipContent>{railRelative}</TooltipContent>
            </Tooltip>
            <span className="text-xs font-medium text-text-tertiary tabular-nums">
              {absoluteTime}
            </span>
          </div>
        ) : // 2026-06-16 (Yuqi "为什么不是左对齐"): day-grouped lists drop the 64px
        // left wall-clock rail entirely, so the row content's left edge lines up
        // with the date band above it (the band already owns the day). The
        // wall-clock + unread dot relocate to the head-row right cluster below.
        null
      ) : null}

      {/* Main column — gap-2 (8px) gives slight breathing room between
          the head row, subject, KeyChange, and bottom row so the four
          blocks read as distinct. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* HeadRow (Pencil g5kKJQ `iMPxe`) — gap 8. Pill order:
            level → state → form → change-kind (text) · sources →
            spacer → source link → why. */}
        <div className={cn('flex min-w-0 items-center gap-2', recede)}>
          {/* 2026-06-12 (Yuqi "using a pill to show Active in the Active
              tab is not reasonable or logical"): the ACTIVE badge is GONE
              from queue rows — the Review/Active tab already states which
              queue you're in, so the per-row pill was pure redundancy.
              The queues differ structurally instead: Active rows carry the
              date-diff KeyChange + affected clients; Review rows read
              "No client impact". (ActiveQueueChip still marks the DETAIL
              header + history, where queues mix.) */}
          {/* Level pill (Pencil `Rrafe`) — smart-priority tier. Only
              when the alert is in the priority queue. */}
          {levelPill ? (
            <SeverityChip level={levelPill.level}>{levelPill.label}</SeverityChip>
          ) : null}

          {/* HIGH IMPACT — the three alerts hitting the most clients. NEUTRAL
              gray chip, NOT red (2026-06-15 critique #4): red is reserved for the
              single URGENT priority pill, so a row never wears two reds (urgency
              + reach reading as one alarm). Client reach is carried by weight + a
              quiet chip; it sits on a different axis from the urgency tier, so it
              must look different from it too.
              Dropped on the narrow map rail (2026-06-23): the affects-N-clients
              meta on line two carries reach there without crowding line one. */}
          {highImpact && !narrow ? (
            <SeverityChip level="neutral">
              <Trans>High impact</Trans>
            </SeverityChip>
          ) : null}

          {/* STATE — shared JurisdictionChip primitive (outline reference
              tag, no circular StateBadge seal). Kept on the narrow rail: the
              two-letter jurisdiction is the cheapest triage anchor (and the
              map rail is filtered BY state, so it confirms the active tile). */}
          <JurisdictionChip code={alert.jurisdiction} />

          {/* FORM PILL — shared TaxCodeBadge primitive (bg-subtle mono
              code chip), stock chrome so the form badge reads identically
              on every surface (per the pulse-alert-chrome contract: no
              className override on /alerts). Dropped on the narrow map rail —
              the form code lives in the detail drawer's structured fields. */}
          {formLabel && !narrow ? <TaxCodeBadge code={formLabel} /> : null}

          {/* CHANGE KIND — icon + sentence-case medium secondary, matching
              the detail hero exactly (2026-06-14). One treatment across
              list + rail + detail. Dropped on the narrow map rail — the kind
              reads in the detail hero; the title already carries the gist. */}
          {!narrow ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <ChangeKindIcon changeKind={alert.changeKind} />
              {changeKindLabel(alert.changeKind)}
            </span>
          ) : null}

          {/* CONFIDENCE FLAG (Pencil aUZTy) — a categorical warning pill shown
              ONLY when the extraction is shaky: "Low confidence" (medium tier)
              / "Very low confidence" (low tier). High confidence shows nothing
              — the absence is the all-clear. Amber-family (never red — the row's
              one red stays on the urgent deadline). Replaces the always-on
              "N% confidence" meter that used to sit in the bottom meta. Dropped
              on the narrow map rail — the detail Source card still states the
              exact confidence tier. */}
          {showLowConfidence && !narrow ? (
            <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-lg bg-state-warning-hover px-1.5 text-xs font-medium whitespace-nowrap text-text-warning">
              <CircleAlertIcon className="size-3 shrink-0" aria-hidden />
              <Trans>Low confidence</Trans>
            </span>
          ) : null}

          {/* SOURCE — moved into the left identity cluster (2026-06-15 critique
              #6). Pinned to the far right it left a wide dead gap between the
              title and "where this came from", a long horizontal eye-sweep on
              every row. It now reads beside the change-kind — "what kind of
              change, from where" as one phrase — and shrinks/truncates so it
              never crowds the right-side time-to-act. Dropped on the narrow map
              rail — the source link lives on the detail's Source card. */}
          {!narrow ? (
            <AlertSourceLink source={alert.source} sourceUrl={alert.sourceUrl} withTooltip />
          ) : null}

          {/* Spacer NdGpw (fill_container) */}
          <span className="flex-1" aria-hidden />

          {/* Wall-clock + unread dot — relocated here from the removed left
              wall-clock rail on day-grouped lists (Yuqi "左对齐"), so the row
              content stays flush-left with the date band while the "when it
              arrived" + unread cue keep a home. Only when there's no date rail
              (day-grouped) and not compact; the dot reserves its slot when read
              so the times stay aligned across rows. */}
          {!compact && !showRailDate ? (
            <span className="flex shrink-0 items-center gap-1.5">
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  // Unseen marker → bright highlight tier (--color-brand-highlight).
                  unread ? 'bg-brand-highlight' : 'bg-transparent',
                )}
                aria-hidden
              />
              <Tooltip>
                <TooltipTrigger
                  render={(props) => (
                    <span
                      className="cursor-help text-xs font-medium text-text-tertiary tabular-nums outline-none"
                      {...props}
                    >
                      {absoluteTime}
                    </span>
                  )}
                />
                <TooltipContent>
                  {railDate} · {railRelative}
                </TooltipContent>
              </Tooltip>
            </span>
          ) : null}

          {/* DEADLINE TIME TAG (Phase 3) — quiet mono "Nd left" / "Due today" /
              "Nd overdue". Neutral by design: the URGENT/HIGH pill carries the
              row's only red, this tag just says how long is left. Hidden for
              far-out / no-deadline alerts (proximityTimeTag → null). */}
          {timeTag ? (
            <span className="shrink-0 font-mono text-xs font-medium whitespace-nowrap text-text-tertiary tabular-nums">
              {timeTag}
            </span>
          ) : null}

          {/* COMPACT-MODE inline time — only rendered when the time rail
              is hidden. Reads as a quiet relative timestamp ("2h ago" /
              "Jun 4") with the exact HH:mm on tooltip hover, so the
              panel-open layout doesn't lose the "when did this drop"
              signal even though the rail is gone. */}
          {compact ? (
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    className="shrink-0 cursor-help whitespace-nowrap text-sm font-medium text-text-tertiary tabular-nums outline-none"
                    {...props}
                  >
                    {relativeTime}
                  </span>
                )}
              />
              <TooltipContent>{absoluteTime}</TooltipContent>
            </Tooltip>
          ) : null}

          {/* "Why?" toggle (Pencil g5kKJQ `X6enpJ whyAff`) — expands
              the smart-priority reason inset below. Only renders when
              the alert carries priority-queue reasons. */}
          {showPriority ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setWhyOpen((open) => !open)
              }}
              aria-expanded={whyOpen}
              className={cn(
                'inline-flex h-[22px] shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2 text-xs font-semibold text-text-accent outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                // Pencil `X6enpJ`: expanded = accent fill + accent
                // border; collapsed = transparent with a hairline
                // border that tints to the accent wash on hover.
                whyOpen
                  ? 'border-state-accent-border bg-state-accent-hover'
                  : 'border-divider-subtle bg-transparent hover:bg-state-accent-hover',
              )}
            >
              <Trans>Why?</Trans>
              {whyOpen ? (
                <ChevronUpIcon className="size-3" aria-hidden />
              ) : (
                <ChevronDownIcon className="size-3" aria-hidden />
              )}
            </button>
          ) : null}
        </div>

        {/* Subject — title only. No 2-line summary dek (it largely
            restated the title and added noise to every row). The title
            carries the headline (clamped to 2 lines so long ones aren't
            cut mid-thought); the full summary lives in the detail
            drawer. */}
        <h3
          // `text-lg` (the 16px token, not a literal) + text-primary —
          // the title is the row's primary read, so it takes the primary
          // ink while everything around it recedes (batch 3 #3 polish).
          // 2026-06-12 (Yuqi "is it because it is too wide — the alerts
          // are so hard to read?" → attack): titles ran ~140ch at full
          // row width, double the readable measure, so the eye lost the
          // line on every return sweep. Capped at 72ch — long titles now
          // wrap to two lines (distinct row silhouettes), and the freed
          // right side stays meta-only.
          // 2026-06-12 (Yuqi "flat hierarchies, nothing strong"): title led with
          // the 16/600 tier — the one big ink jump per row.
          // 2026-06-16 (Yuqi "why the titles so big and bold"): dialed back to
          // 14/500. The headline still leads (it's the largest text block on the
          // row + heavier than the 12px meta) but no longer shouts, and it now
          // matches the deadline row weight for list-to-list cohesion. If this
          // reads flat, the lever is weight (→ semibold), not size.
          className="line-clamp-2 min-w-0 max-w-[72ch] text-base font-medium text-text-primary"
          title={alert.title}
        >
          {alert.title}
        </h3>

        {/* KeyChange inset hKGFX — transparent (Pencil fill disabled),
            gap 8 vertical. */}
        {showKeyChange ? (
          // No `mt-1` push — the parent main col uses `gap-2`, so each
          // block already has 8px breathing.
          <div className={cn('flex flex-col gap-2', recede)}>
            {showDateRow ? (
              // Canonical before→after via <ValueDiff> (one home for the pattern).
              // Tone shared with the detail's DeadlineChangeCard via the one
              // `due-date-diff` helper (critique #8/#9): sooner = red, later =
              // green (relief), no change = neutral — so one alert never reads
              // amber here and green in its detail, and a 0-day shift isn't a
              // coloured "0 days later".
              <ValueDiff
                from={oldDateLabel}
                to={newDateLabel}
                {...(daysDiff !== null
                  ? {
                      delta:
                        daysDiff === 0
                          ? t`No change`
                          : `${Math.abs(daysDiff)} ${daysDiff < 0 ? t`days sooner` : t`days later`}`,
                      deltaClassName: DUE_DATE_DIFF_TONE_CLASS[dueDateDiffTone(daysDiff)],
                    }
                  : {})}
              />
            ) : null}

            {/* This region is reserved for action-status semantics —
                the action pill below. Effective/form facts live in the
                drawer (PulseStructuredFields), not here. */}

            {actionText ? (
              <div className="flex">
                {/* Suggested action (Pencil aUZTy) — the do-this affordance.
                    2026-06-15 critique #5: dropped the filled accent pill. When
                    EVERY row wore a filled blue pill the accent stopped meaning
                    "act here" — a wall of blue. It now reads as quiet accent text
                    + wand: still scannable as the next step, weightless enough
                    that a genuinely accented control (the detail CTA) keeps its
                    meaning. */}
                <span className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-text-accent">
                  <SparklesIcon className="size-3 shrink-0" aria-hidden />
                  {actionText}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Smart-priority inset (Pencil g5kKJQ `IciLB PriorityReasons`)
            — collapsed until the "Why?" pill is clicked. Header line
            "Why this is urgent · priority N" + "N signals", then one
            chip per scoring reason ("+30 · A preparer asked about
            this client"). All values come from the real priority
            queue; nothing is hardcoded. */}
        {showPriority && whyOpen && priority ? (
          <div className="flex flex-col gap-2 rounded-xl border border-divider-subtle bg-background-default-subtle px-[14px] py-3 animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-3 shrink-0 text-text-accent" aria-hidden />
              <span className="text-xs font-semibold tracking-[0.3px] text-text-secondary">
                <Trans>Why this is urgent · priority {priority.score}</Trans>
              </span>
              <span className="flex-1" aria-hidden />
              <span className="text-xs font-medium text-text-tertiary tabular-nums">
                <Plural value={priority.reasons.length} one="# signal" other="# signals" />
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {priority.reasons.map((reason) => (
                <span
                  key={reason.key}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-divider-subtle bg-background-default px-2 py-1"
                >
                  <span className="text-xs font-semibold text-text-accent tabular-nums">
                    +{reason.points}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary">{reason.label}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Impact shelf — rendered ONLY when the row touches clients (2026-06-15
            critique #7). Impacted rows answer triage question #1 in the loud form
            (icon + primary ink, visibly heavier in the scan); no-impact rows stay
            SILENT — "No client impact" repeated muted on every row was absence
            taking a line, so the list isn't padded with it (the line's presence
            is the signal, matching the Active tab; the detail still states impact
            explicitly). The hover Dismiss/Review cluster floats separately (below)
            so a no-impact row carries no empty shelf at rest. */}
        {impacted > 0 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-divider-subtle pt-2 text-sm">
            {/* On the wide list the reach line answers triage question #1 in the
                loud form (primary ink). On the narrow map rail it reads in a
                calm secondary tone instead — it's now the line that CARRIES
                reach (the High-impact chip dropped off line one there), and the
                tight column wants one quiet meta, not a second bold signal
                fighting the title + urgency tag above it. */}
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium',
                narrow ? 'text-text-secondary' : 'text-text-primary',
              )}
            >
              <UsersIcon className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
              <Plural value={impacted} one="Affects # client" other="Affects # clients" />
            </span>
          </div>
        ) : null}
      </div>

      {/* Hover action cluster — Dismiss / Review. Floated into the row's empty
          right gutter (the title is width-capped, so that column is blank),
          vertically centred and absolute so it reserves NO height: dropping the
          "No client impact" line (critique #7) would otherwise leave an empty
          shelf on every no-impact row, or growing it on hover would shove the
          rows below. Fades in on row hover; each button stopPropagation so the
          row's onClick doesn't bubble. */}
      <span
        className="absolute top-1/2 right-5 inline-flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100"
        aria-hidden={!active}
      >
        {/* Dismiss uses the canonical <Button> primitive (outline xs) so it
            matches Review beside it and every other button in the app. The
            squircle corner is overridden to a plain rounded-lg so these row
            buttons match the row's chips. */}
        {onDismiss ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="rounded-lg [corner-shape:round]"
            // Disabled while this row's dismiss is in flight so a slow
            // link can't double-fire the same dismiss; the spinner makes
            // the pending state legible at the row (2026-06-22 audit).
            disabled={dismissing}
            onClick={(event) => {
              event.stopPropagation()
              if (dismissing) return
              onDismiss()
            }}
            aria-label={t`Dismiss alert`}
          >
            {dismissing ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ArchiveIcon data-icon="inline-start" />
            )}
            <Trans>Dismiss</Trans>
          </Button>
        ) : null}
        {/* Review uses the canonical `<Button>` primary — the same primitive
            every other primary action across the app uses. */}
        <Button
          type="button"
          size="xs"
          className="rounded-lg [corner-shape:round]"
          onClick={(event) => {
            event.stopPropagation()
            onReview()
          }}
        >
          <Trans>Review</Trans>
        </Button>
      </span>
    </article>
  )
}

/**
 * Day-grouped wrapper around `PulseAlertRow`. Per Pencil i90PZ the
 * list is broken into per-day sections, each section opened by a
 * "TODAY · TUE · SEP 24, 2024" header row (`wlgGV`) with a count
 * pinned to the right. Sun icon for "today", chevron-back-ish
 * neutrality for other days (we just drop the icon when it's not
 * today).
 *
 * Day key is the firm's local date (YYYY-MM-DD), so an alert
 * published at 23:30 in the CPA's timezone sits under that day,
 * not UTC.
 */
function startOfFirmDay(iso: string, timeZone: string): string {
  // Produce a YYYY-MM-DD key in the firm timezone. Intl
  // DateTimeFormat with sortable 'en-CA' gives us "YYYY-MM-DD".
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(new Date(iso))
}

function formatDayHeader(
  dayKey: string,
  timeZone: string,
): {
  label: string
} {
  // 2026-06-15 (Yuqi — Pencil aUZTy "clean up the date header"): the band is a
  // single quiet date eyebrow — "May 20, 2026", uppercased via CSS — with no
  // weekday, count, or icon. The date itself is the section marker; the busier
  // "Wednesday May 20 · 1 alert" treatment is retired.
  const date = new Date(`${dayKey}T12:00:00.000Z`)
  const label = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(date)
  return { label }
}

function PulseAlertList({
  alerts,
  openAlertId,
  onReview,
  onDismiss,
  dismissingId = null,
  selectable = false,
  selectedIds,
  onToggleSelected,
  priorityById,
  compact,
  narrow = false,
  grouped = true,
  highImpactIds,
  showAction = true,
  className,
}: {
  alerts: readonly PulseAlertPublic[]
  openAlertId: string | null
  onReview: (alertId: string) => void
  onDismiss?: (alertId: string) => void
  /** Id of the alert whose dismiss mutation is currently in flight, or
   *  null. The matching row disables + spins its Dismiss button. */
  dismissingId?: string | null
  /**
   * Force compact rows regardless of whether a detail panel is open.
   * The map view's right rail is ~420px, so it renders the same compact
   * rows the panel-open list uses. When omitted, compactness is derived
   * from `openAlertId` (a row is compact while the detail panel is up).
   */
  compact?: boolean
  /**
   * 2026-06-23: passthrough to every row's `narrow` — true ONLY for the
   * map view's narrow (~460px) navigator rail. Trims each row's head line
   * to the urgency tier + due/lateness tag and calms the affects-N-clients
   * meta. The wide list never sets it.
   */
  narrow?: boolean
  /**
   * Bulk-selection wiring. When `selectable`, every row grows a leading
   * checkbox and the list renders the "Select all · N dispatches"
   * BulkSelectStrip (`TAamJ`) above the day groups.
   */
  selectable?: boolean
  selectedIds?: ReadonlySet<string>
  onToggleSelected?: (alertId: string, next: boolean) => void
  onSelectAll?: (next: boolean) => void
  /** Smart-priority inset data keyed by alert id (Pencil `IciLB`). */
  priorityById?: ReadonlyMap<string, AlertPriorityInfo>
  /**
   * When false the list renders FLAT — no per-day header bands. Used by
   * the impact sort (where chronological grouping is meaningless) and
   * the map view's navigator rail. Defaults to true (the chronological
   * newest/oldest list).
   */
  grouped?: boolean
  /**
   * Ids of the alerts that rank in the top 3 by client impact. Rows in
   * this set render a "High impact" badge.
   */
  highImpactIds?: ReadonlySet<string>
  /**
   * When false, the per-row ACTION suggestion line is hidden. Default
   * true.
   */
  showAction?: boolean
  /**
   * Optional passthrough merged onto the list frame's outermost element.
   * Used by /alerts to crossfade the list in on the list⇄map view toggle
   * (opacity-only, layout-safe).
   */
  className?: string
}) {
  const { t } = useLingui()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)

  // Panel-open state derives from whether any alert is currently the
  // active one. When panelOpen, every row renders in `compact` mode —
  // the 100px time rail is hidden and the relative time relocates to an
  // inline tooltip slot. An explicit `compact` prop (map view's narrow
  // rail) overrides the derived value.
  const panelOpen = compact ?? openAlertId !== null

  // A bulk selection is "active" once any row is ticked — every checkbox then
  // stays visible (critique #8); at zero selection the boxes hover-reveal.
  const selectionActive = (selectedIds?.size ?? 0) > 0

  // Group alerts by firm-local date, preserving the (already
  // sort-ordered) array order. Map preserves insertion order so
  // earlier days come first when the sort is "Newest first".
  const groups = new Map<string, PulseAlertPublic[]>()
  for (const alert of alerts) {
    const key = startOfFirmDay(alert.publishedAt, firmTimezone)
    const bucket = groups.get(key)
    if (bucket) {
      bucket.push(alert)
    } else {
      groups.set(key, [alert])
    }
  }

  // Each row is wrapped in a motion.div so dismissing an alert (which
  // drops it from `alerts` on the next query settle) dissolves the row at
  // the grammar exit tempo (fadeMotion, 120ms) instead of popping out —
  // the optimistic action visibly *resolves*. Only `exit` is wired (no
  // initial/animate), so rows render at full opacity and the list load /
  // re-sort stays still; nothing fades IN. The wrapper is an unstyled
  // block — each row owns its own border-b, so layout is unchanged.
  // Reduced-motion collapses the fade to ~0 globally (preset.css + root
  // MotionConfig).
  const renderRow = (alert: PulseAlertPublic) => (
    <motion.div key={alert.id} exit={fadeMotion.exit} transition={fadeMotion.transition}>
      <PulseAlertRow
        alert={alert}
        active={alert.id === openAlertId}
        onReview={() => onReview(alert.id)}
        {...(onDismiss ? { onDismiss: () => onDismiss(alert.id) } : {})}
        dismissing={alert.id === dismissingId}
        compact={panelOpen}
        selectable={selectable}
        selected={selectedIds?.has(alert.id) ?? false}
        selectionActive={selectionActive}
        {...(onToggleSelected
          ? { onToggleSelected: (next: boolean) => onToggleSelected(alert.id, next) }
          : {})}
        priority={priorityById?.get(alert.id)}
        highImpact={highImpactIds?.has(alert.id) ?? false}
        showAction={showAction}
        narrow={narrow}
        // Day-grouped lists: the band owns the date, rows show time only
        // (Yuqi #6). Flat lists (impact sort / map rail) keep date + time.
        showRailDate={!grouped}
      />
    </motion.div>
  )

  return (
    // List frame — rounded-12 white surface WITH a hairline border.
    // 2026-06-23 (Yuqi "the alert list needs left and right border"): the outer
    // `border-divider-regular` is back — it frames the card so the full-bleed
    // colored day bands and padded rows read as one bounded table (the same
    // canonical frame /today + /deadlines use). (Supersedes the 2026-06-12
    // "hide the border" pass.)
    // `overflow-clip` (not -hidden) clips the full-bleed day bands to the
    // rounded frame WITHOUT creating a scroll container — position:sticky
    // on the day bands (Yuqi #7) dies inside overflow-hidden but survives
    // clip. Tooltips/popovers portal to <body>, so the clip never
    // truncates them.
    // `shrink-0` so the list frame keeps its full content height inside
    // the overflow-y-auto list column — without it flex shrinks the frame
    // to fit and the clip swallows the rest, so nothing scrolls.
    <div
      className={cn(
        'flex shrink-0 flex-col overflow-clip rounded-xl border border-divider-regular bg-background-default',
        className,
      )}
    >
      {/* No BulkSelectStrip ("Select all · N dispatches", Pencil
          `TAamJ`): per-row checkboxes drive bulk selection in selectable
          mode, and the floating BulkActionBar appears once rows are
          picked — a top strip would duplicate the per-day band counts. */}

      {/* Flat (ungrouped) rendering for the impact sort + the map
          navigator rail — no per-day header bands, just the rows in their
          incoming order. */}
      {!grouped ? (
        <AnimatePresence initial={false}>{alerts.map(renderRow)}</AnimatePresence>
      ) : (
        Array.from(groups.entries()).map(([dayKey, dayAlerts]) => {
          const { label } = formatDayHeader(dayKey, firmTimezone)

          return (
            <div key={dayKey} className="flex flex-col">
              {/* Day header — a quiet uppercase date eyebrow: "MAY 20, 2026". No
                    weekday, count, or icon — the date is the section marker.
                    Sticky below the toolbar (top-12) so "when" stays answered
                    while a day's rows scroll under it; requires the frame's
                    overflow-clip. A `bg-background-subtle` fill (Yuqi 2026-06-23
                    "the date header row needs colour") gives the band a tint that
                    reads as a section break inside the bordered frame, and stays
                    opaque so rows mask cleanly as they scroll under it. Thin
                    (py-1.5), padded to the row content edge (px-5). */}
              <div className="group/band sticky top-12 z-10 flex items-center gap-[10px] border-b border-divider-subtle bg-background-subtle px-5 py-1.5">
                {/* Day select-all (Yuqi: "should a day have a select all
                      option") — tri-state, in the SAME slot as the row
                      checkboxes below so the date stays on the content grid.
                      Hover-revealed like the row checkboxes (critique #8) unless a
                      selection is underway; the slot keeps its width so the date
                      label never shifts. */}
                {selectable ? (
                  <Checkbox
                    checked={dayAlerts.every((a) => selectedIds?.has(a.id) ?? false)}
                    indeterminate={
                      dayAlerts.some((a) => selectedIds?.has(a.id) ?? false) &&
                      !dayAlerts.every((a) => selectedIds?.has(a.id) ?? false)
                    }
                    onCheckedChange={(next) => {
                      for (const dayAlert of dayAlerts) onToggleSelected?.(dayAlert.id, next)
                    }}
                    aria-label={t`Select all alerts on ${label}`}
                    // Always visible, matching the row checkboxes (Yuqi: checkbox
                    // always showing).
                    className="size-4 rounded"
                  />
                ) : null}
                <span className="text-xs font-semibold tracking-eyebrow text-text-tertiary uppercase tabular-nums">
                  {label}
                </span>
              </div>

              {/* Alert rows for this day. `compact` propagates from
                whether the detail panel is up (see the `panelOpen`
                computation above); the dismiss handler passes through
                from AlertsListPage so the hover-revealed action fires the
                orpc mutation. AnimatePresence lets a dismissed row fade
                out (fadeMotion exit) before the list collapses. */}
              <AnimatePresence initial={false}>{dayAlerts.map(renderRow)}</AnimatePresence>
            </div>
          )
        })
      )}
    </div>
  )
}

export { PulseAlertRow, PulseAlertList }
