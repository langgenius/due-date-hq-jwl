import { and, eq } from 'drizzle-orm'
import { authSchema, type Db } from '@duedatehq/db'

export type AuthSessionsRepo = ReturnType<typeof createAuthSessionsRepo>

export function createAuthSessionsRepo(db: Db) {
  return {
    async markTwoFactorVerified(token: string): Promise<void> {
      await db
        .update(authSchema.session)
        .set({ twoFactorVerified: true, updatedAt: new Date() })
        .where(eq(authSchema.session.token, token))
    },

    async deleteUnverifiedTwoFactorSetups(userId: string): Promise<void> {
      await db
        .delete(authSchema.twoFactor)
        .where(
          and(eq(authSchema.twoFactor.userId, userId), eq(authSchema.twoFactor.verified, false)),
        )
    },
  }
}
