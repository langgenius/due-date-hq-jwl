import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  LightbulbIcon,
  MailIcon,
  MapPinIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PlusIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  SettingsIcon,
  SparklesIcon,
  UserRoundIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  AuditEventPublic,
  ClientPublic,
  MemberAssigneeOption,
  ObligationInstancePublic,
  ObligationRule,
} from '@duedatehq/contracts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@duedatehq/ui/components/ui/alert-dialog'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { cn } from '@duedatehq/ui/lib/utils'

import { EmptyState } from '@/components/patterns/empty-state'
import { InfoBanner } from '@/components/patterns/info-banner'
import { useAppHotkey, useKeyboardShortcutsBlocked } from '@/components/patterns/keyboard-shell'
import { PageHeader } from '@/components/patterns/page-header'
import { getAssigneeTint } from '@/lib/assignee-tint'
import { formatDatePretty, formatDateTimeWithTimezone } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { initialsFromName } from '@/lib/auth'
import { formatTaxCode } from '@/lib/tax-codes'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import { CreateObligationDialog } from '@/features/obligations/CreateObligationDialog'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { ObligationPanelDispatcher } from '@/features/obligations/ObligationPanelDispatcher'
import {
  useLifecycleV2StatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'
import { useFirmAsOfDate } from '@/features/firm/use-firm-as-of-date'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { ClientOpportunitiesCard } from '@/features/opportunities/client-opportunities-card'
import { useAuditActionLabels } from '@/features/audit/audit-log-labels'
import { formatAuditActionLabel } from '@/features/audit/audit-log-model'

import { ClientCycleArrows } from './ClientCycleArrows'
import { ClientTitleSwitcher } from './ClientTitleSwitcher'
import { ClientCompliancePosturePanel } from './ClientCompliancePosturePanel'
import { FixNeedsFactsSheet } from './FixNeedsFactsSheet'
import { ClientSummaryStrip } from './ClientSummaryStrip'
import { ClientWorkPlanPanel } from './ClientWorkPlanPanel'
import {
  ClientFactChecklist,
  ClientJurisdictionPanel,
  ClientRiskInputsPanel,
  ClientRiskSummaryPanel,
  ClientSourceDetailsPanel,
  InsightStatusBadge,
  RiskProfileSmartPriorityHelp,
} from './ClientFactPanels'
import { ClientFilingStateChips, TabSection } from './ClientFactsWorkspace'

import {
  getClientFilingStates,
  getClientSourceType,
  type ClientEntityType,
  type ClientReadiness,
} from './client-readiness'
import {
  buildClientHeaderContactItems,
  buildClientAlertMatches,
  buildClientWorkPlanSummary,
  findExtensionWithoutPaymentObligations,
  type ClientHeaderContactItem,
  type ClientAlertMatch,
  type ClientWorkPlanSummary,
} from './client-detail-model'

const EMPTY_OBLIGATIONS: readonly ObligationInstancePublic[] = []

function taxClassificationLabel(value: ClientPublic['taxClassification']): string | null {
  switch (value) {
    case 'partnership':
      return 'taxed as partnership'
    case 's_corp':
      return 'taxed as S corp'
    case 'c_corp':
      return 'taxed as C corp'
    case 'disregarded_entity':
      return 'disregarded entity'
    case 'individual':
    case 'trust':
    case 'estate':
    case 'nonprofit':
    case 'foreign_reporting_company':
    case 'unknown':
    default:
      return null
  }
}

function renderClientHeaderSubLine({
  workPlan,
  entityType,
  taxClassification,
}: {
  workPlan: ClientWorkPlanSummary
  entityType: ClientPublic['entityType']
  taxClassification: ClientPublic['taxClassification']
}): ReactNode {
  // Daily-driver signal line under the client name. Tone-coded so a
  // CPA scanning the page in <1 second can spot "anything overdue?"
  // without reading prose. Order mirrors the four canonical questions
  // (what kind of client → urgency → tone).
  //
  // 2026-05-24 (distill — critique P0): dropped the "N open filings"
  // segment. The Open Filing summary tile (now at 20px after the
  // typeset pass) is the canonical surface for that number; repeating
  // it in the subtitle, the tile, AND the year-section badge gave
  // CPAs three nearly-identical counts with three different scopes —
  // they had to compute the relationship instead of just reading.
  // Subtitle now carries only the qualitative tail: classification,
  // next-due date, and the late / on-track tone marker.
  const parts: Array<{ id: string; node: ReactNode }> = []
  const taxLabel = entityType === 'llc' ? taxClassificationLabel(taxClassification) : null
  if (taxLabel) parts.push({ id: 'tax', node: <span>{taxLabel}</span> })
  if (workPlan.nextDueDate) {
    parts.push({
      id: 'due',
      node: <span>next due {formatDatePretty(workPlan.nextDueDate)}</span>,
    })
  }
  // 2026-05-24 (critique P0 — clarify): the pill used to bottom-out at
  // "All on track" whenever `overdueOpenCount` (currentDueDate-based)
  // was zero. That hid two real product states from the CPA:
  //
  //   1. Statutory date missed but no extension on the wire (the row
  //      that quietly looked fine because `currentDueDate` still equals
  //      `baseDueDate` and we were rendered before re-render)
  //   2. Extension filed but payment not yet settled — the canonical
  //      anti-pattern #1 ("extension does NOT mean payment is extended")
  //
  // Priority order, most severe first, so the CPA always sees the
  // truest negative state and "Extended" / "All on track" stop being
  // lazy fall-throughs.
  if (workPlan.statutoryLateUnextendedCount > 0) {
    parts.push({
      id: 'statutory-late',
      node: (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangleIcon className="size-3" aria-hidden />
          <span>
            {workPlan.statutoryLateUnextendedCount === 1
              ? '1 statutory late'
              : `${workPlan.statutoryLateUnextendedCount} statutory late`}
          </span>
        </Badge>
      ),
    })
  } else if (workPlan.filedPaymentOverdueCount > 0) {
    // 2026-05-27 (phi journey audit J1): the FILING-track version of
    // anti-pattern #1 ("Filed ≠ Paid"). A client whose every filing is
    // done but whose payment hasn't cleared used to flow into the
    // "All on track" bottom-out — a silent green that hid the real
    // urgency. Priority order: ahead of extensionPaymentDueCount
    // (which is also anti-pattern #1 but on the extension track) and
    // "Extended" / "All on track" fall-throughs. Destructive tone
    // because penalty interest accrues until the wire lands; a
    // 71-day-overdue payment is NOT amber, it's red.
    parts.push({
      id: 'filed-payment-overdue',
      node: (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangleIcon className="size-3" aria-hidden />
          <span>
            {workPlan.filedPaymentOverdueCount === 1
              ? '1 filed — payment overdue'
              : `${workPlan.filedPaymentOverdueCount} filed — payments overdue`}
          </span>
        </Badge>
      ),
    })
  } else if (workPlan.extensionPaymentDueCount > 0) {
    parts.push({
      id: 'extension-payment-due',
      node: (
        <Badge variant="warning" className="text-xs">
          <AlertTriangleIcon className="size-3" aria-hidden />
          <span>
            {workPlan.extensionPaymentDueCount === 1
              ? 'Extension filed — payment still due'
              : `${workPlan.extensionPaymentDueCount} extensions — payments still due`}
          </span>
        </Badge>
      ),
    })
  } else if (workPlan.overdueOpenCount > 0) {
    parts.push({
      id: 'late',
      node: (
        <span className="font-medium text-text-destructive">
          {workPlan.overdueOpenCount === 1 ? '1 late' : `${workPlan.overdueOpenCount} late`}
        </span>
      ),
    })
  } else if (workPlan.extensionFiledOpenCount > 0) {
    // Informational blue, not green: a client on an extension is on a
    // different track than "All on track" — the work shifted, not
    // disappeared. Says "Extended" rather than the count because
    // the per-row state lives in the filing-plan table below.
    parts.push({
      id: 'extended',
      node: (
        <Badge variant="info" className="text-xs">
          <span>Extended</span>
        </Badge>
      ),
    })
  } else if (workPlan.openCount > 0) {
    // Positive-state chip. Stops the app from relying on "absence of
    // red" as the implicit positive — every other surface that ends
    // a daily-driver line cleanly should use this same Badge variant.
    // See critique D-3 cont. "positive status visual vocabulary".
    parts.push({
      id: 'ontrack',
      node: (
        <Badge variant="success" className="text-xs">
          <CheckCircle2Icon className="size-3" aria-hidden />
          <span>All on track</span>
        </Badge>
      ),
    })
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      {parts.map((part, index) => (
        <span key={part.id} className="inline-flex items-baseline gap-x-1.5">
          {part.node}
          {index < parts.length - 1 ? (
            <span aria-hidden className="text-text-tertiary">
              ·
            </span>
          ) : null}
        </span>
      ))}
    </span>
  )
}

function formatJurisdictionSummary(client: ClientPublic): string {
  const stateCount = getClientFilingStates(client).length
  if (stateCount === 0) return 'Needs filing state'
  const taxTypeCount = new Set(client.filingProfiles.flatMap((profile) => profile.taxTypes)).size
  const statesLabel = stateCount === 1 ? '1 state' : `${stateCount} states`
  const taxTypesLabel =
    taxTypeCount === 0
      ? 'no tax types'
      : taxTypeCount === 1
        ? '1 tax type'
        : `${taxTypeCount} tax types`
  return `${statesLabel} · ${taxTypesLabel}`
}

function formatImportSourceSummary(client: ClientPublic): string {
  const parts = [client.externalClientId, client.sourceStatus].filter(Boolean)
  if (parts.length > 0) return parts.join(' · ')
  return getClientSourceType(client) === 'imported' ? 'Imported client details' : 'Manual client'
}

export function ClientDetailWorkspace({
  client,
  entityLabels,
  readiness,
  firmTimezone,
  practiceAiEnabled,
}: {
  client: ClientPublic
  entityLabels: Record<ClientEntityType, string>
  readiness: ClientReadiness | undefined
  firmTimezone: string
  practiceAiEnabled: boolean
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const permission = useFirmPermission()
  const currentUserName = useCurrentUserName()
  // 2026-05-24: `filingJurisdictionsOpen` state retired with the
  // DetailSection collapsible. Sections are flat now, so the "scroll
  // me into view" callback just scrolls — no panel state to toggle.
  const canReadAudit = permission.can('audit.read')
  const canUpdateObligationStatus = permission.can('obligation.status.update')
  // Body is now a 4-tab structure (Work / Client info / Discover /
  // Activity) — see docs/Design/client-page-information-architecture.md
  // updated 2026-05-22. URL-bound so deep links land on the right tab.
  // Work is the daily driver (filing plan), Client info carries the
  // configuration surfaces (compliance posture + jurisdictions + risk +
  // onboarding + import source), Discover is reference-only (suggested
  // forms + future business cues), Activity is lazy-loaded history.
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringLiteral(['work', 'info', 'opportunities', 'activity'] as const).withDefault(
      'work',
    ),
  )
  // 2026-05-26 (Yuqi tab-body follow-ups, Task 1): wire 1/2/3/4 as
  // hotkeys for the four tabs. Mirrors the J/K cycle pattern in
  // ClientCycleArrows — uses `useAppHotkey` (the project's canonical
  // hotkey primitive), gates on `useKeyboardShortcutsBlocked` so the
  // shortcuts stay quiet inside text inputs / dialogs / drawers, and
  // registers `meta` so each shortcut shows up in the global
  // ShortcutHelpDialog (the `?` sheet — that's Task 4 satisfied for
  // free). No on-screen kbd hints yet — power users discover via `?`.
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  useAppHotkey('1', () => void setActiveTab('work'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.work',
      name: 'Work tab',
      description: "Switch to the client's Work tab (filing plan).",
      category: 'navigate',
      scope: 'route',
    },
  })
  useAppHotkey('2', () => void setActiveTab('info'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.info',
      name: 'Client info tab',
      description: 'Switch to the Client info tab (posture, jurisdictions, risk).',
      category: 'navigate',
      scope: 'route',
    },
  })
  useAppHotkey('3', () => void setActiveTab('opportunities'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.opportunities',
      name: 'Suggested forms tab',
      description: 'Switch to the Suggested forms tab on this client.',
      category: 'navigate',
      scope: 'route',
    },
  })
  useAppHotkey('4', () => void setActiveTab('activity'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.activity',
      name: 'Activity tab',
      description: 'Switch to the Activity tab (AI summary, notes, audit log).',
      category: 'navigate',
      scope: 'route',
    },
  })
  // Obligation drawer is rendered as an in-route page panel (NOT a
  // modal Sheet) when launched from the filing plan below. State
  // lives on the shared provider so any surface — this page, the
  // queue, the dashboard, the global Cmd+K — drives the same panel
  // when they share a layout owner. `ObligationDrawerProvider`
  // defers to this route via the `routeOwnsPanel` check; see
  // features/obligations/ObligationDrawerProvider.tsx.
  const {
    obligationId: activeObligationId,
    activeTab: obligationTab,
    setActiveTab: setObligationTab,
    closeDrawer: closeObligationPanel,
  } = useObligationDrawer()
  // When the right obligation panel is open the left column squeezes
  // to ~40% width — drive tab strip, summary strip, and the "Add
  // deadline" CTA into compact icon-only modes so they don't ellipsize
  // or wrap (audit L9).
  const panelOpen = activeObligationId !== null
  // Activity-tab-only fetches: risk summary + audit log are consumed
  // exclusively inside the Activity tab body, so gate them on
  // `activeTab === 'activity'`. Saves ~2 round-trips on every detail
  // page open when the CPA only ever hits Work / Client info / Suggested
  // forms (audit P1-3).
  const activityTabActive = activeTab === 'activity'
  const riskSummaryQuery = useQuery({
    ...orpc.clients.getRiskSummary.queryOptions({ input: { clientId: client.id } }),
    enabled: activityTabActive,
  })
  const obligationsQuery = useQuery(
    orpc.obligations.listByClient.queryOptions({ input: { clientId: client.id } }),
  )
  const alertHistoryQuery = useQuery(orpc.pulse.listHistory.queryOptions({ input: { limit: 30 } }))
  // Audit P1-4: single batch round-trip instead of N+1 useQueries.
  const alertIds = useMemo(
    () => (alertHistoryQuery.data?.alerts ?? []).map((alert) => alert.id),
    [alertHistoryQuery.data?.alerts],
  )
  const alertDetailsBatchQuery = useQuery({
    ...orpc.pulse.getDetailsBatch.queryOptions({ input: { alertIds: alertIds } }),
    enabled: alertIds.length > 0,
  })
  const auditQuery = useQuery({
    ...orpc.audit.list.queryOptions({
      input: { entityType: 'client', entityId: client.id, range: '30d', limit: 6 },
    }),
    enabled: canReadAudit && activityTabActive,
  })
  const obligations = obligationsQuery.data ?? EMPTY_OBLIGATIONS
  // 2026-05-27 (D16 — Agent ω, journey-audit drain): anchor the work
  // plan summary on the firm's "as of" date instead of the browser's
  // wall clock. Keeps "overdue" / "needs review" / "extension payment
  // due" counts in sync with the rest of the client surfaces (and
  // with the server's day-math on the obligations queue).
  const asOfDate = useFirmAsOfDate()
  const workPlan = useMemo(
    () => buildClientWorkPlanSummary(obligations, asOfDate),
    [obligations, asOfDate],
  )
  const extensionPaymentMismatches = useMemo(
    () => findExtensionWithoutPaymentObligations(obligations),
    [obligations],
  )
  const alertDetails = alertDetailsBatchQuery.data?.details ?? []
  const alertMatches = buildClientAlertMatches(alertDetails, client.id)
  const updateRiskProfileMutation = useMutation(
    orpc.clients.updateRiskProfile.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.getRiskSummary.key() })
        toast.success(t`Risk profile saved`, { description: result.client.name })
      },
      onError: (err) => {
        toast.error(t`Couldn't save risk profile`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const replaceFilingProfilesMutation = useMutation(
    orpc.clients.replaceFilingProfiles.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.facets.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.getRiskSummary.key() })
        toast.success(t`Filing jurisdictions saved`, { description: result.client.name })
      },
      onError: (err) => {
        toast.error(t`Couldn't save filing jurisdictions`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const updateSourceDetailsMutation = useMutation(
    orpc.clients.updateSourceDetails.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.get.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.getRiskSummary.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        toast.success(t`Client details saved`, { description: result.client.name })
      },
      onError: (err) => {
        toast.error(t`Couldn't save client details`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const requestRiskSummaryMutation = useMutation(
    orpc.clients.requestRiskSummaryRefresh.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.getRiskSummary.key() })
        toast.success(t`Risk summary refresh queued`)
      },
      onError: (err) => {
        toast.error(t`Couldn't queue risk summary`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // Owner reassignment (2026-05-24). Powers the H1 owner-pill
  // dropdown so clicking "Unassigned" / "M. Chen" opens a real
  // picker — previously the pill looked tappable but was a dead
  // <span>. Reuses the same `clients.bulkUpdateAssignee` procedure
  // the /clients list bulk-bar uses, with a single-id payload so
  // the audit-log breadcrumb stays consistent.
  const assignableMembersQuery = useQuery(
    orpc.members.listAssignable.queryOptions({ input: undefined }),
  )
  const assignableMembers = useMemo(
    () => assignableMembersQuery.data ?? [],
    [assignableMembersQuery.data],
  )
  const bulkAssigneeMutation = useMutation(
    orpc.clients.bulkUpdateAssignee.mutationOptions({
      onSuccess: (result, vars) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.get.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
        toast.success(vars.assigneeId === null ? t`Owner cleared` : t`Owner updated`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't update owner`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const changeOwner = useCallback(
    (assigneeId: string | null) => {
      bulkAssigneeMutation.mutate({ clientIds: [client.id], assigneeId })
    },
    [bulkAssigneeMutation, client.id],
  )
  const missingFilingState = Boolean(readiness?.missingRequiredFacts.includes('state'))
  // "Add filing state" chip + jurisdiction-deep-link callback.
  // 2026-05-24: the chip lives on the Work tab header but the
  // jurisdiction form lives on the Client info tab. Scrolling
  // alone left the user on Work with nothing visibly changed.
  // Now switches the tab first, then RAFs the scroll so the
  // section is in the DOM before we try to align it.
  const openFilingJurisdictions = useCallback(() => {
    void setActiveTab('info')
    window.requestAnimationFrame(() => {
      document
        .getElementById('client-filing-jurisdictions')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [setActiveTab])

  // 2026-05-24 (shape — critique P1): the H1 "Add filing state" /
  // "Needs facts" chip opens the same inline batch sheet the
  // /clients list page uses, so the fix-state journey matches across
  // surfaces. Previously the detail-page chip just switched to the
  // Client info tab + scrolled to the jurisdiction form, which was
  // ~6 clicks vs the list page's 2.
  //
  // When `entityType` is missing (rare), the sheet's existing
  // fallback is a "Open client to fix" link — useless here because
  // we're already on the client detail page. For that case we keep
  // the old tab+scroll fallback. Detection: readiness.missing
  // includes 'entityType'.
  const [fixSheetOpen, setFixSheetOpen] = useState(false)
  const missingEntityType = Boolean(readiness?.missingRequiredFacts.includes('entityType'))
  const openMissingFacts = useCallback(() => {
    if (missingEntityType) {
      openFilingJurisdictions()
      return
    }
    setFixSheetOpen(true)
  }, [missingEntityType, openFilingJurisdictions])

  // Obligation status change — wired from the filing-plan rows
  // (D-6a/b). Same RPC the queue uses, same invalidation set, so
  // status changes made here propagate to the queue, dashboard, and
  // back into this client's filing-plan rows.
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const changeStatusMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: (result, vars) => {
        void queryClient.invalidateQueries({
          queryKey: orpc.obligations.listByClient.key(),
        })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        toast.success(t`Status changed to ${v2StatusLabels[vars.status]}`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't change status`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const handleChangeObligationStatus = useCallback(
    (id: string, status: ObligationStatus) => {
      changeStatusMutation.mutate({ id, status })
    },
    [changeStatusMutation],
  )

  // Archive (a.k.a. soft-delete) state + mutation. CPA compliance
  // requires soft-delete — `clients.delete` actually flips `deletedAt`
  // server-side, audit log retains everything. The UI surfaces the
  // action as "Archive" (the action verb a CPA would use) instead of
  // "Delete" (which implies irreversible). See critique L-10 for the
  // rationale on Archive vs Delete vocabulary.
  const [archiveOpen, setArchiveOpen] = useState(false)
  const archiveMutation = useMutation(
    orpc.clients.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        toast.success(t`Client archived`, { description: client.name })
        setArchiveOpen(false)
        void navigate('/clients')
      },
      onError: (err) => {
        toast.error(t`Couldn't archive client`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const showSourceFields =
    getClientSourceType(client) === 'imported' ||
    Boolean(client.externalClientId || client.sourceStatus)

  return (
    <>
      {/* 2026-05-26 (Yuqi feedback #11-#14 — "page scrolling mechanism
          should follow Deadline expanded"): outer container is now a
          flex column on small viewports and a flex row at xl+. The
          left column owns its OWN scroll container (PageHeader +
          metadata pinned, tab body scrolls); the right panel slides
          in motion-animated 0→600 when a filing row is clicked. The
          page-level scroll on the document body is gone — only the
          tab body scrolls. Mirrors /deadlines exactly. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <PageHeader
            // 2026-05-28 (audit P2-4): switched from a hand-rolled
            // `<Link>` in the `eyebrow` slot to the canonical
            // `breadcrumbs` prop. The earlier rationale ("eyebrow
            // overrides the uppercase tag styling so the back-nav
            // reads as a friendly link") predates the `breadcrumbs`
            // primitive — which IS styled as a friendly link with
            // chevron separator + ⌘[ hint. Lines up with /settings,
            // /members, /billing.checkout. `eyebrowAside` still
            // carries the 1/N ClientCycleArrows pagination on the
            // right of the same eyebrow row (PageHeader supports
            // both — see `page-header.tsx`).
            breadcrumbs={[{ label: t`Clients`, to: '/clients' }]}
            // 2026-05-26 (Yuqi follow-up — "1/9 does not belong to
            // the client detail … should be in the frame of the
            // < Clients, space between far right"): the prev/next
            // pagination belongs on the BREADCRUMB row, not in the
            // H1 actions cluster. The < Clients back-link sits on
            // the left of the eyebrow row; 1/9 sits on the right of
            // the same row via the eyebrowAside slot, with the
            // PageHeader providing `justify-between`. Action cluster
            // (⋯ + Add deadline) stays in the title row — those
            // ARE page-level controls scoped to this client. */}
            eyebrowAside={<ClientCycleArrows currentClientId={client.id} />}
            title={
              // 2026-05-26 (Yuqi macro→micro audit, Fix #3 + #11 / §2.2,
              // §2.4): title cluster reduced to title + 1 readiness chip
              // per canonical (page-family-canonical §3 — title + ≤1
              // chip). Entity badge, owner pill, and filing-state chips
              // moved DOWN to ClientContactMetaRow so the H1 line reads
              // as identification, not a stat strip.
              // 2026-05-26 (Yuqi /clients/[id] header restructure —
              // "restructure the header section of the client-detail"):
              // chip moves to its OWN row BELOW the title (the title
              // span used to share a flex-wrap row with the chip; in
              // narrow layouts that pushed the chip onto a 2nd line
              // OR forced the title to wrap to 3 lines). New shape:
              //   • Row 1: ClientTitleSwitcher (truncates if narrow)
              //   • Row 2: optional readiness chip (only when status
              //            === 'needs_facts')
              // Both rows are `min-w-0` so they shrink gracefully when
              // the right panel opens and the H1 column collapses.
              <span className="flex min-w-0 flex-col items-start gap-y-2">
                <ClientTitleSwitcher client={client} />
                {readiness?.status === 'needs_facts' ? (
                  // 2026-05-26 (Fix #9 / §3.7): badge tone destructive
                  // → warning. "Add filing state" is incomplete
                  // configuration, not a destructive state; warning
                  // matches the needs-facts banner tone and the
                  // canonical color reservation (red is for late /
                  // hard errors / blocked).
                  <Badge
                    variant="warning"
                    className="cursor-pointer text-xs"
                    render={<button type="button" onClick={openMissingFacts} />}
                  >
                    <SettingsIcon className="size-3" aria-hidden />
                    <MissingFactsActionLabel readiness={readiness} />
                  </Badge>
                ) : null}
              </span>
            }
            // 2026-05-28 (Yuqi /clients/[id] polish — "client name
            // 下面很空，感觉缺了内容"): pulled `ClientContactMetaRow`
            // (entity badge / owner pill / state chips / email /
            // phone / address) UP into the PageHeader's metaRow
            // slot. Previously it rendered as the first child of
            // the body section below the header, separated by the
            // outer `gap-4` (16px). Now it sits inside the
            // PageHeader column at the canonical `gap-2` (8px)
            // below the H1 — title and identity facts read as one
            // anchored block instead of "client name then a void."
            metaRow={
              <ClientContactMetaRow
                client={client}
                entityLabel={entityLabels[client.entityType]}
                ownerSlot={
                  <ClientOwnerHeaderPill
                    assigneeId={client.assigneeId ?? null}
                    name={client.assigneeName ?? null}
                    currentUserName={currentUserName}
                    assignableMembers={assignableMembers}
                    disabled={bulkAssigneeMutation.isPending}
                    onChange={changeOwner}
                  />
                }
              />
            }
            // 2026-05-23: subtitle suppressed when readiness gap chip is
            // present in the H1 chip cluster. The "Missing filing state"
            // chip is itself the page-level signal; piling a workPlan
            // summary line on top creates two summary lines stacked
            // ("alert chip row" + "N open filings · …") and feels noisy.
            // Per Figma — when the alert chip is there, it owns the
            // sub-h1 slot; the workPlan summary returns once the gap
            // is resolved. Subtitle keeps rendering for every other
            // client so the at-a-glance state stays visible.
            description={
              readiness?.status === 'needs_facts'
                ? null
                : renderClientHeaderSubLine({
                    workPlan,
                    entityType: client.entityType,
                    taxClassification: client.taxClassification,
                  })
            }
            actions={
              <>
                {/* 2026-05-26 (Yuqi follow-up — "1/9 does not belong
                    to the client detail"): ClientCycleArrows moved
                    OUT of the actions cluster up to the eyebrowAside
                    slot. Actions now only carry the page-level
                    controls scoped to this client (overflow ⋯ +
                    Add deadline). */}
                <ClientHeaderOverflowMenu
                  clientId={client.id}
                  clientName={client.name}
                  canReadAudit={canReadAudit}
                  onArchive={() => setArchiveOpen(true)}
                />
                <CreateObligationDialog
                  defaultClientId={client.id}
                  {...(panelOpen
                    ? {
                        trigger: (
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="default"
                            aria-label={t`Add deadline`}
                            title={t`Add deadline`}
                          >
                            <PlusIcon className="size-4" aria-hidden />
                          </Button>
                        ),
                      }
                    : {})}
                />
              </>
            }
          />

          {/* Body — client-context content. The outer xl:flex-row
            split (one wrapper above) already separates this from the
            right-rail obligation panel, so this section just renders
            the column-of-content inline.
            2026-05-28 (Yuqi /clients/[id] polish — "client name下面
            很空"): ClientContactMetaRow moved UP into the PageHeader
            `metaRow` slot above so the identity row sits tight
            against the H1 (gap-2 internal) instead of the body
            section's `gap-4`. */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            {/* Provenance (Imported / Manual) lived here briefly during
                the D-2 transition. Dropped 2026-05-22 per design call —
                low-signal: most clients are Manual by default, and the
                Imported chip never changed a CPA's behavior. The
                migration history is still discoverable from the
                /clients header Import-history drawer. */}

            {/* 2026-05-26 (Stripe-bar /clarify pass — re-applied per
                Yuqi's "address all" direction): inline tip pairs the
                needs-facts signal with a dismissable CTA. The H1 chip
                still surfaces "Add filing state" but the banner gives
                CPAs an "act now / dismiss for later" path without
                leaving the chip looming. Per-client dismissKey keeps
                each client's tip independent. */}
            {readiness?.status === 'needs_facts' ? (
              <InfoBanner
                icon={LightbulbIcon}
                message={t`Add this client's filing state to start generating deadlines.`}
                cta={{ label: t`Add filing state`, onClick: openMissingFacts }}
                dismissKey={`client-${client.id}-needs-facts-tip`}
              />
            ) : null}

            {/* Active alerts + summary strip stay ABOVE the tabs —
                they're global signals about the client ("anything wrong
                with this client right now?") that apply regardless of
                which tab is open. */}
            <ClientActiveAlertsSection
              alertMatches={alertMatches}
              extensionPaymentMismatches={extensionPaymentMismatches}
            />

            <ClientSummaryStrip
              clientId={client.id}
              obligations={obligations}
              compact={panelOpen}
            />

            {/* 4-tab body (2026-05-22). Replaces the V14 stacked-
                sections shape. Reasoning in
                docs/Design/client-page-information-architecture.md
                v2 + the dev-log for this commit. Short version:
                content grew past the point where a flat list of
                collapsibles reads cleanly, and "compliance posture"
                turned out to be client info (identity facts), not
                daily work. Tabs separate the four jobs cleanly:
                  • Work       — what do they owe right now?
                  • Client info — who is this client?
                  • Discover   — what else could they file?
                  • Activity   — what happened recently? (lazy) */}
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (
                  value === 'work' ||
                  value === 'info' ||
                  value === 'opportunities' ||
                  value === 'activity'
                ) {
                  void setActiveTab(value)
                }
              }}
              // 2026-05-26 (Yuqi feedback #12-14): Tabs root becomes
              // its own flex column inside the workspace. TabsList sits
              // shrink-0 at the top; the active TabsContent fills the
              // remaining height with its own overflow-y-auto. Without
              // this, the whole detail page scrolls as one (the bug
              // Yuqi flagged — "一整页一起滑动是不对的").
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* 2026-05-26 (Yuqi feedback #6 + #7): tab bar matches
                  the /deadlines scope-tabs visual — left-aligned,
                  hug-content triggers (no flex-1), transparent
                  background, single hairline border. Drops the
                  background-default that Yuqi flagged ("why is there
                  a background?"). The primitive's `variant="line"`
                  already provides the underline-on-active treatment.
                  Triggers are overridden below to drop the
                  primitive's `flex-1` so each tab hugs its label
                  (matches /deadlines instead of spreading full-width). */}
              {/* 2026-05-26 (Yuqi follow-up — "Deadline's Status
                  scopes animation and interaction" applied to detail
                  tabs): retired the primitive's CSS-only
                  `data-active:after:` underline and replaced with a
                  single `<motion.span layoutId>` rendered inside
                  whichever trigger is active. Framer Motion smoothly
                  slides the underline between tabs on click (spring
                  500 / damping 38) — the same pattern that powers
                  /deadlines `ObligationQueueScopeTab`. Active text
                  swaps back to `text-text-primary` per the parallel
                  "revert titles to black" pass; the moving underline
                  carries the active signal. Inactive triggers gain a
                  transparent 2px bottom border that turns
                  `divider-deep` on hover so the row reads warm at
                  rest, matching /deadlines hover symmetry. */}
              {/* 2026-05-26 (Yuqi /clients/[id] feedback #8 — "double
                  underline"): dropped the `border-b border-divider-regular`
                  baseline on TabsList. The active tab's motion.span at
                  `-bottom-0.5` was painting an accent underline + the
                  list's 1px gray border-b right next to each other =
                  two visible lines stacked. Without the list border,
                  the active accent line is the only visible underline;
                  inactive tab hover still gets its own `border-b-2`
                  via `ClientDetailTabTrigger`. */}
              <TabsList
                variant="line"
                className="flex shrink-0 gap-1 overflow-x-auto bg-transparent px-0 text-base"
              >
                {/* 2026-05-26 (Yuqi feedback — "add icons for each
                    of them"): leading lucide glyph per tab. Matches
                    the deadline drawer's tab bar (paperclip /
                    calendar / file) and gives the row a stronger
                    "scan me" affordance — the icons help the CPA
                    recognize the destination before they read the
                    word.
                      • Work → ClipboardList (filing plan tasks)
                      • Client info → UserRound (the person itself)
                      • Opportunities → Sparkles (discover surface)
                      • Activity → Activity (timeline / pulse)
                    Sizes match the deadline drawer at `size-3.5` so
                    glyph weight stays consistent across surfaces. */}
                <ClientDetailTabTrigger value="work" activeTab={activeTab} compact={panelOpen}>
                  <ClipboardListIcon className="size-3.5" aria-hidden />
                  <span data-tab-label>
                    <Trans>Work</Trans>
                  </span>
                </ClientDetailTabTrigger>
                <ClientDetailTabTrigger value="info" activeTab={activeTab} compact={panelOpen}>
                  <UserRoundIcon className="size-3.5" aria-hidden />
                  <span data-tab-label>
                    <Trans>Client info</Trans>
                  </span>
                  {/* 2026-05-26 (Yuqi post-revamp critique P2 / §5):
                      dot → count chip. The dot signaled "something
                      is missing" but didn't say HOW MUCH. A count
                      bubble surfaces the magnitude at the tab bar
                      so the CPA can decide whether to switch tabs
                      before clicking through. Tone matches the
                      readiness chip (warning, not destructive) per
                      §3.7 canonical color reservation. */}
                  {readiness && readiness.missingRequiredFacts.length > 0 ? (
                    <span
                      className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-state-warning-border bg-state-warning-hover px-1.5 text-[10px] font-medium leading-none tabular-nums text-text-warning"
                      // 2026-05-27 (audit P2-2): the bare "1" badge was
                      // unlabeled. Title gives a CPA hovering it the
                      // actual meaning ("# required fact(s) missing").
                      title={t`${readiness.missingRequiredFacts.length} required fact(s) missing`}
                      aria-label={t`${readiness.missingRequiredFacts.length} required fact(s) missing`}
                    >
                      {readiness.missingRequiredFacts.length}
                    </span>
                  ) : null}
                </ClientDetailTabTrigger>
                <ClientDetailTabTrigger
                  value="opportunities"
                  activeTab={activeTab}
                  compact={panelOpen}
                >
                  <SparklesIcon className="size-3.5" aria-hidden />
                  <span data-tab-label>
                    {/* Per-client tab labeled "Suggested forms" so it
                        doesn't collide with the firm-wide /opportunities
                        surface in the sidebar (audit L7). URL key stays
                        `opportunities` (see L6 rename) — same tab key,
                        narrower visible label. */}
                    <Trans>Suggested forms</Trans>
                  </span>
                </ClientDetailTabTrigger>
                <ClientDetailTabTrigger value="activity" activeTab={activeTab} compact={panelOpen}>
                  <ActivityIcon className="size-3.5" aria-hidden />
                  <span data-tab-label>
                    <Trans>Activity</Trans>
                  </span>
                </ClientDetailTabTrigger>
              </TabsList>

              {/* 2026-05-26 (Yuqi feedback #14): each TabsContent
                  owns its own overflow-y-auto so the tab body scrolls
                  INDEPENDENTLY of the rest of the page (PageHeader,
                  ContactMetaRow, alerts, summary, tab bar stay
                  pinned). Matches /deadlines's "queue column scrolls,
                  surrounding chrome stays put" mechanism. The bottom
                  padding gives the last row breathing room from the
                  viewport edge. */}
              <TabsContent
                value="work"
                className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6"
              >
                <ClientWorkPlanPanel
                  obligations={obligations}
                  isLoading={obligationsQuery.isLoading}
                  summary={workPlan}
                  clientName={client.name}
                  onChangeStatus={handleChangeObligationStatus}
                  isStatusChangePending={changeStatusMutation.isPending}
                  canChangeStatus={canUpdateObligationStatus}
                />
              </TabsContent>

              {/* 2026-05-24: every tab below uses <TabSection> for its
                  section heading so all four tabs share one visual
                  language (h2 + subtitle, no disclosure, no nested
                  card frame around the section block itself). The
                  DetailSection collapsible pattern + the ad-hoc
                  SectionFrame "Notes" block both retired here. */}
              <TabsContent
                value="info"
                className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6"
              >
                {/* Compliance posture — EIN + tax year + owners +
                    activity-scope flags. Client identity facts, not
                    "work" in progress; the CPA edits / verifies these
                    quarterly, not daily. Panel renders its own grid
                    inside; TabSection owns the section heading. */}
                <TabSection
                  title={t`Compliance posture`}
                  summary={t`Identity facts that drive the deadline generator`}
                >
                  <ClientCompliancePosturePanel client={client} />
                </TabSection>

                <TabSection
                  title={t`Filing jurisdictions`}
                  summary={formatJurisdictionSummary(client)}
                >
                  <div
                    id="client-filing-jurisdictions"
                    className={cn(
                      'scroll-mt-20 rounded-md border bg-background-default p-4',
                      missingFilingState
                        ? 'border-components-badge-bg-warning-soft'
                        : 'border-divider-regular',
                    )}
                  >
                    <ClientJurisdictionPanel
                      key={`${client.id}:jurisdiction`}
                      client={client}
                      isSaving={replaceFilingProfilesMutation.isPending}
                      onSave={(input) => replaceFilingProfilesMutation.mutate(input)}
                    />
                  </div>
                </TabSection>

                <TabSection
                  title={t`Risk profile`}
                  titleAccessory={<RiskProfileSmartPriorityHelp />}
                  summary={t`Penalty exposure and tax-attribute flags`}
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientRiskInputsPanel
                      key={`${client.id}:risk`}
                      client={client}
                      isSaving={updateRiskProfileMutation.isPending}
                      onSave={(input) => updateRiskProfileMutation.mutate(input)}
                    />
                  </div>
                </TabSection>

                <TabSection
                  title={t`Onboarding state`}
                  summary={
                    readiness && readiness.missingRequiredFacts.length > 0
                      ? t`${readiness.missingRequiredFacts.length} required fact(s) missing`
                      : t`All required facts present`
                  }
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientFactChecklist client={client} readiness={readiness} />
                  </div>
                </TabSection>

                <TabSection
                  title={showSourceFields ? t`Import source` : t`Contact details`}
                  summary={formatImportSourceSummary(client)}
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientSourceDetailsPanel
                      key={`${client.id}:source-details`}
                      client={client}
                      showSourceFields={showSourceFields}
                      isSaving={updateSourceDetailsMutation.isPending}
                      onSave={(input) => updateSourceDetailsMutation.mutate(input)}
                    />
                  </div>
                </TabSection>
              </TabsContent>

              <TabsContent
                value="opportunities"
                className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6"
              >
                <TabSection
                  title={t`Suggested forms`}
                  summary={t`Forms the rule library can add without a new deadline`}
                >
                  {/* 2026-05-26 (Yuqi tab-body follow-ups, Task 3):
                      drop the wrapper frame here — SuggestedFormsCatalogPanel
                      renders its own canonical-shape frame plus its own
                      "Forms catalog · N applicable" header bar, so the
                      outer p-4 wrapper double-framed and added wasted
                      padding. Matches how Future business cues below
                      lets ClientOpportunitiesCard stand alone. */}
                  <SuggestedFormsCatalogPanel client={client} existingObligations={obligations} />
                </TabSection>

                <TabSection
                  title={t`Future business cues`}
                  summary={t`Advisory, scope, and retention opportunities`}
                >
                  {/* ClientOpportunitiesCard renders its own <Card>
                      chrome (frame + internal title). We let it stand
                      alone — wrapping it in another frame doubled the
                      border + duplicated the heading. */}
                  <ClientOpportunitiesCard clientId={client.id} />
                </TabSection>
              </TabsContent>

              <TabsContent
                value="activity"
                className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6"
              >
                {/* Activity content only renders when the tab is the
                    active one — the surrounding TabsContent gates the
                    AI summary + audit log queries that fire inside. */}
                <TabSection
                  title={t`Client summary (AI)`}
                  summary={
                    riskSummaryQuery.data?.generatedAt
                      ? t`Refreshed ${formatDateTimeWithTimezone(riskSummaryQuery.data.generatedAt, firmTimezone)}`
                      : t`No summary yet`
                  }
                  // 2026-05-26 (Yuqi /clients/[id] feedback #6+#7 —
                  // "pull this out and put with the Client Summary
                  // title, then the bar can be removed"): the AI
                  // status badge + Refresh button cluster used to
                  // live as its own right-aligned bar INSIDE the
                  // panel body. Hoisted up to the TabSection's
                  // `actions` slot so the badge + Refresh sit on
                  // the same row as the section title; the redundant
                  // inner bar is dropped (see
                  // `ClientRiskSummaryPanel` below — it no longer
                  // renders that header strip).
                  actions={
                    <>
                      {riskSummaryQuery.data ? (
                        <InsightStatusBadge status={riskSummaryQuery.data.status} />
                      ) : null}
                      {practiceAiEnabled ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={requestRiskSummaryMutation.isPending}
                          onClick={() => requestRiskSummaryMutation.mutate({ clientId: client.id })}
                        >
                          <RefreshCwIcon data-icon="inline-start" />
                          {requestRiskSummaryMutation.isPending ? (
                            <Trans>Queued</Trans>
                          ) : (
                            <Trans>Refresh</Trans>
                          )}
                        </Button>
                      ) : null}
                      {/* 2026-05-28 (Yuqi /clients/[id] polish): removed
                          the `<UpgradeCtaButton />` upsell from the
                          Client summary (AI) section header. The
                          orange Pro upsell pulled the eye away from
                          the section's actual content. Practices
                          without AI just see no Refresh button next
                          to the InsightStatusBadge in this slot;
                          billing surface up-sells elsewhere. */}
                    </>
                  }
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientRiskSummaryPanel
                      insight={riskSummaryQuery.data ?? null}
                      isLoading={riskSummaryQuery.isLoading}
                      canRefresh={practiceAiEnabled}
                    />
                  </div>
                </TabSection>

                <TabSection title={t`Notes`}>
                  {/* 2026-05-26 (Yuqi tab-body follow-ups, Task 2 /
                      Fix #10): when there are no notes, render the
                      canonical EmptyState (dashed border + icon +
                      title + description) instead of an italic
                      "No notes." inside a solid frame. The italic
                      pattern was a one-off — every other empty state
                      on this page (Work plan, suggested forms,
                      audit log) uses EmptyState, so Notes now joins.
                      When notes ARE present, the solid frame stays
                      because the content is body text the CPA
                      authored, not a "nothing here" surface. */}
                  {client.notes ? (
                    <div className="rounded-md border border-divider-regular bg-background-default px-4 py-3 text-sm text-text-secondary">
                      {client.notes}
                    </div>
                  ) : (
                    <EmptyState
                      icon={ScrollTextIcon}
                      title={<Trans>No notes yet</Trans>}
                      description={
                        <Trans>
                          Capture context (preferred call window, sensitivities, history) so the
                          next preparer doesn't start from scratch.
                        </Trans>
                      }
                    />
                  )}
                </TabSection>

                <TabSection
                  title={t`Activity log`}
                  summary={t`Recent audited changes for this client record`}
                >
                  {/* 2026-05-26 (Yuqi tab-body follow-ups, Task 3):
                      ClientActivityPanel now owns its own canonical
                      outer frame internally (one frame, divide-y
                      rows), matching the AI summary + Notes section
                      treatment on this tab. No extra wrapper needed
                      here — would double-frame. */}
                  <ClientActivityPanel
                    events={auditQuery.data?.events ?? []}
                    canReadAudit={canReadAudit}
                    isLoading={auditQuery.isLoading}
                    firmTimezone={firmTimezone}
                  />
                </TabSection>
              </TabsContent>
            </Tabs>
          </section>
        </div>
        {/* Obligation page panel — replaces the modal Sheet on this
            route. Width is fixed 600px on xl+, full-width stacked
            below the entire client surface at narrower viewports.
            Now a sibling of the left column wrapper (was nested
            inside the body) so opening an obligation pushes the
            PageHeader, summary strip, alerts, AND the filing plan
            all left at once. */}
        {/* 2026-05-26: CSS-only slide-in. Earlier in this session we
            tried AnimatePresence + motion.div animating width 0→600
            but the interaction with this flex-row + items-stretch
            parent settled at stuck intermediate widths under React
            19's concurrent renders — the entry-animation never
            reliably reached the 600px target. We rolled back to a
            snap-mount, then brought the slide-in back via a native
            CSS transition on `width` (no motion library involved).
            Shape:
              • At xl+: aside is ALWAYS mounted (so the width
                transition has a stable element to animate). Width
                starts at 0 and animates to 600px when an obligation
                is selected. A negative `mr` cancels the parent's
                xl:gap-6 while the aside is closed so there's no
                phantom 24px void to the right of the left column;
                margin animates back to 0 alongside the width.
              • Below xl: parent is flex-col, so the aside renders
                as a conditional full-width block below the rest of
                the page (current behavior — no width animation
                because it isn't the dominant axis here).
            CSS sidesteps React 19's reconciliation entirely and is
            stable across renders. */}
        <aside
          data-slot="obligation-detail-panel"
          data-open={activeObligationId ? 'true' : 'false'}
          className={cn(
            'min-w-0 shrink-0 self-stretch overflow-hidden',
            // Below xl: simple conditional show / hide (no animation —
            // the parent is flex-col, width transitions aren't the
            // right shape for a vertical stack).
            activeObligationId ? 'flex w-full' : 'hidden',
            // xl+: always present as a flex slot, width-animated.
            'xl:flex xl:h-full xl:min-h-0',
            'xl:transition-[width,margin-right] xl:duration-300 xl:ease-apple motion-reduce:transition-none',
            // Closed: 0 width AND a negative right margin equal to
            // the parent's xl:gap-6 so the unused gap doesn't show
            // up as a void on the right edge.
            'xl:w-0 xl:-mr-6',
            // 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
            // open width switched from a fixed 600px to 60% of the
            // parent flex row so the obligation panel mirrors
            // AlertDetailDrawer's wrapper (AlertsListPage.tsx L844:
            // `width: '60%'`). Same proportional split between the
            // client-facts left column and the obligation drawer on
            // the right; both right-rail panels in the product now
            // share one width contract.
            activeObligationId && 'xl:w-[60%] xl:mr-0',
          )}
        >
          {activeObligationId ? (
            <ObligationPanelDispatcher
              obligationId={activeObligationId}
              activeTab={obligationTab}
              onTabChange={setObligationTab}
              onClose={closeObligationPanel}
              onNeedsInput={() => {
                // Penalty-input dialog is route-local to /deadlines;
                // not wired here. CPAs can deep-link to the queue
                // for that flow.
              }}
              practiceAiEnabled={practiceAiEnabled}
              blockerCandidates={[]}
            />
          ) : null}
        </aside>
      </div>

      {/* Archive confirmation. `clients.delete` is a soft-delete server-
          side (sets `deletedAt` + writes an audit row) — see commit
          b925449. We surface it as "Archive" because that's the CPA's
          mental model: hide from daily views, retain for audit /
          historical record. Critique L-10. */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Archive {client.name}?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                The client will be hidden from the active list and dashboards. All audit history,
                filings, and deadlines stay retained. You can restore from the archived view if you
                change your mind.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate({ id: client.id })}
            >
              <ArchiveIcon data-icon="inline-start" />
              <Trans>Archive client</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Inline batch flow for the "Needs facts" / "Add filing
          state" chip — same sheet the /clients list page mounts,
          scoped to this client only. Opens when the H1 chip is
          clicked and the missing fact is `state` (the 90% case).
          When `entityType` is missing, openMissingFacts falls back
          to tab+scroll instead because the sheet's entityType
          fallback is a link button that would loop back here. */}
      <FixNeedsFactsSheet open={fixSheetOpen} onOpenChange={setFixSheetOpen} clients={[client]} />
    </>
  )
}

type ClientDetailTabKey = 'work' | 'info' | 'opportunities' | 'activity'

// ClientDetailTabTrigger — adopts the canonical /deadlines
// ObligationQueueScopeTab visual contract for the four detail-page
// tabs (Work / Client info / Opportunities / Activity).
//   - text-base label, px-3 py-1.5 padding
//   - Active = `font-medium text-text-primary`; underline carries the
//     active signal (no accent-purple text)
//   - Inactive = transparent 2px bottom border that turns
//     `divider-deep` on hover
//   - The active underline is a single `<motion.span layoutId>` —
//     Framer Motion slides it between tabs as `activeTab` changes,
//     same spring tuning as the Deadlines tab band
//   - Still nested inside `<TabsList>` so Base UI Tabs root keeps
//     wiring the controlled `value`/`onValueChange` panel-switch
//     machinery
function ClientDetailTabTrigger({
  value,
  activeTab,
  compact = false,
  children,
}: {
  value: ClientDetailTabKey
  activeTab: ClientDetailTabKey
  /** When true, the trigger hides its text label and renders icon-only.
   *  Used when the right obligation panel is open to keep the tab strip
   *  fitting the squeezed left column (audit L9). */
  compact?: boolean
  children: ReactNode
}) {
  const active = activeTab === value
  return (
    <TabsTrigger
      value={value}
      // 2026-05-26 (Yuqi /clients/[id] feedback — "still having this
      // double line"): the underlying TabsTrigger primitive carries
      // pill-segmented defaults (`data-active:bg-…`,
      // `data-active:shadow-xs`, `rounded-md border border-transparent`,
      // plus an `::after` pseudo-element underline at `bottom-[-5px]`
      // gated on `variant=line`). Even though this consumer wants a
      // pure underline-style tab, those defaults kept painting — the
      // active "Work" tab was showing the motion.span accent line
      // AND a second line below it from the primitive's after-pseudo
      // shadow leakage. Adding explicit `!bg-transparent !shadow-none
      // !rounded-none after:!opacity-0` strips ALL primitive active
      // chrome so only the motion.span underline (and the bold text)
      // remain.
      // 2026-05-28 (Yuqi follow-up — "tabs are hard to know they can be
      // clicked"): inactive triggers now get a subtle bg fill on hover
      // (`hover:bg-state-base-hover-alt`) in addition to the existing
      // text + underline transitions. The bg change is a stronger
      // affordance — text-color shifts alone were too subtle on the
      // workbench's gray-tinted page background. The active state stays
      // chrome-free (bold text + the motion underline carry it).
      className={cn(
        'relative -mb-px !flex-none shrink-0 items-center gap-1.5 !rounded-md !border-0 !bg-transparent px-3 py-1.5 text-base whitespace-nowrap !shadow-none transition-colors after:!opacity-0',
        active
          ? 'font-medium text-text-primary'
          : 'cursor-pointer border-b-2 border-transparent text-text-secondary hover:bg-state-base-hover-alt hover:text-text-primary',
        // When compact, the label inside the trigger is wrapped in a
        // span with `[data-tab-label]` and we hide it via this attribute
        // selector — keeps the icon visible, lets the label remain in
        // the DOM as `sr-only` so the trigger still announces correctly.
        compact && '[&_[data-tab-label]]:sr-only',
      )}
    >
      {children}
      {active ? (
        <motion.span
          layoutId="client-detail-tab-underline"
          aria-hidden
          className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-accent-default"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      ) : null}
    </TabsTrigger>
  )
}

/**
 * Active alerts affecting this specific client. Alert matches +
 * extension-without-payment warnings live here. The old
 * `ClientAlertsBand` lumped these together with missing-facts into a
 * single warning strip — D-3 split them apart:
 *
 *  - **Missing facts** (page setup gap) → inline chip in the header
 *    (rendered next to identity chips). It's a *configuration*
 *    problem, not an *in-flight* alert.
 *  - **Active alerts** (this component) → a labeled section with a
 *    count, individual cards per alert. These are in-flight signals
 *    the CPA needs to act on right now.
 *
 * The visual treatment matches the reference design Yuqi shared
 * (`📢 ACTIVE ALERTS FOR THIS CLIENT · N` + per-alert cards). When
 * nothing is active, the whole section disappears.
 */
function ClientActiveAlertsSection({
  alertMatches,
  extensionPaymentMismatches,
}: {
  alertMatches: readonly ClientAlertMatch[]
  extensionPaymentMismatches: readonly ObligationInstancePublic[]
}) {
  const totalCount = alertMatches.length + extensionPaymentMismatches.length
  if (totalCount === 0) return null
  return (
    <section
      aria-label="Active alerts for this client"
      className="rounded-md border border-divider-regular bg-background-default p-4"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-divider-subtle bg-components-badge-bg-warning-soft/40 px-4 py-2.5">
        {/* 2026-05-26 (Yuqi macro→micro audit, Fix #7 / §3.3): retired
            uppercase kicker; canonical section heading is sm-semibold
            sentence-case (page-family-canonical §9). */}
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-text-warning">
          <MegaphoneIcon className="size-3.5" aria-hidden />
          <Trans>Active alerts for this client</Trans>
        </h3>
        <span className="text-xs tabular-nums text-text-tertiary">{totalCount}</span>
      </header>
      <ul className="divide-y divide-divider-subtle">
        {alertMatches.map((match) => (
          <li key={match.alertId}>
            <ClientActiveAlertsCard match={match} />
          </li>
        ))}
        {extensionPaymentMismatches.length > 0 ? (
          <li>
            <ClientActiveAlertsExtensionCard obligations={extensionPaymentMismatches} />
          </li>
        ) : null}
      </ul>
    </section>
  )
}

function ClientActiveAlertsCard({ match }: { match: ClientAlertMatch }) {
  // `ClientAlertMatch` doesn't carry a jurisdiction code today (the
  // server-side model returns `source` as a free-text label like
  // "Pennsylvania Department of Revenue"). Show the tax code as the
  // leading chip so the CPA sees what kind of filing is affected;
  // source goes on the secondary line. If a future schema iteration
  // adds a jurisdiction column, the chip becomes the 2-letter state.
  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-3">
      <Badge variant="secondary" className="rounded-sm uppercase">
        {formatTaxCode(match.taxType)}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{match.title}</p>
        <p className="mt-0.5 text-xs text-text-tertiary">{match.source}</p>
      </div>
      <Button variant="ghost" size="sm" render={<Link to="/alerts" />}>
        <Trans>Review</Trans>
        <ChevronRightIcon data-icon="inline-end" aria-hidden />
      </Button>
    </div>
  )
}

function ClientActiveAlertsExtensionCard({
  obligations,
}: {
  obligations: readonly ObligationInstancePublic[]
}) {
  const taxTypes = Array.from(new Set(obligations.map((row) => formatTaxCode(row.taxType)))).slice(
    0,
    3,
  )
  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-3">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">
          {obligations.length === 1 ? (
            <Trans>1 filing extended — payment is NOT extended</Trans>
          ) : (
            <Trans>{obligations.length} filings extended — payment is NOT extended</Trans>
          )}
        </p>
        <p className="mt-0.5 text-xs text-text-tertiary">{taxTypes.join(' · ')}</p>
      </div>
    </div>
  )
}

/**
 * Overflow menu (`···`) in the header action cluster. Hosts the
 * lower-priority actions that don't belong on the primary button row.
 *
 * Today there's one real action: **View audit log** (routes to
 * `/audit` filtered by this client). Previously the menu also listed
 * **Pin to sidebar**, **Download client PDF**, and **Edit client
 * info** as "coming soon" toasts — Yuqi flagged those as dead
 * affordances on 2026-05-24 ("don't put nonworking things"). They've
 * been removed until the real implementations land.
 *
 * If the user can't read audit logs the whole dropdown collapses
 * (returns `null`) so we don't render an empty `···` button.
 */
function ClientHeaderOverflowMenu({
  clientId,
  clientName,
  canReadAudit,
  onArchive,
}: {
  clientId: string
  clientName: string
  canReadAudit: boolean
  onArchive: () => void
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  // 2026-05-26 (Yuqi macro→micro audit, Fix #4 / §2.3): Archive moved
  // INSIDE the ⋯ overflow per canonical (≤2 outline buttons + no
  // destructive in the visible cluster). The menu used to gate on
  // `canReadAudit` and disappear entirely when the user lacked audit
  // — now Archive is always available so the menu renders, with the
  // audit-log entry conditionally shown.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          // 2026-05-26 (Yuqi feedback #2 — "icon button 怎么不是正方形"):
          // switched from size="sm" (which sets h-8 with horizontal padding,
          // producing a rectangle) to size="icon-sm" (h-8 w-8, true square).
          <Button variant="outline" size="icon-sm" aria-label={t`More client actions`}>
            <MoreHorizontalIcon className="size-4" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[220px]">
        {canReadAudit ? (
          <DropdownMenuItem
            onClick={() => void navigate(`/audit?entityId=${clientId}&entityType=client`)}
          >
            <ScrollTextIcon className="size-4" aria-hidden />
            <Trans>View audit log</Trans>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={onArchive}
          aria-label={t`Archive ${clientName}`}
          className="text-state-warning-text"
        >
          <ArchiveIcon className="size-4" aria-hidden />
          <Trans>Archive client</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ClientActivityPanel({
  events,
  canReadAudit,
  isLoading,
  firmTimezone,
}: {
  events: readonly AuditEventPublic[]
  canReadAudit: boolean
  isLoading: boolean
  firmTimezone: string
}) {
  const actionLabels = useAuditActionLabels()

  if (!canReadAudit) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title={<Trans>Audit access is role-gated</Trans>}
        description={
          // Audit-drain ρ ROH-D5-clients (2026-05-27): added "partners"
          // to match `FIRM_PERMISSION_ROLES['audit.read']`. Same drift
          // as the `/audit` route description.
          <Trans>Owners, partners, managers, and preparers can inspect client activity.</Trans>
        }
      />
    )
  }
  if (isLoading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }
  if (events.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title={<Trans>No audited client changes yet</Trans>}
        description={
          <Trans>Future edits to facts, risk profile, or deletion will appear here.</Trans>
        }
      />
    )
  }
  // 2026-05-26 (Yuqi tab-body follow-ups, Task 3 — Activity tab
  // section-frame unification): rows used to be individual
  // `rounded-md border bg-background-section` cards inside a grid
  // gap. That gave the Activity log a third visual dialect on the
  // Activity tab (vs AI summary's outer-frame + Notes' outer-frame).
  // Snapped to the canonical pattern: ONE outer canonical frame
  // (`rounded-md border-divider-regular bg-background-default`)
  // with `divide-y` between rows. Now matches the AI summary +
  // Notes treatment on the same tab, and the page-family-canonical
  // §9 rule (one section, one frame).
  return (
    <div className="overflow-hidden rounded-md border border-divider-regular bg-background-default">
      <ul className="divide-y divide-divider-subtle">
        {events.map((event) => (
          <li key={event.id} className="grid gap-1 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-primary">
                {formatAuditActionLabel(event.action, actionLabels)}
              </span>
              <span className="text-xs tabular-nums text-text-tertiary">
                {formatDateTimeWithTimezone(event.createdAt, firmTimezone)}
              </span>
            </div>
            <p className="text-xs text-text-tertiary">
              {event.actorLabel ?? event.actorId ?? 'System'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ClientOwnerHeaderPill (2026-05-23, rewired 2026-05-24).
// Inline chip variant of the assignee avatar — paired with the
// assignee's name so the H1 chip cluster can answer "whose client?"
// without a separate Team tile in the summary strip.
//
// 2026-05-24 (Yuqi caught a dead affordance): the pill is now a
// real DropdownMenu trigger that picks an assignee from the firm's
// assignable members + an "Unassigned" option. Clicking the pill
// opens the list; selecting fires `clients.bulkUpdateAssignee` with
// `[client.id]` and an `assigneeId` (or `null` for unassigned).
// Previously the pill rendered as a non-interactive `<span>` that
// LOOKED tappable but did nothing — pure UI lie. Now every
// affordance does what the user expects.
function ClientOwnerHeaderPill({
  assigneeId,
  name,
  currentUserName,
  assignableMembers,
  disabled,
  onChange,
}: {
  assigneeId: string | null
  name: string | null
  currentUserName: string | null
  assignableMembers: readonly MemberAssigneeOption[]
  disabled: boolean
  onChange: (assigneeId: string | null) => void
}) {
  const { t } = useLingui()
  const isMine =
    name !== null &&
    currentUserName !== null &&
    name.trim().toLowerCase() === currentUserName.toLowerCase()
  const tint = name === null ? null : getAssigneeTint(name)
  const triggerLabel =
    name === null
      ? t`Change owner — currently unassigned`
      : isMine
        ? t`Change owner — currently you (${name})`
        : t`Change owner — currently ${name}`
  // 2026-05-24: use the client's `assigneeId` directly instead of
  // reverse-looking up by name. The H1 pill renders an abbreviated
  // name ("A. Rivera") while assignableMembers returns full names
  // ("Avery Patel"), so the previous name-based match always failed
  // and the radio group fell back to "Unassigned" — making the
  // trigger and the checked item disagree. Looking up by id is the
  // source of truth.
  //
  // If the current assigneeId isn't in the assignable list (e.g.,
  // the member left the firm but the row still references them),
  // the radio group's `value` still tracks the id correctly — the
  // user just sees no in-list highlight, which matches reality.
  const currentAssigneeId = assigneeId
  const currentAssigneeInList = currentAssigneeId
    ? assignableMembers.some((member) => member.assigneeId === currentAssigneeId)
    : true
  const showStaleAssigneeRow = currentAssigneeId !== null && !currentAssigneeInList
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          // 2026-05-26 (Yuqi feedback #5 — "可以更大，现在点击 area 太小"):
          // pill expanded to a real click target. Was a tiny chip
          // (px-2 py-0.5, text-xs, 4×4px avatar, 3×3px chevron). Now
          // h-7 (28px) + size-5 avatar + size-3.5 chevron.
          // Same shape rules as other owner pills used in /deadlines
          // queue cells so the picker reads as a real interactive
          // control.
          //
          // 2026-05-28 (Yuqi /clients/[id] polish — "左边的padding
          // 和上下一样，右边保持现在的"): horizontal padding made
          // asymmetric — `pl-1 pr-2.5` (4px left, 10px right) so the
          // avatar circle has the same 4px breathing room from the
          // pill's left edge that it already has from the top + bottom
          // edges (the h-7 / size-5 differential = 4px inset top + 4px
          // bottom). Right side keeps the original 10px so the chevron
          // doesn't feel cramped against the pill border. The 6px gap
          // between avatar + label + chevron is unchanged.
          <button
            type="button"
            aria-label={triggerLabel}
            title={triggerLabel}
            disabled={disabled}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border border-divider-regular bg-background-default pl-1 pr-2.5 text-xs outline-none transition-colors hover:border-divider-deep hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt disabled:cursor-not-allowed disabled:opacity-50',
              name === null ? 'text-text-secondary' : 'text-text-primary',
            )}
          >
            {name === null ? (
              <>
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-background-subtle text-text-tertiary">
                  <UserRoundIcon className="size-3.5" aria-hidden />
                </span>
                <Trans>Unassigned</Trans>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full text-caption-xs font-semibold uppercase tracking-tight',
                    isMine ? 'bg-state-accent-hover-alt text-text-accent' : tint,
                  )}
                >
                  {initialsFromName(name)}
                </span>
                <span className="truncate">{name}</span>
              </>
            )}
            <ChevronDownIcon className="size-3.5 text-text-tertiary" aria-hidden />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup
          value={currentAssigneeId ?? '__unassigned__'}
          onValueChange={(value) => {
            const next = value === '__unassigned__' ? null : value
            if (next === currentAssigneeId) return
            onChange(next)
          }}
        >
          <DropdownMenuRadioItem value="__unassigned__">
            {/* Avatar slot — kept at the same size-5 the member rows
                use so all rows share a single visual rhythm. Previously
                the Unassigned circle was size-4 while members were
                size-5, which made the first row sit visually lower
                than the rest. */}
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-background-subtle text-text-tertiary">
              <UserRoundIcon className="size-3" aria-hidden />
            </span>
            <span>
              <Trans>Unassigned</Trans>
            </span>
          </DropdownMenuRadioItem>
          {/* Stale-assignee row: the client references a member who
              is no longer in the assignable list (e.g., they left the
              firm). Surface it explicitly so the picker doesn't lie
              about who's currently assigned. Selecting it is a no-op
              (already current); the user picks Unassigned or someone
              else to change it. */}
          {showStaleAssigneeRow && currentAssigneeId !== null ? (
            <DropdownMenuRadioItem
              value={currentAssigneeId}
              disabled
              title={t`This member is no longer on the team`}
            >
              <span
                className={cn(
                  'inline-flex size-5 items-center justify-center rounded-full text-caption-xs font-semibold uppercase tracking-tight',
                  tint ?? 'bg-background-subtle text-text-tertiary',
                )}
              >
                {name ? initialsFromName(name) : '?'}
              </span>
              <span className="truncate text-text-tertiary">
                {name ?? <Trans>Former teammate</Trans>}
                <span className="ml-1 text-xs italic">
                  <Trans>(no longer on team)</Trans>
                </span>
              </span>
            </DropdownMenuRadioItem>
          ) : null}
          {/* 2026-05-27 (Yuqi runtime error fix "Route failed: Base UI:
              MenuGroupContext is missing"): empty-state `DropdownMenuItem`
              was nested inside the RadioGroup — Base UI strict-mode
              requires RadioGroup children to all be RadioItems. The
              Separator + empty-state Item now live OUTSIDE the
              RadioGroup. Member RadioItems stay inside. */}
          {assignableMembers.map((member) => {
            const memberTint = getAssigneeTint(member.name)
            const isCurrentUser =
              currentUserName !== null &&
              member.name.trim().toLowerCase() === currentUserName.toLowerCase()
            return (
              <DropdownMenuRadioItem key={member.assigneeId} value={member.assigneeId}>
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full text-caption-xs font-semibold uppercase tracking-tight',
                    isCurrentUser ? 'bg-state-accent-hover-alt text-text-accent' : memberTint,
                  )}
                >
                  {initialsFromName(member.name)}
                </span>
                <span className="truncate">{member.name}</span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
        {assignableMembers.length === 0 ? (
          // Empty-state row. Disabled + muted so it doesn't read as
          // a tappable option, but with enough context that the user
          // knows why the list is empty + where to fix it.
          <DropdownMenuItem
            disabled
            title={t`Invite teammates from Settings → Members to assign work`}
          >
            <span className="text-text-tertiary">
              <Trans>No teammates yet — invite from Settings</Trans>
            </span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Imperative variant of `MissingFactsLabel`. Used on the detail
 * header's destructive Badge where the chip is itself an action
 * (clicking opens the Fix-now sheet). "Add filing state" reads as a
 * call-to-action; "Needs filing state" reads as a status descriptor
 * and was being mis-parsed as an obligation status by users.
 */
function MissingFactsActionLabel({ readiness }: { readiness: ClientReadiness }) {
  if (readiness.missingRequiredFacts.includes('state')) {
    return <Trans>Add filing state</Trans>
  }
  return <Trans>Add client facts</Trans>
}

function ClientContactMetaRow({
  client,
  entityLabel,
  ownerSlot,
}: {
  client: ClientPublic
  entityLabel: string
  ownerSlot: ReactNode
}) {
  // 2026-05-26 (Yuqi macro→micro audit, Fix #11 / §2.4): the row now
  // also carries the identity chips that used to clutter the title
  // cluster — entity badge, owner pill, filing-state chips. They
  // were 4-5 elements jammed into the H1 row; per canonical the
  // title gets 1 chip max, the rest of the identity moves here.
  //
  // 2026-05-26 (rebase): merged with main's `buildClientHeaderContactItems`
  // builder pattern. The builder pre-resolves contact / email /
  // phone / address items (filtering out malformed migration data
  // like the literal `primary_phone` column name). We render the
  // identity chips FIRST (badge → owner → states), then the
  // builder-produced contact items. Row is unconditionally
  // rendered now (was hidden when items.length === 0) because the
  // entity badge always has content.
  const items = buildClientHeaderContactItems(client)
  return (
    <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text-tertiary">
      {/* 2026-05-26 (Yuqi follow-up — "LLC and the assignee are
          weirdly positioned and put together"): the entity badge
          was rendering at the default Badge size (h-5 / 20px tall,
          rounded-full but very thin), sitting next to the owner
          pill which is h-7 (28px). The 8px height delta made them
          look mismatched in scale even though they shared
          rounded-full chrome. Bumped the entity badge to a
          custom shape that matches the owner pill exactly —
          h-7, px-3, same border + bg + text size — so the two
          pills read as one coherent meta row. Gap tightened
          gap-x-3 → gap-x-2 since the pills are now visually
          related siblings rather than two ill-matched chips. */}
      <span
        className="inline-flex h-7 items-center rounded-full border border-divider-regular bg-background-default px-3 text-xs text-text-secondary"
        aria-label={`Entity type: ${entityLabel}`}
      >
        {entityLabel}
      </span>
      {ownerSlot}
      <ClientFilingStateChips client={client} />
      {items.map((item) => (
        <ClientContactMetaItem key={`${item.kind}:${item.value}`} item={item} />
      ))}
    </div>
  )
}

function ClientContactMetaItem({ item }: { item: ClientHeaderContactItem }) {
  const content = (
    <>
      {item.kind === 'contact' ? <UserRoundIcon className="size-3.5 shrink-0" aria-hidden /> : null}
      {item.kind === 'email' ? <MailIcon className="size-3.5 shrink-0" aria-hidden /> : null}
      {item.kind === 'phone' ? <PhoneIcon className="size-3.5 shrink-0" aria-hidden /> : null}
      {item.kind === 'address' ? <MapPinIcon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span className="min-w-0 truncate">{item.value}</span>
    </>
  )

  if (item.kind === 'email') {
    return (
      <a
        href={`mailto:${item.value}`}
        className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm outline-none hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        {content}
      </a>
    )
  }

  if (item.kind === 'phone') {
    return (
      <a
        href={`tel:${item.value}`}
        className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm tabular-nums outline-none hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
      >
        {content}
      </a>
    )
  }

  return <span className="inline-flex min-w-0 max-w-full items-center gap-1">{content}</span>
}

// ─── Suggested-forms catalog (wired to rule catalog) ──────────────────
// PDF §3.3 "Classification": what could this client owe that we haven't
// scheduled yet? We query `rules.listRules` for all active firm rules,
// filter to those whose entityApplicability matches the client's
// entityType and whose jurisdiction matches federal-or-client-state, and
// subtract anything the client already has a generated obligation for
// (matched by ruleId). The "+ Add deadline" button calls
// `obligations.createFromRule`; the server resolves the selected rule into
// concrete due dates and rejects review-only rules instead of accepting
// client-side placeholder dates.
type SuggestedRule = {
  rule: ObligationRule
}

// Map our client.entityType to the rule's EntityApplicability vocabulary.
// The rule schema uses 'any_business', 'any_entity', etc. as wildcards;
// our client.entityType uses concrete values. A rule matches a client if
// its applicability set contains the client's entityType OR a wildcard.
function ruleAppliesToEntity(
  rule: ObligationRule,
  clientEntityType: ClientPublic['entityType'],
): boolean {
  return rule.entityApplicability.some((a) => a === clientEntityType || a === 'any_business')
}

function ruleAppliesToJurisdiction(rule: ObligationRule, clientStates: Set<string>): boolean {
  // Rule jurisdiction is 'FED' for federal, or a state code for state rules.
  if (rule.jurisdiction === 'FED') return true
  return clientStates.has(rule.jurisdiction)
}

function suggestedRulesForClient(
  allRules: readonly ObligationRule[],
  client: ClientPublic,
  existingObligations: readonly ObligationInstancePublic[],
): SuggestedRule[] {
  const clientStates = new Set<string>(client.filingProfiles.map((p) => p.state))
  const scheduledRuleIds = new Set(existingObligations.flatMap((o) => (o.ruleId ? [o.ruleId] : [])))
  return allRules
    .filter((rule) => rule.status === 'active')
    .filter((rule) => !scheduledRuleIds.has(rule.id))
    .filter((rule) => ruleAppliesToJurisdiction(rule, clientStates))
    .filter((rule) => ruleAppliesToEntity(rule, client.entityType))
    .map((rule) => ({ rule }))
}

function SuggestedFormsCatalogPanel({
  client,
  existingObligations,
}: {
  client: ClientPublic
  existingObligations: readonly ObligationInstancePublic[]
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [hidden, setHidden] = useState(false)
  const [pendingRuleId, setPendingRuleId] = useState<string | null>(null)

  const rulesQuery = useQuery(orpc.rules.listRules.queryOptions({ input: { status: 'active' } }))
  const createMutation = useMutation(
    orpc.obligations.createFromRule.mutationOptions({
      onMutate: (variables) => {
        setPendingRuleId(variables.ruleId)
      },
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        toast.success(t`Deadline added`, {
          description: t`${result.obligations.length} deadline created from the rule catalog.`,
        })
        setPendingRuleId(null)
      },
      onError: (err) => {
        toast.error(t`Couldn't add deadline`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
        setPendingRuleId(null)
      },
    }),
  )

  const allRules = rulesQuery.data ?? EMPTY_RULES
  const applicable = useMemo(() => {
    const clientStates = new Set<string>(client.filingProfiles.map((p) => p.state))
    return allRules.filter(
      (rule) =>
        rule.status === 'active' &&
        ruleAppliesToJurisdiction(rule, clientStates) &&
        ruleAppliesToEntity(rule, client.entityType),
    )
  }, [allRules, client.entityType, client.filingProfiles])
  const suggested = useMemo(
    () => suggestedRulesForClient(allRules, client, existingObligations),
    [allRules, client, existingObligations],
  )

  if (rulesQuery.isLoading) {
    // 2026-05-26 (Yuqi tab-body follow-ups, Task 3): loading
    // skeleton frame snapped to canonical `border-divider-regular`
    // so it reads at the same weight as the panel's resolved frame
    // below.
    return (
      <div className="rounded-md border border-divider-regular bg-background-default p-4">
        <Skeleton className="mb-2 h-4 w-40" />
        <Skeleton className="h-3 w-72" />
      </div>
    )
  }
  if (applicable.length === 0) {
    // 2026-05-26 (Yuqi tab-body follow-ups, Task 2 / Fix #10):
    // previously `return null` left the surrounding TabSection
    // ("Suggested forms") with no body — the heading floated alone
    // and a CPA couldn't tell whether the panel was loading, broken,
    // or genuinely empty. Now we render the canonical EmptyState so
    // the section reads cleanly as "nothing here yet, here's why."
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title={<Trans>No applicable forms for this client</Trans>}
        description={
          <Trans>
            No active rule in the catalog matches this client's entity type and filing jurisdiction.
            Add a jurisdiction or check back after rule updates.
          </Trans>
        }
      />
    )
  }

  function addDeadline(suggestion: SuggestedRule) {
    createMutation.mutate({
      clientId: client.id,
      ruleId: suggestion.rule.id,
    })
  }

  return (
    // 2026-05-26 (Yuqi tab-body follow-ups, Task 3): outer frame
    // border snapped from `border-divider-subtle` to the canonical
    // `border-divider-regular` so the panel reads at the same
    // tonal weight as the other section frames on this page
    // (Filing plan year sections, Compliance posture, Risk profile,
    // AI summary). page-family-canonical §9.
    <div className="rounded-md border border-divider-regular bg-background-default">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary">
            <Trans>Forms catalog</Trans>
          </span>
          <span className="inline-flex items-center gap-2 truncate text-xs text-text-tertiary">
            <span>
              <Plural
                value={applicable.length}
                one="# applicable form"
                other="# applicable forms"
              />{' '}
              · {client.name}
            </span>
            {/* D-6e (2026-05-23): the gap count is now a tooltip-
                anchored chip. Hover reveals the actual form list so
                the CPA can scan what's missing without opening the
                accordion. Inert (no click target) — Tooltip is the
                right primitive per Dify's overlay rules.
                2026-05-27 (audit L12): "# gap" was opaque and
                grammatically broken (singular and plural both read
                "# gap"). Switched to "# not yet scheduled" which
                names the actual product state — these are applicable
                forms that don't have a deadline row yet. */}
            {suggested.length > 0 ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge variant="warning" className="cursor-default rounded-sm text-xs">
                      <Plural
                        value={suggested.length}
                        one="# not yet scheduled"
                        other="# not yet scheduled"
                      />
                    </Badge>
                  }
                />
                <TooltipContent className="max-w-sm whitespace-normal text-left">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-text-secondary">
                      <Trans>Missing from this client</Trans>
                    </span>
                    <ul className="flex flex-col gap-0.5">
                      {suggested.slice(0, 6).map((s) => (
                        <li key={s.rule.id} className="flex items-baseline gap-1.5">
                          <span className="font-mono uppercase tabular-nums opacity-70">
                            {s.rule.jurisdiction}
                          </span>
                          <span className="truncate">{s.rule.formName}</span>
                        </li>
                      ))}
                      {suggested.length > 6 ? (
                        <li className="opacity-70">
                          <Trans>+ {suggested.length - 6} more</Trans>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setHidden((v) => !v)}>
          {hidden ? <Trans>Show</Trans> : <Trans>Hide</Trans>}
        </Button>
      </div>
      {hidden ? null : suggested.length === 0 ? (
        <div className="border-t border-divider-subtle px-4 py-3">
          <EmptyState
            icon={CheckCircle2Icon}
            title={<Trans>All applicable rules scheduled</Trans>}
            description={
              <Trans>
                Every active rule the catalog matches to this client already has a generated
                deadline.
              </Trans>
            }
          />
        </div>
      ) : (
        <>
          <div className="border-t border-state-warning-border bg-state-warning-hover/50 px-4 py-2">
            {/* 2026-05-26 (Yuqi macro→micro audit, Fix #7 / §3.3):
                retired uppercase kicker; sentence-case sm-semibold
                matches the canonical section-heading scale. */}
            <p className="text-sm font-semibold text-text-warning">
              <Trans>Suggested</Trans>
              {' · '}
              <Plural value={suggested.length} one="# rule" other="# rules" />
            </p>
            <p className="mt-0.5 text-caption font-normal tracking-normal text-text-secondary normal-case">
              <Trans>Applicable rules with no deadline scheduled yet.</Trans>
            </p>
          </div>
          <div className="grid divide-y divide-divider-subtle">
            {suggested.map((suggestion) => {
              const isPending = pendingRuleId === suggestion.rule.id && createMutation.isPending
              const needsRuleReview =
                suggestion.rule.dueDateLogic.kind === 'source_defined_calendar'
              return (
                <div
                  key={suggestion.rule.id}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-sm font-medium text-text-primary">
                        {suggestion.rule.formName}
                      </p>
                      <span className="text-xs font-medium tracking-eyebrow text-text-tertiary uppercase">
                        {suggestion.rule.jurisdiction}
                      </span>
                    </div>
                    <p className="text-xs leading-snug text-text-tertiary">
                      {suggestion.rule.title}
                      {needsRuleReview ? (
                        <>
                          {' · '}
                          <Trans>Rule review required before this can create a deadline.</Trans>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addDeadline(suggestion)}
                    disabled={createMutation.isPending || needsRuleReview}
                  >
                    {needsRuleReview ? (
                      <AlertTriangleIcon data-icon="inline-start" />
                    ) : isPending ? (
                      <RefreshCwIcon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <PlusIcon data-icon="inline-start" />
                    )}
                    {needsRuleReview ? (
                      <Trans>Rule review required</Trans>
                    ) : (
                      <Trans>Add deadline</Trans>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const EMPTY_RULES: readonly ObligationRule[] = []
