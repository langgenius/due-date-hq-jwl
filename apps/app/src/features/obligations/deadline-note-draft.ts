// 2026-07-02 (ux-flow audit P0 #2): the "+ Add deadline" dialog collects
// internal notes but `obligations.createFromRules` has no notes field, and
// no per-deadline note endpoint ships yet — the dialog's form.reset used to
// silently discard the text while the toast told the user to go save it.
// Until a real notes mutation lands, the typed text is parked here in
// sessionStorage, keyed by the created obligation, and the deadline detail
// surfaces it as a recoverable draft (copy / dismiss). Session-scoped on
// purpose: it's a hand-off buffer, not storage — no cross-tab or cross-user
// persistence implied.
const KEY_PREFIX = 'deadline-note-draft:'

// sessionStorage can throw (disabled storage, private-mode quotas); a lost
// draft is strictly no worse than the pre-fix behavior, so fail quiet.
export function saveDeadlineNoteDraft(obligationId: string, text: string): void {
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${obligationId}`, text)
  } catch {
    // ignore — see above
  }
}

export function readDeadlineNoteDraft(obligationId: string): string | null {
  try {
    const value = sessionStorage.getItem(`${KEY_PREFIX}${obligationId}`)
    return value && value.trim().length > 0 ? value : null
  } catch {
    return null
  }
}

export function clearDeadlineNoteDraft(obligationId: string): void {
  try {
    sessionStorage.removeItem(`${KEY_PREFIX}${obligationId}`)
  } catch {
    // ignore — see above
  }
}
