# DueDateHQ PRD v2.0 — Unified PRD · Part 1A（§0–§6：产品定位 + Clarity Engine）

> 文档类型：产品需求文档（统一版 / Build-complete PRD）· **Part 1A / 4**
> 版本：v2.0（集成 v1.0 主 PRD 与 v1.0-FileInTime-Competitor 优势）
> 日期：2026-04-23
> 目标：以 `docs/html/DueDateHQ - 用户故事与价值主张画布.html` 中 **P0 + P1 全部验收标准** 为强约束，重新定义 DueDateHQ 产品需求基线
> 范围定位：**产品完整性优先**，不以 14 天工期裁剪范围。本 PRD 是"能卖、能审计、能放规模"的目标形态；工期分配放在 §14，但不再是范围决定器
> 对外语言：English-first（产品 UI / 官网 / 邮件 / Demo），内部文档与代码注释使用英文
> 平台：Web-first（响应式）+ PWA 壳（必做 · Add-to-Dock / Home-Screen / Web Push）+ macOS Menu Bar Widget（Phase 2）+ ICS 单向订阅；**不做 native 功能复制 App**
> 阅读对象：PM / Design / Engineering / GTM / Compliance / 产品决策人

> **📄 分册导航（4 册拆分版 · 原 Part 1/2 因渲染性能问题拆为 A/B）**
>
> - **Part 1A（本册）**：§0 版本对比 · §1 产品定位 · §2 用户与场景 · §3 用户故事与 AC · §4 功能范围 · §5 核心页面 · §6 Clarity Engine
> - **Part 1B**：§6A Migration Copilot · §6B Client Readiness Portal · §6C Audit-Ready Evidence · §6D Rules-as-Asset → 见 [`DueDateHQ-PRD-v2.0-Part1B.md`](./DueDateHQ-PRD-v2.0-Part1B.md)
> - **Part 2A**：§7 其他核心功能 · §8 数据模型 → 见 [`DueDateHQ-PRD-v2.0-Part2A.md`](./DueDateHQ-PRD-v2.0-Part2A.md)
> - **Part 2B**：§9 AI 架构 · §10 UI/UX · §11 信息架构 · §12 指标 · §13 安全合规 · §14 路线图 · §15 GTM Playbook · §16 风险 · §17 交付物 · §18 附录 · §19 产品一句话 → 见 [`DueDateHQ-PRD-v2.0-Part2B.md`](./DueDateHQ-PRD-v2.0-Part2B.md)

---

### 0.1 两份前作的核心判断与差距

| 维度                   | v1.0 主 PRD（Glass-Box Copilot）                                   | v1.0 Competitor PRD（FileInTime Replacement）            | v2.0 的处理                                                                                  |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 核心叙事               | Clarity Engine™（Glass-Box + Pulse + Penalty）+ Migration Copilot™ | Autopilot Regulatory Radar + AI Migration Copilot        | **继承 v1.0 叙事**（更利于 Demo 记忆），融入 Competitor 的工程细节                           |
| AC 可追溯性            | §3.4 有矩阵，但偏章节映射                                          | §14.1 对比 v0.3 边界，AC 散落 §5                         | **前置 AC Traceability Matrix**（§3.5），每条 AC → 功能 + 验收测试编号                       |
| 时间分组命名           | This Week / This Month / Long-term（对齐 Story S1 AC#1）           | Critical / High / Upcoming（需语义映射）                 | **采用 v1.0 命名**，并叠加风险色条（Critical/High）作为段内次级视觉                          |
| Penalty 引擎           | Deadline Radar™（顶栏 $ 聚合 + What-If）                           | F-18 Penalty Forecaster（硬编码表 + `needs input` 降级） | **融合**：Radar 的 UX + Forecaster 的计算表（§7.5）                                          |
| AI Smart Priority      | §6.4 纯函数打分（权重固定）                                        | F-5b 段内 AI 排序 + 硬排 fallback                        | **采纳 v1.0 纯函数版**（可解释、零幻觉），**可在未来配置 surface 切 AI tie-breaker**（§7.4） |
| AI Q&A                 | §6.5 DSL 中间层（安全）                                            | F-19 直接 NL→SQL + parser 校验                           | **融合**：DSL 外层 + SQL 白名单内层，双保险（§7.7）                                          |
| 证据链纪律             | Evidence Mode + `EvidenceLink` 表                                  | SourceBadge + source excerpt                             | **采纳 v1.0 Evidence Mode**，并强制每条 Pulse 结构化字段附 source excerpt（Competitor 做法） |
| EIN 字段               | 未显式                                                             | 未显式                                                   | **新增**：客户模型加 `ein`，Migration AI Mapper 显式识别（Story S2 AC#2）                    |
| 县筛选                 | 仅 Pulse 匹配用                                                    | 未列                                                     | **新增**：Obligations 与 Ask 均支持 county 维度                                              |
| Pulse 通知             | Banner + email 分散                                                | Banner + email 分散                                      | **显式耦合**：每条 approved Pulse 触发同一事务内发 Banner + Email Digest（§6.3.4）           |
| 日历能力               | ICS 单向订阅（P1）                                                 | 未做                                                     | **采纳 ICS 订阅，提升到 P1 首发**                                                            |
| Default Tax Types 兜底 | §6A.3A 矩阵（优秀）                                                | 无                                                       | **保留并扩展到 50 州骨架**（§6A.5）                                                          |
| Undo 时限              | 24h                                                                | 7 天                                                     | **融合**：全量 Revert 24h；单客户级 Undo 7 天（§6A.7）                                       |
| 50 州覆盖策略          | 早期草案只做有限州覆盖                                             | 同                                                       | **更新为 `FED + 50 states + DC` source-backed coverage**，candidate 仍需 review（§6.1.6）    |

### 0.2 v2.0 的产品一句话

> **DueDateHQ is the glass-box deadline intelligence platform for US CPAs — from the first paste of an Excel list to the IRS-auditable weekly brief, every deadline, every AI sentence, every rule-change alert clicks back to its official source, verified timestamp, and dollar-denominated risk.**

### 0.3 v2.0 的三条铁律（产品必须达成的体验级 SLA）

1. **30 秒** 看清本周最危险的 3–5 个客户（Dashboard 首屏 + Deadline Radar 顶栏）
2. **30 分钟** 完成 30 客户的**从粘贴到生成全年日历**的全链路（Migration Copilot）
3. **24 小时** 内一条州税局 / IRS 官方公告进入 Dashboard Banner + Email，附官方来源链接与受影响客户清单（Regulatory Pulse）

这三条与 Story S1 / S2 / S3 的核心 AC 一一对应，是整份 PRD 的**验收北极星**。

---

## 1. 产品定位与竞争坐标

### 1.1 竞品坐标

| 维度     | File In Time             | TaxDome / Karbon / Canopy | **DueDateHQ v2.0**                                        |
| -------- | ------------------------ | ------------------------- | --------------------------------------------------------- |
| 核心定位 | Desktop deadline tracker | All-in-one firm OS        | **Deadline intelligence copilot**                         |
| 部署     | Windows 桌面 + 网络盘    | Cloud SaaS                | Cloud-native SaaS + ICS 单向订阅                          |
| 规则更新 | 年度维护包               | 用户自维护                | **24h 内 AI 捕获 → 人工复核 → 发布**                      |
| AI 能力  | 无                       | 点缀型                    | **Glass-Box，强制 provenance + 截止日风险 + Ask**         |
| 风险表达 | 红色字体                 | 天数                      | **截止日风险 + 风险因子分解 + Penalty 规则链接**          |
| 目标用户 | 传统小所                 | 中大型事务所              | **独立 CPA + 1–10 人事务所**                              |
| 迁移摩擦 | 结构化 CSV               | 人工录入 / 顾问协助       | **Paste-anywhere + AI Mapper + 24h Revert**               |
| 价格锚点 | ~$199/user/年 + 维护     | $600–1,500/席/年          | **Solo $39 / Pro $79 / Team $149 / Enterprise from $399** |

### 1.2 DueDateHQ IS / IS NOT

**IS**

- 云端多租户 SaaS Web App，浏览器即开即用
- **Deadline-first Obligations**：首页不是 CRM、不是月历，而是按风险排序的本周处理清单
- **Glass-Box AI 副驾**：AI 负责解释、排序、起草；CPA 保留专业判断
- **审计可追溯系统**：所有 deadline / 规则 / AI 输出 / 客户状态变更均留痕
- **迁移友好**：Excel / CSV / Google Sheets / 粘贴 30 分钟内完成 30 客户导入
- **规则变化雷达**：IRS + 州税局公告 24h 内进入 CPA 视野

**IS NOT**

- ❌ Tax preparation software（不计算税额、不生成税表）
- ❌ Direct e-file transmitter（不承担 IRS e-file provider 合规责任）
- ❌ Client portal / document vault
- ❌ CRM / billing / time tracking 套件
- ❌ 无证据的 AI 税务顾问（AI 不下税务结论）
- ❌ 全自动改规则的 AI（AI 永远只建议，人工点 Apply）

### 1.3 设计原则

1. **Deadline-first, not calendar-first.** 首屏是风险队列。日历是输出端（ICS 单向订阅），不是编辑端。
2. **One object, multiple views.** 一个 `ObligationInstance` 承载 deadline / readiness / extension / risk / review / audit。
3. **Dense but modern.** 税务人熟悉的表格密度 + 2026 水准交互。
4. **Explainable by default.** AI 无 provenance = 不渲染。
5. **Human-in-the-loop.** AI 永不自动改 deadline 规则；Apply 必须人工点。
6. **Dollar-aware.** 风险表达单位优先用美元，其次才是天数。
7. **Source-anchored.** 每条规则、每个日期都有 `source_url` + `verified_by` + `verified_at` + `source_excerpt`。
8. **Keyboard-first.** 所有高频操作必须有键盘快捷键。
9. **Ramp × Linear · Light Workbench.** 视觉方向为"CPA 专业工作台"——浅色为主 / Dify gray `#101828` 主文字 + Dify UI blue `#155aef` accent / Inter + Geist Mono tabular-nums / 1px 发丝线分层 / zero shadow / 风险只用灰-黄-橙-红四档（不用绿表示 OK）。**UI 单一事实源 = `[docs/Design/DueDateHQ-DESIGN.md](../Design/DueDateHQ-DESIGN.md)`**；所有组件与 token 以该文档为准，本 PRD 的 UI 描述仅表达功能语义。

---

## 2. 目标用户与核心场景

### 2.1 主 ICP

> 美国独立 CPA / EA / tax preparer，solo 或 1–10 人事务所 owner，服务 20–300 位 business clients，至少 2 位客户在 CA / NY / TX / FL / WA，当前用 Excel + Outlook + 税务软件报表拼接管理 deadline，对漏报有真实焦虑。

### 2.2 角色

| 角色                | 占比 | 核心任务                 | v2.0 支持程度                             |
| ------------------- | ---- | ------------------------ | ----------------------------------------- |
| Owner / Signing CPA | 70%  | 周度分诊、签字、风险决策 | **完整**（唯一 P0 主路径）                |
| Manager             | 15%  | 分派、平衡负载           | Assignee 字段 + Manager Saved Views（P1） |
| Senior Preparer     | 10%  | 准备 return、追资料      | Readiness 状态机 + 客户文档跟进（P1）     |
| Client Coordinator  | 5%   | 催资料、发提醒           | 提醒模板 + PDF 客户简报（P1）             |

### 2.3 三大核心场景（对应三个 P0/P1 故事）

#### 场景 A · The Monday 5-Minute Triage（Story S1 · P0）

> 周一 8:00，Sarah（Solo CPA，85 客户）打开 laptop，只 15 分钟喝咖啡。她需要 5 分钟知道：本周谁最急、为什么急、敞口多少钱、下一步做什么。

→ 命中：Dashboard 三段时间分组 + Deadline Radar + Smart Priority row drivers；Weekly Brief 作为后台物化 / 邮件摘要，不在 Dashboard 首屏渲染独立卡片

#### 场景 B · The 30-Minute Migration（Story S2 · P0）

> David 刚从 TaxDome 转来，手里有 30 客户的导出 CSV。他不想花一天录入，希望 30 分钟内完成并看到全年日历。

→ 命中：Migration Copilot 四步流程（Intake → AI Mapping → Normalize → Import + Live Genesis）

#### 场景 C · The 24-Hour Disaster Response（Story S3 · P1）

> 周三 IRS 公告加州 LA 县因风暴延期 Form 1040 至 Oct 15。Jennifer 的 85 客户里 12 位在加州。她需要 5 分钟内知道：哪 12 位被影响、哪些 deadline 要改、官方来源在哪、能否一键批量更新。

→ 命中：Regulatory Pulse + Dashboard Banner + Email Digest + Batch Apply + Audit Log

### 2.4 辅助场景（P1+）

- **Extension Decision**：客户 Acme LLC 的 K-1 还没到，距离 1120-S 只剩 5 天。Extension Decision Panel + What-If Simulator。
- **Client-Ready Explanations**：给客户发邮件解释截止日，AI Draft Email + Copy-as-Citation。
- **Ad-hoc Ask**：自然语言问"哪些客户要交 CA PTE？"→ AI Q&A Assistant。

---

## 3. 用户故事、验收标准与 Traceability Matrix

### 3.1 故事 S1（P0 · CORE）— 申报季每周分诊

> **作为** 服务 80 客户的独立 CPA，**我希望** 周一早 8 点打开电脑 30 秒内看到本周需要行动的截止日期，**这样** 我立即决定本周优先级，不需要在 Excel / Outlook / 手写笔记之间切换。

| AC #   | 验收标准                                               | 覆盖功能（v2.0 章节）                                                                                | 验收测试 ID |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------- |
| S1-AC1 | 登录后默认看板按 "本周到期 / 本月预警 / 长期计划" 分组 | Dashboard Triage Tabs（§5.1.2）                                                                      | T-S1-01     |
| S1-AC2 | 本周到期项必须显示具体倒计时（精确到天）               | TriageCard 倒计时徽章 + Obligations Days 列（§5.1.3 / §5.2.2）                                       | T-S1-02     |
| S1-AC3 | 支持按客户 / 州 / 表单类型快速筛选，< 1 秒响应         | Obligations Filters（§5.2.3）+ 索引（§8.2）                                                          | T-S1-03     |
| S1-AC4 | 每个截止日支持一键标记"已完成 / 已延期 / 进行中"       | 行内状态下拉（§5.2.4）                                                                               | T-S1-04     |
| S1-AC5 | 整个分诊流程可在 5 分钟内完成                          | Smart Priority 行内解释 + Penalty 顶栏合力；Weekly Brief 仅作为异步 / 邮件摘要（§6.4 / §6.1 / §6.5） | T-S1-05     |

### 3.2 故事 S2（P0 · CORE）— 30 分钟导入 30 客户

> **作为** 刚从 TaxDome 切换过来的 CPA，**我希望** 30 分钟内完成 30 客户的导入并自动生成全年截止日历，**这样** 我可以立即开始使用，而不是花一整周手工录入。

| AC #   | 验收标准                                               | 覆盖功能（v2.0 章节）                                                              | 验收测试 ID |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------- |
| S2-AC1 | 支持 TaxDome / Drake / Karbon / QuickBooks 导出 CSV    | Preset Profiles（§6A.4）共 5 个 + File In Time 彩蛋                                | T-S2-01     |
| S2-AC2 | 系统自动识别字段映射（客户名、**EIN**、州、实体类型）  | AI Field Mapper（§6A.2）+ 客户模型新增 `ein` 字段（§8.1）                          | T-S2-02     |
| S2-AC3 | 对模糊或缺失字段，提供智能建议而非阻塞性错误           | AI Normalizer + 置信度 < 0.8 的"Needs review"非阻塞标记（§6A.3）                   | T-S2-03     |
| S2-AC4 | 导入后立即生成每个客户的全年截止日历，**无需额外配置** | Default Tax Types Inference Matrix（§6A.5，`entity × state` → tax_types 查表兜底） | T-S2-04     |
| S2-AC5 | P95 完成时间 ≤ 30 分钟（30 客户基准）                  | 指标定义（§12.2）+ Dry-Run Preview + Live Genesis 动画确认                         | T-S2-05     |

### 3.3 故事 S3（P1 · DIFFERENTIATOR）— 24 小时州税局公告响应

> **作为** 服务多州客户的 CPA，**我希望** 某州税局发布延期公告后 24 小时内自动收到受影响客户清单，**这样** 我第一时间通知客户、调整工作计划，不必每天浏览 50 个州税局网站。

| AC #   | 验收标准                                                    | 覆盖功能（v2.0 章节）                                                | 验收测试 ID |
| ------ | ----------------------------------------------------------- | -------------------------------------------------------------------- | ----------- |
| S3-AC1 | 系统在 24 小时内捕获各州税局官方公告                        | Pulse Ingest Worker（§6.3.1）+ 失败降级（§6.3.5）                    | T-S3-01     |
| S3-AC2 | 自动判定哪些客户受影响（基于**州 + 县 + 实体类型 + 税种**） | Pulse Match Engine（§6.3.3，四维 SQL 匹配）                          | T-S3-02     |
| S3-AC3 | 主看板顶部 Banner 推送 **+ 邮件通知**（双渠道，同一事务）   | Dashboard Pulse Banner（§5.1.1）+ Email Digest（§6.3.4）             | T-S3-03     |
| S3-AC4 | 提供"一键查看受影响客户"+"**批量调整截止日**"操作           | Pulse Detail 抽屉 + Batch Apply 原子事务（§6.3.3）                   | T-S3-04     |
| S3-AC5 | 每条公告附"官方来源链接"用于人工核验                        | `official_source_url` + `source_excerpt` 显式展示（§6.3.1 / §6.3.2） | T-S3-05     |

### 3.4 VPC ✦ AI 杠杆点映射（画布 9 项）

| #   | ✦ 条目                                 | 对应 AI 能力模块         | v2.0 章节       |
| --- | -------------------------------------- | ------------------------ | --------------- |
| 1   | 公告自动监控                           | Pulse Ingest Worker      | §6.3.1          |
| 2   | 公告语义解读                           | Pulse AI Extraction      | §6.3.2          |
| 3   | 影响范围识别                           | Pulse Extraction + Match | §6.3.2 / §6.3.3 |
| 4   | 受影响客户匹配                         | Pulse Match Engine       | §6.3.3          |
| 5   | CSV 字段智能映射                       | Migration AI Mapper      | §6A.2           |
| 6   | 实体类型自动识别                       | Migration AI Normalizer  | §6A.3           |
| 7   | AI 智能优先级排序                      | Smart Priority Engine    | §6.4            |
| 8   | AI 自然语言问答                        | Ask DueDateHQ            | §6.6            |
| 9   | 字段智能匹配（Story S2 标签，并入 #5） | Migration AI Mapper      | §6A.2           |

### 3.5 VPC 严重度覆盖总表

**Pains（严重度 高 / 中）全覆盖：**

| 条目                                  | 严重度 | ✦   | v2.0 覆盖章节                                           |
| ------------------------------------- | ------ | --- | ------------------------------------------------------- |
| Excel 无法应对 50 州 × 多税种         | 高     | —   | §6.1 Rule Engine + §6A.5 Default Matrix                 |
| 各州税局公告分散，需人工每日浏览      | 高     | ✦   | §6.3.1 Pulse Ingest                                     |
| 政府公告语言晦涩                      | 高     | ✦   | §6.3.2 AI Extraction                                    |
| 客户跨州后需手工查 PTE / Franchise    | 高     | —   | §6.1 Rule Engine 50 州骨架 + §7.5 Penalty               |
| 错过截止日罚款责任由 CPA 承担，无保障 | 高     | —   | §7.5 Deadline Radar + §5.5 Evidence Mode + §13 合规 SLA |
| 现有专业工具定价不友好                | 中     | —   | §11.1 Pricing                                           |
| 从竞品迁移需手工录入                  | 中     | ✦   | §6A Migration Copilot 全链路                            |
| 申报季加班仍担心遗漏                  | 中     | —   | Dashboard + Pulse + 异步 / 邮件 Weekly Brief 合力       |

**Gains（严重度 高 / 中）全覆盖：**

| 条目                                | 严重度 | ✦   | v2.0 覆盖章节                                                                   |
| ----------------------------------- | ------ | --- | ------------------------------------------------------------------------------- |
| 每周一 5 分钟完成分诊               | 高     | —   | §5.1 Dashboard + §6.4 Smart Priority                                            |
| "没漏掉什么"的心理踏实感            | 高     | —   | §5.1 Dashboard triage + §5.5 Evidence + §7.5 Penalty；Weekly Brief 作为异步摘要 |
| 州税法变更第一时间获知 + 受影响客户 | 高     | ✦   | §6.3 Pulse + §5.1 Banner + §6.3.4 Email                                         |
| 工具上手 ≤ 30 分钟                  | 中     | —   | §6A Migration + §12.2 KPI                                                       |
| 对客户呈现专业形象                  | 中     | —   | §7.6 Client PDF Report + §7.7 Ask                                               |
| 能承接更多多州客户不增风险          | 低     | —   | §6.1 Rule Engine 50 州骨架 + §6.3 Pulse 持续扩源                                |

**Pain Relievers / Gain Creators**（严重度 高）全在 §6–§7 有对应实现章节，不再重复列。

---

## 3.6 Team / Multi-seat 扩展模型

> 本节是 v2.0 新增章节，专门回答"Firm Plan / Pro Plan 下，一家事务所多个 CPA 员工怎么协作"。
> 这是对 Story S1–S3 的**横向扩展**（不改变核心 AC），但必须前置，否则数据模型和权限设计会在 P1 到来时被迫重构。

### 3.6.1.0 命名规范（Naming）

> 本节为本 PRD 行文与产品 UI 之间的术语映射。**正文一律使用 `Firm` 与代码标识对齐**，但用户可见 UI 按"语境"分两层。详见 ADR
> [`docs/adr/0010-firm-profile-vs-organization.md`](../adr/0010-firm-profile-vs-organization.md) 与
> dev-file
> [`00-Overview.md §9 术语简表`](../dev-file/00-Overview.md) /
> [`03-Data-Model.md §2.1 firm_profile`](../dev-file/03-Data-Model.md)。

| 层                    | 标识                                                                  | 备注                                                                                      |
| --------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Better Auth DB / SDK  | `organization` / `member` / `invitation` / `activeOrganizationId`     | 不动；身份容器                                                                            |
| 业务租户表            | `firm_profile`                                                        | PK = `organization.id`；承载 `plan` / `seatLimit` / `timezone` / `ownerUserId` / `status` |
| 业务表 tenant 列      | `firm_id`                                                             | 沿用既有约定，FK → `firm_profile.id`                                                      |
| 代码标识              | `firmId` / `tenant` / `scoped(db, firmId)`                            | 不动                                                                                      |
| Hono context          | `c.var.tenantContext`（plan/seatLimit/...）/ `c.var.firmId`（保留）   | 见 dev-file/02 §middleware                                                                |
| PRD / dev-file 行文   | `Firm`                                                                | 与代码对齐；不替换历史 134 处                                                             |
| 用户可见 EN（默认）   | `Practice`                                                            | onboarding 标题/字段、错误信息、空态、营销文案                                            |
| 用户可见 EN（管理类） | `Firm`                                                                | 权限、计费、SSO policy 等管理语境                                                         |
| 用户可见 ZH（统一）   | 事务所                                                                | 不区分 Practice/Firm                                                                      |
| 不动的专名            | `Google Workspace` / `pnpm "workspace:*"` / 类 `Slack workspace` 类比 | 保持原样                                                                                  |

### 3.6.1 定位与前置约束

> **2026-05-04 pricing entitlement update**：本节的 P0/P1 切分保留历史 PRD 语境；
> 当前 accepted 产品口径以 `docs/product-design/billing/01-practice-entitlement-pricing.md`
> 为准。`solo` / `pro` / `team` 是 self-serve paid tiers，分别为 $39 / $79 / $149 per month；
> `firm` 是持久化枚举，用户可见名称为 Enterprise，sales-assisted from $399/mo，可按合同包含
> multiple active practices/offices 与 10+ seats。Firm switcher 的 multi-firm foundation 已落地；
> active practice count 由 plan entitlement gate 控制。

| 层级                                          | 当前 self-serve（Solo / Pro / Team）               | Enterprise（内部 `firm`）             |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------- |
| **数据架构**（Firm = tenant，User 归属 Firm） | **已就位**                                         | 无需改动                              |
| **成员管理**（邀请 / 席位 / 离职）            | Pro 3 seats；Team 10 seats                         | **合同席位 / 10+ seats**              |
| **RBAC 执行**（四角色权限矩阵）               | **已通过 procedure permission + scoped repo 强制** | **同一权限模型 + 合同特性**           |
| **视图切换**（My work / Firm-wide）           | 当前主队列以 firm-wide / assignee 筛选为主         | **可继续扩展共享视图策略**            |
| **工作负载页**（Workload View）               | Pro / Team 付费 surface；Solo 可见升级提示         | **启用**                              |
| **Firm-wide Audit Log 页**                    | **已作为 `/audit` route 落地**                     | **启用 / 可扩展导出合同能力**         |
| **并发编辑与冲突处理**                        | 单用户无冲突                                       | **last-write-wins + 提示 + 乐观锁**   |
| **多事务所用户**（一人多 Firm）               | 支持 membership / switch；创建受 plan gate 限制    | **支持（UserFirmMembership 多对多）** |

**核心原则**：数据模型在 **P0 就必须支持 Team**（`firm_id` 作为所有业务数据的 tenant key，User 通过 `firm_id` 归属 Firm），但**权限校验和 Team UI 是 P1**。这是可向前兼容的最薄切片——MVP 不会因为"将来要支持 Team"而增加 P0 复杂度，但不会因为 MVP 走错数据模型而在 P1 重构。

### 3.6.2 三层模型：Firm / User / Membership

```
Firm (tenant)
  id, name, timezone, plan (solo|pro|team|firm),
  seat_limit,                    -- Solo 1 / Pro 3 / Team 10 / Enterprise contract-defined
  owner_user_id,                 -- Firm 的主负责人（转让时修改）
  created_at, deleted_at (soft)

User (identity · 邮箱唯一)
  id, email, display_name,
  mfa_enabled, last_login_at,
  created_at

UserFirmMembership (多对多 · P1 启用)
  id, user_id, firm_id,
  role (owner|manager|preparer|coordinator),
  status (active|invited|suspended|left),
  invited_by_user_id, invited_at, accepted_at, suspended_at,
  last_active_at

TeamInvitation
  id, firm_id, invited_email, role,
  invite_token, expires_at,
  invited_by_user_id, accepted_at, revoked_at
```

Active firm count 是 account / subscription / contract 层的 product entitlement，不是
单个 `firm_profile` 行内字段：Solo / Pro / Team = 1 active firm，Enterprise (`firm`) = contract-defined。

**⚠ Deprecated as of 2026-04-24** — `User.firm_id` shortcut 字段从未在代码中启用：当前实现走 Better Auth `member` 多对多 + `firmId == session.activeOrganizationId == firm_profile.id`（见 ADR 0010）。本段保留为历史口径，不要在新代码里依赖。

**P0 简化：** 未启用 UserFirmMembership 时，`User.firm_id` 作为 shortcut 列直接查询（向前兼容）。P1 启用后，`User.firm_id` 降级为"默认登录 Firm"字段，真正的权限查询走 Membership 表。

**为什么用 Membership 多对多：** 一位 CPA 在多家小所兼职是真实场景（尤其是灵活工作制 + 跨州税务专家）。如果把 `User.firm_id` 定死一对一，P1 做 "在 A / B 事务所之间切换" 必须重做 Auth。Membership 表让登录后多一步 "Choose firm"（类似 Slack workspace 切换）。

### 3.6.3 RBAC 权限矩阵（P1 · 四角色）

| 操作                            | Owner | Manager | Preparer                               | Coordinator                                                                                |
| ------------------------------- | ----- | ------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| **账户与席位**                  |       |         |                                        |                                                                                            |
| 邀请 / 撤销成员                 | ✓     | —       | —                                      | —                                                                                          |
| 修改他人 role                   | ✓     | —       | —                                      | —                                                                                          |
| 转让 Firm Owner                 | ✓     | —       | —                                      | —                                                                                          |
| Billing                         | ✓     | —       | —                                      | —                                                                                          |
| 删除 Firm                       | ✓     | —       | —                                      | —                                                                                          |
| **客户与 obligations**          |       |         |                                        |                                                                                            |
| 查看全部客户                    | ✓     | ✓       | ✓                                      | ✓                                                                                          |
| 创建 / 编辑客户档案             | ✓     | ✓       | ✓                                      | —                                                                                          |
| 删除客户（软删）                | ✓     | ✓       | —                                      | —                                                                                          |
| 改 status / readiness（任意）   | ✓     | ✓       | ✓ 仅 `assignee=me` 或 Manager 分派给我 | —                                                                                          |
| 改 extension decision           | ✓     | ✓       | ✓ 仅 assignee                          | —                                                                                          |
| 覆盖 `estimated_tax_liability`  | ✓     | ✓       | ✓ 仅 assignee                          | —                                                                                          |
| Assign / Reassign               | ✓     | ✓       | —                                      | —                                                                                          |
| **Migration**                   |       |         |                                        |                                                                                            |
| Import                          | ✓     | ✓       | —                                      | —                                                                                          |
| **Revert (24h full batch)**     | ✓     | ✓       | —                                      | —                                                                                          |
| Revert 单客户（7d）             | ✓     | ✓       | —                                      | —                                                                                          |
| **Regulatory Pulse**            |       |         |                                        |                                                                                            |
| 查看 Pulse Feed                 | ✓     | ✓       | ✓                                      | ✓                                                                                          |
| Batch Apply                     | ✓     | ✓       | —                                      | —                                                                                          |
| Revert Pulse Apply（24h）       | ✓     | ✓       | —                                      | —                                                                                          |
| Dismiss / Snooze                | ✓     | ✓       | —                                      | —                                                                                          |
| **规则与证据**                  |       |         |                                        |                                                                                            |
| 查看 Rules                      | ✓     | ✓       | ✓                                      | ✓                                                                                          |
| Report Issue on Rule            | ✓     | ✓       | ✓                                      | ✓                                                                                          |
| 看 Penalty $ 敞口               | ✓     | ✓       | ✓                                      | **—**（$ 是 commercial-sensitive，Coordinator 默认隐藏，可 Owner 在 practice policy 开启） |
| 改 Priority Weights（Pro only） | ✓     | —       | —                                      | —                                                                                          |
| **报告与审计**                  |       |         |                                        |                                                                                            |
| Export 客户 PDF                 | ✓     | ✓       | ✓                                      | ✓                                                                                          |
| 查看 Firm-wide Audit Log        | ✓     | ✓       | —                                      | —                                                                                          |
| 查看他人 Audit Log              | ✓     | ✓       | 仅自己                                 | 仅自己                                                                                     |
| **AI Ask**                      |       |         |                                        |                                                                                            |
| Ask DueDateHQ                   | ✓     | ✓       | ✓                                      | ✓（可选开启）                                                                              |
| Ask 含 $ 敞口字段               | ✓     | ✓       | ✓                                      | —                                                                                          |

**权限边界原则：** Revert 是操作纠错能力，因此 Owner / Manager 都可执行；Owner-only 保留给所有权、账户、billing、role 和全 firm export 等不可由日常运营角色承担的能力。

**执行机制：**

1. **Scoped repository 强制 `WHERE firm_id = :current_firm`**（现有）
2. **Procedure-level RBAC** 在每个 oRPC procedure middleware 入口用 `requirePermission(...)` 校验
3. **Row-level ownership** 对 `assignee` 的"自己任务"限制用查询条件 `(assignee_id = :me OR role IN ['owner','manager'])`
4. **Client-side UI** 根据 role 隐藏不可操作按钮（双层保险，但后端强制是底线）

### 3.6.4 成员生命周期

#### 邀请流程

```
Owner clicks [Invite member]
  ↓
Enter email + role + optional welcome message
  ↓
POST /api/team/invitations
  → Validates seat_limit; creates TeamInvitation with signed token
  → Sends invite email via Resend
  ↓
Invitee clicks link (valid 7 days)
  → If user exists: accept + create Membership
  → If new: complete signup with Google OAuth → create User + Membership
  ↓
Membership.status = 'active', user lands on Firm dashboard
  ↓
Audit event: team.member.joined
```

- 席位满时 `[Invite]` 按钮灰化 + 提示 `Upgrade plan to add more seats`
- Invite 邮件 24h 未点击 → 自动发提醒 1 次
- Owner 可在 Members 页撤销未接受的邀请

#### 成员离职

- Owner / Manager 在 Members 页将成员状态切到 `suspended` → 立即失去所有权限，所有 session 失效
- **Assignee 交接**：suspend 前强制弹出 `Reassign N open obligations`（这人名下尚 open 的 obligations 必须转给其他成员，否则不能 suspend）
- 数据不删除：`Membership.status = 'suspended'`，审计日志保留其历史 action（合规需要）
- 席位释放：suspended 立即释放席位（新人可邀请）

#### Owner 转让（小所继承 / 退休场景）

- Members → `Transfer ownership` → 选择新 Owner（必须已是 active member 且 role ≥ manager）
- 二次确认（输入 firm name 或 MFA 再验）
- 新旧 Owner 都收邮件通知；原 Owner 降级为 Manager（不退出）
- 写 audit: `firm.owner.transferred`
- 不可撤销（只能新 Owner 再转回）

#### 多事务所切换

- 登录成功后如 user has ≥ 2 active memberships → 进入最近 active practice；sidebar 顶部 Practice
  switcher 可切换（类似 Slack / Notion workspace picker），全局快捷键 `Cmd+Shift+O` 保留。
- URL 不含 `firm_slug`；当前 firm 来自 `session.activeOrganizationId`，刷新保留在 session。
- `Add practice` 是 plan-gated action：Solo / Pro / Team 超过 1 active practice 时进入 Billing / Contact sales gate，
  Enterprise (`firm`) plan 依据合同允许多个 active firms / offices。

### 3.6.5 视图层：My work / Firm-wide

Dashboard、Obligations、Rules > Pulse Changes 三处首屏顶部加 **View Scope Toggle**：

```
[ ●  Firm-wide  ]  [   My work   ]      (Owner / Manager 默认 Firm-wide)
[    Firm-wide  ]  [ ●  My work  ]      (Preparer 默认 My work)
```

| 视图      | 过滤条件            | 受众默认                               |
| --------- | ------------------- | -------------------------------------- |
| Firm-wide | 无 assignee 过滤    | Owner / Manager                        |
| My work   | `assignee_id = :me` | Preparer（Coordinator 只读 Firm-wide） |

- URL 持久化：`?scope=firm` / `?scope=me`
- 切换对 **Deadline Radar 顶栏 $ 聚合也生效**（My work 时只聚合自己的）
- Weekly Brief 在 My work 视图下也切换为 "Your top 3"

### 3.6.6 并发编辑与冲突处理

| 场景                                    | 策略                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 两人同时改同一 obligation 的 status     | **Last-write-wins + 通知**：晚到的写成功但推送 toast `X just changed this from 'in_progress' to 'waiting_on_client' 3s ago. [Undo my change]`          |
| 两人同时 Pulse Batch Apply 同一条 Pulse | **Advisory lock**：事务开始前 `SELECT pulse FOR UPDATE SKIP LOCKED`；第二人看到 `This pulse is being applied by Y right now. [Wait] [Refresh]`         |
| Migration 同一 firm 并行进行            | **禁止**：同一 firm 同时最多 1 个 draft batch；第二次 `Import` 提示 `Y is currently importing (Step 2 of 4). [View] [Cancel theirs — Owner / Manager]` |
| 两人同时 Revert 同一 batch              | DB unique constraint on `(batch_id, status='reverted')`；第二人看到 `Already reverted by X`                                                            |
| Saved View 同名冲突                     | 允许同名（Personal 与 Shared 命名空间分离）；Shared 强制 Firm 内唯一                                                                                   |

### 3.6.7 Manager 工作负载视图（Workload View · P1）

**入口**：侧栏 `Team Workload`（仅 Owner / Manager 可见） · Cmd-K `workload`

```
┌─ Team Workload · This Week ──────────────────────────────────┐
│  [Firm-wide]                                  [Export CSV]   │
├──────────────────────────────────────────────────────────────┤
│  Member        Open   Overdue   $ At Risk    Load Bar        │
│  ────────────────────────────────────────────────────────    │
│  Sarah (Owner) 42      2         $18,400    ████████░░ 80%  │
│  Jim (Prep)    18      0         $6,200     █████░░░░░ 50%  │
│  Kate (Prep)    8      0         $2,100     ██░░░░░░░░ 20%  │
│  Unassigned    15      3         $9,800     ⚠ needs triage  │
├─ Heatmap (next 30 days) ─────────────────────────────────────┤
│      Mon  Tue  Wed  Thu  Fri     (darker = more due)         │
│ W-1  ██   █    ███  ██   █                                   │
│ W-2  █    ██   ██   █    —                                   │
│ W-3  ███  █    ████ ██   ██                                  │
│ W-4  █    —    ██   █    —                                   │
├──────────────────────────────────────────────────────────────┤
│  [+ Bulk reassign]                                           │
│     Select N obligations by rule/state/status → pick new     │
│     assignee → Apply (transaction + audit event)             │
└──────────────────────────────────────────────────────────────┘
```

关键设计：

- **Load Bar %** 基于 open count 相对全 firm top-quartile 线性归一
- **Unassigned 行永远置底但不可折叠**（防漏）
- 点击任一成员行 → 右侧 drawer 展示其 open obligations list（可就地 reassign）
- Heatmap 点击某格 → Obligations 自动按 `due_date = :date AND assignee = :member` 筛选

### 3.6.8 数据边界边案

| 场景                              | 处理                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Plan 降级（Pro → Solo）导致超席   | 所有超额成员自动 `suspended`，但 Membership 不删；Owner 可在 30 天内升级找回；30 天后软删除，但审计日志永久保留（合规）               |
| Plan 升级                         | 立即生效；suspended 的老成员**不自动激活**（需 Owner 手动 re-activate）                                                               |
| Owner 唯一且账号锁死              | 通过 support 通道验证 + MFA recovery token → 新 Owner 转移；走 legal hold 流程                                                        |
| Firm 申请删除                     | 软删 30 天 grace period；期内 Owner 可 `[Restore firm]`；30 天后物理删除所有 PII，仅保留 audit log hash（合规诉讼证据）+ invoice 记录 |
| 成员 GDPR 删除请求                | 删除 User identity + 匿名化其 audit*event 的 `actor_id = 'deleted_user*#'`，保留操作记录                                              |
| 未分派 obligation 的默认 assignee | Firm 级配置：`default_assignee = owner                                                                                                |
| 临期 obligation 未分派            | Overdue 告警升级给 Owner 与 Manager（即便 assignee 为空）                                                                             |

### 3.6.9 Team 场景验收标准（T-TM-\*）

> 这些 AC 不属于画布原有的 S1–S3，但是 P1 发布 Team 版的 Go / No-Go 门槛。

| Test ID | 描述                                                  | 预期                                                                        |
| ------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| T-TM-01 | Owner 邀请 1 位 Preparer，Preparer 登录后看到全部客户 | 客户可见；`[Delete client]` 按钮不存在                                      |
| T-TM-02 | Preparer 尝试点击"删除客户" API                       | 403 Forbidden；审计记录 `auth.denied`                                       |
| T-TM-03 | Manager 将 obligation 从 Sarah reassign 给 Jim        | Sarah "My work" 失去该条；Jim "My work" 出现；audit `obligation.reassigned` |
| T-TM-04 | Owner 查看 Firm-wide Audit Log                        | 看到最近 24h 所有成员所有 write 操作                                        |
| T-TM-05 | 两人同时改同一 obligation status                      | Last-write-wins + toast 提示前序变更                                        |
| T-TM-06 | 两人同时 Apply 同一 Pulse                             | 第 2 人被锁 + 友好提示                                                      |
| T-TM-07 | 当前 plan seat limit 已满，Owner 试邀下一位成员       | 按钮灰化 + "Upgrade plan" 链接                                              |
| T-TM-08 | Owner suspend 带 open obligations 的 Preparer         | 强制先 reassign；否则 suspend 阻塞                                          |
| T-TM-09 | Owner 转让 ownership 给 Manager                       | 新 Owner 权限立即生效，原 Owner 降 Manager，邮件通知双方                    |
| T-TM-10 | Coordinator 试看 `$ at risk`                          | 胶囊显示 `—`；Ask 结果中该字段留空                                          |
| T-TM-11 | Preparer 已登录两个 Firm，切换 Firm                   | URL / 数据 / assignee 作用域立即切换                                        |
| T-TM-12 | Plan 从 Pro / Team 降到 Solo 后出现超额成员           | 超额成员自动 suspend；Owner 收邮件警告；30 天内可恢复                       |

---

## 4. 功能范围

### 4.1 P0 — 首发必须（Story S1 / S2 + Glass-Box 纪律）

| #     | 模块                                             | 关键能力                                                                                                                                                                                                        | AC 绑定        |
| ----- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| P0-1  | Auth & Tenant                                    | Google OAuth 登录 + 单租户 + 租户强隔离                                                                                                                                                                         | —              |
| P0-2  | **Migration Copilot**                            | Paste-anywhere + CSV/Excel/Sheets + 5 个 Preset Profiles                                                                                                                                                        | S2-AC1         |
| P0-3  | **AI Field Mapper**                              | AI SDK 读表头 + 前 5 行 → 字段映射 + 置信度 + 备选；显式识别 `name / ein / state / county / entity_type / tax_types / email / assignee / notes`                                                                 | S2-AC2         |
| P0-4  | **AI Normalizer + Smart Suggestions**            | entity/state/tax_type 归一；模糊字段非阻塞 "Needs review"                                                                                                                                                       | S2-AC3         |
| P0-5  | **Default Tax Types Inference**                  | `FED + 50 states + DC` runtime；显式矩阵之外回退到 state review-only tax types + `needs_review` 徽章                                                                                                            | S2-AC4         |
| P0-6  | **Dry-Run + Import + Live Genesis + 24h Revert** | 事务化导入 + 动画 + 原子回滚                                                                                                                                                                                    | S2-AC5         |
| P0-7  | Client CRUD + 手动添加                           | 字段 `name / ein / state / county / entity_type / tax_types / importance / estimated_annual_revenue / assignee / notes`                                                                                         | —              |
| P0-8  | **Rule Engine v1（全辖区 source-backed）**       | `FED + 50 states + DC` rules/source registry；source-backed candidate review-only，practice-reviewed active rule 才能生成 reminder-ready obligation                                                             | —              |
| P0-9  | Obligation Instances                             | `state × entity_type × tax_types` 生成全年 instances                                                                                                                                                            | S2-AC4         |
| P0-10 | **Dashboard（Story S1 主屏）**                   | 顶栏 Deadline Radar + Pulse Banner + **三段时间 Tabs（This Week / This Month / Long-term）**                                                                                                                    | S1-AC1, S3-AC3 |
| P0-11 | 倒计时徽章 + Days 列                             | 每个 obligation 显示精确到天的倒计时                                                                                                                                                                            | S1-AC2         |
| P0-12 | **Obligations（表格视图）**                      | 多列可见 + Saved Views + 批量操作 + 密度切换                                                                                                                                                                    | —              |
| P0-13 | **筛选器（< 1s 响应）**                          | Client / State / **County** / **Form/Tax Type** / Status / Readiness / Assignee / $ At Risk / Days                                                                                                              | S1-AC3         |
| P0-14 | **行内一键标状态**                               | 每行 `[status ▾]` 下拉 + 键盘 F/X/I                                                                                                                                                                             | S1-AC4         |
| P0-15 | Obligation Detail 抽屉                           | readiness / extension / risk / evidence / audit 五标签                                                                                                                                                          | —              |
| P0-16 | Status & Readiness 状态机                        | Status: Not started / In progress / Waiting on client / Needs review / Filed / Paid / Extended / Not applicable；Readiness: Ready / Waiting / Needs review                                                      | —              |
| P0-17 | **Glass-Box AI Layer**                           | Weekly Brief / Client Risk Summary / Deadline Tip / Smart Priority，全部 citation + source chip                                                                                                                 | S1-AC5         |
| P0-18 | **Deadline Radar™**                              | 截止日风险实时计算 + 顶栏聚合 + 每条 obligation 徽章                                                                                                                                                            | S1-AC5         |
| P0-19 | Evidence Mode                                    | 任意 AI 句子 / 数字 / risk score 可点开 provenance 抽屉                                                                                                                                                         | S3-AC5         |
| P0-20 | Audit Log                                        | 状态变更 / Pulse Apply / 批量操作 / Migration / Revert 全留痕                                                                                                                                                   | —              |
| P0-21 | Email Reminders                                  | 30 / 7 / 1 天阶梯；模板带上下文 + source link                                                                                                                                                                   | —              |
| P0-22 | In-app Notifications                             | Top bar 铃铛 + 未读计数 + Preferences                                                                                                                                                                           | —              |
| P0-24 | Security Baseline                                | HTTPS / TLS / AES-256 at rest / tenant isolation / audit log / `ai_output` trace；7 天 Demo 可交 WISP draft，真实试点 / 4 周 MVP 交 WISP v1.0；MFA 作为用户可选账户安全项，完整四角色 Team RBAC 属 P1（§3.6.3） | —              |

### 4.2 P1 — 差异化亮点（Story S3 + VPC Medium）

| #         | 模块                                          | 关键能力                                                                                                                                     | AC 绑定             |
| --------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| P1-1      | **Regulatory Pulse™ Ingest**                  | IRS + 全辖区 promoted official sources / API / RSS / 邮件信号；24h SLA                                                                       | S3-AC1              |
| P1-2      | **Pulse AI Extraction**                       | 结构化字段 + source excerpt + confidence                                                                                                     | S3-AC1, S3-AC5      |
| P1-3      | **Pulse Match Engine**                        | 四维匹配：state + county + entity_type + tax_type                                                                                            | S3-AC2              |
| P1-4      | **Dashboard Pulse Banner**                    | 顶部 sticky Banner + 折叠历史 + Last-checked 指标                                                                                            | S3-AC3              |
| P1-5      | **Pulse Email Digest**                        | Approved Pulse 触发时 **同一事务内** 推送邮件（含受影响客户清单 + 官方链接）                                                                 | S3-AC3              |
| P1-6      | **Pulse Detail Drawer**                       | AI summary + source excerpt + Affected Clients Table + 快筛                                                                                  | S3-AC4, S3-AC5      |
| P1-7      | **Batch Apply 原子事务**                      | 批量调整截止日 + Evidence 追加 + 24h Undo                                                                                                    | S3-AC4              |
| P1-8      | **AI Q&A Assistant (Ask DueDateHQ)**          | NL → DSL → SQL（只读白名单，tenant 强制）→ 表格 + 一句话 + citations                                                                         | VPC Medium ✦        |
| P1-9      | Extension Decision Panel                      | Extension / payment decision helper + What-If Simulator                                                                                      | VPC 场景 C          |
| P1-10     | **Client PDF Report**                         | 单客户 PDF 简报，内嵌 human-verified 规则 + Penalty + source                                                                                 | VPC Medium          |
| P1-11     | **ICS 单向订阅**                              | 每 firm 一条带 token 的 feed URL（Outlook / Google / Apple）                                                                                 | VPC Low（日历场景） |
| P1-12     | Q1 → Q2 Rollover                              | 季度申报完成后自动生成下季 instances                                                                                                         | —                   |
| P1-13     | Smart sort toggle                             | `AI Smart / Due Date / $ At Risk / Status` 排序切换                                                                                          | S1-AC5 扩展         |
| P1-14     | Command Palette (Cmd-K)                       | 搜索 + 跳转 + Ask 三合一                                                                                                                     | UX 铁律             |
| P1-15     | Keyboard shortcuts                            | J/K/E/X/F/A/? 全覆盖 + `?` 快捷键帮助                                                                                                        | —                   |
| P1-16     | Saved Views                                   | 持久化筛选组合 + 分享                                                                                                                        | S1-AC3 扩展         |
| P1-17     | Public SEO Pages                              | `/state/california` / `/pulse` 公开页                                                                                                        | GTM                 |
| P1-18     | **Team Seats & Invitations**                  | Owner 邀请 / 撤销 / role 修改；席位受 plan 限制（§3.6.4）                                                                                    | Team                |
| P1-19     | **RBAC 四角色权限矩阵强制**                   | oRPC procedure middleware + scoped repo 双层（§3.6.3）；前端仅做可见性收敛，不作为安全边界                                                   | Team                |
| P1-20     | **View Scope Toggle**                         | Dashboard / Obligations / Rules > Pulse Changes 三处 My work / Firm-wide 切换 + URL 持久化（§3.6.5）                                         | Team                |
| P1-21     | **Manager Workload View**                     | 成员负载表 + 30 天 heatmap + Bulk reassign（§3.6.7）                                                                                         | Team                |
| P1-22     | **Firm-wide Audit Log 页**                    | 全 firm write 操作时间线 + 过滤 + 导出（§3.6 + §13）                                                                                         | Team                |
| P1-23     | **Concurrency & Conflict UX**                 | Last-write-wins + toast / Pulse advisory lock / Migration 串行（§3.6.6）                                                                     | Team                |
| P1-24     | **Multi-firm Membership 切换**                | User 加入多 Firm，登录后 Firm Picker + `Cmd+Shift+O` 切换（§3.6.4）                                                                          | Team                |
| P1-25     | **Owner Transfer / Plan 降级处理**            | ownership 转让流程 + 超席自动 suspend + 30d grace（§3.6.8）                                                                                  | Team                |
| **P1-26** | **★ Client Readiness Portal™**                | 客户免登录 signed portal link 页，自助勾资料是否就位 → CPA Dashboard 的 `readiness` 实时变 `ready`；AI Draft 解释邮件；集训差异化亮点（§6B） | **差异化亮点**      |
| **P1-27** | **★ Onboarding AI Agent**                     | 首次登录对话式 setup（替代传统向导），复用 Migration 管线，精准对标 产品受众 taste（§6A.11）                                                 | **差异化亮点**      |
| P1-28     | **Audit-Ready Evidence Package**              | 一键导出 ZIP（PDF + Audit CSV + SHA-256 签名），面向 IRS 调查 / 客户质询（§13.3 + §6.2 合流）                                                | 差异化              |
| **P1-29** | **★ Rules-as-Asset 资产层**                   | 规则独立实体（非 UI 附属）+ API-ready 导出（§6D.1）                                                                                          | **Rules 核心**      |
| **P1-30** | **★ Exception Rule Overlay**                  | 独立 exception 规则 + 可溯可撤 overlay；Obligation Detail 的 Deadline History tab（§6D.2）                                                   | Rules 核心          |
| **P1-31** | **★ Source Registry + `/watch` 页**           | 官方来源注册表 + 健康监控 + 公开承诺（§6D.3）                                                                                                | Rules 核心          |
| **P1-32** | **★ Rule Quality Badge**                      | 6 项 Checklist 可展开（filing/payment/extension/year/holiday/exception）（§6D.4）                                                            | Rules 核心          |
| **P1-33** | **★ Cross-source Verification**               | 双源交叉验证 chip + 冲突 needs_review 流程（§6D.5）                                                                                          | Rules 核心          |
| **P1-34** | **★ Rule Library `/rules` 公开页**            | 面向 CPA + SEO 的规则资产浏览页 + PDF/JSON 导出（§6D.7）                                                                                     | Rules 核心          |
| **P1-35** | **★ Verification Rhythm**                     | 税季前 / 每周 / 每日 practice review 节奏 + Dashboard Freshness Badge + 周一 Rhythm Report 邮件（§6D.6）                                     | Rules 核心          |
| **P1-36** | **★ PWA 壳（跨平台 Add-to-Dock + Web Push）** | manifest + service worker + Web Push；用户 1 键"Add to Dock / Home Screen" → Dock / Home 图标 + 独立窗口 + 离线缓存 + 跨设备推送（§7.8.1）   | Native 体验         |
| P1-37     | macOS Menu Bar Widget（Phase 2）              | 常驻 menu bar 显示 `$ at risk · overdue count`；点击唤起主 Dashboard；Tauri/Swift ≈ 400KB 壳（§7.8.2）                                       | Phase 2 差异化      |

### 4.3 P2 — 明确不做（v2.0 范围外）

完整 e-file 提交 / 税额计算 / 客户门户 / 文档存储 / eSignature / 短信 / Google/Outlook 日历双向同步 / 完整团队 RBAC / 多层级企业组织树 / 全辖区 active sign-off 自动化 / 原生移动 App / Drake / QuickBooks / TaxDome 深度集成 / 25+ 报告中心。

> Billing update：Stripe checkout / billing portal / subscription cache 已提前落地；仍不做复杂 invoice
> profile、Stripe Tax、coupon、self-serve multi-firm add-on 或 enterprise org hierarchy。

> **为什么日历只做单向订阅？** ICS 单向订阅 1 人天落地，在 Outlook / Google / Apple 里 0 配置显示所有 deadline（含 Pulse 改动）。双向同步会违反 §1.3 "Deadline-first, not calendar-first" 原则——外部日历改的日期会覆盖 Pulse 官方解读，Evidence / Audit 失真。战略上我们要用户周一 8 点回到 DueDateHQ 分诊，而不是停留在 Outlook。

---

## 5. 核心页面规格

### 5.1 Dashboard（首屏 · 对齐 Story S1 + S3）

#### 5.1.1 布局（上到下 6 层）

```text
┌──────────────────────────────────────────────────────────────────┐
│  Deadline Radar       $12,400 at risk this week   ▲ up $3,100    │  ← Layer 1 · 顶栏永远置顶
│  🔴 Critical (3)       🟠 High (7)       🟡 Upcoming (12)        │
├──────────────────────────────────────────────────────────────────┤
│  🚨 Pulse Banner (Story S3)                                      │  ← Layer 2 · Banner
│  IRS CA storm relief → 12 of your clients affected              │
│  [Review & Batch Adjust →]   [Snooze for 1h]   [Dismiss]        │
│  (NY DOR PTET reminder → 3 clients · 2 more alerts ▾)            │
│  Last checked: 18 min ago · Watching IRS + 50 states + DC        │
├──────────────────────────────────────────────────────────────────┤
│  Triage Tabs (Story S1 三段时间分组)                             │  ← Layer 3 · Tabs
│  [ This Week · 15 · $12,400 ]  [ This Month · 42 · $46k ]        │
│  [ Long-term · 86 · $210k ]                                      │
│  ─────────────────────────────────                                │
│  (selected tab inline list, AI Smart-Priority ordered — §6.4)    │
│  🔴 Acme LLC · CA Franchise · 3d · $4,200 · [Working ▾] [· · ·]  │
│  🟠 Bright Studio · 1120-S · 5d · $2,800 · [Waiting ▾] [· · ·]  │
│  🟠 Zen Holdings · Q1 Est · 7d · $1,650 · [Not started ▾]       │
│  [Open full Obligations →]                                          │
├──────────────────────────────────────────────────────────────────┤
│  Row-level Smart Priority drivers + Next check                    │  ← Layer 4 · Triage explanation
│  Weekly Brief is materialized in the background for email /       │
│  async summary surfaces; the Dashboard does not render a          │
│  standalone brief card in the current SPA.                        │
├──────────────────────────────────────────────────────────────────┤
│  Ask DueDateHQ (P1 · §6.6)                                        │  ← Layer 5 · Ask
│  > Which clients owe CA PTE this month?                          │
├──────────────────────────────────────────────────────────────────┤
│  Quick Actions: [+ Client] [Import CSV] [Verify Rules] [Cmd+K]   │  ← Layer 6
└──────────────────────────────────────────────────────────────────┘
```

#### 5.1.2 Triage Tabs（S1-AC1）

- 三段 Tabs 固定顺序：**This Week / This Month / Long-term**
- 每个 tab 显示 `count + $ at risk`
- 默认选中 `This Week`（Story S1 最高频场景）
- Tab 切换 URL 同步（可分享）
- 同一 `ObligationInstance` 出现在**最紧迫**的 tab 即止，不重复

**View Scope Toggle（§3.6.5 · Team 版 P1）：**

Tabs 之上加一行 scope 切换（Solo Plan 下该行不渲染）：

```
[ ● Firm-wide ]  [   My work   ]     (Owner/Manager 默认 Firm-wide)
[    Firm-wide ]  [ ●  My work  ]    (Preparer 默认 My work)
```

- 切换立刻影响：Triage Tabs 计数 + Deadline Radar 顶栏 $ 聚合 + Weekly Brief 候选池 + Smart Priority 打分池
- URL 持久化：`?scope=firm` / `?scope=me`
- Coordinator 只有 Firm-wide（无 My work 视图，因为不直接承担 assignee 任务）

**段边界定义：**

| Tab        | 规则定义                                | 颜色次级信号                         |
| ---------- | --------------------------------------- | ------------------------------------ |
| This Week  | `current_due_date ≤ today + 7d`         | 🔴 Critical（≤ 2d）/ 🟠 High（3–7d） |
| This Month | `7d < current_due_date ≤ today + 30d`   | 🟡 Upcoming                          |
| Long-term  | `30d < current_due_date ≤ today + 180d` | ⚪ Planned                           |

#### 5.1.3 TriageCard（S1-AC2 倒计时 + S1-AC4 一键状态）

```
┌─ Acme LLC · CA Franchise Tax ──────────────────────────┐
│  [🔴 3d]  $4,200 at risk           [Status: Working ▾] │
│  State: CA · County: LA · Entity: LLC · Form: 3522    │
│  Readiness: Waiting on client                         │
│  Why top rank? [✦]                                    │
│  Source: CA FTB · ✓ Human verified · 2026-04-12       │
│  [Open detail] [Mark filed · F] [Mark extended · X]    │
└────────────────────────────────────────────────────────┘
```

- **倒计时徽章**：左上 `[🔴 3d]` 固定精确到天；< 0 显示 `OVERDUE`
- **Status 下拉**：Not started / In progress / Waiting on client / Needs review / Filed / Paid / Extended / Not applicable
- 状态切换零 modal + 500ms toast 支持 Undo
- 键盘：`F` = Filed，`X` = Extended，`I` = In progress，`W` = Waiting

#### 5.1.4 Pulse Banner（S3-AC3）

- 永远在 Layer 2；每条未处理 Alert 顶部横幅展示
- 最多同时展示 1 条主 Banner + N 条折叠（"2 more alerts ▾"）
- 每条 Banner：`source logo · title · impacted_count · [Review & Batch Adjust →] [Snooze 1h] [Dismiss]`
- **"Last checked: X min ago · Watching IRS + 50 states + DC"** 始终显示（即使无新 Alert 也展示可信度信号）
- 点 `Review & Batch Adjust →` 进入 §5.4 Pulse Detail Drawer

#### 5.1.5 Mobile 响应式

`< 768px`：堆叠纵向，保留 Deadline Radar + Pulse Banner + Triage Tabs 三层；Ask 输入框折叠为 Cmd-K 按钮。

### 5.2 Obligations（表格视图 · 对齐 S1-AC3 / AC4）

#### 5.2.1 目标

税务人熟悉的高密度表格 + 现代筛选与批量操作。

#### 5.2.2 列（默认可见 10 列，可自定义至 20 列）

`Client ▸ EIN ▸ Entity ▸ State ▸ County ▸ Form/Tax ▸ Original Due ▸ Current Due ▸ Days ▸ $ At Risk ▸ Status ▸ Readiness ▸ Assignee ▸ Last Verified ▸ Source`

#### 5.2.3 筛选栏（S1-AC3 · < 1s 响应）

| 维度                | 类型                           | 索引支持                                                  |
| ------------------- | ------------------------------ | --------------------------------------------------------- |
| Client              | 多选 + 搜索                    | `obligation_instance (firm_id, client_id)`                |
| State               | 多选枚举                       | `client (firm_id, state)`                                 |
| **County**          | 多选 + 搜索（依赖 State 过滤） | `client (firm_id, state, county)`                         |
| **Form / Tax Type** | 多选枚举                       | `obligation_instance (firm_id, tax_type)`                 |
| Status              | 多选枚举                       | `obligation_instance (firm_id, status, current_due_date)` |
| Readiness           | 多选                           | 同上                                                      |
| Assignee            | 多选                           | `obligation_instance (firm_id, assignee_id)`              |
| $ At Risk           | 数值范围                       | Redis 预聚合                                              |
| Days                | 数值范围                       | 复合索引                                                  |

**性能 SLA**：1000 obligations × 200 clients 数据规模下，所有筛选 **P95 < 1 秒**，通过：

- 复合索引（§8.2）
- 服务端 pagination（50 行 / 页）+ virtualized TanStack Table
- URL state 持久化（可刷新、可分享、可 back）

#### 5.2.4 行内一键标状态（S1-AC4）

- 每行 `[status ▾]` 下拉即改
- `[· · ·]` 右侧溢出菜单：`Mark Extended · X / Mark Filed · F / Open Detail · Enter / Apply Extension / Copy Evidence`
- 键盘导航：`J/K` 上下，`E` 展开 Evidence，`F` Filed，`X` Extended

#### 5.2.5 批量操作

多选后 bulk bar：

- `Change status` → 批量改状态
- `Change assignee`
- `Mark extended (with memo)`
- `Export selected as CSV / PDF (1 per client)`

#### 5.2.6 Saved Views（P1-16）

- 保存筛选组合 + 排序 + 列可见性
- 例如："CA clients due in 14 days"、"Waiting on client – Q1"
- 左栏 Saved Views 列表 + Pin to nav + 可分享（firm 内）

### 5.3 Obligation Detail（侧抽屉）

```
┌─────────────────────────────────────────────────────┐
│  Acme LLC — CA Franchise Tax 2026         [× Close] │
│  Due: Mar 15 · 3 days · $4,200 at risk              │
├─────────────────────────────────────────────────────┤
│  📍 Status:  In progress           [Change ▾]        │
│  📋 Readiness:  Waiting on client  [Change ▾]        │
│  🔀 Extension: Not filed           [Decide...]       │
│  👤 Assignee:  Sarah                                 │
├─────────────────────────────────────────────────────┤
│  Deadline Radar                                       │
│  Failure-to-file:  $210/mo (est.)   max $1,050       │
│  Failure-to-pay:   $21/mo (est.)                     │
│  Interest:         $14/mo @ 8% AFR                   │
│  State surcharge:  $0 (CA min $800 paid 2026-01-15)  │
│  ────────────────────────────────────                │
│  If missed 90 days:  ~$4,200                         │
│  [Run What-If Simulator]     [Edit assumed liability]│
├─────────────────────────────────────────────────────┤
│  AI Deadline Tip  [Evidence]                         │
│  "CA Franchise Tax applies to every LLC doing        │
│   business in California, regardless of income [1].  │
│   The $800 minimum is due by the 15th day of the     │
│   4th month after formation [2]..."                  │
│   Sources: [1] CA FTB Pub 3556 · verified 2026-04-12 │
│            [2] CA R&TC §17941 · verified 2026-04-12  │
│   [Human-verified ✓]  [Copy as citation block]       │
├─────────────────────────────────────────────────────┤
│  📎 Evidence Chain                                   │
│  Rule v3.2 → Client profile → Generated 2026-01-01   │
│  [Open Provenance Graph]                             │
├─────────────────────────────────────────────────────┤
│  🕑 Audit Log                                         │
│  2026-04-22 10:12  Sarah changed status → In progress│
│  2026-04-19 14:03  Pulse applied CA relief update    │
│  2026-01-01 00:00  Auto-generated from Rule v3.2     │
└─────────────────────────────────────────────────────┘
```

### 5.4 Pulse Detail Drawer（Story S3 · S3-AC4 / AC5）

从 Dashboard Banner 或 `Rules > Pulse Changes` 入口进入。

```
┌──────────────────────────────────────────────────────┐
│  IRS · Tax relief for California storm victims       │
│  [Review & Batch Adjust]                             │
│  Official: irs.gov/newsroom/...  ·  Apr 15, 2026     │
│  AI confidence: 94% · ✓ Human-verified by DueDateHQ │
├──────────────────────────────────────────────────────┤
│  AI summary (2 sentences, Glass-Box):                │
│  "IRS extends filing deadlines for Los Angeles       │
│   County to October 15, 2026, covering Form 1040,    │
│   1120-S, 1065 for affected taxpayers [1]."          │
│                                                      │
│  [Source excerpt ▾]                                  │
│    "Individuals and businesses in Los Angeles County │
│     have until October 15, 2026 to file various      │
│     federal individual and business tax returns..."  │
│                                                      │
├─ Structured fields ─────────────────────────────────┤
│  Jurisdiction: CA                                    │
│  Counties: Los Angeles                               │
│  Affected forms: 1040, 1120-S, 1065                  │
│  Affected entities: Individual, S-Corp, Partnership  │
│  Original due: 2026-04-15                            │
│  New due: 2026-10-15                                 │
├─ Affected clients (12) ──────────────────────────────┤
│  Quick filter: [All] [LA County only] [S-Corp only]  │
│                                                      │
│  ☑ Acme LLC (CA, LA)           1040  Mar 15→Oct 15  │
│  ☑ Bright Studio S-Corp (CA)  1120-S Mar 15→Oct 15  │
│  ☑ Miller Partnership (CA)    1065  Mar 15→Oct 15  │
│  ... 9 more                                         │
├──────────────────────────────────────────────────────┤
│  [Batch update deadlines for 12 selected clients]   │
│  ☑ Add pulse evidence to each obligation             │
│  ☑ Log to audit trail                                │
│  ☑ Email summary to assignees                        │
│  ☑ Mark alert as reviewed                            │
│                                                      │
│  [Apply]    [Dismiss]    [Generate client email]    │
└──────────────────────────────────────────────────────┘
```

**Batch Apply 完成后：**

- Toast：`✓ Batch-applied to 12 clients. [View audit ↗] [Undo (24h)]`
- Dashboard Banner 自动消失（或折叠入历史）
- 每条 obligation 的 Evidence Chain 自动追加 Pulse Event
- 触发 Email Digest（§6.3.4）

### 5.5 Evidence Mode（全局浮层 · S3-AC5）

**触发**：按 `E` 键 / 点击 source chip / 点击 "Why?"

```
┌─── Evidence for: "due in 3 days"  ────────────────┐
│   How we know                                      │
│   ───────────                                      │
│   Rule:      CA Franchise Tax — LLC Annual Min     │
│   Version:   v3.2 (adopted 2026-01-15)             │
│   Logic:     15th day of 4th month after formation │
│              Acme LLC formed 2020-11-20            │
│              → 2026-03-15                           │
│                                                    │
│   Primary source                                   │
│   ──────────────                                   │
│   CA FTB Publication 3556                          │
│   ftb.ca.gov/forms/misc/3556.html ↗                │
│                                                    │
│   Source excerpt                                   │
│   ──────────────                                   │
│   "Every LLC doing business in California is       │
│    subject to the $800 annual minimum franchise    │
│    tax, due by the 15th day of the 4th month..."   │
│                                                    │
│   Statutory basis                                  │
│   ────────────────                                 │
│   CA R&TC §17941                                   │
│                                                    │
│   Human verification                               │
│   ──────────────────                                │
│   Reviewed by  practice owner/manager              │
│   Verified at  2026-04-12 09:21 PST                │
│   Next review  2026-07-12                          │
│   [✓ Human verified]                               │
│                                                    │
│   If anything above is wrong, [Report issue]       │
│   [Copy as citation block]                         │
└────────────────────────────────────────────────────┘
```

### 5.6 Clients List / Client Detail

- **List**：表格，列 = name / EIN / entity / state / county / tax types / active obligations / $ at risk / last touched
- **Detail（抽屉）**：
  - Header：客户卡片 + `[Copy as client email]`
  - Tab 1 · Obligations（此客户年度所有 deadlines，时间轴视图）
  - Tab 2 · AI Risk Summary（Glass-Box + citations）
  - Tab 3 · Audit（此客户所有变更）
  - Tab 4 · Documents（P1，文件链接引用，不做存储）
  - `[Export PDF]` → 生成 Client PDF Report（§7.6）

### 5.7 Rules（规则中心，只读 · 登录用户视图）

展示所有已 verified 规则，每条含：
`jurisdiction · entity · tax type · due-date logic · penalty_formula · source_title · source_url · source_excerpt · verified_by · verified_at · next_review_at · version · status · rule_tier · applicable_year · checklist(6/6) · cross_verified_sources[]`

MVP 覆盖 `FED + 50 states + DC` source-backed rules/candidates；candidate 仍需 practice review 才能成为 active coverage。  
每条规则有 **Quality Badge（§6D.4）+ Cross-verified chip（§6D.5）**。  
CPA 可以点 `Report issue` 触发人工复核流。  
**不允许** CPA 编辑内置规则，但允许 `custom_deadline`（手动添加到某客户）。

> 完整 Rules-as-Asset 架构（包括公开 `/rules` Library、`/watch` Source Registry、Deadline History overlay）见 §6D。工程归属：公开 SEO 页属于 `apps/marketing` / `duedatehq.com`，不是 `app.duedatehq.com` 的 SaaS SPA fallback。

### 5.7A `/rules` Rule Library 公开页（P1-34 · §6D.7）

面向 CPA 的公开规则浏览页，**无需登录**（SEO + 获客）。

工程归属：`apps/marketing` Astro static site；首版可用静态/mock verified rules，后续通过静态 snapshot 或公开 `/api/v1/*` 读取规则快照，不调用内部 `/rpc`。

**包含：**

- Federal + 6 州分组的 verified rule 列表
- 每条 rule 的 Source / Verified at / Quality Badge 6/6
- Active Exception Overlay 高亮区（IRS CA storm relief 等）
- 44 州 "not yet covered" 透明声明 + Request coverage 表单
- PDF / JSON 导出按钮（API-ready）
- Subscribe to changes 邮件订阅入口

不展示客户数据。SEO 针对"2026 CA Franchise Tax calendar"等长尾关键词。

### 5.7B `/watch` Source Registry 公开页（P1-31 · §6D.3）

"What We Watch For You" 页：列出 15+ 官方来源、cadence、当前健康状态，公开承诺可见。

工程归属同 `/rules`：`apps/marketing` / `duedatehq.com`。

### 5.7C Dashboard Freshness Badge（§6D.3 层 A）

每次登录顶栏永久显示：

```
🟢 All watchers healthy · 15 sources · Last check 18 min ago
```

hover 展开逐源 health + 下周 / 下季度的 practice review 时间点。

### 5.8 Rules > Pulse Changes（Pulse 历史）

所有历史 Pulse 公告的时间线视图：

- 左栏：feed（source logo + title + published_at + severity + status）
- 右栏：Pulse Detail Drawer（同 §5.4）
- 筛选：Source / Status / Date range

### 5.9 Migration Copilot（4 步向导 · 详见 §6A）

单独章节深讲；入口：

- 首次登录强制进入（空态首页）
- `Clients` 页右上 `+ Add clients ▾` → `Import file / Paste / Add one`
- `Cmd+K → import clients`

### 5.10 Account / Practice Surfaces

- Practice profile / Notifications / Import history（含 Undo）/ Members / Billing / Account security / Audit Log

---

## 6. 亮点模块 — Clarity Engine

### 6.1 Rule Engine（规则引擎 · 50 州骨架）

#### 6.1.1 数据模型

见 §8.1 `ObligationRule` 表。

#### 6.1.2 首发覆盖

- **Federal**（IRS Publication 509）：个人 1040 / 企业 1120 / S-Corp 1120-S / Partnership 1065 / Trust 1041 / Estimated Tax 1040-ES / Extension 4868 / 7004 / 延期不延 payment 规则
- **CA**：LLC Franchise Tax 3522 / 3536 / 100S / PTET 3804 / Estimated Tax 100-ES
- **NY**：CT-3-S / PTET IT-204-IP / Estimated Tax
- **TX**：Franchise Tax 05-158 / No Tax Due
- **FL**：F-1120 / RT-6（年度日历）
- **WA**：B&O Tax
- **MA**（新增覆盖）：Form 1 / Form 2 / Form 3 / Corporate Excise

约 30 条核心规则，每条带 `source_url + source_excerpt + verified_by + verified_at + next_review_at`。

#### 6.1.3 其他 44 州

Schema 占位 + Federal-only 默认生成 + Obligation 上显示 `needs_review` 徽章 + "Not yet fully covered" tooltip。这个设计让产品在 Demo 时看起来 50 州全支持，但不会因未验证规则承担法律风险。

#### 6.1.4 规则版本化

每条规则有 `version` + `adopted_at`；修改规则时新增 version，旧 ObligationInstance 保留 `rule_version` 指向生成时版本，避免规则改动回溯污染历史数据。

#### 6.1.5 规则变更流

```
Ops/Tax expert edits rule draft
  → Second-person review + sign-off
  → Rule set version++
  → Affected ObligationInstances get [Rule updated, review] flag
  → User sees "1 rule updated recently" in Rules > Pulse Changes
```

#### 6.1.6 为什么要全辖区骨架而非有限州试点

- 客户跨州不会提前通知我们；系统必须能吞任何 state code
- 规则表留 `coverage_status: full | skeleton | manual` 三档，UI 层有差异提示
- 骨架态下允许用户 `custom_deadline` 手录，并进入 practice owner/manager 复核队列贡献规则

### 6.2 Glass-Box AI Layer（证据绑定型 AI）

#### 6.2.1 纪律

- **No citation, no output.** 任何 AI 生成的句子必须带 `[n]` 索引；否则不渲染，降级为 refusal 文案。
- **Retrieval-before-generation.** 所有 prompt 必须先从 `rule_chunks` + `pulse_chunks` 取 top-k；AI SDK 输出只能引用传入的 chunk。
- **Refuse gracefully.** 如果 retrieval 为空或置信度 < 0.5 → `"I don't have a verified source for this. [Ask a human]"`.
- **Never conclude.** 白名单：`Confirm... / Check whether... / Source indicates...`；黑名单：`Your client qualifies... / No penalty will apply... / This is valid tax advice...`
- **PII never leaves.** 客户姓名 / EIN / 邮箱在 prompt 中使用占位符 `{{client_1}}`，生成后在后端回填。符合 IRC §7216 + FTC Safeguards Rule。

#### 6.2.2 AI 能力矩阵

| 能力                    | 优先级 | 输入                                             | 输出                                        | 降级策略                                              |
| ----------------------- | ------ | ------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------- |
| Weekly Brief            | P0     | 本 firm Smart Priority top-N 候选 + 客户 summary | 3–5 句带 citation                           | 缓存上次版本 + 模板兜底 "You have N items this week." |
| Client Risk Summary     | P0     | 单客户 30 天 obligations + rule chunks           | 一段话 + bullets                            | 纯 SQL 聚合 "3 upcoming, 1 critical"                  |
| Deadline Tip            | P0     | 单 obligation + rule chunk                       | 3 段 What/Why/Prepare                       | 从 `rule.default_tip` 兜底                            |
| Smart Priority          | P0     | 全部 open obligations + client 字段              | 打分 + 因子分解                             | 纯函数（零模型调用，§6.4），AI 仅用于 Why-hover 解释  |
| Pulse Source Translator | P0     | 官方公告原文                                     | 结构化 JSON + 人话 summary + source excerpt | 置信度 < 0.7 标记 pending review                      |
| Ask DueDateHQ (Q&A)     | P1     | 自然语言 query                                   | 表格 + 总结 + citations                     | 预设模板 5 条兜底（§6.6.5）                           |
| AI Draft Client Email   | P1     | Alert + 受影响客户                               | 英文邮件草稿                                | 固定模板                                              |
| Migration Field Mapper  | P0     | 表头 + 5 行样本                                  | mapping JSON                                | Preset profile + 手动下拉                             |
| Migration Normalizer    | P0     | 字段枚举值                                       | 归一值 + confidence                         | 字典 + fuzzy + 手动编辑                               |

#### 6.2.3 RAG 管线

```
User Event (page load / Apply / Ask)
  ↓
Retrieval
  - Query → embedding → pgvector top-k (k=6)
  - Filter by firm_id / jurisdiction / entity_type / tax_type
  ↓
Prompt Assembly
  - System prompt (glass-box persona, refusal rules)
  - Retrieved chunks with [n] IDs
  - User context (client summary with PII placeholders, today, role)
  ↓
AI SDK call
  - fast-json / fast-text — Deadline Tip / Mapper
  - quality-json / quality-text — Weekly Brief / Pulse Extraction
  ↓
Post-processing
  - Regex validate citations [n]
  - Hallucination guard: every [n] must exist in retrieved chunks
  - PII re-fill: placeholder → real values
  - If validation fails → retry once → else refusal
  ↓
Render
  - Citations as clickable chips → Evidence Mode
  - Store AiOutput row with prompt_version + model + input hash for audit
```

#### 6.2.4 Prompt 版本化

`/prompts/*.md` 全部版本化入库；`prompt_version` 写入 `AiOutput` 表，A/B 和回溯可做。

#### 6.2.5 成本控制

- 每 firm / day 限 200 次 AI 请求
- Weekly Brief 每 firm 每天生成 1 次并缓存
- Deadline Tip 按 `rule_id + client_id` 缓存 7 天
- 失败 → 展示缓存 + 警示条

### 6.3 Regulatory Pulse™（Story S3 全链路）

#### 6.3.1 Ingest（S3-AC1）

6 个权威源族 + 24h SLA：

| Source                     | 类型                   | 方式                                     | 频率    |
| -------------------------- | ---------------------- | ---------------------------------------- | ------- |
| IRS Disaster Relief        | 专题页                 | HTML watch + detail diff                 | 60 min  |
| IRS Newsroom               | 广谱新闻               | HTML list/detail signal                  | 120 min |
| CA FTB Newsroom / Tax News | 官方 newsroom/archive  | HTML list/detail + email                 | 60 min  |
| NY DTF Press               | 官方 press archive     | HTML yearly archive + email              | 120 min |
| TX Comptroller             | 官方 RSS / GovDelivery | RSS + detail HTML                        | 60 min  |
| FL DOR TIPs / WA DOR News  | 官方公告页             | HTML watch + email/subscription fallback | 120 min |

冗余设计：任何单源失败 → 日志 + Sentry 告警 + 降级为 mock（UI 侧 `Last checked X min ago` 仍诚实显示）。
实现约束：不得把未复核的 RSS endpoint 写成主依赖；Evidence 必须回链到官方 `.gov` canonical page，GovDelivery / email 只作为内部信号。

#### 6.3.2 AI Extraction（S3-AC1 / AC5）

```
Raw announcement
  ↓  AI SDK extraction (schema-first)
{
  "title": "IRS announces tax relief for California storm victims",
  "jurisdiction": "CA",
  "counties": ["Los Angeles"],
  "affected_forms": ["1040", "1120-S", "1065"],
  "affected_entity_types": ["Individual", "S-Corp", "Partnership"],
  "original_due_date": "2026-04-15",
  "new_due_date": "2026-10-15",
  "effective_from": "2026-04-22",
  "official_source_url": "https://irs.gov/newsroom/...",
  "source_excerpt": "Individuals and businesses in Los Angeles...",
  "confidence": 0.94,
  "requires_human_review": true
}
```

所有 Pulse 条目默认 `requires_human_review = true`；由 practice owner/manager 复核 → Approve → 才进入 Match + Feed。

#### 6.3.3 Match Engine（S3-AC2 + AC4 批量调整）

四维匹配：`state + county + entity_type + tax_type`。下例表达业务语义；D1 / SQLite 实现必须使用参数化 `IN (?, ?...)`、JSON1 `json_each()` 或反范式 helper 表/列，不使用 Postgres `ANY()`。

```sql
SELECT c.id, c.name, o.id as obligation_id, o.current_due_date
FROM clients c
JOIN obligation_instances o ON o.client_id = c.id
WHERE c.firm_id = :firm_id
  AND c.state = :pulse_jurisdiction
  AND (:pulse_county_count = 0 OR c.county IN (:pulse_county_1, :pulse_county_2))
  AND c.entity_type IN (:entity_type_1, :entity_type_2)
  AND o.tax_type IN (:form_1, :form_2)
  AND o.status NOT IN ('done', 'not_applicable')
  AND o.current_due_date = :pulse_original_due_date;
```

若客户 `county IS NULL` 且 Pulse 是县级 relief，不允许静默 Apply；该 obligation 进入 `needs_review` 区块，由 CPA 手动确认县适用性。

**Batch Apply 原子事务：**

```
BEGIN
  FOR each selected (client, obligation):
    INSERT obligation_exception_application or controlled Phase 0 override
      (obligation_instance_id, pulse_id, before_due_date, after_due_date, applied_by)
    INSERT evidence_link (obligation_id, pulse_id, applied_at, applied_by, source_type='pulse_apply')
    INSERT audit_event (actor, action='pulse.apply', batch_id, before, after)
  INSERT email_outbox (assignee_list, pulse_summary, obligations)  -- §6.3.4
  UPSERT pulse_firm_alert (firm_id, pulse_id, status='applied')
COMMIT
```

任意一步失败整体回滚。24h 内可 Revert（§6.3.6）。

#### 6.3.4 Email Digest（S3-AC3 双渠道耦合）

**关键设计：** Pulse Apply 成功的 **同一事务内** 插入 `email_outbox`，由 worker 异步发送。Email 与 Banner 共享一条 Pulse 数据，保证 CPA 在 Dashboard 看到与邮箱看到的**内容完全一致**。

邮件模板：

```
Subject: [DueDateHQ] IRS CA storm relief applied to 12 of your clients

Hi Sarah,

A new regulatory update affects 12 of your clients. Here's what we did:

───────────────────────────────────────────────
IRS announces tax relief for California storm victims
Published: Apr 15, 2026
Source: https://irs.gov/newsroom/... [Verify on IRS]
───────────────────────────────────────────────

Summary (AI-generated, verified by practice owner/manager):
  IRS extends filing deadlines for Los Angeles County to
  October 15, 2026, covering Form 1040, 1120-S, 1065.

Affected clients (12):
  ✓ Acme LLC (LA) — 1040 moved from Mar 15 → Oct 15
  ✓ Bright Studio S-Corp (LA) — 1120-S moved
  ✓ Miller Partnership (LA) — 1065 moved
  ... 9 more

All changes can be reverted within 24 hours.

[Open DueDateHQ →]    [Undo this batch]

This update was applied on 2026-04-22 10:15 PST by sarah@firm.com.
AI-assisted. Verify with official sources.
```

**邮件配送（Team 路由规则 · §3.6 Gap 4）：**

| 收件人                                    | 规则                                                                              | 可否关闭                 |
| ----------------------------------------- | --------------------------------------------------------------------------------- | ------------------------ |
| **Firm Owner**                            | 必收一份                                                                          | ❌（Pulse 是法定级信号） |
| **受影响 obligation 的 Assignee**（去重） | 必收一份（如果同一人有多条，合并为一封）                                          | ❌                       |
| **未分派 obligation 的 fallback 收件人**  | `firm.default_assignee` 配置（`owner` / `round_robin` / `none`）；默认 owner      | —                        |
| **Manager**                               | 可选订阅全量 Pulse Digest（Notifications → `Subscribe to all firm Pulse alerts`） | ✓ 可关                   |
| **Preparer / Coordinator**                | 只有当 assignee = 自己 才发                                                       | —                        |

**配送规则：**

- 同一人多条 obligation → **合并为一封邮件**（按 obligation 列表 bullets）
- 模板渲染：服务端（Resend），不使用 AI 生成
- 每封邮件 footer 显示 `You received this because you are the assignee on 3 obligations.` + `[Notification preferences]`
- 切换到 Daily Digest：Notifications → `Pulse email cadence: Immediate / Daily digest 8am / Weekly digest Monday 8am`（默认 Immediate）
- **Coordinator 邮件版本不含 `$ at risk` 字段**（与 §3.6.3 RBAC 一致，commercial-sensitive 隐藏）

#### 6.3.5 Pulse 抓取失败的降级 Demo 流

**DLQ（Dead Letter Queue）：** 任何单源失败 → 日志 + Sentry 告警 + 回退为 mock + UI 显示 `Last checked: 3 hr ago (retrying)` 警示色。

Demo 预置：1 条 approved `IRS CA storm relief` + 1 条 `NY PTET reminder`，即使现场官方源 / feed 抖动也能演完闭环。

#### 6.3.6 24h Revert

Batch Apply 后 24h 内 owner 可一键 Revert，写反向 audit event + 恢复 `original_due_date` + 移除 pulse evidence_link。

### 6.4 Smart Priority Engine（S1-AC5 胶水）

#### 6.4.1 为什么存在

Story S1 AC#5 要求 "5 分钟完成分诊"；仅有三段 Tabs 不够——Tab 内仍可能 15 行，CPA 需要明确的排序依据。Smart Priority Engine 是 Dashboard Triage Tab / Obligations 默认排序 / Weekly Brief 客户顺序 **三处共用的同一个打分函数**。

#### 6.4.2 打分函数（纯函数、可解释、零幻觉）

```typescript
// Weights versioned in /prompts/priority.v2.yaml for auditability.
function priorityScore(o: ObligationInstance, c: Client): PriorityBreakdown {
  const exposure = o.estimated_exposure_usd // Deadline Radar 输出（§7.5）
  const urgency = daysUntil(o.current_due_date) // 剩余天数
  const importance = c.importance_weight // high=3 / med=2 / low=1
  const history = c.late_filing_count_last_12mo // 历史延误
  const readiness = o.readiness === 'waiting_on_client' ? 1.3 : 1.0

  const score =
    0.45 * normalize(exposure, 0, 10_000) + // 截止日风险主导
    0.25 * inverseUrgency(urgency) + // 越近越高
    0.15 * normalize(importance, 1, 3) + // 客户分级
    0.1 * normalize(history, 0, 5) + // 爱迟到 → 优先盯
    0.05 * readiness // 卡在客户手上的要催

  return { score, factors: { exposure, urgency, importance, history, readiness } }
}
```

#### 6.4.3 Glass-Box 呈现（S1-AC5 的 "为什么这个比那个急"）

每行右侧 `✦` 徽章，hover 展开 `Why this rank?`：

```
Rank #1 — Acme LLC · CA Franchise
● $4,200 at risk  (45% weight)
● 3 days left     (25% weight)
● High-priority client (15% weight)
● 1 late filing last year (10% weight)
● Waiting on client (5% weight)
[Why these weights?] → /priority
```

#### 6.4.4 用户控制

排序切换（P1-13）：`AI Smart ✨ / Due Date / $ At Risk / Status`  
权重调整：P1+（仅 Pro plan，含审计日志）

#### 6.4.5 可选 AI Tie-breaker（P1）

未来配置 surface 中开关：`Use AI for tie-breaking` → 仅当 top-5 打分相差 < 5% 时调用 AI SDK 给出排序理由（不改变打分）。这让异步 Weekly Brief 的"Top 3 to touch first"和 Dashboard 列表 100% 一致，避免割裂感。

### 6.5 Deadline Radar™（截止日风险引擎）

见 §7.5 独立章节（在"亮点模块"之外，因其跨页面）。

### 6.6 AI Q&A Assistant — Ask DueDateHQ（P1 · VPC Medium ✦）

#### 6.6.1 入口

- Dashboard `Ask DueDateHQ` 输入框（Layer 5）
- `/` 全局快捷键抽屉
- Cmd+K 命令面板 "Ask" tab

#### 6.6.2 范围边界

仅回答**检索型**问题：

| 类型     | 示例                                                          | 行为                                                                                      |
| -------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 检索     | `Which clients owe CA PTE this month?`                        | ✅ SQL + summary + citations                                                              |
| 检索     | `Show me S-Corps with extension filed but payment unpaid`     | ✅                                                                                        |
| 检索     | `How many clients in LA county are affected by storm relief?` | ✅                                                                                        |
| 税务判断 | `Should my client elect PTE?`                                 | ❌ Refusal: "DueDateHQ is a deadline copilot. Please consult your professional judgment." |
| 写操作   | `Delete all 1040 obligations`                                 | ❌ Refusal: "Ask is read-only."                                                           |
| 跨租户   | `Show all firms with CA clients`                              | ❌ Hard-blocked by tenant isolation                                                       |

#### 6.6.3 实现管线（双保险 · NL → DSL → SQL）

```
User question
  ↓
AI SDK Layer 1 · Intent classifier (retrieval / advice / out-of-scope)
  ↓  if not retrieval → refusal template
  ↓
AI SDK Layer 2 · DSL generator (constrained, schema-aware)
  e.g. {
    entity: "obligation",
    filters: [
      { tax_type: "state_ptet" },
      { state: "CA" },
      { due_within_days: 30 }
    ],
    group_by: "client"
  }
  ↓
Executor · DSL → parameterized SQL
  - Whitelisted tables: clients, obligation_instances, rules (read-only)
  - Enforced: WHERE firm_id = :current_firm (injected, not user-controlled)
  - Parser rejects: DDL / DML / cross-JOIN out of whitelist
  ↓
Execute SQL → result rows
  ↓
AI SDK Layer 3 · Summarize in one sentence with [source] chips
  - PII re-filled after AI output
  ↓
Render
  - Table preview (first 10 rows + "Open all in Obligations" deep link)
  - Saved View + CSV Export
  - Evidence drawer: DSL + SQL + row count
```

#### 6.6.4 合规与安全

- 只读白名单 + tenant 强制隔离（两层）
- AI SDK 只看 schema + 用户问题 + 5 行 anonymized sample，不看全量 PII
- 所有调用写内部 `ai_output` trace（成本 / 延迟 / token usage 可审计）
- Ask 历史在 Ask history（用户可删除）

#### 6.6.5 降级

若 AI SDK 不可用，Ask 降级为预设 5 条模板问答（固定 DSL + SQL）：

- `How many deadlines do I have this week?`
- `Which clients are waiting on documents?`
- `Show me overdue obligations`
- `Clients due in next 30 days`
- `Clients in California`

---
