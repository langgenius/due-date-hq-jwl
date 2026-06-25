import { useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  CircleAlertIcon,
  PencilIcon,
  Loader2Icon,
  PauseCircleIcon,
  SendIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  ReminderDeliveryStatus,
  ReminderRecentSend,
  ReminderRecipientKind,
  ReminderTemplatePublic,
} from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Field, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Switch } from '@duedatehq/ui/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'

import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { RelativeTime } from '@/components/primitives/relative-time'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'

function statusBadge(status: ReminderDeliveryStatus) {
  if (status === 'sent')
    return (
      <Badge variant="success">
        <Trans>Sent</Trans>
      </Badge>
    )
  if (status === 'failed')
    return (
      <Badge variant="destructive">
        <Trans>Failed</Trans>
      </Badge>
    )
  if (status === 'queued')
    return (
      <Badge variant="info">
        <Trans>Queued</Trans>
      </Badge>
    )
  if (status === 'skipped')
    return (
      <Badge variant="secondary">
        <Trans>Skipped</Trans>
      </Badge>
    )
  return (
    <Badge variant="outline">
      <Trans>Pending</Trans>
    </Badge>
  )
}

function recipientLabel(kind: ReminderRecipientKind) {
  return kind === 'client' ? <Trans>Client</Trans> : <Trans>Team</Trans>
}

function templateListDescription(template: ReminderTemplatePublic) {
  if (template.templateKey === 'client-deadline-30-day-reminder') {
    return <Trans>Sent to clients 30 days before the deadline — the early countdown email.</Trans>
  }
  if (template.templateKey === 'client-deadline-7-day-reminder') {
    return <Trans>Sent to clients 7 days before the deadline — the final countdown email.</Trans>
  }
  if (template.kind === 'readiness_request') {
    return (
      <Trans>Sent to clients from Send to client — collects the open materials checklist.</Trans>
    )
  }
  return <Trans>Custom reminder template for this practice.</Trans>
}

function templateDialogDescription(template: ReminderTemplatePublic) {
  if (template.templateKey === 'client-deadline-30-day-reminder') {
    return (
      <Trans>
        This is the 30-day client countdown email. Variables: client_name, tax_type, due_date,
        offset_days, obligation_url, and unsubscribe_url.
      </Trans>
    )
  }
  if (template.templateKey === 'client-deadline-7-day-reminder') {
    return (
      <Trans>
        This is the 7-day client countdown email. Variables: client_name, tax_type, due_date,
        offset_days, obligation_url, and unsubscribe_url.
      </Trans>
    )
  }
  if (template.kind === 'readiness_request') {
    return (
      <Trans>
        This template is used when Materials sends a checklist collection request. Variables:
        client_name, tax_type, due_date, request_url, outstanding_checklist, and received_checklist.
      </Trans>
    )
  }
  return (
    <Trans>
      Variables: client_name, tax_type, due_date, offset_days, obligation_url, and unsubscribe_url.
    </Trans>
  )
}

export function RemindersPage() {
  const { t } = useLingui()
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplatePublic | null>(null)
  const templatesQuery = useQuery(orpc.reminders.listTemplates.queryOptions({ input: undefined }))
  const recentQuery = useQuery(
    orpc.reminders.listRecentSends.queryOptions({ input: { limit: 20 } }),
  )
  const timezone = usePracticeTimezone()

  return (
    // 2026-06-16 (audit): mx-auto + max-w-page-wide cap (was full-bleed).
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 px-4 pt-8 pb-12 md:px-6">
      <PageHeader
        breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Reminder emails` }]}
        title={<Trans>Reminder emails</Trans>}
      />

      <div className="grid gap-4">
        <TemplatesPanel
          templates={templatesQuery.data ?? []}
          loading={templatesQuery.isLoading}
          // throwOnError:false means a failed load otherwise renders an empty
          // table — a false "no templates" state. Surface the error + Retry.
          error={templatesQuery.isError ? templatesQuery.error : null}
          onRetry={() => void templatesQuery.refetch()}
          onEdit={setEditingTemplate}
        />
        <RecentSendsPanel
          reminders={recentQuery.data?.reminders ?? []}
          loading={recentQuery.isLoading}
          // Same guard: without it a failed load shows "No reminders sent yet."
          error={recentQuery.isError ? recentQuery.error : null}
          onRetry={() => void recentQuery.refetch()}
          timezone={timezone}
        />
      </div>

      {editingTemplate ? (
        <TemplateDialog
          key={editingTemplate.templateKey}
          template={editingTemplate}
          open
          onOpenChange={(open) => {
            if (!open) setEditingTemplate(null)
          }}
        />
      ) : null}
    </div>
  )
}

// Shared panel-body error state — canonical destructive `<Alert>` + the
// app-wide `<Button variant="link">` Retry (same shape as the Today / alerts
// list error branches), wired to the failed query's refetch.
function RemindersErrorState({
  title,
  error,
  onRetry,
}: {
  title: ReactNode
  error: unknown
  onRetry: () => void
}) {
  const { t } = useLingui()
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {rpcErrorMessage(error) ?? t`Try again in a moment. If it keeps failing, contact support.`}{' '}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 align-baseline"
          onClick={onRetry}
        >
          <Trans>Retry</Trans>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function TemplatesPanel({
  templates,
  loading,
  error,
  onRetry,
  onEdit,
}: {
  templates: ReminderTemplatePublic[]
  loading: boolean
  error: unknown
  onRetry: () => void
  onEdit: (template: ReminderTemplatePublic) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Reminder templates</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>
            Edit the practice-managed 30-day countdown, 7-day countdown, and checklist collection
            emails.
          </Trans>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          // Load failed → explicit error, not an empty table (throwOnError is
          // off, so a failed query would silently read as "no templates").
          <RemindersErrorState
            title={<Trans>Couldn't load reminder templates</Trans>}
            error={error}
            onRetry={onRetry}
          />
        ) : loading ? (
          // Skeleton row stacks shaped to the eventual table row, matching the
          // queue / audit / opportunities skeleton register.
          <div className="grid gap-2" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Template</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Status</Trans>
                </TableHead>
                <TableHead>
                  {/* Counts SENT reminders only (repo: status='sent') — the
                      header must say what the number means or it reads as
                      contradicting the pending rows in Recent delivery. */}
                  <Trans>Sent</Trans>
                </TableHead>
                <TableHead className="w-[96px]" />
              </TableRow>
            </TableHeader>
            <TableBody className="[&_td]:py-3">
              {templates.map((template) => (
                <TableRow key={template.templateKey}>
                  <TableCell>
                    <div className="grid gap-1 whitespace-normal">
                      <span className="font-medium text-text-primary">{template.name}</span>
                      <span className="text-xs text-text-tertiary">
                        {templateListDescription(template)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.active ? (
                      <Badge variant="success">
                        <BadgeStatusDot tone="success" />
                        <Trans>Active</Trans>
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <BadgeStatusDot tone="disabled" />
                        <Trans>Paused</Trans>
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="tabular-nums">{template.usageCount}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(template)}>
                      <PencilIcon data-icon="inline-start" />
                      <Trans>Edit</Trans>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// DeliverySummaryBand — answers the CPA's real triage question: "did reminders
// land?" Counts are derived entirely from the loaded reminders array — no
// fabricated totals, no external data shape.
//
// sentCount  — items where deliveryStatus === 'sent'
// failedCount — items where deliveryStatus === 'failed'
//
// Only renders when there is at least one reminder (the empty state renders
// instead of a "0 sent · 0 failed" band). The "last N" qualifier is honest:
// this is the most recent slice from the API (limit: 20), not a total-ever.
function DeliverySummaryBand({ reminders }: { reminders: ReminderRecentSend[] }) {
  const { t } = useLingui()
  const sentCount = reminders.filter((r) => r.deliveryStatus === 'sent').length
  const failedCount = reminders.filter((r) => r.deliveryStatus === 'failed').length

  return (
    <div className="mb-4 flex items-center gap-4 rounded-lg border border-divider-subtle bg-background-subtle px-4 py-3 text-sm">
      <span className="flex items-center gap-1.5 text-text-secondary">
        <CheckCircle2Icon className="size-4 text-text-success" aria-hidden />
        <span className="tabular-nums font-medium text-text-primary">{sentCount}</span>
        <span>{t`sent`}</span>
      </span>
      <span className="text-divider-regular" aria-hidden>
        ·
      </span>
      {failedCount > 0 ? (
        <span className="flex items-center gap-1.5 text-text-secondary">
          <XCircleIcon className="size-4 text-text-destructive" aria-hidden />
          <span className="tabular-nums font-medium text-text-destructive">{failedCount}</span>
          <span>{t`failed`}</span>
        </span>
      ) : (
        <span className="text-text-tertiary">{t`no failures`}</span>
      )}
      <span className="ml-auto text-xs text-text-tertiary">
        <Trans>Last 20 reminders</Trans>
      </span>
    </div>
  )
}

function RecentSendsPanel({
  reminders,
  loading,
  error,
  onRetry,
  timezone,
}: {
  reminders: ReminderRecentSend[]
  loading: boolean
  error: unknown
  onRetry: () => void
  timezone: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Recent delivery</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          // Load failed → explicit error, not "No reminders sent yet."
          <RemindersErrorState
            title={<Trans>Couldn't load recent sends</Trans>}
            error={error}
            onRetry={onRetry}
          />
        ) : loading ? (
          // Skeleton rows shaped to the actual 4-column table: name+subtext,
          // recipient, status badge, date — so the layout doesn't reflow on paint.
          <div className="grid gap-2" aria-busy="true">
            <Skeleton className="h-[52px] w-full" />
            <Skeleton className="h-[52px] w-full" />
            <Skeleton className="h-[52px] w-full" />
          </div>
        ) : reminders.length === 0 ? (
          // Canonical EmptyState — same as the sibling Upcoming reminders
          // panel.
          <EmptyState
            icon={SendIcon}
            title={<Trans>No reminders sent yet.</Trans>}
            description={<Trans>Sent reminder emails will appear here as they go out.</Trans>}
          />
        ) : (
          <>
            {/* Delivery summary — honest counts from loaded data only. */}
            <DeliverySummaryBand reminders={reminders} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans>Reminder</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Recipient</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Status</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Created</Trans>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_td]:py-3">
                {reminders.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="grid gap-1 whitespace-normal">
                        <span className="font-medium text-text-primary">{item.clientName}</span>
                        <span className="text-xs text-text-tertiary">
                          <TaxCodeLabel code={item.taxType} />
                        </span>
                        {item.failureReason ? (
                          <span className="text-xs text-text-destructive">
                            {item.failureReason}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-1 whitespace-normal">
                        <span>{recipientLabel(item.recipientKind)}</span>
                        <span className="text-xs text-text-tertiary">{item.recipientEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(item.deliveryStatus)}</TableCell>
                    {/* Same RelativeTime treatment as the suppression card and
                        the Inbox / Members table. */}
                    <TableCell>
                      <RelativeTime
                        value={item.createdAt}
                        timeZone={timezone}
                        className="text-text-secondary"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TemplateDialog({
  template,
  open,
  onOpenChange,
}: {
  template: ReminderTemplatePublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState(template.subject)
  const [bodyText, setBodyText] = useState(template.bodyText)
  const [active, setActive] = useState(template.active)
  const updateTemplate = useMutation(
    orpc.reminders.updateTemplate.mutationOptions({
      onSuccess: () => {
        track(ANALYTICS_EVENTS.reminderTemplateEdited)
        void queryClient.invalidateQueries({ queryKey: orpc.reminders.key() })
        toast.success(t`Reminder template updated`)
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(t`Couldn't update reminder template`, {
          description:
            rpcErrorMessage(error) ??
            t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  return (
    <Dialog protectInput open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[680px]">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>{templateDialogDescription(template)}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            updateTemplate.mutate({ templateKey: template.templateKey, subject, bodyText, active })
          }}
        >
          <Field className="grid gap-2">
            <FieldLabel htmlFor="reminder-template-subject">
              <Trans>Subject</Trans>
            </FieldLabel>
            <Input
              id="reminder-template-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Field>
          <Field className="grid gap-2">
            <FieldLabel htmlFor="reminder-template-body">
              <Trans>Body</Trans>
            </FieldLabel>
            {/* No font-mono on the reminder email body — email-template copy
                is human prose, not code. */}
            <Textarea
              id="reminder-template-body"
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              className="min-h-40"
            />
          </Field>
          {/* Field horizontal + FieldLabel + trailing Switch. The Field
              primitive owns the gap, label↔control wiring, and click target;
              the status-dot / pause-icon glyph stays inline. */}
          <Field
            orientation="horizontal"
            className="rounded-lg border border-divider-subtle p-3 text-sm"
          >
            <FieldLabel htmlFor="reminder-template-active">
              {active ? (
                <BadgeStatusDot tone="success" />
              ) : (
                <PauseCircleIcon className="size-4 text-text-tertiary" aria-hidden />
              )}
              <span>
                <Trans>Active</Trans>
              </span>
            </FieldLabel>
            <Switch id="reminder-template-active" checked={active} onCheckedChange={setActive} />
          </Field>
          <DialogFooter>
            {/* Save announces aria-busy + shows a Loader2Icon spinner while
                pending. */}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              type="submit"
              disabled={updateTemplate.isPending}
              aria-busy={updateTemplate.isPending}
            >
              {updateTemplate.isPending ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : null}
              <Trans>Save template</Trans>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
