---
title: 'Actions row drops reserved Review slot + Saved views / Reset retired'
date: 2026-05-21
author: 'Yuqi + Claude'
---

# Actions row drops reserved Review slot + Saved views / Reset retired

## 背景

两条独立但同步进的 UX 收尾：

1. **Dashboard "Actions this week"**：之前用 5 列 grid，最右一列永远为 hover
   出现的 `Review` 按钮预留位。结果是 collapsed row 在 `Xd late` 文字和右边
   缘之间永远空出一段空白，看起来像被挖了一块。Yuqi 直接点出："i don't
   like your design of always having space left for Review button at the end."

2. **Obligations 页 header**：`Saved views` 下拉 + `Reset` 按钮 Yuqi 想全部
   砍掉——saved view 是 CPA 几乎用不上的功能，header chrome 又重；reset
   filters 和 applied-filter strip 里的 "Clear filters" 重复。

## 做了什么

### Actions row（`apps/app/src/features/dashboard/actions-list.tsx`）

- 从 5 列 grid 改成 flex。`prompt` 文本拿到 `flex-1 min-w-0 truncate`，把所
  有富余空间吃掉，`RowMeta` 一直紧贴右边。
- `Review` 按钮变成**条件渲染**——`expanded ? <Button/> : null`。展开时按钮
  以一个新的 flex item 形式塞到 meta 右边；collapsed 时根本不在 DOM 里，没
  有保留位。
- 顺手删掉了原来用来"占位但隐藏"的 `opacity-0 / pointer-events-none /
tabIndex={-1} / aria-hidden` 一摞条件 className。

### Obligations header（`apps/app/src/routes/obligations.tsx`）

直接拆除整条客户端 Saved Views 流水线，避免留一堆死代码触发 lint：

- **PageHeader actions**：`Saved views` `<DropdownMenu>` + `Reset` 按钮全删。
- **URL 参数**：`view: parseAsString` 从 `obligationQueueSearchParamsParsers`
  里移除。
- **state**：`savedViewDraft` / `setSavedViewDraft` 删除。
- **query**：`savedViewsQuery` 和派生的 `savedViews` 删除。
- **mutations**：`createSavedViewMutation` / `updateSavedViewMutation` /
  `deleteSavedViewMutation` 全删。
- **functions**：`applySavedView` / `saveViewDraft` / `updateActiveSavedView`
  删除。
- **helpers**：`savedViewQueryPatch`、`isObligationQueueSort`、`isRecord`、
  `stringArrayFromUnknown`、`withDefaultDensityCleared`、`EMPTY_SAVED_VIEWS`、
  `currentSavedViewQuery` memo、`currentSavedColumnVisibility` memo 删除。
- **Dialog**：原本用来重命名 / 保存 view 的 `<Dialog>` 整段删除。
- **imports**：`FilterIcon` / `PinIcon` / `SaveIcon`（lucide）以及
  `ObligationQueueColumnVisibility` / `ObligationQueueSavedView`（contracts）
  从顶部 import 列表清掉。

**保留**：

- 服务端 RPC procedures（`orpc.obligations.{listSavedViews, createSavedView,
updateSavedView, deleteSavedView}`）。Audit log 那边还引用 saved-view 事件
  类型，删 procedures 会牵到多包，不在这次 UX polish 范围里。Procedures 没
  有调用方就是冷代码，无运行时副作用。
- `resetObligationQueue()` 函数本身——applied-filter strip 的 "Clear filters"
  链接和空状态的 `onClearFilters` 还在用。

## 为什么这样做

**为什么删 reserved slot 而不是把空白做得更克制：**
保留空白本质上是"hover 时不要 layout shift"的妥协。但 hover 时整行已经多
了 inline 详情面板，把 row 推开数十像素——右侧多一个按钮的宽度根本不会让
用户察觉。Yuqi 早就把行展开做成"主背景色变 + chevron 旋转 + 面板下移"的一
体动作了，所以即使 row 右端微微伸长，视觉上仍是一个连贯的"被展开"过程。
反之 collapsed 时空一块给一个用户看不到的按钮，每秒钟都在告诉用户"这里有
东西藏着"，是负 affordance。

**为什么不只是删 saved-view UI 留 RPC：**
留 client 端 mutation/state 但没有调用点会触发 `eslint(no-unused-vars)`，预
提交 hook（`vp check --fix`）当场失败。要么留 UI 要么全删 client 代码。Yuqi
已经表态删，所以一并清掉客户端代码。服务端 RPC 是另一回事——audit log 仍
对应这些事件类型，跨包改动不在这条 UX polish 的射程内。

**为什么删 Reset：**
Reset 和 applied-chip strip 里的 "Clear filters" 干同一件事，多一个入口反
而让用户不确定哪个更彻底。Clear filters 的位置（在 applied chips 旁边）已
经在"我有筛选 → 我想清掉"的视线路径上，header 那颗按钮是冗余冷启动入口。

## 验证

- `pnpm -F @duedatehq/app exec tsc --noEmit` 通过。
- `pnpm exec vp lint apps/app/src/routes/obligations.tsx apps/app/src/features/dashboard/actions-list.tsx`：0 errors。剩 2 个
  pre-existing 的 `no-unsafe-type-assertion` warning（`event.relatedTarget as Node`
  和 `STAGE_ANCHOR_STATUSES[i].includes(status as ObligationStatus)`），都不是这次的改动。
- `pnpm -F @duedatehq/app test`：46 个文件、255 个测试全部通过。
