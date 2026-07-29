# LinkedIn 可被搜到 —— 发现性策略(deep dive)

目标:CPA / EA 在 LinkedIn(以及 Google —— 它会收录公开 LinkedIn 帖)搜索税务问题时,
我们的帖子能被搜到。核心洞察:\*\*搜索匹配的是帖子正文里的词(尤其前 3 行)+ 话题标签

- 互动量。\*\* 所以"写对词、把词提前、用全称"比什么都重要。

---

## 1. 平台怎么把帖子推给搜索者(据此优化)

| 机制             | 含义                                                                       | 我们要做的                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **正文关键词**   | LinkedIn「内容」搜索 + Google 都匹配正文文字,**前 140 字**(折叠前)权重最高 | 第一行就放"州名 + 税种 + IRS/变更 + 年份 + 截止日"                                                                                   |
| **实体全称**     | 搜索按精确字符串匹配                                                       | 用 **North Carolina** 不用 NC;写全县名、表号(E-500 / Form 3804)、法案号(SB 132)、公告号(WA-2025-03)、灾害名、确切日期                |
| **自然搜索短语** | 人搜的是口语短语                                                           | 原样嵌入:"IRS tax deadline extension"、"California PTE elective tax"、"SALT cap workaround"、"Mecklenburg County sales tax increase" |
| **话题标签**     | 可关注 + 可搜;宽标签靠关注者扩散,窄标签精准命中                            | 3–5 个 = 宽(#Tax #CPA #IRS #Accounting)+ 窄(#SalesTax #PTET #DisasterRelief #StateAndLocalTax + #州名)                               |
| **互动 + 停留**  | 高赞/评论/转发/停留 → 搜索与信息流都上排                                   | 结尾抛问题、提示"保存/收藏";链接放**首条评论**(正文带外链会被降权)                                                                   |
| **一致 + 高频**  | 同主题稳定输出 → 建立话题权威                                              | 每周固定栏目(见下"清单帖"),关键词一致                                                                                                |
| **Google 收录**  | 公开帖能在 Google 搜到                                                     | 等于多一个入口:CPA Google"IRS Georgia deadline 2026"可能出我们的帖                                                                   |

---

## 2. 用例 —— CPA/EA 会怎么搜,我们靠什么词被命中

| 用例(谁,什么场景)           | 会搜的查询                                                                                                                                            | 我们必须出现的关键词                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 客户在灾区,查截止日有没有变 | "IRS Georgia tax deadline 2026"、"Washington IRS disaster relief"、"Michigan tax deadline extension"                                                  | 州全称 · IRS · tax deadline · disaster relief · postponed/extension · 灾害名 · 公告号 · 日期 · Form 1040 |
| 查某州具体规则变更          | "Mecklenburg sales tax"、"North Carolina sales tax increase 2026"、"E-500"、"California PTE 2026"、"SB 132"、"PTET California"、"SALT cap workaround" | 州 · 税种(sales tax / PTE / income tax)· 表号 · 法案号 · 税率/变化 · 生效日                              |
| 找一份"总清单"/监控源       | "IRS disaster relief list 2026"、"active IRS tax deadline extensions"、"tax deadline tracker"                                                         | 见 §4 每周清单帖 —— 一帖含多州名+多灾害,命中面最广,并把 DueDateHQ 立成"监控源"                           |
| 保持时事更新                | "state tax changes 2026"、"tax law updates 2026"、"CPA tax news"                                                                                      | tax changes · 2026 · state tax · 每周栏目名                                                              |
| 特定客户类型                | "pass-through entity tax California"、"nonprofit Form 990 deadline"、"payroll 941 deadline extension"                                                 | 实体类型 + 表号 + 州 + deadline                                                                          |

**结论:每条帖至少覆盖三类可搜实体 —— ①地点(州/县全称)②主题(税种/表号/法案号)
③动作+时间(deadline/extension/rate change + 确切日期 + 年份)。**

---

## 3. 关键词库(嵌进正文与标签)

- **通用高频**:IRS · tax deadline · tax deadline extension · disaster relief · state tax · CPA · tax professionals · 2026
- **灾害类**:IRS disaster relief · deadline postponed · federal filing deadline · [State] tax relief · [disaster name] · FEMA
- **州规则类**:sales and use tax · pass-through entity tax (PTET) · SALT cap workaround · elective tax · rate change · applicability
- **实体/表号**:Form 1040 / 1120 / 1120-S / 1065 / 990 / 941 · E-500 · Form 3804 / 3893 / 3804-CR · SB 132 · 公告号
- **标签池**:#Tax #IRS #CPA #Accounting #TaxProfessionals #EnrolledAgent(宽)· #SalesTax #PTET #StateAndLocalTax #SALT #DisasterRelief #TaxDeadline #TaxPlanning #TaxNews #州名(窄)

---

## 4. 旗舰栏目:每周「现行 IRS 截止日清单」(Grace「On My Radar」打法)

一帖列出**当前所有生效的 IRS 报税延期**,按最近截止日排序。作用:①命中"list/tracker"
类搜索;②一帖含 10+ 州名 + 多灾害名 = 命中面最广;③把 DueDateHQ 立成"我们盯着这些"
的监控权威;④每周更新 = 高频 + 时效。模板见 §5-C。

---

## 5. 搜索优化后的模板(替代原来的"专业但埋词"写法)

**A. 灾害延期帖** —— 第一行是搜索磁石:

```
IRS tax deadline extension — [State].
The IRS has postponed federal tax deadlines to [Month Day, Year] for [State] taxpayers hit by [disaster], following disaster relief [notice code]. If you have clients in [counties/area], their federal filing and payment deadlines have moved.
…（覆盖表单、自动适用、hotline）…
Which of your clients does this affect? Source in the comments.
#IRS #DisasterRelief #TaxDeadline #CPA #[State]
```

**B. 州规则变更帖**:

```
[State] tax change — [topic, e.g. Mecklenburg County sales tax increase].
Effective [date], [what changed, with the number]. [Form/bill]. If you have [client type] clients in [State], here's what changes …
Which clients does this hit? Details in the comments.
#SalesTax #StateAndLocalTax #CPA #[State] #Tax
```

**C. 每周清单帖**:

```
IRS disaster relief — every open federal tax deadline (weekly).
Here are all the IRS tax-deadline postponements in effect right now, ranked by the closest deadline. If you have clients anywhere on this list, their federal deadlines have moved:

Aug 5, 2026 — Washington · severe storms & flooding
Aug 20, 2026 — Georgia · Southeast wildfires
… （全部现行,州全称 + 灾害名）…

Every entry is transcribed from the official IRS release. Follow for the updated list each week — this is what we monitor at DueDateHQ.
#IRS #DisasterRelief #TaxDeadline #CPA #Tax #Accounting
```

---

## 6. 检查清单(发每条前过一遍)

- [ ] 第一行含:州全称 + 税种/主题 + IRS/变更 + 确切日期 + 年份
- [ ] 正文含:全县名/表号/法案号/公告号/灾害名(能搜的精确字符串)
- [ ] 用自然搜索短语(不是缩写、不是内部黑话)
- [ ] 3–5 标签 = 宽 + 窄 + 州名
- [ ] 结尾有互动钩子(问题 / "save this")
- [ ] 外链放首条评论,不放正文
- [ ] 主题与上周栏目一致(建权威)
- [ ] **排版紧凑,别一句一空行** —— 首行钩子单独一行,其余合成 1–2 段密文;要点用 • 但要点之间不加空行。整条 3–4 块就够(钩子/正文/问题/标签)。
