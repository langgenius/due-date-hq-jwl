# 07 · DevOps · Testing · Observability

> 最后核对：2026-06-10

> 目标：**公开站与 SaaS app 一键发布到 Cloudflare · 测试金字塔清晰 · 可观测三件套（logs / errors / traces）全覆盖。**

---

## 1. 环境拓扑

| 环境           | Marketing                            | SaaS Worker                                | D1                    | KV / R2 / Vectorize | 触发                             |
| -------------- | ------------------------------------ | ------------------------------------------ | --------------------- | ------------------- | -------------------------------- |
| **local**      | `astro dev` (`apps/marketing`)       | `wrangler dev`（miniflare）                | `--local` SQLite 文件 | miniflare 内置      | `vp run -r dev`（或 `pnpm dev`） |
| **production** | static Worker (`due.langgenius.app`) | Worker + Assets (`app.due.langgenius.app`) | `due-date-hq-staging` | staging bindings    | `main` push / `pnpm deploy`      |

当前生产 URL 是 `https://due.langgenius.app` 与 `https://app.due.langgenius.app`。当前阶段不维护
`[env.staging]` / `[env.production]`；Cloudflare bindings 不会从 top-level 继承到 `[env.*]`。
如果后续恢复独立 staging / production 环境，需要为每个环境单独补齐完整 D1 / KV / R2 /
Queue / Vectorize 绑定，不要依赖继承。

---

## 2. CI/CD 流水线（GitHub Actions）

### 2.1 CI 管线（`.github/workflows/ci.yml` + `e2e.yml` + `i18n-catalog-drift.yml`）

| 步骤                                                                    | 工具                         | 失败影响              |
| ----------------------------------------------------------------------- | ---------------------------- | --------------------- |
| `vp install --frozen-lockfile`                                          | Vite+ (`vp`) 代理 pnpm       | block                 |
| `vp run ci` = check + generated drift + test + build                    | 见下行拆解                   | block                 |
| ├ `vp check`（fmt + lint + tsgolint，`&&` 短路）                        | Oxfmt / Oxlint / tsgolint    | block（并掩盖后续层） |
| ├ `pnpm generated:check`（隔离重建并比对 generator-owned output）       | Node generator contract      | block                 |
| ├ `vp run -r test`（Vitest + pool-workers）                             | Vitest                       | block                 |
| └ `vp run build`（app → server dry-run → marketing）                    | Vite 8 / Rolldown / wrangler | block                 |
| `gitleaks detect --source . --no-git --redact`（在 `vp run ci` 之后）   | gitleaks                     | block                 |
| 上传 staging build artifact（仅 main push）                             | actions/upload-artifact      | block                 |
| E2E 全量 suite（独立 `.github/workflows/e2e.yml`，并行运行）            | Playwright                   | 独立 status check     |
| Lingui catalog drift（独立 `.github/workflows/i18n-catalog-drift.yml`） | lingui + git diff            | 独立 status check     |

`vp check` 默认同时跑 oxfmt / oxlint / tsgolint（由 `vite.config.ts` 的 `lint.options.typeCheck: true` 启用）。注意 `vp run ci` 内部 `&&` 短路：format 红会掩盖 type / test / build 的红。需要稳定 `tsc --noEmit` 时临时 `pnpm -F <pkg> exec tsc --noEmit` 即可，不进 CI 默认路径。

Lingui drift gate 的步骤是：`vp run @duedatehq/app#i18n:extract`（`lingui extract --clean`）→
`vp run @duedatehq/app#i18n:compile`（`lingui compile --strict`）→
`git diff --exit-code -- apps/app/src/i18n/locales`。要求所有 message 已翻译且 `.po` + 编译产物
`.ts` 均已提交、可幂等重建。

### 2.2 Staging 管线（当前阶段：main push 自动部署，按改动路径门控）

- 触发：`main` push 后，GitHub Actions `deploy-staging` job 使用 `due-date-hq-staging`
  environment；维护者本地仍可执行 `pnpm deploy`。
- 路径门控：不是 workflow 级 `paths:` filter，而是 `ci.yml` 里的 `staging_change_filter`
  job 用 `git diff <before>..<sha>` 比对改动文件，只有命中
  `apps/app/* | apps/server/* | apps/marketing/* | packages/* | scripts/*` 或根构建文件
  （`.github/workflows/ci.yml`、`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、
  `tsconfig.json`、`vite.config.ts`）才输出 `deploy=true`；`before` commit 不可得时保守地默认
  部署。纯 docs push 即使绿也不会触发 staging deploy。
- 并发：PR run 会 cancel stale run；`main` push 不会 cancel 已开始的部署，只会按同一
  concurrency group 排队，避免 D1 迁移或 Worker deploy 已执行后被 GitHub 中途取消。
- 步骤：
  1. `ci` job 执行 `vp install --frozen-lockfile`、`vp run ci`、secret scan，并上传
     `apps/app/dist` + `apps/marketing/dist` staging build artifact
  2. `deploy-staging` job 下载 build artifact，并执行 `vp run deploy:ci`
  3. `workspace-publish` 运行 Queue preflight、D1 migration、server Worker deploy、marketing
     deploy；不再重复 `workspace-check` / `workspace-test` / `workspace-build`
  4. 本地 `pnpm deploy` 仍走 `workspace-deploy`，先运行 `workspace-check`、`workspace-test` 和
     `workspace-build`：先 build `apps/app`，再跑 `apps/server` Wrangler dry-run，最后 build
     独立的 `apps/marketing`
  5. Queue preflight `pnpm cf:ensure-queues`：读取 `apps/server/wrangler.toml` 中的
     `queues.producers` / `queues.consumers` / `dead_letter_queue`，用 Wrangler 只创建缺失
     的 Queue 资源
  6. D1 迁移 `pnpm db:migrate:remote`（从 `apps/server/wrangler.toml` 的 `DB` binding 解析
     `due-date-hq-staging`，并显式带 `--remote`）
  7. `wrangler deploy --env=""` 发布 SaaS Worker + SPA assets
  8. Deploy marketing static Worker，CTA 指向 `https://app.due.langgenius.app`

**Staging 资源前置条件：**

- `apps/server/wrangler.toml` 中声明的 D1 / KV / R2 / Vectorize 资源必须已在
  Cloudflare account 中存在；CI 只应用 D1 migration、确保 Queue 资源存在、并部署 Worker。
- Queue 资源不是 secret，不需要新增 GitHub Actions secret。`pnpm cf:ensure-queues` 是
  幂等 preflight；新增 Queue binding 后不需要手工跑一次 `wrangler queues create`。
- 本地检查 Queue 清单可用：

```bash
node scripts/ensure-cloudflare-queues.mjs apps/server/wrangler.toml --dry-run
```

后续自动化项：better-auth 迁移、生产只读 smoke、marketing SEO smoke、rollback runbook。
Worker 失败时优先 `wrangler rollback`；若已应用 DB migration，只能回滚到仍兼容新 schema 的上一版
Worker，禁止依赖删列式 rollback。
Marketing 失败时回滚 static Worker 版本；不得影响 `app.due.langgenius.app` 的 auth / RPC。

**DB migration 纪律：**

- 编写流程：直接手写编号 SQL 文件到 `packages/db/migrations/`（当前至 `0075_*`），并同步修改
  `packages/db/src/schema/*.ts`；由 Wrangler 应用——`pnpm db:migrate:local` /
  `pnpm db:migrate:remote`（`apps/server/wrangler.toml` 的 `migrations_dir =
"../../packages/db/migrations"`，已应用记录由 wrangler 自己的 `d1_migrations` 表跟踪）。
  drizzle-kit、`db:generate` 与 `migrations/meta/` journal 已于 2026-06-10 移除；迁移一律手写。
- 所有 production migration 必须 forward-compatible：新增 nullable/default 字段、先双写、后读新字段、最后单独 release 清理旧字段。
- 禁止在同一 release 中 `DROP COLUMN` / 重命名热字段 / 收紧 NOT NULL，除非已有 backfill + 双版本兼容窗口。
- 每个 destructive migration 必须附 `docs/ops/runbooks/d1-migration-rollback-<slug>.md`，写清 Time Travel 恢复点、数据导出、验证 SQL 和业务降级方式。
- Preview / staging DB 可自动重建；production 只做可审计迁移。

### 2.3 Secret 注入

- GitHub environment `due-date-hq-staging` secrets（必填，deploy job 启动时校验）：
  `CLOUDFLARE_API_TOKEN` · `AUTH_SECRET` · `GOOGLE_CLIENT_SECRET` · `STRIPE_SECRET_KEY` ·
  `STRIPE_WEBHOOK_SECRET` · `STRIPE_PRICE_PRO_MONTHLY` · `STRIPE_PRICE_TEAM_MONTHLY` ·
  `PULSE_BROWSERLESS_TOKEN` · `AI_GATEWAY_PROVIDER_API_KEY`。可选（存在即随
  `--secrets-file` 上传）：`RESEND_API_KEY`、`RESEND_WEBHOOK_SECRET`、
  `STRIPE_PRICE_PRO_YEARLY`、`STRIPE_PRICE_FIRM_MONTHLY`、`STRIPE_PRICE_FIRM_YEARLY`；
  X social 的 `X_API_KEY`、`X_API_SECRET`、`X_ACCESS_TOKEN`、
  `X_ACCESS_TOKEN_SECRET`、`SOCIAL_OPS_TOKEN` 也按需存在即上传；四项 X OAuth credential
  all-or-none，`SOCIAL_OPS_TOKEN` 独立。默认 `X_POSTING_MODE=draft`，所以未配置 X credential
  不阻塞部署，但 deployed Social Ops 会在 token 缺失时 fail closed。
  `AI_GATEWAY_API_KEY` 仅在启用 Cloudflare Authenticated Gateway 或切回 Unified provider
  时使用。注意：CI deploy 当前**不**传 `STRIPE_PRICE_SOLO_*` 与 `STRIPE_PRICE_TEAM_YEARLY`
  （代码仍支持这些 env，要启用须把对应 secret 加回 `ci.yml`）。
- Resend staging 发送域是 `langgenius.app`，Worker `EMAIL_FROM` 当前为
  `noreply@langgenius.app`。Resend 里必须先验证 `langgenius.app` 的 SPF/DKIM DNS 记录；
  delivery callback endpoint 指向 `https://app.due.langgenius.app/api/webhook/resend`，并把该
  endpoint 的 signing secret 写入 `RESEND_WEBHOOK_SECRET`。只配置 `RESEND_API_KEY` 可以发送，
  但不会启用退信/失败回写；CI staging deploy 会在任一 Resend secret 存在时要求
  `RESEND_API_KEY` 和 `RESEND_WEBHOOK_SECRET` 成对配置，避免半配置上线。
- Stripe staging 可以使用 Test mode：`STRIPE_SECRET_KEY` 使用 `sk_test_*`，
  `STRIPE_PRICE_PRO_MONTHLY` 和 `STRIPE_PRICE_TEAM_MONTHLY` 使用同一 test mode 下创建的
  recurring price id。Solo checkout 只有在对应 `STRIPE_PRICE_SOLO_*` price id 存在时才启用；
  Team yearly checkout 只有在 `STRIPE_PRICE_TEAM_YEARLY` 存在时才启用（CI deploy 当前不传
  这两组 secret，故 staging 上均未启用）；webhook endpoint 指向
  `https://app.due.langgenius.app/api/auth/stripe/webhook`，并把该 endpoint 的 signing
  secret `whsec_*` 写入 `STRIPE_WEBHOOK_SECRET`。Stripe test/live mode 的 API key、price id、
  webhook signing secret 互不通用；切 production live mode 时必须换成 live mode 的三件套。
- Cloudflare AI Gateway 本身需要存在 gateway slug `duedatehq`，`apps/server/wrangler.toml`
  写入 `AI_GATEWAY_PROVIDER=openrouter`、`AI_GATEWAY_MODEL_FAST_JSON`、
  `AI_GATEWAY_MODEL_QUALITY_JSON`、`AI_GATEWAY_MODEL_REASONING`（plan-based 路由已退役，
  三档当前同为 `google/gemini-3.5-flash`，靠 `AI_GATEWAY_QUALITY_REASONING_EFFORT` /
  `AI_GATEWAY_FAST_REASONING_EFFORT` 区分推理力度）、`AI_SYSTEM_DAILY_LIMIT`（系统级
  AI 调用日上限熔断）这类非 secret runtime vars。
  OpenRouter token 不写入 `wrangler.toml`，只放 `apps/server/.dev.vars`（本地）或 GitHub
  environment secret（staging deploy）。
- `CLOUDFLARE_ACCOUNT_ID` 当前固定为 LangGenius OPC account
  `8f7d374db5cb1f025b7f71e28b84c9bb`，不是 secret。
- `CLOUDFLARE_API_TOKEN` 必须覆盖 Workers deploy、D1 migrations，以及 Queues inspect/create；
  否则 Queue preflight 会在部署上传前失败。
- CI 将 GitHub environment secrets 写入临时 JSON，并通过 Wrangler `--secrets-file` 随 Worker
  deploy 上传到 Cloudflare；secret 文件只存在于 runner 临时目录，不进入仓库。

### 2.4 本地 Git hooks（pre-commit）

- `pnpm prepare`（= `vp config`，`vp install` 也会触发）生成 `.vite-hooks/` 并把
  `core.hooksPath` 指向 `.vite-hooks/_`；`.vite-hooks/pre-commit` 的内容就是一行 `vp staged`。
- `vp staged` 只接收 staged 文件，按根 `vite.config.ts` 的 `staged` 块执行：`'*'` →
  `vp check --fix`，`DESIGN.md` → `npx --yes @google/design.md lint`；全仓检查归 CI。
- 版本控制中的 `.vite-hooks/pre-push` 在 push 前运行 `pnpm run prepush`，即完整
  `pnpm run ci`（含 generated-artifact drift）再加已提交 `HEAD` 的 `git show --check`。它是
  本地第二层防线，hosted CI / required checks 仍是服务器端最终边界。
- agent 会话内禁止绕过：`.claude/settings.json` 注册了 PreToolUse(Bash) hook
  `.claude/hooks/no-verify-guard.sh`，对携带 `--no-verify` 的 `git commit` / `git push`，以及
  携带 `-n` 的 `git commit` 直接 deny（`git push -n` 只是 dry-run，保持允许）。这是 Claude
  Code 层守卫，不是 git 机制；commit message 里提到该 flag 不会误伤。守卫行为由
  `.claude/hooks/no-verify-guard.test.sh` 覆盖，并通过 `pnpm claude:guard:check` 纳入 CI。
- worktree 没有 node_modules 时先 symlink 主 checkout 的依赖再正常 commit，不要绕过 hook。

### 2.5 Generator contract

- `docs/integrations/cpa-tools/deploy/build.mjs --out-dir <dir>` 把 generator-owned
  HTML、`llms*.txt` 与 `sitemap.xml` 写入指定目录，并统一保留一个尾换行；默认仍写回
  `deploy/`。从 source HTML 抽取的纯文本字段会归一化 formatting whitespace，避免 formatter
  换行改变 `llms*.txt` 或 JSON-LD 的语义内容。
- `pnpm generated:check` 使用临时目录重建后逐字节对照已提交输出，也拒绝 generator 已不再
  产生的陈旧页面；检查过程中不修改工作树。
- 同一检查要求 `outreach-kit/.outreach-state.json` 保持 `JSON.stringify(value, null, 2)` 加一个
  尾换行的 canonical serialization。sender 与 outreach-state PR guard 使用相同契约。

---

## 3. 分支 / Release 策略

- 单一 `main` 分支
- Feature branch：`feat/<module>/<short>`（Demo Sprint 期简化：不强制 code review，merge squash；Phase 0 完整 MVP 起强制 1 人 review）
- 版本标签：语义化 `v0.1.0`；tag 触发 production deploy
- Hotfix：`hotfix/<issue>` → PR → squash → tag `v0.1.1`

---

## 4. 观测栈

### 4.1 三件套

| 维度     | 工具                                                                  | 接入点                                                                                                                                             |
| -------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 错误     | **Workers Logs**（结构化 console.log）                                | 全入口；Sentry 已于 2026-06-10 移除（依赖与 env 已删）                                                                                             |
| 日志     | **Workers Logs + Logpush**                                            | 结构化 JSON `console.log({ level, msg, firmId, ... })`；Logpush 到 R2 保留 90 天                                                                   |
| Trace    | **AI SDK telemetry + internal AI trace payload**                      | `packages/ai` 统一生成 usage / latency / guard metadata，写内部日志并可接 OpenTelemetry exporter                                                   |
| 指标     | **Cloudflare Analytics Engine**                                       | 关键业务事件（dashboard_view / pulse_apply / migration_import / rpc_latency）                                                                      |
| 产品分析 | **Amplitude**（前端 `@amplitude/analytics-browser`，gated lazy-load） | `VITE_AMPLITUDE_API_KEY` 开关，未设则全静默；事件 taxonomy 见 `apps/app/src/lib/analytics/events.ts`；firm 作为 B2B group type；事件契约见 12 §2.5 |

### 4.2 关键 SLO / 告警

| 指标                  | 阈值             | 告警                                                         |
| --------------------- | ---------------- | ------------------------------------------------------------ |
| Dashboard P95 latency | > 1.5s           | ops alert email（OPS_ALERT_EMAIL）                           |
| Worker error rate     | > 1% / 5min      | ops alert email（OPS_ALERT_EMAIL）                           |
| D1 query P95          | > 200ms          | Logpush 查询 + Slack                                         |
| AI fail rate          | > 5% / hour      | Workers Logs / Analytics Engine → ops alert mail             |
| Dashboard Brief DLQ   | 任意消息进入 DLQ | 参照 `docs/ops/dashboard-brief-queue-runbook.md`             |
| Email outbox stuck    | 未 flush > 5min  | Queue consumer 告警                                          |
| Pulse ingest idle     | Cron 未运行 > 2h | Cron health check                                            |
| X social backlog      | 最老 ready > 7d  | `social.x.backlog_stale` ops alert + Workers Logs            |
| X ambiguous publish   | 任意 `unknown`   | 停止重试；按 `docs/ops/x-daily-alert-publishing.md` 人工对账 |

### 4.3 Worker request observability

每个 Worker request 由 `requestIdMiddleware` 写入 `x-request-id` 并注入 Hono context。服务端错误日志统一
走 `apps/server/src/middleware/logger.ts` 的结构化 serializer，最小字段为：

| 字段        | 含义                                            |
| ----------- | ----------------------------------------------- |
| `level`     | 固定 `error`                                    |
| `event`     | 固定 `server_error`                             |
| `boundary`  | `hono` 或 `orpc`                                |
| `requestId` | 与响应头 `x-request-id` 对齐                    |
| `method`    | HTTP method；RPC procedure 日志可为空           |
| `path`      | HTTP path 或 `/rpc/<procedure path>`            |
| `procedure` | oRPC procedure dotted path；非 RPC 日志为空     |
| `status`    | HTTP / RPC error status；无 status 视为 500 类  |
| `firmId`    | active organization id                          |
| `userId`    | authenticated user id                           |
| `error`     | `name` / `message` / `stack` / `code` / `cause` |

日志边界分工：

- Hono `app.onError` 记录 Hono middleware、手写 route、`rpcHandler` 外层未捕获异常。
- oRPC `RPCHandler` interceptor 记录 procedure 执行阶段的 5xx 异常，并附 procedure path。
- 4xx 业务错误不作为 server error 输出；应返回明确 `ORPCError` 或写入对应领域错误表。

PII 约束：server error log 禁止写入 request body、RPC input、原始 CSV、证据 excerpt、邮箱、电话、EIN、
SSN、完整地址或完整税额。排障需要输入上下文时，先落领域错误表或审计表，并按对应 PII 策略脱敏。

---

## 5. 测试金字塔

### 5.1 结构

```
          ┌───────────────┐
          │  E2E (Playwright) · 核心产品闭环
          └───────┬───────┘
     ┌────────────┴────────────┐
     │  Integration · Vitest
     │  • oRPC procedure + scoped repo + D1（vitest-pool-workers）
     │  • Pulse / Migration 完整管线
     └────────────┬────────────┘
   ┌──────────────┴──────────────┐
   │  Unit · Vitest
   │  • packages/core（penalty / priority / date-logic）
   │  • packages/ai/guard（5 道闸）
   │  • 合约 Zod schema
   └─────────────────────────────┘
```

### 5.2 单测（`packages/core` 尤其重要）

- 所有 `packages/core` 函数必须有单测，覆盖率 ≥ 90%
- Glass-Box Guard 5 道闸每道 ≥ 3 条断言
- `packages/contracts` Zod schema 边界用例

### 5.3 集成测（`@cloudflare/vitest-pool-workers`）

- 运行在真实 Workers runtime
- 使用 miniflare 提供 D1 / KV / R2 / Vectorize mock
- 每个 procedure 至少 1 条 happy path + 1 条权限拒绝 + 1 条 validation 失败

### 5.4 E2E（Playwright）

当前基座落地在仓库根目录：

- `playwright.config.ts`：官方 Playwright Test 配置，本地启动两个 `webServer`——full-stack
  Worker（`127.0.0.1:8787`）与 marketing `astro preview`（`127.0.0.1:4321`，可用
  `E2E_MARKETING_BASE_URL` 覆盖）；单一 `chromium` project（1440×900）。
- `e2e/tests/**`：浏览器与 Worker smoke specs，测试名包含 `AC:` 元数据。
- `e2e/fixtures/**`：Playwright fixture 扩展点（seed 模式 `empty` / `obligations` / `pulse` /
  `mfa` / `mfaVerified` / `team` / `filingPlan`，角色 `owner` / `manager` / `preparer` /
  `coordinator`）。
- `e2e/pages/**`：轻量 Page Object，只放 locator 和用户动作。
- `.github/workflows/e2e.yml`：独立 E2E CI，和主 `ci.yml` 分离运行；写入占位 `.dev.vars`、
  只装 chromium、上传 Playwright report artifact。

当前已落地覆盖真实存在的无登录与本地登录态场景：Hono health、登录入口、受保护路由未登录跳转、
marketing `lng` handoff、入口语言切换、SPA 404 / router error boundary，以及通过
`/api/e2e/session` seed 的 Dashboard / Clients / Obligations / Team Workload / Rules / Members /
Billing / Firm Profile / Audit Log / Migration Step 1 / firm switch / billing checkout 与
webhook-backed success 流；另有 Pulse alert loop（apply / undo + RBAC）、统一角色权限边界
（manager / preparer / coordinator）、destructive 操作确认对话框、MFA challenge 路由，以及
marketing pricing → billing checkout handoff。真实 Google OAuth 和 Stripe 托管页 DOM 不进默认 CI。

除 Pulse 与 Dashboard 外，当前产品闭环 e2e 的重点是：

- Clients facts：手工创建、seeded readiness KPI、search + table-header URL facet
  筛选（client/entity/state/readiness/source/owner）、过滤空态，以及从列表打开 Fact
  Profile Sheet 核对客户事实。
- Team Workload：Solo 锁定升级面、Pro 计划真实 workload 聚合、unassigned 风险行、回跳
  Obligations 的 owner/due URL state。
- Audit Log：从 Obligations 状态写入触发审计，再按 action 打开详情 drawer 验证 before/after。
- Members：Firm 计划 seats、邀请/取消 pending invitation，以及成员操作写入 Audit Log。

本地默认命令：

```bash
pnpm test:e2e
```

默认会构建 `apps/app`，执行本地 D1 migrations，并以 `wrangler dev --local` 在
`http://127.0.0.1:8787` 服务 Worker + SPA；同时构建 `apps/marketing` 并以 `astro preview` 在
`http://127.0.0.1:4321` 提供 marketing 站。Wrangler 状态写入独立的 `--persist-to` 临时目录
（`E2E_WRANGLER_PERSIST_TO` 可覆盖），不污染开发用 `.wrangler` 状态。Playwright 默认不复用已有
dev server，避免测试误连到开发者手动启动且带真实 `.dev.vars` 的 Worker；确实需要复用时显式设置
`E2E_REUSE_EXISTING_SERVER=1`。若要打远端 staging（设 `E2E_BASE_URL` 后不再启动任何
`webServer`；带登录态的 specs 还要求 `E2E_SEED_TOKEN`，否则 fixture 直接抛错），可用：

```bash
E2E_BASE_URL=https://app.due.langgenius.app E2E_SEED_TOKEN=... pnpm test:e2e
```

对齐 PRD §12.3 Test ID，Phase 0 10 条核心路径：

| #   | PRD Test ID / AC                            | 路径                                                                                                                                 |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | —                                           | 新用户通过 Google OAuth 登录 → 看到空 Dashboard                                                                                      |
| 2   | **T-S1-01 / S1-AC1**                        | 登录后默认 Dashboard，选中 `This Week` tab                                                                                           |
| 3   | **T-S1-02 / S1-AC2**                        | 本周 obligations 左上 `[🔴 Nd]` 倒计时徽章                                                                                           |
| 4   | **T-S1-03 / S1-AC3**                        | 200 clients × 1000 obligations，三维筛选（CA + LLC + 1040）响应 < 1s                                                                 |
| 5   | **T-S1-04 / S1-AC4**                        | 行内 status 下拉改；500ms 内 + Undo toast                                                                                            |
| 6   | **T-S2-02 / S2-AC2** + **T-S2-04 / S2-AC4** | 粘贴 30 行 CSV（含 `Tax ID` 列，无 `tax_types` 列）→ EIN 格式化 + Default Matrix 兜底 → Live Genesis                                 |
| 7   | **T-S2-03 / S2-AC3**                        | CSV 5 行缺 `state` → 非阻塞，其余 25 行正常导入                                                                                      |
| 8   | **T-S3-03 + T-S3-04 / S3-AC3 + S3-AC4**     | Approved Pulse → Banner 打开 → Apply → 批量 UPDATE + Audit + 24h Undo + 邮件双渠道                                                   |
| 9   | **T-S3-05 / S3-AC5**                        | 任意 `[n]` citation → Dashboard Evidence Drawer 展开 source metadata + `official_source_url`，并可跳转 Obligations obligation        |
| 10  | **T-NOTIFY-email**                          | Pulse Apply 触发 `email_outbox` → Resend 测试 key 回执；in-app toast 在下一次 Dashboard 加载命中 banner slot（替代原 Web Push 场景） |

Phase 0 完整 MVP 追加覆盖（可用 integration test，不要求全部 E2E）：

| #   | PRD Test ID / AC     | 路径                                                                                       |
| --- | -------------------- | ------------------------------------------------------------------------------------------ |
| 11  | **T-S1-05 / S1-AC5** | 85 客户 seed，记录完成 triage session 的引导路径与耗时埋点                                 |
| 12  | **T-S2-01 / S2-AC1** | TaxDome preset CSV 命中 profile，字段映射 ≥ 95%                                            |
| 13  | **T-S2-05 / S2-AC5** | 30 客户 signup → import 完整链路，性能计时 P95 ≤ 30 min                                    |
| 14  | **T-S3-01 / S3-AC1** | mock 官方公告 T0 → ingest/extract/review feed 在 SLA 窗口内完成                            |
| 15  | **T-S3-02 / S3-AC2** | CA + LA + Individual + 1040 Pulse 精确匹配 12 个符合客户；county unknown 进入 needs_review |

附加的快速 smoke（不走完整 Test ID 流程）：

- 手动创建 1 个 LLC × CA 客户 → Obligations 出现 obligations
- Cmd-K 搜索客户 → Enter 跳转
- 退出登录 → 重定向

E2E 默认在 CI 对每个 push / PR 全量跑本地 Worker；打 staging 用 `E2E_BASE_URL` +
`E2E_SEED_TOKEN`，每次 release 前必跑。Test ID 覆盖率报告脚本 `scripts/ac-traceability.ts`
仍是规划项（见 §6，尚未落地）。

### 5.5 契约测

- `packages/contracts` 导出的每个 procedure 必须有 Zod schema 单测（边界值、错误输入）
- 契约改动必须 PR 打 `[contract]` 标签，前端 / 后端同步 approve

### 5.6 Marketing smoke

`apps/marketing` 上线前必须覆盖：

- `pnpm --filter @duedatehq/marketing build`
- 首页 HTML 包含 title、description、canonical、Open Graph、H1
- 每个 locale 输出正确 `html lang`、canonical、`hreflang`
- `404.html` 存在，带 `noindex`，并复用 marketing layout / nav / footer
- `robots.txt` / `sitemap.xml` 存在且不包含 `app.due.langgenius.app` 受保护页面
- CTA 链接指向 `PUBLIC_APP_URL`，不硬编码 localhost
- Playwright 截图覆盖 1440 / 768 / 390 三档，检查无文字重叠
- 无 JS 时正文和 CTA 可用；首版 JS transferred 目标 < 50 KB gz

---

## 6. AC Traceability 报告

- 每条 PRD AC（§3 矩阵 S1 / S2 / S3）对应 1 条 E2E 或 Integration 测试；7 天 Demo 允许只覆盖核心 10 条，但 Phase 0 完整 MVP 必须补齐上表 11–15
- 规划：脚本 `scripts/ac-traceability.ts` 扫 `tests/**` 里的 `// AC: T-S1-01` 注释，输出覆盖报告；CI 跑一次，缺 AC 覆盖发 warning
- **现状（2026-06-10）：该脚本尚未落地，CI 也没有对应步骤**；目前的约定只是 specs 头部的 `Feature` / `PRD` / `AC` 注释 + 测试名里的 `AC:` 元数据（见 `e2e/README.md`）

---

## 7. Feature Flags

- 环境变量（Worker）+ 代码常量；前端 flag 方案未定
- 约定：`ff_<phase>_<name>`，如 `ff_p1_ask_duedatehq`
- Kill switch：Worker 内用 `env.FF_AI_ENABLED === 'true'` 一键关闭 AI 调用（模型成本失控时）
- 移除时机：flag 开启 4 周稳定后移除代码

---

## 8. Cron / Queues Dev Loop

```
# 终端 1：Worker + miniflare
pnpm --filter @duedatehq/server dev

# 终端 2：手工触发 cron（miniflare）
curl 'http://localhost:8787/__scheduled?cron=*%2F30+*+*+*+*'

# 终端 3：手工投递 queue 消息（queue 名以 apps/server/wrangler.toml 为准）
wrangler queues producer send due-date-hq-email-staging '{"type":"test"}' --local
```

---

## 9. 数据迁移演练（Phase 1）

- D1 → Postgres（如需要）：每季度跑一次演练，staging 数据集完整 dump → 新建 pg → import → 跑 E2E 回归
- 记录时长 / 故障点 / 数据差异
- 演练报告存 `docs/ops/db-migration-drill-<date>.md`

---

## 10. 性能监控 SLO

详见 §00 §8 "关键性能目标"。重点 transaction（经 Workers Logs / Analytics Engine 观测）：

- `rpc.dashboard.load`
- `rpc.obligations.query`
- `rpc.migration.apply`
- `rpc.pulse.batchApply`

`rpc.dashboard.load` 当前是 Activation Slice v1 的首屏真实风险接口，SLO 关注 server aggregation
本身，不把前端本地派生计算计入业务口径。

Local Playwright E2E 启动 Wrangler 时只对该 Worker 子进程追加 `--var`：
`AI_GATEWAY_PROVIDER_API_KEY` / `AI_GATEWAY_API_KEY` 覆盖为空值，另注入确定性的 Stripe
测试占位（`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_SOLO|PRO|TEAM_*`
e2e 假 price id）。这样即使开发者本机 `apps/server/.dev.vars` 填了真实 OpenRouter token，E2E
也会走稳定 fallback，不写 `.dev.vars`、不修改 shell env、不消耗 provider tokens，也不把外部
模型延迟引入浏览器回归测试。除非设置 `E2E_REUSE_EXISTING_SERVER=1`，本地 E2E 不复用 8787
上已有服务。

---

## 11. 成本监控

- Cloudflare Dashboard：每日检查 Workers / D1 / R2 / AI Gateway 用量
- 月预算硬顶：MVP $50 / month；超预算发 email 告警
- AI 成本：Cloudflare AI Gateway usage + internal `ai_output` trace 按 firm 聚合，超 $0.05/firm/day 告警

---

## 12. 备份与恢复演练

- **D1**：Cloudflare time-travel（可恢复到过去 30 天任意点）；每月演练一次
- **R2**：桶启用 object versioning；90 天 retention
- **better-auth tables**：同 D1，由 time-travel 覆盖
- **恢复演练**：每季度模拟"D1 误删 clients 表"，走恢复流程，计时；目标 RTO < 30 min

---

## 13. 密钥轮换

| 密钥                       | 频率       | 流程                                                            |
| -------------------------- | ---------- | --------------------------------------------------------------- |
| `AUTH_SECRET`              | 90 天      | 临时双 secret 并存 → 验证 → 下线旧 secret                       |
| Resend API key             | 180 天     | 直接切换                                                        |
| Cloudflare API token       | 90 天      | GH Actions 更新                                                 |
| AI provider / gateway keys | 按合规要求 | 只在 `packages/ai` + Cloudflare AI Gateway 使用，切换时前端无感 |

---

## 14. 运维 Runbook

已存在（2026-06-10）：`docs/ops/runbooks/pulse-ingest-stuck.md`、
`docs/ops/runbooks/pulse-email-inbound.md`，以及 `docs/ops/dashboard-brief-queue-runbook.md`。

`docs/ops/runbooks/` 目标清单（其余仍待补）：

- `deploy-production.md`
- `rollback-production.md`
- `rotate-secret.md`
- `d1-recover.md`
- `pulse-ingest-stuck.md`（已有）
- `email-outbox-flood.md`
- `ai-cost-spike.md`

每个 runbook 格式：触发条件 · 诊断命令 · 修复步骤 · 验证方法 · Post-mortem 模板。

---

## 15. 文档与交付

- 架构文档变更与代码一起 PR（Doc-as-Code）
- 每次 production release 自动生成 changelog（Conventional Commits → `changesets` 或手写）
- 发布公告同步到 `/status`（Phase 1）

---

继续阅读：[08-Project-Structure.md](./08-Project-Structure.md)
