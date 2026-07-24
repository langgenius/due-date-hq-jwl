# 小红书 + LinkedIn 手动发布机制 (2026-07-24)

## What

给小红书 / LinkedIn 建了一套与 X 自动发布(#119)同构的发布机制。X 有 API 全自动，
这两个渠道没有可用发布 API，所以本机制自动化「生成 + 出图 + 打包」，人只做最后
「贴出去」并在 Issue 回写记录。

- **生成器** `scripts/social-manual.mjs` —— 从单一数据源
  (`apps/marketing/src/lib/disaster-archive.json` 全量 206 +
  `outreach-kit/disaster-notices.json` 当前生效 11) 计算权威数字，注入已验收的
  navy 6 图卡片模板，playwright 导出 1080×1440 PNG，并生成小红书配文 + LinkedIn 帖 +
  发布 checklist 到 `docs/marketing/xiaohongshu/LATEST-PACK.md`。`--light` 出浅色版。
  卡片自检溢出 = 0。
- **活页面** GitHub Issue #120「📣 Manual social queue · 小红书 + LinkedIn」——
  镜像 #119：每次生成/发布追加一条评论，Issue 即运行日志。
- **卡片模板** `docs/marketing/xiaohongshu/card-template{,-light}.html` +
  导出 `exports/` `exports-light/`（各 6 张）。

## Why

之前小红书是「每次手搓」，数字要人工核对(这次核 14/206/62/11 花了很久，还一度把
2026 数错成 10、把 941/940 错标成消费税)。系统化后：三渠道同源、数字自动对齐、
术语纪律(CPA 面向)写死在生成器里，不再靠人记。

## 设计与准确性纪律(固化在生成器)

- 只用核实数据，逐条对过 irs.gov；口径固定：总数 / 峰值年 / 平均间隔 / 本年发布数 / 当前生效(州+地区)。
- 小红书首帖纯价值、不提产品；产品钩子只藏在账号名「美国报税不漏DDL」。
- 术语：941/940 = 工资/就业税(非消费税)；联邦延期写 IRS(非各州)；日期中文「8月5日」；
  「受灾地区」(含堂区/部落/领地)。

## 当前权威数字(生成器实算)

总数 **206**(2020 至今) · 峰值 **2024 = 62** · 平均每 **12** 天 · 2026 上半年 **14 份** ·
当前 **11 份**延期生效(**9 州 + 1 地区**)。

## 用法

```bash
node scripts/social-manual.mjs          # navy 版
node scripts/social-manual.mjs --light  # 浅色版
# → 看 docs/marketing/xiaohongshu/LATEST-PACK.md，手动贴，Issue #120 回写
```
