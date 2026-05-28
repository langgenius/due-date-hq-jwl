export interface RuleConcreteDraftCacheInput {
  aiOutputId: string
  firmId: string | null
  userId: string | null
  inputContextRef: string
  inputHash: string
  promptVersion: string
  model: string
  ruleId: string
  ruleVersion: number
  sourceId: string
  sourceSnapshotId: string | null
  sourceUrl: string
  sourceFetchedAt: Date | null
  sourcePublishedAt: Date | null
  sourceExcerpt: string
  sourceText: string | null
  outputText: string
  citations: unknown
  generatedAt: Date
}

export interface RuleConcreteDraftCacheRow extends RuleConcreteDraftCacheInput {
  createdAt: Date
  updatedAt: Date
}

export interface RuleConcreteDraftCacheHealthInput {
  inputContextRefs: readonly string[]
  promptVersion: string
  retiredModel: string
}

export interface RuleConcreteDraftCacheHealth {
  readyContextRefs: string[]
  missingContextRefs: string[]
}

export interface RuleConcreteDraftRepo {
  upsert(input: RuleConcreteDraftCacheInput): Promise<void>
  listReadyContextRefs(input: RuleConcreteDraftCacheHealthInput): Promise<string[]>
  health(input: RuleConcreteDraftCacheHealthInput): Promise<RuleConcreteDraftCacheHealth>
}
