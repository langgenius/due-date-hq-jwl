---
title: '2026-04-27 · Brand icon rollout'
date: 2026-04-27
---

# 2026-04-27 · Brand icon rollout（Deadline Radar Pulse）

## 背景

`apps/marketing` 与 `apps/app` 的 4 个 brand cluster（Landing TopNav、Landing
Footer、`/login`、`/onboarding`）一直挂着 8–10 px 的 `bg-accent-default` 占位
紫圆点；`apps/marketing/public/favicon.svg` 是与新设计语言无关的占位 SVG，
`apps/app/index.html` 引用的 `/icons/icon-192.png` 不存在，浏览器 tab 都拿默认
灰图。本轮把 v0 占位升级到 v1 真品牌 mark，同步 Figma 与代码，主题感知。

## 设计：Deadline Radar Pulse

把产品三层语义压成一个几何符号（详见 `docs/Design/DueDateHQ-DESIGN.md` §15）：

- 圆角方块 = "HQ" 工作台外壳 / Glass-Box 容器
- 1 px 发丝圆环 + 12/3/6/9 刻度 + 横贯中心的 1 px 水平线 = Due Date 表盘 ×
  Workbench 表格行
- Indigo 弧线（−90° → −15°，75° 扫角）+ 弧端 indigo 实心圆点 = Deadline Radar
  扫描截止日 / 风险被命中的 pulse 信号

颜色全部对应已有 semantic token（`--text-primary` / `--bg-elevated` /
`--accent-default`），**不**新增 token，符合 `docs/Design/DueDateHQ-DESIGN.md`
§13 "新增颜色 → 先定义 semantic role" 纪律。

设计稿单一事实源：Figma 文件 `ssejugriUJkW9vbcBzmRgd`，frame
`DueDateHQ — Brand Icon (Design Spec)`（node `98:2`）。

## 资产文件

| 文件                                                  | viewBox | Tile      | Accent    | 用途                            |
| ----------------------------------------------------- | ------- | --------- | --------- | ------------------------------- |
| `packages/ui/src/assets/brand/brand-mark.svg`         | 256×256 | `#0A2540` | `#5B5BD6` | OG / 邮件 hero / ≥ 64 px 大露出 |
| `packages/ui/src/assets/brand/brand-favicon.svg`      | 32×32   | `#0A2540` | `#5B5BD6` | favicon + 内嵌品牌（light）     |
| `packages/ui/src/assets/brand/brand-favicon-dark.svg` | 32×32   | `#15171C` | `#7C7BF5` | 内嵌品牌（dark）                |

完整版含 1 px 发丝元素，落到 ≤ 32 px 全部 sub-pixel 化；favicon 简化版只保留
tile + 弧 + dot 三件套（stroke 8 % / dot ø 16 % 相对 tile 边长），16 px 仍可读。

## 主题策略：双 `<img>` + CSS 切换

`<link rel="icon">` favicon 不跟随 app 主题（浏览器 tab chrome 是 OS / 浏览器
管），仅 ship light 一份。

内嵌 `<img>` 跟随 app 主题——用两个 `<img>` 配合 Tailwind `dark:hidden` /
`hidden dark:block` 切换，零 JS、零水化抖动、无障碍属性正常（GitHub markdown
里 theme-aware 图就是这个套路）。两个 SVG 各 ~395 字节，Vite 在两个 app 里都
inline 成 `data:image/svg+xml,...` URI（小资源默认行为），节省两次 HTTP 请求。

跨 React (Vite) 和 Astro 的 SVG import 形式不一致——Vite 默认返回 URL string，
Astro 5 默认返回 AstroComponent 函数。**统一使用 `?url` query suffix 强制返回
URL string**：

```ts
import brandMarkLight from '@duedatehq/ui/assets/brand/brand-favicon.svg?url'
```

## 落地点

| 位置                                           | Figma 节点        | 代码                                                                                            |
| ---------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| Landing TopNav brand row                       | `5:4`             | `apps/marketing/src/components/TopNav.astro`                                                    |
| Landing Footer brand block                     | `30:24`           | `apps/marketing/src/components/Footer.astro`                                                    |
| App `/login` + `/onboarding` 共享 entry header | `113:2` + `119:4` | `apps/app/src/routes/_entry-layout.tsx`                                                         |
| Browser tab favicon                            | —                 | `apps/marketing/public/favicon.svg` + `apps/app/public/favicon.svg`（镜像 `brand-favicon.svg`） |
| App `index.html` `<link rel="icon">`           | —                 | `apps/app/index.html` 修复原本指向不存在文件的 404                                              |

**未触动**（避免品牌 vs 租户语义错位）：

- AppShell sidebar firm switcher（Figma `147:3` / 代码
  `apps/app/src/components/patterns/app-shell.tsx`）— 是租户身份槽，继续用
  `firm.monogram`
- Route header（"Q1 2026 / Dashboard"）、row-level 操作区 — 不是品牌槽

## 关键决策

1. **不做 React/Astro 组件包装**。直接 SVG 文件 + URL import，按用户偏好"直接
   用 SVG 不用组件"。可以避免引入 `@duedatehq/ui` 的客户端依赖到纯静态的
   marketing 上。
2. **统一 16 × 16 mark 大小**（footer 不单独做 20）。Linear 比例：mark 略大于
   wordmark 字号高度，wordmark 仍主导信息层级。
3. **firm switcher 不动**。多租户 SaaS IA 铁律：产品 brand 与租户 brand 共享
   屏幕，绝不共享同一个槽位。Slack / Linear / GitHub / Notion 的 sidebar 顶部
   都是租户 avatar，不是产品 logo。
4. **favicon 不跟随 OS 主题**（不用 SVG 内置 `prefers-color-scheme` 媒体查询）。
   Safari < 17 不支持，复杂度高，单 navy 变体在所有 tab 背景下都成立。
5. **Figma 优先**。所有几何变化先在 `98:2` spec frame 同步，再
   `node.exportAsync({ format: 'SVG_STRING' })` 回灌代码。

## Auto-layout 踩坑

Figma 4 个 brand cluster 都是 HORIZONTAL auto-layout，children 按 index 决定
左右位置。第一次写脚本用 `parent.appendChild(mark)` 把 mark 加在末尾，导致 4
个 cluster 都把 mark 渲染到了**最右侧**，不是最左。修复用
`parent.insertChild(0, mark)` 强制 index 0。**经验**：Figma plugin API 操作
auto-layout 容器时，子节点的 x/y 坐标无效（auto-layout 重算），子节点顺序由
插入 index 决定。

## 验证

- `pnpm check` 0 errors（仅有的 1 个 warning 是 `packages/ui/src/lib/placement.ts:30`
  原有 unsafe type assertion，与本轮无关）
- `pnpm --filter @duedatehq/marketing build` ✓ — 两个 SVG 全部 inline 成 data URI
- `pnpm --filter @duedatehq/app build` ✓
- 运行时 favicon：`apps/marketing/dist/favicon.svg` 与 `apps/app/dist/favicon.svg`
  各 395 字节，per-app emit 通过

## 偏离 plan 的地方

无。第一个 PR 命名为 "feat: brand icon rollout (deadline radar pulse)" 即可。

## 同步纪律

- 所有 brand mark 几何变更必须先动 Figma `98:2`，再 export 回灌
  `packages/ui/src/assets/brand/`
- favicon 在三个位置存在副本（`packages/ui` 源 + 两个 app 的 `public/`）。Astro
  和 Vite 都强约束 favicon 必须在各自 `public/` 下，无法消除复制。**当前依靠
  `packages/ui/src/assets/brand/README.md` 的人工纪律保持一致**。如果未来出现
  漂移，可以加一道 `scripts/check-brand-assets.mjs` 字节级对比，挂到
  `pnpm check:deps` 旁边。
