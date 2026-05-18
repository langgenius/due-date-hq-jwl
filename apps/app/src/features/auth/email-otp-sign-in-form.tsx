import { useState, type FormEvent } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Loader2Icon, MailIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import { cn } from '@duedatehq/ui/lib/utils'
import { displayNameFromEmail, sendEmailSignInCode, signInWithEmailCode } from '@/lib/auth'

type PendingAction = 'send' | 'resend' | 'verify'

export interface EmailOtpSignInFormProps {
  className?: string
  disabled?: boolean
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
  onInteraction,
  onPendingChange,
  onSignedIn,
}: EmailOtpSignInFormProps) {
  const { t } = useLingui()
  const [email, setEmail] = useState('')
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

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
    setError(null)

    const otp = normalizeCode(code)
    if (!/^\d{6}$/.test(otp)) {
      setError(t`Enter the 6-digit code.`)
      return
    }

    setPending('verify')
    void signInWithEmailCode({
      email: sentEmail,
      otp,
      name: displayNameFromEmail(sentEmail),
    })
      .then(() => onSignedIn())
      .catch((err: unknown) => {
        setError(readErrorMessage(err, t`Couldn't verify the code`))
      })
      .finally(() => setPending(null))
  }

  if (codeSent) {
    return (
      <form onSubmit={handleVerifySubmit} noValidate className={cn('grid gap-2', className)}>
        <div className="rounded-lg border border-border-default bg-bg-panel px-3 py-2">
          <p className="text-[12px] text-text-muted">
            <Trans>Code sent to</Trans>
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate font-mono text-[13px] text-text-primary">{sentEmail}</p>
            <button
              type="button"
              className="shrink-0 text-[12px] font-medium text-text-secondary underline underline-offset-4 hover:text-text-primary"
              disabled={formDisabled}
              onClick={() => {
                noteInteraction()
                setSentEmail(null)
                setError(null)
              }}
            >
              <Trans>Change</Trans>
            </button>
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
            <Trans>The code expires in 5 minutes.</Trans>
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
            variant="outline"
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
    <form onSubmit={handleSendSubmit} noValidate className={cn('grid gap-2', className)}>
      <Field className="gap-2">
        <FieldLabel htmlFor="email-otp-email">
          <Trans>Email address</Trans>
        </FieldLabel>
        <Input
          id="email-otp-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t`you@firm.com`}
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
    </form>
  )
}
