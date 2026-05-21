# 美国 CPA 税务软件客户资料导出格式梳理

**用途**：为“美国中小型 CPA firm 报税截止日提醒 SaaS”的客户资料导入功能设计导入器。  
**范围**：CCH Axcess、CCH ProSystem fx、Lacerte、ProSeries、UltraTax CS、ProConnect Tax。  
**整理日期**：2026-05-21。  
**说明**：下面的客户信息示例均为合成数据，不是真实客户资料；实际导出字段会因软件版本、tax year、firm setup、return type、用户选择的列而变化。

---

## 一页结论

| 软件             | 客户资料导出路径                                                                                                          | 适合 SaaS 导入的格式                                    | 首期导入优先级 | 备注                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------: | -------------------------------------------------------- |
| CCH Axcess       | Client Manager / Return Manager grid export；或 Dashboard → Application Links → Utilities → Create client list for Portal | CSV、XLS、XLSX                                          |             高 | 优先支持 CSV/XLSX；不要解析 `.RTNBAK` return backup      |
| CCH ProSystem fx | Dashboard → Applications → Utilities → Create client list for Portal                                                      | CSV、XLS、XLSX                                          |             高 | 默认文件名常见为 `PortalSaaSClient_<date>_<time>`        |
| Lacerte          | Clients tab → select clients → Client → Export → Export to File                                                           | CSV，常见默认名 `EXPORT.CSV`                            |             高 | 最适合首期支持；字段由用户选择                           |
| ProSeries        | HomeBase View → HomeBase menu → Export Contacts                                                                           | CSV，常见路径 `C:\ProWinYY\Common\Exports\Contacts.csv` |             高 | HomeBase view 可先自定义列                               |
| UltraTax CS      | Utilities → Client Listing Reports → select report → Export                                                               | XLS、DIF                                                |             中 | 首选 XLS；DIF 可作为兼容选项                             |
| ProConnect Tax   | Reporting → Download return data；Intuit Link → Download responses                                                        | CSV；documents 为 ZIP                                   |             中 | Reporting CSV 是 e-filed return data，不一定是完整通讯录 |

---

# 1. CCH Axcess

## 客户资料导出的路径

### 路径 A：Client Manager / grid export，适合导出 Excel 或 CSV

常见路径：

```text
CCH Axcess Dashboard
  → Application Links
  → Clients
  → Client Manager
  → Quick Search criteria: filters = All
  → Go
  → Home tab
  → Export Grid
  → Save as Excel / CSV
```

CCH 官方支持摘要确认了 `Client Manager → Quick Search filters = All → Go → Home tab → Export Grid` 这一类 client list 导出路径；迁移工具文档也常把 `Return Manager / Client Manager grid → Export Grid` 作为 CCH Axcess 客户清单 CSV 导出路径。

### 路径 B：Create client list for Portal，适合导出 CSV/XLS/XLSX

常见路径：

```text
Dashboard
  → Application Links
  → Utilities
  → Create client list for Portal
  → Choose Quick Search criteria
  → Go
  → Export
  → Save as CSV / XLS / XLSX
```

这个路径常用于 Portal / batch client linking / migration 场景。对你的 SaaS 来说，它比 return backup 更适合接收。

## 适合 SaaS 导入的文件格式

优先级：

```text
1. .csv
2. .xlsx
3. .xls
```

不建议首期导入器解析：

```text
*.RTNBAK
*.rctrl
```

这些是 CCH Axcess Tax 的 return backup / restore 文件，不是客户清单。

## 客户信息示例

### CSV 示例

```csv
Client ID,Client Sub-ID,Client GUID,Name Line 1,Name Line 2,Sort Name,Federal ID,Client Type,FYE,Address 1,City,State,ZIP,Phone,Email,Office,Responsible Staff
ABC123,,7f1b6c0e,ABC LLC,,ABC LLC,12-3456789,1120S,12/31,123 Main St,Austin,TX,78701,512-555-0100,owner@example.com,Main,JDOE
SMITH01,,8a2d91bf,John Smith,,SMITH JOHN,***-**-6789,1040,12/31,45 Oak Ave,Denver,CO,80202,303-555-0199,john@example.com,Main,JDOE
```

### SaaS 字段映射建议

```text
Client ID / Client Sub-ID       → external_client_id
Name Line 1 / Sort Name         → client_name
Client Type                     → return_type / entity_type
Federal ID                      → tin_or_masked_tin
FYE                             → fiscal_year_end
Email                           → primary_email
Phone                           → primary_phone
Office / Responsible Staff      → firm_office / preparer
```

---

# 2. CCH ProSystem fx

## 客户资料导出的路径

官方帮助文档中的路径：

```text
Dashboard
  → Applications
  → Utilities
  → Create client list for Portal
  → Select Quick Search criteria
  → Go
  → Export
  → Choose save location
  → Save as CSV / XLS / XLSX
```

CCH 文档说明，这个导出用于把 CCH ProSystem fx clients 导出后导入 Portal；文件可以保存为 CSV、XLS 或 XLSX。默认位置通常是：

```text
C:\Users\<user name>\Downloads
```

默认文件名常见为：

```text
PortalSaaSClient_<system date>_<system time>.csv
```

## 适合 SaaS 导入的文件格式

优先级：

```text
1. .csv
2. .xlsx
3. .xls
```

不建议首期导入器解析：

```text
CLNTBKUP.*
*.ZIP     # ProSystem fx 专有 backup ZIP，不应当作普通 ZIP 解压导入
```

## 客户信息示例

```csv
Client ID,Client Sub-ID,Name Line 1,Name Line 2,Sort Name,Federal ID,Client Type,FYE,Address 1,City,State,ZIP,Phone,Email,Partner,Manager,Preparer
ABC123,,ABC LLC,,ABC LLC,12-3456789,1120S,12/31,123 Main St,Austin,TX,78701,512-555-0100,owner@example.com,PARTNER1,MGR1,JDOE
SMITH01,,John Smith,,SMITH JOHN,***-**-6789,1040,12/31,45 Oak Ave,Denver,CO,80202,303-555-0199,john@example.com,PARTNER1,MGR1,JDOE
```

### SaaS 字段映射建议

```text
Client ID / Client Sub-ID       → external_client_id
Name Line 1                     → client_name
Client Type                     → return_type / entity_type
FYE                             → fiscal_year_end
Federal ID                      → tin_or_masked_tin
Partner / Manager / Preparer    → assigned_staff
```

---

# 3. Lacerte

## 客户资料导出的路径

官方路径：

```text
Lacerte
  → Clients tab
  → Highlight client(s)
  → Client menu
  → Export
  → Export to File
  → Browse or use default export directory
  → Export Type = Comma Delimited
  → Choose fields to export
  → OK
```

常见默认目录：

```text
C:\LACERTE\YYTAX\IDATA\EXPORT
```

常见默认文件名：

```text
EXPORT.CSV
```

## 适合 SaaS 导入的文件格式

优先级：

```text
1. .csv
```

Lacerte 的 client list export 允许用户选择导出的字段。对你的 SaaS，建议在导入向导中提示 CPA 至少导出这些字段：

```text
Client Number
Client Name
Taxpayer First Name
Taxpayer Last Name
Taxpayer E-mail Address
Taxpayer Phone
Street Address
City
State
ZIP
Return Type
Preparer
```

不建议首期导入器解析：

```text
IDATA/
CDATA/
PDATA/
SDATA/
*.DBF
*.MDX
DETAIL/
```

这些是 Lacerte return data / backup / conversion 结构，不是普通客户清单。

## 客户信息示例

```csv
Client Number,Taxpayer First Name,Taxpayer Last Name,Client Name,Return Type,SSN/EIN,Street Address,City,State,ZIP,Taxpayer Phone,Taxpayer E-mail Address,Preparer
1001,John,Smith,John Smith,1040,***-**-6789,45 Oak Ave,Denver,CO,80202,303-555-0199,john@example.com,JDOE
1002,,,ABC LLC,1120S,12-3456789,123 Main St,Austin,TX,78701,512-555-0100,owner@example.com,JDOE
```

### SaaS 字段映射建议

```text
Client Number                   → external_client_id
Taxpayer First Name             → first_name
Taxpayer Last Name              → last_name
Client Name                     → client_name
Return Type                     → return_type / entity_type
Taxpayer E-mail Address         → primary_email
Taxpayer Phone                  → primary_phone
Preparer                        → assigned_staff
```

---

# 4. ProSeries

## 客户资料导出的路径

官方路径：

```text
ProSeries Professional
  → HomeBase View
  → Make sure you are not inside a client return
  → Optional: customize HomeBase View columns
  → HomeBase menu
  → Export Contacts
  → OK
```

常见保存路径：

```text
C:\ProWinYY\Common\Exports\Contacts.csv
```

其中 `YY` 是 tax year，例如 `ProWin25` 可表示 2025 tax year 的 ProSeries folder。

## 适合 SaaS 导入的文件格式

优先级：

```text
1. Contacts.csv
```

ProSeries 的导出依赖 HomeBase View 中显示/配置的列。导入向导应提示 CPA 先添加这些列：

```text
Client name
Client status
Return type
Client street address
Client city/state/zip
Phone
Email
Preparer
```

不建议首期导入器解析：

```text
*.YYi   # Individual return file pattern
*.YYp   # Partnership return file pattern
*.YYc   # Corporation return file pattern
*.YYs   # S corporation return file pattern
```

这些是 ProSeries client return files / backup files，不是联系人 CSV。

## 客户信息示例

```csv
First Name,Last Name,Client Name,Client Status,Return Type,SSN/EIN,Client Street and Apt Address,Client City,Client State,Client Zip,Home Phone,Mobile Phone,Email,Preparer
John,Smith,John Smith,Accepted,1040,***-**-6789,45 Oak Ave,Denver,CO,80202,303-555-0199,303-555-0100,john@example.com,JDOE
,,ABC LLC,In Progress,1120S,12-3456789,123 Main St,Austin,TX,78701,512-555-0100,,owner@example.com,JDOE
```

### SaaS 字段映射建议

```text
First Name / Last Name          → first_name / last_name
Client Name                     → client_name
Client Status                   → source_status
Return Type                     → return_type / entity_type
Client Street and Apt Address   → address_line_1
Email                           → primary_email
Preparer                        → assigned_staff
```

---

# 5. UltraTax CS

## 客户资料导出的路径

官方路径：

```text
UltraTax CS
  → Utilities
  → Client Listing Reports
  → Select report type
      - General Client Information
      - General Return Information
      - Client Contact
      - Client Communications
      - Status Summary
      - Client ELF Summary
      - etc.
  → Continue
  → Select clients
  → Export
  → Save As
  → Choose file type: Excel 97-2003 Workbook or DIF
  → Optional: Include column headings
  → Save
```

对你的 SaaS，最相关的 report type 通常是：

```text
Client Contact
General Client Information
General Return Information
Client ELF Summary
```

## 适合 SaaS 导入的文件格式

优先级：

```text
1. .xls
2. .dif
```

建议首期优先支持 `.xls`，因为用户能直接用 Excel 打开、检查和另存为 CSV。DIF 可作为兼容格式，但解析成本高于 CSV/XLS。

不建议首期导入器解析：

```text
*.CSD
```

`.CSD` 是 UltraTax CS client data file，不是普通客户清单。

## 客户信息示例

### XLS / 表格内容示例

```csv
Client ID,Client Name,Entity,SSN/EIN,Preparer,Street Address,City,State,ZIP,Phone,Email,Status
1040SMITH,"Smith, John",1040,***-**-6789,JDOE,45 Oak Ave,Denver,CO,80202,303-555-0199,john@example.com,Ready to e-file
1120SABC,ABC LLC,1120S,12-3456789,JDOE,123 Main St,Austin,TX,78701,512-555-0100,owner@example.com,In process
```

### DIF 文件外观示例

DIF 不是 CSV；它更像 spreadsheet interchange 文本结构：

```text
TABLE
0,1
"EXCEL"
VECTORS
0,12
TUPLES
0,3
DATA
0,0
"Client ID"
0,0
"Client Name"
0,0
"Entity"
...
```

### SaaS 字段映射建议

```text
Client ID                       → external_client_id
Client Name                     → client_name
Entity                          → return_type / entity_type
SSN/EIN                         → tin_or_masked_tin
Preparer                        → assigned_staff
Status                          → source_status
```

---

# 6. ProConnect Tax

## 客户资料导出的路径

ProConnect Tax 是 cloud tax software。它没有像 desktop tax software 那样的本地 client file export；对 SaaS 导入更有用的是 Reporting CSV 和 Intuit Link responses CSV。

### 路径 A：Reporting CSV

官方路径：

```text
ProConnect Tax
  → Reporting
  → Download 1040 data / return data
  → Download CSV
```

官方文档说明，该 CSV 包含通过该账号 e-filed 的 federal return data。字段会随 return type 变化，常见 return type 包括：

```text
1040
1065
1120S
1120
1041
990
```

### 路径 B：Intuit Link responses CSV

官方路径：

```text
Intuit Link
  → Locate client
  → Click client name
  → Download responses (.csv file)
```

注意：Intuit Link responses CSV 更像 client questionnaire / organizer responses，不是完整客户主数据。可作为补充导入来源，但不建议作为唯一客户清单来源。

### 路径 C：Intuit Link documents ZIP

```text
Intuit Link
  → Locate client
  → Click client name
  → Download all files (.zip file)
```

documents ZIP 不适合作为截止日提醒 SaaS 的客户清单导入文件，但可用于未来的 document ingestion 功能。

## 适合 SaaS 导入的文件格式

优先级：

```text
1. ProConnect Reporting .csv
2. Intuit Link responses .csv
3. Documents .zip  # 不作为客户主数据导入；仅作为文档导入候选
```

## 客户信息示例

### 1040 reporting CSV 示例

```csv
Taxpayer name,Taxpayer email address,Taxpayer phone number,Street address,City,State,Zip code,Return type,Tax year,Refund,Taxes owed,Preparer
John Smith,john@example.com,303-555-0199,45 Oak Ave,Denver,CO,80202,1040,2025,0,1250,JDOE
```

### Business return reporting CSV 示例

```csv
Business name,Email address,Phone number,Street address,City,State,ZIP code,Return type,Tax year,Signing officer,Preparer
ABC LLC,owner@example.com,512-555-0100,123 Main St,Austin,TX,78701,1120S,2025,John Owner,JDOE
XYZ Partnership,partner@example.com,212-555-0133,77 Market St,New York,NY,10001,1065,2025,Jane Partner,JDOE
```

### Intuit Link responses CSV 示例

```csv
Client Name,Question,Response,Section,Tax Year
John Smith,Did your address change?,No,Personal Information,2025
John Smith,Did you receive Form 1099-NEC?,Yes,Income,2025
John Smith,Do you need an extension?,Yes,Filing,2025
```

### Documents ZIP 示例

```text
Intuit_Link_Documents.zip
  John Smith/
    W-2.pdf
    1099-NEC.pdf
    Driver_License.pdf
```

### SaaS 字段映射建议

```text
Taxpayer name / Business name   → client_name
Taxpayer email address / Email  → primary_email
Taxpayer phone number / Phone   → primary_phone
Return type                     → return_type / entity_type
Tax year                        → tax_year
Preparer                        → assigned_staff
Signing officer                 → business_contact_name
```

---

# 导入器设计建议

## 1. 上传前让用户选择来源软件

建议导入向导第一步：

```text
Where is this file from?
[ CCH Axcess ]
[ CCH ProSystem fx ]
[ Lacerte ]
[ ProSeries ]
[ UltraTax CS ]
[ ProConnect Tax ]
[ Other CSV / Excel ]
```

原因：不同软件的字段名高度不同。用户选择来源后，你可以预加载字段映射规则，减少手动映射。

## 2. 首期必须支持的文件扩展名

```text
.csv
.xlsx
.xls
.dif
```

建议首期不支持或仅提示“不支持”的文件：

```text
.rtnbak
.rctrl
.csd
.dbf
.mdx
.YYi / .YYp / .YYc / .YYs
CLNTBKUP.*
```

## 3. 核心字段标准化模型

你的 SaaS 至少需要把不同软件字段归一到以下 schema：

```text
external_source
external_client_id
client_name
first_name
last_name
business_name
return_type
entity_type
tax_year
fiscal_year_end
tin_last4_or_masked
primary_email
primary_phone
address_line_1
address_line_2
city
state
zip
assigned_staff
source_status
```

## 4. 截止日提醒最关键字段

对报税截止日提醒功能，最关键的是：

```text
return_type / entity_type
tax_year
fiscal_year_end
state
source_status
```

示例映射：

```text
1040   → Individual
1065   → Partnership
1120S  → S corporation
1120   → C corporation
1041   → Fiduciary / trust
990    → Exempt organization
```

## 5. 自动识别规则

可以通过文件名和列名快速判断来源：

```text
EXPORT.CSV + Taxpayer First Name / Taxpayer E-mail Address
  → likely Lacerte

Contacts.csv + HomeBase-like fields
  → likely ProSeries

PortalSaaSClient_*.csv + Client ID / Client Sub-ID / Federal ID
  → likely CCH ProSystem fx or CCH Axcess Portal export

.xls + Client Listing Reports-style columns
  → likely UltraTax CS

CSV with Taxpayer name / Business name / Refund / Taxes owed
  → likely ProConnect Reporting
```

---

# 参考资料

1. CCH Axcess — export client list to Microsoft Excel: https://support.cch.com/kb/solution.aspx/How-do-I-export-a-client-list-from-CCH-Axcess-to-Microsoft-Excel
2. CCH ProSystem fx — Creating a Client List for Portal: https://z001download.cchaxcess.com/pfxbrowserhelpOP/FAMHelp/Content/Utilities/UL_ClientList_forPortal.htm
3. TaxDome — Export your client list from your current software: https://help.taxdome.com/article/121-how-to-export-your-client-list-from-your-current-software
4. Intuit Lacerte — Exporting the Lacerte client list to a spreadsheet file: https://accountants.intuit.com/support/en-us/help-article/customer-list/exporting-lacerte-client-list-spreadsheet-file/L5AqDOOm0_US_en_US
5. Intuit ProSeries — Managing your client list with HomeBase in ProSeries Professional: https://accountants.intuit.com/support/en-us/help-article/customer-list/managing-client-list-homebase-proseries/L3IBnjbZi_US_en_US
6. Thomson Reuters UltraTax CS — Export client listing reports from UltraTax CS: https://www.thomsonreuters.com/en-us/help/ultratax-cs/clients/export-client-listing-reports-from-ultratax-cs
7. Intuit ProConnect Tax — Create and export client reports in ProConnect Tax: https://accountants.intuit.com/support/en-us/help-article/tax-reports/create-export-client-reports-proconnect-tax/L4bCdLsWS_US_en_US
8. Intuit Link — Download client responses and documents: https://accountants.intuit.com/support/en-us/help-article/import-export-data-files/download-client-responses-documents-intuit-link/L0R4qdsuP_US_en_US
