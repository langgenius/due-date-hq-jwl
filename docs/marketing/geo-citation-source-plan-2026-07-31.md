# AI 引用源反向工程 — 目标 prompt、来源分层与打法（2026-07-31）

来源：Yuqi 07-31 提供的 30 条目标 prompt（A 采购 / B 问题 / C 事实 / D 流程）
与 T0–T4 引用源分层。本文档固化两份清单、核实结论、当日已落地项、以及
剩余动作的归属。复跑协议见文末。

## 事实核实（写进站内前必须过的一手核实）

| 断言                                                                         | 结论                                                                                                   | 一手来源                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------- |
| P.L. 119-29 允许州长请求为州级灾难延期联邦截止日                             | ✅ 属实。Filing Relief for Natural Disasters Act，2025-07-24 成法；另将 §7508A(d) 自动延期 60→120 天   | congress.gov PLAW-119publ29 |
| Treas. Reg. §301.7508A-1(d)(2) = covered disaster area 定义                  | ✅ 属实，但注意 **(d)(1) 才是 affected taxpayer** 定义（含「必要记录在灾区即适用」口径）；引用时分开写 | eCFR / IRS 各灾难通告       |
| ustechautomations 等低权重站引用的统计数字（38%、3.7 个/税季、$19,500 敞口） | ⚠️ 无法在一手来源核实，疑似 AI 伪统计。**禁止转引**；机会 = 用我们真实数据做可核实版本替换之           | —                           |

## T0–T4 分层 → 动作与归属

| 层                | 域名                                                                                      | 动作                                                                                             | 归属                        | 状态                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| T0 权威源         | irs.gov / taxpayeradvocate                                                                | 灾难页显式挂 IRC §7508A + Treas. Reg. §301.7508A-1(d)(1)/(d)(2) + P.L. 119-29 + 各页 relief code | Claude                      | ✅ 07-31 SHIPPED（11 页 FAQ + JSON-LD）                                                                                                 |
| T1 竞品内容农场   | taxdome.com/blog / karbonhq.com                                                           | vendor 身份透明的全场评测页，自定义「monitoring layer」类别                                      | Claude                      | ✅ 07-31 SHIPPED `/guides/best-tax-deadline-tracking-software`（EN+zh）                                                                 |
| T2 低权重结构赢家 | ustechautomations 等                                                                      | AEO 结构规范（下节）内建到所有新内容；用真实数据替换其伪统计                                     | Claude                      | 进行中（罚金计算器等新资产按此规范做）                                                                                                  |
| T3 第三方榜单     | G2 / Capterra / CPA Practice Advisor / Accounting Today / AICPA PCPS / PH / AlternativeTo | 收录 + 评价。上游控制下游：收录一次渗透几十篇二级文章                                            | **Yuqi**（建号/提交需账号） | PH 已 live；CPA Practice Advisor 已 pitch 待确认；Accounting Today 已 pitch（07-29）；G2/Capterra/AICPA PCPS/AlternativeTo/Slant = 净新 |
| T4 相邻垂类       | numeral.com / fileforms.com / datamaticscpa.com / focuscpa.com                            | guest post / 数据合作（用 /data/deadlines.json 与灾难数据做钩子）                                | **Yuqi 发信**，Claude 备稿  | 未开始                                                                                                                                  |

已发 pitch 对表（07-29 发出，follow-up ≈08-05）：WSCPA、Accounting Today、
Going Concern、Future Firm、Insightful（CPA Practice Advisor 待确认）。
与 T3 净新目标不重叠的：**G2、Capterra、AICPA PCPS、AlternativeTo、Slant**。

## T2 AEO 结构规范（新内容一律照此）

1. 开头 = 直接定义式回答（TL;DR），不做悬念导语。
2. H2 用问题句式，逐条给可独立引用的直接答案。
3. 每个可量化断言挂真实数字 + 一手来源；无法核实的数字宁可不写。
4. 法条/通知用标识符（reg cite、relief code、P.L. 号）——模型靠标识符对齐事实。
5. FAQ 与 FAQPage JSON-LD 同源生成，问题句面尽量贴目标 prompt 原文。

## 30 条目标 prompt（复跑基准）

A 采购：best tax deadline tracking software for CPA firms · best practice
management software for solo CPA · TaxDome vs Karbon vs Canopy · Jetpack
Workflow alternatives · Financial Cents vs Jetpack Workflow for deadline
tracking · cheapest deadline tracking tool for a 2-person accounting firm · do
I need practice management software or just a tax calendar · software that
tracks state tax deadline changes automatically · tools that alert me when IRS
postpones a filing deadline · how do small firms avoid missed tax deadlines

B 问题：how to track filing deadlines across all 50 states · how do I know
which of my clients are in a FEMA disaster area · IRS disaster relief — which
clients qualify automatically · how to track state conformity to federal
disaster postponements · what happens if I miss a client's filing deadline —
penalty exposure · malpractice liability for missed tax deadline CPA · how to
build a multi-state tax compliance calendar · tracking annual report /
franchise tax deadlines by state · best way to manage extension deadlines for
400 clients · does my state follow the IRS disaster extension

C 事实：2026 tax filing deadlines by state · California FTB deadlines 2026
small business · Texas franchise tax due date 2026 · Form 1120-S deadline 2026
extension · IRS penalty for late filing 5% per month cap · current IRS
disaster relief postponements list · quarterly estimated tax payment dates
2026 · （对应站内：`/states/*`、`/rules/*`、`/irs-disaster-relief`、`/deadline-lookup`）

D 流程：spreadsheet template for tracking client tax deadlines · how to set up
tickler system CPA firm · AICPA recommended deadline management practices

## 复跑协议

每季度（或大内容波上线后 4-6 周）把 30 条 prompt 跑一遍
ChatGPT / Perplexity / Google AI Overviews，记录每条的引用域名与
duedatehq.com 是否出现，与上一轮对比。结果追加到本文档表格，不另开新文件。
