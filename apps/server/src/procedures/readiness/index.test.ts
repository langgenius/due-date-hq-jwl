import { describe, expect, it, vi } from 'vitest'
import { reconcileChecklistForObligation, toPortalChecklist } from './index'

function publicChecklistItem(index: number) {
  const now = '2026-05-22T00:00:00.000Z'
  return {
    id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
    firmId: 'firm_1',
    obligationInstanceId: '22222222-2222-4222-8222-222222222222',
    label: `Document item ${index}`,
    description: `Description ${index}`,
    source: 'template' as const,
    status: 'missing' as const,
    sortOrder: index,
    note: null,
    receivedAt: null,
    receivedByUserId: null,
    createdByUserId: 'user_1',
    createdAt: now,
    updatedAt: now,
  }
}

describe('readiness procedure helpers', () => {
  it('maps the full portal checklist instead of truncating at eight items', () => {
    const checklist = Array.from({ length: 14 }, (_, index) => publicChecklistItem(index))

    expect(toPortalChecklist(checklist)).toHaveLength(14)
  })

  it('reconciles through the repository with versioned template metadata', async () => {
    const reconcileDocumentChecklistItems = vi.fn(async () => [])

    await reconcileChecklistForObligation({
      readiness: { reconcileDocumentChecklistItems },
      obligation: {
        id: 'obligation_1',
        taxType: 'federal_1040_estimated_tax',
        formName: '1040-ES',
        obligationType: 'payment',
        jurisdiction: 'FED',
      },
      client: {
        entityType: 'individual',
        state: 'CA',
      },
      userId: 'user_1',
      now: new Date('2026-05-22T00:00:00.000Z'),
    })

    expect(reconcileDocumentChecklistItems).toHaveBeenCalledWith(
      expect.objectContaining({
        obligationInstanceId: 'obligation_1',
        createdByUserId: 'user_1',
        template: expect.arrayContaining([
          expect.objectContaining({
            templateKey: 'estimated_tax.payment_voucher.prior_year_return',
            templateVersion: 1,
          }),
        ]),
      }),
    )
  })
})
