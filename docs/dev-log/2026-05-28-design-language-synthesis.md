# 2026-05-28 — Design language synthesis doc + indigo → Dify Blue sweep

## What

两件事在同一 commit 里发生：

### 1. 新增 design language synthesis 文档 (v2)

`docs/Design/design-language-synthesis-2026-05-28.md` — 把 2026-05 audit drain
（clients critique 27 + dashboard actions brief + cross-route consistency
matrix + status pill audit + UI audit + design system drift audit）沉淀成的
横向设计风格文档。

V2 修订（同日下午）跟 Claude Code 离线生成的 DS 对照后补全：

- §1 Aesthetic anchor — Mercury / Sana AI / Oku / Linear（采用 generated DS 的措辞）
- §2 八条 taste principles（采用 generated DS 的清单）
- §4 字体使用 — 区分 mono 跟 Inter `tabular-nums`（generated DS 提到，v1 漏了）
- §6 surface dimensions — sidebar 220/56/280, drawer 400/440/560/640 等
  全部按 live 代码 grep 出来，**不**用 generated DS 猜的 720-880px workflow drawer
- §8 radius 三档 + **chip 两层制**：Tier A `rounded-sm` (primitives) +
  Tier B `h-7 rounded-full` (详情头 meta-row)。两层是 by design，
  generated DS 漏识别了 Tier B
- §11 Motion tokens — `--ease-apple: cubic-bezier(0.32, 0.72, 0, 1)`、
  duration-300 默认、`motion-reduce:` 强制。Generated DS 想象的
  Pulse banner breathing / Genesis odometer 在 live 代码里**不存在**，
  本文删掉
- §12 Voice & copy — sentence case / no emoji / no exclamation /
  第二人称 marketing / source attribution
- §15 Severity never-paint — pills + 2px 左 bar，永远不画整卡或行左 border
- §20 决策框架速查表大幅扩充

### 2. Sweep `#5B5BD6` legacy indigo → `#155aef` Dify Blue

Generated DS 在 README 里 flag 了：DESIGN.md 还在用 legacy indigo，runtime
已经换成 Dify Blue。这是真的 doc-vs-runtime drift。已替换：

- `DESIGN.md` (root)：3 处 token 行 + accent-hover / active / text / tint
  全部对齐到 Dify Blue 家族
  - tertiary `#5B5BD6` → `#155aef`
  - accent-default `#5B5BD6` → `#155aef`
  - accent-hover `#4F46E5` → `#004aeb`
  - accent-active `#4338CA` → `#003dc1`
  - accent-text `#4338CA` → `#004aeb`
  - accent-tint `#F1F1FD` → `#eff4ff`
  - §Colors 段 prose 更新 "indigo" → "Dify UI Blue"
- `docs/product-design/migration-copilot/01-mvp-and-journeys.md`：focus ring
  hex 描述
- `docs/product-design/migration-copilot/07-live-genesis.md`：硬规则 example
  hex
- `docs/product-design/migration-copilot/08-migration-report-email.md`：
  Revert CTA email template HTML + token 解释表
- `packages/ui/src/styles/preset.css`：page-width 注释更新成 live 现状
  （expanded 是 dense 工作台默认，wide 留给 Settings / Billing / Migration）

**不动**：`docs/dev-log/2026-04-*` 几份 — 那些是历史决策记录，时间点上
indigo 是当时的事实，不应改写。

## Why

- 把跨页面设计共识从 7 份 page-specific critique 抽出来，下一轮 audit
  直接对照本文，不必再次 re-derive
- 把 `#5B5BD6` legacy indigo 残留全部肃清，doc 跟 runtime 对齐
- 把 Claude Code 生成的离线 DS 当作种子，而不是替代品 —— generated
  偏 token / brand / 视觉，本文偏组件契约 / 决策 / 流程纪律，互补
- preset.css 注释跟实际代码差太远（说 wide 1100 用于 Today/Clients/Dashboard
  但实际全跑 expanded 1440），改完才不误导后来人

## 验证

- `git grep "5B5BD6\|5b5bd6"` 现在只剩 `docs/dev-log/2026-04-*` 几份
  历史记录（预期保留）
- `preset.css` 注释跟 live 代码（`grep -rn max-w-page-`）对齐
- Synthesis doc §6 surface dimensions 表里每个数字都从 live grep 拿到

## Files

- `docs/Design/design-language-synthesis-2026-05-28.md` — 重写（v2）
- `docs/dev-log/2026-05-28-design-language-synthesis.md` — 本文
- `DESIGN.md` — accent 家族对齐到 Dify Blue
- `docs/product-design/migration-copilot/01-mvp-and-journeys.md`
- `docs/product-design/migration-copilot/07-live-genesis.md`
- `docs/product-design/migration-copilot/08-migration-report-email.md`
- `packages/ui/src/styles/preset.css` — page-width 注释

## 相关文档

- `docs/Design/cross-route-consistency-matrix.md`（清单式横向）
- `docs/Design/clients-critique-2026-05-27-audit-pass.md`（最近一次 audit）
- `docs/Design/status-pill-audit-2026-05-25.md`
- `docs/Design/ui-audit-2026-05-25.md`
- `docs/Design/design-system-drift-audit-2026-05-26.md`
- 离线 generated DS：`/Users/yuqi/Downloads/DueDateHQ Design System/`
  （用作种子参照，不在 repo 内）
