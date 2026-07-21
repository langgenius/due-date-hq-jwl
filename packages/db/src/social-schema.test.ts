/* eslint-disable typescript-eslint/no-unsafe-type-assertion --
 * Drizzle stores enumValues on text columns at runtime but omits it from the
 * public AnySQLiteColumn type, matching the existing firm schema test pattern.
 */
import { describe, expect, it } from 'vitest'
import { getTableName } from 'drizzle-orm'
import { getTableConfig, SQLiteSyncDialect, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import {
  SOCIAL_ALERT_POST_STATUSES,
  SOCIAL_PUBLISH_RUN_STATUSES,
  socialAlertPost,
  socialPublishRun,
} from './schema/social'

function column(table: typeof socialAlertPost | typeof socialPublishRun, name: string) {
  const result = getTableConfig(table).columns.find((candidate) => candidate.name === name)
  if (!result) throw new Error(`${getTableConfig(table).name}.${name} is missing`)
  return result
}

describe('social Alert outbox schema', () => {
  it('locks down post statuses, the Pulse FK, and idempotency indexes', () => {
    const config = getTableConfig(socialAlertPost)
    const status = column(socialAlertPost, 'status') as AnySQLiteColumn & {
      enumValues?: readonly string[]
    }

    expect(status.enumValues).toEqual(SOCIAL_ALERT_POST_STATUSES)
    const pulseFk = config.foreignKeys.find((foreignKey) =>
      foreignKey.reference().columns.some((candidate) => candidate.name === 'pulse_id'),
    )
    expect(pulseFk).toBeDefined()
    expect(getTableName(pulseFk!.reference().foreignTable)).toBe('pulse')
    expect(pulseFk!.onDelete).toBe('restrict')
    expect(config.indexes.map((index) => index.config.name)).toEqual(
      expect.arrayContaining([
        'uq_social_alert_post_channel_pulse',
        'uq_social_alert_post_ref_token',
        'idx_social_alert_post_backlog',
      ]),
    )
    expect(config.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'ck_social_alert_post_status',
        'ck_social_alert_post_ref_token',
        'ck_social_alert_post_published_fields',
      ]),
    )
  })

  it('enforces one channel/day slot and keeps run history attached to its post', () => {
    const config = getTableConfig(socialPublishRun)
    const status = column(socialPublishRun, 'status') as AnySQLiteColumn & {
      enumValues?: readonly string[]
    }

    expect(status.enumValues).toEqual(SOCIAL_PUBLISH_RUN_STATUSES)
    const postFk = config.foreignKeys.find((foreignKey) =>
      foreignKey.reference().columns.some((candidate) => candidate.name === 'post_id'),
    )
    expect(postFk).toBeDefined()
    expect(getTableName(postFk!.reference().foreignTable)).toBe('social_alert_post')
    expect(postFk!.onDelete).toBe('restrict')
    expect(config.indexes.map((index) => index.config.name)).toEqual(
      expect.arrayContaining([
        'uq_social_publish_run_channel_date',
        'uq_social_publish_run_live_post',
        'idx_social_publish_run_status_time',
      ]),
    )
    const livePostIndex = config.indexes.find(
      (index) => index.config.name === 'uq_social_publish_run_live_post',
    )
    expect(livePostIndex?.config.where).toBeDefined()
    const predicate = new SQLiteSyncDialect().sqlToQuery(livePostIndex!.config.where!).sql
    expect(predicate).toContain("in ('queued', 'sending', 'published', 'unknown')")
    expect(predicate).not.toContain('failed')
    expect(predicate).not.toContain('draft_only')
    expect(config.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'ck_social_publish_run_status',
        'ck_social_publish_run_local_date',
        'ck_social_publish_run_sending_fields',
      ]),
    )
  })
})
