# DueDateHQ — 品牌与设计系统

中文版 · **[English →](brand-book.md)**

把品牌识别(logo、颜色、字体、语气)和落地的设计系统(token、primitive、表面)写在一处的
**参考文档**——不是事实源头,事实源头是代码:

- Token → `packages/ui/src/styles/tokens/{primitives,semantic-light,semantic-dark}.css`
- 工具类映射 → `packages/ui/src/styles/preset.css`(`@theme inline`)
- 产品准则 → `docs/Design/DueDateHQ-DESIGN.md`(canonical;§4.11 = primitive 强制索引)
- 在线样例 → `/preview`

代码和本文冲突时,以代码为准,并回头修本文。

---

## 0 · 品牌一览

DueDateHQ 是面向 **CPA 事务所的截止日 / 义务指挥中心**——监测监管来源,在规则和日期变化时发出
提醒,并把每一项客户义务从 _未开始 → 已申报 → 已完成_ 一路带过去。

**调性:** 精确 · 冷静 · 以金额为先(dollar-aware) · 玻璃盒(可追溯) · 键盘优先。
**血统:** Ramp × Linear 的浅色工作台——_不是_ Notion 的温软,_不是_ Stripe 的渐变,_不是_
Bloomberg 的霓虹。

### 两层颜色模型(先读这一段)

系统刻意跑**两套色板**。把它们混为一谈,是最常见的错误。

| 层           | 用在哪                        | 锚定色                                                                             | 职责                          |
| ------------ | ----------------------------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| **品牌识别** | logo、favicon、登录外壳、营销 | navy `#0A2540` · ivory `#F3EEE6` · serif                                           | 我们是谁。固定,不随主题变。   |
| **产品 UI**  | 工作应用(每个路由)            | navy `#2E368C` accent(+ 更亮的 **highlight**) · gray 中性色 · 语义 severity/status | 工具怎么用。随浅/深色主题变。 |

品牌墨色 navy `#0A2540` **只属于识别层**。应用内部的 accent 分两档:

- **Accent — 冷静的默认**(`--color-util-colors-primary-600` `#2E368C`,暖 navy-indigo):
  按钮、链接、选中态。日常的「你在这里」。
- **Highlight — 更响的一档**(`--color-brand-highlight` `#14C5F6`,一种亮青蓝):标记「新 / 未读」。
  **刻意稀缺**——它是标记色,不是和 navy 平起平坐的 tier(注意色到处都是就不再是注意色)。看得见的
  锚是 **`New` 徽章**(`primitives/new-badge.tsx`);另有几个未读小圆点(通知铃、alert rail、pulse 行、
  通知页)和 `InfoBanner` 提示条。焦点仍是 navy——不整体改 focus ring。

---

## 1 · Logo — 「stacked bars」

> 同 [logo-rationale.zh.md](logo-rationale.zh.md)。

Yuqi 提供(2026-06-16)。刻意做成**图形**标识——不是字标。

### 为什么是图形,而不是字母「D」

产品内部高度**文字密集**——表单、日期、清单、表格。品牌刻意走反方向:用一个简洁的几何图形,
而不是「D」字标。两层意图:

- **和产品内部的「重文字」拉开距离**——logo 是图形,界面是文字,各司其职,品牌层得以呼吸。
- **中和严肃感**——截止日、合规本就偏正式、偏紧张;一个简洁、友好的形状,让品牌更轻、更好接近。

### 形 → 意

- **四条横杠** = 一摞待办的截止项 / 申报,事务所手里一行行的 obligation。
- **错开的那一条** = 一个**新插进来的 item**(刚进队列、还没对齐)。也正因为它是新的、还没归位,
  它就是**该你先看的那一个**——「新插入」是因,「待关注」是果,同一拍讲了两遍。
  - 这和产品本身相互呼应:界面里 highlight 青色 `--color-brand-highlight` `#14C5F6` 正是
    「新 / 未读」标记色(未读圆点、新提醒)。所以 mark 里「错开的新横杠」和界面里「青色标记」
    说的是一套话:**新来的 = 看这里。**
- **App-icon 形态** = navy 圆角方块(`--color-brand-ink`)上的 ivory 横杠(`--color-brand-ivory`);
  只用 navy + ivory,mark 里不带强调色。splash 上去掉方框,让横杠自己站出来。
- **HQ** 留在字标里,作为低调的 sans 小标签——它是指挥中心,不进 mark。

### 状态 — v1

当前是**第一版**,刻意克制,先作为占位 / 地基落地。方向已立——图形优先、非字母、stack + 插入——
但视觉强度仍偏弱;比重、错位幅度、是否引入动效或强调色,留给下一版打磨。

### 字标(wordmark)

`DueDate` 用品牌衬线(`--font-serif`;Apple 上是 New York,Windows 上是 Georgia)+ `HQ` 作为
缩小、降饱和的大写 sans 小标签 + 分隔线 + _for CPA firms_ 标语。衬线 = 信任;sans 小标签 = 这是软件。

### 文件

- `docs/brand/duedatehq-mark.svg` — mark,app-icon 形态(64×64)
- `docs/brand/duedatehq-lockup.svg` — 完整横向锁定
- `docs/brand/duedatehq-favicon.svg` — favicon,16–32px 优化
- 应用内:`components/primitives/brand-mark.tsx`(`BrandMark`)、`public/favicon.svg`、
  `features/auth/auth-chrome.tsx` 里的 `AuthBrandAnchor`

### 留白与最小尺寸

- **留白** = 四周各留「一条横杠的高度」,锁定区外不放别的东西。
- **最小尺寸**:mark 16px(favicon 下限);完整锁定 120px 宽。低于锁定下限时,只用 mark。

### Do / Don't

- ✅ mark 自带 navy 方块,可放在任意表面上。
- ✅ 保持提供的横杠比例 + 错开的第三条;等比缩放。
- ❌ 不要把 mark 改成产品 accent 色,也不要随主题翻转(只用 navy + ivory)。
- ❌ 不要把字标设成产品 sans、拉伸、或丢掉 `HQ` 小标签。
- ❌ 不要重排、改序、或对齐横杠——那个错位就是这个 mark。

---

## 2 · 颜色

### 为什么是这些颜色

- **navy `#0A2540` 作识别色** — 信任、精确、稳重,贴 CPA / 合规受众;比纯黑更有人味,
  比亮蓝更不像通用 SaaS。它是固定的「我们是谁」。
- **ivory `#F3EEE6`,而非纯白** — navy 上反白的 mark 用暖 ivory 而非冷白。它**仅用于 logo mark**
  (navy 方块上的反白横杠),**不是产品 UI 色**,也不再做页面底:auth / splash 底曾试过暖 ivory 奶白
  (2026-06-16),后改回冷灰(`background-subtle`,2026-06-18)——暖底和冷调产品色板不搭。
- **产品 accent = navy-indigo `#2E368C`,而非 Dify 蓝 `#155AEF`** — 把应用内的 accent 往品牌
  墨色靠,让产品和品牌同源、更深、更不通用;但比识别 navy 亮一档,仍能当 accent 用。
  (曾试 sage 绿 `#566E4C`,弃用——和 success 绿撞,green-on-green。)
- **highlight = cyan `#14C5F6`** — 亮、电感强 = 「新 / 看这里」;**刻意稀缺**(注意色到处都是就失效)
  ——看得见的锚是 `New` 徽章,外加几个未读小圆点。它是标记,不是平起平坐的一档;和 navy 在色相和
  亮度上都拉得够开,扛得起「例外」而不和日常 navy 抢。
- **为什么 accent 分两档** — navy 冷静做默认,cyan 做响亮的例外。一个 accent 没法既是冷静的
  「你在这里」又是抢眼的「看这里」,所以拆成两档。
- **「颜色只为风险服务」** — gray 是安全基线;颜色只承载业务语义(风险 / 状态),从不做装饰。
  满屏保持冷静,只有要紧的东西才有颜色。
- **为什么两层并存** — 识别层 navy 固定(我们是谁);产品层跑 Dify 冷静工作台色板(工具怎么用)。
  分开,才不会让品牌 navy 渗进产品当 accent。

### 2.1 品牌识别(不随主题变)— `--color-brand-*`

| Token            | Hex       | 用途                                                                                  |
| ---------------- | --------- | ------------------------------------------------------------------------------------- |
| `brand-ink`      | `#0A2540` | logo 方块、字标、`<meta theme-color>`                                                 |
| `brand-ink-deep` | `#071A2E` | 按下态 / 高对比 app icon                                                              |
| `brand-ivory`    | `#F3EEE6` | 仅用于 navy 上反白的 mark(auth/splash 底已于 2026-06-18 改回冷灰 `background-subtle`) |
| `brand-gold`     | `#B99B62` | 传承的次级强调色,极少用                                                               |

### 2.2 产品 UI — 文本与 accent(语义,浅色)

| 角色                | Token → 值                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主文本              | `text-primary` → gray-900 `#101828`                                                                                                                                          |
| 次文本              | `text-secondary` → gray-700 `#354052`                                                                                                                                        |
| 三级文本            | `text-tertiary` → gray-500 `#676F83`                                                                                                                                         |
| 弱化文本            | `text-muted` → gray-400 `#98A2B2`                                                                                                                                            |
| **Accent / 主 CTA** | `util-colors-primary-600` `#2E368C`(暖 navy-indigo;hover 700 `#222A6C`,solid 500 `#4350A3`)                                                                                  |
| Accent 浅底         | `state-accent-hover` `#EEF0FB`(50) · `-hover-alt` `#DADEF6`(100)                                                                                                             |
| **Highlight**       | `--color-brand-highlight` `#14C5F6`(填充 · 圆点 · `New` 徽章) · `-ink` `#066C98`(文字/链接) · `-soft` `#E3F6FD`(柔色底)— 新/未读标记,**刻意稀缺(是标记,不是平起平坐的一档)** |

**Highlight 对比度铁律**(`#14C5F6` 偏亮,亮度 ≈ 0.47):

- **青底上的字 → navy `#0A2540`**(~7.6 : 1,过 AAA,且是品牌色)。**绝不用白字**(~2 : 1,挂)。
- **青色当白底上的字/链接 → `highlight-ink` `#066C98`**(`#14C5F6` 本身太浅,当不了文字)。
- **柔青底 → `highlight-soft`** 配正常深色文字。
- 别把 `highlight-ink` 放在**青底**上当字——两个都偏青(~2.9 : 1,糊)。

例:`New` 徽章 = `bg-brand-highlight` + `text-brand-ink`(青底 navy 字)。

### 2.3 中性梯 — `--color-util-colors-gray-*`

`25 #FCFCFD · 50 #F9FAFB · 100 #F2F4F7 · 200 #E9EBF0 · 300 #D0D5DC · 400 #98A2B2 ·
500 #676F83 · 600 #495464 · 700 #354052 · 800 #18222F · 900 #101828`

### 2.4 语义 — 颜色只承载含义

**「颜色只为风险服务。」** gray 是默认的安全态——基线永远不用绿色。

| Severity | 色                          |     | Status  | 色                       |
| -------- | --------------------------- | --- | ------- | ------------------------ |
| critical | red-600 `#D92D20`           |     | done    | green-600 `#079455`      |
| high     | orange-600 `#E04F16`        |     | draft   | gray-500 `#676F83`       |
| medium   | coral/warning-600 `#C83D2F` |     | waiting | blue-light-600 `#0086C9` |
| neutral  | gray-600 `#495464`          |     | review  | primary-600 `#2E368C`    |

每种都带 `-tint`(50)和 `-border`(200/300)做柔色填充。完整色板
(red/green/yellow/orange/coral/blue/blue-light/indigo/violet/teal/pink/rose)在 50–700 区间齐备,
供图表和来源徽章使用。

### 2.5 表面

白色工作面(`background-default` `#FFFFFF`)**对** 暖灰外壳(`bg-canvas` /
`background-canvas-warm` `#F6F5F3`,侧栏卡 `#F6F8FA`)。内容用**白底上的发丝描边**区隔,而不是灰色填充。
分隔线:`subtle` 4% · `regular` 8% · `deep` 14%(黑色透明度)。

---

## 3 · 排版

**字族:** `--font-sans`(Apple system / Segoe / Inter)用于所有 UI · `--font-mono`(Geist Mono)
用于每一个需要对齐的数字 · `--font-serif`(New York / Georgia)**只用于 logo 字标**——绝不用于正文或 UI。

### 3.1 字阶(真实 token 值,px)

`micro 9 · 2xs 10 · badge/chip 11 · xs 12 · sm·description 13 · base·md 14 ·
lg 16 · xl 18 · surface-title 22 · stat-value 24 · 2xl 28 · section-title 32 ·
display-large 36 · display-hero 54 · hero 56`

小端是干净的 1px 梯(11·12·13·14)——每个名字一个独立尺寸,不碰撞。正文尺寸配套紧凑的
~1.33–1.39 行高。

### 3.2 字重原则(只用 400 / 500 / 600)

- **400** 默认正文。**500** 关键数据 / 行名 / chip。**600** 页面 + 区块标题、表头列标签、行锚点。
- **紧迫感 = 尺寸,不是字重,更不要「红 + 粗」一起上。** 一个红色 16px/500 的信号胜过加粗。
  重复出现的锚点降到 500。
- **层级要改两处:** 同时改 token 和字重(`text-xl/600` 标题 对 `text-sm/400` 辅助)——
  同尺寸只改字重,读起来是平的。

### 3.3 数字与 eyebrow

- **数字铁律:** 所有需要纵向对齐的数字(金额、天数、日期、EIN、ID)用 `--font-mono` + `tabular-nums`。
- **Eyebrow:** 大写短语用 `tracking-eyebrow` 0.08em(10–12px 用 `-tight` 0.06em)。
  标题收紧用 `tracking-title` -0.01em,display 用 `-0.02em`。

---

## 4 · 间距、圆角、层级

### 4.1 间距 — 4px 基数

`space-1 4 · 2 8 · 3 12 · 4 16 · 5 24 · 6 32 · 8 48 · 12 80`。布局里优先 `gap-2 / 3 / 4 / 6`。

### 4.2 圆角(在 Tailwind 默认梯之上的使用约定)

`4` 紧凑 chip/内联 · `8` 按钮 · 输入 · 卡片 · banner · 下拉 · `12` 弹窗 · 抽屉 · 命令面板 ·
`999` 胶囊 · 头像 · 状态点 · `0` 内部分区分隔。绝不自由取值(没有 6/10/14);绝不用 `rounded-3xl`;
绝不在单边强调描边上用单边圆角。

### 4.3 层级 — 「先用 1px 线,再谈阴影」

卡片默认**无外阴影**——靠描边 + 背景对比把它托起。

| 层                    | 描边           | 阴影             |
| --------------------- | -------------- | ---------------- |
| 画布 / 面板 / 卡片    | 发丝线(4–8%)   | 无               |
| 抽屉 / 浮层 / tooltip | `divider-deep` | `shadow-subtle`  |
| 弹窗 / 命令面板       | `divider-deep` | `shadow-overlay` |

微阴影(blur ≤ 4)只用在小的可点击元素上。产品里绝不 blur ≥ 24。

---

## 5 · 图标与动效

- **图标:** `lucide-react`,**只用 outline**,1.5–2px 描边。内联 16px,装饰性 ≤ 24px。核心 UI 不用 emoji。
- **动效:** 一个节奏——`--default-transition-duration` 150ms,ease-out `cubic-bezier(0,0,0.2,1)`
  用于 hover/press/fade。整面滑动(侧栏/抽屉)用 `--ease-apple` `cubic-bezier(0.32,0.72,0,1)`。
  全局 reduced-motion 开关把所有过渡压到 ~0。

---

## 6 · 语气

冷静、精确、以金额为先。我们把结果说清楚;不含糊、不吹。

- ✅ 「已申报——提前 3 天。」 · 「$28,400 有风险 · 未来 7 天。」 · 「来源已变,去复核。」
- ✅ 风险**先讲金额**,再讲天数。AI 输出永远带 `[source]` 证据徽章(玻璃盒)。
- ❌ 不要全大写的警报墙,不要一连串感叹号,不要「Oops!」式卖萌。
- ❌ 状态是**被观测的,不是被选的**——别写暗示用户从通用下拉里挑状态的文案;把推动它前进的触发点露出来。

---

## 7 · 组件 — 用 primitive

每个 UI 模式都有**唯一的 canonical primitive;绝不手搓。** 强制索引在 `DESIGN.md §4.11`;
在线样例在 `/preview`。

- **基础**(`packages/ui/components/ui`,32 个):Button · TextLink · Input · Textarea · Select ·
  Combobox · Command · Checkbox · Switch · Slider · Segmented · Tabs · Badge · Card · Alert ·
  Dialog · AlertDialog · Sheet · Popover · Tooltip · DropdownMenu · Table · Progress · Skeleton ·
  Separator · Sidebar · Sonner(toast)…
- **Patterns**(`app/components/patterns`,23 个):AppShell(+Nav, UserMenu) · PageHeader ·
  Breadcrumb · ListRail · StatBand · StatTile · FilterTrigger · TableHeaderFilter · RowActionsMenu ·
  FloatingActionBar · EmptyState · InfoBanner · StatusBanner · DetailSectionCard ·
  NeedsAttentionPanel · BulkConfirmDialog · KeyboardShell…
- **Primitives**(`app/components/primitives`,16 个):BrandMark · CountPill · CountDotChip ·
  ToggleChip · StateBadge · StateSeals · SearchInput · DueDateLabel · RelativeTime · IsoDatePicker ·
  TaxCodeLabel · FieldLabel · ReadinessIndicator · LowConfidenceBadge · AiProvenanceBadge ·
  LocaleSwitcher。

### 按钮强调梯

`primary`(实色填充)→ `accent`(浅 accent 底 + accent 描边)→ `secondary`(白 + 发丝线)→
`tertiary`(gray-100 + 发丝线)→ `ghost`(仅 hover)→ `link`;外加 `destructive-*` 对应档。
一屏只有一个 primary。

### Badge / status 梯

色调(success / warning / info / destructive / secondary / outline)是不可商量的语义;
形态(实色 chip / 描边 chip / 图标点)由类别决定。**实色 chip 绝不加点**(点只给 outline 用)。

---

## 8 · 拒绝的模式

Stripe 紫渐变 · Bloomberg 霓虹 · Notion 圆软 · 绿色「OK」基线 · 抽象装饰 · 大投影 · 按钮圆角 > 8px ·
产品正文用衬线 · 核心 UI 用 emoji · 无来源的 AI 输出 · 已申报行上的红色 severity 底 ·
品牌 navy 当产品 accent · 用删除来降噪(永远降权,保住决策信息)。
