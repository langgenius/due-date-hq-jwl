/**
 * PII guard — the hard safety boundary for a tax product.
 *
 * DueDateHQ handles SSNs, EINs, client names, and contact info. NONE of that
 * may ever reach Amplitude. Every property bag passes through `sanitize()`
 * before send: keys whose tokens name a PII field are dropped, and string
 * values that *look* like an SSN/EIN/email/phone are dropped even under an
 * innocuous key (defense in depth against accidental pass-through).
 *
 * Design: drop, never redact-in-place — a dropped key is unambiguous in
 * Amplitude; a "[redacted]" string still leaks that the field existed and
 * invites someone to "fix" it by sending the real value.
 */
import type { AnalyticsProperties, AnalyticsScalar } from './events'

// snake_case / camelCase keys are tokenized on non-alphanumerics AND camelCase
// humps, then each token is checked against this set. Token-based (not
// substring) so "routing" doesn't trip "tin" and "filing_type" is fine.
const BLOCKED_KEY_TOKENS = new Set<string>([
  'email',
  'mail',
  'name', // firm_name, client_name, first_name, last_name, full_name…
  'firstname',
  'lastname',
  'fullname',
  'username',
  'ssn',
  'ein',
  'tin',
  'taxid',
  'phone',
  'mobile',
  'fax',
  'address',
  'street',
  'city',
  'zip',
  'zipcode',
  'postal',
  'dob',
  'birthdate',
  'password',
  'secret',
  'token',
])

const SSN_RE = /\b\d{3}-?\d{2}-?\d{4}\b/
const EIN_RE = /\b\d{2}-\d{7}\b/
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/

function tokenize(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase humps
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function keyNamesPii(key: string): boolean {
  return tokenize(key).some((token) => BLOCKED_KEY_TOKENS.has(token))
}

function valueLooksLikePii(value: string): boolean {
  return SSN_RE.test(value) || EIN_RE.test(value) || EMAIL_RE.test(value) || PHONE_RE.test(value)
}

/**
 * Returns a new property bag with PII keys/values removed and `null`/`undefined`
 * dropped. The result is safe to hand to Amplitude. Array values are kept as-is
 * (we only ever pass enum/category arrays like `filter_types`); string elements
 * are not deep-scanned because no array call site carries free text.
 */
export function sanitizeProperties(
  input: AnalyticsProperties | undefined,
): Record<string, AnalyticsScalar> {
  const out: Record<string, AnalyticsScalar> = {}
  if (!input) return out
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue
    if (keyNamesPii(key)) continue
    if (typeof value === 'string' && valueLooksLikePii(value)) continue
    out[key] = value
  }
  return out
}
