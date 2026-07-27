// T1 验收:4 条合法样例必须全过;12 条各违反一条规则的 payload 必须全部拦下。
// 运行:node validate.test.mjs
import fs from 'node:fs'
import { validate } from './validate.js'

const samples = JSON.parse(fs.readFileSync(new URL('./samples.json', import.meta.url)))
const base = samples[0] // wa-storm-delay,已知合法
const clone = (over) => ({ ...structuredClone(base), ...over })

let fail = 0
const expectPass = (name, data, opts) => {
  const r = validate(data, opts)
  const ok = r.ok
  console.log(`${ok ? 'ok  ' : 'FAIL'}  合法·${name}${ok ? '' : ' → ' + r.errors.join(' | ')}`)
  if (!ok) fail++
}
// 匹配某条错误的规则号:前缀形如「规则5/6:」或「规则12:」或「T3:」,
// 取冒号前的号段,按 / 拆开看是否包含目标规则。
const errMatches = (e, rule) => {
  const label = e.split(/[:：]/)[0]
  if (rule === '3' && label === 'T3') return true
  const m = label.match(/^规则([\d/]+)/)
  return m ? m[1].split('/').includes(String(rule)) : false
}
const expectCatch = (rule, name, data, opts) => {
  const r = validate(data, opts)
  const found = !r.ok && r.errors.find((e) => errMatches(e, rule))
  console.log(`${found ? 'ok  ' : 'FAIL'}  规则${rule}·${name}${found ? ' → ' + found : ' 未拦下! errors=' + JSON.stringify(r.errors)}`)
  if (!found) fail++
}

// ── 合法样例 ────────────────────────────────────────────────────────
for (const s of samples) expectPass(s.id, s)

console.log('\n── 12 条违规 payload ──')
// 1 delay 方向反了(新日期早于旧日期)
expectCatch(1, 'newDate<oldDate', clone({ oldDate: '8月5日', newDate: '4月15日' }))
// 2 公告号年份 ≠ 发布年份
expectCatch(2, '年份不符', clone({ publishedAt: '2026-07-18T09:14:00-04:00' })) // 号是 2025
// 3 表单含自由文本
expectCatch(3, '自由文本表单', clone({ forms: ['1040', '所有联邦申报'] }))
// 4 oldDate 不是法定截止日
expectCatch(4, '假截止日', clone({ oldDate: '4月5日' }))
// 5 标题县数与 counties 数不符
expectCatch(5, '县数不符', clone({ title: ['华盛顿 12 个县', '报税延期'] }))
// 6 FIPS 州前缀错(用了俄勒冈 41xxx 挂在 WA)
expectCatch(6, 'FIPS州前缀错', clone({ map: { state: 'WA', counties: ['41007', '41009', '41027', '41031', '41033', '41035', '41045', '41053', '41067'] } }))
// 8 publishedAt 早于 detectedAt
expectCatch(8, '时间倒挂', clone({ detectedAt: '2025-07-18T09:14:00-04:00', publishedAt: '2025-07-18T08:00:00-04:00' }))
// 9 时间戳缺时区
expectCatch(9, '缺时区', clone({ detectedAt: '2025-07-18T09:14:00' }))
// 11 重复公告未标 correction
expectCatch(11, '重复公告', clone({}), { publishedLedger: ['WA-2025-03'] })
// 12 tip 实测行数超限
expectCatch(12, 'tip超行', clone({}), { tipLines: 6, tipMaxLines: 4 })
// T3 detectedAt 空却声称实时监测
expectCatch('3', '空detected却称实时', clone({ detected: undefined, footer: '我们第一时间监测到本次变更' }))
// 6b 未知州代码
expectCatch(6, '未知州', clone({ map: { state: 'ZZ', counties: ['53007'] } }))

console.log(`\n${fail === 0 ? '全部通过 ✅' : fail + ' 条未通过 ❌'}`)
process.exit(fail === 0 ? 0 : 1)
