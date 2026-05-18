import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlarmClockIcon,
  BellIcon,
  CheckCircle2Icon,
  Edit3Icon,
  MailWarningIcon,
  PauseCircleIcon,
  SendIcon,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  ReminderDeliveryStatus,
  ReminderRecentSend,
  ReminderRecipientKind,
  ReminderTemplatePublic,
  ReminderUpcomingItem,
} from '@duedatehq/contracts'
import { Badge, BadgeStatusDot } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@duedatehq/ui/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { Input } from '@duedatehq/ui/components/ui/input'
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

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDate, formatDateTimeWithTimezone } from '@/lib/utils'

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

function offsetLabel(offsetDays: number) {
  if (offsetDays === 0) return <Trans>Overdue</Trans>
  if (offsetDays === 1) return <Trans>1 day before</Trans>
  return <Trans>{offsetDays} days before</Trans>
}

function StatTile({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: LucideIcon
  label: ReactNode
  value: number
  caption: ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="grid gap-1">
          <span className="text-xs font-medium tracking-wider text-text-tertiary uppercase">
            {label}
          </span>
          <span className="font-mono text-2xl leading-none font-semibold tabular-nums text-text-primary">
            {value}
          </span>
          <span className="text-xs text-text-tertiary">{caption}</span>
        </div>
        <span className="rounded-md bg-background-subtle p-2 text-text-secondary">
          <Icon className="size-4" aria-hidden />
        </span>
      </CardContent>
    </Card>
  )
}

export function RemindersPage() {
  const { t } = useLingui()
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplatePublic | null>(null)
  const overviewQuery = useQuery(orpc.reminders.overview.queryOptions({ input: undefined }))
  const templatesQuery = useQuery(orpc.reminders.listTemplates.queryOptions({ input: undefined }))
  const upcomingQuery = useQuery(orpc.reminders.listUpcoming.queryOptions({ input: { limit: 30 } }))
  const recentQuery = useQuery(
    orpc.reminders.listRecentSends.queryOptions({ input: { limit: 20 } }),
  )
  const suppressionsQuery = useQuery(
    orpc.reminders.listSuppressions.queryOptions({ input: { limit: 12 } }),
  )

  const overview = overviewQuery.data
  const timezone = overview?.practiceTimezone ?? 'America/New_York'

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-1">
          <h1 className="text-2xl leading-tight font-semibold text-text-primary">
            <Trans>Reminders</Trans>
          </h1>
          <p className="max-w-[760px] text-sm text-text-secondary">
            <Trans>
              Manage the reminder schedule, message templates, recent delivery status, and client
              email suppressions for deadline work.
            </Trans>
          </p>
        </div>
        <Button render={<Link to="/notifications" />} variant="outline" size="sm">
          <BellIcon data-icon="inline-start" />
          <Trans>Personal inbox</Trans>
        </Button>
      </header>

      {overviewQuery.isError ? (
        <Card>
          <CardContent className="p-4 text-sm text-text-destructive">
            {rpcErrorMessage(overviewQuery.error) ?? t`Couldn't load reminder overview`}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={CheckCircle2Icon}
          label={<Trans>Active templates</Trans>}
          value={overview?.activeTemplateCount ?? 0}
          caption={<Trans>Practice-level delivery copy</Trans>}
        />
        <StatTile
          icon={AlarmClockIcon}
          label={<Trans>Upcoming</Trans>}
          value={overview?.upcomingCount ?? 0}
          caption={<Trans>30 / 7 / 1 day and overdue</Trans>}
        />
        <StatTile
          icon={SendIcon}
          label={<Trans>Sent last 7 days</Trans>}
          value={overview?.sentLast7DaysCount ?? 0}
          caption={<Trans>Outbox-confirmed sends</Trans>}
        />
        <StatTile
          icon={MailWarningIcon}
          label={<Trans>Suppressed</Trans>}
          value={overview?.suppressedEmailCount ?? 0}
          caption={<Trans>Client email opt-outs</Trans>}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <TemplatesPanel
            templates={templatesQuery.data ?? []}
            loading={templatesQuery.isLoading}
            onEdit={setEditingTemplate}
          />
          <UpcomingPanel
            reminders={upcomingQuery.data?.reminders ?? []}
            loading={upcomingQuery.isLoading}
          />
          <RecentSendsPanel
            reminders={recentQuery.data?.reminders ?? []}
            loading={recentQuery.isLoading}
            timezone={timezone}
          />
        </div>
        <SuppressionsPanel
          suppressions={suppressionsQuery.data?.suppressions ?? []}
          loading={suppressionsQuery.isLoading}
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
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-text-secondary">
            <Trans>Loading templates…</Trans>
          </p>
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
                  <Trans>Usage</Trans>
                </TableHead>
                <TableHead className="w-[96px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.templateKey}>
                  <TableCell>
                    <div className="grid gap-1 whitespace-normal">
                      <span className="font-medium text-text-primary">{template.name}</span>
                      <span className="text-xs text-text-tertiary">{template.subject}</span>
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
                    <span className="font-mono tabular-nums">{template.usageCount}</span>
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

function UpcomingPanel({
  reminders,
  loading,
}: {
  reminders: ReminderUpcomingItem[]
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Upcoming schedule</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-text-secondary">
            <Trans>Loading upcoming reminders…</Trans>
          </p>
        ) : reminders.length === 0 ? (
          <p className="rounded-md border border-divider-subtle p-4 text-sm text-text-secondary">
            <Trans>No upcoming reminders match the current 30 / 7 / 1-day windows.</Trans>
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Trans>Client</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Recipient</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Window</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Due</Trans>
                </TableHead>
                <TableHead>
                  <Trans>Status</Trans>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="grid gap-1 whitespace-normal">
                      <Link
                        to={`/obligations?obligation=${item.obligationId}`}
                        className="font-medium text-text-primary hover:underline"
                      >
                        {item.clientName}
                      </Link>
                      <span className="text-xs text-text-tertiary">{item.taxType}</span>
                    </div>
                  </TableCell>
                  <TableCell>{recipientLabel(item.recipientKind)}</TableCell>
                  <TableCell>{offsetLabel(item.offsetDays)}</TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {formatDate(item.dueDate)}
                  </TableCell>
                  <TableCell>{statusBadge(item.deliveryStatus)}</TableCell>
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
          <p className="text-sm text-text-secondary">
            <Trans>Loading recent delivery…</Trans>
          </p>
        ) : reminders.length === 0 ? (
          <p className="rounded-md border border-divider-subtle p-4 text-sm text-text-secondary">
            <Trans>No reminder deliveries have been recorded yet.</Trans>
          </p>
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
            <TableBody>
              {reminders.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="grid gap-1 whitespace-normal">
                      <span className="font-medium text-text-primary">{item.clientName}</span>
                      <span className="text-xs text-text-tertiary">{item.taxType}</span>
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
                  <TableCell className="font-mono tabular-nums">
                    {formatDateTimeWithTimezone(item.createdAt, timezone)}
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

function SuppressionsPanel({
  suppressions,
  loading,
  timezone,
}: {
  suppressions: Array<{ id: string; email: string; reason: string; createdAt: string }>
  loading: boolean
  timezone: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Client suppressions</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {loading ? (
          <p className="text-sm text-text-secondary">
            <Trans>Loading suppressions…</Trans>
          </p>
        ) : suppressions.length === 0 ? (
          <p className="rounded-md border border-divider-subtle p-4 text-sm text-text-secondary">
            <Trans>No client emails are suppressed.</Trans>
          </p>
        ) : (
          suppressions.map((item) => (
            <article
              key={item.id}
              className="grid gap-2 rounded-md border border-divider-subtle p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-text-primary">
                  {item.email}
                </span>
                <Badge variant="secondary">{item.reason}</Badge>
              </div>
              <span className="font-mono text-xs tabular-nums text-text-tertiary">
                {formatDateTimeWithTimezone(item.createdAt, timezone)}
              </span>
            </article>
          ))
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
          description: rpcErrorMessage(error) ?? t`Please try again.`,
        })
      },
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[680px]">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            <Trans>
              Variables use double braces, for example client_name, tax_type, due_date, offset_days,
              obligation_url, or unsubscribe_url.
            </Trans>
          </DialogDescription>
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
            <Textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              className="min-h-40 font-mono"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-md border border-divider-subtle p-3 text-sm">
            <span className="flex items-center gap-2">
              {active ? (
                <BadgeStatusDot tone="success" />
              ) : (
                <PauseCircleIcon className="size-4 text-text-tertiary" aria-hidden />
              )}
              <span>
                <Trans>Template active</Trans>
              </span>
            </span>
            <Switch checked={active} onCheckedChange={setActive} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={updateTemplate.isPending}>
              <Trans>Save template</Trans>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
