# Alerts backfill / catch-up 设计分析（暂存，未实施）

> 2026-06-11。8-agent workflow 分析（schema / pipeline / UI / 线上 D1 / 域调研 / 方案 / 产品+工程双评审）+ 同日 Q&A 修订。
> 状态：**等 owner 想清楚后再动工**。本文件是实施时的唯一依据，可冷启动。

## 0. 问题

Alerts（内部名 pulse）定位是「报税政策临时变更 / 政府临时消息」。历史上已发布、但延期窗口仍未过期的变更（如灾害救济延期）同样适用于产品里的 deadline。正式发布后，新注册 firm 怎么看到这批「过去发布、仍在生效」的变更？量会不会太大？

## 1. 现状机制（已验证，file:line 以 2026-06-11 main 为准）

### 可见性 = 写入时 fan-out，不是读取时计算

- `listAlerts` 是 `pulse_firm_alert INNER JOIN pulse`（`packages/db/src/repo/pulse/scoped.ts:1181`）+ `pulse.status='approved'`。没有 fan-out 行 = 看不到。
- live fan-out（`refreshFirmAlertsForPulse`，`packages/db/src/repo/pulse/ops.ts:190`）给**所有 `status='active'` 的 firm 各写一行**，不按州/客户过滤——刻意设计（ops.ts:346-349 注释 "firm-wide visibility regardless of count"）。相关性只体现在每 firm 的 `matchedCount/needsReviewCount`（jurisdiction + entityType + taxType + OPEN + currentDueDate==parsedOriginalDueDate + county）。
- 唯一按相关性「不建行」的路径：catch-up/sweep 的 `skipZeroImpact`（仅 deadline_shift，ops.ts:350）。
- Onboarding 刻意 forward-only（`apps/server/src/organization-hooks.ts:62`）：曾试过注册即回填，产生 ~30 条 firm-wide matchedCount=0 噪音墙，被砍掉。教训成立。

### 已存在的定向召回链路（一半答案）

- `STILL_OPEN_CATCHUP_CHANGE_KINDS = ['protective_claim_window','deadline_shift']`（ops.ts:132）。
- 每日 9 UTC sweep `refreshStillOpenAlertWindows`（`apps/server/src/jobs/cron.ts:22`）+ 手动 oRPC `pulse.catchUpStillOpenWindows`（`/rules/sources` 按钮）会把**未过期**的这两类重新物化给 firm（含注册晚的 firm，最迟次日送达）。
- 自动过期免费：纯读取谓词 `pulseNotExpiredConditions`（ops.ts:141），过期落 History "Expired"，无 cron。
- 其余 change kind（filing_requirement 等）注册晚的 firm 永远看不到——已知缺口，本期不扩。

### 审批/状态机现状（2026-06-11 Q&A 确认）

- **现行管线已是全自动发布**（845fd581，2026-06-05 起）：confidence <0.3 丢弃；0.3–0.5 → `quarantined`（不 fan-out，同事件高置信重现时经 `applyDuplicateExtractToPulse` 自动晋升）；≥0.5 → `approved` 自动 fan-out + digest 邮件。Email 渠道例外：永远 quarantined（防伪造邮件铸造假 deadline alert，extract.ts:531-542——**保留**）。
- **`pending_review` = 旧管线化石**：04-25~05-01 第一版摄入不传 status，落 schema 默认值 `'pending_review'`（schema/pulse.ts:136），原设计等人工 approve，但审核 UI 从未建成——`approvePulse` 全仓无生产调用方（ops.ts:1298 注释自认）。线上 16 条卡死：约半数为垃圾（"页面无公告" conf 0.9 的非事件，今日管线会被 no_regulatory_change 拦掉），半数为真实灾害延期（MS/WV/TX、IRS Form 907）。
- `requires_human_review` 列全行=1 但无任何 gating 读取，vestigial。
- **Owner 决策（2026-06-11）：本产品不设人工审核。抓到 → 正确处理 → 直接推送。**

## 2. 数量（已统计，结论：不大）

- 线上 D1（staging=de-facto prod）：76 条 pulse（60 approved / 16 pending_review 化石），「仍可行动」≤16 条（parsed_new_due_date 未来 11 + effective_until 未来 5）；`pulse_firm_alert` 0 行（无 firm）。413 个 source 全 enabled。
- 域调研：任意时点联邦灾害延期 active ≈ 3–8 项（当前：CNMI 台风→11/2、GA 山火→8/20、HI 风暴→7/8、Israel §7508A→9/30、干旱 §1033(e) 滚动）；年度新增 30–80 条联邦 + 同量级州级（仅 9 州自动跟随联邦；P.L. 119-29 会推高量）。
- COVID 例子已失效：申报延期全部到期；唯一活口 = refund-claim tolling 至 **2026-07-10**（Kwong v. US），恰好是 protective_claim_window，且 30 天内到期。
- 每 firm 经相关性过滤后预期 **0–5 条**。重点是定性正确，不是防洪。

## 3. 推荐方案：「Catch-up as state, not news」（含双评审修正）

### 展示层

- 仍在 `/alerts`（workflow 都长在 alert drawer 上），顶部 pinned **"Already in effect" 分组带**：豁免 Review/Active toggle 和全部筛选器（否则被 `isActiveAlert` 队列切分撕成两半）、自带计数、按行动截止日（parsed_new_due_date/protective_action_deadline）**升序**、null 排带尾。
- 排除出所有「new」通道：splash / brief `newAlertCount`（`packages/db/src/repo/dashboard.ts:756-759, 981-982` 加 `origin='live'` 条件）、digest 邮件、铃铛。**计入** sidebar activeCount。
- Today hero 对 catchup 条目改用 "In effect · act by {date}" 框架；brief 行「带内有未处理项期间持续显示」（不是一次性）。
- BulkConfirmDialog 对 action deadline <60 天的 protective window 点名警示（防 onboarding 疲劳一键葬送不可恢复窗口）。
- 分组带需要服务端 origin 过滤参数或独立 endpoint（listAlerts 是 publishedAt keyset 分页，客户端跨页分组会错）。新 UI 文案过 Lingui en+zh + compile。

### 数据层

- 迁移：`ALTER TABLE pulse_firm_alert ADD COLUMN origin TEXT NOT NULL DEFAULT 'live'`（'live'|'catchup'）。
- **origin 永不进 upsert 的 conflict SET**（first-writer-wins；否则每日 sweep 把老 firm 的 live 行翻成 catchup、dup-fold 反向翻）。
- `'catchup'` **只在 onboarding 触发的 catch-up 写**；每日全局 sweep 给老 firm 新增的行保留 new 语义（那是「入驻后才加受灾县客户」场景唯一的知会渠道）。
- 触发点 = 首批 obligations 物化完成：import commit（migration/\_service.ts:756 附近）**和**手工建客户的 rules 激活点位（rules/index.ts:1066——现只调 refreshMatchedCountsForObligations，它只修 count 从不建行）都要挂 `backfillFirmAlertsForActiveLandscape`。
- PCW 的 skipZeroImpact 缺口要补：现行 sweep 只对 deadline_shift skip（ops.ts:404-409），PCW 会对零相关 firm 也建 0-impact 行——catch-up 路径两类都 skip。

### 摄入层（回填数据从哪来）

- **不新建 source**：`irs.disaster` adapter 已每小时盯 IRS 灾害索引页并抓详情全文（`packages/ingest/src/adapters/index.ts:119`）。回填 = 把它 baseline 时归档的 `parse_status='ignored'` / `failureReason='monitoring_baseline_established'` snapshot **重新入队 pulse.extract**（retry-sweep 是现成先例）。给已有 source 翻 `initialBaselineMode` 是 no-op（ensureSourceStates 只对账 enabled）。
- per-scan link cap（irs.disaster 10 / announcements 20）会静默截断积压，一次性回填临时调高；30s/host politeness → 50 详情页 ≈ 25 min，注意 queue 预算。
- dedupe_key 用集中计算的 `computePulseDedupeKey`（shared.ts:1153），**不自造 key 格式**（否则 live 重检永不碰撞 → 永久双条）。
- `pulseAlertMinRelevantAt` 不压「旧但仍生效」条目（取政策日期 MAX，不看发布日）——extract 侧无需改谓词。
- **（06-11 修订，替代原 B1/人工审批）回填走全自动 + 自动闸门**：与 live 相同 confidence 阈值/guard/dedupe；新增验收硬条件——deadline_shift 必须解析出非空 `parsed_original_due_date` 才允许 fan-out（否则 matchedCount 恒 0，skipZeroImpact 滤光，功能静默归零）；fan-out 用 quiet 变体（skipZeroImpact + origin='catchup' + 跳过 `queueFirmPulseReviewMessages`，约 20 行）——launch 后做州级回填时尤其关键，否则审批/晋升会给全体 firm 群发陈年公告邮件。
- 「统计数量」= staging 跑完看一眼结果列表（一次性 sanity check），不是流程闸门。

### 一次性清理（随回填做）

- 16 条 pending_review 化石按今日规则重放：非事件 → rejected/ignored；真实灾害延期（正是回填目标）重新 extract 或脚本置 approved（quiet 路径）。
- 顺带：source 注册表 `FED`(21) vs `federal`(5) 辖区写法统一（已拆独立任务）。
- 可选：`requires_human_review` 列废弃或移除（无读取方）。

### 体量保险丝（后置，预期触不到）

单 firm 带内 >10 条 → 折叠成一张 "N relief events affect M clients" 摘要卡。事件级 dedupe + 自动过期 + skipZeroImpact 是主防线。

## 4. 分期估算（修订后 ~5–7 天，删 B1 审批工具后比原估 6–8 天略降）

1. 迁移 + origin 写入语义 + newAlertCount 排除 + 回归测试（0.5–1d）
2. onboarding 触发自动 catch-up（两个挂点）+ PCW skipZeroImpact（1d）
3. 重驱 irs.disaster baseline snapshots + parsed_original_due_date 验收 + quiet fan-out + 16 条化石清理（2–3d）
4. "Already in effect" 分组带 UI + Today/brief 框架 + Lingui（1–2d）

明确不做进 launch：>10 折叠卡、deadline 行 "extended by relief" 徽章（视觉断联另案）、州级全覆盖（先 launch cohort 州）、OBBBA sunset 条款（属 planning-lever 方向）、其余 change kind 的 catch-up 扩展。

## 5. 被否方案

- **A. 注册即全量回填进新闻流**：organization-hooks.ts:62 的尸检直接否决（噪音墙 + 状态冒充新闻）。
- **B. 独立 "Active relief" tab**：概念纯但为 ≤16 条数据重建 apply/dismiss/notes 工作流，成本倒挂；origin 列 + 事件级 dedupe_key 已为日后升级留接缝。

## 6. 未决问题（owner 弄明白后开工）

- ~~Q1 alerts 怎么按 firm 过滤~~（已答：全推 + 每 firm 算影响计数）
- ~~Q2 pending_review 是什么~~（已答：旧管线化石；现行已全自动；不建审核工具）

## 7. 执行记录（2026-06-11，已全部落地 main 并部署）

提交序列（origin/main，CI 绿 + deploy-staging 成功，迁移 0078 已由 CI `db:migrate:remote` 应用到远端 D1）：

1. `feat(alerts): pulse_firm_alert.origin` — 迁移 0078 + origin 写入语义（first-writer-wins，永不进 conflict SET）+ newAlertCount 排除 catchup。
2. `feat(alerts): auto catch-up on first obligations` — 三个首批物化点位（import apply / rule accept / rule catalog）挂 `catchUpStillOpenWindowsOnFirstObligations`（total==createdCount 才触发）；`refreshStillOpenWindows` 对 PCW 也开 skipZeroImpact。
3. `feat(alerts): backfill seeding` — `POST /api/ops/pulse-backfill`（dev 开放 / staging 需 E2E_SEED_TOKEN / 其余 404）重驱 baseline-ignored + `pending_extract`+`backfill_seed` 快照；quiet fan-out（skipZeroImpact + origin='catchup' + 不发 digest，覆盖创建与 dedupe-fold 晋升两条路径）；seed 专属硬闸门：缺 parsed_original_due_date 的 overlay → quarantined（live 行为不变）。
4. `feat(alerts): Already in effect band` — origin/actionDeadline 贯穿 repo→ports→contracts→public；/alerts 新闻流查 origin='live'，band 查 'catchup'（豁免队列/筛选、按行动日升序、Dismiss all 走 BulkConfirmDialog）；两个 bulk 弹窗对 60 天内关闭的 PCW 点名警示；Today 卡 "In effect · act by {date}" 框架；brief 持续行。
5. i18n：22 条新 msgid（含 0a53c3d0 漏 extract 的 7 条 sidebar 字符串）en+zh+compile，幂等（drift gate 绿）。
6. `feat(alerts): day-zero landscape`（85322557，**owner 政策修订**）——新/免费账户应在导入任何客户之前就看到完整的「仍在生效」全景（监控广度本身即卖点）：catch-up 不再跳过 0 影响行，且在 **firm 创建时**（afterCreateOrganization，best-effort）即物化分组带；首批 obligations 触发器保留，职责变为「把 0 计数升级成真实 Affects-N」+ 注册时失败的兜底。每日 sweep **保持** skipZeroImpact（其行是 origin='live' 的「新提醒」，0 影响行每天当新闻推是骚扰）。安全论证：band 是 state-not-news（不计 new、不发邮件、可整组 dismiss、独立于新闻流），与当年 30 行噪音墙的本质区别在通道而非数量。已有老 firm 可经 /rules/sources 的 catch-up 按钮补齐缺失的 0 影响仍生效事件（已有 live 行不会被改写——first-writer-wins）。

**线上数据操作（staging D1，已执行）**：16 条 pending_review 化石 → `status='rejected'` + `dedupe_key=NULL`（防重抽取碰撞）；其 24 条关联快照 → `parse_status='pending_extract'` + `ingest_method='backfill_seed'` + `pulse_id=NULL`，**已就位等待入队**。预检确认：6 个化石源的 baseline 积压为 0（联邦当前事件已被 live watcher 收录为 approved），州级 baseline 积压共 1212 条（按计划延后，未触发）。

**回填执行结果（2026-06-11 16:20，token 已由 owner 设置，联邦批次已跑完）**：

- 首批 16/24 条入队并全部处理完：**4 条新建**（2 条缺 orig-due 的 deadline_shift 被硬闸门正确 quarantined；NY MFI filing_requirement + IRS Form 907 等 review_only 正常 approved）、**3 条折叠**进既有 live 事件（dedupe_key 正常工作）、**9 条被 guard 拦掉**（即当年的垃圾化石，no_regulatory_change 等）。
- 静默性验证：执行后一小时内 `email_outbox` 零新增 ✓。硬闸门验收：approved+overlay+orig_due NULL 的 seed 新建数 = 0 ✓（唯一一条同特征 approved 是 6/1 既有 live pulse，seed 仅折叠入内）。
- owner 首次 curl 的 404 = `wrangler secret put` 新版本数秒传播时差，重试即 200。

**⚠️ 还剩最后一条命令（owner 执行）**：24 条种子里有 8 条来自跨源折叠的州级机构源（MS/WV/TX 的灾害延期化石），不在首批 sourceIds 里。已验证这 8 个源无 baseline 积压（不会扫入额外内容）：

```bash
curl -X POST https://app.due.langgenius.app/api/ops/pulse-backfill \
  -H "x-e2e-seed-token: $(cat /tmp/ops-token.txt)" -H "content-type: application/json" \
  -d '{"sourceIds":["ms.employer_ui_agency","ms.income_tax","ms.tax_agency","tx.employer_ui_agency","tx.tax_agency","wv.employer_ui_agency","wv.income_tax","wv.tax_agency"]}'
# 期望 {"queued":8}。这些事件多已过期 → 大概率 ignored/quarantined/History-Expired，跑完即闭环。
```

注：staging 目前 0 个 firm，回填只生成全局 pulse 池；新 firm 注册导入客户时由首批 obligations catch-up 自动物化成 band。州级回填 launch 前按 cohort 州逐源 POST 同一路由即可（cap 200/次，1212 条 baseline 积压待用）。
