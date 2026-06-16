import { Trans, useLingui } from '@lingui/react/macro'
import { PencilLineIcon } from 'lucide-react'

import type { ClientPublic } from '@duedatehq/contracts'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `<ClientNotesStrip>` — inline preview of `client.notes` shown
 * above the alerts band on `/clients/[id]`.
 *
 * ## Why a strip (not a tab, not a slide-in alone)
 *
 * Notes is the only piece of content on this page where the read
 * frequency vastly exceeds the write frequency, AND it's persistent
 * context that anyone interacting with this client should glance at.
 * Three of the four personas (Sarah · Avery · partner) hit it
 * read-first; only Jules (coordinator) is write-first.
 *
 * Burying it behind a slide-in optimized for the minority (write)
 * pattern. The strip flips the default: notes are visible the moment
 * the page loads, no click required. Edit stays one click away via
 * the trailing affordance.
 *
 * ## Behavior
 *
 * - **When notes exist** → renders the strip (icon · first 2 lines ·
 *   Edit affordance). Click anywhere on the strip OR on the Edit
 *   button opens the same slide-in panel the empty-state header
 *   button triggers.
 * - **When notes are empty** → returns null. No chrome, no empty
 *   state — the slide-in's own EmptyState handles the no-notes
 *   experience when the user *intends* to add one. The empty-state
 *   "Add notes" button lives in the page header's actions cluster
 *   so the affordance stays discoverable.
 * - **Read-only viewer** → strip still renders, but the Edit
 *   affordance is suppressed. The whole strip remains clickable
 *   (opens the slide-in in read-only mode for the fuller view).
 *
 * ## Visual register
 *
 * Uses `<Card tone="muted" radius="md" size="xs">` from the design
 * system — quiet, neutral surface that reads as "context belonging
 * to this client" rather than "a status announcement." Distinct
 * from the alerts band below (which carries `tone="destructive"`-
 * adjacent signals) and from the Card chrome on individual tab
 * bodies (default tone, default radius).
 */
export function ClientNotesStrip({
  client,
  canWrite,
  onOpenEditor,
}: {
  client: ClientPublic
  /** Suppresses the Edit affordance when false; strip stays clickable. */
  canWrite: boolean
  /** Opens the controlled `<ClientNotesPanel>` slide-in. */
  onOpenEditor: () => void
}) {
  const { t } = useLingui()
  const notes = client.notes?.trim() ?? ''
  if (notes.length === 0) return null

  return (
    // Banded rail card (Yuqi "band EVERY section"): a thin light header band
    // ("Notes") + the note body, matching the detail-section band. Whole card is
    // the button that opens the slide-in editor.
    <div
      className={cn(
        'group/card flex flex-col overflow-hidden rounded-xl border border-divider-subtle bg-background-default',
        'cursor-pointer transition-colors hover:border-state-accent-active-alt hover:bg-state-base-hover',
        'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt focus-visible:outline-none',
      )}
      role="button"
      tabIndex={0}
      onClick={onOpenEditor}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenEditor()
        }
      }}
      aria-label={t`Open notes for ${client.name}`}
    >
      <header className="flex min-h-8 items-center justify-between gap-2 border-b border-divider-subtle bg-background-subtle px-5 py-1.5">
        <h3 className="text-base font-semibold text-text-primary">
          <Trans>Notes</Trans>
        </h3>
        {canWrite ? (
          // Decorative "editable" cue, NOT a separate control: the whole card
          // is the button (role="button" above, opens the same editor).
          <PencilLineIcon
            className="size-3.5 shrink-0 text-text-tertiary transition-colors group-hover/card:text-text-secondary"
            aria-hidden
          />
        ) : null}
      </header>
      <p className="line-clamp-3 px-5 py-4 text-sm whitespace-pre-wrap text-text-secondary">
        {notes}
      </p>
    </div>
  )
}
