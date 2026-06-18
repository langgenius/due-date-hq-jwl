import { useMemo } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { CalendarRangeIcon, CheckIcon } from 'lucide-react'

import type { ClientPublic } from '@duedatehq/contracts'
import { Card, CardContent } from '@duedatehq/ui/components/ui/card'
import { cn } from '@duedatehq/ui/lib/utils'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'

/**
 * `ClientCompliancePosturePanel` — surfaces the client-level data the
 * schema already carries.
 *
 * The `ClientPublic` shape stores compliance-relevant identity
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

  // Legal entity (distinct from the tax `entityType`) — clean per-value labels;
  // only shown when set (it's nullable + often unset, so we don't clutter the
  // card with "Not on file" for a secondary field).
  const legalEntityLabel = useMemo<string | null>(() => {
    if (!client.legalEntity) return null
    const labels: Record<string, string> = {
      individual: t`Individual`,
      sole_proprietorship: t`Sole proprietorship`,
      single_member_llc: t`Single-member LLC`,
      multi_member_llc: t`Multi-member LLC`,
      partnership: t`Partnership`,
      corporation: t`Corporation`,
      trust: t`Trust`,
      estate: t`Estate`,
      nonprofit: t`Nonprofit`,
      foreign_entity: t`Foreign entity`,
      other: t`Other`,
    }
    return labels[client.legalEntity] ?? client.legalEntity
  }, [client.legalEntity, t])

  // Tax attributes — the real booleans that drive the deadline generator
  // (deadline-category-suggestions.ts). Surfaced as honest on/off chips so the
  // CPA can verify what this client's filings are computed from.
  const taxAttributes = [
    { label: t`Payroll`, on: client.hasPayroll },
    { label: t`Sales tax`, on: client.hasSalesTax },
    { label: t`1099 vendors`, on: client.has1099Vendors },
    { label: t`K-1 activity`, on: client.hasK1Activity },
    { label: t`Foreign accounts`, on: client.hasForeignAccounts },
  ]

  return (
    // The Card primitive: size="sm" gives px-4/py-4 + gap-4; radius="md"
    // matches the dense rounded-lg used across the in-page surfaces.
    // CardContent owns the inner padding so the inner grid doesn't need
    // its own `p-4`.
    <Card size="sm" radius="md" role="region" aria-label={t`Compliance posture`}>
      <CardContent>
        {/* Identity row — four facts the CPA copies most often.
            Stays at 2-col across all viewports: `lg:grid-cols-4`
            overflowed when the obligation drawer was open on
            /clients/[id] (the right-rail panel steals ~480px of body
            width, so the "lg" media query triggered at viewport-lg but
            rendered in a sub-lg container). 2-col is comfortable at
            every supported width and the labels still read in one
            scan. */}
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
          {legalEntityLabel ? (
            <IdentityCell label={t`Legal entity`} value={legalEntityLabel} />
          ) : null}
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
        {/* Tax attributes — the booleans that drive the deadline generator.
            Active = accent chip with a check; inactive = muted chip, so the
            CPA reads the client's filing-relevant profile at a glance. */}
        <div className="mt-3 flex flex-col gap-1.5 border-t border-divider-subtle pt-3">
          <CapsFieldLabel as="span">
            <Trans>Tax attributes</Trans>
          </CapsFieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {taxAttributes.map((attr) => (
              <span
                key={attr.label}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  attr.on
                    ? 'bg-state-accent-hover text-text-accent'
                    : 'bg-background-section text-text-muted',
                )}
              >
                {attr.on ? <CheckIcon aria-hidden className="size-3" /> : null}
                {attr.label}
                {/* On/off is otherwise color-only (+ an aria-hidden check) —
                    give AT the state in words (WCAG 1.4.1). */}
                <span className="sr-only">{attr.on ? t`: active` : t`: inactive`}</span>
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
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
      <CapsFieldLabel as="dt">{label}</CapsFieldLabel>
      <dd className="text-sm text-text-primary">{value}</dd>
      {footer}
    </div>
  )
}
