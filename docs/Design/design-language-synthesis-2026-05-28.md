# Design Language Synthesis — 2026-05-28

> 沉淀自 2026-05 audit drain（clients critique 27 + dashboard actions brief +
> cross-route consistency matrix + status pill audit + UI audit + design
> system drift audit）+ 2026-05-28 跟 Claude Code 生成的离线 Design System
> 对照后的修订。
>
> **本文件以 latest shipping UI 为 source of truth**。所有 token 值、surface
> 尺寸、motion 曲线都从 live 代码反查；与历史 doc 冲突时以本文为准。
>
> 配套阅读：
>
> - `cross-route-consistency-matrix.md` — 6 个跨路由一致性条目的清单
> - `clients-critique-2026-05-27-audit-pass.md` — 最近一次 audit 的详细条目
> - `status-pill-audit-2026-05-25.md` — 状态视觉的全量审计
> - `ui-audit-2026-05-25.md` — UI 层的清单式审计
> - `design-system-drift-audit-2026-05-26.md` — token / drift 审计

---

## 目录

0. [设计哲学（产品定位决定风格）](#0-设计哲学产品定位决定风格)
1. [Aesthetic anchor — Mercury / Sana AI / Oku / Linear](#1-aesthetic-anchor)
2. [8 条 taste principles](#2-8-条-taste-principles)
3. [字号层级](#3-字号层级type-scale)
4. [字体使用 — mono vs Inter tabular-nums](#4-字体使用-mono-vs-inter-tabular-nums)
5. [间距与密度](#5-间距与密度spacing-scale)
6. [宽度与版心 / 表面尺寸](#6-宽度与版心--表面尺寸surface-dimensions)
7. [颜色 / 状态 token 语义](#7-颜色--状态-token-语义)
8. [Radius — 三档制 + chip 两层](#8-radius--三档制--chip-两层)
9. [组件词典（shared primitives）](#9-组件词典shared-primitives)
10. [交互模式](#10-交互模式interaction-patterns)
11. [Motion & animation tokens](#11-motion--animation-tokens)
12. [Voice & copy 规范](#12-voice--copy-规范)
13. [AI 可见性约定](#13-ai-可见性约定)
14. [Status visualization（6 状态生命周期）](#14-status-visualization6-状态生命周期)
15. [Severity 颜色用法（pills only, never paint）](#15-severity-颜色用法pills-only-never-paint)
16. [网格 vs Flex 决策](#16-网格-vs-flex-决策)
17. [i18n 纪律](#17-i18n-纪律)
18. [工程模式（支撑设计的地基）](#18-工程模式支撑设计的地基)
19. [Anti-patterns（明确禁止）](#19-anti-patterns明确禁止)
20. [决策框架速查](#20-决策框架速查)
21. [一句话风格定义](#21-一句话风格定义)

---

## 0. 设计哲学（产品定位决定风格）

DueDateHQ 不是面向消费者的 marketing 产品，是给美国小型 CPA 事务所每天看 8 小时的**工作台**。所以风格根本是：

> **Scan-and-act 工具感，不是 hero/marketing 展示感。**

- CPA 每个 alert 处理时间 1-3 分钟，需要扫一眼就知道严重度
- 一个屏幕同时显示 6-12 个义务 / 客户 / alert 是常态，密度比留白重要
- 反复看同一组件 100 次/天，跨页面不一致 = 认知税
- AI 输出穿插在人工流程里，"AI 在哪儿动过"必须一眼可识别

这条决定了下面所有 token、尺寸、组件选择。

---

## 1. Aesthetic anchor

> _Calm professional density._ 风格谱系是 **Mercury / Sana AI / Oku / Linear**，
> 不是消费级 SaaS。

具体含义：

- 无问候语（"Welcome, Sarah" never）
- 无装饰渐变、无庆祝动效、无 emoji、无感叹号
- 用户是资深 CPA 做批量工作，UI 尊重她的时间
- 第一屏看到的就是工作内容，不是 marketing chrome —— Dashboard 第一屏要露出 Pulse 横幅 + dollar-risk hero + ≥ 8 个客户行；Deadlines 第一屏要露出 ≥ 12 行

---

## 2. 8 条 taste principles

每次设计新 surface 时对照这 8 条：

1. **Numbers are typographic objects** — 每一个 $ / 计数 / 日期都用 `tabular-nums`。Hero metric 用 `font-mono`。
2. **One accent, one viewport, one action** — Dify Blue（`#155aef`）只画"下一个动作"：primary CTA、当前选中的侧栏项、focus ring、checkbox checked、indigo "Review" status pill。
3. **Pills for indicators, soft rectangles for actions** — `rounded-full` / `rounded-sm` 给只读状态；`rounded-md` 给可提交的动作。
4. **Status colors are pills, never paint** — green / orange / red 永远是 pill，绝不变成行背景或左 border 强调色。
5. **Sidebar groups, surface unfolds** — sidebar 就是 wayfinding；主内容齐平展开。
6. **Density via vertical air, not chrome** — 4 / 8 / 12 / 16 / 24 / 32 / 48 / 80 节奏完成结构工作，不用边框打"区块"。
7. **Modal vs toast vs banner discipline** — modal 中断输入，toast 确认动作，banner 通知存在，bell 收件箱。互不僭越。
8. **The dashboard is a desk, not a stage** — `<PageHeader>` 是 `text-2xl / font-semibold`（28 / 600）。app 内绝无 display face。

---

## 3. 字号层级（type scale）

Token 来自 `primitives.css` / `preset.css`，px 值与 Tailwind 默认锚定。

| 层级                 | 用途                         | class / token                        | px     |
| -------------------- | ---------------------------- | ------------------------------------ | ------ |
| display hero         | marketing landing            | `text-display-hero`                  | 54     |
| display large        | marketing display            | `text-display-large`                 | 36     |
| section title        | marketing section            | `text-section-title`                 | 32     |
| **H1 / KPI 锚点**    | PageHeader, hero KPI         | `text-2xl font-semibold`             | **28** |
| **H2 / KPI numeral** | section h2, KPI 数字         | `text-xl font-semibold`              | **18** |
| row primary          | 表格主列、客户名             | `text-base font-medium`              | 14     |
| body                 | 段落                         | `text-sm font-normal` 或 `text-base` | 14     |
| row secondary        | description                  | `text-description`                   | 13     |
| caption / button     | 按钮文字、说明               | `text-sm`                            | 12     |
| caption-11           | badge label, 表格 micro-meta | `text-caption`                       | 11     |
| caption-xs           | eyebrow, 密集 badge          | `text-caption-xs`                    | 10     |

**Weight 纪律**：

- `font-semibold` 只用于 H1 / H2 / KPI numerals
- `font-medium` 只用于 row primary
- 其它一律 `font-normal` (400)

**演化记录**

- 卡片标题最初是 `text-md font-medium` — Yuqi flag "在读 hero 感"，因为它和 section h2 同级
- 改成 `text-sm font-normal` 后，又出现 hover 时视觉变重 → 显式锁 `font-normal`（subpixel anti-aliasing 在 bg 变化时会让 400 字重看起来变 500）
- meta 一度是 `text-base` → 压到 `text-xs` / `text-caption`：meta 不是 body
- chip 文字一度是 `text-base` → 压到 `text-xs`：chip 是凝缩信息块

**铁律**：卡片标题不许超过 `font-medium`。`font-semibold` 留给 PageHeader 这种页面级标题。

---

## 4. 字体使用 — mono vs Inter tabular-nums

这两个常被混淆。**它们不是同一件事**。

| 字体                                | 出处                                                        | 用在哪                                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Inter / system + `tabular-nums`** | `--font-sans` 默认栈 + `font-variant-numeric: tabular-nums` | **所有**数字列：金额、计数、日期、百分比、tabular grid。这是 Inter 的 OpenType feature，等宽数字但保持比例字母。             |
| **Geist Mono (`font-mono`)**        | `--font-mono`                                               | 仅限：rule IDs、EIN、URL、raw codes、legacy dashboard hero risk-strip 数字。理由：这些需要**字符位置**对齐，不只是数字宽度。 |

不要用 `font-mono` 画所有数字。`text-base tabular-nums` 已经够齐了，`font-mono` 会带 ATM-receipt 感（2026-05-20 review 退过一次）。

---

## 5. 间距与密度（spacing scale）

4px 基准，9 档梯子，不允许 off-grid：

```
0  4  8  12  16  24  32  48  80
```

通过的"GitHub-density pass"明确卡片层的紧凑值：

| 旧         | 新        | 用途                           |
| ---------- | --------- | ------------------------------ |
| `p-3.5`    | `p-3`     | 卡片内边距                     |
| `gap-2.5`  | `gap-2`   | 卡片内元素间距                 |
| `min-h-10` | `min-h-8` | 标题块固定高度（保持等高卡片） |
| `gap-3`    | `gap-2`   | chip 横向间距用 `gap-1.5`      |

**原则**：外层 section padding 收紧时，内层卡片必须同步收紧，否则节奏断裂。

**等高卡片技巧**：标题块用 `min-h-8 line-clamp-2`，即使一卡片标题只有一行，整排卡片高度依然对齐。

---

## 6. 宽度与版心 / 表面尺寸（surface dimensions）

### Page width tokens（`preset.css`）

| token                 | 像素     | 用途（**live mapping，2026-05-28**）                                                                               |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `max-w-page-expanded` | **1440** | **默认：dense 工作台 surface** — Today, Dashboard, Clients (list + detail), Obligations, Rules library, Pulse list |
| `max-w-page-wide`     | 1100     | Settings hub, Billing, Migration onboarding, Pulse-panel-closed legacy                                             |
| `max-w-page-medium`   | 920      | Account → Security 类有 side metadata 的表单页                                                                     |
| `max-w-page-narrow`   | 880      | Practice profile, Migration import, Readiness — 单列聚焦表单                                                       |

**演化**：`/today` 一度 `max-w-page-wide` → 用户 flag "一打开就是这个"（屏幕一半空白）→ 统一到 `max-w-page-expanded`。`/dashboard` 同步从 `wide` 升到 `expanded`。`preset.css` 注释 2026-05-28 已更新反映现状。

**铁律**：dense 工作台 surface 跨页面宽度必须一致。从 `/today` 切到 `/clients`，版心位置不能跳。

### Sidebar dimensions（`packages/ui/src/components/ui/sidebar.tsx`）

| state    | 值                   | const                                       |
| -------- | -------------------- | ------------------------------------------- |
| 桌面展开 | **220px** (13.75rem) | `SIDEBAR_WIDTH`                             |
| 桌面收起 | **56px** (3.5rem)    | `SIDEBAR_WIDTH_COLLAPSED` — icons-only rail |
| 移动端   | **280px** (17.5rem)  | `SIDEBAR_WIDTH_MOBILE` — Sheet drawer 偏宽  |

### Drawer / Sheet / Dialog 尺寸（实测）

| surface                               | 宽度                                   | 出处                                |
| ------------------------------------- | -------------------------------------- | ----------------------------------- |
| Client peek drawer                    | 400px (`min(400px, calc(100vw-1rem))`) | `ClientDetailDrawer`                |
| Audit event drawer                    | 440px                                  | `audit-event-drawer`                |
| Pulse confirm dialog                  | 440px                                  | `PulseReasonDialog`                 |
| Error / not-found body                | 560px                                  | `routes/error.tsx`, `not-found.tsx` |
| Pulse 'feedback' dialog               | 560px                                  | `PulseDetailDrawer` line 1491       |
| FixNeedsFactsSheet                    | 640px                                  | features/clients                    |
| Rules.library detail dialog           | 640px                                  | line 3519, 3843                     |
| Pulse panel mode（路由内嵌）          | 自适应（占右栏）                       | `AlertsListPage`                    |
| Auth pages (login / 2FA / onboarding) | 400px                                  | routes/login.tsx 等                 |
| Layout fallback                       | 480px                                  | `routes/_layout.tsx`                |

**模式**：

- 400px = 标准 peek drawer（drawer-in-place review）
- 440–560px = dialog（确认 / 阅读）
- 640px = 操作 sheet（多字段修复、详情阅读）
- 路由内嵌 panel = 自适应右栏（list-driven review）

没有强行的"720–880px workflow drawer"档位 — 那是 Claude-Code 生成 DS 的猜测，live 代码没用。

### Responsive contract（2026-05-28 明确）

DueDateHQ **是 desktop-first 工作台**，**不**做 mobile。下面是 viewport 支持矩阵：

| viewport        | 状态            | 说明                                                                                 |
| --------------- | --------------- | ------------------------------------------------------------------------------------ |
| **≥ 1280px**    | ✅ 主要设计目标 | 桌面 / 笔记本。所有 surface 在这里验过                                               |
| **1024–1279px** | ✅ 必须可用     | 平板横屏 / 小屏笔记本。允许少量信息密度降级（如 KPI 块从 4 列折到 2 列），但功能完整 |
| **768–1023px**  | ⚠️ best effort  | 不做专门 QA / 设计 pass。Sidebar 已在 768 切换到 Sheet drawer 模式，但内容区无承诺   |
| **< 768px**     | ❌ 不支持       | 不投入设计 / 测试资源。CPA 在手机上的"看一眼"用例不在 product scope                  |

**原则**：

- 不做 mobile-first 改写，不做 phone 专属 layout
- 写新 surface 时**不需要**给 < 1024px 做特殊适配
- 已有的 `md:` (768px) breakpoint 保留（padding bump 等是无害福利）
- 不引入 `sm:` (640px) / `xs:` 之类的 phone 专属断点
- 不投资 `useIsMobile` 之外的 JS 视口检测 — sidebar 内部用就够了
- 已知 `needs-attention-section` 在 < 720px 会挤、表格 `min-w-[200px]` 在 < 1024 会溢出 — **不修**，因为不在支持范围

CPA 一天 8 小时盯着 24" / 27" 桌面屏。设计预算花在 dense 工作台密度上，不花在 phone 适配上。

---

## 7. 颜色 / 状态 token 语义

DueDateHQ 的 token 命名是**语义化的**，不是颜色名。

| token                         | 含义                                                   | **绝不**用于                          |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------- |
| `text-text-primary`           | 主文本                                                 | hover 不要直接把 secondary 升级到这里 |
| `text-text-secondary`         | 次文本（chip 文字、meta）                              | 主标题                                |
| `text-text-tertiary`          | 弱化文本（eyebrow、占位）                              | 任何关键信息                          |
| `bg-background-default`       | 卡片底色                                               | section 底色                          |
| `bg-background-default-hover` | 卡片 hover 底色                                        | rest 态                               |
| `bg-background-subtle`        | chip 底色、section tinted bg                           | 卡片底色                              |
| `bg-background-body`          | 外层 canvas (#fafafa)                                  | 卡片                                  |
| `bg-background-inset`         | workbench paper (#f4f4f4) — 在 body 上读作"桌面上的纸" | 卡片                                  |
| `border-divider-subtle`       | chip 边框、表格分隔                                    | 卡片边框                              |
| `border-divider-regular`      | 卡片边框                                               | chip                                  |
| `border-divider-deep`         | input hover、可点卡片 hover                            | rest 态                               |
| `state-accent-solid`          | Dify Blue (`#155aef`，AI 蓝、focus ring 实色)          | 表示"成功"                            |
| `state-accent-active-alt`     | focus ring                                             | 文本色                                |
| `variant="destructive"`       | **红 = 错误**                                          | **绝不**表示"AI 标记"或"重要"         |

### Primary accent — Dify UI Blue `#155aef`

2026-05 token unification 后 `primary-600 = #155aef` 是唯一 accent。legacy indigo `#5B5BD6`（旧 DESIGN.md / migration-copilot 文档残留）已在 2026-05-28 sweep 中全部替换。

| step    | hex           | 用途                                              |
| ------- | ------------- | ------------------------------------------------- |
| 50      | `#eff4ff`     | accent tint（hover 软底）                         |
| 500     | `#296dff`     | 实色 indicator                                    |
| **600** | **`#155aef`** | **CTA fill, focus, active nav, checkbox checked** |
| 700     | `#004aeb`     | CTA hover                                         |
| 800     | `#003dc1`     | CTA active                                        |

**关键教训**：审计中有把 `variant="destructive"` 当作"AI 标注"用的实例 — Yuqi 立刻退回："destructive 是错误，不是 AI"。语义必须忠于命名。

---

## 8. Radius — 三档制 + chip 两层

### 三档 + Tailwind 默认

| token          | px  | 用途                                                          |
| -------------- | --- | ------------------------------------------------------------- |
| `rounded-sm`   | 4   | 紧致 status pill、confidence badge、evidence chip、Badge 系列 |
| `rounded-md`   | 6   | **默认**：按钮、input、卡片、banner、dropdown、toast          |
| `rounded-lg`   | 8   | （Tailwind 默认，少用）                                       |
| `rounded-xl`   | 12  | drawer、modal、command palette **only**                       |
| `rounded-full` | ∞   | 圆点、avatar、详情头 meta-row pill（见下）                    |

**铁律**：没有 pill 按钮，没有圆形装饰控件，没有 12px 以上 radius。

### Chip 两层制（2026-05-28 reconciliation）

代码里实际有两种 chip 形态，不要混用：

**Tier A — 系统 status pill / badge primitive (`rounded-sm` 4px)**

紧致单一信号、字 + 微图标，常和数据流一起出现。例：

```tsx
<LowConfidenceBadge />            // rounded-sm
<Badge variant="warning">…</Badge> // rounded-sm
<TaxCodeLabel code="MA" />         // rounded-sm
<AiProvenanceBadge />              // rounded-sm
```

用于 list 行、表格单元、卡片角标、AI 痕迹。

**Tier B — 详情头 meta-row pill (`h-7 rounded-full`)**

`/clients/[id]` 这种详情页 header 上的 meta-row（entity / owner / state）的并排 chip。需要更松的内距、更明显的 pill 形态，作为"信息块"而非"标签"被扫读。框架：

```tsx
inline-flex h-7 items-center gap-1.5 rounded-full
border border-divider-regular bg-background-default
px-3 text-xs tabular-nums text-text-secondary
```

实现位置：`ClientDetailWorkspace.tsx` 的 entity chip / owner pill / state chip。

**决策**：

- 行级、表格内、卡片内 = Tier A `rounded-sm`
- 详情页 header meta-row = Tier B `h-7 rounded-full`
- 两层并存是 by design，不是 drift；只要不在同一上下文混用就行

---

## 9. 组件词典（shared primitives）

下面每一个都是**单一实现**，跨页面复用：

### StatTile

Dashboard 上 "Next filing"、"Blocked"、"Open filing" 这种统计块。`ClientSummaryStrip` 重构后必须用，不许各页面手撸。

### StateBadge

6 状态（`not_started / waiting_on_client / blocked / in_review / filed / completed`）的 SVG 视觉标志。**永远三件套**：StateBadge + 文字 + 边框 pill。单独出现是 bug。

### JurisdictionCode

"MA"、"NY"、"CA" 这种司法管辖区代码，canonical 显示。

### LowConfidenceBadge

低 AI 置信度（< 0.5）的统一标签。`isLowAiConfidence(0.5)` 是**唯一**阈值 — 此前 dashboard 用 [0.5, 0.7)、drawer 用其他值，同一 alert 两个故事。

### Breadcrumb（含 back-link variant）

- 多层：标准 breadcrumb（`Clients > Acme Corp`）
- 单层 + `to`：**自动**渲染为 back-link 形态（`< Clients`，左 chevron + body 文本）

### Astroid（AI 图标）

所有 AI provenance 只用 Astroid。Atom、Sparkle、Brain、Wand 全部 ban。`PulseAlertCard`、`PulseDetailDrawer`、`LowConfidenceBadge`、`NeedsAttentionCard` 全部一致。

### Chip pill 框架

见 §8 的 Tier A / Tier B 两层制。

### Iconography 总则

- **Library**: `lucide-react`，直接 `import { ... } from 'lucide-react'`
- **默认 size**: `size-4` (16) 用于 inline / button；`size-5` (20) 用于 sidebar；`size-6` (24) 用于 empty-state hero
- **Stroke**: lucide 默认 1.5
- **No icon font，no emoji，no unicode glyph**
- **品牌 SVG**: `brand-mark.svg` / `brand-favicon.svg` / `brand-favicon-dark.svg` 硬编 hex，独立工作

---

## 10. 交互模式（interaction patterns）

### Hover 反馈层级

| 强度       | class                               | 用途                |
| ---------- | ----------------------------------- | ------------------- |
| L1（最弱） | `hover:text-text-primary`           | 纯文本链接          |
| L2         | `hover:bg-state-base-hover-alt`     | tab trigger、小按钮 |
| L3         | `hover:bg-background-default-hover` | 卡片整体            |
| 加成       | `group-hover:translate-x-1` chevron | 卡片上的"前往"提示  |

**铁律**：tinted section bg 上的卡片，**只改 border 是无效的** — 必须同时改 fill。Yuqi flag："hover 没感觉" 几乎都是这个原因。

### 选中态 vs filter-on 的语义差

| 状态                                        | 语调                       | class                                                        |
| ------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| **You-are-here**（选中 sidebar / 当前 tab） | 安静                       | `bg-state-base-active` + `text-text-primary` + `font-medium` |
| **Filter-is-on**（筛选器激活）              | **响**（用户刚改变了世界） | `bg-text-primary` + `text-text-inverted`                     |

筛选器要喊出来，导航位置只需告诉你在哪。

### 点击目标

- **整张卡片可点**：用 `<button type="button">` 不是嵌套 Link。`aria-label` 必须包含具体内容（`Open Pulse alert details: ${alert.title}`）。
- **没有单独 "Review" 按钮**：scan-and-act 模式里冗余按钮是噪声。
- **Focus ring**：`focus-visible:ring-2 focus-visible:ring-state-accent-active-alt`，键盘可达。

### Drawer vs Route 决策

| 场景                     | 选              | 原因            |
| ------------------------ | --------------- | --------------- |
| 1-3 min review，列表驱动 | **drawer 就地** | 不丢上下文      |
| 长篇调查，深度操作       | route 跳转      | 需要完整工作区  |
| "View all N more"        | **route**       | 用户主动要全量  |
| 单 alert 点击            | **drawer**      | 在 Today 里横扫 |

Pulse alert、obligation peek、client peek 三个 drawer **共用相同的开法**（`usePulseDrawer().openDrawer` 等），跨 surface 一致。

### Overflow tile（"+ N more"）

**不能**像 sibling 卡片。删掉 border、bg，只留 chevron + label，告诉视觉系统"我是导航不是内容"。一度做成完整 card 框架 → 用户当作另一个 alert 去点。

---

## 11. Motion & animation tokens

### Canonical ease

```css
--ease-apple: cubic-bezier(0.32, 0.72, 0, 1);
```

定义在 `primitives.css`，Tailwind utility 名 `ease-apple`。**所有 surface-resizing transition** 都用它：sidebar 折叠、drawer 滑入、panel 宽度变化。

实际 live 使用点：

- `Sidebar`：`transition-[width] duration-300 ease-apple`
- `rules.pulse.tsx` panel：`transition-[padding-bottom] duration-300 ease-apple`
- `ClientDetailWorkspace`：`xl:transition-[width,margin-right] xl:duration-300 xl:ease-apple`
- `obligations.tsx` 注释明示："ease-apple curve, same durations as the Pulse drawer"

**duration 默认 300ms**，sidebar / drawer / panel 一致。

### 二级曲线（少用）

```css
cubic-bezier(0.2, 0, 0, 1)   /* sidebar-rail-content-in 内容淡入，100-120ms */
```

只用于 sidebar 收起后 icon-only rail 内容的微调入场。不要扩散到其它地方。

### Reduced motion

**强制规范**：任何用了 `transition-*` / `animate-*` 的组件必须加 `motion-reduce:transition-none`（或对应 `animate-none`）。Live 代码全部满足：sidebar、drawer、panel、ClientDetailWorkspace 等。

### 不存在的 motion（generated DS 想象的）

generated DS 提到的 "Pulse banner breathing 3800ms" 和 "Genesis odometer digit-roll" —— **当前 live code 里没有这两个 animation**。Pulse banner 是静态 tint；migration 的 LiveGenesisOverlay 没有 odometer 数字滚动。如果未来要加，应该走 `ease-apple` + `motion-reduce` 同样规范，不另开 token。

### 禁止

- 弹跳、overshoot spring、庆祝 confetti — 一律 ban
- `transform: scale()` 按下缩小 — 没有
- 装饰性 glow — 没有

---

## 12. Voice & copy 规范

### Casing

- **Sentence case** for buttons / headings / table headers / page titles
- **UPPERCASE** 只用于 eyebrow（micro-label），且必须配 `font-mono` 或 `tracking-eyebrow` (0.08em)。reserved for：status pills (`PULSE`, `READY`)、KPI tile suffix (`CRITICAL CLIENTS`, `REVIEW NEEDED`)、section eyebrow

### 人称

- **Marketing**: 第二人称 ("See deadline risk before it becomes a penalty")
- **App 内**: 不要 "Welcome, Sarah" / "Your dashboard" — 页面直接列要做的事
- **绝不**第一人称复数（"we"）

### 词汇

- "5 critical clients"，"+3 vs last Mon"，"in 3d" — 具体
- 绝不 "several urgent items"，"some issues" — 含糊
- Source 永远跟在数字后面：`[1] IRS Pub 509` 或 `ftb.ca.gov · 2026-04-25`
- **No provenance means no render** — AI 输出缺 `source_url` / `verified_at` / `verbatim_quote` 时不渲染结果，渲染 verification-needed 占位

### 标点

- **No emoji**（除了 brand mark 内嵌的 cyan dot — 那不是 UI emoji）
- **No exclamation point** — 这是 alpha-stage 报税软件，每个字都是证据

---

## 13. AI 可见性约定

AI 在产品里**到处都是**，CPA 必须能识别 "AI 在哪儿动过"：

1. **provenance icon**：只用 Astroid（不是 Atom，不是 Sparkle）
2. **置信度阈值**：`isLowAiConfidence(confidence < 0.5)`，dashboard / drawer / 列表全部用同一个 helper
3. **低置信徽章**：`<LowConfidenceBadge />`，所有触发点用同一组件
4. **tone**：`pulseAlertTone(alert)` 是唯一来源 — 不许各 surface 自己算（dashboard 一度按 impact-count 算 tone，drawer 按 confidence 算，同一 alert 卡片绿 drawer 红）

**铁律**：AI 视觉只能有**一种**呈现。出现第二种就 ban 一种，不要并存。

---

## 14. Status visualization（6 状态生命周期）

旧的 8 状态 → 目标 6 状态（`not_started / waiting_on_client / blocked / in_review / filed / completed`）。

呈现模式：**StateBadge（SVG）+ 状态名 + JurisdictionCode + pill frame**，例如：

```
[●] In Review · MA
```

详情页 header 必须有这个组合 — 单独 "MA" 不够，"In Review" 没颜色也不够。

每个状态对应一个 **milestone-notes 模式** — 这是 product model 文档定义的，UI 不能自己发明状态。

---

## 15. Severity 颜色用法（pills only, never paint）

Severity 是 UI 里**唯一**饱和色家族（除了 Dify Blue accent）：

- **critical** = red (`#d92d20` / red-600)
- **high** = orange (`#e04f16` / orange-600)
- **medium** = warm coral (`#c83d2f` / warning-600) — Pulse / migration risk 签名色
- **neutral** = gray-600

**严格规则**：

- ✅ 当作 pill 出现：`bg-severity-*-tint` + `text-severity-*` + `border-severity-*-border`
- ✅ 当作 2px 左侧 bar 出现在 risk row 上
- ❌ **绝不** paint 整张卡片背景
- ❌ **绝不** 当作 row-left-border accent（连"装饰条"都不行）
- ❌ **绝不** 给 button fill（destructive button 例外，且只在删除场景）

破坏这条规则就是把 dashboard 变成圣诞树。

---

## 16. 网格 vs Flex 决策

| 场景                 | 选        | 为什么           |
| -------------------- | --------- | ---------------- |
| 等宽列、列数确定     | **grid**  | 列宽确定 = 网格  |
| 不等宽、内容驱动换行 | flex-wrap | 真正不需要列对齐 |

`needs-attention-section` 一度用 flex-wrap → Yuqi 退回："应该在一行呀"。最终：

```tsx
'grid items-stretch gap-3',
alerts.length === 1 && 'grid-cols-1',
alerts.length === 2 && 'grid-cols-2',
overflowCount > 0 && 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]',
```

确定 = 网格，不要让 flex 替你"猜"。

---

## 17. i18n 纪律

### `plural()` 不 concat `"s"`

```ts
// BAD — 中文 / 俄语 / 阿拉伯语全废
;`View ${count} more alert${count === 1 ? '' : 's'}`

// GOOD
i18n._(
  plural(count, {
    one: 'View # more Pulse alert',
    other: 'View # more Pulse alerts',
  }),
)
```

### zh-CN msgstr 必须真翻译

不能 copy msgid 进 msgstr 装作翻译过。Lingui strict mode CI 会 catch missing，但 catch 不到 mislabeling — 这是更糟的错误。

### CI 卫生

Lingui strict = 0 missing 才能 ship。每次新增 `<Trans>` 或 `t\`...\`` 都必须在 zh-CN 加真翻译。

---

## 18. 工程模式（支撑设计的地基）

| 模式                           | 实例                                    | 为什么                                           |
| ------------------------------ | --------------------------------------- | ------------------------------------------------ |
| **No N+1**                     | `pulse.getDetailsBatch` 50 RPC → 1      | dashboard 渲染速度直接决定 scan-and-act 是否成立 |
| **canonical hook**             | `useClientNextDue` 给 3 个 peek surface | 数据口径必须统一                                 |
| **exactOptionalPropertyTypes** | 条件 spread optional props              | 类型严格 = 重构安全                              |
| **inline rationale 注释**      | `2026-05-25 (Yuqi #N): ...`             | 设计决策的"为什么"必须留在代码里                 |
| **dev-log per commit**         | `docs/dev-log/...`                      | 一行 git log 不够                                |
| **design doc per change**      | `docs/Design/*.md`                      | UX 改动必须更新 canonical 文档                   |
| **single PR**                  | cherry-pick 而非并行 PR                 | review 集中、merge 一次                          |

---

## 19. Anti-patterns（明确禁止）

1. ❌ **多种 AI 图标共存**（Atom + Astroid + Sparkle）→ 只用 Astroid
2. ❌ **不同页面用不同置信度阈值** → `isLowAiConfidence(0.5)` 唯一
3. ❌ **`variant="destructive"` 当作 "AI 标记"** → red = error，仅此一种语义
4. ❌ **只改 border 不改 fill 的 hover** → 在 tinted section 上看不见
5. ❌ **嵌套 Link 在 button 里** → 整张卡片用单一 `<button>`
6. ❌ **Overflow tile 长得像 sibling 卡片** → 剥 chrome，让它读作"导航"
7. ❌ **uppercase tracked eyebrow 当 back link** → 用 Breadcrumb back-link variant
8. ❌ **跨 dense 工作台 surface 宽度不一致** → 都用 `max-w-page-expanded`
9. ❌ **flex-wrap 当作 grid 用** → 列宽确定就用 `grid-cols-N`
10. ❌ **同一 alert 在卡片 / drawer / 列表呈现不同 tone** → 一个 helper
11. ❌ **手撸 `${n}${n===1?'':'s'}`** → `plural()` 必经
12. ❌ **msgstr 用 msgid 内容** → 真翻译，不然就别加 zh-CN
13. ❌ **5000+ 行 monolith** → 单一职责，2000 行为软上限
14. ❌ **Severity 色画整卡或行左 border** → pills + 2px 左 bar，仅此
15. ❌ **`font-mono` 画所有数字** → `tabular-nums` 已经够齐，mono 仅限 IDs / EINs / URLs
16. ❌ **`font-semibold` 用在 PageHeader 以下** → H1 / H2 / KPI 之外不许
17. ❌ **新加 transition 不带 `motion-reduce:`** → reduce-motion 用户会看见动效，无障碍 bug
18. ❌ **legacy indigo `#5B5BD6` 出现在 doc / 代码** → 一律 `#155aef`，违反就 sweep
19. ❌ **Tier A `rounded-sm` chip 跟 Tier B `rounded-full` chip 在同一上下文混用** → 一个 surface 内选一档
20. ❌ **为 < 1024px viewport 加 mobile-specific layout / 断点** → 产品 desktop-first，不做 mobile（见 §6 Responsive contract）。`useIsMobile` 只允许 sidebar 内部用

---

## 20. 决策框架速查

| 问题                                          | 答案                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 这是 chip 还是 badge？                        | 有边框 + 内容多元（图标+文字）= chip；单一信号 = badge                                          |
| chip 用 `rounded-sm` 还是 `rounded-full`？    | 列表/表格/卡片内 = `rounded-sm` (Tier A)；详情头 meta-row = `h-7 rounded-full` (Tier B)         |
| Drawer 还是 route？                           | 1-3 min 任务 = drawer；长任务或要全量 = route                                                   |
| Drawer 多宽？                                 | peek = 400；dialog = 440–560；操作 sheet = 640                                                  |
| Hover 只改 border 行不行？                    | 不行，必须加 bg 变化                                                                            |
| 这里能加 `font-semibold` 吗？                 | 只有 PageHeader 级别                                                                            |
| 数字用 `font-mono` 还是 `tabular-nums`？      | 默认 `tabular-nums`；只有 rule ID / EIN / URL / hero metric 用 `font-mono`                      |
| 这个新颜色加在 globals.css 还是直接 hex？     | globals.css 加语义 token，不能 hex                                                              |
| accent 蓝写哪个 hex？                         | `#155aef` (Dify Blue, primary-600)。看到 `#5B5BD6` 就是 legacy，要替换                          |
| 用 useQuery 数组（N+1）还是写 batch RPC？     | > 5 个就批                                                                                      |
| 这个状态视觉只有 SVG 够吗？                   | 不够，要 StateBadge + 文字 + pill 三件套                                                        |
| 加新 `<Trans>` 要不要管 zh-CN？               | 必须立刻补，CI 会挂                                                                             |
| 加 `transition-*` 要不要写 `motion-reduce:`？ | 必须                                                                                            |
| 这个 surface 该多宽？                         | dense 工作台 = `max-w-page-expanded` (1440)；表单 = `wide / medium / narrow`                    |
| 要为手机 / 窄屏做适配吗？                     | **不**。产品 desktop-first，supported ≥ 1024px。768–1024px best-effort，< 768px 不支持（见 §6） |
| 加新 `<Trans>` 要不要管 zh-CN？               | 必须立刻补，CI 会挂（重复条目）                                                                 |
| 这个改动要不要更新 design doc？               | 任何能被截图证明的改动都要                                                                      |

---

## 21. 一句话风格定义

> **密度紧、节奏匀、组件共用、语义忠诚、AI 痕迹一眼可辨；每个像素都为 "CPA 一天 8 小时盯着" 而非 "首次访问的 wow" 服务。**

---

## 附录 A：演化时间线（摘要）

- **2026-05-21**：obligation drawer UX audit — 确立 drawer-in-place 模式
- **2026-05-22**：clients list & detail critique — 启动跨页面一致性
- **2026-05-23**：deadline status meaning audit — 状态语义从 8 → 6
- **2026-05-25**：UI audit + status pill audit + info icon audit — 拉齐 chip / badge / icon 词汇
- **2026-05-26**：design system drift audit + cross-route consistency matrix — 沉淀跨路由清单
- **2026-05-27**：clients critique audit pass（P0-P3 全清单 drain）
- **2026-05-28 (上午)**：dashboard actions brief + design language synthesis v1
- **2026-05-28 (下午)**：跟 Claude Code 生成的离线 Design System 对照，补 Voice / Surface dimensions / Motion / mono 区分 / Severity 用法 / chip 两层等章节 = 本文 v2；同时 sweep 掉 `DESIGN.md` / migration-copilot 4 份文档里残留的 `#5B5BD6` legacy indigo，统一到 Dify Blue `#155aef`

每一份 audit 都解决了一组具体问题，本文是把它们抽离成**风格规则**，下一轮 audit 直接对照即可。

---

## 附录 B：与 Claude Code generated DS 的对照备忘

离线 generated DS（`/Users/yuqi/Downloads/DueDateHQ Design System/`）是早期种子，本文是当前权威。两者关系：

| 项                                                 | Generated DS                                            | 本文 v2                                                            |
| -------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Tokens / brand / 字号 / spacing                    | ✓ 来源                                                  | 引用并校准到 live `primitives.css`                                 |
| Aesthetic anchor（Mercury 等）                     | ✓ 来源                                                  | §1 直接采用                                                        |
| 8 taste principles                                 | ✓ 来源                                                  | §2 直接采用，词改成符合工作台语境                                  |
| Voice / casing / no emoji                          | ✓ 来源                                                  | §12 直接采用                                                       |
| Surface dimensions                                 | ✗（generated 猜的 720–880 workflow drawer 不存在）      | §6 全部按 live 代码 grep                                           |
| Motion / ease                                      | ✓ 部分（Apple ease 对）                                 | §11 按 live grep；删掉 generated 想象的 Pulse breathing / odometer |
| Severity never-paint                               | ✓ 来源                                                  | §15 直接采用并补 anti-pattern                                      |
| Radius 三档                                        | ✓ 来源                                                  | §8 + chip 两层制（本文新增，generated DS 未识别 Tier B）           |
| AI provenance (Astroid / `isLowAiConfidence(0.5)`) | ✗（generated 未识别）                                   | §9 §13 本文独有                                                    |
| Drawer vs route 决策                               | ✗                                                       | §10 本文独有                                                       |
| Overflow tile / breadcrumb back-link               | ✗                                                       | §9 §10 本文独有                                                    |
| State badge 三件套 / `pulseAlertTone` 单源         | ✗                                                       | §9 §14 本文独有                                                    |
| i18n `plural()` 纪律                               | ✗                                                       | §17 本文独有                                                       |
| No N+1 / canonical hook / inline rationale         | ✗                                                       | §18 本文独有                                                       |
| Color drift 修复                                   | ✗（generated 自己注明 DESIGN.md 跟 runtime 冲突但没改） | 2026-05-28 sweep 已替换所有 `#5B5BD6`                              |

→ 两份文档**互补**：generated 偏 token / 视觉 / brand（横向广），本文偏组件契约 / 决策 / 流程纪律（纵向深）。两份合起来是完整的设计语言文档。
