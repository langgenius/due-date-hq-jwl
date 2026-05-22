# 02 · Rules Console 产品设计

> 版本：v0.6（14 天 MVP · 2026-04-28）
> 上游：`01-source-registry-and-rule-pack.md`
> 下游：
>
> - [`docs/dev-log/2026-04-27-rules-console-shell.md`](../../dev-log/2026-04-27-rules-console-shell.md) 已把本册第 3 节 IA 收敛为 Rules Console 壳（Coverage / Sources / Rule Library / Generation Preview）并在 Figma 定稿。
> - [`docs/dev-log/2026-04-28-rules-console-fullwidth-coverage.md`](../../dev-log/2026-04-28-rules-console-fullwidth-coverage.md) 把页面布局从"居中 880px settings 列"改成"全宽 workbench"，Coverage tab 重做为 KPI 条 + 左右双栏表格；header 段落 max-w 放宽到 1080。
>
> 目标：定义 rules 如何沉淀成真实页面，让 practice owner/manager 完成 source watch、Rules 表内审核、批量确认和 custom practice rules，并把 active practice rules 安全地交给产品消费

## 1. 页面定位

Rules Console 是 practice rule governance 页面。它负责回答 owner/manager 四个问题：

1. MVP 六个辖区的 rule coverage 是否完整？
2. 哪些官方来源最近变了、失败了、或需要人工检查？
3. 哪些 pending templates 可以接受为 active practice rules？
4. 接受某些 rules 会影响哪些客户 obligations 和提醒？

用户侧只在 Dashboard / Obligations / Deadline Detail 中消费 active practice rule 结果：source badge、practice reviewed、quality tier、AI Tip、next check。

## 2. 路由与入口

MVP 可先放在受保护 app 内：

```text
/rules
```

P0 tab state is part of the route contract:
`/rules?tab=coverage|sources|library|preview`. Missing or invalid
`tab` falls back to Coverage. This keeps Rules Console review links shareable
without adding separate routes for each tab.

Implementation note: bare `/rules` is the canonical Coverage URL;
`?tab=coverage` remains accepted but may be cleared when users switch back to
the default tab.

若后续需要独立 admin URL，可迁到：

```text
/admin/rules
```

权限裁定：

- Owner/manager 可以 accept/reject/bulk accept/create/edit/archive rules。
- Preparer/coordinator 只能读取和预览，不能让规则进入生产状态。
- 公开页面 `/rules` / `/watch` 不进入本轮实现，只保留文案和增长位。

## 3. 信息架构

页面使用核心 tab：

| Tab                | 目的                                                                           | 核心动作                                                   |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Coverage           | 看 `FED + 50 states + DC` 的 source-backed 覆盖和 review/active 状态           | Drill into jurisdiction                                    |
| Sources            | 看 source registry 健康度和最近变化                                            | Check now, view snapshot                                   |
| Rules              | 查看 practice rules + templates；审核 pending templates 和 source-change tasks | Smart view, select, bulk preview, accept/reject, open rule |
| Obligation Preview | 预览规则对客户 obligations 的影响                                              | Run preview / annual rollover preview                      |

## 4. Coverage Tab

### 4.1 目标

给内部团队一个一眼可见的 coverage map，避免“以为覆盖了，其实只是 federal fallback”。

### 4.2 布局（v1.1 · 2026-05-04，全宽 workbench）

> 取代了 v0.1 的"居中 880px 单列上下叠两表"。判定依据：Coverage tab 内容 100% 是表格 + 矩阵 + KPI，是 practice governance 数据界面而不是 settings form——按 `DESIGN.md` §5.2 新规则走 Obligations 同源的全宽布局。详见 [`2026-04-28-rules-console-fullwidth-coverage.md`](../../dev-log/2026-04-28-rules-console-fullwidth-coverage.md)。

自上而下三块，全部锚 `left=24`（与 tab nav 同列）：

1. **KPI 条**（`SectionFrame` + 4 格 grid，`sm:grid-cols-4` divide-x）
   - Active rules · sum(activeRuleCount)
   - Pending review · sum(pendingReviewCount)（>0 时数字走 `text-status-review` 紫色，0 时不强调）
   - Sources watched · sum(sourceCount)
   - Jurisdictions · rows.length，caption 动态："N active-covered · M with open review tasks"
2. **Jurisdiction summary**（`xl:col-span-6`）
   - JUR · NAME · VERIFIED · CANDIDATE · SOURCES · STATUS（数字列右对齐，金融报表惯例）
   - NAME 固定 90px 并截断长辖区名，避免 summary 表挤压右侧 entity coverage 矩阵。
   - STATUS pill 颜色规则不变：FED pending watch 用 `accent`，review-needed state rows 用 `severity-medium`，basic+review rows 用 `background-subtle`
3. **Entity Coverage 矩阵**（`xl:col-span-6`）
   - 右上 segmented control 本地切换展示列，不写入 URL：
     - Business（默认）：LLC / Partnership / S-Corp / C-Corp / Sole prop
     - Personal & fiduciary：Individual / Trust
     - All：Individual / Trust / LLC / Partnership / S-Corp / C-Corp / Sole prop
   - `Other` 是人工复核兜底类型，不作为普通 coverage 列展示；说明文案固定提醒 `Other remains manual review`。
   - All 视图列数更多，表格保持横向滚动，避免挤压或换行破坏扫描体验。
   - 下方挂 `CoverageLegend`（active / review / no rule）

`< xl` 断点下 2、3 自动 stack 回单列，阅读顺序与 v0.1 一致。

### 4.2.1 旧布局（v0.1，2026-04-27 → 2026-04-28，已 superseded）

```text
Rules Coverage
Federal     6 active · 0 needs review · updated Apr 27
CA          7 active · 1 pending review · updated Apr 27
NY          7 active · 1 applicability review · updated Apr 27
TX          4 active · 2 applicability review · updated Apr 27
FL          5 active · 1 PDF parse review · updated Apr 27
WA          5 active · 1 exception sample · updated Apr 27
```

下方是矩阵：

```text
Jurisdiction × Entity

             LLC   S-Corp   Partnership   C-Corp
Federal      ✓     ✓        ✓             ✓
CA           ✓     ✓        ✓             ✓
NY           ✓     ✓        ✓             ✓
TX           ⚠     ⚠        ⚠             ⚠
FL           ○     ○        ✓             ✓
WA           ⚠     ⚠        ⚠             ⚠
```

状态含义：

- `✓ active`：有 active practice rule 可生成 obligation。
- `⚠ applicability review`：有官方来源，但是否适用需 CPA 判断。
- `○ skeleton`：有 source watch，但不生成默认 obligation。
- `— unsupported`：不在 MVP。

### 4.3 空态

当某辖区没有 active rule：

```text
No active rules for this jurisdiction yet.
Review pending templates or create a custom practice rule before generating deadlines.
```

## 5. Sources Tab

### 5.1 表格字段

| 字段         | 说明                                                       |
| ------------ | ---------------------------------------------------------- |
| Source       | 官方来源标题                                               |
| Jurisdiction | federal / 50 states / DC                                   |
| Type         | calendar / instructions / form / news / emergency / api    |
| Cadence      | daily / weekly / quarterly                                 |
| Watch        | watched / paused；历史 degraded/failing 兼容显示为 watched |
| Last checked | 最近检查时间                                               |
| Last changed | 最近内容变化                                               |
| Next check   | 下次检查                                                   |
| Owner        | 负责此 source review 的 practice owner/manager             |

### 5.2 Row actions

- `Open source`：打开官方页面。
- `View snapshot`：查看上次保存的原文快照。
- `Check now`：立即检查并生成 diff。
- `Create review task`：从当前 snapshot 手动创建 practice review task。

### 5.3 Watch 状态

| 状态              | 产品含义                                              | UI   |
| ----------------- | ----------------------------------------------------- | ---- |
| watched / healthy | 官方来源已纳入 watch，最近成功 fetch/parse 后保持监控 | 绿色 |
| paused            | 人工暂停，不参与当前 watch cadence                    | 灰色 |

`degraded` / `failing` 只作为历史 API/DB 兼容值保留。前端遇到旧值按 watched 显示。
Source fetch/parser failure 属于内部运维诊断：记录失败次数、`lastError` 和 ingest metric，
不自动创建 CPA review task。只有成功解析到官方来源内容变化后，才通过 Pulse change 进入
owner/manager review。

## 6. Rules Tab

Rules 是单表治理面：它合并原 Review Queue 和 Rule Library。用户不需要在两个 tab 之间判断“在哪里让 rule 生效”；同一张表同时承担待审核队列、规则台账和证据入口。

顶部 smart view：

```text
Needs review · Active · All · Rejected · Archived · Applicability review · Exception
```

- 默认进入 `Needs review`，即 pending/open-task rules。
- Batch-ready pending/open-task 行显示 checkbox；选择后只在表格上方出现轻量 selection bar。
- Source-defined 行在没有全局 cached AI concrete draft 时不显示 checkbox，只显示
  `AI draft needed` 并保留单条 Rule Detail 审核路径；已有 cached AI concrete draft 的
  source-defined 行立即显示 checkbox，可进入 Bulk Review drawer。打开 Rule Detail 不触发
  `draftConcreteRule` 自动生成。
- `Review selected` 打开 Bulk Review drawer；drawer 内集中展示 selected rules、
  preview summary、batch review note 和 `Accept selected`，并在 drawer 内执行 preview。
- 如果 practice 已有 active v1，而全局 template 已升级到 v2，Rules 表必须同时显示
  active v1 台账行和 pending v2 `Update available` 行；v2 行来自 `source_changed`
  review task，不进入 Pulse Changes。
- `Update available` / `source_changed` 行不能 bulk accept，且不显示 row checkbox，必须进入单条
  Rule Detail drawer 审阅证据和当前规则字段，然后原样 Accept update 或 Reject。
- Active / rejected / archived 行不参与批量接受，只保留详情查看、编辑/归档和审计入口。
- 点击任意行都打开 Rule Detail drawer；pending 行可以单条 accept/reject，active 行展示证据、版本、review metadata。

### 6.1 Needs review row

每个 pending template / source change task 展示：

```text
CA LLC annual tax due date
Source: CA FTB Due dates: businesses
Template source: parser · confidence 0.92
Jurisdiction: CA
Tax type: ca_llc_annual_tax_800
Tier: basic
Suggested due logic:
  15th day of 4th month after beginning of taxable year
Quote:
  "The $800 annual tax is due..."

[Accept] [Reject]
```

### 6.2 审核 Checklist

Accept 前必须确认：

- Filing vs payment 是否区分。
- Extension 是否处理，尤其是否不延 payment。
- Calendar year / fiscal year 是否明确。
- Weekend / legal holiday rollover 是否明确。
- Source 是否为官方来源。
- 是否需要 applicability review。

### 6.3 批量确认行为

批量确认只接受当前筛选结果中用户勾选的 pending rules。前端使用 Rules 表 selection bar
打开 Bulk Review drawer，并在 drawer 内先显示 preview summary：

```text
selected pending templates
  -> preview summary
  -> owner/manager batch review note
  -> active practice rules
```

批量确认不允许顺手编辑规则字段，也不占用常驻右栏；单条 review 同样不编辑字段，只是审阅当前规则后 Accept/Reject。需要修改 due date logic、applicability、extension policy 的情况不走默认 practice review，应 reject 或进入后续 Advanced edit / internal rule editor。`source_changed` 行强制单条 review，后端在 bulk preview / accept 中返回 skipped。source-defined 批量确认只接受 `rules.listConcreteDrafts` 返回的全局 AI draft `aiOutputId`，并保留 current-firm legacy draft fallback。后端只信任 selected IDs + expected template versions / AI output IDs，单次最多 100 条，冲突项跳过并返回 skipped list。

## 7. Rule table ledger

### 7.1 列表字段

| 字段         | 说明                                                         |
| ------------ | ------------------------------------------------------------ |
| Rule         | rule id + form/tax type                                      |
| Jurisdiction | federal / 50 states / DC                                     |
| Entity       | LLC / S-Corp / Partnership / C-Corp                          |
| Tier         | basic / annual_rolling / exception / applicability_review    |
| Event        | filing / payment / extension / election / information_report |
| Status       | pending_review / active / rejected / archived                |
| Quality      | 6/6 或 5/6                                                   |
| Reviewed     | reviewed by + date                                           |
| Next review  | next review date                                             |

### 7.2 Rule Detail

Rule Detail 是最重要的页面。它必须展示完整可审阅证据：

```text
Rule: ca.llc.annual_tax.2026
Status: active
Quality: 6/6

Applicability
  Jurisdiction: CA
  Entities: LLC
  Tax type: ca_llc_annual_tax_800
  Event type: payment

Due date logic
  Relative to tax year start
  Month offset: 4
  Day: 15
  Rollover: next business day

Sources
  Primary: CA FTB Due dates: businesses
  Cross-check: CA LLC Web Pay payment types

Practice review
  Reviewed by: practice owner/manager
  Reviewed at: Apr 27, 2026
  Next review: Jul 27, 2026
```

### 7.3 Version compare

当同一 rule 有新版：

```text
v2026.1 -> v2026.2
dueDateLogic changed: none
source excerpt changed: yes
coverage changed: no
impact: 0 existing obligations
```

如果影响 existing obligations，必须进入 preview 和单条 review drawer。

## 8. Obligation Preview / Bulk Preview

### 8.1 目标

接受或生成前回答：

- 会新增多少 obligations？
- 会更新多少 current due dates？
- 会归档或替换多少旧 rule version？
- 会触发哪些 reminders 重新排程？
- 有哪些 items 只是 applicability review，不应自动改 deadline？

### 8.2 Bulk review drawer preview

```text
Bulk preview: selected pending rules

Impacted:
  12 obligations generated
  0 existing due dates changed
  5 clients flagged applicability_review
  0 reminder emails scheduled until explicit generation

Safety:
  Template source is official
  Quality checklist: 5/6
  Applicability review required

[Accept selected] [Open single review] [Cancel]
```

### 8.3 接受后事件

发布成功写入：

- audit event: `rules.accepted`
- notification: `rules.accepted`
- automatic generation: accepted rules are applied to existing client filing profiles and create
  missing rule-backed obligations, with duplicate protection by client/rule/tax year/period
- optional job: `reminders.reschedule`

接受 rule 后不要求用户重新运行 import：若已有 clients 的 filing profile tax types 与新 active
rule 匹配，系统会立即生成缺失 obligations；后续 reminder scheduling 仍由 reminder job 处理。

## 9. 用户侧消费设计

### 9.1 Dashboard deadline row

用户侧每条 deadline 应展示：

```text
Acme LLC · CA LLC Annual Tax · due Apr 15
Waiting on client · Internal cutoff passed
Why: deadline close + payment obligation
Next: confirm payment responsibility and prior-year record
Source: CA FTB · practice reviewed Apr 27
[In progress] [Completed] [Extended]
```

### 9.2 Source drawer

点击 source badge 打开轻量 drawer：

```text
Source
CA FTB Due dates: businesses
Reviewed by practice owner or manager · Apr 27, 2026
Quality Tier 6/6

What this means
This is a payment deadline. Extension to file does not automatically extend payment.

Check next
Confirm whether the client is required to pay the annual tax and whether payment has been scheduled.
```

### 9.3 AI Tip 约束

AI Tip 只能使用 active practice rule 和 source summary：

允许：

- “Source indicates...”
- “Confirm whether...”
- “This may require review...”

禁止：

- “Your client qualifies...”
- “No penalty will apply...”
- “This extension is valid...”

## 10. 错误与边界

| 场景                            | 处理                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Source parse failed             | 记录内部 failure metric/lastError；CPA-facing watch 状态保持 watched，不影响 active rule |
| Official source changed         | Review task created；active rule 保持不变直到 owner/manager 接受更新                     |
| 两个官方来源冲突                | Review task 标为 needs_more_source；不能 bulk accept                                     |
| Exception 只有 FEMA declaration | early warning only；不能生成 tax deadline overlay                                        |
| Rule quality < 6/6              | 只能 `applicability_review` 或保持 pending review                                        |
| Active rule 被废弃              | 新 rule version accepted 后 archive old version；保留审计                                |

## 11. MVP 验收

- `/rules` 的产品设计能覆盖 Coverage / Sources / Rules / Obligation Preview。
- 每条 rule 能追溯 source、source excerpt、quality checklist、practice review metadata。
- Pending review 不会直接影响用户 deadline。
- Bulk Preview 明确显示 selected rules、impacted obligations、skipped conflicts 和 reminder effect。
- 用户侧 deadline row 能展示 source / practice reviewed / next check。

## 12. 变更记录

| 版本 | 日期       | 作者  | 摘要                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v2.0 | 2026-05-22 | Codex | Source-defined AI concrete draft 改为全局 prewarm/cache：正常 Rule Detail 打开不再调用 `draftConcreteRule`，pending queue 只用 `rules.listConcreteDrafts` 判定 checkbox，bulk verify 接受全局 `ai_output` 并保留 legacy firm fallback；`source_changed` 继续强制单条 review。                                                                                                                                                                                                                                                                                 |
| v1.9 | 2026-05-21 | Codex | Pending review queue 不再为无法批量处理的行渲染 disabled checkbox；source-defined 行若已有 cached AI concrete draft，或当前 Rule Detail 已生成 AI concrete draft，可显示常驻 checkbox 并进入 Bulk Review drawer，drawer 展示 draft 字段，后端在 bulk verify 前重新校验 draft。                                                                                                                                                                                                                                                                                |
| v1.8 | 2026-05-20 | Codex | Source-defined candidate 的 `Accept rule` 改为接受 AI 生成、用户审阅过的 concrete draft；`acceptTemplate` / bulk accept 拒绝 `source_defined_calendar` placeholder，bulk UI 标出需要单条 AI review。Coverage matrix 不再使用前端静态映射，直接渲染后端按 active concrete rule / pending candidate 计算的 `entityCoverage`，source-defined rule 在 concrete draft 被 CPA accept 前保持 pending review。                                                                                                                                                        |
| v1.7 | 2026-05-05 | Codex | 单条 Rule Detail review 与 bulk review 收敛为同一语义：默认只读审阅当前规则与证据，`Accept rule` 调用 `acceptTemplate` 原样激活，不再在 practice review 默认路径中编辑 due-date logic、extension、tier 或 applicability。                                                                                                                                                                                                                                                                                                                                     |
| v1.6 | 2026-05-05 | Codex | `Update available` / `source_changed` 行禁止 bulk accept：前端禁用 checkbox，后端 bulk preview / accept 返回 skipped，强制进入单条 Rule Detail drawer 审核证据和规则字段。                                                                                                                                                                                                                                                                                                                                                                                    |
| v1.5 | 2026-05-05 | Codex | 将批量确认从常驻右侧面板收敛为 Rules 表 selection bar + Bulk Review drawer：主表保持全宽，drawer 内承载 selected rules、preview summary、batch review note 和 Accept selected。                                                                                                                                                                                                                                                                                                                                                                               |
| v1.4 | 2026-05-05 | Codex | 合并 Review Queue 和 Rule Library：独立 Review Queue tab 移除，Rules tab 默认进入 `Needs review` smart view，同表支持 pending selection、bulk preview / accept、active/rejected/archive 台账和 Rule Detail drawer；active v1 遇到 template v2 时主表补出 pending `Update available` 行。                                                                                                                                                                                                                                                                      |
| v1.3 | 2026-05-05 | Codex | Rules Console 改为 practice governance：新增 Review Queue、bulk preview / bulk accept，active practice rules 才能生产生成。                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| v1.2 | 2026-05-04 | Codex | Obligation Preview 增加手动 Annual Rollover 面板：先 preview 再 generate，不做 cron；closed source obligations 作为 seeds，目标年度必须有 active practice rule；duplicate / missing active rule / missing due date 都在表格中显式展示，创建后写 evidence、audit。                                                                                                                                                                                                                                                                                             |
| v1.1 | 2026-05-04 | Codex | Coverage 右侧矩阵从固定 4 列改为本地 segmented control：Business 默认显示 LLC / Partnership / S-Corp / C-Corp / Sole prop，Personal & fiduciary 显示 Individual / Trust，All 先显示 Individual / Trust 再显示 business entity；`Other` 只保留为人工复核兜底说明，不进入矩阵列。详见 `docs/dev-log/2026-05-04-rules-coverage-entity-matrix.md`。                                                                                                                                                                                                               |
| v1.0 | 2026-05-04 | Codex | Rules review 的 `Official extension form or method` 明确为自由输入优先的 autocomplete：默认不显示下拉，只有输入内容接近常见官方表格或办理方式时才展示建议；选择建议不会锁死字段，已选建议可再次点击或清空取消。详见 `docs/dev-log/2026-05-04-rules-candidate-verify-workflow.md`。                                                                                                                                                                                                                                                                            |
| v0.9 | 2026-05-04 | Codex | Rules review 的 reminder-ready specific date 输入复用项目统一 `IsoDatePicker`，与 Obligations obligation detail 的 Extension tab 日期选择器保持一致，避免同一工作流出现两套日期 UI。详见 `docs/dev-log/2026-05-04-rules-candidate-verify-workflow.md`。                                                                                                                                                                                                                                                                                                       |
| v0.8 | 2026-05-04 | Codex | Rules review 表单细化 extension policy 输入：`Duration months` 采用 1-24 月数字 stepper，避免非数字输入；`Extension form` 暂不改下拉，因为当前 contract 没有稳定枚举，规则 seed 只有少数明确表格名，人工复核仍需要保留自由输入。详见 `docs/dev-log/2026-05-04-rules-candidate-verify-workflow.md`。                                                                                                                                                                                                                                                           |
| v0.7 | 2026-04-29 | Codex | App IA 全面扁平化：Rules canonical route 改为 `/rules`，旧 Settings 前缀退出当前架构且不保留 redirect；Cmd-K 直接暴露 Rules / Members / Billing / Practice profile 等一级页面。                                                                                                                                                                                                                                                                                                                                                                               |
| v0.6 | 2026-04-28 | Codex | Rules Console 四个 P0 tab 的 active state 持久化到 URL（`?tab=coverage\|sources\|library\|preview`），由 `nuqs` 解析；非法值回落 Coverage，方便分享 Sources / Rule Library / Generation Preview 深链。                                                                                                                                                                                                                                                                                                                                                        |
| v0.5 | 2026-04-28 | Codex | 布局判定从 URL 前缀切换到内容形态：Rules Console 是 governance data surface，全宽展开（去掉 `mx-auto max-w-[928px]`），与 tab nav / Obligations 共锚 `left=24`。Coverage tab 重做为 KPI 条 + 左 7/12 jurisdiction summary + 右 5/12 jurisdiction × entity 矩阵；KPI 数字走 `font-mono text-2xl tabular-nums`，pending>0 时数字 tone 走 `text-status-review`。`RulesPageHeader` 段落 max-w 从 720 → 1080，避免在 1512 视口下挤成 3 行。`DESIGN.md` §5.2 同步增订按内容形态判定宽度的规则。详见 `docs/dev-log/2026-04-28-rules-console-fullwidth-coverage.md`。 |
| v0.4 | 2026-04-27 | Codex | P0.5 落地：Rule Library 行可点 → 右侧 Sheet drawer（Applicability / Due-date logic / Extension / Review reasons / Evidence / Verification 6 节）；Sources 行整行 + ↗ icon 跳官方页；Generation Preview 假链接换成真链接；Coverage 头部描述讲清 Sources / Rules / Preview 三层关系。Figma `Settings · Rules` section 增加 5/4 状态稿（drawer 打开态）作为对齐基准。EvidenceCard 修复 inline-flex items-center 继承 + truncate 链断裂导致的「文字居中、长 title 把 badge 挤出 card」layout bug。详见 `docs/dev-log/2026-04-27-rules-console-detail-drawer.md`。 |
| v0.3 | 2026-04-27 | Codex | 历史记录：侧栏 Settings 容器曾收敛为非交互 section header；该 IA 已被 v0.7 的一级路由扁平化取代。                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| v0.2 | 2026-04-27 | Codex | 历史记录：最早实现曾保留 Settings 作为侧栏容器；该方案已被后续一级路由扁平化取代。                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| v0.1 | 2026-04-27 | Codex | 新增 Rules Console 页面设计、审核发布流程和用户侧消费设计。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
