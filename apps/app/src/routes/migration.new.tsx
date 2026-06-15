import { useState } from 'react'
import { Plural, Trans } from '@lingui/react/macro'
import { ArrowLeftIcon, CheckCircle2Icon, FileSpreadsheetIcon, GaugeIcon } from 'lucide-react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import type { FirmPublic } from '@duedatehq/contracts'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { OnboardingSkipModal } from '@/features/migration/OnboardingSkipModal'
import { Wizard } from '@/features/migration/Wizard'
import { PermissionGate, useFirmPermission } from '@/features/permissions/permission-gate'
import type { AuthUser } from '@/lib/auth'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'

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
  const isOnboardingSource = params.get('source') === 'onboarding'
  const skipToDashboard = () => {
    // Skipping the importer is a meaningful onboarding-funnel drop-off (they
    // reach the app with zero clients → empty dashboard).
    if (isOnboardingSource) {
      track(ANALYTICS_EVENTS.onboardingSkipped, { from_step: 'import' })
    }
    void navigate('/')
  }
  // Back is conditional. When source=onboarding, the
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
          showOnboardingProgress={isOnboardingSource}
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
    // Use the canonical `<PermissionGate>` panel (same as Members,
    // Billing, Audit) rather than a bespoke destructive Alert: same
    // role-derivation pipeline, same return-to-Today CTA, no drift when
    // FIRM_PERMISSION_ROLES changes.
    return (
      <div className="mx-auto flex w-full max-w-page-narrow flex-col gap-4 px-4 pt-8 pb-6 md:px-6">
        <MigrationActivationIntro
          onSkip={skipToDashboard}
          onReviewRules={reviewRules}
          showRuleReviewAction={!isOnboardingSource}
          showOnboardingProgress={isOnboardingSource}
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
  // In the onboarding chain, "Skip for now" opens the comparison
  // skip-confirmation modal instead of leaving immediately. Outside
  // onboarding the wizard's own discard prompt handles the close.
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
            showOnboardingProgress={isOnboardingSource}
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

// Mirrors the onboarding route's `StepDots` (onboarding.tsx) so the import
// step reads as the SAME journey, not a different product. When a user
// arrives here via source=onboarding, this resolves the "Step N of 3"
// promise that otherwise vanished when onboarding handed off to the wizard
// (2026-06-12 critique: the importer's own 4-step pill Stepper is the
// SUB-progress of this single onboarding step, not a competing count).
function OnboardingStepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-3 flex items-center gap-3.5">
      <span className="text-[11px] font-semibold tracking-[1.4px] text-text-tertiary uppercase">
        <Trans>
          Step {step} of {total}
        </Trans>
      </span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={index}
            aria-hidden
            className={cn(
              'size-1.5 rounded-full',
              index + 1 === step ? 'bg-state-accent-solid' : 'bg-divider-regular',
            )}
          />
        ))}
      </div>
    </div>
  )
}

function MigrationActivationIntro({
  onSkip,
  onReviewRules,
  showRuleReviewAction = true,
  showOnboardingProgress = false,
  ruleReviewCount,
  onBack,
}: {
  onSkip: () => void
  onReviewRules: () => void
  showRuleReviewAction?: boolean | undefined
  // When true, render the "Step 3 of 3" onboarding-journey indicator above
  // the eyebrow. Import is the third onboarding step (Practice → Rules →
  // Clients); the 3-count is fixed even when rule-review auto-skips.
  showOnboardingProgress?: boolean | undefined
  ruleReviewCount: number
  onBack?: (() => void) | undefined
}) {
  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        {showOnboardingProgress ? <OnboardingStepDots step={3} total={3} /> : null}
        {/* "← Back" surfaces on the leading edge when there's a real
            previous surface to return to. Suppressed when
            source=onboarding (one-shot chain; history-back would loop).
            Visually nests above the eyebrow so it reads as page-level
            navigation, not as a second eyebrow. */}
        {onBack ? (
          // TextLink primitive (variant="muted") — the canonical
          // muted-link treatment, with a slightly quieter rest tone
          // (text-text-muted).
          <TextLink onClick={onBack} className="mb-2">
            <ArrowLeftIcon className="size-3.5" aria-hidden />
            <Trans>Back</Trans>
          </TextLink>
        ) : null}
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-tint px-2.5 py-1 font-mono text-caption tracking-[0.16em] text-accent-text">
          <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-accent-default" />
          <Trans>PRACTICE ACTIVATION</Trans>
        </span>
        {/* H1 is text-2xl to match the entry-shell family (login uses
            text-2xl, onboarding uses text-2xl). Trailing period
            intentionally kept — login ("Welcome to DueDateHQ.") and
            onboarding ("We pre-filled a name from your account.") both
            end H1s with a period as part of the entry-shell declarative
            voice. The H1 frames the page's purpose ("Activate your
            practice.") mirroring the eyebrow; the description names the
            outcomes once. */}
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">
          <Trans>Activate your practice.</Trans>
        </h1>
        <p className="mt-1 max-w-4xl text-sm leading-relaxed text-text-secondary">
          <Trans>
            Import your client list to generate deadlines and unlock the first Today risk view.
          </Trans>
        </p>
        {/* The three outcome chips (Import / Deadlines / Risk view)
            surface "what activation includes" but must NOT be in a
            step-shaped row — that would compete visually with the
            4-step Stepper rendered inside the wizard card. Rendered as
            a quiet icon + label row at body type with bullet separators
            — no rounded background, no count slot, no fixed pill — so it
            reads as a description list, not as numbered steps. Sits
            BELOW the descriptive paragraph so it elaborates on "import /
            deadlines / risk view" the sentence already named. */}
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

      {/* "Skip for now" is a ghost button, not outline: an outline's
          weight (equal to Continue inside the wizard frame below) read
          as a primary action competing with Continue. Ghost makes it a
          quiet lateral exit. The tooltip carries the reassurance about
          where to find import later. */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              // `text-text-tertiary` on idle so Skip reads as a quiet
              // lateral escape rather than at the same weight as page
              // body copy. Hover keeps the canonical ghost background so
              // the affordance still confirms when pointed at — only the
              // resting state is dimmer.
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
