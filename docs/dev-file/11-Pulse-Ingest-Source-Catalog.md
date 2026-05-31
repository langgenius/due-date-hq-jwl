# 11 · Pulse Ingest Source Catalog

> 文档类型：Data Source Operations Handbook
> 版本：v1.2
> 对齐 PRD：`docs/PRD/DueDateHQ-PRD-v2.0-Unified-Part1.md` §6.3.1 Ingest
> 对齐技术：`docs/dev-file/04-AI-Architecture.md` §6 Pulse Pipeline
> 语言约定：正文中文，URL / 代码 / 命名 / 注释全部英文
> 本轮源稳定性评审基线：2026-04-30

---

## 1. 文档目的与边界

| 本文覆盖                                                   | 本文不覆盖（见对应文档）                         |
| ---------------------------------------------------------- | ------------------------------------------------ |
| 权威源清单（URL / 协议 / 更新频率 / 官方证据强度）         | 抓取后的 AI SDK Extraction → 见 04 §6.2          |
| 每个源的反爬策略（请求头、频率、代理、Cloudflare IP 风险） | Match Engine 四维匹配 → 见 04 §6.3 / PRD §6.3.3  |
| 单源失败的降级与可观测（SLA 风险矩阵 + 应急预案）          | Batch Apply 事务 → 见 04 §6.4                    |
| Source Adapter 工程契约（interface + 错误边界）            | Evidence Mode / 审计 → 见 06-Security-Compliance |
| Phase 0 / Phase 1 / Phase 2 源扩展路线                     | UI 层 Pulse Banner / Drawer → 见 05-Frontend     |

**一句话：** 本文是 Backend 和 rule governance 扩源时的唯一源头事实（single source of truth for ingestion），避免每次加州都要重新翻 PRD。

---

## 2. 源分级模型（Tier）

按**官方权威性 × 工程稳定性 × 法务风险**三轴分三级：

| Tier   | 含义                                            | Evidence Mode 显示          | 默认 `confidence` 起点 | 示例                                    |
| ------ | ----------------------------------------------- | --------------------------- | ---------------------- | --------------------------------------- |
| **T1** | 政府官方主站，可作直接证据链引用                | `Official` badge + 原文链接 | 0.9                    | IRS Disaster Relief / CA FTB / NY DTF   |
| **T2** | 政府官方衍生线索（API / 第三方转发 / 跨域联动） | `Review` badge              | 0.7（需 T1 交叉验证）  | FEMA API / GovDelivery / broad newsroom |
| **T3** | 商业聚合 / 行业协会 / 邮件订阅解析              | `Reference` badge（隐藏源） | 0.5（仅作触发器）      | FTA / AICPA / Checkpoint / Avalara      |

**规则：** Ingest / extract 只允许创建 CPA-facing Alert，任何情况下都不能自动批量更改
客户 deadline。官方税务来源如果显示可能存在 due-date change，可以创建
`deadline_shift + due_date_overlay` candidate；字段完整且命中客户时为 `ready`，字段缺失时为
`needs_details`，Apply 禁用，直到 CPA 在 Alert 中补齐并确认 scope。`review_only` 只表示
永远不能 Apply，用于非 due-date 政策变化、参考线索、非税务权威 disaster early notice。
GovDelivery 属于官方投递渠道，但 Evidence 仍必须回链到 `.gov` canonical page；邮件正文只作为
快照证据。

**当前实现状态（2026-05-31）：**

- 所有 parsed item 都写 `pulse_source_snapshot` 并投递
  `PULSE_QUEUE { type: 'pulse.extract', snapshotId }`，后续经 AI Extract 进入 CPA-facing Alerts。
- `signal_only` source 不再是内部队列；它表示 CPA-facing Alert 默认不能直接 Apply。若官方税务
  文本明确涉及 due-date change，则可以进入 `due_date_overlay + needs_details`，否则为
  `review_only`。
- FEMA/GovDelivery early notice 会生成 review-only Alert；低相关列表噪声仍在 adapter/extract
  前过滤。
- Rules registry 已登记 50 州 + DC 的官方 tax-topic、filing FAQ、statute、due-date
  与 income-tax 具体页面；这些来源先服务 Rules evidence / practice review，不等于都进入自动
  Pulse 抓取。
- Rule source registry 现在带显式 `alertPurpose`：
  `explicit_live_adapter`、`temporary_announcements_or_news`、`rule_source_watch`、
  `email_signal`、`hidden_policy_watch`。Alert coverage 以 jurisdiction report 为准，
  不再用 raw adapter 总数表达生产覆盖。
- FED explicit live coverage 包括 IRS Disaster、IRS Newsroom、IRS Guidance、IRS Tax Tips
  和 FEMA Declarations；`fed.irs_newswire` 保留为 GovDelivery/email signal。
- 50 州 + DC 的 official temporary/news announcement source 会作为 web-first Alert watch
  进入 ingest；GovDelivery/email subscription source 作为并行 email signal 进入 Alert review，
  不抢占 primary web source，也不表示网页失败后才启用。
- Rule Library source 继续进入 Alert pipeline，但非 `deadline_shift` 的 source/rule 变化会被
  强制为 `review_only`。只有 `deadline_shift` 才能保留 `due_date_overlay`，且仍必须经 CPA 在
  Alert 中 review/apply 后才影响 obligations。
- `apps/server/src/jobs/pulse/rule-source-adapters.ts` 会把带 `practice_rule_review` 的
  parser-backed rule sources 接入 `pulse_source_state`。HTML、RSS/API、PDF 文档/索引都能
  产出 `pulse_source_snapshot` 并进入 `pulse.extract`；manual registry URL 会按 URL 形态降级
  为 parser-backed source，而不是停留在人工队列。PDF、弱结构 baseline、signal-only source
  不是强制 `review_only` 的充分条件；是否可 Apply 取决于 due-date intent、CPA 补齐后的
  `applyReadiness`，以及匹配到的 eligible clients。
- PDF 默认先走 `pdfjs-dist` 的确定性文本抽取，再把文本交给 AI Extract；不把二进制 PDF
  直接作为默认 AI 输入。direct-PDF / vision fallback 只适合在抽取文本为空、疑似扫描件或
  版面证据不足时启用。该 fallback 仍不能自动修改客户 deadline；如果识别出 due-date change，
  也必须先进入 CPA-facing Alert 并通过 `applyReadiness` gate。启用该 fallback 前，需要把原始
  PDF binary 一并归档到 R2，保留可审计 source artifact。

---

## 3. 源目录（Canonical List）

### 3.1 Federal（IRS · T1）

| ID             | 名称                | URL                                                              | 协议             | 频率    | 结构稳定性 | 备注                                                                    |
| -------------- | ------------------- | ---------------------------------------------------------------- | ---------------- | ------- | ---------- | ----------------------------------------------------------------------- |
| `irs.disaster` | IRS Disaster Relief | `https://www.irs.gov/newsroom/tax-relief-in-disaster-situations` | HTML detail diff | 60 min  | 高         | 联邦灾害延期的 T1 主源；抓 "Recent Tax Relief" 表格 + detail page       |
| `irs.newsroom` | IRS Newsroom        | `https://www.irs.gov/newsroom`                                   | HTML list/detail | 120 min | 中         | 广谱新闻信号，噪声高；不作为灾害延期主源；不得依赖未复核的 RSS endpoint |
| `irs.guidance` | IRS Guidance        | `https://www.irs.gov/newsroom/irs-guidance`                      | HTML list/detail | 120 min | 中         | Revenue Ruling / Procedure / Notice；比新闻稿更硬，但不进 Demo Sprint   |
| `irs.tips`     | IRS Tax Tips        | `https://www.irs.gov/newsroom/irs-tax-tips`                      | HTML list/detail | 120 min | 中         | 补充线索，命中 Pulse 匹配的概率低，默认 review-only（T2）               |

### 3.2 State Primary（DOR · T1，全辖区 source-backed 模型）

| ID                 | State | 官方源                                                             | 协议                         | 频率    | 结构稳定性 | 反爬风险 |
| ------------------ | ----- | ------------------------------------------------------------------ | ---------------------------- | ------- | ---------- | -------- |
| `ca.ftb.newsroom`  | CA    | `https://www.ftb.ca.gov/about-ftb/newsroom/index.html`             | HTML list/detail + email     | 60 min  | 中         | 中       |
| `ca.ftb.tax_news`  | CA    | `https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/index.html`    | HTML archive + email         | 60 min  | 中         | 中       |
| `ca.cdtfa.news`    | CA    | `https://www.cdtfa.ca.gov/news/`                                   | HTML list/detail             | 120 min | 中         | 中       |
| `ny.dtf.press`     | NY    | `https://www.tax.ny.gov/press/`                                    | HTML yearly archive + email  | 120 min | 中         | 低       |
| `tx.cpa.rss`       | TX    | `https://comptroller.texas.gov/about/media-center/news/`           | HTML list links              | 60 min  | 高         | 低       |
| `fl.dor.tips`      | FL    | `https://floridarevenue.com/taxes/tips/Pages/default.aspx`         | HTML list/detail + email     | 120 min | 中         | 中       |
| `wa.dor.news`      | WA    | `https://dor.wa.gov/about/news-releases`                           | HTML list/detail + subscribe | 120 min | 中         | 中       |
| `wa.dor.whats_new` | WA    | `https://dor.wa.gov/about/whats-new`                               | HTML list/detail + subscribe | 120 min | 中         | 中       |
| `ma.dor.press`     | MA    | `https://www.mass.gov/info-details/dor-press-releases-and-reports` | HTML list/detail + email     | 120 min | 中         | 中       |

> Scope note: 当前 rules coverage 是 `FED + 50 states + DC`。显式 live adapter 和由
> Rules registry promoted 出来的 source-backed adapter 都可以进入 Pulse；candidate 仍需
> practice review，不能在 product、marketing 或 Rules Console 中表达为 reminder-ready active rule。

**适用性提示：**

- TX 无州所得税 → `irs.*` + `tx.cpa.rss`（Franchise / Sales）足够
- CA 所得税（FTB）与销售税（CDTFA）是**两个独立源**，不可合并
- 不再把 NY DTF 当作 RSS 金标；先按 press archive HTML + email signal 并行实现，只有复核到官方 feed endpoint 后才启用 RSS adapter
- TX Comptroller source id 暂保留 `tx.cpa.rss` 以兼容已有 `pulse_source_state`；实际抓取官方
  News Releases HTML。官方 RSS 目录页列出的 GovDelivery topic feed 被
  `public.govdelivery.com/robots.txt` 禁止 crawler 抓取，只能作为邮件订阅 / inbound email 信号。
  TX adapter 在 retry 路径只抓列表页并保留详情 `officialSourceUrl`，避免同步 source health
  refresh 串行拉详情页导致超时。

### 3.3 Disaster Watch（T2 预判层）

| ID                  | 名称                           | URL                                                              | 协议     | 频率   | 用法                                                                               |
| ------------------- | ------------------------------ | ---------------------------------------------------------------- | -------- | ------ | ---------------------------------------------------------------------------------- |
| `fema.declarations` | FEMA Disaster Declarations API | `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries` | JSON API | 30 min | IRS 灾害延期常跟随 FEMA；FEMA item 作为 CPA-facing review-only Alert，不进入 Apply |
| `weather.alerts`    | NWS Active Alerts (optional)   | `https://api.weather.gov/alerts/active`                          | GeoJSON  | 60 min | Phase 2；仅在做"前置预警"功能时启用                                                |

**关键设计：** FEMA 来源独立生成 review-only Alert。只有官方税务来源同时给出原截止日、
新截止日、jurisdiction/scope 时，才允许创建 `deadline_shift + due_date_overlay` Alert；客户
deadline 变更仍只能由 CPA 在 Alert 中 review 后手动 Apply。

### 3.4 Aggregator & Association（T3 参考层）

| ID              | 名称                                             | URL / 接入方式                           | 用途                                                                           |
| --------------- | ------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------ |
| `fta.directory` | Federation of Tax Administrators                 | `https://taxadmin.org/`                  | 50 州 DOR 目录，扩州时的源发现入口                                             |
| `aicpa.chart`   | AICPA State Tax Filing Guidance Chart            | 会员 PDF                                 | 人工复核时的 cross-check 材料，不抓                                            |
| `govdelivery.*` | GovDelivery / 官方邮件订阅（TX/FL/WA/MA 等候选） | Inbound Email → Cloudflare Email Routing | **免反爬的官方投递信号**；生成 CPA-facing Alert，Evidence 回链 `.gov`；见 §5.3 |

### 3.5 Commercial Fallback（T3 备选，Demo 后再评估）

| ID                   | 供应商                     | 覆盖              | 商业状态         |
| -------------------- | -------------------------- | ----------------- | ---------------- |
| `checkpoint.reuters` | Thomson Reuters Checkpoint | 50 州全税种       | 贵 · 权威 · 备选 |
| `bloomberg.tax`      | Bloomberg Tax              | 50 州 + 联邦      | 贵 · 备选        |
| `avalara.api`        | Avalara                    | 销售税 / VAT 全球 | API 成熟         |
| `taxjar.api`         | TaxJar                     | 销售税            | API 成熟         |

**原则：** MVP 不采购，只在 §6 Source Adapter 里预留 `commercial.*` 适配槽位，供 Demo 后谈单时接入。

---

## 4. 反爬策略（Anti-Scraping Playbook）

### 4.1 通用规范（所有 Source Adapter 必须遵守）

```ts
// packages/ingest/http.ts
export const DEFAULT_HEADERS = {
  'User-Agent': 'DueDateHQ-PulseBot/1.0 (+https://duedatehq.com/bot; support@duedatehq.com)',
  Accept: 'text/html,application/xhtml+xml,application/xml,application/rss+xml',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

// Politeness budget per source
export const RATE_LIMIT = {
  minIntervalMs: 30_000, // never request same host more than 2/min
  maxConcurrent: 1, // serialize per host
  backoffOn429Ms: 15 * 60_000, // cool down 15 min on HTTP 429
}
```

**三条硬性底线：**

1. **可识别的 UA**：`User-Agent` 必须声明 Bot 身份 + 联系邮箱（政府站点遇到可溯源的 UA 基本不封）
2. **条件请求**：优先 `If-Modified-Since` / `If-None-Match`，命中 304 直接 return
3. **遵守 robots.txt**：启动时拉取 `/robots.txt` 缓存 24h；命中 disallow 立即报警不抓

### 4.2 按源分级的反爬预案

| 源类型                                      | 风险                                                     | 预案                                                                                                                                               |
| ------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `irs.disaster` / `irs.newsroom`             | 几乎不封，但偶发 WAF 503                                 | 403/503 时退避 15min；连续 3 次失败 → Sentry + owner/manager digest；灾害延期以 `irs.disaster` 为准                                                |
| `ca.ftb.*` / `ca.cdtfa.news`                | 偶尔触发 Akamai Bot Manager                              | 走可配置 `browserless` fetcher；未配置时只用 Cloudflare fetch，并按 ingest metrics/source diagnostics 暴露失败                                     |
| `ny.dtf.press`                              | HTML archive 结构可能调整                                | 不假设 RSS；HTML selector fallback + NY Email Services 并行信号                                                                                    |
| `tx.cpa.rss`                                | 官方新闻页可抓；GovDelivery topic feed robots-disallowed | 抓 Comptroller 官方 News Releases HTML 列表链接；GovDelivery 仅用于人工订阅 / inbound email，不作为 crawler endpoint；按 tax relevance filter 过滤 |
| `fl.dor.tips` / `wa.dor.*` / `ma.dor.press` | 中风险，页面结构年度改版或 WAF 挑战                      | 每条 selector 必须附 **selector fallback chain**（见 §6.2），并配置官方邮件并行信号；必要时再走 Browserless / 人工录入                             |
| `fema.*` / `weather.*`                      | 官方 API，稳定                                           | 标准 REST + 指数退避                                                                                                                               |

### 4.3 Cloudflare Worker 出口 IP 的风险

**背景：** Worker 的 egress IP 是 Cloudflare 共享池。部分政府 WAF 会对 Cloudflare ASN 整体限流或挑战。

**缓解：**

- **Phase 0 Demo**：2 源（IRS Disaster + TX Comptroller News Releases），直接从 Worker fetch
- **Phase 1 promoted state sources**：引入 `fetch` proxy 层，失败时 fallback 到 **Cloudflare Workers 官方的 egress 池 (`undici` + `fetcher` binding)**
- **Phase 2 扩 15 源**：若仍被挑战，引入 **Browserless.io / ScrapingBee** 作为最后一跳（成本 ~$50/月，只对触发 WAF 的源走）

**工程实现接口：**

```ts
// packages/ingest/fetcher.ts
export interface Fetcher {
  fetch(url: string, init?: RequestInit): Promise<Response>
}

export class CloudflareFetcher implements Fetcher {
  /* default */
}
export class BrowserlessFetcher implements Fetcher {
  /* Phase 2 fallback */
}

// Each source adapter declares which fetcher it needs; registry resolves at runtime
export const SOURCE_FETCHER: Record<SourceId, FetcherId> = {
  'irs.disaster': 'cloudflare',
  'tx.cpa.rss': 'cloudflare',
  'wa.dor.whats_new': 'browserless', // Phase 2 fallback only
}
```

### 4.4 法务与合规边界

- 每个源上线前逐项确认 `robots.txt` / ToS；默认只抓公开页面，商用口径需法务确认
- `GovDelivery` 订阅邮件转发受用户协议保护，**不可作为公开 API 对外暴露**；只可作为
  CPA-facing Alert 的 source snapshot 输入
- 抓到的原文（`raw_r2_key`）保留 90 天，用于 Evidence Mode 回看；超期自动归档
- **严禁** 登录后抓取（no authenticated scraping），一律走公开页

---

## 5. SLA 风险矩阵

### 5.1 单源失败场景

| 失败类型                | 检测方式                                    | 响应                                                                          | 用户可见影响                                                  |
| ----------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| HTTP 5xx / timeout      | worker 直接 catch                           | 退避 + 重试 3 次；失败 → Sentry                                               | `Last checked X min ago` 显示真实时间（诚实）                 |
| HTTP 403 / 429（反爬）  | status code                                 | 退避 15min + 切 `browserless` fetcher（Phase 2）                              | 同上                                                          |
| 结构变更（selector 挂） | 解析后字段为空 / hash 长期不变              | worker 主动报 `selector-drift` 事件；降级 mock 数据（仅 Demo 环境）           | CPA UI 仍显示 watched；source diagnostics 记录 failure metric |
| 内容污染（钓鱼页）      | AI SDK Extract `confidence < 0.3` 连续 3 次 | 该源打入 `quarantined` 状态，下次 cron 跳过，创建 owner/manager review task   | 源从 Feed 隐藏                                                |
| 法律下架（Takedown）    | owner/manager 手动触发                      | 源 `disabled`，历史 Pulse 保留但打 `source_revoked` 标记，Evidence 链保留快照 | Evidence Drawer 显示 "Source no longer live"                  |

### 5.2 可观测指标（上报到 07-DevOps-Testing）

```
pulse.ingest.fetch_duration_ms    (histogram, label: source_id, status)
pulse.ingest.fetch_result         (counter,   label: source_id, outcome ∈ {ok,304,4xx,5xx,timeout,selector_drift})
pulse.ingest.last_success_ts      (gauge,     label: source_id)
pulse.ingest.confidence_avg_24h   (gauge,     label: source_id)
```

**告警规则：**

- `last_success_ts` 超过 4 小时（联邦源）/ 12 小时（州源）→ PagerDuty
- `outcome=selector_drift` 任何一次 → owner/manager digest + source review task
- `confidence_avg_24h < 0.5` 连续 24h → 源 quarantine 自动触发

### 5.3 GovDelivery 邮件并行监控

**场景：** 某州 DOR 同时通过网页 archive 和 GovDelivery/email subscription 发布 tax news、
alerts、bulletins 或 announcement。Email channel 是并行信号，不是网页失败后的 fallback；
它的价值是捕捉订阅渠道先发、邮件正文更完整、或网页 archive 延迟同步的公告。

**方案：**

1. 用 `pulse-ingest@duedatehq.com` 订阅该州 DOR 的 GovDelivery 邮件列表
2. Cloudflare Email Routing 把该邮箱路由到 Worker
3. Worker 解析 email body → 写 `pulse_source_snapshot` → 进入 AI Extract → 生成 CPA-facing Alert；
   非税务权威 early notice 为 `review_only`，官方税务 due-date candidate 走 `applyReadiness`
   gate

**2026-05-29 实现边界：** inbound email 现在按 source 归因，而不是固定写入
`govdelivery.inbound`。优先通过 plus-addressing（例如
`pulse-ingest+ny-email-services@<inbound-domain>`）匹配具体 source；普通
`pulse-ingest@<inbound-domain>` 只在 sender / `List-ID` / 正文 canonical `.gov` URL 能唯一指向
一个 source 时才归因。未匹配邮件写入 `govdelivery.inbound.unmatched`，不投递
`pulse.extract`，因此不会生成 CPA-facing Alert。

当前已配置 inbound metadata 的真实源包括 `ny.email_services`、`fed.irs_newswire`、
`oh.temporary_announcements`、`fl.tips`、`wa.news`、`ma.temporary_announcements`、
`tx.temporary_announcements`。扩新州时沿用 `pulse-ingest+<source-slug>@<inbound-domain>`，
并至少配置 sender、`List-ID`、GovDelivery account code 或 canonical URL host 中的一种可信信号。
本轮保留现有 sender / `List-ID` / URL 规则；仅对 `USIRS` 增加精确优先级，当
`X-Accountcode` 或 `content.govdelivery.com/accounts/<code>/...` 明确命中 `USIRS` 时，
邮件归因到 `fed.irs_newswire`，即使它进入了其他 plus-address。Inbound 邮件写入 R2 时
保留同一个 `raw_r2_key`，artifact 第一段是 decoded canonical email text，第二段是 raw
RFC822 `.eml`。

**部署要求：** 代码不会自动创建收件邮箱。生产或 staging 必须在 Cloudflare Email Routing 中
为实际接收域配置 MX 和 route，把 `pulse-ingest*` 收件地址转发到 SaaS Worker 的 `email()`
handler；否则邮件会按该域现有 MX 投递，或在没有有效收件路由时退信，DueDateHQ Worker
不会收到。配置和 smoke test 步骤见 `docs/ops/runbooks/pulse-email-inbound.md`。

**优点：** 用户主动订阅、零反爬、低工程维护成本；与网页源并行进入 Alert review，可提升
覆盖密度。
**缺点：** 延迟取决于 DOR 发信节奏，且 Evidence 仍必须回链到 `.gov` canonical page；邮件
正文是补充证据，不替代官方网页证据链。

---

## 6. Source Adapter 工程契约

### 6.1 统一接口

```ts
// packages/ingest/types.ts
export interface SourceAdapter {
  readonly id: SourceId // e.g. 'irs.disaster'
  readonly tier: 'T1' | 'T2' | 'T3'
  readonly cronIntervalMs: number
  readonly jurisdiction: 'federal' | UsStateCode
  readonly allowEmptyParse?: boolean

  fetch(ctx: IngestCtx): Promise<RawSnapshot[]>
  parse(snapshot: RawSnapshot): Promise<ParsedItem[]>
}

export interface RawSnapshot {
  sourceId: SourceId
  fetchedAt: string
  contentHash: string // sha256 of body, dedup key
  r2Key: string // raw body archived in R2
  etag?: string
  lastModified?: string
}

export interface ParsedItem {
  sourceId: SourceId
  externalId: string // stable ID from source (url or guid)
  title: string
  publishedAt: string
  officialSourceUrl: string
  rawText: string // feeds AI SDK extraction downstream
}
```

### 6.2 Selector Fallback Chain（对 HTML 源强制）

```ts
// Example: FL DOR TIP list. The parser can be HTMLRewriter, linkedom,
// or another dependency approved in pnpm catalog; do not couple the
// adapter contract to a specific DOM library.
export const FL_DOR_TIPS_SELECTORS = [
  'main a[href*="/taxes/tips/"]', // primary (current DOM)
  '#content a[href*="TIP"]', // observed archive layout
  'a[href$=".pdf"]', // generic fallback for TIP PDFs
]

export interface ParsedDocument {
  querySelectorAll(selector: string): readonly unknown[]
}

// Adapter picks the first selector that yields ≥1 node
export function pickSelector(doc: ParsedDocument, chain: string[]) {
  /* ... */
}
```

**原因：** 政府站点年度改版概率约 30%，`selector-drift` 是 SLA 最常见的失败。三档 fallback 能把生产事故降级为"精度下降"而不是"完全拉不到数据"。

### 6.3 目录约定（对齐 08-Project-Structure）

```
packages/ingest/
├── types.ts                    # SourceAdapter, RawSnapshot, ParsedItem
├── fetcher.ts                  # Cloudflare / Browserless / Inbound-Email fetchers
├── http.ts                     # DEFAULT_HEADERS, RATE_LIMIT, retry helpers
├── selectors/                  # Named selector chains per source
└── adapters/
    ├── federal/
    │   ├── irs-tax-relief.ts
    │   ├── irs-newsroom.ts
    │   ├── irs-guidance.ts
    │   └── fema-declarations.ts
    ├── state/
    │   ├── ca-ftb-newsroom.ts
    │   ├── ca-ftb-tax-news.ts
    │   ├── ca-cdtfa-news.ts
    │   ├── ny-dtf-press.ts
    │   ├── tx-comptroller-rss.ts
    │   ├── fl-dor-tips.ts
    │   ├── wa-dor-news.ts
    │   └── wa-dor-whats-new.ts
    └── fallback/
        └── govdelivery-inbound.ts
```

2026-05-28 implementation note: `fetcher.ts` exposes the per-source registry boundary and keeps
Cloudflare `fetch` as the default. Browserless is now configurable through
`PULSE_BROWSERLESS_URL` / `PULSE_BROWSERLESS_TOKEN`, and GovDelivery inbound email is parsed into
Pulse snapshots via Cloudflare Email Routing. Both integrations remain default-off unless the
relevant Worker secret/routing is configured.

---

## 7. 分期路线（对齐 09 Demo Sprint Playbook）

| 阶段                      | 源                                                                   | 工程量   | 成功标准                               |
| ------------------------- | -------------------------------------------------------------------- | -------- | -------------------------------------- |
| **Phase 0 · Demo Sprint** | `irs.disaster` + `tx.cpa.rss` + seeded `ny.dtf.press` fixture        | 已完成   | S3 场景能真实触发 + mock 兜底齐全      |
| **Pilot hardening**       | `ca.ftb.*` + `ca.cdtfa.news` + real `ny.dtf.press` + FL/WA + FEMA T2 | 已落地   | Live catalog 可跑；FEMA review-only    |
| **Phase 1**               | GovDelivery inbound email signal + Browserless fallback              | 已落地   | 邮件并行监控；WAF 源优先走 browserless |
| **Phase 2**               | + `ma.dor.press` + 更多州 DOR                                        | 2 人周   | 15+ 源；10 源 ≥ 99% SLA                |
| **Phase 3（商单触发）**   | Checkpoint / Bloomberg Tax / Avalara 商业 API                        | 谈单驱动 | 客户合同签字后再采购                   |

---

## 8. Checklist：加一个新源要做的 8 件事

1. 确定 **Tier**（T1/T2/T3）与 `jurisdiction`
2. 查 **robots.txt** 与 **ToS**，确认自动化抓取合规
3. 写 **Source Adapter**（`packages/ingest/adapters/...`），实现 `fetch + parse`；T2/T3 或
   PDF/manual-check source 不得自动 Apply，若命中 due-date intent 则通过 `applyReadiness`
   gate，否则标记为 `review_only`
4. 写 **Selector Fallback Chain**（HTML 源必做）
5. 在 `SOURCE_FETCHER` 注册默认 fetcher（通常是 `cloudflare`）
6. 加 **queue / R2 binding**（`apps/server/wrangler.toml`）
7. 补 **e2e fixture**（把源的一份真实快照放到 `packages/ingest/fixtures/<source-id>/`）
8. 在 **§5.2 可观测指标** 中默认注册 4 个指标 + 告警规则

---

## 9. 风险登记（Known Risks）

| 风险                                            | 可能性 | 影响 | 缓解                                                                                  |
| ----------------------------------------------- | ------ | ---- | ------------------------------------------------------------------------------------- |
| 某州 DOR 整站改版导致 selector 全挂             | 中     | 中   | Selector Fallback Chain §6.2 + GovDelivery 并行信号 §5.3                              |
| Cloudflare egress IP 被某个州 WAF 整体挑战      | 低     | 高   | Browserless fetcher Phase 2 预留；先验证 Phase 0 两源无问题                           |
| 未复核 RSS / feed endpoint 假设导致漏抓         | 中     | 中   | 以官方 HTML canonical page 为默认路径；只有源健康测试连续通过后才启用 feed adapter    |
| FEMA API 字段变更（历史上 v1 → v2 改过一次）    | 低     | 中   | 锁版本 `v2`，单元测试守字段契约                                                       |
| AI SDK 对 source excerpt 做"礼貌性改写"导致失真 | 中     | 高   | 04 §6.2 的 Glass-Box Guard：AI SDK 输出的 excerpt 必须可定位回 `rawText`，否则 reject |
| 法务 Takedown                                   | 极低   | 高   | §5.1 `source_revoked` 流程；Evidence 快照保留                                         |

---

## 10. 交叉引用

- PRD §6.3.1 Ingest · §6.3.5 降级策略
- 04-AI-Architecture §6.1 Ingest · §6.2 Extract
- 06-Security-Compliance Evidence Mode / WISP
- 07-DevOps-Testing 可观测 / CI fixture
- 08-Project-Structure `packages/ingest/` 目录
- 09-Demo-Sprint-Module-Playbook S3 模块拆分
