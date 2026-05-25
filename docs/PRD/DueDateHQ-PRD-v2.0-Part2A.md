# DueDateHQ PRD v2.0 — Unified PRD · Part 2A（§7–§8：其他核心功能 + 数据模型）

> 文档类型：产品需求文档（统一版 / Build-complete PRD）· **Part 2A / 4**
> 版本：v2.0（集成 v1.0 主 PRD 与 v1.0-FileInTime-Competitor 优势）
> 日期：2026-04-23

> **📄 分册导航（4 册拆分版 · 原 Part 1/2 因渲染性能问题拆为 A/B）**
>
> - **Part 1A**：§0 版本对比 · §1 产品定位 · §2 用户与场景 · §3 用户故事与 AC · §4 功能范围 · §5 核心页面 · §6 Clarity Engine → 见 [`DueDateHQ-PRD-v2.0-Part1A.md`](./DueDateHQ-PRD-v2.0-Part1A.md)
> - **Part 1B**：§6A Migration Copilot · §6B Client Readiness Portal · §6C Audit-Ready Evidence · §6D Rules-as-Asset → 见 [`DueDateHQ-PRD-v2.0-Part1B.md`](./DueDateHQ-PRD-v2.0-Part1B.md)
> - **Part 2A（本册）**：§7 其他核心功能 · §8 数据模型
> - **Part 2B**：§9 AI 架构 · §10 UI/UX · §11 信息架构 · §12 指标 · §13 安全合规 · §14 路线图 · §15 GTM Playbook · §16 风险 · §17 交付物 · §18 附录 · §19 产品一句话 → 见 [`DueDateHQ-PRD-v2.0-Part2B.md`](./DueDateHQ-PRD-v2.0-Part2B.md)

---

## 7. 其他核心功能规格

### 7.1 Reminders（P0-21 / P0-22）

#### 7.1.1 阶梯规则

| 触发日    | 渠道           | 内容                              |
| --------- | -------------- | --------------------------------- |
| due - 30d | Email          | 温和提醒 + 建议动作 + source link |
| due - 7d  | Email + In-app | 紧急提醒 + Penalty $              |
| due - 1d  | Email + In-app | 最后提醒                          |
| overdue   | In-app daily   | 红色警示                          |

#### 7.1.2 模板（含上下文）

```
Subject: [DueDateHQ] Acme LLC — CA Franchise Tax due in 7 days

Hi Sarah,

Here's your 7-day reminder:

  Client:       Acme LLC
  Form:         CA Form 3522 (Franchise Tax)
  Due date:     March 15, 2026
  Days left:    7
  $ at risk:    $4,200 if missed 90 days
  Status:       Waiting on client
  Source:       CA FTB Publication 3556
                https://ftb.ca.gov/forms/misc/3556.html
  Verified by DueDateHQ on 2026-04-12.

[Open in DueDateHQ]   [Mark as handled]   [Snooze reminders]

AI-assisted. Verify with official sources.
```

#### 7.1.3 Team 路由规则（§3.6 Gap 4）

| 通知类型                         | 默认收件人（Solo） | 默认收件人（Team）                                                                                                            |
| -------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Reminder 30d**                 | Owner              | Assignee（未分派 fallback 到 default_assignee）                                                                               |
| **Reminder 7d**                  | Owner              | Assignee + cc Owner                                                                                                           |
| **Reminder 1d**                  | Owner              | Assignee + cc Owner + cc Manager                                                                                              |
| **Overdue（每日）**              | Owner              | Owner + Manager（即便 assignee 为空也升级）                                                                                   |
| **Weekly Brief 邮件（Mon 8am）** | Owner              | **每人一份**（按 `scope=me` 过滤生成），Owner / Manager 收 Firm-wide 版；Preparer 收 My work 版；Coordinator 收简化版（无 $） |
| **In-app 未读计数**              | Owner              | **per-user**（bell icon 只计自己的）                                                                                          |

#### 7.1.4 用户偏好

Notifications：

- 全局开关
- 按渠道开关（Email / In-app）
- 按类型开关（Reminders / Pulse / Weekly Brief）
- Pulse 通知不可关闭（法定级），但可切 Daily Digest
- **Manager 额外选项**：`Subscribe to all firm Pulse alerts`（订阅全量 Firm Pulse，默认关）
- **Manager / Owner 额外选项**：`Receive reminders for unassigned obligations`（默认开）

### 7.2 Status & Readiness 状态机（P0-16）

```
Status:
  not_started → in_progress → (filed | paid | extended | not_applicable)
  + waiting_on_client (subflow)
  + needs_review (quality gate)

Readiness (independent of status):
  ready / waiting_on_client / needs_review

Extension Decision (P1-9):
  not_considered / applied / rejected
```

### 7.3 Extension Decision Panel（P1-9 · 场景 C）

```
┌─ Extension decision · Acme LLC · 1120-S ──────────┐
│                                                    │
│  Current situation                                 │
│    Due: Mar 15 · 5 days                            │
│    Readiness: Waiting on K-1                       │
│    $ at risk if missed: ~$2,800                    │
│                                                    │
│  Extension (Form 7004)                             │
│    New filing due: Sep 15 (+6 months)              │
│    Payment still due Mar 15 (no extension of $)    │
│    Source: IRS Pub 7004                            │
│                                                    │
│  What-If Simulator                                 │
│    ○ File on time        $0 penalty                │
│    ● Extend + pay est.   $0 penalty (recommended)  │
│    ○ Extend + no pay     $21/mo interest           │
│    ○ Miss both           $210/mo × 5 = $1,050 max  │
│                                                    │
│  [Apply extension]   [Cancel]                      │
└────────────────────────────────────────────────────┘
```

### 7.4 Client PDF Report（P1-10 · VPC Medium）

一客户一份 PDF（也可单 obligation 生成），Letter 尺寸：

```
─────────────────────────────────────────
 DueDateHQ · Tax Deadlines for Acme LLC
 Prepared by Sarah Mitchell, CPA · 2026-04-23
─────────────────────────────────────────

Next 90 days                    3 items · $4,200 at risk
───────────────────────────────────────
Mar 15   CA Franchise Tax — $800 min       $4,200 at risk
          Source: CA FTB Pub 3556 · verified 2026-04-12
Apr 15   Form 1120-S                        $2,100 at risk
          Source: IRS Publication 509
Jun 15   Q2 Estimated Tax (Federal)         $  800 at risk
───────────────────────────────────────
Full year 2026 calendar  ………………  (table view)

Notes & assumptions
 • Exposure amounts are estimates based on IRC §6651 formulas.
 • Not tax advice. See your CPA for decisions.

Every item in this report has a source link.
Verified by DueDateHQ Glass-Box engine as of 2026-04-23.
─────────────────────────────────────────
```

**实现：**

- 入口：Client Detail → `Export PDF`；Obligations bulk `Export selected as PDF`
- 技术：`@react-pdf/renderer`，S3 存储，邮件链接 24h 过期
- 不嵌入 AI narrative；只嵌入 **已 human-verified 的 rule + penalty 数字**（避免把模型幻觉送客户）
- 每条 obligation 右下 QR 码回链到在线 Evidence Mode

### 7.5 Deadline Radar™（P0-18 · 跨页面）

#### 7.5.1 为什么必须做

CPA 的脑回路："客户会怪我什么？" → 怪你让他多交了钱。DueDateHQ 把风险单位从"天数"换成"美元"，直接对接 CPA 的职业恐惧。

#### 7.5.2 截止日风险计算（纯函数 · 零幻觉 · 融合两份 PRD）

```typescript
// Formulas from IRS IRC §6651 + public state statutes.
function estimateExposure(o: ObligationInstance, c: Client): ExposureReport {
  const months_late = monthsBetween(o.current_due_date, today)

  // Federal
  const failure_to_file = min(0.05 * months_late, 0.25) * o.estimated_tax_due
  const failure_to_pay = min(0.005 * months_late, 0.25) * o.estimated_tax_due
  const interest = months_late * (AFR_SHORT_TERM / 12) * o.estimated_tax_due

  // State surcharge lookup (§7.5.3)
  const state_surcharge = lookupStatePenalty(o.state, o.tax_type, o.estimated_tax_due, months_late)

  // Per-partner / per-shareholder (1065 / 1120-S)
  const per_partner =
    o.tax_type === 'federal_1065' || o.tax_type === 'federal_1120s'
      ? 245 * min(months_late, 12) * (c.num_partners || 1)
      : 0

  const total = failure_to_file + failure_to_pay + interest + state_surcharge + per_partner

  return {
    failure_to_file,
    failure_to_pay,
    interest,
    state_surcharge,
    per_partner,
    total,
    assumptions: [
      `estimated_tax_due = $${o.estimated_tax_due} (source: ${o.estimated_tax_due_source})`,
      `AFR_SHORT_TERM = ${AFR_SHORT_TERM * 100}% (source: IRS Rev Rul 2026-xx)`,
    ],
    source_urls: [
      'https://www.irs.gov/publications/p17', // IRC §6651
      stateSourceUrl(o.state, o.tax_type),
    ],
    confidence: o.estimated_tax_due_source === 'user_entered' ? 'high' : 'industry_median',
  }
}
```

#### 7.5.3 计算表（硬编码、官方规则）

| 表单             | 基础规则                       | Liability 来源                                            | 覆盖 |
| ---------------- | ------------------------------ | --------------------------------------------------------- | ---- |
| 1040             | 5%/mo FTF + 0.5%/mo FTP        | `estimated_tax_liability`（可选，无则返回 `needs_input`） | ✓    |
| 1065             | $245/partner/mo × up to 12     | `num_partners`                                            | ✓    |
| 1120-S           | $245/shareholder/mo × up to 12 | `num_shareholders`                                        | ✓    |
| 1120             | 5%/mo FTF + 0.5%/mo FTP        | `estimated_tax_liability`                                 | ✓    |
| CA Franchise Tax | $800 min + 5%/mo               | 固定                                                      | ✓    |
| NY PTET / CT-3-S | 查 rule.penalty_formula        | 按表单                                                    | ✓    |
| TX Franchise Tax | 5% 1-30d / 10% > 30d late      | 按 revenue                                                | ✓    |
| FL F-1120        | 10% base + 5%/mo               | 按 liability                                              | ✓    |
| WA B&O           | 5% base + 1%/mo                | 按 B&O tax due                                            | ✓    |
| MA Form 1        | 1%/mo FTF + 1%/mo FTP          | 按 liability                                              | ✓    |
| 命中不了         | 返回 `null`，UI 不显示胶囊     | —                                                         | —    |

#### 7.5.4 UI 呈现

- **Dashboard 顶栏聚合**：`This week: $X at risk` + up/down 箭头 + 上周对比
- **每条 TriageCard / Obligations 行**：`$X at risk` 胶囊，hover 显示细分
- **What-If Simulator**（P1-9 配套）：滑块 30 / 60 / 90 / 180 天 → 实时敞口曲线
- **"Needs input" 降级**：未填 `estimated_tax_liability` 时，胶囊显示 `needs input` 而非 `$0`，点击打开 Edit 对话框

#### 7.5.5 用户覆盖

CPA 可手动覆盖某条 obligation 的 `estimated_tax_liability`，写 `audit_event(action='penalty.override', before, after)`。

#### 7.5.6 ★ Scoreboard 游戏化规格（集训记忆钩子）

> 所有组都会做截止日风险数字。本节规定**怎么把它做成"赌场分数面板级别"**的视觉体验——让现场观众 2 小时看 20 组 Demo 后仍记得这一个数字。

##### 7.5.6.1 顶栏 Hero 视觉规格

```text
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│        $31,400    at risk this week                          │
│   ─────────────                                              │
│        ▲ up $3,100 vs last week  ·  trending ↗               │
│                                                              │
│   🔴 Critical (3)   🟠 High (7)   🟡 Upcoming (12)            │
│                                                              │
│   [ This Week ▾ ]  [ Sparkline of last 8 weeks — 📊 ]        │
└──────────────────────────────────────────────────────────────┘
```

| 元素      | 规格                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| 金额数字  | **76px** JetBrains Mono **Bold** / `tabular-nums`（等宽对齐）/ 字间距 -0.02em                               |
| 金额颜色  | $10k+ = Ruby `#EF4444` / $1k–10k = Amber `#F59E0B` / <$1k = Emerald `#10B981` / $0 = 灰 `#8a8a8a` + 🎉 icon |
| 单位后缀  | `at risk this week` — 13px Inter Medium slate 灰                                                            |
| 对比行    | `▲ up $3,100 vs last week` — 箭头随趋势变色 / 字号 14px                                                     |
| 趋势箭头  | ↗ 红 `#EF4444`（总额在升）/ ↘ 绿 `#10B981`（总额在降）/ → 灰（持平 ±5%）                                    |
| Sparkline | 过去 8 周 mini line chart，hover 显示每周数字                                                               |
| 周期切换  | `This Week / This Month / All Open / Custom Range` 下拉，URL 持久化                                         |

##### 7.5.6.2 数字滚动动画（"Odometer Roll"）

触发：任意导致聚合 $ 变化的操作。

```typescript
// Framer Motion / react-spring 实现 · rAF-based tween
function animateCounter(from: number, to: number) {
  const duration = Math.min(800, Math.abs(to - from) / 5) // 最长 0.8s
  const easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)' // 弹性收尾
  // 每 16ms 刷新一次，每位数字独立 tween，像老虎机滚动
}
```

**关键细节：**

- 每一位数字独立滚动（千位、百位、十位、个位**错峰到位** ≈ 80ms stagger）
- 数字下降（减少敞口）= 柔和 odometer 滚动
- 数字上升（增加敞口）= 同滚动 + 轻微红色短促 shake（200ms，±2px x 轴）
- Live Genesis 时：**粒子动画** `+$4,200` `+$2,800` `+$1,650` 从每张新生成的 deadline 卡片**弧线飞入顶栏**，消失瞬间顶栏数字对应增长

##### 7.5.6.3 状态变化反馈（"Score Pop")

```
事件                         视觉反馈
──────────────────────────────────────────────────────────────
Mark Filed / Paid            顶栏 -$X，绿色 halo pulse（800ms）
                            + 卡片淡出 + 短音效 "chime"（可选）
Mark Extended                 顶栏 -$X，琥珀色 halo
Pulse Batch Apply (20 条)    顶栏 -$Y（总），琥珀 + 绿混合脉冲
Import（Live Genesis）       顶栏 从 0 奔跑到 final，粒子雨
New overdue（定时任务）      顶栏 +$Z，红色短促 shake +
                            顶栏短暂显示 `+$Z overdue` banner 3s
```

所有动效**尊重 `prefers-reduced-motion`**：系统设置 reduce 时退化为瞬时切换 + 文字 toast。

##### 7.5.6.4 Milestone 庆祝（Confetti · 稀缺性设计）

这是 Scoreboard 的情感高点。必须稀缺，否则就变成噪音。

| Milestone              | 触发条件                       | 庆祝形式                                                                                      |
| ---------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| 🎯 **Zero Week**       | 本周 $ at risk 从正数降到 $0   | 全屏 canvas-confetti 彩带 + 顶栏 🎉 icon 替换数字 + Toast `Zero risk this week. Nicely done.` |
| 🏆 **Streak +3 Weeks** | 连续 3 个自然周 Zero Week      | 徽章永久加到 Profile + 弱化版彩带                                                             |
| 💪 **Big Drop**        | 单次操作使 $ 减少 > $10,000    | 半屏 confetti + Toast `$10k+ wiped in one move.`                                              |
| 🔥 **Firm Best**       | 本周总额低于 firm 历史同期最低 | Sparkline 上 firm-best 线位置高亮 + 弱庆祝                                                    |

**每周最多展示 1 次全屏 confetti，避免滥情。** 未来用户偏好 surface 可关闭庆祝（"Focus mode"）。

##### 7.5.6.5 Scoreboard Feed（类 Strava Activity Feed）

顶栏旁边可折叠的小侧栏（P1），显示本周已完成的"杀分数"动作：

```
This week's wins
────────────────
✓ 14:32  Acme LLC · CA Franchise filed            −$4,200
✓ 11:08  Bright Studio · 1120-S extended          −$2,800
✓ 09:41  12 clients · CA storm relief applied     −$6,500
✓ Mon    Zen Holdings · Q1 Est. paid              −$1,650
────────────────
Total this week: −$15,150
```

- 每条是一次"减分动作"带时间戳 + 操作者（Team 版显示 actor）
- 点任一条 → 打开对应 Obligation / Pulse Detail
- Weekly Summary 邮件周一 8am 把本 feed 发 Owner（"Here's what your firm crushed last week"）

##### 7.5.6.6 响应式与移动端

| Breakpoint | 金额字号             | 布局                            |
| ---------- | -------------------- | ------------------------------- |
| ≥1280px    | 76px                 | 顶栏 Hero 横排 + Sparkline 右侧 |
| 1024–1279  | 64px                 | 同上 + Sparkline 下折           |
| 768–1023   | 52px                 | Sparkline 收折入 hover tooltip  |
| <768       | 44px + 缩写 `$31.4k` | 对比行收折入点击展开            |

##### 7.5.6.7 无障碍

- 每次数字变化触发 `aria-live="polite"` 通告：`Deadline radar updated to five urgent reviews`
- 彩带动画全程非阻塞（`pointer-events: none`）
- 庆祝有"关闭动效"偏好 + 纯文本 toast 备份

##### 7.5.6.8 工程估算

- 核心 Odometer 滚动：`react-odometerjs` 或手写 ≈ 0.3 人天
- 状态反馈 halo / shake：Tailwind 动画 class + Framer Motion ≈ 0.4 人天
- Live Genesis 粒子：CSS keyframes + 5 个 div 粒子预计 ≈ 0.5 人天
- Confetti：`canvas-confetti` 现成库 ≈ 0.1 人天
- Scoreboard Feed：复用 AuditEvent 查询 ≈ 0.3 人天

**合计 ≈ 1.5 人天。投入产出比在整份 PRD 里 Top 3。**

##### 7.5.6.9 Demo Day 的使用（与 §15.3 联动）

- **90–180s 段** Live Genesis：粒子飞入是"入场秀"
- **Mark Filed 那一下**：-$4,200 + 绿色 pulse = 现场观众脑内的"多巴胺瞬间"
- **Pulse Batch Apply 那一下**：-$6,500 + 琥珀脉冲 = "这个工具是有魔力的"感知

这三下组合在一起，就是"赌场分数面板"的叙事闭环。

### 7.6 Cmd-K 命令面板（P1-14）

三合一：

```
┌─ Cmd-K ─────────────────────────────────────────┐
│  [Search] [Ask ✨] [Navigate]                    │
├──────────────────────────────────────────────────┤
│  Search:                                         │
│    > acme                                        │
│    Clients: Acme LLC · Acme Industries          │
│    Obligations: Acme LLC — CA Franchise · 3d    │
│    Rules: CA Franchise Tax Rule v3.2            │
│                                                  │
│  Ask ✨:                                         │
│    > Which clients owe CA PTE this month?       │
│                                                  │
│  Navigate:                                       │
│    > import                                      │
│    Import clients → Paste / Upload / Preset     │
│    Imports history                    │
└──────────────────────────────────────────────────┘
```

### 7.7 Keyboard Shortcuts（P1-15）

| 键             | 动作                       | 范围                |
| -------------- | -------------------------- | ------------------- |
| `?`            | 显示所有快捷键             | 全局                |
| `Cmd/Ctrl + K` | 命令面板                   | 全局                |
| `Cmd/Ctrl + E` | Evidence Mode for selected | 全局                |
| `/`            | 聚焦 Ask 输入框            | 全局                |
| `J / K`        | 上下行                     | Obligations / Lists |
| `Enter`        | 打开详情                   | Obligations         |
| `E`            | 展开 Evidence              | 列表                |
| `F`            | Mark Filed                 | 列表                |
| `X`            | Mark Extended              | 列表                |
| `I`            | Mark In progress           | 列表                |
| `W`            | Mark Waiting on client     | 列表                |
| `G then D`     | 跳 Dashboard               | 全局                |
| `G then W`     | 跳 Obligations             | 全局                |
| `G then C`     | 跳 Clients                 | 全局                |
| `G then T`     | 跳 Team workload           | 全局                |

### 7.8 PWA 壳 与 Native Wrappers（交付形态补强）

> 本节明确 DueDateHQ 的"跨设备交付战略"：**坚持 Web-first，但通过 PWA + macOS Menu Bar Widget 两层壳补齐 native 体验**，在保留 cloud-native 优势的同时消除"浏览器 tab 迷失 / 推送不及时 / 与桌面体验脱节"的痛点。
>
> 战略意图：在对 File In Time 的竞品叙事里补足最后一维 —— **"FIT 是一个桌面软件；DueDateHQ 是一个无处不在的税务副驾"**。

#### 7.8.1 PWA 壳（P1-36 · 必做）

##### 能力清单

| 能力                          | 覆盖平台                                                        | 用户体感                                                                      |
| ----------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Add to Dock / Home Screen** | macOS Safari+Chrome · Windows Chrome+Edge · iOS 16.4+ · Android | Dock / Home 独立图标；点击启动独立窗口，无浏览器 UI；开机自启（macOS）        |
| **独立窗口**                  | 所有桌面平台                                                    | 不再被隐藏在 100 个 Chrome tab 里；alt-tab 可见                               |
| **Web Push Notification**     | macOS 16+ / Windows 10+ / iOS 16.4+ / Android                   | IRS Pulse / Overdue / Client Readiness 实时推送到设备通知中心                 |
| **Offline Cache（最近数据）** | 所有平台                                                        | 飞机上或地铁隧道仍能看 Dashboard 近 24h 数据，恢复网络自动同步                |
| **App Badge（未读数）**       | macOS Dock / Android Home                                       | Dock 图标右上角红点显示 overdue count（等同原生 iMessage）                    |
| **Install Prompt 时机**       | Chrome/Edge 自动触发                                            | 用户第 3 次访问 + 完成 Migration 后 inline 提示 `Add DueDateHQ to your Dock?` |

##### 工程交付（≈ 0.5 人天）

```
public/manifest.json          # PWA manifest（name / icons / theme_color / display=standalone）
public/sw.js                  # Service worker (Workbox 生成)
src/lib/push/
  subscribe.ts                # 前端请求权限 + 注册 subscription
  register-sw.ts              # SW 注册 + 更新提示
  handlers/                   # Push / fetch / sync handlers
app/api/push/
  subscribe/route.ts          # 后端存储 PushSubscription
  send/route.ts               # VAPID 签名 + 推送分发
```

依赖：VAPID 密钥对（环境变量）+ Workers-compatible Web Push/VAPID 实现 + Workbox CLI。无额外 infra；不得默认选择依赖 Node-only API 的 push 库，除非已在 `workerd` 下验证。

##### 推送事件映射

| 事件类型                      | 推送条件                               | 默认开关               | Setting 路径  |
| ----------------------------- | -------------------------------------- | ---------------------- | ------------- |
| **Pulse Applied**             | 新 Pulse approved 且匹配到受影响客户   | **强制开启**（法定级） | —             |
| **Obligation Overdue**        | 任意 obligation 超过 due_date 未 Filed | 默认开                 | Notifications |
| **Client Readiness Response** | 客户在 Readiness Portal 提交           | 默认开                 | Notifications |
| **Quiet Hours 尊重**          | 23:00–06:00 本地时间                   | 默认开                 | Notifications |
| **Weekly Rhythm Report**      | 周一 8am（同 §6D.6）                   | 默认关                 | Notifications |

##### 验收（T-PWA-\*）

| Test ID  | 描述                        | 预期                                                                      |
| -------- | --------------------------- | ------------------------------------------------------------------------- |
| T-PWA-01 | macOS Safari 首访           | 地址栏右侧显示 Install 图标                                               |
| T-PWA-02 | 点 Install → 出现 Dock 图标 | 独立窗口启动，无 Safari UI                                                |
| T-PWA-03 | iPhone 添加到主屏           | 全屏启动 + Status bar 匹配主题                                            |
| T-PWA-04 | Pulse Approved              | 桌面 + 手机 2s 内 native 通知到达                                         |
| T-PWA-05 | 离线打开 app                | Dashboard 加载缓存数据 + 顶部 banner `Offline — showing last sync 2h ago` |
| T-PWA-06 | 点击通知跳转                | 唤起独立窗口 + 直接跳 Pulse Detail                                        |
| T-PWA-07 | Quiet Hours 内推送          | 仅系统 silent 投递，不弹声响                                              |
| T-PWA-08 | 一用户多设备订阅            | 同一事件在所有设备送达（去重按 endpoint）                                 |
| T-PWA-09 | 取消订阅                    | 从 Settings 关闭 + 立即失效                                               |

##### 与 Deadline Radar Scoreboard 联动

PWA 壳内**Dock / Home 图标的 App Badge 实时显示 overdue count**：

```
Dock icon:  [DueDateHQ] · 🔴 3   ← 3 overdue obligations
```

这是 FIT 绝对做不到的 OS 级集成信号。

#### 7.8.2 macOS Menu Bar Widget（P1-37 · Phase 2 · 可选差异化）

##### 目标与边界

**只做一件事**：在 macOS menu bar 永久显示一行：

```
◎ DueDateHQ · $31,400 at risk · 3 overdue
```

- 点击 → 小下拉面板（最紧急 3 条 + `Open Dashboard`）
- 不复制主 App 功能，是 **Web 的"瞭望塔"**
- 与 §7.5.6 Penalty Scoreboard 游戏化叙事一致 —— "你的分数 24/7 在 menu bar 跳动"

##### 技术选型

| 方案                     | 权衡                                            |
| ------------------------ | ----------------------------------------------- |
| **Tauri + Rust**（推荐） | 体积 ≈ 1 MB，跨平台未来可扩 Windows；学习曲线低 |
| SwiftUI menu bar app     | 体积 ≈ 400 KB，macOS 最 native；但只覆盖 macOS  |
| Electron menubar         | 体积 > 100 MB，不考虑                           |

Phase 2 先做 Tauri 版（跨平台 future-proof），SwiftUI 视 GTM 需求决定。

##### 工程估算（≈ 2 人天）

- Tauri 壳 + menu bar icon + 下拉面板 UI ≈ 1 人天
- 轮询 API `/api/v1/me/radar-summary`（30s 间隔）+ auth token 同步 ≈ 0.5 人天
- 点击唤起浏览器主 Dashboard（深链 URL handler）≈ 0.3 人天
- 签名 + 打包 + Sparkle auto-update ≈ 0.2 人天

##### 验收（T-MB-\*）

| Test ID | 描述                  | 预期                                                   |
| ------- | --------------------- | ------------------------------------------------------ |
| T-MB-01 | 安装后首次启动        | menu bar 图标 + 默认 hover 提示 `Sign in to DueDateHQ` |
| T-MB-02 | 登录后 30s 内         | menu bar 显示 `$ at risk + overdue count`              |
| T-MB-03 | Dashboard 改变状态    | 30s 内 menu bar 数字同步                               |
| T-MB-04 | 点击 menu bar         | 下拉面板显示 top 3 urgent + `Open Dashboard`           |
| T-MB-05 | 点击 `Open Dashboard` | 唤起浏览器/PWA 到 Dashboard，已登录态                  |
| T-MB-06 | 退出账号              | menu bar 降级为 `DueDateHQ · Sign in`                  |
| T-MB-07 | 自动更新              | Sparkle 检查到新版 → 无感更新                          |

#### 7.8.3 明确不做的 Native 选项

| 选项                             | 不做原因                                                |
| -------------------------------- | ------------------------------------------------------- |
| ❌ 独立 Electron 桌面 App        | PWA 已覆盖 95% 体验，Electron 启动慢、内存大、双份维护  |
| ❌ 独立 iOS / Android Native App | PWA + Web Push 已够；native 复制功能违背 web-first 战略 |
| ❌ 独立 Windows exe              | File In Time 就是走这条路，**主动走它的弱点无意义**     |
| ❌ iPad 专用 App                 | 响应式 Web + PWA 已覆盖 95%                             |
| ❌ iOS / Android Share Extension | 产品决策排除（不进入 Phase 计划）                       |

#### 7.8.4 Landing Page `/get` 展示页

公开页说明三层交付形态（P1-36 / P1-37），配截图：

工程归属：`/get` 属于 `apps/marketing` / `duedatehq.com`，不是登录后 SaaS app 的 route。

```
Get DueDateHQ on every device

🌐 Browser       Any modern browser        Sign in →

📱 Add to Home   iOS / Android             Instructions →
                 (PWA · offline + push)

💻 Add to Dock   macOS / Windows           Instructions →
                 (PWA · independent window + badge)

🎛 Menu Bar     macOS only (Phase 2)       Download →
                 ($ at risk glanceable 24/7)

All devices stay in sync. One account, one source of truth.
No app stores, no installers — DueDateHQ runs everywhere
the web does.
```

#### 7.8.5 对 File In Time 的 Native 差异化叙事

| 维度        | File In Time                   | DueDateHQ (Web + PWA + Menu Bar)                       |
| ----------- | ------------------------------ | ------------------------------------------------------ |
| 安装摩擦    | 下载 .exe → 安装 → 授权 → 重启 | Web 访问即用；Add to Dock 2 下完成                     |
| 平台覆盖    | Windows only                   | macOS / Windows / iOS / Android / Linux 全覆盖         |
| 跨设备      | ❌                             | ✓ Push / Badge / 同步状态                              |
| 更新方式    | 下发 CD / 年度维护包           | Web 秒级、PWA 自动更新、Menu Bar Sparkle 后台更新      |
| OS 集成信号 | 仅 Windows tray                | macOS Dock badge + menu bar + iOS Home + Android badge |
| 离线能力    | 本机数据库                     | Service Worker 缓存近 24h 数据                         |
| 通知        | 无（桌面软件靠弹窗）           | 系统级 push 跨设备到达                                 |

这条与 §6D.10 的 Rules-as-Asset 打击表合并，就是对 FIT 的**双面合围叙事**：

- **规则资产层**（§6D.10）：从"年度维护包"打到"持续 freshness 流水"
- **交付形态层**（本节）：从"Windows 独占"打到"无处不在"

---

## 8. 数据模型

### 8.1 核心实体

```
Firm (tenant)
  id, name, slug, timezone, plan (solo/pro/team/firm),
  seat_limit,                        -- Solo 1 / Pro 3 / Team 10 / Enterprise contract-defined
  owner_user_id,                     -- FK to User，转让时修改
  default_assignee_strategy,         -- owner | round_robin | none
  coordinator_can_see_dollars,       -- bool, default false
  created_at, deleted_at             -- soft delete with 30d grace

User (identity, email-unique)
  id, email, display_name,
  mfa_enabled, last_login_at,
  default_firm_id,                   -- last-used firm for login redirect
  created_at, deleted_at             -- GDPR 软删

UserFirmMembership (多对多 · P1 启用, P0 预留)
  id, user_id, firm_id,
  role (owner|manager|preparer|coordinator),
  status (active|invited|suspended|left),
  invited_by_user_id, invited_at, accepted_at, suspended_at, left_at,
  last_active_at,
  notification_prefs_json             -- per-membership 通知偏好

TeamInvitation
  id, firm_id, invited_email, role,
  invite_token (signed), expires_at,
  invited_by_user_id, accepted_at, revoked_at, created_at

Client
  id, firm_id, name,
  ein,                               -- NEW: "##-#######" format
  entity_type, state, county,
  tax_types[],                       -- nullable, fallback to Default Matrix
  importance (high/med/low),
  num_partners, num_shareholders,    -- for Penalty per-partner calc
  estimated_tax_liability,           -- optional, for Deadline Radar
  assignee_id, email, notes,
  migration_batch_id                 -- nullable, for Revert

ObligationRule (base rule · Rules-as-Asset 核心实体 · §6D)
  id, jurisdiction, entity_applicability[], tax_type, form_name,
  due_date_logic (DSL/json),
  extension_policy, is_payment, is_filing,
  penalty_formula,                   -- for Deadline Radar
  default_tip,                       -- fallback for Deadline Tip
  source_url, source_title,          -- NEW (§6D.8): 官方文档全名
  statutory_ref, verbatim_quote,
  verified_by, verified_at, next_review_at,
  version,
  coverage_status (full|skeleton|manual), active,
  -- Rules-as-Asset 新增字段 (§6D.8) ---
  status (candidate|verified|deprecated),         -- AI candidate vs human verified
  rule_tier (basic|annual_rolling|exception|applicability_review),
  applicable_year,                                -- 规则级年份（2026 edition 等）
  requires_applicability_review (bool),           -- Plan §2.4
  risk_level (low|med|high),                      -- 高风险要求双人 sign-off
  checklist_json                                  -- §6D.4 六项 Quality Badge:
                                                  -- { filing_payment_distinguished,
                                                  --   extension_handled,
                                                  --   calendar_fiscal_specified,
                                                  --   holiday_rollover_handled,
                                                  --   cross_verified,
                                                  --   exception_channel }

RuleSource (Source Registry · P1-31 · §6D.3)
  id, jurisdiction,
  name,                              -- e.g. "IRS Newsroom"
  url, source_type,                  -- newsroom|publication|due_dates|emergency_relief|fema
  cadence,                           -- 30m|60m|120m|daily|weekly|quarterly
  owner_user_id,                     -- 负责 practice 成员
  priority,                          -- critical|high|medium|low（低容错优先级）
  is_early_warning (bool),           -- FEMA 等只作预警不生规则
  last_checked_at, last_change_detected_at,
  health_status,                     -- healthy|degraded|failing|paused
  consecutive_failures, next_check_at,
  created_at, updated_at

ExceptionRule (overlay 独立实体 · P1-30 · §6D.2)
  id, source_pulse_id,               -- 来源 Pulse（可为空：手工录入 exception）
  jurisdiction, counties[],
  affected_forms[], affected_entity_types[],
  override_type,                     -- extend_due_date|waive_penalty|...
  override_value_json,               -- { new_due_date, reason, ... }
  effective_from, effective_until,
  status,                            -- candidate|verified|applied|retracted|superseded
  verified_by, verified_at,
  retracted_at, retracted_reason,
  superseded_by_exception_id,        -- 被哪条新 exception 覆盖
  source_url, verbatim_quote,
  needs_reevaluation (bool),         -- base rule 升级时自动置 true
  created_at

ObligationExceptionApplication (obligation × exception 多对多 · §6D.2)
  obligation_instance_id, exception_rule_id,
  applied_at, applied_by_user_id,
  reverted_at, reverted_by_user_id,
  PRIMARY KEY (obligation_instance_id, exception_rule_id)

RuleCrossVerification (双源交叉引用 · P1-33 · §6D.5)
  id, rule_id,
  primary_source_url, primary_source_title, primary_quote,
  cross_source_url, cross_source_title, cross_quote,
  agreement_status,                  -- agree|disagree|partial
  checked_at, checked_by_user_id,
  notes

OpsCadence (节奏表 · P1-35 · §6D.6)
  id, event_type,                    -- source_check|base_rule_recheck|quarterly_audit|pre_season_review|rhythm_report_email
  frequency,                         -- cron / iso interval
  owner_user_id,
  last_run_at, next_run_at,
  last_status (success|failed|skipped),
  last_report_s3_key,                -- 每次 run 的报告存档
  active

ObligationInstance
  id, firm_id, client_id, rule_id, rule_version,
  tax_year, period,
  original_due_date,                  -- rule 生成时的原始日期（固定不变）
  base_due_date,                      -- NEW (§6D.2): base rule 当前计算值（rule 升版会变）
  current_due_date,                   -- 派生字段 = base + apply(active overlays)
  filing_due_date, payment_due_date,
  status, readiness, extension_decision,
  estimated_tax_due, estimated_exposure_usd,
  assignee_id, notes,
  migration_batch_id,
  created_at, updated_at, last_changed_by
  -- overlays 通过 ObligationExceptionApplication 多对多获取

EvidenceLink (核心 provenance 表)
  id,
  obligation_instance_id | ai_output_id,
  source_type (rule | pulse | human_note | ai_migration_normalize |
               ai_migration_map | default_inference_by_entity_state |
               pulse_apply | pulse_revert | penalty_override),
  source_id, source_url, verbatim_quote,
  raw_value, normalized_value,       -- for migration
  confidence, model,                 -- for AI decisions
  matrix_version,                    -- for default inference
  verified_at, verified_by,
  applied_at, applied_by

Pulse
  id, source, source_url, raw_content, published_at,
  ai_summary, verbatim_quote,
  parsed_jurisdiction, parsed_counties[],
  parsed_forms[], parsed_entity_types[],
  parsed_original_due_date, parsed_new_due_date,
  parsed_effective_from, confidence,
  status (pending_review | approved | rejected | quarantined | source_revoked),
  reviewed_by, reviewed_at,
  requires_human_review

PulseFirmAlert
  id, pulse_id, firm_id,
  status (matched | dismissed | snoozed | partially_applied | applied | reverted),
  matched_count, needs_review_count,
  dismissed_by, dismissed_at, snoozed_until

PulseApplication
  id, pulse_id, obligation_instance_id, client_id, firm_id,
  applied_by, applied_at, reverted_at,
  before_due_date, after_due_date

AiOutput
  id, firm_id, user_id, kind (brief | tip | summary | ask_answer | pulse_extract),
  prompt_version, model, input_context_ref,
  output_text, citations[], generated_at, tokens_in, tokens_out, cost_usd

AuditEvent
  id, firm_id, actor_id, entity_type, entity_id,
  action (status.change | pulse.ingest | pulse.extract | pulse.approve |
          pulse.reject | pulse.apply | pulse.revert |
          migration.imported | migration.reverted | penalty.override |
          rule.updated),
  before_json, after_json, reason, created_at

Reminder
  id, obligation_instance_id, channel (email | in_app),
  offset_days, sent_at, clicked_at

MigrationBatch
  id, firm_id, user_id, source (paste | csv | preset_name),
  raw_input_ref,                     -- S3 key of original paste/csv
  mapping_json,                      -- final column → field mapping
  row_count, success_count, skipped_count,
  preset_used,                       -- nullable
  ai_global_confidence,
  status (draft | mapping | reviewing | applied | reverted | failed),
  created_at, applied_at, reverted_at, revert_expires_at

MigrationMapping
  id, batch_id, source_column, target_field,
  confidence, reasoning, sample_transformed,
  user_overridden (bool)

MigrationNormalization
  id, batch_id, field, raw_value, normalized_value,
  confidence, model, reasoning

MigrationError
  id, batch_id, row_index, raw_row_json,
  error_code, error_message

IcsToken  -- P1-11
  id, firm_id, token, created_at, revoked_at

PushSubscription (Web Push · P1-36 · §7.8.1)
  id, user_id, firm_id,
  endpoint,                           -- 浏览器 push service endpoint (VAPID)
  keys_p256dh, keys_auth,             -- 加密公钥 + auth secret
  device_label,                       -- "Sarah's MacBook" / "iPhone 15" (user-editable)
  platform,                           -- macos|windows|ios|android|linux|unknown
  user_agent_hash,                    -- 去重 + 识别设备但不存原始 UA
  created_at, last_used_at,
  last_delivery_success_at,
  consecutive_failures,               -- 410/404 累计时自动 revoke
  revoked_at, revoke_reason

LlmLog
  id, firm_id, user_id, prompt_version, input_tokens, output_tokens,
  latency_ms, cost_usd, success, error_msg, created_at

SavedView (P1-16)
  id, firm_id, owner_user_id,
  name, scope (personal|shared),      -- Personal 仅 owner_user_id 可见；Shared Firm 内共享
  filters_json, columns_json, sort_json,
  created_at, updated_at

ClientReadinessRequest (P1-26 · §6B)
  id, firm_id, obligation_instance_id, client_id,
  items_json,                         -- [{label, description, ai_explanation_url, status}]
  magic_link_token (signed, ≥32 bytes, rotatable),
  delivery_channel (email|sms_link|both),
  sent_to_email, sent_by_user_id,
  sent_at, expires_at (default +14d),
  first_opened_at, last_responded_at, response_count,
  status (pending|partially_responded|fully_responded|expired|revoked),
  revoked_at, revoked_by_user_id,
  auto_reminder_sent_at

ClientReadinessResponse (P1-26 · §6B)
  id, request_id,
  item_index, status (ready|not_yet|need_help),
  client_note, eta_date (nullable),
  submitted_at, ip_hash, user_agent_hash  -- anonymized for anti-abuse

AuditEvidencePackage (P1-28 · 合规 ZIP 导出)
  id, firm_id, exported_by_user_id, scope (firm|client|obligation),
  scope_entity_id,
  range_start, range_end,
  file_count, file_manifest_json, sha256_hash,
  s3_key, expires_at (default +7d),
  created_at

Event (analytics)
  id, firm_id, event_name, props_json, created_at
```

Active firm count 是 account / subscription / contract 层的 product entitlement，不是
单个 `firm_profile` 行内字段：Solo / Pro / Team = 1 active firm，Enterprise (`firm`) = contract-defined。

### 8.2 关键索引（S1-AC3 < 1s 响应保障）

```sql
-- Dashboard / Obligations 核心查询
CREATE INDEX idx_obligation_firm_due ON obligation_instance (firm_id, current_due_date);
CREATE INDEX idx_obligation_firm_status_due ON obligation_instance (firm_id, status, current_due_date);
CREATE INDEX idx_obligation_firm_tax_due ON obligation_instance (firm_id, tax_type, current_due_date);
CREATE INDEX idx_obligation_firm_assignee_due ON obligation_instance (firm_id, assignee_id, current_due_date);

-- Pulse 匹配
CREATE INDEX idx_client_firm_state ON client (firm_id, state);
CREATE INDEX idx_client_firm_state_county ON client (firm_id, state, county);
CREATE INDEX idx_client_firm_entity ON client (firm_id, entity_type);

-- Migration Revert
CREATE INDEX idx_client_batch ON client (migration_batch_id);
CREATE INDEX idx_obligation_batch ON obligation_instance (migration_batch_id);

-- Evidence Mode
CREATE INDEX idx_evidence_obligation ON evidence_link (obligation_instance_id);
CREATE INDEX idx_evidence_source ON evidence_link (source_type, source_id);

-- Pulse feed
CREATE INDEX idx_pulse_status_published ON pulse (status, published_at DESC);

-- Audit / history
CREATE INDEX idx_audit_firm_created ON audit_event (firm_id, created_at DESC);
CREATE INDEX idx_migration_firm_created ON migration_batch (firm_id, created_at DESC);

-- Vector search
-- D1 does not own vector indexes. rule_chunks / pulse_chunks are mirrored into Cloudflare Vectorize.
-- D1 keeps metadata only: chunk_id, source_type, source_id, jurisdiction, entity_type, tax_type, firm_id NULL.
CREATE INDEX idx_rule_chunks_meta ON rule_chunks (jurisdiction, tax_type, entity_type);

-- Team / Membership (P1)
CREATE UNIQUE INDEX idx_membership_user_firm ON user_firm_membership (user_id, firm_id);
CREATE INDEX idx_membership_firm_status ON user_firm_membership (firm_id, status);
CREATE UNIQUE INDEX idx_invitation_token ON team_invitation (invite_token) WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX idx_invitation_firm_email ON team_invitation (firm_id, invited_email) WHERE accepted_at IS NULL;

-- My work scope
CREATE INDEX idx_obligation_firm_assignee_scope ON obligation_instance (firm_id, assignee_id, current_due_date)
  WHERE status NOT IN ('filed','paid','not_applicable');

-- Firm-wide audit log page
CREATE INDEX idx_audit_firm_actor_created ON audit_event (firm_id, actor_id, created_at DESC);
CREATE INDEX idx_audit_firm_action_created ON audit_event (firm_id, action, created_at DESC);

-- Client Readiness Portal (P1-26)
CREATE UNIQUE INDEX idx_readiness_token ON client_readiness_request (magic_link_token)
  WHERE revoked_at IS NULL AND status NOT IN ('expired');
CREATE INDEX idx_readiness_obligation ON client_readiness_request (obligation_instance_id, sent_at DESC);
CREATE INDEX idx_readiness_firm_status ON client_readiness_request (firm_id, status, expires_at);

-- Audit-Ready Evidence Package (P1-28)
CREATE INDEX idx_audit_package_firm_created ON audit_evidence_package (firm_id, created_at DESC);
CREATE INDEX idx_audit_package_expires ON audit_evidence_package (expires_at) WHERE expires_at > NOW();

-- Penalty Scoreboard weekly aggregation (P0-18 + §7.5.6)
-- week_start_date is a stored/generated helper column maintained by the app for D1-compatible weekly grouping.
CREATE INDEX idx_obligation_firm_week_exposure ON obligation_instance
  (firm_id, week_start_date, estimated_exposure_usd)
  WHERE status NOT IN ('filed','paid','not_applicable');
-- 支持 "This week $X at risk" 聚合 + Sparkline 8 周趋势

-- Rules-as-Asset (P1-29 ~ P1-35 · §6D)
CREATE INDEX idx_rule_status_tier ON obligation_rule (status, rule_tier, jurisdiction);
CREATE INDEX idx_rule_next_review ON obligation_rule (next_review_at)
  WHERE status = 'verified';
CREATE INDEX idx_rule_source_juris_priority ON rule_source (jurisdiction, priority, health_status);
CREATE INDEX idx_rule_source_next_check ON rule_source (next_check_at)
  WHERE health_status IN ('healthy','degraded');

-- ExceptionRule overlay engine
CREATE INDEX idx_exception_status_effective ON exception_rule (status, effective_from, effective_until)
  WHERE status IN ('applied','verified');
CREATE INDEX idx_exception_jurisdiction ON exception_rule (jurisdiction, status, effective_from);
-- affected_forms / counties use JSON text in D1; matching uses json_each() or denormalized helper tables, not GIN.
CREATE INDEX idx_obligation_exception_oblig ON obligation_exception_application
  (obligation_instance_id) WHERE reverted_at IS NULL;
CREATE INDEX idx_obligation_exception_exc ON obligation_exception_application
  (exception_rule_id) WHERE reverted_at IS NULL;

-- Cross-verification
CREATE INDEX idx_cross_verification_rule ON rule_cross_verification (rule_id, agreement_status);

-- Ops cadence scheduler
CREATE INDEX idx_ops_cadence_next_run ON ops_cadence (next_run_at) WHERE active = true;

-- Web Push subscription (P1-36 · §7.8.1)
CREATE INDEX idx_push_user_active ON push_subscription (user_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX idx_push_endpoint ON push_subscription (endpoint) WHERE revoked_at IS NULL;
```

---
