import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ActivityIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  CheckIcon,
  ClipboardListIcon,
  CopyIcon,
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
  Trash2Icon,
  UserRoundIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  AuditEventPublic,
  AiInsightPublic,
  ClientPublic,
  MemberAssigneeOption,
  ObligationInstancePublic,
  ObligationQueueRow,
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
import { formatDateTimeWithTimezone } from '@/lib/utils'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { TaxCodeBadge } from '@/components/primitives/tax-code-label'
import { formatTaxCode } from '@/lib/tax-codes'
import { useCurrentUserName } from '@/lib/use-current-user-name'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { INITIAL_CURSOR } from '@/features/obligations/queue/constants'
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
import { TabSection } from './ClientFactsWorkspace'

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
} from './client-detail-model'

const EMPTY_OBLIGATIONS: readonly ObligationInstancePublic[] = []
const EMPTY_QUEUE_ROWS: readonly ObligationQueueRow[] = []

function formatJurisdictionSummary(client: ClientPublic): string {
  const stateCount = getClientFilingStates(client).length
  if (stateCount === 0) return 'Missing filing state'
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
  // Sections are flat (no DetailSection collapsible), so the "scroll
  // me into view" callback just scrolls — no panel state to toggle.
  const canReadAudit = permission.can('audit.read')
  const canUpdateObligationStatus = permission.can('obligation.status.update')
  // Wraps the `client.write` capability for the Notes slide-in panel.
  // Same permission scope the other client-edit panels (Risk profile,
  // Source details) already gate on; surfacing it here means the
  // sheet trigger renders read-only for coordinators / preparers
  // who can VIEW notes but can't write them.
  const canUpdateClient = permission.can('client.write')
  // Notes slide-in is controlled by the workspace so multiple
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
  // docs/Design/client-page-information-architecture.md. URL-bound so
  // deep links land on the right tab.
  // Work is the daily driver (filing plan), Client info carries the
  // configuration surfaces (compliance posture + jurisdictions + risk +
  // onboarding + import source), Activity is lazy-loaded history.
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringLiteral(['work', 'info', 'activity'] as const).withDefault('work'),
  )
  // Which filing row is expanded. Single string = strict accordion
  // (only one open at a time), deep-linkable via ?expanded= per
  // deadline-row-interaction.md §5.
  const [expandedFilingId, setExpandedFilingId] = useQueryState(
    'expanded',
    parseAsString.withDefault(''),
  )
  // Wire 1/2/3 as hotkeys for the three tabs. Mirrors the J/K cycle
  // pattern in ClientCycleArrows — uses `useAppHotkey` (the project's canonical
  // hotkey primitive), gates on `useKeyboardShortcutsBlocked` so the
  // shortcuts stay quiet inside text inputs / dialogs / drawers, and
  // registers `meta` so each shortcut shows up in the global
  // ShortcutHelpDialog (the `?` sheet — that's Task 4 satisfied for
  // free). No on-screen kbd hints yet — power users discover via `?`.
  const shortcutsBlocked = useKeyboardShortcutsBlocked()
  // Shortcut metadata stays in sync with the tab labels. The `?`
  // Keyboard Shortcuts dialog and any other surface that reads
  // `meta.name` / `meta.description` from the hotkey registry shows the
  // tab labels (Filing plan / Setup / History) and descriptions
  // (History no longer mentions "notes" because Notes moved to a
  // slide-in panel).
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
    openDrawer: openObligationPanel,
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
  // The queue list filtered by this client returns ObligationQueueRow[]
  // (assigneeName, daysUntilDue, readiness, evidenceCount) that
  // DeadlineRow needs — the richer shape `listByClient`
  // (ObligationInstancePublic) does not carry. One page is enough (a
  // single client rarely has >100 deadlines).
  const clientQueueQuery = useQuery(
    orpc.obligations.list.queryOptions({
      input: {
        sort: 'due_asc' as const,
        limit: 100,
        cursor: INITIAL_CURSOR,
        clientIds: [client.id],
      },
    }),
  )
  const queueRows = clientQueueQuery.data?.rows ?? EMPTY_QUEUE_ROWS
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
  // Anchor the work plan summary on the firm's "as of" date instead of
  // the browser's wall clock. Keeps "overdue" / "needs review" /
  // "extension payment due" counts in sync with the rest of the client
  // surfaces (and with the server's day-math on the obligations queue).
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // Owner reassignment. Powers the H1 owner-pill dropdown so clicking
  // "Unassigned" / "M. Chen" opens a real picker. Reuses the same
  // `clients.bulkUpdateAssignee` procedure the /clients list bulk-bar
  // uses, with a single-id payload so the audit-log breadcrumb stays
  // consistent.
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
  // The chip lives on the Work tab header but the jurisdiction form
  // lives on the Client info tab, so scrolling alone would leave the
  // user on Work with nothing visibly changed. Switch the tab first,
  // then RAF the scroll so the section is in the DOM before we try to
  // align it.
  const openFilingJurisdictions = useCallback(() => {
    void setActiveTab('info')
    window.requestAnimationFrame(() => {
      document
        .getElementById('client-filing-jurisdictions')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [setActiveTab])

  // The H1 "Add filing state" / "Needs facts" chip opens the same
  // inline batch sheet the /clients list page uses, so the fix-state
  // journey matches across surfaces (2 clicks instead of the tab+scroll
  // path's ~6).
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  const showSourceFields =
    getClientSourceType(client) === 'imported' ||
    Boolean(client.externalClientId || client.sourceStatus)

  return (
    <>
      {/* Outer container is a flex column on small viewports and a flex
          row at xl+. The left column owns its OWN scroll container
          (PageHeader + metadata pinned, tab body scrolls); the right
          panel slides in motion-animated 0→600 when a filing row is
          clicked. No page-level scroll on the document body — only the
          tab body scrolls. Mirrors /deadlines exactly. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-6">
        {/* Left page column carries the gutter + top padding (the route section
            has none) so the obligation panel — a sibling below — reaches the
            right edge edge-to-edge (Yuqi #3/#9). */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-5 md:px-8 md:pt-6">
          <PageHeader
            // The canonical `breadcrumbs` prop, styled as a friendly
            // link with chevron separator + ⌘[ hint. Lines up with
            // /settings, /members, /billing.checkout. `eyebrowAside`
            // still carries the 1/N ClientCycleArrows pagination on the
            // right of the same eyebrow row (PageHeader supports both —
            // see `page-header.tsx`).
            breadcrumbs={[{ label: t`Clients`, to: '/clients' }]}
            // The prev/next pagination belongs on the BREADCRUMB row,
            // not in the H1 actions cluster. The < Clients back-link
            // sits on the left of the eyebrow row; 1/9 sits on the
            // right of the same row via the eyebrowAside slot, with the
            // PageHeader providing `justify-between`. Action cluster
            // (⋯ + Add deadline) stays in the title row — those
            // ARE page-level controls scoped to this client.
            eyebrowAside={<ClientCycleArrows currentClientId={client.id} />}
            // VtC73 client-detail title scale: 36/600 display-large (vs the
            // standard 28px page title), with tightened display tracking. When
            // the obligation panel is open the client column is squeezed, so the
            // name drops to 28px (text-2xl) — 36px is too large for the narrowed
            // master (Yuqi "on right panel open, the client name drops size").
            titleClassName={cn(
              'leading-tight tracking-display',
              panelOpen ? 'text-2xl' : 'text-display-large',
            )}
            title={
              // Title cluster is title + 1 readiness chip per canonical
              // (page-family-canonical §3 — title + ≤1 chip). Entity
              // badge, owner pill, and filing-state chips live DOWN in
              // ClientContactMetaRow so the H1 line reads as
              // identification, not a stat strip.
              // The chip sits on its OWN row BELOW the title: sharing a
              // flex-wrap row with the title pushed the chip onto a 2nd
              // line OR forced the title to wrap to 3 lines in narrow
              // layouts. Shape:
              //   • Row 1: ClientTitleSwitcher (truncates if narrow)
              //   • Row 2: optional readiness chip (only when status
              //            === 'needs_facts')
              // Both rows are `min-w-0` so they shrink gracefully when
              // the right panel opens and the H1 column collapses.
              // 2026-06-10 (Yuqi — Pencil ibWOx): the status chip moves
              // INLINE with the title (a health pill, per the canvas),
              // flex-wrapping below only when the title truncates. One chip,
              // picked from the real state: needs-facts (config gap) wins;
              // else a derived health pill — "At risk" when there are
              // statutory-late unextended filings, "Healthy" otherwise.
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <ClientTitleSwitcher client={client} />
                {readiness?.status === 'needs_facts' ? (
                  // Badge tone is warning, not destructive: "Add filing
                  // state" is incomplete configuration, not a destructive
                  // state; warning matches the needs-facts banner tone.
                  <Badge
                    variant="warning"
                    className="cursor-pointer text-xs"
                    render={<button type="button" onClick={openMissingFacts} />}
                  >
                    <SettingsIcon className="size-3" aria-hidden />
                    <MissingFactsActionLabel readiness={readiness} />
                  </Badge>
                ) : workPlan.statutoryLateUnextendedCount > 0 ? (
                  // Destructive tone (red), matching Pencil V1kJX's At-Risk
                  // pill (state-destructive-hover): statutory-late unextended
                  // filings are a genuine-risk state, not a config warning, so
                  // it reads red — distinct from the amber needs-facts chip.
                  <Badge variant="destructive" className="text-xs">
                    <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
                    <Trans>At risk</Trans>
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-xs">
                    <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
                    <Trans>Healthy</Trans>
                  </Badge>
                )}
              </span>
            }
            // `ClientContactMetaRow` (entity badge / owner pill / state
            // chips / email / phone / address) sits in the PageHeader's
            // metaRow slot at the canonical `gap-2` (8px) below the H1,
            // so title and identity facts read as one anchored block
            // instead of "client name then a void."
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
            // Subtitle is suppressed when the readiness gap chip is
            // present in the H1 chip cluster. The "Missing filing state"
            // chip is itself the page-level signal; piling a workPlan
            // summary line on top stacks two summary lines ("alert chip
            // row" + "N open filings · …") and feels noisy. When the
            // alert chip is there, it owns the sub-h1 slot; the workPlan
            // summary returns once the gap is resolved. Subtitle keeps
            // rendering for every other client so the at-a-glance state
            // stays visible.
            // Work-plan status line moved into the summary strip's "Next due"
            // stat (Yuqi #5); the Healthy/At-risk title pill carries the
            // overall health, so the sub-h1 line is no longer needed.
            description={null}
            actions={
              <>
                {/* Notes affordance in the actions cluster ONLY renders
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
                {/* ClientCycleArrows lives in the eyebrowAside slot,
                    not here. Actions carry only the page-level controls
                    scoped to this client (overflow ⋯ + Add deadline). */}
                <ClientHeaderOverflowMenu
                  clientId={client.id}
                  clientName={client.name}
                  canReadAudit={canReadAudit}
                  onDelete={() => setDeleteOpen(true)}
                />
                <CreateObligationDialog
                  defaultClientId={client.id}
                  trigger={
                    panelOpen ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="default"
                        aria-label={t`Add deadline`}
                        title={t`Add deadline`}
                      >
                        <PlusIcon className="size-4" aria-hidden />
                      </Button>
                    ) : (
                      // Primary CTA — filled (solid background), not the faint
                      // outline default trigger that read as a bare link.
                      <Button type="button" size="sm" variant="default">
                        <PlusIcon data-icon="inline-start" />
                        <Trans>Add deadline</Trans>
                      </Button>
                    )
                  }
                />
              </>
            }
          />

          {/* Body — client-context content. The outer xl:flex-row
            split (one wrapper above) already separates this from the
            right-rail obligation panel, so this section just renders
            the column-of-content inline. ClientContactMetaRow lives in
            the PageHeader `metaRow` slot above (not here) so the
            identity row sits tight against the H1. */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
            {/* Inline tip pairs the needs-facts signal with a
                dismissable CTA. The H1 chip
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

            {/* Notes moved to the right rail (2026-06-10, Yuqi "move notes to
                the right sidebar") — they're persistent identity context, so
                they sit alongside Contacts in the rail rather than in the
                main scan column. See <ClientDetailRail>. */}

            {/* Active alerts moved to the right rail (2026-06-10, Yuqi "move
                alert to the right side panel as well") — they're per-client
                signals that belong beside Notes + Contacts, not in the scan
                column. The summary strip stays above the tabs: it's the
                client's at-a-glance state. */}
            <ClientSummaryStrip
              client={client}
              obligations={obligations}
              isLoading={obligationsQuery.isLoading}
            />

            {/* Body split: the filing-plan tabs on the left, the per-client
                rail (Notes / Contacts / Alerts) on the right — aligned with
                the tab content, BELOW the now-full-width header + summary
                strip (VtC73). The rail collapses when the obligation panel
                opens; the panel (a sibling of this whole column) then pushes
                the full-width header + body left. */}
            <div className="flex min-h-0 flex-1 flex-col gap-6 xl:flex-row xl:items-stretch xl:gap-6">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {/* Tabbed body. Reasoning in
                docs/Design/client-page-information-architecture.md.
                Content grew past the point where a flat list of
                collapsibles reads cleanly, and "compliance posture" is
                client info (identity facts), not daily work. Tabs
                separate the three jobs cleanly:
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
                  // Tabs root is its own flex column inside the workspace.
                  // TabsList sits shrink-0 at the top; the active
                  // TabsContent fills the remaining height with its own
                  // overflow-y-auto. Without this, the whole detail page
                  // scrolls as one.
                  className="flex min-h-0 flex-1 flex-col"
                >
                  {/* Tab bar matches the /deadlines scope-tabs visual —
                  left-aligned, hug-content triggers (no flex-1),
                  transparent background, single hairline border. The
                  primitive's `variant="line"` provides the
                  underline-on-active treatment. Triggers are overridden
                  below to drop the primitive's `flex-1` so each tab hugs
                  its label (matches /deadlines instead of spreading
                  full-width). */}
                  {/* Active-tab underline is a single `<motion.span
                  layoutId>` rendered inside whichever trigger is active,
                  not the primitive's CSS-only `data-active:after:`.
                  Framer Motion smoothly slides the underline between
                  tabs on click (spring 500 / damping 38) — the same
                  pattern that powers /deadlines
                  `ObligationQueueScopeTab`. Active text stays
                  `text-text-primary`; the moving underline carries the
                  active signal. Inactive triggers gain a transparent
                  2px bottom border that turns `divider-deep` on hover so
                  the row reads warm at rest, matching /deadlines hover
                  symmetry. */}
                  {/* TabsList carries the `border-b` seam (matching the /deadlines
                  + /alerts detail tab bars) so the tabs read as part of the
                  header rather than floating. 2026-06-16 (Yuqi "still squashed
                  underline"): the segmented-tabs PRIMITIVE forces `h-8` on the
                  list and `p-[3px]` inset padding (for the pill variant) — that
                  capped the trigger height so `py-3` got clipped (underline 1px
                  under the label) AND left the border-b 3px below the triggers
                  (underline floating off the seam). `!h-auto` + `p-0` here strip
                  both: the triggers' own `py-3` now defines the height, and the
                  active motion.span at `-bottom-px` lands exactly on the seam
                  (verified: 11px label→underline gap, underline mid on the
                  border). */}
                  <TabsList
                    variant="line"
                    className="flex !h-auto shrink-0 items-stretch gap-6 overflow-x-auto border-b border-divider-subtle bg-transparent p-0 text-sm"
                  >
                    {/* Leading lucide glyph per tab. Matches the deadline
                    drawer's tab bar (paperclip / calendar / file) and
                    gives the row a stronger "scan me" affordance — the
                    icons help the CPA recognize the destination before
                    they read the word. Sizes match the deadline drawer
                    at `size-3.5` so glyph weight stays consistent across
                    surfaces.

                    Tab labels honor what's actually inside each tab. URL
                    keys (`?tab=work` etc.) stay stable for backwards
                    compat — only the visible label changes.
                      • work          → "Filing plan"
                          (the single ClientWorkPlanPanel inside)
                      • info          → "Setup"
                          (5 sections of tax-setup data, not contact info)
                      • activity      → "History"
                          (read-mode history; Notes lives in a slide-in
                          panel)
                */}
                    <ClientDetailTabTrigger value="work" activeTab={activeTab}>
                      <ClipboardListIcon className="size-3.5" aria-hidden />
                      <span data-tab-label className="inline-flex items-center gap-1.5">
                        {/* "Filing plan" (not "Filings") so the tab matches the
                        section heading, the hotkey registry ("Filing plan
                        tab"), and the URL-intent comment above — one noun for
                        one surface. A count pill of the plan's rows trails.
                        2026-06-16 (Yuqi "tabs 不要 abbreviate when the panel is
                        open"): tabs keep their full labels + count even while the
                        obligation panel is open — no icon-only compaction. */}
                        <Trans>Filing plan</Trans>
                        {obligations.length > 0 ? (
                          <Badge
                            variant="secondary"
                            className="px-1.5 text-caption-xs font-semibold tabular-nums"
                          >
                            {obligations.length}
                          </Badge>
                        ) : null}
                      </span>
                    </ClientDetailTabTrigger>
                    <ClientDetailTabTrigger value="info" activeTab={activeTab}>
                      <UserRoundIcon className="size-3.5" aria-hidden />
                      <span data-tab-label>
                        <Trans>Setup</Trans>
                      </span>
                      {/* Count chip, not a dot: a dot signals "something is
                      missing" but not HOW MUCH. A count bubble surfaces
                      the magnitude at the tab bar so the CPA can decide
                      whether to switch tabs before clicking through.
                      Tone matches the readiness chip (warning, not
                      destructive) per §3.7 canonical color
                      reservation. */}
                      {readiness && readiness.missingRequiredFacts.length > 0 ? (
                        // Badge size='sm' warning carries an accessible name
                        // (title + aria-label) so AT users hear "N required
                        // facts missing". Count ternary, not the "(s)" hack —
                        // a screen reader voices "(s)" literally, and `plural()`
                        // in a string prop crashes at runtime (lingui footgun).
                        <Badge
                          variant="warning"
                          size="sm"
                          className="ml-1.5 tabular-nums"
                          title={
                            readiness.missingRequiredFacts.length === 1
                              ? t`1 required fact missing`
                              : t`${readiness.missingRequiredFacts.length} required facts missing`
                          }
                          aria-label={
                            readiness.missingRequiredFacts.length === 1
                              ? t`1 required fact missing`
                              : t`${readiness.missingRequiredFacts.length} required facts missing`
                          }
                        >
                          {readiness.missingRequiredFacts.length}
                        </Badge>
                      ) : null}
                    </ClientDetailTabTrigger>
                    <ClientDetailTabTrigger value="activity" activeTab={activeTab}>
                      <ActivityIcon className="size-3.5" aria-hidden />
                      <span data-tab-label>
                        {/* "History", not "Activity": Notes lives in its
                        own slide-in panel, so this tab is coherently
                        read-mode (AI summary + Activity log = the story
                        of what's happened), not mixing a write-mode
                        Notes block. */}
                        <Trans>History</Trans>
                      </span>
                    </ClientDetailTabTrigger>
                  </TabsList>

                  {/* Each TabsContent owns its own overflow-y-auto so the
                  tab body scrolls INDEPENDENTLY of the rest of the page
                  (PageHeader, ContactMetaRow, alerts, summary, tab bar
                  stay pinned). Matches /deadlines's "queue column
                  scrolls, surrounding chrome stays put" mechanism. The
                  bottom padding gives the last row breathing room from
                  the viewport edge. */}
                  <TabsContent
                    value="work"
                    className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pt-4 pb-6"
                  >
                    <ClientWorkPlanPanel
                      obligations={queueRows}
                      isLoading={clientQueueQuery.isLoading}
                      summary={workPlan}
                      clientName={client.name}
                      onChangeStatus={handleChangeObligationStatus}
                      isStatusChangePending={changeStatusMutation.isPending}
                      canChangeStatus={canUpdateObligationStatus}
                      activeObligationId={activeObligationId}
                      expandedFilingId={expandedFilingId}
                      // 2026-06-15 (Yuqi): clicking a filing opens the obligation
                      // detail in the in-page side panel (the right <aside> that
                      // animates to 60%) instead of expanding inline or navigating
                      // away to /deadlines/:ref — the user stays anchored in the
                      // client's context. `openObligationPanel` sets local panel
                      // state on /clients/:id (no route change); cmd/ctrl-click on
                      // the title still opens the full /deadlines page (escape hatch).
                      onExpandFiling={(id) => openObligationPanel(id)}
                      onCollapseFiling={() => void setExpandedFilingId('')}
                      // 2026-06-16 (Yuqi): keep the full table — incl. OFFICIAL
                      // DUE + OWNER — even when the obligation panel is open. The
                      // DEADLINE column (minmax(0,1fr)) absorbs the squeeze by
                      // truncating the form name; the fixed columns stay put.
                      compact={false}
                    />
                  </TabsContent>

                  {/* Every tab below uses <TabSection> for its section
                  heading so all tabs share one visual language (h2 +
                  subtitle, no disclosure, no nested card frame around
                  the section block itself). */}
                  <TabsContent
                    value="info"
                    className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pt-4 pb-6"
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
                      <div className="rounded-lg border border-divider-regular bg-background-default px-5 py-4">
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
                          'scroll-mt-20 rounded-lg border bg-background-default px-5 py-4',
                          missingFilingState
                            ? 'border-state-warning-active'
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
                      summary={t`Importance and late-filing history`}
                    >
                      <div className="rounded-lg border border-divider-regular bg-background-default px-5 py-4">
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
                      <div className="rounded-lg border border-divider-regular bg-background-default px-5 py-4">
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
                    className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pt-4 pb-6"
                  >
                    {/* Activity content only renders when the tab is the
                    active one — the surrounding TabsContent gates the
                    AI summary + audit log queries that fire inside. */}
                    <HistoryCard
                      title={t`Activity summary`}
                      sub={
                        riskSummaryQuery.data?.generatedAt
                          ? t`Refreshed ${formatDateTimeWithTimezone(riskSummaryQuery.data.generatedAt, firmTimezone)}`
                          : t`Auto-drafted recap`
                      }
                      footer={
                        riskSummaryQuery.data && riskSummaryQuery.data.sections.length > 0 ? (
                          <CopyRecapButton insight={riskSummaryQuery.data} />
                        ) : undefined
                      }
                      // The AI status badge + Refresh button cluster lives
                      // in the TabSection's `actions` slot so the badge +
                      // Refresh sit on the same row as the section title
                      // (not as a separate bar inside the panel body — see
                      // `ClientRiskSummaryPanel` below, which doesn't render
                      // that header strip).
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
                              onClick={() =>
                                requestRiskSummaryMutation.mutate({ clientId: client.id })
                              }
                            >
                              <RefreshCwIcon data-icon="inline-start" />
                              {requestRiskSummaryMutation.isPending ? (
                                <Trans>Queued</Trans>
                              ) : (
                                <Trans>Refresh</Trans>
                              )}
                            </Button>
                          ) : null}
                          {/* No `<UpgradeCtaButton />` upsell in this
                          section header — the orange Pro upsell pulled
                          the eye away from the section's actual content.
                          Practices without AI just see no Refresh button
                          next to the InsightStatusBadge in this slot;
                          billing surface up-sells elsewhere. */}
                        </>
                      }
                    >
                      <ClientRiskSummaryPanel
                        insight={riskSummaryQuery.data ?? null}
                        isLoading={riskSummaryQuery.isLoading}
                        canRefresh={practiceAiEnabled}
                      />
                    </HistoryCard>

                    <HistoryCard
                      title={t`Activity log`}
                      sub={t`Audit trail of every change`}
                      actions={
                        auditQuery.data && auditQuery.data.events.length > 0 ? (
                          <span className="rounded-full bg-background-default px-1.5 py-0.5 text-caption-xs font-semibold text-text-tertiary tabular-nums">
                            {auditQuery.data.events.length}
                          </span>
                        ) : null
                      }
                      // Flush body: ClientActivityPanel is frameless and its rows /
                      // empty-state own their padding, so the card border + gray
                      // heading row (rNqhy) is the only frame.
                      bodyClassName="p-0"
                    >
                      <ClientActivityPanel
                        events={auditQuery.data?.events ?? []}
                        canReadAudit={canReadAudit}
                        isLoading={auditQuery.isLoading}
                        firmTimezone={firmTimezone}
                      />
                    </HistoryCard>
                  </TabsContent>
                </Tabs>
              </div>
              {/* Per-client rail — beside the tab content, hidden while the
                  obligation panel is open (the panel takes the right side). */}
              {activeObligationId ? null : (
                <aside className="flex w-full min-w-0 shrink-0 self-stretch overflow-hidden xl:w-80">
                  <ClientDetailRail
                    client={client}
                    canWrite={canUpdateClient}
                    onEditNotes={() => setNotesOpen(true)}
                    alertMatches={alertMatches}
                    extensionPaymentMismatches={extensionPaymentMismatches}
                  />
                </aside>
              )}
            </div>
          </section>
        </div>
        {/* Obligation page panel — replaces the modal Sheet on this
            route. Width is fixed 600px on xl+, full-width stacked
            below the entire client surface at narrower viewports.
            Now a sibling of the left column wrapper (was nested
            inside the body) so opening an obligation pushes the
            PageHeader, summary strip, alerts, AND the filing plan
            all left at once. */}
        {/* CSS-only slide-in. AnimatePresence + motion.div animating
            width 0→600 settled at stuck intermediate widths under React
            19's concurrent renders inside this flex-row + items-stretch
            parent — the entry-animation never reliably reached the
            600px target. A native CSS transition on `width` (no motion
            library) sidesteps that.
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
        {/* Obligation panel — a sibling of the full-width page column, so
            opening an obligation pushes the WHOLE column (header + summary +
            body) left (Yuqi: keep the push-left behavior). The persistent
            per-client rail now lives in the body split above; this aside is
            ONLY the obligation panel. At rest it collapses to 0 width (with a
            negative margin to cancel the parent gap) so the page column is
            truly full-width; it animates to 60% when an obligation opens. */}
        <aside
          data-slot="obligation-detail-panel"
          data-open={activeObligationId ? 'true' : 'false'}
          className={cn(
            'min-w-0 shrink-0 self-stretch overflow-hidden',
            // Below xl: full-width stacked block when open; absent at rest.
            activeObligationId ? 'flex w-full' : 'hidden',
            // xl+: width-animated panel that pushes the page column left.
            'xl:flex xl:h-full xl:min-h-0',
            'xl:transition-[width,margin-right] xl:duration-300 xl:ease-apple motion-reduce:transition-none',
            activeObligationId ? 'xl:mr-0 xl:w-[60%]' : 'xl:-mr-6 xl:w-0',
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-destructive">
              <Trans>Delete {client.name}?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-destructive-secondary">
              <Trans>
                This removes the client and its deadlines from active lists, Deadlines, and Today.
                Audit history stays retained for compliance records.
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
      {/* The controlled Notes slide-in panel. Mounted once at the
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
 * Persistent right rail. Renders only cards backed by real data.
 *
 * Data sourcing:
 *   - Contacts → live primary contact + email when present
 *     (buildClientHeaderContactItems); honest "No contacts yet" empty
 *     state otherwise. Never fabricated.
 *
 * No Snapshot card: its only live stat ("N Open deadlines") would
 * duplicate ClientSummaryStrip's "Open filing" slot
 * (one-purpose-per-panel). Other cards stay out until a contract field
 * backs them — invented compliance figures are a trust bug: Snapshot
 * Filed-YTD / Outstanding-tasks / Last-filed, and the entire Engagement
 * card (retainer, engagement letter, renews). Restore once the
 * underlying fields ship. Per-contact Compose stays out until a
 * messages.send RPC exists.
 */
function ClientDetailRail({
  client,
  canWrite,
  onEditNotes,
  alertMatches,
  extensionPaymentMismatches,
}: {
  client: ClientPublic
  canWrite: boolean
  /** Opens the controlled notes slide-in (the rail notes card's click target). */
  onEditNotes: () => void
  alertMatches: readonly ClientAlertMatch[]
  extensionPaymentMismatches: readonly ObligationInstancePublic[]
}) {
  const { t } = useLingui()
  const contactItems = useMemo(() => buildClientHeaderContactItems(client), [client])
  const primaryContactName = contactItems.find((item) => item.kind === 'contact')?.value ?? null
  const primaryContactEmail = contactItems.find((item) => item.kind === 'email')?.value ?? null
  // Only render the real primary contact derived from the client
  // record. When there is none, the Contacts card shows an honest empty
  // state — never fabricated people/emails.
  const contacts: { name: string; role: string; email: string | null }[] =
    primaryContactName || primaryContactEmail
      ? [
          {
            name: primaryContactName ?? t`Primary contact`,
            role: t`Primary contact`,
            email: primaryContactEmail,
          },
        ]
      : []

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 overflow-y-auto">
      {/* Active alerts — per-client signals; most urgent, so they lead the
          rail. Reuses <ClientActiveAlertsSection>; self-suppresses at zero. */}
      <ClientActiveAlertsSection
        alertMatches={alertMatches}
        extensionPaymentMismatches={extensionPaymentMismatches}
      />
      {/* Notes card — persistent client context, moved into the rail
          (Yuqi). Reuses <ClientNotesStrip>; self-suppresses when empty. */}
      <ClientNotesStrip client={client} canWrite={canWrite} onOpenEditor={onEditNotes} />
      {/* Snapshot card removed 2026-06-10 (Yuqi): its only live stat was
          `openCount` ("N Open deadlines"), which duplicated the full-width
          ClientSummaryStrip's "Open filing" slot sitting right beside it — a
          one-purpose-per-panel violation, and the strip carries it richer
          ("· N payment overdue"). The strip owns the at-a-glance counts; the
          rail's job is Contacts at rest + the obligation detail on row-click.
          (Filed-YTD / outstanding-tasks / last-filed + the Engagement card
          were already removed earlier as unbacked-by-contract.) */}
      {/* Contacts card */}
      <section className="flex flex-col gap-4 rounded-xl border border-divider-regular bg-background-default p-5">
        <RailSectionLabel>{t`CONTACTS`}</RailSectionLabel>
        {contacts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {contacts.map((contact) => (
              // Stacked name / role / email per Pencil V1kJX (was name·role
              // inline). `items-start` so the avatar tops with the name line.
              <div key={contact.name} className="flex items-start gap-3">
                <AssigneeAvatar name={contact.name} isMine={false} title={contact.name} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  {/* Name 14/500 (V1kJX), not 600. */}
                  <span className="truncate text-sm font-medium text-text-primary">
                    {contact.name}
                  </span>
                  {/* Role on its OWN line, muted (V1kJX). Skipped when it would
                      just echo the name — the demo placeholder sets both to
                      "Primary contact", and two identical lines read broken. */}
                  {contact.role && contact.role !== contact.name ? (
                    <span className="truncate text-xs text-text-muted">{contact.role}</span>
                  ) : null}
                  {/* Email in mono (V1kJX h1oYYg JetBrains Mono), as a mailto —
                      this is the single home for the client email (removed from
                      the header meta row), so it carries the actionable link. */}
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="truncate font-mono text-xs text-text-tertiary underline-offset-2 outline-none hover:text-text-primary hover:underline focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                    >
                      {contact.email}
                    </a>
                  ) : null}
                </div>
                {/* Compose intentionally not rendered: EmailComposeDialog
                    has no messages.send RPC, so the dialog can never
                    actually send. Restore the per-contact compose
                    affordance once email sending is real. */}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-text-tertiary">
            <Trans>No contacts yet</Trans>
          </span>
        )}
      </section>
    </div>
  )
}

function RailSectionLabel({ children }: { children: ReactNode }) {
  // Canonical column-label token (11/600/+0.5px) in tertiary — matches the
  // NOTES / CONTACTS rail labels in Pencil V1kJX (was bolder muted).
  return <span className="text-column-label text-text-tertiary uppercase">{children}</span>
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
      // The underlying TabsTrigger primitive carries pill-segmented
      // defaults (`data-active:bg-…`, `data-active:shadow-xs`,
      // `rounded-lg border border-transparent`, plus an `::after`
      // pseudo-element underline at `bottom-[-5px]` gated on
      // `variant=line`). This consumer wants a pure underline-style tab,
      // so the explicit `!bg-transparent !shadow-none !rounded-none
      // after:!opacity-0` strips ALL primitive active chrome — otherwise
      // the active tab shows the motion.span accent line AND a second
      // line below it from the primitive's after-pseudo shadow leakage.
      // Only the motion.span underline (and the bold text) remain.
      // Inactive triggers get a subtle bg fill on hover
      // (`hover:bg-state-base-hover-alt`) on top of the text + underline
      // transitions — a stronger affordance than text-color shifts
      // alone, which were too subtle on the workbench's gray-tinted page
      // background. The active state stays chrome-free (bold text + the
      // motion underline carry it).
      className={cn(
        // `!h-auto` overrides the segmented primitive's `h-[calc(100%-1px)]` so
        // the trigger's own `py-3` defines the tab-bar height (otherwise the
        // padding is clipped and the underline squashes against the label).
        // `-mb-px` pulls its bottom onto the list's border-b — so the active
        // underline at `-bottom-px` lands exactly on the section divider instead
        // of floating above it (Yuqi "underline doesn't match the divider" +
        // "still squashed"). The list's `p-0` (above) removes the primitive's
        // inset padding that would otherwise leave the seam below the triggers.
        'relative -mb-px !h-auto !flex-none shrink-0 items-center gap-2 !rounded-none !border-0 !bg-transparent px-0 py-3 text-sm whitespace-nowrap !shadow-none transition-colors after:!opacity-0',
        active
          ? 'font-semibold text-text-primary'
          : 'cursor-pointer text-text-secondary hover:text-text-primary',
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
          className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-default"
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
      className="overflow-hidden rounded-xl border border-divider-regular bg-background-default"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-divider-subtle bg-components-badge-bg-warning-soft/40 px-4 py-3">
        {/* Canonical section heading is sm-semibold sentence-case (no
            uppercase kicker) per page-family-canonical §9. */}
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
  // Rail-friendly vertical layout: the tax-code chip + Review action share a
  // top row, then the title + source get the full rail width below so the
  // summary never crushes to one-word-per-line in the 320px rail.
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Shared TaxCodeBadge primitive — same mono code-chip chrome as
            every other form badge in the app (was a one-off gray Badge). */}
        <TaxCodeBadge code={match.taxType} className="shrink-0" />
        <Button
          variant="ghost"
          size="sm"
          className="-mr-1.5 shrink-0"
          nativeButton={false}
          // Deep-link straight to THIS alert — the alerts page's
          // DrawerProvider opens the `?alert=` id on arrival, so the CPA
          // lands on the matched alert instead of the bare list.
          render={<Link to={`/alerts?alert=${encodeURIComponent(match.alertId)}`} />}
        >
          <Trans>Review</Trans>
          <ChevronRightIcon data-icon="inline-end" aria-hidden />
        </Button>
      </div>
      <div className="min-w-0">
        {/* Clamp the (often long) alert title to 2 lines so the rail card
            stays compact — the full text is one click away via Review. */}
        <p className="line-clamp-2 text-sm font-medium text-text-primary">{match.title}</p>
        <p className="mt-0.5 truncate text-xs text-text-tertiary">{match.source}</p>
      </div>
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
            <Trans>1 filing extended — payment is not extended</Trans>
          ) : (
            <Trans>{obligations.length} filings extended — payment is not extended</Trans>
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
 * There's one real action: **View audit log** (routes to `/audit`
 * filtered by this client). No "coming soon" affordances live here —
 * only working actions belong in the menu.
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
  // Destructive client removal lives in the overflow, using the direct
  // "Delete" verb and red menu variant.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          // size="icon-sm" (h-8 w-8, true square) rather than size="sm"
          // (h-8 with horizontal padding, which produces a rectangle).
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
          // Includes "partners" to match
          // `FIRM_PERMISSION_ROLES['audit.read']`, matching the `/audit`
          // route description.
          <Trans>Owners, partners, managers, and preparers can inspect client activity.</Trans>
        }
      />
    )
  }
  if (isLoading) {
    return (
      <div className="grid gap-2 px-4 py-4">
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
  // Frameless: the parent <HistoryCard> (Pencil rNqhy) provides the outer
  // frame + gray heading row, so this panel renders just the divide-y rows.
  return (
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
  )
}

/**
 * HistoryCard — the History-tab section chrome from Pencil rNqhy: a bordered
 * card (rounded-xl, divider-regular) with a gray heading row (title · sub ·
 * actions) + optional footer. Replaces the TabSection-above-a-panel treatment
 * so the AI summary + audit log read as one card vocabulary, consistent with
 * the deadline + alert detail surfaces.
 */
function HistoryCard({
  title,
  sub,
  actions,
  footer,
  bodyClassName,
  children,
}: {
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-divider-regular bg-background-default">
      <div className="flex items-center gap-2 border-b border-divider-subtle bg-background-section px-4 py-2.5">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {sub ? (
          <span className="truncate text-xs font-medium text-text-tertiary">
            <span aria-hidden className="mr-1 text-text-muted">
              ·
            </span>
            {sub}
          </span>
        ) : null}
        {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className={bodyClassName ?? 'px-4 py-4'}>{children}</div>
      {footer ? (
        <div className="flex items-center gap-2 border-t border-divider-subtle bg-background-section/40 px-3 py-2">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

/**
 * CopyRecapButton — v1 of rNqhy's AI-summary footer actions. Only Copy is
 * wired (Yuqi: "remove email, add to brief and flag for v1"); copies the
 * recap's section labels + text to the clipboard.
 */
function CopyRecapButton({ insight }: { insight: AiInsightPublic | null }) {
  const [copied, setCopied] = useState(false)
  if (!insight || insight.sections.length === 0) return null
  const recap = insight.sections.map((section) => `${section.label}\n${section.text}`).join('\n\n')
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(recap)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
      {copied ? <Trans>Copied</Trans> : <Trans>Copy recap</Trans>}
    </Button>
  )
}

// ClientOwnerHeaderPill — inline chip variant of the assignee avatar,
// paired with the assignee's name so the H1 chip cluster can answer
// "whose client?" without a separate Team tile in the summary strip.
//
// The pill is a real DropdownMenu trigger that picks an assignee from
// the firm's assignable members + an "Unassigned" option. Clicking the
// pill opens the list; selecting fires `clients.bulkUpdateAssignee`
// with `[client.id]` and an `assigneeId` (or `null` for unassigned).
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
  // Use the client's `assigneeId` directly instead of reverse-looking
  // up by name. The H1 pill renders an abbreviated name ("A. Rivera")
  // while assignableMembers returns full names ("Avery Patel"), so a
  // name-based match would always fail and the radio group would fall
  // back to "Unassigned" — making the trigger and the checked item
  // disagree. Looking up by id is the source of truth.
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
          // Pill is a real click target: h-7 (28px) + size-5 avatar +
          // size-3.5 chevron. Same shape rules as other owner pills
          // used in /deadlines queue cells so the picker reads as a real
          // interactive control.
          //
          // Horizontal padding is asymmetric — `pl-1 pr-2.5` (4px left,
          // 10px right) so the avatar circle has the same 4px breathing
          // room from the pill's left edge that it already has from the
          // top + bottom edges (the h-7 / size-5 differential = 4px
          // inset top + 4px bottom). The right side keeps 10px so the
          // chevron doesn't feel cramped against the pill border. The
          // 6px gap between avatar + label + chevron is unchanged.
          <Button
            variant="ghost"
            size="sm"
            aria-label={triggerLabel}
            title={triggerLabel}
            disabled={disabled}
            className={cn(
              // Borderless ghost pill (Yuqi: owner pill "丑") — at rest it sits
              // quietly among the meta-row identity facts (no border/fill box);
              // the chevron + hover wash carry the "editable" affordance.
              'h-7 rounded-full pl-1 pr-1.5 text-xs',
              name === null ? 'text-text-secondary' : 'text-text-primary',
            )}
          >
            {/* Shared AssigneeAvatar primitive (size='xs'). The
                null-name → Unassigned glyph branch + isMine accent tint
                live inside the primitive. */}
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
          </Button>
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
                AssigneeAvatar with null name renders the Unassigned
                glyph. */}
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
              {/* AssigneeAvatar (size='xs') picks the per-name tint via
                  getAssigneeTint and falls back to the unassigned glyph
                  when name is null. */}
              <AssigneeAvatar name={name} size="xs" title={name ?? t`Former teammate`} />
              <span className="truncate text-text-tertiary">
                {name ?? <Trans>Former teammate</Trans>}
                <span className="ml-1 text-xs italic">
                  <Trans>(no longer on team)</Trans>
                </span>
              </span>
            </DropdownMenuRadioItem>
          ) : null}
          {/* Base UI strict-mode requires RadioGroup children to all be
              RadioItems (nesting a `DropdownMenuItem` inside throws
              "MenuGroupContext is missing"). The Separator + empty-state
              Item live OUTSIDE the RadioGroup; member RadioItems stay
              inside. */}
          {assignableMembers.map((member) => {
            const isCurrentUser =
              currentUserName !== null &&
              member.name.trim().toLowerCase() === currentUserName.toLowerCase()
            return (
              <DropdownMenuRadioItem key={member.assigneeId} value={member.assigneeId}>
                {/* AssigneeAvatar (size='xs', isMine for current user
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
  // The row carries the identity chips — entity badge + owner pill —
  // that would otherwise clutter the title cluster; per canonical the
  // title gets 1 chip max, the rest of the identity lives here.
  //
  // Filing-state chips are NOT rendered here: jurisdiction now has a
  // single home in ClientSummaryStrip's "Jurisdictions" cell directly
  // below (one home per fact — it was previously shown in the strip,
  // here, AND as a per-row sub-label in the filing table = triple-TX).
  //
  // `buildClientHeaderContactItems` pre-resolves contact / phone /
  // address items (filtering out malformed migration data like the
  // literal `primary_phone` column name). The EMAIL item is filtered
  // out here too — it lives in the rail Contacts card (its semantic
  // home, where it's the card's primary content), so showing it here as
  // well was a straight duplicate. The row renders unconditionally
  // because the entity badge always has content.
  const items = buildClientHeaderContactItems(client).filter((item) => item.kind !== 'email')
  return (
    <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text-tertiary">
      {/* Entity-kind chip routed through Badge outline lg, with an h-7
          className override: the entity pill must match the adjacent
          owner pill's 28px height exactly (lg's baseline is h-6, and the
          owner pill is h-7), so the two read as one coherent meta row.
          The gap is gap-x-2 since the pills are visually related
          siblings. */}
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
