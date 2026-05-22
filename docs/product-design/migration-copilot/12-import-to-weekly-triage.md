# Import to Weekly Triage 产品设计

> 版本：v0.2（Activation Slice v1 · 2026-04-28）
> 上游：`README.md`、`01-mvp-and-journeys.md`、`11-agentic-enhancements.md`、`../rules/README.md`
> 下游：`apps/app/src/features/migration/*`、`apps/server/src/procedures/migration/*`

本文件裁定 DDL 前 Migration Copilot 的核心产品职责：**把 CPA 已有客户表变成本周
deadline queue**。它不是完整数据迁移平台，也不是开放式 AI Agent。当前最小闭环是：

```text
Paste / CSV
  -> AI or preset mapping (SSN/ITIN-like columns redacted before AI)
  -> normalize entity/state/tax types
  -> Default Matrix fills missing tax_types
  -> active practice rules generate obligations
  -> Obligations / Dashboard show real weekly triage
```

## 1. 产品判断

目标 ICP 已经在 Excel、Google Sheets、TaxDome、Drake、Karbon、QuickBooks 或 File In
Time 里维护客户清单。让他们手动录入 20-100 个客户，会让真实验证卡在 setup，而不是
验证 DueDateHQ 的核心价值。

因此，DDL 前必须提供导入。但导入的目的不是“完成迁移”，而是让用户在一次 paste 或
CSV upload 后看到：

- 哪些客户被创建；
- 哪些 deadline 被生成；
- 哪些行被跳过且原因可见；
- 哪些 generated obligations 需要 review；
- 每条 deadline 的依据来自 active practice rules / official sources。
- Dashboard 首屏马上反映刚导入的 open obligations、due-this-week、review 和 evidence gap。

内部一句话：

> Import is the activation path into weekly triage, not a standalone migration product.

## 2. 入口和范围

DDL 前只保留三个入口：

| 入口              | 用途            | 裁定                                                 |
| ----------------- | --------------- | ---------------------------------------------------- |
| Paste spreadsheet | 主路径          | 用户从 Excel / Sheets 复制表格，最快进入产品         |
| CSV / TSV upload  | 真实试点路径    | 支持常见系统导出的 CSV；XLSX 提示先导出 CSV          |
| Preset demo       | 演示与 fallback | TaxDome / Drake / Karbon / QuickBooks / File In Time |

手动添加客户只作为 fallback，不作为 DDL 前主路径。Agent-shaped setup 只保留入口和后续设计，
不进入本轮 hard commitment。

## 3. 字段策略

最小字段分三层：

| 字段                                  | 级别 | 行为                                       |
| ------------------------------------- | ---- | ------------------------------------------ |
| `client.name`                         | 必填 | 缺失则跳过该行，坏行可见                   |
| `client.state`                        | 推荐 | 有效州/DC 才生成 state obligations         |
| `client.entity_type`                  | 推荐 | 缺失或不识别则用 `other`，进入 review 语义 |
| `client.tax_types`                    | 可选 | 缺失时由 Default Matrix 推断               |
| `client.ein`                          | 可选 | 格式不合法则不入库，不阻塞客户创建         |
| `client.email` / `assignee` / `notes` | 可选 | 可入库，但不参与 obligation 生成           |

SSN-like 列必须在前端和后端双层阻断，并强制 `IGNORE`。

## 4. Apply 语义

Step 4 的 `Import & Generate` 是唯一危险写入按钮。点击后服务端执行：

1. 读取 batch 的 raw input、confirmed mappings、confirmed normalizations、matrix result。
2. 逐行构造 client draft；`EMPTY_NAME` 行跳过。
3. 基于 normalized tax types 或 Default Matrix 结果构造 rules preview input。
4. 使用 active practice rules preview 生成 obligations；AI 和 matrix 都不能直接生成 due date。
5. 写入 clients、obligations、active rule evidence、audit events，并更新 batch 为 `applied`。
6. 返回 created counts 与 24h revert 截止时间；前端可在 import success toast 上提供
   最小 `Undo import` 入口，并 invalidate / prefetch Dashboard + Obligations。

状态裁定：

- `reminderReady=true` 的 obligation 默认 `pending`。
- `requiresReview=true` 但有 concrete due date 的 obligation 默认 `review`。
- `dueDate=null` 的 preview 不入库，只通过后续 review 机制处理。
- 未覆盖州或无 state 的客户可以创建 client，但不生成 state obligations。

## 5. 信任和一致性

导入写入必须满足：

- **Rules 优先**：日期来自 active practice rules；Default Matrix 只推断 tax types。
- **坏行不阻塞好行**：跳过行保留 error reason，成功行继续入库。
- **证据先行**：每条 generated obligation 至少有一条 `verified_rule` evidence。
- **AI 可追溯**：mapper / normalizer 的模型尝试或 fallback 都写 `ai_output` / `llm_log`；
  `evidence_link.ai_output_id` 指向该次业务输出，不保存 prompt 原文，只存 redacted input hash。
- **审计可回看**：apply 写入 `migration.imported`、`client.batch_created`、
  `obligation.batch_created`；revert 写入 `migration.reverted`。
- **原子提交**：clients、obligations、evidence、audit、batch status 必须在同一 D1 ordered batch 里提交。
- **首屏真实**：Dashboard 使用 `dashboard.load` server aggregation，不使用本地 demo arrays 或假 deadline readiness。

## 6. DDL 前不做

- XLSX 真实解析。
- R2 signed upload。
- 完整 Import History / resume UI。
- 完整 Import History revert UI 和 single undo UI（DDL 前只保留 toast 入口的 full revert）。
- 开放式 AI Agent。
- Pulse 自动匹配与 apply。
- 客户门户、邮件提醒、Stripe。

## 7. 验收标准

DDL 前验收只看这一条故事线：

```text
用户粘贴 20-30 行客户表
  -> AI/preset mapping 可审阅
  -> normalize 可审阅
  -> Step 4 显示即将创建的 clients / obligations / skipped rows
  -> Import & Generate 后 Obligations 出现真实 obligation rows
  -> Dashboard summary/top rows 出现刚导入客户的真实 obligation risk
  -> 修改 obligation status 能看到 audit id
```

最低技术验收：

- apply 成功后 `migration_batch.status='applied'`。
- `successCount + skippedCount` 与输入行数一致或有明确 skip reason。
- 生成 clients 均带 `migrationBatchId`。
- 生成 obligations 均带 `migrationBatchId`。
- 每条 obligation 至少可追溯到 active practice rule evidence。
- `dashboard.load` 对同一 firm 返回真实 summary/top rows；Undo import 后 Dashboard / Obligations 都不再显示该批 obligation。
- AI Gateway 未配置或 provider 报错时返回稳定 fallback 文案；OpenRouter Provider Native 配置只需要
  `AI_GATEWAY_PROVIDER_API_KEY` 作为 provider key。

## 变更记录

| 版本 | 日期       | 作者  | 摘要                                                                               |
| ---- | ---------- | ----- | ---------------------------------------------------------------------------------- |
| v0.2 | 2026-04-28 | Codex | 对齐 Activation Slice v1：AI trace/redaction、真实 Dashboard aggregation、env 放置 |
| v0.1 | 2026-04-28 | Codex | 固定 DDL 前导入到 weekly triage 的产品和实现边界                                   |
