import { useMemo } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CalendarRangeIcon } from 'lucide-react'

import type { ClientPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `ClientCompliancePosturePanel` — surfaces the client-level data the
 * schema already carries but the page didn't render until now.
 *
 * Per the audit (`docs/Design/ux-audit-2026-05-21.md` Client detail
 * section) the `ClientPublic` shape stores compliance-relevant identity
 * fields (EIN value, tax-year type + fiscal year end, owner counts,
 * late-filing count, engagement date) that should be visible without
 * opening an edit form.
 *
 * This panel intentionally does not render the legacy activity booleans.
 * Deadlines are generated from active rules plus filing jurisdiction/profile
 * facts; showing static activity tags here made the source of deadlines
 * look ambiguous.
 *
 * Layout: two-column identity grid (EIN / tax year / owners /
 * client-since). Sits inside the Work tab in `ClientFactsWorkspace.tsx`.
 */

interface ClientCompliancePosturePanelProps {
  client: ClientPublic
}

function formatFiscalYearEnd(month: number, day: number): string {
  // Use a fixed non-leap year so Date won't roll over on Feb 29 etc.
  const date = new Date(Date.UTC(2023, month - 1, day))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatClientSince(iso: string): string {
  const parsed = Date.parse(iso)
  if (!Number.isFinite(parsed)) return iso
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(parsed))
}

export function ClientCompliancePosturePanel({ client }: ClientCompliancePosturePanelProps) {
  const { t } = useLingui()

  const taxYearLabel = useMemo(() => {
    if (client.taxYearType === 'fiscal') {
      if (client.fiscalYearEndMonth && client.fiscalYearEndDay) {
        const formatted = formatFiscalYearEnd(client.fiscalYearEndMonth, client.fiscalYearEndDay)
        return t`Fiscal · ends ${formatted}`
      }
      return t`Fiscal · year-end not set`
    }
    return t`Calendar year`
  }, [client.taxYearType, client.fiscalYearEndMonth, client.fiscalYearEndDay, t])

  const ownerLabel = useMemo(() => {
    const owners = client.ownerCount
    const equity = client.equityOwnerCount
    if (owners === null && equity === null) return t`Not on file`
    // Previous "4 equity" was ungrammatical — equity is an adjective
    // here, owners is the noun. Use complete noun phrases.
    if (owners === null) return t`${equity} equity owners`
    if (equity === null) return t`${owners} owners`
    if (owners === equity) return t`${owners} equity owners`
    return t`${owners} owners (${equity} equity)`
  }, [client.ownerCount, client.equityOwnerCount, t])

  const clientSinceLabel = useMemo(() => formatClientSince(client.createdAt), [client.createdAt])

  const lateFlag = client.lateFilingCountLast12mo

  return (
    <section
      aria-label={t`Compliance posture`}
      className="overflow-hidden rounded-md border border-divider-regular bg-background-default"
    >
      <div className="grid gap-4 p-4">
        {/* Identity row — four facts the CPA copies most often.
            2026-05-24: stayed at 2-col across all viewports. The
            previous `lg:grid-cols-4` overflowed when the obligation
            drawer was open on /clients/[id] (the right-rail panel
            steals ~480px of body width, so the "lg" media query was
            triggering at viewport-lg but rendering in a sub-lg
            container). 2-col is comfortable at every supported
            width and the labels still read in one scan. */}
        <dl className="grid gap-3 sm:grid-cols-2">
          <IdentityCell
            label={t`Federal EIN`}
            value={
              client.ein ? (
                <span className="tabular-nums">{client.ein}</span>
              ) : (
                <span className="italic text-text-tertiary">
                  <Trans>Not on file</Trans>
                </span>
              )
            }
          />
          <IdentityCell
            label={t`Tax year`}
            value={
              <span className="inline-flex items-center gap-1.5">
                <CalendarRangeIcon className="size-3.5 text-text-tertiary" aria-hidden />
                {taxYearLabel}
              </span>
            }
          />
          <IdentityCell label={t`Owners`} value={ownerLabel} />
          <IdentityCell
            label={t`Client since`}
            value={clientSinceLabel}
            // Late filings flag is a soft risk signal — surface it on
            // the same row only if it's nonzero so quiet clients stay
            // quiet.
            footer={
              lateFlag > 0 ? (
                <span
                  className={cn(
                    'mt-1 inline-flex items-center gap-1 text-xs',
                    lateFlag >= 3 ? 'text-text-destructive' : 'text-text-warning',
                  )}
                >
                  <Plural
                    value={lateFlag}
                    one="# late filing in 12mo"
                    other="# late filings in 12mo"
                  />
                </span>
              ) : null
            }
          />
        </dl>
      </div>
    </section>
  )
}

function IdentityCell({
  label,
  value,
  footer,
}: {
  label: string
  value: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
        {label}
      </dt>
      <dd className="text-sm text-text-primary">{value}</dd>
      {footer}
    </div>
  )
}
