# DueDateHQ 技术文档 · 00 项目总览

> 最后核对：2026-06-10

> 文档类型：Technical Design Document Index
> 版本：v2.0（Cloudflare 全栈口径）
> 对齐 PRD：`docs/PRD/DueDateHQ-PRD-v2.0-Part1A.md`（§0–§6）+ `Part1B`（§6A–§6D）+ `Part2A`（§7–§8）+ `Part2B`（§9–§19）（原 Unified Part 1/2 已拆为 4 册）
> 对齐设计：`docs/Design/DueDateHQ-DESIGN.md`
> 目标：把 PRD 的"产品承诺"转译为"可实现、可运维、可演进"的技术方案
> 语言约定：正文中文，代码 / 命名 / 注释全部英文

---

## 1. 文档一览

| #   | 文档                                                                              | 解决的问题                                                                                        | 读者                |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------- |
| 00  | **Overview**（本文件）                                                            | 文档地图 + 阅读顺序 + 核心技术判断                                                                | 所有人              |
| 01  | [Tech Stack](./01-Tech-Stack.md)                                                  | 技术栈选型 + 版本策略 + 环境变量                                                                  | Eng                 |
| 02  | [System Architecture](./02-System-Architecture.md)                                | 分层 · 模块边界 · 请求流 · 外部依赖                                                               | Eng / PM            |
| 03  | [Data Model](./03-Data-Model.md)                                                  | D1 Schema · 索引 · 租户隔离 · 迁移                                                                | Eng                 |
| 04  | [AI Architecture](./04-AI-Architecture.md)                                        | Glass-Box · RAG · Pulse · Prompt 管理                                                             | Eng / AI            |
| 05  | [Frontend Architecture](./05-Frontend-Architecture.md)                            | Vite+ · React Router 7 · UI 系统                                                                  | Frontend            |
| 06  | [Security & Compliance](./06-Security-Compliance.md)                              | Auth · RBAC · PII · 审计 · WISP                                                                   | Eng / Compliance    |
| 07  | [DevOps & Testing](./07-DevOps-Testing.md)                                        | 部署 · CI/CD · 可观测 · 测试                                                                      | Eng / SRE           |
| 08  | [Project Structure](./08-Project-Structure.md)                                    | 代码目录 · 模块划分 · 命名约定                                                                    | Eng                 |
| 09  | [Demo Sprint Module Playbook](./09-Demo-Sprint-Module-Playbook.md)                | 2 人 Demo-Ready 模块拆分与协作边界手册                                                            | Team                |
| 10  | [Demo Sprint 7-Day Rhythm](./10-Demo-Sprint-7Day-Rhythm.md)                       | 2 人 7 天 × 4-6h/天 的 Demo 节奏与每日分工                                                        | Team                |
| 11  | [Pulse Ingest Source Catalog](./11-Pulse-Ingest-Source-Catalog.md)                | Pulse 权威源清单 · 反爬策略 · SLA 风险 · Adapter 契约                                             | Eng / Ops           |
| 12  | [Marketing Architecture](./12-Marketing-Architecture.md)                          | Astro 公开站 · Landing PRD · SEO · i18n 共享 contract · 部署边界                                  | PM / Design / Eng   |
| 📐  | [Design System](../Design/DueDateHQ-DESIGN.md)                                    | 视觉 token · 组件规格（Ramp × Linear · Light Workbench）                                          | Designer / Frontend |
| 📐  | [Migration Copilot Product Design](../product-design/migration-copilot/README.md) | 本册入口：Demo Sprint 口径下 Migration Copilot 产品 UX / Prompt / Matrix / Fixture / 设计系统增量 | PM / Design / Eng   |

---

## 2. 核心技术判断（一图读懂）

```
┌────────────────────────────────────────────────────────────────────────┐
│              DueDateHQ · Marketing + SaaS on Cloudflare                │
│                                                                        │
│   Visitor ──► https://due.langgenius.app                                    │
│                 │                                                      │
│                 ▼                                                      │
│          apps/marketing · Astro static site                            │
│          Landing / SEO / OG / future content pages                     │
│                 │ CTA                                                  │
│                 ▼                                                      │
│   User ─────► https://app.due.langgenius.app                                │
│                         │                                              │
│                         ▼                                              │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │                Cloudflare Worker (one binary)                │    │
│   │                                                              │    │
│   │   app 子域其他路径 ─► ASSETS.fetch() → SPA dist (SPA fallback)│    │
│   │   /rpc/*       ──► Hono ──► RPCHandler ──► procedures/*      │    │
│   │                     （oRPC 专有协议；内部前端独占）           │    │
│   │   /api/auth/*  ──► better-auth (Organization + Stripe)       │    │
│   │   /api/webhook/* ──► narrow endpoints (Resend)               │    │
│   │   /api/health  ──► liveness probe                            │    │
│   │   /api/v1/*（Phase 2）──► OpenAPIHandler（公网 REST，复用契约）│    │
│   │                                                              │    │
│   └─────┬──────────────┬────────────┬───────────┬────────────────┘    │
│         │              │            │           │                     │
│         ▼              ▼            ▼           ▼                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│   │   D1     │  │Vectorize │  │    R2    │  │ Queues + │              │
│   │ (SQLite) │  │ (RAG)    │  │ (files)  │  │  Cron    │              │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                        │
│   KV: session hot data · rate-limit counters · AI day budgets          │
│   External: Resend (email) · AI SDK via Cloudflare AI Gateway          │
└────────────────────────────────────────────────────────────────────────┘
```

- **两个部署单元，一个产品入口**：`apps/marketing` 部署到 `due.langgenius.app`；`apps/server` + `apps/app` 部署到 `app.due.langgenius.app`
- **前后端物理隔离 / 逻辑共契约**：`apps/app`（Vite SPA）静态化产物被 SaaS Worker 的 Assets binding 托管；`packages/contracts` 是 app/server 共享的 oRPC 契约
- **公开站不复用内部 RPC**：marketing 首版只输出静态 HTML；后续公开规则页通过静态 snapshot 或 `/api/v1/*` 读 verified 规则，不调用内部 `/rpc`
- **路由分层遵循 oRPC 官方惯例**：`/rpc/`_ 走 RPC Protocol（内部前端），`/api/`_ 走 REST（auth / webhook / 未来公网 OpenAPI）；两者可共用同一份契约
- **租户隔离通过 better-auth Organization + 仓库工厂（`scoped(db, firmId)`）双锁**，不依赖 DB 级 RLS（D1 无 RLS）
- **后台任务不依赖第三方**：Cron Triggers + Queues + Workflows 原生足矣

---

## 3. 三条"技术铁律"（必须在代码里体现）

呼应 PRD §0.3 的产品 SLA：

1. **30 秒看清风险**

- Dashboard 首屏 Edge 冷响应 ≤ 200ms；SPA 回访热加载（chunk hash 长缓存 + TanStack Query 内存缓存）≤ 50ms
- Deadline Radar 顶栏**必须服务端预聚合**，前端不在 render 阶段做累加
- 1000 obligations × 200 clients 规模下筛选 P95 < 1s（复合索引 + 服务端 pagination）

2. **30 分钟完成导入**

- Migration 先逐行校验 / normalize；失败行落 `migration_error`，只把有效行放入最终 `d1.batch()` 原子提交
- AI Field Mapper / Normalizer 输出经 Zod + 正则双校验，禁止幻觉字段
- Live Genesis 动画由前端驱动，不等后端推送

3. **24 小时 Pulse 闭环**（PRD §0.3 · §6.3）

- Ingest 由 Cron Triggers 驱动，AI SDK 抽取交给 Queues 消费者
- Batch Apply 与 Email Outbox **共用同一 D1 事务**（Transactional Outbox）
- Pulse 产生的调整落 `ExceptionRule` overlay，**不改 base rule**（Phase 0 的 Demo Sprint 简化为直接 UPDATE + evidence_link；Phase 0 完整 MVP 和 Phase 1 使用 Overlay Engine）

---

## 4. 工程优先级（与 PRD Phase 对齐）

| Phase                                  | PRD 范围                                                                                                                                                  | 技术里程碑                                                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 0 · MVP · ~4 周**（PRD §14.1） | P0-1 ~ P0-24 全部；P1 的 Pulse / Ask / Client PDF / ICS（P1-36 的 PWA 壳已从 Phase 0 移除，见 §7）；公开首页从 SaaS app 中拆出                            | 核心闭环 + `FED + 50 states + DC` source-backed rules/source coverage；candidate 仍需 practice review 后才可成为 reminder-ready active rule；SaaS Worker + Astro marketing 双部署单元 |
| — **内嵌 · Demo Sprint**（§09）        | Phase 0 的 Demo-Ready 最小子集                                                                                                                            | 简化为 3 辖区 seed（Federal + CA + NY）+ 单 Owner + Pulse 直接 UPDATE（替代 Overlay）+ WISP 1-page draft；目的是集训路演，不等价 Phase 0 完整交付                                     |
| **Phase 1 · 5–12 周**（PRD §14.2）     | P1-1 ~ P1-37：Rules-as-Asset 治理强化 · 全辖区 active sign-off 流程 · Team RBAC 完整 · Stripe · Zapier · Readiness Portal · Onboarding Agent · SEO 公开页 | Overlay Engine 启用 · RBAC 强制校验开启 · **SEO 公开页（`/rules` `/watch` `/state/*` `/pulse`）继续由 `apps/marketing` 承载**（SaaS Worker 保持 SPA）                                 |
| **Phase 2 · Q3 2026**（PRD §14.3）     | macOS Menu Bar Widget · Audit-Ready Evidence Package · QBO/TaxDome/Drake 集成 · 电子签名 · SOC 2 预审                                                     | Tauri 壳 · RFC 3161 TSA · 第三方集成 API                                                                                                                                              |
| **Phase 3 · Q4 2026+**（PRD §14.4）    | Compliance Calendar API（给 TaxDome / Karbon 做 intelligence 层）                                                                                         | 开放 `/api/v1/*` OpenAPIHandler 路由（复用同一份 `packages/contracts` 契约）                                                                                                          |

Schema、索引、目录结构**一次性覆盖到 Phase 1**：Firm / User / Membership 三表在 Phase 0 已通过 better-auth Organization 就位；ExceptionRule 表结构在 Phase 0 末设计到位，Phase 1 启用 Overlay Engine 时零 schema 重构。P0 的安全含义是 tenant isolation、Owner-only 写路径、审计与 AI 日志；完整四角色权限矩阵属 P1，MFA 作为用户可选账户安全项。

2026-06 现状补记（相对上表 Phase 口径已上线的增量界面）：

- Deadlines 主从详情页：`/deadlines/:obligationRef[/:detailTab]`，列表收为左侧 rail，详情同屏切换
- Reminder 模板库 + 编辑器：`/settings/reminders/templates` 与 `/settings/reminders/templates/edit`
- Notification preferences 页：`/notifications/preferences`，集中管理通知偏好

---

## 5. 阅读顺序建议

- **后端 Eng**：01 → 08 → 02 → 03 → 06 → 04 → 07
- **前端 Eng**：01 → 08 → 05 → 12 → Design → 07
- **PM / TL**：00 → 02 → 04 → 06
- **SRE / DevOps**：01 → 02 → 07 → 06

---

## 6. 修改约定

- 所有架构变更必须先改本文档组再改代码
- PRD 与 Dev File 出现歧义时：**产品语义以 PRD 为准，工程实现以 Dev File 为准**
- UI / 视觉相关歧义时：`**docs/Design/DueDateHQ-DESIGN.md` 为准\*\*
- 任何新增第三方依赖必须更新 `01-Tech-Stack.md` 的版本表
- Schema 改动必须同步 `03-Data-Model.md` 并附 Drizzle 迁移文件名
- 契约（`packages/contracts/src/`\*）变更必须在 PR 标题加 `[contract]` 标签，前后端需同步 review

---

## 7. 被否决的技术选择

| 否决的选择                      | 理由                                                                                                                                                                                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ❌ Next.js / Vercel             | 登录后 SaaS app 不需要 SSR-first 框架；公开 SEO 由 `apps/marketing` Astro 处理，避免把 app 迁到 React Router SSR 或 Next.js                                                                                                                                                                         |
| ❌ Prisma                       | D1 需要裸 SQL 计算派生字段（Overlay Engine）；Drizzle 类型推导强 + Edge 兼容                                                                                                                                                                                                                        |
| ❌ Neon / Postgres / Hyperdrive | DueDateHQ workload 的主路径是**小租户点查询 + 边缘延迟敏感**，D1 是正确选择不是权宜之计；Vectorize 覆盖 pgvector 主用途，FTS5 覆盖全文检索。`scoped(db, firmId)` 是应用层隔离，不等价于 DB RLS；若出现单库接近 10GB、跨租户 OLAP 或强物理隔离要求，先按 firm/region 拆 D1，再评估 Hyperdrive + Neon |
| ❌ Inngest / Trigger.dev        | Cron Triggers + Queues + Workflows 三原语已覆盖需求，零外部依赖                                                                                                                                                                                                                                     |
| ❌ Auth.js                      | 需要 Organization / Membership / Invitation 开箱即用，better-auth 原生支持，数据自持                                                                                                                                                                                                                |
| ❌ LiteLLM 自托管               | Vercel AI SDK Core + Cloudflare AI Gateway 已覆盖 provider abstraction、structured output、streaming、cache、retry、rate limit；自托管 LiteLLM 会增加运维面                                                                                                                                         |
| ❌ Pinecone / Weaviate          | Vectorize 与 Worker 同域，MVP 数据量完全够用                                                                                                                                                                                                                                                        |
| ❌ 独立 Redis（Upstash）        | KV + Rate Limit binding 够用；真实需要 strong consistency 时用 Durable Objects                                                                                                                                                                                                                      |
| ❌ GraphQL / REST 代码生成      | oRPC 契约模式 TS 端端强类型，零样板                                                                                                                                                                                                                                                                 |
| ❌ Electron / Native App        | Tauri menu bar widget（Phase 2）+ SPA 覆盖 95% 场景；PWA / Web Push 已从 Phase 0 移除（见本表下一行）                                                                                                                                                                                               |
| ❌ 微服务                       | 2 人团队；单 Worker + 模块化 monorepo 足够                                                                                                                                                                                                                                                          |
| ❌ Radix UI（shadcn 默认）      | Base UI 是 Radix 团队后续项目，体积更小 + Keyboard/RTL 更严格；`components.json` 设 `"style": "base-vega"`                                                                                                                                                                                          |
| ❌ `.npmrc` 作配置源            | pnpm 11 只从 `.npmrc` 读取 auth / registry 类配置；workspace 设置、catalog 和 build approval 统一放 `pnpm-workspace.yaml`                                                                                                                                                                           |

---

## 8. 关键性能 / 成本目标

### 8.1 工程 SLO

| 指标                                                | 目标                    | 约束来源                               |
| --------------------------------------------------- | ----------------------- | -------------------------------------- |
| Dashboard 首屏（SPA 回访热启动 · chunk cache 命中） | ≤ 300ms                 | PRD §5.1 · Story S1-AC1                |
| Dashboard 首屏（冷启动 · SPA bundle）               | ≤ 1.5s                  | 同上                                   |
| Obligations 筛选响应 P95                            | < 1s @ 1000 obligations | PRD §5.2.3 · S1-AC3                    |
| Pulse 抓取 → Dashboard Banner                       | ≤ 24h                   | PRD §6.3 · S3-AC1                      |
| AI Q&A 响应 P95                                     | < 3s                    | PRD §6.6                               |
| Worker CPU / 单请求                                 | ≤ 30s（付费 5min 上限） | Cloudflare 平台约束                    |
| D1 查询 P95                                         | < 50ms（单 statement）  | Cloudflare + 索引                      |
| D1 单库体量上限                                     | 10 GB                   | Cloudflare 平台约束；MVP 预期 < 500 MB |

### 8.2 产品 KPI（对齐 PRD §12.2，工程必须埋点）

| 指标                                 | 目标                 | 埋点                                   |
| ------------------------------------ | -------------------- | -------------------------------------- |
| Migration Time-to-First-Value P50    | ≤ 10 min             | signup → 首次看到 Deadline Radar `$`   |
| **Migration P95 完成时间（S2-AC5）** | ≤ 30 min             | Signup → Import 完成（30 客户基准）    |
| Migration Completion Rate            | ≥ 70%                | Step 1 → Step 4                        |
| Migration Mapping Confidence         | ≥ 85%                | AI Mapper 平均 confidence              |
| Setup 耗时 P50                       | ≤ 15 min             | signup → first calendar generated      |
| Week-1 回访                          | ≥ 2 次 / 用户        | unique login days                      |
| Week-2 回访                          | 10 人中 ≥ 5 人       | 第 8–14 天 ≥ 1 次                      |
| **分诊 session 耗时 P50（S1-AC5）**  | ≤ 5 min（第 2+ 次）  | session 时长                           |
| Evidence 点击率                      | ≥ 30% 周活           | `E` 键 / chip 点击                     |
| Pulse Review 耗时                    | ≤ 3 min              | alert 打开 → apply                     |
| Pulse Apply 次数                     | ≥ 2 / firm           | 真实 Apply                             |
| 付费意愿点击率                       | ≥ 30%                | `$49` 按钮                             |
| 日历编辑率                           | < 20%                | 用户 override 系统日期                 |
| AI 平均成本                          | < $0.02 / firm / day | Cloudflare AI Gateway + internal trace |

### 8.3 Go / Gray / Rethink（PRD §12.4）

- **Go**：Week-2 回访 ≥ 5 ∧ ≥ 3 位愿付费 ∧ ≥ 5 位觉 AI 有用 ∧ 编辑率 < 30% ∧ Pulse Apply ≥ 2 ∧ Migration 激活率 ≥ 7/10
- **Gray**：回访 5–7 ∧ 付费 < 3 → 重新审视 ICP / 定价
- **Rethink**：回访 < 4 ∨ > 50% 觉不如 Excel ∨ 编辑率 > 40% ∨ Migration 激活率 < 5/10

---

## 9. 术语简表（工程版）

- **tenant key**：`firmId` = better-auth `activeOrganizationId` = `firm_profile.id`（PK 复用，三个 id 永远同值；ADR 0010）
- **firm_profile**：业务租户表（`packages/db/src/schema/firm.ts`），承载 `plan / seatLimit / timezone / ownerUserId / status`；与 `organization` 分层（身份层 vs 业务层），不再把业务字段塞 `organization.metadata`
- **tenantContext**：`apps/server/src/middleware/tenant.ts` 注入到 `c.var.tenantContext`，procedures 通过它读 `plan / seatLimit / status / ownerUserId`，不需要再查表
- **lazy create 自愈**：`tenantMiddleware` 发现 org 存在但 firm_profile 缺失时（hook 失败 / 历史孤儿）自动 INSERT 一条；`ownerUserId` 取 `member.role='owner'` 最早一条
- **Practice / Firm / 事务所**：用户可见层方言（PRD §3.6.1.0）—— EN 默认 Practice、管理类 Firm，ZH 统一事务所；工程层永远 `firmId / organization / firm_profile`
- **scoped repo**：`packages/db/src/scoped.ts` 工厂；procedures 只能通过它访问 DB
- **authed procedure**：oRPC middleware，要求 session 存在并把 `firmId / tenantContext / scoped` 注入 context
- **Overlay Engine**（Phase 1）：运行时把 `ExceptionRule` 叠加到 `obligation_rule.base_due_date` 算出 `current_due_date`
- **Pulse Pipeline**：Ingest（Cron）→ Extract（Queue + AI SDK）→ Review（人工）→ Match → Batch Apply（D1 事务）五段
- **Glass-Box Guard**：AI SDK 输出后置校验（citation 正则 + 黑名单 + PII 回填）
- **Transactional Outbox**：Pulse Apply 与 Email Job 在同一 D1 事务内写入 `email_outbox` 表，由 Queue 消费者异步 flush
- **migration_batch**：单次 Import 的事务边界；PK = `id`；挂载 `migration_mapping` / `migration_normalization` / `migration_error` / 生成的 `client[].migration_batch_id`；24h revert 窗口以 `applied_at + 24h` 表示（对齐 `../product-design/migration-copilot/01-mvp-and-journeys.md` §4 · ADR 0011 Decision I）
- **Default Matrix**：`(entity_type × state) → tax_types[]` 的 practice-reviewed 静态查表；Demo Sprint v1.0 覆盖 Federal + CA + NY × 8 实体 = 24 格；定义在 `../product-design/migration-copilot/05-default-matrix.v1.0.yaml`；运行期由 Rule Engine 读取并写 `evidence_link(source_type='default_inference_by_entity_state', matrix_version='v1.0')`
- **Live Genesis**：Import 完成后 4–6 秒的前端驱动动画，粒子弧线飞入 Deadline Radar + odometer 数字滚动；`prefers-reduced-motion` 降级为 200ms fade-in；规格详见 `../product-design/migration-copilot/07-live-genesis.md`
- **confidence-badge**：Migration AI Mapper / Normalizer 输出的 3 档置信度徽章（≥ 0.95 / 0.80–0.94 / < 0.80）；与 severity / status 语义解耦——**数据质量类 `needs_review` 用 `severity-medium` 黄，工作流 Review 用 `status-review` 紫**（ADR 0011 Decision III 权威裁定；token 见 `../../DESIGN.md` `confidence-badge:`）

---

继续阅读：[01-Tech-Stack.md](./01-Tech-Stack.md)
