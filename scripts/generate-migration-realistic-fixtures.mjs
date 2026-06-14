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
    'Individual',
    '1040',
    'CA',
    'San Francisco',
    '94105',
    'San Francisco',
    'Alex',
    'Nguyen',
    'ANGUYEN',
    'Sole-proprietor Schedule C',
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
    'Individual',
    '1040',
    'TX',
    'Dallas',
    '75201',
    'Dallas',
    'Emerson',
    'Gray',
    'EGRAY',
    'Sole-proprietor Schedule C',
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
    'CO',
    'Denver',
    '80202',
    'Denver',
    'Sloane',
    'Carter',
    'SCARTER',
    'Quarterly estimates',
  ],
  [
    'Pacific Crest Therapy Inc (TEST)',
    'S-Corp',
    '1120S',
    'CA',
    'Irvine',
    '92614',
    'Orange',
    'Dakota',
    'Price',
    'DPRICE',
    'Officer comp review',
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
  const [name, entity, returnType, state, city, zip, county, firstName, lastName, staffCode, note] =
    row
  const id = index + 1
  const email = `test+realistic${String(id).padStart(3, '0')}@example.com`
  return {
    id,
    // QuickBooks Desktop assigns REFNUM as an internal sequential integer.
    refNum: id,
    // TaxDome account IDs are 1-2 name initials + a uniquifying number (e.g. MH1).
    accountId: taxDomeAccountId(name, id),
    // Karbon keys are opaque alphanumeric strings, not human-readable codes.
    karbonKey: karbonKey(id),
    // CCH ProSystem fx Portal client lists carry a mandatory 36-char Client GUID.
    clientGuid: clientGuid(id),
    clientNumber: String(5000 + id),
    ein: `99-${String(1000000 + id).padStart(7, '0')}`,
    name,
    entity,
    returnType,
    state,
    city,
    zip,
    county,
    firstName,
    lastName,
    contactName: `${firstName} ${lastName}`,
    // Real exports show preparer/staff as named people, not login codes.
    preparer: staffName(staffCode),
    manager: managerName(index),
    email,
    phone: `555-01${String(id).padStart(2, '0')}`,
    address: `${1000 + id} Ledger Lane`,
    terms: id % 3 === 0 ? 'Due on receipt' : id % 2 === 0 ? 'Net 15' : 'Net 30',
    customerType: returnType === '1040' ? 'Individual' : entity,
    balance: (id % 5 === 0 ? 0 : 250 + id * 37).toFixed(2),
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
  // TaxDome's account export lists custom CRM fields as their own columns (no
  // "Custom field - " prefix) and reports counts for jobs/tasks/proposals/
  // organizers plus account roles. Status uses the activation vocabulary.
  const accountHeaders = [
    'Account ID',
    'Account name',
    'Status',
    'Type',
    'Tags',
    'Assigned team members',
    'Active jobs',
    'Active tasks',
    'Active proposals',
    'Active organizers',
    'Account roles',
    'Created date',
    'Updated date',
    'Entity type',
    'Tax return type',
    'Filing state',
    'Federal ID',
    'Linked contact #1',
  ]
  const accountRows = clients.map((client) => ({
    'Account ID': client.accountId,
    'Account name': client.name,
    Status: client.id % 6 === 0 ? 'Pending activation' : 'Activated',
    Type: taxDomeAccountType(client),
    Tags: `${client.returnType}; ${client.state}`,
    'Assigned team members': `${client.preparer}; ${client.manager}`,
    'Active jobs': client.id % 3 === 0 ? '2' : '1',
    'Active tasks': client.id % 4 === 0 ? '4' : '2',
    'Active proposals': client.id % 5 === 0 ? '1' : '0',
    'Active organizers': client.id % 2 === 0 ? '1' : '0',
    'Account roles': `Account Manager: ${client.manager}; Preparer: ${client.preparer}`,
    'Created date': '01/15/2024',
    'Updated date': '05/25/2026',
    'Entity type': client.entity,
    'Tax return type': client.returnType,
    'Filing state': client.state,
    'Federal ID': client.ein,
    'Linked contact #1': client.contactName,
  }))

  const contactHeaders = [
    'Contact name',
    'First name',
    'Middle name',
    'Last name',
    'Phone number',
    'Company name',
    'Street address',
    'City',
    'State/Province',
    'Country',
    'Zip code',
    'Email address',
    'Timezone',
    'Created date',
    'Updated date',
    'Linked account #1',
  ]
  const contactRows = clients.map((client) => ({
    'Contact name': client.contactName,
    'First name': client.firstName,
    'Middle name': '',
    'Last name': client.lastName,
    'Phone number': client.phone,
    'Company name': client.name,
    'Street address': client.address,
    City: client.city,
    'State/Province': client.state,
    Country: 'United States',
    'Zip code': client.zip,
    'Email address': client.email,
    Timezone: 'America/New_York',
    'Created date': '01/15/2024',
    'Updated date': '05/25/2026',
    'Linked account #1': client.name,
  }))

  writeZip('taxdome-client-export.zip', {
    'accounts.csv': csv(accountHeaders, accountRows),
    'contacts.csv': csv(contactHeaders, contactRows),
  })
}

function writeDrake() {
  // Drake's "Export Client/EF Data" client export keys clients by SSN/EIN
  // (no alphanumeric client ID), labels staff "Preparer", and shows return
  // types as bare form numbers. EF acknowledgement data is a separate export.
  const headers = [
    'Client Name',
    'SSN/EIN',
    'Return Type',
    'State',
    'Preparer',
    'Email',
    'Phone',
    'Street Address',
    'City',
    'ZIP',
  ]
  writeText(
    'drake-client-ef-export.csv',
    csv(
      headers,
      clients.map((client) => ({
        'Client Name': client.name,
        'SSN/EIN': client.ein,
        'Return Type': client.returnType,
        State: client.state,
        Preparer: client.preparer,
        Email: client.email,
        Phone: client.phone,
        'Street Address': client.address,
        City: client.city,
        ZIP: client.zip,
      })),
    ),
  )
}

function writeKarbon() {
  // Karbon's self-serve contact export keys each row by an opaque key and uses
  // colleague full names for Client Owner / Client Manager. Tax identifiers and
  // accounting details are NOT in this export (they require a Support request),
  // and Karbon has no contact "tags"/notes-status columns. Real export is CSV;
  // we keep .xlsx to retain xlsx-parser coverage (Karbon also surfaces
  // spreadsheet downloads) — documented in the fixtures README.
  const headers = [
    'Key',
    'Contact Type',
    'Full Name',
    'First Name',
    'Last Name',
    'Entity Type',
    'Client Owner',
    'Client Manager',
    'Email',
    'Phone',
    'Street',
    'City',
    'State',
    'Postal Code',
    'Country',
  ]
  writeXlsx(
    'karbon-all-contacts.xlsx',
    'All contacts',
    headers,
    clients.map((client) => ({
      Key: client.karbonKey,
      'Contact Type': 'Client',
      'Full Name': client.contactName,
      'First Name': client.firstName,
      'Last Name': client.lastName,
      'Entity Type': client.entity,
      'Client Owner': client.preparer,
      'Client Manager': client.manager,
      Email: client.email,
      Phone: client.phone,
      Street: client.address,
      City: client.city,
      State: client.state,
      'Postal Code': client.zip,
      Country: 'United States',
    })),
  )
}

function writeQuickBooksOnline() {
  // QuickBooks Online's US "Customer Contact List" report exports a single
  // "Billing Address" column and labels phones "Phone Numbers"; "Tax
  // Registration No." is a VAT-region (non-US) field and does not appear.
  // A raw export has company/title rows above the headings that users are told
  // to delete — we start at the heading row (the app parses row 1 as headers).
  const headers = [
    'Customer',
    'Customer Type',
    'Full Name',
    'Billing Address',
    'Phone Numbers',
    'Email',
    'Terms',
    'Open Balance',
  ]
  writeXlsx(
    'quickbooks-online-customer-contact-list.xlsx',
    'Customer Contact List',
    headers,
    clients.map((client) => ({
      Customer: client.name,
      'Customer Type': client.customerType,
      'Full Name': client.contactName,
      'Billing Address': `${client.address}, ${client.city}, ${client.state} ${client.zip}`,
      'Phone Numbers': client.phone,
      Email: client.email,
      Terms: client.terms,
      'Open Balance': client.balance,
    })),
  )
}

function writeQuickBooksDesktopIif() {
  // A real "Lists to IIF Files" export opens with an !HDR section identifying
  // the QuickBooks product, and the !CUST header is the full fixed field set.
  // REFNUM is QuickBooks' internal sequential integer; customer notes export in
  // NOTEPAD (NOTE is a vendor field) and the customer type lives in CTYPE.
  const hdr = [
    '!HDR\tPROD\tVER\tREL\tIIFVER\tDATE\tTIME\tACCNTNT\tACCNTNTSPLITTIME',
    'HDR\tQuickBooks Desktop\tVersion 33.0\tRelease R5P\t1\t05/25/2026\t1450\tN\t0',
  ]
  const headers = [
    '!CUST',
    'NAME',
    'REFNUM',
    'TIMESTAMP',
    'BADDR1',
    'BADDR2',
    'BADDR3',
    'BADDR4',
    'BADDR5',
    'PHONE1',
    'PHONE2',
    'FAXNUM',
    'EMAIL',
    'CONT1',
    'CTYPE',
    'TERMS',
    'NOTEPAD',
    'COMPANYNAME',
    'FIRSTNAME',
    'LASTNAME',
  ]
  const rows = clients.map((client) =>
    [
      'CUST',
      client.name,
      String(client.refNum),
      String(1716600000 + client.id * 137),
      client.name,
      client.address,
      `${client.city}, ${client.state} ${client.zip}`,
      '',
      '',
      client.phone,
      '',
      '',
      client.email,
      client.contactName,
      client.customerType,
      client.terms,
      client.note,
      client.name,
      client.firstName,
      client.lastName,
    ].join('\t'),
  )
  writeText(
    'quickbooks-desktop-customers.iif',
    `${hdr.join('\n')}\n${headers.join('\t')}\n${rows.join('\n')}\n`,
  )
}

function writeFileInTime() {
  // File In Time's deadline data lives in the Task View, whose documented
  // default columns are Client, Service, Due Date, Status, Key person,
  // Extended, Notes (User's Guide p.22) — not CamelCase headers, an "Entity",
  // a "County", or an "AssignedStaff" field. We model the Task View export
  // (Tools > Export Task View Data), which is the deadline-bearing one.
  const headers = ['Client', 'Service', 'Due Date', 'Status', 'Key person', 'Extended', 'Notes']
  writeText(
    'file-in-time-task-view.txt',
    tsv(
      headers,
      clients.map((client) => ({
        Client: client.name,
        Service: client.returnType,
        'Due Date': client.dueDate,
        Status: workflowStatusFor(client),
        'Key person': client.preparer,
        Extended: client.returnType === '1065' || client.returnType === '1120S' ? 'Yes' : 'No',
        Notes: client.note,
      })),
    ),
  )
}

function writeCchAxcess() {
  // CCH Axcess Client Manager grid columns: the primary name column is "Client
  // Name" (not "Name Line 1"), the tax-id column is "SSN/FEIN" (not "Federal
  // ID"), the classification field is "Client Type" (not "Entity"), the
  // sub-identifier is "Sub-ID", client Status is Active/Inactive, and the
  // internal Client GUID is not a selectable grid column.
  const headers = [
    'Client ID',
    'Sub-ID',
    'Client Name',
    'SSN/FEIN',
    'Client Type',
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
        'Client ID': client.clientNumber,
        'Sub-ID': '00',
        'Client Name': client.name,
        'SSN/FEIN': client.ein,
        'Client Type': client.entity,
        'Address Line 1': client.address,
        City: client.city,
        State: client.state,
        ZIP: client.zip,
        'Responsible Staff': client.preparer,
        Office: officeFor(client),
        'Business Unit': 'Tax',
        'Email Address': client.email,
        Phone: client.phone,
        Status: client.id % 8 === 0 ? 'Inactive' : 'Active',
      })),
    ),
  )
}

function writeCchProSystemFx() {
  // "Create client list for Portal" emits the batch client-linking schema:
  // Client ID, Client Sub-ID, a mandatory Client GUID, NameLine1/NameLine2
  // (no spaces; first/last for individuals), SortName, Federal ID, ClientType,
  // FYE, and Client Email ID. Partner/Manager/Preparer, return type, status,
  // and street address are not part of this utility's output.
  const headers = [
    'Client ID',
    'Client Sub-ID',
    'Client GUID',
    'NameLine1',
    'NameLine2',
    'SortName',
    'Federal ID',
    'ClientType',
    'FYE',
    'Client Email ID',
  ]
  writeText(
    'PortalSaaSClient_20260525_093000.csv',
    csv(
      headers,
      clients.map((client) => {
        const isIndividual = client.entity === 'Individual'
        return {
          'Client ID': client.clientNumber,
          'Client Sub-ID': '00',
          'Client GUID': client.clientGuid,
          NameLine1: isIndividual ? client.firstName : client.name,
          NameLine2: isIndividual ? client.lastName : '',
          SortName: isIndividual ? `${client.lastName}, ${client.firstName}` : client.name,
          'Federal ID': client.ein,
          ClientType: client.entity,
          FYE: '12/31',
          'Client Email ID': client.email,
        }
      }),
    ),
  )
}

function writeLacerte() {
  // Lacerte's Client > Export > Export to File uses these selectable field
  // labels. There is no "Return Type", "Preparer", or "Status" export field;
  // the name label is "Client Full name", phones are spelled out, and the tax
  // id is "Federal ID Number" / "Type of Entity". (Lacerte exports per module;
  // a single mixed file is a fixture simplification — see the README.)
  const headers = [
    'Client Number',
    'Client Full name',
    'Taxpayer E-mail Address',
    'Spouse Email Address',
    'Taxpayer Home Telephone Number',
    'Street Address',
    'City',
    'State',
    'Zip Code',
    'Federal ID Number',
    'Type of Entity',
  ]
  writeText(
    'EXPORT.CSV',
    csv(
      headers,
      clients.map((client) => ({
        'Client Number': client.clientNumber,
        'Client Full name': client.name,
        'Taxpayer E-mail Address': client.email,
        'Spouse Email Address': '',
        'Taxpayer Home Telephone Number': client.phone,
        'Street Address': client.address,
        City: client.city,
        State: client.state,
        'Zip Code': client.zip,
        'Federal ID Number': client.ein,
        'Type of Entity': client.entity,
      })),
    ),
  )
}

function writeProSeries() {
  // ProSeries HomeBase > Export Contacts writes contact info only (no tax
  // return data): "HomeBase View" is the view dropdown (not a column), and
  // EF Status / SSN / Notes are out of scope for the contacts export. City,
  // state, and zip are a single customizable field ("Client City, State, and
  // Zip"). Return type displays as a bare form number.
  const headers = [
    'Client Name',
    'Client Status',
    'Client Street and Apt Address',
    'Client City State and Zip',
    'Client Phone',
    'Client Email Address',
    'Return Type',
    'Preparer',
  ]
  writeText(
    'Contacts.csv',
    csv(
      headers,
      clients.map((client) => ({
        'Client Name': client.name,
        'Client Status': workflowStatusFor(client),
        'Client Street and Apt Address': client.address,
        'Client City State and Zip': `${client.city}, ${client.state} ${client.zip}`,
        'Client Phone': client.phone,
        'Client Email Address': client.email,
        'Return Type': client.returnType,
        Preparer: client.preparer,
      })),
    ),
  )
}

function writeUltraTax() {
  // Modeled on UltraTax CS's "Client Contact" listing report — the only one
  // that carries email/phone. Its documented columns are client ID, client
  // name, contact name, entity type, email, contact address, work phone, and
  // home phone. Preparer/status/TIN and federal/state "products" belong to the
  // General Client/Return Information reports, not this one, so no single
  // export produces the old chimera column set.
  const headers = [
    'Client ID',
    'Client Name',
    'Contact Name',
    'Entity',
    'Email Address',
    'Address',
    'City',
    'State',
    'Zip',
    'Work Phone',
    'Home Phone',
  ]
  writeText(
    'ultratax-client-listing-report.csv',
    csv(
      headers,
      clients.map((client) => ({
        'Client ID': client.clientNumber,
        'Client Name': client.name,
        'Contact Name': client.contactName,
        Entity: client.returnType,
        'Email Address': client.email,
        Address: client.address,
        City: client.city,
        State: client.state,
        Zip: client.zip,
        'Work Phone': client.phone,
        'Home Phone': client.returnType === '1040' ? client.phone : '',
      })),
    ),
  )
}

function writeProConnect() {
  // ProConnect's Reporting download (the CSV of e-filed returns) uses real
  // field labels and populates Taxpayer name for individual returns and
  // Business name for entity returns. "Tax year", "Return type", and "Return
  // status" are not documented export columns, and the export only contains
  // already-e-filed returns (so there is no in-progress "Return status").
  const headers = [
    'Taxpayer name',
    'Business name',
    'Email address',
    'Phone number',
    'Street address',
    'City',
    'State',
    'Zip code',
    'Total tax',
    'Total balance due',
    'Preparer',
  ]
  writeText(
    'proconnect-return-data-2025.csv',
    csv(
      headers,
      clients.map((client) => {
        const isIndividual = client.returnType === '1040'
        return {
          'Taxpayer name': isIndividual ? client.contactName : '',
          'Business name': isIndividual ? '' : client.name,
          'Email address': client.email,
          'Phone number': client.phone,
          'Street address': client.address,
          City: client.city,
          State: client.state,
          'Zip code': client.zip,
          'Total tax': (1000 + client.id * 185).toFixed(2),
          'Total balance due': (client.id % 4 === 0 ? 0 : 75 + client.id * 11).toFixed(2),
          Preparer: client.preparer,
        }
      }),
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

// Staff/managers display as named people in real exports. Preparer codes like
// "JDOE" expand to "J. Doe"; managers come from a small named pool.
function staffName(code) {
  return `${code[0]}. ${code[1]}${code.slice(2).toLowerCase()}`
}

function managerName(index) {
  return ['Dana Lee', 'Avery Park', 'Robin Rivera', 'Sky Stone'][index % 4]
}

// TaxDome account IDs are 1-2 name initials + a uniquifying number (e.g. MH1).
function taxDomeAccountId(name, id) {
  const initials = name
    .replace(/\(TEST\)/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
  return `${initials}${id}`
}

// Karbon keys are opaque 12-char alphanumerics. Deterministic by id (no RNG so
// regenerating is stable).
function karbonKey(id) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let n = (id * 2654435761) % 2 ** 31
  let key = ''
  for (let i = 0; i < 12; i += 1) {
    key += alphabet[n % alphabet.length]
    n = Math.floor(n / alphabet.length) + id * 7 + i + 1
  }
  return key
}

// Deterministic hex segment of a given length from a seed (for GUID building).
function hexSeg(seed, len) {
  let n = (seed * 2654435761) >>> 0
  let out = ''
  while (out.length < len) {
    out += (n % 16).toString(16)
    n = Math.floor(n / 16) + seed + out.length
  }
  return out.slice(0, len)
}

// CCH ProSystem fx Portal client lists carry a mandatory 36-char Client GUID in
// 8-4-4-4-12 hex form. Deterministic by id.
function clientGuid(id) {
  return `${hexSeg(id, 8)}-${hexSeg(id * 3, 4)}-4${hexSeg(id * 5, 3)}-${hexSeg(id * 7, 4)}-${hexSeg(id * 11, 12)}`
}

function officeFor(client) {
  if (client.state === 'NY' || client.state === 'IL') return 'East'
  if (client.state === 'CA' || client.state === 'WA' || client.state === 'CO') return 'West'
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
