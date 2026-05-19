import { Link } from 'react-router'
import { Trans } from '@lingui/react/macro'
import { ChevronLeftIcon } from 'lucide-react'

/**
 * Small "← Settings" breadcrumb link for the workspace-config sub-pages
 * (Audit log, Notifications, Reminders, Members, etc.) that live at flat
 * top-level URLs (`/audit`, `/notifications`, `/reminders`) for legacy
 * routing reasons but are reachable from the Settings hub. Without this
 * link, the user lands on those pages with no obvious way back to the
 * Settings index.
 *
 * Place this at the top of each settings sub-page, above the H1.
 */
export function SettingsBackLink() {
  return (
    <Link
      to="/settings"
      className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary outline-none hover:text-text-primary focus-visible:rounded focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      <ChevronLeftIcon aria-hidden className="size-3.5" />
      <Trans>Back to Settings</Trans>
    </Link>
  )
}
