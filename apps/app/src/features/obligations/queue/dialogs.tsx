// Dialog components for the obligation queue (/deadlines).
// Extracted from routes/obligations.tsx.
import { DropdownTriggerButton } from './components/primitives'
import { parseMoneyCents, parseOwnerCount } from './helpers'
import type { AuthorityRejectionDraft, SignatureReminderTarget } from './types'
import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { IsoDatePicker } from '@/components/primitives/iso-date-picker'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatTaxCode } from '@/lib/tax-codes'
import { cn } from '@/lib/utils'
import {
  type MemberAssigneeOption,
  type ObligationFiledRejectionNextStep,
  type ObligationQueueRow,
  type ReadinessDocumentChecklistItemPublic,
  type ReadinessPreviewRequestEmailOutput,
} from '@duedatehq/contracts'
import { renderTemplate, SIGNATURE_REMINDER_THROTTLE_DAYS } from '@duedatehq/core/email-template'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Field, FieldDescription, FieldError, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  Loader2,
  SendIcon,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

export function ExportAxis({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 md:grid-cols-[96px_minmax(0,1fr)] md:items-start">
      <CapsFieldLabel as="div" variant="field" className="pt-2">
        {label}
      </CapsFieldLabel>
      <div role="radiogroup" aria-label={label} className="grid gap-2">
        {children}
      </div>
    </div>
  )
}

export function ExportAxisOption({
  selected,
  disabled = false,
  icon,
  title,
  description,
  onSelect,
}: {
  selected: boolean
  disabled?: boolean
  icon?: ReactNode
  title: ReactNode
  description: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      className={cn(
        'flex min-h-12 w-full cursor-pointer items-start gap-2 rounded-lg border border-divider-regular bg-background-default px-3 py-2 text-left outline-none transition-colors',
        'hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
        selected && 'border-divider-deep bg-state-base-active',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      onClick={() => {
        if (!disabled) onSelect()
      }}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-divider-deep',
          selected && 'border-text-primary bg-text-primary text-text-inverted',
        )}
      >
        {selected ? <CheckCircle2Icon className="size-3" /> : icon}
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <span className="text-xs leading-4 text-text-tertiary">{description}</span>
      </span>
    </button>
  )
}

export function SignatureReminderDialog({
  open,
  onOpenChange,
  target,
  sending,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: SignatureReminderTarget
  sending: boolean
  onSend: (input: { subject: string; body: string; excludeIds?: string[] }) => void
}) {
  const { t } = useLingui()
  const isBulk = target.mode === 'bulk'
  const singleQuery = useQuery({
    ...orpc.obligations.signatureReminderPreview.queryOptions({
      input: { id: target.mode === 'single' ? (target.obligationId ?? '') : '' },
    }),
    enabled: open && target.mode === 'single' && Boolean(target.obligationId),
  })
  const bulkQuery = useQuery({
    ...orpc.obligations.bulkSignatureReminderPreview.queryOptions({
      input: { ids: target.mode === 'bulk' ? target.ids : [] },
    }),
    enabled: open && target.mode === 'bulk' && target.ids.length > 0,
  })
  const isLoading = isBulk ? bulkQuery.isLoading : singleQuery.isLoading
  const data = isBulk ? bulkQuery.data : singleQuery.data

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [edited, setEdited] = useState(false)
  // Which eligible recipient the bulk preview is paged to (single mode ignores).
  const [previewIndex, setPreviewIndex] = useState(0)
  // P1 throttle: bulk "skip recently reminded" toggle + single two-click
  // "send anyway" confirm when the client was nudged within the window.
  const [skipRecent, setSkipRecent] = useState(false)
  const [confirmResend, setConfirmResend] = useState(false)
  // Seed the editable fields from the server template once it arrives
  // (unless the CPA already started editing this open session).
  useEffect(() => {
    if (open && data && !edited) {
      setSubject(data.subjectTemplate)
      setBody(data.bodyTemplate)
    }
  }, [open, data, edited])
  // Reset on close so the next open re-seeds from a fresh template.
  useEffect(() => {
    if (!open) {
      setSubject('')
      setBody('')
      setEdited(false)
      setPreviewIndex(0)
      setSkipRecent(false)
      setConfirmResend(false)
    }
  }, [open])

  const tokens = data?.tokens ?? []
  // Single returns one recipient; bulk returns every eligible recipient so the
  // CPA can page through them. Clamp the index in case the data shrank.
  const singleSample = singleQuery.data?.sample ?? null
  const bulkSamples = bulkQuery.data?.samples ?? []
  const previewTotal = bulkSamples.length
  const safePreviewIndex = previewTotal > 0 ? Math.min(previewIndex, previewTotal - 1) : 0
  // Live-render the preview against the active sample recipient as the CPA edits.
  const sample = isBulk ? (bulkSamples[safePreviewIndex] ?? null) : singleSample
  const previewSubject = sample ? renderTemplate(subject, sample.vars) : ''
  const previewBody = sample ? renderTemplate(body, sample.vars) : ''

  const recipientEmail = singleQuery.data?.recipientEmail ?? null
  const eligibleCount = bulkQuery.data?.eligibleCount ?? 0
  const hasRecipient = isBulk ? eligibleCount > 0 : Boolean(recipientEmail)
  const canSend = hasRecipient && subject.trim().length > 0 && body.trim().length > 0 && !sending

  // P1 repeat-nudge throttle. Single: warn + require a "send anyway" confirm
  // when this client was reminded within the window. Bulk: count + optionally
  // skip the eligible rows reminded recently. Never hard-blocks the send.
  const throttleMs = SIGNATURE_REMINDER_THROTTLE_DAYS * 86_400_000
  const lastRemindedAt = singleQuery.data?.lastRemindedAt ?? null
  const msSinceReminded = lastRemindedAt ? Date.now() - new Date(lastRemindedAt).getTime() : null
  const recentlyReminded = !isBulk && msSinceReminded !== null && msSinceReminded < throttleMs
  const daysSinceReminded = msSinceReminded !== null ? Math.floor(msSinceReminded / 86_400_000) : 0
  const recentlyRemindedCount = bulkQuery.data?.recentlyRemindedCount ?? 0
  const recentlyRemindedIds = bulkQuery.data?.recentlyRemindedIds ?? []
  const needsResendConfirm = recentlyReminded && !confirmResend

  return (
    <Dialog protectInput open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? (
              <Trans>Remind clients to sign Form 8879</Trans>
            ) : (
              <Trans>Remind client to sign Form 8879</Trans>
            )}
          </DialogTitle>
          <DialogDescription>
            {isBulk ? (
              <Trans>
                Edit the email, then send it to the selected clients. Each client gets their own
                details filled in; deadlines not awaiting a signature are skipped.
              </Trans>
            ) : recipientEmail ? (
              <Trans>Review and edit the email, then send it to {recipientEmail}.</Trans>
            ) : (
              <Trans>No email address on file for this client — add one to send a reminder.</Trans>
            )}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-text-tertiary">
            <Trans>Loading preview…</Trans>
          </p>
        ) : (
          <div className="grid gap-3">
            {isBulk ? (
              <p className="text-sm text-text-secondary">
                <Trans>
                  Sending to {eligibleCount} clients · {bulkQuery.data?.skippedCount ?? 0} not
                  awaiting signature · {bulkQuery.data?.noEmailCount ?? 0} without an email
                </Trans>
              </p>
            ) : null}
            {/* P1 throttle: bulk skip toggle for recently-reminded clients. */}
            {isBulk && recentlyRemindedCount > 0 ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
                <Checkbox
                  checked={skipRecent}
                  onCheckedChange={(checked) => setSkipRecent(checked)}
                />
                <Plural
                  value={recentlyRemindedCount}
                  one="Skip # client reminded in the last few days"
                  other="Skip # clients reminded in the last few days"
                />
              </label>
            ) : null}
            {/* P1 throttle: single "you just reminded them" warning. */}
            {recentlyReminded ? (
              <p className="rounded-lg bg-background-subtle px-3 py-2 text-sm text-text-secondary">
                <Trans>
                  You reminded this client{' '}
                  <Plural value={daysSinceReminded} _0="today" one="# day ago" other="# days ago" />
                  . Send another?
                </Trans>
              </p>
            ) : null}
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="signature-reminder-subject">
                <Trans>Subject</Trans>
              </FieldLabel>
              <Input
                id="signature-reminder-subject"
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value)
                  setEdited(true)
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="signature-reminder-body">
                <Trans>Message</Trans>
              </FieldLabel>
              <Textarea
                id="signature-reminder-body"
                rows={9}
                value={body}
                onChange={(event) => {
                  setBody(event.target.value)
                  setEdited(true)
                }}
              />
            </div>
            {tokens.length > 0 ? (
              <p className="text-xs text-text-tertiary">
                <Trans>Placeholders filled in per client:</Trans>{' '}
                {tokens.map((token) => `{{${token}}}`).join(' · ')}
              </p>
            ) : null}
            {sample ? (
              <div className="grid gap-1 rounded-lg bg-background-subtle p-3">
                <div className="flex items-center justify-between gap-2">
                  <CapsFieldLabel as="div" variant="field">
                    <Trans>Preview for {sample.clientName}</Trans>
                  </CapsFieldLabel>
                  {isBulk && previewTotal > 1 ? (
                    <div
                      className="inline-flex items-center gap-0.5 text-xs text-text-secondary"
                      role="group"
                      aria-label={t`Preview pagination`}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        aria-label={t`Previous client`}
                        disabled={safePreviewIndex === 0}
                        onClick={() => setPreviewIndex((index) => Math.max(0, index - 1))}
                      >
                        <ChevronLeftIcon className="size-3.5" aria-hidden />
                      </Button>
                      <span className="min-w-10 px-1 text-center tabular-nums">
                        <Trans>
                          {safePreviewIndex + 1} / {previewTotal}
                        </Trans>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        aria-label={t`Next client`}
                        disabled={safePreviewIndex + 1 >= previewTotal}
                        onClick={() =>
                          setPreviewIndex((index) => Math.min(previewTotal - 1, index + 1))
                        }
                      >
                        <ChevronRightIcon className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-text-primary">{previewSubject}</p>
                <p className="text-sm whitespace-pre-wrap text-text-secondary">{previewBody}</p>
              </div>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!canSend}
            onClick={() => {
              // Single: first click on a recently-reminded client just confirms.
              if (needsResendConfirm) {
                setConfirmResend(true)
                return
              }
              onSend({
                subject: subject.trim(),
                body: body.trim(),
                ...(isBulk && skipRecent ? { excludeIds: recentlyRemindedIds } : {}),
              })
            }}
          >
            {needsResendConfirm ? (
              <Trans>Send anyway</Trans>
            ) : isBulk ? (
              <Trans>Send reminders</Trans>
            ) : (
              <Trans>Send reminder</Trans>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// P1: bulk "Decide extension" dialog. Collects one shared extension plan (memo
// + optional source + optional internal target date) and applies it to every
// eligible selected deadline. The date picker is capped at the earliest filing
// deadline in the selection (from the preview) so any picked date passes the
// server's per-row "target ≤ filing deadline" check for every row.

export function BulkExtensionDialog({
  open,
  onOpenChange,
  ids,
  sending,
  onSend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ids: string[]
  sending: boolean
  onSend: (input: { memo: string; source?: string; internalTargetDate?: string }) => void
}) {
  const { t } = useLingui()
  const query = useQuery({
    ...orpc.obligations.bulkExtensionDecisionPreview.queryOptions({ input: { ids } }),
    enabled: open && ids.length > 0,
  })
  const [memo, setMemo] = useState('')
  const [source, setSource] = useState('')
  const [internalTargetDate, setInternalTargetDate] = useState('')
  // Reset on close so the next open starts clean.
  useEffect(() => {
    if (!open) {
      setMemo('')
      setSource('')
      setInternalTargetDate('')
    }
  }, [open])

  const eligibleCount = query.data?.eligibleCount ?? 0
  const needsManualCount = query.data?.needsManualDeadlineCount ?? 0
  // Rows that can actually be bulk-decided: eligible AND have a computable
  // extended date. Rows lacking a statutory duration are skipped in bulk
  // (they need an individually-entered extended date).
  const applicableCount = Math.max(0, eligibleCount - needsManualCount)
  // Cap the picker at the earliest EXTENDED deadline so any picked date is
  // valid for every applicable row.
  const cap = query.data?.earliestExtendedFilingDeadline ?? ''
  // The picker normally prevents this, but guard if the cap shrank after a
  // re-query while a later date was already chosen.
  const dateInvalid = internalTargetDate !== '' && cap !== '' && internalTargetDate > cap
  // Internal target date is required (mirrors the single extension's
  // canSaveInternalExtensionPlan), alongside a memo.
  const canSend =
    applicableCount > 0 &&
    memo.trim().length > 0 &&
    internalTargetDate !== '' &&
    !dateInvalid &&
    !sending

  return (
    <Dialog protectInput open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans>Decide extension for selected deadlines</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Apply an internal extension plan to every eligible selected deadline. Each filing
              deadline moves to its statutory extended date; payment stays due on the original date.
              The target date is capped at the earliest extended deadline; deadlines already
              extended are skipped.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <p className="text-sm text-text-tertiary">
            <Trans>Loading preview…</Trans>
          </p>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-text-secondary">
              <Trans>
                Extending {applicableCount} deadlines · {query.data?.alreadyExtendedCount ?? 0}{' '}
                already extended · {query.data?.skippedCount ?? 0} not found
              </Trans>
            </p>
            {needsManualCount > 0 ? (
              <p className="text-xs text-text-tertiary">
                <Plural
                  value={needsManualCount}
                  one="# selected deadline has no fixed extension length — decide it individually."
                  other="# selected deadlines have no fixed extension length — decide them individually."
                />
              </p>
            ) : null}
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="bulk-extension-memo">
                <Trans>Decision memo</Trans>
              </FieldLabel>
              <Textarea
                id="bulk-extension-memo"
                rows={4}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="bulk-extension-source">
                <Trans>Source (optional)</Trans>
              </FieldLabel>
              <Input
                id="bulk-extension-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                <Trans>Internal target date</Trans>
              </FieldLabel>
              <IsoDatePicker
                value={internalTargetDate}
                invalid={dateInvalid}
                {...(cap ? { maxIsoDate: cap } : {})}
                ariaLabel={t`Internal extension target date`}
                placeholder={t`Internal extension target date`}
                onValueChange={setInternalTargetDate}
              />
              {cap ? (
                <p className="text-xs text-text-tertiary">
                  <Trans>Capped at the earliest extended filing deadline: {cap}</Trans>
                </p>
              ) : null}
              <p className="text-xs text-text-tertiary">
                <Trans>Payment stays due on each deadline&apos;s original date.</Trans>
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!canSend}
            onClick={() =>
              onSend({
                memo: memo.trim(),
                ...(source.trim() ? { source: source.trim() } : {}),
                ...(internalTargetDate ? { internalTargetDate } : {}),
              })
            }
          >
            <Trans>Decide extensions</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeadlineInputRequestDialog({
  open,
  recipients,
  selectedRecipientUserId,
  message,
  loadingRecipients,
  submitting,
  onOpenChange,
  onRecipientChange,
  onMessageChange,
  onSubmit,
}: {
  open: boolean
  recipients: readonly MemberAssigneeOption[]
  selectedRecipientUserId: string
  message: string
  loadingRecipients: boolean
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onRecipientChange: (recipientUserId: string) => void
  onMessageChange: (message: string) => void
  onSubmit: () => void
}) {
  const { t } = useLingui()
  const selectedRecipient =
    recipients.find((recipient) => recipient.assigneeId === selectedRecipientUserId) ?? null
  // Keep role-specific labels — collapsing manager/preparer/coordinator
  // to "Team member" would hide information the rest of the app exposes.
  const roleLabels = {
    owner: t`Owner`,
    partner: t`Partner`,
    manager: t`Manager`,
    preparer: t`Preparer`,
    coordinator: t`Coordinator`,
  } satisfies Record<MemberAssigneeOption['role'], string>
  const recipientTriggerText =
    selectedRecipient?.name ?? (loadingRecipients ? t`Loading team` : t`Choose recipient`)
  const submitDisabled =
    submitting || loadingRecipients || !selectedRecipientUserId || message.trim().length === 0

  return (
    <Dialog protectInput open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none p-0">
        <DialogHeader className="border-b border-divider-subtle px-6 py-5 pr-12">
          <DialogTitle>
            <Trans>Request input</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Send an internal request to an owner, partner, or manager for this deadline.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          {/* The recipient label is exposed via id so
              DropdownTriggerButton's aria-labelledby binds it for SR
              users. Rows ride Field + FieldLabel; the seat-warning
              "Add an active owner…" uses FieldDescription tone="warning". */}
          <Field>
            <FieldLabel id="deadline-input-request-recipient-label">
              <Trans>Recipient</Trans>
            </FieldLabel>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  // HEAD uses the canonical DropdownTriggerButton primitive
                  // (post Step 1-5 reaudit). Step 6 cont's `aria-labelledby`
                  // SR binding kept since the primitive accepts it.
                  <DropdownTriggerButton
                    size="lg"
                    aria-labelledby="deadline-input-request-recipient-label"
                    disabled={loadingRecipients || recipients.length === 0}
                  >
                    <span className="truncate">{recipientTriggerText}</span>
                    <ChevronDownIcon className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
                  </DropdownTriggerButton>
                }
              />
              <DropdownMenuContent align="start" className="max-h-72 w-[var(--anchor-width)]">
                <DropdownMenuRadioGroup
                  value={selectedRecipientUserId}
                  onValueChange={onRecipientChange}
                >
                  {recipients.map((recipient) => (
                    <DropdownMenuRadioItem key={recipient.assigneeId} value={recipient.assigneeId}>
                      <AssigneeAvatar name={recipient.name} title={recipient.name} size="xs" />
                      <span className="min-w-0 flex-1 truncate">{recipient.name}</span>
                      <span className="text-xs text-text-tertiary">
                        {roleLabels[recipient.role]}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                  {!loadingRecipients && recipients.length === 0 ? (
                    <DropdownMenuItem disabled>
                      <Trans>No eligible recipients</Trans>
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {!loadingRecipients && recipients.length === 0 ? (
              <FieldDescription tone="warning">
                <Trans>Add an active owner or partner before sending an input request.</Trans>
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="deadline-input-request-message">
              <Trans>Message</Trans>
            </FieldLabel>
            <Textarea
              id="deadline-input-request-message"
              value={message}
              maxLength={1000}
              rows={5}
              placeholder={t`Add the decision or context you need.`}
              onChange={(event) => onMessageChange(event.currentTarget.value)}
            />
          </Field>
        </div>
        <DialogFooter className="border-t border-divider-subtle px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" onClick={onSubmit} disabled={submitDisabled} aria-busy={submitting}>
            {submitting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <SendIcon data-icon="inline-start" />
            )}
            <Trans>Send request</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AuthorityRejectionDialog({
  open,
  draft,
  reasonError,
  submitting,
  onOpenChange,
  onDraftChange,
  onSubmit,
}: {
  open: boolean
  draft: AuthorityRejectionDraft
  reasonError: boolean
  submitting: boolean
  onOpenChange: (open: boolean) => void
  onDraftChange: (patch: Partial<AuthorityRejectionDraft>) => void
  onSubmit: () => void
}) {
  const { t } = useLingui()
  const nextStepOptions: Array<{
    value: ObligationFiledRejectionNextStep
    label: string
    description: string
  }> = [
    {
      value: 'correct_resubmit',
      label: t`Correct and resubmit`,
      description: t`Keep this deadline in the In review workflow.`,
    },
    {
      value: 'request_client_input',
      label: t`Request client input`,
      description: t`Open Readiness after the rejection is recorded.`,
    },
    {
      value: 'paper_file',
      label: t`Switch to paper filing`,
      description: t`Use Evidence to track the paper filing packet.`,
    },
  ]

  return (
    <Dialog protectInput open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(760px,calc(100vh-2rem))] w-[min(640px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-divider-subtle px-6 py-5 pr-12">
          <DialogTitle>
            <Trans>Record authority rejection</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Record the rejection details before moving this deadline back to In review.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-6 py-5">
          {/* Reason's char counter rides FieldLabel as a trailing span —
              FieldLabel already gap-2's children so no extra flex row
              needed; the w-full + justify-between recipe keeps the
              counter right-aligned. */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="authority-rejected-date">
                <Trans>Rejected date</Trans>
              </FieldLabel>
              <Input
                id="authority-rejected-date"
                type="date"
                value={draft.rejectedAt}
                onChange={(event) => onDraftChange({ rejectedAt: event.currentTarget.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="authority-rejected-authority">
                <Trans>Authority</Trans>
              </FieldLabel>
              <Input
                id="authority-rejected-authority"
                value={draft.authority}
                maxLength={80}
                placeholder={t`IRS / CA FTB`}
                onChange={(event) => onDraftChange({ authority: event.currentTarget.value })}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="authority-rejected-reference">
              <Trans>Reject code / notice reference</Trans>
            </FieldLabel>
            <Input
              id="authority-rejected-reference"
              value={draft.reference}
              maxLength={120}
              placeholder={t`Optional`}
              onChange={(event) => onDraftChange({ reference: event.currentTarget.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="authority-rejected-reason" className="w-full justify-between">
              <Trans>Reason</Trans>
              <span className="text-caption-xs tabular-nums font-normal text-text-tertiary">
                {draft.reason.length}/280
              </span>
            </FieldLabel>
            <Textarea
              id="authority-rejected-reason"
              value={draft.reason}
              maxLength={280}
              rows={4}
              aria-invalid={reasonError}
              aria-describedby={reasonError ? 'authority-rejected-reason-error' : undefined}
              placeholder={t`Summarize what the authority rejected and what needs correction.`}
              onChange={(event) => onDraftChange({ reason: event.currentTarget.value })}
            />
            {reasonError ? (
              <FieldError id="authority-rejected-reason-error">
                <Trans>Add a reason.</Trans>
              </FieldError>
            ) : null}
          </Field>
          <div className="grid gap-2">
            <span className="text-sm font-medium">
              <Trans>Next step</Trans>
            </span>
            <div role="radiogroup" className="grid gap-2">
              {nextStepOptions.map((option) => {
                const selected = draft.nextStep === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cn(
                      'grid cursor-pointer gap-1 rounded-lg border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                      selected
                        ? 'border-accent-default bg-state-accent-hover-alt'
                        : 'border-divider-subtle hover:bg-state-base-hover',
                    )}
                    onClick={() => onDraftChange({ nextStep: option.value })}
                  >
                    <span className="text-sm font-medium text-text-primary">{option.label}</span>
                    <span className="text-xs text-text-secondary">{option.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-divider-subtle px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" onClick={onSubmit} disabled={submitting} aria-busy={submitting}>
            {submitting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <AlertTriangleIcon data-icon="inline-start" />
            )}
            <Trans>Record rejection</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MaterialsRequestPreviewDialog({
  open,
  preview,
  correctionMode,
  loading,
  errorMessage,
  sending,
  onOpenChange,
  onSend,
}: {
  open: boolean
  preview: ReadinessPreviewRequestEmailOutput | null
  correctionMode: boolean
  loading: boolean
  errorMessage: string | null
  sending: boolean
  onOpenChange: (open: boolean) => void
  onSend: () => void
}) {
  const emailStatus = preview?.recipientEmail ? (
    preview.emailWillBeQueued ? (
      <Badge variant="success">
        <Trans>Email queued</Trans>
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Trans>Link only</Trans>
      </Badge>
    )
  ) : (
    <Badge variant="secondary">
      <Trans>No client email</Trans>
    </Badge>
  )

  return (
    <Dialog protectInput open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(760px,calc(100vh-2rem))] w-[min(720px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-divider-subtle px-6 py-5 pr-12">
          <DialogTitle>
            <Trans>Preview materials request</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Review the email generated from the email template before creating the client
              materials link.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-state-destructive-border bg-state-destructive-hover p-3 text-sm text-text-destructive"
            >
              {errorMessage}
            </p>
          ) : preview ? (
            <>
              <section className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CapsFieldLabel as="span" variant="group">
                    <Trans>Recipient</Trans>
                  </CapsFieldLabel>
                  {emailStatus}
                </div>
                <p className="rounded-lg border border-divider-subtle bg-background-subtle p-3 font-mono text-sm text-text-primary">
                  {preview.recipientEmail ?? <Trans>A materials link will be created only.</Trans>}
                </p>
                {!preview.emailWillBeQueued ? (
                  <p className="text-xs text-text-tertiary">
                    {preview.recipientEmail && !preview.templateActive ? (
                      <Trans>
                        The template is paused in Reminder emails settings, so no email will be
                        queued.
                      </Trans>
                    ) : (
                      <Trans>
                        The client can still receive the link manually after it is created.
                      </Trans>
                    )}
                  </p>
                ) : null}
              </section>
              <section className="grid gap-2">
                <CapsFieldLabel as="span" variant="group">
                  <Trans>Subject</Trans>
                </CapsFieldLabel>
                <p className="rounded-lg border border-divider-subtle p-3 text-sm font-medium text-text-primary">
                  {preview.subject}
                </p>
              </section>
              <section className="grid gap-2">
                <CapsFieldLabel as="span" variant="group">
                  <Trans>Email body</Trans>
                </CapsFieldLabel>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-divider-subtle bg-background-subtle p-3 font-mono text-xs leading-relaxed text-text-primary">
                  {preview.bodyText}
                </pre>
              </section>
              <div className="grid gap-3 md:grid-cols-2">
                <MaterialsRequestPreviewChecklist
                  title={
                    correctionMode ? <Trans>Needs correction</Trans> : <Trans>Outstanding</Trans>
                  }
                  items={preview.checklist.outstanding}
                />
                {correctionMode ? null : (
                  <MaterialsRequestPreviewChecklist
                    title={<Trans>Received</Trans>}
                    items={preview.checklist.received}
                  />
                )}
              </div>
            </>
          ) : null}
        </div>
        <DialogFooter className="border-t border-divider-subtle px-6 py-4">
          <Button variant="outline" nativeButton={false} render={<Link to="/reminders" />}>
            <ExternalLinkIcon data-icon="inline-start" />
            <Trans>Edit template in Reminder emails settings</Trans>
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" onClick={onSend} disabled={!preview || loading || sending}>
            <SendIcon data-icon="inline-start" />
            {preview?.emailWillBeQueued ? (
              correctionMode ? (
                <Trans>Send correction request</Trans>
              ) : (
                <Trans>Send request</Trans>
              )
            ) : (
              <Trans>Create materials link</Trans>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MaterialsRequestPreviewChecklist({
  title,
  items,
}: {
  title: ReactNode
  items: readonly ReadinessDocumentChecklistItemPublic[]
}) {
  return (
    <section className="grid content-start gap-2 rounded-lg border border-divider-subtle p-3">
      <header className="flex items-center gap-2">
        <CapsFieldLabel as="div" variant="group">
          {title}
        </CapsFieldLabel>
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-background-subtle px-1 text-caption-xs font-medium tabular-nums text-text-secondary">
          {items.length}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          <Trans>None</Trans>
        </p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.id} className="grid gap-0.5 text-sm">
              <span className="font-medium text-text-primary">{item.label}</span>
              {item.description ? (
                <span className="text-xs text-text-secondary">{item.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function PenaltyInputDialog({
  row,
  onClose,
  onSaved,
}: {
  row: ObligationQueueRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLingui()
  const [draft, setDraft] = useState({ rowId: '', taxDue: '', ownerCount: '' })
  const mutation = useMutation(
    orpc.clients.updatePenaltyInputs.mutationOptions({
      onSuccess: () => {
        toast.success(t`Penalty inputs saved`)
        onSaved()
        onClose()
      },
      onError: (err) => {
        toast.error(t`Couldn't save penalty inputs`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  if (row && draft.rowId !== row.id) {
    setDraft({ rowId: row.id, taxDue: '', ownerCount: '' })
  }

  function save() {
    if (!row) return
    const taxDue = parseMoneyCents(draft.taxDue)
    const ownerCount = parseOwnerCount(draft.ownerCount)
    mutation.mutate({
      id: row.clientId,
      ...(taxDue !== null ? { estimatedTaxLiabilityCents: taxDue } : {}),
      ...(ownerCount !== null ? { equityOwnerCount: ownerCount } : {}),
      reason: t`Deadline needs-input update`,
    })
  }

  return (
    <Dialog open={row !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          {/* Title names the client so CPAs working through a list in
              one sitting can answer "whose penalty am I editing?"
              without a second glance. Description retains the tax-code
              suffix so the filing context is still legible. */}
          <DialogTitle>
            {row ? (
              <Trans>Penalty inputs for {row.clientName}</Trans>
            ) : (
              <Trans>Penalty inputs</Trans>
            )}
          </DialogTitle>
          <DialogDescription>{row ? formatTaxCode(row.taxType) : null}</DialogDescription>
        </DialogHeader>
        {/* Real <label> elements (placeholder alone disappears on type)
            plus inline helper text describing accepted formats. */}
        <div className="grid gap-3">
          <Field>
            <FieldLabel htmlFor="penalty-tax-due">
              <Trans>Estimated tax due</Trans>
            </FieldLabel>
            <Input
              id="penalty-tax-due"
              inputMode="decimal"
              placeholder={t`e.g. 1,234.56`}
              value={draft.taxDue}
              onChange={(event) =>
                setDraft((current) => ({ ...current, taxDue: event.target.value }))
              }
            />
            <FieldDescription>
              <Trans>Dollars and cents.</Trans>
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="penalty-owner-count">
              <Trans>Owner count</Trans>
            </FieldLabel>
            <Input
              id="penalty-owner-count"
              inputMode="numeric"
              placeholder={t`e.g. 2`}
              value={draft.ownerCount}
              onChange={(event) =>
                setDraft((current) => ({ ...current, ownerCount: event.target.value }))
              }
            />
            <FieldDescription>
              <Trans>Positive whole number.</Trans>
            </FieldDescription>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          {/* Disable save when both inputs are empty — a no-op write
              would pollute the audit log. */}
          <Button
            onClick={save}
            disabled={
              mutation.isPending || (draft.taxDue.trim() === '' && draft.ownerCount.trim() === '')
            }
          >
            <Trans>Save changes</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
