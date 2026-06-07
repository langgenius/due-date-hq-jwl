import { useState } from 'react'
import { Plural, Trans } from '@lingui/react/macro'
import { ArrowLeftIcon, CheckCircle2Icon, FileSpreadsheetIcon, GaugeIcon } from 'lucide-react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import type { FirmPublic } from '@duedatehq/contracts'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { OnboardingSkipModal } from '@/features/migration/OnboardingSkipModal'
import { Wizard } from '@/features/migration/Wizard'
import { PermissionGate, useFirmPermission } from '@/features/permissions/permission-gate'
import type { AuthUser } from '@/lib/auth'

type MigrationNewLoaderData = {
  user: AuthUser
  firm?: FirmPublic | null | undefined
}

export function MigrationNewRoute() {
  const { firm } = useLoaderData<MigrationNewLoaderData>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const permission = useFirmPermission(firm)
  const canRunMigration = permission.can('migration.run')
  const skipToDashboard = () => void navigate('/')
  const isOnboardingSource = params.get('source') === 'onboarding'
  // 2026-05-29 (R4 migration polish #10): "should there be a back
  // option?" — yes, but conditionally. When source=onboarding, the
  // logical chain is signup → onboarding (one-shot, now complete)
  // → migration; there's nothing to go back to (history-back would
  // hit /onboarding which redirects right back here). For other
  // entry points (e.g. "Import clients" CTA from /today), the prior
  // page is a real, mountable surface — `navigate(-1)` works.
  const goBack = () => void navigate(-1)
  const showBack = !isOnboardingSource
  const ruleReviewCount = parseRuleReviewCount(params.get('ruleReview'))
  const ruleReviewJurisdictions = parseRuleReviewJurisdictions(params.get('ruleReviewJur'))
  const reviewRules = () => {
    const target = new URL('/rules/library', 'http://duedatehq.local')
    target.searchParams.set('view', 'rules')
    target.searchParams.set('library', 'pending_review')
    if (ruleReviewJurisdictions.length === 1) {
      target.searchParams.set('jur', ruleReviewJurisdictions[0]!)
    }
    void navigate(`${target.pathname}${target.search}`)
  }

  if (permission.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-8 pb-6 md:px-6">
        <MigrationActivationIntro
          onSkip={skipToDashboard}
          onReviewRules={reviewRules}
          showRuleReviewAction={!isOnboardingSource}
          ruleReviewCount={ruleReviewCount}
          onBack={showBack ? goBack : undefined}
        />
        <div className="rounded-xl border border-divider-regular bg-components-panel-bg p-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-4 h-52 w-full" />
        </div>
      </div>
    )
  }

  if (!canRunMigration) {
    // Audit-drain ρ ROH-D7 (2026-05-27): replaced the bespoke
    // destructive Alert ("Owner or manager access required" —
    // partner missing AND custom typography) with the canonical
    // `<PermissionGate>` panel used everywhere else (Members,
    // Billing, Audit). Same role-derivation pipeline, same
    // return-to-Today CTA, no more drift when FIRM_PERMISSION_ROLES
    // changes.
    return (
      <div className="mx-auto flex w-full max-w-page-narrow flex-col gap-4 px-4 pt-8 pb-6 md:px-6">
        <MigrationActivationIntro
          onSkip={skipToDashboard}
          onReviewRules={reviewRules}
          showRuleReviewAction={!isOnboardingSource}
          ruleReviewCount={ruleReviewCount}
          onBack={showBack ? goBack : undefined}
        />
        <PermissionGate
          permission="migration.run"
          firm={firm ?? null}
          description={
            <Trans>
              Client migration changes practice data, evidence, and audit records. Contact a
              practice owner if you need access.
            </Trans>
          }
        >
          <div />
        </PermissionGate>
      </div>
    )
  }

  return (
    <HotkeysProvider>
      <ActivationWizard
        isOnboardingSource={isOnboardingSource}
        onReviewRules={reviewRules}
        ruleReviewCount={ruleReviewCount}
        onBack={showBack ? goBack : undefined}
        onSkipToDashboard={skipToDashboard}
      />
    </HotkeysProvider>
  )
}

function ActivationWizard({
  isOnboardingSource,
  onReviewRules,
  ruleReviewCount,
  onBack,
  onSkipToDashboard,
}: {
  isOnboardingSource: boolean
  onReviewRules: () => void
  ruleReviewCount: number
  onBack?: (() => void) | undefined
  onSkipToDashboard: () => void
}) {
  // 2026-06-07 (Cluster 3 — design iAJhJ): in the onboarding chain, "Skip
  // for now" opens the comparison skip-confirmation modal instead of leaving
  // immediately. Outside onboarding the wizard's own discard prompt handles
  // the close.
  const [skipModalOpen, setSkipModalOpen] = useState(false)

  return (
    <>
      <Wizard
        open
        variant="route"
        intro={({ onSkip }) => (
          <MigrationActivationIntro
            onSkip={isOnboardingSource ? () => setSkipModalOpen(true) : onSkip}
            onReviewRules={onReviewRules}
            showRuleReviewAction={!isOnboardingSource}
            ruleReviewCount={ruleReviewCount}
            onBack={onBack}
          />
        )}
        onClose={onSkipToDashboard}
      />
      {isOnboardingSource ? (
        <OnboardingSkipModal
          open={skipModalOpen}
          onOpenChange={setSkipModalOpen}
          onConfirmSkip={() => {
            setSkipModalOpen(false)
            onSkipToDashboard()
          }}
        />
      ) : null}
    </>
  )
}

function parseRuleReviewCount(value: string | null): number {
  const parsed = Number.parseInt(value ?? '0', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function parseRuleReviewJurisdictions(value: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function MigrationActivationIntro({
  onSkip,
  onReviewRules,
  showRuleReviewAction = true,
  ruleReviewCount,
  onBack,
}: {
  onSkip: () => void
  onReviewRules: () => void
  showRuleReviewAction?: boolean | undefined
  ruleReviewCount: number
  onBack?: (() => void) | undefined
}) {
  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        {/* 2026-05-29 (R4 migration polish #10): "← Back" surfaces on
            the leading edge when there's a real previous surface to
            return to. Suppressed when source=onboarding (one-shot
            chain; history-back would loop). Visually nests above the
            eyebrow so it reads as page-level navigation, not as a
            second eyebrow. */}
        {onBack ? (
          // 2026-06-01: swapped hand-rolled back-link button for
          // TextLink primitive (variant="muted"). Accepts the slightly
          // quieter rest tone (text-text-muted vs the original
          // text-text-tertiary) to consolidate on the canonical
          // muted-link treatment.
          <TextLink onClick={onBack} className="mb-2">
            <ArrowLeftIcon className="size-3.5" aria-hidden />
            <Trans>Back</Trans>
          </TextLink>
        ) : null}
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-tint px-2.5 py-1 font-mono text-caption tracking-[0.16em] text-accent-text">
          <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-accent-default" />
          <Trans>PRACTICE ACTIVATION</Trans>
        </span>
        {/* 2026-05-29 (R4 migration polish #4): H1 sized up to
            text-2xl to match the entry-shell family (login uses
            text-[26px], onboarding uses text-2xl; this page was
            stuck at text-xl). Trailing period intentionally kept —
            login ("Welcome to DueDateHQ.") and onboarding ("We
            pre-filled a name from your account.") both end H1s with
            a period as part of the entry-shell declarative voice.

            2026-05-29 (R4 migration polish #3 + #5): copy tightened.
            Old H1 named two verbs ("Import your clients and generate
            deadlines.") that the description then re-listed. New H1
            frames the page's purpose ("Activate your practice.")
            mirroring the eyebrow; the description names the
            outcomes once. */}
        <h1 className="mt-3 text-2xl font-semibold leading-[1.15] tracking-tight text-text-primary">
          <Trans>Activate your practice.</Trans>
        </h1>
        <p className="mt-1 max-w-4xl text-sm leading-relaxed text-text-secondary">
          <Trans>
            Import your client list to generate deadlines and unlock the first Today risk view.
          </Trans>
        </p>
        {/* 2026-05-29 (R4 follow-up — Yuqi "PRACTICE ACTIVATION should
            still signal the three highlights we had"): the three
            outcome chips (Import / Deadlines / Risk view) were removed
            in the previous round because they competed visually with
            the 4-step Stepper rendered inside the wizard card. The
            user still wants the three outcomes to surface up here as
            "what activation includes," just NOT in a step-shaped row.
            Brought back as a quiet icon + label row at body type with
            bullet separators — no rounded background, no count
            slot, no fixed pill — so it reads as a description list,
            not as numbered steps. Sits BELOW the descriptive
            paragraph so it elaborates on "import / deadlines / risk
            view" the sentence already named. */}
        <div
          role="list"
          aria-label="Practice activation outcomes"
          className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary"
        >
          <span role="listitem" className="inline-flex items-center gap-1.5">
            <FileSpreadsheetIcon aria-hidden className="size-4 text-text-accent" />
            <Trans>Import</Trans>
          </span>
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <span role="listitem" className="inline-flex items-center gap-1.5">
            <CheckCircle2Icon aria-hidden className="size-4 text-text-accent" />
            <Trans>Deadlines</Trans>
          </span>
          <span aria-hidden className="text-text-tertiary">
            ·
          </span>
          <span role="listitem" className="inline-flex items-center gap-1.5">
            <GaugeIcon aria-hidden className="size-4 text-text-accent" />
            <Trans>Risk view</Trans>
          </span>
        </div>
        {ruleReviewCount > 0 ? (
          <Alert className="mt-4 max-w-4xl">
            <AlertTitle>
              <Trans>Rule review needed before some due dates can be generated</Trans>
            </AlertTitle>
            <AlertDescription>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <Plural
                    value={ruleReviewCount}
                    one="# rule is queued for due-date review before it can become active and create client deadlines."
                    other="# rules are queued for due-date review before they can become active and create client deadlines."
                  />
                </span>
                {showRuleReviewAction ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit shrink-0"
                    onClick={onReviewRules}
                  >
                    <Trans>Review rules</Trans>
                  </Button>
                ) : null}
              </div>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      {/* 2026-05-29 (R4 migration polish #2): "Skip for now" was
          variant="outline" — bordered, filled, weight equal to
          Continue inside the wizard frame below. That weight
          encouraged users to read it as a primary action competing
          with Continue. Dropped to ghost so it reads as a quiet
          lateral exit. Tooltip stays — it carries the reassurance
          about where to find import later. */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              // 2026-05-29 (Yuqi — "dimmed skip"): the ghost button still
              // inherited `text-text-primary` on idle so Skip read at the
              // same weight as page body copy and competed for the eye.
              // Dropped to `text-text-tertiary` so the button reads as a
              // quiet lateral escape. Hover keeps the canonical ghost
              // background so the affordance still confirms when pointed
              // at — only the resting state is dimmer.
              className="w-fit shrink-0 text-text-tertiary"
              onClick={onSkip}
            >
              <Trans>Skip for now</Trans>
            </Button>
          }
        />
        <TooltipContent className="max-w-[260px]">
          <Trans>You can import later from Today, Clients, or the Command Palette (⌘K).</Trans>
        </TooltipContent>
      </Tooltip>
    </header>
  )
}
