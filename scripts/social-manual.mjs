#!/usr/bin/env node
/**
 * social-manual.mjs — 小红书 + LinkedIn 手动发布内容生成器
 *
 * 镜像 X 自动发布(Issue #119 / apps/server/src/jobs/social)的纪律，但因为
 * 小红书/LinkedIn 没有可用发布 API，本脚本只自动化「生成 + 出图 + 打包」；
 * 最后「贴出去」这一步由人来做，并在 GitHub Issue「Manual social queue」里回写记录。
 *
 * 单一数据源(与 X 一致，保证三渠道数字永远对齐)：
 *   apps/marketing/src/lib/disaster-archive.json   —— 全量历史(206)
 *   outreach-kit/disaster-notices.json             —— 当前生效(11)
 *
 * 设计：复用已验收的 6 图卡片模板(navy / 官方 wordmark / 中文日期)。
 *
 * 用法：
 *   node scripts/social-manual.mjs           # 出 navy 版 PNG + 配文 + 领英 + issue 片段
 *   node scripts/social-manual.mjs --light    # 浅色版
 * 依赖：@playwright/test(仓库已装)。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const LIGHT = process.argv.includes('--light')
const OUT = path.join(ROOT, 'docs/marketing/xiaohongshu', LIGHT ? 'exports-light' : 'exports')
const HTML_OUT = path.join(
  ROOT,
  'docs/marketing/xiaohongshu',
  LIGHT ? 'card-template-light.html' : 'card-template.html',
)
const PACK_OUT = path.join(ROOT, 'docs/marketing/xiaohongshu', 'LATEST-PACK.md')

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
const TERRITORIES = new Set(['PR', 'MP', 'VI', 'GU', 'AS', 'DC'])
const cn = (ab) => CN[ab] || ab
const mdY = (iso) => {
  const [, m, d] = iso.split('-')
  return `${+m}月${+d}日`
}

// ---------- 1. 计算权威数字(与 X 同源)----------
const archive = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'apps/marketing/src/lib/disaster-archive.json'), 'utf8'),
)
const notices = (() => {
  const raw = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'outreach-kit/disaster-notices.json'), 'utf8'),
  )
  return Array.isArray(raw) ? raw : raw.notices || Object.values(raw)
})()

const total = archive.length
const byYear = {}
for (const x of archive) byYear[x.year] = (byYear[x.year] || 0) + 1
const years = Object.keys(byYear).map(Number)
const peakYear = years.reduce((a, b) => (byYear[b] > byYear[a] ? b : a))
const peakCount = byYear[peakYear]
const thisYear = Math.max(...years)
const thisYearCount = byYear[thisYear]
// 平均间隔：用可解析的 issuedOn(>=2020)
const ts = archive
  .map((x) => new Date(x.issuedOn).getTime())
  .filter((t) => !isNaN(t) && new Date(t).getFullYear() >= 2020)
  .sort((a, b) => a - b)
const avgDays = Math.round((ts[ts.length - 1] - ts[0]) / 86400000 / (ts.length - 1))

const activeCount = notices.length
const juris = [...new Set(notices.map((n) => n.abbr))]
const stateCount = juris.filter((a) => !TERRITORIES.has(a)).length
const terrCount = juris.filter((a) => TERRITORIES.has(a)).length

// 当前生效：按截止日分组
const byDate = {}
for (const n of notices) (byDate[n.deadline] ||= new Set()).add(n.abbr)
const groups = Object.keys(byDate)
  .sort()
  .map((d) => ({ date: mdY(d), states: [...byDate[d]].map(cn).join(' · ') }))
// 封面 3 例：截止日最近的 3 个不同州
const coverChips = [...notices]
  .sort((a, b) => a.deadline.localeCompare(b.deadline))
  .filter((n, i, arr) => arr.findIndex((m) => m.abbr === n.abbr) === i)
  .slice(0, 3)
  .map((n) => ({ s: cn(n.abbr), d: mdY(n.deadline) }))

const data = {
  total,
  peakYear,
  peakCount,
  thisYear,
  thisYearCount,
  avgDays,
  activeCount,
  stateCount,
  terrCount,
  groups,
  coverChips,
}

// ---------- 2. 设计模板(已验收的 6 图，数字注入)----------
const wmSrc = fs.readFileSync(
  path.join(ROOT, 'packages/ui/src/assets/brand/brand-wordmark.svg'),
  'utf8',
)
const wmInner = wmSrc
  .slice(wmSrc.indexOf('>', wmSrc.indexOf('<svg')) + 1, wmSrc.lastIndexOf('</svg>'))
  .replace(/<title>.*?<\/title>/s, '')
  .trim()
const wm = (ink, bar) =>
  `<svg class="wm" width="112" height="15" viewBox="0 0 1165 154" role="img" aria-label="DueDateHQ">${wmInner.replaceAll('#1F315C', ink).replaceAll('#F2F4ED', bar)}</svg>`

function buildHtml(d) {
  const T = LIGHT
    ? {
        bg: '#f3f2ec',
        ink: '#1e2138',
        sub: '#6b6e82',
        mut: '#a7a494',
        accent: '#2e368c',
        amber: '#c8791a',
        num: '#2e368c',
        wm: wm('#2e368c', '#f3f2ec'),
        title: '#2e368c',
        big: '#2e368c',
        bigU: '#c8791a',
      }
    : {
        bg: '#2e368c',
        ink: '#ffffff',
        sub: '#c2c6ee',
        mut: '#8f95cf',
        accent: '#14c5f6',
        amber: '#ffbf4d',
        num: '#ffffff',
        wm: wm('#f2f4ee', '#2e368c'),
        title: '#ffffff',
        big: '#ffffff',
        bigU: '#14c5f6',
      }
  const CARD = (pg, body) =>
    `<div class="frame"><div class="card"><div class="top">${T.wm}<span class="pg num">${pg}</span></div>${body}</div></div>`
  const css = `<style>
  :root{ --bg:${T.bg}; --ink:${T.ink}; --sub:${T.sub}; --mut:${T.mut}; --accent:${T.accent}; --amber:${T.amber}; --num:${T.num};
    --page-bg:${LIGHT ? '#e6e4dc' : '#0f1016'}; --page-fg:#8a8d9c; }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--page-bg);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif;display:flex;flex-direction:column;align-items:center;gap:30px;padding:40px 16px 64px}
  .shot-label{font-size:13px;color:var(--page-fg);letter-spacing:.06em;margin-bottom:-16px}
  .frame{width:540px;height:720px}
  .card{width:540px;height:720px;overflow:hidden;transform-origin:top left;display:flex;flex-direction:column;padding:48px 46px;background:var(--bg);color:var(--ink)}
  @media(max-width:588px){.frame{width:92vw;height:calc(92vw*4/3);overflow:hidden}.card{transform:scale(calc(92vw/540))}}
  .num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
  .wm{display:block;width:112px;height:15px;flex:0 0 auto;opacity:${LIGHT ? '.82' : '.85'}}
  .top{display:flex;justify-content:space-between;align-items:center}
  .pg{font-size:13px;font-weight:600;letter-spacing:.14em;color:var(--mut)}
  .title{margin-top:54px;font-size:30px;font-weight:600;line-height:1.34;text-wrap:balance;color:${T.title}}
  .title em{font-style:normal;color:var(--accent)}
  .src{margin-top:auto;font-size:13px;color:var(--mut)}
  .kicker{margin-top:60px;font-size:21px;font-weight:500;color:var(--sub)}
  .headline{margin-top:8px;font-size:39px;font-weight:700;line-height:1.22;text-wrap:balance;color:${T.title}}
  .bignum{margin-top:18px;display:flex;align-items:baseline;gap:8px}
  .bignum b{font-size:140px;font-weight:800;color:var(--accent);line-height:.84;letter-spacing:-.03em}
  .bignum span{font-size:38px;font-weight:700}
  .proof{margin-top:auto}.proof .lab{font-size:15px;color:var(--mut);margin-bottom:16px}
  .dates{display:flex;gap:30px}
  .de .s{font-size:15px;color:var(--sub);font-weight:500}
  .de .d{font-size:26px;font-weight:700;color:${LIGHT ? '#2e368c' : '#fff'};margin-top:5px;letter-spacing:-.01em}
  .cover-foot{margin-top:34px;display:flex;justify-content:space-between;align-items:center;font-size:14px;color:var(--mut)}
  .peek{color:var(--accent);font-weight:600}
  .rows{margin-top:22px;display:flex;flex-direction:column}
  .row{display:flex;align-items:baseline;gap:20px;padding:21px 0}
  .row .data-num{font-size:46px;font-weight:700;color:var(--num);min-width:126px;letter-spacing:-.02em}
  .row .data-num u{text-decoration:none;font-size:21px;font-weight:600}
  .row.peak .data-num{color:var(--amber)}
  .row .data-label{font-size:18px;color:var(--sub);line-height:1.5}
  .row .data-label strong{color:${T.ink};font-weight:600}
  .row .data-label em{font-style:normal;color:var(--amber);font-weight:600}
  .states{margin-top:34px;display:flex;flex-direction:column;gap:23px}
  .stg{display:flex;gap:22px;align-items:baseline}
  .stg .dt{font-size:27px;font-weight:700;color:var(--accent);min-width:118px;letter-spacing:-.01em}
  .stg .nm{font-size:20px;color:${LIGHT ? '#1e2138' : '#eef0fb'};line-height:1.5;font-weight:500}
  .cov{margin-top:30px;display:flex;flex-direction:column}
  .ci{display:flex;align-items:baseline;gap:14px;padding:16px 0}
  .ci .n{font-size:20px;color:${T.ink};font-weight:600;min-width:150px}
  .ci .f{font-size:16px;color:var(--mut)}
  .pts{margin-top:34px;display:flex;flex-direction:column;gap:27px}
  .pt{display:flex;gap:18px}
  .pt .no{font-size:20px;font-weight:700;color:var(--accent);min-width:30px}
  .pt .h{font-size:20px;font-weight:600;color:${T.ink}}
  .pt .d{margin-top:5px;font-size:17px;color:var(--sub);line-height:1.55}
  .pt .d b{color:var(--accent);font-weight:700}
  .big{margin-top:60px;font-size:32px;font-weight:600;line-height:1.46;text-wrap:balance;color:${T.big}}
  .big u{text-decoration:none;color:${T.bigU}}
  .tip{margin-top:36px}.tip .h{font-size:14px;color:var(--mut);font-weight:600}
  .tip .m{margin-top:11px;font-size:20px;font-weight:500;color:${LIGHT ? '#1e2138' : '#eef0fb'};line-height:1.6}
  .tip .m b{color:var(--accent);font-weight:700}
  .close-foot{margin-top:auto}.cta{font-size:19px;font-weight:700;color:var(--accent)}
  .close-foot .foot{margin-top:14px;font-size:14px;color:var(--mut)}
</style>`
  const chips = d.coverChips
    .map((c) => `<div class="de"><div class="s">${c.s}</div><div class="d">${c.d}</div></div>`)
    .join('')
  const stgs = d.groups
    .map(
      (g) =>
        `<div class="stg"><span class="dt">${g.date}</span><span class="nm">${g.states}</span></div>`,
    )
    .join('')
  const cards = [
    CARD(
      '1 / 6',
      `<div class="kicker">${d.thisYear} 才过半</div><div class="headline">IRS 已经发了这么多份<br/>灾害延期通知</div><div class="bignum num"><b>${d.thisYearCount}</b><span>份</span></div><div class="proof"><div class="lab">这些州的报税截止日，已被推迟到</div><div class="dates num">${chips}</div><div class="cover-foot"><span>美国报税不漏DDL</span><span class="peek">数据在图2 →</span></div></div>`,
    ),
    CARD(
      '2 / 6',
      `<h2 class="title">IRS 灾害延期通知，到底有多频繁？</h2><div class="rows"><div class="row"><span class="data-num num">${d.total}</span><span class="data-label"><strong>${years0(d)} 至今</strong>发出的延期通知总数</span></div><div class="row"><span class="data-num num">${d.avgDays}<u>天</u></span><span class="data-label">平均每 ${d.avgDays} 天，<strong>就有一次</strong>新的延期</span></div><div class="row peak"><span class="data-num num">${d.peakCount}</span><span class="data-label"><strong>${d.peakYear} 全年</strong>，<em>历史峰值</em></span></div><div class="row"><span class="data-num num">${d.activeCount}</span><span class="data-label">份延期通知仍在生效，覆盖 <strong>${d.stateCount} 州 + ${d.terrCount} 地区</strong></span></div></div><div class="src">数据来自 DueDateHQ 核实的 IRS 灾害延期档案（irs.gov 逐条核对）</div>`,
    ),
    CARD(
      '3 / 6',
      `<h2 class="title">此刻，<em>这些州和地区</em>的截止日正在延后</h2><div class="states num">${stgs}</div><div class="src">截至今日在生效；同一州可能含多份通知，均按 IRS 官方划定的受灾地区生效</div>`,
    ),
    CARD(
      '4 / 6',
      `<h2 class="title">灾害延期，<em>覆盖哪些申报？</em></h2><div class="cov"><div class="ci"><span class="n">个人所得税</span><span class="f">1040</span></div><div class="ci"><span class="n">公司</span><span class="f">1120 / 1120-S</span></div><div class="ci"><span class="n">合伙企业</span><span class="f">1065</span></div><div class="ci"><span class="n">遗产与信托</span><span class="f">1041</span></div><div class="ci"><span class="n">工资/就业税</span><span class="f">941 / 940</span></div><div class="ci"><span class="n">季度预估税款</span><span class="f">窗口期内到期的</span></div></div><div class="src">上列为主要类型；延期窗口内到期的申报与缴款一并顺延，具体以 IRS 官方通知为准</div>`,
    ),
    CARD(
      '5 / 6',
      `<h2 class="title">3 个<em>容易忽略</em>的点</h2><div class="pts"><div class="pt"><span class="no num">01</span><div><div class="h">延期自动生效</div><div class="d">按 <b>address of record</b> 判定，通常自动适用，无需主动联系 IRS</div></div></div><div class="pt"><span class="no num">02</span><div><div class="h">一年两个里程率</div><div class="d">7 月 1 日起，商用里程每英里 <b>72.5¢ → 76¢</b>，2026 要分段算</div></div></div><div class="pt"><span class="no num">03</span><div><div class="h">别只看联邦</div><div class="d">州税<b>不一定</b>跟随联邦延期，各州 DOR 要单独查</div></div></div></div>`,
    ),
    CARD(
      '6 / 6',
      `<div class="big">对做税务的人来说，“deadline” 不是一个固定日子，而是一张<u>一直在动的地图</u>。</div><div class="tip"><div class="h">给同行提个醒</div><div class="m">手上有受灾地区客户的，排期前先逐个核对 <b>address of record</b> 与适用的新截止日。</div></div><div class="close-foot"><div class="cta">收藏这条，报税季少踩一个坑 ↓</div><div class="foot">美国报税不漏DDL</div></div>`,
    ),
  ]
  const labels = [
    '封面（图1）',
    '数据（图2）',
    '此刻延期的州（图3）',
    '覆盖哪些申报（图4）',
    '3 个要点（图5）',
    '收束（图6）',
  ]
  return (
    css +
    '\n' +
    cards.map((c, i) => `<div class="shot-label">▽ ${labels[i]}</div>\n${c}`).join('\n') +
    '\n'
  )
}
function years0(d) {
  const ys = Object.keys(byYear).map(Number)
  return Math.min(...ys)
}

// ---------- 3. 配文 + 领英 ----------
function xhsCaption(d) {
  return `【标题】半年${d.thisYearCount}份，IRS的报税DDL⏰

做税务的可能都有体感：IRS 的截止日，好像总在变。我把 ${years0(d)} 到现在的通知全捋了一遍，数字比想象夸张👇（都在图里，逐条对过 irs.gov）

📌 ${years0(d)} 至今 ${d.total} 份，平均每 ${d.avgDays} 天就有一次
📌 ${d.peakYear} 一年就 ${d.peakCount} 份，历史峰值
📌 就在此刻，还有 ${d.activeCount} 份延期在生效，覆盖 ${d.stateCount} 州 + ${d.terrCount} 地区

图3 列了现在还生效的州和新截止日，手上有这些客户的可以直接对着查；图4 是延期覆盖哪些申报；图5 三个最容易忽略的点——尤其"州税不一定跟着联邦走"，踩过的都懂。

收藏一下，报税季少踩个坑。你今年被哪个 deadline 变动坑过？评论区聊聊👇

#美国报税 #注册会计师 #CPA #EA #在美华人 #税务 #会计 #报税季 #美国生活`
}
function linkedin(d) {
  const soon = d.groups[0]
  return `【LinkedIn · 公司页发，个人号转，链接放首条评论】

We read every IRS disaster-relief notice since ${years0(d)}. All ${d.total} of them.

A few things that surprised us:

→ ${d.total} deadline postponements — that's one every ${d.avgDays} days
→ ${d.peakYear} was the peak: ${d.peakCount} notices in a single year
→ Right now, ${d.activeCount} reliefs are active across ${d.stateCount} states + ${d.terrCount} territory

For firms with multi-state books, "the deadline" isn't one date — it's a moving map. Every notice we verified, with its official IRS source, is in the comments.

#TaxPros #CPA #TaxSeason #IRS

【首条评论】The full ${years0(d)}–${d.thisYear} archive, every notice linked to its irs.gov release → https://duedatehq.com/irs-disaster-relief/archive?utm_source=linkedin&utm_medium=social&utm_campaign=li_data`
}

// ---------- 4. 出图 + 打包 ----------
const html = buildHtml(data)
fs.writeFileSync(HTML_OUT, html)
fs.mkdirSync(OUT, { recursive: true })
const names = ['01-cover', '02-data', '03-live-states', '04-covered', '05-points', '06-close']
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 720, height: 900 }, deviceScaleFactor: 2 })
await page.goto('file://' + HTML_OUT, { waitUntil: 'networkidle' })
const cardEls = await page.$$('.card')
let overflow = 0
for (let i = 0; i < cardEls.length; i++) {
  const of = await cardEls[i].evaluate((el) => el.scrollHeight - el.clientHeight)
  overflow += of
  await cardEls[i].screenshot({ path: path.join(OUT, names[i] + '.png') })
}
await browser.close()

const variant = LIGHT ? 'exports-light' : 'exports'
const pack = `# LATEST social pack — 自动生成，请勿手改（改数据源后重跑脚本）

**生成命令：** \`node scripts/social-manual.mjs${LIGHT ? ' --light' : ''}\`
**当前权威数字：** 总数 ${data.total} · ${data.peakYear} 峰值 ${data.peakCount} · 平均每 ${data.avgDays} 天 · ${data.thisYear} 上半年 ${data.thisYearCount} 份 · 当前 ${data.activeCount} 份生效(${data.stateCount} 州 + ${data.terrCount} 地区)
**卡片自检：** 6 图溢出合计 ${overflow}px（应为 0）

---

## 小红书（6 图轮播）

图片：\`docs/marketing/xiaohongshu/${variant}/{01-cover…06-close}.png\`（1080×1440）

${xhsCaption(data)}

---

## LinkedIn

${linkedin(data)}

---

## 发布 checklist（贴出去后在 Issue 回写「published + 链接 + 日期」）

- [ ] 小红书：个人号发轮播，标题+正文如上，${'#'}话题保留
- [ ] LinkedIn：公司页发，个人号转，链接放首条评论
- [ ] 记录：回到「Manual social queue」Issue 回写已发链接与日期
`
fs.writeFileSync(PACK_OUT, pack)
console.log(`✓ ${variant}: 6 图导出完成，溢出合计 ${overflow}px`)
console.log(`✓ 配文 + 领英 + checklist 写入 ${path.relative(ROOT, PACK_OUT)}`)
console.log(
  `\n权威数字：总数 ${data.total} · 峰值 ${data.peakYear}=${data.peakCount} · 每 ${data.avgDays} 天 · ${data.thisYear} 上半年 ${data.thisYearCount} 份 · 生效 ${data.activeCount}(${data.stateCount}州+${data.terrCount}地区)`,
)
