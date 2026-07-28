# 灾害卡备用库:生成器 + 8 条现行 alert 预渲 + 全面审计

2026-07-28 · `docs/marketing/xiaohongshu/`

## 为什么

用户要「把剩下现行灾害 alert 预渲成备用库,以后想发直接拿」。数据取**人工核实**的
`apps/marketing/src/lib/disaster-notices.ts`(不再模糊抓取),保证一致 + 可复用。

## 做了什么

- **`card-renderer/gen-disaster.mjs`** —— 从核实数据生成 payload:每条出 4 张
  (cover 封面钩子 / p1 数据 / p2 实务提示 / en LinkedIn 横版),并生成配文
  `standby-captions.md`(小红书标题+正文+LinkedIn)。处理三类:县/堂区(解析 FIPS、
  高亮地图、「N 县/堂区」)、部落(AZ / MT×2,无县、标题带部落名区分)、领地(NMI,
  无地图)。old→new 的 old 端按灾害起始日选:起始 ≤ 4/15 用 4月15日;之后用在窗口内
  的法定日(LA→9/15、MS→6/15),避开渲染器规则 4 误杀。
- **`card.js` 优雅降级**:`stateIcon` 遇缺图辖区(如领地 MP)返回空、不报错(先前
  NMI 因无 MP.svg 直接崩)。
- **备用库归档**:`posts/standby/`(32 图 + `CAPTIONS.md` + 索引 README)。8 条:
  AZ / MT×2 / MS / WI / MI / LA / NMI,截止 9/28 或 11/2,均现行未过期。

## 全面审计(应用户「不许偷懒」)

- **数据**:8 条逐条核 —— 县数(LA 4 堂区、MI 37、MS 5、WI 21+Oneida)、截止日、
  old→new 锚点、部落名、翻译,**零错误**。
- **视觉**:逐张看关键版式 —— 县卡(MI/LA)、部落卡(AZ/MT)、领地卡(NMI 无图)、
  横版(NMI en 长标题)、封面 —— 全部无换行孤字、无溢出。
- **改进**:① 蒙大拿两条原标题相同 → 改「蒙大拿 Fort Peck」/「蒙大拿 Crow」区分;
  ② NMI 实务提示补齐受灾岛屿名;③ LinkedIn 配文修掉专有名词被小写、起始日措辞。

## 备注

`.standby-data.json` 是临时 dump(gitignore 级),`standby-notices.json` 为可复现产物。
已发过的 NC/GA/WA/CA 不在此库。
