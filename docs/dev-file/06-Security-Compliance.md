# 06 · Security & Compliance

> 对齐 PRD §13 + §3.6.3（RBAC 矩阵）+ §6C（Audit Package）。
> 核心纪律：**三层防御（Session / Scoped Repo / Lint）· 最小必要数据 · 审计永不删。**
> Auth 基座：**better-auth + Organization plugin + Access Control plugin + twoFactor plugin**。

---

## 1. 威胁模型（STRIDE 速览）

| 威胁                | 场景                            | 缓解                                                                                                                                |
| ------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **S**poofing        | 伪冒 CPA 登录                   | Google / Microsoft OAuth + device/IP fingerprint；Owner TOTP 在 production Owner-only 操作前强制，Manager TOTP 随 Team Phase 1 强制 |
| **T**ampering       | 篡改 `current_due_date` / Pulse | Phase 1 Overlay 独立留痕不改 base；所有变更写 `audit_event`（永不删）                                                               |
| **R**epudiation     | "不是我改的"                    | `audit_event` 记 actor + request-level ip_hash + ua_hash                                                                            |
| **I**nfo disclosure | 跨 firm 数据泄露                | Middleware + `scoped(db, firmId)` + oxlint 三层                                                                                     |
| **D**oS             | Ask 恶意构造 query              | Rate Limit binding + DSL 白名单 + 3s 超时                                                                                           |
| **E**levation       | Preparer 跑 Owner 操作          | better-auth Access Control plugin 校验（Phase 1）                                                                                   |

---

## 2. Auth 设计（better-auth）

### 2.1 核心插件

| 插件                                       | 用途                                                    |
| ------------------------------------------ | ------------------------------------------------------- |
| `emailOTP`                                 | 邮箱验证码 passwordless 登录/注册；仅开放 sign-in OTP   |
| `socialProviders.google` + `oneTap`        | Google OAuth 登录与 Google One Tap ID token callback    |
| `genericOAuth.microsoft-entra-id`          | Microsoft Entra ID / Microsoft 365 登录                 |
| `organization`                             | 多租户（= Firm）+ Member + Invitation + Active-org 切换 |
| 自定义 Access Control（`organization.ac`） | 五角色权限矩阵                                          |
| `twoFactor`                                | 可选 TOTP MFA；启用后登录 session 必须完成二次验证      |

### 2.2 Session & Cookie

- Cookie：`httpOnly` · `secure` · `sameSite=lax`
- Session 存 D1；默认有效期 7 天
- `session.activeOrganizationId` = 当前 Firm；前端切换 / 创建 / 删除 Firm 必须走 DueDateHQ `firms.*` gateway，服务端再按需调用 Better Auth organization API 或写 session
- 双设备会话允许；Account Security 列所有 session，可撤销单个 session 或其他 session
- 已启用 MFA 的用户登录时走 DueDateHQ `/two-factor` challenge；项目接口权限只由 tenant + role 决定，不因为 MFA 开/关额外拦截
- Email OTP 只允许 `type='sign-in'`，验证码 6 位、5 分钟过期；新邮箱验证通过后自助注册并进入 onboarding。验证码存入 Better Auth `verification` 表，限流走 `rate_limit` 表，无新增 auth schema。

### 2.3 Invitation 流

- Members 管理走 DueDateHQ `members.*` gateway：前端不直接调 Better Auth organization/member API；Better Auth hooks 作为绕过 gateway 时的 role / active firm / seat 底线
  app 不依赖 Resend key
- Owner 在 Members 发邀请 → better-auth 生成 token + 入 `invitation` 表
- 邀请邮件由 `sendInvitationEmail` hook 经 Resend 发出
- `RESEND_API_KEY` 仅在实际发送 auth email 时必需；development 缺 key 时打印到
  console，非 development 的发送路径会失败
- Resend delivery callback 只在配置 `RESEND_WEBHOOK_SECRET` 后启用；`/api/webhook/resend`
  使用原始 payload 与 Svix headers 验签后才回写 `email_outbox` 状态
- 接受：点链接 → `/accept-invite?id=...` → Email OTP 或 SSO 登录后调用 `/api/auth/organization/accept-invitation`
- 拒绝 / 撤销：`cancelInvitation` / `rejectInvitation`
- 过期：默认 14 天

### 2.4 MFA（optional account security）

- `twoFactor` plugin；TOTP + 10 条 recovery codes
- `/account/security` 可通过 QR code 扫码启用 MFA，保留 setup URI fallback，可复制 recovery codes，并管理 active sessions
- `/two-factor` 承接已启用 MFA 用户的登录二次验证；OAuth 登录不会走 Better Auth email sign-in 的 `twoFactorRedirect` hook，所以 `protectedLoader` 用 session 上的 `twoFactorVerified` 做应用层 gate
- MFA 是用户可选账户安全项；关闭 MFA 后不会让 members / firm / billing / audit 等项目接口因为 MFA 额外失败
- `two_factor.secret` / `backup_codes` 由 Better Auth 管理；session 额外记录当前登录是否完成 MFA 验证

---

## 3. RBAC（Access Control · Phase 1 强制）

当前共享权限矩阵落在 `@duedatehq/core/permissions`，前后端都从同一张
`FirmPermission -> FirmRole[]` 表派生判断。Worker 的 `requireCurrentFirmRole` /
`requirePermission` 仍是安全边界；SPA 的 `PermissionGate` 只负责禁用必然失败的查询和渲染
“可见但受限”的权限说明。

### 3.1 五角色 + 权限 statement（约束）

```ts
// packages/auth/permissions.ts（业务约束，不是示例）
const statement = {
  client: ['create', 'read', 'update', 'delete'],
  obligation: ['read', 'update:status', 'update:assignee'],
  pulse: ['read', 'approve', 'batch_apply', 'revert'],
  migration: ['run', 'revert'],
  rule: ['read', 'report_issue'],
  member: ['invite', 'suspend', 'remove', 'change_role'],
  billing: ['read', 'update'],
  audit: ['read', 'export'],
  dollars: ['read'],
} as const
```

### 3.2 角色权限矩阵

| 资源 · 动作                  | owner | partner | manager | preparer             | coordinator               |
| ---------------------------- | ----- | ------- | ------- | -------------------- | ------------------------- |
| `client.create`              | ✓     | ✓       | ✓       | ✓                    | —                         |
| `client.read`                | ✓     | ✓       | ✓       | ✓                    | ✓                         |
| `obligation.update:status`   | ✓     | ✓       | ✓       | ✓（仅自己 assignee） | —                         |
| `obligation.update:assignee` | ✓     | ✓       | ✓       | —                    | —                         |
| `pulse.approve`              | ✓     | ✓       | ✓       | —                    | —                         |
| `pulse.batch_apply`          | ✓     | ✓       | ✓       | —                    | —                         |
| `pulse.revert`               | ✓     | ✓       | ✓       | —                    | —                         |
| `migration.run`              | ✓     | ✓       | ✓       | ✓                    | —                         |
| `migration.revert`           | ✓     | ✓       | ✓       | —                    | —                         |
| `member.invite`              | ✓     | —       | —       | —                    | —                         |
| `member.change_role`         | ✓     | —       | —       | —                    | —                         |
| `billing.read`               | ✓     | —       | ✓       | —                    | —                         |
| `billing.update`             | ✓     | —       | —       | —                    | —                         |
| `audit.read`                 | ✓     | ✓       | ✓       | ✓                    | —                         |
| `audit.export`               | ✓     | —       | —       | —                    | —                         |
| `dollars.read`               | ✓     | ✓       | ✓       | ✓                    | 默认 ✗；firm 开关打开才 ✓ |
| `export.evidence_package`    | ✓     | —       | —       | —                    | —                         |

**边界原则：** Partner 是事务所业务角色，覆盖 final review、extension approval、risk sign-off、
Pulse/Rules 业务确认和补救动作；Owner 是 SaaS account / billing / firm 管理角色。Partner
不自动继承 billing、member management、firm delete 或全 firm export。Members v1 mutation
网关当前只允许 Owner；Manager/Partner 成员管理可在 P1 重新评估。

### 3.3 前端无权限交互

- 导航入口不隐藏；用户可以进入 URL，但整页无权限时显示统一面板，不 redirect。
- 整页 gate 必须在权限不足时阻止对应业务 RPC query，例如 manager 访问 Members 时不调用
  `members.listCurrent`，coordinator 访问 Audit 时不调用 `audit.list`。
- 局部只读区域使用 inline notice；按钮、menu item、command palette item 保留但 disabled，
  并展示所需角色说明。
- `FORBIDDEN`、`FIRM_FORBIDDEN`、`MEMBER_FORBIDDEN` 对用户翻译成权限文案，不直接展示错误码。

### 3.4 权限检查（P0 Owner-only，Phase 1 完整矩阵）

- 7 天 Demo / P0 早期：必须检查 session、active firm、tenant scope；client / migration / obligation 写入口已在服务端按 role gate 收口，且所有写操作写 audit
- 真实试点前：危险写操作按 RBAC 矩阵校验（migration/pulse revert = Owner + Manager，export / billing / ownership = Owner）；MFA 保持账户可选项
- Phase 1 在每个 oRPC procedure middleware 中加 `authed.use(requirePermission('client.delete'))`，启用五角色矩阵
- 失败 → 写 `audit_event(action='auth.denied', reason=...)` + 返回 `ORPCError('FORBIDDEN')`

---

## 4. 租户隔离（D1 无 RLS · 三道工程防线）

### 4.1 Middleware 层

- `sessionMiddleware` 从 better-auth session 读 `activeOrganizationId`，写入 `c.var.firmId`
- `tenantMiddleware` 拒绝缺 active firm（401）、非成员（403）、`member.status !== 'active'`（403）
- `tenantMiddleware` 读取 `firm_profile`；若 org + active membership 存在但 profile 缺失，则 lazy create 自愈
- `firm_profile.status !== 'active'` → `TENANT_SUSPENDED`
- 注入 `c.set('tenantContext', ...)` + `c.set('scoped', scoped(db, firmId))`
- `firms.*` RPC 是租户选择层例外：`listMine / create / switchActive / updateCurrent / softDeleteCurrent` 只要求 authenticated session + active membership 校验，不要求当前 `tenantContext`。这些 procedure 是前端唯一 firm lifecycle 入口，统一管理 `organization / member / firm_profile / session.activeOrganizationId`，并过滤 `firm_profile.status='deleted'` 的 soft-deleted firm。
- `members.*` RPC 不 bypass tenant middleware；它只管理当前 active firm，且 Members v1 mutation 统一 Owner-only、写 audit、按 `firm_profile.seatLimit` 校验 seat。

### 4.2 Repo 工厂层（约束）

- `scoped(db, firmId)` 是 `packages/db` 唯一对外导出
- 所有 repo 内部硬编码 `WHERE firm_id = :firmId`
- `firmId` 只能从 middleware 注入，不能从 procedure `input` 接
- 跨 firm 的 `makeFirmsRepo(db)` 只能用于租户选择和 firm profile 管理；不得复用为业务数据后门。
- 若 tenant-scoped row 同时引用另一张 tenant-scoped 表（例如 obligation → client、evidence → obligation），repo 必须在写入前验证 parent row 属于同一个 `firmId`，避免只靠单列 FK 产生跨租户错连

### 4.3 Lint 层（静态隔离）

运行位置不是独立的 `oxlintrc.json`，而是 `vp check` 执行流里的 ESLint plugin
配置 —— 真实落点在 **[`vite.config.ts`](/vite.config.ts) 根配置的 `lint` 块**
（`plugins: ['oxc', 'typescript', 'react', 'import', 'unicorn']`），规则与既有
overrides 一并声明：

```ts
// vite.config.ts（摘录）
lint: {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@duedatehq/db/schema', '@duedatehq/db/schema/*'],
            message: 'Use context.vars.scoped instead of directly importing schema in procedures.',
          },
        ],
      },
    ],
  },
  overrides: [
    // 允许 db 内部、jobs、webhooks、seed 直接访问 schema。
    { files: ['packages/db/**'], rules: { 'no-restricted-imports': 'off' } },
    {
      files: ['apps/server/src/jobs/**', 'apps/server/src/webhooks/**', 'packages/db/seed/**'],
      rules: { 'no-restricted-imports': 'off' },
    },
    {
      files: ['apps/server/src/procedures/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@duedatehq/db', '@duedatehq/db/*'],
                message:
                  'Procedures must use context.vars.scoped / tenantContext instead of importing @duedatehq/db directly.',
              },
            ],
          },
        ],
      },
    },
    // packages/core 额外禁用 drizzle / hono / @duedatehq/db 任意子路径，
    // packages/contracts 额外只允许 zod + @orpc/contract，
    // packages/ai 禁 @duedatehq/db —— 全部写在同一块 overrides 里。
  ],
},
```

**运行时双闸门**（4.1/4.2）+ **静态层 lint 闸门**（4.3）= 三层 tenant isolation
（§4 开头的措辞与此对齐）。任何 procedure 里的 `import '@duedatehq/db'`
或 `import '@duedatehq/db/schema/xxx'` 会被 `vp check` 直接 block，不依赖独立的
`oxlintrc.json` 文件。

Procedure 需要表达 repo / tenant 类型时，使用 type-only `@duedatehq/ports/<domain>`；
`@duedatehq/ports` 不提供根入口，避免形成 barrel API。该包只包含 TypeScript port
contract，不包含 Drizzle schema、DB factory 或 Worker runtime；
不得再用 `import('@duedatehq/db').ScopedRepo` 这类动态类型 import 绕过边界规则。

> **注意**：`packages/auth` 不能依赖 `@duedatehq/db` 由
> `scripts/check-dep-direction.mjs` 复校。hook 闭包因此必须在 server 层组装（见 ADR 0010 §Decision），
> [`apps/server/src/organization-hooks.ts`](/apps/server/src/organization-hooks.ts) /
> [`apps/server/src/session-hooks.ts`](/apps/server/src/session-hooks.ts) 是唯二
> 的写入面。`scripts/check-dep-direction.mjs` 以 workspace 粒度复校这条边界
> （PR CI 跑 `pnpm check:deps`）。

---

## 5. PII 数据保护

### 5.1 最小必要数据（MVP）

| 字段         | 收？ | 备注                                              |
| ------------ | ---- | ------------------------------------------------- |
| 客户姓名     | ✓    | 必要；显示用                                      |
| EIN          | ✓    | 必要；做去重                                      |
| 客户邮箱     | ✓    | 用于 Reminder / Readiness                         |
| 客户地址     | ✗    | 不收；税务计算不依赖                              |
| SSN / ITIN   | ✗    | **严禁**，任何理由都不收                          |
| 客户财务数据 | ✗    | 仅 `estimated_tax_liability` 可选输入（分级存储） |
| IP / UA      | hash | `sha256(ip)` + `sha256(ua)`；不存明文             |

### 5.2 进 AI SDK 之前的 PII 占位

- `client.name` / `client.ein` / `client.email` 在 prompt 中替换为 `{{client_N}}` / `{{ein_N}}` / `{{email_N}}`
- 保留 `piiMap` 在服务端内存
- AI SDK 返回后 Guard 回填
- `ai_output.input_hash` 存 sha256，不存原文
- 这是 IRC §7216 + FTC Safeguards Rule 的工程落地

### 5.3 加密

- At rest：D1 底层 encryption at rest 由 Cloudflare 提供
- In transit：HTTPS / TLS 1.3
- 应用层敏感字段（`mfa_secret`，Phase 1）：AES-GCM-256，key 来自 Worker secret
- R2 对象默认加密；Audit ZIP（Phase 1）额外 AES-256 加客户提供的密码（可选）

---

## 6. Audit Event 规范

### 6.1 Action 枚举（只增不删）

```
auth.login.success / auth.login.failed / auth.denied / auth.mfa.setup.started / auth.mfa.enabled / auth.mfa.disabled / auth.session.revoked
client.created / client.batch_created / client.updated / client.deleted / client.restored
obligation.status.updated / obligation.readiness.updated / obligation.batch_created / obligation.assignee.changed
pulse.ingest / pulse.extract / pulse.approve / pulse.reject / pulse.dismiss / pulse.quarantine
pulse.apply / pulse.revert
migration.batch.created / migration.mapper.confirmed / migration.normalizer.confirmed
migration.matrix.applied / migration.imported / migration.reverted / migration.single_undo
exception.apply / exception.revert           ← Phase 1
rule.updated / rule.verified                 ← Phase 1（Rules-as-Asset）
member.invited / member.accepted / member.suspended / member.removed / member.role.updated
member.invitation.canceled / member.invitation.resent
billing.subscribe / billing.cancel           ← Phase 1
export.evidence_package / export.firm_audit
ai.refusal / ai.guard_failed
```

### 6.2 字段

- `firm_id` · `actor_id`（可为 NULL，系统任务）
- `entity_type` · `entity_id`
- `action`
- `before_json` · `after_json`（完整快照；字段差异由前端展示层计算）
- `reason`
- `ip_hash` · `ua_hash`
- `created_at`

### 6.3 纪律

- `audit_event` **硬约束不删**；任何 migration / 运维脚本禁止 `DELETE FROM audit_event`
- 写入永远走 `packages/db/audit-writer.ts` 的 `writeAudit(input, tx?)`，不允许其他入口
- Pulse Apply / Migration Import 等批量操作必须在同一事务写 audit
- Tenant-scoped RPC 请求由 middleware 从 `cf-connecting-ip`（fallback:
  `x-forwarded-for` 第一项、`x-real-ip`）和 `user-agent` 生成 `AUTH_SECRET` 加盐
  SHA-256 hash，并作为默认 metadata 注入 `scoped.audit.write/writeBatch`；不存明文 IP / UA
- 读取永远走 `audit.list` / `scoped.audit.list`，由 repo 层硬编码 `firm_id = scoped.firmId`；
  Audit Log 页面只显示 hash 后的 IP / UA，不显示明文设备指纹，也不展示 raw practice id

---

## 7. Client Readiness Portal 安全（Phase 1）

- Signed portal token ≥ 32 bytes 随机
- URL 形态：`/portal/:orgSlug/:requestId?t=<token>`
- 过期默认 14 天；可撤销（`revoked_at`）
- 客户响应不登录，仅凭 token；每次写 `audit_event(action='readiness.client_response')`
- 速率限制：同一 token 每分钟 ≤ 10 次
- CSP 严格：不允许客户响应页加载任何外部脚本

---

## 8. Audit-Ready Evidence Package（Phase 1）

- 一键导出 ZIP：包含 PDF 报告 + CSV audit trail + SHA-256 签名文件
- 生成过程：Queue 触发 → Worker 拉数据 → 打包 → 上传 R2 → 返回 signed URL（7 天过期）
- 签名：
  - 文件清单 JSON + 每个文件 sha256 → 整体清单 sha256
  - 预留 Phase 2 接 RFC 3161 TSA（可信时间戳）
- 权限：仅 Team / Enterprise plan 的 `owner` 可导出；Solo / Pro 在前端禁用导出按钮，
  hover tooltip 说明计划要求，后端仍以 plan gate + owner guard 为最终裁定

---

## 9. WISP（Written Information Security Plan）

IRS Publication 4557 要求。7 天 Demo 可以提交 1 页 draft；真实 CPA 试点 / 4 周 MVP 必须交 5 页 WISP v1.0，放仓库 `docs/compliance/WISP-v1.pdf`，内容要点：

- 数据分类（PII / 财务 / 审计）
- 访问控制（better-auth RBAC）
- 加密策略（TLS + at-rest）
- 备份与恢复（D1 time-travel + R2 版本化）
- 事故响应流程（§13）
- 员工培训记录（Phase 1 团队扩张时启用）
- 年度审查制度

---

## 10. 合规"红线"硬编码检查

在 `packages/ai/guard.ts` 的黑名单里固化：

| 红线                           | 触发         | 处理                         |
| ------------------------------ | ------------ | ---------------------------- |
| "your client qualifies"        | AI 下结论    | refusal + audit `ai.refusal` |
| "no penalty will apply"        | 承诺无罚款   | refusal                      |
| "this is tax advice"           | 自称税务建议 | refusal                      |
| "ai confirmed"                 | 伪权威       | refusal                      |
| "this deadline is guaranteed"  | 绝对承诺     | refusal                      |
| SSN 正则 `/\d{3}-\d{2}-\d{4}/` | 用户误输入   | 前端拦截 + 后端二次校验拒绝  |
| 信用卡号正则（Luhn）           | 误输入       | 同上                         |

---

## 11. Rate Limit（Cloudflare 原生 binding）

| 场景                      | 限制                                  |
| ------------------------- | ------------------------------------- |
| Google OAuth 登录发起     | 同 IP 10/min · 同 user agent 20/min   |
| Google OAuth callback     | Better Auth state 校验 + 同 IP 30/min |
| oRPC procedure（普通）    | 每 user 120/min                       |
| oRPC procedure（AI 调用） | 每 user 20/min · 每 firm 200/day      |
| Pulse Approve             | 每 user 30/min                        |
| Readiness Portal 响应     | 同 token 10/min                       |
| Webhook 入站              | 按签名源 60/min                       |

超限返回 `429` + `Retry-After`。

---

## 12. Secret 管理

- **本地**：`.env.local`（gitignore），1Password Shared Vault 同步给团队
- **Staging / Production**：`wrangler secret put <KEY>`
- **轮换**：季度轮换 `AUTH_SECRET`；轮换流程先新增 secondary → 验证 → 删除 primary（原 `VAPID_PRIVATE_KEY` 已随 Web Push 从 Phase 0 移除）
- **扫描**：pre-commit hook 跑 `gitleaks` 扫明文 key；CI 阶段再扫一次

---

## 13. 事件响应（IR Playbook · 摘要）

| 级别 | 定义                                             | 响应 SLA                               |
| ---- | ------------------------------------------------ | -------------------------------------- |
| P0   | 数据泄露 / 账号被盗 / 全站宕机                   | 15 分钟响应 · 4 小时缓解 · 24 小时 RCA |
| P1   | 单租户数据错乱 / Auth 异常 / AI 发出合规红线内容 | 1 小时响应 · 24 小时缓解               |
| P2   | 个别 feature 故障                                | 次工作日响应                           |

响应步骤：Detect（Sentry 告警 / 用户上报）→ Contain（Wrangler rollback 或 feature flag off）→ Eradicate → Recover → Lessons（写 `docs/incidents/YYYYMMDD-<slug>.md`）。

---

## 14. 合规目标路线图

| Phase     | 目标                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| 7 天 Demo | PII 最小化 · TLS · Audit 不删 · Glass-Box Guard · Secret 管理 · WISP 1-page draft                               |
| Phase 0   | Owner-only tenant isolation · optional account MFA · WISP v1.0 · dangerous write role check · `ai_output` trace |
| Phase 1   | 完整四角色 RBAC · Manager MFA · Audit-Ready Evidence Package · CSP strict · Readiness Portal 安全               |
| Phase 2   | RFC 3161 TSA 可信时间戳 · SOC 2 Type I 审计 · Pen-test                                                          |

---

继续阅读：[07-DevOps-Testing.md](./07-DevOps-Testing.md)
