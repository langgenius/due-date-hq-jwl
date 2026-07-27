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

## 验证

`validate.test.mjs` / `resolve-counties.test.mjs` 仍全过。北卡两张卡经 T1 闸门(EN 版
tip 一度 5 行被规则 12 拦下,缩短后过)。所有数字对回 NCDOR 重要通知与新闻稿。

## 记一个大坑(另见当日 data-integrity dev-log 待补)

灾害卡数据源 `outreach-kit/disaster-notices.json` 有**过期错数据**:WA-2025-03 截止日
实为 5/1(已过),文件写 8/5;HI-2026-01 实为 7/8(已过),文件写 8/20。二者本该下线。
校验器只查内部自洽,查不出这种与 IRS 真值的偏差 —— 发布前必须联网对回 irs.gov。
待办:把当前 11 条 active 通知逐条对回 IRS 索引,下线过期、改对错误。
