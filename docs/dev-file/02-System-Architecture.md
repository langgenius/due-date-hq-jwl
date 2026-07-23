# 02 · System Architecture · 系统架构

> 最后核对：2026-06-10

> 目标：把 PRD 的模块在工程上"干净地切开"，保证每个模块都有清晰的输入、输出、依赖与测试边界。
> 核心决策：**公开站与 SaaS app 分离部署；SaaS 前后端物理隔离、通过 oRPC 契约同步类型；所有基础设施是 Cloudflare 原生 binding。**
> 相关 ADR：[`0016`](../adr/0016-cloudflare-first-single-worker-d1-platform.md) · [`0017`](../adr/0017-orpc-contract-first-rpc-api-boundary.md) · [`0018`](../adr/0018-d1-tenant-isolation-scoped-repo-ports.md) · [`0019`](../adr/0019-ai-sdk-gateway-glass-box-boundary.md)

---

## 1. 系统分层（自顶向下）

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Public Visitor (Browser)                        │
│   due.langgenius.app · Astro static site · SEO / OG / future content      │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ CTA to app.due.langgenius.app
┌──────────────────────────▼───────────────────────────────────────────┐
│                          App Client (Browser)                        │
│   app.due.langgenius.app · Vite+ SPA · React Router 7 · oRPC client       │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  HTTPS
┌──────────────────────────▼───────────────────────────────────────────┐
│                  Cloudflare Worker (apps/server)                     │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  Presentation Layer                                           │   │
│  │  • app subdomain static assets (SPA dist · SPA fallback)      │   │
│  │  • /rpc/*        → Hono + RPCHandler（oRPC Protocol，前端）   │   │
│  │  • /api/auth/*   → better-auth                                │   │
│  │  • /api/webhook/*→ Resend / Stripe 入站                       │   │
│  │  • /api/health   → liveness                                   │   │
│  │  • /api/{ics·readiness·notifications·audit·demo·e2e}          │   │
│  │                  → token / 签名 / 门控 Hono routes（见 §3）    │   │
│  │  • /api/v1/*     → OpenAPIHandler（Phase 2 公网 REST）         │   │
│  └─────────────────────────┬─────────────────────────────────────┘   │
│                            │                                         │
│  ┌─────────────────────────▼─────────────────────────────────────┐   │
│  │  Transport Layer                                              │   │
│  │  oRPC handler · procedures/*.ts · middleware（auth / tenant）  │   │
│  └─────────────────────────┬─────────────────────────────────────┘   │
│                            │                                         │
│  ┌─────────────────────────▼─────────────────────────────────────┐   │
│  │  Application Layer (Use Cases)                                │   │
│  │  modules/* service 层（migration · pulse · dashboard · ...）   │   │
│  └─────────────────────────┬─────────────────────────────────────┘   │
│                            │                                         │
│  ┌─────────────────────────▼─────────────────────────────────────┐   │
│  │  Domain Layer (Pure TS in packages/core)                      │   │
│  │  penalty math · priority scoring · overlay · date logic       │   │
│  │  ☆ 零运行时依赖（无 c.env / 无 DB / 无 fetch）                 │   │
│  └─────────────────────────┬─────────────────────────────────────┘   │
│                            │                                         │
│  ┌─────────────────────────▼─────────────────────────────────────┐   │
│  │  Infrastructure Layer (Adapters)                              │   │
│  │  packages/db（Drizzle + D1）· packages/auth（better-auth）     │   │
│  │  packages/ai（AI SDK + CF AI Gateway + Vectorize + prompts）  │   │
│  │  email · push · storage · queues                              │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Bindings: DB(D1) · CACHE(KV) · RATE_LIMIT · R2_* · VECTORS ·        │
│            EMAIL_QUEUE · PULSE_QUEUE · DASHBOARD_QUEUE ·             │
│            AUDIT_QUEUE · ASSETS                                      │
│  Handlers: fetch · scheduled(cron) · queue(consumer) ·               │
│            email(Email Routing 入站 → GovDelivery 邮件订阅源)         │
└──────────────────────────────────────────────────────────────────────┘
```

**分层纪律：**

- 上层只依赖下层**接口**，不依赖实现；Infrastructure 可替换（R2 换 S3、D1 换 Postgres 都只动 `packages/db`）
- **Domain Layer（`packages/core`）绝不引入运行时依赖**：不碰 `c.env`、不碰 DB、不发 fetch；纯函数让 Vitest 单测零成本
- Procedures 永不直接 import `@duedatehq/db` 或 DB schema，只通过 `context.vars.scoped` 访问（见 §03 / §06）

---

## 2. 模块划分与职责

| 模块                                      | 路径                                                                                              | PRD 对应                                         | 输入                                                | 输出                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **auth**                                  | `packages/auth`                                                                                   | §13.2 · §3.6                                     | Google OAuth / invitation                           | Session · Organization · Member                                                               |
| **members**                               | `apps/server/src/procedures/members` + identity repo                                              | §3.6                                             | current firm + Owner action                         | Member / Invitation gateway over Better Auth                                                  |
| **clients**                               | `apps/server/src/procedures/clients` + repo                                                       | §5.6 · §8.1                                      | CRUD                                                | Client 实体                                                                                   |
| **rules**                                 | `apps/server/src/procedures/rules` + `jobs/rules` + `packages/db` seed                            | §6.1 · §6D                                       | rule draft + source scan / date reconciliation      | ObligationRule + Source Registry                                                              |
| **obligations**                           | `apps/server/src/procedures/obligations`                                                          | §5.2 · §8.1                                      | rule + client                                       | ObligationInstance                                                                            |
| **overlay**（Phase 1）                    | `packages/core/overlay`                                                                           | §6D.2                                            | ExceptionRule                                       | 派生 `current_due_date`                                                                       |
| **penalty**                               | `packages/core/penalty`                                                                           | §7.5                                             | obligation + assumptions                            | ExposureReport                                                                                |
| **priority**                              | `packages/core/priority`                                                                          | §6.4                                             | open obligations + firm Smart Priority profile      | 打分 + 因子分解                                                                               |
| **dashboard**                             | `apps/server/src/procedures/dashboard` + `jobs/dashboard-brief`                                   | §5.1                                             | firm + scope                                        | Triage Tabs + 物化 AI Brief 上下文                                                            |
| **obligations**（Obligations read queue） | `apps/server/src/procedures/obligations`                                                          | §5.2                                             | filter + sort + page                                | Table rows                                                                                    |
| **pulse**                                 | `apps/server/src/procedures/pulse` + `jobs/pulse` + `packages/ingest`                             | §6.3 · [11](./11-Pulse-Ingest-Source-Catalog.md) | HTML / RSS / JSON API / email signal（源清单见 11） | Pulse + （Phase 1）ExceptionRule                                                              |
| **migration**                             | `apps/server/src/procedures/migration`                                                            | §6A                                              | paste / CSV                                         | Client[] + Obligation[]                                                                       |
| **readiness**（Phase 1）                  | `apps/server/src/procedures/readiness`                                                            | §6B                                              | obligation tax type + CPA edits                     | Internal document checklist + optional signed portal link / response                          |
| **audit**                                 | `apps/server/src/procedures/audit` + `packages/db/audit-writer`                                   | §13.2                                            | write events + firm-scoped read filters             | AuditEvent stream                                                                             |
| **evidence**                              | `apps/server/src/procedures/evidence` + `packages/db/evidence-writer`                             | §5.5 · §6.2                                      | any source                                          | EvidenceLink                                                                                  |
| **ai**                                    | `packages/ai`                                                                                     | §6.2 · §9                                        | retrieval + prompt + guard                          | `AiResult` + trace payload；`apps/server` 注入 writer 持久化 AiOutput / EvidenceLink / LlmLog |
| **ask**（Phase 1）                        | `apps/server/src/procedures/ask`                                                                  | §6.6                                             | NL query                                            | DSL → SQL → table                                                                             |
| **reminders**                             | `apps/server/src/procedures/reminders` + `jobs/reminders`                                         | §7.1                                             | due obligations + reminder templates                | `/reminders` 运营页、Email / In-app（Web Push 在 Phase 0 已移除）                             |
| **notifications**                         | `apps/server/src/procedures/notifications` + `jobs/notifications` + `in_app_notification` writers | §7.1.3                                           | personal event / Pulse arrival / morning digest     | In-app bell + Email digest；Pulse lifecycle actions stay in `pulse`                           |
| **evidence-package**（Phase 1）           | `apps/server/src/procedures/audit` + `jobs/audit`（AUDIT_QUEUE consumer）                         | §6C                                              | scope + range                                       | ZIP + SHA-256（存 R2_AUDIT，签名 URL 下载）                                                   |

（核对 2026-06-10）root router `apps/server/src/procedures/index.ts` 还包含上表未单列的 namespace：`calendar`（ICS 订阅管理，feed 在 `routes/ics.ts`）、`firms`（current firm / plan / billing gateway）、`security`（2FA 等）、`workload`；jobs 侧另有 `jobs/ai-insights`（走 DASHBOARD_QUEUE）、`jobs/rollover`（年度滚动）、`jobs/email`（outbox flush）。

### 2.1 模块依赖图

```
             better-auth (Organization plugin)
                   │
                   ▼
        ┌──────────────────┐
        │   middleware     │──── session + firmId into context
        └────────┬─────────┘
                 │
   ┌─────────────┼───────────────┬────────────┐
   ▼             ▼               ▼            ▼
 clients    obligations       rules       migration
   │             │               │            │
   └─────────────┼──────── generates ─────────┘
                 │
                 ▼
           dashboard ◄─── priority ◄─── penalty ◄─── overlay
                 │
                 ▼
          pulse (PULSE_QUEUE)  ──► batch_apply ──► email_outbox
                 │
                 └──► dashboard_brief_refresh（DASHBOARD_QUEUE）
                                                │
                                                ▼
                                         email consumer
```

实线依赖直接调用；虚线（pulse → email_outbox）通过 **Transactional Outbox** 事件传递。
Dashboard AI Brief 是后台物化 read model：写路径或 Cron 投递 Queue，Queue consumer 生成
`ai_output(kind='brief')` + `dashboard_brief`；`dashboard.load` 只读，不调用 AI。

五条队列由同一 Worker 的 `queue()` handler（`jobs/queue.ts`）按消息 `type` 分发：DASHBOARD_QUEUE
同时承载 `dashboard.brief.refresh` 与 `ai.insight.refresh`；AUDIT_QUEUE 承载
`audit.package.generate`（evidence package ZIP）；PULSE_QUEUE 承载 `pulse.ingest.source` /
`pulse.extract` 与 rule-scan 类消息；EMAIL_QUEUE 承载 `email.flush`；SOCIAL_QUEUE 只承载
`social.x.publish`，以单消息 batch / 单 concurrency 调用 X。Pulse 与 Social 的 dead-letter queue
也路由到同一 handler——只 drain + 发 ops alert，不重跑失败 handler。普通 dispatch 会处理
Cloudflare `max_retries=3` 产生的全部四次 delivery；第四次仍实际执行，若再次失败才 ack + 发
`queue.dispatch.dropped`，告警字段包含 queue、message id、message type、source id 与最终 error。

---

## 3. 路由前缀约定（约束）

对齐 oRPC 官方惯例，Worker 路由按职责分层，**不可混用**：

| 前缀                               | 挂载的 handler                                                                                 | 职责                                                                                         | 身份 / 调用方                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/rpc/*`                           | `RPCHandler`（`@orpc/server/fetch`）                                                           | 内部 TS 前端调用；支持 Date / BigInt / Map / Set / AsyncIterator 富类型                      | `apps/app` 独占；cookie session                                                                 |
| `/api/auth/*`                      | better-auth（Email OTP / Google OAuth / One Tap / Microsoft OAuth + Organization + twoFactor） | 登录 / 注册 / 注销 / OTP / OAuth callback / One Tap callback / 邀请接受 / 2FA / session 管理 | 浏览器 + OAuth 回调                                                                             |
| `/api/auth-capabilities`           | 手写 Hono route                                                                                | 暴露公开 auth 能力：provider 开关与 Google Client ID；不返回 OAuth secret                    | 浏览器                                                                                          |
| `/api/webhook/*`                   | 手写 Hono route                                                                                | Resend / Stripe（Phase 1）等外部回调                                                         | 无用户身份；provider 签名校验必做；IP allowlist 仅作可选加固                                    |
| `/api/ics/:token(.ics)`            | 手写 Hono route                                                                                | ICS 日历订阅 feed；`.ics` 后缀兼容 Apple Calendar 等客户端                                   | token 鉴权 + rate limit                                                                         |
| `/api/readiness/*`                 | 手写 Hono route                                                                                | Readiness 客户 portal（查看 checklist / 提交回应）                                           | 签名 portal token + rate limit；无 session                                                      |
| `/api/notifications/unsubscribe`   | 手写 Hono route                                                                                | 客户邮件退订（写 `client_email_suppression`）                                                | 签名 unsubscribe token                                                                          |
| `/api/audit/packages/:id/download` | 手写 Hono route                                                                                | Evidence package ZIP 下载                                                                    | cookie session + 签名 URL；Owner + plan `auditExport` 门槛                                      |
| `/api/demo`                        | 手写 Hono route                                                                                | 公开免注册只读 demo：为共享 demo firm 铸造短时 session 后跳转 app                            | `ENABLE_PUBLIC_DEMO` 门控 + IP rate limit                                                       |
| `/api/e2e/*`                       | 手写 Hono route                                                                                | Playwright 测试 bootstrap（seed / 登录态）                                                   | dev 开放；staging 需 `E2E_SEED_TOKEN`；production 恒 404                                        |
| `/api/ops/social/*`                | 手写 Hono route                                                                                | X 候选预览、`ready` 等待序列预计日期、审批、取消、unknown 对账                               | dev 开放；其余环境只认 `SOCIAL_OPS_TOKEN` bearer；operator CLI + default-branch GitHub 只读镜像 |
| `/api/social-alerts/:ref/teaser`   | 手写 Hono route                                                                                | 只返回已发布 X 文案中已有的 teaser、agency、jurisdiction                                     | 公开 + rate limit；不返回 Pulse detail / source / client                                        |
| `/api/health`                      | 手写 Hono route                                                                                | Cloudflare healthcheck / liveness                                                            | 公开                                                                                            |
| `/api/v1/*`（Phase 2）             | `OpenAPIHandler`（`@orpc/openapi/fetch`）                                                      | 公网开放 REST；复用同一份 `packages/contracts` 契约；自动生成 OpenAPI spec                   | OAuth client credentials                                                                        |
| app 子域其他所有路径               | ASSETS binding                                                                                 | `apps/app` SPA 静态产物 + `not_found_handling = "single-page-application"` 兜底              | 浏览器                                                                                          |

`due.langgenius.app` 的公开首页、后续 `/rules`、`/watch`、`/state/*`、`/pulse` 不走上表的 SaaS Worker fallback；它们属于 `apps/marketing`（见 [12 Marketing Architecture](./12-Marketing-Architecture.md)）。

**`wrangler.toml` 对应**：

```toml
[assets]
directory = "../app/dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/rpc/*", "/api/*"]
```

**同一 Worker 的非 HTTP 入口**（`apps/server/src/index.ts`，单 Worker 导出四个 handler）：

- `scheduled()`（cron `*/30 * * * *`，`jobs/cron.ts`）：每 tick 用 `Promise.allSettled` 隔离各分支——rules（registry catalog sync / source scans / date reconciliation）、pulse（ingest scans / extract 失败重试 / extract 健康 canary / still-open alert windows 日扫）、X social outbox、deadline reminders、morning digests、annual rollover、email flush；X watchdog 每 tick 检查积压/unknown，发布与 draft 补充只在 `America/New_York` 09:00–09:29 运行：抢当天唯一发布槽位后、live enqueue 前（或 idle / shadow 时），以 D1 条件插入为当前 ET 自然日补充至多一条最新未入列 Alert 草稿；旧 draft 不阻止下一自然日补充，重复 Cron 不能在同一天重复补充；其他 tick 不批量生成；分支失败逐个落 `cron.branch_failed` 日志 + `OPS_ALERT_EMAIL` ops alert
- `queue()`（`jobs/queue.ts`）：消费 EMAIL / PULSE / DASHBOARD / AUDIT / SOCIAL 五条队列 + pulse/social DLQ（见 §2.1）
- `email()`：Cloudflare Email Routing 入站 → `jobs/pulse/govdelivery.ts`，承接 `email_subscription` 类 Pulse 源（GovDelivery 订阅邮件 → raw 归档 → `pulse.extract`）

**为什么 `/rpc` 独立于 `/api`**：

- oRPC 官方文档所有 `RPCHandler` 示例都用 `/rpc`；保持一致降低团队认知成本
- RPC Protocol ≠ REST：二进制-ish 协议不应该被放进 `/api/*` 的 REST 命名空间里，避免误解
- 为 Phase 2 的 `OpenAPIHandler(contract, { prefix: '/api/v1' })` 留出干净的命名空间，两者同时存在且零命名冲突

### 3.1 Hono / oRPC 错误边界纪律

`apps/server/src/app.ts` 拥有 Hono app 组装：全局 request id、locale、普通 Hono route、
`/rpc/*` middleware 顺序和 Hono `app.onError` 兜底都在这里维护。Hono `app.onError` 只负责
Hono middleware、手写 route、以及 `rpcHandler` 外层意外抛出的异常。

`apps/server/src/rpc.ts` 拥有 oRPC `RPCHandler` 组装。Procedure 内部抛出的异常会先被
`RPCHandler` 捕获并编码成 RPC error response；因此 RPC procedure 的 5xx 日志必须通过 oRPC
interceptor 接入，不能依赖 Hono `app.onError`。预期内的业务失败应显式转为 `ORPCError` 或写入
领域错误表（例如 `migration_error`），只有真正未预期的异常保留为 500。

`apps/server/src/middleware/logger.ts` 是 Worker request id 与 server error log serializer 的共享
位置。禁止在 procedure 里散落裸 `console.error` 作为长期方案；需要更多上下文时，优先扩展统一日志
字段或在业务层转换为结构化领域错误。

---

## 4. 请求流（关键三类）

### 4.1 首次访问 / SPA 冷启动

```
Browser ── GET / ──► Worker
                                 │
                                 │ 不匹配 run_worker_first(["/rpc/*", "/api/*"])
                                 │ → 交给 ASSETS binding
                                 ▼
                          ASSETS.fetch() → index.html（SPA fallback）
                                 │
                                 ▼
                          浏览器加载 SPA bundle → mount React
                                 │
                                 ▼
                          oRPC client 发起 orpc.dashboard.load.queryOptions()
                                 │
                                 ▼
Worker ── POST /rpc/dashboard/load ──► Hono → RPCHandler
                                                │
                                                ▼
                                           authed middleware
                                           （读 better-auth session
                                           → 注入 firmId + scoped repo）
                                                │
                                                ▼
                                           procedures/dashboard.load
                                           → scoped.obligations.triageTabs()
                                           → core.priority.score(profile)
                                                │
                                                ▼
                                           响应 JSON 回前端
```

SPA 首屏 TTI 冷启动 ≤ 1.5s（bundle 加载）；回访热启动 ≤ 300ms（chunk hash 长缓存命中 + TanStack Query 内存缓存）。PWA / SW 在 Phase 0 已移除（见 `05 §8` 与 `00 §7`）。

### 4.2 Pulse 24h 闭环

> 本图展示**数据流抽象**；具体源清单 / 反爬策略 / SLA 风险 / Source Adapter 工程契约见 [11 Pulse Ingest Source Catalog](./11-Pulse-Ingest-Source-Catalog.md)。本图的 `Fetch` 节点对应 11 §6 的 `SourceAdapter.fetch()`，`raw 存 R2` 对应 `RawSnapshot.r2Key`。

```
Cron Trigger（*/30 * * * *，每源独立 interval 见 11 §3）
        │
        ▼
scheduled(controller, env) → jobs/pulse/ingest（enqueuePulseIngestScans，按到期源逐源入队）
        │
        ▼
PULSE_QUEUE { type: 'pulse.ingest.source', sourceId }
        │
        ▼
Queue consumer → SourceAdapter.fetch()  ──► raw 存 R2_PULSE ──► PULSE_QUEUE { type: 'pulse.extract', snapshotId }
（HTML / RSS / JSON API / email signal，选择与降级见 11 §4；
 email signal 不走 cron，由 Worker `email()` handler 直接入此链；
 白名单 JS 渲染源经 Browserless 抓取）
                                        │
                                        ▼
                                 Queue consumer
                                        │
                                        ▼
                                 AI SDK Extract（经 CF AI Gateway）+ relevance guard
                                        │
                                        ▼
                                 Glass-Box Guard 校验
                                        │
                                        ▼
                                 写 pulse（高置信 status=approved 并扇出到 firm；
                                 低置信 quarantined 仅留人工复核，不扇出）
                                        │
                                  firm review（Rules > Pulse Changes）
                                        │
                                        ▼
                                 Match Engine
                                        │
                                        ▼
                                 Dashboard Banner + Email Outbox
                                        │                 │
                                        ▼                 ▼
                                 用户点 Apply       Queue 消费 → Resend 发邮件
                                        │
                                        ▼
                                 d1.batch([
                                   UPDATE obligation.current_due_date,
                                   INSERT evidence_link,
                                   INSERT audit_event,
                                   INSERT email_outbox
                                 ])  ← 同一事务
```

### 4.3 Migration 原子导入

```
前端 Wizard → rpc.migration.dryRun（纯预览，不写库）
          ↓
          rpc.migration.apply
          ↓
          服务端创建 migration_batch（status=applying）
          ↓
          for each row:
            Zod.safeParse → 失败 → 写 migration_error，continue
            ↓
            normalize（core 纯函数 + AI SDK 兜底）
            ↓
          d1.batch([
            INSERT clients × N,
            INSERT obligations × N·M（规则引擎生成；只包含 practice monitoring_start_date 当天或之后的 statutory due date）,
            INSERT evidence_link × N·M,
            INSERT audit_event,
            UPDATE migration_batch SET status=applied, revert_expires_at=now()+24h
          ])
          ↓
          返回 summary
          ↓
          前端 Live Genesis 动画 + 顶栏 $ 滚动（纯前端驱动）
```

`d1.batch()` 是事务化批处理，但每条 statement 仍受 D1 限制（例如 100 bound parameters / 100 KB SQL），整个 Worker invocation 也受查询数限制。30 客户 × 平均 5 obligations 通常可单批提交；更大导入按 100–200 prepared statements 分批，并用 `migration_batch` 记录批次状态与可回滚边界。

---

### 4.4 X daily Alert acquisition loop

```text
approved, externally useful global Pulse
  -> eligible, not-yet-outboxed candidate pool
  -> 09:00 ET scheduler claims today's ready Post (D1 unique daily slot)
  -> atomically create at most one deterministic review draft for this ET day
     from the newest not-yet-outboxed Pulse
     with full state names in public header copy (D1 social_alert_post)
  -> GET /api/ops/social/queue shows the rolling draft without creating it
     -> GitHub Actions read-only snapshot -> one public GitHub review issue
        (visibility only; no state transition or future slot)
  -> operator marks ready
     -> CLI best-effort workflow_dispatch(postId, draftUpdatedAt)
     -> token-gated single-Post review status -> exact bot comment becomes approved/ready
  -> GET /api/ops/social/queue projects future ET dates without writes or reservations
  -> next 09:00 ET scheduler or exact-post publish-now control
  -> read-only OAuth 1.0a /2/users/me preflight before a manual live claim
  -> draft_only shadow OR SOCIAL_QUEUE -> X POST /2/tweets
  -> /alerts?ref=<opaque token>
  -> login / firm onboarding keeps intent
  -> protected pulse.resolveSocialAlert
  -> current firm's pulse_firm_alert -> /alerts?alert=<tenant id>
```

这里没有公开 Alert 详情页。匿名接口只能回显已经在 X 公开的三项 teaser 字段；完整 summary、
官方来源、客户匹配和 `pulse_firm_alert.id` 必须经过 session + tenant middleware。相同 `ref`
由两个 firm 打开时，各自解析/创建自己的 `pulse_firm_alert`，不会共享 tenant row id。

Social selection 通过共享 source policy 排除 `fema.declarations`、`govdelivery.inbound` 和
`govdelivery.inbound.unmatched`：这些 source 只提供尚未完成税务归因的 early signal，不能据此
确认 filing/deadline change，并要求 CPA 重新核验规则。数据库 candidate predicate 与发布前
runtime validation 同时执行该闸门；
`rule_source_drift` 等内部 change kind 仍单独排除。`action_mode='review_only'` 本身不是排除条件，
避免误伤 filing requirement、applicability scope 等真实且适合公开介绍的来源变化。
候选读取先按 `Pulse.created_at DESC, id DESC` 在 SQL 中排序，并在完整 PII/runtime 校验跳过整页时
用同一复合键继续 keyset 翻页；因此 100 条较新的无效候选不会永久饿死后面的有效 Alert。

每日上限由 `UNIQUE(channel, local_date)` 而不是 Cron 时间假设保证。候选草稿、`ready` backlog、
真实 claim 和 queue 预览全部按关联 Pulse 的 `created_at DESC, id DESC` 排序，因此后来进入系统的
Alert 会先进入审核并先发布；`priority` 只保留为人工审核元数据，显式 `publish-now` 是唯一的人工
顺序例外。X 返回明确 4xx 时当天记 failed 且不换发；timeout、网络中断、5xx 或成功响应缺 Post ID
时记 unknown 并停止自动重试，等待人工在 X 核对后执行 reconcile。

Social Ops 通过 `GET /api/ops/social/queue` 提供只读的等待序列，CLI 对应
`pnpm social:x -- queue`，固定展示未来 14 个 ET 自然日。它使用真实 claim 的最新 Pulse 优先规则，
把当前 eligible `ready` Post 映射到预计日期，并在同一输出的 `drafts` 区块直接展示每日自动补充的
待审核候选，无需先运行 `candidates --pulse`。每个 ET 自然日最多自动补充一条；旧 draft 可以继续
等待审核，下一天仍会从当时最新的未入列 Alert 补一条。`draft` 没有预计日期，批准后才进入
`ready` 序列。这个 GET 视图本身不写 `social_alert_post`、不提前创建未来 `social_publish_run`，也不
提前向 `SOCIAL_QUEUE` 投递消息。预计日期不是锁定排期：更新的 Alert 被批准、取消/失去资格、
`publish-now` 或当天 failed/unknown 都会使后续位置变化。唯一真实排期动作仍是 Worker 在每天
09:00 ET claim 一条。

`.github/workflows/x-draft-review.yml` 在 09:00 ET 日槽之后两次 best-effort 读取同一个 queue
projection，并把当前可见的未同步 draft revision 镜像为公开 GitHub Issue comment。该旁路按
`postId + updatedAt` 幂等，评论正文只取确定性 X copy、非锁定的最早 queue horizon 和人工 approve
命令；不 dump Social row，也不写 D1。Issue comment / reaction / label / open-close 没有任何箭头
回到 `ready`，Actions 延迟或失败也不阻断 Worker。公开镜像是刻意新增的 pre-publication surface：
tracked ref URL 会提前出现在不可点击的 code block 中，但 ref 不是授权凭证，完整 Alert 仍经过登录、
firm 与 tenant 边界。Social Queue/D1 继续是唯一事实来源和发布调度权威。

生产 CLI 的 approve 成功后，响应带回原 draft 的 `postId + draftUpdatedAt`，随后 best-effort
触发同一 default-branch workflow。workflow 不信任本地文案，而是调用 token-gated
`GET /api/ops/social/:postId/review-status`；该接口只返回 ID、当前状态、最终冻结 public copy、
`approvedAt / updatedAt`。脚本按 exact draft revision 找到由 `github-actions[bot]` 创建的评论，
以 `postId + approvedAt` 幂等 PATCH 为 `approved · ready`；原评论缺失时新增 approved snapshot，
不误改同一 Post 的旧 revision。dispatch/PATCH 失败只影响 GitHub presentation，不回滚已经提交的
D1 approval，CLI 会明确输出 targeted retry 命令。

Social Ops 的 `publish-now` 只能 claim 指定的 eligible `ready` Post，并仍受同一唯一键
约束；同日同 Post 的 `draft_only` 只有在再次 approve 后才能原位升级为 `queued`，不能把影子
槽位转给另一 Post。手动 claim 前先用 OAuth 1.0a 签名的只读 `/2/users/me` 核对固定账号，避免
坏 credential 消耗当天槽位；真正写入 X 仍只发生在 serialized `SOCIAL_QUEUE` consumer。

X 的公开 header 文案不直接暴露两位州码：jurisdiction 和 agency label 中与该 jurisdiction
对应的独立州码统一映射为 `STATE_RULE_SOURCE_SEEDS` 的州全称；表单编号、其他辖区名称片段和
UTM content 仍保留稳定 code，避免把 `LA County` 误写成 Louisiana 或破坏 campaign 归因。

## 5. 外部依赖清单

| 依赖                                                                       | 用途                | 故障降级见            |
| -------------------------------------------------------------------------- | ------------------- | --------------------- |
| AI SDK providers（via Cloudflare AI Gateway）                              | 模型执行 / fallback | §01.5                 |
| Resend                                                                     | 邮件                | email_outbox 重试     |
| Browserless（仅 `PULSE_BROWSERLESS_SOURCE_IDS` 白名单的 JS 渲染 Pulse 源） | headless 抓取       | 11 §4 / source health |

所有 Cloudflare 原生服务（D1 / KV / R2 / Queues / Vectorize / AI Gateway）**不算外部依赖**，它们是 Worker 的 binding。

---

## 6. 并发与一致性策略

| 场景                                                        | 策略                                                                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 同 firm 多设备并发改同一 obligation                         | Drizzle optimistic `updated_at` 比对；前端 toast "conflict" 提示重试                                                             |
| Pulse 同一 alert 的变更操作（apply / dismiss / revert）互斥 | D1 `mutation_lock` 表做 advisory lock（`scoped.mutationLock`，key=firm+alert，60s TTL，过期自愈）+ 前端按钮 disable              |
| Migration 运行中禁止二次 import                             | `migration_batch.status=applying` 时拒绝新 batch                                                                                 |
| Dashboard Brief 刷新                                        | Queue 消息带 `idempotency_key`；D1 以 `(firm, scope, as_of_date, input_hash)` 去重，KV 以 firm + scope + user 做 5 分钟 debounce |
| 邮件 outbox 幂等                                            | `email_outbox.external_id` 唯一约束；consumer 处理前校验                                                                         |
| Queue 消息幂等                                              | 消息体带 `idempotency_key`，消费者先查 D1 去重                                                                                   |

---

## 7. 多租户隔离（纵深防御，详见 §06）

三道防线共同构成纵深防御；其中 session 与 scoped repo 是运行时安全边界，lint 是防止绕过边界的开发期护栏：

1. **better-auth session 层**：`activeOrganizationId` 必须存在于 session，否则 middleware 拒绝请求
2. **gateway 层**：`firms.*` / `members.*` 把 Better Auth identity primitives 包成产品 API，统一 current firm、权限、seat、audit、错误码
3. **repo 工厂层**：`scoped(db, firmId)` 是进入 `packages/db` 业务数据的唯一入口；所有 tenant-scoped query 在工厂内部硬编码 `WHERE firm_id = :firmId`
4. **Lint 静态层**：oxlint 自定义规则（`no-restricted-imports`）禁止 procedures 直接 import `@duedatehq/db` 或 DB schema 表；PR 检查自动 block，但不替代运行时权限检查

D1 无 RLS 能力，不依赖 DB 级防护。

---

## 8. 性能架构要点

- Dashboard / Obligations 查询结果由 Worker 内存 + KV **分层缓存**；TTL 60s，写时主动 invalidate
- Deadline Radar 顶栏 $ 聚合由一条 SQL 完成（复合索引 § 03.3），不在前端二次求和
- Obligations 走服务端分页（50 行/页）+ 前端 TanStack Table 虚拟化
- AI 调用全部异步；Weekly Brief 后台 Queue 物化到 `dashboard_brief`，Dashboard 首屏不等待模型
- Streaming 只用于 Ask / future agent surfaces，不用于 Dashboard Brief 首屏
- 大对象（PDF / migration raw / audit zip）存 R2，API 只返 signed URL

---

## 9. 故障域与回滚

| 故障                                | 回滚手段                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Worker 新版本线上异常               | `wrangler rollback`（立即回上一版）                                        |
| D1 migration 写坏                   | 迁移走"可逆 migration"模式；写坏后 rollback migration + 从备份恢复         |
| Pulse 批量误改                      | 24h 内 `pulse.revert` 一键还原（写入 `reverted_at`，alert 回到 `matched`） |
| Migration 导入误操作                | 24h 内 `migration.revert` 按 `migration_batch_id` 级联删客户和 obligations |
| Exception overlay 误应用（Phase 1） | 独立 `ObligationExceptionApplication` 表，`reverted_at` 立即失效           |

---

## 10. 演进路径预留

| 演进方向                                              | 预留点                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 → Postgres（极端场景退路，非预设路径，见 §03.9.2） | `packages/db` 是唯一 schema/query 入口；切换只改该包；业务层零感知                                                                                                                                                                                                                                                        |
| Vectorize → Pinecone                                  | `packages/ai/retriever.ts` 抽象 `VectorStore` 接口                                                                                                                                                                                                                                                                        |
| Cloudflare AI Gateway → 其他网关                      | `packages/ai` 隔离 AI SDK provider 组合；业务模块只消费 DueDateHQ AI facade                                                                                                                                                                                                                                               |
| 单 Worker → 多 Worker（承载量上来后）                 | Queue consumer 拆到独立 Worker；主 Worker 只处理交互请求                                                                                                                                                                                                                                                                  |
| **SEO 公开页**（PRD P1-17 / P1-34 / §5.7A / §5.7B）   | **独立 Astro 静态子站**（`apps/marketing`，挂 `due.langgenius.app`）承接首页、`/rules` `/watch` `/state/*` `/pulse`；首版静态输出，后续通过静态 snapshot 或主 Worker 的 `/api/v1` OpenAPIHandler 读 verified 规则快照。PRD 语义不变，工程上与 SaaS Worker（`app.due.langgenius.app`）物理分离以避开 SPA 不利于 SEO 的限制 |
| Phase 2 第三方 API 开放                               | 主 Worker 增加 `/api/v1/*` 路由挂 `OpenAPIHandler(contract, { prefix: '/api/v1' })`，复用 `packages/contracts`                                                                                                                                                                                                            |

---

继续阅读：[03-Data-Model.md](./03-Data-Model.md)
