#!/usr/bin/env node
/**
 * daily-broadcast.mjs — 每日 IRS 截止日播报（news engine）
 *
 * 每天一条播报，把 alert 当新闻播出去。产物是「已渲染的成品图」：
 *   - 小红书：中文，1080×1440 (3:4)
 *   - LinkedIn：英文配图，1080×1350 (4:5) + 英文正文
 * 头条 = 当前最紧的截止日倒计时(每天自动变)；ticker = 下一批 + 在生效快照。
 * 数据源与 X / social-manual 一致：outreach-kit/disaster-notices.json。
 *
 * 用法：node scripts/daily-broadcast.mjs [YYYY-MM-DD]   (默认今天)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const OUT = path.join(ROOT, 'docs/marketing/xiaohongshu/broadcast')
fs.mkdirSync(OUT, { recursive: true })

const argDate = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
const today = argDate ? new Date(argDate + 'T12:00:00Z') : new Date()
const iso = today.toISOString().slice(0, 10)

const CN = {
  AL: '阿拉巴马',
  AK: '阿拉斯加',
  AZ: '亚利桑那',
  AR: '阿肯色',
  CA: '加利福尼亚',
  CO: '科罗拉多',
  CT: '康涅狄格',
  DE: '特拉华',
  FL: '佛罗里达',
  GA: '佐治亚',
  HI: '夏威夷',
  ID: '爱达荷',
  IL: '伊利诺伊',
  IN: '印第安纳',
  IA: '爱荷华',
  KS: '堪萨斯',
  KY: '肯塔基',
  LA: '路易斯安那',
  ME: '缅因',
  MD: '马里兰',
  MA: '马萨诸塞',
  MI: '密歇根',
  MN: '明尼苏达',
  MS: '密西西比',
  MO: '密苏里',
  MT: '蒙大拿',
  NE: '内布拉斯加',
  NV: '内华达',
  NH: '新罕布什尔',
  NJ: '新泽西',
  NM: '新墨西哥',
  NY: '纽约',
  NC: '北卡罗来纳',
  ND: '北达科他',
  OH: '俄亥俄',
  OK: '俄克拉何马',
  OR: '俄勒冈',
  PA: '宾夕法尼亚',
  RI: '罗得岛',
  SC: '南卡罗来纳',
  SD: '南达科他',
  TN: '田纳西',
  TX: '德克萨斯',
  UT: '犹他',
  VT: '佛蒙特',
  VA: '弗吉尼亚',
  WA: '华盛顿',
  WV: '西弗吉尼亚',
  WI: '威斯康星',
  WY: '怀俄明',
  DC: '华盛顿特区',
  PR: '波多黎各',
  MP: '北马里亚纳群岛',
  VI: '美属维尔京群岛',
  GU: '关岛',
  AS: '美属萨摩亚',
}
const TERR = new Set(['PR', 'MP', 'VI', 'GU', 'AS', 'DC'])
const cn = (a) => CN[a] || a
const mdY = (s) => {
  const [, m, d] = s.split('-')
  return `${+m}月${+d}日`
}
const enMD = (s) => {
  const [, m, d] = s.split('-')
  return (
    ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m] +
    ' ' +
    +d
  )
}
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - a) / 86400000)

// ---------- data ----------
const raw = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'outreach-kit/disaster-notices.json'), 'utf8'),
)
const notices = Array.isArray(raw) ? raw : raw.notices || Object.values(raw)
const juris = [...new Set(notices.map((n) => n.abbr))]
const stateCount = juris.filter((a) => !TERR.has(a)).length
const terrCount = juris.filter((a) => TERR.has(a)).length

const upcoming = notices
  .filter((n) => n.deadline >= iso)
  .sort((a, b) => a.deadline.localeCompare(b.deadline))
const lead = upcoming[0] || [...notices].sort((a, b) => b.deadline.localeCompare(a.deadline))[0]
const daysLeft = Math.max(0, daysBetween(today, lead.deadline))
const countyN = (lead.affectedArea.match(/,/g) || []).length + 1
// 下一批：lead 之后的第一个不同截止日
const nextDate = upcoming.map((n) => n.deadline).find((d) => d !== lead.deadline)
const nextStatesCN = nextDate
  ? [...new Set(upcoming.filter((n) => n.deadline === nextDate).map((n) => cn(n.abbr)))].join(' · ')
  : ''
const nextStatesEN = nextDate
  ? [...new Set(upcoming.filter((n) => n.deadline === nextDate).map((n) => n.state))].join(' & ')
  : ''

const D = {
  iso,
  leadCN: cn(lead.abbr),
  leadEN: lead.state,
  daysLeft,
  countyN,
  code: lead.code,
  deadlineCN: mdY(lead.deadline),
  deadlineEN: enMD(lead.deadline),
  nextCN: nextStatesCN,
  nextDateCN: nextDate ? mdY(nextDate) : '',
  nextEN: nextStatesEN,
  nextDateEN: nextDate ? enMD(nextDate) : '',
  active: notices.length,
  stateCount,
  terrCount,
  todayEN: enMD(iso),
  todayMonthEN: enMD(iso).split(' ')[0],
  year: iso.slice(0, 4),
  dateCN: `${iso.slice(0, 4)}年${+iso.slice(5, 7)}月${+iso.slice(8, 10)}日`,
}

// ---------- wordmark ----------
const wmSrc = fs.readFileSync(
  path.join(ROOT, 'packages/ui/src/assets/brand/brand-wordmark.svg'),
  'utf8',
)
const wmInner = wmSrc
  .slice(wmSrc.indexOf('>', wmSrc.indexOf('<svg')) + 1, wmSrc.lastIndexOf('</svg>'))
  .replace(/<title>.*?<\/title>/s, '')
  .trim()
const LIGHT = !process.argv.includes('--dark')  // 浅色默认；--dark 出深色
const T = LIGHT
  ? { page: '#e6e4dc', bg: '#f4f3ee', ink: '#1e2138', ink2: '#33364a', sub: '#5a5d70', mut: '#8a8d9c', accent: '#2e368c', line: '#e5e1d7', wmInk: '#2e368c', wmBar: '#f4f3ee' }
  : { page: '#0f1016', bg: '#2e368c', ink: '#ffffff', ink2: '#eef0fb', sub: '#c2c6ee', mut: '#8f95cf', accent: '#14c5f6', line: 'rgba(255,255,255,.14)', wmInk: '#f2f4ee', wmBar: '#2e368c' }
const WM = wmInner.replaceAll('#1F315C', T.wmInk).replaceAll('#F2F4ED', T.wmBar)

// ---------- shared style ----------
const base = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:${T.page};font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif;display:flex;gap:34px;padding:40px;align-items:flex-start}
  .num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
  .card{background:${T.bg};color:${T.ink};overflow:hidden;display:flex;flex-direction:column;position:relative}
  .wm{width:112px;height:15px;display:block;opacity:${LIGHT ? '.8' : '.85'}}
  .eyebrow{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;letter-spacing:.06em;color:${T.sub}}
  .live{display:inline-flex;align-items:center;gap:7px;color:${T.accent}}
  .dot{width:8px;height:8px;border-radius:999px;background:${T.accent};display:inline-block}
  .kick{color:${T.mut};font-weight:500}
  .cd{display:flex;align-items:baseline;gap:12px;margin-top:20px}
  .cd b{font-size:128px;font-weight:800;color:${T.accent};line-height:.9;letter-spacing:-.03em}
  .cd s{text-decoration:none;font-size:40px;font-weight:700}
  .cd .lead{font-size:34px;font-weight:600;color:${T.ink};margin-right:6px}
  .facts{display:flex;flex-direction:column;gap:12px}
  .facts .f{font-size:20px;color:${T.ink2};line-height:1.5}
  .facts .f b{color:${T.ink};font-weight:700}
  .tick{border-top:1px solid ${T.line};padding-top:20px;display:flex;flex-direction:column;gap:12px}
  .tick .t{font-size:17px;color:${T.sub};display:flex;gap:10px}
  .tick .t i{font-style:normal;color:${T.mut};font-weight:600;min-width:74px}
  .foot{font-size:14px;color:${T.mut}}
`

// 小红书 3:4
const xhs = `<!doctype html><meta charset=utf8><style>${base}
  .xhs{width:540px;height:720px;padding:46px 44px}
  .xhs .headline{margin-top:24px;font-size:40px;font-weight:700;line-height:1.2}
  .xhs .facts{margin-top:22px}.xhs .tick{margin-top:auto}
  .xhs .top{display:flex;justify-content:space-between;align-items:center}
</style>
<div class="card xhs" style="width:540px;height:720px">
  <div class=top><svg class=wm viewBox="0 0 1165 154">${WM}</svg><span class="foot num">${D.dateCN}</span></div>
  <div class=eyebrow style="margin-top:30px"><span class=live><span class=dot></span>每日播报</span><span class=kick>IRS 报税截止日</span></div>
  <div class=headline>${D.leadCN}报税截止日</div>
  <div class="cd num"><span class=lead>还剩</span><b>${D.daysLeft}</b><s>天</s></div>
  <div class=facts>
    <div class=f><b>${D.deadlineCN}</b>到期 · ${D.countyN} 个县 · 灾害延期 ${D.code}</div>
    <div class=f>覆盖 个人 / 公司 / 合伙 / 信托 / 工资税 / 预估税 等</div>
  </div>
  <div class=tick>
    ${D.nextCN ? `<div class=t><i>下一批</i><span>${D.nextCN} · ${D.nextDateCN}</span></div>` : ''}
    <div class=t><i>在生效</i><span>${D.active} 份延期，覆盖 ${D.stateCount} 州 + ${D.terrCount} 地区</span></div>
  </div>
  <div class=foot style="margin-top:22px">美国报税不漏DDL · 每天播报</div>
</div>`

// LinkedIn 1:1
const li = `<!doctype html><meta charset=utf8><style>${base}
  .li{width:540px;height:675px;padding:44px 42px}
  .li .headline{margin-top:30px;font-size:23px;font-weight:700;letter-spacing:.07em;line-height:1.15;color:${T.ink};text-transform:uppercase}
  .li .cd{margin-top:2px}.li .cd b{font-size:150px}.li .cd s{font-size:34px;font-weight:700}
  .li .facts{margin-top:30px}.li .facts .f{font-size:18px}
  .li .tick{margin-top:auto}.li .tick .t{font-size:15px}.li .tick .t i{min-width:66px}
  .li .top{display:flex;justify-content:space-between;align-items:center}
</style>
<div class="card li" style="width:540px;height:675px">
  <div class=top><svg class=wm viewBox="0 0 1165 154">${WM}</svg><span class="foot num">${D.todayEN}, ${D.year}</span></div>
  <div class=eyebrow style="margin-top:22px"><span class=live><span class=dot></span>IRS DEADLINE DAILY</span></div>
  <div class=headline>${D.leadEN}</div>
  <div class="cd num"><b>${D.daysLeft}</b><s>days left</s></div>
  <div class=facts>
    <div class=f>Due <b>${D.deadlineEN}</b> · ${D.countyN} counties · relief ${D.code}</div>
    <div class=f>Covers individual, corporate, partnership, trust, payroll, estimated &amp; more</div>
  </div>
  <div class=tick>
    ${D.nextEN ? `<div class=t><i>Next</i><span>${D.nextEN} — ${D.nextDateEN}</span></div>` : ''}
    <div class=t><i>Active</i><span>${D.active} reliefs across ${D.stateCount} states + ${D.terrCount} territory</span></div>
  </div>
  <div class=foot style="margin-top:18px">DueDateHQ · daily · duedatehq.com/irs-disaster-relief</div>
</div>`

// ---------- render ----------
const browser = await chromium.launch()
async function shot(htmlStr, sel, file) {
  const p = await browser.newPage({ viewport: { width: 640, height: 820 }, deviceScaleFactor: 2 })
  await p.setContent(htmlStr, { waitUntil: 'networkidle' })
  const el = await p.$(sel)
  const of = await el.evaluate((e) => e.scrollHeight - e.clientHeight)
  await el.screenshot({ path: path.join(OUT, file) })
  await p.close()
  return of
}
const sfx = LIGHT ? '' : '-dark'
const of1 = await shot(xhs, '.card', `xhs-${iso}${sfx}.png`)
const of2 = await shot(li, '.card', `linkedin-${iso}${sfx}.png`)
await browser.close()

// ---------- captions ----------
const xhsCap = `【标题】倒计时${D.daysLeft}天⏰${D.leadCN}报税DDL要到了

手上有${D.leadCN}客户的注意：${D.deadlineCN}，这 ${D.countyN} 个县的联邦报税截止日就到了（灾害延期 ${D.code}）。

📌 延期按 address of record 自动生效——先逐个核对客户地址
📌 覆盖个人/公司/合伙/信托/工资税/预估税等，窗口内到期的一并顺延
📌 下一批：${D.nextCN} ${D.nextDateCN}

收藏，报税季不漏单👇
#美国报税 #CPA #EA #在美华人 #税务 #报税季`

const liCap = `📅 IRS Deadline Daily — ${D.todayEN}

The soonest active IRS disaster-relief deadline is ${D.daysLeft} days out: ${D.countyN} ${D.leadEN} counties have until ${D.deadlineEN} to file federal returns (relief ${D.code}). Next up: ${D.nextEN} on ${D.nextDateEN}.

${D.active} reliefs are active right now across ${D.stateCount} states + ${D.terrCount} territory. If you have clients there, check their counties.

Full verified list (every date sourced to irs.gov) in the comments 👇
#TaxPros #CPA #IRS

【first comment】https://duedatehq.com/irs-disaster-relief?utm_source=linkedin&utm_medium=social&utm_campaign=daily_broadcast`

fs.writeFileSync(
  path.join(OUT, `PACK-${iso}.md`),
  `# 每日播报 · ${iso}\n\n自检溢出：小红书 ${of1}px / LinkedIn ${of2}px（应为 0）\n\n## 小红书图：\`broadcast/xhs-${iso}.png\`（1080×1440）\n\n${xhsCap}\n\n---\n\n## LinkedIn 图：\`broadcast/linkedin-${iso}.png\`（1080×1350 · 4:5）\n\n${liCap}\n`,
)
console.log(`✓ 今日播报 ${iso}：${D.leadEN} 倒计时 ${D.daysLeft} 天`)
console.log(
  `✓ 图：broadcast/xhs-${iso}.png (溢出${of1}) · broadcast/linkedin-${iso}.png (溢出${of2})`,
)
console.log(`✓ 配文：broadcast/PACK-${iso}.md`)

// ---------- 自检：源数据 vs 卡片(每次自动核对，确保信息正确) ----------
const covMap = { 个人: '1040', 公司: '1120', 合伙: '1065', 信托: '1041', 工资税: '941', 预估税: 'Estimate' }
const formsStr = (lead.forms || []).join(' ')
const unbacked = Object.entries(covMap).filter(([, f]) => !formsStr.includes(f)).map(([k]) => k)
console.log('— 自检（对 disaster-notices.json）—')
console.log(`  头条: ${D.leadEN} · 截止 ${lead.deadline} · 倒计时 ${daysLeft}天 · ${countyN}县 · ${lead.code}`)
console.log(`  下一批: ${nextStatesEN || '(无)'} ${nextDate || ''} · 生效 ${notices.length}份 / ${stateCount}州+${terrCount}地区`)
console.log(unbacked.length ? `  ⚠ 覆盖列表有源数据未包含的类型: ${unbacked.join(',')}` : '  ✓ 覆盖列表逐项均有源数据支撑（列表非穷举，卡片已标「等」）')
