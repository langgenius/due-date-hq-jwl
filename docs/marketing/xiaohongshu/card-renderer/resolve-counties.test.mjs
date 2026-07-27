// T2 验收:独立市 vs 同名县、parish、正确报错。运行:node resolve-counties.test.mjs
import { resolveCounties } from './resolve-counties.js'

let fail = 0
const eq = (name, got, wantFips, wantErr = 0) => {
  const okF = JSON.stringify(got.fips) === JSON.stringify(wantFips)
  const okE = got.errors.length === wantErr
  const ok = okF && okE
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : ' → ' + JSON.stringify(got)}`)
  if (!ok) fail++
}

eq('VA 独立市+同名县全称', resolveCounties('VA', ['Richmond city', 'Richmond County']), ['51760', '51159'])
eq('VA 裸名歧义→报错', resolveCounties('VA', ['Richmond']), [], 1)
eq('VA Fairfax 市县歧义→报错', resolveCounties('VA', ['Fairfax']), [], 1)
eq('MD Baltimore 市/县', resolveCounties('MD', ['Baltimore city', 'Baltimore County']), ['24510', '24005'])
eq('MO St. Louis 市/县', resolveCounties('MO', ['St. Louis city', 'St. Louis County']), ['29510', '29189'])
eq('LA parish', resolveCounties('LA', ['Orleans']), ['22071'])
eq('WA 真实 9 县', resolveCounties('WA', ['Chelan', 'Clallam', 'Grays Harbor', 'Jefferson', 'King', 'Kitsap', 'Mason', 'Pierce', 'Thurston']),
  ['53007', '53009', '53027', '53031', '53033', '53035', '53045', '53053', '53067'])
eq('未匹配→报错', resolveCounties('WA', ['Nonexistent County']), [], 1)
eq('未知州→报错', resolveCounties('ZZ', ['Foo']), [], 1)

console.log(`\n${fail === 0 ? '全部通过 ✅' : fail + ' 条未通过 ❌'}`)
process.exit(fail === 0 ? 0 : 1)
