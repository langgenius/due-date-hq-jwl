import type { ReactNode } from 'react'
import { CircleHelpIcon, PlayIcon, type LucideIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@duedatehq/ui/components/ui/popover'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * RichHelpTooltip — the BOLD sibling of ConceptHelp.
 *
 * Where ConceptHelp is a quiet light popover (title + one paragraph),
 * RichHelpTooltip is a confident DARK rounded surface for high-value help:
 * a title, a VISUAL preview area (a tinted illustrative block), a
 * description, and an optional footer action button (e.g. "Watch tutorial
 * 6:30"). Refs: the "Reviewable ?" help dot + the Simple-Poll tutorial dark
 * tooltip with a colourful preview illustration.
 *
 * Canon respected:
 * - Built on the Popover primitive (Base UI), not a hand-rolled floating div.
 *   Opens on hover (delay) like ConceptHelp, but is also click/focus
 *   dismissible — it can host an interactive footer button.
 * - DARK surface = `bg-text-primary` + `text-text-inverted`, matching the
 *   alerts bulk-bar / floating-action-bar inverted chrome. No coloured TEXT on
 *   dark: chroma lives in the preview CONTAINER, never the copy.
 * - Restrained shadows: the dark fill + border does the lift; only a
 *   `shadow-md` (blur ≤ 4-ish family) — no blur ≥ 24.
 * - Fixed radius scale: 12 (rounded-xl) wrapper, 8 (rounded-lg) preview block.
 * - Reduced-motion safe via the shared popover animation class
 *   (`motion-reduce:transition-none`).
 *
 * This does NOT replace ConceptHelp — it is a richer, opt-in surface for the
 * handful of concepts that deserve an illustration + tutorial CTA.
 *
 * NOTE: user-facing strings here are plain literals (this is a /preview
 * showcase primitive) to avoid running i18n:extract while a parallel session
 * has WIP catalogs. Production call-sites should pass already-translated copy.
 */

export type RichHelpTooltipPreviewTone = 'accent' | 'brand' | 'violet' | 'success' | 'warning'

type RichHelpTooltipAction = {
  /** Button label, e.g. "Watch tutorial". */
  label: string
  /** Optional trailing meta, e.g. "6:30" — rendered quietly after the label. */
  meta?: string
  /** Leading icon. Defaults to a play glyph (tutorial affordance). */
  icon?: LucideIcon
  onClick?: () => void
  /** When set, the action renders as a link instead of a button. */
  href?: string
}

type RichHelpTooltipProps = {
  /** Bold heading inside the dark surface. */
  title: string
  /** Supporting paragraph under the preview. */
  description: ReactNode
  /**
   * The VISUAL preview area. Pass any ReactNode (an illustration, a mini
   * mock, an icon montage). It is dropped into a tinted, rounded container so
   * the chroma reads as a coloured object — never as coloured text. When
   * omitted, no preview block renders (title + description only).
   */
  preview?: ReactNode
  /** Tint for the preview container. Default `accent`. */
  previewTone?: RichHelpTooltipPreviewTone
  /** Optional footer action (e.g. Watch tutorial). */
  action?: RichHelpTooltipAction
  /**
   * The anchor. Defaults to a small "?" help dot. Pass a custom node (wrapped
   * by the PopoverTrigger) to anchor off something else — e.g. a label.
   */
  trigger?: ReactNode
  /** Accessible label for the default "?" trigger. */
  triggerLabel?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
}

/** Tinted container behind the preview illustration. Chroma in the box, not the text. */
const PREVIEW_TONE_CLASS: Record<RichHelpTooltipPreviewTone, string> = {
  // Soft tinted fills that still read against the DARK surface. Each uses a
  // color-mix on a semantic/brand token so the block glows without depending on
  // a generated utility for that exact stop.
  accent:
    'bg-[color-mix(in_srgb,var(--color-text-accent)_22%,transparent)] ring-[color-mix(in_srgb,var(--color-text-accent)_36%,transparent)]',
  brand:
    'bg-[color-mix(in_srgb,var(--color-brand-highlight)_22%,transparent)] ring-[color-mix(in_srgb,var(--color-brand-highlight)_36%,transparent)]',
  violet:
    'bg-[color-mix(in_srgb,var(--color-status-review)_22%,transparent)] ring-[color-mix(in_srgb,var(--color-status-review)_36%,transparent)]',
  success:
    'bg-[color-mix(in_srgb,var(--color-text-success)_22%,transparent)] ring-[color-mix(in_srgb,var(--color-text-success)_36%,transparent)]',
  warning:
    'bg-[color-mix(in_srgb,var(--color-text-warning)_24%,transparent)] ring-[color-mix(in_srgb,var(--color-text-warning)_38%,transparent)]',
}

export function RichHelpTooltip({
  title,
  description,
  preview,
  previewTone = 'accent',
  action,
  trigger,
  triggerLabel,
  side = 'top',
  align = 'center',
  className,
}: RichHelpTooltipProps) {
  const ActionIcon = action?.icon ?? PlayIcon

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={200}
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <button
              type="button"
              aria-label={triggerLabel ?? `Learn about ${title}`}
              className={cn(
                'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors',
                'hover:bg-state-base-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
                className,
              )}
            >
              <CircleHelpIcon className="size-3.5" aria-hidden />
            </button>
          )
        }
      />
      {/* DARK surface. We override the popover's default light panel tokens with
          the inverted-chrome pair, keep a fixed 12-radius (rounded-xl) wrapper,
          a single restrained shadow, and a hairline white border so the silhouette
          reads as elevated against light backgrounds. w-80 holds an illustration
          comfortably without wrapping the copy too tightly. */}
      <PopoverContent
        side={side}
        align={align}
        sideOffset={6}
        className={cn(
          'w-80 gap-3 rounded-xl border-white/10 bg-text-primary p-3.5 text-text-inverted shadow-md',
        )}
      >
        <PopoverTitle className="text-sm font-semibold text-text-inverted">{title}</PopoverTitle>

        {preview ? (
          <div
            aria-hidden
            className={cn(
              // 8-radius tinted block; ring (not border) for the soft glow edge
              // so a one-sided stroke can never break the corners. min-h gives
              // illustrations room; place-items-center keeps a lone glyph honest.
              'grid min-h-24 place-items-center overflow-hidden rounded-lg p-3 ring-1 ring-inset',
              PREVIEW_TONE_CLASS[previewTone],
            )}
          >
            {preview}
          </div>
        ) : null}

        <PopoverDescription className="text-sm leading-relaxed text-white/70">
          {description}
        </PopoverDescription>

        {action ? (
          <div className="pt-0.5">
            <Button
              size="sm"
              variant="inverted-ghost"
              className="w-full justify-center border border-white/15 bg-white/5 hover:border-white/25"
              {...(action.href
                ? { render: <a href={action.href} /> }
                : { onClick: action.onClick })}
            >
              <ActionIcon className="size-3.5" aria-hidden />
              <span>{action.label}</span>
              {action.meta ? (
                <span className="ml-auto font-normal tabular-nums text-white/55">
                  {action.meta}
                </span>
              ) : null}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

/* -------------------------------------------------------------------------- */
/* Self-contained demo — renders in isolation on /preview.                    */
/* -------------------------------------------------------------------------- */

/** A tiny illustrative mock used by the demo preview area. Pure presentation. */
function DemoReviewIllustration() {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-white/80" />
        <span className="h-1.5 flex-1 rounded-full bg-white/45" />
        <span className="h-1.5 w-6 rounded-full bg-white/25" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-white/55" />
        <span className="h-1.5 w-2/3 rounded-full bg-white/30" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-white/40" />
        <span className="h-1.5 w-1/2 rounded-full bg-white/20" />
      </div>
    </div>
  )
}

export function RichHelpTooltipDemo() {
  return (
    <div className="flex flex-wrap items-center gap-8 p-4 text-sm text-text-secondary">
      {/* 1 — full: visual preview + description + tutorial action, off a "?" dot. */}
      <span className="inline-flex items-center gap-1.5 text-text-primary">
        What makes a deadline reviewable?
        <RichHelpTooltip
          title="Reviewable deadlines"
          previewTone="accent"
          preview={<DemoReviewIllustration />}
          description="A deadline is reviewable once it has a source-backed rule and an assigned owner. Review confirms the AI-suggested date before reminders go out."
          action={{ label: 'Watch tutorial', meta: '6:30' }}
        />
      </span>

      {/* 2 — custom trigger (a labelled chip) + brand-tinted preview, no action. */}
      <RichHelpTooltip
        title="Alerts, explained"
        side="bottom"
        align="start"
        previewTone="brand"
        trigger={
          <button
            type="button"
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-divider-regular bg-background-section px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-state-base-hover"
          >
            <CircleHelpIcon className="size-3.5" aria-hidden />
            How do Alerts work?
          </button>
        }
        preview={
          <div className="grid size-12 place-items-center rounded-lg bg-white/15">
            <PlayIcon className="size-6 text-white/80" aria-hidden />
          </div>
        }
        description="We watch official sources 24/7. When a rule changes, we flag every client deadline it touches — you review, then apply in one click."
        action={{ label: 'See a 60-second walkthrough', meta: '0:58' }}
      />

      {/* 3 — minimal: title + description, no preview, no action (still bold/dark). */}
      <span className="inline-flex items-center gap-1.5 text-text-primary">
        Materials pressure
        <RichHelpTooltip
          title="Materials pressure"
          previewTone="warning"
          description="How far behind a deadline is on client-provided documents. Higher pressure nudges the deadline up the Smart Priority order."
        />
      </span>
    </div>
  )
}
