import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon, UsersIcon } from 'lucide-react'

import type { PulseAlertPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { SeverityChip } from '@/components/primitives/severity-chip'
import { JurisdictionChip } from '@/components/primitives/state-badge'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { formatRelativeTime } from '@/lib/utils'

import { useAlertDetailQueryOptions } from '../api'
import {
  actionPillFromAlert,
  impactBadgeFromAlert,
  openStatusFromAlert,
} from './pulse-alert-chrome'
import { changeKindLabel } from './PulseChangeKindChip'

/**
 * PulseFormRevisedCard — exact recreation of Pencil node `ZkXFr`
 * (the "Form Revised" master used inside jykZH).
 *
 * Data wiring: every visible value comes from `alert` props via the
 * shared `pulse-alert-chrome` helpers, with `facts` carrying the
 * form-revision-specific payload that the contract doesn't yet expose.
 */

interface PulseFormRevisedFacts {
  whatChanged?: { from: string; to: string; newBadge?: boolean | undefined } | undefined
  affecting?: readonly string[] | undefined
  firstYear?: string | undefined
  transition?: string | undefined
}

interface PulseFormRevisedCardProps {
  alert: PulseAlertPublic
  onReview: () => void
  facts?: PulseFormRevisedFacts
  className?: string
}

function PulseFormRevisedCard({ alert, onReview, facts, className }: PulseFormRevisedCardProps) {
  const { t } = useLingui()
  const severity = impactBadgeFromAlert(alert)
  const actionPill = actionPillFromAlert(alert)
  const openId = openStatusFromAlert(alert.status)
  const totalAffected = alert.matchedCount + alert.needsReviewCount

  const detailQuery = useQuery(useAlertDetailQueryOptions(alert.id))
  const firstForm = detailQuery.data?.forms?.[0]

  // The impact pill is gated to HIGH only — matching AlertCard ("LOW /
  // MEDIUM render nothing; absence IS the signal"). Only the genuinely
  // high-impact alerts carry the red HIGH IMPACT chip; quiet form
  // updates wear no badge.
  const severityLabel = t`HIGH IMPACT`
  const actionLabel = actionPill
    ? actionPill.id === 'needs-action'
      ? t`Needs Action`
      : actionPill.id === 'needs-review'
        ? t`Needs Review`
        : t`Closed`
    : null
  const openLabel =
    openId === 'open'
      ? t`Open`
      : openId === 'applied'
        ? t`Applied`
        : openId === 'dismissed'
          ? t`Dismissed`
          : openId === 'partial'
            ? t`Partially applied`
            : t`Reverted`

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onReview()
    }
  }

  return (
    // Whole-card click parity with AlertCard — this form_instruction
    // variant renders in place of AlertCard, so it must carry the same
    // button semantics (role / tabIndex / onClick / keyboard). Without
    // them only the small "Review →" link is reachable and the card body
    // reads as clickable but isn't.
    <article
      role="button"
      tabIndex={0}
      aria-label={t`Alert: ${alert.title}`}
      onClick={onReview}
      onKeyDown={handleCardKeyDown}
      className={cn(
        // Outer chrome — Pencil ZkXFr exactly.
        //   • cornerRadius 16 → rounded-xl
        //   • padding 20 → p-5
        //   • outer gap 8 → gap-2 between c4OFh / eMmjH / iKzA1
        //   • stroke disabled → no border
        //   • bg #ffffff → bg-background-default
        'flex cursor-pointer flex-col gap-2 overflow-hidden rounded-xl bg-background-default p-5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
        className,
      )}
    >
      {/* c4OFh Frame 132 — top meta row, justify-between, gap-2. */}
      <div className="flex items-center justify-between gap-2">
        {/* uHKcq left cluster, gap-2 (8px). */}
        <div className="flex min-w-0 items-center gap-2">
          {/* Severity pill, gated to HIGH only (see severityLabel note above).
              NEUTRAL tone (2026-06-18): client reach is a quiet tag on a
              different axis from urgency, never an amber alarm. Shared
              <SeverityChip>. */}
          {severity.id === 'high' ? (
            <SeverityChip level="neutral">{severityLabel}</SeverityChip>
          ) : null}
          {/* Mclbt source caption: 12/500 muted. */}
          <span className="truncate text-xs font-medium text-text-tertiary">{alert.source}</span>
          {/* Change-kind eyebrow — token tertiary ink (was a hardcoded
              #6B21A8 purple, the only off-palette literal on this card and a
              third rendering of a label the row/detail show in `secondary`). */}
          <CapsFieldLabel as="span" variant="field" className="shrink-0">
            {changeKindLabel(alert.changeKind)}
          </CapsFieldLabel>
        </div>
        {/* lAREX right cluster, gap-2. */}
        <div className="flex shrink-0 items-center gap-2">
          {/* E3XexN "2hrs ago" 14/500 #676f83. */}
          <span className="text-sm font-medium text-text-tertiary">
            {formatRelativeTime(alert.publishedAt)}
          </span>
          {/* ZKK1S action pill: rounded-full, padding [6,12], 12/500. */}
          {actionPill && actionLabel ? (
            <span
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: actionPill.bg, color: actionPill.text }}
            >
              {actionLabel}
            </span>
          ) : null}
        </div>
      </div>

      {/* eMmjH meta row — single inline cluster sAnr3 (gap-2).
          The eMmjH frame uses justify-between but with one child it
          packs to the left; the cluster contains CA + title + Open
          tightly. */}
      <div className="flex items-center gap-2">
        {/* Jurisdiction — shared JurisdictionChip primitive (outline
            reference tag). Replaces the Pencil tCuD7 one-off (14/700
            bg-section span) so the SAME alert wears the same code chip
            here, in the row, and in the rail. */}
        <JurisdictionChip code={alert.jurisdiction} />
        {/* d5PWuK title: 18/600 ls -0.2 line-height 1.25 primary. */}
        <h3 className="min-w-0 flex-1 truncate text-xl leading-tight font-semibold tracking-title text-text-primary">
          {alert.title}
        </h3>
        {/* C9rliy "Open" muted: 20/500 ls -0.4 line-height 1.25. */}
        <span className="shrink-0 text-xl leading-tight font-medium tracking-display text-text-tertiary">
          {openLabel}
        </span>
      </div>

      {/* iKzA1 Frame 128 — facts + impact stacked with NO gap.
          The impact row's own pt-2.5 padding creates the visual
          breathing room. */}
      <div className="flex flex-col">
        {/* R2kul facts panel: rounded-xl, bg #f9fafb. NO cell
            strokes anymore (Pencil dropped them). Column widths
            500/500/200/200 → grid-cols-[5fr_5fr_2fr_2fr]. */}
        <div className="grid grid-cols-[5fr_5fr_2fr_2fr] overflow-hidden rounded-xl bg-background-section">
          {/* wdV5a WHAT CHANGED. padding [12,16], gap-1.5. */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <span className="text-xs font-semibold tracking-eyebrow-tight text-text-tertiary">
              <Trans>WHAT CHANGED</Trans>
            </span>
            <div className="flex items-center gap-2.5 text-sm">
              <span className="font-medium whitespace-nowrap text-text-tertiary">
                {facts?.whatChanged?.from ?? '—'}
              </span>
              <ArrowRightIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
              <span className="font-medium tracking-title whitespace-nowrap text-text-secondary">
                {facts?.whatChanged?.to ?? '—'}
              </span>
              {facts?.whatChanged?.newBadge ? (
                // Canonical warning Badge — was a hardcoded #92400E amber-800
                // pill, white bold mono, rotated -11deg (the only rotation in
                // the product). On-system soft-amber tag, no rotation, no 700.
                <Badge
                  variant="warning"
                  className="shrink-0 font-mono"
                  aria-label={t`New form version`}
                >
                  <Trans>NEW</Trans>
                </Badge>
              ) : null}
            </div>
          </div>
          {/* JNTVV AFFECTING (renamed from SCHEMA DIFF). Shows form-code
              pills inline. */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <span className="text-xs font-semibold tracking-eyebrow-tight text-text-tertiary">
              <Trans>AFFECTING</Trans>
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {(facts?.affecting && facts.affecting.length > 0
                ? facts.affecting
                : firstForm
                  ? [firstForm]
                  : []
              ).map((code) => (
                // QbZPm form-code pill — shared TaxCodeBadge primitive
                // (stock chrome) so the form badge reads identically on
                // every surface; supersedes the canvas's 12/700 one-off.
                <TaxCodeBadge key={code} code={code} />
              ))}
              {!facts?.affecting?.length && !firstForm ? (
                <span className="text-sm font-medium text-text-secondary">—</span>
              ) : null}
            </div>
          </div>
          {/* DOz2N FIRST YEAR — narrower cell. */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <span className="text-xs font-semibold tracking-eyebrow-tight text-text-tertiary">
              <Trans>FIRST YEAR</Trans>
            </span>
            <span className="text-sm font-medium text-text-secondary">
              {facts?.firstYear ?? '—'}
            </span>
          </div>
          {/* y3WVFs TRANSITION — narrower cell. */}
          <div className="flex flex-col gap-1.5 px-4 py-3">
            <span className="text-xs font-semibold tracking-eyebrow-tight text-text-tertiary">
              <Trans>TRANSITION</Trans>
            </span>
            <span className="text-sm font-medium text-text-secondary">
              {facts?.transition ?? '—'}
            </span>
          </div>
        </div>

        {/* I1qCj9 impact row: padding [10, 0, 2, 0] → pt-2.5 pb-0.5.
            Carries the breathing room that replaces what was a gap. */}
        <div className="flex items-center justify-between gap-2.5 pt-2.5 pb-0.5">
          <div className="flex items-center gap-1.5">
            <UsersIcon className="size-[13px] shrink-0 text-text-tertiary" aria-hidden />
            <span className="text-xs font-medium text-text-tertiary">
              {totalAffected > 0 ? (
                firstForm ? (
                  <Plural
                    value={totalAffected}
                    one={`# client · 1 ${firstForm} return affected`}
                    other={`# clients · # ${firstForm} returns affected`}
                  />
                ) : (
                  <Plural
                    value={totalAffected}
                    one="# client may be affected"
                    other="# clients may be affected"
                  />
                )
              ) : (
                <Trans>No matching clients in this practice.</Trans>
              )}
            </span>
          </div>
          <TextLink
            variant="accent"
            onClick={(event) => {
              // Card-level onClick already calls onReview; stop the
              // bubble so the button doesn't fire it a second time.
              event.stopPropagation()
              onReview()
            }}
            className="font-semibold focus-visible:underline"
          >
            <Trans>Review →</Trans>
          </TextLink>
        </div>
      </div>
    </article>
  )
}

export { PulseFormRevisedCard }
