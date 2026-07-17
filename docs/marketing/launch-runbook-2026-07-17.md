# Launch Runbook — 2026-07-17

Everything is built, verified, committed, and pushed. This is the single checklist to take it live.
(Build verified: 207 pages clean; send record synced to main: alert 263 / t1 897 / t2 492; append-only
guard 0 regressions.)

## A · 一次性上线动作(顺序执行,~30 分钟)

1. **部署 marketing 站**(main 已含全部资产)——有 Cloudflare 权限的人跑:
   `git pull && cd apps/marketing && npm run build && npm run deploy`
   验收:浏览器开 `/irs-disaster-relief/archive`(206 条)、`/states/georgia`(filing 小节)、`/widget`(Examples 段)。
2. **GSC 第二批索引请求**(10 个):archive、states/{georgia,texas,illinois,pennsylvania,ohio,virginia,iowa,louisiana}、llms.txt。
3. **Formspree 表单**:免费建一个 → 把 URL 设为 `PUBLIC_ALERT_FORM_ACTION`(Cloudflare 构建环境变量或 build 命令前缀)→ 重新 build+deploy。这是订阅/Ads 链路的最后断点。
4. **旋转 Resend key**(旧 key 曾进入聊天记录)。

## B · 发送日历(所有命令在 `outreach-kit/`,环境变量同往常)

| когда | 动作                                             | 命令/材料                                                                                         |
| ----- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 今天  | AZ + MT alert(92 家,最后两州)                    | `--alert --send --wave wave3-alert-AZ.txt --limit 70` 然后 `--wave wave3-alert-MT.txt --limit 35` |
| 今天  | touch-2 第一批(405 到期)                         | `--touch 2 --send --limit 200 --delay 8000`                                                       |
| 今天  | 协会第一批 ×4(MSCPA/WICPA/MICPA/LCPA)            | 成稿 artifact「society-emails-v3」                                                                |
| 今天  | newsjack 三发(CPA-PA / Jason / X 帖 A)           | `newsjack-four-states-2026-07.md`                                                                 |
| 明天  | touch-2 剩余 ~205                                | 同命令再跑                                                                                        |
| 明天  | 协会第二批(WSCPA/GSCPA/HSCPA)+ X 帖 B            | 同 artifact                                                                                       |
| 周末  | touch-3(205 到期,分两天)                         | `--touch 3 --send --limit 150 --delay 8000`                                                       |
| 下周  | 协会可选批(ASCPA/MTCPA)+ widget embed-offer 邮件 | kit 文件                                                                                          |

每批发完:commit `.outreach-state.json`(guard 会拦截任何回退)。

## C · 已在自动运行(勿重复建)

- **每日 IRS 监控(8am)**:发现新灾害通知 → 自动产出全渠道 kit(alert 命令+协会邮件+媒体 tip+X/Jason 稿)
- **每周简报(周五 9am)**:自动出稿,过目即发

## D · 监测节奏(每周 ~2 小时)

- 每天:Gmail 回复(355+ alert 与协会/媒体线);"no thanks" → `outreach-suppress.txt`
- 周一:GSC(灾害词曝光?工具词排名 42→?)+ GA(opt-in 提交数)→ 更新 GTM 表"验证结论"列
- **任何回复立即同步** —— 那是下一步的方向信号

## E · 资产索引

| 资产                                      | 位置                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| 灾害 hub + 11 州页 + 档案(206 条)+ opt-in | `/irs-disaster-relief*`(main,待部署)                                                     |
| 50 州 × 3 实体截止日矩阵                  | `/states/*` filing 小节 + `lib/state-filing-deadlines.json`(46 州,CA/TX/NY/FL/WA 补录中) |
| Widget + JSON feed + llms.txt             | `/widget`、`/data/disaster-notices.json`、`/llms*.txt`                                   |
| Alert 邮件系统                            | `outreach-kit/send-outreach.mjs --alert`(263 已发,AZ/MT 待发)                            |
| 协会 kit(9 封成稿+联系人)                 | `society-alert-distribution-kit.md` + artifact v3                                        |
| Newsjack kits(圈内+圈外)                  | `newsjack-four-states-2026-07.md`、`beyond-cpa-newsjack-kit-2026-07.md`                  |
| 双站                                      | duedatehq.com(时效/权威)+ cpafieldguide.com(工具对比词)                                  |
