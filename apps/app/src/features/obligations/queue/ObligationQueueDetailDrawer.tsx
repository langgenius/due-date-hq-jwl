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
  latestDeadlineInputRequest,
  materialsChecklistReference,
  openExternalUrl,
  todayIsoDate,
  willReadinessChecklistBeFullyReceived,
} from './helpers'
import type { AuthorityRejectionDraft, DeadlineInputRequestDraft } from './types'
import { DueCountdownText } from '@/components/primitives/due-date-label'
import { IsoDatePicker, isValidIsoDate } from '@/components/primitives/iso-date-picker'
import { JurisdictionLabel } from '@/components/primitives/state-badge'
import { DetailStatusBanner } from '@/components/patterns/detail-status-banner'
import { DetailSectionCard } from '@/components/patterns/detail-section-card'
import { contentEnterMotion } from '@/lib/motion'
import { describeTaxCode } from '@/lib/tax-codes'
import { usePracticeTimezone } from '@/features/firm/practice-timezone'
import { ChecklistItemRow } from '@/features/obligations/ChecklistItemRow'
import { deadlineDetailHref } from '@/features/obligations/deadline-detail-url'
import { tabsForObligationType } from '@/features/obligations/obligation-type'
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
  daysBetween,
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
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
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
import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

// 2026-06-11 (keyboard-focus audit): broader popup probe for the page-mode
// Escape-to-close handler. Esc must dismiss the TOPMOST layer — so while any
// base-ui popup (dialog, popover, dropdown, select, sheet) is mounted, the
// page-level Esc stays quiet and lets base-ui's own Esc handling win. Base UI
// keeps these out of the DOM until open, so a mounted node means "open".
const POPUP_LAYER_SELECTOR = [
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="select-content"]',
  '[data-slot="sheet-content"]',
].join(', ')

function isPopupLayerOpen(): boolean {
  return document.querySelector(POPUP_LAYER_SELECTOR) !== null
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
  // 2026-06-16 (Yuqi "the bottom mark as filed should be accent" + alert↔deadline
  // footer parity): "Mark as filed" is the footer's PRIMARY CTA — the deadline's
  // "complete this" action, the analogue of the alert footer's accent Apply /
  // Mark-reviewed — so it takes `variant="accent"`, while Assign + Snooze stay
  // outline secondaries. That's the same dominant-primary + outline-secondaries
  // hierarchy the alert footer uses (AlertDetailDrawer ~L2603).
  // NOTE on the older "避免太多蓝色 / one blue per view" rule: the active-stage
  // card still carries its own accent action (the contextual next-move), so two
  // accents can be on screen — but in DIFFERENT zones (body workspace vs footer
  // commit bar), which reads as a clear hierarchy, not noise. If a stricter
  // one-blue is ever wanted, the lever is to demote the stage action, not this
  // footer CTA.
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
              <Trans>Assign owner</Trans>
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
        variant="accent"
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
  // The footer floats (drop-shadow) while there's more body to scroll, then
  // docks (no shadow, no divider) once at the bottom — mirroring the alert
  // detail's decision footer (`decisionDocked`). Reset to docked when a
  // different deadline opens (computed by the body's onScroll below).
  const [footerDocked, setFooterDocked] = useState(true)
  useEffect(() => {
    setFooterDocked(true)
  }, [obligationId])
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
    //
    // 2026-06-15 (Yuqi): the locked-4 set applies to every persistent
    // panel surface, not just the page. The client-detail side panel
    // (ObligationPanelDispatcher, mode="panel") is the same filing the
    // user would otherwise open at /deadlines/:ref — showing it 5 tabs
    // there and 4 on the page was an inconsistency. Gate on `panelLayout`
    // (panel + page) so both match; the legacy floating sheet keeps base.
    if (!panelLayout) return base
    return base.filter(
      (tab) => tab === 'summary' || tab === 'readiness' || tab === 'evidence' || tab === 'audit',
    )
  }, [row?.obligationType, panelLayout])
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )
  // Only auto-generate when the deadline has NO stored checklist yet — a
  // populated checklist must never be re-reconciled by merely viewing the
  // tab (the server call is a mutation; views don't mutate).
  const shouldAutoGenerateChecklist = Boolean(
    row &&
    visibleTabs.has('readiness') &&
    storedChecklist.length === 0 &&
    !generateChecklistMutation.isPending,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
    // 2026-06-16 (scroll-spy conversion): jump to (URL + smooth-scroll) the
    // Status section so the reviewer lands on the workflow after the row
    // advances. `jumpToSection` is defined below but this only fires at runtime
    // (a materials-completion callback), well after init.
    jumpToSection('summary')
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
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
      toast.error(t`Add a reason.`)
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

  // 2026-06-11 (keyboard-focus audit): Esc closes the page-mode detail —
  // same navigate-back the top bar's breadcrumb/✕ fires. Page mode only
  // (panel/sheet keep base-ui's own dismissal). Goes quiet while typing,
  // and while ANY popup layer (dialog, popover, dropdown, select, sheet)
  // is stacked above — Esc must dismiss the topmost layer, not the page.
  useEffect(() => {
    if (!isPageMode) return undefined
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const target = event.target instanceof HTMLElement ? event.target : null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      if (isPopupLayerOpen()) return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPageMode, onClose])

  const checklistReference = row ? materialsChecklistReference(row) : null
  // The visible heading is shared with the drawer body. SheetTitle
  // stays sr-only below so Radix Dialog gets its accessible name
  // without duplicating header chrome. Title uses the form code now
  // (e.g. "Form 1040") with the client name as a kicker label above
  // — see header comment below for the rationale.
  const titleText = row?.clientName ?? null
  // 2026-06-16 (Yuqi "have the tabs from the Alert Detail — a long scroll where
  // scrolling indicates which section you're on"): the deadline detail's real
  // Tabs become a SCROLL-SPY section nav, matching AlertDetailDrawer. The four
  // panels (Status · Materials · Record · Audit) are different sections of the
  // SAME deadline, so a single long document — with a sticky table-of-contents
  // nav that tracks the scroll — reads truer than behaviour-switching tabs that
  // hide evidence mid-decision. `activeTab` stays the URL/deep-link contract;
  // only its RENDERING changes. Section id = `deadline-section-<tab>` (the tab
  // value verbatim), so activeTab→id is pure string concat.
  //
  // Section data-chips (NrQaI grammar): each section announces its count/state
  // with a mono uppercase data-chip — in BOTH the nav item and the section's
  // own header (via DetailSectionCard `headerRight`). Computed once here so the
  // nav and the headers read off the same source.
  const outstandingMaterials = checklist.filter(
    (i) => i.status !== 'received' && i.status !== 'waived',
  ).length
  const extensionSaved = Boolean(row?.extensionDecidedAt)
  const evidenceCount = detail?.evidence.length ?? 0
  const auditCount = detail?.auditEvents.length ?? 0
  // The mono uppercase data-chip pill shared by the nav items and the section
  // headers (NrQaI). One recipe — `rounded` (4) `bg-background-subtle` pill,
  // `font-mono text-caption-xs font-semibold uppercase tracking-wide
  // text-text-tertiary` — so a section's count/state reads identically wherever
  // it appears. Accent ✓ variant for the boolean Extension "decided" state.
  const sectionDataChip = (
    label: ReactNode,
    options?: { accent?: boolean; ariaLabel?: string },
  ): ReactNode => (
    <span
      aria-label={options?.ariaLabel}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 font-mono text-caption-xs font-semibold uppercase tracking-wide',
        options?.accent
          ? 'bg-state-accent-hover text-text-accent'
          : 'bg-background-subtle text-text-tertiary',
      )}
    >
      {label}
    </span>
  )
  // Per-section data-chip nodes (NrQaI). Materials → outstanding count; Record →
  // workpaper count; Audit → event count; Extension → decided ✓ / not filed.
  // Status carries no chip (the workflow stage IS its own headline). Each is the
  // SAME node passed to the nav item and the section header.
  const materialsChip =
    outstandingMaterials > 0
      ? sectionDataChip(t`${outstandingMaterials} left`, {
          ariaLabel: t`${outstandingMaterials} outstanding`,
        })
      : null
  const evidenceChip =
    evidenceCount > 0
      ? sectionDataChip(t`${evidenceCount}`, { ariaLabel: t`${evidenceCount} workpapers` })
      : null
  const auditChip =
    auditCount > 0
      ? sectionDataChip(t`${auditCount}`, { ariaLabel: t`${auditCount} events` })
      : null
  const extensionChip = extensionSaved
    ? sectionDataChip(
        <>
          <CheckIcon className="size-2.5" aria-hidden />
          <Trans>Filed</Trans>
        </>,
        { accent: true, ariaLabel: t`Extension saved` },
      )
    : null
  // Per-tab nav label + icon + chip. Built from `visibleTabsList` so the gating
  // (which sections render) and the chips come from one place. `risk` never
  // renders (its content was unmounted long ago). Labels match the locked
  // 4-tab contract copy: summary→"Status", evidence→"Record".
  const SECTION_META: Record<
    ObligationQueueDetailTab,
    { label: ReactNode; icon?: ReactNode; chip?: ReactNode }
  > = {
    summary: { label: <Trans>Status</Trans> },
    readiness: {
      label: <Trans>Materials</Trans>,
      icon: <PaperclipIcon className="size-3.5" aria-hidden />,
      chip: materialsChip,
    },
    extension: {
      label: <Trans>Extension</Trans>,
      icon: <CalendarClockIcon className="size-3.5" aria-hidden />,
      chip: extensionChip,
    },
    evidence: {
      label: <Trans>Record</Trans>,
      icon: <FileTextIcon className="size-3.5" aria-hidden />,
      chip: evidenceChip,
    },
    audit: {
      label: <Trans>Audit</Trans>,
      icon: <HistoryIcon className="size-3.5" aria-hidden />,
      chip: auditChip,
    },
    risk: { label: <Trans>Risk</Trans> },
  }
  const sectionNavItems = visibleTabsList
    .filter((tab) => tab !== 'risk')
    .map((tab) =>
      Object.assign(
        {
          id: `deadline-section-${tab}`,
          tab,
        },
        SECTION_META[tab],
      ),
    )
  // Active section = the last section whose top has crossed the pinned nav line;
  // computed in the body's existing onScroll (no extra listener). Seeded from
  // the deep-linked activeTab so the nav highlights correctly before the first
  // scroll event.
  const [activeSection, setActiveSection] = useState(`deadline-section-${activeTab}`)
  // Explicit ref on the scroll container so the deep-link effect + jumpToSection
  // target sections directly, instead of the alert's fragile
  // closest('[class*=overflow-y-auto]') walk (panel mode nests a sticky strip).
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  // Single jump wrapper for both nav clicks and the panel routers' cross-section
  // jumps. Writes the URL (keeps deep-link / back-button / rail parity) THEN
  // smooth-scrolls. The two ActiveStageDetailCard/AuthorityResponsePanel
  // onChangeTab props route through this, which cascades to every jump site
  // inside panels.tsx for free.
  const jumpToSection = useCallback(
    (tab: ObligationQueueDetailTab) => {
      onTabChange(tab)
      scrollContainerRef.current
        ?.querySelector(`#deadline-section-${tab}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [onTabChange],
  )
  // Deep-link / activeTab-change scroll. INSTANT on load (no smooth) so it lands
  // in place without animating from the top during paint. Gated on
  // !detailQuery.isLoading && row so the sections exist (the body shows a
  // skeleton until then); keyed on row?.id so it re-runs when real content lands.
  // TODO(scroll-spy): tune sticky offset live
  useEffect(() => {
    if (detailQuery.isLoading || !row) return
    scrollContainerRef.current
      ?.querySelector(`#deadline-section-${activeTab}`)
      ?.scrollIntoView({ block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeTab + load gate
  }, [activeTab, detailQuery.isLoading, row?.id])
  // The sticky scroll-spy nav (deadline-section table of contents). Replaces the
  // old TabsList; rendered in two structural positions (page header / panel
  // body) exactly like the old `tabBar`. Each item carries the section's
  // label + icon + data-chip; the active item gets the accent underline span,
  // adapted from AlertDetailDrawer's section nav.
  // TODO(scroll-spy): tune sticky offset live (combined sticky height in panel
  // mode = this nav + the sticky PrimaryDeadlineStrip above it).
  const sectionNav =
    sectionNavItems.length > 0 ? (
      <nav
        aria-label={t`Deadline sections`}
        className={cn(
          // Page mode renders this nav inside the non-scrolling white <header>
          // (no sticky needed). Panel + sheet render it in the scroll body, so
          // it must `sticky top-0` to stay put as the sections scroll under it
          // (the scroll-spy table of contents).
          panelLayout ? 'bg-background-default' : 'sticky top-0 z-10 bg-background-default pt-3',
        )}
      >
        <div
          className={cn(
            'flex items-center border-b border-divider-subtle pb-2 text-sm',
            panelLayout ? 'gap-6' : 'gap-8',
          )}
        >
          {sectionNavItems.map((item) => {
            const sectionActive = item.id === activeSection
            return (
              <button
                key={item.id}
                type="button"
                aria-current={sectionActive ? 'true' : undefined}
                onClick={() => jumpToSection(item.tab)}
                className={cn(
                  'relative inline-flex cursor-pointer items-center gap-1.5 pb-0.5 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                  sectionActive
                    ? 'text-text-accent'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                {item.icon}
                {item.label}
                {item.chip}
                {sectionActive ? (
                  <span
                    className="absolute right-0 -bottom-[9px] left-0 h-0.5 rounded-full bg-state-accent-solid"
                    aria-hidden
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      </nav>
    ) : null
  // 2026-06-16 (scroll-spy conversion): page mode wraps the header + body in a
  // flex column (`gap-0` cancels nothing — it just keeps the header a
  // non-scrolling sibling above the flex-1 scroll body). Panel/sheet collapse
  // to a Fragment. Replaces the old `OuterTabsWrapper` (the <Tabs> root is
  // gone — `activeTab` no longer needs a base-ui Tabs context).
  const OuterWrapper = panelLayout ? 'div' : Fragment
  const outerWrapperProps = panelLayout ? { className: 'flex min-h-0 flex-1 flex-col gap-0' } : {}
  const drawerBody = (
    <>
      {/* 2026-06-10 (Yuqi alert↔deadline parity #1): in-surface top bar —
          "‹ Deadlines" crumb + "N of M" position + close ✕, all inside the
          drawer body (page mode) so it shares the 760px document measure
          and scroll column with the hero/body/footer below, exactly like
          AlertDetailDrawer's BackStrip. */}
      {isPageMode ? (
        <DeadlineCrumbBar
          position={position}
          onClose={onClose}
          // Same `{label} — {description}` expression as the hero <h2> (≈L2054),
          // so the crumb leaf matches the title exactly once the hero scrolls
          // away (Yuqi alert↔deadline crumb parity).
          title={
            row
              ? (() => {
                  const meta = describeTaxCode(row.taxType)
                  return meta.description ? `${meta.label} — ${meta.description}` : meta.label
                })()
              : undefined
          }
          heroScrolled={heroCollapsed}
        />
      ) : null}
      {/* 2026-06-16 (Yuqi #5: panel-mode breadcrumb): in panel mode (right-rail
          client detail view), render a slim breadcrumb header row above the
          DetailStatusBanner. Mirrors the in-page DeadlineCrumbBar but adapted
          for panel layout — no position read-out (panel lacks paging), slim
          h-[44px] instead of h-[52px], and the panel's own close-X stays in
          the header (not duplicated here). Path: Deadlines › {clientName} ›
          {formName}. */}
      {mode === 'panel' ? (
        <div className="flex h-[44px] shrink-0 items-center border-b border-divider-subtle px-5">
          <nav className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link
              to="/deadlines"
              className="shrink-0 rounded-sm text-text-tertiary outline-none transition-colors hover:text-text-secondary focus-visible:text-text-secondary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
            >
              <Trans>Deadlines</Trans>
            </Link>
            {row && row.clientName ? (
              <>
                <span className="shrink-0 text-text-muted" aria-hidden>
                  ›
                </span>
                <span className="max-w-[200px] truncate text-text-secondary">{row.clientName}</span>
              </>
            ) : null}
            {row ? (
              <>
                <span className="shrink-0 text-text-muted" aria-hidden>
                  ›
                </span>
                <span className="max-w-[200px] truncate text-text-secondary">
                  {(() => {
                    const meta = describeTaxCode(row.taxType)
                    return meta.label
                  })()}
                </span>
              </>
            ) : null}
          </nav>
        </div>
      ) : null}
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
                  // Pretty date — the banner used raw ISO ("Due 2026-05-12")
                  // while every card shows "May 12, 2026" (Yuqi: 格式统一).
                  t`Due ${formatDatePretty(officialIso.slice(0, 10), { alwaysShowYear: true })}`
                ) : null
              ) : row.daysUntilDue >= 0 ? (
                // Compact shared vocabulary ("in 5d" / "today") — one reading
                // across the column, dashboard, and this banner note.
                <DueCountdownText days={row.daysUntilDue} />
              ) : null
            if (isOverdue) {
              return (
                <DetailStatusBanner
                  compact
                  tone="danger"
                  // 2026-06-16 (Yuqi NrQaI "destructive coloured background"):
                  // the overdue banner now carries the full destructive band
                  // (not the white `subtle` surface) — a real red bar under the
                  // white hero. The band IS the edge, so it has no border-b.
                  icon={AlertTriangleIcon}
                  title={
                    // Compact shared vocabulary ("5d late") so the banner reads
                    // the same word as the column + dashboard (was "N days
                    // overdue"). Negated to a signed-late value for
                    // DueCountdownText. Split out of <Trans> to avoid nesting a
                    // <Plural>-bearing component inside the macro.
                    <span className="inline-flex items-baseline gap-1">
                      <Trans>Past deadline</Trans>
                      <span aria-hidden>·</span>
                      <DueCountdownText
                        days={-Math.abs(
                          daysBetween(row.currentDueDate.slice(0, 10), todayIsoDate()),
                        )}
                      />
                    </span>
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
      {/* 2026-06-16 (scroll-spy conversion): the dual-root <Tabs> swap is gone.
          In page mode the outer wrapper is a flex column so the white header
          stays a fixed-height, non-scrolling sibling above the flex-1 scroll
          body. In panel/sheet mode it's a transparent Fragment. The section
          nav + the panels (now plain <section>s) live inside the body's own
          scroll container below. */}
      <OuterWrapper {...outerWrapperProps}>
        <header
          className={cn(
            'relative flex flex-col px-12 transition-all duration-300 ease-apple',
            // 2026-06-10 (Yuqi page-polish #1 "好奇怪的 top padding"): the
            // page-mode hero leads the surface (the thin status banner + crumb
            // bar above it carry no top gap of their own), so a full pt-10
            // doubled the visual top inset and read as awkward dead space.
            // Page mode uses a calmer pt-6; panel/sheet keep the canonical
            // pt-10 cross-drawer rhythm.
            heroCollapsed ? 'gap-1 pt-3 pb-3' : 'gap-1.5',
            // 2026-06-10 (Yuqi page feedback #3): in the persistent layouts
            // (page + the in-client panel) the tab bar is the header's last
            // child, so its own border-b is the white→gray seam — drop the
            // header's bottom padding so the tabs butt flush against the body.
            // The legacy sheet keeps the canonical pb-6.
            !heroCollapsed && mode === 'sheet' && 'pt-10 pb-6',
            // 2026-06-10 (Yuqi page-polish #4/#5 "should this be part of the
            // header? / white background"): the page-mode header is the WHITE
            // identity block — status banner (above) · title + meta · the three
            // framed key-date columns (rendered below, inside this header). It
            // sits on bg-background-default, contiguous with the title/meta; the
            // gray content wash begins only at the tab content beneath. Content
            // centers on the 760px document measure shared with the body/footer.
            panelLayout && 'bg-background-default [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[760px]',
            panelLayout && !heroCollapsed && 'pt-6',
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
              // 2026-06-16 (Yuqi "random close"): the header's 760px content
              // measure (`[&>*]:w-full [&>*]:max-w-[760px] [&>*]:mx-auto`) was
              // catching this absolute child too, stretching the close button to
              // 760px so the X rendered CENTERED. `!size-8 !max-w-none` opt it out
              // so the X sits in the real top-right corner.
              className="absolute top-3 right-3 !size-8 !max-w-none text-text-tertiary hover:text-text-primary"
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
          {row
            ? (() => {
                const meta = describeTaxCode(row.taxType)
                const heroTitle = meta.description
                  ? `${meta.label} — ${meta.description}`
                  : meta.label
                return (
                  // Expanded state clamps at 3 lines — the same guard the
                  // alert hero carries (2026-06-11 hostile-data sweep: an
                  // unclamped long title ran 4+ lines and pushed the tab
                  // content below the fold on all four tabs). Full text on
                  // the title attr. expanded (was 1.25) per
                  // the same cramped-two-line finding as the alert hero.
                  <h2
                    className={cn(
                      'pr-8 font-semibold tracking-display text-text-primary transition-all duration-300 ease-apple',
                      heroCollapsed
                        ? 'line-clamp-1 text-item-title'
                        : 'line-clamp-3 text-surface-title',
                    )}
                    title={heroTitle}
                  >
                    {heroTitle}
                  </h2>
                )
              })()
            : null}
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
                  // 2026-06-10 (Yuqi page-polish #2 "client link 太小？"): the
                  // "Open {client}" chip was text-caption with a cramped
                  // px-2.5/py-1 hit area — it read as a footnote next to the
                  // h-6 status/flag chips. Bumped to text-sm, an h-7 chip
                  // height, a wider px-3 hit area, and a size-4 icon so it
                  // lands as a proper tappable chip consistent with the meta row.
                  className="group/clientlink inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-divider-regular bg-background-default px-3 text-sm font-medium text-text-secondary outline-none transition-colors hover:border-state-accent-border hover:text-text-accent focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
                >
                  <UsersIcon
                    className="size-4 shrink-0 text-text-tertiary transition-colors group-hover/clientlink:text-text-accent"
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
              {mode === 'sheet' ? (
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
              {/* h-7 — same line box as the client chip so the meta row sits
                  on one baseline (the label's default 22px box rode high). */}
              {row.jurisdiction ? (
                <JurisdictionLabel code={row.jurisdiction} className="h-7" />
              ) : null}
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
          {/* 2026-06-10 (Yuqi page-polish #4/#5): the "Key deadlines" strip is
            part of the WHITE header zone — it reads as the third line of the
            identity block (status banner → title + meta → the three framed
            key dates), on the same white surface as the title/meta above.
            The gray content wash starts only below, at the tab content. The
            strip stays visible even when the hero collapses on scroll — the
            anchor dates are the headline context the collapsed hero keeps.
            Page mode only; panel/sheet render the date strip inside the body
            (below) as before. */}
          {/* 2026-06-10 (Yuqi page-scroll #7 "key dates scroll up — hides"): the
            anchor dates are reference the CPA needs while scrolling the tab
            content, so the collapse keeps them REACHABLE rather than dropping
            them. Expanded: the full three framed key-date cards. Collapsed (on
            scroll): the cards swap for a single condensed one-line summary
            (Filing · Internal · Payment) so the pinned header stays compact yet
            the dates never vanish. The header itself is a non-scrolling sibling
            above the body's scroll container, so either form stays pinned at
            the top while the tab content scrolls beneath. */}
          {panelLayout && row ? (
            heroCollapsed ? (
              (() => {
                const filingIso = row.filingDueDate ?? row.baseDueDate ?? null
                const internalIso = row.extensionInternalTargetDate ?? row.currentDueDate ?? null
                const paymentIso = row.paymentDueDate ?? null
                const summaryDates: Array<{ label: string; iso: string }> = [
                  ...(filingIso ? [{ label: t`Filing`, iso: filingIso }] : []),
                  ...(internalIso ? [{ label: t`Internal`, iso: internalIso }] : []),
                  ...(paymentIso ? [{ label: t`Payment`, iso: paymentIso }] : []),
                ]
                return summaryDates.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm">
                    {summaryDates.map((entry, index) => (
                      <span key={entry.label} className="flex items-center gap-1.5">
                        {index > 0 ? (
                          <span aria-hidden className="text-divider-regular">
                            ·
                          </span>
                        ) : null}
                        <span className="text-text-tertiary">{entry.label}</span>
                        <span className="tabular-nums font-medium text-text-secondary">
                          {formatDate(entry.iso)}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null
              })()
            ) : (
              <div className="pt-1.5">
                <PrimaryDeadlineStrip row={row} variant="cards" />
              </div>
            )
          ) : null}
          {/* 2026-06-10 (Yuqi page-scroll "the tab bar should be part of the
            header, not the body"): the tab bar is now a real, non-scrolling
            child of the white header region — the last line of the identity
            block (status banner → title + meta → key dates → tabs), all on
            the same white surface. It is NO LONGER sticky: the header itself
            is the non-scrolling sibling above the body's scroll container, so
            the tabs stay pinned while only the tab CONTENT scrolls. Its
            `pt-2` opens a small gap below the key dates; the TabsList's own
            `border-b` is the white→gray seam where the scroll body begins.
            Page mode only — panel/sheet render their tab bar inside the body
            (below), unchanged. */}
          {/* 2026-06-10 (Yuqi page feedback #4): open a clear gap above the
              tab strip so it reads as its own band below the key dates,
              instead of butting flush against them. */}
          {panelLayout && row ? <div className="pt-3">{sectionNav}</div> : null}
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
            // 2026-06-16 (Yuqi "match the inter-section gap — use the alert's"):
            // gap-6 → gap-8. The flat sections are this body's direct children, so
            // this gap IS the inter-section rhythm; the alert detail spaces its
            // major sections gap-8 (AlertDetailDrawer L1770), so both now match.
            'flex flex-col gap-8 px-12 pb-24',
            // 2026-05-26 (Yuqi feedback #1): added scrollbar-gutter:stable
            // on the panel-mode body. Different tabs render different
            // content heights (Summary is short, Materials is long).
            // Without gutter:stable, the scrollbar appears/disappears
            // on tab switch and shifts the content ~15px horizontally —
            // reads as "panel width flickers." Reserving the scrollbar
            // space holds the content steady regardless of which tab
            // is active.
            panelLayout && 'flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]',
            // 2026-06-16 (Yuqi NrQaI "avoid being too WHITE"): the scrolling
            // body is a very-light gray so the white bordered section cards read
            // AS cards on it — the NrQaI surface model (white hero/footer, gray
            // body, white cards). The hero and sticky footer stay white; only
            // this section-scroll area goes gray.
            // 2026-06-16 (Yuqi "i don't think this is very light background
            // colour"): bg-background-subtle (gray-100) read as too heavy. Dropped
            // to bg-background-section (gray-50) — the "very very light" wash the
            // NrQaI body uses, where the white cards still lift cleanly off it.
            // Centered on the 760px document measure; `pt-6` gives the first
            // card the same 24px breathing room below the tab seam.
            panelLayout &&
              'bg-background-section pt-6 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-[760px]',
          )}
          ref={scrollContainerRef}
          onScroll={(event) => {
            const el = event.currentTarget
            // Footer float→dock (both modes): docked once the body is scrolled
            // to the end, floating (drop-shadow) while more remains below.
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8
            setFooterDocked((prev) => (prev === atBottom ? prev : atBottom))
            // Hero collapse-on-scroll is page-mode only.
            if (isPageMode) {
              const next = el.scrollTop > 16
              setPageHeaderCollapsed((prev) => (prev === next ? prev : next))
            }
            // 2026-06-16 (scroll-spy conversion): active-section tracking merged
            // into this ONE handler (no second listener) — the active section is
            // the last one whose top has crossed the pinned nav line. Only runs
            // when this div owns the scroll (panelLayout); in the legacy sheet
            // mode the SheetContent scrolls, not this div. Reuses the `atBottom`
            // computed above for the last-section snap (don't recompute).
            // TODO(scroll-spy): tune sticky offset live
            if (!panelLayout || sectionNavItems.length === 0) return
            const containerTop = el.getBoundingClientRect().top
            let current = sectionNavItems[0]!.id
            for (const item of sectionNavItems) {
              const node = el.querySelector(`#${item.id}`)
              if (node && node.getBoundingClientRect().top - containerTop <= 72) current = item.id
            }
            if (atBottom) current = sectionNavItems[sectionNavItems.length - 1]!.id
            setActiveSection((prev) => (prev === current ? prev : current))
          }}
        >
          {detailQuery.isLoading ? (
            // Shape-matched skeleton (hero strip + a couple of body sections)
            // so the detail paints in place instead of a centered "Loading…"
            // that jolts when the real tabs land.
            <div className="flex flex-col gap-4" aria-busy aria-label={t`Loading deadline detail`}>
              <div className="flex flex-col gap-3 rounded-xl border border-divider-regular bg-background-default p-4">
                <Skeleton className="h-6 w-2/3" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-28 rounded-full" />
                </div>
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
              <div className="flex flex-col gap-3 rounded-xl border border-divider-regular bg-background-default p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
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
            <>
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
              {/* 2026-06-10 (Yuqi page-polish #4/#5): in page mode the
                "Key deadlines" strip moved UP into the white header zone
                (rendered inside <header> above), so it's omitted here. Panel
                and sheet modes keep it as the leading body block — sticky in
                the panel rail, a plain spacer in the sheet. */}
              {mode === 'sheet' ? (
                <div
                  className={cn(
                    // 2026-06-16 (scroll-spy conversion): the key-date strip is
                    // NON-sticky now — it scrolls away with the hero (like the
                    // alert hero) so the sticky scroll-spy nav below owns top-0
                    // unobstructed. Was `sticky top-0 z-20` in panel, which
                    // collided with the nav's own `sticky top-0 z-10`.
                    'mb-4 flex flex-col gap-3',
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
                  {/* Mobile sheet only: the compact `flat` date rows. (Panel +
                      page now render the framed `cards` strip in the header zone,
                      so this body strip is sheet-exclusive.) */}
                  <PrimaryDeadlineStrip row={row} variant="flat" />
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
              ) : null}
              {/* 2026-06-16 (scroll-spy conversion): in PAGE mode the section nav
                lives in the white <header> (above); panel/sheet host it here as
                a sticky table-of-contents at the body top. The `sectionNav` node
                is shared so the nav markup lives in one place. */}
              {mode === 'sheet' ? sectionNav : null}
              {visibleTabs.has('summary') ? (
                <section id="deadline-section-summary" className="scroll-mt-16">
                  <motion.div
                    // 2026-06-10 (Yuqi page-polish #7 "remove top padding"): the
                    // per-section content drops its 24px top padding in the
                    // persistent layouts so it sits tight under the nav. The
                    // legacy sheet keeps pt-6.
                    className={cn(panelLayout ? '' : 'pt-6')}
                    {...contentEnterMotion}
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
                    blocking + what's-left) → Extension → Recent activity —
                    then a full-width 2-up Ownership /
                    Linked-from footer row. The earlier two-column rail is
                    gone. This matches the alert detail's single flat card
                    stack. */}
                    <div className="flex flex-col gap-4">
                      <div className={cn('grid min-w-0 flex-1', panelLayout ? 'gap-4' : 'gap-3')}>
                        {/* WorkflowMilestoneCard (Pencil Qn4nX `CorQi`): the stepper,
                        active stage, blocking, and "What's left" — the deadline
                        analogue of the alert's "The change" section.
                        2026-06-16 (Yuqi "avoid being too white, use borders"): the
                        body is now a very-light gray, so this Status workspace is
                        back to a WHITE bordered CARD (stepper + active stage +
                        what's-left in one card, the active-stage block sitting
                        inside FLAT) — consistent with the other section cards on
                        the gray body (NrQaI). Panel/sheet keep `contents`.
                        2026-06-16 (Yuqi "put the progress bar and the Stage 1 of 6
                        card into a section, with background white" + "lets still
                        have the header for each section"): the card now leads with
                        a thin light-tinted "Workflow" HEADER BAND (Yuqi
                        "header should have a light background + be thin"), so the
                        stepper + Stage read as ONE titled white section. */}
                        <div
                          className={
                            panelLayout
                              ? 'flex flex-col gap-4 overflow-hidden rounded-xl border border-divider-subtle bg-background-default p-5'
                              : 'contents'
                          }
                        >
                          {panelLayout ? (
                            // 2026-06-16 (Yuqi "header should have a light background,
                            // and a thin/low-height header — not floating titles"): a real
                            // HEADER BAND — light tint (bg-background-subtle) + hairline
                            // bottom border + tight py-2.5, so it reads as a low defined
                            // strip across the card top. -mx-5 -mt-5 break it out of the
                            // p-5 to span edge-to-edge; the card's overflow-hidden clips
                            // the band to the rounded-xl top corners.
                            <header className="-mx-5 -mt-5 flex min-h-8 items-center gap-2 border-b border-divider-subtle bg-background-subtle px-5 py-1.5">
                              <h3 className="text-base font-semibold text-text-primary">
                                <Trans>Workflow</Trans>
                              </h3>
                            </header>
                          ) : null}
                          <PathToFilingSummary row={row} auditEvents={detail.auditEvents} />
                          {/* 2026-06-16 (Yuqi "at least a divider between the progress
                              bar and the Stage N of 6 content"): full-width hairline
                              separating the stepper from the active-stage block. */}
                          {panelLayout ? (
                            <div className="-mx-5 border-t border-divider-subtle" aria-hidden />
                          ) : null}
                          {/* The "What's left to do" checklist lives BELOW this
                          card as its own flat DetailSectionCard (2026-06-16 NrQaI)
                          so it matches the rest of the panel's card system. */}
                          {/* 2026-06-09 (Yuqi /deadlines detail rebuild — Pencil
                      rzzww + no-fiction rule): the "Expected refund" card
                      ($4,210 + withholding breakdown) and the "Source docs"
                      card's fake "+ Add file" affordance were removed. Both
                      were hardcoded placeholders with no backing contract
                      field — banned by the no-fiction-on-canvas rule. Real
                      source-document attachments return when the ingest
                      pipeline + contract fields land. */}
                          <AuthorityResponsePanel
                            row={row}
                            auditEvents={detail.auditEvents}
                            accepting={markAcceptedMutation.isPending}
                            rejecting={markFiledRejectedMutation.isPending}
                            onConfirmAccepted={() =>
                              markAcceptedMutation.mutate({ id: row.id, status: 'completed' })
                            }
                            onRecordRejection={openAuthorityRejectionDialog}
                            onChangeTab={jumpToSection}
                          />
                          <ActiveStageDetailCard
                            row={row}
                            auditEvents={detail.auditEvents}
                            readinessChecklist={detail.readinessChecklist}
                            // 2026-06-16 (Yuqi NrQaI): inside the shared white
                            // Workflow section card, so render flat — no nested
                            // tinted block. Sheet mode keeps the tinted block.
                            flat={panelLayout}
                            onChangeTab={jumpToSection}
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
                              updatePrepStageMutation.mutate({
                                id: row.id,
                                prepStage: nextPrepStage,
                              })
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
                        </div>
                        {/* 2026-06-16 (Yuqi NrQaI "ensure WHAT'S LEFT TO DO is a
                        carded section with its header — it floats on gray under
                        the workflow card; match the other sections"): the
                        checklist was a divider sub-section INSIDE the Workflow
                        card; it now stands alone as its own white bordered
                        DetailSectionCard (flat, tone="action") with a real
                        "What's left to do" header + a right-aligned N-of-M count,
                        identical treatment to Recent activity / Extension. It
                        renders in every mode (like Recent activity) — the flat
                        card reads correctly on the gray body and the sheet's
                        warm canvas alike. */}
                        {checklist.length > 0 &&
                        row.status !== 'done' &&
                        row.status !== 'completed' ? (
                          <DetailSectionCard
                            variant="flat"
                            tone="action"
                            title={<Trans>What's left to do</Trans>}
                            headerRight={
                              <span className="text-caption-xs text-text-tertiary">
                                {t`${checklist.filter((item) => item.status === 'received').length} of ${checklist.length} complete`}
                              </span>
                            }
                          >
                            <div className="flex flex-col gap-2.5">
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
                                onClick={() => jumpToSection('readiness')}
                              >
                                <Trans>Manage in Materials →</Trans>
                              </TextLink>
                            </div>
                          </DetailSectionCard>
                        ) : null}
                        {/* Recent activity — last few audit-feed entries, with a
                        link out to the full Timeline tab. */}
                        {/* 2026-06-10 (Yuqi — replicate Pencil `qSa9z` Recent
                        activity): the shared <DetailSectionCard> over flush rows
                        with top hairlines + mono timestamps.
                        2026-06-16 (deadlines↔alerts §11): FLAT + tone="reference"
                        — the detail reads as one calm document (matching the
                        alert detail), not boxes-in-boxes. */}
                        {detail.auditEvents.length > 0 ? (
                          <DetailSectionCard
                            variant="flat"
                            tone="reference"
                            title={<Trans>Recent activity</Trans>}
                            headerRight={
                              <button
                                type="button"
                                onClick={() => jumpToSection('audit')}
                                className="rounded-sm font-medium text-text-accent underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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
                                      // the Recent-activity rows flatten to py-2.5.
                                      // 2026-06-16 (§11 flat): no px — the rows sit
                                      // at the flat section's edge, aligned with its
                                      // header (the card's px-5 inset is gone).
                                      'flex items-center gap-3 py-2.5',
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
                        {/* 2026-06-10 (Yuqi restore rework 2adfcf5e — fold Extension
                        into Status): the decideExtension flow (Form 7004/4868)
                        is unreachable in page mode (no Extension tab in the
                        locked 4-tab bar), so the apply-extension action folds
                        here as a Status-tab DetailSectionCard. Reuses the same
                        extensionDraft + saveExtensionDecision as the legacy
                        Extension tab — no fiction (real rule fields only).
                        Shows when a rule allows an extension or one is already
                        on file. */}
                        {panelLayout &&
                        (extensionPolicy?.available || Boolean(row.extensionDecidedAt)) ? (
                          <DetailSectionCard
                            variant="flat"
                            tone="action"
                            title={<Trans>Extension</Trans>}
                            headerRight={
                              row.extensionDecidedAt ? (
                                <span className="text-caption-xs text-text-tertiary">
                                  <Trans>
                                    Filed {formatDate(row.extensionDecidedAt.slice(0, 10))}
                                  </Trans>
                                </span>
                              ) : detail.matchedRule ? (
                                <TextLink
                                  variant="accent"
                                  className="font-semibold"
                                  render={
                                    <Link
                                      to={`/rules/library?rule=${encodeURIComponent(detail.matchedRule.id)}`}
                                    />
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
                                    EFTPS payment by the original deadline to avoid additional
                                    interest.
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
                      rail is gone). Each uses the shared DetailSectionCard
                      (flat + tone="reference", 2026-06-16 §11) so they match the
                      alert detail's flat document — parity #4. */}
                      {/* 2026-06-10 (Yuqi page-polish #18/#19 "不要" ×2): the
                      Ownership + Linked-from footer 2-up is dropped in page mode.
                      Ownership duplicates the footer Assign action; Linked-from's
                      "Client profile" duplicates the hero client chip (which
                      already navigates to the client). Panel/sheet keep both. */}
                      {mode === 'sheet' ? (
                        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                          <DetailSectionCard
                            variant="flat"
                            tone="reference"
                            title={<Trans>Ownership</Trans>}
                          >
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
                                        assignMutation.mutate({
                                          id: row.id,
                                          assigneeId: value || null,
                                        })
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
                          <DetailSectionCard
                            variant="flat"
                            tone="reference"
                            title={<Trans>Linked from</Trans>}
                          >
                            <Link
                              to={clientDetailPath({ id: row.clientId, name: row.clientName })}
                              className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 outline-none transition-colors hover:bg-state-base-hover active:bg-state-base-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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
                                className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 outline-none transition-colors hover:bg-state-base-hover active:bg-state-base-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
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
                </section>
              ) : null}
              {visibleTabs.has('readiness') ? (
                <section id="deadline-section-readiness" className="scroll-mt-16">
                  <motion.div className={cn(panelLayout ? '' : 'pt-6')} {...contentEnterMotion}>
                    {/* 2026-05-26 (Yuqi sixty-sixth pass — Materials
                    structural tighten, #13 "scattered"): outer gap
                    bumped from gap-3 → gap-4 so each top-level
                    block (overview, checklist, sent panel, tax
                    year settings) reads as its own clear section
                    instead of one long stack. Cross-tab default. */}
                    <div className="grid gap-4">
                      {/* 2026-06-11 (Yuqi tab-content unification): the Materials
                        surface now lives in DetailSectionCards so all four tabs
                        share the Status tab's card language. Card 1 — "Materials
                        checklist": the readiness summary (demoted to a compact
                        status line INSIDE the card — it used to out-weight the
                        checklist as a free-floating green headline), progress +
                        legend, then the checklist sections. One title per card
                        (section-header-style.md §Register C): the band title is
                        the only title; the reference badge + list actions live
                        in headerRight. */}
                      <DetailSectionCard
                        variant="flat"
                        tone="action"
                        title={<Trans>Materials checklist</Trans>}
                        headerRight={
                          <>
                            {/* 2026-06-16 (scroll-spy NrQaI): the section's
                            outstanding-count data-chip — the SAME node the
                            section nav renders, so the count reads identically
                            in the nav and in this header. */}
                            {materialsChip}
                            {checklistReference ? (
                              <Badge
                                variant="outline"
                                className="h-5 rounded-lg px-1.5 text-caption-xs font-medium text-text-secondary"
                              >
                                {checklistReference}
                              </Badge>
                            ) : null}
                          </>
                        }
                      >
                        {/* 2026-06-16 (Yuqi "narrower header"): list controls
                        (Select all + Add item) live in a body toolbar so the band
                        stays thin — only the count + reference chip sit in it. */}
                        {checklist.length > 0 ? (
                          <div className="flex items-center justify-end gap-3">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
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
                              {correctionMaterialsMode ? (
                                <Trans>Select received</Trans>
                              ) : (
                                <Trans>Select all</Trans>
                              )}
                            </span>
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
                        {/* Readiness summary — explains what readiness IS + shows
                        the at-a-glance state (PRD §3.2 says the biggest
                        deadline risk isn't "CPA doesn't know the date," it's
                        "CPA doesn't have enough info to finish the return"). */}
                        <ReadinessOverview
                          row={row}
                          latestRequest={latestRequest ?? null}
                          checklistCount={checklist.length}
                          receivedCount={
                            checklist.filter((item) => item.status === 'received').length
                          }
                        />
                        {/* Cluster 2 (Materials design `AYpfU` MatHeader): progress
                      bar + 3-dot legend. received = `received`; outstanding =
                      `missing` + `needs_review`; waived = `waived` (CPA marked
                      not-applicable this year). */}
                        {checklist.length > 0 ? (
                          <MaterialsProgressLegend
                            counts={{
                              received: checklist.filter((item) => item.status === 'received')
                                .length,
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
                              className="border-state-warning-hover-alt bg-state-warning-hover text-text-warning"
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
                                  Select received items that need changes, mark them needs
                                  correction, then send only those items to the client.
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
                          {/* Terminal rows: archive framing — how complete the
                          audit trail was at filing time. */}
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
                                      className={cn(
                                        checklistGenerating ? 'animate-spin' : undefined,
                                      )}
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
                                <div className="flex items-start gap-2 rounded-lg border border-state-warning-active bg-state-warning-hover px-3 py-2 text-xs text-text-warning">
                                  <AlertTriangleIcon
                                    className="mt-0.5 size-3.5 shrink-0"
                                    aria-hidden
                                  />
                                  <span>
                                    <Trans>
                                      AI couldn't reach the full model — showing a fallback list.
                                      Review each item against the deadline before relying on it.
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
                                const receivedItems = checklist.filter(
                                  (i) => i.status === 'received',
                                )
                                const waivedItems = checklist.filter((i) => i.status === 'waived')
                                function renderRow(item: (typeof checklist)[number]) {
                                  const response =
                                    latestRequest?.responses.find((r) => r.itemId === item.id) ??
                                    null
                                  const received = item.status === 'received'
                                  const selectable = correctionMaterialsMode
                                    ? received
                                    : item.status !== 'received' && item.status !== 'waived'
                                  const isSelected =
                                    selectable && materialsSelection.itemIds.has(item.id)
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
                                const isTerminalRow =
                                  row.status === 'done' || row.status === 'completed'
                                return (
                                  <div className="flex flex-col gap-6">
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
                                    <section className="flex flex-col gap-2.5">
                                      <header className="flex items-center gap-2 border-b border-divider-regular pb-1.5">
                                        <h4 className="text-caption-xs font-medium uppercase tracking-wider text-text-secondary">
                                          {isTerminalRow ? (
                                            <Trans>Not in audit trail</Trans>
                                          ) : (
                                            <Trans>Outstanding</Trans>
                                          )}
                                        </h4>
                                        <span
                                          aria-label={t`${outstandingItems.length} items`}
                                          className="rounded-full bg-background-section px-1.5 text-caption-xs font-medium tabular-nums text-text-tertiary"
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
                                      <section className="flex flex-col gap-2.5">
                                        <header className="flex items-center gap-2 border-b border-divider-regular pb-1.5">
                                          <h4 className="text-caption-xs font-medium uppercase tracking-wider text-text-secondary">
                                            {isTerminalRow ? (
                                              <Trans>Archived</Trans>
                                            ) : (
                                              <Trans>Received</Trans>
                                            )}
                                          </h4>
                                          <span
                                            aria-label={t`${receivedItems.length} items`}
                                            className="rounded-full bg-background-section px-1.5 text-caption-xs font-medium tabular-nums text-text-tertiary"
                                          >
                                            {receivedItems.length}
                                          </span>
                                        </header>
                                        <div className="grid gap-1.5">
                                          {receivedItems.map(renderRow)}
                                        </div>
                                      </section>
                                    ) : null}
                                    {/* Cluster 2 (Materials design `AYpfU > BGLC4`):
                                  Waived sub-section — items the CPA marked as
                                  not-applicable this filing year. Renders the
                                  real waived rows; falls back to the quiet
                                  empty state when none are waived. */}
                                    {!isTerminalRow ? (
                                      <section className="flex flex-col gap-2.5">
                                        <header className="flex items-center gap-2 border-b border-divider-regular pb-1.5">
                                          <h4 className="text-caption-xs font-medium uppercase tracking-wider text-text-secondary">
                                            <Trans>Waived</Trans>
                                          </h4>
                                          <span
                                            aria-label={t`${waivedItems.length} items`}
                                            className="rounded-full bg-background-section px-1.5 text-caption-xs font-medium tabular-nums text-text-tertiary"
                                          >
                                            {waivedItems.length}
                                          </span>
                                        </header>
                                        {waivedItems.length > 0 ? (
                                          <div className="grid gap-1.5">
                                            {waivedItems.map(renderRow)}
                                          </div>
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
                                                Mark an outstanding doc as waived when it doesn't
                                                apply this year.
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
                                  {correctionMaterialsMode &&
                                  correctionChecklistItems.length === 0 ? (
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
                      </DetailSectionCard>
                      {/* Card 2 — Client request: status badge moves to the band's
                        headerRight (one title per card); the inner gray box is
                        flattened (no frame-in-frame inside the white card). */}
                      {latestRequest ? (
                        <DetailSectionCard
                          variant="flat"
                          tone="action"
                          title={<Trans>Client request</Trans>}
                          headerRight={
                            <Badge
                              variant="outline"
                              className="text-caption-xs uppercase tracking-wide"
                            >
                              {latestRequest.status}
                            </Badge>
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
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
                                  · opened{' '}
                                  {formatDatePretty(latestRequest.firstOpenedAt.slice(0, 10))}
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
                        </DetailSectionCard>
                      ) : null}
                      {/* 5b: prior materials requests — every earlier send with
                      its sent/opened/responded timeline. The drawer used to
                      read only readinessRequests[0]; the full history was
                      already in the payload, just never surfaced. */}
                      {(detail?.readinessRequests ?? []).length > 1 ? (
                        <DetailSectionCard
                          variant="flat"
                          tone="reference"
                          title={<Trans>Request history</Trans>}
                        >
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
                                    <Trans>
                                      sent {formatDatePretty(request.sentAt.slice(0, 10))}
                                    </Trans>
                                  </span>
                                ) : null}
                                {request.firstOpenedAt ? (
                                  <span>
                                    <Trans>
                                      · opened{' '}
                                      {formatDatePretty(request.firstOpenedAt.slice(0, 10))}
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
                        </DetailSectionCard>
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
                          <summary className="flex cursor-pointer items-center justify-between gap-3 py-2 text-xs font-medium uppercase tracking-wider text-text-tertiary outline-none transition-colors hover:bg-state-base-hover active:bg-state-base-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt">
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
                                <DropdownMenuContent
                                  align="start"
                                  className="w-[var(--anchor-width)]"
                                >
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
                </section>
              ) : null}
              {/* 2026-06-16 (scroll-spy conversion, Matrix note C): the Extension
                section now mounts ONLY when `extension` is in the visible-tab set
                (sheet + filing types). In panel/page the locked-4 set drops it
                (it folds into the Status workflow), so it no longer mounts
                hidden. Intentional divergence — logged in the dev-log. */}
              {visibleTabs.has('extension') ? (
                <section id="deadline-section-extension" className="scroll-mt-16">
                  <motion.div className={cn(panelLayout ? '' : 'pt-6')} {...contentEnterMotion}>
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
                          typeof row.estimatedTaxDueCents === 'number'
                            ? row.estimatedTaxDueCents
                            : null
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
                          {
                            label: t`Original deadline`,
                            value: formatDate(extensionOriginalDeadline),
                          },
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
                                    <Link
                                      to={`/rules/library?rule=${encodeURIComponent(detail.matchedRule.id)}`}
                                    />
                                  }
                                >
                                  <Trans>Open rule →</Trans>
                                </TextLink>
                              ) : null}
                            </div>
                            {estimatedTaxCents && estimatedTaxCents > 0 ? (
                              <p className="flex items-start gap-1.5 pb-1 pt-2 text-caption text-text-warning">
                                <AlertTriangleIcon
                                  className="mt-0.5 size-3.5 shrink-0"
                                  aria-hidden
                                />
                                <Trans>
                                  Extension defers filing, not payment. Estimated tax of{' '}
                                  {formatCents(estimatedTaxCents)} still owed by the original
                                  deadline.
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
                              Save the firm's internal extension plan. The internal target must be
                              on or before the extended filing deadline. This does not file with the
                              authority or change client records.
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
                              Filing an extension does not extend the time to pay. Schedule an EFTPS
                              payment by the original deadline to avoid additional interest.
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
                            onClick={() => setExtensionDraft(emptyExtensionPlanDraft())}
                          >
                            <Trans>Cancel</Trans>
                          </Button>
                          <Button
                            onClick={saveExtensionDecision}
                            disabled={saveExtensionPlanDisabled}
                          >
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
                                className="font-mono text-caption-xs font-semibold uppercase tracking-wider text-text-tertiary"
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
                </section>
              ) : null}
              {visibleTabs.has('evidence') ? (
                <section id="deadline-section-evidence" className="scroll-mt-16">
                  <motion.div className={cn(panelLayout ? '' : 'pt-6')} {...contentEnterMotion}>
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
                          ['submitted', 'accepted', 'rejected', 'corrected_resubmitted'].includes(
                            efile,
                          )
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
                          // 2026-06-11 (Yuqi tab-content unification): card chrome
                          // matches the other tabs — band title + the complete/total
                          // fraction in headerRight (one title per card).
                          <DetailSectionCard
                            variant="flat"
                            tone="action"
                            title={<Trans>Evidence to close out filing</Trans>}
                            headerRight={
                              <span className="font-mono text-sm font-semibold tabular-nums text-text-secondary">
                                {complete} / {cells.length}
                              </span>
                            }
                          >
                            <p className="text-caption text-text-secondary">
                              <Trans>
                                Four artefacts confirm the return is filed, accepted, and signed
                                off.
                              </Trans>
                            </p>
                            <EvidenceArtifactStatusGrid cells={cells} />
                          </DetailSectionCard>
                        )
                      })()}
                      {/* 2026-06-11 (Yuqi tab-content unification): Workpapers in
                      the shared card chrome — count + the (stub) Add-workpaper
                      CTA live in headerRight, the band title is the only title. */}
                      <DetailSectionCard
                        variant="flat"
                        tone="reference"
                        title={<Trans>Workpapers</Trans>}
                        headerRight={evidenceChip}
                      >
                        {/* 2026-06-16 (Yuqi "narrower header"): the Add-workpaper
                        control lives in a body toolbar so the band stays thin. */}
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled
                            title={t`Coming soon — attach PDFs and exports here once ingest lands.`}
                          >
                            <Trans>Add workpaper</Trans>
                          </Button>
                        </div>
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
                      </DetailSectionCard>

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
                        <summary className="flex cursor-pointer items-center justify-between gap-3 py-2 text-xs font-medium uppercase tracking-wider text-text-tertiary outline-none transition-colors hover:bg-state-base-hover active:bg-state-base-active focus-visible:ring-2 focus-visible:ring-state-accent-active-alt">
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
                              className="cursor-pointer text-caption-xs normal-case tracking-normal hover:bg-state-base-hover active:bg-state-base-active"
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
                              className="border-state-warning-hover-alt text-caption-xs normal-case tracking-normal text-text-warning"
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
                                This deadline isn't bound to a rule. Deadlines without a source
                                citation can't be defended in audit — bind it before relying on the
                                date.
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
                </section>
              ) : null}
              {/* 2026-06-09 (Yuqi /deadlines detail rebuild — Pencil rzzww):
                Audit section. Renders the milestone-grouped ObligationTimeline
                from the real audit feed (was a dead deep-link before). Only
                mounts when the tab is visible (page mode / types that expose
                it) so the panel/sheet surfaces are unchanged. */}
              {visibleTabs.has('audit') ? (
                <section id="deadline-section-audit" className="scroll-mt-16">
                  <motion.div className={cn(panelLayout ? '' : 'pt-6')} {...contentEnterMotion}>
                    {/* 2026-06-11 (Yuqi tab-content unification): the timeline
                        sits in the shared card chrome like every other tab's
                        primary content; event count in headerRight. */}
                    <DetailSectionCard
                      variant="flat"
                      tone="reference"
                      title={<Trans>Audit trail</Trans>}
                      // 2026-06-16 (scroll-spy NrQaI): the event-count data-chip,
                      // the SAME node the section nav renders.
                      headerRight={auditChip ?? undefined}
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
                    </DetailSectionCard>
                  </motion.div>
                </section>
              ) : null}
            </>
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
      </OuterWrapper>
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
            // 2026-06-16 (alert↔deadline parity): float→dock — while content
            // scrolls below, a drop-shadow lifts the footer (no border needed);
            // once DOCKED at the bottom the shadow drops and a clear
            // divider-regular top border appears so the action bar stays visibly
            // separated from the content above (Yuqi #8 "footer hard to see" — the
            // old code went border-transparent when docked, so the white footer
            // blended into the white cards above it on the gray body).
            'sticky bottom-0 mt-auto flex min-h-16 border-t px-12 transition-shadow duration-200 ease-apple motion-reduce:transition-none',
            footerDocked ? 'border-divider-regular' : 'border-transparent',
            panelLayout
              ? 'items-center bg-background-default py-3'
              : 'flex-wrap items-center justify-between gap-2 pt-4 pb-6',
            // The mobile Sheet keeps the warm canvas; page + the in-client panel
            // take the white footer surface from the panelLayout arm above.
            mode === 'sheet' && 'bg-background-canvas-warm',
          )}
          style={
            footerDocked ? undefined : { boxShadow: '0 -10px 28px -16px rgba(16, 24, 40, 0.18)' }
          }
        >
          {/* 2026-06-08 (Yuqi /deadlines ↔ /alerts parity #4): footer mirrors
              the alerts footer — quiet secondaries on the left (Last updated ·
              Request input · Copy link), primary action cluster on the right
              (Assign · Snooze · Mark as filed). In page mode both children sit
              inside the centered 760px measure; panel/sheet render them flush. */}
          <div
            className={cn(
              'flex w-full items-center',
              panelLayout ? 'mx-auto max-w-[760px] gap-8' : 'contents',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
              {/* 2026-05-26 (Yuqi feedback #7): "Last updated" stacked
                vertically — label on line 1, timestamp on line 2. */}
              {/* 2026-06-11 (Yuqi polish audit): the stamp reads as a pretty
                  date — the seconds-precision "2026-05-20 04:00:00 CDT" was
                  engineer-grade noise. The full timestamp survives on hover
                  for audit needs. */}
              <span
                className="flex flex-col text-xs leading-tight text-text-tertiary"
                title={formatDateTimeWithTimezone(row.updatedAt, practiceTimezone)}
              >
                <span>
                  <Trans>Last updated</Trans>
                </span>
                <span className="tabular-nums">
                  {formatDatePretty(row.updatedAt.slice(0, 10), { alwaysShowYear: true })}
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
          // body region (bg-background-section), so the surface model
          // is identical to the alert: white root → gray-wash document →
          // white cards. The /clients panel keeps its lifted warm paper +
          // left border.
          isPageMode
            ? 'bg-background-default shadow-subtle'
            : // 2026-06-16 (Yuqi): the in-client panel now matches the page's
              // WHITE surface (was warm canvas). Keeps the left border as the
              // column divider against the filing table; the mobile Sheet keeps
              // the warm canvas below.
              'border-l border-divider-subtle bg-background-default shadow-subtle',
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
      {/* 2026-06-16 (audit — alert↔deadline parity): xl cap aligned to 880px to
          match AlertDetailDrawer's sheet (was 920px) so the two flagship detail
          sheets share one width. */}
      <SheetContent className="flex flex-col bg-background-canvas-warm data-[side=right]:w-full data-[side=right]:max-w-[100vw] sm:data-[side=right]:w-[min(720px,calc(100vw-1rem))] md:data-[side=right]:w-[min(840px,calc(100vw-1.5rem))] xl:data-[side=right]:w-[min(880px,calc(100vw-2rem))] sm:data-[side=right]:max-w-none overflow-y-auto">
        <SheetTitle className="sr-only">{titleText ?? t`Deadline detail`}</SheetTitle>
        <SheetDescription className="sr-only">
          <Trans>Deadline workflow detail panel.</Trans>
        </SheetDescription>
        {drawerBody}
      </SheetContent>
    </Sheet>
  )
}
