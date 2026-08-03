/* 全美 tilegram(13×8 方块地图)。
   数据与产品端 apps/app/src/components/primitives/us-jurisdiction-tiles.ts 同源 —— 改一处要同步另一处。
   之所以用方块而不是地理地图:缩略图尺寸下,罗德岛/特拉华在地理地图上会缩到看不见,
   方块地图每个辖区权重相等,一眼能认出高亮的是哪一个。 */

export const US_TILES = {
  WA: [1, 0],
  ME: [11, 0],
  OR: [1, 1],
  ID: [2, 1],
  MT: [3, 1],
  ND: [4, 1],
  MN: [5, 1],
  IL: [6, 1],
  WI: [6, 1.5],
  MI: [7, 1],
  VT: [10, 1],
  NH: [11, 1],
  NV: [2, 2],
  WY: [3, 2],
  SD: [4, 2],
  IA: [5, 2],
  IN: [6, 2],
  OH: [7, 2],
  PA: [8, 2],
  NJ: [9, 2],
  MA: [10, 2],
  RI: [11, 2],
  NY: [8, 1.5],
  CA: [1, 3],
  UT: [2, 3],
  CO: [3, 3],
  NE: [4, 3],
  MO: [5, 3],
  KY: [6, 3],
  WV: [7, 3],
  VA: [8, 3],
  MD: [9, 3],
  DE: [10, 3],
  CT: [11, 3],
  AZ: [2, 4],
  NM: [3, 4],
  KS: [4, 4],
  AR: [5, 4],
  TN: [6, 4],
  NC: [7, 4],
  SC: [8, 4],
  DC: [10, 4],
  OK: [4, 5],
  LA: [5, 5],
  MS: [6, 5],
  AL: [7, 5],
  GA: [8, 5],
  TX: [4, 6],
  FL: [9, 6],
  AK: [0, 7],
  HI: [1, 7],
  FED: [2, 7],
}

const COLS = 13
const ROWS = 8

/** 高亮州的方块地图。active = 州代码数组;每块 cell 边长 1,间距 gap。 */
export function tilegram({ active = [], cell = 1, gap = 0.14, label = true } = {}) {
  const on = new Set(active.filter(Boolean))
  const step = cell + gap
  const w = COLS * step - gap
  const h = ROWS * step - gap
  const r = cell * 0.16

  const rects = Object.entries(US_TILES)
    .map(([code, [col, row]]) => {
      const x = col * step
      const y = row * step
      const hot = on.has(code)
      const cls = hot ? 'ddhq__tile ddhq__tile--on' : 'ddhq__tile'
      const text =
        label && hot
          ? `<text x="${x + cell / 2}" y="${y + cell / 2}" class="ddhq__tilelab"
              text-anchor="middle" dominant-baseline="central"
              font-size="${cell * 0.4}">${code}</text>`
          : ''
      return `<rect class="${cls}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${r}"/>${text}`
    })
    .join('')

  return `<svg class="ddhq__tilegram" viewBox="0 0 ${w} ${h}" role="img"
    aria-label="${on.size ? [...on].join(', ') + ' highlighted on a US tile map' : 'US tile map'}"
    xmlns="http://www.w3.org/2000/svg">${rects}</svg>`
}

/** 高亮块的中心坐标(viewBox 单位),用于把计数徽章挂在正确的位置。 */
export function tileAnchor(code, { cell = 1, gap = 0.14 } = {}) {
  const t = US_TILES[code]
  if (!t) return null
  const step = cell + gap
  const w = COLS * step - gap
  const h = ROWS * step - gap
  return {
    xPct: ((t[0] * step + cell) / w) * 100,
    yPct: ((t[1] * step) / h) * 100,
  }
}
