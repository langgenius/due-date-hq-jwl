import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlarmClockIcon,
  BellIcon,
  CheckCircle2Icon,
  ClockIcon,
  Edit3Icon,
  Loader2,
  MailWarningIcon,
  PauseCircleIcon,
  SendIcon,
  TriangleAlertIcon,
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

import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatDate } from '@/lib/utils'
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

function offsetLabel(offsetDays: number) {
  if (offsetDays === 0) return <Trans>Overdue</Trans>
  if (offsetDays === 1) return <Trans>1 day before</Trans>
  return <Trans>{offsetDays} days before</Trans>
}

function templateListDescription(template: ReminderTemplatePublic) {
  if (template.templateKey === 'client-deadline-30-day-reminder') {
    return <Trans>Sent to clients 30 days before the deadline as the early countdown email.</Trans>
  }
  if (template.templateKey === 'client-deadline-7-day-reminder') {
    return <Trans>Sent to clients 7 days before the deadline as the final countdown email.</Trans>
  }
  if (template.kind === 'readiness_request') {
    return <Trans>Used from Send to client to collect the current checklist from the client.</Trans>
  }
  return <Trans>Practice-managed reminder template.</Trans>
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

function StatTile({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'neutral',
}: {
  icon: LucideIcon
  label: ReactNode
  value: number
  caption: ReactNode
  // `critical` reserves destructive color for genuinely-stuck magnitudes
  // (failed sends) per DESIGN.md §7 — never default to it.
  tone?: 'neutral' | 'critical'
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="grid gap-1">
          <span className="text-xs font-medium tracking-wider text-text-tertiary uppercase">
            {label}
          </span>
          <span
            className={`text-2xl leading-none font-semibold tabular-nums ${
              tone === 'critical' ? 'text-text-destructive' : 'text-text-primary'
            }`}
          >
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
      <PageHeader
        breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Reminders` }]}
        title={<Trans>Reminders</Trans>}
        actions={
          <Button
            render={<Link to="/notifications" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <BellIcon data-icon="inline-start" />
            <Trans>Personal inbox</Trans>
          </Button>
        }
      />

      {overviewQuery.isError ? (
        /* 2026-05-27 (step-6 cross-section #147): converted from
           Card-as-error chrome to canonical Alert variant="destructive"
           so the error rhythm matches /notifications, /workload,
           /opportunities, /audit — every other shipped page in this
           batch carries the same shape. */
        <Alert variant="destructive">
          <AlertTitle>
            <Trans>Couldn't load reminder overview</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(overviewQuery.error) ??
              t`Check your network and try again. If this keeps happening, contact support.`}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          caption={<Trans>30 / 7 days and overdue</Trans>}
        />
        <StatTile
          icon={ClockIcon}
          label={<Trans>Queued today</Trans>}
          value={overview?.queuedTodayCount ?? 0}
          caption={<Trans>Scheduled to send today</Trans>}
        />
        <StatTile
          icon={SendIcon}
          label={<Trans>Sent last 7 days</Trans>}
          value={overview?.sentLast7DaysCount ?? 0}
          caption={<Trans>Outbox-confirmed sends</Trans>}
        />
        <StatTile
          icon={TriangleAlertIcon}
          label={<Trans>Failed last 7 days</Trans>}
          value={overview?.failedLast7DaysCount ?? 0}
          caption={<Trans>Bounced or rejected sends</Trans>}
          tone={(overview?.failedLast7DaysCount ?? 0) > 0 ? 'critical' : 'neutral'}
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
        <CardDescription>
          <Trans>
            Edit the practice-managed 30-day countdown, 7-day countdown, and checklist collection
            emails.
          </Trans>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          // 2026-05-27 (σ cross-route audit D7): swapped four raw
          // "Loading templates…" / "Loading recent delivery…" etc.
          // paragraphs across this module for skeleton row stacks
          // shaped to the eventual table row. Matches the queue /
          // audit / opportunities skeleton register.
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
                  <Trans>Usage</Trans>
                </TableHead>
                <TableHead className="w-[96px]" />
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
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
          <div className="grid gap-2" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reminders.length === 0 ? (
          <EmptyState
            title={<Trans>No upcoming reminders match the current 30 / 7-day windows.</Trans>}
          />
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
            <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
              {reminders.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="grid gap-1 whitespace-normal">
                      <Link
                        to={`/deadlines?obligation=${item.obligationId}`}
                        className="font-medium text-text-primary hover:underline"
                      >
                        {item.clientName}
                      </Link>
                      <span className="text-xs text-text-tertiary">
                        <TaxCodeLabel code={item.taxType} />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{recipientLabel(item.recipientKind)}</TableCell>
                  <TableCell>{offsetLabel(item.offsetDays)}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(item.dueDate)}</TableCell>
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
          <div className="grid gap-2" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reminders.length === 0 ? (
          // 2026-05-27 (σ cross-route audit D4): bordered `<p>` →
          // canonical EmptyState. Sibling Upcoming reminders panel
          // already used EmptyState; this module was internally
          // inconsistent.
          <EmptyState title={<Trans>No reminder deliveries have been recorded yet.</Trans>} />
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
            <TableBody className="[&_tr]:border-b-0 [&_td]:py-3">
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
                  {/* 2026-05-24 (critique /polish): same RelativeTime
                      treatment as the suppression card and the Inbox
                      / Members table. */}
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
          <div className="grid gap-2" aria-busy="true">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : suppressions.length === 0 ? (
          <EmptyState title={<Trans>No client emails are suppressed.</Trans>} />
        ) : (
          suppressions.map((item) => (
            // 2026-06-01: hand-rolled <article> rounded-md border swapped
            // for Card size="xs" radius="md" — same dense in-page chrome
            // PulseDetailDrawer / AlertsListPage use. Card primitive
            // owns the border + radius + padding rhythm.
            <Card key={item.id} size="xs" radius="md">
              <CardContent className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium text-text-primary">
                    {item.email}
                  </span>
                  <Badge variant="secondary">{item.reason}</Badge>
                </div>
                {/* 2026-05-24 (critique /polish): suppression timestamp
                    becomes RelativeTime, consistent with Inbox + Members.
                    Hover still surfaces the precise ISO. */}
                <RelativeTime
                  value={item.createdAt}
                  timeZone={timezone}
                  className="text-xs text-text-tertiary"
                />
              </CardContent>
            </Card>
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
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            {/* 2026-05-26 (step-6 ux-flow audit F5.2): retired
                font-mono on the reminder email body — email-template
                copy is human prose, not code. Matches the recent
                font-mono purge passes. */}
            <Textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              className="min-h-40"
            />
          </label>
          {/* 2026-06-01: hand-rolled <label> flex justify-between row →
              Field horizontal + FieldLabel + trailing Switch. Field
              primitive owns the gap, label↔control wiring, and click
              target; we keep the status-dot / pause-icon glyph inline. */}
          <Field
            orientation="horizontal"
            className="rounded-md border border-divider-subtle p-3 text-sm"
          >
            <FieldLabel htmlFor="reminder-template-active">
              {active ? (
                <BadgeStatusDot tone="success" />
              ) : (
                <PauseCircleIcon className="size-4 text-text-tertiary" aria-hidden />
              )}
              <span>
                <Trans>Template active</Trans>
              </span>
            </FieldLabel>
            <Switch id="reminder-template-active" checked={active} onCheckedChange={setActive} />
          </Field>
          <DialogFooter>
            {/* 2026-05-26 (step-6 ux-flow audit F5.1/F5.3): cancel
                outline → ghost; save announces aria-busy + shows
                Loader2 spinner while pending. */}
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
