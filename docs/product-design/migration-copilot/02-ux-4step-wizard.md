# Migration Copilot · 02 · 4 步向导 UX 规格

> 版本：v1.0（Demo Sprint · 2026-04-24）
> 上游：PRD Part1A §3.2 / §3.6.3 / §3.6.6 / §4.1 / §5.9 / §6.2.1 · Part1B §6A.6 / §6A.7 / §6A.9 · Part2A §7.5.6 / §7.6 / §7.7 · Part2B §12.3 / §13.2.1
> 设计系统：[`../../../DESIGN.md`](../../../DESIGN.md) · [`../../Design/DueDateHQ-DESIGN.md`](../../Design/DueDateHQ-DESIGN.md)
> 入册位置：[`./README.md`](./README.md) §2 第 02 份
> 配套：[`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) · [`./10-conflict-resolutions.md`](./10-conflict-resolutions.md) · [`./07-live-genesis.md`](./07-live-genesis.md) · [`./09-design-system-deltas.md`](./09-design-system-deltas.md) · [`../../adr/0009-lingui-for-i18n.md`](../../adr/0009-lingui-for-i18n.md)

本文件把 Migration Copilot 4 步向导（Intake / Mapping / Normalize / Dry-Run + Live Genesis）收敛到**像素级 UX 规格**。ASCII 线框的视觉侧（背景 / 边框 / 圆角 / 字体）一律**只用 DESIGN token 名**引用，不落任何 hex 或 Tailwind 原子类（见 [`../../../DESIGN.md`](../../../DESIGN.md) 权威清单）。所有用户可见文案给出 EN 原文 + zh-CN 对照，并注明按 [`../../adr/0009-lingui-for-i18n.md`](../../adr/0009-lingui-for-i18n.md) 走 Lingui `<Trans />` / `` t`...` `` 宏标记。

---

## 1. 导航总图

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Entry : /migration/new?source=*
  Entry --> Step1_Intake : wizard.step1.opened
  Step1_Intake --> Step2_Mapping : Continue (saveDraft + mapper.run)
  Step2_Mapping --> Step3_Normalize : Continue (saveDraft + normalizer.run)
  Step3_Normalize --> Step4_DryRunGenesis : Continue (saveDraft + dryrun.build)
  Step4_DryRunGenesis --> DashboardLanding : Import & Generate (migration.imported)
  DashboardLanding --> [*] : Toast 常驻 24h

  Step1_Intake --> Entry : [Close] → 空白直接关闭 / 有导入工作则关闭确认
  Step2_Mapping --> Step1_Intake : [Back]
  Step2_Mapping --> Entry : [Close]
  Step3_Normalize --> Step2_Mapping : [Back]
  Step3_Normalize --> Entry : [Close]
  Step4_DryRunGenesis --> Step3_Normalize : [Back]
  Step4_DryRunGenesis --> Entry : [Close]（动画前可关；动画中 Esc 失效）
```

> 2026-05-05 裁定：`/migration/new?source=onboarding` 是首登 route-level activation
> surface，挂在 EntryShell（无 AppShell / sidebar）下；页面顶部解释为什么要导入并提供 `Skip for now`；Dashboard、Clients、
> Obligations 空态和 Command Palette 仍使用 dialog shell。两种 shell 复用同一套 reducer、
> RPC 编排、Stepper、processing overlay 和 Step 1–4 组件，详见
> [`./13-onboarding-activation-route.md`](./13-onboarding-activation-route.md)。

| 步骤                     | 目标                                                                          | 退出条件                                           | AC 映射         | 本册锚点 |
| ------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------- | --------------- | -------- |
| Step 1 Intake            | 选择数据入口（粘贴 / 上传 / Preset）；SSN 拦截；≤ 1000 行                     | 粘贴或上传文件解析成功 + 至少 1 条非空行           | S2-AC1          | §4 本文  |
| Step 2 Mapping           | AI Mapper 自动准备字段映射；摘要优先，低置信 / fallback / bad rows 才突出展示 | 至少 1 列非 IGNORE；`all_ignore` fallback 禁止继续 | S2-AC1 / S2-AC2 | §5 本文  |
| Step 3 Normalize         | AI 自动归一值并按 value group 摘要；Default Matrix 默认应用，细节可展开       | needs_review 可非阻塞带入 Step 4                   | S2-AC3 / S2-AC4 | §6 本文  |
| Step 4 Dry-Run + Genesis | 展示 counts + 风险预览 + Safety；触发原子导入 + Live Genesis 动画             | `migration.imported` 成功 + Dashboard 落地         | S2-AC5          | §7 本文  |

> 数字键 `1-4` **不** 跳步骤（避免误触）；步骤推进只允许 `Continue` / `Back`。来源于 [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §7.2 键盘基线。

---

## 2. 全局外壳规格

### 2.1 Wizard 容器

```
┌──────────────────────────────────────────────────────────────────────┐
│  Import clients · Step X of 4                             [Close ×]  │   ← 顶栏：{typography.title} + {colors.text-primary}；高 56px；底线 1px {colors.border-default}
├──────────────────────────────────────────────────────────────────────┤
│  ①──────② · · · ③ · · · ④                                            │   ← Stepper 区：高 32px；间距 {spacing.3}；详见 §2.2
│                                                                      │
│  <Step body 区>                                                      │   ← 正文：背景 {colors.surface-canvas}；左右内边距 {spacing.5}；上下 {spacing.4}
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  [← Back]                                 [Continue →]               │   ← 底栏：高 56px；{colors.surface-panel}；底栏按钮区使用 button-primary / button-secondary
└──────────────────────────────────────────────────────────────────────┘
```

- 形态：默认是 **modal shell**（非 drawer）；首登 `/migration/new?source=onboarding`
  使用 **route shell**。两者共享 960px workbench frame、Stepper、底栏和 processing overlay；
  差异只在宿主外壳（Dialog vs EntryShell route page）。
- 无障碍：`role="dialog"` + `aria-modal="true"` + `aria-labelledby="wizard-title"` + `aria-describedby="wizard-step-desc"`
- 焦点陷阱（Focus trap）：Tab / Shift+Tab 在向导内循环，不逃出宿主页面
- `Esc`：空白向导直接关闭；已有输入、选择、批次或 AI 结果时打开关闭确认（见 §3.2）
- 顶栏：`Import clients · Step X of 4`（`{typography.title}` + `{colors.text-primary}`）+ 右上 `[Close ×]`（Icon-only 按钮；hover `{colors.surface-subtle}`）
- 底栏：左 `[← Back]`（Step 1 禁用，颜色 `{colors.text-disabled}`）；右 `[Continue →]` 使用 `button-primary`；Step 4 改为 `[Import & Generate deadlines ▶]`

### 2.2 Stepper（步骤条）

> **用户可见标签（2026-06-12 改）**：步骤标签从 ETL 阶段名（Intake /
> Mapping / Normalize / Dry-Run）改为用户结果语（**Upload / Match columns /
> Check values / Confirm**）—— "Normalize" 对 CPA 无心智模型、"Dry run"
> 读作有风险。**内部 stage key 不变**（`intake` / `mapping` / `normalize` /
> `dry_run`，见 `state.ts` 的 `StepIndex`），本文档其余章节仍用内部名指代各步。
> 标签源在 `Stepper.tsx` 的 `STEP_LABELS`。

```
  [ ① Upload ]──[ ② Match columns ]──[ ③ Check values ]──[ ④ Confirm ]
     active        upcoming             upcoming             upcoming     ← 当前步 {colors.accent-default} + {colors.accent-tint} 背景
     done          active               upcoming             upcoming     ← 已完成 {colors.status-done} + 勾
     done          error                upcoming             upcoming     ← 错误 {colors.severity-critical} + ! 图标
```

- 4 步水平；每格高 32px；间距 `{spacing.3}`；字号 `{typography.label}`（11px uppercase tracking 0.08em）
- 状态色：
  - 当前（active）→ `{colors.accent-default}` + `{colors.accent-tint}` 背景
  - 已完成（done）→ `{colors.status-done}` + ✓
  - 未开始（upcoming）→ `{colors.text-muted}`
  - 错误（error）→ `{colors.severity-critical}` + `!`
  - 禁用（disabled）→ `{colors.text-disabled}`
- 仅展示不可点击（避免跨步跳跃造成数据污染）
- 具体 YAML token 回灌见 [`./09-design-system-deltas.md#stepper`](./09-design-system-deltas.md#stepper)

### 2.3 键盘总览（向导级）

| 键                  | 行为                                                               | 备注                                                                |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | 焦点循环                                                           | 不逃出 modal                                                        |
| `Enter`             | 提交当前步（焦点在非 textarea / non-editable 区时等价于 Continue） | 对齐 [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §7.2    |
| `Esc`               | 空白向导直接关闭；已有导入工作时打开关闭确认（非 destructive）     | Step 4 动画期间 `Esc` **失效**                                      |
| `A`                 | 切换当前聚焦的 Step 3 tax type default group                       | 仅 Suggested tax types group 内生效                                 |
| `1` - `4` 数字键    | 不跳步骤                                                           | 避免误触；通过 `[Back]` 逐级回退                                    |
| `Cmd/Ctrl + V`      | 粘贴                                                               | Step 1 textarea 默认生效                                            |
| `?`                 | 快捷键帮助浮层                                                     | 全局（[`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §7.1） |

---

## 3. 草稿与保存策略

### 3.1 每步保存

- 每次 `Continue` 触发 `rpc.migration.saveDraft`；服务端 `migration_batch.status='draft'` 或对应阶段状态（对齐 PRD Part1A §3.6.6 行 420 的"同一 firm 最多 1 draft batch"约束）
- Step 2 / 3 的 AI 调用结果写入 `evidence_link`（[`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §4.3）；失败不阻塞 UI 本地缓存
- `[Back]` **不** 清除下游已采集的用户输入；Step 3 override 回 Step 2 时可重跑 AI Mapper（按钮文案切换为 `[Re-run AI with my overrides]`）

### 3.2 关闭确认 AlertDialog

```
┌─────────────────────────────────────────────────────┐
│  Discard import?                                     │   ← 标题：{typography.title} + {colors.text-primary}
│                                                      │
│  Your pasted data and unsaved edits in this wizard   │   ← 正文：{typography.body} + {colors.text-secondary}
│  will be lost.                                       │
│                                                      │
│              [Keep editing]    [Discard import]      │   ← button-secondary + destructive-primary
└─────────────────────────────────────────────────────┘
```

- 外壳使用 `@duedatehq/ui/components/ui/alert-dialog`（shadcn Alert Dialog 结构 + Base UI primitive）；Level 4 Modal（宽 ≤ 480px）；`role="alertdialog"` + `aria-labelledby`
- 仅当向导已有可丢弃工作时展示：例如 Step 1 输入/上传/选择来源、进入后续步骤、创建批次、AI 映射/归一结果、dry-run 预览或错误状态。纯打开后未输入、未选择、未执行操作时，Close / Esc / overlay 直接关闭。
- DDL cut 不承诺完整 Import History / resume UI；关闭只表示丢弃当前向导内未完成信息
- 文案走 Lingui `<Trans />`（见 §8 全局文案表第 1~3 行）

### 3.3 并发串行提示（PRD §3.6.6 行 420）

同 firm 另一 Owner / Manager 已有 `draft` 批次时：

```
┌─ 顶栏内嵌 Alert（Wizard 顶栏下方，贴紧 Stepper）───────────────┐
│  ⓘ  {actor} is currently importing (Step 2 of 4).              │   ← 背景 {colors.severity-medium-tint}；文本 {colors.text-primary}
│      [View]    [Cancel theirs — Owner / Manager]                │   ← ghost 按钮；第二个仅 Owner / Manager 渲染
└─────────────────────────────────────────────────────────────────┘
```

- Demo Sprint Owner 单账号不会触发，但 UI 必须就位（对齐 Phase 0 RBAC 开闸）
- `role="status"` + `aria-live="polite"`

### 3.4 跨步处理过渡

Step 1 → 2、Step 2 → 3、Step 3 → 4、Step 4 Import 都可能等待 AI / D1 /
Default Matrix。等待期间不能只在底栏按钮里显示 `Working…`；Wizard body 需要盖一层
`role="status"` 处理中面板，锁住当前内容并把用户注意力留在当前任务上。

| 阶段         | 标题                            | 阶段明细                                                               |
| ------------ | ------------------------------- | ---------------------------------------------------------------------- |
| Intake → Map | `Preparing your mapping`        | Create batch → Upload rows → Map columns                               |
| Map → Norm   | `Preparing normalization`       | Save mapping → Read field values → Suggest clean values                |
| Re-run Map   | `Refreshing the AI mapping`     | Read columns → Re-map fields → Refresh confidence                      |
| Norm → Dry   | `Building the import preview`   | Save organized values → Apply tax type suggestions → Calculate preview |
| Import       | `Generating your deadline list` | Create clients → Generate deadlines → Record audit trail               |

- 面板：`bg-background-body` + `border-state-accent-active` + `shadow-overlay`，居中但不扩大 Wizard。
- 遮罩：仅覆盖 Wizard body，`bg-components-panel-bg/85` + `backdrop-blur-sm`；header / Stepper / footer 保持可见但按钮禁用。
- 进度：3 段式状态列表，completed 使用 success check，active 使用 accent spinner，pending 使用 muted dot。
- a11y：面板 `role="status"` + `aria-live="polite"`；body 设置 `aria-busy=true`。

---

## 4. Step 1 · Intake

### 4.1 目标与状态机

- **目标**：粘贴 / 上传两条路径二选一；SSN 前端拦截；≤ 1000 行；可选 Preset 标签；上传路径能识别常见竞品导出包并保留 source manifest
- **状态机**：`idle → validating → ready → error | ssn_blocked`

| 状态        | 触发                | `[Continue →]`              | 视觉提示                                          |
| ----------- | ------------------- | --------------------------- | ------------------------------------------------- |
| idle        | 进入 Step 1 默认    | 禁用                        | Paste 区空；上传区待拖放                          |
| validating  | 粘贴 / 上传后解析中 | 禁用（upload 结束后再启用） | Upload 区紫色态 + `Reading file…` status          |
| ready       | 解析成功 ≥ 1 行     | 启用（`button-primary`）    | 顶部计数 "N rows ready"                           |
| error       | 解析失败 / 空文件   | 禁用                        | 红 Banner（`{colors.severity-critical-tint}`）    |
| ssn_blocked | 命中 SSN 列         | 启用（但对应列强制 IGNORE） | 红 Banner + 该列边框 `{colors.severity-critical}` |

### 4.2 线框

```
┌──────────────────────────────────────────────────────────────────────┐
│  Import clients · Step 1 of 4                             [Close ×]  │
│  ①──────② · · · ③ · · · ④                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Where is your data coming from?                                     │   ← {typography.title}（16/500）
│  We'll figure out the shape — paste or upload, your call.            │   ← {typography.body} + {colors.text-secondary}
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Paste here — any shape, we'll figure it out.                │    │   ← Textarea：高 200px；背景 {colors.surface-elevated}
│  │  Include the header row if you have one.                     │    │     边框 1px {colors.border-default}；圆角 {rounded.md}
│  │                                                              │    │     字体 {typography.numeric}（mono）；aria-label 见 §4.5
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│        — or —                                                        │   ← 分隔线 + {colors.text-muted}；居中
│                                                                      │
│  ┌─ Drop CSV / Excel / ZIP / TXT / IIF here ────────────────┐        │   ← Upload zone：高 120px；虚线边框 1px {colors.border-strong}
│  │         or  [Choose file]     max 1000 rows · 5 MB       │        │     背景 {colors.surface-subtle}；圆角 {rounded.md}
│  └──────────────────────────────────────────────────────────┘        │     button-secondary
│                                                                      │
│  I'm coming from…  (optional)                                        │   ← {typography.label}（11/uppercase）
│   [CCH Axcess] [CCH ProSystem fx] [Drake] [File In Time]             │
│   [Karbon] [Lacerte] [ProConnect Tax] [ProSeries] [QuickBooks]       │
│   [TaxDome] [UltraTax CS]                                            │   ← source chips A-Z
│                                                                      │
│  ─────────────────────────────────────────────────────────────       │
│  🔒 We block SSN-like patterns before sending anything to the AI.    │   ← 永久 hint：{typography.label} + {colors.text-muted}
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  [← Back]                                          [Continue →]      │   ← Back 禁用（{colors.text-disabled}）
└──────────────────────────────────────────────────────────────────────┘
```

**SSN 拦截态（叠加 Banner）**：

```
┌─ role="alert" · aria-live="assertive" ──────────────────────────────┐
│  ⚠ We blocked SSN-like patterns to protect your clients.             │   ← 背景 {colors.severity-critical-tint}；边框 {colors.severity-critical-border}
│     Those columns won't be sent to the AI.                           │     文本 {colors.text-primary}；圆角 {rounded.md}
│     Columns flagged: "SSN", "Taxpayer #" → forced IGNORE.            │
└──────────────────────────────────────────────────────────────────────┘
```

**Row overflow 态（>1000 行）**：

```
┌─ role="status" · aria-live="polite" ────────────────────────────────┐
│  ⓘ We imported the first 1000 rows.                                  │   ← 背景 {colors.severity-medium-tint}
│     Split your file to import more.                                  │     文本 {colors.text-primary}
└──────────────────────────────────────────────────────────────────────┘
```

### 4.3 交互细节

- Paste 区高度固定 200px；字体 `{typography.numeric}` 便于查看列对齐；粘贴后自动探测 header（空值则由 Step 2 Mapper 再决）
- Upload：拖放 + 点击；接受 `.csv .tsv .txt .xlsx .zip .iif .json .dif .rtnbak .rctrl .dbf .mdx .csd`；
  ≤ 5MB；开始读取文件时先清空旧解析结果，
  Upload 区显示紫色读取态与 `Reading file…`；读取成功且 `rowCount >= 1` 后 `[Continue →]`
  才启用。空文件 / 只有表头无数据行时展示解析错误，不让用户面对一个无反馈的禁用按钮。
- 上传适配器：`.zip` 会扫描内部可读的 CSV / TSV / TXT / JSON / XLSX / IIF，并按来源置信度自动选择最可能的客户清单；TaxDome accounts + contacts 导出会合并出 `Primary Contact Name` / `Primary Contact Email`；QuickBooks Desktop IIF customers 会转换成 TSV。`.qbb .qbw .qbm .cab .fbk .xls .pdf` 以及 CCH / Lacerte / ProSeries / UltraTax 的 proprietary return/data 文件（`.rtnbak .rctrl .dbf .mdx .YYi/.YYp/.YYc/.YYs .csd .dif`）必须给出针对来源的导出指引。
- 解析成功后若检测到来源，展示 `Detected export source` status，并把 `sourceManifest` 随 uploadRaw 持久化，供审计 / 后续分析使用。
- 超 1000 行前端**只**读取前 1000 行 + 顶部 Banner（见线框）
- SSN 正则 `\d{3}-\d{2}-\d{4}`；命中列强制 `IGNORE` 并将表格列头边框替换为 `{colors.severity-critical}`（Step 2 透传给 Mapper 结果行）
- Preset chips：合并为单组，按展示英文名 A-Z 排序：**CCH Axcess · CCH ProSystem fx · Drake · File In Time · Karbon · Lacerte · ProConnect Tax · ProSeries · QuickBooks · TaxDome · UltraTax CS**。
- Preset chips 下方必须说明能力顺序：AI Mapper 先运行；Preset 作为来源上下文传入 AI，
  并在 AI 不可用时作为 preset mapping fallback。用户不能被迫从 UI 猜测当前使用的是
  AI 还是 preset。
- File In Time chip hover：弹出 tooltip（宽 240px，`{rounded.md}`，阴影 Level 3）

  ```
  ┌─ Tooltip · 200ms delay ───────────────────────────┐
  │  Coming from File In Time? We'll map available    │   ← 文本 {colors.text-secondary}
  │  calendar fields and flag gaps before deadlines.  │
  └───────────────────────────────────────────────────┘
  ```

- 未选 Preset → Step 2 Mapper 以 `"General"` 先验运行（见 [`./04-ai-prompts.md`](./04-ai-prompts.md)）

### 4.4 文案表（EN + zh-CN + Lingui 宏）

| 字段                      | EN 原文                                                                                                                         | zh-CN 对照                                                                                 | 宏                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Title                     | `Import clients · Step 1 of 4`                                                                                                  | `导入客户 · 第 1 步 / 共 4 步`                                                             | `<Trans>`                                     |
| Subtitle                  | `Where is your data coming from?`                                                                                               | `你的数据从哪里来？`                                                                       | `<Trans>`                                     |
| Paste placeholder         | `Paste here — any shape, we'll figure it out. Include the header row if you have one.`                                          | `粘贴到这里 —— 任何格式都行，我们会自动识别。如果有表头也请一并粘贴。`                     | `` t`...` ``（textarea placeholder 用函数式） |
| Upload hint               | `Drop CSV / Excel / ZIP / TXT / IIF here or click to choose · max 1000 rows · 5 MB`                                             | `将 CSV / Excel / ZIP / TXT / IIF 拖到这里，或点击选择 · 最多 1000 行 · 5 MB`              | `<Trans>`                                     |
| Upload reading            | `Reading file…`                                                                                                                 | `正在读取文件…`                                                                            | `<Trans>`                                     |
| Preset label              | `I'm coming from…`                                                                                                              | `我正在从…迁移过来`                                                                        | `<Trans>`                                     |
| Preset helper             | `The AI mapper runs first. Selecting a preset adds source context and provides a preset mapping fallback if AI is unavailable.` | `AI mapper 会先运行。选择 preset 会增加来源上下文，并在 AI 不可用时提供 preset 映射兜底。` | `<Trans>`                                     |
| FIT tooltip               | `Coming from File In Time? We'll map available calendar fields and flag gaps before generating deadlines.`                      | `正在从 File In Time 迁移？我们会映射可用日历字段，并在生成截止日前标记缺口。`             | `<Trans>`                                     |
| SSN banner                | `We blocked SSN-like patterns to protect your clients. Those columns won't be sent to the AI.`                                  | `为了保护客户隐私，我们拦截了疑似 SSN 的列，不会发送给 AI。`                               | `<Trans>`                                     |
| Row overflow warning      | `We imported the first 1000 rows. Split your file to import more.`                                                              | `我们只读取了前 1000 行。请拆分文件后再次导入。`                                           | `<Plural>`（按 rows 数）                      |
| Source detected           | `Detected export source` / `Using {sourceProductLabel} data from {file}.`                                                       | `已识别导出来源` / `正在使用来自 {file} 的 {sourceProductLabel} 数据。`                    | `<Trans>`                                     |
| Primary CTA               | `Continue →`                                                                                                                    | `下一步 →`                                                                                 | `<Trans>`                                     |
| Secondary CTA             | `← Back`                                                                                                                        | `← 返回`                                                                                   | `<Trans>`                                     |
| Error banner (parse fail) | `We couldn't read that file. Try exporting as CSV.`                                                                             | `无法读取该文件。请先导出为 CSV 再试。`                                                    | `<Trans>`                                     |
| Error banner (no rows)    | `We found a header, but no data rows. Add at least one client row to continue.`                                                 | `找到了表头，但没有数据行。请至少添加一条客户记录后继续。`                                 | `` t`...` ``                                  |
| Empty state               | `Paste or upload to continue.`                                                                                                  | `请粘贴或上传数据以继续。`                                                                 | `<Trans>`                                     |
| Close confirm title       | `Discard import?`                                                                                                               | `要丢弃此次导入吗？`                                                                       | `<Trans>`                                     |
| Close confirm body        | `Your pasted data and unsaved edits in this wizard will be lost.`                                                               | `你粘贴的数据和向导中未保存的修改将会丢失。`                                               | `<Trans>`                                     |
| Close confirm CTAs        | `Keep editing` / `Discard import`                                                                                               | `继续编辑` / `丢弃导入`                                                                    | `<Trans>`                                     |

### 4.5 键盘 / a11y

- Paste textarea：`aria-label="Paste client data"`；`aria-describedby="paste-hint"`
- Upload zone：`role="button"` + `tabindex="0"` + `aria-describedby="upload-hint"`
- SSN Banner：`role="alert"` + `aria-live="assertive"`
- Row overflow：`role="status"` + `aria-live="polite"`
- `Enter` 提交：焦点在 textarea 时不劫持；焦点在 Preset chip 或按钮区时等价于 `[Continue →]`

### 4.6 Token 映射表

| 区域                     | 规格                   | Token                                                                   |
| ------------------------ | ---------------------- | ----------------------------------------------------------------------- |
| 容器背景                 | 全屏 modal canvas      | `{colors.surface-canvas}`                                               |
| 顶栏标题字体             | 16/500                 | `{typography.title}`                                                    |
| Paste textarea 背景      | 面板底                 | `{colors.surface-elevated}`                                             |
| Paste textarea 字体      | mono tabular           | `{typography.numeric}`                                                  |
| Paste textarea 边框      | 1px 默认               | `{colors.border-default}`                                               |
| Paste textarea 圆角      | 6px                    | `{rounded.md}`                                                          |
| Upload zone 背景         | subtle                 | `{colors.surface-subtle}`                                               |
| Upload zone 边框         | 1px strong 虚线        | `{colors.border-strong}`                                                |
| Upload zone 拖入态       | 紫色 affordance        | `{colors.accent-tint}` + `{colors.accent-default}` border/text          |
| Preset chip hover 边框   | accent                 | `{colors.accent-default}`                                               |
| SSN banner 背景 / 边框   | critical tint + border | `{colors.severity-critical-tint}` / `{colors.severity-critical-border}` |
| Row overflow banner 背景 | medium tint            | `{colors.severity-medium-tint}`                                         |
| `[Continue →]`           | primary                | `button-primary`（[`../../../DESIGN.md`](../../../DESIGN.md) 行 90）    |
| `[Choose file]`          | secondary              | `button-secondary`                                                      |
| Hint 字体                | label                  | `{typography.label}` + `{colors.text-muted}`                            |

### 4.7 埋点

- `migration.wizard.step1.opened` · 触发：Step 1 首次渲染
- `migration.wizard.step1.continued` · 触发：`[Continue →]` 成功
- `migration.wizard.step1.ssn_blocked` · 触发：SSN 拦截命中，字段 `blocked_columns: string[]`
- `migration.wizard.step1.parse_failed` · 触发：解析失败错误分支

> 事件命名对齐 [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §3 KPI 表 + [`./10-conflict-resolutions.md#6-audit-action-命名与-ui-文案分层`](./10-conflict-resolutions.md#6-audit-action-命名与-ui-文案分层)；不进 Lingui extract。

---

## 5. Step 2 · AI Mapping

> 2026-05-25 更新：Step 2 的默认界面不再是完整字段表，而是
> `AI prepared your columns` 摘要。完整 mapping table、sample、confidence 和
> Edit 下拉保留在 `Review column details` 高级展开区。这样真实 onboarding
> 用户无需理解 `client.*` 内部字段，只有 low-confidence、fallback 或 bad rows
> 才会被主动推到主界面。

### 5.1 目标与状态机

- **目标**：展示 AI Mapper 摘要（导入列数、使用列数、忽略列数、平均置信度、EIN、例外数）；完整字段映射仅在高级展开区中允许 override；`[Re-run AI]`
- **状态机**：`loading → success | fallback_preset | error`

| 状态                        | 触发                  | 顶栏提示                                                    | `[Continue →]`           |
| --------------------------- | --------------------- | ----------------------------------------------------------- | ------------------------ |
| loading                     | 进入 Step 2 / Re-run  | Spinner + `Running AI Mapper…`                              | 禁用                     |
| success                     | Mapper 返回有效 JSON  | 摘要 + 若 low-confidence 行 > 0 → `{n} columns need review` | 启用                     |
| fallback_preset             | AI 失败且 Preset 已选 | 顶部 Banner（见 §5.4），仍显示摘要                          | 启用                     |
| fallback_preset (no preset) | AI 失败且无 Preset    | 顶部 Banner + 表头全部 `IGNORE`                             | 禁用（强制至少一列映射） |
| error                       | 网络 / 后端异常       | 红 Banner `Something went wrong. [Retry]`                   | 禁用                     |

### 5.2 线框

```
┌──────────────────────────────────────────────────────────────────────┐
│  Import clients · Step 2 of 4                             [Close ×]  │
│  ①──────② · · · ③ · · · ④                                            │
├──────────────────────────────────────────────────────────────────────┤
│  Review and confirm column mapping                 [AI Mapper]       │   ← {typography.title} + capability badge
│  Average confidence 92% · EIN detected 100%              [Re-run AI] │   ← 右侧 button-secondary；数值走 {typography.numeric}
│                                                          [Export ▼]  │
│                                                                      │
│  ⓘ 2 columns need your review                                        │   ← Banner：{colors.severity-medium-tint}；role="status"
│                                                                      │
│  ┌──────────────────┬───┬────────────────┬────────────┬───────────┐  │
│  │ Your column      │ → │ DueDateHQ field│ Confidence │ Sample    │  │   ← 表头：{typography.label} + {colors.text-secondary}
│  ├──────────────────┼───┼────────────────┼────────────┼───────────┤  │     表格行高 36px（Comfortable）
│  │ "Client Name"    │ → │ Client name    │  99% [H]   │ Acme LLC  │  │   ← 普通行；High 徽章背景 {colors.accent-tint}
│  │ "Tax ID"         │ → │ EIN ★          │  96% [H]   │12-3456789 │  │   ← ★ 徽章 {colors.accent-text}；sample 走 {typography.numeric}
│  │ "Ent Type"       │ → │ Entity type    │  94% [M]   │ LLC       │  │   ← Medium 徽章：{colors.severity-neutral-tint} + {colors.text-secondary}
│  │ "State/Juris"    │ → │ State          │  97% [H]   │ CA        │  │
│  │ "County"         │ → │ County         │  88% [M]   │ LA        │  │
│  │ "Resp"           │ → │ Assignee       │  76% [L]   │ Sarah     │  │   ← 行整条染 {colors.severity-medium-tint}（对齐 needs review 裁定）
│  │ "status LY"      │ → │ Ignored        │    —       │   —       │  │   ← Ignored：{colors.text-muted} + 斜体
│  │ "Notes"          │ → │ Notes          │  92% [H]   │ …         │  │
│  │                  │   │         [Edit ▾]                        │  │   ← 行内按钮每行末尾，ghost
│  └──────────────────┴───┴────────────────┴────────────┴───────────┘  │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  [← Back]                                          [Continue →]      │
└──────────────────────────────────────────────────────────────────────┘
```

**行内 `[Edit ▾]` 下拉**：

```
┌─ Popover · 宽 240px · Level 3 ────────────────┐
│  Map "Resp" to…                               │
│   ● Assignee          ← 当前选中              │
│   ○ Client name                               │
│   ○ County                                    │
│   ○ EIN                                       │
│   ○ Email                                     │
│   ○ Entity type                               │
│   ○ Estimated tax liability                   │
│   ○ Notes                                     │
│   ○ Owner count                               │
│   ○ Tax types                                 │
│   ○ …                                         │
│   ──────────────────────────                  │
│   ○ Ignore this column                        │
└───────────────────────────────────────────────┘
```

- UI 只展示用户可读字段名（Client name / EIN / State / Entity type 等）；`client.*`
  target 仅保留在内部 contract / audit payload 中。
- Edit 下拉内的可选字段按当前语言下用户可见 label 字母序排列；`Ignore this column`
  始终保留在分隔线后，作为最后的独立动作。
- 边缘项：`IGNORE`（分组线分隔；`{colors.text-muted}`）

**行 hover Popover（AI reasoning）**：

```
┌─ Popover · 0.5s hover delay · 宽 320px ───────┐
│  Why this mapping?                            │
│  "Column values match ##-####### EIN pattern  │
│   in 5/5 rows" — fast-json · conf 0.96        │   ← {typography.numeric}
│                                               │
│  Sample after transform                       │
│   12-3456789 → ein=12-3456789 (normalized)    │
└───────────────────────────────────────────────┘
```

### 5.3 置信度徽章三档

| 档           | 区间          | 背景                             | 文字                      | 行染色                                                                                                                                                                    |
| ------------ | ------------- | -------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High `[H]`   | `≥ 0.95`      | `{colors.accent-tint}`           | `{colors.accent-text}`    | 无                                                                                                                                                                        |
| Medium `[M]` | `0.80 – 0.94` | `{colors.severity-neutral-tint}` | `{colors.text-secondary}` | 无                                                                                                                                                                        |
| Low `[L]`    | `< 0.80`      | `{colors.severity-medium-tint}`  | `{colors.text-primary}`   | 整行 `{colors.severity-medium-tint}`（与 needs_review 对齐，见 [`./10-conflict-resolutions.md#3-t-s2-01-双指标口径`](./10-conflict-resolutions.md#3-t-s2-01-双指标口径)） |

- EIN `★` 徽章（行前缀）：`{colors.accent-text}` 字色 + 11px；始终渲染（不受置信度影响），对齐 T-S2-01 双指标
- 徽章圆角 `{rounded.sm}`；高 18px；与 Evidence Chip 同等量级（DueDateHQ-DESIGN §4.4 行 344–363）

### 5.4 fallback_preset 态 Banner

Step 2 标题右侧始终显示 capability badge，三种 badge 均使用 destructive/red 视觉。
badge 右侧必须有红色问号 icon；hover / focus 后展示该 badge 对应解释文案：

- `AI Mapper`：`AI Mapper means AI suggested the fields.`
- `Source template`：`Source template suggestions mean AI was unavailable and the selected source template filled defaults.`
- `Manual mapping`：`Manual mapping means no AI or source template result was available.`

```
┌─ role="alert" · aria-live="assertive" ──────────────────────────────┐
│  ⚠ We couldn't reach AI. Using your {preset} default mapping —       │   ← destructive/red alert；AI 不可用时必须红色提示
│     review and edit as needed.                                       │     文本 {colors.text-primary}
└──────────────────────────────────────────────────────────────────────┘
```

- Preset 未选时降级为只读表头（全部 `IGNORE`），强制用户手动映射（对齐 Part2B §9.2 降级策略）
- `[Re-run AI]` 按钮保持可点；点击走 exponential backoff

### 5.5 交互细节

- `[Re-run AI]`：secondary；每次用户 override 后按钮文案变为 `[Re-run AI with my overrides]`（更新 prompt context；对齐 [`./04-ai-prompts.md`](./04-ai-prompts.md)）
- `[Export mapping]`：下拉菜单（`Download mapping file` / `Copy to clipboard`），文件含 mapping + confidence + reasoning + model + prompt_version；服务于 audit trail / debug
- 冲突裁定联动：EIN 识别率 = 100%（[`./10-conflict-resolutions.md#3-t-s2-01-双指标口径`](./10-conflict-resolutions.md#3-t-s2-01-双指标口径)）；低置信度行**非阻塞**但顶部 Banner 高亮计数

### 5.6 文案表（EN + zh-CN + Lingui 宏）

| 字段                              | EN 原文                                                                                                 | zh-CN 对照                                                   | 宏                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------- |
| Title                             | `Review and confirm column mapping`                                                                     | `请审阅并确认字段映射`                                       | `<Trans>`                   |
| Capability badge                  | `AI Mapper` / `Source template` / `Manual mapping`                                                      | `AI 映射` / `来源模板` / `手动映射`                          | `<Trans>`                   |
| Capability helper · AI            | `AI Mapper means AI suggested the fields.`                                                              | `AI Mapper 表示 AI 建议了字段。`                             | `<Trans>`                   |
| Capability helper · Preset        | `Source template suggestions mean AI was unavailable and the selected source template filled defaults.` | `来源模板建议表示 AI 不可用，已由所选来源模板填入默认映射。` | `<Trans>`                   |
| Capability helper · Manual        | `Manual mapping means no AI or source template result was available.`                                   | `手动映射表示没有可用的 AI 或来源模板结果。`                 | `<Trans>`                   |
| Subtitle（metrics）               | `Average confidence {avg}% · EIN detected {einPct}%`                                                    | `平均置信度 {avg}% · EIN 识别率 {einPct}%`                   | `<Trans>` + `<Plural>` 可选 |
| Primary CTA                       | `Continue →`                                                                                            | `下一步 →`                                                   | `<Trans>`                   |
| Secondary CTA                     | `Re-run AI` / `Re-run AI with my overrides`                                                             | `重新运行 AI` / `带上我的修改重跑 AI`                        | `<Trans>`                   |
| Export menu                       | `Export mapping ▼` → `Download mapping file` / `Copy to clipboard`                                      | `导出映射 ▼` → `下载映射文件` / `复制到剪贴板`               | `<Trans>`                   |
| Low-conf banner                   | `{count, plural, one {# column needs your review} other {# columns need your review}}`                  | `{count} 列需要你复核`                                       | `<Plural>`                  |
| Fallback banner                   | `We couldn't reach AI. Using your {preset} default mapping — review and edit as needed.`                | `无法连接 AI，已使用 {preset} 默认映射 —— 请按需修改。`      | `<Trans>`                   |
| Error state                       | `Something went wrong while mapping. Retry?`                                                            | `字段映射失败，要重试吗？`                                   | `<Trans>`                   |
| Reasoning popover title           | `Why this mapping?`                                                                                     | `AI 为什么这样映射？`                                        | `<Trans>`                   |
| Row hover: Sample after transform | `Sample after transform`                                                                                | `转换后样例`                                                 | `<Trans>`                   |
| Edit popover title                | `Map "{column}" to…`                                                                                    | `把 "{column}" 映射到…`                                      | `<Trans>`                   |
| Edit popover: ignore              | `Ignore this column`                                                                                    | `忽略该列`                                                   | `<Trans>`                   |

### 5.7 键盘 / a11y

- 表格 `role="table"` + `<caption>` 隐藏给 SR：`AI-generated column mapping, {rows} rows`
- 行内 `[Edit ▾]`：`aria-haspopup="listbox"` + `aria-expanded`；`↑/↓` 在选项间移动，`Enter` 选中
- Low-conf banner `aria-live="polite"`；fallback banner `aria-live="assertive"`
- Focus ring：`:focus-visible` 使用 `{colors.accent-default}` 2px outline

### 5.8 Token 映射表

| 区域                   | 规格             | Token                                                                       |
| ---------------------- | ---------------- | --------------------------------------------------------------------------- |
| 表头字体               | 11/500 upper     | `{typography.label}`                                                        |
| 表格行高               | Comfortable 36px | — （对齐 DueDateHQ-DESIGN §5.3）                                            |
| sample 列字体          | mono tabular     | `{typography.numeric}`                                                      |
| High 徽章              | 背景 / 文字      | `{colors.accent-tint}` / `{colors.accent-text}`                             |
| Medium 徽章            | 背景 / 文字      | `{colors.severity-neutral-tint}` / `{colors.text-secondary}`                |
| Low 徽章 + 行底色      | 背景 / 文字      | `{colors.severity-medium-tint}` / `{colors.text-primary}`                   |
| `★` EIN 徽章           | 字色             | `{colors.accent-text}`                                                      |
| IGNORED 文本           | 斜体 muted       | `{colors.text-muted}`                                                       |
| Popover                | Level 3 容器     | `{colors.surface-elevated}` + 1px `{colors.border-strong}` + `{rounded.lg}` |
| Reasoning popover 字体 | mono             | `{typography.numeric}`                                                      |
| Re-run button          | secondary        | `button-secondary`                                                          |

### 5.9 埋点

- `migration.wizard.step2.opened`
- `migration.wizard.step2.continued`
- `migration.mapper.run.completed` · 字段：`avg_confidence: number`, `ein_detection_rate: number`, `rerun_count: number`, `manual_override_count: number`, `model: string`, `prompt_version: string`（对齐 [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §3 与 [`./10-conflict-resolutions.md#3-t-s2-01-双指标口径`](./10-conflict-resolutions.md#3-t-s2-01-双指标口径)）
- `migration.mapper.fallback_preset_used`
- `migration.mapper.confirmed`（对齐 [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §4.3 工程 log）

---

## 6. Step 3 · Normalize & Resolve

> 2026-05-25 更新：Step 3 的默认界面改为 `AI cleaned your values` 摘要。
> Normalizer 输出按 normalized value group 聚合，例如 `L.L.C. / LLC → LLC · 86
clients`。低置信、未识别、safe fallback 才进入 exception summary。Default
> Matrix 默认应用；逐组开关保留在 `Adjust tax type defaults`
> 高级展开区。
> 2026-05-25 补充：确定性的 normalizer miss 不进入用户可见 exception。带点州缩写
> （如 `C.A.`）直接修复成 DueDateHQ 内部州代码（`CA`）；明确的 return type
> （如 `Form 990`）直接修复成 tax type id（`federal_990`）。只有无法确定的值才显示
> needs-review 摘要。
> 2026-05-25 补充：value group 明细默认折叠；Step 3 默认只展示 summary
> cards、exception summary 和展开入口。

### 6.1 目标与状态机

- **目标**：展示 AI 归一 summary（value groups、ready groups、needs review、affected clients）；按组解释 safe fallback；Default Matrix 摘要优先，允许展开调整 tax type defaults
- **状态机**：`idle → saving → ready`（Normalize 出错降级见 §6.5）

### 6.2 线框

```
┌──────────────────────────────────────────────────────────────────────┐
│  Import clients · Step 3 of 4                             [Close ×]  │
│  ①──────②──────③ · · · ④                                             │
├──────────────────────────────────────────────────────────────────────┤
│  We organized 47 values — review if needed                           │   ← {typography.title}
│                                                                      │
│  Entity types                                                        │   ← 区块标题：{typography.label} + uppercase
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ "L.L.C.", "llc", "LLC" (12 rows)   → LLC          [edit] [e] │    │   ← [e] = Evidence Chip（见 §6.3）
│  │ "Corp (S)", "S Corp" (8 rows)      → S-Corp       [edit] [e] │    │
│  │ "Partnership", "Ptnr" (5 rows)     → Partnership  [edit] [e] │    │
│  │ ⚠ "LP" (2 rows)                    → Needs review [review]   │    │   ← 行背景 {colors.severity-medium-tint}；needs_review pill
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  States                                                              │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ "California", "Calif", "CA" (18)   → CA           [edit] [e] │    │
│  │ "NY", "New York" (10)              → NY           [edit] [e] │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Suggested tax types (from entity × state matrix)                    │   ← {typography.label}
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Default tax type suggestions apply only where imported rows    │
│  │ rows do not already include tax types.                        │
│  │ 12 LLC × CA clients                                          │    │
│  │   → CA Franchise · CA LLC Fee · Fed 1065  [✓ Use suggested filings] [e] │ ← tax type chips（高 18px）
│  │                                                              │    │
│  │  5 S-Corp × NY clients                                       │    │
│  │   → NY CT-3-S · NY PTET · Fed 1120-S [✓ Use suggested filings] [e] │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Conflicts (3)                                                       │   ← {typography.label}
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ • "Acme LLC" matches existing client ID 42                   │    │
│  │   [Merge]  [Overwrite]  [● Skip]  [Create as new]            │    │   ← 默认 Skip（最安全）；button 组高 28px
│  │     tip: merge appends fields     tip: overwrite replaces    │    │   ← hover tooltip 每个按钮
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  [← Back]                                          [Continue →]      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.3 needs_review 与 Evidence Chip

**needs_review pill（归一置信度 `< 0.5`）**：

- 背景 `{colors.severity-medium-tint}` + 文字 `{colors.text-primary}`；高 18px；`{rounded.sm}`
- hover Popover（320px，Level 3）：展示候选值（Top 3） + Evidence Chip 指向 `source_type=ai_migration_normalize` 的 evidence（含 `model` + `confidence`）

**Evidence Chip `[e]`（每条归一决策右侧）**：

- 严格遵循 DueDateHQ-DESIGN §4.4 行 344–363：高 18px；font `{typography.numeric}` 10px；1px 边框 + 无背景
- 示例 chip 文本：`AI · fast-json · 0.93`
- 缺 `source_url + verified_at + verbatim_quote` 的场景 → **按 DueDateHQ-DESIGN §8.3（No Provenance = No Render）降级**为：

  ```
  ⚠ Verification needed    [Ask human to verify]
  ```

  底色 `{colors.severity-medium-tint}`；文字 `{colors.text-primary}`

**Verbatim Quote Popover（长按 chip · 0.5s delay · 320px）** 对齐 DueDateHQ-DESIGN §8.2 行 525–541：

```
┌─── Normalizer decision: "LP" → Limited Partnership ───┐
│  "LP" matches 0.93 similarity to enum                 │
│   'Limited Partnership' (dictionary v2)               │
│                                                       │
│  fast-json · 2026-04-24T10:12:00Z                      │   ← {typography.numeric}
│  [Copy as evidence]                                   │
└───────────────────────────────────────────────────────┘
```

### 6.4 Default Matrix Group Toggle

- 默认勾选（兑现 §6A.5 "无需额外配置"）：Default Matrix 只对导入行中缺失 `client.tax_types` 的客户补全税种
- 可逐 group 取消：取消 `Use suggested filings` 表示该 `(entity_type, state)` group 下缺 `tax_types` 的客户不使用 Default Matrix 自动补全，也不会在 Step 4 生成对应 obligations
- 用户 CSV / paste 已明确提供 `client.tax_types` 的行不受该开关影响
- 前端选择通过 `applyDefaultMatrix({ matrixSelections })` 写入 `migration_batch.mapping_json.matrixApplied[].enabled`；`dryRun` 与最终 `apply` 必须消费同一份 enabled 状态，禁止前端本地假状态
- 键盘快捷键 `A` = 对当前聚焦的 suggestion group 切换 `Use suggested filings`（`aria-keyshortcuts="A"`）
- 冲突解决按钮组默认 **`Skip`**（最安全）；Owner 可在 Settings 修改默认为 `Create as new`（Phase 0 扩展位，Demo Sprint 不渲染 Settings 面板）

### 6.5 错误 / 降级

- Normalizer 调用失败 → 展示本地字典 fallback + Banner `We couldn't reach AI for some values. Using dictionary fallback — please review.`；不阻塞 `[Continue →]`
- needs_review 行 > 20 时区块自动折叠（`<details open>`），顶部 `{count} need review · [Expand]`

### 6.6 文案表（EN + zh-CN + Lingui 宏）

| 字段                         | EN 原文                                                                                         | zh-CN 对照                                      | 宏                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------- |
| Title                        | `We organized {count} values — review if needed`                                                | `已整理 {count} 个字段值 —— 需要的话请复核`     | `<Trans>` + `<Plural>` |
| Section: Entity types        | `Entity types`                                                                                  | `实体类型`                                      | `<Trans>`              |
| Section: States              | `States`                                                                                        | `州`                                            | `<Trans>`              |
| Section: Suggested tax types | `Suggested tax types (from entity × state matrix)`                                              | `建议的税种（由实体 × 州矩阵推断）`             | `<Trans>`              |
| Default Matrix note          | `Default tax type suggestions apply only where imported rows do not already include tax types.` | `默认税种建议仅在导入行没有税种时应用。`        | `<Trans>`              |
| Tax type group toggle        | `Use suggested filings`                                                                         | `使用建议申报类型`                              | `<Trans>`              |
| Section: Conflicts           | `Conflicts ({count})`                                                                           | `冲突（{count}）`                               | `<Plural>`             |
| Needs review pill            | `Needs review`                                                                                  | `待复核`                                        | `<Trans>`              |
| Conflict CTA: Merge          | `Merge` (tooltip `Append new fields without overwriting`)                                       | `合并` / `将新字段补齐到现有客户，不覆盖已有值` | `<Trans>`              |
| Conflict CTA: Overwrite      | `Overwrite` (tooltip `Replace existing values with new ones`)                                   | `覆盖` / `用新值替换已有字段`                   | `<Trans>`              |
| Conflict CTA: Skip           | `Skip` (tooltip `Leave existing client untouched`)                                              | `跳过` / `保留现有客户不变`                     | `<Trans>`              |
| Conflict CTA: Create as new  | `Create as new` (tooltip `Create a new client; existing one stays`)                             | `另存为新客户` / `新建客户，不影响现有客户`     | `<Trans>`              |
| Fallback banner              | `We couldn't reach AI for some values. Using dictionary fallback — please review.`              | `部分值无法调用 AI，已使用字典降级 —— 请复核。` | `<Trans>`              |
| Verification needed          | `Verification needed`                                                                           | `需要人工验证`                                  | `<Trans>`              |
| Primary CTA                  | `Continue →`                                                                                    | `下一步 →`                                      | `<Trans>`              |
| Secondary CTA                | `← Back`                                                                                        | `← 返回`                                        | `<Trans>`              |

### 6.7 键盘 / a11y

- Suggested tax types 区块 `role="group"` + `aria-labelledby`；tax type chip 不进入 tab order
- `Use suggested filings` checkbox 使用项目 `Checkbox` primitive，label 暴露 `aria-keyshortcuts="A"`
- 冲突按钮组 `role="radiogroup"`；默认选中 `Skip` 带 `aria-checked="true"`
- needs_review pill hover Popover：`role="tooltip"`；键盘用 Enter / Space 打开；`Esc` 关闭

### 6.8 Token 映射表

| 区域                                      | 规格                          | Token                                                                     |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| 区块标题字体                              | 11/500 upper                  | `{typography.label}`                                                      |
| 区块容器背景                              | Panel                         | `{colors.surface-panel}` + 1px `{colors.border-default}` + `{rounded.md}` |
| needs_review pill 背景 / 文字             | medium tint                   | `{colors.severity-medium-tint}` / `{colors.text-primary}`                 |
| Evidence chip 样式                        | 遵 `evidence-chip` 组件 token | `evidence-chip`（[`../../../DESIGN.md`](../../../DESIGN.md) 行 115）      |
| Verification-needed 降级                  | pill + 次级按钮               | `{colors.severity-medium-tint}` + `button-secondary`                      |
| Conflict Merge/Overwrite/Skip/CreateAsNew | 按钮组 radio                  | `button-secondary` + 选中 `{colors.accent-tint}` 背景                     |
| Tax type group checkbox                   | 16px checkbox + label         | `components.checkbox-*` + `{colors.text-secondary}`                       |
| tax type chip                             | 18px 高 mono                  | `{typography.numeric}` + `{rounded.sm}` + `{colors.surface-elevated}`     |

### 6.9 埋点

- `migration.wizard.step3.opened`
- `migration.wizard.step3.continued`
- `migration.normalize.reviewed` · 字段：`override_count`, `needs_review_count`, `dictionary_fallback_used: boolean`
- `migration.normalize.conflicts_resolved` · 字段：`merge`, `overwrite`, `skip`, `create_as_new`（四类计数）
- `migration.matrix.applied` · 字段：`enabled_cells`, `disabled_cells`, `clients_affected`；对齐 [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §4.3
- `migration.normalizer.confirmed`

---

## 7. Step 4 · Dry-Run + Live Genesis

### 7.1 目标与状态机

- **目标**：展示即将创建的 counts + 顶部风险预览 + Safety 三条 + 触发 Live Genesis
- **状态机**：`preview → importing → success → toast_persisted`；失败 `import_failed`

| 状态            | 视觉                                                                              | CTA                                                 |
| --------------- | --------------------------------------------------------------------------------- | --------------------------------------------------- |
| preview         | 见 §7.2 线框                                                                      | `[Import & Generate deadlines ▶]` 启用（primary）   |
| importing       | Modal 锁定交互 + Stepper 高亮步 4 + spinner；底栏 `Importing… please don't close` | CTA 禁用 + spinner                                  |
| success         | 过渡到 Live Genesis 动画（见 §7.3）                                               | —                                                   |
| toast_persisted | 跳 Dashboard + 顶部常驻 toast 24h                                                 | `[View audit]` / `[Undo all]`                       |
| import_failed   | 红 Banner + 失败计数                                                              | `[Review errors]` 跳 `/migration/<batch_id>/errors` |

### 7.2 线框（preview 态）

```
┌──────────────────────────────────────────────────────────────────────┐
│  Import clients · Step 4 of 4                             [Close ×]  │
│  ①──────②──────③──────④                                              │
├──────────────────────────────────────────────────────────────────────┤
│  Ready to import                                                     │   ← {typography.title}
│                                                                      │
│  You're about to create                                              │
│    • 30 clients                                                      │   ← 数值走 {typography.numeric}
│    • 118 obligations monitored from May 29, 2026                     │
│    • 9 past deadlines will be created as next monitoring deadlines   │   ← 仅 rolled > 0 时显示
│    • 3 historical deadlines could not be created                     │   ← 仅 true skipped > 0 时显示
│    • Est. $19,200 total exposure this quarter                        │   ← $ 金额 {typography.numeric} + {colors.text-primary}
│                                                                      │
│  Top risk (this week)                                                │   ← {typography.label}
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ CRITICAL  Acme LLC — CA Franchise Tax   $4,200    3 days  [e]│    │   ← risk-row-critical 组件：{colors.severity-critical-tint}
│  │ HIGH      Bright Studio — 1120-S        $2,800    5 days  [e]│    │   ← risk-row-high（类 DESIGN §7）
│  │ HIGH      Zen Holdings — Q1 Est.        $1,650    6 days  [e]│    │
│  └──────────────────────────────────────────────────────────────┘    │
│  [See all 152 →]                                                     │   ← ghost 按钮；打开右侧 Drawer（宽 400px，Level 3）
│                                                                      │
│  Safety                                                              │   ← {typography.label}
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  ✓  One-click revert available for 24 hours                  │    │   ← ✓ 色 {colors.status-done}；文本 {colors.text-primary}
│  │  ✓  Audit log captures every AI decision                     │    │
│  │  ✓  No emails will be sent automatically                     │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  [← Back]                   [Import & Generate deadlines ▶]          │   ← primary；hover {colors.accent-hover}
└──────────────────────────────────────────────────────────────────────┘
```

### 7.3 Live Genesis 入口与成功后状态

> 动画详细规格（时序 / 粒子参数 / rAF tween / `prefers-reduced-motion`）由 [`./07-live-genesis.md`](./07-live-genesis.md) 定义；**本文件只定义 UX 入口 + 成功状态**。

**触发顺序**：

1. 点击 `[Import & Generate deadlines ▶]` → 调用 `rpc.migration.apply`（事务内 insert clients + obligations + evidence_link + audit_event；对齐 PRD Part1B §6A.7 行 301–317）
2. 4 – 6 秒动画：
   - Wizard 淡出（300ms）→ Dashboard 布局淡入（300ms）
   - 粒子（每张 deadline 卡片发射 `+$X` 标签）弧线飞入顶栏（[`../../PRD/DueDateHQ-PRD-v2.0-Part2A.md`](../../PRD/DueDateHQ-PRD-v2.0-Part2A.md) §7.5.6）
   - 顶栏 Deadline Radar odometer：`$0 → $19,200`（stagger 80ms；每位 `cubic-bezier(0.34, 1.56, 0.64, 1)`）
3. 动画结束 → Dashboard，`This Week` tab 默认选中第 1 条 obligation

**`prefers-reduced-motion: reduce`**：

- 关闭粒子 + 弧线轨迹
- 保留 $ 数字 0.3s fade-in + Toast 替代庆祝反馈
- Stepper 与 Wizard 直接瞬时切换到 Dashboard
- 详细降级在 [`./07-live-genesis.md`](./07-live-genesis.md) §3.x

### 7.4 持久 Toast（24h）

```
┌─ Toast · Level 3 · 固定顶栏下 · 宽 720px · {rounded.md} ─────────────┐
│  ✓ Imported 30 clients, 152 obligations, $19,200 at risk.            │   ← ✓ 色 {colors.status-done}
│                                      [View audit]      [Undo all]    │   ← [View audit] ghost；[Undo all] destructive（Owner / Manager 可见）
└──────────────────────────────────────────────────────────────────────┘
```

- 背景 `{colors.surface-elevated}` + 1px `{colors.border-strong}` + shadow Level 3
- 数值走 `{typography.numeric}`
- `[Undo all]`：**Owner + Manager**（对齐裁定 1，见 [`./10-conflict-resolutions.md#1-revert-24h-全量撤销权限`](./10-conflict-resolutions.md#1-revert-24h-全量撤销权限)）；Preparer / Coordinator 不渲染该按钮
- 24h 后 `[Undo all]` 灰化 → `{colors.text-disabled}` + `cursor: not-allowed`；hover tooltip：

  ```
  This import can no longer be fully reverted.
  You can still delete individual clients.
  ```

- `[View audit]` → 打开 Audit detail；batch recovery 从 `/clients` 的 Import history drawer 进入

### 7.5 import_failed 态

```
┌─ role="alert" · aria-live="assertive" ──────────────────────────────┐
│  ✕ Import failed for 3 of 30 rows.                                   │   ← 背景 {colors.severity-critical-tint}；边框 {colors.severity-critical-border}
│     27 clients created successfully.  [Review errors]  [Retry all]   │
└──────────────────────────────────────────────────────────────────────┘
```

- `[Review errors]` → R2 下载 CSV `/migration/<batch_id>/errors`
- 单行失败不阻塞整批（PRD Part1B §6A.7 行 320"单行失败不阻塞"）

### 7.6 文案表（EN + zh-CN + Lingui 宏）

| 字段                  | EN 原文                                                                                                                          | zh-CN 对照                                                                                          | 宏                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------- |
| Title                 | `Ready to import`                                                                                                                | `准备就绪，开始导入`                                                                                | `<Trans>`                  |
| Summary line 1        | `You're about to create`                                                                                                         | `你即将创建`                                                                                        | `<Trans>`                  |
| Summary counts        | `{clients} clients · {obligations} obligations monitored from {monitoringStartDate} · Est. {amount} total exposure this quarter` | `{clients} 个客户 · 从 {monitoringStartDate} 起监控 {obligations} 条义务 · 本季度预计敞口 {amount}` | `<Plural>` × 2 + `<Trans>` |
| Rolled forward        | `{count} past deadlines will be created as next monitoring deadlines`                                                            | `{count} 条已过截止日会创建为下一期可监控截止日`                                                    | `<Plural>`                 |
| Historical skipped    | `{count} historical deadlines could not be created`                                                                              | `{count} 条历史截止日无法自动创建`                                                                  | `<Plural>`                 |
| Top-risk section      | `Top risk (this week)`                                                                                                           | `本周最高风险`                                                                                      | `<Trans>`                  |
| See-all CTA           | `See all {count} →`                                                                                                              | `查看全部 {count} 条 →`                                                                             | `<Plural>`                 |
| Safety header         | `Safety`                                                                                                                         | `安全保障`                                                                                          | `<Trans>`                  |
| Safety 1              | `One-click revert available for 24 hours`                                                                                        | `24 小时内可一键撤销`                                                                               | `<Trans>`                  |
| Safety 2              | `Audit log captures every AI decision`                                                                                           | `审计日志记录每一次 AI 决策`                                                                        | `<Trans>`                  |
| Safety 3              | `No emails will be sent automatically`                                                                                           | `不会自动发送任何邮件`                                                                              | `<Trans>`                  |
| Primary CTA           | `Import & Generate deadlines ▶`                                                                                                  | `导入并生成截止日历 ▶`                                                                              | `<Trans>`                  |
| Secondary CTA         | `← Back`                                                                                                                         | `← 返回`                                                                                            | `<Trans>`                  |
| Toast success         | `Imported {clients} clients, {obligations} obligations, {amount} at risk.`                                                       | `已导入 {clients} 个客户、{obligations} 条义务，敞口 {amount}。`                                    | `<Plural>` + `<Trans>`     |
| Toast actions         | `View audit` / `Undo all`                                                                                                        | `查看审计` / `全部撤销`                                                                             | `<Trans>`                  |
| Undo disabled tooltip | `This import can no longer be fully reverted. You can still delete individual clients.`                                          | `此次导入已超过 24 小时不能整体撤销。你仍可单独删除客户。`                                          | `<Trans>`                  |
| Import failed banner  | `Import failed for {failed} of {total} rows. {ok} clients created successfully.`                                                 | `{total} 行中有 {failed} 行导入失败，{ok} 个客户已成功创建。`                                       | `<Plural>`                 |
| Importing (disabled)  | `Importing… please don't close`                                                                                                  | `正在导入…请不要关闭`                                                                               | `<Trans>`                  |
| Empty Top-risk state  | `No at-risk obligations this week. Scroll down for upcoming month view.`                                                         | `本周无高风险义务，可向下滚动查看本月。`                                                            | `<Trans>`                  |

### 7.7 键盘 / a11y

- `Enter`（焦点在非按钮元素时）= `[Import & Generate deadlines ▶]`
- `Esc`：preview 态打开关闭确认；**importing + 动画期间失效**（防止撤销到半态）
- 动画完成时 `aria-live="polite"` 广播：`Imported 30 clients, 152 obligations, 19200 deadline risk.`
- 失败 banner `role="alert"` + `aria-live="assertive"`
- 粒子动画 `aria-hidden="true"` + `pointer-events: none`（对齐 DueDateHQ-DESIGN §7.5.6.7 行 335）

### 7.8 Token 映射表

| 区域                                     | 规格            | Token                                                                                                                                                                          |
| ---------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 数值字体                                 | mono tabular    | `{typography.numeric}`                                                                                                                                                         |
| Hero metric（$19,200 on top of summary） | —               | 保持 body 态；Live Genesis 动画接管后切到 `hero-metric` token                                                                                                                  |
| Top-risk rows                            | critical / high | `risk-row-critical`（[`../../../DESIGN.md`](../../../DESIGN.md) 行 103） + 同族 `risk-row-high`（token 回灌见 [`./09-design-system-deltas.md`](./09-design-system-deltas.md)） |
| Safety ✓ 色                              | done            | `{colors.status-done}`                                                                                                                                                         |
| Primary CTA                              | accent          | `button-primary`                                                                                                                                                               |
| Toast 容器                               | Level 3         | `{colors.surface-elevated}` + 1px `{colors.border-strong}` + `{rounded.md}`                                                                                                    |
| Toast `[Undo all]` disabled              | muted           | `{colors.text-disabled}`                                                                                                                                                       |
| import_failed banner 背景                | critical tint   | `{colors.severity-critical-tint}`                                                                                                                                              |

### 7.9 埋点

- `migration.wizard.step4.opened`
- `migration.dryrun.previewed`
- `migration.imported` · 同时是 audit action（Part2B §13.2.1）；字段：`clients: number`, `obligations: number`, `exposure_cents: number`, `preset: string`, `duration_ms: number`
- `migration.import_failed` · 字段：`failed_count`, `total_count`, `first_error_code`
- `dashboard.penalty_radar.first_rendered` · 由 Dashboard 模块 emit（对齐 [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §3 KPI 表第 1 行）

---

## 8. Revert UX（24h 全量 + 7d 单客户）

### 8.1 入口矩阵（对齐 [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §5 + Part1A §3.6.3）

| 入口                               | 权限                        | 触发路径                                  | 备注                      |
| ---------------------------------- | --------------------------- | ----------------------------------------- | ------------------------- |
| Import 完成持久 Toast `[Undo all]` | Owner + Manager             | Step 4 → Toast                            | 24h 内有效                |
| Import history drawer `[Revert]`   | Owner + Manager（24h 全量） | `/clients?importHistory=open` → batch row | 同上                      |
| 单客户详情页 `[Delete client]`     | Owner + Manager             | `/clients/{id}` → 右上                    | 7d 软删 + 级联 obligation |

> Demo Sprint Owner 单账号下 Manager 分支不渲染，但长期 RBAC 规格必须就位。

### 8.2 确认 Modal · 24h 全量

```
┌─ Modal · role="alertdialog" · 宽 480px · Level 4 ────────────────────┐
│  Undo import?                                                        │   ← {typography.title}
│                                                                      │
│  This will delete {clients} clients and {obligations} obligations.   │   ← {typography.body}
│  This action is logged.                                              │
│                                                                      │
│                              [Keep import]    [Undo all]             │   ← 右按钮 destructive：{colors.severity-critical}
└──────────────────────────────────────────────────────────────────────┘
```

- `[Undo all]` 按钮色 `{colors.severity-critical}` + 白字（对齐 DueDateHQ-DESIGN §4.8 Destructive）；`aria-describedby` 指向 body 文本
- 成功后写 `audit_event migration.reverted` + evidence_link `source_type=migration_revert`

### 8.3 确认 Modal · 7d 单客户

```
┌─ Modal · 宽 480px · Level 4 ─────────────────────────────────────────┐
│  Delete {client_name}?                                               │
│                                                                      │
│  This will remove {obligations} obligations from active work.         │
│  Recoverable for 7 days from Settings.                               │
│                                                                      │
│                                         [Cancel]   [Delete client]   │   ← [Delete client] destructive
└──────────────────────────────────────────────────────────────────────┘
```

- 成功后写 `audit_event migration.single_undo`
- 7 天后灰化入口（与 24h 同策略）

### 8.4 状态机

```
Toast 持久态  ──24h──>  Expired（Undo all 灰化）
        │
        └── [Undo all] 点击 ─> Confirm Modal ─> reverting ─> reverted（toast 消失 + Dashboard 计数归零）
                                                  │
                                                  └── 失败 → error Banner "Revert failed. Contact support."
单客户详情页  ─── [Delete client] ─> Confirm Modal ─> deleting ─> deleted（列表消失；Undo in Settings）
        │
        └── 7d 后按钮隐藏（入口不再渲染）
```

### 8.5 文案表（EN + zh-CN + Lingui 宏）

| 字段            | EN 原文                                                                                              | zh-CN 对照                                                              | 宏             |
| --------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------- |
| 24h title       | `Undo import?`                                                                                       | `要撤销此次导入吗？`                                                    | `<Trans>`      |
| 24h body        | `This will delete {clients} clients and {obligations} obligations. This action is logged.`           | `这将删除 {clients} 个客户和 {obligations} 条义务。操作已被记录。`      | `<Plural>` × 2 |
| 24h CTAs        | `Keep import` / `Undo all`                                                                           | `保留导入` / `全部撤销`                                                 | `<Trans>`      |
| 7d title        | `Delete {client_name}?`                                                                              | `要删除 {client_name} 吗？`                                             | `<Trans>`      |
| 7d body         | `This will remove {obligations} obligations from active work. Recoverable for 7 days from Settings.` | `这会将 {obligations} 条义务从当前工作中移除。7 天内可在"设置"中恢复。` | `<Plural>`     |
| 7d CTAs         | `Cancel` / `Delete client`                                                                           | `取消` / `删除客户`                                                     | `<Trans>`      |
| Revert failed   | `Revert failed. Contact support.`                                                                    | `撤销失败，请联系支持。`                                                | `<Trans>`      |
| Expired tooltip | `This import can no longer be fully reverted. You can still delete individual clients.`              | `此次导入已超过 24 小时不能整体撤销。你仍可单独删除客户。`              | `<Trans>`      |

### 8.6 a11y

- 两个 Modal 均 `role="alertdialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`
- Destructive 按钮 `aria-describedby` 指向影响描述，避免视觉弱用户误点
- Focus 进入时默认落在**非 destructive** 按钮（`Keep import` / `Cancel`）

---

## 9. 全局键盘速查

| 键                  | 行为                                                                                                  | 适用步骤                   | 来源                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| `Tab` / `Shift+Tab` | 在 Wizard 内循环焦点（Focus trap）                                                                    | 全部                       | [`./01-mvp-and-journeys.md`](./01-mvp-and-journeys.md) §7.3 + DueDateHQ-DESIGN §13（a11y） |
| `Enter`             | 提交当前步（等价 `[Continue →]` / Step 4 = `[Import ▶]`）；焦点在 textarea / contenteditable 时不劫持 | 全部                       | PRD Part2A §7.7 行 390                                                                     |
| `Esc`               | 空白向导直接关闭；已有导入工作时打开关闭确认（非 destructive）；Step 4 animation 期间失效             | 全部                       | DueDateHQ-DESIGN §13 + 本文 §2.3                                                           |
| `Cmd/Ctrl + K`      | 命令面板（向导内可用但不建议；对齐 Part2A §7.6 行 375–377）                                           | 全部                       | PRD Part2A §7.6                                                                            |
| `?`                 | 快捷键帮助浮层                                                                                        | 全部（非 textarea 焦点时） | PRD Part2A §7.7 行 384                                                                     |
| `Cmd/Ctrl + V`      | 粘贴（textarea 默认）                                                                                 | Step 1                     | PRD Part1B §6A.6 Step 1                                                                    |
| `1` - `4`           | 不跳步骤（禁用）；若按下 → 广播 "Use Back to return."                                                 | 全部                       | 本文 §2.3                                                                                  |
| `↑` / `↓`           | 在 Edit 下拉选项间移动                                                                                | Step 2 / Step 3            | 本文 §5.2                                                                                  |
| `Enter` / `Space`   | 选中 Edit 下拉当前项 / 触发 needs_review Popover                                                      | Step 2 / Step 3            | 本文 §5.7 / §6.7                                                                           |

> 与 `G then D` / `G then W` 等全局导航快捷键（PRD Part2A §7.7 行 396–400）在 Wizard 内**禁用**，避免导出向导意外导航。
> 实现归属：Wizard 的 `Enter` / `Esc` 由 app keyboard shell 的 overlay scope 统一注册；禁止在子组件里直接挂全局 `keydown` listener。

---

## 10. Token 回灌清单（链到 09）

本文件用到但 [`../../../DESIGN.md`](../../../DESIGN.md) 尚未定义的组件 token，规格**统一在** [`./09-design-system-deltas.md`](./09-design-system-deltas.md) 维护，本文件仅引用 token 名：

| Token 名           | 用途                                                                  | 本文件锚点                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stepper`          | 4 步水平步骤条（active / done / upcoming / error / disabled 五态）    | §2.2 · [`./09-design-system-deltas.md#stepper`](./09-design-system-deltas.md#stepper)                                                                           |
| `confidence-badge` | AI Mapper High / Medium / Low 三档 + EIN `★`                          | §5.3 · [`./09-design-system-deltas.md#confidence-badge`](./09-design-system-deltas.md#confidence-badge)                                                         |
| `toast`            | Step 4 持久 Toast（24h）                                              | §7.4 · [`./09-design-system-deltas.md#toast`](./09-design-system-deltas.md#toast)                                                                               |
| `genesis-odometer` | 顶栏 Deadline Radar 数值滚动                                          | §7.3 · [`./09-design-system-deltas.md#genesis-odometer`](./09-design-system-deltas.md#genesis-odometer)                                                         |
| `email-shell`      | Migration Report 战报邮件容器（本文不定义，但 Safety 文案与邮件同源） | — · [`./08-migration-report-email.md`](./08-migration-report-email.md) + [`./09-design-system-deltas.md#email-shell`](./09-design-system-deltas.md#email-shell) |
| `risk-row-high`    | Step 4 Top-risk 列表 High 档行（现有 `risk-row-critical` 的同族）     | §7.8 · [`./09-design-system-deltas.md#risk-row-high`](./09-design-system-deltas.md#risk-row-high)                                                               |

> 规格（尺寸 / 色 / 字体 / 状态）以 09 为唯一事实源；本文件若与 09 冲突，以 09 为准，同时在 09 回标 PR 号。

---

## 11. Phase 0 扩展位（本轮不展开）

- **Manager 进入 Import / Revert 路径的可见性开关**（对齐 Part1A §3.6.3 Migration Import / Revert ✓；Demo Sprint 单 Owner 不渲染 Manager 分支，Phase 0 起需要在 Wizard 容器的权限 guard 打开）
- **Preset 自定义（第 6 位 `Custom CSV template`）**：用户上传字段模板 + 保存为个人 Preset
- **多 firm 切换时进行中 draft 的跨 firm 可见性提示**（对齐 Part1A §3.6.4 多事务所切换）
- **Pulse Apply 与 Migration-generated obligations 的联动 Banner**（Demo Sprint 静态 seed 未联动；Phase 0 起在 Step 4 成功后展示 `1 rule updated recently affects your new clients`）
- **Audit-Ready Evidence Package 导出**：Step 4 Toast 新增 `[Download audit ZIP]`，对齐 Part2B §13.3 Phase 1

---

## 变更记录

| 版本 | 日期       | 作者       | 摘要                                                                 |
| ---- | ---------- | ---------- | -------------------------------------------------------------------- |
| v1.0 | 2026-04-24 | Subagent B | 初稿：4 步向导像素级 UX 规格 + Revert UX + 键盘速查 + Token 回灌清单 |
