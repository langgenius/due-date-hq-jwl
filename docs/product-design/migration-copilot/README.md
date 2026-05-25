# Migration Copilot Demo Sprint 产品设计册 · README

> 版本：v1.0（Demo Sprint · 2026-04-24）
> 适用范围：DueDateHQ Migration Copilot 在 7 天 Demo Sprint 口径下的落地形态
> 上游权威：PRD v2.0 Part1A §6A 总述 · Part1B §6A 全节 · Part2B §12 / §13 / §16
> 工程对齐：`dev-file/09` 模块边界 · `dev-file/10` 7 天节奏 · `Design/DueDateHQ-DESIGN.md`
> 维护原则：本文件是本册的入口与索引；子文档路径、裁定一键摘要、前置阻塞门都以此为单一事实源

---

## 1. 本册定位

本册的一句话定位：**把 Migration Copilot 的产品形态、UX、AI Prompt、Default Matrix、Fixture、设计系统增量与近最终 Agent 增强路径在 Demo Sprint 口径下一次性封死。**

本册是 PRD §6A（Migration Copilot）与 §6A.11（Onboarding AI Agent）的**落地翻译 + 冲突裁定 + Demo Sprint 子集化 + Phase 0 Agent 增强桥接**，**不是新 PRD**。PRD 依然是产品语义的最终权威，本册负责把"4 周 Phase 0 MVP 范围"收窄到"7 天 Demo Sprint 可跑通的最小闭环"，并把跨文档、跨 AC、跨工程模块之间的歧义以"裁定表 + 子文档索引"方式一次性固定。

**适用范围：**

- Demo Sprint（7 天集训）Migration Copilot 叙事闭环（`dev-file/09` §2.1）
- Demo Sprint KPI 与降级预案（`dev-file/09` §12 / `dev-file/10` §6）
- Demo Sprint 期间 Federal + CA + NY 三辖区 seed，Owner-only 单账号（`dev-file/09` §2.2）。当前 Rules coverage 已扩展为 `FED + 50 states + DC`，Migration Copilot v1.0 matrix 仍是历史 Demo 子集；非显式格走 review-only state tax types。

**不适用范围（本册只留 hook，不展开）：**

- 完整 4 周 Phase 0 MVP 范围（当前 rules coverage 为 `FED + 50 states + DC`；candidate 仍需 practice review）、Manager 权限开闸、真实 RBAC 落地
- P1 Overlay Engine（Pulse 改 due date 走 exception rule overlay；Demo Sprint 直接 UPDATE）
- P1 Onboarding AI Agent 真实实现（PRD §6A.11 产品形态在本册锁死，但 Demo Sprint 路径仍是传统 4 步向导）
- P1 Team RBAC 四角色权限矩阵（PRD §3.6.3）
- P2 Audit-Ready Package（ZIP + SHA-256 manifest 在 PRD §13.3 与 `dev-file/09` §14 的 Phase 1 接续清单里）

---

## 2. 文档结构

本册共 12 份子文档（01 ~ 12），路径全部相对于 `docs/product-design/migration-copilot/`。本 README 是总入口；任何实现 / 文案 / 数据定义分歧先读 `./10-conflict-resolutions.md`；任何“增强到更接近最终 AI Agent 形态”的问题先读 `./11-agentic-enhancements.md`；任何 DDL 前导入入库与 weekly triage 闭环问题先读 `./12-import-to-weekly-triage.md`。

| #   | 路径                                                                         | 一句话用途                                                                                                      | 主要读者                          |
| --- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 00  | [`./README.md`](./README.md)                                                 | 本册入口、前置阻塞门、裁定速查与维护约定                                                                        | PM / Eng / Design                 |
| 01  | [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md)                       | Demo Sprint MVP 范围 · AC × Test × P0 映射 · KPI 埋点 · S2 用户旅程 · 入口矩阵 · 权限与键盘基线                 | PM / Eng / Design                 |
| 02  | [`./02-ux-4step-wizard.md`](./02-ux-4step-wizard.md)                         | 4 步向导（Intake / Mapping / Normalize / Dry-Run + Live Genesis）的像素级 UX 规格                               | Design / Frontend                 |
| 03  | [`./03-onboarding-agent.md`](./03-onboarding-agent.md)                       | PRD §6A.11 Onboarding AI Agent 产品形态锁定（Demo Sprint 不实现，仅设计就位）                                   | PM / Design / AI                  |
| 04  | [`./04-ai-prompts.md`](./04-ai-prompts.md)                                   | Field Mapper / Normalizer Prompt 定稿 · 模型档位 · 占位符策略 · 成本控制                                        | AI / Eng                          |
| 05  | [`./05-default-matrix.md`](./05-default-matrix.md)                           | Default Tax Types Inference Matrix（Federal + CA + NY × 8 实体）Demo Sprint 子集 v1.0                           | AI / practice owner/manager / Eng |
| 06  | [`./06-fixtures/README.md`](./06-fixtures/README.md)                         | 5 套 Preset fixture + Agent demo fixture + 期望 mapping JSON（脱敏）                                            | Eng / QA                          |
| 07  | [`./07-live-genesis.md`](./07-live-genesis.md)                               | Live Genesis 动效规格（时序 · 粒子参数 · `prefers-reduced-motion` 降级）                                        | Design / Frontend                 |
| 08  | [`./08-migration-report-email.md`](./08-migration-report-email.md)           | Import 完成邮件模板（Subject + Body + Unsub）· Worker 薄字典口径 · 发送时机                                     | Design / Eng / Compliance         |
| 09  | [`./09-design-system-deltas.md`](./09-design-system-deltas.md)               | Migration Copilot 对 `DESIGN.md` / `DueDateHQ-DESIGN.md` 的增量 token / 组件规格 + 回灌清单                     | Design / Frontend                 |
| 10  | [`./10-conflict-resolutions.md`](./10-conflict-resolutions.md)               | **本册唯一的产品裁定权威来源**（6 条冲突详细理由 + ADR 交叉引用）                                               | 所有人（冲突时必读）              |
| 11  | [`./11-agentic-enhancements.md`](./11-agentic-enhancements.md)               | 围绕 PRD 用户画像的增强点：Agent-shaped setup、全辖区 coverage transparency、Migration→Pulse 首周闭环、约束边界 | PM / Design / Eng / AI            |
| 12  | [`./12-import-to-weekly-triage.md`](./12-import-to-weekly-triage.md)         | DDL 前导入入库裁定：Paste / CSV → clients + obligations + evidence + audit → weekly triage                      | PM / Eng / Design                 |
| 13  | [`./13-onboarding-activation-route.md`](./13-onboarding-activation-route.md) | Practice onboarding 之后的首登迁移 activation route：解释、跳过、route-level wizard 与后续入口闭环              | PM / Eng / Design                 |

> 说明：02 ~ 09 与 ADR 0011 由其他 subagent 产出；11 为基于 PRD 用户画像新增的增强设计入口，12 为 DDL 前导入入库闭环裁定。任何子文档新增 / 拆分 / 合并必须先改本 README §2 的清单再改子文档（见 §6 维护约定）。

---

## 3. 前置条件（阻塞门）

Migration Copilot 的**实现**开工前必须先冻结以下 4 条共享契约（对齐 `../../dev-file/09-Demo-Sprint-Module-Playbook.md` §6 Shared Contract Surface 与 `../../dev-file/10-Demo-Sprint-7Day-Rhythm.md` §4 契约冻结时间表）。冻结前 Migration Copilot 的**产品 UX / Prompt / Fixture / Default Matrix** 可以先做（本册正是为冻结提供输入），但**代码实现**不得动。

| 契约                       | Provider                      | Consumer                                  | 冻结节点 | 当前状态（2026-04-24）                                                   |
| -------------------------- | ----------------------------- | ----------------------------------------- | -------- | ------------------------------------------------------------------------ |
| AI Execution Contract      | AI Orchestrator（Alice）      | Migration · Pulse · Brief                 | Day 2 末 | Activation v1 subset frozen 2026-04-28：Migration mapper/normalizer only |
| Audit/Evidence Contract    | Evidence + Audit Trail（Bob） | Migration · Pulse · Obligations · AI      | Day 2 末 | Activation v1 subset frozen 2026-04-28：audit write + evidence read      |
| Client Domain Contract     | Client + Obligations（Bob）   | Migration · Dashboard · Pulse · Demo Seed | Day 3 末 | Frozen for Migration → Dashboard v1 2026-04-28                           |
| Obligation Domain Contract | Client + Obligations（Bob）   | Migration · Dashboard · Pulse · Evidence  | Day 3 末 | Frozen for Migration → Obligations/Dashboard v1 2026-04-28               |

**阻塞门规则：** Activation Slice v1 相关的 AI / Evidence / Client / Obligation 子集已在
2026-04-28 冻结，足以支撑 Migration → Obligations → Dashboard 主闭环。本册承载的 UX
（`./02-ux-4step-wizard.md`）、AI Prompt（`./04-ai-prompts.md`）、Default Matrix
（`./05-default-matrix.md`）、Fixture（`./06-fixtures/README.md`）继续作为后续 contract
扩展的产品输入。冻结后的跨模块签名修改必须走 `[contract]` PR，provider 与 consumer 双
review（`../../dev-file/09-Demo-Sprint-Module-Playbook.md` §13）。

---

## 4. 关键裁定速查

以下 6 条是本册裁定的一行摘要，完整理由 + PRD 引用位置见 `./10-conflict-resolutions.md` 对应小节。

1. **Revert 24h 全量权限 → Owner + Manager（补救能力，不是所有权能力）** — 见 [`./10-conflict-resolutions.md#1-revert-24h-全量撤销权限`](./10-conflict-resolutions.md#1-revert-24h-全量撤销权限)
2. **5 Preset 含 File In Time（来源芯片 A-Z 排序 + FIT tip）** — 见 [`./10-conflict-resolutions.md#2-5-preset-含-file-in-time`](./10-conflict-resolutions.md#2-5-preset-含-file-in-time)
3. **T-S2-01 双指标 = Mapping Confidence ≥ 95% 且 EIN 识别率 = 100%** — 见 [`./10-conflict-resolutions.md#3-t-s2-01-双指标口径`](./10-conflict-resolutions.md#3-t-s2-01-双指标口径)
4. **KPI 起点：Time-to-First-Value 与 P95 完成是两个指标两条起止点** — 见 [`./10-conflict-resolutions.md#4-kpi-起点与终点口径`](./10-conflict-resolutions.md#4-kpi-起点与终点口径)
5. **Placeholder 策略：Mapper / Normalizer 只发样本不走 `{{client_1}}`；Agent 对话走占位符 + 后端回填** — 见 [`./10-conflict-resolutions.md#5-placeholder-策略`](./10-conflict-resolutions.md#5-placeholder-策略)
6. **Audit action 命名走 `migration.*` 工程 log；UI / 邮件文案走 Lingui 本地化** — 见 [`./10-conflict-resolutions.md#6-audit-action-命名与-ui-文案分层`](./10-conflict-resolutions.md#6-audit-action-命名与-ui-文案分层)
7. **增强路径不改变 Demo Sprint 承诺：Wizard 是必交付，Agent-shaped setup 是 Phase 0 桥接目标** — 见 [`./11-agentic-enhancements.md`](./11-agentic-enhancements.md)

---

## 5. ADR 交叉引用

本册的 6 条冲突裁定将被正式写入 [`../../adr/0011-migration-copilot-demo-sprint-scope.md`](../../adr/0011-migration-copilot-demo-sprint-scope.md)，作为架构决策的载体。**ADR 由 Subagent F 产出，本文件的交叉引用位先就位**；ADR 落地后本 README §4 与 `./10-conflict-resolutions.md` 不再与之产生新的分歧，双向对等同步（见 §6）。

ADR 样式参照 [`../../adr/0010-firm-profile-vs-organization.md`](../../adr/0010-firm-profile-vs-organization.md)。

---

## 6. 文档维护约定

对齐 `../../dev-file/00-Overview.md` §6 "修改约定"与 `../../dev-log/README.md`：

1. **入口优先原则**：本册所有变更（子文档新增 / 拆分 / 合并 / 删除）**先改本 README §2 指向清单**，再改子文档内容。禁止"先改文件再补 README"。
2. **冲突优先级**：
   - **产品语义**冲突（"应该不应该做"、"AC 怎么判"）→ PRD 为准；本册任何与 PRD 的语义冲突必须在 `./10-conflict-resolutions.md` 显式裁定，否则默认回到 PRD。
   - **Demo Sprint 落地口径**冲突（"7 天范围内先做哪些、哪些留到 Phase 1"）→ 本册为准；但不得与 PRD 语义相悖。
   - **工程落地细节**冲突（模块边界、契约、目录、CI 门禁）→ `dev-file/00` ~ `dev-file/10` 为准；本册只做"产品侧期望"表达，不决定工程实现位置。
3. **ADR 双向同步**：本 README §4 或 `./10-conflict-resolutions.md` 任意一条裁定修改，必须同步更新 `../../adr/0011-migration-copilot-demo-sprint-scope.md`；反之亦然。由修改方承担同步责任。
4. **版本标记**：每份子文档首行 `# 标题` 下第 2 行必须是 `> 版本：vX.Y（Demo Sprint · YYYY-MM-DD）`；末尾必须有"变更记录"表。

> Phase 0 扩展位：当 Demo Sprint 结束、进入 4 周 Phase 0 MVP 时，本 README 需要增补：全辖区 matrix review-only 路径、Manager 权限开闸表、Overlay Engine 迁移路径、Onboarding AI Agent 真实化 rollout 计划。当前 rules coverage 已是 `FED + 50 states + DC`。上述 hook 的产品化表达已集中到 `./11-agentic-enhancements.md`；实现仍受 `../../dev-file/09-Demo-Sprint-Module-Playbook.md` §14 与契约冻结节奏约束。

---

## 变更记录

| 版本 | 日期       | 作者       | 摘要                                                                  |
| ---- | ---------- | ---------- | --------------------------------------------------------------------- |
| v1.0 | 2026-04-24 | Subagent A | 本册初稿：定位 · 10 份子文档索引 · 前置契约 · 裁定速查                |
| v1.1 | 2026-04-28 | Codex      | 新增 12-import-to-weekly-triage，固定 DDL 前导入到 weekly triage 闭环 |
| v1.2 | 2026-05-05 | Codex      | 新增 13-onboarding-activation-route，固定首登 route-level 迁移交接    |
