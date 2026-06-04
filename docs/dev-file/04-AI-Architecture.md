# 04 · AI Architecture · AI SDK · Glass-Box · RAG · Pulse Pipeline

> 对齐 PRD §6.2 / §6.3 / §6.6 / §9 / §6D。
> 本文件是 DueDateHQ 的 AI 接入口径权威：**只通过 Vercel AI SDK Core 调模型，结合 Cloudflare AI Gateway 运行在 Cloudflare Worker 内**。
>
> 代码层必须体现的五条纪律：
>
> 1. **AI SDK only** — 模型执行只走 `ai` / AI SDK provider，不直接使用上游模型 SDK 或第三方 tracing SDK
> 2. **No citation, no render** — 无 `[n]` → 降级 refusal
> 3. **Retrieval before generation** — prompt 只能引用已传入的 chunk
> 4. **PII never leaves unnecessarily** — Agent / Brief / Pulse 走占位符；Migration Mapper 仅发送字段名 + 5 行样本
> 5. **Human-controlled writes** — AI 只产出结构化建议；危险写入必须由服务端确定性流程 + 用户确认触发
>
> 相关 ADR：[`0019`](../adr/0019-ai-sdk-gateway-glass-box-boundary.md)

---

## 1. AI 层总图

```
┌────────────────────────────────────────────────────────────────────┐
│                    packages/ai · DueDateHQ AI Facade               │
│  唯一 AI 出入口；业务模块不直接 import `ai` 或任何 provider package │
└──────────────┬──────────────┬──────────────┬──────────────┬────────┘
               │              │              │              │
               ▼              ▼              ▼              ▼
┌────────────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│ AI SDK Core         │ │ Prompter │ │ Glass-Box    │ │ Trace Payload │
│ generateText        │ │ registry │ │ Guard        │ │ internal log  │
│ streamText          │ │ versioned│ │ citation/PII │ │ usage/latency │
│ Output.object       │ │ prompts  │ │ banned terms │ │ guard result  │
└──────────┬─────────┘ └─────┬────┘ └──────┬───────┘ └──────┬───────┘
           │                 │             │                │
           ▼                 ▼             ▼                ▼
┌────────────────────────────────────────────────────────────────────┐
│ Cloudflare AI Gateway provider via AI SDK                          │
│ - cache / retry / rate-limit / provider routing at Cloudflare edge  │
│ - upstream keys stay in Worker secrets                             │
│ - no business module sees provider credentials                     │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────────┐
│ Cloudflare native services                                         │
│ Vectorize retrieval · KV daily budget · D1 ai_output/evidence/audit│
└────────────────────────────────────────────────────────────────────┘
```

`packages/ai` 仍是 AI 相关的唯一业务包。`apps/server` 的 procedure 只调用
`packages/ai` 暴露的高阶函数，例如 `runPrompt`、`generateBrief`、`extractPulse`；
不直接调用 AI SDK、provider package 或 provider HTTP endpoint。

AI SDK 负责模型执行、结构化输出、流式输出、usage metadata 和 provider abstraction。
DueDateHQ 仍然自己负责 PII redaction、retrieval、citation guard、budget、audit/evidence
writer port 和 refusal 语义。SDK 不替代这些产品安全边界。

---

## 2. 运行时依赖与环境变量

### 2.1 依赖

`packages/ai` 的运行时依赖只保留 AI SDK 体系：

```json
{
  "dependencies": {
    "ai": "catalog:",
    "ai-gateway-provider": "catalog:",
    "zod": "catalog:"
  }
}
```

禁止新增：

- upstream provider native SDKs
- third-party tracing SDKs
- 自建 LiteLLM client
- 业务模块内的 provider-specific SDK

`ai-gateway-provider` 是 Cloudflare 官方 Vercel AI SDK 集成包，不等价于直接使用上游 provider
SDK。它只能在 `packages/ai` 内部和 Cloudflare Gateway + OpenRouter / Unified provider 组合使用。

### 2.2 Worker secrets

```env
AI_GATEWAY_ACCOUNT_ID=
AI_GATEWAY_SLUG=duedatehq
AI_GATEWAY_PROVIDER=openrouter
AI_GATEWAY_PROVIDER_API_KEY=
AI_GATEWAY_MODEL_FAST_JSON=google/gemini-2.5-flash-lite
AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING=google/gemini-3.1-flash-lite-preview
AI_GATEWAY_MODEL_FAST_JSON_SOLO=google/gemini-2.5-flash-lite
AI_GATEWAY_MODEL_FAST_JSON_PAID=google/gemini-3.1-flash-lite-preview
AI_GATEWAY_MODEL_QUALITY_JSON=google/gemini-3-flash-preview
AI_GATEWAY_MODEL_REASONING=openai/gpt-5-mini
AI_GATEWAY_API_KEY=
```

- `AI_GATEWAY_ACCOUNT_ID` / `AI_GATEWAY_SLUG`：Cloudflare AI Gateway endpoint。
- `AI_GATEWAY_PROVIDER=openrouter`：使用 Cloudflare AI Gateway 的 OpenRouter Provider Native
  路径。
- `AI_GATEWAY_PROVIDER_API_KEY`：OpenRouter token；这是本路径唯一必需的密钥。
- `AI_GATEWAY_MODEL_FAST_JSON`：fast-json fallback 模型 id。
- `AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING` / `AI_GATEWAY_MODEL_FAST_JSON_SOLO` /
  `AI_GATEWAY_MODEL_FAST_JSON_PAID`：fast-json 的 plan-aware override。Solo 首次成功导入
  clients 前使用 `google/gemini-3.1-flash-lite-preview`，之后回到
  `google/gemini-2.5-flash-lite`；Pro、Team、Enterprise 使用
  `google/gemini-3.1-flash-lite-preview`。
- `AI_GATEWAY_MODEL_QUALITY_JSON` / `AI_GATEWAY_MODEL_REASONING`：按 prompt `model_tier` 路由的
  provider 模型 id；由部署环境配置，不写死在业务调用点。
- `AI_GATEWAY_API_KEY`：仅在启用 Cloudflare Authenticated Gateway 或切回 Unified provider 时使用；
  OpenRouter Provider Native 默认留空。
- 不再配置第三方 tracing SDK keys。

### 2.3 模型选择

模型 id 不在文档中写死成“永远最新”。实现时必须从 AI SDK / Gateway 当前可用模型清单确认，
再写入 Worker env；`packages/ai/src/router.ts` 负责把 prompt `model_tier` 映射到 env key，其中
`fast-json` 会额外按 billing plan 和 Solo migration onboarding 状态选择 override。

当前策略：

| 能力                          | 档位         | 说明                                                 |
| ----------------------------- | ------------ | ---------------------------------------------------- |
| Migration Mapper / Normalizer | fast-json    | 低温、结构化输出、低成本                             |
| Client Risk Summary           | quality-json | async cached sections、必须带 citation               |
| Deadline Tip                  | quality-json | async cached What / Why / Prepare、必须带 citation   |
| Smart Priority Explanation    | no-model     | 纯函数 factor breakdown，不调用 AI                   |
| Weekly Brief                  | quality-json | 后台 Queue 生成 3-5 句、带 citation、缓存 / 物化 24h |
| Pulse Extract                 | quality-json | 官方公告结构化抽取，低置信进人工 review              |
| Ask DueDateHQ                 | quality-json | NL → DSL，禁止直接 SQL                               |
| Future complex reasoning      | reasoning    | 预留给需要长链推理或复杂 tool loop 的后台任务        |
| Embedding                     | embedding    | 规则 chunk / pulse chunk 写入 Vectorize              |

会员计划控制功能和额度，不决定具体模型：

| Plan       | 产品承诺                                                                   |
| ---------- | -------------------------------------------------------------------------- |
| Solo       | 带来源的 preview 和轻量 AI 辅助；额度更低。                                |
| Pro        | 完整 practice AI：brief、Pulse 摘要、客户风险摘要、deadline tip、迁移 AI。 |
| Team       | 与 Pro 相同的 AI 功能；Team 差异来自团队管理、席位、批量运营和审计能力。   |
| Enterprise | custom coverage、BYOK/provider 选项和审计级控制。                          |

Pro 和 Team 必须保持同一 AI 功能面。Team 可以因为包含更多席位而拥有更高的 aggregate
fair-use 保护，但 Billing 文案不能暗示 Team 有更强模型或更深 AI 推理能力。具体 provider/model
属于内部运行策略，不对用户承诺。

实现约束：

- Solo 只能使用 preview / basic AI 功能。手动触发的非迁移 practice AI workflows（Dashboard
  brief、Client Risk Summary、Deadline Tip、Readiness Checklist）必须在 procedure 层拒绝，
  并在前端显示 Pro 升级入口。
- Migration 是核心 activation flow：Solo 的 Mapper / Normalizer 可以使用 AI，但受 Solo
  migration 额度控制。
  新 practice 在创建后 7 天内、且尚未完成首次真实导入前，Solo migration 享有 onboarding
  credit（30 req / firm / day）；首次成功导入后或窗口结束后回到 Solo migration 标准额度
  （15 req / firm / day）。AI 不可用时才降级到 preset / dictionary fallback，并继续写入 trace。
- Alert review / review request 可在所有套餐使用，但多人套餐仍按 owner / partner / manager
  做 review 签核权限控制；Production Pulse 的 apply / revert / dismiss / snooze / reactivate
  仍要求 Pro 及以上。Team 不改变 AI 功能面，但解锁 `priorityPulseMatching`、
  `guidedMigrationReview`、`auditExport` 等更高阶运营和审计差异。

---

## 3. AI SDK 调用模式

### 3.1 结构化输出

结构化任务使用 AI SDK 的 `generateText` + `Output.object({ schema })`，或当前版本官方推荐的等价
structured output API。调用方必须传入 Zod schema；schema parse 失败返回 structured refusal。

```ts
import { generateText, Output } from 'ai'
import * as z from 'zod'

const MapperOutputSchema = z.object({
  mappings: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      confidence: z.number().min(0).max(1),
      reasoning: z.string().optional(),
    }),
  ),
})

const result = await generateText({
  model: modelFor('mapper@v1'),
  system: prompt.text,
  prompt: JSON.stringify(redactedInput),
  output: Output.object({ schema: MapperOutputSchema }),
  temperature: 0,
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'mapper@v1',
    metadata: traceMetadata,
  },
})
```

> 说明：AI SDK 的 API 会随版本演进；实现前必须按本仓 `ai` 版本查 `node_modules/ai/docs`
> 或 ai-sdk.dev 当前文档。文档语义固定为“AI SDK structured output + Zod schema”，不固定到某个
> 过时函数名。

### 3.2 流式输出

Ask 可以使用 `streamText`，但 UI 在 guard 完成前必须标记为 provisional：

- 流式正文可以先显示为草稿状态。
- Citation chip、Copy as Citation、Evidence click 只能在最终文本通过 `glassBoxGuard` 后出现。
- guard 失败时整体替换为 refusal，不保留未验证文本。

Weekly Brief 不走用户请求内 streaming。Brief 由后台 Queue consumer 生成并物化到
`dashboard_brief`；Dashboard 只读取 `ready` / `stale` / `pending` / `failed` 状态，不等待模型。

### 3.3 Cloudflare AI Gateway provider

Cloudflare AI Gateway 通过 AI SDK provider 接入。当前 staging / local 默认使用
OpenRouter Provider Native：应用把 OpenRouter token 作为 provider key 传给 OpenRouter
provider，再由 Cloudflare AI Gateway 包裹请求以保留 gateway-side 日志和治理。

```ts
import { generateText, Output } from 'ai'
import { createAiGateway } from 'ai-gateway-provider'
import { createOpenRouter } from 'ai-gateway-provider/providers/openrouter'

const aiGateway = createAiGateway({
  accountId: env.AI_GATEWAY_ACCOUNT_ID,
  gateway: env.AI_GATEWAY_SLUG,
})
const openRouter = createOpenRouter({ apiKey: env.AI_GATEWAY_PROVIDER_API_KEY })
const selectedModel = modelForPromptTier(env, prompt.modelTier, { plan: tenant.plan })

const result = await generateText({
  model: aiGateway(openRouter.chat(selectedModel)),
  output: Output.object({ schema }),
  system: prompt.text,
  prompt: JSON.stringify(redactedInput),
})
```

`AI_GATEWAY_API_KEY` 只在启用 Cloudflare Authenticated Gateway 或切回 Unified provider 时传入。
Cloudflare AI Gateway 负责 gateway-side observability；DueDateHQ 仍把 input hash、usage、
latency、guard result 写入内部 `ai_output` / `llm_log` 等价表，方便 audit/evidence join。

Deployment placement:

- `apps/server/wrangler.toml` 存非 secret：`AI_GATEWAY_ACCOUNT_ID`、`AI_GATEWAY_SLUG`、
  `AI_GATEWAY_PROVIDER=openrouter`、`AI_GATEWAY_MODEL_FAST_JSON`、
  `AI_GATEWAY_MODEL_FAST_JSON_SOLO_ONBOARDING`、`AI_GATEWAY_MODEL_FAST_JSON_SOLO`、
  `AI_GATEWAY_MODEL_FAST_JSON_PAID`、`AI_GATEWAY_MODEL_QUALITY_JSON`、
  `AI_GATEWAY_MODEL_REASONING`
- `apps/server/.dev.vars` 存本地 secret：`AI_GATEWAY_PROVIDER_API_KEY`
- GitHub environment `due-date-hq-staging` 存部署 secret：`AI_GATEWAY_PROVIDER_API_KEY`
- Cloudflare Worker runtime secret 由 CI 的 Wrangler `--secrets-file` 写入；不需要在前端或
  repo root `.env` 放 AI key

---

## 4. Prompt Registry

Prompt 原文落仓，`prompt_version` 是产品审计字段：

- `mapper@v1` → `packages/ai/src/prompts/mapper@v1.md`
- `normalizer-entity@v1` → `packages/ai/src/prompts/normalizer-entity@v1.md`
- `normalizer-tax-types@v1` → `packages/ai/src/prompts/normalizer-tax-types@v1.md`
- `brief@v1` → Phase 0 新增
- `client-risk-summary@v1` → Phase 0 P0-17 新增
- `pulse-extract@v1` → Phase 0 新增
- `deadline-tip@v1` → Phase 0 P0-17 新增

Prompt metadata 只描述任务档位，不写 provider SDK：

```yaml
prompt_version: mapper@v1
model_tier: fast-json
temperature: 0
output: object
runtime: ai-sdk-core
gateway: cloudflare-ai-gateway
```

改 prompt 必须新增版本，例如 `mapper@v1` → `mapper@v2`。新旧版本可并存；A/B 分桶由
`packages/ai` 根据 `firm_id` hash 决定，并写入内部 trace payload。

---

## 5. Glass-Box Guard

每次 AI 返回必须过后置 guard。AI SDK 只保证输出 transport 和 schema，不保证 DueDateHQ 的
业务安全。

```ts
export interface GuardResult {
  ok: boolean
  text?: string
  citations?: number[]
  reason?: 'no_citation' | 'citation_oob' | 'banned_phrase' | 'pii_mismatch' | 'empty_retrieval'
}
```

五道闸：

1. **Citation 正则校验**：需要 source-backed narrative 的输出必须有 `[n]`。
2. **Citation 越界校验**：每个 `[n]` 对应已检索 chunk。
3. **黑名单短语**：禁止 “your client qualifies”、“no penalty will apply”、“this is tax advice”、
   “AI confirmed”、“this deadline is guaranteed” 等措辞。
4. **PII 回填**：Agent / Brief / Pulse 使用 `{{client_N}}` / `{{ein_N}}` 等占位符；未声明占位符
   触发 `pii_mismatch`。
5. **White-list tone scoring**：软提示，不阻塞，但写指标。

失败处理：重试 1 次；仍失败返回固定 refusal：

```text
I don't have a verified source for this. [Ask a human]
```

Migration Mapper / Normalizer 是例外场景：为识别 EIN / entity / tax type 模式，允许发送字段名

- 前 5 行样本，不走 `{{client_N}}` 占位符；但必须拦截 SSN-like pattern，只发送最小样本，不发送全表。

---

## 6. RAG Pipeline

```
User event (dashboard load / Ask / Apply)
       │
       ▼
┌────────────────────────────────────┐
│ 1. Query builder                   │
│   embedding via AI SDK             │
│   filters from firm / jurisdiction │
└──────────────────┬─────────────────┘
                   │
                   ▼
┌────────────────────────────────────┐
│ 2. Retriever                       │
│   Vectorize.query(topK: 6)         │
│   global rule chunks + firm chunks │
└──────────────────┬─────────────────┘
                   │
                   ▼
┌────────────────────────────────────┐
│ 3. PII redact / sample minimize    │
│   Agent/Brief/Pulse placeholders   │
│   Migration: 5-row sample only     │
└──────────────────┬─────────────────┘
                   │
                   ▼
┌────────────────────────────────────┐
│ 4. Prompt assembly                 │
│   versioned prompt + chunks [1..n] │
└──────────────────┬─────────────────┘
                   │
                   ▼
┌────────────────────────────────────┐
│ 5. AI SDK call via CF AI Gateway   │
│   generateText / streamText        │
│   Output.object for JSON tasks     │
└──────────────────┬─────────────────┘
                   │
                   ▼
┌────────────────────────────────────┐
│ 6. glassBoxGuard + schema guard    │
└──────────────────┬─────────────────┘
                   │
                   ▼
┌────────────────────────────────────┐
│ 7. Return guarded AiResult         │
│   caller writes ai_output/evidence │
└────────────────────────────────────┘
```

Vectorize 仍是检索层：

- `rule_chunks`：active practice rule 的官方来源切片；按 practice scope 读取。
- `pulse_chunks`：approved pulse 的 `verbatim_quote + summary`；firm-specific 应用解释带
  `firm_id`。
- 检索时先取 global rule collection，再取 firm collection，合并 rerank；不要用 `firmId`
  filter 排除全局规则。

---

## 7. 能力矩阵（Phase 0 / 1 落地）

| 能力                    | 优先级 | 输入                                     | 输出                                           | 降级                                                     |
| ----------------------- | ------ | ---------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Weekly Brief            | P0     | Smart Priority top-N + rule chunks       | 后台物化 3-5 句带 citation                     | 旧 brief 标记 stale + 模板 `You have N items this week.` |
| Client Risk Summary     | P0     | 单客户 top obligations + source snippets | async cached sections + source chips           | 纯 SQL 聚合 `3 upcoming, 1 critical`                     |
| Deadline Tip            | P0     | 单 obligation + evidence/source snippets | async cached What / Why / Prepare              | deterministic fallback sections                          |
| Smart Priority          | P0     | open obligations + client risk fields    | score、rank、factor contribution、source label | **纯函数零 AI SDK 调用**                                 |
| Pulse Source Translator | P0     | 官方公告原文                             | 结构化 JSON + summary + source excerpt         | 低置信度在 firm review 中高亮，owner/manager 决策        |
| Ask DueDateHQ           | P1     | 自然语言 query                           | DSL + 表格 + 一句话 + citations                | 预设模板 5 条兜底                                        |
| AI Draft Client Email   | P1     | Pulse + 受影响客户                       | 邮件草稿                                       | 固定模板                                                 |
| Migration Field Mapper  | P0     | 表头 + 前 5 行样本                       | mapping JSON                                   | Preset profile + 手动下拉                                |
| Migration Normalizer    | P0     | 字段枚举值                               | 归一值 + confidence                            | 字典 + fuzzy + 手动编辑                                  |

Smart Priority 必须保持纯函数。排序、badge、popover 和 Weekly Brief ordering 都使用同一份
`packages/core/src/priority` 结果；Practice 级 `smartPriorityProfile` 只改变 deterministic
权重/阈值，不引入模型决策。AI 不解释或改写排序，只能在 Brief / Insight 文案中引用已经计算好的
分数和来源标签。

---

## 8. Pulse Pipeline（Story S3 完整实现）

### 8.1 Ingest（Cron Trigger）

- 每 30 分钟运行 `jobs/pulse/ingest.ts`
- 抓取源：IRS Disaster Relief、TX Comptroller News Releases / GovDelivery email、CA FTB Newsroom / Tax News、NY DTF Press archive 等
- 抓取 → hash 比对 → 新内容入库 snapshot → 投递 Queue

### 8.2 Extract（Queue Consumer）

- Queue 消费者调用 `packages/ai/extractPulse`
- AI SDK structured output 产出受限 JSON
- 后置 guard 校验 source excerpt 必须能定位回 raw text
- `confidence < 0.7` 仍进入 Rules > Pulse Changes，但 UI 必须高亮低置信度和 source excerpt
- `confidence ≥ 0.7` 进入 Rules > Pulse Changes，由 owner/manager apply/dismiss/snooze

### 8.3 Match（服务端确定性）

人工 approve 后触发 SQL match。AI 不直接匹配客户，不写 SQL，不更新 deadline。

### 8.4 Batch Apply（用户确认）

前端 `Apply` → 后端事务写入 due date update、evidence、audit、email outbox、
pulse application。Phase 0 Demo 可直接 UPDATE `current_due_date`；完整 MVP / Phase 1
走 Overlay Engine。

---

## 9. Ask DueDateHQ 的三层防护（Phase 1）

自然语言问答走 **NL → DSL → SQL** 三层，绝不允许 AI SDK 输出直接成为 SQL：

1. **NL → DSL**：AI SDK structured output 产出受限 JSON DSL，Zod 校验。
2. **DSL → SQL**：服务端确定性映射到白名单 SQL 模板，参数化，强制注入 `firm_id`。
3. **SQL 执行**：查询超时 3s；返回行数 > 1000 截断。

禁止：`DROP` / `UPDATE` / `DELETE` / `INSERT` / 多 statement / 未授权表。

---

## 10. 成本、限流与观测

### 10.1 每 firm / day 配额

| 任务                          | 每日 cap                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Weekly Brief                  | 1 次 scheduled + 3 次 event-triggered + 最多 3 次 manual refresh；`input_hash` 不变则跳过 |
| Client Risk Summary           | N 个客户 × 1                                                                              |
| Deadline Tip                  | 50（缓存 per-rule 7d）                                                                    |
| Pulse Extract                 | ops/admin 触发，不计普通用户 cap                                                          |
| Ask                           | 30（付费可升）                                                                            |
| Migration Mapper / Normalizer | Solo onboarding 30 req / firm / day；Solo standard 15；Pro 50；Team 150；Enterprise 500   |

KV 按 firm + day + task kind 保存预算计数。超限返回 `rate_limited` + 明确 message。
该 fair-use budget 仅在 `ENV=production` 执行；`ENV=development` 和 `ENV=staging` 用于本地 /
测试验证，跳过 KV budget 读写，不返回 `AI_BUDGET_EXCEEDED`。非生产环境仍按同一路由调用
Gateway，并继续写入 trace / usage 记录。

### 10.2 Trace payload

不再使用第三方 tracing SDK 作为必选架构件。每次 AI SDK 调用都生成内部 trace payload：

| 字段             | 来源                                       |
| ---------------- | ------------------------------------------ |
| `prompt_version` | Prompt registry                            |
| `model`          | AI SDK result / provider metadata          |
| `model_tier`     | `packages/ai/router.ts`                    |
| `firm_id_hash`   | server 注入                                |
| `latency_ms`     | `packages/ai` 计时                         |
| `tokens`         | AI SDK `usage`                             |
| `cost_usd`       | Gateway metadata 可用则写入，否则 nullable |
| `guard_result`   | Glass-Box Guard                            |
| `refusal_code`   | structured refusal                         |
| `gateway`        | `cloudflare-ai-gateway`                    |

这些字段写入 `ai_output` / `llm_log` 等价表，并可同步到 Cloudflare Logs / Analytics
Engine。Cloudflare AI Gateway Dashboard 用于 provider-level usage、latency、cache 和 cost
观察；Sentry/Workers Logs 用于应用错误。

2026-04-28 Activation Slice v1：Migration mapper / normalizer 已接入内部
`ai_output` + `llm_log` 写入。SSN / ITIN-like 列会在进入 AI Gateway 前从 header
和 sample rows 中剔除；Gateway 未配置、schema fail、guard reject、gateway error 都返回
structured refusal，并保留 trace 字段。Fallback mapping / normalization 也写 output trace，
但 `model=null`，避免把 preset / dictionary 误标成模型结论。

OpenRouter / OpenAI structured output 兼容性裁定：Migration normalizer prompt 不使用
`z.record(...)` 这类会生成 `propertyNames` 的动态键 schema；统一输出
`{ normalizations: [{ raw, normalized, confidence, reasoning }] }` 数组。Mapper 的
`reasoning` 为必填字段，避免 provider strict schema 拒绝 optional property。

### 10.3 AI SDK telemetry

AI SDK 的 `experimental_telemetry` 可以打开，用于 OpenTelemetry-compatible span metadata。
它是辅助观测，不是唯一审计来源。内部 audit/evidence 仍以 D1 表为准。

### 10.4 Dashboard AI Brief 后台物化

Dashboard AI Brief 是后台任务，不是 request-time generation：

```text
Cron / data mutation
  -> enqueue dashboard.brief.refresh
  -> KV debounce by firm + scope + user (reason is metadata, not debounce key)
  -> Queue consumer loads deterministic dashboard snapshot
  -> compute input_hash
  -> skip if latest ready/pending hash already exists
  -> run brief@v1 through packages/ai
  -> guard + record ai_output(kind='brief') / llm_log
  -> update dashboard_brief ready / failed
```

`dashboard.load` 禁止调用 `packages/ai`。它只能读取最新 `dashboard_brief` 行，并在没有 ready
结果时返回 `null` 或 pending/failed/stale 状态。这样 Dashboard 首屏 P95 不受模型延迟、
provider 失败或 AI budget 影响。

Brief prompt 的输入必须来自 server-side Dashboard snapshot、Evidence、Rules source metadata
和 approved Pulse；AI 不重新查询数据库、不决定排序、不写 obligation。Smart Priority 仍是纯函数，
即使 firm owner 调整了 profile，AI 也只解释排序结果。

Dashboard 前端消费结构化 citation：`ref + obligationId + evidence(sourceType/sourceId/sourceUrl)`。
ready brief 的 citation chip 打开 evidence drawer，drawer 可跳转到 Obligations 对应 obligation 或
打开官方 source URL。手动 refresh 只返回 queued 状态；UI 立即显示 pending，并在 pending / queued
期间禁用刷新按钮。

### 10.5 Async AI Insight Cache

P0-17 的 Client Risk Summary 和 Deadline Tip 走同一条 async cache path：

```text
Client profile / Obligations drawer refresh
  -> enqueue ai.insight.refresh on DASHBOARD_QUEUE
  -> KV debounce by firm + kind + subject + asOfDate
  -> Queue consumer loads tenant-scoped deterministic snapshot
  -> compute input_hash
  -> skip if latest ready/pending hash already exists
  -> run client-risk-summary@v1 or deadline-tip@v1 through packages/ai
  -> guard + record ai_output(kind='summary'|'tip') / llm_log
  -> update ai_insight_cache ready / failed
```

`clients.getRiskSummary` and `obligations.getDeadlineTip` never call the model. They return the
current cache state with public shape `status`, `generatedAt`, `expiresAt`, `sections`, `citations`,
`aiOutputId`, and `errorCode`; if no usable row exists, the server returns a deterministic fallback.
Explicit refresh mutations enqueue work and may write an immediate `pending` cache marker. For
Deadline Tip, that pending marker preserves the previous sections/citations when available so the UI
can show old guidance while polling for the latest generated result.

Insight guard adds the P0-17 checks on top of the shared Glass-Box rules: non-empty retrieval,
citation bounds, every section citing at least one source, banned tax-advice phrases, and no
unreplaced `{{placeholder}}` text.

---

## 11. 测试策略

- **Facade 单测**：AI SDK 调用 mock，验证 schema success / schema fail / provider error / rate limit。
- **Guard 单测**：citation、citation_oob、banned phrase、PII mismatch、empty retrieval。
- **Prompt contract 测试**：固定输入 + mocked AI SDK output，只断言 schema、citation、黑名单，不依赖真实模型。
- **Pulse extract 集成测**：mock source fetch + mock AI SDK structured output → 断言 DB 状态。
- **RAG 端到端**：seed 10 条 rule chunks → Vectorize mock/top-k → guard 通过。

---

## 12. 未来演进

- **AI SDK Agents**：只用于 Agent-shaped setup / Ask，且工具白名单固定；不允许开放 ReAct 自行选工具。
- **Cloudflare AI binding**：如果后续启用 Worker AI binding，可把 Cloudflare AI Gateway provider 从
  account/apiKey 形式切到 binding 形式；业务 contract 不变。
- **多语言输出**：prompts 按 locale 切换；guard 黑名单本地化。
- **替换 gateway**：若 Cloudflare AI Gateway 不满足 retention / cost / availability，可在 `packages/ai`
  内替换 provider 实现；业务模块仍只依赖 DueDateHQ AI facade。

---

继续阅读：[05-Frontend-Architecture.md](./05-Frontend-Architecture.md)
