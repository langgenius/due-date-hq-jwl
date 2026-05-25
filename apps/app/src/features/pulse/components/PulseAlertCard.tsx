import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { StateBadge } from '@/components/primitives/state-badge'

import { usePulseDetailQueryOptions } from '../api'
import { PulseConfidenceBadge } from './PulseConfidenceBadge'
import { PulseSourceBadge } from './PulseSourceBadge'
import { PulseSourceStatusBadge } from './PulseSourceStatusBadge'

const VISIBLE_CLIENT_NAMES = 3

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

  // 2026-05-25 (Yuqi /rules/pulse fourth pass #2): pull the actual
  // affected-client names from the detail query so the card can
  // LIST them instead of just showing a "5 clients may be affected"
  // summary. The list page mounts a card per alert; the detail
  // query is cached per-alert so this is essentially free after
  // the first render. Same hook the dashboard NeedsAttentionCard
  // uses — kept inline here so the two card variants don't share
  // a single hook with diverging needs (drawer renders names
  // separately).
  const affectedClientsQuery = useQuery(usePulseDetailQueryOptions(alert.id))
  const allAffectedNames = affectedClientsQuery.data?.affectedClients ?? []
  const uniqueNames: string[] = []
  const seen = new Set<string>()
  for (const row of allAffectedNames) {
    if (!seen.has(row.clientName)) {
      seen.add(row.clientName)
      uniqueNames.push(row.clientName)
    }
  }
  const visibleNames = uniqueNames.slice(0, VISIBLE_CLIENT_NAMES)
  const overflowNames = Math.max(uniqueNames.length - visibleNames.length, 0)

  // 2026-05-25 (Yuqi /rules/pulse fourth pass — #3, #4, #8):
  //   • #3: Review button moves from a bottom-of-action-column slot
  //     to the very TOP of the action column so it's always at the
  //     same vertical anchor across cards. Snooze/Dismiss render
  //     below it as the softer secondary affordances.
  //   • #4: outer gap between content + action columns bumped
  //     gap-4 → gap-6 — Yuqi flagged the two halves as crowded.
  //   • #8: card chrome restyled — border dropped entirely, light
  //     gray bg (bg-background-subtle) replaces the white panel.
  //     Reads as a "soft card on the page surface" instead of a
  //     bordered tile. Hover lifts to bg-state-base-hover so the
  //     interactive cue still lands.
  return (
    <article
      role="region"
      aria-label={t`Pulse alert: ${alert.title}`}
      className={cn(
        'flex items-start gap-6 rounded-md bg-background-subtle p-3 transition-colors hover:bg-state-base-hover',
        compact && 'p-2.5',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Title row: state mark + dominant h3 + (Yuqi /rules/pulse
            fourth pass #5) trailing source badge so the
            jurisdiction reads first, the title sits in the middle,
            and the source ("IRS" / "NY DTF" / …) anchors the end
            of the headline as a meta tag. Confidence + status chips
            still trail after the source. */}
        <header className="flex items-center gap-2">
          <StateBadge code={alert.jurisdiction} size="xs" aria-hidden />
          <h3
            className="min-w-0 flex-1 truncate text-md font-semibold text-text-primary"
            title={alert.title}
          >
            {alert.title}
          </h3>
          <PulseSourceBadge source={alert.source} sourceUrl={alert.sourceUrl} />
          <Badge variant="outline" className="hidden shrink-0 text-caption sm:inline-flex">
            {changeKindLabel(alert.changeKind)}
          </Badge>
          <PulseConfidenceBadge confidence={alert.confidence} />
          <PulseSourceStatusBadge status={alert.sourceStatus} />
        </header>

        {/* AI summary — only render when meaningfully different from
            the title. */}
        {alert.summary && alert.summary.trim() !== alert.title.trim() ? (
          <p className="line-clamp-2 text-sm text-text-secondary">{alert.summary}</p>
        ) : null}

        {/* 2026-05-25 (Yuqi /rules/pulse fourth pass #2): impact
            line now LISTS the affected client names instead of
            collapsing them to a count. Up to 3 names render as
            chips inline; the tail folds to `+N more` so long
            client lists don't blow up the card. The needs-review
            count + "may be affected" framing live on a trailing
            meta line below. Falls back to the old count-only
            rendering for terminal/review-only alerts where the
            client list isn't useful. */}
        {alert.actionMode === 'review_only' ? (
          <p className="text-sm italic text-text-tertiary">
            <Trans>Review-only source change. No due-date overlay will be applied.</Trans>
          </p>
        ) : impacted === 0 ? (
          <p className="text-sm italic text-text-tertiary">
            <Trans>No matching clients in this practice.</Trans>
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {visibleNames.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-1.5">
                {visibleNames.map((name) => (
                  <li
                    key={name}
                    className="inline-flex rounded-sm border border-divider-subtle bg-background-default px-2 py-0.5 text-xs text-text-secondary"
                    title={name}
                  >
                    {name}
                  </li>
                ))}
                {overflowNames > 0 ? (
                  <li className="inline-flex text-xs text-text-tertiary">+{overflowNames} more</li>
                ) : null}
              </ul>
            ) : null}
            <p className="text-xs text-text-tertiary">
              {impacted === 1 ? (
                <Trans>1 client may be affected.</Trans>
              ) : (
                <Trans>{impacted} clients may be affected.</Trans>
              )}
              {alert.needsReviewCount > 0 ? (
                <>
                  <span aria-hidden> · </span>
                  <span className="tabular-nums">
                    <Trans>{alert.needsReviewCount} need review</Trans>
                  </span>
                </>
              ) : null}
            </p>
          </div>
        )}
      </div>

      {compact ? null : (
        // Action column — Review is ALWAYS at the TOP (Yuqi /rules/
        // pulse fourth pass #3) so the eye finds the primary
        // affordance in the same place across cards. Snooze /
        // Dismiss follow as quiet ghost siblings when the parent
        // wires them; terminal-state alerts (where snooze/dismiss
        // are omitted) just show the lone Review button.
        <div className="flex shrink-0 flex-col items-stretch gap-1">
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
