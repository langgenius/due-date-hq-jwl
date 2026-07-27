// T2 · 县名 → FIPS 解析。入库时一次性解析并存 FIPS,渲染时不再按名字匹配。
// 用 namelsad 区分独立市 vs 同名县(VA/MD/MO);匹配不唯一时报错,不猜。
//
//   import { resolveCounties } from './resolve-counties.js'
//   resolveCounties('VA', ['Richmond County', 'Fairfax'])
//     -> { fips: ['51159','51059'], errors: [] }
//   resolveCounties('VA', ['Richmond'])   // 既有市又有县
//     -> { fips: [], errors: ['县名不唯一…'] }
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const IDX = JSON.parse(fs.readFileSync(path.join(HERE, 'county-index.json'), 'utf8'))

// 归一化:小写、去标点、压空格。
const key = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[.’']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
// 去掉行政后缀,得到"裸名"(Asotin County -> asotin;Richmond city -> richmond)。
const bare = (s) =>
  key(s).replace(/\s+(county|parish|borough|census area|city and borough|municipality|city)$/i, '')

/** 单个县名 -> {geoid} 或 {error}。stateCode 如 'WA'。 */
function resolveOne(stateCode, raw, maps) {
  // 1) 先按完整 namelsad 精确匹配(能区分 Richmond County vs Richmond city)
  const full = maps.nlsad[key(raw)]
  if (full) return { geoid: full.geoid }
  // 2) 再按裸名匹配
  const cand = maps.name[bare(raw)]
  if (!cand || cand.length === 0) return { error: `未匹配到县:「${raw}」(${stateCode})` }
  if (cand.length > 1)
    return {
      error: `县名不唯一,需用全称:「${raw}」→ ${cand
        .map((c) => `${c.namelsad} ${c.geoid}`)
        .join(' / ')}`,
    }
  return { geoid: cand[0].geoid }
}

export function resolveCounties(stateCode, names) {
  const st = IDX[stateCode]
  if (!st) return { fips: [], errors: [`未知州代码:${stateCode}`] }
  const maps = { nlsad: {}, name: {} }
  for (const c of st.counties) {
    maps.nlsad[key(c.namelsad)] = c
    ;(maps.name[bare(c.name)] ||= []).push(c)
  }
  const fips = []
  const errors = []
  for (const raw of names) {
    const r = resolveOne(stateCode, raw, maps)
    if (r.error) errors.push(r.error)
    else fips.push(r.geoid)
  }
  return { fips: [...new Set(fips)], errors }
}

/** 州的 FIPS 前缀(WA -> '53')。 */
export function stateFipsPrefix(stateCode) {
  const st = IDX[stateCode]
  return st && st.counties[0] ? st.counties[0].geoid.slice(0, 2) : null
}

/** 校验一批已存的 FIPS:全部存在于该州、且州前缀一致。返回 {ok, errors}。 */
export function checkFips(stateCode, fipsList) {
  const st = IDX[stateCode]
  if (!st) return { ok: false, errors: [`未知州代码:${stateCode}`] }
  const valid = new Set(st.counties.map((c) => c.geoid))
  const prefix = stateFipsPrefix(stateCode)
  const errors = []
  for (const f of fipsList) {
    if (String(f).slice(0, 2) !== prefix)
      errors.push(`FIPS ${f} 的州前缀 ≠ ${stateCode}(应为 ${prefix})`)
    else if (!valid.has(String(f))) errors.push(`FIPS ${f} 不在 ${stateCode} 的县表中`)
  }
  return { ok: errors.length === 0, errors }
}

export default resolveCounties
