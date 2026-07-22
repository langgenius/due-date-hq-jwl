# 03 · Data Model · 数据层设计

> 最后核对：2026-06-10
> 目标：一次设计**覆盖 Phase 0 + Phase 1**，避免 Team / Overlay / Readiness 上线时回头重构。
> 核心决策：**D1 + Drizzle + `scoped(db, firmId)` 工厂**；租户字段统一使用 `firmId`（= better-auth `organizationId`）。
> 相关 ADR：[`0016`](../adr/0016-cloudflare-first-single-worker-d1-platform.md) · [`0018`](../adr/0018-d1-tenant-isolation-scoped-repo-ports.md)

---

## 1. Schema 组织

```
packages/db/
├── src/
│   ├── schema/
│   │   ├── auth.ts              ← better-auth 托管（user / session / account / verification / two_factor
│   │   │                            / organization / member / invitation / rate_limit / subscription）
│   │   ├── firm.ts              ← firm_profile（业务租户表；PK = organization.id）
│   │   ├── clients.ts           ← client + client_filing_profile
│   │   ├── client-tax-year-profile.ts ← per-(client, tax year) 实体分类 override（0066）
│   │   ├── obligations.ts       ← instance + dependency + review_note
│   │   ├── obligation-saved-view.ts
│   │   ├── overlay.ts           ← exception_rule + obligation_exception_application
│   │   ├── rules.ts             ← rule_source_template / rule_template / practice_rule /
│   │   │                            practice_rule_review_task / rule_review_decision(legacy) /
│   │   │                            rule_catalog_release / rule_note
│   │   ├── migration.ts
│   │   ├── pulse.ts             ← pulse + source_snapshot/source_state + firm_alert /
│   │   │                            priority_review / application / alert_note / rule_source_drift_state
│   │   ├── social.ts            ← global X Alert outbox + ET-local daily publish ledger
│   │   ├── ai.ts                ← ai_output + llm_log + rule_concrete_draft
│   │   ├── ai-insights.ts       ← async cached client_risk_summary + deadline_tip
│   │   ├── dashboard.ts         ← dashboard_brief + user_dashboard_visit
│   │   ├── audit.ts             ← audit_event + evidence_link + audit_evidence_package
│   │   ├── notifications.ts     ← in_app + email_outbox + reminder(+template) + preference +
│   │   │                            digest_run + client_email_suppression（push_subscription 已随
│   │   │                            Phase 0 PWA 降级移除）
│   │   ├── readiness.ts         ← checklist item / suppression + client request / response
│   │   ├── calendar.ts          ← calendar_subscription（ICS feed）
│   │   └── mutation-lock.ts     ← D1-backed 短时 advisory lock（0058）
│   │                            （无 barrel index.ts；package.json 以 `./schema/*` 子路径导出）
│   ├── client.ts                ← drizzle(D1) factory
│   ├── scoped.ts                ← ★ 业务模块的唯一入口
│   ├── repo/                    ← per-domain scoped repo 实现
│   ├── audit-writer.ts
│   ├── evidence-writer.ts
│   ├── reminder-linkage.ts
│   └── types.ts
├── migrations/                   ← 手写 SQL 为主（0000–0025 由 drizzle-kit 生成），wrangler d1 apply；当前至 0082
```

**约束：**

- `apps/server/src/procedures/**` **不允许**直接 import `@duedatehq/db` 或 `@duedatehq/db/schema/*`；只能通过 `context.vars.scoped` / `context.vars.tenantContext` 访问运行时数据；类型边界使用 type-only `@duedatehq/ports/<domain>`，不使用 ports 根入口
- `scoped.ts` 的每个 repo 入口都必须硬编码 `WHERE firm_id = :firmId`，`firmId` 只能从 middleware 注入，不能从 procedure `input` 接收
- `schema/auth.ts`（better-auth 身份层 10 张表，含 Stripe plugin 的 `subscription` 与 `rate_limit`）**手工维护**：已在 `member` 表加 `(organization_id, user_id)` unique index、加 `member.status` 业务字段，并为 Members gateway 加 `invitation(organization_id,email,status)` 索引。不跑 `@better-auth/cli generate`（package.json 已无 `auth:schema` 脚本，避免误重跑覆盖这些约束）；后续 schema 变更一律「改 `schema/*.ts` + 手写 migration SQL」+ 人工 review（见 §6）
- `schema/firm.ts` 是业务租户层，`firm_profile.id` 通过 PK FK 挂到 `organization.id`
- 业务表统一用 `firm_id` 保持 DueDateHQ 术语（逻辑等同 `organization_id`）

---

## 2. 核心实体（按领域分组）

> 只列字段与约束；Drizzle 具体写法在 `packages/db/src/schema/*.ts`。不贴实现代码除非是**约束**。

### 2.1 better-auth 托管表

| 表             | 说明                                                                              | DueDateHQ 视角                                           |
| -------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `user`         | 全局唯一的人（邮箱唯一）                                                          | CPA 本人；含 `two_factor_enabled`                        |
| `session`      | 登录态                                                                            | 含 `activeOrganizationId`                                |
| `account`      | OAuth account                                                                     | Google OAuth 为主                                        |
| `verification` | 邮箱 / 邀请 token                                                                 | —                                                        |
| `two_factor`   | Better Auth TOTP secret + recovery codes                                          | MFA 设置记录                                             |
| `organization` | **Firm（租户）身份容器**；业务字段在 `firm_profile`（§2.1.b）                     | 仅 `id / name / slug / logo / metadata`（metadata 留空） |
| `member`       | **UserFirmMembership**；`role ∈ {owner, partner, manager, preparer, coordinator}` | —                                                        |
| `invitation`   | **TeamInvitation**                                                                | token + 14d 过期                                         |
| `subscription` | Better Auth Stripe plugin 订阅事实表                                              | `firm_profile.plan / billing_*` 只是缓存                 |
| `rate_limit`   | Better Auth rate limiting 存储                                                    | —                                                        |

`firmId`（业务表）严格 = `organization.id` = `firm_profile.id`（三层共用同一个 id；见 §2.1.b 与 ADR 0010）。

> **2026-04-24 修订**：`organization.metadata` 不再承载业务语义（plan / seatLimit / timezone / ownerUserId / status），这些字段已迁到独立的 `firm_profile` 表（见下一小节）。`organization.metadata` 当前不写、未来仅用于身份层附加属性。

**Global vs tenant-scoped 边界（约束）：**

| 类别            | 表                                                                                                                                                                                                                                                                           | `firm_id` 规则                                                                                       | 访问方式                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 租户业务数据    | `client` / `client_filing_profile` / `client_tax_year_profile` / `obligation_instance` / `migration_*` / `practice_rule*` / `pulse_firm_alert` / `audit_event` / `ai_output` / `llm_log` / `ai_insight_cache` / `dashboard_brief` / `email_outbox` / `obligation_saved_view` | `firm_id NOT NULL`                                                                                   | 只能经 `scoped(db, firmId)`                                                   |
| 全局规则/源资产 | `rule_source_template` / `rule_template` / `rule_catalog_release` / `pulse` / `pulse_source_snapshot` / `pulse_source_state` / `rule_source_drift_state` / `social_alert_post` / `social_publish_run` / `mutation_lock`                                                      | 不带 firm                                                                                            | 只读公开/ops 路径；业务读取经 `practice_rule` / `pulse_firm_alert` 等租户投影 |
| 混合 overlay    | `exception_rule`                                                                                                                                                                                                                                                             | `firm_id NOT NULL` 表示 practice temporary/custom exception；不再使用全局生产 exception 作为生效依据 | 经 `scoped` 按 practice 隔离                                                  |
| 应用记录        | `pulse_application` / `obligation_exception_application` / `evidence_link`                                                                                                                                                                                                   | `firm_id NOT NULL`（即使可由 parent join 推导，也冗余存储）                                          | 只能经 `scoped`                                                               |

任何可由用户直接打开详情页的记录，都必须能用自身 `firm_id` 或父实体 join 证明归属；不允许只靠前端传来的 id 查询。

### 2.1.b firm_profile（业务租户表）

> 来源：ADR [`0010-firm-profile-vs-organization.md`](../adr/0010-firm-profile-vs-organization.md)。
> Schema：`packages/db/src/schema/firm.ts`；migration `0001_tidy_shiva.sql`。

| 字段                            | 类型                                               | 备注                                                                                                                                           |
| ------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                            | `text PK · FK → organization.id ON DELETE CASCADE` | PK 复用 organization.id；删 org → 级联删 firm_profile                                                                                          |
| `name`                          | `text NOT NULL`                                    | 镜像 organization.name；P1 可分离 legal/display                                                                                                |
| `plan`                          | `text NOT NULL`（drizzle 默认 `'free'`）           | PRD §3.6.1；enum `free / solo / pro / team / firm` 在 drizzle schema + TS 层校验（见下）；`free` 为 funnel tier，`firm` 仍是 Enterprise 存储值 |
| `seat_limit`                    | `integer NOT NULL DEFAULT 1`                       | UI affordance；写时由 plan 决定（P1）                                                                                                          |
| `timezone`                      | `text NOT NULL DEFAULT 'America/New_York'`         | P0 ICP 假设（PRD §2.1）；P1 onboarding 让用户选                                                                                                |
| `internal_deadline_offset_days` | `integer NOT NULL DEFAULT 14`                      | Practice target-date 策略：新生成义务 `current_due_date = base_due_date - offset`（migration `0040`）                                          |
| `monitoring_start_date`         | `text NOT NULL DEFAULT date('now')`                | Practice 级监控起点；早于该日期的自动生成义务只作历史，不进活跃 deadline 队列（migration `0057`）                                              |
| `owner_user_id`                 | `text NOT NULL · FK → user.id ON DELETE RESTRICT`  | 删 user 前必须先转 owner 或软删 firm                                                                                                           |
| `status`                        | `text NOT NULL DEFAULT 'active'`                   | enum `active / suspended / deleted`（drizzle+TS 层）；tenantMiddleware 拒 non-active → `TENANT_SUSPENDED`                                      |
| `billing_customer_id`           | `text NULL`                                        | Stripe customer cache；Better Auth `subscription` / Stripe webhook 仍是事实来源                                                                |
| `billing_subscription_id`       | `text NULL`                                        | Stripe subscription cache；用于业务 plan/seat 快读，不替代 subscription 表                                                                     |
| `coordinator_can_see_dollars`   | `integer boolean NOT NULL DEFAULT false`           | RBAC：Coordinator 默认隐藏金额/exposure，Owner 显式开启                                                                                        |
| `smart_priority_profile_json`   | `text JSON NULL`                                   | Practice 级 Smart Priority 配置；NULL = `smart-priority-profile-v1` 默认权重和阈值                                                             |
| `created_at`                    | `integer (ms) NOT NULL`                            |                                                                                                                                                |
| `updated_at`                    | `integer (ms) NOT NULL`                            | drizzle `$onUpdate` 触发                                                                                                                       |
| `deleted_at`                    | `integer (ms) NULL`                                | PRD §3.6.8 软删 30d grace                                                                                                                      |

**与 `organization` 的关系**：

- `firmId == organization.id == firm_profile.id` —— 三个 id 永远同值（PK 复用）
- `organization` 仍由 better-auth 托管（身份层）；`firm_profile` 由我们写入（业务层）
- 业务表 `firm_id` FK 指向 `firm_profile.id`（语义清晰）；底层值与 `organization.id` 一致，老查询不需要改

**写入时机**：

1. **正常路径**：`apps/server/src/auth.ts` 注入的 `organizationHooks.afterCreateOrganization`（在 `apps/server/src/organization-hooks.ts` 工厂里），`organization.create` 完成后同请求 INSERT 一行 firm_profile
2. **自愈路径**：`apps/server/src/middleware/tenant.ts` 在缺失时 lazy create —— 读 `organization` 行 + 找 `member.role='owner'` 最早一条 → INSERT。代价：缺失场景的请求多 1 次 select + 1 次 insert，下次起回正常路径

前端不得直接使用 Better Auth organization lifecycle API。Onboarding、practice switcher、Practice profile 删除都必须走 DueDateHQ `firms.*` RPC gateway；gateway 内部再创建 Better Auth organization、写 `firm_profile`、切换或清空 `session.activeOrganizationId`，并确保 soft-deleted `firm_profile` 不会被重新设为 active firm。

**2026-04-28 multi-firm foundation**：

- `packages/db/src/repo/firms.ts` 是跨 firm 的只读/管理入口，用于 `listMine / getCurrent / switchActive / create / update / softDelete`。它只按 `userId + active member` 查询用户可访问 firm，不暴露任意 `firmId` 读取。
- 普通业务数据仍必须走 `scoped(db, firmId)`；firm 管理 repo 是身份/租户选择层的例外，不允许业务 procedure 用它读取 tenant-scoped rows。
- `organizationLimit` 已放开以支持一个用户属于多个 internal firm；这是 identity / tenant-selection foundation，不是 pricing entitlement。产品口径见 `docs/product-design/billing/01-practice-entitlement-pricing.md`：Solo / Pro / Team 默认只包含 1 个 active practice workspace，Enterprise plan（存储 enum 仍为 `firm`）才包含多个 practices / offices。`firms.create` 与 Better Auth `allowUserToCreateOrganization` 已按 owned active firm count enforce；Solo / Pro / Team 超限返回 `FIRM_LIMIT_EXCEEDED`，Enterprise plan 可创建多个 active practices。
- Seat usage 写时口径：`active members + pending non-expired invitations <= firm_profile.seat_limit`。`member.status='suspended'` 不占 seat，但 tenant middleware 会拒绝该成员访问业务 RPC。
- `firm_profile.status='deleted'` 是当前 firm 删除路径；不会调用 Better Auth hard delete，避免 `organization -> firm_profile -> business data` 级联物理删除。

**Pricing entitlement 口径（2026-05-02）**：

| Plan       | Active firm entitlement | Seat entitlement | Notes                                                                     |
| ---------- | ----------------------- | ---------------- | ------------------------------------------------------------------------- |
| Solo       | 1 active firm           | 1 owner seat     | $39/mo 单人生产计划；trial/demo workspace 与生产账单分开处理。            |
| Pro        | 1 active firm           | 3 seats          | $79/mo 小型事务所共享运营；额外 practice 进入 Enterprise plan。           |
| Team       | 1 active firm           | 10 seats         | $149/mo 较大运营团队；仍不包含多个 active practice workspace。            |
| Enterprise | contract-defined        | 10+ seats        | from $399/mo / custom；多办公室 / 多品牌 / API / SSO；存储值仍为 `firm`。 |

`active firm` 口径是 `firm_profile.status='active' AND deleted_at IS NULL`；soft-deleted firm 不计入 entitlement。Seat limit 仍是每个 active firm 内部的 member/invitation 限制，不替代 active firm count。

> **2026-06 补充**：plan enum 新增 `free` funnel tier（drizzle 默认值；小客户量跑全量 Pulse 的引导层，见 `schema/firm.ts` 注释），不在 self-serve 定价卡上；上表 entitlement 口径不变。enum 仅 TS/drizzle 层，无 DB CHECK，故无 migration。

**加列原则**：

- D1 加列零成本，按需 ALTER
- Billing 已接入 Better Auth Stripe plugin：`subscription` 表保存 Stripe 订阅事实，
  `firm_profile.plan / seat_limit / billing_*` 只作为 app 业务缓存，由 webhook callback 同步。
  业务代码不得直接把 checkout redirect 视为订阅成功。
- `defaultAssigneeUserId`（PRD §3.6.8）等 P1 字段同样不预占（`coordinatorCanSeeDollars` 已落地，见上表）

**关于 enum / CHECK**：

drizzle 的 `text({ enum: [...] })` **只在 TypeScript + drizzle 运行时层做 enum**
（编译期拒绝越界字面量；运行时 drizzle 不替你生成 `CHECK (...)`）。
D1 层当前**无 CHECK 约束** —— 生成的 migration SQL 里只有 `DEFAULT 'solo'` /
`DEFAULT 'active'`，没有 `CHECK (plan IN (...))`。

**为什么先这样**：

- SQLite 不支持 `ALTER TABLE ... ADD CONSTRAINT CHECK`；后加 CHECK 必须做
  "CREATE new + INSERT SELECT + DROP + RENAME" 的表重建迁移，对已承载数据的
  表成本过高。
- 写入路径 100% 经 TS 应用层（procedures + hooks），drizzle 已在编译期拦
  住越界；攻击面是"SQL 直接执行" / "未来新迁移脚本写错"等运维类风险。
- 验收这套约束的真实收益要等业务表实现后重新评估；届时把要求 CHECK 的表
  一起在一条重建迁移里补齐。

如果未来业务表真的需要 CHECK（例如状态机敏感的 `obligation.status`），用
drizzle 的 `check('<name>', sql\`...\`)` + 手写迁移。现阶段 schema 只保证
**drizzle-层 enum 安全**，不保证 **DB-层 CHECK**。

### 2.2 客户与义务

**clients**

Drizzle schema: `packages/db/src/schema/clients.ts`。Demo Sprint 子集已兑现 FU-1：`entity_type` 从 7 项扩为 8 项，新增 `individual`，与 Mapper target schema 保持一致。

| 字段                                                                                                 | 类型                                                                                                                                                                           | 备注                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                                                                 | `text PK`                                                                                                                                                                      | UUID v4                                                                                                                                               |
| `firm_id`                                                                                            | `text NOT NULL`                                                                                                                                                                | → `firm_profile.id`（值等同 `organization.id`）                                                                                                       |
| `name`                                                                                               | `text NOT NULL`                                                                                                                                                                |                                                                                                                                                       |
| `ein`                                                                                                | `text`                                                                                                                                                                         | `##-#######`；正则校验；允许 NULL                                                                                                                     |
| `state`                                                                                              | `text NULL`                                                                                                                                                                    | 兼容字段；镜像 primary filing profile 的 ISO 两位州码                                                                                                 |
| `county`                                                                                             | `text NULL`                                                                                                                                                                    | 兼容字段；镜像 primary filing profile 的主 county                                                                                                     |
| `entity_type`                                                                                        | `text NOT NULL` · enum `llc / s_corp / partnership / c_corp / sole_prop / trust / individual / other`（drizzle+TS 层校验，见 §2.1.b 关于 enum / CHECK）                        | FU-1 已兑现                                                                                                                                           |
| `legal_entity`                                                                                       | `text NULL` · enum `individual / sole_proprietorship / single_member_llc / multi_member_llc / partnership / corporation / trust / estate / nonprofit / foreign_entity / other` | legal form；不替代 tax classification                                                                                                                 |
| `tax_classification`                                                                                 | `text DEFAULT 'unknown'` · enum `individual / disregarded_entity / partnership / s_corp / c_corp / trust / estate / nonprofit / foreign_reporting_company / unknown`           | Federal filing path 事实；LLC 默认路径由这里决定                                                                                                      |
| `tax_year_type` / `fiscal_year_end_month` / `fiscal_year_end_day`                                    | `text DEFAULT 'calendar'` / `integer` / `integer`                                                                                                                              | Legacy/import default only；CPA-facing tax year profile now lives on each `obligation_instance` so one client can mix calendar and fiscal obligations |
| `external_client_id` / `address_line_1` / `city` / `postal_code` / `primary_phone` / `source_status` | `text NULL`                                                                                                                                                                    | Import source fields（migration `0047`）：外部系统 id + 地址/电话/来源状态镜像                                                                        |
| `owner_count`                                                                                        | `integer NULL`                                                                                                                                                                 | CPA workflow fact；区别于 legacy `equity_owner_count` penalty 输入                                                                                    |
| `has_foreign_accounts` / `has_payroll` / `has_sales_tax` / `has_1099_vendors` / `has_k1_activity`    | `integer boolean DEFAULT false`                                                                                                                                                | 用于生成 high-risk / payroll / information / K-1 workflow                                                                                             |
| `primary_contact_name` / `primary_contact_email`                                                     | `text NULL`                                                                                                                                                                    | Client action / 8879 / payment instruction 联系人                                                                                                     |
| `importance_weight`                                                                                  | `integer DEFAULT 2` · app enum `1 / 2 / 3`                                                                                                                                     | Smart Priority 输入；1=low，2=medium，3=high                                                                                                          |
| `late_filing_count_last_12mo`                                                                        | `integer DEFAULT 0`                                                                                                                                                            | Smart Priority 输入；非负整数                                                                                                                         |
| `equity_owner_count`                                                                                 | `integer`                                                                                                                                                                      | Penalty per-owner / per-partner 输入                                                                                                                  |
| `estimated_tax_liability_cents`                                                                      | `integer`                                                                                                                                                                      | PRD §8.1；Deadline Radar 精算输入（可选）                                                                                                             |
| `estimated_tax_liability_source`                                                                     | `text NULL` · enum `manual / imported / demo_seed`                                                                                                                             | 禁止 AI 编造金额；记录金额来源                                                                                                                        |
| `assignee_id` / `assignee_name`                                                                      | `text → user.id` / `text NULL`                                                                                                                                                 | 成员绑定 + denormalized 显示名（历史 free-text 导入无成员匹配时仍可用）                                                                               |
| `email` / `notes`                                                                                    | `text`                                                                                                                                                                         |                                                                                                                                                       |
| `migration_batch_id`                                                                                 | `text`                                                                                                                                                                         | Revert 级联                                                                                                                                           |
| `is_sample`                                                                                          | `integer boolean NOT NULL DEFAULT false`                                                                                                                                       | Onboarding "Load sample data" 标记：不计入 clientLimit，一键清除级联 obligations / filing profiles（migration `0072`）                                |
| `created_at` / `updated_at` / `deleted_at`                                                           | `integer (ms)`                                                                                                                                                                 | 软删                                                                                                                                                  |

`client.state` / `client.county` 不再是规则生成和 Pulse 匹配的事实来源。它们只作为
legacy display / import compatibility mirror，由 primary active filing profile 写回；没有州事实的
客户允许 `state=NULL` 并在 Clients UI 显示 `Needs facts`。

**client_filing_profile**

Drizzle schema: `packages/db/src/schema/clients.ts`；migration
`0031_client_filing_profiles.sql`。每个客户可有多个 active filing state profile，同一客户同一州
最多一个 active profile，且最多一个 active primary profile。

| 字段                                               | 类型                                     | 备注                                                                              |
| -------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `id` / `firm_id` / `client_id`                     | `text`                                   | tenant-scoped；`client_id` → `client.id`                                          |
| `state`                                            | `text NOT NULL`                          | ISO 两位州码；联邦不是 profile，联邦义务用 `jurisdiction='FED'`                   |
| `counties_json`                                    | `text JSON string[] NOT NULL DEFAULT []` | Pulse county 匹配和 UI 列表；同州多 county 放同一个 profile                       |
| `tax_types_json`                                   | `text JSON string[] NOT NULL DEFAULT []` | 州级 tax type 归属；缺失时按 `entity × state` matrix / active practice rules 推断 |
| `is_primary`                                       | `integer boolean DEFAULT false`          | primary profile 写回 `client.state/county` 兼容字段                               |
| `source ∈ (manual, imported, demo_seed, backfill)` | `text NOT NULL DEFAULT 'manual'`         | UI 显示来源与 review 状态                                                         |
| `migration_batch_id`                               | `text NULL`                              | 导入 revert / single undo 一并删除 profile                                        |
| `archived_at`                                      | `integer (ms) NULL`                      | 移除州时 archive，不物理删除历史义务                                              |
| `created_at` / `updated_at`                        | `integer (ms)`                           |                                                                                   |

Backfill 规则：现有 `client.state IS NOT NULL` 的客户创建一个 primary `backfill`
profile；没有 state 的客户保持空 profile，Clients readiness 标记为 needs facts。
`client.tax_types` 不再作为跨州事实；显式 tax type 只补充匹配州 profile，缺失的州级
tax type 由 Default Matrix / active practice rules 按州推断。

**client_tax_year_profile**

Drizzle schema: `packages/db/src/schema/client-tax-year-profile.ts`；migration
`0066_client_tax_year_profile.sql`。per-(client, tax year) 实体分类 override：scalar
`client.entity_type / tax_classification` 仍是当前/默认指针；某税年存在行即覆盖该年分类
（C→S election 等 reclassification 保留历史准确，逐年 obligation 生成按年解析）；无行 = 用
scalar，空表即现状，无需 backfill。`UNIQUE(client_id, tax_year)`；`source ∈ (manual,
reclassification, backfill)`。

**规则资产（Rules 治理三层，migration `0033_practice_rule_governance.sql` 起）**

> 原设计的全局 `obligation_rule / rule_source / rule_chunk` 三表**未建**：规则资产以
> `ObligationRule` JSON（`packages/core/src/rules`，含 due_date_logic / extension_policy /
> penalty 证据 / `status ∈ (candidate, verified, deprecated)` / `rule_tier` / `risk_level` /
> `coverage_status` / checklist 等原 obligation_rule 字段）存于 catalog/practice 行的
> `rule_json`。Drizzle schema: `packages/db/src/schema/rules.ts`。

| 表                          | 备注                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rule_source_template`      | 全局 source registry 行：jurisdiction / url / source_type / acquisition_method / cadence / health_status / is_early_warning；产品提供，非生产批准                                                             |
| `rule_template`             | 全局规则 catalog 行：`(jurisdiction, version, status ∈ available/deprecated, rule_json, source_ids_json)`                                                                                                     |
| `practice_rule`             | ★ 唯一生产 runtime 规则来源；firm-scoped，`status ∈ (pending_review, active, rejected, archived)`，`UNIQUE(firm_id, rule_id)`；practice review 后才进入 obligation/reminder 写路径                            |
| `practice_rule_review_task` | firm-scoped review 队列：`status ∈ (open, accepted, rejected, superseded)`、`reason ∈ (new_template, source_changed, pulse_signal, custom_edit, annual_review)`、`UNIQUE(firm_id, rule_id, template_version)` |
| `rule_review_decision`      | legacy firm-scoped candidate 决策（migration `0027`）；新代码只写 practice_rule\*，保留仅为老数据可读                                                                                                         |
| `rule_catalog_release`      | 平台级 filing-year cohort 发布标记：`UNIQUE(filing_year)` 是 catalog-sync 幂等键，驱动 in-app "new catalog" banner（migration `0073`）                                                                        |
| `rule_note`                 | firm-scoped 规则团队备注，flat thread（`parent_note_id` 自引用，author `ON DELETE restrict`）；镜像 `pulse_alert_note`（migration `0075`）                                                                    |

注：`0048` 曾建 `rule_registry_reconcile_run` / `rule_registry_change_proposal`，已在 `0051` 删除。

**obligation_instance**

Drizzle schema: `packages/db/src/schema/obligations.ts`。`rule_id / rule_version / rule_period` 为 plain text（无 FK），指向 practice rule 资产 id；Migration/manual 行可为 NULL。

| 字段                                                                                                                   | 备注                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id` / `firm_id` / `client_id` / `client_filing_profile_id` / `rule_id` / `rule_version`                               | `client_filing_profile_id` nullable；联邦和 legacy/manual rows 可为 NULL；写入时 repo 校验 client/profile 同 firm                                                                                                   |
| `tax_year` / `tax_year_type` / `fiscal_year_end_month` / `fiscal_year_end_day` / `rule_period` / `generation_source`   | Tax year profile is per obligation；Readiness tab 允许 CPA 把单个 obligation 调整为 calendar/fiscal；`generation_source ∈ (migration, manual, annual_rollover, pulse)`                                              |
| `tax_period_start` / `tax_period_end` / `tax_period_kind` / `tax_period_source` / `tax_period_review_reason`           | CPA-facing return/reporting period that the authority deadline is based on；obligation-level fiscal year end 直接确定 period，不写 review reason；缺 fiscal year end 的 fiscal obligation 留在 Readiness 校正路径   |
| `jurisdiction`                                                                                                         | `FED` 或州码；Dashboard / Obligations / Calendar / Readiness / deadline readiness / Pulse 都读 obligation jurisdiction，而不是 `client.state`                                                                       |
| `original_due_date`                                                                                                    | 规则生成时的原始日期，**永不变**                                                                                                                                                                                    |
| `base_due_date`                                                                                                        | statutory/base rule 最新计算值；用于派生 practice internal deadline，不直接作为主 UI work due date                                                                                                                  |
| `current_due_date`                                                                                                     | 当前 practice internal deadline；默认按 `base_due_date - firm_profile.internal_deadline_offset_days` 写入，主 UI / reminders / sorting 读取                                                                         |
| `obligation_type ∈ (filing, payment, deposit, information, client_action, internal_review)`                            | workflow taxonomy；不要继续膨胀 high-level `status`                                                                                                                                                                 |
| `form_name` / `authority` / `source_evidence_json` / `recurrence` / `risk_level`                                       | source-backed rule metadata copied onto the generated instance                                                                                                                                                      |
| `filing_due_date` / `payment_due_date`                                                                                 | 税务机关规则来源中的 Filing Deadline / Payment Deadline 分层；extension 不改变 payment due date，Obligation detail 必须显式展示                                                                                     |
| `status ∈ (pending, in_progress, done, extended, paid, waiting_on_client, review, not_applicable, blocked, completed)` | `done` 保留既有 filed/done wire value；UI 显示为 Filed；`done/extended/paid/not_applicable` 是 closed；`blocked / completed` 为 lifecycle v2 增项（migration `0039` 起，`?lifecycle=v2` flag）                      |
| `confirmed`                                                                                                            | annual-rollover 生命周期闸门：rollover / auto-projected / pulse 生成的下一年 deadline 写 `confirmed=false`，进 dashboard/calendar 但不进 reminder 管道，CPA 确认后放行；其他创建路径默认 `true`（migration `0063`） |
| `blocked_by_obligation_instance_id`                                                                                    | `status='blocked'` 时记录上游阻塞 obligation（K-1 依赖图）；soft self-ref 无 FK；状态离开 blocked 自动清空（migration `0039`）                                                                                      |
| `superseded_at` / `superseded_reason` / `superseded_by_audit_id`                                                       | reclassify 后不再适用的 rule-backed 义务软归档（不物理删，保留 workflow 状态可逆）；NULL = active；audit id 为 soft pointer 无 FK（migration `0065`）                                                               |
| `readiness ∈ (ready, waiting, needs_review)`                                                                           | 非持久派生状态；closed status → ready；优先由内部 document checklist 派生（`needs_review` > `missing` > all `received`），无内部清单时才 fallback 到最新 Readiness Portal response / obligation status              |
| `extension_decision ∈ (not_considered, applied, rejected)`                                                             | Obligations detail 的内部延期计划状态；当前 UI 保存即写 `applied`，`rejected` 仅保留历史兼容；`applied` 可把 obligation status 标记为 `extended`                                                                    |
| `extension_memo` / `extension_source` / `extension_expected_due_date`                                                  | 内部说明、来源和内部 extension target date；内部日期不得晚于 official filing deadline；不会修改 `current_due_date`，也不表示已向税务机关 filing                                                                     |
| `extension_decided_at` / `extension_decided_by_user_id`                                                                | 决策时间和操作者                                                                                                                                                                                                    |
| `extension_state` / `extension_form_name` / `extension_filed_at` / `extension_accepted_at`                             | 结构化 extension workflow；Form 4868 / 7004 / 8868 证据独立追踪                                                                                                                                                     |
| `prep_stage` / `review_stage` / `reviewer_user_id` / `review_completed_at`                                             | prep/review 子状态；partner/manager final review 不再塞进单一 status                                                                                                                                                |
| `payment_state` / `payment_confirmed_at`                                                                               | payment approval/schedule/confirmation 子状态；估算金额计算仍不在本产品范围                                                                                                                                         |
| `efile_state` / `efile_authorization_form` / `efile_submitted_at` / `efile_accepted_at` / `efile_rejected_at`          | e-file evidence tracking only；不接 IRS e-file transmitter                                                                                                                                                          |
| `estimated_tax_due_cents` / `estimated_exposure_cents`                                                                 | Deadline Radar 90-day legacy penalty estimate 预聚合；缺输入时 legacy penalty estimate 为 NULL                                                                                                                      |
| `exposure_status ∈ (ready, needs_input, unsupported)`                                                                  | Dashboard / Obligations projected-risk triage badge                                                                                                                                                                 |
| `penalty_facts_json` / `penalty_facts_version`                                                                         | versioned obligation-level penalty facts；import/backfill 可由 legacy client inputs 预填，公式只读 facts                                                                                                            |
| `penalty_breakdown_json` / `penalty_formula_version` / `exposure_calculated_at`                                        | legacy penalty estimate 的可解释公式、版本和重算时间；accrued penalty 不落库，按 `asOfDate` + statutory payment/filing/base date 运行时派生                                                                         |
| `missing_penalty_facts_json` / `penalty_source_refs_json` / `penalty_formula_label`                                    | `needs_input` 缺失事实、官方来源和公式标签；coordinator dollar-hidden role 下随金额一起隐藏                                                                                                                         |
| `assignee_id` / `snoozed_until`                                                                                        | obligation 级 assignee **覆盖** client 级 `client.assignee_id`（NULL = 继承默认）；snooze 在到期前把该 deadline 移出默认队列 / needs-attention 条（migration `0069_obligation_assignee_snooze`）                    |
| `migration_batch_id`                                                                                                   |                                                                                                                                                                                                                     |
| `created_at` / `updated_at`                                                                                            |                                                                                                                                                                                                                     |

Generated obligation 去重键包含 jurisdiction：
`firm_id + client_id + jurisdiction + rule_id + tax_year + rule_period`（partial unique index
`uq_oi_generated_rule_period`，`0065` 起谓词追加 `superseded_at IS NULL`，superseded 行不挡重新生成）。规则生成对每个 active
filing profile 生成州级义务；联邦义务按 `FED + ruleId + taxYear + period + taxType` 去重，只生成一次。
删除/移除 filing state 不物理删除既有义务；profile archive 后不再参与新生成和 Pulse 匹配，历史
obligation 仍可手动标记 `not_applicable`。

**obligation_dependency**

K-1 / source document / payment / review dependency graph. First use case: upstream entity return
or K-1 delivery blocks downstream 1040 / 1041 / 1120 workflow.

| 字段                                                       | 备注                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| `id` / `firm_id`                                           | tenant-scoped                                        |
| `upstream_obligation_id` / `downstream_obligation_id`      | both FK → `obligation_instance.id`                   |
| `dependency_type ∈ (k1, source_document, payment, review)` | dependency class                                     |
| `status ∈ (blocking, satisfied, waived)`                   | downstream queue uses this to show blocked/unblocked |
| `source_note` / `created_at` / `updated_at`                | audit-friendly operator context                      |

**obligation_review_note**

Structured reviewer notes and blocking issues for prep/review workflow.

| 字段                                                           | 备注                                  |
| -------------------------------------------------------------- | ------------------------------------- |
| `id` / `firm_id` / `obligation_instance_id` / `author_user_id` | tenant-scoped note ownership          |
| `note_type ∈ (review_note, blocking_issue, override)`          | review lane / blocker / override      |
| `body` / `resolved_at` / `created_at` / `updated_at`           | open notes have `resolved_at IS NULL` |

**obligation_readiness_checklist_item**

Internal CPA-facing document checklist for one obligation. Generated and reconciled
deterministically from a versioned template catalog keyed by `tax_type` / `form_name` /
`obligation_type` / entity and jurisdiction context, then editable by the CPA. This table is the
primary readiness source for open obligations; reconciliation appends missing unsuppressed template
items while preserving CPA status, notes, received timestamps, and edited copy.

| 字段                                                                                       | 备注                                                                                                                 |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `id` / `firm_id` / `obligation_instance_id`                                                | tenant-scoped；repo 通过 obligation 同 firm 校验                                                                     |
| `label` / `description`                                                                    | CPA-visible document requirement                                                                                     |
| `template_key` / `template_version`                                                        | stable catalog identity for template reconciliation                                                                  |
| `source ∈ (template, custom)`                                                              | deterministic template item vs manually added item                                                                   |
| `origin ∈ (ai, manual)` / `ai_generated_at` / `user_edited_at`                             | AI provenance 轴（与 `source` 正交）；默认 `manual`，CPA 编辑即降为 manual + 写 `user_edited_at`（migration `0055`） |
| `status ∈ (missing, received, needs_review, waived)`                                       | readiness derivation input；`received` 勾选时写 `received_at/by`；`waived` = CPA 标记当年不适用                      |
| `sort_order` / `note`                                                                      | stable display order and internal CPA note                                                                           |
| `received_at` / `received_by_user_id` / `created_by_user_id` / `created_at` / `updated_at` | audit-friendly metadata                                                                                              |

**obligation_readiness_template_item_suppression**

One row per CPA-deleted template checklist item. Reconciliation reads this tombstone table so a
template item intentionally removed from an obligation is not automatically added back.

| 字段                                        | 备注                                                       |
| ------------------------------------------- | ---------------------------------------------------------- |
| `id` / `firm_id` / `obligation_instance_id` | tenant-scoped；cascade with obligation                     |
| `template_key` / `template_version`         | suppressed template item identity                          |
| `suppressed_by_user_id` / `created_at`      | who removed it and when; user may be null after user purge |

**exception_rule**（Overlay Engine）

Drizzle schema: `packages/db/src/schema/overlay.ts`。Migration
`0012_powerful_sinister_six.sql` starts the Pulse-backed due-date overlay path.

| 字段                                                                           | 备注                                                                              |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `id` / `firm_id` / `source_pulse_id`                                           | `firm_id` 必须指向当前 practice；来源 Pulse 可 NULL                               |
| `jurisdiction` / `counties[]` / `affected_forms[]` / `affected_entity_types[]` | JSON                                                                              |
| `override_type ∈ (extend_due_date, waive_penalty)`                             |                                                                                   |
| `override_value_json` / `override_due_date`                                    | JSON 保持 contract 可扩展；`override_due_date` 给 D1 read model 一个 typed 快读值 |
| `effective_from` / `effective_until`                                           |                                                                                   |
| `status ∈ (candidate, verified, applied, retracted, superseded)`               |                                                                                   |
| `source_url` / `verbatim_quote`                                                |                                                                                   |

**obligation_exception_application**（多对多）

| 字段                                           |                                                 |
| ---------------------------------------------- | ----------------------------------------------- |
| `id` / `firm_id`                               |                                                 |
| `obligation_instance_id` / `exception_rule_id` | Unique active anchor per obligation + exception |
| `applied_at` / `applied_by_user_id`            |                                                 |
| `reverted_at` / `reverted_by_user_id`          |                                                 |

Pulse apply writes one source-backed `exception_rule` plus one
`obligation_exception_application` per selected obligation. Obligations, Dashboard, and obligation
detail reads overlay active exception applications on top of obligation base rows; revert expires the
application rows and retracts the source-backed exception rule.

**client_readiness_request**

Drizzle schema: `packages/db/src/schema/readiness.ts`。

| 字段                                                                       | 备注                                                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `id` / `firm_id` / `client_id` / `obligation_instance_id`                  | tenant-scoped；repo 通过 obligation/client 同 firm 校验                                |
| `checklist_json`                                                           | 从当前内部 document checklist 映射出的客户可见 JSON；不得包含 EIN/邮箱/金额/内部备注等 |
| `recipient_email` / `token_hash` / `expires_at`                            | 公开 portal 只存 hash，HMAC token 默认 14 天过期                                       |
| `status ∈ (sent, opened, responded, revoked, expired)`                     | portal 生命周期（revoke/expire 只表达在 status，无独立时间戳列）                       |
| `sent_at` / `first_opened_at` / `last_responded_at` / `created_by_user_id` | 审计和运营追踪                                                                         |
| `created_at` / `updated_at`                                                |                                                                                        |

**client_readiness_response**

| 字段                                                       | 备注                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `id` / `firm_id` / `request_id` / `obligation_instance_id` | response 永远挂回 request 和 obligation                             |
| `item_id` / `status ∈ (ready, not_yet, need_help)`         | 客户逐项响应                                                        |
| `note` / `eta_date`                                        | 客户备注和预计补齐时间                                              |
| `created_at`                                               | 匿名化 IP/UA 不落本表，只进 `audit_event.ip_hash / user_agent_hash` |

公开 `/api/readiness/:token` GET/POST 只返回客户安全字段，不暴露 EIN、金额、内部 notes、
member id 或 raw audit JSON。POST 响应会写 `readiness.client_response` audit、
`readiness_client_response` evidence，并把客户逐项状态同步回同一份内部 document checklist
（`ready → received`、`not_yet → missing`、`need_help → needs_review`）。Obligation queue /
detail 读取时优先从内部 checklist 派生 `ready | waiting | needs_review`，无内部清单才用 legacy
portal response 和 obligation status fallback；不再写入 obligation 行。

### 2.3 Pulse 链路

**pulse**

| 字段                                                                                                                                                                                              | 备注                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id` / `source` / `source_url` / `raw_r2_key`                                                                                                                                                     | 原文存 R2                                                                                                                                                                        |
| `published_at`                                                                                                                                                                                    |                                                                                                                                                                                  |
| `change_kind ∈ (deadline_shift, filing_requirement, applicability_scope, form_instruction, source_status, rule_source_drift, new_obligation, protective_claim_window, threshold_advisory, other)` | 变化类型；`threshold_advisory` / `rule_source_drift` 仅由确定性路径产生，AI extractor 被禁止 emit                                                                                |
| `action_mode ∈ (due_date_overlay, review_only)`                                                                                                                                                   | 只有 `due_date_overlay` 进 Apply 流；`review_only` 生成 CPA-facing Alert                                                                                                         |
| `ai_summary` / `verbatim_quote`                                                                                                                                                                   |                                                                                                                                                                                  |
| `parsed_jurisdiction` / `parsed_counties[]` / `parsed_forms[]` / `parsed_entity_types[]`                                                                                                          | JSON                                                                                                                                                                             |
| `parsed_original_due_date` / `parsed_new_due_date` / `parsed_effective_from` / `parsed_effective_until`                                                                                           |                                                                                                                                                                                  |
| `protective_action_deadline`                                                                                                                                                                      | `review_only` `protective_claim_window` 的行动截止；从 `structured_change_json.actionDeadline` 提升成列供 SQL 过期谓词/排序（migration `0069_pulse_protective_action_deadline`） |
| `affected_rule_ids_json` / `reverify_rule_ids_json`                                                                                                                                               | AI 猜测受影响规则 vs 确定性 source-cite join 需复核规则（migration `0061`）                                                                                                      |
| `structured_change_json`                                                                                                                                                                          | typed change payload                                                                                                                                                             |
| `dedupe_key`                                                                                                                                                                                      | AI 提取告警的规范去重键；plain UNIQUE（SQLite NULL 互不冲突），`INSERT … ON CONFLICT DO NOTHING` 关闭并发 check-then-insert 重复（migration `0064`）；确定性告警为 NULL          |
| `confidence`                                                                                                                                                                                      | 0–1                                                                                                                                                                              |
| `status ∈ (pending_review, approved, rejected, quarantined, source_revoked)`                                                                                                                      | 全局 source lifecycle；不得表达某 firm 是否已应用                                                                                                                                |
| `reviewed_by` / `reviewed_at` / `requires_human_review` / `is_sample`                                                                                                                             | 历史字段保留；firm 是否处理看 `pulse_firm_alert`                                                                                                                                 |

**pulse_firm_alert**

| 字段                                                                            | 备注                                                                                                                                                     |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id` / `pulse_id` / `firm_id`                                                   | firm 级 Feed / Banner 状态；`UNIQUE(firm_id, pulse_id)`                                                                                                  |
| `status ∈ (matched, dismissed, partially_applied, applied, reverted, reviewed)` | tenant-scoped；替代全局 `pulse.applied`；`snoozed` 状态与 `snoozed_until` 列已在 `0070_drop_pulse_snoozed.sql` 移除（决策只剩 apply / review / dismiss） |
| `matched_count` / `needs_review_count`                                          | Dashboard badge / drawer summary                                                                                                                         |
| `dismissed_by` / `dismissed_at`                                                 | CPA 级处理状态                                                                                                                                           |

**pulse_application**

| 字段                                                                   | 备注                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `id` / `pulse_id` / `obligation_instance_id` / `client_id` / `firm_id` | `UNIQUE(firm_id, pulse_id, obligation_instance_id)`                                   |
| `applied_by` / `applied_at` / `reverted_by` / `reverted_at`            |                                                                                       |
| `before_due_date` / `after_due_date`                                   | 审计必备；兼容 revert/audit 索引，实际 effective due date 由 overlay application 控制 |

`pulse_application` 是 obligation 级真实 Apply/Revert 记录；`pulse_firm_alert.status='applied'`
只能由该 firm 下全部选中 application 推导或事务内同步写入，不能回写到全局 `pulse.status`。

**pulse_priority_review**（migration `0035`）

| 字段                                                                                                        | 备注                          |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `id` / `firm_id` / `alert_id` / `pulse_id`                                                                  | `UNIQUE(firm_id, alert_id)`   |
| `status ∈ (open, reviewed, applied, dismissed)` / `priority_score` / `priority_reasons_json`                | firm 内告警优先级 review 队列 |
| `selected/confirmed/excluded_obligation_ids_json` / `note` / `requested_by` / `reviewed_by` / `reviewed_at` | 审阅选择集与决策人            |

**pulse_alert_note**（migration `0071`）

firm-scoped 告警团队备注：flat thread（`parent_note_id` 自引用，不强制嵌套），author
`ON DELETE restrict`（audit-grade 作者归属）；`rule_note`（`0075`）是其规则侧镜像。

**ingest 侧（全局，无 `firm_id`）：pulse_source_snapshot · pulse_source_state · rule_source_drift_state**

| 表                        | 备注                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pulse_source_snapshot`   | 每次抓取的内容快照：`UNIQUE(source_id, external_id, content_hash)`；`parse_status ∈ (pending_extract, extracting, extracted, duplicate, failed, ignored)`；raw 存 R2，`pulse_id / ai_output_id` 回链                                                                                                                   |
| `pulse_source_state`      | 每个 source 的调度/健康行（PK = `source_id`）：tier / cadence_ms / `health_status ∈ (healthy, degraded, failing, paused)` / next_check_at / consecutive_failures / etag / last_modified；监控基线 `monitoring_baseline_at` + `baseline_mode ∈ (establish_on_first_seen, active, backfill)`（migrations `0059`/`0060`） |
| `rule_source_drift_state` | durable "规则引用的官方 source 自上次 verify 后变了"：`UNIQUE(rule_id, source_id)`；pulse alert 是它的投影，rule accept/verify 闸门读它，人工 re-verify 才 `cleared_at`（migration `0061`）                                                                                                                            |

Pulse 不再有单独的 source-signal 表（`pulse_source_signal` 已在 `0056` 删除并折叠进
snapshot）。所有可监控变化都以 `pulse_source_snapshot` 进入 extract；非 applyable 变化生成
`action_mode='review_only'` 的 CPA-facing Alert。source registry 本身（state news URL、
temporary_announcements 多源、`{year}` token、WAF/browser 需求等）**不在 D1**，由
`rule_source_template` + 代码内 catalog 承载：详见 [`11-Pulse-Ingest-Source-Catalog.md`](./11-Pulse-Ingest-Source-Catalog.md)（2026-06-08）。

### 2.3.b Social Alert outbox（migration `0082`）

只有 `status='approved' AND is_sample=0` 且具备公开 source、scope 与日期事实的 Pulse 可以进入
Social candidate。共享 source policy 在数据库查询与发布前校验两层排除
`fema.declarations`、`govdelivery.inbound` 和 `govdelivery.inbound.unmatched`：这些 source 只
提供尚未完成税务归因的 early signal，不能确认 filing/deadline change，并要求 CPA 重新核验
规则；`rule_source_drift` 等内部 change kind 也会被排除。不能仅凭
`action_mode='review_only'` 排除，因为某些 filing requirement 或 applicability scope 变化仍是
适合公开介绍的真实 source 变化。

**social_alert_post** 是 X channel 的全局冻结文案，不带 `firm_id`：

| 字段                                                                              | 约束 / 语义                                                                      |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `id` / `channel='x'` / `pulse_id`                                                 | `UNIQUE(channel, pulse_id)`；同一 Pulse 永不重复建帖                             |
| `ref_token`                                                                       | 16–128 位 base64url-safe opaque token，global unique；不编码 Pulse / firm / user |
| `post_text` / `target_url` / `teaser` / `agency` / `jurisdiction` / `change_kind` | ready 时冻结的公开字段；teaser API 只返回其中三项                                |
| `status`                                                                          | `draft / ready / scheduled / published / unknown / cancelled`                    |
| `priority` / `ready_at`                                                           | 保留审核标签与批准时间；自动选取按关联 Pulse 的 `created_at DESC, id DESC`       |
| `approved_by` / `approved_at`                                                     | reviewer user FK；Social Ops approve 必须提供 reviewer                           |
| `x_post_id` / `published_at`                                                      | X 成功确认后写；`UNIQUE(channel, x_post_id)`                                     |

**social_publish_run** 是 ET 自然日发布槽位：

| 字段                                                 | 约束 / 语义                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `channel / local_date / post_id`                     | `UNIQUE(channel, local_date)` 是每天最多一条的数据库硬闸；live post 另有 partial unique 防止跨日重复 |
| `status`                                             | `draft_only / queued / sending / published / failed / unknown`                                       |
| `attempt_count / last_attempt_at / lease_expires_at` | Queue claim 与 redelivery 状态条件；remote create 已开始后不盲重试                                   |
| `response_http_status / failure_reason / x_post_id`  | 明确失败和模糊结果的对账证据；不保存 OAuth secret 或响应中的用户数据                                 |

`publish-now` 不增加第二种 ledger：它创建普通 `queued` run，或在 Post 已重新 approve 且
`channel / local_date / post_id` 全部相同时，将当天 `draft_only` 原位 CAS 为 `queued`。run claim、
Post 的 `ready -> scheduled` 以及 claim 失败补偿在同一个 D1 batch 中；任一并发 claimant 没有拿到
自己的 run 时都不能移动 Post。

每日自动补充 draft 不增加 schema 或未来预约 row。09:00 ET 分支用该自然日的精确 UTC 边界执行
`INSERT ... SELECT ... WHERE NOT EXISTS`，检查同 channel 当天是否已创建任意 Social Post；因此重复
Cron 同日最多补一条，而前几日仍待审核的 draft 不会阻止今天按 Pulse 新旧顺序补入更新 Alert。
一次性 `seed-drafts` 使用另一条原子条件插入，把当前仍符合 Social candidate 条件的 draft 数补到
目标值（默认 3），而不是每次额外追加目标数量；写入前先清理 runtime-invalid active row，写入后
重读同一 eligible queue projection，因此网络超时重试或并发请求既不能把 buffer 补过目标，也不会
让隐藏的失效 draft 占用可见 review buffer。

`ref_token` 不是授权凭证。匿名访问只能读取 published row 的冻结 teaser；登录后的
`pulse.resolveSocialAlert` 才能把 global Pulse materialize/resolve 为当前 firm 的
`pulse_firm_alert`。零匹配 row 允许创建以展示 Alert，但不触发邮件，也不产生其他 firm 的 id。

### 2.4 Migration

Drizzle schema: `packages/db/src/schema/migration.ts`。

**migration_batch**

| 字段                                                                   | 备注                                                                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id` / `firm_id` / `user_id`                                           |                                                                                                                                                        |
| `source ∈ (paste, csv, xlsx, preset_*)`                                | preset 枚举：taxdome / drake / karbon / quickbooks / file_in_time / cch_axcess / cch_prosystem_fx / lacerte / proseries / ultratax_cs / proconnect_tax |
| `raw_input_r2_key` + `raw_input_file_name / content_type / size_bytes` | 原始上传 R2 + 元数据；`paste` 不走 R2                                                                                                                  |
| `mapping_json` / `preset_used`                                         |                                                                                                                                                        |
| `row_count` / `success_count` / `skipped_count`                        |                                                                                                                                                        |
| `ai_global_confidence`                                                 |                                                                                                                                                        |
| `status ∈ (draft, mapping, reviewing, applied, reverted, failed)`      |                                                                                                                                                        |
| `applied_at` / `revert_expires_at` = `applied_at + 24h`                |                                                                                                                                                        |

**migration_mapping** · **migration_normalization** · **migration_error**

- `mapping.confidence` / `reasoning` / `user_overridden` / `model` / `prompt_version`
- `normalization.field / raw_value / normalized_value / confidence / model / prompt_version / reasoning / user_overridden`
- `error.row_index / raw_row_json / error_code / error_message`（供 UI 非阻塞展示）

> `0026` 的 migration-first integration 表（`external_reference` / `migration_staging_row`）已在
> `0052` 移除；integration source 值折叠回 `csv`。

### 2.5 证据与审计

**evidence_link**（PRD §5.5 provenance 核心）

| 字段                                                        | 备注                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `id`                                                        |                                                                     |
| `firm_id`                                                   | tenant evidence 必填；全局 rule source 不直接作为 EvidenceLink 暴露 |
| `obligation_instance_id` 或 `ai_output_id`                  | 二选一                                                              |
| `source_type`                                               | 枚举（§06）                                                         |
| `source_id` / `source_url` / `verbatim_quote`               |                                                                     |
| `raw_value` / `normalized_value`                            | Migration 用                                                        |
| `confidence` / `model` / `matrix_version`                   | AI 决策用                                                           |
| `verified_at` / `verified_by` / `applied_at` / `applied_by` |                                                                     |

Activation Slice v1 读取面：`evidence.listByObligation({ obligationId })` 只暴露 drawer/detail
需要的最小 public shape，并且先验证 `obligation_instance.firm_id = scoped.firmId` 再读
`evidence_link`，防止跨 firm 猜 id。Dashboard top rows 内联 `evidenceCount` 和
`primaryEvidence`，但不在首屏展开完整 evidence drawer。

**audit_event**

| 字段                                                                   | 备注                                                                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `id` / `firm_id` / `actor_id`                                          | `actor_id` NULL = system actor（Cron / Queue / webhook）                                                     |
| `actor_type ∈ (user, system, ai, ai_assisted)` / `previous_actor_type` | AI provenance 轴：human/AI/混合作者；用户改写 AI 值时记录原 origin（migration `0055`，默认 `user` 安全回填） |
| `ai_event_metadata_json`                                               | model / prompt version / tokens / guard 等 AI 元数据（JSON 收敛 bind 预算）                                  |
| `entity_type` / `entity_id`                                            |                                                                                                              |
| `action`                                                               | 枚举（§06.6）                                                                                                |
| `before_json` / `after_json` / `reason`                                |                                                                                                              |
| `ip_hash` / `user_agent_hash`                                          | 匿名化                                                                                                       |
| `created_at`                                                           |                                                                                                              |

**硬约束：`audit_event` 永不物理删除，也不允许软删标志位。**

Activation Slice v1 读取面：`audit.list({ range, category, action, actorId, entityType, entityId, search, cursor, limit })`
暴露 firm-wide Audit Log 管理页需要的最小 public shape。Repo 内部始终加
`audit_event.firm_id = scoped.firmId`，默认按 `(created_at, id)` 倒序 keyset pagination；
`action` 保持 append-only string，不做 DB enum。`category` 是 UI 查询派生概念，
由 action prefix 映射得到，不回写到表。

### 2.6 AI 观测

**ai_output**

| 字段                                                                                                                                                                   |     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `id` / `firm_id` / `user_id` / `kind ∈ (brief, tip, summary, ask_answer, pulse_extract, rule_concrete_draft, migration_map, migration_normalize, readiness_checklist)` |     |
| `prompt_version` / `model` / `input_context_ref` / `input_hash`                                                                                                        |     |
| `output_text` / `citations_json`                                                                                                                                       |     |
| `guard_result` / `refusal_code`                                                                                                                                        |     |
| `generated_at` / `tokens_in` / `tokens_out` / `latency_ms` / `cost_usd`                                                                                                |     |

**llm_log**

| 字段                                                         |                                  |
| ------------------------------------------------------------ | -------------------------------- |
| `id` / `firm_id` / `user_id` / `prompt_version`              |                                  |
| `input_tokens` / `output_tokens` / `latency_ms` / `cost_usd` |                                  |
| `guard_result` / `refusal_code`                              |                                  |
| `success` / `error_msg` / `created_at`                       |                                  |
| `input_hash`                                                 | sha256；**不存原文**（PII 合规） |

2026-04-28 Activation Slice v1 已落最小实现：Migration mapper / normalizer
会写 `ai_output` + `llm_log`，并把 `evidence_link.ai_output_id` 指向可追溯的
AI / fallback output。`input_hash` 来自 redacted prompt input；不保存 prompt 原文。
Fallback 也会写 `ai_output`，但 `model=null`、`guard_result` / `refusal_code` 明确标记
preset / dictionary / unavailable，不伪装成模型结论。

**rule_concrete_draft**（migration `0054`；`0056` 移除 `source_signal_id` 列）

`ai_output` 的规则侧扩展缓存（PK = `ai_output_id` FK cascade）：把 rule × source snapshot 的
concrete draft 文本/引用缓存在 `(rule_id, rule_version, source_id)` 维度（`source_excerpt` /
`source_text` / `output_text` / `citations_json`），避免重复调模型。

### 2.6.b Dashboard read model

Activation Slice v1 新增 tenant-scoped `dashboard` repo，服务 `dashboard.load` contract。
它从 `obligation_instance` + `client` + `evidence_link` 聚合首屏风险：

- open obligations：当前实现读取
  `pending` / `in_progress` / `waiting_on_client` / `review` / `blocked`（`packages/core/src/obligation-workflow`
  的 `OPEN_OBLIGATION_STATUSES`）；`done / extended / paid / not_applicable / completed` 为 closed
- due window：默认 `asOfDate` 来自 firm timezone，`windowDays=7`，含第 7 天边界
- needs review：`status='review'`
- evidence gap：open obligation 且没有 evidence
- top rows：按 Smart Priority 排序；Smart Priority 是 `packages/core/src/priority` 纯函数，默认基于
  exposure 45%、urgency 25%、client importance 15%、late-filing history 10%、readiness/waiting 5%
  计算 score、rank、factor contributions 和 source labels。Owner 可在 Practice profile 保存
  firm-level `smartPriorityProfile`，只调整五个权重和 exposure/urgency/history 归一化阈值；AI 不参与排序。
  overdue / 0-2 天仍映射为
  `critical`，3-7 天 `high`，`review` 或 8-14 天 `medium`，其他 open `neutral`
- triage tabs：`dashboard.load.triageTabs` 在同一次 repo 聚合中产出 `this_week`（逾期和 0-7
  天）、`this_month`（8-30 天）、`long_term`（31-180 天）；每行只进入最紧急的一个 tab，主金额
  合计只计入 ready legacy penalty estimate
- legacy penalty estimate：只聚合 due window 内 `exposure_status='ready'` 的
  `estimated_exposure_cents`；`needs_input` / `unsupported` 分别计数，不显示 fake `$0`
- accrued penalty：不持久化；Dashboard / Obligations response 按 `asOfDate` + `current_due_date`
  动态计算，只把 overdue open obligations 计入 Dashboard `totalAccruedPenaltyCents`

Penalty / exposure 金额只来自 obligation-level `penalty_facts_json`。Migration import 和
maintenance backfill 可以用 explicit user input、demo fixture seed、active practice rule metadata 或
legacy client penalty fields 预填 facts；缺公式返回 `unsupported`，有公式但缺 facts 返回
`needs_input`，不显示 fake `$0`。`clients.updatePenaltyInputs` 写 `penalty.override` audit 和
`penalty_override` evidence，并重算该 client 下 open obligations。

Dashboard AI Brief 不在 `dashboard.load` request path 调用模型。后台 Queue consumer 读取同一份
deterministic Dashboard snapshot，生成 `ai_output(kind='brief')`，并把可供首屏快速读取的状态写入
`dashboard_brief` 物化表。

**dashboard_brief**

| 字段                                                                             | 说明                                                            |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `id` / `firm_id` / `user_id`                                                     | `user_id` 仅用于未来 `scope='me'`；firm-wide brief 为 null      |
| `scope ∈ (firm, me)` / `as_of_date` / `status ∈ (pending, ready, failed, stale)` | MVP 可先只启用 `firm`                                           |
| `input_hash` / `ai_output_id`                                                    | `input_hash` 来自 Dashboard snapshot；`ai_output_id` 指向 trace |
| `summary_text` / `top_obligation_ids_json` / `citations_json`                    | 通过 guard 后才写用户可见文本                                   |
| `reason` / `error_code`                                                          | 触发原因与 structured failure                                   |
| `generated_at` / `expires_at` / `created_at` / `updated_at`                      | stale 与运维调试                                                |

`dashboard_brief` 是 read-model 状态表，不替代 `ai_output` / `llm_log`。AI 成本、tokens、latency、
guard/refusal 仍以 `ai_output` / `llm_log` 为审计来源。

P0-17 后，Client Risk Summary 和 Deadline Tip 共享同一张 async cache 表。请求路径只返回
ready/stale/pending/failed 或 deterministic fallback；刷新 mutation 只入队，不在用户请求中等待模型。

**ai_insight_cache**

| 字段                                                                                                               | 说明                                                                |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `id` / `firm_id`                                                                                                   | tenant-scoped cache row                                             |
| `kind ∈ (client_risk_summary, deadline_tip)` / `subject_type ∈ (client, obligation)` / `subject_id` / `as_of_date` | 一个客户或一个 obligation 在某个 firm-local 日期的缓存              |
| `status ∈ (pending, ready, failed, stale)`                                                                         | Repo 读取时会把过期 ready 归一为 stale                              |
| `input_hash` / `ai_output_id`                                                                                      | `input_hash` 来自 deterministic snapshot；`ai_output_id` 指向 trace |
| `output_json` / `citations_json`                                                                                   | 通过 insight guard 后才写入；public shape 是 sections + citations   |
| `reason` / `error_code`                                                                                            | refresh 触发原因与 structured failure                               |
| `generated_at` / `expires_at` / `created_at` / `updated_at`                                                        | 24h TTL 与运维调试                                                  |

`ai_insight_cache` 不替代 `ai_output` / `llm_log`；它只是 Client Profile 和 Obligations drawer
快速读取的 read model。`client_risk_summary` 写 `ai_output.kind='summary'`，
`deadline_tip` 写 `ai_output.kind='tip'`。

**user_dashboard_visit**（migration `0068`）

per-user-per-firm 的 "上次打开 dashboard" 时间戳（`UNIQUE(user_id, firm_id)` + `last_visit_at`）；
驱动 once-a-day post-login welcome 与 "while you were away" recap 窗口。App-owned（better-auth
`user` 表不手工加列）。

### 2.7 通知

**in_app_notification** · **notification_preference** · **notification_digest_run** · **email_outbox** · **reminder** · **reminder_template** · **client_email_suppression**

- `email_outbox.external_id` 唯一约束（幂等）
- `email_outbox.status ∈ (pending, sending, sent, failed)`；`type ∈ (pulse_digest, pulse_review_request, morning_digest, deadline_reminder, client_deadline_reminder, audit_evidence_package_ready, readiness_request, signature_reminder)`
- `in_app_notification.type ∈ (deadline_reminder, overdue, client_reminder, pulse_alert, audit_package_ready, catalog_release, internal_request, system)`；`(firm_id, user_id, created_at / read_at)` 索引
- `notification_preference` 是 per-user-per-firm 行（`UNIQUE(firm_id, user_id)`）：`email_enabled / in_app_enabled / reminders_enabled / pulse_enabled / unassigned_reminders_enabled` 五个通道开关 + morning digest 的 `morning_digest_enabled` / `morning_digest_hour` / `morning_digest_days_json`。**`0074_rebuild_notification_preference.sql` 整表 drop+recreate**：staging 残留早期 0014 形态（`pulse_email_cadence` / `deadline_email_*_days` / `quiet_hours_*`）导致 "no such column"；重建对齐 drizzle 形态（表当时零行，preference 按需 select-then-upsert 重建，无数据损失）
- `notification_digest_run.status ∈ (queued, sent, skipped_quiet, failed)`；`UNIQUE(user_id, local_date)` 防止同一 practice day 重复发送
- `reminder`：`recipient_kind ∈ (member, client)`、`channel ∈ (email, in_app)`、`offset_days ∈ {30, 7, 0}`（0 = overdue；dispatch cron 在 firm 当地 8:00 生成）、`dedupe_key` UNIQUE 幂等、`template_id → reminder_template`、`email_outbox_id`（Resend webhook 经它回写 `clicked_at`，索引见 `0062`）；`sent_at` / `clicked_at`
- `reminder_template`（migration `0036`）：system 行（`firm_id NULL`）与 firm 覆盖行各自 partial unique（`template_key`）；`kind ∈ (deadline_reminder, client_deadline_reminder, readiness_request)`
- `client_email_suppression`：`UNIQUE(firm_id, email)`；`reason ∈ (unsubscribe, bounce, manual)` + `token_hash`（退订链接）

> `push_subscription` 表已随 Phase 0 PWA/Web Push 降级整体移除（见 `00-Overview.md §7`、`05 §8`）。恢复时需同步 schema migration + `packages/db/src/schema/notifications.ts` + 两条 push 相关索引。

### 2.8 其他

- **obligation_saved_view**（P1-16 已落地，migrations `0017`/`0034`）：firm-scoped 队列视图（`query_json` + `column_visibility_json` + `density ∈ comfortable/compact` + `is_pinned`）
- **calendar_subscription**（P1-11 的实现形态，migration `0025`）：ICS feed 订阅（`scope ∈ my/firm`、`privacy_mode ∈ redacted/full`、`token_nonce`、`status ∈ active/disabled`）；没有独立 `ics_token` 表
- **audit_evidence_package**（已落地，migration `0014`）：审计证据导出包（`scope ∈ firm/client/obligation/migration`、file manifest、`sha256_hash`、`r2_key`、`status ∈ pending/running/ready/failed/expired`、`expires_at`）
- **mutation_lock**（migration `0058`）：D1-backed 短时 advisory lock（PK = `key` + `expires_at` 过期抢占）；替代 KV get-then-put 的 TOCTOU，串行化 Pulse apply/revert 等并发 mutation
- `analytics_event` 仍未建表（只在 PRD §8.1）

---

## 3. 关键索引（P95 性能保障）

```sql
-- Dashboard / Obligations 核心
CREATE INDEX idx_oi_firm_status_due       ON obligation_instance(firm_id, status, current_due_date);
CREATE INDEX idx_oi_firm_due_exposure     ON obligation_instance(firm_id, current_due_date, exposure_status, estimated_exposure_cents);
CREATE INDEX idx_oi_firm_tax_type_due     ON obligation_instance(firm_id, tax_type, current_due_date);
CREATE INDEX idx_oi_firm_type_due         ON obligation_instance(firm_id, obligation_type, current_due_date);
CREATE INDEX idx_oi_firm_jurisdiction_due ON obligation_instance(firm_id, jurisdiction, current_due_date);
CREATE INDEX idx_oi_firm_exposure_amount  ON obligation_instance(firm_id, estimated_exposure_cents);
CREATE INDEX idx_oi_firm_workflow         ON obligation_instance(firm_id, prep_stage, review_stage, payment_state, efile_state);
CREATE INDEX idx_oi_firm_rule_tax_year    ON obligation_instance(firm_id, rule_id, tax_year);
CREATE INDEX idx_oi_client                ON obligation_instance(client_id);
CREATE INDEX idx_oi_profile               ON obligation_instance(client_filing_profile_id);

-- Generated obligation 去重（superseded 行不挡重新生成）
CREATE UNIQUE INDEX uq_oi_generated_rule_period
  ON obligation_instance(firm_id, client_id, jurisdiction, rule_id, tax_year, rule_period)
  WHERE rule_id IS NOT NULL AND tax_year IS NOT NULL AND rule_period IS NOT NULL
    AND superseded_at IS NULL;

-- Pulse 匹配 / Clients 列表
CREATE INDEX idx_client_firm_time         ON client(firm_id, created_at);
CREATE INDEX idx_client_firm_state_county ON client(firm_id, state, county);
CREATE INDEX idx_client_firm_entity       ON client(firm_id, entity_type);
CREATE INDEX idx_cfp_firm_client          ON client_filing_profile(firm_id, client_id);
CREATE INDEX idx_cfp_firm_state           ON client_filing_profile(firm_id, state);
CREATE UNIQUE INDEX uq_cfp_client_state_active
  ON client_filing_profile(client_id, state) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX uq_cfp_client_primary_active
  ON client_filing_profile(client_id) WHERE is_primary = 1 AND archived_at IS NULL;

-- Migration Revert
CREATE INDEX idx_client_batch ON client(migration_batch_id);
CREATE INDEX idx_oi_batch     ON obligation_instance(migration_batch_id);
CREATE INDEX idx_cfp_batch    ON client_filing_profile(migration_batch_id);

-- Evidence
CREATE INDEX idx_evidence_firm_time ON evidence_link(firm_id, applied_at);
CREATE INDEX idx_evidence_oi     ON evidence_link(obligation_instance_id);
CREATE INDEX idx_evidence_source ON evidence_link(source_type, source_id);

-- Readiness（内部清单 + 公开 portal）
CREATE INDEX idx_readiness_doc_item_obligation
  ON obligation_readiness_checklist_item(firm_id, obligation_instance_id);
CREATE INDEX idx_readiness_doc_item_status
  ON obligation_readiness_checklist_item(firm_id, status);
CREATE UNIQUE INDEX uq_readiness_template_suppression_item
  ON obligation_readiness_template_item_suppression(firm_id, obligation_instance_id, template_key);
CREATE UNIQUE INDEX uq_readiness_request_token_hash
  ON client_readiness_request(token_hash);
CREATE INDEX idx_readiness_request_firm_obligation
  ON client_readiness_request(firm_id, obligation_instance_id);
CREATE INDEX idx_readiness_request_status_expiry
  ON client_readiness_request(status, expires_at);
CREATE INDEX idx_readiness_response_request
  ON client_readiness_response(request_id);
CREATE INDEX idx_readiness_response_obligation
  ON client_readiness_response(firm_id, obligation_instance_id);

-- AI trace
CREATE INDEX idx_ai_output_firm_time ON ai_output(firm_id, generated_at);
CREATE INDEX idx_ai_output_context   ON ai_output(kind, input_context_ref);
CREATE INDEX idx_llm_log_firm_time   ON llm_log(firm_id, created_at);
CREATE INDEX idx_llm_log_prompt_time ON llm_log(prompt_version, created_at);

-- Dashboard AI Brief materialized read model
CREATE INDEX idx_dashboard_brief_firm_scope_time
  ON dashboard_brief(firm_id, scope, as_of_date, updated_at);
CREATE UNIQUE INDEX uq_dashboard_brief_ready_hash
  ON dashboard_brief(firm_id, scope, as_of_date, input_hash)
  WHERE status IN ('ready', 'pending');

-- Async AI insight cache
CREATE INDEX idx_ai_insight_subject_time
  ON ai_insight_cache(firm_id, kind, subject_type, subject_id, as_of_date, updated_at);
CREATE UNIQUE INDEX uq_ai_insight_ready_hash
  ON ai_insight_cache(firm_id, kind, subject_id, as_of_date, input_hash)
  WHERE status IN ('ready', 'pending');

-- Obligations Saved Views
CREATE INDEX idx_obligation_saved_view_firm_pin_name
  ON obligation_saved_view(firm_id, is_pinned, name);
CREATE INDEX idx_obligation_saved_view_creator
  ON obligation_saved_view(firm_id, created_by_user_id);

-- Pulse feed / 告警 / ingest
CREATE INDEX idx_pulse_status_pub       ON pulse(status, published_at);
CREATE INDEX idx_pulse_jurisdiction_pub ON pulse(parsed_jurisdiction, published_at);
CREATE UNIQUE INDEX uq_pulse_dedupe_key ON pulse(dedupe_key);
CREATE UNIQUE INDEX uq_pulse_firm_alert ON pulse_firm_alert(firm_id, pulse_id);
CREATE INDEX idx_pfa_firm_status_time   ON pulse_firm_alert(firm_id, status, updated_at);
CREATE UNIQUE INDEX uq_pulse_application_obligation
  ON pulse_application(firm_id, pulse_id, obligation_instance_id);
CREATE UNIQUE INDEX uq_pss_source_external_hash
  ON pulse_source_snapshot(source_id, external_id, content_hash);
CREATE INDEX idx_pss_enabled_next       ON pulse_source_state(enabled, next_check_at);
CREATE UNIQUE INDEX uq_rsds_rule_source ON rule_source_drift_state(rule_id, source_id);

-- Rules 治理
CREATE UNIQUE INDEX uq_practice_rule_firm_rule ON practice_rule(firm_id, rule_id);
CREATE INDEX idx_practice_rule_firm_status     ON practice_rule(firm_id, status);
CREATE UNIQUE INDEX uq_practice_rule_task_firm_rule_version
  ON practice_rule_review_task(firm_id, rule_id, template_version);
CREATE UNIQUE INDEX uq_rule_catalog_release_filing_year ON rule_catalog_release(filing_year);

-- Audit（火热写）
CREATE INDEX idx_audit_firm_time            ON audit_event(firm_id, created_at);
CREATE INDEX idx_audit_firm_actor_time      ON audit_event(firm_id, actor_id, created_at);
CREATE INDEX idx_audit_firm_action_time     ON audit_event(firm_id, action, created_at);
CREATE INDEX idx_audit_firm_actor_type_time ON audit_event(firm_id, actor_type, created_at);

-- Exception overlay
CREATE INDEX idx_exc_status_effective ON exception_rule(status, effective_from, effective_until);
CREATE INDEX idx_exc_firm_status      ON exception_rule(firm_id, status, effective_from);
CREATE UNIQUE INDEX uq_obligation_exception_application
  ON obligation_exception_application(obligation_instance_id, exception_rule_id);
CREATE INDEX idx_oea_firm_obligation_active
  ON obligation_exception_application(firm_id, obligation_instance_id, reverted_at);

-- Notifications
CREATE UNIQUE INDEX uq_email_outbox_external_id ON email_outbox(external_id);
CREATE INDEX idx_outbox_status         ON email_outbox(status, created_at);
CREATE UNIQUE INDEX uq_reminder_dedupe ON reminder(dedupe_key);
CREATE INDEX idx_reminder_firm_status_time ON reminder(firm_id, status, scheduled_for);
CREATE INDEX idx_reminder_outbox       ON reminder(email_outbox_id);
CREATE UNIQUE INDEX uq_notification_preference_firm_user
  ON notification_preference(firm_id, user_id);
CREATE UNIQUE INDEX uq_notification_digest_run_user_local_date
  ON notification_digest_run(user_id, local_date);
-- push_subscription 索引已随 PWA/Web Push 降级移除（见 §2.7 末尾）
```

以上只列高频路径；完整索引清单以 `packages/db/src/schema/*.ts` 为准。

D1 无 GIN / ivfflat；向量检索走 Vectorize；需要数组 / JSON 过滤时优先拆 helper table 或反范式（如 `has_federal` boolean、`client_tax_type`、`exception_affected_form`），临时 JSON 查询用 `json_each()` 但不得作为高频路径默认方案。

---

## 4. 租户隔离（D1 无 RLS · 三道工程防线）

1. **Middleware 层**：Hono middleware 从 better-auth session 读 `activeOrganizationId`，不存在直接 401
2. **Repo 工厂层**：`scoped(db, firmId)` 是 `packages/db` 唯一对外导出；所有查询在工厂内部硬编码 `WHERE firm_id = :firmId`
3. **oxlint 层**：`apps/server/src/procedures/**` 禁止直接 import `@duedatehq/db` 和 `@duedatehq/db/schema/*`（通过 `no-restricted-imports` 配置）；PR CI 自动 block

`scoped.ts` 强制形态（**约束**）：

```ts
// packages/db/src/scoped.ts（当前完整 repo 面）
export function scoped(db: Db, firmId: string): ScopedRepo {
  return {
    firmId,
    ai,
    aiInsights,
    calendar,
    clients,
    filingProfiles,
    clientTaxYearProfiles,
    dashboard,
    obligations,
    obligationQueue,
    workload,
    pulse,
    readiness,
    ruleConcreteDrafts,
    rules,
    mutationLock,
    migration,
    notifications,
    reminders,
    evidence,
    audit,
    // 每个业务 repo 都在此注入 firmId（mutationLock / ruleConcreteDrafts 为全局表例外）
  }
}
```

任何 repo 内部**不得**接受其他租户来源；`firmId` 只能从这里传入。

---

## 5. 软删除策略

| 实体                               | 策略                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `client`                           | `deleted_at` 软删；30 天后 Cron 硬删（级联 obligation）                                        |
| `client_filing_profile`            | active profile 移除时写 `archived_at`；migration revert / single undo 可物理删本批新建 profile |
| `obligation_instance`              | 不软删；状态 `not_applicable` 代替；reclassify 走 `superseded_at` 软归档（migration `0065`）   |
| `audit_event`                      | **永不删**（硬约束）                                                                           |
| `migration_batch`                  | `reverted_at` 标记；原始数据 R2 保留 90 天                                                     |
| `pulse`                            | 不删；`status=rejected` 即过滤                                                                 |
| `user` / `organization` / `member` | 由 better-auth 管理；GDPR 请求走其 `deleteUser` API                                            |

---

## 6. Migration 流程（约束）

```
# 1. 改 packages/db/src/schema/*.ts
# 2. 手写 migrations/00NN_*.sql（与 schema 同步维护；0026 起全部手写，
#    drizzle-kit / `db:generate` / `migrations/meta` journal 已于 2026-06-10 移除）

# 3. 本地 D1 应用
pnpm db:migrate:local

# 4. 本地 better-auth 迁移（首次 + 改 auth 配置时）
pnpm --filter @duedatehq/server auth:migrate --local

# 5. PR 合并后 CI 对 staging D1 应用
pnpm db:migrate:remote

# 6. 生产 deploy pipeline 先 apply prod D1
pnpm --dir apps/server exec wrangler d1 migrations apply DB --remote --config wrangler.toml
```

**纪律：**

- 迁移**向前兼容**：新字段默认 NULL 或给默认值；删字段走两阶段（先停写 → 下次发布删列）
- Root migration scripts run Wrangler from `apps/server` so the monorepo
  `migrations_dir` resolves consistently. They target the `DB` binding; the
  explicit `--local` / `--remote` flag selects Miniflare SQLite or Cloudflare
  D1.
- Seed 脚本：`db:seed:demo`（幂等；demo SQL 由 `packages/db/seed/generate-demo.ts` 生成，勿手改）/ rules asset 由 `packages/core` 提供 `FED + 50 states + DC` 覆盖（`db:seed:pulse` 已移除）

---

## 7. `due_date_logic` DSL（约束）

```ts
// packages/core/src/rules（ObligationRule.dueDateLogic）；不支持的 kind 不进 catalog
type DueDateLogic =
  | { kind: 'fixed_date'; date: string; holidayRollover: 'source_adjusted' | 'next_business_day' }
  | {
      kind: 'nth_day_after_tax_year_end'
      monthOffset: number
      day: number
      holidayRollover: 'next_business_day'
    }
  | {
      kind: 'nth_day_after_tax_year_begin'
      monthOffset: number
      day: number
      holidayRollover: 'next_business_day'
    }
  | {
      kind: 'period_table' // semiweekly / monthly / quarterly / annual 周期表
      frequency: 'semiweekly' | 'monthly' | 'quarterly' | 'annual'
      periods: readonly { period: string; dueDate: string }[]
      holidayRollover: 'source_adjusted'
    }
  | {
      kind: 'source_defined_calendar'
      description: string
      holidayRollover: 'source_adjusted' | 'next_business_day'
    }
// `source_defined_calendar` 规则强制走 practice review（见 0046_source_defined_rules_pending_review.sql）；
// 周末/假日 rollover 由 holidayRollover 字段 + packages/core/src/federal-holidays 处理。
```

日期计算由 `packages/core/src/date-logic` 和 `packages/core/src/tax-periods` 纯函数完成，零运行时依赖。Fiscal-year / short-year return deadlines 先解析 obligation tax period，再把 `tax_period_end` 输入 rule DSL。自动生成的新 obligation 默认 calendar；导入回填或年度 rollover 可从既有 obligation period 带出 fiscal period。CPA 在 obligation Readiness 中调整单个 obligation 的 `tax_year_type` 和 fiscal year end，保存时重算 tax period、statutory due date、internal due date 与 exposure。

---

## 8. D1 约束速查

| 约束                 | 值                                | 工程缓解                                                                                                           |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 单库大小             | 10 GB                             | 接近阈值前按 firm / region 分库；不要假设单库长期承载全部租户                                                      |
| 单查询返回行数       | 10 万                             | 所有列表强制分页（50 / 100 / 200）                                                                                 |
| 单 invocation 查询数 | Workers Paid 约 1000（Free 更低） | Migration / Pulse 分批；每批优先 100–200 prepared statements                                                       |
| 单 SQL 绑定参数      | 100                               | 大 `IN (...)` 拆批（repo 层常量：`*_IDS_PER_BATCH = 90/99`、行级 `⌊100 / 每行列数⌋`，见 `packages/db/src/repo/*`） |
| 单请求 CPU           | 30s（付费 5min）                  | 长计算拆 Queue / Workflow                                                                                          |
| 无原生 vector        | —                                 | Vectorize                                                                                                          |
| 无原生 JSON 索引     | —                                 | 反范式冗余 boolean / 拆表                                                                                          |
| 无 RLS               | —                                 | `scoped(db, firmId)` 工厂强制                                                                                      |

---

## 9. 规则覆盖路线图 + Postgres 退路

### 9.1 规则覆盖（对齐 PRD §4.1 P0-8 / §6.1.2）

| 阶段                                  | 覆盖辖区                    | 条目                                                                                                                                                         |
| ------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Demo Sprint**（§09）                | Federal + CA + NY           | ~20 条 verified                                                                                                                                              |
| **Phase 0 MVP 当前口径**（PRD §14.1） | `FED + 50 states + DC`      | 当前 rule/source registry 已覆盖全辖区；source-backed candidate 进入 review-only 路径，只有 practice-reviewed active rule 才能生成 reminder-ready obligation |
| **Phase 1 完整**（PRD §14.2）         | 全辖区 active sign-off 强化 | 逐辖区完成更细 source snapshot、diff、review SLA 与 active 规则治理；无 schema 变更                                                                          |

### 9.2 Postgres 退路（极端场景，非预设路径）

D1 不是权宜之计，是**架构正确选择**（见 §01.2.5）。仅在以下**不在当前路线图**的极端场景下考虑切 Hyperdrive + Neon：

| 触发条件                 | 处理                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| 单库真实超 10 GB         | 先评估按 firm 分库（D1 支持多库）；仍不够再切                               |
| 跨租户 OLAP 分析需求固化 | 先评估 Cloudflare Analytics Engine + 定时 Workflow 重算物化视图；仍不够再切 |
| 合规要求物理租户隔离     | 按 firm 建独立 D1 实例（D1 支持多库）；仍不够再切                           |

**若真需要迁移**，路径（需要独立迁移计划，不按 1 天承诺）：

- Drizzle 方言切换：sqlite → pg（约 30% schema 语法变更：`integer (ms)` → `timestamptz`，JSON text → `jsonb`）
- 查询层零感知：`scoped.ts` 是唯一修改点
- 数据复制：`sqlite3 .dump` → 转 pg SQL → `pg_restore`

---

## 10. Dev 工具

- `pnpm --dir apps/server exec wrangler d1 execute DB --local --command "SELECT ..."` ad-hoc SQL（binding `DB`，staging 库名 `due-date-hq-staging`）
- `pnpm db:seed:demo` 幂等 seed（Sprint Playbook 的 Demo Data 模块依赖）

---

继续阅读：[04-AI-Architecture.md](./04-AI-Architecture.md)
