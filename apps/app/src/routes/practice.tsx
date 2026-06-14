import { useState, type ReactNode, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  Building2Icon,
  CalculatorIcon,
  CircleAlertIcon,
  GaugeIcon,
  Loader2,
  MinusIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  MAX_INTERNAL_DEADLINE_OFFSET_DAYS,
  MIN_INTERNAL_DEADLINE_OFFSET_DAYS,
  SMART_PRIORITY_DEFAULT_PROFILE,
  type FirmPublic,
  type FirmSmartPriorityPreviewOutput,
  type SmartPriorityFactorKey,
  type SmartPriorityProfile,
} from '@duedatehq/contracts'
import { hasFirmPermission } from '@duedatehq/core/permissions'
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@duedatehq/ui/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@duedatehq/ui/components/ui/field'
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import { Progress } from '@duedatehq/ui/components/ui/progress'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import { Slider } from '@duedatehq/ui/components/ui/slider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Tooltip, TooltipContent, TooltipTrigger } from '@duedatehq/ui/components/ui/tooltip'
import { PageHeader } from '@/components/patterns/page-header'
import { ConceptHelp, ConceptLabel } from '@/features/concepts/concept-help'
import { resolveUSFirmTimezone } from '@/features/firm/timezone-model'
import { FirmTimezoneSelect } from '@/features/firm/timezone-select'
import {
  PermissionInlineNotice,
  PermissionObscuredContent,
} from '@/features/permissions/permission-gate'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { resetPracticeScopedQueryCache } from '@/lib/query-cache'
import { formatDate } from '@/lib/utils'
import { TaxCodeLabel } from '@/components/primitives/tax-code-label'

const PRIORITY_FACTOR_KEYS = [
  'urgency',
  'importance',
  'history',
  'readiness',
] as const satisfies readonly SmartPriorityFactorKey[]

const MIN_URGENCY_WINDOW_DAYS = 1
const MAX_URGENCY_WINDOW_DAYS = 365
const MIN_HISTORY_CAP_COUNT = 1
const MAX_HISTORY_CAP_COUNT = 20

function clonePriorityProfile(profile: SmartPriorityProfile): SmartPriorityProfile {
  return {
    version: profile.version,
    weights: { ...profile.weights },
    urgencyWindowDays: profile.urgencyWindowDays,
    historyCapCount: profile.historyCapCount,
  }
}

function samePriorityProfile(a: SmartPriorityProfile, b: SmartPriorityProfile): boolean {
  return (
    a.urgencyWindowDays === b.urgencyWindowDays &&
    a.historyCapCount === b.historyCapCount &&
    PRIORITY_FACTOR_KEYS.every((key) => a.weights[key] === b.weights[key])
  )
}

function priorityWeightTotal(profile: SmartPriorityProfile): number {
  return PRIORITY_FACTOR_KEYS.reduce((sum, key) => sum + profile.weights[key], 0)
}

function parseWholeNumber(value: string): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

export function PracticeRoute() {
  const currentQuery = useQuery(orpc.firms.getCurrent.queryOptions({ input: undefined }))

  if (currentQuery.isLoading) {
    return <ProfileSkeleton />
  }

  if (currentQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-page-narrow flex-col gap-4 px-4 py-6 md:px-6">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>
            <Trans>Practice profile couldn't load</Trans>
          </AlertTitle>
          <AlertDescription>{currentQuery.error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!currentQuery.data) {
    return (
      <div className="mx-auto flex w-full max-w-page-narrow flex-col gap-4 px-4 py-6 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans>Practice profile</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>No active practice is selected.</Trans>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return <PracticeProfileForm key={currentQuery.data.id} firm={currentQuery.data} />
}

function PracticeProfileForm({ firm }: { firm: FirmPublic }) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canEditPractice = hasFirmPermission({
    role: firm.role,
    permission: 'firm.update',
    coordinatorCanSeeDollars: firm.coordinatorCanSeeDollars,
  })
  const canEditPriority = hasFirmPermission({
    role: firm.role,
    permission: 'firm.priority.update',
    coordinatorCanSeeDollars: firm.coordinatorCanSeeDollars,
  })
  const canDeletePractice = hasFirmPermission({
    role: firm.role,
    permission: 'firm.delete',
    coordinatorCanSeeDollars: firm.coordinatorCanSeeDollars,
  })
  const initialPriorityProfile =
    canEditPriority && firm.smartPriorityProfile
      ? firm.smartPriorityProfile
      : SMART_PRIORITY_DEFAULT_PROFILE
  const [name, setName] = useState(firm.name)
  const originalTimezone = resolveUSFirmTimezone(firm.timezone)
  const [timezone, setTimezone] = useState(originalTimezone)
  const [internalDeadlineOffsetDays, setInternalDeadlineOffsetDays] = useState(
    firm.internalDeadlineOffsetDays,
  )
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Gate the destructive primary behind a typed-name confirm (the
  // GitHub / Linear / Vercel pattern) so a single misclick can't
  // soft-delete the practice. The input is cleared every time the
  // dialog closes so a re-open starts from a clean state.
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [savedPriorityProfile, setSavedPriorityProfile] = useState(() =>
    clonePriorityProfile(initialPriorityProfile),
  )
  const [priorityProfile, setPriorityProfile] = useState(() =>
    clonePriorityProfile(initialPriorityProfile),
  )
  const [priorityPreview, setPriorityPreview] = useState<FirmSmartPriorityPreviewOutput | null>(
    null,
  )

  const updateMutation = useMutation(
    orpc.firms.updateCurrent.mutationOptions({
      onSuccess: (updatedFirm) => {
        setError(null)
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        toast.success(t`Practice profile saved`, {
          description: updatedFirm.name,
        })
      },
      onError: (err) => {
        const message =
          rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`
        setError(message)
        toast.error(t`Couldn't update practice`, {
          description: message,
        })
      },
    }),
  )

  const priorityUpdateMutation = useMutation(
    orpc.firms.updateCurrent.mutationOptions({
      onSuccess: (updatedFirm) => {
        const nextProfile = clonePriorityProfile(
          updatedFirm.smartPriorityProfile ?? SMART_PRIORITY_DEFAULT_PROFILE,
        )
        setSavedPriorityProfile(nextProfile)
        setPriorityProfile(clonePriorityProfile(nextProfile))
        setPriorityPreview(null)
        setError(null)
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        toast.success(t`Smart Priority saved`, {
          description: updatedFirm.name,
        })
      },
      onError: (err) => {
        const message =
          rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`
        setError(message)
        toast.error(t`Couldn't update Smart Priority`, {
          description: message,
        })
      },
    }),
  )

  const previewMutation = useMutation(
    orpc.firms.previewSmartPriorityProfile.mutationOptions({
      onSuccess: (result) => {
        setPriorityPreview(result)
      },
      onError: (err) => {
        const message =
          rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`
        toast.error(t`Couldn't calculate preview`, {
          description: message,
        })
      },
    }),
  )

  const deleteMutation = useMutation(
    orpc.firms.softDeleteCurrent.mutationOptions({
      onSuccess: (result) => {
        void resetPracticeScopedQueryCache(queryClient)
        void navigate(result.nextFirmId ? '/' : '/onboarding', { replace: true })
      },
      onError: (err) => {
        setError(err.message || t`Couldn't delete practice`)
      },
    }),
  )

  // P1: one-time, owner-only backfill — enter legacy filed returns (marked
  // filed before e-signature tracking existed) into the 8879 signature loop.
  const canBackfillSignatureLoop = firm.role === 'owner'
  const backfillSignatureLoopMutation = useMutation(
    orpc.obligations.backfillSignatureLoop.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        toast.success(t`Entered ${result.enteredCount} returns into the signature loop`, {
          description: t`Scanned ${result.scannedCount} filed returns.`,
        })
      },
      onError: (err) => {
        toast.error(t`Couldn't run the backfill`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      // CPA-tuned validation copy: the practice name is the firm's
      // display name across all member surfaces, audit log, and hosted
      // billing — leading with "your firm's display name" anchors the
      // user instead of reading like generic input validation.
      const message = t`Practice name needs at least 2 characters.`
      setError(message)
      toast.error(t`Couldn't update practice`, {
        description: message,
      })
      return
    }
    if (
      internalDeadlineOffsetDays < MIN_INTERNAL_DEADLINE_OFFSET_DAYS ||
      internalDeadlineOffsetDays > MAX_INTERNAL_DEADLINE_OFFSET_DAYS
    ) {
      const message = t`Internal deadline offset must be between 0 and 365 days.`
      setError(message)
      toast.error(t`Couldn't update practice`, {
        description: message,
      })
      return
    }
    updateMutation.mutate({ name: trimmed, timezone, internalDeadlineOffsetDays })
  }

  function setPriorityWeight(key: SmartPriorityFactorKey, weight: number) {
    setPriorityPreview(null)
    setPriorityProfile((current) => ({
      ...current,
      weights: {
        ...current.weights,
        [key]: weight,
      },
    }))
  }

  function updatePriorityNumber(key: 'urgencyWindowDays' | 'historyCapCount', value: string) {
    const parsed = parseWholeNumber(value)
    setPriorityPreview(null)
    setPriorityProfile((current) => ({
      ...current,
      [key]: parsed,
    }))
  }

  function resetPriorityProfile() {
    setPriorityPreview(null)
    setPriorityProfile(clonePriorityProfile(SMART_PRIORITY_DEFAULT_PROFILE))
  }

  function calculatePriorityPreview() {
    previewMutation.mutate({ smartPriorityProfile: priorityProfile })
  }

  function savePriorityProfile() {
    const trimmed = name.trim()
    priorityUpdateMutation.mutate({
      name: trimmed.length >= 2 ? trimmed : firm.name,
      timezone,
      internalDeadlineOffsetDays,
      smartPriorityProfile: priorityProfile,
    })
  }

  const dirty =
    name.trim() !== firm.name ||
    timezone !== originalTimezone ||
    internalDeadlineOffsetDays !== firm.internalDeadlineOffsetDays
  const internalDeadlineOffsetDaysValid =
    internalDeadlineOffsetDays >= MIN_INTERNAL_DEADLINE_OFFSET_DAYS &&
    internalDeadlineOffsetDays <= MAX_INTERNAL_DEADLINE_OFFSET_DAYS
  const weightTotal = priorityWeightTotal(priorityProfile)
  const priorityValid =
    weightTotal === 100 &&
    priorityProfile.urgencyWindowDays >= MIN_URGENCY_WINDOW_DAYS &&
    priorityProfile.urgencyWindowDays <= MAX_URGENCY_WINDOW_DAYS &&
    priorityProfile.historyCapCount >= MIN_HISTORY_CAP_COUNT &&
    priorityProfile.historyCapCount <= MAX_HISTORY_CAP_COUNT
  const priorityDirty = !samePriorityProfile(priorityProfile, savedPriorityProfile)
  // The preview button is disabled for two distinct reasons — (1) no
  // open deadlines to score against or (2) the current weights/ranges
  // don't pass validation. Surface whichever reason currently blocks
  // the action, with invalid weights taking precedence (the user just
  // changed it) so a 105% weight total never shows a disabled button
  // with no explanation.
  const previewDisabledReason = !priorityValid
    ? t`Fix the Smart Priority inputs above before previewing — weights must total 100% and ranges must be valid.`
    : firm.openObligationCount === 0
      ? t`No open deadlines available for preview.`
      : null
  const currentPlan =
    firm.plan === 'firm'
      ? t`Enterprise`
      : firm.plan === 'team'
        ? t`Team`
        : firm.plan === 'pro'
          ? t`Pro`
          : t`Solo`
  const currentRole =
    firm.role === 'owner'
      ? t`Owner`
      : firm.role === 'partner'
        ? t`Partner`
        : firm.role === 'manager'
          ? t`Manager`
          : firm.role === 'preparer'
            ? t`Preparer`
            : t`Coordinator`
  const firmSummary = t`Active practice · ${{ currentPlan }} plan · ${firm.seatLimit} seat limit`
  const firmSummaryLabel = t`Active practice summary`
  const priorityFactorLabels: Record<SmartPriorityFactorKey, string> = {
    urgency: t`Deadline urgency`,
    importance: t`Client importance`,
    history: t`Late filing history`,
    readiness: t`Materials pressure`,
  }
  // One-line "why this factor" hints shown beside each weight slider so
  // the tuner reads without a separate legend. Mirrors the canvas copy.
  const priorityFactorHints: Record<SmartPriorityFactorKey, string> = {
    urgency: t`Distance from the due date`,
    importance: t`Penalty / regulatory weight of the task`,
    history: t`Past missed deadlines for this client`,
    readiness: t`How much client info is already gathered`,
  }

  // KPI strip + footer figures, derived from the live preview (Pencil
  // H1YSCd). All three read straight off the preview rows — no extra
  // round-trip. `topRanked` counts distinct clients holding a top-3
  // preview rank; `needsReview` flags deadlines whose rank shifts more
  // than 5 places; `reorderCount` drives the unsaved-changes footer.
  const previewRows = priorityPreview?.rows ?? []
  const avgPreviewScore =
    previewRows.length === 0
      ? null
      : Math.round(previewRows.reduce((sum, row) => sum + row.previewScore, 0) / previewRows.length)
  const topRankedClientCount = new Set(
    previewRows.filter((row) => row.previewRank <= 3).map((row) => row.clientName),
  ).size
  const needsReviewCount = previewRows.filter(
    (row) => row.rankDelta !== null && Math.abs(row.rankDelta) > 5,
  ).length
  const reorderCount = previewRows.filter(
    (row) => row.rankDelta !== null && row.rankDelta !== 0,
  ).length

  return (
    // Canonical `<PageHeader>` for the breadcrumb + header block. The
    // brand-tinted Building2 icon stays inside the title prop as a
    // leading flourish; the role badge moves to the `actions` slot.
    // The firm-summary wrapper keeps its `role="note"` so screen
    // readers announce it as a complementary annotation.
    <div
      role="note"
      aria-label={firmSummaryLabel}
      className="mx-auto flex w-full max-w-page-narrow flex-col gap-4 px-4 py-6 md:px-6"
    >
      <PageHeader
        breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Practice profile` }]}
        title={
          <span className="inline-flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-primary text-text-inverted"
            >
              <Building2Icon className="size-4" />
            </span>
            <span className="truncate">
              <Trans>Practice profile</Trans>
            </span>
          </span>
        }
        description={firmSummary}
        actions={
          // Step 6 UX #112: dropped tabular-nums on a non-numeric
          // role label, kept font-mono for the tech-stat aesthetic.
          // PageHeader wrapper kept (Step 6's hand-rolled h1 not
          // applied — canonical primitive wins).
          <Badge variant="outline" className="font-mono text-xs">
            {currentRole}
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>General</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Practice profile applies only to the active practice.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {!canEditPractice ? (
              <PermissionInlineNotice permission="firm.update" currentRole={firm.role}>
                <Trans>Only the practice owner can change the practice name or timezone.</Trans>
              </PermissionInlineNotice>
            ) : null}
            {/* The practice-profile fields use Field +
                FieldLabel/FieldDescription so label-input spacing matches
                the rest of the form family and the recalc warning rides
                FieldDescription tone="warning" (single source for the
                "alert helper" pattern). */}
            <Field>
              <FieldLabel htmlFor="firm-name">
                <Trans>Practice name</Trans>
              </FieldLabel>
              <Input
                id="firm-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="organization"
                disabled={!canEditPractice || updateMutation.isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="firm-timezone">
                <Trans>Timezone</Trans>
              </FieldLabel>
              <FirmTimezoneSelect
                id="firm-timezone"
                value={timezone}
                onValueChange={setTimezone}
                disabled={!canEditPractice || updateMutation.isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="firm-internal-deadline-offset">
                {/* The unit lives in the label — a bare "14" reads as a
                    mystery number until the description two lines down. */}
                <Trans>Internal deadline buffer (days)</Trans>
              </FieldLabel>
              <Input
                id="firm-internal-deadline-offset"
                type="number"
                min={MIN_INTERNAL_DEADLINE_OFFSET_DAYS}
                max={MAX_INTERNAL_DEADLINE_OFFSET_DAYS}
                step={1}
                value={internalDeadlineOffsetDays}
                onChange={(event) =>
                  setInternalDeadlineOffsetDays(Number.parseInt(event.target.value || '0', 10))
                }
                disabled={!canEditPractice || updateMutation.isPending}
                className="tabular-nums"
              />
              <FieldDescription>
                <Trans>
                  DueDateHQ shows work as due this many days before each statutory base deadline.
                  Changing this recalculates current deadline dates.
                </Trans>
              </FieldDescription>
              {/* Make the one-way nature of the change explicit — but only
                  once the user has actually changed the value. A standing
                  red warning on an untouched form is alarm fatigue (the
                  calm-surface rule); the consequence belongs to the edit. */}
              {internalDeadlineOffsetDays !== firm.internalDeadlineOffsetDays ? (
                <FieldDescription tone="warning">
                  <Trans>
                    Changes can't be reverted automatically — adjusting this back later won't
                    restore prior deadline dates. Historical audit entries stay intact.
                  </Trans>
                </FieldDescription>
              ) : null}
            </Field>
            <Field>
              <FieldLabel>
                <Trans>Monitoring start date</Trans>
              </FieldLabel>
              <div className="rounded-lg border border-divider-regular bg-background-subtle px-3 py-2 text-sm text-text-secondary">
                <Trans>Monitoring since {formatDate(firm.monitoringStartDate)}</Trans>
              </div>
              <FieldDescription>
                <Trans>
                  DueDateHQ only auto-generates active filing plans from statutory deadlines on or
                  after this date.
                </Trans>
              </FieldDescription>
            </Field>
            {error ? (
              // Canonical destructive Alert — same accessible role as a
              // `<p role=alert>`, but picks up the bordered alert chrome
              // the rest of the app uses for form-level errors.
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  !canEditPractice ||
                  !dirty ||
                  !internalDeadlineOffsetDaysValid ||
                  updateMutation.isPending
                }
                aria-busy={updateMutation.isPending || undefined}
              >
                {updateMutation.isPending ? <Trans>Saving…</Trans> : <Trans>Save changes</Trans>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontalIcon className="size-4" aria-hidden />
            <ConceptLabel concept="smartPriority">
              <Trans>Smart Priority</Trans>
            </ConceptLabel>
          </CardTitle>
          <CardDescription>
            <Trans>Practice-wide weights for deterministic deadline ranking.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionObscuredContent
            locked={!canEditPriority}
            permission="firm.priority.update"
            currentRole={firm.role}
            fallback={<SmartPriorityRedactedContent />}
            notice={<Trans>Only the practice owner can change Smart Priority settings.</Trans>}
          >
            <div className="grid gap-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  {/* No `smartPriority` popover here — the CardTitle
                      above already carries it via ConceptLabel. One
                      explainer per concept per screen. */}
                  <div className="flex items-center gap-1.5">
                    <Label>
                      <Trans>Factor weights</Trans>
                    </Label>
                  </div>
                  <span
                    className={
                      weightTotal === 100
                        ? 'text-xs tabular-nums text-text-secondary'
                        : 'text-xs tabular-nums text-text-destructive'
                    }
                  >
                    <Trans>Total</Trans> {weightTotal}%
                  </span>
                </div>
                {/* When the four weights don't sum to 100, spell out the
                    delta and the direction so the fix is mechanical
                    ("Reduce factors by 5% to balance" / "Add 5% across
                    factors to balance") rather than leaving the user to
                    guess from the destructive-color "Total NNN%" pill. */}
                {weightTotal !== 100 ? (
                  <p className="text-xs leading-5 text-text-destructive">
                    {weightTotal > 100 ? (
                      <Trans>
                        Reduce factors by {weightTotal - 100}% to balance. Weights must total 100%.
                      </Trans>
                    ) : (
                      <Trans>
                        Add {100 - weightTotal}% across factors to balance. Weights must total 100%.
                      </Trans>
                    )}
                  </p>
                ) : null}
                {/* Weights are draggable sliders. Each row carries the
                    factor name, a one-line "why" hint, and the live value;
                    the slider sits on a 0–100 scale. Keyboard entry works
                    via the Slider's built-in arrow-key + Home/End
                    handling, and the value readout stays as a focusable
                    hidden input for screen readers. */}
                <div className="grid gap-5">
                  {PRIORITY_FACTOR_KEYS.map((key) => (
                    <div key={key} className="grid gap-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid min-w-0 gap-0.5">
                          <Label
                            htmlFor={`priority-weight-${key}`}
                            className="text-sm font-medium text-text-primary"
                          >
                            {priorityFactorLabels[key]}
                          </Label>
                          <span className="text-xs leading-4 text-text-tertiary">
                            {priorityFactorHints[key]}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">
                          {priorityProfile.weights[key]}
                        </span>
                      </div>
                      <Slider
                        id={`priority-weight-${key}`}
                        aria-label={priorityFactorLabels[key]}
                        min={0}
                        max={100}
                        step={1}
                        value={priorityProfile.weights[key]}
                        onValueChange={(value) =>
                          setPriorityWeight(key, Array.isArray(value) ? (value[0] ?? 0) : value)
                        }
                        disabled={priorityUpdateMutation.isPending}
                      />
                      <div className="flex justify-between text-caption-xs font-medium tabular-nums text-text-muted">
                        <span>0</span>
                        <span>100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {/* ConceptHelp lives inline as a child of FieldLabel —
                    FieldLabel already gap-2's its children so no extra
                    flex wrapper is needed. */}
                <Field>
                  <FieldLabel htmlFor="priority-urgency-window">
                    <Trans>Urgency window</Trans>
                    <ConceptHelp concept="urgencyWindow" />
                  </FieldLabel>
                  <Input
                    id="priority-urgency-window"
                    type="number"
                    min={MIN_URGENCY_WINDOW_DAYS}
                    max={MAX_URGENCY_WINDOW_DAYS}
                    value={priorityProfile.urgencyWindowDays}
                    onChange={(event) =>
                      updatePriorityNumber('urgencyWindowDays', event.target.value)
                    }
                    disabled={priorityUpdateMutation.isPending}
                    className="tabular-nums"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="priority-history-cap">
                    <Trans>Late filing cap</Trans>
                    <ConceptHelp concept="lateFilingCap" />
                  </FieldLabel>
                  <Input
                    id="priority-history-cap"
                    type="number"
                    min={MIN_HISTORY_CAP_COUNT}
                    max={MAX_HISTORY_CAP_COUNT}
                    value={priorityProfile.historyCapCount}
                    onChange={(event) =>
                      updatePriorityNumber('historyCapCount', event.target.value)
                    }
                    disabled={priorityUpdateMutation.isPending}
                    className="tabular-nums"
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-text-tertiary">
                  <Trans>Preview recalculates open deadlines without saving changes.</Trans>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetPriorityProfile}
                    disabled={priorityUpdateMutation.isPending}
                  >
                    <RotateCcwIcon className="size-4" aria-hidden />
                    <Trans>Reset to default</Trans>
                  </Button>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={calculatePriorityPreview}
                            disabled={
                              !priorityValid ||
                              previewMutation.isPending ||
                              Boolean(previewDisabledReason)
                            }
                          >
                            {previewMutation.isPending ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                            ) : (
                              <CalculatorIcon className="size-4" aria-hidden />
                            )}
                            {previewMutation.isPending ? (
                              <Trans>Calculating…</Trans>
                            ) : (
                              <Trans>Calculate preview</Trans>
                            )}
                          </Button>
                        </span>
                      }
                    />
                    {previewDisabledReason ? (
                      <TooltipContent>{previewDisabledReason}</TooltipContent>
                    ) : null}
                  </Tooltip>
                  <Button
                    type="button"
                    onClick={savePriorityProfile}
                    disabled={
                      !priorityValid ||
                      !priorityDirty ||
                      !internalDeadlineOffsetDaysValid ||
                      priorityUpdateMutation.isPending
                    }
                  >
                    {priorityUpdateMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        <Trans>Saving…</Trans>
                      </>
                    ) : (
                      <Trans>Save Smart Priority</Trans>
                    )}
                  </Button>
                </div>
              </div>

              {priorityPreview ? (
                <div className="grid gap-4">
                  {/* KPI strip (Pencil H1YSCd) — three at-a-glance figures
                      derived from the live preview. Responsive 1→3 cols. */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <PriorityKpiTile
                      icon={<UsersIcon className="size-4" aria-hidden />}
                      label={t`Top-ranked clients`}
                      value={topRankedClientCount}
                      hint={t`Clients with the most due-soon weight`}
                    />
                    <PriorityKpiTile
                      icon={<GaugeIcon className="size-4" aria-hidden />}
                      label={t`Avg score`}
                      value={avgPreviewScore ?? 0}
                      hint={t`Across the previewed queue`}
                    />
                    <PriorityKpiTile
                      icon={<CircleAlertIcon className="size-4" aria-hidden />}
                      label={t`Needs review`}
                      value={needsReviewCount}
                      hint={t`Deadlines whose rank shifts > 5 places`}
                    />
                  </div>
                  <PriorityPreviewTable
                    preview={priorityPreview}
                    factorLabels={priorityFactorLabels}
                  />
                </div>
              ) : null}

              {/* Unsaved-changes footer (Pencil H1YSCd): mirrors the
                  canvas action bar — surfaces the reorder impact and the
                  same Reset / Save affordances when weights are dirty. */}
              {priorityDirty ? (
                <div className="flex flex-col gap-3 rounded-lg border border-divider-regular bg-background-section px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                    <CircleAlertIcon className="size-3.5 shrink-0 text-text-warning" aria-hidden />
                    {priorityPreview ? (
                      <Trans>Unsaved changes · {reorderCount} deadlines will reorder</Trans>
                    ) : (
                      <Trans>Unsaved changes · calculate a preview to see the impact</Trans>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetPriorityProfile}
                      disabled={priorityUpdateMutation.isPending}
                    >
                      <RotateCcwIcon className="size-4" aria-hidden />
                      <Trans>Revert</Trans>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={savePriorityProfile}
                      disabled={
                        !priorityValid ||
                        !priorityDirty ||
                        !internalDeadlineOffsetDaysValid ||
                        priorityUpdateMutation.isPending
                      }
                    >
                      {priorityUpdateMutation.isPending ? (
                        <Trans>Saving…</Trans>
                      ) : (
                        <Trans>Save weights</Trans>
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </PermissionObscuredContent>
        </CardContent>
      </Card>

      {/* P1: one-time owner-only backfill for legacy filed returns. */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Enter filed returns into the signature loop</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              A one-time pass for returns marked filed before e-signature tracking existed. It moves
              eligible filed returns (those needing a Form 8879 signature) into “Awaiting signature”
              so you can track and remind. Safe to run more than once.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => backfillSignatureLoopMutation.mutate({})}
            disabled={!canBackfillSignatureLoop || backfillSignatureLoopMutation.isPending}
            title={
              canBackfillSignatureLoop ? undefined : t`Running the backfill requires owner access.`
            }
          >
            <Trans>Run backfill</Trans>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Delete practice</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              This removes the active practice from your account. Audit history stays retained for
              compliance.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button
            type="button"
            variant="destructive-secondary"
            onClick={() => setConfirmDelete(true)}
            disabled={!canDeletePractice || deleteMutation.isPending}
            // The Delete button is disabled for any non-owner role; the
            // `title` (same pattern as the dashboard Import button)
            // surfaces "owner permission required" on hover so the
            // disabled state isn't silent. The card title + description
            // already explain WHAT the action does; this fills in WHO
            // can do it.
            title={canDeletePractice ? undefined : t`Deleting the practice requires owner access.`}
            aria-label={canDeletePractice ? undefined : t`Delete practice (owner access required)`}
          >
            <Trash2Icon className="size-4" aria-hidden />
            <Trans>Delete practice</Trans>
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          setConfirmDelete(open)
          // Reset the typed-confirm input every time the dialog closes
          // so a re-open never starts pre-confirmed.
          if (!open) setDeleteConfirmName('')
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Delete this practice?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                The practice will be removed from your account. Audit history stays retained for
                compliance. Contact support if you need it restored later.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Typed-name confirm: the user must type the exact practice
              name before the destructive action enables. The expected
              name is displayed verbatim so the user can copy-confirm
              rather than guess casing/spacing. */}
          <Field>
            <FieldLabel htmlFor="delete-practice-confirm">
              <Trans>
                Type <span className="font-mono text-text-primary">{firm.name}</span> to confirm
              </Trans>
            </FieldLabel>
            <Input
              id="delete-practice-confirm"
              value={deleteConfirmName}
              onChange={(event) => setDeleteConfirmName(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={deleteMutation.isPending}
              placeholder={firm.name}
            />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              onClick={() => deleteMutation.mutate(undefined)}
              disabled={
                !canDeletePractice ||
                deleteMutation.isPending ||
                deleteConfirmName.trim() !== firm.name
              }
            >
              <Trans>Delete practice</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// KPI tile for the Smart Priority preview strip (Pencil H1YSCd): a
// tone-tinted icon chip, caps label, large value, and a one-line hint.
function PriorityKpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="grid gap-1.5 rounded-xl border border-divider-regular bg-background-default px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-state-accent-hover text-text-accent">
          {icon}
        </span>
        <span className="text-caption-xs font-bold tracking-wide text-text-muted uppercase">
          {label}
        </span>
      </div>
      <span className="text-3xl font-semibold tabular-nums text-text-primary">{value}</span>
      <span className="text-xs leading-4 text-text-tertiary">{hint}</span>
    </div>
  )
}

// Maps each Smart Priority factor to the closest Progress tone for the
// "Driver" mini bar. Progress only ships accent/warning/destructive, so
// readiness reuses accent (the canvas green has no token equivalent).
const PRIORITY_DRIVER_TONE: Record<SmartPriorityFactorKey, 'accent' | 'warning' | 'destructive'> = {
  urgency: 'accent',
  importance: 'warning',
  history: 'destructive',
  readiness: 'accent',
}

function PriorityPreviewTable({
  preview,
  factorLabels,
}: {
  preview: FirmSmartPriorityPreviewOutput
  factorLabels: Record<SmartPriorityFactorKey, string>
}) {
  if (preview.rows.length === 0) {
    return (
      <div className="rounded-lg border border-divider-subtle bg-background-section px-3 py-2 text-sm text-text-secondary">
        <Trans>No open deadlines available for preview.</Trans>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <div className="text-xs text-text-tertiary">
        <Trans>Preview impact as of {preview.asOfDate}</Trans>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Trans>Deadline · Client</Trans>
            </TableHead>
            <TableHead className="text-right">
              <Trans>Current</Trans>
            </TableHead>
            <TableHead className="text-right">
              <Trans>New</Trans>
            </TableHead>
            <TableHead className="text-right">
              <Trans>Δ</Trans>
            </TableHead>
            <TableHead>
              <Trans>Driver</Trans>
            </TableHead>
            <TableHead className="text-right">
              <span className="sr-only">
                <Trans>Explain rank</Trans>
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.rows.map((row) => {
            const changed = row.rankDelta !== null && row.rankDelta !== 0
            const driverPct =
              row.topDriver && row.previewScore > 0
                ? Math.min(100, Math.round((row.topDriver.contribution / row.previewScore) * 100))
                : 0
            return (
              <TableRow key={row.obligationId}>
                <TableCell>
                  <div className="grid gap-0.5">
                    <span className="font-medium text-text-primary">
                      <TaxCodeLabel code={row.taxType} /> — {row.clientName}
                    </span>
                    {/* Route ISO dates through the canonical formatDate
                        helper. */}
                    <span className="text-xs text-text-tertiary">
                      {formatDate(row.currentDueDate)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-text-secondary">
                  {row.currentRank === null ? '—' : `#${row.currentRank}`}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-text-primary">
                  #{row.previewRank}
                </TableCell>
                <TableCell className="text-right">
                  {!changed ? (
                    <span className="inline-flex items-center justify-end gap-1 tabular-nums text-text-muted">
                      <MinusIcon className="size-3" aria-hidden />—
                    </span>
                  ) : row.rankDelta! > 0 ? (
                    <span className="inline-flex items-center justify-end gap-1 font-semibold tabular-nums text-text-success">
                      <ArrowUpIcon className="size-3" aria-hidden />
                      {formatSigned(row.rankDelta!)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-end gap-1 font-semibold tabular-nums text-text-destructive">
                      <ArrowDownIcon className="size-3" aria-hidden />
                      {row.rankDelta}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {changed && row.topDriver ? (
                    <div className="grid max-w-[140px] gap-1">
                      <span className="text-xs font-medium text-text-secondary">
                        {factorLabels[row.topDriver.factor]}
                      </span>
                      <Progress
                        value={driverPct}
                        size="hairline"
                        tone={PRIORITY_DRIVER_TONE[row.topDriver.factor]}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted">
                      <Trans>No change</Trans>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <TextLink
                    variant="accent"
                    render={<Link to={`/deadlines/${row.obligationId}`} />}
                    className="inline-flex items-center gap-1 text-xs"
                  >
                    <Trans>Why this rank?</Trans>
                    <ArrowUpRightIcon className="size-3" aria-hidden />
                  </TextLink>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function SmartPriorityRedactedContent() {
  return (
    <div className="grid gap-4 p-4">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {PRIORITY_FACTOR_KEYS.map((key) => (
            <div key={key} className="grid gap-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="grid gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-page-narrow flex-col gap-4 px-4 py-6 md:px-6">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-52 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  )
}
