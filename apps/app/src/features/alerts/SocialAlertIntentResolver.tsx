import { useQuery } from '@tanstack/react-query'
import { Trans } from '@lingui/react/macro'
import { CircleAlertIcon, Loader2Icon } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router'

import { orpc } from '@/lib/rpc'

import { socialAlertRefFromPath } from './social-alert-intent'

/**
 * Resolves the global social-post ref only after protected routing established
 * the current firm. A successful result replaces `ref` with that firm's own
 * `alert` id, so the existing drawer/deep-link behavior remains authoritative.
 */
export function SocialAlertIntentResolver() {
  const [searchParams] = useSearchParams()
  const ref = socialAlertRefFromPath(`/alerts?${searchParams.toString()}`)
  const resolution = useQuery({
    ...orpc.pulse.resolveSocialAlert.queryOptions({ input: { ref: ref ?? '' } }),
    enabled: ref !== null,
    retry: false,
  })

  if (!ref) return null

  if (resolution.data) {
    const next = new URLSearchParams(searchParams)
    next.delete('ref')
    next.set('alert', resolution.data.alertId)
    return <Navigate to={`/alerts?${next.toString()}`} replace />
  }

  if (resolution.isError) {
    return (
      <div
        role="alert"
        className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-divider-subtle bg-state-warning-hover px-3 py-2 text-sm text-text-secondary md:mx-8"
      >
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
        <Trans>
          This alert link is no longer available. You can still review current alerts below.
        </Trans>
      </div>
    )
  }

  return (
    <p
      role="status"
      className="mx-6 mt-4 flex items-center gap-2 text-sm text-text-tertiary md:mx-8"
    >
      <Loader2Icon className="size-4 animate-spin" aria-hidden />
      <Trans>Opening the source-backed alert…</Trans>
    </p>
  )
}
