import { useMemo, useState, type SyntheticEvent } from 'react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, Loader2Icon } from 'lucide-react'

import { derivePracticeName } from '@duedatehq/core/practice-name'
import {
  DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  MAX_INTERNAL_DEADLINE_OFFSET_DAYS,
  MIN_INTERNAL_DEADLINE_OFFSET_DAYS,
  type RuleGenerationState,
} from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Field, FieldError, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import { cn } from '@duedatehq/ui/lib/utils'
import { CenteredAuthScreen } from '@/features/auth/auth-chrome'
import { RuleReviewPrompt } from '@/features/onboarding/rule-review-prompt'
import { StateRuleActivationSelector } from '@/features/onboarding/state-rule-activation-selector'
import { FirmTimezoneSelect, resolveUSFirmTimezone } from '@/features/firm/timezone-select'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { type AuthUser } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { activateOrCreateOnboardingFirm, postOnboardingTarget } from './onboarding-firm-flow'

const MIN_NAME_LENGTH = 2
const DEFAULT_FIRM_TIMEZONE = 'America/New_York'
const ONBOARDING_STEP_COUNT = 3

type OnboardingLoaderData = { user: AuthUser }

function isInAppPath(value: string | null): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//')
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object' || !('message' in error)) return fallback
  const message = Reflect.get(error, 'message')
  return typeof message === 'string' && message ? message : fallback
}

function todayInTimezone(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

// Step dots — matches the E76U6Q "STEP 1 OF 3" affordance. Steps 2 and 3 are the
// migration importer at /migration/new (chained from handleSubmit), so this is a
// real progress indicator, not decoration.
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-3.5">
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

function FieldHeaderRow({
  label,
  hint,
  htmlFor,
}: {
  label: string
  hint: string
  htmlFor: string
}) {
  return (
    <div className="flex items-center gap-2">
      <FieldLabel htmlFor={htmlFor} className="text-xs font-semibold text-text-secondary">
        {label}
      </FieldLabel>
      <span aria-hidden className="h-px flex-1" />
      <span className="shrink-0 text-[11px] font-medium italic text-text-muted">{hint}</span>
    </div>
  )
}

export function OnboardingRoute() {
  const { user } = useLoaderData<OnboardingLoaderData>()
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const switchMutation = useMutation(orpc.firms.switchActive.mutationOptions())
  const createMutation = useMutation(orpc.firms.create.mutationOptions())
  const activateRulesMutation = useMutation(
    orpc.rules.activateOnboardingJurisdictions.mutationOptions(),
  )

  const fallback = t`My Practice`
  const defaultName = useMemo(
    () => derivePracticeName({ name: user.name, email: user.email }, fallback),
    [user.name, user.email, fallback],
  )
  const [name, setName] = useState(defaultName)
  const [timezone, setTimezone] = useState(() => resolveUSFirmTimezone(DEFAULT_FIRM_TIMEZONE))
  const [internalDeadlineOffsetDays, setInternalDeadlineOffsetDays] = useState(
    DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  )
  const today = todayInTimezone(timezone)
  const [monitoringStartDate, setMonitoringStartDate] = useState(today)
  const [selectedRuleStates, setSelectedRuleStates] = useState<RuleGenerationState[]>([])
  // Step 2 (rule review) data — set after creation when jurisdictions need a
  // source-defined-calendar review. Null while on the firm-setup step.
  const [review, setReview] = useState<{ jurisdictions: string[]; totalActivated: number } | null>(
    null,
  )
  const monitoringStartDateInvalid =
    !isValidIsoDate(monitoringStartDate) || monitoringStartDate > today

  const redirectToParam = params.get('redirectTo')
  const redirectTo = isInAppPath(redirectToParam) ? redirectToParam : '/'

  const submitting = isSubmitting || activateRulesMutation.isPending

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)

    const trimmed = name.trim()
    if (trimmed.length < MIN_NAME_LENGTH) {
      setError(t`Please enter at least 2 characters.`)
      return
    }
    if (
      internalDeadlineOffsetDays < MIN_INTERNAL_DEADLINE_OFFSET_DAYS ||
      internalDeadlineOffsetDays > MAX_INTERNAL_DEADLINE_OFFSET_DAYS
    ) {
      setError(t`Internal deadline offset must be between 0 and 365 days.`)
      return
    }
    if (monitoringStartDateInvalid) {
      return
    }

    setIsSubmitting(true)
    void activateOrCreateOnboardingFirm({
      name: trimmed,
      timezone,
      internalDeadlineOffsetDays,
      monitoringStartDate,
      gateway: {
        listMine: () =>
          queryClient.fetchQuery(orpc.firms.listMine.queryOptions({ input: undefined })),
        switchActive: (input) => switchMutation.mutateAsync(input),
        create: (input) => createMutation.mutateAsync(input),
        activateOnboardingJurisdictions: (input) => activateRulesMutation.mutateAsync(input),
      },
      selectedRuleStates,
    })
      .then(async (result) => {
        await queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        await queryClient.invalidateQueries({ queryKey: orpc.rules.key() })
        // If activation flagged jurisdictions for source-defined-calendar
        // review, pause on step 2 (the rule-review prompt) before the importer.
        const activation = result.kind === 'created' ? result.ruleActivation : null
        if (activation && activation.reviewRequiredCount > 0) {
          setReview({
            jurisdictions: activation.reviewRequiredJurisdictions,
            totalActivated: activation.activatedCount,
          })
          return
        }
        await navigate(postOnboardingTarget(result, redirectTo), { replace: true })
      })
      .catch((err: unknown) => {
        const message = readErrorMessage(
          err,
          t`Check your network and try again. If this keeps happening, contact support.`,
        )
        setError(message)
        toast.error(t`Couldn't create your practice`, { description: message })
      })
      .finally(() => setIsSubmitting(false))
  }

  // Step 2 — rule review (only when activation flagged jurisdictions). The firm
  // is already created at this point, so there's no "back"; both actions move
  // forward (review the rules now, or skip to the client importer).
  if (review) {
    return (
      <CenteredAuthScreen>
        <div className="flex w-full max-w-[720px] flex-col items-center gap-7">
          <StepDots step={2} total={ONBOARDING_STEP_COUNT} />
          <RuleReviewPrompt
            totalRulesActivated={review.totalActivated}
            jurisdictions={review.jurisdictions.map((code) => ({ code }))}
            onReview={() => void navigate('/rules/library')}
            onSkip={() => void navigate('/migration/new?source=onboarding', { replace: true })}
          />
        </div>
      </CenteredAuthScreen>
    )
  }

  return (
    <CenteredAuthScreen>
      <div className="flex w-full max-w-[560px] flex-col items-center gap-7">
        <StepDots step={1} total={ONBOARDING_STEP_COUNT} />

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex w-full flex-col gap-7 rounded-[20px] border border-divider-subtle bg-background-default px-6 py-10 lg:px-14 lg:py-12"
        >
          {/* Heading */}
          <div className="flex flex-col gap-2">
            <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.6px] text-text-primary">
              <Trans>Set up your practice</Trans>
            </h1>
            <p className="text-sm font-medium leading-normal text-text-tertiary">
              <Trans>
                A few details the engine needs before it can schedule anything. You can change any
                of this later in Settings.
              </Trans>
            </p>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-5">
            <Field>
              <FieldHeaderRow
                htmlFor="practice-name"
                label={t`Practice name`}
                hint={t`required, 2+ characters`}
              />
              <Input
                id="practice-name"
                name="name"
                autoFocus
                autoComplete="organization"
                required
                minLength={MIN_NAME_LENGTH}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t`e.g. Brightline CPA`}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'practice-name-error' : undefined}
              />
              {error ? <FieldError id="practice-name-error">{error}</FieldError> : null}
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field>
                <FieldHeaderRow
                  htmlFor="monitoring-start-date"
                  label={t`Monitoring start date`}
                  hint={t`ISO date`}
                />
                <IsoDatePicker
                  id="monitoring-start-date"
                  value={monitoringStartDate}
                  maxIsoDate={today}
                  invalid={monitoringStartDateInvalid}
                  ariaLabel={t`Select monitoring start date`}
                  onValueChange={setMonitoringStartDate}
                />
                {monitoringStartDateInvalid ? (
                  <FieldError>
                    <Trans>Monitoring start date cannot be in the future.</Trans>
                  </FieldError>
                ) : null}
              </Field>

              <Field>
                <FieldHeaderRow
                  htmlFor="internal-deadline-offset"
                  label={t`Internal deadline offset`}
                  hint={t`days early`}
                />
                <Input
                  id="internal-deadline-offset"
                  name="internalDeadlineOffsetDays"
                  type="number"
                  min={MIN_INTERNAL_DEADLINE_OFFSET_DAYS}
                  max={MAX_INTERNAL_DEADLINE_OFFSET_DAYS}
                  step={1}
                  value={internalDeadlineOffsetDays}
                  onChange={(event) =>
                    setInternalDeadlineOffsetDays(Number.parseInt(event.target.value || '0', 10))
                  }
                />
              </Field>
            </div>

            <Field>
              <FieldHeaderRow
                htmlFor="firm-timezone"
                label={t`Time zone`}
                hint={t`drives alert + digest timing`}
              />
              <FirmTimezoneSelect id="firm-timezone" value={timezone} onValueChange={setTimezone} />
            </Field>

            <StateRuleActivationSelector
              selected={selectedRuleStates}
              onChange={setSelectedRuleStates}
            />
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              className="h-12 w-full justify-center gap-2 rounded-[10px] font-semibold"
              disabled={submitting || monitoringStartDateInvalid}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                  <Trans>Setting up your practice…</Trans>
                </>
              ) : (
                <>
                  <Trans>Create practice &amp; activate jurisdictions</Trans>
                  <ArrowRightIcon className="size-4" aria-hidden />
                </>
              )}
            </Button>
            <p className="text-center text-[11px] font-medium leading-relaxed text-text-muted">
              <Trans>
                DueDateHQ schedules filing plans from the first applicable deadline on or after your
                monitoring start date. By continuing you agree to the Terms and Privacy Policy.
              </Trans>
            </p>
          </div>
        </form>
      </div>
    </CenteredAuthScreen>
  )
}
