import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  ArchiveIcon,
  Building2,
  CheckCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CornerDownRightIcon,
  ExternalLinkIcon,
  SparklesIcon,
  SunIcon,
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

import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { formatRelativeTime } from '@/lib/utils'

import { useAlertDetailQueryOptions } from '../api'
import { changeKindLabel } from './PulseChangeKindChip'

/**
 * `PulseAlertRow` — list-row rendering of an alert, replacing the
 * older AlertCard (née `PulseAlertCard`) for the /alerts main list.
 *
 * 2026-06-04 round 61 (Yuqi Pencil i90PZ — "update the alert page
 * to i90PZ. ensure 100% REPLICATED. I have used placeholder for the
 * content. you need to really wire them up."): rebuilt as a flat
 * white row with bottom-border separator, 100px time rail on the
 * left, and a stacked head/title/key-change/bottom main column on
 * the right. Pencil reference: `ZkXFr Alert Card` (reusable
 * instance used 4× inside i90PZ).
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
 * 2026-06-07 (Pencil g5kKJQ `Rrafe` levelPill): the leading meta pill
 * is the smart-priority TIER (urgent/high/normal) from the priority
 * queue — not client-impact. URGENT is destructive-red, HIGH is
 * warning-amber, NORMAL is a neutral subtle chip. Geist 10/700,
 * 0.6px tracking, 4px radius, hairline border. Exact hexes are taken
 * straight from the Pencil pills (Rrafe / P3itk / lZ9h8) so the chips
 * match the design 1:1 rather than approximating via tokens.
 */
const LEVEL_PILL: Record<
  PulsePriorityLevel,
  { label: string; bg: string; border: string; text: string }
> = {
  urgent: { label: 'URGENT', bg: '#FEE4E2', border: '#FCA5A5', text: '#D92D20' },
  high: { label: 'HIGH', bg: '#FFF4E5', border: '#FDBA74', text: '#B9501A' },
  normal: { label: 'NORMAL', bg: '#F9FAFB', border: '#1018281F', text: '#354052' },
}

// Round 67: change-kind icon map dropped — ZkXFr's HeadRow doesn't
// carry a per-kind lucide icon; the change kind now reads as text
// inside the source/sub right cluster (`changeKindLabel`) in mono
// uppercase.

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

function formatMonthDay(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(`${iso}T00:00:00.000Z`)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * 2026-06-07 (Pencil g5kKJQ `y3rBWp` time rail): the rail stacks three
 * lines — date ("May 18"), wall-clock time ("02:30"), and a duration-
 * relative line ("18 days ago"). This returns the signed whole-day
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
 * 2026-06-07 (Pencil g5kKJQ list-row anatomy): the smart-priority
 * inset (`IciLB PriorityReasons`) — "Why this is urgent · priority N"
 * with a chip per scoring signal. Sourced from the real priority
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
  onSnooze,
  onDismiss,
  compact = false,
  selectable = false,
  selected = false,
  onToggleSelected,
  priority,
}: {
  alert: PulseAlertPublic
  active: boolean
  onReview: () => void
  /** 2026-06-04 round 77 (Yuqi "wire to real"): real snooze
   *  handler — opens the reason dialog in the parent which
   *  fires `orpc.pulse.snooze` on confirm. */
  onSnooze?: () => void
  /** Real dismiss/archive handler — opens the reason dialog
   *  which fires `orpc.pulse.dismiss` on confirm. */
  onDismiss?: () => void
  /**
   * 2026-06-07 (Pencil g5kKJQ): bulk-selection affordance. When
   * `selectable`, the 18px leading checkbox (Pencil `gT3zO chk`)
   * renders ahead of the time rail; toggling it feeds the parent's
   * selection set + the floating bulk-action bar.
   */
  selectable?: boolean
  selected?: boolean
  onToggleSelected?: (next: boolean) => void
  /** Smart-priority inset data (Pencil `IciLB`). Undefined hides the
   *  inset + the "Why?" toggle entirely. */
  priority?: AlertPriorityInfo | undefined
  /**
   * 2026-06-04 round 74 (Yuqi "when right panel is open, hide
   * the time and date, to leave more space for the alert list"):
   * `compact` collapses the row to its main column only — the
   * 100px time-rail on the left is dropped. PulseAlertList
   * threads `compact={openAlertId !== null}` so every row goes
   * compact whenever the detail panel is up. The relative time
   * stays accessible via the head-row right cluster (rendered
   * only in compact mode so the time/date info isn't lost
   * entirely — just relocated to a quieter slot).
   */
  compact?: boolean
}) {
  const { t } = useLingui()
  const detailQuery = useQuery(useAlertDetailQueryOptions(alert.id))
  const detail = detailQuery.data

  // 2026-06-07 (Pencil g5kKJQ `X6enpJ whyAff` toggle): the
  // smart-priority inset is collapsed by default; the "Why?" pill in
  // the meta strip expands it. Only meaningful when `priority` data
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

  // 2026-06-07 (Pencil g5kKJQ `Rrafe`): leading pill = priority tier.
  // Only rendered when the alert actually carries priority-queue data
  // (the smart-priority feature is plan- + flag-gated). When the queue
  // is unavailable the pill is omitted entirely rather than defaulting
  // to a misleading NORMAL on every row.
  const levelPill = priority ? LEVEL_PILL[priority.level] : null
  // "confirmed by N sources" / "N sources" — real corroboration count
  // (`duplicateSourceSnapshotCount`), surfaced both in the meta strip
  // and the bottom confidence pill (Pencil `kdiMz` / `WZi5X`).
  const confirmingSources = alert.duplicateSourceSnapshotCount

  const confidencePct = Math.round(alert.confidence * 100)
  const confidenceTier = aiConfidenceTier(alert.confidence)

  const impacted = alert.matchedCount + alert.needsReviewCount

  // Pencil `jclC5` date row — only renders if BOTH dates exist on
  // the detail payload. The diff badge ("N DAYS SOONER" red /
  // "N DAYS LATER" amber) follows the sign of the day count.
  const oldDateLabel = formatMonthDay(detail?.originalDueDate ?? null)
  const newDateLabel = formatMonthDay(detail?.newDueDate ?? null)
  const daysDiff = daysBetweenIso(detail?.originalDueDate ?? null, detail?.newDueDate ?? null)
  const showDateRow = oldDateLabel && newDateLabel

  // 2026-06-04 round 72 (Yuqi "revert and rework. reference to
  // Node ID: ZkXFr"): bringing the ZkXFr KeyChange inset back —
  // restore `effectiveLabel` so the facts row can render
  // "Effective immediately" / "Effective MMM D" alongside the
  // form-revised line. The new layout keeps the round-71
  // consistency primitives (TaxCodeBadge, circular StateBadge)
  // but restores ZkXFr's horizontal time-rail + main-column
  // architecture.
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
  const actionText = deriveActionText(alert.changeKind)
  const showKeyChange = !!(showDateRow || effectiveLabel || formLabel || actionText)

  return (
    <article
      role="button"
      tabIndex={0}
      // 2026-06-05 (post Pulse→Alert rename): aria-label was stale
      // "Pulse alert: …" from before the product rename. E2E specs
      // (pulse.spec.ts:248, rbac-permissions.spec.ts:123) match
      // /Alert: …/ so the row reads as "Alert: <title>" to both
      // screen readers and the test locators.
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
        // 2026-06-04 round 76 (Yuqi "cross reference Today page
        // to work on the Alert table"): row padding aligned to
        // ActionsTable's TableCell rhythm — `px-5 py-3` so
        // /alerts rows share the same density as /today table
        // rows. The previous `px-[18px] py-[18px]` was an
        // arbitrary Pencil value that diverged from the table
        // primitive. Time rail still owns the left 100px when not
        // compact.
        // 2026-06-08 (Yuqi "table of alerts, no alternating row of
        // colours"): rows are now a FLAT uniform white surface. The
        // prior round-83 rule tinted impacted rows (`impacted > 0` →
        // `bg-background-section`) and left no-match rows white, which
        // read as arbitrary zebra striping down the list. Client impact
        // is already carried by the "Affects N clients" meta + the
        // High-impact pill, so the receding fill was redundant signal.
        // Every non-active row is `bg-background-default`; active still
        // wins with the accent wash; hover steps to base-hover.
        'group/row flex cursor-pointer gap-[10px] border-b border-divider-subtle px-5 py-3 outline-none transition-colors',
        'focus-visible:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        active ? 'bg-state-accent-hover' : 'bg-background-default hover:bg-state-base-hover',
      )}
    >
      {/* Bulk-select checkbox (Pencil g5kKJQ `gT3zO chk`, 18px).
          Sits ahead of the time rail. Click is isolated with
          stopPropagation so ticking a row doesn't also open the
          drawer. Aligned to the top of the row (the metaRow / title)
          rather than centered, matching the design. */}
      {selectable ? (
        <div
          className="flex shrink-0 items-start pt-0.5"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(next) => onToggleSelected?.(next)}
            aria-label={t`Select alert: ${alert.title}`}
            className="size-[18px] rounded-[4px]"
          />
        </div>
      ) : null}

      {/* Time rail (Pencil g5kKJQ `y3rBWp`, 90px). Three stacked
          lines: date "May 18" (Geist 13/500 text-primary), wall-clock
          "02:30" (Geist 11/500 text-tertiary, -0.1px tracking), and a
          duration-relative "18 days ago" (Geist 11/normal text-muted).
          2026-06-04 round 74 (Yuqi "when right panel is open, hide the
          time and date"): rail unmounted in `compact` mode; the
          relative time relocates to the head-row right cluster. */}
      {!compact ? (
        <div className="flex w-[90px] shrink-0 flex-col gap-1">
          <span className="text-[13px] font-medium text-text-primary">{railDate}</span>
          <span className="text-[11px] font-medium tracking-[-0.1px] text-text-tertiary tabular-nums">
            {absoluteTime}
          </span>
          <span className="text-[11px] text-text-muted">{railRelative}</span>
        </div>
      ) : null}

      {/* Main column — round 79 (Yuqi #3 "slightly more gap"):
          gap-1.5 (6px) → gap-2 (8px). Slight breathing room
          between the head row, subject, KeyChange, and bottom
          row so the four blocks read as distinct. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* HeadRow (Pencil g5kKJQ `iMPxe`) — gap 8. Pill order:
            level → state → form → change-kind (text) · sources →
            spacer → source link → why. */}
        <div className="flex min-w-0 items-center gap-2">
          {/* Level pill (Pencil `Rrafe`) — smart-priority tier. Only
              when the alert is in the priority queue. */}
          {levelPill ? (
            <span
              className="inline-flex h-[22px] shrink-0 items-center rounded-[4px] border px-2 text-[10px] font-bold tracking-[0.6px] uppercase"
              style={{
                backgroundColor: levelPill.bg,
                borderColor: levelPill.border,
                color: levelPill.text,
              }}
            >
              {levelPill.label}
            </span>
          ) : null}

          {/* STATE (Pencil `R0fHR sp`) — bordered mono code chip,
              no fill. */}
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <span
                  className="inline-flex h-[22px] shrink-0 cursor-help items-center rounded-[6px] border border-divider-regular px-2 font-mono text-[11px] font-semibold text-text-secondary uppercase outline-none"
                  {...props}
                >
                  {alert.jurisdiction}
                </span>
              )}
            />
            <TooltipContent>{alert.jurisdiction}</TooltipContent>
          </Tooltip>

          {/* FORM PILL (Pencil `RuScV formBadge`) — shared
              TaxCodeBadge primitive (bg-subtle mono code chip). */}
          {formLabel ? <TaxCodeBadge code={formLabel} /> : null}

          {/* CHANGE KIND (Pencil `wMx1M`) — plain mono text, no
              fill, accent-toned. Followed by the real source-
              corroboration count (`kdiMz`) in success green when the
              same change was seen across multiple source snapshots. */}
          <span className="inline-flex min-w-0 shrink-0 items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold tracking-[0.5px] text-text-accent uppercase">
              {changeKindLabel(alert.changeKind)}
            </span>
            {confirmingSources > 1 ? (
              <span className="text-[11px] font-semibold text-text-success">
                <Trans>· confirmed by {confirmingSources} sources</Trans>
              </span>
            ) : null}
          </span>

          {/* Spacer NdGpw (fill_container) */}
          <span className="flex-1" aria-hidden />

          {/* COMPACT-MODE inline time — only rendered when the
              time rail is hidden (round 74). Reads as a quiet
              relative timestamp ("2h ago" / "Jun 4") with the
              exact HH:mm on tooltip hover, so the panel-open
              layout doesn't lose the "when did this drop"
              signal even though the rail is gone. */}
          {compact ? (
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    className="shrink-0 cursor-help whitespace-nowrap text-[12px] font-medium text-text-tertiary tabular-nums outline-none"
                    {...props}
                  >
                    {relativeTime}
                  </span>
                )}
              />
              <TooltipContent>{absoluteTime}</TooltipContent>
            </Tooltip>
          ) : null}

          {/* HeadRight — round 83 (Yuqi #13 "same size as today's
              alert's card's source. add link icon"): source treated
              identically to /today NeedsAttentionCard — 12/medium
              text-tertiary with leading `<ExternalLinkIcon>`. The
              sub-id (`· SOURCE STATUS`) is dropped here; the
              change-kind pill now lives in the head-left meta
              strip per #12, so this slot is source-only. */}
          {alert.sourceUrl ? (
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    className="inline-flex min-w-0 shrink cursor-pointer items-center gap-1 truncate text-[12px] font-medium tracking-[-0.1px] text-text-tertiary outline-none transition-colors hover:text-text-secondary hover:underline"
                    onClick={(event) => {
                      event.stopPropagation()
                      window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer')
                    }}
                    {...props}
                  >
                    <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{alert.source}</span>
                  </span>
                )}
              />
              <TooltipContent>
                <div className="flex max-w-[320px] flex-col gap-0.5 text-left">
                  <span className="font-semibold">
                    <Trans>Open source</Trans>
                  </span>
                  <span className="break-all text-text-secondary">{alert.sourceUrl}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="inline-flex min-w-0 shrink items-center gap-1 truncate text-[12px] font-medium tracking-[-0.1px] text-text-tertiary">
              <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{alert.source}</span>
            </span>
          )}

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
                'inline-flex h-[22px] shrink-0 items-center gap-1 rounded-[6px] border px-2 text-[11px] font-semibold text-text-accent outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                // Pencil `X6enpJ`: expanded = accent fill + accent
                // border; collapsed = transparent with a hairline
                // border that tints to the accent wash on hover.
                whyOpen
                  ? 'border-[#155aef33] bg-state-accent-hover'
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

        {/* Subject IVBgx — title 16/600 + dek 13/normal.
            Title uses the same tracking-tight / leading-1.25
            treatment that /today's card uses, so the two surfaces
            share a typography signature for the alert title. */}
        <div className="flex flex-col gap-[3px]">
          {/* Title — round 76: weight aligned to NeedsAttentionCard's
              15/medium for cross-page consistency. ActionsTable's
              row lede sits at 13/medium-primary; the alert title
              gets a +2px lift (15px) because alerts are more
              event-driven than table actions, but the weight is
              the same medium-not-bold across both surfaces so the
              type families read in one zone. */}
          <h3
            className="line-clamp-1 min-w-0 text-[15px] font-medium leading-[1.25] tracking-[-0.25px] text-text-primary"
            title={alert.title}
          >
            {alert.title}
          </h3>
          {alert.summary && alert.summary.trim() !== alert.title.trim() ? (
            <p className="line-clamp-2 text-[13px] leading-[1.5] text-text-tertiary">
              {alert.summary}
            </p>
          ) : null}
        </div>

        {/* KeyChange inset hKGFX — transparent (Pencil fill
            disabled), gap 8 vertical. Restored from round 67
            (had been dropped in round 70's vi3aw rewrite). */}
        {showKeyChange ? (
          // 2026-06-04 round 79 (Yuqi #4 "closer"): dropped the
          // `mt-1` push. Parent main col now uses `gap-2` so each
          // block already has 8px breathing — the extra 4px push
          // was reading as a double-margin.
          <div className="flex flex-col gap-2">
            {showDateRow ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-medium tracking-[0.2px] text-text-muted line-through tabular-nums">
                  {oldDateLabel}
                </span>
                <ArrowRightIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
                <span className="font-mono text-[12px] font-bold tracking-[-0.2px] text-text-primary tabular-nums">
                  {newDateLabel}
                </span>
                {daysDiff !== null ? (
                  <span
                    className={cn(
                      'text-[12px] font-medium',
                      daysDiff < 0 ? 'text-text-destructive' : 'text-text-warning',
                    )}
                  >
                    {Math.abs(daysDiff)} {daysDiff < 0 ? t`days sooner` : t`days later`}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Facts row — 2026-06-04 round 79 (Yuqi #1 "this is
                for any action changes. not the time info"):
                DROPPED. The slot used to show "Effective
                immediately" + "Form revised" — but those are
                derived time/instructional facts, not action
                changes. The user wants this row reserved for
                action-status semantics; right now the action
                pill below is the only thing that belongs there.
                Effective/form facts move to the drawer (they're
                still in PulseStructuredFields). The
                CornerDownRightIcon bullet is retained on the
                action pill below to preserve the "sub-clause"
                visual reading from round 75 #9. */}

            {actionText ? (
              <div className="flex items-center gap-1.5">
                <CornerDownRightIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
                <div
                  className="inline-flex items-center gap-2 self-start rounded-[4px] px-3 py-1"
                  style={{ backgroundColor: '#FFFBEB' }}
                >
                  <span
                    className="text-[11px] font-bold tracking-[0.7px] uppercase"
                    style={{ color: '#92400E' }}
                  >
                    <Trans>Action</Trans>
                  </span>
                  <span className="text-[12px] font-medium" style={{ color: '#92400E' }}>
                    {actionText}
                  </span>
                </div>
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
          <div className="flex flex-col gap-2 rounded-[10px] border border-divider-subtle bg-[#fafbfc] px-[14px] py-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-3 shrink-0 text-text-accent" aria-hidden />
              <span className="text-[11px] font-bold tracking-[0.3px] text-text-secondary">
                <Trans>Why this is urgent · priority {priority.score}</Trans>
              </span>
              <span className="flex-1" aria-hidden />
              <span className="text-[11px] font-medium text-text-muted tabular-nums">
                <Plural value={priority.reasons.length} one="# signal" other="# signals" />
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {priority.reasons.map((reason) => (
                <span
                  key={reason.key}
                  className="inline-flex items-center gap-1.5 rounded-md border border-divider-subtle bg-background-default px-2 py-1"
                >
                  <span className="text-[11px] font-bold text-text-accent tabular-nums">
                    +{reason.points}
                  </span>
                  <span className="text-[11px] font-semibold text-text-secondary">
                    {reason.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Bottom row vracc.
            Round 75 changes:
              #5 "different from Today alert icon": UsersIcon →
                  Building2 so /alerts shares /today's clients-line
                  icon vocabulary.
              #6 "different type weight": dropped `font-medium`
                  from the "N clients" / "No matching clients"
                  span so the bottom row sits at the same normal
                  weight /today's card uses.
              #7 "where is the top border": brought back the
                  `border-t border-divider-subtle` separator.
                  Round 67 dropped it per Pencil disabled-stroke,
                  but the user wants the clear shelf line back to
                  divide the body from the meta row.
              #8 "missing previous actions - snooze, archive,
                  review": three hover-revealed buttons now —
                  Snooze, Archive, Review — replacing the lone
                  Review. Click each with stopPropagation so the
                  card's onReview doesn't also fire. Snooze +
                  Archive use the same Review handler for now
                  (visual surface only — wiring to actual snooze /
                  archive mutations lives in the drawer). */}
        {/* Round 79 (Yuqi #5 "closer?"): dropped the `mt-1` push
            on the bottom row too — same reason as #4. */}
        {/* 2026-06-08 (Yuqi compact-column wrap bug): in panel-open
            (compact) mode the list column is ~40% wide, so this meta
            row wrapped mid-unit — "Affects 2 / clients" and the conf
            pill split to "94% / conf". Fixed by wrapping as whole
            units (`flex-wrap gap-y-1`) and `whitespace-nowrap` /
            `shrink-0` on the text + pill so neither ever breaks
            internally. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-divider-subtle pt-2 text-[12px] text-text-muted">
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            <Building2 className="size-3.5 shrink-0" aria-hidden />
            {impacted > 0 ? (
              <Plural value={impacted} one="Affects # client" other="Affects # clients" />
            ) : (
              <Trans>No matching clients</Trans>
            )}
          </span>
          {/* 2026-06-07 (Pencil g5kKJQ `WZi5X sourcesConf`): confidence
              promoted from bare inline text to a rounded pill (radius
              999, py-0.5 px-2) so it reads as a discrete signal chip,
              matching the design's bottom-meta anatomy. When the change
              was corroborated by more than one source snapshot, the pill
              leads with that real count ("3 sources · 94% conf",
              `duplicateSourceSnapshotCount`). Tier-colored so it stays
              honest — green/checked only at high AI confidence, neutral
              at medium, destructive-tinted at low. */}
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              confidenceTier === 'high'
                ? 'border-[#17b26a40] bg-[#e8f5ee] text-text-success'
                : confidenceTier === 'medium'
                  ? 'border-divider-regular bg-background-section text-text-tertiary'
                  : 'border-[#f0443840] bg-state-destructive-hover text-text-destructive',
            )}
          >
            {confidenceTier === 'high' ? (
              <CheckCheckIcon className="size-2.5 shrink-0" aria-hidden />
            ) : null}
            {confirmingSources > 1 ? (
              <Trans>
                {confirmingSources} sources · {confidencePct}% conf
              </Trans>
            ) : (
              <Trans>{confidencePct}% conf</Trans>
            )}
          </span>

          {/* Hover-only action cluster — Snooze / Archive / Review.
              Fades in via group-hover so the row reads as a quiet
              shelf at rest. Each button stopPropagation so the
              row's onClick doesn't bubble. */}
          <span
            className="ml-auto inline-flex items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100"
            aria-hidden={!active}
          >
            {onSnooze ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onSnooze()
                }}
                className="inline-flex items-center gap-1 rounded-md border border-divider-regular bg-background-default px-2 py-1 text-[12px] font-medium text-text-secondary outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                aria-label={t`Snooze alert`}
              >
                <ClockIcon className="size-3" aria-hidden />
                <Trans>Snooze</Trans>
              </button>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onDismiss()
                }}
                className="inline-flex items-center gap-1 rounded-md border border-divider-regular bg-background-default px-2 py-1 text-[12px] font-medium text-text-secondary outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                aria-label={t`Dismiss alert`}
              >
                <ArchiveIcon className="size-3" aria-hidden />
                <Trans>Dismiss</Trans>
              </button>
            ) : null}
            {/* Round 83 (Yuqi #14 "accent primary button"):
                Review promoted from outline to canonical
                `<Button>` primary (filled primary token). Same
                primitive every other primary action across the
                app uses, so the Review action carries
                cross-page consistency. */}
            <Button
              type="button"
              size="xs"
              onClick={(event) => {
                event.stopPropagation()
                onReview()
              }}
            >
              <Trans>Review</Trans>
            </Button>
          </span>
        </div>
      </div>
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
  today: string,
): {
  label: string
  isToday: boolean
} {
  const isToday = dayKey === today
  // "TUE · SEP 24, 2024" — weekday + month/day/year in mono.
  const date = new Date(`${dayKey}T12:00:00.000Z`)
  const formatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(date)
  // Convert "Tue, Sep 24, 2024" → "TUE · SEP 24, 2024" uppercase
  // with dot separators (matches Pencil's mono header format).
  const parts = formatted.replace(',', '').split(' ')
  const weekday = parts[0]?.toUpperCase() ?? ''
  const rest = parts.slice(1).join(' ').toUpperCase()
  return { label: `${weekday} · ${rest}`, isToday }
}

function PulseAlertList({
  alerts,
  openAlertId,
  onReview,
  onSnooze,
  onDismiss,
  selectable = false,
  selectedIds,
  onToggleSelected,
  onSelectAll,
  priorityById,
}: {
  alerts: readonly PulseAlertPublic[]
  openAlertId: string | null
  onReview: (alertId: string) => void
  onSnooze?: (alertId: string) => void
  onDismiss?: (alertId: string) => void
  /**
   * 2026-06-07 (Pencil g5kKJQ): bulk-selection wiring. When
   * `selectable`, every row grows a leading checkbox and the list
   * renders the "Select all · N dispatches" BulkSelectStrip
   * (`TAamJ`) above the day groups.
   */
  selectable?: boolean
  selectedIds?: ReadonlySet<string>
  onToggleSelected?: (alertId: string, next: boolean) => void
  onSelectAll?: (next: boolean) => void
  /** Smart-priority inset data keyed by alert id (Pencil `IciLB`). */
  priorityById?: ReadonlyMap<string, AlertPriorityInfo>
}) {
  const { t } = useLingui()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const todayKey = startOfFirmDay(new Date().toISOString(), firmTimezone)

  // 2026-06-04 round 74: derive panel-open state from whether any
  // alert is currently the active one. When panelOpen, every row
  // renders in `compact` mode — the 100px time rail is hidden
  // and the relative time relocates to an inline tooltip slot.
  const panelOpen = openAlertId !== null

  // Tri-state for the BulkSelectStrip's "Select all" checkbox:
  // unchecked when nothing is selected, checked when every alert is
  // selected, indeterminate in between.
  const selectedCount = alerts.reduce(
    (count, alert) => count + (selectedIds?.has(alert.id) ? 1 : 0),
    0,
  )
  const allSelected = alerts.length > 0 && selectedCount === alerts.length
  const someSelected = selectedCount > 0 && !allSelected

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

  return (
    // 2026-06-04 round 73 (Yuqi "apply these table design
    // guideline and rules to Alert and Deadlines"): list frame
    // now uses the ActionsTable canonical chrome —
    // `rounded-[12px] border-divider-regular` (not the round-70
    // `rounded-2xl border-divider-subtle`). Same shape every
    // tabular list surface uses, so /today, /alerts, /deadlines
    // share one outer frame language.
    // 2026-06-04 round 84 (Yuqi "remove the overflow:hidden
    // property"): dropped `overflow-hidden` on the list frame.
    // Was clipping anything that wanted to escape the rounded
    // bounds (tooltips, popovers, sticky child shadows). The
    // rounded radius + inner row borders carry the visual
    // boundary on their own; the clip wasn't earning its keep.
    <div className="flex flex-col rounded-[12px] border border-divider-regular bg-background-default">
      {/* BulkSelectStrip (Pencil g5kKJQ `TAamJ`) — "Select all"
          tri-state checkbox + dispatch count. Only renders in
          selectable (active) mode; history rows aren't
          bulk-actionable. */}
      {selectable ? (
        <div className="flex items-center gap-3 border-b border-divider-subtle bg-background-subtle px-6 py-3">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onCheckedChange={(next) => onSelectAll?.(next)}
            aria-label={t`Select all alerts`}
            className="size-[18px] rounded-[4px]"
          />
          <span className="text-[13px] font-medium text-text-secondary">
            <Trans>Select all</Trans>
          </span>
          <span className="text-divider-regular" aria-hidden>
            ·
          </span>
          <span className="text-[13px] font-medium text-text-muted tabular-nums">
            <Plural value={alerts.length} one="# dispatch" other="# dispatches" />
          </span>
        </div>
      ) : null}

      {Array.from(groups.entries()).map(([dayKey, dayAlerts]) => {
        const { label, isToday } = formatDayHeader(dayKey, firmTimezone, todayKey)
        const yesterdayKey = (() => {
          const d = new Date(`${todayKey}T12:00:00.000Z`)
          d.setUTCDate(d.getUTCDate() - 1)
          return d.toISOString().slice(0, 10)
        })()
        const dayWord = isToday ? t`TODAY` : dayKey === yesterdayKey ? t`YESTERDAY` : null

        return (
          <div key={dayKey} className="flex flex-col">
            {/* Day header — round 70 (deferred "Day group header
                vertical stack instead of horizontal"): weekday/
                date now stacks vertically on the LEFT (DAY WORD
                on top, full date below), count on the right. The
                horizontal-justify layout was forcing the date and
                count to compete for the same baseline; stacking
                gives the date a clear hierarchy (label → date)
                and the count breathes. */}
            {/* Day header — round 79 (Yuqi #2 "I found this hard
                to read. any way to improve?"): readability fixes
                applied while keeping the subgroup-divider
                chrome:
                  • text-[11px] → text-[12px] (one tier larger,
                    still in eyebrow scale)
                  • text-text-tertiary → text-text-secondary
                    (steps the contrast up by one tier — was
                    nearly washing out at 11px tracking-[0.5px]
                    uppercase against the bg-background-subtle
                    band)
                  • Date label stays text-text-secondary; dispatch
                    count keeps the quieter `text-text-muted` so
                    the count reads as supporting context, not the
                    lede. */}
            <div className="flex items-center justify-between border-b border-divider-subtle px-5 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.4px] text-text-tertiary uppercase">
                {isToday ? (
                  <SunIcon className="size-3 shrink-0 text-text-accent" aria-hidden />
                ) : null}
                {dayWord ? <span>{dayWord}</span> : null}
                {dayWord ? <span className="text-text-muted">·</span> : null}
                <span>{label}</span>
              </div>
              {/* 2026-06-08 (Yuqi /alerts #4 "thin, same gray, lower
                  caps, 1 dispatch"): the count drops the bold/uppercase/
                  tracking eyebrow treatment — now a thin, normal-case
                  muted-gray label so it reads as quiet supporting context
                  ("1 dispatch"), not a second heading competing with the
                  date. */}
              <span className="text-[12px] font-normal text-text-muted tabular-nums">
                <Trans>
                  {dayAlerts.length} {dayAlerts.length === 1 ? t`dispatch` : t`dispatches`}
                </Trans>
              </span>
            </div>

            {/* Alert rows for this day. Round 74: `compact` propagates
                from whether the detail panel is up — see the
                `panelOpen` computation below. Round 77: snooze +
                dismiss handlers pass through from AlertsListPage
                so the hover-revealed actions actually fire the
                orpc mutations. */}
            {dayAlerts.map((alert) => (
              <PulseAlertRow
                key={alert.id}
                alert={alert}
                active={alert.id === openAlertId}
                onReview={() => onReview(alert.id)}
                {...(onSnooze ? { onSnooze: () => onSnooze(alert.id) } : {})}
                {...(onDismiss ? { onDismiss: () => onDismiss(alert.id) } : {})}
                compact={panelOpen}
                selectable={selectable}
                selected={selectedIds?.has(alert.id) ?? false}
                {...(onToggleSelected
                  ? { onToggleSelected: (next: boolean) => onToggleSelected(alert.id, next) }
                  : {})}
                priority={priorityById?.get(alert.id)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

export { PulseAlertRow, PulseAlertList }
