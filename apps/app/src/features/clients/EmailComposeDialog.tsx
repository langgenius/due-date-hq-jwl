import { type ReactNode, useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  BoldIcon,
  BracesIcon,
  ClockIcon,
  FileTextIcon,
  HeadingIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  Link2Icon,
  ListIcon,
  MailIcon,
  PaperclipIcon,
  QuoteIcon,
  SendIcon,
  SparklesIcon,
  UnderlineIcon,
  XIcon,
} from 'lucide-react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { Kbd } from '@/components/patterns/kbd'

/**
 * EmailComposeDialog — client-email composition modal (Pencil `W7onE`).
 *
 * A two-column compose surface: the left column is the message
 * (recipients · subject · formatting toolbar · body), the right column
 * is read-only context (linked obligation, stage, next deadline,
 * readiness-portal link, attachments). Header carries a template chip;
 * footer carries Discard / Schedule send / Send now.
 *
 * FUNCTIONAL STATUS: there is no email-send procedure in the contracts
 * yet, so **Send now / Schedule send / Save as draft stay disabled with
 * a TODO(data) flag** rather than faking a no-op. The body textarea and
 * subject are live, editable state so the surface is a real draft
 * scratchpad; the recipient + context come from the caller. When a
 * `messages.send` (or similar) RPC lands, wire `onSend` here.
 */

export interface EmailComposeContextRow {
  id: string
  label: ReactNode
  value: ReactNode
}

export interface EmailComposeAttachment {
  id: string
  name: string
  size: string
}

export interface EmailComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientName: string
  recipientEmail: string | null
  /** Template chip label, e.g. "1040 prep · round 1". */
  templateLabel?: ReactNode
  defaultSubject?: string
  defaultBody?: string
  contextRows?: EmailComposeContextRow[]
  attachments?: EmailComposeAttachment[]
  /** Sender footnote, e.g. "Sent FROM jules@brightline.com via DueDateHQ". */
  senderNote?: ReactNode
  /** Readiness-portal banner copy — shown when set. */
  readinessNote?: { title: ReactNode; detail: ReactNode }
}

const TOOLBAR_ICONS: Array<{ id: string; Icon: typeof BoldIcon }> = [
  { id: 'bold', Icon: BoldIcon },
  { id: 'italic', Icon: ItalicIcon },
  { id: 'underline', Icon: UnderlineIcon },
  { id: 'link', Icon: LinkIcon },
  { id: 'list', Icon: ListIcon },
  { id: 'quote', Icon: QuoteIcon },
  { id: 'heading', Icon: HeadingIcon },
  { id: 'image', Icon: ImageIcon },
  { id: 'paperclip', Icon: PaperclipIcon },
]

export function EmailComposeDialog({
  open,
  onOpenChange,
  recipientName,
  recipientEmail,
  templateLabel,
  defaultSubject = '',
  defaultBody = '',
  contextRows = [],
  attachments = [],
  senderNote,
  readinessNote,
}: EmailComposeDialogProps) {
  const { t } = useLingui()
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)

  // Reset the draft to the caller's prefill each time the modal opens
  // for a (potentially different) recipient.
  useEffect(() => {
    if (open) {
      setSubject(defaultSubject)
      setBody(defaultBody)
    }
  }, [open, defaultSubject, defaultBody])

  // TODO(data): no email-send contract exists yet. The send controls
  // stay disabled until a `messages.send` RPC lands.
  const sendDisabledReason = t`Sending isn't available yet — no email backend is wired.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[min(840px,calc(100vh-2rem))] w-[min(1120px,calc(100vw-2rem))] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-divider-subtle px-5 py-3.5">
          <MailIcon className="size-4 text-text-accent" aria-hidden />
          <DialogTitle className="text-base font-semibold">
            <Trans>New message</Trans>
          </DialogTitle>
          {templateLabel ? (
            <Badge variant="info" size="sm" className="gap-1">
              <SparklesIcon aria-hidden />
              {templateLabel}
            </Badge>
          ) : null}
          <span className="grow" />
          <Button variant="ghost" size="sm" disabled title={sendDisabledReason}>
            <Trans>Save as draft</Trans>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label={t`Close`}
          >
            <XIcon />
          </Button>
          <Kbd>Esc</Kbd>
        </div>

        {/* Two-column body */}
        <div className="grid min-h-0 grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left: the message */}
          <div className="flex min-h-0 flex-col gap-3.5 overflow-y-auto p-5">
            {/* Recipients + subject */}
            <div className="grid gap-2 rounded-lg bg-background-subtle p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-caption-xs font-bold tracking-wide text-text-tertiary uppercase">
                  <Trans>To</Trans>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-divider-subtle bg-background-default py-1 pr-2 pl-2.5 text-xs">
                  <span className="font-medium text-text-primary">{recipientName}</span>
                  {recipientEmail ? (
                    <span className="text-text-tertiary">{recipientEmail}</span>
                  ) : null}
                </span>
                <span className="grow" />
                <span className="text-caption-xs text-text-secondary">
                  <Trans>Cc · Bcc</Trans>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-caption-xs font-bold tracking-wide text-text-tertiary uppercase">
                  <Trans>Subject</Trans>
                </span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder={t`Add a subject`}
                  aria-label={t`Subject`}
                  className="min-w-0 grow rounded-sm bg-transparent text-sm font-semibold text-text-primary outline-none placeholder:font-normal placeholder:text-text-placeholder focus-visible:ring-1 focus-visible:ring-state-accent-active-alt"
                />
              </div>
            </div>

            {/* Formatting toolbar (visual — rich-text editing TODO) */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-divider-subtle p-1.5">
              {TOOLBAR_ICONS.map(({ id, Icon }) => (
                <Button
                  key={id}
                  variant="ghost"
                  size="icon-sm"
                  disabled
                  title={t`Rich-text formatting isn't available yet.`}
                  className="text-text-secondary"
                >
                  <Icon />
                </Button>
              ))}
              <span className="mx-1 h-4 w-px bg-divider-subtle" aria-hidden />
              <Button
                variant="ghost"
                size="sm"
                disabled
                title={t`Variable insertion isn't available yet.`}
                className="text-text-accent"
              >
                <BracesIcon data-icon="inline-start" />
                <Trans>Insert variable</Trans>
              </Button>
            </div>

            {/* Body */}
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t`Write your message…`}
              aria-label={t`Message body`}
              className="min-h-[260px] flex-1 resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Right: context */}
          <div className="flex min-h-0 flex-col gap-3.5 overflow-y-auto border-divider-subtle bg-background-subtle p-5 md:border-l">
            {contextRows.length > 0 ? (
              <div className="grid gap-2">
                <span className="text-caption-xs font-bold tracking-wide text-text-tertiary uppercase">
                  <Trans>Context</Trans>
                </span>
                <div className="grid gap-2 rounded-lg border border-divider-subtle bg-background-default p-3">
                  {contextRows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-text-tertiary">{row.label}</span>
                      <span className="min-w-0 truncate text-right font-medium text-text-primary">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {readinessNote ? (
              <div className="flex items-start gap-2.5 rounded-lg bg-state-accent-hover p-3">
                <Link2Icon className="mt-0.5 size-3.5 shrink-0 text-text-accent" aria-hidden />
                <div className="grid gap-0.5">
                  <span className="text-xs font-bold text-text-accent">{readinessNote.title}</span>
                  <span className="text-caption-xs text-text-secondary">
                    {readinessNote.detail}
                  </span>
                </div>
              </div>
            ) : null}

            {attachments.length > 0 ? (
              <div className="grid gap-2">
                <span className="text-caption-xs font-bold tracking-wide text-text-tertiary uppercase">
                  <Trans>Attachments · {attachments.length}</Trans>
                </span>
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-lg border border-divider-subtle bg-background-default p-2.5"
                  >
                    <FileTextIcon className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
                    <div className="grid min-w-0 gap-0.5">
                      <span className="truncate text-xs font-semibold text-text-primary">
                        {attachment.name}
                      </span>
                      <span className="text-caption-xs text-text-tertiary">{attachment.size}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {senderNote ? (
              <DialogDescription className="mt-auto text-caption-xs text-text-tertiary italic">
                {senderNote}
              </DialogDescription>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-divider-subtle px-5 py-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <Trans>Discard</Trans>
          </Button>
          <span className="grow" />
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <span {...props} className="inline-flex">
                  <Button variant="outline" size="sm" disabled>
                    <ClockIcon data-icon="inline-start" />
                    <Trans>Schedule send</Trans>
                  </Button>
                </span>
              )}
            />
            <TooltipContent>{sendDisabledReason}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={(props) => (
                <span {...props} className="inline-flex">
                  <Button variant="accent" size="sm" disabled aria-describedby="compose-send-note">
                    <SendIcon data-icon="inline-start" />
                    <Trans>Send now</Trans>
                  </Button>
                </span>
              )}
            />
            <TooltipContent>{sendDisabledReason}</TooltipContent>
          </Tooltip>
          <span id="compose-send-note" className="sr-only">
            {sendDisabledReason}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
