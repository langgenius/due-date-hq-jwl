// T1 · 发布前校验。最高优先级 —— 先于任何视觉工作,渲染前调用,任一硬错即阻断。
// 为什么排第一:已连着出过三次数字错误(不存在的表号、不存在的截止日、算错的
// 倒计时),人工审防不住。图上任何一个数字错了,产品就废了。
//
//   import { validate } from './validate.js'
//   const { ok, errors, warnings } = validate(payload)
//   if (!ok) throw new Error(errors.join('\n'))   // 阻断,不生成图
//
// 需要 I/O 或历史状态的三条规则(7 联网核对、11 重复公告、12 实测行数)通过
// opts 传入,不猜:opts.publishedLedger(已发过的 noticeId 集合)、opts.tipLines
// (渲染后实测行数)。规则 7 见 checkNoticeLive() 异步单独跑。
import { checkFips } from './resolve-counties.js'

// 允许的表单白名单(规则 3)。联邦表号 + 两个受控中文税种描述。禁止自由文本。
const FORM_WHITELIST = new Set([
  '1040', '1040-SR', '1041', '1065', '1120', '1120-S', '990',
  '941', '940', '5500', '706', '709', '预缴', 'Estimated',
])
// 州级描述走单独一类(以「州」开头),同样是受控词,不是自由文本。
const isStateForm = (f) => /^州/.test(f)

// 法定截止日表(历年制,联邦;规则 4)。值为 'M/D' 集合;[] 表示因个案而异、不约束。
const STATUTORY = {
  '1040': ['4/15'], '1040-SR': ['4/15'],
  '1120': ['4/15'], '1120-S': ['3/15'], '1065': ['3/15'],
  '1041': ['4/15'], '990': ['5/15'],
  '941': ['4/30', '7/31', '10/31', '1/31'], '940': ['1/31'], '5500': ['7/31'],
  '706': [], '709': ['4/15'],
  '预缴': ['4/15', '6/15', '9/15', '1/15'], 'Estimated': ['4/15', '6/15', '9/15', '1/15'],
}

// 「8月5日」/「8/5」/「Aug 5」-> {m,d};占位符(待公布/待公告/TBD)-> null。
const PLACEHOLDER = /(待公布|待公告|待定|TBD|未定)/i
function parseMD(s) {
  if (s == null) return null
  const str = String(s).trim()
  if (PLACEHOLDER.test(str)) return null
  let m = str.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (m) return { m: +m[1], d: +m[2] }
  m = str.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (m) return { m: +m[1], d: +m[2] }
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
  m = str.match(/([a-z]{3})[a-z]*\.?\s+(\d{1,2})/i)
  if (m && MON[m[1].toLowerCase()]) return { m: MON[m[1].toLowerCase()], d: +m[2] }
  return null
}
const rank = (md) => md.m * 100 + md.d

// 时区标记:ISO 偏移(+08:00 / Z)或北美时区缩写(ET/PT/CT/MT,含夏令 EDT 等)。
const hasTz = (s) => /([+-]\d{2}:?\d{2}|Z)$/.test(String(s)) || /\b([EPCM][SD]?T)\b/.test(String(s))

/**
 * @param {object} data  卡片 payload
 * @param {object} [opts]
 * @param {Set<string>|string[]} [opts.publishedLedger] 已发布过的 noticeId(规则 11)
 * @param {number} [opts.tipLines]  tip.body 渲染后实测行数(规则 12)
 * @param {number} [opts.tipMaxLines=4] tip 允许最大行数
 * @returns {{ok:boolean, errors:string[], warnings:string[]}}
 */
export function validate(data, opts = {}) {
  const errors = []
  const warnings = []
  const E = (msg) => errors.push(msg)
  const W = (msg) => warnings.push(msg)

  if (!data || typeof data !== 'object') return { ok: false, errors: ['payload 为空或非对象'], warnings }
  const kind = data.kind
  const src = data.source || {}
  const noticeId = src.noticeId

  // ── 规则 1:日期方向 ─────────────────────────────────────────────
  const oldMD = parseMD(data.oldDate)
  const newMD = parseMD(data.newDate)
  if (kind === 'delay') {
    if (!oldMD) E(`规则1:delay 的 oldDate 无法解析为日期:「${data.oldDate}」`)
    if (!newMD) E(`规则1:delay 的 newDate 必须是具体日期,不能是占位符:「${data.newDate}」`)
    if (oldMD && newMD && rank(newMD) <= rank(oldMD))
      E(`规则1:delay 要求 newDate 晚于 oldDate,当前 ${data.oldDate} → ${data.newDate}`)
  } else if (kind === 'correction') {
    if (String(data.oldDate).trim() === String(data.newDate).trim())
      E(`规则1:correction 的 oldDate 与 newDate 不能相同(${data.oldDate})`)
  }

  // ── 规则 2:公告号年份 == 发布年份 ───────────────────────────────
  if (noticeId && !PLACEHOLDER.test(noticeId)) {
    const yrM = String(noticeId).match(/(20\d{2})/)
    const pubYear =
      (data.publishedAt && String(data.publishedAt).match(/^(20\d{2})/)?.[1]) ||
      (data.year && String(data.year)) || null
    if (yrM && pubYear && yrM[1] !== pubYear)
      E(`规则2:公告号年份 ${yrM[1]} ≠ 发布年份 ${pubYear}(${noticeId})`)
    else if (yrM && !pubYear)
      W(`规则2:公告号含年份 ${yrM[1]},但 payload 无 publishedAt/year 可核对`)
  }

  // ── 规则 3:forms ⊆ 白名单,无自由文本 ──────────────────────────
  if (Array.isArray(data.forms)) {
    for (const f of data.forms)
      if (!FORM_WHITELIST.has(f) && !isStateForm(f))
        E(`规则3:表单「${f}」不在白名单内(禁止自由文本)`)
  } else if (kind === 'delay' || kind === 'correction') {
    W('规则3:delay/correction 通常应带 forms 数组')
  }

  // ── 规则 4:oldDate 命中法定截止日表 ────────────────────────────
  // 只对 delay:此时 oldDate 就是法定原截止日。correction 的 oldDate 是上一条
  // (被更正的)延期日,本就不是法定截止日,不能套此表。
  if (kind === 'delay' && oldMD && Array.isArray(data.forms)) {
    const fed = data.forms.filter((f) => STATUTORY[f] && STATUTORY[f].length)
    if (fed.length) {
      const allowed = new Set(fed.flatMap((f) => STATUTORY[f]))
      const key = `${oldMD.m}/${oldMD.d}`
      if (!allowed.has(key))
        E(`规则4:oldDate ${key} 不是所列税种的法定截止日(允许 ${[...allowed].join('、')})`)
    }
  }

  // ── 规则 5/6:FIPS 有效性、州前缀、数量对得上标题 ───────────────
  const counties = (data.map && data.map.counties) || []
  const state = data.map && data.map.state
  if (counties.length) {
    if (!state) E('规则6:map.counties 非空但缺 map.state')
    else {
      const r = checkFips(state, counties)
      if (!r.ok) r.errors.forEach((e) => E(`规则5/6:${e}`))
    }
    const titleNum = (Array.isArray(data.title) ? data.title.join(' ') : '')
      .match(/(\d+)\s*(?:个县|县|counties|county)/i)
    if (titleNum && +titleNum[1] !== counties.length)
      E(`规则5:标题写「${titleNum[1]} 县」但 map.counties 有 ${counties.length} 个`)
  }

  // ── 规则 8/9:时间戳顺序与时区 ──────────────────────────────────
  const detAt = data.detectedAt || (data.detected && data.detected.time)
  const pubAt = data.publishedAt
  if (data.detectedAt && !hasTz(data.detectedAt)) E(`规则9:detectedAt 必须带时区:「${data.detectedAt}」`)
  if (data.publishedAt && !hasTz(data.publishedAt)) E(`规则9:publishedAt 必须带时区:「${data.publishedAt}」`)
  if (data.detected && data.detected.time && !hasTz(data.detected.time))
    E(`规则9:detected.time 必须带时区:「${data.detected.time}」`)
  if (data.detectedAt && data.publishedAt) {
    const dt = Date.parse(data.detectedAt), pt = Date.parse(data.publishedAt)
    if (!Number.isNaN(dt) && !Number.isNaN(pt) && pt < dt)
      E(`规则8:publishedAt 早于 detectedAt(${data.publishedAt} < ${data.detectedAt})`)
  }
  // T3:detectedAt 为空时禁止「实时监测」措辞
  if (!detAt) {
    const claim = [data.footer, data.caption].filter(Boolean).join(' ')
    if (/(监测到|第一时间|实时|we picked this up|caught this)/i.test(claim))
      E('T3:detectedAt 为空,文案不得声称「实时监测到」')
  }

  // ── 规则 11:同一 noticeId 已发过 → 必须 correction ──────────────
  if (noticeId && opts.publishedLedger) {
    const ledger = opts.publishedLedger instanceof Set ? opts.publishedLedger : new Set(opts.publishedLedger)
    if (ledger.has(noticeId) && kind !== 'correction')
      E(`规则11:公告 ${noticeId} 已发布过,再次发布必须 kind=correction`)
  }

  // ── 规则 12:tip.body 渲染后实测行数(需 opts.tipLines) ─────────
  const maxLines = opts.tipMaxLines ?? 4
  if (data.tip && data.tip.body != null) {
    if (typeof opts.tipLines === 'number') {
      if (opts.tipLines > maxLines)
        E(`规则12:tip.body 渲染后 ${opts.tipLines} 行,超过 ${maxLines} 行上限`)
    } else {
      W('规则12:未提供实测行数(opts.tipLines),仅按字符粗估;请在渲染后回填')
      if (String(data.tip.body).length > 120) W(`规则12:tip.body ${String(data.tip.body).length} 字,偏长,注意实测行数`)
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * 规则 7(联网,单独异步跑):irs.gov 能取到 200 且正文含该编号。
 * 渲染管线可选调用;失败即视为不可发布。占位/州级/FEMA-DR 号跳过。
 * @returns {Promise<{ok:boolean, error?:string, skipped?:boolean}>}
 */
export async function checkNoticeLive(noticeId, fetchImpl = globalThis.fetch) {
  if (!noticeId || PLACEHOLDER.test(noticeId)) return { ok: true, skipped: true }
  // 只对形如 XX-YYYY-NN 的 IRS 州级公告号联网核对;DR-/EM- 等走 FEMA,另议。
  if (!/^[A-Z]{2}-20\d{2}-\d+$/.test(noticeId)) return { ok: true, skipped: true }
  if (typeof fetchImpl !== 'function') return { ok: false, error: '规则7:无 fetch 可用,无法联网核对' }
  const url = 'https://www.irs.gov/newsroom/tax-relief-in-disaster-situations'
  try {
    const res = await fetchImpl(url, { redirect: 'follow' })
    if (!res.ok) return { ok: false, error: `规则7:irs.gov 返回 ${res.status}` }
    const body = await res.text()
    if (!body.includes(noticeId))
      return { ok: false, error: `规则7:irs.gov 灾害减免页正文未见 ${noticeId}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `规则7:联网核对失败 ${e.message}` }
  }
}

export default validate
