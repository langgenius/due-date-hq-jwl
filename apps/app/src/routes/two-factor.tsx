import { useState, type SyntheticEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { Loader2Icon, ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

export function TwoFactorRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search] = useSearchParams()
  const [code, setCode] = useState('')
  const verifyMutation = useMutation(
    orpc.security.verifyTwoFactor.mutationOptions({
      onSuccess: async () => {
        toast.success(t`Two-factor verification complete`)
        await queryClient.invalidateQueries()
        await navigate(search.get('redirectTo') || '/', { replace: true })
      },
      onError: (err) => {
        toast.error(t`Couldn't verify the code`, {
          description: rpcErrorMessage(err) ?? err.message,
        })
      },
    }),
  )

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length < 6) return
    verifyMutation.mutate({ code: trimmed })
  }

  // 2026-05-26 (Step 7 onboarding audit F3-04): auto-submit on
  // 6-digit completion. Standard pattern (Stripe, GitHub,
  // Linear) — removes a click from every login. Guards on
  // pending state so a slow network can't double-submit.
  function handleCodeChange(next: string) {
    setCode(next)
    const trimmed = next.trim()
    if (trimmed.length === 6 && !verifyMutation.isPending) {
      verifyMutation.mutate({ code: trimmed })
    }
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4" aria-hidden />
            <Trans>Two-factor verification</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Enter the code from your authenticator app.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="two-factor-code">
                <Trans>Verification code</Trans>
              </Label>
              {/* 2026-05-26 (Step 7 onboarding audit F3-03 + F3-05):
                  added autoFocus so the user's already-on-keyboard
                  hands don't need a click first, and an inline
                  helper that names the common authenticator apps
                  — first-time 2FA users may not know what
                  "authenticator app" means. */}
              <Input
                id="two-factor-code"
                value={code}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-describedby="two-factor-code-helper"
                onChange={(event) => handleCodeChange(event.target.value)}
              />
              {/* Step 6 UX #22/#23 shipped autoFocus + inline helper;
                  HEAD already has autoFocus and `handleCodeChange`
                  (which is Step 7's auto-submit on 6 digits). HEAD
                  copy names the apps explicitly so it stays. */}
              <p id="two-factor-code-helper" className="text-xs text-text-tertiary">
                <Trans>
                  6-digit code from your authenticator app (Google Authenticator, 1Password, Authy,
                  or similar).
                </Trans>
              </p>
            </div>
            <Button
              type="submit"
              disabled={verifyMutation.isPending || code.trim().length < 6}
              aria-busy={verifyMutation.isPending || undefined}
            >
              {verifyMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : null}
              {/* 2026-05-26 (Step 6 UX audit #24): label switches to
                  "Verifying…" while pending — matches the verb
                  pattern used by every other submit-pending button in
                  the app ("Saving…", "Creating…"). */}
              {verifyMutation.isPending ? <Trans>Verifying…</Trans> : <Trans>Verify</Trans>}
            </Button>
            {/* 2026-05-26 (Step 7 onboarding audit F3-02): the
                challenge UI offered only the TOTP input — no
                "I lost my authenticator" escape. That's the
                single most common 2FA failure mode. Added a
                low-emphasis support mailto so a locked-out
                user has a path forward. (A proper recovery-
                code branch is deferred — see F3-01.) */}
            <p className="text-xs text-text-tertiary">
              <Trans>
                Lost your authenticator?{' '}
                <a
                  className="text-text-secondary underline underline-offset-4 hover:text-text-primary"
                  href="mailto:support@duedatehq.com?subject=Two-factor%20recovery"
                >
                  Email support
                </a>{' '}
                to reset 2FA.
              </Trans>
            </p>
          </form>
          {/* 2026-05-26 (Step 7 onboarding audit F3-06): /two-
              factor had no trust pill, while /login + /onboarding
              each shipped one. Added a parallel pill so the
              entry-flow series stays visually consistent and
              the 2FA moment doesn't read as chrome-less. */}
          <p className="mt-4 inline-flex items-center gap-2 font-mono text-caption text-text-muted">
            <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-status-done" />
            <Trans>Encrypted · 2FA-protected</Trans>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
