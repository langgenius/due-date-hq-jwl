/**
 * Tabular parser for the Migration Copilot Step 1 Intake.
 *
 * Authority:
 *   - docs/product-design/migration-copilot/02-ux-4step-wizard.md §4 (Step 1)
 *   - PRD §0.3 铁律 2 — bad rows MUST NOT block good rows
 *
 * Supported formats:
 *   - CSV / TSV — pure-TS implementation (no third-party dep)
 *   - Pasted text — same path as CSV (auto-detect delimiter from header line)
 *   - XLSX — not yet supported; throws TabularParseError with code='xlsx_not_supported'
 *     so the UI can surface the canonical "Try exporting as CSV" banner.
 *
 * Behavior:
 *   - Hard ceiling at 1000 data rows; rows beyond are dropped and `truncated=true`
 *   - Bad rows (uneven width vs header) are kept with the available cells; the
 *     deterministic-checks layer flags them via migration_error so good rows
 *     stay non-blocked
 *   - First non-empty line is treated as the header
 *   - An unbalanced/unterminated double-quote does NOT swallow the rest of the
 *     file. A well-formed file is parsed with RFC 4180 quoting; if a quoted
 *     field runs to EOF without a closing quote (a malformed export), the whole
 *     input is re-parsed with quotes treated as literal characters so the good
 *     rows are recovered instead of collapsing into a single header record.
 *     (PRD §0.3 铁律 2 — one bad quote MUST NOT block every good row.)
 *
 * NOTE: zero IO, zero infrastructure deps — packages/core invariant.
 */

export const MAX_ROWS = 1000

export type TabularParseErrorCode =
  | 'empty_input'
  | 'no_data_rows'
  | 'xlsx_not_supported'
  | 'unsupported_content_type'

export class TabularParseError extends Error {
  public readonly code: TabularParseErrorCode
  constructor(code: TabularParseErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'TabularParseError'
  }
}

export type TabularKind = 'csv' | 'tsv' | 'paste' | 'xlsx'

export interface ParseTabularOptions {
  /**
   * Hint about the source. CSV / TSV use the matching delimiter; paste auto-
   * detects from the header line; xlsx is currently rejected (see above).
   */
  kind?: TabularKind
  /** Optional cap < MAX_ROWS for tests / smaller demo profiles. */
  maxRows?: number
}

export interface ParsedTabular {
  headers: string[]
  rows: string[][]
  /** Total non-empty data lines parsed (before truncation). */
  rowCount: number
  /** True when the input had more than `maxRows` data rows and we dropped some. */
  truncated: boolean
  /** The delimiter that was actually used. */
  delimiter: ',' | '\t'
}

const DEFAULT_DELIMITER: ',' | '\t' = ','

function pickDelimiter(headerLine: string): ',' | '\t' {
  // Tab present and more than one column → TSV. Otherwise default to CSV;
  // the tokenizer treats "no delimiter found" as a single-column row, which
  // is what the user expects for a one-column paste.
  return headerLine.includes('\t') ? '\t' : DEFAULT_DELIMITER
}

/**
 * Tokenize one logical CSV/TSV record, honoring RFC 4180 quoting rules
 * (double-quote = escape inside a quoted field).
 *
 * The function returns the cell array AND the number of characters it
 * consumed so the outer loop can step over multi-line quoted fields. We
 * intentionally avoid splitting on `\n` first because a quoted cell may
 * legally contain CRLF.
 *
 * When `quotesAsLiteral` is true the tokenizer ignores quoting entirely and
 * treats `"` as an ordinary character — the recovery mode used after a
 * malformed (unterminated) quote is detected on the first pass.
 *
 * `unterminated` is set when the record ended at EOF while still inside an
 * open quoted field. That is the signature of a stray/unbalanced quote that
 * would otherwise swallow every following row into one cell.
 */
function tokenizeRecord(
  source: string,
  start: number,
  delimiter: ',' | '\t',
  quotesAsLiteral: boolean,
): { cells: string[]; nextIndex: number; unterminated: boolean } {
  const cells: string[] = []
  let i = start
  let cell = ''
  let quoted = false

  while (i < source.length) {
    const ch = source[i]

    if (quoted) {
      if (ch === '"') {
        // Escaped quote inside a quoted cell ("") → literal "
        if (source[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        quoted = false
        i += 1
        continue
      }
      cell += ch
      i += 1
      continue
    }

    if (!quotesAsLiteral && ch === '"' && cell === '') {
      quoted = true
      i += 1
      continue
    }

    if (ch === delimiter) {
      cells.push(cell)
      cell = ''
      i += 1
      continue
    }

    if (ch === '\r' || ch === '\n') {
      // Consume the full \r\n / \n / \r record terminator and return.
      cells.push(cell)
      let next = i + 1
      if (ch === '\r' && source[next] === '\n') next += 1
      return { cells, nextIndex: next, unterminated: false }
    }

    cell += ch
    i += 1
  }

  cells.push(cell)
  return { cells, nextIndex: i, unterminated: quoted }
}

function isEmptyRecord(cells: string[]): boolean {
  return cells.every((c) => c.trim() === '')
}

interface TokenizedRecords {
  records: string[][]
  /** True when any record ended at EOF inside an open quoted field. */
  unterminated: boolean
}

function tokenizeAll(text: string, delimiter: ',' | '\t', quotesAsLiteral: boolean): TokenizedRecords {
  let cursor = 0
  const records: string[][] = []
  let unterminated = false

  while (cursor < text.length) {
    const record = tokenizeRecord(text, cursor, delimiter, quotesAsLiteral)
    cursor = record.nextIndex
    if (record.unterminated) unterminated = true
    if (!isEmptyRecord(record.cells)) records.push(record.cells)
  }

  return { records, unterminated }
}

function parseDelimited(text: string, maxRows: number): ParsedTabular {
  if (text.length === 0) {
    throw new TabularParseError('empty_input', 'Input is empty.')
  }

  // Determine delimiter using the first physical line that contains content.
  const firstLineEnd = text.search(/\r?\n/)
  const headerProbe = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd)
  const delimiter = pickDelimiter(headerProbe)

  // First pass honors RFC 4180 quoting. If a quoted field runs to EOF without
  // a closing quote, a stray/unbalanced quote has swallowed the rest of the
  // file into one record — re-parse with quotes treated as literal text so the
  // good rows survive instead of collapsing into a single header cell.
  let { records, unterminated } = tokenizeAll(text, delimiter, false)
  if (unterminated) {
    records = tokenizeAll(text, delimiter, true).records
  }

  let headers: string[] | null = null
  const rows: string[][] = []
  let rowCount = 0
  let truncated = false

  for (const cells of records) {
    if (!headers) {
      headers = cells.map((c) => c.trim())
      continue
    }

    rowCount += 1
    if (rows.length >= maxRows) {
      truncated = true
      continue
    }
    rows.push(cells)
  }

  if (!headers) {
    throw new TabularParseError('no_data_rows', 'No header row found in the input.')
  }

  return {
    headers,
    rows,
    rowCount,
    truncated,
    delimiter,
  }
}

/**
 * Public entry point. `input` may be a string (paste / CSV / TSV) or an
 * `ArrayBuffer` (file upload — UTF-8 decoded if `kind` is csv/tsv/paste).
 */
export function parseTabular(
  input: string | ArrayBuffer,
  opts: ParseTabularOptions = {},
): ParsedTabular {
  const kind = opts.kind ?? 'csv'
  const maxRows = opts.maxRows ?? MAX_ROWS

  if (kind === 'xlsx') {
    throw new TabularParseError(
      'xlsx_not_supported',
      'XLSX is not yet supported in Demo Sprint. Export as CSV and re-upload.',
    )
  }

  if (kind !== 'csv' && kind !== 'tsv' && kind !== 'paste') {
    throw new TabularParseError(
      'unsupported_content_type',
      `Unsupported tabular kind: ${kind as string}.`,
    )
  }

  const text =
    typeof input === 'string' ? input : new TextDecoder('utf-8', { fatal: false }).decode(input)

  return parseDelimited(text, maxRows)
}
