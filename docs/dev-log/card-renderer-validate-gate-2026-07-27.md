# 变更卡渲染器:发布前校验闸门(T1)+ 县名→FIPS 解析(T2)

2026-07-27 · `docs/marketing/xiaohongshu/card-renderer/`

## 为什么

变更卡是「把 IRS/50 州报税延期 alert 当每日新闻播」的成品图,给专业 CPA 看。
**图上任何一个数字错了,产品就废了。** 历史上已连着出过三次数字错误(不存在的
表号、不存在的截止日、算错的倒计时),人工审防不住。所以 kit 的 TASKS.md 把
「发布前校验」列为最高优先级、先于任何视觉工作。这次实现它,并接进渲染管线做
硬阻断。准确 > 美观。

## 做了什么

**T2 · `resolve-counties.js`** —— 县名→FIPS。IRS 公告只给县名,渲染要 FIPS。
- `resolveCounties(state, names) -> {fips[], errors[]}`:先按完整 `namelsad` 精确
  匹配,能区分独立市 vs 同名县(Richmond city 51760 / Richmond County 51159);
  再按去后缀的裸名匹配。**匹配不唯一时报错,不猜。**
- `checkFips(state, fips[])` / `stateFipsPrefix(state)`:供校验复用(规则 5/6)。
- 验收 `resolve-counties.test.mjs`:VA/MD/MO 市县、LA parish、真实 WA 9 县、
  歧义→报错、未匹配→报错、未知州→报错,全过。

**T1 · `validate.js`** —— 发布前校验,导出 `validate(data, opts) -> {ok, errors[], warnings[]}`。
实现 12 条规则:日期方向、公告号年份==发布年份、forms⊆白名单(禁自由文本)、
oldDate 命中法定截止日表(内建历年制联邦截止日表)、FIPS 有效+数量对得上标题、
FIPS 州前缀、时间戳顺序与时区、detectedAt 空时禁「实时监测」措辞、重复公告强制
correction、tip 按**渲染后实测行数**卡。需 I/O 或历史状态的三条(7 联网、11 重复、
12 行数)通过 opts / 异步 `checkNoticeLive()` 传入。
- 关键修正:规则 4(法定截止日)只对 `kind=delay`;correction 的 oldDate 是上一条
  被更正的延期日,本就不是法定截止日,不能套表(否则误杀合法更正卡)。
- 验收 `validate.test.mjs`:4 条合法样例全过,12 条各违一规则的 payload 全部拦下,
  报错可读。

**接入渲染管线** —— `render-cards.mjs` 渲染前逐条 `validate`,任一硬错即阻断、不出
任何图并 `exit 1`;规则 12 在渲染后读真实 `.ddhq__tb` 行数回填再判,超行跳过该张。
调试逃生阀 `--no-validate`。端到端验证:合法 4 张正常出图;把 oldDate 改成
`4月5日`(不存在的截止日)→ 渲染被阻断,报「规则4」。

## 待续

T3(detectedAt/publishedAt 字段改名 + >48h 滞后 + kind 驱动 footer)、
T5(像素回归 + 字体断言)、T6(「今日核查」清单卡)、T7(CJK 排版)、T8(自托管
字体);以及把校验后的管线接到真实数据源 `disaster-notices.json` → payload,
让它真正每天能跑。
