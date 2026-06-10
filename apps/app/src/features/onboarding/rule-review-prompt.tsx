import { type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { ArrowRightIcon, InfoIcon } from 'lucide-react'

import { cn } from '@duedatehq/ui/lib/utils'
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
      <span className="grid size-[42px] shrink-0 place-items-center rounded-lg border border-state-warning-active bg-state-warning-hover text-base font-bold text-text-warning">
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
            <span className="rounded-full bg-state-destructive-hover-alt px-2 py-0.5 text-[10px] font-bold text-text-destructive">
              <Trans>{item.blockedCount} blocked</Trans>
            </span>
          ) : null}
        </div>
        <p className="text-[11px] font-medium leading-relaxed text-text-tertiary">
          {item.detail ?? (
            <Trans>Source-defined calendar — confirm before deadlines generate for clients.</Trans>
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

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-6">
      {/* Heading */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-text-primary">
          <Trans>
            {reviewCount} jurisdiction{reviewCount === 1 ? '' : 's'} need a quick review
          </Trans>
        </h1>
        <p className="text-sm font-medium leading-relaxed text-text-tertiary">
          <Trans>
            You activated {totalRulesActivated} rules. For {codeList}, our source-defined calendars
            need your eyes before they generate deadlines for your clients. A few minutes here saves
            filing-day surprises later.
          </Trans>
        </p>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-[14px] border border-divider-subtle bg-background-default">
        <div className="flex items-center gap-2.5 border-b border-divider-subtle px-[22px] py-4">
          <span className="text-sm font-semibold text-text-primary">
            <Trans>Jurisdictions awaiting calendar review</Trans>
          </span>
          <div className="flex-1" />
          <span className="rounded-full border border-state-warning-active bg-state-warning-hover px-2.5 py-0.5 text-[11px] font-bold text-text-warning">
            <Trans>{reviewCount} to review</Trans>
          </span>
        </div>

        {jurisdictions.map((item, index) => (
          <ReviewRow key={item.code} item={item} last={index === jurisdictions.length - 1} />
        ))}

        <div className="flex items-center gap-2 bg-bg-subtle px-[22px] py-3">
          <InfoIcon className="size-3 shrink-0 text-text-muted" aria-hidden />
          <p className="text-xs font-medium leading-relaxed text-text-tertiary">
            <Trans>You can also skip this and review rules later from the Rule Library.</Trans>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg px-3.5 py-2.5 text-base font-semibold text-text-tertiary transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <Trans>Skip and import clients first</Trans>
        </button>
        <div className="flex-1" />
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-divider-subtle bg-background-default px-4 py-2.5 text-base font-semibold text-text-secondary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <Trans>Back</Trans>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onReview}
          className="flex items-center gap-1.5 rounded-lg bg-state-accent-solid px-5 py-2.5 text-base font-semibold text-text-primary-on-surface transition-colors hover:bg-components-button-primary-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
        >
          <Trans>Review {codeList} now</Trans>
          <ArrowRightIcon className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
