import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowLeftIcon, DatabaseIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@duedatehq/ui/components/ui/button'

import { cn } from '@duedatehq/ui/lib/utils'

import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import { AlertsListPage } from '@/features/alerts/AlertsListPage'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

/**
 * /alerts/history — the closed-alerts archive.
 *
 * 2026-05-25 (Yuqi Alerts #2 — sub-page sweep): history was
 * previously a soft-filter on /alerts ("View history" button
 * just pre-set the status filter to `applied`). Yuqi asked for it
 * to be a dedicated sub-page or sidebar entry. This route mounts
 * `AlertsListPage` with `historyMode={true}` so the same list
 * code paths are reused.
 *
 * 2026-05-26 (Yuqi /alerts #11): the route had no obvious
 * back-out — clicking "Archive" / "Alert history" took the CPA
 * here and they had to navigate via the sidebar to return. Added
 * a breadcrumb (`Alerts › Alert history`) so the parent path is
 * one click away in the page header.
 * 2026-05-26 (Yuqi /alerts #10): title renamed `Alerts
 * archive` → `Alert history` to match the new button label.
 */
export function AlertsHistoryRoute() {
  const { t } = useLingui()
  const { open: panelOpen } = useAlertDrawer()
  return (
    <RulesPageShell
      title={t`Alert history`}
      // 2026-05-26 (Yuqi /alerts seventh pass): same
      // viewport-lock as /alerts so the history list scrolls
      // inside its own column instead of pushing a page-level
      // scrollbar.
      lockViewport
      // 2026-06-04 round 81 (Yuqi "the page width should be
      // unified"): `wide` so the history route caps at
      // `max-w-page-expanded` (1440) — same as /alerts active.
      // Without it the history page used the default 1100 cap,
      // visibly narrower than /alerts even though it's the same
      // surface in archive mode.
      wide
      contentClassName={cn(
        'gap-8 md:px-16 transition-[padding-bottom] duration-300 ease-apple motion-reduce:transition-none',
        panelOpen && '!pb-0 md:!pb-0',
      )}
      breadcrumbs={[{ label: t`Alerts`, to: '/alerts' }]}
      // 2026-06-04 round 82 (Yuqi "Alert history actions are not
      // correct"): the actions cluster was empty — no Sources, no
      // back-to-active path beyond the breadcrumb. /alerts cluster
      // is (My morning sweep / Sources / Alert history); the
      // history mirror should be:
      //   • Back to active alerts (canonical return path)
      //   • Sources (still useful to inspect from history)
      // The "Alert history" self-link is intentionally omitted —
      // we ARE on it. "My morning sweep" is also omitted since
      // that's a triage tool for active alerts, not handled ones.
      actions={
        <>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link to="/alerts" />}
            aria-label={t`Back to active alerts`}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            <Trans>Active alerts</Trans>
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link to="/rules/sources" />}
            aria-label={t`Manage Alert sources`}
          >
            <DatabaseIcon data-icon="inline-start" />
            <Trans>Sources</Trans>
          </Button>
        </>
      }
    >
      <AlertsListPage embedded historyMode />
    </RulesPageShell>
  )
}
