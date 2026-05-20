/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Focused procedure-context test doubles only implement fields the migration
 * staging helper reads.
 */
import { describe, expect, it, vi } from 'vitest'
import type { BillingPlan } from '@duedatehq/core/plan-entitlements'
import type { MigrationBatchRow, MigrationStagingRowInput } from '@duedatehq/ports/migration'
import type { ContextVars, Env } from '../../env'
import type { RpcContext } from '../_context'
import { stageExternalRowsForMigration } from './index'

function batch(overrides: Partial<MigrationBatchRow> = {}): MigrationBatchRow {
  const now = new Date('2026-05-03T00:00:00.000Z')
  return {
    id: 'batch_1',
    firmId: 'firm_1',
    userId: 'user_1',
    source: 'integration_karbon_api',
    rawInputR2Key: null,
    rawInputFileName: null,
    rawInputContentType: null,
    rawInputSizeBytes: null,
    mappingJson: null,
    presetUsed: null,
    rowCount: 0,
    successCount: 0,
    skippedCount: 0,
    aiGlobalConfidence: null,
    status: 'draft',
    appliedAt: null,
    revertExpiresAt: null,
    revertedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function contextFor(plan: BillingPlan = 'solo') {
  const stagedBatch = batch()
  const createStagingRows = vi.fn(async (_batchId: string, _rows: MigrationStagingRowInput[]) => 1)
  const updateBatch = vi.fn(async () => undefined)
  const auditWrite = vi.fn(async () => ({ id: 'audit_1' }))
  const findMembership = vi.fn(async () => ({
    id: 'member_1',
    organizationId: 'firm_1',
    userId: 'user_1',
    name: 'Alex Chen',
    email: 'alex@example.com',
    image: null,
    role: 'preparer' as const,
    status: 'active' as const,
    createdAt: new Date('2026-05-03T00:00:00.000Z'),
  }))

  const context: RpcContext = {
    env: { ENV: 'production' } as Env,
    request: new Request('https://app.test/rpc/migration/stageExternalRows'),
    vars: {
      requestId: 'req_1',
      tenantContext: {
        firmId: 'firm_1',
        timezone: 'America/New_York',
        plan,
        seatLimit: 1,
        status: 'active',
        internalDeadlineOffsetDays: 14,
        ownerUserId: 'user_owner',
        coordinatorCanSeeDollars: false,
      },
      userId: 'user_1',
      scoped: {
        firmId: 'firm_1',
        migration: {
          getBatch: vi.fn(async () => stagedBatch),
          createStagingRows,
          updateBatch,
        },
        audit: { write: auditWrite },
      } as unknown as NonNullable<ContextVars['scoped']>,
      members: {
        findMembership,
      } as unknown as NonNullable<ContextVars['members']>,
    },
  }

  return { context, createStagingRows, updateBatch, auditWrite }
}

describe('migration procedure gates', () => {
  it('allows Solo activation imports to stage provider rows', async () => {
    const { context, createStagingRows, updateBatch, auditWrite } = contextFor('solo')

    await expect(
      stageExternalRowsForMigration({
        context,
        batchId: 'batch_1',
        provider: 'karbon',
        rows: [
          {
            externalId: 'karbon-work-1001',
            externalEntityType: 'work_item',
            externalUrl: 'https://app.karbonhq.com/work/karbon-work-1001',
            rawJson: {
              'Organization Name': 'Acme Advisory LLC',
              State: 'CA',
              'Entity Type': 'LLC',
            },
          },
        ],
      }),
    ).resolves.toMatchObject({
      batch: { id: 'batch_1', source: 'integration_karbon_api' },
      rowCount: 1,
      headers: expect.arrayContaining(['External Provider', 'External ID', 'Organization Name']),
    })

    expect(createStagingRows).toHaveBeenCalledTimes(1)
    expect(updateBatch).toHaveBeenCalledWith(
      'batch_1',
      expect.objectContaining({
        rawInputContentType: 'application/json',
        status: 'mapping',
        rowCount: 1,
      }),
    )
    expect(auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'migration.staging_rows.created' }),
    )
  })
})
