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
import { StateRuleActivationSelector } from '@/features/onboarding/state-rule-activation-selector'
import { FirmTimezoneSelect, resolveUSFirmTimezone } from '@/features/firm/timezone-select'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { type AuthUser } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { activateOrCreateOnboardingFirm, postOnboardingTarget } from './onboarding-firm-flow'

const MIN_NAME_LENGTH = 2
const DEFAULT_FIRM_TIMEZONE = 'America/New_York'

type OnboardingLoaderData = { user: AuthUser }

// The redesign (Pencil E76U6Q) frames firm setup as step 1 of a three-beat
// flow (Practice → Rules → Clients). Steps 2 and 3 are the migration importer
// at /migration/new, which `handleSubmit` already navigates to once the firm is
// created — so the indicator is a true progress affordance, not decoration.
const ONBOARDING_STEPS = ['Practice', 'Rules', 'Clients'] as const
const ACTIVE_STEP_INDEX = 0

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

function StepIndicator({
  steps,
  activeIndex,
}: {
  steps: readonly (typeof ONBOARDING_STEPS)[number][]
  activeIndex: number
}) {
  const { t } = useLingui()
  const stepLabels: Record<(typeof ONBOARDING_STEPS)[number], string> = {
    Practice: t`Practice`,
    Rules: t`Rules`,
    Clients: t`Clients`,
  }
  return (
    <ol className="flex shrink-0 items-center gap-2">
      {steps.map((step, index) => {
        const active = index === activeIndex
        return (
          <li key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  'flex size-[18px] items-center justify-center rounded-full border font-mono text-[10px] font-bold tabular-nums',
                  active
                    ? 'border-state-accent-solid bg-state-accent-solid text-text-inverted'
                    : 'border-divider-regular bg-background-default text-text-muted',
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'text-caption',
                  active ? 'font-semibold text-text-primary' : 'font-medium text-text-muted',
                )}
              >
                {stepLabels[step]}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span aria-hidden className="h-px w-6 shrink-0 bg-divider-regular" />
            ) : null}
          </li>
        )
      })}
    </ol>
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
    <div className="flex items-center gap-1.5">
      <FieldLabel
        htmlFor={htmlFor}
        className="whitespace-nowrap text-[13px] font-semibold text-text-primary"
      >
        {label}
      </FieldLabel>
      <span aria-hidden className="h-px flex-1" />
      <span className="shrink-0 text-caption font-medium text-text-muted">{hint}</span>
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

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-6">
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-text-primary font-mono text-[11px] font-bold text-text-inverted"
          >
            DDHQ
          </span>
          <span className="text-sm font-semibold text-text-primary">DueDateHQ</span>
        </div>
        <div className="ms-auto">
          <StepIndicator steps={ONBOARDING_STEPS} activeIndex={ACTIVE_STEP_INDEX} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.5px] text-text-primary">
          <Trans>Set up your practice</Trans>
        </h1>
        <p className="max-w-prose text-sm font-medium leading-relaxed text-text-tertiary">
          <Trans>
            Five fields the engine needs before it can schedule anything. Edit anytime in Settings.
          </Trans>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="contents">
        <div className="flex flex-col gap-4 rounded-xl border border-divider-subtle bg-background-default p-5 sm:px-7 sm:py-[22px]">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                hint={t`days before the official due date`}
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
              hint={t`drives when alerts and digests send`}
            />
            <FirmTimezoneSelect id="firm-timezone" value={timezone} onValueChange={setTimezone} />
          </Field>

          <StateRuleActivationSelector
            selected={selectedRuleStates}
            onChange={setSelectedRuleStates}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-caption font-medium text-text-muted">
            <Trans>
              DueDateHQ will create filing plans from the first applicable deadline on or after your
              monitoring start date. By continuing you agree to the Terms and Privacy Policy.
            </Trans>
          </p>
          <Button
            type="submit"
            className="shrink-0 gap-1.5 px-7"
            disabled={submitting || monitoringStartDateInvalid}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
                <span>
                  <Trans>Setting up your practice…</Trans>
                </span>
              </>
            ) : (
              <>
                <span>
                  <Trans>Create practice · activate jurisdictions</Trans>
                </span>
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
