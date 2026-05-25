import { Fragment, type ReactElement, useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, ChevronDownIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import type { ClientCreateInput, ClientPublic, ObligationRule } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@duedatehq/ui/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@duedatehq/ui/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@duedatehq/ui/components/ui/popover'
import { cn } from '@duedatehq/ui/lib/utils'

import { ClientCombobox } from '@/features/clients/ClientCombobox'
import { type ClientEntityType } from '@/features/clients/client-readiness'
import { CreateClientDialog } from '@/features/clients/CreateClientDialog'
import {
  COMMON_FORM_VOUCHER_SUGGESTIONS,
  isDeadlineCategoryDefaultFormName,
  listDeadlineCategorySuggestions,
  listFormVoucherSuggestionsForInput,
  preferredDeadlineCategoryFormName,
  resolveDeadlineCategoryForInput,
  type DeadlineCategorySuggestion,
  type ResolvedDeadlineRuleCandidate,
} from '@/features/obligations/deadline-category-suggestions'
import { formatTaxCode } from '@/lib/tax-codes'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

const CLIENTS_LIST_INPUT = { limit: 500 } as const
const EMPTY_CLIENTS: readonly ClientPublic[] = []
const EMPTY_RULES: readonly ObligationRule[] = []
const TAX_YEAR_OPTION_COUNT = 5

type SuggestionOption = {
  value: string
  label: string
  description?: string
}

type SuggestionGroup<TOption extends SuggestionOption> = {
  heading?: string
  options: readonly TOption[]
}

type FormValues = {
  clientId: string
  taxType: string
  taxYear: string
  jurisdiction: string
  formName: string
  internalNotes: string
}

function defaultTaxYear(): string {
  return String(new Date().getFullYear())
}

function defaultFormValues(defaultClientId?: string): FormValues {
  return {
    clientId: defaultClientId ?? '',
    taxType: '',
    taxYear: defaultTaxYear(),
    jurisdiction: '',
    formName: '',
    internalNotes: '',
  }
}

function createFormSchema(t: ReturnType<typeof useLingui>['t']) {
  return z.object({
    clientId: z.string().min(1, t`Pick a client`),
    taxType: z
      .string()
      .trim()
      .min(1, t`Deadline category is required`)
      .max(80, t`Deadline category must be 80 characters or fewer`),
    taxYear: z
      .string()
      .trim()
      .regex(/^\d{4}$/, t`Tax year is required`),
    jurisdiction: z
      .string()
      .trim()
      .min(1, t`Jurisdiction is required`)
      .max(80, t`Jurisdiction must be 80 characters or fewer`),
    formName: z
      .string()
      .trim()
      .max(80, t`Form / voucher must be 80 characters or fewer`),
    internalNotes: z
      .string()
      .trim()
      .max(5000, t`Notes must be 5000 characters or fewer`),
  })
}

type FormFieldError = { message?: string }

function fieldErrors(errors: readonly unknown[]): FormFieldError[] {
  return errors.flatMap((error) => {
    if (!error) return []
    if (typeof error === 'string') return [{ message: error }]
    if (typeof error === 'object' && 'message' in error) {
      const message = error.message
      return typeof message === 'string' ? [{ message }] : []
    }
    return []
  })
}

function useEntityLabels(): Record<ClientEntityType, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      llc: t`LLC`,
      s_corp: t`S Corporation`,
      partnership: t`Partnership`,
      c_corp: t`C Corporation`,
      sole_prop: t`Sole proprietorship`,
      trust: t`Trust`,
      individual: t`Individual`,
      other: t`Other`,
    }),
    [t],
  )
}

function buildTaxYearOptions(): readonly string[] {
  const startYear = new Date().getFullYear()
  return Array.from({ length: TAX_YEAR_OPTION_COUNT }, (_, index) => String(startYear + index))
}

function normalizeJurisdictionForRuleSearch(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (
    normalized === 'FEDERAL' ||
    normalized === 'IRS' ||
    normalized === 'US' ||
    normalized === 'USA'
  ) {
    return 'FED'
  }
  return normalized
}

function ruleAppliesToSelectedClient(rule: ObligationRule, client: ClientPublic): boolean {
  if (client.entityType !== 'other' && rule.entityApplicability.includes(client.entityType)) {
    return true
  }
  if (
    rule.entityApplicability.includes('any_business') &&
    client.entityType !== 'individual' &&
    client.entityType !== 'trust'
  ) {
    return true
  }

  if (!client.taxClassification || client.taxClassification === 'unknown') return false
  if (client.taxClassification === 'partnership') {
    return rule.entityApplicability.includes('partnership')
  }
  if (client.taxClassification === 's_corp') {
    return rule.entityApplicability.includes('s_corp')
  }
  if (client.taxClassification === 'c_corp') {
    return rule.entityApplicability.includes('c_corp')
  }
  if (client.taxClassification === 'trust' || client.taxClassification === 'estate') {
    return rule.entityApplicability.includes('trust')
  }
  if (client.taxClassification === 'individual') {
    return rule.entityApplicability.includes('individual')
  }
  if (client.taxClassification === 'disregarded_entity') {
    return (
      rule.entityApplicability.includes('sole_prop') ||
      rule.entityApplicability.includes('individual') ||
      rule.entityApplicability.includes('any_business')
    )
  }
  return false
}

function findCreateRuleForSelection(input: {
  rules: readonly ObligationRule[]
  client: ClientPublic
  candidates: readonly ResolvedDeadlineRuleCandidate[]
  jurisdiction: string
  taxYear: number
}): ObligationRule | null {
  const jurisdiction = normalizeJurisdictionForRuleSearch(input.jurisdiction)
  const matches = input.candidates.flatMap((candidate, candidateIndex) => {
    const matchFormName = candidate.matchFormName?.trim().toLowerCase() ?? ''
    return input.rules
      .filter((rule) => rule.status === 'active')
      .filter((rule) => rule.dueDateLogic.kind !== 'source_defined_calendar')
      .filter((rule) => rule.taxType === candidate.taxType)
      .filter((rule) => rule.jurisdiction === jurisdiction)
      .filter((rule) => ruleAppliesToSelectedClient(rule, input.client))
      .filter((rule) => !matchFormName || rule.formName.trim().toLowerCase() === matchFormName)
      .map((rule) => ({ candidateIndex, rule }))
  })

  matches.sort((a, b) => {
    if (a.candidateIndex !== b.candidateIndex) return a.candidateIndex - b.candidateIndex
    const aExactYear = a.rule.taxYear === input.taxYear
    const bExactYear = b.rule.taxYear === input.taxYear
    if (aExactYear !== bExactYear) return aExactYear ? -1 : 1
    return b.rule.taxYear - a.rule.taxYear
  })

  return matches[0]?.rule ?? null
}

function hasReviewRuleForSelection(input: {
  rules: readonly ObligationRule[]
  client: ClientPublic
  candidates: readonly ResolvedDeadlineRuleCandidate[]
  jurisdiction: string
}): boolean {
  const jurisdiction = normalizeJurisdictionForRuleSearch(input.jurisdiction)
  return input.candidates.some((candidate) => {
    const matchFormName = candidate.matchFormName?.trim().toLowerCase() ?? ''
    return input.rules.some(
      (rule) =>
        (rule.status === 'candidate' ||
          rule.status === 'pending_review' ||
          rule.dueDateLogic.kind === 'source_defined_calendar') &&
        rule.taxType === candidate.taxType &&
        rule.jurisdiction === jurisdiction &&
        ruleAppliesToSelectedClient(rule, input.client) &&
        (!matchFormName || rule.formName.trim().toLowerCase() === matchFormName),
    )
  })
}

function shouldReplaceFormName(input: {
  currentCategoryValue: string
  nextCategoryValue: string
  currentFormName: string
  autoFormName: string | null
}): boolean {
  const currentFormName = input.currentFormName.trim()
  if (currentFormName.length === 0) return true
  if (input.autoFormName !== null && currentFormName === input.autoFormName) return true
  if (
    isDeadlineCategoryDefaultFormName({
      value: input.currentCategoryValue,
      formName: currentFormName,
    })
  ) {
    return true
  }
  return isDeadlineCategoryDefaultFormName({
    value: input.nextCategoryValue,
    formName: currentFormName,
  })
}

function suggestionMatchesValue(option: SuggestionOption, value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return option.label.toLowerCase() === normalized
}

function SuggestionCombobox<TOption extends SuggestionOption>({
  id,
  value,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  groups,
  fallbackLabel,
  invalid,
  queryOnOpen = 'selection',
  searchable = true,
  allowCustom = true,
  onValueChange,
  onOptionSelect,
}: {
  id: string
  value: string
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  groups: readonly SuggestionGroup<TOption>[]
  fallbackLabel?: (value: string) => string
  invalid?: boolean
  queryOnOpen?: 'selection' | 'empty'
  searchable?: boolean
  allowCustom?: boolean
  onValueChange: (value: string) => void
  onOptionSelect?: (option: TOption) => void
}) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const options = useMemo(() => groups.flatMap((group) => group.options), [groups])
  const selectedOption = options.find((option) => option.value === value)
  const triggerLabel = selectedOption?.label ?? (value ? (fallbackLabel?.(value) ?? value) : '')
  const trimmedQuery = query.trim()
  const hasExactMatch = options.some((option) => suggestionMatchesValue(option, trimmedQuery))

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    setQuery(nextOpen && queryOnOpen === 'selection' ? triggerLabel : '')
  }

  function selectOption(option: TOption) {
    onValueChange(option.value)
    onOptionSelect?.(option)
    changeOpen(false)
  }

  function selectCustom(nextValue: string) {
    onValueChange(nextValue)
    changeOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            className={cn(
              'flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-divider-regular bg-components-input-bg-normal px-3 py-1 text-sm text-components-input-text-filled transition-colors outline-none',
              'hover:bg-components-input-bg-hover',
              'focus-visible:border-components-input-border-active focus-visible:bg-components-input-bg-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-2 focus-visible:ring-offset-background-default',
              'aria-invalid:border-components-input-border-destructive aria-invalid:bg-components-input-bg-destructive aria-invalid:ring-2 aria-invalid:ring-state-destructive-active aria-invalid:ring-offset-2',
            )}
          >
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-left',
                triggerLabel
                  ? 'text-components-input-text-filled'
                  : 'text-components-input-text-placeholder',
              )}
            >
              {triggerLabel || placeholder}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
          </button>
        }
      />
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-(--anchor-width) max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <Command loop>
          {searchable ? (
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
            />
          ) : null}
          <CommandList className="max-h-[320px]">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {groups.map((group, index) =>
              group.options.length > 0 ? (
                <Fragment key={group.heading ?? index}>
                  {index > 0 ? <CommandSeparator /> : null}
                  <CommandGroup heading={group.heading}>
                    {group.options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={[option.label, option.description ?? ''].join(' ')}
                        onSelect={() => selectOption(option)}
                        className="grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {option.label}
                          </span>
                          {option.description ? (
                            <span className="block truncate text-xs text-text-tertiary">
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                        <CheckIcon
                          className={cn(
                            'size-4 text-text-accent',
                            option.value === value ? 'opacity-100' : 'opacity-0',
                          )}
                          aria-hidden
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Fragment>
              ) : null,
            )}
            {allowCustom && trimmedQuery.length > 0 && !hasExactMatch ? (
              <>
                <CommandSeparator />
                <CommandItem
                  value={trimmedQuery}
                  onSelect={() => selectCustom(trimmedQuery)}
                  className="grid-cols-[minmax(0,1fr)]"
                >
                  <span className="truncate text-sm text-text-primary">
                    {t`Use "${trimmedQuery}"`}
                  </span>
                </CommandItem>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * "+ Add deadline" entry-point dialog. Used by the Today page
 * (no `defaultClientId`) and the Client detail page
 * (`defaultClientId` set, which locks the combobox to that
 * client).
 *
 * Vocabulary split (deliberate):
 *  - Outside the dialog (trigger button, toast headline) uses
 *    "deadline" — the CPA's workflow voice.
 *  - Inside the dialog (title, form fields, submit button) uses
 *    "obligation" — the data-model voice that matches the schema,
 *    the queue, and the audit log.
 *  - The description bridges them in one sentence so the
 *    mapping is honest.
 *
 * The dialog deliberately does not ask for a due date. Category,
 * jurisdiction, and tax year identify an active rule; the server
 * expands that rule into the concrete obligation row.
 */
export function CreateObligationDialog({
  trigger,
  defaultClientId,
  onCreated,
}: {
  trigger?: ReactElement
  defaultClientId?: string
  onCreated?: (obligationId: string) => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const entityLabels = useEntityLabels()
  const [open, setOpen] = useState(false)
  const [createClientOpen, setCreateClientOpen] = useState(false)
  const [autoFormName, setAutoFormName] = useState<string | null>(null)
  const taxYearOptions = useMemo(buildTaxYearOptions, [])

  const formSchema = useMemo(() => createFormSchema(t), [t])
  const form = useForm({
    defaultValues: defaultFormValues(defaultClientId),
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }) => {
      submitRuleBackedDeadline(value)
    },
  })

  const clientId = useStore(form.store, (state) => state.values.clientId)
  const taxTypeValue = useStore(form.store, (state) => state.values.taxType)
  const taxYearValue = useStore(form.store, (state) => state.values.taxYear)
  const jurisdictionValue = useStore(form.store, (state) => state.values.jurisdiction)
  const formNameValue = useStore(form.store, (state) => state.values.formName)
  const internalNotes = useStore(form.store, (state) => state.values.internalNotes)

  const clientsQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: CLIENTS_LIST_INPUT }),
    enabled: open || clientId.trim().length > 0,
  })
  const clients = clientsQuery.data ?? EMPTY_CLIENTS
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clients, clientId],
  )
  const rulesQuery = useQuery({
    ...orpc.rules.listRules.queryOptions({ input: { includeCandidates: true } }),
    enabled: open,
  })
  const allRules = rulesQuery.data ?? EMPTY_RULES
  const deadlineCategorySuggestionGroups = useMemo(
    () =>
      [
        {
          options: listDeadlineCategorySuggestions(),
        },
      ] satisfies readonly SuggestionGroup<DeadlineCategorySuggestion>[],
    [],
  )
  const formVoucherSuggestionGroups = useMemo(() => {
    const related = listFormVoucherSuggestionsForInput({
      value: taxTypeValue,
      jurisdiction: jurisdictionValue,
    })
    const relatedValues = new Set(related.map((option) => option.value.toLowerCase()))
    return [
      {
        heading: t`Suggested forms and vouchers`,
        options: [
          ...related,
          ...COMMON_FORM_VOUCHER_SUGGESTIONS.filter(
            (option) => !relatedValues.has(option.value.toLowerCase()),
          ),
        ],
      },
    ] satisfies readonly SuggestionGroup<SuggestionOption>[]
  }, [jurisdictionValue, t, taxTypeValue])
  const ruleMatchStatus = useMemo(() => {
    if (
      !selectedClient ||
      taxTypeValue.trim().length === 0 ||
      jurisdictionValue.trim().length === 0 ||
      !/^\d{4}$/.test(taxYearValue)
    ) {
      return { kind: 'idle' as const }
    }
    if (rulesQuery.isPending && allRules.length === 0) return { kind: 'loading' as const }

    const resolution = resolveDeadlineCategoryForInput({
      value: taxTypeValue,
      jurisdiction: jurisdictionValue,
      formName: formNameValue,
    })
    const rule = findCreateRuleForSelection({
      rules: allRules,
      client: selectedClient,
      candidates: resolution.candidates,
      jurisdiction: jurisdictionValue,
      taxYear: Number(taxYearValue),
    })
    if (rule) return { kind: 'matched' as const, rule }

    const needsReview = hasReviewRuleForSelection({
      rules: allRules,
      client: selectedClient,
      candidates: resolution.candidates,
      jurisdiction: jurisdictionValue,
    })
    if (needsReview) {
      return {
        kind: 'review_required' as const,
        jurisdiction: resolution.normalizedJurisdiction,
      }
    }

    return {
      kind: 'unavailable' as const,
      jurisdiction: resolution.normalizedJurisdiction,
    }
  }, [
    allRules,
    formNameValue,
    jurisdictionValue,
    rulesQuery.isPending,
    selectedClient,
    taxTypeValue,
    taxYearValue,
  ])

  const createMutation = useMutation(
    orpc.obligations.createFromRule.mutationOptions({
      onSuccess: (result) => {
        const obligation = result.obligations[0]
        // Invalidate every consumer that surfaces obligation data
        // so the new row appears immediately: sidebar count, dashboard
        // counts, queue facets, queue list, client filing plan list.
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        toast.success(t`Deadline added`, {
          description:
            result.obligations.length > 0
              ? t`${result.obligations.length} deadline created from the rule library.`
              : t`That deadline already exists for this client and tax year.`,
        })
        if (internalNotes.trim().length > 0) {
          // Notes capture is intentionally local until the
          // `obligations.addReviewNote` endpoint ships. Surface
          // that expectation so the user knows the textarea
          // content didn't silently drop.
          toast.info(t`Internal notes drafted`, {
            description: t`Open the deadline drawer to save your notes; the create endpoint doesn't accept notes yet.`,
          })
        }
        form.reset(defaultFormValues(defaultClientId))
        setAutoFormName(null)
        setOpen(false)
        if (obligation) onCreated?.(obligation.id)
      },
      onError: (error) => {
        toast.error(t`Couldn't add deadline`, {
          description: rpcErrorMessage(error) ?? t`Check the fields and try again.`,
        })
      },
    }),
  )

  function submitRuleBackedDeadline(value: FormValues) {
    if (!selectedClient) {
      toast.error(t`Couldn't add deadline`, { description: t`Pick a client first.` })
      return
    }

    const taxYear = Number(value.taxYear)
    const resolvedCategory = resolveDeadlineCategoryForInput({
      value: value.taxType,
      jurisdiction: value.jurisdiction,
      formName: value.formName,
    })
    const rule = findCreateRuleForSelection({
      rules: allRules,
      client: selectedClient,
      candidates: resolvedCategory.candidates,
      jurisdiction: value.jurisdiction,
      taxYear,
    })

    if (!rule) {
      toast.error(t`Couldn't add deadline`, {
        description: t`No rule-backed deadline is available for this category, jurisdiction, and tax year yet.`,
      })
      return
    }

    createMutation.mutate({
      clientId: value.clientId,
      ruleId: rule.id,
      taxYear,
    })
  }

  const createClientMutation = useMutation(
    orpc.clients.create.mutationOptions({
      onSuccess: (client) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        form.setFieldValue('clientId', client.id)
        setCreateClientOpen(false)
        toast.success(t`Client created`, { description: client.name })
      },
      onError: (error) => {
        toast.error(t`Couldn't create client`, {
          description:
            rpcErrorMessage(error) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )

  function handleCreateClient(input: ClientCreateInput, callbacks: { onSuccess: () => void }) {
    createClientMutation.mutate(input, {
      onSuccess: () => {
        callbacks.onSuccess()
      },
    })
  }

  function setAutoFormForSelection(input: { categoryValue: string; jurisdiction: string }) {
    const nextFormName = preferredDeadlineCategoryFormName({
      value: input.categoryValue,
      jurisdiction: input.jurisdiction,
    })
    form.setFieldValue('formName', nextFormName ?? '')
    setAutoFormName(nextFormName)
  }

  function maybeReplaceAutoFormName(input: { categoryValue: string; jurisdiction: string }) {
    if (
      shouldReplaceFormName({
        currentCategoryValue: taxTypeValue,
        nextCategoryValue: input.categoryValue,
        currentFormName: formNameValue,
        autoFormName,
      })
    ) {
      setAutoFormForSelection(input)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setAutoFormName(null)
        }}
      >
        <DialogTrigger
          render={
            trigger ?? (
              <Button type="button" size="sm">
                <PlusIcon data-icon="inline-start" />
                {/* Keep the visible copy in the CPA-facing "deadline"
                    vocabulary; the component name still follows the
                    underlying domain model. */}
                <Trans>Add deadline</Trans>
              </Button>
            )
          }
        />
        <DialogContent className="w-[36rem] max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>
              <Trans>Add deadline</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Select the tax year, deadline category, and jurisdiction. DueDateHQ calculates the
                due date from the rule library.
              </Trans>
            </DialogDescription>
          </DialogHeader>
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
          >
            <FieldGroup className="gap-4">
              <form.Field name="clientId">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="obligation-client">
                      <Trans>Client</Trans>
                    </FieldLabel>
                    <ClientCombobox
                      id="obligation-client"
                      value={field.state.value || null}
                      onValueChange={(next) => field.handleChange(next)}
                      disabled={Boolean(defaultClientId)}
                      placeholder={t`Pick a client…`}
                    />
                    {defaultClientId ? (
                      <span className="text-caption text-text-tertiary">
                        <Trans>Locked to this client because you opened from their page.</Trans>
                      </span>
                    ) : (
                      // 2026-05-25 (Yuqi Today #29): `self-start` pins
                      // this affordance to the left edge of the field
                      // column. Without it, the Field's flex layout
                      // was placing the chip centered relative to
                      // its content row (or filling width by default
                      // in some browsers) — Yuqi flagged it sitting
                      // off to the right of the input above. Sits
                      // flush under the combobox now, as a quiet
                      // secondary affordance.
                      <button
                        type="button"
                        onClick={() => setCreateClientOpen(true)}
                        className="w-fit self-start rounded-sm text-xs text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                      >
                        <Trans>Don't see your client? Create one</Trans>
                      </button>
                    )}
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>

              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <form.Field name="taxType">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="obligation-tax-type">
                        <Trans>Deadline category</Trans>
                      </FieldLabel>
                      <SuggestionCombobox
                        id="obligation-tax-type"
                        value={field.state.value}
                        placeholder={t`Select category…`}
                        searchPlaceholder={t`Search deadline categories…`}
                        emptyLabel={t`No deadline categories match.`}
                        groups={deadlineCategorySuggestionGroups}
                        fallbackLabel={formatTaxCode}
                        invalid={!field.state.meta.isValid}
                        searchable={false}
                        allowCustom={false}
                        onValueChange={field.handleChange}
                        onOptionSelect={(option) => {
                          const nextJurisdiction = option.jurisdiction ?? jurisdictionValue
                          if (option.jurisdiction) {
                            form.setFieldValue('jurisdiction', option.jurisdiction)
                          }
                          maybeReplaceAutoFormName({
                            categoryValue: option.value,
                            jurisdiction: nextJurisdiction,
                          })
                        }}
                      />
                      <FieldError errors={fieldErrors(field.state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="taxYear">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="obligation-tax-year">
                        <Trans>Tax year</Trans>
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => {
                          if (value !== null) {
                            field.handleChange(value)
                          }
                        }}
                      >
                        <SelectTrigger
                          id="obligation-tax-year"
                          aria-invalid={!field.state.meta.isValid || undefined}
                          className="w-full"
                        >
                          <SelectValue placeholder={t`Select tax year`} />
                        </SelectTrigger>
                        <SelectContent align="start">
                          <SelectGroup>
                            {taxYearOptions.map((year, index) => (
                              <SelectItem key={year} value={year}>
                                {index === 0 ? t`${year} (current year)` : year}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError errors={fieldErrors(field.state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="formName">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="obligation-form-name">
                        <Trans>Form / voucher</Trans>
                      </FieldLabel>
                      <SuggestionCombobox
                        id="obligation-form-name"
                        value={field.state.value}
                        placeholder={t`Optional`}
                        searchPlaceholder={t`Search forms and vouchers…`}
                        emptyLabel={t`No forms or vouchers match.`}
                        groups={formVoucherSuggestionGroups}
                        queryOnOpen="empty"
                        onValueChange={(value) => {
                          field.handleChange(value)
                          setAutoFormName(null)
                        }}
                      />
                      <FieldError errors={fieldErrors(field.state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="jurisdiction">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="obligation-jurisdiction">
                        <Trans>Jurisdiction</Trans>
                      </FieldLabel>
                      <Input
                        id="obligation-jurisdiction"
                        name={field.name}
                        value={field.state.value}
                        placeholder={t`Federal, CA, NY…`}
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          const nextJurisdiction = event.target.value
                          field.handleChange(nextJurisdiction)
                          if (taxTypeValue.trim().length > 0) {
                            maybeReplaceAutoFormName({
                              categoryValue: taxTypeValue,
                              jurisdiction: nextJurisdiction,
                            })
                          }
                        }}
                      />
                      <FieldError errors={fieldErrors(field.state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
              </div>

              {ruleMatchStatus.kind !== 'idle' ? (
                <div
                  aria-live="polite"
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs',
                    ruleMatchStatus.kind === 'matched'
                      ? 'border-state-success-solid/60 bg-state-success-hover text-text-success'
                      : ruleMatchStatus.kind === 'review_required'
                        ? 'border-state-warning-border bg-state-warning-hover text-text-warning'
                        : 'border-divider-regular bg-background-subtle text-text-tertiary',
                  )}
                >
                  {ruleMatchStatus.kind === 'matched' ? (
                    <>
                      <Trans>Match</Trans>
                      <span> · {ruleMatchStatus.rule.title}</span>
                    </>
                  ) : ruleMatchStatus.kind === 'review_required' ? (
                    <>
                      <Trans>Rule review required</Trans>
                      <span> · {ruleMatchStatus.jurisdiction}</span>
                    </>
                  ) : ruleMatchStatus.kind === 'loading' ? (
                    <Trans>Loading rules…</Trans>
                  ) : (
                    <Trans>No active rules for this jurisdiction.</Trans>
                  )}
                </div>
              ) : null}

              <form.Field name="internalNotes">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="obligation-notes">
                      <Trans>Internal notes</Trans>
                    </FieldLabel>
                    <Textarea
                      id="obligation-notes"
                      name={field.name}
                      value={field.state.value}
                      rows={3}
                      placeholder={t`Partner, filing profile, or other context for this deadline.`}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <span className="text-caption text-text-tertiary">
                      <Trans>
                        Optional context; save it from the deadline drawer after creation.
                      </Trans>
                    </span>
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || rulesQuery.isLoading || clientId.length === 0}
              >
                {createMutation.isPending
                  ? t`Adding…`
                  : rulesQuery.isLoading
                    ? t`Loading rules…`
                    : t`Add deadline`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreateClientDialog
        entityLabels={entityLabels}
        isPending={createClientMutation.isPending}
        onCreate={handleCreateClient}
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        hideTrigger
      />
    </>
  )
}
