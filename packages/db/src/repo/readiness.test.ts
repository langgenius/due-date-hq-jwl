import { describe, expect, it } from 'vitest'
import {
  READINESS_CHECKLIST_ITEM_INSERT_BATCH_SIZE,
  chunkReadinessChecklistItemInsertRows,
  planReadinessDocumentChecklistReconciliation,
} from './readiness'

function template() {
  return [
    {
      templateKey: '1040.individual_return.w2_forms',
      templateVersion: 1,
      label: 'W-2 forms',
      description: 'All employer W-2s, corrected W-2s, and state wage statements for the tax year.',
      source: 'template' as const,
    },
    {
      templateKey: '1040.individual_return.1099_income',
      templateVersion: 1,
      label: '1099 income forms',
      description: '1099-NEC, 1099-MISC, 1099-K, INT, DIV, R, SSA, and other income forms.',
      source: 'template' as const,
    },
    {
      templateKey: '1040.individual_return.schedule_k1',
      templateVersion: 1,
      label: 'K-1 packages',
      description:
        'Partnership, S corporation, trust, and estate K-1 packages received by the taxpayer.',
      source: 'template' as const,
    },
  ]
}

function row(overrides: {
  id: string
  label: string
  description?: string | null
  templateKey?: string | null
  templateVersion?: number | null
  source?: 'template' | 'custom'
  sortOrder?: number
}) {
  return {
    id: overrides.id,
    label: overrides.label,
    description: overrides.description ?? null,
    templateKey: overrides.templateKey ?? null,
    templateVersion: overrides.templateVersion ?? null,
    source: overrides.source ?? 'template',
    sortOrder: overrides.sortOrder ?? 0,
  }
}

describe('readiness checklist reconciliation planning', () => {
  it('chunks checklist inserts to stay under D1 SQL variable limits', () => {
    const rows = Array.from({ length: 13 }, (_, index) => ({ id: `item-${index}` }))

    const chunks = chunkReadinessChecklistItemInsertRows(rows)

    // η pass: batch size recalibrated from 9 to 7 when AI-provenance
    // columns (origin / ai_generated_at / user_edited_at) raised the
    // per-row column count from 11 to 14. The D1 100-param ceiling is
    // unchanged.
    expect(READINESS_CHECKLIST_ITEM_INSERT_BATCH_SIZE).toBe(7)
    expect(chunks.map((chunk) => chunk.length)).toEqual([7, 6])
  })

  it('backfills missing catalog items into an old template checklist', () => {
    const plan = planReadinessDocumentChecklistReconciliation({
      existing: [
        row({
          id: 'old-w2',
          label: 'W-2 forms',
          description:
            'All employer W-2s, corrected W-2s, and state wage statements for the tax year.',
          sortOrder: 0,
        }),
      ],
      suppressions: [],
      template: template(),
    })

    expect(plan.updates).toEqual([
      {
        id: 'old-w2',
        templateKey: '1040.individual_return.w2_forms',
        templateVersion: 1,
        sortOrder: 0,
      },
    ])
    expect(plan.inserts.map((item) => item.templateKey)).toEqual([
      '1040.individual_return.1099_income',
      '1040.individual_return.schedule_k1',
    ])
  })

  it('recognizes legacy short-template labels when assigning template metadata', () => {
    const plan = planReadinessDocumentChecklistReconciliation({
      existing: [
        row({
          id: 'old-income',
          label: 'W-2, 1099, and income forms',
          description:
            'W-2s plus all 1099-NEC, 1099-MISC, 1099-K, interest, dividend, and SSA forms.',
          sortOrder: 0,
        }),
      ],
      suppressions: [],
      template: template(),
    })

    expect(plan.updates[0]).toEqual({
      id: 'old-income',
      templateKey: '1040.individual_return.w2_forms',
      templateVersion: 1,
      sortOrder: 0,
    })
    expect(plan.inserts.map((item) => item.templateKey)).toEqual([
      '1040.individual_return.1099_income',
      '1040.individual_return.schedule_k1',
    ])
  })

  it('preserves edited template rows and custom rows while sorting custom items after catalog items', () => {
    const plan = planReadinessDocumentChecklistReconciliation({
      existing: [
        row({
          id: 'edited-w2',
          label: 'Payroll W-2s - client uploaded partial set',
          description: 'CPA edited copy',
          templateKey: '1040.individual_return.w2_forms',
          templateVersion: 1,
          sortOrder: 5,
        }),
        row({
          id: 'custom',
          label: 'Signed engagement addendum',
          source: 'custom',
          sortOrder: 1,
        }),
      ],
      suppressions: [],
      template: template(),
    })

    expect(plan.updates).toEqual(
      expect.arrayContaining([
        {
          id: 'edited-w2',
          templateKey: '1040.individual_return.w2_forms',
          templateVersion: 1,
          sortOrder: 0,
        },
        {
          id: 'custom',
          templateKey: null,
          templateVersion: null,
          sortOrder: 3,
        },
      ]),
    )
    expect(plan.inserts.map((item) => item.templateKey)).toEqual([
      '1040.individual_return.1099_income',
      '1040.individual_return.schedule_k1',
    ])
  })

  it('does not reinsert suppressed template items', () => {
    const plan = planReadinessDocumentChecklistReconciliation({
      existing: [
        row({ id: 'w2', label: 'W-2 forms', templateKey: '1040.individual_return.w2_forms' }),
      ],
      suppressions: [{ templateKey: '1040.individual_return.1099_income' }],
      template: template(),
    })

    expect(plan.inserts.map((item) => item.templateKey)).toEqual([
      '1040.individual_return.schedule_k1',
    ])
    expect(plan.updates).toEqual([
      {
        id: 'w2',
        templateKey: '1040.individual_return.w2_forms',
        templateVersion: 1,
        sortOrder: 0,
      },
    ])
  })
})
