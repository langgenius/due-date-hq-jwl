import { useMemo } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  BanknoteIcon,
  CalendarRangeIcon,
  CheckIcon,
  FileSpreadsheetIcon,
  GlobeIcon,
  Link2Icon,
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
    // Previous "4 equity" was ungrammatical — equity is an adjective
    // here, owners is the noun. Use complete noun phrases.
    if (owners === null) return t`${equity} equity owners`
    if (equity === null) return t`${owners} owners`
    if (owners === equity) return t`${owners} equity owners`
    return t`${owners} owners (${equity} equity)`
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
    // 2026-05-24: dropped the panel's own h3 + uppercase eyebrow
    // header. The wrapping <TabSection> on the Client info tab now
    // owns the section heading + subtitle, so an inner header here
    // doubled it. The "{N} of 5 active" count is preserved as a
    // small inline counter chip floating on the Activity scope
    // sub-heading below — it stays useful as a sub-section signal,
    // it just doesn't get an h3 of its own anymore.
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

        {/* Activity scope — the five compliance booleans. Active
          renders as a tone-coded badge with icon; inactive as a muted
          chip with em-dash. Showing both states so the CPA can
          *verify* the schema rather than just see what's on. The
          "N of 5 active" count was the panel's old header counter;
          it moved here to sit next to the sub-section label after
          the outer h3 retired in favour of TabSection. */}
        <div className="flex flex-col gap-2 border-t border-divider-subtle pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {/* 2026-05-24 (clarify — critique): "Activity scope" was
                coined jargon — first-timer CPAs read the chips below
                (Payroll / 1099 / K-1 etc) faster than the section
                label. "Filing activity" is the verbal form they
                actually use ("does this client have payroll filing
                activity?"). */}
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-text-tertiary">
              <Trans>Filing activity</Trans>
            </span>
            <span className="text-xs text-text-tertiary">
              <Trans>{activeCount} of 5 active</Trans>
            </span>
          </div>
          <ul className="flex flex-wrap gap-2">
            {activityChips.map((chip) => (
              <li key={chip.key}>
                <ActivityChipPill chip={chip} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-tertiary">
            <Trans>
              These flags drive what deadlines get generated for this client. Active flags need a
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
  // Inactive chip: just the label, no leading icon. The previous
  // `MinusIcon` read as a "remove" action because the chips look
  // tappable, but they're maintainer-only status indicators (see the
  // help text below the chip strip). Plain text with muted color +
  // outline border + no icon reads as "this is off / not applicable"
  // without implying an action.
  return (
    <Badge variant="outline" className="gap-1.5 text-xs text-text-tertiary" title={chip.hint}>
      <span>{chip.label}</span>
    </Badge>
  )
}
