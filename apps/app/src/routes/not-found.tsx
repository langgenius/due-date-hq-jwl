import { Link, useLocation, useNavigate } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowLeftIcon, HomeIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'

/**
 * In-shell 404. Mounted as the wildcard child of the protected
 * layout so an authenticated user hitting an unknown URL still
 * sees the sidebar + can recover without browser-back. Out-of-shell
 * 404s (e.g. truly broken auth state) still fall back to the root
 * `RouteErrorBoundary`.
 */
export function NotFoundRoute() {
  const { t } = useLingui()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <title>{t`Page not found`} | DueDateHQ</title>
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <p className="text-caption-xs font-medium tracking-[0.12em] text-text-tertiary uppercase">
            <Trans>404</Trans>
          </p>
          <h1 className="text-2xl leading-7 font-semibold text-text-primary">
            <Trans>Page not found</Trans>
          </h1>
          <p className="max-w-[560px] text-sm leading-5 text-text-secondary">
            <Trans>
              The page at <span className="font-mono text-text-primary">{pathname}</span> doesn't
              exist. The link may be out of date, or the page may have moved.
            </Trans>
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <Button render={<Link to="/" />}>
            <HomeIcon data-icon="inline-start" />
            <Trans>Go to Today</Trans>
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeftIcon data-icon="inline-start" />
            <Trans>Go back</Trans>
          </Button>
        </div>
      </div>
    </>
  )
}
