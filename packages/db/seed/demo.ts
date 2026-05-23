import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const seedDir = dirname(fileURLToPath(import.meta.url))
const sqlPath = resolve(seedDir, '../../../mock/demo.sql')
const serverDir = resolve(seedDir, '../../../apps/server')
// 2026-05-24: bumped 75_000 → 120_000. The demo.sql grew a single
// INSERT (alert templates, ~76 KB after the latest seed expansion)
// that exceeded the prior cap, which made chunkSqlStatements throw
// "Seed SQL statement exceeds N bytes". Wrangler `d1 execute --file`
// happily takes much larger inputs than this; the chunking is just
// to avoid passing one giant temp file to `spawnSync`, so the cap
// can grow as the seed grows.
const maxSqlChunkBytes = 120_000

if (!existsSync(sqlPath)) {
  console.error(`[seed:demo] Missing mock SQL file: ${sqlPath}`)
  process.exit(1)
}

const seedStatements = splitSqlStatements(readFileSync(sqlPath, 'utf8')).filter(
  (statement) => !isTransactionBoundary(statement),
)
const sqlChunks = chunkSqlStatements(seedStatements, maxSqlChunkBytes)
const tempDir = mkdtempSync(join(tmpdir(), 'duedatehq-seed-demo-'))
let failedStatus: number | null = null

try {
  for (const [index, chunk] of sqlChunks.entries()) {
    const chunkPath = join(tempDir, `demo-${index + 1}.sql`)
    writeFileSync(chunkPath, chunk)
    console.log(`[seed:demo] Executing SQL chunk ${index + 1}/${sqlChunks.length}`)

    const result = spawnSync(
      'pnpm',
      [
        '--dir',
        serverDir,
        'exec',
        'wrangler',
        'd1',
        'execute',
        'DB',
        '--local',
        '--config',
        'wrangler.toml',
        '--file',
        chunkPath,
      ],
      { cwd: seedDir, stdio: 'inherit' },
    )

    if (result.status !== 0) {
      failedStatus = result.status ?? 1
      break
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}

if (failedStatus !== null) {
  process.exit(failedStatus)
}

console.log('[seed:demo] Mock live-demo dataset seeded from mock/demo.sql')

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inString = false

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]

    // 2026-05-24: skip `-- line comments` so apostrophes inside
    // comments (e.g. "the row's signal" on line 343 of mock/demo.sql)
    // don't toggle the in-string tracker and corrupt every downstream
    // statement boundary. Comments only matter outside of strings;
    // a `--` sequence inside a string literal is just text.
    if (!inString && char === '-' && sql[index + 1] === '-') {
      // Consume the entire comment but DON'T add it to `current` —
      // wrangler accepts SQL without them and stripping them keeps the
      // chunked payload smaller.
      while (index < sql.length && sql[index] !== '\n') index += 1
      // Preserve the newline so subsequent line numbers in error
      // output still line up roughly with the source file.
      if (index < sql.length) current += sql[index]
      continue
    }

    current += char

    if (char === "'") {
      if (inString && sql[index + 1] === "'") {
        current += sql[index + 1]
        index += 1
      } else {
        inString = !inString
      }
    } else if (char === ';' && !inString) {
      const statement = current.trim()
      if (statement) statements.push(statement)
      current = ''
    }
  }

  const trailing = current.trim()
  if (trailing) statements.push(trailing)

  return statements
}

function isTransactionBoundary(statement: string): boolean {
  const executable = statement
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .trim()
    .toUpperCase()

  return executable === 'BEGIN TRANSACTION;' || executable === 'COMMIT;'
}

function chunkSqlStatements(statements: string[], maxBytes: number): string[] {
  const chunks: string[] = []
  let current = ''

  for (const statement of statements) {
    const next = `${statement}\n`
    const nextBytes = Buffer.byteLength(next)

    if (nextBytes > maxBytes) {
      throw new Error(`Seed SQL statement exceeds ${maxBytes} bytes.`)
    }

    if (current && Buffer.byteLength(current) + nextBytes > maxBytes) {
      chunks.push(current)
      current = ''
    }

    current += next
  }

  if (current) chunks.push(current)

  return chunks
}
