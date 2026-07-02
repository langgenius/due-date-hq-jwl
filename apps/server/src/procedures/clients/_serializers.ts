import type { ClientFilingProfilePublic, ClientPublic } from '@duedatehq/contracts'

/**
 * Drizzle row → contract schema serializer for `client`.
 *
 * Date columns are stored as `Date` objects in the repo layer; the contract
 * expects ISO-8601 strings. We centralise the conversion here so handlers
 * stay thin.
 */

export interface ClientRow {
  id: string
  firmId: string
  name: string
  ein: string | null
  state: string | null
  county: string | null
  entityType:
    | 'llc'
    | 's_corp'
    | 'partnership'
    | 'c_corp'
    | 'sole_prop'
    | 'trust'
    | 'individual'
    | 'other'
  legalEntity:
    | 'individual'
    | 'sole_proprietorship'
    | 'single_member_llc'
    | 'multi_member_llc'
    | 'partnership'
    | 'corporation'
    | 'trust'
    | 'estate'
    | 'nonprofit'
    | 'foreign_entity'
    | 'other'
    | null
  taxClassification:
    | 'individual'
    | 'disregarded_entity'
    | 'partnership'
    | 's_corp'
    | 'c_corp'
    | 'trust'
    | 'estate'
    | 'nonprofit'
    | 'foreign_reporting_company'
    | 'unknown'
    | null
  taxYearType: 'calendar' | 'fiscal'
  fiscalYearEndMonth: number | null
  fiscalYearEndDay: number | null
  externalClientId: string | null
  addressLine1: string | null
  city: string | null
  postalCode: string | null
  primaryPhone: string | null
  sourceStatus: string | null
  email: string | null
  notes: string | null
  assigneeId: string | null
  assigneeName: string | null
  ownerCount: number | null
  hasForeignAccounts: boolean
  hasPayroll: boolean
  hasSalesTax: boolean
  has1099Vendors: boolean
  hasK1Activity: boolean
  primaryContactName: string | null
  primaryContactEmail: string | null
  importanceWeight: number
  lateFilingCountLast12mo: number
  estimatedTaxLiabilityCents: number | null
  estimatedTaxLiabilitySource: 'manual' | 'imported' | 'demo_seed' | null
  equityOwnerCount: number | null
  migrationBatchId: string | null
  isSample?: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  // Reversible archive marker — distinct from deletedAt's purge path.
  // Optional so existing ClientRow test fixtures don't all need updating.
  archivedAt?: Date | null
}

export interface ClientCreateInputForRepo {
  id?: string
  name: string
  ein?: string | null
  state?: string | null
  county?: string | null
  entityType: ClientRow['entityType']
  legalEntity?: ClientRow['legalEntity']
  taxClassification?: ClientRow['taxClassification']
  taxYearType?: ClientRow['taxYearType']
  fiscalYearEndMonth?: number | null
  fiscalYearEndDay?: number | null
  externalClientId?: string | null
  addressLine1?: string | null
  city?: string | null
  postalCode?: string | null
  primaryPhone?: string | null
  sourceStatus?: string | null
  ownerCount?: number | null
  hasForeignAccounts?: boolean
  hasPayroll?: boolean
  hasSalesTax?: boolean
  has1099Vendors?: boolean
  hasK1Activity?: boolean
  primaryContactName?: string | null
  primaryContactEmail?: string | null
  email?: string | null
  notes?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  importanceWeight?: number
  lateFilingCountLast12mo?: number
  estimatedTaxLiabilityCents?: number | null
  estimatedTaxLiabilitySource?: 'manual' | 'imported' | 'demo_seed' | null
  equityOwnerCount?: number | null
  migrationBatchId?: string | null
}

export interface ClientFilingProfileRow {
  id: string
  firmId: string
  clientId: string
  state: string
  counties: string[]
  taxTypes: string[]
  isPrimary: boolean
  source: ClientFilingProfilePublic['source']
  migrationBatchId: string | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function toClientFilingProfilePublic(row: ClientFilingProfileRow): ClientFilingProfilePublic {
  return {
    id: row.id,
    firmId: row.firmId,
    clientId: row.clientId,
    state: row.state,
    counties: row.counties,
    taxTypes: row.taxTypes,
    isPrimary: row.isPrimary,
    source: row.source,
    migrationBatchId: row.migrationBatchId,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function toClientPublic(
  row: ClientRow,
  opts: { hideDollars?: boolean; filingProfiles?: ClientFilingProfileRow[] } = {},
): ClientPublic {
  return {
    id: row.id,
    firmId: row.firmId,
    name: row.name,
    ein: row.ein,
    state: row.state,
    county: row.county,
    entityType: row.entityType,
    legalEntity: row.legalEntity,
    taxClassification: row.taxClassification ?? 'unknown',
    taxYearType: row.taxYearType,
    fiscalYearEndMonth: row.fiscalYearEndMonth,
    fiscalYearEndDay: row.fiscalYearEndDay,
    externalClientId: row.externalClientId,
    addressLine1: row.addressLine1,
    city: row.city,
    postalCode: row.postalCode,
    primaryPhone: row.primaryPhone,
    sourceStatus: row.sourceStatus,
    email: row.email,
    notes: row.notes,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    ownerCount: row.ownerCount,
    hasForeignAccounts: row.hasForeignAccounts,
    hasPayroll: row.hasPayroll,
    hasSalesTax: row.hasSalesTax,
    has1099Vendors: row.has1099Vendors,
    hasK1Activity: row.hasK1Activity,
    primaryContactName: row.primaryContactName,
    primaryContactEmail: row.primaryContactEmail,
    importanceWeight: row.importanceWeight,
    lateFilingCountLast12mo: row.lateFilingCountLast12mo,
    estimatedTaxLiabilityCents: opts.hideDollars ? null : row.estimatedTaxLiabilityCents,
    estimatedTaxLiabilitySource: opts.hideDollars ? null : row.estimatedTaxLiabilitySource,
    equityOwnerCount: row.equityOwnerCount,
    migrationBatchId: row.migrationBatchId,
    isSample: row.isSample,
    filingProfiles: (opts.filingProfiles ?? []).map(toClientFilingProfilePublic),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  }
}
