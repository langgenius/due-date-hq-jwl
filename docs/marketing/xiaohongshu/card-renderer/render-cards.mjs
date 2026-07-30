// Node port of export.py — renders DueDateHQ change-card JSON → 1080×1440 PNG
// Usage: node render-cards.mjs payload.json out/ [--scale 2]
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { validate } from './validate.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const [payloadArg, outArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const scale = process.argv.includes('--scale')
  ? Number(process.argv[process.argv.indexOf('--scale') + 1])
  : 1
const noValidate = process.argv.includes('--no-validate') // 逃生阀,仅调试用
let items = JSON.parse(fs.readFileSync(path.resolve(payloadArg), 'utf8'))
if (!Array.isArray(items)) items = [items]
const outDir = path.resolve(outArg)
fs.mkdirSync(outDir, { recursive: true })

// ── T1 闸门:渲染前逐条校验,任一硬错即阻断,不生成任何图 ──────────────
// 规则 12(tip 行数)要等渲染后实测,留到循环里回填;这里先拦其余硬错。
if (!noValidate) {
  const blockers = []
  for (const it of items) {
    const { ok, errors, warnings } = validate(it)
    // 规则 12 的行数在渲染后循环里实测,这里的粗估告警是噪音,略去。
    warnings
      .filter((w) => !w.startsWith('规则12'))
      .forEach((w) => console.warn(`⚠︎ ${it.id || '?'}: ${w}`))
    if (!ok) errors.forEach((e) => blockers.push(`${it.id || '?'}: ${e}`))
  }
  if (blockers.length) {
    console.error(`\n✕ 校验未通过,已阻断渲染(${blockers.length} 项):`)
    blockers.forEach((b) => console.error(`  · ${b}`))
    console.error('\n准确 > 美观。修好数据再渲染,或调试时加 --no-validate。')
    process.exit(1)
  }
}

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
}
const server = http.createServer((req, res) => {
  const fp = path.join(HERE, decodeURIComponent(req.url.split('?')[0]))
  fs.readFile(fp, (e, buf) => {
    if (e) {
      res.writeHead(404)
      res.end()
    } else {
      res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' })
      res.end(buf)
    }
  })
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const br = await chromium.launch()
const pg = await br.newPage({ viewport: { width: 1180, height: 1540 }, deviceScaleFactor: scale })
await pg.goto(`http://127.0.0.1:${port}/export.html`, { waitUntil: 'networkidle' })
let renderErrors = 0
for (let i = 0; i < items.length; i++) {
  await pg.evaluate(async (d) => {
    const { renderCard } = await import('./card.js')
    const root = document.getElementById('root')
    root.innerHTML = ''
    root.appendChild(await renderCard(d))
    await document.fonts.ready
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  }, items[i])
  await pg.waitForTimeout(450)
  const name = items[i].id || `card-${i + 1}`

  // 规则 12:实测 tip.body 渲染行数,回填 validate 再判一次(阻断超行)。
  if (!noValidate && items[i].tip) {
    const lines = await pg.evaluate(() => {
      const el = document.querySelector('.ddhq__tb')
      if (!el) return null
      const lh = parseFloat(getComputedStyle(el).lineHeight)
      return lh ? Math.round(el.getBoundingClientRect().height / lh) : el.getClientRects().length
    })
    if (lines != null) {
      // 横版提示在独立右栏,纵向有空间,放宽到 8 行;竖版仍 4 行。
      const tipMaxLines = items[i].format === 'wide' ? 8 : 4
      const r = validate(items[i], { tipLines: lines, tipMaxLines })
      const over = r.errors.find((e) => e.startsWith('规则12'))
      if (over) {
        console.error(`✕ ${name}: ${over} — 跳过,不出图`)
        renderErrors++
        continue
      }
    }
  }

  await pg.locator('.ddhq').screenshot({ path: path.join(outDir, `${name}.png`) })
  const h =
    items[i].format === 'wide'
      ? 1080
      : items[i].format === 'dy'
        ? 1920
        : items[i].format === 'li'
          ? 1350
          : 1440
  const w = items[i].format === 'wide' ? 1920 : 1080
  console.log(`${name}.png  ${w * scale}x${h * scale}`)
}
await br.close()
server.close()
if (renderErrors) {
  console.error(`\n${renderErrors} 张因校验被跳过。`)
  process.exit(1)
}
