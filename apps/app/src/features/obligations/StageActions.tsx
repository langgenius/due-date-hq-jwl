import { ArrowUpRightIcon, ChevronRightIcon, Loader2Icon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'

import { cn } from '@/lib/utils'

type StageTaskFlavor = 'mutation' | 'routing' | 'manual'

export type StageTask = {
  id: string
  label: string
  flavor: StageTaskFlavor
  primary?: boolean
  hint?: string
}

// Action cluster rendered at the bottom of every stage card in the
// drawer's right panel. Splits the row's available tasks across three
// shapes by flavor:
//   1. The single primary mutation → solid Button (sm size)
//   2. Remaining mutations + routing → quiet ghost Buttons with
//      caret icons (routing → up-right arrow; mutations → right
//      chevron). Destructive mutations (mark-blocked) flip to
//      destructive-ghost variant.
//   3. Manual reminders            → single tertiary text line
//                                    beneath, not a checklist
//                                    (manual tasks have no backing
//                                    schema and confused CPAs into
//                                    thinking they could check them
//                                    off in-app).
//
// Renders nothing if the task list is empty.
//
// `pendingTaskId` carries the in-flight task while its backing mutation
// runs. The matching button shows a spinner (the canonical
// `Loader2Icon` + `animate-spin` leading glyph, same as the footer /
// authority-response buttons) and is disabled; EVERY other action
// button is disabled too, so a double-click can't fire the same stage
// action twice and a different stage action can't be fired mid-flight.
export function StageActions({
  tasks,
  onTaskClick,
  pendingTaskId = null,
}: {
  tasks: StageTask[]
  onTaskClick: (task: StageTask) => void
  pendingTaskId?: string | null
}) {
  const primary = tasks.find((task) => task.primary && task.flavor === 'mutation')
  const secondary = tasks.filter(
    (task) => task !== primary && (task.flavor === 'mutation' || task.flavor === 'routing'),
  )
  const reminders = tasks.filter((task) => task.flavor === 'manual')
  if (!primary && secondary.length === 0 && reminders.length === 0) return null
  // Any mutation in flight locks the whole cluster — not just the
  // button that fired it — so a second stage action can't race the
  // first while it settles.
  const anyPending = pendingTaskId !== null
  return (
    <div className="flex flex-col gap-1">
      {primary || secondary.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {primary ? (
            <Button
              size="sm"
              onClick={() => onTaskClick(primary)}
              title={primary.hint ?? undefined}
              className="w-fit"
              disabled={anyPending}
              aria-busy={pendingTaskId === primary.id || undefined}
            >
              {pendingTaskId === primary.id ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" aria-hidden />
              ) : null}
              {primary.label}
            </Button>
          ) : null}
          {secondary.map((task) => {
            const destructive = task.id === 'mark-blocked'
            const taskPending = pendingTaskId === task.id
            return (
              <Button
                key={task.id}
                variant={destructive ? 'destructive-ghost' : 'ghost'}
                size="sm"
                onClick={() => onTaskClick(task)}
                title={task.hint ?? undefined}
                disabled={anyPending}
                aria-busy={taskPending || undefined}
                className={cn(
                  'h-7 gap-1.5 px-2 text-xs font-normal',
                  !destructive && 'text-text-secondary',
                )}
              >
                <span>{task.label}</span>
                {taskPending ? (
                  <Loader2Icon className="size-3.5 animate-spin text-text-tertiary" aria-hidden />
                ) : task.flavor === 'routing' ? (
                  <ArrowUpRightIcon className="size-3.5 text-text-tertiary" aria-hidden />
                ) : destructive ? null : (
                  <ChevronRightIcon className="size-3.5 text-text-tertiary" aria-hidden />
                )}
              </Button>
            )
          })}
        </div>
      ) : null}
      {reminders.length > 0 ? (
        // One reminder per line (was a single " · "-joined run-on that read
        // as one ambiguous gray sentence — Yuqi). Middot prefix, no boxes:
        // these stay visibly NON-interactive — no backing schema, and a
        // checkbox shape misled CPAs into trying to tick them (2026-05-21).
        <ul className="flex flex-col gap-0.5 pt-0.5 text-caption leading-snug text-text-tertiary">
          {reminders.map((task) => (
            <li key={task.id} className="flex gap-1.5">
              <span aria-hidden>·</span>
              <span>{task.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
