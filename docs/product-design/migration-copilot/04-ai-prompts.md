# Migration Copilot · AI Prompts 定稿

> 版本：v1.0（Demo Sprint · 2026-04-24）
> 上游：PRD Part1B §6A.2 / §6A.3 / §6A.4 / §6A.5 / §6A.9 · Part2B §9.2 / §9.3 / §13.1 / §13.2 · `dev-file/04-AI-Architecture.md` §1 / §2 / §3 / §7 / §10 · `dev-file/03-Data-Model.md` §2.2 / §2.4 / §2.6
> 入册位置：[`./README.md`](./README.md) §2 第 04 份

---

## 1. 范围与裁定回顾

本文件是 **Migration Copilot Field Mapper + Normalizer** 的 Prompt 定稿 + AI SDK 模型档位 + 成本边界 + PII 策略；同时与 Onboarding AI Agent 的对话路径（见 [`./03-onboarding-agent.md`](./03-onboarding-agent.md)）区分。

**裁定 5（Placeholder 策略）再强调**（权威出处 [`./10-conflict-resolutions.md#5-placeholder-策略`](./10-conflict-resolutions.md#5-placeholder-策略)）：Migration Mapper / Normalizer 只通过 `packages/ai` + AI SDK 发送"字段名 + 5 行原始样本"，**不**使用 `{{client_1}}` 占位符——因为字段名 + 样本值本身不含跨行 PII 结构，而 EIN 模式识别（`^\d{2}-\d{7}$`）**必须**依赖原样字符才能生效；Onboarding Agent 对话则走占位符 + 后端回填路径。

PII 防护改由以下四道闸守住（对齐 PRD Part1B §6A.9 / Part2B §9.3 / §13.2）：

1. 前端 SSN 正则拦截 + 该列强制 `IGNORE` + 红色警示（Step 1 Intake，见 [`./02-ux-4step-wizard.md#step-1-intake`](./02-ux-4step-wizard.md#step-1-intake)）
2. 后端 `redactMigrationInput` 在调用 AI Gateway 前再次剔除 SSN / ITIN-like header 与 sample cell；
   trace 只保存 redacted input hash，不保存 prompt 原文
3. 走 Vercel AI SDK Core + Cloudflare AI Gateway provider（`dev-file/04` §1 / §2）
4. Prompt 明示 `"Do not retain any data seen for training"` + `"5-row sample only, no placeholders"` 两类契约字符串；retention 能力由 Cloudflare AI Gateway 上游配置和 provider 合同保障（本文 §2.3 / §3.3）

---

## 2. Field Mapper @ v1

### 2.1 输入契约

| 字段           | 类型                                                                 | 必填 | 说明                                                                                     |
| -------------- | -------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------- |
| `header`       | `string[]`                                                           | 是   | 原始表头（CSV 第 1 行）；允许空字符串元素（空白列）；前端先去首尾空白                    |
| `sample_rows`  | `string[][]`                                                         | 是   | 前 5 行数据样本；每行数组长度必须 = `header.length`；单元格全为 `string`                 |
| `preset`       | `'taxdome' \| 'drake' \| 'karbon' \| 'quickbooks' \| 'file_in_time'` | 否   | 可选先验；只使用公开导出 / 批量更新资料可确认的平台字段。详见下方 preset fallback 约束。 |
| `firm_id_hash` | `string`                                                             | 是   | 供 AI SDK telemetry / internal trace / rate limit 计数；不落 prompt 原文                 |

Preset fallback 不得自动命中税额、罚金、owner count 等客户自定义或 demo fixture 字段；这些字段需由
AI 样本判断或用户手动确认。

### 2.2 目标字段 Schema（严格 11 字段 + `IGNORE`）

对齐 PRD Part1B §6A.2 + Part1A §4.1 P0-3。

| target                   | 类型            | 必填     | 备注                                                                           |
| ------------------------ | --------------- | -------- | ------------------------------------------------------------------------------ |
| `client.name`            | string          | required | Client legal or DBA name                                                       |
| `client.ein`             | string          | optional | 正则 `^\d{2}-\d{7}$`（9 位数字中间一连字符）                                   |
| `client.state`           | string(2)       | required | 2-letter US state code；小写 / 全称经 Normalizer @ v1 归一                     |
| `client.county`          | string          | optional | 州内 county；不归一（太细），异常字符告警                                      |
| `client.entity_type`     | enum            | required | `llc / s_corp / partnership / c_corp / sole_prop / trust / individual / other` |
| `client.tax_types`       | string[] (JSON) | optional | 缺失走 Default Matrix（见 [`./05-default-matrix.md`](./05-default-matrix.md)） |
| `client.tax_year_type`   | enum            | optional | `calendar / fiscal`；缺失、空值或无法可靠识别 fiscal 时按 calendar year 兜底   |
| `client.fiscal_year_end` | string          | optional | 明确 fiscal-year client 的 year end；可含年份，写库只保留 month/day            |
| `client.assignee_name`   | string          | optional | 人名或邮箱；Demo Sprint 下不强制落 `assignee_id`                               |
| `client.email`           | string          | optional | 客户联系邮箱                                                                   |
| `client.notes`           | string          | optional | 自由文本                                                                       |
| `IGNORE`                 | —               | —        | 显式声明不使用该列（含 SSN 拦截列、未知列、重复列等）                          |

> Entity type enum 本 Sprint 采 8 项（含 `individual`，对齐 PRD §6A.2 Schema）。数据层 `clients.entity_type` 若仍是 7 项 enum（`dev-file/03` §2.2），Mapper 输出经 post-processing 把 `individual` 保留；生效写库由 Client 模块兜底（追加 enum 成员或在迁移时做 v1→v1.1 的 enum 扩展，走契约 PR）。

### 2.3 Prompt 原文（`mapper@v1`）

**Prompt 头部契约**：

- `prompt_version: mapper@v1`
- `model_tier: fast-json`（具体模型 id 在实现时从 AI SDK / Cloudflare AI Gateway 当前模型清单确认）
- `temperature: 0`
- `output: object`
- `runtime: ai-sdk-core`
- `gateway: cloudflare-ai-gateway`

```text
prompt_version: mapper@v1
model_tier: fast-json
runtime: ai-sdk-core
gateway: cloudflare-ai-gateway

You are a data mapping assistant for a US tax deadline tool.
Given a spreadsheet's header and a 5-row sample, map each column to
one of the DueDateHQ target fields. Output strict JSON only.

For EIN detection:
  - EIN format is "##-#######" (9 digits with a dash after the first 2).
  - If a column contains values matching this pattern, map to "client.ein".

For each source column, output:
  {
    "source": "<header>",
    "target": "<field|IGNORE>",
    "confidence": 0.0-1.0,
    "reasoning": "<one sentence, ≤ 20 words>",
    "sample_transformed": "<example of first row after mapping>"
  }

Rules:
  - If unclear, set target=IGNORE and confidence below 0.5.
  - Never invent target fields not listed above.
  - Explain every decision in ≤ 20 words.
  - PII note: you only see this 5-row sample, not the full dataset.

Retention: Do not retain any data seen for training.
PII handling: field names and 5-row sample only — no placeholders used.
```

> 上述 `Rules:` 块与 PRD Part1B §6A.2 一字不差；末尾追加的 retention / PII 契约属于本文件在 PRD 基础上的增量（对齐 Part2B §9.3 / §13.2）。

### 2.4 输出 JSON Schema（Zod 伪码）

```ts
import * as z from 'zod'

export const MapperTarget = z.enum([
  'client.name',
  'client.ein',
  'client.state',
  'client.county',
  'client.entity_type',
  'client.tax_types',
  'client.tax_year_type',
  'client.fiscal_year_end',
  'client.assignee_name',
  'client.email',
  'client.notes',
  'IGNORE',
])

export const MapperOutput = z.object({
  mappings: z.array(
    z.object({
      source: z.string().min(1).max(120),
      target: MapperTarget,
      confidence: z.number().min(0).max(1),
      reasoning: z.string().max(100),
      sample_transformed: z.string().max(200).optional(),
    }),
  ),
})

export type MapperOutput = z.infer<typeof MapperOutput>
```

**示例 output**（基于合成 TaxDome header，10 行 mapping）：

```json
{
  "mappings": [
    {
      "source": "Client Name",
      "target": "client.name",
      "confidence": 0.99,
      "reasoning": "Header verbatim matches client legal name.",
      "sample_transformed": "Acme LLC (TEST)"
    },
    {
      "source": "Tax ID",
      "target": "client.ein",
      "confidence": 0.98,
      "reasoning": "All 5 samples match EIN pattern ##-#######.",
      "sample_transformed": "99-0000042"
    },
    {
      "source": "Entity Type",
      "target": "client.entity_type",
      "confidence": 0.97,
      "reasoning": "Column enumerates LLC/S-Corp/Partnership.",
      "sample_transformed": "llc"
    },
    {
      "source": "State",
      "target": "client.state",
      "confidence": 0.99,
      "reasoning": "Two-letter state codes present.",
      "sample_transformed": "CA"
    },
    {
      "source": "Tax Return Type",
      "target": "client.tax_types",
      "confidence": 0.86,
      "reasoning": "Values look like IRS form numbers.",
      "sample_transformed": "federal_1120s"
    },
    {
      "source": "Assignee",
      "target": "client.assignee_name",
      "confidence": 0.92,
      "reasoning": "Values are staff names (first last).",
      "sample_transformed": "Jordan Park"
    },
    {
      "source": "Email",
      "target": "client.email",
      "confidence": 0.97,
      "reasoning": "RFC 5322 local@domain pattern.",
      "sample_transformed": "test+1@example.com"
    },
    {
      "source": "Notes",
      "target": "client.notes",
      "confidence": 0.81,
      "reasoning": "Free-form text, ≤ 200 chars.",
      "sample_transformed": "Quarterly filer"
    },
    {
      "source": "Billing ZIP",
      "target": "IGNORE",
      "confidence": 0.4,
      "reasoning": "Not in DueDateHQ target schema.",
      "sample_transformed": ""
    },
    {
      "source": "Last Modified",
      "target": "IGNORE",
      "confidence": 0.35,
      "reasoning": "Internal metadata, no mapping.",
      "sample_transformed": ""
    }
  ]
}
```

### 2.5 后处理

1. **JSON Schema 校验**：Zod parse；失败 → Glass-Box Guard 触发重试（§2.6）
2. **EIN 列二次验证**：对 `target='client.ein'` 的列抽取整列（不是只看样本 5 行）算 `^\d{2}-\d{7}$` 命中率；< 80% → 拒收该 mapping 并回退到 `IGNORE`（对齐 PRD Part1B §6A.2）；裁定 3：T-S2-01 目标 **EIN 识别率 = 100%**（见 [`./10-conflict-resolutions.md#3-t-s2-01-双指标口径`](./10-conflict-resolutions.md#3-t-s2-01-双指标口径)），Preset 命中场景下必须保底
3. **置信度门禁**：
   - `confidence < 0.8` → UI 黄色 `Needs review` 徽章（非阻塞）
   - `confidence < 0.5` → UI 强制用户手动选字段（PRD Part2B §9.2）
4. **写库**（`apps/server` 注入 writer ports，`packages/ai` 不直接碰 DB；对齐 `dev-file/04` §1）：
   - `migration_mapping`（每列一行）：`source / target / confidence / reasoning / user_overridden / model / prompt_version`
   - `ai_output`（kind = `migration_map`）：`prompt_version / model / input_context_ref / input_hash / latency_ms / tokens / cost / guard_result / refusal_code`
   - `llm_log`：每次模型尝试或 fallback 的 prompt / model / input hash / latency / tokens / guard result
   - `evidence_link`（`source_type='ai_mapper'`）：`ai_output_id / model / confidence / verified_by=null / applied_by=user_id / applied_at`
5. **PostHog 埋点**：emit `migration.mapper.run.completed`，字段：
   - `batch_id`
   - `preset_used` (`taxdome | drake | karbon | quickbooks | file_in_time | null`)
   - `avg_confidence` (number, 分母 = 非 `IGNORE` 列数)
   - `ein_detection_rate` (number)
   - `columns_total` / `columns_mapped` / `columns_ignored`
   - `needs_review_count`（< 0.8）
   - `forced_manual_count`（< 0.5）

### 2.6 Guard / Refusal

对齐 `dev-file/04` §3 Glass-Box Guard：Mapper 不需要 `[n]` citation（无 retrieval），因此只执行 **Schema 校验 + PII 回填白名单**两道闸：

1. **Schema 校验闸**：Zod parse 失败 → 重试 1 次（same prompt + same inputs，temperature=0）→ 再失败 → 降级到 Preset 默认 mapping（若有 preset 参数）或**纯手动下拉**（对齐 PRD Part2B §9.2"Mapping 置信度 < 0.5 → UI 强制用户手动选字段"）
2. **PII 回填闸**：若 AI SDK structured output 意外输出 `{{client_N}}` / `{{ein_N}}` 占位符（本 prompt 不应出现）→ 标记 `pii_mismatch`，直接降级到手动

**Refusal 文案**（Lingui key `migration.mapper.refusal`）：

```text
We couldn't map your columns automatically. Use your preset or set the mapping manually — no rows will be skipped.
```

---

## 3. Normalizer @ v1

### 3.1 输入契约

| 字段           | 类型                                                                             | 必填 | 说明                            |
| -------------- | -------------------------------------------------------------------------------- | ---- | ------------------------------- |
| `field`        | `'entity_type' \| 'state' \| 'tax_types' \| 'importance' \| 'ein' \| 'tax_year'` | 是   | 归一目标字段                    |
| `raw_values`   | `string[]`                                                                       | 是   | 去重后的原始值集合；上限 200 项 |
| `preset`       | 同 Mapper                                                                        | 否   | 先验提示                        |
| `jurisdiction` | `'federal' \| 'CA' \| 'NY'`                                                      | 否   | 仅 `tax_types` 归一需要         |
| `firm_id_hash` | `string`                                                                         | 是   | AI SDK telemetry / rate limit   |

### 3.2 归一策略（对齐 PRD Part1B §6A.3）

| 字段          | 归一路径                                                                                                                                              | 是否走 AI SDK                                 | 备注                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- | --- |
| `entity_type` | 本地字典先过（`L.L.C. → llc` / `Corp (S) → s_corp` / …）；未命中再走 AI SDK structured output                                                         | 是（`normalizer-entity@v1`）                  | 枚举 8 项，未知走 `other` + `needs_review`                            |
| `state`       | 字典：2-letter + full name（`California → CA`）；失败再试 fuzzy                                                                                       | 否                                            | 纯字典；省成本；失败 → UI 手动                                        |
| `county`      | 保留原始                                                                                                                                              | 否                                            | 州内 county 太细，不归一；仅对异常字符（非 ASCII / `/\\` / `<>`）告警 |
| `tax_types`   | 字典 + 正则（`Fed 1065 → federal_1065` / `1120-S → federal_1120s` / `CA Franchise → ca_100_franchise`）；缺失 → Default Matrix；字典未命中再走 AI SDK | 视情况（`normalizer-tax-types@v1`）           | 字典命中即跳过 AI 调用（省成本）                                      |
| `importance`  | 字典（`A / VIP / Priority / top → high`；`B / normal → med`；`C / low → low`）                                                                        | 否                                            |                                                                       |
| `ein`         | 正则 `^\d{2}-\d{7}$`；归一去除空格 / 点 / 下划线                                                                                                      | 否                                            |                                                                       |
| `tax_year`    | 正则 `(19                                                                                                                                             | 20)\d{2}`；找不到 → 最近 filing_year fallback | 否                                                                    |     |

### 3.3 Prompt 原文（2 个子 prompt）

#### 3.3.1 `normalizer-entity@v1`

```text
prompt_version: normalizer-entity@v1
model_tier: fast-json
runtime: ai-sdk-core
gateway: cloudflare-ai-gateway

You are a data normalization assistant for a US tax deadline tool.
Given a list of raw entity-type strings (from a CSV column), map each
raw value to exactly one of these 8 canonical values:

  llc, s_corp, partnership, c_corp, sole_prop, trust, individual, other

Output strict JSON only:

  {
    "normalizations": [
      {
        "raw": "<raw value exactly as provided>",
        "normalized": "<canonical>",
        "confidence": 0.0-1.0,
        "reasoning": "<one sentence, ≤ 20 words>"
      }
    ]
  }

Rules:
  - If the raw value is ambiguous, set normalized="other" and confidence below 0.5.
  - Never invent a canonical value outside the 8 listed above.
  - Return one normalizations item for each raw value provided, and no extra items.
  - Case-insensitive; ignore surrounding whitespace and punctuation.

Retention: Do not retain any data seen for training.
PII handling: enumerated field values only — no placeholders used.
```

#### 3.3.2 `normalizer-tax-types@v1`

```text
prompt_version: normalizer-tax-types@v1
model_tier: fast-json
runtime: ai-sdk-core
gateway: cloudflare-ai-gateway

You are a data normalization assistant for a US tax deadline tool.
Given a list of raw tax-type / tax-return strings and an optional
jurisdiction hint (one of: federal, CA, NY), map each raw value to one
or more canonical tax_type IDs from DueDateHQ's Default Matrix vocabulary:

  federal_1040, federal_1040_sch_c, federal_1041, federal_1065,
  federal_1065_or_1040, federal_1120, federal_1120s, federal,
  ca_540, ca_541, ca_100_franchise, ca_100s_franchise,
  ca_565_partnership, ca_llc_franchise_min_800,
  ca_llc_fee_gross_receipts, ca_ptet_optional,
  ny_it201, ny_it204, ny_it205, ny_ct3, ny_ct3s,
  ny_llc_filing_fee, ny_ptet_optional

Output strict JSON only:

  {
    "normalizations": [
      {
        "raw": "<raw value exactly as provided>",
        "normalized": ["<id1>", "<id2>"],
        "confidence": 0.0-1.0,
        "reasoning": "<one sentence, ≤ 20 words>"
      }
    ]
  }

Rules:
  - If the raw value is ambiguous or outside the vocabulary, set normalized=[]
    and confidence below 0.5 — do not invent IDs.
  - Prefer the narrowest match; if jurisdiction is provided, prefer that jurisdiction.
  - Case-insensitive; ignore punctuation and common prefixes ("Form", "IRS", "#").
  - Return one normalizations item for each raw value provided, and no extra items.

Retention: Do not retain any data seen for training.
PII handling: enumerated field values only — no placeholders used.
```

### 3.4 输出 JSON Schema + 示例

```ts
export const NormalizerEntityOutput = z.object({
  normalizations: z.array(
    z.object({
      raw: z.string(),
      normalized: z.enum([
        'llc',
        's_corp',
        'partnership',
        'c_corp',
        'sole_prop',
        'trust',
        'individual',
        'other',
      ]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string().max(100),
    }),
  ),
})

export const NormalizerTaxTypesOutput = z.object({
  normalizations: z.array(
    z.object({
      raw: z.string(),
      normalized: z.array(z.string()).max(10),
      confidence: z.number().min(0).max(1),
      reasoning: z.string().max(100),
    }),
  ),
})
```

**`normalizer-entity@v1` 示例**：

```json
{
  "normalizations": [
    {
      "raw": "L.L.C.",
      "normalized": "llc",
      "confidence": 0.99,
      "reasoning": "Dotted abbreviation of LLC."
    },
    {
      "raw": "Corp (S)",
      "normalized": "s_corp",
      "confidence": 0.97,
      "reasoning": "Parenthetical S indicates S corporation."
    },
    {
      "raw": "Limited Partnership",
      "normalized": "partnership",
      "confidence": 0.96,
      "reasoning": "Partnership variant."
    }
  ]
}
```

**`normalizer-tax-types@v1` 示例**：

```json
{
  "normalizations": [
    {
      "raw": "Fed 1065",
      "normalized": ["federal_1065"],
      "confidence": 0.97,
      "reasoning": "Federal partnership return."
    },
    {
      "raw": "CA Franchise",
      "normalized": ["ca_100_franchise"],
      "confidence": 0.84,
      "reasoning": "Ambiguous: defaulting to C-corp 100."
    },
    { "raw": "Mystery", "normalized": [], "confidence": 0.2, "reasoning": "Cannot map." }
  ]
}
```

### 3.5 后处理 + PostHog

1. **字典优先合并**：AI SDK 输出与本地字典合并；冲突 → 取本地字典（字典是 practice-reviewed）
2. **写库**：
   - `migration_normalization`（每条归一一行）：`field / raw_value / normalized_value / confidence / model / prompt_version / reasoning / user_overridden`
   - `ai_output`（kind = `migration_normalize`）+ `llm_log`
   - `evidence_link`（`source_type='ai_normalizer'`，绑定 `ai_output_id`）
3. **置信度 < 0.8**：UI 黄色 `Needs review`（非阻塞，对齐 PRD §6A.3）
4. **置信度 < 0.5**：UI `[Fix now or skip]`；不强制（对齐 PRD §6A.3）
5. **PostHog**：emit `migration.normalize.reviewed`，字段：
   - `batch_id`
   - `field` (string)
   - `total_values`
   - `ai_hit_count`（字典未命中走 AI SDK 的数量）
   - `avg_confidence`
   - `needs_review_count` / `user_overridden_count`

### 3.6 Guard / Refusal

- **Schema 校验闸**：Zod parse 失败 → 重试 1 次 → 再失败 → 降级到**纯字典**（AI 未命中的条目标 `needs_review`，但不阻塞）
- **Refusal 文案**（Lingui key `migration.normalizer.refusal`）：

```text
We couldn't normalize these values automatically. You can fix them inline or skip — nothing is blocked.
```

---

## 4. 成本与 Rate Limit

### 4.1 每 batch 调用上限

- **1 次** Mapper 调用（1 batch = 1 次粘贴 / 上传 + 5 preset 可选）
- **最多 1 次** `normalizer-entity@v1`（字典命中即跳过）
- **最多 1 次** `normalizer-tax-types@v1`（字典命中即跳过）
- **硬上限**：每 batch **≤ 2 次付费 AI SDK 调用**（Mapper 强制 + Normalizer 二选一走 AI；典型 batch 为 1–2 次）
- `state` / `importance` / `ein` / `tax_year` **零 AI 调用**

### 4.2 独立的 firm 配额

- Migration 有**独立计数器** `firm:day:migration_ai`，**与** Ask / Tip / Brief / Pulse 的 firm 日配额**互不干涉**（对齐 `dev-file/04` §10 "每 batch 有固定开销"的精神；本文件在此固化）
- **初值 = 20 次 / firm / day** = 10 batch × 2 次；足够 Demo Sprint + 早期 Phase 0；超限返回 `rate_limited` + 明确 message（对齐 `dev-file/04` §8）
- Phase 0 起按 paying tier 升档（见 §7 扩展位）

### 4.3 成本预算

- **≤ $0.02 / batch** 目标（fast-json 档位 / 输入 5 列 × 5 行 ≈ 2–4KB prompt）
- 与 `dev-file/04` §10 `$0.02 / firm / day` 日总预算兼容（Migration 一天 1 batch 在预算内；多 batch 超限会触发 Cloudflare AI Gateway 侧 usage 告警，不阻塞）

---

## 5. AI SDK Trace 字段

对齐 `dev-file/04` §10：所有 Mapper / Normalizer 调用经 `packages/ai` 生成内部 trace payload，并可打开 AI SDK telemetry：

| 字段             | 值                                                                                    | 说明                               |
| ---------------- | ------------------------------------------------------------------------------------- | ---------------------------------- |
| `prompt_version` | `mapper@v1` / `normalizer-entity@v1` / `normalizer-tax-types@v1`                      | 一 Prompt 一版本                   |
| `model_tier`     | `fast-json`                                                                           | 具体模型由 `packages/ai/router.ts` |
| `model`          | provider 返回的实际 model id                                                          | 经 Cloudflare AI Gateway           |
| `firm_id`        | `sha256(firm_id)` 前 8 位 hex                                                         | 不落明文（隐私）                   |
| `latency_ms`     | number                                                                                | `packages/ai` 计时                 |
| `tokens`         | `{ input, output }`                                                                   | AI SDK usage                       |
| `cost_usd`       | number \| null                                                                        | Gateway 可用则写入                 |
| `guard_result`   | `'ok' \| 'schema_fail' \| 'schema_retry_ok' \| 'schema_retry_fail' \| 'pii_mismatch'` | Glass-Box Guard 结果               |
| `batch_id`       | string                                                                                | 便于与 `migration_batch` join      |
| `preset`         | string \| null                                                                        | Preset 标签                        |

---

## 6. 版本控制

- Prompt 原文落仓：
  - `packages/ai/src/prompts/mapper@v1.md`
  - `packages/ai/src/prompts/normalizer-entity@v1.md`
  - `packages/ai/src/prompts/normalizer-tax-types@v1.md`
- 改动必须 `prompt_version++`（`mapper@v1` → `mapper@v2`），并在对应 [`../../adr/`](../../adr/) 下登记决策 ADR
- 新旧 prompt 可并存（`packages/ai` by `firm_id` hash 分桶；对齐 `dev-file/04` §10）

---

## 7. Phase 0 扩展位

| 扩展项                              | 时机        | 做法                                                                                                         |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Default Matrix 对齐全辖区 coverage  | Phase 0 MVP | `normalizer-tax-types@v1` 的 `jurisdiction` 入参扩到 `STATE_RULE_JURISDICTIONS`；词表扩容                    |
| Pulse 场景复用 Mapper               | Phase 0 起  | 同一 mapper prompt，不同 target schema（Pulse 是 `pulse_chunks`，目标是 `{ jurisdiction, tax_type, form }`） |
| Migration Mapper v2                 | Phase 1     | 支持多表头（多 sheet）+ 列类型推断（金额 / 日期）                                                            |
| `firm:day:migration_ai` cap 分层    | Phase 0 MVP | Free tier 20 / day、Pro 100 / day、Enterprise 无 cap                                                         |
| Cloudflare AI Gateway provider 调优 | Phase 1     | 按 retention、成本和可用性选择上游 provider；业务层仍只依赖 AI SDK facade                                    |

---

## 变更记录

| 版本 | 日期       | 作者       | 摘要                                                                                                    |
| ---- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| v1.0 | 2026-04-24 | Subagent D | 初稿：Field Mapper @ v1 + Normalizer-entity/tax-types @ v1 · 成本边界 · trace · Phase 0 扩展位          |
| v1.1 | 2026-04-28 | Codex      | 将运行时口径切到 Vercel AI SDK Core + Cloudflare AI Gateway，移除第三方 tracing / provider SDK 直连依赖 |
