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
  /** Background breathing is reserved for the top actionable row in dense lists. */
  breathing?: boolean
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
  breathing = false,
  compact = false,
}: PulseAlertCardProps) {
  const { t } = useLingui()
  const impacted = alert.matchedCount + alert.needsReviewCount

  return (
    // 2026-05-25 (Yuqi Alerts second pass — #1, #2, #3, #4, #5, #6):
    //   • #1 source badge moved from the title row into a meta row
    //     below the title — title is now the dominant element, source
    //     is supporting.
    //   • #2 font-mono dropped from the impacted-count sentence — it
    //     was treating client counts as if they were code identifiers.
    //   • #3 "1 need review" was rendering in warning amber which
    //     read as red against the impacted-clients line. Demoted to
    //     a quiet text-tertiary fragment after a separator so it
    //     reads as supporting context, not an error.
    //   • #4 title bumped from `font-medium` to `font-semibold` so
    //     it carries the expected h3 weight — was reading lighter
    //     than the badges around it.
    //   • #5 the "No matching clients" fallback now reads as italic
    //     tertiary text on its own line below the optional AI
    //     summary, so the empty-state line is visually distinct from
    //     the AI narrative (Yuqi flagged the two blending into each
    //     other when both rendered at text-sm text-secondary).
    //   • #6 "Who it applies to" → "Scope changed" — Yuqi flagged
    //     the original copy as opaque to a CPA. Verb-noun phrase
    //     matches the rest of the change-kind label set.
    <article
      role="region"
      aria-label={t`Pulse alert: ${alert.title}`}
      className={cn(
        // T4: neutral card surface in all states. Severity is carried
        // by the in-card badges (LOW CONFIDENCE, etc.) — never the
        // card background.
        'flex flex-col gap-1.5 rounded-md border border-divider-subtle bg-background-default p-3 transition-colors hover:border-divider-regular',
        breathing && 'pulse-strip-breathing',
        compact && 'p-2.5',
      )}
      data-breathing={breathing || undefined}
    >
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
          the title (many alerts have a summary that just rewords
          their title). Same logic the drawer uses for the
          SheetDescription. */}
      {alert.summary && alert.summary.trim() !== alert.title.trim() ? (
        <p className="line-clamp-2 text-sm text-text-secondary">{alert.summary}</p>
      ) : null}

      {/* Impact line — count + need-review tail in a single sentence.
          2026-05-25 (Yuqi follow-up — completing #5): when matched
          clients exist, the impact line now renders at tertiary
          baseline (was secondary, same as the AI summary above
          which made the two paragraphs blend). The count itself
          stays text-primary font-medium so the eye still lands on
          the number — but the surrounding prose is tertiary, marking
          it as structural metadata rather than narrative content. */}
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

      {compact ? null : (
        <footer className="flex items-center justify-end gap-1">
          {/* Canonical action order per docs/Design/pulse-vocabulary.md:
            Snooze (softer secondary) → Dismiss (destructive-ish secondary)
            → Review (primary, rightmost). Both Snooze and Dismiss are
            audit-logged and require a reason — the parent owns the prompt.
            Snooze/Dismiss only render for `status === 'matched'` (open
            alerts); on terminal states (applied/dismissed/reverted/
            snoozed) the parent omits the handlers — the visual
            asymmetry Yuqi flagged in #7 is the canonical signal that
            "this alert is closed; only Review is meaningful."
            Reinforced by the `title` attribute on Review describing
            the terminal-state case. */}
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
        </footer>
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
