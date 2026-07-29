# LinkedIn 发现性:让 CPA 搜索时能搜到我们的帖

2026-07-28 · `docs/marketing/social/` + `posts/`

## 为什么

用户:「确保用户在 LinkedIn 搜索时我们的 post 能被搜到。deep dive。think about use cases。」
洞察:LinkedIn 内容搜索 + Google(收录公开 LinkedIn 帖)匹配的是**正文关键词(尤其前 3 行)
+ 话题标签 + 互动**。原来的配文专业但把关键词埋在中段,搜索命中弱。

## 做了什么

- **策略文档** `docs/marketing/social/linkedin-discoverability.md`:平台机制表、
  **用例→搜索查询→必含关键词映射**(灾区查截止日 / 查州规则 / 找清单-tracker /
  时事 / 客户类型)、关键词库、搜索优化模板、发布前检查清单。核心:每帖覆盖
  ①地点(州/县全称)②主题(税种/表号/法案号)③动作+时间(deadline/rate + 日期)。
- **升级 LinkedIn 配文模板**(`gen-disaster.mjs`):首行=搜索磁石
  「IRS tax deadline extension — <州>」,正文塞全州名/灾害名/公告号/日期/县数,
  结尾加互动钩子 +「source in the comments」,标签加 #StateAndLocalTax + 州名。
  同法升级了 CA(07-28)帖的 LinkedIn 首行(PTET / SB 132 / 2030)。
- **旗舰每周清单帖** `posts/weekly-list/`:一帖列全部现行 IRS 延期(11 条,按最近截止
  日排)——含 10+ 州名 + 全灾害名,搜索命中面最广,并把 DueDateHQ 立成"监控源";
  每周更新。中英双版。
- **生成器自包含**:`gen-disaster.mjs` 改为直接 `import DISASTER_NOTICES`(经 tsx),
  去掉易碎的临时 dump 步骤。跑法:`npx tsx gen-disaster.mjs`。

## 待续

清单帖的视觉版可用 kit 的 `kind:"multi"` 多辖区版式渲一张清单卡(未做,用户点头再出)。
