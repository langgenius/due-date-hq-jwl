// Pure date math behind the internal-deadline-offset live preview on the
// onboarding practice-setup step. The preview shows a concrete worked example
// ("a filing due Apr 15 lands on your list as due Apr 1") instead of the old
// generic helper text — deferred item from the 2026-05-26 UX flows audit.
//
// The example anchors on April 15 (the nominal federal individual filing
// date) as a familiar reference. It is presented as an example date, not a
// claim about a specific year's statutory deadline, so weekend/holiday
// shifts don't make it wrong.

/** Next April 15 on or after `todayIso` (YYYY-MM-DD, firm-timezone today). */
export function exampleFederalDueDate(todayIso: string): string {
  const year = Number.parseInt(todayIso.slice(0, 4), 10)
  const candidate = `${year}-04-15`
  return todayIso <= candidate ? candidate : `${year + 1}-04-15`
}

/**
 * The working due date the team tracks: the official date minus the offset.
 * Mirrors `internalDeadlineFromBaseDueDate` in @duedatehq/core (which owns
 * the server-side math on Date objects; this is the ISO-string twin for the
 * preview so the route needs no timezone-sensitive Date juggling).
 */
export function workingDueDate(dueIso: string, offsetDays: number): string {
  const date = new Date(`${dueIso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - offsetDays)
  return date.toISOString().slice(0, 10)
}
