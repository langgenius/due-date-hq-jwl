# 12 · Marketing Architecture · Astro 公开站

> 目标：为 DueDateHQ 的公开首页与后续 SEO 内容建立独立、可扩展、可部署的架构边界。
> 决策：`apps/marketing` 使用 Astro；`apps/app + apps/server` 继续作为登录后的 SaaS 产品面。
> 官方依据：Astro React integration、Astro i18n routing、Astro Cloudflare deployment docs；版本以 `pnpm-workspace.yaml` catalog 为准。

---

## 1. 产品定位

`apps/marketing` 只服务未登录访客，不承担 SaaS 工作台能力。

| 站点       | 域名                                              | 用户心智                     | 主要任务                                  |
| ---------- | ------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| Marketing  | `https://due.langgenius.app`                      | 了解产品、建立信任、点击试用 | 首页、pricing、SEO meta、OG、后续 content |
| SaaS App   | `https://app.due.langgenius.app`                  | 登录后处理截止日风险         | Login、onboarding、dashboard、Obligations |
| Worker API | `https://app.due.langgenius.app/api/*` / `/rpc/*` | 产品后端                     | Better Auth、oRPC、webhook、health        |

用户路径：

```text
due.langgenius.app
  -> Landing CTA
  -> app.due.langgenius.app/
  -> SaaS SPA auth gate
```

不把 landing 放进 `apps/app` 的原因：当前 app 是 Vite SPA，服务端返回同一个 `index.html` 壳；这对登录后工作台正确，但不是公开 SEO 页面的最佳运行模型。Astro 的 HTML-first 输出、零 JS 默认和 islands 模型更适合 marketing。

---

## 2. Landing PRD

### 2.1 ICP

首版面向美国中小 CPA practice 的 owner / operations lead。核心焦虑不是“日历好看”，而是高峰季的截止日风险、客户资料缺口、州税变更和团队分诊成本。

### 2.2 核心承诺

Homepage 只讲一个 offer：

> DueDateHQ helps CPA teams see deadline risk before it becomes a penalty.

中文工作口径：

> 让 CPA 团队在罚款发生前看清截止日风险。

### 2.3 首屏结构

首屏必须让访客在 5 秒内理解三件事：

1. 我们服务谁：CPA teams / practices。
2. 解决什么：deadline risk, evidence gaps, filing-pressure triage。
3. 下一步是什么：进入 app 或预约 demo。

首屏 H1 使用产品名或直接 offer，不写抽象口号。主 CTA：

- Primary：`Open the workbench` -> `https://app.due.langgenius.app`
- Secondary：`See the workflow` -> 页面内锚点

首屏视觉必须直接展示产品工作台状态：截止日风险、截止日队列、证据来源、Pulse 变更。禁止纯装饰渐变、抽象插画、漂浮卡片堆叠。

### 2.4 页面模块

首版 landing 限制为 6 个模块，避免 marketing 站变成散文页：

| 模块      | 目的                 | 内容要求                                                                                                         |
| --------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Hero      | 说明 offer + CTA     | 产品名、截止日风险 mock、deadline queue 截图或复刻 UI                                                            |
| Problem   | 触发 ICP 共鸣        | 高峰季错过州税变更、K-1 资料缺口、客户 deadline 分散                                                             |
| Workflow  | 展示产品如何工作     | 7-day queue、evidence gate、Pulse update 三步                                                                    |
| Proof     | 建立可信度           | verified source、audit trail、no black-box AI                                                                    |
| Trust     | 降低顾虑（CPA 视角） | Per-firm 数据隔离、Evidence-first AI（每条声明带 source + excerpt）、Audit log 可导出、Email-first（无客户门户） |
| Final CTA | 转化                 | Open the workbench / request demo；不增加第三个 CTA                                                              |

> **Marketing copy 铁律**：landing 文案禁止出现具体技术栈或框架名（"Better Auth"、"Cloudflare D1"、"Resend"、"WISP"、"PII back-fill" 等）。CPA 决策人不识别也不在乎技术栈；要用业务语言（per-firm 隔离、evidence-first AI、audit log 可导出）替代。架构边界仍由 §11 非目标约束代码侧不依赖 Better Auth session — 但**不外露 token 名**。

`/pricing` 已作为静态 Astro 页面进入首版支付闭环：公开页只负责转化和 SEO，
不读取 app session、不发起 Stripe API、不保存任何支付状态。自助付费 CTA deep link 到
SaaS app 的 `/billing/checkout?plan={solo|pro|team}&interval=monthly`；未登录用户由 app
自己的 auth/onboarding loader 接管后再回到 checkout。后续可以追加 `/rules`、
`/state/[state]`、`/blog`，但不为不存在的内容搭复杂 CMS。

GEO v1 已将公开内容扩展为静态 Astro 页面：`/rules`、`/state-coverage`、
`/states/{california,new-york,texas,florida,washington}`、`/guides/cpa-deadline-risk`
和 `/guides/evidence-backed-tax-deadline-software`，每个页面都有对应 `/zh-CN/*`
版本。内容只描述软件覆盖、官方来源处理、证据复核和运营边界；禁止把公开页写成税务建议、
法律建议或客户特定适用性判断。新增公开内容继续使用 typed dictionary，不引入 CMS。

Trust v1 将公开信任面补齐为静态 Astro 页面：`/about`、`/security`、`/privacy`、
`/terms`、`/status`，每个页面都有对应 `/zh-CN/*` 版本。这些页面只说明产品边界、
数据/安全/条款/状态的公开摘要和联系入口；正式法律条款、隐私协议或安全评审仍通过
对应业务渠道处理。footer 中 Privacy / Terms / Status 必须指向这些公开页面，不再用
邮件链接替代可索引信任页。

`apps/marketing/src/components/Pricing.astro` 的视觉布局严格对齐 Figma `Marketing
→ DueDateHQ — Pricing (Marketing)` frame 与 DESIGN.md：

- 四档套餐分节：**Hero**（PRICING eyebrow + display-large title + 760 px 描述 +
  mono note）、**Plans Header**（PLANS eyebrow + 22 px 副标题 + `USD PRICING ·
OWNER-APPROVED UPGRADES` 右侧 mono 备注）、**Plans Row**（2 列 tablet、4 列 desktop，
  cards stretch 等高）、**FAQ**（FAQ eyebrow + 24 px heading + 3 列 panel）。
- 卡片必须 flat：`rounded-xl` + `p-8` + 上下分组 `gap-7` + CTA 与内容之间 `mt-10`
  呼吸距离。Recommended 套餐用 `border-[1.5px] border-accent-default` 与 accent
  CTA 区分，**禁止** drop shadow / 顶部 stripe / 渐变 / decorative chrome。
- 价格走 token 区分：数字 (`$39` / `$79` / `$149`) 用 `font-mono font-bold text-[40px]`，
  非纯数字 (`From $399`) 用 `font-sans font-semibold text-[40px]`；席位/试用提示走
  Geist Mono 11 px `tracking-[0.06em]` `text-text-muted`。
- Feature ✓ icon 用 `size-4 rounded-sm bg-accent-tint text-text-accent`，**不**
  使用 `bg-status-done`（DESIGN.md 把 status-done 限定为 filed/done/applied 状态，
  不应用作通用列表标记）。

i18n 契约由 `PricingCopy` (`apps/marketing/src/i18n/types.ts`) 锁定：每个套餐
必须含 `priceKind: 'numeric' | 'text'` 与 4 条 features，并自带 `plansHeader` /
`faqHeader` 两段 eyebrow + 标题。en + zh-CN 必须同步更新。
Pricing 文案必须用业务语言描述套餐价值，禁止把内部实现或测试环境写进公开卖点：
不要出现 `test-mode`、`Stripe-hosted`、`sandbox` 这类词；支付和实现边界留在 app
checkout / billing settings 或工程文档中表达。

Pricing 文案必须把 practice/workspace 数量作为一等 entitlement，不能只写 seat：

| Plan       | Public entitlement copy                                          | Product meaning                                                      |
| ---------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| Solo       | `$39/mo · 1 practice workspace · 1 owner seat`                   | 付费低档只包含一个 active practice；trial/demo 与生产账单分开处理。  |
| Pro        | `$79/mo · 1 production practice · 3 seats included`              | 自助付费计划仍只包含一个生产 practice workspace。                    |
| Team       | `$149/mo · 1 production practice · 10 seats included`            | 完整自助 Team 计划；适合更大运营团队，但仍只有一个 active practice。 |
| Enterprise | `from $399/mo / custom · multiple practices/offices · 10+ seats` | 多 practice / 多办公室 / API / SSO / demo-production 分离走 sales。  |

FAQ 必须解释 "Can I create multiple practices?"：Solo、Pro 和 Team 包含 1 个 active practice workspace；
additional practices / offices / demo-production separation 属于 Enterprise plan。公开页不要暗示
Solo 可以创建多个 workspace，也不要把 `organizationLimit`、Better Auth organization
或内部 entitlement 字段名写给客户。

Pricing handoff 由 Playwright 覆盖：本地 e2e 会单独启动 Astro preview，并用
`PUBLIC_APP_URL` 指向 app Worker；测试只验证 CTA href、登录回跳和 locale handoff，
不把 marketing 页面视觉文案作为支付链路断言。

### 2.5 转化事件

Marketing 只埋公开站事件，不读取 app session。

| Event                               | 触发                      |
| ----------------------------------- | ------------------------- |
| `marketing.hero_cta.clicked`        | Hero primary CTA          |
| `marketing.secondary_cta.clicked`   | Hero secondary CTA        |
| `marketing.workflow_section.viewed` | Workflow 进入视口         |
| `marketing.final_cta.clicked`       | 页尾 CTA                  |
| `marketing.pricing.checkout`        | Pricing Solo/Pro/Team CTA |
| `marketing.pricing.app`             | Pricing Solo CTA          |
| `marketing.pricing.contact`         | Pricing Enterprise CTA    |

事件命名不进 Lingui catalog。若 PostHog 尚未接入 marketing，先保留 data attribute 和文档契约。

> **跨子域身份缝合**：`due.langgenius.app` 与 `app.due.langgenius.app` 是不同 origin，PostHog 默认会生成两个独立 `distinct_id`，导致 `marketing.*_cta.clicked → app 注册` 漏斗断裂。接入 PostHog 时必须做一件事：marketing 侧在 CTA `href` 拼接 `?ph_did={posthog.get_distinct_id()}`，app 侧首屏读取 `ph_did` 后调用 `posthog.identify(ph_did)` 合并身份。在 PostHog 真正接入前，本节只承诺事件契约不承诺漏斗闭环。

---

## 3. 架构

```text
apps/marketing
  Astro static site
  @astrojs/react for selected React islands
  @duedatehq/ui for shared primitives and tokens
  local marketing copy catalogs
  deploys to due.langgenius.app

apps/app
  Vite React SPA
  React Router 7 data mode
  Lingui app catalogs
  deploys as Worker Assets behind apps/server

apps/server
  Hono Worker
  /api/auth/* Better Auth
  /rpc/* oRPC
  /api/webhook/* callbacks
  deploys to app.due.langgenius.app
```

`apps/marketing` 不调用 `/rpc` 做首屏渲染。公开 landing 的可信内容必须是静态文案或构建期数据。后续 `/rules` / `/state/*` 若需要规则快照，优先从静态 JSON snapshot 或公开 `/api/v1/*` 读取，不直接复用内部 `/rpc`。

---

## 4. Astro 项目形态

建议目录：

```text
apps/marketing/
├── astro.config.mjs
├── package.json                 # name: @duedatehq/marketing
├── public/
│   ├── favicon.svg
│   └── og/
├── src/
│   ├── pages/
│   │   ├── index.astro          # default locale landing
│   │   └── zh-CN/
│   │       └── index.astro      # localized landing, if enabled
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── Workflow.astro
│   │   ├── Proof.astro
│   │   └── FinalCta.astro
│   ├── islands/
│   │   └── LocaleSwitcher.tsx   # only when interactivity is needed
│   ├── i18n/
│   │   ├── locales.ts
│   │   ├── en.ts
│   │   └── zh-CN.ts
│   └── styles/
│       └── globals.css
└── tsconfig.json
```

Astro 默认不向页面发送 JS。React 组件只有在需要交互时作为 island 加载，并显式使用 `client:*` directive。静态 section 优先写 `.astro`，不要把整个 landing 做成 React SPA。

### 4.1 404 与错误兜底

Marketing 是 Astro static output，不使用 React Router data router，也不存在 app 那种组件树
`ErrorBoundary`。未匹配公开路径的兜底契约是：

- `apps/marketing/src/pages/404.astro` 必须存在，并在构建时输出 `dist/404.html`。
- Cloudflare Workers Static Assets 使用 `not_found_handling = "404-page"`，未命中资源时读取
  `/404.html`，而不是回退到 SPA shell。
- 404 页复用 `BaseLayout`、`TopNav`、`Footer`、shared tokens 和 marketing i18n copy；页面必须
  标记 `noindex`，避免把错误路径收录为公开内容。
- 404 页使用英文默认页作为跨 locale 兜底；如果将来需要按语言渲染，可追加
  `src/pages/zh-CN/404.astro`，但 Cloudflare 的根级 fallback 仍要保证 `/404.html` 可用。

Astro 官方实践是为静态站创建 `src/pages/404.astro` / `404.md`，构建为 `404.html` 后由部署平台
识别。`src/pages/500.astro` 只面向 on-demand rendered 页面；当前 marketing 没有 SSR adapter，
因此不把 500 页作为首要兜底。

`astro.config.mjs` 目标配置：

```js
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Required for canonical URLs, hreflang, and @astrojs/sitemap output.
  site: 'https://due.langgenius.app',
  // Single canonical form. Avoids /zh-CN/ vs /zh-CN duplicate URLs.
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react(), sitemap()],
  // Tailwind 4 ships as a Vite plugin; Astro consumes it via vite.plugins.
  // The CSS-only `@import 'tailwindcss'` form does NOT work without this.
  vite: { plugins: [tailwindcss()] },
  i18n: {
    locales: ['en', 'zh-CN'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

> **i18n routing 选项注意**：`redirectToDefaultLocale` 仅在 `prefixDefaultLocale: true` 时有效（让 `/` 跳到 `/en/`），与本项目"默认英文不加前缀"策略冲突，故不启用。

如果首版只发布英文首页，仍要把 locale contract 先接到共享包，页面内容可以只实现 `en`。

依赖准备（在实现前先一次性写入 `pnpm-workspace.yaml` catalog，遵守 §3 of `01-Tech-Stack.md` 钉版政策）：

```yaml
# catalog: 中追加（版本以发布时最新稳定版为准，写入后 saveExact 自动锁定）
astro: <pinned>
'@astrojs/react': <pinned>
'@astrojs/sitemap': <pinned>
```

`apps/marketing/package.json` 引用必须写 `catalog:`，不允许字面量版本。

---

## 5. UI 与设计

`packages/ui` 是唯一共享 UI 和 token 来源：

- `@duedatehq/ui/components/ui/*`：React primitives，可用于 Astro React islands。
- `@duedatehq/ui/styles/preset.css`：Tailwind 4 token、semantic colors、radius、typography。
- `@duedatehq/ui/lib/utils`：`cn()`。

Marketing 的 `src/styles/globals.css` 必须消费同一 preset：

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@duedatehq/ui/styles/preset.css';

@source '../../../packages/ui/src';
@source '../components';
@source '../islands';
```

Astro theme 初始化必须复用 app 同一套 runtime，而不是在 marketing app 私有脚本里重写逻辑。
推荐在基础 layout 中最早导入全局 CSS，并在 `<head>` 内内联共享脚本：

```astro
---
import '@duedatehq/ui/styles/preset.css'
import { THEME_INIT_SCRIPT } from '@duedatehq/ui/theme/no-flash-script'
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="theme-color" content="#0A2540" />
    <script is:inline set:html={THEME_INIT_SCRIPT}></script>
  </head>
  <body>
    <slot />
  </body>
</html>
```

依据 Astro 官方 styling 文档，global CSS 通常放在 Layout 里导入，且从 npm package
导入带 `.css` 扩展的样式可由 Astro/Vite 打包优化。`@duedatehq/ui/styles/preset.css`
已经按这个模式通过 package `exports` 暴露。依据 Astro client-side scripts 行为，layout
中的普通脚本会作为客户端脚本输出；此处使用 `is:inline` 是为了让主题 class 在首屏绘制前同步
落到 `html`，避免 dark/system 用户先看到 light token 再切换。

设计风格继承 `docs/Design/DueDateHQ-DESIGN.md` 的专业、克制、证据优先方向，但 landing 可以使用更大的标题和更宽的叙事节奏。边界如下：

- 可以：真实产品 UI 截图 / 产品状态复刻、navy 文本、Dify UI blue CTA、风险色只用于业务信号。
- 不可以：紫色渐变 hero、抽象 SVG 插画、漂浮装饰球、大圆角营销卡片堆、与产品无关的 stock photo。
- Cards 只用于重复 proof/workflow item；页面 section 不做“卡片套卡片”。
- 首屏必须露出下一段内容的一部分，避免一屏只有 hero。

Landing 的产品截图优先来自真实 `apps/app` 状态；若用 mock，必须标明为 illustrative product state，不展示不存在的客户或真实 PII。

### 5.1 Islands JS 预算硬约束

§8 的 "JS transferred < 50 KB gz 首版" 极易被 `@duedatehq/ui` 的 base-ui/Radix primitive（Select / DropdownMenu / Dialog / Sheet / Popover / Tooltip 等）单组件吃光。规则如下：

- Astro `.astro` 静态片段中：**可以**使用 `@duedatehq/ui` 的样式 token、`cn()` 与简单 primitive（Button、Badge、Card）渲染为静态 HTML。
- Astro islands（`client:*`）中：**不允许**导入 `@duedatehq/ui` 的复杂 primitive。LocaleSwitcher 这类轻交互改用原生 `<select>` 或 30 行手写组件。
- 若某个 island 必须使用复杂交互（极少见），必须在 PR 描述里给出 bundle size 报告并显式增加预算。

### 5.2 主题选择跨子域不同步（已知行为）

`THEME_INIT_SCRIPT` 通过 `localStorage` 持久化 `light/dark/system`，但 `localStorage` 按 origin 隔离，`due.langgenius.app` 与 `app.due.langgenius.app` 互不可见。本架构**不做**跨子域同步：

- Marketing 与 app 的主题选择独立持久化，各自首屏均无 FOUC（因为各自都注入 `THEME_INIT_SCRIPT`）。
- 不通过 CTA URL 透传 `theme=`，避免 marketing 受 app 主题状态污染（marketing 默认 light 视觉策略由 §5 设计边界决定）。
- 后续若做跨域同步，应使用一次性 query 参数 + app 侧合并写入，不引入 cookie 共享或 OAuth 风格的 cross-domain storage。

### 5.3 Marketing footer 的偏好切换器

Footer 底部条右侧承载一个 `PreferenceSwitcher`，把"主题"和"语言"作为同源同视觉的偏好控件并列。设计动机：

- 顶栏右侧只承载主 CTA，不被设置类按钮稀释（PRD 转化优先原则）。
- 主题与语言都属于"viewing preferences"，并列减少认知负担，与 app `UserMenu` 内 Theme/Language 同级 sub-menu 的心智一致。
- 切换器无 React island；主题用原生 `<button role="radio">` segmented control + Astro `<script>`（消费
  `@duedatehq/ui/theme` 的 `switchThemePreference` / `readStoredThemePreference`），语言用 `<a href>` segmented + `aria-current`。
- SSR 输出**不带**任何选中态，由客户端脚本在挂载时根据 `localStorage["duedatehq.theme"]` 补 `aria-checked` 与 `tabindex`，避免不同访客拿到同一份缓存 HTML 时出现错误高亮。
- 主题切换全链路（`disableThemeTransitions → applyResolvedTheme → updateThemeColor → localStorage.setItem`）由 `@duedatehq/ui/theme` 的 `switchThemePreference()` 单点封装，app 与 marketing 共用同一份实现，避免分叉。

---

## 6. i18n 共享策略

共享的是 **locale contract**，不是共享同一个 catalog。

### 6.1 共享包

Locale 常量已从 app/server 拆到：

```text
packages/i18n/
└── src/
    ├── locales.ts          # SUPPORTED_LOCALES, DEFAULT_LOCALE, INTL_LOCALE
    ├── headers.ts          # LOCALE_HEADER = 'x-locale'
    └── detect.ts           # pure helpers only, no browser globals
```

消费者：

- `apps/app`：继续使用 Lingui catalog，导入共享 locale constants；浏览器专属 `detectLocale()` / `persistLocale()` 仍留在 app。
- `apps/server`：继续使用类型化薄字典，导入 `Locale` / `DEFAULT_LOCALE` / `LOCALE_HEADER`。
- `apps/marketing`：使用 Astro i18n routing + 静态 copy dictionary，导入共享 locale constants。

### 6.2 为什么不共享 catalog

App 文案、server 邮件文案、marketing 文案的生命周期不同：

- App 文案来自交互状态和错误处理，需要 Lingui macros 和 PO workflow。
- Server 文案运行在 Worker，保持 Lingui-free，减少冷启动和 bundle 风险。
- Marketing 文案偏编辑和转化，适合 Astro 静态 dictionary 或内容文件。

共享 catalog 会造成 key 漂移、翻译上下文混杂和不必要的 runtime 依赖。共享 locale contract 能保证语言列表、`html lang`、`Intl` locale、`x-locale` header 一致。

### 6.3 URL 策略与 locale handoff

首选：

```text
/           -> en
/zh-CN      -> zh-CN
```

不为默认英文加 `/en` 前缀，减少主域 canonical 分裂。统一使用**无尾斜杠**形式（由 `astro.config.mjs` 的 `trailingSlash: 'never'` + `build.format: 'file'` 强制），避免 `/zh-CN` 与 `/zh-CN/` 被搜索引擎当作两个 URL。每个 localized page 必须输出：

- `<html lang>`
- canonical URL
- `hreflang="en"`
- `hreflang="zh-CN"`
- `hreflang="x-default"`

CTA 跳转 app 时带上 locale handoff 参数：

```text
https://app.due.langgenius.app/?lng=zh-CN
```

`apps/app` 使用 nuqs 管理这个 URL 状态：React Router v7 root route 通过
`nuqs/adapters/react-router/v7` 提供 adapter，并在同一 root route 挂载全局
`RouteErrorBoundary`；`lng` 由
`parseAsStringLiteral(SUPPORTED_LOCALES)` 校验，`LocaleQuery` / `LocaleQueryValue`
从 `localeQueryParsers` parser map 推导。app 会在 `createBrowserRouter()` 创建前先同步
消费有效值，写入 Lingui runtime、`<html lang>` 和 `localStorage["lng"]`，随后用 nuqs
serializer 生成去掉 `lng` 的 URL，并通过 `history.replaceState` 清理。React Router loaders
若再遇到有效 `lng`，只消费、不透传，redirect 到 `/login` / `/onboarding` 时不会继续保留该参数。

`lng` 只表示一次性 marketing → app handoff，不是长期 app state。app 内语言切换仍通过用户菜单写入
`localStorage["lng"]`。无效值（例如 `?lng=fr-FR`）解析为空，不覆盖用户已有偏好。

Marketing CTA 不链接 `/login`，因为登录、onboarding 和已登录落点都属于 app auth gate 的职责。
公开站只表达用户意图：打开工作台。Top nav 也只保留一个 primary CTA，不再同时展示“登录”和“打开工作台”。

**CTA 同标签跳转**：所有 marketing → app 的链接（TopNav `Open the workbench` / `打开工作台`、Hero
primary、FinalCta primary）使用 **`<a href>` 同标签跳转**，**不**加 `target="_blank"`。理由：
"打开工作台" 是用户意图的下一步导航，不是侧路引用；同品牌跨子域跳转的行业惯例（Stripe / Linear /
Vercel / Notion / Figma）都是同标签。强制新标签会破坏返回键预期、复杂化 funnel 归因、并要求
配 `rel="noopener noreferrer"` 防 reverse-tabnabbing。需要新标签的访客会主动用
`Cmd/Ctrl-Click`，应尊重 user agency。

---

## 7. 部署

部署单元从一个变成两个，但根命令仍保持一键。**关键：marketing 必须最后部署**，因为 marketing 首屏的 CTA 直接指向 app 子域；先发 marketing 再迁库或部署 app，任何一步失败都会让访客点击新 CTA 进到坏版本：

```text
pnpm deploy
  -> check / test / build
  -> ensure Cloudflare Queues   # 1. Queue binding 先存在
  -> migrate remote D1          # 2. schema 先就绪
  -> deploy app Worker          # 3. 后端与 SaaS SPA 就绪
  -> deploy marketing           # 4. marketing 最后发布，CTA 指向已就绪的 app
```

CI staging 复用 `ci` job 产出的 app/marketing build artifact，`deploy-staging` 只运行
`deploy:ci` / `workspace-publish` 控制面步骤；本地 `pnpm deploy` 仍保留完整 check/test/build。

任一步失败立即中止后续步骤；marketing 在 D1/app 部署成功前不会暴露新 CTA 给访客。

平台选择：marketing 与 server 统一走 **Cloudflare Workers + Static Assets**，不使用 Cloudflare Pages。理由：

- `apps/server/wrangler.toml` 已经是 Workers + Static Assets 模型（`[assets] directory = "../app/dist"`），marketing 走同一模型可复用 Wrangler 工具链、CI 凭据与日志/metric 视图。
- Cloudflare 自 2025 起官方推荐新项目用 Workers Static Assets，Pages 只做存量维护。

| Workspace              | 部署产品                           | 域名                     | Build                                                        | Output / 部署方式                                   |
| ---------------------- | ---------------------------------- | ------------------------ | ------------------------------------------------------------ | --------------------------------------------------- |
| `@duedatehq/marketing` | Cloudflare Workers + Static Assets | `due.langgenius.app`     | `pnpm --filter @duedatehq/marketing build`                   | `apps/marketing/dist` 通过独立 `wrangler.toml` 部署 |
| `@duedatehq/server`    | Cloudflare Workers + Static Assets | `app.due.langgenius.app` | `pnpm --filter @duedatehq/app build` 后由 server Worker 打包 | `apps/app/dist` 作为 server Worker 的 Assets        |

Marketing 的 `wrangler.toml` 形态（首版无 SSR，不需要 `@astrojs/cloudflare` adapter）：

```toml
name = "due-date-hq-marketing-staging"
compatibility_date = "2025-04-01"

[assets]
directory = "./dist"
not_found_handling = "404-page"
```

环境变量：

- Marketing 不读取 Worker secrets，也不持有任何后端凭据。
- Marketing 只允许 `PUBLIC_*` 前缀的变量（Astro 唯一的客户端可见前缀，通过 `import.meta.env.PUBLIC_*` 暴露），例如 `PUBLIC_APP_URL=https://app.due.langgenius.app`。
- Pricing 页只拼接 app URL；Stripe secret、webhook secret、price id 都属于 `apps/server` runtime env。
- Auth/OAuth callback 仍属于 `app.due.langgenius.app`，不要绑定到 marketing 主域。

安全响应头通过 `apps/marketing/public/_headers`（Workers Static Assets 兼容 Pages `_headers` 语法）声明，作为 §8 Lighthouse Best Practices 95+ 的硬条件：

```text
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://app.due.langgenius.app; frame-ancestors 'none'
```

CSP 中 `connect-src` 仅在 marketing 真的需要向 app 子域发请求（例如未来嵌入 demo 视频或健康探针）时才放行；首版若不发请求可收紧到 `'self'`。

---

## 8. SEO 与性能要求

首版上线门槛：

- HTML 中有完整 H1、title、description、canonical、OG title/description/image。
- 公开页输出 JSON-LD：首页至少包含 `Organization` / `WebSite` /
  `SoftwareApplication`；Pricing 包含 `Product` / `Offer` / `FAQPage`，其中
  `Offer` 只描述页面可见的 plan price，并必须带 `price`、`priceCurrency: USD`
  和 `availability: https://schema.org/OnlineOnly`；
  rules、state coverage、state detail、guides 和 trust pages 至少包含 `WebPage`
  与 `BreadcrumbList`，资源页有可见 FAQ 时输出对应的 `FAQPage`，guide 页可输出
  `TechArticle`。JSON-LD 不得包含客户数据或页面不可见声明。
- Pricing 不输出 `aggregateRating` 或 `review`，除非页面已经展示真实用户评分或评论来源；
  不为消除 Search Console 的非严重建议而伪造评分、评论或未展示的第三方评价。
- Lighthouse SEO / Accessibility / Best Practices 目标 95+（依赖 §7 `_headers` 安全头）。
- 无 JS 时仍能阅读完整 landing 和点击 CTA。
- 首屏图片使用 `astro:assets` 的 `<Image />` 组件（自动 AVIF/WebP、显式 `width`/`height` 防 CLS、`loading="eager"` 仅用于首屏 LCP 图，其余 `lazy`）。禁止直接 `<img src="/foo.png">` 处理产品截图。
- OG 图存在于 `public/og/home.png`（每个 locale 一张：`og/home.en.png`、`og/home.zh-CN.png`），文档化在 §6.3 hreflang 旁。
- `sitemap.xml` 由 `@astrojs/sitemap` 自动生成（依赖 §4 `astro.config.mjs` 的 `site` + `i18n` 字段，自动输出 absolute URL）；app 子域不进入 marketing sitemap。
- `robots.txt` 由 `src/pages/robots.txt.ts` prerender，指向 `https://due.langgenius.app/sitemap-index.xml`，并显式允许 Googlebot、OAI-SearchBot、GPTBot、ClaudeBot、Claude-SearchBot 和 PerplexityBot 访问公开站。
- `llms.txt` 由 `src/pages/llms.txt.ts` prerender，作为 AI-readable content map，列出核心公开页、州覆盖页、引用边界、官方来源策略和非税务建议声明。它只是辅助入口，不替代 sitemap / robots / canonical。
- 内容新鲜度使用固定 review 日期，不使用 build time。`src/lib/content-metadata.ts`
  维护 `CONTENT_REVIEWED_ON` 和单州官方来源链接；页面可见 `<time>`、JSON-LD
  `dateModified` 和文档口径必须保持一致。

### 8.1 Google 发现链路

Google 能看到公开站的前提不是 app SPA SSR，而是以下公开站链路同时成立：

1. `https://due.langgenius.app/*` 对匿名用户返回 `200 text/html`，不需要登录、cookie 或 JS 才能读取正文。
2. 每个可索引页面的 canonical、Open Graph、JSON-LD URL 和 sitemap URL 都使用同一个 HTTPS origin：`https://due.langgenius.app`。
3. `https://due.langgenius.app/robots.txt` 允许 Googlebot 抓取，并声明 `Sitemap: https://due.langgenius.app/sitemap-index.xml`。
4. `https://due.langgenius.app/sitemap-index.xml` 只列 marketing 公开 URL，不列 `app.due.langgenius.app` 的登录后页面。
5. 英文和中文页面互相声明完整 `hreflang`，并提供 `x-default` 指向英文默认页。
6. 404 fallback 返回 HTTP 404，并带 `noindex, nofollow`，避免错误路径进入索引。
7. `https://app.due.langgenius.app/robots.txt` 由 Vite public asset 输出
   `Disallow: /`，`apps/app/index.html` 带 `noindex, nofollow`，避免登录后 SPA shell
   被当作公开 SEO surface。

上线后要在 Google Search Console 中添加 `https://due.langgenius.app` property，提交
`https://due.langgenius.app/sitemap-index.xml`，并用 URL Inspection 检查首页、`/pricing`、
`/rules`、`/state-coverage` 和一个 `/states/*` 页面。Google Search Central 的口径是：
sitemap 帮 Google 发现 URL，canonical 和 sitemap 都是 canonical signal，`hreflang` 用于声明本地化变体，
资源和页面必须对匿名 Googlebot 可访问。

Cloudflare 边缘层还应开启 HTTP → HTTPS 永久重定向。仓库构建产物会发出 HTTPS canonical 和
HSTS；如果 `curl -I http://due.langgenius.app/` 不是 301/308 到 HTTPS，需要在 Cloudflare zone
或 Worker route 层启用 Always Use HTTPS / Redirect Rule。

性能预算：

| 指标                | 目标                  |
| ------------------- | --------------------- |
| Landing LCP         | < 2.0s on 4G mid-tier |
| JS transferred      | < 50 KB gz 首版       |
| CLS                 | < 0.05                |
| Interaction islands | ≤ 2 个                |

---

## 9. 测试与验收

实现 `apps/marketing` 时必须补：

- Build：`pnpm --filter @duedatehq/marketing build`
- Type-check：`pnpm --filter @duedatehq/marketing astro check`（Astro 模板的类型错误不会被根 `pnpm check` 的 Vite+ pipeline 覆盖，必须显式跑）
- Links：CTA 指向 `PUBLIC_APP_URL`，无硬编码 localhost
- HTML smoke：检查 title、meta description、canonical、hreflang、OG
- Headers smoke：`curl -I` 验证 §7 `_headers` 中的 CSP、HSTS、Referrer-Policy 实际下发
- Accessibility：Playwright + axe 或 Lighthouse smoke
- Visual：desktop 1440、tablet 768、mobile 390 截图检查，无文字重叠
- i18n：每个 locale 页面都有对应 route、`html lang` 和 canonical
- Bundle budget：`dist/` 内单页 JS 总量 < 50 KB gz（CI 加 size-limit 或自写脚本，超出 fail）

---

## 10. 实施顺序

1. 在 `pnpm-workspace.yaml` catalog 钉版加入 `astro` / `@astrojs/react` / `@astrojs/sitemap`（遵守 §3 of `01-Tech-Stack.md`，禁止字面量版本进入 `apps/marketing/package.json`）。
2. 新增 `apps/marketing` Astro static app，`astro.config.mjs` 完整声明 §4 中的 `site` / `trailingSlash` / `vite.plugins[tailwindcss()]` / i18n routing，接入 `@astrojs/react` 和 `@duedatehq/ui` preset。
3. 实现英文 landing，CTA 指向 `PUBLIC_APP_URL`；添加 `public/_headers`（§7 安全头）和 prerender 的 `robots.txt` / `llms.txt` endpoint。
4. 加入 Astro i18n routing；按需要实现 `zh-CN` 首页，hreflang 与 sitemap 自动跟随。
5. 更新 root Vite Task：`workspace-build` 包含 marketing；`workspace-publish` 严格按 §7 顺序串行执行（D1 → app → marketing），`workspace-deploy` 为本地入口并在 publish 前加 check/test/build，任一步失败立即中止。
6. 配置 Cloudflare Workers + Static Assets 路由：marketing 绑定 `due.langgenius.app`，server 绑定 `app.due.langgenius.app`，两者不共享 Worker。

---

## 11. 非目标

- 不把当前 SaaS app 迁到 React Router SSR/framework mode。
- 不让 marketing 直接依赖 Better Auth session。
- 不在首版引入 CMS。
- 不把 `/rpc` 暴露给公开站当作 SEO 数据源。
- 不把 marketing 文案放进 app 的 Lingui catalog。

---

## 12. 官方参考

- Astro React integration：`@astrojs/react` 在 `astro.config.mjs` 的 `integrations` 中注册。
- Astro Tailwind 4：通过 `vite.plugins[tailwindcss()]` 注入 `@tailwindcss/vite`，纯 CSS `@import 'tailwindcss'` 不会自动启用。
- Astro i18n routing：`i18n.locales` / `defaultLocale` / `routing.prefixDefaultLocale` 控制 locale URL；本项目每个公开页面显式提供 locale route，避免 fallback redirects 生成隐藏 `/zh-CN/zh-cn/*` URL。
- Astro Sitemap：`@astrojs/sitemap` 依赖 `astro.config.mjs.site`，自动按 `i18n` 配置输出 hreflang alternates。
- Astro Image：`astro:assets` 的 `<Image />` 自动产出 AVIF/WebP，并强制 `width`/`height` 防 CLS。
- Astro Cloudflare deployment：static output 使用 `dist` 作为部署目录；首版 landing 不需要 SSR adapter，统一走 Cloudflare Workers + Static Assets。
