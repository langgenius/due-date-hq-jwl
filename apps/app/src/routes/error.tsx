import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { RefreshCwIcon, ServerOffIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

import { Button } from '@duedatehq/ui/components/ui/button'
import { AuthBrandAnchor, AuthHeading } from '@/features/auth/auth-chrome'
import { translateServerErrorCode } from '@/lib/i18n-error'
import { formatDocumentTitle } from '@/routes/route-summary'

function useErrorCopy(error: unknown): { title: string; message: string } {
  const { t } = useLingui()

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: t`Page not found`,
        message: t`We couldn't find what you were looking for. Head home and we'll get you back on track.`,
      }
    }

    const translated = translateServerErrorCode(error.statusText)
    return {
      title: t`Something went wrong on our end`,
      message: t`We hit a snag loading this page — it's on us, not you. Try again or head home. (${error.status} ${translated ?? error.statusText})`,
    }
  }

  if (error instanceof Error) {
    const translated = translateServerErrorCode(error.message)
    return {
      title: t`Something went wrong on our end`,
      message:
        translated ??
        t`We hit a snag loading this page — it's on us, not you. Try again or head home.`,
    }
  }

  return {
    title: t`Something went wrong on our end`,
    message: t`We hit a snag loading this page — it's on us, not you. Try again or head home.`,
  }
}

export function RouteErrorBoundary() {
  const error = useRouteError()
  const { title, message } = useErrorCopy(error)

  return (
    <>
      <title>{formatDocumentTitle(title)}</title>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background-subtle px-6 py-16">
        <div className="flex w-full max-w-[480px] flex-col items-center gap-8 text-center">
          {/* Brand anchor */}
          <AuthBrandAnchor tagline={false} />

          {/* Calm glyph — a soft stone well, not a red triangle */}
          <div
            aria-hidden
            className="flex size-16 items-center justify-center rounded-xl bg-background-well-warm"
          >
            <ServerOffIcon className="size-7 text-text-secondary" strokeWidth={1.5} />
          </div>

          {/* Blame-free heading + body */}
          <div className="flex flex-col gap-2.5">
            <AuthHeading>{title}</AuthHeading>
            <p className="text-sm font-normal leading-relaxed text-text-secondary">{message}</p>
          </div>

          {/* Action pair */}
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCwIcon className="size-4" aria-hidden />
              <Trans>Try again</Trans>
            </Button>
            <Button variant="secondary" nativeButton={false} render={<Link to="/" />}>
              <Trans>Go to Today</Trans>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
