# /deadlines 设计对齐 — 交接 (2026-06-08)

新 session 从这里接着干。目标:让线上 `/deadlines`(列表页)和 deadline 详情页
**一模一样地复刻 Pencil 设计稿**(列表=图2,详情=图3,user 会重新贴这两张图)。

## 工作位置

- worktree:`/Users/yuqi/dev/ddhq-deadlines-parity`,分支 `design/deadlines-design-parity`(从 main 切出)。
- **在 main 目录 `/Users/yuqi/dev/due-date-hq-jwl` 跑 session**,用绝对路径编辑 worktree 文件 —— 这样 memory、`.claude/launch.json` 都在。

## 预览(已搭好,可能要重启)

- launch 配置在 main 的 `.claude/launch.json`:`wt-server-8788`(worktree 后端)、`wt-app-5183`(worktree 前端)。`preview_start` 这两个即可。
- worktree 里已拷好 `apps/server/.dev.vars` + `apps/server/.wrangler`(seed 过的本地 D1),app 在 `localhost:5183/deadlines`,demo 自动登录(account=plan-pro)。
- **临时改动(未提交,合并前要 revert)**:`apps/app/vite.config.ts` 的 proxy 暂时指向 `:8788`,好让 worktree 前端连 worktree 后端。
- 验证:`document` 不能横向滚动;表格 `[data-slot=table-container]` overflow=0;**面板开/关两态都要验**(关键!之前两次 bug 都出在没验面板开态)。

## 已完成(9 commit,全 0-error、预览验过)

exposure 列(后端 un-omit `estimatedExposureCents` + resolver 透传)· Group-by Urgency · 表格无横向滚动(`table-fixed`,宽度放 headerClassName,`px-3`)· 面板开态布局修复 · 表格圆角卡片 · `#f2f2f2` 三栏背景(详情态)· 详情标题全名 · 详情状态行。

## 还没做(按图2/图3)

**详情页(图3)** —— 大头,在 `apps/app/src/features/obligations/queue/ObligationQueueDetailDrawer.tsx`(189KB):

- 顶部动作:**Assign / Snooze / Mark as filed**(蓝)—— 要接现有 mutation(`updateStatus`、`markFiledRejectedMutation` 在文件里;snooze/assign 可能要新建)。
- chips 行重排(`👥 客户 household` `NOT STARTED` `FED · …`)。
- 3 个日期卡按图3 样式/间距。
- **Extension tab 整块**:Form 7004 详情卡(IRS·§6081·版本)+ POLICY/FORM 2×3 网格 + Apply extension 表单(4 字段 + 橙色付款警告 + Cancel/File extension)。
- (可选)面包屑 `‹ Deadlines / 客户 · Form` + Prev/Next。

**列表页(图2)** —— 在 `apps/app/src/routes/obligations.tsx`:

- 顶部 eyebrow(`Synced just now · N tracked · ≈Nh focus`)· 14-day forecast 条 · All/**Active**/Filed 三 tab(现在是 7 个 status tab)· From Pulse / rollover 来源 chip(客户名下方)· Tax 列 · State 双 badge(IRS/FinCEN + 州)· exposure penalty 副行(`≈$X penalty`,demo 数据 `accruedPenaltyCents` 多为空)· 默认 OVERDUE 分组带(带 `≈12D avg · ≈$N penalty exposure` 汇总)。

**全局白底**:`packages/ui/src/styles/tokens/semantic-light.css` 里 `--background-body`/`--background-inset` 已被我按 user 要求改成纯白(**未提交**)。图2 其实是浅灰 inset + 白卡片;待定这块怎么落。

## 重要约束 / 坑

- 线上设计(代码注释里叫 `h4bQ2`)和 Pencil 设计稿(`HuYeb`/图2、图3)**是两套**。user 已拍板:**设计稿优先**(覆盖线上的刻意决策),但 **保留 Priority 列**(目前是默认隐藏的 opt-in,别删)。
- 该文件 6 月被 70+ 轮 Yuqi feedback 改过,注释很多;改前先读注释,别 revert 掉无关决策。
- 每次编辑后:`pnpm exec vp fmt --write <file>` 再 `pnpm check`(0 error 才提交);commit 前写 `docs/dev-log` 条目。
