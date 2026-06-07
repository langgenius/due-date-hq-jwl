import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { plural } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { parseTabular } from '@duedatehq/core/csv-parser'
import { normalizeTaxTypes } from '@duedatehq/core/normalize-dict'
import {
  inferTaxTypes,
  matrixApplicationModeForTaxTypes,
  type EntityType,
  type MatrixApplicationMode,
} from '@duedatehq/core/default-matrix'
import type {
  DuplicateHandling,
  MapperRunOutput,
  MappingRow,
  MatrixSelection,
  MigrationBatch,
  MigrationSource,
  NormalizationRow,
  ObligationQueueListInput,
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
import { Alert, AlertDescription, AlertTitle } from '@duedatehq/ui/components/ui/alert'
import { Button } from '@duedatehq/ui/components/ui/button'

import { rpcErrorMessage } from '@/lib/rpc-error'
import { orpc } from '@/lib/rpc'
import { formatRelativeTime } from '@/lib/utils'

import { canContinueNormalization } from './continue-rules'
import { ImportHistoryDrawer } from './ImportHistoryDrawer'
import { Step1Intake } from './Step1Intake'
import { Step2Mapping } from './Step2Mapping'
import { Step3Normalize } from './Step3Normalize'
import { Step4Preview } from './Step4Preview'
import { WizardRouteShell, WizardShell, type WizardTransitionState } from './WizardShell'
import {
  INITIAL_STATE,
  PRESET_TO_SOURCE,
  hasDiscardableWizardWork,
  wizardReducer,
  type StepIndex,
  type WizardState,
} from './state'
import type { MatrixApplicationView } from './matrix-view'
import { repairMappingRows, repairNormalizationRows } from './migration-summary-view-model'

interface WizardProps {
  open: boolean
  onClose: () => void
  variant?: 'dialog' | 'route'
  intro?: ReactNode | ((actions: { onSkip: () => void }) => ReactNode)
  /** When set, the wizard fetches this in-progress batch and resumes into it. */
  resumeBatchId?: string
}

type ObligationQueueCursor = NonNullable<ObligationQueueListInput['cursor']> | null
const OBLIGATION_QUEUE_PREFETCH_LIMIT = 50

/**
 * Migration Copilot Wizard — controlled modal mounted once at the app shell.
 *
 * The reducer holds UI state; server mutations go through oRPC TanStack Query
 * mutationOptions so loading, errors, and cache invalidation use one project pattern.
 *
 * The wizard auto-resets when `open` flips to false so the next entry starts
 * from a clean Step 1 instead of resuming a half-finished draft.
 */
export function Wizard({ open, onClose, variant = 'dialog', intro, resumeBatchId }: WizardProps) {
  const { i18n, t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE)
  const [pendingRevert, setPendingRevert] = useState<{
    batchId: string
    clientCount: number
    obligationCount: number
  } | null>(null)
  const [genesis, setGenesis] = useState<{
    clientCount: number
    obligationCount: number
  } | null>(null)
  // Step 4 re-import dedup choice; default 'skip' matches the server default.
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>('skip')
  // 2026-06-07 (Cluster 3 — design SLw8Q/dCUv7): the "Import history"
  // header button opens the existing drawer in-place over the wizard.
  const [importHistoryOpen, setImportHistoryOpen] = useState(false)
  // Guards one-time HYDRATE per resumed batch so user edits aren't clobbered.
  const hydratedBatchIdRef = useRef<string | null>(null)

  const invalidateMigration = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orpc.migration.key() })
  }, [queryClient])

  const preheatOperations = useCallback(() => {
    void queryClient.prefetchQuery(orpc.dashboard.load.queryOptions({ input: {} }))
    void queryClient.prefetchInfiniteQuery(
      orpc.obligations.list.infiniteOptions({
        initialPageParam: null as ObligationQueueCursor,
        input: (cursor) => ({
          cursor,
          limit: OBLIGATION_QUEUE_PREFETCH_LIMIT,
          sort: 'due_asc',
        }),
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }),
    )
  }, [queryClient])

  const cacheBatch = useCallback(
    (batch: MigrationBatch) => {
      queryClient.setQueryData(
        orpc.migration.getBatch.queryKey({ input: { batchId: batch.id } }),
        batch,
      )
      invalidateMigration()
    },
    [invalidateMigration, queryClient],
  )

  const createBatchMutation = useMutation(
    orpc.migration.createBatch.mutationOptions({
      onSuccess: cacheBatch,
    }),
  )
  const uploadRawMutation = useMutation(
    orpc.migration.uploadRaw.mutationOptions({
      onSuccess: invalidateMigration,
    }),
  )
  const runMapperMutation = useMutation(
    orpc.migration.runMapper.mutationOptions({
      onSuccess: invalidateMigration,
    }),
  )
  const confirmMappingMutation = useMutation(
    orpc.migration.confirmMapping.mutationOptions({
      onSuccess: invalidateMigration,
    }),
  )
  const runNormalizerMutation = useMutation(
    orpc.migration.runNormalizer.mutationOptions({
      onSuccess: invalidateMigration,
    }),
  )
  const confirmNormalizationMutation = useMutation(
    orpc.migration.confirmNormalization.mutationOptions({
      onSuccess: invalidateMigration,
    }),
  )
  const applyDefaultMatrixMutation = useMutation(
    orpc.migration.applyDefaultMatrix.mutationOptions({
      onSuccess: invalidateMigration,
    }),
  )
  const applyMutation = useMutation(
    orpc.migration.apply.mutationOptions({
      onSuccess: () => {
        invalidateMigration()
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
        preheatOperations()
      },
    }),
  )
  const revertMutation = useMutation(
    orpc.migration.revert.mutationOptions({
      onSuccess: () => {
        invalidateMigration()
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.firms.key() })
        queryClient.removeQueries({ queryKey: orpc.dashboard.load.key() })
        queryClient.removeQueries({ queryKey: orpc.obligations.list.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.obligations.list.key() })
      },
    }),
  )
  const listErrorsMutation = useMutation(
    orpc.migration.listErrors.mutationOptions({
      // Best-effort population of state.errors so Step 2 can show
      // mapping-stage rows immediately and Step 4 can show all rows
      // without re-fetching. Failures are silent — the dryRun summary
      // already carries the same data as a fallback.
      onSuccess: (out) => {
        dispatch({ type: 'ERRORS_SET', errors: out.errors })
      },
    }),
  )

  const dryRunMutation = useMutation(
    orpc.migration.dryRun.mutationOptions({
      onSuccess: invalidateMigration,
    }),
  )

  // Resume: fetch the in-progress batch when the wizard opens with a resumeBatchId.
  const resumeQuery = useQuery(
    orpc.migration.getBatch.queryOptions({
      input: { batchId: resumeBatchId ?? '' },
      enabled: Boolean(resumeBatchId) && open,
    }),
  )

  // Resume-on-open: when the wizard opens fresh (no explicit resume target) and
  // nothing has been started yet, surface the firm's in-progress draft so the
  // user can pick it back up instead of digging through Import history.
  // (`getResumableImport` was previously unused.)
  const [resumeDismissed, setResumeDismissed] = useState(false)
  const resumableImportQuery = useQuery(
    orpc.migration.getResumableImport.queryOptions({
      input: {},
      enabled: open && !resumeBatchId && state.step === 1 && state.batchId === null,
    }),
  )
  const resumableImport =
    !resumeDismissed && state.batchId === null ? (resumableImportQuery.data ?? null) : null

  const resetAndClose = useCallback(() => {
    dispatch({ type: 'RESET' })
    setDuplicateHandling('skip')
    hydratedBatchIdRef.current = null
    onClose()
  }, [onClose])

  // Hydrate the wizard from a resumed batch exactly once (ref-guarded so later
  // edits in the resumed session aren't overwritten by a refetch).
  useEffect(() => {
    if (!open || !resumeBatchId) return
    const batch = resumeQuery.data
    if (batch && hydratedBatchIdRef.current !== batch.id) {
      hydratedBatchIdRef.current = batch.id
      dispatch({ type: 'HYDRATE', batch })
    }
  }, [open, resumeBatchId, resumeQuery.data])

  const handleStep1Continue = useCallback(() => {
    const intake = state.intake
    if (!intake.rawText.trim() || intake.rowCount === 0) return

    dispatch({ type: 'INTAKE_SUBMIT_ERROR', error: null })
    const handleError = (err: unknown) => {
      const description =
        rpcErrorMessage(err) ??
        t`Check your network and try again. If this keeps happening, contact support.`
      dispatch({ type: 'INTAKE_SUBMIT_ERROR', error: description })
      toast.error(t`Couldn't start the import`, { description })
    }
    const handleMapperSuccess = (batchId: string) => (result: MapperRunOutput) => {
      dispatch({
        type: 'MAPPER_RESULT',
        rows: repairMappingRows(result.mappings, state.intake.rawText),
        fallback: result.meta?.fallback ?? null,
      })
      dispatch({ type: 'GO_TO_STEP', step: 2 })
      listErrorsMutation.mutate({ batchId, stage: 'mapping' })
    }

    const source: MigrationSource = intake.preset
      ? PRESET_TO_SOURCE[intake.preset]
      : intake.fileKind === 'xlsx'
        ? 'xlsx'
        : intake.fileKind === 'csv'
          ? 'csv'
          : 'paste'

    createBatchMutation.mutate(
      {
        source,
        presetUsed: intake.preset ?? null,
        rowCount: intake.rowCount,
      },
      {
        onError: handleError,
        onSuccess: (batch) => {
          dispatch({ type: 'BATCH_CREATED', batch })
          uploadRawMutation.mutate(
            {
              batchId: batch.id,
              fileName: intake.fileName ?? 'paste.txt',
              contentType:
                intake.contentType ??
                (intake.fileKind === 'tsv' ? 'text/tab-separated-values' : 'text/csv'),
              sizeBytes: intake.sizeBytes || intake.rawText.length,
              inline: {
                kind: intake.fileKind,
                text: intake.rawText,
                ...(intake.rawFileBase64 ? { rawBase64: intake.rawFileBase64 } : {}),
                ...(intake.sourceManifest ? { sourceManifest: intake.sourceManifest } : {}),
              },
            },
            {
              onError: handleError,
              onSuccess: () => {
                runMapperMutation.mutate(
                  { batchId: batch.id },
                  {
                    onError: handleError,
                    onSuccess: handleMapperSuccess(batch.id),
                  },
                )
              },
            },
          )
        },
      },
    )
  }, [
    createBatchMutation,
    listErrorsMutation,
    runMapperMutation,
    state.intake,
    t,
    uploadRawMutation,
  ])

  const handleStep2Continue = useCallback(() => {
    const batchId = state.batchId
    if (!batchId) return

    const handleError = (err: unknown) => {
      toast.error(t`Couldn't save mapping`, {
        description:
          rpcErrorMessage(err) ??
          t`Check your network and try again. If this keeps happening, contact support.`,
      })
    }

    confirmMappingMutation.mutate(
      {
        batchId,
        mappings: state.mapping.rows,
      },
      {
        onError: handleError,
        onSuccess: () => {
          dispatch({ type: 'NORMALIZE_LOADING' })
          runNormalizerMutation.mutate(
            { batchId },
            {
              onError: handleError,
              onSuccess: (normalized) => {
                dispatch({
                  type: 'NORMALIZE_RESULT',
                  rows: repairNormalizationRows(normalized.normalizations),
                })
                dispatch({ type: 'GO_TO_STEP', step: 3 })
              },
            },
          )
        },
      },
    )
  }, [confirmMappingMutation, runNormalizerMutation, state.batchId, state.mapping.rows, t])

  const handleStep2Rerun = useCallback(() => {
    const batchId = state.batchId
    if (!batchId) return

    dispatch({ type: 'MAPPER_LOADING' })
    runMapperMutation.mutate(
      { batchId },
      {
        onError: (err) => {
          dispatch({
            type: 'MAPPER_ERROR',
            message: rpcErrorMessage(err) ?? t`Re-run failed.`,
          })
        },
        onSuccess: (result) => {
          dispatch({
            type: 'MAPPER_RESULT',
            rows: repairMappingRows(result.mappings, state.intake.rawText),
            fallback: result.meta?.fallback ?? null,
          })
          listErrorsMutation.mutate({ batchId, stage: 'mapping' })
        },
      },
    )
  }, [listErrorsMutation, runMapperMutation, state.batchId, state.intake.rawText, t])

  const matrixPreview = useMemo<MatrixApplicationView[]>(
    () =>
      buildMatrixPreview({
        rawText: state.intake.rawText,
        mappings: state.mapping.rows,
        normalizations: state.normalize.rows,
        applyToAll: state.normalize.applyToAll,
      }),
    [state.intake.rawText, state.mapping.rows, state.normalize.applyToAll, state.normalize.rows],
  )

  const handleStep3Continue = useCallback(() => {
    const batchId = state.batchId
    if (!batchId) return

    const handleError = (err: unknown) => {
      toast.error(t`Couldn't apply tax type suggestions`, {
        description:
          rpcErrorMessage(err) ??
          t`Check your network and try again. If this keeps happening, contact support.`,
      })
    }

    confirmNormalizationMutation.mutate(
      {
        batchId,
        normalizations: repairNormalizationRows(state.normalize.rows),
      },
      {
        onError: handleError,
        onSuccess: () => {
          applyDefaultMatrixMutation.mutate(
            {
              batchId,
              matrixSelections: buildMatrixSelections(matrixPreview, state.normalize.applyToAll),
            },
            {
              onError: handleError,
              onSuccess: (summary) => {
                setDuplicateHandling('skip')
                dispatch({ type: 'DRY_RUN_RESULT', summary })
                dispatch({ type: 'GO_TO_STEP', step: 4 })
                listErrorsMutation.mutate({ batchId, stage: 'all' })
              },
            },
          )
        },
      },
    )
  }, [
    applyDefaultMatrixMutation,
    confirmNormalizationMutation,
    listErrorsMutation,
    matrixPreview,
    state.batchId,
    state.normalize.applyToAll,
    state.normalize.rows,
    t,
  ])

  const handleStep4Apply = useCallback(() => {
    const batchId = state.batchId
    if (!batchId) return

    applyMutation.mutate(
      { batchId, duplicateHandling },
      {
        onError: (err) => {
          toast.error(t`Couldn't import clients`, {
            description:
              rpcErrorMessage(err) ??
              t`Check your network and try again. If this keeps happening, contact support.`,
          })
        },
        onSuccess: (result) => {
          // 2026-05-25 (Wizard #40 — plural fix): "clients" and
          // "deadlines" were baked into the English template
          // and never pluralised. `plural()` macro extracts both
          // forms so n=1 renders "1 client" / "1 deadline".
          const clientPart = i18n._(
            plural(result.clientCount, { one: '# client', other: '# clients' }),
          )
          const obligationPart = i18n._(
            plural(result.obligationCount, {
              one: '# deadline',
              other: '# deadlines',
            }),
          )
          toast.success(t`Import complete`, {
            description: t`${clientPart}, ${obligationPart} created`,
            action: {
              label: t`Undo import`,
              onClick: () =>
                setPendingRevert({
                  batchId: result.batchId,
                  clientCount: result.clientCount,
                  obligationCount: result.obligationCount,
                }),
            },
          })
          window.dispatchEvent(
            new CustomEvent('migration.genesis.started', {
              detail: {
                batchId: result.batchId,
                clientCount: result.clientCount,
                obligationCount: result.obligationCount,
              },
            }),
          )
          setGenesis({
            clientCount: result.clientCount,
            obligationCount: result.obligationCount,
          })
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          window.setTimeout(
            () => {
              setGenesis(null)
              resetAndClose()
              void navigate('/')
              window.dispatchEvent(new CustomEvent('migration.genesis.completed'))
            },
            reduced ? 200 : 1200,
          )
        },
      },
    )
  }, [applyMutation, duplicateHandling, i18n, navigate, resetAndClose, state.batchId, t])

  const handleDuplicateHandlingChange = useCallback(
    (next: DuplicateHandling) => {
      setDuplicateHandling(next)
      const batchId = state.batchId
      if (!batchId) return
      dryRunMutation.mutate(
        { batchId, duplicateHandling: next },
        {
          onError: (err) => {
            toast.error(t`Couldn't update the import preview`, {
              description:
                rpcErrorMessage(err) ??
                t`Check your network and try again. If this keeps happening, contact support.`,
            })
          },
          onSuccess: (summary) => {
            dispatch({ type: 'DRY_RUN_RESULT', summary })
          },
        },
      )
    },
    [dryRunMutation, state.batchId, t],
  )

  const sampleByHeader = useMemo(() => {
    if (!state.intake.rawText) return {}
    try {
      const parsed = parseTabular(state.intake.rawText, { kind: 'paste' })
      const sample: Record<string, string> = {}
      const firstRow = parsed.rows[0] ?? []
      parsed.headers.forEach((h, i) => {
        sample[h] = (firstRow[i] ?? '').trim()
      })
      return sample
    } catch {
      return {}
    }
  }, [state.intake.rawText])

  // 2026-05-26 (Step 7 onboarding audit F6-27 considered):
  // step-specific labels ("Review mapping" / "Clean values" /
  // "Preview import") would preview the next phase, but
  // Wizard.test.tsx looks for a literal "Continue" button on
  // Steps 1-3. Documenting in the audit doc; copy change
  // belongs in a single commit that also updates tests.
  const continueLabel = useMemo(() => {
    if (state.step !== 4) return undefined
    return <Trans>Import &amp; Generate</Trans>
  }, [state.step])

  const canContinue = computeCanContinue(state)
  const onContinue =
    state.step === 1
      ? handleStep1Continue
      : state.step === 2
        ? handleStep2Continue
        : state.step === 3
          ? handleStep3Continue
          : handleStep4Apply
  const onBack =
    state.step > 1 ? () => dispatch({ type: 'GO_TO_STEP', step: prevStep(state.step) }) : undefined
  const isMutating =
    createBatchMutation.isPending ||
    uploadRawMutation.isPending ||
    runMapperMutation.isPending ||
    confirmMappingMutation.isPending ||
    runNormalizerMutation.isPending ||
    confirmNormalizationMutation.isPending ||
    applyDefaultMatrixMutation.isPending ||
    applyMutation.isPending ||
    revertMutation.isPending
  const transition = useMemo<WizardTransitionState | null>(() => {
    if (createBatchMutation.isPending) return { phase: 'intake', activeIndex: 0 }
    if (uploadRawMutation.isPending) return { phase: 'intake', activeIndex: 1 }
    if (runMapperMutation.isPending) {
      return state.step === 2
        ? { phase: 'rerun_mapper', activeIndex: 1 }
        : { phase: 'intake', activeIndex: 2 }
    }
    if (confirmMappingMutation.isPending) return { phase: 'mapping', activeIndex: 0 }
    if (runNormalizerMutation.isPending) return { phase: 'mapping', activeIndex: 2 }
    if (confirmNormalizationMutation.isPending) return { phase: 'normalize', activeIndex: 0 }
    if (applyDefaultMatrixMutation.isPending) return { phase: 'normalize', activeIndex: 1 }
    if (applyMutation.isPending) return { phase: 'import', activeIndex: 1 }
    return null
  }, [
    applyDefaultMatrixMutation.isPending,
    applyMutation.isPending,
    confirmMappingMutation.isPending,
    confirmNormalizationMutation.isPending,
    createBatchMutation.isPending,
    runMapperMutation.isPending,
    runNormalizerMutation.isPending,
    state.step,
    uploadRawMutation.isPending,
  ])

  const handleConfirmRevert = useCallback(() => {
    if (!pendingRevert) return
    revertMutation.mutate(
      { batchId: pendingRevert.batchId },
      {
        onError: (err) => {
          toast.error(t`Couldn't undo import`, {
            description:
              rpcErrorMessage(err) ??
              t`Check your network and try again. If this keeps happening, contact support.`,
          })
        },
        onSuccess: () => {
          // 2026-05-25 (Wizard #40 — plural fix): same shape as
          // the "Import complete" toast above — pluralise both
          // sides so n=1 reads "1 client · 1 deadline".
          const undoClientPart = i18n._(
            plural(pendingRevert.clientCount, { one: '# client', other: '# clients' }),
          )
          const undoObligationPart = i18n._(
            plural(pendingRevert.obligationCount, {
              one: '# deadline',
              other: '# deadlines',
            }),
          )
          toast.success(t`Import undone`, {
            description: t`${undoClientPart} · ${undoObligationPart} removed`,
          })
          setPendingRevert(null)
          void navigate('/deadlines')
        },
      },
    )
  }, [i18n, navigate, pendingRevert, revertMutation, t])

  const shellProps = {
    step: state.step,
    busy: isMutating || state.isBusy,
    transition,
    canContinue,
    continueLabel,
    onContinue,
    onBack,
    onClose: resetAndClose,
    confirmOnClose: hasDiscardableWizardWork(state),
    onOpenImportHistory: () => setImportHistoryOpen(true),
    children: (
      <>
        {state.step === 1 && resumableImport ? (
          <Alert className="mb-4">
            <AlertTitle>
              <Trans>Resume your in-progress import?</Trans>
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>
                <Trans>
                  {resumableImport.rawInputFileName ?? t`An import`} · {resumableImport.rowCount}{' '}
                  rows · started {formatRelativeTime(resumableImport.createdAt)}
                </Trans>
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => dispatch({ type: 'HYDRATE', batch: resumableImport })}
                >
                  <Trans>Resume</Trans>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setResumeDismissed(true)}>
                  <Trans>Start fresh</Trans>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {state.step === 1 ? (
          <Step1Intake
            density={variant === 'route' ? 'compact' : 'comfortable'}
            intake={state.intake}
            onText={(text, fileName, options) =>
              dispatch({ type: 'INTAKE_TEXT', text, fileName, ...options })
            }
            onPreset={(preset, source) =>
              dispatch({
                type: 'INTAKE_PRESET',
                preset,
                ...(source ? { source } : {}),
              })
            }
            onParsed={(args) => dispatch({ type: 'INTAKE_PARSED', ...args })}
            onParseError={(error) => dispatch({ type: 'INTAKE_PARSE_ERROR', error })}
          />
        ) : null}

        {state.step === 2 ? (
          <Step2Mapping
            mapping={state.mapping}
            sampleByHeader={sampleByHeader}
            errors={state.errors}
            onUserEdit={(rows: MappingRow[]) => dispatch({ type: 'MAPPER_USER_EDIT', rows })}
            onRerun={handleStep2Rerun}
          />
        ) : null}

        {state.step === 3 ? (
          <Step3Normalize
            normalize={state.normalize}
            matrix={matrixPreview}
            rawText={state.intake.rawText}
            mappings={state.mapping.rows}
            onToggleApplyToAll={(key, value) =>
              dispatch({ type: 'NORMALIZE_TOGGLE_APPLY_TO_ALL', key, value })
            }
          />
        ) : null}

        {state.step === 4 ? (
          <Step4Preview
            summary={state.dryRun.summary}
            duplicateHandling={duplicateHandling}
            onDuplicateHandlingChange={handleDuplicateHandlingChange}
            isUpdatingPreview={dryRunMutation.isPending}
          />
        ) : null}
      </>
    ),
  }

  return (
    <>
      {variant === 'route' ? (
        <WizardRouteShell intro={intro} {...shellProps} />
      ) : (
        <WizardShell open={open} {...shellProps} />
      )}

      <AlertDialog
        open={pendingRevert !== null}
        onOpenChange={(next) => {
          if (!next && !revertMutation.isPending) setPendingRevert(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Undo this import?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              <Trans>
                This removes the clients and deadlines created by this import. Other practice data
                will not be changed.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm" disabled={revertMutation.isPending}>
              <Trans>Keep import</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-primary"
              size="sm"
              disabled={revertMutation.isPending}
              onClick={handleConfirmRevert}
            >
              <Trans>Undo import</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <LiveGenesisOverlay genesis={genesis} />
      <ImportHistoryDrawer
        open={importHistoryOpen}
        onOpenChange={setImportHistoryOpen}
        onViewClient={(clientId) => {
          setImportHistoryOpen(false)
          resetAndClose()
          void navigate(`/clients/${clientId}`)
        }}
      />
    </>
  )
}

function LiveGenesisOverlay({
  genesis,
}: {
  genesis: { clientCount: number; obligationCount: number } | null
}) {
  if (!genesis) return null
  // z-[70]: documented escape hatch above the canonical z-50 overlay
  // tier (Dialog / Sheet / Toast). The wizard's own dialog is already
  // mounted at z-50; this genesis overlay sits *above* that so the
  // count + spinner stay visible while the wizard finalises.
  //
  // 2026-05-26 (Step 7 onboarding audit F6-24): hierarchy inverted —
  // the "wow" moment is seeing your clients land, deadlines are
  // downstream. Client count is the headline pulse; deadlines is
  // the supporting fact below. (Step 1-5 reaudit kept tabular-nums
  // sans `font-mono` on similar metric counters across the app.)
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-background-body/90 backdrop-blur-sm">
      <div className="grid gap-3 text-center">
        <div className="text-2xl font-semibold tabular-nums text-text-primary motion-safe:animate-pulse">
          {genesis.clientCount}
        </div>
        <div className="text-sm text-text-secondary">
          <Plural value={genesis.clientCount} one="client imported" other="clients imported" />
        </div>
        <div className="text-xs text-text-tertiary">
          <Plural
            value={genesis.obligationCount}
            one="# deadline generated"
            other="# deadlines generated"
          />
        </div>
      </div>
    </div>
  )
}

function computeCanContinue(state: WizardState): boolean {
  if (state.step === 1) {
    return state.intake.rowCount > 0 && state.intake.parseError === null
  }
  if (state.step === 2) {
    // At least one column must map to something other than IGNORE.
    return state.mapping.rows.some((r) => r.targetField !== 'IGNORE')
  }
  if (state.step === 3) {
    return canContinueNormalization()
  }
  if (state.step === 4) {
    return state.dryRun.summary !== null && state.dryRun.summary.clientsToCreate > 0
  }
  return false
}

interface BuildMatrixPreviewInput {
  rawText: string
  mappings: readonly MappingRow[]
  normalizations: readonly NormalizationRow[]
  applyToAll: Readonly<Record<string, boolean>>
}

function buildMatrixPreview(input: BuildMatrixPreviewInput): MatrixApplicationView[] {
  if (!input.rawText || input.normalizations.length === 0) return []

  // Re-parse the paste so we can group rows by (entity, state) pair.
  let parsed
  try {
    parsed = parseTabular(input.rawText, { kind: 'paste' })
  } catch {
    return []
  }

  const headerToIndex = new Map<string, number>()
  parsed.headers.forEach((h, i) => headerToIndex.set(h, i))
  const entityHeader = input.mappings.find(
    (r) => r.targetField === 'client.entity_type',
  )?.sourceHeader
  const stateHeader = input.mappings.find((r) => r.targetField === 'client.state')?.sourceHeader
  const filingStatesHeader = input.mappings.find(
    (r) => r.targetField === 'client.filing_states',
  )?.sourceHeader
  const entityIdx = entityHeader ? headerToIndex.get(entityHeader) : undefined
  const stateIdx = stateHeader ? headerToIndex.get(stateHeader) : undefined
  const filingStatesIdx = filingStatesHeader ? headerToIndex.get(filingStatesHeader) : undefined
  const taxHeader = input.mappings.find((r) => r.targetField === 'client.tax_types')?.sourceHeader
  const taxIdx = taxHeader ? headerToIndex.get(taxHeader) : undefined

  const entityMap = new Map<string, string | null>()
  const stateMap = new Map<string, string | null>()
  for (const r of input.normalizations) {
    if (r.field === 'entity_type') entityMap.set(r.rawValue, r.normalizedValue)
    else if (r.field === 'state') stateMap.set(r.rawValue, r.normalizedValue)
  }

  const counts = new Map<
    string,
    { entity: string; state: string; count: number; applicationMode: MatrixApplicationMode }
  >()
  for (const row of parsed.rows) {
    const rawTaxTypes = taxIdx !== undefined ? (row[taxIdx] ?? '').trim() : ''
    const explicitTaxTypes = normalizeTaxTypesForMatrix(input.normalizations, rawTaxTypes)

    const rawEntity = entityIdx !== undefined ? (row[entityIdx] ?? '').trim() : ''
    const rawState = stateIdx !== undefined ? (row[stateIdx] ?? '').trim() : ''
    const rawFilingStates = filingStatesIdx !== undefined ? (row[filingStatesIdx] ?? '').trim() : ''
    const entity = entityMap.get(rawEntity) ?? rawEntity.toLowerCase()
    if (!entity) continue
    const states = uniqueStrings([
      ...splitStateList(rawState, stateMap),
      ...splitStateList(rawFilingStates, stateMap),
    ])
    for (const normalizedState of states) {
      const applicationMode = matrixApplicationModeForTaxTypes(explicitTaxTypes, normalizedState)
      if (!applicationMode) continue
      const key = `${entity}::${normalizedState}`
      const existing = counts.get(key)
      if (existing) {
        existing.count += 1
        if (applicationMode === 'federal_return_type_plus_state') {
          existing.applicationMode = applicationMode
        }
      } else {
        counts.set(key, { entity, state: normalizedState, count: 1, applicationMode })
      }
    }
  }

  const out: MatrixApplicationView[] = []
  for (const cell of counts.values()) {
    if (!isEntityType(cell.entity)) continue
    const result = inferTaxTypes(cell.entity, cell.state)
    out.push({
      entityType: cell.entity,
      state: cell.state,
      taxTypes: [...result.taxTypes],
      needsReview: result.needsReview,
      confidence: result.confidence,
      matrixVersion: result.matrixVersion,
      enabled: input.applyToAll[`${cell.entity}::${cell.state}`] ?? true,
      appliedClientCount: cell.count,
      applicationMode: cell.applicationMode,
    })
  }
  return out
}

function normalizeTaxTypesForMatrix(
  normalizations: readonly NormalizationRow[],
  raw: string,
): string[] {
  if (!raw) return []
  const hit = normalizations.find((row) => row.field === 'tax_types' && row.rawValue === raw)
  if (hit?.normalizedValue) {
    try {
      const parsed = JSON.parse(hit.normalizedValue)
      if (Array.isArray(parsed)) {
        const normalizedValues = parsed.filter((item): item is string => typeof item === 'string')
        if (normalizedValues.length > 0) return normalizedValues
        return normalizeTaxTypes(raw)?.normalized ?? []
      }
    } catch {
      return [hit.normalizedValue]
    }
    return [hit.normalizedValue]
  }
  const dictionaryHit = normalizeTaxTypes(raw)
  if (dictionaryHit) return dictionaryHit.normalized
  return raw
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitStateList(raw: string, normalizations: ReadonlyMap<string, string | null>): string[] {
  if (!raw) return []
  return raw
    .split(/[;,|/]/)
    .map((token) => {
      const trimmed = token.trim()
      return normalizations.get(trimmed) ?? trimmed.toUpperCase()
    })
    .filter((state) => /^[A-Z]{2}$/.test(state))
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function buildMatrixSelections(
  matrix: readonly MatrixApplicationView[],
  applyToAll: Readonly<Record<string, boolean>>,
): MatrixSelection[] {
  return matrix.map((cell) => ({
    entityType: cell.entityType,
    state: cell.state,
    enabled: applyToAll[`${cell.entityType}::${cell.state}`] ?? true,
  }))
}

function isEntityType(value: string): value is EntityType {
  return (
    value === 'llc' ||
    value === 's_corp' ||
    value === 'partnership' ||
    value === 'c_corp' ||
    value === 'sole_prop' ||
    value === 'trust' ||
    value === 'individual' ||
    value === 'other'
  )
}

function prevStep(step: StepIndex): StepIndex {
  if (step === 4) return 3
  if (step === 3) return 2
  return 1
}
