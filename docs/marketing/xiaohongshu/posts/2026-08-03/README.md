# 2026-08-03(周一)发帖包

**今天一条:华盛顿 8月5日(后天)截止 —— 系列收尾条。** 前面两条是「核对清单」和「倒计时」,
今天给的是**只有真读过公告才知道的坑**:这份 IRS 公告改期后正文没重写,照抄正文会差三个月、
少算 9 个县。这正是监控产品该讲的话。

**小红书**:3 页轮播 `-cover → -p1 → -p2`。
**LinkedIn = 文档帖(PDF)**:上传 `wa-t2-2026-08-03-li-carousel.pdf`(领英 PDF 仍是旧版式,待迁移),链接放首条评论。

> **佛蒙特 C-101 今天不发** —— X 队列里那条(C-101,7月31日 → 8月31日)有两个问题,见文末。

---

## 华盛顿 · 8月5日 截止(WA-2025-03)

**小红书标题**(主推):`这份IRS公告正文是错的,别照抄`
(备选:`华盛顿后天截止|公告正文和横幅对不上` / `照抄IRS正文,你的截止日会差三个月`)

**小红书配文**

```
华盛顿的联邦延期后天(8月5日)到期。但这条要说的是另一件事:这份 IRS 公告,照着正文读会读错。

【坑在哪】
公告顶部有条更新横幅,写明截止日由 5月1日 改为 8月5日、并扩大了受灾范围。但下面的正文一个字没改 —— 二十多处仍写着 5月1日,受灾地也只列最初的 17 项。

· 只读正文 → 截止日差三个月
· 只读正文 → 少算 9 个县(实际是 24 个县 + 25 个部落领地)
· 正文那 17 项里还混进了 Samish —— 那是 Samish 部落,华盛顿州没有 Samish 县

【实务提示】
地址在受灾范围内的自动适用,无需申请;县外但账册或记账人在内的,现在就致电 IRS 灾害热线。
逐项覆盖范围(哪些申报与缴款在内)正文同样是改期前口径,Q2 项目是否随窗口顺延,建议向 IRS 确认后再答复客户。

来源:IRS 灾害减免公告 WA-2025-03(irs.gov 可查,注意看顶部更新横幅)

#美国报税 #CPA #注册会计师 #IRS #华人会计师 #报税季 #EA #华盛顿
```

**LinkedIn 文档标题**:`Washington IRS Deadline Aug 5, 2026 — Why the Release Body Is Wrong (WA-2025-03)`

**LinkedIn 配文**(发**文档帖**:上传 `wa-t2-2026-08-03-li-carousel.pdf`(领英 PDF 仍是旧版式,待迁移))

```
IRS tax deadline — Washington's postponement ends Aug 5, 2026, and the IRS release will mislead you if you read the body text.
Disaster relief WA-2025-03 carries an update banner: the deadline moved from May 1 to Aug 5, 2026, and the covered area was expanded. The body below that banner was never rewritten — it still says May 1 in more than twenty places, and still lists only the original 17 entries, one of which (Samish) is a tribal nation, not a county. Read the body alone and you are three months stale and short 9 counties; the correct area is 24 Washington counties and 25 tribal nations. Relief is automatic for an IRS address of record. Client outside the area but records or preparer inside? That call to the IRS disaster hotline needs to happen today, not Wednesday. One caveat worth flagging to clients: the item-by-item list of postponed filings is also written to the pre-extension window, so confirm with the IRS whether Q2 items follow the new date.
Which Washington clients are still open on your list? IRS source in the comments.
#IRS #TaxDeadline #DisasterRelief #CPA #Washington
```

---

## 核实记录(今天做的)

**24 县 + 25 个部落领地 —— 已重新核实无误。** IRS 公告页分两段列受灾地:原始 17 项
(其中 "Samish" 实为 Samish Indian Nation 部落,华盛顿州没有 Samish 县)+ 后续扩大 9 项
(Wahkiakum 与前段重复)。去重后 = **24 个真实县**,与仓库 `disaster-notices.ts` 一致。
(这条是 07-28 备忘里挂的待核项,今天结清。)

**「赶不及可以再申请延期(4868 / 7004)」这条没写进卡。** IRS 该公告页正文没有相关表述,
无法核实到源,按「准确 > 美观」剔除。

**逐项覆盖清单也撤了(第一版卡写过,已改)。** 初稿照抄公告正文列了「1月15日 / 4月15日 预缴、
1月31日 / 4月30日 工资税与消费税」—— 但正文是**改期前**的口径(窗口写作「Dec 9, 2025 至
May 1, 2026」)。窗口既然改到 8月5日,6月15日 的 Q2 预缴、7月31日 的 Q2 工资税申报是否顺延,
公告没有更新表述、无从核实。发出去会让 CPA 以为 Q2 两项不在保护内 —— 属于漏报,已撤。
现在卡上讲的是这个「正文未同步」的坑本身,并提示逐项范围需向 IRS 确认。

## 佛蒙特 C-101(X 队列里那条)—— 暂缓,需人工确认

X 今天的草稿是「Vermont tax agency · C-101 · Deadline shift: Jul 31, 2026 → Aug 31, 2026」。
发之前有两个问题:

1. **归属可能错了**:C-101 是**佛蒙特劳工部**(Department of Labor)的雇主季度工资与失业保险
   申报表,不是税务局(Department of Taxes)的表。X 文案写的 "Vermont tax agency" 与之不符;
   而 Pulse 监控的源是 `tax.vermont.gov/news`。
2. **改期无法核实**:labor.vermont.gov 与 tax.vermont.gov 对抓取均返回 403,公开检索也查不到
   7月31日 → 8月31日 的官方公告。**背景**:佛蒙特失业保险系统正在换代,新系统自 2026 Q2
   申报启用(申报窗口 7月6日 开),换系统期间给缓冲期是合理的 —— 但合理 ≠ 已核实。

**建议**:Yuqi 在浏览器里打开 labor.vermont.gov 的 Quarterly Reporting 页确认一眼;确认属实
我再出卡(并把归属改成「佛蒙特劳工部」)。同时 X 那条在批准前也值得改掉 "tax agency" 的措辞。
