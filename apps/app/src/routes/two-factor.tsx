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
                onChange={(event) => setCode(event.target.value)}
              />
              <p id="two-factor-code-helper" className="text-xs text-text-tertiary">
                <Trans>
                  6-digit code from your authenticator app (Google Authenticator, 1Password, Authy,
                  or similar).
                </Trans>
              </p>
            </div>
            <Button type="submit" disabled={verifyMutation.isPending || code.trim().length < 6}>
              {verifyMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : null}
              <Trans>Verify</Trans>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
