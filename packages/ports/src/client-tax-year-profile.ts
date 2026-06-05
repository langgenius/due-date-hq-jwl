import type { ClientEntityType, ClientTaxClassification } from './shared'

export type ClientTaxYearProfileSource = 'manual' | 'reclassification' | 'backfill'

export interface ClientTaxYearProfileRow {
  id: string
  firmId: string
  clientId: string
  taxYear: number
  entityType: ClientEntityType
  taxClassification: ClientTaxClassification | null
  source: ClientTaxYearProfileSource
  createdAt: Date
  updatedAt: Date
}

export interface ClientTaxYearProfileUpsertInput {
  clientId: string
  taxYear: number
  entityType: ClientEntityType
  taxClassification?: ClientTaxClassification | null
  source?: ClientTaxYearProfileSource
}

/**
 * Per-(client, tax year) entity classification override. The scalar
 * `ClientRow.entityType` / `taxClassification` remain the current/default
 * pointer; a row here overrides classification for one tax year. Absence of a
 * row means "use the scalar", so an empty store is exactly today's behavior.
 */
export interface ClientTaxYearProfilesRepo {
  readonly firmId: string
  listByClient(clientId: string): Promise<ClientTaxYearProfileRow[]>
  listByClients(clientIds: string[]): Promise<Map<string, ClientTaxYearProfileRow[]>>
  upsert(input: ClientTaxYearProfileUpsertInput): Promise<void>
}
