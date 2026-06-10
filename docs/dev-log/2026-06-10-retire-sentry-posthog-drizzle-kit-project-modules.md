---
title: 'Retire Sentry/PostHog + drizzle-kit bookkeeping + docs/project-modules'
date: 2026-06-10
author: 'claude'
---

# Retire Sentry/PostHog + drizzle-kit bookkeeping + docs/project-modules

## 背景

dev-file 全卷核对（同日 `docs(dev-file): reconcile all volumes`）暴露出三类「声明了但
不用/不维护」的资产：① Sentry 与 PostHog 只有依赖 + env 占位，从未接线，产品决定不再
使用；② drizzle-kit 的 `migrations/meta/` journal 停在 0055 且有缺号（迁移自 0026 起
全部手写、由 wrangler 应用），簿记本身在误导；③ `docs/project-modules/`（16 篇，自述
基于 2026-05-02 代码）与 `docs/dev-file/` 构成两套会互相矛盾的「当前事实」。同时顺手
把 marketing demo CTA 的英文硬编码接进 i18n。

## 做了什么

- **Sentry/PostHog 全移除**：`@sentry/cloudflare`（apps/server）、`posthog-js`
  （apps/app）依赖与 pnpm catalog 钉版；`ServerEnvInput` 的 `SENTRY_DSN`/`POSTHOG_KEY`、
  obligations 测试 stub、`e2e.yml` secrets 占位、`.dev.vars.example` Observability 段；
  连带删掉只为 drizzle-kit 服务的 `@esbuild-kit/*` pnpm overrides；两处注释改写
  （Workflow.astro、contracts/migration.ts）。
- **drizzle-kit 退役**：删 `packages/db/migrations/meta/`（27 个 snapshot/journal）、
  `drizzle.config.ts`、`db:generate` script（root + db 包）、`drizzle-kit` devDep。
  drizzle-orm 运行时不受影响。
- **docs/project-modules/ 整套删除**：内容停在 2026-05-02（早于 6 月全部 redesign），
  与 dev-file 重叠且无人维护；README / README.zh-CN / dev-file 08 的活链接已改。
  13 篇历史 dev-log 中的提及按「历史记录」原则不改写；需要时可从 git 历史找回
  （含 14-user-manual、15-tax-prep-workflow-gap-analysis）。
- **marketing demo CTA i18n**：`HeroCopy.demoCta` 新增（en `Try a live demo` /
  zh-CN `试用在线 Demo`），Hero.astro 改用 `{t.demoCta}`。
- **AGENTS.md**：命令清单去掉 `pnpm db:generate`。
- dev-file 00/01/02/03/04/05/06/07/08/12 中对应的工具声明同步改写（监控/产品分析/
  feature flag/告警路由/迁移流程/目录树）。

## 为什么这样做

未接线的 SDK 依赖与停更的簿记和过期文档一样，都是「读起来像事实的谎言」——对 vibe
coding 的 AI 语料尤其有害。observability 后续选型（Workers Logs / Analytics Engine
原生路线 vs 重新引入第三方）留待真正要接的时候再决策，现在不预占。

## 验证

- 全仓 grep `sentry|posthog|drizzle-kit|esbuild-kit|db:generate|project-modules`
  零残留（历史 dev-log 与 01/03 的「0000–0025 由 drizzle-kit 生成」历史陈述除外）。
- `pnpm install` 更新 lockfile；`vp check` + `@duedatehq/server` obligations 测试通过
  （见提交信息）。

## 后续 / 未闭环

- 产品分析与错误上报的替代选型未定（事件契约保留在 dev-file 12 §2.5）。
- dev-file 07 §4 的观测栈/告警表已按「Workers Logs + ops alert email」口径改写，
  Analytics Engine 的实际接入仍是目标项。
