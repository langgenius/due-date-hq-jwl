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
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import { StateRuleActivationSelector } from '@/features/onboarding/state-rule-activation-selector'
import { type AuthUser } from '@/lib/auth'
import { orpc } from '@/lib/rpc'
import { activateOrCreateOnboardingFirm, postOnboardingTarget } from './onboarding-firm-flow'

const MIN_NAME_LENGTH = 2

type OnboardingLoaderData = { user: AuthUser }

function isInAppPath(value: string | null): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//')
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object' || !('message' in error)) return fallback
  const message = Reflect.get(error, 'message')
  return typeof message === 'string' && message ? message : fallback
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
  const [selectedRuleStates, setSelectedRuleStates] = useState<RuleGenerationState[]>([])

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

    setIsSubmitting(true)
    void activateOrCreateOnboardingFirm({
      name: trimmed,
      internalDeadlineOffsetDays,
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
    <div className="flex w-full max-w-[400px] flex-col">
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-tint px-2.5 py-1 font-mono text-caption tracking-[0.16em] text-accent-text">
        <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-accent-default" />
        <Trans>PRACTICE PROFILE</Trans>
      </span>

      <h1 className="mt-5 text-2xl font-semibold leading-[1.15] tracking-tight text-text-primary">
        <Trans>Set up your practice.</Trans>
      </h1>

      {/* 2026-05-26 (Step 7 F5-02): copy now provider-agnostic
          ("based on your account") since `derivePracticeName`
          doesn't know which SSO/OTP provider was used. Size
          kept as `text-base` (Step 7's text-[14px] = same px). */}
      <p className="mt-3 text-base leading-relaxed text-text-secondary">
        <Trans>
          We pre-filled a name based on your account. You can change it now or anytime in the
          Practice profile.
        </Trans>
      </p>

      <form onSubmit={handleSubmit} noValidate className="contents">
        <div className="mt-8 flex flex-col gap-1.5">
          {/* 2026-05-27 (Step 7 onboarding audit F5-03 / F7-01):
              dropped the uppercase-tracking-eyebrow treatment in
              favor of the canonical <Label> primitive used in
              /practice settings. Same field name reads in two
              different visual languages between first-run and
              edit; canonicalizing here unifies the family. */}
          <Label htmlFor="practice-name">
            <Trans>Practice name</Trans>
          </Label>
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
            <p
              id="practice-name-error"
              role="alert"
              className="text-sm leading-relaxed text-destructive"
            >
              {error}
            </p>
          ) : (
            <p id="practice-name-helper" className="text-sm leading-relaxed text-text-muted">
              <Trans>This is what your team and clients will see.</Trans>
            </p>
          )}
        </div>

        <StateRuleActivationSelector
          selected={selectedRuleStates}
          onChange={setSelectedRuleStates}
        />

        <div className="mt-5 flex flex-col gap-1.5">
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
          {/* 2026-05-27 (Step 7 onboarding audit F5-03 / F7-01):
              canonical <Label> matches /practice "Internal
              deadline" field. */}
          <Label htmlFor="internal-deadline-offset">
            <Trans>Internal deadline lead time</Trans>
          </Label>
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
          <p
            id="internal-deadline-offset-helper"
            className="text-sm leading-relaxed text-text-muted"
          >
            <Trans>
              Days before each statutory deadline that work shows as due. Most practices use 5–14
              days. Changing this later recalculates current deadlines.
            </Trans>
          </p>
        </div>

        <Button
          type="submit"
          className="mt-5 w-full justify-center gap-2"
          disabled={isSubmitting || activateRulesMutation.isPending}
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
      </form>

      {/* 2026-05-26 (Step 6 UX audit #20): "Auto-saves" claim was a
          lie — the form only saves on Continue. A first-time user
          reading "Auto-saves" assumes mid-form network drops are
          safe; they aren't. Replaced with "Saves on continue" which
          truthfully describes the data-loss model. */}
      <p className="mt-4 inline-flex items-center gap-2 font-mono text-caption text-text-muted">
        <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-status-done" />
        <Trans>Encrypted · Saves on continue · Renamable later</Trans>
      </p>
    </div>
  )
}
