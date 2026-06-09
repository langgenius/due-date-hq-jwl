import type { ReactNode } from 'react'
import { Astroid, CircleHelpIcon } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@duedatehq/ui/components/ui/popover'
import { cn } from '@duedatehq/ui/lib/utils'
import { requiredRolesLabel } from '@/lib/required-roles-label'

type ConceptId =
  | 'smartPriority'
  | 'urgencyWindow'
  | 'lateFilingCap'
  | 'exposure'
  | 'readiness'
  | 'obligation'
  | 'evidence'
  | 'evidenceGap'
  | 'pulse'
  | 'verifiedRule'
  | 'candidateRule'
  | 'defaultMatrix'
  | 'migrationCopilot'
  | 'obligations'
  | 'triageQueue'
  // 2026-05-26 (Step 9 AI Visibility Audit F-016): `aiWeeklyBrief`
  // entry was registered but no consumer ever called
  // `concept="aiWeeklyBrief"`. Removed until a surface lands so
  // the union type doesn't fragment with ghost entries.
  | 'deadlineTip'
  | 'auditTrail'
  | 'obligationPreview'
  | 'reminderReady'
  | 'requiresReview'
  | 'coverage'
  | 'practice'
  | 'owner'
  | 'risk'
  | 'aiConfidence'

type ConceptCopy = {
  title: string
  description: string
}

type ConceptHelpProps = {
  concept: ConceptId
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  triggerLabel?: string
}

type ConceptLabelProps = ConceptHelpProps & {
  children: ReactNode
  labelClassName?: string
}

function useConceptCopy(concept: ConceptId): ConceptCopy {
  const { t } = useLingui()

  switch (concept) {
    case 'smartPriority':
      return {
        title: t`Smart Priority`,
        description: t`DueDateHQ's deterministic ordering score for deadline work. It combines urgency, client importance, late filing history, and materials pressure.`,
      }
    case 'urgencyWindow':
      return {
        title: t`Urgency window`,
        description: t`The number of days before a deadline where urgency reaches its maximum Smart Priority contribution.`,
      }
    case 'lateFilingCap':
      return {
        title: t`Late filing cap`,
        description: t`The late-filing count where history reaches its maximum Smart Priority contribution. Higher counts still display, but do not add more score from this factor.`,
      }
    case 'exposure':
      return {
        title: t`Penalty inputs`,
        description: t`The tax facts used when the app needs to calculate penalty context for overdue work.`,
      }
    case 'readiness':
      return {
        title: t`Materials`,
        description: t`The firm's running tally of client-provided documents, signatures, and confirmations for a specific deadline. Tracked per deadline. Independent of the firm's workflow status — the materials can be complete while status is still Waiting, or incomplete after drafting has begun.`,
      }
    case 'obligation':
      return {
        title: t`Deadline`,
        description: t`A specific compliance deadline generated from client facts and active practice rules. It is more structured than a generic task.`,
      }
    case 'evidence':
      return {
        title: t`Evidence`,
        description: t`The official source, quote, or audit record that supports a rule, deadline, AI explanation, or alert.`,
      }
    case 'evidenceGap':
      return {
        title: t`Evidence gap`,
        description: t`A row still needs a trusted source before it should be treated as fully reviewable or cited in AI output.`,
      }
    case 'pulse':
      return {
        title: t`Alerts`,
        description: t`A regulatory change signal detected from watched official sources. Matching client deadlines still need review before changes are applied.`,
      }
    case 'verifiedRule':
      return {
        title: t`Active practice rule`,
        // ROH-D11 — was "owner or manager"; the actual gate is
        // pulse.apply (owner/partner/manager). Helper-driven so the
        // concept-help blurb stays current with FIRM_PERMISSION_ROLES.
        description: t`A deadline rule accepted by ${requiredRolesLabel('pulse.apply')} at this practice. It can generate client-facing reminders when it matches a client.`,
      }
    case 'candidateRule':
      return {
        title: t`Review-only rule`,
        // ROH-D11 — same gate as verifiedRule above.
        description: t`A possible rule or change that is still waiting for ${requiredRolesLabel('pulse.apply')} to review. Review-only rules do not update client deadlines or send reminders.`,
      }
    case 'defaultMatrix':
      return {
        title: t`Tax type suggestions`,
        description: t`Import-time suggestions for tax types based on entity type and jurisdiction when the uploaded rows do not provide tax types.`,
      }
    case 'migrationCopilot':
      return {
        title: t`Migration Copilot`,
        description: t`The client import flow that maps columns, normalizes values, previews deadlines, and creates the initial deadline list.`,
      }
    case 'obligations':
      return {
        title: t`Deadlines`,
        description: t`The operating surface for deadline work: filter, sort, assign owners, update status, and open evidence for each deadline.`,
      }
    case 'triageQueue':
      return {
        title: t`Top deadlines by risk`,
        description: t`The highest-risk open deadlines for the chosen window — work these first.`,
      }
    case 'deadlineTip':
      return {
        title: t`Deadline Tip`,
        description: t`A short explanation for one deadline, generated only from active rule context and source-backed evidence.`,
      }
    case 'auditTrail':
      return {
        title: t`Audit trail`,
        description: t`The practice-scoped record of who changed what, when it changed, and what evidence or reason was attached.`,
      }
    case 'obligationPreview':
      return {
        title: t`Deadline Preview`,
        description: t`A dry run that shows which deadline rules would create for a client before anything is written to the deadline list.`,
      }
    case 'reminderReady':
      return {
        title: t`Reminder-ready`,
        description: t`This deadline comes from an active practice rule and can trigger the 30-day and 7-day reminder schedule.`,
      }
    case 'requiresReview':
      return {
        title: t`Requires review`,
        description: t`The system found a possible deadline, but a CPA, owner, or manager must confirm it before it is treated as final.`,
      }
    case 'coverage':
      return {
        title: t`Coverage`,
        description: t`The jurisdictions, entity types, and tax types currently backed by watched sources and active practice rules.`,
      }
    case 'practice':
      return {
        title: t`Practice`,
        description: t`The active CPA practice workspace. Settings, clients, deadlines, members, billing, and audit logs are scoped to the selected practice.`,
      }
    case 'owner':
      return {
        title: t`Owner`,
        description: t`A high-permission practice role. In client tax inputs, owner count separately means the number of equity owners used for penalty facts.`,
      }
    case 'risk':
      return {
        title: t`Risk`,
        description: t`The stored deadline risk view, mainly based on due date pressure, materials state, client history, and evidence status.`,
      }
    case 'aiConfidence':
      return {
        title: t`AI confidence`,
        description: t`A model confidence signal for extracted or matched information. Low confidence means the source should be reviewed before applying changes.`,
      }
    default: {
      const exhaustive: never = concept
      void exhaustive
      throw new Error('Unknown concept')
    }
  }
}

export function ConceptHelp({
  concept,
  className,
  side = 'top',
  align = 'center',
  triggerLabel,
}: ConceptHelpProps) {
  const { t } = useLingui()
  const copy = useConceptCopy(concept)
  const label = triggerLabel ?? copy.title
  // 2026-05-26 (Step 9 AI Visibility Audit F-026): AI-specific
  // concepts swap CircleHelpIcon → Astroid on the trigger so the
  // help popover's icon reinforces "this concept is about AI" before
  // the user reads the popover body. Non-AI concepts keep the
  // canonical question-mark.
  const isAiConcept = concept === 'aiConfidence' || concept === 'deadlineTip'
  const TriggerIcon = isAiConcept ? Astroid : CircleHelpIcon

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={80}
        render={
          <button
            type="button"
            aria-label={t`Explain ${label}`}
            className={cn(
              'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors',
              'hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
              className,
            )}
          />
        }
      >
        <TriggerIcon className="size-3.5" aria-hidden />
      </PopoverTrigger>
      {/* 2026-05-25 (Yuqi rule library #18): concept-help popovers
          were rendering at text-xs (12px) which Yuqi flagged as too
          small to read comfortably. Bumped to text-sm (14px) for the
          description and widened to w-80 so longer concept blurbs
          don't wrap to 4+ lines. The title primitive already
          ships at a readable size; only the description body
          needed the bump. */}
      <PopoverContent side={side} align={align} className="w-80 gap-2 p-3">
        <PopoverHeader>
          <PopoverTitle>{copy.title}</PopoverTitle>
          <PopoverDescription className="text-sm leading-relaxed text-text-secondary">
            {copy.description}
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}

export function ConceptLabel({
  concept,
  children,
  className,
  labelClassName,
  side,
  align,
}: ConceptLabelProps) {
  const helpProps: ConceptHelpProps = { concept }

  if (typeof children === 'string') {
    helpProps.triggerLabel = children
  }

  if (side !== undefined) {
    helpProps.side = side
  }

  if (align !== undefined) {
    helpProps.align = align
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 align-middle', className)}>
      <span className={cn('min-w-0', labelClassName)}>{children}</span>
      <ConceptHelp {...helpProps} />
    </span>
  )
}
