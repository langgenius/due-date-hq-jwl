import { type SyntheticEvent } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { CopyIcon, KeyRoundIcon, Loader2Icon, QrCodeIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'

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
  onVerify: (event: SyntheticEvent<HTMLFormElement>) => void
}

export function TwoFactorSetupPanel({
  code,
  pendingSetup,
  verifyPending,
  onCodeChange,
  onCopyBackupCodes,
  onCopySetupUri,
  onVerify,
}: TwoFactorSetupPanelProps) {
  const { t } = useLingui()

  return (
    <form onSubmit={onVerify} className="grid gap-4 rounded-md border border-border-default p-4">
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="grid place-items-center rounded-md border border-border-default bg-background-default p-4">
          <div
            className="rounded-md bg-background-surface-white p-3 shadow-sm"
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

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="totp-uri">
                <Trans>Setup URI</Trans>
              </Label>
              <Button type="button" variant="ghost" size="sm" onClick={onCopySetupUri}>
                <CopyIcon className="size-4" aria-hidden />
                <Trans>Copy URI</Trans>
              </Button>
            </div>
            <Input
              id="totp-uri"
              readOnly
              value={pendingSetup.totpURI}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>

      <Alert>
        <KeyRoundIcon />
        <AlertTitle>
          <Trans>Save these recovery codes now</Trans>
        </AlertTitle>
        <AlertDescription>
          <Trans>
            They are only shown during setup. Store them somewhere private before verification.
          </Trans>
        </AlertDescription>
      </Alert>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* 2026-05-26 (Step 7 onboarding audit F4-03): heading
              was `<Label>`, a form-control element — but the
              backup-codes block has no input. Assistive tech
              may announce the label as if attached to an
              input that doesn't exist. Promoted to a real
              heading; visual weight preserved via tailwind. */}
          <h3 className="text-sm font-medium">
            <Trans>Recovery codes</Trans>
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={onCopyBackupCodes}>
            <CopyIcon className="size-4" aria-hidden />
            <Trans>Copy</Trans>
          </Button>
        </div>
        <div className="grid gap-1 rounded-md bg-bg-panel p-3 font-mono text-xs text-text-secondary sm:grid-cols-2">
          {pendingSetup.backupCodes.map((backupCode) => (
            <span key={backupCode}>{backupCode}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 border-t border-border-default pt-4 sm:grid-cols-[minmax(0,220px)_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="totp-code">
            <Trans>Verification code</Trans>
          </Label>
          <Input
            id="totp-code"
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            onChange={(event) => onCodeChange(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-fit" disabled={verifyPending || code.trim().length < 6}>
          {verifyPending ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : null}
          <Trans>Verify and enable</Trans>
        </Button>
      </div>
    </form>
  )
}
