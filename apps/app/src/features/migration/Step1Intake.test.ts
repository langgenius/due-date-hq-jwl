import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'

import {
  normalizePastedRowsText,
  shouldApplyDetectedPreset,
  shouldOfferDetectedPresetSwitch,
  SOURCE_PRESET_IDS,
} from './Step1Intake'
import {
  findHeaderRowOffset,
  prepareUploadFile,
  unsupportedUploadForFileName,
} from './intake-files'

const testDir = dirname(fileURLToPath(import.meta.url))
const realisticFixtureDir = join(
  testDir,
  '../../../../../docs/product-design/migration-copilot/06-fixtures/realistic-exports',
)

function fixtureFile(fileName: string, type = 'text/csv') {
  const bytes = readFileSync(join(realisticFixtureDir, fileName))
  return new File([new Uint8Array(bytes)], fileName, { type })
}

function unsupportedSampleFile(fileName: string) {
  if (fileName === 'file-in-time-backup.fbk' || fileName === 'ultratax-client-listing-report.dif') {
    return fixtureFile(fileName, 'application/octet-stream')
  }
  return new File(['unsupported backup marker'], fileName, { type: 'application/octet-stream' })
}

describe('source preset chips', () => {
  it('lists provider chips alphabetically by displayed label', () => {
    expect(SOURCE_PRESET_IDS).toEqual([
      'cch_axcess',
      'cch_prosystem_fx',
      'drake',
      'file_in_time',
      'karbon',
      'lacerte',
      'proconnect_tax',
      'proseries',
      'quickbooks',
      'taxdome',
      'ultratax_cs',
    ])
  })

  it('auto-applies detected presets only when the user has not made a manual choice', () => {
    expect(shouldApplyDetectedPreset({ preset: null, presetSource: null }, 'taxdome')).toBe(true)
    expect(
      shouldApplyDetectedPreset({ preset: 'taxdome', presetSource: 'detected' }, 'drake'),
    ).toBe(true)
    expect(shouldApplyDetectedPreset({ preset: 'taxdome', presetSource: 'manual' }, 'drake')).toBe(
      false,
    )
    expect(shouldApplyDetectedPreset({ preset: null, presetSource: null }, null)).toBe(false)
  })

  it('offers a switch when a manual preset conflicts with a detected upload', () => {
    expect(
      shouldOfferDetectedPresetSwitch({ preset: 'taxdome', presetSource: 'manual' }, 'quickbooks'),
    ).toBe(true)
    expect(
      shouldOfferDetectedPresetSwitch({ preset: 'taxdome', presetSource: 'manual' }, 'taxdome'),
    ).toBe(false)
    expect(
      shouldOfferDetectedPresetSwitch(
        { preset: 'taxdome', presetSource: 'detected' },
        'quickbooks',
      ),
    ).toBe(false)
  })
})

describe('client rows paste normalization', () => {
  it('turns copied JSON client rows into tabular rows', () => {
    expect(
      normalizePastedRowsText(
        '[{"Client name":"Acme LLC","State":"CA"},{"Client name":"Bright Books","State":"TX"}]',
      ),
    ).toBe('Client name\tState\nAcme LLC\tCA\nBright Books\tTX')
  })

  it('accepts JSONL client rows', () => {
    expect(
      normalizePastedRowsText('{"name":"Acme","entity":"LLC"}\n{"name":"Beta","state":"NY"}'),
    ).toBe('name\tentity\tstate\nAcme\tLLC\t\nBeta\t\tNY')
  })

  it('unwraps common row containers', () => {
    expect(normalizePastedRowsText('{"rows":[{"name":"Acme","state":"CA"}]}')).toBe(
      'name\tstate\nAcme\tCA',
    )
  })

  it('normalizes fenced CSV into TSV text', () => {
    expect(normalizePastedRowsText('```csv\nname,state\nAcme,CA\n```')).toBe(
      'name\tstate\nAcme\tCA',
    )
  })
})

describe('xlsx preamble skipping', () => {
  it('keeps row 0 when the sheet starts with the column headings', () => {
    expect(
      findHeaderRowOffset([
        ['Customer', 'Email', 'State'],
        ['Acme LLC', 'a@example.com', 'CA'],
      ]),
    ).toBe(0)
  })

  it('skips company/title/date banner rows above the headings', () => {
    expect(
      findHeaderRowOffset([
        ['Ledger Lane CPAs (TEST)'],
        ['Customer Contact List'],
        ['As of June 1, 2026'],
        [''],
        ['Customer', 'Customer Type', 'Email', 'Open Balance'],
        ['Acme LLC', 'LLC', 'a@example.com', '120.00'],
      ]),
    ).toBe(4)
  })
})

describe('client export file intake adapters', () => {
  it('explains unsupported proprietary backups before parsing', () => {
    expect(unsupportedUploadForFileName('backup.qbb')).toEqual({
      code: 'quickbooks_backup',
      fileName: 'backup.qbb',
    })
    expect(unsupportedUploadForFileName('file-in-time.fbk')).toEqual({
      code: 'file_in_time_backup',
      fileName: 'file-in-time.fbk',
    })
    expect(unsupportedUploadForFileName('2025.Return.rtnbak')).toEqual({
      code: 'cch_axcess_backup',
      fileName: '2025.Return.rtnbak',
    })
    expect(unsupportedUploadForFileName('client.dbf')).toEqual({
      code: 'lacerte_data_file',
      fileName: 'client.dbf',
    })
    expect(unsupportedUploadForFileName('sample.24i')).toEqual({
      code: 'proseries_return_file',
      fileName: 'sample.24i',
    })
    expect(unsupportedUploadForFileName('client.csd')).toEqual({
      code: 'ultratax_client_data',
      fileName: 'client.csd',
    })
    expect(unsupportedUploadForFileName('client-listing.dif')).toEqual({
      code: 'ultratax_dif',
      fileName: 'client-listing.dif',
    })
  })

  it.each([
    [
      'drake-client-ef-export.csv',
      'Client Name,SSN/EIN,Return Type,State,Preparer\nAcme LLC,99-1000001,1065,CA,J. Doe\n',
      'drake',
      'drake',
    ],
    [
      'cch-axcess.csv',
      'Client ID,Sub-ID,Client Name,SSN/FEIN,Responsible Staff,Business Unit\n100,00,Acme LLC,12-3456789,J. Doe,Tax\n',
      'cch_axcess',
      'cch_axcess',
    ],
    [
      'PortalSaaSClient.csv',
      'Client ID,Client Sub-ID,Client GUID,NameLine1,ClientType\n100,00,3f2504e0-4f89-41d3-9a0c-0305e82c3301,Acme LLC,LLC\n',
      'cch_prosystem_fx',
      'cch_prosystem_fx',
    ],
    [
      'lacerte-export.csv',
      'Client Number,Client Full name,Taxpayer E-mail Address,State\n100,Acme LLC,a@example.com,CA\n',
      'lacerte',
      'lacerte',
    ],
    [
      'Contacts.csv',
      'Client Name,Client Status,Client Street and Apt Address,Client City State and Zip\nAcme,Active,1 Main,"Austin, TX 78701"\n',
      'proseries',
      'proseries',
    ],
    [
      'ultratax.csv',
      'Client ID,Client Name,Contact Name,Entity,Work Phone\n100,Acme,Pat Owner,1065,555-0100\n',
      'ultratax_cs',
      'ultratax_cs',
    ],
    [
      'proconnect.csv',
      'Taxpayer name,Business name,Total tax,Total balance due,Preparer\n,Acme LLC,1200.00,85.00,J. Doe\n',
      'proconnect_tax',
      'proconnect_tax',
    ],
  ])('detects %s as %s', async (fileName, text, product, preset) => {
    const prepared = await prepareUploadFile(new File([text], fileName, { type: 'text/csv' }))

    expect(prepared.suggestedPreset).toBe(preset)
    expect(prepared.sourceManifest.product).toBe(product)
  })

  it('converts QuickBooks Desktop IIF customers into tabular upload text', async () => {
    const file = new File(
      [
        [
          '!CUST\tNAME\tREFNUM\tBADDR1\tBADDR2\tBADDR3\tPHONE1\tPHONE2\tEMAIL\tCUSTFLD1\tNOTE',
          'CUST\tAcme LLC\tQB-1\tAcme LLC\t1 Main St\tCA 94105\t555-0101\t\towner@example.com\tBusiness\tVIP',
        ].join('\n'),
      ],
      'customers.iif',
      { type: 'text/plain' },
    )

    const prepared = await prepareUploadFile(file)

    expect(prepared.fileKind).toBe('tsv')
    expect(prepared.suggestedPreset).toBe('quickbooks')
    expect(prepared.sourceManifest).toMatchObject({
      product: 'quickbooks_desktop',
      selectedRole: 'quickbooks_iif_customers',
      originalKind: 'iif',
    })
    expect(prepared.text).toContain('Customer\tExternal ID\tCompany Name')
    expect(prepared.text).toContain('Acme LLC\tQB-1\tAcme LLC')
  })

  it('merges TaxDome account and contact files inside ZIP exports', async () => {
    const archive = zipSync({
      'accounts.csv': strToU8(
        'Account ID,Account Name,Linked Contact #1\nacct_1,Acme LLC,Jane Owner\n',
      ),
      'contacts.csv': strToU8(
        'Contact Name,Email Address,Linked Account #1\nJane Owner,jane@example.com,Acme LLC\n',
      ),
    })
    const archiveBuffer = new ArrayBuffer(archive.byteLength)
    new Uint8Array(archiveBuffer).set(archive)
    const file = new File([archiveBuffer], 'taxdome-export.zip', { type: 'application/zip' })

    const prepared = await prepareUploadFile(file)

    expect(prepared.suggestedPreset).toBe('taxdome')
    expect(prepared.fileKind).toBe('tsv')
    expect(prepared.sourceManifest.product).toBe('taxdome')
    expect(prepared.sourceManifest.originalKind).toBe('zip')
    expect(prepared.sourceManifest.selectedFileName).toContain('accounts.csv + contacts.csv')
    expect(prepared.text).toContain('Primary Contact Name\tPrimary Contact Email')
    expect(prepared.text).toContain('Jane Owner\tjane@example.com')
  })

  it.each([
    [
      'taxdome-client-export.zip',
      'application/zip',
      'taxdome',
      'taxdome',
      'account_list',
      ['Account ID', 'Account name', 'Primary Contact Email'],
    ],
    [
      'drake-client-ef-export.csv',
      'text/csv',
      'drake',
      'drake',
      'client_list',
      ['SSN/EIN', 'Return Type', 'Preparer'],
    ],
    [
      'karbon-all-contacts.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'karbon',
      'karbon',
      'contact_list',
      ['Client Owner', 'Entity Type', 'Client Manager'],
    ],
    [
      'quickbooks-online-customer-contact-list.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'quickbooks',
      'quickbooks_online',
      'customer_list',
      ['Customer', 'Customer Type', 'Open Balance'],
    ],
    [
      'file-in-time-task-view.txt',
      'text/plain',
      'file_in_time',
      'file_in_time',
      'task_view',
      ['Client', 'Service', 'Key person'],
    ],
    [
      'cch-axcess-client-manager-grid.csv',
      'text/csv',
      'cch_axcess',
      'cch_axcess',
      'client_list',
      ['Client Name', 'SSN/FEIN', 'Responsible Staff'],
    ],
    [
      'PortalSaaSClient_20260525_093000.csv',
      'text/csv',
      'cch_prosystem_fx',
      'cch_prosystem_fx',
      'client_list',
      ['NameLine1', 'Client GUID', 'Federal ID'],
    ],
    [
      'EXPORT.CSV',
      'text/csv',
      'lacerte',
      'lacerte',
      'client_list',
      ['Client Number', 'Taxpayer E-mail Address', 'Federal ID Number'],
    ],
    [
      'Contacts.csv',
      'text/csv',
      'proseries',
      'proseries',
      'contact_list',
      ['Client Status', 'Client Street and Apt Address', 'Return Type'],
    ],
    [
      'ultratax-client-listing-report.csv',
      'text/csv',
      'ultratax_cs',
      'ultratax_cs',
      'client_listing_report',
      ['Client Name', 'Contact Name', 'Entity'],
    ],
    [
      'proconnect-return-data-2025.csv',
      'text/csv',
      'proconnect_tax',
      'proconnect_tax',
      'return_data',
      ['Business name', 'Total tax', 'Preparer'],
    ],
  ] as const)(
    'detects realistic %s fixture',
    async (fileName, contentType, preset, product, role, expectedHeaders) => {
      const prepared = await prepareUploadFile(fixtureFile(fileName, contentType))
      const selectedFile = prepared.sourceManifest.files.find((file) => file.selected)

      expect(prepared.suggestedPreset).toBe(preset)
      expect(prepared.sourceManifest.product).toBe(product)
      expect(prepared.sourceManifest.selectedRole).toBe(role)
      expect(selectedFile?.rowCount).toBeGreaterThan(0)
      for (const header of expectedHeaders) {
        expect(prepared.text).toContain(header)
      }
    },
  )

  it('detects the QuickBooks Desktop IIF realistic variant', async () => {
    const prepared = await prepareUploadFile(
      fixtureFile('quickbooks-desktop-customers.iif', 'text/plain'),
    )

    expect(prepared.suggestedPreset).toBe('quickbooks')
    expect(prepared.sourceManifest).toMatchObject({
      product: 'quickbooks_desktop',
      selectedRole: 'quickbooks_iif_customers',
      originalKind: 'iif',
    })
    expect(prepared.text).toContain('Billing State')
    expect(prepared.text).toContain('Marin Harbor Analytics LLC (TEST)')
  })

  it.each([
    ['file-in-time-backup.fbk', 'file_in_time_backup'],
    ['ultratax-client-listing-report.dif', 'ultratax_dif'],
    ['quickbooks-backup.qbb', 'quickbooks_backup'],
    ['client-clntbkup.zip', 'cch_prosystem_fx_backup'],
    ['client.dbf', 'lacerte_data_file'],
    ['sample.24i', 'proseries_return_file'],
    ['sample.24e', 'proseries_return_file'],
    ['client.csd', 'ultratax_client_data'],
  ] as const)('rejects %s with specific unsupported guidance', async (fileName, code) => {
    await expect(prepareUploadFile(unsupportedSampleFile(fileName))).rejects.toMatchObject({
      upload: { code, fileName },
    })
  })
})
