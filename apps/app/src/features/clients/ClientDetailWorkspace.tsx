import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlertTriangleIcon,
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
  SquarePenIcon,
  Trash2Icon,
  UserRoundIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  AuditEventPublic,
  ClientPublic,
  MemberAssigneeOption,
  ObligationInstancePublic,
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
import { cn } from '@duedatehq/ui/lib/utils'

import { EmptyState } from '@/components/patterns/empty-state'
import { InfoBanner } from '@/components/patterns/info-banner'
import { useAppHotkey, useKeyboardShortcutsBlocked } from '@/components/patterns/keyboard-shell'
import { PageHeader } from '@/components/patterns/page-header'
import { formatDatePretty, formatDateTimeWithTimezone } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatTaxCode } from '@/lib/tax-codes'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { CreateObligationDialog } from '@/features/obligations/CreateObligationDialog'
import { useObligationDrawer } from '@/features/obligations/ObligationDrawerProvider'
import { ObligationPanelDispatcher } from '@/features/obligations/ObligationPanelDispatcher'
import {
  useLifecycleV2StatusLabels,
  type ObligationStatus,
} from '@/features/obligations/status-control'
import { useFirmAsOfDate } from '@/features/firm/use-firm-as-of-date'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { useAuditActionLabels } from '@/features/audit/audit-log-labels'
import { formatAuditActionLabel } from '@/features/audit/audit-log-model'

import { ClientCycleArrows } from './ClientCycleArrows'
import { EmailComposeDialog } from './EmailComposeDialog'
import { ClientNotesPanel } from './ClientNotesPanel'
import { ClientNotesStrip } from './ClientNotesStrip'
import { ClientTitleSwitcher } from './ClientTitleSwitcher'
import { ClientCompliancePosturePanel } from './ClientCompliancePosturePanel'
import { FixNeedsFactsSheet } from './FixNeedsFactsSheet'
import { ClientSummaryStrip } from './ClientSummaryStrip'
import { ClientWorkPlanPanel } from './ClientWorkPlanPanel'
import {
  ClientClassificationPanel,
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
  // 2026-06-01 (Yuqi /clients/[id] critique — IA): wraps the
  // `client.write` capability for the Notes slide-in panel. Same
  // permission scope the other client-edit panels (Risk profile,
  // Source details) already gate on; surfacing it here means the
  // sheet trigger renders read-only for coordinators / preparers
  // who can VIEW notes but can't write them.
  const canUpdateClient = permission.can('client.write')
  // 2026-06-01 (Yuqi /clients/[id] critique — IA part 2): notes
  // slide-in is now controlled by the workspace so multiple
  // affordances can open it:
  //   • `<ClientNotesStrip>` — inline preview below PageHeader,
  //     always visible when notes exist. Click → open editor.
  //   • Empty-state "Add notes" Button in the header actions
  //     cluster — only renders when notes are empty (acts as the
  //     discoverable "add notes" CTA).
  //   • The slide-in panel itself — controlled instance mounted
  //     once at the top of the workspace tree.
  const [notesOpen, setNotesOpen] = useState(false)
  const hasClientNotes = (client.notes?.trim().length ?? 0) > 0
  // Body is a 3-tab structure (Work / Client info / Activity) — see
  // docs/Design/client-page-information-architecture.md updated
  // 2026-05-22. URL-bound so deep links land on the right tab.
  // Work is the daily driver (filing plan), Client info carries the
  // configuration surfaces (compliance posture + jurisdictions + risk +
  // onboarding + import source), Activity is lazy-loaded history.
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringLiteral(['work', 'info', 'activity'] as const).withDefault('work'),
  )
  // 2026-05-26 (Yuqi tab-body follow-ups, Task 1): wire 1/2/3 as
  // hotkeys for the three tabs. Mirrors the J/K cycle pattern in
  // ClientCycleArrows — uses `useAppHotkey` (the project's canonical
  // hotkey primitive), gates on `useKeyboardShortcutsBlocked` so the
  // shortcuts stay quiet inside text inputs / dialogs / drawers, and
  // registers `meta` so each shortcut shows up in the global
  // ShortcutHelpDialog (the `?` sheet — that's Task 4 satisfied for
  // free). No on-screen kbd hints yet — power users discover via `?`.
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  // 2026-06-01 (Yuqi /clients/[id] critique — IA): shortcut metadata
  // synced with the tab-label rename. The `?` Keyboard Shortcuts
  // dialog and any other surface that reads `meta.name` /
  // `meta.description` from the hotkey registry now show the new
  // tab labels (Filing plan / Setup / History) and accurate
  // descriptions (Activity → History no longer mentions "notes"
  // because Notes moved to a slide-in panel).
  useAppHotkey('1', () => void setActiveTab('work'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.work',
      name: 'Filing plan tab',
      description: "Switch to the client's Filing plan tab.",
      category: 'navigate',
      scope: 'route',
    },
  })
  useAppHotkey('2', () => void setActiveTab('info'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.info',
      name: 'Setup tab',
      description: 'Switch to the Setup tab (compliance posture, jurisdictions, risk, onboarding).',
      category: 'navigate',
      scope: 'route',
    },
  })
  useAppHotkey('3', () => void setActiveTab('activity'), {
    enabled: !shortcutsBlocked,
    meta: {
      id: 'clients.tab.activity',
      name: 'History tab',
      description: 'Switch to the History tab (AI summary + audit log).',
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
        // clients.get drives the live `client` the detail page derives
        // readiness + compliance posture from — invalidate it so the
        // late-filing flag / onboarding checklist re-render after a save.
        void queryClient.invalidateQueries({ queryKey: orpc.clients.get.key() })
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
        // clients.get carries client.filingProfiles, which feeds the
        // onboarding "Filing jurisdiction" readiness row — invalidate it so
        // adding the missing jurisdiction flips that row immediately.
        void queryClient.invalidateQueries({ queryKey: orpc.clients.get.key() })
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
  // Classification reclassification lands its own toast + atomic apply
  // inside ClassificationImpactDialog (it owns the
  // `applyClassificationRecompute` mutation). This callback only fans
  // out the cache invalidation so every downstream surface — the client
  // record, the directory list, the dashboard counts, both obligation
  // lists, the risk summary, and the audit log — repaints with the
  // recomputed deadlines. Mirrors the invalidation set the other
  // client-edit mutations above use.
  const handleClassificationApplied = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orpc.clients.get.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.clients.getRiskSummary.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
  }, [queryClient])

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

  // Delete state + mutation. The server still performs the compliance-safe
  // `deletedAt` write; active deadline/dashboard queries filter the client out
  // while audit history remains available.
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteMutation = useMutation(
    orpc.clients.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
        toast.success(t`Client deleted`, { description: client.name })
        setDeleteOpen(false)
        void navigate('/clients')
      },
      onError: (err) => {
        toast.error(t`Couldn't delete client`, {
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
                {/* 2026-06-01 (Yuqi /clients/[id] critique — IA part 2):
                    Notes affordance in the actions cluster ONLY renders
                    when the client has no notes yet. With notes, the
                    inline `<ClientNotesStrip>` below the PageHeader is
                    the canonical read+edit affordance; an extra header
                    button would duplicate the entry point.
                    Without notes, the strip auto-suppresses and this
                    button is the discoverable "add notes" CTA. RBAC:
                    hidden when the user lacks `client.write`. */}
                {canUpdateClient && !hasClientNotes ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNotesOpen(true)}
                    aria-label={t`Add notes`}
                  >
                    <ScrollTextIcon data-icon="inline-start" />
                    <Trans>Add notes</Trans>
                  </Button>
                ) : null}
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
                  onDelete={() => setDeleteOpen(true)}
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

            {/* 2026-06-01 (Yuqi /clients/[id] critique — IA part 2):
                Notes strip lives above the alerts band — notes are
                *persistent context* that anyone interacting with this
                client should glance at (preferred call window,
                sensitivities, history). Reads as identity context,
                NOT a now-signal. The strip auto-suppresses when the
                client has no notes (the empty-state "Add notes" CTA
                lives in the header actions cluster instead). Click
                anywhere on the strip → opens the controlled slide-in
                panel mounted at the bottom of this tree. */}
            <ClientNotesStrip
              client={client}
              canWrite={canUpdateClient}
              onOpenEditor={() => setNotesOpen(true)}
            />

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
                daily work. Tabs separate the three jobs cleanly:
                  • Work       — what do they owe right now?
                  • Client info — who is this client?
                  • Activity   — what happened recently? (lazy) */}
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (value === 'work' || value === 'info' || value === 'activity') {
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
                    Sizes match the deadline drawer at `size-3.5` so
                    glyph weight stays consistent across surfaces.

                    2026-06-01 (Yuqi /clients/[id] critique — IA
                    labels): tab labels renamed to honor what's
                    actually inside each tab. URL keys (`?tab=work`
                    etc.) stay stable for backwards compat — only
                    the visible label changes.
                      • work          → "Filing plan"
                          (was "Work" — narrowed to match the single
                          ClientWorkPlanPanel inside)
                      • info          → "Setup"
                          (was "Client info" — 5 sections of
                          tax-setup data, not contact info)
                      • activity      → "History"
                          (was "Activity" — read-mode history once
                          Notes moves out to a slide-in panel)
                */}
                <ClientDetailTabTrigger value="work" activeTab={activeTab} compact={panelOpen}>
                  <ClipboardListIcon className="size-3.5" aria-hidden />
                  <span data-tab-label>
                    <Trans>Filing plan</Trans>
                  </span>
                </ClientDetailTabTrigger>
                <ClientDetailTabTrigger value="info" activeTab={activeTab} compact={panelOpen}>
                  <UserRoundIcon className="size-3.5" aria-hidden />
                  <span data-tab-label>
                    <Trans>Setup</Trans>
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
                    // 2026-06-01: hand-rolled h-4 min-w-4 count bubble
                    // swapped for Badge size='sm' warning. Audit P2-2's
                    // accessible-name (title + aria-label) stays so AT
                    // users still hear "# required fact(s) missing".
                    <Badge
                      variant="warning"
                      size="sm"
                      className="ml-1.5 tabular-nums"
                      title={t`${readiness.missingRequiredFacts.length} required fact(s) missing`}
                      aria-label={t`${readiness.missingRequiredFacts.length} required fact(s) missing`}
                    >
                      {readiness.missingRequiredFacts.length}
                    </Badge>
                  ) : null}
                </ClientDetailTabTrigger>
                <ClientDetailTabTrigger value="activity" activeTab={activeTab} compact={panelOpen}>
                  <ActivityIcon className="size-3.5" aria-hidden />
                  <span data-tab-label>
                    {/* 2026-06-01: "Activity" → "History" once Notes
                        moves to its own slide-in panel. The tab
                        becomes coherently read-mode (AI summary +
                        Activity log = the story of what's happened),
                        no longer mixing a write-mode Notes block. */}
                    <Trans>History</Trans>
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

                {/* Tax classification — the entity-type + federal
                    tax-classification pair that decides which forms the
                    deadline generator emits. Editing it doesn't save
                    inline; "Review impact…" opens an impact dialog that
                    previews the add/remove fan-out and applies the
                    reclassification atomically (recomputing obligations
                    + writing an audit reason). */}
                <TabSection
                  title={t`Tax classification`}
                  summary={t`Changing this recomputes which forms this client owes`}
                >
                  <div className="rounded-md border border-divider-regular bg-background-default p-4">
                    <ClientClassificationPanel
                      key={`${client.id}:classification`}
                      client={client}
                      onApplied={handleClassificationApplied}
                    />
                  </div>
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
                value="activity"
                className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6"
              >
                {/* Activity content only renders when the tab is the
                    active one — the surrounding TabsContent gates the
                    AI summary + audit log queries that fire inside. */}
                <TabSection
                  title={t`Activity summary`}
                  summary={
                    riskSummaryQuery.data?.generatedAt
                      ? t`Refreshed ${formatDateTimeWithTimezone(riskSummaryQuery.data.generatedAt, firmTimezone)}`
                      : t`Auto-drafted from recent activity`
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
                      {/* Only badge a real generated insight (or a failure).
                          The data-driven auto-draft shown before generation
                          has no generatedAt — a "Pending" chip next to a
                          populated recap would read as broken. */}
                      {riskSummaryQuery.data &&
                      (riskSummaryQuery.data.generatedAt ||
                        riskSummaryQuery.data.status === 'failed') ? (
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

                {/* 2026-06-01 (Yuqi /clients/[id] critique — IA):
                    Notes block lifted out of the History tab body
                    to a dedicated slide-in panel anchored in the
                    PageHeader actions cluster (`<ClientNotesPanel>`
                    above). Notes is a write-mode interaction that
                    didn't share the read-mode rhythm of this tab.
                    Removing it lets History read coherently as
                    "the story of what's happened" — AI summary +
                    audit log. */}

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
        {/* 2026-06-07 (Pencil tZ0BB + thUSa — /clients/[id] pixel
            pass): the right rail reconciles both detail nodes into one
            responsive surface. At rest (no obligation selected) the
            aside hosts the persistent Snapshot / Engagement / Contacts
            rail at a fixed 320px on xl+, stacked full-width below xl.
            When an obligation row is clicked the same aside swaps to
            the existing obligation panel at 60% width — the prior
            slide-in behavior is preserved exactly; the rail simply
            occupies the otherwise-empty slot when no row is open. */}
        <aside
          data-slot="obligation-detail-panel"
          data-open={activeObligationId ? 'true' : 'false'}
          className={cn(
            'min-w-0 shrink-0 self-stretch overflow-hidden',
            // Below xl: the rail stacks full-width under the primary
            // column; the obligation panel also goes full-width when
            // open. Always shown below xl so the rail is reachable.
            'flex w-full',
            // xl+: always present as a flex slot, width-animated.
            'xl:flex xl:h-full xl:min-h-0',
            'xl:transition-[width,margin-right] xl:duration-300 xl:ease-apple motion-reduce:transition-none',
            // At rest on xl+: fixed 320px rail (Pencil RightRail width).
            // The parent's xl:gap-6 provides the 24px gutter.
            'xl:mr-0 xl:w-80',
            // Obligation open: widen to 60% to match AlertDetailDrawer's
            // wrapper (one width contract across the product's
            // right-rail panels).
            activeObligationId && 'xl:w-[60%]',
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
          ) : (
            <ClientDetailRail client={client} openCount={workPlan.openCount} />
          )}
        </aside>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-destructive">
              <Trans>Delete {client.name}?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-destructive-secondary">
              <Trans>
                This removes the client and its deadlines from active lists, Deadlines, and
                dashboard views. Audit history stays retained for compliance records.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: client.id })}
            >
              <Trash2Icon data-icon="inline-start" />
              <Trans>Delete client</Trans>
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
      {/* 2026-06-01 (Yuqi /clients/[id] critique — IA part 2): the
          controlled Notes slide-in panel. Mounted once at the
          workspace's root so multiple affordances (strip, header
          "Add notes" CTA, future keyboard shortcut) all open the
          same instance via `setNotesOpen(true)`. The Sheet is
          portal-rendered, so the tree position doesn't affect
          stacking. */}
      <ClientNotesPanel
        client={client}
        canWrite={canUpdateClient}
        open={notesOpen}
        onOpenChange={setNotesOpen}
      />
    </>
  )
}

/**
 * 2026-06-07 (Pencil tZ0BB + thUSa — /clients/[id] pixel pass):
 * persistent right rail. Three stacked cards — Snapshot, Engagement,
 * Contacts — matching the canvas RightRail frame (320px, 14px radius
 * cards, 18px padding, uppercase mono section labels).
 *
 * Data sourcing:
 *   - Snapshot › Open deadlines → live (`openCount`).
 *   - Snapshot › Filed YTD / Outstanding tasks / Last filed →
 *     TODO(data): no YTD-filed count, task count, or last-filed event
 *     in the contracts. Static fallbacks per the canvas.
 *   - Engagement (type / letter / retainer / renews) →
 *     TODO(data): engagement-plan + retainer fields are not in the
 *     ClientPublic contract. Static fallbacks per the canvas.
 *   - Contacts → live primary contact + email when present
 *     (buildClientHeaderContactItems); static sample list otherwise.
 */
function ClientDetailRail({ client, openCount }: { client: ClientPublic; openCount: number }) {
  const { t } = useLingui()
  const contactItems = useMemo(() => buildClientHeaderContactItems(client), [client])
  const primaryContactName = contactItems.find((item) => item.kind === 'contact')?.value ?? null
  const primaryContactEmail = contactItems.find((item) => item.kind === 'email')?.value ?? null
  // Compose modal (Pencil W7onE). Opening it from a contact prefills the
  // recipient + client context; sending is gated behind a future
  // email-send RPC (the modal flags this — see EmailComposeDialog).
  const [composeFor, setComposeFor] = useState<{ name: string; email: string } | null>(null)

  // TODO(data): the engagement plan, retainer, last-filed event, and
  // YTD/outstanding counts are not in the contracts. Static fallbacks
  // mirror the canvas so the rail reads complete; swap to live data
  // when those fields ship.
  const contacts =
    primaryContactName || primaryContactEmail
      ? [
          {
            name: primaryContactName ?? t`Primary contact`,
            role: t`Primary contact`,
            email: primaryContactEmail,
          },
        ]
      : [
          { name: 'Sarah Hudson', role: t`Partner`, email: 'sarah@hudsonwells.com' },
          { name: 'Tom Wells', role: t`Controller`, email: 'tom@hudsonwells.com' },
          { name: 'Lisa Chen', role: t`Bookkeeper`, email: 'lisa@hudsonwells.com' },
        ]

  return (
    <div className="flex w-full min-w-0 flex-col gap-[18px] overflow-y-auto">
      {/* Snapshot card */}
      <section className="flex flex-col gap-[14px] rounded-2xl border border-divider-regular bg-background-default p-[18px]">
        <RailSectionLabel>{t`SNAPSHOT`}</RailSectionLabel>
        <div className="flex flex-col gap-0.5">
          <span className="text-4xl font-semibold leading-none tracking-tight text-text-primary tabular-nums">
            {openCount}
          </span>
          <span className="text-xs text-text-secondary">
            <Trans>Open deadlines</Trans>
          </span>
        </div>
        <div className="h-px w-full bg-divider-regular" />
        <RailMetricRow label={t`Filed YTD`} value="11" />
        <RailMetricRow label={t`Outstanding tasks`} value="3" />
        <div className="flex flex-col gap-1 border-t border-divider-regular pt-2.5">
          <span className="text-[11px] text-text-tertiary">
            <Trans>Last filed</Trans>
          </span>
          <span className="text-sm font-medium text-text-primary">
            Feb 28, 2026 — Form 1099 batch
          </span>
        </div>
      </section>

      {/* Engagement card */}
      <section className="flex flex-col gap-[14px] rounded-2xl border border-divider-regular bg-background-default p-[18px]">
        <RailSectionLabel>{t`ENGAGEMENT`}</RailSectionLabel>
        <span className="text-[15px] font-semibold text-text-primary">
          <Trans>Tax + bookkeeping</Trans>
        </span>
        <div className="flex flex-col gap-2">
          <RailStackRow label={t`Engagement letter signed`} value="Jan 14, 2026" />
          <RailStackRow label={t`Retainer`} value={t`$12,000 / year`} />
          <RailStackRow label={t`Renews`} value="Jan 14, 2027" />
        </div>
        <div className="border-t border-divider-regular pt-2.5">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-semibold text-text-accent outline-none hover:underline focus-visible:underline"
          >
            <Trans>View engagement letter</Trans>
            <ChevronRightIcon className="size-3.5" aria-hidden />
          </button>
        </div>
      </section>

      {/* Contacts card */}
      <section className="flex flex-col gap-[14px] rounded-2xl border border-divider-regular bg-background-default p-[18px]">
        <RailSectionLabel>{t`CONTACTS`}</RailSectionLabel>
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <div key={contact.name} className="flex items-center gap-2.5">
              <AssigneeAvatar name={contact.name} isMine={false} title={contact.name} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-text-primary">
                    {contact.name}
                  </span>
                  <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-text-muted" />
                  <span className="shrink-0 text-xs text-text-secondary">{contact.role}</span>
                </div>
                {contact.email ? (
                  <span className="truncate font-mono text-[11px] text-text-tertiary">
                    {contact.email}
                  </span>
                ) : null}
              </div>
              {contact.email ? (
                <ComposeContactButton
                  name={contact.name}
                  email={contact.email}
                  onCompose={setComposeFor}
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <EmailComposeDialog
        open={composeFor !== null}
        onOpenChange={(next) => {
          if (!next) setComposeFor(null)
        }}
        recipientName={composeFor?.name ?? ''}
        recipientEmail={composeFor?.email ?? null}
        defaultSubject={t`${client.name} — a quick update from your CPA`}
        contextRows={[
          { id: 'linked', label: <Trans>Linked to</Trans>, value: client.name },
          {
            id: 'open',
            label: <Trans>Open deadlines</Trans>,
            value: <span className="tabular-nums">{openCount}</span>,
          },
        ]}
        senderNote={
          <Trans>This message is sent via DueDateHQ and logged to the audit ledger.</Trans>
        }
      />
    </div>
  )
}

// Per-contact compose trigger. Takes `email` as a non-null string so
// the recipient payload needs no type assertion at the call site.
function ComposeContactButton({
  name,
  email,
  onCompose,
}: {
  name: string
  email: string
  onCompose: (recipient: { name: string; email: string }) => void
}) {
  const { t } = useLingui()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="ml-auto shrink-0"
      aria-label={t`Compose email to ${name}`}
      title={t`Compose email`}
      onClick={() => onCompose({ name, email })}
    >
      <SquarePenIcon />
    </Button>
  )
}

function RailSectionLabel({ children }: { children: ReactNode }) {
  return <span className="text-[10px] font-bold tracking-wide text-text-muted">{children}</span>
}

function RailMetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">
        {value}
      </span>
    </div>
  )
}

function RailStackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-text-tertiary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  )
}

type ClientDetailTabKey = 'work' | 'info' | 'activity'

// ClientDetailTabTrigger — adopts the canonical /deadlines
// ObligationQueueScopeTab visual contract for the three detail-page
// tabs (Work / Client info / Activity).
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
  onDelete,
}: {
  clientId: string
  clientName: string
  canReadAudit: boolean
  onDelete: () => void
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  // 2026-06-02 (browser comment): destructive client removal stays in the
  // overflow, but now uses the direct "Delete" verb and red menu variant.
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
          onClick={onDelete}
          aria-label={t`Delete ${clientName}`}
          variant="destructive"
        >
          <Trash2Icon className="size-4" aria-hidden />
          <Trans>Delete client</Trans>
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
            {/* 2026-06-01: hand-rolled size-5 avatar circles
                consolidated onto the shared AssigneeAvatar primitive
                (size='xs'). Same null-name → Unassigned glyph branch +
                isMine accent tint live inside the primitive now. */}
            {name === null ? (
              <>
                <AssigneeAvatar name={null} size="xs" title={triggerLabel} />
                <Trans>Unassigned</Trans>
              </>
            ) : (
              <>
                <AssigneeAvatar name={name} isMine={isMine} size="xs" title={triggerLabel} />
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
            {/* Avatar slot — size='xs' (size-5) so the Unassigned row
                shares one visual rhythm with the member rows below.
                2026-06-01: hand-rolled circle swapped for AssigneeAvatar
                primitive (null name = Unassigned glyph). */}
            <AssigneeAvatar name={null} size="xs" title={t`Unassigned`} />
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
              {/* 2026-06-01: stale-assignee chip swapped to AssigneeAvatar
                  (size='xs'). The primitive picks the same per-name tint
                  via getAssigneeTint and falls back to the unassigned
                  glyph when name is null. */}
              <AssigneeAvatar name={name} size="xs" title={name ?? t`Former teammate`} />
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
            const isCurrentUser =
              currentUserName !== null &&
              member.name.trim().toLowerCase() === currentUserName.toLowerCase()
            return (
              <DropdownMenuRadioItem key={member.assigneeId} value={member.assigneeId}>
                {/* 2026-06-01: member avatars consolidated onto
                    AssigneeAvatar (size='xs', isMine for current user
                    accent tint). */}
                <AssigneeAvatar
                  name={member.name}
                  isMine={isCurrentUser}
                  size="xs"
                  title={member.name}
                />
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
      {/* 2026-06-01: entity-kind chip routed through Badge outline lg.
          h-7 override stays as className because the entity pill needs
          to match the adjacent owner pill's 28px height exactly (lg's
          baseline is h-6). */}
      <Badge
        variant="outline"
        shape="pill"
        size="lg"
        className="h-7"
        aria-label={`Entity type: ${entityLabel}`}
      >
        {entityLabel}
      </Badge>
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
