# Migration Copilot · Fixtures README

> 版本：v1.0（Demo Sprint · 2026-04-24）
> 上游：PRD Part1B §6A.2 / §6A.3 / §6A.4 / §6A.9 · Part2B §13.1 / §17 · `dev-file/03-Data-Model.md` §2.2 / §2.4
> 入册位置：[`../README.md`](../README.md) §2 第 06 份

本目录提供 12 套 Preset CSV fixture + 1 套 Agent demo fixture，用于 Day 3 单测 / E2E / Demo seed 的 drop-in 输入。所有 PII 合成虚拟（`TEST` 前缀 / `99-*` EIN 段 / `test+N@example.com` 邮箱）。

---

## 1. 文件清单

| 文件                                                                 | 行数（数据） | 列数 | 覆盖场景                                                                                  | 期望 mapping 置信度均值 | 期望 EIN 识别率          | 故意坏行数 |
| -------------------------------------------------------------------- | ------------ | ---- | ----------------------------------------------------------------------------------------- | ----------------------- | ------------------------ | ---------- |
| [`./taxdome-30clients.csv`](./taxdome-30clients.csv)                 | 30           | 10   | TaxDome account import · 真实 account 字段 + custom tax fields · 含 mixed deadline        | ≥ 95%                   | 100%                     | 0          |
| [`./drake-30clients.csv`](./drake-30clients.csv)                     | 30           | 7    | Drake 导出 · 全字段 · 含 2 坏行触发 needs_review / normalize                              | ≥ 95%                   | 100%                     | 2          |
| [`./karbon-20clients.csv`](./karbon-20clients.csv)                   | 20           | 5    | Karbon 导出 · 缺 tax_types 列 → 走 Default Matrix                                         | ≥ 85%                   | 100%                     | 1          |
| [`./karbon-full-flow-demo.csv`](./karbon-full-flow-demo.csv)         | 26           | 12   | Karbon 现场演示 · Karbon 字段 + practice custom fields · 覆盖 mapping / normalize / rules | ≥ 85% fallback/manual   | 24/25 valid EIN rows     | 3          |
| [`./quickbooks-20clients.csv`](./quickbooks-20clients.csv)           | 20           | 4    | QuickBooks 仅元数据 · state 全称需归一                                                    | ≥ 80%                   | 95%                      | 2          |
| [`./file-in-time-30clients.csv`](./file-in-time-30clients.csv)       | 30           | 9    | File In Time 独有列（service / due date / status / staff / county）· 期望 preset 自动识别 | ≥ 90%                   | N/A（无 EIN 列）         | 0          |
| [`./cch-axcess-2clients.csv`](./cch-axcess-2clients.csv)             | 2            | 17   | CCH Axcess Client Manager / Return Manager grid CSV · 客户编号、地址、负责人              | ≥ 85% fallback          | 100%                     | 0          |
| [`./cch-prosystem-fx-2clients.csv`](./cch-prosystem-fx-2clients.csv) | 2            | 16   | CCH ProSystem fx Portal client list CSV · partner / manager / preparer 字段               | ≥ 85% fallback          | 100%                     | 0          |
| [`./lacerte-2clients.csv`](./lacerte-2clients.csv)                   | 2            | 13   | Lacerte comma-delimited client export · SSN/EIN 列经 PII guard 强制 IGNORE                | ≥ 85% fallback          | PII guard                | 0          |
| [`./proseries-2clients.csv`](./proseries-2clients.csv)               | 2            | 14   | ProSeries HomeBase Contacts.csv · source status / phone / address 字段                    | ≥ 85% fallback          | PII guard                | 0          |
| [`./ultratax-cs-2clients.csv`](./ultratax-cs-2clients.csv)           | 2            | 12   | UltraTax CS Client Listing Report CSV · source status / preparer 字段                     | ≥ 85% fallback          | PII guard                | 0          |
| [`./proconnect-tax-2clients.csv`](./proconnect-tax-2clients.csv)     | 2            | 12   | ProConnect Tax report export · return type / taxes owed / preparer 字段                   | ≥ 85% fallback          | N/A（无 EIN 列）         | 0          |
| [`./messy-excel-agent-demo.csv`](./messy-excel-agent-demo.csv)       | 52           | 11   | Agent Demo 现场演出 · entity 多种写法 / state 混用 / EIN 含空格 / 缺列 / 多余列           | 70 – 85%（故意低）      | 85 – 95%（故意部分失败） | ≥ 8        |
| [`./taxdome-exposure-3clients.csv`](./taxdome-exposure-3clients.csv) | 3            | 9    | TaxDome exposure 专用 · 含 Estimated Tax Due / Owner Count，验证 penalty preview 可计算   | ≥ 85% fallback          | 100%                     | 0          |

**总 Preset fixture 行数 = 145** · **Agent demo 行数 = 52** · **Preset 列数合计 = 128**

`karbon-full-flow-demo.csv` 是额外 live-demo fixture，不计入原始 Preset fixture 总数；它用于从空
practice 现场演示 Karbon 导入后的规则激活、Default Matrix、normalization、skipped row、客户事实、
obligations、dashboard exposure 和 evidence review。

### 1.1 真实导出模拟 fixture

[`./realistic-exports/`](./realistic-exports/) 新增 11 个当前 Step 1 source chip 的真实导出形态
fixture，以及 3 个重要 variant / negative fixture。它们由
`scripts/generate-migration-realistic-fixtures.mjs` deterministic 生成，不替换上方 demo CSV。

- Primary upload fixtures 覆盖 TaxDome ZIP、Drake CSV、Karbon XLSX、QuickBooks Online XLSX、
  File In Time TXT/TSV、CCH Axcess CSV、CCH ProSystem fx Portal CSV、Lacerte `EXPORT.CSV`、
  ProSeries `Contacts.csv`、UltraTax CSV、ProConnect reporting CSV。
- Variants 覆盖 QuickBooks Desktop `.iif` accepted path、UltraTax `.dif` unsupported guidance、
  File In Time `.fbk` backup rejection guidance。
- 所有文件共用 24 个合成 CPA 客户组合，保留 source-specific headers / file names / formats，
  同时包含 mixed entities、mixed states、缺 state、`C.A.` 等 review 行。

### 1.2 每个 CSV 的细节

#### `taxdome-30clients.csv`

- 列：`Account Name, Account Type, State, Team Members, Email, Tax ID, Tax Entity Type, Tax Return Type, Deadline, Notes`
- 30 行：10 LLC / 6 S-Corp / 4 Partnership / 4 C-Corp / 2 Sole Proprietor / 2 Trust / 2 Individual
- 辖区：16 CA + 14 NY
- EIN 段：`99-0000001` ~ `99-0000030`
- TaxDome 真实字段口径：`Account Name` / `Account Type` / `State` / `Team Members` / `Email` / `Notes` 对齐 TaxDome account/contact import；`Tax ID` / `Tax Entity Type` / `Tax Return Type` / `Deadline` 作为 account custom fields
- Account Type：仅使用 TaxDome 的 `Company` / `Individual` / `Other`，不再承载 LLC / S-Corp / Sole Proprietor 等内部 tax entity
- Tax Entity Type：使用 Default Matrix 可归一值；sole-prop 行写作 `Sole Proprietor`，归一为内部枚举 `sole_prop`
- Deadline：以 `2026-05-04` 为基准，5 条 overdue、1 条 today、8 条 30 天内、9 条 2026 下半年、7 条 2027 长期未来；日期格式使用 TaxDome US import 常见的 `MM/DD/YYYY`
- 注意：`Deadline` 是 vendor calendar fixture column；当前 Migration import contract 仍由 `Tax Return Type` / Default Matrix / active practice rules 生成正式 obligations，除非导入映射目标后续扩展出 due-date 字段
- 验证：Preset 自动识别 + AI Mapping 置信度均值 ≥ 95% + EIN 识别率 = 100%（双指标 T-S2-01，见 [`../10-conflict-resolutions.md#3-t-s2-01-双指标口径`](../10-conflict-resolutions.md#3-t-s2-01-双指标口径)）

#### `taxdome-exposure-3clients.csv`

- 列：`Client Name, Tax ID, Entity Type, State, Assignee, Email, Estimated Tax Due, Owner Count, Notes`
- 3 行：LLC / S-Corp / C-Corp，覆盖 owner-count 与 tax-due 两类 penalty 输入
- 验证：AI disabled 时 TaxDome preset fallback 识别 `Estimated Tax Due` / `Owner Count`，Step 4 import readiness preview `readyCount > 0` 且 total exposure > 0

#### `drake-30clients.csv`

- 列：`Client ID, Name, EIN, Entity, State, Return Type, Staff`
- 30 行；EIN 段 `99-0000101` ~ `99-0000130`
- **坏行 #1**：row 7（`DRK007` Granite Ridge Partners (TEST)）state 空 → UI 黄色 `Needs review`，非阻塞
- **坏行 #2**：row 14（`DRK014` Pacific Home Repair LLC (TEST)）Entity = `Corp (S)` → Normalizer 归一为 `s_corp`
- 验证：needs_review 徽章 + `normalizer-entity@v1` 路径

#### `karbon-20clients.csv`

- 列：`Organization Name, Tax ID, Country, Primary Contact, Contact Email`
- 20 行；EIN 段 `99-0000201` ~ `99-0000220`
- 无 `State / Entity Type / Tax Types` 列 → 缺 `tax_types` 全量走 Default Matrix fallback（federal-only + needs_review）
- **坏行 #1**：row 13（Meridian Bay Advisors）Country = `US / CA / Los Angeles County` → Country 列归一告警（不阻塞）
- 验证：S2-AC4 在缺 tax_types 场景的**兜底路径**（全部客户进 `needs_review`，但导入不阻塞，Obligations 展示 federal 兜底 obligations + 黄色徽章）

#### `karbon-full-flow-demo.csv`

- 列：`Organization Name, Tax ID, Country, State, States, Entity Type, Client Owner & Manager, Email, Tax Types, Estimated Tax Liability, Equity Owner Count, Notes`
- 26 行：LLC / S-Corp / Partnership / C-Corp / Sole Proprietor / Individual / Trust / Other 均覆盖；
  辖区覆盖 CA / NY / TX / FL / WA，含 2 个 CA+NY multi-state rows。
- Karbon 口径：前 8 列使用 Karbon preset/bulk client fields；`Tax Types`、`Estimated Tax Liability`、
  `Equity Owner Count`、`Notes` 是 practice custom fields，Demo 时可让 AI Mapper 或手动 override
  映射到 DueDateHQ 目标字段。
- 故意坏行：
  - row 8：`Tax ID=99 0004208` + `State=C.A.`，触发 EIN / state review，但 `States=CA` 仍允许继续。
  - row 11：缺 `State / States`，导入客户但不生成 state-backed obligations。
  - row 25：缺 `Organization Name`，Step 4 作为 skipped row 展示。
- 现场演示顺序建议：先在 Rules 中 accept 需要的 FED 和示例州规则，再用本 CSV 跑
  Migration Wizard；保留部分 `Tax Types` 为空以展示 Default Matrix，非 CA/NY 行用显式 tax types
  展示 review-heavy state coverage。

#### `quickbooks-20clients.csv`

- 列：`Customer, Tax ID, Billing State, Terms`
- 20 行；EIN 段 `99-0000301` ~ `99-0000320`（row 19 EIN 空）
- **坏行 #1**：row 5（Ember Street Retail Inc）state = `California` → Normalizer state 字典归一为 `CA`
- **坏行 #2**：row 15（Orbit Works Robotics Inc）state = `New York` → 归一 `NY`
- **坏行 #3**（EIN 缺失）：row 19（Northpoint Media Lab LLC）Tax ID 空 → EIN 识别率 = 19/20 = 95%
- 验证：state 字典归一 + EIN < 100% 的 needs_review 分支

#### `file-in-time-30clients.csv`

- 列：`Client, Service, Due Date, Status, Staff, Entity, State, County, Notes`
- 30 行；**无 EIN 列**（FIT 导出典型形态）
- Service 混合：`Form 1065`、`Form 1120-S`、`Form 1120`、`Form 1041`、`Schedule C`、`Form 1040`、`CA Franchise`、`NY CT-3-S`
- Due Date 以 2026-09-15 / 2026-10-15 extension 截止日为主；仅 2/30 行早于 2026-05-04，且均为 `Filed`
- 验证：FIT 彩蛋 preset 自动识别 + Service 列经 `normalizer-tax-types@v1` 归一到 Default Matrix vocabulary + County 列保留原值（PRD §6A.3）

#### `messy-excel-agent-demo.csv`

- 列：`Client, Federal ID, Org Type, State/Juris, County/Region, Tax Forms, Contact, Email, Industry, Year Revenue, Notes`
- 52 行（首屏 50 行 + 滚动 2 行确保"现场看上去装不下一屏"）
- **混乱源**：
  - **Entity 多种写法**：`LLC` / `L.L.C.` / `Ltd Liability Co` / `Limited Liability Company` / `Corp (S)` / `S-Corp` / `S Corporation` / `S-Corporation` / `C-Corp` / `Corp` / `Inc` / `Inc.` / `PC` / `LP` / `Partnership` / `General Partnership` / `Sole Prop` / `Sched C` / `Schedule C Filer` / `Individual` / `Personal` / `Trust` / `Irrevocable Trust` / `Non-profit`
  - **State 混用**：`CA` / `California` / `Calif` / `C.A.` / `NY` / `New York` / `N.Y.` / `TX` / `Texas` / `FL` / `Florida` / `WA` / `Washington`
  - **EIN 含空格 / 点 / 无分隔符**：`99 0000 503` / `99.0000504` / `990000506`（共 6 条非标 + 1 条缺失 + 45 条标准）
  - **Industry 多余列**：不在 DueDateHQ client / penalty target schema → 期望 Mapper 标 `IGNORE`
  - **Year Revenue 多余列**：同上 → 期望 `IGNORE`（将来映射到 `estimated_annual_revenue_band`，Phase 0 起；本 Sprint 不用）
  - **非 CA/NY 示例辖区 8 行**：触发 Default Matrix fallback（state review-only + needs_review）
  - **Non-profit 1 行**：`Org Type=Non-profit` → Normalizer 归一到 `other` + needs_review
  - **近全空行 1 行**：row 42（`Junction LLC (TEST)`）仅 Client / Contact / Email / Notes 有值 → 触发"缺必填 state/entity 阻塞"红色徽章（对齐 PRD §6A.3）
- 验证：Agent Demo 现场"真的混乱"；可同时展示 Mapper 低置信度 / Normalizer 归一能力 / Matrix fallback / needs_review 队列 / 阻塞性缺失字段

---

## 2. PII 合规原则

1. **所有客户名合成虚拟**：一律带 `(TEST)` 后缀；公司名采用非真实的词汇组合（`Marin / Oakline / Redwood / Harbor / ...` + 明显 `(TEST)`）；个人名都标注 `TEST`
2. **所有 EIN 在 `99-*` 段**：`99-0000001` ~ `99-0000999` 范围（IRS 未分配段，安全）
3. **所有 email 用 `test+N@example.com`**：RFC 6761 保留域 `example.com`，不会误触发真实 SMTP
4. **联系人姓名**：使用人名占位（`Jordan Park / Riley Chen / Morgan Lee / Taylor Kim / Parker Vu / Sam Rivera / David Owner`）—— 均为常见名 + 虚拟角色
5. **辖区 / county**：US 2-letter state code + 真实 state 内 county 名（CA / NY / TX / FL / WA 常见 county），**不**引用任何真实公司的注册地
6. **禁止**使用真实政府 / 企业 / 人名以外的真实标识
7. **Fixture 使用前自检命令**（在 `06-fixtures/` 目录下运行）：

```bash
# 检查是否残留真实 "First Last" 格式的名字（应当均在允许的虚拟姓名清单）
rg -n "^[a-zA-Z]+ [a-zA-Z]+$" .

# 检查 EIN 是否全部在 99-* 段
rg -n "\b[0-9]{2}-[0-9]{7}\b" . | rg -v "\b99-[0-9]{7}\b"

# 检查 email 是否全部 example.com
rg -nE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}" . | rg -v "@example\.com"
```

---

## 3. Day 3 落地

### 3.1 单元测试 fixture

- `packages/ai/**/*.test.ts` 的 Mapper / Normalizer 单测读取本目录 CSV
- 推荐加载方式：`fs.readFileSync(path.join(__dirname, '../../../docs/product-design/migration-copilot/06-fixtures/<file>.csv'))`；配合 [`papaparse`](https://www.papaparse.com/) 或 `d3-dsv` parse
- 每个 fixture 的断言目标见 §4 expected mapping JSON

### 3.2 E2E fixture

- `e2e/tests/migration.spec.ts`（后续登录态业务流）使用本目录 CSV 作为 Step 1 Intake 的 paste / upload 输入
- 典型 assertion：
  - `taxdome-30clients.csv` → Step 3 结束 Dry-Run 预览显示 `30 clients · X obligations · $Y at risk`，Import 成功后 Dashboard Deadline Radar 数字 > 0
  - `karbon-20clients.csv` → Step 3 有 20 条 `needs_review` badge（无 tax_types）

### 3.3 Demo seed

- `packages/db/seed/migration-demo.ts`（若存在）使用 `taxdome-30clients.csv` + `file-in-time-30clients.csv` 作为 Dashboard seed input
- 期望 seed 产物：30 clients × avg 3 obligations ≈ 90 obligations on Dashboard This Week 视图

---

## 4. 期望 mapping JSON（Day 3 断言样本）

以下 JSON 片段是 Mapper `mappings` 数组的**期望形态**（省略 `confidence` / `reasoning` 数值以便断言灵活性；实际断言用 `confidence >= threshold` + `target === expected`）。

### 4.1 `taxdome-30clients.csv` 期望 mapping

```json
{
  "mappings": [
    { "source": "Account Name", "target": "client.name" },
    { "source": "Account Type", "target": "IGNORE" },
    { "source": "State", "target": "client.state" },
    { "source": "Team Members", "target": "client.assignee_name" },
    { "source": "Email", "target": "client.email" },
    { "source": "Tax ID", "target": "client.ein" },
    { "source": "Tax Entity Type", "target": "client.entity_type" },
    { "source": "Tax Return Type", "target": "client.tax_types" },
    { "source": "Deadline", "target": "IGNORE" },
    { "source": "Notes", "target": "client.notes" }
  ]
}
```

### 4.2 `drake-30clients.csv` 期望 mapping

```json
{
  "mappings": [
    { "source": "Client ID", "target": "IGNORE" },
    { "source": "Name", "target": "client.name" },
    { "source": "EIN", "target": "client.ein" },
    { "source": "Entity", "target": "client.entity_type" },
    { "source": "State", "target": "client.state" },
    { "source": "Return Type", "target": "client.tax_types" },
    { "source": "Staff", "target": "client.assignee_name" }
  ]
}
```

### 4.3 `karbon-20clients.csv` 期望 mapping

```json
{
  "mappings": [
    { "source": "Organization Name", "target": "client.name" },
    { "source": "Tax ID", "target": "client.ein" },
    { "source": "Country", "target": "IGNORE" },
    { "source": "Primary Contact", "target": "client.assignee_name" },
    { "source": "Contact Email", "target": "client.email" }
  ]
}
```

### 4.4 `quickbooks-20clients.csv` 期望 mapping

```json
{
  "mappings": [
    { "source": "Customer", "target": "client.name" },
    { "source": "Tax ID", "target": "client.ein" },
    { "source": "Billing State", "target": "client.state" },
    { "source": "Terms", "target": "IGNORE" }
  ]
}
```

### 4.5 `file-in-time-30clients.csv` 期望 mapping

```json
{
  "mappings": [
    { "source": "Client", "target": "client.name" },
    { "source": "Service", "target": "client.tax_types" },
    { "source": "Due Date", "target": "IGNORE" },
    { "source": "Status", "target": "IGNORE" },
    { "source": "Staff", "target": "client.assignee_name" },
    { "source": "Entity", "target": "client.entity_type" },
    { "source": "State", "target": "client.state" },
    { "source": "County", "target": "client.county" },
    { "source": "Notes", "target": "client.notes" }
  ]
}
```

### 4.6 `messy-excel-agent-demo.csv` 期望 mapping

```json
{
  "mappings": [
    { "source": "Client", "target": "client.name" },
    { "source": "Federal ID", "target": "client.ein" },
    { "source": "Org Type", "target": "client.entity_type" },
    { "source": "State/Juris", "target": "client.state" },
    { "source": "County/Region", "target": "client.county" },
    { "source": "Tax Forms", "target": "client.tax_types" },
    { "source": "Contact", "target": "client.assignee_name" },
    { "source": "Email", "target": "client.email" },
    { "source": "Industry", "target": "IGNORE" },
    { "source": "Year Revenue", "target": "IGNORE" },
    { "source": "Notes", "target": "client.notes" }
  ]
}
```

---

## 5. Phase 0 扩展位

| 扩展项             | 阶段        | 备注                                                                                                                                             |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 辖区扩容 fixture   | Phase 0 MVP | 追加 `taxdome-ma-30clients.csv` / `drake-tx-30clients.csv` / `karbon-fl-20clients.csv` / `quickbooks-wa-20clients.csv` 覆盖 Matrix v1.1 的 48 格 |
| Pulse fixture 目录 | Phase 0 MVP | `../07-fixtures-pulse/`：IRS / CA FTB / NY DTF 原始公告 HTML + 期望 `pulse_extract` JSON                                                         |
| Seed 规模 fixture  | Phase 0 MVP | `taxdome-500clients.csv` 用于性能基线（Mapper 延迟 / Dashboard first paint）                                                                     |
| 多语种 fixture     | Phase 1     | 中文 / 西班牙语列名混用（客户全球化事务所）                                                                                                      |

---

## 变更记录

| 版本 | 日期       | 作者       | 摘要                                                                                                        |
| ---- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| v1.0 | 2026-04-24 | Subagent D | 初稿：5 Preset + 1 Agent demo · PII 合规原则 · Day 3 落地路径 · 6 份 expected mapping JSON · Phase 0 扩展位 |
