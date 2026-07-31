# 州×表格程序化矩阵 — spec 与分批核实计划（2026-07-31）

目标：把站内程序化覆盖从「每州一页」扩到「州×税种交叉页」
（`/states/[state]/[tax]`），承接 "Texas franchise tax due date 2026"、
"California FTB deadlines small business" 这类 C 层事实 prompt。上限≈500 页
（50 州 × 高频 10 类），但**页数不是目标，可核实是硬门槛**：每格 = 一条新的
一手核实事实。没有核实数据的格子不生成页面——这是与 Google
scaled-content-abuse 政策和本站数据红线划清界限的唯一防线。

## 与现有 spec 的关系

现有 `STATE_DEADLINES`（`seo-content.ts`）= 每州一行（主税种 + due + ext +
sourceHref）。矩阵是它的超集：升级为
`STATE_TAX_ROWS: Record<stateSlug, StateTaxRow[]>`，每行：

```ts
interface StateTaxRow {
  tax: 'income' | 'franchise' | 'sales' | 'withholding' | 'annual-report' | …
  label: string; labelZh: string
  due: string; dueZh: string          // 一般规则口径，同现有 STATE_DEADLINES
  ext?: string; extZh?: string
  sourceLabel: string; sourceHref: string  // 州税务机关官方页，逐行必填
  verifiedOn: string                   // 逐行核实日期
}
```

五面自动（与现有纪律一致）：州页新增分税种区块 → 新交叉路由
`/states/[state]/[tax]`（仅当该格有数据）→ `/deadline-lookup` 州面板多行化 →
`/data/deadlines.json` 扩行 → llms-full.txt 州行扩展。EN+zh 同步。

## 分批顺序（按需求信号，不按字母）

1. **B1（≈40 格）**：franchise/annual-report 类——TX franchise、DE franchise、
   CA FTB LLC fee、OH CAT 等。搜索意图最明确、与现有 GSC 查询重叠最高。
2. **B2（≈50 格）**：sales tax 月度/季度申报节奏（各州通用规则页，不做
   per-filer 频率判定）。
3. **B3（≈100 格）**：withholding 存缴节奏 + 州年报。
4. 之后按 GSC 实际曝光词逐批加。

## 核实流水线（每批固定流程）

1. 从州税务机关官网（不是聚合站）逐格转录 due/ext + 来源 URL。
2. 第二遍独立复核（另一 agent 或隔日自查），diff 两遍结果，不一致的格子standby。
3. 通过的格子进 `STATE_TAX_ROWS` 并带 `verifiedOn`；未过的不上线。
4. 每批一条 dev-log + content-metadata 逐 slug 首发日期。

## 状态

- 2026-07-31：spec 定稿（本文档）。
- 2026-07-31 晚：**B1a SHIPPED** —— 13 州 15 格经 6-agent 两遍独立核实后
  上线 `/franchise-tax-deadlines`（EN+zh，`lib/state-tax-rows.ts`）。
  standby 2 格：CA 公司最低 franchise（官方页未给缴付时点）、IL（ilsos.gov
  403 挡爬 + 疑似 2026 废止未证实，需人工核）。流水线实测教训：单遍 agent 会
  过度归纳（AL 延期规则并不在其引用页上）——两遍 diff + 分歧三查是必要的。
- 下一批：B1b = 州级 leaf 页（等 GSC 出需求信号）；B2 = sales tax 节奏页；
  standby 2 格复核。
