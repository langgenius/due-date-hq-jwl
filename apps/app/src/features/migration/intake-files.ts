import { strFromU8, unzipSync } from 'fflate'
import readXlsxFile, { type Sheet, type SheetData } from 'read-excel-file/browser'

import { parseTabular, type ParsedTabular } from '@duedatehq/core/csv-parser'
import type {
  MigrationDetectedSourceProduct,
  MigrationOriginalFileKind,
  MigrationSourceFileRole,
  MigrationSourceManifest,
  MigrationSourceManifestFile,
  MigrationSourceManifestWarning,
} from '@duedatehq/contracts'

import type { IntakeState, PresetId } from './state'

export type CanonicalFileKind = Extract<IntakeState['fileKind'], 'csv' | 'tsv' | 'xlsx'>

export interface PreparedUpload {
  text: string
  fileName: string
  fileKind: CanonicalFileKind
  rawFileBase64: string | null
  contentType: string
  sizeBytes: number
  sourceManifest: MigrationSourceManifest
  suggestedPreset: PresetId | null
}

export type UnsupportedUploadCode =
  | 'file_in_time_backup'
  | 'quickbooks_backup'
  | 'quickbooks_company'
  | 'qbo_archive'
  | 'pdf_report'
  | 'legacy_excel'
  | 'unsupported_binary'

export interface UnsupportedUpload {
  code: UnsupportedUploadCode
  fileName: string
}

interface Candidate {
  fileName: string
  originalKind: MigrationOriginalFileKind
  text: string
  canonicalKind: CanonicalFileKind
  contentType: string
  sizeBytes: number
  parsed: ParsedTabular
  detection: Detection
}

interface Detection {
  product: MigrationDetectedSourceProduct
  role: MigrationSourceFileRole
  confidence: number
  reason: string
  suggestedPreset: PresetId | null
}

const ZIP_CONTENT_TYPE = 'application/zip'

export function unsupportedUploadForFileName(fileName: string): UnsupportedUpload | null {
  const ext = extensionOf(fileName)
  if (ext === 'fbk') return { code: 'file_in_time_backup', fileName }
  if (ext === 'qbb') return { code: 'quickbooks_backup', fileName }
  if (ext === 'qbw' || ext === 'qbm') return { code: 'quickbooks_company', fileName }
  if (ext === 'cab') return { code: 'qbo_archive', fileName }
  if (ext === 'pdf') return { code: 'pdf_report', fileName }
  if (ext === 'xls') return { code: 'legacy_excel', fileName }
  if (
    ext &&
    !['csv', 'tsv', 'txt', 'xlsx', 'zip', 'iif', 'json'].includes(ext) &&
    likelyBinaryExtension(ext)
  ) {
    return { code: 'unsupported_binary', fileName }
  }
  return null
}

export async function prepareUploadFile(file: File): Promise<PreparedUpload> {
  const unsupported = unsupportedUploadForFileName(file.name)
  if (unsupported) throw new UnsupportedUploadError(unsupported)

  const ext = extensionOf(file.name)
  if (ext === 'zip') return prepareZipUpload(file)
  if (ext === 'xlsx') return prepareXlsxUpload(file)

  const rawFileBase64 = await fileToBase64(file)
  const text = await file.text()
  if (ext === 'iif') {
    const converted = quickBooksIifToTsv(text)
    return prepareTextUpload({
      text: converted,
      fileName: file.name,
      originalKind: 'iif',
      canonicalKind: 'tsv',
      rawFileBase64,
      contentType: file.type || 'text/plain',
      sizeBytes: file.size,
      warnings: [],
    })
  }

  const originalKind: MigrationOriginalFileKind =
    ext === 'tsv' ? 'tsv' : ext === 'txt' ? 'txt' : ext === 'json' ? 'json' : 'csv'
  const normalizedText = originalKind === 'json' ? (jsonToTabularText(text) ?? text) : text
  const canonicalKind: CanonicalFileKind =
    originalKind === 'tsv' || firstContentLine(normalizedText).includes('\t') ? 'tsv' : 'csv'

  return prepareTextUpload({
    text: normalizedText,
    fileName: file.name,
    originalKind,
    canonicalKind,
    rawFileBase64,
    contentType: file.type || (canonicalKind === 'tsv' ? 'text/tab-separated-values' : 'text/csv'),
    sizeBytes: file.size,
    warnings: [],
  })
}

export function unsupportedUploadMessage(input: UnsupportedUpload): string {
  switch (input.code) {
    case 'file_in_time_backup':
      return 'This looks like a File In Time backup. Export Client Information from Tools > Export Client Information, or export Task View to Excel.'
    case 'quickbooks_backup':
      return 'This looks like a QuickBooks Desktop company backup. Export Customer Contact List to Excel/CSV or Customers to an IIF file.'
    case 'quickbooks_company':
      return 'This looks like a QuickBooks Desktop company file. Export Customer Contact List to Excel/CSV or Customers to an IIF file.'
    case 'qbo_archive':
      return 'This looks like a QuickBooks Online Advanced archive. Export Customers or Customer Contact List to Excel instead.'
    case 'pdf_report':
      return 'PDF reports are not supported for client import. Export a spreadsheet, CSV, ZIP, TXT/TSV, or IIF file instead.'
    case 'legacy_excel':
      return 'Legacy .xls files are not supported yet. Re-save the workbook as .xlsx or CSV and upload again.'
    case 'unsupported_binary':
      return `We cannot import ${input.fileName}. Upload CSV, Excel .xlsx, ZIP, TXT/TSV, or IIF.`
  }
  return 'Upload CSV, Excel .xlsx, ZIP, TXT/TSV, or IIF.'
}

export class UnsupportedUploadError extends Error {
  constructor(public readonly upload: UnsupportedUpload) {
    super(unsupportedUploadMessage(upload))
    this.name = 'UnsupportedUploadError'
  }
}

async function prepareXlsxUpload(file: File): Promise<PreparedUpload> {
  const [sheets, rawFileBase64] = await Promise.all([readXlsxFile(file), fileToBase64(file)])
  const text = sheetDataToTsv(sheets)
  return prepareTextUpload({
    text,
    fileName: file.name,
    originalKind: 'xlsx',
    canonicalKind: 'xlsx',
    rawFileBase64,
    contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: file.size,
    warnings: [],
  })
}

async function prepareZipUpload(file: File): Promise<PreparedUpload> {
  const [bytes, rawFileBase64] = await Promise.all([
    file.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
    fileToBase64(file),
  ])
  const entries = unzipSync(bytes)
  const candidates: Candidate[] = []
  const warnings: MigrationSourceManifestWarning[] = []
  const candidateTasks: Promise<Candidate | null>[] = []

  for (const [entryName, entryBytes] of Object.entries(entries)) {
    if (entryName.endsWith('/')) continue
    const unsupported = unsupportedUploadForFileName(entryName)
    if (unsupported) {
      warnings.push({
        code: unsupported.code,
        message: unsupportedUploadMessage(unsupported),
        fileName: entryName,
      })
      continue
    }
    candidateTasks.push(
      candidateFromZipEntry(entryName, entryBytes).catch(() => {
        warnings.push({
          code: 'entry_parse_failed',
          message: `Could not read ${entryName}; it was ignored.`,
          fileName: entryName,
        })
        return null
      }),
    )
  }
  candidates.push(...(await Promise.all(candidateTasks)).filter(isCandidate))

  if (candidates.length === 0) {
    throw new Error('That ZIP does not contain a readable CSV, TXT/TSV, XLSX, or IIF client file.')
  }

  const taxDomeBundle = buildTaxDomeBundleCandidate(candidates)
  if (taxDomeBundle) candidates.push(taxDomeBundle)

  const selected = candidates.toSorted((a, b) => scoreCandidate(b) - scoreCandidate(a))[0]
  if (!selected) throw new Error('That ZIP does not contain a supported client export.')
  if (candidates.length > 1) {
    warnings.push({
      code: 'zip_auto_selected_candidate',
      message: `Selected ${selected.fileName} from ${candidates.length} readable files.`,
      fileName: selected.fileName,
    })
  }

  return {
    text: selected.text,
    fileName: file.name,
    fileKind: selected.canonicalKind,
    rawFileBase64,
    contentType: file.type || ZIP_CONTENT_TYPE,
    sizeBytes: file.size,
    sourceManifest: buildManifest({
      originalFileName: file.name,
      originalKind: 'zip',
      selected,
      candidates,
      warnings,
    }),
    suggestedPreset: selected.detection.suggestedPreset,
  }
}

async function candidateFromZipEntry(
  entryName: string,
  entryBytes: Uint8Array,
): Promise<Candidate | null> {
  const ext = extensionOf(entryName)
  if (ext === 'xlsx') {
    const entryFile = new File([bytesToArrayBuffer(entryBytes)], entryName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    return candidateFromText(
      entryName,
      'xlsx',
      sheetDataToTsv(await readXlsxFile(entryFile)),
      entryBytes.byteLength,
    )
  }
  if (ext === 'iif') {
    return candidateFromText(
      entryName,
      'iif',
      quickBooksIifToTsv(strFromU8(entryBytes)),
      entryBytes.byteLength,
    )
  }
  const textKind = textOriginalKindForExtension(ext)
  if (!textKind) return null
  return candidateFromText(entryName, textKind, strFromU8(entryBytes), entryBytes.byteLength)
}

function prepareTextUpload(input: {
  text: string
  fileName: string
  originalKind: MigrationOriginalFileKind
  canonicalKind: CanonicalFileKind
  rawFileBase64: string | null
  contentType: string
  sizeBytes: number
  warnings: MigrationSourceManifestWarning[]
}): PreparedUpload {
  const parsed = parseTabular(input.text, { kind: 'paste' })
  const detection = detectSource(input.fileName, input.originalKind, parsed)
  const selected: Candidate = {
    fileName: input.fileName,
    originalKind: input.originalKind,
    text: input.text,
    canonicalKind: input.canonicalKind,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    parsed,
    detection,
  }
  return {
    text: input.text,
    fileName: input.fileName,
    fileKind: input.canonicalKind,
    rawFileBase64: input.rawFileBase64,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    sourceManifest: buildManifest({
      originalFileName: input.fileName,
      originalKind: input.originalKind,
      selected,
      candidates: [selected],
      warnings: input.warnings,
    }),
    suggestedPreset: detection.suggestedPreset,
  }
}

async function candidateFromText(
  fileName: string,
  originalKind: MigrationOriginalFileKind,
  text: string,
  sizeBytes: number,
): Promise<Candidate> {
  const normalizedText = originalKind === 'json' ? (jsonToTabularText(text) ?? text) : text
  const canonicalKind: CanonicalFileKind =
    originalKind === 'xlsx'
      ? 'xlsx'
      : firstContentLine(normalizedText).includes('\t')
        ? 'tsv'
        : 'csv'
  const parsed = parseTabular(normalizedText, { kind: 'paste' })
  return {
    fileName,
    originalKind,
    text: normalizedText,
    canonicalKind,
    contentType: canonicalKind === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
    sizeBytes,
    parsed,
    detection: detectSource(fileName, originalKind, parsed),
  }
}

function detectSource(
  fileName: string,
  originalKind: MigrationOriginalFileKind,
  parsed: ParsedTabular,
): Detection {
  const headers = new Set(parsed.headers.map(normalizeHeader))
  const lowerName = fileName.toLowerCase()

  if (originalKind === 'iif' || headers.has('refnum') || headers.has('baddr1')) {
    return {
      product: 'quickbooks_desktop',
      role: 'quickbooks_iif_customers',
      confidence: 0.98,
      reason: 'QuickBooks IIF customer headers detected.',
      suggestedPreset: 'quickbooks',
    }
  }

  if (headers.has('account id') && headers.has('account name')) {
    return {
      product: 'taxdome',
      role: 'account_list',
      confidence: 0.95,
      reason: 'TaxDome account export headers detected.',
      suggestedPreset: 'taxdome',
    }
  }

  if (headers.has('contact name') && hasPrefix(headers, 'linked account #')) {
    return {
      product: 'taxdome',
      role: 'contact_list',
      confidence: 0.92,
      reason: 'TaxDome contact export headers detected.',
      suggestedPreset: 'taxdome',
    }
  }

  if (headers.has('contactkey') || headers.has('organizationkey') || headers.has('client owner')) {
    return {
      product: 'karbon',
      role: 'contact_list',
      confidence: 0.9,
      reason: 'Karbon contact export headers detected.',
      suggestedPreset: 'karbon',
    }
  }

  if (
    headers.has('customer') ||
    headers.has('customer type') ||
    lowerName.includes('customer contact')
  ) {
    return {
      product: 'quickbooks_online',
      role: 'customer_list',
      confidence: 0.86,
      reason: 'QuickBooks customer list headers detected.',
      suggestedPreset: 'quickbooks',
    }
  }

  if (
    headers.has('clientname') ||
    headers.has('assignedstaff') ||
    lowerName.includes('fileintime') ||
    lowerName.includes('file-in-time') ||
    lowerName.includes('taskview')
  ) {
    return {
      product: 'file_in_time',
      role:
        lowerName.includes('taskview') || headers.has('task name') ? 'task_view' : 'client_list',
      confidence: 0.84,
      reason: 'File In Time-style client/task headers detected.',
      suggestedPreset: 'file_in_time',
    }
  }

  return {
    product: 'generic',
    role: 'client_list',
    confidence: 0.5,
    reason: 'Generic tabular client data.',
    suggestedPreset: null,
  }
}

function buildTaxDomeBundleCandidate(candidates: readonly Candidate[]): Candidate | null {
  const accounts = candidates.find(
    (candidate) =>
      candidate.detection.product === 'taxdome' && candidate.detection.role === 'account_list',
  )
  const contacts = candidates.find(
    (candidate) =>
      candidate.detection.product === 'taxdome' && candidate.detection.role === 'contact_list',
  )
  if (!accounts || !contacts) return null

  const merged = mergeTaxDomeAccountsContacts(accounts.parsed, contacts.parsed)
  const parsed = parseTabular(merged, { kind: 'paste' })
  return {
    fileName: `${accounts.fileName} + ${contacts.fileName}`,
    originalKind: 'csv',
    text: merged,
    canonicalKind: 'tsv',
    contentType: 'text/tab-separated-values',
    sizeBytes: merged.length,
    parsed,
    detection: {
      product: 'taxdome',
      role: 'account_list',
      confidence: 0.99,
      reason: 'TaxDome accounts and contacts were merged.',
      suggestedPreset: 'taxdome',
    },
  }
}

function mergeTaxDomeAccountsContacts(accounts: ParsedTabular, contacts: ParsedTabular): string {
  const contactByName = new Map<string, Record<string, string>>()
  const contactByAccount = new Map<string, Record<string, string>>()
  for (const row of contacts.rows) {
    const record = rowObject(contacts.headers, row)
    const name = firstValue(record, ['Contact name', 'First name'])
    if (name) contactByName.set(canon(name), record)
    for (const [key, value] of Object.entries(record)) {
      if (key.toLowerCase().startsWith('linked account #') && value.trim()) {
        contactByAccount.set(canon(value), record)
      }
    }
  }

  const headers = [...accounts.headers, 'Primary Contact Name', 'Primary Contact Email']
  const rows = accounts.rows.map((row) => {
    const account = rowObject(accounts.headers, row)
    const accountName = firstValue(account, ['Account name', 'Name']) ?? ''
    const linkedContact = Object.entries(account).find(
      ([key, value]) => key.toLowerCase().startsWith('linked contact #') && value.trim(),
    )?.[1]
    const contact =
      (linkedContact ? contactByName.get(canon(linkedContact)) : undefined) ??
      contactByAccount.get(canon(accountName))
    return [
      ...accounts.headers.map((header) => account[header] ?? ''),
      contact ? (firstValue(contact, ['Contact name']) ?? '') : (linkedContact ?? ''),
      contact ? (firstValue(contact, ['Email address', 'Email']) ?? '') : '',
    ]
  })
  return rowsToTsv(headers, rows)
}

function quickBooksIifToTsv(text: string): string {
  const records = text
    .split(/\r?\n/)
    .map((line) => line.split('\t'))
    .filter((cells) => cells.some((cell) => cell.trim()))
  const header = records.find((cells) => cells[0] === '!CUST')
  if (!header) throw new Error('QuickBooks IIF customer header was not found.')
  const dataRows = records.filter((cells) => cells[0] === 'CUST')
  const idx = (name: string) =>
    header.findIndex((cell) => normalizeHeader(cell) === normalizeHeader(name))
  const headers = [
    'Customer',
    'External ID',
    'Company Name',
    'Billing Address',
    'Billing State',
    'Phone',
    'Alt Phone',
    'Email',
    'Customer Type',
    'Notes',
  ]
  const rows = dataRows.map((cells) => {
    const address = [
      cells[idx('BADDR1')] ?? '',
      cells[idx('BADDR2')] ?? '',
      cells[idx('BADDR3')] ?? '',
    ]
      .filter(Boolean)
      .join(', ')
    return [
      cells[idx('NAME')] ?? '',
      cells[idx('REFNUM')] ?? '',
      cells[idx('BADDR1')] ?? '',
      address,
      extractState(address),
      cells[idx('PHONE1')] ?? '',
      cells[idx('PHONE2')] ?? '',
      cells[idx('EMAIL')] ?? '',
      cells[idx('CUSTFLD1')] ?? '',
      cells[idx('NOTE')] ?? '',
    ]
  })
  return rowsToTsv(headers, rows)
}

function buildManifest(input: {
  originalFileName: string
  originalKind: MigrationOriginalFileKind
  selected: Candidate
  candidates: readonly Candidate[]
  warnings: readonly MigrationSourceManifestWarning[]
}): MigrationSourceManifest {
  return {
    product: input.selected.detection.product,
    confidence: input.selected.detection.confidence,
    reason: input.selected.detection.reason,
    originalFileName: input.originalFileName,
    originalKind: input.originalKind,
    selectedFileName: input.selected.fileName,
    selectedRole: input.selected.detection.role,
    files: input.candidates.map((candidate) =>
      manifestFile(candidate, candidate === input.selected),
    ),
    warnings: [...input.warnings],
  }
}

function manifestFile(candidate: Candidate, selected: boolean): MigrationSourceManifestFile {
  return {
    fileName: candidate.fileName,
    originalKind: candidate.originalKind,
    role: candidate.detection.role,
    product: candidate.detection.product,
    rowCount: candidate.parsed.rowCount,
    selected,
  }
}

function scoreCandidate(candidate: Candidate): number {
  let score = candidate.detection.confidence * 100
  if (candidate.detection.role === 'account_list') score += 12
  if (candidate.detection.role === 'customer_list') score += 10
  if (candidate.detection.role === 'quickbooks_iif_customers') score += 10
  if (candidate.detection.role === 'contact_list') score -= 4
  if (candidate.parsed.rowCount > 0) score += Math.min(candidate.parsed.rowCount, 50) / 10
  return score
}

function sheetDataToTsv(sheets: Sheet[]): string {
  const rows: SheetData = sheets.find((sheet) =>
    sheet.data.some((row) => row.some((cell) => formatXlsxCell(cell).trim() !== '')),
  )?.data ?? [[]]
  return rows
    .map((row) =>
      row
        .map((cell) => formatXlsxCell(cell).replaceAll('\t', ' ').replaceAll('\n', ' '))
        .join('\t'),
    )
    .join('\n')
}

function formatXlsxCell(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return cell.toISOString()
  if (typeof cell === 'string') return cell
  if (typeof cell === 'number' || typeof cell === 'boolean' || typeof cell === 'bigint') {
    return String(cell)
  }
  if (typeof cell === 'symbol') return cell.description ?? ''
  return JSON.stringify(cell) ?? ''
}

function rowsToTsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  return [headers, ...rows]
    .map((row) => row.map((cell) => cell.replaceAll('\t', ' ').replaceAll('\n', ' ')).join('\t'))
    .join('\n')
}

function jsonToTabularText(text: string): string | null {
  const records = jsonRecords(text)
  if (!records || records.length === 0) return null

  const headers: string[] = []
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!headers.includes(key)) headers.push(key)
    }
  }
  if (headers.length === 0) return null
  return rowsToTsv(
    headers,
    records.map((record) => headers.map((header) => stringifyJsonCell(record[header]))),
  )
}

function jsonRecords(text: string): Record<string, unknown>[] | null {
  let parsed: unknown
  try {
    parsed = parseJsonOrJsonLines(text)
  } catch {
    return null
  }
  const container = Array.isArray(parsed)
    ? parsed
    : isPlainRecord(parsed)
      ? firstArrayValue(parsed)
      : null
  if (!container) return null

  const records = container.filter(
    (item): item is Record<string, unknown> =>
      !!item && typeof item === 'object' && !Array.isArray(item),
  )
  return records.length > 0 ? records : null
}

function parseJsonOrJsonLines(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === 0) throw new Error('Invalid JSON file.')
    return lines.map((line) => JSON.parse(line) as unknown)
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function firstArrayValue(record: Record<string, unknown>): unknown[] | null {
  for (const key of ['rows', 'data', 'items', 'results', 'clients', 'accounts', 'contacts']) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  return null
}

function stringifyJsonCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return JSON.stringify(value)
}

function rowObject(headers: readonly string[], row: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((header, index) => {
    out[header] = row[index] ?? ''
  })
  return out
}

function firstValue(record: Record<string, string>, labels: readonly string[]): string | null {
  for (const label of labels) {
    const found = Object.entries(record).find(
      ([key]) => normalizeHeader(key) === normalizeHeader(label),
    )
    const value = found?.[1]?.trim()
    if (value) return value
  }
  return null
}

function extensionOf(fileName: string): string {
  const clean = fileName.toLowerCase().split('?')[0] ?? ''
  const last = clean.split('/').pop() ?? clean
  const dot = last.lastIndexOf('.')
  return dot >= 0 ? last.slice(dot + 1) : ''
}

function likelyBinaryExtension(ext: string): boolean {
  return ['exe', 'dll', 'dmg', 'png', 'jpg', 'jpeg', 'gif', 'heic', 'sqlite', 'db'].includes(ext)
}

function normalizeHeader(header: string): string {
  return header.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase()
}

function hasPrefix(headers: ReadonlySet<string>, prefix: string): boolean {
  for (const header of headers) {
    if (header.startsWith(prefix)) return true
  }
  return false
}

function firstContentLine(text: string): string {
  return text.split(/\r?\n/).find((line) => line.trim()) ?? ''
}

function textOriginalKindForExtension(ext: string): MigrationOriginalFileKind | null {
  switch (ext) {
    case 'csv':
    case 'tsv':
    case 'txt':
    case 'json':
      return ext
    default:
      return null
  }
}

function isCandidate(value: Candidate | null): value is Candidate {
  return value !== null
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function canon(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function extractState(value: string): string {
  return /,\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/.exec(value)?.[1] ?? ''
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.includes(',') ? (result.split(',')[1] ?? '') : result)
    })
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Could not read file.'))
    })
    reader.readAsDataURL(file)
  })
}
