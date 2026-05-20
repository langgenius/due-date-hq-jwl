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

## 验证

- `pnpm --filter @duedatehq/core test -- rules`
- `pnpm --filter @duedatehq/contracts test -- contracts`
- `pnpm --filter @duedatehq/server test -- rules`
- `pnpm --filter @duedatehq/app test -- coverage-tab`
- `pnpm rules:check-sources`
- `pnpm check:fix`

## 后续

- 下一批建议补 `GA`、`IL`、`MA`、`NJ`、`PA`、`NC`、`VA`、`AZ`。
- 对 no-income-tax states 继续优先建 `not_applicable` cells，再补 sales/use 和 UI wage source。
