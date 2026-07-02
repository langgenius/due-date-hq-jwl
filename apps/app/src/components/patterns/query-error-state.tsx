import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { CircleAlertIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { cn } from '@duedatehq/ui/lib/utils'

import { rpcErrorMessage } from '@/lib/rpc-error'

/**
 * QueryErrorState — the shared "the load failed" surface (ux-flow audit
 * 2026-07-02, theme S1: query failure used to masquerade as an infinite
 * skeleton, a blank pane, or confident zeros on ≥6 surfaces).
 *
 * One quiet block: warning glyph + "Couldn't load {what}" + the server's
 * message (when it's short enough to help) + a Retry wired straight to the
 * query's `refetch`. The EMPTY-state chrome stays on `EmptyState`; this is
 * its failure sibling, so the two states can never be conflated again —
 * callers branch `isLoading` → skeleton, `isError` → this, then empty/content.
 *
 * Two sizes:
 *  - `block` (default): page/section surfaces (/deadlines table, /members,
 *    /audit events, /notifications inbox). Mirrors the default EmptyState's
 *    dashed-card chrome so the failure state sits in the same visual family.
 *  - `inline`: rails / strips / palettes (deadline navigator rail,
 *    jurisdiction rail, command palette) — frameless compact column that
 *    rests on the host surface (no card-in-card).
 *
 * Canon: clear-sections-not-boxes (one quiet frame, no nested boxes),
 * restrained-shadows (none), color budget (the destructive tone lives on the
 * glyph only — text stays neutral), lingui copy throughout.
 */
export function QueryErrorState({
  what,
  error,
  onRetry,
  retrying = false,
  size = 'block',
  frameless = false,
  className,
}: {
  /** Lower-case noun for the title — e.g. <Trans>deadlines</Trans>. */
  what: ReactNode
  /** The query's error — its message renders below the title when short. */
  error?: unknown
  /** Wire to the query's `refetch`. */
  onRetry: () => void
  /** Pass the query's `isFetching`/`isRefetching` so Retry can't double-fire. */
  retrying?: boolean
  size?: 'block' | 'inline'
  /**
   * Drops the dashed card frame (block only) for hosts that already carry a
   * border — e.g. a table cell or an already-bordered card body.
   */
  frameless?: boolean
  className?: string
}) {
  // Only surface the server's message when it actually helps: short,
  // human-readable text. Long stack-ish strings stay in the console.
  const rawMessage = rpcErrorMessage(error)
  const message = rawMessage && rawMessage.length <= 120 ? rawMessage : null
  const isInline = size === 'inline'

  return (
    <div
      role="alert"
      data-size={size}
      className={cn(
        'flex flex-col items-center text-center',
        isInline
          ? 'gap-2 px-4 py-8'
          : cn(
              'gap-3 rounded-lg px-6 py-10',
              !frameless && 'border border-dashed border-divider-regular bg-background-default',
            ),
        className,
      )}
    >
      <CircleAlertIcon
        className={cn('text-text-destructive', isInline ? 'size-4' : 'size-5')}
        aria-hidden
      />
      <p
        className={cn(
          isInline ? 'text-sm font-medium text-text-secondary' : 'text-sm font-semibold',
          !isInline && 'text-text-primary',
        )}
      >
        <Trans>Couldn't load {what}</Trans>
      </p>
      <p
        className={cn(
          'max-w-[42ch]',
          isInline ? 'text-xs text-text-tertiary' : 'text-description leading-5 text-text-secondary',
        )}
      >
        {message ?? <Trans>Try again in a moment. If it keeps failing, contact support.</Trans>}
      </p>
      {isInline ? (
        <TextLink
          variant="accent"
          size="sm"
          onClick={onRetry}
          className={cn('mt-1', retrying && 'pointer-events-none opacity-50')}
          aria-disabled={retrying || undefined}
        >
          <Trans>Retry</Trans>
        </TextLink>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={onRetry}
          disabled={retrying}
        >
          <Trans>Retry</Trans>
        </Button>
      )}
    </div>
  )
}
