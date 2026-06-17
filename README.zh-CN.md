# DueDateHQ

[English README](./README.md)

DueDateHQ 是面向美国 CPA 事务所的截止日运营工作台。它把客户事实、税务义务、规则变更、
罚金风险、团队负责人和审计证据放进同一个系统，帮助事务所每天判断：“下一步该处理什么，
为什么？”

这个产品适合已经不想继续依赖 spreadsheet reminder，但又需要专业复核、来源可追踪和团队
协作节奏的事务所。

## 产品闭环

1. 通过手动创建或 Migration Copilot 导入客户。
2. 将客户事实整理为 filing jurisdictions、entity types、tax types 和负责人。
3. 基于已验证规则和事务所复核过的事实生成义务。
4. 按截止日、资料完备度、证据、负责人和预计罚金风险做日常分诊。
5. 在 Alerts 中复核官方来源更新，再应用到受影响的客户和义务。
6. 在独立 Reminders 页面运营提醒自动化：查看 30/7/1 天排期，调整事务所消息模板，并监控投递或
   抑制状态。
7. 仅在有截止日压力、Alerts 或提醒投递失败时发送个人 morning digest。
8. 为关键导入、规则、状态、计费和团队事件保留审计证据。

DueDateHQ 目前是 alpha 阶段产品代码库。它支持运营复核和证据驱动的判断，但不是税务建议、
不是报税系统，也不能替代 CPA、EA、律师或其他合格专业人士的复核。

## 当前产品覆盖

- **事务所工作区**：登录、首次事务所 onboarding、MFA 设置、邀请、角色相关界面、事务所切换、
  账户安全和中英文 app 文案。
- **客户事实**：客户资料、filing jurisdictions、负责人、联系方式、导入历史、readiness 信号、
  客户详情工作区、work plan、Alert 影响、轻量未来业务提示、活动日志和事实复核。
- **Migration Copilot**：支持 CSV、TSV、XLSX、粘贴表格和供应商导出形态的数据；提供字段映射、
  风险输入拦截、导入预览、客户/义务生成和审计证据。
- **Dashboard 与 Obligations**：风险分诊、保存视图、批量状态更新、readiness、证据抽屉、本周/
  本月视图和预计罚金风险。
- **Rules 与 Alerts**：来源注册表、coverage、规则库、生成预览、候选规则复核、事务所级验证决策、
  官方来源监控、Alerts 影响分诊、来源驱动的建议动作、应用/标记已复核/请求复核/撤销和来源健康度运营。
- **事务所运营**：审计日志、提醒自动化、带 morning digest 控制的个人通知、readiness portal、
  日历订阅、计费 checkout handoff、成员和团队 workload 界面。
- **营销站**：静态双语公开站，用于产品、pricing、rules 和 state coverage 入口。

当前公开覆盖应按 Federal + 50 states + DC 表达。州/DC 来源和候选规则仍受复核门控；候选规则
不等于已验证、可生成提醒的规则。AI 辅助流程用于字段映射、抽取、摘要和
草拟，并受结构化 schema、guard、trace 和审计记录约束；人工复核仍是产品模型的一部分。

## 技术栈

DueDateHQ 是部署在 Cloudflare 上的 TypeScript pnpm monorepo。

- **Apps**：Vite React SPA 承载登录后工作台，Cloudflare Worker API 承载 SaaS 后端，Astro 承载
  marketing site。
- **Frontend**：React 19、React Router 7、TanStack Query/Table/Virtual/Hotkeys/Form、Zustand、nuqs、
  Zod、Lingui、Tailwind 4、Base UI、shadcn/ui `base-vega` 和 lucide-react。
- **API 与契约**：Cloudflare Workers 上的 Hono，通过 `packages/contracts` 共享 oRPC
  contract-first 边界。
- **数据与身份**：Cloudflare D1、Drizzle ORM、tenant-scoped repositories、better-auth
  Organization/Access Control 和事务所级审计记录。
- **Cloudflare 平台**：Workers Assets、KV、R2、Vectorize、Queues、Cron Triggers、Workflows、
  Rate Limiting 和 Wrangler。
- **AI 与集成**：Vercel AI SDK Core 通过 Cloudflare AI Gateway 调用模型，并在内部做 guard、trace、
  budget；Resend、Stripe、Sentry、Amplitude 等能力取决于部署侧是否已配置对应服务。
- **质量门禁**：Vite+ (`vp`) 统一 workspace 任务，Vitest、Cloudflare Workers test pool、
  Playwright、Lingui strict compilation、Drizzle Kit 和依赖方向检查。

## 仓库结构

```text
apps/
  app        已登录工作台的 Vite React SPA
  server     Cloudflare Worker API、auth、oRPC、队列、cron、webhook
  marketing  Astro 静态营销站

packages/
  ai          AI Gateway 调用、prompt、guard、trace
  auth        Better Auth 配置、组织角色、计费插件
  contracts   app/server 共享的 Zod 与 oRPC contract
  core        日期、规则、导入、风险、优先级等纯领域逻辑
  db          Drizzle schema、迁移和 D1 repository
  i18n        共享 locale helper
  ingest      提醒来源 adapter 和抓取/解析工具
  ports       边界接口
  ui          设计 token 和可复用 UI primitives
```

重要文档：

- [技术总览](./docs/dev-file/00-Overview.md)：架构和阶段口径。
- [技术栈](./docs/dev-file/01-Tech-Stack.md)：更完整的技术选型与理由。
- [架构决策](./docs/adr/README.md)：主要技术决策和取舍。
- [设计系统](./DESIGN.md)：当前视觉 token 和 UI 规则。
- [开发日志](./docs/dev-log/README.md)：实现历史。

## 开发

使用 pnpm 和 Node `>=22.19.0`。

```bash
pnpm dev       # 运行 workspace 开发任务
pnpm check     # type-aware 检查
pnpm test      # 单元测试
pnpm build     # 生产构建
pnpm ready     # 默认交付前门禁
```

常见模块规则：

- 业务 UI 放在 `apps/app/src/features/<vertical>/`。
- app runtime helper 放在 `apps/app/src/lib`。
- 纯领域逻辑放在 `packages/core`。
- 共享 contract/schema 放在 `packages/contracts`。
- 租户化持久化逻辑通过 `packages/db` repository 暴露。
- app/package 代码不要使用 React `useEffect`。
- Commit message 和 PR title 使用 Conventional Commits。

PR 应包含简洁 summary、验证命令、UI 变更截图，并明确说明迁移、依赖方向、环境变量或安全敏感行为。

## 数据处理

产品流程会处理客户和事务所数据。除非能够确认已经脱敏，否则应把示例数据、导出、截图、日志和 AI
trace 都按敏感材料处理。
