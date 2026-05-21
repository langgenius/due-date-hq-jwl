import { useState, type FormEvent } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2Icon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import type { ObligationCreateInput } from '@duedatehq/contracts'
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

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

const UNSELECTED_CLIENT_VALUE = '__select_client__'
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const OBLIGATION_TYPES = [
  'filing',
  'payment',
  'deposit',
  'information',
  'client_action',
  'internal_review',
] as const satisfies readonly NonNullable<ObligationCreateInput['obligationType']>[]

type ObligationTypeValue = (typeof OBLIGATION_TYPES)[number]

type CreateObligationDialogProps = {
  defaultClientId?: string
}

type ManualObligationFormValues = {
  clientId: string
  taxType: string
  baseDueDate: string
  jurisdiction: string
  formName: string
  obligationType: ObligationTypeValue
}

function defaultFormValues(defaultClientId?: string): ManualObligationFormValues {
  return {
    clientId: defaultClientId ?? '',
    taxType: '',
    baseDueDate: '',
    jurisdiction: '',
    formName: '',
    obligationType: 'filing',
  }
}

function nullableText(value: string): string | null {
  const next = value.trim()
  return next ? next : null
}

function isObligationTypeValue(value: string | null): value is ObligationTypeValue {
  return OBLIGATION_TYPES.some((type) => type === value)
}

function obligationTypeLabel(
  type: ObligationTypeValue,
  t: ReturnType<typeof useLingui>['t'],
): string {
  switch (type) {
    case 'payment':
      return t`Payment`
    case 'deposit':
      return t`Deposit`
    case 'information':
      return t`Information return`
    case 'client_action':
      return t`Client action`
    case 'internal_review':
      return t`Internal review`
    case 'filing':
      return t`Filing`
  }
  return type
}

function buildManualObligationInput(values: ManualObligationFormValues): ObligationCreateInput {
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
    status: 'pending',
    ...(isPaymentDeadline ? { paymentDueDate: dueDate } : { filingDueDate: dueDate }),
  }
}

export function CreateObligationDialog({ defaultClientId }: CreateObligationDialogProps) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [values, setValues] = useState<ManualObligationFormValues>(() =>
    defaultFormValues(defaultClientId),
  )
  const needsClientSelection = !defaultClientId
  const clientsQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: { limit: 200 } }),
    enabled: open && needsClientSelection,
  })
  const clients = clientsQuery.data ?? []
  const selectedClient = clients.find((client) => client.id === values.clientId) ?? null
  const createMutation = useMutation(
    orpc.obligations.createBatch.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        toast.success(t`Deadline added`, {
          description: t`${result.obligations.length} obligation created.`,
        })
        setSubmitted(false)
        setValues(defaultFormValues(defaultClientId))
        setOpen(false)
      },
      onError: (err) => {
        toast.error(t`Couldn't add deadline`, {
          description: rpcErrorMessage(err) ?? t`Please try again.`,
        })
      },
    }),
  )

  const clientError =
    submitted && needsClientSelection && !values.clientId ? t`Client is required` : null
  const taxTypeError = submitted && !values.taxType.trim() ? t`Tax type is required` : null
  const dueDateError =
    submitted && !ISO_DATE_RE.test(values.baseDueDate) ? t`Due date is required` : null

  function resetDialog(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSubmitted(false)
      setValues(defaultFormValues(defaultClientId))
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    setSubmitted(true)

    const nextIsInvalid =
      !values.clientId || !values.taxType.trim() || !ISO_DATE_RE.test(values.baseDueDate)
    if (nextIsInvalid) return

    createMutation.mutate({
      obligations: [buildManualObligationInput(values)],
    })
  }

  return (
    <Dialog open={open} onOpenChange={resetDialog}>
      <DialogTrigger render={<Button type="button" size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        <Trans>Add deadline</Trans>
      </DialogTrigger>
      <DialogContent className="w-[560px] max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>
            <Trans>Add manual deadline</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>Create one obligation for a known filing, payment, or review date.</Trans>
          </DialogDescription>
        </DialogHeader>

        <form className="contents" onSubmit={submitForm}>
          <FieldGroup className="gap-4">
            {needsClientSelection ? (
              <Field data-invalid={Boolean(clientError)}>
                <FieldLabel htmlFor="manual-obligation-client">
                  <Trans>Client</Trans>
                </FieldLabel>
                <Select
                  value={values.clientId || UNSELECTED_CLIENT_VALUE}
                  onValueChange={(value) => {
                    setValues((current) => ({
                      ...current,
                      clientId: value && value !== UNSELECTED_CLIENT_VALUE ? value : '',
                    }))
                  }}
                  disabled={clientsQuery.isLoading || clientsQuery.isError}
                >
                  <SelectTrigger id="manual-obligation-client" className="w-full">
                    <SelectValue>
                      {selectedClient?.name ??
                        (clientsQuery.isLoading ? t`Loading clients...` : t`Select client`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" className="max-h-80 overflow-y-auto">
                    <SelectGroup>
                      <SelectItem value={UNSELECTED_CLIENT_VALUE}>
                        <Trans>Select client</Trans>
                      </SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {clientError ? <FieldError errors={[{ message: clientError }]} /> : null}
              </Field>
            ) : null}

            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <Field data-invalid={Boolean(taxTypeError)}>
                <FieldLabel htmlFor="manual-obligation-tax-type">
                  <Trans>Tax type</Trans>
                </FieldLabel>
                <Input
                  id="manual-obligation-tax-type"
                  value={values.taxType}
                  placeholder={t`1040, 1120-S, payroll...`}
                  aria-invalid={Boolean(taxTypeError)}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, taxType: event.target.value }))
                  }}
                />
                {taxTypeError ? <FieldError errors={[{ message: taxTypeError }]} /> : null}
              </Field>

              <Field data-invalid={Boolean(dueDateError)}>
                <FieldLabel htmlFor="manual-obligation-due-date">
                  <Trans>Due date</Trans>
                </FieldLabel>
                <Input
                  id="manual-obligation-due-date"
                  value={values.baseDueDate}
                  type="date"
                  aria-invalid={Boolean(dueDateError)}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, baseDueDate: event.target.value }))
                  }}
                />
                {dueDateError ? <FieldError errors={[{ message: dueDateError }]} /> : null}
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="manual-obligation-form-name">
                  <Trans>Form</Trans>
                </FieldLabel>
                <Input
                  id="manual-obligation-form-name"
                  value={values.formName}
                  placeholder={t`Optional`}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, formName: event.target.value }))
                  }}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="manual-obligation-jurisdiction">
                  <Trans>Jurisdiction</Trans>
                </FieldLabel>
                <Input
                  id="manual-obligation-jurisdiction"
                  value={values.jurisdiction}
                  placeholder={t`Federal, CA, NY...`}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, jurisdiction: event.target.value }))
                  }}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="manual-obligation-type">
                <Trans>Deadline type</Trans>
              </FieldLabel>
              <Select
                value={values.obligationType}
                onValueChange={(value) => {
                  if (isObligationTypeValue(value)) {
                    setValues((current) => ({
                      ...current,
                      obligationType: value,
                    }))
                  }
                }}
              >
                <SelectTrigger id="manual-obligation-type" className="w-full">
                  <SelectValue>{obligationTypeLabel(values.obligationType, t)}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {OBLIGATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {obligationTypeLabel(type, t)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => resetDialog(false)}
              disabled={createMutation.isPending}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2Icon data-icon="inline-start" /> : null}
              <Trans>Add deadline</Trans>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
