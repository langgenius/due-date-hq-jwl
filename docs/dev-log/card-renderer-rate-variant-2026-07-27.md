# 变更卡渲染器:规则/税率变更变体(rate)+ 州级表单校验放宽

2026-07-27 · `docs/marketing/xiaohongshu/card-renderer/`

## 为什么

X 每天发的是**州级规则变更** alert(来自已核准 Pulse),不是灾害延期。今天那条是
北卡 Mecklenburg 县销售税 7.25% → 8.25%(7/1 生效)。要把它做成小红书/LinkedIn 成品
图,需要一个"税率/规则变更"卡片版式 —— 灾害延期卡的 old→new 是**日期**,套不进税率。

## 做了什么

- **新增 `rate` kind**:无需改渲染逻辑 —— `card.js` 的非 multi / 非 pending 分支本就渲染
  `oldDate → newDate` 高亮版式,`rate` 直接复用它,把两端当**税率字符串**(`7.25%` →
  `8.25%`)。`validate.js` 的规则 1(日期方向)、规则 4(法定截止日)本就只对
  delay/correction 生效,`rate` 自动跳过,无需特判。
- **规则 3 按辖区分级**:联邦卡(IRS/FEMA)仍严格对齐联邦表单白名单(拦住不存在的
  表号);州级卡放行州表单代码(`E-500` / `E-500E` / `DR-…` 短代码)与「州…」描述,
  但仍拦自由文本(带空格/中文句子的长串)。先前州级卡会把 `E-500` 误判为非法。
- **双格式产出**:同一事件两份 payload —— 小红书(zh · xhs · 3:4)+ LinkedIn
  (en · li · 4:5),`nc-today.json`。渲染验证:小红书 2160×2880,LinkedIn 2160×2700。
- 顺手修:header 的 `verified` 占位符 `@` → `✓`(先前渲染成字面 @,像 bug);
  `render-cards.mjs` 出图日志按 format 打印真实高度(li=1350,否则 1440)。

## 追加:`note` 卡型 + 小红书两页轮播(同日)

用户要求"实务提示单独放一页" → 小红书变两页。新增 `kind: "note"`:复用头部/页脚
做连续性,大标题(实务提示)+ 编号要点列表(lime 圆点),整页可读字号。同一事件的
小红书 payload 拆成 p1(rate,去掉 tip,留白聚焦)+ p2(note,4 条要点);LinkedIn
仍单图(en,tip 内嵌)。`note` 跳过 forms/tip/stamp。

## 追加:封面钩子(cover)+ LinkedIn 横版(wide)(同日)

用户反馈:小红书封面不够"勾人",瀑布流里没人点进来;LinkedIn 竖版偏窄,横版更好。

- **`kind: "cover"`**:小红书轮播第 1 页 = 大字新闻式钩子(128px)+ lime 高亮关键数字
  (标题用 `[[…]]` 包住的片段套高亮)+ eyebrow 标签 + 针对性 sub("有 X 客户的会计师
  先收藏")。钩子标题写成短行数组(每行 ≤6 CJK,避免自动换行产生孤字)。轮播结构
  变 封面 → 数据 → 实务提示(3 页)。
- **`format: "wide"`**:LinkedIn 横版 16:9(1920×1080)。模板把主体裹进 `.ddhq__lead`
  (竖版 `display:contents` 透明、不影响原布局;横版才变 2 栏 grid:左标题+变化,
  右实务提示面板)。规则 12 行数上限横版放宽到 8(右栏纵向有空间)。
- 成品归档:`docs/marketing/xiaohongshu/posts/2026-07-27/`(12 图 + README 含全部配文)。

## 验证

`validate.test.mjs` / `resolve-counties.test.mjs` 仍全过。北卡两张卡经 T1 闸门(EN 版
tip 一度 5 行被规则 12 拦下,缩短后过)。所有数字对回 NCDOR 重要通知与新闻稿。

## 记一个大坑(另见当日 data-integrity dev-log 待补)

灾害卡数据源 `outreach-kit/disaster-notices.json` 有**过期错数据**:WA-2025-03 截止日
实为 5/1(已过),文件写 8/5;HI-2026-01 实为 7/8(已过),文件写 8/20。二者本该下线。
校验器只查内部自洽,查不出这种与 IRS 真值的偏差 —— 发布前必须联网对回 irs.gov。
待办:把当前 11 条 active 通知逐条对回 IRS 索引,下线过期、改对错误。
