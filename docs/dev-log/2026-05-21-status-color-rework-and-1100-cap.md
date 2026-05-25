---
title: 'Status color rework + 1100px global page cap + DUE column rename + client grouping cleanup'
date: 2026-05-21
author: 'Yuqi + Claude'
---

# Status color rework + 1100px global page cap + DUE column rename + client grouping cleanup

## 背景

Yuqi 一次提了 5 件相关的事，全部围绕 obligations 表的视觉信息密度：

1. 每个页面应当统一收到 1100px 最大宽度，不让大屏幕上散开。
2. obligations 表 DUE 列改成 "Internal Due"（澄清是 internal deadline，
   不是 statutory）。
3. wireframe 显示：同一客户的多条 obligation 应该按 client 分组——客户名
   只在第一行出现，后续行的 Client 列留空。当前实现是用一个 ┗ 连接线
   glyph，要换掉。
4. `Waiting on client` / `Blocked` / `In review` 的状态点颜色目前撞色——
   waiting 和 review 都用 warning amber，没法一眼分。需要差异化。
5. 所有 dots 的 halo shadow 要去掉。
6. Smart Priority 现在用红/黄/蓝点也吃掉了颜色编码——颜色应当只服务一个
   主要语义（status）。需要换一种方式表达 priority。Yuqi 让我先 brainstorm。

## 做了什么

### 1. 全局 1100 cap（`apps/app/src/components/patterns/app-shell.tsx`）

`<Outlet />` 外层 `max-w-screen-2xl` (1536px) → `max-w-[1100px]`。一行改完
立即作用于所有路由。dashboard 自己内部还有一层 `max-w-[1100px]`，保留——
即使外层已经 1100，内部显式声明等于自我文档化，又不重复渲染开销。

宽表（obligations queue / Coverage matrix）会得到横向滚动而不是占满整屏白
框。Coverage matrix 上次的"原因 comment 提到的 1536px 例外"已经不成立，
matrix 是嵌进 rules.library 里的，按这个 cap 横向滚动就行。

### 2. DUE 列改名（`apps/app/src/routes/obligations.tsx`）

- 表头 `t\`Due\``→`t\`Internal Due\``（line 1229）。
- columnLabels 字典里 `currentDueDate: t\`Internal deadline\``→`t\`Internal Due\``
  （line 721）——Columns dropdown 里的列名也跟着改。
- 注：obligation drawer 内部还有几处 "Internal deadline" 出现在长文里
  （line 3232/3240/3293），那些是描述性文案不是列名，留着不动。

### 3. 客户名分组——继续行留空（`apps/app/src/routes/obligations.tsx`）

`continuationRowIds.has(row.id)` 的渲染从原来的 SVG ┗ 连接线 glyph 改成
`<span className="sr-only">{clientName}</span>`——视觉上空白，screen reader
仍然能拿到 client 名字保证 row 上下文不丢。

按 wireframe，分组是"客户名出现一次 + 后续 row 留空"这一条信号就够了，
不另加 background 或 border 装饰。

### 4 + 5. 状态点拆色 + 去阴影（`packages/ui/src/components/ui/badge.tsx` +

`apps/app/src/features/obligations/status-control.tsx`）

**`BadgeStatusDot` 改动**：

- 删除每个 tone 的 `shadow-status-indicator-*` halo class（success/warning/
  error/normal/disabled 都净化成纯背景色 + rounded-full）。`PulsingDot` 是
  另一个组件，没动——live 信号还是要 halo。
- 新增 `info` tone，色值 `bg-violet-500`。色卡里之前没有 violet，
  semantic 跟 success/warning/error/normal/disabled 5 个色都不冲突。

**`STATUS_DOT` 重新映射**：

| status                | 改前        | 改后     | 颜色       |
| --------------------- | ----------- | -------- | ---------- |
| pending               | disabled    | disabled | gray       |
| in_progress           | normal      | normal   | blue       |
| **waiting_on_client** | **warning** | **info** | **violet** |
| review                | warning     | warning  | amber      |
| blocked               | error       | error    | red        |
| done / completed      | success     | success  | green      |
| paid                  | success     | success  | green      |
| extended              | normal      | normal   | blue       |
| not_applicable        | disabled    | disabled | gray       |

现在 waiting_on_client（violet）/ review（amber）/ blocked（red） 三个状态
颜色完全分开，screen-reader 不依赖颜色，颜色仅作 quick scan 辅助。

`STATUS_VARIANT` 没动——waiting_on_client 的 badge variant 仍是 outline，
所以 pill 还是个透明白底+灰边的椭圆，violet 点 sit inside。看起来"安静
中带一点不同色"，传达 "we're paused, not stuck"。

### 6. Smart Priority 临时去色（`apps/app/src/routes/obligations.tsx`）

- 原来：score≥70 红、≥45 amber、≥25 accent blue 三档色点。
- 临时：只有 score≥70 的行显示一个 `bg-text-primary`（charcoal）的中性
  pip。45-69 不再显示视觉信号。

这是临时填空，让颜色锁定给 status。最终方案待 Yuqi 在下面 brainstorm 里
挑——见末段。

## 为什么这样做

**为什么 1100 cap 全局而不是 per-page：**
之前每个 route 自己设 max-w 各不一致——dashboard 是 1100，settings 是 prose
宽度，obligations 是没设（继承 1536 的 shell）。统一在 shell 一层加 cap：

- 视觉一致性：所有 route 落在同一个阅读柱里
- 后续改动只改一行
- 单个 route 想更窄仍可自己再嵌套 max-w（dashboard 现状就是）
- 单个 route 想更宽？我倾向不要——如果一个 route 必须 >1100，那说明它的
  信息架构有问题（列太多 / 信息密度太低）。先压死再说。

**为什么 waiting_on_client 用 violet 而不是其他色：**

- 不能用 blue：跟 in_progress 撞
- 不能用 amber：跟 review 撞
- 不能用 red：跟 blocked 撞
- 不能用 green：跟 done 撞
- 不能用 gray：跟 pending 撞
- 候选只剩 violet / teal / yellow（vs amber）。violet 在 SaaS dashboard 里
  常代表"等待 / 暂停 / 第三方依赖"语义（GitHub awaiting-review、Linear
  cycle pause），semantic 对得上。

**为什么不引入新的 design token (`bg-components-badge-status-light-info-bg`) 而是
直接 `bg-violet-500`：**

- design-token 流程要走 figma → DTCG → CSS var → Tailwind extend，至少
  3 个文件 + reviewer。
- "violet 是不是要进 token system" 本身是个设计 team decision——我现在做
  的是 UX polish，不是 token system 扩张。先 ship inline 色值，等 design
  team 决定要不要 promote 再 swap。
- 单个 inline 色值要 swap 一次只动 badge.tsx 一处。

**为什么 Smart Priority 暂时只对 ≥70 显示中性 pip：**

- 全删会丢失"高优先级在哪"的信号——用户的 muscle memory 会不适。
- 保留全套红/黄/蓝又跟新的 status 色系冲突。
- 折中：只标记最高优先级（≥70）的少数行（占比一般 < 10%），用中性色，
  视觉重量最小，保证 status pill 仍是行里最显眼的彩色物。

## 验证

- `pnpm -F @duedatehq/app exec tsc --noEmit`：clean。
- `pnpm exec vp lint`（4 个 touched files）：0 errors，1 个 pre-existing 的
  `no-unsafe-type-assertion` warning（与本次改动无关）。
- `pnpm -F @duedatehq/app test`：46 文件 / 255 测试全部通过。
- 视觉预期：
  - 每页内容居中，最大 1100px。
  - obligations 表 DUE 列改为 Internal Due。
  - 多 obligation 同客户：第一行有客户名，后续行 Client 列空白。
  - waiting_on_client 状态点 violet，review 状态点 amber，blocked 状态点
    red——三色明显分开。
  - 所有 BadgeStatusDot 没有 halo glow。
  - 客户名前的 priority pip：≥70 才出现，颜色 charcoal。

---

## Smart Priority 信号方案 — Brainstorm（不写代码，等 Yuqi 挑）

颜色已经被 status 锁死。Smart Priority 需要用 **非颜色** 渠道表达"重要"。
按"信号强度从弱到强、加码从轻到重"排序，给 6 个方向。

### A. 左边缘 accent bar

高优先级（≥70 或 top-N）的整行在最左边添一条 2-3px 垂直 accent 条，类似
Linear / Notion 高亮行的视觉。

- 优点：peripheral signal，扫表时眼睛先抓到。颜色用 brand accent（蓝）
  跟 status 不冲突——它是"行级"signal，不是"单元格级"。
- 缺点：和 selector checkbox 抢同一侧空间。可以放到 checkbox 内侧 1px
  缝隙里。

### B. 客户名加粗 / 改 size

高优先级的 row 客户名渲染成 font-semibold + 略大字号（13px → 14px）。

- 优点：完全无新像素加入，typography 自己讲完。
- 缺点：太低调可能看不出来，需要和 hover state / active row 抢"加重"
  视觉语言。

### C. 行尾 rank superscript

top-N（比如前 5 或前 10）的客户名右上角加一个超小 `#1` `#2` ... 标记。

- 优点：信息更具体（"我是第几"vs 模糊的"我重要"）。CPA 知道"今天先做
  这五"。
- 缺点：要规定 N。N 太多就是噪音，N 太少 5 之外的高分行没信号。

### D. 行左缘 "fire" 图标

≥70 用一个小🔥（或 Lucide flame / arrow-up）图标，single tone，紧靠客
户名。

- 优点：icon 比 dot 信息密度高一点，能一眼分辨"这是 priority 信号而不是
  status dot"。
- 缺点：图标会有"情绪化"暗示（🔥意味着 urgent），CPA 文化里可能太轻松。
  Lucide `arrow-up-right` 或 `chevrons-up` 更专业。

### E. 不显示信号 + 默认排序就是 Smart Priority

直接相信 sort：默认就按 Smart Priority desc 排，rank #1 就在顶，rank #2
在它下面，依此类推。任何额外标记都是"对默认 sort 的怀疑"。

- 优点：最干净，零新视觉。Smart Priority 本身的存在变成隐式约定。
- 缺点：用户切换其他 sort 时（按 Internal Due / 按 Tax type），priority
  信息直接消失，没办法在 due-date sort 视图里也"看到"哪些是急的。
- 适合：如果团队几乎从不切 sort。

### F. 字号+左 accent bar 组合（A + B）

左缘 2px brand-accent bar + 客户名 semibold + 微微大一号。两个轻信号叠
加。

- 优点：单独任一个都太弱，组合起来 perception threshold 刚好过。
- 缺点：实现成本相对最高（要 per-row classname dispatch）。

### 我的推荐

**短期**（这一两周内 ship 一版）：**A. 左边缘 accent bar**（2px，brand
accent，只对 ≥70 的行）。它最像 Linear 的"P0 / P1"高亮，CPA 一秒就懂，
零文字干扰，颜色用 accent 跟 status 完全独立。

**中期**（如果想再升级）：**A + C 组合**——左缘 bar 标记高优先级"行"，
名字旁边的 `#1..#5` 标记"具体排名"。两层信号互补。

**反对**：B 单独太弱，D 的图标在专业感上掉分，E 限制用户重排自由。

Yuqi 挑一个我就接着 ship。
