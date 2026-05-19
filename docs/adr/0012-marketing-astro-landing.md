# 0012 · Marketing Landing 接入 Astro 公开站

## 背景（Context）

PRD v2.0 §1 + [`../dev-file/12-Marketing-Architecture.md`](../dev-file/12-Marketing-Architecture.md) §1 已锁定双站架构：
`due.langgenius.app` 服务未登录访客（marketing），`app.due.langgenius.app` 服务登录后工作台（SaaS SPA + Worker API）。本次 Demo Sprint 之后需要把 marketing 站从"PRD 上的描述"变成"可被分享、可被收录、可被点击 CTA 进入 app"的真实可访问页面，否则 [`../dev-file/00-Overview.md`](../dev-file/00-Overview.md) 标注的 "due.langgenius.app → CTA → app.due.langgenius.app" 用户路径在生产环境不存在。

为什么不放进 `apps/app`：当前 `apps/app` 是 Vite SPA，服务端对所有路径返回同一份 `index.html` 壳；这对登录后工作台是正确的，但对公开 SEO 页面违反两条硬约束 —

1. **SEO-first**：marketing 必须是 HTML-first，搜索引擎抓取时不能依赖 JS 渲染（[`../dev-file/12-Marketing-Architecture.md`](../dev-file/12-Marketing-Architecture.md) §3.1）。
2. **JS budget < 50 KB gz**：landing 首屏不允许携带 React + 路由 + auth shell（同 §5.1）。混在一起导致两边都妥协。

Astro 的 HTML-first 输出 + zero-JS 默认 + islands 模型在两条约束上都是最自然解。除了 Astro 之外评估过 Next.js（绑定 Vercel 心智、与现有 Cloudflare Workers + D1 体系冲突）和把 SSR 加进 `apps/app`（污染 SaaS 工作台运行时）。

同步发现 `/DESIGN.md` 与 `/docs/Design/DueDateHQ-DESIGN.md` 的字号 / tint token 与 Figma 设计稿存在系统性漂移（display-hero 60 vs Figma 54、display-large 40 vs Figma 36、§2.2 light-mode tint 用 rgba(0.06) vs Figma 实色 hex）。Marketing 站作为最先严格对照 Figma 的消费者，把这个 spec drift 暴露出来；不一次性闭环会让后续 SaaS 工作台继续延用错值。

## 决策（Decision）

分四块。

### I. 工程选型与目录边界

**`apps/marketing` 是独立 Astro 6 静态站**，归属规则（对齐 [`../dev-file/12-Marketing-Architecture.md`](../dev-file/12-Marketing-Architecture.md) §3 / §4）：

- 框架：**Astro 6.1.8**，配 `@astrojs/sitemap` 3.7.2 + `@astrojs/check` 0.9.8（catalog 锁定，详见 `pnpm-workspace.yaml` "marketing (Astro static site)" 段）
- 输出：纯静态 HTML，**不引入任何 React island**（首版零 JS）；`@astrojs/react` 故意不注册，避免 ~190 KB 孤儿 React bundle 进 `dist/_astro/`
- 路由：`prefixDefaultLocale: false`，英文默认在 `/`，中文在 `/zh-CN`；每个公开页面显式提供 locale route，避免 fallback redirect 生成 `/zh-CN/zh-cn/*` 隐藏路径并与本地化 pricing 页冲突
- 样式：复用 `@duedatehq/ui/styles/preset.css`（与 SaaS 工作台同 token 源），通过 `globals.css` 内 `@source` 把 marketing 自身的 `components/` `layouts/` `pages/` 加进 Tailwind 4 扫描
- 部署：**Cloudflare Workers Static Assets**（不上 SSR adapter）；`wrangler.toml` 的 `[assets]` 把 `dist/` 当 ASSETS binding，`not_found_handling = "404-page"` 对齐 SaaS SPA 不同的 fallback 模型
- i18n 契约：`apps/marketing/src/i18n/{en,zh-CN}.ts` 双语 catalog 实现 `LandingCopy` 接口；OG 图按 locale 各引一张（`/og/home.en.png` / `/og/home.zh-CN.png`）
- 文案铁律：marketing copy **禁止**出现 Better Auth / Cloudflare D1 / Resend / WISP 等技术栈名（[`../dev-file/12-Marketing-Architecture.md`](../dev-file/12-Marketing-Architecture.md) §2.6 已明文）

**首版 8 个分区**（`Hero` 含 `HeroSurface` workbench 复刻 / `SlaStrip` / `Problem` / `Workflow` × 3 step / `Proof` / `Security` / `FinalCta` / `Footer`），承载 §2.4 PRD 模块映射：Hero+Workflow+Proof+Trust(=Security)+FinalCta=5 个 PRD 模块 + 多出的 SlaStrip（30s / 30min / 24h SLA 承诺，强化"keyboard-first console"叙事，**不在原 §2.4 6 模块清单内** → 见 FU-6）。

### II. 设计 token 与 Figma 对齐

权威源是 Figma 设计稿（file `ssejugriUJkW9vbcBzmRgd`），从设计稿 `Hero/Title` 与 `Problem/Title` 节点 `get_design_context` 拿到精确 typography metric，回灌到三层文档：

| Token                                                     | 旧值（drift 源）                       | Figma 权威值                                                               | 落地位置                                                                                                                   |
| --------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `typography.display-hero` size / lh                       | 60px / 1.067                           | **54px / 1.074** (=58/54)                                                  | `/DESIGN.md` YAML + `/docs/Design/DueDateHQ-DESIGN.md` §3.2 表 + `packages/ui/src/styles/preset.css` `--text-display-hero` |
| `typography.display-large` size / lh                      | 40px / 1.15                            | **36px / 1.167** (=42/36)                                                  | 同上 + 新增 `--text-display-large` 与 paired `--line-height`                                                               |
| `typography.hero-metric`（workbench $ 数字）              | 56 / 1.0 / -0.02em                     | 56 / 1.0 / -0.02em（一致）                                                 | `--text-hero` 已有，加 paired line-height token                                                                            |
| `--accent-tint`（light）                                  | docs §2.2 写 `rgba(91, 91, 214, 0.08)` | `#f1f1fd`（与 Figma `accent/tint` variable 同源）                          | `/docs/Design/DueDateHQ-DESIGN.md` §2.2                                                                                    |
| `--severity-{critical,high,medium,neutral}-tint`（light） | docs §2.2 写 `rgba(*, 0.06)`           | `#fef2f2 / #fff7ed / #fefce8 / #f8fafc`（与 Figma `severity/*-tint` 同源） | 同上                                                                                                                       |

**双文件回灌原则**（沿用 0011 §III）：YAML 权威值改 `/DESIGN.md`，工程实现镜像同步 `/docs/Design/DueDateHQ-DESIGN.md` + `packages/ui/src/styles/preset.css`，三方禁止再次产生数值分歧。Dark mode tint 保留 rgba 透明叠加写法（与 Figma dark variable 一致），不动。

`pnpm design:lint` 通过（0 errors / 0 warnings / 1 info），是后续防漂移的 CI 门。

### III. Marketing 组件视觉实现关键裁定

逐个落实视觉对齐时识别出 5 处需要刻意决策的实现细节，写入此 ADR 防止后续被覆盖：

1. **TopNav 布局**：`Brand + NavLinks` 组与 `Status + Open app` 组用 `justify-between` 拉到两端；`Brand → NavLinks` 之间用 `gap-8`（32px，对齐 Figma `NavLeft` 段 `Brand` 238w 后的 32px 间距）。**严禁**从 Figma metadata 的 `NavLinks.x = 270`（绝对坐标）误读为 gap 值，那会让 nav 链接被甩到右侧贴 Status pill。`Sign in` / `登录` 不再单独展示，marketing 只表达“打开 app”。
2. **Hero section pt / pb = 108px**：对齐 Figma `Hero/RightSurface` y=108；左列 `lg:pt-[21px]` 让 headline 在 surface 顶部下方 21px 起，营造"surface 探出标题"的视觉。`pt-9` / `pt-14` 都不对。
3. **Hero eyebrow pill**：用 `bg-accent-tint` + `text-accent-text` 实色淡紫，**不带边框**；旧实现的 `bg-bg-elevated border` 是白底灰边，与 Figma 视觉差异显著。
4. **Problem card 标签按 severity 分色**：i18n `ProblemCard.severity` 字段驱动三档色（`STATE WATCH = critical 红`、`NOTICE TRIAGE = high 橙`、`MIGRATION DRAG = medium 黄`），各对 `severity-{tier}-tint` + `severity-{tier}` 文字色。统一灰色破坏 PRD 的"颜色只为风险服务"原则（`/DESIGN.md` §1）。
5. **FinalCta 浅色卡片**：用 `bg-bg-panel` + `border-border-default`，pill 用 `severity-critical-tint` + 红字（"AVG $54k / yr / practice"），**禁止**用旧实现的 `bg-[#0A2540]` 深 navy 反白方案 —— 那会让 CTA 区块脱离整页 Light Workbench 调性，且 navy 底色的紫色按钮对比度勉强。

13 处 `text-[*px]` arbitrary value 一并迁到语义 token（`text-display-hero` / `text-display-large` / `text-md` / `text-2xs` / `text-hero`），禁止后续业务组件再写硬编码字号。

### IV. 部署链接入

`vite.config.ts` 的 `workspace-deploy` 命令固化为三段串行（顺序见 [`../dev-file/12-Marketing-Architecture.md`](../dev-file/12-Marketing-Architecture.md) §7）：

```bash
pnpm db:migrate:remote \
  && vp run @duedatehq/server#deploy \
  && vp run @duedatehq/marketing#deploy
```

任何前段失败 `&&` 短路，marketing 不会上线指向半坏的 server。`cache: false` 让 Cloudflare 凭据从 shell 实时继承，不做 env fingerprint。

`main` push 的部署 run 不允许被新的 push 中途 cancel，只在同一 concurrency group 排队；
PR run 仍会 cancel stale run。原因是 D1 migration 和 Workers deploy 都是 Cloudflare 控制面的
有副作用操作，取消中的 job 可能已完成部分远端写入。

`@duedatehq/server` peer 升 TS 6.x，但 `@astrojs/check` / `tsconfck` 仍声明 `typescript: ^5.0.0`；`pnpm-workspace.yaml` 的 `peerDependencyRules.allowAny` 加上 `typescript`（兼容性 API 一致，仅版本号不匹配），避免 install 报警阻塞 CI。

## 备选方案（Alternatives）

- **(a) Marketing 嵌入 `apps/app` 同源同 SPA** —— 拒绝。SEO + JS budget 两条硬约束都被违反；Better Auth session cookie 也会沿 root domain 漏到 marketing 页（用户没登录就被发 cookie），对应安全审查负担超过架构便利性。
- **(b) 用 Next.js 而不是 Astro** —— 拒绝。Next.js 与 Cloudflare Workers + D1 + oRPC 体系适配成本（adapter / RSC streaming / middleware）超过 marketing 站本身的复杂度；Astro 6 的 Static Assets 是单文件 worker，部署面与 `apps/server` 完全对称。
- **(c) Token drift 不闭环，让 marketing 的字号自己改一份** —— 拒绝。会形成"实现 56 / spec 60 / Figma 54"三方分裂，后续 SaaS 工作台 Hero metric 接入时必然踩同一坑；本次一次性收敛是 0011 §III "禁止沉淀第 3 份真理来源"原则的延伸。
- **(d) 把 `display-hero` 留在 60px，让 Figma 改成 60** —— 拒绝。Figma 设计稿是这一轮 PRD v2.0 settled 的视觉权威，DESIGN.md spec 漂出 Figma 是文档侧没及时同步；改 spec 跟 Figma 走是单向修复，反向会动摇刚通过设计 review 的成稿。

## 后果（Consequences）

### 好处（Good）

- Marketing 与 SaaS 部署独立、运行时独立、JS budget 独立，互不污染。SaaS 工作台不需要为 SEO 妥协，marketing 不需要承担 auth shell。
- 设计 token 三方（Figma / `/DESIGN.md` / `packages/ui/src/styles/preset.css`）回到单一权威源，`pnpm design:lint` 0 errors / 0 warnings 是后续 PR 的 CI 门。
- Marketing 站默认 zero-JS（首版无 React island），首屏 HTML-only，CDN-cacheable，符合 Cloudflare 静态资产成本模型。
- 双语 i18n catalog（EN + zh-CN）共享 `LandingCopy` 接口契约，新增第三种语言不需要重写组件结构。
- 部署链 `db:migrate → server#deploy → marketing#deploy` 三段固定顺序，marketing 永远不会指向半坏的后端。

### 代价 / 不确定（Bad / 不确定）

- `apps/marketing/.astro/` 自动生成的 `types.d.ts` / `content.d.ts` 触发 oxlint + tsgolint 12 个错误（`triple-slash-reference` × 2 / `no-explicit-any` × 4 / `tsconfig-error: baseUrl removed in TS 6.x` × 1 / `TS2344` × 2 / `TS2304` × 1 / 其他 2）让 pre-commit 钩子失败。**FU-1**
- Inter / Geist Mono webfont **从未在工程层加载**（`packages/ui/src/styles/preset.css` 只在 `--font-sans` / `--font-mono` 列了字体名，没有 `@font-face` 也没有 `<link>`）；macOS 上掉到 SF Pro 渲染，与 Figma Inter 视觉有差。**FU-2**
- `apps/marketing/public/og/home.{en,zh-CN}.png` 当前是 1200×630 纯 `#0A2540` 占位图（两份字节完全相同），分享到 Slack / X / 微信预览将是空蓝块。**FU-3**
- `marketing#deploy` 串入了 `workspace-deploy` 但**还没有跑过真实 Cloudflare Workers 部署**；`assets.directory = "./dist"` + `not_found_handling = "404-page"` 路径解析、域名绑定都未在生产环境验证。**FU-4**
- §2.4 PRD 6 模块清单（Hero / Problem / Workflow / Proof / Trust / Final CTA）与首版实现的 8 分区有 1 个净增（`SlaStrip`，30s / 30min / 24h 承诺）；产品需要回头确认是把 SlaStrip 写进 §2.4 还是删除组件。**FU-6**
- `tracking-tight`（Tailwind 默认 -0.025em）与 Figma 严格 `-0.02em` 有 0.005em 差异，肉眼不可见但严格对齐时需统一改成 `tracking-[-0.02em]`。**FU-7**

### Follow-ups

> 这些是本次为了把 marketing 站先 ship 出来而**有意识推迟**的事项。下次接相关功能时直接读这一段。

| ID   | 触发时点                               | 内容                                                                                                                                                                                                                                                                             | Owner（角色占位）                             |
| ---- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| FU-1 | git commit 被 pre-commit 钩子拦下时    | 把 `apps/marketing/.astro/**` 加进 oxlint / tsgolint 的 ignore；同时移除 `apps/marketing/tsconfig.json` 的 `baseUrl: "."`（TS 6.x 已删除该选项，`paths` 在没有 `baseUrl` 时正常工作）；如保留 `src/env.d.ts` 的 triple-slash 写法则在 oxlint config 局部豁免                     | Workspace 工具链 owner                        |
| FU-2 | 下次需要严格视觉 1:1 对齐 Figma 时     | 在 `packages/ui` 装 `@fontsource-variable/inter` + `@fontsource/geist-mono`，由 `apps/marketing/src/layouts/BaseLayout.astro` 与 `apps/app/index.html` 各自 import；同时把 `--font-sans` / `--font-mono` 列表里的 fallback 顺序 review 一次（确保 Inter 真加载失败时降级仍可读） | UI 包 owner（影响 marketing + apps/app 双站） |
| FU-3 | Marketing 站正式公开发分享前           | 在 Figma 建 1200×630 OG frame，复用 hero token + brand mark 出真实 OG 图（EN / zh-CN 各一张）；或改用 `@vercel/og` / `satori` 在构建时按 i18n 文案生成                                                                                                                           | 设计 + marketing owner                        |
| FU-4 | `pnpm deploy` 第一次触达生产环境前     | 用 Cloudflare staging 域名跑一次 `vp run @duedatehq/marketing#deploy`，验证 `wrangler.toml` 的 `[assets]` binding、`not_found_handling = "404-page"` 命中 `dist/404.html`、`PUBLIC_APP_URL` 正确注入 build；同时确认 marketing zone 与 app zone 是否需要分别 `wrangler login`    | DevOps / marketing owner                      |
| FU-5 | 第一个用户从 marketing CTA 点进 app 时 | 验证跨域跳转 `due.langgenius.app → app.due.langgenius.app` 不丢失 PostHog distinct_id（[`../dev-file/12-Marketing-Architecture.md`](../dev-file/12-Marketing-Architecture.md) §6 cross-domain identity merging 已设计但未落地）                                                  | Analytics owner                               |
| FU-6 | 下一次产品复盘 marketing 信息架构时    | 在 [`../dev-file/12-Marketing-Architecture.md`](../dev-file/12-Marketing-Architecture.md) §2.4 决策：`SlaStrip` 是补进 6 模块清单（成 7 模块），还是删组件回到 6 模块；当前实现状态为 8 分区（含 Footer），文档与代码须在两侧同步                                                | PM + marketing owner                          |
| FU-7 | 视觉 strict pass 阶段                  | 把 marketing 6 个组件里的 `tracking-tight` 统一替换为 `tracking-[-0.02em]`，与 `/DESIGN.md` `typography.display-{hero,large}.letterSpacing` 严格一致                                                                                                                             | Marketing owner                               |
| FU-8 | 添加第三种语言（如 ja / es）时         | `apps/marketing/src/i18n/types.ts` 的 `LandingCopy` 接口契约不动；新增 locale 文件 + 在 `astro.config.mjs` 的 `i18n.locales` 与 `fallback` 注册；OG 图同步加；page route 自动按 locale 落 `/ja` / `/es`                                                                          | Marketing owner                               |

## 状态（Status）

accepted · 2026-04-25
