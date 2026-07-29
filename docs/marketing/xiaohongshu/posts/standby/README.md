# 灾害卡备用库(现行 8 条)

想发哪条直接拿:小红书发 `-cover → -p1 → -p2` 三张轮播,LinkedIn 发 `-en` 横版。
**配文全在 [`CAPTIONS.md`](CAPTIONS.md)**(每条含小红书标题+正文+LinkedIn)。

数据取自人工核实的 `apps/marketing/src/lib/disaster-notices.ts`,每条已对回 irs.gov。
由 `card-renderer/gen-disaster.mjs` 生成(改数据→重跑即刷新)。

| 州 / 地区      | 灾害             | 公告        | 截止 | 受灾范围                            | 图前缀                                             |
| -------------- | ---------------- | ----------- | ---- | ----------------------------------- | -------------------------------------------------- |
| 亚利桑那       | 风暴洪水         | AZ-2026-01  | 9/28 | San Carlos Apache 部落              | `arizona-san-carlos-apache-severe-storms-flooding` |
| 蒙大拿         | 冬季风暴         | MT-2026-03  | 9/28 | Fort Peck 部落                      | `montana-fort-peck-tribes-winter-storm`            |
| 蒙大拿         | 冬季风暴         | MT-2026-04  | 9/28 | Crow 部落                           | `montana-crow-tribe-winter-storm`                  |
| 密西西比       | 风暴龙卷         | MS-2026-02  | 11/2 | 5 县                                | `mississippi-severe-storms-tornadoes-flooding`     |
| 威斯康星       | 风暴龙卷         | WI-2026-02  | 11/2 | 21 县 + Oneida 保留地               | `wisconsin-severe-storms-tornadoes-flooding`       |
| 密歇根         | 风暴龙卷         | MI-2026-02  | 11/2 | 37 县                               | `michigan-severe-storms-tornadoes-flooding`        |
| 路易斯安那     | 热带风暴 Arthur  | LA-2026-02  | 11/2 | 4 堂区                              | `louisiana-tropical-storm-arthur`                  |
| 北马里亚纳群岛 | 超强台风 Sinlaku | NMI-2026-01 | 11/2 | Northern Islands/Rota/Saipan/Tinian | `northern-mariana-islands-super-typhoon-sinlaku`   |

> ⚠️ 都是**现行未过期**的(截止日 9/28、11/2)。发前建议在对应 irs.gov 公告页快速核一眼受灾名单(县/堂区数),再发。已发过的(NC/GA/WA/CA)不在此库。
>
> 蒙大拿两条是**不同部落**(Fort Peck vs Crow)的独立公告,别当重复。
