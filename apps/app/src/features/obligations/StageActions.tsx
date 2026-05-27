import { ArrowUpRightIcon, ChevronRightIcon } from 'lucide-react'

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
export function StageActions({
  tasks,
  onTaskClick,
}: {
  tasks: StageTask[]
  onTaskClick: (task: StageTask) => void
}) {
  const primary = tasks.find((task) => task.primary && task.flavor === 'mutation')
  const secondary = tasks.filter(
    (task) => task !== primary && (task.flavor === 'mutation' || task.flavor === 'routing'),
  )
  const reminders = tasks.filter((task) => task.flavor === 'manual')
  if (!primary && secondary.length === 0 && reminders.length === 0) return null
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
            >
              {primary.label}
            </Button>
          ) : null}
          {secondary.map((task) => {
            const destructive = task.id === 'mark-blocked'
            return (
              <Button
                key={task.id}
                variant={destructive ? 'destructive-ghost' : 'ghost'}
                size="sm"
                onClick={() => onTaskClick(task)}
                title={task.hint ?? undefined}
                className={cn(
                  'h-7 gap-1.5 px-2 text-xs font-normal',
                  !destructive && 'text-text-secondary',
                )}
              >
                <span>{task.label}</span>
                {task.flavor === 'routing' ? (
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
        <p className="text-caption leading-snug text-text-tertiary">
          {reminders.map((task) => task.label).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
