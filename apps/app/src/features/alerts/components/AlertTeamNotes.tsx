import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { toast } from 'sonner'

import { Button } from '@duedatehq/ui/components/ui/button'
import { TextLink } from '@duedatehq/ui/components/ui/text-link'
import { Textarea } from '@duedatehq/ui/components/ui/textarea'

import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'
import { formatRelativeTime } from '@/lib/utils'

import { useAlertNotesInvalidation, useAlertNotesQueryOptions } from '../api'

/**
 * Internal discussion threaded on an alert. Any firm member can read +
 * add. The list shows author + relative time + body with a quiet inline
 * Reply affordance (v1: prefixes the composer with an "@author" mention
 * — the backend stores notes flat). The composer at the bottom is a
 * Textarea + "Add note" button, disabled while empty / saving.
 *
 * Matches the flat calm-document section style of the surrounding drawer body:
 * sentence-case header in `text-sm font-semibold text-text-secondary`.
 */
export function AlertTeamNotes({ alertId }: { alertId: string }) {
  const { t } = useLingui()
  const [draft, setDraft] = useState('')

  const notesQuery = useQuery(useAlertNotesQueryOptions(alertId))
  const notes = useMemo(() => notesQuery.data?.notes ?? [], [notesQuery.data])
  const invalidateNotes = useAlertNotesInvalidation(alertId)

  const addNoteMutation = useMutation(
    orpc.pulse.addAlertNote.mutationOptions({
      onSuccess: () => {
        setDraft('')
        invalidateNotes()
      },
      onError: (err) => {
        toast.error(t`Couldn't add note`, {
          description: rpcErrorMessage(err) ?? undefined,
        })
      },
    }),
  )

  const trimmed = draft.trim()
  const canSubmit = trimmed.length > 0 && !addNoteMutation.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    addNoteMutation.mutate({ alertId, body: trimmed })
  }

  // v1 Reply: a quiet affordance that seeds the composer with an "@author"
  // mention + focuses it. The note is still stored flat (no parentNoteId wired
  // from the UI yet) — keeping the thread simple while the affordance is live.
  const handleReply = (authorName: string) => {
    setDraft((current) => {
      const mention = `@${authorName} `
      return current.startsWith(mention) ? current : `${mention}${current}`
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-text-secondary">
          <Trans>Team notes</Trans>
        </span>
        <span className="text-xs font-medium text-text-tertiary tabular-nums">
          <Plural value={notes.length} one="# internal" other="# internal" /> ·{' '}
          <Trans>open to add or reply</Trans>
        </span>
      </header>

      {notes.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-medium text-text-primary">{note.authorName}</span>
                <span className="text-xs text-text-tertiary tabular-nums">
                  {formatRelativeTime(note.createdAt)}
                </span>
                <TextLink
                  variant="quiet"
                  onClick={() => handleReply(note.authorName)}
                  className="ml-auto"
                >
                  <Trans>Reply</Trans>
                </TextLink>
              </div>
              <p className="text-base whitespace-pre-wrap text-text-secondary">{note.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-base text-text-tertiary">
          <Trans>No team notes yet. Add the first one for your colleagues.</Trans>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t`Add an internal note for your team…`}
          rows={3}
          maxLength={2000}
          aria-label={t`Team note`}
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            <Trans>Add note</Trans>
          </Button>
        </div>
      </div>
    </section>
  )
}
