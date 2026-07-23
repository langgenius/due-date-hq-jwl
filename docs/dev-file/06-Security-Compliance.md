# 06 · Security & Compliance

> 最后核对：2026-06-10

> 对齐 PRD §13 + §3.6.3（RBAC 矩阵）+ §6C（Audit Package）。
> 核心纪律：**三层防御（Session / Scoped Repo / Lint）· 最小必要数据 · 审计永不删。**
> Auth 基座：**better-auth + Organization plugin + Access Control plugin + twoFactor plugin**。

---

## 1. 威胁模型（STRIDE 速览）

| 威胁                | 场景                            | 缓解                                                                                                                                                                                           |
| ------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S**poofing        | 伪冒 CPA 登录                   | Google OAuth + Email OTP（Microsoft Entra ID 配置后可用）；session 记录 IP / UA；TOTP MFA 用户可选，启用后登录强制 `/two-factor` challenge；Owner/Manager 操作级强制 step-up 仍是 Phase 1 计划 |
| **T**ampering       | 篡改 `current_due_date` / Pulse | Phase 1 Overlay 独立留痕不改 base；所有变更写 `audit_event`（永不删）                                                                                                                          |
| **R**epudiation     | "不是我改的"                    | `audit_event` 记 actor + request-level ip_hash + ua_hash                                                                                                                                       |
| **I**nfo disclosure | 跨 firm 数据泄露                | Middleware + `scoped(db, firmId)` + oxlint 三层                                                                                                                                                |
| **D**oS             | 恶意高频请求 / AI 滥用          | Worker Rate Limit binding（100/min/key）+ Better Auth rate limit + per-plan AI 日运行配额（§11）                                                                                               |
| **E**levation       | Preparer 跑 Owner 操作          | procedure 内 `requireCurrentFirmRole` / `requirePermission`（已上线）+ better-auth Access Control plugin 底线                                                                                  |

---

## 2. Auth 设计（better-auth）

### 2.1 核心插件

| 插件                                       | 用途                                                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `emailOTP`                                 | 邮箱验证码 passwordless 登录/注册；仅开放 sign-in OTP                                                                                  |
| `socialProviders.google` + `oneTap`        | Google OAuth 登录与 Google One Tap ID token callback                                                                                   |
| `genericOAuth.microsoft-entra-id`          | Microsoft Entra ID / Microsoft 365 登录（仅当 `MICROSOFT_CLIENT_ID/SECRET` 配置时注册；`/api/auth-capabilities` 告知前端是否显示按钮） |
| `organization`                             | 多租户（= Firm）+ Member + Invitation + Active-org 切换                                                                                |
| 自定义 Access Control（`organization.ac`） | 五角色权限矩阵                                                                                                                         |
| `twoFactor`                                | 可选 TOTP MFA；启用后登录 session 必须完成二次验证                                                                                     |

### 2.2 Session & Cookie

- Cookie：`httpOnly` · `secure` · `sameSite=lax`
- Session 存 D1；默认有效期 7 天
- `session.activeOrganizationId` = 当前 Firm；前端切换 / 创建 / 删除 Firm 必须走 DueDateHQ `firms.*` gateway，服务端再按需调用 Better Auth organization API 或写 session
- 双设备会话允许；Account Security 列所有 session，可撤销单个 session 或其他 session
- 已启用 MFA 的用户登录时走 DueDateHQ `/two-factor` challenge；项目接口权限只由 tenant + role 决定，不因为 MFA 开/关额外拦截
- Email OTP 只允许 `type='sign-in'`，验证码 6 位、5 分钟过期；新邮箱验证通过后自助注册并进入 onboarding。验证码存入 Better Auth `verification` 表，限流走 `rate_limit` 表，无新增 auth schema。
- Email OTP 发信时通过请求 header 传入 post-login continuation；服务端在 AsyncLocalStorage
  request scope 内只接受最长 2048 字符的 same-origin app path，拒绝 absolute URL、`//host`、
  `/api/*` 与 `/rpc/*`，再写进邮件 `continue=`。因此普通 `redirectTo` 和 canonical
  `/alerts?ref=<base64url>` 都能跨邮箱标签页恢复，而不扩大 open-redirect 面。

### 2.3 Invitation 流

- Members 管理走 DueDateHQ `members.*` gateway：前端不直接调 Better Auth organization/member API；Better Auth hooks 作为绕过 gateway 时的 role / active firm / seat 底线
- Owner 在 Members 发邀请 → better-auth 生成 token + 入 `invitation` 表
- 邀请邮件由 `sendInvitationEmail` hook 经 Resend 发出
- `RESEND_API_KEY` 仅在实际发送 auth email 时必需；development 缺 key 时打印到
  console，非 development 的发送路径会失败
- Resend delivery callback 只在配置 `RESEND_WEBHOOK_SECRET` 后启用；`/api/webhook/resend`
  使用原始 payload 与 Svix headers 验签后才回写 `email_outbox` 状态
- 接受：点链接 → `/accept-invite?id=...` → Email OTP 或 SSO 登录后调用 `/api/auth/organization/accept-invitation`
- 撤销 / 重发：`members.cancelInvitation` / `members.resendInvitation`；无 reject 接口，受邀人不接受即过期
- 过期：默认 7 天（`invitationExpiresIn`）；重新邀请自动取消旧的 pending 邀请（`cancelPendingInvitationsOnReInvite`）

### 2.4 MFA（optional account security）

- `twoFactor` plugin；TOTP + 10 条 recovery codes
- `/account/security` 可通过 QR code 扫码启用 MFA，保留 setup URI fallback，可复制 recovery codes，并管理 active sessions
- `/two-factor` 承接已启用 MFA 用户的登录二次验证；OAuth 登录不会走 Better Auth email sign-in 的 `twoFactorRedirect` hook，所以 `protectedLoader` 用 session 上的 `twoFactorVerified` 做应用层 gate；challenge 当前只接受 TOTP 码（recovery-code 登录分支暂缓，锁定用户走 support 邮箱重置）
- MFA 是用户可选账户安全项；关闭 MFA 后不会让 members / firm / billing / audit 等项目接口因为 MFA 额外失败
- `two_factor.secret` / `backup_codes` 由 Better Auth 管理；session 额外记录当前登录是否完成 MFA 验证

### 2.5 X Social Alert acquisition boundary

- `ref_token` 是不可猜的关联 id，不是授权：匿名 `GET /api/social-alerts/:ref/teaser` 只在对应
  social post 已 `published` 时返回 X 已公开的 `teaser / agency / jurisdiction`，不返回完整
  summary、官方 source URL、Pulse id、client match 或 firm Alert id。
- 登录后的 `pulse.resolveSocialAlert({ref})` 必须经过 session + active firm + tenant middleware；
  repo 只返回/创建当前 `firmId` 的 `pulse_firm_alert`。相同 ref 给不同 firm 的结果 id 不同。
- 新建零匹配 Alert 只用于让该 firm 查看 source-backed Alert；不触发 email、不复制客户数据，
  也不改变 global Pulse。source revoked、sample 或非 approved Pulse 不能解析。
- `/api/ops/social/*` 与 `/api/e2e/*` 完全分钥匙：非 development 只接受
  `Authorization: Bearer <SOCIAL_OPS_TOKEN>`，token 缺失/错误统一 404。approve 还必须提交真实
  Better Auth reviewer user id；X OAuth credential 从不进入 ops request、D1、URL 或日志。
- 公开仓库中的固定 GitHub Issue 是刻意新增的 pre-publication review surface。default-branch
  workflow 只允许把通过同一 eligibility/PII guard 的确定性 X copy、非锁定 queue horizon 和
  operator approve command 镜像为 comment；禁止输出 raw queue row、Pulse/source detail、
  reviewer、firm/client/email 或任何 credential。正文放在 Markdown code block，避免自动链接
  与 `@mention`，但其中 tracked ref URL 仍会在正式 X 发布前公开且可被索引；手工复制访问会污染
  `utm_source=x` 归因。ref 仍只是 locator，不是读取 Alert 的授权。
- GitHub 可见性与审核授权完全分离：comment、reaction、label、close/reopen 都不能触发
  `draft -> ready`。唯一批准路径仍要求 Social bearer + 真实 reviewer user id；已公开的历史
  comment 不会因后续 cancel、source revoke 或 Pulse 失效而自动删除。
- `verify-account` 与 `publish-now` 的 preflight 使用 OAuth 1.0a 签名读取 X `/2/users/me`；响应
  只回传 user id / username。`publish-now` 在 Post/Pulse 校验和账号核验都通过后才 claim D1
  日槽，远端写操作仍由 `SOCIAL_QUEUE` 执行。

---

## 3. RBAC（Access Control · 五角色矩阵已上线）

当前共享权限矩阵落在 `@duedatehq/core/permissions`，前后端都从同一张
`FirmPermission -> FirmRole[]` 表派生判断。Worker 的 `requireCurrentFirmRole` /
`requirePermission` 仍是安全边界；SPA 的 `PermissionGate` 只负责禁用必然失败的查询和渲染
“可见但受限”的权限说明。

### 3.1 五角色 + 权限 statement（约束）

```ts
// packages/auth/src/permissions.ts（业务约束，不是示例；实际 statement 还
// spread 了 better-auth defaultStatements，并在 member 上保留 plugin 自带的
// create/update/delete）
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

| 资源 · 动作                                             | owner | partner | manager | preparer | coordinator               |
| ------------------------------------------------------- | ----- | ------- | ------- | -------- | ------------------------- |
| `client.create`                                         | ✓     | ✓       | ✓       | ✓        | —                         |
| `client.read`                                           | ✓     | ✓       | ✓       | ✓        | ✓                         |
| `obligation.update:status`                              | ✓     | ✓       | ✓       | ✓        | —                         |
| `obligation.update:assignee`                            | ✓     | ✓       | ✓       | ✓        | —                         |
| `pulse.approve`                                         | ✓     | ✓       | ✓       | —        | —                         |
| `pulse.batch_apply`                                     | ✓     | ✓       | ✓       | —        | —                         |
| `pulse.revert`                                          | ✓     | ✓       | ✓       | —        | —                         |
| `migration.run`                                         | ✓     | ✓       | ✓       | ✓        | —                         |
| `migration.revert`                                      | ✓     | ✓       | ✓       | —        | —                         |
| `member.invite`                                         | ✓     | —       | —       | —        | —                         |
| `member.change_role`                                    | ✓     | —       | —       | —        | —                         |
| `billing.read`                                          | ✓     | —       | —       | —        | —                         |
| `billing.update`                                        | ✓     | —       | —       | —        | —                         |
| `audit.read`                                            | ✓     | ✓       | ✓       | ✓        | —                         |
| `audit.export`                                          | ✓     | —       | —       | —        | —                         |
| `dollars.read`                                          | ✓     | ✓       | ✓       | ✓        | 默认 ✗；firm 开关打开才 ✓ |
| `export.audit_package`（同 `audit.export` + plan gate） | ✓     | —       | —       | —        | —                         |

**边界原则：** Partner 是事务所业务角色，覆盖 final review、extension approval、risk sign-off、
Pulse/Rules 业务确认和补救动作；Owner 是 SaaS account / billing / firm 管理角色。Partner
不自动继承 billing、member management、firm delete 或全 firm export。Members v1 mutation
网关当前只允许 Owner；Manager/Partner 成员管理可在 P1 重新评估。

**层级单调性（2026-06-11 起强制）：** 权限集合沿 Owner > Partner >= Manager > Preparer >
Coordinator 向上封闭——任何权限一旦对某角色拒绝，其下所有角色必须同样拒绝（core 测试
`keeps every permission upward-closed along the role hierarchy` 锁定）。历史违规已收口：
`billing.read` 曾是 owner+manager（跳过 partner），现回归 Owner-only（恢复 PRD §3.6.3 边界，
billing-hooks `list-subscription`、firms `listSubscriptions`、better-auth manager 角色同步）；
better-auth 角色定义中 manager 曾持有 `audit:export`、coordinator 曾持有
`obligation:update:assignee`（preparer 反而没有），均已与 core 矩阵对齐。逾期提醒升级
（`jobs/reminders/dispatch.ts`）与 deadline input request 收件人（owner/partner/manager）
也已把 partner / manager 补进对应档位。席位收缩（`seatOverflowMemberIds`）按角色层级
从低到高挂起，同级按加入时间新者先停，owner 永不挂起。

> 注：status 与 assignee 写操作在代码里共用同一权限组（`obligation.status.update` →
> `OBLIGATION_STATUS_WRITE_ROLES`，含 preparer）；preparer 的「仅自己 assignee」细粒度限制未实现。
> core 矩阵另有 `firm.update / firm.delete / firm.priority.update / firm.calendar.manage` 等
> firm 级权限未列入上表（均为 Owner，calendar.manage 为 Owner/Partner/Manager）。

### 3.3 前端无权限交互

- 导航入口不隐藏；用户可以进入 URL，但整页无权限时显示统一面板，不 redirect。
- 整页 gate 必须在权限不足时阻止对应业务 RPC query，例如 manager 访问 Members 时不调用
  `members.listCurrent`，coordinator 访问 Audit 时不调用 `audit.list`。
- 局部只读区域使用 inline notice；按钮、menu item、command palette item 保留但 disabled，
  并展示所需角色说明。
- `FORBIDDEN`、`FIRM_FORBIDDEN`、`MEMBER_FORBIDDEN` 对用户翻译成权限文案，不直接展示错误码。

### 3.4 权限检查（P0 Owner-only，Phase 1 完整矩阵）

- 7 天 Demo / P0 早期：必须检查 session、active firm、tenant scope；client / migration / obligation 写入口已在服务端按 role gate 收口，且所有写操作写 audit
- 真实试点前：危险写操作按 RBAC 矩阵校验（migration/pulse revert = Owner / Partner / Manager，export / billing / ownership = Owner）；MFA 保持账户可选项
- 现状：写入口在 procedure handler 内调用 `requireCurrentFirmRole(...)` / `requirePermission(...)`（`apps/server/src/procedures/_permissions.ts`），按 `@duedatehq/core/permissions` 的五角色矩阵裁定
- 失败 → 写 `audit_event(action='auth.denied', reason=...)` + 返回 `ORPCError('FORBIDDEN')`

---

## 4. 租户隔离（D1 无 RLS · 三道工程防线）

### 4.1 Middleware 层

- `sessionMiddleware` 从 better-auth session 读 `activeOrganizationId`，并校验该 org 仍是「active membership + active `firm_profile`」；失效时回退到最早的有效 membership 并回写 session（`restoreSessionActiveFirm`），再写入 `c.var.firmId`
- `tenantMiddleware` 拒绝缺 active firm（401）、非成员（403）、`member.status !== 'active'`（403）
- `tenantMiddleware` 读取 `firm_profile`；若 org + active membership 存在但 profile 缺失，则 lazy create 自愈
- `firm_profile.status !== 'active'` → `TENANT_SUSPENDED`
- 注入 `c.set('tenantContext', ...)` + `c.set('scoped', scoped(db, firmId))`
- `firms.*` RPC 是租户选择层例外：`listMine / create / switchActive / updateCurrent / softDeleteCurrent` 只要求 authenticated session + active membership 校验，不要求当前 `tenantContext`。这些 procedure 是前端唯一 firm lifecycle 入口，统一管理 `organization / member / firm_profile / session.activeOrganizationId`，并过滤 `firm_profile.status='deleted'` 的 soft-deleted firm。
- `members.*` RPC 不 bypass tenant middleware；它只管理当前 active firm，且 Members v1 mutation 统一 Owner-only、写 audit、按 `firm_profile.seatLimit` 校验 seat。

### 4.2 Repo 工厂层（约束）

- `scoped(db, firmId)` 是 procedure 侧唯一允许的 DB 入口（`packages/db` 还导出 `createDb` / schema / firms·members repo，仅限 middleware、jobs、webhooks、seed 使用，由 4.3 的 lint 规则约束）
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
> （手动 `pnpm check:deps` 执行；CI 当前未单列这一步，procedure 侧 import 边界由
> `vp check` 的 lint 规则在 CI 兜底）。

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

### 5.2 进 AI SDK 之前的 PII 拦截

- SSN / ITIN 列检测落在 `@duedatehq/core/pii` 的 `detectSsnColumns`（header 标签正则 + 单元格值正则 `/^\d{3}-\d{2}-\d{4}$/`）
- Migration CSV 进 AI 前由 `packages/ai/src/pii.ts` 的 `redactMigrationInput` 整列删除；mapper 返回后 `apps/server/src/procedures/migration/_deterministic.ts` 再把 SSN 列强制 IGNORE（双重防御）
- 早期设计的 `{{client_N}}` / `{{ein_N}}` / `{{email_N}}` 占位 + `piiMap` 回填方案未实装；prompt 输入以「最小必要字段 + SSN 列剥离」为准
- `ai_output.input_hash` / `llm_log.input_hash` 存 sha256，不存原文
- 这是 IRC §7216 + FTC Safeguards Rule 的工程落地
- Social copy 不调用第二次自由生成；确定性模板只消费已审核 Pulse 字段，并在建 draft 前拒绝
  email-like / 9-digit identifier、sample、内部运维 change kind、无有效官方 URL 或缺 scope/date
  的候选。X URL 的 UTM 只到 campaign/content，不带 user、email、firm 或 client 标识。公开
  GitHub mirror 只消费已经通过该 gate 的 `postText` allowlist，不消费任意 source text 或第二次
  模型输出；后续撤销不会追溯抹除已经进入公共 Issue 的 snapshot。

### 5.3 加密

- At rest：D1 底层 encryption at rest 由 Cloudflare 提供
- In transit：HTTPS / TLS 1.3
- 应用层敏感字段：`two_factor.secret` / `backup_codes` 由 Better Auth `twoFactor` plugin 落库管理（加密由 better-auth 实现，依赖 `AUTH_SECRET`；未另行实现自管 AES-GCM 层）
- R2 对象默认加密；已上线的 Audit ZIP 未做密码加密（客户密码 AES-256 保护为后续可选项）

---

## 6. Audit Event 规范

### 6.1 Action 枚举（行只增不删；类型源 = `packages/contracts/src/shared/audit-actions.ts`）

```
auth.denied / auth.login.success / auth.login.failed / auth.mfa.setup.started / auth.mfa.enabled
auth.mfa.challenge.verified / auth.mfa.disabled / auth.session.revoked
client.*（created / batch_created / deleted / assignee.updated / classification.updated /
  filing_profiles.replaced / jurisdiction.updated / obligations.reclassified /
  risk_profile.updated / source_details.updated / tax_year_profile.updated）
obligation.*（status.updated / status.auto_unblocked / due_date.updated / assignee.updated /
  batch_created / annual_rollover.created / blocked_by.set|cleared / prep_stage.updated /
  review_stage.updated / efile.state.updated|rejected / extension.decided / snooze.set|cleared /
  input_requested / signature.reminded）+ obligations.saved_view.* / obligations.exported
readiness.*（request.sent|revoked / checklist.regenerated / checklist_item.* /
  materials_received / portal.opened / client_response）
pulse.approve / pulse.reject / pulse.dismiss / pulse.quarantine / pulse.source_revoked
pulse.apply / pulse.revert / pulse.reactivate / pulse.review_requested / pulse.reviewed
migration.batch.created / migration.raw_uploaded / migration.discarded
migration.mapper.confirmed / migration.normalizer.confirmed
migration.matrix.applied / migration.imported / migration.reverted / migration.single_undo
rules.accepted / rules.bulk_accepted / rules.onboarding_activated / rules.rejected
rules.created / rules.updated / rules.archived / rules.published / rules.review.rejected
member.invited / member.invitation.canceled / member.invitation.resent / member.accepted
member.role.updated / member.suspended / member.reactivated / member.removed
firm.created / firm.updated / firm.switched / firm.deleted
calendar.subscription.created / calendar.subscription.regenerated / calendar.subscription.disabled
reminder.template.updated / reminder.sent / reminder.failed / reminder.bounced
reminder.opened / reminder.unsubscribed
penalty.override
export.audit_package.requested / export.audit_package.ready / export.audit_package.failed
export.audit_package.downloaded
```

备注：

- `pulse.ingest` / `pulse.extract` 已被有意移除——raw signal 到达与 AI 分类属运营遥测
  （`jobs/pulse/metrics.ts` → Workers Logs），不是 firm-facing 合规审计
- `auth.login.failed` 在枚举里，但实际失败登录走 Workers Logs 结构化日志
  （`audit_event.firm_id` NOT NULL，匿名失败无 firm 可挂）；成功登录由
  `session-hooks.ts` 写 `auth.login.success`
- 旧版 `ai.refusal` / `ai.guard_failed` 不是 audit action：AI refusal / guard 结果记录在
  `ai_output` / `llm_log`（`guardResult`），audit 行用 `ai_event_metadata_json.guardStatus` 携带
- Phase 1 预留：`exception.apply` / `exception.revert`、`billing.subscribe` / `billing.cancel`

### 6.2 字段

- `firm_id` · `actor_id`（可为 NULL，系统任务）
- `actor_type` · `previous_actor_type` · `ai_event_metadata_json`（AI 溯源：model / tokens / guardStatus 等，F-035 / F-037）
- `entity_type` · `entity_id`
- `action`
- `before_json` · `after_json`（完整快照；字段差异由前端展示层计算）
- `reason`
- `ip_hash` · `user_agent_hash`
- `created_at`

### 6.3 纪律

- `audit_event` **硬约束不删**；任何 migration / 运维脚本禁止 `DELETE FROM audit_event`
- 写入永远走 `packages/db/src/audit-writer.ts` 的 `createAuditWriter(db).write / writeBatch`（INSERT-only，无 update/delete 方法），不允许其他入口；业务侧经 `scoped.audit.write/writeBatch`，server auth hooks（session / organization）直接 import `@duedatehq/db/audit-writer`
- Pulse Apply / Migration Import 等批量操作必须在同一请求流程内与业务写成对写 audit（writer 按 D1 100 绑定参数上限分批 INSERT）
- Tenant-scoped RPC 请求由 middleware 从 `cf-connecting-ip`（fallback:
  `x-forwarded-for` 第一项、`x-real-ip`）和 `user-agent` 生成 `AUTH_SECRET` 加盐
  SHA-256 hash，并作为默认 metadata 注入 `scoped.audit.write/writeBatch`；不存明文 IP / UA
- 读取永远走 `audit.list` / `scoped.audit.list`，由 repo 层硬编码 `firm_id = scoped.firmId`；
  Audit Log 页面只显示 hash 后的 IP / UA，不显示明文设备指纹，也不展示 raw practice id

---

## 7. Client Readiness Portal 安全（已上线）

- Signed portal token：HMAC-SHA256（payload = `{requestId, exp}`，`AUTH_SECRET` 签名，`apps/server/src/lib/readiness-token.ts`）；服务端只存 `sha256(token)`（`readiness_request.token_hash`，唯一索引）
- URL 形态：`{APP_URL}/readiness/<token>`（匿名 API：`/api/readiness/:token`）
- 过期默认 14 天（`READINESS_PORTAL_TTL_MS`）；可撤销（`status='revoked'`）
- 客户响应不登录，仅凭 token；打开写 `readiness.portal.opened`，提交写 `readiness.client_response`
- 速率限制：`/api/readiness/*` 走 Worker Rate Limit binding（同 IP 100/min）；per-token 10/min 的细粒度限流未实现
- CSP 严格响应头未实现（Portal 页与 SPA 同源同构建）—— 待办

---

## 8. Audit-Ready Evidence Package（已上线）

- 一键导出 ZIP：`report.pdf` + `audit/events.csv` + `audit/events.json` + `evidence/evidence-links.csv` + `manifest.json`
- 生成过程：`AUDIT_QUEUE` 触发 → Worker job（`apps/server/src/jobs/audit/package.ts`）拉数据 → 打包 → 上传 `R2_AUDIT` → `audit.createDownloadUrl` 返回 HMAC 签名下载 URL（10 分钟过期）；package 记录本身 7 天过期
- 签名：
  - `manifest.json` 含每个文件 sha256；整包 ZIP 的 sha256 写入 package 行 + R2 customMetadata
  - 预留 Phase 2 接 RFC 3161 TSA（可信时间戳）
- 权限：`owner` + `planHasFeature('auditExport')`（Team / Enterprise）；Solo / Pro 在前端禁用导出按钮，
  hover tooltip 说明计划要求，后端仍以 plan gate + owner guard 为最终裁定
- 全链路审计：`export.audit_package.requested / ready / failed / downloaded`

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

在 `packages/ai/src/guard.ts` 里固化：

| 红线                                                                                                                                                                  | 触发                   | 处理                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| 禁词正则：`guaranteed` / `no penalty will apply` / `qualifies for relief` / `you should file` / `do not file` / `tax advice` / `legal advice` / `safe harbor applies` | AI 下结论 / 伪税务建议 | `GuardRejection('BANNED_TAX_ADVICE')` → refusal                  |
| 未替换占位符（`{{...}}` / `<...>`）                                                                                                                                   | 输出残留模板           | `UNREPLACED_PLACEHOLDER` → refusal                               |
| 无引用 section / 引用越界 / 空检索                                                                                                                                    | 不可溯源               | `UNCITED_SECTION` / `CITATION_OUT_OF_BOUNDS` / `EMPTY_RETRIEVAL` |
| source excerpt 不在原文                                                                                                                                               | 编造出处               | `SOURCE_EXCERPT_NOT_FOUND` → refusal                             |
| SSN/ITIN 正则 `/^\d{3}-\d{2}-\d{4}$/`（CSV 列级）                                                                                                                     | 导入误带 SSN           | 进 AI 前整列删除 + mapper 后强制 IGNORE（§5.2）                  |

guard 拒绝产出 `GUARD_REJECTED` refusal，连同 `guardResult` 记入 `llm_log` / `ai_output` trace
（不写 `audit_event`）。信用卡号 Luhn 校验未实现 —— 待办。

---

## 11. Rate Limit

| 层                                    | 实现                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Worker `RATE_LIMIT` binding           | Cloudflare 原生 ratelimit binding，`simple = { limit: 100, period: 60 }`；key = userId（登录态），否则 IP                    |
| binding 挂载面                        | `/rpc/*` · `/api/audit/*`（session → tenant 之后）· `/api/demo` · `/api/ics/*` · `/api/readiness/*` · `/api/social-alerts/*` |
| Better Auth（DB-backed `rate_limit`） | 非 development 启用；全局 60s/100 次；`/email-otp/send-verification-otp` 3/min；`/sign-in/email-otp` 5/min                   |
| Webhook 入站（`/api/webhook/resend`） | 不走 binding，靠 Svix 签名验签拒绝伪造                                                                                       |

超限返回 `429`（binding 路径返回 `RATE_LIMITED`）。早期设计的 per-user 120/min、AI 调用
20/min/200/day、Pulse Approve 30/min、per-token 10/min 等细粒度配额未实现；AI 消耗由
per-plan `aiDailyRunLimit` + `AI_SYSTEM_DAILY_LIMIT` 预算层兜底（`packages/ai/src/budget.ts`）。

---

## 12. Secret 管理

- **本地**：Worker 运行时 secrets 放 `apps/server/.dev.vars`（copy 自 `.dev.vars.example`，gitignore）；浏览器侧 `VITE_*` 变量按需放 `apps/app/.env.local`；CLI 凭据走 `wrangler login`，不进仓库文件；1Password Shared Vault 同步给团队
- **Staging / Production**：`wrangler secret put <KEY>`
- **X social**：`X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET` 必须四项
  all-or-none；`X_POSTING_MODE=live` 时四项必填。`SOCIAL_OPS_TOKEN` 独立生成、独立轮换，不复用
  `AUTH_SECRET`、`E2E_SEED_TOKEN` 或 X token；默认 `draft` 无 X credential 也可影子运行。
- **X GitHub review mirror**：只在 default branch 的 schedule / workflow dispatch / scoped
  main push 运行，无 PR trigger；从受保护的 `due-date-hq-staging` environment 读取
  `SOCIAL_OPS_TOKEN`，并严格只向 production queue GET 发送该 bearer。短时 `GITHUB_TOKEN`
  权限限定为 `contents: read` + `issues: write`。请求禁 redirect、设 15 秒 timeout，错误和日志
  不输出 response body、header、token 或 raw queue payload。由于 `SOCIAL_OPS_TOKEN` 同时具有
  mutation 权限，任何要执行 fork/PR code 的 future workflow 必须先拆独立只读 credential，
  不能扩大当前信任边界。
- **轮换**：季度轮换 `AUTH_SECRET`；轮换流程先新增 secondary → 验证 → 删除 primary（原 `VAPID_PRIVATE_KEY` 已随 Web Push 从 Phase 0 移除）
- **扫描**：`pnpm secrets:scan`（= `gitleaks detect --source . --no-git --redact`），改动配置前手动跑；CI 安装固定版本 gitleaks 再扫一次。pre-commit hook 是 `vp staged`（对 staged 文件跑 `vp check --fix`），不含 gitleaks

---

## 13. 事件响应（IR Playbook · 摘要）

| 级别 | 定义                                             | 响应 SLA                               |
| ---- | ------------------------------------------------ | -------------------------------------- |
| P0   | 数据泄露 / 账号被盗 / 全站宕机                   | 15 分钟响应 · 4 小时缓解 · 24 小时 RCA |
| P1   | 单租户数据错乱 / Auth 异常 / AI 发出合规红线内容 | 1 小时响应 · 24 小时缓解               |
| P2   | 个别 feature 故障                                | 次工作日响应                           |

响应步骤：Detect（Workers Logs / ops alert email / 用户上报）→ Contain（Wrangler rollback 或 feature flag off）→ Eradicate → Recover → Lessons（写 `docs/incidents/YYYYMMDD-<slug>.md`）。

---

## 14. 合规目标路线图

| Phase     | 目标                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| 7 天 Demo | PII 最小化 · TLS · Audit 不删 · Glass-Box Guard · Secret 管理 · WISP 1-page draft                               |
| Phase 0   | Owner-only tenant isolation · optional account MFA · WISP v1.0 · dangerous write role check · `ai_output` trace |
| Phase 1   | Manager MFA · CSP strict（五角色 RBAC / Evidence Package / Readiness Portal 已提前上线）                        |
| Phase 2   | RFC 3161 TSA 可信时间戳 · SOC 2 Type I 审计 · Pen-test                                                          |

---

继续阅读：[07-DevOps-Testing.md](./07-DevOps-Testing.md)
