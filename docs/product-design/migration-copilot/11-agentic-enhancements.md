# Migration Copilot · Agentic Enhancements and Product Fit

> 版本：v1.0（Demo Sprint · 2026-04-24）
> 上游：PRD Part1A §1 / §2 / §3.2 · Part1B §6A / §6A.11 · Part2A §8 · Part2B §12 / §13 / §15 / §16 · `dev-file/00` §3 / §4 / §10 · `dev-file/04` §1 / §2 / §8 / §12 · `dev-file/10` §4 / §7
> 入册位置：[`./README.md`](./README.md) §2 第 11 份

本文件把上一轮评审暴露出的增强点收束进 Migration Copilot 设计册：围绕 PRD 里的目标用户画像，明确哪些增强能提升真实 CPA 吸引力，哪些必须受当前架构和 Demo Sprint 边界约束，并把体验推进到更接近最终 AI Agent 的形态。

---

## 1. 用户画像驱动的产品判断

### 1.1 主用户不是“想玩 AI 的人”

PRD 的主 ICP 是美国独立 CPA / EA / tax preparer，solo 或 1–10 人事务所 owner，服务 20–300 位 business clients，当前用 Excel + Outlook + 税务软件报表拼 deadline。这个用户买单的原因不是“有 Agent”，而是：

- **迁移少折腾**：不用花一天重录客户。
- **风险立刻可见**：导入后马上看到本周风险、截止日风险、Top 3 客户。
- **专业责任可证明**：AI 做过什么、规则来自哪里、谁在何时确认，都能回看。
- **不被 AI 接管判断**：AI 建议、CPA 确认；导入、撤销、Pulse Apply 都有显式人类动作。

因此 Agent 的正确形态不是一个开放聊天机器人，而是 **setup operator**：它用自然语言降低迁移摩擦，但所有危险写入都必须落回 deterministic wizard、dry-run、evidence、explicit commit。

### 1.2 现有设计的强项

- Wizard 路径完整覆盖 S2-AC1 ~ S2-AC5，并且能直接支撑 Demo Sprint。
- Preset + Mapper + Normalizer + Default Matrix 解决“导入后 0 obligations”的核心失败路径。
- Live Genesis 把导入结果从“数据导入成功”升级成“业务风险出现”，适合 PRD §15 的 demo 叙事。
- Revert、Migration Report、Evidence Link 能显著降低 owner 对首导入的心理风险。

### 1.3 需要增强的缺口

| 缺口                                   | 对用户吸引力的影响                                                  | 增强方向                                                    |
| -------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Agent 仅 preview disabled              | 削弱“AI Copilot”第一眼记忆点                                        | 做成 Agent-shaped setup，但不越过 wizard 事务边界           |
| Demo matrix 只有 Federal + CA + NY     | ICP 常见多州客户需要被正面回应；Rules 已覆盖 `FED + 50 states + DC` | 做全辖区 coverage transparency                              |
| Matrix `practice_review=pending`       | “零幻觉”与“pending”存在信任张力                                     | 区分 demo seed / practice active / skeleton coverage        |
| Migration 与 Pulse 首周闭环弱          | 用户看不到“导入后系统会主动保护我”                                  | 在导入完成后给首周 Pulse readiness / affected-client slot   |
| Agent / Wizard 两套 draft 未来可能分叉 | 实现复杂度与 audit 语义容易漂移                                     | 定义一个 Agent Orchestration Envelope，共用 migration batch |

---

## 2. 增强点 A · Agent-Shaped Setup（接近最终 AI Agent，但守住 Wizard 边界）

### 2.1 产品形态

把当前 `Try AI Setup Copilot (preview)` 从“不可用卡片”演进为 **Agent-shaped setup shell**：

```text
Left rail: Agent conversation       Right rail: Deterministic wizard state

Agent: "Are you solo or a small team?"
User:  "solo, around 50 clients, mostly CA and TX"
Agent: "I'll set up a solo practice and check CA/TX coverage."

Tool state:
  scope.detected = solo
  scale.detected = 50
  jurisdictions = CA, TX
  coverage = CA verified-demo, TX needs Phase 0 verification

[Continue in guided import →]
```

Agent 可以问问题、解释、调用工具、预填 wizard；但不能绕过 Step 2 Mapping、Step 3 Normalize、Step 4 Dry-Run，也不能自动 commit。

### 2.2 Allowed Tools（白名单）

Agent 只能调用以下受控工具，全部通过 `packages/ai` facade 或 `/rpc` contract 间接执行：

| Tool                  | 作用                                             | 是否可写 DB         | 约束                                |
| --------------------- | ------------------------------------------------ | ------------------- | ----------------------------------- |
| `detectPracticeShape` | 从对话抽取 solo/team、客户规模、州 hints         | 否                  | 只写本地 draft / server draft       |
| `previewCoverage`     | 返回 `FED + 50 states + DC` coverage/review 状态 | 否                  | 不得声称未验证州已 verified         |
| `runFieldMapper`      | 调 `mapper@v1`，输出 mapping JSON                | 写入 draft evidence | 仍走 5-row sample、Zod、EIN 后处理  |
| `runNormalizer`       | 调 normalizer + Default Matrix                   | 写入 draft evidence | 低置信非阻塞，高风险标 needs_review |
| `buildDryRun`         | 计算 clients / obligations / exposure summary    | 否或 draft          | 必须可重复、幂等                    |
| `commitMigration`     | 创建 clients / obligations / evidence / audit    | 是                  | 只能由用户点击 Step 4 CTA 后触发    |

禁止 ReAct 式开放工具选择；禁止 Agent 自行写 SQL；禁止 Agent 绕过 `scoped(db, firmId)`；禁止在 guard 通过前展示可复制的 AI 结论。

### 2.3 分期边界

| 阶段        | 必须完成                                                                                                                        | 明确不做                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Demo Sprint | Wizard 主路径、Agent shell 文案与入口、source 埋点、fallback 到 wizard                                                          | 真实多轮 Agent、开放工具调用、Setup History |
| Phase 0 MVP | Agent shell 可跑 `detectPracticeShape → previewCoverage → runFieldMapper → runNormalizer → buildDryRun`，commit 仍回 Step 4 CTA | 自动 commit、跨 firm 记忆、ReAct            |
| Phase 1     | 全辖区 coverage-aware Agent、Setup History、A/B funnel、跨标签 draft 恢复                                                       | Agent 税务判断、无证据生成 deadline         |

### 2.4 成功标准

- Agent-path completion rate 不低于 Wizard-path 的 80%。
- Agent-path manual override rate 不高于 Wizard-path + 10 个百分点。
- `commitMigration` 100% 由显式用户动作触发。
- Agent 失败时，已收集字段能无损带入 Wizard Step 1 / Step 2。

---

## 3. 增强点 B · 5 MVP States 信任路线（Coverage Transparency）

### 3.1 为什么要做

PRD 主 ICP 至少有多州客户。Demo Sprint matrix 只做 Federal + CA + NY 是工程可控选择，但当前 Rules coverage 已覆盖 `FED + 50 states + DC`；产品体验不能让用户误以为 DueDateHQ “只懂两个州”，也不能把 Default Matrix 尚未展开的州级 tax type 当成自动生成。

### 3.2 Coverage 状态模型

Default Matrix 每个 `(entity_type, state)` cell 必须暴露 coverage 状态：

| 状态          | 含义                                                                        | UI 文案                               | 是否默认生成 state obligations |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| `active`      | practice owner/manager 已接受，source_urls / reviewed_by / reviewed_at 完整 | `Active coverage`                     | 是                             |
| `demo_seed`   | Demo Sprint 可演示种子，有 source_urls，但 practice review pending          | `Demo coverage · review before pilot` | 是，但 Step 4 显示黄色说明     |
| `skeleton`    | 结构存在，未签字                                                            | `Federal only · state review needed`  | 否，只生成 federal fallback    |
| `unsupported` | 不在计划内或数据不足                                                        | `Not covered yet`                     | 否                             |

Demo Sprint 的 CA / NY 可以保持 `demo_seed`；Phase 0 正式试点前必须由 practice owner/manager 接受为 `active`。其他州/DC 在 Rules registry 中已有 source-backed candidate 路径，但 Default Matrix v1.0 尚未自动推断全部 state tax types，因此 Agent 必须诚实回答“rules coverage exists, matrix inference needs review”。

### 3.3 UI 增强

Step 3 Suggested tax types 增加 coverage badge：

```text
12 LLC × CA    → CA Franchise · CA LLC Fee · Fed 1065    [Demo coverage]
  Source: FTB + IRS · verify before pilot

8 LLC × TX     → Fed 1065 only                           [State review needed]
  TX Franchise Tax coverage is planned for Phase 0.
```

Step 4 Safety 增加一行：

```text
✓ 24 verified/demo coverage decisions · 8 state-review clients carried forward
```

### 3.4 约束

- `confidence=1.0` 只能用于 `active` 或纯确定性 federal overlay；`demo_seed` 应在 UI 解释为 “demo seed, practice review pending”，不能对 pilot 用户宣称正式 active。
- Matrix 不产生税务结论，只产生 default compliance candidates。
- 未覆盖州不得静默生成州级 obligations；必须 federal-only + needs_review。

---

## 4. 增强点 C · Migration → First-Week Operating Loop

### 4.1 产品意图

Migration 的终点不应只是 `migration.imported`。对 CPA owner 来说，真正的 aha moment 是：

1. 客户导进来了。
2. 本周风险出来了。
3. 如果有监管变更，受影响客户也被识别出来了。
4. 每条都能点证据。

因此 Step 4 / Live Genesis 之后，Dashboard 首屏必须完成从“导入”到“运营”的交接。

### 4.2 Demo Sprint 形态

Demo Sprint 不接完整 Overlay Engine，但可以在 Dashboard slot 展示 **First-week readiness strip**：

```text
Your practice is live
30 clients · 152 obligations · $19,200 at risk

This week:
  Top 3 urgent items ready
  3 clients need data review
  1 sample Pulse would affect 4 imported clients [Review]
```

其中 Pulse 行在 Demo Sprint 可以来自 fixture / pre-applied seed；必须标记为 sample 或 demo source，不得冒充真实 IRS 实时抓取。

### 4.3 Phase 0 形态

Phase 0 起改为真实链路：

```text
migration.imported
  → dashboard.penalty_radar.first_rendered
  → pulse.matchImportedClients(batch_id)
  → dashboard.first_week_operating_loop.ready
```

如果存在 approved Pulse 匹配新导入客户，Dashboard Banner 展示受影响客户并深链到 Rules > Pulse Changes。

### 4.4 约束

- Demo Sprint 直接 UPDATE 是允许的，但必须写 `evidence_link(source_type='pulse_apply')` 和 audit。
- Phase 0 完整 MVP / Phase 1 不再直接改 base rule，必须走 Overlay Engine。
- Migration 生成的 obligations 必须带 `migration_batch_id`，便于 Pulse 匹配、Revert 和 Audit Package 串联。

---

## 5. 增强点 D · Trust Pack Before Commit

### 5.1 Step 4 增强

Step 4 Dry-Run 的 Safety 区从 3 行扩展为 5 行：

```text
Safety
  ✓ One-click revert available for 24 hours
  ✓ Audit log captures every AI decision
  ✓ Coverage status is visible before import
  ✓ No client emails will be sent automatically
  ✓ Report email goes to the importing Owner/Manager and the Practice Owner
```

同时新增 `[View evidence preview]`，打开抽屉：

- Mapper decisions：source column → target field、confidence、model、prompt_version。
- Normalizer decisions：raw → normalized、confidence、needs_review。
- Matrix decisions：entity × state → tax_types、coverage_status、source_urls。
- Commit effects：clients、obligations、errors、revert_expires_at。

### 5.2 边界

- Evidence preview 是 dry-run 解释，不等于正式 audit record；正式 audit 只在 commit 成功后写入。
- 邮件 report 禁止出现 EIN、邮箱、电话、SSN、完整地址。
- Revert token 只表达意图，不跳过登录和 Owner / Manager guard。

---

## 6. Agent Orchestration Envelope

### 6.1 为什么需要

如果 Agent 与 Wizard 各自维护 draft，后续会出现三份真理来源：Agent turn、wizard draft、migration_batch。设计上必须收束为一个 envelope。

### 6.2 Envelope 字段

```ts
interface MigrationOrchestrationEnvelope {
  batch_id: string
  firm_id: string
  entry_mode: 'wizard' | 'agent_shell' | 'agent_full'
  source: 'empty' | 'clients-page' | 'cmdk' | 'settings' | 'demo'
  current_step: 'intake' | 'mapping' | 'normalize' | 'dry_run' | 'committed'
  agent_state?:
    | 'scope_detection'
    | 'scale_detection'
    | 'jurisdiction_hint'
    | 'intake'
    | 'normalize_confirm'
    | 'dry_run_commit'
    | 'handoff'
  coverage_summary: {
    verified: number
    demo_seed: number
    skeleton: number
    unsupported: number
  }
  risk_flags: Array<
    'pii_blocked' | 'low_confidence' | 'state_review_needed' | 'duplicate_clients' | 'rate_limited'
  >
  commit_requires_user_action: true
}
```

### 6.3 Contract 边界

- `batch_id` 是唯一事务边界；Agent turn、wizard step、mapping、normalization、dry-run 都挂在同一 batch。
- Envelope 是 contract DTO，不是 DB 表的直接镜像。
- Agent 可以更新 envelope 的 draft 字段；只有 `commitMigration` 能把 draft 转成 applied records。
- Envelope 变更属于 `[contract]` PR，必须 AI / Migration / Dashboard consumer 双 review。

---

## 7. 埋点补充

| 事件                                        | 触发                          | 关键字段                                                                |
| ------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `migration.agent_shell.opened`              | Agent shell 首次出现          | `source`, `firm_id_hash`                                                |
| `migration.agent_shell.fell_back_to_wizard` | Agent 降级                    | `reason`, `last_agent_state`                                            |
| `migration.coverage.previewed`              | Coverage summary 渲染         | `verified`, `demo_seed`, `skeleton`, `unsupported`                      |
| `migration.evidence_preview.opened`         | Step 4 evidence preview       | `batch_id`, `decision_count`                                            |
| `dashboard.first_week_operating_loop.ready` | Dashboard 首周交接 strip 渲染 | `batch_id`, `top_risk_count`, `needs_review_count`, `pulse_match_count` |

这些事件不进 Lingui；UI 文案继续走 Lingui。

---

## 8. Definition of Done

### Demo Sprint DoD

- Wizard 主路径仍是唯一 hard commitment。
- Agent entry 不再只是死卡片：至少能展示 Agent-shaped shell 的静态/确定性状态，并能带 `source='empty-agent-fallback'` 进入 Wizard。
- Step 3 / Step 4 显示 coverage transparency，不把 pending matrix 包装成正式 verified。
- Dashboard landing 显示 first-week operating loop strip，Pulse 行若来自 fixture 必须标 demo/sample。
- Evidence preview 的信息架构就位；实现可先用 dry-run JSON 渲染。

### Phase 0 MVP DoD

- Agent shell 能真实调用 mapper / normalizer / dry-run，但 commit 必须显式点击。
- `FED + 50 states + DC` 的 matrix/review cell 全部进入 `verified`、`skeleton` 或 `review_needed`，不得有无状态 cell。
- Migration imported batch 可被 Pulse match engine 消费。
- Agent path 与 Wizard path 的 funnel 可分开统计。

### Non-Goals

- 不做开放式税务问答 Agent。
- 不做 Agent 自动 Apply / 自动 Revert。
- 不承诺 50 州 full coverage。
- 不在 Demo Sprint 实现完整 Overlay Engine。
- 不把 demo/sample Pulse 伪装成真实官方抓取结果。

---

## 变更记录

| 版本 | 日期       | 作者  | 摘要                                                                                                                            |
| ---- | ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| v1.0 | 2026-04-24 | Codex | 新增 PRD 用户画像驱动的增强设计：Agent-shaped setup、coverage transparency、first-week loop、trust pack、orchestration envelope |
