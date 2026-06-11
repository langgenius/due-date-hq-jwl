// Obligation detail drawer/panel for the queue (/deadlines).
// Extracted from routes/obligations.tsx.
import { EvidenceInlineItem } from './components/evidence'
import {
  ActiveStageDetailCard,
  AuthorityResponsePanel,
  PathToFilingSummary,
  PrimaryDeadlineStrip,
  ReadinessOverview,
  StatutoryDatesPanel,
} from './components/panels'
import {
  type ArtifactStatusCell,
  AuthorityFactStrip,
  DropdownTriggerButton,
  EmptyPanel,
  EvidenceArtifactStatusGrid,
  MaterialsProgressLegend,
  PaymentStillDueCallout,
} from './components/primitives'
import {
  DEADLINE_TIP_REFRESH_POLL_INTERVAL_MS,
  DEADLINE_TIP_REFRESH_TIMEOUT_MS,
  EMPTY_DOCUMENT_CHECKLIST,
} from './constants'
import {
  AuthorityRejectionDialog,
  DeadlineInputRequestDialog,
  MaterialsRequestPreviewDialog,
  SignatureReminderDialog,
} from './dialogs'
import {
  canSaveInternalExtensionPlan,
  cleanOptionalText,
  copyTextToClipboard,
  defaultAuthorityRejectionDraft,
  emptyExtensionPlanDraft,
  extensionPlanDraftFromRow,
  fiscalYearEndDraftValue,
  fiscalYearEndParts,
  formatFiscalYearEnd,
  isInternalExtensionTargetDateValid,
  isObligationQueueDetailTab,
  latestDeadlineInputRequest,
  materialsChecklistReference,
  openExternalUrl,
  todayIsoDate,
  willReadinessChecklistBeFullyReceived,
} from './helpers'
import type { AuthorityRejectionDraft, DeadlineInputRequestDraft } from './types'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { JurisdictionLabel } from '@/components/primitives/state-badge'
import { DetailStatusBanner } from '@/components/patterns/detail-status-banner'
import { DetailSectionCard } from '@/components/patterns/detail-section-card'
import { describeTaxCode } from '@/lib/tax-codes'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { ChecklistItemRow } from '@/features/obligations/ChecklistItemRow'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'
import { tabsForObligationType } from '@/features/obligations/obligation-type'
import { PenaltyExposureCard } from '@/features/obligations/detail/PenaltyExposureCard'
import { ObligationTimeline } from '@/features/obligations/timeline'
import { DeadlineCrumbBar } from '@/features/obligations/detail/DeadlineCrumbBar'
import {
  type ObligationStatus,
  ObligationStatusReadBadge,
  useLifecycleV2StatusLabels,
  useStatusLabels,
} from '@/features/obligations/status-control'
import { useLifecycleV2 } from '@/features/obligations/use-lifecycle-v2'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { clientDetailPath } from '@/features/clients/client-url'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import {
  cn,
  formatCents,
  formatDate,
  formatDatePretty,
  formatDateTimeWithTimezone,
  formatRelativeTime,
} from '@/lib/utils'
import { AssigneeAvatar } from '@/features/obligations/AssigneeAvatar'
import { useAuditActionLabels } from '@/features/audit/audit-log-labels'
import { formatAuditActionLabel } from '@/features/audit/audit-log-model'
import {
  type MemberAssigneeOption,
  type ObligationPrepStage,
  type ObligationQueueDetailTab,
  type ObligationQueueRow,
  type ObligationReviewStage,
  type ReadinessDocumentChecklistItemPublic,
} from '@duedatehq/contracts'
import { computeExtendedFilingDeadline } from '@duedatehq/core/date-logic'
import { Alert, AlertDescription } from '@duedatehq/ui/components/ui/alert'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'
import { Input } from '@duedatehq/ui/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@duedatehq/ui/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@duedatehq/ui/components/ui/tabs'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlarmClockIcon,
  AlertTriangleIcon,
  BookOpenIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  CircleOffIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HistoryIcon,
  LinkIcon,
  Loader2,
  MessageSquareText,
  PaperclipIcon,
  PlusIcon,
  RefreshCwIcon,
  SendIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

// 2026-06-10 (Yuqi alert↔deadline parity #2): the page-mode drawer's
// window-level hotkeys (▲▼ rail pager + F mark-filed) must go quiet while
// ANY modal layer is stacked above the drawer — the authority-rejection /
// deadline-input / materials-request-preview / signature-reminder dialogs.
// Their focusable controls are <button>s, so the INPUT/TEXTAREA target
// guard never catches them. Base UI keeps Dialog/AlertDialog popups out of
// the DOM until open, so probing for a mounted popup is a reliable "is a
// modal up?" check. Mirrors AlertDetailDrawer's isModalLayerOpen exactly.
const MODAL_LAYER_SELECTOR = '[data-slot="dialog-content"], [data-slot="alert-dialog-content"]'

function isModalLayerOpen(): boolean {
  return document.querySelector(MODAL_LAYER_SELECTOR) !== null
}

// 2026-06-08 (Pencil HuYeb /deadlines detail): the header's top-right
// action cluster — Assign (assignee picker), Snooze (preset defer), and
// Mark-as-filed (status → Filed). Extracted as a small component so the
// dropdown state stays local and the header JSX reads cleanly.
function DeadlineTopActions({
  row,
  assignableMembers,
  onAssign,
  onSnooze,
  onMarkFiled,
  assignPending,
  snoozePending,
  markFiledPending,
}: {
  row: ObligationQueueRow
  assignableMembers: MemberAssigneeOption[]
  onAssign: (assigneeId: string | null) => void
  onSnooze: (snoozedUntil: string | null) => void
  onMarkFiled: () => void
  assignPending: boolean
  snoozePending: boolean
  markFiledPending: boolean
}) {
  const { t } = useLingui()
  // `done` / `paid` / `completed` already read as "Filed"/terminal, so the
  // primary action is a no-op there — disable rather than re-file.
  const isFiled = row.status === 'done' || row.status === 'completed' || row.status === 'paid'
  // 2026-06-10 (Yuqi critique "one primary CTA, context-aware"): while the row
  // is In Review the stage-card's "Approve return" is the single blue primary
  // (that's the actual next move), so the footer "Mark as filed" demotes to a
  // secondary OUTLINE here — never two blue primaries on screen at once. In
  // every other stage filing IS the next move, so the footer button stays
  // primary.
  const markFiledIsPrimary = row.status !== 'review'
  // Relative snooze presets. App code, so wall-clock `Date.now()` is fine
  // (unlike workflow scripts); the server stores the resolved instant.
  const snoozePresets: Array<{ label: string; days: number }> = [
    { label: t`Tomorrow`, days: 1 },
    { label: t`In 3 days`, days: 3 },
    { label: t`Next week`, days: 7 },
    { label: t`In 2 weeks`, days: 14 },
  ]
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={assignPending}>
              <UserPlusIcon className="size-3.5" aria-hidden />
              <Trans>Assign</Trans>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          {assignableMembers.length > 0 ? (
            <DropdownMenuRadioGroup
              value={row.assigneeId ?? ''}
              onValueChange={(value) => onAssign(value || null)}
            >
              {assignableMembers.map((member) => (
                <DropdownMenuRadioItem key={member.assigneeId} value={member.assigneeId}>
                  {member.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          ) : (
            <DropdownMenuItem disabled>
              <Trans>No assignable teammates</Trans>
            </DropdownMenuItem>
          )}
          {row.assigneeId ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAssign(null)}>
                <Trans>Clear assignee</Trans>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={snoozePending}>
              <AlarmClockIcon className="size-3.5" aria-hidden />
              <Trans>Snooze</Trans>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          {snoozePresets.map((preset) => (
            <DropdownMenuItem
              key={preset.days}
              onClick={() =>
                onSnooze(new Date(Date.now() + preset.days * 86_400_000).toISOString())
              }
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
          {row.snoozedUntil ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSnooze(null)}>
                <Trans>Un-snooze</Trans>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="sm"
        variant={markFiledIsPrimary ? 'default' : 'outline'}
        className="h-8 gap-1.5"
        disabled={isFiled || markFiledPending}
        onClick={onMarkFiled}
      >
        <CheckIcon className="size-3.5" aria-hidden />
        <Trans>Mark as filed</Trans>
      </Button>
    </div>
  )
}

export function ObligationQueueDetailDrawer({
  obligationId,
  activeTab,
  onTabChange,
  onClose,
  // onNeedsInput + practiceAiEnabled went unused with the Risk tab
  // removal. Kept on the prop type for back-compat with the route
  // and the ObligationDrawerProvider that still pass them; underscore
  // prefix silences eslint without breaking callers. Drop the props
  // entirely in a follow-up that also updates the two callsites.
  onNeedsInput: _onNeedsInput,
  practiceAiEnabled: _practiceAiEnabled,
  // `blockerCandidates` retired 2026-05-21 with the in-tab K-1 editor.
  // Kept on the prop type so the route + provider call sites still
  // compile; underscore-prefixed to silence eslint until we land the
  // new blocker UX.
  blockerCandidates: _blockerCandidates,
  // 2026-05-21: dual-mode. The /deadlines route renders the detail
  // as a persistent right-side panel ('panel'). The ObligationDrawer-
  // Provider (dashboard / clients / pulse) still uses the modal-style
  // Sheet ('sheet'). Default 'sheet' preserves back-compat for any
  // unconverted caller.
  mode = 'sheet',
  onPrev,
  onNext,
  position = null,
}: {
  obligationId: string | null
  activeTab: ObligationQueueDetailTab
  onTabChange: (tab: ObligationQueueDetailTab) => void
  onClose: () => void
  onNeedsInput: (row: ObligationQueueRow) => void
  practiceAiEnabled: boolean
  blockerCandidates: ObligationQueueRow[]
  // 2026-06-09 (Yuqi /deadlines detail rebuild — Pencil rzzww): `page`
  // is the master-detail-page presentation used by the standalone
  // /deadlines/:ref route. It shares panel mode's two-column scrolling
  // layout but drops the panel's corner close-X (the page has a
  // breadcrumb + Prev/Next bar above it) and applies the rzzww
  // tab restructure (Status · Materials · Record · Audit). `panel` /
  // `sheet` (used by /clients) are untouched.
  mode?: 'sheet' | 'panel' | 'page'
  // 2026-06-10 (Yuqi alert↔deadline parity #1/#2): prev/next paging across
  // the surrounding rail list + a "N of M" position read-out, threaded from
  // the /deadlines/:ref route (which owns the sorted order). Page mode wires
  // them into the in-surface top bar + the ▲▼ keyboard pager, mirroring
  // AlertDetailDrawer. All optional — absent in panel/sheet mode.
  onPrev?: (() => void) | undefined
  onNext?: (() => void) | undefined
  position?: { index: number; total: number } | null | undefined
}) {
  // True for the persistent layouts (right-rail panel + standalone
  // page) where the body owns its own scroll and the deadline strip
  // pins — as opposed to the modal Sheet's single document scroll.
  const panelLayout = mode === 'panel' || mode === 'page'
  const isPageMode = mode === 'page'
  // 2026-06-09 (Yuqi /deadlines detail rebuild — "header too tall, reading
  // space limited"): the page hero collapses once the body scrolls, mirroring
  // the Alert detail's headerCollapsed pattern — shrinks padding + title and
  // drops the tax-year line + meta chip row so the content underneath gets the
  // reclaimed height.
  const [pageHeaderCollapsed, setPageHeaderCollapsed] = useState(false)
  const heroCollapsed = isPageMode && pageHeaderCollapsed
  const { t } = useLingui()
  const navigate = useNavigate()
  const practiceTimezone = usePracticeTimezone()
  // 2026-06-09 (Yuqi /deadlines detail recreation — Pencil rzzww): humanized
  // labels for the Recent activity card sourced from the audit feed.
  const auditActionLabels = useAuditActionLabels()
  const queryClient = useQueryClient()
  const permission = useFirmPermission()
  const canRequestInput = permission.firm?.role === 'preparer'
  // Lifecycle v2: when on, the Audit tab is relabeled to "Timeline"
  // and its content swaps to the milestone-grouped timeline. See
  // docs/Design/obligation-lifecycle-design-brief.md.
  const lifecycleV2 = useLifecycleV2()
  const legacyStatusLabels = useStatusLabels()
  const v2StatusLabels = useLifecycleV2StatusLabels()
  const statusLabels = lifecycleV2 ? v2StatusLabels : legacyStatusLabels
  // 2026-05-26 (step-6 ux-flow audit Q7.1): removed dead
  // `_statusDropdownOptions` computation. The drawer-header status
  // pill was retired and the dropdown-options value was being
  // computed only to immediately `void` it. If the pill comes back,
  // re-derive from LIFECYCLE_V2_STATUSES / ALL_STATUSES at that
  // point — the cost is negligible.
  const [extensionDraft, setExtensionDraft] = useState(() => emptyExtensionPlanDraft())
  const [taxYearDraft, setTaxYearDraft] = useState<{
    obligationId: string
    taxYearType: ObligationQueueRow['taxYearType']
    fiscalYearEndDate: string
  }>({
    obligationId: '',
    taxYearType: 'calendar',
    fiscalYearEndDate: '',
  })
  // Previous-value snapshots for the In Review sub-status mutations.
  // Captured at click time (in the handlers passed to ActiveStageDetailCard)
  // so the success toast can offer an Undo that fires the reverse
  // mutation. Stored on refs (not state) so the snapshot survives the
  // mutation lifecycle without triggering a re-render.
  const prepStagePreviousRef = useRef<ObligationPrepStage | null>(null)
  const reviewStagePreviousRef = useRef<ObligationReviewStage | null>(null)
  // Materials tab multi-select model (2026-05-23). Keyed by the
  // checklist item id so the checklist action row can batch a
  // "Mark received" mutation across every selected row. Carries the
  // owning obligationId so the selection clears automatically when
  // the user switches rows — selection is local to the open drawer,
  // not a global UI state.
  const [materialsSelection, setMaterialsSelection] = useState<{
    obligationId: string
    itemIds: ReadonlySet<string>
  }>({ obligationId: '', itemIds: new Set<string>() })
  const [materialsRequestPreview, setMaterialsRequestPreview] = useState<{
    open: boolean
    obligationId: string | null
  }>({ open: false, obligationId: null })
  const [requestInputDialogOpen, setRequestInputDialogOpen] = useState(false)
  const [requestInputDraft, setRequestInputDraft] = useState<DeadlineInputRequestDraft>({
    obligationId: '',
    recipientUserId: '',
    message: '',
  })
  const [authorityRejectionDialogOpen, setAuthorityRejectionDialogOpen] = useState(false)
  // P0: editable signature-reminder email preview dialog (opened from the
  // drawer's "Remind client to sign" action).
  const [remindDialogOpen, setRemindDialogOpen] = useState(false)
  const [authorityRejectionDraft, setAuthorityRejectionDraft] = useState<AuthorityRejectionDraft>({
    rejectedAt: todayIsoDate(),
    authority: 'IRS',
    reference: '',
    reason: '',
    nextStep: 'correct_resubmit',
  })
  const [authorityRejectionReasonError, setAuthorityRejectionReasonError] = useState(false)
  const [deadlineTipRefresh, setDeadlineTipRefresh] = useState<{
    obligationId: string
    startedAt: number
  } | null>(null)
  const activeDeadlineTipRefresh =
    obligationId && deadlineTipRefresh?.obligationId === obligationId ? deadlineTipRefresh : null
  const detailQuery = useQuery({
    ...orpc.obligations.getDetail.queryOptions({
      input: { obligationId: obligationId ?? '' },
    }),
    enabled: obligationId !== null,
  })
  const requestRecipientsQuery = useQuery({
    ...orpc.members.listAssignable.queryOptions({ input: undefined }),
    enabled: obligationId !== null && canRequestInput,
  })
  const requestRecipients = useMemo(
    () =>
      // Reviewer roles (owner/partner/manager) — must mirror the server gate
      // in obligations.requestInput and the Pulse review recipient set.
      (requestRecipientsQuery.data ?? []).filter(
        (member) =>
          member.role === 'owner' || member.role === 'partner' || member.role === 'manager',
      ),
    [requestRecipientsQuery.data],
  )
  // 2026-06-08 (Pencil HuYeb /deadlines detail — top "Assign" action):
  // the full assignable roster (every role, not just owner/partner) so a
  // deadline can be handed to any teammate. Drives the Assign dropdown.
  const assignableMembersQuery = useQuery({
    ...orpc.members.listAssignable.queryOptions({ input: undefined }),
    enabled: obligationId !== null,
  })
  const assignableMembers = assignableMembersQuery.data ?? []
  const requestDeadlineTipMutation = useMutation(
    orpc.obligations.requestDeadlineTipRefresh.mutationOptions({
      onMutate: (variables) => {
        setDeadlineTipRefresh({ obligationId: variables.obligationId, startedAt: Date.now() })
      },
      onSuccess: (result, variables) => {
        const queryOptions = orpc.obligations.getDeadlineTip.queryOptions({
          input: { obligationId: variables.obligationId },
        })
        queryClient.setQueryData(queryOptions.queryKey, result.insight)
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDeadlineTip.key() })
        toast.success(t`Deadline tip refresh started`)
      },
      onError: (err) => {
        setDeadlineTipRefresh(null)
        toast.error(t`Couldn't start deadline tip refresh`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const requestInputMutation = useMutation(
    orpc.obligations.requestInput.mutationOptions({
      onSuccess: (_result, variables) => {
        const recipientName =
          requestRecipients.find((recipient) => recipient.assigneeId === variables.recipientUserId)
            ?.name ?? t`owner or partner`
        setRequestInputDialogOpen(false)
        setRequestInputDraft((current) => ({ ...current, message: '' }))
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
        toast.success(t`Sent to ${recipientName}`, {
          description: t`They'll see your note in their inbox and on this deadline.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't send input request`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const deadlineTipQuery = useQuery({
    ...orpc.obligations.getDeadlineTip.queryOptions({
      input: { obligationId: obligationId ?? '' },
    }),
    enabled: obligationId !== null,
    refetchInterval: (query) => {
      const insight = query.state.data
      if (!activeDeadlineTipRefresh) return insight?.status === 'pending' ? 5_000 : false

      const ageMs = Date.now() - activeDeadlineTipRefresh.startedAt
      if (ageMs >= DEADLINE_TIP_REFRESH_TIMEOUT_MS) return false

      const generatedAtMs = insight?.generatedAt ? Date.parse(insight.generatedAt) : 0
      const latestRefreshSettled =
        insight?.status !== 'pending' && generatedAtMs >= activeDeadlineTipRefresh.startedAt
      return latestRefreshSettled ? false : DEADLINE_TIP_REFRESH_POLL_INTERVAL_MS
    },
  })
  const detail = detailQuery.data
  const row = detail?.row ?? null
  const selectedRequestRecipientUserId =
    requestInputDraft.recipientUserId || requestRecipients[0]?.assigneeId || ''
  const latestInputRequest = useMemo(
    () => latestDeadlineInputRequest(detail?.auditEvents ?? []),
    [detail?.auditEvents],
  )
  const latestInputRequestRecipient = latestInputRequest?.recipientName ?? t`owner or partner`
  const latestInputRequestTitle = latestInputRequest
    ? t`Input requested from ${latestInputRequestRecipient} on ${formatDateTimeWithTimezone(latestInputRequest.createdAt, practiceTimezone)}`
    : undefined
  // `obligationTypeLabels` lookup was retired with the header distill
  // (2026-05-21) — the "FILING" badge it backed is gone. If a future
  // surface wants the human label, re-add via `useObligationTypeLabels()`.
  // Type-aware drawer surface: per PRD §3.1 different obligation types
  // expose different tabs. A `payment` row has no readiness checklist;
  // a `client_action` row has no deadline readiness surface.
  const visibleTabsList = useMemo(() => {
    const base = tabsForObligationType(row?.obligationType ?? null)
    // 2026-06-09 (Yuqi /deadlines detail rebuild — Pencil rzzww): the
    // standalone page shows the locked 4-tab set Status · Materials ·
    // Record · Audit (memory: tab count locked). Map onto the existing
    // tab values (Status=summary, Record=evidence) and drop Extension +
    // Risk — Extension folds into the Status workflow as a follow-up;
    // Risk was already unmounted. The set still adapts per obligation
    // type (a payment row keeps Status/Record/Audit, no Materials).
    if (!isPageMode) return base
    return base.filter(
      (tab) => tab === 'summary' || tab === 'readiness' || tab === 'evidence' || tab === 'audit',
    )
  }, [row?.obligationType, isPageMode])
  const visibleTabs = useMemo(() => new Set(visibleTabsList), [visibleTabsList])
  // If the URL pins a tab that this obligation type doesn't expose
  // (e.g. ?tab=extension on a payment row), bounce to the first tab
  // this type actually has. Otherwise the drawer body renders empty.
  //
  // 2026-05-24 (useEffect audit): the previous shape ran this as a
  // useEffect that ran post-render. Replaced with the React-
  // recommended render-time adjustment pattern. `onTabChange` is
  // idempotent (it just updates URL state), so calling it during
  // render is safe — React bails out of the re-render when the URL
  // already matches the requested value.
  const tabFallback = row && !visibleTabs.has(activeTab) ? (visibleTabsList[0] ?? null) : null
  if (tabFallback && tabFallback !== activeTab) {
    onTabChange(tabFallback)
  }
  const deadlineTipInsight = deadlineTipQuery.data ?? null
  const deadlineTipGeneratedAtMs = deadlineTipInsight?.generatedAt
    ? Date.parse(deadlineTipInsight.generatedAt)
    : 0
  const deadlineTipLatestRefreshSettled = Boolean(
    activeDeadlineTipRefresh &&
    deadlineTipInsight?.status !== 'pending' &&
    deadlineTipGeneratedAtMs >= activeDeadlineTipRefresh.startedAt,
  )
  const deadlineTipRefreshTimedOut = Boolean(
    activeDeadlineTipRefresh &&
    !deadlineTipLatestRefreshSettled &&
    Date.now() - activeDeadlineTipRefresh.startedAt >= DEADLINE_TIP_REFRESH_TIMEOUT_MS,
  )
  const deadlineTipPreparing = Boolean(
    requestDeadlineTipMutation.isPending ||
    (activeDeadlineTipRefresh && !deadlineTipLatestRefreshSettled && !deadlineTipRefreshTimedOut),
  )
  // `deadlineTipPreparing` is currently unconsumed (Risk tab owned the
  // visual surface). Kept declared because the mutation/query
  // pipeline it summarizes is still wired; a follow-up should either
  // restore a deadline-tip surface elsewhere or rip the whole
  // pipeline. Tracked in TODO below.
  void deadlineTipPreparing
  const latestRequest = detail?.readinessRequests[0] ?? null
  const storedChecklist = detail?.readinessChecklist ?? EMPTY_DOCUMENT_CHECKLIST
  // Extension policy from the matched rule (drives the extended-deadline math).
  const extensionPolicy = detail?.matchedRule?.extensionPolicy ?? null
  const extensionDurationMonths = extensionPolicy?.durationMonths ?? null
  const extensionOriginalDeadline = row?.baseDueDate ?? ''
  // The statutory extended filing deadline, computed from the immutable base
  // date so it matches the server (and stays stable across re-saves). Rules
  // with no durationMonths (Form 8809 / TX franchise) need a manual date.
  const extensionComputedDeadline =
    row && extensionDurationMonths !== null && isValidIsoDate(row.baseDueDate)
      ? computeExtendedFilingDeadline(
          new Date(`${row.baseDueDate}T00:00:00.000Z`),
          extensionDurationMonths,
        )
          .toISOString()
          .slice(0, 10)
      : ''
  const extensionNeedsManualDeadline = Boolean(row) && extensionDurationMonths === null
  // The cap for the internal target picker = the extended filing deadline
  // (manual date when the rule has no duration). The internal target can now
  // sit anywhere up to the extended deadline — the whole point of an extension.
  const extensionDeadlineCap = extensionNeedsManualDeadline
    ? extensionDraft.extendedFilingDate
    : extensionComputedDeadline
  const extensionManualDeadlineInvalid =
    extensionNeedsManualDeadline &&
    extensionDraft.extendedFilingDate !== '' &&
    isValidIsoDate(extensionOriginalDeadline) &&
    extensionDraft.extendedFilingDate <= extensionOriginalDeadline
  const internalTargetDateInvalid = row
    ? !isInternalExtensionTargetDateValid(extensionDraft.internalTargetDate, extensionDeadlineCap)
    : false
  const fiscalYearEnd = fiscalYearEndParts(taxYearDraft.fiscalYearEndDate)
  const taxYearFiscalMissing =
    taxYearDraft.taxYearType === 'fiscal' && !taxYearDraft.fiscalYearEndDate.trim()
  const taxYearFiscalInvalid =
    taxYearDraft.taxYearType === 'fiscal' &&
    Boolean(taxYearDraft.fiscalYearEndDate) &&
    !fiscalYearEnd
  const taxYearProfileChanged = Boolean(
    row &&
    (taxYearDraft.taxYearType !== row.taxYearType ||
      (taxYearDraft.taxYearType === 'fiscal' &&
        (fiscalYearEnd?.month !== row.fiscalYearEndMonth ||
          fiscalYearEnd?.day !== row.fiscalYearEndDay)) ||
      (taxYearDraft.taxYearType === 'calendar' &&
        (row.fiscalYearEndMonth !== null || row.fiscalYearEndDay !== null))),
  )
  const taxYearProfileSummary =
    row?.taxYearType === 'fiscal' && row.fiscalYearEndMonth && row.fiscalYearEndDay
      ? `${t`Fiscal year`} · ${formatFiscalYearEnd(row.fiscalYearEndMonth, row.fiscalYearEndDay)}`
      : t`Calendar year`
  const taxYearProfileEditable = Boolean(row?.taxYearProfileEditable)

  if (row && extensionDraft.obligationId !== row.id) {
    setExtensionDraft(extensionPlanDraftFromRow(row))
  }
  if (row && taxYearDraft.obligationId !== row.id) {
    setTaxYearDraft({
      obligationId: row.id,
      taxYearType: row.taxYearType,
      fiscalYearEndDate: fiscalYearEndDraftValue(row.fiscalYearEndMonth, row.fiscalYearEndDay),
    })
  }
  // Switching rows clears the Materials multi-selection. The
  // selection is local to the drawer of a single obligation — when
  // the user navigates to a different row, the old selection is
  // meaningless. Same pattern as the extensionDraft / taxYearDraft
  // syncs above.
  if (row && materialsSelection.obligationId !== row.id) {
    setMaterialsSelection({ obligationId: row.id, itemIds: new Set<string>() })
  }
  // Items that exist in the selection but no longer in the checklist
  // (deleted, regenerated) shouldn't keep accumulating. Quietly prune.
  const checklistItemIds = useMemo(
    () => new Set(detail?.readinessChecklist.map((item) => item.id) ?? []),
    [detail?.readinessChecklist],
  )
  if (row && materialsSelection.obligationId === row.id) {
    let prunedItemIds: Set<string> | null = null
    for (const id of materialsSelection.itemIds) {
      if (!checklistItemIds.has(id)) {
        if (!prunedItemIds) prunedItemIds = new Set(materialsSelection.itemIds)
        prunedItemIds.delete(id)
      }
    }
    if (prunedItemIds) {
      setMaterialsSelection({ obligationId: row.id, itemIds: prunedItemIds })
    }
  }

  function invalidateDetail() {
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDetail.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.listByClient.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.obligations.getDeadlineTip.key() })
    void queryClient.invalidateQueries({ queryKey: orpc.audit.key() })
  }

  const generateChecklistMutation = useMutation(
    orpc.readiness.generateChecklist.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(
          result.degraded ? t`Fallback document list ready` : t`Document list generated`,
        )
      },
      onError: (err) => {
        toast.error(t`Couldn't generate document list`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const shouldAutoGenerateChecklist = Boolean(
    row && visibleTabs.has('readiness') && !generateChecklistMutation.isPending,
  )
  const autoGenerateChecklistMutationOptions = orpc.readiness.generateChecklist.mutationOptions()
  const autoGenerateChecklistQuery = useQuery({
    queryKey: ['obligations', 'readiness-checklist', 'auto-generate', row?.id ?? null],
    queryFn: async () => {
      const activeObligationId = row?.id
      const mutationFn = autoGenerateChecklistMutationOptions.mutationFn
      if (!activeObligationId || !mutationFn) throw new Error('Checklist generation unavailable.')
      const result = await mutationFn(
        { obligationId: activeObligationId },
        {
          client: queryClient,
          meta: autoGenerateChecklistMutationOptions.meta,
        },
      )
      invalidateDetail()
      return { obligationId: activeObligationId, result }
    },
    enabled: shouldAutoGenerateChecklist,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
  const autoGeneratedChecklist =
    row && autoGenerateChecklistQuery.data?.obligationId === row.id
      ? autoGenerateChecklistQuery.data.result.checklist
      : null
  const checklist =
    storedChecklist.length > 0 ? storedChecklist : (autoGeneratedChecklist ?? storedChecklist)
  const correctionMaterialsMode = row?.status === 'review' && row.efileRejectedAt !== null
  const correctionChecklistItems = checklist.filter((item) => item.status === 'needs_review')
  const canOpenMaterialsRequestPreview =
    checklist.length > 0 && (!correctionMaterialsMode || correctionChecklistItems.length > 0)
  const canShowMaterialsRequestAction =
    !latestRequest ||
    latestRequest.status === 'revoked' ||
    (correctionMaterialsMode &&
      (latestRequest.status === 'responded' || latestRequest.status === 'expired'))
  // 2026-05-26 (Step 9 AI Visibility Audit F-020): surface the
  // "degraded fallback list" signal as an inline banner above the
  // checklist, not just a 4-second toast that disappears forever.
  // The degraded flag IS the AI's "I'm not sure" state — losing
  // it on render means the user can't tell a fallback-list run
  // apart from a real run on a stale tab.
  const checklistDegraded = Boolean(
    row &&
    autoGenerateChecklistQuery.data?.obligationId === row.id &&
    autoGenerateChecklistQuery.data?.result.degraded &&
    storedChecklist.length === 0,
  )
  const checklistItemsForSelection = checklist.filter((item) =>
    correctionMaterialsMode
      ? item.status === 'received'
      : item.status !== 'received' && item.status !== 'waived',
  )
  const checklistItemIdsForSelection = checklistItemsForSelection.map((item) => item.id)
  const selectedChecklistItemIdsForAction =
    row && materialsSelection.obligationId === row.id
      ? checklistItemIdsForSelection.filter((itemId) => materialsSelection.itemIds.has(itemId))
      : []
  const selectedChecklistItemCount = selectedChecklistItemIdsForAction.length
  const allMaterialsSelected =
    checklistItemIdsForSelection.length > 0 &&
    selectedChecklistItemCount === checklistItemIdsForSelection.length
  const checklistGenerating =
    generateChecklistMutation.isPending || autoGenerateChecklistQuery.isFetching
  const previewRequestEmailMutation = useMutation(
    orpc.readiness.previewRequestEmail.mutationOptions({
      onError: (err) => {
        toast.error(t`Couldn't prepare materials request preview`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const sendRequestMutation = useMutation(
    orpc.readiness.sendRequest.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(result.emailQueued ? t`Materials request sent` : t`Materials link created`)
      },
      onError: (err) => {
        toast.error(t`Couldn't send materials request`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const previewRequestEmail =
    previewRequestEmailMutation.data?.obligationId === materialsRequestPreview.obligationId
      ? previewRequestEmailMutation.data
      : null
  function closeMaterialsRequestPreview() {
    setMaterialsRequestPreview({ open: false, obligationId: null })
    previewRequestEmailMutation.reset()
  }
  function openMaterialsRequestPreview(activeObligationId: string) {
    setMaterialsRequestPreview({ open: true, obligationId: activeObligationId })
    previewRequestEmailMutation.mutate({ obligationId: activeObligationId })
  }
  const addChecklistItemMutation = useMutation(
    orpc.readiness.addChecklistItem.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
        toast.success(t`Document item added`)
      },
      onError: (err) => {
        toast.error(t`Couldn't add document item`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const updateChecklistItemMutation = useMutation(
    orpc.readiness.updateChecklistItem.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
      },
      onError: (err) => {
        toast.error(t`Couldn't update document item`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const deleteChecklistItemMutation = useMutation(
    orpc.readiness.deleteChecklistItem.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
        toast.success(t`Document item removed`)
      },
      onError: (err) => {
        toast.error(t`Couldn't remove document item`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const revokeRequestMutation = useMutation(
    orpc.readiness.revokeRequest.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
        toast.success(t`Materials request revoked`)
      },
      onError: (err) => {
        toast.error(t`Couldn't revoke request`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const updateTaxYearProfileMutation = useMutation(
    orpc.obligations.updateTaxYearProfile.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(t`Tax year profile saved`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't save tax year profile`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const decideExtensionMutation = useMutation(
    orpc.obligations.decideExtension.mutationOptions({
      onSuccess: (result, variables) => {
        invalidateDetail()
        setExtensionDraft(emptyExtensionPlanDraft(variables.id))
        toast.success(t`Extension plan saved`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't save extension plan`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const saveExtensionPlanDisabled =
    !row ||
    (extensionNeedsManualDeadline &&
      (extensionDraft.extendedFilingDate === '' || extensionManualDeadlineInvalid)) ||
    !canSaveInternalExtensionPlan({
      draftTargetDate: extensionDraft.internalTargetDate,
      filingDeadline: extensionDeadlineCap,
      isPending: decideExtensionMutation.isPending,
      memo: extensionDraft.memo,
    })
  // Lifecycle v2 slice 2d.3: manual acceptance — when a filed return has
  // been accepted by the authority (e-file accepted / paper return
  // received with no rejection), the preparer marks it complete from the
  // drawer header. Closes the "Filed ≠ Done" loop (PDF anti-pattern #3).
  const markAcceptedMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(t`Marked accepted`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't mark accepted`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // PDF anti-pattern #3 (Filed ≠ Done): when the IRS / state rejects an
  // e-filed return, the preparer unwinds the row from `done` ("Filed")
  // back to `review` ("In review") with an `efile_rejected_at` stamp.
  // The Rejected chip auto-renders on the queue thereafter.
  const markFiledRejectedMutation = useMutation(
    orpc.obligations.markFiledRejected.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        toast.success(t`Marked e-file rejected`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't mark e-file rejected`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // 2026-06-08 (Pencil HuYeb /deadlines detail — top actions): per-deadline
  // assignee + snooze. Both reuse the status-update output shape (obligation
  // + auditId) and invalidate the detail + queue so the header, the table's
  // Assignee column, and the snooze-driven list filter all re-read.
  const assignMutation = useMutation(
    orpc.obligations.assign.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        const name = result.obligation.assigneeId
          ? (assignableMembers.find((m) => m.assigneeId === result.obligation.assigneeId)?.name ??
            t`teammate`)
          : null
        toast.success(name ? t`Assigned to ${name}` : t`Assignee cleared`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't update assignee`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const snoozeMutation = useMutation(
    orpc.obligations.snooze.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        toast.success(result.obligation.snoozedUntil ? t`Deadline snoozed` : t`Snooze cleared`, {
          description: t`Audit ${result.auditId.slice(0, 8)}`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't snooze deadline`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // P0 signature loop: advance the e-file pipeline from
  // authorization_requested → authorization_signed when the client returns
  // their signed 8879. Sub-status only — status stays `done` ("Filed").
  // Base mutation handles invalidate + error toast; the success toast
  // (with Undo) fires from the per-call onSuccess at the call site, same
  // split as `changeStatus` below.
  const updateEfileStateMutation = useMutation(
    orpc.obligations.updateEfileState.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
      },
      onError: (err) => {
        toast.error(t`Couldn't update e-file state`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // P0: email the client a Form 8879 signature reminder. Record-and-send —
  // the server queues the email AND writes an audit row (so the stage card
  // can surface "last reminded N days ago"). No Undo — you can't unsend.
  const remindSignatureMutation = useMutation(
    orpc.obligations.remindSignature.mutationOptions({
      onSuccess: (result) => {
        invalidateDetail()
        if (result.emailQueued) {
          toast.success(t`Signature reminder emailed`)
        } else {
          toast.warning(t`No client email on file`, {
            description: t`Add an email address for this client to send signature reminders.`,
          })
        }
      },
      onError: (err) => {
        toast.error(t`Couldn't send reminder`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // Generic status-change mutation — drives BOTH the contextual
  // forward buttons (Start preparation / Mark docs received / Mark
  // unblocked / Mark filed) AND the interactive status pill in the
  // drawer header. Toast copy uses the destination label so the CPA
  // gets the same feedback regardless of how the transition fired.
  // Kept distinct from markAcceptedMutation / markFiledRejectedMutation
  // because those have specific authority-acceptance/-rejection
  // semantics (different RPC procedure for rejection) and bespoke
  // toast copy worth preserving.
  // The base mutation only handles cache invalidation + error toast.
  // The success toast (with its contextual Undo action) is fired by
  // the `changeStatus` callback below so it can close over the
  // `previousStatus` snapshot — react-query's onSuccess only sees the
  // input vars and result, not the value the row was at before the
  // mutation. Same pattern the queue page uses (see ObligationsRoute
  // → `updateStatus` callback) so drawer + queue offer parity Undo.
  const changeStatusMutation = useMutation(
    orpc.obligations.updateStatus.mutationOptions({
      onSuccess: () => {
        invalidateDetail()
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
  // Per-call wrapper: captures the previous status so the success
  // toast can offer Undo. Used by both the status pill in the drawer
  // header and the forward-action buttons in ActiveStageDetailCard.
  // No-op clicks (previous === next) skip the Undo affordance since
  // there's nothing to reverse.
  const changeStatus = useCallback(
    (id: string, nextStatus: ObligationStatus, previousStatus: ObligationStatus) => {
      changeStatusMutation.mutate(
        { id, status: nextStatus },
        {
          onSuccess: (result) => {
            const canUndo = previousStatus !== nextStatus
            toast.success(t`Status changed to ${statusLabels[nextStatus]}`, {
              description: t`Audit ${result.auditId.slice(0, 8)}`,
              ...(canUndo
                ? {
                    action: {
                      label: t`Undo`,
                      onClick: () => {
                        changeStatusMutation.mutate({ id, status: previousStatus })
                      },
                    },
                  }
                : {}),
            })
          },
        },
      )
    },
    [changeStatusMutation, statusLabels, t],
  )
  function advanceWaitingRowToReview() {
    if (!row || row.status !== 'waiting_on_client') return
    onTabChange('summary')
    changeStatus(row.id, 'review', row.status)
  }
  // In Review sub-status mutations — the prep ↔ review pipeline strip
  // in the active stage card flips these on click. Slider model: any
  // step can move to any other step (forward, backward, jump). Each
  // success surfaces an Undo toast that fires the inverse mutation if
  // the user catches a misclick. Previous value comes from the caller
  // (captured at click time from `row.prepStage` / `row.reviewStage`)
  // since by the time the success handler runs, react-query has
  // already invalidated the cache and the "previous" is gone.
  const updatePrepStageMutation = useMutation(
    orpc.obligations.updatePrepStage.mutationOptions({
      onSuccess: (result, vars) => {
        invalidateDetail()
        const previous = prepStagePreviousRef.current
        // Wipe the ref so consecutive clicks don't replay an
        // older snapshot. Each click re-captures before mutate.
        prepStagePreviousRef.current = null
        const message = t`Step updated`
        if (previous && previous !== vars.prepStage) {
          toast.success(message, {
            description: t`Audit ${result.auditId.slice(0, 8)}`,
            action: {
              label: t`Undo`,
              onClick: () => {
                updatePrepStageMutation.mutate({ id: vars.id, prepStage: previous })
              },
            },
          })
        } else {
          toast.success(message, { description: t`Audit ${result.auditId.slice(0, 8)}` })
        }
      },
      onError: (err) => {
        prepStagePreviousRef.current = null
        toast.error(t`Couldn't update step`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  const updateReviewStageMutation = useMutation(
    orpc.obligations.updateReviewStage.mutationOptions({
      onSuccess: (result, vars) => {
        invalidateDetail()
        const previous = reviewStagePreviousRef.current
        reviewStagePreviousRef.current = null
        const message = t`Step updated`
        if (previous && previous !== vars.reviewStage) {
          toast.success(message, {
            description: t`Audit ${result.auditId.slice(0, 8)}`,
            action: {
              label: t`Undo`,
              onClick: () => {
                updateReviewStageMutation.mutate({ id: vars.id, reviewStage: previous })
              },
            },
          })
        } else {
          toast.success(message, { description: t`Audit ${result.auditId.slice(0, 8)}` })
        }
      },
      onError: (err) => {
        reviewStagePreviousRef.current = null
        toast.error(t`Couldn't update step`, {
          description:
            rpcErrorMessage(err) ??
            t`Check your network and try again. If this keeps happening, contact support.`,
        })
      },
    }),
  )
  // `updateBlockedByMutation` retired 2026-05-21 with the K-1 editor.
  // The RPC procedure (orpc.obligations.updateBlockedBy) still ships;
  // re-bind here when the new blocker UX lands.
  function updateDocumentChecklistItem(
    itemId: string,
    patch: {
      label?: string
      description?: string | null
      status?: ReadinessDocumentChecklistItemPublic['status']
      note?: string | null
    },
  ) {
    const shouldAdvanceToReview =
      patch.status === 'received' &&
      row?.status === 'waiting_on_client' &&
      willReadinessChecklistBeFullyReceived(checklist, new Set([itemId]))
    updateChecklistItemMutation.mutate(
      { itemId, ...patch },
      {
        onSuccess: () => {
          if (shouldAdvanceToReview) advanceWaitingRowToReview()
        },
      },
    )
  }

  // Materials multi-select handlers (2026-05-23). Toggling a row's
  // selection updates the local Set; the checklist action row shows
  // selected-item actions when itemIds.size > 0. The batch "Mark
  // received" calls the existing per-item update RPC for each selected
  // id in parallel.
  // Items already received are skipped to avoid emitting no-op audit
  // events; if the batch leaves every item received, the row advances
  // to In review from the Summary tab.
  function toggleMaterialsSelection(itemId: string) {
    if (!row) return
    const item = checklist.find((entry) => entry.id === itemId)
    if (!item) return
    if (
      correctionMaterialsMode
        ? item.status !== 'received'
        : item.status === 'received' || item.status === 'waived'
    )
      return
    setMaterialsSelection((current) => {
      const next = new Set(current.itemIds)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return { obligationId: row.id, itemIds: next }
    })
  }
  function clearMaterialsSelection() {
    if (!row) return
    setMaterialsSelection({ obligationId: row.id, itemIds: new Set<string>() })
  }
  function selectAllMaterials() {
    if (!row) return
    setMaterialsSelection({
      obligationId: row.id,
      itemIds: new Set(checklistItemIdsForSelection),
    })
  }
  async function batchMarkReceived(itemIds: ReadonlySet<string>) {
    if (!row) return
    const receivingItemIds = new Set<string>()
    for (const itemId of itemIds) {
      const item = detail?.readinessChecklist.find((entry) => entry.id === itemId)
      if (!item || item.status === 'received') continue
      receivingItemIds.add(itemId)
    }
    const shouldAdvanceToReview =
      row.status === 'waiting_on_client' &&
      willReadinessChecklistBeFullyReceived(checklist, receivingItemIds)
    if (receivingItemIds.size === 0) {
      clearMaterialsSelection()
      if (shouldAdvanceToReview) advanceWaitingRowToReview()
      return
    }
    try {
      await Promise.all(
        [...receivingItemIds].map((itemId) =>
          updateChecklistItemMutation.mutateAsync({ itemId, status: 'received' }),
        ),
      )
    } catch {
      return
    }
    clearMaterialsSelection()
    toast.success(
      receivingItemIds.size === 1
        ? t`Marked 1 item received`
        : t`Marked ${receivingItemIds.size} items received`,
    )
    if (shouldAdvanceToReview) advanceWaitingRowToReview()
  }

  async function batchMarkNeedsCorrection(itemIds: ReadonlySet<string>) {
    if (!row) return
    const correctionItemIds = new Set<string>()
    for (const itemId of itemIds) {
      const item = detail?.readinessChecklist.find((entry) => entry.id === itemId)
      if (!item || item.status !== 'received') continue
      correctionItemIds.add(itemId)
    }
    if (correctionItemIds.size === 0) {
      clearMaterialsSelection()
      return
    }
    try {
      await Promise.all(
        [...correctionItemIds].map((itemId) =>
          updateChecklistItemMutation.mutateAsync({ itemId, status: 'needs_review' }),
        ),
      )
    } catch {
      return
    }
    clearMaterialsSelection()
    toast.success(
      correctionItemIds.size === 1
        ? t`Marked 1 item needs correction`
        : t`Marked ${correctionItemIds.size} items need correction`,
    )
  }

  function addChecklistItem() {
    if (!row) return
    addChecklistItemMutation.mutate({
      obligationId: row.id,
      label: t`Custom document`,
      description: null,
    })
  }

  function removeChecklistItem(itemId: string) {
    deleteChecklistItemMutation.mutate({ itemId })
  }

  async function copyLatestLink() {
    const portalUrl = latestRequest?.portalUrl
    if (!portalUrl) return
    try {
      await copyTextToClipboard(portalUrl)
      toast.success(t`Portal link copied`)
    } catch {
      toast.error(t`Couldn't copy link — your browser blocked clipboard access.`)
    }
  }

  function openLatestLink() {
    const portalUrl = latestRequest?.portalUrl
    if (!portalUrl) return
    openExternalUrl(portalUrl)
  }

  function saveTaxYearProfile() {
    if (!row || !taxYearProfileEditable) return
    updateTaxYearProfileMutation.mutate({
      id: row.id,
      taxYearType: taxYearDraft.taxYearType,
      fiscalYearEndMonth:
        taxYearDraft.taxYearType === 'fiscal' ? (fiscalYearEnd?.month ?? null) : null,
      fiscalYearEndDay: taxYearDraft.taxYearType === 'fiscal' ? (fiscalYearEnd?.day ?? null) : null,
      reason: 'Deadline readiness tax year profile edit',
    })
  }

  function saveExtensionDecision() {
    if (!row) return
    if (extensionNeedsManualDeadline && !extensionDraft.extendedFilingDate) {
      toast.error(t`Enter the extended filing deadline.`)
      return
    }
    if (extensionManualDeadlineInvalid) {
      toast.error(t`Extended filing deadline must be after the original deadline.`)
      return
    }
    if (!extensionDraft.internalTargetDate) {
      toast.error(t`Internal extension target date is required.`)
      return
    }
    if (extensionDraft.memo.trim().length === 0) {
      toast.error(t`Decision memo is required.`)
      return
    }
    if (internalTargetDateInvalid) {
      toast.error(
        t`Internal extension target date must be on or before the extended filing deadline.`,
      )
      return
    }

    decideExtensionMutation.mutate({
      id: row.id,
      memo: extensionDraft.memo.trim(),
      ...(extensionDraft.source.trim() ? { source: extensionDraft.source.trim() } : {}),
      internalTargetDate: extensionDraft.internalTargetDate,
      ...(extensionNeedsManualDeadline && extensionDraft.extendedFilingDate
        ? { extendedFilingDate: extensionDraft.extendedFilingDate }
        : {}),
    })
  }

  function openRequestInputDialog() {
    if (!row || !canRequestInput) return
    setRequestInputDraft((current) => ({
      obligationId: row.id,
      recipientUserId:
        current.obligationId === row.id
          ? current.recipientUserId || requestRecipients[0]?.assigneeId || ''
          : requestRecipients[0]?.assigneeId || '',
      message: current.obligationId === row.id ? current.message : '',
    }))
    setRequestInputDialogOpen(true)
  }

  function closeRequestInputDialog() {
    setRequestInputDialogOpen(false)
  }

  function submitRequestInput() {
    if (!row || !canRequestInput) return
    const recipientUserId = selectedRequestRecipientUserId
    const message = requestInputDraft.message.trim()
    if (!recipientUserId) {
      toast.error(t`Choose an owner or partner.`)
      return
    }
    if (!message) {
      toast.error(t`Message is required.`)
      return
    }
    requestInputMutation.mutate({
      obligationId: row.id,
      recipientUserId,
      message,
    })
  }

  function openAuthorityRejectionDialog() {
    if (!row || row.status !== 'done') return
    setAuthorityRejectionDraft(defaultAuthorityRejectionDraft(row))
    setAuthorityRejectionReasonError(false)
    setAuthorityRejectionDialogOpen(true)
  }

  function closeAuthorityRejectionDialog() {
    setAuthorityRejectionDialogOpen(false)
    setAuthorityRejectionReasonError(false)
  }

  function submitAuthorityRejection() {
    if (!row) return
    const reason = authorityRejectionDraft.reason.trim()
    if (
      !authorityRejectionDraft.rejectedAt ||
      !isValidIsoDate(authorityRejectionDraft.rejectedAt)
    ) {
      toast.error(t`Rejected date is required.`)
      return
    }
    if (!reason) {
      setAuthorityRejectionReasonError(true)
      toast.error(t`Reason is required.`)
      return
    }

    markFiledRejectedMutation.mutate(
      {
        id: row.id,
        rejectedAt: authorityRejectionDraft.rejectedAt,
        authority: cleanOptionalText(authorityRejectionDraft.authority),
        reference: cleanOptionalText(authorityRejectionDraft.reference),
        reason,
        nextStep: authorityRejectionDraft.nextStep,
      },
      {
        onSuccess: closeAuthorityRejectionDialog,
      },
    )
  }

  // 2026-06-10 (Yuqi alert↔deadline parity #2): keyboard interactions
  // matching the alert drawer. Page mode only — the in-context page is the
  // surface that mirrors the alert's full-window keyboard model; the
  // /clients sheet/panel keeps click-only nav.
  //
  // ▲ / ▼ page prev/next through the surrounding rail list (the rail stays
  // the primary click navigator). Ignored while typing in a field and while
  // any dialog is stacked above, so it never hijacks search/text input.
  // Mirrors AlertDetailDrawer's ArrowUp/ArrowDown pager.
  useEffect(() => {
    if (!isPageMode || (!onPrev && !onNext)) return undefined
    const handler = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      if (isModalLayerOpen()) return
      if (event.key === 'ArrowUp' && onPrev) {
        event.preventDefault()
        onPrev()
      } else if (event.key === 'ArrowDown' && onNext) {
        event.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPageMode, onPrev, onNext])

  // F = mark filed / advance — the deadline analogue of the alert's `A`
  // primary-decision hotkey. Fires the SAME `changeStatus(row.id, 'done')`
  // the footer's "Mark as filed" primary fires, so the keyboard + button
  // stay in lockstep. No-op (disabled) once the row is already filed /
  // completed. Skipped while typing, while a dialog is open, and while a
  // mutation is in flight. Page mode only.
  const rowIsFiled = row?.status === 'done' || row?.status === 'completed' || row?.status === 'paid'
  const changeStatusPending = changeStatusMutation.isPending
  useEffect(() => {
    if (!isPageMode || !row || rowIsFiled) return undefined
    const handler = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || changeStatusPending) return
      if (isModalLayerOpen()) return
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        changeStatus(row.id, 'done', row.status)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPageMode, row, rowIsFiled, changeStatusPending, changeStatus])

  const checklistReference = row ? materialsChecklistReference(row) : null
  // The visible heading is shared with the drawer body. SheetTitle
  // stays sr-only below so Radix Dialog gets its accessible name
  // without duplicating header chrome. Title uses the form code now
  // (e.g. "Form 1040") with the client name as a kicker label above
  // — see header comment below for the rationale.
  const titleText = row?.clientName ?? null
  const drawerBody = (
    <>
      {/* 2026-06-10 (Yuqi alert↔deadline parity #1): in-surface top bar —
          "‹ Deadlines" crumb + "N of M" position + close ✕, all inside the
          drawer body (page mode) so it shares the 760px document measure
          and scroll column with the hero/body/footer below, exactly like
          AlertDetailDrawer's BackStrip. */}
      {isPageMode ? <DeadlineCrumbBar position={position} onClose={onClose} /> : null}
      {/* 2026-06-08 (Yuqi /deadlines ↔ /alerts parity #1): thin h-7 top
          status banner mirroring AlertDetailDrawer's DecisionBanners
          (L424). One band, colored by deadline state — red when overdue,
          green when filed/completed, amber otherwise — carrying the
          status text on the left and a quiet timing note on the right.
          This subsumes the inline status-dot+label that used to sit on
          the header status row.
          2026-06-10 (Yuqi alert↔deadline parity #3): page mode now ALSO
          shows this full-bleed status band (was page-excluded). Mirrors
          AlertDetailDrawer, where the colored status band sits at the very
          top above the header — so status lives in the SAME place on both
          surfaces. The header status chip is dropped in page mode below to
          avoid stating status twice (critique: de-dupe status). */}
      {row
        ? (() => {
            const isDone =
              row.status === 'done' || row.status === 'completed' || row.status === 'paid'
            const isOverdue = row.daysUntilDue < 0 && !isDone
            const officialIso = row.filingDueDate ?? row.baseDueDate ?? row.currentDueDate
            // Count strings use the <Plural>/<Trans> COMPONENTS (not the
            // `plural()`/`i18n._` macro pair) — the macro expands to reference an
            // `i18n` binding that isn't in this component's scope, which tsgo
            // can't see (build-time expansion) but crashes at runtime.
            const timingNote =
              isDone || isOverdue ? (
                officialIso ? (
                  t`Due ${formatDate(officialIso)}`
                ) : null
              ) : row.daysUntilDue >= 0 ? (
                <Plural value={row.daysUntilDue} one="due in # day" other="due in # days" />
              ) : null
            if (isOverdue) {
              return (
                <DetailStatusBanner
                  compact
                  tone="danger"
                  icon={AlertTriangleIcon}
                  title={
                    <Trans>
                      Past deadline ·{' '}
                      <Plural
                        value={Math.abs(row.daysUntilDue)}
                        one="# day overdue"
                        other="# days overdue"
                      />
                    </Trans>
                  }
                  note={timingNote}
                />
              )
            }
            if (isDone) {
              return (
                <DetailStatusBanner
                  compact
                  tone="success"
                  icon={CheckCircle2Icon}
                  title={
                    row.status === 'completed' ? <Trans>Completed</Trans> : <Trans>Filed</Trans>
                  }
                  note={timingNote}
                />
              )
            }
            return (
              <DetailStatusBanner
                compact
                tone="warning"
                icon={AlarmClockIcon}
                title={statusLabels[row.status]}
                note={timingNote}
              />
            )
          })()
        : null}
      {/* Header — flipped 2026-05-23. The drawer is a per-obligation
          surface, so the obligation identity (Form 1040, Form 1120-S)
          deserves the primary slot, not the client. Earlier shape
          made client name the h2 and pushed the form code into a
          tertiary line under it; CPAs scanning a drawer just opened
          from "what is THIS row?" had to read three lines to know
          which deadline they were looking at.

          New shape:
            line 1: client name (clickable kicker) + close X
            line 2: Form code (h2) + status pill, on one row
            line 3: TY year · jurisdiction (compact secondary meta)
          Internal/statutory deadlines moved into a dedicated 3-col
          strip below the header (was: duplicated in dates panel). */}
      {/* 2026-05-25 (Yuqi Deadlines #17): drawer header had py-4
          (16px top + bottom), which made the title sit lower than
          the page top — wasted real estate at the top of the
          drawer. Reduced to py-3 (12px) so the form-code h2 reads
          right at the top edge. */}
      {/* 2026-05-26 (Yuqi drawer canonical — cross-drawer match):
          header padding `px-5 py-3` → `px-12 py-10` per the drawer
          canonical (see docs/Design/inset-surface-design-system.md
          "Drawer canonical"). */}
      {/* 2026-05-26 (Yuqi sixty-first pass — header tighter):
          py-10 → py-6 (40px → 24px vertical). On the obligation
          drawer the header carries the form-code h2 + flag chips +
          meta line — about 80-100px of content. py-10 (40+40)
          added 80px of dead chrome around it. py-6 (24+24) gives
          enough breathing room without the panel reading as half-
          empty before the body even starts. Alert drawer keeps
          py-10 because its header has a state kicker + bigger h1
          + chip row + description — more content earning more
          vertical space. */}
      {/* 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
          header padding aligned to AlertDetailDrawer.tsx L574
          (`px-12 py-10`). Both right-rail drawers in the product
          now share the same paper-document header rhythm — same
          left margin top-to-bottom, same vertical breathing room
          above the title. The earlier inset-followups tightening
          (px-8 py-5) was reverted in favor of cross-drawer
          consistency per Yuqi's "should match Alert detail"
          instruction. */}
      {/* 2026-05-27 (Yuqi "remove top padding"): header pt-10 → pt-4
          so the title sits closer to the top of the drawer. Bottom
          spacing kept (pb-10) for the breathing gap before tabs. */}
      {/* 2026-06-08 (Yuqi /deadlines ↔ /alerts parity #3): header rhythm
          aligned to the alerts SheetHeader (`px-12 pt-10 pb-6`) so both
          right-rail drawers share the same paper-document header spacing.
          The corner close X (parity #4) still anchors this header. */}
      <header
        className={cn(
          'relative flex flex-col px-12 transition-all duration-200',
          heroCollapsed ? 'gap-1 pt-3 pb-3' : 'gap-1.5 pt-10 pb-6',
          // 2026-06-10 (Yuqi alert↔deadline parity #6/#7): page mode now
          // matches the Alert detail hero EXACTLY — a soft gray
          // (bg-background-subtle) masthead whose content centers on the
          // same 760px document measure as the body/footer. The tonal step
          // from the gray header to the white cards on the gray-wash body
          // carries the separation; the layout is single-column now so the
          // wider 1100px measure is gone.
          isPageMode && 'bg-background-subtle [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[760px]',
        )}
      >
        {/* Panel mode owns its own close button — there's no Sheet
            wrapper providing one. Sheet mode skips this since Radix's
            SheetContent already renders an X in the top-right corner.

            2026-06-08 (Pencil HuYeb /deadlines detail): the corner cluster
            collapses to the close X only. The deep-link copy moved fully to
            the sticky footer ("Copy link to this deadline") — the design
            稿 puts the Assign / Snooze / Mark-as-filed actions in this
            corner instead (rendered on the status row below). */}
        {mode === 'panel' ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t`Close deadline detail`}
            onClick={onClose}
            className="absolute right-3 top-3 text-text-tertiary hover:text-text-primary"
          >
            <XIcon className="size-4" aria-hidden />
          </Button>
        ) : null}
        {/* 2026-06-10 (Yuqi alert↔deadline parity, hero rework 2f0d4b27): the
            "Last activity just now" stamp is gone from the hero — it isn't in
            the Alert detail's hero (whose eyebrow is just the meta strip), and
            the activity story already lives in the Status tab's Recent
            activity card + the Audit tab. The action cluster (Assign · Snooze
            · Mark filed) lives in the shared sticky footer below. */}
        {/* 2026-06-08 (Yuqi /deadlines ↔ /alerts parity #1): the status
            dot + label that used to lead this row is gone — the new top
            status banner carries the status, mirroring the alerts detail.
            The row keeps only the tax year · period meta. The Assign /
            Snooze / Mark-as-filed cluster moved to the sticky footer
            (parity #4) so primary actions are right-aligned at the bottom
            like the alerts footer.
            2026-06-08 (Yuqi "still very different to the alerts detail"): the
            monospaced `obligation_id` is dropped — the alerts detail exposes no
            internal id, and a raw db id in mono was both noise and a mono-
            restraint violation. */}
        {row && row.taxYear && !heroCollapsed ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-10 text-sm text-text-tertiary">
            <span>
              <Trans>Tax year {row.taxYear}</Trans>
              <span aria-hidden> · </span>
              {row.taxYearType === 'fiscal' ? (
                <Trans>Fiscal period</Trans>
              ) : (
                <Trans>Calendar period</Trans>
              )}
            </span>
          </div>
        ) : null}
        {/* 2026-06-08 (Pencil HuYeb /deadlines detail): the form title sits
            on its own line; the standalone client kicker link was folded
            into the household chip in the row below per the design稿. */}
        {row ? (
          <h2
            className={cn(
              'pr-8 font-semibold tracking-[-0.4px] text-text-primary transition-all duration-200',
              heroCollapsed
                ? 'line-clamp-1 text-[16px] leading-[1.3]'
                : 'text-[22px] leading-[1.25]',
            )}
          >
            {(() => {
              const meta = describeTaxCode(row.taxType)
              return meta.description ? `${meta.label} — ${meta.description}` : meta.label
            })()}
          </h2>
        ) : null}
        {/* 2026-06-08 (Pencil HuYeb /deadlines detail): single chip row
            under the title — a clickable client-household chip (navigates
            to the client), the canonical status badge (subsumes the old
            waiting/blocked flag chips), the input-requested flag, and the
            jurisdiction / tax-year / period meta. */}
        {row && !heroCollapsed ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pr-8 text-sm">
            {row.clientId && row.clientName ? (
              <button
                type="button"
                aria-label={t`Open ${row.clientName}`}
                title={t`Open ${row.clientName}`}
                onClick={() =>
                  void navigate(clientDetailPath({ id: row.clientId, name: row.clientName }))
                }
                className="group/clientlink inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-2.5 py-1 text-caption font-medium text-text-secondary outline-none transition-colors hover:border-state-accent-border hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
              >
                <UsersIcon
                  className="size-3.5 shrink-0 text-text-tertiary transition-colors group-hover/clientlink:text-text-accent"
                  aria-hidden
                />
                {row.clientName}
              </button>
            ) : row.clientId ? (
              <span
                className="inline-flex items-center gap-1 text-caption text-text-warning"
                title={t`Client record missing — deadline may be orphaned`}
              >
                <AlertTriangleIcon className="size-3.5" aria-hidden />
                <Trans>Client record missing</Trans>
              </span>
            ) : null}
            {/* 2026-06-10 (Yuqi alert↔deadline parity #3 + critique
                "de-dupe status"): the header status chip is dropped in page
                mode — the full-bleed status banner above the header now
                states status ONCE, in the same place the alert does. Panel /
                sheet modes (no co-located banner pairing) keep the chip. */}
            {!isPageMode ? (
              <ObligationStatusReadBadge
                status={row.status}
                className="h-6 text-caption-xs uppercase tracking-wide"
              />
            ) : null}
            {latestInputRequest ? (
              <Badge
                variant="secondary"
                className="h-6 gap-1 text-caption-xs uppercase tracking-wide"
                title={latestInputRequestTitle}
              >
                <MessageSquareText className="size-3.5" aria-hidden />
                <Trans>Input requested</Trans>
              </Badge>
            ) : null}
            {/* 2026-06-10 (Yuqi #5 tidy + #6 displaced): the trailing meta span
                duplicated the "Tax year · period" line above AND its
                items-baseline alignment left the text vertically offset from
                the h-6 chips. Reduced to just the shared JurisdictionLabel seal
                (the one fact not shown elsewhere), aligned with the chip row. */}
            {row.jurisdiction ? <JurisdictionLabel code={row.jurisdiction} /> : null}
          </div>
        ) : null}
        {/* 2026-05-23: dropped the canonical-forward-action row
            (`ObligationDrawerStatusActions`) per critique. The
            interactive `ObligationQueueStatusControl` chip above
            already exposes every valid transition with one click;
            adding a second forward-action button below it created
            redundant affordances ("Start preparation" + "pending →
            review" picker dropdown both go to the same place).
            Status pill is the single source of truth now. */}
      </header>
      {/* Body — in panel mode the aside has fixed height, so this
          inner div owns the scrolling. That lets the snapshot block
          (milestones + dates) pin via `sticky top-0` to stay visible
          while the Readiness checklist / Evidence rows scroll
          underneath. Sheet mode (mobile) keeps a single document
          scroll: SheetContent has overflow-y-auto, so we don't
          double-scroll here. */}
      {/* 2026-05-26 (Yuqi /deadlines drawer): body top padding dropped
          from pt-4 to 0. The sticky strip below used a `-mt-4` to
          cancel the body padding — chrome cancelling chrome made
          the layout hard to reason about. With pt-0, the strip
          starts flush at the body top, and the area below the strip
          gets its own real `pt-4` so it's visually a separate
          unit (containing TabsList + tab content). */}
      {/* 2026-05-26 (Yuqi drawer canonical): body padding `px-5 pb-5`
          → `px-12 py-10` per the drawer canonical. Same paper-document
          padding as AlertDetailDrawer body — left margin runs as one
          line from header through body. */}
      {/* 2026-05-26 (Yuqi forty-seventh pass — sticky-footer buffer):
          body bottom padding bumped `py-10` → `pt-10 pb-24` to match
          AlertDetailDrawer. Sticky footer (min-h-16 + py-4) was
          covering the last content row when scrolled — 96px buffer
          guarantees clean separation between bottom content and
          action bar. */}
      {/* 2026-05-26 (Yuqi forty-eighth pass — body flex wrapper):
          body wrapper is now `flex flex-col gap-4` per drawer
          canonical. Children get a consistent 16px gap between
          them instead of each carrying its own `mb-*` margin.
          Same shape as AlertDetailDrawer body so the two drawers
          read with identical rhythm. */}
      <div
        className={cn(
          // 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
          // body padding aligned to AlertDetailDrawer.tsx L752
          // (`px-12 pt-10 pb-24`). Same left margin as header/footer
          // so the panel reads as one continuous paper-document
          // surface edge-to-edge. The earlier inset-followups
          // tightening (px-8 pt-0) was reverted for cross-drawer
          // consistency; the body's pt-10 buffer mirrors the alert drawer's
          // header → body breathing room.
          // 2026-05-27 (Yuqi "remove padding-top"): pt-10 dropped.
          // 2026-06-08 (Yuqi /deadlines ↔ /alerts parity #3): body gap-4 →
          // gap-6 and pb-12 → pb-24 to match the alerts body rhythm
          // (`px-12 pb-24`) and clear the sticky footer.
          'flex flex-col gap-6 px-12 pb-24',
          // 2026-05-26 (Yuqi feedback #1): added scrollbar-gutter:stable
          // on the panel-mode body. Different tabs render different
          // content heights (Summary is short, Materials is long).
          // Without gutter:stable, the scrollbar appears/disappears
          // on tab switch and shifts the content ~15px horizontally —
          // reads as "panel width flickers." Reserving the scrollbar
          // space holds the content steady regardless of which tab
          // is active.
          panelLayout && 'flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]',
          // 2026-06-10 (Yuqi alert↔deadline parity #6/#7): the page body is a
          // gray-wash (bg-background-subtle) scroll surface hosting white
          // cards, centered on the same 760px document measure as the alert
          // body — single-column now, so the prior 1100px two-column measure
          // 2026-06-10 (Yuqi page-polish #3/#17 "移除top padding"): the body's
          // top padding is dropped so the tab bar sits tight under the date
          // strip above. The sticky tab bar's own pt-3/pb-3 carries the
          // breathing room now.
          isPageMode && 'bg-background-subtle [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[760px]',
        )}
        onScroll={
          isPageMode
            ? (event) => {
                const next = event.currentTarget.scrollTop > 16
                setPageHeaderCollapsed((prev) => (prev === next ? prev : next))
              }
            : undefined
        }
      >
        {detailQuery.isLoading ? (
          <EmptyPanel className="py-8 text-center">
            <Trans>Loading deadline detail…</Trans>
          </EmptyPanel>
        ) : detailQuery.isError || !detail || !row ? (
          // Step 1-5 reaudit Alert primitive + Step 6 UX #147
          // Button-link retry.
          <Alert variant="destructive">
            <AlertDescription>
              <Trans>Couldn't load deadline detail.</Trans>{' '}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 align-baseline"
                onClick={() => void detailQuery.refetch()}
              >
                <Trans>Retry</Trans>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (isObligationQueueDetailTab(value)) onTabChange(value)
            }}
          >
            {/* 2026-05-25 (Yuqi Deadlines #30): the sticky block used
                to host the full snapshot trio (PrimaryDeadlineStrip +
                PathToFilingSummary + ActiveStageDetailCard). Yuqi's
                #30 asked for a Summary tab that owns the milestone
                story. Split the sticky block into two:
                  • Sticky: PrimaryDeadlineStrip only — three anchor
                    dates that CPAs check at every interaction. Always
                    visible across every tab.
                  • Summary tab (below): PathToFilingSummary +
                    ActiveStageDetailCard — the deep-dive milestone
                    + stage-context view. Has a labeled home now.

                Net effect: the always-visible chrome is tighter
                (just the dates), the milestone story has its own tab
                that doesn't compete with Materials / Extension /
                Evidence, and the URL ?tab=summary is shareable. */}
            {/* 2026-05-26 (Yuqi obligation drawer): tightened the
                sticky block's vertical padding so the band of
                bg-background-subtle above the deadline cards isn't
                a visible "gap" between the header and the strip.
                Was pt-4 pb-3 (28px combined). Now pt-2 pb-2 (16px)
                — strip still has breathing room from header edge
                and from scrolling content below, just half the
                visual weight. The negative -mt-4 still negates the
                body container's pt-4, so the sticky block starts
                flush at the body's top edge. */}
            {/* 2026-05-26 (Yuqi /deadlines drawer): sticky strip now
                starts flush at the body's top edge (body lost its
                pt-4). Dropped the `-mt-4` negative margin that was
                cancelling that padding. The bottom of the strip
                gets a `border-b border-divider-subtle` so the
                tabs/content area below reads as a distinct unit. */}
            {/* 2026-05-26 (Yuqi inset-followups A): sticky-section
                heading dropped its `border-b border-divider-subtle
                bg-background-subtle`. The gray bg + bottom border were
                framing the deadline strip as a separate "card" inside
                the drawer body — fighting the flat surface treatment.
                Now: just the sticky position + tight padding, no
                visual weight beyond the content itself. Also bled
                changed `-mx-12 px-12` → `-mx-8 px-8` to match the new
                tightened body padding. */}
            {/* 2026-05-26 follow-up: keep the flat treatment, but make
                the sticky strip opaque. In the Materials tab, checklist
                rows scroll under this band; a transparent sticky layer
                lets document text show through the date tiles/gutters.
                White surface + subtle bottom rule preserves the drawer
                body feel while giving the sticky layer a real backing. */}
            <div
              className={cn(
                'flex flex-col gap-3',
                // 2026-06-09 (Yuqi "header too tall, reading space limited"):
                // on the standalone page the date strip is NOT sticky — it
                // scrolls away with the content so the reading area grows; the
                // collapsed hero keeps the title + dates' headline context.
                isPageMode
                  ? 'mb-2'
                  : panelLayout
                    ? // 2026-05-27 (Yuqi drawer parity): negative bleed
                      // updated -mx-8 → -mx-12 to match the body's new
                      // px-12 padding. Inside px-12 re-applies the
                      // canonical inset, so the sticky strip's content
                      // edge still aligns with the rest of the body.
                      'sticky top-0 z-20 -mx-12 bg-background-canvas-warm px-12 py-3'
                    : 'mb-4',
              )}
            >
              {/* PrimaryDeadlineStrip (2026-05-23): the three dates the
                  CPA actually checks first — Internal, Filing, Payment
                  — promoted out of the bottom dates panel into a
                  3-column strip at the top of the snapshot. Each
                  column carries a one-word label + the date + a small
                  state tag ("MISSED" if past, blank otherwise).
                  Reading order: identity (header) → key dates (this
                  strip) → tabs → tab content (Summary's milestone
                  chevron + stage card lives one tab over).
                  The remaining secondary dates (Statutory, Tax period,
                  Created, Last touched, e-file timestamps) still live
                  in the bottom FlatDateList under "Reference dates". */}
              <PrimaryDeadlineStrip row={row} variant={isPageMode ? 'cards' : 'flat'} />
              {/* 2026-05-23: StatutoryDatesPanel moved OUT of this
                  sticky snapshot block — relocated to AFTER the
                  TabsContent so the tabs sit immediately under the
                  stage card. The dates panel is reference info (most
                  rows show the same date 4× anyway: Internal due =
                  Statutory = Filing = Payment), so paying for it with
                  prime vertical real estate above the tabs was the
                  wrong trade. New reading order: identity → milestone
                  → stage card → TABS → tab content → dates (scroll for
                  reference). */}
              {/* `ObligationForwardingPanel` removed 2026-05-21 — the
                  "Forward to task · bright-studio-…@duedatehq.com · Phase 2"
                  block was a feature stub crowding the drawer with chrome
                  for capability that isn't shipping yet. Restore when the
                  inbound-file routing actually goes live. */}
            </div>
            {/* TabsList lives OUTSIDE the sticky snapshot block per
                critique #4 ("shouldn't the tab belong to the
                following information, not the top part information").
                Pulled out so the tabs visually group with the
                TabsContent they control, not with the milestones /
                dates above. Tradeoff: tabs scroll away with the body
                rather than staying pinned. In practice the CPA
                rarely switches tabs mid-scroll on the same
                obligation, so the visual clarity wins.

                2026-05-23: dropped the `border-t` separator above. The
                pill segmented control is visually self-contained
                (rounded bg track + raised active item) — adding a top
                rule above it made the tabs feel like the bottom of
                the snapshot block above instead of the top of the tab
                content below. */}
            {/* 2026-05-25 (Yuqi Deadlines #9, #12, #16): wrapper
                top padding was dropped after Yuqi flagged extra empty
                space. 2026-05-25 (client detail side panel): add a
                panel-only gap back under the sticky date strip so the
                selected tab/focus ring does not visually tuck under
                the date cards while the tab group still belongs to
                the content below. */}
            {/* 2026-05-26 (Yuqi /deadlines drawer): pt-3 → pt-4 so
                TabsList + content area sit at a clean 16px gap
                below the sticky strip's bottom border, reading as
                a separate visual unit. */}
            {/* 2026-05-26 (Yuqi fifty-fifth pass — drop double gap):
                body wrapper now has `flex-col gap-4` (added in the
                drawer canonical apply), which already provides 16px
                between the sticky strip and this tabs container.
                The extra `pt-4` here was stacking → 32px total
                between strip and tabs ("weird top margin" per
                Yuqi). Dropped. */}
            {/* 2026-05-26 (Yuqi feedback — "the 4 tabs in the deadline
                detail panel can be more obvious, … more obvious about
                it is with the below information, not above"): inverted
                the spacing rhythm so the tab bar visually belongs to
                what's BELOW it.

                Before: tabs sat ~8px below the sticky strip and ~24px
                above the content (gap-2 from Tabs root + mt-4 on
                TabsContent). That asymmetry made the bar read as the
                bottom edge of the header block above.

                After: `pt-3` on this wrapper (+ the Tabs root's
                `gap-2`) opens a 20px buffer ABOVE the bar — enough
                to separate it from the sticky strip without the
                cavernous 32px the earlier `pt-6` produced (Yuqi
                follow-up: "still strange padding and gap"). `mt-0`
                on the TabsContent panels drops the gap below the
                bar to just `gap-2`, so the bar still reads as the
                leading edge of the tab content beneath. */}
            {/* 2026-06-10 (Yuqi /deadlines detail "remove background"): the
                sticky tab bar drops its `bg-background-canvas-warm` fill so it
                reads as part of the page, not a banded strip. The TabsList's own
                bottom hairline still anchors the bar; the page wash behind it is
                the same warm canvas, so there's no visible seam. */}
            <div
              className={cn(
                'sticky top-0 z-10 pt-3',
                // Page-mode tab bar needs an opaque fill — the stepper/content
                // scrolls behind it when pinned, so a transparent bar bleeds
                // (Yuqi: "the tabs don't have a background?").
                isPageMode ? 'bg-background-subtle pb-3' : '',
              )}
            >
              {/* 2026-05-26 (Yuqi forty-ninth pass — Figma-Make port
                  from design/deadlines-drawer-rework): tab bar
                  switched from default pill segmented control to the
                  line-variant underline bar. Each trigger leads with
                  a lucide icon + label + context badge:
                    • Summary: no badge
                    • Materials: outstanding count (red destructive)
                      or all-received check (gray) when count == 0
                    • Extension: accent check when row has a saved
                      extension decision
                    • Evidence: workpaper count (gray placeholder)
                  TabsTrigger primitive already wires aria-selected +
                  focus-visible ring per shadcn defaults; we stretch
                  to `flex-1` so the four tabs distribute full-width
                  across the drawer. */}
              {(() => {
                const outstandingMaterials = checklist.filter(
                  (i) => i.status !== 'received' && i.status !== 'waived',
                ).length
                const allMaterialsReceived = checklist.length > 0 && outstandingMaterials === 0
                const extensionSaved = Boolean(row?.extensionDecidedAt)
                const evidenceCount = detail?.evidence.length ?? 0
                return (
                  <TabsList
                    variant="line"
                    // 2026-05-26 (Yuqi feedback #2): white bg on the
                    // TabsList. The line-variant defaulted to transparent
                    // which let the body's white still show through, but
                    // when the sticky deadline strip above scrolls behind
                    // the tabs they bled together visually. Explicit
                    // white bg gives the tab bar a clear surface.
                    //
                    // 2026-05-26 (Yuqi feedback — "justify content left"
                    // + "remove the left right padding"): bar is now
                    // `justify-start` so the four tabs hug the left
                    // edge instead of distributing across the panel
                    // (each TabsTrigger drops `flex-1` for the same
                    // reason — see the trigger className below). Inter-
                    // tab `gap-1` → `gap-6` opens 24px between tabs so
                    // they remain individually scannable now that each
                    // one no longer carries its own `px-2`.
                    // 2026-06-10 (Yuqi page-polish #6 "gap小"): the inter-tab
                    // gap tightens from 24px to 16px in page mode so the four
                    // tabs read as a closer-knit group. Panel/sheet keep gap-6.
                    className={cn(
                      'flex h-11 w-full justify-start border-b border-divider-subtle text-sm',
                      isPageMode ? 'gap-4' : 'gap-6',
                    )}
                  >
                    {/* 2026-05-26 (Yuqi feedback — "tabs can be more
                        obvious, signalling people hey check these
                        out" + "yes please" to pushing the active
                        state further): every TabsTrigger now layers
                        FOUR signals so the active tab pops without
                        the bar abandoning the tab paradigm in favor
                        of a segmented-control look:
                          1. Inactive text: `text-text-secondary` —
                             still visible enough to invite a click.
                          2. Active text: `text-text-primary` +
                             `font-semibold` — strongest contrast
                             jump from inactive (medium-weight
                             secondary) to active (semibold primary).
                          3. Active underline color: `accent-default`
                             (matches the /clients/[id] tabs +
                             /deadlines scope tabs), so the rule
                             pops in the canonical brand accent
                             instead of plain text-active black.
                          4. Active underline position: primitive
                             default (`bottom-[-5px]`) — floats ~5px
                             below the trigger for 15-16px breathing
                             room from the text descender (an earlier
                             `bottom-0` pulled it too close — "the
                             underline is so close to the text").
                        Stayed with TABS (not segmented control)
                        because the 4 panels are different sections
                        of the SAME deadline (Summary / Materials /
                        Extension / Evidence), not filters or scopes.
                        Segmented control belongs to the /deadlines
                        top-level scope tabs where each option
                        re-filters the queue. */}
                    {visibleTabs.has('summary') ? (
                      // 2026-05-26 (Yuqi seventieth pass #5): dropped
                      // the leading Info icon. The "Summary" word is
                      // self-explanatory; an info-glyph next to it
                      // implied "click here for info ABOUT the
                      // summary" rather than "this is the summary
                      // tab." Other tabs (Materials, Extension,
                      // Evidence) keep their icons because they
                      // distinguish by purpose (paperclip /
                      // calendar / file).
                      <TabsTrigger
                        value="summary"
                        className="!flex-none !px-0 rounded-t text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1 data-active:text-text-primary data-active:font-semibold after:!bg-accent-default"
                      >
                        {/* rzzww: the milestone/workflow home is labelled
                            "Status" on the standalone page. */}
                        {isPageMode ? <Trans>Status</Trans> : <Trans>Summary</Trans>}
                      </TabsTrigger>
                    ) : null}
                    {visibleTabs.has('readiness') ? (
                      <TabsTrigger
                        value="readiness"
                        className="!flex-none !px-0 rounded-t text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1 data-active:text-text-primary data-active:font-semibold after:!bg-accent-default"
                      >
                        <PaperclipIcon className="size-3.5" aria-hidden />
                        <Trans>Materials</Trans>
                        {outstandingMaterials > 0 ? (
                          <span
                            aria-label={t`${outstandingMaterials} outstanding`}
                            // 2026-05-26 (Yuqi feedback #3): badge subtler.
                            // Was solid destructive red with white text —
                            // that loudness made every Materials tab with
                            // outstanding items shout "danger." Now: light
                            // accent tint (state-accent-hover-alt) with
                            // accent-tinted text. Communicates "13 items
                            // here" without alarm chrome.
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-state-accent-hover-alt px-1 text-caption-xs font-medium leading-none tabular-nums text-text-accent"
                          >
                            {outstandingMaterials}
                          </span>
                        ) : allMaterialsReceived ? (
                          <span
                            aria-label={t`All received`}
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-state-success-hover px-1 text-caption-xs text-state-success-solid"
                          >
                            <CheckIcon className="size-3" aria-hidden />
                          </span>
                        ) : null}
                      </TabsTrigger>
                    ) : null}
                    {visibleTabs.has('extension') ? (
                      <TabsTrigger
                        value="extension"
                        className="!flex-none !px-0 rounded-t text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1 data-active:text-text-primary data-active:font-semibold after:!bg-accent-default"
                      >
                        <CalendarClockIcon className="size-3.5" aria-hidden />
                        <Trans>Extension</Trans>
                        {extensionSaved ? (
                          <span
                            aria-label={t`Extension saved`}
                            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-default px-1 text-caption-xs leading-none text-text-inverted"
                          >
                            <CheckIcon className="size-3" aria-hidden />
                          </span>
                        ) : null}
                      </TabsTrigger>
                    ) : null}
                    {/* Risk tab removed 2026-05-21 — risk inputs live on the
                        client detail page (ClientRiskInputsPanel) rather than
                        per-obligation. Surface kept on the schema for
                        back-compat with deep-links; the trigger and content
                        are unmounted. */}
                    {visibleTabs.has('evidence') ? (
                      <TabsTrigger
                        value="evidence"
                        className="!flex-none !px-0 rounded-t text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1 data-active:text-text-primary data-active:font-semibold after:!bg-accent-default"
                      >
                        <FileTextIcon className="size-3.5" aria-hidden />
                        {/* rzzww: the evidence/workpaper surface is labelled
                            "Record" on the standalone page. */}
                        {isPageMode ? <Trans>Record</Trans> : <Trans>Evidence</Trans>}
                        <span
                          aria-label={t`${evidenceCount} workpapers`}
                          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-background-section px-1 text-caption-xs tabular-nums text-text-tertiary"
                        >
                          {evidenceCount}
                        </span>
                      </TabsTrigger>
                    ) : null}
                    {/* 2026-06-09 (Yuqi /deadlines detail rebuild — Pencil
                        rzzww): the Audit tab gets its own trigger on the
                        standalone page (it was a dead deep-link before). The
                        content wires the milestone-grouped ObligationTimeline
                        fed by the real audit feed. */}
                    {visibleTabs.has('audit') ? (
                      <TabsTrigger
                        value="audit"
                        className="!flex-none !px-0 rounded-t text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:ring-offset-1 data-active:text-text-primary data-active:font-semibold after:!bg-accent-default"
                      >
                        <HistoryIcon className="size-3.5" aria-hidden />
                        <Trans>Audit</Trans>
                      </TabsTrigger>
                    ) : null}
                  </TabsList>
                )
              })()}
            </div>
            <TabsContent value="summary" key="summary-content">
              <motion.div
                // 2026-06-10 (Yuqi page-polish #7 "remove top padding"): the
                // per-tab content drops its 24px top padding in page mode so it
                // sits tight under the tab bar. Panel/sheet keep pt-6.
                className={cn(isPageMode ? '' : 'pt-6')}
                initial={{ x: 12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* Summary tab — milestone chevron + active-stage zoom.
                  These were previously pinned in the sticky snapshot
                  block (always-visible across every tab). Yuqi #30
                  moved them into a dedicated tab so:
                    - The drawer chrome is tighter (just the deadline
                      strip stays sticky).
                    - The milestone story has a labeled home that
                      shares URL state with the rest of the surface
                      (?tab=summary is shareable).
                    - Materials / Extension / Evidence don't get the
                      stage card pushing them below the fold. */}
                {/* 2026-06-10 (Yuqi restore rework 69879cb8 — Pencil Qn4nX
                    `hMaQD`): the Status tab is a SINGLE column of stacked
                    cards — WorkflowMilestoneCard (stepper + active stage +
                    blocking + what's-left) → Extension → Recent activity →
                    Penalty exposure — then a full-width 2-up Ownership /
                    Linked-from footer row. The earlier two-column rail is
                    gone. This matches the alert detail's single flat card
                    stack. */}
                <div className="flex flex-col gap-4">
                  <div className={cn('grid min-w-0 flex-1', isPageMode ? 'gap-4' : 'gap-3')}>
                    {/* 2026-06-10 (Yuqi restore rework 69879cb8 — Pencil Qn4nX
                        `CorQi` WorkflowMilestoneCard): the stepper, active
                        stage, blocking, and "What's left" all live in ONE
                        white card on the gray-wash body — the deadline analogue
                        of the alert's "The change" group card. Panel/sheet keep
                        them as flat siblings via `contents`. */}
                    <div
                      className={
                        isPageMode
                          ? 'flex flex-col gap-4 rounded-xl border border-divider-subtle bg-background-default px-5 py-4'
                          : 'contents'
                      }
                    >
                      <PathToFilingSummary row={row} auditEvents={detail.auditEvents} />
                      {/* 2026-06-10 (Yuqi "the style is different"): the
                          "What's left to do" checklist moved OUT of this white
                          workflow box into its own gray-header DetailSectionCard
                          (below, Pencil `bmwHb`) so it matches the rest of the
                          panel's card system instead of a bare uppercase eyebrow. */}
                      {/* 2026-06-09 (Yuqi /deadlines detail rebuild — Pencil
                      rzzww + no-fiction rule): the "Expected refund" card
                      ($4,210 + withholding breakdown) and the "Source docs"
                      card's fake "+ Add file" affordance were removed. Both
                      were hardcoded placeholders with no backing contract
                      field — banned by the no-fiction-on-canvas rule. The
                      rzzww Status tab carries the real Penalty exposure card
                      instead (driven by row.penaltyBreakdown), added
                      separately. Real source-document attachments return
                      when the ingest pipeline + contract fields land. */}
                      <AuthorityResponsePanel
                        row={row}
                        auditEvents={detail.auditEvents}
                        accepting={markAcceptedMutation.isPending}
                        rejecting={markFiledRejectedMutation.isPending}
                        onConfirmAccepted={() =>
                          markAcceptedMutation.mutate({ id: row.id, status: 'completed' })
                        }
                        onRecordRejection={openAuthorityRejectionDialog}
                        onChangeTab={(nextTab) => onTabChange(nextTab)}
                      />
                      <ActiveStageDetailCard
                        row={row}
                        auditEvents={detail.auditEvents}
                        readinessChecklist={detail.readinessChecklist}
                        onChangeTab={(nextTab) => onTabChange(nextTab)}
                        onChangeStatus={(nextStatus) =>
                          changeStatus(row.id, nextStatus, row.status)
                        }
                        onConfirmAcceptance={() =>
                          markAcceptedMutation.mutate({ id: row.id, status: 'completed' })
                        }
                        onRecordRejection={openAuthorityRejectionDialog}
                        onChangePrepStage={(nextPrepStage) => {
                          // Capture the previous value so the success toast can
                          // offer an Undo that fires the reverse mutation. No-op
                          // clicks (same value) still let the request through —
                          // the server short-circuits and emits a zero-uuid
                          // auditId, but the toast logic uses the captured
                          // previous to decide whether to show Undo.
                          prepStagePreviousRef.current = row.prepStage
                          updatePrepStageMutation.mutate({ id: row.id, prepStage: nextPrepStage })
                        }}
                        onChangeReviewStage={(nextReviewStage) => {
                          reviewStagePreviousRef.current = row.reviewStage
                          updateReviewStageMutation.mutate({
                            id: row.id,
                            reviewStage: nextReviewStage,
                          })
                        }}
                        onMarkSigned={() => {
                          // Advance the e-file pipeline; success toast offers an
                          // Undo that reverts to authorization_requested (the
                          // only state mark-signed fires from). Same per-call
                          // onSuccess + Undo split as `changeStatus`.
                          updateEfileStateMutation.mutate(
                            { id: row.id, efileState: 'authorization_signed' },
                            {
                              onSuccess: (result) => {
                                toast.success(t`Marked 8879 signed`, {
                                  description: t`Audit ${result.auditId.slice(0, 8)}`,
                                  action: {
                                    label: t`Undo`,
                                    onClick: () =>
                                      updateEfileStateMutation.mutate({
                                        id: row.id,
                                        efileState: 'authorization_requested',
                                      }),
                                  },
                                })
                              },
                            },
                          )
                        }}
                        onRemindSignature={() => setRemindDialogOpen(true)}
                        onSubmitEfile={() => {
                          // Signed → e-filed. Undo reverts to
                          // authorization_signed (where submit fires from).
                          updateEfileStateMutation.mutate(
                            { id: row.id, efileState: 'submitted' },
                            {
                              onSuccess: (result) => {
                                toast.success(t`Marked e-filed`, {
                                  description: t`Audit ${result.auditId.slice(0, 8)}`,
                                  action: {
                                    label: t`Undo`,
                                    onClick: () =>
                                      updateEfileStateMutation.mutate({
                                        id: row.id,
                                        efileState: 'authorization_signed',
                                      }),
                                  },
                                })
                              },
                            },
                          )
                        }}
                      />
                      {/* 2026-06-10 (Yuqi restore rework 61edf90a — Qn4nX CorQi
                          `WdFB4` NextMovePanel): "What's left to do" lives
                          INSIDE the WorkflowMilestoneCard as a divider-separated
                          section (top hairline), not a nested card — matching
                          the canonical and the alert's flat in-card sections.
                          Small uppercase eyebrow, no card chrome. */}
                      {checklist.length > 0 &&
                      row.status !== 'done' &&
                      row.status !== 'completed' ? (
                        <div className="flex flex-col gap-2.5 border-t border-divider-subtle pt-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-caption-xs font-bold tracking-eyebrow-tight text-text-tertiary uppercase">
                              <Trans>What's left to do</Trans>
                            </span>
                            <span className="text-caption-xs text-text-tertiary">
                              {t`${checklist.filter((item) => item.status === 'received').length} of ${checklist.length} complete`}
                            </span>
                          </div>
                          <ul className="grid gap-2.5">
                            {checklist.slice(0, 6).map((item) => {
                              const isDone = item.status === 'received'
                              return (
                                <li key={item.id} className="flex items-start gap-3">
                                  <span
                                    className={cn(
                                      // 2026-06-10 (Yuqi page-polish #15
                                      // "checkbox太大"): the checklist box
                                      // shrinks 18px → 16px (size-4) so it reads
                                      // as a checkmark glyph, not a tile.
                                      'mt-px flex size-4 shrink-0 items-center justify-center rounded-sm border',
                                      isDone
                                        ? 'border-state-accent-solid bg-state-accent-solid text-text-inverted'
                                        : 'border-divider-regular bg-background-default',
                                    )}
                                    aria-hidden
                                  >
                                    {isDone ? <CheckIcon className="size-3" /> : null}
                                  </span>
                                  <span className="grid min-w-0 gap-0.5">
                                    <span
                                      className={cn(
                                        'text-sm leading-tight',
                                        isDone
                                          ? // 2026-06-10 (Yuqi page-polish #14
                                            // "划掉太浅了"): the completed-item
                                            // strikethrough was decoration-
                                            // text-tertiary/40 — almost
                                            // invisible. Darkened to a solid
                                            // text-secondary line so "done"
                                            // reads clearly.
                                            'text-text-secondary line-through decoration-text-secondary'
                                          : 'text-text-primary',
                                      )}
                                    >
                                      {item.label}
                                    </span>
                                    {isDone && item.receivedAt ? (
                                      <span className="text-caption-xs text-text-tertiary">
                                        <Trans>
                                          received {formatDate(item.receivedAt.slice(0, 10))}
                                        </Trans>
                                      </span>
                                    ) : null}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                          <TextLink
                            variant="accent"
                            className="w-fit"
                            onClick={() => onTabChange('readiness')}
                          >
                            <Trans>Manage in Materials →</Trans>
                          </TextLink>
                        </div>
                      ) : null}
                    </div>
                    {/* Recent activity — last few audit-feed entries, with a
                        link out to the full Timeline tab. */}
                    {/* 2026-06-10 (Yuqi — replicate Pencil `qSa9z` Recent
                        activity): the shared <DetailSectionCard> chrome (gray
                        header band + "View all → Record" link) over flush rows
                        with top hairlines + mono timestamps. */}
                    {detail.auditEvents.length > 0 ? (
                      <DetailSectionCard
                        title={<Trans>Recent activity</Trans>}
                        headerRight={
                          <button
                            type="button"
                            onClick={() => onTabChange('audit')}
                            className="font-medium text-text-accent underline-offset-2 outline-none hover:underline"
                          >
                            <Trans>View all in Timeline →</Trans>
                          </button>
                        }
                        flush
                      >
                        <ul className="flex flex-col">
                          {detail.auditEvents.slice(0, 3).map((event, index) => {
                            const actor = event.actorLabel ?? t`System`
                            return (
                              <li
                                key={event.id}
                                className={cn(
                                  // 2026-06-10 (Yuqi page-polish #16 "更扁"):
                                  // the Recent-activity rows flatten from py-3.5
                                  // to py-2.5 so the list reads shorter/denser.
                                  'flex items-center gap-3 px-5 py-2.5',
                                  index > 0 && 'border-t border-divider-subtle',
                                )}
                              >
                                <AssigneeAvatar name={actor} title={actor} size="sm" />
                                <span className="min-w-0 flex-1 text-sm leading-tight text-text-secondary">
                                  <span className="font-medium text-text-primary">{actor}</span>
                                  <span aria-hidden> · </span>
                                  {formatAuditActionLabel(event.action, auditActionLabels)}
                                </span>
                                <span className="shrink-0 font-mono text-caption-xs tabular-nums text-text-tertiary">
                                  {formatRelativeTime(event.createdAt)}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      </DetailSectionCard>
                    ) : null}
                    {/* 2026-06-09 (Yuqi /deadlines detail rebuild — Pencil
                        rzzww): Penalty exposure card, driven entirely by the
                        real penalty-engine output on the row. Self-hides when
                        no exposure applies. Page-only so the /clients drawer
                        summary is unchanged. */}
                    {isPageMode ? <PenaltyExposureCard row={row} /> : null}
                    {/* 2026-06-10 (Yuqi restore rework 2adfcf5e — fold Extension
                        into Status): the decideExtension flow (Form 7004/4868)
                        is unreachable in page mode (no Extension tab in the
                        locked 4-tab bar), so the apply-extension action folds
                        here as a Status-tab DetailSectionCard. Reuses the same
                        extensionDraft + saveExtensionDecision as the legacy
                        Extension tab — no fiction (real rule fields only).
                        Shows when a rule allows an extension or one is already
                        on file. */}
                    {isPageMode &&
                    (extensionPolicy?.available || Boolean(row.extensionDecidedAt)) ? (
                      <DetailSectionCard
                        title={<Trans>Extension</Trans>}
                        headerRight={
                          row.extensionDecidedAt ? (
                            <span className="text-caption-xs text-text-tertiary">
                              <Trans>Filed {formatDate(row.extensionDecidedAt.slice(0, 10))}</Trans>
                            </span>
                          ) : detail.matchedRule ? (
                            <TextLink
                              variant="accent"
                              className="font-semibold"
                              render={
                                <Link to={`/rules/${encodeURIComponent(detail.matchedRule.id)}`} />
                              }
                            >
                              <Trans>Open rule →</Trans>
                            </TextLink>
                          ) : null
                        }
                      >
                        <div className="flex flex-col gap-3">
                          <p className="text-caption text-text-tertiary">
                            {(() => {
                              const formName =
                                extensionPolicy?.formName ?? row.extensionFormName ?? null
                              return formName
                                ? t`${formName} — automatic extension of time to file. Defers filing, not payment.`
                                : t`Extension of time to file. Defers filing, not payment.`
                            })()}
                          </p>
                          {extensionNeedsManualDeadline ? (
                            <label className="flex flex-col gap-1">
                              <span className="text-caption-xs tracking-eyebrow-tight text-text-tertiary uppercase">
                                <Trans>Extended filing deadline</Trans>
                              </span>
                              <IsoDatePicker
                                value={extensionDraft.extendedFilingDate}
                                invalid={extensionManualDeadlineInvalid}
                                ariaLabel={t`Extended filing deadline`}
                                placeholder={t`Extended filing deadline`}
                                onValueChange={(extendedFilingDate) =>
                                  setExtensionDraft((current) => ({
                                    ...current,
                                    extendedFilingDate,
                                  }))
                                }
                              />
                            </label>
                          ) : null}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1">
                              <span className="text-caption-xs tracking-eyebrow-tight text-text-tertiary uppercase">
                                <Trans>Internal target date</Trans>
                              </span>
                              <IsoDatePicker
                                value={extensionDraft.internalTargetDate}
                                invalid={internalTargetDateInvalid}
                                maxIsoDate={extensionDeadlineCap}
                                ariaLabel={t`Internal extension target date`}
                                placeholder={t`Internal extension target date`}
                                onValueChange={(internalTargetDate) =>
                                  setExtensionDraft((current) => ({
                                    ...current,
                                    internalTargetDate,
                                  }))
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-caption-xs tracking-eyebrow-tight text-text-tertiary uppercase">
                                <Trans>Source or confirmation</Trans>
                              </span>
                              <Input
                                aria-label={t`Extension source`}
                                placeholder={t`Reference (optional)`}
                                value={extensionDraft.source}
                                onChange={(event) =>
                                  setExtensionDraft((current) => ({
                                    ...current,
                                    source: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>
                          <label className="flex flex-col gap-1">
                            <span className="text-caption-xs tracking-eyebrow-tight text-text-tertiary uppercase">
                              <Trans>Decision memo</Trans>
                            </span>
                            <Textarea
                              aria-label={t`Decision memo`}
                              aria-required="true"
                              placeholder={t`Why is this extension being filed? (required)`}
                              value={extensionDraft.memo}
                              onChange={(event) =>
                                setExtensionDraft((current) => ({
                                  ...current,
                                  memo: event.target.value,
                                }))
                              }
                            />
                          </label>
                          {row.paymentDueDate ? (
                            <PaymentStillDueCallout
                              title={
                                typeof row.estimatedTaxDueCents === 'number' &&
                                row.estimatedTaxDueCents > 0
                                  ? t`Payment of ${formatCents(row.estimatedTaxDueCents)} still due ${formatDate(row.paymentDueDate)}`
                                  : t`Payment still due ${formatDate(row.paymentDueDate)}`
                              }
                            >
                              <Trans>
                                Filing an extension does not extend the time to pay. Schedule an
                                EFTPS payment by the original deadline to avoid interest and
                                penalties.
                              </Trans>
                            </PaymentStillDueCallout>
                          ) : null}
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {row.extensionDecidedAt ? (
                              <span className="mr-auto text-caption text-text-tertiary">
                                <Trans>
                                  Last decided{' '}
                                  {formatDateTimeWithTimezone(
                                    row.extensionDecidedAt,
                                    practiceTimezone,
                                  )}
                                </Trans>
                              </span>
                            ) : null}
                            <Button
                              variant="outline"
                              onClick={() => setExtensionDraft(emptyExtensionPlanDraft(row.id))}
                            >
                              <Trans>Reset</Trans>
                            </Button>
                            <Button
                              onClick={saveExtensionDecision}
                              disabled={saveExtensionPlanDisabled}
                            >
                              <Trans>File extension</Trans>
                            </Button>
                          </div>
                        </div>
                      </DetailSectionCard>
                    ) : null}
                  </div>
                  {/* 2026-06-10 (Yuqi restore rework 69879cb8 — Pencil Qn4nX):
                      single-column body, so Ownership + Linked-from fold to a
                      full-width 2-up footer row below the cards (the prior right
                      rail is gone). Each is wrapped in the shared
                      DetailSectionCard chrome (gray header band) so they match
                      the alert's zero-hand-rolled-card system — parity #4. */}
                  {/* 2026-06-10 (Yuqi page-polish #18/#19 "不要" ×2): the
                      Ownership + Linked-from footer 2-up is dropped in page mode.
                      Ownership duplicates the footer Assign action; Linked-from's
                      "Client profile" duplicates the hero client chip (which
                      already navigates to the client). Panel/sheet keep both. */}
                  {!isPageMode ? (
                    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                      <DetailSectionCard title={<Trans>Ownership</Trans>}>
                        <div className="flex items-center gap-2.5">
                          <AssigneeAvatar
                            name={row.assigneeName ?? t`Unassigned`}
                            title={row.assigneeName ?? t`Unassigned`}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-caption-xs text-text-tertiary">
                              <Trans>Assignee</Trans>
                            </p>
                            <p className="truncate text-sm font-medium text-text-primary">
                              {row.assigneeName ?? <Trans>Unassigned</Trans>}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                // 2026-06-10 (Yuqi critique contrast pass): the
                                // "Change" target was a tiny h-7 ghost in
                                // accent-solid (~3:1 on white). Switched to a
                                // bordered outline button at the default size so
                                // it clears AA and reads as a real affordance.
                                <Button variant="outline" size="sm" className="h-8 font-medium">
                                  <Trans>Change</Trans>
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-56">
                              {assignableMembers.length > 0 ? (
                                <DropdownMenuRadioGroup
                                  value={row.assigneeId ?? ''}
                                  onValueChange={(value) =>
                                    assignMutation.mutate({ id: row.id, assigneeId: value || null })
                                  }
                                >
                                  {assignableMembers.map((member) => (
                                    <DropdownMenuRadioItem
                                      key={member.assigneeId}
                                      value={member.assigneeId}
                                    >
                                      {member.name}
                                    </DropdownMenuRadioItem>
                                  ))}
                                </DropdownMenuRadioGroup>
                              ) : (
                                <DropdownMenuItem disabled>
                                  <Trans>No assignable teammates</Trans>
                                </DropdownMenuItem>
                              )}
                              {row.assigneeId ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      assignMutation.mutate({ id: row.id, assigneeId: null })
                                    }
                                  >
                                    <Trans>Clear assignee</Trans>
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </DetailSectionCard>
                      <DetailSectionCard title={<Trans>Linked from</Trans>}>
                        <Link
                          to={clientDetailPath({ id: row.clientId, name: row.clientName })}
                          className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-subtle text-text-tertiary">
                            <UsersIcon className="size-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-sm font-medium text-text-primary">
                              {row.clientName}
                            </span>
                            <span className="block text-caption-xs text-text-tertiary">
                              <Trans>Client profile</Trans>
                            </span>
                          </span>
                          <ExternalLinkIcon
                            className="size-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden
                          />
                        </Link>
                        {row.taxYear ? (
                          <Link
                            to={clientDetailPath({ id: row.clientId, name: row.clientName })}
                            className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                          >
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-subtle text-text-tertiary">
                              <CalendarClockIcon className="size-3.5" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1 leading-tight">
                              <span className="block truncate text-sm font-medium text-text-primary">
                                <Trans>TY {row.taxYear - 1}</Trans>
                              </span>
                              <span className="block text-caption-xs text-text-tertiary">
                                <Trans>Prior return</Trans>
                              </span>
                            </span>
                            <ExternalLinkIcon
                              className="size-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden
                            />
                          </Link>
                        ) : null}
                      </DetailSectionCard>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </TabsContent>
            <TabsContent value="readiness" key="readiness-content">
              <motion.div
                // 2026-06-10 (Yuqi page-polish #7 "remove top padding"): the
                // per-tab content drops its 24px top padding in page mode so it
                // sits tight under the tab bar. Panel/sheet keep pt-6.
                className={cn(isPageMode ? '' : 'pt-6')}
                initial={{ x: 12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* 2026-05-26 (Yuqi sixty-sixth pass — Materials
                    structural tighten, #13 "scattered"): outer gap
                    bumped from gap-3 → gap-4 so each top-level
                    block (overview, checklist, sent panel, tax
                    year settings) reads as its own clear section
                    instead of one long stack. Cross-tab default. */}
                <div className="grid gap-4">
                  {/* Top-of-tab summary — explains what readiness IS
                        + shows the at-a-glance state (PRD §3.2 says the
                        biggest deadline risk isn't "CPA doesn't know the
                        date," it's "CPA doesn't have enough info to
                        finish the return"). This anchor + the per-item
                        rows below replace the prior right sidebar. */}
                  <ReadinessOverview
                    row={row}
                    latestRequest={latestRequest ?? null}
                    checklistCount={checklist.length}
                    receivedCount={checklist.filter((item) => item.status === 'received').length}
                  />
                  {/* Cluster 2 (Materials design `AYpfU` MatHeader): progress
                      bar + 3-dot legend. received = `received`; outstanding =
                      `missing` + `needs_review`; waived = `waived` (CPA marked
                      not-applicable this year). */}
                  {checklist.length > 0 ? (
                    <MaterialsProgressLegend
                      counts={{
                        received: checklist.filter((item) => item.status === 'received').length,
                        outstanding: checklist.filter(
                          (item) => item.status !== 'received' && item.status !== 'waived',
                        ).length,
                        waived: checklist.filter((item) => item.status === 'waived').length,
                      }}
                    />
                  ) : null}
                  {/* Three-class deadline display (PRD §7.2 + §3.2):
                        client-action chip when a readiness request is
                        outstanding. The other two classes (statutory,
                        firm-internal) live in the drawer header. */}
                  {latestRequest && latestRequest.status !== 'revoked' ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className="border-state-warning-border bg-state-warning-hover text-text-warning"
                      >
                        <Trans>
                          Client response due{' '}
                          {formatDatePretty(latestRequest.expiresAt.slice(0, 10))}
                        </Trans>
                      </Badge>
                      <span className="text-text-tertiary">
                        <Trans>· firm-set deadline for this materials request</Trans>
                      </span>
                    </div>
                  ) : null}
                  {correctionMaterialsMode ? (
                    <div className="flex items-start gap-2 rounded-lg border border-state-destructive-border bg-state-destructive-hover px-3 py-2 text-sm text-text-destructive">
                      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <div className="grid gap-1">
                        <p className="font-medium">
                          <Trans>Request corrected materials</Trans>
                        </p>
                        <p className="text-xs leading-snug">
                          <Trans>
                            Select received items that need changes, mark them needs correction,
                            then send only those items to the client.
                          </Trans>
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {/* K-1 / parent-obligation blocker editor removed
                    2026-05-21 — it surfaced as a full picker on every
                    drawer open, even when not blocked. The queue row's
                    <BlockedByChip> still shows when a blocker is set,
                    so the signal isn't lost. A better re-home (header
                    chip + on-demand picker, or auto-detected from
                    related-entity rows) is parked for a later pass —
                    see docs/Design/obligation-drawer-ux-audit-2026-05-21.md. */}
                  {/* Action hierarchy — 2026-05-21 redesign:
                    - Empty checklist → single primary "Generate document
                      list" CTA. The other two buttons (Add item, Send to
                      client) are useless here, so they're hidden.
                    - Populated checklist → "Send to client" is the
                      primary CTA on its own line; "Add item" demoted
                      to a quiet text+icon button next to the heading.
                    The old version stacked all three buttons at equal
                    weight regardless of state, so the actual workflow
                    goal (send the request) had to fight Generate +
                    Add item for the user's eye. */}
                  {/* 2026-05-26 (Yuqi fifty-eighth pass — section title
                    semantics): label was "Documents received" + count
                    of `checklist.length` (TOTAL items). Yuqi flagged
                    "Documents Received and Outstanding - what is the
                    relationship? I don't understand" because the same
                    "13" appeared in BOTH the header ("Documents
                    received 13 items") AND the Outstanding subsection
                    below ("Outstanding 13") — a contradiction (you
                    can't have 13 received AND 13 outstanding when
                    there's only 13 total).
                    Fix: rename to "Materials checklist" — it's the
                    SECTION TITLE for the checklist as a whole. The
                    Outstanding/Received subsections inside (added
                    in the forty-ninth pass) carry the actual
                    received-vs-outstanding split + their own counts.
                    Hierarchy now reads:
                      Materials checklist (13 total)
                        ├ Outstanding (N items)
                        └ Received (M items, M + N = 13)
                */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-text-primary">
                            <Trans>Materials checklist</Trans>
                          </h3>
                          {checklistReference ? (
                            <Badge
                              variant="outline"
                              className="h-5 rounded-lg px-1.5 text-caption-xs font-medium text-text-secondary"
                            >
                              {checklistReference}
                            </Badge>
                          ) : null}
                        </div>
                        {(() => {
                          if (row.status !== 'done' && row.status !== 'completed') return null
                          const total = checklist.length
                          const received = checklist.filter((i) => i.status === 'received').length
                          const description =
                            total === 0
                              ? t`No document checklist was attached to this filing.`
                              : received === 0
                                ? t`${total} checklist items weren't individually ticked during filing.`
                                : received < total
                                  ? t`${received} of ${total} items recorded as received before filing.`
                                  : t`All ${total} items recorded as received.`
                          return (
                            <p className="text-caption italic leading-snug text-text-tertiary">
                              {description}
                            </p>
                          )
                        })()}
                      </div>
                      {checklist.length > 0 ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex h-8 items-center gap-2 rounded-lg px-1 text-sm font-medium text-text-secondary">
                            <Checkbox
                              aria-label={
                                correctionMaterialsMode
                                  ? t`Select all received items`
                                  : t`Select all`
                              }
                              checked={allMaterialsSelected}
                              disabled={
                                checklistItemIdsForSelection.length === 0 ||
                                checklistGenerating ||
                                updateChecklistItemMutation.isPending
                              }
                              onCheckedChange={() => {
                                if (allMaterialsSelected) clearMaterialsSelection()
                                else selectAllMaterials()
                              }}
                            />
                            <span>
                              {correctionMaterialsMode ? (
                                <Trans>Select received</Trans>
                              ) : (
                                <Trans>Select all</Trans>
                              )}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={addChecklistItem}
                            disabled={
                              checklistGenerating ||
                              addChecklistItemMutation.isPending ||
                              checklist.length >= 30
                            }
                          >
                            <PlusIcon data-icon="inline-start" />
                            <Trans>Add item</Trans>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {checklist.length === 0 ? (
                      autoGenerateChecklistQuery.isFetching ? (
                        <EmptyPanel className="grid gap-3 text-text-secondary">
                          <div className="flex items-center gap-2">
                            <RefreshCwIcon className="size-4 animate-spin" aria-hidden />
                            <span>
                              <Trans>Preparing</Trans>
                            </span>
                          </div>
                        </EmptyPanel>
                      ) : autoGenerateChecklistQuery.isError ? (
                        <EmptyPanel>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <span>
                              <Trans>Couldn't generate document list</Trans>
                            </span>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => void autoGenerateChecklistQuery.refetch()}
                            >
                              <Trans>Retry</Trans>
                            </Button>
                          </div>
                        </EmptyPanel>
                      ) : (
                        // Empty state — single primary CTA (Generate) sits
                        // inside the empty panel as the obvious next step.
                        // "Add item" is demoted to a small text link below
                        // for users who want to bypass the AI generation.
                        <EmptyPanel className="grid gap-3 text-center text-text-secondary">
                          <p className="text-text-tertiary">
                            <Trans>
                              No documents listed yet. Generate an AI checklist or add items
                              manually.
                            </Trans>
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                generateChecklistMutation.mutate({
                                  obligationId: row.id,
                                })
                              }
                              disabled={checklistGenerating}
                            >
                              <RefreshCwIcon
                                data-icon="inline-start"
                                className={cn(checklistGenerating ? 'animate-spin' : undefined)}
                              />
                              {checklistGenerating ? (
                                <Trans>Preparing</Trans>
                              ) : (
                                <Trans>Generate document list</Trans>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={addChecklistItem}
                              disabled={
                                checklistGenerating ||
                                addChecklistItemMutation.isPending ||
                                checklist.length >= 30
                              }
                            >
                              <PlusIcon data-icon="inline-start" />
                              <Trans>Add item manually</Trans>
                            </Button>
                          </div>
                        </EmptyPanel>
                      )
                    ) : (
                      <>
                        {/* 2026-05-26 (Step 9 AI Visibility Audit F-020):
                        when the auto-generated checklist came back
                        with `degraded: true` the toast disappears in
                        4 seconds but the user keeps using the
                        fallback list. Surface the degraded state as
                        an inline banner that stays as long as the
                        fallback list is on screen — the AI's "I'm
                        not sure" signal needs to be persistent,
                        not transient. */}
                        {checklistDegraded ? (
                          <div className="flex items-start gap-2 rounded-lg border border-state-warning-active-alt bg-state-warning-hover px-3 py-2 text-xs text-text-warning">
                            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            <span>
                              <Trans>
                                AI couldn't reach the full model — showing a fallback list. Review
                                each item against the deadline before relying on it.
                              </Trans>
                            </span>
                          </div>
                        ) : null}
                        {/* 2026-05-26 (Yuqi fifty-second pass — Materials
                        Outstanding/Received split from
                        design/deadlines-drawer-rework): checklist now
                        renders as two labeled sections — Outstanding
                        first (the work the CPA still owes the client),
                        Received second (acknowledgement that the work
                        is done). Empty "Outstanding" collapses to a
                        quiet "All items received" line; empty
                        "Received" hides the section entirely so the
                        early-state checklist reads cleanly as one
                        list. Section headings use the canonical
                        body-section pattern (text-sm font-semibold).
                        ChecklistItemRow handles its own
                        received-style chrome based on item.status —
                        the split is purely organizational, no new
                        renderer needed. */}
                        {(() => {
                          const outstandingItems = checklist.filter(
                            (i) => i.status !== 'received' && i.status !== 'waived',
                          )
                          const receivedItems = checklist.filter((i) => i.status === 'received')
                          const waivedItems = checklist.filter((i) => i.status === 'waived')
                          function renderRow(item: (typeof checklist)[number]) {
                            const response =
                              latestRequest?.responses.find((r) => r.itemId === item.id) ?? null
                            const received = item.status === 'received'
                            const selectable = correctionMaterialsMode
                              ? received
                              : item.status !== 'received' && item.status !== 'waived'
                            const isSelected = selectable && materialsSelection.itemIds.has(item.id)
                            return (
                              <ChecklistItemRow
                                key={`${item.id}:${item.updatedAt}`}
                                item={item}
                                response={response}
                                correctionMode={correctionMaterialsMode}
                                pending={updateChecklistItemMutation.isPending}
                                selected={isSelected}
                                selectionDisabled={!selectable}
                                onToggleSelect={() => toggleMaterialsSelection(item.id)}
                                onStatusChange={(status) =>
                                  updateDocumentChecklistItem(item.id, { status })
                                }
                                onLabelCommit={(label) =>
                                  updateDocumentChecklistItem(item.id, { label })
                                }
                                onDescriptionCommit={(description) =>
                                  updateDocumentChecklistItem(item.id, {
                                    description: description || null,
                                  })
                                }
                                onNoteCommit={(note) =>
                                  updateDocumentChecklistItem(item.id, { note: note || null })
                                }
                                onRemove={() => removeChecklistItem(item.id)}
                              />
                            )
                          }
                          // 2026-05-26 (Yuqi sixtieth pass — terminal-state
                          // Materials framing): when the row is filed /
                          // completed the checklist becomes an ARCHIVE,
                          // not a to-do list. "Outstanding 13" on a
                          // Filed row read as "13 items still to do"
                          // when the work is closed — the items just
                          // weren't ticked in the audit trail.
                          // Terminal headings:
                          //   • "Outstanding" → "Not in audit trail" —
                          //     same items, but framed as "missing from
                          //     the archive" not "still to be done."
                          //   • "Received" → "Archived" — same items,
                          //     historical record framing.
                          const isTerminalRow = row.status === 'done' || row.status === 'completed'
                          return (
                            <div className="flex flex-col gap-4">
                              {/* 2026-05-26 (Yuqi feedback #5): dropped the
                              "This deadline has been filed" banner. The
                              header status pill + the section title
                              ("Not in audit trail" / "Archived") +
                              ReadinessOverview's italic subline already
                              tell the historical-record story 3x over;
                              this green banner was a 4th. Removed. */}
                              {/* 2026-05-26 (Yuqi seventieth pass #6,
                                #9): Outstanding / Received are now
                                small kicker sub-headers (text-
                                caption-xs uppercase tracking-wider
                                text-text-tertiary) — Yuqi's "needs
                                review from Rule Library's table"
                                reference. The Materials checklist
                                h3 above is the section title; these
                                are sub-section labels under it.
                                Inner gap tightened from `gap-2 →
                                gap-1.5` per #9. */}
                              <section className="flex flex-col gap-1.5">
                                <header className="flex items-baseline gap-1.5">
                                  <h4 className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
                                    {isTerminalRow ? (
                                      <Trans>Not in audit trail</Trans>
                                    ) : (
                                      <Trans>Outstanding</Trans>
                                    )}
                                  </h4>
                                  <span
                                    aria-label={t`${outstandingItems.length} items`}
                                    className="text-caption-xs font-medium tabular-nums text-text-tertiary"
                                  >
                                    {outstandingItems.length}
                                  </span>
                                </header>
                                {outstandingItems.length === 0 ? (
                                  <p className="rounded-lg border border-divider-subtle p-4 text-center text-sm text-text-tertiary">
                                    <Trans>All items received.</Trans>
                                  </p>
                                ) : (
                                  <div className="grid gap-1.5">
                                    {outstandingItems.map(renderRow)}
                                  </div>
                                )}
                              </section>
                              {receivedItems.length > 0 ? (
                                <section className="flex flex-col gap-1.5">
                                  <header className="flex items-baseline gap-1.5">
                                    <h4 className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
                                      {isTerminalRow ? (
                                        <Trans>Archived</Trans>
                                      ) : (
                                        <Trans>Received</Trans>
                                      )}
                                    </h4>
                                    <span
                                      aria-label={t`${receivedItems.length} items`}
                                      className="text-caption-xs font-medium tabular-nums text-text-tertiary"
                                    >
                                      {receivedItems.length}
                                    </span>
                                  </header>
                                  <div className="grid gap-1.5">{receivedItems.map(renderRow)}</div>
                                </section>
                              ) : null}
                              {/* Cluster 2 (Materials design `AYpfU > BGLC4`):
                                  Waived sub-section — items the CPA marked as
                                  not-applicable this filing year. Renders the
                                  real waived rows; falls back to the quiet
                                  empty state when none are waived. */}
                              {!isTerminalRow ? (
                                <section className="flex flex-col gap-1.5">
                                  <header className="flex items-baseline gap-1.5">
                                    <h4 className="text-caption-xs font-medium uppercase tracking-wider text-text-tertiary">
                                      <Trans>Waived</Trans>
                                    </h4>
                                    <span
                                      aria-label={t`${waivedItems.length} items`}
                                      className="text-caption-xs font-medium tabular-nums text-text-tertiary"
                                    >
                                      {waivedItems.length}
                                    </span>
                                  </header>
                                  {waivedItems.length > 0 ? (
                                    <div className="grid gap-1.5">{waivedItems.map(renderRow)}</div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 rounded-lg border border-divider-subtle px-4 py-5 text-center">
                                      <CircleOffIcon
                                        className="size-4 text-text-tertiary"
                                        aria-hidden
                                      />
                                      <p className="text-sm font-medium text-text-secondary">
                                        <Trans>No items waived</Trans>
                                      </p>
                                      <p className="text-caption-xs text-text-tertiary">
                                        <Trans>
                                          Mark an outstanding doc as waived when it doesn't apply
                                          this year.
                                        </Trans>
                                      </p>
                                    </div>
                                  )}
                                </section>
                              ) : null}
                            </div>
                          )
                        })()}
                        {/* Primary CTA below the checklist — the actual
                        workflow terminal action. Selection state now
                        lives in the same row, with client-send on the
                        left and selected-item batch actions on the right. */}
                        {canShowMaterialsRequestAction || selectedChecklistItemCount > 0 ? (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {canShowMaterialsRequestAction ? (
                              <Button
                                size="sm"
                                onClick={() => openMaterialsRequestPreview(row.id)}
                                disabled={
                                  previewRequestEmailMutation.isPending ||
                                  sendRequestMutation.isPending ||
                                  !canOpenMaterialsRequestPreview
                                }
                              >
                                <SendIcon data-icon="inline-start" />
                                {correctionMaterialsMode ? (
                                  <Trans>Send correction request</Trans>
                                ) : (
                                  <Trans>Send to client</Trans>
                                )}
                              </Button>
                            ) : null}
                            {selectedChecklistItemCount > 0 ? (
                              <div className="ml-auto flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-text-primary">
                                  <Plural
                                    value={selectedChecklistItemCount}
                                    one="# item selected"
                                    other="# items selected"
                                  />
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={clearMaterialsSelection}
                                  disabled={updateChecklistItemMutation.isPending}
                                >
                                  <Trans>Deselect</Trans>
                                </Button>
                                <Button
                                  size="sm"
                                  variant={correctionMaterialsMode ? 'outline' : 'default'}
                                  onClick={() =>
                                    void (correctionMaterialsMode
                                      ? batchMarkNeedsCorrection(
                                          new Set(selectedChecklistItemIdsForAction),
                                        )
                                      : batchMarkReceived(
                                          new Set(selectedChecklistItemIdsForAction),
                                        ))
                                  }
                                  disabled={updateChecklistItemMutation.isPending}
                                >
                                  {correctionMaterialsMode ? (
                                    <>
                                      <Trans>Mark needs correction</Trans>
                                      <AlertTriangleIcon data-icon="inline-end" />
                                    </>
                                  ) : (
                                    <>
                                      <Trans>Mark client docs received</Trans>
                                      <CheckCircle2Icon data-icon="inline-end" />
                                    </>
                                  )}
                                </Button>
                              </div>
                            ) : null}
                            {correctionMaterialsMode && correctionChecklistItems.length === 0 ? (
                              <p className="text-xs text-text-tertiary">
                                <Trans>
                                  Mark at least one received item needs correction first.
                                </Trans>
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                  {latestRequest ? (
                    <section className="flex flex-col gap-2">
                      <header className="flex items-baseline gap-2">
                        <h3 className="text-sm font-semibold text-text-primary">
                          <Trans>Client request</Trans>
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-caption-xs uppercase tracking-wide"
                        >
                          {latestRequest.status}
                        </Badge>
                      </header>
                      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background-subtle p-3">
                        <span className="text-xs text-text-secondary">
                          <Trans>
                            Sent to {latestRequest.recipientEmail ?? t`client`} · expires{' '}
                            {formatDatePretty(latestRequest.expiresAt.slice(0, 10))}
                          </Trans>
                        </span>
                        {/* 5b: the open/respond signal a CPA needs ("opened
                            but no response yet") — was never shown. */}
                        {latestRequest.firstOpenedAt ? (
                          <span className="text-xs text-text-secondary">
                            <Trans>
                              · opened {formatDatePretty(latestRequest.firstOpenedAt.slice(0, 10))}
                            </Trans>
                          </span>
                        ) : null}
                        {latestRequest.lastRespondedAt ? (
                          <span className="text-xs text-text-secondary">
                            <Trans>
                              · responded{' '}
                              {formatDatePretty(latestRequest.lastRespondedAt.slice(0, 10))}
                            </Trans>
                          </span>
                        ) : null}
                        <div className="ml-auto flex items-center gap-1.5">
                          {latestRequest.portalUrl ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void copyLatestLink()}
                              >
                                <CopyIcon data-icon="inline-start" />
                                <Trans>Copy link</Trans>
                              </Button>
                              <Button size="sm" variant="ghost" onClick={openLatestLink}>
                                <ExternalLinkIcon data-icon="inline-start" />
                                <Trans>Open portal</Trans>
                              </Button>
                            </>
                          ) : null}
                          {latestRequest.status !== 'revoked' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                revokeRequestMutation.mutate({ requestId: latestRequest.id })
                              }
                              disabled={revokeRequestMutation.isPending}
                            >
                              <Trans>Revoke</Trans>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </section>
                  ) : null}
                  {/* 5b: prior materials requests — every earlier send with
                      its sent/opened/responded timeline. The drawer used to
                      read only readinessRequests[0]; the full history was
                      already in the payload, just never surfaced. */}
                  {(detail?.readinessRequests ?? []).length > 1 ? (
                    <section className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold text-text-primary">
                        <Trans>Request history</Trans>
                      </h3>
                      <ul className="flex flex-col gap-1.5">
                        {(detail?.readinessRequests ?? []).slice(1).map((request) => (
                          <li
                            key={request.id}
                            className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-background-subtle px-3 py-2 text-xs text-text-secondary"
                          >
                            <Badge
                              variant="outline"
                              className="text-caption-xs uppercase tracking-wide"
                            >
                              {request.status}
                            </Badge>
                            {request.sentAt ? (
                              <span>
                                <Trans>sent {formatDatePretty(request.sentAt.slice(0, 10))}</Trans>
                              </span>
                            ) : null}
                            {request.firstOpenedAt ? (
                              <span>
                                <Trans>
                                  · opened {formatDatePretty(request.firstOpenedAt.slice(0, 10))}
                                </Trans>
                              </span>
                            ) : null}
                            {request.lastRespondedAt ? (
                              <span>
                                <Trans>
                                  · responded{' '}
                                  {formatDatePretty(request.lastRespondedAt.slice(0, 10))}
                                </Trans>
                              </span>
                            ) : null}
                            {request.recipientEmail ? (
                              <span className="ml-auto text-text-tertiary">
                                {request.recipientEmail}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {/* Tax year profile — relocated 2026-05-21 from the
                    top of the tab (where it dominated daily-driver
                    workflow) to a settings-style footer behind a
                    disclosure. Auto-opens when the profile is
                    incomplete (fiscal year selected without an end
                    date), so a CPA who needs to fix it sees it
                    surface naturally. Otherwise it stays collapsed —
                    one-time setup that rarely needs revisiting. */}
                  {taxYearProfileEditable ? (
                    <details
                      className="mt-2 border-t border-divider-subtle"
                      open={taxYearFiscalMissing || taxYearFiscalInvalid}
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-3 py-2 text-xs font-medium uppercase tracking-wider text-text-tertiary outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt">
                        <span>
                          <Trans>Tax year profile</Trans>
                        </span>
                        <Badge
                          variant="outline"
                          className="text-caption-xs normal-case tracking-normal"
                        >
                          {taxYearProfileSummary}
                        </Badge>
                      </summary>
                      <div className="grid gap-2 border-t border-divider-subtle py-3">
                        <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                          {/* 2026-05-26 (Yuqi sixty-ninth pass #4):
                              Tax year type binary toggle converted
                              from Base UI Select → DropdownMenu so
                              the interaction matches every other
                              dropdown in the drawer (Sort-by /
                              Columns / export client picker). */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <DropdownTriggerButton>
                                  <span className="truncate">
                                    {taxYearDraft.taxYearType === 'calendar' ? (
                                      <Trans>Calendar year</Trans>
                                    ) : (
                                      <Trans>Fiscal year</Trans>
                                    )}
                                  </span>
                                  <ChevronDownIcon
                                    className="size-3.5 shrink-0 text-text-tertiary"
                                    aria-hidden
                                  />
                                </DropdownTriggerButton>
                              }
                            />
                            <DropdownMenuContent align="start" className="w-[var(--anchor-width)]">
                              <DropdownMenuRadioGroup
                                value={taxYearDraft.taxYearType}
                                onValueChange={(value) => {
                                  if (value === 'calendar' || value === 'fiscal') {
                                    setTaxYearDraft((current) => ({
                                      ...current,
                                      taxYearType: value,
                                    }))
                                  }
                                }}
                              >
                                <DropdownMenuRadioItem value="calendar">
                                  <Trans>Calendar year</Trans>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="fiscal">
                                  <Trans>Fiscal year</Trans>
                                </DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Input
                            value={taxYearDraft.fiscalYearEndDate}
                            disabled={taxYearDraft.taxYearType === 'calendar'}
                            aria-label={t`Fiscal year end`}
                            aria-invalid={taxYearFiscalMissing || taxYearFiscalInvalid}
                            inputMode="numeric"
                            placeholder="MM/DD"
                            onBlur={(event) => {
                              const nextFiscalYearEnd = fiscalYearEndParts(
                                event.currentTarget.value,
                              )
                              if (nextFiscalYearEnd) {
                                setTaxYearDraft((current) => ({
                                  ...current,
                                  fiscalYearEndDate: formatFiscalYearEnd(
                                    nextFiscalYearEnd.month,
                                    nextFiscalYearEnd.day,
                                  ),
                                }))
                              }
                            }}
                            onChange={(event) =>
                              setTaxYearDraft((current) => ({
                                ...current,
                                fiscalYearEndDate: event.target.value,
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            className="w-fit"
                            onClick={saveTaxYearProfile}
                            disabled={
                              !taxYearProfileChanged ||
                              taxYearFiscalMissing ||
                              taxYearFiscalInvalid ||
                              updateTaxYearProfileMutation.isPending
                            }
                            aria-busy={updateTaxYearProfileMutation.isPending || undefined}
                          >
                            {/* 2026-05-27 (σ cross-route audit D10):
                                Save in tax-year-profile drawer drifted
                                from the cross-app mutation-button
                                pattern — relabel only, no Loader2 + no
                                aria-busy. Step 6 cont X2 canon: spinner
                                + busy state + label-change together. */}
                            {updateTaxYearProfileMutation.isPending ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                            ) : null}
                            {updateTaxYearProfileMutation.isPending ? (
                              <Trans>Saving…</Trans>
                            ) : (
                              <Trans>Save</Trans>
                            )}
                          </Button>
                        </div>
                        {taxYearFiscalMissing ? (
                          <p className="text-xs text-text-destructive">
                            <Trans>Fiscal-year deadlines require a year end.</Trans>
                          </p>
                        ) : null}
                        {taxYearFiscalInvalid ? (
                          <p className="text-xs text-text-destructive">
                            <Trans>Use a valid month and day.</Trans>
                          </p>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </div>
              </motion.div>
            </TabsContent>
            <TabsContent value="extension" key="extension-content">
              <motion.div
                // 2026-06-10 (Yuqi page-polish #7 "remove top padding"): the
                // per-tab content drops its 24px top padding in page mode so it
                // sits tight under the tab bar. Panel/sheet keep pt-6.
                className={cn(isPageMode ? '' : 'pt-6')}
                initial={{ x: 12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              >
                <div className="grid gap-4">
                  {/* 2026-06-08 (Pencil HuYeb /deadlines detail — Extension
                      tab): the matched-rule facts render as a Form 7004
                      card — title + citation + "Open rule", the
                      defers-filing-not-payment warning, a POLICY/FORM facts
                      grid, and the rule notes — replacing the earlier flat
                      DetailRow list so the rule reads as one authoritative
                      reference card. */}
                  {(() => {
                    const extensionFormName =
                      extensionPolicy?.formName ?? row.extensionFormName ?? null
                    const extensionAuthority = row.authority ?? t`IRS`
                    const estimatedTaxCents =
                      typeof row.estimatedTaxDueCents === 'number' ? row.estimatedTaxDueCents : null
                    const extensionPolicyLabel = extensionPolicy?.available
                      ? extensionDurationMonths !== null
                        ? t`Automatic ${extensionDurationMonths}-month extension`
                        : t`Rule allows extension`
                      : t`No rule extension`
                    const extensionLengthLabel =
                      isValidIsoDate(extensionOriginalDeadline) &&
                      extensionDeadlineCap &&
                      isValidIsoDate(extensionDeadlineCap)
                        ? t`+${Math.round(
                            (Date.parse(extensionDeadlineCap) -
                              Date.parse(extensionOriginalDeadline)) /
                              86_400_000,
                          )} days`
                        : extensionDurationMonths !== null
                          ? t`${extensionDurationMonths} months`
                          : t`Not specified`
                    const paymentStillDue = row.paymentDueDate ?? row.baseDueDate
                    const facts: Array<{ label: string; value: string; warn?: boolean }> = [
                      { label: t`Policy`, value: extensionPolicyLabel },
                      { label: t`Form`, value: extensionFormName ?? t`Not specified` },
                      { label: t`Length`, value: extensionLengthLabel },
                      { label: t`Original deadline`, value: formatDate(extensionOriginalDeadline) },
                      {
                        label: t`Extended deadline`,
                        value: extensionDeadlineCap ? formatDate(extensionDeadlineCap) : '—',
                      },
                      {
                        label: t`Payment still due`,
                        value: estimatedTaxCents
                          ? `${formatDate(paymentStillDue)} · ${formatCents(estimatedTaxCents)}`
                          : formatDate(paymentStillDue),
                        warn: true,
                      },
                    ]
                    return (
                      <section className="flex flex-col">
                        <div className="flex items-start justify-between gap-3 pt-3.5">
                          <div className="flex items-start gap-2">
                            <BookOpenIcon
                              className="mt-0.5 size-4 shrink-0 text-text-accent"
                              aria-hidden
                            />
                            <div className="flex flex-col gap-0.5">
                              <h3 className="text-sm font-semibold text-text-primary">
                                {extensionFormName
                                  ? `${extensionFormName} — ${t`automatic extension of time to file`}`
                                  : (detail.matchedRule?.title ?? t`Extension rule`)}
                              </h3>
                              <span className="font-mono text-caption-xs text-text-tertiary">
                                {[
                                  extensionAuthority,
                                  row.ruleVersion ? `v.${row.ruleVersion}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </div>
                          </div>
                          {detail.matchedRule ? (
                            <TextLink
                              variant="accent"
                              className="shrink-0 font-semibold"
                              render={
                                <Link to={`/rules/${encodeURIComponent(detail.matchedRule.id)}`} />
                              }
                            >
                              <Trans>Open rule →</Trans>
                            </TextLink>
                          ) : null}
                        </div>
                        {estimatedTaxCents && estimatedTaxCents > 0 ? (
                          <p className="flex items-start gap-1.5 pb-1 pt-2 text-caption text-text-warning">
                            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            <Trans>
                              Extension defers filing, not payment. Estimated tax of{' '}
                              {formatCents(estimatedTaxCents)} still owed by the original deadline.
                            </Trans>
                          </p>
                        ) : null}
                        <dl className="mt-2 grid grid-cols-1 border-t border-divider-subtle sm:grid-cols-2">
                          {facts.map((cell) => (
                            <div
                              key={cell.label}
                              className="flex flex-col gap-0.5 border-b border-divider-subtle py-2.5 sm:px-4 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:pl-0 sm:[&:nth-child(even)]:pr-0"
                            >
                              <dt className="text-caption-xs uppercase tracking-eyebrow-tight text-text-tertiary">
                                {cell.label}
                              </dt>
                              <dd
                                className={cn(
                                  'text-sm tabular-nums',
                                  cell.warn ? 'text-text-warning' : 'text-text-primary',
                                )}
                              >
                                {cell.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <div className="flex flex-col gap-0.5 border-b border-divider-subtle py-2.5">
                          <dt className="text-caption-xs uppercase tracking-eyebrow-tight text-text-tertiary">
                            <Trans>Rule notes</Trans>
                          </dt>
                          <dd className="text-caption text-text-secondary">
                            {extensionPolicy?.notes ?? t`No matched rule`}
                          </dd>
                        </div>
                      </section>
                    )
                  })()}
                  {/* Apply-extension card — saves the firm's internal
                      extension plan via decideExtension. The internal
                      target + decision memo are required by the mutation;
                      the payment callout repeats the "defers filing, not
                      payment" warning next to the action. */}
                  <section className="flex flex-col gap-3">
                    <header className="flex flex-col gap-0.5">
                      <h3 className="text-sm font-semibold text-text-primary">
                        <Trans>Apply extension</Trans>
                      </h3>
                      <p className="text-caption text-text-tertiary">
                        <Trans>
                          Save the firm's internal extension plan. The internal target must be on or
                          before the extended filing deadline. This does not file with the authority
                          or change client records.
                        </Trans>
                      </p>
                    </header>
                    {extensionNeedsManualDeadline ? (
                      <label className="flex flex-col gap-1">
                        <span className="text-caption-xs uppercase tracking-eyebrow-tight text-text-tertiary">
                          <Trans>Extended filing deadline</Trans>
                        </span>
                        <IsoDatePicker
                          value={extensionDraft.extendedFilingDate}
                          invalid={extensionManualDeadlineInvalid}
                          ariaLabel={t`Extended filing deadline`}
                          placeholder={t`Extended filing deadline`}
                          onValueChange={(extendedFilingDate) =>
                            setExtensionDraft((current) => ({ ...current, extendedFilingDate }))
                          }
                        />
                      </label>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-caption-xs uppercase tracking-eyebrow-tight text-text-tertiary">
                          <Trans>Internal target date</Trans>
                        </span>
                        <IsoDatePicker
                          value={extensionDraft.internalTargetDate}
                          invalid={internalTargetDateInvalid}
                          maxIsoDate={extensionDeadlineCap}
                          ariaLabel={t`Internal extension target date`}
                          placeholder={t`Internal extension target date`}
                          onValueChange={(internalTargetDate) =>
                            setExtensionDraft((current) => ({ ...current, internalTargetDate }))
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-caption-xs uppercase tracking-eyebrow-tight text-text-tertiary">
                          <Trans>Source or confirmation</Trans>
                        </span>
                        <Input
                          aria-label={t`Extension source`}
                          placeholder={t`Reference (optional)`}
                          value={extensionDraft.source}
                          onChange={(event) =>
                            setExtensionDraft((current) => ({
                              ...current,
                              source: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="text-caption-xs uppercase tracking-eyebrow-tight text-text-tertiary">
                        <Trans>Decision memo</Trans>
                      </span>
                      <Textarea
                        aria-label={t`Decision memo`}
                        aria-required="true"
                        placeholder={t`Why is this extension being filed? (required)`}
                        value={extensionDraft.memo}
                        onChange={(event) =>
                          setExtensionDraft((current) => ({ ...current, memo: event.target.value }))
                        }
                      />
                    </label>
                    {row.paymentDueDate ? (
                      <PaymentStillDueCallout
                        title={
                          typeof row.estimatedTaxDueCents === 'number' &&
                          row.estimatedTaxDueCents > 0
                            ? t`Payment of ${formatCents(row.estimatedTaxDueCents)} still due ${formatDate(row.paymentDueDate)}`
                            : t`Payment still due ${formatDate(row.paymentDueDate)}`
                        }
                      >
                        <Trans>
                          Filing an extension does not extend the time to pay. Schedule an EFTPS
                          payment by the original deadline to avoid interest and penalties.
                        </Trans>
                      </PaymentStillDueCallout>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {row.extensionDecidedAt ? (
                        <span className="mr-auto text-caption text-text-tertiary">
                          <Trans>
                            Last decided{' '}
                            {formatDateTimeWithTimezone(row.extensionDecidedAt, practiceTimezone)}
                          </Trans>
                        </span>
                      ) : null}
                      <Button
                        variant="outline"
                        onClick={() => setExtensionDraft(emptyExtensionPlanDraft())}
                      >
                        <Trans>Cancel</Trans>
                      </Button>
                      <Button onClick={saveExtensionDecision} disabled={saveExtensionPlanDisabled}>
                        <Trans>File extension</Trans>
                      </Button>
                    </div>
                  </section>
                  {/* Cluster 2 (Extension design `Ls3vb > muzOr`):
                      prior-year extension history table. The obligation
                      detail carries this year's extension decision only —
                      there's no cross-year filing-history collection on
                      the payload — so the rows are a static design
                      placeholder behind a "sample" caption. Pixel chrome
                      (mono uppercase column heads on a section-tinted
                      strip, ruled rows, tone-dot result) matches the
                      canvas; collapses to stacked rows on mobile.
                      // TODO(data): prior-year extension/filing history
                      // (year, form, length, original, extended-to, filed
                      // by, result) on the obligation detail. */}
                  <section className="flex flex-col gap-2 pt-1">
                    <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className="text-sm font-semibold text-text-primary">
                        <Trans>Extension history</Trans>
                      </h3>
                      <span className="text-caption-xs text-text-tertiary">
                        {row.clientName}
                        {row.taxType ? ` · ${row.taxType}` : ''}
                      </span>
                      <TextLink
                        variant="accent"
                        className="ml-auto font-semibold"
                        render={<Link to="/deadlines" />}
                      >
                        <Trans>View all client extensions →</Trans>
                      </TextLink>
                    </header>
                    <div>
                      <div className="hidden grid-cols-[64px_72px_64px_110px_110px_1fr_auto] gap-3 border-b border-divider-subtle px-4 py-2.5 sm:grid">
                        {[
                          t`Year`,
                          t`Form`,
                          t`Length`,
                          t`Original`,
                          t`Extended to`,
                          t`Filed by`,
                          t`Result`,
                        ].map((heading) => (
                          <span
                            key={heading}
                            className="font-mono text-caption-xs font-bold uppercase tracking-wider text-text-tertiary"
                          >
                            {heading}
                          </span>
                        ))}
                      </div>
                      {[
                        {
                          year: '2024',
                          form: '7004',
                          length: t`6 mo`,
                          original: 'Mar 17, 2025',
                          extended: 'Sep 15, 2025',
                          filedBy: 'Jules Rivera',
                          result: t`Filed on time`,
                          tone: 'success' as const,
                        },
                        {
                          year: '2023',
                          form: '7004',
                          length: t`6 mo`,
                          original: 'Mar 15, 2024',
                          extended: 'Sep 16, 2024',
                          filedBy: 'Anika Vázquez',
                          result: t`Filed on time`,
                          tone: 'success' as const,
                        },
                        {
                          year: '2022',
                          form: '—',
                          length: '—',
                          original: 'Mar 15, 2023',
                          extended: '—',
                          filedBy: 'Anika Vázquez',
                          result: t`Filed without extension`,
                          tone: 'neutral' as const,
                        },
                      ].map((entry, index) => (
                        <div
                          key={entry.year}
                          className={cn(
                            'flex flex-col gap-1.5 px-4 py-3 sm:grid sm:grid-cols-[64px_72px_64px_110px_110px_1fr_auto] sm:items-center sm:gap-3',
                            index > 0 && 'border-t border-divider-subtle',
                          )}
                        >
                          <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                            {entry.year}
                          </span>
                          <span className="text-xs font-medium text-text-secondary">
                            {entry.form}
                          </span>
                          <span className="text-xs font-medium text-text-secondary">
                            {entry.length}
                          </span>
                          <span className="font-mono text-caption-xs font-medium tabular-nums text-text-secondary">
                            {entry.original}
                          </span>
                          <span className="font-mono text-caption-xs font-medium tabular-nums text-text-secondary">
                            {entry.extended}
                          </span>
                          <span className="text-xs font-medium text-text-secondary">
                            {entry.filedBy}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={cn(
                                'size-1.5 shrink-0 rounded-full',
                                entry.tone === 'success'
                                  ? 'bg-state-success-solid'
                                  : 'bg-text-tertiary',
                              )}
                              aria-hidden
                            />
                            <span
                              className={cn(
                                'text-xs font-semibold',
                                entry.tone === 'success'
                                  ? 'text-text-success'
                                  : 'text-text-secondary',
                              )}
                            >
                              {entry.result}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            </TabsContent>
            <TabsContent value="evidence" key="evidence-content">
              <motion.div
                // 2026-06-10 (Yuqi page-polish #7 "remove top padding"): the
                // per-tab content drops its 24px top padding in page mode so it
                // sits tight under the tab bar. Panel/sheet keep pt-6.
                className={cn(isPageMode ? '' : 'pt-6')}
                initial={{ x: 12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* Evidence tab split into two visually-distinct sections
                  (2026-05-21):
                    - WORKPAPERS (top, default open): client-attached
                      files and submissions. This is the daily-driver
                      question — "what do we have on hand?"
                    - AUTHORITY (bottom, collapsed): the deadline's
                      source-of-truth chain (matched rule + IRS / state
                      citations). Used during audit defense, not day-
                      to-day. Folded behind <details> so it doesn't
                      compete with workpapers for the user's eye.
                  Previously both were under one "Evidence" heading,
                  which forced users to scroll past authority citations
                  to find the workpapers they actually wanted. */}
                <div className="grid gap-4">
                  {/* Cluster 2 (Evidence design `KsbdI > H3xJg`): the 1/4
                      artefact-checks hero. The four artefacts that prove a
                      return is filed, accepted, and signed off are derived
                      from EXISTING fields — workpaper count, row.status,
                      and the e-file pipeline state (`row.efileState`) — so
                      no new contract field is invented. */}
                  {(() => {
                    const efile = row.efileState ?? 'not_applicable'
                    const isFiled =
                      row.status === 'done' ||
                      row.status === 'completed' ||
                      ['submitted', 'accepted', 'rejected', 'corrected_resubmitted'].includes(efile)
                    const isAccepted = efile === 'accepted'
                    const isSigned = [
                      'authorization_signed',
                      'ready_to_submit',
                      'submitted',
                      'accepted',
                      'rejected',
                      'corrected_resubmitted',
                    ].includes(efile)
                    const hasWorkpapers = detail.evidence.length > 0
                    const cells: ArtifactStatusCell[] = [
                      {
                        id: 'workpapers',
                        label: <Trans>Workpapers</Trans>,
                        value: hasWorkpapers ? (
                          <Plural
                            value={detail.evidence.length}
                            one="# attached"
                            other="# attached"
                          />
                        ) : (
                          <Trans>None yet</Trans>
                        ),
                        tone: hasWorkpapers ? 'success' : 'warning',
                      },
                      {
                        id: 'filed-return',
                        label: <Trans>Filed return</Trans>,
                        value: isFiled ? <Trans>Filed</Trans> : <Trans>Awaiting</Trans>,
                        tone: isFiled ? 'success' : 'pending',
                      },
                      {
                        id: 'efile-ack',
                        label: <Trans>E-file ack.</Trans>,
                        value: isAccepted ? <Trans>Accepted</Trans> : <Trans>Awaiting</Trans>,
                        tone: isAccepted ? 'success' : 'pending',
                      },
                      {
                        id: 'form-8879',
                        label: <Trans>Form 8879</Trans>,
                        value: isSigned ? <Trans>Signed</Trans> : <Trans>Not signed</Trans>,
                        tone: isSigned ? 'success' : 'pending',
                      },
                    ]
                    const complete = cells.filter((c) => c.tone === 'success').length
                    return (
                      <section className="flex flex-col gap-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="grid gap-0.5">
                            <p className="text-sm font-semibold text-text-primary">
                              <Trans>Evidence to close out filing</Trans>
                            </p>
                            <p className="text-caption text-text-secondary">
                              <Trans>
                                Four artefacts confirm the return is filed, accepted, and signed
                                off.
                              </Trans>
                            </p>
                          </div>
                          <span className="font-mono text-sm font-semibold tabular-nums text-text-secondary">
                            {complete} / {cells.length}
                          </span>
                        </div>
                        <EvidenceArtifactStatusGrid cells={cells} />
                      </section>
                    )
                  })()}
                  {/* 2026-05-26 (Yuqi sixty-sixth pass — cross-tab
                      section heading unify): workpapers heading was
                      `text-xs uppercase tracking-wider text-text-
                      tertiary` (kicker style); every other tab uses
                      `text-sm font-semibold text-text-primary` for
                      section labels. Aligned so all 4 tabs share
                      one heading vocabulary. */}
                  <section
                    aria-labelledby="evidence-workpapers-heading"
                    className="flex flex-col gap-2"
                  >
                    <header className="flex items-baseline justify-between gap-2">
                      <h3
                        id="evidence-workpapers-heading"
                        className="text-sm font-semibold text-text-primary"
                      >
                        <Trans>Workpapers</Trans>
                      </h3>
                      <div className="flex items-center gap-2">
                        {detail.evidence.length > 0 ? (
                          <span className="text-xs tabular-nums text-text-tertiary">
                            {detail.evidence.length}
                          </span>
                        ) : null}
                        {/* Stub CTA so the workpapers section isn't a dead
                            end (audit L11). Upload pipeline isn't wired yet,
                            so the click acknowledges + sets expectation
                            without losing the user. */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toast.info(t`Workpaper upload is coming soon`, {
                              description: t`We'll let you attach PDFs and exports here as soon as ingest lands.`,
                            })
                          }
                        >
                          <Trans>Add workpaper</Trans>
                        </Button>
                      </div>
                    </header>
                    {detail.evidence.length > 0 ? (
                      <div className="grid gap-2">
                        {detail.evidence.map((item) => (
                          <EvidenceInlineItem
                            key={item.id}
                            item={item}
                            practiceTimezone={practiceTimezone}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel>
                        <Trans>No workpapers attached to this deadline yet.</Trans>
                      </EmptyPanel>
                    )}
                  </section>

                  {/* Cluster 2 (Evidence design `KsbdI > FXD1b`): promote the
                      headline authority facts to an always-visible quiet
                      strip. The verbose per-source excerpts stay folded in
                      the <details> below. PRIOR YEAR is design-only — no
                      prior-year filing record on the obligation today.
                      // TODO(data): prior-year filing date for the authority strip. */}
                  {detail.matchedRule ? (
                    <AuthorityFactStrip
                      facts={[
                        ...(row.authority
                          ? [
                              {
                                id: 'authority',
                                label: <Trans>Authority</Trans>,
                                value: row.authority,
                                icon: <BookOpenIcon className="size-3.5" aria-hidden />,
                              },
                            ]
                          : []),
                        {
                          id: 'rule',
                          label: <Trans>Rule</Trans>,
                          value: row.ruleVersion
                            ? `${detail.matchedRule.id} · v${row.ruleVersion}`
                            : detail.matchedRule.id,
                        },
                        {
                          id: 'due',
                          label: <Trans>Due</Trans>,
                          value: formatDate(row.currentDueDate),
                        },
                        {
                          id: 'prior-year',
                          label: <Trans>Prior year</Trans>,
                          // Design-only — there's no prior-year filing record
                          // on the obligation detail today.
                          // TODO(data): prior-year filing date.
                          value: <span className="text-text-tertiary">—</span>,
                        },
                      ]}
                      action={
                        <TextLink
                          variant="accent"
                          className="font-semibold"
                          render={
                            <Link
                              to={`/rules/library?rule=${encodeURIComponent(detail.matchedRule.id)}`}
                            />
                          }
                        >
                          <Trans>Open rule reference →</Trans>
                        </TextLink>
                      }
                    />
                  ) : null}

                  <details className="group border-t border-divider-subtle">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 py-2 text-xs font-medium uppercase tracking-wider text-text-tertiary outline-none hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt">
                      <span>
                        <Trans>Authority citation</Trans>
                      </span>
                      {detail.matchedRule ? (
                        // 2026-05-25 (Yuqi Deadlines #13): rule-id chip
                        // is now a real Link into /rules/library — Yuqi
                        // asked "这个能点出去吗？". Clicking the chip
                        // opens the library scoped to this rule via the
                        // `?rule=` query param (the library page treats
                        // unknown params gracefully when not yet
                        // implemented; even then the user lands in the
                        // right vicinity). stopPropagation on click so
                        // the surrounding <summary> doesn't toggle the
                        // <details> open/closed at the same time.
                        <Badge
                          variant="outline"
                          className="cursor-pointer text-caption-xs normal-case tracking-normal hover:bg-state-base-hover"
                          render={
                            <Link
                              to={`/rules/library?rule=${encodeURIComponent(detail.matchedRule.id)}`}
                              onClick={(event) => event.stopPropagation()}
                              title={t`Open ${detail.matchedRule.id} in the rule library`}
                            />
                          }
                        >
                          {detail.matchedRule.id}
                          {row?.ruleVersion ? ` · v${row.ruleVersion}` : ''}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-state-warning-border text-caption-xs normal-case tracking-normal text-text-warning"
                        >
                          <Trans>No rule bound</Trans>
                        </Badge>
                      )}
                    </summary>
                    <div className="grid gap-2 border-t border-divider-subtle py-3">
                      {detail.matchedRule ? (
                        <div className="grid gap-1">
                          <p className="text-sm font-medium text-text-primary">
                            {detail.matchedRule.title}
                          </p>
                          <p className="text-xs leading-snug text-text-secondary">
                            {detail.matchedRule.defaultTip}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs leading-snug text-text-tertiary">
                          <Trans>
                            This deadline isn't bound to a rule. Deadlines without a source citation
                            can't be defended in audit — bind it before relying on the date.
                          </Trans>
                        </p>
                      )}
                      {detail.matchedRule?.evidence.length ? (
                        <div className="grid gap-2 pt-1">
                          {detail.matchedRule.evidence.map((item) => (
                            <div
                              key={`${item.sourceId}-${item.summary}`}
                              className="grid gap-1 rounded-lg border border-divider-subtle p-3"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-sm font-medium text-text-primary">
                                  {item.summary}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="text-caption-xs uppercase tracking-wide"
                                >
                                  {item.authorityRole}
                                </Badge>
                              </div>
                              <p className="text-xs leading-snug text-text-secondary">
                                "{item.sourceExcerpt}"
                              </p>
                              <p className="text-caption text-text-tertiary">
                                <Trans>
                                  Source #{item.sourceId} · retrieved {item.retrievedAt}
                                </Trans>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </details>
                </div>
              </motion.div>
            </TabsContent>
            {/* 2026-06-09 (Yuqi /deadlines detail rebuild — Pencil rzzww):
                Audit tab. Renders the milestone-grouped ObligationTimeline
                from the real audit feed (was a dead deep-link before). Only
                mounts when the tab is visible (page mode / types that expose
                it) so the panel/sheet surfaces are unchanged. */}
            {visibleTabs.has('audit') ? (
              <TabsContent value="audit" key="audit-content">
                <motion.div
                  // 2026-06-10 (Yuqi page-polish #7 "remove top padding"): the
                  // per-tab content drops its 24px top padding in page mode so
                  // it sits tight under the tab bar. Panel/sheet keep pt-6.
                  className={cn(isPageMode ? '' : 'pt-6')}
                  initial={{ x: 12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                >
                  {detail.auditEvents.length > 0 ? (
                    <ObligationTimeline
                      currentStatus={row.status}
                      events={detail.auditEvents}
                      labels={statusLabels}
                      practiceTimezone={practiceTimezone}
                    />
                  ) : (
                    <EmptyPanel className="py-8 text-center">
                      <Trans>No activity recorded yet.</Trans>
                    </EmptyPanel>
                  )}
                </motion.div>
              </TabsContent>
            ) : null}
          </Tabs>
        )}
        {/* 2026-05-23: dates panel relocated here from the sticky
            snapshot block above. The CPA scans reference dates AFTER
            acting on the active surface (stage card + tabs), so they
            land naturally at the bottom of the drawer body just above
            the sticky footer. Small uppercase eyebrow gives it gentle
            visual separation from the tab content above without
            needing a full divider. */}
        {row ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-caption-xs font-medium uppercase tracking-eyebrow text-text-tertiary">
              <Trans>Reference dates</Trans>
            </p>
            <StatutoryDatesPanel row={row} />
          </div>
        ) : null}
      </div>
      <DeadlineInputRequestDialog
        open={requestInputDialogOpen}
        recipients={requestRecipients}
        selectedRecipientUserId={selectedRequestRecipientUserId}
        message={requestInputDraft.message}
        loadingRecipients={requestRecipientsQuery.isLoading}
        submitting={requestInputMutation.isPending}
        onOpenChange={(open) => {
          if (open) openRequestInputDialog()
          else closeRequestInputDialog()
        }}
        onRecipientChange={(recipientUserId) => {
          setRequestInputDraft((current) => ({ ...current, recipientUserId }))
        }}
        onMessageChange={(message) => {
          setRequestInputDraft((current) => ({ ...current, message }))
        }}
        onSubmit={submitRequestInput}
      />
      <AuthorityRejectionDialog
        open={authorityRejectionDialogOpen}
        draft={authorityRejectionDraft}
        reasonError={authorityRejectionReasonError}
        submitting={markFiledRejectedMutation.isPending}
        onOpenChange={(open) => {
          if (open) openAuthorityRejectionDialog()
          else closeAuthorityRejectionDialog()
        }}
        onDraftChange={(patch) => {
          setAuthorityRejectionDraft((current) => ({ ...current, ...patch }))
          if (patch.reason !== undefined && patch.reason.trim()) {
            setAuthorityRejectionReasonError(false)
          }
        }}
        onSubmit={submitAuthorityRejection}
      />
      <SignatureReminderDialog
        open={remindDialogOpen}
        onOpenChange={setRemindDialogOpen}
        target={{ mode: 'single', obligationId: row?.id ?? null }}
        sending={remindSignatureMutation.isPending}
        onSend={({ subject, body }) => {
          if (!row) return
          remindSignatureMutation.mutate(
            { id: row.id, subject, body },
            { onSuccess: () => setRemindDialogOpen(false) },
          )
        }}
      />
      <MaterialsRequestPreviewDialog
        open={materialsRequestPreview.open}
        preview={previewRequestEmail}
        correctionMode={row?.status === 'review' && row.efileRejectedAt !== null}
        loading={previewRequestEmailMutation.isPending}
        errorMessage={
          previewRequestEmailMutation.isError
            ? (rpcErrorMessage(previewRequestEmailMutation.error) ??
              t`Couldn't prepare materials request preview`)
            : null
        }
        sending={sendRequestMutation.isPending}
        onOpenChange={(open) => {
          if (!open) closeMaterialsRequestPreview()
          else if (materialsRequestPreview.obligationId) {
            setMaterialsRequestPreview((current) => ({ ...current, open: true }))
          }
        }}
        onSend={() => {
          const obligationIdToSend = previewRequestEmail?.obligationId
          if (!obligationIdToSend) return
          sendRequestMutation.mutate(
            { obligationId: obligationIdToSend },
            { onSuccess: closeMaterialsRequestPreview },
          )
        }}
      />
      {row ? (
        /* 2026-06-10 (Yuqi feedback #13): the sticky bottom action bar now
           renders in PAGE mode too (was `!isPageMode`), matching the Alert
           detail's footer — Last updated · Request input · Copy link on the
           left, Assign · Snooze · Mark filed on the right. The page hero no
           longer carries the action cluster (moved here). */
        /* 2026-05-27 (Yuqi drawer parity — match AlertDetailDrawer):
           footer chrome reinstated to match the alert drawer's
           sticky action bar (AlertDetailDrawer.tsx L955):
             • `border-t-2 border-divider-regular` — committed
               decision surface separator (vs. relying on body's
               pb-24 alone, which read inconsistent between
               drawers).
             • `px-12` — match header/body left margin.
           The pt-4 pb-6 vertical rhythm and `min-h-16` stay —
           those already mirror the alert drawer. */
        <div
          className={cn(
            // 2026-06-10 (Yuqi alert↔deadline parity #5): footer chrome
            // aligned to AlertDetailDrawer's SheetFooter — `min-h-16 border-t
            // px-12 py-3` on a white (bg-background-default) committed-decision
            // surface, content centered on the 760px document measure in page
            // mode. Switched from the prior `flex-wrap justify-between` to a
            // single centered row. Panel/sheet keep the warm canvas + their
            // existing wrap behavior.
            'sticky bottom-0 mt-auto flex min-h-16 border-t border-divider-subtle px-12',
            isPageMode
              ? 'items-center bg-background-default py-3'
              : 'flex-wrap items-center justify-between gap-2 bg-background-canvas-warm pt-4 pb-6',
          )}
        >
          {/* 2026-06-08 (Yuqi /deadlines ↔ /alerts parity #4): footer mirrors
              the alerts footer — quiet secondaries on the left (Last updated ·
              Request input · Copy link), primary action cluster on the right
              (Assign · Snooze · Mark as filed). In page mode both children sit
              inside the centered 760px measure; panel/sheet render them flush. */}
          <div
            className={cn(
              'flex w-full items-center',
              isPageMode ? 'mx-auto max-w-[760px] gap-8' : 'contents',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
              {/* 2026-05-26 (Yuqi feedback #7): "Last updated" stacked
                vertically — label on line 1, timestamp on line 2. */}
              <span className="flex flex-col text-xs leading-tight text-text-tertiary">
                <span>
                  <Trans>Last updated</Trans>
                </span>
                <span className="tabular-nums">
                  {formatDateTimeWithTimezone(row.updatedAt, practiceTimezone)}
                </span>
              </span>
              {canRequestInput ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openRequestInputDialog}
                  disabled={requestInputMutation.isPending}
                >
                  <MessageSquareText data-icon="inline-start" />
                  <Trans>Request input</Trans>
                </Button>
              ) : null}
              {/* Quiet shareability slot — copies a deep link that
                round-trips to the same obligation + tab being read. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const url = new URL(
                    deadlineDetailHref({ obligationId: row.id, tab: activeTab }),
                    window.location.origin,
                  )
                  try {
                    await copyTextToClipboard(url.toString())
                    toast.success(t`Link copied`)
                  } catch {
                    toast.error(t`Couldn't copy link — your browser blocked clipboard access.`)
                  }
                }}
              >
                <LinkIcon data-icon="inline-start" />
                <Trans>Copy link to this deadline</Trans>
              </Button>
            </div>
            <DeadlineTopActions
              row={row}
              assignableMembers={assignableMembers}
              onAssign={(assigneeId) => assignMutation.mutate({ id: row.id, assigneeId })}
              onSnooze={(snoozedUntil) => snoozeMutation.mutate({ id: row.id, snoozedUntil })}
              onMarkFiled={() => changeStatus(row.id, 'done', row.status)}
              assignPending={assignMutation.isPending}
              snoozePending={snoozeMutation.isPending}
              markFiledPending={changeStatusMutation.isPending}
            />
          </div>
        </div>
      ) : null}
    </>
  )

  // Two render modes:
  //   - 'panel' (new — used by /deadlines): a persistent right-rail
  //     aside that lives inside the route layout. No backdrop, no focus
  //     trap, no scroll lock — the queue stays interactive next to it.
  //     The component owns its own X close button (above) since there's
  //     no Sheet wrapper providing one.
  //   - 'sheet' (legacy / cross-surface — used by ObligationDrawerProvider
  //     for dashboard, /clients, etc.): the modal Radix Sheet with
  //     backdrop, focus trap, slide-in animation. Each surface picks
  //     its mode via the `mode` prop.
  if (panelLayout) {
    if (obligationId === null) return null
    return (
      <aside
        aria-label={titleText ?? t`Deadline detail`}
        // 2026-05-26 (Yuqi forty-eighth pass — drawer canonical
        // applied to obligation panel): chrome migrated to match
        // AlertDetailDrawer's panel-mode aside exactly. Both
        // drawers in the product now read as the same surface
        // treatment from a CPA's perspective.
        //   • `rounded-lg border` → `border-l` only — the panel
        //     is a sibling COLUMN, not a floating card; the left
        //     edge alone marks the boundary against the
        //     table/list area. No corner radius lets it run
        //     edge-to-edge of the viewport's vertical space.
        //   • `bg-background-subtle` → `bg-background-default`
        //     (white) — the panel reads as paper-on-the-desk per
        //     the inset-surface system, not as a darker tile.
        //   • Added `relative min-h-0 overflow-hidden` so the
        //     sticky header/footer don't bleed and the body's
        //     own scroll surface establishes correctly.
        //   • Added `shadow-[-4px_0_12px_-6px_rgb(0_0_0_/_0.08)]`
        //     — soft left-edge shadow, gestural "paper lifted off
        //     the desk" per the canonical.
        // Inner snapshot is still pinned via sticky positioning
        // (2026-05-21): the aside itself stops scrolling; only
        // the tabs-content area scrolls underneath, so a user 30
        // docs deep in the Readiness checklist still sees what
        // row they're on.
        className={cn(
          'relative flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden',
          // 2026-06-10 (Yuqi alert↔deadline parity #7 — FULLY unify bg): page
          // mode now mirrors AlertDetailDrawer's panel root EXACTLY — a WHITE
          // (bg-background-default) aside with `shadow-subtle` and no left
          // border. The gray wash + white cards are painted by the inner
          // header/body regions (bg-background-subtle), so the surface model
          // is identical to the alert: white root → gray-wash document →
          // white cards. The /clients panel keeps its lifted warm paper +
          // left border.
          isPageMode
            ? 'bg-background-default shadow-subtle'
            : 'border-l border-divider-subtle bg-background-canvas-warm shadow-subtle',
        )}
      >
        {drawerBody}
      </aside>
    )
  }
  // Sheet mode: Radix provides backdrop, focus trap, scroll lock, Esc.
  // A visually-hidden SheetTitle satisfies Radix Dialog's a11y
  // requirement; the visible heading is the <h2> inside `drawerBody`.
  return (
    <Sheet open={obligationId !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent className="flex flex-col bg-background-canvas-warm data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[min(720px,calc(100vw-1rem))] md:data-[side=right]:w-[min(840px,calc(100vw-1.5rem))] xl:data-[side=right]:w-[min(920px,calc(100vw-2rem))] sm:data-[side=right]:max-w-none overflow-y-auto">
        <SheetTitle className="sr-only">{titleText ?? t`Deadline detail`}</SheetTitle>
        <SheetDescription className="sr-only">
          <Trans>Deadline workflow detail panel.</Trans>
        </SheetDescription>
        {drawerBody}
      </SheetContent>
    </Sheet>
  )
}
