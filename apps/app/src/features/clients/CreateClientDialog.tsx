import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useForm, useStore } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { Loader2Icon, PlusIcon } from 'lucide-react'
import * as z from 'zod'

import {
  ClientCreateInputSchema,
  type ClientCreateInput,
  type MemberAssigneeOption,
} from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
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

import { orpc } from '@/lib/rpc'

import { CLIENT_ENTITY_TYPES, isClientEntityType, type ClientEntityType } from './client-readiness'

const UNASSIGNED_ASSIGNEE_VALUE = '__unassigned__'

type ClientFormValues = {
  name: string
  entityType: ClientEntityType
  ein: string
  state: string
  county: string
  email: string
  assigneeId: string
  importanceWeight: '1' | '2' | '3'
  lateFilingCountLast12mo: string
  notes: string
}

type ClientFormField = keyof ClientFormValues
type FormFieldError = { message?: string }

const defaultClientFormValues: ClientFormValues = {
  name: '',
  entityType: 'llc',
  ein: '',
  state: '',
  county: '',
  email: '',
  assigneeId: '',
  importanceWeight: '2',
  lateFilingCountLast12mo: '0',
  notes: '',
}

function createClientFormSchema(t: ReturnType<typeof useLingui>['t']) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t`Client name is required`),
    entityType: z.enum(CLIENT_ENTITY_TYPES),
    ein: z
      .string()
      .trim()
      .refine((value) => value === '' || /^\d{2}-\d{7}$/.test(value), {
        message: t`Use EIN format ##-#######`,
      }),
    state: z
      .string()
      .trim()
      .refine((value) => value === '' || /^[A-Za-z]{2}$/.test(value), {
        message: t`Use a 2-letter state code`,
      }),
    county: z
      .string()
      .trim()
      .max(120, t`County must be 120 characters or fewer`),
    email: z
      .string()
      .trim()
      .refine((value) => value === '' || z.email().safeParse(value).success, {
        message: t`Enter a valid email address`,
      }),
    assigneeId: z
      .string()
      .trim()
      .max(200, t`Owner selection is invalid`),
    importanceWeight: z.enum(['1', '2', '3']),
    lateFilingCountLast12mo: z
      .string()
      .trim()
      .refine((value) => /^\d+$/.test(value) && Number(value) >= 0 && Number(value) <= 99, {
        message: t`Use a whole number from 0 to 99`,
      }),
    notes: z
      .string()
      .trim()
      .max(5000, t`Notes must be 5000 characters or fewer`),
  })
}

function nullableText(value: string): string | null {
  const next = value.trim()
  return next ? next : null
}

function formValuesToInput(values: ClientFormValues): ClientCreateInput {
  return {
    name: values.name.trim(),
    entityType: values.entityType,
    ein: nullableText(values.ein),
    state: nullableText(values.state)?.toUpperCase() ?? null,
    county: nullableText(values.county),
    email: nullableText(values.email),
    assigneeId: nullableText(values.assigneeId),
    importanceWeight: Number(values.importanceWeight),
    lateFilingCountLast12mo: Number(values.lateFilingCountLast12mo),
    notes: nullableText(values.notes),
  }
}

function contractPathToFormField(path: PropertyKey[]): ClientFormField | null {
  const [field] = path
  switch (field) {
    case 'name':
    case 'entityType':
    case 'ein':
    case 'state':
    case 'county':
    case 'email':
    case 'assigneeId':
    case 'importanceWeight':
    case 'lateFilingCountLast12mo':
    case 'notes':
      return field
    default:
      return null
  }
}

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

export function CreateClientDialog({
  entityLabels,
  isPending,
  onCreate,
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
}: {
  entityLabels: Record<ClientEntityType, string>
  isPending: boolean
  onCreate: (input: ClientCreateInput, callbacks: { onSuccess: () => void }) => void
  // Allow callers (e.g. CreateObligationDialog) to drive the open/close
  // state externally. When `open` is provided, internal state is
  // ignored; when omitted, the dialog manages itself.
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Hide the built-in "+ New client" trigger button when an external
  // caller wants to open the dialog programmatically without showing
  // the chrome.
  hideTrigger?: boolean
}) {
  const { t } = useLingui()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const clientFormSchema = useMemo(() => createClientFormSchema(t), [t])
  const form = useForm({
    defaultValues: defaultClientFormValues,
    validators: {
      onSubmit: clientFormSchema,
    },
    onSubmit: ({ value }) => {
      const parsed = ClientCreateInputSchema.safeParse(formValuesToInput(value))
      if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
          const field = contractPathToFormField(issue.path)
          if (!field) return
          form.setFieldMeta(field, (previous) => ({
            ...previous,
            isTouched: true,
            errorMap: {
              ...previous?.errorMap,
              onSubmit: issue.message,
            },
          }))
        })
        return
      }

      onCreate(parsed.data, {
        onSuccess: () => {
          form.reset(defaultClientFormValues)
          setOpen(false)
        },
      })
    },
  })
  const entityType = useStore(form.store, (state) => state.values.entityType)
  const assigneeId = useStore(form.store, (state) => state.values.assigneeId)
  const importanceWeight = useStore(form.store, (state) => state.values.importanceWeight)
  const assigneesQuery = useQuery({
    ...orpc.members.listAssignable.queryOptions({ input: undefined }),
    enabled: open,
  })
  const assignees = assigneesQuery.data ?? []
  const selectedAssignee = assignees.find((assignee) => assignee.assigneeId === assigneeId) ?? null
  const assigneeSelectValue = assigneeId || UNASSIGNED_ASSIGNEE_VALUE
  const assigneeSelectLabel = selectedAssignee?.name ?? t`Unassigned`

  return (
    <Dialog protectInput open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <DialogTrigger render={<Button type="button" />}>
          <PlusIcon data-icon="inline-start" />
          <Trans>New client</Trans>
        </DialogTrigger>
      )}
      <DialogContent className="w-160 max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>
            <Trans>Create client</Trans>
          </DialogTitle>
          <DialogDescription>
            {/* Plain phrasing: CPAs add clients constantly, so the
                dialog should sound like the routine action they're
                doing, not formal record-keeping language. */}
            <Trans>Add a client to this practice.</Trans>
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
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <form.Field name="name">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="client-name">
                      <Trans>Client name</Trans>
                    </FieldLabel>
                    {/* autoFocus on the first field so users opening
                        the dialog can immediately start typing the
                        client name without an extra click. */}
                    <Input
                      id="client-name"
                      name={field.name}
                      value={field.state.value}
                      autoFocus
                      aria-invalid={!field.state.meta.isValid}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
              <Field>
                <FieldLabel>
                  <Trans>Entity type</Trans>
                </FieldLabel>
                <Select
                  value={entityType}
                  onValueChange={(value) => {
                    if (value && isClientEntityType(value)) {
                      form.setFieldValue('entityType', value)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{entityLabels[entityType]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CLIENT_ENTITY_TYPES.map((entity) => (
                        <SelectItem key={entity} value={entity}>
                          {entityLabels[entity]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <form.Field name="ein">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="client-ein">
                      <Trans>EIN</Trans>
                    </FieldLabel>
                    {/* Placeholder uses Xs for the trailing 7 digits
                        (`12-XXXXXXX`) so it reads as a "format example"
                        rather than a real-looking EIN that a user might
                        mistake for the number already on file. */}
                    <Input
                      id="client-ein"
                      name={field.name}
                      value={field.state.value}
                      className="tabular-nums"
                      placeholder="12-XXXXXXX"
                      aria-invalid={!field.state.meta.isValid}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
              <form.Field name="state">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="client-state">
                      <Trans>State</Trans>
                    </FieldLabel>
                    {/* Uppercase the value on change (not just via CSS)
                        so what-you-see matches what-you-store. CSS-only
                        uppercasing would let a "ca" entry display as
                        "CA" while a copy-out, validation re-display, or
                        non-CSS surface exposes the lowercase original. */}
                    <Input
                      id="client-state"
                      name={field.name}
                      value={field.state.value}
                      className="font-mono uppercase tabular-nums"
                      placeholder="CA"
                      maxLength={2}
                      aria-invalid={!field.state.meta.isValid}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
              <form.Field name="county">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="client-county">
                      <Trans>County</Trans>
                    </FieldLabel>
                    <Input
                      id="client-county"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <form.Field name="email">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="client-email">
                      <Trans>Email</Trans>
                    </FieldLabel>
                    <Input
                      id="client-email"
                      name={field.name}
                      value={field.state.value}
                      type="email"
                      aria-invalid={!field.state.meta.isValid}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
              <Field>
                {/* Labels the `assigneeId` input "Assignee" — the same
                    vocabulary the /clients table and /deadlines use for
                    this data point. */}
                <FieldLabel htmlFor="client-assignee-trigger">
                  <Trans>Assignee</Trans>
                </FieldLabel>
                <Select
                  value={assigneeSelectValue}
                  onValueChange={(value) => {
                    const nextAssigneeId = value && value !== UNASSIGNED_ASSIGNEE_VALUE ? value : ''
                    form.setFieldValue('assigneeId', nextAssigneeId)
                  }}
                  disabled={assigneesQuery.isLoading || assigneesQuery.isError}
                >
                  <SelectTrigger id="client-assignee-trigger" className="w-full">
                    <SelectValue>{assigneeSelectLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      <SelectItem value={UNASSIGNED_ASSIGNEE_VALUE}>
                        <Trans>Unassigned</Trans>
                      </SelectItem>
                      {assignees.map((assignee) => (
                        <AssigneeSelectItem key={assignee.assigneeId} assignee={assignee} />
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>
                  <Trans>Importance</Trans>
                </FieldLabel>
                <Select
                  value={importanceWeight}
                  onValueChange={(value) => {
                    if (value === '1' || value === '2' || value === '3') {
                      form.setFieldValue('importanceWeight', value)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {importanceWeight === '3'
                        ? t`High`
                        : importanceWeight === '1'
                          ? t`Low`
                          : t`Medium`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="1">
                        <Trans>Low</Trans>
                      </SelectItem>
                      <SelectItem value="2">
                        <Trans>Medium</Trans>
                      </SelectItem>
                      <SelectItem value="3">
                        <Trans>High</Trans>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <form.Field name="lateFilingCountLast12mo">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="client-late-filings">
                      <Trans>Late filings, 12mo</Trans>
                    </FieldLabel>
                    <Input
                      id="client-late-filings"
                      name={field.name}
                      value={field.state.value}
                      type="number"
                      min={0}
                      max={99}
                      className="tabular-nums"
                      aria-invalid={!field.state.meta.isValid}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
            </div>

            <form.Field name="notes">
              {(field) => {
                // The Notes textarea is validated against a
                // 5000-character ceiling. Inline counter appears
                // alongside the label once the user starts typing so
                // they get a signal before submit; flips to destructive
                // tone when over the limit so the constraint reads as
                // actionable, not surprise rejection. Stays silent at
                // zero so the empty state isn't noisier than it needs to
                // be.
                const noteLength = field.state.value.length
                const noteMax = 5000
                const overLimit = noteLength > noteMax
                return (
                  <Field>
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel htmlFor="client-notes">
                        <Trans>Notes</Trans>
                      </FieldLabel>
                      {noteLength > 0 ? (
                        <span
                          className={
                            overLimit
                              ? 'text-xs tabular-nums text-text-destructive'
                              : 'text-xs tabular-nums text-text-tertiary'
                          }
                          aria-live="polite"
                        >
                          {noteLength} / {noteMax}
                        </span>
                      ) : null}
                    </div>
                    <Textarea
                      id="client-notes"
                      name={field.name}
                      value={field.state.value}
                      rows={3}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )
              }}
            </form.Field>
          </FieldGroup>

          <DialogFooter>
            {/* Cancel uses ghost (the canonical "dialog Cancel uses
                ghost" pattern) so Create stays the eye anchor — not
                outline, which would give it the same weight as the
                primary action. */}
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              <Trans>Cancel</Trans>
            </Button>
            {/* Step 6 UX #78: Loader2 spinner during pending matches
                cross-app pattern. `aria-busy={isPending}` (raw bool)
                stays semantic for AT even with disabled; HEAD's
                `|| undefined` defaulted to bare attribute when truthy
                which Step 6's cleaner shape replaces. */}
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : null}
              {isPending ? t`Creating…` : t`Create client`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AssigneeSelectItem({ assignee }: { assignee: MemberAssigneeOption }) {
  return (
    <SelectItem value={assignee.assigneeId}>
      <span className="truncate">{assignee.name}</span>
      <span className="truncate text-xs text-text-tertiary">{assignee.email}</span>
    </SelectItem>
  )
}
