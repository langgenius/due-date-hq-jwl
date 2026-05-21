import { useMemo } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  BanknoteIcon,
  CalendarRangeIcon,
  CheckIcon,
  FileSpreadsheetIcon,
  GlobeIcon,
  Link2Icon,
  MinusIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import type { ClientPublic } from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `ClientCompliancePosturePanel` — surfaces the client-level data the
 * schema already carries but the page didn't render until now.
 *
 * Per the audit (`docs/Design/ux-audit-2026-05-21.md` Client detail
 * section) the `ClientPublic` shape stores nine compliance-relevant
 * fields (EIN value, tax-year type + fiscal year end, the five
 * filing-activity booleans, owner counts, late-filing count,
 * engagement date) — and the detail page surfaced **none** of them
 * directly. The booleans drive obligation generation server-side, so
 * the CPA had no way to verify them.
 *
 * This panel renders all of it as a read-only scan. Edit affordances
 * for the five booleans are deferred — there is no client-update
 * mutation that covers them today; only `updateRiskProfile`,
 * `replaceFilingProfiles`, and `updateTaxYearProfile` exist. When the
 * contract grows a generic `clients.update` (or per-flag mutation),
 * each chip should become a toggle. See
 * `docs/Design/client-page-information-architecture.md` for the
 * follow-up note.
 *
 * Layout: two-column identity grid up top (EIN / tax year / owners /
 * client-since), then the five activity-scope chips in their own row.
 * Sits inside the Work tab in `ClientFactsWorkspace.tsx`.
 */

interface ClientCompliancePosturePanelProps {
  client: ClientPublic
}

interface ActivityChip {
  key: string
  label: string
  active: boolean
  icon: LucideIcon
  hint: string
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
    if (owners === null) return t`${equity} equity`
    if (equity === null) return t`${owners} owners`
    if (owners === equity) return t`${owners} owners`
    return t`${owners} owners · ${equity} equity`
  }, [client.ownerCount, client.equityOwnerCount, t])

  const clientSinceLabel = useMemo(() => formatClientSince(client.createdAt), [client.createdAt])

  // The five filing-activity flags. Each has a one-line hint so the
  // CPA knows what work is implied by the chip being active.
  const activityChips: ActivityChip[] = useMemo(
    () => [
      {
        key: 'foreign',
        label: t`Foreign accounts`,
        active: client.hasForeignAccounts,
        icon: GlobeIcon,
        hint: t`FBAR / FinCEN 114 + Form 8938 may apply`,
      },
      {
        key: 'payroll',
        label: t`Payroll`,
        active: client.hasPayroll,
        icon: UsersIcon,
        hint: t`941 quarterly · 940 annual · W-2 / W-3 year-end`,
      },
      {
        key: 'salesTax',
        label: t`Sales / use tax`,
        active: client.hasSalesTax,
        icon: BanknoteIcon,
        hint: t`State sales-tax filings on the registered states`,
      },
      {
        key: 'vendors1099',
        label: t`1099 vendors`,
        active: client.has1099Vendors,
        icon: FileSpreadsheetIcon,
        hint: t`1099-NEC / 1099-MISC due January 31`,
      },
      {
        key: 'k1',
        label: t`K-1 activity`,
        active: client.hasK1Activity,
        icon: Link2Icon,
        hint: t`Receives or issues K-1s — partnership/S-corp dependencies`,
      },
    ],
    [
      client.hasForeignAccounts,
      client.hasPayroll,
      client.hasSalesTax,
      client.has1099Vendors,
      client.hasK1Activity,
      t,
    ],
  )

  const activeCount = activityChips.filter((chip) => chip.active).length
  const lateFlag = client.lateFilingCountLast12mo

  return (
    <section
      aria-label={t`Compliance posture`}
      className="overflow-hidden rounded-md border border-divider-regular bg-background-default"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-divider-subtle px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
          <Trans>Compliance posture</Trans>
        </h3>
        <span className="text-xs text-text-tertiary">
          <Trans>{activeCount} of 5 active</Trans>
        </span>
      </header>

      <div className="grid gap-4 p-4">
        {/* Identity row — four facts the CPA copies most often.
          Renders as a 2x2 grid below md and 4-up above. */}
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <IdentityCell
            label={t`Federal EIN`}
            value={
              client.ein ? (
                <span className="font-mono tabular-nums">{client.ein}</span>
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
                  <Trans>{lateFlag} late filings in 12mo</Trans>
                </span>
              ) : null
            }
          />
        </dl>

        {/* Activity scope — the five compliance booleans. Active
          renders as a tone-coded badge with icon; inactive as a muted
          chip with em-dash. Showing both states so the CPA can
          *verify* the schema rather than just see what's on. */}
        <div className="flex flex-col gap-2 border-t border-divider-subtle pt-4">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
            <Trans>Activity scope</Trans>
          </span>
          <ul className="flex flex-wrap gap-2">
            {activityChips.map((chip) => (
              <li key={chip.key}>
                <ActivityChipPill chip={chip} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-tertiary">
            <Trans>
              These flags drive what obligations get generated for this client. Active flags need a
              maintainer's edit flow — see the audit doc for follow-up.
            </Trans>
          </p>
        </div>
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

function ActivityChipPill({ chip }: { chip: ActivityChip }) {
  if (chip.active) {
    return (
      <Badge variant="info" className="gap-1.5 text-xs" title={chip.hint}>
        <chip.icon className="size-3.5" aria-hidden />
        <span>{chip.label}</span>
        <CheckIcon className="size-3.5" aria-hidden />
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1.5 text-xs text-text-tertiary" title={chip.hint}>
      <MinusIcon className="size-3.5" aria-hidden />
      <span>{chip.label}</span>
    </Badge>
  )
}
