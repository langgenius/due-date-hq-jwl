import { type LucideIcon, MapPinnedIcon, SparklesIcon, WandSparklesIcon } from 'lucide-react'

import { Button } from '@duedatehq/ui/components/ui/button'
import { cn } from '@duedatehq/ui/lib/utils'

/**
 * FunIconButton — a BOLD marquee-action pill (Yuqi ref: the "Show in Maps" pill
 * with a rich depth/gradient glyph in a dark rounded-square).
 *
 * Anatomy: a light **track** (the pill body, built on the `secondary` Button so
 * it inherits the app's squircle corners + focus ring + press-scale) carrying a
 * leading **rich icon-chip** — a small dark rounded-square that holds a lucide
 * glyph. The chip gets its depth from CSS only (no images): a top→bottom dark
 * gradient, a faint top inset highlight (the "lit edge"), and a thin tinted ring
 * — so the glyph reads as a little physical object sitting in a recessed well,
 * not a flat monochrome stroke.
 *
 * MARQUEE SURFACES ONLY — hero CTAs, empty-state primary actions, success/finish
 * affordances, choice cards. This is the loud cousin of DuotoneIcon and must NOT
 * appear in the dense data workbench, where the restrained-monochrome icon canon
 * keeps tables calm.
 *
 * Canon respected:
 *  - restrained shadows — the chip lifts via border + inner gradient, not an
 *    outer drop shadow; the only blur is a sub-4px micro inset highlight.
 *  - fixed radius scale — track corners come from the Button primitive (squircle
 *    rounded-2xl); the icon-chip uses rounded-xl (12) per the small-affordance tier.
 *  - no colored text on dark — the chip is dark chrome, so its glyph is white;
 *    chroma lives in the *container* (the tinted ring / gradient), never the text.
 *  - reduced-motion safe — the chip's hover lift + shimmer are gated behind
 *    motion-safe:, and the Button's own press-scale already respects reduce.
 *
 * `tone` tints the chip's ring + gradient warmth so a button can read as
 * brand / AI / go-action without ever coloring the label text.
 */
export type FunIconButtonTone = 'ink' | 'brand' | 'accent' | 'success'

/** Per-tone chip chrome. The chip is always DARK; tone only shifts its ring +
 *  gradient hue + the soft glow behind the glyph. All chroma stays in the
 *  container, never on text. */
const CHIP_TONE: Record<FunIconButtonTone, { gradient: string; ring: string; glow: string }> = {
  // Neutral near-black well — the default "Show in Maps" look.
  ink: {
    gradient:
      'bg-[linear-gradient(180deg,var(--color-util-colors-gray-700),var(--color-util-colors-gray-900))]',
    ring: 'ring-white/10',
    glow: 'bg-white/15',
  },
  // Brand cyan-lit well — navy chrome from the brand ink tokens (lit
  // `brand-ink` top → deep `brand-ink-deep` floor), cyan ring + glow.
  brand: {
    gradient: 'bg-[linear-gradient(180deg,var(--color-brand-ink),var(--color-brand-ink-deep))]',
    ring: 'ring-[color-mix(in_srgb,var(--color-brand-highlight)_55%,transparent)]',
    glow: 'bg-[var(--color-brand-highlight)]/35',
  },
  // Accent-blue lit well — same navy chrome as `brand` (lit `brand-ink` → deep
  // `brand-ink-deep`); the accent identity lives in the blue ring + glow.
  accent: {
    gradient: 'bg-[linear-gradient(180deg,var(--color-brand-ink),var(--color-brand-ink-deep))]',
    ring: 'ring-[color-mix(in_srgb,var(--color-text-accent)_50%,transparent)]',
    glow: 'bg-[var(--color-text-accent)]/35',
  },
  // Go / success lit well — a deep green well (no brand token home for green;
  // built from `text-success` mixed toward black so the chroma stays tokenized).
  success: {
    gradient:
      'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-text-success)_22%,var(--color-brand-ink-deep)),color-mix(in_srgb,var(--color-text-success)_8%,var(--color-brand-ink-deep)))]',
    ring: 'ring-[color-mix(in_srgb,var(--color-text-success)_45%,transparent)]',
    glow: 'bg-[var(--color-text-success)]/30',
  },
}

const SIZE = {
  md: {
    track: 'h-11 gap-2.5 rounded-2xl pr-4 pl-1.5 text-sm',
    chip: 'size-8 rounded-xl [&>svg]:size-[18px]',
  },
  lg: {
    track: 'h-13 gap-3 rounded-2xl pr-5 pl-2 text-base font-semibold',
    chip: 'size-10 rounded-xl [&>svg]:size-5',
  },
} as const

export type FunIconButtonProps = {
  /** The leading rich glyph held in the dark chip. */
  icon: LucideIcon
  /** Pill label. */
  children: React.ReactNode
  tone?: FunIconButtonTone
  size?: keyof typeof SIZE
  onClick?: () => void
  disabled?: boolean
  className?: string
  // Polymorphic passthrough to the underlying Button primitive (Base UI). Pass
  // `render={<Link to="…" />}` + `nativeButton={false}` to render the pill as a
  // real anchor — so a navigating CTA keeps href semantics (cmd/right-click,
  // open-in-new-tab) instead of a JS-only onClick.
  render?: React.ComponentProps<typeof Button>['render']
  nativeButton?: boolean
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title' | 'type'>

export function FunIconButton({
  icon: Icon,
  children,
  tone = 'ink',
  size = 'md',
  onClick,
  disabled,
  className,
  type = 'button',
  render,
  nativeButton,
  ...rest
}: FunIconButtonProps) {
  const t = CHIP_TONE[tone]
  const s = SIZE[size]
  return (
    <Button
      type={type}
      variant="secondary"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      render={render}
      nativeButton={nativeButton}
      // `group/fib` lets the chip respond to track hover; reset Button's own
      // size padding/height — this pill carries the leading chip so it owns its
      // geometry, but keeps the primitive's squircle corners + focus + press.
      className={cn('group/fib font-medium', s.track, className)}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          // The dark icon-chip: a recessed well with CSS-only depth.
          'relative grid shrink-0 place-items-center overflow-hidden',
          'text-text-primary-on-surface ring-1 ring-inset',
          // micro lift on track hover (motion-safe only).
          'transition-transform duration-200 ease-out group-hover/fib:-translate-y-px motion-reduce:transition-none motion-reduce:group-hover/fib:translate-y-0',
          s.chip,
          t.gradient,
          t.ring,
        )}
      >
        {/* Soft tinted glow puddle behind the glyph — reads as the object being
            lit from within. Container-only chroma, blur is large but it is a
            background luminance wash, not a drop shadow. */}
        <span
          className={cn(
            'pointer-events-none absolute -top-1/3 left-1/2 size-2/3 -translate-x-1/2 rounded-full opacity-70 blur-[6px]',
            t.glow,
          )}
        />
        {/* Lit top edge — a sub-pixel inset highlight (micro, blur 0) that gives
            the chip its "physical lip". Bottom inner-shadow deepens the well. */}
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.18),inset_0_-6px_8px_-6px_rgb(0_0_0_/_0.7)]" />
        {/* Diagonal shimmer that sweeps once on hover (motion-safe only). */}
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,transparent_30%,rgb(255_255_255_/_0.18)_47%,transparent_60%)] bg-[length:220%_100%] bg-[position:120%_0] opacity-0 transition-[background-position,opacity] duration-700 ease-out group-hover/fib:bg-[position:-30%_0] group-hover/fib:opacity-100 motion-reduce:hidden" />
        <Icon className="relative z-10 drop-shadow-[0_1px_1px_rgb(0_0_0_/_0.45)]" strokeWidth={2} />
      </span>
      <span className="relative leading-none">{children}</span>
    </Button>
  )
}

/* ------------------------------------------------------------------------- *
 * Self-contained /preview demo. Plain string literals are intentional here —
 * these are showcase-only and kept out of i18n:extract so this isolated
 * worktree doesn't pull the parallel session's WIP catalog.
 * ------------------------------------------------------------------------- */

export function FunIconButtonDemo() {
  return (
    <div className="flex flex-col gap-8 p-6">
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">Tones (md)</p>
        <div className="flex flex-wrap items-center gap-3">
          <FunIconButton icon={MapPinnedIcon} tone="ink">
            Show in Maps
          </FunIconButton>
          <FunIconButton icon={SparklesIcon} tone="brand">
            Draft with AI
          </FunIconButton>
          <FunIconButton icon={WandSparklesIcon} tone="accent">
            Auto-fill details
          </FunIconButton>
          <FunIconButton icon={MapPinnedIcon} tone="success">
            File now
          </FunIconButton>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
          Large (hero CTA)
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <FunIconButton icon={SparklesIcon} tone="brand" size="lg">
            Draft with AI
          </FunIconButton>
          <FunIconButton icon={MapPinnedIcon} tone="ink" size="lg">
            Show in Maps
          </FunIconButton>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">Disabled</p>
        <FunIconButton icon={SparklesIcon} tone="brand" disabled>
          Draft with AI
        </FunIconButton>
      </section>
    </div>
  )
}
