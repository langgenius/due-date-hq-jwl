# DueDateHQ · DESIGN.md

> 文档类型：视觉设计系统（Single Source of Truth for UI）
> 版本：**v2.1**
> 日期：2026-05-26（v2.0 → v2.1 修订：§2.5 同步到 primitives.css 实施现状）
> 方向：**Ramp × Linear · Light Workbench**（浅色主导，暗色为镜像，不做方向 B 的 Bloomberg 终端风）
> 对齐：PRD v2.0 §1.3 设计原则 + §5 核心页面规格 + §10 UI/UX 规范
> 阅读对象：Designer / Frontend Engineer / AI coding agents（Cursor / v0 / Lovable）
> 语言：中文说明 + 英文 token，所有代码注释为英文

## v2.0 changelog (2026-05-26)

Three passes worth of polish (83rd → 85th) have established a set of
canonical patterns that didn't exist when v1.0 shipped on 2026-04-23.
The patterns themselves are documented in dedicated spec docs (see
**Companion docs** below); §16 of this file is the **dashboard /
adoption index** so a code reader or AI agent can find the right spec
without crawling every dev-log entry.

Adoption status across the app is tracked separately in
`docs/Design/design-system-drift-audit-2026-05-26.md` (per-pattern
drift inventory + prioritized fix punch list).

| Companion doc                                  | What it specifies                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `page-family-canonical.md`                     | PageHeader / scope tabs / filter chip row / table-card frame / FloatingActionBar / sidebar |
| `unified-table-surface-vocabulary.md`          | Cross-table chrome unification (`/deadlines`, `/clients`, `/rules/library`)                |
| `inset-surface-design-system.md`               | Drawer canonical, surface hierarchy, radius scale, chip vocabulary                         |
| `status-pill-audit-2026-05-25.md`              | Status pill tone ladder + shape rules                                                      |
| `info-icon-audit-2026-05-25.md`                | When info icons belong + InfoBanner pattern                                                |
| `filter-vs-badge-contract.md`                  | Filter chip vs filter dropdown decision rule                                               |
| `icon-sizing.md`                               | Canonical icon size scale                                                                  |
| `obligation-status-icon-vocabulary.md`         | Per-status icon + tone mapping                                                             |
| `obligation-panel-v2-and-alerts-vocabulary.md` | Pulse / alert vocabulary across surfaces                                                   |

---

## 0. 为什么是 Ramp × Linear · Light Workbench

**一句话定位**：CPA 的专业工作台，不是金融 App，不是营销站，不是编辑刊物。

公开 marketing 站继承本设计系统的 token、字体、语义色和证据优先原则，但允许更大的标题和更强的叙事节奏；具体 landing 结构、SEO 与 Astro 边界见 `docs/dev-file/12-Marketing-Architecture.md`。Marketing 仍禁止抽象渐变 hero、漂浮装饰、无业务含义的 stock image 和与产品无关的视觉噪音。

| 借自                 | 借什么                                                        |
| -------------------- | ------------------------------------------------------------- |
| **Ramp**             | 首屏 Hero = 用户核心工作指标（风险 $），不是客户总数 / 进度条 |
| **Linear**           | 13px 紧凑排版 + LCH 色系 + 键盘优先 + zero decoration         |
| **Stripe Dashboard** | 深 navy 权威感 + tabular-nums 金融级数字表达                  |
| **Attio**            | Progressive disclosure（hover 揭示 source excerpt）           |

**刻意避开的风格**

- ❌ Stripe 营销页的紫色渐变（已被 fintech 过度抄袭）
- ❌ Bloomberg Terminal 的荧光色 + 全域等宽（那是 Focus Mode 才考虑的事）
- ❌ Notion / Airbnb 的暖色圆角（密度不够，压不住 $ 数字）
- ❌ 绿色做品牌主色（税务语义冲突：绿色只能表示"已完成"）

---

## 1. Visual Theme & Atmosphere

**Mood words**：precise · calm · dollar-aware · glass-box · keyboard-first

**Design philosophy**

1. **信息密度优先，留白次之**：表格一屏 10 行起；hero 数字大但周围不留豪华空白
2. **颜色只为风险服务**：灰色 = 默认安全；颜色出现必须有业务语义
3. **装饰零容忍**：无阴影、无渐变、无插画、无动画装饰
4. **证据可见**：所有 AI 输出和数字都带 `[source]` 徽章，hover 揭示 source excerpt
5. **双模平等**：浅色 / 暗色共享 token，任何页面都能无损切换

**一眼能判断的风格特征**

- Dify light gray 画布 + 1px 发丝线分隔（`#E9EBF0`）
- Dify gray `#101828` 做主文字色（不是纯黑）
- Dify UI blue `#155aef` 仅作为 CTA / focus / selected nav 的 accent
- 数字全部 tabular-nums（Geist Mono / JetBrains Mono）
- 行高 36px，紧凑但不拥挤
- 风险行：浅红 / 浅橙 tint + 2px 左边框

---

## 2. Color Palette & Roles

### 2.1 核心原则：语义驱动的 token，不是命名驱动

每一个颜色都有明确的**语义角色**。禁止直接在组件里写 `text-blue-600`，必须通过 semantic token：`text-accent-default`。

### 2.2 Light Mode（默认）

```css
/* === Surface === */
--bg-canvas: #f2f4f7; /* App 最底层 · Dify background/body */
--bg-panel: #f9fafb; /* Sidebar, sticky header */
--bg-elevated: #fcfcfd; /* Card, drawer, modal */
--bg-subtle: #f2f4f7; /* Disabled field, tag bg */

/* === Border === */
--border-default: #e9ebf0; /* 主要分隔线，1px hairline */
--border-strong: #d0d5dc; /* 表头下边框，tab 下边框 */
--border-subtle: #f2f4f7; /* 表格行间线（更弱） */

/* === Text === */
--text-primary: #101828; /* Hero 数字、主标题、客户名 */
--text-secondary: #354052; /* 说明文字、表格内容 */
--text-muted: #98a2b2; /* Metadata、占位符、timestamp */
--text-disabled: #d0d5dc;

/* === Accent (Dify UI blue · 仅用于 CTA / focus / selected) === */
--accent-default: #155aef; /* primary CTA bg, white text AA */
--accent-hover: #004aeb;
--accent-active: #003dc1;
--accent-tint: #eff4ff; /* selected nav bg · Dify UI blue tint */
--accent-text: #004aeb; /* blue 文字（hover 态链接）*/

/* === Severity (风险色系 · 唯一可以鲜艳的地方) === */
/* tint 全部走实色 hex，与 Figma 与 /DESIGN.md `colors:` 段同源；
   不再使用 rgba(0.06) 透明叠加 (会随父背景漂移)。 */
--severity-critical: #d92d20; /* Dify red-600 */
--severity-critical-tint: #fef3f2;
--severity-critical-border: #fda29b;

--severity-high: #e04f16; /* Dify orange-600 */
--severity-high-tint: #fef6ee;
--severity-high-border: #f7b27a;

--severity-medium: #dc6803; /* Dify warning-600 */
--severity-medium-tint: #fffaeb;
--severity-medium-border: #fedf89;

--severity-neutral: #495464; /* Dify gray-600, 表示 OK / 不急 */
--severity-neutral-tint: #f9fafb;

/* === Status (状态专用 · 不和 severity 混用) === */
--status-done: #079455; /* Dify green-600 · 仅 Filed / Applied 时使用 */
--status-draft: #676f83; /* Dify gray-500 */
--status-waiting: #0086c9; /* Dify blue-light-600 · Waiting on client */
--status-review: #155aef; /* blue-brand-600 · Needs review */
```

### 2.3 Dark Mode（暗色镜像，不是 Bloomberg 终端）

> **权威值在 `/DESIGN.md` `colorsDark:` YAML 段**，本节是工程实现镜像。任何 dark 调整必须先改 YAML 再回灌 `packages/ui/src/styles/preset.css .dark` 与 Figma `Dark` mode，禁止单点修改。

```css
/* === Surface === */
--bg-canvas: #1d1d20; /* Dify dark body，禁止纯黑 #000 */
--bg-panel: rgb(24 24 27 / 0.4); /* Sidebar */
--bg-elevated: #222225; /* Card, drawer, modal */
--bg-subtle: #1d1d20; /* Disabled field */

/* === Border === */
--border-default: rgb(200 206 218 / 0.14);
--border-strong: rgb(200 206 218 / 0.2);
--border-subtle: rgb(200 206 218 / 0.08);

/* === Text === */
--text-primary: #fbfbfc;
--text-secondary: #d9d9de;
--text-muted: rgb(200 206 218 / 0.6);
--text-disabled: rgb(200 206 218 / 0.3);

/* === Accent (Dify UI blue 提亮) === */
--accent-default: #5289ff;
--accent-hover: #84abff;
--accent-active: #84abff;
--accent-tint: rgb(21 90 239 / 0.14);
--accent-text: #84abff;

/* === Severity（在暗色下降饱和 · tint 加厚） === */
--severity-critical: #f04438; /* Dify dark red */
--severity-critical-tint: rgb(240 68 56 / 0.14);
--severity-critical-border: rgb(240 68 56 / 0.4);

--severity-high: #f38744;
--severity-high-tint: rgb(239 104 32 / 0.14);
--severity-high-border: rgb(239 104 32 / 0.4);

--severity-medium: #fdb022;
--severity-medium-tint: rgb(247 144 9 / 0.14);
--severity-medium-border: rgb(247 144 9 / 0.4);

--severity-neutral: #676f83;
--severity-neutral-tint: rgb(200 206 218 / 0.08);

/* === Status === */
--status-done: #17b26a;
--status-draft: #98a2b2;
--status-waiting: #0ba5ec;
--status-review: #5289ff;
```

### 2.4 禁用色清单（防止风格漂移）

| 禁用                            | 理由                             |
| ------------------------------- | -------------------------------- |
| 纯黑 `#000000`                  | OLED 屏边缘闪烁 + 白字 halation  |
| 纯白文字 `#FFFFFF` on dark      | 对比度过高，刺眼                 |
| 鲜红 `#FF0000` / 鲜绿 `#00FF00` | 与 CPA 严肃语境冲突              |
| 任何渐变色（linear / radial）   | Stripe 抄袭陷阱                  |
| 霓虹色 `#00FFFF` / `#FF00FF`    | 方向 B 专属，浅色模式禁用        |
| 紫色做主色（非 accent）         | 稀释 navy 权威感                 |
| 绿色表示 "OK / 安全"            | 用灰色 `--severity-neutral` 代替 |

### 2.5 Radius / Shadow Token（实施现状 · 2026-05-26 同步）

**这一节描述代码实际使用的 token 集**，与 `packages/ui/src/styles/tokens/primitives.css` 保持同步。所有 radius / shadow token 直接采用 Tailwind v4 + Dify 设计体系默认值（这是 vite-plus 模板的工程约定），DESIGN.md 不再发明独立 token 名称。

#### Radius scale（Tailwind v4 默认）

```
--radius-sm:   4px  · Chip / Evidence chip / Confidence badge / 小内联 token
--radius-md:   6px  · 备用（项目实际未使用，所有 6px 场景由 shadcn primitives 内部消化）
--radius-lg:   8px  · Card / Panel / Banner / Dropdown / Toast / 内嵌 Section
--radius-xl:  12px  · Drawer / Modal / Command Palette / Stage tile / 大号卡片
--radius-2xl: 16px  · ⚠️ 慎用，仅用于刻意"邀请触碰"的浮层（如 Search Palette 顶部容器）
--rounded-full:    · Pill / Avatar / 单行 chip 容器 / 全圆 status indicator
```

**禁用**：`rounded-3xl`（24px）— 在 workbench 风格里读起来太松散，迄今为止代码库中零使用。

#### Shadow scale（Dify 默认 + 本项目添加的 subtle/overlay 别名）

```
--shadow-xs:      0px 1px 2px 0px rgba(16, 24, 40, 0.05)
--shadow-sm:      0px 1px 2px 0px rgba(16, 24, 40, 0.06),
                  0px 1px 3px 0px rgba(16, 24, 40, 0.10)   · 默认浮层 / Button hover / Card 浅举升
--shadow-md:      0px 2px 4px -2px rgba(16, 24, 40, 0.06),
                  0px 4px 8px -2px rgba(16, 24, 40, 0.10)
--shadow-lg:      0px 4px 6px -2px rgba(16, 24, 40, 0.03),
                  0px 12px 16px -4px rgba(16, 24, 40, 0.08)
--shadow-xl:      0px 8px 8px -4px rgba(16, 24, 40, 0.03),
                  0px 20px 24px -4px rgba(16, 24, 40, 0.08)
--shadow-2xl:     0px 24px 48px -12px rgba(16, 24, 40, 0.18)
--shadow-3xl:     0px 32px 64px -12px rgba(16, 24, 40, 0.14)

/* 本项目语义化别名 — 保留 backwards-compat，新代码优先用上面的 Dify 默认 scale */
--shadow-subtle:  0 2px 8px rgba(0, 0, 0, 0.04)   · Drawer 底缘 / Popover / Tooltip
--shadow-overlay: 0 8px 24px rgba(0, 0, 0, 0.08)  · Modal / Command Palette / Floating action bar
```

#### 实际使用规约（按场景）

| 场景                  | Radius                         | Shadow                              |
| --------------------- | ------------------------------ | ----------------------------------- |
| Chip / Evidence badge | `rounded-sm`                   | 无                                  |
| Button (shadcn)       | `rounded-md`（primitive 内部） | hover/active 自带 `shadow-sm`       |
| Card / Banner / Panel | `rounded-lg`                   | 无（page 上的卡片默认无 shadow）    |
| Drawer / Modal        | `rounded-xl`                   | `shadow-overlay`（或 `shadow-2xl`） |
| Command Palette       | `rounded-xl`                   | `shadow-overlay`                    |
| Floating action bar   | `rounded-xl`                   | `shadow-overlay`                    |
| Popover / Tooltip     | `rounded-lg`                   | `shadow-subtle` 或 `shadow-sm`      |
| Pill / Avatar circle  | `rounded-full`                 | 无                                  |
| Status pill           | `rounded-full`                 | 无                                  |

#### 漂移判据

下面这些用法应被视为漂移并替换：

- `rounded-3xl` — 项目从未使用，不要引入。
- `rounded-2xl` — 仅 3 处历史用法，新代码不要使用。倾向于 `rounded-xl`。
- `shadow-3xl`、`shadow-2xl` — 不要在业务组件使用（仅 Tailwind 默认保留以备移植）。
- 内联自定义 shadow（如 `shadow-[0_20px_48px_...]`）— 应改为 `shadow-overlay`，除非该值经过单独 design review。

**变更基础（2026-05-26 v2.1）**：原版 §2.5 给出的"只允许 sm / md / lg 三档" + "只允许 subtle / overlay 两档 shadow" 是 v1.0 的早期愿景，但 `primitives.css` 实施时跟随了 vite-plus 模板的 Dify-默认 scale。本次同步把文档拉齐到实际实施面，避免下一轮 audit 把工程默认值误判为漂移。

---

## 3. Typography Rules

### 3.1 字体选型

```css
/* 正文 + UI */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* 数字 / 金额 / 日期 / 规则 ID / 官方 URL / EIN */
--font-mono: 'Geist Mono', 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
```

- Inter：加载 weight `400 / 500 / 600`，开启 `font-feature-settings: "cv11", "ss01"`（更好的数字样式）
- Geist Mono：所有数字必须 `font-variant-numeric: tabular-nums`（防止列对不齐）
- **禁止 serif 字体**（那是方向 C 的 Brief PDF 专属）

**全局打开 feature-settings（约束，放在 `@layer base`）：**

```css
@layer base {
  html {
    font-family: var(--font-sans);
    font-feature-settings: 'cv11', 'ss01'; /* Inter 优化数字形态 */
  }

  /* 工具类：所有金额 / 天数 / 日期 / EIN / ID 加上 .tabular 或 .font-mono 强制 tabular-nums */
  .tabular,
  .font-mono {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }
}
```

- `html` 层的 `font-feature-settings` 不可省略；否则 Inter 的 `cv11`（单层 l）和 `ss01`（替代 1）不会生效，设计还原度下降
- 业务组件**不允许**在行内覆盖 `font-feature-settings`

### 3.2 字号与用途（紧凑但不过密）

| Token                | Size | Weight | Line-height | 用途                                                                                            |
| -------------------- | ---- | ------ | ----------- | ----------------------------------------------------------------------------------------------- |
| `text-2xs`           | 10px | 500    | 1.3         | keyboard chip, compact evidence marks                                                           |
| `text-xs`            | 11px | 500    | 1.4         | metadata（timestamp / source）, 表头 uppercase, 表格行内容（即 `typography.label`）             |
| `text-badge`         | 11px | 500    | 1.333       | Badge primitive（status / readiness / source chips）                                            |
| `text-sm`            | 12px | 400    | 1.5         | 次级说明、非 badge 状态 label                                                                   |
| `text-base`          | 13px | 400    | 1.5         | **正文默认**（即 `typography.body` / `body-medium`）                                            |
| `text-md`            | 14px | 500    | 1.5         | 客户名、可点击标题                                                                              |
| `text-lg`            | 16px | 500    | 1.4         | 页面标题、Drawer 标题（即 `typography.title`）                                                  |
| `text-xl`            | 20px | 600    | 1.3         | Hero 副指标数字、Section heading                                                                |
| `text-2xl`           | 24px | 600    | 1.2         | Client Detail 顶部名称                                                                          |
| `text-section-title` | 32px | 600    | 1.1875      | Marketing landing 段标题（即 `typography.section-title`，仅 marketing 使用）                    |
| `text-display-large` | 36px | 600    | 1.167       | Marketing landing 二级 hero（即 `typography.display-large`，仅 marketing；权威值与 Figma 同步） |
| `text-hero`          | 56px | 700    | 1.0         | **Deadline Radar Hero 数字**（即 `typography.hero-metric`，tabular-nums 必开）                  |
| `text-display-hero`  | 54px | 600    | 1.074       | Marketing landing h1（即 `typography.display-hero`，**禁用**于 workbench；权威值与 Figma 同步） |

> **铁律**：`text-section-title` / `text-display-large` / `text-display-hero` 仅限 marketing landing（`apps/app/src/routes/landing.*` 之类）使用，**禁止**进入 dashboard / obligations / drawer / modal 等 workbench 表面。

#### 角色 → token 映射（2026-05-25 增补）

When picking a size, anchor on the **role** the text plays in the
component, not the visual eyeball test. Role-to-token table for
recurring patterns we ship across drawers / cards / list rows:

| Role                                                       | Token                   | Weight   | Example                                                              |
| ---------------------------------------------------------- | ----------------------- | -------- | -------------------------------------------------------------------- |
| **h1** — page title                                        | `text-2xl`              | semibold | "Today", client name on `/clients/[id]`                              |
| **h2** — section header (TabSection, page sub-area)        | `text-xl`               | semibold | "Alerts", "Filing plan", "Actions this week"                         |
| **h3** — card title (drawer body, stage card)              | `text-base` / `text-lg` | semibold | Stage card stageLabel; PulseDetailDrawer title (`text-xl` exception) |
| **Body** — list-row primary text                           | `text-base`             | regular  | Action prompt in dashboard ActionRow                                 |
| **Body strong** — list-row anchor (client name, form code) | `text-base`             | semibold | ActionRow client name (2026-05-25 #25); filing-plan form code        |
| **Body secondary** — list-row supporting copy              | `text-sm`               | regular  | Stage stepper items, drawer description, tile sublines               |
| **Tile value**                                             | `text-xl`               | semibold | Summary tiles on dashboard + client detail                           |
| **Eyebrow** (uppercase tracking)                           | `text-caption`          | medium   | "Steps", "Filing activity", section labels above fact grids          |
| **Caption-xs**                                             | `text-caption-xs`       | medium   | Keyboard chips, dense badges, tabular gutters                        |

**The body / body-strong / body-secondary trio must always read as
three distinct tiers in the same row.** If the difference between a
heading and its supporting copy is just `font-medium` vs
`font-regular` at the same size, the hierarchy reads as flat — that's
what Yuqi flagged across multiple surfaces (e.g. Today #25, drawer
#22, drawer #28/#29). The fix is to **change the token AND the
weight**, not just the weight.

### 3.3 字母间距

- UPPERCASE 短语（`AT RISK · NEXT 7 DAYS`）：`letter-spacing: 0.08em`
- Hero 数字：`letter-spacing: -0.02em`（收紧）
- 其他：0

### 3.4 数字铁律

```tsx
// ✅ 正确
<span className="font-mono tabular-nums">${amount.toLocaleString()}</span>

// ❌ 错误：用 sans-serif 显示金额，列无法对齐
<span>${amount}</span>
```

所有需要**纵向对齐**的数字（金额、天数、日期、EIN、ID）**必须** 使用 `--font-mono` + `tabular-nums`。

Datetime 展示统一使用 `YYYY-MM-DD HH:mm:ss <timezone>`，例如
`2026-04-29 09:14:32 UTC` 或 `2026-04-29 17:14:32 GMT+8`。UI 不直接暴露
`2026-04-29T09:14:32.883Z` 这类 ISO transport value；date-only due date 可只显示
`YYYY-MM-DD`。Firm-scoped operational surfaces use the active firm timezone as the primary
display timezone and may show UTC as secondary audit metadata.

主工作台中的 `Due date` 口径是 practice internal deadline；如果 UI 展示税务机关规则来源中的
filing 或 payment deadline，必须显式写出 `Filing Deadline` / `Payment Deadline`，不能和
internal deadline 混用。

Obligation detail 展示税务机关 deadline 时，必须同时展示 CPA-facing `Tax period`。Fiscal-year
和 short-year return 的 deadline 以 obligation tax period 为依据；如果客户没有明确标记为
fiscal year，系统按 calendar year 兜底计算。只有明确 fiscal-year client 且缺少有效 fiscal
year end 时，才显示 `Needs fiscal year end` 作为 client-level missing fact；这类客户不得生成
占位 deadline，也不得静默显示 calendar-year deadline。有效 fiscal year end 是 CPA 导入或维护
的客户事实，直接用于 Tax Period、Filing Deadline、Payment Deadline 和 Internal deadline，不进入
Tax Period review。

---

## 4. Component Stylings

### 4.1 Risk Row（Obligations / Dashboard 表格行）

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ▌ Acme Holdings LLC  ·  Form 1120  ·  Mar 15  ·  3d  ·  $28,400  ·  Draft  ·  [Apply] │  ← Critical 行
└─────────────────────────────────────────────────────────────────────┘
│
└─ 2px 左边框 severity-critical + 背景 severity-critical-tint
```

**规格**

- 高度：36px（默认）/ 32px（Compact）/ 40px（Spacious）
- Critical / High / Upcoming 行：`border-left: 2px solid var(--severity-*)` + `background: var(--severity-*-tint)`，对应 `/DESIGN.md` `components.risk-row-{critical,high,upcoming}.severityBarWidth: 2px` + `severityBarColor`
- Neutral 行：无 tint，仅靠 `--border-subtle` 1px 底线分隔
- Hover：叠加 `background: rgba(0,0,0,0.02)`（light）/ `rgba(255,255,255,0.04)`（dark）
- Selected：`background: var(--accent-tint)` + 2px 左 `--accent-default`
- **行内操作区** `[Apply]` `[Start]` 用 `text-accent-default`，hover underline

| Row kind            | Severity bar (left)                  | Background                      | 触发条件                                                |
| ------------------- | ------------------------------------ | ------------------------------- | ------------------------------------------------------- |
| `risk-row-critical` | `2px solid var(--severity-critical)` | `var(--severity-critical-tint)` | `days_left ≤ 2` 或 legacy penalty estimate > $10,000    |
| `risk-row-high`     | `2px solid var(--severity-high)`     | `var(--severity-high-tint)`     | `3 ≤ days_left ≤ 7` 或 legacy penalty estimate > $3,000 |
| `risk-row-upcoming` | `2px solid var(--severity-medium)`   | `var(--severity-medium-tint)`   | `8 ≤ days_left ≤ 30`                                    |
| Neutral row         | —（仅 `--border-subtle` 1px 底线）   | 透明                            | `days_left > 30` 或 `status = OK`                       |

### 4.2 Hero Metric（Dashboard 顶部 $ 风险聚合）

```tsx
<div className="flex items-baseline gap-8 py-6">
  {/* 主指标 */}
  <div>
    <div className="text-xs uppercase tracking-wide text-muted">AT RISK · NEXT 7 DAYS</div>
    <div className="text-hero font-mono font-bold tabular-nums text-primary">$142,300</div>
  </div>
  {/* 副指标（重复 3 次） */}
  <div>
    <div className="text-xl font-mono font-semibold tabular-nums">5</div>
    <div className="text-xs uppercase tracking-wide text-muted">CRITICAL CLIENTS</div>
  </div>
</div>
```

- 严禁加阴影 / 边框 / 卡片背景 —— Hero 靠排版层级而不是容器
- Hero 数字永远是**页面上最大的东西**，第二大的元素至少小 50%

### 4.3 Pulse Banner（监管提醒 · Layer 2）

```text
┌───────────────────────────────────────────────────────────────┐
│ ● IRS Notice 2026-14 · Form 941 clarification · 3 clients      │
│   Verified from IRS.gov 2h ago            [Dismiss] [Review]  │
└───────────────────────────────────────────────────────────────┘
```

**规格**

- 36px hairline strip：`background-default` + `border-divider-subtle` + `radius: 6px`
- 左侧 8x8 `PulsingDot`，tone 必须通过 `pulseAlertTone(alert)` helper 计算 — **不允许在 banner / card / drawer 各自手写 tone 公式**。详见 [`docs/Design/pulse-vocabulary.md`](./pulse-vocabulary.md) 中 "Canonical implementation" 章节。
- 每个 `<PulsingDot>` 都必须有 `label` prop（hover tooltip + aria-label），通过 `pulseAlertToneLabel(tone)` 拿到，避免出现 "这绿色点点是什么意思？" 这类问题
- Active alert 与 all-clear strip 叠加低频 breathing background tint：3.8s `ease-in-out`，只改变 overlay opacity，不改变布局尺寸
- `prefers-reduced-motion: reduce` 时关闭动画，保留静态低透明度背景 tint
- 右侧 `[Dismiss]` 次级动作 + `[Review]` 主按钮；整行点击进入 drawer，按钮区域阻止冒泡
- 多条时：主条显示 `+ N more`，历史页用同一 hairline row 语言；仅第一条 `matched` 且影响客户数 > 0 的 row 使用 breathing background
- **禁止使用红色做 Banner** —— 红色留给行内 Critical 风险。Low-confidence alert 走 `normal` (info) tone，不是 `error`

### 4.4 Evidence Chip（证据徽章 · Glass-Box 核心）

这是 DueDateHQ **独占的设计资产**，其他 CPA 产品没有。

```tsx
<a
  href={sourceUrl}
  className="inline-flex items-center gap-1 rounded border border-default px-1.5 py-0.5
             font-mono text-2xs text-muted hover:border-accent hover:text-accent-text"
>
  <span>IRS.GOV</span>
  <ExternalLink size={10} />
</a>
```

- 极小：高度 18px，font 10px mono
- 外观：1px 描边 + 圆角 2px，无背景填充
- Hover：边框变 accent 色，0.5s 延迟弹出迷你 source excerpt 卡片（Popover 200px 宽）
- 点击：打开新 tab 到 `source_url`
- 任何 AI 输出、规则引用、Pulse 条目都**必须**挂一个 Evidence Chip

### 4.5 Command Palette（`⌘K` 三合一）

```text
┌─ Search, Ask, or Navigate... ⌘K ──────────────┐
│  > apply all critical                         │
├───────────────────────────────────────────────┤
│  → APPLY · 5 critical filings · ↵ to confirm  │
│  → FILTER: show only $>$10,000                │
│  → ASK: "What's my CA exposure this week?"    │
│  → NAV: Obligations · Clients · Rules           │
├───────────────────────────────────────────────┤
│  ↵ execute · esc close · ⌘K toggle            │
└───────────────────────────────────────────────┘
```

**规格**

- 居中浮层 560px 宽，`background: var(--bg-elevated)` + `border: 1px solid border-default` + `shadow: 0 8px 24px rgba(0,0,0,0.08)`
- 输入框 mono 14px，光标是 `--accent-default`
- 三类结果分段，section header 11px uppercase muted
- 交互使用 shadcn `Command` / `cmdk`：ArrowUp/ArrowDown 移动 active item，Enter 执行；全局 palette 开启 `disablePointerSelection`，鼠标 hover 不改变键盘 active item
- 鼠标 hover 是浅层中性反馈 `bg-background-subtle`；键盘 active item 使用更深的 `bg-state-base-hover`，不加左侧指示条
- 快捷键提示用 `<kbd>` 小胶囊，`background: bg-subtle` + 1px border

### 4.6 Deadline Radar Strip（首屏顶栏）

- 始终 sticky 顶部，高度 48px
- 默认灰色文字；有新 alert 时 `background: var(--severity-critical-tint)` 脉冲 1.5s 后淡出
- 右侧 `▲ up $3,100 vs last week` 带小三角趋势指示

### 4.7 Triage Tabs（时间分组）

```
[ This Week · 15 · $12,400 ]   [ This Month · 42 · $46k ]   [ Long-term · 86 · $210k ]
```

- 未选中：`text-secondary`，hover `text-primary`
- 选中：`text-primary` + 2px 底边框 `--accent-default` + mono 数字 semibold
- 右侧 `$` 金额：mono tabular-nums，和普通文字用 `·` 分隔

### 4.8 Button 系统

> **来源声明**：本节按钮规格 = `pnpm dlx shadcn add button` 在 `base-vega` style 下产出的默认值；DESIGN.md `components.button-{primary,secondary,primary-hover,primary-active}` token 段落是这些值的镜像。修改任一处需三方同步。

| 类型                                | 规格                                                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary**（Apply / Save / Start） | `bg: accent-default` + `text: white` + `radius: 6px` (`rounded-md`) + `h-9` 36px + `px-2.5` 10px + `text-sm` 12px / 500 (`typography.button`) |
| **Secondary**（Cancel / Dismiss）   | `bg: transparent` + `border: 1px border-default` + `text: primary` + 同 Primary 的 radius / height / padding / typography                     |
| **Ghost**（row 内操作）             | `text: accent-default` + no bg / border + hover underline                                                                                     |
| **Destructive**（Delete）           | `bg: severity-critical` + `text: white` + 同 Primary 的 radius / height / padding / typography                                                |
| **Icon-only**                       | `size-8` 32x32 (`size: sm` variant) / `size-9` 36x36 (`size: default`)，`radius: 6px`，hover `bg: bg-subtle`                                  |

**禁止**：圆形按钮、pill 按钮（radius > 8px）、带渐变的按钮。

### 4.9 Sidebar Navigation（AppShell sidebar）

> **权威实现**：`@duedatehq/ui/components/ui/sidebar` 是项目自建的 thin primitives（**不是 shadcn `Sidebar` 注册组件**）。app 端在 [`apps/app/src/components/patterns/app-shell.tsx`](../../apps/app/src/components/patterns/app-shell.tsx) 复用，所有 protected layout 共享同一个 `<AppShell>`，entry shell（`/login` / `/onboarding` / `/migration/new`）不挂侧栏。

#### 为什么不是 shadcn

shadcn `Sidebar`（base-vega）打包了 3 种 collapse 模式（`offcanvas` / `icon` / `none`）+ `SidebarRail` + cookie 持久化 + `floating` / `inset` chrome variant。我们仍然不引入这套状态机：

- desktop 只有一个产品定义的 expanded / icons-only rail：220px 展开、56px 折叠，通过 root `data-collapsed` 驱动 descendant CSS；不暴露 shadcn 的 `data-state`、rail 拖拽、offcanvas desktop 模式
- 全局快捷键词汇表是 `⌘K`（command palette）和 sidebar rail toggle；当前 shell 不暴露 practice switcher hotkey
- `floating` / `inset` variant 与 §6「borders before shadows · no decorative depth」相反

引入 700+ 行未用 API + `bg-sidebar-*` 一整套 token alias 只会让后面看代码的人多踩坑。所以走 thin primitives：`Sidebar` / `SidebarHeader` / `SidebarContent` / `SidebarFooter` / `SidebarGroup` / `SidebarGroupLabel` / `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` / `SidebarMenuBadge` / `SidebarMenuBadgeDot` / `SidebarTrigger` / `SidebarCollapseToggle` + `SidebarProvider` / `useSidebar()`。Mobile 仍复用现有 `@duedatehq/ui/components/ui/sheet` 做 drawer。

#### 视觉规格（desktop 220px expanded / 56px collapsed）

- **总宽**：展开 220px（`13.75rem`），折叠 56px（`3.5rem`）。折叠/展开直接切换最终几何，不做 width / margin / padding 动画；避免 icon 与 badge 在过渡中横向漂移
- **背景**：`bg: var(--bg-panel)`，右侧 1px 发丝线分隔（`border-right: 1px solid --border-default`），无阴影、无 shadcn `SidebarRail`
- **Brand tile（practice avatar）**：24×24 圆角 sm，**fill: `brand-primary` / brand mark navy `#0A2540`，white 12px Inter Semi Bold 字母 monogram**——品牌资产保留 navy，不用 accent blue
- **每个 nav item**：32px 高（dense workbench；compact 模式可降到 28px），13px Inter 500，左 padding 12px、右 padding 8px、`gap-2`、圆角 md (6px)
- **Idle**：`text: text-secondary`，icon `text-text-tertiary`
- **Hover**：`bg: background-default-hover`（`#F9FAFB`，Dify 中性灰）+ `text: text-primary`
- **Selected（最终版）**：**`bg: accent-tint`（Dify UI blue token——`#eff4ff` light · `rgb(21 90 239 / 0.14)` dark）+ `text: text-primary` + 字重 `Inter Semi Bold`**。**没有 2px 左 accent border**（视觉噪音）、**没有 accent-text label**（饱和度溢出）。只在背景留一道 calm 的淡蓝 wash 用作 wayfinding 信号
- **设计取舍说明**：`accent-tint` token 是为 selected 态准备的（与 confidence-badge-high / stepper-current 等共用）。早期 spec 的 "2px accent border + accent-tint + accent-text" 三件套太响；落地中尝试过的 "纯中性 background-subtle" 在 panel 背景上视觉差太小。**`accent-tint` 单层 wash 是这两端之间的正解**——既给 selected 一个清晰可识的视觉锚，又不召唤饱和 blue（saturated `accent-default` 仍专属 CTA / focus / 风险）。**Hover 不用 accent-tint**，保持中性 `bg-background-default-hover` 让 hover 与 selected 分得开
- **Group label**：11px 8% letter-spacing 大写，`text: text-tertiary`，左 padding 12px、上下各 4px；折叠态隐藏，不保留 divider / group name 替代状态
- **Group spacing**：组之间 16px gap，组内 item 之间 2px gap，**不**加 hairline 分组（保持 calm）
- **Mono badge**（`12` / `34` 这类 pending 计数）：展开态是 18px 高圆角 sm 小药丸，`border: 1px border-default`，Numeric/Small mono `text: text-muted`。折叠态不把 pill 本体缩成 dot，而是隐藏 pill、渲染独立 6px dot，避免展开时数字 badge 从 dot 几何跳回 pill
- **Motion**：rail 宽度、button 尺寸、padding、margin、icon 位置都不动画。只做视觉层微过渡：展开时 label / group label / badge opacity 淡入 120ms；折叠时数字立即消失，collapsed dot opacity 淡入 100ms；`prefers-reduced-motion` 下禁用

#### 三段式结构（顶到底）

| Slot                                   | 高              | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PendingBar**（route-owned）          | 2               | idle 几乎不可见；导航中 accent-default 段从左滑出                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Practice identity**（static）        | 56              | 24px navy brand tile + practice name (Body·Medium)。当前 shell 不渲染 ChevronsUpDown、`Practices` popover、`Add practice` 或 practice-switcher hotkey；practice 管理入口留在 Practice Profile / Members / Billing。内部组件名可继续沿用 `FirmSwitcher`，但可见形态是静态 Practice identity。                                                                                                                                                                                                                                                                                                         |
| Hairline `border/default`              | 1               | 与右侧 route header 底边在同一 Y 处 collinear                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **SidebarContent**（nav body, flex 1） | —               | 三个 group：`OPERATIONS`（Dashboard / Deadlines / Rules）、`CLIENTS`（Clients facts）、`PRACTICE`（Practice profile / Team workload / Members / Billing / Audit log）。Calendar sync 是 Deadlines header 的二级入口（`/deadlines/calendar`），不是 sidebar 一级项。Pulse Changes 合并进 Rules，Rules 使用 `FileCheck2` 并承载 verified rules、source-backed deadline templates、政府来源变更和 Pulse badge；右上角 `Bell` 保留给个人 notification center。Team workload 是 paid practice surface：Solo 显示 locked `Pro` hint，Pro/Enterprise 启用。主导航按工作心智组织，不按工程模块或权限表命名。 |
| **Plan status**                        | 48 + 12 padding | `CreditCard` icon + 当前 `Solo / Pro / Enterprise` + seat count + `Upgrade / Manage / View` action chip，链接 `/billing`。这是持久 subscription 状态入口，不是 pricing 卡片；完整 Billing 页面展示 seats 和 active practices 两个 entitlement 维度。使用 `bg-background-section`、8px card radius、brand/accent icon tile 和 action chip，让它比普通 nav item 更像账户状态卡，但不进入营销视觉。                                                                                                                                                                                                     |
| Hairline `border/default`              | 1               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **User row**                           | 56              | 28px 头像 + 右下 6px `status-done` 绿点（包 surface-panel 环 = ring 效果） + Body·Medium name + Numeric/Small email + 右端 chevron。点击展开 popover 含 sign-out / theme / locale                                                                                                                                                                                                                                                                                                                                                                                                                    |

#### Mobile（< 768px）

桌面态在 `<md` 断点折叠成右侧 Sheet drawer（沿用 `@duedatehq/ui/components/ui/sheet`）；route header 左端的 `SidebarTrigger` 按钮（`PanelLeftIcon`）唤起。`SidebarTrigger` 在 `md+` 自动隐藏（Tailwind `md:hidden`）。

#### Token 收敛

视觉系统**不引入** shadcn 自带的 `--sidebar-*` 簇，统一走业务语义：`bg-components-panel-bg`（panel 背景）、`bg-background-default-hover`（hover · Dify 中性 `#F9FAFB`）、**`bg-accent-tint`（selected · Dify UI blue wayfinding token，`#eff4ff`）**、`text-text-{primary,secondary,tertiary,muted}`、`border-divider-regular` / `border-divider-subtle`。`--state-base-hover-*` 簇现在跟随 Dify 中性 gray alpha，可用于 button tertiary / hover / table row hover；selected wayfinding 仍必须用 accent token。这些都已经在 `packages/ui/src/styles/preset.css` 暴露为 Tailwind utility，与 Dify-aligned token tree 同源。`components.sidebar`（DESIGN.md front-matter）保留 spec source（width: 220px、`backgroundColor: surface-panel`、`textColor: text-secondary`），本段补充视觉细节与 selected 态 spec。

#### Practice identity 位置（PRD §3.2.6 偏离）

PRD §3.2.6 原来规定 firm switcher 是「**右上角 dropdown** + `⌘⇧O`」（Slack workspace picker 风格）。当前设计把**practice identity 移到 sidebar 顶部**（Linear / Notion / Vercel 流派——practice 身份是工作台核心持久信号，应该常在视野内），但不暴露切换操作：没有 `Practices` popover、没有 `Add practice`、没有 `⌘⇧O` switcher hotkey。右上角空间留给 AppShell-owned utility（通知 bell + `⌘K` hint）。

#### Billing / subscription IA

Pricing 是公开 marketing 页和 Billing commerce surface 的内容，不进入 protected app 的 route
header。Protected shell 只暴露当前 practice identity 和 footer 里的计划状态；完整 plan / seat / active-practice entitlement
信息在 Billing 页面，sidebar footer 追加一个轻量 `PlanStatusLink` 作为 `Upgrade / Manage / View` 入口。
Billing 页面再完整展开 active practice entitlement usage（Solo / Pro = 1 active practice；
Enterprise = contract-defined）。这样 owner 能随时找到账单入口，member 也能理解当前 workspace
的计划边界，但主导航仍按任务域组织。

完整 subscription overview、billing portal、checkout deep link 和 plan comparison 继续由
`/billing` 承载；route header 右侧只放 AppShell-owned utility（`⌘K`、通知），不放 pricing
CTA、plan pill 或 route-specific action。

#### Import / setup IA

`Import clients` 是 activation/setup path：把 CPA 已有客户表变成 weekly triage 的真实
clients + obligations。它不是日常导航，也不是 sidebar footer utility。常驻入口放在
`/clients` 页面 header 和 clients empty state；Dashboard 空状态可继续提示导入以生成真实
risk；Command Palette 保留 `Import clients` action 作为 power-user 快捷入口。首登新建
practice 后进入 EntryShell 下的 `/migration/new?source=onboarding`，该 route 不挂
AppShell/sidebar，用无卡片 route header 解释“为什么现在导入”并提供 `Skip for now`；
下方 wizard 继续使用 Migration Copilot workbench frame。后续 operating surfaces 继续用
dialog shell 打开同一套 wizard。

`Import history` 是 batch recovery，不是客户资料修正入口。它在 `/clients` header 作为弱入口
打开右侧 drawer，展示最近导入批次、批次撤销和单个 imported client undo；单个客户资料修正仍然
回到 Clients fact profile。历史 `/imports` deep link 只重定向到
`/clients?importHistory=open`，不进入 sidebar。

Sidebar footer 只保留 workspace/account 持久状态：plan status + user menu。`/practice`
入口放在 Practice 导航；user menu 不承载 practice profile，除非后续新增真正的 user account
profile。

### 4.10 Status Pill Tone Ladder（2026-05-25 增补）

> 全审计与变更清单见 [`status-pill-audit-2026-05-25.md`](./status-pill-audit-2026-05-25.md)。
> 这一节是 audit §3 的"硬裁定"，新加任何 chip / pill 必须先来这里对一遍 tone。

App 里所有"X 是什么状态？"的 chip 都是
`(tone, shape, ornament)` 三元组。先选 tone（语义），再选 shape（类别），最后
按 ornament 规则决定要不要加 dot。三档独立，不允许"我觉得这个看着该是绿的"自由发挥。

#### Tone → 语义（不可重新定义）

| Tone                  | 语义                                 | 典型场景                                                                                                                |
| --------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `success`（绿）       | 完成 / 已结算 / 健康                 | `done` / `paid` / `completed`、rule `active`/`verified`、source `healthy`、materials `Received`、client `ready`         |
| `info`（蓝）          | **进行中的工作**                     | obligation `in_progress` / `review`、rule `pending_review` / `candidate`、pulse alert `New`                             |
| `warning`（黄）       | **外部暂停** — 等别人，暂无紧急性    | obligation `waiting_on_client`、source `paused`、invitation `expired`、tip `Failed`                                     |
| `destructive`（红）   | **硬阻断 / 失败** — 不干预就走不下去 | obligation `blocked`、rule `rejected`、coverage `none`、pulse confidence `< 0.7`、materials `Needs review`、AI `Failed` |
| `secondary`（灰填充） | 未开始 / 休眠                        | `pending`、`not_applicable`、rule `archived`/`deprecated`、member `suspended`                                           |
| `outline`（中性边框） | 引用 tag — 不是状态                  | source name、tax code、jurisdiction code、entity tag                                                                    |

注意：§14.7 已经独立裁定了 `needs_review` 一词的双重含义（数据质量类走
severity-medium 黄；工作流态走 status-review 蓝）。这张表只覆盖工作流态。

#### Shape → 类别（决定整个 chip 的画法）

| Shape                         | 含义                                                 | 例子                                                           |
| ----------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| 填充 chip + lucide icon       | Lifecycle / 工作流状态（"它在它的旅程中走到哪了？"） | `ObligationStatusReadBadge`（标准实现）、rule 状态徽章         |
| Outline chip + 引用文本       | 元数据 tag，不是状态                                 | tax code、jurisdiction、entity type、source name               |
| 裸 icon + 浅色文字（无 chip） | 行内 kicker，已经在有 label 的容器里                 | `RuleStatusKicker`（保留）、`ClientReadinessBadge`（压扁版本） |
| Progress bar 分段             | 跨多行的聚合计数                                     | `RuleStatusBar`、rule library StatsBar 进度条                  |

#### Ornament 规则（dot 用不用）

- 填充 chip → **只用 icon，不再加 dot**。Chip fill 已经在表达 tone，icon
  负责表达身份。`ObligationStatusReadBadge` / `ObligationQueueStatusControl` 是
  标准实现。
- `outline` chip → **可以加 dot**。因为 chip 本身没有 tone 可传达，dot 来
  补这个信号（`HealthBadge`、`TemporaryRuleStatusBadge`、members &
  invitations 行）。
- 填充 chip + dot 是 **冗余**，不允许新加。已经踩过这个坑的位置见
  [audit §2.3](./status-pill-audit-2026-05-25.md#23--badgestatusdot-是半弃用同家族内不一致的-dot-用法-sev-med)。

#### 落地纪律

- 添加新 chip 前先来这一节对 tone；如果是新语义，去 audit doc 加一行，再回来更新本表。
- 不要在某个 surface 里自由发挥重新映射 tone（"我们这页这里 review 用黄看着比较稳"
  这种话术等于在制造 audit §2.1 那种 4 色 review 灾难）。
- `BadgeStatusDot` 不是默认 ornament。先看 chip 是不是 outline，再决定要不要 dot。

---

## 5. Layout Principles

### 5.1 Spacing Scale（4px base）

```
0   · 0px
1   · 4px       —— icon gap, chip padding
2   · 8px       —— form field padding, small gap
3   · 12px      —— button padding-x, table cell padding-x
4   · 16px      —— default section padding, card padding
5   · 24px      —— between sections
6   · 32px      —— page section separator
8   · 48px      —— page top padding
12  · 80px      —— hero section vertical
```

**禁用**：5px、10px、15px、18px、22px（非 4 倍数破坏节奏）。

### 5.2 Grid

- Container max-width：`1440px`，左右 auto margin
- Dashboard / Obligations：全宽，不限 max-width
- Practice **forms**（Practice profile `/practice`）：max-width `880px` — 单对象编辑、字段稀疏，窄列让眼动距离短
- Practice **team data surfaces**（Members `/members`）：max-width `1172px` — 与 Figma `Members` 对齐；页头 80px、KPI strip 96px、成员表 36px 行、邀请表 56px 行，承载 Owner-only 成员管理、seat usage、pending invitations、操作菜单和邀请 modal。满席时顶栏 `Invite member` 仍可打开 modal 用于解释原因，最终 `Send invite` 禁用并由 server seat guard 兜底。按钮上的 `Mod+I` 标签必须由真实 route-scoped hotkey 支撑，并通过 keyboard help registry 可发现；所有可见 shortcut label 必须走 keyboard shell 的 TanStack `formatForDisplay` 包装，不允许显示未接线或手写平台判断的快捷键。
- Billing **commerce / status surfaces**（`/billing`）：max-width
  `1180px` — 需要同时展示当前状态、权限提示和 plan 对比，但仍应比 Dashboard /
  Obligations 更收敛，避免账单页面像运营工作台一样铺满。
- Billing checkout（`/billing/checkout`）：max-width `1120px`，主卡承载 plan summary
  和支付边界，右侧只放 practice context 核对信息；公开文案使用 payment provider /
  processor 口径，不把第三方实现细节当成套餐卖点。
- Practice **data surfaces / ops workbench**（Team workload `/workload`、Audit log `/audit`）：全宽，不限 max-width，与 Obligations 同源——这一类页面即使路由段不同，内容都是表格 / 矩阵 / drawer，与 form 不同语义。判定规则：**按内容形态而不是 URL 段决定宽度**
- Content body 段落（页头描述、policy 长文）：max-width `1080px`，约 ~135 个英文字符／行，短段落可读区间
- Drawer：400px（right slide-in），modal max-width `640px`

### 5.3 Density 三档

| Density                 | Row height | Table padding-y | 适用                               |
| ----------------------- | ---------- | --------------- | ---------------------------------- |
| **Compact**             | 32px       | 6px             | Obligations（File In Time 老用户） |
| **Comfortable**（默认） | 36px       | 8px             | Dashboard / Client list            |
| **Spacious**            | 40px       | 10px            | Demo / onboarding                  |

切换：User menu → Profile → 持久化到 `user.preferences.density` → CSS variable `--row-height`。

### 5.4 Max information, minimum chrome

- Dashboard 首屏必须能看见：Pulse Banner + Hero 数字 + ≥ 8 行客户
- Obligations 首屏必须能看见：≥ 12 行
- desktop 侧栏可在 220px expanded 与 56px icons-only rail 之间切换；mobile 仍使用 Drawer

---

## 6. Depth & Elevation

**铁律：能用 1px 线分层就不要用阴影。**阴影 token 唯一来自 §2.5。

| 层级                                 | 方案                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Level 0 · Canvas                     | `--bg-canvas`，无边框                                                                                       |
| Level 1 · Panel                      | `--bg-panel`，无边框；或 canvas + `border: 1px --border-default`                                            |
| Level 2 · Card                       | `--bg-elevated` + `border: 1px --border-default`，**无阴影**                                                |
| Level 3 · Drawer / Popover / Tooltip | `--bg-elevated` + `border: 1px --border-strong` + `box-shadow: var(--shadow-subtle)` · radius `--radius-lg` |
| Level 4 · Modal / Command Palette    | Level 3 规格 + `box-shadow: var(--shadow-overlay)` · radius `--radius-lg`                                   |

**禁用**

- 除 `--shadow-subtle` / `--shadow-overlay` 外的任何 `box-shadow`
- 多层嵌套卡片（卡片里套卡片套卡片）
- 超过 `--radius-lg`（12px）的圆角

---

## 7. Risk Severity System（CPA 独占的视觉语言）

### 7.1 四档严重度

| Level        | 条件                                       | 颜色                  | 图标               |
| ------------ | ------------------------------------------ | --------------------- | ------------------ |
| **Critical** | `days_left ≤ 2` 或 `exposure > $10,000`    | `--severity-critical` | 无（行首文字徽章） |
| **High**     | `3 ≤ days_left ≤ 7` 或 `exposure > $3,000` | `--severity-high`     | 同上               |
| **Medium**   | `8 ≤ days_left ≤ 30`                       | `--severity-medium`   | 同上               |
| **Neutral**  | `days_left > 30` 或 `status = OK`          | `--severity-neutral`  | 同上               |

### 7.2 视觉呈现规则

1. **Color + Label 双编码**（色盲友好）：行首永远有 `CRITICAL` / `HIGH` / `MEDIUM` / `NEUTRAL` 文字徽章
2. **Tint + Border 双信号**：背景 tint（低饱和）+ 2px 左边框（高饱和）组合
3. **计算必须可解释**：hover 行首徽章 → 弹出说明 "3 days to deadline + $28k exposure → CRITICAL"
4. **不和 Status 混用**：Status = 工作流状态（Draft / Waiting / Filed），Severity = 风险等级，两套 token 独立

### 7.3 特殊情况

- **OVERDUE**（`days_left < 0`）：Critical + 额外闪烁动画 1.5s（尊重 `prefers-reduced-motion`）
- **Filed / Applied**：用 `--status-done` 绿色 checkmark，**不再显示 severity 色**
- **Not Applicable**：灰色 + 删除线样式

---

## 8. Evidence & Provenance Visual Language（DueDateHQ 独占资产）

### 8.1 四类 Evidence 标记

| 场景                      | 组件                                           | 视觉                                 |
| ------------------------- | ---------------------------------------------- | ------------------------------------ |
| AI 生成句子结尾           | Footnote chip `[1]`                            | mono 10px + 下划线，hover 弹 Popover |
| 数据字段旁（金额 / 日期） | Evidence Chip `[IRS.GOV]`                      | 见 §4.4                              |
| 规则链接                  | Source Badge `🔗 CA FTB · ✓ Verified · 2d ago` | 12px Inter + link icon               |
| 大段 AI 摘要              | Evidence Mode 全屏 overlay                     | 右抽屉，列所有源 + source excerpt    |

### 8.2 Verbatim Quote Popover

```text
┌──── CA Revenue & Taxation Code §19131 ────┐
│  "Every corporation required to file a    │
│   return... shall pay a penalty of..."   │
│                                           │
│  ftb.ca.gov/…/rtc-19131                   │
│  ✓ Verified by Sarah K., 2026-04-20      │
│  [Copy as citation]                       │
└───────────────────────────────────────────┘
```

- 宽度 320px，背景 `--bg-elevated` + border strong
- Source excerpt 用斜体 `--text-secondary`，italic
- 底部 source URL 用 `--font-mono` 11px 截断
- **Copy as citation** 按钮复制结构化文本（内容 + URL + verified_at）

### 8.3 "No Provenance = No Render" 规则

AI 输出的任何内容，如果没有 `source_url + verified_at + source_excerpt`，**必须**渲染为：

```
⚠ I don't have a verified source for this yet.
  [Ask human to verify]
```

**禁止**渲染一条没有引用的 AI 建议。宁可空，不可幻觉。

---

## 9. Do's and Don'ts

### ✅ Do

- 用灰色表示"OK / 不急"，不用绿色
- 所有金额 / 天数 / EIN / 日期走 `--font-mono` + `tabular-nums`
- 每个交互元素都有键盘快捷键，并在 hover 时展示
- 风险用美元表达（`$28,400 at risk`），其次才是天数（`3d`）
- AI 输出必带 Evidence Chip
- 暗色模式使用 `--bg-canvas: #1D1D20`（Dify dark body），不是纯黑
- 批量操作（Bulk actions）有 `[Undo]` 500ms toast
- 表格行数 ≥ 10 行可见（Obligations ≥ 12 行）

### ❌ Don't

- 用紫色渐变（Stripe 陷阱）
- 给按钮 / 卡片加大阴影（`shadow: 0 10px 30px`）
- 圆角 > 8px（pill 按钮、胶囊卡片）
- Status = Filed 时还显示 red severity tint（语义矛盾）
- 用 serif 字体（除非是方向 C 的 Brief PDF）
- 用 emoji 做核心 UI（🚨 只在 Pulse Banner 图标位置可以）
- 首屏 Hero 放客户总数 / 任务完成率 / 进度条（应该是 $ 风险数字）
- 在 modal 里完成状态切换（应该是行内 dropdown + 500ms undo）
- 让 AI 输出没有 `[source]` 徽章就渲染出来
- Dark mode 用纯黑 `#000000`

---

## 10. Responsive Behavior

### 10.1 断点

```css
--bp-sm: 640px; /* Mobile landscape */
--bp-md: 768px; /* Tablet */
--bp-lg: 1024px; /* Laptop */
--bp-xl: 1280px; /* Desktop */
--bp-2xl: 1536px; /* Wide desktop */
```

### 10.2 降级策略

| 断点      | Dashboard                                 | Obligations | Sidebar       |
| --------- | ----------------------------------------- | ----------- | ------------- |
| ≥ 1280px  | 三栏 + 右 Pulse 面板                      | 全 14 列    | 固定 220px    |
| 1024–1279 | 两栏，Pulse 下沉                          | 默认 10 列  | 固定 220px    |
| 768–1023  | 单栏纵向                                  | 精简 6 列   | 折叠为 Drawer |
| < 768     | 只读优先：Hero + Triage Tabs + Top 5 rows | 卡片化      | 底部 Tab Bar  |

### 10.3 触控目标

Mobile 下所有可点击元素 ≥ **40x40px**（WCAG 2.2 AA）。Critical 行的 `[Apply]` 按钮可放大到 44px 高。

---

## 11. Agent Prompt Guide（for Cursor / v0 / Lovable）

### 11.1 Quick color reference

```
BG canvas:    Dify gray-100 / Dify dark body (#F2F4F7 / #1D1D20)
Text primary: Dify gray-900 / Dify dark text (#101828 / #FBFBFC)
Accent CTA:   Dify UI blue (#155aef light CTA / #5289ff dark accent)
Critical:     Dify red-600 (#D92D20) · tint #FEF3F2 light / 14% dark
High:         Dify orange-600 (#E04F16)
Medium:       Dify warning-600 (#DC6803)
Neutral OK:   Dify gray-600 (#495464)  ← NOT green
Done/Applied: Dify green-600 (#079455) ← only for completed
```

### 11.2 Ready-to-use prompts

**生成一个 Dashboard 风险表格行**

> Build a table row component for DueDateHQ. Light mode. Use Inter 11px for table row text and Geist Mono 11px tabular-nums for "$28,400" and "3d", font-weight 600 on name. Row height 36px. Critical status → `border-left: 2px solid #D92D20` + `background: #FEF3F2`. No shadow. Hover state adds `background: rgb(200 206 218 / 0.2)`. Right-aligned dollar amount. Inline `[Apply]` button uses `color: #155aef` no border no bg with hover underline. Status label 11px Dify gray-500.

**生成一个 Hero 风险聚合区**

> Build the Dashboard hero metric section for DueDateHQ. Display "$142,300" in Geist Mono Bold 56px, color `#101828`, `tabular-nums`, `letter-spacing: -0.02em`. Above it: "AT RISK · NEXT 7 DAYS" in Inter 11px uppercase `letter-spacing: 0.08em` color `#98A2B2`. To the right, three side metrics stacked as `<big mono number> + <small uppercase label>`, separator is just spacing not a line. No card border, no shadow, no background. Padding vertical 24px.

**生成 Evidence Chip**

> Build an inline Evidence Chip for DueDateHQ. Format: `[IRS.GOV]` in uppercase Geist Mono 10px. Style: 1px solid `#E9EBF0` border, 2px border-radius, padding 2px 6px, color `#98A2B2`. Hover: border color becomes `#155aef`, text color becomes `#004aeb`. Show a tiny external-link icon (10px) next to the label. On hover, delay 500ms then show a popover 320px wide with source excerpt in italic, source URL in mono 11px, and a "Copy as citation" button at bottom.

### 11.3 必须避免的 prompt 关键词

不要用这些词描述 DueDateHQ UI，否则会生成错误风格：

- ❌ "modern gradient", "hero gradient", "purple glow"
- ❌ "playful", "friendly", "rounded", "vibrant"
- ❌ "glassmorphism", "neumorphism", "3D"
- ❌ "colorful dashboard", "data visualization colors"
- ❌ "saas template", "dribbble style"

应该用：

- ✅ "dense data table", "tabular nums", "1px hairline"
- ✅ "Linear style", "Ramp dashboard", "Stripe navy"
- ✅ "zero shadow", "flat", "precise", "editorial"
- ✅ "keyboard-first", "command palette", "progressive disclosure"

---

## 12. 对应 PRD / Dev File 的落地映射

| 本文件章节                 | 对应                                                                                                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1 / §2 / §3               | PRD v2.0 §1.3（设计原则）+ §10.1（视觉语言）                                                                                                                                                                                     |
| §4.1 Risk Row              | PRD v2.0 §5.2 Obligations                                                                                                                                                                                                        |
| §4.2 Hero Metric           | PRD v2.0 §5.1.1 Layer 1 Deadline Radar                                                                                                                                                                                           |
| §4.3 Pulse Banner          | PRD v2.0 §5.1.4 + §6.3                                                                                                                                                                                                           |
| §4.4 Evidence Chip         | PRD v2.0 §5.5 Evidence Mode + §6.2 Glass-Box                                                                                                                                                                                     |
| §4.5 Command Palette       | PRD v2.0 §10.3 + §6.6 Ask                                                                                                                                                                                                        |
| §7 Risk Severity           | PRD v2.0 §5.1.2 三段颜色次级信号                                                                                                                                                                                                 |
| §8 Evidence & Provenance   | PRD v2.0 §6.2 + §5.5                                                                                                                                                                                                             |
| §2 / §3 / §5 tokens        | `docs/dev-file/05-Frontend-Architecture.md` §5                                                                                                                                                                                   |
| **Page-level application** | `docs/Design/page-family-canonical.md` — copy-paste-ready layout / PageHeader / FilterTrigger / table-card / FloatingActionBar shapes condensed from /today + /alerts + /deadlines. Apply when building any new list/index page. |

---

## 13. 变更纪律

1. **本文件是 UI 单一事实源**。组件实现和 PRD 描述如与本文件冲突，以本文件为准
2. **Token 改动 → 同步 PR**：必须同步更新 `tailwind.config.ts`、Storybook 主题、`app/manifest.ts` 的 `theme_color`
3. **新增颜色 → 先定义 semantic role**：禁止直接引用 hex 值到组件
4. **重大视觉改版** 走 RFC 流程，附 before/after 截图 + 对应 PRD 章节链接

---

## 14. Migration Copilot 向导（Demo Sprint）

> 来源：`../product-design/migration-copilot/09-design-system-deltas.md`
> 权威 token：`../../DESIGN.md` YAML `components:` 段；本节承担具体使用说明与可达性规格。
> 裁定 ADR：[`../adr/0011-migration-copilot-demo-sprint-scope.md`](../adr/0011-migration-copilot-demo-sprint-scope.md) Decision III
> 编号说明：本 section 排在已有 §9 ~ §13 之后，避免与现有编号冲突；子目录按 `14.x` 组织。

### 14.1 Stepper（4 步向导步骤条）

- **来源**：`../product-design/migration-copilot/02-ux-4step-wizard.md` §2.2 · `../product-design/migration-copilot/03-onboarding-agent.md` 首页 disabled 版本
- **Token（`../../DESIGN.md` 组件名）**：`stepper`

**规格**

- 4 步水平；整栏高 32px；每格之间间距 `{spacing.3}`（12px）
- 字号 `{typography.label}`（11px Inter 500 uppercase tracking 0.08em）
- 圆角 `{rounded.sm}`（4px，chip 级）
- 仅展示不可点击（防止跨步数据污染），步骤推进通过底栏 `[Back]` / `[Continue]` 完成

**状态色**

| 状态      | 前景色 `{colors.*}` | 背景色 `{colors.*}` | 图标 | 触发条件                                       |
| --------- | ------------------- | ------------------- | ---- | ---------------------------------------------- |
| current   | `accent-default`    | `accent-tint`       | —    | Step 当前焦点                                  |
| completed | `status-done`       | `surface-canvas`    | ✓    | Step 已 Continue 提交                          |
| upcoming  | `text-muted`        | `surface-canvas`    | —    | Step 尚未到达                                  |
| error     | `severity-critical` | `surface-canvas`    | !    | 当前 Step 校验失败（非阻塞 warnings 不走本态） |
| disabled  | `text-disabled`     | `surface-canvas`    | —    | Agent preview 卡片态 / Step 4 动画期间         |

**可达性**

- 容器 `role="navigation"` + `aria-label="Migration wizard step indicator"`
- 当前步骤文字额外带 `aria-current="step"`
- 步骤标签文字不截断（Tab key 不把 focus 落到 stepper，仅做视觉指示）

### 14.2 Confidence Badge（置信度徽章）

- **来源**：`../product-design/migration-copilot/02-ux-4step-wizard.md` §5 Step 2 Mapping + §6 Step 3 Normalize · `../product-design/migration-copilot/04-ai-prompts.md` §2.5 后处理输出
- **Token**：`confidence-badge`

**规格**

- 3 档：`high` (≥ 0.95) / `med` (0.80–0.94) / `low` (< 0.80)
- 形态：inline chip；高 18px；padding `0 6px`；圆角 `{rounded.sm}`
- 字号：`{typography.numeric}`（13px Geist Mono tabular-nums）
- 文案：`95%` / `87%` / `72%`（百分整数，不带小数）

**语义与色系（与 severity / status 解耦）**

| 档位 | 背景色                           | 文字色                    | 语义                             |
| ---- | -------------------------------- | ------------------------- | -------------------------------- |
| high | `{colors.accent-tint}`           | `{colors.accent-text}`    | 强先验命中 / Preset + EIN 全识别 |
| med  | `{colors.severity-neutral-tint}` | `{colors.text-secondary}` | 一般置信，可直接采纳             |
| low  | `{colors.severity-medium-tint}`  | `{colors.text-primary}`   | 需人工 review（非阻塞）          |

### 14.3 Toast（3 tone + 2 variant）

- **来源**：`../product-design/migration-copilot/02-ux-4step-wizard.md` §7.4 Step 4 导入成功 · `../product-design/migration-copilot/07-live-genesis.md` §2 动画收尾 · `../product-design/migration-copilot/08-migration-report-email.md`（Revert 链接同源 24h toast 文案）
- **Token**：`toast`

**规格**

- 形态：右下 stack；宽 360px；padding 12px；圆角 `{rounded.md}`
- 字号：`{typography.body}`
- 层级：Level 3（对齐 §6 Depth & Elevation）；`box-shadow: var(--shadow-subtle)`
- 关闭：右上 icon-only `×` + `Esc`（焦点在 toast 时）

**Tone × Variant 表**

| tone    | 背景                            | 文字                    | 用途                                                         |
| ------- | ------------------------------- | ----------------------- | ------------------------------------------------------------ |
| info    | `{colors.surface-elevated}`     | `{colors.text-primary}` | 一般信息（"Draft saved"）                                    |
| success | `{colors.surface-elevated}`     | `{colors.status-done}`  | 导入成功 / Revert 成功 / Undo 成功（绿文字 + 白背景 · flat） |
| warning | `{colors.severity-medium-tint}` | `{colors.text-primary}` | 数据质量类非阻塞提示（"3 rows skipped"、"Needs review"）     |

| variant    | timeoutMs                                        | 辅助 UI                                                 |
| ---------- | ------------------------------------------------ | ------------------------------------------------------- |
| default    | 3000（自动消失）；含 500ms undo 计时窗口         | 行内 `[Undo]` 按钮（对齐 §9 Do's 第 8 条 "500ms undo"） |
| persistent | null（不自动消失，直到 `revertible_until` 过期） | Migration Report toast：右下 sticky，24h 窗口           |

**权威裁定：Persistent toast 时钟源**

- **以服务端 `rpc.migration.apply` 返回的 `revertible_until` ISO-8601 字段为准**
- **前端只渲染、不本地倒计时**：toast 挂载 / 焦点返回时比较 `Date.now() < revertible_until` 决定是否显示
- 依据：ADR 0011 Decision III · 解决 Subagent B NEEDS REVIEW 4（时钟源分歧）；实现细节见 `../product-design/migration-copilot/09-design-system-deltas.md` §4.5

### 14.4 Genesis Odometer & Particles

- **来源**：`../product-design/migration-copilot/07-live-genesis.md` §3 粒子参数 + §4 Odometer + §5 `prefers-reduced-motion` 降级
- **Token**：`genesis-odometer` · `genesis-particle`

**Odometer 规格**

- 字号 / 行高 / 字距：`{typography.hero-metric}`（56px · Geist Mono 700 · letter-spacing -0.02em · fontFeature `'tnum'`）
- 色：`{colors.text-primary}`（navy）
- 缓动：`cubic-bezier(0.4, 0, 0.2, 1)`；每位数字独立 linear-interpolate；货币符 `$` 与千分位 `,` 固定不滚动
- 舞台与顶栏间距：`{spacing.12}`（避免粒子终点与卡片区挤压）
- 可达性：容器 `role="status"` + `aria-live="polite"`；结束广播 `"{formattedAmount} at risk this quarter"`（zh-CN 同源不同字符串 via Lingui）

**Particle 规格**

- 6px 圆（`arc(0, 0, 3, 0, 2π)`）
- 色 `{colors.accent-default}` + 10% alpha glow（`shadowBlur: 8`，`shadowColor` 同色）
- 运动：4 点三次贝塞尔 `[startPos, startPos + (0, -200), radarPos + (0, -100), radarPos]`
- 时间：1200–1800ms / 粒子；stagger 60ms；同屏上限 30 颗
- 载体：单一 `<canvas>`，`position: absolute`，`z-index: 50`，`pointer-events: none`

**`prefers-reduced-motion` 降级（对齐 §7.3 OVERDUE 闪烁同原则）**

- 触发：CSS media `prefers-reduced-motion: reduce` OR 运行时 5 帧 > 33ms OR URL `?reducedMotion=1`
- 行为：粒子不渲染；Odometer 一次性显示 final 值 + 200ms fade-in；总时长 ≤ 800ms
- 埋点：`migration.genesis.played { mode: 'reduced' }`

### 14.5 Email Shell

- **来源**：`../product-design/migration-copilot/08-migration-report-email.md` §3.2 HTML 模板 + §4 布局 token
- **Token**：`email-shell`

**规格**

- 宽度：640px（对齐 08 §3.2 HTML 模板 `<table width="640">`；Gmail / Outlook / Apple Mail 三端主流兼容宽度）
- 外层：`<table>` 布局（非 flex / grid；邮件生态兼容性要求）
- 背景：`{colors.surface-canvas}`；文字 `{colors.text-primary}`；正文 `{typography.body}`
- 数字（金额 / 日期 / EIN）：Geist Mono tabular-nums；hex 展开在 Worker 薄字典模板渲染时替换占位符（对齐 `../adr/0009-lingui-for-i18n.md` Worker 薄字典约束）
- 页脚（"Sent by DueDateHQ on behalf of {firm_name}" + Unsub）：`{typography.label}` + `{colors.text-muted}`

**hex 展开说明**

- YAML `{colors.*}` token 在 Worker Email Compose 阶段展开为 hex 字符串直接写入 `<table bgcolor="...">` / `<td style="color: #...">`（邮件客户端对 CSS 变量支持参差）
- 展开映射表见 `../product-design/migration-copilot/08-migration-report-email.md` §4

### 14.6 Keyboard

- **来源**：`../product-design/migration-copilot/01-mvp-and-journeys.md` §7 · `../product-design/migration-copilot/09-design-system-deltas.md` §9 Keyboard Rules
- **裁定依据**：ADR 0011 Decision III · 解决 Subagent B NEEDS REVIEW 1 / 2

**`A` 键（Step 3 Apply to all）**

- **本轮状态**：仅 Wizard Step 3 Suggested tax types cell 内使用，用于切换当前聚焦 cell 的 `Apply to all`
- **全局 `A`**：不注册；未来 Ask 快捷若占用 `A`，必须先迁移本局部快捷
- Checkbox label 必须声明 `aria-keyshortcuts="A"`，并消费 `components.checkbox-*` token

**`Enter` 键（Continue）**

- **生效位**：Wizard 底栏 `[Continue →]` 等价快捷
- **不生效位**：焦点在 `<textarea>`、`[contenteditable="true"]`、`<select>` 控件时（保留控件自身默认行为，例如 textarea 换行）
- **Step 4 动画期间**：Enter 不生效（对齐 §2.1 "动画中 Esc 失效"同原则）

**其他全局（沿用 §10.2 / §10.3 Responsive + 全局约定）**

- `?` 快捷键帮助浮层
- `Esc` 打开关闭确认（非 destructive；动画期间失效）
- `Cmd + K` 命令面板入口
- `Cmd + Shift + D` 暗色切换
- 数字键 `1` - `4` 在向导内**不跳步**

**Keyboard Shell 层级**

- App 只允许一个 keyboard shell：`apps/app/src/components/patterns/keyboard-shell`，基于 TanStack Hotkeys 注册全局、导航序列、route/list、overlay 四层快捷键
- 导航序列只给高频运营路径：`G then D/W/C/T` 分别进入 Dashboard / Obligations / Clients / Team workload；Rules / Practice profile / Billing / Audit 等一级页通过 Command Palette 进入
- `?` 帮助浮层从注册表生成，并追加 reserved slots；不得手写第二份静态快捷键表
- Wizard / Dialog / Command Palette 打开时压住导航序列和 Obligations 裸字母键
- **全局 `A` 不占用**；Step 3 仅在 Suggested tax types cell 焦点内注册局部 `A`

### 14.7 needs_review 用色语义（权威裁定）

这是本册的**硬裁定**（写入 ADR 0011 Decision III · 详见 `../product-design/migration-copilot/09-design-system-deltas.md` §3.4）：

| 场景                          | 色 token                   | 解释                                                                                                            |
| ----------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **数据质量类 `needs_review`** | `{colors.severity-medium}` | Mapper 低置信 / Normalizer 冲突 / Default Matrix 非种子辖区；属风险域 → 走 severity-medium 黄                   |
| **工作流态 Review**           | `{colors.status-review}`   | Obligations "Needs review" 状态列 / Client Detail review 抽屉；属状态域 → 走 status-review 紫（已在 §2.2 定义） |

**两者绝不混用**。依据：

- `{colors.status-review}` 已在本文件 §2.2 Light Mode 定义为工作流状态色（"Status = 工作流状态，Severity = 风险等级，两套 token 独立"的铁律，见 §7.2 第 4 条）
- Migration / Onboarding 阶段的"数据质量弱信号"属风险域 → 走 severity-medium，便于 CPA 在 Dry-Run 预览与 Dashboard 保持一致的视觉语言

---

## 15. Brand Mark — Clearing D

> 设计稿单一事实源：Figma 文件 `ssejugriUJkW9vbcBzmRgd`，frame `DueDateHQ — Brand Icon (Design Spec)`（node `98:2`）。
> 代码资产：`packages/ui/src/assets/brand/`。
> 同步纪律：Figma 文件可写时，所有修改应先动 `98:2`，再 `node.exportAsync({ format: 'SVG_STRING' })` 回灌；同时保持两个 app 的 public favicon 副本与 `brand-favicon.svg` 一致。

### 15.1 设计语义

把产品语义压成一个 fintech / accounting workbench 风格的 256×256 几何符号：

| 元素                    | 产品语义                                | 视觉                                             |
| ----------------------- | --------------------------------------- | ------------------------------------------------ |
| 圆角方块外壳            | fintech app / HQ 工作台                 | radius 54，深 midnight navy                      |
| 银色 `D` monogram       | DueDateHQ 产品识别                      | 大单形状，Cash App / Stripe 式小尺寸强识别       |
| D 内部 ledger ticks     | 会计账本 / source-backed working papers | brass 主 tick + 两条 muted silver 账本行         |
| Cyan deadline pulse dot | 截止日风险被命中                        | 单一高记忆信号色；与 Deadline Radar 语义保持关联 |
| Pulse halo（256 only）  | 风险提醒的可见度                        | 仅大尺寸保留；favicon 删除以避免小尺寸糊掉       |

刻意避开的（呼应 §0 / §2.4 / §9 禁用清单）：渐变、阴影（除 `--shadow-subtle`）、纯黑 dark 背景、绿色"OK"语义、emoji 装饰、泛用日历图标、`>12px` 圆角胶囊。

### 15.2 资产文件

| 文件                                                  | viewBox | Tile      | Accent    | 用在哪                                      |
| ----------------------------------------------------- | ------- | --------- | --------- | ------------------------------------------- |
| `packages/ui/src/assets/brand/brand-mark.svg`         | 256×256 | `#071421` | `#35D5FF` | OG image / 邮件 hero / ≥ 64 px 大露出       |
| `packages/ui/src/assets/brand/brand-favicon.svg`      | 32×32   | `#071421` | `#35D5FF` | Browser favicon / ≤ 32 px 内嵌品牌（light） |
| `packages/ui/src/assets/brand/brand-favicon-dark.svg` | 32×32   | `#08111F` | `#55DEFF` | ≤ 32 px 内嵌品牌（dark）                    |

完整版（256）含 pulse halo；favicon 简化版删除 halo，保留 tile + `D` + ledger ticks + dot。颜色是 brand asset 内部硬编码，不作为通用 UI token 暴露；UI 状态仍使用 §2.2 / §2.3 的 semantic tokens，**不**把 cyan / brass 扩散到业务组件里。

### 15.3 主题策略

| Surface                            | 跟随主题？ | 实现                                                                            |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `<link rel="icon">` favicon        | 否         | 仅 ship light 一份；浏览器 tab 不跟 app 主题，navy tile 在所有 tab 背景下都可读 |
| 内嵌 `<img>`（app / marketing UI） | 是         | 双 `<img>` + Tailwind `dark:hidden` / `hidden dark:block`；零 JS、零水化抖动    |

### 15.4 当前使用点（截至 Clearing D rollout）

| 位置                                                                | Figma 节点        | 代码                                          |
| ------------------------------------------------------------------- | ----------------- | --------------------------------------------- |
| Landing TopNav brand row                                            | `5:4`             | `apps/marketing/src/components/TopNav.astro`  |
| Landing Footer brand block                                          | `30:24`           | `apps/marketing/src/components/Footer.astro`  |
| App Sign In `/login` + Onboarding `/onboarding` 共享 header         | `113:2` + `119:4` | `apps/app/src/routes/_entry-layout.tsx`       |
| `apps/marketing/public/favicon.svg` + `apps/app/public/favicon.svg` | —                 | 镜像 `brand-favicon.svg`（per-app emit 约束） |

**禁止使用点**（避免品牌 vs 租户语义错位）：

- AppShell sidebar practice identity（`147:3`）— 是租户身份槽，使用 `firm.monogram`
- Route header（`Q1 2026 / Dashboard` 等）— 路由头不是品牌头
- Row-level / button 内 — 与品牌识别无关

---

## 16. Canonical patterns (post-v1.0)

The 84/85 polish passes formalized cross-surface rules that v1.0 didn't
specify. Each rule lives in a dedicated spec doc (see v2.0 changelog
table at the top); this section is the **adoption-time cheat sheet**.
Reach for the spec doc when you need the full rationale; reach for this
section when you need the rule in one line.

### §16.1 PageHeader (canonical: `apps/app/src/components/patterns/page-header.tsx`)

**Shape:**

- Row 1 (eyebrow) — full header width. Breadcrumb left, optional
  `eyebrowAside` far right. Examples: `< Clients` + `1 / 9` cycler on
  `/clients/[id]`.
- Row 2 — title block left (`<h1>` + optional description), actions
  cluster far right. `lg:flex-row lg:items-end lg:justify-between`.
- Title H1: `text-2xl leading-7 font-semibold text-text-primary` +
  `min-w-0` so it can truncate when a right drawer narrows the column.
- Actions cluster: no `flex-wrap` — single row at lg+, content
  overflow-clips rather than wrapping into a 2nd row.

**Use it on every protected route.** AppShell stopped rendering a
route header strip; the route owns its own header. Drift from this
shape (e.g. custom h1 + breadcrumb-as-text) is automatic P1 in the
audit.

### §16.2 Workbench table chrome

Cross-table canonical rules (the unified vocabulary in
`unified-table-surface-vocabulary.md`):

| Aspect              | Canonical                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrapper             | `rounded-md border border-divider-subtle overflow-hidden`                                                                                                                                                         |
| Row height          | `h-14` (every workbench table)                                                                                                                                                                                    |
| TableBody bg        | `bg-background-default/50` (alpha-50 white — _do not remove_)                                                                                                                                                     |
| TableHeader bg      | Primitive default (`bg-background-subtle`) — DO NOT override with `bg-background-default-dimmed` (the dimmed token is `rgb(... / 0.4)` — alpha-tinted, bleeds through when content scrolls behind sticky headers) |
| Within-row border   | Primitive `border-b border-divider-subtle`. Weld (`border-b-0`) only when surface owns a logical sub-group (currently `/deadlines` same-client cluster)                                                           |
| Primary title style | `text-base` regular weight, `text-text-primary`, hover-underline as row-affordance cue                                                                                                                            |
| Late text           | `text-sm font-semibold`, verbose "N days late" (no shorthand)                                                                                                                                                     |
| Click-to-detail     | Drawer (queue triage) · Route (sustained work) · Modal (reference) — destination follows task model                                                                                                               |
| Footer pagination   | `px-2 py-6`, prev/next + page count, in the bottom toolbar zone                                                                                                                                                   |
| Search affordance   | Collapsible ghost icon → input on click or `/` hotkey (`*SearchControl` per surface)                                                                                                                              |

Adopted by `/deadlines`, `/clients`, `/rules/library`. Any new
table-of-rows surface (e.g. `/audit`, `/workload`, `/notifications`)
should match.

### §16.3 Tabs vs segmented control

| Pattern                 | When to use                                                                                 | Examples                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Tabs (line variant)** | "Different sections of the SAME entity" — each tab shows different CONTENT                  | `/clients/[id]` Work / Client info / Opportunities / Activity; deadline drawer Summary / Materials / Extension / Evidence |
| **Segmented control**   | "Different views / filtered scopes of the SAME data" — each option re-filters the same list | `/deadlines` top scope tabs (Today / This week / Late / All); rule library segmented toggle                               |

**Drawer tab styling** (canonical for `/deadlines` obligation drawer):

- TabsList: `flex h-11 w-full justify-start gap-6 border-b border-divider-subtle bg-background-default text-sm`
- TabsTrigger: `!flex-none !px-0 rounded-t text-text-secondary data-active:text-text-primary data-active:font-semibold after:!bg-accent-default`
- Active underline at primitive default (`bottom-[-5px]`) — floats ~5px below trigger for 15-16px breathing room from text descender. **Do NOT pull to `after:!bottom-0`** — that crushed the descender clearance to ~9px.
- Inactive text `text-text-secondary`; active text `text-text-primary` + semibold (biggest contrast jump).
- Underline color is brand accent (`accent-default`), not text-active-black.

### §16.4 Drawer / sheet canonical

Single shared shape across `ObligationDrawer`, `PulseDetailDrawer`,
`ClientDetailDrawer`:

1. **Sticky header strip** at the body top — `sticky top-0 z-20 -mx-8 border-b border-divider-subtle bg-background-default px-8 py-3`. Holds the 3-up date strip / identity strip. Stays visible during body scroll.
2. **Tab bar** (see §16.3) — sits **outside** the sticky strip so it scrolls with the body. `pt-3` above tabs gives 20px buffer from the sticky strip; `mt-0` on TabsContent keeps the gap below tight (`gap-2` from Tabs root only).
3. **Body content** — `px-8 pt-0 pb-24` (pb-24 = sticky-footer overlap buffer). At panel mode, `flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]`.
4. **Sticky footer** — `sticky bottom-0 mt-auto flex min-h-16 flex-wrap items-center justify-between gap-2 bg-background-default px-8 pt-4 pb-6`. **Asymmetric vertical padding** (16/24) is the canonical rhythm — top tight, bottom breathes.

**Active stage card** (Summary tab body): `rounded-lg bg-background-section p-4`. **No outer ring.** The bg tint anchors the "deep-dive zone"; do not stack a border on top.

**Inner Key-dates panel** (inside the active stage card): no chrome (no ring, no bg, no padding wrapper) — uppercase tag + dl rows only. The parent's tint provides the envelope. Avoids chrome-on-chrome.

### §16.5 Sticky footer (universal)

Every sticky drawer/sheet footer uses the asymmetric `pt-4 pb-6` rhythm. Set in three places — keep mirrored:

- `SheetFooter` primitive: `mt-auto flex flex-col gap-2 px-6 pt-4 pb-6`
- Obligation drawer panel-mode footer: `... bg-background-default px-8 pt-4 pb-6`
- Pulse drawer SheetFooter override: `... bg-background-default px-12 pt-4 pb-6`

### §16.6 Sidebar collapsed-mode parity

App-shell header is hard-locked to `h-[72px] justify-center` regardless of mode. SidebarMenu, SidebarContent share gap-4 in both modes (no special collapsed override). SidebarMenuButton uses `overflow-visible` in collapsed mode so the badge dot can overhang at `-top-0.5 -right-0.5` (h-3.5 pill).

### §16.7 Owner / assignee avatar

Single helper: `getAssigneeTint(name)` from `apps/app/src/lib/assignee-tint.ts`. Canonical render is `size-8` (32px) round chip with `text-sm font-semibold uppercase` initials. Same person, same tint, on every surface. `isMine` overrides with accent palette.

### §16.8 Count / state chips

`CountDotChip` primitive (`apps/app/src/components/primitives/count-dot-chip.tsx`) is the canonical state-row review-count chip. Use it for rule-library section header counts and any "tone + N" inline indicator.

Tab-badge count (e.g. Materials `14`, Evidence `0`): `inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-state-accent-hover-alt px-1 text-caption-xs font-medium leading-none tabular-nums text-text-accent`. Subtler than a destructive red — communicates magnitude without alarm.

### §16.9 Active dot + hover-expand (rules library)

Active section rows (non-selectable status groups in `/rules/library`) render a leading tone dot at the checkbox X-position. Pattern:

- Outer flex `items-center` (not `items-start` — kills baseline drift)
- Dot: `size-1.5 rounded-full`, color per `STATUS_TONE` (gray for active/verified to avoid clashing with entity-status green elsewhere in the row)
- On row hover (`group-hover/row:inline`), reveal `STATUS_LABEL_SHORT[status]` text next to the dot. The dot "expands" into a word — maps to the user's mental model.

### §16.10 Filter affordance (filter-vs-badge contract)

| Cardinality                                            | Primitive                            | Surface                        |
| ------------------------------------------------------ | ------------------------------------ | ------------------------------ |
| Low fixed-vocab (3-8 options), PRIMARY navigation axis | `EntityChipRow`-style chip strip     | `/rules/library` entity chips  |
| Multi filters coexisting on the same toolbar row       | `TableHeaderMultiFilter` (`toolbar`) | `/clients`, `/deadlines`       |
| Triage shortcut chips (one-click "show me only X")     | `FilterTrigger` action chip strip    | `/deadlines` action-chip strip |

**Rule**: one chip strip per page max (the primary axis). When multiple filters coexist, they all render as `TableHeaderMultiFilter` for visual coherence — mixing a chip row with dropdowns in the same row reads as two competing affordance models. `FilterTrigger` gained a `leadingIcon` prop for icon-led triggers (e.g. `ArrowUpDownIcon` on the Group-by control).

### §16.11 Group-by section headers

`/deadlines` Group-by control (Due date / Client) renders section headers between row groups. Sticky `bg-background-subtle` band, count chip per group, late-count chip when the group has overdue rows. Pattern is portable to any grouped table — if you add a Group-by axis to another surface, follow this shape.

### §16.12 Status pill tone ladder (full spec: `status-pill-audit-2026-05-25.md`)

Tone → semantic, never re-defined per surface:

- `success` (green) — done / on track
- `warning` (amber) — at risk / needs attention
- `destructive` (red) — late / blocked / error (sparingly)
- `accent` (purple) — review / in-progress
- `muted` (gray) — default / not-yet-started / archived

Shape → category:

- **Filled** (`bg-state-X-solid text-text-inverted`) — currently active / live state
- **Outline** (`border-state-X-border bg-state-X-hover text-text-X`) — informational / passive label
- **Soft** (`bg-state-X-hover text-text-X`, no border) — quiet tag in dense rows

Ornament rule: dot ONLY when the chip lives in a dense row where the word alone is hard to scan. Otherwise word + tone color is enough.

### §16.13 Info icon vs InfoBanner

- **Info icon** (`<CircleHelpIcon>` in popover) — quick definition / formula. Reserve for terms the user might not know.
- **InfoBanner** (`apps/app/src/components/patterns/info-banner.tsx`) — page-level tip with optional CTA + per-key dismissal. Reserve for "the page is in a non-default state and here's how to fix it" (e.g., `/clients/[id]` needs-facts CTA).

Spec doc enumerates which mounts dropped the redundant popover and which gained an InfoBanner.

### §16.14 Floating action bar

`apps/app/src/components/patterns/floating-action-bar.tsx`:
`fixed bottom-12 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl border border-divider-regular bg-background-default px-5 py-3 text-text-primary shadow-[0_20px_48px_-16px_rgb(0_0_0_/_0.18)]`.

Currently used by `/rules/library` bulk-review (replaced earlier beige warning bar) and the obligation drawer materials-checklist multi-select. Floating pill at 48px from bottom; never docked.

### §16.15 InfoBanner (page-level tip + CTA)

`apps/app/src/components/patterns/info-banner.tsx`. Renders an inline tip card with optional CTA button and dismissKey (per-user, per-key dismissal). Used on `/clients/[id]` for needs-facts CTA, on `/deadlines` for system-state announcements. Replaces the older red-tinted "missing X" hero bars.

### §16.16 Page layout shell

Per-route shell shape (after `clients.$clientId.tsx` reference):

```
<div className={cn(
  'flex w-full flex-col gap-4 px-4 pt-6 pb-0 md:px-6 md:pt-8 md:pb-0',
  'xl:h-screen xl:overflow-hidden',
)}>
```

- `w-full` (no `mx-auto max-w-page-wide` cap — the 1100px cap was the cause of header-column-narrowing bugs on `/clients/[id]`)
- xl: locked viewport height + own scroll. Below xl: natural content-driven scroll.

### §16.17 TabSection primitive

`apps/app/src/components/patterns/tab-section.tsx` — canonical section header inside tab bodies. Single source of truth for `eyebrow + h2 + actions slot` rhythm. All `/clients/[id]` tab bodies use it; new tab bodies elsewhere should match.

Usage example: see `/clients/[id]` Work tab in `ClientFactsWorkspace.tsx` — `<TabSection eyebrow="…" title="…" actions={…}>{children}</TabSection>`. The eyebrow slot accepts ReactNode, the title is bold h2 scale, the actions slot is the same h2-actions cluster pattern as PageHeader.

### §16.18 `font-mono` carve-outs (enforcement clarification)

The general rule (§3 Typography, §3.4 数字铁律) reserves `font-mono` for kbd hints. In practice the canonical recognizes a small set of legitimate technical-string contexts that also warrant mono:

| Legitimate `font-mono` context   | Example sites                                                                                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kbd hint primitive               | `packages/ui/src/components/ui/kbd.tsx`, `ShortcutHelpDialog` kbd spans                                                                                                                      |
| Dev-panel / debug IDs            | `audit-log-table` actorId, `generation-preview-tab` rule IDs, `rule-detail-drawer` scope strings, `sources-tab` source.id                                                                    |
| URL / email / token inputs       | Calendar URL input, OTP email confirmation, security tokens, `TimezoneSelect` zone id                                                                                                        |
| State codes in fixed-width grids | `state-rule-activation-selector` picker (2-letter codes in size-7 cells), `JurisdictionCode` primitive, `ClientFactsWorkspace` state badges, `CreateObligationDialog.normalizedJurisdiction` |
| Audit log timestamps             | `EvidenceDrawerProvider` event meta, `audit-log-table` timestamp cell                                                                                                                        |
| Migration wizard import paths    | `Step1Intake` / `Step3Normalize` / `Step4Preview` / `WizardShell` / `ImportHistoryDrawer`                                                                                                    |

**Everywhere else, drop `font-mono`** and use `tabular-nums` alone if numeric alignment is the goal. Combining `font-mono` + `tabular-nums` on numeric content is redundant — `tabular-nums` already makes digits 0-9 equal-width, and the mono font shifts the overall typographic feel toward "developer dashboard."

- **Don't:** `<span className="font-mono tabular-nums">{count}</span>`
- **Do:** `<span className="tabular-nums">{count}</span>`

Verification: `grep -rn "font-mono tabular-nums" apps/app/src --include='*.tsx' | grep -v opportunities` should return 0 outside the carve-outs above. 86th pass batches 6-9 (commits `d9014131`, `aa63776b`, `28fdc874`, `461a2e52`) swept 69 sites; current `font-mono` total is 104, all categorically legitimate per the table above.

### §16.19 Spacing-scale enforcement

§5.1 establishes the 4px-base spacing scale. **Canonical flex/grid `gap-*` values are `gap-2 / gap-3 / gap-4 / gap-6` only.**

| Forbidden      | Use instead                                                           | Why                                                               |
| -------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `gap-5` (20px) | `gap-4` (16px) for tight bodies; `gap-6` (24px) for section breathing | Sits between the tight and loose breakpoints and reads as neither |
| `gap-7` (28px) | `gap-6`                                                               | Not on the canonical scale                                        |
| `gap-8` (32px) | `gap-6` for page-level shells; `gap-4` for inner blocks               | Page-shell section gaps use `gap-6`; `gap-8` reads too loose      |

**When to pick gap-4 vs gap-6:**

- **`gap-4` (16px)** — drawer/dialog body sections, form fields, card content, tight related items
- **`gap-6` (24px)** — page-level shell, section-to-section breathing room, distinct card-to-card spacing

86th pass batch 5 (commit `f3bb3010`) swept 17 `gap-5` sites across 12 files. The sweep should remain at zero. Verification: `grep -rnE "\bgap-(5|7|8)\b" apps/app/src --include='*.tsx' | grep -v opportunities | grep -v "// "` should return 0.

### §16.20 Date display canonical

Two helpers in `apps/app/src/lib/utils.ts`:

| Helper                                        | Returns                                        | Use for                                                                                            |
| --------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `formatDate(value)`                           | ISO `YYYY-MM-DD`                               | Sort attributes, `data-*` props, audit-log meta, CSV exports — **machine consumption**             |
| `formatDatePretty(value, { alwaysShowYear })` | Prose: "May 6, 2026" (or "May 6" current year) | **Any human-facing date the user reads** — drawer body, banners, key-dates panel, inline sentences |

**Carve-outs that retain `formatDate` (ISO) for user-facing display:**

- `/deadlines` queue row date column — high-density tabular scan beats prose
- `PathToFilingSummary` milestone strip stamps (`text-[9px]`) — dense column needs ISO compactness
- Audit log timestamps — precision wins over prose (canonical "audit-log meta" exception)
- Internal computation: `startIso`, `endIso`, `today`, `daysBetween` arguments

86th pass batch 3 (commit `2198f9df`) swept 14 sites in `obligations.tsx` drawer body to `formatDatePretty`. Pattern: **drawer body / banner / inline sentences → prose; dense queue/strip/audit-log → ISO.**

- **Don't:** Render `iso.slice(0, 10)` directly to the UI (returns "2026-05-09" instead of "May 9, 2026").
- **Do:** Pass through `formatDate()` (machine) or `formatDatePretty()` (human) per canonical above.

`formatDateTimeWithTimezone(iso, tz)` is the canonical for timestamps that need precision (e.g. "Last updated 2026-05-01 02:27:00 PDT"). Used in drawer footer audit lines and the audit-log table; not for body content.

---

_This document is a single source of truth. If in doubt, choose density over decoration, precision over friendliness._
