import { type ReactElement, useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'

import type { ClientCreateInput, ObligationCreateInput } from '@duedatehq/contracts'
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

import { ClientCombobox } from '@/features/clients/ClientCombobox'
import { type ClientEntityType } from '@/features/clients/client-readiness'
import { CreateClientDialog } from '@/features/clients/CreateClientDialog'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// The 6 canonical obligation types — picked up from
// `hanxujiang`'s 535e2c8 because they're real fields the server
// reads to route payment-vs-filing deadlines + populate the
// queue's tax-type filter. Type drives the conditional
// `paymentDueDate` vs `filingDueDate` assignment below.
const OBLIGATION_TYPES = [
  'filing',
  'payment',
  'deposit',
  'information',
  'client_action',
  'internal_review',
] as const satisfies readonly NonNullable<ObligationCreateInput['obligationType']>[]
type ObligationTypeValue = (typeof OBLIGATION_TYPES)[number]

function isObligationTypeValue(value: string | null): value is ObligationTypeValue {
  return OBLIGATION_TYPES.some((type) => type === value)
}

function useObligationTypeLabels(): Record<ObligationTypeValue, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      filing: t`Filing`,
      payment: t`Payment`,
      deposit: t`Deposit`,
      information: t`Information return`,
      client_action: t`Client action`,
      internal_review: t`Internal review`,
    }),
    [t],
  )
}

// Starting status — restricted to v2 lifecycle states that make
// sense for a brand-new manual row. The schema still accepts the
// legacy 10-state enum; this dialog narrows to the three honest
// "where do you start" options. Other states are reached via
// lifecycle transitions, not creation. See
// docs/Design/obligation-lifecycle-design-brief.md.
const CREATE_STATUS_VALUES = ['pending', 'waiting_on_client', 'blocked'] as const
type CreateStatusValue = (typeof CREATE_STATUS_VALUES)[number]

type FormValues = {
  clientId: string
  taxType: string
  baseDueDate: string
  jurisdiction: string
  formName: string
  obligationType: ObligationTypeValue
  status: CreateStatusValue
  internalNotes: string
}

const defaultFormValues: FormValues = {
  clientId: '',
  taxType: '',
  baseDueDate: '',
  jurisdiction: '',
  formName: '',
  obligationType: 'filing',
  status: 'pending',
  internalNotes: '',
}

function createFormSchema(t: ReturnType<typeof useLingui>['t']) {
  return z.object({
    clientId: z.string().min(1, t`Pick a client`),
    taxType: z
      .string()
      .trim()
      .min(1, t`Tax type is required`)
      .max(80, t`Tax type must be 80 characters or fewer`),
    baseDueDate: z
      .string()
      .trim()
      .refine((value) => ISO_DATE_RE.test(value), { message: t`Pick a base due date` }),
    jurisdiction: z
      .string()
      .trim()
      .max(80, t`Jurisdiction must be 80 characters or fewer`),
    formName: z
      .string()
      .trim()
      .max(80, t`Form must be 80 characters or fewer`),
    obligationType: z.enum(OBLIGATION_TYPES),
    status: z.enum(CREATE_STATUS_VALUES),
    internalNotes: z
      .string()
      .trim()
      .max(5000, t`Notes must be 5000 characters or fewer`),
  })
}

function nullableText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Build the wire-shaped `ObligationCreateInput`. Crucially, the
 * `paymentDueDate` vs `filingDueDate` assignment branches on
 * `obligationType` — payment / deposit rows route to
 * paymentDueDate, everything else to filingDueDate. This matches
 * how the server's exposure + reminder pipelines read the row
 * (see hanxujiang's 535e2c8 for the original routing logic).
 *
 * `recurrence: 'once'` and `riskLevel: 'low'` are sensible
 * defaults for a manual row — annual rollover / risk inputs are
 * separate flows the CPA can graduate to after creation.
 */
function formValuesToInput(values: FormValues): ObligationCreateInput {
  const dueDate = values.baseDueDate
  const isPaymentDeadline =
    values.obligationType === 'payment' || values.obligationType === 'deposit'
  return {
    clientId: values.clientId,
    taxType: values.taxType.trim(),
    generationSource: 'manual',
    jurisdiction: nullableText(values.jurisdiction),
    formName: nullableText(values.formName),
    obligationType: values.obligationType,
    baseDueDate: dueDate,
    recurrence: 'once',
    riskLevel: 'low',
    status: values.status,
    ...(isPaymentDeadline ? { paymentDueDate: dueDate } : { filingDueDate: dueDate }),
  }
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
 * This is the merged shape of two parallel implementations:
 *  - Yuqi's 083c860 contributed the searchable `ClientCombobox`,
 *    the inline "Create new client" link, the internal-notes
 *    textarea (the K-1 → notes decision from the 2026-05-21
 *    meeting), and the Zod + react-form validation pattern.
 *  - Hanxujiang's 535e2c8 contributed the jurisdiction + form
 *    name + obligation-type fields, the payment-vs-filing date
 *    routing in `formValuesToInput`, and the broader query-key
 *    invalidation set on success.
 *
 * Together: the dialog produces a complete obligation row (server
 * reads obligationType + jurisdiction for routing and filtering)
 * with the human-friendly creation UX (search + create-new +
 * notes for partner context).
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
  const obligationTypeLabels = useObligationTypeLabels()
  const [open, setOpen] = useState(false)
  const [createClientOpen, setCreateClientOpen] = useState(false)

  const formSchema = useMemo(() => createFormSchema(t), [t])
  const form = useForm({
    defaultValues: {
      ...defaultFormValues,
      clientId: defaultClientId ?? '',
    },
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }) => {
      createMutation.mutate({ obligations: [formValuesToInput(value)] })
    },
  })

  const clientId = useStore(form.store, (state) => state.values.clientId)
  const status = useStore(form.store, (state) => state.values.status)
  const obligationType = useStore(form.store, (state) => state.values.obligationType)
  const internalNotes = useStore(form.store, (state) => state.values.internalNotes)

  const createMutation = useMutation(
    orpc.obligations.createBatch.mutationOptions({
      onSuccess: (result) => {
        const obligation = result.obligations[0]
        // Invalidate every consumer that surfaces obligation data
        // so the new row appears immediately: dashboard counts,
        // queue facets, queue list, client filing plan list.
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        toast.success(t`Deadline added`, {
          description: t`${result.obligations.length} deadline created.`,
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
        form.reset({ ...defaultFormValues, clientId: defaultClientId ?? '' })
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

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            trigger ?? (
              <Button type="button" size="sm">
                <PlusIcon data-icon="inline-start" />
                {/* "Deadline" outside the dialog matches the CPA's
                    workflow voice — that's what they're adding. The
                    dialog title below switches to "Obligation" (the
                    data-model word) so the form fields and submit
                    button stay aligned with the schema + the rest of
                    the app's vocabulary. See the description for the
                    bridge. */}
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
                Capture a deadline the queue should track. Use this for K-1 dependencies and other
                rows the rule library doesn't generate automatically.
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
                      <span className="text-[11px] text-text-tertiary">
                        <Trans>Locked to this client because you opened from their page.</Trans>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCreateClientOpen(true)}
                        className="w-fit rounded-sm text-xs text-text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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
                        <Trans>Tax type</Trans>
                      </FieldLabel>
                      <Input
                        id="obligation-tax-type"
                        name={field.name}
                        value={field.state.value}
                        placeholder={t`1040, 1120-S, payroll…`}
                        aria-invalid={!field.state.meta.isValid}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                      <FieldError errors={fieldErrors(field.state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="baseDueDate">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="obligation-due-date">
                        <Trans>Base due date</Trans>
                      </FieldLabel>
                      <Input
                        id="obligation-due-date"
                        type="date"
                        name={field.name}
                        value={field.state.value}
                        aria-invalid={!field.state.meta.isValid}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
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
                        <Trans>Form</Trans>
                      </FieldLabel>
                      <Input
                        id="obligation-form-name"
                        name={field.name}
                        value={field.state.value}
                        placeholder={t`Optional`}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
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
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                      <FieldError errors={fieldErrors(field.state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="obligation-type">
                    <Trans>Deadline type</Trans>
                  </FieldLabel>
                  <Select
                    value={obligationType}
                    onValueChange={(value) => {
                      if (isObligationTypeValue(value)) {
                        form.setFieldValue('obligationType', value)
                      }
                    }}
                  >
                    <SelectTrigger id="obligation-type" className="w-full">
                      <SelectValue>{obligationTypeLabels[obligationType]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {OBLIGATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {obligationTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="obligation-status">
                    <Trans>Starting status</Trans>
                  </FieldLabel>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      if (
                        value === 'pending' ||
                        value === 'waiting_on_client' ||
                        value === 'blocked'
                      ) {
                        form.setFieldValue('status', value)
                      }
                    }}
                  >
                    <SelectTrigger id="obligation-status" className="w-full">
                      <SelectValue>
                        {status === 'waiting_on_client'
                          ? t`Waiting on client`
                          : status === 'blocked'
                            ? t`Blocked`
                            : t`Not started`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="pending">
                          <Trans>Not started</Trans>
                        </SelectItem>
                        <SelectItem value="waiting_on_client">
                          <Trans>Waiting on client</Trans>
                        </SelectItem>
                        <SelectItem value="blocked">
                          <Trans>Blocked (waiting on K-1 or another upstream)</Trans>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

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
                      placeholder={t`Partner name, K-1 source, or other context that doesn't fit the structured fields.`}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    <span className="text-[11px] text-text-tertiary">
                      <Trans>
                        Replaces the old K-1 dropdown — capture partner info or any free-form
                        context here.
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
              <Button type="submit" disabled={createMutation.isPending || clientId.length === 0}>
                {createMutation.isPending ? t`Adding…` : t`Add deadline`}
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
