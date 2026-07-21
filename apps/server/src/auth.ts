import { createAuth } from '@duedatehq/auth'
import type { AuthEmailSender } from '@duedatehq/auth/email'
import { authSchema, createDb } from '@duedatehq/db'
import { Resend } from 'resend'
import { validateServerEnv, type Env, type ServerEnv } from './env'
import { buildBillingHooks } from './billing-hooks'
import { getRequestLocale } from './i18n/resolve'
import { translate } from './i18n/messages'
import {
  buildAllowUserToCreateOrganization,
  buildOrganizationHooks,
  buildOrganizationMembershipLimit,
} from './organization-hooks'
import { buildDatabaseHooks } from './session-hooks'
import { getAuthContinue } from './auth-continuation'

type WaitUntilContext = {
  waitUntil(promise: Promise<unknown>): void
}

function absoluteUrl(env: ServerEnv, pathOrUrl: string): string {
  return new URL(pathOrUrl, env.APP_URL).toString()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function createEmailSender(env: ServerEnv): AuthEmailSender {
  async function sendEmail(input: {
    to: string
    subject: string
    html: string
    idempotencyKey?: string
  }): Promise<void> {
    if (!env.RESEND_API_KEY) {
      if (env.ENV === 'development') {
        console.info(`[auth-email] ${input.subject} -> ${input.to}`)
        return
      }
      throw new Error('RESEND_API_KEY is required to send auth email')
    }

    const resend = new Resend(env.RESEND_API_KEY)
    const payload = {
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }
    const { error } = await resend.emails.send(
      payload,
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    )

    if (error) {
      throw new Error(`Resend email failed: ${error.message}`)
    }
  }

  return {
    async sendInvitationEmail(message) {
      const url = absoluteUrl(env, message.url)
      const locale = getRequestLocale()
      const vars = {
        organizationName: escapeHtml(message.organizationName),
        inviterName: escapeHtml(message.inviterName),
        role: escapeHtml(message.role),
      }
      const subject = translate(locale, 'invitation.subject', {
        organizationName: message.organizationName,
      })
      const body = translate(locale, 'invitation.body', vars)
      const cta = translate(locale, 'invitation.cta')
      await sendEmail({
        to: message.to,
        subject,
        idempotencyKey: `auth-invitation/${message.invitationId}`,
        html: `<p>${body}</p><p><a href="${escapeHtml(url)}">${cta}</a></p>`,
      })
    },
    async sendSignInOtpEmail(message) {
      const locale = getRequestLocale()
      const subject = translate(locale, 'signInOtp.subject')
      // Body no longer inlines the code — the code renders large below, so the
      // body is just the supporting instruction + expiry.
      const body = translate(locale, 'signInOtp.body', {
        expiresInMinutes: String(message.expiresInMinutes),
      })
      const cta = translate(locale, 'signInOtp.cta')
      // The 6-digit code in large, readable text (type it in)…
      const codeBlock = `<p style="margin:0 0 12px;font-size:32px;font-weight:700;letter-spacing:0.18em;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${escapeHtml(message.otp)}</p>`
      // …plus a deep link back to /login pre-loaded with the same email + code so
      // a tap auto-fills and submits the verify step. No password, no separate
      // magic-link token — the link just replays the OTP the user received.
      // The request-scoped continuation is a validated, bounded in-app path.
      // Absolute URLs and Worker API/RPC targets are rejected at the route
      // boundary before this mail callback can observe them.
      const continuePath = getAuthContinue() ?? ''
      const signInUrl = absoluteUrl(
        env,
        `/login?email=${encodeURIComponent(message.to)}&code=${encodeURIComponent(message.otp)}&continue=${encodeURIComponent(continuePath)}`,
      )
      const button = `<p><a href="${escapeHtml(signInUrl)}" style="display:inline-block;padding:10px 18px;background:#111827;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">${escapeHtml(cta)}</a></p>`
      await sendEmail({
        to: message.to,
        subject,
        html: `${codeBlock}<p>${body}</p>${button}`,
      })
    },
  }
}

export function createWorkerAuth(runtimeEnv: Env, ctx?: WaitUntilContext) {
  const env = validateServerEnv(runtimeEnv)
  const db = createDb(runtimeEnv.DB)
  const email = createEmailSender(env)

  // Hook closures live in apps/server (not in packages/auth) because they
  // import the firm_profile / auth schema. See organization-hooks.ts,
  // session-hooks.ts, and the dep-direction DAG in
  // scripts/check-dep-direction.mjs.
  const organizationHooks = buildOrganizationHooks(db)
  const allowUserToCreateOrganization = buildAllowUserToCreateOrganization(db)
  const organizationMembershipLimit = buildOrganizationMembershipLimit(db)
  const databaseHooks = buildDatabaseHooks(db, env.AUTH_SECRET)
  const stripeBilling = { hooks: buildBillingHooks(db) }

  return createAuth({
    db,
    schema: authSchema,
    env,
    email,
    organizationHooks,
    allowUserToCreateOrganization,
    organizationMembershipLimit,
    organizationInvitationLimit: 100,
    databaseHooks,
    stripeBilling,
    ...(ctx ? { waitUntil: (promise) => ctx.waitUntil(promise) } : {}),
  })
}
