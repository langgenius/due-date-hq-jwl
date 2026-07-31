# T4 相邻垂类 guest-post / 数据合作备稿（2026-07-31）

来自 T0–T4 分层的 T4 动作：相邻垂类在写 deadline 内容但没有监控产品，
是 guest post / 数据合作的标的。**发送 = Yuqi**（含每封自抄一份到自己邮箱的
规矩）；下面每家的个性化句都来自 07-31 实地核实的对方站内容，不含推测。

优先级重排（核实后）：**fileforms > numeral > focuscpa > datamatics（降级）**。

---

## 1. FileForms（fileforms.com）— 最优先

**他们是谁（核实）**：全 50 州年报/注册代理/BOI 合规自动化，客户含 CPA 事务
所（FileFormsPRO）。博客在写《Delaware Franchise Tax 2026: Deadlines,
Penalties & Filing Guide》《Pennsylvania LLC Annual Report 2025》《NY LLC
Transparency Act 2026》。

**角度**：他们的读者正是需要「废止潮」信息的人——LA（Act 6，≥2026 税期）、
OK（TY2023 完结）、MS（2028 全废）三州 franchise tax 变化 + NC 延期 6→7 个
月，全部两遍核实带官方源。他们写单州指南，我们有跨州对照表。

**Ask**：guest post 或引用合作（引用 /franchise-tax-deadlines 作数据源）。

**邮件草稿**：

> Subject: The 2026 franchise-tax repeal wave — data for your DE/PA guides
>
> Hi — I run DueDateHQ, a deadline-monitoring tool for CPA firms. Your
> Delaware Franchise Tax 2026 guide covers the March 1 deadline well; I'm
> writing because the bigger 2026 story for your readers is the repeal wave
> around it: Louisiana repealed its franchise tax for periods beginning
> on/after Jan 1, 2026 (Act 6), Oklahoma's ended with tax year 2023, and
> Mississippi phases out completely on Jan 1, 2028 — while North Carolina
> quietly extended its combined-return extension from six to seven months for
> TY2025+.
>
> We just published a 13-state franchise/annual-entity-tax reference where
> every row is transcribed twice, independently, from the state agency page
> cited beside it: duedatehq.com/franchise-tax-deadlines
>
> Two ways this could be useful to you, your pick:
>
> 1. A guest post for your blog — "The franchise-tax repeal wave: what to
>    update in your 2026 entity-compliance calendar" (original, sourced,
>    ~1,200 words, no sales pitch).
> 2. Or simply cite the reference in your state guides — free, attribution
>    appreciated.
>
> Either way happy to share the underlying source list. — Yuqi

**Guest post 大纲**（如果他们选 1）：TL;DR 表（3 州废止/1 州时长变更）→
每州:生效期间、法律依据（Act 6 / HB1039X / SB 2858）、遗留义务（欠缴仍追）→
「怎么改你的 tickler」清单 → 来源表。全部事实来自 `lib/state-tax-rows.ts`，
不新增未核实断言。

---

## 2. Numeral（numeral.com）— 数据合作而非 guest post

**他们是谁（核实）**：销售税/VAT 合规平台（监控、注册、申报、豁免证书、
税率 API）。博客写宽泛合规主题，**没有专门的截止日期文章**（07-31 核实其
blog 列表），产品口号有 "Never miss a deadline"。

**角度**：他们缺的恰是我们刚做的东西——12 州销售税节奏对照（20 号不普适：
CA 月末/OH 23 日/WA 25 日/NY 非日历季度/FL 提前一天电缴），两遍核实带官方
源。竞品不是我们（他们做申报执行，我们做 CPA 端监控）。

**Ask**：内容引用互链（他们博客写 deadline 主题时引用我们的表 +
/data/deadlines.json 免费数据源）；或联名一篇「州销售税日历为什么没法手工
维护」。

**邮件草稿**：

> Subject: Verified 12-state sales-tax due-date table — free to cite
>
> Hi — DueDateHQ here; we build deadline monitoring for CPA firms (so we're a
> complement to your filing automation, not a competitor). Noticed your blog
> covers sales-tax compliance broadly but hasn't done a due-date deep dive —
> probably because the cadence data is genuinely annoying to verify.
>
> We just did that verification twice over: 12 states, each transcribed
> independently two times from the state agency page cited on the row —
> including the traps (California is month-end not the 20th, Ohio is the
> 23rd, Washington the 25th, New York's quarters aren't calendar quarters,
> Florida's e-pay is effectively due a business day before the 20th):
> duedatehq.com/sales-tax-deadlines — plus a machine-readable feed at
> duedatehq.com/data/deadlines.json, free with attribution.
>
> If your team ever writes the due-date piece, cite it freely — or if a
> co-written "why sales-tax calendars can't be maintained by hand" fits your
> blog, I'm game. — Yuqi

---

## 3. Focus CPA（focuscpa.com）— widget/工具互链

**他们是谁（核实）**：加州 Brea 的 CPA 事务所，发布了《2026 Tax Filing
Deadlines for California Small Businesses》——按月日历，且**认真引用官方来源**
（IRS Pub 334、FTB LLC booklet、DE 44 等）。

**角度**：同行里少见的「引用官方源」作风 = 天然同盟。他们的静态日历有一个
结构性缺口：IRS 灾难顺延会改写日期而静态页不会动。offer = 免费灾难顺延
widget（/widget）或 JSON feed，外加互链。

**邮件草稿**：

> Subject: Your 2026 CA deadline calendar + the one thing static pages miss
>
> Hi — your 2026 California small-business deadline calendar is one of the
> few that actually cites its sources (Pub 334, the FTB LLC booklet, DE 44) —
> respect. One structural gap no static calendar can cover: IRS disaster
> postponements rewrite those dates mid-year (this year's WA-2025-03 moved
> deadlines to Aug 5, and CA has had its own relief years).
>
> We publish a free, embeddable disaster-relief tracker that stays current —
> county lists and the official IRS release quoted on every notice:
> duedatehq.com/widget (or the raw JSON at /data/disaster-notices.json,
> attribution appreciated). If you drop it under your calendar, your page
> stays right even when the IRS moves the dates. Happy to link your calendar
> from our California page in return. — Yuqi

---

## 4. Datamatics（datamaticscpa.com）— 降级

**核实结论**：实际是英国 Milton Keynes 总部的外包服务商（面向 CPA/CA 事务
所的记账/税务外包），近期内容偏 UK（"Beat the December Rush ... for UK
Accountants"）。US deadline 数据的相关性弱。**除非**他们的 US 线内容扩张，
否则不投入。保留在清单仅作记录。

---

## 发送纪律

- 每封发出时自抄一份到 Yuqi 自己邮箱（standing rule）。
- 单次 follow-up ≈ 发出后 5-7 天，无回复即停。
- 回复/成文后记入 send-log；guest post 成稿前所有事实再过一遍
  `lib/state-tax-rows.ts` / `lib/state-sales-rows.ts` 的引用源。
