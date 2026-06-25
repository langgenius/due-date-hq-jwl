// DueDateHQ brand MARK — the stacked-bars icon (supplied by Yuqi 2026-06-26).
//
// Four rounded horizontal bars; the third tilts ~2.4° — a schedule with one row
// knocked askew. This is the icon only; the full horizontal lockup (mark +
// "DueDateHQ") lives in `BrandWordmark` (brand-wordmark.tsx). The favicon /
// app-icon / email assets are the standalone files in
// `packages/ui/src/assets/brand/` — keep them in sync with the geometry here.
//
// SINGLE SOURCE: the bar geometry lives once, in `Bars()`. To swap the icon,
// replace the four rects here (and the matching standalone .svg assets).
//
// Colors come from the brand-identity tokens (--color-brand-ink #1F315C /
// -ivory) via fill-* utilities, with raw hex as SVG presentation-attribute
// fallbacks so the mark renders where CSS hasn't loaded. Brand colors are
// theme-invariant — the mark must not shift between light and dark.
//
// Sized by `className` (default 28px). The rounded square is part of the SVG, so
// framed callers don't add their own bg/radius.

import { cn } from '@duedatehq/ui/lib/utils'

function Bars() {
  return (
    <>
      <rect width="74" height="12" rx="3.5" />
      <rect y="17" width="74" height="12" rx="3.5" />
      <rect
        x="10.4111"
        y="35.6758"
        width="73.8388"
        height="12"
        rx="3.5"
        transform="rotate(-2.43169 10.4111 35.6758)"
      />
      <rect y="51" width="74" height="12" rx="3.5" />
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
   * (used on /splash). The viewBox is the bars' own 85×65 box, so height-sizing
   * (`h-7 w-auto`) keeps the aspect ratio.
   */
  frame?: boolean
}) {
  if (!frame) {
    return (
      <svg
        viewBox="0 0 85 65"
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
      <g transform="translate(8 13.65) scale(0.5647)" fill="#F3EEE6" className="fill-brand-ivory">
        <Bars />
      </g>
    </svg>
  )
}
