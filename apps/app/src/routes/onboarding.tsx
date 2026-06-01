import { useMemo, useState, type SyntheticEvent } from 'react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronRightIcon, Loader2Icon } from 'lucide-react'

import { derivePracticeName } from '@duedatehq/core/practice-name'
import {
  DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  MAX_INTERNAL_DEADLINE_OFFSET_DAYS,
  MIN_INTERNAL_DEADLINE_OFFSET_DAYS,
  type RuleGenerationState,
} from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import { StateRuleActivationSelector } from '@/features/onboarding/state-rule-activation-selector'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { type AuthUser } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { activateOrCreateOnboardingFirm, postOnboardingTarget } from './onboarding-firm-flow'

const MIN_NAME_LENGTH = 2
const DEFAULT_FIRM_TIMEZONE = 'America/New_York'

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
  const [internalDeadlineOffsetDays, setInternalDeadlineOffsetDays] = useState(
    DEFAULT_INTERNAL_DEADLINE_OFFSET_DAYS,
  )
  const today = todayInTimezone(DEFAULT_FIRM_TIMEZONE)
  const [monitoringStartDate, setMonitoringStartDate] = useState(today)
  const [selectedRuleStates, setSelectedRuleStates] = useState<RuleGenerationState[]>([])
  const monitoringStartDateInvalid =
    !isValidIsoDate(monitoringStartDate) || monitoringStartDate > today

  const redirectToParam = params.get('redirectTo')
  const redirectTo = isInAppPath(redirectToParam) ? redirectToParam : '/'

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
    // 2026-05-29 (R4 onboarding polish #9): max-w stays at 400px. The
    // state grid (11 cols × 28px tile + 4px gap × 10 + 24px wrapper
    // pad ≈ 372px) is the natural width floor; everything else (input,
    // CTA, copy) reads comfortably at 400. Wider would push the tile
    // grid off-center and start to feel like a marketing splash.
    <div className="flex w-full max-w-[400px] flex-col">
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-tint px-2.5 py-1 font-mono text-caption tracking-[0.16em] text-accent-text">
        <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-accent-default" />
        <Trans>PRACTICE PROFILE</Trans>
      </span>

      {/* 2026-05-29 (R4 onboarding polish #1): hierarchy flip. The old
          H1 ("Set up your practice.") restated the eyebrow pill
          ("PRACTICE PROFILE") and pushed the actual informative copy
          ("we pre-filled a name…") into a smaller secondary line. The
          pre-fill explanation IS the page's purpose — it tells the
          user why they're seeing an editable field and what the system
          already did for them. Promoted to H1; the redundant
          action-framing headline is dropped. The "change it later"
          half of the original copy was demoted to the input's helper
          text (#3) so the H1 stays one sentence. */}
      <h1 className="mt-5 text-2xl font-semibold leading-[1.15] tracking-tight text-text-primary">
        <Trans>We pre-filled a name from your account.</Trans>
      </h1>

      <form onSubmit={handleSubmit} noValidate className="contents">
        {/* 2026-05-29 (R4 onboarding polish #7): the practice-name
            field used to sit at mt-8 from the trust pill. With the
            pill moved down (#2) and the secondary paragraph removed
            (#1), mt-7 keeps proportional breathing room from H1 →
            input without feeling marketing-loose. */}
        {/* 2026-06-01: practice-name now uses Field + FieldLabel +
            FieldError/FieldDescription so the helper/error toggle and
            describedby wiring come from the primitive. */}
        <Field className="mt-7">
          <FieldLabel htmlFor="practice-name">
            <Trans>Practice name</Trans>
          </FieldLabel>
          <Input
            id="practice-name"
            name="name"
            autoFocus
            autoComplete="organization"
            required
            minLength={MIN_NAME_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t`e.g. Bright CPA Practice`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'practice-name-error' : 'practice-name-helper'}
          />
          {error ? (
            <FieldError id="practice-name-error">{error}</FieldError>
          ) : (
            // 2026-05-29 (R4 onboarding polish #3): added "You can
            // change it later" to absorb the "change it now or anytime
            // in Practice profile" copy that used to live in the
            // sub-headline. Helper text is the right home for
            // reversibility reassurance — it sits next to the field
            // the user is deciding about.
            <FieldDescription id="practice-name-helper">
              <Trans>This is what your team and clients will see. You can change it later.</Trans>
            </FieldDescription>
          )}
        </Field>

        <StateRuleActivationSelector
          selected={selectedRuleStates}
          onChange={setSelectedRuleStates}
        />

        <Field className="mt-5">
          <FieldLabel htmlFor="monitoring-start-date">
            <Trans>Monitoring start date</Trans>
          </FieldLabel>
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
          <FieldDescription>
            <Trans>
              DueDateHQ will create filing plans from the first applicable deadline on or after this
              date. Earlier statutory deadlines will not be added to your active overdue queue.
            </Trans>
          </FieldDescription>
        </Field>

        <Field className="mt-5">
          {/* 2026-05-26 (Step 7 onboarding audit F5-04 + F5-05 +
              F5-01 + F7-02): the field had three independent
              issues. (1) label "Internal deadline" is jargon for
              a first-run user; (2) input shows a bare number
              with no unit; (3) helper text didn't anchor the
              default or hint at "most practices use…" — every
              user had to research what was a sensible value.
              Renamed label to "Internal deadline lead time"
              (slight expansion teaches the concept), and
              rewrote the helper to lead with the unit, name the
              default, and call out the recalc-on-change
              consequence that the /practice page already
              mentions. The field still reads as one number, but
              now the user knows what they're choosing. */}
          <FieldLabel htmlFor="internal-deadline-offset">
            <Trans>Internal deadline lead time</Trans>
          </FieldLabel>
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
            aria-describedby="internal-deadline-offset-helper"
          />
          <FieldDescription id="internal-deadline-offset-helper">
            <Trans>
              Days before each statutory deadline that work shows as due. Most practices use 5–14
              days. Changing this later recalculates current deadlines.
            </Trans>
          </FieldDescription>
        </Field>

        <Button
          type="submit"
          className="mt-5 w-full justify-center gap-2"
          disabled={isSubmitting || activateRulesMutation.isPending || monitoringStartDateInvalid}
          aria-busy={isSubmitting || activateRulesMutation.isPending}
        >
          {isSubmitting || activateRulesMutation.isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              <span>
                <Trans>Setting up your practice…</Trans>
              </span>
            </>
          ) : (
            <>
              <span>
                <Trans>Continue</Trans>
              </span>
              <ChevronRightIcon className="size-4" aria-hidden />
            </>
          )}
        </Button>

        {/* 2026-05-26 (Step 6 UX audit #20): "Auto-saves" was a lie —
            the form only saves on Continue.
            2026-05-29 (R4 onboarding polish #2): pill returns to live
            with the Continue button. The F5-13 rationale (place
            reassurance *before* the CTA so the user reads it during
            decision time) was sound in isolation, but with the
            hierarchy flip (#1) the top of the page is now packed
            (eyebrow + H1 + input + state grid + offset field). The
            pill became one more thing competing for the user's eyes
            in the orientation zone. Co-locating with the CTA makes
            the literal claim "Saves on continue" map to the literal
            button being clicked — the phrase is now read AS the
            button's footnote, which is what it always meant. */}
        <p className="mt-3 inline-flex items-center gap-2 font-mono text-caption text-text-muted">
          <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-status-done" />
          <Trans>Encrypted · Saves on continue · Renamable later</Trans>
        </p>
      </form>
    </div>
  )
}
