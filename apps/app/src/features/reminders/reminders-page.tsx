import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { Edit3Icon, Loader2, PauseCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import type {
  ReminderDeliveryStatus,
  ReminderRecentSend,
  ReminderRecipientKind,
  ReminderTemplatePublic,
} from '@duedatehq/contracts'
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
    <div className="mx-auto flex w-full max-w-page-wide flex-col gap-6 p-4 md:p-6">
      <PageHeader
        breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Reminder emails` }]}
        title={<Trans>Reminder emails</Trans>}
      />

      <div className="grid gap-4">
        <TemplatesPanel
          templates={templatesQuery.data ?? []}
          loading={templatesQuery.isLoading}
          onEdit={setEditingTemplate}
        />
        <RecentSendsPanel
          reminders={recentQuery.data?.reminders ?? []}
          loading={recentQuery.isLoading}
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

function TemplatesPanel({
  templates,
  loading,
  onEdit,
}: {
  templates: ReminderTemplatePublic[]
  loading: boolean
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
        {loading ? (
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
                        <Trans>Active</Trans>
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Trans>Paused</Trans>
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="tabular-nums">{template.usageCount}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(template)}>
                      <Edit3Icon data-icon="inline-start" />
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

function RecentSendsPanel({
  reminders,
  loading,
  timezone,
}: {
  reminders: ReminderRecentSend[]
  loading: boolean
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
        {loading ? (
          <div className="grid gap-2" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reminders.length === 0 ? (
          // Canonical EmptyState — same as the sibling Upcoming reminders
          // panel.
          <EmptyState title={<Trans>No reminders sent yet.</Trans>} />
        ) : (
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
                        <span className="text-xs text-text-destructive">{item.failureReason}</span>
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
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-text-primary">
              <Trans>Subject</Trans>
            </span>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-text-primary">
              <Trans>Body</Trans>
            </span>
            {/* No font-mono on the reminder email body — email-template copy
                is human prose, not code. */}
            <Textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              className="min-h-40"
            />
          </label>
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
            {/* Save announces aria-busy + shows a Loader2 spinner while
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
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : null}
              <Trans>Save template</Trans>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
