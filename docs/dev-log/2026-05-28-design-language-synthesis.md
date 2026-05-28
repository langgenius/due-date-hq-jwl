# 2026-05-28 — Design language synthesis doc

## What

新增 `docs/Design/design-language-synthesis-2026-05-28.md` — 把 2026-05 audit
drain（clients critique 27 + dashboard actions brief + cross-route consistency
matrix + status pill audit + UI audit + design system drift audit）沉淀成的横向
设计风格文档。

## Why

之前的 audit 文档都是"问题清单 + 修复条目"，纵向、按页面组织。每次新增组件 / 页面
需要回去翻 7-8 份文档才能拼出风格全貌。本文把规则抽出来，作为下一轮 audit 的
**对照清单**。

具体覆盖：

- 字号 / 间距 / 宽度的 token 与演化记录
- 颜色 token 的语义边界（特别是 `variant="destructive"` ≠ AI）
- 7 个 shared primitives 的清单（StatTile / StateBadge / JurisdictionCode /
  LowConfidenceBadge / Breadcrumb back-link / Astroid / Chip pill）
- Hover 反馈三档（L1-L3）+ drawer vs route 决策
- AI 可见性约定（icon / 阈值 / tone helper 单一来源）
- 6 状态生命周期的呈现三件套
- 网格 vs Flex 决策
- i18n 纪律（plural + 真翻译）
- 工程地基（No N+1、canonical hook、inline rationale）
- 13 条 anti-patterns + 9 条速查决策框架
- 一句话风格定义

## How

- 内容直接来自这一轮对话里跟 Yuqi 反复 confirm 过的演化（卡片标题字号、hover
  必须改 fill、breadcrumb back-link variant、grid-cols-2 + 160px overflow 列、
  Astroid 唯一 AI icon、`isLowAiConfidence(0.5)` 唯一阈值 etc）。
- 引用了所有相关的现有 audit 文档作为配套阅读。
- 文末附演化时间线，把 7 份 audit 串成一条主线。

## 相关文档

- `docs/Design/cross-route-consistency-matrix.md`（清单式横向）
- `docs/Design/clients-critique-2026-05-27-audit-pass.md`（最近一次 audit）
- `docs/Design/status-pill-audit-2026-05-25.md`
- `docs/Design/ui-audit-2026-05-25.md`
- `docs/Design/design-system-drift-audit-2026-05-26.md`

## Files

- `docs/Design/design-language-synthesis-2026-05-28.md` — 新增
- `docs/dev-log/2026-05-28-design-language-synthesis.md` — 本文
