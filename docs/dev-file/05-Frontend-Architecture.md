# 05 · Frontend Architecture · Vite+ · React Router 7 · UI System

> 对齐 PRD §5 / §10 + 设计系统 `docs/Design/DueDateHQ-DESIGN.md`。
> 核心决策：**纯 SPA（不做 SSR） · React Router 7 library/data mode · shadcn Base UI（`base-vega`） · 工具链由 Vite+ (`vite-plus`) 统一驱动。**
>
> **PWA / Service Worker / Web Push 在 Phase 0 已移除**（见 `00-Overview.md §7` 的否决矩阵）。回头率靠 SPA chunk cache + in-app toast + Email 兜底；installable 体验推迟到 Phase 2 Tauri menu bar widget。
>
> 公开 marketing 站不属于本 SPA。`apps/marketing` 使用 Astro，详见 [12 Marketing Architecture](./12-Marketing-Architecture.md)。

---

## 1. 目录结构（约束）

```
apps/app/
├── index.html
├── vite.config.ts
├── public/
│   ├── favicon.svg           ← brand mark（镜像 packages/ui/src/assets/brand/brand-favicon.svg；同步纪律见 DESIGN.md §15）
│   ├── icons/                ← PWA / Apple touch / Maskable PNG 图标集（由 sharp 脚本生成；P1 待补）
│   └── fonts/                ← Inter / Geist Mono 本地托管（可选）
├── src/
│   ├── main.tsx              ← ReactDOM.createRoot + router provider
│   ├── router.tsx            ← createBrowserRouter + routes config
│   ├── routes/               ← 每个路由一个 .tsx（RR7 data mode：loader / action / Component）
│   │   ├── error.tsx             ← root route 全局 RouteErrorBoundary
│   │   ├── _layout.tsx           ← 登录后 shell（侧栏 + 顶栏，path='/'，loader 做认证 gate）
│   │   ├── _entry-layout.tsx     ← entry shell（顶栏 + 底栏，pathless layout route，包 /login + /onboarding；命名避开 "auth" 因为 onboarding 已在 post-auth 状态）
│   │   ├── route-summary.ts      ← route handle metadata（AppShell route header + document title 的同一来源）
│   │   ├── route-title.tsx       ← React 19 原生 <title> 输出，不用 effect 写 document.title
│   │   ├── login.tsx             ← 登录页（path='/login'，guest-only，渲染在 EntryShell 内）
│   │   ├── two-factor.tsx        ← 当前 session MFA 验证页（path='/two-factor'，verification-only，渲染在 EntryShell 内）
│   │   ├── onboarding.tsx        ← 首登 firm 设置（path='/onboarding'，setup-only，渲染在 EntryShell 内）
│   │   ├── dashboard.tsx         ← index
│   │   ├── migration.new.tsx     ← 首登客户迁移 activation route（path='/migration/new'，EntryShell 内 route-level wizard）
│   │   ├── obligations.tsx
│   │   ├── calendar.tsx          ← Obligations 二级 Calendar sync 页（canonical `/obligations/calendar`；`/calendar` 旧链接重定向）
│   │   ├── clients.tsx           ← Client facts 工作台（readiness 派生、筛选、新增、URL 详情态；使用 clients.listByFirm / clients.create）
│   │   ├── audit.tsx             ← Audit Log 管理页（firm-wide write events；使用 audit.list）
│   │   ├── practice.tsx          ← active practice profile（name / timezone / soft-delete）
│   │   ├── rules.tsx
│   │   ├── members.tsx
│   │   ├── billing.tsx
│   │   └── fallback.tsx          ← RouteHydrateFallback
│   │   # 目标形态（Phase 0 MVP → Phase 1）：
│   │   # clients.$id.tsx · alerts.tsx · imports.tsx · notifications.tsx · migration.tsx
│   ├── features/             ← 业务特性（跨页面复用）
│   │   ├── billing/           ← billing URL/model + Better Auth billing adapters
│   │   ├── clients/           ← Clients facts/readiness 纯派生逻辑、创建弹窗、工作台展示组件
│   │   ├── dashboard/         ← dashboard 专属 risk banner / severity row 等展示模型
│   │   ├── members/           ← settings members route surface + member role/invite model
│   │   ├── migration/
│   │   ├── pulse/
│   │   ├── obligations/
│   │   ├── audit/
│   │   └── evidence/
│   ├── components/
│   │   ├── primitives/       ← 真正跨 feature 的 app 专属 UI primitive
│   │   └── patterns/         ← 跨 feature 的复合组件（app-shell / evidence-drawer / cmdk / confirm-dialog）
│   ├── lib/
│   │   ├── rpc.ts            ← oRPC client + TanStack Query utils
│   │   ├── auth.ts           ← better-auth client（`createAuthClient`）
│   │   ├── utils.ts          ← app-level format helpers + cn re-export
│   │   ├── query-rate-limit.ts ← 跨页面 URL query 文本输入 debounce
│   │   └── theme-preference-store.ts ← browser theme preference adapter
│   ├── hooks/
│   ├── styles/
│   │   └── globals.css       ← Tailwind 编译入口 + @duedatehq/ui preset + @source
│   └── (sw.ts 已移除 · PWA 降级见本文档头部说明)
└── tsconfig.json             ← extends @duedatehq/typescript-config/vite.json

packages/ui/
├── components.json           ← shadcn 配置（"style": "base-vega"）
└── src/
    ├── components/ui/        ← shadcn/Base UI primitives，不含业务
    ├── lib/utils.ts          ← cn()
    └── styles/preset.css     ← design tokens / @theme inline / base layer
```

## 1.1 多前端应用边界

| 应用      | 路径             | 域名                     | 渲染模型                                    | 共享                                                 |
| --------- | ---------------- | ------------------------ | ------------------------------------------- | ---------------------------------------------------- |
| SaaS app  | `apps/app`       | `app.due.langgenius.app` | Vite SPA + React Router data mode           | `packages/contracts`、`packages/ui`、locale contract |
| Marketing | `apps/marketing` | `due.langgenius.app`     | Astro static HTML + selective React islands | `packages/ui`、locale contract                       |

`apps/marketing` 不导入 `apps/app/src/*`，不调用内部 `/rpc`，不复用 app 的 Lingui catalog。它可以通过 `@astrojs/react` 在需要交互的局部 island 中使用 `@duedatehq/ui/components/ui/*`。静态 landing section 优先写 `.astro`，避免把公开站做成第二个 SPA。

Marketing 的 Tailwind 入口必须导入共享 preset，并扫描 shared UI：

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@duedatehq/ui/styles/preset.css';

@source '../../../packages/ui/src';
@source '../components';
@source '../islands';
```

公开页 SEO、metadata、canonical、hreflang、sitemap、robots 和 OG 图由 Astro 负责；`apps/app/index.html` 只负责 SaaS SPA shell，并显式带 `noindex, nofollow`。app 子域的 `robots.txt` 是 `apps/app/public/robots.txt` 静态文件，禁止把登录后 SPA shell 当作公开 SEO surface。

---

## 1.2 Vertical colocation

业务代码按 vertical 归位。一个能力的 model、URL parser、私有 helper、局部 UI 和测试优先放在
`apps/app/src/features/<vertical>/`，即使它被多个 route 使用。`apps/app/src/lib` 只放 app
runtime / integration 入口，例如 auth client、oRPC client、RPC error mapping、theme storage
adapter、跨页面 URL input debounce；不得放 billing plan、dashboard row、rules table 等带业务语义的
model 或 component。`apps/app/src/components/primitives` 只放真正跨 feature 的 app 专属 UI primitive；
单一 vertical 的展示组件留在对应 feature 内。

Route 文件默认保持薄组合层。复杂 route 的业务 UI 和派生 model 下沉到对应
`features/<vertical>/`，例如 `/members` 只通过
`routes/members.tsx` 挂载 `features/members` 页面，成员角色、邀请状态、日期展示等
feature 语义留在 members vertical 内。

## 2. 路由模型（React Router 7 · data mode）

**纪律：**

- 用 `createBrowserRouter` + 路由配置对象，**不走 framework mode**（framework mode 引入 Node 依赖，与 Worker 冲突）
- Loader / action **可选使用**；数据获取主路径是 **TanStack Query**（统一 server state + 乐观 UI + 缓存）
- Loader 仅用于必须 pre-resolve 的场景（**认证 gate / 权限跳转**）——这是目前 loader 的主要用法
- 全局错误处理只挂在 React Router root route：`AppRoot` 同时包裹
  `<NuqsAdapter><Outlet /></NuqsAdapter>` 并声明 `ErrorBoundary: RouteErrorBoundary`。
  子 route 默认不重复挂同一个 boundary；React Router 会把 loader / lazy / render 错误冒泡到最近的
  boundary。只有未来需要“保留 app shell、内容区局部失败”这类不同 UX 时，才在更深层加专用
  boundary。
- Hydrate fallback 按 route group 定义，不像 error boundary 一样 root-only 收敛：
  entry route 使用 `EntryRouteHydrateFallback`（空白占位，保留 entry shell 的静态 header /
  footer，不显示 skeleton）；protected shell 初始认证 gate 使用 `ShellSkeleton`；dashboard /
  Obligations / organization 等内容 route 使用 `RouteHydrateFallback`。
- 页面摘要 metadata 挂在 route object 的 `handle.routeSummary` 上，类型为
  `RouteSummaryMessages`（`eyebrow` + `title`，值为 Lingui `MessageDescriptor`）。
  `RootLayout` 通过 `useMatches()` 取最深层 route summary 作为 AppShell route header；
  `RouteDocumentTitle` 使用同一份 summary 渲染 React 19 原生 `<title>`，格式为
  `<page> | DueDateHQ`。不要再新增 pathname switch、`document.title` effect，或引入
  React Helmet 类 head 管理库。
- 业务路由按 session/org 状态分成三个顶级 route group，并额外保留一个 public catch-all：
  - **EntryShell（pathless layout route，`Component: EntryShell`）** — 承载进入 AppShell 前的过渡 surface：`/login`、`/two-factor`、`/accept-invite`、`/onboarding`、`/migration/new` 和 public readiness links。EntryShell 自身不带 loader 也不带 path；每个 child route 用自己的 loader 声明式决定当前 session 状态是否可访问。**命名避开 "auth"：** 这些页面不是同一种 auth 状态，而是同一种 chrome：单列、无 sidebar、在 Dashboard shell 之前。
    - `/login` — `guestLoader` 把已登录用户 `redirect(redirectTo)` 推出去；如果 session 已登录但当前 MFA 未验证，则直接去 `/two-factor?redirectTo=<safe target>`；未登录用户先读取 `/api/auth-capabilities`，以 Google OAuth / One Tap 作为主入口，可选 Microsoft OAuth 在配置后显示；Email OTP 作为 `or` 分隔线下方的紧凑 fallback。用户开始填写邮箱后暂停 One Tap。
    - `/two-factor` — `twoFactorLoader` 只允许“已登录、启用 MFA、当前 session 未验证”的状态访问；未登录回 `/login?redirectTo=/two-factor`，不需要验证或已验证的 session 直接回安全 `redirectTo`，没有 active practice 时默认回 `/onboarding`。它不是普通登录页，也不是长期可访问的 account security surface。
    - `/accept-invite` — `acceptInviteLoader` 允许未登录用户进入 invitation sign-in surface；已登录但当前 MFA 未验证时先跳 `/two-factor?redirectTo=<invite url>`；组件通过 loader data 判断初始 signed-in 状态，Email OTP 同页成功后 revalidate route loader，再用局部 `emailSignedIn` 推进邀请预览。
  - `/onboarding` — `onboardingLoader` 要求有 session、当前 MFA 已验证或无需 MFA，且无 `activeOrganizationId`；已有 active org 直接 `redirect(redirectTo)`，无 session 跳 `/login?redirectTo=/onboarding`，MFA 未通过先跳 `/two-factor?redirectTo=/onboarding`。新建 practice 成功后跳 `/migration/new?source=onboarding`，不再通过 dashboard `location.state` 自动弹 Migration dialog。
  - `/migration/new` — `migrationActivationLoader` 要求有 session、当前 MFA 已验证或无需 MFA，且已有 `activeOrganizationId`；无 session 回 `/login`，MFA 未通过先回 `/two-factor`，无 active practice 回 `/onboarding`。它仍渲染在 EntryShell 内，不挂 AppShell/sidebar；EntryShell 在该 route 隐藏 footer，并让 main 成为 non-scrolling viewport；`WizardRouteShell` 占满剩余高度，只有 workbench body 内部滚动，避免 step 内容切换时整页滚动位置变化。Route shell 给 Migration Step 1 传 compact density：paste/upload 在宽屏并排、chips 和说明文案压缩；dialog shell 继续使用 comfortable density。`source=onboarding` 的 activation-complete 判断放在 loader：当前 practice 已有 open obligations 或 applied migration batch 时，在页面渲染前直接回 Dashboard；普通手动导入入口不做这个跳转。`Skip for now` 只出现在 route header；workbench header 在 route shell 内隐藏 close/skip 控件，但 Esc 仍走 discard confirmation。完成导入或 skip 后才进入 Dashboard shell。
    Onboarding 提交不直接调用 Better Auth organization client；它通过 DueDateHQ `firms` RPC gateway 先 `listMine` 查 active、非 deleted 的业务 firm，有则 `switchActive`，没有才 `create`。这样最后一个 firm soft-delete 后不会被 Better Auth 残留 organization 重新激活。
  - `/` — 受保护路由组（`id: 'protected'`, `Component: RootLayout`），`protectedLoader` 未命中 session 时 `redirect('/login?redirectTo=...')`。`dashboard` / `/obligations` / `practice` / `rules` / `members` / `billing` 等都作为它的 children；不再保留 `/settings`、`/settings/*` 或历史 `/firm` 兼容路由。`/practice` 是 Practice profile 的唯一 URL。
    - `/billing` — 登录后账单中心，使用 1180px max-width 的 status + plan selection
      layout：上半区展示当前 practice plan / seat limit / active practice entitlement /
      subscription 状态和 owner-only billing portal 入口，下半区复用 marketing pricing 的
      plan-card 信息层级进入 plan change。
      Subscription status 读取 app-owned `firms.listSubscriptions` RPC（DB subscription 表）；
      hosted checkout / portal endpoint 仍只用于跳转动作，列表读取不直接打
      `/api/auth/subscription/list`，避免本地未启用 Stripe plugin 时出现 auth 404。
      AppShell sidebar footer 只提供当前 plan + seat count 的轻量入口，不承载 pricing 对比；
      完整 Billing 页面必须同时说明 seats 和 practices 两个 entitlement 维度。
    - `/practice` — 当前 active practice profile，只编辑 practice name / timezone / soft-delete 当前 practice；timezone 使用受 contract 约束的美国 IANA 时区下拉（含州内差异区和美国属地），不再提供自由文本输入。它属于 Practice，不属于 user account profile。内部仍由 `firms.*` RPC 和 `firm_profile` 支撑。
      Practice switch / create / soft-delete 是租户边界：成功后必须重置 TanStack Query cache 并
      回到 Dashboard，不能只做 `invalidateQueries()` 后继续停留在旧 route，因为 oRPC query key
      不包含 active firm id，后台 refetch 期间会继续显示上一 practice 的 server state。
    - `/rules` / `/members` / `/audit` — durable practice surfaces，分别承载规则覆盖、成员席位、审计证据。
    - `/billing/checkout?plan=pro&interval=monthly` — checkout 确认页，使用 1120px max-width
      的 plan summary + practice context 布局；未登录 deep link 继续复用
      `protectedLoader → login → onboarding → redirectTo` 闭环
    - `/billing/success` / `/billing/cancel` — checkout 返回页；success 只展示 webhook/subscription 确认状态，不把 redirect 本身当成支付成功
  - `*` — 公开 catch-all route，loader 主动抛 404 `Response`，由 root `RouteErrorBoundary`
    渲染统一 not found UI；未知 URL 不进入认证 gate，也不显示 React Router 默认开发错误页。
    错误边界自己渲染错误页 `<title>`，避免 loader error 保留上一个成功页面的浏览器标题。

**Auth flow**：

- 认证 gate 放在 **layout route 的 loader** 里，不放进组件渲染（避免 `<Navigate>` 造成中间帧闪烁，详见 `docs/dev-log/2026-04-23-auth-gate-loader-refactor.md`）
- 未登录访问 `/` 树 → `protectedLoader` → `throw redirect('/login?redirectTo=<当前路径>')`
- 已启用 MFA 但当前 session 未完成二次验证 → `protectedLoader` / `onboardingLoader` / `migrationActivationLoader` → `throw redirect('/two-factor?redirectTo=<当前路径>')`
- 直接访问 `/two-factor` → `twoFactorLoader` 只在当前 session 需要 MFA 时返回 `{ user }`；其他状态 redirect 到 login、onboarding 或安全目标
- 已登录访问 `/login` → `guestLoader` → 已完成 MFA 的 session `redirect(redirectTo || '/')`；未完成 MFA 的 session 先 `redirect('/two-factor?redirectTo=<safe target>')`（`redirectTo` 只接受 `/` 开头的 in-app 路径，避免 open redirect）
- 受保护页面通过 `useLoaderData<{ user }>()`（或子路由 `useRouteLoaderData('protected')`）读取 `user`，**禁止**在受保护组件里再订阅 `useSession`——否则 sign-out 清 session store 会触发中间态 re-render

**URL state 约定：**

- 所有可分享的过滤 / 排序 / 页码 / tab 或 subview 选择走 URL（用 `nuqs`）；
  后端 opaque cursor 属于 server-state query 参数，优先由 TanStack Query
  `pageParam` 管理。
- 有两个及以上 URL 参数，或未来可能被 loader / serializer / link 复用的页面，必须把
  search params 定义为模块级 parser map，并用 `inferParserType<typeof parsers>`
  推导类型；不要手写一份和 parser 分离的 query state interface。
- `history: 'replace'`、`clearOnDefault` 等 URL 行为优先挂在 parser map 里，让
  `useQueryStates`、serializer 和未来 loader 消费同一份 contract。
- 任何抽屉开关 / 选中项也写 URL（`?drawer=obligation&id=xxx`）
- Billing 例外约束：`plan` / `interval` 保持在 URL query 以支持 marketing deep link、登录回跳、
  checkout success/cancel 和 E2E；主 checkout 必须是 route，不用 URL dialog 承载支付链路。
  `/billing?changePlan=...` 可作为轻量确认 dialog，但确认后仍跳 `/billing/checkout?...`。
- Billing e2e 断言流程状态而不是第三方支付页面 DOM：常规 suite 拦截 Checkout / Billing Portal
  请求并检查 payload；webhook 后状态通过 development-only `/api/e2e/billing/subscription`
  写入 `subscription` + `firm_profile` 后再由 UI 读取。
- **不要**把分页 / 筛选塞进 Zustand

### 2.1 权限交互

前端采用“可见但受限”的 RBAC 交互：导航入口保留，URL 不重定向，受限页面在 App Shell
内渲染统一权限面板。权限判断来自 `@duedatehq/core/permissions` 的纯矩阵；服务端仍是安全
边界，前端只负责减少必然 403 的请求和给用户明确路径。

- 整页受限：用 `PermissionGate` 渲染 `Permission required` / `Owner permission required`，
  展示当前角色、所需角色、联系 practice owner 的说明，并提供 `Return to dashboard`。
- 局部受限：保留可读信息，用 `PermissionInlineNotice` 标记只读区域，写操作禁用。
- 动作受限：按钮、dropdown、command palette 项保留但 disabled，右侧显示所需角色 badge 或
  inline note。Members、Billing、Audit 等整页 gate 必须在权限不足时禁用对应 RPC query，
  不能先请求再把 403 当 UI 状态处理。
- projected risk / accrued penalty 金额对 coordinator 默认显示 `Hidden by role`；只有 firm 开启
  `coordinatorCanSeeDollars` 时才展示金额和 breakdown。

---

## 3. 状态管理分层（约束）

| 层           | 工具                                        | 管什么                                                                                                                                                                         |
| ------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server state | **TanStack Query + `@orpc/tanstack-query`** | React surface 的内部 RPC 消费必须走 `orpc.*.queryOptions()` / `mutationOptions()`；route loader 可用 `orpc.*.call()` 做渲染前 redirect 判断；自动缓存 / 乐观 UI / invalidation |
| URL state    | **nuqs** + `react-router` params            | 筛选 / 排序 / 可分享页码 / tab/subview / 抽屉打开项                                                                                                                            |
| Form state   | **TanStack Form** + Zod Standard Schema     | 复杂 client-side 表单；简单 native submit 表单可保留本地 handler，不引入全局 form 状态                                                                                         |
| UI state     | **Zustand**                                 | Cmd-K 开关 / drawer 堆栈 / Evidence Mode 目标；**不超 3 个 store**                                                                                                             |
| Hook helpers | **foxact**                                  | 只在 app 层用 deep import 引入明确收益的 hook，例如客户端 search debounce；不下沉到 `packages/ui`                                                                              |
| Feature flag | **PostHog JS SDK**                          | 运行时开关                                                                                                                                                                     |

Activation Slice v1 约束：Dashboard 不再维护本地 fake risk rows / queue stats / pulse items。
`apps/app/src/routes/dashboard.tsx` 直接消费
`useQuery(orpc.dashboard.load.queryOptions({ input: {} }))`，只负责 loading / error / empty /
real-data 呈现；open risk、due window、needs review、evidence gap、Penalty Radar projected risk
和 severity 都由 server aggregation 统一计算。Penalty Radar 的首屏主金额口径是
overdue + next-seven-day ready 90-day projected risk；accrued penalty 作为辅助指标，只聚合
overdue open obligations；Dashboard 只保留一个 row-level 操作表
`Triage queue`，默认选中 `This Week` 并使用同一组 urgent rows。`Needs review` 进入顶部
metrics，不再用单独的 `Operational closure` 面板重复 summary count。前端只渲染
`ready / needs_input / unsupported`，不在 render 里补算或伪造金额。

Dashboard 首屏不渲染独立 AI Weekly Brief 卡片。`dashboard.load` 仍可返回 latest `brief`
状态供异步摘要、邮件或未来管理入口使用，但 Dashboard 页面只消费确定性的 summary / triage row
数据。Triage queue 行内展示 Focus rank、Smart Priority drivers、Next check 和 Evidence 按钮；
证据按钮调用 app-level `EvidenceDrawerProvider.openEvidence()`，drawer 可跳到 obligation evidence
和官方 source URL。点击 Triage queue 非控件区域直接跳转
`/obligations?obligation=<obligationId>&row=<obligationId>&drawer=obligation&id=<obligationId>`：
Obligations 先用 `obligation` 参数把 table 筛到对应 obligation，等目标行进入列表数据后再打开
detail drawer；客户名作为独立链接跳转 `/clients?clients=<clientId>&client=<clientId>`。

前端不触发模型调用，也不轮询 AI provider。Dashboard 页面不提供 `Refresh brief` 控件；如果未来在
其他入口恢复手动刷新，只能调用 enqueue mutation（例如 `dashboard.requestBriefRefresh`），不能在
button handler 中 await AI generation。

**禁止：** Redux、MobX、Recoil、自造 context 状态容器。

---

## 4. oRPC 客户端（约束）

`apps/app/src/lib/rpc.ts`（唯一 oRPC client 初始化位置）：

```ts
// 约束
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppContract } from '@duedatehq/contracts'

const link = new RPCLink({
  url: `${window.location.origin}/rpc`,
  fetch: (req, init) => fetch(req, { ...init, credentials: 'include' }), // 带 better-auth cookie
})

const rpc: ContractRouterClient<AppContract> = createORPCClient(link)
export const orpc = createTanstackQueryUtils(rpc)
```

React surface 只 import `orpc`，并把官方 `queryOptions()` / `mutationOptions()` 直接传给 TanStack Query hooks：

```ts
const mutation = useMutation(orpc.migration.createBatch.mutationOptions())
const query = useQuery(orpc.migration.getBatch.queryOptions({ input: { batchId } }))
```

**禁止：**

- 业务代码 import 或调用 raw `rpc.*` client。
- 业务代码 import `@orpc/client` / `@orpc/client/*`。
- 任何地方出现 `fetch('/rpc/...')` 裸调用。

Route loader 允许用 `orpc.*.call()` 做必须在页面渲染前完成的 redirect gate，例如
`/migration/new?source=onboarding` 的 activation-complete 判断；不要把这条例外扩展到 React
component 或 event handler。

读取型 RPC 优先 `useQuery`；需要由 route/section fallback 接管 loading 时用
`useSuspenseQuery` 并放在明确的 Suspense 边界内。用户动作触发的写流程用
`useMutation(...mutationOptions())`，事件 handler 内优先调用 `mutate(input, callbacks)`。
`mutateAsync` 只允许在确实需要 promise composition 且同一作用域有完整
`try/catch/finally` 的底层工具代码里使用。

```ts
// ✅ mutation lifecycle stays with TanStack Query callbacks.
mutation.mutate(data, {
  onSuccess: (result) => router.push(result.url),
  onError: showError,
})

// ❌ Avoid async event handlers that await mutations.
const result = await mutation.mutateAsync(data)
router.push(result.url)
```

---

## 5. UI 系统（对齐设计文档）

### 5.1 shadcn Base UI 配置

`packages/ui/components.json`（**约束**）：

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-vega",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/preset.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@duedatehq/ui/components",
    "utils": "@duedatehq/ui/lib/utils",
    "ui": "@duedatehq/ui/components/ui",
    "lib": "@duedatehq/ui/lib",
    "hooks": "@duedatehq/ui/hooks"
  }
}
```

### 5.2 Tailwind 4 `@theme`（对齐 DESIGN.md）

`packages/ui/src/styles/preset.css` 的 token 必须**与 DESIGN.md §2 完全一致**。`apps/app/src/styles/globals.css` 只是消费端 Tailwind 编译入口：

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@duedatehq/ui/styles/preset.css';

@source '../../../../packages/ui/src';
```

`@source` 必须存在；它让 Tailwind 扫描 shared UI 源码并生成 shadcn 组件内部使用的 `bg-popover`、`text-card-foreground`、`border-input`、`data-open:animate-in` 等 utilities。

Theme runtime 同样由 `packages/ui` 持有：

- `@duedatehq/ui/theme`：storage key、`light | dark | system` contract、解析与应用 helper。
- `@duedatehq/ui/theme/no-flash-script`：首屏主题初始化脚本字符串。
- `disableThemeTransitions()`：theme 切换瞬间临时禁用 CSS transitions，避免 token 大面积变更时
  各组件颜色、背景、边框以不同 duration 交错动画；做法对齐 `next-themes`
  `disableTransitionOnChange`。

`apps/app` 不在 React component / effect 中决定初始主题；Vite `transformIndexHtml` 会把
`THEME_INIT_SCRIPT` 注入 `<head>`，在 React 入口脚本执行前同步设置：

- `html.dark`
- `html[data-theme="light" | "dark"]`
- `html { color-scheme }`
- `<meta name="theme-color">`

这样 light/dark token 在 CSS 首次应用前已经选定，避免 hydration 后再切 class 造成闪烁。
后续 UI 层的 theme switcher 只更新 `localStorage["duedatehq.theme"]` 并复用
`@duedatehq/ui/theme` helper。

共享 preset 文件形态：

```css
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;

  --radius-sm: 0.25rem; /* 4px · chip */
  --radius: 0.375rem; /* 6px · 主 · Banner / Button / Input */
  --radius-lg: 0.75rem; /* 12px · Drawer / Card 大容器 */

  --text-2xs: 10px;
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-hero: 56px;

  --shadow-overlay: 0 8px 24px rgba(0, 0, 0, 0.08); /* 仅 Cmd-K / Drawer / Tooltip 等浮层例外 */
}

/* Light / Dark 下的颜色 token 详见 DESIGN.md §2.2 / §2.3，逐项对齐；不在此重复 */

/* Inter 数字特性全局打开 */
@layer base {
  html {
    font-feature-settings: 'cv11', 'ss01';
  }
  .tabular {
    font-variant-numeric: tabular-nums;
  }
}

/* 扩展 token 注入 Tailwind utilities */
@theme inline {
  --color-bg-canvas: var(--bg-canvas);
  --color-bg-panel: var(--bg-panel);
  --color-bg-elevated: var(--bg-elevated);
  --color-bg-subtle: var(--bg-subtle);
  /* border / text / accent / severity / status 见 DESIGN.md；逐项补齐 */
}
```

**强制约束：**

1. **禁止在业务组件里写原子颜色值**（如 `text-blue-600`）；必须用语义 token（`text-accent-default` / `text-severity-critical`）
2. **禁止在业务组件里写 `shadow-*`**，除 Cmd-K / Drawer / Tooltip 等浮层例外（用 `shadow-overlay`）
3. **所有数字展示**（金额 / 天数 / 日期 / EIN）必须 `font-mono tabular-nums`

### 5.3 组件分层

| 层                                     | 位置        | 职责                                                                                              |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `@duedatehq/ui/components/ui/*`        | shadcn 生成 | Button / Input / Dialog 等基础 primitives，不含业务、路由、session、oRPC                          |
| `apps/app/src/components/primitives/*` | 手写        | 真正跨 feature 的 app 专属 UI primitive，不含具体业务 model                                       |
| `apps/app/src/components/patterns/*`   | 手写        | 跨 feature 复用：app-shell / keyboard-shell / evidence-drawer / confirm-dialog                    |
| `apps/app/src/features/<vertical>/*`   | 手写        | 特性内部：billing model / dashboard risk UI / migration-wizard / pulse-banner / obligations-table |
| `apps/app/src/routes/*`                | 手写        | 路由级 page 组件，拼装 feature                                                                    |

**依赖方向**：route 拼装 feature；feature 可以消费 app patterns / primitives 和
`@duedatehq/ui`。`components/primitives` 不得依赖 feature。App-shell / keyboard-shell 这类 layout
pattern 可以组合 feature provider，但不能下沉到 `packages/ui`。`packages/ui` 不得依赖 Better Auth
session、React Router、TanStack Query、oRPC 或 app 专属业务组件。

### 5.4 AppShell（layout 级 sidebar + content shell）

[`apps/app/src/components/patterns/app-shell.tsx`](../../apps/app/src/components/patterns/app-shell.tsx) 是所有 protected layout 共享的「侧栏 + 顶栏 + content inset」骨架。它消费 `@duedatehq/ui` 的**自建 sidebar primitives**（**不是 shadcn `Sidebar` 注册组件**），把 navigation items / user / firm / themePreference 等业务数据作为 props 传入；shell 本身不引入路由数据获取与 session 订阅。

**为什么不用 shadcn Sidebar**

shadcn Sidebar（base-vega）打包了 3 种 collapse 模式（`offcanvas` / `icon` / `none`）+ `SidebarRail` + cookie 持久化 + `Cmd+B` 全局快捷键 + `floating` / `inset` chrome variant；这些**全部不在我们用例里**：DESIGN §5.4「侧栏不折叠」、`⌘K` + `⌘⇧O` 已占用键盘 vocabulary、§6「borders before shadows」反对 floating/inset。**自建 ~200 行 vs 引入 730 行未用 API**。详见 `docs/dev-log/2026-04-27-app-shell-sidebar.md` 的决策矩阵。

**自建的 sidebar primitives（在 `@duedatehq/ui/components/ui/sidebar`）**

| primitive                                                    | 角色               | 关键行为                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Sidebar`                                                    | `<aside>` root     | 220px 固定宽，`<md` 自动切换到 `Sheet` drawer                                                                                                                                                            |
| `SidebarHeader` / `SidebarContent` / `SidebarFooter`         | 三段式槽           | 纯 `<div data-slot="sidebar-{header,content,footer}">`                                                                                                                                                   |
| `SidebarGroup` / `SidebarGroupLabel` / `SidebarGroupContent` | 组                 | label 自带 11/16 mono uppercase 8% letter-spacing                                                                                                                                                        |
| `SidebarMenu` / `SidebarMenuItem`                            | `<ul>` / `<li>`    | 语义保留                                                                                                                                                                                                 |
| `SidebarMenuButton`                                          | 行内可点击         | `cva({ variant, isActive })` + `data-active` + 接受 `render` prop（让 react-router 的 `<NavLink>` 通过 base-ui `useRender` 注入；`data-*` props 直接传给 `useRender`，不经 `mergeProps<'button'>` 收窄） |
| `SidebarMenuBadge`                                           | mono 计数胶囊      | Numeric/Small + tabular-nums                                                                                                                                                                             |
| `SidebarTrigger`                                             | mobile-only toggle | `md:hidden`，调用 `useSidebar()` `setOpen(o => !o)`                                                                                                                                                      |
| `SidebarProvider` + `useSidebar()`                           | mobile sheet 状态  | 仅在 `<md` 时有意义；desktop 永远 expanded，`openMobile` 在 desktop 路径上由 `isMobile` 派生为 false                                                                                                     |
| `useIsMobile()` hook (`@duedatehq/ui/hooks/use-mobile`)      | 768px 断点匹配     | Base UI `useMediaQuery` 封装；server-safe 默认 `false`                                                                                                                                                   |

**纪律**

- **EntryShell（`/login` / `/two-factor` / `/accept-invite` / `/onboarding` / `/migration/new`）不挂 AppShell** —— entry surface 是单列、无导航的过渡页；`/migration/new` 是已有 active practice 但尚未进入 dashboard shell 的 activation step
- **每一个 protected layout（当前的 RootLayout，未来的 Workload Console 等）通过 `<AppShell>` 拼装**，不要在 layout 文件里直接拷贝 `SidebarProvider + Sidebar + SidebarInset` 三件套
- **Sidebar 不暴露 `collapsible` prop**：desktop 永远 220px，`<md` 自动 Sheet 折叠；这是产品决定不是配置项
- **selected nav 视觉是 bg-only**（`bg-state-base-hover-alt` + `text-text-primary` + Inter Semi Bold）—— 严禁 accent border 或 accent-tint 出现在 selected 态，否则与 DESIGN §1.2「颜色只为风险服务」冲突。`SidebarMenuButton` 的 cva variants 里**根本不提供** `accent` 变体，把约束写进类型
- **`navItems` 用一个 `useNavItems()` hook 拼装**，i18n 与权限过滤在 hook 内完成；items 形态 `{ href, label, icon, end?, badge?, tag?, disabledReason? }`。当前 sidebar IA 是 `Operations`（Dashboard / Obligations / Rules / Reminders）、`Clients`（Clients facts）、`Practice`（Practice profile / Team workload / Members / Billing / Audit log）。Calendar sync 是 Obligations 的二级低频出口，canonical URL 是 `/obligations/calendar`，旧 `/calendar` 只做重定向；它不进入 sidebar 一级导航。Pulse Changes 合并到 Rules 的二级 tab，Rules 入口承载待处理 Pulse badge；`/reminders` 是事务所级 reminder automation surface，承载模板、排期、投递状态和 client suppression；右上角 `Bell` 只表达个人通知收件箱，避免把事务所运营配置或政府规则变更误导成普通消息提醒。Team workload 是付费 Practice surface：Solo 可见但禁用并显示 `Pro` hint，Pro/Enterprise 启用 `/workload`；未来 Owner / Manager 角色 gate 仍走同一个 hook，**不**拆 AppShell 的两个版本。
- **Calendar sync 的 Apple 入口只对 HTTPS feed 生成 `webcal://`**：macOS Calendar 会对 `webcal://localhost:<port>` / `http://localhost:<port>` 订阅尝试 TLS 握手，本地明文 `wrangler dev` 端口会失败；本地 HTTP feed 显示解释 toast，staging/production HTTPS feed 才打开 Apple Calendar 直连。
- **Practice switcher 可见 trigger 在 sidebar 顶部**（不是 PRD §3.2.6 原始的右上 dropdown）；`⌘⇧O` 全局快捷键保留，popover 锚定在 sidebar trigger 上。`Add practice` 是 plan-gated secondary creation action：在 active practice entitlement 内打开创建 dialog，超出 Solo / Pro 的 1 active practice 限制时打开 upgrade / contact-sales gate，而不是继续创建免费 Solo tenant。内部组件名和 RPC 仍可沿用 firm。
- **Import clients / history 不做一等导航**：Import 是 activation/setup path，把 CPA 已有客户表带入 weekly triage；首登新建 practice 后进入 EntryShell 下的 `/migration/new?source=onboarding`，用无卡片 route header 解释导入价值并提供 route-level wizard + skip。日常启动入口在 `/clients` 页面 header / empty state、Dashboard 空状态和 Command Palette action，并继续打开 dialog shell。Import history 是低频 batch recovery，放在 `/clients` header 的弱入口并打开右侧 drawer；历史 `/imports` URL 仅兼容重定向到 `/clients?importHistory=open`。Sidebar 不承载导入或导入历史。
- **Plan status 入口在 sidebar footer**：`AppShell` 在 user menu 上方展示当前 practice 的 `Solo / Pro / Enterprise`、seat count 和 `Upgrade / Manage / View` 动作，统一链接 `/billing`。这只是 subscription 状态入口；完整 pricing / checkout / portal 和 active practice entitlement usage 仍在 Billing 页面。
- **顶栏右侧仅承载 AppShell-owned utility**（`⌘K` kbd hint + 通知 bell），路由动作放在 body 内或 body 顶部 toolbar，**不**塞到 shell header 右侧
- **Billing 不进入 route header**：pricing 和 subscription 属于 account / practice commerce 信息，不是当前 route 的 primary action。Header 右侧不展示 plan pill、upgrade button 或 pricing CTA，避免和 page toolbar、通知、Command Palette 竞争。
- **Practice profile 属于 Practice**：`/practice` 编辑 active practice 资料；user menu 不承载 practice profile，除非后续新增真正的 user account profile。
- **sidebar 的 Base UI `render` 包装不要用 `mergeProps<'button'>` 合成 `data-*` props**：TypeScript 会把 object literal 收窄到原生 button props 并拒绝 `data-slot` / `data-active`；直接把合并后的 `Record<string, unknown>` 传给 `useRender({ props })`，需要组合事件时在组件内显式包装 handler

**vercel-react-best-practices 红线（自建时一定要踩稳）**

- `rerender-no-inline-components` — `SidebarMenuButton` / `SidebarHeader` / 等所有 sidebar primitive 都是模块级组件；**严禁**在 `AppShell` render 里 inline 定义子组件
- `rerender-derived-state-no-effect` — active nav state **完全派生自 URL**（react-router `<NavLink>` 内部派生），不存 React state、不开 `useEffect` 同步
- `rerender-functional-setstate` — mobile sheet open 状态用 `setOpen(o => !o)` 而非 `setOpen(!isOpen)`，`toggleSidebar` 才能用 `useCallback([setOpen])` 稳定引用
- `rerender-memo-with-default-value` — `navItems` 数组在 `useNavItems` 内 `useMemo` + 深 i18n 依赖（`t` 的 lingui locale）；不在 render 里 inline 数组字面量
- `rerender-move-effect-to-event` — wizard reset、Step 1 解析、mobile sheet toggle 都放回用户事件 / reducer 边界；不要用 effect 桥接派生 UI 状态
- `bundle-analyzable-paths` — `@duedatehq/ui/components/ui/sidebar` 直接导出每个 named primitive；app 端用 `import { Sidebar, SidebarHeader, … } from '@duedatehq/ui/components/ui/sidebar'`，不走 barrel
- `client-event-listeners` — theme / viewport 这类外部订阅走专用 hook 或 `useSyncExternalStore`，业务组件不直接挂 `useEffect` listener
- `advanced-init-once` — `SidebarProvider` context value 走 `useMemo`，`toggleSidebar` 走 `useCallback`，避免每次 render 把新引用塞进 context 触发整个子树重渲染

**依赖方向澄清**

- `@duedatehq/ui/components/ui/sidebar` 不依赖 react-router、Lingui、Better Auth；它只输出 unstyled-but-tokenised 槽位组件 + `SidebarProvider` / `useSidebar()` context + `SidebarMenuButton` 的 `render` prop
- `apps/app/src/components/patterns/app-shell.tsx` 把 `react-router` 的 `<NavLink>` 通过 base-ui `useRender` 注入 `SidebarMenuButton` 的 `render` prop —— ui 包里**永远没有**对路由库的 import

---

## 6. 表格（Obligations）

- **当前落地**：`apps/app/src/routes/obligations.tsx` 使用 **TanStack Table 8** 作为 headless table state/rendering 层，继续复用 `@duedatehq/ui/components/ui/table` 的语义 `<table>` primitive。
- **服务端数据处理**：筛选 / 排序 / 分页仍由 `obligations.list` 和 D1 read model 负责；前端 `useReactTable` 开启 `manualFiltering` / `manualSorting` / `manualPagination`，不在浏览器端二次加工服务端行。
- **URL state**：`q`、`status`、`client`、`state`、`county`、`taxType`、`assignee`
  / `assignees`、`readiness`、`riskMin` / `riskMax`、`daysMin` / `daysMax`、`sort`、
  `row` 由 `nuqs` 管理。`obligationsSearchParamsParsers` 是模块级 query contract，
  `ObligationsSearchParams` 由 `inferParserType` 推导。筛选 / 排序变化在事件处理器中同步清空
  active row，避免用 effect 追踪派生状态。
- **Filter facets**：`obligations.facets` 返回 client / state / county / tax type /
  assignee 的服务器端选项和计数；county option 带 `state`，前端按已选 state 做联动展示。
  Obligations readiness 由 read model 派生：closed status → `ready`；最新 Readiness Portal
  response 可产出 `ready` / `waiting` / `needs_review`；无 response 时由
  `waiting_on_client → waiting`、`review → needs_review`、其余 open status → `ready` 派生。
- **表头筛选**：Client / Owner / State / County / Tax type / Days / Projected risk /
  Readiness / Status 的筛选入口直接挂在 TanStack Table header 上；顶部控制区只保留搜索、排序、
  Reset 和少量 triage 快捷 chip，避免 Obligations 出现两套筛选面。
- **搜索防抖**：Obligations 搜索是客户端 TanStack Query fetching，不是 React Router
  loader/RSC fetching。`nuqs` 负责即时 URL state 和 URL 写入降频；实际
  `obligations.list` input 使用 `apps/app/src/lib/query-rate-limit.ts` 中的
  `useDebouncedQueryInput()`，底层 deep import `foxact/use-debounced-value`。这符合
  nuqs 对 client-side fetching 的建议：debounce hook 返回的 state，而不是把
  `limitUrlUpdates` 当作请求防抖。搜索长度由 contract 限制为 64 字符；DB repo
  在进入 D1 `LIKE` 前会 normalize 并 escape pattern，避免用户输入触发 SQLite
  pattern 编译错误。
- **分页形态**：当前后端是 cursor pagination（50 行 / 页）。前端通过
  `useInfiniteQuery(orpc.obligations.list.infiniteOptions(...))` 消费 contract：
  `pageParam` 注入 `cursor`，`getNextPageParam` 读取后端 `nextCursor`，并把
  `data.pages[].rows` 交给 TanStack Table。浏览器 URL 不保存 cursor，因为
  cursor 是查询内部的分页游标，不是可分享的筛选状态。
- **虚拟化时机**：`@tanstack/react-virtual` 已在依赖中保留，但当前 4 列 × 50 行不启用。等 Obligations 扩到 PRD 的 10–20 列、固定表头或长列表滚动容器时再接 row / column virtualization。
- **后续扩展**：列可见性、自定义列、批量选择、Saved Views 应继续走 TanStack controlled state，并把可分享状态写入 URL 或服务端 saved-view 记录。
- 行内 `[status ▾]` mutation：当前成功后 invalidate `obligations.list` 并 toast audit id；失败 toast 错误信息。需要真正 optimistic rollback 时在 mutation lifecycle 内补本地缓存更新。
- 键盘：`J/K` 上下行 · `E` 展开 Evidence · `F/X/I/W` 改状态 · `Enter` 打开 Detail

## 6A. Rules Console

- `/rules` 的六个 P0 tab（`coverage` / `sources` / `library` /
  `pulse` / `temporary` / `preview`）由 `nuqs` 管理 URL state，使用 `tab` 参数持久化当前二级视图。
  `rulesConsoleSearchParamsParsers` 是模块级 query contract，`RulesTab` 从
  `inferParserType` 推导。
- 缺省或非法 `tab` 回落到 `coverage`，避免无效 URL 打断受保护路由加载。
- tab 切换不进入 Zustand；它是可分享的页面状态，和 Obligations 的
  `q/status/sort/row` 同属 URL state。
- Rule Library 右侧 detail drawer 使用比默认 Sheet 更宽的 ops 宽度（桌面约
  920px，窄屏回落到全宽），用于同时容纳 rule logic、extension policy、evidence locator 和 verification
  metadata。
- Pulse Changes tab 承接原 firm alert review queue。Owner / Manager 在这里 review
  受影响客户、apply 临时 exception、dismiss noise、revisit closed changes；通知深链使用
  `/rules?tab=pulse&alert=<id>` 打开对应 drawer。
- Pulse Changes list 先按业务影响分层（needs action / needs review / no matches / closed），再按
  firm alert status 和 source 过滤。这里吸收参考 Alerts 工作台的 triage 优点，但不恢复独立
  `/alerts` 路由，也不把非本所匹配的公告混入 firm decision queue。
- Pulse detail drawer 按 source context、parsed scope、affected obligations、suggested actions
  和 safety checklist 排列，保留 Alerts 工作台的「来源 -> 影响 -> 下一步」节奏，同时把真正写入
  deadline overlay 的动作限定在 selected obligations 上。
- Temporary Rules tab 直接展示已 apply 的 Pulse-backed `exception_rule` overlays：active /
  reverted / retracted 状态、覆盖辖区与 forms、override due date、active obligation count、
  official source link，以及回到 Pulse detail 的 revert/follow-up 入口。

## 6B. 高频 Query 输入

- `apps/app/src/lib/query-rate-limit.ts` 是 app 内 URL query 文本输入的统一入口：
  `queryInputUrlUpdateRateLimit` 负责 `nuqs` URL 写入降频，
  `useDebouncedQueryInput(value, { maxLength })` 负责 TanStack Query/oRPC input
  的请求防抖。调用方必须从 contract 显式传入 `maxLength`，不在 helper 内绑定某个
  feature 的默认长度。清空输入必须立即返回空字符串，避免清空筛选时仍等待 350ms。
- Obligations 与 Audit log 都是 URL state + client-side TanStack Query fetching；
  它们的 search/filter 文本必须先经过 `useDebouncedQueryInput()` 再进入
  `orpc.*.queryOptions()` / `infiniteOptions()` input。不同 contract 上限通过
  `maxLength` 传入，例如 Obligations 64、Audit search 80、Audit 精确筛选 128。
- Clients facts 页当前一次拉取 `clients.listByFirm({ limit: 500 })` 后本地过滤，
  搜索不触发服务端 fetching；因此只对 `q` 的 URL 写入使用
  `queryInputUrlUpdateRateLimit`。表头 facet（client/entity/state/readiness/source/owner）
  也走 URL state，但仍基于这份本地列表即时过滤，不触发额外 fetching。`client=<id>`
  是同页详情态，不是独立 route 或右侧 sheet；详情页用单页面滚动，顶部承载客户身份与
  Pulse impact，主体承载 work plan、filing facts、risk summary、contact chain 和 activity log。
- Client detail 的 filing profile 编辑走 `clients.replaceFilingProfiles` mutation，risk inputs
  走 `clients.updateRiskProfile` mutation；成功后必须 invalidate Clients、Dashboard、
  Obligations list/listByClient/detail/facets 与 client risk summary，确保 state/county、
  exposure 与 Pulse/规则相关派生视图不滞后。

---

## 7. 表单

- **TanStack Form + Zod Standard Schema**；复杂 client-side 表单使用
  `@tanstack/react-form` 的 `useForm` / `form.Field` / `form.Subscribe`
- 表单级校验直接把 Zod schema 挂到 `validators.onSubmit` / `validators.onChange`；不要引入
  resolver 适配层
- 与后端契约同源的表单必须优先 import `packages/contracts` schema；纯 UI draft schema 可以留在
  feature model 内，但提交前仍需经过 contract schema 或 RPC contract 校验
- Server error（oRPC 返回 `ORPCError`）映射到字段级 error 由统一 hook `useRpcMutation` 处理

---

## 8. 客户端缓存与通知策略（替代原 PWA 方案）

原先这里的 PWA + Service Worker + Web Push 方案在 Phase 0 已整体降级（见 `00-Overview.md §7`、`01-Tech-Stack.md §2.1`）。当前约束：

- **HTTP 级缓存**：静态 asset 走 Cloudflare Worker Assets binding 的自带 immutable caching（hash 化 chunk 名 + `cache-control: public, max-age=31536000, immutable`）；`index.html` 不缓存。Vite+ `vp build` 输出已满足。
- **SPA runtime cache**：TanStack Query 的 `staleTime` / `gcTime` + nuqs URL state 承担"秒开回访"；不引入 Service Worker。
- **通知回路**：Deadline / audit / system 到达事件写入 `in_app_notification` 并由右上角 bell 与 `/notifications` 承载；Pulse 审批 fan-out 同时写 `pulse_alert` 个人通知，点击深链到 `/rules?tab=pulse&alert=<id>` 打开对应 drawer。Pulse 的决策闭环在 Rules > Pulse Changes 和 Dashboard banner，不把 apply / dismiss / snooze / revert 混进 Notification center。`/notifications` 还承载个人 morning digest 偏好：practice timezone 下的发送小时/星期、preview、recent run audit；digest 只在 deadlines、Pulse changes、reminder delivery failures 或 unassigned pressure 需要关注时发送，quiet day 只写 `skipped_quiet` 审计。外部触达走 Email Outbox（Resend）+ in-app toast（Sonner）。事务所级 reminder automation 在 `/reminders` 闭环：模板编辑、30/7/1-day 排期、最近投递状态和 client email suppression 都在那里，不放进个人 bell。没有 Web Push、没有浏览器通知权限 prompt。
- **Installable 体验**：推迟到 Phase 2 Tauri menu bar widget 统一覆盖 install / 后台驻留 / 系统通知。不再通过 manifest 走 PWA install。

如未来重新开启 PWA，需要先满足两个前置：(1) vite-plus 生态有稳定的 vite 8 兼容 PWA 插件；(2) Pulse / Deadline 有真实"即时到达"需求（Phase 0 日常场景 email 足够）。重启时要在 `00-Overview.md §7` 把 PWA 从否决矩阵移除，并在本章补回 manifest / SW / push 三小节。

---

## 9. 关键交互模式

- **Optimistic UI**：所有改状态 / 改 assignee 的 mutation 先改 cache，失败回滚 + toast
- **Loading skeleton**：每页至少一张 skeleton；冷启动避免白屏
- **Keyboard Shell**：`apps/app/src/components/patterns/keyboard-shell` 是唯一 app 级快捷键入口，基于 `@tanstack/react-hotkeys`。全局层注册 `?` / `Cmd/Ctrl+K` / `Cmd/Ctrl+Shift+D` / `Cmd/Ctrl+Shift+O`，导航序列层注册 `G then D/W/C/T`（Dashboard / Obligations / Clients / Team workload），Members route 层注册 `Cmd/Ctrl+I`，Obligations route 层注册 `J/K/Enter/E/F/X/I/W`，Wizard/Overlay 层压住 route/navigation 快捷键。裸字母键保留 TanStack 的 input ignore 行为，`Enter` 只在明确声明 `ignoreInputs: false` 且手动排除 textarea/contenteditable/select 时使用。所有可见 shortcut label 走 keyboard shell display helpers，不在业务组件里手写平台判断。
- **Command Palette (Cmd-K)**：全局快捷键，搜索输入 + 三段结果（Navigate / Actions / Ask），Ask 在 Phase 1 前留占位 `Coming soon`。Navigate 必须直接列出 canonical 一级页面（Dashboard / Obligations / Notifications / Reminders / Team workload / Clients / Practice profile / Rules / Members / Billing / Audit log），不再提供聚合 `Settings` 命令。`Practice profile` 必须导航到 `/practice`。Palette 使用 lazy import，第一次 `Cmd/Ctrl+K` 后加载，避免进入首屏 bundle 热路径。列表交互基于 shadcn `Command` / `cmdk`，开启 `disablePointerSelection`，键盘 active item 不被鼠标 hover 抢走；鼠标 hover 用浅层 `bg-background-subtle`，键盘 active item 用更深的 `bg-state-base-hover`。
- **Shortcut Help (?)**：帮助浮层从 TanStack `useHotkeyRegistrations()` 读取当前已 mount 快捷键，再合并 reserved slots（Ask `/`、Evidence selected），避免文档与实现分叉。
- **Evidence Mode**：Obligations `E`、row action、Dashboard top rows 和 Brief citation
  统一调用 app-level Evidence drawer；全局 `Cmd/Ctrl+E` 仍保留给未来 cross-page selection。

---

## 10. 无障碍

- WCAG 2.2 AA 基线
- 所有交互元素 `tabindex` 正确；Base UI 自带正确 focus management
- 颜色对比度 ≥ 4.5:1（DESIGN.md 的 token 已满足）
- 暗色模式真实切换（不只是 media query）
- `prefers-reduced-motion` → Live Genesis / Penalty Radar 金额动画降级为短 fade

---

## 11. i18n

> 选型依据：[ADR 0009 · Lingui as the i18n library](../adr/0009-lingui-for-i18n.md)。原 `i18next + react-i18next`
> 线已废止。

- **库**：Lingui v6 —— `@lingui/core` + `@lingui/react`（runtime），`@lingui/cli` +
  `@lingui/vite-plugin` + `@lingui/babel-plugin-lingui-macro` + `@rolldown/plugin-babel`（dev），
  版本全部入 `pnpm-workspace.yaml` catalog 精确锁
- **书写**：所有用户可见文案走宏 `<Trans>…</Trans>` / ``t`…` ``，**禁止**运行时 `i18n._(dynamicStr)`
  ；模块级惰性文案使用 `msg` + `i18n._(MessageDescriptor)`，只允许已抽取的 descriptor
- **Zod 保持 locale-free**：`packages/contracts` schemas 只返回结构化错误 `{ code, path }`，不含文案；
  前端 RHF 的错误 UI 用 `<Trans>` 按 `code` 分支渲染
- **Catalog 布局**：`apps/app/src/i18n/locales/{locale}/messages.po`（源）→ `lingui compile --strict`
  出 `.ts`（产物）；当前 `en` + `zh-CN` 体积可忽略，先静态 import，新增第三种语言时再改
  `dynamicActivate`
- **Catalog 完整性**：`i18n:extract` 固定使用 `lingui extract --clean`，删除源码已移除的 obsolete
  entries；`i18n:compile` 固定使用官方 `lingui compile --strict`，任何活跃 catalog 的 missing
  translation 都直接失败，不再维护 missing baseline
- **PO formatter**：`@lingui/format-po` 保留 file-level origins，但关闭 line numbers，避免纯代码移动
  造成 `.po` diff churn
- **共享 contract**：`SUPPORTED_LOCALES`、`DEFAULT_LOCALE`、`INTL_LOCALE`、`LOCALE_HEADER` 位于 `packages/i18n`；app、server、marketing 共享这些常量，但 catalog 分离
- **Marketing i18n**：`apps/marketing` 使用 Astro i18n routing + 静态 copy dictionary；不把 landing 文案写进 app 的 Lingui PO
- **服务端**（Hono 中间件 + React Email 模板）：Worker 不加载 Lingui runtime；`x-locale` >
  `Accept-Language` > `en` 解析后走 `apps/server/src/i18n/messages.ts` 类型化薄字典
- **Node / Vite 约束**：Lingui v6 是 ESM-only，要求 Node `>=22.19`；`@lingui/vite-plugin`
  要求 Vite `^6.3.0 || ^7 || ^8`，由 Vite+ 工具链统一承载
- **Macro transform**：`apps/app/vite.config.ts` 使用
  `@rolldown/plugin-babel + linguiTransformerBabelPreset()`；若收窄 `include`，必须用能匹配
  绝对 module id 的正则，不能用 `src/**/*.{ts,tsx}` 这类 picomatch brace glob
- **富文本占位符**：`lingui.config.ts` 启用 `data-t` 与常见 tag 默认 placeholder 名，避免
  `<0>` / `<1>` 这类对译者不友好的占位符
- **日期 / 金额** 用 `Intl.DateTimeFormat` / `Intl.NumberFormat`，不引 moment / dayjs。
  Protected app 内所有系统时间戳展示（created/updated/applied/generated/accessed 等 datetime）
  必须使用 active practice profile 的 timezone：从 `_layout` 的 `PracticeTimezoneProvider`
  通过 `usePracticeTimezone()` 读取，或从当前 firm data 显式传入 `formatDateTimeWithTimezone`。
  `formatDateTimeWithTimezone(value, timeZone)` 不提供 browser-local 默认值；新增 datetime
  展示必须显式传 timezone。例外是用户手动选择的 date-only 字段、due date / ETA / rule
  effective date 等业务日期，继续用 `YYYY-MM-DD` / `formatDate`，不做 timezone 转换。
- **复数 / 选择**用 Lingui 原生 `<Plural>` / `<Select>`（ICU MessageFormat），不额外装 `i18next-icu`

### 11.1 操作命令

1. `pnpm --filter @duedatehq/app i18n:extract`：扫描源码、更新 `.po`，并清理 obsolete entries
2. `pnpm --filter @duedatehq/app i18n:compile`：用 `lingui compile --strict` 编译 catalog 到 `.ts`；
   任意 missing translation 都让本地命令和 CI 失败
3. CI drift check：在每次 `main` push 与 PR 上执行 extract + compile 后，对
   `apps/app/src/i18n/locales` 跑 `git diff --exit-code`，同时阻止 missing translation 与
   源码文案 / catalog / 编译产物脱节；Lingui CLI 没有只检查不写入的官方 `--check` /
   dry-run 模式，所以 `git diff` 是外层 generated-artifact 同步断言；该 workflow 不使用
   `paths` 过滤，因为 catalog drift 是仓库状态检查
4. `pnpm ready`：覆盖 check、test、build；Vite 插件会在 build 中再次编译 `.po`，但
   不替代 extract + strict compile + diff 这一独立 catalog gate
5. 排查 CLI 并行问题时可临时加 `--workers 1`

---

## 12. 性能优化清单

- 路由级 code-splitting（RR7 `lazy` 动态 import）
- 图标 tree-shake（`lucide-react` 按需导入）
- Tailwind 4 JIT + Vite 8 Rolldown minify（由 `vp build` 驱动）
- Critical CSS inline（index.html）
- 静态 chunk 走 Worker Assets binding 的长 cache（hash 化文件名 + `immutable`）
- Chunk 大小 budget：单 chunk < 150 KB gz，总 bundle < 500 KB gz

---

## 13. Storybook（Phase 1 可选）

- 组件库（`packages/ui/src/components/ui` + `apps/app/src/components/primitives`）走 Storybook
- Story 每个组件至少：default / hover / disabled / dark / error 5 个
- Visual regression 用 Chromatic（免费层够用）

Phase 0 不做 Storybook，优先跑 Demo。

---

## 14. TODO

- ~~接入 auth 时：登录态检查必须放在 app layout route 的 `loader` 或统一组件 gate 中，不要散落在各页面组件里。~~ 已在 `apps/app/src/router.tsx` 里用 `protectedLoader` / `guestLoader` 两个 loader 落地（`protected` 路由组 + 独立 `/login` 路由组），`RootLayout` 通过 `useLoaderData` 读取 `user`，不再订阅 `useSession`。
- ~~Obligations 接真实筛选 / 分页时：筛选、排序、分页和选中项必须通过 React Router search params 或 `nuqs` 管 URL state，不要放进普通组件 state。~~ 已在 `apps/app/src/routes/obligations.tsx` 中用 `nuqs` 管 `q/status/sort/row`；后端 cursor 通过 oRPC infinite query 的 `pageParam` 消费。

---

继续阅读：[06-Security-Compliance.md](./06-Security-Compliance.md)
