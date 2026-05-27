import { Trans, useLingui } from '@lingui/react/macro'
import { AlertTriangleIcon, CheckCircle2Icon, EllipsisVerticalIcon, Trash2Icon } from 'lucide-react'

import type {
  ClientReadinessResponsePublic,
  ReadinessDocumentChecklistItemPublic,
} from '@duedatehq/contracts'
import { Badge } from '@duedatehq/ui/components/ui/badge'
import { Checkbox } from '@duedatehq/ui/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@duedatehq/ui/components/ui/dropdown-menu'

import { cn, formatDate } from '@/lib/utils'

// One persisted document row in the readiness checklist. The checkbox is
// the CPA-owned source of truth; client portal responses only annotate
// and can move the same item into review/missing/received states.
export function ChecklistItemRow({
  item,
  response,
  correctionMode = false,
  pending,
  selected,
  selectionDisabled,
  onToggleSelect,
  onStatusChange,
  onLabelCommit: _onLabelCommit,
  onDescriptionCommit: _onDescriptionCommit,
  onNoteCommit: _onNoteCommit,
  onRemove,
}: {
  item: ReadinessDocumentChecklistItemPublic
  response: ClientReadinessResponsePublic | null
  correctionMode?: boolean
  pending: boolean
  // Multi-select model (2026-05-23). The leading Checkbox tracks
  // selection (for the floating "Mark client docs received" batch
  // action), NOT the item's received-state. Status is communicated
  // via the small inline status chip on received / needs-review
  // items; mutating status one-at-a-time happens via the row body
  // click-through (future: dedicated inline editor) or the floating
  // bar's batch action.
  selected: boolean
  selectionDisabled: boolean
  onToggleSelect: () => void
  onStatusChange: (status: ReadinessDocumentChecklistItemPublic['status']) => void
  // Inline label/description/note editing was wired through these
  // callbacks. The new card visual is read-only (matches Figma) so
  // they're accepted but unused here; the underscore prefix silences
  // eslint while we keep the prop contract stable for the call site.
  // Restore the inline editor in a follow-up by re-introducing a
  // collapsible editor section toggled by a small overflow menu.
  onLabelCommit: (label: string) => void
  onDescriptionCommit: (description: string) => void
  onNoteCommit: (note: string) => void
  onRemove: () => void
}) {
  const { t } = useLingui()
  const received = item.status === 'received'
  const needsReview = item.status === 'needs_review'
  const responseBadge = response
    ? (() => {
        switch (response.status) {
          case 'ready':
            return { variant: 'success' as const, label: t`Client ready` }
          case 'not_yet':
            return { variant: 'warning' as const, label: t`Not yet` }
          case 'need_help':
            return { variant: 'destructive' as const, label: t`Needs help` }
        }
        return { variant: 'outline' as const, label: response.status }
      })()
    : null
  // 2026-05-23 (drawer fidelity pass): card visual rebuilt against
  // the Figma target. Per-row chrome stripped — no Mark received
  // button, no chevron expand, no italic info-icon description.
  // The card now reads as a clean checkbox + title + description
  // block; status is a small chip on the right when non-default;
  // selection state shows a strong accent border + filled checkbox.
  // The floating action bar at the bottom of the drawer owns the
  // mark-received affordance (single-item case: select one, click
  // bar). Edit/delete moved behind an overflow menu (… on hover).
  return (
    <div
      className={cn(
        'group/checklist-item rounded-md border bg-background-default p-3 transition-colors',
        selected
          ? 'border-accent-default ring-2 ring-accent-default/20'
          : 'border-divider-subtle hover:border-divider-regular',
        received && !selected && 'bg-background-subtle',
        selectionDisabled && 'border-divider-regular bg-background-subtle opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          aria-label={
            selectionDisabled
              ? t`Document ${item.label} already received`
              : selected
                ? t`Deselect document ${item.label}`
                : t`Select document ${item.label} for batch action`
          }
          checked={selected}
          disabled={pending || selectionDisabled}
          onCheckedChange={onToggleSelect}
          className={cn('mt-0.5 shrink-0', selectionDisabled && 'opacity-50 grayscale')}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-medium leading-tight',
                received ? 'text-text-secondary' : 'text-text-primary',
              )}
            >
              {item.label}
            </span>
            {/* Status chip — sits inline with the title on the right
                so received / needs-review state is visible at a
                glance without a per-row action button. Default
                (missing) shows nothing; the absence is the signal. */}
            {received ? (
              <Badge variant="success" className="text-caption-xs uppercase tracking-wide">
                <CheckCircle2Icon className="size-3" aria-hidden />
                <Trans>Received</Trans>
              </Badge>
            ) : needsReview ? (
              <Badge variant="destructive" className="text-caption-xs uppercase tracking-wide">
                <AlertTriangleIcon className="size-3" aria-hidden />
                {correctionMode ? <Trans>Needs correction</Trans> : <Trans>Needs review</Trans>}
              </Badge>
            ) : null}
            {responseBadge ? (
              <Badge
                variant={responseBadge.variant}
                className="text-caption-xs uppercase tracking-wide"
              >
                {responseBadge.label}
              </Badge>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-1 text-xs leading-snug text-text-tertiary">{item.description}</p>
          ) : null}
          {response?.note ? (
            <p className="mt-1.5 rounded-sm bg-background-section px-2 py-1 text-xs text-text-secondary">
              <Trans>Client note</Trans>: {response.note}
              {response.etaDate ? (
                <>
                  {' '}
                  · <Trans>ETA {formatDate(response.etaDate)}</Trans>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        {/* Overflow menu — accessible per-row delete + mark-needs-
            review without exposing them as chrome on every card.
            Renders only on hover/focus to keep the default state
            calm (matches the Figma's clean card surface). */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={t`More actions for ${item.label}`}
                className="shrink-0 rounded-md p-1 text-text-tertiary opacity-0 outline-none transition-opacity hover:bg-state-base-hover hover:text-text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-state-accent-active-alt group-hover/checklist-item:opacity-100"
                onClick={(event) => event.stopPropagation()}
              >
                <EllipsisVerticalIcon className="size-4" aria-hidden />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[11rem] whitespace-nowrap">
            {!needsReview ? (
              <DropdownMenuItem onClick={() => onStatusChange('needs_review')} disabled={pending}>
                <AlertTriangleIcon className="size-4" aria-hidden />
                <span>
                  {correctionMode ? (
                    <Trans>Mark needs correction</Trans>
                  ) : (
                    <Trans>Mark needs review</Trans>
                  )}
                </span>
              </DropdownMenuItem>
            ) : null}
            {received ? (
              <DropdownMenuItem onClick={() => onStatusChange('missing')} disabled={pending}>
                <span>
                  <Trans>Mark not received</Trans>
                </span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onRemove} variant="destructive">
              <Trash2Icon className="size-4" aria-hidden />
              <span>
                <Trans>Remove</Trans>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
