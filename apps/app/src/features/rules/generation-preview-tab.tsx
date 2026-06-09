import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  CornerDownLeftIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  AnnualRolloverDisposition,
  AnnualRolloverOutput,
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
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
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
import { rpcErrorMessage } from '@/lib/rpc-error'
import { EmptyCellMark } from '@/components/patterns/empty-cell-mark'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'

import {
  formatEnumLabel,
  groupPreviewRows,
  isPreviewGenerationState,
  PREVIEW_ENTITY_OPTIONS,
  previewTaxYearFromObligations,
  previewTaxYearFromFormDates,
  previewTaxYearToFormDates,
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
const ALL_ROLLOVER_CLIENTS = '__all_clients__'
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
    taxYear: previewTaxYearFromObligations(obligations),
  })

  return (
    <div className="flex flex-col gap-6">
      <AnnualRolloverPanel clients={clients} />
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

export function AnnualRolloverPanel({ clients }: { clients: readonly ClientPublic[] }) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const defaults = useMemo(() => defaultAnnualRolloverYears(), [])
  const [sourceFilingYear, setSourceFilingYear] = useState(defaults.sourceFilingYear)
  const [targetFilingYear, setTargetFilingYear] = useState(defaults.targetFilingYear)
  const [selectedClientId, setSelectedClientId] = useState(ALL_ROLLOVER_CLIENTS)
  const [previewInput, setPreviewInput] = useState(() =>
    annualRolloverInput(defaults.sourceFilingYear, defaults.targetFilingYear, selectedClientId),
  )
  const currentInput = annualRolloverInput(sourceFilingYear, targetFilingYear, selectedClientId)
  const yearsValid = targetFilingYear === sourceFilingYear + 1
  const previewQuery = useQuery({
    ...orpc.obligations.previewAnnualRollover.queryOptions({ input: previewInput }),
    enabled: previewInput.targetFilingYear === previewInput.sourceFilingYear + 1,
  })
  const createMutation = useMutation(
    orpc.obligations.createAnnualRollover.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        setPreviewInput(currentInput)
        toast.success(t`Annual rollover generated`, {
          description: t`${result.summary.createdCount} deadlines created.`,
        })
      },
      onError: (error) => {
        toast.error(t`Couldn't generate annual rollover`, {
          description: rpcErrorMessage(error) ?? t`Try previewing again before generating.`,
        })
      },
    }),
  )

  const result = createMutation.data ?? previewQuery.data
  const createdIds = rolloverCreatedIds(result)
  const createCandidateCount =
    (result?.summary.willCreateCount ?? 0) + (result?.summary.reviewCount ?? 0)
  const canGenerate = yearsValid && createCandidateCount > 0 && !createMutation.isPending
  const selectedClientLabel =
    selectedClientId === ALL_ROLLOVER_CLIENTS
      ? t`All clients`
      : (clients.find((client) => client.id === selectedClientId)?.name ?? t`Unknown`)

  function runPreview() {
    if (!yearsValid) {
      toast.error(t`Target filing year must be the next year after source filing year.`)
      return
    }
    createMutation.reset()
    setPreviewInput(currentInput)
  }

  function generate() {
    if (!canGenerate) return
    createMutation.mutate(currentInput)
  }

  return (
    <SectionFrame className="px-4 py-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <RotateCcwIcon className="size-4 text-text-tertiary" aria-hidden />
              <span>
                <Trans>Annual rollover</Trans>
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              <Trans>
                Preview closed source-year deadlines, then create next-year deadlines from active
                practice rules.
              </Trans>
            </p>
          </div>
          {createdIds.length > 0 ? (
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link to={obligationQueueHref(createdIds[0]!)} />}
            >
              <Trans>Open first created deadline</Trans>
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-[140px_140px_minmax(220px,1fr)_auto_auto] gap-3">
          <PreviewField label={t`SOURCE FILING YEAR`} htmlFor="annual-source-year">
            <Input
              id="annual-source-year"
              type="number"
              min={1900}
              max={2100}
              value={sourceFilingYear}
              aria-invalid={!yearsValid}
              className="h-8 font-mono text-xs tabular-nums"
              onChange={(event) => {
                const next = boundedYear(event.currentTarget.value, sourceFilingYear, 1900, 2100)
                setSourceFilingYear(next)
                setTargetFilingYear(next + 1)
              }}
            />
          </PreviewField>
          <PreviewField label={t`TARGET FILING YEAR`} htmlFor="annual-target-year">
            <Input
              id="annual-target-year"
              type="number"
              min={1901}
              max={2101}
              value={targetFilingYear}
              aria-invalid={!yearsValid}
              className="h-8 font-mono text-xs tabular-nums"
              onChange={(event) =>
                setTargetFilingYear(
                  boundedYear(event.currentTarget.value, targetFilingYear, 1901, 2101),
                )
              }
            />
          </PreviewField>
          <PreviewField label={t`CLIENT FILTER`}>
            <Select
              value={selectedClientId}
              onValueChange={(value) => {
                if (value) setSelectedClientId(value)
              }}
            >
              <SelectTrigger className="h-8 w-full rounded-md text-xs">
                <SelectValue>{selectedClientLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL_ROLLOVER_CLIENTS}>
                    <Trans>All clients</Trans>
                  </SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate">{client.name}</span>
                        <span className="font-mono text-caption text-text-tertiary">
                          {client.state ?? t`No filing state`}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </PreviewField>
          <Button
            type="button"
            variant="secondary"
            className="self-end"
            disabled={previewQuery.isFetching}
            onClick={runPreview}
          >
            {previewQuery.isFetching ? <Trans>Previewing…</Trans> : <Trans>Preview</Trans>}
          </Button>
          <Button
            type="button"
            variant="accent"
            className="self-end"
            disabled={!canGenerate}
            onClick={generate}
          >
            {createMutation.isPending ? <Trans>Generating…</Trans> : <Trans>Generate</Trans>}
          </Button>
        </div>

        {!yearsValid ? (
          <p className="text-xs text-severity-medium">
            <Trans>Target filing year must be exactly one year after the source filing year.</Trans>
          </p>
        ) : null}

        {previewQuery.isLoading ? (
          <QueryPanelState state="loading" message={t`Loading annual rollover preview…`} />
        ) : previewQuery.isError ? (
          <QueryPanelState state="error" message={t`Couldn't run annual rollover preview`} />
        ) : result ? (
          <AnnualRolloverResults result={result} />
        ) : null}
      </div>
    </SectionFrame>
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

  const previewTaxYear = previewTaxYearFromFormDates({
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
                value={previewTaxYear}
                taxYearStart={taxYearStart}
                taxYearEnd={taxYearEnd}
                invalid={taxYearInvalid}
                onValueChange={(year) => {
                  const dates = previewTaxYearToFormDates(year)
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

function AnnualRolloverResults({ result }: { result: AnnualRolloverOutput }) {
  const { t } = useLingui()

  return (
    <div className="overflow-hidden rounded-md border border-divider-regular">
      <div className="grid grid-cols-7 gap-0 border-b border-divider-regular bg-background-subtle">
        <RolloverMetric
          label={t`Source deadlines`}
          value={result.summary.seedObligationCount}
          description={t`Closed source-year deadlines eligible for rollover. Only done, paid, and extended rows count as source deadlines.`}
        />
        <RolloverMetric
          label={t`Clients`}
          value={result.summary.clientCount}
          description={t`Unique clients represented by the source-year deadlines in this preview.`}
        />
        <RolloverMetric
          label={t`Will create`}
          value={result.summary.willCreateCount}
          description={t`Rows that will create pending deadlines because an active target-year practice rule produced a concrete due date.`}
        />
        <RolloverMetric
          label={t`Review`}
          value={result.summary.reviewCount}
          description={t`Rows that will create review deadlines because the active practice rule requires CPA confirmation.`}
        />
        <RolloverMetric
          label={t`Duplicates`}
          value={result.summary.duplicateCount}
          description={t`Rows skipped because the target client, rule, tax year, and period already have a deadline.`}
        />
        <RolloverMetric
          label={t`Skipped`}
          value={result.summary.skippedCount}
          description={t`Rows that cannot be created, usually because the target year lacks an active practice rule or concrete due date.`}
        />
        <RolloverMetric
          label={t`Created`}
          value={result.summary.createdCount}
          description={t`Deadlines actually created after Generate runs. Preview results show zero here until generation succeeds.`}
        />
      </div>
      {/* 2026-05-26 (Yuqi scrollbar audit): dropped
          `max-h-[420px] overflow-y-auto`. The rollover preview
          rows were nested inside the app-shell's main scroll
          container — the inner cap forced a second scrollbar
          INSIDE the page when the preview returned more than
          ~10 rows. Letting the rows flow naturally lets the
          page scroll handle the overflow. */}
      <div>
        <div className="grid grid-cols-[minmax(88px,0.8fr)_minmax(112px,1.1fr)_minmax(104px,1fr)_minmax(84px,0.8fr)_minmax(88px,0.8fr)_minmax(0,1.5fr)_minmax(88px,0.8fr)] border-b border-divider-regular bg-background-default px-3 py-2 text-caption font-medium uppercase tracking-eyebrow text-text-muted">
          <RolloverColumnHeader
            label={t`Status`}
            description={t`The rollover disposition for this row: create, review, duplicate, missing rule, or missing due date.`}
          />
          <RolloverColumnHeader
            label={t`Client`}
            description={t`The client whose closed source-year deadline is being considered for next-year generation.`}
          />
          <RolloverColumnHeader
            label={t`Tax type`}
            description={t`The tax form or deadline type carried forward from the source-year seed deadline.`}
          />
          <RolloverColumnHeader
            label={t`Due date`}
            description={t`The concrete due date calculated from the active target-year practice rule. A dash means nothing will be created.`}
          />
          <RolloverColumnHeader
            label={t`Target`}
            description={t`The status assigned if this row is generated: pending for reminder-ready rows or review for CPA-confirmation rows.`}
          />
          <RolloverColumnHeader
            label={t`Rule / reason`}
            description={t`The matched active practice rule and period, or the reason this row is duplicate or skipped.`}
          />
          <RolloverColumnHeader
            label={t`Deadlines`}
            description={t`Opens the existing duplicate deadline or the newly created deadline after Generate succeeds.`}
            align="right"
          />
        </div>
        {result.rows.length === 0 ? (
          <div className="px-3 py-4 text-sm text-text-secondary">
            <Trans>No closed source-year deadlines matched this rollover preview.</Trans>
          </div>
        ) : (
          result.rows.map((row, index) => {
            const obligationId = row.createdObligationId ?? row.duplicateObligationId
            return (
              <div
                key={`${row.clientId}-${row.taxType}-${row.preview?.ruleId ?? 'missing'}-${row.preview?.period ?? index}`}
                className="grid min-h-12 grid-cols-[minmax(88px,0.8fr)_minmax(112px,1.1fr)_minmax(104px,1fr)_minmax(84px,0.8fr)_minmax(88px,0.8fr)_minmax(0,1.5fr)_minmax(88px,0.8fr)] items-center gap-0 border-b border-divider-subtle px-3 py-2 text-xs last:border-b-0"
              >
                <span>
                  <RolloverDispositionBadge disposition={row.disposition} />
                </span>
                <span className="min-w-0 truncate text-text-primary">{row.clientName}</span>
                <span className="min-w-0 truncate text-caption text-text-secondary">
                  <TaxCodeLabel code={row.taxType} />
                </span>
                <span className="min-w-0 truncate font-mono text-caption tabular-nums text-text-secondary">
                  {row.preview?.dueDate ?? '—'}
                </span>
                <span className="min-w-0 truncate text-text-secondary">
                  {row.targetStatus ? targetStatusLabel(row.targetStatus, t) : '—'}
                </span>
                <span className="min-w-0 truncate text-text-tertiary">
                  {row.skippedReason
                    ? skippedReasonLabel(row.skippedReason, t)
                    : row.preview
                      ? `${row.preview.ruleTitle} · ${row.preview.period}`
                      : skippedReasonLabel(row.skippedReason, t)}
                </span>
                <span className="flex justify-end">
                  {obligationId ? (
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="xs"
                      render={<Link to={obligationQueueHref(obligationId)} />}
                    >
                      <Trans>Open</Trans>
                    </Button>
                  ) : (
                    // 2026-06-01: hand-rolled em-dash → EmptyCellMark for the
                    // canonical text-text-tertiary tone + screen-reader label.
                    <EmptyCellMark />
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function RolloverMetric({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <div className="min-w-0 border-r border-divider-subtle px-3 py-2 last:border-r-0">
      <div className="flex min-w-0 items-center gap-1 text-caption-xs font-medium uppercase tracking-eyebrow text-text-muted">
        <span className="truncate">{label}</span>
        <RolloverHelpPopover label={label} description={description} />
      </div>
      <div className="font-mono text-lg font-semibold tabular-nums text-text-primary">{value}</div>
    </div>
  )
}

function RolloverColumnHeader({
  label,
  description,
  align = 'left',
}: {
  label: string
  description: string
  align?: 'left' | 'right'
}) {
  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1',
        align === 'right' && 'justify-end text-right',
      )}
    >
      <span className="truncate">{label}</span>
      <RolloverHelpPopover label={label} description={description} />
    </span>
  )
}

// 2026-05-25 (info-icon audit): the rollover preview's per-metric
// and per-column help blurbs are glossary-grade (60-100+ chars)
// which is too long for a Tooltip. Swapped to a Popover matching
// the ConceptHelp shape (size-6 hit area, w-80 surface, title +
// description body) so the affordance reads consistently with
// every other "what does this term mean" explainer in the app.
// Concept dictionary entries weren't added because the labels
// here are highly localised to the rollover preview and would
// pollute the cross-surface concept namespace.
function RolloverHelpPopover({ label, description }: { label: string; description: string }) {
  const { t } = useLingui()
  return (
    <Popover>
      {/* 2026-06-01 design-system migration: swapped the bespoke
          24px help trigger to the Button primitive (ghost / icon-xs).
          icon-xs is size-7 by default; this rollover trigger needs to
          tuck into a dense column header, so we override the size
          class to size-6 inline — the only site in the app that
          needs the strict 24px control. */}
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={80}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t`Explain ${label}`}
            className="size-6 shrink-0"
          />
        }
      >
        <CircleHelpIcon className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-80 gap-2 p-3">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
          <PopoverDescription className="text-sm leading-relaxed text-text-secondary">
            {description}
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}

function RolloverDispositionBadge({ disposition }: { disposition: AnnualRolloverDisposition }) {
  const { t } = useLingui()
  const labels: Record<AnnualRolloverDisposition, string> = {
    will_create: t`Will create`,
    review: t`Review`,
    duplicate: t`Duplicate`,
    before_monitoring_start: t`Before monitoring`,
    missing_verified_rule: t`Missing rule`,
    missing_due_date: t`Missing due date`,
  }
  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-full items-center rounded border px-2 text-caption font-medium',
        disposition === 'will_create' && 'border-status-done/20 bg-status-done/10 text-status-done',
        disposition === 'review' &&
          'border-status-review/20 bg-status-review/10 text-status-review',
        disposition === 'duplicate' &&
          'border-divider-regular bg-background-subtle text-text-muted',
        disposition === 'before_monitoring_start' &&
          'border-divider-regular bg-background-subtle text-text-muted',
        disposition === 'missing_verified_rule' &&
          'border-severity-medium/20 bg-severity-medium-tint text-severity-medium',
        disposition === 'missing_due_date' &&
          'border-severity-medium/20 bg-severity-medium-tint text-severity-medium',
      )}
    >
      <span className="truncate">{labels[disposition]}</span>
    </span>
  )
}

function defaultAnnualRolloverYears(): { sourceFilingYear: number; targetFilingYear: number } {
  const targetFilingYear = new Date().getFullYear() + 1
  return { sourceFilingYear: targetFilingYear - 1, targetFilingYear }
}

function annualRolloverInput(
  sourceFilingYear: number,
  targetFilingYear: number,
  selectedClientId: string,
) {
  return {
    sourceFilingYear,
    targetFilingYear,
    ...(selectedClientId === ALL_ROLLOVER_CLIENTS ? {} : { clientIds: [selectedClientId] }),
  }
}

function boundedYear(raw: string, fallback: number, min: number, max: number): number {
  const next = Number(raw)
  if (!Number.isInteger(next)) return fallback
  return Math.min(Math.max(next, min), max)
}

function obligationQueueHref(obligationId: string): string {
  return `/deadlines?${new URLSearchParams({ obligation: obligationId }).toString()}`
}

function rolloverCreatedIds(result: AnnualRolloverOutput | undefined): string[] {
  return (
    result?.rows.flatMap((row) => (row.createdObligationId ? [row.createdObligationId] : [])) ?? []
  )
}

function targetStatusLabel(status: 'pending' | 'review', t: ReturnType<typeof useLingui>['t']) {
  return status === 'pending' ? t`Pending` : t`Review`
}

function skippedReasonLabel(reason: string | null, t: ReturnType<typeof useLingui>['t']): string {
  if (reason === 'client_state_missing') return t`Client state missing`
  if (reason === 'client_not_found') return t`Client not found`
  if (reason === 'no_verified_rule_for_target_year') return t`No active target-year rule`
  if (reason === 'target_obligation_already_exists') return t`Target deadline already exists`
  if (reason === 'before_monitoring_start_date') return t`Before monitoring start`
  if (reason === 'verified_rule_has_no_concrete_due_date') return t`No concrete due date`
  return reason ?? t`No rule matched`
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
              'flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-transparent bg-components-input-bg-normal py-1 pr-2 pl-2.5 text-xs text-components-input-text-filled transition-colors outline-none',
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
