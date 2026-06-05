import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2Icon, SendIcon } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'
import { formatTaxCode } from '@/lib/tax-codes'

interface ResponseDraft {
  itemId: string
  status: ReadinessResponseStatus
  note: string
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
  }))
}

function ReadinessStatusLabel({ status }: { status: ReadinessResponseStatus }) {
  if (status === 'not_yet') return <Trans>Not yet</Trans>
  if (status === 'need_help') return <Trans>Need help</Trans>
  return <Trans>Ready</Trans>
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
  // Local flag so the confirmation screen appears immediately on submit,
  // before the refetch reports the server-side `responded` status.
  const [submitted, setSubmitted] = useState(false)
  const portal = portalQuery.data

  if (portal && draft.token !== token) {
    setDraft({ token, responses: initialDraft(portal) })
  }

  const submitMutation = useMutation({
    mutationFn: submitReadinessPortal,
    onSuccess: () => {
      toast.success(t`Readiness response submitted`)
      setSubmitted(true)
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
        })),
      },
    })
  }

  return (
    <main className="min-h-full w-full bg-background-default p-4 text-text-primary md:p-8">
      <div className="mx-auto grid max-w-page-narrow gap-4">
        <header className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            <Trans>DueDateHQ readiness portal</Trans>
          </span>
          <h1 className="text-2xl font-semibold">
            {portal ? portal.clientName : <Trans>Readiness check</Trans>}
          </h1>
          {portal ? (
            <p className="text-sm text-text-secondary">
              {portal.firmName} · {portal.senderName} · {formatTaxCode(portal.taxType)} ·{' '}
              {formatDate(portal.currentDueDate)}
            </p>
          ) : null}
          {/* Expiry cue — without it a client can sit on a link until it
              silently dies. Hidden once already responded. */}
          {portal && !submitted && portal.status !== 'responded' ? (
            <p className="text-xs text-text-tertiary">
              <Trans>This link expires {formatDate(portal.expiresAt)}.</Trans>
            </p>
          ) : null}
        </header>

        {portalQuery.isLoading ? (
          // 2026-05-26 (Step 6 UX audit #167): bare text was the
          // only loading affordance. Public-portal clients waiting
          // 2+ seconds on a slow connection saw "Loading readiness
          // check…" with no motion signal — read as a static page.
          // Loader2 spin gives an unambiguous "system is working"
          // beat.
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-text-tertiary">
              <Loader2Icon className="size-5 animate-spin" aria-hidden />
              <Trans>Loading readiness check…</Trans>
            </CardContent>
          </Card>
        ) : portalQuery.isError || !portal ? (
          // 2026-05-26 (Step 6 UX audit #168): expired/revoked
          // link state left the client stranded with no path
          // forward. Added explicit recovery copy pointing back
          // to the CPA. The portal is the firm's contact surface
          // so "contact your CPA" is the canonical next step —
          // no app-side action makes sense from this dead-link
          // state.
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans>Link unavailable</Trans>
              </CardTitle>
              <CardDescription>
                <Trans>This readiness link is expired, revoked, or invalid.</Trans>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                <Trans>
                  Contact your CPA to request a new link. They can re-send the readiness check from
                  their workbench.
                </Trans>
              </p>
            </CardContent>
          </Card>
        ) : submitted || portal.status === 'responded' ? (
          // Terminal confirmation — the client knows the submit landed and
          // their CPA was notified, instead of being left on the form.
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans>Thanks — you're all set</Trans>
              </CardTitle>
              <CardDescription>
                <Trans>
                  {portal.senderName} at {portal.firmName} has been notified. You can close this
                  page.
                </Trans>
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
                      {/* Where to find the document — most useful to a
                          non-expert client, and previously dropped. */}
                      {item.sourceHint ? (
                        <p className="text-xs text-text-tertiary">{item.sourceHint}</p>
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
                        <SelectValue>
                          <ReadinessStatusLabel status={response?.status ?? 'ready'} />
                        </SelectValue>
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
              {/* 2026-05-26 (Step 6 UX audit #173): pending state
                  had no motion signal — the button just disabled.
                  Loader2 spin matches the cross-app submit-pending
                  pattern + the label switches to "Submitting…" so
                  the client knows something is happening. */}
              <Button
                onClick={submit}
                disabled={submitMutation.isPending}
                aria-busy={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <Loader2Icon
                    className="size-4 animate-spin"
                    aria-hidden
                    data-icon="inline-start"
                  />
                ) : (
                  <SendIcon data-icon="inline-start" />
                )}
                {submitMutation.isPending ? (
                  <Trans>Submitting…</Trans>
                ) : (
                  <Trans>Submit readiness response</Trans>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
