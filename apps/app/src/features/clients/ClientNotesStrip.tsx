import { Trans, useLingui } from '@lingui/react/macro'
import { PencilLineIcon, ScrollTextIcon } from 'lucide-react'

import type { ClientPublic } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { Card } from '@duedatehq/ui/components/ui/card'
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
    // 2026-06-01 (Yuqi /clients/[id] critique — IA part 2): Card
    // primitive with the muted tone + xs size + md radius gives a
    // quiet contextual surface. No `!important` overrides — every
    // class is either a primitive default or a layout addition
    // (flex direction + items alignment for the inner row).
    <Card
      tone="muted"
      radius="md"
      size="xs"
      // Interactive: the whole strip is the click target for the
      // "open the slide-in to read more / edit" affordance. Same
      // pattern the NeedsAttentionCard uses on /today — button
      // wraps the Card chrome.
      interactive
      // Card defaults to a column flex; switch to row so icon + body
      // + edit affordance sit on one line.
      className="flex-row items-start gap-3 px-3 py-2"
      // Make the strip itself a button via the `render` slot would
      // be ideal — but Card uses a `<div>`, so we attach the
      // interaction handlers + role at the consumer layer.
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
      {/* Leading icon — same ScrollText glyph the slide-in trigger
          and Activity-tab empty state use, so the affordance reads
          as the same family across surfaces. */}
      <ScrollTextIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-text-tertiary" />

      {/* Body — first 2 lines visible, truncation after.
          `line-clamp-2` is a Tailwind plugin utility (already
          enabled in this project — used in NeedsAttentionCard +
          other surfaces). Whitespace-pre-wrap preserves line
          breaks the coordinator entered intentionally. */}
      <p
        className={cn(
          'line-clamp-2 min-w-0 flex-1 text-sm whitespace-pre-wrap text-text-secondary',
        )}
      >
        {notes}
      </p>

      {/* Edit affordance — quiet ghost button. Stops propagation
          so clicking Edit doesn't double-fire the outer strip's
          onClick (both lead to the same place, but the doubled
          click would flicker hover states on the way through). */}
      {canWrite ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onOpenEditor()
          }}
          aria-label={t`Edit notes for ${client.name}`}
          className="shrink-0"
        >
          <PencilLineIcon data-icon="inline-start" />
          <Trans>Edit</Trans>
        </Button>
      ) : null}
    </Card>
  )
}
