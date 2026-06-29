import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
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
import { CenteredAuthScreen } from '@/features/auth/auth-chrome'
import { RuleReviewPrompt } from '@/features/onboarding/rule-review-prompt'
import { StepDots } from '@/features/onboarding/step-dots'
import {
  WelcomeOfferStep,
  type WelcomeOfferAnswers,
} from '@/features/onboarding/welcome-offer-step'
import { StateRuleActivationSelector } from '@/features/onboarding/state-rule-activation-selector'
import { FirmTimezoneSelect, resolveUSFirmTimezone } from '@/features/firm/timezone-select'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { type AuthUser } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'
import { ANALYTICS_EVENTS, consumeSignInMarker, track } from '@/lib/analytics'
import { activateOrCreateOnboardingFirm, postOnboardingTarget } from './onboarding-firm-flow'

const MIN_NAME_LENGTH = 2
const DEFAULT_FIRM_TIMEZONE = 'America/New_York'
const ONBOARDING_STEP_COUNT = 3
// Launch offer: claiming the welcome questionnaire grants this many months of the
// Team plan ("Get 3 months of Team, free"). Skipping it grants nothing.
const TEAM_TRIAL_MONTHS = 3

// Field rows rise in a quick top-down stagger on mount so the form reads as
// settling into place rather than appearing all at once. Reduced-motion is
// handled globally via the root <MotionConfig reducedMotion="user">.
const FIELD_COLUMN_VARIANTS = {
  show: { transition: { staggerChildren: 0.05 } },
} as const
const FIELD_ROW_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
} as const

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
      <span className="shrink-0 text-caption italic text-text-tertiary">{hint}</span>
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
  // Funnel starts on the welcome / launch-offer step; advancing (claim or skip)
  // moves to practice setup. The offer answers ride along to firm creation.
  const [phase, setPhase] = useState<'welcome' | 'practice'>('welcome')
  const [offerAnswers, setOfferAnswers] = useState<WelcomeOfferAnswers | null>(null)
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

  // Reaching /onboarding means a brand-new account with no firm yet, so this is
  // the new-user funnel start. Consume the sign-in marker here → "Signed Up"
  // (the app shell consumes it → "Signed In" for returning users; exactly one
  // wins). Fires once per mount.
  useEffect(() => {
    track(ANALYTICS_EVENTS.onboardingViewed, { step: 'welcome' })
    const marker = consumeSignInMarker()
    if (marker) {
      track(ANALYTICS_EVENTS.signedUp, { method: marker.method, is_invited: false })
    }
  }, [])

  const submitting = isSubmitting || activateRulesMutation.isPending

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)

    const trimmed = name.trim()
    if (trimmed.length < MIN_NAME_LENGTH) {
      setError(t`Practice name needs at least 2 characters.`)
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
      // Survey gates the trial: only grant Team when the welcome offer was claimed
      // (offerAnswers set). Skipping the questionnaire leaves it null → no grant.
      ...(offerAnswers ? { grantTeamTrialMonths: TEAM_TRIAL_MONTHS } : {}),
    })
      .then(async (result) => {
        await queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        await queryClient.invalidateQueries({ queryKey: orpc.rules.key() })
        // Key conversion: firm created (or reused). FED is bundled whenever any
        // state is selected, so includes_fed tracks "any jurisdiction chosen".
        track(ANALYTICS_EVENTS.practiceCreated, {
          path: result.kind === 'created' ? 'created' : 'reused',
          timezone,
          internal_deadline_offset_days: internalDeadlineOffsetDays,
          selected_state_count: selectedRuleStates.length,
          includes_fed: selectedRuleStates.length > 0,
          offer_claimed: offerAnswers !== null,
          offer_focus: offerAnswers?.focus,
          offer_tool_count: offerAnswers?.tools.length ?? 0,
          offer_has_pain: Boolean(offerAnswers?.pain),
        })
        // If activation flagged jurisdictions for source-defined-calendar
        // review, pause on step 2 (the rule-review prompt) before the importer.
        const activation = result.kind === 'created' ? result.ruleActivation : null
        if (activation) {
          track(ANALYTICS_EVENTS.rulesActivated, {
            activated_count: activation.activatedCount,
            review_required_count: activation.reviewRequiredCount,
            jurisdiction_count: selectedRuleStates.length,
          })
        }
        if (activation && activation.reviewRequiredCount > 0) {
          track(ANALYTICS_EVENTS.ruleReviewPromptShown, {
            review_required_count: activation.reviewRequiredCount,
            jurisdiction_count: activation.reviewRequiredJurisdictions.length,
          })
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
          t`Try again in a moment. If it keeps failing, contact support.`,
        )
        setError(message)
        toast.error(t`Couldn't create your practice`, { description: message })
      })
      .finally(() => setIsSubmitting(false))
  }

  // Step 1 — welcome / launch offer. Confirm the 3-months-of-Team offer and
  // capture the short practice questionnaire, then advance to practice setup.
  // Claiming carries the answers forward; the quiet skip forgoes the offer.
  if (phase === 'welcome') {
    return (
      <CenteredAuthScreen>
        <WelcomeOfferStep
          step={1}
          total={ONBOARDING_STEP_COUNT}
          onClaim={(answers) => {
            setOfferAnswers(answers)
            setPhase('practice')
          }}
          onSkip={() => setPhase('practice')}
        />
      </CenteredAuthScreen>
    )
  }

  // Step 2 — rule review (only when activation flagged jurisdictions). The firm
  // is already created at this point, so there's no "back"; both actions move
  // forward (review the rules now, or skip to the client importer).
  if (review) {
    return (
      <CenteredAuthScreen>
        <div className="flex h-full min-h-0 w-full max-w-[800px] flex-col gap-4">
          <StepDots step={2} total={ONBOARDING_STEP_COUNT} />
          <RuleReviewPrompt
            totalRulesActivated={review.totalActivated}
            jurisdictions={review.jurisdictions.map((code) => ({ code }))}
            onReview={() => {
              track(ANALYTICS_EVENTS.ruleReviewPromptClicked, {})
              void navigate('/rules/library')
            }}
            onSkip={() => void navigate('/migration/new?source=onboarding', { replace: true })}
          />
        </div>
      </CenteredAuthScreen>
    )
  }

  return (
    <CenteredAuthScreen>
      {/* Wider than the welcome / rule-review steps (800) because this step
          runs a side-by-side at lg: text fields on the left, the state-rule
          tilegram on the right — so it uses the screen instead of a single
          centered column. */}
      <div className="flex w-full max-w-[1080px] flex-col gap-6">
        {/* Hero — step 2 eyebrow, title, and value line live at page level above
            the form card, so the primary anchor is the first thing read (and is
            always reachable now that the shell scroll-centers). */}
        <div className="flex flex-col gap-3">
          <StepDots step={2} total={ONBOARDING_STEP_COUNT} />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-text-primary">
              <Trans>Set up your practice</Trans>
            </h1>
            <p className="text-base leading-normal text-text-tertiary">
              <Trans>
                A few details so DueDateHQ can schedule your deadlines. You can change any of this
                later in Settings.
              </Trans>
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex w-full flex-col gap-6 rounded-xl border border-divider-subtle bg-background-default px-6 py-6 lg:px-8 lg:py-6"
        >
          {/* Side-by-side at lg: text fields on the left, the state-rule
              tilegram on the right. Stacks to one column below lg. */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-10">
            {/* Left — text fields. `initial={false}` renders them at the shown
                state immediately (no hidden→show mount animation): the stagger
                could otherwise leave rows stuck invisible at opacity 0 inside
                the side-by-side grid. */}
            <motion.div
              className="flex flex-col gap-5"
              initial={false}
              animate="show"
              variants={FIELD_COLUMN_VARIANTS}
            >
            <motion.div
              variants={FIELD_ROW_VARIANTS}
              transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
            >
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
                  placeholder={t`e.g. Smith & Associates CPA`}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'practice-name-error' : undefined}
                />
                {error ? <FieldError id="practice-name-error">{error}</FieldError> : null}
              </Field>
            </motion.div>

            <motion.div
              variants={FIELD_ROW_VARIANTS}
              transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <Field>
                <FieldHeaderRow
                  htmlFor="monitoring-start-date"
                  label={t`Monitoring start date`}
                  hint={t`watch deadlines from`}
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
            </motion.div>

            <motion.div
              variants={FIELD_ROW_VARIANTS}
              transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
            >
              <Field>
                <FieldHeaderRow
                  htmlFor="firm-timezone"
                  label={t`Time zone`}
                  hint={t`when reminders send`}
                />
                <FirmTimezoneSelect
                  id="firm-timezone"
                  value={timezone}
                  onValueChange={setTimezone}
                />
              </Field>
            </motion.div>

            </motion.div>

            {/* Right — state-rule coverage tilegram */}
            <div>
              <StateRuleActivationSelector
                selected={selectedRuleStates}
                onChange={setSelectedRuleStates}
              />
            </div>
          </div>

          {/* CTA — constrained so the button isn't stretched the full wide-step
              width; sits under the left fields column. */}
          <div className="flex flex-col gap-3 lg:max-w-md">
            <Button
              type="submit"
              size="lg"
              className="w-full justify-center gap-2 rounded-lg font-semibold"
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
                  <Trans>Create practice</Trans>
                  <ArrowRightIcon className="size-4" aria-hidden />
                </>
              )}
            </Button>
            <p className="text-caption leading-relaxed text-text-tertiary">
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
