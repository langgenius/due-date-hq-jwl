import { describe, expect, it } from 'vitest'
import { MAX_ROWS, parseTabular, TabularParseError } from './index'

describe('parseTabular', () => {
  it('parses a basic CSV with header and rows', () => {
    const csv = 'name,ein\nAcme LLC,12-3456789\nBright Studio,98-7654321'
    const result = parseTabular(csv)
    expect(result.headers).toEqual(['name', 'ein'])
    expect(result.rows).toEqual([
      ['Acme LLC', '12-3456789'],
      ['Bright Studio', '98-7654321'],
    ])
    expect(result.rowCount).toBe(2)
    expect(result.truncated).toBe(false)
    expect(result.delimiter).toBe(',')
  })

  it('handles quoted fields containing commas, quotes, and newlines', () => {
    const csv = 'name,notes\n"Acme, LLC","She said ""hi"".\nLine 2"\nBright,plain'
    const result = parseTabular(csv)
    expect(result.headers).toEqual(['name', 'notes'])
    expect(result.rows).toEqual([
      ['Acme, LLC', 'She said "hi".\nLine 2'],
      ['Bright', 'plain'],
    ])
    expect(result.rowCount).toBe(2)
  })

  it('recovers rows when an unbalanced quote in the header would swallow the file', () => {
    // A stray opening quote in the header (malformed export) used to open a
    // quoted field that ran to EOF, absorbing every data row into the header
    // cell and reporting 0 data rows. PRD §0.3 铁律 2: one bad quote MUST NOT
    // block every good row — we re-parse leniently and keep the rows.
    const csv = 'Name,"Address\nAcme,123 Main St\nBeta,456 Oak Ave'
    const result = parseTabular(csv, { kind: 'paste' })
    expect(result.headers).toEqual(['Name', '"Address'])
    expect(result.rowCount).toBe(2)
    expect(result.rows).toEqual([
      ['Acme', '123 Main St'],
      ['Beta', '456 Oak Ave'],
    ])
  })

  it('recovers rows when an unbalanced quote appears mid-file', () => {
    const csv = 'Name,Note\nAcme,"oops\nBeta,fine\nGamma,ok'
    const result = parseTabular(csv, { kind: 'paste' })
    expect(result.headers).toEqual(['Name', 'Note'])
    expect(result.rowCount).toBe(3)
  })

  it('treats the first line with content as the header even when blank lines lead', () => {
    const csv = '\n\nname,ein\nAcme LLC,12-3456789\n'
    const result = parseTabular(csv)
    expect(result.headers).toEqual(['name', 'ein'])
    expect(result.rows).toHaveLength(1)
  })

  it('detects TSV when the header line contains tabs', () => {
    const tsv = 'name\tein\nAcme LLC\t12-3456789'
    const result = parseTabular(tsv, { kind: 'paste' })
    expect(result.delimiter).toBe('\t')
    expect(result.rows[0]).toEqual(['Acme LLC', '12-3456789'])
  })

  it('handles CRLF line endings', () => {
    const csv = 'name,ein\r\nAcme LLC,12-3456789\r\nBright Studio,98-7654321\r\n'
    const result = parseTabular(csv)
    expect(result.rows).toHaveLength(2)
  })

  it('keeps short / long rows so deterministic checks can flag them later', () => {
    const csv = 'name,ein,state\nAcme LLC,12-3456789\nBright,98-7654321,CA,extra'
    const result = parseTabular(csv)
    expect(result.headers).toEqual(['name', 'ein', 'state'])
    expect(result.rows).toEqual([
      ['Acme LLC', '12-3456789'],
      ['Bright', '98-7654321', 'CA', 'extra'],
    ])
  })

  it('truncates above MAX_ROWS and reports rowCount unchanged', () => {
    const lines = ['name,ein']
    for (let i = 0; i < MAX_ROWS + 5; i += 1) {
      lines.push(`Client ${i},12-345${String(i).padStart(4, '0')}`)
    }
    const result = parseTabular(lines.join('\n'))
    expect(result.rows).toHaveLength(MAX_ROWS)
    expect(result.rowCount).toBe(MAX_ROWS + 5)
    expect(result.truncated).toBe(true)
  })

  it('honors a custom maxRows for testing', () => {
    const csv = 'name\nA\nB\nC\nD'
    const result = parseTabular(csv, { maxRows: 2 })
    expect(result.rows).toHaveLength(2)
    expect(result.rowCount).toBe(4)
    expect(result.truncated).toBe(true)
  })

  it('decodes ArrayBuffer input as UTF-8', () => {
    const csv = 'name,ein\n中文公司,12-3456789'
    const buf = new TextEncoder().encode(csv).buffer
    const result = parseTabular(buf)
    expect(result.rows[0]).toEqual(['中文公司', '12-3456789'])
  })

  it('throws TabularParseError on empty input', () => {
    expect(() => parseTabular('')).toThrow(TabularParseError)
  })

  it('throws xlsx_not_supported when kind=xlsx', () => {
    let caught: unknown = null
    try {
      parseTabular('whatever', { kind: 'xlsx' })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(TabularParseError)
    if (caught instanceof TabularParseError) {
      expect(caught.code).toBe('xlsx_not_supported')
    }
  })
})
