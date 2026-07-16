// Generates the branded Open Graph cards under public/og/ from an inline SVG,
// rendered to PNG with sharp (already on disk via Astro's image pipeline). Run
// once and commit the PNGs — they are static assets, not built per request:
//
//   node apps/marketing/scripts/generate-og.mjs
//
// Why a script + committed PNGs (not build-time generation): OG cards change
// rarely, social scrapers need a real PNG, and committing them keeps the build
// dependency-free and the output font-stable (rendered here, once). Replaces the
// previous solid-navy placeholder that every page shared (SEO/GEO audit P1-2).
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
// sharp isn't a direct dependency of @duedatehq/marketing — it ships as part of
// Astro's image pipeline. Resolve it through Astro's module context so this
// script works from a clean pnpm install without adding a dependency.
let sharp
try {
  sharp = require('sharp')
} catch {
  sharp = createRequire(require.resolve('astro'))('sharp')
}
const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public/og')

// Brand palette — navy canvas, white ink, cyan accent (matches the marketing tokens).
const NAVY = '#0A2540'
const NAVY_DEEP = '#071A2E'
const WHITE = '#FFFFFF'
const CYAN = '#54C5DB'
const MUTED = '#9FB6CC'
const HAIRLINE = '#1C3A57'

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** @param {{ wordmark: string, eyebrow: string, headline: string[], chips: string[], sans: string }} c */
function card(c) {
  const headlineLines = c.headline
    .map(
      (line, i) =>
        `<text x="80" y="${300 + i * 78}" font-family="${c.sans}" font-size="64" font-weight="600" fill="${WHITE}">${esc(line)}</text>`,
    )
    .join('')
  const chipGap = 16
  let chipX = 80
  const chips = c.chips
    .map((label) => {
      const w = 34 + label.length * (/[一-鿿]/.test(label) ? 26 : 13)
      const el = `<g transform="translate(${chipX} 520)">
        <rect width="${w}" height="48" rx="24" fill="none" stroke="${HAIRLINE}" stroke-width="1.5"/>
        <circle cx="26" cy="24" r="4" fill="${CYAN}"/>
        <text x="42" y="31" font-family="${c.sans}" font-size="22" fill="${MUTED}">${esc(label)}</text>
      </g>`
      chipX += w + chipGap
      return el
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NAVY}"/>
      <stop offset="1" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.12" cy="0.1" r="0.6">
      <stop offset="0" stop-color="${CYAN}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${CYAN}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="1200" height="6" fill="${CYAN}"/>
  <text x="80" y="120" font-family="${c.sans}" font-size="40" font-weight="700" fill="${WHITE}" letter-spacing="-0.5">${esc(c.wordmark)}</text>
  <text x="80" y="190" font-family="${c.sans}" font-size="22" font-weight="600" fill="${CYAN}" letter-spacing="2">${esc(c.eyebrow)}</text>
  ${headlineLines}
  ${chips}
</svg>`
}

const SANS_EN = 'Helvetica Neue, Helvetica, Arial, sans-serif'
const SANS_ZH = 'PingFang SC, Hiragino Sans GB, Helvetica, Arial, sans-serif'

// One branded card per PAGE TYPE (not per page) — each .astro route picks the
// card that matches its category, so a state page, a guide, a comparison, and a
// rule reference each get a distinct, topical social/AI preview instead of the
// generic home card. Per-type (≈8 cards) rather than per-page (≈150) keeps the
// committed PNGs small and the script maintainable; the route IS the category,
// so wiring lives in the page templates (ogImage prop), not 30 data literals.
const CATEGORIES = [
  {
    key: 'home',
    en: {
      eyebrow: 'DEADLINE-CHANGE MONITORING FOR US CPA PRACTICES',
      headline: ['Catch every tax-deadline change —', 'and see exactly who it affects.'],
      chips: ['FED + 50 states + DC', 'A source on every date'],
    },
    zh: {
      eyebrow: '面向美国 CPA 事务所的截止日变化监控',
      headline: ['抓住每一次税务截止日变化，', '看清它影响到哪些客户。'],
      chips: ['联邦 + 50 州 + DC', '每个日期都附官方来源'],
    },
  },
  {
    key: 'how-it-works',
    en: {
      eyebrow: 'HOW IT WORKS · PRODUCT WALKTHROUGH',
      headline: ['From a deadline change', 'to the clients it affects.'],
      chips: ['Watch · Match · Rank · Apply', 'A source on every date'],
    },
    zh: {
      eyebrow: '产品导览 · 如何运作',
      headline: ['从一次截止日变化，', '到它牵动的每个客户。'],
      chips: ['监测 · 匹配 · 排序 · 应用', '每个日期都附来源'],
    },
  },
  {
    key: 'coverage',
    en: {
      eyebrow: 'COVERAGE · FEDERAL + EVERY STATE',
      headline: ['Federal, every state,', 'and DC — monitored.'],
      chips: ['FED + 50 states + DC', 'A source on every date'],
    },
    zh: {
      eyebrow: '覆盖范围 · 联邦 + 全部州',
      headline: ['联邦、每个州', '与 DC——全程监控。'],
      chips: ['联邦 + 50 州 + DC', '每个日期都附来源'],
    },
  },
  {
    key: 'state',
    en: {
      eyebrow: 'STATE TAX DEADLINE MONITORING',
      headline: ['State tax deadlines,', 'monitored at the source.'],
      chips: ['50 states + DC', 'A source on every date'],
    },
    zh: {
      eyebrow: '州税务截止日监控',
      headline: ['州税务截止日，', '先从官方来源复核。'],
      chips: ['50 州 + DC', '每个日期都附来源'],
    },
  },
  {
    key: 'rule',
    en: {
      eyebrow: 'RULE REFERENCE',
      headline: ['Tax-deadline rules,', 'with the source attached.'],
      chips: ['IRS-sourced dates', 'Human review gate'],
    },
    zh: {
      eyebrow: '规则参考',
      headline: ['税务截止日规则，', '每条都附官方来源。'],
      chips: ['IRS 来源日期', '人工复核门槛'],
    },
  },
  {
    key: 'guide',
    en: {
      eyebrow: 'DEADLINE OPERATIONS GUIDE',
      headline: ['Field guides for', 'CPA deadline operations.'],
      chips: ['Source-backed', 'Built for CPA teams'],
    },
    zh: {
      eyebrow: '截止日运营指南',
      headline: ['面向 CPA 团队的', '截止日运营指南。'],
      chips: ['带官方来源', '为 CPA 团队打造'],
    },
  },
  {
    key: 'compare',
    en: {
      eyebrow: 'HOW DUEDATEHQ COMPARES',
      headline: ['A monitoring layer,', 'not another suite.'],
      chips: ['Source-backed alerts', 'Layered on your stack'],
    },
    zh: {
      eyebrow: 'DueDateHQ 对比',
      headline: ['一个监控层，', '而不是又一套系统。'],
      chips: ['带来源的提醒', '叠加在你的工具栈上'],
    },
  },
  {
    key: 'pricing',
    en: {
      eyebrow: 'PRICING',
      headline: ['Simple pricing for', 'CPA practices.'],
      chips: ['Built for CPA teams', 'Source-backed monitoring'],
    },
    zh: {
      eyebrow: '定价',
      headline: ['面向 CPA 事务所的', '简洁定价。'],
      chips: ['为 CPA 团队打造', '带来源的监控'],
    },
  },
  {
    key: 'resources',
    en: {
      eyebrow: 'RESOURCES',
      headline: ['Guides, comparisons,', 'and state coverage.'],
      chips: ['Field guides', 'FED + 50 states + DC'],
    },
    zh: {
      eyebrow: '资源',
      headline: ['指南、对比', '与州覆盖。'],
      chips: ['实战指南', '联邦 + 50 州 + DC'],
    },
  },
  {
    key: 'stack',
    en: {
      eyebrow: 'WORKS WITH YOUR STACK',
      headline: ['The deadline layer', 'for the stack you run.'],
      chips: ['Complement, not replacement', 'Layered on your tools'],
    },
    zh: {
      eyebrow: '兼容你的工具栈',
      headline: ['为你已有的工具栈', '补上截止日那一层。'],
      chips: ['补充，而非替换', '叠加在你的工具之上'],
    },
  },
]

const CARDS = {}
for (const c of CATEGORIES) {
  CARDS[`${c.key}.en.png`] = card({ sans: SANS_EN, wordmark: 'DueDateHQ', ...c.en })
  CARDS[`${c.key}.zh-CN.png`] = card({ sans: SANS_ZH, wordmark: 'DueDateHQ', ...c.zh })
}

for (const [file, svg] of Object.entries(CARDS)) {
  const out = resolve(outDir, file)
  await sharp(Buffer.from(svg)).png().toFile(out)
  console.log('wrote', out)
}
