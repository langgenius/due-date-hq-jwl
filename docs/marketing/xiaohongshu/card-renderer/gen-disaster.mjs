// 从人工核实的 disaster-notices.ts 直接生成灾害卡 payload(不再依赖临时 dump)。
// 每条出 7 张:cover(封面钩子)/ p1(数据)/ p2(实务提示)= 小红书轮播;
//            en(横版备用)+ li-1cover / li-2data / li-3note = LinkedIn 4:5 文档轮播。
// 用法:npx tsx gen-disaster.mjs  → 写出 standby-notices.json + standby-captions.md,
//       再 node render-cards.mjs standby-notices.json out/ --scale 2,
//       每条再 magick <slug>-li-1cover.png <slug>-li-2data.png <slug>-li-3note.png -quality 92 <slug>-li-carousel.pdf。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveCounties } from './resolve-counties.js'
import { DISASTER_NOTICES } from '../../../../apps/marketing/src/lib/disaster-notices.ts'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// 备用库覆盖的现行灾害公告(已发过的 NC/GA/WA/CA 不在此)。
const CODES = new Set([
  'HI-2026-01',
  'AZ-2026-01',
  'MT-2026-03',
  'MT-2026-04',
  'LA-2026-02',
  'MS-2026-02',
  'WI-2026-02',
  'MI-2026-02',
  'NMI-2026-01',
])
const DATA = DISASTER_NOTICES.filter((n) => CODES.has(n.code))

// 中文月日:"October 10, 2025" → "2025 年 10月10日";newDate ISO "2026-09-28" → "9月28日"
const MON = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
}
function incidentCN(s) {
  const m = s.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/)
  return m ? `${m[3]} 年 ${MON[m[1]]}月${+m[2]}日` : s
}
const mdCN = (iso) => {
  const [, mm, dd] = iso.split('-')
  return `${+mm}月${+dd}日`
}
const mdEN = (iso) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
}

// 受灾县名单解析:先去掉「and the … Reservation/Nation」尾巴,再去后缀、拆逗号/and。
function parseAreaNames(area) {
  let a = area.replace(/,?\s+and\s+the\s+[^,]*?(reservation|nation|tribe)\b/gi, '')
  a = a.replace(/\b(counties|county|parishes|parish)\b/gi, '')
  return a
    .split(/,|\band\b/)
    .map((s) => s.trim())
    .filter(Boolean)
}

const _FORM_CN = {
  individual: '1040',
  corporate: '1120',
  's-corp': '1120-S',
  partnership: '1065',
  'tax-exempt': '990',
  'payroll-excise': '941',
  estimated: '预缴',
}

// 逐条配置(拿捏的部分:中文名、灾因、old→new 的 old 端、表单、封面词、部落名)。
// old 端只用法定表里有的日期(4/15、6/15、9/15…),否则渲染器规则 4 会拦。
const CFG = {
  'HI-2026-01': {
    cn: '夏威夷',
    reason: '风暴洪水 · 灾害减免',
    old: '4月15日',
    oldEn: 'Apr 15',
    forms: ['1040', '1120', '1120-S', '1065', '预缴'],
    unit: '县',
    cover: '夏威夷灾区',
    coverEn: ['Hawaii filing', 'extended to', '[[Aug 20]]'],
  },
  'AZ-2026-01': {
    cn: '亚利桑那',
    reason: '风暴洪水 · 灾害减免',
    old: '4月15日',
    oldEn: 'Apr 15',
    forms: ['1040', '1120', '1120-S', '1065', '预缴'],
    tribe: 'San Carlos Apache 部落',
    cover: '亚利桑那灾区',
    areaZh: 'San Carlos Apache 部落',
    coverEn: ['San Carlos', 'Apache relief:', '[[Sep 28]]'],
  },
  'MT-2026-03': {
    cn: '蒙大拿',
    reason: '冬季风暴 · 灾害减免',
    old: '4月15日',
    oldEn: 'Apr 15',
    forms: ['1040', '1120', '1120-S', '1065', '预缴'],
    tribe: 'Fort Peck 部落',
    cover: '蒙大拿灾区',
    tag: 'Fort Peck',
    areaZh: 'Fort Peck 部落',
    coverEn: ['Fort Peck MT', 'deadlines to', '[[Sep 28]]'],
  },
  'MT-2026-04': {
    cn: '蒙大拿',
    reason: '冬季风暴 · 灾害减免',
    old: '4月15日',
    oldEn: 'Apr 15',
    forms: ['1040', '1120', '1120-S', '1065', '预缴'],
    tribe: 'Crow 部落',
    cover: '蒙大拿灾区',
    tag: 'Crow',
    areaZh: 'Crow 部落',
    coverEn: ['Crow Tribe MT', 'deadlines to', '[[Sep 28]]'],
  },
  'MS-2026-02': {
    cn: '密西西比',
    reason: '风暴龙卷 · 灾害减免',
    old: '6月15日',
    oldEn: 'Jun 15',
    forms: ['预缴', '941', '990'],
    unit: '县',
    cover: '密西西比灾区',
    coverEn: ['Mississippi', 'deadlines to', '[[Nov 2]]'],
  },
  'WI-2026-02': {
    cn: '威斯康星',
    reason: '风暴龙卷 · 灾害减免',
    old: '4月15日',
    oldEn: 'Apr 15',
    forms: ['1040', '1120', '1120-S', '1065', '预缴'],
    unit: '县',
    cover: '威斯康星灾区',
    areaTail: '及 Oneida 部落保留地',
    coverEn: ['Wisconsin', 'deadlines to', '[[Nov 2]]'],
  },
  'MI-2026-02': {
    cn: '密歇根',
    reason: '风暴龙卷 · 灾害减免',
    old: '4月15日',
    oldEn: 'Apr 15',
    forms: ['1040', '1120', '1120-S', '1065', '预缴'],
    unit: '县',
    cover: '密歇根灾区',
    coverEn: ['Michigan', 'deadlines to', '[[Nov 2]]'],
  },
  'LA-2026-02': {
    cn: '路易斯安那',
    reason: '热带风暴 · 灾害减免',
    old: '9月15日',
    oldEn: 'Sep 15',
    forms: ['预缴', '1120-S', '1065', '941'],
    unit: '堂区',
    cover: '路易斯安那',
    coverEn: ['Louisiana', 'deadlines to', '[[Nov 2]]'],
  },
  'NMI-2026-01': {
    cn: '北马里亚纳群岛',
    reason: '超强台风 · 灾害减免',
    old: '4月15日',
    oldEn: 'Apr 15',
    forms: ['1040', '1120', '1120-S', '1065', '预缴'],
    cover: '北马里亚纳',
    territory: 'Northern Islands、Rota、Saipan、Tinian',
    areaTail: '受灾岛屿:Northern Islands、Rota、Saipan、Tinian',
    coverEn: ['N. Mariana Is.', 'deadlines to', '[[Nov 2]]'],
  },
}

/* 有没有合规照片,自动决定走方向 A(实景)还是方向 B(方块地图)。
   photos/<code>.jpg 存在就用 hero,不存在就用 mapcover —— 不为了配图硬凑。 */
function photoFor(code) {
  const rel = `photos/${code}.jpg`
  return fs.existsSync(path.join(HERE, rel)) ? rel : null
}
/* 倒计时口径与卡面一致:≤3 天 now,≤14 天 soon,其余 far。
   今天由 --today 传入(脚本内不取系统时间,保证可复现)。 */
const TODAY = (process.argv.find((a) => a.startsWith('--today=')) || '').slice(8)
function countdown(deadlineIso) {
  if (!TODAY) return null
  const d = Math.round((Date.parse(deadlineIso) - Date.parse(TODAY)) / 86400000)
  if (d < 0) return null
  return { days: d, tone: d <= 3 ? 'now' : d <= 14 ? 'soon' : 'far' }
}

const out = []
const caps = [
  '# 灾害卡备用库 · 配文\n\n每条:小红书标题 + 小红书配文 + LinkedIn 配文。事实取自人工核实的 `disaster-notices.ts`。\nLinkedIn 链接放首条评论。发前建议在 irs.gov 对应公告页快速核一眼受灾名单。\n',
]
for (const n of DATA) {
  const c = CFG[n.code]
  if (!c) {
    console.error('无配置:', n.code)
    continue
  }
  const newZh = mdCN(n.deadline),
    newEn = mdEN(n.deadline),
    incZh = incidentCN(n.incidentStart)
  const isTribe = Boolean(c.tribe),
    isTerr = Boolean(c.territory)
  const enForms = c.forms.map((f) => (f === '预缴' ? 'Estimated' : f))

  // 县/堂区:解析 FIPS + 数量;部落/领地:无县,地图纯轮廓。
  let fips = [],
    count = 0,
    _applyZone
  if (!isTribe && !isTerr) {
    const names = parseAreaNames(n.affectedArea)
    const r = resolveCounties(n.abbreviation, names)
    if (r.errors.length) console.error(n.code, '县解析错误:', r.errors)
    fips = r.fips
    count = names.length
    _applyZone = `受灾${c.unit}`
  } else {
    _applyZone = isTerr ? '受灾岛屿' : '受灾部落领地'
  }

  // 部落卡:有短标签(Fort Peck / Crow)就写进标题以区分同州多条;否则退回「州+部落区」。
  const titleLoc = isTribe
    ? c.tag
      ? `${c.cn} ${c.tag}`
      : `${c.cn}部落区`
    : isTerr
      ? c.cn
      : `${c.cn} ${count} ${c.unit}`
  const map = { state: n.abbreviation, counties: fips }
  const source = (loc) => ({
    level: loc === 'en' ? 'Federal' : '联邦',
    org: 'IRS',
    noticeId: n.code,
    verified: true,
  })

  // 覆盖表单中文串(note 用)
  const coverList = c.forms.map((f) => (f === '预缴' ? '季度预缴' : f)).join(' / ')

  const applyPoint = isTribe
    ? `位于该部落领地内的纳税人自动适用,无需申请;领地外但账册或记账人在内的,需致电 IRS 灾害热线申请。`
    : isTerr
      ? `位于受灾岛屿的纳税人自动适用,无需申请;岛外但账册或记账人在内的,需致电 IRS 灾害热线申请。`
      : `地址在受灾${c.unit}内的自动适用,无需申请;${c.unit}外但账册或记账人在内的,需致电 IRS 灾害热线申请。`

  // ── 第 1 页:有照片走 hero,没有走 mapcover ──
  const photo = photoFor(n.code)
  const cd = countdown(n.deadline)
  const areaShort = isTribe ? c.tribe : isTerr ? '受灾岛屿' : `${count} 个${c.unit}`
  out.push(
    photo
      ? {
          id: `${n.slug}-p1cover`,
          kind: 'hero',
          locale: 'zh',
          format: 'xhs',
          photo,
          heroTag: 'IRS',
          eyebrow: '今天这个州的报税截止日在逼近',
          map,
          stateName: c.cn,
          countdown: cd,
          newDate: newZh,
          sub: `${areaShort},地址在范围内的自动适用。`,
          footer: `美国报税不漏DDL · ${n.code}`,
        }
      : {
          id: `${n.slug}-p1cover`,
          kind: 'mapcover',
          locale: 'zh',
          format: 'xhs',
          title: ['今天这个州的', '报税截止日在逼近'],
          map: { state: n.abbreviation },
          badge: '1',
          stateName: c.cn,
          countdown: cd,
          newDate: newZh,
          sub: `${areaShort},地址在范围内的自动适用。`,
          footer: `美国报税不漏DDL · ${n.code}`,
        },
  )
  // ── 第 2 页:覆盖谁,怎么适用 ──
  out.push({
    id: `${n.slug}-p2facts`,
    kind: 'facts',
    locale: 'zh',
    format: 'xhs',
    stateName: c.cn,
    newDate: newZh,
    title: ['覆盖谁,怎么适用'],
    rows: [
      {
        label: '受灾范围',
        value: areaShort,
        note: `完整名单以 irs.gov 公告 ${n.code} 为准。`,
      },
      {
        label: '适用方式',
        value: '自动适用,无需申请',
        note: 'IRS 存档地址在受灾范围内的,不必提出申请。',
      },
      {
        label: '覆盖起点',
        value: `${incZh} 起到期的联邦申报与缴款`,
      },
    ],
    callout: {
      label: '这种情形要主动打电话',
      body: '客户地址在受灾范围外,但账册或记账人在范围内 —— 需致电 IRS 特别服务专线 866-562-5227 申请,不会自动适用。代 10 个以上客户申请的,可走批量请求。',
    },
    footer: `来源:IRS 公告 ${n.code} · 美国报税不漏DDL`,
  })
  // ── 旧版三张(cover/p1/p2)暂留,迁移完成后删 ──
  // ── cover ──
  out.push({
    id: `${n.slug}-cover`,
    kind: 'cover',
    locale: 'zh',
    format: 'xhs',
    eyebrow: `IRS 灾害延期 · ${c.cn}${c.tag ? ' ' + c.tag : ''}`,
    title: [c.cover, '报税延到', `[[${newZh}]]`],
    sub: `${isTribe ? c.tribe : isTerr ? '受灾岛屿' : `${count} 个受灾${c.unit}`},IRS 自动延期到 ${newZh}。有客户在灾区的会计师先收藏。`,
    footer: `${n.code} · 来源 IRS`,
  })
  // ── p1 数据 ──
  out.push({
    id: `${n.slug}-p1`,
    kind: 'delay',
    locale: 'zh',
    format: 'xhs',
    source: source('zh'),
    reason: isTribe ? `${c.tribe} · 灾害减免` : c.reason,
    map,
    title: [titleLoc, '报税延期'],
    dateLabel: '联邦报税截止日',
    oldDate: c.old,
    newDate: newZh,
    forms: c.forms,
    footer: `${newZh} 截止 · IRS 灾害减免`,
  })
  // ── p2 实务提示 ──
  out.push({
    id: `${n.slug}-p2`,
    kind: 'note',
    locale: 'zh',
    format: 'xhs',
    source: source('zh'),
    reason: isTribe ? `${c.tribe} · 灾害减免` : c.reason,
    map,
    title: ['实务提示'],
    points: [
      `受灾期(${incZh} 起)原本到期的联邦申报与缴款,统一延至 2026 年 ${newZh}。`,
      applyPoint,
      `覆盖 ${coverList} 等受灾期内到期的联邦申报与缴款。`,
      `完整受灾${isTerr ? '范围' : isTribe ? '范围' : '名单'}以 irs.gov 公告 ${n.code} 为准${c.areaTail ? `(${c.areaTail})` : ''}。`,
    ],
    footer: `来源:IRS 公告 ${n.code} · ${newZh} 截止`,
  })
  const incEnLi = incidentCNtoEN(n.incidentStart)
  const incYear = (n.incidentStart.match(/\d{4}/) || [''])[0]
  // ── en 横版 ──
  out.push({
    id: `${n.slug}-en`,
    kind: 'delay',
    locale: 'en',
    format: 'wide',
    source: source('en'),
    reason: `${isTribe ? c.tribe.replace(' 部落', ' Tribe') : n.event} · Disaster relief`,
    map,
    title: isTribe
      ? [`${n.state} tribal area`, 'Filing postponed']
      : isTerr
        ? [n.state, 'Filing postponed']
        : [
            `${count} ${n.state} ${c.unit === '堂区' ? 'parishes' : 'counties'}`,
            'Filing postponed',
          ],
    dateLabel: 'FEDERAL FILING DEADLINE',
    oldDate: c.oldEn,
    newDate: newEn,
    forms: enForms,
    tip: {
      label: 'PRACTITIONER NOTE',
      body: `Covers federal returns and payments due on or after ${incEnLi}, ${incYear} through ${newEn}, 2026 — automatic for affected taxpayers. If a client is outside the area but their records or preparer are inside it, call the IRS disaster hotline.`,
    },
    footer: `Postponed to ${newEn}, 2026 · IRS disaster relief`,
  })

  // ── LinkedIn 4:5 文档轮播(3 页:封面钩子 → 数据 → 实务提示) ──
  const liArea = isTribe
    ? c.tribe.replace(' 部落', ' Tribe')
    : isTerr
      ? 'Northern Islands, Rota, Saipan and Tinian'
      : `${count} ${n.state} ${c.unit === '堂区' ? 'parishes' : 'counties'}`
  out.push({
    id: `${n.slug}-li-1cover`,
    kind: 'cover',
    locale: 'en',
    format: 'li',
    eyebrow: `IRS disaster relief · ${n.code}`,
    title: c.coverEn,
    sub: `${liArea} — federal filing and payment deadlines automatically postponed to ${newEn}, 2026. Swipe for the details →`,
    footer: `${n.code} · Source: IRS`,
  })
  out.push({
    id: `${n.slug}-li-2data`,
    kind: 'delay',
    locale: 'en',
    format: 'li',
    source: source('en'),
    reason: `${isTribe ? c.tribe.replace(' 部落', ' Tribe') : n.event} · Disaster relief`,
    map,
    title: isTribe
      ? [`${n.state} tribal area`, 'Filing postponed']
      : isTerr
        ? [n.state, 'Filing postponed']
        : [
            `${count} ${n.state} ${c.unit === '堂区' ? 'parishes' : 'counties'}`,
            'Filing postponed',
          ],
    dateLabel: 'FEDERAL FILING DEADLINE',
    oldDate: c.oldEn,
    newDate: newEn,
    forms: enForms,
    footer: `Postponed to ${newEn}, 2026 · IRS disaster relief`,
  })
  out.push({
    id: `${n.slug}-li-3note`,
    kind: 'note',
    locale: 'en',
    format: 'li',
    source: source('en'),
    reason: `${isTribe ? c.tribe.replace(' 部落', ' Tribe') : n.event} · Disaster relief`,
    map,
    title: ['Practitioner note'],
    points: [
      `The IRS postponed federal deadlines to ${newEn}, 2026 for ${liArea} (relief ${n.code}).`,
      `Covers federal returns and payments due on or after ${incEnLi}, ${incYear} — ${enForms.join(', ')} included.`,
      `Automatic for an IRS address of record in the area — no application needed. Records or preparer inside but client outside? Call the IRS disaster hotline.`,
      `Full affected ${isTribe || isTerr ? 'area' : 'list'}: irs.gov relief notice ${n.code}.`,
    ],
    footer: `Source: IRS relief ${n.code} · Deadline ${newEn}, 2026`,
  })
}

function incidentCNtoEN(s) {
  const m = s.match(/([A-Za-z]+)\s+(\d{1,2})/)
  return m ? `${m[1].slice(0, 3)} ${+m[2]}` : s
}

// ── 配文(每条:小红书标题 + 小红书正文 + LinkedIn) ──
for (const n of DATA) {
  const c = CFG[n.code]
  const newZh = mdCN(n.deadline),
    newEn = mdEN(n.deadline),
    incZh = incidentCN(n.incidentStart),
    incEn = incidentCNtoEN(n.incidentStart),
    incYear = (n.incidentStart.match(/\d{4}/) || [''])[0]
  const isTribe = Boolean(c.tribe),
    isTerr = Boolean(c.territory)
  const eventCN = c.reason.split(' · ')[0]
  const coverList = c.forms.map((f) => (f === '预缴' ? '季度预缴' : f)).join('、')
  const enForms = c.forms.map((f) => (f === '预缴' ? 'estimated payments' : `Form ${f}`)).join(', ')
  let count = 0,
    unit = c.unit || '县',
    areaDescZh,
    areaDescEn,
    locZh,
    _locEn
  if (isTribe) {
    areaDescZh = c.tribe
    areaDescEn = `the ${c.tribe.replace(' 部落', ' Tribe')} area`
    locZh = `${n.state === 'Arizona' ? '亚利桑那' : '蒙大拿'} ${c.tribe}`
    _locEn = areaDescEn
  } else if (isTerr) {
    areaDescZh = c.territory
    areaDescEn = 'Northern Islands, Rota, Saipan, and Tinian'
    locZh = c.cn
    _locEn = n.state
  } else {
    const names = parseAreaNames(n.affectedArea)
    count = names.length
    areaDescZh =
      count <= 6
        ? `${names.join('、')}${unit === '堂区' ? ' 等 ' + count + ' 个堂区' : ' 等 ' + count + ' 县'}`
        : `${count} 个${unit}(完整名单见公告 ${n.code})`
    areaDescEn =
      count <= 6
        ? `${names.join(', ')} ${unit === '堂区' ? 'parishes' : 'counties'}`
        : `${count} ${unit === '堂区' ? 'parishes' : 'counties'} (see ${n.code} for the full list)`
    locZh = `${c.cn} ${count} ${unit}`
    _locEn = `${count} ${n.state} ${unit === '堂区' ? 'parishes' : 'counties'}`
  }
  const applyZh = isTribe
    ? '位于该部落领地内的自动适用,无需申请;领地外但账册或记账人在内的,需致电 IRS 灾害热线申请'
    : isTerr
      ? '位于受灾岛屿的自动适用;岛外但账册或记账人在内的,需致电 IRS 灾害热线申请'
      : `地址在受灾${unit}内的自动适用;${unit}外但账册或记账人在内的,需致电 IRS 灾害热线申请`

  caps.push(`\n---\n\n## ${n.state} · ${eventCN}(${n.code}) —— 截止 ${newZh}

图:\`${n.slug}-cover / -p1 / -p2\`(小红书)· \`${n.slug}-li-carousel.pdf\`(LinkedIn **文档帖**,3 页 4:5;横版 \`-en\` 仅作备用)

**小红书标题**:\`${locZh}报税延到 ${newZh} 🗓\`

**小红书配文**
\`\`\`
${locZh}报税延期!IRS 把受灾地区的联邦报税与缴款截止日延到 ${newZh}。有客户在灾区的会计师注意。

【前情提要】
${incZh} 起,${areaDescZh}发生${eventCN}灾害。IRS 据此发布灾害减免(${n.code}):受灾期内原本到期的联邦申报与缴款,统一延至 2026 年 ${newZh}。

【覆盖范围】
· 受灾地区:${areaDescZh}
· 延期项:${coverList} 等受灾期内到期的联邦申报与缴款
· 适用方式:${applyZh}

来源:IRS 灾害减免公告 ${n.code}(irs.gov 可查)

#美国报税 #CPA #注册会计师 #IRS #华人会计师 #报税季 #EA #${c.cn}
\`\`\`

**LinkedIn 配文**(发**文档帖**:上传 \`${n.slug}-li-carousel.pdf\`;首行=搜索磁石;链接放首条评论)

**LinkedIn 文档标题**(上传时必填,参与搜索):\`IRS Tax Deadline Extension — ${n.state}${c.tag ? ' ' + c.tag : ''} · ${newEn}, 2026 (${n.code})\`
\`\`\`
IRS tax deadline extension — ${n.state}.
The IRS has postponed federal tax deadlines to ${newEn}, 2026 for ${n.state} taxpayers affected by ${n.event} under disaster relief ${n.code}. Clients in ${areaDescEn} now have moved federal filing and payment deadlines — returns and payments due on or after ${incEn}, ${incYear} through ${newEn}, 2026 (${enForms}). Relief is automatic for an address of record in the area; if a client is outside but their records or preparer are inside, they must call the IRS disaster hotline.
Which of your clients does this affect? IRS source in the comments.
#IRS #DisasterRelief #TaxDeadline #CPA #StateAndLocalTax #${n.state.replace(/\s+/g, '')}
\`\`\`
`)
}

fs.writeFileSync(path.join(HERE, 'standby-notices.json'), JSON.stringify(out, null, 2))
fs.writeFileSync(path.join(HERE, 'standby-captions.md'), caps.join('\n'))
console.log(
  `生成 ${out.length} 张(${DATA.length} 条 × 4)→ standby-notices.json + standby-captions.md`,
)
