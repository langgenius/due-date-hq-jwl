import { type ReactNode, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowRightIcon,
  type LucideIcon,
  UploadIcon,
  UserPlusIcon,
  CalendarPlusIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import type { ClientCreateInput } from '@duedatehq/contracts'
import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

import { DuotoneIcon, type DuotoneTone } from '@/components/primitives/duotone-icon'
import { CreateClientDialog } from '@/features/clients/CreateClientDialog'
import { clientDetailPath } from '@/features/clients/client-url'
import type { ClientEntityType } from '@/features/clients/client-readiness'
import { CreateObligationDialog } from '@/features/obligations/CreateObligationDialog'
import { useMigrationWizard } from '@/features/migration/WizardProvider'
import { useFirmPermission } from '@/features/permissions/permission-gate'
import { requiredRolesLabel } from '@/lib/required-roles-label'
import { EASE_APPLE, MOTION_DURATION } from '@/lib/motion'
import { orpc } from '@/lib/rpc'
import { rpcErrorMessage } from '@/lib/rpc-error'

/**
 * CreateChoiceCards — the richer first-run "get started" chooser for /today.
 *
 * Adapts the create-type CHOICE-CARD pattern (Yuqi refs: the AI Agent /
 * Podcast / Sound Effect cards — soft card + icon-illustration + title +
 * two-line description + primary button) to OUR three real "ways to add":
 *
 *   • Import clients → the bulk migration wizard (useMigrationWizard.openWizard)
 *   • Add a client   → the single-client CreateClientDialog + clients.create
 *   • Add a deadline → the rule-backed CreateObligationDialog (no fixed client)
 *
 * Each card carries a tinted DuotoneIcon chip (import=brand, client=accent,
 * deadline=success), a faint grid motif at the top (decorative, behind the
 * content), a title, a two-line description, and a primary Button wired to the
 * REAL action. No fiction — every CTA dispatches a live handler/mutation.
 *
 * Permission-gated per card: a member without `migration.run` / `client.write`
 * sees the card disabled with the required-role line instead of the CTA copy,
 * the same gating the header DashboardAddMenu uses.
 */

// Entity labels mirror routes/clients.tsx `useEntityLabels` (and the copy in
// add-menu.tsx). Inlined to keep this feature component free of a route
// dependency; the `Record<ClientEntityType, string>` type makes tsgo fail if
// the entity enum grows, so the list can't silently drift out of sync.
function useEntityLabels(): Record<ClientEntityType, string> {
  const { t } = useLingui()
  return useMemo(
    () => ({
      llc: t`LLC`,
      s_corp: t`S corp`,
      partnership: t`Partnership`,
      c_corp: t`C corp`,
      sole_prop: t`Sole prop`,
      trust: t`Trust`,
      individual: t`Individual`,
      other: t`Other`,
    }),
    [t],
  )
}

// Grid stagger (replaces the old single-block animate-in fade): the parent
// holds an empty `hidden`, then `show` cascades its children 50ms apart so the
// three choice cards arrive left→right rather than as one fade. Each child rises
// 8px + fades on the house enter curve. Reduced-motion is governed globally by
// the root <MotionConfig reducedMotion="user">.
const CHOICE_GRID_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
} as const

const CHOICE_CARD_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
} as const

function ChoiceCard({
  icon,
  tone,
  title,
  description,
  cta,
  disabled,
  disabledHint,
  onAction,
}: {
  icon: LucideIcon
  tone: DuotoneTone
  title: ReactNode
  description: ReactNode
  cta: ReactNode
  disabled: boolean
  disabledHint: ReactNode
  onAction: () => void
}) {
  return (
    // Soft choice card: rounded-xl wrapper, border + bg lift (no shadow), the
    // hover state nudges the border + background a touch so the whole card
    // reads as one big affordance. The primary Button inside owns the click;
    // the card hover is just a visual "this is pickable" cue.
    <div className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-divider-regular bg-background-default p-5 transition-colors hover:border-divider-deep hover:bg-background-section/40">
      {/* Faint grid motif top-right — a quiet illustration cue (the choice-card
          reference's textured corner), purely decorative and behind content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px -right-px h-24 w-32 opacity-[0.5] [mask-image:radial-gradient(120px_80px_at_top_right,black,transparent)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-divider-regular) 1px, transparent 1px), linear-gradient(to bottom, var(--color-divider-regular) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      <DuotoneIcon icon={icon} tone={tone} size="lg" className="relative" />

      <div className="relative flex min-h-[3.75rem] flex-col gap-1">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {/* Two-line description (line-clamp-2 keeps the three cards' button rows
            aligned even if one description runs long). */}
        <p className="line-clamp-2 text-sm leading-relaxed text-text-secondary">{description}</p>
      </div>

      <div className="relative mt-auto flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-center [&_svg[data-icon=inline-end]]:transition-transform group-hover:[&_svg[data-icon=inline-end]]:translate-x-0.5"
          disabled={disabled}
          onClick={onAction}
        >
          {cta}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        {disabled ? <span className="text-caption text-text-tertiary">{disabledHint}</span> : null}
      </div>
    </div>
  )
}

export function CreateChoiceCards({ className }: { className?: string }) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openWizard } = useMigrationWizard()
  const permission = useFirmPermission()
  const entityLabels = useEntityLabels()

  const canRunMigration = permission.can('migration.run')
  const canCreateClient = permission.can('client.write')
  // "Add a deadline" writes an obligation through the create-from-rules path,
  // which is gated the same as creating a client (deadline.write would be the
  // analogue, but client.write is what actually unblocks the dialog's client
  // picker + create-client fallback — keep parity with what the dialog needs).
  const canCreateDeadline = permission.can('client.write')

  const [createClientOpen, setCreateClientOpen] = useState(false)
  const [createDeadlineOpen, setCreateDeadlineOpen] = useState(false)

  // Same create-client mutation the header DashboardAddMenu uses: invalidate
  // the client list + dashboard load, toast, then jump to the new client's
  // page so the first-run user lands somewhere with work to do.
  const createClientMutation = useMutation(
    orpc.clients.create.mutationOptions({
      onSuccess: (client) => {
        void queryClient.invalidateQueries({ queryKey: orpc.clients.listByFirm.key() })
        void queryClient.invalidateQueries({ queryKey: orpc.dashboard.load.key() })
        setCreateClientOpen(false)
        toast.success(t`Client created`, { description: client.name })
        void navigate(clientDetailPath(client))
      },
      onError: (err) => {
        toast.error(t`Couldn't create client`, {
          description:
            rpcErrorMessage(err) ?? t`Try again in a moment. If it keeps failing, contact support.`,
        })
      },
    }),
  )

  return (
    <>
      <motion.div
        variants={CHOICE_GRID_VARIANTS}
        initial="hidden"
        animate="show"
        className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
      >
        <motion.div
          variants={CHOICE_CARD_VARIANTS}
          transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
        >
          <ChoiceCard
            icon={UploadIcon}
            tone="brand"
            title={<Trans>Import clients</Trans>}
            description={
              <Trans>
                Bring your whole book from TaxDome, Karbon, Drake, QuickBooks and more — every
                deadline shows up on its own.
              </Trans>
            }
            cta={<Trans>Import clients</Trans>}
            disabled={!canRunMigration}
            disabledHint={<Trans>Requires {requiredRolesLabel('migration.run')} access</Trans>}
            onAction={() => openWizard()}
          />
        </motion.div>

        <motion.div
          variants={CHOICE_CARD_VARIANTS}
          transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
        >
          <ChoiceCard
            icon={UserPlusIcon}
            tone="accent"
            title={<Trans>Add a client</Trans>}
            description={
              <Trans>
                Create one client by hand — name, entity type, and jurisdiction. Good for trying it
                out with a single account.
              </Trans>
            }
            cta={<Trans>Add a client</Trans>}
            disabled={!canCreateClient}
            disabledHint={<Trans>Requires {requiredRolesLabel('client.write')} access</Trans>}
            onAction={() => setCreateClientOpen(true)}
          />
        </motion.div>

        <motion.div
          variants={CHOICE_CARD_VARIANTS}
          transition={{ duration: MOTION_DURATION.enter, ease: EASE_APPLE }}
        >
          <ChoiceCard
            icon={CalendarPlusIcon}
            tone="success"
            title={<Trans>Add a deadline</Trans>}
            description={
              <Trans>
                Add a single rule-backed deadline for a client. DueDateHQ calculates the due date
                from the rule library.
              </Trans>
            }
            cta={<Trans>Add a deadline</Trans>}
            disabled={!canCreateDeadline}
            disabledHint={<Trans>Requires {requiredRolesLabel('client.write')} access</Trans>}
            onAction={() => setCreateDeadlineOpen(true)}
          />
        </motion.div>
      </motion.div>

      {/* Controlled, trigger-less dialogs — the cards drive them programmatically. */}
      <CreateClientDialog
        entityLabels={entityLabels}
        isPending={createClientMutation.isPending}
        onCreate={(input: ClientCreateInput, callbacks) =>
          createClientMutation.mutate(input, callbacks)
        }
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        hideTrigger
      />
      <CreateObligationDialog
        open={createDeadlineOpen}
        onOpenChange={setCreateDeadlineOpen}
        hideTrigger
      />
    </>
  )
}
