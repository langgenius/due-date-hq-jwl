// Node port of export.py — renders DueDateHQ change-card JSON → 1080×1440 PNG
// Usage: node render-cards.mjs payload.json out/ [--scale 2]
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const [payloadArg, outArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const scale = process.argv.includes('--scale') ? Number(process.argv[process.argv.indexOf('--scale') + 1]) : 1
let items = JSON.parse(fs.readFileSync(path.resolve(payloadArg), 'utf8'))
if (!Array.isArray(items)) items = [items]
const outDir = path.resolve(outArg)
fs.mkdirSync(outDir, { recursive: true })

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' }
const server = http.createServer((req, res) => {
  const fp = path.join(HERE, decodeURIComponent(req.url.split('?')[0]))
  fs.readFile(fp, (e, buf) => {
    if (e) { res.writeHead(404); res.end() } else { res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(buf) }
  })
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port


const br = await chromium.launch()
const pg = await br.newPage({ viewport: { width: 1180, height: 1540 }, deviceScaleFactor: scale })
await pg.goto(`http://127.0.0.1:${port}/export.html`, { waitUntil: 'networkidle' })
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
  await pg.locator('.ddhq').screenshot({ path: path.join(outDir, `${name}.png`) })
  console.log(`${name}.png  ${1080 * scale}x${1440 * scale}`)
}
await br.close()
server.close()
