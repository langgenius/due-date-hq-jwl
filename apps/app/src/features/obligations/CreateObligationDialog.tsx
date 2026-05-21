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

// The dialog targets v2 lifecycle states for manual creation. The
// status enum still carries legacy tokens (pending, in_progress, done,
// etc.) for back-compat; we restrict the picker to the meaningful
// "where do you start" options. The most common case — "I just created
// this row, nothing has happened yet" — defaults to `pending`.
const CREATE_STATUS_VALUES = ['pending', 'waiting_on_client', 'blocked'] as const
type CreateStatusValue = (typeof CREATE_STATUS_VALUES)[number]

type FormValues = {
  clientId: string
  taxType: string
  baseDueDate: string
  status: CreateStatusValue
  internalNotes: string
}

const defaultFormValues: FormValues = {
  clientId: '',
  taxType: '',
  baseDueDate: '',
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
    status: z.enum(CREATE_STATUS_VALUES),
    internalNotes: z
      .string()
      .trim()
      .max(5000, t`Notes must be 5000 characters or fewer`),
  })
}

function formValuesToInput(values: FormValues): ObligationCreateInput {
  return {
    clientId: values.clientId,
    taxType: values.taxType.trim(),
    baseDueDate: values.baseDueDate,
    status: values.status,
    generationSource: 'manual',
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
 * "+ Add obligation" entry-point dialog. Used by the Today page (no
 * `defaultClientId`) and the Client detail page (`defaultClientId` set,
 * which locks the combobox to that client).
 *
 * The required fields mirror the lean `ObligationCreateInputSchema`
 * surface: `clientId`, `taxType`, `baseDueDate`, and an opt-in
 * `status`. K-1 / partner context is captured as freeform text in the
 * "Internal notes" textarea — per the 2026-05-21 product review, the
 * old K-1 dropdown couldn't store partner info, so manual notes
 * replace it. The notes textarea exists on the form for capture; the
 * server-side `obligations.addReviewNote` endpoint is the eventual
 * persistence target and is tracked as follow-up — until it ships, the
 * dialog warns the user when they fill notes during a brand-new
 * obligation (see `onSubmit` toast hint).
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
  const internalNotes = useStore(form.store, (state) => state.values.internalNotes)

  const createMutation = useMutation(
    orpc.obligations.createBatch.mutationOptions({
      onSuccess: (result) => {
        const obligation = result.obligations[0]
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        toast.success(t`Obligation added`, {
          description: t`${result.obligations.length} obligation created.`,
        })
        if (internalNotes.trim().length > 0) {
          // Notes capture is intentionally local until the
          // `obligations.addReviewNote` endpoint ships. Surface that
          // expectation so the user knows the textarea content didn't
          // silently drop.
          toast.info(t`Internal notes drafted`, {
            description: t`Open the obligation drawer to save your notes; the create endpoint doesn't accept notes yet.`,
          })
        }
        form.reset({ ...defaultFormValues, clientId: defaultClientId ?? '' })
        setOpen(false)
        if (obligation) onCreated?.(obligation.id)
      },
      onError: (error) => {
        toast.error(t`Couldn't add obligation`, {
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
          description: rpcErrorMessage(error) ?? t`Please try again.`,
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
                <Trans>Add obligation</Trans>
              </Button>
            )
          }
        />
        <DialogContent className="w-[36rem] max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>
              <Trans>Add obligation</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Create an obligation manually. Use this for K-1 dependencies and other rows the rule
                library doesn't generate automatically.
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

              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="taxType">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="obligation-tax-type">
                        <Trans>Tax type / form</Trans>
                      </FieldLabel>
                      <Input
                        id="obligation-tax-type"
                        name={field.name}
                        value={field.state.value}
                        placeholder={t`e.g. 1065, 1040, CA-540`}
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
                {createMutation.isPending ? t`Adding…` : t`Add obligation`}
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
