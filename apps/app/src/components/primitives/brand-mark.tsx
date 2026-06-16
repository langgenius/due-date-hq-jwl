// DueDateHQ brand mark — the stacked-bars mark (supplied by Yuqi 2026-06-16,
// replacing the earlier "Radar D").
//
// Four rounded horizontal bars, the third indented — an abstract timeline /
// schedule motif. App-icon form: ivory bars on a navy rounded square. HQ lives
// in the wordmark, not the mark. The bar geometry is the supplied 214×168
// artwork, scaled + centered into the square (scale 0.224 = 64/214 fit-to-width).
//
// Colors come from the brand-identity tokens (--color-brand-ink / -ivory) via
// fill-* utilities, with raw hex kept as SVG presentation-attribute fallbacks so
// the mark renders where CSS hasn't loaded (and the exported .svg assets stay
// portable). Brand colors are theme-invariant — the mark must not shift between
// light and dark.
//
// Sized by `className` (default 28px). The rounded square is part of the SVG, so
// callers don't add their own bg/radius.

import { cn } from '@duedatehq/ui/lib/utils'

function Bars() {
  return (
    <>
      <rect width="187" height="36" rx="10" />
      <rect y="44" width="187" height="36" rx="10" />
      <rect x="27" y="88" width="187" height="36" rx="10" />
      <rect y="132" width="187" height="36" rx="10" />
    </>
  )
}

export function BrandMark({
  className,
  frame = true,
}: {
  className?: string
  /**
   * `false` drops the navy square — just the navy bars on whatever surface
   * (used on /splash). The viewBox is the bars' own 214×168 box, so height-
   * sizing (`h-7 w-auto`) keeps the aspect ratio.
   */
  frame?: boolean
}) {
  if (!frame) {
    return (
      <svg
        viewBox="0 0 214 168"
        className={cn('h-7 w-auto', className)}
        role="img"
        aria-label="DueDateHQ"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#0A2540" className="fill-brand-ink">
          <Bars />
        </g>
      </svg>
    )
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('size-7', className)}
      role="img"
      aria-label="DueDateHQ"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="13.5" fill="#0A2540" className="fill-brand-ink" />
      <g
        transform="translate(8.05 13.2) scale(0.224)"
        fill="#F3EEE6"
        className="fill-brand-ivory"
      >
        <Bars />
      </g>
    </svg>
  )
}
