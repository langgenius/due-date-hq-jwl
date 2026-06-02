import { AlertCircleIcon, UploadIcon } from 'lucide-react'
import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { parseAsArrayOf, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useNavigate } from 'react-router'

import type {
  DashboardDueBucket,
  DashboardEvidenceFilter,
  DashboardLoadInput,
} from '@duedatehq/contracts'
import { DASHBOARD_FILTER_MAX_SELECTIONS } from '@duedatehq/contracts'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'
import { PageHeader } from '@/components/patterns/page-header'
import { ShortcutHintChip } from '@/components/patterns/kbd'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { DashboardActionsList } from '@/features/dashboard/actions-list'
// 2026-05-27 (Yuqi feedback round 1): import retained but commented out
// alongside the section mount. Restore both when ChangesSinceLastSection
// is brought back.
// import { ChangesSinceLastSection } from '@/features/dashboard/changes-since-last-section'
import { NeedsAttentionSection } from '@/features/dashboard/needs-attention-section'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { CreateObligationDialog } from '@/features/obligations/CreateObligationDialog'
import type { ObligationStatus } from '@/features/obligations/status-control'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { requiredRolesLabel } from '@/lib/required-roles-label'

const TRIAGE_TAB_KEYS = ['this_week', 'this_month', 'long_term'] as const
const DASHBOARD_DUE_BUCKETS = [
  'overdue',
  'today',
  'next_7_days',
  'next_30_days',
  'long_term',
] as const satisfies readonly DashboardDueBucket[]
const DASHBOARD_STATUS_FILTERS = [
  'pending',
  'in_progress',
  'waiting_on_client',
  'review',
] as const satisfies readonly ObligationStatus[]
const DASHBOARD_EVIDENCE_FILTERS = [
  'needs',
  'linked',
] as const satisfies readonly DashboardEvidenceFilter[]
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REPLACE_HISTORY_OPTIONS = { history: 'replace' } as const

// URL params are retained for deep-link compatibility — they feed
// dashboardTableInput below so server-side filters still apply even
// though the v2 UI no longer exposes filter controls.
const dashboardSearchParamsParsers = {
  asOfDate: parseAsString.withDefault('').withOptions(REPLACE_HISTORY_OPTIONS),
  triage: parseAsStringLiteral(TRIAGE_TAB_KEYS)
    .withDefault('this_week')
    .withOptions(REPLACE_HISTORY_OPTIONS),
  client: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  taxType: parseAsArrayOf(parseAsString).withDefault([]).withOptions(REPLACE_HISTORY_OPTIONS),
  due: parseAsArrayOf(parseAsStringLiteral(DASHBOARD_DUE_BUCKETS))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  status: parseAsArrayOf(parseAsStringLiteral(DASHBOARD_STATUS_FILTERS))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  severity: parseAsArrayOf(parseAsStringLiteral(['critical', 'high', 'medium', 'neutral']))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
  evidence: parseAsArrayOf(parseAsStringLiteral(DASHBOARD_EVIDENCE_FILTERS))
    .withDefault([])
    .withOptions(REPLACE_HISTORY_OPTIONS),
} as const

function cleanStringFilters(values: readonly string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 120),
    ),
  ].slice(0, DASHBOARD_FILTER_MAX_SELECTIONS)
}

function cleanEntityIdFilters(values: readonly string[]): string[] {
  return cleanStringFilters(values).filter((value) => UUID_RE.test(value))
}

export function DashboardRoute() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const canRunMigration = permission.can('migration.run')
  // Dashboard is a picker, not a workspace. Clicking an action
  // calls openDrawer(id) which — because dashboard is NOT in the
  // provider's routeOwnsPanel set — navigates to
  // `/deadlines/<short-ref>`. The queue is the
  // canonical workspace; dashboard's job is to send you there with
  // the right obligation already selected.
  const { openDrawer: openObligationDrawer } = useObligationDrawer()
  const [{ asOfDate, client, taxType, due, status: statusFilter, severity, evidence }] =
    useQueryStates(dashboardSearchParamsParsers)
  const dashboardAsOfDate = ISO_DATE_RE.test(asOfDate) ? asOfDate : null
  const clientQuery = useMemo(() => cleanEntityIdFilters(client), [client])
  const taxTypeQuery = useMemo(() => cleanStringFilters(taxType), [taxType])
  const dashboardTableInput = useMemo<DashboardLoadInput>(
    () => ({
      topLimit: 20,
      ...(dashboardAsOfDate ? { asOfDate: dashboardAsOfDate } : {}),
      ...(clientQuery.length > 0 ? { clientIds: clientQuery } : {}),
      ...(taxTypeQuery.length > 0 ? { taxTypes: taxTypeQuery } : {}),
      ...(due.length > 0 ? { dueBuckets: due } : {}),
      ...(statusFilter.length > 0 ? { status: statusFilter } : {}),
      ...(severity.length > 0 ? { severity } : {}),
      ...(evidence.length > 0 ? { evidence } : {}),
    }),
    [clientQuery, dashboardAsOfDate, due, evidence, severity, statusFilter, taxTypeQuery],
  )
  const dashboardQuery = useQuery({
    ...orpc.dashboard.load.queryOptions({ input: dashboardTableInput }),
    placeholderData: keepPreviousData,
  })
  // 2026-05-29 (Yuqi /today follow-up — "empty state: no clients vs no
  // deadlines"): a `totalOpen === 0` page used to render a single
  // "No deadlines yet, import clients" CTA. That copy was right for
  // a fresh practice but wrong for a practice that already imported
  // and just doesn't have generated deadlines yet. We split with a
  // cheap probe — `limit: 1` so the server returns at most one row,
  // and we only look at .length to decide. The query result is
  // shared across the page, so dropdowns / pickers that need a
  // client list share the same cache key.
  const clientsProbeQuery = useQuery({
    ...orpc.clients.listByFirm.queryOptions({ input: { limit: 1 } }),
    placeholderData: keepPreviousData,
  })
  const hasClients = (clientsProbeQuery.data?.length ?? 0) > 0
  const data = dashboardQuery.data

  const triageTabs = data?.triageTabs ?? []
  const facets = data?.facets

  return (
    // 2026-05-25 (GitHub-density direction): page rhythm tightened
    // gap-8 → gap-6 (header → sections), header h1 trimmed from
    // text-2xl to text-xl. Yuqi's reference is GitHub's "useful,
    // precise, tight" density — section anchors stay legible at
    // scan distance without claiming a whole top-row of vertical
    // real estate.
    // 2026-05-25 (Yuqi page-title pass): outer container padding
    // bumped top to pt-6 md:pt-8 (was uniform p-4 md:p-6) so the
    // h1 has more breathing room from the top edge of the work
    // surface. Other sides unchanged. Same standard now applied
    // to /clients, /deadlines, /audit (see route files); the
    // narrower pages /settings, /practice, /billing already use
    // py-6 which reads correctly at their tighter width.
    // 2026-05-27 (audit-drain X1 D18): tightened above-the-fold
    // density. Outer gap-6 → gap-4 trims 24px of vertical between
    // each of the four sections (header → changes-since →
    // alerts → actions) — at 1440×900 this pulls the first
    // overdue row up into the third visible band instead of
    // landing below the fold once the new "Changes since" row is
    // added. Top/bottom padding also stepped down one tier
    // (pt-6/8 → pt-4/6, pb-4/6 → pb-3/5) so the H1 doesn't claim
    // an outsize share of the work surface.
    // 2026-05-27 (Yuqi feedback "bigger gap between Today title, Alerts
    // section, and Actions this week"): gap-4 (16px) → gap-8 (32px) so
    // the three top-level sections breathe. The number prefix in each
    // heading + the gray date pattern works better with this rhythm.
    // 2026-05-28 (Yuqi feedback — /today felt empty at wide
    // viewports): bumped from max-w-page-wide (1100) to
    // max-w-page-expanded (1440) so the page matches the rest
    // of the workbench family (/clients, /clients/[id],
    // /deadlines, /rules/library, /alerts, /alerts). At
    // 1920px the alerts + actions sections now use 1440px of
    // canvas instead of 1100px, removing ~340px of dead margin.
    // 2026-05-29 (Yuqi /today follow-up — "gap smaller, apply to
    // everywhere"): outer page gap stepped gap-8 → gap-6. The earlier
    // gap-8 was added for a "bigger gap between Today title, Alerts,
    // and Actions" round, but with section-internal gaps now at
    // gap-3 (Alerts + Actions) the outer 32px read disproportionately
    // loud against the 12px inside each section. gap-6 (24px) keeps
    // the three top-level sections distinct while pulling the first
    // content row up into the user's eye line.
    <div className="mx-auto flex w-full max-w-page-expanded flex-col gap-6 px-4 pt-8 pb-3 md:px-6 md:pb-5">
      {/* 2026-05-26 (Yuqi seventy-fourth pass — Today joins the
          page-header family): the hand-rolled <header> is gone.
          /today now routes through the same `<PageHeader>`
          primitive as /clients, /deadlines, /alerts, and
          /rules/library — date moves into the canonical pill
          chip slot so it matches the family's "title + count
          chip" shape, and the action cluster sits in the
          `actions` prop. Future polish to the PageHeader
          primitive propagates here automatically. */}
      <PageHeader
        title={
          // 2026-05-27 (Yuqi feedback: "should be like this but May 27
          // in gray"): the date renders inline at the same heading
          // type-style as "Today", just in text-text-tertiary. Drops
          // the rounded-pill chrome — the date is part of the title,
          // not a count-chip beside it.
          <span className="inline-flex items-baseline gap-2">
            <Trans>Today</Trans>
            {dashboardQuery.isLoading ? (
              <span className="font-normal text-text-tertiary italic">
                <Trans>loading…</Trans>
              </span>
            ) : data?.asOfDate ? (
              <span className="font-normal tabular-nums text-text-tertiary">
                {formatTodayHeader(data.asOfDate)}
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            {/* 2026-05-27 (Step 6 UX flows audit H2.6): the
                keyboard shortcut help dialog opens on `?` but
                that key was undiscoverable from the dashboard.
                Tiny chip aligned with the action cluster gives
                first-time keyboardists a path in; mouse users
                can also click. Mirrors the bottom-of-queue
                pattern in /deadlines. */}
            <ShortcutHintChip className="hidden md:inline-flex" />
            <CreateObligationDialog />
            {/* 2026-05-25 (Yuqi Today #6): FileSearchIcon → UploadIcon.
                The button's job is "upload my client list", not
                "browse for files" — the upload metaphor matches the
                CTA verb.
                2026-05-26 (Step 6 UX audit #32): a coordinator-role
                user lands on Today, sees a greyed-out "Import
                clients" button, and has no clue why. The `title`
                attribute surfaces the permission requirement on
                hover so they don't dead-end. aria-label keeps the
                button identifiable to screen readers even when
                disabled. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openWizard()}
              disabled={!canRunMigration}
              // ROH-D11 — was "owner or manager"; migration.run is
              // owner/partner/manager/preparer. Helper-driven so the
              // tooltip + aria-label always name the right roles.
              title={
                canRunMigration
                  ? undefined
                  : t`Requires ${requiredRolesLabel('migration.run')} access.`
              }
              aria-label={
                canRunMigration
                  ? undefined
                  : t`Import clients (requires ${requiredRolesLabel('migration.run')} access)`
              }
            >
              <UploadIcon data-icon="inline-start" />
              <Trans>Import clients</Trans>
            </Button>
          </>
        }
      />

      {dashboardQuery.isError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Couldn't load dashboard</Trans>
          </AlertTitle>
          <AlertDescription>
            {rpcErrorMessage(dashboardQuery.error) ??
              t`Check your network and try again. If this keeps happening, contact support.`}{' '}
            {/* 2026-05-26 (Step 6 UX audit #30): retry uses the
                canonical `<Button variant="link">` instead of an
                ad-hoc `<button className="underline">`. Keeps
                button-pattern consistent across the app and inherits
                the link variant's focus-visible ring + hover state. */}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 align-baseline"
              onClick={() => void dashboardQuery.refetch()}
            >
              <Trans>Retry</Trans>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 2026-05-27 (audit-drain X1 D17): "Changes since last visit"
          surface — addresses φ's J5 journey ("returned from
          vacation"). Sits between PageHeader and Alerts because
          it's a read-back ("here's what shifted while you were
          away"), not live work. MVP uses localStorage for
          last-seen tracking; upgrade path is a server-side
          `lastDashboardVisitAt` on the user model (ω-territory
          contract change). The section ships its own collapse
          affordance so power users who don't want it can hide. */}
      {/* 2026-05-27 (Yuqi feedback round 1): "hide changes since last
          visit for now" — section mount commented out. Component
          file kept (changes-since-last-section.tsx) for future
          revisit. Restore by uncommenting the line below. */}
      {/* <ChangesSinceLastSection /> */}

      <NeedsAttentionSection />

      {/* 2026-05-25 (Yuqi #5): the standalone <ExposureStrip>
          section was merged into <DashboardActionsList> as its
          summary header. Both rendered "this week" scope, so two
          sections one after the other split the same concept
          across redundant chrome. Counts now pass through as props. */}
      <section>
        <DashboardActionsList
          isLoading={dashboardQuery.isLoading}
          asOfDate={data?.asOfDate ?? null}
          // v2 scope is implicit "this week" per design brief — no time-bucket tabs.
          rows={triageTabs.find((tab) => tab.key === 'this_week')?.rows ?? []}
          totalThisWeek={triageTabs.find((tab) => tab.key === 'this_week')?.count ?? 0}
          totalOpen={data?.summary?.openObligationCount ?? 0}
          needDecisionCount={data?.summary?.needsReviewCount ?? 0}
          blockedCount={facets?.statuses.find((s) => s.value === 'blocked')?.count ?? 0}
          waitingOnClientCount={
            facets?.statuses.find((s) => s.value === 'waiting_on_client')?.count ?? 0
          }
          canRunMigration={canRunMigration}
          hasClients={hasClients}
          onOpenWizard={openWizard}
          // Clicking an action navigates to the obligations queue with
          // the right panel pre-opened for that obligation. The
          // provider's openDrawer routes off-route callers to
          // `/deadlines/<short-ref>` — dashboard is a
          // picker, the queue is the workspace.
          onOpenObligation={(row) => openObligationDrawer(row.obligationId)}
          onOpenAllObligations={() => void navigate('/deadlines')}
        />
      </section>
    </div>
  )
}

function formatTodayHeader(asOfDate: string): string {
  const date = new Date(`${asOfDate.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return asOfDate
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(date)
}
