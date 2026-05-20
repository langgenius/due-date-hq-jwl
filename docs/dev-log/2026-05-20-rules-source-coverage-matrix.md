---
title: '2026-05-20 · Rules source coverage matrix'
date: 2026-05-20
author: 'Codex'
---

# Rules source coverage matrix

## 背景

Alabama review 暴露了一个治理问题：practice rule 变 active 不代表该州所有实体都有官方
source 覆盖。原 coverage table 只能表达 active / pending / none，无法区分 “没有 source”
和 “source 已登记但规则未 review”。

## 做了什么

- 给 `RuleSource` 增加 `domains`、`entityApplicability`、`authorityRole`，candidate 生成改为
  source-domain/entity 匹配，不再复用 individual source 生成 business candidate。
- 给 `RuleCoverageRow` 增加 `entitySourceCoverage`、`missingSourceCount`、
  `requiredSourceCount`、`sourceCoverageStatus` 和 `missingSourceDomains`。
- `rules.coverage` 先计算 source matrix，再叠加 practice rule 状态；active 仍只来自
  accepted concrete practice rule。
- Coverage UI 新增 `No source` / `Source only` / `Needs review` / `Active` 的实体状态，
  Sources drill 支持 `?domain=`。
- Alabama 作为首个完整样板州，补齐 individual estimated、corporate income、pass-through、
  business privilege、fiduciary、sales/use、withholding 和 UI wage report 官方 source。
- 第一批 completed source packs 扩展到 `CA`、`NY`、`TX`、`FL`、`WA`：
  - `CA` / `NY` 补齐 fiduciary、pass-through、sales/use、withholding、UI wage report source。
  - `TX` / `FL` / `WA` 增加 cell-level `not_applicable`，避免为不存在的州级
    income/withholding 税种登记假 source。
  - `TX` sales/use、UI wage report；`FL` sales/use、reemployment wage report；`WA`
    sales/use、UI wage report 已进入 source matrix。
- `pnpm rules:check-sources` 增加 source-domain matrix 校验，并跳过 generic checker 不适合
  直接 HEAD 的 `api_watch` source。Completed source pack completeness 现在覆盖
  `AL`、`CA`、`NY`、`TX`、`FL`、`WA`。
- 第二批 completed source packs 扩展到 `GA`、`IL`、`MA`、`NJ`、`PA`、`NC`、`VA`、`AZ`：
  - `GA` / `IL` / `MA` / `NJ` / `NC` 补齐 business、fiduciary、sales/use、
    withholding、UI wage report 相关 source matrix。
  - `PA` / `VA` / `AZ` 补齐可适用 source，并把无独立 franchise/entity tax 或
    pass-through-only 的 domain/entity cells 标为 `not_applicable`。
  - `AZDOR` / `DES`、Mass.gov、Virginia VEC 这类官方站点对机器 fetch 返回 403 或超时的
    source 降级为 `manual_review` + `degraded`，显示为 `source_registered`，不伪装成
    `source_verified`。
  - Completed source pack completeness 现在覆盖 14 个 jurisdictions：
    `AL`、`CA`、`NY`、`TX`、`FL`、`WA`、`GA`、`IL`、`MA`、`NJ`、`PA`、`NC`、`VA`、`AZ`。

## 验证

- `pnpm --filter @duedatehq/core test -- rules`
- `pnpm --filter @duedatehq/contracts test -- contracts`
- `pnpm --filter @duedatehq/server test -- rules`
- `pnpm --filter @duedatehq/app test -- coverage-tab`
- `pnpm rules:check-sources`
- `pnpm check:fix`
- `pnpm ready` attempted；仍失败在既有 DB tenant-scope 测试：
  `packages/db/src/repo/tenant-scope.test.ts:62` 期望 `fake.insertValues` 1 次，实际 2 次。

## 后续

- 下一批建议补 remaining high-priority jurisdictions，例如 `CO`、`MI`、`OH`、`OR`、`SC`、
  `TN`、`UT`、`WI`。
- 对 no-income-tax states 继续优先建 `not_applicable` cells，再补 sales/use 和 UI wage source。
