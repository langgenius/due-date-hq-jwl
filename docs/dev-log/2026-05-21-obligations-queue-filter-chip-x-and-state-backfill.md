---
title: 'Obligations queue: chip × button, applied-strip dropped, Load more hidden, jurisdiction backfill'
date: 2026-05-21
author: 'Yuqi + Claude'
---

# Obligations queue: chip × button, applied-strip dropped, Load more hidden, jurisdiction backfill

## 背景

Yuqi 在 /obligations 页继续 UX 收尾，一次提出 4 个改动 + 5 个问题。代码部分：

1. "Load more" 按钮在没有下一页时仍然渲染（只是 disabled），视觉上像
   error state。希望直接隐藏。
2. `APPLIED Penalty input needed · Clear filters` 提示带状被点出是冗余——
   活跃过滤 chip 本身就在那行，状态写两遍没意义。
3. 希望在活跃 chip 上加一个 × 关闭按钮，让"如何取消"更直觉。
4. 所有行的 State 列都显示 `—`，明显是 demo 数据问题。

## 做了什么

### `apps/app/src/routes/obligations.tsx`

- **Load more 条件渲染**：把 `<Button disabled={!hasNextPage || ...}>`
  外层包了 `{listQuery.hasNextPage ? (...) : null}`。没下一页就不渲染按钮，
  本身的 disabled 仅留给 `isFetchingNextPage` 状态用。行尾的 `# obligations`
  数字已经告诉用户 list 到底了。
- **删除 "Applied · chips · Clear filters" 带状**：连同 `appliedFilterChips`
  memo 一起删。状态在过滤 chip 上一目了然。
- **ObligationQueueActionChip 加 ×**：active 状态下在内容右侧渲染一个
  `XIcon`（lucide，size-3）。点击 chip 任意位置仍然 toggle off（行为不
  变），× 只是"我可以被关掉"的视觉提示。

### `mock/demo.sql`

- **修复一个 pre-existing 的 seed bug**：第 264 行注释里有个 `;`，被
  `splitSqlStatements` 当成语句边界切断，导致 `seed:demo` 一直报 `near
"these": syntax error at offset 7786`。把分号改成破折号。
- **回填 `obligation_instance.jurisdiction`**：在 obligation INSERT 后面
  追加一条 `UPDATE`，根据 `tax_type` 前缀推 jurisdiction：
  - `federal_*` → `FED`
  - `ca_*` / `ny_*` / `tx_*` / `fl_*` / `co_*` / `wa_*` / `ma_*` → 对应州代码
  - 其他保持 NULL
  - 只回填 jurisdiction IS NULL 的行，避免覆盖将来真实导入的值。
- 用 `substr(tax_type, 1, N) = 'prefix_'` 而不是 `LIKE 'prefix\_%' ESCAPE '\\'`，
  避免 wrangler/D1 SQL 解析在 escape 字符上出岔。

## 为什么这样做

**为什么 chip × 而不是单独一个"Clear filters" 按钮：**
"Clear filters" 是核选项——一键清掉所有过滤。如果只有一个过滤打开着，按
钮的"复数 filters"措辞反而不准。改成 × on chip 后：

- 想关掉一个就点这个 chip 的 × 或点 chip 本身，二选一都通。
- 想全清掉就重复点几个 chip，或者继续点击当前 active 的 scope tab "All"。
- 一旦用户加了第三方面板（saved view 那种重型工具），再考虑加"Clear all"。

**为什么 Load more 直接消失而不是淡化：**
A disabled "Load more" 按钮永远在那里就是噪音——它说"还有，但你不能取"。
列表已经走到末尾时，唯一诚实的 UI 状态是"没了"。底部 `# obligations` 数
字就足够表达"你看到了全部"。

**为什么 seed bug 顺手修：**
本来不在这次任务范围内，但如果不修，jurisdiction 回填永远跑不起来，State
列的演示就废了。一个分号改成破折号，1 行 diff。

**为什么 jurisdiction 不在 INSERT 里直接写而用 UPDATE：**
demo.sql 的 obligation INSERT 已经有 17 列，把第 18 列加进去要改 23 行字
段，每行手填 jurisdiction 码（且容易跟 tax_type 不一致）。一条 UPDATE 用
tax_type 推 jurisdiction 一次到位，未来如果再加 obligation 行也不用每行
重新维护。

## 验证

- `pnpm -F @duedatehq/app exec tsc --noEmit` 通过。
- `pnpm exec vp lint apps/app/src/routes/obligations.tsx`：0 errors，1 个
  pre-existing 的 `no-unsafe-type-assertion` warning。
- `pnpm -F @duedatehq/app test`：46 文件 / 255 测试全过。
- `pnpm db:seed:demo` 成功执行（修了 pre-existing 的分号 bug 之后）。
- D1 验证：`SELECT tax_type, jurisdiction FROM obligation_instance WHERE
firm_id='mock_firm_brightline' LIMIT 12` 全部带值（FED / CA / NY / TX 等）。

## 顺便回答 Yuqi 在同一轮里问的设计问题

1. **客户名前的小圆点是什么？**
   是 **Smart Priority 指示点**（`apps/app/src/routes/obligations.tsx`
   L1102-L1124）：score≥70 红、≥45 黄、≥25 蓝，<25 不显示。意思是这一
   行在智能排序里"分数高"，用户不用看一个专门的 priority 列。

2. **客户名旁是不是该加 avatar / 在线 logo？**
   设计师视角：不建议。专业税务 SaaS 的客户多是公司实体（不是个人），
   logo 一致性低，会变成 16px 灰色字母占位符的海洋。Linear / Notion 那种
   "用 logo 装饰"在 deal pipeline 里有用，但 obligations queue 是"低视觉
   噪音 + 高密度信息"场景，加 avatar 反而稀释了 status pill 和 due date
   的视觉重量。如果将来真做品牌化，建议留给 client detail page 的 hero
   区，而不是 queue 行。

3. **Owner = CPA 负责人？**
   是的（L1136-L1176）。`assigneeName` 字段，分配给一个 firm member。如
   果该 member 就是当前登录用户，行里会出现一个 `You` 高亮 chip。

4. **State 为啥都是 `—`？**
   demo seed 的 INSERT 没填 `jurisdiction` 字段。已通过 UPDATE 补上
   （见上方 mock/demo.sql 改动）。

5. **同一个客户能有多个 obligation 吗？是 Magnolia Family Trust 吗？**
   是的，demo 数据里：
   - **Northstar Dental Group**：5 条（federal_1120s 当年 / 1120s 上年 /
     ny_ct3s / federal_941 / ny_sales_st100）——最适合演示 same-client 分组。
   - Magnolia Family Trust：2 条（federal_1041 + fl_corp_income）。
   - Lakeview Medical Partners：2 条。
   - Arbor & Vale LLC：2 条。
   - 其他每家 1 条。

   现成的 same-client 分组渲染逻辑在 `continuationRowIds`（L1071-L1094）：
   同一个 client 的第 2、3...条会用一个 ┗ 连接线代替重复的 client name，
   保持视觉层级。
