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
- 第三批 completed source packs 扩展到 `CO`、`MI`、`OH`、`OR`、`SC`、`TN`、`UT`、`WI`：
  - `CO` 用 DOR due-date guide + CDLE wage reporting 覆盖 income/business/fiduciary/
    sales/use/withholding/UI，独立 franchise/entity tax cells 标为 `not_applicable`。
  - `MI` 补齐 fiduciary、corporate income、flow-through entity tax、sales/use、
    withholding 和 UI source；Michigan.gov 403 页面降级为 `manual_review` + `degraded`。
  - `OH` 用官方 PDF 替换失效 tax.ohio.gov route，补齐 fiduciary、IT 4738、CAT、
    sales/use、withholding；UI wage report 采用 Ohio Administrative Code manual-review source。
  - `OR` 补齐 fiduciary、corporation excise/income、PTE elective tax、CAT、
    withholding/UI，并把 state sales/use tax cells 标为 `not_applicable`。
  - `SC`、`TN`、`UT`、`WI` 补齐各自可适用 source matrix；TN 的 current
    individual/fiduciary income tax、withholding、separate PTE return，以及 Utah required
    quarterly individual estimated tax schedule 使用 `not_applicable`。
  - Completed source pack completeness 现在覆盖 22 个 jurisdictions：
    `AL`、`CA`、`NY`、`TX`、`FL`、`WA`、`GA`、`IL`、`MA`、`NJ`、`PA`、`NC`、`VA`、
    `AZ`、`CO`、`MI`、`OH`、`OR`、`SC`、`TN`、`UT`、`WI`。
  - 第三批结束时 registry 为 189 个官方 source、240 个 review-only/active-backed rule
    templates；remaining states + `DC` seed 为 29 sources / 53 pending templates。
- 第四批 completed source packs 扩展到 `CT`、`MD`、`MN`、`IN`、`MO`、`LA`、`KY`、
  `OK`、`IA`、`KS`：
  - 用州税务局 tax calendar / due-date / filing-deadline source 覆盖 income、fiduciary、
    business、PTE、sales/use、withholding 的可适用 cells；用州 labor/workforce source
    覆盖 UI wage report。
  - `CT`、`MD`、`MN`、`IN`、`MO`、`IA`、`KS` 的无独立 franchise/entity tax cells 标为
    `not_applicable`；`OK` 的 current franchise tax cells 标为 `not_applicable`。
- 第五批 completed source packs 扩展到 `AR`、`DE`、`DC`、`HI`、`ID`、`ME`、`MS`、
  `MT`、`NE`、`NM`、`ND`、`RI`、`VT`、`WV`：
  - `AR`、`DE`、`DC`、`MS`、`NM`、`RI` 补齐 franchise/entity 或 corporation-scoped
    source，并对 partnership / pass-through / repealed cells 做 entity-level
    `not_applicable`。
  - `DE`、`MT` 的 no-statewide-sales/use cells 标为 `not_applicable`；`HI`、`ID`、
    `ME`、`NE`、`VT`、`WV` 等无独立 franchise/entity tax cells 标为 `not_applicable`。
- 第六批 completed source packs 扩展到 `AK`、`NV`、`NH`、`SD`、`WY`：
  - `AK` 用 corporate income + UI wage report source 覆盖可适用 cells；个人、
    fiduciary、PTE、statewide sales/use、withholding、franchise cells 标为 `not_applicable`。
  - `NV` 用 commerce tax、sales/use、UI source 覆盖可适用 cells；state income、
    fiduciary、business income/PTE、withholding cells 标为 `not_applicable`。
  - `NH` 用 BPT/BET + UI source 覆盖可适用 cells；I&D tax current-year、sales/use、
    withholding cells 标为 `not_applicable`。
  - `SD` 用 sales/use + UI source 覆盖可适用 cells；income/business/PTE/franchise/
    withholding cells 标为 `not_applicable`。
  - `WY` 用 sales/use、annual report license tax、UI source 覆盖可适用 cells；income/
    business/PTE/withholding cells 标为 `not_applicable`。
  - 新增 source 以 `manual_review` + `degraded` 登记，原因是这批官方来源混合 PDF、
    dynamic CMS、portal 页面和非统一 tax calendar；本轮只声明人工可核验的 official source
    coverage，不伪装成 machine watcher。
  - Completed source pack completeness 现在覆盖全部 51 个 state/DC jurisdictions。
  - Registry 当前为 271 个官方 source、459 个 review-only/active-backed rule templates；
    remaining jurisdictions 为 0。

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

- 后续 parser/source-health 工作应逐步把可稳定抓取的 `manual_review` source 升级为
  `html_watch` / `pdf_watch`，但必须先通过 endpoint-specific health check。
- 下一轮规则质量工作可以从 459 个 review-only/active-backed templates 中挑选高价值州种，
  生成 concrete due-date drafts；source coverage 完整不等于 practice rule active。
