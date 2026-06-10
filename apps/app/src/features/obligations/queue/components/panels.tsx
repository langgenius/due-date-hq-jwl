// Detail-panel components for the obligation queue drawer (/deadlines).
// Extracted from routes/obligations.tsx.
import {
  DAY_MS,
  EFILE_PIPELINE_KEYS,
  PAYMENT_PIPELINE_KEYS,
  REVIEW_PIPELINE_KEYS,
  type ReviewPipelineKey,
  STAGE_STATUS_GROUPS,
  TIMELINE_STAGE_KEYS,
  TIMELINE_TERMINAL_STAGE_KEYS,
  type TimelineStageKey,
} from '../constants'
import {
  computePastStageEntries,
  countOutstandingReadinessDocuments,
  formatTaxPeriod,
  humanizeAuditAction,
  latestAuthorityRejectionAudit,
  mineTimelineTimestamps,
  pipelineStateOf,
  reviewPipelineCurrent,
  subStatusForActiveStage,
  timelineIndexForStatus,
  todayIsoDate,
  willReadinessChecklistBeFullyReceived,
} from '../helpers'
import { BlockerContextCard } from '@/features/obligations/BlockerContextCard'
import { CompletedKeyDates } from '@/features/obligations/CompletedKeyDates'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { StageActions, type StageTask } from '@/features/obligations/StageActions'
import { paymentOverdueDays } from '@/features/obligations/payment-overdue'
import {
  type ObligationStatus,
  ObligationStatusReadBadge,
} from '@/features/obligations/status-control'
import { cn, daysBetween, formatDate, formatDatePretty } from '@/lib/utils'
import {
  type AuditEventPublic,
  type ClientReadinessRequestPublic,
  type ObligationPrepStage,
  type ObligationQueueDetailTab,
  type ObligationQueueRow,
  type ObligationReviewStage,
  type ReadinessDocumentChecklistItemPublic,
} from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  CalendarXIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleCheck,
  ClipboardListIcon,
  Clock,
  Construction,
  FileCheck,
  Hourglass,
  Loader,
  Loader2,
  MessageSquareText,
  TargetIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { toast } from 'sonner'

export function ReadinessOverview({
  row,
  latestRequest,
  checklistCount,
  receivedCount,
}: {
  row: ObligationQueueRow
  latestRequest: ClientReadinessRequestPublic | null
  checklistCount: number
  receivedCount: number
}) {
  const { i18n, t } = useLingui()
  const stageIdx = timelineIndexForStatus(row.status)
  const stageKey: TimelineStageKey = TIMELINE_STAGE_KEYS[stageIdx] ?? 'pending'
  const isTerminal = stageKey === 'done' || stageKey === 'completed'
  const isReady = row.readiness === 'ready' && !isTerminal
  const needsCpaAction = row.readiness === 'needs_review' && !isTerminal
  const outstanding = Math.max(0, checklistCount - receivedCount)
  const responseCount = latestRequest?.responses.length ?? 0
  const readyResponseCount =
    latestRequest?.responses.filter((r) => r.status === 'ready').length ?? 0
  // The headline + subline branch on the lifecycle STAGE first, then
  // on the readiness enum within that stage, so the copy matches what
  // the CPA is actually doing at each phase: readiness is a "Ready to
  // prep / Not ready" question while Waiting, a watch-list signal in
  // Blocked / In review, and a closed audit-trail question in Filed /
  // Completed.
  const { headline, subline }: { headline: string; subline: string } = (() => {
    // 1. Filed / Completed — historical record, audit trail mode.
    if (isTerminal) {
      if (checklistCount === 0) {
        return {
          headline: t`Filed`,
          subline: t`No document checklist was attached to this filing.`,
        }
      }
      // Terminal copy branches by ratio — complete archive vs partial
      // vs untracked — so a filed row with zero ticked receipts doesn't
      // read as "we filed without any receipts" or "the audit trail is
      // broken." Each case gets copy that matches it honestly.
      if (receivedCount === 0) {
        return {
          headline: t`Filed`,
          subline: t`${checklistCount} checklist items weren't individually ticked during filing.`,
        }
      }
      if (receivedCount < checklistCount) {
        return {
          headline: t`Filed`,
          subline: t`${receivedCount} of ${checklistCount} items recorded as received before filing.`,
        }
      }
      return {
        headline: t`Filed`,
        subline: t`All ${checklistCount} items recorded as received.`,
      }
    }
    // 2. Non-terminal — no checklist yet, regardless of stage.
    if (checklistCount === 0) {
      return {
        headline: t`No documents requested yet`,
        subline: t`Generate a list below or add items manually to start collecting.`,
      }
    }
    // 3. Non-terminal — client flagged items, needs CPA verification.
    //    This trumps stage-specific copy because the action target
    //    (review the client's notes) is the same regardless of stage.
    if (row.readiness === 'needs_review') {
      const subContext =
        stageKey === 'blocked'
          ? t`Upstream return also blocking — client flagged items separately.`
          : t`At least one item flagged by client — review their portal responses.`
      return {
        headline: t`Client needs CPA action`,
        subline: subContext,
      }
    }
    // 4. Non-terminal — readiness=ready (all materials in for this row).
    if (row.readiness === 'ready') {
      switch (stageKey) {
        case 'waiting_on_client':
          return {
            headline: t`All ${checklistCount} items in`,
            subline: t`Move to In review when ready to draft.`,
          }
        case 'blocked':
          return {
            headline: t`Materials side is fine`,
            subline: t`Blocked by upstream return — ${checklistCount} items in hand.`,
          }
        case 'review':
          return {
            headline: t`All ${checklistCount} items in workpapers`,
            subline: t`Drafting in progress with everything the client provided.`,
          }
        case 'pending':
        default:
          return {
            headline: t`All ${checklistCount} items in`,
            subline: t`Move forward when ready to start work.`,
          }
      }
    }
    // 5. Non-terminal — readiness=waiting (the typical state). Branch
    //    on stage to reflect what the CPA is actually doing.
    switch (stageKey) {
      case 'pending':
        if (latestRequest && receivedCount === 0) {
          return {
            headline: t`Requested from client`,
            subline: t`Sent ${checklistCount} items — awaiting client response.`,
          }
        }
        return {
          headline: t`${receivedCount} of ${checklistCount} received`,
          subline: t`Continue collecting before drafting.`,
        }
      case 'waiting_on_client':
        return {
          headline: i18n._(
            plural(outstanding, {
              one: 'Waiting on # item',
              other: 'Waiting on # items',
            }),
          ),
          subline:
            receivedCount === 0
              ? i18n._(
                  plural(checklistCount, {
                    one: 'No client materials received yet; # item is still waiting on the client.',
                    other:
                      'No client materials received yet; all # items are still waiting on the client.',
                  }),
                )
              : i18n._(
                  plural(outstanding, {
                    one: `${receivedCount} received; # item still waiting on the client.`,
                    other: `${receivedCount} received; # items still waiting on the client.`,
                  }),
                ),
        }
      case 'blocked':
        return {
          headline: t`${outstanding} items still owed`,
          subline: t`Blocked by upstream return AND awaiting client materials.`,
        }
      case 'review':
        return {
          headline: t`${outstanding} items still owed mid-prep`,
          subline: t`Drafting started without all client materials in hand.`,
        }
      default:
        return {
          headline: t`${receivedCount} of ${checklistCount} received`,
          subline: '',
        }
    }
  })()
  // Terminal-state subline now renders as a description under the
  // "Materials checklist" heading instead of above it.
  if (isTerminal) return null
  // Spacing is tight here (no outer py-2 — the parent grid supplies
  // vertical rhythm — small icon, gap-2): the headline is the only
  // thing carrying section weight, and the overview shouldn't take a
  // third of the drawer's first screen.
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full',
          isReady
            ? 'bg-state-success-solid'
            : needsCpaAction
              ? 'bg-state-warning-solid'
              : 'bg-background-subtle border border-divider-deep',
        )}
      >
        {isReady ? (
          <CheckCircle2Icon className="size-3 text-text-inverted" aria-hidden />
        ) : needsCpaAction ? (
          <AlertTriangleIcon className="size-3 text-text-inverted" aria-hidden />
        ) : (
          <ClipboardListIcon className="size-3 text-text-secondary" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-semibold leading-tight tracking-tight',
            isReady
              ? 'text-text-success'
              : needsCpaAction
                ? 'text-text-warning'
                : 'text-text-primary',
          )}
        >
          {headline}
        </p>
        <p className="pt-2 text-caption italic leading-snug text-text-tertiary">{subline}</p>
        {responseCount > 0 ? (
          <p className="mt-0.5 text-caption tabular-nums text-text-tertiary">
            <Trans>
              {readyResponseCount}/{checklistCount} confirmed by client · {responseCount} total
              responses
            </Trans>
          </p>
        ) : null}
      </div>
    </div>
  )
}

// Format a tax-period span. Full calendar years collapse to just
// the year ("2026"); fiscal / short / quarterly periods keep the
// explicit start–end range.

// The standalone-page 'cards' variant renders each anchor date as a real card
// — leading icon + uppercase label, a prettified date, and a
// day-of-week · relative sub-line. The Filing card flips to the warm
// `state-warning-hover` (#fff4f1) tint with a warning-tone icon when overdue.
const DATE_CARD_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function DeadlineDateCard({
  icon: Icon,
  label,
  date,
  subline,
  sublineTone,
  overdue = false,
}: {
  icon: LucideIcon
  label: string
  date: string | null
  subline: string | null
  sublineTone: 'destructive' | 'warning' | 'tertiary'
  overdue?: boolean
}) {
  return (
    <div
      className={cn(
        // Tight date card (px-4/py-3, 16px date, 11px sub) so the
        // strip stops dominating the header.
        'flex flex-col gap-1 rounded-xl border border-divider-subtle px-4 py-3',
        overdue ? 'bg-state-warning-hover' : 'bg-background-default',
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn('size-3 shrink-0', overdue ? 'text-text-warning' : 'text-text-tertiary')}
          aria-hidden
        />
        <span className="text-xs font-semibold uppercase tracking-[0.4px] text-text-tertiary">
          {label}
        </span>
      </div>
      <span className="text-[16px] leading-none font-semibold tracking-[-0.2px] text-text-primary tabular-nums">
        {date ? formatDatePretty(date, { alwaysShowYear: true }) : '—'}
      </span>
      {subline ? (
        <span
          className={cn(
            'text-xs font-medium',
            sublineTone === 'destructive'
              ? 'text-text-destructive'
              : sublineTone === 'warning'
                ? 'text-text-warning'
                : 'text-text-tertiary',
          )}
        >
          {subline}
        </span>
      ) : null}
    </div>
  )
}

export function PrimaryDeadlineStrip({
  row,
  variant = 'flat',
}: {
  row: ObligationQueueRow
  // `cards` renders the three deadlines as bordered white cards
  // (rounded-12 + divider-subtle + bg-default, matching the Alert
  // detail's card system) for the standalone page. `flat` (default)
  // keeps the frameless divide-x cells used inside the /clients +
  // sheet panels.
  variant?: 'flat' | 'cards'
}) {
  const { i18n, t } = useLingui()
  const todayIso = todayIsoDate()
  // HERO (filing) + 2-column secondary (internal + payment) layout.
  //
  // Filing deadline is the date the IRS / state actually enforces,
  // so it gets a full-width dark hero card with the date in text-xl
  // and a "in N days" / "N days ago" countdown on the right. When
  // the date is past (daysUntilDue < 0 on a non-terminal row), the
  // hero flips to a red surface and the countdown becomes a
  // "Missed" badge.
  //
  // Internal target + Payment due are secondary anchors stacked
  // below the hero in a 2-column grid with quiet bordered cards.
  //
  // Internal = the firm's earlier internal target —
  // extensionInternalTargetDate when set; falls back to currentDueDate
  // capped at <= filing so we never render internal LATER than the
  // statutory anchor.
  const filingIso = row.filingDueDate ?? row.baseDueDate
  const paymentIso = row.paymentDueDate ?? null
  const internalCandidate = row.extensionInternalTargetDate ?? row.currentDueDate ?? filingIso
  const internalIso =
    internalCandidate && filingIso && internalCandidate > filingIso ? filingIso : internalCandidate
  const isTerminal = row.status === 'done' || row.status === 'completed'
  const isMissed = row.daysUntilDue < 0 && !isTerminal
  // Compute days-to-filing for the countdown chip (don't reuse
  // `row.daysUntilDue` since that's anchored on currentDueDate).
  function dayDiff(targetIso: string | null): number | null {
    if (!targetIso) return null
    const ms = new Date(targetIso).getTime() - new Date(todayIso).getTime()
    return Math.round(ms / DAY_MS)
  }
  const filingDays = dayDiff(filingIso)
  // When the row is filed AND internal + payment dates match the
  // filing date (the common case for a clean filing), render a single
  // compact one-liner ("Filed on <date> · 70 days ago") instead of a
  // 3-card strip that would be 100+ px of dates all saying the same
  // thing. Non-terminal rows + terminal rows with mixed dates keep the
  // full strip.
  // Suppress the compact-terminal collapse when the payment is
  // overdue: the compact strip hides the Payment tile (the dates all
  // "match"), but a Filed-but-payment-overdue row really does have a
  // live signal on the payment leg the user needs to see, so fall
  // through to the full 3-tile strip and let the Payment tile paint
  // destructive.
  const hasOverduePayment =
    paymentIso !== null && paymentIso < todayIso && row.status !== 'completed'
  const allTerminalDatesMatch =
    isTerminal &&
    filingIso !== null &&
    internalIso === filingIso &&
    (paymentIso === null || paymentIso === filingIso) &&
    !hasOverduePayment
  if (allTerminalDatesMatch) {
    // The compact hero is a quiet divider-subtle bordered strip —
    // date data only, with a small green ✓ icon as the state cue — not
    // full green chrome. The header status pill is the single
    // green-tone anchor, so painting the hero green too would make the
    // green Filed status appear three times.
    return (
      <div
        aria-label={t`Filed on ${formatDate(filingIso)}`}
        // The compact hero is just info — date and relative time, no
        // surface needed — so it's an inline row of text with a
        // leading green check, no frame or background.
        className="flex flex-wrap items-center justify-between gap-3 py-1"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <ObligationStatusReadBadge status={row.status} />
          <span className="tabular-nums text-text-secondary">{formatDate(filingIso)}</span>
          {filingDays !== null && filingDays !== 0 ? (
            <>
              <span aria-hidden className="text-text-tertiary">
                ·
              </span>
              <span className="text-text-tertiary">
                {filingDays < 0 ? (
                  <Plural value={Math.abs(filingDays)} one="# day ago" other="# days ago" />
                ) : (
                  <Plural value={filingDays} one="in # day" other="in # days" />
                )}
              </span>
            </>
          ) : null}
        </div>
      </div>
    )
  }
  // All three deadlines share a single grid-cols-3 row with the same
  // tile shape — Filing always FIRST so it reads as the primary
  // anchor, then Internal, then Payment. The tile tone ladder
  // carries urgency:
  //   • Filing on a missed row → bordered red tone (destructive
  //     border + tinted bg + red value). No filled background.
  //   • Filing on terminal → success tone.
  //   • Other tiles → neutral white with a small red value when the
  //     individual date is past.
  // The "MISSED" word doesn't repeat as a separate badge inside the
  // tile — the header pill carries that text; the tile's tone (red
  // border + tint) is the visual cue.
  // `'done'` (UI label "Filed") means the filing event has been
  // satisfied but the payment may still be outstanding, so the
  // "satisfied" check is split by milestone: a `'done'` row is
  // satisfied on its filing milestone, and the red signal belongs on
  // payment-due rather than the filing tile.
  const filingSatisfied = isTerminal || row.status === 'done' || row.status === 'paid'
  const filingPast = filingIso !== null && filingIso < todayIso && !filingSatisfied
  // Internal target overdueness is moot once the filing is satisfied —
  // the firm's earlier internal goal stops being actionable once the
  // statutory filing event has happened (Filed / Paid / Completed).
  // Gating on `filingSatisfied` (not `isTerminal`) keeps `'paid'` rows
  // from showing a red "INTERNAL TARGET N DAYS OVERDUE" chip beside a
  // green "Filed" status pill — the conflict the audit (L10) flagged.
  const internalPast = internalIso !== null && internalIso < todayIso && !filingSatisfied
  // Payment-overdue isn't gated by `isTerminal` / filing-satisfied. A
  // row that's been Filed (status='done') but whose payment date has
  // slipped should STILL paint the Payment tile destructive — penalty
  // interest accrues until the wire clears. Per the canonical
  // payment-terminal set, only `completed` and `not_applicable`
  // suppress red on the payment tile. `'paid'` is legacy: it
  // technically means payment cleared, so don't repaint as overdue.
  const paymentPast =
    paymentIso !== null &&
    paymentIso < todayIso &&
    row.status !== 'completed' &&
    row.status !== 'not_applicable' &&
    row.status !== 'paid'
  const filingLateDays = filingPast ? -dayDiff(filingIso)! : null
  const internalLateDays = internalPast ? -dayDiff(internalIso)! : null
  // Route the payment-late count through the canonical helper so the
  // panel tile agrees with the row chip (audit L10 off-by-one 72/73
  // came from the panel using `dayDiff` midnight math while the row
  // used `paymentOverdueDays` real-now math).
  const paymentLateDays = paymentOverdueDays(row, Date.now())
  const formatDaysOverdue = (d: number) =>
    i18n._(plural(d, { one: '# day overdue', other: '# days overdue' }))

  // The standalone page renders real cards (icon + pretty date +
  // weekday·relative sub-line + overdue tint), not the frameless flat
  // strip used inside /clients + the sheet.
  if (variant === 'cards') {
    const wd = (iso: string | null) =>
      iso ? DATE_CARD_WEEKDAYS[new Date(`${iso}T00:00:00.000Z`).getUTCDay()] : ''
    const pastStr = (n: number) => i18n._(plural(n, { one: '# day past', other: '# days past' }))
    const inStr = (n: number) => i18n._(plural(n, { one: 'in # day', other: 'in # days' }))
    const join = (iso: string | null, tail: string | null) => {
      const day = wd(iso)
      if (!day) return null
      return tail ? `${day} · ${tail}` : day
    }
    const filingSub = filingSatisfied
      ? join(filingIso, null)
      : filingLateDays && filingLateDays > 0
        ? join(filingIso, pastStr(filingLateDays))
        : filingDays !== null && filingDays > 0
          ? join(filingIso, inStr(filingDays))
          : filingDays === 0
            ? join(filingIso, t`today`)
            : join(filingIso, null)
    const internalSub =
      internalLateDays && internalLateDays > 0
        ? join(internalIso, pastStr(internalLateDays))
        : join(internalIso, null)
    const paymentSub =
      paymentLateDays && paymentLateDays > 0
        ? join(paymentIso, formatDaysOverdue(paymentLateDays))
        : join(paymentIso, null)
    return (
      <div aria-label={t`Key deadlines`} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DeadlineDateCard
          icon={CalendarXIcon}
          label={t`Filing deadline`}
          date={filingIso}
          overdue={filingPast}
          subline={filingSub}
          sublineTone={filingPast ? 'destructive' : 'tertiary'}
        />
        <DeadlineDateCard
          icon={TargetIcon}
          label={t`Internal target`}
          date={internalIso}
          subline={internalSub}
          sublineTone={internalPast ? 'destructive' : 'tertiary'}
        />
        <DeadlineDateCard
          icon={WalletIcon}
          label={t`Payment due`}
          date={paymentIso}
          subline={paymentSub}
          sublineTone={paymentPast ? 'destructive' : 'tertiary'}
        />
      </div>
    )
  }
  return (
    <div
      aria-label={t`Key deadlines`}
      // Tiles are frameless cells separated by hairline vertical
      // dividers (divide-x) rather than each being its own bordered
      // card, mirroring the alerts EXTRACTED FACTS grid. No `gap-2` so
      // the dividers read as clean column rules; each cell gets `px-3`
      // for breathing room around the rule, and the first cell drops
      // its left pad so the strip aligns flush with the body's `px-12`
      // rhythm.
      className="grid grid-cols-3 divide-x divide-divider-subtle [&>*]:px-3 [&>*:first-child]:pl-0"
    >
      <DeadlineTile
        label={t`Filing deadline`}
        date={filingIso}
        tone={filingSatisfied ? 'success' : isMissed ? 'destructive' : 'primary'}
        primary
        valueTone={filingPast ? 'destructive' : 'primary'}
        {...(filingLateDays !== null && filingLateDays > 0
          ? { lateLabel: formatDaysOverdue(filingLateDays) }
          : {})}
      />
      <DeadlineTile
        label={t`Internal target`}
        date={internalIso}
        tone="neutral"
        valueTone={internalPast ? 'destructive' : 'primary'}
        {...(internalLateDays !== null && internalLateDays > 0
          ? { lateLabel: formatDaysOverdue(internalLateDays) }
          : {})}
      />
      <DeadlineTile
        label={t`Payment due`}
        date={paymentIso}
        tone={paymentPast ? 'destructive' : 'neutral'}
        valueTone={paymentPast ? 'destructive' : paymentIso ? 'primary' : 'tertiary'}
        {...(paymentLateDays !== null && paymentLateDays > 0
          ? { lateLabel: formatDaysOverdue(paymentLateDays) }
          : {})}
      />
    </div>
  )
}

// Canonical tile for the unified 3-column deadline strip. `tone`
// paints the surface (neutral white, success-tinted,
// destructive-tinted); `valueTone` colors the date itself
// (independent of surface so a non-terminal "internal target past"
// row can show a red value on a neutral surface).

export function DeadlineTile({
  label,
  date,
  tone,
  valueTone,
  primary = false,
  lateLabel,
}: {
  label: string
  date: string | null
  tone: 'neutral' | 'success' | 'destructive' | 'primary'
  valueTone: 'primary' | 'destructive' | 'tertiary'
  primary?: boolean
  lateLabel?: string
}) {
  // Tiles are frameless cells (uppercase eyebrow + value) on the bare
  // surface, modeled on the alerts EXTRACTED FACTS grid — no
  // `rounded-lg border`, no white `bg-background-default`; the three
  // dates read as a flat divided strip on the warm pane (dividers come
  // from the parent grid). The success tile keeps a soft tinted
  // surface as its terminal-state tone cue, but stays frameless.
  // Urgency on the other tiles is carried by the red value + a
  // restrained inline "N days overdue" note: a destructive tile uses a
  // red value via `valueTone` rather than a filled red surface,
  // because the header pill, the milestone-strip In-review ring, and
  // the alert banner already carry the lateness signal — filling this
  // tile with red too would stack the alarm.
  const surfaceClass = tone === 'success' ? 'bg-state-success-hover' : ''
  const labelToneClass = tone === 'success' ? 'text-text-success' : 'text-text-tertiary'
  const valueClass = valueTone === 'tertiary' ? 'text-text-tertiary' : 'text-text-primary'
  return (
    <div className={cn('flex flex-col gap-1 py-2.5', surfaceClass)}>
      <span
        className={cn(
          'text-xs leading-tight font-semibold uppercase tracking-wide',
          labelToneClass,
          primary && 'tracking-[0.6px]',
        )}
      >
        {label}
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className={cn('tabular-nums leading-tight', valueClass, 'text-sm font-semibold')}>
          {date ? formatDate(date) : '—'}
        </span>
        {lateLabel ? (
          // Restrained inline red note — no filled pill — consistent
          // with how the alerts detail shows its red `+N days` delta.
          <span className="text-xs font-semibold text-text-destructive tabular-nums">
            {lateLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}

// FlatDateList — secondary dates only. The three primary dates the
// CPA reaches for first — Internal, Filing, Payment — live in the
// PrimaryDeadlineStrip at the top of the snapshot. This
// list carries everything else (period + create/touched timestamps +
// e-file pipeline timestamps) as a quiet reference surface under
// "Reference dates" at the bottom of the drawer.
//
// No `Statutory` row: the PrimaryDeadlineStrip's `Filing deadline`
// resolves to `row.filingDueDate ?? row.baseDueDate` — i.e. the same
// baseDueDate when no separate filing date exists, which is most
// rows. Showing it again under "Reference dates" would duplicate the
// strip above. E-file pipeline timestamps and tax period stay because
// they're not in the primary strip.

export function FlatDateList({ row }: { row: ObligationQueueRow }) {
  const { t } = useLingui()
  const dateRows = useMemo(
    () => [
      // User-facing reference-date list renders prose via
      // `formatDatePretty` (e.g. "May 9, 2026") instead of ISO: the
      // drawer is a panel the user reads, where ISO would undermine
      // the "finance-grade calm" feel. The queue row date column keeps
      // `formatDate` because that's a dense triage table where ISO
      // alignment + tabular-nums is the better trade.
      ...(row.efileSubmittedAt
        ? [
            {
              key: 'submitted',
              label: t`Submitted`,
              value: formatDatePretty(row.efileSubmittedAt.slice(0, 10)),
            },
          ]
        : []),
      ...(row.efileAcceptedAt
        ? [
            {
              key: 'accepted',
              label: t`Accepted`,
              value: formatDatePretty(row.efileAcceptedAt.slice(0, 10)),
            },
          ]
        : []),
      ...(row.efileRejectedAt
        ? [
            {
              key: 'rejected',
              label: t`Rejected`,
              value: formatDatePretty(row.efileRejectedAt.slice(0, 10)),
            },
          ]
        : []),
      {
        key: 'period',
        label: t`Tax period`,
        value: formatTaxPeriod(row.taxPeriodStart, row.taxPeriodEnd),
      },
      { key: 'created', label: t`Created`, value: formatDatePretty(row.createdAt.slice(0, 10)) },
      {
        key: 'updated',
        label: t`Last touched`,
        value: formatDatePretty(row.updatedAt.slice(0, 10)),
      },
    ],
    [row, t],
  )
  return (
    <dl
      aria-label={t`Dates`}
      className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-xs"
    >
      {dateRows.map((entry) => (
        <Fragment key={entry.key}>
          <dt className="text-text-tertiary">{entry.label}</dt>
          <dd className="text-text-primary tabular-nums">{entry.value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

// StatutoryDatesPanel — just the flat date list (2026-05-23). The
// `YearStripTimeline` that used to sit above the list was dropped
// per critique ("can remove the timeline for dates first"). It
// duplicated the PathToFilingSummary at the top of the drawer (also
// a spatial lifecycle view) and was redundant with the explicit
// per-row dates here. Two timelines on the same drawer screen
// competed for attention without adding signal. Component + its
// `clamp01` helper were removed entirely; git history has them if
// we ever need to revive the visualization for multi-year cycles.

export function StatutoryDatesPanel({ row }: { row: ObligationQueueRow }) {
  return <FlatDateList row={row} />
}

// `stageIndexForStatus` + `mineStageTimestamps` + `STAGE_ANCHOR_STATUSES`
// retired 2026-05-21. The old 5-step funnel vocabulary (Scope /
// Collecting / Preparing / Signature / Filed) was replaced by the
// 6-status lifecycle timeline below — same audit-event mining logic,
// new shape.

// Horizontal milestone timeline — 6 lifecycle stages with circles +
// connecting lines + labels. Replaces the prior collapsed disclosure
// (which hid the most useful audit-defense info behind a click).
//
// Vocabulary (per 2026-05-21 design call) follows the lifecycle v2
// status names so the timeline reads the same as the queue's status
// pills + the header status pill — no parallel "Scope / Collecting"
// jargon to translate.
//
//   Not started → Waiting → Blocked → In review → Filed → Completed
//
// Visual states per stage:
//   - "done"    : completed in audit history → green-filled circle
//   - "active"  : the row's current status → accent ring (red if overdue)
//   - "upcoming": not yet reached → empty ring

export function PathToFilingSummary({
  row,
  auditEvents,
}: {
  row: ObligationQueueRow
  auditEvents: readonly AuditEventPublic[]
}) {
  const { t } = useLingui()
  const stages = useMemo(
    // 2026-05-27 (Agent X3 milestone audit M-04): "Waiting" → "Waiting
    // on client" so the strip matches the queue pill + drawer header
    // pill + readiness overview headline + v2 label hook. Same row,
    // one name across every milestone surface. The short form was a
    // legacy convenience from when this strip was a tight 6-column
    // grid; the column now has enough width to carry the full label
    // and the consistency win outweighs the few pixels saved.
    () =>
      [
        { key: 'pending', label: t`Not started` },
        { key: 'waiting_on_client', label: t`Waiting on client` },
        { key: 'blocked', label: t`Blocked` },
        { key: 'review', label: t`In review` },
        { key: 'done', label: t`Filed` },
        { key: 'completed', label: t`Completed` },
      ] as const,
    [t],
  )
  const currentIndex = timelineIndexForStatus(row.status)
  const stamps = useMemo(() => mineTimelineTimestamps(auditEvents), [auditEvents])
  const isPastInternalDue = row.daysUntilDue < 0
  // Filed-stage index — used to project an expected date when Filed
  // is still upcoming (the row's internal deadline IS the expected
  // file date). Other upcoming stages don't get a projection.
  const filedStageIndex = stages.findIndex((s) => s.key === 'done')
  // OVERDUE only applies on PRE-TERMINAL stages (2026-05-21). Once a
  // row reaches Filed or Completed, the action has been taken —
  // calling the stage "OVERDUE" contradicts the green Filed pill in
  // the header and creates a confusing mixed signal (green pill +
  // red ring on the same lifecycle moment). Lateness is still
  // visible in the dates panel via the red `Internal due` value;
  // that's the right surface for "was this filed on time?"
  //
  // 2026-05-24 (re-critique): hoisted `TIMELINE_TERMINAL_STAGE_KEYS`
  // to module scope (alongside DUE_DAYS_TERMINAL_STATUSES) — the
  // previous shape allocated a fresh Set on every render of this
  // component without need.
  // Sub-status annotation for the ACTIVE stage. Derived from existing
  // schema fields — no migration needed:
  //   waiting_on_client → row.prepStage (waiting_on_client /
  //     waiting_on_third_party / bookkeeping_cleanup / ready_for_prep)
  //   blocked          → row.blockedByObligationInstanceId (K-1) via
  //     existing BlockedByChip; a verbal hint here would duplicate that.
  //   review           → compact workflow from row.prepStage + row.reviewStage
  //     (preparing return / reviewing return / ready to file)
  //   done (filed)     → row.efileState (submitted → awaiting; accepted;
  //     rejected; paper_filed; final_package_delivered)
  // Returns null when no meaningful annotation exists. Renders as a
  // small text line beneath the state word ("ACTIVE / Awaiting IRS").
  const activeSubStatus = subStatusForActiveStage(row, t)
  return (
    <div aria-label={t`Milestone timeline`} className="pb-1">
      <div className="grid grid-cols-6 gap-0">
        {stages.map((stage, i) => {
          // 2026-05-24 (critique P1 — shape): the timeline used to
          // render every stage before currentIndex as "done" (green
          // tick), even ones the row never sat in. A row that goes
          // Not started → In review directly would show Waiting and
          // Blocked as ✓ completed — telling a history that didn't
          // happen.
          //
          // Now the state map consults the audit-event stamps:
          //   - `done`     past stage WITH a stamp → genuinely entered
          //   - `skipped`  past stage WITHOUT a stamp → bypassed
          //   - `active`   the row's current stage
          //   - `upcoming` stage the row hasn't reached yet
          // `skipped` renders as a smaller muted dot — visually
          // distinct from both filled-success "done" and the empty
          // ring of "upcoming."
          //
          // Stage 0 is special: every row is born at "Not started" so
          // an empty stamp there still counts as entered. The row's
          // createdAt is the implicit stamp.
          const state: 'done' | 'skipped' | 'active' | 'upcoming' =
            i === currentIndex
              ? 'active'
              : i < currentIndex
                ? stamps[i] !== null || i === 0
                  ? 'done'
                  : 'skipped'
                : 'upcoming'
          // Date resolution (milestone-timeline-prd.md §3, 2026-05-25
          // Deadlines #23/#24/#25 doc-gap fix):
          //   Done/Active     : audit-event stamp (first entry into stage)
          //   Stage 0 fallback: row.createdAt (the row was born here)
          //   Filed upcoming  : row.currentDueDate (the FIRM's deadline
          //                     IS the projected file date — only stage
          //                     we can reliably project)
          //   Skipped         : no stamp, no projection (the stage didn't
          //                     happen — projecting a date there would
          //                     fabricate history)
          //   Other upcoming  : blank (we can't project Completed et al.
          //                     without firm-specific cadence data, and
          //                     showing a guess would mislead audit defense)
          //
          // The empty cells are intentional: misleading projections are
          // worse than honest absences for an audit-defense workflow.
          // The `title` attribute on the date span (further down) tells
          // hover users what the blank means.
          let stamp = stamps[i] ?? null
          let isExpected = false
          if (!stamp && i === 0) stamp = row.createdAt
          if (!stamp && state === 'upcoming' && i === filedStageIndex) {
            stamp = row.currentDueDate
            isExpected = true
          }
          // Hover hint that explains why the date cell may be blank.
          // Mirrors the resolution table above in plain language so
          // CPAs scanning the strip understand the absence is a
          // choice, not a missing-data bug.
          const emptyDateHint =
            state === 'skipped'
              ? t`This stage was skipped — no date applies.`
              : state === 'upcoming'
                ? i === filedStageIndex
                  ? undefined
                  : t`This stage hasn't been reached yet. We only project the Filed date (using the internal due date).`
                : undefined
          const overdueActive =
            state === 'active' && isPastInternalDue && !TIMELINE_TERMINAL_STAGE_KEYS.has(stage.key)
          return (
            <div key={stage.key} className="flex flex-col items-center gap-0.5">
              {/* 2026-05-24 (Figma replica pass): milestone strip
                  rebuilt to match the Figma’s rhythm:
                    — Connectors switch from solid 2px bars to a
                      DOTTED hairline so the strip reads as "stages on
                      a thin track", not "stages connected by a pipe".
                    — Completed circles drop the bold green fill
                      in favour of a softer success-hover bg + a small
                      green tick — less dominant per Yuqi’s "finished
                      state looks too dominant" critique.
                    — Active stage uses a stronger accent ring;
                      the inner blue dot retired since the ring + bold
                      stage label carries the active signal alone. */}
              <div className="flex w-full items-center gap-1">
                <span
                  aria-hidden
                  className={cn(
                    // 2026-06-10 (Yuqi "work on the detail page" / Qn4nX
                    // StatusJourney): continuous SOLID track (was a dotted
                    // hairline); entered edges fill accent up to the active
                    // stage, the rest stays a neutral rule.
                    'h-0 flex-1 border-t',
                    (() => {
                      if (i === 0) return 'opacity-0'
                      const thisEntered = state === 'done' || state === 'active'
                      const prevIdx = i - 1
                      const prevEntered =
                        prevIdx === currentIndex ||
                        (prevIdx < currentIndex && (prevIdx === 0 || stamps[prevIdx] !== null))
                      return thisEntered && prevEntered
                        ? 'border-state-accent-solid'
                        : 'border-divider-regular'
                    })(),
                  )}
                />
                {/* 2026-05-26 (Yuqi /deadlines drawer #1, #2, #3):
                    stage indicator now uses STAGE-SPECIFIC lucide
                    icons so the milestone strip tells the story by
                    icon identity, not just a generic check/dot.
                      - Not started: CircleDashed
                      - Waiting: Clock
                      - Blocked: Lock
                      - In review: Eye
                      - Filed: FileCheck2
                      - Completed: CheckCircle2
                    State (done/active/skipped/upcoming) maps to
                    tone instead:
                      - done   = bg success-hover + text success-solid
                      - active = bg accent-hover + text accent-solid + ring
                      - skipped = dashed border + text tertiary
                      - upcoming = empty bg + text tertiary
                    This fixes #1 ("why no stage-specific icons"),
                    #2 (Filed now has a visible icon + tone), and #3
                    (Filed-active visually distinct from Completed-
                    upcoming by both icon identity AND tone). */}
                <span
                  aria-hidden
                  className={cn(
                    // 2026-05-26 (Yuqi drawer feedback — "said there should not
                    // be a bold border"): dropped the `ring-1` outer ring on
                    // both `active` and `overdueActive` states. The border +
                    // tint + icon identity were ALREADY conveying "this is the
                    // current stage"; the extra ring layer was reading as a
                    // double-bordered chip and shouting too hard against the
                    // calmer done/upcoming neighbors.
                    // 2026-06-10 (Yuqi "#5 反色" / Qn4nX StatusJourney): stage
                    // circles are SOLID FILLED with white glyphs (not soft
                    // tints) — done/active read as filled chips, upcoming stays
                    // an empty outline ring.
                    'grid size-6 shrink-0 place-items-center rounded-full border',
                    state === 'done'
                      ? 'border-transparent bg-state-accent-solid text-text-inverted'
                      : state === 'skipped'
                        ? 'border-dashed border-divider-regular bg-background-default text-text-tertiary/60'
                        : overdueActive
                          ? 'border-transparent bg-state-destructive-solid text-text-inverted'
                          : state === 'active'
                            ? 'border-transparent bg-state-accent-solid text-text-inverted'
                            : 'border-divider-regular bg-background-default text-text-tertiary/70',
                  )}
                >
                  {(() => {
                    // 2026-06-10 (Yuqi #9): stages NOT yet reached render as an
                    // empty circle (no icon), per Pencil `aNMRF` — only the
                    // done / active / skipped stages carry a glyph. The wrapper
                    // already paints the upcoming circle (white + border).
                    const isUpcoming =
                      state !== 'done' &&
                      state !== 'active' &&
                      state !== 'skipped' &&
                      !overdueActive
                    if (isUpcoming) return null
                    // 2026-05-26 (Yuqi feedback #8): align the stage
                    // icon set with the canonical STATUS_ICON map
                    // (status-control.tsx). The pending stage now
                    // uses Loader (the canonical pending icon) rather
                    // than CircleDashed — consistent with the row
                    // pill, the scope tabs, and the status dropdown.
                    // Other stages were already aligned via their
                    // status mapping; only `pending` was the
                    // outlier here.
                    const StageIcon = (
                      stage.key === 'pending'
                        ? Loader
                        : stage.key === 'waiting_on_client'
                          ? Hourglass
                          : stage.key === 'blocked'
                            ? Construction
                            : stage.key === 'review'
                              ? MessageSquareText
                              : stage.key === 'done'
                                ? FileCheck
                                : CircleCheck
                    ) as React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
                    return <StageIcon className="size-3.5" aria-hidden />
                  })()}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'h-0 flex-1 border-t border-dotted',
                    // 2026-05-24 (critique P1 — shape): the right-side
                    // connector represents the edge into stage i+1.
                    // Green only when BOTH stage i was entered (or
                    // active) AND stage i+1 was entered (or active) —
                    // i.e. the row actually crossed this edge. Skipped
                    // stages on either end keep the edge muted.
                    (() => {
                      if (i === stages.length - 1) return 'opacity-0'
                      const thisEntered = state === 'done' || state === 'active'
                      const nextIdx = i + 1
                      const nextEntered =
                        nextIdx === currentIndex ||
                        (nextIdx < currentIndex && stamps[nextIdx] !== null)
                      return thisEntered && nextEntered
                        ? 'border-divider-strong'
                        : 'border-divider-regular'
                    })(),
                  )}
                />
              </div>
              {/* 2026-05-25 (Yuqi Deadlines #22): stage label
                  dropped from text-caption (11px) to text-caption-xs
                  (10px) to match the date below — the two sat at
                  different scales and made the column feel
                  unbalanced. Active state keeps font-medium for
                  weight contrast. */}
              <span
                className={cn(
                  'mt-0.5 text-center text-caption-xs leading-tight',
                  state === 'active'
                    ? 'font-medium text-text-primary'
                    : state === 'done'
                      ? 'text-text-secondary'
                      : 'text-text-tertiary',
                )}
              >
                {stage.label}
              </span>
              {/* Date + state + sub-status grouped into a single block
                  with a real gap from the stage label above. Earlier
                  they were direct flex children with no separation, so
                  the eye couldn't tell that the stage name (e.g.
                  "Filed") and the date + Overdue/Active/Expected
                  pill below it were two different units. Critique #16
                  flagged this; wrapping them in a child flex column
                  with `mt-2` + internal `gap-0.5` separates the stage
                  label from its status detail.

                  2026-05-23 (critique #2: "no alignment to the other
                  states"): the inner block now renders for EVERY
                  column with consistent height — empty columns
                  reserve space via &nbsp; placeholders so the
                  timeline reads as a level baseline across all six
                  stages instead of a ragged active-tall / upcoming-
                  short pattern. */}
              {/* Date + Overdue label. 2026-05-24 cleanup:
                    — Em-dash placeholders dropped. Stages with no
                      date render a non-breaking space so the
                      baseline stays consistent without "—" noise
                      cluttering future stages.
                    — "ACTIVE" word retired — it was redundant
                      against the bold stage label + ring. Only
                      "Overdue" (destructive, when the active stage
                      is past internal due) and "Expected" (tertiary,
                      when projecting the Filed milestone forward)
                      still render. */}
              {/* 2026-05-25 (Yuqi Deadlines #26): mt-1.5 (6px) gap
                  between the stage label and the date block read
                  as too loose — the date felt unrelated to the
                  stage above it. Tightened to mt-1 (4px) so the
                  pair reads as one unit. */}
              <div className="mt-1 flex w-full flex-col items-center gap-0.5">
                <span
                  // 2026-05-26 (Yuqi feedback #9): date smaller —
                  // text-caption-xs (10px) → text-[9px] leading-none.
                  // The stage label sits at caption-xs above, dates
                  // were at the same scale making the column feel
                  // even-weight. One step smaller gives the label
                  // visual primacy and the date reads as meta.
                  className={cn(
                    'text-center text-[9px] tabular-nums leading-none',
                    state === 'active' ? 'text-text-primary' : 'text-text-tertiary',
                  )}
                  // 2026-05-25 (Yuqi Deadlines #23/#24/#25): hover hint
                  // surfaces the date-resolution policy in plain
                  // language for blank cells (skipped / non-Filed
                  // upcoming). Stops the empty space reading as a
                  // missing-data bug.
                  title={emptyDateHint}
                >
                  {(state === 'done' || state === 'active' || isExpected) && stamp
                    ? formatDate(stamp.slice(0, 10))
                    : ' '}
                </span>
                {overdueActive ? (
                  // 2026-05-26 (Yuqi sixty-seventh pass — context for
                  // OVERDUE): the bare word "Overdue" answered "is
                  // this late?" but not "late vs what?" Tied it back
                  // to the canonical thing that's late — the FIRM'S
                  // internal target date — so a CPA scanning the
                  // strip sees both the urgency cue and the noun.
                  // Hover spells out the exact days-late count + the
                  // deadline date.
                  // 2026-05-26 (Yuqi drawer feedback — "too much red on
                  // the right panel"): demoted from text-text-destructive
                  // to text-text-secondary. The destructive-toned In-
                  // review CIRCLE above is already the red signal at
                  // this stage; doubling it with red caption copy
                  // underneath read as a shout. The word still says
                  // "Past deadline" — readable in any tone.
                  <span
                    // 2026-06-10 (Yuqi #8): caption smaller than the date above
                    // (8px vs 9px) + lighter (muted) so it reads as sub-meta.
                    className="text-center text-[9px] font-medium uppercase tracking-wide leading-tight text-text-muted"
                    title={t`Filing was due ${formatDatePretty(row.currentDueDate.slice(0, 10))} · ${Math.abs(row.daysUntilDue)} days past deadline.`}
                  >
                    <Trans>Past deadline</Trans>
                  </span>
                ) : isExpected ? (
                  <span className="text-center text-[9px] font-medium uppercase tracking-wide leading-tight text-text-muted">
                    <Trans>Expected</Trans>
                  </span>
                ) : null}
                {/* Sub-status annotation — only on the ACTIVE stage,
                      only when there's something meaningful to add
                      (e.g., "Awaiting acceptance" on Filed; "Partner
                      sign-off" later when review_level lands). Reads
                      existing schema fields (prepStage / reviewStage
                      / efileState). See subStatusForActiveStage()
                      above. */}
                {state === 'active' && activeSubStatus ? (
                  <span
                    className="text-center text-caption-xs leading-tight text-text-secondary"
                    title={activeSubStatus}
                  >
                    {activeSubStatus}
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AuthorityResponsePanel({
  row,
  auditEvents,
  accepting,
  rejecting,
  onConfirmAccepted,
  onRecordRejection,
  onChangeTab,
}: {
  row: ObligationQueueRow
  auditEvents: readonly AuditEventPublic[]
  accepting: boolean
  rejecting: boolean
  onConfirmAccepted: () => void
  onRecordRejection: () => void
  onChangeTab: (tab: ObligationQueueDetailTab) => void
}) {
  const { t } = useLingui()
  const rejection = useMemo(() => latestAuthorityRejectionAudit(auditEvents), [auditEvents])

  // Completed rows surface the authority response inline in
  // ActiveStageDetailCard's header — no separate panel here.
  if (row.status === 'completed') return null

  if (row.status === 'review' && row.efileRejectedAt !== null) {
    const rejectedAt = rejection?.rejectedAt ?? row.efileRejectedAt
    const nextStep = rejection?.nextStep ?? 'correct_resubmit'
    const action =
      nextStep === 'request_client_input'
        ? {
            label: t`Request client input`,
            tab: 'readiness' as const,
          }
        : nextStep === 'paper_file'
          ? {
              label: t`Switch to paper filing`,
              tab: 'evidence' as const,
            }
          : null

    return (
      <section className="grid gap-3 rounded-lg border border-state-danger-border bg-state-danger-hover px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-text-primary">
              <Trans>Correction needed</Trans>
            </p>
            <p className="text-sm text-text-secondary">
              <Trans>Rejected by authority</Trans>
              {rejectedAt ? <> · {formatDatePretty(rejectedAt.slice(0, 10))}</> : null}
            </p>
          </div>
          {/* 2026-06-01: swapped hand-rolled destructive pill for
              Badge variant="destructive". Soft red bg carries the
              destructive tone; the explicit border is dropped. */}
          <Badge variant="destructive">
            <AlertTriangleIcon className="size-3" aria-hidden />
            <Trans>Rejected</Trans>
          </Badge>
        </div>
        {rejection?.reason || rejection?.authority || rejection?.reference ? (
          <dl className="grid gap-2 text-sm md:grid-cols-3">
            {rejection.authority ? (
              <div className="grid gap-0.5">
                <dt className="text-caption-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <Trans>Authority</Trans>
                </dt>
                <dd className="text-text-primary">{rejection.authority}</dd>
              </div>
            ) : null}
            {rejection.reference ? (
              <div className="grid gap-0.5">
                <dt className="text-caption-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <Trans>Reference</Trans>
                </dt>
                <dd className="text-text-primary">{rejection.reference}</dd>
              </div>
            ) : null}
            {rejection.reason ? (
              <div className="grid gap-0.5 md:col-span-3">
                <dt className="text-caption-xs font-medium uppercase tracking-wide text-text-tertiary">
                  <Trans>Reason</Trans>
                </dt>
                <dd className="text-text-primary">{rejection.reason}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {action ? (
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChangeTab(action.tab)}
            >
              {action.label}
            </Button>
          </div>
        ) : null}
      </section>
    )
  }

  if (row.status !== 'done') return null

  return (
    <section className="grid gap-3 rounded-lg border border-divider-subtle bg-background-default px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-text-primary">
            <Trans>Authority response</Trans>
          </p>
          <p className="text-sm text-text-secondary">
            <Trans>Awaiting authority acceptance</Trans>
          </p>
        </div>
        {/* 2026-06-01: swapped hand-rolled warning pill for
            Badge variant="warning". Same soft amber background and
            text token, with built-in icon sizing. */}
        <Badge variant="warning">
          <Clock className="size-3" aria-hidden />
          <Trans>Pending</Trans>
        </Badge>
      </div>
      <p className="text-sm text-text-secondary">
        <Trans>
          Filed means the return was submitted to the authority. Keep it open until the authority
          accepts or rejects it.
        </Trans>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onConfirmAccepted}
          disabled={accepting || rejecting}
          aria-busy={accepting}
        >
          {accepting ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <CheckCircle2Icon data-icon="inline-start" />
          )}
          <Trans>Confirm authority accepted</Trans>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRecordRejection}
          disabled={accepting || rejecting}
        >
          <AlertTriangleIcon data-icon="inline-start" />
          <Trans>Record authority rejection</Trans>
        </Button>
      </div>
    </section>
  )
}

// Stage keys, in strip order. Indexed by `timelineIndexForStatus`.

export function ActiveStageDetailCard({
  row,
  auditEvents,
  readinessChecklist,
  onChangeTab,
  onChangeStatus,
  onConfirmAcceptance,
  onRecordRejection,
  onChangePrepStage,
  onChangeReviewStage,
  onMarkSigned,
  onRemindSignature,
  onSubmitEfile,
}: {
  row: ObligationQueueRow
  auditEvents: readonly AuditEventPublic[]
  readinessChecklist: readonly ReadinessDocumentChecklistItemPublic[]
  onChangeTab: (tab: ObligationQueueDetailTab) => void
  onChangeStatus: (status: ObligationStatus) => void
  onConfirmAcceptance: () => void
  onRecordRejection: () => void
  onChangePrepStage: (prepStage: ObligationPrepStage) => void
  onChangeReviewStage: (reviewStage: ObligationReviewStage) => void
  // P0 signature loop: advance efileState → authorization_signed.
  onMarkSigned: () => void
  // P0: email the client a Form 8879 signature reminder.
  onRemindSignature: () => void
  // P0: e-file the signed return (efileState → submitted).
  onSubmitEfile: () => void
}) {
  const { t } = useLingui()
  // For the `blocked` stage's "Open blocking obligation" action.
  // Routes to the drawer for whichever upstream row blocks this one
  // (row.blockedByObligationInstanceId). Same provider the queue +
  // client-detail surfaces use, so the navigation is consistent.
  const { openDrawer } = useObligationDrawer()
  const stageIdx = timelineIndexForStatus(row.status)
  const stageKey: TimelineStageKey = TIMELINE_STAGE_KEYS[stageIdx] ?? 'pending'
  // 2026-05-27 (Agent X3 milestone audit M-04): "Waiting" → "Waiting on
  // client" so this card's header label matches the strip above it, the
  // queue pill, and the v2 label hook. See PathToFilingSummary for the
  // matching change on the strip.
  const stageLabels: Record<TimelineStageKey, string> = {
    pending: t`Not started`,
    waiting_on_client: t`Waiting on client`,
    blocked: t`Blocked`,
    review: t`In review`,
    done: t`Filed`,
    completed: t`Completed`,
  }
  // 2026-05-23: A/B/C IA preview retired. Winning shape (Option D):
  // the stage card carries WAITING header + a single one-line signal
  // ("3 docs outstanding · Open Client readiness →") + the primary
  // "Mark client docs received" button. The full outstanding-docs
  // panel is gone — that data lives on the Client readiness tab,
  // not duplicated here. Sub-status reads "Awaiting client · N days
  // so far" so the header is honest about *time elapsed*, not just
  // a generic "waiting on docs" repeat of what the count line says.
  const isWaitingStage = stageKey === 'waiting_on_client'
  const isWaitingDocsCase = isWaitingStage && row.prepStage === 'waiting_on_client'
  // Outstanding docs count powers the inline signal in the Waiting
  // card body. Same filter logic the old WaitingOutstandingDocs panel
  // used (anything not yet `received`), just without the bullet list.
  const outstandingDocsCount = useMemo(
    () => countOutstandingReadinessDocuments(readinessChecklist),
    [readinessChecklist],
  )
  const allReadinessDocsReceived = useMemo(
    () => willReadinessChecklistBeFullyReceived(readinessChecklist, new Set<string>()),
    [readinessChecklist],
  )
  // 2026-06-10 (Yuqi — Pencil `iTasJ` materials progress): big-number +
  // received/outstanding/waived chips + green progress bar for the waiting card.
  const readinessCounts = useMemo(() => {
    const total = readinessChecklist.length
    const received = readinessChecklist.filter((item) => item.status === 'received').length
    const waived = readinessChecklist.filter((item) => item.status === 'waived').length
    return { total, received, waived, outstanding: Math.max(0, total - received - waived) }
  }, [readinessChecklist])
  // Pencil `c2l347` BLOCKING glance: the actual outstanding materials (real
  // checklist items) so the card names WHICH docs block, not just a count.
  const outstandingItems = useMemo(
    () =>
      readinessChecklist.filter((item) => item.status !== 'received' && item.status !== 'waived'),
    [readinessChecklist],
  )
  // Sub-status descriptor — read inline (NOT from
  // `subStatusForActiveStage(row, t)` because that helper takes `t`
  // as a parameter, which the Lingui macro doesn't transform → label
  // came back empty in the prototype). Each canonical sub-status
  // gets a human-readable phrase here.
  const subStatus: string | null = (() => {
    // Sub-status text answers "WHAT is the row actually doing right
    // now?" — appears next to the stage label as "STAGE · sub-status".
    // Earlier copy ("Documents from client", "Upstream obligation",
    // "Submitted") punted on the object; readers had to fill in the
    // gap mentally. Each label below names the object + actor so the
    // line reads as a complete sentence.
    switch (row.status) {
      case 'waiting_on_client':
        if (row.prepStage === 'waiting_on_client') {
          // Sub-status names the WHEN (days since entering Waiting),
          // not the WHAT — the WHAT is the inline signal line below
          // ("3 docs outstanding"). Header should add information,
          // not repeat the body. Find the most recent
          // status_changed → waiting_on_client event for the
          // timestamp; fall back to neutral phrasing if no audit
          // event matches (e.g., demo-seed rows with no transition
          // history).
          let enteredAt: string | null = null
          for (const event of auditEvents) {
            if (typeof event.afterJson !== 'object' || event.afterJson === null) continue
            const after = (event.afterJson as { status?: unknown }).status
            if (after === 'waiting_on_client') {
              if (!enteredAt || event.createdAt > enteredAt) enteredAt = event.createdAt
            }
          }
          if (enteredAt) {
            const today = new Date().toISOString().slice(0, 10)
            const days = daysBetween(enteredAt.slice(0, 10), today)
            if (days <= 0) return t`Awaiting client response`
            if (days === 1) return t`Awaiting client · 1 day so far`
            return t`Awaiting client · ${days} days so far`
          }
          return t`Awaiting client response`
        }
        if (row.prepStage === 'waiting_on_third_party')
          return t`Waiting on third party for K-1 / 1099`
        if (row.prepStage === 'bookkeeping_cleanup') return t`Cleaning up client's books`
        if (row.prepStage === 'ready_for_prep') return t`All docs in — ready to draft`
        return null
      case 'blocked':
        if (row.blockedByObligationInstanceId) return t`Waiting on upstream return to file`
        return null
      case 'review':
      case 'in_progress':
        if (row.reviewStage === 'notes_open') return t`Review notes open`
        if (reviewPipelineCurrent(row) === 'ready_to_file') return t`Ready to file`
        if (reviewPipelineCurrent(row) === 'reviewing_return') return t`Reviewing return`
        return t`Preparing return`
      case 'extended':
        return t`Extension filed — new due date in effect`
      case 'done':
        if (row.efileState === 'authorization_requested')
          return t`8879 sent to client for signature`
        if (row.efileState === 'authorization_signed')
          return t`Client returned signed 8879 — ready to e-file`
        if (row.efileState === 'ready_to_submit') return t`Ready to e-file with authority`
        if (row.efileState === 'submitted') return t`E-filed — awaiting authority acceptance`
        if (row.efileState === 'accepted') return t`Authority accepted the return`
        if (row.efileState === 'rejected') return t`Authority rejected the e-file`
        if (row.efileState === 'corrected_resubmitted')
          return t`Corrected and re-submitted to authority`
        if (row.efileState === 'paper_filed') return t`Paper-filed with authority`
        if (row.efileState === 'final_package_delivered') return t`Final package sent to client`
        return null
      case 'paid':
        if (row.paymentState === 'estimate_needed') return t`Calculating the tax estimate`
        if (row.paymentState === 'client_approval_needed')
          return t`Awaiting client approval of estimate`
        if (row.paymentState === 'scheduled') return t`Payment scheduled with authority`
        if (row.paymentState === 'confirmed') return t`Authority confirmed payment cleared`
        return null
      default:
        return null
    }
  })()
  const stageStatusSet = STAGE_STATUS_GROUPS[stageKey]
  const stageEvents = useMemo(() => {
    const filtered = auditEvents.filter((event) => {
      if (typeof event.afterJson !== 'object' || event.afterJson === null) return false
      const status = (event.afterJson as { status?: unknown }).status
      // Widen Set<ObligationStatus> → ReadonlySet<string> for the lookup
      // (covariant widening: ReadonlySet only reads, so a Set of a narrower
      // type satisfies a ReadonlySet of a wider type). Lets us check
      // membership against an arbitrary string without an unsafe narrow.
      return typeof status === 'string' && (stageStatusSet as ReadonlySet<string>).has(status)
    })
    return [...filtered].toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
  }, [auditEvents, stageStatusSet])
  // P0: most-recent Form 8879 signature-reminder timestamp, for the "last
  // reminded N days ago" line on the awaiting-signature stage card.
  // Derived from the audit log — no dedicated column.
  const lastSignatureReminderAt = useMemo(() => {
    let latest: string | null = null
    for (const event of auditEvents) {
      if (event.action !== 'obligation.signature.reminded') continue
      if (!latest || event.createdAt > latest) latest = event.createdAt
    }
    return latest
  }, [auditEvents])
  const reviewCurrent = reviewPipelineCurrent(row)
  const notesOpen = row.reviewStage === 'notes_open'
  const tasks: StageTask[] = useMemo(() => {
    switch (stageKey) {
      case 'pending':
        // 2026-05-23 IA fix: Not Started used to offer a single primary
        // "Start drafting the return" that jumped straight to In review,
        // skipping Waiting entirely. Per the canonical CPA workflow
        // (engagement → request docs → wait → receive → prep → review →
        // file) most rows actually need a "Request docs from client"
        // step first. Two explicit paths are honest about which
        // situation applies: "Request documents from client" is the
        // common case for brand-new rows, "Start drafting the return"
        // is the rarer case where docs are already in hand.
        return [
          {
            id: 'engagement',
            label: t`Confirm engagement letter is on file for this client`,
            flavor: 'manual',
          },
          { id: 'assign', label: t`Assign a preparer to this return`, flavor: 'manual' },
          {
            id: 'request-docs',
            label: t`Request documents from client`,
            flavor: 'mutation',
            primary: true,
            hint: t`Moves the row to Waiting and opens the Materials tab to send the request.`,
          },
          {
            id: 'start',
            label: t`Skip ahead to drafting (docs already in hand)`,
            flavor: 'mutation',
            hint: t`Use only when you already have all client documents. Sends the row straight to In review.`,
          },
        ]
      case 'waiting_on_client': {
        if (row.prepStage === 'bookkeeping_cleanup') {
          return [
            {
              id: 'books',
              label: t`Finish cleaning up the client's books`,
              flavor: 'manual',
            },
            {
              id: 'resume',
              label: t`Resume drafting the return`,
              flavor: 'mutation',
              primary: true,
            },
            {
              id: 'mark-blocked',
              label: t`Mark blocked`,
              flavor: 'mutation',
              hint: t`Use when another return, notice, or issue is stopping this deadline.`,
            },
          ]
        }
        if (row.prepStage === 'waiting_on_third_party') {
          return [
            {
              id: 'eta',
              label: t`Confirm ETA with the third party`,
              flavor: 'manual',
            },
            {
              id: 'received',
              label: t`Mark materials received`,
              flavor: 'mutation',
              primary: true,
            },
            {
              id: 'mark-blocked',
              label: t`Mark blocked`,
              flavor: 'mutation',
              hint: t`Use when another return, notice, or issue is stopping this deadline.`,
            },
          ]
        }
        // 2026-05-23: Option D shape — a primary mutation plus a
        // quiet escape hatch for genuine blocker cases. The routing
        // affordance (open Materials tab) moved into the inline
        // signal line in the card body; the manual chase reminder
        // dropped because "Send reminder" is the same action surfaced
        // from the Materials tab itself.
        return [
          {
            id: 'received',
            label: t`Mark materials received`,
            flavor: 'mutation',
            primary: true,
          },
          {
            id: 'mark-blocked',
            label: t`Mark blocked`,
            flavor: 'mutation',
            hint: t`Use when another return, notice, or issue is stopping this deadline.`,
          },
        ]
      }
      case 'blocked':
        // The inline `BlockerContextCard` above already surfaces +
        // routes to the blocking obligation. Dropping the duplicate
        // "Open blocking obligation" task — the card IS that
        // affordance, with the blocker's identity attached.
        return [
          {
            id: 'unblocked',
            label: t`Mark upstream return resolved`,
            flavor: 'mutation',
            primary: true,
          },
        ]
      case 'review': {
        if (reviewCurrent === 'preparing_return') {
          return [
            {
              id: 'send-review',
              label: t`Send to review`,
              flavor: 'mutation',
              primary: true,
              hint: t`Use after the preparer has finished the draft.`,
            },
          ]
        }
        if (reviewCurrent === 'reviewing_return') {
          if (notesOpen) {
            return [
              {
                id: 'mark-notes-addressed',
                label: t`Mark notes addressed`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          }
          return [
            {
              id: 'approve-return',
              label: row.efileRejectedAt !== null ? t`Approve corrected return` : t`Approve return`,
              flavor: 'mutation',
              primary: true,
            },
            {
              id: 'leave-review-note',
              label: t`Leave note for preparer`,
              flavor: 'mutation',
            },
          ]
        }
        // 2026-05-27: no 8879 routing task here. The app does not yet
        // support sending or collecting client e-file authorization, so
        // routing to Evidence from In review creates a dead-end workflow.
        return [
          {
            id: 'file',
            label: t`Mark return submitted to authority`,
            flavor: 'mutation',
            primary: true,
          },
        ]
      }
      case 'done': {
        // Sub-status mutations on a `done` row (advancing efileState
        // through 8879-requested → signed → submitted → accepted, or
        // paymentState through estimate → approval → scheduled →
        // confirmed) need their own RPC procedures that don't ship
        // yet — see `apps/server/src/procedures/obligations/` for
        // the surfaces that exist (`updateStatus`, `markFiledRejected`)
        // and the ones that DON'T (`updateEfileState`,
        // `updatePaymentState`). Until those land, the stage card
        // surfaces sub-status work as MANUAL reminders ("do this
        // offline") rather than as buttons that click into a
        // "pending backend" toast. Where the status-level mutation
        // can still close the workflow (e.g. accepted → mark
        // obligation complete), THAT becomes the wired primary.
        //
        // Payment obligations (status === 'paid') walk the
        // paymentState pipeline; e-file rows walk efileState. Branch
        // on row.status to pick the right vocabulary.
        if (row.status === 'paid') {
          switch (row.paymentState) {
            case 'estimate_needed':
              return [
                {
                  id: 'compute-estimate',
                  label: t`Calculate the tax payment estimate`,
                  flavor: 'manual',
                },
                {
                  id: 'send-estimate',
                  label: t`Send the estimate to client for approval`,
                  flavor: 'manual',
                },
              ]
            case 'client_approval_needed':
              return [
                {
                  id: 'follow-up-approval',
                  label: t`Follow up with client to approve the estimate`,
                  flavor: 'manual',
                },
                {
                  id: 'mark-approved',
                  label: t`Mark client approved the estimate`,
                  flavor: 'manual',
                },
              ]
            case 'scheduled':
              return [
                {
                  id: 'confirm-cleared',
                  label: t`Confirm authority received the payment`,
                  flavor: 'manual',
                },
              ]
            case 'confirmed':
              return [
                {
                  id: 'complete-paid',
                  label: t`Close out this payment`,
                  flavor: 'mutation',
                  primary: true,
                },
              ]
            default:
              return [
                {
                  id: 'schedule',
                  label: t`Schedule the payment with the authority`,
                  flavor: 'manual',
                },
                {
                  id: 'confirm-cleared',
                  label: t`Confirm the payment cleared (offline)`,
                  flavor: 'manual',
                },
              ]
          }
        }
        // e-file pipeline.
        switch (row.efileState) {
          case 'authorization_requested':
            return [
              // P0: both wired now. Primary = advance the pipeline once
              // the client signs; secondary = chase them until they do.
              {
                id: 'mark-signed',
                label: t`Mark 8879 signed`,
                flavor: 'mutation',
                primary: true,
              },
              {
                id: 'remind-8879',
                label: t`Remind client to sign the 8879`,
                flavor: 'mutation',
              },
            ]
          case 'authorization_signed':
          case 'ready_to_submit':
            // Client signed → the next move is to e-file with the
            // authority. Primary, wired action (efileState →
            // `submitted`); the Authority response panel then handles
            // acceptance / rejection.
            return [
              {
                id: 'submit',
                label: t`E-file the return with the tax authority`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'submitted':
            // Acceptance/rejection are captured by the dedicated
            // Authority response panel above this card. Keep the stage
            // detail focused on status chronology so the drawer does
            // not show duplicate decision points.
            return []
          case 'accepted':
            return [
              {
                id: 'deliver',
                label: t`Send the final package to the client`,
                flavor: 'routing',
              },
              {
                id: 'mark-delivered',
                label: t`Mark final package sent when delivered`,
                flavor: 'manual',
              },
              // Skip past the unbacked `final_package_delivered`
              // sub-status; this canonical status advance closes the
              // workflow.
              {
                id: 'complete',
                label: t`Close out this return`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'rejected':
            return [
              {
                id: 'correct',
                label: t`Correct the return for re-submission`,
                flavor: 'manual',
              },
              {
                id: 'resubmit',
                label: t`Re-submit the corrected return to the authority`,
                flavor: 'manual',
              },
              // Unwinding to In review is the canonical wired path
              // when a return is rejected — `markFiledRejected`
              // records the rejection and reopens the row.
              {
                id: 'unwind',
                label: t`Reopen the return for drafting`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'corrected_resubmitted':
            return []
          case 'paper_filed':
            return [
              {
                id: 'deliver-paper',
                label: t`Send the final package to the client`,
                flavor: 'routing',
              },
              {
                id: 'mark-delivered-paper',
                label: t`Mark final package sent when delivered`,
                flavor: 'manual',
              },
              {
                id: 'complete',
                label: t`Mark deadline complete`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          case 'final_package_delivered':
            return [
              {
                id: 'complete',
                label: t`Mark deadline complete`,
                flavor: 'mutation',
                primary: true,
              },
            ]
          default:
            return []
        }
      }
      case 'completed':
        return []
      default:
        return []
    }
  }, [
    stageKey,
    row.status,
    row.prepStage,
    row.efileState,
    row.efileRejectedAt,
    row.paymentState,
    reviewCurrent,
    notesOpen,
    t,
  ])
  const stageEnteredAt =
    stageEvents.length > 0 ? stageEvents[stageEvents.length - 1]!.createdAt : null
  // Past stages — every stage the row visited BEFORE the active one.
  // Collapsed by default; one click reveals the audit events for that
  // stage. The CPA sees the chronology without losing the active-card
  // focus. Single-expand-at-a-time keeps the panel from ballooning.
  const pastEntries = useMemo(() => computePastStageEntries(auditEvents), [auditEvents])
  const [expandedPast, setExpandedPast] = useState<string | null>(null)
  // Label maps for the e-file / payment sub-status pipelines, computed
  // inline so the Lingui macro transforms the t-tags correctly.
  // Same "actor + object" treatment as the review pipeline above.
  // "Ready to submit" → ready to submit *what*? The e-file. "Final
  // package delivered" → delivered *to whom*? The client. Naming the
  // object (the return, the e-file, the package) keeps the CPA
  // anchored on what's actually happening at this step.
  const efilePipelineLabels: Record<(typeof EFILE_PIPELINE_KEYS)[number], string> = {
    authorization_requested: t`8879 sent to client for signature`,
    authorization_signed: t`Client returned signed 8879`,
    ready_to_submit: t`Ready to e-file the return`,
    submitted: t`E-filed — awaiting authority acceptance`,
    accepted: t`Authority accepted the return`,
    final_package_delivered: t`Final package sent to client`,
  }
  const paymentPipelineLabels: Record<(typeof PAYMENT_PIPELINE_KEYS)[number], string> = {
    estimate_needed: t`Calculating tax estimate`,
    client_approval_needed: t`Awaiting client approval of estimate`,
    scheduled: t`Payment scheduled with authority`,
    confirmed: t`Authority confirmed payment cleared`,
  }
  // Step labels stay at the business-workflow altitude. The underlying
  // data still tracks ready_for_prep / prepared / notes_open, but CPAs
  // only need the three decisions they can act on from this card.
  const reviewPipelineLabels: Record<ReviewPipelineKey, string> = {
    preparing_return: t`Preparing return`,
    reviewing_return: t`Reviewing return`,
    ready_to_file: t`Ready to file`,
  }
  // Task click dispatcher. Sub-status mutations (efileState /
  // paymentState / prepStage / reviewStage) don't have RPC procedures
  // yet — those tasks fall through to a toast placeholder. Status-
  // level transitions (review / done / completed) and the special
  // markAccepted / markFiledRejected calls are wired to the
  // mutations the drawer already owns.
  const handleTaskClick = (task: StageTask) => {
    switch (task.id) {
      // Status → review (start work / unpause / unblock / resume)
      // `start` = "Skip ahead to drafting" from Not started. This bypasses
      // the materials collection workflow. Confirm before flipping so a
      // misclick doesn't commit the audit trail to "zero items received."
      case 'start':
        return toast.warning(t`Skip materials collection?`, {
          description: t`Use this only when the client documents are already in hand. The audit trail will show no checklist items were ticked.`,
          action: {
            label: t`Skip to drafting`,
            onClick: () => onChangeStatus('review'),
          },
        })
      case 'resume':
      case 'unblocked':
        return onChangeStatus('review')
      case 'received':
        if (!allReadinessDocsReceived) {
          onChangeTab('readiness')
          if (outstandingDocsCount > 0) {
            return toast.info(t`Materials still outstanding`, {
              description: plural(outstandingDocsCount, {
                one: '# item still needs to be received before moving to In review.',
                other: '# items still need to be received before moving to In review.',
              }),
              action: {
                label: t`Check materials`,
                onClick: () => onChangeTab('readiness'),
              },
            })
          }
          return
        }
        return onChangeStatus('review')
      case 'mark-blocked':
        return onChangeStatus('blocked')
      // Status → waiting_on_client. Also opens the Readiness tab so
      // the CPA can immediately send the document request from the
      // place it actually lives. The status flip happens first; the
      // tab change runs in the same tick so the CPA lands on the
      // Readiness surface with the row already in the Waiting stage.
      case 'request-docs':
        onChangeStatus('waiting_on_client')
        onChangeTab('readiness')
        return
      case 'send-review':
        return onChangePrepStage('prepared')
      case 'approve-return':
        return onChangeReviewStage('approved')
      case 'leave-review-note':
        return onChangeReviewStage('notes_open')
      case 'mark-notes-addressed':
        return onChangeReviewStage('in_review')
      // P0 signature loop (efileState authorization_requested →
      // authorization_signed when the client returns their signed 8879).
      case 'mark-signed':
        return onMarkSigned()
      // P0: email the client a Form 8879 signature reminder.
      case 'remind-8879':
        return onRemindSignature()
      // P0: signed → e-file with the authority (efileState → submitted).
      case 'submit':
        return onSubmitEfile()
      // Status → done (mark filed)
      case 'file':
        return onChangeStatus('done')
      // Done → completed (acceptance verdict variants)
      case 'confirm':
      case 'confirm-default':
      case 'confirm-resubmit':
        return onConfirmAcceptance()
      // Done → review (rejection verdict variants)
      case 'record-rejection':
      case 'unwind':
        return onRecordRejection()
      // Status → completed (terminal advance)
      case 'complete':
      case 'complete-paid':
        return onChangeStatus('completed')
      // Routing: switch tab so the CPA can act on the next surface
      case 'deliver':
      case 'deliver-paper':
      case 'request-auth':
        return onChangeTab('evidence')
      case 'readiness':
        return onChangeTab('readiness')
      // Blocked → open the blocking obligation's drawer. Uses the
      // same ObligationDrawerProvider the queue + client-detail
      // mount, so the navigation matches every other "open this
      // obligation" affordance. If the row carries a blocker ID but
      // the provider isn't mounted for some reason, fall back to
      // the toast so the click isn't silently dropped.
      case 'open-blocker': {
        if (row.blockedByObligationInstanceId) {
          openDrawer(row.blockedByObligationInstanceId)
        } else {
          toast.info(t`This row isn't linked to a blocking deadline.`)
        }
        return
      }
      // Defensive fallback. Earlier this branch absorbed sub-status
      // mutations (mark-signed / submit / mark-approved / etc.) that
      // didn't have RPC procedures yet — those tasks are now
      // declared as `manual` flavor so they render as text reminders
      // and never reach `handleTaskClick`. If we ever reintroduce a
      // wired task without updating this switch, the toast at least
      // tells the user the click registered.
      default:
        return toast.info(t`This action isn't wired up yet.`)
    }
  }
  // Is this Filed (done) AND in the e-file route, vs Filed (paid)
  // AND in the payment route? Both map to the same milestone but
  // walk different sub-status pipelines.
  //
  // 2026-05-24: also require that there's an ACTIVE sub-state before
  // rendering the STEPS list. The drawer was showing a column of 4-6
  // empty/dim sub-steps for a freshly-filed obligation that hadn't
  // entered any e-file or payment sub-stage yet (e.g. a partnership
  // return where status=done but efileState is null). Empty checklist
  // reads as "nothing's happening" — the design (Figma node 109:13725)
  // collapses the stage card to a compact info box in that case.
  const efileStateSet =
    row.efileState !== null && row.efileState !== undefined && row.efileState !== 'not_applicable'
  const paymentStateSet =
    row.paymentState !== null &&
    row.paymentState !== undefined &&
    row.paymentState !== 'not_applicable'
  const showEfilePipeline = stageKey === 'done' && row.status !== 'paid' && efileStateSet
  const showPaymentPipeline = stageKey === 'done' && row.status === 'paid' && paymentStateSet
  // In Review keeps a compact three-state strip. The detailed
  // prepStage/reviewStage values are still useful for audit and undo,
  // but showing all six internal flags made normal rows look more
  // advanced than they really were.
  const showReviewPipeline = stageKey === 'review'
  // 2026-05-26 (Yuqi sixty-seventh pass — structure the OVERDUE
  // signal inside the card): when the active stage is past the
  // firm's internal target date, surface that fact INSIDE the
  // stage card body so a CPA reading "In review" / "Waiting" /
  // "Blocked" sees the missed-deadline context next to the
  // actions, not only on the milestone strip above. Terminal
  // stages (Filed / Completed) don't get the banner — by then
  // the work is closed and "Filed N days late" is the right
  // surface for the lateness story.
  const isPastInternalDue = row.daysUntilDue < 0
  const showOverdueBanner = isPastInternalDue && !TIMELINE_TERMINAL_STAGE_KEYS.has(stageKey)
  const daysPastDeadline = Math.abs(row.daysUntilDue)
  return (
    <section
      aria-label={t`Active stage detail`}
      // 2026-05-26 (Yuqi feedback #10): light tinted background
      // (bg-background-section) instead of pure white. The card was
      // reading as identical to the page surface; a soft tint gives
      // it the "this is the deep-dive zone for the current stage"
      // anchor without going full color.
      // 2026-05-26 (Yuqi feedback — "too many lines going on. please
      // restructure and look at the frontend ensure it is cleanly
      // designed and implemented"): dropped the `border
      // border-divider-subtle` ring. The right panel was stacking
      // four near-rules in close proximity (status-strip bottom
      // border + tab-bar baseline + this card's outline + inner Key
      // dates outline). Keeping just the soft `bg-background-section`
      // tint still anchors this as the "deep-dive zone for the
      // current stage"; the tint vs the panel's white provides the
      // separation without a rule.
      className="rounded-lg bg-background-section p-4"
    >
      {/* Header: stage name + sub-status + when we entered this stage.
          2026-05-23: dropped the uppercase tracking-wider treatment on
          the stage label — at h3 weight it read as a section tag, not
          a heading. Title-case + base text size lets "Waiting" /
          "Blocked" / "In review" read as honest noun phrases, matching
          the milestone strip labels above. Sub-status follows on the
          same line with a thin dot separator. */}
      {/* 2026-05-25 (Yuqi #27): stage label promoted from text-sm
          (14px) to text-base (16px) — it's the h3 of this card and
          was reading as inline chrome at the same size as the rest
          of the body. The sub-status that follows stays at the
          larger size too so the whole line reads as one heading.
          The "Entered DATE" subline stays at text-xs as quiet meta. */}
      {/* 2026-05-27 (Yuqi "onto the same line at Completed, space
          between"): stage label + "Entered DATE" now sit on one
          row with justify-between, the entered date pinned right. */}
      {/* 2026-06-10 (Yuqi #10 — Pencil `iTasJ` eyebrow): the plain stage-label
          heading becomes a canonical status pill + "Stage N of 6" + sub-status,
          matching the design's eyebrow row and reusing ObligationStatusReadBadge
          (the same pill the row + queue use). */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <ObligationStatusReadBadge status={row.status} />
          <span className="text-xs font-medium tabular-nums text-text-tertiary">
            {t`Stage ${stageIdx + 1} of ${TIMELINE_STAGE_KEYS.length}`}
          </span>
          {subStatus ? (
            <>
              <span aria-hidden className="text-xs text-text-tertiary">
                ·
              </span>
              <span className="text-xs font-medium text-text-secondary">{subStatus}</span>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {row.status === 'completed' ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-state-success-solid px-2 py-0.5 text-caption-xs font-medium text-text-inverted"
              title={
                row.efileAcceptedAt
                  ? `${t`Authority accepted the return`} · ${formatDatePretty(row.efileAcceptedAt.slice(0, 10))}`
                  : t`Authority accepted the return`
              }
            >
              <CheckCircle2Icon className="size-3" aria-hidden />
              <Trans>Accepted</Trans>
            </span>
          ) : null}
          {stageEnteredAt ? (
            <p className="text-sm text-text-tertiary">
              <Trans>Entered {formatDatePretty(stageEnteredAt.slice(0, 10))}</Trans>
            </p>
          ) : null}
        </div>
      </header>
      {/* P0: chase visibility on the awaiting-signature card — how long
          since we last nudged the client to sign their 8879. */}
      {row.status === 'done' &&
      row.efileState === 'authorization_requested' &&
      lastSignatureReminderAt ? (
        <p className="text-xs text-text-tertiary">
          {(() => {
            const today = new Date().toISOString().slice(0, 10)
            const days = daysBetween(lastSignatureReminderAt.slice(0, 10), today)
            if (days <= 0) return t`Last reminded today`
            if (days === 1) return t`Last reminded · 1 day ago`
            return t`Last reminded · ${days} days ago`
          })()}
        </p>
      ) : null}

      {/* 2026-05-26 (Yuqi sixty-seventh pass — overdue context):
          the milestone strip's red "Past deadline" word answers "is
          this late?" but the stage card below was silent on the
          fact, so a CPA scanning the card had to infer urgency
          from the strip. The banner ties the stage back to the
          missed date with a real noun ("Filing was due …") and a
          concrete days-late count + the two actionable verbs
          (submit, file an extension). On terminal stages the
          banner hides — once the work is closed, late-vs-on-time
          is a quality stat, not a call-to-action. */}
      {showOverdueBanner ? (
        // 2026-05-26 (Yuqi drawer feedback — "too much red"): the
        // filled red bg made the banner the loudest element on the
        // panel, even after demoting the tile + caption. Switched to
        // a neutral surface with the red AlertTriangle + red title
        // line carrying the urgency cue; the action line drops to
        // text-secondary so the eye lands on the urgent line first
        // and the "what to do" reads as a calmer follow-up.
        <div role="status" className="flex flex-col gap-0.5 leading-snug">
          {/* 2026-06-10 (Yuqi "work on the detail page" — Qn4nX active card):
              the overdue context reads as the active-stage headline + sub (like
              the canonical "8 materials still outstanding." treatment), not a
              white-on-white boxed callout inside the white WorkflowMilestoneCard. */}
          <p className="text-[16px] font-semibold tracking-[-0.2px] text-text-primary">
            <Trans>
              Filing was due {formatDatePretty(row.currentDueDate.slice(0, 10))} —{' '}
              <Plural value={daysPastDeadline} one="# day" other="# days" /> past deadline.
            </Trans>
          </p>
          <p className="text-xs text-text-tertiary">
            <Trans>Submit the return now, or file an extension if eligible.</Trans>
          </p>
        </div>
      ) : null}

      {/* Stage-specific context. Each branch surfaces the info the
          CPA actually needs to act on this stage without leaving the
          drawer (per docs/Design/deadline-status-meaning-and-journey-2026-05-23.md):
            - Blocked → WHICH upstream obligation is blocking (form +
              client + due + status, clickable into the blocker's
              drawer).
            - Waiting → outstanding documents count + first few items
              so the CPA knows what they're waiting on without
              switching to the Readiness tab.
          The other stages either have their info already (e-file /
          payment pipelines) or land in P1 (In Review pipeline,
          Completed summary). */}
      {stageKey === 'blocked' && row.blockedByObligationInstanceId ? (
        <div className="mt-3">
          <BlockerContextCard
            blockerId={row.blockedByObligationInstanceId}
            onOpen={(id) => openDrawer(id)}
          />
        </div>
      ) : null}
      {/* Auto-unblock context — when the row is Not started because a
          parent cascade just cleared it, surface the why so the
          assignee knows the row moved on its own. Banner is durable
          (not a toast) because the user may land on the row days
          later. Disappears as soon as any subsequent status change
          happens (then the banner is no longer the latest signal). */}
      {stageKey === 'pending'
        ? (() => {
            const autoUnblockEvent = auditEvents.find(
              (event) => event.action === 'obligation.status.auto_unblocked',
            )
            const latestStatusEvent = auditEvents.find(
              (event) =>
                event.action === 'obligation.status.updated' ||
                event.action === 'obligation.status.auto_unblocked',
            )
            if (
              !autoUnblockEvent ||
              !latestStatusEvent ||
              latestStatusEvent.id !== autoUnblockEvent.id
            ) {
              return null
            }
            return (
              <div className="mt-3 rounded-lg border border-divider-subtle bg-background-subtle px-3 py-2 text-xs leading-snug text-text-secondary">
                <Trans>
                  Resumed from blocked on{' '}
                  {formatDatePretty(autoUnblockEvent.createdAt.slice(0, 10))} after the upstream
                  deadline was completed.
                </Trans>
              </div>
            )
          })()
        : null}
      {/* 2026-05-23 Option D: the WaitingOutstandingDocs panel
          (count header + bullet list of doc names) was retired here —
          that data lives on the Materials tab, not duplicated in the
          stage card. The card carries a one-line signal instead:
          "N items outstanding · Check Materials →". Single-line, no
          list, no panel chrome. The CPA who needs the actual document
          inventory clicks through.

          Verb 2026-05-23 (pass 2): "Open Materials" → "Check
          Materials". "Open" reads as "open the tab"; "Check" reads as
          "go review what's outstanding" — the CPA's actual intent
          when the count is non-zero. */}
      {isWaitingDocsCase && readinessCounts.total > 0 ? (
        // Pencil `X3lBEt` (Qn4nX) ActiveStageCard "Left": headline +
        // big mono received count + received/outstanding/waived legend chips
        // + a thin green segment bar, with the "Check materials" affordance
        // below. Real counts from the checklist (no fiction).
        <div className="mt-3 flex flex-col gap-2.5">
          {/* Headline — 18/600/-0.4, the canonical "N materials still
              outstanding." treatment. Names the live blocker count, not
              a generic label. Falls back to a "received" framing once the
              outstanding count hits zero so the line stays honest. */}
          <p className="text-[18px] leading-snug font-semibold tracking-[-0.4px] text-text-primary">
            {readinessCounts.outstanding > 0 ? (
              <Plural
                value={readinessCounts.outstanding}
                one="# material still outstanding."
                other="# materials still outstanding."
              />
            ) : (
              <Trans>All materials are in.</Trans>
            )}
          </p>
          <div className="flex items-end gap-2.5">
            <span className="font-mono text-[30px] leading-none font-bold tracking-[-0.6px] text-text-primary tabular-nums">
              {readinessCounts.received}
            </span>
            <span className="text-xs leading-tight font-medium text-text-tertiary">
              {t`of ${readinessCounts.total} materials`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              {
                key: 'received',
                count: readinessCounts.received,
                label: t`received`,
                dot: 'bg-state-success-solid',
                muted: false,
              },
              {
                key: 'outstanding',
                count: readinessCounts.outstanding,
                label: t`outstanding`,
                dot: 'bg-state-destructive-solid',
                muted: false,
              },
              {
                key: 'waived',
                count: readinessCounts.waived,
                label: t`waived`,
                dot: 'bg-text-muted',
                muted: true,
              },
            ].map((chip) => (
              <span
                key={chip.key}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full bg-background-section px-2 py-0.5 text-[10px] font-semibold',
                  chip.muted ? 'text-text-tertiary' : 'text-text-secondary',
                )}
              >
                <span className={cn('size-[5px] shrink-0 rounded-full', chip.dot)} aria-hidden />
                <span className="tabular-nums">{chip.count}</span> {chip.label}
              </span>
            ))}
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-divider-subtle">
            <div
              className="h-full rounded-full bg-state-success-solid transition-all"
              style={{
                width: `${Math.round((readinessCounts.received / readinessCounts.total) * 100)}%`,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => onChangeTab('readiness')}
            className="-mx-1 flex w-fit cursor-pointer items-center gap-1 rounded-lg px-1 py-0.5 text-left text-xs text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            aria-label={t`Check Materials to review ${readinessCounts.outstanding} outstanding items`}
          >
            <Trans>Check materials</Trans>
            <ArrowUpRightIcon className="size-3" aria-hidden />
          </button>
        </div>
      ) : null}
      {isWaitingDocsCase && outstandingItems.length > 0 ? (
        // Pencil `c2l347` NextMovePanel — a compact "BLOCKING" section naming the
        // top outstanding materials with a red/orange status dot, behind a
        // top-border separator (matches the Pencil). It NAMES the blockers
        // (additive over the counts above); the single action stays the
        // "Check materials" link — separate visualization from action.
        <div className="mt-3 flex flex-col gap-1.5 border-t border-divider-subtle pt-3">
          <p className="text-caption-xs font-bold uppercase tracking-[0.8px] text-text-tertiary">
            <Trans>Blocking</Trans>
          </p>
          <ul className="flex flex-col">
            {outstandingItems.slice(0, 2).map((item, idx) => (
              <li key={item.id} className="flex items-center gap-3 py-1.5">
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    idx === 0 ? 'bg-state-destructive-solid' : 'bg-state-warning-solid',
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-base text-text-secondary">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          {outstandingItems.length > 2 ? (
            <p className="text-xs text-text-tertiary">
              {t`+${outstandingItems.length - 2} more outstanding`}
            </p>
          ) : null}
        </div>
      ) : null}
      {stageKey === 'completed' ? (
        <div className="mt-3">
          <CompletedKeyDates row={row} auditEvents={auditEvents} />
        </div>
      ) : null}

      {/* Steps within the current stage — vertical list of every
          canonical sub-status. Done steps render with a green check,
          the current step gets an accent dot + bold label + its task
          list indented beneath, and upcoming steps render as quiet
          empty circles. "Steps" (not "Pipeline") because CPAs say
          "what step am I on?" — pipeline reads as engineering jargon. */}
      {/* 2026-05-25 (Yuqi #28, #29): Steps eyebrow was
          text-caption-xs (10px) — sub-visible against the rest of
          the card. Promoted to text-caption (11px) matching the
          "Entered DATE" subline, so the eyebrow + the entered-date
          line read at the same scale. Step list items inside ride
          on text-sm so they're a clear tier below the stage h3
          but legibly above the eyebrow. */}
      {showEfilePipeline || showPaymentPipeline ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Steps</Trans>
          </p>
          <ul className="flex flex-col gap-1.5">
            {(showEfilePipeline ? EFILE_PIPELINE_KEYS : PAYMENT_PIPELINE_KEYS).map((key) => {
              // The 4 casts in this block (key + row state, repeated for
              // efile/payment branches) are runtime-correlated with
              // `showEfilePipeline` by construction: when true the keys
              // came from EFILE_PIPELINE_KEYS and `row.efileState` is the
              // relevant column; when false the payment-side equivalents
              // apply. TypeScript can't track the correlation through the
              // ternary, but the existing call shape is safe — the lint
              // suppressions match the runtime-safe pattern used elsewhere
              // in this file.
              const state = showEfilePipeline
                ? pipelineStateOf(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- key correlated with showEfilePipeline
                    key as (typeof EFILE_PIPELINE_KEYS)[number],
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- row.efileState is the matching column
                    row.efileState as (typeof EFILE_PIPELINE_KEYS)[number] | null | undefined,
                    EFILE_PIPELINE_KEYS,
                  )
                : pipelineStateOf(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- key correlated with showEfilePipeline
                    key as (typeof PAYMENT_PIPELINE_KEYS)[number],
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- row.paymentState is the matching column
                    row.paymentState as (typeof PAYMENT_PIPELINE_KEYS)[number] | null | undefined,
                    PAYMENT_PIPELINE_KEYS,
                  )
              // `key` is iterated from EFILE_PIPELINE_KEYS or PAYMENT_PIPELINE_KEYS
              // depending on `showEfilePipeline` — same correlation already
              // applied at the `pipelineStateOf` calls above. The cast is
              // runtime-safe by construction; lint can't prove the ternary
              // correlation so we suppress the same way as the adjacent
              // pipelineStateOf args.
              const label = showEfilePipeline
                ? // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- key correlated with showEfilePipeline
                  efilePipelineLabels[key as (typeof EFILE_PIPELINE_KEYS)[number]]
                : // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- key correlated with showEfilePipeline
                  paymentPipelineLabels[key as (typeof PAYMENT_PIPELINE_KEYS)[number]]
              return (
                <li key={key} className="flex flex-col">
                  <div className="flex items-start gap-2 text-sm">
                    {state === 'done' ? (
                      <CheckCircle2Icon
                        className="mt-0.5 size-3.5 shrink-0 text-state-success-solid"
                        aria-hidden
                      />
                    ) : state === 'current' ? (
                      // 2026-05-26 (Yuqi sixty-seventh pass — "looks
                      // like radio checkbox"): replaced the ring +
                      // inner-dot construction with a solid filled
                      // disc. The previous shape was a textbook
                      // selected-radio (border-2 ring around inner
                      // dot) — readers tried to click it expecting a
                      // form input. The new solid bullet reads as a
                      // status marker, not an interactive choice.
                      <span
                        aria-hidden
                        className="mt-1 size-2.5 shrink-0 rounded-full bg-accent-default"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="mt-0.5 inline-block size-3.5 shrink-0 rounded-full border border-divider-regular bg-background-default"
                      />
                    )}
                    <span
                      className={cn(
                        'flex-1 leading-snug',
                        state === 'done'
                          ? 'text-text-tertiary'
                          : state === 'current'
                            ? 'font-medium text-text-primary'
                            : 'text-text-tertiary opacity-70',
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {/* Actions ONLY under the current step. Primary
                      mutation becomes a solid button; secondary
                      options become ghost text-links; manual
                      reminders collapse to one tertiary text line. */}
                  {state === 'current' && tasks.length > 0 ? (
                    <div className="ml-3 mt-2 mb-2">
                      <StageActions tasks={tasks} onTaskClick={handleTaskClick} />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : showReviewPipeline ? (
        /* In Review workflow — compact progress only. The old slider
           exposed implementation flags and made default rows look too
           far along. Keep actions on the current step, while the
           steps themselves stay as status markers. */
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Steps</Trans>
          </p>
          <ul className="flex flex-col gap-1.5">
            {REVIEW_PIPELINE_KEYS.map((key) => {
              const state = pipelineStateOf(key, reviewCurrent, REVIEW_PIPELINE_KEYS)
              const label = reviewPipelineLabels[key]
              const showNotesOpen = state === 'current' && key === 'reviewing_return' && notesOpen
              return (
                <li key={key} className="flex flex-col">
                  <div className="flex items-start gap-2 text-sm">
                    {state === 'done' ? (
                      <CheckCircle2Icon
                        className="mt-0.5 size-3.5 shrink-0 text-state-success-solid"
                        aria-hidden
                      />
                    ) : state === 'current' ? (
                      // 2026-05-26 (Yuqi sixty-seventh pass — "looks
                      // like radio checkbox"): replaced the ring +
                      // inner-dot construction with a solid filled
                      // disc. The previous shape was a textbook
                      // selected-radio (border-2 ring around inner
                      // dot) — readers tried to click it expecting a
                      // form input. The new solid bullet reads as a
                      // status marker, not an interactive choice.
                      <span
                        aria-hidden
                        className="mt-1 size-2.5 shrink-0 rounded-full bg-accent-default"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="mt-0.5 inline-block size-3.5 shrink-0 rounded-full border border-divider-regular bg-background-default"
                      />
                    )}
                    <span
                      className={cn(
                        'flex-1 leading-snug',
                        state === 'done'
                          ? 'text-text-tertiary'
                          : state === 'current'
                            ? 'font-medium text-text-primary'
                            : 'text-text-tertiary opacity-70',
                      )}
                    >
                      {label}
                      {showNotesOpen ? (
                        <span className="ml-1.5 text-caption-xs font-medium uppercase tracking-wide text-text-warning">
                          · <Trans>Notes open</Trans>
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {state === 'current' && tasks.length > 0 ? (
                    <div className="ml-3 mt-2 mb-2">
                      <StageActions tasks={tasks} onTaskClick={handleTaskClick} />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : tasks.length > 0 ? (
        /* Non-pipeline stages (Not started / Waiting / Blocked /
           Completed) — no pipeline strip, just the action surface.
           Primary button + secondary ghost links + manual reminders
           inline. No "What's next" eyebrow because the button is
           self-evident as the next action. */
        <div className="mt-3">
          <StageActions tasks={tasks} onTaskClick={handleTaskClick} />
        </div>
      ) : null}

      {/* Done this stage: audit events whose afterJson.status maps to
          the current stage. Shows the recent chronology so the CPA can
          see HOW the row landed here without leaving the panel. */}
      {stageEvents.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-divider-subtle pt-3">
          <p className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Done this stage</Trans>
          </p>
          <ul className="flex flex-col gap-1.5">
            {stageEvents.map((event) => (
              <li key={event.id} className="flex items-start gap-2 text-xs">
                <CheckCircle2Icon
                  className="mt-0.5 size-3.5 shrink-0 text-state-success-solid"
                  aria-hidden
                />
                <span className="flex-1 leading-snug text-text-secondary">
                  {humanizeAuditAction(event.action)}
                  {event.actorLabel ? (
                    <span className="text-text-tertiary"> · {event.actorLabel}</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-text-tertiary">
                  {formatDate(event.createdAt.slice(0, 10))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Previous stages — every stage the row passed through before
          landing on the active one. Collapsed by default so the card
          stays quiet; each row expands individually to show that
          stage's audit chronology. Answers "how did we get here?"
          without taking up vertical space when the CPA only cares
          about what's happening now. */}
      {pastEntries.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-divider-subtle pt-3">
          <p className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>Previous stages</Trans> · {pastEntries.length}
          </p>
          <ul className="flex flex-col gap-0.5">
            {pastEntries.map((entry, index) => {
              const entryKey = `${entry.stageKey}:${entry.entryAt}:${entry.exitAt}:${index}`
              const open = expandedPast === entryKey
              const days = daysBetween(entry.entryAt, entry.exitAt)
              return (
                <li key={entryKey} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setExpandedPast(open ? null : entryKey)}
                    aria-expanded={open}
                    className="-mx-1 flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-left text-xs outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                  >
                    <ChevronRightIcon
                      className={cn(
                        'size-3 shrink-0 text-text-tertiary transition-transform',
                        open && 'rotate-90',
                      )}
                      aria-hidden
                    />
                    <CheckCircle2Icon
                      className="size-3.5 shrink-0 text-state-success-solid"
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-text-secondary">
                      {stageLabels[entry.stageKey]}
                    </span>
                    <span className="shrink-0 tabular-nums text-text-tertiary">
                      {days === 0 ? (
                        <Trans>same day</Trans>
                      ) : (
                        <Plural value={days} one="# day" other="# days" />
                      )}
                    </span>
                  </button>
                  {open ? (
                    <ul className="ml-7 mt-1 mb-1 flex flex-col gap-1 border-l border-divider-subtle pl-3">
                      {entry.events.map((event) => (
                        <li key={event.id} className="flex items-start gap-2 text-xs">
                          <span className="flex-1 leading-snug text-text-secondary">
                            {humanizeAuditAction(event.action)}
                            {event.actorLabel ? (
                              <span className="text-text-tertiary"> · {event.actorLabel}</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 tabular-nums text-text-tertiary">
                            {formatDate(event.createdAt.slice(0, 10))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

// Lifecycle status → timeline-stage index (0-5). Maps the full 10-state
// `ObligationStatus` palette to the 6-stage milestone strip:
//   pending / not_applicable → 0 (Not started)
//   waiting_on_client        → 1 (Waiting)
//   blocked                  → 2 (Blocked)
//   in_progress / review / extended → 3 (In review)
//   done / paid              → 4 (Filed)
//   completed                → 5 (Completed)
// Sub-status annotation for the active milestone. Reads existing
// schema fields (prepStage / reviewStage / efileState) — no new
// columns. Each lifecycle status has its own "what specifically is
// happening here" follow-up vocabulary; surfacing it on the timeline
// turns "In review" into "In review · Partner sign-off" so a senior
// CPA knows whether to escalate or wait.
