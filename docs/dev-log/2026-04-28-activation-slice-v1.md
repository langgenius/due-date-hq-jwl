---
title: 'Activation Slice v1'
date: 2026-04-28
author: 'Codex'
---

# Activation Slice v1

## 背景

这次收口的目标是证明 MVP 的第一条真实激活闭环：

```text
Paste / CSV
  -> AI Mapper / Normalizer
  -> Import & Generate
  -> Obligations obligations
  -> Dashboard real risk summary
  -> evidence / audit trace
```

改动前的主要问题：

- Migration Wizard、import commit、revert、Obligations read model 已能跑通，但 Dashboard
  首屏仍使用本地 fake arrays / 假指标。
- Migration AI redaction 只发现 SSN-like 列，没有真正从 prompt payload 里剔除。
- `AiRunResult.trace` 只存在内存返回值，没有写入 D1；Migration evidence 也没有稳定绑定
  AI output。
- Cloudflare AI Gateway 配置语义不清，用户容易以为必须同时填 gateway key 和 provider key。
- Evidence 已能写入 `evidence_link`，但缺少最小读取接口供后续 drawer/detail 使用。

## 决策

### Server-first activation

Dashboard 的 open risk、due-this-week、needs-review、evidence-gap、severity 排序全部放到
server aggregation。前端只消费 `dashboard.load`，负责 loading / error / empty / real-data
状态，不再在组件里维护本地风险数组。

这样做的原因：

- Obligations、Dashboard、Brief 后续都要共用同一套 obligation 风险口径。
- Evidence gap 和 review status 属于业务规则，不应该散落在前端。
- Import apply / revert 后只需要 invalidate/prefetch 同一个 query，即可让首屏反映真实状态。

### 不伪造 deadline readiness

当前 schema 虽有部分 future exposure 字段，但这条 slice 没有可靠 penalty/exposure 输入，也没有
完成 Penalty read model。因此 Dashboard v1 改成真实 obligation count 风险，不显示假美元。
Deadline Radar / deadline readiness 留给后续有规则输入和测试覆盖后再做。

### OpenRouter Provider Native

本次把本地和 staging 默认 AI path 收敛为：

```text
DueDateHQ Worker
  -> ai-gateway-provider createAiGateway(account, slug)
  -> createOpenRouter({ apiKey: AI_GATEWAY_PROVIDER_API_KEY })
  -> OpenRouter model id, e.g. openai/gpt-5-mini
```

配置裁定：

- `AI_GATEWAY_ACCOUNT_ID`、`AI_GATEWAY_SLUG`、`AI_GATEWAY_PROVIDER=openrouter`、
  `AI_GATEWAY_MODEL` 是非 secret，放 `apps/server/wrangler.toml` / `.dev.vars.example`。
- `AI_GATEWAY_PROVIDER_API_KEY` 是 OpenRouter token，是 OpenRouter path 唯一必需 AI secret。
- `AI_GATEWAY_API_KEY` 只在 Cloudflare Authenticated Gateway 或切回 Unified provider 时需要；
  OpenRouter Provider Native 默认留空。
- 前端不需要 `VITE_*` AI key；repo root `.env` 不放 Worker runtime secret。

### Structured output schema 兼容

OpenRouter / OpenAI strict structured output 不接受 normalizer 之前的动态 key record schema
（会生成 `propertyNames`）。本次改为数组 schema：

```json
{
  "normalizations": [{ "raw": "LLC", "normalized": "llc", "confidence": 0.98, "reasoning": "..." }]
}
```

Mapper 的 `reasoning` 也改为必填字段，避免 optional property 被 provider strict schema 拒绝。

## 实现内容

### AI safety / trace

- `redactMigrationInput` 返回 immutable sanitized copy，真正删除 SSN / ITIN-like header 与 sample
  cell 后再发给 AI Gateway。
- SSN-like 检测覆盖 sample value 和 header：`ssn`、`social security`、`itin`、
  `taxpayer identification`。
- Mapper 服务端 sanitizer 复用同一套 PII 检测；即使敏感列在进入 AI 前已经被剔除，Step 2
  也会补回对应 header 的 forced `IGNORE` mapping，并以 `pii_guard@v1` 记录审阅证据。
- `packages/ai` 在所有 run path 生成 `inputHash`；hash 基于 redacted prompt input。
- Gateway 未配置、schema fail、guard reject、gateway error 都返回 structured refusal，并保留
  `promptVersion`、`model`、`latencyMs`、`guardResult`、`refusalCode`、`inputHash`。
- 新增 `ai_output` / `llm_log` schema 与 scoped repo；Migration mapper / normalizer 每次 run
  都写 trace。
- Fallback 也写 `ai_output`，但 `model=null`，不把 preset / dictionary 伪装成模型输出。

### Migration evidence

- Mapper evidence 写 `source_type='ai_mapper'`，并绑定真实 `ai_output_id`。
- Normalizer evidence 写 `source_type='ai_normalizer'`，并绑定对应 run 的 `ai_output_id`。
- State normalizer 是本地 dictionary path，也会写 local trace，方便后续 drawer 显示“非模型输出”。

### Evidence read

- 新增 `evidence.listByObligation({ obligationId })` contract + handler。
- 读取前先验证 obligation 属于当前 firm，避免跨租户 id 猜测。
- Public shape 只暴露 drawer/detail 需要的字段：
  `id`、`sourceType`、`sourceId`、`sourceUrl`、`verbatimQuote`、`rawValue`、
  `normalizedValue`、`confidence`、`model`、`appliedAt`，以及 trace join 用的 `aiOutputId`。

### Dashboard aggregation

- 新增 `dashboard.load` contract、server handler、tenant-scoped dashboard repo。
- 默认 `asOfDate` 从 firm timezone 推导；默认 `windowDays=7`，含第 7 天边界。
- Summary 字段：
  - `openObligationCount`
  - `dueThisWeekCount`
  - `needsReviewCount`
  - `evidenceGapCount`
- Top rows 字段：
  - `obligationId`
  - `clientId`
  - `clientName`
  - `taxType`
  - `currentDueDate`
  - `status`
  - `severity`
  - `evidenceCount`
  - `primaryEvidence`
- Open obligations 排除 `done` / `not_applicable`。
- Severity 是 deterministic function：
  - overdue 或 0-2 天内：`critical`
  - 3-7 天：`high`
  - `review` 或 8-14 天：`medium`
  - 其他 open：`neutral`

### Frontend

- Dashboard 改为 `useQuery(orpc.dashboard.load.queryOptions({ input: {} }))`。
- 删除本地 `riskRows`、`useQueueStats`、`usePulseItems` 假数据。
- 保留原布局风格，只替换数据源和状态：
  - loading skeleton
  - query error alert + retry
  - empty state + `Run migration`
  - real summary / top rows / evidence count
- Import apply / revert 成功后 invalidate + prefetch：
  - `orpc.dashboard.load`
  - `orpc.obligations.list`
  - migration queries
- Migration mapper fallback all-ignore 时，Step 2 明确显示当前被忽略列数，避免用户看到
  response 里有 mappings 但 UI 没有足够解释。

### CI / deployment / env

- `.github/workflows/ci.yml` staging deploy 增加 `AI_GATEWAY_PROVIDER_API_KEY` secret 注入；
  `AI_GATEWAY_API_KEY` 保留为 optional legacy / authenticated gateway path。
- `.github/workflows/e2e.yml` local `.dev.vars` fixture 增加 OpenRouter provider vars，但不放 key。
- Playwright local webServer 通过 Wrangler `--var AI_GATEWAY_PROVIDER_API_KEY: --var
AI_GATEWAY_API_KEY:` 只在测试 Worker 子进程内覆盖现有 AI key 为空值，避免本地 `.dev.vars`
  中的真实 OpenRouter token 让 E2E 消耗 provider tokens 或受模型延迟影响；不写 `.dev.vars`，
  不修改 shell env。
- Playwright 默认不复用已有 8787 dev server，避免测试误连开发者手动启动且带真实 key 的 Worker；
  需要复用时显式设置 `E2E_REUSE_EXISTING_SERVER=1`。
- `apps/server/.dev.vars.example` 增加注释说明：
  - 本地只填 OpenRouter token 到 `AI_GATEWAY_PROVIDER_API_KEY`
  - 不要把 OpenAI key 放到 provider key
  - `AI_GATEWAY_API_KEY` 默认空
- `apps/server/wrangler.toml` 写入 staging 默认非 secret AI vars。

### No-AI fallback hardening

- Entity dictionary 补齐 `C Corp` / `S Corp` 空格写法，保证 AI 关闭时常见 CPA 表头值仍可通过
  Step 3 必填校验。
- Import E2E 保持通过用户可见文本与最终 Obligations/Dashboard 影响断言闭环，不依赖模型返回的
  confidence、latency 或随机 evidence id。

## 文档同步

本次同步的文档：

- `docs/dev-file/01-Tech-Stack.md`：AI provider、runtime env/secrets、fallback 语义。
- `docs/dev-file/03-Data-Model.md`：`ai_output` / `llm_log`、evidence read、Dashboard read model、AI indexes。
- `docs/dev-file/04-AI-Architecture.md`：OpenRouter Provider Native、secret 放置、structured output schema 裁定。
- `docs/dev-file/05-Frontend-Architecture.md`：Dashboard 必须消费 server aggregation。
- `docs/dev-file/07-DevOps-Testing.md`：staging secret 注入、AI Gateway/OpenRouter 部署配置。
- `docs/dev-file/08-Project-Structure.md`：Dashboard server repo/procedure、AI trace 写入边界。
- `docs/dev-file/10-Demo-Sprint-7Day-Rhythm.md`：Dashboard server aggregation checklist 标记完成。
- `docs/product-design/migration-copilot/README.md`：Activation v1 subset contract freeze 状态。
- `docs/product-design/migration-copilot/04-ai-prompts.md`：后端 redaction、AI trace/evidence 写库字段。
- `docs/product-design/migration-copilot/12-import-to-weekly-triage.md`：真实 Dashboard handoff、env 配置、AI trace。

## 仍未做

- 不做 Ask DueDateHQ。
- 不做完整 Onboarding Agent。
- 不做真实 Pulse cron / source ingest。
- 不做复杂 RAG。
- 不做 Evidence drawer UI；本次只交付 contract + handler + Dashboard 内联 evidence 状态。
- 不做 Weekly Brief；v1.1 再基于 `dashboard.load` 做 source-backed brief。
- 不做 deadline readiness / Deadline Radar；当前 Dashboard 不伪造金额。

## 验证

已跑：

- `pnpm --filter @duedatehq/core test`
- `pnpm --filter @duedatehq/ai test`
- `pnpm --filter @duedatehq/contracts test`
- `pnpm --filter @duedatehq/db test`
- `pnpm --filter @duedatehq/server test`
- `pnpm --filter @duedatehq/app test`
- `pnpm --filter @duedatehq/app i18n:compile`
- `pnpm check`
- `pnpm test:e2e`
- `pnpm ready`
- `git diff --check`

未完成：

- `pnpm secrets:scan` 已尝试执行，但当前机器缺少 `gitleaks` 二进制，命令在启动前失败：
  `sh: gitleaks: command not found`。本次没有把任何真实 `.dev.vars` 或 provider key 加入 git status。

已手工验证过 OpenRouter Provider Native path：

- `mapper@v1` structured output 成功返回映射。
- `normalizer-entity@v1` structured output 成功返回数组 normalizations。
- `normalizer-tax-types@v1` structured output 成功返回数组 normalizations。
