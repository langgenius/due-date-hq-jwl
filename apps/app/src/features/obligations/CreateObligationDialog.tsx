import { Fragment, type ReactElement, useCallback, useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, ChevronDownIcon, Loader2Icon, PlusIcon } from 'lucide-react'
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
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
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
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { ClientCombobox } from '@/features/clients/ClientCombobox'
import { type ClientEntityType } from '@/features/clients/client-readiness'
import { CreateClientDialog } from '@/features/clients/CreateClientDialog'
import {
  COMMON_FORM_VOUCHER_SUGGESTIONS,
  isTaxTypeCoveredByDeadlineCategories,
  listDeadlineCategorySuggestions,
  listFormVoucherSuggestionsForInput,
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
const TAX_YEAR_OPTION_COUNT = 6

type SuggestionOption = {
  value: string
  label: string
  description?: string
}

type SuggestionGroup<TOption extends SuggestionOption> = {
  heading?: string
  options: readonly TOption[]
}

type JurisdictionOptionClient = {
  state: string | null
  filingProfiles: readonly { state: string }[]
}

type RuleSelectionMatch =
  | {
      kind: 'matched'
      jurisdiction: string
      normalizedJurisdiction: string
      rule: ObligationRule
    }
  | {
      kind: 'review_required' | 'unavailable' | 'loading'
      jurisdiction: string
      normalizedJurisdiction: string
    }

type FormValues = {
  clientId: string
  taxType: string
  taxYear: string
  formNames: string[]
  jurisdiction: string
  includeFederal: boolean
  internalNotes: string
}

type TaxYearSelectContext = {
  currentCalendarYear: number
  defaultTaxYear: string
  options: readonly string[]
}

export function defaultTaxYear(today = new Date()): string {
  return String(today.getFullYear() - 1)
}

export function buildTaxYearOptions(today = new Date()): readonly string[] {
  const currentCalendarYear = today.getFullYear()
  return Array.from({ length: TAX_YEAR_OPTION_COUNT }, (_, index) =>
    String(currentCalendarYear - 1 + index),
  )
}

function buildTaxYearSelectContext(today = new Date()): TaxYearSelectContext {
  return {
    currentCalendarYear: today.getFullYear(),
    defaultTaxYear: defaultTaxYear(today),
    options: buildTaxYearOptions(today),
  }
}

function defaultFormValues(defaultClientId?: string, taxYear = defaultTaxYear()): FormValues {
  return {
    clientId: defaultClientId ?? '',
    taxType: '',
    taxYear,
    formNames: [],
    jurisdiction: '',
    includeFederal: true,
    internalNotes: '',
  }
}

function createFormSchema(t: ReturnType<typeof useLingui>['t']) {
  return z
    .object({
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
      formNames: z
        .array(
          z
            .string()
            .trim()
            .min(1)
            .max(80, t`Form / voucher must be 80 characters or fewer`),
        )
        .max(10, t`Select 10 forms or fewer`),
      jurisdiction: z
        .string()
        .trim()
        .max(80, t`Jurisdiction must be 80 characters or fewer`),
      includeFederal: z.boolean(),
      internalNotes: z
        .string()
        .trim()
        .max(5000, t`Notes must be 5000 characters or fewer`),
    })
    .superRefine((value, context) => {
      if (value.jurisdiction.trim().length > 0 || value.includeFederal) return
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: t`Jurisdiction is required`,
        path: ['jurisdiction'],
      })
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

function uniqueJurisdictions(values: readonly string[]): string[] {
  const seen = new Set<string>()
  return values.flatMap((value) => {
    const normalized = normalizeJurisdictionForRuleSearch(value)
    if (normalized.length === 0 || seen.has(normalized)) return []
    seen.add(normalized)
    return [normalized]
  })
}

export function defaultJurisdictionForClient(client: JurisdictionOptionClient | null): string {
  if (!client) return ''
  return (
    uniqueJurisdictions([
      ...client.filingProfiles.map((profile) => profile.state),
      ...(client.state ? [client.state] : []),
    ]).find((jurisdiction) => jurisdiction !== 'FED') ?? ''
  )
}

export function selectedJurisdictionsForCreate(input: {
  jurisdiction: string
  includeFederal: boolean
  fixedJurisdiction?: string | null
}): string[] {
  const fixedJurisdiction = input.fixedJurisdiction
    ? normalizeJurisdictionForRuleSearch(input.fixedJurisdiction)
    : null
  if (fixedJurisdiction) return [fixedJurisdiction]

  const jurisdiction = normalizeJurisdictionForRuleSearch(input.jurisdiction)
  return uniqueJurisdictions([
    ...(jurisdiction && jurisdiction !== 'FED' ? [jurisdiction] : []),
    ...(jurisdiction === 'FED' || input.includeFederal ? ['FED'] : []),
  ])
}

function uniqueFormNames(values: readonly string[]): string[] {
  const seen = new Set<string>()
  return values.flatMap((value) => {
    const trimmed = value.trim()
    const normalized = trimmed.toLowerCase()
    if (trimmed.length === 0 || seen.has(normalized)) return []
    seen.add(normalized)
    return [trimmed]
  })
}

function categorySupportsJurisdiction(input: {
  categoryValue: string
  jurisdiction: string
}): boolean {
  return (
    resolveDeadlineCategoryForInput({
      value: input.categoryValue,
      jurisdiction: input.jurisdiction,
      formName: '',
    }).candidates.length > 0
  )
}

function defaultIncludeFederalForCategory(category: DeadlineCategorySuggestion): boolean {
  if (category.jurisdiction) {
    return normalizeJurisdictionForRuleSearch(category.jurisdiction) === 'FED'
  }
  return categorySupportsJurisdiction({ categoryValue: category.value, jurisdiction: 'FED' })
}

function mergeSuggestionOptions(options: readonly SuggestionOption[]): SuggestionOption[] {
  const seen = new Set<string>()
  return options.flatMap((option) => {
    const normalized = option.value.trim().toLowerCase()
    if (normalized.length === 0 || seen.has(normalized)) return []
    seen.add(normalized)
    return [option]
  })
}

export function preferredFormNamesForSelection(input: {
  categoryValue: string
  jurisdictions: readonly string[]
}): string[] {
  return uniqueFormNames(
    input.jurisdictions.flatMap((jurisdiction) => {
      const suggestion = listFormVoucherSuggestionsForInput({
        value: input.categoryValue,
        jurisdiction,
      })[0]
      return suggestion ? [suggestion.value] : []
    }),
  )
}

function findCreateRuleForSelection(input: {
  rules: readonly ObligationRule[]
  candidates: readonly ResolvedDeadlineRuleCandidate[]
  jurisdiction: string
  formNames: readonly string[]
  taxYear: number
}): ObligationRule | null {
  const jurisdiction = normalizeJurisdictionForRuleSearch(input.jurisdiction)
  const selectedFormNames = new Set(input.formNames.map((formName) => formName.toLowerCase()))
  const collectMatches = (formNames: ReadonlySet<string>) =>
    input.candidates.flatMap((candidate, candidateIndex) => {
      const matchFormName = candidate.matchFormName?.trim().toLowerCase() ?? ''
      return input.rules
        .filter((rule) => rule.status === 'active')
        .filter((rule) => rule.dueDateLogic.kind !== 'source_defined_calendar')
        .filter((rule) => rule.taxType === candidate.taxType)
        .filter((rule) => rule.jurisdiction === jurisdiction)
        .filter((rule) => !matchFormName || rule.formName.trim().toLowerCase() === matchFormName)
        .filter((rule) => formNames.size === 0 || formNames.has(rule.formName.trim().toLowerCase()))
        .map((rule) => ({ candidateIndex, rule }))
    })
  const matchesWithForms = collectMatches(selectedFormNames)
  const matches = matchesWithForms.length > 0 ? matchesWithForms : collectMatches(new Set())

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
  candidates: readonly ResolvedDeadlineRuleCandidate[]
  jurisdiction: string
  formNames: readonly string[]
}): boolean {
  const jurisdiction = normalizeJurisdictionForRuleSearch(input.jurisdiction)
  const selectedFormNames = new Set(input.formNames.map((formName) => formName.toLowerCase()))
  const hasMatch = (formNames: ReadonlySet<string>) =>
    input.candidates.some((candidate) => {
      const matchFormName = candidate.matchFormName?.trim().toLowerCase() ?? ''
      return input.rules.some(
        (rule) =>
          (rule.status === 'candidate' ||
            rule.status === 'pending_review' ||
            rule.dueDateLogic.kind === 'source_defined_calendar') &&
          rule.taxType === candidate.taxType &&
          rule.jurisdiction === jurisdiction &&
          (!matchFormName || rule.formName.trim().toLowerCase() === matchFormName) &&
          (formNames.size === 0 || formNames.has(rule.formName.trim().toLowerCase())),
      )
    })
  return hasMatch(selectedFormNames) || hasMatch(new Set())
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
              'flex h-9 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-divider-regular bg-components-input-bg-normal px-3 py-1 text-sm text-components-input-text-filled transition-colors outline-none',
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

function SuggestionMultiSelect<TOption extends SuggestionOption>({
  id,
  values,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  groups,
  invalid,
  queryOnOpen = 'empty',
  allowCustom = true,
  onValuesChange,
}: {
  id: string
  values: readonly string[]
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  groups: readonly SuggestionGroup<TOption>[]
  invalid?: boolean
  queryOnOpen?: 'selection' | 'empty'
  allowCustom?: boolean
  onValuesChange: (values: string[]) => void
}) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const options = useMemo(() => groups.flatMap((group) => group.options), [groups])
  const selectedValues = uniqueFormNames(values)
  const selectedLabels = selectedValues.map(
    (value) => options.find((option) => option.value === value)?.label ?? value,
  )
  const triggerLabel = selectedLabels.join(', ')
  const trimmedQuery = query.trim()
  const hasExactMatch = options.some((option) => suggestionMatchesValue(option, trimmedQuery))

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    setQuery(nextOpen && queryOnOpen === 'selection' ? triggerLabel : '')
  }

  function toggleValue(value: string) {
    const normalizedValue = value.trim().toLowerCase()
    const selected = selectedValues.some(
      (selectedValue) => selectedValue.trim().toLowerCase() === normalizedValue,
    )
    onValuesChange(
      selected
        ? selectedValues.filter(
            (selectedValue) => selectedValue.trim().toLowerCase() !== normalizedValue,
          )
        : uniqueFormNames([...selectedValues, value]),
    )
  }

  function selectCustom(nextValue: string) {
    onValuesChange(uniqueFormNames([...selectedValues, nextValue]))
    setQuery('')
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
              'flex h-9 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-divider-regular bg-components-input-bg-normal px-3 py-1 text-sm text-components-input-text-filled transition-colors outline-none',
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
          <CommandInput
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
          />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {groups.map((group, index) =>
              group.options.length > 0 ? (
                <Fragment key={group.heading ?? index}>
                  {index > 0 ? <CommandSeparator /> : null}
                  <CommandGroup heading={group.heading}>
                    {group.options.map((option) => {
                      const selected = selectedValues.some(
                        (value) => value.trim().toLowerCase() === option.value.toLowerCase(),
                      )
                      return (
                        <CommandItem
                          key={option.value}
                          value={[option.label, option.description ?? ''].join(' ')}
                          onSelect={() => toggleValue(option.value)}
                          className="grid-cols-[auto_minmax(0,1fr)] items-start"
                        >
                          <Checkbox
                            checked={selected}
                            tabIndex={-1}
                            aria-hidden
                            className="pointer-events-none mt-0.5"
                          />
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
                        </CommandItem>
                      )
                    })}
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
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactElement
  defaultClientId?: string
  onCreated?: (obligationId: string) => void
  // Optional controlled open, so the split "Add deadline" button (main click
  // + dropdown "Add one deadline" item) can both drive this one dialog.
  // Uncontrolled by default.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const entityLabels = useEntityLabels()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [controlledOpen, onOpenChange],
  )
  const [createClientOpen, setCreateClientOpen] = useState(false)
  const taxYearContext = useMemo(buildTaxYearSelectContext, [])

  const formSchema = useMemo(() => createFormSchema(t), [t])
  const form = useForm({
    defaultValues: defaultFormValues(defaultClientId, taxYearContext.defaultTaxYear),
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }) => {
      submitRuleBackedDeadline(value)
    },
  })

  const clientId = useStore(form.store, (state) => state.values.clientId)
  const taxTypeValue = useStore(form.store, (state) => state.values.taxType)
  const taxYearValue = useStore(form.store, (state) => state.values.taxYear)
  const formNamesValue = useStore(form.store, (state) => state.values.formNames)
  const jurisdictionValue = useStore(form.store, (state) => state.values.jurisdiction)
  const includeFederalValue = useStore(form.store, (state) => state.values.includeFederal)
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
  const deadlineCategoryOptions = useMemo(listDeadlineCategorySuggestions, [])
  // Accepted or practice-authored rules the static category catalog doesn't
  // reach (e.g. a custom Form 720 rule, an accepted PTET election rule) become
  // their own selectable categories so the dialog has no dead taxTypes.
  const libraryCategoryOptions = useMemo((): DeadlineCategorySuggestion[] => {
    const seen = new Set<string>()
    return allRules
      .filter(
        (rule) =>
          rule.status === 'active' &&
          rule.dueDateLogic.kind !== 'source_defined_calendar' &&
          !isTaxTypeCoveredByDeadlineCategories(rule.taxType),
      )
      .filter((rule) => {
        const key = rule.taxType.trim().toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(
        (rule): DeadlineCategorySuggestion => ({
          value: rule.taxType,
          label: rule.formName.trim() || formatTaxCode(rule.taxType),
          description: rule.title,
          generationStatus: 'rule_backed',
          jurisdiction: rule.jurisdiction,
          priority: 1000,
        }),
      )
      .toSorted((a, b) => a.label.localeCompare(b.label))
  }, [allRules])
  const deadlineCategorySuggestionGroups = useMemo(
    () =>
      [
        {
          options: deadlineCategoryOptions,
        },
        ...(libraryCategoryOptions.length > 0
          ? [{ heading: t`From your rule library`, options: libraryCategoryOptions }]
          : []),
      ] satisfies readonly SuggestionGroup<DeadlineCategorySuggestion>[],
    [deadlineCategoryOptions, libraryCategoryOptions, t],
  )
  const selectedCategory = useMemo(
    () =>
      deadlineCategoryOptions.find((option) => option.value === taxTypeValue) ??
      libraryCategoryOptions.find((option) => option.value === taxTypeValue) ??
      null,
    [deadlineCategoryOptions, libraryCategoryOptions, taxTypeValue],
  )
  const fixedJurisdiction = selectedCategory?.jurisdiction ?? null
  const selectedRuleJurisdictions = useMemo(
    () =>
      selectedJurisdictionsForCreate({
        jurisdiction: jurisdictionValue,
        includeFederal: includeFederalValue,
        fixedJurisdiction,
      }),
    [fixedJurisdiction, includeFederalValue, jurisdictionValue],
  )
  const selectedFormNames = useMemo(() => uniqueFormNames(formNamesValue), [formNamesValue])
  const formVoucherSuggestionGroups = useMemo(() => {
    const selectedJurisdictions =
      selectedRuleJurisdictions.length > 0
        ? selectedRuleJurisdictions
        : uniqueJurisdictions([jurisdictionValue, includeFederalValue ? 'FED' : ''])
    const related = mergeSuggestionOptions(
      selectedJurisdictions.flatMap((jurisdiction) =>
        listFormVoucherSuggestionsForInput({
          value: taxTypeValue,
          jurisdiction,
        }),
      ),
    )
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
  }, [includeFederalValue, jurisdictionValue, selectedRuleJurisdictions, t, taxTypeValue])
  const ruleMatches = useMemo((): RuleSelectionMatch[] => {
    if (
      taxTypeValue.trim().length === 0 ||
      selectedRuleJurisdictions.length === 0 ||
      !/^\d{4}$/.test(taxYearValue)
    ) {
      return []
    }

    if (!selectedClient) {
      return selectedRuleJurisdictions.map((jurisdiction) => ({
        kind: 'loading' as const,
        jurisdiction,
        normalizedJurisdiction: normalizeJurisdictionForRuleSearch(jurisdiction),
      }))
    }
    return selectedRuleJurisdictions.map((jurisdiction) => {
      const resolution = resolveDeadlineCategoryForInput({
        value: taxTypeValue,
        jurisdiction,
        formName: '',
      })
      const normalizedJurisdiction = resolution.normalizedJurisdiction
      if (rulesQuery.isPending && allRules.length === 0) {
        return {
          kind: 'loading' as const,
          jurisdiction,
          normalizedJurisdiction,
        }
      }
      const rule = findCreateRuleForSelection({
        rules: allRules,
        candidates: resolution.candidates,
        jurisdiction,
        formNames: selectedFormNames,
        taxYear: Number(taxYearValue),
      })
      if (rule) {
        return {
          kind: 'matched' as const,
          jurisdiction,
          normalizedJurisdiction,
          rule,
        }
      }

      const needsReview = hasReviewRuleForSelection({
        rules: allRules,
        candidates: resolution.candidates,
        jurisdiction,
        formNames: selectedFormNames,
      })
      if (needsReview) {
        return {
          kind: 'review_required' as const,
          jurisdiction,
          normalizedJurisdiction,
        }
      }
      return {
        kind: 'unavailable' as const,
        jurisdiction,
        normalizedJurisdiction,
      }
    })
  }, [
    allRules,
    rulesQuery.isPending,
    selectedClient,
    selectedFormNames,
    selectedRuleJurisdictions,
    taxTypeValue,
    taxYearValue,
  ])
  const matchedRuleSelections = useMemo(() => {
    if (!/^\d{4}$/.test(taxYearValue)) return []
    const taxYear = Number(taxYearValue)
    return ruleMatches.flatMap((match) =>
      match.kind === 'matched' ? [{ ruleId: match.rule.id, taxYear }] : [],
    )
  }, [ruleMatches, taxYearValue])
  const hasBlockingRuleSelection = ruleMatches.some((match) => match.kind !== 'matched')

  const createMutation = useMutation(
    orpc.obligations.createFromRules.mutationOptions({
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
        form.reset(defaultFormValues(defaultClientId, taxYearContext.defaultTaxYear))
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

    if (matchedRuleSelections.length === 0 || hasBlockingRuleSelection) {
      toast.error(t`Couldn't add deadline`, {
        description: t`Every selected jurisdiction needs an active rule-backed deadline.`,
      })
      return
    }

    createMutation.mutate({
      clientId: value.clientId,
      selections: matchedRuleSelections,
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

  function setAutoFormsForSelection(input: {
    categoryValue: string
    jurisdiction: string
    includeFederal: boolean
    fixedJurisdiction?: string | null
  }) {
    const nextForms = preferredFormNamesForSelection({
      categoryValue: input.categoryValue,
      jurisdictions: selectedJurisdictionsForCreate(input),
    })
    form.setFieldValue('formNames', nextForms)
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
        }}
      >
        <DialogTrigger
          render={
            trigger ?? (
              // The "Add deadline" trigger uses the outline variant.
              // It sits next to dropdown filter triggers (Time range /
              // Severity / Sort by) which all use a lighter
              // `border-divider-regular` outline pattern. A filled-solid
              // primary variant would out-shout the filters and draw the
              // eye to the wrong corner of the toolbar (it's a discovery
              // button, not the page's destination CTA). Outline gives it
              // the same visual weight as the dropdowns so the toolbar
              // reads as a uniform action strip.
              <Button type="button" variant="outline" size="sm">
                <PlusIcon data-icon="inline-start" />
                {/* Keep the visible copy in the CPA-facing "deadline"
                    vocabulary; the component name still follows the
                    underlying domain model. */}
                <Trans>Add deadline</Trans>
              </Button>
            )
          }
        />
        <DialogContent className="w-[42rem] max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>
              <Trans>Add deadline</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Select the tax year, deadline category, jurisdiction, forms, and whether to include
                Federal. DueDateHQ calculates each due date from the rule library.
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
                      onValueChange={(next) => {
                        field.handleChange(next)
                        const nextClient = clients.find((client) => client.id === next) ?? null
                        const nextJurisdiction = defaultJurisdictionForClient(nextClient)
                        const nextIncludeFederal = selectedCategory
                          ? defaultIncludeFederalForCategory(selectedCategory)
                          : true
                        form.setFieldValue('jurisdiction', nextJurisdiction)
                        form.setFieldValue('includeFederal', nextIncludeFederal)
                        if (selectedCategory) {
                          setAutoFormsForSelection({
                            categoryValue: selectedCategory.value,
                            jurisdiction: nextJurisdiction,
                            includeFederal: nextIncludeFederal,
                            fixedJurisdiction: selectedCategory.jurisdiction ?? null,
                          })
                        }
                      }}
                      disabled={Boolean(defaultClientId)}
                      placeholder={t`Pick a client…`}
                    />
                    {defaultClientId ? (
                      <span className="text-caption text-text-tertiary">
                        <Trans>Locked to this client because you opened from their page.</Trans>
                      </span>
                    ) : (
                      // `self-start` pins this affordance to the left edge
                      // of the field column. Without it, the Field's flex
                      // layout places the chip centered relative to its
                      // content row (or filling width by default in some
                      // browsers) instead of flush under the combobox.
                      // The TextLink primitive (variant="accent") owns
                      // accent tone + underline-on-hover + focus ring;
                      // self-start is layout context for the Field column,
                      // so it stays via className.
                      <TextLink
                        variant="accent"
                        onClick={() => setCreateClientOpen(true)}
                        className="self-start text-left"
                      >
                        <Trans>Don't see your client? Create one</Trans>
                      </TextLink>
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
                          let nextJurisdiction = jurisdictionValue
                          if (option.jurisdiction) {
                            const jurisdiction = normalizeJurisdictionForRuleSearch(
                              option.jurisdiction,
                            )
                            nextJurisdiction = jurisdiction === 'FED' ? '' : jurisdiction
                            form.setFieldValue('jurisdiction', nextJurisdiction)
                          } else if (jurisdictionValue.trim().length === 0) {
                            nextJurisdiction = defaultJurisdictionForClient(selectedClient)
                            form.setFieldValue('jurisdiction', nextJurisdiction)
                          }
                          const nextIncludeFederal = defaultIncludeFederalForCategory(option)
                          form.setFieldValue('includeFederal', nextIncludeFederal)
                          setAutoFormsForSelection({
                            categoryValue: option.value,
                            jurisdiction: nextJurisdiction,
                            includeFederal: nextIncludeFederal,
                            fixedJurisdiction: option.jurisdiction ?? null,
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
                            {taxYearContext.options.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year === taxYearContext.defaultTaxYear
                                  ? t`${year} (current tax year)`
                                  : year}
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

              <form.Field name="formNames">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="obligation-form-names">
                      <Trans>Form / voucher</Trans>
                    </FieldLabel>
                    <SuggestionMultiSelect
                      id="obligation-form-names"
                      values={field.state.value}
                      placeholder={t`Optional`}
                      searchPlaceholder={t`Search forms and vouchers…`}
                      emptyLabel={t`No forms or vouchers match.`}
                      groups={formVoucherSuggestionGroups}
                      onValuesChange={field.handleChange}
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>

              <div className="grid gap-4 md:grid-cols-[1fr_160px]">
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
                        placeholder={fixedJurisdiction ? t`Federal only` : t`CA, NY, TX…`}
                        disabled={Boolean(fixedJurisdiction)}
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          const nextJurisdiction = event.target.value
                          field.handleChange(nextJurisdiction)
                          if (taxTypeValue.trim().length > 0) {
                            setAutoFormsForSelection({
                              categoryValue: taxTypeValue,
                              jurisdiction: nextJurisdiction,
                              includeFederal: includeFederalValue,
                              fixedJurisdiction,
                            })
                          }
                        }}
                      />
                      <FieldError errors={fieldErrors(field.state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="includeFederal">
                  {(field) => {
                    const federalOnly =
                      normalizeJurisdictionForRuleSearch(fixedJurisdiction ?? '') === 'FED'
                    return (
                      <Field>
                        <span className="hidden text-sm font-medium text-text-primary md:block">
                          &nbsp;
                        </span>
                        <label
                          className={cn(
                            'flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-divider-regular bg-components-input-bg-normal px-3 text-sm text-text-primary',
                            federalOnly &&
                              'cursor-not-allowed bg-background-subtle text-text-tertiary',
                          )}
                        >
                          <Checkbox
                            checked={federalOnly || field.state.value}
                            disabled={federalOnly}
                            onCheckedChange={(checked) => {
                              const nextIncludeFederal = checked
                              field.handleChange(nextIncludeFederal)
                              if (taxTypeValue.trim().length > 0) {
                                setAutoFormsForSelection({
                                  categoryValue: taxTypeValue,
                                  jurisdiction: jurisdictionValue,
                                  includeFederal: nextIncludeFederal,
                                  fixedJurisdiction,
                                })
                              }
                            }}
                            aria-label={t`Include Federal`}
                            className="size-4"
                          />
                          <Trans>Federal</Trans>
                        </label>
                      </Field>
                    )
                  }}
                </form.Field>
              </div>

              {ruleMatches.length > 0 ? (
                <div className="grid gap-2" aria-live="polite">
                  {ruleMatches.map((match) => (
                    <div
                      key={match.jurisdiction}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs',
                        match.kind === 'matched'
                          ? 'border-state-success-solid/60 bg-state-success-hover text-text-success'
                          : match.kind === 'review_required'
                            ? 'border-state-warning-border bg-state-warning-hover text-text-warning'
                            : 'border-divider-regular bg-background-subtle text-text-tertiary',
                      )}
                    >
                      <span className="font-mono">{match.normalizedJurisdiction}</span>
                      {match.kind === 'matched' ? (
                        <>
                          <span> · </span>
                          <Trans>Match</Trans>
                          <span> · {match.rule.title}</span>
                          <span> · {match.rule.formName || formatTaxCode(match.rule.taxType)}</span>
                        </>
                      ) : match.kind === 'review_required' ? (
                        <>
                          <span> · </span>
                          <Trans>Rule review required</Trans>
                        </>
                      ) : match.kind === 'loading' ? (
                        <>
                          <span> · </span>
                          <Trans>Loading rules…</Trans>
                        </>
                      ) : (
                        <>
                          <span> · </span>
                          <Trans>No active rule — accept or author one in the Rules library</Trans>
                        </>
                      )}
                    </div>
                  ))}
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
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  rulesQuery.isLoading ||
                  clientId.length === 0 ||
                  matchedRuleSelections.length === 0 ||
                  hasBlockingRuleSelection
                }
                aria-busy={createMutation.isPending || undefined}
              >
                {/* Loader2 spinner during pending matches the cross-app
                    mutation-button pattern: spinner + label text together. */}
                {createMutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                ) : null}
                {createMutation.isPending
                  ? t`Adding…`
                  : rulesQuery.isLoading
                    ? t`Loading rules…`
                    : matchedRuleSelections.length > 1
                      ? t`Add ${matchedRuleSelections.length} deadlines`
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
