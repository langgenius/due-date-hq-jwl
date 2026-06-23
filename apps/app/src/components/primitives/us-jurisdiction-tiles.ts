// Shared 13×8 US tilegram layout — each entry is [col, row], origin (0,0)
// top-left, roughly mirroring the continental US. AK / HI / FED are pinned
// to the bottom-left corner per the USPS/NPR tilegram convention (FED is
// not geographic — it just shares the compact grid). Sources: NPR's
// tilegrams (Pitch Interactive), Wikipedia's US cartogram tile layout.
//
// Consumed by BOTH the /alerts StateTilegram (alert-count filter) and the
// /rules/library RuleCoverageMap (review-coverage heat), so the two maps
// can never drift apart geographically.
export const US_JURISDICTION_TILES: Record<string, [number, number]> = {
  // Row 0 — Pacific Northwest / New England
  WA: [1, 0],
  ME: [11, 0],
  // Row 1
  OR: [1, 1],
  ID: [2, 1],
  MT: [3, 1],
  ND: [4, 1],
  MN: [5, 1],
  IL: [6, 1],
  WI: [6, 1.5], // close to IL, slightly above
  MI: [7, 1],
  VT: [10, 1],
  NH: [11, 1],
  // Row 2 — Mountain / Midwest band
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
  NY: [8, 1.5], // upper-right
  // Row 3 — California / Plains / Mid-Atlantic
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
  // Row 4 — South-West / South
  AZ: [2, 4],
  NM: [3, 4],
  KS: [4, 4],
  AR: [5, 4],
  TN: [6, 4],
  NC: [7, 4],
  SC: [8, 4],
  DC: [10, 4],
  // Row 5 — Deep South
  OK: [4, 5],
  LA: [5, 5],
  MS: [6, 5],
  AL: [7, 5],
  GA: [8, 5],
  // Row 6 — Texas / Florida
  TX: [4, 6],
  FL: [9, 6],
  // Row 7 — Alaska / Hawaii / Federal
  AK: [0, 7],
  HI: [1, 7],
  FED: [2, 7],
}

export const US_TILE_GRID_COLS = 13
export const US_TILE_GRID_ROWS = 8
export const US_TILE_CELL_SIZE = 36 // px — comfortable click target
export const US_TILE_CELL_GAP = 2 // px — light separation
