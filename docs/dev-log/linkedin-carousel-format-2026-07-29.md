# LinkedIn 改文档轮播(4:5 PDF)+ 备用库补 HI + 07-29 发帖包

**日期**:2026-07-29
**背景**:调研结论 —— LinkedIn 文档帖(PDF 轮播)互动 ≈1.8× 单图,最优 1080×1350(4:5),
71% 手机浏览。原横版 16:9 单图不是最优,Yuqi 拍板改设计。

## 做了什么

1. **card.css**:`li` 格式(4:5)加英文轮播可读性块 —— 封面钩子 118px、副文 44px、
   note 要点 36px/编号 52px(手机缩图一眼可读)。
2. **gen-disaster.mjs**:
   - 每条通告从 4 张 → **7 张**:小红书 cover/p1/p2 + 横版 en(备用)+ **li-1cover/li-2data/li-3note**
     (LinkedIn 3 页轮播),每条配 `magick` 合成 `-li-carousel.pdf`。
   - **备用库补上夏威夷 HI-2026-01**(此前漏掉;8/20 截止、4 县,是当前最近的未发通告)→ 9 条 × 7 张 = 63 张全渲。
   - 配文修辞:灾期起始日补年份(跨年灾期如 AZ「Oct 10, 2025」不再歧义)、部落区加
     "the … area"、county 场景补 "counties/parishes"、event 保持 IRS 原文。
3. **加州 07-28 包**:补 `ca-li-carousel.pdf`(3 页:cover 钩子 → rate 2025→2030 → SB 132 note)。
4. **posts/2026-07-29/**:今日 3 帖(按最近截止日)—— 夏威夷 8/20、亚利桑那 San Carlos
   Apache 9/28、蒙大拿 Fort Peck 9/28;每帖 = 小红书 3 页 + LinkedIn PDF,配文在 README。
5. **linkedin-discoverability.md**:新增 §5.5「文档轮播优先」+ 检查清单加一条。
6. **standby README**:9 条表格 + LinkedIn 发法改 PDF。

## 事实核对

数据全部取自人工核实的 `apps/marketing/src/lib/disaster-notices.ts`(07-27 已逐条对回
irs.gov);渲染走 validate.js 12 条门(全过)。HI 4 县(Hawaii/Honolulu/Kauai/Maui)、
Aug 20 截止、灾期 2026-03-10 起,与库内一致。

## 发帖操作(LinkedIn)

发**文档帖**:新建帖子 → 「添加文档」→ 上传 `-li-carousel.pdf` → 配文用 README 里的
LinkedIn 段 → 外链放首条评论。
