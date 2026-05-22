---
title: 'Obligations queue filter bar polish'
date: 2026-05-21
author: 'Yuqi + Claude'
---

# Obligations queue filter bar polish

## 背景

Yuqi 在做 /obligations 页面的 UX 收尾时提出 4 个相关诉求：

1. 顶部状态 scope tab（`All 13 / Not started 5 / Waiting on client 1 / In review 2 / Filed 2`）
   现在是纯文字 + 数字。下方表格行里的状态徽章已经是带 status-dot 的彩色
   pill（`Filed` 绿、`Waiting on client` 黄、`Blocked` 红 ...）。两者风格不
   一致，希望它们共享同一套颜色语言（"maybe the colour?"）。
2. 同一行右侧的快速过滤 chip（`Past due / Due this week / Needs evidence /
Penalty input needed`）希望放到 tab 行**下方**单独一行。
3. 搜索框从原来的第二行（与 row count / Columns 同行）**移到** scope tab 那行的右端。
4. Columns 按钮"能再优化一下吗？"

## 做了什么

`apps/app/src/routes/obligations.tsx`

- 把原来的单 `<nav>` 拆成两行：
  - Row 1：scope tabs（左）+ search input（右，靠右对齐，`md:w-72 md:flex-none`）。
    底部 hairline `border-b border-divider-regular` 在外层容器上。
  - Row 2：4 个 action chip（左）+ Applied chips / rows count / Columns（右）。
- `ObligationQueueScopeTab` 新增可选 prop `dotTone`，渲染 `BadgeStatusDot`。
  渲染时每个状态 tab 用 `STATUS_DOT[status]`（从 `status-control` 导出的同一份
  canonical map），保证 tab 上的小圆点和行里 status pill 完全同色。`All` tab 没有
  dot（它是聚合值，不属于任何单一状态）。
- 从 `@/features/obligations/status-control` 增加 `STATUS_DOT` 的 import。
- Columns 按钮：
  - 删掉文字形式 `(2 hidden)`。
  - 加一个 notification-style 数字 pip：`bg-state-accent-active-alt
text-text-accent`（与 badge 的 `default` variant 同色，design-system 已有）。
    只在 `hiddenColumnsCount > 0` 时渲染，静态时按钮干净。
  - 给按钮加 `aria-label`，保留语义可访问性。
  - 下拉 header 加了一个 "Show all" 按钮（仅在有隐藏列时出现）：批量把所有
    `getCanHide() && !getIsVisible()` 的列重新显示，省得用户一项项点回来。

## 为什么这样做

**为什么用 STATUS_DOT 而不是把 tab 改成 Badge pill：**
tab 的视觉职责是"导航 + scope"，badge pill 的视觉职责是"这一行处于什么状态"。
如果 tab 也变成彩色 pill，scope 切换的语义会和 row badge 混淆（看起来像 5 个
filter badge 而不是 5 个 tab）。dot 是最轻的颜色承载方式——它复用 status badge
的 dot，颜色完全一致，但 tab 本身的"underline = 选中"导航语义被保留下来。

**为什么 Columns 用数字 pip 而不是 destructive 红点：**
之前 pulse-notifications-bell 用 `bg-state-destructive-solid` 的红 pip——那是
"有未读告警"，是 alert。Columns 隐藏列只是用户的视图偏好，不是告警，所以选了
"已自定义"对应的中性 accent tint，呼应 badge `default` variant 的色调。

**为什么 Search 放到 tab 行：**
"我在哪个 scope" + "我要找谁" 是两个互补的定位决策，物理上同行更顺手；下面那行
的 chip + meta 都是关于"在当前 scope 内进一步筛选 + 看表格属性"，语义内聚。

## 验证

- `pnpm -F @duedatehq/app exec tsc --noEmit` 通过。
- 预期视觉：
  - tab 行：`All 13` | `● Not started 5` | `● Waiting on client 1` | `● In review 2` | `● Filed 2` ……右端是 search input。
  - 第二行：`Past due / Due this week / Needs evidence / Penalty input needed` | 右端是 applied chip + `# rows` + `Columns [2]`。
  - Columns 下拉里 header 行：`Visible columns` + `Show all`（仅在有隐藏时）。
