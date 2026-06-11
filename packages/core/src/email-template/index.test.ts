import { describe, expect, it } from 'vitest'
import {
  renderTemplate,
  signatureReminderVars,
  SIGNATURE_REMINDER_BODY_TEMPLATE,
  SIGNATURE_REMINDER_SUBJECT_TEMPLATE,
  SIGNATURE_REMINDER_TOKENS,
} from './index'

describe('renderTemplate', () => {
  it('substitutes every token present in vars', () => {
    expect(
      renderTemplate('Hi {{client_name}}, sign your {{form}}.', {
        client_name: 'Acme LLC',
        form: 'Form 1120-S',
      }),
    ).toBe('Hi Acme LLC, sign your Form 1120-S.')
  })

  it('collapses the whitespace gap an empty value leaves behind', () => {
    // The load-bearing edge: no tax year must not leave a double space.
    expect(
      renderTemplate('your {{tax_year}} {{form}} return', { tax_year: '', form: '1120-S' }),
    ).toBe('your 1120-S return')
    expect(
      renderTemplate('your {{tax_year}} {{form}} return', { tax_year: '2026', form: '1120-S' }),
    ).toBe('your 2026 1120-S return')
  })

  it('trims trailing spaces left by an empty token at line end', () => {
    expect(renderTemplate('Filed for {{tax_year}}', { tax_year: '' })).toBe('Filed for')
  })

  it('preserves newlines while collapsing intra-line runs', () => {
    expect(renderTemplate('line  one\nline   two', {})).toBe('line one\nline two')
  })

  it('resolves unknown tokens to an empty string (defensive)', () => {
    expect(renderTemplate('a {{missing}} b', {})).toBe('a b')
  })
})

describe('signatureReminderVars', () => {
  it('stringifies the tax year and passes name/form through', () => {
    expect(
      signatureReminderVars({ clientName: 'Acme LLC', form: 'Form 1065', taxYear: 2025 }),
    ).toEqual({ client_name: 'Acme LLC', form: 'Form 1065', tax_year: '2025' })
  })

  it('maps a null tax year to an empty string', () => {
    expect(signatureReminderVars({ clientName: 'Acme', form: 'Form 1040', taxYear: null })).toEqual(
      {
        client_name: 'Acme',
        form: 'Form 1040',
        tax_year: '',
      },
    )
  })
})

describe('SIGNATURE_REMINDER_* defaults', () => {
  it('reproduce the legacy resolved copy byte-for-byte', () => {
    const vars = signatureReminderVars({
      clientName: 'Bright Studio S-Corp',
      form: 'Form 1120-S',
      taxYear: 2025,
    })
    expect(renderTemplate(SIGNATURE_REMINDER_SUBJECT_TEMPLATE, vars)).toBe(
      'Signature needed: Form 8879 for your 2025 Form 1120-S return',
    )
    expect(renderTemplate(SIGNATURE_REMINDER_BODY_TEMPLATE, vars)).toBe(
      [
        'Hi Bright Studio S-Corp,',
        '',
        "Your 2025 Form 1120-S return needs your signature on Form 8879 (the e-file authorization). We can't file electronically until we have it.",
        '',
        "If you've already signed, thank you — no further action is needed. Otherwise, sign at your earliest convenience so we can file on time.",
        '',
        'Thank you.',
      ].join('\n'),
    )
  })

  it('drops the year cleanly when tax_year is empty', () => {
    const vars = signatureReminderVars({ clientName: 'Acme', form: 'Form 1065', taxYear: null })
    expect(renderTemplate(SIGNATURE_REMINDER_SUBJECT_TEMPLATE, vars)).toBe(
      'Signature needed: Form 8879 for your Form 1065 return',
    )
  })

  it('exposes the token list used by the editor helper', () => {
    expect(SIGNATURE_REMINDER_TOKENS).toEqual(['client_name', 'form', 'tax_year'])
  })
})
