import { type ReactNode } from 'react'
import { Plural, Trans } from '@lingui/react/macro'
import { ArrowRightIcon, InfoIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'
import { CountPill } from '@/components/primitives/count-pill'
import { jurisdictionLabel } from '@/features/rules/rules-console-model'

// Maps the Pencil `U8eGg` — /onboarding rule-review prompt, step 2 of the
// onboarding flow (Practice → Rules → Clients). Rendered inside the onboarding
// shell so it shares the firm-setup chrome (brand bar + step dots + footer).
//
// Honesty note: the activation contract (RuleOnboardingActivationOutput) gives
// the real review jurisdictions + total activated count, but NOT per-jurisdiction
// rules/blocked breakdowns. Those stats are therefore OPTIONAL here and omitted
// when absent rather than fabricated — the canvas's "28 rules · 6 blocked" rows
// await an activation-summary contract. TODO(data): surface per-jurisdiction
// counts and render them.

export interface JurisdictionReviewItem {
  code: string
  /** Optional rich stats — render only when the contract provides them. */
  rulesActivated?: number
  blockedCount?: number
  authority?: string
  detail?: string
}

interface RuleReviewPromptProps {
  totalRulesActivated: number
  jurisdictions: readonly JurisdictionReviewItem[]
  onBack?: (() => void) | undefined
  onSkip?: (() => void) | undefined
  onReview?: (() => void) | undefined
}

function ReviewRow({ item, last }: { item: JurisdictionReviewItem; last: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 px-[22px] py-4',
        !last && 'border-b border-divider-subtle',
      )}
    >
      <span className="grid size-[42px] shrink-0 place-items-center rounded-lg border border-state-warning-active bg-state-warning-hover text-base font-semibold text-text-warning">
        {item.code}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">
            {jurisdictionLabel(item.code)}
          </span>
          {item.rulesActivated != null ? (
            <>
              <span aria-hidden className="text-text-muted">
                ·
              </span>
              <span className="text-xs font-medium text-text-tertiary">
                <Trans>{item.rulesActivated} rules activated</Trans>
              </span>
            </>
          ) : null}
          {item.blockedCount != null ? (
            <Badge variant="destructive" className="text-[10px] font-semibold">
              <Trans>{item.blockedCount} blocked</Trans>
            </Badge>
          ) : null}
        </div>
        <p className="text-[11px] font-medium leading-relaxed text-text-tertiary">
          {item.detail ?? (
            // Plain gloss, not the internal term "source-defined calendar"
            // (2026-06-12 critique) — matches the state-selector's phrasing.
            <Trans>
              This state publishes its own filing calendar — confirm it before deadlines generate.
            </Trans>
          )}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-divider-subtle bg-background-default px-3.5 py-2 text-base font-semibold text-text-secondary">
        <Trans>Review</Trans>
        <ArrowRightIcon className="size-3 text-text-tertiary" aria-hidden />
      </span>
    </div>
  )
}

export function RuleReviewPrompt({
  totalRulesActivated,
  jurisdictions,
  onBack,
  onSkip,
  onReview,
}: RuleReviewPromptProps): ReactNode {
  const reviewCount = jurisdictions.length
  const codeList = jurisdictions.map((item) => item.code).join(' + ')
  const summarizeJurisdictions = reviewCount > 3
  const reviewButtonLabel = summarizeJurisdictions ? (
    <Plural value={reviewCount} one="Review # state" other="Review # states" />
  ) : (
    <Trans>Review {codeList} now</Trans>
  )

  return (
    <div className="flex min-h-0 w-full max-w-[720px] flex-1 flex-col gap-4">
      {/* Heading */}
      <div className="flex shrink-0 flex-col items-center gap-2 text-center">
        <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-text-primary">
          <Plural
            value={reviewCount}
            one="# jurisdiction needs a quick review"
            other="# jurisdictions need a quick review"
          />
        </h1>
        <p className="text-sm font-medium leading-relaxed text-text-tertiary">
          <Trans>You activated {totalRulesActivated} rules.</Trans>{' '}
          {summarizeJurisdictions ? (
            <Plural
              value={reviewCount}
              one="# jurisdiction publishes its own filing calendar, so it needs your eyes before it generates deadlines for your clients. A few minutes here saves filing-day surprises later."
              other="# jurisdictions publish their own filing calendars, so they need your eyes before they generate deadlines for your clients. A few minutes here saves filing-day surprises later."
            />
          ) : reviewCount === 1 ? (
            <Trans>
              {codeList} publishes its own filing calendar, so it needs your eyes before it
              generates deadlines for your clients. A few minutes here saves filing-day surprises
              later.
            </Trans>
          ) : (
            <Trans>
              {codeList} publish their own filing calendars, so they need your eyes before they
              generate deadlines for your clients. A few minutes here saves filing-day surprises
              later.
            </Trans>
          )}
        </p>
      </div>

      {/* Card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-divider-subtle bg-background-default">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-divider-subtle px-[22px] py-4">
          <span className="text-sm font-semibold text-text-primary">
            <Trans>Jurisdictions awaiting calendar review</Trans>
          </span>
          <div className="flex-1" />
          {/* CountPill — the canonical "N <noun>" count pill (warning
              tone), not a hand-rolled one-off. */}
          <CountPill tone="warning">
            <Trans>{reviewCount} to review</Trans>
          </CountPill>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {jurisdictions.map((item, index) => (
            <ReviewRow key={item.code} item={item} last={index === jurisdictions.length - 1} />
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 bg-bg-subtle px-[22px] py-3">
          <InfoIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
          <p className="text-xs font-medium leading-relaxed text-text-tertiary">
            <Trans>You can also skip this and review rules later from the Rule Library.</Trans>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-text-tertiary hover:text-text-secondary"
        >
          <Trans>Skip and import clients first</Trans>
        </Button>
        <div className="flex-1" />
        {onBack ? (
          <Button variant="secondary" onClick={onBack}>
            <Trans>Back</Trans>
          </Button>
        ) : null}
        <Button variant="primary" onClick={onReview}>
          {reviewButtonLabel}
          <ArrowRightIcon className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
