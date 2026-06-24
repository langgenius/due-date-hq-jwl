import type { Db } from '../client'
import { marketingLead, type NewMarketingLead } from '../schema/marketing-lead'

export type CreateMarketingLeadInput = Omit<NewMarketingLead, 'createdAt' | 'id'> & {
  id?: string
}

export async function createMarketingLead(
  db: Db,
  input: CreateMarketingLeadInput,
): Promise<string> {
  const id = input.id ?? crypto.randomUUID()

  await db.insert(marketingLead).values({
    ...input,
    id,
  })

  return id
}
