import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, GiftIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'

import { ToggleChip } from '@/components/primitives/toggle-chip'
import { StepDots } from './step-dots'

// Welcome / launch-offer step — the questionnaire from the marketing
// /get-started page, moved into the post-login funnel as step 1. Name + email
// already come from sign-in and the firm name is captured in practice setup, so
// only the three qualitative questions remain. Completing it ("Claim …") is the
// gate to the 3-months-of-Team offer; the quiet skip forgoes it. Styled with the
// same onboarding chrome (StepDots hero + flat card + Button/Textarea/ToggleChip
// primitives) so it reads as the natural first beat of onboarding, not a port.

export interface WelcomeOfferAnswers {
  /** Single practice focus, if chosen. */
  focus?: string | undefined
  /** Tools the firm uses today (multi-select). */
  tools: string[]
  /** Freeform "where deadlines cost the most time". */
  pain?: string | undefined
}

interface WelcomeOfferStepProps {
  step: number
  total: number
  /** Accept the offer + continue into practice setup, carrying the answers. */
  onClaim: (answers: WelcomeOfferAnswers) => void
  /** Continue without claiming the offer. */
  onSkip: () => void
}

export function WelcomeOfferStep({ step, total, onClaim, onSkip }: WelcomeOfferStepProps) {
  const { t } = useLingui()
  const [focus, setFocus] = useState<string | null>(null)
  const [tools, setTools] = useState<string[]>([])
  const [pain, setPain] = useState('')

  const focusOptions = [
    t`Individual tax`,
    t`Business tax`,
    t`Bookkeeping & advisory`,
    t`A mix of everything`,
  ]
  const toolOptions = [
    t`Excel + Outlook`,
    t`File In Time`,
    t`TaxDome`,
    t`Karbon`,
    t`Canopy`,
    t`Drake / Lacerte / ProConnect`,
    t`Something else`,
  ]

  function toggleTool(value: string) {
    setTools((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  function handleClaim() {
    onClaim({ focus: focus ?? undefined, tools, pain: pain.trim() || undefined })
  }

  return (
    <div className="flex w-full max-w-[800px] flex-col gap-5">
      {/* Hero — the questionnaire is the title, but the 3-months-free offer
          rides LOUD above it as an accent promo badge (it's the conversion
          hook), then a light task subline. */}
      <div className="flex flex-col gap-2.5">
        <StepDots step={step} total={total} />
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-state-accent-hover-alt px-3.5 py-1.5 text-sm font-semibold tracking-tight text-text-accent">
          <GiftIcon className="size-4 shrink-0" aria-hidden />
          <Trans>3 months of Team — free</Trans>
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-text-primary">
            <Trans>Tell us a little about your practice</Trans>
          </h1>
          <p className="text-base leading-normal text-text-tertiary">
            <Trans>
              Answer a few quick questions and your trial's on us — every field is optional.
            </Trans>
          </p>
        </div>
      </div>

      {/* Questions — flat card chrome shared with the practice-setup step. */}
      <div className="flex w-full flex-col gap-5 rounded-xl border border-divider-subtle bg-background-default px-6 py-6 duration-300 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none lg:px-8 lg:py-6">
        <div className="flex flex-col gap-4">
          {/* Focus — single select */}
          <div className="flex flex-col gap-2.5">
            <p className="text-sm font-medium leading-none text-text-primary">
              <Trans>What does your practice focus on?</Trans>{' '}
              <span className="font-normal text-text-tertiary">
                <Trans>(optional)</Trans>
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {focusOptions.map((option) => (
                <ToggleChip
                  key={option}
                  size="md"
                  selected={focus === option}
                  onClick={() => setFocus(focus === option ? null : option)}
                >
                  {option}
                </ToggleChip>
              ))}
            </div>
          </div>

          {/* Tools — multi select */}
          <div className="flex flex-col gap-2.5">
            <p className="text-sm font-medium leading-none text-text-primary">
              <Trans>Which tools do you use today?</Trans>{' '}
              <span className="font-normal text-text-tertiary">
                <Trans>(optional)</Trans>
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {toolOptions.map((option) => (
                <ToggleChip
                  key={option}
                  size="md"
                  selected={tools.includes(option)}
                  onClick={() => toggleTool(option)}
                >
                  {option}
                </ToggleChip>
              ))}
            </div>
          </div>

          {/* Pain — freeform */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="welcome-pain"
              className="text-sm font-medium leading-none text-text-primary"
            >
              <Trans>Where do deadlines cost you the most time?</Trans>{' '}
              <span className="font-normal text-text-tertiary">
                <Trans>(optional)</Trans>
              </span>
            </label>
            <Textarea
              id="welcome-pain"
              value={pain}
              onChange={(event) => setPain(event.target.value)}
              rows={2}
              placeholder={t`e.g. refreshing fifty state sites by hand, or finding out a date moved when a client asks…`}
            />
          </div>
        </div>

        {/* Claim → continue into practice setup. The quiet skip forgoes the offer. */}
        <div className="flex flex-col items-center gap-2.5">
          <Button
            type="button"
            size="lg"
            onClick={handleClaim}
            className="w-full justify-center gap-2 rounded-lg font-semibold"
          >
            <Trans>Claim 3 months of Team free</Trans>
            <ArrowRightIcon className="size-4" aria-hidden />
          </Button>
          <TextLink variant="muted" onClick={onSkip} className="text-sm">
            <Trans>Skip for now</Trans>
          </TextLink>
        </div>
      </div>
    </div>
  )
}
