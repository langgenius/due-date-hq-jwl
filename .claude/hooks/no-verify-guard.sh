#!/usr/bin/env sh
# PreToolUse(Bash) guard — block `git commit` or `git push` commands that
# bypass repository hooks.
#
# Skipping the pre-commit hook (`vp staged`) is how unformatted code plus a
# lint error (masked by the format short-circuit) reached main. Let the hook
# run instead. In a worktree without node_modules, symlink deps first (see the
# worktree recipe) and then commit normally — don't bypass.
#
# Reads the PreToolUse payload on stdin, emits a deny decision as JSON when the
# command is a `git commit` / `git push` carrying a verify-bypass flag,
# otherwise exits 0 (allow). Wired up in .claude/settings.json.

cmd=$(jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$cmd" ] && exit 0

# Drop quoted regions first so a commit MESSAGE that merely mentions the flag
# (e.g. -m "stop using --no-verify") never trips this. SQ holds a single quote
# so the single-quote-stripping sed stays readable.
SQ=\'
bare=$(printf '%s' "$cmd" | sed 's/"[^"]*"//g')
bare=$(printf '%s' "$bare" | sed "s/${SQ}[^${SQ}]*${SQ}//g")

# Isolate each `git [..-C/-c globals..] commit|push ..` invocation, bounded to
# its own simple command (stops at && || | ;) so flags on OTHER commands in a
# compound line are ignored. `-C`/`-c` are the global options people commonly
# put before the subcommand.
git_segs=$(printf '%s' "$bare" |
  grep -oE 'git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+)*[[:space:]]+(commit|push)([[:space:]][^&|;]*)?')
[ -z "$git_segs" ] && exit 0

deny=
printf '%s' "$git_segs" | grep -qF -- '--no-verify' && deny=1

# `-n` means no-verify for commit, but dry-run for push. Check it only on
# commit segments so `git push -n` remains available for safe inspection.
commit_segs=$(printf '%s' "$git_segs" | grep -E '(^|[[:space:]])commit([[:space:]]|$)' || true)
# Short form: a single-dash flag cluster containing n (-n, -nm, -sn, ...).
# Single-dash + space-anchored, so --amend / --no-edit / --fixup don't match.
printf '%s' "$commit_segs" | grep -Eq '(^|[[:space:]])-[A-Za-z]*n[A-Za-z]*([[:space:]]|$)' && deny=1
[ -z "$deny" ] && exit 0

reason='Blocked: Claude must not bypass repository hooks. Do not use --no-verify on git commit or git push, or -n on git commit. Let pre-commit run vp staged and let pre-push run the full repository CI contract. Fix the failing check instead of bypassing it. If a worktree lacks node_modules, restore or symlink dependencies first, then retry normally. This guard lives in .claude/hooks/no-verify-guard.sh.'
jq -n --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
exit 0
