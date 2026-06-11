/**
 * Token-based email templates for client-facing reminders. The CPA edits a
 * template containing `{{placeholders}}`; the server substitutes them per
 * recipient on send (single reminder = one client, bulk = many). Keeping the
 * default copy AND the CPA's override on the same substitution path means
 * there's one rendering rule to reason about.
 *
 * No runtime / infrastructure deps — packages/core is pure TS.
 */

/** Replace a single `{{token}}` occurrence; unknown tokens collapse to "". */
const TOKEN_RE = /\{\{\s*(\w+)\s*\}\}/g

/**
 * Substitute `{{token}}` placeholders, then repair the whitespace gaps an
 * empty substitution leaves behind (e.g. "your {{tax_year}} {{form}}" with no
 * tax year must read "your Form 1120-S", not "your  Form 1120-S"). Collapses
 * runs of intra-line spaces/tabs to one and trims line-ends — never touches
 * newlines, so multi-line bodies keep their shape.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  const substituted = template.replace(TOKEN_RE, (_match, key: string) => vars[key] ?? '')
  return substituted
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/g, ''))
    .join('\n')
}

// ── Form 8879 signature reminder ────────────────────────────────────────────
// Tokenized version of the built-in nudge. Rendered with all tokens present
// it reproduces the previous inline copy byte-for-byte (regression-locked in
// the test) so existing emails don't drift.

export const SIGNATURE_REMINDER_TOKENS = ['client_name', 'form', 'tax_year'] as const
export type SignatureReminderToken = (typeof SIGNATURE_REMINDER_TOKENS)[number]

/**
 * Repeat-nudge guard: when a row was reminded within this many days, the UI
 * warns before re-sending (single dialog) and surfaces a recently-reminded
 * count + skip option (bulk dialog). Informational only — never hard-blocks an
 * explicit send.
 */
export const SIGNATURE_REMINDER_THROTTLE_DAYS = 3

export const SIGNATURE_REMINDER_SUBJECT_TEMPLATE =
  'Signature needed: Form 8879 for your {{tax_year}} {{form}} return'

export const SIGNATURE_REMINDER_BODY_TEMPLATE = [
  'Hi {{client_name}},',
  '',
  "Your {{tax_year}} {{form}} return needs your signature on Form 8879 (the e-file authorization). We can't file electronically until we have it.",
  '',
  "If you've already signed, thank you — no further action is needed. Otherwise, sign at your earliest convenience so we can file on time.",
  '',
  'Thank you.',
].join('\n')

/**
 * Build the substitution map for a single recipient. `form` is pre-resolved by
 * the caller (the friendly form label lives in `@duedatehq/core/tax-codes`,
 * which the server already depends on) so this module stays dependency-free
 * and the frontend can re-render the live preview from the same values.
 */
export function signatureReminderVars(input: {
  clientName: string
  form: string
  taxYear: number | null
}): Record<SignatureReminderToken, string> {
  return {
    client_name: input.clientName,
    form: input.form,
    tax_year: input.taxYear != null ? String(input.taxYear) : '',
  }
}
