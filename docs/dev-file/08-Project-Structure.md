# 08 · Project Structure · 代码组织与命名约定

> 最后核对：2026-06-10

> 目标：**新人拉代码 10 分钟能跑起来 · 按路径能猜到内容 · 模块边界被类型系统和 lint 规则强制。**

---

## 1. 顶层目录（约束）

```
duedatehq/
├── apps/
│   ├── marketing/                 # Astro 公开站（landing / SEO / OG）
│   ├── app/                       # Vite React SPA（登录后的 SaaS 产品）
│   └── server/                    # Cloudflare Worker（SaaS API/RPC + app assets）
├── packages/
│   ├── i18n/                      # 共享 locale contract（常量/headers/Intl 映射）
│   ├── contracts/                 # oRPC 契约（前后端唯一共享源）
│   ├── ports/                     # 纯 TS 边界类型（repo / tenant ports，无运行时依赖）
│   ├── db/                        # Drizzle schema + scoped repo 工厂 + writers
│   ├── core/                      # 纯领域逻辑（penalty / priority / overlay / date-logic）
│   ├── ai/                        # RAG + prompts + guard + AI SDK gateway
│   ├── ingest/                    # Pulse 源适配器（IRS/州站 HTML/RSS/PDF fetch+parse，纯 TS，不依赖 DB）
│   ├── auth/                      # better-auth 配置（Organization + AC）
│   ├── ui/                        # 跨 app 共享 UI primitives、brand token、cn()
│   └── typescript-config/         # 共享 tsconfig（base / vite / worker / library）
├── docs/
│   ├── dev-file/                  # 当前架构事实（本目录 00~12；读者默认这是最新的）
│   ├── adr/                       # Architecture Decision Records（正式决策）
│   ├── dev-log/                   # 带日期的开发日志（`YYYY-MM-DD-<slug>.md`，只收事后记录）
│   ├── product-design/            # 前瞻工作文档，按 feature 分目录（deadlines / alerts / rules / migration-copilot …）
│   ├── PRD/                       # 产品需求文档
│   ├── Design/                    # 设计系统与界面 spec
│   ├── ops/                       # Runbook / 演练报告
│   └── IA/ · html/ · pitch-deck/ · report/                          # 信息架构 / 早期调研与演示等历史资产
├── scripts/                        # 运维 CLI（check-dep-direction / check-rule-sources / backfill-* / smoke 工具）
├── e2e/                            # Playwright E2E（tests / fixtures / pages，见 §8）
├── mock/                           # GENERATED demo.sql（packages/db/seed/generate-demo.ts 产出，勿手改）
├── .github/
│   └── workflows/
├── .agents/skills/                  # canonical project skills shared across agent clients
├── .claude/skills/                  # Claude skills plus bridges to canonical project skills
├── .vite-hooks/                    # tracked Vite+ pre-commit / pre-push entry scripts
├── CLAUDE.md                       # Claude Code completion and CI submission contract
├── pnpm-workspace.yaml
├── playwright.config.ts
├── vite.config.ts                  # Vite+ task graph / lint / fmt / staged
├── package.json
└── README.md
```

**docs/ 三层契约（2026-06-10 整理）**：`docs/dev-file/` = 当前事实（架构 / 接口 / 约束，读者默认最新）；`docs/adr/` = 正式架构决策（提案 / 状态 / 后果）；`docs/dev-log/` = 带日期的历史日志（`YYYY-MM-DD-<slug>.md`，只收事后记录，可能描述已被取代的状态——与代码或 dev-file 冲突时以后者为准）。前瞻性工作文档（实现 spec、eng-brief、roadmap、position memo）放 `docs/product-design/<feature>/` 或 `docs/PRD/`，**绝不进 dev-log**。详见 `docs/dev-log/README.md` 与根 `AGENTS.md` Workflow 节。

---

## 2. 脚手架初始化（`vp create vite:monorepo` + 定制）

Vite+ 官方 monorepo 模板自带 `typescript-config` 包 + 根 `vite.config.ts` + `pnpm-workspace.yaml`。前置条件：全局 `vp` 已装（`curl -fsSL https://vite.plus | bash`）。

```bash
# 1. 用 vp 起 monorepo 骨架
vp create vite:monorepo duedatehq --package-manager pnpm --skip-install
cd duedatehq

# 2. 删掉模板默认应用与多余包，保留 packages/typescript-config 和根 Vite+ 配置
rm -rf apps/* packages/*
# 保留：pnpm-workspace.yaml · vite.config.ts · packages/typescript-config

# 3. 把 packages/typescript-config 改名 @duedatehq/typescript-config
#    并派生出 base / library / vite / worker 四个 variant（见 §3.2）

# 4. 手工新增我们的 apps/marketing · apps/server · apps/app · packages/{i18n,ui,contracts,ports,db,core,ai,auth}
# 5. 按 §01.4 把 pnpm-workspace.yaml 的 catalog 逐字对齐 01-Tech-Stack.md 的权威快照
# 6. vp install      # 底层仍然调 pnpm
# 7. vp check        # 全绿即脚手架完成
```

---

## 3. 工具链约定（Vite+ 一统，**必须遵守**）

### 3.1 Just-in-Time (JIT) 内部包

`packages/ui / contracts / ports / db / core / ai / auth` **不构建**：

- 直接导出 `.ts` 源码（`package.json` 的 `exports` 指向 `src/`\*）
- 消费端（`apps/server` 的 wrangler esbuild · `apps/app` 的 Vite+ / Rolldown）自行转译
- 好处：dev 零构建延迟；go-to-definition 直达源码；无构建产物缓存冲突

### 3.2 TypeScript project 边界

- 根目录 `tsconfig.json` 只覆盖 Node tooling：`playwright.config.ts`、根 `vite.config.ts`、
  `scripts/**/*.ts`、`e2e/**/*.ts`、`apps/*/vite.config.ts`
- app / package 的运行时代码仍各自拥有独立 `tsconfig.json`
- 每个 app / package 都 `extends: "@duedatehq/typescript-config/<variant>.json"`
- 根级 TypeScript tooling 统一继承 `@duedatehq/typescript-config/node.json`，不在文件内写
  `/// <reference types="node" />`
- Variants：
  - `base.json`：strict + ES2022 + isolated modules + TS 6 defaults
  - `node.json`：Node.js tooling/runtime globals（显式包含 `@types/node`）
  - `library.json`：JIT 包用（exports types from src）
  - `vite.json`：`apps/app` 用（DOM lib + React JSX）
  - `worker.json`：`apps/server` 用（`@cloudflare/workers-types` + no DOM）

`base.json` 必须显式开启：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022"
  }
}
```

### 3.3 Node.js Subpath Imports（取代 TS paths）

- 内部引用用 subpath imports，**不用** TS `paths` 配置
- `package.json`：

```json
{
  "imports": {
    "#*": "./src/*"
  }
}
```

- 使用：`import { foo } from '#utils'`
- 跨包走正常 `@duedatehq/<pkg>` 包名

### 3.4 禁止 TypeScript Project References

- 不使用 `tsconfig.json` 的 `references` 字段
- 类型检查走 `vp check`，其中 `lint.options.typeCheck: true` 在全 monorepo 并行跑 tsgolint（`@typescript/native-preview`）
- 需要稳定 `tsc --noEmit` 时临时 `pnpm -F <pkg> exec tsc --noEmit -p tsconfig.json` 单独跑，不进 CI 默认路径

### 3.5 TypeScript 版本统一

- 全 workspace 通过 catalog 用同一版本的 `typescript`、`@typescript/native-preview` 和 `@types/node`
- 避免 tsserver 在多版本间跳跃

---

## 4. 各包职责（约束）

### 4.1 `apps/server`

```
apps/server/
├── src/
│   ├── index.ts                    # Worker entry：fetch / scheduled / queue
│   ├── app.ts                      # Hono app 组装
│   ├── env.ts                      # Env 类型（Bindings 收敛）
│   ├── middleware/
│   │   ├── session.ts              # better-auth session 读取
│   │   ├── tenant.ts               # 注入 firmId + scoped
│   │   ├── firm-access.ts
│   │   ├── locale.ts
│   │   ├── rate-limit.ts
│   │   └── logger.ts
│   ├── procedures/                 # oRPC 实现（每个切片一个目录）
│   │   ├── index.ts                # 拼装总 router
│   │   ├── _root.ts · _context.ts · _permissions.ts · _plan-gates.ts   # 共享基座（_ 前缀）
│   │   ├── clients/                # 每个域目录由 index.ts 导出 router；_ 前缀私有 helper colocate
│   │   ├── obligations/ · obligation-queue/ · dashboard/ · calendar/ · workload/
│   │   ├── pulse/ · rules/ · migration/ · evidence/ · readiness/
│   │   └── reminders/ · notifications/ · members/ · firms/ · audit/ · security/
│   ├── jobs/
│   │   ├── cron.ts                 # scheduled handler 总入口
│   │   ├── queue.ts                # queue consumer 总入口
│   │   ├── dashboard-brief/        # Dashboard AI Brief enqueue / consumer / snapshot
│   │   ├── pulse/                  # ingest / extract / apply
│   │   ├── rules/ · rollover/ · reminders/ · notifications/
│   │   └── email/ · audit/ · ai-insights/ · ops-alerts.ts
│   ├── webhooks/                   # /api/webhook/*
│   │   └── resend.ts
│   └── routes/                     # /api/auth/* 由 better-auth handler 挂载
│       ├── auth.ts
│       ├── ics.ts
│       ├── health.ts
│       └── audit-download · auth-capabilities · notifications · readiness · signed-url · public-demo · e2e
├── wrangler.toml                   # binding + assets + cron + queue
├── package.json
└── tsconfig.json
```

**约束：**

- `procedures/**` 不得 import `@duedatehq/db` 或 `@duedatehq/db/schema/*`（用 `context.vars.scoped`）；允许 type-only import `@duedatehq/ports/<domain>` 表达 repo / tenant 边界，禁止使用 `@duedatehq/ports` 根入口
- `jobs/**` 可以直接用 `scoped(db, firmId)`（系统任务，firmId 从消息体或 cron 规则推导）
- `jobs/dashboard-brief/**` 只在 Queue / Cron / explicit enqueue mutation 路径运行；不得被
  `dashboard.load` request path 直接调用。其输出写 `ai_output(kind='brief')` +
  `dashboard_brief`，供 Dashboard 只读。
- 每个切片目录由 `index.ts` 导出该域 router；私有 helper 用 `_` 前缀文件 colocate（如 `_serializers.ts`、`_sample-data.ts`）

### 4.2 `apps/app`

详见 §05。核心：

- `src/routes/*`：RR7 data mode 路由（dashboard / clients / obligations / calendar / alerts /
  rules.\* / reminders.\* / notifications.\* / settings.\* / billing.\* / workload / audit /
  readiness / migration.new / onboarding 等）
- `src/features/*`：业务 vertical；feature model、私有 helper、局部 UI 和测试优先 colocate 在这里。
  当前 vertical：alerts / audit / auth / billing / calendar / clients / concepts / dashboard /
  evidence / firm / members / migration / notifications / obligations / onboarding / permissions /
  reminders / rules / settings / workload（另有 `_surface-vocabulary` 词汇约定）
- `src/features/obligations/*`：deadline 生命周期 model + 局部 UI；含 `detail/`（deadline detail
  导航/侧栏组件）与 `queue/`（triage queue）子目录
- `src/features/dashboard/*`：dashboard 专属展示模型和局部 UI（actions-list、needs-attention、
  daily-brief-card 等）
- `src/features/billing/*`：billing URL/model + Better Auth billing adapters
- `src/features/members/*`：settings members 页面、成员角色/邀请派生 model 和局部 UI
- `src/features/reminders/*` / `src/features/notifications/*`：提醒模板编辑/发送页 与
  通知中心/偏好页
- `src/components/primitives/*`：真正跨 feature 的 app 专属 UI primitive（state-badge、
  due-date-label、iso-date-picker、relative-time、search-input、ai-provenance-badge 等）；
  基础 UI 从 `@duedatehq/ui/components/ui/*` 引入
- `src/components/patterns/*`：跨 feature 复合组件（app-shell\* / keyboard-shell/ / page-header /
  breadcrumb / filter-trigger / table-header-filter / floating-action-bar / bulk-confirm-dialog /
  stat-band / stat-tile / status-banner / detail-section-card / empty-state / row-actions-menu 等）
- `src/components/patterns/keyboard-shell/*`：唯一 app 级快捷键 provider、Command Palette、`?` 帮助浮层；允许依赖 React Router / Lingui / feature providers，不得下沉到 `packages/ui`
- `src/lib/*`：app runtime / integration helper，例如 `rpc.ts`、`auth.ts`、theme storage、RPC error mapping；不得放带业务语义的 feature model 或 feature UI

### 4.2.1 `apps/marketing`

详见 §12。核心：

- `src/pages/*`：Astro static pages；`/` 是公开首页，另有 `/pricing`、`/rules`（+ `/rules/[rule]`）、
  `/states/[state]`、`/state-coverage`、`/guides/[guide]`、`/compare/[comparison]`、`/[trustPage]`，
  以及 `zh-CN/` 镜像
- `src/components/*`：marketing 专属 Astro section，不放入 `packages/ui`
- 目前没有 React island：交互（如 PreferenceSwitcher）全部用 `.astro` + inline script 实现；
  `@duedatehq/ui` 仅消费 `styles/preset.css`、theme runtime 和 brand assets
- `src/i18n/*`：marketing copy dictionary；共享 locale 常量从 `packages/i18n` 引入
- `src/styles/globals.css`：Tailwind 入口，导入 `@duedatehq/ui/styles/preset.css` 并 `@source` 扫描 `packages/ui/src`
- 基础 layout：在 `<head>` 内内联 `@duedatehq/ui/theme/no-flash-script` 的
  `THEME_INIT_SCRIPT`，不得复制脚本正文或自建 theme storage key

**约束：**

- 不导入 `apps/app/src/*`
- 不调用内部 `/rpc`
- 不复用 app 的 Lingui catalog
- 不读取 Better Auth session

### 4.2.2 `packages/ui`

```
packages/ui/
├── components.json                 # shadcn base-vega 配置
├── src/
│   ├── components/ui/              # Button / Input / Dialog / Table 等基础 primitives
│   ├── assets/brand/               # brand SVG（favicon / logo）
│   ├── hooks/                      # use-mobile 等纯 UI hook
│   ├── lib/utils.ts                # cn()
│   ├── styles/preset.css           # Tailwind token preset；不 import tailwindcss
│   └── theme/                      # shared light/dark/system runtime + no-flash script
└── package.json
```

**约束：**

- 只放纯 UI、品牌视觉、基础 layout primitive 和稳定 design token
- 不得依赖 Better Auth session、React Router、TanStack Query、oRPC 或 app 专属 dashboard/obligations/organization 组件
- app 通过 `@duedatehq/ui/components/ui/*`、`@duedatehq/ui/lib/utils`、`@duedatehq/ui/styles/preset.css`、`@duedatehq/ui/theme*` 消费
- 每个消费 app 的 Tailwind 入口必须 `@source` 扫描 `packages/ui/src`，否则 shadcn 组件内部 utilities 不会生成

### 4.2.3 `packages/i18n`

```
packages/i18n/
├── src/
│   ├── locales.ts                 # Locale / SUPPORTED_LOCALES / DEFAULT_LOCALE / INTL_LOCALE
│   ├── headers.ts                 # LOCALE_HEADER = 'x-locale'
│   └── index.ts
└── package.json
```

**约束：**

- 只放纯 TypeScript 常量和 helper，不引入 Lingui、Astro、React 或 Worker runtime
- `apps/app`、`apps/server`、`apps/marketing` 共享 locale contract，但各自维护自己的文案 catalog/dictionary

### 4.3 `packages/contracts`

```
packages/contracts/
├── src/
│   ├── index.ts                    # 导出 appContract
│   ├── shared/                     # 共享 Zod schema（ClientSchema / ObligationSchema）
│   │   ├── audit-actions.ts
│   │   ├── client.ts
│   │   ├── evidence-source-types.ts
│   │   ├── obligation.ts
│   │   ├── ids.ts
│   │   └── enums.ts
│   ├── clients.ts                  # clients 域契约
│   ├── obligations.ts              # includes obligation jurisdiction/profile DTOs
│   ├── obligation-instance.ts · obligation-queue.ts
│   ├── dashboard.ts · calendar.ts · workload.ts · readiness.ts · priority.ts
│   ├── pulse.ts · rules.ts · migration.ts · evidence.ts · ai-insights.ts
│   ├── firms.ts · members.ts · security.ts · audit.ts · notifications.ts · reminders.ts
│   └── errors.ts                   # 自定义 ORPCError code 表
└── package.json
```

**约束：**

- 只依赖 `zod` 和 `@orpc/contract`
- **不得**引入 `@orpc/server` / `hono` / `drizzle-orm` 等后端依赖（否则前端 bundle 污染）
- 所有 schema 必须既可作 input 又可作 output 校验（避免字段漂移）
- `clients.ts` owns `ClientFilingProfile*` DTOs and `clients.replaceFilingProfiles`；app/server
  不得从 DB row 直接推断多州 profile shape。

### 4.4 `packages/db`

```
packages/db/
├── src/
│   ├── schema/                     # 无 barrel；按域显式 import @duedatehq/db/schema/<domain>
│   │   ├── auth.ts                 # better-auth 身份层 schema（手工维护）
│   │   ├── firm.ts                 # firm_profile 业务租户表；PK = organization.id
│   │   ├── clients.ts · client-tax-year-profile.ts
│   │   ├── obligations.ts · obligation-saved-view.ts · calendar.ts
│   │   ├── migration.ts · mutation-lock.ts
│   │   ├── pulse.ts · rules.ts · overlay.ts
│   │   ├── ai.ts · ai-insights.ts · dashboard.ts · readiness.ts
│   │   └── audit.ts · notifications.ts
│   ├── repo/                       # per-domain scoped repo
│   │   ├── clients.ts · client-filing-profiles.ts · client-tax-year-profiles.ts
│   │   ├── obligations.ts · obligation-queue.ts · calendar.ts · workload.ts
│   │   ├── pulse/ · rules.ts · rule-concrete-drafts.ts · overlay.ts · priority-profile.ts
│   │   ├── migration.ts · evidence.ts · audit.ts · mutation-lock.ts
│   │   └── dashboard.ts · firms.ts · members.ts · notifications.ts · readiness.ts · reminders.ts · ai.ts · ai-insights.ts
│   ├── scoped.ts                   # ★ 唯一对外入口
│   ├── client.ts                   # drizzle(D1) factory
│   ├── audit-writer.ts
│   ├── evidence-writer.ts
│   ├── reminder-linkage.ts
│   └── types.ts
├── migrations/                      # 手写 SQL（wrangler d1 migrations apply 应用；drizzle-kit 已移除）
├── seed/
│   ├── demo.ts                     # seed:demo 入口：把根目录 mock/demo.sql 应用到本地 D1
│   └── generate-demo.ts            # demo 数据生成器 → 产出 mock/demo.sql（NOW=2026-06-02，勿手改 demo.sql）
├── drizzle.config.ts
└── package.json
```

**约束：**

- `exports` 暴露 `.`（根入口）/ `scoped` / `client` / `audit-writer` / `evidence-writer` / `reminder-linkage` / `types`；schema 导入要显式 `@duedatehq/db/schema/<domain>`（只给 migration / seed / writer 内部用）；repo / tenant 类型由 `@duedatehq/ports/<domain>` 定义，`@duedatehq/db/types` 仅做兼容转出
- `schema/auth.ts` 不再通过 `@better-auth/cli generate` 自动覆盖；它包含手工维护的 `(organization_id, user_id)` unique index、`member.status` 附加字段，以及与 `firm_profile` 配套的身份层约束。后续 schema 变更：手写 migration SQL（`packages/db/migrations/`）+ 同步更新 `schema/*.ts`，由 wrangler 应用；drizzle-kit 与 `db:generate` 已于 2026-06-10 移除。
- `schema/firm.ts` 是业务租户层；`firm_profile.id` 复用 `organization.id`，业务表统一用 `firm_id -> firm_profile.id`。
- `repo/client-filing-profiles.ts` 是客户多州报税事实的唯一写入口；`client.state/county`
  由 primary profile mirror，不作为规则生成事实来源。
- oxlint 限制：`no-restricted-imports` 基线对全仓禁 `@duedatehq/db/schema/*`（`packages/db/**`、`apps/server/src/{jobs,webhooks}/**`、`packages/db/seed/**` 豁免）；`apps/server/src/procedures/**` 进一步禁整个 `@duedatehq/db`；`apps/app/src/**` 另禁 raw `@orpc/client`（统一走 `lib/rpc.ts`，该文件豁免）。规则在根 `vite.config.ts` 的 `lint.rules.no-restricted-imports` + overrides 中维护。

### 4.5 `packages/core`

```
packages/core/
├── src/
│   ├── penalty/                    # Source-backed penalty catalog + formula evaluators
│   ├── priority/                   # Smart Priority 打分 + 因子分解
│   ├── date-logic/                 # DueDateLogic DSL 求值
│   ├── overlay/                    # ExceptionRule 叠加
│   ├── default-matrix/             # entity × state → tax_types 矩阵
│   ├── rules/                      # rules catalog release + rule-diff（FED + 50 states + DC 资产）
│   ├── deadlines/ · obligation-workflow/ · tax-area/ · tax-codes/ · tax-periods/
│   ├── federal-holidays/ · csv-parser/ · normalize-dict/ · email-template/
│   ├── permissions/ · plan-entitlements/ · pii/ · readiness-documents/
│   └── index.ts
└── package.json
```

**硬约束：**

- **纯函数**；不 import `fetch` / `c.env` / `drizzle-orm` / `crypto.subtle`
- 所有导出函数必须 100% 单测覆盖
- 任何业务常量（罚金利率 / 州码白名单 / 实体枚举）放这里，禁止复制到其他包

### 4.6 `packages/ai`

```
packages/ai/
├── src/
│   ├── index.ts                    # orchestrator 高阶 API（generateBrief / generateTip / ...）
│   ├── ports.ts                    # 注入 VectorStore / KV / writers / tracer 的接口
│   ├── gateway.ts                  # AI SDK + Cloudflare AI Gateway provider 组合
│   ├── router.ts                   # model tier / fallback route 定义
│   ├── retriever.ts                # Vectorize 查询
│   ├── prompter.ts                 # prompt 加载 + 版本号
│   ├── guard.ts                    # Glass-Box Guard 5 道闸
│   ├── pii.ts                      # PII redact + fill
│   ├── budget.ts                   # per-firm/day 配额（KV）
│   ├── trace.ts                    # AI SDK usage / latency / guard trace payload
│   ├── pulse.ts · morning-sweep.ts · pricing.ts   # pulse 提取 / morning sweep / 模型价格表
│   └── prompts/                    # *.md 版本化
│       ├── mapper@v1.md · mapper@v2.md
│       ├── normalizer-entity@v1.md · normalizer-tax-types@v1.md
│       └── rule-concrete-draft@v1.md · rule-concrete-draft@v2.md
└── package.json
```

**约束：**

- `packages/ai` 不直接 import `@duedatehq/db`、Drizzle schema、Hono context 或 Cloudflare `env`。
- `runPrompt` 返回 guarded result 与 trace payload；`apps/server` 负责用注入的 scoped repo
  写 `ai_output` / `evidence_link` / `llm_log`。Activation Slice v1 已先接入 Migration
  mapper / normalizer；Dashboard Brief 的 `brief@v1` 由 `jobs/dashboard-brief` 调用，
  写入 `ai_output(kind='brief')`，再物化到 `dashboard_brief`。`generateTip` / `extractPulse`
  仍是后续高阶 API。
- Vectorize / KV / writer / tracer ports 通过 `ports.ts` 注入；AI SDK provider 组合封装在 `packages/ai` 内部，便于 Workers integration test 和未来替换。

### 4.7 `packages/auth`

```
packages/auth/
├── src/
│   ├── index.ts                    # createAuth(db, env) 工厂
│   ├── client.ts                   # browser-safe exports（apps/app 消费，不触 server plugin/D1）
│   ├── permissions.ts              # Access Control statement + 四角色
│   ├── plugins.ts                  # OAuth / organization / twoFactor 配置
│   ├── email.ts                    # sendInvitationEmail
│   └── types.ts                    # Session / Member 扩展类型
└── package.json
```

### 4.8 `packages/typescript-config`

```
packages/typescript-config/
├── base.json
├── library.json                    # JIT 内部包
├── node.json                       # 根级 tooling / Node runtime globals
├── vite.json                       # apps/app
├── worker.json                     # apps/server
└── package.json                    # name: @duedatehq/typescript-config
```

---

## 5. 命名约定

| 实体               | 规则                                   | 示例                                         |
| ------------------ | -------------------------------------- | -------------------------------------------- |
| 包名               | `@duedatehq/<kebab>`                   | `@duedatehq/contracts`                       |
| 目录               | `kebab-case`                           | `migration-wizard/`                          |
| 文件               | `kebab-case.ts`；组件 `PascalCase.tsx` | `pulse-banner.ts` · `TriageCard.tsx`         |
| 类型               | `PascalCase`                           | `ClientInput` · `AppContract`                |
| 常量               | `SCREAMING_SNAKE`                      | `MAX_CLIENTS_PER_IMPORT`                     |
| 函数               | `camelCase`                            | `computePenalty()`                           |
| Zod schema         | `PascalCaseSchema`                     | `ClientSchema`                               |
| oRPC 契约          | `<domain>Contract`                     | `clientsContract`                            |
| oRPC procedure     | 动词 `camelCase`                       | `clients.list` / `pulse.batchApply`          |
| DB 表              | `snake_case` 单数                      | `client` · `obligation_instance`             |
| DB 列              | `snake_case`                           | `firm_id` · `current_due_date`               |
| URL                | `/kebab-case`                          | `/api/webhook/resend`                        |
| 环境变量           | `SCREAMING_SNAKE`                      | `AUTH_SECRET`                                |
| Cloudflare binding | `SCREAMING_SNAKE`                      | `DB` · `R2_PDF` · `R2_PULSE` · `PULSE_QUEUE` |

---

## 6. 依赖方向（必须遵守）

```
apps/*
  └─► packages/{contracts, auth, ui, i18n}
        └─► packages/{core}

apps/server
  └─► packages/{db, ai, ingest, contracts, auth, core, ports}

apps/app
  └─► packages/{contracts, auth(client-only exports), ui, i18n}
        └─► packages/{core}

apps/marketing
  └─► packages/{ui, i18n}

packages/ai
  └─► packages/{core}（only，DB/KV/Vectorize/writers 通过 ports 注入，不直接 import @duedatehq/db）

packages/db
  └─► packages/{core, ports}

packages/ports
  └─► (无)

packages/ingest
  └─► (无内部包依赖；仅 pdfjs-dist，apps/server 注入 fetch)

packages/core
  └─► (无)
```

**禁止反向依赖**；CI 通过脚本检查。

---

## 7. `exports` / `imports` 约定（约束）

每个 `packages/*/package.json` 的 `exports`（JIT 包）：

```json
{
  "name": "@duedatehq/contracts",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./shared/*": "./src/shared/*.ts",
    "./clients": "./src/clients.ts",
    "./obligations": "./src/obligations.ts"
  },
  "imports": {
    "#*": "./src/*"
  }
}
```

- 不用 barrel `index.ts` 导出一切（避免 tree-shake 失效）
- 分 entry 点使消费端按需 import

---

## 8. 根脚本（`package.json` · 约束）

```json
{
  "scripts": {
    "dev": "vp run -r dev",
    "build": "vp run @duedatehq/app#build && vp run @duedatehq/server#build && vp run @duedatehq/marketing#build",
    "check": "vp check",
    "test": "vp run -r test",
    "test:e2e": "playwright test",
    "format": "vp fmt --check",
    "format:fix": "vp fmt --write",
    "db:migrate:local": "pnpm --dir apps/server exec wrangler d1 migrations apply DB --local --config wrangler.toml",
    "db:migrate:remote": "pnpm --dir apps/server exec wrangler d1 migrations apply DB --remote --config wrangler.toml",
    "db:seed:demo": "pnpm --filter @duedatehq/db seed:demo",
    "deploy": "vp run workspace-deploy"
  }
}
```

E2E 基座在根目录而不是 `packages/e2e`：

```txt
playwright.config.ts
e2e/
  tests/
  fixtures/
  pages/
```

原因：E2E 横跨 `apps/app` 的 Vite SPA、`apps/server` 的 Cloudflare Worker/Hono/oRPC
边界，以及本地 D1 seed/migration；它不是可复用 package，不应进入 `packages/` 的依赖方向图。

每个 app/package 的 `package.json` 只需要场景化脚本；typecheck / lint / fmt 由根 `vp check` 一次跑完，不再要求每个包声明 `check-types`。示例：

```json
// apps/server
{
  "scripts": {
    "dev": "node -e \"require('node:fs').mkdirSync('../app/dist',{recursive:true})\" && wrangler dev --local",
    "dev:fullstack": "pnpm --filter @duedatehq/app run build && wrangler dev --local",
    "build": "wrangler deploy --dry-run --outdir=dist --env=\"\"",
    "deploy": "wrangler deploy --env=\"\"",
    "test": "vp test"
  }
}
```

```json
// apps/app
{
  "scripts": {
    "dev": "vp dev",
    "build": "vp build",
    "preview": "vp preview",
    "test": "vp test"
  }
}
```

`packages/*` 只需要：

```json
{
  "scripts": {
    "test": "vp test"
  }
}
```

---

## 9. ADR（Architecture Decision Record）

所有**非 trivial** 架构决策必须写 ADR 存 `docs/adr/NNNN-<slug>.md`：

```
## Context
<为什么需要这个决策>

## Decision
<我们决定什么>

## Consequences
<好的 / 坏的 / 不确定的后果>

## Status
proposed | accepted | deprecated | superseded by #NNN
```

当前 Phase 0 已补齐的核心技术 ADR：

1. `0016-cloudflare-first-single-worker-d1-platform.md`
2. `0017-orpc-contract-first-rpc-api-boundary.md`
3. `0018-d1-tenant-isolation-scoped-repo-ports.md`
4. `0019-ai-sdk-gateway-glass-box-boundary.md`
5. `0020-tanstack-form-for-client-forms.md`

仍待补充但不阻塞当前实现的 ADR：

1. Vite+ unified toolchain and pnpm catalog version locking。
2. shadcn/Base UI primitive strategy beyond ADR 0014。

---

## 10. README 必含段落

- 项目一句话定位（抄 PRD §19）
- 10 分钟 quickstart（装全局 `vp` → `vp install` → 本地 D1 迁移 → seed → `vp run -r dev` → 打开 localhost）
- 三条铁律（`00-Overview` §3）
- 目录导航
- 部署命令
- 文档地图

---

## 11. 代码规范强制链

1. `vp check`：**一条命令等同 oxfmt + oxlint + tsgolint**（由根 `vite.config.ts` 的 `lint.options.typeCheck: true` 启用）。本地 `vp` 安装的 staged git hook 用 `vp check --fix` 处理 staged files；CI 跑全量 `vp check`。
2. `pnpm generated:check`：在临时目录重建 CPA Field Guide generator-owned output，逐字节对照已提交文件，并检查 outreach state canonical JSON；不修改工作树。
3. `vp run -r test`：递归跑 Vitest（`apps/server` 走 `@cloudflare/vitest-pool-workers`）。
4. `.vite-hooks/pre-push`：push 前运行 `pnpm run prepush`（完整 `pnpm run ci` + 已提交 `HEAD` 的 `git show --check`）。
5. `gitleaks`：CI full scan + 手动 `pnpm secrets:scan`（外部 CLI；staged hook 内目前不跑 gitleaks）。
6. `pnpm -F <pkg> exec tsc --noEmit`：手动 fallback，不作为默认门禁。

`tsgolint` 已经在 `vp check` 里默认启用，与 oxlint 的 type-aware 规则互补。不再引入独立 typed ESLint。

### 11.1 Vite+ `staged`（staged-first git hook）

根 `vite.config.ts` 的 `staged` 块等价于 lefthook + lint-staged：

```ts
import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
    'DESIGN.md': 'npx --yes @google/design.md lint',
  },
  // ...（见 01-Tech-Stack.md §4.4 完整配置）
})
```

首次 clone 后运行 `vp install` 时会自动注册 git hook（等价 `lefthook install`），不再单独维护 `lefthook.yml`。

传统等价对照（仅供参考，不再作为约束）：

```yaml
# 对照 lefthook 旧实现（已废弃，改由 vp `staged` 块）
pre-commit:
  parallel: true
  commands:
    format:
      glob: '*.{ts,tsx,js,jsx,json,md,css}'
      run: pnpm oxfmt --write {staged_files}
      stage_fixed: true
    lint:
      glob: '*.{ts,tsx,js,jsx}'
      run: pnpm oxlint {staged_files}
    secrets:
      run: pnpm gitleaks protect --staged --redact

pre-push:
  parallel: true
  commands:
    check-types:
      run: pnpm check-types
    test:
      run: pnpm test
```

原则：staged hook 必须 < 3s（Vite+ 默认 staged 行为已满足），不能跑全仓 typecheck；CI 才跑 `vp check` 的全量（含 tsgolint）。

### 11.2 Vite+ `pre-push`（全仓第二层防线）

`.vite-hooks/pre-push` 是版本控制入口；`vp config` 生成的内部 dispatcher 会调用它。pre-push
要求本地依赖已安装，然后运行 `pnpm run prepush`。该命令检查完整 workspace，而不是只检查
staged files，因此能捕获未安装/绕过 pre-commit 后进入 commit 的格式、类型、测试、build 与
generator drift。它仍可被本地 Git 机制绕过，服务器端 required checks 才是不可替代的最终边界。

---

## 12. Monorepo "10 分钟能跑起来"清单（README 核心段）

```bash
# 前置：Node 22 + 全局 vp（curl -fsSL https://vite.plus | bash）

vp install
pnpm db:migrate:local
pnpm db:seed:demo
vp run -r dev

# 打开 http://localhost:8787
# 使用 Google OAuth 登录；本地 Google Console redirect URI 配置为 http://localhost:8787/api/auth/callback/google
```

---

## 13. PRD 映射速查

| PRD §               | 工程落地                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| §1.3 设计原则       | `docs/Design/DueDateHQ-DESIGN.md` + `packages/ui/src/styles/preset.css`                                                        |
| §3 Story S1/S2/S3   | E2E 10 条核心路径（§07.5.4）                                                                                                   |
| §3.6 Team           | `packages/auth` Organization plugin                                                                                            |
| §5.1 Dashboard      | `apps/app/src/routes/dashboard.tsx` + `apps/server/src/procedures/dashboard` + `packages/db/src/repo/dashboard.ts`             |
| §5.2 Obligations    | `apps/app/src/routes/obligations.tsx` + `features/obligations/`                                                                |
| §5.5 Evidence Mode  | `apps/app/src/features/evidence/`（EvidenceDrawerProvider）+ `packages/db/evidence-writer`                                     |
| §6.1 Rule Engine    | `packages/core/src/rules`（catalog-release）+ `packages/core/date-logic`                                                       |
| §6.2 Glass-Box      | `packages/ai/guard.ts`                                                                                                         |
| §6.3 Pulse          | `apps/server/src/jobs/pulse/*` + `procedures/pulse/*`                                                                          |
| §6.4 Smart Priority | `packages/core/priority/`                                                                                                      |
| §6A Migration       | `apps/server/src/procedures/migration/*` + `features/migration/`                                                               |
| §7.5 Deadline Radar | 后续 `packages/core/penalty/` + dashboard read model；Activation Slice v1 暂用真实 obligation count，不伪造 deadline readiness |
| §7.8.1 PWA          | Phase 0 不实现（见 `05 §8`）；Phase 2 Tauri menu bar widget 统一覆盖 install 体验                                              |
| §13 Security        | `06-Security-Compliance.md` + `packages/auth`                                                                                  |

---

继续阅读：[09 · Demo Sprint Module Playbook](./09-Demo-Sprint-Module-Playbook.md)
