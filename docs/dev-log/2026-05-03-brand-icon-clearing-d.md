---
title: '2026-05-03 · Brand icon Clearing D rollout'
date: 2026-05-03
---

# 2026-05-03 · Brand icon Clearing D rollout

## 背景

原 `Deadline Radar Pulse` mark 过于抽象，偏工程 spec，缺少 fintech 与会计事务所
的行业气质。本轮基于新的 `Clearing D` 方向替换项目内品牌 icon：强 D monogram、
账本短横线、cyan deadline pulse、midnight navy tile。

## 变更

- `packages/ui/src/assets/brand/brand-mark.svg` 替换为 256×256 Clearing D 完整版。
- `packages/ui/src/assets/brand/brand-favicon.svg` 替换为 32×32 light favicon。
- `packages/ui/src/assets/brand/brand-favicon-dark.svg` 替换为 32×32 dark inline 变体。
- `apps/app/public/favicon.svg` 与 `apps/marketing/public/favicon.svg` 同步为 light favicon 副本。
- `packages/ui/src/assets/brand/README.md` 更新资产表、语义说明与同步纪律。
- `docs/Design/DueDateHQ-DESIGN.md` §15 从 `Deadline Radar Pulse` 更新为 `Clearing D`。

## 设计语义

- 深 midnight navy tile：fintech app / HQ workbench。
- 银色 D：DueDateHQ 产品识别，优先保证小尺寸可读。
- Brass ledger tick + muted silver ticks：会计账本 / working papers。
- Cyan pulse dot：deadline risk 被命中；继续承接 Deadline Radar 语义。

## 验证

- `xmllint --noout` 覆盖 5 个 SVG brand assets。
- `pnpm check` 覆盖 TypeScript / lint / type-aware checks。
