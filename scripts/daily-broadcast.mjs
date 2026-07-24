#!/usr/bin/env node
/**
 * daily-broadcast.mjs — 每日 IRS 截止日播报（news engine）
 *
 * 每天一条播报，把 alert 当新闻播出去。产物是「已渲染的成品图」：
 *   - 小红书：中文，1080×1440 (3:4)
 *   - LinkedIn：英文配图，1080×1080 (方) + 英文正文
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
const WM = wmInner.replaceAll('#1F315C', '#f2f4ee').replaceAll('#F2F4ED', '#2e368c')

// ---------- shared style ----------
const base = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0f1016;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif;display:flex;gap:34px;padding:40px;align-items:flex-start}
  .num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
  .card{background:#2e368c;color:#fff;overflow:hidden;display:flex;flex-direction:column;position:relative}
  .wm{width:112px;height:15px;display:block;opacity:.85}
  .eyebrow{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;letter-spacing:.06em;color:#c2c6ee}
  .live{display:inline-flex;align-items:center;gap:7px;color:#14c5f6}
  .dot{width:8px;height:8px;border-radius:999px;background:#14c5f6;display:inline-block}
  .kick{color:#8f95cf;font-weight:500}
  .cd{display:flex;align-items:baseline;gap:10px;margin-top:8px}
  .cd b{font-size:150px;font-weight:800;color:#14c5f6;line-height:.82;letter-spacing:-.03em}
  .cd s{text-decoration:none;font-size:40px;font-weight:700}
  .facts{display:flex;flex-direction:column;gap:12px}
  .facts .f{font-size:20px;color:#eef0fb;line-height:1.5}
  .facts .f b{color:#fff;font-weight:700}
  .tick{border-top:1px solid rgba(255,255,255,.14);padding-top:20px;display:flex;flex-direction:column;gap:12px}
  .tick .t{font-size:17px;color:#c2c6ee;display:flex;gap:10px}
  .tick .t i{font-style:normal;color:#14c5f6;font-weight:700;min-width:74px}
  .foot{font-size:14px;color:#8f95cf}
`

// 小红书 3:4
const xhs = `<!doctype html><meta charset=utf8><style>${base}
  .xhs{width:540px;height:720px;padding:46px 44px}
  .xhs .headline{margin-top:26px;font-size:40px;font-weight:700;line-height:1.2}
  .xhs .facts{margin-top:22px}.xhs .tick{margin-top:auto}
  .xhs .top{display:flex;justify-content:space-between;align-items:center}
</style>
<div class="card xhs" style="width:540px;height:720px">
  <div class=top><svg class=wm viewBox="0 0 1165 154">${WM}</svg><span class="foot num">${D.iso}</span></div>
  <div class=eyebrow style="margin-top:30px"><span class=live><span class=dot></span>每日播报</span><span class=kick>IRS 报税截止日</span></div>
  <div class=headline>${D.leadCN}报税截止日<br/>还有</div>
  <div class="cd num"><b>${D.daysLeft}</b><s>天</s></div>
  <div class=facts>
    <div class=f>📌 <b>${D.deadlineCN}</b>到期 · ${D.countyN} 个县 · 灾害延期 ${D.code}</div>
    <div class=f>📌 覆盖 个人 / 公司 / 合伙 / 信托 / 工资税 / 预估税</div>
  </div>
  <div class=tick>
    ${D.nextCN ? `<div class=t><i>下一批</i><span>${D.nextCN} · ${D.nextDateCN}</span></div>` : ''}
    <div class=t><i>在生效</i><span>${D.active} 份延期，覆盖 ${D.stateCount} 州 + ${D.terrCount} 地区</span></div>
  </div>
  <div class=foot style="margin-top:22px">美国报税不漏DDL · 每天播报</div>
</div>`

// LinkedIn 1:1
const li = `<!doctype html><meta charset=utf8><style>${base}
  .li{width:540px;height:540px;padding:40px 42px}
  .li .headline{margin-top:20px;font-size:33px;font-weight:700;line-height:1.18}
  .li .cd b{font-size:112px}.li .cd s{font-size:30px}
  .li .facts{margin-top:16px}.li .facts .f{font-size:17px}
  .li .tick{margin-top:auto}.li .tick .t{font-size:15px}.li .tick .t i{min-width:66px}
  .li .top{display:flex;justify-content:space-between;align-items:center}
</style>
<div class="card li" style="width:540px;height:540px">
  <div class=top><svg class=wm viewBox="0 0 1165 154">${WM}</svg><span class="foot num">${D.deadlineEN.split(' ')[0]} ${D.iso.slice(0, 4)}</span></div>
  <div class=eyebrow style="margin-top:22px"><span class=live><span class=dot></span>IRS DEADLINE DAILY</span></div>
  <div class=headline>${D.leadEN} filing deadline:<br/><span style="color:#14c5f6">${D.daysLeft} days out</span></div>
  <div class=facts>
    <div class=f>Due <b>${D.deadlineEN}</b> · ${D.countyN} counties · relief ${D.code}</div>
    <div class=f>Covers individual, corporate, partnership, trust, payroll &amp; estimated returns</div>
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
const of1 = await shot(xhs, '.card', `xhs-${iso}.png`)
const of2 = await shot(li, '.card', `linkedin-${iso}.png`)
await browser.close()

// ---------- captions ----------
const xhsCap = `【标题】倒计时${D.daysLeft}天⏰${D.leadCN}报税DDL要到了

手上有${D.leadCN}客户的注意：${D.deadlineCN}，这 ${D.countyN} 个县的联邦报税截止日就到了（灾害延期 ${D.code}）。

📌 延期按 address of record 自动生效——先逐个核对客户地址
📌 覆盖个人/公司/合伙/信托/工资税/预估税，窗口内到期的一并顺延
📌 下一批：${D.nextCN} ${D.nextDateCN}

收藏，报税季不漏单👇
#美国报税 #CPA #EA #在美华人 #税务 #报税季`

const liCap = `📅 IRS Deadline Daily — ${D.deadlineEN.split(' ')[0]} ${new Date(iso).getUTCDate()}

The soonest active IRS disaster-relief deadline is ${D.daysLeft} days out: ${D.countyN} ${D.leadEN} counties have until ${D.deadlineEN} to file federal returns (relief ${D.code}). Next up: ${D.nextEN} on ${D.nextDateEN}.

${D.active} reliefs are active right now across ${D.stateCount} states + ${D.terrCount} territory. If you have clients there, check their counties.

Full verified list (every date sourced to irs.gov) in the comments 👇
#TaxPros #CPA #IRS

【first comment】https://duedatehq.com/irs-disaster-relief?utm_source=linkedin&utm_medium=social&utm_campaign=daily_broadcast`

fs.writeFileSync(
  path.join(OUT, `PACK-${iso}.md`),
  `# 每日播报 · ${iso}\n\n自检溢出：小红书 ${of1}px / LinkedIn ${of2}px（应为 0）\n\n## 小红书图：\`broadcast/xhs-${iso}.png\`（1080×1440）\n\n${xhsCap}\n\n---\n\n## LinkedIn 图：\`broadcast/linkedin-${iso}.png\`（1080×1080）\n\n${liCap}\n`,
)
console.log(`✓ 今日播报 ${iso}：${D.leadEN} 倒计时 ${D.daysLeft} 天`)
console.log(
  `✓ 图：broadcast/xhs-${iso}.png (溢出${of1}) · broadcast/linkedin-${iso}.png (溢出${of2})`,
)
console.log(`✓ 配文：broadcast/PACK-${iso}.md`)
