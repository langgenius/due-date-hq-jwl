import { Plural, Trans } from '@lingui/react/macro'
import { CheckCircle2Icon, FileSpreadsheetIcon, GaugeIcon } from 'lucide-react'
import type { ReactNode } from 'react'
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
}: {
  onSkip: () => void
  onReviewRules: () => void
  showRuleReviewAction?: boolean | undefined
  ruleReviewCount: number
}) {
  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-tint px-2.5 py-1 font-mono text-caption tracking-[0.16em] text-accent-text">
            <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-accent-default" />
            <Trans>PRACTICE ACTIVATION</Trans>
          </span>
          {/* 2026-05-27 (Step 7 onboarding audit F6-02): the
              three chips were ordered `facts → list → risk` and
              led with internal nouns. Reordered to the user's
              mental model (act → see → assess): Import →
              Deadlines → Risk view. "Today risk" was the
              hardest noun to parse for a first-time user — the
              chip describes the surface the import unlocks, not
              a metric, so renamed to "Risk view" (matches the
              dashboard column header). */}
          <ActivationOutcome
            icon={<FileSpreadsheetIcon aria-hidden className="size-3.5" />}
            label={<Trans>Import</Trans>}
          />
          <ActivationOutcome
            icon={<CheckCircle2Icon aria-hidden className="size-3.5" />}
            label={<Trans>Deadlines</Trans>}
          />
          <ActivationOutcome
            icon={<GaugeIcon aria-hidden className="size-3.5" />}
            label={<Trans>Risk view</Trans>}
          />
        </div>
        {/* 2026-05-26 (Step 7 onboarding audit F6-01): the
            headline used "deadline list" — a product-internal
            noun that doesn't appear anywhere else. The wizard's
            own footer says "Import & Generate"; the dashboard
            says "deadlines"; users say "deadlines". Aligned the
            headline to the verbs the wizard actually performs. */}
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-text-primary">
          <Trans>Import your clients and generate deadlines.</Trans>
        </h1>
        <p className="mt-1 max-w-4xl text-sm leading-relaxed text-text-secondary">
          <Trans>
            Your practice workspace is ready. Import a spreadsheet now to turn client facts into
            deadlines, evidence, and the first Today risk view. You can skip and import later from
            Today, Clients, or Command Palette.
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

      {/* Step 6 UX #138 (icon dropped — "Skip" is lateral, not
          continuation) + Step 7 F6-26 / F6-03 (Tooltip names the
          future import paths so the reassurance lands at the
          decision point, not just in the body paragraph above). */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="outline" size="sm" className="w-fit shrink-0" onClick={onSkip}>
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

function ActivationOutcome({ icon, label }: { icon: ReactNode; label: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-divider-subtle bg-background-body px-2 text-xs text-text-secondary">
      <span className="text-text-accent">{icon}</span>
      {label}
    </span>
  )
}
