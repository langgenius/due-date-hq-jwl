# Google Ads 开户 + 投放操作手册(2026-07-31)

给 Yuqi 的照做版。承接 `google-ads-disaster-intent-2026-07.md`(campaign A 的完整底稿),
本文件新增:开户步骤、避坑开关、以及基于 GSC 真实数据的 campaign B(工具/竞品词)。
所有落地页 URL 已于 2026-07-31 逐个 curl 验证 200。

## 第一步:开户(约 15 分钟,只有你能做)

1. 打开 **ads.google.com** → 用 Google 账号登录(建议用 wuyuqi827@gmail.com,和 GSC 同号,
   之后关联 Search Console 数据方便)。
2. **关键一步:不要跟着默认向导走。** Google 会把新账号推进「智能广告系列」简化模式。
   在向导第一页找页面底部的小字链接 **"Switch to Expert Mode"(切换到专家模式)** 点它。
   进入后选 **"Create an account without a campaign"(暂不创建广告系列)** 先把账号建好。
3. 绑定付款方式:Billing → 加你自己的卡。费用是后付制 —— 先跑量、到账单阈值或月底才扣款。
   预算 $15/天 ≈ 每月 $450 封顶(实际常低于封顶)。
4. 注册时留意首充优惠横幅(新账号常有「消费 $500 送 $500」类 credit),有就领。
5. 开户后几天内会有 Google 销售打电话/发邮件说「免费帮你优化」。**全部忽略。**
   他们的「优化」= 放宽匹配、开自动化,只会烧钱。

## 第二步:三个必关的开关(建 campaign 时)

每个 Search campaign 的设置页里:

- **Networks:取消勾选** "Google search partners" 和 "Display Network"(默认是勾上的)。
- 账号级:Recommendations → **Auto-apply 全部关掉**(默认开,会自动改你的关键词)。
- 加关键词时用 **"短语匹配"（加引号）和 [完全匹配]**,不要裸词(裸词=广泛匹配,烧钱)。

## 第三步:建两个 campaign(直接粘贴)

### Campaign A — 灾区意图(本周最值:WA 8/5 截止)

完整底稿在 `google-ads-disaster-intent-2026-07.md`,原样照建。只改一件事:
**把 WA ad group 排第一、预算倾斜给它** —— 8/5(下周二)截止前这几天是 WA 搜索意图的峰值,
正好接住周四/周五窗口;8/5 之后暂停 WA 组,其余组继续。

### Campaign B — 工具/竞品词(GSC 已证明我们排得上、就差位置)

- **Type:** Search only · **Name:** `tool-intent-2026-07`
- **Geo:** United States · **Language:** English
- **Budget:** $10/天 · **Bidding:** Maximize clicks,CPC 上限 $8(竞品词比灾区词贵)
- **Final URL suffix(campaign 级):**
  `utm_source=google&utm_medium=cpc&utm_campaign=tool_intent_2026_07&utm_content={campaign}_{adgroup}`

| Ad group     | 落地页(已验证 200)                  | 关键词(照贴,含引号/方括号)                                                                                                                             |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| file-in-time | `/guides/file-in-time-alternatives` | `"file in time software"` · `"file in time alternative"` · `"timevalue file in time"`                                                                  |
| taxdome-alt  | `/guides/taxdome-alternatives`      | `"taxdome alternatives"` · `[taxdome alternative]` · `"taxdome competitors"`                                                                           |
| karbon-alt   | `/guides/karbon-alternatives`       | `"karbon alternatives"` · `"karbon competitors"`                                                                                                       |
| canopy-alt   | `/guides/canopy-alternatives`       | `"canopy alternatives"` · `"canopy tax software alternative"`                                                                                          |
| category     | `/`(首页)                           | `"tax deadline tracking software"` · `"cpa due date tracker"` · `"deadline monitoring for accountants"` · `"due date tracking software for cpa firms"` |

**Negatives(campaign 级):** `free excel template`, `spreadsheet template`, `jobs`, `salary`,
`login`, `tutorial`, `personal taxes`, `turbotax`。

**广告文案(Responsive Search Ad,每组同一套;竞品名只放关键词、不进文案 ——
Google 商标政策会拒登含竞品名的文案):**

Headlines(≤30 字符):

- `Deadline Tracking For CPA Firms`
- `Catches Every IRS Rule Change`
- `Verified Against IRS.gov`
- `All 50 States Covered`
- `Free Deadline-Change Alerts`
- `Set Up In Minutes`

Descriptions(≤90 字符):

- `Practice tools track tasks. DueDateHQ watches the rules — IRS and all 50 states.`
- `When a filing deadline moves, you get an email. Sourced and verified, no scraping guesses.`
- `See the verified 2026 deadline calendar for 18 federal forms and 50 states. Free lookup.`

## 转化怎么算(第 1 周先从简)

第 1 周不用装转化代码,看两个现成信号就够:

1. **Alert 表单提交** —— Formspree 收件(端点已验证在线)。
   **投放前先自己提交一次测试**,确认邮件真的到你邮箱;到不了就先停,回来找我修。
2. **GA4/GSC 里带 `utm_campaign=` 的着陆 + 点击行为**。

第 2 周若数据像样,再装 gtag 转化(到时我出代码)。

## 停/续判据(两周,和 campaign A 同一把尺)

- **续:** opt-in 单价 ≤ $25,或出现任何一个 app 注册
- **改写:** CTR < 2%(意图不匹配)或 CPC 持续 > $8
- **停:** 花掉 $150 仍 0 opt-in → 问题在落地转化不在流量,先修页面再买量

## 我不能替你做的两件事(平台红线)

开 Google 账号/登录、以及**绑卡输卡号**必须你本人操作。除此之外 —— 关键词、文案、
结构、否词、判据 —— 全在上面,照贴即可。建完 campaign 截图给我,我帮你核对设置。
