# Rules 产品设计册 · README

> 版本：v2.0（14 天 MVP · 2026-05-22）
> 上游：`docs/report/DueDateHQ - MVP 边界声明.md`、`docs/report/DueDateHQ-MVP-Deadline-Rules-Plan.md`、`docs/dev-file/03-Data-Model.md`
> 适用范围：`FED + 50 states + DC` 的 deadline rules/source 资产、采集、审核、通知与页面设计

## 1. 本册定位

Rules 是 DueDateHQ MVP 的信任资产，不是普通配置页，也不是 AI 自动生成内容。MVP 要验证的是 CPA 是否愿意每周回来看一张可信的 deadline 分诊清单，因此 rules 的产品职责是：

- 从官方来源采集和留存 deadline 依据。
- 把原文结构化成全局规则模板，再由每个 practice 审核为本所 active rule。
- 区分 template/pending review、active practice rule 和需要 CPA 判断适用性的 rule。
- 让用户在 deadline row 上看见来源、核验状态和下一步检查建议。
- 让每个 practice 的 owner 或 manager 能发现来源变化、审核规则模板，并接受本所可用的 active rules。

内部一句话：

> Rules 把官方税务来源变成可审阅的规则模板，再由每个 practice 的 owner/manager 接受为本所生产规则。

## 2. 当前 MVP 裁定

| 裁定     | 结论                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| 覆盖范围 | `FED + 50 states + DC`。全辖区 source-backed candidate 可进入 review；只有 practice-reviewed active rule 才能进入生产提醒。 |
| 来源口径 | 只接受 IRS、州税局、FEMA 等官方来源作为 rule basis。第三方文章和社区内容只能做发现线索。                                    |
| AI 角色  | AI/parser 只能抽取模板草案、source signal 或全局 concrete draft；不能让规则进入生产，不能直接改客户 deadline。              |
| 用户提醒 | 只基于 active practice rule 生成的 obligation 发送 30 / 7 / 1 天提醒。pending review 只用于预览和审核队列。                 |
| 临时延期 | disaster relief / emergency tax relief 进入 practice-scoped temporary rule，owner/manager 审核后才可 apply。                |
| 页面形态 | Rules Console 是 practice owner/manager 的规则治理入口；用户侧只消费 active rule 结果。                                     |

## 3. 文档结构

| #   | 路径                                    | 用途                                                                       |
| --- | --------------------------------------- | -------------------------------------------------------------------------- |
| 00  | `README.md`                             | 本册入口、边界裁定、术语和维护约定                                         |
| 01  | `01-source-registry-and-rule-pack.md`   | 官方来源注册表、采集方式、MVP 初始 rule pack、结构化数据模型、通知消费边界 |
| 02  | `02-rules-console-product-design.md`    | 内部 Rules Console 页面设计、用户路径、状态、空态、审核/发布流程           |
| 03  | `03-alerts-to-pulse-changes-mapping.md` | 参考 Alerts 产品亮点到当前 Rules > Pulse Changes 的映射和边界              |

## 4. 当前实现落点

第一版结构化 rules asset 已落到 `packages/core/src/rules/index.ts`，并通过
`@duedatehq/core/rules` 暴露。`packages/contracts/src/rules.ts` 和
`apps/server/src/procedures/rules/index.ts` 已把它接进项目 oRPC surface，供后续
Rules Console 直接读取。当前实现包含：

| 资产                                     | 当前数量         | 说明                                                                                                                                                                      |
| ---------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rule_source_template` / `rule_template` | 80+              | Federal + 50 states + DC 官方来源和规则模板；只表示可参考模板                                                                                                             |
| `practice_rule`                          | practice-scoped  | 每个 practice 自己的 `pending_review` / `active` / `rejected` / `archived` 状态                                                                                           |
| 覆盖州                                   | 52               | `FED`、50 states、`DC` 都作为候选模板；生产覆盖以本 practice active rules 为准                                                                                            |
| 消费 API                                 | 7 个             | `rules.listSources`、`rules.listRules`、`rules.coverage`、`rules.listConcreteDrafts`、`rules.bulkVerifyCandidates`、`rules.draftConcreteRule`、`rules.previewObligations` |
| Source health                            | 1 个命令         | `pnpm rules:check-sources`；机器 source watch 与 practice review task 分开报                                                                                              |
| Weekly reconcile                         | 1 个 Worker 流程 | 每周一 09:00 UTC 生成 source snapshot 和 rule-pack proposal；产品开发者 review 后才改 `packages/core/src/rules/index.ts`                                                  |

当前实现仍然保持纯 domain asset，不直接写 D1。`packages/core/src/date-logic`
提供 DueDateLogic 展开纯函数，`packages/core/src/rules/index.ts` 已提供
`previewObligationsFromRules`，把客户事实、matrix tax types、active practice rule、due date
logic 合成为 obligation preview。`rules.previewObligations` oRPC endpoint 暴露同一结果，
供 Rules Console、deadline detail 和后续 reminder worker 消费。

生成口径：

- `pending_review` / rejected / archived rule 不进入 production generation。
- `source_defined_calendar` 只能表示 source-backed candidate / pending due-date review 状态；不能直接 bulk accept，也不能显示为绿色 active coverage。
- Source-defined candidate 的 `Accept rule` 表示接受 AI 预热生成、用户审阅过的 concrete rule draft；全局 AI draft 以 `firm_id=null`、`user_id=null` 写入 `ai_output`，practice accept 后才写 active rule。
- 正常客户 UI 只读取 `rules.listConcreteDrafts` 缓存，不在打开 rule detail 时自动调用 `rules.draftConcreteRule`。`rules.draftConcreteRule` 保留为 server/API 能力，用于内部修复和手动重跑。
- 每周 source reconcile 只负责 freshness/snapshot/proposal，不直接修改 core rule pack；只有产品开发者 review proposal 并发布新/变更 rule version 后，catalog sync 才 fan-out review task 并 enqueue 当前版本 AI concrete draft。
- AI concrete draft cache identity 是 `ruleId + sourceId + rule.version + promptVersion`。只更新 evidence retrieved/reviewed 时间不 bump rule version，也不会让 draft 失效；due date/applicability/extension/source mapping 等语义变化必须 bump/add rule version。
- 内部 backfill/report 使用 `pnpm rules:concrete-drafts:backfill -- --retry-failed` 与
  `pnpm rules:concrete-drafts:report -- --failures`。这些命令只写/读全局
  `ai_output` cache；失败作为 ops 数据保留，不新增用户侧失败处理。
- 失败排查使用 `pnpm rules:concrete-drafts:report -- --group-by=refusal,acquisition`
  和 `pnpm rules:concrete-drafts:inspect -- --category=SOURCE_TEXT_UNAVAILABLE`。报告可按
  refusal、message、source、source-type、acquisition、domain、jurisdiction 分组；inspect
  只输出 bounded source diagnostics，不向用户暴露失败工作流。
- `coverageStatus!='full'`、`ruleTier='applicability_review'`、`requiresApplicabilityReview`
  或 source-defined calendar 只能生成 `requiresReview=true` 的 preview。
- 只有 active、可匹配客户事实、可算出 concrete due date、且不需要人工复核的 preview
  才会标记 `reminderReady=true`。
- pending template 可进入 preview 和 Rule Library Coverage pending queue，但不能写入 obligations、reminders 或 risk。
- Preview input 只接受真实 client entity enum 和 `STATE_RULE_JURISDICTIONS` 中的 client
  states；`any_business` 与 `FED` 只用于 rule 侧，不作为 client 输入。
- default matrix 与 rule pack tax type 不一致时通过显式 alias 表转换，例如
  `ca_llc_franchise_min_800 -> ca_llc_annual_tax`、
  `ny_ptet_optional -> ny_ptet_election / ny_ptet_estimated_tax / ny_ptet`。

## 5. 规则分层

| 层级                   | 说明                                                               | 是否生成默认 obligation      | 是否触发用户提醒          |
| ---------------------- | ------------------------------------------------------------------ | ---------------------------- | ------------------------- |
| `basic`                | 长期稳定的常规 filing/payment/extension deadline                   | 是，发布后生成               | 是                        |
| `annual_rolling`       | 每年官方日历或 instructions 更新的规则                             | 是，按 tax year 发布         | 是                        |
| `exception`            | IRS/州 emergency relief、disaster postponement、临时延期           | 复核后才生成 overlay         | 复核发布后才提醒          |
| `applicability_review` | 适用性依赖客户事实的规则，例如 affected taxpayer、PTET eligibility | 可展示为需核验，不默认下结论 | 可提醒 CPA 核验，不给结论 |

## 6. 关键产品原则

1. **Active practice rule 才能影响客户数据**
   `pending_review`、`rejected`、`archived`、source change signal 不允许更新 `obligation_instance.current_due_date`，也不允许触发客户级 reminder。

2. **每条 rule 必须能单独审阅**
   Rule detail 必须展示 source URL、source title、authority role、locator、source excerpt、retrieved at、due date logic、适用实体/税种、reviewed by、reviewed at、next review at。

3. **通知分三类，不混用**
   Source notification 只创建 practice review task；rule accepted notification 说明本 practice 规则已接受；deadline reminder 提醒用户处理具体 obligation。

4. **用户侧讲行动，不讲数据库**  
   CPA 不需要看完整规则库。用户侧文案应该回答：这个 deadline 是什么、为什么有风险、下一步检查什么、依据来自哪里。

5. **诚实展示 coverage**  
   未覆盖、只 template、需人工判断的州或税种不能显示为 active。产品宁可说“Practice review needed”，也不能假装已覆盖。

## 7. 维护约定

- 本目录是 rules 产品设计的入口。新增子文档先更新本 README 的文档结构。
- 如果 rules 范围和 `MVP v0.3` 冲突，以 `MVP v0.3` 为 14 天执行口径。
- 如果技术实现和 `docs/dev-file/03-Data-Model.md` 冲突，先更新数据模型文档或写 ADR，再改实现。
- 每次修改 rules 覆盖范围，必须同步更新 `01-source-registry-and-rule-pack.md` 的 source registry 和初始 rule pack。
- 每次修改 `packages/core/src/rules/index.ts`，必须同步更新本 README 与
  `01-source-registry-and-rule-pack.md` 的实现状态。

## 8. 变更记录

| 版本 | 日期       | 作者  | 摘要                                                                                                                                                                                                                                                                                           |
| ---- | ---------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v2.2 | 2026-05-22 | Codex | Concrete draft backfill 增加失败分组/inspect 运维命令、Browserless live source fallback、wrapped AI payload normalization 与 worded relative due-date fallback；剩余 source 缺正文主要集中在 manual_review/pdf_watch source，继续作为 ops 数据处理。                                           |
| v2.1 | 2026-05-22 | Codex | 新增 concrete draft v2 prompt 与本地 backfill/report 工具；normalizer 增加常见 AI 输出别名、source excerpt fallback、AI gateway timeout/fast fallback，并完成一次本地 initial backfill。                                                                                                       |
| v2.0 | 2026-05-22 | Codex | 新增每周产品侧 Source/Rule Reconcile：Worker 每周生成 source snapshot 与 proposal，产品开发者 review 后手动更新 core rule pack；发布后 catalog sync fan-out `new_template` / `source_changed` review task，并按当前 rule version 预热全局 concrete draft。                                     |
| v1.9 | 2026-05-22 | Codex | Source-defined concrete draft 改为产品拥有的全局 prewarm/cache：Worker sweep/source change queue 生成 `firm_id=null` 的 AI draft，pending queue 只读 `rules.listConcreteDrafts`，批量 review 接受全局 draft 并保留 current-firm legacy fallback。                                              |
| v1.8 | 2026-05-20 | Codex | Coverage matrix 改为 API 返回的 `entityCoverage`，绿色只代表 practice active 且 concrete due-date logic；source-defined candidate 保留 review 状态，通过 `rules.draftConcreteRule` 生成 AI concrete draft，用户 review 后 `Accept rule` 才能写 active rule。                                   |
| v1.7 | 2026-05-12 | Codex | 固定 `https://github.com/helloigig/DueDateHQ` Alerts 到当前 Rules > Pulse Changes 的产品映射：保留 firm-scoped Pulse Change 决策面，新增 impact-first 分层、source context、parsed scope 和 suggested actions，不恢复独立 `/alerts`。                                                          |
| v1.6 | 2026-05-05 | Codex | Rules 改为全局模板 + practice active rule 模型；owner/manager 审核后才可生产生成 obligations/reminders，pending templates 只进入 preview 和 Rules 表的 Needs review 视图。                                                                                                                     |
| v1.5 | 2026-05-04 | Codex | Obligation Preview 增加第一版手动 Annual Rollover：用户先 preview，再 generate；source seeds 只取上一 filing year closed obligations，目标 obligation 只从 target filing year active practice rules 生成，requires-review 且有具体 due date 的行以 `review` 进入 Obligations。                 |
| v1.4 | 2026-05-02 | Codex | Generation Preview 更名为 Obligation Preview；CLIENT ID 改为 preview preset 下拉框；TAX YEAR 控件改为 Popover 年份网格筛选框，不再要求用户手写复合日期字符串；选中年份继续映射为规则引擎的本年 `taxYearStart` 与上一税年 `taxYearEnd`。                                                        |
| v1.3 | 2026-04-29 | Codex | App IA 全面扁平化：Rules canonical route 改为 `/rules`，Settings URL 前缀退出当前架构；Cmd-K 直接暴露各一级页面。                                                                                                                                                                              |
| v1.2 | 2026-04-28 | Codex | Rules Console 四个 P0 tab 的 active state 持久化到 URL（`?tab=coverage\|sources\|library\|preview`），由 `nuqs` 解析；非法值回落 Coverage，方便分享 Sources / Rule Library / Generation Preview 深链。                                                                                         |
| v1.1 | 2026-04-27 | Codex | 历史记录：当时侧栏 Settings 简化为非交互 section header；该 IA 已被 v1.3 的一级路由扁平化取代。                                                                                                                                                                                                |
| v1.0 | 2026-04-27 | Codex | 历史记录：当时从更早的有限州口径收敛到六辖区 MVP；该范围已被 2026-05-04 的 `FED + 50 states + DC` source-backed coverage 取代。RuleEvidence 收敛为 authorityRole / locator / sourceExcerpt / retrievedAt / sourceUpdatedOn 的类型安全证据包。                                                  |
| v0.9 | 2026-04-27 | Codex | Rules Console 全量 i18n（zh-CN 零 missing），所有 jurisdiction/coverage/tier/status/footer 文案落到 Lingui 字典；Tab underline 改 `state-accent-solid`，active filter chip 改 `text-primary`，pending count 数值为零时 muted；详见 dev-log § Token & color discipline / Internationalisation。 |
| v0.8 | 2026-04-27 | Codex | `/rules` 4-tab 实现严格对齐 Figma（中心 880 列、tab 顶格 24、Generation Preview 5 列网格 + 合成 TAX YEAR）；当时的侧栏容器 IA 已被 v1.3 取代。                                                                                                                                                 |
| v0.7 | 2026-04-27 | Codex | `/rules` 4-tab 只读壳在 Figma 定稿；详见 `docs/dev-log/2026-04-27-rules-console-shell.md`。                                                                                                                                                                                                    |
| v0.6 | 2026-04-27 | Codex | Source health checker 移到 repo-level script，保持 core 纯净。                                                                                                                                                                                                                                 |
| v0.5 | 2026-04-27 | Codex | 新增 rule-to-obligation preview、tax type alias 和 API。                                                                                                                                                                                                                                       |
| v0.4 | 2026-04-27 | Codex | 官方来源复核、source health、due date DSL 展开能力落地。                                                                                                                                                                                                                                       |
| v0.3 | 2026-04-27 | Codex | rules asset 接入 contracts/server，成为可消费项目接口。                                                                                                                                                                                                                                        |
| v0.2 | 2026-04-27 | Codex | 新增 `@duedatehq/core/rules` 结构化 asset 的实现状态说明。                                                                                                                                                                                                                                     |
| v0.1 | 2026-04-27 | Codex | 新增 rules 产品设计册入口，固定 MVP 裁定、分层和页面边界。                                                                                                                                                                                                                                     |
