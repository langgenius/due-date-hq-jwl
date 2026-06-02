import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const requireFromApp = createRequire(new URL('../apps/app/package.json', import.meta.url))
const { zipSync } = requireFromApp('fflate')

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(
  rootDir,
  'docs/product-design/migration-copilot/06-fixtures/realistic-exports',
)
const encoder = new TextEncoder()

mkdirSync(outputDir, { recursive: true })

const sourceRows = [
  [
    'Marin Harbor Analytics LLC (TEST)',
    'LLC',
    '1065',
    'CA',
    'Los Angeles',
    '90012',
    'Los Angeles',
    'Jordan',
    'Park',
    'JDOE',
    'In Progress',
  ],
  [
    'Hudson Ledger Partners LP (TEST)',
    'Partnership',
    '1065',
    'NY',
    'New York',
    '10018',
    'New York',
    'Riley',
    'Chen',
    'RCHEN',
    'Waiting on client',
  ],
  [
    'Austin Foundry Inc (TEST)',
    'C-Corp',
    '1120',
    'TX',
    'Austin',
    '78701',
    'Travis',
    'Morgan',
    'Lee',
    'MLEE',
    'Ready for review',
  ],
  [
    'Bayview Stone Household (TEST)',
    'Individual',
    '1040',
    'FL',
    'Miami',
    '33131',
    'Miami-Dade',
    'Taylor',
    'Kim',
    'TKIM',
    'Organizer sent',
  ],
  [
    'Cascade Orchard LLC (TEST)',
    'LLC',
    '1065',
    'WA',
    'Seattle',
    '98101',
    'King',
    'Parker',
    'Vu',
    'PVU',
    'Open items',
  ],
  [
    'Prairie Oak Trust (TEST)',
    'Trust',
    '1041',
    'IL',
    'Chicago',
    '60603',
    'Cook',
    'Sam',
    'Rivera',
    'SRIVERA',
    'Extension filed',
  ],
  [
    'Golden Gate Studio (TEST)',
    'Sole Proprietor',
    'Schedule C',
    'CA',
    'San Francisco',
    '94105',
    'San Francisco',
    'Alex',
    'Nguyen',
    'ANGUYEN',
    'Needs bookkeeping',
  ],
  [
    'Brooklyn Outreach Foundation (TEST)',
    'Nonprofit',
    '990',
    'NY',
    'Brooklyn',
    '11201',
    'Kings',
    'Casey',
    'Brooks',
    'CBROOKS',
    'Board review',
  ],
  [
    'Hill Country Advisors LLC (TEST)',
    'LLC',
    '1065',
    'TX',
    'San Antonio',
    '78205',
    'Bexar',
    'Jamie',
    'Patel',
    'JPATEL',
    'In progress',
  ],
  [
    'Palm River Dental PC (TEST)',
    'S-Corp',
    '1120S',
    'FL',
    'Tampa',
    '33602',
    'Hillsborough',
    'Avery',
    'Stone',
    'ASTONE',
    'Ready for e-file',
  ],
  [
    'Puget Sound Robotics Inc (TEST)',
    'C-Corp',
    '1120',
    'WA',
    'Bellevue',
    '98004',
    'King',
    'Drew',
    'Morris',
    'DMORRIS',
    'R&D credit review',
  ],
  [
    'Lincoln Park Household (TEST)',
    'Individual',
    '1040',
    'IL',
    'Evanston',
    '60201',
    'Cook',
    'Quinn',
    'Reed',
    'QREED',
    'Missing K-1',
  ],
  [
    'Silicon Coast Ventures LP (TEST)',
    'Partnership',
    '1065',
    'CA',
    'Palo Alto',
    '94301',
    'Santa Clara',
    'Hayden',
    'Flores',
    'HFLORES',
    'Partner capital review',
  ],
  [
    'Rochester Maple Trust (TEST)',
    'Trust',
    '1041',
    'NY',
    'Rochester',
    '14604',
    'Monroe',
    'Rowan',
    'Foster',
    'RFOSTER',
    'Beneficiary update',
  ],
  [
    'Dallas Market Studio (TEST)',
    'Sole Proprietor',
    'Schedule C',
    'TX',
    'Dallas',
    '75201',
    'Dallas',
    'Emerson',
    'Gray',
    'EGRAY',
    'Mileage log pending',
  ],
  [
    'Orlando Harbor LLC (TEST)',
    'LLC',
    '1065',
    'FL',
    'Orlando',
    '32801',
    'Orange',
    'Harper',
    'Miles',
    'HMILES',
    'Multi-member LLC',
  ],
  [
    'Spokane Design Group Inc (TEST)',
    'S-Corp',
    '1120S',
    'WA',
    'Spokane',
    '99201',
    'Spokane',
    'Finley',
    'Cooper',
    'FCOOPER',
    'Payroll tie-out',
  ],
  [
    'River North Supply Inc (TEST)',
    'C-Corp',
    '1120',
    'IL',
    'Naperville',
    '60540',
    'DuPage',
    'Reese',
    'Bennett',
    'RBENNETT',
    'Inventory review',
  ],
  [
    'North Star Clinic LLC (TEST)',
    'LLC',
    '1065',
    '',
    'Remote',
    '00000',
    '',
    'Sloane',
    'Carter',
    'SCARTER',
    'Review: missing filing state',
  ],
  [
    'Pacific Crest Therapy Inc (TEST)',
    'S-Corp',
    '1120S',
    'C.A.',
    'Irvine',
    '92614',
    'Orange',
    'Dakota',
    'Price',
    'DPRICE',
    'Review: state exported as C.A.',
  ],
  [
    'Queensboro Catering LP (TEST)',
    'Partnership',
    '1065',
    'NY',
    'Queens',
    '11101',
    'Queens',
    'Skyler',
    'Ward',
    'SWARD',
    'Owner basis review',
  ],
  [
    'Fort Worth Household (TEST)',
    'Individual',
    '1040',
    'TX',
    'Fort Worth',
    '76102',
    'Tarrant',
    'Blake',
    'Young',
    'BYOUNG',
    'Schedule E rental',
  ],
  [
    'Sarasota Family Trust (TEST)',
    'Trust',
    '1041',
    'FL',
    'Sarasota',
    '34236',
    'Sarasota',
    'Kai',
    'Bell',
    'KBELL',
    'Estimated tax review',
  ],
  [
    'Tacoma Arts Alliance (TEST)',
    'Nonprofit',
    '990',
    'WA',
    'Tacoma',
    '98402',
    'Pierce',
    'Lane',
    'Diaz',
    'LDIAZ',
    'Grant schedule review',
  ],
]

const clients = sourceRows.map((row, index) => {
  const [
    name,
    entity,
    returnType,
    state,
    city,
    zip,
    county,
    firstName,
    lastName,
    staffCode,
    note,
  ] = row
  const id = index + 1
  const email = `test+realistic${String(id).padStart(3, '0')}@example.com`
  return {
    id,
    accountId: `TD-${String(1000 + id)}`,
    axcessGuid: `AX-${String(900000 + id)}`,
    clientId: `CL-${String(2000 + id)}`,
    clientNumber: String(5000 + id),
    contactKey: `KCON-${String(3000 + id)}`,
    customerRef: `QB-${String(4000 + id)}`,
    ein: `99-${String(1000000 + id).padStart(7, '0')}`,
    name,
    entity,
    returnType,
    formLabel: taxFormLabel(returnType),
    state,
    city,
    zip,
    county,
    firstName,
    lastName,
    contactName: `${firstName} ${lastName}`,
    staffCode,
    partner: partnerFor(index),
    manager: managerFor(index),
    preparer: staffCode,
    email,
    phone: `555-01${String(id).padStart(2, '0')}`,
    address: `${1000 + id} Ledger Lane`,
    terms: id % 3 === 0 ? 'Due on receipt' : id % 2 === 0 ? 'Net 15' : 'Net 30',
    customerType: returnType === '1040' ? 'Individual' : entity,
    balance: (id % 5 === 0 ? 0 : 250 + id * 37).toFixed(2),
    taxYear: '2025',
    dueDate: dueDateFor(returnType),
    note,
  }
})

writeTaxDome()
writeDrake()
writeKarbon()
writeQuickBooksOnline()
writeQuickBooksDesktopIif()
writeFileInTime()
writeCchAxcess()
writeCchProSystemFx()
writeLacerte()
writeProSeries()
writeUltraTax()
writeProConnect()
writeUnsupportedSamples()

console.log(`Generated ${clients.length} realistic client rows into ${outputDir}`)

function writeTaxDome() {
  const accountHeaders = [
    'Account ID',
    'Account name',
    'State',
    'Type',
    'Total bills',
    'Credit',
    'Assigned team members',
    'Tags',
    'Last login',
    'Created date',
    'Updated date',
    'Active jobs',
    'Active tasks',
    'Timezone',
    'Custom field - Entity type',
    'Custom field - Tax return type',
    'Custom field - Filing state',
    'Custom field - Federal ID',
    'Linked contact #1',
    'Notes',
  ]
  const accountRows = clients.map((client) => ({
    'Account ID': client.accountId,
    'Account name': client.name,
    State: 'Active',
    Type: taxDomeAccountType(client),
    'Total bills': client.balance,
    Credit: client.id % 7 === 0 ? '50.00' : '0.00',
    'Assigned team members': `${client.preparer}; ${client.manager}`,
    Tags: `${client.returnType};${client.state || 'MISSING-STATE'}`,
    'Last login': client.id % 4 === 0 ? '' : '05/20/2026',
    'Created date': '01/15/2024',
    'Updated date': '05/25/2026',
    'Active jobs': client.id % 3 === 0 ? '2' : '1',
    'Active tasks': client.id % 4 === 0 ? '4' : '2',
    Timezone: 'America/New_York',
    'Custom field - Entity type': client.entity,
    'Custom field - Tax return type': client.formLabel,
    'Custom field - Filing state': client.state,
    'Custom field - Federal ID': client.ein,
    'Linked contact #1': client.contactName,
    Notes: client.note,
  }))

  const contactHeaders = [
    'Contact name',
    'First name',
    'Last name',
    'Phone number',
    'Company name',
    'Street address',
    'City',
    'State/Province',
    'Country',
    'Zip code',
    'Email address',
    'Tags',
    'Timezone',
    'Linked account #1',
    'Notes',
  ]
  const contactRows = clients.map((client) => ({
    'Contact name': client.contactName,
    'First name': client.firstName,
    'Last name': client.lastName,
    'Phone number': client.phone,
    'Company name': client.name,
    'Street address': client.address,
    City: client.city,
    'State/Province': client.state,
    Country: 'United States',
    'Zip code': client.zip,
    'Email address': client.email,
    Tags: 'primary contact',
    Timezone: 'America/New_York',
    'Linked account #1': client.name,
    Notes: client.note,
  }))

  writeZip('taxdome-client-export.zip', {
    'accounts.csv': csv(accountHeaders, accountRows),
    'contacts.csv': csv(contactHeaders, contactRows),
  })
}

function writeDrake() {
  const headers = [
    'Client ID',
    'Name',
    'EIN',
    'Entity',
    'State',
    'Return Type',
    'EF Status',
    'Staff',
    'Email',
    'Phone',
    'Address',
    'City',
    'ZIP',
    'Notes',
  ]
  writeText(
    'drake-client-ef-export.csv',
    csv(
      headers,
      clients.map((client) => ({
        'Client ID': `D${client.clientNumber}`,
        Name: client.name,
        EIN: client.ein,
        Entity: client.entity,
        State: client.state,
        'Return Type': client.formLabel,
        'EF Status': efStatusFor(client, 'drake'),
        Staff: client.preparer,
        Email: client.email,
        Phone: client.phone,
        Address: client.address,
        City: client.city,
        ZIP: client.zip,
        Notes: client.note,
      })),
    ),
  )
}

function writeKarbon() {
  const headers = [
    'ContactKey',
    'OrganizationKey',
    'Organization Name',
    'Contact Name',
    'Contact Email',
    'Client Owner',
    'Contact Type',
    'Tax ID',
    'Country',
    'State',
    'Tags',
    'Notes',
  ]
  writeXlsx(
    'karbon-all-contacts.xlsx',
    'All contacts',
    headers,
    clients.map((client) => ({
      ContactKey: client.contactKey,
      OrganizationKey: `KORG-${client.clientNumber}`,
      'Organization Name': client.name,
      'Contact Name': client.contactName,
      'Contact Email': client.email,
      'Client Owner': client.manager,
      'Contact Type': client.entity === 'Individual' ? 'Person' : 'Organization',
      'Tax ID': client.ein,
      Country: 'United States',
      State: client.state,
      Tags: `${client.returnType}; ${workflowStatusFor(client)}`,
      Notes: client.note,
    })),
  )
}

function writeQuickBooksOnline() {
  const headers = [
    'Customer',
    'Customer Type',
    'Company Name',
    'Full Name',
    'Billing Street',
    'Billing City',
    'Billing State',
    'Billing ZIP',
    'Phone',
    'Email',
    'Terms',
    'Open Balance',
    'Tax Registration No.',
    'Notes',
  ]
  writeXlsx(
    'quickbooks-online-customer-contact-list.xlsx',
    'Customer Contact List',
    headers,
    clients.map((client) => ({
      Customer: client.name,
      'Customer Type': client.customerType,
      'Company Name': client.name,
      'Full Name': client.contactName,
      'Billing Street': client.address,
      'Billing City': client.city,
      'Billing State': client.state,
      'Billing ZIP': client.zip,
      Phone: client.phone,
      Email: client.email,
      Terms: client.terms,
      'Open Balance': client.balance,
      'Tax Registration No.': client.ein,
      Notes: client.note,
    })),
  )
}

function writeQuickBooksDesktopIif() {
  const headers = [
    '!CUST',
    'NAME',
    'REFNUM',
    'BADDR1',
    'BADDR2',
    'BADDR3',
    'PHONE1',
    'PHONE2',
    'EMAIL',
    'CUSTFLD1',
    'NOTE',
  ]
  const rows = clients.map((client) =>
    [
      'CUST',
      client.name,
      client.customerRef,
      client.name,
      client.address,
      `${client.city}, ${client.state} ${client.zip}`,
      client.phone,
      '',
      client.email,
      client.customerType,
      client.note,
    ].join('\t'),
  )
  writeText('quickbooks-desktop-customers.iif', `${headers.join('\t')}\n${rows.join('\n')}\n`)
}

function writeFileInTime() {
  const headers = [
    'ClientName',
    'Service',
    'DueDate',
    'Status',
    'AssignedStaff',
    'Entity',
    'State',
    'County',
    'Email',
    'Phone',
    'Notes',
  ]
  writeText(
    'file-in-time-client-information.txt',
    tsv(
      headers,
      clients.map((client) => ({
        ClientName: client.name,
        Service: client.formLabel,
        DueDate: client.dueDate,
        Status: workflowStatusFor(client),
        AssignedStaff: client.preparer,
        Entity: client.entity,
        State: client.state,
        County: client.county,
        Email: client.email,
        Phone: client.phone,
        Notes: client.note,
      })),
    ),
  )
}

function writeCchAxcess() {
  const headers = [
    'Client GUID',
    'Client ID',
    'Client Sub-ID',
    'Name Line 1',
    'Federal ID',
    'Entity',
    'Return Type',
    'Address Line 1',
    'City',
    'State',
    'ZIP',
    'Responsible Staff',
    'Office',
    'Business Unit',
    'Email Address',
    'Phone',
    'Status',
  ]
  writeText(
    'cch-axcess-client-manager-grid.csv',
    csv(
      headers,
      clients.map((client) => ({
        'Client GUID': client.axcessGuid,
        'Client ID': client.clientNumber,
        'Client Sub-ID': '00',
        'Name Line 1': client.name,
        'Federal ID': client.ein,
        Entity: client.entity,
        'Return Type': client.formLabel,
        'Address Line 1': client.address,
        City: client.city,
        State: client.state,
        ZIP: client.zip,
        'Responsible Staff': client.preparer,
        Office: officeFor(client),
        'Business Unit': 'Tax',
        'Email Address': client.email,
        Phone: client.phone,
        Status: workflowStatusFor(client),
      })),
    ),
  )
}

function writeCchProSystemFx() {
  const headers = [
    'Client ID',
    'Client Sub-ID',
    'Name Line 1',
    'Partner',
    'Manager',
    'Preparer',
    'Federal ID',
    'Entity',
    'Return Type',
    'Address 1',
    'City',
    'State',
    'Zip',
    'Email',
    'Phone',
    'Status',
  ]
  writeText(
    'PortalSaaSClient_20260525_093000.csv',
    csv(
      headers,
      clients.map((client) => ({
        'Client ID': client.clientNumber,
        'Client Sub-ID': '00',
        'Name Line 1': client.name,
        Partner: client.partner,
        Manager: client.manager,
        Preparer: client.preparer,
        'Federal ID': client.ein,
        Entity: client.entity,
        'Return Type': client.formLabel,
        'Address 1': client.address,
        City: client.city,
        State: client.state,
        Zip: client.zip,
        Email: client.email,
        Phone: client.phone,
        Status: workflowStatusFor(client),
      })),
    ),
  )
}

function writeLacerte() {
  const headers = [
    'Client Number',
    'Client Name',
    'Taxpayer E-mail Address',
    'Spouse E-mail Address',
    'Taxpayer Phone Number',
    'Street Address',
    'City',
    'State',
    'Zip Code',
    'SSN/EIN',
    'Entity Type',
    'Return Type',
    'Preparer',
    'Status',
  ]
  writeText(
    'EXPORT.CSV',
    csv(
      headers,
      clients.map((client) => ({
        'Client Number': client.clientNumber,
        'Client Name': client.name,
        'Taxpayer E-mail Address': client.email,
        'Spouse E-mail Address': '',
        'Taxpayer Phone Number': client.phone,
        'Street Address': client.address,
        City: client.city,
        State: client.state,
        'Zip Code': client.zip,
        'SSN/EIN': client.ein,
        'Entity Type': client.entity,
        'Return Type': client.formLabel,
        Preparer: client.preparer,
        Status: workflowStatusFor(client),
      })),
    ),
  )
}

function writeProSeries() {
  const headers = [
    'Client Name',
    'Client Status',
    'Client Street and Apt Address',
    'Client City',
    'Client State',
    'Client ZIP Code',
    'Client Phone',
    'Client Email Address',
    'Client SSN/EIN',
    'Return Type',
    'HomeBase View',
    'Preparer',
    'EF Status',
    'Notes',
  ]
  writeText(
    'Contacts.csv',
    csv(
      headers,
      clients.map((client) => ({
        'Client Name': client.name,
        'Client Status': workflowStatusFor(client),
        'Client Street and Apt Address': client.address,
        'Client City': client.city,
        'Client State': client.state,
        'Client ZIP Code': client.zip,
        'Client Phone': client.phone,
        'Client Email Address': client.email,
        'Client SSN/EIN': client.ein,
        'Return Type': client.formLabel,
        'HomeBase View': 'Current Year',
        Preparer: client.preparer,
        'EF Status': efStatusFor(client, 'proseries'),
        Notes: client.note,
      })),
    ),
  )
}

function writeUltraTax() {
  const headers = [
    'Client ID',
    'Client Name',
    'Entity',
    'SSN/EIN',
    'Address',
    'City',
    'State',
    'Zip',
    'Preparer',
    'Status',
    'Email',
    'Phone',
    'Federal Product',
    'State Product',
    'Fiscal Year End',
  ]
  writeText(
    'ultratax-client-listing-report.csv',
    csv(
      headers,
      clients.map((client) => ({
        'Client ID': client.clientNumber,
        'Client Name': client.name,
        Entity: client.returnType,
        'SSN/EIN': client.ein,
        Address: client.address,
        City: client.city,
        State: client.state,
        Zip: client.zip,
        Preparer: client.preparer,
        Status: workflowStatusFor(client),
        Email: client.email,
        Phone: client.phone,
        'Federal Product': client.formLabel,
        'State Product': client.state ? `${client.state} ${client.formLabel}` : '',
        'Fiscal Year End': '12/31',
      })),
    ),
  )
}

function writeProConnect() {
  const headers = [
    'Tax year',
    'Taxpayer name',
    'Taxpayer email address',
    'Taxpayer phone number',
    'Business name',
    'Signing officer',
    'Street address',
    'City',
    'State',
    'ZIP',
    'Return type',
    'Return status',
    'Preparer',
    'Total tax',
    'Taxes owed',
  ]
  writeText(
    'proconnect-return-data-2025.csv',
    csv(
      headers,
      clients.map((client) => ({
        'Tax year': client.taxYear,
        'Taxpayer name': client.returnType === '1040' ? client.contactName : client.name,
        'Taxpayer email address': client.email,
        'Taxpayer phone number': client.phone,
        'Business name': client.returnType === '1040' ? '' : client.name,
        'Signing officer': client.contactName,
        'Street address': client.address,
        City: client.city,
        State: client.state,
        ZIP: client.zip,
        'Return type': client.formLabel,
        'Return status': workflowStatusFor(client),
        Preparer: client.preparer,
        'Total tax': (1000 + client.id * 185).toFixed(2),
        'Taxes owed': (client.id % 4 === 0 ? 0 : 75 + client.id * 11).toFixed(2),
      })),
    ),
  )
}

function writeUnsupportedSamples() {
  writeText(
    'ultratax-client-listing-report.dif',
    [
      'TABLE',
      '0,1',
      '"EXCEL"',
      'VECTORS',
      '0,3',
      'TUPLES',
      '0,2',
      'DATA',
      '0,0',
      '"UltraTax Client Listing Report (TEST)"',
      'EOD',
    ].join('\n'),
  )
  writeBinary(
    'file-in-time-backup.fbk',
    Uint8Array.from([0x46, 0x49, 0x54, 0x2d, 0x46, 0x42, 0x4b, 0x00, 0x54, 0x45, 0x53, 0x54, 0x00]),
  )
}

function csv(headers, rows) {
  return `${[headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')}\r\n`
}

function tsv(headers, rows) {
  return `${[headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))]
    .map((row) => row.map((cell) => String(cell ?? '').replaceAll('\t', ' ')).join('\t'))
    .join('\n')}\n`
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function writeText(fileName, content) {
  writeFileSync(join(outputDir, fileName), content)
}

function writeBinary(fileName, bytes) {
  writeFileSync(join(outputDir, fileName), bytes)
}

function writeZip(fileName, entries) {
  const zipped = zipSync(
    Object.fromEntries(Object.entries(entries).map(([name, content]) => [name, u8(content)])),
    { level: 6 },
  )
  writeBinary(fileName, zipped)
}

function writeXlsx(fileName, sheetName, headers, rows) {
  const rowArrays = rows.map((row) => headers.map((header) => row[header] ?? ''))
  const shared = []
  const sharedIndex = new Map()
  const count = (rowArrays.length + 1) * headers.length
  const indexFor = (value) => {
    const text = String(value ?? '')
    const existing = sharedIndex.get(text)
    if (existing !== undefined) return existing
    const index = shared.length
    shared.push(text)
    sharedIndex.set(text, index)
    return index
  }
  const sheetRows = [headers, ...rowArrays].map((row, rowIndex) => {
    const cells = row
      .map((cell, cellIndex) => {
        const ref = `${columnName(cellIndex)}${rowIndex + 1}`
        return `<c r="${ref}" t="s"><v>${indexFor(cell)}</v></c>`
      })
      .join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  })

  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${xml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'
  const sheetXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="A1:${columnName(headers.length - 1)}${rowArrays.length + 1}"/>` +
    `<sheetData>${sheetRows.join('')}</sheetData>` +
    '</worksheet>'
  const sharedStringsXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}" uniqueCount="${shared.length}">` +
    shared.map((value) => `<si><t>${xml(value)}</t></si>`).join('') +
    '</sst>'

  writeBinary(
    fileName,
    zipSync(
      {
        '[Content_Types].xml': u8(
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
            '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
            '</Types>',
        ),
        '_rels/.rels': u8(
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
            '</Relationships>',
        ),
        'xl/workbook.xml': u8(workbookXml),
        'xl/_rels/workbook.xml.rels': u8(
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
            '</Relationships>',
        ),
        'xl/worksheets/sheet1.xml': u8(sheetXml),
        'xl/sharedStrings.xml': u8(sharedStringsXml),
      },
      { level: 6 },
    ),
  )
}

function u8(value) {
  return encoder.encode(value)
}

function xml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function columnName(index) {
  let result = ''
  let current = index + 1
  while (current > 0) {
    const remainder = (current - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    current = Math.floor((current - 1) / 26)
  }
  return result
}

function taxFormLabel(returnType) {
  switch (returnType) {
    case '1065':
      return 'Form 1065'
    case '1120S':
      return 'Form 1120-S'
    case '1120':
      return 'Form 1120'
    case '1040':
      return 'Form 1040'
    case '1041':
      return 'Form 1041'
    case '990':
      return 'Form 990'
    case 'Schedule C':
      return 'Schedule C'
    default:
      return returnType
  }
}

function dueDateFor(returnType) {
  switch (returnType) {
    case '1065':
    case '1120S':
      return '09/15/2026'
    case '1041':
      // Trusts get a 5.5-month extension (no Oct 15 like 1040/1120).
      return '09/30/2026'
    case '990':
      return '11/16/2026'
    default:
      return '10/15/2026'
  }
}

function taxDomeAccountType(client) {
  if (client.returnType === '1040') return 'Individual'
  if (client.returnType === '1041') return 'Other'
  return 'Company'
}

function partnerFor(index) {
  return ['P-ALVAREZ', 'P-BENNETT', 'P-CHEN'][index % 3]
}

function managerFor(index) {
  return ['M-LEE', 'M-PARK', 'M-RIVERA', 'M-STONE'][index % 4]
}

function officeFor(client) {
  if (client.state === 'NY' || client.state === 'IL') return 'East'
  if (client.state === 'CA' || client.state === 'WA' || client.state === 'C.A.') return 'West'
  if (client.state === 'TX' || client.state === 'FL') return 'South'
  return 'Unassigned'
}

// Practice-workflow status values that real practice-management / tax tools
// expose in a "Status" column. Deterministic by client id so output is stable.
function workflowStatusFor(client) {
  const statuses = [
    'In Progress',
    'Ready for Review',
    'On Extension',
    'Waiting on Client',
    'Complete',
    'Not Started',
  ]
  return statuses[client.id % statuses.length]
}

// Real e-file acknowledgement statuses (NOT workflow notes). Drake also shows
// single-letter ACK codes (A/P/R) in some views; spelled-out forms are used
// here for readability. ProSeries surfaces its own transmit/ack vocabulary.
function efStatusFor(client, vendor) {
  const drake = ['Accepted', 'Accepted', 'Pending', 'Rejected', 'Not transmitted']
  const proSeries = [
    'Accepted',
    'Accepted',
    'Ready to transmit',
    'Sent to Intuit',
    'Rejected',
    'Not ready',
  ]
  const set = vendor === 'proseries' ? proSeries : drake
  return set[client.id % set.length]
}
