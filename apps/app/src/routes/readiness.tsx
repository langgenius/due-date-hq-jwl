import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useMutation, useQuery } from '@tanstack/react-query'
import { SendIcon } from 'lucide-react'
import { useParams } from 'react-router'
import { toast } from 'sonner'

import {
  ReadinessPublicPortalSchema,
  ReadinessPublicSubmitOutputSchema,
  type ReadinessPublicPortal,
  type ReadinessPublicSubmitOutput,
  type ReadinessPublicSubmitInput,
  type ReadinessResponseStatus,
} from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@duedatehq/ui/components/ui/select'
import { Separator } from '@duedatehq/ui/components/ui/separator'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { IsoDatePicker } from '@/components/primitives/iso-date-picker'
import { formatDate } from '@/lib/utils'

interface ResponseDraft {
  itemId: string
  status: ReadinessResponseStatus
  note: string
  etaDate: string
}

async function fetchReadinessPortal(token: string): Promise<ReadinessPublicPortal> {
  const response = await fetch(`/api/readiness/${encodeURIComponent(token)}`)
  if (!response.ok) throw new Error('Readiness link is not available.')
  const data: unknown = await response.json()
  return ReadinessPublicPortalSchema.parse(data)
}

async function submitReadinessPortal(input: {
  token: string
  body: ReadinessPublicSubmitInput
}): Promise<ReadinessPublicSubmitOutput> {
  const response = await fetch(`/api/readiness/${encodeURIComponent(input.token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.body),
  })
  if (!response.ok) throw new Error("Readiness response couldn't be submitted.")
  const data: unknown = await response.json()
  return ReadinessPublicSubmitOutputSchema.parse(data)
}

function initialDraft(data: ReadinessPublicPortal): ResponseDraft[] {
  return data.items.map((item) => ({
    itemId: item.id,
    status: item.responseStatus ?? 'ready',
    note: item.note ?? '',
    etaDate: item.etaDate ?? '',
  }))
}

export function ReadinessPortalRoute() {
  const { t } = useLingui()
  const { token = '' } = useParams()
  const portalQuery = useQuery({
    queryKey: ['readiness-portal', token],
    queryFn: () => fetchReadinessPortal(token),
    enabled: token.length > 0,
    retry: false,
  })
  const [draft, setDraft] = useState<{ token: string; responses: ResponseDraft[] }>({
    token: '',
    responses: [],
  })
  const portal = portalQuery.data

  if (portal && draft.token !== token) {
    setDraft({ token, responses: initialDraft(portal) })
  }

  const submitMutation = useMutation({
    mutationFn: submitReadinessPortal,
    onSuccess: () => {
      toast.success(t`Readiness response submitted`)
      void portalQuery.refetch()
    },
    onError: () => {
      toast.error(t`Couldn't submit readiness response`)
    },
  })

  function updateResponse(itemId: string, patch: Partial<ResponseDraft>) {
    setDraft((current) => ({
      token,
      responses: current.responses.map((response) =>
        response.itemId === itemId ? Object.assign({}, response, patch) : response,
      ),
    }))
  }

  function submit() {
    submitMutation.mutate({
      token,
      body: {
        responses: draft.responses.map((response) => ({
          itemId: response.itemId,
          status: response.status,
          ...(response.note.trim() ? { note: response.note.trim() } : {}),
          ...(response.etaDate ? { etaDate: response.etaDate } : {}),
        })),
      },
    })
  }

  return (
    <main className="min-h-full w-full bg-background-default p-4 text-text-primary md:p-8">
      <div className="mx-auto grid max-w-3xl gap-4">
        <header className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>DueDateHQ readiness portal</Trans>
          </span>
          <h1 className="text-2xl font-semibold">
            {portal ? portal.clientName : <Trans>Readiness check</Trans>}
          </h1>
          {portal ? (
            <p className="text-sm text-text-secondary">
              {portal.firmName} · {portal.taxType} · {formatDate(portal.currentDueDate)}
            </p>
          ) : null}
        </header>

        {portalQuery.isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-text-tertiary">
              <Trans>Loading readiness check…</Trans>
            </CardContent>
          </Card>
        ) : portalQuery.isError || !portal ? (
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans>Link unavailable</Trans>
              </CardTitle>
              <CardDescription>
                <Trans>This readiness link is expired, revoked, or invalid.</Trans>
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>
                  <Trans>Checklist</Trans>
                </CardTitle>
                <Badge variant="outline">{portal.status}</Badge>
              </div>
              <CardDescription>
                <Trans>Answer each item so your CPA can confirm filing readiness.</Trans>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {portal.items.map((item) => {
                const response = draft.responses.find((candidate) => candidate.itemId === item.id)
                return (
                  <section key={item.id} className="grid gap-3 rounded-lg border p-3">
                    <div className="grid gap-1">
                      <h2 className="font-medium">{item.label}</h2>
                      {item.description ? (
                        <p className="text-sm text-text-secondary">{item.description}</p>
                      ) : null}
                    </div>
                    <Select
                      value={response?.status ?? 'ready'}
                      onValueChange={(value) => {
                        if (value !== 'ready' && value !== 'not_yet' && value !== 'need_help') {
                          return
                        }
                        updateResponse(item.id, { status: value })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ready">
                          <Trans>Ready</Trans>
                        </SelectItem>
                        <SelectItem value="not_yet">
                          <Trans>Not yet</Trans>
                        </SelectItem>
                        <SelectItem value="need_help">
                          <Trans>Need help</Trans>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <IsoDatePicker
                      ariaLabel={t`ETA`}
                      value={response?.etaDate ?? ''}
                      onValueChange={(etaDate) => updateResponse(item.id, { etaDate })}
                    />
                    <Textarea
                      aria-label={t`Note`}
                      placeholder={t`Optional note`}
                      value={response?.note ?? ''}
                      onChange={(event) => updateResponse(item.id, { note: event.target.value })}
                    />
                  </section>
                )
              })}
              <Separator />
              <Button onClick={submit} disabled={submitMutation.isPending}>
                <SendIcon data-icon="inline-start" />
                <Trans>Submit readiness response</Trans>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
