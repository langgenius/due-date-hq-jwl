import { useMemo, useState, type ReactNode } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CornerDownLeftIcon,
} from 'lucide-react'

import type {
  ClientPublic,
  ObligationInstancePublic,
  ObligationGenerationPreview,
  RuleGenerationState,
  RuleGenerationPreviewInput,
  RuleSource,
} from '@duedatehq/contracts'
import { inferTaxTypes } from '@duedatehq/core/default-matrix'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@duedatehq/ui/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { cn } from '@duedatehq/ui/lib/utils'

import { ConceptLabel } from '@/features/concepts/concept-help'
import { orpc } from '@/lib/rpc'

import {
  formatEnumLabel,
  groupPreviewRows,
  isPreviewGenerationState,
  PREVIEW_ENTITY_OPTIONS,
  previewCalendarYearFromObligations,
  previewCalendarYearFromFormDates,
  previewCalendarYearToFormDates,
  previewFormValuesForClient,
  previewFormSchema,
  previewFormToInput,
  previewTaxTypesFromObligations,
  RULE_GENERATION_STATES,
  type PreviewFormValues,
} from './rules-console-model'
import { QueryPanelState, SectionFrame, ToneDot } from './rules-console-primitives'
import { SourceExternalLink } from './source-external-link'
import { useSourceLookup } from './use-source-lookup'

const CLIENT_LIST_LIMIT = 500
const TAX_YEAR_GRID_SIZE = 10
const EMPTY_CLIENTS: ClientPublic[] = []
const EMPTY_OBLIGATIONS: ObligationInstancePublic[] = []

type PreviewReadyClient = ClientPublic & { state: RuleGenerationState }
type TaxTypeSource = 'obligations' | 'default_matrix'

function isPreviewReadyClient(client: ClientPublic): client is PreviewReadyClient {
  return isPreviewGenerationState(client.state)
}

function taxTypesForClient(
  client: PreviewReadyClient,
  obligations: readonly ObligationInstancePublic[],
): { taxTypes: string[]; source: TaxTypeSource } {
  const obligationTaxTypes = previewTaxTypesFromObligations(obligations)
  if (obligationTaxTypes.length > 0) {
    return { taxTypes: obligationTaxTypes, source: 'obligations' }
  }

  return {
    taxTypes: inferTaxTypes(client.entityType, client.state).taxTypes,
    source: 'default_matrix',
  }
}

export function GenerationPreviewTab() {
  const { t } = useLingui()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const clientsQuery = useQuery(
    orpc.clients.listByFirm.queryOptions({ input: { limit: CLIENT_LIST_LIMIT } }),
  )

  if (clientsQuery.isLoading) {
    return <QueryPanelState state="loading" message={t`Loading clients for preview…`} />
  }

  if (clientsQuery.isError) {
    return <QueryPanelState state="error" message={t`Couldn't load clients for preview`} />
  }

  const clients = clientsQuery.data ?? EMPTY_CLIENTS
  const previewReadyClients = clients.filter(isPreviewReadyClient)
  const activeClient =
    (selectedClientId
      ? previewReadyClients.find((client) => client.id === selectedClientId)
      : null) ??
    previewReadyClients[0] ??
    null

  if (clients.length === 0) {
    return <RulesPreviewEmptyState message={t`Create a client before running deadline preview.`} />
  }

  if (!activeClient) {
    return (
      <RulesPreviewEmptyState
        message={t`Add a state to at least one client before running deadline preview.`}
      />
    )
  }

  return (
    <GenerationPreviewClientWorkbench
      key={activeClient.id}
      clients={clients}
      activeClient={activeClient}
      onSelectClient={setSelectedClientId}
    />
  )
}

function GenerationPreviewClientWorkbench({
  clients,
  activeClient,
  onSelectClient,
}: {
  clients: readonly ClientPublic[]
  activeClient: PreviewReadyClient
  onSelectClient: (clientId: string) => void
}) {
  const { t } = useLingui()
  const obligationsQuery = useQuery(
    orpc.obligations.listByClient.queryOptions({ input: { clientId: activeClient.id } }),
  )

  if (obligationsQuery.isLoading) {
    return <QueryPanelState state="loading" message={t`Loading client tax types…`} />
  }

  if (obligationsQuery.isError) {
    return <QueryPanelState state="error" message={t`Couldn't load client tax types`} />
  }

  const obligations = obligationsQuery.data ?? EMPTY_OBLIGATIONS
  const { taxTypes, source } = taxTypesForClient(activeClient, obligations)
  const defaultValues = previewFormValuesForClient({
    client: activeClient,
    taxTypes,
    calendarYear: previewCalendarYearFromObligations(obligations),
  })

  return (
    <div className="flex flex-col gap-6">
      <GenerationPreviewForm
        key={`${activeClient.id}-${defaultValues.taxTypes}-${defaultValues.taxYearStart}`}
        clients={clients}
        defaultValues={defaultValues}
        taxTypeSource={source}
        onSelectClient={onSelectClient}
      />
    </div>
  )
}

function GenerationPreviewForm({
  clients,
  defaultValues,
  taxTypeSource,
  onSelectClient,
}: {
  clients: readonly ClientPublic[]
  defaultValues: PreviewFormValues
  taxTypeSource: TaxTypeSource
  onSelectClient: (clientId: string) => void
}) {
  const { t } = useLingui()
  const [previewInput, setPreviewInput] = useState<RuleGenerationPreviewInput>(() =>
    previewFormToInput(defaultValues),
  )

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: previewFormSchema,
    },
    onSubmit: ({ value }) => {
      setPreviewInput(previewFormToInput(value))
    },
  })

  const previewQuery = useQuery(
    orpc.rules.previewObligations.queryOptions({
      input: previewInput,
    }),
  )

  const clientIdValue = useStore(form.store, (state) => state.values.clientId)
  const entityTypeValue = useStore(form.store, (state) => state.values.entityType)
  const stateValue = useStore(form.store, (state) => state.values.state)
  const taxYearStart = useStore(form.store, (state) => state.values.taxYearStart)
  const taxYearEnd = useStore(form.store, (state) => state.values.taxYearEnd)
  const taxTypesValue = useStore(form.store, (state) => state.values.taxTypes)
  const taxYearInvalid = useStore(
    form.store,
    (state) =>
      state.fieldMeta.taxYearStart?.isValid === false ||
      state.fieldMeta.taxYearEnd?.isValid === false,
  )
  const taxTypeChips = useMemo(
    () =>
      taxTypesValue
        .split(/[,\s]+/)
        .map((taxType) => taxType.trim())
        .filter(Boolean),
    [taxTypesValue],
  )

  const previewCalendarYear = previewCalendarYearFromFormDates({
    taxYearStart,
    taxYearEnd,
  })
  const groups = useMemo(() => groupPreviewRows(previewQuery.data ?? []), [previewQuery.data])
  const selectedClientLabel =
    clients.find((client) => client.id === clientIdValue)?.name ?? clientIdValue

  return (
    <div className="flex flex-col gap-6">
      <SectionFrame className="px-4 py-4">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <div className="grid grid-cols-[220px_110px_110px_220px_120px] gap-3">
            <PreviewField label={t`CLIENT`}>
              <Select
                value={clientIdValue}
                onValueChange={(value) => {
                  const client = clients.find((item) => item.id === value)
                  if (!client || !isPreviewReadyClient(client)) return
                  onSelectClient(client.id)
                }}
              >
                <SelectTrigger className="h-8 w-full rounded-md font-mono text-xs">
                  <SelectValue>{selectedClientLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {clients.map((client) => (
                      <SelectItem
                        key={client.id}
                        value={client.id}
                        disabled={!isPreviewReadyClient(client)}
                      >
                        <span className="flex min-w-0 flex-col leading-tight">
                          <span className="truncate">{client.name}</span>
                          <span className="font-mono text-caption text-text-tertiary">
                            {client.state ?? t`Needs filing state`} ·{' '}
                            {previewEntityLabel(client.entityType)}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </PreviewField>
            <PreviewField label={t`ENTITY`}>
              <Select
                value={entityTypeValue}
                onValueChange={(value) => {
                  if (isEntityOption(value)) {
                    form.setFieldValue('entityType', value)
                  }
                }}
              >
                <SelectTrigger className="h-8 w-full rounded-md text-xs">
                  <SelectValue>{previewEntityLabel(entityTypeValue)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PREVIEW_ENTITY_OPTIONS.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {previewEntityLabel(entity)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </PreviewField>
            <PreviewField label={t`STATE`}>
              <Select
                value={stateValue}
                onValueChange={(value) => {
                  if (isGenerationState(value)) {
                    form.setFieldValue('state', value)
                  }
                }}
              >
                <SelectTrigger className="h-8 w-full rounded-md text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {RULE_GENERATION_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </PreviewField>
            <PreviewField label={t`TAX YEAR`} htmlFor="preview-tax-year">
              <TaxYearCalendarSelect
                id="preview-tax-year"
                value={previewCalendarYear}
                taxYearStart={taxYearStart}
                taxYearEnd={taxYearEnd}
                invalid={taxYearInvalid}
                onValueChange={(year) => {
                  const dates = previewCalendarYearToFormDates(year)
                  form.setFieldValue('taxYearStart', dates.taxYearStart)
                  form.setFieldValue('taxYearEnd', dates.taxYearEnd)
                }}
              />
            </PreviewField>
            <Button
              type="submit"
              variant="accent"
              className="self-end"
              disabled={previewQuery.isFetching}
            >
              {previewQuery.isFetching ? <Trans>Running…</Trans> : <Trans>Run preview</Trans>}
              <CornerDownLeftIcon data-icon="inline-end" aria-hidden />
            </Button>
          </div>

          <PreviewField label={t`TAX TYPES`} htmlFor="preview-tax-types">
            <div className="flex min-h-[56px] flex-wrap gap-1.5 rounded-md border border-divider-regular bg-background-subtle p-2">
              {taxTypeChips.length === 0 ? (
                <span className="text-xs text-text-tertiary">
                  <Trans>No tax types selected.</Trans>
                </span>
              ) : (
                taxTypeChips.map((taxType) => (
                  <span
                    key={taxType}
                    className="inline-flex h-6 items-center rounded border border-divider-regular bg-background-default px-2 font-mono text-caption text-text-secondary"
                  >
                    {taxType}
                  </span>
                ))
              )}
              <form.Field name="taxTypes">
                {(field) => (
                  <Input
                    id="preview-tax-types"
                    name={field.name}
                    value={field.state.value}
                    className="sr-only"
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                )}
              </form.Field>
            </div>
            <span className="text-xs text-text-tertiary">
              {taxTypeSource === 'obligations' ? (
                <Trans>Tax types from existing deadlines.</Trans>
              ) : (
                <Trans>Tax types inferred from suggestions.</Trans>
              )}
            </span>
          </PreviewField>
        </form>
      </SectionFrame>

      {previewQuery.isLoading ? (
        <QueryPanelState state="loading" message={t`Loading deadline preview…`} />
      ) : previewQuery.isError ? (
        <QueryPanelState state="error" message={t`Couldn't run deadline preview`} />
      ) : (
        <PreviewResultsCard
          reminderReady={groups.reminderReady}
          needsClientFacts={groups.needsClientFacts}
          requiresReview={groups.requiresReview}
        />
      )}
    </div>
  )
}

function RulesPreviewEmptyState({ message }: { message: string }) {
  return (
    <SectionFrame className="px-4 py-6">
      <p className="text-sm text-text-secondary">{message}</p>
    </SectionFrame>
  )
}

function TaxYearCalendarSelect({
  id,
  value,
  taxYearStart,
  taxYearEnd,
  invalid,
  onValueChange,
}: {
  id: string
  value: number
  taxYearStart: string
  taxYearEnd: string
  invalid: boolean
  onValueChange: (value: number) => void
}) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const [gridStart, setGridStart] = useState(() => taxYearGridStart(value))
  const years = useMemo(
    () => Array.from({ length: TAX_YEAR_GRID_SIZE }, (_, index) => gridStart + index),
    [gridStart],
  )

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) setGridStart(taxYearGridStart(value))
  }

  function selectYear(year: number) {
    onValueChange(year)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            aria-label={t`Select tax year ${value}`}
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            className={cn(
              'flex h-8 w-full items-center justify-between gap-2 rounded-md border border-transparent bg-components-input-bg-normal py-1 pr-2 pl-2.5 text-xs text-components-input-text-filled transition-colors outline-none',
              'hover:bg-components-input-bg-hover',
              'focus-visible:border-components-input-border-active focus-visible:bg-components-input-bg-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              'aria-invalid:border-components-input-border-destructive aria-invalid:bg-components-input-bg-destructive aria-invalid:ring-2 aria-invalid:ring-state-destructive-active',
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <CalendarDaysIcon className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
              <span className="truncate font-mono tabular-nums">{value}</span>
            </span>
            <ChevronDownIcon className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
          </button>
        }
      />
      <PopoverContent align="start" className="w-64 gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t`Previous years`}
            onClick={() => setGridStart((current) => current - TAX_YEAR_GRID_SIZE)}
          >
            <ChevronLeftIcon aria-hidden />
          </Button>
          <div className="font-mono text-xs font-medium text-text-secondary tabular-nums">
            {gridStart}–{gridStart + TAX_YEAR_GRID_SIZE - 1}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t`Next years`}
            onClick={() => setGridStart((current) => current + TAX_YEAR_GRID_SIZE)}
          >
            <ChevronRightIcon aria-hidden />
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {years.map((year) => (
            <Button
              key={year}
              type="button"
              variant={year === value ? 'accent' : 'ghost'}
              size="xs"
              aria-pressed={year === value}
              className="h-8 rounded-md px-0 font-mono text-xs tabular-nums"
              onClick={() => selectYear(year)}
            >
              {year}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-divider-subtle pt-3">
          <TaxYearDateSummary label={t`Filing year end`} value={taxYearEnd} />
          <TaxYearDateSummary label={t`Payment year start`} value={taxYearStart} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TaxYearDateSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-background-subtle px-2 py-1.5">
      <div className="truncate text-caption-xs font-medium uppercase tracking-eyebrow text-text-muted">
        {label}
      </div>
      <div className="truncate font-mono text-caption text-text-secondary">{value}</div>
    </div>
  )
}

function PreviewField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-caption font-medium uppercase tracking-eyebrow text-text-muted"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function taxYearGridStart(year: number): number {
  return Math.floor(year / TAX_YEAR_GRID_SIZE) * TAX_YEAR_GRID_SIZE
}

function previewEntityLabel(entity: PreviewFormValues['entityType']): string {
  return formatEnumLabel(entity).toUpperCase()
}

function isEntityOption(value: string | null): value is PreviewFormValues['entityType'] {
  if (typeof value !== 'string') return false
  return (PREVIEW_ENTITY_OPTIONS as readonly string[]).includes(value)
}

function isGenerationState(value: string | null): value is PreviewFormValues['state'] {
  if (typeof value !== 'string') return false
  return (RULE_GENERATION_STATES as readonly string[]).includes(value)
}

function PreviewResultsCard({
  reminderReady,
  needsClientFacts,
  requiresReview,
}: {
  reminderReady: ObligationGenerationPreview[]
  needsClientFacts: ObligationGenerationPreview[]
  requiresReview: ObligationGenerationPreview[]
}) {
  const { t } = useLingui()
  const sourceLookup = useSourceLookup()
  return (
    <SectionFrame>
      <PreviewGroupHeader
        tone="success"
        label={
          <ConceptLabel concept="reminderReady">
            {t`REMINDER READY — ${reminderReady.length} deadline, will fire 30 / 7-day reminders`}
          </ConceptLabel>
        }
      />
      {reminderReady.map((row) => (
        <PreviewResultRow
          key={`${row.ruleId}-${row.ruleVersion}-${row.period}`}
          row={row}
          sourceLookup={sourceLookup}
        />
      ))}
      {needsClientFacts.length > 0 ? (
        <>
          <PreviewGroupHeader
            tone="review"
            label={t`NEEDS CLIENT FACTS — ${needsClientFacts.length} items require client detail updates before deadlines can be created`}
          />
          {needsClientFacts.map((row) => (
            <PreviewResultRow
              key={`${row.ruleId}-${row.ruleVersion}-${row.period}`}
              row={row}
              sourceLookup={sourceLookup}
            />
          ))}
        </>
      ) : null}
      <PreviewGroupHeader
        tone="review"
        label={
          <ConceptLabel concept="requiresReview">
            {t`REQUIRES REVIEW — ${requiresReview.length} items for CPA confirmation, never auto-reminded`}
          </ConceptLabel>
        }
      />
      {requiresReview.map((row) => (
        <PreviewResultRow
          key={`${row.ruleId}-${row.ruleVersion}-${row.period}`}
          row={row}
          sourceLookup={sourceLookup}
        />
      ))}
    </SectionFrame>
  )
}

function PreviewGroupHeader({ tone, label }: { tone: 'success' | 'review'; label: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center gap-2 border-b border-divider-regular bg-background-subtle px-4 py-1">
      <ToneDot tone={tone} />
      <span
        className={cn(
          'text-caption font-medium uppercase tracking-eyebrow',
          tone === 'success' ? 'text-status-done' : 'text-status-review',
        )}
      >
        {label}
      </span>
    </div>
  )
}

function PreviewResultRow({
  row,
  sourceLookup,
}: {
  row: ObligationGenerationPreview
  sourceLookup: ReadonlyMap<string, RuleSource>
}) {
  const { t } = useLingui()
  const evidence = row.evidence[0]
  const evidenceSource = evidence ? sourceLookup.get(evidence.sourceId) : undefined
  const linkLabel = evidence?.summary ?? row.sourceIds[0] ?? t`Source`
  return (
    <div className="grid min-h-16 grid-cols-[128px_1fr_160px] gap-4 border-b border-divider-subtle px-4 py-3 last:border-b-0">
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            'font-mono text-base leading-none font-bold tabular-nums',
            row.reminderReady ? 'text-text-primary' : 'text-text-disabled',
          )}
        >
          {row.dueDate ?? t`source`}
        </span>
        <span
          className={cn(
            'text-caption font-medium',
            row.reminderReady ? 'text-text-tertiary' : 'text-severity-medium',
          )}
        >
          {row.reminderReady ? <Trans>reminder ready</Trans> : <Trans>no reminder</Trans>}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-description font-medium text-text-primary">
          {row.ruleTitle} · {row.formName}
        </span>
        <span className="truncate font-mono text-caption text-text-tertiary">
          {row.ruleId} v{row.ruleVersion} · {row.matchedTaxType} → {row.taxType}
        </span>
        {row.reviewReasons.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.reviewReasons.map((reason) => (
              <span
                key={reason}
                className="inline-flex h-[18px] items-center rounded-sm bg-severity-medium-tint px-1.5 font-mono text-caption-xs text-severity-medium"
              >
                {reason}
              </span>
            ))}
          </div>
        ) : null}
        {row.missingClientFacts.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.missingClientFacts.map((fact) => (
              <span
                key={fact}
                className="inline-flex h-[18px] items-center rounded-sm bg-severity-medium-tint px-1.5 text-caption-xs font-medium text-severity-medium"
              >
                {fact === 'fiscalYearEnd' ? t`Needs fiscal year end` : fact}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex items-start justify-end pt-1">
        <SourceExternalLink
          source={evidenceSource}
          ariaLabel={evidenceSource ? t`Open official source: ${evidenceSource.title}` : undefined}
          showIcon={false}
          className="max-w-full truncate text-right text-caption text-text-accent"
        >
          <span className="truncate">{linkLabel}</span>
          <span aria-hidden className="ml-1 shrink-0">
            ↗
          </span>
        </SourceExternalLink>
      </div>
    </div>
  )
}
