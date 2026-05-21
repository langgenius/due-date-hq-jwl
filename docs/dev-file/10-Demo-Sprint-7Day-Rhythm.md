# 10 · Demo Sprint 进度同步（Post-Activation）

> 适用场景：给搭档快速同步 Demo Sprint 当前进度、最近几天完成内容、剩余缺口和下一步优先级。
> 本文是 [09 Demo Sprint Module Playbook](./09-Demo-Sprint-Module-Playbook.md) 的执行状态更新，不重新定义模块边界。
> Migration Copilot 产品口径以
> [Migration Copilot 设计册](../product-design/migration-copilot/README.md) 和
> [12 Import to Weekly Triage](../product-design/migration-copilot/12-import-to-weekly-triage.md)
> 为准。
> Pulse 源与 Adapter 契约以
> [11 Pulse Ingest Source Catalog](./11-Pulse-Ingest-Source-Catalog.md) 为准。

---

## 1. 一句话状态

当前主线已经从“搭底座”推进到 **Activation Slice v1 已合并**：

```text
Paste / CSV
  -> AI / preset mapper + normalizer
  -> Import & Generate
  -> Obligations 出现真实 obligations
  -> Dashboard 读取 server aggregation 的真实风险摘要
  -> evidence / audit / ai trace 可追溯
  -> E2E 覆盖 import + undo 主闭环
```

现在最重要的不是继续开 Ask DueDateHQ、完整 Agent 或真抓 Pulse，而是把这条主闭环做得更可信、更好解释、更适合 demo / 试用。

---

## 2. 最近几天完成了什么

按 git 历史和当前实现看，最近主线集中在 4 件事：

| 方向                    | 已完成内容                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration 主链路        | 4 步 Wizard、CSV / paste intake、preset / AI mapping、normalization、Default Matrix、dry-run、apply、revert、toast undo、bad-row errors 已跑通 |
| Penalty / Live Genesis  | MVP penalty engine、Migration import readiness preview、Live Genesis 金额动画和 Dashboard / Obligations exposure read model 已接入             |
| Obligations / Dashboard | `obligations.list` server read model、triage filters、exposure pill、Evidence entry、Deadline Radar 和 status update audit toast 已就位        |
| AI / evidence 安全底座  | OpenRouter Provider Native 收敛；`ai_output` / `llm_log` 落库；SSN / ITIN-like 列进 AI 前剔除，Step 2 补回 forced `IGNORE`；fallback 稳定      |

关键提交脉络：

| Commit                                                       | 作用                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `414a69b feat: add migration import undo`                    | Migration apply / revert / undo toast 主流程                                          |
| `3328bda test: cover migration import undo e2e`              | 用 Playwright 覆盖导入和撤销                                                          |
| `5408ab1 fix: use infinite query for obligations pagination` | Obligations 分页和 query 结构稳定                                                     |
| `a5a17c2 fix: debounce obligations search [contract]`        | Obligations 搜索体验和 contract 调整                                                  |
| `cef20d1 feat: add activation slice v1`                      | AI trace / redaction、Dashboard server aggregation、evidence read、E2E 隔离、文档同步 |

---

## 3. 当前模块进度

| 模块                     | 状态            | 说明                                                                                                               |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Platform / Worker / oRPC | 基本完成        | 单 Worker app shell、`/rpc`、`/api/health`、Cloudflare bindings、dry-run deploy 路径已就位                         |
| Auth + Tenant Scope      | 基本完成        | Better Auth、active firm、scoped repo、跨 firm 隔离测试已成为业务 repo 基线                                        |
| DB Core + Scoped Repos   | 基本完成        | clients / obligations / migration / obligations / dashboard / evidence / ai trace repo 已有主路径                  |
| AI Orchestrator          | v1 可用         | OpenRouter provider path 可用；无 key / schema fail / guard reject 有 stable refusal；暂未做 RAG / Agent tool loop |
| Migration Copilot        | v1 主闭环完成   | UX polish、fixture golden tests、import readiness preview、Live Genesis 已进主线；import report / history 仍可后补 |
| Obligations              | v1 triage 可用  | 真实 rows、quick filters、status update、audit toast、Evidence drawer 入口、penalty input editor 已有              |
| Dashboard                | v1 风险首屏完成 | 已不再 mock；Deadline Radar、exposure breakdown、top-row Evidence 入口已接入；仍缺 source-backed Brief polish      |
| Evidence / Audit         | v1 可见闭环     | Evidence drawer 读取 obligation evidence + audit timeline；write path 覆盖 migration / penalty override / status   |
| Pulse Pipeline           | 后端/前端 MVP   | fixture-backed review/apply/revert 已入主线；真抓 cron 和更完整 Overlay 仍是后续硬化                               |
| Demo Data                | 部分完成        | 需要幂等 seed、demo profile 隔离、部署/录屏数据稳定性                                                              |
| E2E / Quality            | 主路径可用      | Import undo、Obligations、Rules console、auth shell 已覆盖；本地 E2E 默认不复用开发者手动 server                   |

---

## 4. 对 PRD / Demo 叙事的进度

| Demo 叙事                | 当前状态                                                                               | 缺口                                                   |
| ------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Migration + Live Genesis | 导入、import readiness preview、Live Genesis 和进入 Dashboard 已完成                   | 还缺 import report / history 这类管理型细节            |
| Triage Workbench         | Obligations + Dashboard 真实 obligations、Deadline Radar、Evidence drawer 已完成第一版 | Dashboard Brief 解释层还可继续 polish                  |
| Glass-Box Brief          | 后端 evidence/ai trace 底座已打好                                                      | 尚未实现 source-backed brief；这是下一批 AI 增强优先级 |
| Pulse Apply              | fixture pipeline / apply / revert 已能演示                                             | 真抓 cron、source drift 和 firm review 继续硬化        |
| Demo Readiness           | 主链路可演                                                                             | seed、部署 checklist、Plan B、录屏脚本还要补           |

---

## 5. Activation Slice v1 的重要实现裁定

### Server-first dashboard

Dashboard 现在通过 `dashboard.load` 读取 server aggregation：

- open obligations 排除 `done` / `not_applicable`
- due-this-week 使用 server window
- needs-review 来自 obligation status
- evidence-gap 来自 open obligation 是否缺 evidence
- severity 由 deterministic due-date function 计算

前端不再维护本地 `riskRows` / `useQueueStats` / `usePulseItems` 假数据。

### AI 只在 Migration 主链路内使用

当前用户能用到 AI 的位置：

- Migration Step 2：Field Mapper
- Migration Step 3：Entity / tax type Normalizer

AI 还没有出现在：

- Ask DueDateHQ
- Weekly Brief
- Pulse extraction
- Agent onboarding

这是刻意的：先让 AI 降低导入摩擦并留下 trace，而不是把 AI 作为产品入口。

### AI env 配置收敛

当前推荐路径是 OpenRouter Provider Native：

```text
AI_GATEWAY_ACCOUNT_ID=8f7d...
AI_GATEWAY_SLUG=duedatehq
AI_GATEWAY_PROVIDER=openrouter
AI_GATEWAY_MODEL_FAST_JSON=google/gemini-2.5-flash-lite
AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING=google/gemini-3.1-flash-lite-preview
AI_GATEWAY_MODEL_FAST_JSON_SOLO=google/gemini-2.5-flash-lite
AI_GATEWAY_MODEL_FAST_JSON_PAID=google/gemini-3.1-flash-lite-preview
AI_GATEWAY_MODEL_QUALITY_JSON=google/gemini-3-flash-preview
AI_GATEWAY_MODEL_REASONING=openai/gpt-5-mini
AI_GATEWAY_PROVIDER_API_KEY=<OpenRouter key>
AI_GATEWAY_API_KEY=
```

- `AI_GATEWAY_PROVIDER_API_KEY` 是唯一必需 secret。
- `AI_GATEWAY_API_KEY` 只在 Cloudflare Authenticated Gateway / legacy path 需要，默认空。
- 前端不需要任何 `VITE_*` AI key。
- 本地 E2E 会在 Worker 子进程里用 Wrangler `--var` 覆盖 AI key 为空，不写 `.dev.vars`，不消耗真实 key。

### PII / evidence / trace

- SSN / ITIN-like 列会在进 AI 前从 prompt payload 剔除。
- 服务端 Step 2 仍会补回这些 header 的 forced `IGNORE` mapping，保证审阅和 evidence 可见。
- Mapper / Normalizer 的模型尝试和 fallback 都写 `ai_output` / `llm_log`。
- `evidence_link.ai_output_id` 可指向 AI / preset / dictionary 输出。
- Verified due date 仍只来自 rules preview，不来自 AI。

---

## 6. 下一步优先级

### P0 · 先做

| 优先级 | 任务                             | 原因                                                                                                     |
| ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1      | Dashboard Brief v1.1             | AI 下一步最适合做 source-backed brief，而不是开放 Ask；可直接复用 `dashboard.load`、exposure 和 evidence |
| 2      | Demo seed + deployment checklist | 让搭档和外部试用能稳定复现，而不是只在开发机上跑通                                                       |
| 3      | Import report / history          | 对试用有帮助；当前 toast undo 已覆盖 v1 最小撤销                                                         |

### P1 · 再做

| 优先级 | 任务                            | 原因                                                              |
| ------ | ------------------------------- | ----------------------------------------------------------------- |
| 5      | Pulse true-source hardening     | MVP 已能演示；真抓、source drift、firm review 继续按 catalog 硬化 |
| 6      | Audit export / evidence package | 可信链路的 Phase 1 增强，不阻塞 Demo                              |

### 暂不做

- Ask DueDateHQ。
- 完整 Onboarding Agent。
- 复杂 RAG。
- 真实 Pulse cron 真抓作为主线。
- XLSX 真解析、R2 signed upload、完整 Import History resume。

---

## 7. 给搭档的接手重点

如果搭档今天接进来，先看这 5 个点：

1. **主闭环已经能跑**：从 Migration paste 到 import readiness preview / Live Genesis，再到 Dashboard / Obligations 真实 obligation 和 Undo import。
2. **AI 现在只在 Migration 用**：配置 OpenRouter key 后 mapper/normalizer 会走模型；无 key 时稳定 fallback。
3. **Dashboard 已不是 mock**：首屏数据来自 server aggregation，Deadline Radar 金额只来自输入 / fixture / rule metadata。
4. **Evidence drawer 已接入主入口**：Obligations `E`、row action、Dashboard top rows 和 Brief citation 都走同一个 drawer。
5. **E2E 默认隔离 AI key**：不要为了测试去改 `.dev.vars`；需要复用已有 server 才显式设置 `E2E_REUSE_EXISTING_SERVER=1`。

---

## 8. 当前验收状态

已验证过：

- `pnpm --filter @duedatehq/core test`
- `pnpm --filter @duedatehq/ai test`
- `pnpm --filter @duedatehq/contracts test`
- `pnpm --filter @duedatehq/db test`
- `pnpm --filter @duedatehq/server test`
- `pnpm --filter @duedatehq/app test`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- `pnpm test:e2e`：20 passed
- `pnpm ready`
- `git diff --check`

已知注意事项：

- `pnpm secrets:scan` 需要本机或 CI 有 `gitleaks`；之前本机缺二进制导致命令启动前失败。
- `pnpm check` 当前无 lint / type warning。
- E2E logs 仍会显示 “Using secrets defined in .dev.vars”，这是 Wrangler 读取文件的提示；实际 AI key 会被测试 Worker 子进程的 `--var` 覆盖为空。

---

## 9. 合并纪律（保持不变）

- `main` 必须保持可 demo。
- Commit 使用 Conventional Commits。
- `[contract]` PR 必须 provider 和 consumer 都 review。
- 文档和 devlog 与实现同 PR 更新。
- 涉及 env / deploy / AI provider 的改动必须同步
  `01-Tech-Stack`、`04-AI-Architecture`、`07-DevOps-Testing`。

---

## 10. 最后原则

1. **先巩固 Activation，不扩散入口**：当前核心价值是“导入即看到真实 deadline 风险”。
2. **AI 只增强可信链路**：AI 负责降低导入摩擦和解释证据，不直接生成 due date，不替用户做危险写入。
3. **Server-first 风险口径**：Dashboard / Obligations 共享 server aggregation，不在前端重复业务计算。
4. **Evidence 优先于文案**：Brief、Tip、Pulse 都必须 source-backed；没有 citation 就降级。
5. **不伪造金额**：Penalty / exposure 只吃显式输入、fixture seed 或 verified rule metadata；缺输入显示 `needs input`。
6. **Pulse 先 fixture 后真抓**：真抓是 stretch，不阻塞 Demo 主线。
7. **可回滚、可审计、可演示**：每个 dangerous write 都要有 audit，关键 demo path 都要有 Plan B。

---

## 变更记录

| 版本 | 日期       | 作者  | 摘要                                                                        |
| ---- | ---------- | ----- | --------------------------------------------------------------------------- |
| v0.4 | 2026-04-30 | Codex | 收口 Penalty / Evidence / Migration golden tests / Triage polish 四项计划   |
| v0.3 | 2026-04-28 | Codex | 改为 Post-Activation 进度同步：总结最近完成内容、当前模块进度和下一步优先级 |
| v0.2 | 2026-04-28 | Codex | Activation Slice v1 后重排：从模块搭建计划改为产品化 7 天收口计划           |
| v0.1 | 2026-04-24 | Codex | 初版：2 人 Demo Sprint 7 天节奏，覆盖 Foundation → Pulse → Polish           |
