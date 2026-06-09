import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRightIcon, PlusIcon } from 'lucide-react'

import type { ReminderTemplateKind, ReminderTemplatePublic } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

// The reminder-template contract carries name / subject / bodyText / kind /
// active / usageCount but not the audience or cadence chips the Pencil card
// renders. We derive the audience chip from `kind` (the one field we do have)
// and surface a single neutral cadence chip as a static fallback.
// TODO(data): expose audience tag + cadence on ReminderTemplatePublic so the
// chips can be data-driven per template.
function audienceChip(kind: ReminderTemplateKind): ReactNode {
  if (kind === 'client_deadline_reminder') return <Trans>Client deadline</Trans>
  if (kind === 'readiness_request') return <Trans>Materials request</Trans>
  return <Trans>Deadline reminder</Trans>
}

function cadenceChip(kind: ReminderTemplateKind): ReactNode {
  // TODO(data): cadence is not modeled on the template; readiness requests are
  // one-off, countdown reminders recur. Best-effort static mapping.
  if (kind === 'readiness_request') return <Trans>Once</Trans>
  return <Trans>Scheduled</Trans>
}

/** First non-empty line of the body, used as the card preview. */
function bodyPreview(bodyText: string): string {
  const firstLine = bodyText.split('\n').find((line) => line.trim().length > 0)
  return firstLine?.trim() ?? bodyText.trim()
}

export function ReminderTemplatesPage() {
  const { t } = useLingui()
  const templatesQuery = useQuery(orpc.reminders.listTemplates.queryOptions({ input: undefined }))
  const templates = templatesQuery.data ?? []

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        breadcrumbs={[
          { label: t`Settings`, to: '/settings' },
          { label: t`Reminders`, to: '/reminders' },
          { label: t`Templates` },
        ]}
        title={<Trans>Reminder templates</Trans>}
        description={
          <Trans>Reusable messages we send for you. Edit per tax type or per client tier.</Trans>
        }
        actions={
          // No createTemplate contract endpoint exists yet, so the "New
          // template" CTA is rendered disabled rather than as a fake no-op.
          // TODO(data): wire to a reminders.createTemplate mutation when added.
          <Button variant="primary" size="sm" disabled>
            <PlusIcon data-icon="inline-start" />
            <Trans>New template</Trans>
          </Button>
        }
      />

      {templatesQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>
            <Trans>Couldn't load reminder templates</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(templatesQuery.error) ??
              t`Check your network and try again. If this keeps happening, contact support.`}
          </AlertDescription>
        </Alert>
      ) : null}

      {templatesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          title={<Trans>No reminder templates yet.</Trans>}
          description={
            <Trans>
              Templates appear here once your practice has reminder messages configured.
            </Trans>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard key={template.templateKey} template={template} />
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateCard({ template }: { template: ReminderTemplatePublic }) {
  const editHref = `/settings/reminders/templates/edit?template=${encodeURIComponent(template.templateKey)}`
  return (
    <article className="flex flex-col gap-2.5 rounded-xl border border-divider-regular bg-background-default p-[18px_22px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{template.name}</h2>
        <span className="shrink-0 text-[11px] font-medium text-text-muted tabular-nums">
          <Trans>used {template.usageCount} times</Trans>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Chip tone="accent">{audienceChip(template.kind)}</Chip>
        <Chip tone="muted">{cadenceChip(template.kind)}</Chip>
        {template.active ? null : <Chip tone="muted">{<Trans>Paused</Trans>}</Chip>}
      </div>

      <p className="truncate text-xs font-medium text-text-secondary italic">
        <Trans>Subject: {template.subject}</Trans>
      </p>
      <p className="line-clamp-1 text-xs font-medium text-text-secondary italic">
        {bodyPreview(template.bodyText)}
      </p>

      <div className="mt-0.5 flex items-center justify-between gap-2">
        {/* TODO(data): "last edited by" actor is not on the contract; show the
            update timestamp marker is also unavailable as a name, so we keep a
            neutral label that doesn't fabricate an author. */}
        <span className="text-[11px] font-medium text-text-muted">
          <Trans>Practice-managed template</Trans>
        </span>
        <TextLink
          variant="accent"
          render={<Link to={editHref} />}
          className="gap-1.5 font-semibold"
        >
          <Trans>Edit</Trans>
          <ArrowRightIcon className="size-3" aria-hidden />
        </TextLink>
      </div>
    </article>
  )
}

function Chip({ tone, children }: { tone: 'accent' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border border-divider-regular px-2 py-[3px] text-[11px] font-semibold',
        tone === 'accent'
          ? 'bg-state-accent-hover text-text-accent'
          : 'bg-background-section text-text-secondary',
      )}
    >
      {children}
    </span>
  )
}
