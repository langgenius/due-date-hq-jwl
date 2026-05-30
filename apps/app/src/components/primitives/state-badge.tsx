// StateBadge — circular jurisdiction marks for all 50 US states + Federal.
//
// Imported 2026-05-25 from Yuqi's design-system export
// (`DueDateHQ_dashboard/.claude/worktrees/interesting-yonath-25dd01/
// files/state-badges-export/StateBadges.tsx`). The export is hand-
// designed SVG flag motifs, viewBox 0 0 200 200, sized to read from
// 20px up to 88px. Kept as a single-file drop-in (no token / Tailwind
// dependency) so it tracks the canonical export when Yuqi
// regenerates — only the leading import + this comment differ from
// the source.
//
// Usage:
//
//   import { StateBadge } from '@/components/primitives/state-badge'
//   <StateBadge code="CA" size="md" />
//
// Sizes: xs (20px), sm (28px), md (32px), lg (56px), xl (88px).
// Codes outside the registry render a navy-disk monogram fallback so
// layout stays consistent.

import * as React from 'react'

type StateBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type StateBadgeVariant = 'auto' | 'detailed' | 'simple'

interface StateBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'title'> {
  /** Two-letter state code, "FED", or "IRS". Case-insensitive. */
  code: string
  size?: StateBadgeSize
  /** Detail level. "auto" picks simple for xs/sm, detailed otherwise. */
  variant?: StateBadgeVariant
  /** Override the tooltip; defaults to the resolved jurisdiction name. */
  title?: string
}

const sizePx: Record<StateBadgeSize, number> = {
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

type BadgeComponent = React.FC

const Badge_CA: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#EFE4BD" />
    <path
      d="M52,38 L58,57 L78,57 L62,69 L68,88 L52,76 L36,88 L42,69 L26,57 L46,57 Z"
      fill="#B91C1C"
    />
    <g fill="#2A1A0E">
      <ellipse cx="148" cy="100" rx="24" ry="14" />
      <ellipse cx="105" cy="110" rx="58" ry="22" />
      <circle cx="48" cy="100" r="17" />
      <ellipse cx="28" cy="108" rx="13" ry="6" />
      <circle cx="50" cy="80" r="7" />
      <rect x="58" y="128" width="14" height="22" />
      <rect x="80" y="128" width="14" height="22" />
      <rect x="120" y="128" width="14" height="22" />
      <rect x="142" y="128" width="14" height="22" />
      <circle cx="172" cy="92" r="6" />
    </g>
    <circle cx="52" cy="96" r="2" fill="#EFE4BD" />
    <rect x="20" y="160" width="160" height="7" fill="#B91C1C" />
  </svg>
)

const Badge_TX: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#002868" />
    <path
      d="M100,28 L120,88 L184,88 L132,124 L152,184 L100,148 L48,184 L68,124 L16,88 L80,88 Z"
      fill="#FFFFFF"
    />
  </svg>
)

const Badge_NY: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1A3263" />
    <path
      d="M100,28 C70,55 60,85 78,118 C82,100 92,90 105,90 C108,118 122,118 138,108 C138,82 120,52 110,38 C105,55 100,55 100,28 Z"
      fill="#F4B83C"
    />
    <path
      d="M100,55 C88,75 86,95 96,115 C100,100 105,93 110,90 C106,75 102,62 100,55 Z"
      fill="#FFE08A"
    />
    <rect x="78" y="120" width="44" height="10" fill="#E8C547" />
    <rect x="86" y="130" width="28" height="36" fill="#E8C547" />
    <rect x="72" y="166" width="56" height="12" fill="#E8C547" />
  </svg>
)

const Badge_FL: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-fl-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-fl-c)">
      <rect x="0" y="0" width="200" height="200" fill="#FBF3D6" />
      <line x1="10" y1="10" x2="190" y2="190" stroke="#C5273E" strokeWidth="24" />
      <line x1="190" y1="10" x2="10" y2="190" stroke="#C5273E" strokeWidth="24" />
    </g>
    <circle cx="100" cy="100" r="34" fill="#F4B83C" stroke="#1A1814" strokeWidth="2.5" />
    <g stroke="#F4B83C" strokeWidth="7" strokeLinecap="round">
      <line x1="100" y1="63" x2="100" y2="52" />
      <line x1="100" y1="137" x2="100" y2="148" />
      <line x1="63" y1="100" x2="52" y2="100" />
      <line x1="137" y1="100" x2="148" y2="100" />
    </g>
  </svg>
)

const Badge_HI: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-hi-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-hi-c)">
      <rect x="0" y="0" width="200" height="25" fill="#FFFFFF" />
      <rect x="0" y="25" width="200" height="25" fill="#BB133E" />
      <rect x="0" y="50" width="200" height="25" fill="#1F4E8C" />
      <rect x="0" y="75" width="200" height="25" fill="#FFFFFF" />
      <rect x="0" y="100" width="200" height="25" fill="#BB133E" />
      <rect x="0" y="125" width="200" height="25" fill="#1F4E8C" />
      <rect x="0" y="150" width="200" height="25" fill="#FFFFFF" />
      <rect x="0" y="175" width="200" height="25" fill="#BB133E" />
      <rect x="0" y="0" width="100" height="100" fill="#1F4E8C" />
      <line x1="0" y1="0" x2="100" y2="100" stroke="#FFFFFF" strokeWidth="14" />
      <line x1="0" y1="0" x2="100" y2="100" stroke="#BB133E" strokeWidth="6" />
      <line x1="100" y1="0" x2="0" y2="100" stroke="#FFFFFF" strokeWidth="14" />
      <line x1="100" y1="0" x2="0" y2="100" stroke="#BB133E" strokeWidth="6" />
      <line x1="50" y1="0" x2="50" y2="100" stroke="#FFFFFF" strokeWidth="22" />
      <line x1="0" y1="50" x2="100" y2="50" stroke="#FFFFFF" strokeWidth="22" />
      <line x1="50" y1="0" x2="50" y2="100" stroke="#BB133E" strokeWidth="10" />
      <line x1="0" y1="50" x2="100" y2="50" stroke="#BB133E" strokeWidth="10" />
    </g>
  </svg>
)

const Badge_AK: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#0B1D3A" />
    <path
      d="M154,32 L162,52 L184,52 L166,66 L172,86 L154,74 L136,86 L142,66 L124,52 L146,52 Z"
      fill="#F4B83C"
    />
    <g fill="#F4B83C">
      <circle cx="50" cy="78" r="7" />
      <circle cx="72" cy="92" r="7" />
      <circle cx="92" cy="104" r="7" />
      <circle cx="116" cy="116" r="7" />
      <circle cx="124" cy="138" r="7" />
      <circle cx="100" cy="148" r="7" />
      <circle cx="76" cy="138" r="7" />
    </g>
  </svg>
)

const Badge_AZ: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-az-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-az-c)">
      <rect x="0" y="100" width="200" height="100" fill="#003F87" />
      <path d="M100,100 L0,100 L2.9,76 Z" fill="#CD212A" />
      <path d="M100,100 L2.9,76 L11.5,53.5 Z" fill="#F4B83C" />
      <path d="M100,100 L11.5,53.5 L25,33.7 Z" fill="#CD212A" />
      <path d="M100,100 L25,33.7 L43.2,17.7 Z" fill="#F4B83C" />
      <path d="M100,100 L43.2,17.7 L64.5,6.5 Z" fill="#CD212A" />
      <path d="M100,100 L64.5,6.5 L88,0.7 Z" fill="#F4B83C" />
      <path d="M100,100 L88,0.7 L112,0.7 Z" fill="#CD212A" />
      <path d="M100,100 L112,0.7 L135.5,6.5 Z" fill="#F4B83C" />
      <path d="M100,100 L135.5,6.5 L157,17.7 Z" fill="#CD212A" />
      <path d="M100,100 L157,17.7 L175,33.7 Z" fill="#F4B83C" />
      <path d="M100,100 L175,33.7 L188.5,53.5 Z" fill="#CD212A" />
      <path d="M100,100 L188.5,53.5 L197,76 Z" fill="#F4B83C" />
      <path d="M100,100 L197,76 L200,100 Z" fill="#CD212A" />
      <path
        d="M100,68 L110,96 L138,96 L116,114 L124,142 L100,124 L76,142 L84,114 L62,96 L90,96 Z"
        fill="#B87333"
      />
    </g>
  </svg>
)

const Badge_NM: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#F4B83C" />
    <circle cx="100" cy="100" r="20" fill="none" stroke="#BB133E" strokeWidth="8" />
    <g stroke="#BB133E" strokeWidth="9" strokeLinecap="butt">
      <line x1="84" y1="80" x2="84" y2="56" />
      <line x1="94" y1="80" x2="94" y2="40" />
      <line x1="106" y1="80" x2="106" y2="40" />
      <line x1="116" y1="80" x2="116" y2="56" />
      <line x1="84" y1="120" x2="84" y2="144" />
      <line x1="94" y1="120" x2="94" y2="160" />
      <line x1="106" y1="120" x2="106" y2="160" />
      <line x1="116" y1="120" x2="116" y2="144" />
      <line x1="120" y1="84" x2="144" y2="84" />
      <line x1="120" y1="94" x2="160" y2="94" />
      <line x1="120" y1="106" x2="160" y2="106" />
      <line x1="120" y1="116" x2="144" y2="116" />
      <line x1="80" y1="84" x2="56" y2="84" />
      <line x1="80" y1="94" x2="40" y2="94" />
      <line x1="80" y1="106" x2="40" y2="106" />
      <line x1="80" y1="116" x2="56" y2="116" />
    </g>
  </svg>
)

const Badge_MD: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-md-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
      <pattern
        id="b-md-cal"
        patternUnits="userSpaceOnUse"
        width="36"
        height="36"
        patternTransform="rotate(45)"
      >
        <rect width="18" height="36" fill="#F4B83C" />
        <rect x="18" width="18" height="36" fill="#1A1814" />
      </pattern>
      <pattern id="b-md-cross" patternUnits="userSpaceOnUse" width="60" height="60">
        <rect width="60" height="60" fill="#FFFFFF" />
        <rect x="22" width="16" height="60" fill="#BB133E" />
        <rect y="22" width="60" height="16" fill="#BB133E" />
      </pattern>
    </defs>
    <g clipPath="url(#b-md-c)">
      <rect x="0" y="0" width="100" height="100" fill="url(#b-md-cal)" />
      <rect x="100" y="0" width="100" height="100" fill="url(#b-md-cross)" />
      <rect x="0" y="100" width="100" height="100" fill="url(#b-md-cross)" />
      <rect x="100" y="100" width="100" height="100" fill="url(#b-md-cal)" />
    </g>
  </svg>
)

const Badge_SC: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#003875" />
    <path d="M40,40 A28,28 0 1 0 40,96 A22,22 0 1 1 40,40 Z" fill="#FFFFFF" />
    <g fill="#FFFFFF">
      <rect x="95" y="100" width="10" height="62" />
      <g transform="translate(100 90)">
        <ellipse cx="0" cy="-22" rx="8" ry="28" />
        <ellipse cx="0" cy="-22" rx="8" ry="28" transform="rotate(30)" />
        <ellipse cx="0" cy="-22" rx="8" ry="28" transform="rotate(-30)" />
        <ellipse cx="0" cy="-22" rx="8" ry="28" transform="rotate(60)" />
        <ellipse cx="0" cy="-22" rx="8" ry="28" transform="rotate(-60)" />
        <ellipse cx="0" cy="-22" rx="8" ry="28" transform="rotate(90)" />
        <ellipse cx="0" cy="-22" rx="8" ry="28" transform="rotate(-90)" />
      </g>
    </g>
  </svg>
)

const Badge_CO: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-co-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-co-c)">
      <rect x="0" y="0" width="200" height="65" fill="#1F4E8C" />
      <rect x="0" y="65" width="200" height="70" fill="#FFFFFF" />
      <rect x="0" y="135" width="200" height="65" fill="#1F4E8C" />
    </g>
    <path d="M130,60 A40,40 0 1 0 130,140 L118,124 A24,24 0 1 1 118,76 Z" fill="#CD212A" />
    <circle cx="100" cy="100" r="22" fill="#F4B83C" />
  </svg>
)

const Badge_TN: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#CD212A" />
    <circle cx="100" cy="100" r="58" fill="#1F4E8C" stroke="#FFFFFF" strokeWidth="4" />
    <g fill="#FFFFFF">
      <path d="M100,64 L104,75 L115,75 L106,82 L109,93 L100,86 L91,93 L94,82 L85,75 L96,75 Z" />
      <path d="M75,106 L79,117 L90,117 L81,124 L84,135 L75,128 L66,135 L69,124 L60,117 L71,117 Z" />
      <path d="M125,106 L129,117 L140,117 L131,124 L134,135 L125,128 L116,135 L119,124 L110,117 L121,117 Z" />
    </g>
  </svg>
)

const Badge_OH: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#EFE4BD" />
    <g transform="translate(20 60)">
      <path
        d="M0,0 L120,0 L160,40 L120,80 L0,80 Z"
        fill="#FFFFFF"
        stroke="#1A1814"
        strokeWidth="2"
      />
      <rect x="0" y="0" width="120" height="16" fill="#CD212A" />
      <rect x="0" y="32" width="120" height="16" fill="#CD212A" />
      <rect x="0" y="64" width="120" height="16" fill="#CD212A" />
      <path d="M120,0 L160,40 L120,16 Z" fill="#CD212A" />
      <path d="M120,32 L160,40 L120,48 Z" fill="#CD212A" />
      <path d="M120,64 L160,40 L120,80 Z" fill="#CD212A" />
      <path d="M0,0 L60,0 L60,80 L0,80 Z" fill="#1F4E8C" />
      <circle cx="30" cy="40" r="16" fill="none" stroke="#FFFFFF" strokeWidth="6" />
      <circle cx="30" cy="40" r="8" fill="#CD212A" />
    </g>
  </svg>
)

const Badge_IL: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#EFE4BD" />
    <g fill="#1A1814">
      <rect x="64" y="36" width="72" height="78" />
      <rect x="44" y="110" width="112" height="14" />
    </g>
    <rect x="64" y="92" width="72" height="12" fill="#B91C1C" />
    <path
      d="M100,134 L107,150 L124,150 L110,160 L116,176 L100,166 L84,176 L90,160 L76,150 L93,150 Z"
      fill="#B91C1C"
    />
  </svg>
)

const Badge_NJ: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#E6CFA0" />
    <path
      d="M70,176 L70,142 Q52,134 48,116 Q38,108 42,86 Q50,68 66,58 L78,40 L76,18 L96,28 L122,40 L146,58 L158,80 L156,100 L150,118 L136,128 L132,150 L132,176 Z"
      fill="#1A1814"
    />
    <circle cx="120" cy="76" r="3.5" fill="#E6CFA0" />
    <path
      d="M64,58 L70,82 L74,108 L78,134"
      stroke="#E6CFA0"
      strokeWidth="2.5"
      fill="none"
      opacity="0.45"
    />
  </svg>
)

const Badge_MA: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1F4E8C" />
    <g fill="#F4B83C">
      <path d="M40,100 L20,70 L30,100 L20,130 Z" />
      <path d="M40,100 Q66,62 130,68 Q160,76 170,100 Q160,124 130,132 Q66,138 40,100 Z" />
      <path d="M84,68 L92,48 L108,50 L106,72 Z" />
      <path d="M84,132 L92,152 L108,150 L106,128 Z" />
    </g>
    <path d="M118,82 Q112,100 118,118" stroke="#1F4E8C" strokeWidth="3.5" fill="none" />
    <circle cx="150" cy="92" r="5" fill="#1F4E8C" />
    <circle cx="150" cy="92" r="2.2" fill="#F4B83C" />
  </svg>
)

const Badge_GA: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#FBF3D6" />
    <ellipse cx="100" cy="118" rx="58" ry="54" fill="#F2A269" />
    <ellipse cx="78" cy="100" rx="22" ry="18" fill="#E97955" opacity="0.75" />
    <path
      d="M100,72 Q100,118 100,168"
      stroke="#B8492A"
      strokeWidth="3.5"
      fill="none"
      opacity="0.65"
    />
    <path
      d="M100,68 Q102,54 102,46"
      stroke="#5A4A2A"
      strokeWidth="5"
      fill="none"
      strokeLinecap="round"
    />
    <path d="M104,62 Q126,46 148,50 Q140,72 120,76 Q108,76 104,62 Z" fill="#5A8B3A" />
    <path d="M108,66 Q124,58 140,58" stroke="#3F6B26" strokeWidth="2" fill="none" />
  </svg>
)

const Badge_LA: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#5B2C8E" />
    <g fill="#F4B83C">
      <path d="M100,28 Q90,54 90,86 L110,86 Q110,54 100,28 Z" />
      <path d="M62,68 C 54,92 60,114 82,112 Q80,98 78,86 Q74,72 72,66 Q66,62 62,68 Z" />
      <path d="M138,68 C 146,92 140,114 118,112 Q120,98 122,86 Q126,72 128,66 Q134,62 138,68 Z" />
      <rect x="56" y="98" width="88" height="14" rx="2" />
      <path d="M84,112 L90,168 L110,168 L116,112 Z" />
    </g>
  </svg>
)

const Badge_PA: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#003F87" />
    <path d="M44,46 L156,46 L132,156 L68,156 Z" fill="#F4B83C" />
    <g fill="#003F87">
      <rect x="94" y="64" width="12" height="6" />
      <rect x="84" y="70" width="32" height="7" />
      <path d="M76,77 L124,77 L132,118 L68,118 Z" />
      <rect x="64" y="118" width="72" height="9" />
      <rect x="98" y="127" width="4" height="9" />
    </g>
    <path d="M115,77 L113,92 L117,104 L113,118" stroke="#F4B83C" strokeWidth="2.2" fill="none" />
  </svg>
)

const Badge_AL: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-al-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-al-c)">
      <rect width="200" height="200" fill="#F4EBC7" />
      <line x1="22" y1="22" x2="178" y2="178" stroke="#A8222F" strokeWidth="30" />
      <line x1="178" y1="22" x2="22" y2="178" stroke="#A8222F" strokeWidth="30" />
    </g>
  </svg>
)

const Badge_AR: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#BB133E" />
    <polygon points="100,28 162,100 100,172 38,100" fill="#FFFFFF" />
    <polygon points="100,44 148,100 100,156 52,100" fill="#1F4E8C" />
    <g fill="#FFFFFF">
      <circle cx="100" cy="70" r="5" />
      <circle cx="78" cy="100" r="5" />
      <circle cx="122" cy="100" r="5" />
      <circle cx="100" cy="130" r="5" />
    </g>
  </svg>
)

const Badge_CT: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1F4E8C" />
    <path
      d="M68,52 Q58,100 70,148 Q100,160 130,148 Q142,100 132,52 Q100,40 68,52 Z"
      fill="#F4EBC7"
    />
    <g fill="#5A8B3A">
      <circle cx="84" cy="78" r="5.5" />
      <circle cx="100" cy="78" r="5.5" />
      <circle cx="116" cy="78" r="5.5" />
      <circle cx="84" cy="100" r="5.5" />
      <circle cx="100" cy="100" r="5.5" />
      <circle cx="116" cy="100" r="5.5" />
      <circle cx="84" cy="122" r="5.5" />
      <circle cx="100" cy="122" r="5.5" />
      <circle cx="116" cy="122" r="5.5" />
    </g>
    <line x1="100" y1="58" x2="100" y2="142" stroke="#3F6B26" strokeWidth="2" />
  </svg>
)

const Badge_DE: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#003954" />
    <polygon points="100,40 154,100 100,160 46,100" fill="#D9BD7C" />
    <polygon
      points="100,76 106,92 124,92 110,103 116,120 100,109 84,120 90,103 76,92 94,92"
      fill="#003954"
    />
    <path
      d="M72,130 Q100,142 128,130"
      stroke="#003954"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
)

const Badge_IA: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-ia-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-ia-c)">
      <rect x="0" y="0" width="68" height="200" fill="#1F4E8C" />
      <rect x="68" y="0" width="64" height="200" fill="#FFFFFF" />
      <rect x="132" y="0" width="68" height="200" fill="#CD212A" />
    </g>
    <g transform="translate(100 100)">
      <path d="M-24,-6 L0,-24 L24,-6 L14,2 L0,-4 L-14,2 Z" fill="#5A4A2A" />
      <circle cx="0" cy="-10" r="3.5" fill="#1A1814" />
      <path d="M-12,2 Q0,20 12,2 L0,12 Z" fill="#5A4A2A" />
      <path d="M-2,4 L2,4 L0,14 Z" fill="#F4B83C" />
    </g>
  </svg>
)

const Badge_ID: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-id-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-id-c)">
      <rect width="200" height="200" fill="#F2A269" />
      <circle cx="100" cy="124" r="34" fill="#F4B83C" />
      <polygon points="0,150 50,90 90,130 130,70 170,120 200,140 200,200 0,200" fill="#1A3263" />
      <polygon points="0,170 60,130 100,160 150,130 200,160 200,200 0,200" fill="#0B1D3A" />
    </g>
  </svg>
)

const Badge_IN: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1A3263" />
    <g fill="#F4B83C">
      <rect x="94" y="80" width="12" height="64" />
      <rect x="84" y="142" width="32" height="10" />
      <path d="M94,80 Q86,68 92,58 Q100,48 108,58 Q114,68 106,80 Z" />
    </g>
    <g stroke="#F4B83C" strokeWidth="3" strokeLinecap="round">
      <line x1="100" y1="40" x2="100" y2="24" />
      <line x1="76" y1="48" x2="62" y2="38" />
      <line x1="124" y1="48" x2="138" y2="38" />
      <line x1="58" y1="68" x2="40" y2="62" />
      <line x1="142" y1="68" x2="160" y2="62" />
      <line x1="50" y1="92" x2="32" y2="92" />
      <line x1="150" y1="92" x2="168" y2="92" />
    </g>
    <g fill="#F4B83C">
      <circle cx="100" cy="22" r="4.5" />
      <circle cx="62" cy="36" r="3" />
      <circle cx="138" cy="36" r="3" />
      <circle cx="40" cy="60" r="3" />
      <circle cx="160" cy="60" r="3" />
      <circle cx="32" cy="92" r="3" />
      <circle cx="168" cy="92" r="3" />
    </g>
  </svg>
)

const Badge_KS: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#003F87" />
    <g fill="#F4B83C">
      <ellipse cx="100" cy="100" rx="14" ry="50" />
      <ellipse cx="100" cy="100" rx="50" ry="14" />
      <ellipse cx="100" cy="100" rx="14" ry="50" transform="rotate(45 100 100)" />
      <ellipse cx="100" cy="100" rx="14" ry="50" transform="rotate(-45 100 100)" />
    </g>
    <circle cx="100" cy="100" r="20" fill="#5A4A2A" />
    <g fill="#3F2A12">
      <circle cx="93" cy="94" r="2.5" />
      <circle cx="107" cy="94" r="2.5" />
      <circle cx="100" cy="106" r="2.5" />
      <circle cx="88" cy="104" r="2.5" />
      <circle cx="112" cy="104" r="2.5" />
    </g>
  </svg>
)

const Badge_KY: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1F4E8C" />
    <path
      d="M40,140 Q44,118 64,118 L78,108 Q86,86 110,86 Q126,86 134,98 Q152,100 158,116 Q160,130 152,138 L150,158 L138,158 L138,140 L92,140 L92,158 L80,158 L82,140 Q72,140 64,132 L48,138 Z"
      fill="#F4B83C"
    />
    <circle cx="148" cy="106" r="2" fill="#1F4E8C" />
    <path d="M124,90 Q132,84 138,88" stroke="#1F4E8C" strokeWidth="1.8" fill="none" />
  </svg>
)

const Badge_ME: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#E6CFA0" />
    <g fill="#3F6B26">
      <polygon points="100,44 80,74 92,74 72,102 86,102 64,134 90,134 90,156 110,156 110,134 136,134 114,102 128,102 108,74 120,74" />
    </g>
    <rect x="92" y="156" width="16" height="12" fill="#5A4A2A" />
    <polygon
      points="148,42 154,56 168,56 158,66 162,80 148,72 134,80 138,66 128,56 142,56"
      fill="#1F4E8C"
    />
  </svg>
)

const Badge_MI: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1F4E8C" />
    <path d="M36,76 Q60,68 88,72 L102,68 L118,72 L116,82 L96,84 L72,86 L48,88 Z" fill="#5A8B3A" />
    <path
      d="M84,94 Q78,116 82,138 Q88,158 102,164 Q116,168 124,162 L132,168 L140,164 L134,154 L142,140 L144,124 L138,104 L126,96 L100,94 Z"
      fill="#5A8B3A"
    />
  </svg>
)

const Badge_MN: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#A4D4E0" />
    <path d="M22,142 Q100,132 178,142 L178,180 Q100,170 22,180 Z" fill="#5DA8C5" />
    <ellipse cx="96" cy="118" rx="44" ry="14" fill="#1A1814" />
    <ellipse cx="138" cy="106" rx="14" ry="10" fill="#1A1814" />
    <circle cx="148" cy="104" r="2" fill="#FFFFFF" />
    <path d="M152,106 L170,104 L154,112 Z" fill="#F4B83C" />
    <g fill="#FFFFFF">
      <circle cx="92" cy="116" r="2" />
      <circle cx="104" cy="118" r="2" />
      <circle cx="116" cy="116" r="2" />
      <circle cx="82" cy="120" r="2" />
    </g>
  </svg>
)

const Badge_MO: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-mo-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-mo-c)">
      <rect width="200" height="200" fill="#1F4E8C" />
      <path
        d="M38,164 Q38,62 100,46 Q162,62 162,164 L150,164 Q150,74 100,60 Q50,74 50,164 Z"
        fill="#D6D8DB"
      />
      <rect x="20" y="160" width="160" height="20" fill="#5A4A2A" />
    </g>
  </svg>
)

const Badge_MS: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1A3263" />
    <g fill="#FBF3D6">
      <ellipse cx="100" cy="62" rx="20" ry="32" />
      <ellipse cx="100" cy="62" rx="20" ry="32" transform="rotate(72 100 100)" />
      <ellipse cx="100" cy="62" rx="20" ry="32" transform="rotate(144 100 100)" />
      <ellipse cx="100" cy="62" rx="20" ry="32" transform="rotate(216 100 100)" />
      <ellipse cx="100" cy="62" rx="20" ry="32" transform="rotate(288 100 100)" />
    </g>
    <circle cx="100" cy="100" r="14" fill="#F4B83C" />
    <g fill="#5A4A2A">
      <circle cx="100" cy="100" r="2" />
      <circle cx="95" cy="96" r="1.8" />
      <circle cx="105" cy="96" r="1.8" />
      <circle cx="95" cy="104" r="1.8" />
      <circle cx="105" cy="104" r="1.8" />
    </g>
  </svg>
)

const Badge_MT: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-mt-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-mt-c)">
      <rect width="200" height="200" fill="#A4D4E0" />
      <circle cx="156" cy="64" r="14" fill="#F4B83C" />
      <polygon points="0,124 48,82 80,108 122,62 162,98 200,82 200,200 0,200" fill="#3A5A7A" />
      <polygon points="0,148 44,116 76,134 116,98 156,124 200,114 200,200 0,200" fill="#1A3263" />
      <polygon points="0,168 50,144 90,156 132,138 172,156 200,148 200,200 0,200" fill="#0B1D3A" />
    </g>
  </svg>
)

const Badge_NC: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-nc-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-nc-c)">
      <rect x="0" y="0" width="200" height="100" fill="#CD212A" />
      <rect x="0" y="100" width="200" height="100" fill="#FFFFFF" />
      <rect x="0" y="0" width="80" height="200" fill="#1F4E8C" />
    </g>
    <polygon
      points="40,86 46,100 60,100 50,108 54,122 40,114 26,122 30,108 20,100 34,100"
      fill="#FFFFFF"
    />
  </svg>
)

const Badge_ND: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#E6CFA0" />
    <path
      d="M28,116 Q34,92 54,90 L66,72 Q82,68 96,80 L132,80 Q152,86 156,108 L160,122 L162,134 L154,138 L154,152 L144,152 L142,138 L74,138 L70,152 L60,152 L60,134 L34,128 Z"
      fill="#3F2A12"
    />
    <circle cx="74" cy="98" r="2" fill="#E6CFA0" />
    <path d="M80,80 L76,68 L82,70 Z M90,78 L92,68 L94,76 Z" fill="#3F2A12" />
    <path d="M28,168 Q100,160 172,168" stroke="#5A8B3A" strokeWidth="3" fill="none" />
  </svg>
)

const Badge_NE: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#003F87" />
    <rect x="96" y="64" width="8" height="108" fill="#5A8B3A" />
    <g fill="#F4B83C">
      <ellipse cx="100" cy="58" rx="10" ry="16" />
      <ellipse cx="78" cy="72" rx="18" ry="7" transform="rotate(-32 78 72)" />
      <ellipse cx="122" cy="72" rx="18" ry="7" transform="rotate(32 122 72)" />
      <ellipse cx="72" cy="96" rx="22" ry="8" transform="rotate(-22 72 96)" />
      <ellipse cx="128" cy="96" rx="22" ry="8" transform="rotate(22 128 96)" />
      <ellipse cx="68" cy="124" rx="26" ry="9" transform="rotate(-15 68 124)" />
      <ellipse cx="132" cy="124" rx="26" ry="9" transform="rotate(15 132 124)" />
      <ellipse cx="64" cy="152" rx="28" ry="10" transform="rotate(-10 64 152)" />
      <ellipse cx="136" cy="152" rx="28" ry="10" transform="rotate(10 136 152)" />
    </g>
  </svg>
)

const Badge_NH: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1F4E8C" />
    <path
      d="M46,180 L46,82 Q50,68 64,72 L78,56 Q92,48 102,62 L110,50 Q124,46 130,62 L140,72 Q154,76 160,92 L166,104 L158,112 L164,124 L154,134 L162,144 L154,160 L160,180 Z"
      fill="#9AA0A4"
    />
    <path
      d="M160,92 Q158,98 162,104 L158,108 Q160,114 156,118 L160,124 Q156,130 160,134"
      stroke="#3F4548"
      strokeWidth="2.5"
      fill="none"
    />
    <circle cx="154" cy="100" r="2.5" fill="#3F4548" />
  </svg>
)

const Badge_NV: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1F4E8C" />
    <polygon
      points="100,30 122,90 184,90 134,124 152,184 100,146 48,184 66,124 16,90 78,90"
      fill="#D6D8DB"
    />
    <polygon
      points="100,68 108,90 130,90 112,104 118,124 100,112 82,124 88,104 70,90 92,90"
      fill="#9AA0A4"
    />
  </svg>
)

const Badge_OK: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#5DA8C5" />
    <g stroke="#3F2A12" strokeWidth="5" strokeLinecap="round">
      <line x1="46" y1="154" x2="154" y2="56" />
      <line x1="46" y1="56" x2="154" y2="154" />
    </g>
    <g fill="#5A8B3A">
      <ellipse cx="142" cy="64" rx="6" ry="3.5" transform="rotate(-40 142 64)" />
      <ellipse cx="150" cy="72" rx="6" ry="3.5" transform="rotate(-40 150 72)" />
    </g>
    <path
      d="M60,72 Q60,66 66,66 L134,66 Q140,66 140,72 L134,128 Q130,144 100,150 Q70,144 66,128 Z"
      fill="#E6CFA0"
      stroke="#3F2A12"
      strokeWidth="2.5"
    />
    <g fill="#5A4A2A">
      <circle cx="84" cy="92" r="3" />
      <circle cx="100" cy="92" r="3" />
      <circle cx="116" cy="92" r="3" />
      <circle cx="92" cy="110" r="3" />
      <circle cx="108" cy="110" r="3" />
      <circle cx="100" cy="128" r="3" />
    </g>
  </svg>
)

const Badge_OR: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1A3263" />
    <g fill="#3F6B26">
      <polygon points="100,32 82,58 118,58" />
      <polygon points="100,54 74,84 126,84" />
      <polygon points="100,76 66,110 134,110" />
      <polygon points="100,98 58,136 142,136" />
      <polygon points="100,120 52,160 148,160" />
    </g>
    <rect x="92" y="160" width="16" height="12" fill="#5A4A2A" />
  </svg>
)

const Badge_RI: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#FBF3D6" />
    <g fill="#F4B83C" stroke="#5A4A2A" strokeWidth="3" strokeLinejoin="round">
      <circle cx="100" cy="46" r="7" />
      <rect x="96" y="52" width="8" height="92" />
      <rect x="78" y="62" width="44" height="8" />
      <path d="M54,124 Q54,158 100,158 Q146,158 146,124 L132,124 Q132,144 100,144 Q68,144 68,124 Z" />
    </g>
    <g fill="#1F4E8C">
      <circle cx="50" cy="70" r="3" />
      <circle cx="150" cy="70" r="3" />
      <circle cx="40" cy="100" r="3" />
      <circle cx="160" cy="100" r="3" />
      <circle cx="50" cy="132" r="3" />
      <circle cx="150" cy="132" r="3" />
    </g>
  </svg>
)

const Badge_SD: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#5DA8C5" />
    <circle cx="100" cy="100" r="34" fill="#F4B83C" />
    <g stroke="#F4B83C" strokeWidth="7" strokeLinecap="round">
      <line x1="100" y1="58" x2="100" y2="40" />
      <line x1="100" y1="142" x2="100" y2="160" />
      <line x1="58" y1="100" x2="40" y2="100" />
      <line x1="142" y1="100" x2="160" y2="100" />
      <line x1="70" y1="70" x2="56" y2="56" />
      <line x1="130" y1="130" x2="144" y2="144" />
      <line x1="130" y1="70" x2="144" y2="56" />
      <line x1="70" y1="130" x2="56" y2="144" />
    </g>
    <polygon
      points="100,82 106,96 120,96 110,104 114,118 100,110 86,118 90,104 80,96 94,96"
      fill="#FBF3D6"
    />
  </svg>
)

const Badge_UT: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#E6CFA0" />
    <g fill="#B87333">
      <ellipse cx="100" cy="150" rx="44" ry="10" />
      <ellipse cx="100" cy="132" rx="40" ry="10" />
      <ellipse cx="100" cy="116" rx="36" ry="10" />
      <ellipse cx="100" cy="102" rx="32" ry="10" />
      <ellipse cx="100" cy="88" rx="28" ry="10" />
      <ellipse cx="100" cy="76" rx="22" ry="10" />
      <ellipse cx="100" cy="64" rx="14" ry="10" />
    </g>
    <ellipse cx="100" cy="140" rx="6" ry="3.5" fill="#1A1814" />
    <g fill="#5A4A2A">
      <circle cx="78" cy="160" r="2.5" />
      <circle cx="122" cy="160" r="2.5" />
    </g>
  </svg>
)

const Badge_VA: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#EFE4BD" />
    <path
      d="M52,118 Q54,82 84,68 L92,52 L100,68 Q126,72 138,92 L156,86 L150,100 L144,110 Q140,130 118,140 L122,150 L110,148 L100,154 L90,148 L78,150 L82,140 Q62,134 52,118 Z"
      fill="#CD212A"
    />
    <polygon points="80,48 92,68 70,68" fill="#CD212A" />
    <circle cx="60" cy="100" r="2.5" fill="#1A1814" />
    <path d="M44,108 L62,104 L46,114 Z" fill="#F4B83C" />
    <path d="M88,70 L92,60 L84,64 Z" fill="#1A1814" />
  </svg>
)

const Badge_VT: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-vt-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-vt-c)">
      <rect width="200" height="200" fill="#A4D4E0" />
      <path
        d="M0,150 Q40,118 80,134 Q120,108 160,124 Q180,116 200,138 L200,200 L0,200 Z"
        fill="#5A8B3A"
      />
      <path d="M0,172 Q50,148 100,162 Q150,150 200,170 L200,200 L0,200 Z" fill="#3F6B26" />
      <polygon points="100,72 78,134 94,134 94,158 106,158 106,134 122,134" fill="#1A3263" />
      <rect x="96" y="158" width="8" height="10" fill="#5A4A2A" />
    </g>
  </svg>
)

const Badge_WA: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#3F6B26" />
    <path
      d="M58,184 L58,150 Q52,142 56,132 L52,116 Q56,98 66,88 L70,74 Q76,58 94,54 L100,40 Q120,38 130,54 L138,68 Q150,80 148,98 L152,114 Q152,128 144,138 L142,150 L142,184 Z"
      fill="#FBF3D6"
    />
    <path d="M52,116 Q42,124 48,142 Q54,152 58,150" fill="#FBF3D6" />
    <circle cx="140" cy="102" r="2.2" fill="#3F6B26" />
    <path d="M138,114 Q142,118 138,122" stroke="#3F6B26" strokeWidth="1.8" fill="none" />
  </svg>
)

const Badge_WI: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1F4E8C" />
    <polygon points="36,144 164,76 164,144" fill="#F4B83C" />
    <polygon points="36,144 164,76 164,86 50,150" fill="#E89F2E" />
    <g fill="#E89F2E">
      <circle cx="96" cy="118" r="4.5" />
      <circle cx="120" cy="106" r="4" />
      <circle cx="142" cy="96" r="3.5" />
      <circle cx="78" cy="130" r="3.5" />
      <circle cx="150" cy="124" r="3.5" />
      <circle cx="112" cy="132" r="3.5" />
    </g>
  </svg>
)

const Badge_WV: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-wv-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-wv-c)">
      <rect width="200" height="200" fill="#F2A269" />
      <circle cx="148" cy="60" r="14" fill="#F4B83C" />
      <path d="M0,140 L40,80 L80,124 L120,64 L160,114 L200,80 L200,200 L0,200 Z" fill="#5A4A2A" />
      <path
        d="M0,162 L50,114 L90,150 L130,104 L170,142 L200,124 L200,200 L0,200 Z"
        fill="#3F2A12"
      />
    </g>
  </svg>
)

const Badge_WY: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <circle cx="100" cy="100" r="95" fill="#1F4E8C" />
    <circle cx="100" cy="100" r="76" fill="#FFFFFF" />
    <circle cx="100" cy="100" r="62" fill="#CD212A" />
    <g fill="#FFFFFF">
      <path d="M58,118 Q66,98 88,96 Q106,92 122,102 L132,96 L140,100 L136,110 L142,116 L138,126 L130,124 L122,134 L114,128 L102,132 L92,124 L80,128 L70,134 L62,128 Z" />
      <circle cx="116" cy="78" r="6" />
      <path d="M110,84 L122,84 L120,100 L108,100 Z" />
      <path d="M104,72 L128,72 L132,68 L122,66 L122,60 L114,60 L114,66 L106,68 Z" />
      <path d="M120,84 L138,68 L142,72 L124,90 Z" />
    </g>
  </svg>
)

const Badge_FED: BadgeComponent = () => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <defs>
      <clipPath id="b-fed-c">
        <circle cx="100" cy="100" r="95" />
      </clipPath>
    </defs>
    <g clipPath="url(#b-fed-c)">
      <rect width="200" height="200" fill="#FFFFFF" />
      <rect y="16" width="200" height="16" fill="#BB133E" />
      <rect y="48" width="200" height="16" fill="#BB133E" />
      <rect y="80" width="200" height="16" fill="#BB133E" />
      <rect y="112" width="200" height="16" fill="#BB133E" />
      <rect y="144" width="200" height="16" fill="#BB133E" />
      <rect y="176" width="200" height="16" fill="#BB133E" />
      <rect width="90" height="96" fill="#1F4E8C" />
      <g fill="#FFFFFF">
        <polygon points="22,22 24,28 30,28 25,32 27,38 22,34 17,38 19,32 14,28 20,28" />
        <polygon points="44,22 46,28 52,28 47,32 49,38 44,34 39,38 41,32 36,28 42,28" />
        <polygon points="66,22 68,28 74,28 69,32 71,38 66,34 61,38 63,32 58,28 64,28" />
        <polygon points="33,42 35,48 41,48 36,52 38,58 33,54 28,58 30,52 25,48 31,48" />
        <polygon points="55,42 57,48 63,48 58,52 60,58 55,54 50,58 52,52 47,48 53,48" />
        <polygon points="22,62 24,68 30,68 25,72 27,78 22,74 17,78 19,72 14,68 20,68" />
        <polygon points="44,62 46,68 52,68 47,72 49,78 44,74 39,78 41,72 36,68 42,68" />
        <polygon points="66,62 68,68 74,68 69,72 71,78 66,74 61,78 63,72 58,68 64,68" />
        <polygon points="33,82 35,88 41,88 36,92 38,98 33,94 28,98 30,92 25,88 31,88" />
        <polygon points="55,82 57,88 63,88 58,92 60,98 55,94 50,98 52,92 47,88 53,88" />
      </g>
    </g>
  </svg>
)

const DESIGNED_BADGES: Record<string, BadgeComponent> = {
  CA: Badge_CA,
  TX: Badge_TX,
  NY: Badge_NY,
  FL: Badge_FL,
  HI: Badge_HI,
  AK: Badge_AK,
  AZ: Badge_AZ,
  NM: Badge_NM,
  MD: Badge_MD,
  SC: Badge_SC,
  CO: Badge_CO,
  TN: Badge_TN,
  OH: Badge_OH,
  IL: Badge_IL,
  NJ: Badge_NJ,
  MA: Badge_MA,
  GA: Badge_GA,
  LA: Badge_LA,
  PA: Badge_PA,
  AL: Badge_AL,
  AR: Badge_AR,
  CT: Badge_CT,
  DE: Badge_DE,
  IA: Badge_IA,
  ID: Badge_ID,
  IN: Badge_IN,
  KS: Badge_KS,
  KY: Badge_KY,
  ME: Badge_ME,
  MI: Badge_MI,
  MN: Badge_MN,
  MO: Badge_MO,
  MS: Badge_MS,
  MT: Badge_MT,
  NC: Badge_NC,
  ND: Badge_ND,
  NE: Badge_NE,
  NH: Badge_NH,
  NV: Badge_NV,
  OK: Badge_OK,
  OR: Badge_OR,
  RI: Badge_RI,
  SD: Badge_SD,
  UT: Badge_UT,
  VA: Badge_VA,
  VT: Badge_VT,
  WA: Badge_WA,
  WI: Badge_WI,
  WV: Badge_WV,
  WY: Badge_WY,
  FED: Badge_FED,
  IRS: Badge_FED,
}

// Stub for now — add Simple_XX entries here when you build small-size
// variants. The component falls back to the detailed design when a
// simple version isn't registered, so this is purely additive.
const SIMPLE_BADGES: Record<string, BadgeComponent> = {}

export const StateBadge = React.forwardRef<HTMLSpanElement, StateBadgeProps>(
  ({ code, size = 'md', variant = 'auto', title, className, style, ...rest }, ref) => {
    const px = sizePx[size]
    const upper = code.toUpperCase()
    const useSimple =
      variant === 'simple' || (variant === 'auto' && (size === 'xs' || size === 'sm'))
    const Designed = (useSimple && SIMPLE_BADGES[upper]) || DESIGNED_BADGES[upper]
    const tooltip = title ?? NAMES[upper] ?? upper

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

    return (
      <span
        ref={ref}
        title={tooltip}
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
        {Designed ? (
          <Designed />
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
  },
)
StateBadge.displayName = 'StateBadge'

/**
 * Resolve a two-letter code (CA, TX, …), "FED", or "IRS" to its full
 * jurisdiction name ("California", "Texas", "Federal"). Returns the
 * uppercased code itself when no name is registered, so layout never
 * collapses to an empty string.
 *
 * 2026-05-26 (Yuqi /alerts follow-up): exported so the alerts
 * table's jurisdiction chip can render `[SVG] CA · California` without
 * each call site hand-rolling its own state-name map.
 */
export function getJurisdictionName(code: string): string {
  const upper = code.toUpperCase()
  return NAMES[upper] ?? upper
}
