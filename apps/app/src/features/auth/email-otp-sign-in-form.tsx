import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Loader2Icon, MailIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'
import { Kbd } from '@/components/patterns/kbd'
import { displayNameFromEmail, sendEmailSignInCode, signInWithEmailCode } from '@/lib/auth'

type PendingAction = 'send' | 'resend' | 'verify'

interface EmailOtpSignInFormProps {
  className?: string
  disabled?: boolean
  // Seed values from the email deep link (`/login?email=&code=`). When both are
  // a valid email + 6-digit code, the form auto-submits the verify step on mount.
  // `| undefined` is explicit so callers may pass through `searchParams.get()`
  // results under exactOptionalPropertyTypes.
  initialEmail?: string | undefined
  initialCode?: string | undefined
  onInteraction?: () => void
  onPendingChange?: (pending: boolean) => void
  onSignedIn: () => void | Promise<void>
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeCode(value: string): string {
  return value.replace(/\s+/g, '')
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object' || !('message' in error)) return fallback
  const message = Reflect.get(error, 'message')
  return typeof message === 'string' && message ? message : fallback
}

export function EmailOtpSignInForm({
  className,
  disabled = false,
  initialEmail,
  initialCode,
  onInteraction,
  onPendingChange,
  onSignedIn,
}: EmailOtpSignInFormProps) {
  const { t } = useLingui()
  // Seed from the email deep link: land directly in the code-entry view with the
  // email pre-filled. The auto-submit effect below verifies when a valid code is
  // also present; on failure the email stays pre-filled so Resend works.
  const seededEmail = (initialEmail ?? '').trim().toLowerCase()
  const hasSeededEmail = isValidEmail(seededEmail)
  const [email, setEmail] = useState(hasSeededEmail ? seededEmail : '')
  const [sentEmail, setSentEmail] = useState<string | null>(hasSeededEmail ? seededEmail : null)
  const [code, setCode] = useState(normalizeCode(initialCode ?? '').slice(0, 6))
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const autoSubmittedRef = useRef(false)

  const codeSent = sentEmail !== null
  const busy = pendingAction !== null
  const formDisabled = disabled || busy

  function setPending(action: PendingAction | null) {
    setPendingAction(action)
    onPendingChange?.(action !== null)
  }

  function noteInteraction() {
    onInteraction?.()
  }

  // Verify a code against an email — shared by the manual submit and the deep-link
  // auto-submit. No password is ever involved; the link just replays the OTP.
  function verifyCode(targetEmail: string, otp: string) {
    setError(null)
    if (!/^\d{6}$/.test(otp)) {
      setError(t`Enter the 6-digit code.`)
      return
    }
    setPending('verify')
    void signInWithEmailCode({
      email: targetEmail,
      otp,
      name: displayNameFromEmail(targetEmail),
    })
      .then(() => onSignedIn())
      .catch((err: unknown) => {
        setError(readErrorMessage(err, t`Couldn't verify the code`))
      })
      .finally(() => setPending(null))
  }

  // Auto-submit once when arriving from the email deep link with a valid
  // email + 6-digit code. On an expired/invalid code, verifyCode surfaces the
  // error while the email stays pre-filled (Resend requests a fresh code).
  useEffect(() => {
    if (autoSubmittedRef.current) return
    const otp = normalizeCode(initialCode ?? '')
    if (!hasSeededEmail || !/^\d{6}$/.test(otp)) return
    autoSubmittedRef.current = true
    noteInteraction()
    verifyCode(seededEmail, otp)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  async function sendCode(action: Extract<PendingAction, 'send' | 'resend'>) {
    noteInteraction()
    const target = (sentEmail ?? email).trim().toLowerCase()
    setError(null)

    if (!isValidEmail(target)) {
      setError(t`Enter a valid email address`)
      return
    }

    setPending(action)
    try {
      await sendEmailSignInCode(target)
      setEmail(target)
      setSentEmail(target)
      setCode('')
    } catch (err) {
      setError(readErrorMessage(err, t`Couldn't send the code`))
    } finally {
      setPending(null)
    }
  }

  function handleSendSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) void sendCode('send')
  }

  function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !sentEmail) return
    noteInteraction()
    verifyCode(sentEmail, normalizeCode(code))
  }

  if (codeSent) {
    return (
      <form onSubmit={handleVerifySubmit} noValidate className={cn('grid w-full gap-2', className)}>
        <div className="rounded-lg border border-border-default bg-bg-panel px-3 py-2">
          <p className="text-sm text-text-tertiary">
            <Trans>Code sent to</Trans>
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate font-mono text-description text-text-primary">
              {sentEmail}
            </p>
            {/* 2026-06-01: swap hand-rolled muted-underline button for TextLink
                secondary/sm primitive. Dropped the persistent rest-state underline
                to match the canonical shape (secondary tone, no underline at rest). */}
            <TextLink
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={formDisabled}
              onClick={() => {
                noteInteraction()
                setSentEmail(null)
                setError(null)
              }}
            >
              <Trans>Change</Trans>
            </TextLink>
          </div>
        </div>

        <Field className="gap-2">
          <FieldLabel htmlFor="email-otp-code">
            <Trans>Verification code</Trans>
          </FieldLabel>
          <Input
            id="email-otp-code"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            disabled={formDisabled}
            aria-invalid={Boolean(error)}
            onFocus={noteInteraction}
            onChange={(event) => {
              noteInteraction()
              setCode(normalizeCode(event.target.value).slice(0, 6))
              setError(null)
            }}
          />
          <FieldDescription>
            <Trans>
              Enter the 6-digit code we emailed you — or just tap the link in the email.
            </Trans>
          </FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button
            type="submit"
            className="justify-center gap-2.5"
            disabled={formDisabled || normalizeCode(code).length !== 6}
            aria-busy={pendingAction === 'verify'}
          >
            {pendingAction === 'verify' ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : null}
            <Trans>Verify code</Trans>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="px-3"
            disabled={formDisabled}
            onClick={() => void sendCode('resend')}
            aria-busy={pendingAction === 'resend'}
          >
            {pendingAction === 'resend' ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trans>Resend</Trans>
            )}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSendSubmit} noValidate className={cn('grid w-full gap-2', className)}>
      <Field className="gap-2">
        <FieldLabel htmlFor="email-otp-email">
          <Trans>Email address</Trans>
        </FieldLabel>
        <Input
          id="email-otp-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t`you@yourpractice.com`}
          value={email}
          disabled={formDisabled}
          aria-invalid={Boolean(error)}
          onFocus={noteInteraction}
          onChange={(event) => {
            noteInteraction()
            setEmail(event.target.value)
            setError(null)
          }}
        />
        <FieldError>{error}</FieldError>
      </Field>

      <Button
        type="submit"
        className="w-full justify-center gap-2.5"
        disabled={formDisabled}
        aria-busy={pendingAction === 'send'}
      >
        {pendingAction === 'send' ? (
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
        ) : (
          <MailIcon className="size-4" aria-hidden />
        )}
        <Trans>Email me a code</Trans>
      </Button>
      {/* 2026-05-27 (Step 6 UX audit #6 drain): keyboard hint that
          Enter on the email field submits. HTML defaults to this
          but a first-time user who's typed their email + paused
          gets a tiny "or press Enter" prompt that turns the
          submit button into a discoverable shortcut. Pure JSX
          add-on; submit semantics are already correct. */}
      {/* 2026-06-01: swap hand-rolled <kbd> for the canonical Kbd
          primitive now exported from patterns/kbd.tsx. */}
      <p className="text-center text-xs leading-relaxed text-text-tertiary">
        <Trans>
          or press <Kbd>Enter</Kbd>
        </Trans>
      </p>
    </form>
  )
}
