import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  BoldIcon,
  BracesIcon,
  CheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { ReminderTemplatePublic } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { cn } from '@duedatehq/ui/lib/utils'

import { PageHeader } from '@/components/patterns/page-header'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

const TEMPLATES_HREF = '/settings/reminders/templates'

// Sample substitutions used to render the live preview. The contract has no
// per-template sample payload, so these are illustrative defaults.
// TODO(data): source a real sample recipient/firm for the preview.
const PREVIEW_VARS: Record<string, string> = {
  client_name: 'Maya',
  deadline_date: 'April 15',
  cpa_name: 'Jules',
  firm_name: 'Hawthorn CPA',
  entity_name: 'Acme LLC',
  amount: '$4,200',
}

const AVAILABLE_VARIABLES = [
  '{{client_name}}',
  '{{deadline_date}}',
  '{{cpa_name}}',
  '{{firm_name}}',
]

function applyVars(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => PREVIEW_VARS[key] ?? match)
}

export function ReminderTemplateEditorPage() {
  const [searchParams] = useSearchParams()
  const templateKey = searchParams.get('template')
  const templatesQuery = useQuery(orpc.reminders.listTemplates.queryOptions({ input: undefined }))

  const template = useMemo(() => {
    const list = templatesQuery.data ?? []
    if (templateKey) return list.find((item) => item.templateKey === templateKey) ?? null
    return list[0] ?? null
  }, [templatesQuery.data, templateKey])

  if (templatesQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6" aria-busy="true">
        <Skeleton className="h-16 w-80" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
          <Skeleton className="h-[520px] w-full rounded-xl" />
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (templatesQuery.isError || !template) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <PageHeader
          breadcrumbs={[{ label: 'Templates', to: TEMPLATES_HREF }, { label: 'Editor' }]}
          title={<Trans>Reminder template</Trans>}
        />
        <Alert variant="destructive">
          <AlertTitle>
            {templatesQuery.isError ? (
              <Trans>Couldn't load this reminder template</Trans>
            ) : (
              <Trans>Template not found</Trans>
            )}
          </AlertTitle>
          <AlertDescription>
            {templatesQuery.isError ? (
              (rpcErrorMessage(templatesQuery.error) ?? (
                <Trans>Check your network and try again.</Trans>
              ))
            ) : (
              <Trans>
                This reminder template no longer exists. Return to the template library.
              </Trans>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <Editor key={template.templateKey} template={template} />
}

function Editor({ template }: { template: ReminderTemplatePublic }) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState(template.subject)
  const [bodyText, setBodyText] = useState(template.bodyText)
  const [active] = useState(template.active)

  const isDirty = subject !== template.subject || bodyText !== template.bodyText

  const updateTemplate = useMutation(
    orpc.reminders.updateTemplate.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.reminders.key() })
        toast.success(t`Reminder template updated`)
        void navigate(TEMPLATES_HREF)
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

  const handleSave = () => {
    updateTemplate.mutate({ templateKey: template.templateKey, subject, bodyText, active })
  }

  return (
    <form
      className="flex h-full flex-col gap-5 p-4 md:p-6"
      onSubmit={(event) => {
        event.preventDefault()
        handleSave()
      }}
    >
      <PageHeader
        breadcrumbs={[{ label: 'Templates', to: TEMPLATES_HREF }, { label: template.name }]}
        title={template.name}
        actions={
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold',
              template.active
                ? 'bg-state-success-hover text-text-success'
                : 'bg-background-section text-text-secondary',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                template.active ? 'bg-text-success' : 'bg-text-tertiary',
              )}
              aria-hidden
            />
            {template.active ? <Trans>Active</Trans> : <Trans>Paused</Trans>}
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        {/* Form column */}
        <div className="flex flex-col gap-5">
          <FormField label={<Trans>Template name</Trans>}>
            {/* Renaming is not supported by the updateTemplate contract. */}
            {/* TODO(data): add a name field to ReminderTemplateUpdateInput. */}
            <Input value={template.name} readOnly aria-readonly />
          </FormField>

          <FormField
            label={<Trans>Subject line</Trans>}
            hint={<Trans>· shown in inbox previews</Trans>}
          >
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={240}
            />
          </FormField>

          <FormField label={<Trans>Body</Trans>} hint={<Trans>· supports markdown</Trans>}>
            <div className="overflow-hidden rounded-lg border border-divider-regular bg-background-default">
              {/* Rich-text formatting is not wired to a markdown engine; the
                  toolbar is presentational. TODO(data): hook up bold/italic/
                  link/list insertion + variable picker to the textarea. */}
              <div className="flex items-center gap-1 border-b border-divider-regular bg-background-section px-2.5 py-2">
                <ToolbarButton icon={BoldIcon} label={t`Bold`} />
                <ToolbarButton icon={ItalicIcon} label={t`Italic`} />
                <ToolbarButton icon={LinkIcon} label={t`Link`} />
                <span className="mx-1 h-[18px] w-px bg-divider-regular" aria-hidden />
                <ToolbarButton icon={ListIcon} label={t`Bulleted list`} />
                <ToolbarButton icon={ListOrderedIcon} label={t`Numbered list`} />
                <span className="flex-1" />
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-divider-regular px-2.5 py-1.5 text-xs font-semibold text-text-muted">
                  <BracesIcon className="size-3" aria-hidden />
                  <Trans>Insert variable</Trans>
                </span>
              </div>
              <Textarea
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                maxLength={4000}
                className="min-h-[220px] resize-y rounded-none border-0 leading-relaxed focus-visible:ring-0"
              />
              <div className="flex flex-wrap items-center gap-2 border-t border-divider-regular bg-background-section px-4 py-2.5">
                <span className="text-[11px] font-semibold text-text-muted">
                  <Trans>Available variables:</Trans>
                </span>
                {AVAILABLE_VARIABLES.map((variable) => (
                  <code
                    key={variable}
                    className="rounded border border-divider-regular bg-background-default px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-accent"
                  >
                    {variable}
                  </code>
                ))}
              </div>
            </div>
          </FormField>

          <FormField label={<Trans>Cadence</Trans>} hint={<Trans>· how often this fires</Trans>}>
            {/* Cadence is not modeled on ReminderTemplatePublic. */}
            {/* TODO(data): add cadence to the contract to make this editable. */}
            <Segmented
              options={[
                { value: 'once', label: t`Once` },
                { value: 'weekly', label: t`Weekly` },
                { value: 'biweekly', label: t`Bi-weekly` },
                { value: 'monthly', label: t`Monthly` },
              ]}
              value={template.kind === 'readiness_request' ? 'once' : 'weekly'}
              disabled
            />
          </FormField>

          <FormField label={<Trans>Trigger</Trans>} hint={<Trans>· anchor point</Trans>}>
            {/* Trigger anchor + offset are not modeled on the contract. */}
            {/* TODO(data): expose trigger anchor + offset days. */}
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                options={[
                  { value: 'before', label: t`Days before due` },
                  { value: 'after', label: t`Days after start` },
                ]}
                value="before"
                disabled
              />
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-divider-regular bg-background-default px-3 py-2 text-sm">
                <span className="font-semibold text-text-primary tabular-nums">7</span>
                <span className="text-text-tertiary">
                  <Trans>days</Trans>
                </span>
              </div>
            </div>
          </FormField>
        </div>

        {/* Preview column */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-2">
            <EyeIcon className="size-3.5 text-text-tertiary" aria-hidden />
            <span className="text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
              <Trans>Live preview</Trans>
            </span>
            <span className="flex-1" />
            <span className="text-[11px] font-medium text-text-secondary">
              <Trans>sample: Maya Chen</Trans>
            </span>
          </div>

          <EmailPreview subject={subject} bodyText={bodyText} />

          <div className="flex flex-col gap-2.5 rounded-xl border border-divider-regular bg-background-default p-[14px_18px]">
            <div className="flex items-center gap-2">
              <UsersIcon className="size-3.5 text-text-accent" aria-hidden />
              {/* TODO(data): audience count is not on the contract. */}
              <span className="text-xs font-semibold text-text-primary">
                <Trans>Sent to: {template.usageCount} active clients</Trans>
              </span>
              <span className="flex-1" />
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-accent">
                <Trans>View list</Trans>
                <ExternalLinkIcon className="size-2.5" aria-hidden />
              </span>
            </div>
            <p className="text-[11px] leading-relaxed font-medium text-text-secondary">
              <Trans>
                This template applies to clients matched by your reminder rules with an active
                engagement and an open document request.
              </Trans>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center gap-3 border-t border-divider-regular pt-4">
        {/* Deleting a template is not supported by the contract. */}
        {/* TODO(data): add a reminders.deleteTemplate mutation. */}
        <Button type="button" variant="destructive-ghost" size="sm" disabled>
          <Trash2Icon data-icon="inline-start" />
          <Trans>Delete template</Trans>
        </Button>
        <span className="flex-1" />
        <Button
          type="button"
          variant="secondary"
          render={<Link to={TEMPLATES_HREF} />}
          nativeButton={false}
        >
          <Trans>Discard changes</Trans>
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={updateTemplate.isPending || !isDirty}
          aria-busy={updateTemplate.isPending}
        >
          {updateTemplate.isPending ? (
            <Loader2Icon data-icon="inline-start" className="animate-spin" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          <Trans>Save template</Trans>
        </Button>
      </div>
    </form>
  )
}

function FormField({
  label,
  hint,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-text-secondary">{label}</span>
        {hint ? <span className="text-[11px] font-medium text-text-muted">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function ToolbarButton({ icon: Icon, label }: { icon: typeof BoldIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled
      className="inline-flex size-7 cursor-not-allowed items-center justify-center rounded-lg text-text-secondary disabled:opacity-60"
    >
      <Icon className="size-3.5" aria-hidden />
    </button>
  )
}

function Segmented({
  options,
  value,
  disabled,
}: {
  options: Array<{ value: string; label: string }>
  value: string
  disabled?: boolean
}) {
  return (
    <div className="inline-flex w-fit items-center gap-0.5 rounded-lg border border-divider-regular bg-background-section p-[3px]">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-default',
              selected
                ? 'border border-divider-regular bg-background-default font-semibold text-text-primary shadow-xs'
                : 'text-text-secondary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function EmailPreview({ subject, bodyText }: { subject: string; bodyText: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
      <div className="flex flex-col gap-1.5 border-b border-divider-regular px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-state-accent-hover text-[11px] font-semibold text-text-accent">
            JR
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs font-semibold text-text-primary">
              <Trans>Jules Rivera · Hawthorn CPA</Trans>
            </span>
            <span className="text-[11px] font-medium text-text-muted">
              <Trans>to maya.chen@example.com</Trans>
            </span>
          </div>
          <span className="text-[11px] font-medium text-text-muted">
            <Trans>Mon 9:00 AM</Trans>
          </span>
        </div>
        <p className="text-[15px] font-semibold text-text-primary">
          {applyVars(subject) || <Trans>No subject</Trans>}
        </p>
      </div>
      <div className="flex flex-col gap-3 px-5 py-[18px]">
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-text-primary">
          {applyVars(bodyText)}
        </p>
        <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-state-accent-solid px-[18px] py-2.5 text-[13px] font-semibold text-text-inverted">
          <Trans>Open secure portal</Trans>
          <ArrowRightIcon className="size-3" aria-hidden />
        </span>
      </div>
      <div className="flex flex-col gap-1 border-t border-divider-regular bg-background-section px-5 py-3.5">
        <p className="text-[10px] font-medium text-text-muted">
          <Trans>Hawthorn CPA · 412 Oak St, Brooklyn NY</Trans>
        </p>
        <p className="text-[10px] font-medium text-text-muted">
          <Trans>Reply STOP to unsubscribe from reminders</Trans>
        </p>
      </div>
    </div>
  )
}
