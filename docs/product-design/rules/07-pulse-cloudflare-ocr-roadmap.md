# Pulse Cloudflare-first OCR 与全国政策监控路线图

## 目标

把 Pulse 的全国税务政策监控能力升级成一条稳定、可审计、可被 CPA 使用的 Alert 路径：

- 覆盖 Federal + 50 states + DC 的官方税务政策变化。
- 24 小时内把相关变化提示给 CPA 用户。
- PDF、扫描件、弱结构 HTML、邮件订阅内容都能进入统一的 `pulse_source_snapshot -> extract -> CPA-facing Alert` 路径。
- 不恢复 Source Signal 或独立运营层概念；所有相关变化都进入 CPA-facing Alerts。
- `/rules/sources` 可见 UI 保持不变，不新增 hidden source row，不新增列。

## 当前基线

截至本计划编写时，项目已经具备以下基础：

- Pulse ingest 已统一写入 `pulse_source_snapshot`，再进入 `pulse.extract` queue。
- `signal_only` 不再表示内部队列，而是表示 CPA-facing review-only Alert。
- `pdfjs-dist` 已用于 PDF text layer 抽取。
- AI Extract 使用 `rawText` 分析 source snapshot，并要求 `sourceExcerpt` 能从 `rawText` 中定位。
- Cloudflare Email Routing 已有 GovDelivery inbound skeleton，可把邮件写成 snapshot。
- Today 产品指标应继续使用 jurisdiction coverage 语义，例如 `Monitoring Federal + 50 states + DC`，而不是 raw source/adapter 数量。

当前主要缺口：

- PDF OCR fallback 尚未落地，扫描 PDF 或低质量 PDF 可能抽不到有效文本。
- PDF 原图、OCR JSON、page-level evidence 尚未形成统一 artifact contract。
- `email_inbound` 还需要从 generic GovDelivery inbound 扩展到按州/按 topic 归因。
- 对 PDF/OCR/弱结构 source 的 `due_date_overlay` gating 还需要更强的证据完整性校验。
- 全国 coverage audit 需要持续输出 source 是否是真正可自动解析，而不是只登记了 URL。

## 架构原则

### 1. Cloudflare-first

因为 Alert SLA 是 24 小时内，而不是分钟级实时通知，v1 采用 Cloudflare-first 架构：

- Cron Triggers 负责按 cadence 扫 source。
- Queues 负责 fetch、OCR、extract 的异步串联。
- R2 负责存原始 source、PDF、OCR 文本、OCR JSON、页面图片。
- D1/现有 DB 负责 `pulse_source_state`、`pulse_source_snapshot`、`pulse`。
- Workers AI 作为 OCR/vision fallback 的第一选择。
- 外部 OCR provider 只作为低置信度、关键州、复杂表格 PDF 的 fallback。

### 2. OCR 是 text fallback，不是替代证据链

AI Extract 的主输入仍应是可审计文本：

```text
[PDF text layer page 1]
...

[PDF OCR page 1]
...
```

原始 PDF、页面图片、OCR provider JSON 存 R2，作为证据附件。不要让 vision model 的自由回答直接成为可 Apply 的依据。

### 3. Apply 必须比 Alert 更严格

Alert 可以是 review-only；Apply 只能在证据完整时出现。

`deadline_shift + due_date_overlay` 必须同时满足：

- 官方 source。
- 原截止日明确。
- 新截止日明确。
- jurisdiction/scope 明确。
- forms/entity types/counties 等适用范围没有被 AI 推断出来。
- `sourceExcerpt` 或 page-level OCR span 能定位到支撑文本。

否则创建 review-only Alert，不显示 Apply。

### 4. 不恢复 Source Signal

所有可监控变化只有一条产品路径：

```text
source fetch -> snapshot -> extract -> CPA-facing Alert
```

低置信度、PDF-only、manual-check、GovDelivery early notice 都是 CPA-facing review-only Alert，而不是内部 source signal。

## 目标架构

```text
Cron Trigger
  -> source scheduler
  -> Queue: pulse.fetch
      -> HTML/RSS/API/PDF/email fetch
      -> R2 raw artifact
      -> parser-backed ParsedItem
      -> pulse_source_snapshot
      -> Queue: pulse.ocr? (only PDF/image fallback)
      -> Queue: pulse.extract
          -> AI Extract
          -> evidence guard
          -> duplicate suppression
          -> CPA-facing Alert
```

PDF 路径：

```text
PDF fetch
  -> store original PDF in R2
  -> pdfjs text extraction
  -> quality gate
      -> pass: use text
      -> fail: render pages/images + OCR
  -> merged rawText
  -> snapshot/extract
```

Email subscription 路径：

```text
State/GovDelivery subscription
  -> Cloudflare Email Routing
  -> inbound Worker
  -> source attribution
  -> canonical .gov link extraction
  -> R2 raw email artifact
  -> pulse_source_snapshot
  -> AI Extract
  -> review-only Alert by default
```

## Evidence Artifact Contract

新增内部 artifact 约定，优先放在 R2，不要求第一阶段做 DB migration。

建议 R2 key：

```text
pulse/{sourceId}/{yyyy-mm-dd}/{externalId}-{hash}/raw.pdf
pulse/{sourceId}/{yyyy-mm-dd}/{externalId}-{hash}/text.txt
pulse/{sourceId}/{yyyy-mm-dd}/{externalId}-{hash}/ocr.json
pulse/{sourceId}/{yyyy-mm-dd}/{externalId}-{hash}/page-001.png
```

建议 normalized text 格式：

```text
[source]
sourceId: ca.ftb.tax_news
officialSourceUrl: https://...
contentType: application/pdf

[PDF text layer page 1]
...

[PDF OCR page 1 confidence=0.91]
...
```

建议 OCR metadata：

```ts
interface PdfOcrArtifact {
  sourceId: string
  officialSourceUrl: string
  fetchedAt: string
  pages: Array<{
    pageNumber: number
    imageR2Key: string | null
    text: string
    confidence: number | null
    blocks: Array<{
      text: string
      confidence: number | null
      bbox: { x: number; y: number; width: number; height: number } | null
    }>
  }>
}
```

## 阶段计划

### Phase 0: 基线审计与计划落点

目标：确认当前 source、adapter、PDF、email、Alert gating 的真实状态，为后续改动建立可回归基线。

工作项：

- 输出当前 52 jurisdiction coverage audit。
- 输出所有 PDF source、弱结构 HTML source、`email_subscription` source 清单。
- 标记每个 source 的当前 acquisition method、adapter kind、是否可 parser-backed。
- 标记每个 source 的 Alert 行为：review-only、eligible for due-date overlay、ignored noise。
- 确认 `/rules/sources` 可见 rows 不包含 hidden policy-watch source。

验收标准：

- 有一份机器可读或测试可断言的 coverage/remediation audit。
- manual/blocked/parser-risk source 不会被标为 strong automated。
- Today 仍显示 52 jurisdiction 语义。

建议测试：

```bash
pnpm --filter @duedatehq/core test -- src/rules/index.test.ts
pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts
```

### Phase 1: PDF Artifact 与 Text Quality Gate

目标：不引入 OCR 之前，先把 PDF 原件、text layer、quality gate 固化，避免后续 OCR 输出不可审计。

工作项：

- 扩展 PDF fetch：R2 存 original PDF，不只存 text。
- 保留现有 `pdfjs` text extraction。
- 新增 `scorePdfTextExtraction(text)`：
  - text length。
  - date/token density。
  - printable character ratio。
  - common mojibake/乱码检测。
  - page count/text page count。
- 新增 `shouldRunPdfOcr(text, metadata)`。
- 对 text layer 合格的 PDF，继续按现有路径进入 extract。
- 对 text layer 不合格的 PDF，先标记为 OCR-needed，不静默成功。

验收标准：

- PDF text extraction 失败不再只表现为 generic fetch failure。
- 空文本、乱码、过短文本会稳定进入 OCR-needed 状态。
- 已有 text-layer PDF 不触发 OCR，避免成本上升。

建议测试：

```bash
pnpm --filter @duedatehq/ingest test
pnpm --filter @duedatehq/server test -- src/jobs/pulse/ingest.test.ts
```

### Phase 2: Cloudflare Workers AI OCR Fallback

目标：在 Cloudflare 平台内完成第一版 OCR fallback，满足 24 小时 Alert SLA。

工作项：

- 新增 `packages/ingest/src/pdf-ocr.ts`。
- 新增 `extractPdfTextWithOcrFallback(buffer, opts)`：
  - 先跑 `extractPdfText`。
  - 不合格时渲染 PDF pages 为 images。
  - 调用 Workers AI vision/image-to-text 或 OCR-capable model。
  - 输出 normalized OCR text + OCR JSON。
- 新增 OCR queue，避免 fetch worker 同步跑长任务。
- 限制 OCR 页数和大小：
  - 默认最多前 20 页。
  - 超过页数时优先 OCR 包含 date-like tokens 的页面；如果无法判断，再 OCR 前 N 页。
  - 单页图片压缩到可控尺寸。
- OCR 输出写 R2，不直接写 DB 大字段。
- merged `rawText` 进入现有 AI Extract。

验收标准：

- 扫描 PDF 能生成 `pulse_source_snapshot`。
- OCR text 可以被 `sourceExcerpt` guard 定位。
- OCR 低置信度 PDF 默认 review-only。
- OCR failure 不吞掉 source health，能记录 failure reason。

建议测试：

```bash
pnpm --filter @duedatehq/ingest test
pnpm --filter @duedatehq/server test -- src/jobs/pulse/ingest.test.ts src/jobs/pulse/extract.test.ts
```

实现注意：

- 不在普通 Worker 里跑 Tesseract.js/WASM OCR。Worker 有 128 MB memory limit，重型 OCR 不稳定。
- Workers AI OCR 是第一版 fallback；必要时再接外部 OCR。
- OCR 结果必须转成文本证据，不能只把图片给 AI。

### Phase 3: Email Inbound Source Attribution

目标：把州税局/GovDelivery 邮件订阅从 generic inbound 升级为可归因、可去重、可 review 的 source path。

工作项：

- 为每个 email subscription source 配置：
  - expected sender/domain。
  - topic/list id。
  - jurisdiction。
  - source family。
  - canonical source URL extraction rule。
- inbound Worker 解析 headers/body：
  - `Message-ID`。
  - `List-ID`。
  - sender。
  - subject。
  - first-party `.gov` links。
  - unsubscribe/list metadata。
- 将 generic `govdelivery.inbound` 归因到具体 `sourceId`，无法归因时仍可生成 review-only Alert，但要低置信度。
- email source 默认 review-only，除非后续从 canonical `.gov` 页面抓到完整 due-date evidence。
- 邮件正文存 R2，canonical link 作为 `officialSourceUrl` 优先。

验收标准：

- 同一封邮件重复投递不会重复创建 active Alert。
- 能按 jurisdiction/sourceId 统计 email source health。
- 邮件中只有 newsletter/staffing/webinar/scam/maintenance 时不生成 Alert。
- 相关政策邮件生成 CPA-facing review-only Alert。

建议测试：

```bash
pnpm --filter @duedatehq/server test -- src/jobs/pulse/govdelivery.test.ts src/jobs/pulse/extract.test.ts
```

### Phase 4: Source Remediation 批量补强

目标：把 manual/blocked/弱结构 source 系统性替换为可程序解析的官方来源。

工作项：

- 按 jurisdiction 输出 remediation queue。
- 每个 source 按优先级寻找替代：
  - RSS/API。
  - 稳定 HTML announcement list。
  - 稳定 due-date page。
  - PDF index。
  - 单 PDF。
  - email inbound。
- 不再把 `manual_review` 作为默认占位。
- 对 PDF-only/弱结构 source，允许可解析但默认 review-only。
- 对 WAF/robots 限制 source，优先找同 authority 的可抓官方页面或 email inbound。

验收标准：

- `manual_review = 0` 作为第一阶段目标。
- `blocked = 0` 除非确有官方不可访问且无替代来源。
- 所有 `signal_only` source 都必须 parser-backed。
- hidden source 不进入 `/rules/sources` visible rows。

建议测试：

```bash
pnpm --filter @duedatehq/core test -- src/rules/index.test.ts
pnpm --filter @duedatehq/server test -- src/jobs/pulse/rule-source-adapters.test.ts
```

### Phase 5: Alert Gating 与 Due-date Overlay 安全收紧

目标：减少误报和错误 Apply，确保 CPA 看到的 Alert 可信，Apply 只在证据完整时出现。

工作项：

- 新增 `canCreateDueDateOverlay(extract, sourceEvidence)` helper。
- 对以下来源强制 review-only：
  - OCR-only PDF。
  - PDF text confidence 低。
  - weak-structure baseline。
  - email inbound early notice。
  - FEMA/GovDelivery early notice。
  - original/new due date 不完整。
- AI prompt 明确：
  - date shift 需要原截止日和新截止日。
  - 不完整证据返回 review-only。
  - no-regulatory-change 噪声继续过滤。
- Guard 层拒绝：
  - `actionMode=due_date_overlay` 但缺 `originalDueDate` 或 `newDueDate`。
  - `sourceExcerpt` 不可定位。
  - jurisdiction/scope 为空但试图 Apply。
- Duplicate suppression 加入 normalized jurisdiction/date/scope/sourceUrl。

验收标准：

- PDF/OCR 可能涉及 due date 时不会被忽略，会生成 review-only Alert。
- 证据完整的官方 source 可以生成 due-date Alert，但仍需 CPA review 后 Apply。
- 证据不完整时不显示 Apply。
- 噪声内容不生成 Alert。

建议测试：

```bash
pnpm --filter @duedatehq/ai test
pnpm --filter @duedatehq/server test -- src/jobs/pulse/extract.test.ts
pnpm --filter @duedatehq/app test -- src/features/pulse
```

### Phase 6: UI 验证与 CPA Review Experience

目标：不改变 Sources 页 visible UI 的前提下，让 review-only Alert 对 CPA 足够清楚。

工作项：

- Alert drawer 对 review-only 明确只提供：
  - Review。
  - Mark reviewed。
  - Dismiss。
  - Read official source。
- Apply controls 仅在 `actionMode='due_date_overlay'` 且后端允许时显示。
- PDF/OCR Alert 显示 source excerpt；后续可增加 page evidence link。
- Today 继续显示 jurisdiction coverage，不显示 hidden source 名称或 raw adapter count。
- `/rules/sources` 可见内容保持不变。

验收标准：

- review-only Alert 不显示 Apply。
- due-date overlay Alert 显示 Apply 前仍要求 CPA review。
- Today 显示 `Monitoring Federal + 50 states + DC` 语义。
- Sources 页不出现 hidden policy-watch source。

建议测试：

```bash
pnpm --filter @duedatehq/app test -- src/features/pulse src/features/rules
pnpm --filter @duedatehq/app i18n:extract
pnpm --filter @duedatehq/app i18n:compile
```

### Phase 7: 运行健康、成本与 SLA 控制

目标：让 24 小时 Alert SLA 可观测、可回归、成本可控。

工作项：

- 对每个 source 记录：
  - last checked。
  - last changed。
  - last successful parse。
  - OCR-needed count。
  - OCR failure count。
  - Alert created count。
  - ignored/no-change count。
- 加入 budget controls：
  - 每天 OCR page cap。
  - 每 source OCR retry cap。
  - 大 PDF page cap。-低优先级 source 延迟 OCR。
- 对 source failure 分类：
  - fetch failed。
  - robots blocked。
  - selector drift。
  - PDF text failed。
  - OCR failed。
  - AI extract failed。
- 不新增 CPA-facing Sources UI；这些指标只服务工程健康和质量回归。

验收标准：

- 任何 source 连续失败不会静默。
- OCR 成本有上限。
- 24 小时内未检查的关键 source 可被测试或健康检查发现。
- 不创建独立运营产品路径。

建议测试：

```bash
pnpm --filter @duedatehq/server test -- src/jobs/pulse/ingest.test.ts src/jobs/pulse/metrics.test.ts
```

### Phase 8: 外部 OCR / 多模态增强

目标：当 Cloudflare OCR 对关键 PDF 不够稳定时，引入更强 fallback，但不改变主路径。

触发条件：

- 某些州的 PDF OCR confidence 长期低。
- 表格型 due-date PDF 频繁无法抽出日期/范围。
- 扫描件质量导致 Workers AI OCR 失败率过高。
- CPA review 中多次发现 OCR 漏掉 due date 延期。

候选方案：

- AWS Textract。
- Google Cloud Vision OCR。
- 通过 AI Gateway 调用支持 vision + structured output 的模型。

要求：

- 外部 OCR 输出仍写入 R2 artifact。
- AI Extract 仍优先吃 normalized text。
- Vision response 必须落回 quote/span/page evidence。
- 不允许 vision-only 结果直接 Apply。

验收标准：

- 外部 OCR fallback 只对目标 source/page 触发。
- 成本和调用次数可控。
- 关键 PDF 的 review-only Alert 召回率提升。
- 没有破坏现有 Cloudflare-first pipeline。

## 建议实施顺序

1. Phase 0: audit baseline。
2. Phase 1: PDF artifact + quality gate。
3. Phase 2: Workers AI OCR fallback。
4. Phase 5: due-date overlay gating 收紧。
5. Phase 3: email inbound attribution。
6. Phase 4: source remediation。
7. Phase 6: UI 验证。
8. Phase 7: SLA/cost/health。
9. Phase 8: 外部 OCR / vision fallback。

Phase 5 可以在 Phase 2 后立即做，因为 OCR 会提高召回率，也会提高误判风险；Apply gating 必须跟上。

## 第一轮里程碑定义

第一轮完成后，系统应达到：

- 52 jurisdictions coverage audit 可运行。
- manual/blocked source remediation queue 清晰。
- PDF source 可以：
  - 抽 text layer。
  - 判断是否需要 OCR。
  - OCR fallback。
  - 存 original PDF/text/OCR artifacts。
  - 生成 CPA-facing review-only Alert。
- Email inbound 可以：
  - 收 GovDelivery/州税局邮件。
  - 写 snapshot。
  - 进入 extract。
  - 默认生成 review-only Alert。
- `due_date_overlay` 只在完整证据下出现。
- `/rules/sources` 可见 UI 不变。
- Today 继续使用 52 jurisdiction 语义。

## 风险与取舍

### OCR 召回 vs 错误 Apply

OCR 会提升扫描 PDF 的召回，但也会引入识别错误。解决方式是：OCR source 默认 review-only，Apply 必须经过更严格 gating。

### Cloudflare-only vs 专业 OCR

Cloudflare-first 更简单，适合 24 小时 SLA。专业 OCR 对复杂表格和低质量扫描件更强，但成本和集成复杂度更高。先 Cloudflare，后按失败样本接外部 fallback。

### Email 及时性

Email subscription 对反爬 source 很有价值，但依赖州税局发信时间。它适合作为补充路径，不应替代可抓取的官方网页/feed。

### Hidden source 与 Sources 页

hidden source 可以生成 Alert，但不展示为 Sources 页新增 row。产品指标看 jurisdiction coverage，工程指标看 adapter/source health。

## 不做事项

- 不恢复 `pulse_source_signal`。
- 不新增 Sources 页可见 source row。
- 不把 OCR/vision 的非文本回答直接作为 Apply 依据。
- 不在普通 Cloudflare Worker 里本地跑 Tesseract.js/WASM OCR。
- 不要求所有 source 都 actionable；review-only 是有效的 CPA-facing Alert 结果。

## 参考文档

- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers AI models: https://developers.cloudflare.com/workers-ai/models/
- Cloudflare Browser Run limits: https://developers.cloudflare.com/browser-rendering/platform/limits/
- Pulse ingest source catalog: [11-Pulse-Ingest-Source-Catalog.md](../../dev-file/11-Pulse-Ingest-Source-Catalog.md)
- Rules source registry design: [01-source-registry-and-rule-pack.md](./01-source-registry-and-rule-pack.md)
