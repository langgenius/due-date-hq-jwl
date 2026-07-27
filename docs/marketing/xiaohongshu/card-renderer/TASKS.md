# 待办工单

按顺序做。每条都能独立验收。先读 `CLAUDE.md`。

规矩:每完成一条,跑 `check-collisions.py` + `export.py`(全部 payload),
确认零溢出、零重叠、画布尺寸正确,再动下一条。

---

## T1 · 发布前校验 `validate.js`

**最高优先级,先于任何视觉工作。**

新增 `validate.js`,导出 `validate(data) -> {ok, errors[]}`。`export.py` 在渲染前
调用,任一失败则**阻断**,不生成图。

必须实现的规则:

1. `kind=delay` 时 `newDate > oldDate`;`kind=correction` 时两者必须不等
2. `noticeId` 的年份 == 公告发布年份
3. `forms` ⊆ 白名单 `{1040, 1040-SR, 1041, 1065, 1120, 1120-S, 990, 941, 940, 5500, 706, 709, 预缴, Estimated}`,不接受自由文本
4. `oldDate` 命中该税种的法定截止日表(需先建这张表)
5. `map.counties` 全部能解析出 FIPS,数量 == 标题里写的县数
6. FIPS 的州前缀 == 公告所属州
7. `noticeId` 在 irs.gov 可取到 200,且页面正文含该编号
8. `publishedAt >= detectedAt`(若 `detectedAt` 非空)
9. `detectedAt` / `publishedAt` 必须带时区
10. `forms` / `scope` 只能来自结构化字段,**禁止**从公告正文自由文本抽取
11. 同一 `noticeId` 已发布过 → 强制 `kind=correction`,不得静默覆盖
12. `tip.body` 长度:按**渲染后实测行数**卡,不要按字符数猜。超限则报错并给出实际行数

**为什么这条排第一:** 实际已经连着出过三次数字错误——不存在的表号
`1140`/`1232`、不存在的截止日 `4月5日`、算错的倒计时 `12 天`。人工审防不住。

**验收:** 故意造 12 条各违反一条规则的 payload,`validate` 全部拦下并给出可读报错。

---

## T2 · 县名 → FIPS 解析 `resolve-counties.js`

IRS 公告只给县名,不给 FIPS。映射表在 `county-index.json`。

**必须在入库时一次性解析成 FIPS 存下来,渲染时不再按名字匹配。**

必须处理的陷阱:

- 弗吉尼亚有独立市和同名县:Richmond city `51760` vs Richmond County `51159`
- 马里兰:Baltimore city `24510` vs Baltimore County `24005`
- 密苏里:St. Louis city `29510` vs St. Louis County `29189`
- 路易斯安那是 parish,阿拉斯加是 borough / census area

用 `namelsad` 区分,不要只看 `name`。匹配不唯一时**报错,不要猜**。

**验收:** 上述四类各造一个用例,全部正确解析或正确报错。

---

## T3 · `detectedAt` / `publishedAt` 拆分 —— 已完成一半

现在只有 `detected`,并默认它总是"实时监测到的"。但有些条目是补录的历史公告,
那枚 `DETECTED` 印章会变成谎言——而印章正是整张卡的可信度来源。

payload 改成两个字段:`detectedAt`(可为 null)、`publishedAt`(必填)。

`card.js` 按此选印章:

| 条件 | 印章 | 颜色 | footer |
|---|---|---|---|
| `detectedAt` 存在,与 `publishedAt` 相差 ≤48h | `DETECTED` + 时间 | 墨蓝 `--stamp-ink` | 本月第 N 次变更 · 51 个辖区监测中 |
| `detectedAt` 为 null | `ON FILE` + `publishedAt`,不显示时间 | 中性灰 `#8E8C85` | 归档记录 · 51 个辖区全年可查 |
| `detectedAt` 存在但滞后 >48h | `DETECTED` + 时间,如实显示 | 墨蓝 | 同第一行 |

第三种不要粉饰。滞后就是滞后,掩盖一次比承认一次贵得多。

校验追加:`detectedAt` 为 null 时,**禁止**生成任何含「监测到」「第一时间」
`we picked this up` 字样的文案。

**已做:** `card.js` 已实现 `ON FILE` 归档印章(中性灰,显示 `publishedAt`,
不显示时间),`caption.js` 已实现归档措辞并加了"归档条目不得声称实时监测到"
的断言。样例见 `archive-sample.json`,`check-collisions.py` 已通过。

**还差:** 字段名仍是 `detected` 而非 `detectedAt`;>48h 滞后的第三种情况
尚未区分;footer 的两套措辞目前靠 payload 手写,应由 `kind` 自动决定。

---

## T4 · 文案生成 `caption.js` —— 已完成

导出 `buildCaption(data)`,输入就是渲染用的同一个对象,输出纯文本。
改 `export.py`,每张 PNG 旁写同名 `.txt`。

**中文(小红书)** 六段:标题行(州+范围+旧日期→新日期)、⚠️ 实务提示、
适用县+覆盖税种+公告号、补充要点、监测时间+本月第几次+主页引导、标签。

- 前两段合计 ≤70 字 —— 那是折叠前唯一可见的部分,实务提示必须在这里
- 全文 ≤350 字
- 县名保留英文原名不翻译(CPA 按英文名核对客户地址)
- 标点全角,中英之间加半角空格
- 不放 URL

**英文(LinkedIn)** 三段,更短:

- 开头 140 字符内必须有钩子句(LinkedIn 折叠点)
- 无 emoji,hashtag ≤3 个或不加
- 不放 URL —— LinkedIn 压制带外链的帖子,链接放评论区
- 术语走 `CLAUDE.md` 里的强制表,`postponed` 不写成 `extended`

四种 kind 各一套措辞:`correction` 开头写「更正」/「Correction」并直接说错在哪,
不要绕;`pending` 不写新日期,写「先按原截止日备件」;`multi` 用逐州列表
替换适用县段。

**硬约束:** caption 和图必须来自同一对象的同一批字段。**禁止在 caption 里
重新计算或改写任何日期、表号、县数。** 之前出过图文数字不一致。

**已做:** `caption.js` 已实现,中英双语、四种 kind、归档态。`export.py` 每张
PNG 旁写同名 `.txt`,并打印超限警告。已验证:14 州那条触发 `body 369 > 350`
警告(报警而非静默截断),归档态不产出"监测到"字样。

**还差:** `caption.extras` 和 `caption.tags` 目前是手写的,应按 `kind` 和
`reason` 自动选默认值;英文 lede 的四套句式偏模板化,真实公告多了之后需要
按公告类型细分。

---

## T5 · 像素回归

改任何 CSS 后跑全部 payload,和上次输出做 diff,超过阈值要人确认。

日更 + 模版自动填,没有这一层的话某次改动会静默毁掉某种状态的排版,
而那种状态可能几周才出现一次。`correction` 和 `pending` 尤其危险——
它们出现频率最低,坏了最久才被发现。

顺带加一条断言:渲染后检查标题实际解析到的 `font-family` 和 `font-weight`。
字体从 CDN 加载,CI 里没下载完会**静默 fallback**,图正常生成、不报错,
但字体是错的。这类失败最难发现。

---

## T6 · 「今日核查」卡

新增 `kind: "clear"`。无变更的日子发这个,是日更能成立的前提。

版面:51 个辖区网格全绿 + 「0 变更,已核 51 个辖区」+ 印章。

**为什么重要:** 这是审计 tick mark 里 `Ø`(检查了,确认无异常)的逻辑——
**「没变」和「没查」必须区分开,而证明自己每天都在查,是监控产品唯一的
信任来源。** 竞品做不出这个栏目,因为他们没在查。

它天然日更、天然不过期、天然复用同一套模版。

**不要为了填空档而拔高无关紧要的变更。** 那比不发更伤可信度。

---

## T7 · CJK 排版

需要真实文案才测得出来,做完 T4 后再动。

- **标点避头尾**:长句在特定宽度下会把「,」「。」甩到行首。加
  `line-break: strict` 并用真实公告文案实测。
- **中英混排间距**:「致电 IRS 灾害热线」现在靠人手打空格。渲染前自动插入,
  或用 `text-autospace`。

---

## T8 · 自托管字体

上生产必须做。现在从 Google Fonts 加载。

**务必把思源宋体 900 一起打包** —— 缺了会静默回退到 700,视觉上只是
"稍微弱一点",最难发现。配合 T5 的字重断言一起用。

---

## 已知未解决,暂不处理

- 只在 Chromium 验证过。导出走 PNG 所以影响有限,若做网页版需测 Safari 的
  `mix-blend-mode` 和 `feTurbulence`。
- `title` 只支持两行。出现「马萨诸塞州及以下市镇」这类超长主语时无降级方案。
- 多州卡超过 12 行截断为「另有 N 个辖区」,这个上限尚未和用户确认。
