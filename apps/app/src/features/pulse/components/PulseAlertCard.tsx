import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { StateBadge } from '@/components/primitives/state-badge'

import { PulseConfidenceBadge } from './PulseConfidenceBadge'
import { PulseSourceBadge } from './PulseSourceBadge'
import { PulseSourceStatusBadge } from './PulseSourceStatusBadge'

interface PulseAlertCardProps {
  alert: PulseAlertPublic
  onReview: () => void
  onDismiss?: (() => void) | undefined
  onSnooze?: (() => void) | undefined
  /** Inline actions are hidden when the card is rendered as a folded "more" entry. */
  compact?: boolean
}

// Single Pulse alert row used by /rules/pulse (Alerts).
//
// 2026-05-25 (Yuqi Alerts #4, #5, #6, #11):
//   • Dropped the leading PulsingDot. Yuqi flagged repeatedly that
//     the coloured dots don't communicate meaning to a CPA — the
//     status badge ("New"/"Applied"/"Snoozed"), confidence badge
//     ("AI 46%" with destructive tone for very-low), and the change-
//     kind label already carry every signal the dot was trying to
//     encode.
//   • Leading StateBadge so the jurisdiction (CA / TX / FL) reads
//     at a glance — same recognition the chip strip above uses.
//   • Added `alert.summary` as a body line under the title. The
//     model's one-sentence explanation of the source change ("AI
//     explains what is happening" per Yuqi #6) lets the CPA decide
//     whether to open the drawer without reading the title back to
//     themselves.
//   • PulseSourceBadge promoted from the footer to the header next
//     to the source name. It's already a real link to the official
//     source — promoting it lets the CPA jump out to the source
//     without opening the drawer (Yuqi #6).
//   • Dropped the separate "Low AI confidence" warning line. The
//     PulseConfidenceBadge already renders in the destructive tone
//     when confidence < 0.7; doubling the cue was redundant (Yuqi
//     #11). The drawer still surfaces the explicit one-paragraph
//     warning + reason copy.
export function PulseAlertCard({
  alert,
  onReview,
  onDismiss,
  onSnooze,
  compact = false,
}: PulseAlertCardProps) {
  const { t } = useLingui()
  const impacted = alert.matchedCount + alert.needsReviewCount

  // 2026-05-25 (Yuqi Alerts third pass — second-batch #1, #2):
  //   • Dropped the `breathing` background tint entirely. The amber
  //     12% color-mix rendered as a pinkish-red wash on the top
  //     actionable row — Yuqi: "为什么是浅红的？". Position alone
  //     (top of the list) is sufficient priority signaling; the
  //     extra wash was over-shouting.
  //   • Restructured as a flex-row: content stack on the left
  //     (flex-1), action column on the right. Yuqi: "action 应该
  //     放在右边。内容在左边". Reads like a GitHub PR row — the
  //     subject takes the width it needs, decisions live in the
  //     trailing edge column.
  return (
    <article
      role="region"
      aria-label={t`Pulse alert: ${alert.title}`}
      className={cn(
        'flex items-start gap-4 rounded-md border border-divider-subtle bg-background-default p-3 transition-colors hover:border-divider-regular',
        compact && 'p-2.5',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Title row: state mark + dominant h3 + trailing chips. The
            h3 fills the available width so even long titles line-clamp
            gracefully without compressing the trailing badges. */}
        <header className="flex items-center gap-2">
          <StateBadge code={alert.jurisdiction} size="xs" aria-hidden />
          <h3
            className="min-w-0 flex-1 truncate text-md font-semibold text-text-primary"
            title={alert.title}
          >
            {alert.title}
          </h3>
          <Badge variant="outline" className="hidden shrink-0 text-caption sm:inline-flex">
            {changeKindLabel(alert.changeKind)}
          </Badge>
          <PulseConfidenceBadge confidence={alert.confidence} />
          <PulseSourceStatusBadge status={alert.sourceStatus} />
        </header>

        {/* Source line — moved out of the title row. The badge wraps
            an `<a target="_blank">` so the CPA can open the official
            source from this row without touching the drawer (Yuqi
            Alerts #6). */}
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <PulseSourceBadge source={alert.source} sourceUrl={alert.sourceUrl} />
        </div>

        {/* AI summary — only render when meaningfully different from
            the title. */}
        {alert.summary && alert.summary.trim() !== alert.title.trim() ? (
          <p className="line-clamp-2 text-sm text-text-secondary">{alert.summary}</p>
        ) : null}

        {/* Impact line — count + need-review tail. */}
        {alert.actionMode === 'review_only' ? (
          <p className="text-sm italic text-text-tertiary">
            <Trans>Review-only source change. No due-date overlay will be applied.</Trans>
          </p>
        ) : impacted === 0 ? (
          <p className="text-sm italic text-text-tertiary">
            <Trans>No matching clients in this practice.</Trans>
          </p>
        ) : (
          <p className="text-sm text-text-tertiary">
            <span className="font-medium tabular-nums text-text-primary">
              <Plural value={impacted} one="# client" other="# clients" />
            </span>{' '}
            <Trans>may be affected.</Trans>
            {alert.needsReviewCount > 0 ? (
              <>
                <span aria-hidden> · </span>
                <span className="tabular-nums">
                  <Trans>{alert.needsReviewCount} need review</Trans>
                </span>
              </>
            ) : null}
          </p>
        )}
      </div>

      {compact ? null : (
        // Action column — vertical stack on the right edge.
        // Canonical order: Snooze (softer secondary) → Dismiss
        // (destructive-ish secondary) → Review (primary, bottommost
        // so it sits closest to the impact line above). Both Snooze
        // and Dismiss are audit-logged and require a reason — the
        // parent owns the prompt. Snooze/Dismiss only render for
        // `status === 'matched'` (open alerts); on terminal states
        // the parent omits the handlers, and the action column
        // collapses to just Review — same canonical "this alert
        // is closed" signal as before, just expressed by absence in
        // a stacked column rather than a row.
        <div className="flex shrink-0 flex-col items-stretch gap-1">
          {onSnooze ? (
            <Button variant="ghost" size="sm" onClick={onSnooze}>
              <Trans>Snooze</Trans>
            </Button>
          ) : null}
          {onDismiss ? (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <Trans>Dismiss</Trans>
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={onReview}
            title={
              onSnooze || onDismiss
                ? t`Open the alert drawer`
                : t`Open the closed-alert drawer (read-only)`
            }
          >
            <Trans>Review</Trans>
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      )}
    </article>
  )
}

// 2026-05-25 (Yuqi Alerts #8): the chip labels were single nouns
// ("Scope", "Form", "Deadline") that don't tell the CPA what
// ACTUALLY changed. Renamed to verb-phrase or noun-phrase forms
// that name the thing AND say it shifted: "Deadline shifted",
// "Scope narrowed", "Form updated", etc. Reads as a sentence
// fragment from a hover sweep.
function changeKindLabel(kind: PulseAlertPublic['changeKind']) {
  switch (kind) {
    case 'deadline_shift':
      return <Trans>Deadline shifted</Trans>
    case 'filing_requirement':
      return <Trans>Filing rule changed</Trans>
    case 'applicability_scope':
      return <Trans>Scope changed</Trans>
    case 'form_instruction':
      return <Trans>Form updated</Trans>
    case 'source_status':
      return <Trans>Source status</Trans>
    case 'new_obligation':
      return <Trans>New rule added</Trans>
    case 'other':
      return <Trans>Other change</Trans>
  }
  return kind
}
