import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { DownloadIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'

import { cn } from '@duedatehq/ui/lib/utils'

import { useAlertDrawer } from '@/features/alerts/DrawerProvider'
import { AlertHistoryView } from '@/features/alerts/AlertHistoryView'
import { useAlertsHistoryQueryOptions } from '@/features/alerts/api'
import { RulesPageShell } from '@/features/rules/rules-console-primitives'

/**
 * /alerts/history — the closed-alerts archive.
 *
 * 2026-06-08 (Pencil hFOEo `zROUm PageHeader`): the route header now
 * mirrors the design — an `Alerts › Alert history` breadcrumb, the title
 * carrying the rolling 90-day date-range context (`· Mar 9 – Jun 7, 2026`),
 * a `N handled alerts · last 90 days` meta line, and a single **Export**
 * action (CSV of the loaded handled alerts). The earlier `Active alerts` +
 * `Sources` cluster is dropped: the back-to-active path is already the
 * breadcrumb, and the design's header carries only Export.
 *
 * The handled count comes from the same history query the view runs
 * (React Query dedupes on the shared key), so the header and table never
 * disagree.
 */
const HISTORY_LIMIT = 50
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

// CSV field escaping (wrap in quotes, double any embedded quote). Module-scoped
// so it isn't re-created per render and reads identically across exports.
const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`

export function AlertsHistoryRoute() {
  const { t } = useLingui()
  const { open: panelOpen } = useAlertDrawer()

  const historyQuery = useQuery(useAlertsHistoryQueryOptions(HISTORY_LIMIT))
  const alerts = historyQuery.data?.alerts ?? []
  const handledCount = alerts.length

  // Rolling 90-day window label (Pencil `· Mar 9 – Jun 7, 2026`).
  const now = new Date()
  const start = new Date(now.getTime() - NINETY_DAYS_MS)
  const startLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(start)
  const endLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(now)
  const rangeLabel = `${startLabel} – ${endLabel}`

  // Export — CSV of the loaded handled alerts. Real download (no dead
  // control): one row per alert with the table's columns + provenance.
  const handleExport = () => {
    if (alerts.length === 0) return
    const header = ['Date', 'Jurisdiction', 'Alert', 'Change', 'Source', 'Clients', 'Status']
    const rows = alerts.map((alert) =>
      [
        new Date(alert.publishedAt).toISOString().slice(0, 10),
        alert.jurisdiction,
        alert.title,
        alert.changeKind,
        alert.source,
        String(alert.matchedCount + alert.needsReviewCount),
        alert.status,
      ]
        .map(csvEscape)
        .join(','),
    )
    const csv = [header.map(csvEscape).join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `alert-history-${now.toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <RulesPageShell
      title={
        <span className="inline-flex flex-wrap items-baseline gap-2">
          <Trans>Alert history</Trans>
          <span className="text-base font-medium text-text-tertiary">· {rangeLabel}</span>
        </span>
      }
      description={
        handledCount > 0
          ? t`${handledCount} handled alerts · last 90 days`
          : t`Handled alerts · last 90 days`
      }
      // 2026-05-26 (Yuqi /alerts seventh pass): same viewport-lock as
      // /alerts so the history list scrolls inside its own column.
      lockViewport
      // 2026-06-04 round 81 (Yuqi "page width should be unified"): `wide`
      // so the archive caps at the same width as /alerts active.
      wide
      contentClassName={cn(
        // 2026-06-09 (Yuqi "Alert history page is having a different width"):
        // match the active /alerts shell exactly — `md:px-8` (was md:px-16,
        // which left the archive 32px narrower on each side).
        'gap-8 md:px-8 transition-[padding-bottom] duration-300 ease-apple motion-reduce:transition-none',
        panelOpen && '!pb-0 md:!pb-0',
      )}
      breadcrumbs={[{ label: t`Alerts`, to: '/alerts' }]}
      actions={
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={handledCount === 0}
          aria-label={t`Export handled alerts as CSV`}
        >
          <DownloadIcon data-icon="inline-start" />
          <Trans>Export</Trans>
        </Button>
      }
    >
      <AlertHistoryView />
    </RulesPageShell>
  )
}
