import { and, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import type {
  RuleConcreteDraftCacheHealthInput,
  RuleConcreteDraftCacheInput,
} from '@duedatehq/ports/rule-concrete-drafts'
import type { Db } from '../client'
import { ruleConcreteDraft } from '../schema/ai'

const CONTEXT_REF_BATCH_SIZE = 90

function chunked<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = []
  for (let start = 0; start < values.length; start += size) {
    result.push(values.slice(start, start + size))
  }
  return result
}

export function makeRuleConcreteDraftRepo(db: Db) {
  async function listReadyContextRefs(input: RuleConcreteDraftCacheHealthInput): Promise<string[]> {
    const inputContextRefs = Array.from(new Set(input.inputContextRefs))
    if (inputContextRefs.length === 0) return []

    const rows = (
      await Promise.all(
        chunked(inputContextRefs, CONTEXT_REF_BATCH_SIZE).map((batch) =>
          db
            .select({
              inputContextRef: ruleConcreteDraft.inputContextRef,
              generatedAt: ruleConcreteDraft.generatedAt,
            })
            .from(ruleConcreteDraft)
            .where(
              and(
                inArray(ruleConcreteDraft.inputContextRef, batch),
                eq(ruleConcreteDraft.promptVersion, input.promptVersion),
                isNotNull(ruleConcreteDraft.outputText),
                isNotNull(ruleConcreteDraft.model),
                ne(ruleConcreteDraft.model, input.retiredModel),
              ),
            )
            .orderBy(desc(ruleConcreteDraft.generatedAt)),
        ),
      )
    ).flat()

    const latestByContext = new Set<string>()
    for (const row of rows) latestByContext.add(row.inputContextRef)
    return Array.from(latestByContext)
  }

  return {
    async upsert(input: RuleConcreteDraftCacheInput): Promise<void> {
      const now = new Date()
      await db
        .insert(ruleConcreteDraft)
        .values({
          aiOutputId: input.aiOutputId,
          firmId: input.firmId,
          userId: input.userId,
          inputContextRef: input.inputContextRef,
          inputHash: input.inputHash,
          promptVersion: input.promptVersion,
          model: input.model,
          ruleId: input.ruleId,
          ruleVersion: input.ruleVersion,
          sourceId: input.sourceId,
          sourceSignalId: input.sourceSignalId,
          sourceSnapshotId: input.sourceSnapshotId,
          sourceUrl: input.sourceUrl,
          sourceFetchedAt: input.sourceFetchedAt,
          sourcePublishedAt: input.sourcePublishedAt,
          sourceExcerpt: input.sourceExcerpt,
          sourceText: input.sourceText,
          outputText: input.outputText,
          citationsJson: input.citations,
          generatedAt: input.generatedAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: ruleConcreteDraft.aiOutputId,
          set: {
            firmId: input.firmId,
            userId: input.userId,
            inputContextRef: input.inputContextRef,
            inputHash: input.inputHash,
            promptVersion: input.promptVersion,
            model: input.model,
            ruleId: input.ruleId,
            ruleVersion: input.ruleVersion,
            sourceId: input.sourceId,
            sourceSignalId: input.sourceSignalId,
            sourceSnapshotId: input.sourceSnapshotId,
            sourceUrl: input.sourceUrl,
            sourceFetchedAt: input.sourceFetchedAt,
            sourcePublishedAt: input.sourcePublishedAt,
            sourceExcerpt: input.sourceExcerpt,
            sourceText: input.sourceText,
            outputText: input.outputText,
            citationsJson: input.citations,
            generatedAt: input.generatedAt,
            updatedAt: now,
          },
        })
    },

    listReadyContextRefs,

    async health(input: RuleConcreteDraftCacheHealthInput) {
      const uniqueRefs = Array.from(new Set(input.inputContextRefs))
      const readyContextRefs = await listReadyContextRefs(input)
      const ready = new Set(readyContextRefs)
      return {
        readyContextRefs,
        missingContextRefs: uniqueRefs.filter((ref) => !ready.has(ref)),
      }
    },
  }
}

export type RuleConcreteDraftRepo = ReturnType<typeof makeRuleConcreteDraftRepo>
