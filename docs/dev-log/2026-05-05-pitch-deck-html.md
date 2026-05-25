---
title: 'Pitch deck HTML'
date: 2026-05-05
author: 'Codex'
updates:
  - note: 'Replaced all Dify logo usages in the deck with the DueDateHQ project mark.'
  - note: 'Revised pitch wording to use formal product language and align the table badges with the app status patterns.'
  - note: 'Applied the second browser review pass: simplified the cover, moved product UI labels back to English-first language, and replaced the source appendix with an audience-facing closing slide.'
  - note: 'Applied the third browser review pass: removed the print hint, localized explanatory copy, and matched Pulse approved badges to the product success style.'
  - note: 'Applied the fourth browser review pass: replaced evidence markers with the product FileSearch icon, localized the trust-boundary table headers, and merged the final two pages into one summary slide.'
  - note: 'Applied the fifth browser review pass: right-aligned numeric table headers with their values and replaced the trust-boundary table with three audience-facing proof points.'
  - note: 'Applied the sixth browser review pass: localized AI output-rule explanations and rewrote the architecture slide to remove repo-path-heavy implementation language.'
  - note: 'Added the product capability names Deadline Radar™, Migration Copilot, and Glass-Box AI™ to their dedicated slides while keeping the final summary generic.'
  - note: 'Inserted an AI cost model page before the final product summary, covering plan-level AI estimates and total variable cost.'
  - note: 'Cleaned up the AI cost model copy by centralizing the monthly-cost note and localizing Guardrail and cost-card explanations.'
  - note: 'Added a next-stage roadmap slide before the final summary, combining the product build plan with the short-term pilot route.'
  - note: 'Adjusted the AI cost model layout so the cost table uses the page width and the supporting cards sit below it.'
  - note: 'Rewrote the roadmap slide into PWA, Ask AI, and Enterprise phases after removing Phase 0.'
  - note: 'Made the roadmap slide short-term promotion route more concrete with pilot size, weekly actions, and validation signals.'
  - note: 'Replaced roadmap Phase 3 with Enterprise and multi-practice expansion after hiding Enterprise from the current billing surface.'
  - note: 'Embedded the DueDateHQ logo SVG inside the HTML so the deck can be shared as a single file.'
  - note: 'Revised the architecture slide to include concrete framework and tooling names from the live stack.'
  - note: 'Normalized header meta and logo sizing across all slides and cleaned up architecture-slide tool-name capitalization.'
  - note: 'Changed the demo-data metric cards from one row to a two-row 3/2 layout.'
  - note: 'Added the project authors to the cover slide.'
  - note: 'Removed pages 3-5 from the deck: Demo data, Obligations table, and Migration Copilot; the remaining deck has 9 slides.'
  - note: 'Removed pages 6, 7, and 9 from the reduced deck: Security, AI cost model, and Product summary; the remaining deck has 6 slides.'
---

# Pitch deck HTML

## 背景

为公司内部 pitch 准备一版 DueDateHQ 项目介绍 deck。要求最终产物是 HTML，放在
`docs/pitch-deck/`，并且数据、表格样式必须来自项目真实实现，不套用 marketing 页面风格。

## 做了什么

- 新增 `docs/pitch-deck/index.html`，做成可键盘翻页、可打印的静态 pitch deck。
- 新增 `docs/pitch-deck/duedatehq-logo.svg`，使用项目自己的 DueDateHQ brand mark；当前
  `index.html` 已内嵌该 mark，不再依赖旁边的 SVG 文件。
- Deck 外壳使用简洁演示规则；产品 surface 使用 DueDateHQ 产品内的表格、状态标记、风险行和证据标记。
- 当前版本收敛为 6 页；已移除 Demo data、Obligations table、Migration Copilot、Security、AI
  cost model 和 Product summary 页，保留下一阶段路线图作为结尾。
- Pulse 记录、架构口径和路线图来自 `mock/demo.sql`、`docs/dev-file/*`、应用实现和相关
  dev-log。

## 为什么这样做

`dify-deck` 的 React 模板和 `dify-brand` 的 HTML 输出要求存在形式差异；本次以用户明确要求的
HTML 为最终产物，同时沿用 deck 的叙事结构。为了避免 pitch deck 变成营销页，样式没有引用
`apps/marketing` 的 layout 或 table helper，而是复刻 app 内部 table primitive、badge、metric strip、
hairline divider、mono tabular number 等产品语言。

## 验证

- `python3 -c "... HTMLParser ..."` 校验 HTML 可解析。
- `pnpm exec playwright screenshot --viewport-size=1280,720 file://.../docs/pitch-deck/index.html`
  验证封面渲染。
- `pnpm exec playwright screenshot --viewport-size=1280,720 file://.../docs/pitch-deck/index.html#slide-4`
  验证表格页渲染。
- 第四轮浏览器复核后，用 `HTMLParser` 校验 HTML，并在 Codex in-app browser 中确认 slide 数为
  10、Evidence 标记数量为 5、安全边界页中文表头存在、旧 Closing 页已删除且控制台无 error。
- 新增成本页后，用 Node 检查 slide 数为 11，末尾顺序为
  `Security -> AI cost model -> Product summary`。
- `pnpm exec playwright screenshot --viewport-size=1280,720 file://.../docs/pitch-deck/index.html#slide-10`
  验证 AI cost model 页在桌面 16:9 视口内无明显溢出。
- 根据第 10 页批注，集中说明成本表的月度口径，并将 Guardrail 列和右侧成本说明卡改为中文解释。
- 新增路线图页后，用 `HTMLParser` 校验 HTML，并在 Codex in-app browser 中确认 slide 数为 12、
  新路线图页位于最终总结页之前且控制台无 error。
- 根据第 10 页宽度批注，将成本表改为全宽布局，并把成本说明卡改为表格下方三列。
- 根据路线图页批注，删除 Phase 0，并将路线图改为 PWA、Ask AI、Enterprise 三阶段。
- 根据路线图页反馈，将短期推广路线改为 3-5 家小型 CPA 事务所试点、三周动作和付费试点信号。
- 根据路线图页反馈，将 Phase 3 从 AI Assistant 改为企业版和多 practice 扩展方向。
- `pnpm exec vp check --fix docs/pitch-deck/index.html docs/dev-log/2026-05-05-pitch-deck-html.md`
  完成格式修复；随后 `vp check` 的格式阶段通过，但 lint 阶段因 HTML/Markdown 入参没有可 lint 文件而退出。
- `pnpm exec prettier --check ...` 尝试校验格式，但当前 workspace 未安装 `prettier`，命令返回
  `Command "prettier" not found`。
- 将 DueDateHQ logo 改为 HTML 内嵌 SVG symbol 后，用 `rg` 确认 `index.html` 不再引用
  `duedatehq-logo.svg`。
- `pnpm exec playwright screenshot --viewport-size=1280,720 file://.../docs/pitch-deck/index.html`
  确认封面 logo 可由单个 HTML 文件正常渲染。
- 根据第 8 页反馈，将 architecture slide 的抽象分层改为 Vite + React SPA、Cloudflare Workers /
  Hono、Cloudflare D1 / R2 / Queues、oRPC + Zod、Drizzle ORM 等真实技术栈锚点；相关口径仍对齐
  `docs/dev-file/01-Tech-Stack.md` 和 `docs/dev-file/02-System-Architecture.md`。
- 根据封面页眉反馈，撤销封面右上角 deck meta 的特殊字号，让全部页面右上角 meta 保持同一字号。
- 根据封面 logo 反馈，将全 deck 的 logo mark 统一到封面使用的尺寸。
- 根据第 8 页技术名大小写反馈，将工具名统一为 Vite + React SPA、Cloudflare Workers、
  Cloudflare D1 / R2 / Queues、TanStack Query / TanStack Table、Drizzle ORM、Tailwind CSS 4、
  shadcn/ui 和 Lucide 等正式写法。
- 根据第 3 页反馈，将 5 个 demo metric card 从一行五列改为两行布局：上排三张、下排两张。
- 根据封面反馈，在首页主文案下方加入项目作者：姜涵煦、刘亦州。
- 根据 2026-05-07 要求删除第 3/4/5 页后，用 Node 确认 slide 数为 9，顺序为
  `Cover -> Positioning -> Pulse -> Glass box AI -> Architecture -> Security -> AI cost model -> Next-stage roadmap -> Product summary`。
- 用 `HTMLParser` 校验 `docs/pitch-deck/index.html` 可解析。
- 根据后续要求删除当前第 6/7/9 页后，用 Node 确认 slide 数为 6，顺序为
  `Cover -> Positioning -> Pulse -> Glass box AI -> Architecture -> Next-stage roadmap`。
- 用 `HTMLParser` 再次校验 `docs/pitch-deck/index.html` 可解析。

## 后续 / 未闭环

- 如需现场演示，可再补一版 PDF 导出或截图版，但当前 HTML 已可直接打开和打印。
