# 13 · Marketing SEO / GEO Rebuild Plan

> 最后核对：2026-06-18
> 文档类型：Execution Plan（营销站 SEO/GEO 重构工作计划）
> 范围：`apps/marketing`（Astro 静态站，en + `/zh-CN` 镜像，Cloudflare Workers + Static Assets）
> 对齐：`docs/dev-file/12-Marketing-Architecture.md`（架构）、`docs/dev-file/11-Pulse-Ingest-Source-Catalog.md` §3（覆盖事实）
> 语言约定：正文中文，URL / 代码 / 命名 / 文件路径 / 关键词全部英文
> 性质：**realignment（对齐重构），不是 greenfield**。骨架保留，实质重写，过时项清除。

---

## 0. 一句话目标

把整站从"语气有差异但实质失真"重做成"实质准确、可被 AI 引用、且与产品现状 + 华人 CPA GTM 完全对齐"的 SEO/GEO 资产——**先修真相与可索引性，再做深度与实体权威**。

---

## 1. 不可违背的真相基线（执行前必读，避免重犯审计错误）

### 1.1 覆盖模型 = 三层，层层都真（来源：dev-file 11 §3）

| 层                        | 范围                                  | 含义                                                                                                                                  | 文案该怎么说                                                                          |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **L1 监控 / 规则目录**    | **FED + 50 州 + DC**                  | 每个 jurisdiction 都有官方 temporary/news source 进 web-first Alert-watch ingest（11 §3 L63-64）；rules registry 登记 50 州+DC（L54） | "Source monitoring across all 50 states + DC" — **这是真的，是 SEO 资产，要 lean in** |
| **L2 深度多机构 adapter** | **6 州：CA / NY / TX / FL / WA / MA** | 仅这 6 州要求 `multi_agency_sources` + `explicit_live_adapter`（11 §3 L71）                                                           | "Deep multi-agency live coverage" — pill 升级为 6 州（含 MA，已定 §7-4）              |
| **L3 规则成熟度**         | catalog 内 verified vs candidate      | candidate 需 practice review 才能变 reminder-ready                                                                                    | "Source-backed candidates require review"（`en.ts:876` 已正确）                       |

**另一条独立轴**：penalty-$ 公式精度 = FED + 5 州（CA/NY/FL/TX/WA），见 `packages/core/src/penalty/catalog.ts` `FORMULA_RULES`。**这才是唯一的"FED+5"，且 penalty-$ UI 已隐藏，与营销文案无关。**

> ⚠️ **审计修正**：2026-06-18 的 SEO 审计曾把"50 states + DC"误判为 bait-and-switch 过度声明、建议删除——**此结论作废**。"50 states + DC" 准确、可辩护、应保留并强化。真正的问题是 **5 / 15 / 50 三个数字在站内各说各话，没有串成一个分层故事**；其中 5 州 `statusPill` 是在**低估**自己。

### 1.2 诚实约束（所有文案硬规则，违反即 CI 红）

- ✅ 可说："monitoring across 50 states + DC"、"deep multi-agency in CA/NY/TX/FL/WA/MA"、"source-backed candidates require review"。
- ❌ 不可说：penalty-$ 金额 / "dollars at risk"（commit `ea886787` 已隐藏）；未发布能力——QBO/TaxDome/Drake/Zapier **集成**、桌面/menu-bar app、mobile push、public API、对话式 "ask AI"。
- ❌ 不可把 candidate 规则说成 "verified / reminder-ready across all 50 states"。
- ✅ AI 表述只限：evidence-backed insight cards + AI-assisted import + source-change monitoring。

---

## 2. 定位与信息架构（所有 title/description/llms.txt 的源头）

### 2.1 实体定义（一句话，用于 llms.txt + Org JSON-LD + About）

> DueDateHQ is a glass-box deadline-intelligence workbench for small US CPA practices. It turns every client × state × entity × tax-type into a weekly deadline-risk triage list, and monitors official IRS and state sources across all 50 states + DC for rule changes — every deadline, rule, and alert traceable to an official source. It is not tax advice, not a filing system, and not a full practice-management suite.

### 2.2 五大 pillar

1. **Multi-state deadline triage** — 周一 5 分钟的 client × state × entity × tax-type 风险清单。
2. **Source-backed rule-change monitoring** — 每条 alert 带 `source_url` + `source_excerpt`；监控覆盖 50 州+DC，深度 adapter 在 6 州。
3. **Glass-box / evidence-first AI** — 无引用不渲染；每个数字都给源。
4. **30-minute migration** — 粘贴 TaxDome/Drake/File-In-Time 导出，AI 字段映射 + confidence 分级 + 24h 可回滚。
5. **Audit-ready & isolated** — 可导出审计轨迹、per-firm 隔离、human-in-the-loop 的 candidate→verified governance。

定位口径："**叠加在你现有 Drake/UltraTax/TaxDome 之上的 deadline + rule-change 雷达层**"——add-on，不是 replacement（"替代电子表格"只对 Excel+Outlook 这个对手说）。Risk-first、source-first，**不是 dollars-first**。

**ICP（2026-06-18 修正）**：**北美（US）中小型 CPA / accounting 事务所，面向全体，不特定族裔**。产品双语（en/zh-CN）是**可达性特性**，不是 targeting 维度——**English 为主要市场**，zh-CN 为忠实的次要 locale。**不**围绕华人做单独 beachhead / 落地页 / 关键词获客。

### 2.3 关键词 / AI-prompt 意图图（只在有真实事实时建页）

| 意图类型                     | EN 目标查询                                                                                                                  | 中文目标查询                                                            | 落地页                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| 事实型截止日（GEO 价值最高） | "Form 7004 extension deadline", "Form 1120-S due date 2026", "partnership 1065 due date", "[state] tax filing deadline 2026" | "Form 7004 延期截止日", "S corp 申报截止日", "加州 FTB 申报截止日 2026" | `rules/[rule]`, `states/[state]`（带日期表） |
| 产品 / 品类                  | "CPA deadline tracking software", "multi-state filing deadline tracker"                                                      | "CPA 截止日管理软件", "美国 CPA 多州申报截止日"                         | `index`, `guides`                            |
| 对比                         | "File In Time alternative", "TaxDome deadline tracking", "Karbon vs …", "spreadsheet vs deadline software"                   | "TaxDome 替代", "File In Time 替代"                                     | `compare/[comparison]`                       |
| 信任 / LLM "what is"         | "what is DueDateHQ", "is DueDateHQ tax advice", "how much is DueDateHQ"                                                      | "DueDateHQ 是什么", "DueDateHQ 多少钱"                                  | About, pricing, llms.txt                     |
| 监控（新增）                 | "tax rule-change monitoring for CPA firms", "IRS state filing change alerts"                                                 | "CPA 税务规则变更提醒", "美国 各州申报变更 监控"                        | 新增多州页, alerts 叙事                      |

> 中文列 = zh-CN locale 的通用查询（服务中文使用者），**不是**华人专属获客；English 列是主要市场。

### 2.4 路由处置表

| 路由                                                       | 处置                          | 要点                                                                                                                                           |
| ---------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.astro`（+ Hero/Problem/Proof/SlaStrip）             | **改写文案**                  | 修 `48` 占位数；加 add-on-layer 框架；把 statusPill 升级成分层口径；开头放 1-2 句 "what is DueDateHQ" 定义句                                   |
| `pricing.astro` / `Pricing.astro`                          | **保留+补充**                 | 价格准确（Solo $39 / Pro $79 / Team $149 / Ent from $399）；加一句 entitlement（1 active practice on Solo/Pro/Team；多 practice = Enterprise） |
| `state-coverage.astro` / `StateCoveragePage.astro`         | **改写为分层表**              | 渲染 **deep-6 vs monitored-50+DC** 的 tier 表——让"分层"本身成为可引用事实                                                                      |
| `states/[state].astro`（15 页）                            | **加事实 + tier badge**       | 保留 15 页；badge 按 `coverageTier` 区分；每页加 ≥1-2 条**带日期、带官方源**的州截止日                                                         |
| `guides/[guide].astro`（7 篇）                             | **保留+修 bug+加事实**        | 修 `指南` eyebrow；每篇加 ≥1 条带源事实                                                                                                        |
| `compare/[comparison].astro`（3）                          | **保留+轻补**                 | 加小的能力对比表 + add-on-not-replacement 一句                                                                                                 |
| `rules/[rule].astro`（3）                                  | **改写正文**                  | 加 statutory due date + IRS 引用（7004/1120-S/1065）——**头号 GEO 机会**                                                                        |
| `[trustPage].astro`（about/security/privacy/terms/status） | **保留+修 status+加 E-E-A-T** | status 措辞改非断言；About 加 org-expertise 声明                                                                                               |
| **新增** `guides/multi-state-filing-deadlines`             | **新建（English-first）**     | 多州申报截止日总览页（CA FTB / NY PTET 等高频州），English 为主、zh-CN 镜像                                                                    |
| **新增** `llms-full.txt.ts`                                | **新建（低优先）**            | guides/rules/state 事实的拼接 markdown，供 agent 单次抓取                                                                                      |

每个公开路由保留 `/zh-CN/...` 镜像 + self-referencing hreflang（`BaseLayout.astro:53-55` 已正确）。**定位 = 北美 CPA 事务所，English primary**；zh-CN = **Full secondary locale**（已定，§7-1）——拿完整投入：通用中文关键词 + zh 专属 OG + zh 内容深度，服务中文搜索者/使用者；但**不**做华人族裔定向获客。

---

## 3. 分阶段工作计划（含文件、任务、DoD）

### Phase 0 — 真相与安全止血（最高优先，纯文案/枚举层，风险最低）

**DoD：不再有任何错语言串、占位数、自相矛盾的覆盖表述；站点可索引；新增 lint 守住回归。**

- [ ] **统一分层覆盖口径**（不是删 50 州，是串成分层故事）
  - `apps/marketing/src/i18n/en.ts`：`:22` statusPill 升级（主："Source monitoring across 50 states + DC"，副："deep multi-agency in CA·NY·TX·FL·WA·MA" — **6 州含 MA，已定 §7-4**）；`:232,234,800,876,1400` 校准为 L1/L2/L3 分层表述（`:800/:876` 已基本正确，保留并轻强化）。
  - `apps/marketing/src/i18n/zh-CN.ts`：`:221,488,1367` 同步分层口径。
- [ ] **`48+` sources 占位数** → **真实 distinct-source-URL 数，build-time 从 source registry 派生（不 hardcode）**，措辞 "N official IRS & state sources across 50 states + DC"，stat **链到 `state-coverage` 页**，正文并列一句 "479 source-backed rules"：`en.ts:502/504`、`zh-CN.ts:486/488`，EN/zh 一致（§7-5）。实现时先确认 registry 里 distinct source-URL 的真实计数口径（verified-only vs all、是否含 hidden_policy_watch）。
- [ ] **英文 guide 的中文 eyebrow**：`seo-content.ts:699` `'指南'` → `'GUIDE'`。
- [ ] **州页 status 改真实枚举**：`seo-content.ts:448,458` 的 `status:'Live'` → `coverageTier: 'deep' | 'monitored'`（deep = CA/NY/TX/FL/WA/MA）；badge 渲染 "Deep multi-agency" vs "Official-source monitoring"。
- [ ] **status 页措辞**：`trust-pages.ts:291` + `en.ts/zh-CN.ts` footer `status` → 非断言（"For live status and incidents, contact support"）或接真实信号。
- [ ] **翻译 zh audience 行**：`zh-CN.ts:12` `'For US CPA practices'`、`:1367` 同。
- [ ] **新增 CI lint**（见 §5）：英文串不含中文字符；州 badge 必须由 `coverageTier` 推导；over-claim 禁词。
- [ ] **（off-repo，并行）建实体资料页**：LinkedIn / Crunchbase / G2 / Capterra company 页，NAP（name "DueDateHQ" / url `https://duedatehq.com` / logo）与站点严格一致 → 产出真实 URL，供 Phase 1 的 Org JSON-LD `sameAs[]`（§7-3，实体权威最高杠杆低成本动作之一）。

### Phase 1 — 技术地基

**DoD：per-page 新鲜度真实；JSON-LD 是一张连通的 entity graph；host 规范化；社交/图标完整。**

- [ ] **per-slug 日期 map**：`content-metadata.ts` 把单一 `CONTENT_REVIEWED_ON` 拆成 `{ slug: { publishedOn, reviewedOn } }`；
  - 喂 `structured-data.ts:73,163,164` 的 `datePublished`/`dateModified`；
  - 喂 `astro.config.mjs` sitemap `serialize(item)` 的 `lastmod`；
  - 原则：`reviewedOn` 只在内容真改时推进（禁止全局 bump）。
- [ ] **sitemap i18n alternates**：`astro.config.mjs` sitemap 加 `i18n: { defaultLocale:'en', locales:{ en:'en','zh-CN':'zh-CN' } }`，输出 `xhtml:link` alternates。
- [ ] **JSON-LD 重构成单 `@graph`**：`structured-data.ts` 节点用 `@id` 互引（`WebPage isPartOf WebSite`；`Article/SoftwareApplication publisher → Organization @id`）。
  - Organization（`:29-34`）：加 `sameAs[]`（用 Phase 0 off-repo 产出的真实 LinkedIn/Crunchbase/G2/Capterra URL，§7-3）、raster PNG logo ≥112px（替 `favicon.svg`）、`foundingDate`、`contactPoint`、`areaServed:'US'`。
  - SoftwareApplication（`:45-56`）：加 `offers`（镜像定价）；**无真实评价前不要 `aggregateRating`**。
  - BreadcrumbList（`:77-88`，`:186,201-203,219-220,238,256`）：parent 标签按 locale 取（现在 zh 页硬编码英文 "Home/Pricing/…"）。
  - WebSite `SearchAction`：**无站内搜索就省略**。
- [ ] **BaseLayout head**：`BaseLayout.astro` 加 `ogType` prop（guides/rules/compare → `article`）、`og:image:alt`、`twitter:site/creator`（有 handle 再加）、`apple-touch-icon.png` + `site.webmanifest`。
- [ ] **host 规范化（2026-07-15 修正）**：**不要用 `public/_redirects` 做 host 级跳转** —— Cloudflare **Workers Static Assets** 的 `_redirects` 只接受相对 URL，`https://www.…/*` 规则会被拒（`code 100324`）并让 `wrangler deploy` 挂（`ci` build 不校验、只有 deploy 才暴露）。www→apex + http→https 使用 **Cloudflare zone Redirect Rule + "Always Use HTTPS"**；仓库内 `_redirects` 只用于把历史 `/*.html` 以 `301` 规范化到无扩展名 canonical。`site.ts` canonical 与 sitemap 已锚 apex。
- [ ] **asset 缓存**：`public/_headers` 给 hashed `_astro/*` 加 long-cache immutable。
- [ ] **robots.txt**：`robots.txt.ts` 保持全 allow（含 GPTBot/ClaudeBot 训练抓取，pre-launch 有意决策 §7-2），加注释记录该决策；launch 后再评估是否收紧训练 bot。

### Phase 2 — 定位与核心页

**DoD：hero/problem/pricing/state-coverage/About 全部体现分层真相 + add-on 框架 + 五 pillar；OG 图分类型分语种真实。**

- [ ] 改写 `index` 组件（`Hero/Problem/Proof/SlaStrip/FinalCta`）落地 §2.1-2.2。
- [ ] `state-coverage.astro` / `StateCoveragePage.astro`：渲染 **deep-6 vs monitored-50+DC** 对比表。
- [ ] About（`[trustPage].astro` / `trust-pages.ts`）：加 org-expertise / E-E-A-T 声明（"rules reviewed by the DueDateHQ rules team; sourced from IRS Pub 509 / state DOR; candidates require practice review"）。
- [ ] **OG 图**：build-time 按 page-type × locale 生成（satori / `astro-og-canvas`），替掉现在字节相同的 `public/og/home.en.png` / `home.zh-CN.png`；zh 卡做成真中文。

### Phase 3 — GEO + programmatic 深度

**DoD：form/state 页带日期带源；llms.txt 准确且双语；beachhead 页上线。**

- [ ] **`rules/[rule]` 加 dated sourced 表**：7004/1120-S/1065 的 statutory due date + IRS 引用（FED-24 已 verified），保留 not-tax-advice 免责。**头号 GEO 机会。**
- [ ] **`states/[state]` 加 `keyDeadlines[]`**：`{ form, dueDate, sourceLabel, sourceHref }`，复用 `stateOfficialSources`；每州 ≥1-2 条真实带源；修 zh 字段里夹英文（"replacement tax" 等加中文 gloss）。
- [ ] **llms.txt**（`llms.txt.ts`，保持轻量、勿过度投入）：加 `Last updated`；补空的 Homepage/Pricing `description`；加 scope 行（"Monitoring: 50 states + DC; deep adapters: FED + CA/NY/TX/FL/WA/MA"）；加定价行；**加 zh-CN URL 段**；保留 "describe as software, not tax advisor" 引导。
- [ ] **`llms-full.txt.ts`**（可选）：拼接 guide/rule/state 事实。
- [ ] **新增多州截止日总览页** `guides/multi-state-filing-deadlines`（English-first，zh-CN 镜像；可衍生双语 cheat-sheet PDF 作 top-of-funnel hook）。
- [ ] **zh-CN = Full secondary locale**（§7-1 已定）：通用中文关键词（`美国 CPA 多州申报截止日`、`CPA 截止日管理软件`、`各州申报变更 监控`）+ zh 专属 OG + zh 内容深度；中文是通用 locale，**不**用"华人/华人事务所"族裔措辞。

### Phase 4 — 度量与护栏

**DoD：GSC + AI 引用基线建立；thin-content/over-claim 护栏进 CI。**

- [ ] GSC：监 §2.3 意图词的 impressions/clicks/position；查 en+zh 全 URL 索引覆盖；验 hreflang cluster 无错。
- [ ] **AI 引用追踪**：定期用 §2.3 prompt 问 ChatGPT/Claude/Perplexity/Google AI Overviews，记录是否点名 DueDateHQ、引用的事实是不是我们的（含中文版）。
- [ ] 实体解析：Google 是否出 Knowledge Panel / LLM 是否自信点名品牌（`sameAs` 是否生效的代理指标）。
- [ ] 注意：marketing→signup 漏斗**当前未接埋点**，别假设有归因。

---

## 4. 执行顺序与依赖

```
Phase 0 (止血, 1-2 天) ──┐
                          ├─ 可独立并行: OG 图生成、_redirects、apple-touch-icon
Phase 1 (技术地基) ───────┤   (无内容依赖)
                          │
Phase 2 (核心页) ─── 依赖 Phase 0 的分层口径定稿
                          │
Phase 3 (GEO 深度) ── 依赖 Phase 1 的 per-slug 日期 map + Phase 0 的 coverageTier
                          │
Phase 4 (度量) ────── 持续, Phase 2 上线后开始建基线
```

关键路径：**Phase 0 分层口径定稿 → 其余全部对齐它**。`en.ts:22` statusPill 升级后的措辞是 truth anchor，其它文案向它看齐。

---

## 5. 护栏（CI / process，防回归）

- [ ] **over-claim lint**：禁词命中即 build fail——penalty-$ / "dollars at risk" 模式；集成名（QBO/TaxDome/Drake/Zapier 作为 _feature_）；"menu-bar"/"mobile push"/"public API"/"chat with"；以及"verified across all 50 states"这类把 candidate 说成 verified 的句式。
- [ ] **language lint**：EN 串必须 ASCII-clean 无中文字符（防 `指南` 类）；zh `audience` 必须已翻译。
- [ ] **thin-content gate**：新 `states/[state]` 页必须含 ≥1 条真实、带日期、带源的事实才允许加；**禁止 name-swap 批量扩页**（16→51 州扩量须每州有真实数据）。
- [ ] **freshness honesty**：`reviewedOn` 只能在该页内容真改时推进。

---

## 6. 关键文件速查（按职责）

| 职责           | 文件                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文案 / 声明    | `src/i18n/en.ts`, `src/i18n/zh-CN.ts`, `src/lib/seo-content.ts`, `src/lib/trust-pages.ts`                                                               |
| 新鲜度         | `src/lib/content-metadata.ts`                                                                                                                           |
| 结构化数据     | `src/lib/structured-data.ts`, `src/components/StructuredData.astro`                                                                                     |
| head / OG      | `src/layouts/BaseLayout.astro`                                                                                                                          |
| sitemap / host | `astro.config.mjs`, `public/_headers`, `public/_redirects`（后者只做相对 path 的 `.html` → canonical `301`；host 跳转走 Cloudflare zone Redirect Rule） |
| GEO 入口       | `src/pages/llms.txt.ts`, `src/pages/robots.txt.ts`, 新增 `src/pages/llms-full.txt.ts`                                                                   |
| 资产           | `public/og/*`, `public/`（PNG favicon / manifest）                                                                                                      |

> Truth anchor：`en.ts:22` statusPill 升级后的分层口径——全站向它看齐。覆盖事实以 `dev-file/11 §3` 为准。

---

## 7. 待你拍板的决策项

1. ~~**zh-CN 投入程度**~~ → **已定（2026-06-18）：Full secondary locale**。保留全部 `/zh-CN` 镜像 + hreflang + zh 专属 OG 图 + **通用**中文关键词 + zh 内容深度，给中文使用者完整体验。约束：中文是**通用 locale**（服务中文搜索者/使用者），**不是华人定向**——不出现"华人/华人事务所"这类族裔获客措辞。
2. ~~**robots AI 爬虫策略**~~ → **已定：pre-launch 保持全 allow**（含 GPTBot/ClaudeBot 训练抓取），求最大可见性。`robots.txt.ts` 无需改动；加注释说明这是有意决策，launch 后再评估是否收紧训练 bot。
3. ~~**`sameAs` 实体锚点**~~ → **已定：做**。先（off-repo）建 LinkedIn / Crunchbase / G2 / Capterra company 资料（NAP 与站点一致），再把真实 URL 填进 Org JSON-LD `sameAs[]`。见 Phase 0 并行任务。
4. ~~**MA 进 statusPill 深度集**~~ → **已定：进**。深度集 = **6 州 CA/NY/TX/FL/WA/MA**；statusPill 副行列全 6 州。
5. ~~**`48` 换成哪个指标**~~ → **已定：真实 distinct-source-URL 数（build-time 从 source registry 派生，不 hardcode）**，措辞如 "N official IRS & state sources across 50 states + DC"，并**链到 `state-coverage` 页**做可验证锚点；正文可并列一句 "479 source-backed rules"（目录深度）。EN/zh 一致。
