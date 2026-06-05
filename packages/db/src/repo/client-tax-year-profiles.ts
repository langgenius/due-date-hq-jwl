import { and, asc, eq, inArray } from 'drizzle-orm'
import type {
  ClientTaxYearProfileRow,
  ClientTaxYearProfileUpsertInput,
} from '@duedatehq/ports/client-tax-year-profile'
import type { Db } from '../client'
import { clientTaxYearProfile } from '../schema/client-tax-year-profile'

const CLIENT_ASSERT_BATCH_SIZE = 90

export function makeClientTaxYearProfilesRepo(db: Db, firmId: string) {
  return {
    firmId,

    async listByClient(clientId: string): Promise<ClientTaxYearProfileRow[]> {
      return db
        .select()
        .from(clientTaxYearProfile)
        .where(
          and(
            eq(clientTaxYearProfile.firmId, firmId),
            eq(clientTaxYearProfile.clientId, clientId),
          ),
        )
        .orderBy(asc(clientTaxYearProfile.taxYear))
    },

    async listByClients(
      clientIds: string[],
    ): Promise<Map<string, ClientTaxYearProfileRow[]>> {
      const result = new Map<string, ClientTaxYearProfileRow[]>()
      const unique = [...new Set(clientIds)]
      for (const id of unique) result.set(id, [])
      if (unique.length === 0) return result
      const reads = []
      for (let i = 0; i < unique.length; i += CLIENT_ASSERT_BATCH_SIZE) {
        const chunk = unique.slice(i, i + CLIENT_ASSERT_BATCH_SIZE)
        reads.push(
          db
            .select()
            .from(clientTaxYearProfile)
            .where(
              and(
                eq(clientTaxYearProfile.firmId, firmId),
                inArray(clientTaxYearProfile.clientId, chunk),
              ),
            )
            .orderBy(asc(clientTaxYearProfile.taxYear)),
        )
      }
      for (const row of (await Promise.all(reads)).flat()) {
        result.get(row.clientId)?.push(row)
      }
      return result
    },

    // Upsert on the (client_id, tax_year) unique key. Firm-scoped: a row is
    // only updated when it belongs to this firm; otherwise a fresh row is
    // inserted (the unique index still guards against cross-firm collisions
    // because client_id is firm-owned).
    async upsert(input: ClientTaxYearProfileUpsertInput): Promise<void> {
      const existing = await db
        .select({ id: clientTaxYearProfile.id })
        .from(clientTaxYearProfile)
        .where(
          and(
            eq(clientTaxYearProfile.firmId, firmId),
            eq(clientTaxYearProfile.clientId, input.clientId),
            eq(clientTaxYearProfile.taxYear, input.taxYear),
          ),
        )
        .limit(1)
      if (existing[0]) {
        await db
          .update(clientTaxYearProfile)
          .set({
            entityType: input.entityType,
            taxClassification: input.taxClassification ?? null,
            ...(input.source ? { source: input.source } : {}),
          })
          .where(
            and(
              eq(clientTaxYearProfile.firmId, firmId),
              eq(clientTaxYearProfile.id, existing[0].id),
            ),
          )
        return
      }
      await db.insert(clientTaxYearProfile).values({
        id: crypto.randomUUID(),
        firmId,
        clientId: input.clientId,
        taxYear: input.taxYear,
        entityType: input.entityType,
        taxClassification: input.taxClassification ?? null,
        source: input.source ?? 'manual',
      })
    },
  }
}

export type ClientTaxYearProfilesRepoImpl = ReturnType<typeof makeClientTaxYearProfilesRepo>
