import type { AuditActionCategory } from './shared'

// η pass — F-035 / F-036 / F-037. See packages/db/src/schema/audit.ts for
// the load-bearing comment block; this is the port-level mirror so
// downstream packages (server, jobs, tests) get the typed surface without
// reaching into the db package.
export type AuditActorType = 'user' | 'system' | 'ai' | 'ai_assisted'

export interface AiEventMetadata {
  model?: string
  promptVersion?: string
  inputTokens?: number
  outputTokens?: number
  latencyMs?: number
  guardStatus?: 'passed' | 'flagged' | 'blocked' | 'skipped'
  confidence?: number
  aiOutputId?: string
}

export interface AuditEventInput {
  firmId: string
  actorId: string | null
  actorType?: AuditActorType
  previousActorType?: AuditActorType | null
  aiEventMetadata?: AiEventMetadata | null
  entityType: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  reason?: string
  ipHash?: string
  userAgentHash?: string
}

export interface AuditEventRow {
  id: string
  firmId: string
  actorId: string | null
  actorType: AuditActorType
  previousActorType: AuditActorType | null
  aiEventMetadataJson: unknown
  entityType: string
  entityId: string
  action: string
  beforeJson: unknown
  afterJson: unknown
  reason: string | null
  ipHash: string | null
  userAgentHash: string | null
  createdAt: Date
}

export interface AuditListInput {
  search?: string
  category?: AuditActionCategory
  action?: string
  actorId?: string
  actorType?: AuditActorType | 'ai_any'
  entityType?: string
  entityId?: string
  range?: '24h' | '7d' | '30d' | 'all'
  cursor?: string | null
  limit?: number
}

export interface AuditListRow extends AuditEventRow {
  actorLabel: string | null
}

export interface AuditListResult {
  rows: AuditListRow[]
  nextCursor: string | null
}

export type AuditEvidencePackageStatus = 'pending' | 'running' | 'ready' | 'failed' | 'expired'
export type AuditEvidencePackageScope = 'firm' | 'client' | 'obligation' | 'migration'

export interface AuditEvidencePackageRow {
  id: string
  firmId: string
  exportedByUserId: string
  scope: AuditEvidencePackageScope
  scopeEntityId: string | null
  rangeStart: Date | null
  rangeEnd: Date | null
  fileCount: number
  fileManifestJson: unknown
  sha256Hash: string | null
  r2Key: string | null
  status: AuditEvidencePackageStatus
  expiresAt: Date | null
  failureReason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuditEvidencePackageCreateInput {
  exportedByUserId: string
  scope: AuditEvidencePackageScope
  scopeEntityId?: string | null
  rangeStart?: Date | null
  rangeEnd?: Date | null
  expiresAt: Date
}

export interface AuditEvidencePackageCompleteInput {
  packageId: string
  fileCount: number
  fileManifestJson: unknown
  sha256Hash: string
  r2Key: string
  expiresAt: Date
}

export interface AuditRepo {
  readonly firmId: string
  write(event: Omit<AuditEventInput, 'firmId'>): Promise<{ id: string }>
  writeBatch(events: Array<Omit<AuditEventInput, 'firmId'>>): Promise<{ ids: string[] }>
  listByFirm(opts?: { action?: string; actorId?: string; limit?: number }): Promise<AuditEventRow[]>
  list(input?: AuditListInput): Promise<AuditListResult>
  /**
   * Latest timestamp of `action` per entity for the given entity ids (one
   * bounded GROUP BY query). Entities with no matching event are absent from
   * the map. Powers the signature-reminder "last reminded" / "recently
   * reminded" checks without scanning the full audit table per list row.
   */
  latestByEntityIds(action: string, entityIds: string[]): Promise<Map<string, Date>>
  createEvidencePackage?(input: AuditEvidencePackageCreateInput): Promise<{ id: string }>
  getEvidencePackage?(id: string): Promise<AuditEvidencePackageRow | undefined>
  listEvidencePackages?(opts?: { limit?: number }): Promise<AuditEvidencePackageRow[]>
  markEvidencePackageRunning?(id: string): Promise<void>
  completeEvidencePackage?(input: AuditEvidencePackageCompleteInput): Promise<void>
  failEvidencePackage?(id: string, failureReason: string): Promise<void>
}
