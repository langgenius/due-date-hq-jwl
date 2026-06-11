import { describe, expect, it } from 'vitest'
import { DEFAULT_REMINDER_TEMPLATES, renderReminderTemplate } from './reminders'

describe('renderReminderTemplate', () => {
  it('renders supported variables in subject and body text', () => {
    const rendered = renderReminderTemplate(
      {
        subject: '{{client_name}}: {{tax_type}} due {{due_date}}',
        bodyText: '{{tax_type}} is due {{due_date}}. Open {{obligation_url}}.',
      },
      {
        client_name: 'Acme LLC',
        tax_type: 'Federal 1120S',
        due_date: '2026-09-15',
        obligation_url: '/obligations?obligation=obl_123',
      },
    )

    expect(rendered).toEqual({
      subject: 'Acme LLC: Federal 1120S due 2026-09-15',
      text: 'Federal 1120S is due 2026-09-15. Open /obligations?obligation=obl_123.',
    })
  })

  it('renders materials checklist variables for readiness requests', () => {
    const rendered = renderReminderTemplate(
      {
        subject: '{{client_name}} materials',
        bodyText:
          'Open {{request_url}}\n\nOutstanding:\n{{outstanding_checklist}}\n\nReceived:\n{{received_checklist}}',
      },
      {
        client_name: 'Acme LLC',
        request_url: 'https://app.test/readiness/token',
        outstanding_checklist: '- K-1 package',
        received_checklist: '- Prior-year return',
      },
    )

    expect(rendered).toEqual({
      subject: 'Acme LLC materials',
      text: [
        'Open https://app.test/readiness/token',
        '',
        'Outstanding:',
        '- K-1 package',
        '',
        'Received:',
        '- Prior-year return',
      ].join('\n'),
    })
  })

  it('ships a default client materials request template', () => {
    expect(DEFAULT_REMINDER_TEMPLATES).toContainEqual(
      expect.objectContaining({
        templateKey: 'client-materials-request',
        kind: 'readiness_request',
        name: 'Client checklist collection email',
        subject: '{{client_name}}: secure materials request for {{tax_type}}',
        active: true,
      }),
    )
  })

  it('ships default deadline countdown templates for the 30 and 7-day windows', () => {
    expect(DEFAULT_REMINDER_TEMPLATES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          templateKey: 'client-deadline-30-day-reminder',
          name: '30-day client deadline countdown email',
          subject: '{{client_name}}: {{tax_type}} due in 30 days',
        }),
        expect.objectContaining({
          templateKey: 'client-deadline-7-day-reminder',
          name: '7-day client deadline countdown email',
          subject: '{{client_name}}: {{tax_type}} due in 7 days',
        }),
      ]),
    )
  })
})
