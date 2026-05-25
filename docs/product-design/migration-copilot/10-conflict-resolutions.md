# Migration Copilot · 冲突裁定（Demo Sprint 口径）

> 版本：v1.0（Demo Sprint · 2026-04-24）
> 上游：PRD v2.0 Part1A / Part1B / Part2B · `dev-file/09` / `dev-file/10`
> 入册位置：[`./README.md`](./README.md) §2 第 10 份 · §4 裁定速查

---

## 0. 本文件作用

本文件是 Migration Copilot 本册**唯一的产品裁定权威来源**。任何实现分歧（前端 / 后端 / AI）、文案分歧（UI / 邮件 / audit action）、数据定义分歧（KPI 起止点 / 权限）先读这里。

[`../../adr/0011-migration-copilot-demo-sprint-scope.md`](../../adr/0011-migration-copilot-demo-sprint-scope.md) 是这张表的正式 ADR 决策载体（由 Subagent F 产出）；本文件是对应的**长篇理由 + PRD / dev-file 引用位置**。

冲突优先级 = **本文件 > ADR 摘要 > 子文档**（除非子文档显式标注与本文件冲突，否则默认对齐本文件）。与 PRD 语义的冲突：由本文件逐条裁定；本文件未裁定的语义问题默认回到 PRD。

---

## 1. Revert 24h 全量撤销权限

- **冲突点**：Migration 全量 batch 的 24h Revert 是"全量权限"还是"Owner-only"？早期 Demo 裁定曾收紧到 Owner-only；但长期 RBAC 已允许 Manager 执行 `migration.run`、`pulse.batch_apply` 这类批量变更，只保留 Owner 才能补救会让事故恢复路径不对称。
- **PRD 引用位置**：
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1A.md` §3.6.3 RBAC 权限矩阵（Migration 区行："Revert (24h full batch)" / "Revert 单客户（7d）"）
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1B.md` §6A.7 Revert 双档表
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md` §13.2.1 Migration audit actions
- **裁定**：
  - `Revert 24h 全量 = Owner + Manager`；`Revert 单客户 7d = Owner + Manager`；对齐 Part1A §3.6.3。
  - Owner-only 仍保留给所有权 / 账户级能力：Firm 删除、Owner 转让、billing、role 修改、全 firm export。
- **理由**：Revert 是补救能力，不是所有权能力。Manager 已经可以触发批量导入或 Pulse 批量应用，就必须能在 24h 窗口内快速撤回同类变更；真正的风险控制放在确认弹窗、before/after diff、审计、Owner 通知、24h server-side expiry 和必要时二次验证。
- **工程落地影响**：`./02-ux-4step-wizard.md` Step 4 完成后的 24h toast 按钮对 Owner / Manager 可见；后端 `migration.reverted` procedure middleware 走 Owner + Manager guard；audit 写 `migration.reverted`（Part2B §13.2.1）。

---

## 2. 5 Preset 含 File In Time

- **冲突点**：PRD Part1A S2-AC1 验收列写的是"TaxDome / Drake / Karbon / QuickBooks 导出 CSV"四家；PRD Part1A §4.1 P0-2 与 Part1B §6A.4 明确"5 个 Preset Profiles"，第 5 位是 **File In Time** 且带"彩蛋对标竞品"注释；Part2B §17 交付物清单也要求"5 套 Preset Sample CSV（TaxDome / Drake / Karbon / QB / FIT）"。
- **PRD 引用位置**：
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1A.md` §3.2 S2-AC1（"5 个 + File In Time 彩蛋"）
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1A.md` §4.1 P0-2（"5 个 Preset Profiles"）
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1B.md` §6A.4 Preset Profiles（File In Time 行 + "最完整 one-shot 迁移（彩蛋对标竞品）"）
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md` §17 交付物清单（"5 套 Preset Sample CSV"）
- **裁定**：Demo Sprint 与 Phase 0 MVP 一致——**5 Preset** 继续包含 TaxDome、Drake、Karbon、QuickBooks、File In Time；扩展税务软件模板后，`./02-ux-4step-wizard.md` Step 1 的来源芯片合并为单组并按展示英文名 A-Z 排序。File In Time 仍保留 tip："Coming from File In Time? We'll map available calendar fields and flag gaps before generating deadlines."
- **理由**：File In Time 是本产品最直接的 1:1 替换目标（PRD Part1A §1.1 竞品坐标），Demo 现场的叙事杀伤力主要来自"你正在从 FIT 迁过来 → 我们 30 分钟做完一年"。遗漏 FIT 会让 Demo 叙事和竞争定位同时失焦。
- **工程落地影响**：`./02-ux-4step-wizard.md#step-1-intake` Preset 区 5 项 + FIT 彩蛋 tip；`./06-fixtures/README.md` 提供 5 份 sample CSV；`./04-ai-prompts.md` Field Mapper 的 preset prior 列表 5 项。

---

## 3. T-S2-01 双指标口径

- **冲突点**：PRD Part2B §12.3 T-S2-01 条目"上传 TaxDome 官方导出 CSV → Preset 命中 + 95% 字段映射"中"95%"到底指"Mapping Confidence 平均 ≥ 95%"、"所有字段 confidence 都 ≥ 95%"、还是"某一列必须达 95%"？另外 Part1B §6A.10 验收清单 S2-AC1 写的是"Preset 自动选中 + AI Mapping 置信度 ≥ 95% + **EIN 识别 100%**"，多了 EIN 100% 这一句。
- **PRD 引用位置**：
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md` §12.3 T-S2-01 / T-S2-02
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1B.md` §6A.10 验收清单 S2-AC1 / S2-AC2
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1B.md` §6A.2 AI Field Mapper（EIN 检测强约束）
- **裁定**：**T-S2-01 判定 = 双指标同时满足**。
  1. `Mapping Confidence 平均 ≥ 95%`（分母：本批次所有非 IGNORE 列；对齐 Part2B §12.2 Mapping Confidence 口径，但把 Preset-hit 场景的目标从 85% 平均提升到 95% 平均）
  2. `EIN 识别率 = 100%`（只要 CSV 里存在 EIN 格式列，必须被识别且命中率 ≥ 80% 才算"识别"，对齐 Part1B §6A.2 后处理"EIN 列二次验证：正则 `^\d{2}-\d{7}$` 命中率 ≥ 80% 才接受 mapping"）
- **理由**：Preset 命中属于"强先验"（PRD Part1B §6A.4"置信度从 75% 跳到 95%+"），平均 95% 是这条路径的合理门槛；EIN 是 Story S2 相对同类工具的差异化字段（PRD Part1A §0.1 "EIN 字段 v2.0 新增"），必须 100% 保底不然 AC2 也塌。两条同时写入测试，避免实现阶段把"平均"滑向"最低"。
- **工程落地影响**：`./01-mvp-and-journeys.md` §3 KPI 表定义事件 `migration.mapper.run.completed` 的 `avg_confidence` 与 `ein_detection_rate` 双字段；`./04-ai-prompts.md#field-mapper-v1` 后处理必须 emit 这两项；T-S2-01 自动化测试断言双指标。

---

## 4. KPI 起点与终点口径

- **冲突点**：PRD Part2B §12.2 Activation 表里 `Migration Time-to-First-Value` 起点 = "signup"、终点 = "首次看到 Deadline Radar $"；`Migration P95 完成时间（S2-AC5）` 起点 = "Signup"、终点 = "Import 完成（30 客户基准）"。两条起点文字相同都是"signup"，容易被工程侧误合并为"一个起点两个终点"的单 funnel；且 PRD 未明说"是否同一个 PostHog session"。Part1B §6A.10 S2-AC5 备注又单独提供了一组预算分解（粘贴 5min + mapping review 10min + normalize 5min + import 10min buffer）。
- **PRD 引用位置**：
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md` §12.2 Activation 表第 1 / 第 2 行
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1B.md` §6A.10 S2-AC5（预算分解）
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1A.md` §0.3 第 2 条铁律（"30 分钟完成 30 客户"）
- **裁定**：**两个指标两条起止点，各自独立埋点**，不合并。
  - Time-to-First-Value：`signup.completed` → `dashboard.penalty_radar.first_rendered`（第一次 Dashboard 顶栏渲染出截止日风险数字，对齐 Part1A §0.3 第 1 条铁律）
  - P95 完成（S2-AC5）：`signup.completed` → `migration.imported`（对齐 Part2B §13.2.1 audit action 名 + Part2B §12.3 T-S2-05）
- **理由**：Time-to-First-Value 强调"首次 wow"（用户粘贴 5 行、即使没全导完也能看到 Deadline Radar 有数字），是 Demo 现场 60 秒的北极星；P95 完成则强调"30 分钟跑完 30 客户全链路"，是对 FIT 替换承诺的兑现。两者目标值不同（10min vs 30min）、语义不同，必须两条独立 funnel 才能分别做 Go/Gray/Rethink 判断（Part2B §12.4）。
- **工程落地影响**：`./01-mvp-and-journeys.md` §3 KPI 表明确两条 funnel；`../../dev-file/09-Demo-Sprint-Module-Playbook.md` §5.8 Dashboard 模块负责 emit `dashboard.penalty_radar.first_rendered`；§5.6 Migration 模块负责 emit `migration.imported`。

---

## 5. Placeholder 策略

- **冲突点**：PRD Part2B §13.2 必做最后一项写的是"AI PII 防泄：客户姓名 / EIN / 邮箱在 prompt 中用占位符 `{{client_1}}`，生成后回填"，呈现为全局规则；但 Part1B §6A.9 Migration 安全护栏却写"AI mapping / normalize 在客户端 redact PII → **仅发字段名 + 5 行样本**到 `packages/ai`，不发全表"；Part2B §9.3 数据保留与调用记录又写"PII 占位符替换后才进 AI，post-processing 回填"。Mapper / Normalizer 的 5 行样本里本身就带原值（CSV 的前 5 行）；走占位符反而会让 AI Mapper 识别不了 EIN 格式（`^\d{2}-\d{7}$`）。
- **PRD 引用位置**：
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md` §9.3 数据保留与调用记录
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md` §13.2 必做（最后一项 `{{client_1}}`）
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1B.md` §6A.9 Migration 安全与合规护栏
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1B.md` §6A.2 AI Field Mapper Prompt（含"PII note: you only see this 5-row sample, not the full dataset"）
- **裁定**：按场景分两档。
  1. **Migration Field Mapper / Normalizer**：只发**字段名 + 5 行原始样本**，不走 `{{client_N}}` 占位符（否则 EIN 识别失效）。PII 风险通过：
     - 前端 SSN 正则拦截 + 强制 IGNORE（Part1B §6A.9 / Step 1 Intake）
     - Vercel AI SDK Core + Cloudflare AI Gateway provider（Part2B §9.3）
     - Prompt 明示 "Do not retain any data seen for training"（Part2B §13.2）
     - 写内部 `ai_output` trace，不存原文（Part1B §6A.9 · Part2B §13.2）
  2. **Onboarding AI Agent 对话 / Pulse 语义解读 / Brief 生成**：使用 `{{client_1}}` 等占位符，客户端 redact，后端回填（对齐 Part2B §13.2 + §9.3）。
- **理由**：Mapper 的工作正是"识别原始值的模式"，占位符会把可识别性洗掉（`12-3456789` → `{{ein_1}}` 后模式丢失）；而 Agent 对话 / Brief / Pulse 的 AI SDK 调用只需要语义，不需要原值。两档分治既保留识别能力又守住 PRD §13.2 的最小必要原则。Part1B §6A.9 "仅发字段名 + 5 行样本"本身已经是"取样 + retention 契约"的强护栏。
- **工程落地影响**：`./04-ai-prompts.md` 的 Field Mapper / Normalizer prompt 显式声明"5-row sample + no placeholder"；Onboarding Agent 设计（`./03-onboarding-agent.md`）与 Pulse / Brief 相关 prompt 必须走占位符回填；`../../dev-file/06-Security-Compliance.md` PII 章节需要反映这两档差异（本 Sprint 不改 dev-file；Phase 0 起由 Subagent F 在 ADR 0011 里留 follow-up）。

---

## 6. Audit action 命名与 UI 文案分层

- **冲突点**：PRD Part2B §13.2.1 Firm-wide Audit Log 的 Migration 行把 action 命名为 `migration.imported / .reverted / .single_undo`（英文工程 log，不走 i18n）；但 Part1B §6A.6 Step 4 导入后的 toast 文案"✓ Imported 30 clients, 152 obligations, $19,200 at risk."以及 §6A.8 战报邮件都是人类可读英文 / 需要本地化。若两边共用一套字符串，会把 audit log 拖入 Lingui 抽取 / 编译链路，带来安全与稳定性风险。
- **PRD 引用位置**：
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md` §13.2.1 Firm-wide Audit Log（Migration 行）
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1B.md` §6A.6 Step 4（toast 文案）
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part1B.md` §6A.8 Migration Report 邮件文案
  - `docs/PRD/DueDateHQ-PRD-v2.0-Part2B.md` §13.2 最后一项（AI 本地化约束）
- **裁定**：分两层。
  1. **Audit action 名 + PostHog 事件名**：走 `migration.*` 英文工程 log，**不**进 Lingui。命名固定为 `migration.imported / .reverted / .single_undo / .mapper.run.completed / .mapper.confirmed / .normalizer.confirmed / .matrix.applied / .wizard.step{1..4}.opened`。
  2. **用户可见文案**：SaaS UI + Toast 走 `apps/app` Lingui catalog；战报邮件 subject / body 走 `apps/server` 类型化薄字典；公开站文案走 `apps/marketing` catalog/dictionary。三者共享 locale contract，但不共享同一个 catalog（对齐 `../../adr/0009-lingui-for-i18n.md`）。文案与 audit action 同源但两套字符串，文案变化不回溯 audit。
- **理由**：audit log 是合规证据（Part2B §13.2.1 "7 年保留 + PII hash 化"），必须稳定、可索引、可 grep、不随翻译变化；UI 文案属于产品体验，要本地化、要 A/B、要营销微调。两层混用会让 audit 字段被翻译覆盖，违反 Part2B §13.2 附录"审计不改写"精神。
- **工程落地影响**：`../../dev-file/03-Data-Model.md` §2.4 / §2.5 定义 `migration_*` 表与 `audit_event` 的工程字段；`./02-ux-4step-wizard.md` 所有用户可见字符串走 `<Trans />` / `t\`...\`` 宏；本表 §6.2 明确 PostHog 事件名与 audit action 同源同名但不加入 Lingui extract。

---

## 7. 裁定修改约定

本表任何条目修改必须**同步**更新 [`../../adr/0011-migration-copilot-demo-sprint-scope.md`](../../adr/0011-migration-copilot-demo-sprint-scope.md)（ADR 摘要 + 状态字段）与 [`./README.md`](./README.md) §4 裁定速查；反之亦然。由修改发起方承担同步责任。

任何 subagent、下游 plan、后续 PR **不得背离**本表裁定；如发现实现与裁定冲突，先改本表（走 `[contract]`-风格的文档 PR，provider + consumer owner 双 review，对齐 `../../dev-file/09-Demo-Sprint-Module-Playbook.md` §13），再改实现。

---

## 8. ADR 0011 交叉引用

本表 6 条裁定在 [`../../adr/0011-migration-copilot-demo-sprint-scope.md`](../../adr/0011-migration-copilot-demo-sprint-scope.md) 落地为正式 ADR；ADR 由 Subagent F 产出，**锁定后请同步 ADR 0011 的 Status = Accepted，并在本表每条小节添加"ADR 锚点"行**（本轮不追加，等 ADR 文件就位）。

---

## 变更记录

| 版本 | 日期       | 作者       | 摘要                                                                                    |
| ---- | ---------- | ---------- | --------------------------------------------------------------------------------------- |
| v1.0 | 2026-04-24 | Subagent A | 初稿：6 条冲突裁定（Revert 权限 / 5 Preset / T-S2-01 / KPI / Placeholder / audit 命名） |
