// StateBadge — circular jurisdiction marks for all 50 US states, the
// federal government, and the IRS.
//
// Each mark is the *official seal* of the jurisdiction, vendored as a
// 256px PNG under ./state-seals/. The PNGs are rendered from the
// public-domain seal shown on the corresponding Wikipedia "Seal of
// <State>" article (via Wikimedia Commons), in full color exactly as
// the wiki depicts it — e.g. CA is the colored Great Seal of California
// (Minerva, grizzly, miner, ships, "EUREKA"). FED = Great Seal of the
// United States (obverse); IRS = the IRS seal.
//
// This replaces the earlier hand-designed flag-motif SVGs, which were
// stylized abstractions rather than the real seals.
//
// The seal renders in an <img> sized 20–88px. At the small (xs/sm)
// sizes used in alert cards it reads as a detailed disc and the
// adjacent state code does the identifying; the engraving detail comes
// through at lg/xl, and hovering (or focusing) any badge opens a preview
// card with the seal enlarged — the `preview` prop, on by default. Codes
// outside the registry fall back to a navy-disk monogram so layout stays
// consistent.
//
// To refresh or add a jurisdiction, drop a <CODE>.png in ./state-seals/
// (256px, transparent or white background) and add the matching import
// + SEAL_URLS entry below.
//
// Usage:
//
//   import { StateBadge } from '@/components/primitives/state-badge'
//   <StateBadge code="CA" size="md" />
//
// Sizes: xs (20px), sm (28px), md (32px), lg (56px), xl (88px).

import * as React from 'react'

import { Badge } from '@duedatehq/ui/components/ui/badge'
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from '@duedatehq/ui/components/ui/preview-card'
import { cn } from '@duedatehq/ui/lib/utils'

import seal_AK from './state-seals/AK.png?url'
import seal_AL from './state-seals/AL.png?url'
import seal_AR from './state-seals/AR.png?url'
import seal_AZ from './state-seals/AZ.png?url'
import seal_CA from './state-seals/CA.png?url'
import seal_CO from './state-seals/CO.png?url'
import seal_CT from './state-seals/CT.png?url'
import seal_DE from './state-seals/DE.png?url'
import seal_FED from './state-seals/FED.png?url'
import seal_FL from './state-seals/FL.png?url'
import seal_GA from './state-seals/GA.png?url'
import seal_HI from './state-seals/HI.png?url'
import seal_IA from './state-seals/IA.png?url'
import seal_ID from './state-seals/ID.png?url'
import seal_IL from './state-seals/IL.png?url'
import seal_IN from './state-seals/IN.png?url'
import seal_IRS from './state-seals/IRS.png?url'
import seal_KS from './state-seals/KS.png?url'
import seal_KY from './state-seals/KY.png?url'
import seal_LA from './state-seals/LA.png?url'
import seal_MA from './state-seals/MA.png?url'
import seal_MD from './state-seals/MD.png?url'
import seal_ME from './state-seals/ME.png?url'
import seal_MI from './state-seals/MI.png?url'
import seal_MN from './state-seals/MN.png?url'
import seal_MO from './state-seals/MO.png?url'
import seal_MS from './state-seals/MS.png?url'
import seal_MT from './state-seals/MT.png?url'
import seal_NC from './state-seals/NC.png?url'
import seal_ND from './state-seals/ND.png?url'
import seal_NE from './state-seals/NE.png?url'
import seal_NH from './state-seals/NH.png?url'
import seal_NJ from './state-seals/NJ.png?url'
import seal_NM from './state-seals/NM.png?url'
import seal_NV from './state-seals/NV.png?url'
import seal_NY from './state-seals/NY.png?url'
import seal_OH from './state-seals/OH.png?url'
import seal_OK from './state-seals/OK.png?url'
import seal_OR from './state-seals/OR.png?url'
import seal_PA from './state-seals/PA.png?url'
import seal_RI from './state-seals/RI.png?url'
import seal_SC from './state-seals/SC.png?url'
import seal_SD from './state-seals/SD.png?url'
import seal_TN from './state-seals/TN.png?url'
import seal_TX from './state-seals/TX.png?url'
import seal_UT from './state-seals/UT.png?url'
import seal_VA from './state-seals/VA.png?url'
import seal_VT from './state-seals/VT.png?url'
import seal_WA from './state-seals/WA.png?url'
import seal_WI from './state-seals/WI.png?url'
import seal_WV from './state-seals/WV.png?url'
import seal_WY from './state-seals/WY.png?url'

type StateBadgeSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface StateBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'title'> {
  /** Two-letter state code, "FED", or "IRS". Case-insensitive. */
  code: string
  size?: StateBadgeSize
  /** Override the tooltip; defaults to the resolved jurisdiction name. */
  title?: string
  /**
   * On hover (or keyboard focus), open a preview card showing the seal
   * enlarged. Default true; only renders when a seal image exists for the
   * code. Pass `preview={false}` to opt a call site out.
   */
  preview?: boolean
}

const sizePx: Record<StateBadgeSize, number> = {
  '2xs': 16,
  xs: 20,
  sm: 28,
  md: 32,
  lg: 56,
  xl: 88,
}

const NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  FED: 'Federal',
  IRS: 'IRS',
}

// Jurisdiction code → official seal image (256px PNG). See the file
// header for provenance. Keep alphabetized and in sync with the imports
// above and the ./state-seals/ directory.
const SEAL_URLS: Record<string, string> = {
  AK: seal_AK,
  AL: seal_AL,
  AR: seal_AR,
  AZ: seal_AZ,
  CA: seal_CA,
  CO: seal_CO,
  CT: seal_CT,
  DE: seal_DE,
  FED: seal_FED,
  FL: seal_FL,
  GA: seal_GA,
  HI: seal_HI,
  IA: seal_IA,
  ID: seal_ID,
  IL: seal_IL,
  IN: seal_IN,
  IRS: seal_IRS,
  KS: seal_KS,
  KY: seal_KY,
  LA: seal_LA,
  MA: seal_MA,
  MD: seal_MD,
  ME: seal_ME,
  MI: seal_MI,
  MN: seal_MN,
  MO: seal_MO,
  MS: seal_MS,
  MT: seal_MT,
  NC: seal_NC,
  ND: seal_ND,
  NE: seal_NE,
  NH: seal_NH,
  NJ: seal_NJ,
  NM: seal_NM,
  NV: seal_NV,
  NY: seal_NY,
  OH: seal_OH,
  OK: seal_OK,
  OR: seal_OR,
  PA: seal_PA,
  RI: seal_RI,
  SC: seal_SC,
  SD: seal_SD,
  TN: seal_TN,
  TX: seal_TX,
  UT: seal_UT,
  VA: seal_VA,
  VT: seal_VT,
  WA: seal_WA,
  WI: seal_WI,
  WV: seal_WV,
  WY: seal_WY,
}

export const StateBadge = React.forwardRef<HTMLSpanElement, StateBadgeProps>(
  ({ code, size = 'md', title, preview = true, className, style, ...rest }, ref) => {
    const px = sizePx[size]
    const upper = code.toUpperCase()
    const sealUrl = SEAL_URLS[upper]
    const tooltip = title ?? NAMES[upper] ?? upper
    const showPreview = preview && Boolean(sealUrl)

    const cls = [
      'inline-flex',
      'items-center',
      'justify-center',
      'shrink-0',
      'leading-none',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    const badge = (
      <span
        ref={ref}
        title={showPreview ? undefined : tooltip}
        aria-label={tooltip}
        className={cls}
        style={{
          width: px,
          height: px,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
        {...rest}
      >
        {sealUrl ? (
          <img
            src={sealUrl}
            alt=""
            aria-hidden
            draggable={false}
            loading="lazy"
            decoding="async"
            width={px}
            height={px}
            style={{ width: px, height: px, objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width={px} height={px}>
            <circle cx="100" cy="100" r="95" fill="#1A3263" />
            <text
              x="100"
              y="100"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight={700}
              fontSize={upper.length > 2 ? 56 : 80}
              fill="#EFE4BD"
              letterSpacing={upper.length > 2 ? -2 : -3}
            >
              {upper}
            </text>
          </svg>
        )}
      </span>
    )

    if (!showPreview) {
      return badge
    }

    // Hover/focus → enlarged seal in a preview card. PreviewCard is the
    // house primitive for hover-rich content (Tooltip is text-only); it
    // carries the standard scale-95→100 + fade overlay animation and only
    // mounts/loads the enlarged image once opened.
    return (
      <PreviewCard>
        <PreviewCardTrigger render={badge} delay={150} closeDelay={150} />
        <PreviewCardContent side="top" sideOffset={8} className="w-auto items-center gap-2 p-3">
          <span className="flex size-40 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5 ring-1 ring-black/5">
            <img
              src={sealUrl}
              alt=""
              aria-hidden
              draggable={false}
              className="size-full object-contain"
            />
          </span>
          <span className="text-xs font-medium text-text-secondary">{tooltip}</span>
        </PreviewCardContent>
      </PreviewCard>
    )
  },
)
StateBadge.displayName = 'StateBadge'

/**
 * Resolve a two-letter code (CA, TX, …), "FED", or "IRS" to its full
 * jurisdiction name ("California", "Texas", "Federal"). Returns the
 * uppercased code itself when no name is registered, so layout never
 * collapses to an empty string.
 *
 * Exported so the alerts table's jurisdiction chip can render
 * `[seal] CA · California` without each call site hand-rolling its own
 * state-name map.
 */
export function getJurisdictionName(code: string): string {
  const upper = code.toUpperCase()
  return NAMES[upper] ?? upper
}

/**
 * JurisdictionLabel — the canonical inline jurisdiction treatment for DETAIL
 * headers: the seal (16px) + bold mono code + full jurisdiction name. One
 * component so the alert and deadline detail panels (and any future header)
 * read identically instead of each hand-rolling the same StateBadge + code +
 * name markup. (The compact bordered seal+code chip used in list ROWS / rails
 * is a different, denser treatment and stays inline.)
 */
/**
 * JurisdictionChip — the canonical TEXT-ONLY jurisdiction code chip (CA /
 * FED / IRS) for rows, rails, cards, and table cells. One chrome
 * everywhere: `Badge variant="outline" shape="square"` (§4.10 ruled
 * jurisdiction codes are reference tags → neutral outline, never a tone
 * fill) in mono, with the full jurisdiction name as the hover tooltip.
 *
 * Family map — three jurisdiction treatments, each with ONE home:
 *   • `JurisdictionChip` — text-only code chip (this; the §4.11 entry)
 *   • `JurisdictionLabel` — detail headers: seal + mono code + full name
 *   • `StateBadge`       — the bare circular seal (rails, coverage grid)
 *
 * `className` is for layout only (alignment/margins) — radius, bg,
 * weight, and padding overrides are banned (same discipline as
 * TaxCodeBadge, DESIGN §4.11).
 */
export function JurisdictionChip({ code, className }: { code: string; className?: string }) {
  const upper = code.toUpperCase()
  return (
    <Badge
      variant="outline"
      shape="square"
      title={getJurisdictionName(upper)}
      // min-w keeps 2-letter (CA) and 3-letter (FED) codes the same
      // width so chips align in tabular columns (inherited from the
      // rules-console JurisdictionCode it replaces).
      className={cn('min-w-9 font-mono', className)}
    >
      {upper}
    </Badge>
  )
}

export function JurisdictionLabel({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 text-text-secondary',
        className,
      )}
    >
      <StateBadge code={code} size="xs" style={{ width: 16, height: 16 }} />
      <span className="font-mono text-sm font-bold tracking-[0.7px] uppercase">{code}</span>
      <span className="text-base font-medium">{getJurisdictionName(code)}</span>
    </span>
  )
}
