import { useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlertCircleIcon,
  Building2Icon,
  CalculatorIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
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
import { Input } from '@duedatehq/ui/components/ui/input'
import { Label } from '@duedatehq/ui/components/ui/label'
import { Skeleton } from '@duedatehq/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@duedatehq/ui/components/ui/table'
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
          rpcErrorMessage(err) ??
          t`Check your network and try again. If this keeps happening, contact support.`
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
          rpcErrorMessage(err) ??
          t`Check your network and try again. If this keeps happening, contact support.`
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
          rpcErrorMessage(err) ??
          t`Check your network and try again. If this keeps happening, contact support.`
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

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      const message = t`Please enter at least 2 characters.`
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

  function updatePriorityWeight(key: SmartPriorityFactorKey, value: string) {
    const weight = parseWholeNumber(value)
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
  const previewDisabledReason =
    firm.openObligationCount === 0 ? t`No open deadlines available for preview.` : null
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

  return (
    // 2026-05-26 (86th pass, audit §16.1 P1): migrated custom
    // breadcrumb + header block to canonical `<PageHeader>`. The
    // brand-tinted Building2 icon stays inside the title prop as a
    // leading flourish; the role badge moves to the `actions` slot.
    // The firm-summary subline keeps its `role="note"` so screen
    // readers announce it as a complementary annotation — exposed
    // via `aria-label` on the surrounding region.
    <div
      role="region"
      aria-label={firmSummaryLabel}
      className="mx-auto flex w-full max-w-page-narrow flex-col gap-4 px-4 py-6 md:px-6"
    >
      <PageHeader
        breadcrumbs={[{ label: t`Settings`, to: '/settings' }, { label: t`Practice profile` }]}
        title={
          <span className="inline-flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-primary text-text-inverted"
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
          <Badge variant="outline" className="font-mono tabular-nums text-xs">
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
          <form onSubmit={handleSubmit} className="grid gap-5">
            {!canEditPractice ? (
              <PermissionInlineNotice permission="firm.update" currentRole={firm.role}>
                <Trans>Only the practice owner can change the practice name or timezone.</Trans>
              </PermissionInlineNotice>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="firm-name">
                <Trans>Practice name</Trans>
              </Label>
              <Input
                id="firm-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="organization"
                disabled={!canEditPractice || updateMutation.isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="firm-timezone">
                <Trans>Timezone</Trans>
              </Label>
              <FirmTimezoneSelect
                id="firm-timezone"
                value={timezone}
                onValueChange={setTimezone}
                disabled={!canEditPractice || updateMutation.isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="firm-internal-deadline-offset">
                <Trans>Internal deadline</Trans>
              </Label>
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
                className="font-mono tabular-nums"
              />
              <p className="text-xs leading-5 text-text-tertiary">
                <Trans>
                  DueDateHQ shows work as due this many days before each statutory base deadline.
                  Changing this recalculates current deadline dates.
                </Trans>
              </p>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-text-destructive">
                {error}
              </p>
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
            <div className="grid gap-5">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  {/* 2026-05-25 (info-icon audit): dropped the
                      duplicate `smartPriority` popover — the
                      CardTitle 23 lines above already carries it
                      via ConceptLabel. One explainer per
                      concept per screen. */}
                  <div className="flex items-center gap-1.5">
                    <Label>
                      <Trans>Factor weights</Trans>
                    </Label>
                  </div>
                  <span
                    className={
                      weightTotal === 100
                        ? 'font-mono text-xs tabular-nums text-text-secondary'
                        : 'font-mono text-xs tabular-nums text-text-destructive'
                    }
                  >
                    <Trans>Total</Trans> {weightTotal}%
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  {PRIORITY_FACTOR_KEYS.map((key) => (
                    <div key={key} className="grid gap-1.5">
                      <Label htmlFor={`priority-weight-${key}`}>{priorityFactorLabels[key]}</Label>
                      <Input
                        id={`priority-weight-${key}`}
                        type="number"
                        min={0}
                        max={100}
                        value={priorityProfile.weights[key]}
                        onChange={(event) => updatePriorityWeight(key, event.target.value)}
                        disabled={priorityUpdateMutation.isPending}
                        className="font-mono tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="priority-urgency-window">
                      <Trans>Urgency window</Trans>
                    </Label>
                    <ConceptHelp concept="urgencyWindow" />
                  </div>
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
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="grid gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="priority-history-cap">
                      <Trans>Late filing cap</Trans>
                    </Label>
                    <ConceptHelp concept="lateFilingCap" />
                  </div>
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
                    className="font-mono tabular-nums"
                  />
                </div>
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
                            <CalculatorIcon className="size-4" aria-hidden />
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
                      <Trans>Saving…</Trans>
                    ) : (
                      <Trans>Save Smart Priority</Trans>
                    )}
                  </Button>
                </div>
              </div>

              {priorityPreview ? <PriorityPreviewTable preview={priorityPreview} /> : null}
            </div>
          </PermissionObscuredContent>
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
          >
            <Trash2Icon className="size-4" aria-hidden />
            <Trans>Delete practice</Trans>
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              onClick={() => deleteMutation.mutate(undefined)}
              disabled={!canDeletePractice || deleteMutation.isPending}
            >
              <Trans>Delete practice</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function PriorityPreviewTable({ preview }: { preview: FirmSmartPriorityPreviewOutput }) {
  if (preview.rows.length === 0) {
    return (
      <div className="rounded-md border border-divider-subtle bg-background-section px-3 py-2 text-sm text-text-secondary">
        <Trans>No open deadlines available for preview.</Trans>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <div className="text-xs text-text-tertiary">
        <Trans>Preview as of {preview.asOfDate}</Trans>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Trans>Deadline</Trans>
            </TableHead>
            <TableHead>
              <Trans>Due</Trans>
            </TableHead>
            <TableHead className="text-right">
              <Trans>Score</Trans>
            </TableHead>
            <TableHead className="text-right">
              <Trans>Rank</Trans>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.rows.map((row) => (
            <TableRow key={row.obligationId}>
              <TableCell>
                <div className="grid gap-0.5">
                  <span className="font-medium text-text-primary">{row.clientName}</span>
                  <span className="text-text-tertiary">
                    <TaxCodeLabel code={row.taxType} />
                  </span>
                </div>
              </TableCell>
              {/* 2026-05-25 (Yuqi Today #9 date format audit): was
                  rendering raw ISO `row.currentDueDate` while every
                  other table in the app routes through `formatDate`.
                  Now uses the canonical helper so the Smart Priority
                  preview table reads at the same date density as
                  /deadlines, /clients, audit log, etc. */}
              <TableCell className="font-mono tabular-nums text-text-secondary">
                {formatDate(row.currentDueDate)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {row.previewScore.toFixed(1)}
                <span className="ml-2 text-text-tertiary">({formatSigned(row.scoreDelta)})</span>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                #{row.previewRank}
                {row.rankDelta === null ? null : (
                  <span className="ml-2 text-text-tertiary">({formatSigned(row.rankDelta)})</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SmartPriorityRedactedContent() {
  return (
    <div className="grid gap-5 p-4">
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
