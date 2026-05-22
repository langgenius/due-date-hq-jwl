import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'

import {
  normalizeIntegrationJsonText,
  normalizePastedRowsText,
  parseIntegrationRows,
} from './Step1Intake'
import { prepareUploadFile, unsupportedUploadForFileName } from './intake-files'
import { PROVIDER_CAPABILITY_BY_PROVIDER } from './provider-capabilities'

describe('provider integration intake parsing', () => {
  it('labels Soraban as a routed export path, not a direct API', () => {
    expect(PROVIDER_CAPABILITY_BY_PROVIDER.soraban.label).toBe(
      'Soraban via Karbon/Zapier or uploaded export',
    )
    expect(PROVIDER_CAPABILITY_BY_PROVIDER.soraban.label).not.toContain('API')
  })

  it('parses standard provider arrays', () => {
    const rows = parseIntegrationRows('[{"id":"acct_1","name":"Acme"}]', 'taxdome')

    expect(rows).toHaveLength(1)
    expect(rows[0]?.externalId).toBe('acct_1')
    expect(rows[0]?.externalEntityType).toBe('account')
  })

  it('accepts copied JSON objects without wrapping brackets', () => {
    const rows = parseIntegrationRows(
      '{"id":"work_1","name":"Alpha"}\n{"id":"work_2","name":"Beta"}',
      'karbon',
    )

    expect(rows.map((row) => row.externalId)).toEqual(['work_1', 'work_2'])
    expect(rows.every((row) => row.externalEntityType === 'work_item')).toBe(true)
  })

  it('accepts common API wrapper keys', () => {
    const rows = parseIntegrationRows('{"data":[{"id":101},{"id":102}]}', 'proconnect')

    expect(rows.map((row) => row.externalId)).toEqual(['101', '102'])
  })

  it('normalizes paste-friendly JSONL and markdown fenced JSON into arrays', () => {
    expect(normalizeIntegrationJsonText('```json\n{"id":"a"}\n{"id":"b"}\n```')).toBe(
      '[\n  {\n    "id": "a"\n  },\n  {\n    "id": "b"\n  }\n]',
    )
  })

  it('repairs trailing commas before parsing', () => {
    const rows = parseIntegrationRows('[{"id":"acct_1",},]', 'taxdome')

    expect(rows[0]?.externalId).toBe('acct_1')
  })
})

describe('client rows paste normalization', () => {
  it('turns copied provider records into tabular rows', () => {
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
  })

  it.each([
    [
      'cch-axcess.csv',
      'Client ID,Client Sub-ID,Name Line 1,Federal ID,State\n100,00,Acme LLC,12-3456789,CA\n',
      'cch_axcess',
      'cch_axcess',
    ],
    [
      'PortalSaaSClient.csv',
      'Client ID,Partner,Manager,Preparer,Name Line 1\n100,Pat,Mia,Chris,Acme LLC\n',
      'cch_prosystem_fx',
      'cch_prosystem_fx',
    ],
    [
      'lacerte-export.csv',
      'Client Number,Client Name,Taxpayer E-mail Address,State\n100,Acme LLC,a@example.com,CA\n',
      'lacerte',
      'lacerte',
    ],
    [
      'Contacts.csv',
      'Client Name,Client Status,Client Street and Apt Address,Client State\nAcme,Active,1 Main,CA\n',
      'proseries',
      'proseries',
    ],
    [
      'ultratax.csv',
      'Client ID,Client Name,Entity,SSN/EIN,Preparer,Status\n100,Acme,1065,12-3456789,Pat,Ready\n',
      'ultratax_cs',
      'ultratax_cs',
    ],
    [
      'proconnect.csv',
      'Taxpayer name,Taxpayer email address,Taxpayer phone number,Return type\nAcme,a@example.com,555-0100,1120S\n',
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
})
