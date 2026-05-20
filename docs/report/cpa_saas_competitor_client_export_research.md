# 美国中小型 CPA firm 报税截止日提醒 SaaS：竞品客户资料导出整理

**整理日期：2026-05-20**  
**目标用途：**为你的 SaaS 设计“从竞品导出的客户资料导入”功能，判断应支持哪些入口文件、字段映射、解析策略和例外处理。

> 本文只整理与“客户/联系人/客户账户资料导入”高度相关的导出方式。完整数据库备份文件，例如 File In Time `.fbk`、QuickBooks Desktop `.qbb`、QuickBooks Online Advanced cloud archive `.cab`，通常不适合作为你的 SaaS 的直接导入入口，应作为“不可直接解析/需转换”的文件类型处理。

---

## 1. 快速结论：你的导入功能应优先支持的文件类型

| 来源产品           | 最可能被 CPA 上传给你的文件                                         | 建议你的 SaaS 支持                                    | 备注                                                                                                                 |
| ------------------ | ------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| File In Time       | Client Information text file；Task View Excel；也可能误传 `.fbk`    | `.txt` / `.tsv` / `.csv` / `.xlsx`；拒绝或提示 `.fbk` | 官方用户指南显示客户信息可从 `Tools > Export Client Information` 导出为 text file；`.fbk` 是数据库备份，不适合导入。 |
| QuickBooks Online  | Customer export Excel；Customer Contact List Excel；bulk export ZIP | `.xlsx` / `.xls` / `.csv` / `.zip`                    | QBO 客户导出多为 Excel；用户也可能先另存为 CSV。                                                                     |
| QuickBooks Desktop | Customer Contact List Excel/CSV；Customers IIF；也可能误传 `.qbb`   | `.xlsx` / `.csv` / `.iif` / `.txt`；拒绝或提示 `.qbb` | `.iif` 是 TSV-like text，常见 header 是 `!CUST` / `CUST`。                                                           |
| TaxDome            | Accounts zipped CSV；Contacts zipped CSV                            | `.zip` containing `.csv`；`.csv`                      | TaxDome 的 Accounts 与 Contacts 是两个不同对象，应允许分别导入并合并。                                               |
| Karbon             | Contacts spreadsheet/CSV；API JSON；Work export CSV/Spreadsheet     | `.csv` / `.xlsx` / `.json`；API connector 可选        | UI 导出通常是联系人表；API 可取 Contacts、Organizations、ClientGroups 和 BusinessCards。                             |

**产品设计建议：**上传页不要只写“Upload CSV”。应写成：

> Upload a client list from QuickBooks, TaxDome, Karbon, File In Time, or another practice management system. Supported: CSV, Excel, ZIP, TXT/TSV, IIF.

---

## 2. File In Time

### 2.1 适合导入的导出路径

| 导出类型           | 路径                                 | 文件格式                                | 适合作为你的 SaaS 导入入口吗？                          |
| ------------------ | ------------------------------------ | --------------------------------------- | ------------------------------------------------------- |
| Client Information | `Tools > Export Client Information`  | text file，通常应按 delimited text 处理 | 是。应支持 `.txt`、`.tsv`、`.csv`，并提供字段映射。     |
| Task View          | `Tools > Display Task View in Excel` | Excel                                   | 可能。若你的产品要吸收已有任务/截止日，可作为二级入口。 |
| Database Backup    | `Tools > Backup Database`            | `.fbk`                                  | 否。用于 File In Time 自身 restore，不建议解析。        |

### 2.2 公开资料核对

- File In Time 官方用户指南的可搜索片段显示，客户信息导出用于 mail merge / labels，路径是 `Tools > Export Client Information`，并会打开 Client Export dialog。
- TimeValue 官方 FAQ 说明，`Tools > Backup Database` 会创建数据库完整副本，可用 `Tools > Restore from Backup` 恢复；备份文件示例名为 `UserInitiatedBackup-12-31-21.fbk`。
- TimeValue 官方 FAQ 还说明，归档旧数据时可 `Tools > Display Task View in Excel` 导出 Task View。

> 注意：File In Time 官方 PDF 在浏览器抓取时可能有访问限制；公开可核验片段能确认导出路径，但不能稳定确认所有导出列名。因此下面的字段样例是“产品导入设计示例”，不是官方逐列 schema。

### 2.3 文件大概长什么样

#### A. Client Information text file，示例：TSV / tab-delimited text

```text
ClientName	EntityType	TaxID	ContactName	Email	Phone	Address1	City	State	ZIP	AssignedStaff	Notes
ABC LLC	S Corporation	12-3456789	John Smith	john@abcllc.com	555-0100	123 Main St	Austin	TX	78701	Jane CPA	2025 return filed
Smith Family	Individual	987-65-4321	Mary Smith	mary@example.com	555-0200	45 Oak Ave	Seattle	WA	98101	Tom CPA	Extension usually needed
```

#### B. Task View Excel，示例：`TaskView.xlsx`

```text
TaskView.xlsx
└── Sheet1
    ├── Client Name
    ├── Task Name
    ├── Form / Filing Type
    ├── Due Date
    ├── Assigned Staff
    ├── Status
    └── Notes
```

示例表格：

| Client Name  | Task Name                  | Form / Filing Type | Due Date   | Assigned Staff | Status | Notes                  |
| ------------ | -------------------------- | ------------------ | ---------- | -------------- | ------ | ---------------------- |
| ABC LLC      | 2025 Federal S-Corp Return | 1120-S             | 2026-03-16 | Jane CPA       | Open   | Waiting on K-1 data    |
| Smith Family | 2025 Individual Return     | 1040               | 2026-04-15 | Tom CPA        | Open   | Client usually extends |

#### C. `.fbk` 数据库备份，示例：不适合作为导入入口

```text
FileInTime_Backups/
  UserInitiatedBackup-05-20-26.fbk
  AutomaticDailyBackup-05-19-26.fbk
```

你的 SaaS 处理建议：

```text
上传 .fbk 时提示：
“This appears to be a File In Time database backup. Please export Client Information from Tools > Export Client Information, or export Task View to Excel.”
```

### 2.4 对你的 SaaS 的字段映射建议

| File In Time 字段/推测字段 | 你的 SaaS 建议字段                      | 处理策略                                                                  |
| -------------------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| ClientName                 | client.display_name                     | 必填。若缺失，使用 ContactName 或 Company。                               |
| EntityType                 | client.entity_type                      | 映射到 Individual, Partnership, S-Corp, C-Corp, Trust, Nonprofit, Other。 |
| TaxID                      | client.tax_id_last4 或 encrypted_tax_id | 不要明文长期保存，除非产品确实需要。                                      |
| AssignedStaff              | client.owner / staff_assignee           | 可选。可邀请用户确认映射。                                                |
| Task Due Date              | deadline.date                           | 仅在导入 Task View 时使用。                                               |
| Filing Type                | deadline.filing_type                    | 例如 1040、1065、1120-S、1120、1041、990。                                |

---

## 3. QuickBooks

QuickBooks 必须拆成 **QuickBooks Online** 与 **QuickBooks Desktop**。它们导出的文件格式和字段结构差异很大。

---

### 3.1 QuickBooks Online：客户资料导出

#### 3.1.1 导出路径

| 导出方式                     | 路径                                                                                       | 文件格式                             | 适合作为你的 SaaS 导入入口吗？                       |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------- |
| Customers page export        | `All apps > Customer Hub > Customers & leads > Export icon > Export to Excel`              | Excel `.xlsx`                        | 是。最直接。                                         |
| Customer Contact List report | `Reports > Standard reports > Customer Contact List > Customize columns > Export to Excel` | Excel `.xlsx`                        | 是。字段可自定义，更适合导入。                       |
| Full export data             | `Settings > Export data > Reports / Lists > Export to Excel`                               | one `.zip` containing Excel files    | 可以。需要 ZIP 解析并自动找到 Customer list/report。 |
| Attachments export           | `Settings > Attachments > Batch actions > Export`                                          | ZIP                                  | 通常不适合客户资料导入，除非你要导入客户文档。       |
| QBO Advanced backup          | `Settings > Back up company`                                                               | Online backup / cloud archive `.cab` | 不适合作为你的普通导入入口。                         |

#### 3.1.2 官方字段提示

QuickBooks Online 从 Customers page 导出时，官方文档列出的客户字段包括：

- Name
- Company
- Address
- Phone number
- Email Address
- Customer type
- Attachment
- Currency
- Balance
- Notes

Customer Contact List report 可以自定义列后导出，因此实际字段会随 firm 的 report customization 改变。

#### 3.1.3 文件大概长什么样

##### A. Customers page export，示例：`CustomerList.xlsx`

```text
CustomerList.xlsx
└── Sheet1
    ├── Name
    ├── Company
    ├── Address
    ├── Phone number
    ├── Email Address
    ├── Customer type
    ├── Attachment
    ├── Currency
    ├── Balance
    └── Notes
```

示例表格：

| Name         | Company | Address                       | Phone number | Email Address    | Customer type | Currency | Balance | Notes               |
| ------------ | ------- | ----------------------------- | ------------ | ---------------- | ------------- | -------- | ------: | ------------------- |
| ABC LLC      | ABC LLC | 123 Main St, Austin, TX 78701 | 555-0100     | john@abcllc.com  | Business      | USD      | 1250.00 | Monthly bookkeeping |
| Smith Family |         | 45 Oak Ave, Seattle, WA 98101 | 555-0200     | mary@example.com | Individual    | USD      |    0.00 | 1040 client         |

##### B. Customer Contact List report，示例：`Customer Contact List.xlsx`

```text
Customer Contact List.xlsx
└── Sheet1
    ├── Customer
    ├── Company Name
    ├── Billing Address
    ├── Ship To Address
    ├── Phone
    ├── Mobile
    ├── Fax
    ├── Email
    ├── Terms
    ├── Customer Type
    └── Notes
```

示例表格：

| Customer   | Company Name | Billing Address               | Phone    | Mobile   | Email            | Customer Type | Notes             |
| ---------- | ------------ | ----------------------------- | -------- | -------- | ---------------- | ------------- | ----------------- |
| ABC LLC    | ABC LLC      | 123 Main St, Austin, TX 78701 | 555-0100 | 555-0101 | john@abcllc.com  | S-Corp        | Tax + bookkeeping |
| Mary Smith |              | 45 Oak Ave, Seattle, WA 98101 | 555-0200 |          | mary@example.com | Individual    | MFJ with spouse   |

##### C. Full export data ZIP，示例

```text
QuickBooksOnline_Export_2026-05-20.zip
  Balance Sheet.xlsx
  Profit and Loss.xlsx
  General Ledger.xlsx
  Customer Contact List.xlsx
  Vendor Contact List.xlsx
  Product Service List.xlsx
```

你的 SaaS 处理建议：

```text
若上传 ZIP：
1. 解压。
2. 扫描文件名是否包含 customer / client / contact。
3. 若有多个候选文件，展示选择：
   - Customer Contact List.xlsx
   - Customer List.xlsx
4. 进入字段映射页。
```

---

### 3.2 QuickBooks Desktop：客户资料导出

#### 3.2.1 导出路径

| 导出方式                     | 路径                                                                                                | 文件格式                 | 适合作为你的 SaaS 导入入口吗？               |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------- |
| Customer Contact List report | `Reports > Reports Center > Customer Contact List > Excel dropdown > Create New Worksheet / Export` | `.xlsx` / `.csv` / PDF   | 是。推荐支持 Excel/CSV。                     |
| Lists to IIF                 | `File > Utilities > Export > Lists to IIF Files > Customers and customer:jobs`                      | `.iif`，ASCII text / TSV | 是。需要专门 IIF parser。                    |
| Company backup               | `File > Back up Company > Create Local Backup`                                                      | `.qbb`                   | 否。完整备份，不适合作为 SaaS 客户导入入口。 |

#### 3.2.2 文件大概长什么样

##### A. Customer Contact List Excel / CSV

```csv
Customer,Company Name,Billing Address,Phone,Alt. Phone,Email,Customer Type,Terms,Open Balance,Notes
ABC LLC,ABC LLC,"123 Main St, Austin, TX 78701",555-0100,,john@abcllc.com,S-Corp,Net 30,1250.00,Bookkeeping client
Smith Family,,"45 Oak Ave, Seattle, WA 98101",555-0200,,mary@example.com,Individual,Due on receipt,0.00,1040 client
```

##### B. IIF customer list，示例：`Customers.iif`

`.iif` 不是标准 CSV。它是 tab-separated text，通常有 QuickBooks 风格 header。示例：

```text
!CUST	NAME	REFNUM	BADDR1	BADDR2	BADDR3	PHONE1	PHONE2	EMAIL	NOTE	TERMS	CUSTFLD1
CUST	ABC LLC	ABC001	ABC LLC	123 Main St	Austin, TX 78701	555-0100	555-0101	john@abcllc.com	Bookkeeping client	Net 30	S-Corp
CUST	Smith Family	SMITH001	Mary Smith	45 Oak Ave	Seattle, WA 98101	555-0200		mary@example.com	1040 client	Due on receipt	Individual
```

你的 SaaS IIF parser 建议：

```text
1. 检测第一行是否以 !CUST 或 !TRNS / !ACCNT 等 QuickBooks IIF header 开头。
2. 只抽取 CUST 行；忽略非客户行。
3. 使用 tab 分隔，不要按 comma 分隔。
4. 将 BADDR1/BADDR2/BADDR3 合并为 address。
5. 将 CUSTFLD* 作为 custom fields 展示给用户映射。
```

##### C. `.qbb` 备份，示例：不适合作为导入入口

```text
ABC_LLC_QuickBooks_Backup_2026-05-20.qbb
```

你的 SaaS 处理建议：

```text
上传 .qbb 时提示：
“This appears to be a QuickBooks Desktop company backup. Please export your Customer Contact List to Excel/CSV or export Customers to an IIF file.”
```

---

## 4. TaxDome

TaxDome 是客户门户 + CRM + workflow 系统。对你的 SaaS 来说，最重要的是理解 TaxDome 的两个核心对象：

- **Accounts**：客户账户 / entity / household / business account。
- **Contacts**：联系人 / person。一个 Contact 可以 linked to 多个 Accounts，一个 Account 也可以 linked to 多个 Contacts。

因此，你的导入流程最好允许 CPA 同时上传：

```text
accounts_export.zip
contacts_export.zip
```

然后在导入向导里合并 Accounts 与 Contacts。

---

### 4.1 Accounts 导出

| 项目                           | 内容                                                      |
| ------------------------------ | --------------------------------------------------------- |
| 路径                           | `Clients > Accounts > export icon`                        |
| 权限                           | Firm owner、admin 或有 manage accounts 权限的 team member |
| 下载方式                       | 系统发送 email 下载链接；链接有效期 24 小时               |
| 文件格式                       | zipped CSV                                                |
| 适合作为你的 SaaS 导入入口吗？ | 是，TaxDome 的 account export 是高价值入口。              |

#### Accounts CSV 大概字段

官方文档列出的 account export 内容包括：

- account ID
- account name
- state
- type
- billing / total bills / credit
- assigned team members
- assigned tags
- followers
- last login / creation / update / archiving dates
- login credentials status
- active jobs / tasks / proposals / organizers counts
- account timezone
- custom account fields
- linked contacts
- linked notes
- account roles

#### Accounts zipped CSV 示例

```text
TaxDome_Accounts_Export.zip
  accounts.csv
```

`accounts.csv` 示例：

```csv
Account ID,Account name,State,Type,Total bills,Credit,Assigned team members,Tags,Last login,Created date,Updated date,Active jobs,Active tasks,Timezone,Custom field - Entity type,Linked contact #1,Linked contact #2,Notes,Account role - Client Manager
acc_1001,ABC LLC,Active,Business,1250.00,0.00,Jane CPA,"1120S;Bookkeeping",2026-05-01,2024-03-15,2026-05-10,2,4,America/Chicago,S Corporation,John Smith,,Monthly bookkeeping client,Jane CPA
acc_1002,Smith Family,Active,Individual,0.00,0.00,Tom CPA,"1040;VIP",2026-04-01,2023-01-20,2026-04-12,1,2,America/Los_Angeles,Individual,Mary Smith,Bob Smith,Usually files extension,Tom CPA
```

---

### 4.2 Contacts 导出

| 项目                           | 内容                                                      |
| ------------------------------ | --------------------------------------------------------- |
| 路径                           | `Clients > Contacts > Export contacts`                    |
| 权限                           | Firm owner、admin 或有 manage contacts 权限的 team member |
| 下载方式                       | 系统发送 email 下载链接；链接有效期 24 小时               |
| 文件格式                       | zipped CSV                                                |
| 适合作为你的 SaaS 导入入口吗？ | 是，但需要与 Accounts 合并才更完整。                      |

#### Contacts CSV 大概字段

官方文档列出的 contact export 内容包括：

- contact name
- first name / middle name / last name
- phone number
- company name
- street address / city / state / country / zip
- notes
- creation / update dates
- tags
- email address
- contact timezone
- custom contact fields
- linked accounts

#### Contacts zipped CSV 示例

```text
TaxDome_Contacts_Export.zip
  contacts.csv
```

`contacts.csv` 示例：

```csv
Contact name,First name,Middle name,Last name,Phone number,Company name,Street address,City,State/Province,Country,Zip code,Email address,Tags,Timezone,Custom field - Spouse name,Linked account #1,Linked account #2,Notes
John Smith,John,,Smith,555-0100,ABC LLC,123 Main St,Austin,TX,US,78701,john@abcllc.com,Owner,America/Chicago,,ABC LLC,,Primary shareholder
Mary Smith,Mary,,Smith,555-0200,,45 Oak Ave,Seattle,WA,US,98101,mary@example.com,1040,America/Los_Angeles,Bob Smith,Smith Family,,MFJ taxpayer
```

---

### 4.3 Jobs / Tasks / Organizers：不是客户资料，但对“截止日提醒”很有价值

| 模块       | 路径                                              | 文件格式      | 对你的 SaaS 的价值                                        |
| ---------- | ------------------------------------------------- | ------------- | --------------------------------------------------------- |
| Jobs       | `Workflow > Jobs > Export jobs`                   | zipped CSV    | 可导入现有工作项目、pipeline、stage、due date、assignee。 |
| Tasks      | `Workflow > Tasks > Export tasks`                 | zipped CSV    | 可导入具体任务与 due date。                               |
| Organizers | `Organizers > organizer three-dot menu > Export`  | zipped CSV    | 可导入 completed organizer data；不是核心客户清单。       |
| Documents  | `Documents > select documents/folders > Download` | `archive.zip` | 不建议作为初版客户资料导入；可作为未来文档归档功能。      |

#### Tasks CSV 示例

```csv
Account name,Task name,Start date,Due date,Created date,Updated date,Creator,Status,Priority,Job name,Pipeline,Stage,Tags,Linked documents,Notes,Timezone
ABC LLC,Request 2025 bank statements,2026-01-15,2026-02-10,2026-01-10,2026-01-15,Jane CPA,Pending,High,2025 S-Corp Return,Tax Returns,Info Gathering,1120S,bank_statement_request.pdf,Client reminded,America/Chicago
Smith Family,Send 8879 for signature,2026-03-20,2026-04-01,2026-03-19,2026-03-20,Tom CPA,Pending,Medium,2025 Individual Return,1040,Review,1040,,Waiting for spouse email,America/Los_Angeles
```

### 4.4 TaxDome 导入设计建议

| TaxDome 字段                      | 你的 SaaS 建议字段              | 处理策略                                                                   |
| --------------------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| Account ID                        | external_ids.taxdome_account_id | 保存，用于后续重复导入去重。                                               |
| Account name                      | client.display_name             | 主客户名称。                                                               |
| Type / Custom field - Entity type | client.entity_type              | 需要归一化到你的 entity type enum。                                        |
| Assigned team members             | client.owner / assignees        | 可映射到 firm user；若用户不存在，先作为文字保存。                         |
| Tags                              | client.tags                     | 按 `;` 或 comma 拆分，需允许用户确认。                                     |
| Linked contact #N                 | related_contacts                | 建议创建 contact relation。                                                |
| Contact name / Email              | contact.name / contact.email    | 若 contacts.csv 与 accounts.csv 同时上传，用 email/name 进行 merge。       |
| Jobs / Tasks due date             | deadline.source_due_date        | 可作为“从历史 workflow 导入的 deadline”，但需让用户确认是否启用 reminder。 |

---

## 5. Karbon

Karbon 是 practice management / workflow 平台。对你的 SaaS 来说，Karbon 有两条入口：

1. **UI 导出**：CPA 从 Contacts 页面导出 spreadsheet/CSV 后上传给你。
2. **API 连接**：你的 SaaS 做 Karbon integration，直接读取 Contacts、Organizations、ClientGroups、BusinessCards、WorkItems。

---

### 5.1 Contacts UI 导出

| 项目                           | 内容                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 路径                           | `Contacts section > cloud icon / Export-Import icon > All contacts`                                                                    |
| 权限                           | Admin permissions / Admin access 通常需要                                                                                              |
| 文件格式                       | 官方帮助与迁移文档表述为 spreadsheet；Karbon 帮助片段提到 `Export All Contacts` 会自动下载 CSV。为稳妥起见，应支持 `.csv` 和 `.xlsx`。 |
| 适合作为你的 SaaS 导入入口吗？ | 是。                                                                                                                                   |

#### Karbon contacts export 可能长这样

```text
Karbon_All_Contacts.csv
```

示例 CSV：

```csv
ContactKey,Contact Type,Full Name,First Name,Last Name,Organization,Email Address,Phone Number,Address,City,State,Zip,Country,Client Owner,Client Manager,Tags,Custom Field - Entity Type,User Defined Identifier
3Nb8jKpL5tQR,Individual,John Smith,John,Smith,ABC LLC,john@abcllc.com,2025550174,123 Main St,Austin,TX,78701,US,Jane CPA,Tom Manager,VIP,S Corporation,MAG-C-0042
7wPqXnT4mBjK,Organization,ABC LLC,,,ABC LLC,admin@abcllc.com,2025550100,123 Main St,Austin,TX,78701,US,Jane CPA,Tom Manager,Bookkeeping,S Corporation,MAG-ORG-001
```

> 注意：Karbon 的实际导出列会受 firm 配置、custom fields、contact types 和导出选项影响。你的导入器不要依赖固定列顺序，应按 header 名称 + fuzzy matching 映射。

---

### 5.2 Work export：对截止日产品有二级价值

| 项目                         | 内容                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| 路径                         | `Work page > cloud icon/export menu`；常见选项包括 `All work in this view`、`Repeating work schedules` |
| 文件格式                     | Spreadsheet / CSV 类文件                                                                               |
| 适合作为客户资料导入入口吗？ | 不作为主入口；适合作为“导入现有 work/due dates”的二级入口。                                            |

示例：

```csv
Work Item,Client,Work Type,Primary Status,Assignee,Start Date,Due Date,Deadline Date,Repeats,Item(Product/Services),Budget
2025 S-Corp Return,ABC LLC,Tax,In Progress,Jane CPA,2026-01-15,2026-03-16,2026-03-16,Annual,1120S Tax Return,1500
2025 Individual Return,Smith Family,Tax,Planned,Tom CPA,2026-02-01,2026-04-15,2026-04-15,Annual,1040 Tax Return,900
```

---

### 5.3 Karbon API 导出 / 同步

如果你的 SaaS 做 direct integration，Karbon API 是比手工 CSV 更稳定的方式。

#### 5.3.1 客户对象 API

| 对象            | Endpoint                                        | 说明                                                |
| --------------- | ----------------------------------------------- | --------------------------------------------------- |
| Contacts        | `GET https://api.karbonhq.com/v3/Contacts`      | UI 中的 Person / individual contacts。              |
| Organizations   | `GET https://api.karbonhq.com/v3/Organizations` | Business / organization clients。                   |
| ClientGroups    | `GET https://api.karbonhq.com/v3/ClientGroups`  | Grouped clients / client groups。                   |
| Contact details | `?$expand=BusinessCards`                        | 取 email、phone、address。                          |
| Client team     | `?$expand=ClientTeam`                           | 取 ClientOwner、ClientManager、user-defined roles。 |

#### 5.3.2 API JSON 大概长什么样

```json
{
  "ContactKey": "3Nb8jKpL5tQR",
  "FirstName": "John",
  "LastName": "Smith",
  "FullName": "John Smith",
  "ContactType": "Individual",
  "BusinessCards": [
    {
      "BusinessCardKey": "4mWxYqN7rZPK",
      "EntityType": "Contact",
      "EntityKey": "3Nb8jKpL5tQR",
      "IsPrimaryCard": true,
      "OrganizationKey": "7wPqXnT4mBjK",
      "RoleOrTitle": "Owner",
      "EmailAddresses": ["john@abcllc.com"],
      "PhoneNumbers": [
        {
          "Number": "2025550174",
          "CountryCode": "US",
          "Label": "Mobile"
        }
      ],
      "Addresses": [
        {
          "AddressLines": "123 Main St",
          "City": "Austin",
          "StateProvinceCounty": "TX",
          "ZipCode": "78701",
          "CountryCode": "US",
          "Label": "Physical"
        }
      ]
    }
  ],
  "ClientTeam": [
    {
      "MemberKey": "JTphCpQqQYg",
      "MemberType": "User",
      "RoleType": "ClientOwner"
    }
  ]
}
```

#### 5.3.3 API pagination 大概长什么样

```json
{
  "@odata.count": 523,
  "@odata.nextLink": "https://api.karbonhq.com/v3/Contacts?$skip=100",
  "value": [
    {
      "ContactKey": "abc1",
      "FullName": "Jane Smith"
    }
  ]
}
```

#### 5.3.4 Karbon files API，非客户资料主入口

Karbon API 可以列出和下载与 Work、Contacts、Organizations 相关的文件。示例：

```json
{
  "EntityKey": "3bXVhdMHgc9P",
  "EntityType": "WorkItem",
  "Attachments": [
    {
      "FileContextKey": "S8bsBjvCRJ3",
      "FileName": "image.jpeg",
      "FileSize": 7316,
      "MimeType": "image/jpeg",
      "DownloadUrl": "/V3/Files?token=...",
      "DateCreated": "2024-07-18T23:44:26Z"
    }
  ]
}
```

对你的 SaaS：除非做文档归档，否则不建议把 files API 放在第一版导入范围。

---

## 6. 跨产品导入器设计建议

### 6.1 支持的上传文件类型

第一版建议支持：

```text
.csv
.xlsx
.xls
.zip
.txt
.tsv
.iif
.json   # 仅当你要支持 Karbon API dump 或内部迁移脚本
```

明确拒绝但给出提示：

```text
.fbk    # File In Time backup
.qbb    # QuickBooks Desktop backup
.qbw    # QuickBooks Desktop company file
.qbm    # QuickBooks portable company file
.cab    # QBO Advanced personal cloud archive
.pdf    # 不是客户资料清单；除非是 report PDF，但不建议 OCR
```

### 6.2 产品自动识别规则

| 产品                   | 可用于识别的文件名 / header / 内容特征                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| File In Time           | 文件名含 `client`, `fit`, `fileintime`, `taskview`；TSV/TXT；字段可能含 `ClientName`, `TaxID`, `AssignedStaff`, `DueDate`。  |
| QuickBooks Online      | Excel/CSV header 含 `Name`, `Company`, `Email Address`, `Customer type`, `Balance`, `Customer Contact List`。                |
| QuickBooks Desktop IIF | 文件扩展 `.iif`；第一行可能以 `!CUST` 开头；数据行以 `CUST` 开头；tab-separated。                                            |
| TaxDome Accounts       | ZIP/CSV header 含 `Account ID`, `Account name`, `Linked contact #1`, `Account role`。                                        |
| TaxDome Contacts       | ZIP/CSV header 含 `Contact name`, `First name`, `Last name`, `Linked account #1`。                                           |
| Karbon CSV             | Header 可能含 `ContactKey`, `OrganizationKey`, `Client Owner`, `Client Manager`, `Contact Type`, `User Defined Identifier`。 |
| Karbon API JSON        | JSON 含 `ContactKey`, `OrganizationKey`, `BusinessCards`, `@odata.nextLink`, `value`。                                       |

### 6.3 字段归一化模型

建议你的 SaaS 内部至少拆成这几个对象：

```text
Client
  id
  display_name
  entity_type
  tax_year_default
  fiscal_year_end
  state
  external_ids
  tags
  owner_user_id

Contact
  id
  first_name
  last_name
  email
  phone
  address

ClientContactRelation
  client_id
  contact_id
  role
  is_primary

Deadline
  client_id
  filing_type
  jurisdiction
  due_date
  extended_due_date
  source
  confidence
```

### 6.4 Entity type 映射建议

竞品导出的 `Customer Type`、`Entity Type`、`Contact Type`、custom fields 可能很不标准。建议做 fuzzy mapping：

| 输入可能值                                   | 归一化 entity_type           |
| -------------------------------------------- | ---------------------------- |
| Individual, 1040, Personal, Person, Taxpayer | Individual                   |
| Business, Company, Organization, Entity      | BusinessUnknown              |
| S Corp, S-Corp, 1120S, 1120-S                | SCorporation                 |
| C Corp, C-Corp, 1120                         | CCorporation                 |
| Partnership, 1065                            | Partnership                  |
| Fiduciary, Trust, Estate, 1041               | TrustEstate                  |
| Nonprofit, Not-for-profit, 990               | Nonprofit                    |
| Payroll only, Bookkeeping only               | ServiceOnly / UnknownTaxType |

### 6.5 导入 UX 建议

建议导入向导分 5 步：

```text
Step 1: Upload file
Step 2: Detect source product and file type
Step 3: Preview rows and map fields
Step 4: Resolve duplicates and relationships
Step 5: Generate tax deadline profiles
```

关键交互：

1. **ZIP 自动展开**：TaxDome 和 QBO 常见 ZIP。
2. **多文件合并**：TaxDome accounts + contacts 应允许同时上传。
3. **字段映射保存**：同一个 firm 以后重复导入时复用 mapping。
4. **低置信度标记**：例如 QuickBooks 的 `Customer Type = Business` 不足以判断 1120S/1065/1120，需要用户确认。
5. **备份文件拦截**：`.qbb`, `.fbk`, `.cab` 不能静默失败，应给具体导出指引。

---

## 7. 建议的首版 import priority

| 优先级 | 来源 / 文件类型           | 原因                                                             |
| ------ | ------------------------- | ---------------------------------------------------------------- |
| P0     | CSV                       | 所有产品最终都可能转换成 CSV。                                   |
| P0     | Excel `.xlsx`             | QuickBooks、Karbon、File In Time Task View 常见。                |
| P0     | ZIP containing CSV/XLSX   | TaxDome、QBO bulk export 常见。                                  |
| P1     | QuickBooks Desktop `.iif` | 美国 CPA firm 仍可能使用 Desktop；IIF 解析不复杂但需要专门处理。 |
| P1     | TXT/TSV                   | File In Time Client Information text export。                    |
| P2     | Karbon API connector      | 对较成熟 firm 更有价值，但需要 OAuth/API credential/权限设计。   |
| P3     | 文档 ZIP / attachments    | 不直接帮助生成截止日提醒，除非做文档归档。                       |

---

## 8. 来源链接

### File In Time / TimeValue

- File In Time User Guide PDF: https://www.timevalue.com/sites/default/files/product-download/File-In-Time-Users-Guide.pdf
  - 可搜索片段显示：`Tools > Export Client Information`，导出客户信息为 text file，用于 mail merge / labels。
- TimeValue FAQ — Installing / Admin: https://www.timevalue.com/faqs-category/installing-admin
  - 说明 `Tools > Backup Database`、`.fbk`、`Restore from Backup`，以及 `Tools > Display Task View in Excel`。

### QuickBooks / Intuit

- Export customer data to Excel — QuickBooks Online: https://quickbooks.intuit.com/learn-support/en-us/help-article/import-export-data-files/export-customer-data-excel/L0ZerVWiO_US_en_US
- Export your QuickBooks Online data: https://quickbooks.intuit.com/learn-support/en-us/help-article/list-management/export-reports-lists-data-quickbooks-online/L1xleDrLp_US_en_US
- Export/import/edit IIF files — QuickBooks Desktop: https://quickbooks.intuit.com/learn-support/en-us/help-article/import-export-data-files/export-import-edit-iif-files/L56LT9Z0Q_US_en_US
- IIF Overview: import kit, sample files, and headers: https://quickbooks.intuit.com/learn-support/en-us/help-article/list-management/iif-overview-import-kit-sample-files-headers/L5CZIpJne_US_en_US
- Export lists from the old company file into a new data file: https://quickbooks.intuit.com/learn-support/en-us/help-article/data-systems/export-lists-old-company-file-new-data-file/L0cmQqJ2v_US_en_US
- Back up QuickBooks Desktop company file: https://quickbooks.intuit.com/learn-support/en-us/help-article/back-data/back-quickbooks-desktop-company-file/L9qYBI54v_US_en_US
- Back up and restore QuickBooks Online Advanced company: https://quickbooks.intuit.com/learn-support/en-us/help-article/back-data/back-restore-quickbooks-online-advanced-company/L9sTCQn9P_US_en_US

### TaxDome

- Export your TaxDome data: https://help.taxdome.com/article/278-how-do-i-back-up-all-my-account-data
- Bulk actions with documents: https://help.taxdome.com/article/1216-mr-2503-docs-basic-bulk-actions
- TaxDome Drive guide: https://help.taxdome.com/article/166-taxdome-drive-automatically-keep-client-files-in-sync-with-your-pc-mac
- Export client list from current software: https://help.taxdome.com/article/121-how-to-export-your-client-list-from-your-current-software

### Karbon

- Export, download, and edit contact data: https://help.karbonhq.com/s/articles/1524449-export-download-and-edit-contact-data
- Import client data: https://help.karbonhq.com/s/articles/1524435-import-client-data
- Karbon Developer Center: https://developers.karbonhq.com/
- Searching for and Retrieving Client Details: https://developers.karbonhq.com/guides/searching-clients/
- Karbon API Authentication: https://developers.karbonhq.com/guides/authentication/
- Karbon API Pagination: https://developers.karbonhq.com/guides/pagination/
- Karbon API File List / Files release note: https://developers.karbonhq.com/release-notes/2024-07-22/
- Karbon release note mentioning work export fields: https://karbonhq.com/release-notes/july-12-2022/
