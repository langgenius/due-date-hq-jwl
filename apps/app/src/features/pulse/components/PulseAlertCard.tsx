import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { BriefcaseIcon, MoreHorizontal } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { cn } from '@duedatehq/ui/lib/utils'

import { LowConfidenceBadge } from '@/components/primitives/low-confidence-badge'
import { StateBadge } from '@/components/primitives/state-badge'

import { usePulseDetailQueryOptions } from '../api'
import { PulseSourceBadge } from './PulseSourceBadge'
import { PulseSourceStatusBadge } from './PulseSourceStatusBadge'
import { PulseStatusBadge } from './PulseStatusBadge'

const VISIBLE_CLIENT_NAMES = 3

interface PulseAlertCardProps {
  alert: PulseAlertPublic
  onReview: () => void
  onDismiss?: (() => void) | undefined
  onSnooze?: (() => void) | undefined
  /** Inline actions are hidden when the card is rendered as a folded "more" entry. */
  compact?: boolean
  /**
   * 2026-05-26 (Yuqi /rules/pulse #4): when this card is the one
   * currently being viewed in the right-hand panel, render a left
   * border + brighter background so the user can quickly find the
   * active row in the list. Parent (AlertsListPage) passes
   * `active={alert.id === openAlertId}`.
   */
  active?: boolean
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
  active = false,
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
  // 2026-05-26 (Yuqi /rules/pulse follow-up #10): 3-tier qualitative
  // confidence (LOW / MEDIUM / HIGH) instead of numeric AI XX%.
  // Card background tone follows the level: LOW gets the destructive
  // tint (review urgency), MEDIUM gets a faint warning tint, HIGH
  // stays clean. Thresholds match the existing PulseConfidenceBadge
  // tone breaks: < 0.5 LOW, 0.5–0.85 MEDIUM, ≥ 0.85 HIGH.
  const confidenceLevel: 'low' | 'medium' | 'high' =
    alert.confidence < 0.5 ? 'low' : alert.confidence < 0.85 ? 'medium' : 'high'
  const lowConfidence = confidenceLevel === 'low'
  const mediumConfidence = confidenceLevel === 'medium'

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
  // 2026-05-26 (Yuqi /rules/pulse #12): card bg picks up a faint
  // destructive tint when AI confidence is very low so the CPA's
  // eye lands on those rows first. Same tone family as the
  // LowConfidenceBadge that replaces the numeric confidence pill.
  // 2026-05-26 (Yuqi /rules/pulse #1): the whole article is now
  // clickable — onClick fires onReview, so the entire row opens
  // the detail panel. The interior Review/Snooze/Dismiss buttons
  // still work as primary affordances and stopPropagation so
  // their own handlers run (snooze/dismiss diverge from review).
  // Keyboard a11y: role="button" + tabIndex + Enter/Space handler.
  // 2026-05-26 (Yuqi /rules/pulse #4): when `active`, the card
  // shows a left accent border + brighter bg so the CPA can find
  // the alert currently displayed in the right panel without
  // re-scanning every row.
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onReview()
    }
  }
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={t`Pulse alert: ${alert.title}`}
      aria-pressed={active}
      onClick={onReview}
      onKeyDown={handleCardKeyDown}
      className={cn(
        'group/alert-card flex cursor-pointer items-start gap-6 rounded-md p-3 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        active
          ? 'border-l-2 border-state-accent-solid bg-state-accent-hover-alt pl-[10px]'
          : lowConfidence
            ? 'bg-state-destructive-hover/30 hover:bg-state-destructive-hover/40'
            : mediumConfidence
              ? 'bg-state-warning-hover/20 hover:bg-state-warning-hover/30'
              : 'bg-background-subtle hover:bg-state-base-hover',
        compact && 'p-2.5',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Title row: state mark + abbreviation + dominant h3 +
            (Yuqi /rules/pulse fourth pass #5) trailing source badge
            so the jurisdiction reads first, the title sits in the
            middle, and the source ("IRS" / "NY DTF" / …) anchors
            the end of the headline. Confidence + change-kind meta
            below the title now (Yuqi /rules/pulse #12).
            2026-05-26 (Yuqi /rules/pulse #1): added the 2-letter
            state abbreviation text next to the StateBadge so the
            jurisdiction reads textually too — the SVG flag mark
            alone is recognizable but not always scannable.
            2026-05-26 (Yuqi /rules/pulse #6): h3 stepped up
            text-md → text-lg so the title sits clearly as the
            row's anchor. */}
        {/* 2026-05-26 (Yuqi /rules/pulse #7): PulseStatusBadge
            (renders "New" with the Spotlight icon for matched
            alerts, otherwise the terminal-state label like
            "Applied" / "Snoozed") now appears in the card header
            row. Previously only visible in the drawer; the card
            list had no way to differentiate untouched alerts
            from ones that were already actioned. */}
        <header className="flex items-center gap-2">
          {/* 2026-05-26 (Yuqi /rules/pulse #1 follow-up): state badge
              + abbreviation now read as ONE visual unit (framed pill
              with SVG flag + uppercase code), matching the
              AffectedClientsTable jurisdiction chip pattern.
              Previously they sat as two separate elements with `gap-2`
              between them, which read as "icon … text" instead of
              "[CA chip]". */}
          <span className="inline-flex items-center gap-1 rounded-md border border-divider-regular bg-background-default py-0.5 pl-0.5 pr-1.5">
            <StateBadge code={alert.jurisdiction} size="xs" aria-hidden />
            <span
              aria-hidden
              className="font-semibold uppercase tracking-wide text-xs text-text-primary"
            >
              {alert.jurisdiction}
            </span>
          </span>
          {/* 2026-05-26 (Yuqi /rules/pulse #6 follow-up): h3 stepped
              up text-lg → text-xl. Title is the row's anchor; the
              previous size felt timid against the surrounding
              metadata chips. */}
          <h3
            className="min-w-0 flex-1 truncate text-xl font-semibold leading-tight text-text-primary"
            title={alert.title}
          >
            {alert.title}
          </h3>
          <PulseStatusBadge status={alert.status} />
          <PulseSourceBadge source={alert.source} sourceUrl={alert.sourceUrl} />
          <PulseSourceStatusBadge status={alert.sourceStatus} />
        </header>

        {/* Meta line below title: change-kind label + confidence.
            2026-05-26 (Yuqi /rules/pulse #12): pulled out of the
            title row so source and change-kind no longer read as
            equal-weight pills sitting side-by-side. Change-kind
            now renders as quieter caption-text ("Form updated"
            sits as a label, not a chip).
            2026-05-26 (Yuqi follow-up): always show the numeric
            PulseConfidenceBadge — previously the row swapped to
            the qualitative LowConfidenceBadge below 0.5, which
            made the list mix two different shapes for the same
            concept. The numeric badge already renders destructive
            (red) below 0.7, so "AI 45%" in red carries the same
            "don't trust this without a human look" signal more
            precisely than "LOW CONFIDENCE" did. */}
        {/* 2026-05-26 (Yuqi /rules/pulse #12 follow-up): Yuqi
            re-reviewed the unified-numeric decision and asked to go
            back to the qualitative LowConfidenceBadge when
            confidence < 0.5, consistent with the dashboard's Today
            card. Reasoning: AI XX% in destructive tone reads as a
            data point ("the model is 45% confident"); LOW
            CONFIDENCE reads as a verdict ("do not trust this
            without a human look") — the latter is what we want
            CPAs to absorb at scan distance. Card bg picks up the
            faint destructive tint at the same threshold so the row
            stands out even before the badge is read. */}
        {/* 2026-05-26 (Yuqi /rules/pulse follow-up #6, #10):
            meta line restructured. Confidence (LOW/MEDIUM/HIGH
            qualitative badge) takes the leading position next to
            the title; change-kind moves to the trailing position
            as a small framed pill so it reads as metadata not as
            label-prefixing-the-confidence. */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-tertiary">
          {lowConfidence ? (
            <LowConfidenceBadge />
          ) : mediumConfidence ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-state-warning-hover/40 px-1.5 py-0.5 text-xs uppercase tracking-wide text-text-warning">
              <Trans>Medium confidence</Trans>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-sm bg-state-success-hover px-1.5 py-0.5 text-xs uppercase tracking-wide text-text-success">
              <Trans>High confidence</Trans>
            </span>
          )}
          <span className="inline-flex items-center rounded-sm border border-divider-regular bg-background-default px-1.5 py-0.5 font-medium uppercase tracking-wide text-text-secondary">
            {changeKindLabel(alert.changeKind)}
          </span>
        </div>

        {/* AI summary — only render when meaningfully different from
            the title.
            2026-05-26 (Yuqi /rules/pulse #6): line-clamp-2 → line-clamp-1
            so the card stays compact and the rest of the summary
            becomes a reason to open the detail panel. */}
        {alert.summary && alert.summary.trim() !== alert.title.trim() ? (
          <p className="line-clamp-1 text-sm text-text-secondary">{alert.summary}</p>
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
          // 2026-05-26 (Yuqi /rules/pulse follow-up #11, #12):
          // dropped italic — italic + small caption read as a
          // "footnote disclaimer" and visually conflicted with the
          // briefcase icon's "action you take" message. Added a
          // top border + pt-2 so the action sentence reads as a
          // separate unit from the impact line above it.
          <p className="mt-1 flex items-center gap-1.5 border-t border-divider-subtle pt-2 text-sm text-text-secondary">
            <BriefcaseIcon className="size-3.5 shrink-0" aria-hidden />
            <span>
              <Trans>Review-only source change. No due-date overlay will be applied.</Trans>
            </span>
          </p>
        ) : impacted === 0 ? (
          <p className="text-sm text-text-tertiary">
            <Trans>No matching clients in this practice.</Trans>
          </p>
        ) : (
          // 2026-05-26 (Yuqi /rules/pulse #5): impact line collapsed
          // into a single readable sentence — "5 clients may be
          // affected: client 1, client 2, client 3, +N more" —
          // instead of the previous count-chip-grid + summary-line
          // two-row layout. Reads as a sentence the CPA can scan
          // top-to-bottom without a visual jump. Needs-review count
          // (when present) tacked on as a trailing meta clause.
          // 2026-05-26 (Yuqi /rules/pulse follow-up #7): client names
          // now render as 2px-rounded framed pills (white bg, faint
          // border) instead of a comma-joined run-on string. Reads
          // as "5 clients may be affected: [Acme] [Beta] [Gamma]
          // +N more" — the pill shape signals these are entities
          // not free-form text, matching the AffectedClientsTable
          // chip pattern in the drawer.
          <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-text-tertiary">
            <span>
              {impacted === 1 ? (
                <Trans>1 client may be affected</Trans>
              ) : (
                <Trans>{impacted} clients may be affected</Trans>
              )}
              {visibleNames.length > 0 ? ':' : '.'}
            </span>
            {visibleNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-sm border border-divider-subtle bg-background-default px-1.5 py-0.5 text-xs text-text-secondary"
              >
                {name}
              </span>
            ))}
            {overflowNames > 0 ? (
              <span className="text-text-tertiary">+{overflowNames} more</span>
            ) : null}
            {alert.needsReviewCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                {/* 2026-05-26 (Yuqi /rules/pulse follow-up #8):
                    rephrased "N need review" → "N flagged for
                    review" — the verb form pairs with the
                    "may be affected" parent clause and avoids
                    the agreement-pluralization ambiguity ("1
                    need review" reads broken). */}
                <span className="tabular-nums">
                  {alert.needsReviewCount === 1 ? (
                    <Trans>1 flagged for review</Trans>
                  ) : (
                    <Trans>{alert.needsReviewCount} flagged for review</Trans>
                  )}
                </span>
              </>
            ) : null}
          </p>
        )}
      </div>

      {compact || (!onSnooze && !onDismiss) ? null : (
        // 2026-05-26 (Yuqi /rules/pulse follow-up): action column
        // collapsed from a stacked Review/Snooze/Dismiss button
        // trio to a single kebab DropdownMenu. Rationale:
        //  • The article itself is the primary click target —
        //    clicking anywhere on the row opens the detail panel
        //    (item #1). The explicit Review button duplicated
        //    that affordance.
        //  • Snooze + Dismiss are the only actions that diverge
        //    from "open the panel and look at it". They live
        //    behind one tap (Linear / Gmail / Notion convention).
        //  • Reduces visual noise from 3 buttons → 1 icon and
        //    frees ~80px of horizontal room for the row content.
        // Terminal-state alerts (no snooze/dismiss handlers
        // passed in) render no kebab at all — the row is still
        // clickable to open the read-only panel.
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t`More actions for ${alert.title}`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            className="inline-flex size-8 shrink-0 items-center justify-center self-start rounded-md text-text-tertiary outline-none transition-colors hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt data-[state=open]:bg-state-base-hover"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[160px]"
            onClick={(event) => event.stopPropagation()}
          >
            {onSnooze ? (
              <DropdownMenuItem
                onSelect={() => onSnooze()}
                onClick={(event) => event.stopPropagation()}
              >
                <Trans>Snooze 24h</Trans>
              </DropdownMenuItem>
            ) : null}
            {onDismiss ? (
              <DropdownMenuItem
                onSelect={() => onDismiss()}
                onClick={(event) => event.stopPropagation()}
              >
                <Trans>Dismiss</Trans>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
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
