import { type ReactNode } from 'react'
import { Link } from 'react-router'
import { Trans } from '@lingui/react/macro'
import { ArrowRightIcon, InfoIcon } from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { jurisdictionLabel } from '@/features/rules/rules-console-model'

// Maps the Pencil `U8eGg` — /onboarding rule-review prompt. This is a
// NET-NEW onboarding step: the current `/onboarding` route (apps/app/src/
// routes/onboarding.tsx) is a single firm-setup page with no second
// "review jurisdictions" beat. The data it needs (per-jurisdiction
// source-defined-calendar review state, blocked-deadline counts) is partly
// modelled today via `sourceDefinedCalendarReviewStates` in
// state-rule-activation-selector.tsx, but the activated-rule counts and
// per-source breakdown are not yet surfaced by any contract — flagged
// TODO(data) below.

// TODO(data): replace with the activation-summary contract once it exists.
// `activateOnboardingJurisdictions` already runs server-side; this shape is
// what its summary output would carry per jurisdiction needing review.
export interface JurisdictionReviewItem {
  code: string
  authority: string
  rulesActivated: number
  blockedCount: number
  detail: string
}

interface RuleReviewPromptProps {
  totalRulesActivated: number
  jurisdictions: readonly JurisdictionReviewItem[]
  onBack?: (() => void) | undefined
  onSkip?: (() => void) | undefined
  onReview?: (() => void) | undefined
}

function ReviewRow({
  item,
  last,
  onReview,
}: {
  item: JurisdictionReviewItem
  last: boolean
  onReview?: (() => void) | undefined
}) {
  return (
    <div
      className={
        last
          ? 'flex items-center gap-3.5 px-5 py-4'
          : 'flex items-center gap-3.5 border-b border-divider-regular px-5 py-4'
      }
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-state-warning-hover-alt bg-state-warning-hover text-description font-bold text-text-warning">
        {item.code}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-text-primary">{jurisdictionLabel(item.code)}</span>
          <span aria-hidden className="text-text-muted">
            ·
          </span>
          <span className="text-caption text-text-tertiary">
            <Trans>{item.rulesActivated} rules activated</Trans>
          </span>
          <Badge variant="destructive" size="sm" className="font-bold">
            <Trans>{item.blockedCount} blocked</Trans>
          </Badge>
        </div>
        <p className="text-caption leading-relaxed text-text-tertiary">{item.detail}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        render={onReview ? undefined : <Link to="/rules/library" />}
        onClick={onReview}
      >
        <Trans>Review</Trans>
        <ArrowRightIcon data-icon="inline-end" />
      </Button>
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
  const blockedTotal = jurisdictions.reduce((sum, item) => sum + item.blockedCount, 0)
  const codeList = jurisdictions.map((item) => item.code).join(' + ')

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-6">
      {/* Heading */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          <Trans>
            {reviewCount} jurisdiction{reviewCount === 1 ? '' : 's'} need a quick review
          </Trans>
        </h1>
        <p className="text-sm leading-relaxed text-text-secondary">
          <Trans>
            You activated {totalRulesActivated} rules. For {codeList}, our source-defined calendars
            need your eyes before they generate deadlines for your clients. A few minutes here saves
            filing-day surprises later.
          </Trans>
        </p>
      </div>

      {/* Card */}
      <div className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
        <div className="flex items-center gap-2.5 border-b border-divider-regular px-5 py-4">
          <span className="font-semibold text-text-primary">
            <Trans>Jurisdictions awaiting calendar review</Trans>
          </span>
          <div className="flex-1" />
          <Badge variant="warning" className="font-bold">
            <Trans>
              {reviewCount} to review · {blockedTotal} deadlines blocked
            </Trans>
          </Badge>
        </div>

        {jurisdictions.map((item, index) => (
          <ReviewRow
            key={item.code}
            item={item}
            last={index === jurisdictions.length - 1}
            onReview={onReview}
          />
        ))}

        <div className="flex items-center gap-2 border-t border-divider-regular bg-background-section px-5 py-3">
          <InfoIcon className="size-3.5 shrink-0 text-text-muted" aria-hidden />
          <p className="text-caption leading-relaxed text-text-tertiary">
            <Trans>
              You can also skip this for now and review rules later from the Rule Library.
            </Trans>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* TODO(data): "skip" / "back" / "review" wiring depends on how the
            onboarding flow adopts a multi-step shape (see report). When
            rendered standalone, the Review CTA deep-links to Rule Library. */}
        <Button
          variant="ghost"
          render={onSkip ? undefined : <Link to="/migration/new?source=onboarding" />}
          onClick={onSkip}
        >
          <Trans>Skip and import clients first</Trans>
        </Button>
        <div className="flex-1" />
        {onBack ? (
          <Button variant="outline" onClick={onBack}>
            <Trans>Back</Trans>
          </Button>
        ) : null}
        <Button render={onReview ? undefined : <Link to="/rules/library" />} onClick={onReview}>
          <Trans>Review {codeList} now</Trans>
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
