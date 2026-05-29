import { Plural, Trans } from '@lingui/react/macro'
import { ArrowLeftIcon } from 'lucide-react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import type { FirmPublic } from '@duedatehq/contracts'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
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
      <Wizard
        open
        variant="route"
        intro={({ onSkip }) => (
          <MigrationActivationIntro
            onSkip={onSkip}
            onReviewRules={reviewRules}
            showRuleReviewAction={!isOnboardingSource}
            ruleReviewCount={ruleReviewCount}
            onBack={showBack ? goBack : undefined}
          />
        )}
        onClose={skipToDashboard}
      />
    </HotkeysProvider>
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
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1.5 rounded-sm text-caption text-text-tertiary outline-none transition-colors hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
          >
            <ArrowLeftIcon className="size-3.5" aria-hidden />
            <Trans>Back</Trans>
          </button>
        ) : null}
        {/* 2026-05-29 (R4 migration polish #1 + #5): the three
            ActivationOutcome chips (Import / Deadlines / Risk view)
            sat next to the eyebrow in a horizontal small-pill row.
            With the 4-step Stepper rendering identical small pills a
            few rows below, the chips read as steps competing with
            the wizard's actual progress indicator. The chips also
            duplicated the H1's verbs ("Import + generate
            deadlines") and the description's noun list ("deadlines,
            evidence, Today risk view"). Removed — the H1 + tightened
            description now carry the same signal once. */}
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
            <Button variant="ghost" size="sm" className="w-fit shrink-0" onClick={onSkip}>
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
