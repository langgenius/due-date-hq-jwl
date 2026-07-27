# DueDateHQ 变更卡

吃 JSON 出 1080×1440 PNG。四种状态共用一套刻度。

```
card.css      设计 token + 版式，唯一的真值来源
card.js       renderCard(data) -> HTMLElement
export.py     批量渲染成 PNG
index.html    预览（全尺寸 + 172px 瀑布流并排）
samples.json  四种状态的示例 payload
stress.json   多州压力测试：6 / 8 / 12 / 14 州
icons/        52 个辖区的州图标，county 级 path，id 为 FIPS
```

## 跑起来

```bash
pip install playwright && python3 -m playwright install chromium
python3 export.py samples.json out/            # 1080×1440
python3 export.py samples.json out/ --scale 2  # 2160×2880

python3 -m http.server 8899   # 然后开 localhost:8899 看预览
```

## payload

```jsonc
{
  "id": "wa-storm-delay",          // 输出文件名
  "kind": "delay",                 // delay | correction | pending | multi
  "locale": "zh",                  // zh (默认) | en
  "format": "xhs",                 // xhs = 1080×1440 (默认) | li = 1080×1350
  "source": {
    "level": "联邦",               // 联邦 | 州 | 地方
    "org": "IRS",
    "noticeId": "WA-2025-03",
    "verified": true               // true 时公告号后加 @ = 已比对官方原文
  },
  "reason": "风暴洪水 · 灾害减免",
  "map": { "state": "WA", "counties": ["53033", "53053"] },  // FIPS
  "title": ["华盛顿", "9 个县"],   // 数组 = 强制换行位置
  "dateLabel": "联邦报税截止日",
  "oldDate": "4月15日",
  "newDate": "8月5日",
  "rows": [                        // 仅 kind=multi，此时忽略 oldDate/newDate
    { "state": "FL", "name": "佛罗里达", "scope": "全州", "date": "8月1日" }
  ],
  "forms": ["1040", "1120", "1065", "预缴"],
  "tip": { "label": "实务提示", "body": "…" },
  "detected": { "date": "7/18", "time": "09:14 ET" },
  "footer": "本月第 7 次变更 · 51 个辖区监测中"
}
```

`detected` 可选 `position`（CSS 定位串）和 `size`，用于多州卡这类版面更满的情况。

## 代码里固化的设计规则

改之前先读这一段，这些不是随手调的值。

**字号只有四级** — `--s-display` 108 / `--s-title` 47 / `--s-body` 31 /
`--s-meta` 23。数字自成一级（94 / 40）。不要新增中间值：之前的版本有
15/16/17/22/23 五个字号挤在一起，语义不同但视觉无差别，眼睛无法建立层级。

**标题必须是一句完整的话，且必须带动词。** 只读标题就要能懂发生了什么。
`title` 数组的两行是固定语法：第一行 = 谁/哪里，第二行 = 发生了什么。
断行只能断在这两者之间，不能把一个词组劈开。

    对： ["华盛顿 9 个县", "报税延期"]  ["北卡全州", "将延期"]
    错： ["华盛顿", "9 个县"]           ["4 个州", "各不相同"]

**标题带动词，但不带日期。** 「延期」进标题，「8月5日」不进——日期行独占
"变成了什么"，同一个日期在一张卡上只出现一次。

**CJK 标题不能用负字距。** `letter-spacing` 必须是 0 或正值。负字距是西文手法，
用在中文上会让宋体的细笔画粘连，是大字号下最直接的可读性杀手。行高不低于 1.22。

**新日期必须明显大于旧日期**（94 vs 40）。核心叙事是"一个死了一个活着"，
不能只靠删除线区分。

**红色只表示"这是错的"。** 延期是好消息，删除线走中性灰、印章走墨蓝
`--stamp-ink`。只有 `kind=correction` 整卡转红。把红色用在延期上会让第一秒
的情绪读取和消息性质相反。

**柠檬绿是唯一亮色**，只用于两处：来源层级标签、新日期的高亮条。提示块用它
的稀释版 `--lime-pale`，不引入新色相。

**版面有两条轴。** 标题贴左边距，日期块右移 `--step` (104px)，形成一级阶梯；
印章旋转 -9° 落在右侧。三者构成对角动线，避免整版塌在同一条左对齐轴上。
改版式时不要把日期块拉回左对齐——那是之前版本"正确但没有设计"的主因。

**多州卡按行数自动切密度。** ≤4 行常规，5–6 行 `--compact`，7 行以上转
`--two` 双栏；超过 12 行截断并显示"另有 N 个辖区"。已在 4 / 6 / 8 / 12 / 14
州下验证零溢出。改行内任何字号或 padding 后，跑 `stress.json` 重测。

**标题字重是 900，不是 700。** 思源宋体在 108px 下 700 偏轻，撑不住整版。
自托管时务必把 900 一起打包——缺了会静默回退到 700，视觉上只是"稍微弱一点"，
最难发现。

**两个画布尺寸。** 小红书 `xhs` 用 3:4 (1080×1440)；LinkedIn 竖图上限是 4:5，
超过会被裁，所以 `li` 用 1080×1350。切换靠 `format` 字段，不要手动改 `--canvas-h`。

**英文版不是翻译，是另一套排版。** `locale: en` 时标题走 `--font-serif-lat`，
字号从 108 降到 76（英文标题更长，需要三到四行），`--step` 从 104 收到 72。

**英文术语强制。** 灾害减免的日期变动一律写 `postponed`，**禁止写 `extended`**
——在 CPA 语境里 extension 特指 Form 4868 那种主动申请的延期，用错这个词
懂行的人一眼看出不是圈内人。另：`covered disaster area`、`affected taxpayers`、
`estimated payments`（不要把"预缴"直译）。

**州图标是锚点不是数据。** 104px 下县界读不出来，它的职责只是让人一眼认出
是哪个州。要展示县级信息就用文字或另开一张。

**颗粒和高亮条是代码生成的**，不是贴图。颗粒是 `feTurbulence` +
`mix-blend-mode: multiply`，opacity 4.5%；高亮条是 `preserveAspectRatio="none"`
的手绘路径，两边边缘有起伏，所以拉伸到任意宽度都保持马克笔笔触感，不会变成
纯矩形。

**中文标题必须是宋体。** 之前用 `--font-voice` 之类的西文衬线会导致中文回退到
随机字体，视觉上不成立。这里显式加载思源宋体。

**数字开了 `tabular-nums`。** 日期每天变，不开表格数字会导致字宽跳动。

## 字体

目前从 Google Fonts 加载。上生产建议自托管：CI 里渲染时若字体没下载完会
静默 fallback，导致输出的图字体不对但不报错。`export.py` 里已经 await
`document.fonts.ready`，但那只保证已声明的字体加载完，不保证声明本身到位。

## 3:4 与瀑布流

画布就是 3:4，信息流不会裁切。但小红书双列瀑布流的实际显示宽度约 172px，
`index.html` 下方那排就是按这个尺寸缩放的。改版式后先看那一排：标题和新日期
必须还能读，其余可以糊掉。

## 州图标数据

来自 US Census Bureau `cb_2023_us_county_500k`（公有领域），已简化。
每个 county 是一条 `<path id="c{FIPS}">`。

county 名到 FIPS 的映射见 `us-county-maps/index.json`。**弗吉尼亚、马里兰、
密苏里有独立市和同名县**（如 Richmond city 51760 / Richmond County 51159），
入库时用 `namelsad` 区分并存 FIPS，渲染时不要再按名字匹配。

## 发布前校验

这些必须在生成图之前跑，图是最后一步：

1. `countdown_days == (deadline - publish_date).days`
2. `kind=delay` 时 `newDate > oldDate`
3. `noticeId` 年份 == 公告发布年份
4. `forms` ⊆ 白名单 `{1040, 1040-SR, 1041, 1065, 1120, 1120-S, 990, 941, 940, 5500, 706, 709, 预缴}`
5. `oldDate` 命中该税种法定截止日表
6. `map.counties` 全部解析出 FIPS，数量 == 标题里写的县数
7. FIPS 州前缀 == 公告所属州
8. `noticeId` 在 irs.gov 可取到 200 且页面含该编号
9. `publish_date >= detected.date`
10. `detected.time` 标注时区
11. `forms`/`scope` 来自结构化字段，禁止从正文自由文本抽取
12. 同一 `noticeId` 已发布过 → 强制 `kind=correction`，不得覆盖原文
