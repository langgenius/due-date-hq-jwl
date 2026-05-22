---
title: 'Obligations queue: Projected risk column removed'
date: 2026-05-21
author: 'Yuqi + Claude'
---

# Obligations queue: Projected risk column removed

## 背景

Yuqi 决定把 obligations 表的 "Projected risk"（estimatedExposureCents）列拿掉。
原因没明说，但顺着前面几轮的设计走向能看出来：

- queue 里的 row meta 早就把美元数额删掉了（dashboard "Actions this week" 没
  $；exposure-strip 的 "At risk" 也没了）。
- 用户做 triage 时，决定打开哪一行靠的是 status + due date + smart priority dot
  这三件，几乎不是"这一单值多少美元"。
- 美元数字一旦放进列，眼睛会被它牵着走，反而把 status / due date 的层级压下去。
  Penalty 还是要算、还是要算清楚——只是不在 queue 这一层 surface。

## 做了什么

`apps/app/src/routes/obligations.tsx`：

- 删除 `accessorKey: 'estimatedExposureCents'` 整列定义（header 里的
  `ObligationQueueSortableHeader` + `RangeHeaderFilterDropdown` + cell 里的
  `ExposurePill` 一起删）。
- 删除 `ExposurePill` 函数本体（行 2619-2685 整段，包括 needs-input button、
  unsupported badge、accrued penalty 子行渲染）。
- 删除 `columnLabels.estimatedExposureCents` 这一项（Columns dropdown 现在
  不再列出这一列）。
- 删除 column-memo 的 deps array 里的 `riskMax` / `riskMin`（它们只为这一列
  里的 RangeHeaderFilterDropdown 服务，列删了 deps 跟着删）。

**保留**：

- URL params parser 上的 `riskMin: parseAsInteger` / `riskMax: parseAsInteger`
  （deep-link 兼容，外部分享的链接仍能带这两个数值）。
- `dollarsToCents(riskMin/Max)` 派生的 `minExposureCents` / `maxExposureCents`
  仍然喂给 `orpc.obligations.list` 的 input —— 服务器端 risk 过滤继续工作。
- empty-state 里 `riskMin !== null || riskMax !== null` 仍然算"有过滤"，触发
  "Clear filters" CTA。
- `penaltyRow` state + `setPenaltyRow` setter 留着，因为 penalty input 还能
  从其他位置（rule library / smart priority 等）打开。

也就是：UI 入口砍了，数据契约和 URL 兼容性都没动，将来需要把列再请回来或者
换种 surface 方式（drawer、tooltip on row）都是一行 JSX 的事。

## 为什么这样做

**为什么删整列而不是默认隐藏：**
"默认隐藏 + Columns dropdown 里能开回来"会让用户产生"这是 power-user 设
置"的错觉。我们的判断是 queue 行里就不该有美元——不是有些用户不想看到，
是放在这里本来就误导决策。"默认隐藏"反而把 UX 决策推给了用户。

**为什么保留 URL params + 服务端过滤：**

- 删 URL param 等于 break 既有 deep link。
- 服务端 list 的 `minExposureCents`/`maxExposureCents` 入参是公开 contract，
  其他客户端（CLI、报表、未来的 mobile）仍可能用。
- 等 Penalty 输入流程在 drawer 里彻底定下来再考虑下一步收尾。

**为什么把 ExposurePill 也删而不是留作 dead code：**
留着会触发 `eslint(no-unused-vars)` → pre-commit hook 失败。一删到底干净。
它本来就只服务这一列，没有别的复用者。

## 验证

- `pnpm -F @duedatehq/app exec tsc --noEmit`：clean。
- `pnpm exec vp lint apps/app/src/routes/obligations.tsx`：0 errors，剩 1 个
  pre-existing 的 `no-unsafe-type-assertion` warning（与本次改动无关）。
- `pnpm -F @duedatehq/app test`：46 文件 / 255 测试全过。
- 视觉：Obligations 表头剩 `Client / Owner / State / County / Tax type /
Internal deadline / Days / Evidence / Status`（外加首列 selector 复选框）。
