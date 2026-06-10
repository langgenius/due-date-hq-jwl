# 01 · Tech Stack · 技术栈选型

> 最后核对：2026-06-10

> 原则：**公开站与 SaaS app 分离部署到 Cloudflare · 前后端物理隔离但共享类型契约 · 零 vendor lock-in 的可替换单元 · 类型安全到底。**
> 每一项选择都必须能回答："为什么不是 X？"
> 相关 ADR：[`0016`](../adr/0016-cloudflare-first-single-worker-d1-platform.md) · [`0017`](../adr/0017-orpc-contract-first-rpc-api-boundary.md) · [`0018`](../adr/0018-d1-tenant-isolation-scoped-repo-ports.md) · [`0019`](../adr/0019-ai-sdk-gateway-glass-box-boundary.md)

---

## 1. 一张表看全栈

| 领域                    | 选型                                                                                    | 为什么                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **语言**                | TypeScript 6.x stable + `@typescript/native-preview` (`tsgo` / `tsgolint`)              | TS 6 是稳定语义基线；`tsgo` 用作快速 typecheck；`vp check` 的 typeCheck 路径内部复用 tsgolint                                                                                                          |
| **Monorepo**            | pnpm workspaces + **Vite Task**（vite-plus 内置）                                       | pnpm 11 workspace + catalog 保留（作为版本单一源）；任务编排 / 缓存 / `-r` 递归由 `vp run` 接管，不再引入 Turborepo                                                                                    |
| **脚手架**              | `vp create vite:monorepo` 起骨架                                                        | Vite+ 官方 monorepo 模板，自带 `vite-plus` 根配置 + 共享 typescript-config                                                                                                                             |
| **统一工具链**          | **Vite+ (`vite-plus` + 全局 `vp`)**                                                     | 一个 dep 吞下 Vite 8 + Vitest + Oxlint + Oxfmt + Rolldown + tsdown + Vite Task；`vp check / test / build / run -r` 是全仓唯一入口，取代独立的 oxlint / oxfmt / vitest / turbo 调用链                   |
| **Git Hooks**           | Vite+ `staged` 块（vite.config.ts）                                                     | 由 `vp` 安装的 git hook 调度，等价于 lefthook + lint-staged；单一配置源                                                                                                                                |
| **SaaS 前端框架**       | Vite 8（由 vite-plus 提供）+ React 19                                                   | `apps/app` 是纯 SPA，不走 SSR；Workers Assets 只托管登录后产品静态产物                                                                                                                                 |
| **Marketing 框架**      | Astro static site（React islands deferred）                                             | `apps/marketing` 承载 `due.langgenius.app` landing / SEO / OG；当前 landing 不注册 React integration，只有真实交互 island 出现时才加回 React                                                           |
| **前端路由**            | React Router 7（library/data mode，非 framework mode）                                  | framework mode 会拖进 Node 依赖，与 Worker 冲突                                                                                                                                                        |
| **i18n contract**       | `packages/i18n` + app Lingui catalog + server thin dictionary                           | 语言列表、Intl locale、`x-locale` header 单一来源；文案 catalog 按 app/server/marketing 分离                                                                                                           |
| **UI 底座**             | shadcn/ui（`"style": "base-vega"`）+ Base UI                                            | Base UI 是 Radix 团队下一代；体积更小，键盘/RTL 更严                                                                                                                                                   |
| **样式**                | Tailwind 4（`@theme` directive）                                                        | 密度 + 暗色 token 切换；对齐 DESIGN.md                                                                                                                                                                 |
| **图标**                | lucide-react                                                                            | shadcn 默认；体积友好                                                                                                                                                                                  |
| **表格**                | TanStack Table 8                                                                        | Obligations 虚拟化 + 客户自定义列                                                                                                                                                                      |
| **快捷键**              | TanStack Hotkeys (`@tanstack/react-hotkeys`)                                            | App keyboard shell、`G then D` 序列快捷键、`?` 注册表帮助浮层；只用于 `apps/app`，不进入 `packages/ui`                                                                                                 |
| **服务端数据**          | TanStack Query 5 + oRPC tanstack-query adapter                                          | 乐观 UI + invalidation + 契约派生类型                                                                                                                                                                  |
| **全局状态**            | Zustand 5                                                                               | 极少 UI state；不引 Redux                                                                                                                                                                              |
| **URL state**           | nuqs                                                                                    | 筛选 / 分页 / 抽屉开关持久到 URL                                                                                                                                                                       |
| **表单**                | TanStack Form + Zod Standard Schema                                                     | 复杂 app 表单使用 `@tanstack/react-form`；校验直接挂 Zod schema，不再经过 resolver 适配层                                                                                                              |
| **动画**                | motion（framer-motion 的后继包名）+ canvas-confetti + react-odometerjs                  | Deadline Radar 游戏化 + Live Genesis                                                                                                                                                                   |
| **PDF**                 | pdf-lib（生成）+ pdfjs-dist（文本抽取）                                                 | Audit Package / 队列导出 PDF 用 pdf-lib 纯 JS 生成（fflate 打 zip）；Pulse pdf_watch 源用 pdfjs-dist 抽文本；均 Worker 可跑。原规划的 @react-pdf/renderer 未引入                                       |
| **RPC 桥**              | **oRPC**（`@orpc/contract` + `@orpc/server` + `@orpc/client` + `@orpc/tanstack-query`） | Contract-first，端到端强类型；前后端解耦，AI 辅助编程下不易漂                                                                                                                                          |
| **RPC prefix**          | `/rpc`（`RPCHandler` 默认）；`/api` 留给 REST / webhook / 未来 `OpenAPIHandler`         | 对齐 oRPC 官方惯例；两种 handler 可共用同一份契约                                                                                                                                                      |
| **后端框架**            | Hono 4（Worker 入口直接转发 `app.fetch`，不经 adapter）                                 | 中间件 + 路由；`/api/*` 全挂它；轻量、Worker 原生                                                                                                                                                      |
| **Auth**                | **better-auth** + Organization plugin + Access Control plugin                           | 原生 Hono/Edge；Organization / Membership / Invitation / Active-org 开箱即用，PRD §3.6 Team 模型 1:1 对应                                                                                              |
| **ORM**                 | Drizzle ORM（`drizzle-orm/d1`）                                                         | D1 一等支持；零 Node 依赖；类型推导强；支持裸 SQL + 参数化                                                                                                                                             |
| **数据库**              | **Cloudflare D1**（SQLite）                                                             | Workers 原生 binding + SQLite 语义；miniflare dev / prod 同 API；Time-Travel 30 天；对我们的多租户点查询 workload 是**架构正确选择**（§2.5），非权宜之计                                               |
| **向量**                | **Cloudflare Vectorize**                                                                | 与 Worker 同域；RAG top-k 检索                                                                                                                                                                         |
| **对象存储**            | **Cloudflare R2**                                                                       | 零出口流量费；S3 兼容 API（`@aws-sdk/client-s3` 可用）                                                                                                                                                 |
| **缓存 / 限流**         | **Workers KV** + **Rate Limiting binding**                                              | KV 做热数据；Rate Limit 是 Cloudflare 原生 primitive                                                                                                                                                   |
| **后台任务**            | **Cron Triggers** + **Queues**（email / pulse / dashboard / audit 四组 + DLQ）          | Pulse ingest / Email outbox / dashboard 聚合 / audit 打包；零外部依赖。Workflows 尚未启用（wrangler.toml 无 workflows binding）                                                                        |
| **AI SDK**              | Vercel AI SDK Core（`ai`）                                                              | Worker 后端唯一模型执行层；统一 structured output / streaming / tool calling / usage metadata，业务模块不直接碰 provider SDK                                                                           |
| **AI 网关**             | Cloudflare AI Gateway via AI SDK provider                                               | 上游 provider 代理；自带 cache / retry / rate limit / provider-level observability                                                                                                                     |
| **AI Gateway provider** | `ai-gateway-provider`                                                                   | Cloudflare 官方 Vercel AI SDK 集成包；仅在 `packages/ai` 内部组合 Gateway + OpenRouter / Unified provider；不允许业务模块直接 import                                                                   |
| **Embedding**           | AI SDK embedding provider + Cloudflare Vectorize                                        | 模型由 `packages/ai` 路由确认；结果写入 Vectorize                                                                                                                                                      |
| **AI tracing**          | AI SDK usage/telemetry + Cloudflare AI Gateway Dashboard + internal `ai_output` trace   | 不再引入第三方 tracing SDK；prompt 版本 / token / latency / guard result 写入内部 trace payload                                                                                                        |
| **邮件**                | Resend（出站，React Email 模板）+ postal-mime（入站解析）                               | fetch API；Worker 可跑；Phase 0 的用户通知完全走 email + in-app toast（不做 Web Push）。入站：Pulse email_subscription 源（GovDelivery）经 Email Routing 进 Worker `email()` handler，postal-mime 解析 |
| **监控**                | Sentry（Cloudflare Workers SDK）+ Workers Logs（Logpush）                               | 错误 + 性能 + 日志                                                                                                                                                                                     |
| **产品分析**            | PostHog Cloud（JS SDK）                                                                 | Web Vitals + 核心激活/漏斗事件                                                                                                                                                                         |
| **测试**                | Vitest + `@cloudflare/vitest-pool-workers` + Playwright + msw                           | 单测跑在 Workers runtime；E2E 跨浏览器                                                                                                                                                                 |
| **菜单栏壳（Phase 2）** | Tauri 2 + Rust                                                                          | 跨平台；~1 MB 体积                                                                                                                                                                                     |

> 所有前端 `apps/app` 依赖不进 `apps/server`；所有后端 Worker 依赖不进 `apps/app`。两者通过 `packages/contracts` 共享类型。`apps/marketing` 只共享 `packages/ui` 与 locale contract，不调用内部 `/rpc`。

---

## 2. 关键选型的深度理由

### 2.1 为什么 Cloudflare SaaS Worker + Astro Marketing，而非 Vercel + Next.js

| 维度                        | 现方案（CF SaaS Worker + Astro marketing）                                                         | 旧方案（Vercel + Next.js）                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 部署供应商                  | Cloudflare（Workers + D1 + KV + R2 + Queues + Vectorize + AI Gateway）+ Resend + Sentry = **3 家** | Vercel + Neon + Upstash + Inngest + R2 + Resend + Sentry = **7 家** |
| dev / prod runtime 一致     | miniflare = Workers 完全一致                                                                       | Vercel Edge vs Node local 经常踩坑                                  |
| 全球 PoP                    | 300+                                                                                               | 北美为主                                                            |
| 成本（MVP）                 | ~$5–10/mo                                                                                          | ~$70/mo                                                             |
| SPA 回访体验（chunk cache） | 秒开                                                                                               | 同级                                                                |
| SEO 公开页                  | 强：`apps/marketing` Astro 静态 HTML / OG / sitemap                                                | 强                                                                  |

结论：**对回头率驱动的目标用户**，CF Worker + SPA 方案在产品 app 上体验与成本双优；公开 SEO 不塞进 app，而由 Astro 静态站承接。Install 体验（原 PWA 场景）推迟到 Phase 2 的 Tauri menu bar widget 统一覆盖。

### 2.1A 为什么 Astro 做 marketing，而非把 landing 放进 `apps/app`

- `apps/app` 是登录后工作台，根路由默认做 auth gate；把公开 landing 放进去会让 app 路由同时承担获客与产品两种职责。
- SPA fallback 返回同一个 `index.html`，对登录后体验正确，但对 SEO、OG、无 JS 访问和 sitemap 不理想。
- Astro 默认输出静态 HTML，符合 landing / pricing / content 的 SEO 需求；React 只作为局部 island 使用，能继续复用 `packages/ui`。
- 两个部署单元可以通过 root `pnpm deploy` 串行编排，不需要牺牲域名、缓存和 auth 边界。

### 2.2 为什么 oRPC 而非 tRPC / REST

- **Contract-first**：`packages/contracts` 是前后端唯一共享源；后端 `os.contract(...).router(...)` 实现契约，前端 `createORPCClient<Contract>()` 消费契约；**契约改了前后端编译期一起红**
- **双 handler 策略**：同一份契约既可被 `RPCHandler`（走 `/rpc`，富类型 + 高性能，服务内部前端）消费，也可被 `OpenAPIHandler`（走 `/api/v1`，标准 REST + 自动生成 OpenAPI spec，服务未来第三方）消费，零业务代码重写
- TanStack Query 官方 adapter，query key / invalidation 类型派生
- 对非 TS 客户端更友好（通过 OpenAPIHandler），优于 tRPC

### 2.3 为什么 Drizzle 而非 Prisma

- **D1 / Edge Runtime 原生兼容**（Prisma 需要 Accelerate）
- 裸 SQL + 类型推导都强；Overlay Engine（派生 `current_due_date`）需要直写 SQL
- Bundle 体积小（对 Worker 体积敏感场景有正向影响）
- 迁移 SQL 手写在 `packages/db/migrations`（编号 + meta journal），由 `wrangler d1 migrations apply` 应用；`drizzle-kit` 保留 D1 方言配置与 `db:generate` 兜底，不作为日常迁移生成器

### 2.4 为什么 better-auth 而非 Auth.js

- 原生支持 Hono + Cloudflare Workers
- **Organization plugin** 开箱提供 Firm / Member / Invitation / Active-org / Role 全套，PRD §3.6 Team 模型零自建
- **Access Control plugin** 做四角色（owner / manager / preparer / coordinator）per-permission 矩阵
- Drizzle adapter 一等支持
- 数据自持（不像 Clerk 把账号数据锁在第三方）

### 2.5 为什么 D1（SQLite）是架构核心选择

D1 是 Cloudflare Worker 的**原生绑定 + SQLite 语义**：同一个 API 在 miniflare 和线上使用，避免本地 Node DB 与线上 Edge DB 的漂移。对 DueDateHQ 的 workload（多租户 · 小数据量 · 点查询 · 边缘延迟敏感），它是**正确选择**而非 MVP 妥协：

| 特性             | D1                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 数据规模契合     | 目标 ICP 单 firm 数据量小；4 周 MVP 预期 < 50 firms、每 firm 20–300 clients，远低于 10 GB。到 1000 firms 时必须用实际 `D1 storage_bytes` 监控决定是否按 firm/region 分库，不能假设单库长期承载所有租户 |
| 查询模式契合     | 全部是 `WHERE firm_id = ?` 点查询 + 范围扫，无复杂 OLAP                                                                                                                                                |
| 读写复制         | 可使用 D1 read replication / sessions 提升读延迟；一致性关键路径用 primary/session，不把 replica 当正确性边界                                                                                          |
| 灾备             | Time-Travel 30 天任意点恢复                                                                                                                                                                            |
| Drizzle 一等支持 | `drizzle-orm/d1`                                                                                                                                                                                       |
| 本地 / 线上一致  | miniflare 提供同一 D1 binding API，dev 代码无需改                                                                                                                                                      |
| 成本             | MVP 阶段免费额度覆盖                                                                                                                                                                                   |
| 事务             | `d1.batch()` 是事务化批处理：语句顺序执行，任一失败则整批回滚；每条语句仍受 D1 限制（如 100 bound parameters / 100 KB SQL），整次 Worker invocation 也受查询数限制                                     |

**工程纪律（约束而非限制）：**

- 所有列表强制分页（单查询返回 ≤ 10 万行硬顶）
- Migration / Pulse batch 分批 commit；每批优先控制在 100–200 prepared statements，并避免单 statement 绑定参数超过 100
- 长计算拆 Queue / Workflow（单 request CPU 上限）
- 无原生向量 → Vectorize
- 无原生 JSON 索引 → 反范式冗余

**Postgres 退路（极端情况，非默认路径）：** 如果后续真落到"跨租户 OLAP + 单库 > 10 GB + 深嵌套分析型 join"，先评估 per-firm / per-region D1 分库；仍不满足时走 Hyperdrive + Neon + Drizzle `neon-http` 方言切换。`packages/db` 是唯一 schema/query 入口，业务层尽量零感知，但 schema 方言、JSON、时间字段和迁移脚本仍需要专项迁移验证。

### 2.6 为什么 Vite+ 统一工具链（取代 Turbo + 独立 oxlint/oxfmt/vitest）

Vite+ (`vite-plus`) 把 **Vite 8 + Vitest + Oxlint + Oxfmt + Rolldown + tsdown + Vite Task** 打包成一个 dep + 一个全局 CLI `vp`。对 DueDateHQ 我们需要的是"零胶水 + 快反馈 + 缓存正确"：

- **一个入口**：`vp check / test / build / run -r` 替代五套 CLI 拼接；单 binary 跑完 fmt + lint + typecheck（tsgolint 走 `@typescript/native-preview`），本地 < 3s。
- **原生 Vite Task 缓存**：content-based，自动追踪源文件 + `vite.config.ts` + `package.json`；不需要手动维护 `outputs` 数组。Turbo 的 pipeline 概念 1:1 映射为 `run.tasks`。
- **统一 staged hook**：`staged` 块取代 lefthook + lint-staged；`vp` 安装的 git hook 只调 `vp check --fix`，多工具串联的顺序问题消失。
- **Vite 主体升级自动带动 Vitest / Rolldown**：以前升 Vite 经常踩 Vitest 生态错位，`vite-plus` 作为同一 release train 消除这种风险。

### 2.7 为什么仍保留 `@typescript/native-preview`

- TypeScript 6.x 是稳定编译器基线；TypeScript 7 的 Go 原生实现通过 `@typescript/native-preview` 提供 `tsgo` / `tsgolint` 入口。Vite+ 的 `vp check` 在 `lint.options.typeCheck: true` 时内部用 tsgolint，依赖这个包。
- 保留 `typescript` 包本身，因为编辑器 tsserver、Vite 解析、类型提示仍然读取它。
- 不再保留独立 `check-types` / `check-types:stable` 脚本 —— 统一到 `vp check`；需要稳定 `tsc --noEmit` 时临时 `pnpm -F <pkg> exec tsc --noEmit` 足够。

### 2.8 为什么 Base UI 作 shadcn 原语

- Base UI 是 Radix 团队（与 MUI 合并后）的下一代产品
- shadcn 4.x 官方一等支持：`components.json` 设 `"style": "base-vega"` 即可
- 打包体积比 Radix 小约 30%（对单 Worker SPA 有微正向）
- 键盘 / RTL / ARIA 严格度更高（对齐 Keyboard-first 设计铁律）

---

## 3. 版本策略：pnpm catalog 集中锁定 · 全量 pinned

**单一事实来源：`pnpm-workspace.yaml` 的 `catalog`**。workspace 内所有 `package.json` 通过 `"catalog:"` 协议引用版本，不直接写版本号。

- **每一个 catalog 条目都是精确版本**（例：`hono: 4.12.14`）。禁止 `^`、`~`、`latest`、`*`。`saveExact: true` 在 `pnpm-workspace.yaml` 里强制后续 `pnpm add` / `vp add` 都写精确版本。
- **升级**：直接改 `pnpm-workspace.yaml` 的 catalog 条目 → `pnpm install`（或 `vp install`）自动传播到所有引用包，生成的 lockfile 作为审计证据。
- **workspace 包引用**：`"hono": "catalog:"`（主 catalog）或 `"hono": "catalog:canary"`（命名 catalog，给 canary 分组用，Phase 0 暂不启用）。
- **Renovate 持续升级（规划中，尚未接入——仓库目前没有 renovate 配置，升级仍为手动改 catalog）**：接入后只对 `pnpm-workspace.yaml` 的 catalog 字段自动起 PR。patch / minor 合并自动化，major 升级单独 PR + CODEOWNERS review，重点关注：Vite+ / Drizzle / Hono / oRPC / better-auth / React / Tailwind / Wrangler。

**约束：**

- **禁止**在 `apps/*/package.json` 或 `packages/*/package.json` 里写具体版本号（除 workspace 互相引用 `"@duedatehq/db": "workspace:*"` 外）
- 所有外部依赖必须 `"catalog:"` 或 `"catalog:<name>"` 引用
- Oxlint 规则（由 `vp check` 驱动）+ pre-commit 扫描脚本校验 `^` / `~` / `latest` 不出现在任何 workspace `package.json`

---

## 4. 根配置文件（约束项）

### 4.1 `pnpm-workspace.yaml`

pnpm 11 只从 `.npmrc` 读取 auth / registry 类配置；workspace 配置统一放在这里，**不要再写 `.npmrc` 作为项目配置源**。catalog 也定义于此。

实际 `pnpm-workspace.yaml` 的版本号**全部**精确锁定。下面只保留 Phase 0 关键摘录；完整权威清单以仓库根的 `pnpm-workspace.yaml` 为准。

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

# pnpm 11 settings
saveExact: true
autoInstallPeers: true
dedupePeerDependents: true
strictPeerDependencies: false
linkWorkspacePackages: true
preferWorkspacePackages: true

allowBuilds:
  esbuild: true
  '@swc/core': true
  sharp: true
  workerd: true
  core-js: false
  protobufjs: false

# ============================================================
# Catalog · 全部精确版本；禁止 ^ / ~ / latest
# ============================================================
catalog:
  # ── runtime core ──
  typescript: 6.0.3
  '@typescript/native-preview': 7.0.0-dev.20260429.1
  '@types/node': 25.6.0

  # ── frontend（由 vite-plus 统一驱动） ──
  react: 19.2.5
  react-dom: 19.2.5
  '@types/react': 19.2.14
  '@types/react-dom': 19.2.3
  react-router: 7.14.2
  '@vitejs/plugin-react': 6.0.1 # vite-plus 内部使用 vite 8 + rolldown
  astro: 6.1.8
  '@astrojs/sitemap': 3.7.2
  '@astrojs/check': 0.9.8
  tailwindcss: 4.2.4
  '@tailwindcss/vite': 4.2.4
  lucide-react: 1.14.0
  class-variance-authority: 0.7.1
  tailwind-merge: 3.5.0
  tw-animate-css: 1.4.0
  clsx: 2.1.1
  foxact: 0.3.1

  # ── state / form ──
  '@tanstack/react-query': 5.100.6
  '@tanstack/react-form': 1.29.3
  '@tanstack/react-hotkeys': 0.10.0
  '@tanstack/react-table': 8.21.3
  '@tanstack/react-virtual': 3.13.24
  zustand: 5.0.12
  nuqs: 2.8.9
  zod: 4.3.6

  # ── animation ──
  motion: 12.38.0
  canvas-confetti: 1.9.4
  react-odometerjs: 3.1.3

  # ── backend ──
  hono: 4.12.15
  '@hono/zod-validator': 0.7.6

  # ── oRPC ──
  '@orpc/contract': 1.14.0
  '@orpc/server': 1.14.0
  '@orpc/client': 1.14.0
  '@orpc/tanstack-query': 1.14.0
  '@orpc/openapi': 1.14.0

  # ── auth ──
  better-auth: 1.6.9
  '@better-auth/stripe': 1.6.9
  stripe: 22.1.0

  # ── db ──
  drizzle-orm: 0.45.2
  drizzle-kit: 0.31.10

  # ── ai ──
  ai: 6.0.169
  ai-gateway-provider: 3.1.3

  # ── infra / transport ──
  resend: 6.12.2
  postal-mime: 2.7.4
  '@react-email/components': 1.0.12
  '@sentry/cloudflare': 10.50.0
  posthog-js: 1.372.5

  # ── cloudflare ──
  wrangler: 4.86.0
  '@cloudflare/workers-types': 4.20260426.1

  # ── dev tooling（Vite+ 一统） ──
  # Keep Vite+ pinned at the last CI-green release until the Astro build regression is fixed.
  vite-plus: 0.1.22
  vite: npm:@voidzero-dev/vite-plus-core@0.1.22
  vitest: npm:@voidzero-dev/vite-plus-test@0.1.22
  '@cloudflare/vitest-pool-workers': 0.14.9
  '@playwright/test': 1.59.1
  msw: 2.13.6

# 命名 catalog 保留接口；Phase 0 暂不启用
# catalogs:
#   canary:
#     react: 19.2.0-canary
```

> **说明**：不再在 catalog 里放 `turbo`、`oxlint`、`oxfmt`、`lefthook`；`vite` / `vitest` 保留为 workspace override alias，统一指向 Vite+ release train。已显式从 Phase 0 移除：`vite-plugin-pwa`、`workbox-window`、`web-push`（见 §1 PWA 降级）。

### 4.2 workspace 包 `package.json` 示例（约束形态）

```json
{
  "name": "@duedatehq/server",
  "private": true,
  "type": "module",
  "dependencies": {
    "hono": "catalog:",
    "@orpc/server": "catalog:",
    "@orpc/contract": "catalog:",
    "better-auth": "catalog:",
    "drizzle-orm": "catalog:",
    "resend": "catalog:",
    "@duedatehq/contracts": "workspace:*",
    "@duedatehq/db": "workspace:*",
    "@duedatehq/core": "workspace:*",
    "@duedatehq/ai": "workspace:*",
    "@duedatehq/auth": "workspace:*"
  },
  "devDependencies": {
    "wrangler": "catalog:",
    "@cloudflare/workers-types": "catalog:",
    "typescript": "catalog:",
    "vite-plus": "catalog:",
    "@cloudflare/vitest-pool-workers": "catalog:"
  }
}
```

### 4.3 根 `package.json`（骨架 · Vite+ 驱动）

```json
{
  "name": "duedatehq",
  "private": true,
  "engines": { "node": ">=22.19.0" },
  "packageManager": "pnpm@11.3.0",
  "scripts": {
    "ci": "vp check && vp run -r test && vp run build",
    "ready": "vp check && vp run -r test && vp run build",
    "dev": "vp run -r dev",
    "build": "vp run @duedatehq/app#build && vp run @duedatehq/server#build && vp run @duedatehq/marketing#build",
    "check": "vp check",
    "test": "vp run -r test",
    "format": "vp fmt --check",
    "format:fix": "vp fmt --write",
    "deploy": "vp run workspace-deploy",
    "deploy:ci": "vp run workspace-publish"
  },
  "devDependencies": {
    "vite-plus": "catalog:",
    "typescript": "catalog:",
    "@typescript/native-preview": "catalog:"
  }
}
```

`vp check` 内部等价于 `oxfmt --check` + `oxlint` + `tsgolint`（当 `lint.options.typeCheck: true` 时）。Git hooks 也由 `vp` 管理（见 §4.4 `staged` 块）。

### 4.4 根 `vite.config.ts`（Vite+ 任务图 + staged）

取代 `turbo.json` + `lefthook.yml` + `oxlintrc.json` + `oxfmt.toml`：

```ts
import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    options: {
      typeAware: true, // oxlint type-aware 规则
      typeCheck: true, // vp check 里跑 tsgolint
    },
  },
  run: {
    cache: { scripts: false, tasks: true },
    tasks: {
      'workspace-build': {
        command: 'vp run build',
        cache: false,
        dependsOn: ['workspace-check'],
      },
      'workspace-check': {
        command: 'vp check',
        env: ['NODE_ENV'],
      },
      'workspace-test': {
        command: 'vp run -r test',
        env: ['NODE_ENV', 'CI'],
      },
      'workspace-publish': {
        command:
          'pnpm cf:ensure-queues && pnpm db:migrate:remote && vp run @duedatehq/server#deploy && vp run @duedatehq/marketing#deploy',
        cache: false,
      },
      'workspace-deploy': {
        command: 'vp run workspace-publish',
        cache: false,
        dependsOn: ['workspace-build', 'workspace-test'],
      },
    },
  },
  // 取代 lefthook + lint-staged
  staged: {
    '*': 'vp check --fix',
    'DESIGN.md': 'npx --yes @google/design.md lint',
  },
})
```

**备注**：

- `apps/marketing` 是公开站部署单元；可以用 Cloudflare Pages direct upload 或 static Worker。root `deploy` 负责把它和 SaaS Worker 串起来。
- `apps/server` 的 `wrangler deploy` 不走 Vite+ bundling；root `deploy` 先跑有序 build + Queue preflight + D1 迁移，再调度 server deploy。CI staging 在 `ci` job 已经完成 check/test/build 后，下载 app/marketing build artifact 并只运行 `deploy:ci` / `workspace-publish`。Queue preflight 从 `apps/server/wrangler.toml` 解析 producer/consumer/DLQ 名称并只创建缺失 Queue；D1 迁移脚本从 `DB` binding 解析目标，`--local` / `--remote` 决定目标是本地 Miniflare SQLite 还是 Cloudflare D1。
- `run.cache.scripts` 保持 Vite+ 默认 `false`，避免 build 缓存命中但 `apps/app/dist` 未真实存在。
- Secrets 扫描仍用 `gitleaks`（外部 CLI，通过 GitHub Action 跑；本地不入 hook 以保持 pre-commit < 3s）。

### 4.5 Runtime env / secrets（完整清单）

本仓没有 root `.env.example` 作为 Worker 运行时来源。开发环境复制
`apps/server/.dev.vars.example` 到 `apps/server/.dev.vars`；该文件只被 `wrangler dev`
读取，且已 gitignore。GitHub Actions / Cloudflare staging 使用 GitHub environment secrets
经 Wrangler `--secrets-file` 注入 Worker，不从仓库文件读取 secret。

```bash
# ───────── App ─────────
ENV=development
AUTH_URL=http://localhost:8787  # 本 Worker origin（/api/auth/* 与公开 API 所在）
APP_URL=http://localhost:5173   # 浏览器 SPA origin；dev 走 Vite 5173，prod 即 Worker 本身

# ───────── Cloudflare Bindings（由 wrangler.toml 注入到 Worker）─────────
# 本地 dev 由 miniflare 提供；此处仅供参考
# DB           (D1)
# CACHE        (KV)
# RATE_LIMIT   (Rate Limit binding)
# R2_PDF       (R2 bucket)
# R2_MIGRATION (R2 bucket)
# R2_AUDIT     (R2 bucket)
# R2_PULSE     (R2 bucket)
# VECTORS      (Vectorize index)
# EMAIL_QUEUE  (Queues producer)
# PULSE_QUEUE  (Queues producer)
# DASHBOARD_QUEUE (Queues producer)
# AUDIT_QUEUE  (Queues producer)
# ASSETS       (Static Assets binding)
# 非密钥运行配置（OPS_ALERT_EMAIL / AI_SYSTEM_DAILY_LIMIT / ENABLE_PUBLIC_DEMO 等）
# 直接定义在 wrangler.toml [vars]

# ───────── Auth ─────────
AUTH_SECRET=        # openssl rand -base64 32
GOOGLE_CLIENT_ID=   # public OAuth client id; Worker exposes it through /api/auth-capabilities for One Tap
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=    # 可选：Microsoft Entra ID OAuth（Outlook / M365 firm），三项需成对配置
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common

# ───────── AI SDK（经 Cloudflare AI Gateway）─────────
# 单一模型贯穿所有档位（plan-based 路由已退役）；档位差异只在 reasoning effort：
# quality 任务（pulse/rule/brief/insights）effort=high，fast 任务（CSV mapper/normalizer/readiness）effort=low
AI_GATEWAY_ACCOUNT_ID=
AI_GATEWAY_SLUG=duedatehq
AI_GATEWAY_PROVIDER=openrouter
AI_GATEWAY_PROVIDER_API_KEY=  # OpenRouter token；OpenRouter Provider Native 路径唯一必需 AI secret
AI_GATEWAY_MODEL_FAST_JSON=google/gemini-3.5-flash
AI_GATEWAY_MODEL_QUALITY_JSON=google/gemini-3.5-flash
AI_GATEWAY_MODEL_REASONING=google/gemini-3.5-flash
AI_GATEWAY_QUALITY_REASONING_EFFORT=high
AI_GATEWAY_FAST_REASONING_EFFORT=low
AI_GATEWAY_API_KEY=           # 仅 Authenticated Gateway / Unified provider 需要

# ───────── Mail ─────────
# Optional until a runtime path actually sends auth or product email.
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
EMAIL_FROM=noreply@langgenius.app

# ───────── Pulse fetch 兜底（可选）─────────
PULSE_BROWSERLESS_URL=        # WAF 403 / JS 渲染源走 Browserless /content
PULSE_BROWSERLESS_TOKEN=
PULSE_BROWSERLESS_SOURCE_IDS= # 免代码改 fetcher 的源覆盖名单

# ───────── Stripe（better-auth subscription；计费联调前可空）─────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=     # 其余 STRIPE_PRICE_<PLAN>_<CYCLE> 见 .dev.vars.example

# ───────── E2E（仅本地 dev；解锁 /api/e2e/* demo-login / seed）─────────
E2E_SEED_TOKEN=

# ───────── Observability ─────────
SENTRY_DSN=
POSTHOG_KEY=

# ───────── Cloudflare CLI auth（仅 CI / 本地 deploy 用；放 root `.env`，不进 .dev.vars）─────────
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
```

机密**永不进仓库**；`apps/server/.dev.vars` 给本地 Worker 开发；线上通过 GitHub
environment secrets 或 `wrangler secret put` 写入 Worker secrets。前端 SPA 目前没有 AI 相关
`VITE_*` 配置。

---

## 5. 风险与降级矩阵

| 依赖                | 挂了怎么办                                                                                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 主区             | 读路径可用 D1 Session / read replica 降级；写路径停止关键变更并进入只读模式，必要时把用户意图写 Queue/R2 outbox 后人工确认重放                                                                                  |
| Vectorize           | RAG 降级为 D1 FTS5 全文检索兜底（精度下降但可用）                                                                                                                                                               |
| AI SDK / AI Gateway | `packages/ai` 返回 structured refusal；Migration mapper 无 AI 时降级到 preset / all-ignore，normalizer 走本地字典兜底，业务模块不直接碰 provider key                                                            |
| Resend              | 写 `email_outbox` + Queue 重试；用户 in-app 通知兜底。`RESEND_API_KEY` 可先不配，但实际发邮件路径必须配置；退信/失败回写还需要 `RESEND_WEBHOOK_SECRET` 和 `https://app.due.langgenius.app/api/webhook/resend`。 |
| KV                  | 限流退化为 DB 计数（~200ms 成本）；缓存退化为直查                                                                                                                                                               |
| Queues              | 紧急降级为 `scheduled()` 里直接处理，牺牲并行度                                                                                                                                                                 |
| R2                  | PDF 降级为同步生成 + stream 返回                                                                                                                                                                                |
| Worker 单区故障     | Cloudflare 全球自动路由；无需人工介入                                                                                                                                                                           |

---

继续阅读：[02-System-Architecture.md](./02-System-Architecture.md)
