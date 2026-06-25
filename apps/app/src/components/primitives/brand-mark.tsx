// DueDateHQ brand mark — the stacked-bars mark (supplied by Yuqi 2026-06-26,
// refining the earlier indented-bar mark).
//
// Four rounded horizontal bars; the third is tilted ~2.4° — an abstract
// schedule with one row "askew" (a deadline knocked off-line). App-icon form:
// ivory bars on a navy rounded square. HQ lives in the wordmark, not the mark.
// The bar geometry is the supplied 170×129 artwork, scaled + centered into the
// square (≈25% total padding, fit-to-width).
//
// Colors come from the brand-identity tokens (--color-brand-ink #1F315C /
// -ivory) via fill-* utilities, with raw hex kept as SVG presentation-attribute
// fallbacks so the mark renders where CSS hasn't loaded (and the exported .svg
// assets stay portable). Brand colors are theme-invariant — the mark must not
// shift between light and dark.
//
// Sized by `className` (default 28px). The rounded square is part of the SVG, so
// callers don't add their own bg/radius.

import { cn } from '@duedatehq/ui/lib/utils'

function Bars() {
  return (
    <>
      <rect width="147.678" height="26.6898" rx="8" />
      <rect y="34.1035" width="147.678" height="26.6898" rx="8" />
      <rect
        x="20.8228"
        y="71.3516"
        width="147.678"
        height="26.6898"
        rx="8"
        transform="rotate(-2.43169 20.8228 71.3516)"
      />
      <rect y="102.311" width="147.678" height="26.6898" rx="8" />
    </>
  )
}

export function BrandMark({
  className,
  frame = true,
}: {
  className?: string | undefined
  /**
   * `false` drops the navy square — just the navy bars on whatever surface
   * (used on /splash). The viewBox is the bars' own 170×129 box, so height-
   * sizing (`h-7 w-auto`) keeps the aspect ratio.
   */
  frame?: boolean
}) {
  if (!frame) {
    return (
      <svg
        viewBox="0 0 170 129"
        className={cn('h-7 w-auto', className)}
        role="img"
        aria-label="DueDateHQ"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#1F315C" className="fill-brand-ink">
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
      <rect width="64" height="64" rx="13.5" fill="#1F315C" className="fill-brand-ink" />
      <g transform="translate(8 13.8) scale(0.282)" fill="#F3EEE6" className="fill-brand-ivory">
        <Bars />
      </g>
    </svg>
  )
}
