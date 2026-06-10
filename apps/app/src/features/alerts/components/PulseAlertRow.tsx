import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  ArchiveIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  SparklesIcon,
  SunIcon,
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

import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { aiConfidenceTier } from '@/features/_surface-vocabulary/ai-confidence'
import { useCurrentFirm } from '@/features/billing/use-billing-data'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { formatRelativeTime } from '@/lib/utils'

import { useAlertDetailFromCacheQueryOptions } from '../api'
import { changeKindLabel } from './PulseChangeKindChip'
import { isActiveAlert } from './pulse-alert-chrome'

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
 * The leading meta pill is the smart-priority TIER (urgent/high/normal)
 * from the priority queue — not client-impact. URGENT is destructive-red, HIGH is
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
  compact = false,
  selectable = false,
  selected = false,
  onToggleSelected,
  priority,
  highImpact = false,
  showAction = true,
}: {
  alert: PulseAlertPublic
  active: boolean
  onReview: () => void
  /** Real dismiss/archive handler — opens the reason dialog
   *  which fires `orpc.pulse.dismiss` on confirm. */
  onDismiss?: () => void
  /**
   * Bulk-selection affordance. When `selectable`, the 18px leading
   * checkbox (Pencil `gT3zO chk`)
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

  // Leading pill = priority tier. Only rendered when the alert actually
  // carries priority-queue data
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
        // be redundant signal. Every non-active row is
        // `bg-background-default`; active wins with the accent wash;
        // hover steps to base-hover.
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
            className="size-[18px] rounded"
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
        <div className="flex w-[90px] shrink-0 flex-col gap-1">
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
      ) : null}

      {/* Main column — gap-2 (8px) gives slight breathing room between
          the head row, subject, KeyChange, and bottom row so the four
          blocks read as distinct. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* HeadRow (Pencil g5kKJQ `iMPxe`) — gap 8. Pill order:
            level → state → form → change-kind (text) · sources →
            spacer → source link → why. */}
        <div className="flex min-w-0 items-center gap-2">
          {/* ACTIVE badge — due-date-overlay alerts are the actionable
              "Active" queue; a green dot+label flags them on the row (and
              the detail header). Review-only alerts carry no badge. */}
          {isActiveAlert(alert) ? (
            <span className="inline-flex h-[20px] shrink-0 items-center gap-1 rounded-lg border border-state-success-border bg-state-success-hover px-1.5 text-xs font-semibold tracking-[0.3px] text-text-success uppercase">
              <span className="size-1.5 rounded-full bg-text-success" aria-hidden />
              <Trans>Active</Trans>
            </span>
          ) : null}
          {/* Level pill (Pencil `Rrafe`) — smart-priority tier. Only
              when the alert is in the priority queue. */}
          {levelPill ? (
            <span
              className="inline-flex h-[22px] shrink-0 items-center rounded border px-2 text-xs font-semibold tracking-[0.3px] uppercase"
              style={{
                backgroundColor: levelPill.bg,
                borderColor: levelPill.border,
                color: levelPill.text,
              }}
            >
              {levelPill.label}
            </span>
          ) : null}

          {/* HIGH IMPACT — the three alerts hitting the most clients
              carry a soft destructive flag (the row's impact IS its
              urgent cue). Destructive red, NOT amber — amber is reserved
              for the ACTION pill below, so the two never read as the same
              signal. */}
          {highImpact ? (
            <span className="inline-flex h-[20px] shrink-0 items-center rounded-lg border border-state-destructive-border bg-state-destructive-hover px-1.5 text-xs font-semibold tracking-[0.3px] text-text-destructive uppercase">
              <Trans>High impact</Trans>
            </span>
          ) : null}

          {/* STATE — the jurisdiction chip is a plain bordered 2-letter
              code (no circular StateBadge seal). */}
          <span className="inline-flex h-[20px] shrink-0 items-center rounded-lg border border-divider-regular px-1.5 text-xs font-semibold text-text-secondary uppercase">
            {alert.jurisdiction}
          </span>

          {/* FORM PILL — shared TaxCodeBadge primitive (bg-subtle mono
              code chip). The row instance overrides to rounded-lg (8px)
              for softer corners; the shared primitive base stays
              rounded-sm for other surfaces. */}
          {formLabel ? <TaxCodeBadge code={formLabel} className="rounded-lg" /> : null}

          {/* CHANGE KIND — aligned to the dashboard NeedsAttentionCard's
              change-kind treatment — SANS (not mono), text-xs
              font-semibold tracking-[0.4px], neutral text-tertiary (not
              accent). One change-kind type signature across /today +
              /alerts. The change-kind label stands alone here; the bottom
              confidence pill already leads with "N sources · X% conf", so
              the corroboration signal isn't duplicated in the head. */}
          <span className="text-xs font-semibold tracking-[0.3px] text-text-tertiary uppercase">
            {changeKindLabel(alert.changeKind)}
          </span>

          {/* Spacer NdGpw (fill_container) */}
          <span className="flex-1" aria-hidden />

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

          {/* HeadRight — source treated identically to /today
              NeedsAttentionCard — 12/medium text-tertiary with leading
              `<ExternalLinkIcon>`. The change-kind pill lives in the
              head-left meta strip, so this slot is source-only (no sub-id
              `· SOURCE STATUS`). */}
          {alert.sourceUrl ? (
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                  <span
                    className="inline-flex min-w-0 shrink cursor-pointer items-center gap-1 truncate text-sm font-medium text-text-tertiary outline-none transition-colors hover:text-text-secondary hover:underline"
                    onClick={(event) => {
                      event.stopPropagation()
                      window.open(alert.sourceUrl, '_blank', 'noopener,noreferrer')
                    }}
                    {...props}
                  >
                    <ExternalLinkIcon className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
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
            <span className="inline-flex min-w-0 shrink items-center gap-1 truncate text-sm font-medium text-text-tertiary">
              <ExternalLinkIcon className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
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
          className="line-clamp-2 min-w-0 text-[16px] font-medium leading-[1.3] tracking-[-0.25px] text-text-secondary"
          title={alert.title}
        >
          {alert.title}
        </h3>

        {/* KeyChange inset hKGFX — transparent (Pencil fill disabled),
            gap 8 vertical. */}
        {showKeyChange ? (
          // No `mt-1` push — the parent main col uses `gap-2`, so each
          // block already has 8px breathing.
          <div className="flex flex-col gap-2">
            {showDateRow ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium text-text-muted line-through tabular-nums">
                  {oldDateLabel}
                </span>
                <ArrowRightIcon
                  className="size-3 shrink-0 text-text-muted"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">
                  {newDateLabel}
                </span>
                {daysDiff !== null ? (
                  <span
                    className={cn(
                      'text-sm font-medium',
                      daysDiff < 0 ? 'text-text-destructive' : 'text-text-warning',
                    )}
                  >
                    {Math.abs(daysDiff)} {daysDiff < 0 ? t`days sooner` : t`days later`}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* This region is reserved for action-status semantics —
                the action pill below. Effective/form facts live in the
                drawer (PulseStructuredFields), not here. */}

            {actionText ? (
              <div className="flex items-center gap-1.5">
                {/* The leading sub-clause glyph is a plain elbow
                    (down-then-right) with no arrowhead, not lucide's
                    CornerDownRight. */}
                <svg
                  viewBox="0 0 12 12"
                  className="size-3 shrink-0 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M4 2.5v3a1.5 1.5 0 0 0 1.5 1.5H9" />
                </svg>
                <div
                  className="inline-flex items-center gap-2 self-start rounded px-3 py-1"
                  style={{ backgroundColor: '#FFFBEB' }}
                >
                  <span
                    className="text-xs font-semibold tracking-[0.3px] uppercase"
                    style={{ color: '#92400E' }}
                  >
                    <Trans>Action</Trans>
                  </span>
                  <span className="text-sm font-medium" style={{ color: '#92400E' }}>
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
          <div className="flex flex-col gap-2 rounded-xl border border-divider-subtle bg-background-default-subtle px-[14px] py-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-3 shrink-0 text-text-accent" aria-hidden />
              <span className="text-xs font-semibold tracking-[0.3px] text-text-secondary">
                <Trans>Why this is urgent · priority {priority.score}</Trans>
              </span>
              <span className="flex-1" aria-hidden />
              <span className="text-xs font-medium text-text-muted tabular-nums">
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

        {/* Bottom row vracc — a `border-t border-divider-subtle` shelf
            with the affected-clients line, confidence meter, and the
            hover-revealed Dismiss / Review buttons.
            In panel-open (compact) mode the list column is ~40% wide,
            so this meta row must wrap as whole units (`flex-wrap
            gap-y-1`) with `whitespace-nowrap` / `shrink-0` on the text
            + pill — otherwise it wraps mid-unit ("Affects 2 / clients",
            "94% / conf"). */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-divider-subtle pt-2 text-sm text-text-muted">
          {/* The affected-clients line uses the Users icon — one
              clients-affected glyph across the AlertCard, this row, and
              the dashboard card. Impacted rows step to text-secondary;
              no-match advisories stay muted, mirroring the dashboard
              NeedsAttentionCard affects-clients line. */}
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap',
              impacted > 0 ? 'text-text-secondary' : 'text-text-muted',
            )}
          >
            <UsersIcon className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {impacted > 0 ? (
              <Plural value={impacted} one="Affects # client" other="Affects # clients" />
            ) : (
              <Trans>No matching clients</Trans>
            )}
          </span>
          {/* AI confidence — a neutral signal-strength METER (three
              rising bars filled by tier) + the %, so it reads as a
              MEASUREMENT, not a status chip (a green pill would collide
              with the green ACTIVE badge). Only LOW keeps a warning-amber
              tint (the tier worth flagging); high/medium stay neutral.
              Source corroboration lives in the tooltip so the row stays
              quiet. */}
          <span
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium tabular-nums text-text-tertiary"
            title={
              confirmingSources > 1
                ? t`AI confidence ${confidencePct}% · confirmed by ${confirmingSources} sources`
                : t`AI confidence ${confidencePct}%`
            }
          >
            <span className="inline-flex items-end gap-[2px]" aria-hidden>
              {[0, 1, 2].map((i) => {
                const filled =
                  i < (confidenceTier === 'high' ? 3 : confidenceTier === 'medium' ? 2 : 1)
                return (
                  <span
                    key={i}
                    className={cn(
                      'w-[3px] rounded-full',
                      i === 0 ? 'h-1.5' : i === 1 ? 'h-2' : 'h-2.5',
                      filled
                        ? confidenceTier === 'low'
                          ? 'bg-text-warning'
                          : 'bg-text-tertiary'
                        : 'bg-divider-regular',
                    )}
                  />
                )
              })}
            </span>
            {t`${confidencePct}% conf`}
          </span>

          {/* Hover-only action cluster — Dismiss / Review.
              Fades in via group-hover so the row reads as a quiet
              shelf at rest. Each button stopPropagation so the
              row's onClick doesn't bubble. */}
          <span
            className="ml-auto inline-flex items-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100"
            aria-hidden={!active}
          >
            {/* Dismiss uses the canonical <Button> primitive (outline
                xs) so it matches Review beside it and every other button
                in the app. */}
            {onDismiss ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                // Override the Button base's squircle corner to a plain
                // circular rounded-lg so these row buttons match the
                // row's chips (state/form/etc.).
                className="rounded-lg [corner-shape:round]"
                onClick={(event) => {
                  event.stopPropagation()
                  onDismiss()
                }}
                aria-label={t`Dismiss alert`}
              >
                <ArchiveIcon data-icon="inline-start" />
                <Trans>Dismiss</Trans>
              </Button>
            ) : null}
            {/* Review uses the canonical `<Button>` primary (filled
                primary token) — the same primitive every other primary
                action across the app uses, for cross-page consistency. */}
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
  onDismiss,
  selectable = false,
  selectedIds,
  onToggleSelected,
  priorityById,
  compact,
  grouped = true,
  highImpactIds,
  showAction = true,
}: {
  alerts: readonly PulseAlertPublic[]
  openAlertId: string | null
  onReview: (alertId: string) => void
  onDismiss?: (alertId: string) => void
  /**
   * Force compact rows regardless of whether a detail panel is open.
   * The map view's right rail is ~420px, so it renders the same compact
   * rows the panel-open list uses. When omitted, compactness is derived
   * from `openAlertId` (a row is compact while the detail panel is up).
   */
  compact?: boolean
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
}) {
  const { t } = useLingui()
  const { currentFirm } = useCurrentFirm()
  const firmTimezone = resolveUSFirmTimezone(currentFirm?.timezone)
  const todayKey = startOfFirmDay(new Date().toISOString(), firmTimezone)

  // Panel-open state derives from whether any alert is currently the
  // active one. When panelOpen, every row renders in `compact` mode —
  // the 100px time rail is hidden and the relative time relocates to an
  // inline tooltip slot. An explicit `compact` prop (map view's narrow
  // rail) overrides the derived value.
  const panelOpen = compact ?? openAlertId !== null

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

  const renderRow = (alert: PulseAlertPublic) => (
    <PulseAlertRow
      key={alert.id}
      alert={alert}
      active={alert.id === openAlertId}
      onReview={() => onReview(alert.id)}
      {...(onDismiss ? { onDismiss: () => onDismiss(alert.id) } : {})}
      compact={panelOpen}
      selectable={selectable}
      selected={selectedIds?.has(alert.id) ?? false}
      {...(onToggleSelected
        ? { onToggleSelected: (next: boolean) => onToggleSelected(alert.id, next) }
        : {})}
      priority={priorityById?.get(alert.id)}
      highImpact={highImpactIds?.has(alert.id) ?? false}
      showAction={showAction}
    />
  )

  return (
    // List frame uses the ActionsTable canonical chrome —
    // `rounded-xl border-divider-regular` — so /today, /alerts,
    // /deadlines share one outer frame language.
    // `overflow-hidden` clips the full-bleed gray day-group bands (square
    // corners) to the rounded-12 frame. Tooltips/popovers inside rows
    // portal to <body>, so the clip doesn't truncate them.
    // `shrink-0` so the list frame keeps its full content height inside
    // the overflow-y-auto list column — without it flex shrinks the frame
    // to fit and the clip swallows the rest, so nothing scrolls. At full
    // height there's no vertical clip.
    <div className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-divider-regular bg-background-default">
      {/* No BulkSelectStrip ("Select all · N dispatches", Pencil
          `TAamJ`): per-row checkboxes drive bulk selection in selectable
          mode, and the floating BulkActionBar appears once rows are
          picked — a top strip would duplicate the per-day band counts. */}

      {/* Flat (ungrouped) rendering for the impact sort + the map
          navigator rail — no per-day header bands, just the rows in their
          incoming order. */}
      {!grouped
        ? alerts.map(renderRow)
        : Array.from(groups.entries()).map(([dayKey, dayAlerts]) => {
            const { label, isToday } = formatDayHeader(dayKey, firmTimezone, todayKey)
            const yesterdayKey = (() => {
              const d = new Date(`${todayKey}T12:00:00.000Z`)
              d.setUTCDate(d.getUTCDate() - 1)
              return d.toISOString().slice(0, 10)
            })()
            const dayWord = isToday ? t`TODAY` : dayKey === yesterdayKey ? t`YESTERDAY` : null

            return (
              <div key={dayKey} className="flex flex-col">
                {/* Day header — the day-group band carries the same
                `bg-background-subtle` fill + uppercase label as the
                /today Actions table's status-group header. The label is
                text-tertiary: it's a quiet date separator, not a lede, so
                the lighter tone keeps it from competing with the alert
                rows beneath it. */}
                <div className="flex items-center border-b border-divider-subtle bg-background-subtle px-5 py-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.5px] text-text-tertiary uppercase">
                    {isToday ? (
                      <SunIcon className="size-3 shrink-0 text-text-accent" aria-hidden />
                    ) : null}
                    {dayWord ? <span>{dayWord}</span> : null}
                    {dayWord ? <span className="text-text-muted">·</span> : null}
                    <span>{label}</span>
                  </div>
                </div>

                {/* Alert rows for this day. `compact` propagates from
                whether the detail panel is up (see the `panelOpen`
                computation above); the dismiss handler passes through
                from AlertsListPage so the hover-revealed action fires the
                orpc mutation. */}
                {dayAlerts.map(renderRow)}
              </div>
            )
          })}
    </div>
  )
}

export { PulseAlertRow, PulseAlertList }
