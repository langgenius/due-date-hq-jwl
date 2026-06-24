import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { TriangleAlertIcon } from 'lucide-react'
import { Trans, useLingui } from '@lingui/react/macro'

import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { AuthBrandAnchor } from '@/features/auth/auth-chrome'
import { translateServerErrorCode } from '@/lib/i18n-error'
import { formatDocumentTitle } from '@/routes/route-summary'

function useErrorCopy(error: unknown): { title: string; message: string } {
  const { t } = useLingui()

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: t`Page not found`,
        message: t`We couldn't find what you were looking for.`,
      }
    }

    const translated = translateServerErrorCode(error.statusText)
    return {
      title: t`Something went wrong`,
      message: t`We couldn't load this page. Try again, or head back home. (${error.status} ${translated ?? error.statusText})`,
    }
  }

  if (error instanceof Error) {
    const translated = translateServerErrorCode(error.message)
    return {
      title: t`Something went wrong`,
      message: translated ?? t`We couldn't load this page. Try again, or head back home.`,
    }
  }

  return {
    title: t`Something went wrong`,
    message: t`We couldn't load this page. Try again, or head back home.`,
  }
}

export function RouteErrorBoundary() {
  const error = useRouteError()
  const { title, message } = useErrorCopy(error)

  return (
    <>
      <title>{formatDocumentTitle(title)}</title>
      <div className="flex min-h-screen items-center justify-center bg-background-subtle p-6">
        <div className="flex w-full max-w-[560px] flex-col gap-6">
          <AuthBrandAnchor tagline={false} />
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>
              <Trans>Try again</Trans>
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link to="/" />}>
              <Trans>Return home</Trans>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
