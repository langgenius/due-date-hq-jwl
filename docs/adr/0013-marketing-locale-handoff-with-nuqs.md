# 0013 · Marketing locale handoff uses nuqs

## 背景（Context）

`apps/marketing` 的中文 CTA 按 `docs/dev-file/12-Marketing-Architecture.md`
§6.3 生成 `https://app.due.langgenius.app/?lng=zh-CN`。但 `apps/app` 只从
`localStorage["lng"]`、`navigator.language` 和默认值推导 locale，没有消费 URL
handoff 参数。结果是中文 landing 到 app 的首屏语言不稳定：浏览器或 app 子域已有
本地偏好时才会显示中文。

本仓库已经把 URL state 标准化为 `nuqs`（`docs/dev-file/01-Tech-Stack.md`、
`docs/dev-file/05-Frontend-Architecture.md`），并且 `@duedatehq/app` 已依赖
`nuqs@2.8.9`。nuqs 官方文档对 React Router v7 推荐使用
`nuqs/adapters/react-router/v7`，对有限字符串集合推荐使用 `parseAsStringLiteral`
做运行时校验与 TypeScript 字面量类型收窄。

## 决策（Decision）

`lng` 是一次性 cross-subdomain locale handoff 参数，由 `nuqs` 解析和清理：

- 单一语言来源仍是 `packages/i18n/src/locales.ts` 的 `SUPPORTED_LOCALES` /
  `Locale`。
- `apps/app/src/i18n/query.ts` 暴露 `LOCALE_QUERY_KEY = "lng"`、
  `localeQueryParser = parseAsStringLiteral(SUPPORTED_LOCALES)` 和基于同一 parser map 的
  serializer；不在 app 侧重写 `'en' | 'zh-CN'` union。
- `detectLocale()` 的优先级改为：
  1. `?lng=`，经 `localeQueryParser.parse()` 校验；
  2. `localStorage["lng"]`；
  3. `navigator.language`；
  4. `DEFAULT_LOCALE`。
- React Router v7 root route 包裹 `<NuqsAdapter><Outlet /></NuqsAdapter>`，保证后续 app
  URL state 都在官方 adapter 下运行。
- App i18n bootstrap 会在 `createBrowserRouter()` 创建前先运行一次，避免 router loader
  捕获仍带 `lng` 的初始 URL 后再把它追加到 redirect。
- App i18n bootstrap 同步消费有效 `lng`：写入 `localStorage["lng"]`，激活 Lingui
  runtime，更新 `<html lang>`，并用 nuqs serializer + `history.replaceState` 清理 `lng`
  参数。这样不需要在组件 mount 后用 `useEffect` 再修正首屏语言。
- React Router loaders 遇到有效 `lng` 时只消费到 locale runtime / `localStorage`，后续
  `/login`、`/onboarding` 或受保护路由 redirect 不再保留该参数；无业务 redirect 时用
  `replace` 清理当前 URL。
- Marketing CTA 指向 app root，而不是 `/login`。未登录、已登录、首次 onboarding 的分流属于
  app auth gate；公开站只表达“打开 app”的用户意图。
- 无效值如 `?lng=fr-FR` 解析为 `null`，不写本地偏好、不影响当前 locale。当前阶段不主动清理
  无效参数，避免为错误输入制造额外导航；它会在后续普通跳转中自然消失。

## 备选方案（Alternatives）

- **直接在 `detectLocale()` 里手写 `new URLSearchParams(location.search)` + `isLocale()`**：
  拒绝。它能解决首屏语言，但绕过了本仓库 URL state 统一使用 nuqs 的约定，也容易形成第二套
  query parsing 规则。
- **只在 `/login` 组件里读取 `useSearchParams().get("lng")`**：拒绝。loader 重定向、
  onboarding 和未来公开 app route 都可能接收 handoff。root-level sync 更符合 URL state 的横切属性。
- **用 `useEffect` bridge 在首屏后消费 `lng`**：拒绝。`lng` 决定首次渲染语言，应在 bootstrap
  同步完成；effect 更适合订阅外部系统变化，不适合修正入口首屏状态。
- **保留 `lng` 在 URL 中作为长期 app state**：拒绝。用户在 app 内有显式语言切换器，持久偏好应落
  `localStorage["lng"]`；marketing handoff 只是入口 hint，消费后应 replace 清理，避免分享
  app URL 时误带一次性状态。
- **Marketing CTA 直连 `/login`**：拒绝。`/login` 是 app 内部 auth 实现细节，且已登录用户不应从
  marketing 先碰登录页再跳走；app root + auth gate 的边界更清楚。

## 后果（Consequences）

### 好处

- 中文 marketing CTA 到 app 首屏稳定中文，不依赖浏览器语言。
- CTA URL 从 `app.due.langgenius.app/?lng=zh-CN` 进入，最终由 app loader 决定 `/login`、
  `/onboarding` 或 dashboard。
- `SUPPORTED_LOCALES` 继续是唯一 locale literal list，新增语言时 parser 与类型自动跟随。
- `lng` 的 runtime validation、URL cleanup serializer 和 React Router v7 adapter 都走 nuqs
  官方路径。
- 清理 `lng` 使用 `replace`，不会污染浏览器返回栈。
- Auth/onboarding redirect 后不会继续暴露 `lng`，但 locale 已经写入 app 的持久偏好。

### 代价 / 注意

- app 多一个 root route component，用于接入 React Router v7 的 `NuqsAdapter`；该 root
  route 也是 SaaS app 的全局 `ErrorBoundary` 挂载点。
- `lng` cleanup 使用 `history.replaceState`，但生成目标 URL 仍走 nuqs serializer，避免手写
  query string 删除逻辑。
- router 模块创建前会同步执行一次 i18n bootstrap；Provider 首次挂载仍会幂等执行同一逻辑，
  覆盖测试和非标准挂载场景。
- 如果未来要把 theme 也跨子域 handoff，不能复用本 ADR 的结论直接透传；theme 在
  `docs/dev-file/12-Marketing-Architecture.md` §5.2 已明确“不做跨子域同步”。

## 状态（Status）

accepted · 2026-04-26
