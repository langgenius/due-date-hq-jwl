# 03 · Data Model · 数据层设计

> 目标：一次设计**覆盖 Phase 0 + Phase 1**，避免 Team / Overlay / Readiness 上线时回头重构。
> 核心决策：**D1 + Drizzle + `scoped(db, firmId)` 工厂**；租户字段统一使用 `firmId`（= better-auth `organizationId`）。
> 相关 ADR：[`0016`](../adr/0016-cloudflare-first-single-worker-d1-platform.md) · [`0018`](../adr/0018-d1-tenant-isolation-scoped-repo-ports.md)

---

## 1. Schema 组织

```
packages/db/
├── src/
│   ├── schema/
│   │   ├── auth.ts              ← better-auth 托管（user / session / account / verification
│   │   │                            / organization / member / invitation）
│   │   ├── firm.ts              ← firm_profile（业务租户表；PK = organization.id）
│   │   ├── clients.ts
│   │   ├── obligations.ts       ← rule + instance
│   │   ├── overlay.ts           ← exception_rule + obligation_exception_application
│   │   ├── migration.ts
│   │   ├── pulse.ts
│   │   ├── ai.ts                ← ai_output + llm_log
│   │   ├── ai-insights.ts       ← async cached client_risk_summary + deadline_tip
│   │   ├── audit.ts             ← audit_event + evidence_link
│   │   ├── notifications.ts     ← in_app + email_outbox + reminder（push_subscription 已随 Phase 0 PWA 降级移除）
│   │   ├── readiness.ts         ← Phase 1
│   │   └── index.ts             ← barrel
│   ├── client.ts                ← drizzle(D1) factory
│   ├── scoped.ts                ← ★ 业务模块的唯一入口
│   ├── audit-writer.ts
│   ├── evidence-writer.ts
│   └── types.ts
├── migrations/                   ← drizzle-kit 生成，wrangler d1 apply
└── drizzle.config.ts
```

**约束：**

- `apps/server/src/procedures/**` **不允许**直接 import `@duedatehq/db` 或 `@duedatehq/db/schema/*`；只能通过 `context.vars.scoped` / `context.vars.tenantContext` 访问运行时数据；类型边界使用 type-only `@duedatehq/ports/<domain>`，不使用 ports 根入口
- `scoped.ts` 的每个 repo 入口都必须硬编码 `WHERE firm_id = :firmId`，`firmId` 只能从 middleware 注入，不能从 procedure `input` 接收
- `schema/auth.ts`（better-auth 身份层 7 张表）**手工维护**：已在 `member` 表加 `(organization_id, user_id)` unique index、加 `member.status` 业务字段，并为 Members gateway 加 `invitation(organization_id,email,status)` 索引。不跑 `@better-auth/cli generate`（package.json 已无 `auth:schema` 脚本，避免误重跑覆盖这些约束）；后续 schema 变更一律走 `pnpm db:generate` + 人工 review
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

`firmId`（业务表）严格 = `organization.id` = `firm_profile.id`（三层共用同一个 id；见 §2.1.b 与 ADR 0010）。

> **2026-04-24 修订**：`organization.metadata` 不再承载业务语义（plan / seatLimit / timezone / ownerUserId / status），这些字段已迁到独立的 `firm_profile` 表（见下一小节）。`organization.metadata` 当前不写、未来仅用于身份层附加属性。

**Global vs tenant-scoped 边界（约束）：**

| 类别         | 表                                                                                                                                                                  | `firm_id` 规则                                                                                       | 访问方式                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 租户业务数据 | `client` / `obligation_instance` / `migration_*` / `audit_event` / `ai_output` / `llm_log` / `ai_insight_cache` / `dashboard_brief` / `email_outbox` / `saved_view` | `firm_id NOT NULL`                                                                                   | 只能经 `scoped(db, firmId)`                                        |
| 全局规则资产 | `obligation_rule` / `rule_source` / `rule_chunk`                                                                                                                    | 不带 firm 或 `firm_id NULL`                                                                          | 只读公开/ops 路径；业务查询必须通过 rule id join 到租户 obligation |
| 混合 overlay | `exception_rule`                                                                                                                                                    | `firm_id NOT NULL` 表示 practice temporary/custom exception；不再使用全局生产 exception 作为生效依据 | 经 `scoped` 按 practice 隔离                                       |
| 应用记录     | `pulse_application` / `obligation_exception_application` / `evidence_link`                                                                                          | `firm_id NOT NULL`（即使可由 parent join 推导，也冗余存储）                                          | 只能经 `scoped`                                                    |

任何可由用户直接打开详情页的记录，都必须能用自身 `firm_id` 或父实体 join 证明归属；不允许只靠前端传来的 id 查询。

### 2.1.b firm_profile（业务租户表）

> 来源：ADR [`0010-firm-profile-vs-organization.md`](../adr/0010-firm-profile-vs-organization.md)。
> Schema：`packages/db/src/schema/firm.ts`；migration `0001_tidy_shiva.sql`。

| 字段                          | 类型                                               | 备注                                                                                                      |
| ----------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `id`                          | `text PK · FK → organization.id ON DELETE CASCADE` | PK 复用 organization.id；删 org → 级联删 firm_profile                                                     |
| `name`                        | `text NOT NULL`                                    | 镜像 organization.name；P1 可分离 legal/display                                                           |
| `plan`                        | `text NOT NULL DEFAULT 'solo'`                     | PRD §3.6.1；enum `solo / firm / pro` 在 drizzle schema + TS 层校验（见下）                                |
| `seat_limit`                  | `integer NOT NULL DEFAULT 1`                       | UI affordance；写时由 plan 决定（P1）                                                                     |
| `timezone`                    | `text NOT NULL DEFAULT 'America/New_York'`         | P0 ICP 假设（PRD §2.1）；P1 onboarding 让用户选                                                           |
| `owner_user_id`               | `text NOT NULL · FK → user.id ON DELETE RESTRICT`  | 删 user 前必须先转 owner 或软删 firm                                                                      |
| `status`                      | `text NOT NULL DEFAULT 'active'`                   | enum `active / suspended / deleted`（drizzle+TS 层）；tenantMiddleware 拒 non-active → `TENANT_SUSPENDED` |
| `billing_customer_id`         | `text NULL`                                        | Stripe customer cache；Better Auth `subscription` / Stripe webhook 仍是事实来源                           |
| `billing_subscription_id`     | `text NULL`                                        | Stripe subscription cache；用于业务 plan/seat 快读，不替代 subscription 表                                |
| `smart_priority_profile_json` | `text JSON NULL`                                   | Practice 级 Smart Priority 配置；NULL = `smart-priority-profile-v1` 默认权重和阈值                        |
| `created_at`                  | `integer (ms) NOT NULL`                            |                                                                                                           |
| `updated_at`                  | `integer (ms) NOT NULL`                            | drizzle `$onUpdate` 触发                                                                                  |
| `deleted_at`                  | `integer (ms) NULL`                                | PRD §3.6.8 软删 30d grace                                                                                 |

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

**加列原则**：

- D1 加列零成本，按需 ALTER
- Billing 已接入 Better Auth Stripe plugin：`subscription` 表保存 Stripe 订阅事实，
  `firm_profile.plan / seat_limit / billing_*` 只作为 app 业务缓存，由 webhook callback 同步。
  业务代码不得直接把 checkout redirect 视为订阅成功。
- `coordinatorCanSeeDollars`（PRD §3.6 RBAC）/ `defaultAssigneeUserId`（PRD §3.6.8）等 P1 字段同样不预占

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

| 字段                                                                                              | 类型                                                                                                                                                                           | 备注                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                                                              | `text PK`                                                                                                                                                                      | UUID v4                                                                                                                                               |
| `firm_id`                                                                                         | `text NOT NULL`                                                                                                                                                                | → `firm_profile.id`（值等同 `organization.id`）                                                                                                       |
| `name`                                                                                            | `text NOT NULL`                                                                                                                                                                |                                                                                                                                                       |
| `ein`                                                                                             | `text`                                                                                                                                                                         | `##-#######`；正则校验；允许 NULL                                                                                                                     |
| `state`                                                                                           | `text NULL`                                                                                                                                                                    | 兼容字段；镜像 primary filing profile 的 ISO 两位州码                                                                                                 |
| `county`                                                                                          | `text NULL`                                                                                                                                                                    | 兼容字段；镜像 primary filing profile 的主 county                                                                                                     |
| `entity_type`                                                                                     | `text NOT NULL` · enum `llc / s_corp / partnership / c_corp / sole_prop / trust / individual / other`（drizzle+TS 层校验，见 §2.1.b 关于 enum / CHECK）                        | FU-1 已兑现                                                                                                                                           |
| `legal_entity`                                                                                    | `text NULL` · enum `individual / sole_proprietorship / single_member_llc / multi_member_llc / partnership / corporation / trust / estate / nonprofit / foreign_entity / other` | legal form；不替代 tax classification                                                                                                                 |
| `tax_classification`                                                                              | `text DEFAULT 'unknown'` · enum `individual / disregarded_entity / partnership / s_corp / c_corp / trust / estate / nonprofit / foreign_reporting_company / unknown`           | Federal filing path 事实；LLC 默认路径由这里决定                                                                                                      |
| `tax_year_type` / `fiscal_year_end_month` / `fiscal_year_end_day`                                 | `text DEFAULT 'calendar'` / `integer` / `integer`                                                                                                                              | Legacy/import default only；CPA-facing tax year profile now lives on each `obligation_instance` so one client can mix calendar and fiscal obligations |
| `owner_count`                                                                                     | `integer NULL`                                                                                                                                                                 | CPA workflow fact；区别于 legacy `equity_owner_count` penalty 输入                                                                                    |
| `has_foreign_accounts` / `has_payroll` / `has_sales_tax` / `has_1099_vendors` / `has_k1_activity` | `integer boolean DEFAULT false`                                                                                                                                                | 用于生成 high-risk / payroll / information / K-1 workflow                                                                                             |
| `primary_contact_name` / `primary_contact_email`                                                  | `text NULL`                                                                                                                                                                    | Client action / 8879 / payment instruction 联系人                                                                                                     |
| `importance_weight`                                                                               | `integer DEFAULT 2` · app enum `1 / 2 / 3`                                                                                                                                     | Smart Priority 输入；1=low，2=medium，3=high                                                                                                          |
| `late_filing_count_last_12mo`                                                                     | `integer DEFAULT 0`                                                                                                                                                            | Smart Priority 输入；非负整数                                                                                                                         |
| `equity_owner_count`                                                                              | `integer`                                                                                                                                                                      | Penalty per-owner / per-partner 输入                                                                                                                  |
| `estimated_annual_revenue_band`                                                                   | `text NULL` · enum `lt_250k / 250k_1m / 1m_10m / gt_10m`（drizzle+TS 层）                                                                                                      | PRD P0-7；Client CRM 视角的粗档收入；Penalty 归档用                                                                                                   |
| `estimated_tax_liability_cents`                                                                   | `integer`                                                                                                                                                                      | PRD §8.1；Penalty Radar 精算输入（可选）                                                                                                              |
| `estimated_tax_liability_source`                                                                  | `text NULL` · enum `manual / imported / demo_seed`                                                                                                                             | 禁止 AI 编造金额；记录金额来源                                                                                                                        |
| `assignee_id`                                                                                     | `text → user.id`                                                                                                                                                               | Phase 1 Team 启用                                                                                                                                     |
| `email` / `notes`                                                                                 | `text`                                                                                                                                                                         |                                                                                                                                                       |
| `migration_batch_id`                                                                              | `text`                                                                                                                                                                         | Revert 级联                                                                                                                                           |
| `created_at` / `updated_at` / `deleted_at`                                                        | `integer (ms)`                                                                                                                                                                 | 软删                                                                                                                                                  |

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

**obligation_rule**（Rules-as-Asset 核心实体）

| 字段                                                                   | 备注                           |
| ---------------------------------------------------------------------- | ------------------------------ |
| `id` / `version`                                                       | 同一规则多版本共存             |
| `jurisdiction`                                                         | `federal` / `CA` / `NY` / ...  |
| `entity_applicability`                                                 | JSON string[]                  |
| `tax_type` / `form_name` / `is_filing` / `is_payment`                  |                                |
| `due_date_logic`                                                       | JSON DSL（§03.7）              |
| `extension_policy` / `penalty_formula`                                 |                                |
| `source_url` / `source_title` / `verbatim_quote` / `statutory_ref`     | 证据铁律                       |
| `verified_by` / `verified_at` / `next_review_at`                       |                                |
| `status ∈ (candidate, verified, deprecated)`                           | AI candidate vs human verified |
| `rule_tier ∈ (basic, annual_rolling, exception, applicability_review)` |                                |
| `risk_level ∈ (low, med, high)`                                        | 高风险要求双人 sign-off        |
| `checklist_json`                                                       | 6 项 Quality Badge（§6D.4）    |
| `coverage_status ∈ (full, skeleton, manual)`                           | 50 州骨架                      |
| `active`                                                               |                                |

**obligation_instance**

Drizzle schema: `packages/db/src/schema/obligations.ts`。Demo Sprint 暂不建 `obligation_rule` FK；Migration 直接写 `tax_type` + `base_due_date`，Phase 1 再回填 Rules-as-Asset。

| 字段                                                                                                                 | 备注                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id` / `firm_id` / `client_id` / `client_filing_profile_id` / `rule_id` / `rule_version`                             | `client_filing_profile_id` nullable；联邦和 legacy/manual rows 可为 NULL；写入时 repo 校验 client/profile 同 firm                                                                                                 |
| `tax_year` / `tax_year_type` / `fiscal_year_end_month` / `fiscal_year_end_day` / `rule_period` / `generation_source` | Tax year profile is per obligation；Readiness tab 允许 CPA 把单个 obligation 调整为 calendar/fiscal；`generation_source ∈ (migration, manual, annual_rollover, pulse)`                                            |
| `tax_period_start` / `tax_period_end` / `tax_period_kind` / `tax_period_source` / `tax_period_review_reason`         | CPA-facing return/reporting period that the authority deadline is based on；obligation-level fiscal year end 直接确定 period，不写 review reason；缺 fiscal year end 的 fiscal obligation 留在 Readiness 校正路径 |
| `jurisdiction`                                                                                                       | `FED` 或州码；Dashboard / Obligations / Calendar / Readiness / penalty exposure / Pulse 都读 obligation jurisdiction，而不是 `client.state`                                                                       |
| `original_due_date`                                                                                                  | 规则生成时的原始日期，**永不变**                                                                                                                                                                                  |
| `base_due_date`                                                                                                      | statutory/base rule 最新计算值；用于派生 practice internal deadline，不直接作为主 UI work due date                                                                                                                |
| `current_due_date`                                                                                                   | 当前 practice internal deadline；默认按 `base_due_date - firm_profile.internal_deadline_offset_days` 写入，主 UI / reminders / sorting 读取                                                                       |
| `obligation_type ∈ (filing, payment, deposit, information, client_action, internal_review)`                          | workflow taxonomy；不要继续膨胀 high-level `status`                                                                                                                                                               |
| `form_name` / `authority` / `source_evidence_json` / `recurrence` / `risk_level`                                     | source-backed rule metadata copied onto the generated instance                                                                                                                                                    |
| `filing_due_date` / `payment_due_date`                                                                               | 税务机关规则来源中的 Filing Deadline / Payment Deadline 分层；extension 不改变 payment due date，Obligation detail 必须显式展示                                                                                   |
| `status ∈ (pending, in_progress, done, extended, paid, waiting_on_client, review, not_applicable)`                   | `done` 保留既有 filed/done wire value；UI 显示为 Filed；`done/extended/paid/not_applicable` 是 closed                                                                                                             |
| `readiness ∈ (ready, waiting, needs_review)`                                                                         | 非持久派生状态；closed status → ready；优先由内部 document checklist 派生（`needs_review` > `missing` > all `received`），无内部清单时才 fallback 到最新 Readiness Portal response / obligation status            |
| `extension_decision ∈ (not_considered, applied, rejected)`                                                           | Obligations detail 的内部延期计划状态；当前 UI 保存即写 `applied`，`rejected` 仅保留历史兼容；`applied` 可把 obligation status 标记为 `extended`                                                                  |
| `extension_memo` / `extension_source` / `extension_expected_due_date`                                                | 内部说明、来源和内部 extension target date；内部日期不得晚于 official filing deadline；不会修改 `current_due_date`，也不表示已向税务机关 filing                                                                   |
| `extension_decided_at` / `extension_decided_by_user_id`                                                              | 决策时间和操作者                                                                                                                                                                                                  |
| `extension_state` / `extension_form_name` / `extension_filed_at` / `extension_accepted_at`                           | 结构化 extension workflow；Form 4868 / 7004 / 8868 证据独立追踪                                                                                                                                                   |
| `prep_stage` / `review_stage` / `reviewer_user_id` / `review_completed_at`                                           | prep/review 子状态；partner/manager final review 不再塞进单一 status                                                                                                                                              |
| `payment_state` / `payment_confirmed_at`                                                                             | payment approval/schedule/confirmation 子状态；估算金额计算仍不在本产品范围                                                                                                                                       |
| `efile_state` / `efile_authorization_form` / `efile_submitted_at` / `efile_accepted_at` / `efile_rejected_at`        | e-file evidence tracking only；不接 IRS e-file transmitter                                                                                                                                                        |
| `estimated_tax_due_cents` / `estimated_exposure_cents`                                                               | Penalty Radar 90-day projected risk 预聚合；缺输入时 projected risk 为 NULL                                                                                                                                       |
| `exposure_status ∈ (ready, needs_input, unsupported)`                                                                | Dashboard / Obligations projected-risk triage badge                                                                                                                                                               |
| `penalty_facts_json` / `penalty_facts_version`                                                                       | versioned obligation-level penalty facts；import/backfill 可由 legacy client inputs 预填，公式只读 facts                                                                                                          |
| `penalty_breakdown_json` / `penalty_formula_version` / `exposure_calculated_at`                                      | projected risk 的可解释公式、版本和重算时间；accrued penalty 不落库，按 `asOfDate` + statutory payment/filing/base date 运行时派生                                                                                |
| `missing_penalty_facts_json` / `penalty_source_refs_json` / `penalty_formula_label`                                  | `needs_input` 缺失事实、官方来源和公式标签；coordinator dollar-hidden role 下随金额一起隐藏                                                                                                                       |
| `assignee_id` / `notes`                                                                                              |                                                                                                                                                                                                                   |
| `migration_batch_id`                                                                                                 |                                                                                                                                                                                                                   |
| `last_changed_by`                                                                                                    |                                                                                                                                                                                                                   |
| `created_at` / `updated_at`                                                                                          |                                                                                                                                                                                                                   |

Generated obligation 去重键包含 jurisdiction：
`firm_id + client_id + jurisdiction + rule_id + tax_year + rule_period`。规则生成对每个 active
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

Internal CPA-facing document checklist for one obligation. Generated deterministically from
`tax_type` / `form_name` / `obligation_type` / entity and jurisdiction context, then editable by the
CPA. This table is the primary readiness source for open obligations; custom rows are preserved when
template rows are regenerated.

| 字段                                                                                       | 备注                                                             |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `id` / `firm_id` / `obligation_instance_id`                                                | tenant-scoped；repo 通过 obligation 同 firm 校验                 |
| `label` / `description`                                                                    | CPA-visible document requirement                                 |
| `source ∈ (template, custom)`                                                              | deterministic template item vs manually added item               |
| `status ∈ (missing, received, needs_review)`                                               | readiness derivation input；`received` 勾选时写 `received_at/by` |
| `sort_order` / `note`                                                                      | stable display order and internal CPA note                       |
| `received_at` / `received_by_user_id` / `created_by_user_id` / `created_at` / `updated_at` | audit-friendly metadata                                          |

**exception_rule**（Overlay Engine）

Drizzle schema: `packages/db/src/schema/overlay.ts`。Migration
`0012_powerful_sinister_six.sql` starts the Pulse-backed due-date overlay path.

| 字段                                                                           | 备注                                                |
| ------------------------------------------------------------------------------ | --------------------------------------------------- |
| `id` / `firm_id` / `source_pulse_id`                                           | `firm_id` 必须指向当前 practice；来源 Pulse 可 NULL |
| `jurisdiction` / `counties[]` / `affected_forms[]` / `affected_entity_types[]` | JSON                                                |
| `override_type ∈ (extend_due_date, waive_penalty, ...)`                        |                                                     |
| `override_value_json`                                                          |                                                     |
| `effective_from` / `effective_until`                                           |                                                     |
| `status ∈ (candidate, verified, applied, retracted, superseded)`               |                                                     |
| `source_url` / `verbatim_quote`                                                |                                                     |

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

| 字段                                                                                        | 备注                                                                                   |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `id` / `firm_id` / `client_id` / `obligation_instance_id`                                   | tenant-scoped；repo 通过 obligation/client 同 firm 校验                                |
| `checklist_json`                                                                            | 从当前内部 document checklist 映射出的客户可见 JSON；不得包含 EIN/邮箱/金额/内部备注等 |
| `token_hash` / `expires_at`                                                                 | 公开 portal 只存 hash，HMAC token 默认 14 天过期                                       |
| `status ∈ (sent, opened, responded, revoked, expired)`                                      | portal 生命周期                                                                        |
| `portal_opened_at` / `sent_at` / `revoked_at` / `created_by_user_id` / `revoked_by_user_id` | 审计和运营追踪                                                                         |
| `created_at` / `updated_at`                                                                 |                                                                                        |

**client_readiness_response**

| 字段                                                         | 备注                                    |
| ------------------------------------------------------------ | --------------------------------------- |
| `id` / `firm_id` / `request_id` / `obligation_instance_id`   | response 永远挂回 request 和 obligation |
| `checklist_item_id` / `status ∈ (ready, not_yet, need_help)` | 客户逐项响应                            |
| `note` / `eta_date`                                          | 客户备注和预计补齐时间                  |
| `ip_hash` / `user_agent_hash` / `submitted_at`               | 公开 portal 写入的匿名化元数据          |

公开 `/api/readiness/:token` GET/POST 只返回客户安全字段，不暴露 EIN、金额、内部 notes、
member id 或 raw audit JSON。POST 响应会写 `readiness.client_response` audit、
`readiness_client_response` evidence，并把客户逐项状态同步回同一份内部 document checklist
（`ready → received`、`not_yet → missing`、`need_help → needs_review`）。Obligation queue /
detail 读取时优先从内部 checklist 派生 `ready | waiting | needs_review`，无内部清单才用 legacy
portal response 和 obligation status fallback；不再写入 obligation 行。

### 2.3 Pulse 链路

**pulse**

| 字段                                                                                     | 备注                                              |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `id` / `source` / `source_url` / `raw_r2_key`                                            | 原文存 R2                                         |
| `published_at`                                                                           |                                                   |
| `ai_summary` / `verbatim_quote`                                                          |                                                   |
| `parsed_jurisdiction` / `parsed_counties[]` / `parsed_forms[]` / `parsed_entity_types[]` | JSON                                              |
| `parsed_original_due_date` / `parsed_new_due_date` / `parsed_effective_from`             |                                                   |
| `confidence`                                                                             | 0–1                                               |
| `status ∈ (pending_review, approved, rejected, quarantined, source_revoked)`             | 全局 source lifecycle；不得表达某 firm 是否已应用 |
| `reviewed_by` / `reviewed_at` / `requires_human_review`                                  | 历史字段保留；firm 是否处理看 `pulse_firm_alert`  |

**pulse_firm_alert**

| 字段                                                                           | 备注                                    |
| ------------------------------------------------------------------------------ | --------------------------------------- |
| `id` / `pulse_id` / `firm_id`                                                  | firm 级 Feed / Banner 状态              |
| `status ∈ (matched, dismissed, snoozed, partially_applied, applied, reverted)` | tenant-scoped；替代全局 `pulse.applied` |
| `matched_count` / `needs_review_count`                                         | Dashboard badge / drawer summary        |
| `dismissed_by` / `dismissed_at` / `snoozed_until`                              | CPA 级处理状态                          |

**pulse_application**

| 字段                                                                   | 备注                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `id` / `pulse_id` / `obligation_instance_id` / `client_id` / `firm_id` |                                                                                       |
| `applied_by` / `applied_at` / `reverted_at`                            |                                                                                       |
| `before_due_date` / `after_due_date`                                   | 审计必备；兼容 revert/audit 索引，实际 effective due date 由 overlay application 控制 |

`pulse_application` 是 obligation 级真实 Apply/Revert 记录；`pulse_firm_alert.status='applied'`
只能由该 firm 下全部选中 application 推导或事务内同步写入，不能回写到全局 `pulse.status`。

**pulse_source_signal**

| 字段                                                                           | 备注                                         |
| ------------------------------------------------------------------------------ | -------------------------------------------- |
| `id` / `source_id` / `external_id` / `content_hash`                            | T2/T3 信号去重键；不创建客户可见 Pulse       |
| `title` / `official_source_url` / `published_at` / `fetched_at` / `raw_r2_key` | 原文仍存 R2，供 canonical source 验证        |
| `tier` / `jurisdiction` / `signal_type='anticipated_pulse'`                    | FEMA/GovDelivery 等预判信号                  |
| `status ∈ (open, linked, dismissed)` / `linked_pulse_id`                       | T1 原文落地后可关联到正式 `pulse` 提升置信度 |

`pulse_source_signal` 明确不进入 Evidence Chain，也不会创建 `pulse_firm_alert`；只有
T1 `pulse_source_snapshot → pulse.approved` 才能触达 Rules > Pulse Changes / Email。

### 2.4 Migration

Drizzle schema: `packages/db/src/schema/migration.ts`。

**migration_batch**

| 字段                                                              | 备注 |
| ----------------------------------------------------------------- | ---- |
| `id` / `firm_id` / `user_id`                                      |      |
| `source ∈ (paste, csv, preset_name)` / `raw_input_r2_key`         |      |
| `mapping_json` / `preset_used`                                    |      |
| `row_count` / `success_count` / `skipped_count`                   |      |
| `ai_global_confidence`                                            |      |
| `status ∈ (draft, mapping, reviewing, applied, reverted, failed)` |      |
| `applied_at` / `revert_expires_at` = `applied_at + 24h`           |      |

**migration_mapping** · **migration_normalization** · **migration_error**

- `mapping.confidence` / `reasoning` / `user_overridden` / `model` / `prompt_version`
- `normalization.field / raw_value / normalized_value / confidence / model / prompt_version / reasoning / user_overridden`
- `error.row_index / raw_row_json / error_code / error_message`（供 UI 非阻塞展示）

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

| 字段                                    | 备注          |
| --------------------------------------- | ------------- |
| `id` / `firm_id` / `actor_id`           |               |
| `entity_type` / `entity_id`             |               |
| `action`                                | 枚举（§06.6） |
| `before_json` / `after_json` / `reason` |               |
| `ip_hash` / `user_agent_hash`           | 匿名化        |
| `created_at`                            |               |

**硬约束：`audit_event` 永不物理删除，也不允许软删标志位。**

Activation Slice v1 读取面：`audit.list({ range, category, action, actorId, entityType, entityId, search, cursor, limit })`
暴露 firm-wide Audit Log 管理页需要的最小 public shape。Repo 内部始终加
`audit_event.firm_id = scoped.firmId`，默认按 `(created_at, id)` 倒序 keyset pagination；
`action` 保持 append-only string，不做 DB enum。`category` 是 UI 查询派生概念，
由 action prefix 映射得到，不回写到表。

### 2.6 AI 观测

**ai_output**

| 字段                                                                                                                         |     |
| ---------------------------------------------------------------------------------------------------------------------------- | --- |
| `id` / `firm_id` / `user_id` / `kind ∈ (brief, tip, summary, ask_answer, pulse_extract, migration_map, migration_normalize)` |     |
| `prompt_version` / `model` / `input_context_ref` / `input_hash`                                                              |     |
| `output_text` / `citations_json`                                                                                             |     |
| `guard_result` / `refusal_code`                                                                                              |     |
| `generated_at` / `tokens_in` / `tokens_out` / `latency_ms` / `cost_usd`                                                      |     |

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

### 2.6.b Dashboard read model

Activation Slice v1 新增 tenant-scoped `dashboard` repo，服务 `dashboard.load` contract。
它从 `obligation_instance` + `client` + `evidence_link` 聚合首屏风险：

- open obligations：排除 `done` / `not_applicable`，当前实现读取
  `pending` / `in_progress` / `waiting_on_client` / `review`
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
  合计只计入 ready projected risk
- projected risk：只聚合 due window 内 `exposure_status='ready'` 的
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

### 2.7 通知

**in_app_notification** · **notification_preference** · **notification_digest_run** · **email_outbox** · **reminder**

- `email_outbox.external_id` 唯一约束（幂等）
- `email_outbox.status ∈ (pending, sending, sent, failed)`
- `notification_preference` 是 firm-scoped personal preference；morning digest 使用 `morning_digest_enabled` / `morning_digest_hour` / `morning_digest_days_json`
- `notification_digest_run.status ∈ (queued, sent, skipped_quiet, failed)`；`UNIQUE(user_id, local_date)` 防止同一 practice day 重复发送
- `reminder.offset_days ∈ {30, 7, 1}`；`sent_at` / `clicked_at`

> `push_subscription` 表已随 Phase 0 PWA/Web Push 降级整体移除（见 `00-Overview.md §7`、`05 §8`）。恢复时需同步 schema migration + `packages/db/schema/notifications.ts` + 两条 push 相关索引。

### 2.8 其他

- **saved_view**（P1-16）· **ics_token**（P1-11）· **analytics_event** · **audit_evidence_package**（Phase 1）
- 详细字段参照 PRD §8.1，此处不重复

---

## 3. 关键索引（P95 性能保障）

```sql
-- Dashboard / Obligations 核心
CREATE INDEX idx_oi_firm_due          ON obligation_instance(firm_id, current_due_date);
CREATE INDEX idx_oi_firm_status_due   ON obligation_instance(firm_id, status, current_due_date);
CREATE INDEX idx_oi_firm_tax_due      ON obligation_instance(firm_id, tax_type, current_due_date);
CREATE INDEX idx_oi_firm_assignee_due ON obligation_instance(firm_id, assignee_id, current_due_date);

-- Pulse 匹配
CREATE INDEX idx_client_firm_state        ON client(firm_id, state);
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
CREATE INDEX idx_evidence_firm_time ON evidence_link(firm_id, applied_at DESC);
CREATE INDEX idx_evidence_oi     ON evidence_link(obligation_instance_id);
CREATE INDEX idx_evidence_source ON evidence_link(source_type, source_id);

-- Client readiness portal
CREATE INDEX idx_readiness_doc_item_obligation
  ON obligation_readiness_checklist_item(firm_id, obligation_instance_id);
CREATE INDEX idx_readiness_doc_item_status
  ON obligation_readiness_checklist_item(firm_id, status);
CREATE INDEX idx_readiness_request_oi
  ON client_readiness_request(firm_id, obligation_instance_id, created_at DESC);
CREATE UNIQUE INDEX uq_readiness_request_token
  ON client_readiness_request(token_hash);
CREATE INDEX idx_readiness_response_request
  ON client_readiness_response(firm_id, request_id, submitted_at DESC);

-- AI trace
CREATE INDEX idx_ai_output_firm_time ON ai_output(firm_id, generated_at);
CREATE INDEX idx_ai_output_context   ON ai_output(kind, input_context_ref);
CREATE INDEX idx_llm_log_firm_time   ON llm_log(firm_id, created_at);
CREATE INDEX idx_llm_log_prompt_time ON llm_log(prompt_version, created_at);

-- Dashboard AI Brief materialized read model
CREATE INDEX idx_dashboard_brief_firm_scope_time
  ON dashboard_brief(firm_id, scope, as_of_date, updated_at DESC);
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

-- Pulse feed
CREATE INDEX idx_pulse_status_pub ON pulse(status, published_at DESC);

-- Audit（火热写）
CREATE INDEX idx_audit_firm_time        ON audit_event(firm_id, created_at DESC);
CREATE INDEX idx_audit_firm_actor_time  ON audit_event(firm_id, actor_id, created_at DESC);
CREATE INDEX idx_audit_firm_action_time ON audit_event(firm_id, action, created_at DESC);

-- Penalty 周聚合（Scoreboard）
CREATE INDEX idx_oi_firm_week_exposure ON obligation_instance(
  firm_id, current_due_date, estimated_exposure_cents
) WHERE status NOT IN ('filed', 'paid', 'not_applicable');
CREATE INDEX idx_oi_firm_jurisdiction_due
  ON obligation_instance(firm_id, jurisdiction, current_due_date);
CREATE INDEX idx_oi_profile ON obligation_instance(client_filing_profile_id);

-- Exception overlay（Phase 1）
CREATE INDEX idx_exc_status_effective ON exception_rule(status, effective_from, effective_until)
  WHERE status IN ('applied', 'verified');
CREATE INDEX idx_exc_firm_status ON exception_rule(firm_id, status, effective_from)
  WHERE firm_id IS NOT NULL;

-- Notifications
CREATE INDEX idx_outbox_status        ON email_outbox(status, created_at);
CREATE INDEX idx_notification_digest_run_user_time ON notification_digest_run(user_id, created_at);
-- push_subscription 索引已随 PWA/Web Push 降级移除（见 §2.7 末尾）
```

D1 无 GIN / ivfflat；向量检索走 Vectorize；需要数组 / JSON 过滤时优先拆 helper table 或反范式（如 `has_federal` boolean、`client_tax_type`、`exception_affected_form`），临时 JSON 查询用 `json_each()` 但不得作为高频路径默认方案。

---

## 4. 租户隔离（D1 无 RLS · 三道工程防线）

1. **Middleware 层**：Hono middleware 从 better-auth session 读 `activeOrganizationId`，不存在直接 401
2. **Repo 工厂层**：`scoped(db, firmId)` 是 `packages/db` 唯一对外导出；所有查询在工厂内部硬编码 `WHERE firm_id = :firmId`
3. **oxlint 层**：`apps/server/src/procedures/**` 禁止直接 import `@duedatehq/db` 和 `@duedatehq/db/schema/*`（通过 `no-restricted-imports` 配置）；PR CI 自动 block

`scoped.ts` 强制形态（**约束**）：

```ts
// packages/db/src/scoped.ts
export const scoped = (db: DrizzleDB, firmId: string) => ({
  clients: clientsRepo(db, firmId),
  filingProfiles: clientFilingProfilesRepo(db, firmId),
  obligations: obligationsRepo(db, firmId),
  pulse: pulseRepo(db, firmId),
  migration: migrationRepo(db, firmId),
  evidence: evidenceRepo(db, firmId),
  audit: auditRepo(db, firmId),
  // 每个业务 repo 都在此注入 firmId
})
```

任何 repo 内部**不得**接受其他租户来源；`firmId` 只能从这里传入。

---

## 5. 软删除策略

| 实体                               | 策略                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `client`                           | `deleted_at` 软删；30 天后 Cron 硬删（级联 obligation）                                        |
| `client_filing_profile`            | active profile 移除时写 `archived_at`；migration revert / single undo 可物理删本批新建 profile |
| `obligation_instance`              | 不软删；状态 `not_applicable` 代替                                                             |
| `audit_event`                      | **永不删**（硬约束）                                                                           |
| `migration_batch`                  | `reverted_at` 标记；原始数据 R2 保留 90 天                                                     |
| `pulse`                            | 不删；`status=rejected` 即过滤                                                                 |
| `user` / `organization` / `member` | 由 better-auth 管理；GDPR 请求走其 `deleteUser` API                                            |

---

## 6. Migration 流程（约束）

```
# 1. 改 packages/db/src/schema/*.ts
# 2. 生成迁移
pnpm --filter @duedatehq/db db:generate

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
- Seed 脚本分环境：`db:seed:demo`（幂等）/ rules asset 由 `packages/core` 提供 `FED + 50 states + DC` 覆盖 / `db:seed:pulse`（示例信号）

---

## 7. `due_date_logic` DSL（约束）

```ts
// 枚举所有 MVP 支持的规则类型；不支持的类型不进 verified 池
type DueDateLogic =
  | { type: 'fixed_date'; month: number; day: number }
  | { type: 'nth_day_after_event'; n: number; event: 'formation' | 'tax_year_end' }
  | { type: 'calendar_anchor'; anchor: 'q1' | 'q2' | 'q3' | 'q4' | 'annual'; offset_days?: number }
  | {
      type: 'nth_month_day'
      month: number
      weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
      nth: 1 | 2 | 3 | 4 | -1
    }

interface WeekendHolidayPolicy {
  rollover: 'next_business_day' | 'preceding_business_day' | 'none'
  holiday_calendar: 'us_federal' | 'us_federal_plus_state' | 'none'
}
```

日期计算由 `packages/core/date-logic.ts` 和 `packages/core/tax-periods` 纯函数完成，零运行时依赖。Fiscal-year / short-year return deadlines 先解析 obligation tax period，再把 `tax_period_end` 输入 rule DSL。自动生成的新 obligation 默认 calendar；导入回填或年度 rollover 可从既有 obligation period 带出 fiscal period。CPA 在 obligation Readiness 中调整单个 obligation 的 `tax_year_type` 和 fiscal year end，保存时重算 tax period、statutory due date、internal due date 与 exposure。

---

## 8. D1 约束速查

| 约束                 | 值                                | 工程缓解                                                      |
| -------------------- | --------------------------------- | ------------------------------------------------------------- |
| 单库大小             | 10 GB                             | 接近阈值前按 firm / region 分库；不要假设单库长期承载全部租户 |
| 单查询返回行数       | 10 万                             | 所有列表强制分页（50 / 100 / 200）                            |
| 单 invocation 查询数 | Workers Paid 约 1000（Free 更低） | Migration / Pulse 分批；每批优先 100–200 prepared statements  |
| 单 SQL 绑定参数      | 100                               | 大 `IN (...)` 拆批或写入临时/helper 表                        |
| 单请求 CPU           | 30s（付费 5min）                  | 长计算拆 Queue / Workflow                                     |
| 无原生 vector        | —                                 | Vectorize                                                     |
| 无原生 JSON 索引     | —                                 | 反范式冗余 boolean / 拆表                                     |
| 无 RLS               | —                                 | `scoped(db, firmId)` 工厂强制                                 |

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

- `drizzle-kit studio` 可视化 schema + 查询
- `wrangler d1 execute duedatehq --local --command "SELECT ..."` ad-hoc SQL
- `pnpm db:seed:demo` 幂等 seed（Sprint Playbook 的 Demo Data 模块依赖）

---

继续阅读：[04-AI-Architecture.md](./04-AI-Architecture.md)
