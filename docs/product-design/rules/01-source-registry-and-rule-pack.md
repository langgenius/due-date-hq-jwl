# 01 · Source Registry 与 MVP Rule Pack

> 版本：v0.5（14 天 MVP · 2026-04-27）
> 上游：`README.md` §2 / §4、`docs/report/DueDateHQ-MVP-Deadline-Rules-Plan.md` §3-§10
> 目标：定义 rules 如何从官方来源采集为全局模板，并由每个 practice 审核为 active rules 后再被 obligation / reminder / risk 消费

## 1. 一句话设计

Rules 采集不是“爬网页自动改日期”，而是一个带审计的 practice governance 工作流：

```text
Official source
  -> source snapshot
  -> parser / AI template draft
  -> global rule template
  -> practice owner/manager review
  -> active practice_rule
  -> obligation generation / reminder / AI Tip
```

MVP 的风险边界是：**AI 可以加速抽取，不能替代 owner/manager 审核；pending template 可以预览影响，不影响用户 deadline；active practice rule 才能生成 obligation。**

## 1.1 当前代码实现

第一版结构化数据已经落到 `packages/core/src/rules/index.ts`，以
`@duedatehq/core/rules` 暴露，并通过 `rules.*` oRPC contract 接入 server。当前代码实现已经从 6 辖区 seed 扩展为 `FED + 50 states + DC` 的官方 source-connected registry：

| Jurisdiction | Sources | Active practice rules | Pending templates | 当前重点                                                                                                                                                                           |
| ------------ | ------- | --------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FED`        | 15      | 13                    | 1                 | 1040、1065、1120-S、1120、1041、941、1099、990、corporate estimated tax、disaster relief pending template watch                                                                    |
| `AL`         | 10      | 0                     | 10                | 首个完整 source-domain pack：individual、business、fiduciary、sales/use、withholding、UI wage report 都已补齐                                                                      |
| `CA`         | 9       | 5                     | 10                | LLC Form 568、LLC annual tax、LLC estimated fee、100S、100；已补齐 fiduciary、pass-through、sales/use、withholding、UI wage report source matrix                                   |
| `NY`         | 10      | 7                     | 10                | IT-204、IT-204-LL、CT-3、CT-3-S、PTET election / estimates / return-extension；已补齐 fiduciary、pass-through、sales/use、withholding、UI wage report source matrix                |
| `TX`         | 8       | 4                     | 3                 | franchise annual report、PIR/OIR、extension、sales/use、UI wage report；无州级 income/withholding 的 cells 标为 `not_applicable`                                                   |
| `FL`         | 6       | 2                     | 4                 | F-1120、corporate estimated tax、sales/use、reemployment wage report；无个人所得税、fiduciary、pass-through、withholding 等 cells 标为 `not_applicable`                            |
| `WA`         | 5       | 3                     | 3                 | combined excise monthly / quarterly / annual、sales/use、UI wage report；无州级 income/withholding 的 cells 标为 `not_applicable`，WA DOR/ESD sources 以 manual-review source 登记 |
| `GA`         | 6       | 0                     | 10                | tax due dates、fiduciary、corporate/net worth、sales/use、withholding、UI wage report source matrix 已补齐；LLC/partnership entity-tax cells 标为 `not_applicable`                 |
| `IL`         | 7       | 0                     | 10                | business income/replacement tax、fiduciary、estimated tax、sales/use、withholding、UI wage report source matrix 已补齐                                                             |
| `MA`         | 4       | 0                     | 10                | DOR due dates/extensions、corporate excise、UI wage report source matrix 已补齐；Mass.gov blockers 以 manual-review source 登记                                                    |
| `NJ`         | 3       | 0                     | 10                | 2026 tax calendar + labor wage report source matrix 已补齐                                                                                                                         |
| `PA`         | 7       | 0                     | 9                 | PIT/fiduciary、CNIT、pass-through、sales/use、withholding、UI wage report source matrix 已补齐；无 franchise/entity tax cells 标为 `not_applicable`                                |
| `NC`         | 7       | 0                     | 10                | corporate income/franchise、pass-through、fiduciary、sales/use、withholding、UI wage report source matrix 已补齐                                                                   |
| `VA`         | 7       | 0                     | 9                 | fiduciary、corporation income、pass-through、sales/use、withholding、UI wage report source matrix 已补齐；无 franchise/entity tax cells 标为 `not_applicable`                      |
| `AZ`         | 8       | 0                     | 9                 | individual estimated、fiduciary、corporate income、pass-through、TPT、withholding、UI wage report source matrix 已补齐；AZDOR/DES blockers 以 manual-review source 登记            |
| `CO`         | 3       | 0                     | 9                 | DOR due-date guide 覆盖 individual estimated、business、fiduciary、sales/use、withholding；UI wage report 已补齐；无独立 franchise/entity tax cells 标为 `not_applicable`          |
| `MI`         | 7       | 0                     | 9                 | fiduciary、corporate income、flow-through entity tax、sales/use、withholding、UI wage report source matrix 已补齐；Michigan.gov blockers 以 manual-review source 登记              |
| `OH`         | 7       | 0                     | 8                 | fiduciary、IT 4738、commercial activity tax、sales/use、withholding、UI wage report source matrix 已补齐；无 business income tax cells 标为 `not_applicable`                       |
| `OR`         | 6       | 0                     | 9                 | fiduciary、corporation excise/income、PTE elective tax、CAT、withholding/UI source matrix 已补齐；无 state sales/use tax cells 标为 `not_applicable`                               |
| `SC`         | 7       | 0                     | 10                | fiduciary、corporate income/license fee、partnership、sales/use、withholding、UI wage report source matrix 已补齐；SC DEW blocker 以 manual-review source 登记                     |
| `TN`         | 4       | 0                     | 5                 | franchise/excise、sales/use、UI wage report source matrix 已补齐；无 current individual/fiduciary income tax、withholding、separate PTE return cells 标为 `not_applicable`         |
| `UT`         | 7       | 0                     | 9                 | individual filing、fiduciary forms index、corporate franchise/income、pass-through SALT、sales/withholding、UI wage report source matrix 已补齐；individual estimated 标为 n/a     |
| `WI`         | 7       | 0                     | 10                | fiduciary、corporation franchise/income、pass-through withholding、sales/use、withholding、UI wage report source matrix 已补齐；pass-through franchise cells 标为 `not_applicable` |
| `CT`         | 3       | 0                     | 9                 | DRS 2026 due-date calendar 覆盖 income/business/fiduciary/PTE/sales/withholding；DOL UI wage report 已补齐；无独立 franchise/entity tax cells 标为 `not_applicable`                |
| `MD`         | 3       | 0                     | 9                 | Comptroller deadlines 覆盖 individual estimated、fiduciary、business/PTE、sales/use、withholding；Labor UI wage report 已补齐；无独立 franchise/entity tax cells 标为 n/a          |
| `MN`         | 3       | 0                     | 9                 | Revenue tax due dates + UI wage detail due dates 覆盖可适用 matrix；无独立 franchise/entity tax cells 标为 `not_applicable`                                                        |
| `IN`         | 3       | 0                     | 9                 | DOR filing deadlines + DWD quarterly report due dates 覆盖可适用 matrix；无独立 franchise/entity tax cells 标为 `not_applicable`                                                   |
| `MO`         | 3       | 0                     | 9                 | DOR 2026 tax calendar + Labor wage report 覆盖可适用 matrix；current corporation franchise tax cells 标为 `not_applicable`                                                         |
| `LA`         | 3       | 0                     | 10                | LDR tax calendar 覆盖 business/franchise/PTE/fiduciary/sales/withholding；LWC UI source 已补齐                                                                                     |
| `KY`         | 3       | 0                     | 10                | DOR 2026 tax calendar 覆盖 corporation income/LLET/PTE/sales/withholding；KCC UI source 已补齐                                                                                     |
| `IA`         | 3       | 0                     | 9                 | IDR business due dates + IWD UI source 覆盖可适用 matrix；无独立 franchise/entity tax cells 标为 `not_applicable`                                                                  |
| `KS`         | 3       | 0                     | 9                 | KDOR KS-1515 tax calendar + KDOL UI source 覆盖可适用 matrix；无独立 franchise/entity tax cells 标为 `not_applicable`                                                              |
| `AR`         | 8       | 0                     | 10                | DFA income/corporate/PTE/sales/withholding sources、SOS franchise tax、DWS UI source 已补齐；partnership franchise 与 pass-through business-income cells 标为 n/a                  |
| `DE`         | 4       | 0                     | 9                 | business tax forms、franchise tax、UI source 已补齐；无 statewide sales/use tax cells 标为 `not_applicable`                                                                        |
| `DC`         | 4       | 0                     | 10                | OTR filing deadline、business franchise、sales/withholding、DOES UI source matrix 已补齐                                                                                           |
| `HI`         | 4       | 0                     | 9                 | DOTAX forms、GET/use tax、UI source matrix 已补齐；无独立 franchise/entity tax cells 标为 `not_applicable`                                                                         |
| `ID`         | 4       | 0                     | 9                 | income/business、sales/withholding due dates、UI source matrix 已补齐；无独立 franchise/entity tax cells 标为 `not_applicable`                                                     |
| `ME`         | 3       | 0                     | 9                 | MRS due-date list 覆盖 income/business/fiduciary/PTE/sales/withholding；UI source 已补齐；franchise tax不进入当前 entity matrix                                                    |
| `MS`         | 5       | 0                     | 10                | corporate income/franchise、PTE/fiduciary、sales/withholding、UI source matrix 已补齐；franchise/business income按 corporation/PTE 分层                                            |
| `MT`         | 3       | 0                     | 8                 | Revenue due dates + UI source 覆盖可适用 matrix；无 statewide sales/use 与无独立 franchise/entity tax cells 标为 `not_applicable`                                                  |
| `NE`         | 3       | 0                     | 9                 | DOR tax calendar + UI source 覆盖可适用 matrix；无独立 franchise/entity tax cells 标为 `not_applicable`                                                                            |
| `NM`         | 8       | 0                     | 10                | individual estimated、fiduciary、corporate income/franchise、PTE、GRT、withholding、UI source matrix 已补齐；franchise/business income按 corporation/PTE 分层                      |
| `ND`         | 6       | 0                     | 9                 | tax types、corporate income deadlines、sales/use、withholding、UI source matrix 已补齐；无独立 franchise/entity tax cells 标为 `not_applicable`                                    |
| `RI`         | 5       | 0                     | 10                | corporate/PTE forms、sales/use、withholding、UI source matrix 已补齐                                                                                                               |
| `VT`         | 3       | 0                     | 9                 | tax filing source + UI source 覆盖可适用 matrix；无独立 franchise/entity tax cells 标为 `not_applicable`                                                                           |
| `WV`         | 3       | 0                     | 9                 | Tax Division business source + UI source 覆盖可适用 matrix；business franchise tax cells 标为 `not_applicable`                                                                     |
| `AK`         | 3       | 0                     | 3                 | corporate income、UI wage report source 已补齐；个人/fiduciary/PTE/sales/use/withholding/franchise cells 标为 `not_applicable`                                                     |
| `NV`         | 4       | 0                     | 3                 | commerce tax、sales/use、UI source 已补齐；无 state income/withholding/business income/PTE cells 标为 `not_applicable`                                                             |
| `NH`         | 3       | 0                     | 5                 | BPT/BET、UI source 已补齐；I&D tax已废止、无 sales/use、无 withholding cells 标为 `not_applicable`                                                                                 |
| `SD`         | 3       | 0                     | 2                 | sales/use、UI source 已补齐；无 state income/business income/PTE/franchise/withholding cells 标为 `not_applicable`                                                                 |
| `WY`         | 4       | 0                     | 3                 | sales/use、annual license tax、UI source 已补齐；无 state income/business income/PTE/withholding cells 标为 `not_applicable`                                                       |

代码里的 seed/rule pack 现在只负责初始化全局模板和 demo 数据。新增 50 州 + DC 规则以 pending template / `source_defined_calendar` 落地：它们能出现在 Rules Console、Migration review 和 evidence trail 中，但不会自动生成用户提醒。每个 practice 的 owner 或 manager 可在 Rules 表或 Rule detail 中基于官方 source excerpt、due-date logic、extension policy 和 coverage status 接受为本所 active rule；如果 candidate 仍是 `source_defined_calendar`，必须先有产品预热生成并缓存的 AI concrete draft，再由用户审阅接受，不能直接接受 placeholder。

当前代码 registry 合计 271 个官方 source。Federal source 已从单一 Pub 509 + 7004
扩展为 Pub 509、Form 1065 instructions、Form 1120-S instructions、Form 1120
instructions、Form 7004 instructions、IRS disaster relief、FEMA early warning，避免
只用综合日历解释具体表单 deadline。

50 州 + DC 的 template source 不再使用 agency homepage。每个 `RuleSource` 现在显式声明
`domains`、`entityApplicability` 和 `authorityRole`，candidate 生成必须由
source-domain/entity 匹配驱动；不会复用个人所得税 source 生成 business rule。Coverage 也拆成
两层：source coverage 显示 `missing_source` / `source_registered` / `source_verified`，
practice rule coverage 才显示 `rule_pending_review` / `rule_active`。Alabama 是首个完整
样板州；completed source packs 现在覆盖全部 51 个 state/DC jurisdictions：`AL`、`AK`、
`AZ`、`AR`、`CA`、`CO`、`CT`、`DE`、`DC`、`FL`、`GA`、`HI`、`ID`、`IL`、`IN`、
`IA`、`KS`、`KY`、`LA`、`ME`、`MD`、`MA`、`MI`、`MN`、`MS`、`MO`、`MT`、`NE`、
`NV`、`NH`、`NJ`、`NM`、`NY`、`NC`、`ND`、`OH`、`OK`、`OR`、`PA`、`RI`、`SC`、
`SD`、`TN`、`TX`、`UT`、`VT`、`VA`、`WA`、`WV`、`WI`、`WY`。
其中 `TX`、`FL`、`WA` 对无州级 income/withholding 的 domain/entity cell 使用
`not_applicable`；`PA`、`VA`、`AZ` 对无独立 franchise/entity tax 的 cells 使用
`not_applicable`；`GA`、`MA`、`NC`、`SC`、`UT`、`WI` 对 corporation-scoped
franchise/entity tax 使用
entity-level `not_applicable`。这些 cells 不会登记不存在的 source，也不会生成 placeholder
rule。`CO` 对无独立 franchise/entity tax、`OH` 对无 business income tax、`OR` 对无
state sales/use tax、`TN` 对无 current individual/fiduciary income tax 与 withholding、
`UT` 对无 required quarterly individual estimated tax schedule 使用 `not_applicable`。新增
的 `AK`、`NV`、`NH`、`SD`、`WY` 对 no-income-tax / no-withholding cells 使用
`not_applicable`；`AK`、`DE`、`MT`、`NH` 对 no-statewide-sales/use cells 使用
`not_applicable`。现在没有 state/DC source gap；只有 source 覆盖或 `not_applicable`
的 domain/entity 会生成 review-only candidate。

本轮核验后的人工复核规则：

- Federal Form 1065：LLC 只有在 taxed as partnership 时才适用，因此 `requiresApplicabilityReview=true`，避免普通 LLC 被无条件生成 1065 obligation。
- Federal Form 1120：June 30 year-end / short-year exception 需要人工判断，因此 `coverageStatus=manual`，后续由客户 fiscal-year facts 决定。
- CA Form 568：官方 booklet 明确 LLC return due date 依赖 federal classification 与 owner type，因此代码中标为 `applicability_review` + `manual`，不作为全 LLC 的无条件日期。
- FL F-1120：DOR PDF 是按 taxable year end 提供日期表，因此代码中保留 `source_defined_calendar`，不硬编码为单一 calendar-year 规则。
- TX PIR/OIR：官方页面说明 PIR/OIR due on annual franchise report due date，但 entity 类型决定 PIR vs OIR，因此保留 `requiresApplicabilityReview`。
- WA DOR、AZDOR/DES、Mass.gov、Michigan.gov、Ohio Codes、SC DEW、TN LWD、Utah DWS
  和 Virginia VEC 部分页面：官方页面可人工核验，但当前直接 fetch 返回 403 或超时；代码中标为
  `manual_review` + `healthy`。`manual_review` 只是 acquisition method，不再代表 CPA-facing
  source health 降级。
- FEMA：只作为 IRS disaster relief early warning，不作为 tax deadline source。

Rule-to-obligation preview 已落地：

- Core 入口：`previewObligationsFromRules`。
- API 入口：`rules.previewObligations`。
- 输入：客户 `entityType`、`state`、`taxTypes`、`taxYearStart`、`taxYearEnd` 和可选 holiday list。
- 输入约束：`entityType` 使用真实 client entity enum（含 `other`，不含 rule-only 的
  `any_business`）；`state` 接受 50 州 + `DC`。
- 输出：`ruleId`、`ruleVersion`、`matchedTaxType`、`period`、`dueDate`、`sourceIds`、`evidence`、`requiresReview`、`reviewReasons`、`reminderReady`。
- 只有 `reminderReady=true` 的 preview 才能进入后续 reminder scheduling；review-only preview 只允许页面展示来源、证据和 CPA 检查项。

2026-05-23 local income coverage note：

- Local income coverage v1 **不新增独立 local UI**，也不把 city/county/PSD 直接扩进
  `RuleJurisdiction`；`RuleJurisdiction` 继续只表示 `FED + 50 states + DC`。
- Local source 进入现有 Rule Library / Sources / Pending rules 流程，通过
  `RuleSource.localJurisdiction` / `ObligationRule.localJurisdiction` 标记父州下的 local
  source scope，并用 `localFactRequirements` 记录生成前必须确认的结构化 local facts（例如
  resident county、work municipality、PSD code、collector、filing channel）。
- 首批 local sources 只覆盖五个 high-value review-only pack：MD local income、IN county
  LIT、NYC/Yonkers、PA EIT/LST、OH municipal income。
- 这些 local candidate rules 均为 `source_defined_calendar` + `applicability_review`，默认
  不会生成 reminder-ready obligation。即使 practice 以后接受了 concrete local rule，只要
  `localFactRequirements` 对应事实缺失，preview 仍保持 `requiresReview=true` /
  `reminderReady=false`。
- PA/OH 不把一个 lookup source 当成所有 local obligations 的 basis：PA EIT、Act 32 employer
  withholding、LST 分别注册；OH The Finder 保留为 lookup source，annual return / net profit
  filing 使用 Ohio Revised Code source。
- Public/product copy 应表达为："Local coverage is available only where explicitly listed and
  reviewed." 不能表达为 full county/city coverage。

Source 拉取命令：

```sh
pnpm rules:check-sources
```

该 repo-level source checker 会对 `html_watch` / `pdf_watch` /
`email_subscription` source 做机器拉取检查；`manual_review` 和 `api_watch` source 明确输出
skipped（API source 由专用 adapter 检查）。checker 同时校验 source-domain matrix：未知
domain、空 entity applicability、completed source pack（全部 51 个 state/DC
jurisdictions）required source gap、candidate/source domain mismatch 都会失败。checker 不放在
`packages/core`，core 只保留纯规则数据、DueDateLogic 和 preview 计算。

Source watch 到 Pulse 的流程：

```text
Worker scheduled gate (Monday 09:00 UTC)
  -> pulse.rule_source.scan queue item per RuleSource
  -> source freshness + R2 snapshot
  -> pulse.extract@v2 classification
  -> deadline_shift: Pulse due-date overlay workflow
  -> non-deadline changes: review-only Pulse alert
```

这个流程不再生成内部 rule-pack proposal。`html_watch` 和 `pdf_watch` source 会自动抓取、归档
R2、更新 freshness；`manual_review`、`email_subscription` 和 `api_watch` source 只更新
freshness，不伪装成机器已核验。source 内容未变化时只更新
freshness，不触碰 AI concrete draft。source 内容变化后进入 Pulse：`deadline_shift` 且同时解析出
original/new due date 时走 due-date overlay；filing requirement、applicability、form
instruction、source status、new obligation 和 other 均为 review-only Pulse alert，只允许
dismiss/snooze/mark reviewed，不写客户 obligation overlay。

Rule Library 仍然只表达基座规则。产品开发者只有在决定要把临时变化吸收进基座时，才更新
`packages/core/src/rules/index.ts` 并 bump/add rule version；发布后 catalog sync 再 fan-out
review task 并 enqueue 当前版本 AI concrete draft。

Source-defined rule 的 AI concrete draft 缓存以当前语义版本为目标：
`ruleId + sourceId + rule.version + promptVersion`。因此 freshness-only source check 不会隐藏旧 draft；
rule version 变化或新 rule 发布后，catalog sync 会 enqueue 当前版本全局 draft generation。人工
report/inspect/backfill/snapshot CLI 已退役；concrete draft 不再作为 Rule Library source watch 的
运维入口，也不作为 source 变化的审核通道。失败仅记录为 AI output / metric，不阻塞 review task。

Concrete draft live source fetch 会先使用已归档的 source snapshot / rule
evidence；只有没有 source-backed text 时才 fallback 到官方 URL。配置
`PULSE_BROWSERLESS_URL` 后，live fetch 可在 direct fetch 失败时走 Browserless；配置
`PULSE_BROWSERLESS_SOURCE_IDS` 可让已知困难 source 优先走 Browserless。`manual_review`、
`email_subscription`、`api_watch` 没有归档正文时不伪装成机器核验成功，draft 失败继续保留为
ops 数据。

## 2. Source Registry

`RuleSource` 是规则采集的入口清单。没有登记到 registry 的来源，不视为当前 rules 覆盖范围。

### 2.1 Federal

| Source ID                    | 官方来源                                                                                                               | 类型         | 用途                                                                  | 采集方式                     | MVP 频率 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------- | ---------------------------- | -------- |
| `irs.pub509.2026`            | [IRS Publication 509 (2026)](https://www.irs.gov/publications/p509)                                                    | calendar     | 全国通用 due dates、周末/法定假日顺延原则、税务日历                   | HTML snapshot + PDF fallback | 每周     |
| `irs.i1065.2025`             | [IRS Instructions for Form 1065](https://www.irs.gov/instructions/i1065)                                               | instructions | Partnership Form 1065 filing due date                                 | HTML parse                   | 季度     |
| `irs.i1120s.2025`            | [IRS Instructions for Form 1120-S](https://www.irs.gov/instructions/i1120s)                                            | instructions | S-Corp return due date、estimated tax payment pattern                 | HTML parse                   | 季度     |
| `irs.i1120.2025`             | [IRS Instructions for Form 1120](https://www.irs.gov/instructions/i1120)                                               | instructions | C-Corp return due date、estimated tax payments                        | HTML parse                   | 季度     |
| `irs.i7004.2025`             | [IRS Instructions for Form 7004](https://www.irs.gov/instructions/i7004)                                               | instructions | Business extension policy；重点标记 extension does not extend payment | HTML parse                   | 季度     |
| `irs.disaster`               | [IRS Tax Relief in Disaster Situations](https://www.irs.gov/newsroom/tax-relief-in-disaster-situations)                | emergency    | disaster relief exception templates                                   | HTML watch                   | 每日     |
| `fema.disaster_declarations` | [OpenFEMA Disaster Declarations Summaries](https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2) | api          | early warning；只提示内部关注，不生成税务 deadline                    | API                          | 每日     |

### 2.2 California

| Source ID                           | 官方来源                                                                                                                           | 类型         | 用途                                                      | 采集方式   | MVP 频率 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------- | ---------- | -------- |
| `ca.ftb.business_due_dates`         | [CA FTB Due dates: businesses](https://www.ftb.ca.gov/file/when-to-file/due-dates-business.html)                                   | due_dates    | LLC、partnership、S-Corp、C-Corp return/payment/extension | HTML parse | 每周     |
| `ca.ftb.llc_webpay`                 | [CA LLC Web Pay payment types](https://webapp.ftb.ca.gov/webpay/help/llc)                                                          | payment      | LLC annual tax、estimated fee、extension payment          | HTML parse | 每周     |
| `ca.ftb.efile_calendar`             | [CA FTB e-file calendars](https://www.ftb.ca.gov/tax-pros/efile/e-file-calendars.html)                                             | calendar     | calendar-year filing and extension dates                  | HTML parse | 每周     |
| `ca.ftb.emergency_relief`           | [CA Emergency tax postponement](https://www.ftb.ca.gov/file/when-to-file/Emergency-tax-relief.html)                                | emergency    | California disaster/emergency exception templates         | HTML watch | 每日     |
| `ca.ftb.tax_news`                   | [CA FTB Tax News](https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html)                                                   | news         | rule-change discovery for tax pros                        | HTML watch | 每周     |
| `ca.ftb_estates_trusts`             | [CA FTB Estates and Trusts](https://www.ftb.ca.gov/file/personal/filing-situations/estates-and-trusts/index.html)                  | instructions | fiduciary income return source coverage                   | HTML watch | 季度     |
| `ca.cdtfa_sales_use_filing_dates`   | [CDTFA Filing Dates for Sales and Use Tax Returns](https://www.cdtfa.ca.gov/taxes-and-fees/sales-use-tax-returns-filing-dates.htm) | calendar     | sales/use return schedule                                 | HTML watch | 每周     |
| `ca.edd_required_filings_due_dates` | [CA EDD Required Filings and Due Dates](https://edd.ca.gov/en/payroll_taxes/required_filings_and_due_dates/)                       | due_dates    | withholding and UI wage report source coverage            | HTML watch | 每周     |

### 2.3 New York

| Source ID                                | 官方来源                                                                                                 | 类型         | 用途                                                        | 采集方式                                 | MVP 频率 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------- | ---------------------------------------- | -------- |
| `ny.tax_calendar.2026`                   | [NY 2026 tax filing dates](https://www.tax.ny.gov/help/calendar/2026.htm)                                | calendar     | corporation tax、partnership、PTET、estimated payment dates | HTML table parse                         | 每周     |
| `ny.ptet`                                | [NY Pass-through entity tax](https://www.tax.ny.gov/bus/ptet/)                                           | instructions | PTET election/payment/return/extension                      | HTML parse                               | 每周     |
| `ny.it204ll`                             | [NY Partnership, LLC, and LLP annual filing fee](https://www.tax.ny.gov/pit/efile/annual_filing_fee.htm) | instructions | IT-204-LL filing fee and no-extension rule                  | HTML parse                               | 季度     |
| `ny.partnerships`                        | [NY Partnerships](https://www.tax.ny.gov/pit/efile/partneridx.htm)                                       | instructions | IT-204 partnership return due dates                         | HTML parse                               | 季度     |
| `ny.email_services`                      | [NY Email services](https://www.tax.ny.gov/help/subscribe.htm)                                           | subscription | urgent notifications and deadline extensions discovery      | manual subscription + inbox parser later | 每周确认 |
| `ny.personal_fiduciary_filing_due_dates` | [NY Income Tax Filing Due Dates](https://www.tax.ny.gov/pit/file/income_tax_filing_due_dates.htm)        | due_dates    | fiduciary income return due-date source coverage            | HTML watch                               | 每周     |
| `ny.sales_tax_vendor_due_dates`          | [NY Helpful Reminders for Sales Tax Vendors](https://www.tax.ny.gov/bus/st/helpful_reminders.htm)        | due_dates    | sales/use return source coverage                            | HTML watch                               | 每周     |
| `ny.withholding_tax_due_dates`           | [NY Withholding Tax Due Dates](https://www.tax.ny.gov/bus/wt/duedates.htm)                               | due_dates    | withholding and UI wage report source coverage              | HTML watch                               | 每周     |

### 2.4 Texas

| Source ID                     | 官方来源                                                                                                                    | 类型         | 用途                                                  | 采集方式      | MVP 频率 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------- | ------------- | -------- |
| `tx.franchise_home`           | [TX Franchise Tax](https://comptroller.texas.gov/taxes/franchise/index.php/taxes/franchise/questionnaire.php)               | due_dates    | annual franchise tax report due date                  | HTML watch    | 每周     |
| `tx.franchise_overview`       | [TX Franchise Tax Overview](https://comptroller.texas.gov/taxes/publications/98-806.php)                                    | publication  | due date, extension, late filing penalty context      | HTML parse    | 季度     |
| `tx.franchise_annual_report`  | [TX Annual Report Instructions](https://comptroller.texas.gov/help/franchise/information-report.php?category=taxes)         | instructions | PIR/OIR requirements and annual due date              | HTML parse    | 季度     |
| `tx.franchise_extensions`     | [TX Franchise Tax Extensions](https://comptroller.texas.gov/taxes/franchise/filing-extensions.php/1000)                     | instructions | extension payment requirements and extended due dates | HTML parse    | 季度     |
| `tx.franchise_forms_2026`     | [TX Franchise Tax Report Forms for 2026](https://comptroller.texas.gov/taxes/franchise/forms/2026-franchise.php)            | forms        | report-year changes, no-tax-due threshold behavior    | HTML watch    | 每周     |
| `tx.sales_use_tax`            | [TX Sales and Use Tax](https://comptroller.texas.gov/taxes/sales/index.php)                                                 | instructions | sales/use return source coverage                      | HTML watch    | 每周     |
| `tx.ui_wage_report_due_dates` | [TX TWC Tax Report and Payment Due Dates](https://www.twc.texas.gov/programs/unemployment-tax/tax-report-payment-due-dates) | due_dates    | UI wage report source coverage                        | manual review | 季度     |

### 2.5 Florida

| Source ID                        | 官方来源                                                                                                                               | 类型         | 用途                                                        | 采集方式                       | MVP 频率 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------- | ------------------------------ | -------- |
| `fl.cit_home`                    | [FL Corporate Income Tax](https://floridarevenue.com/taxes/taxesfees/Pages/corporate.aspx?source=post_page---------------------------) | due_dates    | F-1120, F-1065, extension and payment rules                 | HTML parse                     | 每周     |
| `fl.cit_due_dates_pdf`           | [FL Corporate Income Tax Due Dates PDF](https://floridarevenue.com/taxes/Documents/flCitDueDates.pdf)                                  | calendar     | tax-year-end specific due dates and estimated payment dates | PDF text parse + manual review | 每周     |
| `fl.f7004`                       | [FL Form F-7004](https://floridarevenue.com/Forms_library/current/f7004.pdf)                                                           | form         | tentative tax / extension request evidence                  | PDF snapshot                   | 季度     |
| `fl.tips`                        | [FL Tax Information Publications](https://floridarevenue.com/taxes/tips/Pages/default.aspx)                                            | news         | official updates, due-date changes                          | HTML watch                     | 每周     |
| `fl.subscribe`                   | [FL Subscribe to Our Publications](https://floridarevenue.com/Pages/subscribe.aspx)                                                    | subscription | TIP email watch setup                                       | manual subscription            | 每周确认 |
| `fl.sales_use_tax`               | [FL Sales and Use Tax](https://floridarevenue.com/taxes/taxesfees/Pages/sales_tax.aspx)                                                | instructions | sales/use return source coverage                            | HTML watch                     | 每周     |
| `fl.reemployment_tax_return_pay` | [FL Reemployment Tax Return and Payment Information](https://floridarevenue.com/taxes/taxesfees/Pages/rt_return_pay.aspx)              | instructions | UI wage report source coverage                              | HTML watch                     | 季度     |

### 2.6 Washington

| Source ID                           | 官方来源                                                                                                                                                 | 类型         | 用途                                              | 采集方式      | MVP 频率   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------- | ------------- | ---------- |
| `wa.excise_due_dates_2026`          | [WA 2026 Excise tax return due dates](https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates/2026-excise-tax-return-due-dates)                   | calendar     | monthly/quarterly/annual excise and B&O due dates | manual review | 每周       |
| `wa.filing_frequencies`             | [WA Filing frequencies & due dates](https://dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates)                                                      | instructions | filing frequency model                            | manual review | 季度       |
| `wa.bo_tax`                         | [WA Business & occupation tax](https://dor.wa.gov/taxes-rates/business-occupation-tax)                                                                   | instructions | B&O applicability and return context              | manual review | 季度       |
| `wa.annual_business`                | [WA Annual business filers](https://www.dor.wa.gov/file-pay-taxes/filing-frequencies-due-dates/annual-business-filers)                                   | due_dates    | annual return date                                | HTML parse    | 每周       |
| `wa.news`                           | [WA DOR News releases](https://dor.wa.gov/about/news-releases)                                                                                           | news         | due-date change and relief discovery              | HTML watch    | 每周       |
| `wa.capital_gains_exception_2026`   | [WA Capital Gains due date moved to May 1, 2026](https://dor.wa.gov/about/news-releases/2026/capital-gains-excise-tax-returns-due-date-moved-may-1-2026) | news         | example exception overlay pattern                 | manual review | 一次性样例 |
| `wa.esd_quarterly_tax_wage_reports` | [WA ESD Quarterly Tax and Wage Reports](https://esd.wa.gov/employer-requirements/quarterly-reports/how-file-your-quarterly-tax-and-wage-reports)         | due_dates    | UI wage report source coverage                    | manual review | 季度       |

## 3. MVP 初始 Rule Pack

### 3.1 Federal rules

| Rule ID                            | Tier             | Entity                                 | Tax type                     | Due date logic                                                                            | Source                                        |
| ---------------------------------- | ---------------- | -------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| `fed.1065.return.2025`             | `annual_rolling` | partnership / LLC taxed as partnership | `federal_1065`               | 15th day of 3rd month after tax year end; weekend/holiday next business day               | `irs.i1065.2025`                              |
| `fed.1120s.return.2025`            | `annual_rolling` | S-Corp                                 | `federal_1120s`              | 15th day of 3rd month after tax year end; weekend/holiday next business day               | `irs.i1120s.2025`                             |
| `fed.1120.return.2025`             | `annual_rolling` | C-Corp                                 | `federal_1120`               | 15th day of 4th month after tax year end; June 30 exception marked `applicability_review` | `irs.i1120.2025`                              |
| `fed.1120.estimated_tax.2026`      | `annual_rolling` | C-Corp                                 | `federal_1120_estimated_tax` | 15th day of 4th, 6th, 9th, 12th months of tax year                                        | `irs.i1120.2025`                              |
| `fed.7004.extension.business.2025` | `basic`          | partnership / S-Corp / C-Corp          | `federal_7004_extension`     | file by original return due date; extension applies to filing, not payment                | `irs.i7004.2025`                              |
| `fed.disaster_relief.template`     | `exception`      | all                                    | `federal_disaster_relief`    | no automatic rule; template captures covered areas, dates, affected forms                 | `irs.disaster` + `fema.disaster_declarations` |

### 3.2 California rules

| Rule ID                          | Tier             | Entity      | Tax type                | Due date logic                                               | Source                                            |
| -------------------------------- | ---------------- | ----------- | ----------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `ca.llc.568.return.2025`         | `annual_rolling` | LLC         | `ca_form_568`           | follows FTB business due-date table by LLC classification    | `ca.ftb.business_due_dates`                       |
| `ca.llc.annual_tax.2026`         | `basic`          | LLC         | `ca_llc_annual_tax_800` | 15th day of 4th month after beginning of taxable year        | `ca.ftb.business_due_dates` + `ca.ftb.llc_webpay` |
| `ca.llc.estimated_fee.2026`      | `basic`          | LLC         | `ca_llc_estimated_fee`  | 15th day of 6th month of current tax year                    | `ca.ftb.business_due_dates` + `ca.ftb.llc_webpay` |
| `ca.partnership.565.return.2025` | `annual_rolling` | Partnership | `ca_565_partnership`    | 15th day of 3rd month after close of tax year                | `ca.ftb.business_due_dates`                       |
| `ca.corp.100.return.2025`        | `annual_rolling` | C-Corp      | `ca_100_franchise`      | FTB corporation row; calendar-year concrete date from source | `ca.ftb.business_due_dates`                       |
| `ca.scorp.100s.return.2025`      | `annual_rolling` | S-Corp      | `ca_100s_franchise`     | FTB S-Corp row; calendar-year concrete date from source      | `ca.ftb.business_due_dates`                       |
| `ca.emergency_relief.template`   | `exception`      | all         | `ca_emergency_relief`   | review-only until FTB/IRS relief is accepted by the practice | `ca.ftb.emergency_relief`                         |

### 3.3 New York rules

| Rule ID                           | Tier                   | Entity                           | Tax type                | Due date logic                                                                    | Source                                     |
| --------------------------------- | ---------------------- | -------------------------------- | ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| `ny.it204.return.2025`            | `annual_rolling`       | Partnership                      | `ny_it204`              | calendar year: March 15 adjusted; fiscal year: 15th day of 3rd month after close  | `ny.partnerships` + `ny.tax_calendar.2026` |
| `ny.it204ll.filing_fee.2025`      | `applicability_review` | LLC / LLP / Partnership          | `ny_it204ll`            | 15th day of 3rd month after close; no extension; applicability review required    | `ny.it204ll`                               |
| `ny.ct3.return.2025`              | `annual_rolling`       | C-Corp                           | `ny_ct3`                | 15th day of 4th month after close; fiscal-year logic retained                     | `ny.tax_calendar.2026`                     |
| `ny.ct3s.return.2025`             | `annual_rolling`       | S-Corp                           | `ny_ct3s`               | 15th day of 3rd month after close                                                 | `ny.tax_calendar.2026`                     |
| `ny.ptet.election.2026`           | `applicability_review` | Partnership / NY S-Corp          | `ny_ptet_election`      | must be confirmed by authorized person; tax professional cannot elect for client  | `ny.ptet`                                  |
| `ny.ptet.estimated_payments.2026` | `applicability_review` | electing Partnership / NY S-Corp | `ny_ptet_estimated_tax` | March 16, June 15, September 15, December 15 for 2026; only for electing entities | `ny.ptet` + `ny.tax_calendar.2026`         |
| `ny.ptet.return_extension.2025`   | `applicability_review` | electing Partnership / NY S-Corp | `ny_ptet_return`        | annual return generally March 15; extension extends filing, not payment           | `ny.ptet`                                  |

### 3.4 Texas rules

| Rule ID                                  | Tier                   | Entity                                                        | Tax type                  | Due date logic                                                                                    | Source                                        |
| ---------------------------------------- | ---------------------- | ------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `tx.franchise.annual_report.2026`        | `annual_rolling`       | taxable entities                                              | `tx_franchise_report`     | annual report due May 15; weekend/holiday next business day                                       | `tx.franchise_home` + `tx.franchise_overview` |
| `tx.franchise.pir_oir.2026`              | `annual_rolling`       | corporations / LLCs / LPs / financial institutions and others | `tx_pir_oir`              | due on annual franchise report due date                                                           | `tx.franchise_annual_report`                  |
| `tx.franchise.extension.2026`            | `applicability_review` | taxable entities                                              | `tx_franchise_extension`  | request/payment due by original report due date; payment requirements depend on prior/current tax | `tx.franchise_extensions`                     |
| `tx.franchise.no_tax_due_threshold.2026` | `applicability_review` | entities under threshold                                      | `tx_no_tax_due_threshold` | not a filing conclusion; flag CPA to confirm revenue threshold and PIR/OIR requirement            | `tx.franchise_forms_2026`                     |

### 3.5 Florida rules

| Rule ID                           | Tier             | Entity      | Tax type                 | Due date logic                                                                                          | Source                                 |
| --------------------------------- | ---------------- | ----------- | ------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `fl.f1120.return.2025`            | `annual_rolling` | C-Corp      | `fl_f1120`               | generally later of statutory state rule and federal-related due date; calendar-year date from DOR table | `fl.cit_home` + `fl.cit_due_dates_pdf` |
| `fl.f7004.extension.2025`         | `annual_rolling` | C-Corp      | `fl_f7004_extension`     | file extension with tentative payment by original Florida return due date                               | `fl.cit_home` + `fl.f7004`             |
| `fl.f1065.return.2025`            | `annual_rolling` | Partnership | `fl_f1065`               | 1st day of 4th month after close                                                                        | `fl.cit_home`                          |
| `fl.cit.estimated_tax.2026`       | `annual_rolling` | C-Corp      | `fl_cit_estimated_tax`   | tax-year-end table in DOR PDF                                                                           | `fl.cit_due_dates_pdf`                 |
| `fl.tip.deadline_change.template` | `exception`      | all         | `fl_tip_deadline_change` | review-only; review TIPs before accepting                                                               | `fl.tips`                              |

### 3.6 Washington rules

| Rule ID                           | Tier                   | Entity                                  | Tax type                       | Due date logic                                                             | Source                               |
| --------------------------------- | ---------------------- | --------------------------------------- | ------------------------------ | -------------------------------------------------------------------------- | ------------------------------------ |
| `wa.excise.monthly.2026`          | `annual_rolling`       | businesses assigned monthly frequency   | `wa_combined_excise_monthly`   | source table concrete due dates; weekend/holiday adjusted in code          | `wa.excise_due_dates_2026` + `wa.bo` |
| `wa.excise.quarterly.2026`        | `annual_rolling`       | businesses assigned quarterly frequency | `wa_combined_excise_quarterly` | source table concrete due dates; weekend/holiday adjusted in code          | `wa.excise_due_dates_2026` + `wa.bo` |
| `wa.excise.annual.2026`           | `annual_rolling`       | annual filers                           | `wa_combined_excise_annual`    | annual return due April 15, adjusted if weekend/holiday                    | `wa.excise_due_dates_2026` + `wa.bo` |
| `wa.bo.applicability`             | `applicability_review` | businesses with WA gross receipts       | `wa_bo_tax`                    | not a default deadline alone; used to explain why excise return may matter | `wa.bo_tax`                          |
| `wa.capital_gains.exception.2026` | `exception`            | individual capital gains taxpayers      | `wa_capital_gains_exception`   | example overlay: 2025 filing year moved to May 1, 2026                     | `wa.capital_gains_exception_2026`    |

## 4. 结构化数据设计

### 4.1 RuleSource

```ts
type RuleSource = {
  id: string
  jurisdiction: 'FED' | 'AL' | 'AK' | /* ... */ | 'WY' | 'DC'
  title: string
  url: string
  sourceType:
    | 'calendar'
    | 'instructions'
    | 'form'
    | 'publication'
    | 'news'
    | 'emergency_relief'
    | 'due_dates'
    | 'early_warning'
    | 'subscription'
  acquisitionMethod:
    | 'html_watch'
    | 'pdf_watch'
    | 'manual_review'
    | 'email_subscription'
    | 'api_watch'
  cadence: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'pre_season'
  priority: 'critical' | 'high' | 'medium' | 'low'
  healthStatus: 'healthy' | 'degraded' | 'failing' | 'paused'
  isEarlyWarning: boolean
  domains: RuleSourceDomain[]
  entityApplicability: EntityApplicability[]
  authorityRole: 'basis' | 'cross_check' | 'watch' | 'early_warning'
  notificationChannels: string[]
  lastReviewedOn: string
}
```

`degraded` / `failing` enum 值为历史兼容保留。当前 CPA-facing 语义只使用
`healthy`（显示为 watched）和 `paused`；fetch/parser 失败只更新内部诊断字段
（如 `lastError`、`consecutiveFailures`、ingest metrics）。

### 4.2 RuleTemplate

```ts
type RuleTemplate = {
  id: string
  sourceId: string
  version: number
  jurisdiction: string
  templateJson: unknown
  status: 'available' | 'deprecated'
  createdAt: string
}
```

### 4.3 PracticeRule

```ts
type PracticeRule = {
  id: string
  firmId: string
  ruleId: string
  version: number
  jurisdiction: 'FED' | 'CA' | 'NY' | 'TX' | 'FL' | 'WA'
  taxYear: number
  applicableYear: number
  entityApplicability: string[]
  taxType: string
  formName: string
  ruleTier: 'basic' | 'annual_rolling' | 'exception' | 'applicability_review'
  eventType: 'filing' | 'payment' | 'extension' | 'election' | 'information_report'
  isFiling: boolean
  isPayment: boolean
  dueDateLogic: DueDateLogic
  extensionPolicy: ExtensionPolicy
  sourceIds: string[]
  evidence: RuleEvidence[]
  quality: RuleQualityChecklist
  coverageStatus: 'full' | 'skeleton' | 'manual'
  status: 'pending_review' | 'active' | 'rejected' | 'archived'
  reviewedBy: string
  reviewedAt: string
  reviewNote: string
  nextReviewOn: string
}
```

### 4.4 RuleEvidence

`RuleEvidence` 是每条 rule 的最小可审阅证据包。它不只是一个 URL，也不把候选
AI 输出当成事实；必须能说明该 evidence 在官方来源中的角色、位置和核验日期。

```ts
type RuleEvidence = {
  sourceId: string
  authorityRole: 'basis' | 'cross_check' | 'watch' | 'early_warning'
  locator: {
    kind: 'html' | 'pdf' | 'table' | 'api' | 'email_subscription'
    heading?: string
    selector?: string
    pdfPage?: number
    tableLabel?: string
    rowLabel?: string
  }
  summary: string
  sourceExcerpt: string
  retrievedAt: string
  sourceUpdatedOn?: string
}
```

Active practice rule 至少要有一条 `authorityRole='basis'` 的 evidence。`watch` 和
`early_warning` 只能推动 practice review task，不能单独启用 deadline。

### 4.5 DueDateLogic

MVP 不允许任意代码执行，使用可审阅 JSON DSL：

```ts
type DueDateLogic =
  | {
      kind: 'nth_day_after_tax_year_end'
      monthOffset: number
      day: number
      holidayRollover: 'next_business_day'
    }
  | {
      kind: 'nth_day_after_tax_year_begin'
      monthOffset: number
      day: number
      holidayRollover: 'next_business_day'
    }
  | {
      kind: 'fixed_date'
      date: string
      holidayRollover: 'source_adjusted' | 'next_business_day'
    }
  | {
      kind: 'period_table'
      frequency: 'monthly' | 'quarterly' | 'annual'
      periods: Array<{ period: string; dueDate: string }>
      holidayRollover: 'source_adjusted'
    }
  | {
      kind: 'source_defined_calendar'
      description: string
      holidayRollover: 'source_adjusted' | 'next_business_day'
    }
```

示例：

```json
{
  "kind": "nth_day_after_tax_year_end",
  "monthOffset": 3,
  "day": 15,
  "holidayRollover": "next_business_day"
}
```

### 4.6 RuleQualityChecklist

```ts
type RuleQualityChecklist = {
  filingVsPaymentDistinguished: boolean
  extensionPolicyHandled: boolean
  calendarVsFiscalSpecified: boolean
  weekendHolidayRolloverHandled: boolean
  crossCheckedOfficialSources: boolean
  disasterExceptionChannelEstablished: boolean
}
```

Active practice rule 默认要达到 6/6。允许 5/6 的唯一情况是 `ruleTier='applicability_review'`，并且用户侧必须显示 “Confirm applicability before acting”。

### 4.7 ObligationGenerationPreview

`ObligationGenerationPreview` 是 rule pack 与 `obligation_instance` 之间的安全缓冲层。
MVP 先返回 preview，不直接写 D1，避免把 applicability review 误发布成客户 deadline。

```ts
type ObligationGenerationPreview = {
  clientId: string
  ruleId: string
  ruleVersion: number
  ruleTitle: string
  jurisdiction: 'FED' | 'CA' | 'NY' | 'TX' | 'FL' | 'WA'
  taxType: string
  matchedTaxType: string
  period: string
  dueDate: string | null
  eventType: 'filing' | 'payment' | 'extension' | 'election' | 'information_report'
  isFiling: boolean
  isPayment: boolean
  formName: string
  sourceIds: string[]
  evidence: RuleEvidence[]
  requiresReview: boolean
  reminderReady: boolean
  reviewReasons: string[]
}
```

生成规则：

- 只消费 `practice_rule.status='active'` 的 rule；pending/rejected/archived 只进 preview 或 Rules 表的非生产状态。
- Federal rule 对所有 state 生效；州 rule 必须匹配客户 state。
- `entityApplicability='any_business'` 匹配业务实体，不匹配 individual/trust。
- matrix tax type 与 rule tax type 通过显式 alias 表匹配，不能靠 AI 猜测。
- `coverageStatus='manual'`、`ruleTier='applicability_review'`、`requiresApplicabilityReview=true`、`dueDate=null` 都会使 `reminderReady=false`。

## 5. 获取与审核流程

### 5.1 基础规则采集

1. Watcher 拉取 source HTML/PDF/API，并保存 snapshot hash。
2. Parser 提取表格、标题、日期、原文段落。
3. AI 可把长文转成 template payload，但输出必须带 locator 与 source excerpt。
4. 系统为每个 practice 创建 `practice_rule_review_task`。
5. Owner/manager 在 Rules Console 审核 template；接受后写入 `practice_rule.status='active'`。
6. Active practice rule 才进入 obligation generation preview；Migration apply、Annual rollover、reminder/risk 同样只消费 active practice rules。

### 5.2 Exception 采集

1. IRS disaster / state emergency / FEMA source 变化生成 practice review task。
2. Temporary rule 必须包含 affected jurisdiction、counties、effective dates、affected forms、new due date、source excerpt。
3. 没有 IRS 或州税局税务 relief 页面支撑时，只能保留 early warning，不能启用 overlay。
4. 发布 overlay 前显示 impacted obligations preview。
5. Owner/manager 接受后才允许生成用户通知。

### 5.3 审核状态机

```text
watch_changed
  -> template_available
  -> review_task_open
  -> pending_review
  -> active
  -> consumed_by_obligations
```

拒绝路径：

```text
pending_review -> rejected
pending_review -> needs_more_source
```

## 6. 通知消费边界

| 通知类型                | 触发源                                               | 接收者                                    | 是否面向用户 | 是否改变 deadline                        |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------- | ------------ | ---------------------------------------- |
| `rules.source.changed`  | source snapshot hash 变化                            | practice owner/manager                    | 否           | 否                                       |
| `rules.review.required` | template 缺少 excerpt / cross-source / applicability | practice owner/manager                    | 否           | 否                                       |
| `rules.accepted`        | practice rule accepted                               | practice owner/manager，可选用户侧 banner | 可选         | 为匹配的既有 clients 生成缺失 obligation |
| `obligations.previewed` | active practice rule 应用于客户事实                  | 用户/内部 review 页面                     | 是           | 否                                       |
| `obligations.generated` | `reminderReady=true` preview 写入 obligation         | 用户                                      | 是           | 是                                       |
| `reminder.scheduled`    | obligation due in 30/7 days                          | 用户                                      | 是           | 否                                       |

MVP 的用户提醒只消费 `obligation_instance`，不直接消费 `rule_template` 或 `practice_rule_review_task`。

## 7. 验收标准

- Source Registry 当前代码覆盖 Federal + 50 州 + DC；新增州源先进入 review-only Alert /
  practice review，不能直接显示为 reminder-ready active coverage。
- 初始 Rule Pack 至少包含本文件 §3 的 rule IDs。
- 每条 active practice rule 至少有 1 个 primary official source；高风险/extension/payment rule 需要 2 个 source 或明确 cross-check note。
- 每条 rule 都有 `dueDateLogic`、`eventType`、`ruleTier`、`qualityChecklist`。
- 所有 exception 都先进入 practice review task，不直接更新 obligation。
- 用户提醒只来自 `reminderReady=true` preview 生成的 active-rule obligations。
- `rules.previewObligations` 必须返回 source/evidence/reviewReasons，页面不能只展示日期。

## 8. 变更记录

| 版本 | 日期       | 作者  | 摘要                                                                                                                                                                         |
| ---- | ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.3 | 2026-05-22 | Codex | Concrete draft 运维增加 report grouping / inspect 命令、Browserless fallback 与更宽松的 source-backed normalizer；manual_review/pdf_watch source 缺正文仍作为 ops 数据处理。 |
| v1.2 | 2026-05-22 | Codex | AI concrete draft cache 增加 v2 prompt、本地 backfill/report 命令和失败分类；source 缺正文与 schema 失败作为 ops 数据继续排查。                                              |
| v1.1 | 2026-05-22 | Codex | Source-defined AI draft 改为全局预热缓存，rule pack 只要求用户审阅 cached concrete draft 后才能 active。                                                                     |
| v1.0 | 2026-05-20 | Codex | 新增 business source-backed candidate domains，source-defined candidate 必须 AI draft + 用户 review 后才能 active。                                                          |
| v0.9 | 2026-05-05 | Codex | 改为全局模板 + practice owner/manager active rule 模型，pending template 只能 preview/review。                                                                               |
| v0.8 | 2026-05-04 | Codex | Pulse source promotion 覆盖 51 辖区，并收窄部分州 source。                                                                                                                   |
| v0.7 | 2026-05-04 | Codex | 移除 agency-homepage 级 source，template generation 改为 precision-gated。                                                                                                   |
| v0.6 | 2026-05-04 | Codex | 扩展 50 州 + DC source-backed templates，并补 rules review workflow。                                                                                                        |
| v0.5 | 2026-04-27 | Codex | Source health checker 移出 core，改为 repo-level source checker。                                                                                                            |
| v0.4 | 2026-04-27 | Codex | 新增 rule-to-obligation preview contract 与 reminderReady 边界。                                                                                                             |
| v0.3 | 2026-04-27 | Codex | 官方来源复核后同步 source health、规则状态与 DueDateLogic DSL。                                                                                                              |
| v0.1 | 2026-04-27 | Codex | 新增 MVP source registry、初始 rule pack、结构化模型和通知边界。                                                                                                             |
