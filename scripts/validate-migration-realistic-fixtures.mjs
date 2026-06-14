import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const requireFromApp = createRequire(new URL('../apps/app/package.json', import.meta.url))
const { unzipSync } = requireFromApp('fflate')

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixtureDir = join(
  rootDir,
  'docs/product-design/migration-copilot/06-fixtures/realistic-exports',
)

const primaryFixtures = [
  'taxdome-client-export.zip',
  'drake-client-ef-export.csv',
  'karbon-all-contacts.xlsx',
  'quickbooks-online-customer-contact-list.xlsx',
  'file-in-time-task-view.txt',
  'cch-axcess-client-manager-grid.csv',
  'PortalSaaSClient_20260525_093000.csv',
  'EXPORT.CSV',
  'Contacts.csv',
  'ultratax-client-listing-report.csv',
  'proconnect-return-data-2025.csv',
]

const variants = [
  'quickbooks-desktop-customers.iif',
  'ultratax-client-listing-report.dif',
  'file-in-time-backup.fbk',
]

for (const fileName of [...primaryFixtures, ...variants]) {
  assert(existsSync(pathFor(fileName)), `${fileName} is missing`)
}

validateZip()
validateXlsx('karbon-all-contacts.xlsx')
validateXlsx('quickbooks-online-customer-contact-list.xlsx')
validateTextFixtures()
validateQuickBooksIif()
validateUnsupportedMarkers()
validateSyntheticPii()

console.log(`Validated ${primaryFixtures.length} primary fixtures and ${variants.length} variants.`)

function validateZip() {
  const entries = unzipSync(readFileSync(pathFor('taxdome-client-export.zip')))
  assert(entries['accounts.csv'], 'TaxDome ZIP must include accounts.csv')
  assert(entries['contacts.csv'], 'TaxDome ZIP must include contacts.csv')
  const accounts = new TextDecoder().decode(entries['accounts.csv'])
  const contacts = new TextDecoder().decode(entries['contacts.csv'])
  assert(lineCount(accounts) === 25, 'TaxDome accounts.csv should have 24 rows plus a header')
  assert(lineCount(contacts) === 25, 'TaxDome contacts.csv should have 24 rows plus a header')
  assert(accounts.includes('Account ID,Account name'), 'TaxDome accounts headers drifted')
  assert(contacts.includes('Contact name,First name'), 'TaxDome contacts headers drifted')
}

function validateXlsx(fileName) {
  const entries = unzipSync(readFileSync(pathFor(fileName)))
  assert(entries['xl/workbook.xml'], `${fileName} is missing workbook.xml`)
  assert(entries['xl/worksheets/sheet1.xml'], `${fileName} is missing sheet1.xml`)
  assert(entries['xl/sharedStrings.xml'], `${fileName} is missing sharedStrings.xml`)
}

function validateTextFixtures() {
  for (const fileName of primaryFixtures.filter((name) => /\.(csv|txt)$/i.test(name))) {
    const text = readFileSync(pathFor(fileName), 'utf8')
    assert(lineCount(text) === 25, `${fileName} should have 24 rows plus a header`)
    assert(text.includes('(TEST)'), `${fileName} should contain synthetic TEST names`)
  }
}

function validateQuickBooksIif() {
  const text = readFileSync(pathFor('quickbooks-desktop-customers.iif'), 'utf8')
  assert(text.startsWith('!HDR\t'), 'QuickBooks IIF should open with an !HDR section')
  assert(text.includes('!CUST\tNAME\tREFNUM\tTIMESTAMP'), 'QuickBooks IIF !CUST header drifted')
  const custRows = text.split(/\r?\n/).filter((line) => line.startsWith('CUST\t')).length
  assert(custRows === 24, 'QuickBooks IIF should have 24 CUST rows')
}

function validateUnsupportedMarkers() {
  const dif = readFileSync(pathFor('ultratax-client-listing-report.dif'), 'utf8')
  assert(dif.includes('UltraTax Client Listing Report (TEST)'), 'UltraTax DIF marker drifted')
  const fbk = readFileSync(pathFor('file-in-time-backup.fbk'))
  assert(fbk.length > 8, 'File In Time FBK marker should not be empty')
}

function validateSyntheticPii() {
  const emails = []
  const taxIds = []
  for (const fileName of primaryFixtures.filter((name) => /\.(csv|txt|iif)$/i.test(name))) {
    const text = readFileSync(pathFor(fileName), 'utf8')
    emails.push(...text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g))
    taxIds.push(...text.matchAll(/\b[0-9]{2}-[0-9]{7}\b/g))
  }
  assert(
    emails.every((match) => match[0].endsWith('@example.com')),
    'All fixture emails must use example.com',
  )
  assert(
    taxIds.every((match) => match[0].startsWith('99-')),
    'All fixture EIN-like IDs must use the 99-* test range',
  )
}

function lineCount(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length
}

function pathFor(fileName) {
  return join(fixtureDir, fileName)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
