# 灾害通知数据审计 —— 结论修正:WA/HI 都是延期后的现行值,不该删

2026-07-27 · `outreach-kit/disaster-notices.json`

## 经过(含一次被自己抓回来的错误)

准备灾害播报卡时,对 WA / HI 两条用 WebFetch 读 irs.gov 灾害减免索引页,模型返回
"WA 截止 5/1、无 8/5 条目""HI 截止 7/8",据此判定两条过期、从生效表移除
(commit 7e160d5f8)。

**这是错的。** 随后核对**仓库内人工核实源** `apps/marketing/src/lib/disaster-notices.ts`
(有 data-integrity 红线注释、逐条引用 irs.gov)—— 它写 WA=8/5、HI=8/20,且注意到
HI 的 sourceHref URL slug 是 `...postponed-to-july-8-2026` 却填 8/20,是"内部矛盾"。
再用多来源新闻搜索三角验证,真相是**两条都被 IRS 延期过**:

- **WA-2025-03**:原 5/1 → **延至 8/5**("IRS extends WA tax deadline _again_",
  MyNorthwest/KIRO7/Yahoo 均报)。**现行、未过期**(距今 +9 天)。
- **HI-2026-01**:原始新闻稿 **5/12 更新**,把 7/8 → **8/20**(Governor Green
  新闻稿 + Ascensus 证实)。**现行、未过期**(+24 天)。

IRS 把**原始**延期日写进新闻稿 URL slug,后续延期沿用旧 URL —— 所以 URL 里的日期
是"原始值",不是现值。我读的模糊索引页返回的也是延期前的旧值。**人工核实的
in-repo 文件才是对的。**

## 处理

**已还原**(restore `outreach-kit/disaster-notices.json` 到删除前):11 条生效不变,
WA(8/5)、HI(8/20)都回来了。`disaster-notices.ts` 本就正确,无需改动。

## 教训 / 待跟进

- **别拿一次模糊 WebFetch 覆盖人工核实源就做破坏性删除**。核实截止日要么读新闻稿
  正文原文、要么多来源三角,并优先信 in-repo 已核实数据。
- **WA 受灾县已从 9 个扩到 ~24 个**(延期时新增),`outreach-kit` 与
  `disaster-notices.ts` 的 WA `affectedArea` 仍是旧 9 县 —— 需按最新 irs.gov 名单更新。
  之前那张"华盛顿 9 个县"卡因此是**低估**,不能按 9 发。
- 真正该建的是"延期更新"追踪:同一 code 的截止日被 IRS 改过,要能捕捉 old→new,
  而不是当成过期。
