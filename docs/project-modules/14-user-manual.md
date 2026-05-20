# DueDateHQ 用户与模块使用手册

本文面向 DueDateHQ 的事务所用户、内部运营、产品、研发和架构评审者，说明每个产品模块能做什么、哪些用户可以使用、以及用户应如何完成常见操作。本文同时补充现有 `00-13` 技术模块文档的阅读和使用方式。

> 本文基于 2026-05-02 的当前代码与 `docs/project-modules` 文档整理。它描述已经实现或已有明确文档记录的能力，不把规划项写成已可用功能。

## 使用边界

DueDateHQ 的税务规则、截止日、罚金风险估算和 AI brief 用于事务所运营辅助、审计解释和团队排队，不替代 CPA、EA、律师或其他合规专业人员的判断。涉及报税、付款、延期和客户通知的最终决策仍应由具备相应资质和授权的人员确认。

## 角色与权限速览

| 角色/用户            | 主要使用范围                                      | 关键限制                                                                 |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| Owner                | 事务所全局管理、成员、计费、审计导出、Pulse 应用  | 需要对敏感操作负责，删除 firm 和移除成员会保留审计历史                   |
| Manager              | 日常运营管理、客户/义务处理、Pulse 应用、审计查看 | 不能管理计费；成员管理在 Members v1 中为 Owner-only                      |
| Preparer             | 客户和义务处理、迁移导入、Obligations 状态更新    | 不能应用 Pulse、不能 revert migration、不能导出审计包                    |
| Coordinator          | 低权限协调和只读查看为主                          | 不能修改客户、运行导入、应用 Pulse、查看审计日志或管理计费；金额可被隐藏 |
| 公开访客             | Marketing site、pricing、rules、state coverage    | 不能访问事务所操作台数据                                                 |
| 研发/产品/架构评审者 | 阅读项目模块文档、验证数据流和边界                | 不应把技术模块文档当作最终用户操作承诺                                   |

## 术语

| 术语                | 含义                                                                             |
| ------------------- | -------------------------------------------------------------------------------- |
| Firm / Practice     | 一个独立的事务所工作区，拥有独立客户、义务、审计日志、成员和计费状态             |
| Client              | 事务所服务的客户实体，例如 LLC、S corp、Partnership 或 Individual                |
| Filing jurisdiction | 客户需要报税的州档案；一个客户可有一个 primary state 和多个 active filing states |
| Obligation          | 一个客户对应的税务义务或截止日任务                                               |
| Evidence            | 支撑某个截止日、状态变更、Pulse 变更或导入结果的来源和审计证据                   |
| Audit event         | 记录谁在何时对什么对象做了什么变更的审计事件                                     |
| Pulse               | 政府来源、灾害公告和税务机关更新经过内部审核后形成的事务所提醒                   |
| Obligations         | 义务队列，供团队按状态、负责人、风险、证据和截止日批量处理                       |
| Migration Copilot   | 从 CSV/TSV/XLSX/粘贴表格导入客户并生成初始义务的四步向导                         |
| Rule template       | 全局规则模板，可预览影响，但不会直接生成用户提醒                                 |
| Practice rule       | 当前事务所自己的规则状态，由 owner/manager 审核为 active 后才可生成义务          |
| Active rule         | 已由当前 practice 接受，可生成 reminder-ready obligation                         |
| Penalty Radar       | Dashboard 中的罚金风险雷达，汇总当前队列的预计美元敞口                           |
| Projected Risk      | 90 天预计罚金风险；用于排队和优先级判断，不是官方罚单或应付通知                  |

## 用户功能模块

### 登录与创建事务所

**模块功能**

登录模块让用户通过 SSO 或工作邮箱验证码进入 DueDateHQ。默认入口是 Google One Tap / Google OAuth；Microsoft Entra ID OAuth 在配置后可用；工作邮箱验证码登录/注册保留为备用入口。首次登录后，Onboarding 页面会创建或激活事务所，并把用户带入主操作台。新建事务所后，应用可自动打开 Migration Copilot，帮助用户把第一批客户导入系统。

**适用用户**

- 所有需要进入事务所操作台的用户。
- 首次注册用户会进入 onboarding。
- 已有 active practice 的用户会直接进入主操作台。

**如何使用**

1. 打开应用登录页。
2. 优先点击 `Continue with Google` 使用 Google OAuth；如事务所配置 Microsoft，可使用 Microsoft SSO；也可以输入 work email，提交后填写 6 位验证码。
3. 首次使用时，在 `Set up your practice` 页面确认或修改事务所名称。
4. 点击 `Continue` 创建或激活事务所。
5. 进入主操作台后，根据需要运行 Migration Copilot 导入客户。

**关联模块**

- Auth 与身份：`08-auth-identity.md`
- SPA 路由：`01-app-spa.md`
- Practice profile：本文后续“Practice profile”模块

### 工作区切换与账户菜单

**模块功能**

Practice switcher 用于在多个 practice 之间切换当前工作区；新建 practice 是受套餐权益控制的次级动作。账户菜单用于切换语言、主题和退出登录。

**适用用户**

- 属于多个 practice 的事务所用户。
- 需要在不同事务所工作区之间切换数据上下文的 Owner、Manager、Preparer 或 Coordinator。

**如何使用**

1. 在左侧 sidebar 顶部点击当前 practice 名称。
2. 在 `Practices` 列表中选择目标 practice。
3. 如需新建独立工作区，点击 `Add practice`，输入 practice name 和 timezone；Solo/Pro/Team 超出 1 个启用中的 practice 时会看到 Billing / Contact sales 提示，Enterprise 可按合同支持多个 practice。
4. 在底部账户菜单中切换 `Language`、`Theme`，或点击 `Sign out` 退出。

**关联模块**

- Practice profile：当前 practice 的名称和 timezone 会影响这里的显示。
- Auth 与工作区数据隔离：`08-auth-identity.md`、`07-db-data-access.md`

### Dashboard

**模块功能**

Dashboard 是事务所日常运营的首页，聚合当前 firm 的风险、截止日压力、证据缺口、Pulse banner
和带解释的 Priority list。它帮助团队用最少时间判断“今天先处理什么”。

`Projected Risk` 是 Dashboard 的 Penalty Radar 口径。它把 open obligation 的截止日、税种、
jurisdiction、entity type 和已知 penalty facts 转换成 90 天预计罚金风险，让团队看到哪些任务
可能产生真实美元敞口，而不只是看到哪些任务快到期。它用于运营排队和风险解释，不是税务机关
已经出具的正式罚金通知。

Projected Risk 的主金额只聚合状态为 `ready` 的计算结果；如果缺少 tax due、owner count、
payment facts 等关键输入，系统会显示 `needs input`，而不会用 `$0` 假装没有风险。若当前税种
还没有可用的 source-backed formula，系统会标记为 `unsupported`。因此 Dashboard 的价值是把
deadline list 升级成可解释的 penalty-risk priority list：先处理真正有金额风险、时间压力和证据缺口的
事项。

**适用用户**

- Owner、Manager、Preparer：查看风险并更新义务状态。
- Coordinator：可用于低权限运营查看，金额展示可能受权限配置限制。
- 新 firm 没有客户和义务时，会提示运行 Migration Copilot。

**如何使用**

1. 从 sidebar 点击 `Dashboard`，或访问 `/`。
2. 查看顶部 metrics：open obligations、due this week、needs review、evidence gaps 和
   `Penalty Radar`。
3. 在 `Priority list` 中按 `This Week`、`This Month`、`Long-term` 分组查看义务。
4. 通过每行的 Focus rank、Smart Priority drivers 和 `Next check` 判断下一步动作。
5. 使用表头筛选 client、tax type、deadline window、status、severity、exposure、evidence。
6. 直接在 Dashboard 行内更新义务状态；成功后会写入 audit event。
7. 使用 `Review priority list` 进入 Obligations，或点击 `Run migration` 导入客户。

**关联模块**

- Obligations：Dashboard 的完整队列入口。
- Evidence：Priority list 的证据按钮会打开 evidence drawer。
- Pulse：顶部 Pulse banner 可打开 Pulse detail；完整历史在 Rules > Pulse Changes。
- Core 罚金逻辑：`05-core-domain.md`

### Clients

**模块功能**

Clients 模块管理事务所客户事实，包括客户名称、实体类型、EIN、filing jurisdictions、
county、邮箱、负责人和 notes。客户事实会驱动规则适配、义务生成、Dashboard 风险和 Pulse
匹配。`client.state/county` 只作为 primary filing jurisdiction 的兼容展示；真实规则和
Pulse 匹配以 active filing profiles 与 obligation jurisdiction 为准。

**适用用户**

- Owner、Manager、Preparer：可创建和更新客户相关工作流。
- Coordinator：以查看为主，不能执行客户写入类能力。

**如何使用**

1. 从 sidebar 点击 `Clients`。
2. 查看顶部指标：
   - `Ready for rules`：具备规则生成所需事实的客户数量。
   - `Needs facts`：缺少州、实体类型等关键事实的客户数量。
   - `Imported`：由导入产生的客户数量。
   - `States covered`：可用于规则和 Pulse 匹配的 filing state 覆盖。
3. 使用搜索框按客户名称检索。
4. 使用 `Entity` 和 `State` 筛选客户；State 会匹配客户任一 active filing state。
5. 点击客户行或 `Fact profile` 打开事实侧栏；可在 `Filing jurisdictions` 中补充或修正
   多个 filing states、primary counties，并查看每州 tax type review/source 状态。
6. 点击 `New client` 手动创建客户，填写 client name、entity type、EIN、state、county、email、owner 和 notes。
7. 点击 `Import clients` 打开 Migration Copilot。
8. 点击 `Import history` 查看导入批次，并可从历史记录跳转到导入客户。

**关联模块**

- Migration Copilot：批量导入客户。
- Obligations：客户负责人会影响义务分配和团队负载。
- Opportunities：客户事实和义务状态会生成轻量未来业务提示。
- Rules：客户事实决定哪些规则可生成义务。
- Pulse：filing state、profile counties 和客户事实决定匹配范围。

### Opportunities

**模块功能**

Opportunities 用现有客户事实和义务状态生成轻量未来业务提示，帮助 partner 发现哪些客户可能值得
服务范围、关系维护或人工 advisory conversation。它不是税务建议页面，不提供避税方法，也不替代
专业判断。

**如何使用**

1. 从 sidebar 点击 `Opportunities`。
2. 查看 `Advisory conversations`、`Scope reviews` 和 `Retention check-ins` 计数。
3. 阅读每条 cue 的 evidence chips，例如等待项数量、open obligations 数量或 owner count。
4. 点击 `Open client` 回到 Client detail，结合事实、work plan、Pulse 和 notes 决定是否跟进。
5. 在 Client detail 右侧的 `Future business cues` 小卡片查看当前客户的最多三条提示。

**边界**

- 不生成税务策略或避税建议。
- 不做 billing/hour pricing benchmark。
- 不提供 resolve、snooze、assign 或独立任务状态。

### Migration Copilot

**模块功能**

Migration Copilot 是四步导入向导，用于从旧系统导出的 CSV、TSV、XLSX、集成工具记录
或粘贴表格创建客户和义务。它通过 AI 字段建议、来源模板、资料整理、
默认税种建议和导入前预览降低迁移成本，并写入审计记录和来源证据。它不是任意平台
的一键全量同步；只有导入事实足够支撑时才生成义务，缺少 entity type、state、tax
type、tax year、payment status 或 extension status 的记录会进入 review。

**现实导入口径**

| 来源       | 可导入字段                                                                                                                 | 不可保证字段                                                             | 需要复核                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| TaxDome    | Accounts、Contacts、Jobs、Tasks CSV；account/contact 名称、州、负责人、tags、custom fields、job due date/internal deadline | TaxDome account type 不等同于税务实体类型；tags/custom fields 不一定规范 | entity type、tax types、tax year、extension/payment 状态 |
| Karbon     | Contacts/Organizations spreadsheet、work items/API payload、client owner/manager、contact type、accounting details         | practice workflow 状态不等同于税务申报状态                               | return type、tax year、state/entity 缺失项               |
| Drake      | Client/EF Data CSV、Report Manager 导出的 taxpayer ID、return type、地址/州、email                                         | 个人客户可能包含 SSN，不能作为 EIN 静默导入                              | SSN-like 列、实体归一、缺失州/return type                |
| QuickBooks | Customer/Customer Contact List Excel；name/company/address/phone/email/customer type/balance/notes                         | 不提供税务 entity type、return type、tax year 或 deadline                | 大多数 deadline 事实需要人工补齐                         |
| ProConnect | Reporting export 中符合条件的 e-filed return CSV                                                                           | 只覆盖 Intuit 当前支持的 tax year/form 和该账号 e-filed returns          | 未覆盖客户、非联邦/非最新 e-file 状态                    |
| SafeSend   | Returns、Organizers、Reminder Management report exports；delivery/status/reminder 信息                                     | 不是客户主数据源，也不保证税务实体/return facts 完整                     | client identity、return type、状态含义                   |
| Soraban    | 通过 Karbon/Zapier 路由的 records，或客户手动提供 export                                                                   | 当前不承诺 Soraban 直接接口全量导入                                      | 所有 tax facts 都按导出内容复核                          |

**适用用户**

- Owner、Manager、Preparer：可运行导入。
- Owner、Manager：可撤销导入。
- Coordinator：不能运行导入或撤销导入。

**如何使用**

1. 在 Dashboard、Clients 或 Obligations 点击 `Run migration` / `Import clients`。
2. Step 1 `Intake`：
   - 粘贴表格，或上传 CSV、TSV、XLSX。
   - 可选择 TaxDome、Drake、Karbon、QuickBooks、File In Time 等来源模板。
   - 普通供应商 CSV/XLSX 导出仍走 `Paste / Upload`；`Integration records` 只用于粘贴
     集成工具或已转换报表产生的结构化客户记录。
   - 文件大小上限为 2 MB。
   - 如果检测到 SSN 列或无法解析，会显示错误并阻止继续。
3. Step 2 `AI Mapping`：
   - 查看每个来源列映射到 DueDateHQ 字段的结果。
   - 关注低置信度、降级提示和错误行列表。
   - 必要时手动修改字段，或点击 `Re-run AI`。
4. Step 3 `Normalize & Resolve`：
   - 确认 entity、state、tax types 等整理结果。
   - 对缺失 tax types 的客户可通过默认税种建议推断。
   - 需要 review 的值必须处理后才能继续。
5. Step 4 `Dry-Run Preview`：
   - 查看将创建多少客户、义务、风险敞口和需要补充输入的项目。
   - 点击 `Import & Generate` 正式写入。
6. 导入成功后，Dashboard 和 Obligations 会刷新；toast 中可在允许窗口内撤销导入。

**关联模块**

- Clients：导入后生成客户。
- Obligations / Dashboard：导入后生成义务和风险队列。
- Audit / Evidence：导入批次、mapping、normalization、apply 和 revert 都有审计记录。
- AI engine：mapper 和 normalizer。
- Core：CSV parser、default matrix、penalty estimate。

### Obligations

**模块功能**

Obligations 是事务所的义务队列。它以表格方式显示客户、负责人、州/县、tax type、internal deadline、days、exposure、readiness、evidence 和 status，支持筛选、排序、批量更新、保存视图、导出和快捷键。Internal deadline 按 practice profile 中的 offset 从 statutory base deadline 提前生成；详情页同时显示税务机关规则来源中的 Filing Deadline 和 Payment Deadline。

**适用用户**

- Owner、Manager、Preparer：可更新状态、readiness、负责人和导出选中行。
- Coordinator：以查看和协调为主；写入能力受权限限制。

**如何使用**

1. 从 sidebar 点击 `Obligations`。
2. 使用搜索框查找客户。
3. 使用表头筛选：
   - Client、Owner、State、County、Tax type、Days、Exposure、Readiness、Status。
4. 使用快捷筛选：
   - `This week`
   - `Needs input`
   - `Needs evidence`
5. 调整显示：
   - `Comfortable` / `Compact` 切换密度。
   - `Columns` 控制可见列。
   - `Sort` 按 internal deadline 或 recently updated 排序。
6. 保存视图：
   - `Save current view` 保存当前筛选、排序、列和密度。
   - 可 apply、pin、rename、delete saved view。
7. 单行处理：
   - 修改 status，例如 in progress、waiting on client、filed、paid、extended。
   - 修改 readiness。
   - 点击 Evidence 打开证据侧栏。
   - 单击行打开 detail drawer 查看义务详情。详情顶部显示 internal deadline，以及税务机关规则来源中的 Filing Deadline 和 Payment Deadline；详情支持 Readiness、Extension、Risk、Evidence、Audit 五个 tab。
   - 在 Readiness tab 查看自动准备的 checklist，也可重新生成或编辑 checklist，发送/撤销客户资料
     请求，并复制公开 portal link。
   - 在 Extension tab 记录内部 apply/reject 决策；apply 会把义务状态标记为 extended，但不会改
     due date，也不代表已经向税务机关提交延期。
8. 批量处理：
   - 选择多行后可批量改 status、readiness、assignee。
   - 可导出 CSV 或 PDF zip。
   - `Mark extended` 可填写延期 memo。
9. 快捷键：
   - `J` / `K` 移动当前行。
   - `Enter` 打开详情。
   - `E` 打开 evidence。
   - `F` 标记 filed。
   - `P` 标记 paid。
   - `X` 标记 extended。
   - `I` 标记 in progress。
   - `W` 标记 waiting on client。

**关联模块**

- Dashboard：Obligations 状态更新会刷新 Dashboard。
- Audit：状态、readiness、负责人和导出会写 audit。
- Evidence：义务证据侧栏。
- Members：负责人来源于可分配成员。
- Team Workload：负责人负载由 Obligations 义务聚合。

### Team Workload

**模块功能**

Team Workload 按负责人聚合 open obligations、due soon、overdue、waiting、review 和 unassigned risk，帮助团队发现负载不均和无人负责的风险。

**适用用户**

- Pro、Team 和 Enterprise 计划用户。
- Solo 计划会看到升级提示。
- Owner、Manager、Preparer 可用于团队排队和分工。

**如何使用**

1. 从 sidebar 点击 `Team workload`。
2. 如果当前 firm 是 Solo，点击升级入口或回到 Obligations。
3. 查看顶部指标：Open、Due soon、Overdue、Waiting、Review、Unassigned。
4. 在 `Owner workload` 表中查看每个负责人的工作量和 load score。
5. 点击数字或 `Open` 跳转到带筛选条件的 Obligations。
6. 对 unassigned 或 overdue 负责人优先处理。

**关联模块**

- Billing：Pro、Team 和 Enterprise 计划解锁。
- Obligations：所有行操作最终回到 Obligations triage。
- Members：负责人来自成员和客户 owner label。

### Rules > Pulse Changes

**模块功能**

Rules 的 Pulse Changes tab 展示与当前 firm 客户匹配的 Regulatory Pulse。用户可查看政府来源变化、受影响客户、AI 置信度、结构化字段、来源健康，并决定 apply、dismiss、snooze、revert 或 reactivate。

**适用用户**

- 所有 firm 角色可查看 Pulse alert。
- Owner、Manager 可 apply、dismiss、snooze、revert、reactivate。
- Preparer、Coordinator 进入 detail drawer 时为 read-only，但可请求 Owner/Manager review。

**如何使用**

1. 从 sidebar 点击 `Rules`，打开 `Pulse Changes` tab。
2. 查看 source health 警告；degraded/failing source 不会阻止历史 alert 查看。
3. 使用 status filter 筛选 all、active、applied、partially applied、dismissed、reverted、snoozed。
4. 使用 source filter 按来源筛选。
5. 点击 alert 的 `Review` 打开详情侧栏。
6. 在详情中检查：
   - 来源、source URL、confidence、source status。
   - AI summary 和 structured fields。
   - affected clients table。
   - low-confidence 或 source revoked 警告。
7. 对需要人工确认的客户进行勾选确认。
8. Owner/Manager 可使用基础 Pulse 操作：`Apply to # clients`、`Dismiss`、`Snooze 24h`、
   `Undo (24h)`、`Reactivate / Re-apply`、`Copy client email draft`。
9. Apply 成功后会写 audit、链接 evidence，并排队 digest。

**关联模块**

- Pulse ingest：`10-ingest-pulse-sources.md`
- AI extraction：`09-ai-engine.md`
- Obligations / Dashboard：应用后的义务变化会进入队列和风险页。
- Audit / Evidence：所有决策写入可追踪记录。

### Calendar

**模块功能**

Calendar 提供 DueDateHQ 截止日的 ICS 单向订阅源。用户可以把截止日订阅到 Google
Calendar、Apple Calendar 或 Outlook；外部日历只负责显示和 best-effort 提醒，不反向修改
DueDateHQ。

**适用用户**

- 所有已登录 firm 用户都可以启用 `My deadlines`。
- 只有 Owner / Manager 可以启用 `Firm-wide calendar`。

**如何使用**

1. 从 sidebar 点击 `Calendar`。
2. 在 `My deadlines` 或 `Firm-wide calendar` 中选择隐私模式：
   - `Redacted client names`：外部日历隐藏客户名。
   - `Full client names`：外部日历显示客户名。
3. 点击启用按钮生成订阅 URL。
4. 点击 `Copy URL` 后，在 Google Calendar / Outlook 的 URL 订阅入口粘贴。
5. 点击 `Apple Calendar` 可用 `webcal://` 打开 Apple Calendar。
6. 如果 URL 暴露，点击 `Regenerate URL` 使旧链接失效；不再使用时点击 `Disable`。

**关联模块**

- Obligations：ICS 事件深链回对应 deadline drawer。
- Reminders：外部日历 alarm 只是补充；Email / In-app reminders 仍由 DueDateHQ 控制。
- Audit / Evidence：外部日历不能修改截止日，因此不会破坏 DueDateHQ 的证据链。

### Notifications

**模块功能**

Notifications 是站内通知中心，集中显示 deadline reminder、overdue、client reminder、Pulse alert、audit package ready 和 system notification，并管理通知偏好。

**适用用户**

- 所有已登录 firm 用户。
- 具体通知内容取决于用户角色、订阅偏好和系统事件。

**如何使用**

1. 从 sidebar 点击 `Notifications`。
2. 在 `Inbox` 查看最近通知。
3. 点击 `Open` 跳转到通知对应页面，并自动标记已读。
4. 点击 `Mark read` 标记单条通知。
5. 点击 `Mark all read` 标记全部已读。
6. 在 `Preferences` 中开关：
   - Email
   - In-app
   - Deadline reminders
   - Pulse updates
   - Unassigned work

**关联模块**

- Obligations / Dashboard：截止日和 overdue 通知。
- Pulse：Pulse alert 通知会把用户带到 Rules > Pulse Changes。
- Audit：audit package ready 通知。
- Server jobs：email outbox、deadline reminders。

### Rules

**模块功能**

Rules Console 展示 DueDateHQ 当前使用的规则覆盖、权威来源、规则库、Pulse Changes、Temporary Rules 和 obligation preview。它主要用于解释规则从哪里来、哪些规则 verified、哪些需要人工审核、哪些政府来源变更影响客户、哪些临时 exception 正在改变客户截止日，以及给定客户事实会生成哪些义务。

**适用用户**

- Owner、Manager：用于审核规则模板、批量确认 pending rules、创建 custom practice rules。
- Preparer、Coordinator：可读规则、来源和 preview，不能让规则进入生产生效状态。
- 产品、研发：用于检查覆盖和来源健康。

**如何使用**

1. 从 sidebar 点击 `Rules`。
2. `Coverage` tab：
   - 查看 active rules、pending review、sources watched、jurisdictions。
   - 查看 jurisdiction summary。
   - 查看 jurisdiction x entity 覆盖矩阵。
3. `Sources` tab：
   - 按 health 筛选 all、healthy、degraded、failing、paused。
   - 按 jurisdiction 筛选来源。
   - 点击行或外链图标打开官方来源。
4. `Review Queue` tab：
   - 按 jurisdiction、source、entity/form 筛选 pending review tasks。
   - 勾选当前筛选结果中的具体 rules，先看 bulk preview，再填写 batch review note。
   - 点击 `Accept selected` 后，只有成功项变为 active；冲突项会保留在 skipped list。
5. `Rule Library` tab：
   - 按 all、active、pending review、applicability review、exception 筛选。
   - 按 jurisdiction 筛选。
   - 点击规则行打开 detail drawer。
   - 在 detail 中查看 applicability、due-date logic、extension、review reasons、evidence、practice review。
6. `Pulse Changes` tab：
   - 查看 source-backed government changes。
   - 按 status/source 筛选 active、applied、dismissed、reverted、snoozed 等历史。
   - 点击 `Review` 打开 Pulse detail drawer，处理 affected clients。
7. `Temporary Rules` tab：
   - 查看已从 Pulse apply 生成的 temporary exception rules。
   - 按 all、active、reverted、retracted 筛选。
   - 查看 jurisdiction、scope、override due date、active obligation count 和最后更新时间。
   - 点击 source 图标打开官方来源；点击 Pulse detail 图标回到对应 Pulse drawer 做 revert 或 follow-up。
8. `Obligation Preview` tab：
   - Annual rollover 面板可选择 source / target filing year 和可选 client filter。
   - 点击 `Preview` 查看将创建、需要 review、duplicate、缺 active rule、缺 due date 的结果。
   - 点击 `Generate` 后只会为目标 filing year 有 active practice rule 且有具体 due date 的行创建 obligations；reminder-ready 行进入 `pending`，requires-review 行进入 `review` 并进入 Obligations triage。
   - 生成成功后可从面板跳转到 Obligations 查看新建 obligation。
   - 通过下拉框选择当前事务所的真实 client；entity、state 来自 client facts。
   - tax types 优先来自该 client 已有 obligations；若还没有 obligations，则由默认税种建议根据
     entity + state 推断。
   - 可继续调整 entity、state、tax types，并通过日历年份筛选框选择 tax year。
   - 点击 `Run preview`。
   - 查看 reminder-ready obligations 和 requires-review items。

**关联模块**

- Core rules：`05-core-domain.md`
- Contracts：`06-contracts.md`
- Pulse sources：`10-ingest-pulse-sources.md`
- Evidence：规则详情里的来源证据。

### Audit / Evidence

**模块功能**

Audit Log 记录 firm-wide write events、before/after state 和 actor metadata。Evidence drawer 用于查看义务或事件背后的证据链。Audit evidence package 可生成 ZIP，包含 PDF report、audit events、evidence links 和 manifest。

**适用用户**

- Owner、Manager、Preparer：可查看 audit events。
- Owner：可 request/download audit evidence package。
- Coordinator：当前 server 权限不包含 audit read。

**如何使用**

1. 从 sidebar 点击 `Audit log`。
2. 使用 filters：
   - Category：client、obligation、migration、rules、auth、team、pulse、export、ai、system。
   - Time range：last 24h、last 7d、last 30d、all time。
   - Action、Actor、Entity type。
3. 点击 audit event 行打开 event drawer，查看 actor、entity、before/after 和 reason。
4. 使用 pagination 浏览更多事件。
5. Owner 点击 `Export`：
   - 如果没有 ready package，点击 `Request export`。
   - 如果 latest package ready，点击 `Download latest`。
6. 在 Dashboard、Obligations、Rules、Pulse 等页面点击 evidence 入口可打开相关 Evidence drawer。

**关联模块**

- Obligations：状态和 readiness 写 audit。
- Migration：导入和撤销写 audit/evidence。
- Pulse：apply、dismiss、snooze、revert 写 audit/evidence。
- DB：`07-db-data-access.md`

### Members

**模块功能**

Members 页面管理 firm 成员、角色、席位、邀请、暂停、恢复和移除。它用于控制谁能访问事务所数据以及承担什么角色。

**适用用户**

- 当前页面文案和 server 行为以 Owner 管理为主。
- Owner 可邀请成员、改角色、暂停、恢复、移除成员。
- 非 Owner 可查看受限信息或遇到权限限制。

**如何使用**

1. 从 sidebar 点击 `Members`。
2. 查看 seats used、active members、pending invites、suspended。
3. 点击 `Invite member`，填写 work email 和角色：
   - Manager
   - Preparer
   - Coordinator
4. 邀请会发送 7-day magic link。
5. 在 active members 表中：
   - 修改非 Owner、非当前用户的角色。
   - Suspend access 或 Reactivate access。
   - Remove from firm。
6. 在 pending invitations 表中：
   - Resend invitation。
   - Cancel invitation。
7. 如果 seat limit reached，先升级计划或 suspend 成员释放席位。

**关联模块**

- Billing：席位上限来自 plan。
- Audit：成员生命周期事件写 audit。
- Auth：角色定义在 `08-auth-identity.md`。
- Obligations：成员可作为客户/义务负责人。

### Billing

**模块功能**

Billing 页面展示当前 firm 的订阅状态、plan、seat limit、billing role、计划选项和支付模型。Solo、Pro、Team 是 self-serve checkout 计划；Enterprise（内部 `firm` 枚举）是 sales-assisted。支付方式和发票由支付 provider 管理。

**适用用户**

- Owner：可打开 billing portal、启动 plan checkout。
- Manager：可读 billing 状态。
- Preparer、Coordinator：当前业务权限不包含 billing read/update。

**如何使用**

1. 从 sidebar 点击 `Billing`。
2. 查看 `Subscription overview`：
   - Active firm
   - Plan
   - Seat limit
   - Subscription status
   - Billing role
3. Owner 且已有 active subscription 时，点击 `Manage billing` 打开 provider portal。
4. Owner 可在 plan options 中选择 Solo、Pro 或 Team 自助 checkout。
5. Checkout success 页面会等待 webhook 确认后显示激活状态。
6. 需要 Enterprise annual agreement 或多 practice/offices 时，当前页面显示 contact sales 状态，不是自助购买入口。

**关联模块**

- Members：seat limit 影响邀请。
- Team Workload：Pro、Team 和 Enterprise 解锁。
- Auth billing plugin：`08-auth-identity.md`

### Practice profile

**模块功能**

Practice profile 管理当前 practice 的名称、timezone 和 internal deadline policy，并提供删除当前 practice 的操作。Internal deadline policy 定义工作队列显示的 due date 要比 statutory base deadline 提前多少天；该配置只作用于当前工作区，历史审计记录会保留。

**适用用户**

- 具备当前 practice 访问权的用户可查看当前 practice 摘要。
- Owner 可修改 practice name、timezone、internal deadline offset，并可删除当前 practice。
- Manager、Preparer、Coordinator 不具备当前 server 写权限，保存或删除会被拒绝。

**如何使用**

1. 从 sidebar 点击 `Practice profile`，进入 `/practice`。
2. 在 `General` 中修改 practice name、timezone 和 internal deadline offset。
3. 点击 `Save changes`。
4. Owner 如需删除当前 practice，点击 `Delete practice`，确认后该 practice 会从 picker 中移除。
5. 删除后该 practice 会从日常视图和切换器中移除，审计历史保留；如果还有其他 practice，会跳转到下一个可用 practice，否则进入 onboarding。

**关联模块**

- Practice switcher：显示当前 practice 名称、plan、role、seat limit。
- Auth / 工作区：`08-auth-identity.md`
- Audit：敏感变更应保留审计上下文。

### Marketing site

**模块功能**

Marketing site 是公开营销站，介绍 DueDateHQ 的定位、价格、规则覆盖、州覆盖、guides 和 CTA。它与事务所操作台分离，面向访客、潜在客户和销售/市场材料。

**适用用户**

- 公开访客。
- 销售、市场、产品和投资人沟通场景。
- 不需要登录。

**如何使用**

1. 打开 marketing 站首页了解产品价值。
2. 使用 pricing 页面了解 Solo、Pro、Team、Enterprise 的定位。
3. 使用 rules、state coverage、state detail、guides 页面查看公开覆盖说明。
4. 通过 CTA 进入 app 登录或联系流程。
5. 可切换中英文页面。

**关联模块**

- Marketing app：`03-marketing-site.md`
- i18n：`12-i18n.md`
- App 登录：登录后进入 `apps/app`。

## 常见使用路径

### 路径 1：首次导入客户并生成工作台

1. 使用 Google 登录。
2. 创建或激活 firm。
3. 在 Dashboard 或 Clients 点击 `Run migration` / `Import clients`。
4. 完成 Migration Copilot 四步：Intake、Mapping、Normalize、Dry-run。
5. 点击 `Import & Generate`。
6. 返回 Dashboard 查看 Penalty Radar、Focus rank 和 Priority list。
7. 进入 Obligations 处理生成的 obligations。

### 路径 2：每周风险巡检

1. 周一打开 Dashboard。
2. 查看 Penalty Radar 和带有 Next check 的 Priority list。
3. 点击 `Open full Obligations`。
4. 在 Obligations 使用 `This week`、`Needs input`、`Needs evidence` 筛选。
5. 按负责人、状态、风险金额和 days 排序。
6. 批量修改 status、readiness 或 assignee。
7. 对关键义务打开 Evidence drawer，确认来源。

### 路径 3：处理政府来源变更

1. 打开 Rules > Pulse Changes。
2. 筛选 active changes。
3. 点击 `Review` 打开 Pulse detail。
4. 检查 confidence、source URL、structured fields 和 affected clients。
5. 对 needs review 客户确认选择。
6. Owner/Manager 可点击 apply、dismiss 或 snooze。
7. 如应用错误，在 24 小时窗口内执行 undo。
8. 在 Audit log 中查看对应 Pulse 决策。

### 路径 4：导出审计证据

1. 打开 Audit log。
2. 用 range、category、action、actor、entity type 过滤事件。
3. 点击事件查看详情。
4. Owner 点击 `Export`。
5. 请求 evidence package。
6. 待 package ready 后下载 ZIP。

### 路径 5：邀请团队成员并升级席位

1. Owner 打开 Members。
2. 查看 seats used 和 available seats。
3. 如果 seat limit reached，打开 Billing 升级或暂停成员。
4. 点击 `Invite member`。
5. 输入 work email，选择 Manager、Preparer 或 Coordinator。
6. 发送 7-day magic link。
7. 在 Pending invitations 中 resend 或 cancel。

## 技术模块使用指南

### 00-overview.md

**模块功能**

项目总览，解释产品定位、项目结构、功能全景、创新点、系统架构、业务主流程、模块依赖原则、数据模型和当前实现状态。

**适用读者**

新加入研发、产品负责人、架构评审者、技术 PM、需要快速理解全局的内部成员。

**如何使用**

1. 首先阅读项目定位和功能全景，建立产品语境。
2. 通过系统架构图理解 app、server、contracts、db、auth、core、ai、ingest 的关系。
3. 通过业务主流程理解 Migration 和 Pulse 的端到端数据流。
4. 在做跨模块改动前检查模块依赖原则。

### 01-app-spa.md

**模块功能**

说明 `apps/app` React SPA 的路由、数据加载、应用 shell、Dashboard、Obligations、Migration、Pulse、Audit、Rules、Members、Billing 等用户界面。

**适用读者**

前端研发、全栈研发、产品设计、QA、需要理解用户可见行为的评审者。

**如何使用**

1. 从关键路径理解登录、onboarding 和 protected shell。
2. 对照 `apps/app/src/router.tsx` 查看路由入口。
3. 修改业务页面时优先在 `apps/app/src/features/<vertical>/` 下定位代码。
4. UI 改动后检查 Lingui 文案、TanStack Query 缓存和 URL state。

### 02-server-worker.md

**模块功能**

说明 `apps/server` Cloudflare Worker API，包含 Hono、oRPC、Better Auth、tenant middleware、queue、scheduled job、email webhook 和 ops routes。

**适用读者**

后端研发、全栈研发、DevOps、负责 API 权限、队列和部署的人。

**如何使用**

1. 从 middleware 和 procedure 了解 session、tenant、role enforcement。
2. 对照 `apps/server/src/procedures` 找业务 API。
3. 对照 `apps/server/src/jobs` 找 scheduled、queue、email 和 Pulse job。
4. 修改权限或写操作时确认 audit 写入和工作区隔离。

### 03-marketing-site.md

**模块功能**

说明 `apps/marketing` Astro 静态营销站，包含 landing、pricing、rules、state coverage、guides、SEO 和结构化数据。

**适用读者**

前端研发、增长/市场、产品、需要维护公开页面的人。

**如何使用**

1. 对照 `apps/marketing/src/pages` 找页面入口。
2. 对照 `apps/marketing/src/components` 找页面组件。
3. 修改公开文案时同步中英文 i18n 资源。
4. 确认 CTA 指向 app 登录或正确转化路径。

### 04-ui-design-system.md

**模块功能**

说明 `packages/ui` 的 UI primitives、Tailwind v4 token、主题、sidebar 和组件使用约束。

**适用读者**

前端研发、设计系统维护者、产品设计、QA。

**如何使用**

1. 先读设计 token 流和主题应用流程。
2. 开发业务 UI 时优先使用 `@duedatehq/ui/components/ui/*`。
3. 不在业务页面随意重写 token、圆角、阴影和主题色。
4. UI 变更需要核对 `docs/Design/DueDateHQ-DESIGN.md` 是否需要同步。

### 05-core-domain.md

**模块功能**

说明 `packages/core` 的纯领域逻辑，包括日期、规则、罚金估算、CSV parser、默认矩阵、归一化、PII 等。

**适用读者**

领域逻辑研发、后端研发、测试、需要验证税务计算和导入行为的人。

**如何使用**

1. 在这里放不依赖 React、DB、HTTP、Worker runtime 的纯函数。
2. 修改规则、罚金或日期逻辑时补充旁路单元测试。
3. Server 和 app 只能调用公共 exports，不把基础设施逻辑带入 core。
4. 用 `pnpm test` 或针对性 Vitest 验证纯逻辑。

### 06-contracts.md

**模块功能**

说明 `packages/contracts` 的 Zod schema、oRPC contracts、共享枚举、错误码和输入输出类型。

**适用读者**

前后端研发、API 评审者、QA、需要确认接口形状的人。

**如何使用**

1. 新增或修改 API 前先改 contracts。
2. Server procedure 实现 contract，前端通过 oRPC client 使用 query/mutation options。
3. 修改输入输出时同步测试，并检查 app/server 类型错误。
4. 不把 server runtime 逻辑放进 contracts。

### 07-db-data-access.md

**模块功能**

说明 `packages/db` 的 Drizzle schema、D1 client、tenant-scoped repositories、migration、audit/evidence、Pulse、notifications 和 overlay 数据域。

**适用读者**

后端研发、数据模型负责人、架构评审者、需要排查数据隔离或 migration 的人。

**如何使用**

1. 新表或字段先看 schema 和 repo 是否有合适边界。
2. 业务 procedure 尽量通过 scoped repo 访问数据，不散落裸 SQL。
3. 修改工作区数据必须确认 `firmId` scope。
4. 本地 schema 变更用 Drizzle/D1 命令验证。

### 08-auth-identity.md

**模块功能**

说明 `packages/auth` 和 server auth wiring，包括 Better Auth、组织、成员、角色、权限矩阵、Stripe plugin 和 active firm。

**适用读者**

后端研发、全栈研发、安全评审者、产品权限负责人。

**如何使用**

1. 修改成员角色、权限或 seat 限制前先读本模块。
2. 对照 `packages/auth/src/permissions.ts` 和 `apps/server/src/procedures/_permissions.ts`。
3. UI 只能做 affordance，真正权限必须由 server procedure enforce。
4. 权限拒绝应 fail closed，并尽量写 auth denied audit。

### 09-ai-engine.md

**模块功能**

说明 `packages/ai` 的 AI Gateway、prompt task、结构化输出、PII redaction、guard、refusal 和 fallback。

**适用读者**

AI/后端研发、产品、合规评审、需要解释 AI 结果的人。

**如何使用**

1. 把 AI 当作结构化建议生成器，不直接写 DB。
2. Server 负责调用、校验、持久化和审计。
3. 修改 prompt 时同步 schema、guard、trace 和 fallback。
4. 确认 PII redaction 和 refusal 路径不会破坏用户流程。

### 10-ingest-pulse-sources.md

**模块功能**

说明 `packages/ingest` 的 Pulse source adapters、fetcher、robots/conditional fetch、HTML/RSS 解析和来源覆盖。

**适用读者**

后端研发、数据来源维护者、practice source review 维护者。

**如何使用**

1. 新增来源时按 adapter 结构接入。
2. 优先使用权威来源，记录 tier、cadence、health 和 acquisition method。
3. Source failure 不应静默污染 active practice rules 或 firm alerts。
4. 与 Pulse ingest metrics/runbooks 一起使用，排查 failed snapshots 和 degraded sources。

### 11-ports-boundaries.md

**模块功能**

说明 `packages/ports` 的边界接口，用于把领域服务和基础设施实现解耦。

**适用读者**

架构评审者、后端研发、测试、未来需要替换仓储/服务实现的人。

**如何使用**

1. 需要跨运行时或替换实现时先定义 port。
2. 让业务逻辑依赖接口，具体实现留在 server/db/worker 层。
3. 不为一次性调用过度抽象；只有真实边界才引入 port。
4. 测试中可用 port mock 降低基础设施依赖。

### 12-i18n.md

**模块功能**

说明 `packages/i18n` 与 app/marketing 多语言，包括 locale 常量、请求语言协商、Lingui catalog 和 strict compile。

**适用读者**

前端研发、市场站维护者、产品文案、QA。

**如何使用**

1. 用户可见文案走 Lingui 或对应 marketing i18n。
2. 新文案需要 extract 和 compile。
3. 严格编译应阻止缺失翻译和 catalog drift。
4. 服务端邮件或通知文案也要考虑 locale。

### 13-typescript-config-tooling.md

**模块功能**

说明 `packages/typescript-config`、workspace 脚本、配置继承、质量门和开发命令。

**适用读者**

所有研发、CI 维护者、需要排查 build/check/test 的人。

**如何使用**

1. 使用 Node `>=22.19.0` 和 pnpm。
2. 常用命令：`pnpm dev`、`pnpm build`、`pnpm test`、`pnpm check`、`pnpm ready`。
3. 文档或代码改动后选择合适质量门验证。
4. 改 TS config 或脚本时检查所有 workspace 影响。

## 维护约定

- 用户可见功能、权限、计划限制或路由变化时，同步更新本文。
- 新增 `docs/project-modules` 技术模块时，在本文“技术模块使用指南”补充对应条目。
- 如果实现与本文冲突，以代码和 contract 为准，并在同一变更中修正文档。
- 只改 UI 样式或视觉规范时，另行判断是否需要同步 `docs/Design/DueDateHQ-DESIGN.md`。
