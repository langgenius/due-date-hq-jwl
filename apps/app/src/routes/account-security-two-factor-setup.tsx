import { type SyntheticEvent, useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckIcon, CopyIcon, KeyRoundIcon, Loader2Icon, QrCodeIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import { Field, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@duedatehq/ui/components/ui/input-group'

export type PendingTwoFactorSetup = {
  totpURI: string
  backupCodes: string[]
}

type TwoFactorSetupPanelProps = {
  code: string
  pendingSetup: PendingTwoFactorSetup
  verifyPending: boolean
  onCodeChange: (code: string) => void
  onCopyBackupCodes: () => void
  onCopySetupUri: () => void
  onMissingRecoveryCodeAcknowledgement: () => void
  onVerify: (event: SyntheticEvent<HTMLFormElement>) => void
}

export function TwoFactorSetupPanel({
  code,
  pendingSetup,
  verifyPending,
  onCodeChange,
  onCopyBackupCodes,
  onCopySetupUri,
  onMissingRecoveryCodeAcknowledgement,
  onVerify,
}: TwoFactorSetupPanelProps) {
  const { t } = useLingui()
  // Recovery codes are shown ONCE during setup. If the user could click
  // "Verify and enable" without acknowledging they stored them, a later
  // broken phone means lockout. A mandatory ack checkbox gates the verify CTA.
  const [acknowledgedCodes, setAcknowledgedCodes] = useState(false)
  // Copy buttons get inline in-panel feedback: a toast fires from the parent
  // on success, but inline button-label feedback is the canonical pattern
  // (one less surface to look at). Track which field was last copied and swap
  // the button label for 2s.
  const [copiedField, setCopiedField] = useState<'uri' | 'codes' | null>(null)

  useEffect(() => {
    if (!copiedField) return undefined
    const timer = window.setTimeout(() => setCopiedField(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copiedField])

  const handleCopyUri = () => {
    onCopySetupUri()
    setCopiedField('uri')
  }
  const handleCopyBackupCodes = () => {
    onCopyBackupCodes()
    setCopiedField('codes')
  }
  const hasCompleteCode = code.trim().length >= 6
  const verifyDisabled = verifyPending || !hasCompleteCode

  function handleVerify(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (verifyDisabled) {
      return
    }
    if (!acknowledgedCodes) {
      onMissingRecoveryCodeAcknowledgement()
      return
    }

    onVerify(event)
  }

  return (
    <form
      onSubmit={handleVerify}
      className="grid gap-4 rounded-lg border border-border-default p-4"
    >
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="grid place-items-center rounded-lg border border-border-default bg-background-default p-4">
          <div
            className="rounded-lg bg-background-surface-white p-3 shadow-sm"
            aria-label={t`Authenticator setup QR code`}
          >
            <QRCodeSVG
              value={pendingSetup.totpURI}
              size={184}
              level="M"
              marginSize={3}
              title={t`Authenticator setup QR code`}
            />
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <QrCodeIcon className="size-4" aria-hidden />
              <Trans>Scan the QR code</Trans>
            </div>
            <p className="text-sm text-text-secondary">
              <Trans>
                Open your authenticator app, add a new account, then scan this code. Use the setup
                URI if scanning is not available.
              </Trans>
            </p>
          </div>

          {/* The setup URI uses InputGroup with a trailing Copy addon so the
              readOnly value + copy CTA share one focus/border layer instead of
              stacking label-row above input. */}
          <Field>
            <FieldLabel htmlFor="totp-uri">
              <Trans>Setup URI</Trans>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="totp-uri"
                readOnly
                value={pendingSetup.totpURI}
                className="font-mono text-xs"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={handleCopyUri}>
                  {copiedField === 'uri' ? (
                    <>
                      <CheckIcon aria-hidden />
                      <Trans>Copied</Trans>
                    </>
                  ) : (
                    <>
                      <CopyIcon aria-hidden />
                      <Trans>Copy URI</Trans>
                    </>
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </div>
      </div>

      <Alert>
        <KeyRoundIcon />
        <AlertTitle>
          <Trans>Save these recovery codes now</Trans>
        </AlertTitle>
        <AlertDescription>
          <Trans>
            They are only shown during setup. Save them in a password manager — they won't be shown
            again.
          </Trans>
        </AlertDescription>
      </Alert>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* This is a real heading, not a `<Label>`: the backup-codes block
              has no input, so a form-control `<Label>` would make assistive
              tech announce it as attached to an input that doesn't exist.
              Visual weight preserved via tailwind. */}
          <h3 className="text-sm font-medium">
            <Trans>Recovery codes</Trans>
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={handleCopyBackupCodes}>
            {copiedField === 'codes' ? (
              <>
                <CheckIcon className="size-4" aria-hidden />
                <Trans>Copied</Trans>
              </>
            ) : (
              <>
                <CopyIcon className="size-4" aria-hidden />
                <Trans>Copy</Trans>
              </>
            )}
          </Button>
        </div>
        <div className="grid gap-1 rounded-lg bg-bg-panel p-3 font-mono text-xs text-text-secondary sm:grid-cols-2">
          {pendingSetup.backupCodes.map((backupCode) => (
            <span key={backupCode}>{backupCode}</span>
          ))}
        </div>
        {/* The ack-checkbox row uses Field horizontal so the checkbox-leading
            label/control alignment + focus state come from the primitive
            instead of a hand-rolled <Label> + flex. */}
        <Field orientation="horizontal" className="mt-1">
          <Checkbox
            id="recovery-codes-ack"
            checked={acknowledgedCodes}
            onCheckedChange={(next) => setAcknowledgedCodes(next)}
          />
          <FieldLabel htmlFor="recovery-codes-ack" className="font-normal text-text-secondary">
            <Trans>
              I've saved these recovery codes somewhere safe. I know they won't be shown again.
            </Trans>
          </FieldLabel>
        </Field>
      </div>

      <div className="grid gap-3 border-t border-border-default pt-4 sm:grid-cols-[minmax(0,220px)_auto] sm:items-end">
        <Field>
          <FieldLabel htmlFor="totp-code">
            <Trans>Verification code</Trans>
          </FieldLabel>
          <Input
            id="totp-code"
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            onChange={(event) => onCodeChange(event.target.value)}
          />
        </Field>
        <Button type="submit" className="w-fit" disabled={verifyDisabled}>
          {verifyPending ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : null}
          <Trans>Verify and enable</Trans>
        </Button>
      </div>
    </form>
  )
}
