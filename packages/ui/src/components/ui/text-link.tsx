import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@duedatehq/ui/lib/utils'

/**
 * `<TextLink>` — canonical muted-inline-link pattern used across
 * navigation hints ("All deadlines", "View all", "See more in
 * settings", etc.).
 *
 * ## Why a dedicated primitive
 *
 * The Button primitive's `link` variant is the right choice for
 * underlined, accent-toned inline links inside body copy ("read
 * more about Pulse" inside a paragraph). But the section-header
 * "go to the full list" pattern uses a quieter treatment — muted
 * tone at rest, tertiary on hover, no underline. Recreating it
 * inline at every call-site led to ~58 `text-text-muted hover:
 * text-text-tertiary` occurrences across the app, each with
 * slightly different focus rings and padding. This consolidates
 * the canonical shape.
 *
 * ## API
 *
 * Renders as a `<button>` by default. Pass `render={<Link to=... />}`
 * to use a React Router `<Link>` instead.
 *
 *   <TextLink onClick={() => navigate('/rules/pulse')}>View all</TextLink>
 *   <TextLink render={<Link to="/deadlines" />}>All deadlines</TextLink>
 *
 * ## Variants
 *
 * - `muted` (default) — `text-text-muted` at rest, `text-text-tertiary`
 *   on hover. The classic section-header navigation hint.
 * - `secondary` — `text-text-secondary` at rest, `text-text-primary`
 *   on hover. A tier louder, for inline links inside content where
 *   discoverability matters.
 * - `accent` — `text-text-accent` at rest with underline-on-hover.
 *   The section-affordance "create one", "view all", "learn more"
 *   shape used across SurfaceSummaryStrip, CreateObligationDialog,
 *   info-banner CTAs, etc. Quieter than the Button `link` variant
 *   (which assumes inline body-copy context with `underline-offset-4`).
 *
 * ## Sizes
 *
 * - `default` (text-xs) — header / footer navigation hints.
 * - `sm` (text-sm) — body-density inline links.
 */
const textLinkVariants = cva(
  cn(
    'inline-flex cursor-pointer items-center gap-1 rounded-sm font-medium outline-none transition-colors',
    'focus-visible:ring-2 focus-visible:ring-state-accent-active-alt',
  ),
  {
    variants: {
      variant: {
        muted: 'text-text-muted hover:text-text-tertiary',
        secondary: 'text-text-secondary hover:text-text-primary',
        // 2026-06-01: accent variant — quiet at rest (no underline),
        // accent tone, underline on hover. Completes the trio so the
        // 10+ hand-rolled "text-text-accent hover:underline" inline
        // section affordances can use the primitive.
        accent: 'text-text-accent underline-offset-2 hover:underline',
      },
      size: {
        default: 'text-xs',
        sm: 'text-sm',
      },
    },
    defaultVariants: {
      variant: 'muted',
      size: 'default',
    },
  },
)

function TextLink({
  className,
  variant,
  size,
  render,
  ...props
}: useRender.ComponentProps<'button'> & VariantProps<typeof textLinkVariants>) {
  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        type: 'button',
        className: cn(textLinkVariants({ variant, size }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'text-link',
      variant,
      size,
    },
  })
}

export { TextLink, textLinkVariants }
