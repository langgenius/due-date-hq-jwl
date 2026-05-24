# DueDateHQ PRD v2.0 — Unified PRD · Part 2B（§9–§19：AI 架构 + UI/UX + 运营 + 路线图）

> 文档类型：产品需求文档（统一版 / Build-complete PRD）· **Part 2B / 4**
> 版本：v2.0（集成 v1.0 主 PRD 与 v1.0-FileInTime-Competitor 优势）
> 日期：2026-04-23

> **📄 分册导航（4 册拆分版 · 原 Part 1/2 因渲染性能问题拆为 A/B）**
>
> - **Part 1A**：§0 版本对比 · §1 产品定位 · §2 用户与场景 · §3 用户故事与 AC · §4 功能范围 · §5 核心页面 · §6 Clarity Engine → 见 [`DueDateHQ-PRD-v2.0-Part1A.md`](./DueDateHQ-PRD-v2.0-Part1A.md)
> - **Part 1B**：§6A Migration Copilot · §6B Client Readiness Portal · §6C Audit-Ready Evidence · §6D Rules-as-Asset → 见 [`DueDateHQ-PRD-v2.0-Part1B.md`](./DueDateHQ-PRD-v2.0-Part1B.md)
> - **Part 2A**：§7 其他核心功能 · §8 数据模型 → 见 [`DueDateHQ-PRD-v2.0-Part2A.md`](./DueDateHQ-PRD-v2.0-Part2A.md)
> - **Part 2B（本册）**：§9 AI 架构 · §10 UI/UX · §11 信息架构 · §12 指标 · §13 安全合规 · §14 路线图 · §15 GTM Playbook · §16 风险 · §17 交付物 · §18 附录 · §19 产品一句话

---

## 9. AI 架构（Clarity Engine 细节）

见 §6.2 完整描述。本节补充：

### 9.1 AI SDK 运行口径

DueDateHQ 的模型执行层只依赖 **Vercel AI SDK Core**，运行在 Cloudflare Worker 内，
通过 **Cloudflare AI Gateway provider** 调上游模型。业务模块只调用 `packages/ai` facade，
不直接 import AI SDK、provider SDK、observability SDK 或 provider HTTP endpoint。

| 任务                            | AI SDK 档位           | 路由策略                                 | 理由                                  |
| ------------------------------- | --------------------- | ---------------------------------------- | ------------------------------------- |
| Embedding                       | `embedding`           | AI SDK embedding provider → Vectorize    | 成本 / 够用                           |
| 快速任务（Tip / Mapper）        | `fast-json/text`      | Cloudflare AI Gateway primary + fallback | 延迟 + 成本                           |
| 高质量（Brief / Pulse Extract） | `quality-json/text`   | Cloudflare AI Gateway primary + fallback | 准确度                                |
| 模型网关                        | Cloudflare AI Gateway | AI SDK provider abstraction              | CF 原生运行、cache、retry、rate limit |

### 9.2 Fallback 矩阵

| 失败场景              | 降级行为                                           |
| --------------------- | -------------------------------------------------- |
| AI SDK / Gateway 超时 | 显示上次缓存 + 警示条 `AI temporarily unavailable` |
| Citation 校验失败     | 重试 1 次；仍失败 → 显示 refusal template          |
| Retrieval 为空        | refusal：`I don't have a verified source for this` |
| 置信度 < 0.5（Pulse） | 保持 `pending_review`，不进 Feed                   |
| Mapping 置信度 < 0.5  | UI 强制用户手动选字段                              |

### 9.3 数据保留与调用记录

- 采用 AI SDK Core + Cloudflare AI Gateway；上游 provider 必须满足合同层面的训练禁用 / retention 要求
- Prompt 明示 `"Do not retain any data seen for training"`
- Agent / Brief / Pulse 路径：PII 占位符替换后才进 AI，post-processing 回填
- Migration Mapper / Normalizer 路径：只发送字段名 + 前 5 行样本；SSN-like pattern 必须拦截，不发送全表
- 所有 AI 调用入内部 `ai_output` / `llm_log` 等价记录（含 input hash、prompt_version、model、usage、latency、guard_result；不含 raw input）

---

## 10. UI / UX 规范

> **视觉系统单一事实源 = `[docs/Design/DueDateHQ-DESIGN.md](../Design/DueDateHQ-DESIGN.md)`**
> 本章仅描述**产品语义**（关键组件承担什么功能、交互原则）。所有颜色 / 字号 / 间距 / 圆角 / 阴影 token，以及每个组件的像素级规格、亮暗色变体、Agent Prompt Guide 等**全部在 DESIGN.md 中定义**，本 PRD 不重复复述。

### 10.1 视觉方向（摘要 · 详情见 DESIGN.md §1–§3）

- **风格定位**：**Ramp × Linear · Light Workbench** —— CPA 的专业工作台，非金融 App、非营销站、非编辑刊物
- **字体**：Inter（正文 + UI）+ Geist Mono / JetBrains Mono（数字 / 金额 / 日期 / EIN / 规则 ID / 官方 URL · `tabular-nums` 强制）
- **主色**：Dify gray `#101828` 做主文字，Dify UI blue `#155aef` 仅用于 CTA / focus / selected nav；完整 token 以 DESIGN.md 与 `packages/ui` CSS tokens 为准
- **风险色系（唯一允许"鲜艳"的地方）**：Critical red `#DC2626` / High orange `#EA580C` / Medium yellow `#CA8A04` / Neutral slate `#475569`（**灰色 = OK**，绿色仅用于 Filed / Applied 完成态）
- **暗色模式**：浅色的镜像反色（暖色近黑 `#0D0E11`，禁用纯黑 `#000`），一等公民；方向 B 的 Bloomberg 终端风**不采纳**为 MVP 范围
- **分层**：1px 发丝线 `#E5E7EB` 优先；zero shadow by default；只有 Drawer / Modal 才加极小阴影
- **密度三档**：Compact 32px / Comfortable 36px（默认） / Spacious 40px
- **圆角**：组件 ≤ 4px，卡片 ≤ 6px，禁止 > 8px 的"胶囊"
- **动效**：< 200ms；尊重 `prefers-reduced-motion`；Hero 数字 Odometer 滚动 + Pulse Banner 脉冲 1.5s

### 10.2 关键组件（语义 · 详细规格见 DESIGN.md §4）

| 组件                | 功能语义                                                                                                     | 对应场景                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| **Risk Row**        | 客户 + 义务 + 倒计时 + $ 敞口 + Status + 行内操作；Critical / High 行带 2px 左边框 + tint 背景               | Obligations / Dashboard 表格行       |
| **Hero Metric**     | Dashboard 顶部 `$142,300 · AT RISK · NEXT 7 DAYS`（Geist Mono Bold 56px），靠排版层级而非容器                | Dashboard Layer 1 · Deadline Radar   |
| **Pulse Banner**    | 暖黄 tint + 1px 琥珀边框，源标题 + 受影响客户数 + `[Review]` `[Dismiss]`                                     | Dashboard Layer 2 · Story S3         |
| **Triage Tabs**     | This Week / This Month / Long-term 三段，每段带 `count + $` 数字，选中态使用 DESIGN.md 定义的 selected token | Dashboard Layer 3 · Story S1 AC1     |
| **Evidence Chip**   | 极小 mono 10px 徽章 `[IRS.GOV]`，hover 500ms 延迟弹 Verbatim Quote Popover；**DueDateHQ 独占设计资产**       | 所有 AI 输出 / 规则字段 / Pulse 条目 |
| **Penalty Pill**    | `$28,400 at risk` 单元，hover 分解 late-file + late-pay + interest + state surcharge                         | Obligation Detail / Obligations 行   |
| **Command Palette** | `⌘K` 三合一（Search / Ask / Navigate），560px 居中浮层，每条结果标快捷键                                     | 全局                                 |
| **Source Badge**    | `🔗 CA FTB · ✓ Human verified · 2d ago`，信任符号，比 Evidence Chip 信息量大                                 | Obligation Detail 底部               |

### 10.3 交互原则

1. **一切可操作物体都应有键盘快捷键**（`?` 列出全部；`⌘K` 是全局入口）
2. **状态切换零 modal**：单击行内 dropdown 即改，500ms Undo toast
3. **Skeleton loader，不 spinner**
4. **Optimistic UI**：本地先更新，失败再回滚 + toast
5. **Dark mode 跟随系统 + 手动可切**（`⇧⌘D`）
6. **空状态有价值**：空 Radar 写 "We're watching IRS + 5 state authorities for you. Last check 3 min ago."
7. **Copy as citation block**：复制"内容 + 来源 + 验证时间戳"（CPA 杀手锏）
8. **No Provenance = No Render**：AI 输出无 `source_url + verified_at + source_excerpt` 不得渲染

### 10.3 交互原则

1. **一切可操作物体都应有键盘快捷键**（`?` 列出全部）
2. **状态切换零 modal**：单击 pill 即改，500ms undo toast
3. **Skeleton loader**，不 spinner
4. **Optimistic UI**：本地先更新，失败再回滚 + toast
5. **Dark mode 跟随系统**
6. **空状态有价值**：空 Radar 写 "We're watching IRS + 5 state authorities for you. Last check 3 min ago."
7. **Copy as citation block**：复制"内容 + 来源 + 验证时间戳"（CPA 杀手锏）

### 10.4 无障碍（WCAG 2.2 AA）

- 色盲友好的风险色 + 双编码（颜色 + 图标）
- 键盘完整可达，焦点可见
- ARIA landmarks
- AI 输出 `lang="en"` 声明

### 10.5 响应式

- Desktop (≥ 1280px)：三栏
- Laptop (1024–1279)：两栏
- Tablet (768–1023)：单栏 + 可折叠侧栏
- Mobile (< 768)：只读优先 + Dashboard 顶三段 + Obligations 简化卡片

---

## 11. 信息架构

```
App (after login)
 ├─ Dashboard (Home, `/`)                    ← Story S1 主屏
 ├─ Deadlines (`/deadlines`)                    ← 高密度表格；Calendar sync 是二级出口 `/deadlines/calendar`
 ├─ Clients
 │   ├─ List (table)
 │   ├─ + Add clients ▾
 │   │    ├─ Import file / Paste  ← Migration 入口
 │   │    └─ Add one
 │   └─ Client Detail (drawer)
 │       ├─ Profile  (with EIN)
 │       ├─ Obligations (timeline)
 │       ├─ AI Risk Summary
 │       ├─ Audit
 │       ├─ Documents (P1)
 │       └─ [Export PDF]                     ← Client PDF Report
 ├─ Notifications (`/notifications`)         ← 个人 in-app notification inbox
 ├─ Rules (`/rules`)                         ← Rule Library + Source health + Pulse Changes tab
 ├─ Practice profile (`/practice`)           ← active practice name / timezone / delete
 ├─ Team Workload (`/workload`)              ← paid Operations surface
 ├─ Members (`/members`)                     ← 成员 / 邀请 / role / seat usage
 ├─ Billing (`/billing`)                     ← plan / checkout / portal / entitlement usage
 ├─ Audit Log (`/audit`)                     ← firm-wide write 操作时间线
 ├─ Account security (`/account/security`)   ← MFA / sessions
 ├─ Cmd-K
 │   ├─ Search
 │   ├─ Ask ✨
 │   └─ Navigate
 ├─ Practice Switcher (sidebar top · 多 practice membership 时显示；Add practice 受 plan gate)  ← §3.6.4
 └─ Import history (`/imports` legacy alias) ← redirects to `/clients?importHistory=open`
```

当前 sidebar IA：Operations（Dashboard / Obligations / Team workload）、Clients（Clients facts）、
Practice（Practice profile / Rules / Members / Billing / Audit log）。Notifications 在右上角 bell 和
`/notifications` route；Pulse Changes 合并到 Rules 的二级 tab，Rules 入口承载待处理 Pulse badge。
没有独立 `Alerts` / `Reports` / 聚合 `Settings` 一级路由。
不建 Intake / Review / Extension 独立导航——它们是 obligation 的状态层。

**公开页面（无需登录，SEO + 获客 + Rules-as-Asset 公开承诺）：**

工程归属：以下公开页面均属于 `apps/marketing` / `duedatehq.com`。登录后 SaaS app 继续部署在 `app.duedatehq.com`，不通过 SPA fallback 承载公开 SEO 页面。

```
/                           产品营销首页
/rules                      Rule Library 公开浏览（§5.7A + §6D.7）
/rules/federal              Federal 11 rules 细分页（SEO）
/rules/california           州级 rules（SEO 长尾，每州一页）
/rules/[state]              ...
/watch                      Source Registry 公开页（§5.7B + §6D.3）
/pulse                      Regulatory Pulse 实时 feed（SEO）
/security                   WISP 摘要 + 数据边界 + Verification Rhythm（§6D.6）+ E&O 声明
/pricing                    定价页
/evidence                   Glass-Box 纪律说明页
/get                        交付形态（Browser / Add-to-Home / Add-to-Dock / Menu Bar · §7.8.4）
/privacy                    隐私政策（含 Web Push 7 类事件声明 · §13.7A）
```

Public 页面相互 cross-link，形成 Rule Library → Source Registry → Verification Rhythm 的信任叙事闭环。

---

## 12. 指标与成败判据

### 12.1 North Star

> **Weekly Triage Completion** — 周一 8:00–11:00 内完成一次分诊 session 的 firm 数 / 活跃 firm 数。**目标 ≥ 50%。**

### 12.2 KPI（首 4 周）

**Activation（Migration）**

| 指标                                 | 目标             | 测量                                |
| ------------------------------------ | ---------------- | ----------------------------------- |
| Migration Time-to-First-Value        | **P50 ≤ 10 min** | signup → 首次看到 Deadline Radar $  |
| **Migration P95 完成时间（S2-AC5）** | **≤ 30 min**     | Signup → Import 完成（30 客户基准） |
| Migration Completion Rate            | ≥ 70%            | 进入 Step 1 → 完成 Step 4           |
| Migration Mapping Confidence         | ≥ 85%            | AI Mapper 平均 confidence           |
| Migration Revert Rate                | ≤ 10%            | 24h 内 Revert / 全部 batch          |
| Migration 激活率                     | ≥ 7/10           | 种子用户用 Migration（vs 手动录入） |

**Retention（Dashboard + Pulse）**

| 指标                            | 目标                        | 测量                              |
| ------------------------------- | --------------------------- | --------------------------------- |
| Setup 耗时                      | P50 ≤ 15 min                | signup → first calendar generated |
| Week-1 回访                     | ≥ 2 次 / 用户               | unique login days                 |
| Week-2 回访                     | 10 人中 ≥ 5 人              | 第 8–14 天 ≥ 1 次                 |
| **分诊 session 耗时（S1-AC5）** | **P50 ≤ 5 min**（第 2+ 次） | session 时长                      |
| Evidence 点击率                 | ≥ 30% 周活用户              | E 键 / chip 点击                  |
| Pulse Review 耗时（S3）         | ≤ 3 min                     | alert 打开 → apply                |
| AI Brief 有用率                 | ≥ 5/10                      | 退出访谈                          |
| Pulse Apply 次数                | ≥ 2 / firm                  | 真实 Apply                        |
| Smart sort 保留率               | ≥ 6/10 保持默认             | 未切换                            |

**Monetization**

| 指标           | 目标  | 测量                   |
| -------------- | ----- | ---------------------- |
| 付费意愿点击率 | ≥ 30% | $49 按钮               |
| 日历编辑率     | < 20% | 用户 override 系统日期 |

### 12.3 验收测试集（Traceability Matrix 延续）

| Test ID | AC     | 用例                                                             | 预期                                                     |
| ------- | ------ | ---------------------------------------------------------------- | -------------------------------------------------------- |
| T-S1-01 | S1-AC1 | 新用户登录后                                                     | 默认 Dashboard，选中 `This Week` tab                     |
| T-S1-02 | S1-AC2 | 本周 3 条 obligations                                            | TriageCard 左上显示 `[🔴 2d]` / `[🟠 5d]` 等             |
| T-S1-03 | S1-AC3 | 200 clients × 1000 obligations，应用 3 维筛选（CA + LLC + 1040） | 响应 < 1s，计时 DevTools                                 |
| T-S1-04 | S1-AC4 | 点击某行 status 下拉                                             | 500ms 内改完 + Undo toast                                |
| T-S1-05 | S1-AC5 | 模拟 85 客户场景，计时用户完成分诊                               | P50 ≤ 5 min                                              |
| T-S2-01 | S2-AC1 | 上传 TaxDome 官方导出 CSV                                        | Preset 命中 + 95% 字段映射                               |
| T-S2-02 | S2-AC2 | CSV 含 `Tax ID` 列                                               | EIN 自动识别，`##-#######` 格式化                        |
| T-S2-03 | S2-AC3 | CSV 有 5 行缺 state                                              | 非阻塞，其余 25 行正常导入                               |
| T-S2-04 | S2-AC4 | CSV 无 tax_types 列                                              | Default Matrix 生成全年 obligations                      |
| T-S2-05 | S2-AC5 | 30 客户从 signup 到 import                                       | P95 ≤ 30 min                                             |
| T-S3-01 | S3-AC1 | 模拟 IRS 发公告 T0                                               | T0 + 24h 内 Pulse 进 feed                                |
| T-S3-02 | S3-AC2 | Pulse: CA + LA + Individual + 1040；firm 有 12 客户符合          | Match 精确返回 12                                        |
| T-S3-03 | S3-AC3 | Approved Pulse 触发                                              | Dashboard Banner + Email Digest 双到达（同一事务）       |
| T-S3-04 | S3-AC4 | Banner 点 Review → Apply                                         | 12 条 obligation 批量更新 + Audit 12 条 + 24h Undo 可用  |
| T-S3-05 | S3-AC5 | 每条 Pulse 详情                                                  | `official_source_url` + `source_excerpt` 可点击 + 可复制 |

### 12.4 Go / Gray / Rethink

- **Go**：Week-2 回访 ≥ 5 ∧ ≥ 3 位愿付费 ∧ ≥ 5 位觉 AI 有用 ∧ 编辑率 < 30% ∧ Pulse Apply ≥ 2 ∧ Migration 激活率 ≥ 7/10
- **Gray**：回访 5–7 ∧ 付费 < 3 → 重新审视 ICP / 定价
- **Rethink**：回访 < 4 ∨ > 50% 觉不如 Excel ∨ 编辑率 > 40% ∨ Migration 激活率 < 5/10

---

## 13. 安全与合规

### 13.1 最小必要数据

**MVP 不存：** SSN / 完整税表金额 / 银行账号 / W-2/1099 具体数字  
**MVP 存：** 客户名 / EIN / 州 / 县 / 实体类型 / tax_types / 预估年营收（粗档）+ obligation 元数据

让 DueDateHQ 在 IRC §7216 与 FTC Safeguards Rule 下尽可能轻。

### 13.2 必做

- HTTPS 全站（Cloudflare Workers / custom domain）
- TLS 1.2+ / encryption at rest（Cloudflare D1 / R2 / KV 平台能力；应用层敏感 secret 另行 AES-GCM）
- Auth：Google One Tap / Google OAuth 是默认 SSO 入口；Microsoft Entra ID OAuth 可选；Email OTP passwordless 作为工作邮箱 fallback；会话 7 天
- MFA：7 天 Demo 不强制；真实试点 / 4 周 MVP 对 Owner 强制 TOTP；Team 版 Manager 在 P1 强制，Preparer/Coordinator 建议开启
- **RBAC 双层校验**（§3.6.3）：P0 强制 tenant isolation + Owner-only 写路径；P1 启用 oRPC procedure permission middleware + scoped repo 双层校验；前端按 role 渲染只是体验层
- Tenant 强隔离：所有 query 必须带 `firm_id` where
- 审计日志：所有写操作
- 备份：每日 + 保留 7 天
- **WISP**：7 天 Demo 可交 1-page draft；真实试点 / 4 周 MVP 交 WISP v1.0（5-page）
- 隐私声明：客户数据不训练任何外部 AI，仅用于 service delivery
- **AI PII 防泄**：客户姓名 / EIN / 邮箱在 Agent / Brief / Pulse prompt 中用占位符 `{{client_1}}`，生成后回填；Migration Mapper 仅发送 5 行样本

#### 13.2.1 Firm-wide Audit Log 页（Team 版合规核心 · P1-22）

**入口：** 侧栏 `Audit Log`（Owner / Manager 可见）

**目的：** 让事务所承担对客户的"职业责任"变得可证明。IRS 调查 / 客户投诉 / 内部争议时，Owner 可导出完整审计链路。

**字段列：**

```
Time (UTC + local)  |  Actor  |  Action  |  Entity  |  Before → After  |  IP / Device  |  [View detail]
```

**必须支持的 action 类型：**

| 类别       | Action                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Auth       | `auth.login.success` / `auth.login.failed` / `auth.mfa.enabled` / `auth.session.revoked`                          |
| Team       | `team.member.invited` / `.joined` / `.role_changed` / `.suspended` / `.left`；`firm.owner.transferred`            |
| Client     | `client.created` / `.updated` / `.deleted` / `.reassigned`                                                        |
| Obligation | `obligation.status_changed` / `.readiness_changed` / `.extension_decided` / `.reassigned` / `.penalty_overridden` |
| Migration  | `migration.imported` / `.reverted` / `.single_undo`                                                               |
| Pulse      | `pulse.applied` / `.reverted` / `.dismissed` / `.snoozed`                                                         |
| Rule       | `rule.report_issue` / `rule.updated`（系统）                                                                      |
| Export     | `export.csv` / `export.pdf` / `ics.feed_rotated`                                                                  |
| Ask        | `ask.query_run`（含 DSL，不含结果 PII）                                                                           |

**筛选：**

- Actor（成员多选）
- Action 类别（上述分组）
- 时间范围（预设 24h / 7d / 30d / 自定义）
- Entity（点击某客户 → 仅该客户相关）

**导出：**

- CSV 导出（Owner only）
- 触发时写 `export.audit` audit event（自递归记录）
- 导出文件通过邮件附件发送，不直接下载（防中间人）

**保留策略：**

- 活跃数据：**7 年**（IRS 推荐的客户记录保留期）
- `before_json` / `after_json` 对 PII 字段自动 hash 化（保留变更事实，不保留原始敏感数据）
- Firm 删除后，`actor_id` 匿名化为 `deleted_user_#`，但审计事件保留（合规诉讼证据）

### 13.3 红线（MVP 不碰）

- 不成为 IRS authorized e-file provider
- 不处理 IRS Publication 1345 范围的数据
- 不做 direct tax filing transmission
- 不申请 SOC 2 正式审计（路线图 Phase 3）
- 不承接 CCPA 阈值以上营销用数据

### 13.4 职业责任保障

- 购买专业责任险（E&O 保单），首年 $2M 保额
- 数据准确度 SLA：99.5% verified rules 准确（基于 practice QA）
- 错误赔偿条款：若因 DueDateHQ rule 错误导致客户罚款，最高赔偿当月订阅费 × 10 + 实际罚款（见 TOS）

### 13.5 Verification Rhythm 承诺（与 §6D.6 对齐）

对外公开的规则运营节奏承诺（`/security` 页公示）：

| 频率                    | 动作                           | 对象                              | 责任                     |
| ----------------------- | ------------------------------ | --------------------------------- | ------------------------ |
| **Every 30 min**        | IRS + CA FTB Newsroom scraping | Source Registry 高优先级源        | 自动 worker              |
| **Every 60 min**        | NY / TX / FL / WA tax news     | 中优先级源                        | 自动 worker              |
| **Daily**               | FEMA declarations              | Early warning（不生规则）         | 自动 worker              |
| **Weekly (Fri 9am PT)** | Base rule re-check vs. source  | 所有 verified base rules          | practice owner/manager   |
| **Quarterly**           | Full rule pack audit           | 全 rule library                   | practice owners/managers |
| **Before tax season**   | Comprehensive manual review    | 全 verified rules + 双人 sign-off | 高风险 rule 双人         |

所有 run 结果存档 `OpsCadence.last_report_s3_key`，可在 `/security` 页滚动显示最近 3 次 run 时间 + 结果。

### 13.6 明确不能承诺的事（Plan §7.5 对齐）

**DueDateHQ 不承诺：**

- ❌ 零遗漏
- ❌ 全自动实时更新
- ❌ 覆盖所有特殊适用条件
- ❌ AI 已确认税务结论
- ❌ 代替 CPA 做税务判断

**DueDateHQ 承诺：**

- ✅ 核心规则来自官方来源
- ✅ 每条 verified rule 经过人工验证（高风险双人）
- ✅ 高风险官方来源有持续健康监控
- ✅ 临时变更先进入复核，不静默发布为 verified rule
- ✅ 规则变更保留完整 audit（谁何时依据哪个来源）
- ✅ Verification Rhythm 可公开审阅

这套承诺写入 `/security` 页、TOS、Marketing FAQ 一致口径。

### 13.7A Web Push 与 PWA 隐私（P1-36 · §7.8.1）

- **订阅许可**：首次登录**不主动弹权限**；在用户首次创建 Pulse Banner 后、或主动访问 Notifications 时才请求
- **VAPID 密钥**：服务端私钥存 env var（不进仓库），定期轮换
- **endpoint 存储**：`PushSubscription.endpoint` 视同 PII，TLS + at-rest 加密（同客户 PII 级别）
- **去识别化**：`user_agent_hash` 使用 SHA-256 + salt，保留设备级识别但不可反推原始 UA
- **清理策略**：`consecutive_failures ≥ 3`（410/404 返回）自动 revoke，防止死链堆积
- **用户控制**：Notifications 页显示所有订阅设备（device_label / platform / last_used_at），支持单台注销
- **跨租户隔离**：同一 endpoint 可在多 Firm 订阅（`UserFirmMembership` 多对多），推送时按 `firm_id + user_id` 查订阅
- **Quiet Hours**：默认尊重设备本地 23:00–06:00 静默，push payload 带 `TTL` 和 `urgency=low`，关键事件（Pulse 法定级）用 `urgency=high` 覆盖
- **合规声明**：`/security` 页明确 "We do not send marketing push notifications"；`/privacy` 页列出可能推送的 7 类事件
- **Web Push 不训练任何 AI**：同全站 AI 策略一致

### 13.7B Menu Bar Widget 安全（P1-37 · §7.8.2）

- **Auth token**：menu bar 使用 Keychain 存储 OAuth refresh token；macOS Keychain ACL 限定本 app bundle
- **最小权限 API**：menu bar 只调 `/api/v1/me/radar-summary` 和 `/api/v1/me/top-urgent`；**不调任何写 API**
- **Auto-update**：Sparkle 框架 + HTTPS + EdDSA 签名验证（防中间人替换 app）
- **Notarization**：Apple notarization 发布（macOS Gatekeeper 兼容）
- **离线缓存**：最近一次 summary 最多缓存 24h + 标记"Offline · last sync 2h ago"，超时灰化显示

### 13.7 官方来源黑名单（Plan §3 对齐）

以下来源**不可作为 verified rule 的最终依据**：

- CPA 博客
- 新闻媒体转述
- Reddit / 论坛
- AI 直接回答（未经人工复核）
- 未注明官方出处的第三方 calendar

上述来源可**作为发现线索**（进入 Source Registry 的 `source_type=discovery_hint`，仅触发 practice review 入口），但不会自动产出 rule。

---

## 14. 路线图（不是工期承诺）

> 本 PRD 的产品范围不以 14 天裁剪；但作为 GTM 参考，给出阶段切片。

### 14.1 Phase 0 (MVP · ~4 weeks)

- P0 全部（§4.1）
- P1 的 Pulse + Ask + Client PDF + ICS（优先度由工程实际决定）
- **P1-36 PWA 壳**（manifest + service worker + Web Push · §7.8.1）— 低成本高 ROI，强烈建议提前到 Phase 0 尾部

### 14.2 Phase 1 (Weeks 5–12)

- Rules-as-Asset 全量落地（P1-29 ~ P1-35 · §6D）
- 50 州规则 full coverage（逐州签字 + 发布）
- 团队多席位 + assignee 完整 RBAC（P1-18 ~ P1-25 · §3.6）
- Stripe 计费已提前落地；Phase 1 只补发票资料、Tax/coupon、自助降级和 entitlement hard gate
- Google / Outlook 日历**单向写入**（不做双向同步）
- Zapier App
- 公共 SEO tracker 扩到全 50 州
- Client Readiness Portal（P1-26 · §6B）
- Onboarding AI Agent（P1-27 · §6A.11）

### 14.3 Phase 2 (Q3 2026)

- **P1-37 macOS Menu Bar Widget**（§7.8.2）— 游戏化 Scoreboard 24/7 常驻，Tauri ≈ 2 人天
- Audit-Ready Evidence Package（P1-28 · §6C）
- QBO / TaxDome / Drake 深度集成
- 文档链接引用（不做存储）
- 电子签名对接
- Penalty recovery 报告
- Audit trail 合规版
- SOC 2 审计路线

### 14.4 Phase 3 (Q4 2026+)

- Compliance Calendar API（卖给 TaxDome / Karbon 做 intelligence 层）
- Windows Menu Bar / System Tray Widget（视 GTM 需求决定）
- AI Agent 可生成客户沟通全套（CPA 只审批）
- 成为"官方 deadline intelligence layer"事实标准

> **Native App 不在路线图**。如 GTM 数据出现真实需求（≥ 30% 用户请求独立原生 app），再评估。目前 PWA + Menu Bar Widget 覆盖 ≥ 95% native 体验（§7.8.3）。

---

## 15. Go-to-Market · 集训 14 天 Playbook

> 本章节是**集训可执行版**。不做空洞的"多渠道营销"，只写：具体渠道、具体帖子标题、具体漏斗数字、具体日程。
> 对标 LangGenius 集训加分项 **+2（GTM 方案）+ +3（早交付）**。

### 15.1 定价（保持 §1.1 锚点）

| Plan       | 价格                     | 目标                | 包含                                                                      |
| ---------- | ------------------------ | ------------------- | ------------------------------------------------------------------------- |
| Solo       | **$39 / mo**             | 独立 CPA            | 1 practice workspace · 1 owner seat · Basic AI                            |
| Pro        | $79 / mo                 | 成长中的小事务所    | 1 production practice · 3 seats · Practice AI included                    |
| Team       | $149 / mo                | 10-seat operations  | 1 production practice · 10 seats · same Practice AI as Pro                |
| Enterprise | from $399 / mo           | 多办公室 / 复杂运营 | multiple practices/offices · 10+ seats · custom AI / coverage by contract |
| Trial      | **14 天免费 · 无信用卡** | 全部新用户          | 全功能试用                                                                |

**锚点论证（Pitch 30 秒版）：**

- File In Time $199/user 首年 → DueDateHQ $39/mo = 年费相当，但产品价值翻 10 倍（AI + 云端 + Pulse）
- Karbon $59+/user/mo → 我们便宜 33% 且专注 deadline（他们求大）
- **$39 = 一位 CPA 一天的 billable hour 的 1/10。免费试用时他只需要节省 1 天就 ROI。**

### 15.2 第一批 10 位 CPA 的获客 Playbook（集训 14 天内可执行）

#### 渠道矩阵（按 ROI 排序）

| 渠道                                                | 预期 signup                           | 预期 conversion | 成本 | 周期      |
| --------------------------------------------------- | ------------------------------------- | --------------- | ---- | --------- |
| **r/taxpros 软植入帖**                              | 200 浏览 → 10 click → 3 signup        | 30%             | $0   | Day 1–3   |
| **LinkedIn 冷邮 + 1:1 Demo**                        | 30 邮件 → 10 回复 → 4 demo → 3 signup | 75%             | 时间 | Day 4–10  |
| **CPA Facebook 群（CPAExamClub / Tax Pros Unite）** | 500 浏览 → 15 click → 2 signup        | 13%             | $0   | Day 2–5   |
| **华人 CPA 微信群（美国华人执业 CPA 协会）**        | 100 浏览 → 8 click → 2 signup         | 25%             | $0   | Day 3–7   |
| **IndieHackers / ProductHunt 预热**                 | 50 signup → 1 paying                  | 2%              | 时间 | Day 12–14 |

**目标：14 天内 10 位真实 CPA signup + 2 位录屏访谈。**

#### 15.2.1 Reddit r/taxpros · 精准埋伏帖（Day 1–3）

**帖子 1 · 用户故事切入型**

> Title: `My sister missed a CA Franchise Tax deadline and I (engineer) built something to help her`
>
> Body: `She's a solo CPA with ~80 clients across CA and NV. Every Monday she spent 45 min building a triage list in Excel, cross-checking Outlook and TaxDome exports. Last March she missed a Form 3522 by 2 days and the client got slapped with $800 penalty.`
>
> `So I built DueDateHQ. Paste your TaxDome/Drake/Karbon CSV, it AI-maps the fields (including Tax ID → EIN), generates the full year calendar with deadline readiness per deadline, and pulls IRS + 5 state regulatory bulletins into your inbox within 24 hours. Free 14-day trial, no CC.`
>
> `Does this solve a real problem for you, or is it solving a problem I imagined? Brutally honest feedback wanted.`

**关键技巧：**

- 不卖产品、卖故事（Reddit 最吃这一套）
- 故意自谦（`a problem I imagined`），引诱 CPA 反驳 + 评论
- 只留站外 link 一次，不要刷屏

**帖子 2 · 技术展示型（3 天后发）**

> Title: `Built a tool that turns every IRS deadline into a dollar-amount penalty estimate — CPAs, is this useful?`
>
> Body: `IRS §6651 is public: 5%/mo FTF + 0.5%/mo FTP + interest. So why do deadline tools still show "5 days left" instead of "$4,200 at risk if missed 90 days"?`
>
> `I built this for small CPA firms. It shows dollars, not days. Every number is source-linked to IRS pub 509 / state statutes — you can click and verify.`
>
> `Would love feedback from anyone who's ever had a client hit with a surprise penalty.`

**帖子 3 · Pulse 差异化型（6 天后发）**

> Title: `IRS just extended CA filing to Oct 15 for LA County — how many of your clients did you notify today?`
>
> `[Screenshot of Pulse Banner showing 12 affected clients]`
>
> `Built a tool that catches IRS/state bulletins within 24h, auto-matches to your clients by state + county + entity + form, and batch-updates deadlines in one click. Beta.`

#### 15.2.2 LinkedIn 冷邮 + 1:1 Demo（Day 4–10）

**搜索条件：**

- Title: `Certified Public Accountant` / `CPA` / `Enrolled Agent`
- 地区：California / New York / Texas / Florida / Washington
- Company size：`1-10 employees` / `Self-employed`
- Keywords: `tax preparation` / `tax compliance`

**冷邮模板（12 句以内 · 每封个性化 2 行）：**

```
Subject: 30-sec demo — for a CA CPA

Hi [First Name],

Saw you've been doing tax prep for [Company Name] for [X] years.
Quick question: how do you track multi-state deadlines today?

I built DueDateHQ — think of it as "File In Time + AI". Paste your
client list once, get the full year calendar with dollar-risk per
deadline. IRS + CA/NY/TX alerts pushed into your inbox within 24h.

If you have 15 min this week, I'd show you a 5-min demo using your
real client list (or a dummy one). I'll take your honest feedback
even if you never use it.

Free 14-day trial either way: app.duedatehq.com

— [Your Name]
```

**转化漏斗：**

- 发 30 封 → 10 回复 → 4 Zoom demo → 3 signup → 1 录屏访谈
- 录屏访谈是**最高优先级交付物**（Demo Day 开场 30 秒放录屏）

#### 15.2.3 CPA Facebook 群（Day 2–5）

**目标群：**

- `CPAExamClub`（~50k members）
- `Tax Pros Unite`（~12k members）
- `AICPA Small Firm Section`
- `Accountants & Bookkeepers Network`

**发帖策略：** **不直接推产品**，发"**公共福利内容**"钓鱼：

> Title: `Free: 2026 Complete California Franchise Tax Calendar (PDF, no signup)`
>
> Body: `Built this for my own firm but figured others might use it. Covers all 2026 dates for CA Franchise Tax Board — LLC, S-Corp, PTET, Estimated Tax. Each date has the statute reference and official link for your files.`
>
> `[PDF link]`
>
> `Built using my DueDateHQ beta — we're also watching IRS + 5 state bulletins 24/7, DM me if curious.`

PDF 本身由 §7.6 Client PDF Report 引擎生成，含 DueDateHQ 水印 + footer 带 signup link。

#### 15.2.4 华人 CPA 微信群（Day 3–7）

美国华人 CPA 是被严重忽视的 beachhead：

- 他们服务的华人中小企业主**更痛 PTE / Franchise Tax**（在加州尤其）
- 他们**强烈信任口碑推荐**（不靠 SEO）
- 独立 CPA 占比高

**渠道：**

- 美国华人执业 CPA 协会（微信群）
- 硅谷华人 CPA 聚集地（Saratoga / Fremont / Irvine）的 LinkedIn
- Rednote（小红书）搜 `在美CPA` 标签

**切入点（中文）：**

> "我做了一个工具给美国独立 CPA，专治多州截止日期。特别是 CA Franchise Tax、NY PTET、TX Franchise 这几个容易漏的。粘贴 TaxDome 导出的 Excel，30 分钟生成全年日程表。想找 2 位华人 CPA 朋友试用一下提意见，免费用 14 天，我送一杯咖啡。有兴趣的 DM 我。"

#### 15.2.5 14 天日历（Playbook 具体到天）

| Day | 行动                                                  | 量化目标          |
| --- | ----------------------------------------------------- | ----------------- |
| D1  | Reddit 帖 1（故事型）+ 打磨 Landing page              | 200 浏览          |
| D2  | Facebook 群发 CA Franchise PDF 钓鱼                   | 50 PDF 下载       |
| D3  | Reddit 帖 2（Penalty 美元型）                         | +200 浏览         |
| D4  | LinkedIn 冷邮第一批 10 封                             | 3 回复            |
| D5  | LinkedIn 冷邮第二批 10 封 + 微信群                    | 3 回复 + 1 signup |
| D6  | 约第一位 CPA 1:1 demo（Zoom）                         | 录屏              |
| D7  | Reddit 帖 3（Pulse CA 延期型）+ LinkedIn 第三批 10 封 | +3 signup         |
| D8  | 约第二位 CPA 1:1 demo + 优化 onboarding               | 录屏              |
| D9  | Pilot CPA 真实导入 30 客户，跟进 3 天                 | 获取使用反馈      |
| D10 | Pilot CPA 用 Pulse + Readiness Portal                 | 跨场景验证        |
| D11 | IndieHackers 预热帖                                   | 50 signup         |
| D12 | Pilot CPA 录 90 秒访谈视频                            | 开场素材          |
| D13 | Demo Day 排练 + 数据冻结                              | —                 |
| D14 | Demo Day + ProductHunt launch                         | —                 |

### 15.3 Demo Script（6 分钟 · 集训优化版）

> 关键原则：**前 30 秒决定现场观众是否记住你。** 其他组会从"产品介绍"开场；你要从"真实用户口证"开场。

#### 15.3.1 开场 · 0–30s · 真实 CPA 口证（致命武器）

**切掉传统 Pitch 句，换成 30 秒录屏：**

```
[Video on, no slides]

Sarah Mitchell, CPA · San Francisco · camera-on Zoom recording:

"I've been a CPA for 12 years and I've tried 4 deadline tools.
They either cost $200/month or they're stuck in 2005.

Last Thursday I imported my 62 clients into DueDateHQ. It took
me 23 minutes. The next morning I opened it, and it had already
flagged 4 of my clients that would be affected by the IRS
California storm relief bulletin — I hadn't even heard about
that yet.

This is the first tool where I feel like someone actually
understands how a small CPA practice works."

[Cut. Presenter on screen.]
Presenter: "That's Sarah. Here's what she used."
```

**为什么这 30 秒击败 59 组竞品：** 所有其他组开场都是"我做了一个产品"。你开场是"一个真实用户说'这是第一个真正懂我的工具'"。现场观众前 30 秒就在心里给你打了 top 5。

##### 15.3.1b 录屏后 5 秒 · PWA "Add to Dock" 收尾（Native 体验第一击）

```
[Cut 回到现场演示屏幕 · macOS Safari 打开 app.duedatehq.com]
[地址栏右侧 Install 图标闪烁]

Presenter: "Sarah uses this from her Mac. She added it to her Dock
like this —"

[Click Install 图标 → 1 秒对话框 → 点 'Install']
[Dock 上瞬间出现 DueDateHQ 图标 + Dock badge 显示 🔴 3 overdue]

Presenter: "— and now it lives in her Dock like any other app.
Independent window, system notifications, red badge when things
go overdue. No app stores, no installers."

[Switch to 主屏幕 · 手机 (另一设备) 也显示 Home Screen 图标]

Presenter: "Same app, same account, on her phone. When an IRS
bulletin comes in —"

[触发一条 push · 手机屏幕弹出 iOS 通知 "IRS: CA storm relief
affects 12 of your clients"]

Presenter: "— she knows in 2 seconds, not 2 days."
```

**为什么加这 5 秒：** 现场观众前 30 秒听了真实用户口证建立**信任**，这 5 秒给他们看到"这不是一个 Chrome tab 里的原型 — 它住在你的 Dock 里"——瞬间建立**产品真实感**，让后续所有功能演示更"像一个真 app"。

#### 15.3.2 30–90s · Onboarding AI Agent + Live Genesis（现场观众亲手互动）

**把现场观众拉进来：**

```
Presenter: "Before I demo, can I get a number from you? How many
clients does a typical small CPA firm handle?"

(wait for audience to respond, e.g., "around 50")

Presenter: "Perfect. Watch this."

[Switch to DueDateHQ empty state · Onboarding AI Agent full-screen]

Agent: "Hi! Are you solo or in a small firm?"
Presenter types: "solo"

Agent: "Roughly how many active clients?"
Presenter types: "around 50"  ← 现场观众报的数字

Agent: "Got it. Most of them US-based?"
Presenter types: "all in CA, mostly LLCs"

Agent: "Perfect — I've pre-loaded CA Franchise Tax + federal rules.
Now paste your client list in any format."

[Presenter Cmd+V a pre-prepared 50-row messy TaxDome Excel]

Agent: "Reading... Found 52 clients, detected 7 columns including
Tax ID (EIN), 3 entity types need cleanup. Before I commit:
I'll generate 247 deadlines with $31,400 exposure this quarter.
OK to proceed?"

Presenter: "go"

[LIVE GENESIS 4 秒动画 · 顶栏 $ 从 $0 一路滚到 $31,400]
[粒子动画 +$4,200 +$2,800 +$1,650 飞入顶栏]
```

**记忆钩子：**

- 现场观众报的"50"数字真的变成了 Agent 对话内容 → **"这不是演过 100 遍的脚本"**
- Live Genesis 粒子动画是整场 Demo 唯一的视觉高潮

#### 15.3.3 90–180s · Monday Triage（游戏化 Penalty 顶栏）

```
Presenter: "Imagine it's Monday 8am. You open DueDateHQ."

[Dashboard 载入 · 顶栏 $31,400 at risk this week 76px 粗体 JetBrains Mono]

Presenter: "This is Sarah's Monday. The top bar is her 'casino
scoreboard' — $31,400 at risk this week. Every click can make
this number go down."

[Click Acme LLC row → status change to Filed]

Presenter: "One click — $4,200 disappears."

[顶栏数字滚动 $31,400 → $27,200，绿色闪光]

Presenter: "Smart Priority ranks by deadline readiness, not due date.
Hover this sparkle badge..."

[Hover Smart Priority badge → 展开因子分解]

Presenter: "... you see why this is rank 1: $4,200 at risk, 3 days
left, client waiting. Every number clicks back to the IRS or
state source. Let me show you."

[Click E key → Evidence Mode drawer]

Presenter: "This is why CPAs bet their license on us — every
rule has a source excerpt and human-verified timestamp."
```

**记忆钩子：** 顶栏数字滚动 + 绿色闪光是**唯二的视觉高潮**。

#### 15.3.4 180–240s · Client Readiness Portal（跨设备实时演示 · 杀手锏）

```
Presenter: "Now the part File In Time can never do."

[Open Obligation Detail for "Bright Studio S-Corp" → Readiness 区块]

Presenter: "Sarah needs 3 things from this client. Normally she
spends 20 minutes calling. Instead, watch."

[Click 'Send readiness check to client' → QR code 弹出]

Presenter: "Can anyone in the room pull out your phone?"

(audience member scans QR)

[Audience member's phone shows the Client Portal page — 免登录]

Presenter: "They can tap 'I have it' / 'Not yet' / 'I don't
understand' — all without logging in, no app install."

(Audience taps "I have it" on 2 items)

[Dashboard 实时更新：readiness badge Waiting → Ready 绿色闪光]

Presenter: "Look at the Dashboard. Sarah just saved 20 minutes
without saying a word to her client. And every response is
in the audit log."

[Scroll Audit Log → 新行 "Client responded from mobile 2s ago"]
```

**记忆钩子：** 跨设备实时同步是**全场最震撼的 5 秒**。现场观众会把这个画面带回去说给同事听。

#### 15.3.5 240–300s · Regulatory Pulse（主动性叙事）

```
Presenter: "And it's not just that we answer when you ask.
We interrupt you when something changes."

[Fast-forward：Dashboard 顶部 Pulse Banner 红色脉冲出现]
[Banner: "IRS CA storm relief → 12 of your clients affected"]

Presenter: "Sarah didn't ask for this. 8 minutes ago, IRS
published a relief bulletin. Our worker caught it, the AI SDK pipeline
extracted the affected counties and forms, and the match
engine found the 12 of her clients in LA County with
1040 or 1120-S due on March 15."

[Click Review & Batch Adjust → 抽屉展开 12 客户清单]
[点 Apply → 事务执行 + Toast]

Presenter: "One click. 12 deadlines moved. 12 emails going out
to the assignees. Every change in audit log with source URL."

[手机叮一声，收到邮件 · 现场放音效或真实邮件]
```

#### 15.3.6 300–360s · Evidence 收束

```
Presenter: "Last thing. Watch the whole story come together."

[Open Client Detail → Audit Tab]

Presenter: "Acme LLC was imported from Sarah's TaxDome Excel.
The entity was originally 'L.L.C.' — our AI normalized it to
'LLC' with 97% confidence. The CA Franchise Tax obligation
was generated by our default matrix for LLC×CA. Last Thursday
the IRS bulletin shifted the due date. Every step is clickable
back to the source."

[Press E key → Evidence Mode → 完整 provenance chain]

Presenter: "If the IRS ever audits Sarah, she exports this
whole evidence package as a signed ZIP. 90 seconds. Done."

[Click Audit export → SHA-256 hash 一键生成]

Presenter: "Every tax AI today is a confident stranger.
DueDateHQ is a tax AI that shows its work — from the first
paste to the IRS-auditable weekly brief."

Presenter: "Thank you."
```

#### 15.3.7 Plan B 预案

| 故障              | 降级                                                |
| ----------------- | --------------------------------------------------- |
| 现场 Wi-Fi 挂     | 4K 录屏版 + 解说音轨准备好，无缝切换                |
| AI SDK 调用超时   | Onboarding Agent 所有回复预录缓存，本地 sw fallback |
| Live Genesis 卡顿 | CSS 动画独立运行，不依赖 API                        |
| 现场观众不愿扫码  | 预准备一部备用手机，自己扫                          |
| Pulse 现场抓不到  | 1 条 approved Demo Pulse 预置，脚本化触发           |
| 邮件到达延迟      | 现场放提前录好的邮件通知音效 + 手机屏录             |

### 15.4 Pitch 文档要点（交付加分 +2）

6 页精简版（PDF，Keynote 也出一份）：

1. **Page 1 · 问题**：Sarah 的周一 45 分钟（访谈原话 + 数字）
2. **Page 2 · 解决方案**：三条铁律（30s / 30min / 24h）+ 产品截图 3 张
3. **Page 3 · 差异化**：对比表 vs File In Time / TaxDome，突出 Glass-Box + Readiness Portal
4. **Page 4 · 市场**：美国 65 万 CPA + 独立/小所占比 + SAM 估算
5. **Page 5 · GTM 14 天漏斗**：本节 §15.2 图表化
6. **Page 6 · Ask**：$39/mo × 1% 渗透 = ARR $3M 规模 + 集训 Ask（不确定 ask 什么，可写"希望与真实 CPA 用户继续深聊"）

### 15.5 落地页（SEO + 信任锚点）

工程归属：本节页面由 `apps/marketing` Astro static site 实现；CTA 跳转 `app.duedatehq.com`。

- `/` — Hero + Demo video loop（15.3 录屏剪辑版）
- `/pulse` — 实时 Pulse feed（SEO 爆款，Google 会常驻收录）
- `/state/california`（及其他州）— Public State Tracker 长尾 SEO
- `/security` — WISP 摘要 + 数据边界 + E&O 保险声明
- `/pricing` — 三 tier + ROI 计算器 `你有 N 客户 → 每月节省 X 小时 → 值 Y 美元`
- `/evidence` — Glass-Box 纪律说明页（对标 Dify 审美 · 展现产品原则）

### 15.6 发布内容日历（SEO 长尾 · 每周 2 篇）

| 周  | 标题                                                             | 目标                 |
| --- | ---------------------------------------------------------------- | -------------------- |
| W1  | 2026 Federal Tax Deadlines for Small CPA Firms                   | TOFU 流量            |
| W1  | California Franchise Tax: What Every LLC CPA Needs to Know       | 州 SEO               |
| W2  | NY PTET Election: The Deadline Every Partner Forgets             | 州 SEO               |
| W2  | Why Your Tax AI Needs a "Source" Button                          | 差异化叙事           |
| W3  | Texas Franchise Tax in Under 5 Minutes                           | 州 SEO               |
| W3  | IRC §7216 and Why Your AI Notes Must Be Auditable                | 合规叙事             |
| W4  | A CPA's Guide to Disaster Relief Deadlines                       | Pulse 叙事           |
| W4  | Penalty Math: How Much a Missed 1120-S Actually Costs            | Penalty 叙事         |
| W5  | From Excel to Obligations: 30-min CPA Migration Guide            | Migration 叙事       |
| W5  | Building a WISP in a Day                                         | 合规叙事             |
| W6  | How a Client Self-Service Portal Cut My Monday Calls by 80%      | Readiness 差异化叙事 |
| W6  | I Let an AI Agent Onboard My CPA Practice — Here's What Happened | Agent 差异化叙事     |

### 15.7 集训加分三项对齐

| 加分项          | 对应本章节                                  | 关键交付                                       |
| --------------- | ------------------------------------------- | ---------------------------------------------- |
| **+1 部署**     | §11 技术架构 + 实际 Cloudflare Workers 部署 | 公开 URL：`app.duedatehq.com`                  |
| **+2 GTM 方案** | §15.2–15.6                                  | 6 页 Pitch PDF + Landing page 上线 + 14 天日历 |
| **+3 提前交付** | §15.2.5 Day 12 目标                         | D13 前 commit frozen，D14 留给 Demo 排练       |

加上 §15.3 的真实 CPA 开场与现场互动记忆钩子，这就是**稳定脱颖而出的组合拳**。

---

## 16. 风险与对策

| 风险                         | 概率 | 影响 | 对策                                                                           |
| ---------------------------- | ---- | ---- | ------------------------------------------------------------------------------ |
| AI 幻觉导致错误税务内容      | 中   | 高   | 强 RAG + citation 校验 + 黑白名单 + 显著 "Not tax advice" 声明                 |
| Pulse RSS 抓取不稳           | 高   | 中   | 6 源冗余 + 失败降级 mock + 1 条预置 + "Last checked X min ago" 诚实显示        |
| 规则录入错误                 | 中   | 高   | 双人复核签字 + `verified_by` 留痕 + Report issue 回路                          |
| Migration AI Mapper 置信度低 | 中   | 高   | 5 个 Preset + 低置信度 UI 强制确认 + 所有映射可后悔                            |
| Migration 原子事务失败       | 低   | 高   | 单行失败不阻塞 + 失败行导 CSV + 24h Revert                                     |
| 粘贴含 SSN                   | 中   | 中   | 前端正则拦截 + 该列强制 IGNORE + 红色警示                                      |
| 数据泄露                     | 低   | 高   | 最小必要数据 + TLS + 加密 + WISP + E&O 保险                                    |
| IRC §7216 违规               | 低   | 高   | PII 占位符化 + 最小样本 + AI SDK facade + Cloudflare AI Gateway retention 控制 |
| 现场观众 Demo 60s 内记不住   | 中   | 致命 | Clarity Engine 叙事 + Live Genesis 戏剧性 + Penalty $ 数字                     |
| 同期竞品同质                 | 高   | 中   | Glass-Box 纪律（others won't）+ Migration Copilot 端到端 + 50 州骨架           |
| Pulse Apply 把不该改的改了   | 低   | 高   | 默认 `requires_human_review` + Ops Approve + 24h Undo + Audit                  |

---

## 17. 交付物清单

| 交付                   | 形态          | 验收                                                     |
| ---------------------- | ------------- | -------------------------------------------------------- |
| Production build       | URL           | §12.3 全部 Test ID 通过                                  |
| 源码仓库               | GitHub        | README + setup < 10 min                                  |
| 种子数据               | SQL dump      | 一键 restore（30 规则 + 30 demo 客户 + 2 Pulse）         |
| Demo 视频              | MP4 4K        | 6 分钟，字幕                                             |
| Pitch deck             | PDF + Keynote | 10 页                                                    |
| **WISP v1.0**          | PDF           | 真实试点 / 4 周 MVP：5 页；7 天 Demo 可提交 1-page draft |
| Public Pulse page      | URL           | 首批 ≥ 5 条真实 alert                                    |
| 试点反馈               | Notion        | ≥ 3 位 CPA                                               |
| 付费意愿数据           | CSV           | 点击率报表                                               |
| PRD（本文档）          | Markdown      | Frozen commit                                            |
| AC Traceability Report | HTML          | §12.3 测试全通过截图                                     |
| 5 套 Preset Sample CSV | CSV           | TaxDome / Drake / Karbon / QB / FIT                      |

---

## 18. 附录

### 18.1 竞品价格锚点（2026-04 公开）

- File In Time: ~$199/user 首年 + $100/user/年维护
- Jetpack Workflow: $49/user/mo
- Financial Cents: $19 / $49 / $69
- Karbon: $59–$99/user/mo
- TaxDome: $800–$1,200/user/year
- Canopy: $74 / $109 / $149

### 18.2 官方数据源（MVP 硬编码）

- IRS Publication 509: Tax Calendars
- IRS Form 7004 Instructions（extension 不延 payment）
- IRS IRC §6651（penalty formulas）
- CA FTB Publication 3556（LLC franchise）
- CA R&TC §17941
- NY Tax Law §860 及 PTET 指南
- TX Tax Code §171（franchise tax）
- FL DOR 年度日历
- WA DOR B&O tax
- MA DOR Form 1 / Form 2 / Corporate Excise

### 18.3 术语表

- **Obligation Instance**: 客户 × 规则 × 税年 的一条可执行任务
- **Evidence Chain**: obligation / AI output / migration decision 到原始官方来源的可追溯链路
- **Pulse**: Regulatory Pulse 单条公告事件
- **Pulse Application**: Pulse 应用到某个客户的单次记录
- **Glass-Box**: 所有 AI 输出强制 provenance 的产品纪律
- **Migration Batch**: 一次外部数据源导入的事务单元，原子提交 + 24h 可 Revert
- **Live Genesis**: 导入完成瞬间 deadline 卡片涌出 + Deadline Radar 滚动的动画
- **Default Tax Types Matrix**: `entity × state` 查表兜底的合规组合表（§6A.5）
- **Smart Priority**: 纯函数打分的跨页面统一排序（§6.4）
- **WISP**: Written Information Security Plan（IRS Pub 5708 要求）
- **ICS 单向订阅**: Firm 级 token URL 供 Outlook / Google / Apple 订阅（P1-11）

### 18.4 与前两份 PRD 的集成映射（工程交接用）

| 组件                                 | 来源                             | v2.0 位置       |
| ------------------------------------ | -------------------------------- | --------------- |
| Clarity Engine 叙事                  | v1.0 §0.1                        | §1.2 / §6       |
| Migration Copilot 4 步               | v1.0 §5.8 / §6A                  | §6A.6           |
| Evidence Mode 完整设计               | v1.0 §5.5                        | §5.5            |
| Deadline Radar 计算                  | v1.0 §6.3 + Competitor F-18      | §7.5            |
| Default Tax Types Matrix             | v1.0 §6A.3A                      | §6A.5           |
| Smart Priority 纯函数                | v1.0 §6.4                        | §6.4            |
| AI tie-breaking                      | Competitor F-5b 思路 + v1.0 约束 | §6.4.5          |
| Ask Assistant DSL 双保险             | v1.0 §6.5 + Competitor F-19      | §6.6            |
| Client PDF Report                    | v1.0 §6.6                        | §7.4            |
| ICS 单向订阅                         | v1.0 §4.2 脚注                   | §4.2 P1-11      |
| Pulse 数据模型                       | Competitor §5.2.1                | §6.3 + §8.1     |
| Pulse 邮件耦合                       | **新增**（两份均弱）             | §6.3.4          |
| EIN 字段识别                         | **新增**（两份均缺）             | §6A.2 + §8.1    |
| County 筛选维度                      | **新增**（v1.0 只 Pulse 用）     | §5.2.3 + §8.2   |
| AC Traceability Matrix               | **新增**（两份均缺完整版）       | §3 + §12.3      |
| 50 州骨架策略                        | **新增**                         | §6.1.6          |
| 双档 Revert（24h batch / 7d client） | 融合两者                         | §6A.7           |
| Last-checked 可信度信号              | Competitor §5.1                  | §5.1.4 + §6.3.5 |

### 18.5 何时打破 PRD

只有两种情况可推翻 §4.1 P0：

1. 真实 CPA 在 ≥ 3 次试用中均反馈 "没 X 就不能用"（需录屏证据）
2. §16 任一 Critical 风险实现，且无 degraded mode

否则：**任何新需求，一律下个迭代。**

---

## 19. 产品一句话定位

> **Most tax tools make CPAs earn their value. DueDateHQ earns it back in the first 10 minutes.**
>
> Paste a spreadsheet. Watch 152 deadlines appear. See $19,200 at risk. Click any number — it shows its work.
>
> When an IRS bulletin drops, your Dashboard and inbox update within 24 hours, with the 12 affected clients and the official source link already there.
>
> **Every tax AI today is a confident stranger. DueDateHQ is a tax AI that shows its work** — from the very first paste to the IRS-auditable weekly brief.

**Build it. Ship it. Show the work.**
