#!/usr/bin/env sh
# PreToolUse(Bash) guard — block `git commit` that bypasses git hooks via
# --no-verify / -n.
#
# Skipping the pre-commit hook (`vp staged`) is how unformatted code plus a
# lint error (masked by the format short-circuit) reached main. Let the hook
# run instead. In a worktree without node_modules, symlink deps first (see the
# worktree recipe) and then commit normally — don't bypass.
#
# Reads the PreToolUse payload on stdin, emits a deny decision as JSON when the
# command is a `git commit` carrying a verify-bypass flag, otherwise exits 0
# (allow). Wired up in .claude/settings.json.

cmd=$(jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$cmd" ] && exit 0

# Drop quoted regions first so a commit MESSAGE that merely mentions the flag
# (e.g. -m "stop using --no-verify") never trips this. SQ holds a single quote
# so the single-quote-stripping sed stays readable.
SQ=\'
bare=$(printf '%s' "$cmd" | sed 's/"[^"]*"//g')
bare=$(printf '%s' "$bare" | sed "s/${SQ}[^${SQ}]*${SQ}//g")

# Isolate each `git [..-C/-c globals..] commit ..` invocation, bounded to its
# own simple command (stops at && || | ;) so flags on OTHER commands in a
# compound line (head -n, echo -n, a second `git push --no-verify`) are ignored.
# `-C`/`-c` are the global options people put before the subcommand; matching
# only those avoids treating `git -c commit.gpgsign=false log -n 5` as a commit.
segs=$(printf '%s' "$bare" |
  grep -oE 'git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+)*[[:space:]]+commit([[:space:]][^&|;]*)?')
[ -z "$segs" ] && exit 0

deny=
printf '%s' "$segs" | grep -qF -- '--no-verify' && deny=1
# Short form: a single-dash flag cluster containing n (-n, -nm, -sn, ...).
# Single-dash + space-anchored, so --amend / --no-edit / --fixup don't match.
printf '%s' "$segs" | grep -Eq '(^|[[:space:]])-[A-Za-z]*n[A-Za-z]*([[:space:]]|$)' && deny=1
[ -z "$deny" ] && exit 0

reason='Blocked: do not bypass git hooks with --no-verify or -n on git commit. The pre-commit hook (vp staged) must run so format/lint/types are checked before the commit — skipping it is exactly how unformatted code and a masked lint error reached main. If you are in a worktree without node_modules, symlink deps first (ln -s <main>/node_modules node_modules and ln -s <main>/apps/app/node_modules apps/app/node_modules), then commit normally. This guard lives in .claude/hooks/no-verify-guard.sh.'
jq -n --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
exit 0
