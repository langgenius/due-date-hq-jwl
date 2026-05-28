# Design Language Synthesis — 2026-05-28

> 沉淀自 2026-05 audit drain（clients critique 27 + dashboard actions brief + cross-route
> consistency matrix + status pill audit + UI audit）的设计风格归档。
> 这是一份**横向**文档 — 跨页面、跨组件的共识，不是某一页的 critique。
>
> 配套阅读：
> - `cross-route-consistency-matrix.md` — 6 个跨路由一致性条目的清单
> - `clients-critique-2026-05-27-audit-pass.md` — 最近一次 audit 的详细条目
> - `status-pill-audit-2026-05-25.md` — 状态视觉的全量审计
> - `ui-audit-2026-05-25.md` — UI 层的清单式审计
> - `design-system-drift-audit-2026-05-26.md` — token / drift 审计

---

## 目录

0. [设计哲学（产品定位决定风格）](#0-设计哲学产品定位决定风格)
1. [字号层级](#1-字号层级type-scale)
2. [间距与密度](#2-间距与密度spacing-scale)
3. [宽度与版心](#3-宽度与版心page-width)
4. [颜色 / 状态 token 语义](#4-颜色--状态-token-语义)
5. [组件词典（shared primitives）](#5-组件词典shared-primitives)
6. [交互模式](#6-交互模式interaction-patterns)
7. [AI 可见性约定](#7-ai-可见性约定)
8. [Status visualization（6 状态生命周期）](#8-status-visualization6-状态生命周期)
9. [网格 vs Flex 决策](#9-网格-vs-flex-决策)
10. [i18n 纪律](#10-i18n-纪律)
11. [工程模式（支撑设计的地基）](#11-工程模式支撑设计的地基)
12. [Anti-patterns（明确禁止）](#12-anti-patterns明确禁止)
13. [决策框架速查](#13-决策框架速查)
14. [一句话风格定义](#14-一句话风格定义)

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

## 1. 字号层级（type scale）

| 层级 | 用途 | class |
|---|---|---|
| **section h2** | 区段标题（如 "Needs attention"） | `text-base font-medium` 起 |
| **卡片标题** | alert title、客户名 | `text-sm font-medium leading-snug` |
| **body** | 段落 | `text-sm font-normal` |
| **meta / eyebrow** | source 标签、状态描述 | `text-xs text-text-tertiary` |
| **数字** | 计数、金额、日期 | `tabular-nums` |
| **空状态文案** | "No matching..." | `text-sm text-text-tertiary` |

**演化记录**

- 卡片标题最初是 `text-md font-medium` — Yuqi flag "在读 hero 感"，因为它和 section h2 同级
- 改成 `text-sm font-normal` 后，又出现 hover 时视觉变重 → 显式锁 `font-normal`（subpixel anti-aliasing 在 bg 变化时会让 400 字重看起来变 500）
- meta 一度是 `text-base` → 压到 `text-xs`：meta 不是 body
- chip 文字一度是 `text-base` → 压到 `text-xs`：chip 是凝缩信息块

**铁律**：标题不许超过 `font-medium`。`font-semibold` 留给 PageHeader 这种页面级标题。

---

## 2. 间距与密度（spacing scale）

通过的"GitHub-density pass"明确：

| 旧 | 新 | 用途 |
|---|---|---|
| `p-3.5` | `p-3` | 卡片内边距 |
| `gap-2.5` | `gap-2` | 卡片内元素间距 |
| `min-h-10` | `min-h-8` | 标题块固定高度（保持等高卡片） |
| `gap-3` | `gap-2` | chip 横向间距用 `gap-1.5` |

**原则**：外层 section padding 收紧时，内层卡片必须同步收紧，否则节奏断裂。

**等高卡片技巧**：标题块用 `min-h-8 line-clamp-2`，即使一卡片标题只有一行，整排卡片高度依然对齐。

---

## 3. 宽度与版心（page width）

| token | 像素 | 用途 |
|---|---|---|
| `max-w-page-narrow` | 880 | 表单、详情面板 |
| `max-w-page-medium` | 920 | 文档式页面 |
| `max-w-page-wide` | 1100 | 旧版列表（已弃） |
| `max-w-page-expanded` | **1440** | **当前所有 list / dashboard 标准** |

**演化**：`/today` 一度 `max-w-page-wide` → 用户 flag "一打开就是这个"（屏幕一半空白）→ 统一到 `max-w-page-expanded`，和 `/clients`、`/deadlines`、`/rules/library` 对齐。

**铁律**：跨页面宽度必须一致。打开 `/today` 后切到 `/clients`，版心位置不能跳。

---

## 4. 颜色 / 状态 token 语义

DueDateHQ 的 token 命名是**语义化的**，不是颜色名。

| token | 含义 | **绝不**用于 |
|---|---|---|
| `text-text-primary` | 主文本 | hover 不要直接把 secondary 升级到这里 |
| `text-text-secondary` | 次文本（chip 文字、meta） | 主标题 |
| `text-text-tertiary` | 弱化文本（eyebrow、占位） | 任何关键信息 |
| `bg-background-default` | 卡片底色 | section 底色 |
| `bg-background-default-hover` | 卡片 hover 底色 | rest 态 |
| `bg-background-subtle` | chip 底色、section tinted bg | 卡片底色 |
| `border-divider-subtle` | chip 边框、表格分隔 | 卡片边框 |
| `border-divider-regular` | 卡片边框 | chip |
| `state-accent-solid` | AI 蓝（Astroid 图标） | 表示"成功" |
| `state-accent-active-alt` | focus ring | 文本色 |
| `variant="destructive"` | **红 = 错误** | **绝不**表示"AI 标记"或"重要" |

**关键教训**：审计中有把 `variant="destructive"` 当作"AI 标注"用的实例 — Yuqi 立刻退回："destructive 是错误，不是 AI"。语义必须忠于命名。

---

## 5. 组件词典（shared primitives）

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

**演化**：详情页一度用 uppercase tracked `CLIENTS` eyebrow — Yuqi flag "看不出可点"。Breadcrumb 加 back-link variant 后，详情页直接 `breadcrumbs={[{ label: t\`Clients\`, to: '/clients' }]}`，不再手撸 Link。

### Astroid（AI 图标）

所有 AI provenance 只用 Astroid。Atom、Sparkle、Brain、Wand 全部 ban。`PulseAlertCard`、`PulseDetailDrawer`、`LowConfidenceBadge`、`NeedsAttentionCard` 全部一致。

### Chip pill 框架

```tsx
inline-flex h-7 items-center gap-1.5 rounded-full
border border-divider-regular bg-background-default
px-3 text-xs tabular-nums text-text-secondary
```

状态 chip、负责人 chip、实体类型 chip 并排出现时必须同框架。一个缺 border 就出戏。

---

## 6. 交互模式（interaction patterns）

### Hover 反馈层级

| 强度 | class | 用途 |
|---|---|---|
| L1（最弱） | `hover:text-text-primary` | 纯文本链接 |
| L2 | `hover:bg-state-base-hover-alt` | tab trigger、小按钮 |
| L3 | `hover:bg-background-default-hover` | 卡片整体 |
| 加成 | `group-hover:translate-x-1` chevron | 卡片上的"前往"提示 |

**铁律**：tinted section bg 上的卡片，**只改 border 是无效的** — 必须同时改 fill。Yuqi flag："hover 没感觉" 几乎都是这个原因。

### 点击目标

- **整张卡片可点**：用 `<button type="button">` 不是嵌套 Link。`aria-label` 必须包含具体内容（`Open Pulse alert details: ${alert.title}`）。
- **没有单独 "Review" 按钮**：scan-and-act 模式里冗余按钮是噪声。
- **Focus ring**：`focus-visible:ring-2 focus-visible:ring-state-accent-active-alt`，键盘可达。

### Drawer vs Route 决策

| 场景 | 选 | 原因 |
|---|---|---|
| 1-3 min review，列表驱动 | **drawer 就地** | 不丢上下文 |
| 长篇调查，深度操作 | route 跳转 | 需要完整工作区 |
| "View all N more" | **route** | 用户主动要全量 |
| 单 alert 点击 | **drawer** | 在 Today 里横扫 |

Pulse alert、obligation peek、client peek 三个 drawer **共用相同的开法**（`usePulseDrawer().openDrawer` 等），跨 surface 一致。

### Overflow tile（"+ N more"）

**不能**像 sibling 卡片。删掉 border、bg，只留 chevron + label，告诉视觉系统"我是导航不是内容"。一度做成完整 card 框架 → 用户当作另一个 alert 去点。

---

## 7. AI 可见性约定

AI 在产品里**到处都是**，CPA 必须能识别 "AI 在哪儿动过"：

1. **provenance icon**：只用 Astroid（不是 Atom，不是 Sparkle）
2. **置信度阈值**：`isLowAiConfidence(confidence < 0.5)`，dashboard / drawer / 列表全部用同一个 helper
3. **低置信徽章**：`<LowConfidenceBadge />`，所有触发点用同一组件
4. **tone**：`pulseAlertTone(alert)` 是唯一来源 — 不许各 surface 自己算（dashboard 一度按 impact-count 算 tone，drawer 按 confidence 算，同一 alert 卡片绿 drawer 红）

**铁律**：AI 视觉只能有**一种**呈现。出现第二种就 ban 一种，不要并存。

---

## 8. Status visualization（6 状态生命周期）

旧的 8 状态 → 目标 6 状态（`not_started / waiting_on_client / blocked / in_review / filed / completed`）。

呈现模式：**StateBadge（SVG）+ 状态名 + JurisdictionCode + pill frame**，例如：

```
[●] In Review · MA
```

详情页 header 必须有这个组合 — 单独 "MA" 不够，"In Review" 没颜色也不够。

每个状态对应一个 **milestone-notes 模式** — 这是 product model 文档定义的，UI 不能自己发明状态。

---

## 9. 网格 vs Flex 决策

| 场景 | 选 | 为什么 |
|---|---|---|
| 等宽列、列数确定 | **grid** | 列宽确定 = 网格 |
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

## 10. i18n 纪律

### `plural()` 不 concat `"s"`

```ts
// BAD — 中文 / 俄语 / 阿拉伯语全废
`View ${count} more alert${count === 1 ? '' : 's'}`

// GOOD
i18n._(plural(count, {
  one: 'View # more Pulse alert',
  other: 'View # more Pulse alerts',
}))
```

### zh-CN msgstr 必须真翻译

不能 copy msgid 进 msgstr 装作翻译过。Lingui strict mode CI 会 catch missing，但 catch 不到 mislabeling — 这是更糟的错误。

### CI 卫生

Lingui strict = 0 missing 才能 ship。每次新增 `<Trans>` 或 `t\`...\`` 都必须在 zh-CN 加真翻译。

---

## 11. 工程模式（支撑设计的地基）

| 模式 | 实例 | 为什么 |
|---|---|---|
| **No N+1** | `pulse.getDetailsBatch` 50 RPC → 1 | dashboard 渲染速度直接决定 scan-and-act 是否成立 |
| **canonical hook** | `useClientNextDue` 给 3 个 peek surface | 数据口径必须统一 |
| **exactOptionalPropertyTypes** | 条件 spread optional props | 类型严格 = 重构安全 |
| **inline rationale 注释** | `2026-05-25 (Yuqi #N): ...` | 设计决策的"为什么"必须留在代码里 |
| **dev-log per commit** | `docs/dev-log/...` | 一行 git log 不够 |
| **design doc per change** | `docs/Design/*.md` | UX 改动必须更新 canonical 文档 |
| **single PR** | cherry-pick 而非并行 PR | review 集中、merge 一次 |

---

## 12. Anti-patterns（明确禁止）

1. ❌ **多种 AI 图标共存**（Atom + Astroid + Sparkle）→ 只用 Astroid
2. ❌ **不同页面用不同置信度阈值** → `isLowAiConfidence(0.5)` 唯一
3. ❌ **`variant="destructive"` 当作 "AI 标记"** → red = error，仅此一种语义
4. ❌ **只改 border 不改 fill 的 hover** → 在 tinted section 上看不见
5. ❌ **嵌套 Link 在 button 里** → 整张卡片用单一 `<button>`
6. ❌ **Overflow tile 长得像 sibling 卡片** → 剥 chrome，让它读作"导航"
7. ❌ **uppercase tracked eyebrow 当 back link** → 用 Breadcrumb back-link variant
8. ❌ **跨页面宽度不一致** → 都用 `max-w-page-expanded`
9. ❌ **flex-wrap 当作 grid 用** → 列宽确定就用 `grid-cols-N`
10. ❌ **同一 alert 在卡片 / drawer / 列表呈现不同 tone** → 一个 helper
11. ❌ **手撸 `${n}${n===1?'':'s'}`** → `plural()` 必经
12. ❌ **msgstr 用 msgid 内容** → 真翻译，不然就别加 zh-CN
13. ❌ **5000+ 行 monolith** → 单一职责，2000 行为软上限

---

## 13. 决策框架速查

| 问题 | 答案 |
|---|---|
| 这是 chip 还是 badge？ | 有边框 + 内容多元（图标+文字）= chip；单一信号 = badge |
| Drawer 还是 route？ | 1-3 min 任务 = drawer；长任务或要全量 = route |
| Hover 只改 border 行不行？ | 不行，必须加 bg 变化 |
| 这里能加 `font-semibold` 吗？ | 只有 PageHeader 级别 |
| 这个新颜色加在 globals.css 还是直接 hex？ | globals.css 加语义 token，不能 hex |
| 用 useQuery 数组（N+1）还是写 batch RPC？ | > 5 个就批 |
| 这个状态视觉只有 SVG 够吗？ | 不够，要 StateBadge + 文字 + pill 三件套 |
| 加新 `<Trans>` 要不要管 zh-CN？ | 必须立刻补，CI 会挂 |
| 这个改动要不要更新 design doc？ | 任何能被截图证明的改动都要 |

---

## 14. 一句话风格定义

> **密度紧、节奏匀、组件共用、语义忠诚、AI 痕迹一眼可辨；每个像素都为 "CPA 一天 8 小时盯着" 而非 "首次访问的 wow" 服务。**

---

## 附录：演化时间线（摘要）

- **2026-05-21**：obligation drawer UX audit — 确立 drawer-in-place 模式
- **2026-05-22**：clients list & detail critique — 启动跨页面一致性
- **2026-05-23**：deadline status meaning audit — 状态语义从 8 → 6
- **2026-05-25**：UI audit + status pill audit + info icon audit — 拉齐 chip / badge / icon 词汇
- **2026-05-26**：design system drift audit + cross-route consistency matrix — 沉淀跨路由清单
- **2026-05-27**：clients critique audit pass（P0-P3 全清单 drain）
- **2026-05-28**：dashboard actions brief + 本文（design language synthesis）

每一份 audit 都解决了一组具体问题，本文是把它们抽离成**风格规则**，下一轮 audit 直接对照即可。
