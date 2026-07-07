// Server error codes whose raw value isn't user-friendly. The server keeps the
// code-as-message convention; the client maps the few that surface in toasts.
const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  DEMO_READ_ONLY: 'This is a read-only demo — sign up to manage your own deadlines.',
}

export function rpcErrorMessage(error: unknown): string | null {
  const raw = rawRpcErrorMessage(error)
  if (raw !== null && FRIENDLY_ERROR_MESSAGES[raw]) return FRIENDLY_ERROR_MESSAGES[raw]
  return raw
}

function rawRpcErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string') return message
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code
    if (typeof code === 'string') return code
  }

  return null
}
