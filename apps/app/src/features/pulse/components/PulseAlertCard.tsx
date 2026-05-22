import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, ArrowRightIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { ConceptLabel } from '@/features/concepts/concept-help'

import { isVeryLowPulseConfidence, PulseConfidenceBadge } from './PulseConfidenceBadge'
import { PulseSourceBadge } from './PulseSourceBadge'
import { PulseSourceStatusBadge } from './PulseSourceStatusBadge'
import { PulsingDot } from './PulsingDot'

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

// Single Pulse alert row used by Rules > Pulse Changes. Keeps the same
// hairline / monospace metadata language as the dashboard strip — flat row
// with a pulsing dot, mono source label, body title, mono impact count, and
// a thin action set on the right.
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
  const veryLowConfidence = isVeryLowPulseConfidence(alert.confidence)
  const tone = veryLowConfidence ? 'error' : impacted === 0 ? 'success' : 'warning'

  return (
    <article
      role="region"
      aria-label={t`Pulse alert: ${alert.title}`}
      className={cn(
        // T4: neutral card surface in all states. Severity is carried
        // by the in-card badges (LOW CONFIDENCE, etc.) — never the
        // card background.
        'flex flex-col gap-2 rounded-md border border-divider-subtle bg-background-default p-3 transition-colors hover:border-divider-regular',
        breathing && 'pulse-strip-breathing',
        compact && 'p-2.5',
      )}
      data-tone={tone}
      data-breathing={breathing || undefined}
    >
      <header className="flex items-center gap-2">
        <PulsingDot tone={tone} active />
        <span className="font-mono text-sm tabular-nums text-text-secondary">{alert.source}</span>
        <span aria-hidden className="text-text-tertiary">
          ·
        </span>
        <h3
          className="min-w-0 flex-1 truncate text-md font-medium text-text-primary"
          title={alert.title}
        >
          {alert.title}
        </h3>
        <Badge variant="outline" className="hidden shrink-0 font-mono text-[11px] sm:inline-flex">
          {changeKindLabel(alert.changeKind)}
        </Badge>
        <PulseConfidenceBadge confidence={alert.confidence} />
        <PulseSourceStatusBadge status={alert.sourceStatus} />
      </header>

      <p className="pl-4 text-sm text-text-secondary">
        {alert.actionMode === 'review_only' ? (
          <Trans>Review-only source change. No due-date overlay will be applied.</Trans>
        ) : impacted === 0 ? (
          <Trans>No matching clients in this practice.</Trans>
        ) : (
          <>
            <span className="font-mono tabular-nums text-text-primary">
              <Plural value={impacted} one="# client" other="# clients" />
            </span>{' '}
            <Trans>may be affected.</Trans>
            {alert.needsReviewCount > 0 ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums text-text-warning">
                  <Trans>{alert.needsReviewCount} need review</Trans>
                </span>
              </>
            ) : null}
          </>
        )}
      </p>

      {veryLowConfidence ? (
        <p className="flex items-center gap-1.5 pl-4 text-sm font-medium text-text-destructive">
          <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
          <ConceptLabel concept="aiConfidence">
            <Trans>Low AI confidence. Review source details before applying.</Trans>
          </ConceptLabel>
        </p>
      ) : null}

      {compact ? null : (
        <footer className="flex items-center justify-between gap-2 pl-4">
          <PulseSourceBadge source={alert.source} sourceUrl={alert.sourceUrl} />
          <span className="flex items-center gap-1">
            {/* Canonical action order per docs/Design/pulse-vocabulary.md:
              Snooze (softer secondary) → Dismiss (destructive-ish secondary)
              → Review (primary, rightmost). Both Snooze and Dismiss are
              audit-logged and require a reason — the parent owns the prompt. */}
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
            <Button size="sm" onClick={onReview}>
              <Trans>Review</Trans>
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </span>
        </footer>
      )}
    </article>
  )
}

function changeKindLabel(kind: PulseAlertPublic['changeKind']) {
  switch (kind) {
    case 'deadline_shift':
      return <Trans>Deadline</Trans>
    case 'filing_requirement':
      return <Trans>Filing</Trans>
    case 'applicability_scope':
      return <Trans>Scope</Trans>
    case 'form_instruction':
      return <Trans>Form</Trans>
    case 'source_status':
      return <Trans>Source</Trans>
    case 'new_obligation':
      return <Trans>New rule</Trans>
    case 'other':
      return <Trans>Other</Trans>
  }
  return kind
}
