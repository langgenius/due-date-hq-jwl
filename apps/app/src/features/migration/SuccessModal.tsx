import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { motion } from 'motion/react'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  MailIcon,
  ScrollTextIcon,
  TriangleAlertIcon,
  Undo2Icon,
} from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@duedatehq/ui/components/ui/dialog'
import { cn } from '@duedatehq/ui/lib/utils'

import { CapsFieldLabel } from '@/components/primitives/caps-field-label'
import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'

export interface SuccessModalData {
  batchId: string
  clientCount: number
  obligationCount: number
  /** Distinct rules behind the created obligations (apply result). */
  rulesActiveCount: number
  /** Created obligations falling due within the next 30 days (apply result). */
  upcomingCount: number
  /** Server-provided ISO timestamp the import stays revertible until. Drives the live countdown. */
  revertibleUntil: string
  /** Optional contact email shown under the clients stat. Missing → omitted. */
  importedByEmail?: string | null | undefined
}

interface SuccessModalProps {
  open: boolean
  data: SuccessModalData
  onRevert: () => void
  onImportAnother: () => void
  onOpenDashboard: () => void
  onViewAuditLog: () => void
  /**
   * Cleanup-then-navigate to a specific route. 2026-06-16 (audit): the three
   * "What to do next" rows previously all called onOpenDashboard → `/`, so
   * three distinct promises ("Review jurisdictions" / "Customise reminders" /
   * "Browse deadlines") dumped the user on Today. Each now navigates to its
   * real destination via this.
   */
  onNavigate: (path: string) => void
  reverting?: boolean
}

/**
 * Applied success surface — design uoNwI.
 *
 * Replaces the prior toast-only success path with a full modal: a green hero
 * confirming the import, a 4-stat row (clients / rules active / upcoming /
 * emails sent), a warning-toned 24h undo banner with a *live* countdown driven
 * by the server's `revertibleUntil`, a "what to do next" action list, and a
 * footer (audit link · import another · open dashboard).
 *
 * Data parity vs the contract `ApplyResult` (batchId, clientCount,
 * obligationCount, skippedCount, revertibleUntil):
 *  - Clients + the undo countdown are real.
 *  - "Rules active", "upcoming · 30 days", and the "what to do next" detail
 *    lines are NOT in the apply result; they use static fallbacks below and
 *    are flagged TODO(data). "Emails sent" is always 0 by design (DueDateHQ
 *    never auto-emails on import).
 */
export function SuccessModal({
  open,
  data,
  onRevert,
  onImportAnother,
  onOpenDashboard,
  onViewAuditLog,
  onNavigate,
  reverting = false,
}: SuccessModalProps) {
  const { t } = useLingui()
  const countdown = useUndoCountdown(data.revertibleUntil, open)

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="w-[960px] max-w-[calc(100%-3rem)] gap-0 border-0 bg-transparent p-0 shadow-none sm:max-w-[calc(100%-3rem)]"
      >
        <DialogTitle className="sr-only">
          <Trans>Import complete</Trans>
        </DialogTitle>
        <DialogDescription className="sr-only">
          <Trans>
            Your clients and deadlines were created. You can undo this import within 24 hours.
          </Trans>
        </DialogDescription>

        <div className="flex w-full flex-col overflow-hidden rounded-lg border border-components-panel-border bg-components-panel-bg shadow-overlay">
          {/* Hero — green confirmation */}
          <div className="flex flex-col items-center gap-3 border-b border-divider-subtle bg-state-success-hover px-8 py-7 text-center">
            {/* The check pops in (scale 0.6→1, 180ms) the instant the win lands —
                the one celebratory beat of the modal. Reduced-motion handled by
                the global MotionConfig. */}
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18, ease: EASE_APPLE }}
              className="grid size-14 place-items-center rounded-xl border border-state-success-hover-alt bg-background-default"
            >
              <CheckIcon className="size-7 text-text-success" strokeWidth={1.75} aria-hidden />
            </motion.span>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
              <Plural
                value={data.clientCount}
                one="# client imported."
                other="# clients imported."
              />
            </h2>
            <p className="max-w-[600px] text-sm leading-relaxed text-text-secondary">
              <Trans>
                Live in your workspace.{' '}
                <Plural
                  value={data.obligationCount}
                  one="# deadline is now scheduled"
                  other="# deadlines are now scheduled"
                />
                . No emails go out until you turn the matching rule on — you control every send.
              </Trans>
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 divide-x divide-y divide-divider-subtle border-b border-divider-subtle sm:grid-cols-4 sm:divide-y-0">
            <Stat
              index={0}
              value={data.clientCount}
              label={<Trans>clients</Trans>}
              sub={
                data.importedByEmail ? (
                  <Trans>{data.importedByEmail} imported</Trans>
                ) : (
                  <Trans>added to your client list</Trans>
                )
              }
            />
            <Stat
              index={1}
              value={data.obligationCount}
              label={<Trans>deadlines</Trans>}
              sub={
                <Plural
                  value={data.rulesActiveCount}
                  one="from # active rule"
                  other="from # active rules"
                />
              }
            />
            <Stat
              index={2}
              value={data.upcomingCount}
              label={<Trans>upcoming · 30 days</Trans>}
              sub={<Trans>see them on Today</Trans>}
            />
            <Stat
              index={3}
              value={0}
              label={<Trans>emails sent</Trans>}
              sub={<Trans>you control when</Trans>}
            />
          </div>

          {/* 24h undo banner with live countdown */}
          <div className="flex items-center gap-3.5 border-b border-divider-subtle bg-state-warning-hover px-6 py-3.5">
            <Undo2Icon className="size-[18px] shrink-0 text-text-warning" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold text-text-warning">
                {/* "Undo", not "Roll back" — matches the button below + the
                    word used everywhere else in the import surfaces. */}
                <Trans>Undo this import within 24 hours, no questions asked</Trans>
              </span>
              <span className="text-caption font-medium text-text-secondary tabular-nums">
                {/* Batch ID demoted (2026-06-12 critique: "Batch #BAT-XXXX" is
                    recovery jargon for the headline). Lead with the live
                    countdown; the batch reference lives in Import History where
                    recovery actually happens. */}
                <Trans>
                  {countdown} left · you can also undo a single client from any client page
                </Trans>
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 border-state-warning-hover-alt text-text-warning"
              disabled={reverting}
              onClick={onRevert}
            >
              <Undo2Icon data-icon="inline-start" />
              <Trans>Undo import</Trans>
            </Button>
          </div>

          {/* What to do next */}
          <div className="flex flex-col gap-2 px-6 py-4">
            <CapsFieldLabel as="span" variant="group" className="text-text-tertiary">
              <Trans>What to do next</Trans>
            </CapsFieldLabel>
            {/* The three next-steps rise+fade in sequence (40ms apart). delayChildren
                0.08 lets the hero check + stat row (already animated) land first.
                Reduced-motion handled by the global MotionConfig. */}
            <motion.div
              className="flex flex-col gap-2"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
              }}
            >
              <motion.div
                variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
              >
                <NextStep
                  tone="warning"
                  icon={<TriangleAlertIcon className="size-3.5" aria-hidden />}
                  title={t`Review your jurisdictions`}
                  sub={t`Confirm state calendars before their deadlines generate`}
                  onClick={() => onNavigate('/rules/library')}
                />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
              >
                <NextStep
                  icon={<MailIcon className="size-3.5" aria-hidden />}
                  title={t`Customise reminder templates`}
                  sub={t`Email copy + reply-to before turning rules on`}
                  onClick={() => onNavigate('/reminders')}
                />
              </motion.div>
              <motion.div
                variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
              >
                <NextStep
                  icon={<CalendarDaysIcon className="size-3.5" aria-hidden />}
                  title={t`Browse your first deadlines`}
                  sub={t`See what's due next on Today`}
                  onClick={() => onNavigate('/deadlines')}
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 border-t border-divider-subtle px-6 py-3.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAuditLog}
              className="text-text-secondary hover:text-text-primary"
            >
              <ScrollTextIcon className="size-3.5" aria-hidden />
              <Trans>View audit log entry</Trans>
            </Button>
            <span className="flex-1" />
            <Button variant="secondary" size="sm" onClick={onImportAnother}>
              <Trans>Import another file</Trans>
            </Button>
            <Button size="sm" onClick={onOpenDashboard}>
              <Trans>Go to Today</Trans>
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Stat({
  value,
  label,
  sub,
  index = 0,
}: {
  value: number
  label: ReactNode
  sub: ReactNode
  // The numbers are the deliverable — they rise+fade in sequence (40ms apart)
  // just after the hero check, so the eye lands on each imported count. Stays a
  // grid cell (divide borders intact). Reduced-motion handled globally.
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: EASE_APPLE, delay: 0.08 + index * 0.04 }}
      className="flex flex-col gap-1 px-5 py-4"
    >
      <span className="text-2xl font-semibold tracking-tight text-text-primary tabular-nums">
        {value}
      </span>
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <span className="text-caption font-medium text-text-secondary">{sub}</span>
    </motion.div>
  )
}

function NextStep({
  icon,
  title,
  sub,
  tone = 'neutral',
  onClick,
}: {
  icon: ReactNode
  title: string
  sub: string
  tone?: 'neutral' | 'warning'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-state-base-hover focus-visible:ring-2 focus-visible:ring-state-accent-active-alt"
    >
      <span
        className={cn(
          'grid size-[30px] shrink-0 place-items-center rounded-lg border',
          tone === 'warning'
            ? 'border-state-warning-hover-alt bg-state-warning-hover text-text-warning'
            : 'border-divider-regular bg-background-subtle text-text-secondary',
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        <span className="text-caption font-medium text-text-secondary">{sub}</span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-text-tertiary" aria-hidden />
    </button>
  )
}

/**
 * Live "23h 58m" countdown to `revertibleUntil`, ticking once a minute while
 * the modal is open. Falls back to "expired" once the window passes.
 */
function useUndoCountdown(revertibleUntil: string, open: boolean): string {
  const target = useMemo(() => new Date(revertibleUntil).getTime(), [revertibleUntil])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!open) return undefined
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [open, revertibleUntil])

  const remainingMs = target - now
  if (!Number.isFinite(target) || remainingMs <= 0) return 'expired'
  const totalMinutes = Math.floor(remainingMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}
