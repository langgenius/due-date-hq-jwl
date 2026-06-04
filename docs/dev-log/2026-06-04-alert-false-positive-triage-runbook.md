---
title: '2026-06-04 · Alert 误报溯源 runbook（源 / AI 提取 / 确定性匹配 三层归因）'
date: 2026-06-04
author: 'Claude'
---

# Alert 误报溯源 runbook

## 目的

收到一条疑似误报的 Alert（内部即 Pulse）时，**确定根因落在哪一层**，避免把
源头数据问题误当成提取 bug、或反之。本 runbook 给出溯源链路、判定流程和每层的
现成信号。

适用：`pulseFirmAlert` 被人工标记误报、或巡检发现某条 pulse 内容/匹配明显不对。

## 背景：误报有三层，不是两层

直觉上会把误报二分成「形成 Alert 的问题」vs「源头 source 的问题」。但系统刻意把
**全局提取**和**各所匹配**分开（一条全局 `pulse` 扇出成 N 条 `pulseFirmAlert`），
所以「形成」这一侧又分两层：

1. **源头层（source）** —— 上游页面/feed 本身：内容错、过时、有歧义，或抓取/解析
   把错的文本拉进来了（selector drift、错的 externalId）。
2. **提取层（AI extraction）** —— `pulse` 的 AI 提取误判：幻觉出不存在的摘录，或
   摘录对但 `parsed*` 解读错。
3. **匹配层（确定性 fan-out）** —— pulse 完全正确，但 `refreshFirmAlertsForPulse`
   把不该命中的客户/义务匹配了进来。纯 SQL，无随机性。

好在每条 Alert 都留了完整的可复现工件，可以逐层二分。

## 溯源链路与关键字段

```
pulseFirmAlert (某所看到的告警)
   │ .pulseId
pulse (全局公告)  ──.rawR2Key──────────────┐
   │ ↑ pulseSourceSnapshot.pulseId          │
pulseSourceSnapshot                         ▼
   │ .aiOutputId / .contentHash        R2 原始字节
   │ .parseStatus / .failureReason   (AI 当时真正看到的源文本)
   ▼ .sourceId
aiOutput + llmLog                    pulseSourceState
(inputHash/outputText/confidence/    (healthStatus/lastError/
 guardResult/model/promptVersion)     consecutiveFailures/etag)
```

连接键 / 取证字段：

| 工件                  | 关键字段                                                                                                                                                                | 用途                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `pulseFirmAlert`      | `pulseId`、`matchedCount`、`needsReviewCount`、`status`                                                                                                                 | 入口；匹配层复算的对象                        |
| `pulse`               | `verbatimQuote`、`parsedJurisdiction/Counties/Forms/EntityTypes`、`parsedOriginalDueDate/NewDueDate`、`confidence`、`changeKind`、`actionMode`、`sourceUrl`、`rawR2Key` | pulse 自带「主张 + 证据引文」                 |
| `pulseSourceSnapshot` | `pulseId`、`aiOutputId`、`contentHash`、`parseStatus`、`failureReason`、`rawR2Key`                                                                                      | 源→pulse 的桥；`contentHash` 判真变化 vs 噪声 |
| `aiOutput`            | `inputContextRef`(= snapshotId)、`inputHash`、`outputText`(完整 JSON)、`guardResult`、`refusalCode`、`model`、`promptVersion`                                           | 提取层取证；`promptVersion` 定位 prompt 回归  |
| R2 (`rawR2Key`)       | 原始字节                                                                                                                                                                | AI 当时逐字看到的源文本，**整条提取可复现**   |
| `pulseSourceState`    | `healthStatus`、`consecutiveFailures`、`lastError`、`lastSuccessAt`、`lastChangeDetectedAt`、`etag`                                                                     | 源健康                                        |

最强的一点：`pulse.rawR2Key`（= 快照 rawR2Key）存的是 AI 提取时的**确切字节**，
`aiOutput.inputHash` 是它的哈希。把同样字节重跑 extract 即可确定「再来一次还会不会
误报」——这是区分「AI 问题 vs 源问题」最硬的证据。

代码索引：

- snapshot 唯一键 `uq_pss_source_external_hash (sourceId, externalId, contentHash)` —
  `packages/db/src/schema/pulse.ts:171`；`stableExternalId` = URL 去 `#fragment`
  （`packages/ingest/src/http.ts:48`），`contentHash` = 正文 SHA-256（`http.ts:40`）。
- `aiOutput.inputContextRef = snapshotId` 写入点：`apps/server/src/jobs/pulse/extract.ts:239`。
- 摘录是否存在于源文本的原语 `sourceTextContainsExcerpt`：
  `apps/server/src/procedures/rules/concrete-draft.ts:471`。
- 匹配条件：`refreshFirmAlertsForPulse` `packages/db/src/repo/pulse/ops.ts:97-159`。
- `getDetail`（前端可见的证据）：`apps/server/src/procedures/pulse/index.ts:530`。

## 判定流程（二分法）

### Step 0 — 看误报的性质

- 「这条法规变更**根本不该报**」 → 怀疑 **源** 或 **提取**（走 Step 1）。
- 「法规变更对，但**匹配到了不该匹配的客户/义务**」 → 直接是 **匹配层**（走 Step 3）。

### Step 1 — 取证：四样东西摆一起

1. `pulse.verbatimQuote` / `getDetail` 的 `sourceExcerpt` —— AI 声称**逐字抄**的原文。
2. `pulse.rawR2Key` 指向的 R2 原始字节 —— 真正抓到的源文本。
3. `pulse.parsed*` —— AI 的**解读**（newDueDate / forms / entityTypes / jurisdiction）。
4. `aiOutput.outputText`（含 `confidence`）+ `inputHash` + `model` + `promptVersion`。

### Step 2 — 核心判定：摘录是否真的在源文本里？

用 `sourceTextContainsExcerpt(rawText, verbatimQuote)`，三分支：

| 现象                                                                                          | 结论                 | 解释                                                            |
| --------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------- |
| 摘录**在**源文本里，且源文本确实是这个意思                                                    | **源头问题**         | Alert 忠实形成，是上游页面错/过时/歧义。非本系统 bug            |
| 摘录**在**，但 `parsed*` 和摘录**对不上**（摘录讲 2025、AI 填 2026；摘录讲 A 表、AI 填 B 表） | **提取问题**         | 模型错解                                                        |
| 摘录**根本不在**源文本里                                                                      | **提取问题（幻觉）** | AI 编造 excerpt。`verbatimQuote` 字段就是用来当可机检的「罪证」 |

### Step 3 — pulse 对、但匹配错 → 匹配层

对照 `refreshFirmAlertsForPulse` 的命中条件（`ops.ts:117`）逐维复算：辖区 / 实体类型 /
表格 / **当前到期日 == parsedOriginalDueDate** / county。常见三因：

- `parsedOriginalDueDate` 为空或不精确 → 「撞日期」误命中；
- county 缺失被算进 `needsReviewCount`；
- `parsedForms` / `parsedEntityTypes` 过宽。

## 各层信号速查

**源头层** —— `pulseSourceState`（`listSourceHealth` 源健康面板，`index.ts:499`）：

- `selector_drift` 错误：抓到内容但解析 0 条（页面结构变了，`ingest.ts:261`）。
- `pulse.ingest.fetch_result` metric：success/failure + 用了哪个 fetcher。
- `pulse.ingest.last_success_stale` 告警：源太久没成功（`metrics.ts`）。
- 快照 `parseStatus` / `failureReason`：`duplicate` / `ignored:historical_pre_2026` /
  `ignored:monitoring_baseline_established` / `failed`；`contentHash` 判真变化 vs 噪声。

**提取层** —— `aiOutput` + `llmLog`：`inputHash`、`outputText`、`guardResult`、
`refusalCode`、`confidence`、`model`、`promptVersion`。

- `pulse.extract.result` metric：created / ignored / failed / duplicate / rule_drift。
- `pulse.extract.low_confidence`：confidence < 0.5（`extract.ts:490`）。
- `promptVersion` 定位「是不是某次改 prompt 引入的回归」。

**匹配层** —— firmAlert 的 `matchedCount` / `needsReviewCount` 对照 pulse 的 `parsed*`
复算即可，纯确定性，无随机性。

## 按 changeKind 的特例

两种**确定性**类型没有 AI 环节，归因不同：

- `threshold_advisory`：完全无 AI（无 `aiOutput`）。误报只能是「源不是真的 IRS 通胀
  Rev. Proc.」→ 源 / 源配置问题（`extract.ts:168`）。
- `rule_source_drift`：信号来自 `sourceTextContainsExcerpt` 返回 false。误报通常是
  **源页面改了排版**（摘录语义还在但不再逐字匹配）**或规则当初存的 excerpt 本身就脆**
  ——属「源格式漂移 vs 规则撰写」，而非 AI 提取（`extract.ts:289-355`）。

其余 7 种（`deadline_shift` 及被强制 review_only 的 `filing_requirement` /
`applicability_scope` / `form_instruction` / `source_status` / `new_obligation` /
`other`，见 `shouldForceReviewOnlyPulseAlert` `rule-source-adapters.ts:918`）走完整 AI 链路，
适用 Step 1–2。

## 实操步骤

> 访问路径：无 DB 权限时走前端 `getDetail` + 源健康面板即可定到「源 vs 提取」；
> 要到字节级/复现，需 D1 + R2（worktree 无 node_modules，wrangler/脚本从主 checkout 跑）。

1. `alertId` → `getDetail`：看 `sourceExcerpt` / `parsed*` / `structuredChange` /
   `confidence` / `sourceUrl`（前端即可）。
2. 顺 `alert.pulseId` 查 `pulse` 行，拿 `rawR2Key`、`changeKind`、`confidence`。
   ```sql
   SELECT id, change_kind, action_mode, confidence, verbatim_quote,
          parsed_jurisdiction, parsed_forms, parsed_entity_types,
          parsed_original_due_date, parsed_new_due_date, raw_r2_key, source_url
   FROM pulse WHERE id = '<pulseId>';
   ```
3. 取 R2 原始字节（`R2_PULSE` / `raw_r2_key`），跑
   `sourceTextContainsExcerpt(rawText, verbatim_quote)`。
4. 按 **Step 2 表**定性：源 / AI-幻觉 / AI-错解。
5. 查源健康，排除源侧抓取或结构漂移：
   ```sql
   SELECT source_id, health_status, consecutive_failures, last_error,
          last_success_at, last_change_detected_at, etag
   FROM pulse_source_state WHERE source_id = '<sourceId>';
   ```
   （`<sourceId>` 来自该 pulse 的快照 `pulse_source_snapshot.source_id`。）
6. 查 `aiOutput` 确认置信/版本：
   ```sql
   SELECT confidence_or_via_output_text, model, prompt_version, guard_result,
          refusal_code, input_hash, output_text
   FROM ai_output WHERE input_context_ref = '<snapshotId>' AND kind = 'pulse_extract';
   ```
   （`confidence` 在 `output_text` JSON 内。）
7. 若以上都正常但客户错 → 回 **Step 3** 复算匹配条件。

一句话：**`verbatimQuote` 对 R2 原始字节做「逐字是否存在 + 解读是否一致」两道检查，
就能把误报一刀切到「源 / 提取 / 匹配」三层之一**；再用该层的健康表与 metric 坐实根因。

## 后续 / 未闭环

- 可把 Step 1–6 固化成一条命令：输入 `alertId`，自动拉 pulse、取 R2、跑 excerpt 检查、
  打印源健康与 aiOutput 摘要，输出三层判定建议。脚本宜放 `scripts/`，从主 checkout 跑。
- 当前 `confidence` 埋在 `aiOutput.output_text` JSON 里，批量分析需解析；若误报排查变高频，
  考虑把 `confidence` 提成 `aiOutput` 独立列或加一张 pulse 误报标注表沉淀样本。
