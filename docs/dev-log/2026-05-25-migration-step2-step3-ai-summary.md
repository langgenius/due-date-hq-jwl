---
title: 'Migration Step 2/3 AI summary refactor'
date: 2026-05-25
author: 'Codex'
---

# Migration Step 2/3 AI summary refactor

## 背景

Migration onboarding 的 Step 2/3 之前把 AI mapper / normalizer 的中间表格直接交给用户审阅。真实 CPA practice 用户通常不知道内部字段应该怎么选，也无法在大批量客户导入时逐值修正。

## 做了什么

- Step 2 改为 `AI prepared your columns` 摘要：使用列、忽略列、平均置信度、EIN、例外数先展示；完整 mapping table 只在 `Review column details` 中展开。
- Step 3 改为 `AI cleaned your values` 摘要：normalizer 输出按 value group 聚合，显示 affected client count；value group 明细默认折叠，低置信、未识别和 safe fallback 作为例外提示。
- Default Matrix 的 tax type suggestions 默认应用，`Use suggested filings` 控件移到 `Adjust tax type defaults` 高级展开区。
- 新增 app-side pure view-model helper，继续复用现有 `MappingRow`、`NormalizationRow`、`MigrationError` 和 `MatrixApplicationView`，不改 DB / oRPC contract。
- Step 3 对确定性 normalizer miss 做 draft 修复：`C.A.` / `n.y.` 这类带点州缩写直接校正成项目内部州代码，`Form 990` 这类明确 return type 直接校正成 `federal_990`，不再把 `[]` / `No state match` 暴露给用户。

## 为什么这样做

主路径应该让 AI 完成 column edit 和 data cleanup，用户只确认结果摘要和少量例外。原始上传数据仍保留不变；AI 只是生成 clean import draft，正式客户和 deadline 仍只能在 Step 4 显式 Import 后写入。

## 验证

- `pnpm --filter @duedatehq/app test -- Step2Mapping.test.tsx Step3Normalize.test.tsx Wizard.test.tsx`
- `pnpm --filter @duedatehq/core test -- normalize-dict/index.test.ts`
- `pnpm --filter @duedatehq/server test -- _service.test.ts`
- `pnpm format`
- `pnpm check`
- `pnpm --filter @duedatehq/app i18n:extract`
- `pnpm --dir apps/app exec lingui compile`
- Local browser smoke check on `http://localhost:5173/migration/new?source=onboarding`
  with an e2e owner session and realistic pasted export rows:
  - Step 2 rendered `AI prepared your columns` with column summary cards and collapsed details.
  - Step 3 rendered `AI cleaned your values` with grouped cleaned values and tax-type defaults summary.

## 后续 / 未闭环

- `pnpm --filter @duedatehq/app i18n:compile` 仍会因 `zh-CN` catalog 中 193 条既有空翻译失败；本次新增的 Step 2/3 文案已补 zh-CN 翻译。
